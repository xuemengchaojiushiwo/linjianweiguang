import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoundEngine } from './audio';
import { getInitialDialogueNodeId, NPC_PROFILES, ZONE_NAMES } from './dialogueData';
import { animatePlayerSprite, createPlayerSprite, type PlayerRig, type TextureBundle } from './models';
import {
  createBarkTexture,
  createCobbleTexture,
  createContactShadowTexture,
  createGlowSpriteTexture,
  createMossGrassTexture,
  createMushroomCapTexture,
  createStarRugTexture,
  createWoodPlankTexture,
} from './textures';
import type {
  DialogueChoice,
  GameHudState,
  NpcId,
  ProximityTarget,
  WorldCollider,
  WorldCreationConfig,
  ZoneId,
} from './types';
import { DEFAULT_CREATION_CONFIG } from './types';
import { buildAllZones, gladeGroundHeightAt, type ZoneData } from './world';

// Pre-allocated math helpers (Zero GC in render loop)
const _moveDir = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

const TOTAL_DEWDROPS = 7;

export class FairyGameEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private sound = new SoundEngine();

  private textures: TextureBundle;
  private zones: Record<ZoneId, ZoneData>;
  private currentZoneId: ZoneId = 'glade';
  private playerRig: PlayerRig;

  // Lighting
  private hemiLight: THREE.HemisphereLight;
  private keyLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private playerLight: THREE.PointLight;

  // Player kinematic state
  private playerPos = new THREE.Vector3(0, 0.05, 3.2);
  private playerVel = new THREE.Vector3(0, 0, 0);
  private playerYaw = Math.PI;
  private isGrounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private canDoubleJump = true;
  private squashY = 1.0;
  private squashVel = 0;
  private footstepTimer = 0;

  // Camera orbit state
  private camYaw = 0;
  private camPitch = 0.42;
  private camDist = 7.4;
  private camCurrentPos = new THREE.Vector3(0, 4, 10);
  private camCurrentLook = new THREE.Vector3(0, 1, 0);
  private isDragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  // Input state
  private keys = new Set<string>();
  private virtualMove = { x: 0, y: 0 };
  private isTouchSprint = false;

  // Game progression & UI state
  private creationConfig: WorldCreationConfig = DEFAULT_CREATION_CONFIG;
  private previewMode: 'none' | 'character' | 'map' = 'none';
  private dewdropsCollected = 0;
  private hasWingBlessing = false;
  private visitedRooms = new Set<ZoneId>(['glade']);
  private talkedNpcs = new Set<NpcId>();
  private proximityTarget: ProximityTarget | null = null;
  private activeDialogue: GameHudState['activeDialogue'] = null;
  private isTransitioning = false;
  private onHudChange: (state: GameHudState) => void;
  private onContextLostChange?: (lost: boolean) => void;

  // Loop & lifecycle
  private clock = new THREE.Clock();
  private elapsed = 0;
  private frameId = 0;
  private disposed = false;
  private lastHudSignature = '';

  constructor(
    container: HTMLElement,
    onHudChange: (state: GameHudState) => void,
    onContextLostChange?: (lost: boolean) => void,
  ) {
    this.container = container;
    this.onHudChange = onHudChange;
    this.onContextLostChange = onContextLostChange;

    // 1. Software WebGL probe (renderer string only, never UA)
    this.isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer configuration
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // 3. Scene, Camera & Studio Environment IBL
    this.scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 140);

    // 4. Procedural Textures
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = {
      mossGrass: createMossGrassTexture(maxAniso),
      cobble: createCobbleTexture(maxAniso),
      woodPlank: createWoodPlankTexture(maxAniso, '#8d5d3c'),
      warmWood: createWoodPlankTexture(maxAniso, '#6b4228'),
      bark: createBarkTexture(maxAniso),
      mushroomCap: createMushroomCapTexture(maxAniso, '#d65a47'),
      starRug: createStarRugTexture(maxAniso),
      contactShadow: createContactShadowTexture(),
      glowSprite: createGlowSpriteTexture(),
    };

    // 5. Balanced 3-Point Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0xa5e6ff, 0x2f4b34, 0.88);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff1d6, 1.85);
    this.keyLight.position.set(14, 22, 12);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1536, 1536);
    this.keyLight.shadow.camera.near = 1;
    this.keyLight.shadow.camera.far = 65;
    const d = 18;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    this.rimLight = new THREE.DirectionalLight(0x88f7c8, 0.52);
    this.rimLight.position.set(-12, 10, -14);
    this.scene.add(this.rimLight);

    // Warm subtle fairy companion glow on the player
    this.playerLight = new THREE.PointLight(0xa7f3d0, 1.3, 6.5, 1.8);
    this.scene.add(this.playerLight);

    // 6. Build Zones & Player
    this.zones = buildAllZones(this.textures, this.creationConfig.map);
    this.scene.add(this.zones.glade.group, this.zones.apothecary.group, this.zones.library.group);

    this.playerRig = createPlayerSprite(this.textures.contactShadow, this.creationConfig.character);
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = this.playerYaw;
    this.scene.add(this.playerRig.root);

    this.applyZoneAtmosphere('glade');
    this.snapCameraToPlayer();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.emitHudState(true);
    this.startLoop();
  }

  private disposeObjectTree(rootObj: THREE.Object3D): void {
    rootObj.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m.dispose());
      }
    });
  }

  public setPreviewMode(mode: 'none' | 'character' | 'map'): void {
    this.previewMode = mode;
    if (mode === 'character') {
      // Face the sprite toward the front preview camera
      this.playerYaw = 0.25;
      this.playerRig.root.rotation.y = this.playerYaw;
      this.camYaw = 0.25;
    } else if (mode === 'none') {
      this.camPitch = 0.42;
      this.camDist = this.currentZoneId === 'glade' ? 7.4 : 6.0;
    }
  }

  public applyCreationConfig(nextConfig: WorldCreationConfig): void {
    const prev = this.creationConfig;
    const charChanged = JSON.stringify(prev.character) !== JSON.stringify(nextConfig.character);
    const mapChanged = JSON.stringify(prev.map) !== JSON.stringify(nextConfig.map);
    const metaChanged =
      prev.worldTitle !== nextConfig.worldTitle ||
      prev.spriteName !== nextConfig.spriteName ||
      prev.customGreeting !== nextConfig.customGreeting;

    this.creationConfig = {
      spriteName: nextConfig.spriteName,
      worldTitle: nextConfig.worldTitle,
      guideSummary: nextConfig.guideSummary,
      customGreeting: nextConfig.customGreeting,
      character: {
        ...nextConfig.character,
        customColors: nextConfig.character.customColors ? { ...nextConfig.character.customColors } : undefined,
      },
      map: {
        ...nextConfig.map,
        customColors: nextConfig.map.customColors ? { ...nextConfig.map.customColors } : undefined,
      },
    };

    if (charChanged) {
      this.scene.remove(this.playerRig.root);
      this.disposeObjectTree(this.playerRig.root);
      this.playerRig = createPlayerSprite(this.textures.contactShadow, this.creationConfig.character);
      this.playerRig.root.position.copy(this.playerPos);
      this.playerRig.root.rotation.y = this.playerYaw;
      this.scene.add(this.playerRig.root);
      this.sound.playDewdrop();
    }

    if (mapChanged) {
      const collectedIds = new Set<string>();
      (Object.values(this.zones) as ZoneData[]).forEach((z) => {
        z.dewdrops.forEach((d) => {
          if (d.collected) collectedIds.add(d.id);
        });
        this.scene.remove(z.group);
        this.disposeObjectTree(z.group);
      });

      this.zones = buildAllZones(this.textures, this.creationConfig.map);
      (Object.values(this.zones) as ZoneData[]).forEach((z) => {
        z.dewdrops.forEach((d) => {
          if (collectedIds.has(d.id)) {
            d.collected = true;
            d.group.visible = false;
          }
        });
      });
      this.scene.add(this.zones.glade.group, this.zones.apothecary.group, this.zones.library.group);

      if (this.currentZoneId !== 'glade') {
        this.currentZoneId = 'glade';
        this.playerPos.set(0, 0.05, 3.2);
        this.playerVel.set(0, 0, 0);
      }
      this.applyZoneAtmosphere(this.currentZoneId);
      this.sound.playDoorTransition();
      this.emitHudState(true);
    } else if (metaChanged) {
      this.emitHudState(true);
    }
  }

  private applyZoneAtmosphere(zoneId: ZoneId): void {
    (Object.keys(this.zones) as ZoneId[]).forEach((id) => {
      this.zones[id].group.visible = id === zoneId;
    });

    if (zoneId === 'glade') {
      const tod = this.creationConfig.map.timeOfDay;
      const customSky = this.creationConfig.map.customColors?.skyHex;
      const customFog = this.creationConfig.map.customColors?.fogHex;
      const parseHex = (hex: string | undefined, fb: number) =>
        hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? Number.parseInt(hex.slice(1), 16) : fb;

      if (tod === 'sunset') {
        const skyHex = parseHex(customSky, 0x472830);
        const fogHex = parseHex(customFog, skyHex);
        this.scene.background = new THREE.Color(skyHex);
        this.scene.fog = new THREE.FogExp2(fogHex, 0.017);
        this.hemiLight.color.setHex(0xffc99c);
        this.hemiLight.groundColor.setHex(0x4f342c);
        this.hemiLight.intensity = 0.88;
        this.keyLight.intensity = 2.05;
        this.keyLight.color.setHex(0xffa96b);
        this.rimLight.intensity = 0.65;
      } else if (tod === 'night') {
        const skyHex = parseHex(customSky, 0x0d1729);
        const fogHex = parseHex(customFog, skyHex);
        this.scene.background = new THREE.Color(skyHex);
        this.scene.fog = new THREE.FogExp2(fogHex, 0.019);
        this.hemiLight.color.setHex(0x7ca6e8);
        this.hemiLight.groundColor.setHex(0x162426);
        this.hemiLight.intensity = 0.78;
        this.keyLight.intensity = 1.1;
        this.keyLight.color.setHex(0xb8d4ff);
        this.rimLight.intensity = 0.72;
      } else {
        const skyHex = parseHex(customSky, 0x1f3a31);
        const fogHex = parseHex(customFog, skyHex);
        this.scene.background = new THREE.Color(skyHex);
        this.scene.fog = new THREE.FogExp2(fogHex, 0.017);
        this.hemiLight.color.setHex(0xb3ecff);
        this.hemiLight.groundColor.setHex(0x315236);
        this.hemiLight.intensity = 0.92;
        this.keyLight.intensity = 1.85;
        this.keyLight.color.setHex(0xfff1d6);
        this.rimLight.intensity = 0.55;
      }
    } else if (zoneId === 'apothecary') {
      const warmBg = new THREE.Color(0x211713);
      this.scene.background = warmBg;
      this.scene.fog = new THREE.FogExp2(0x211713, 0.032);
      this.hemiLight.color.setHex(0xffd7a8);
      this.hemiLight.groundColor.setHex(0x472d1e);
      this.hemiLight.intensity = 0.95;
      this.keyLight.intensity = 0.7;
      this.keyLight.color.setHex(0xffcf99);
      this.rimLight.intensity = 0.25;
    } else {
      const starBg = new THREE.Color(0x141b2d);
      this.scene.background = starBg;
      this.scene.fog = new THREE.FogExp2(0x141b2d, 0.028);
      this.hemiLight.color.setHex(0xb8d4ff);
      this.hemiLight.groundColor.setHex(0x2c2a42);
      this.hemiLight.intensity = 0.9;
      this.keyLight.intensity = 0.65;
      this.keyLight.color.setHex(0xdbeafe);
      this.rimLight.intensity = 0.35;
    }
  }

  private snapCameraToPlayer(): void {
    const sinY = Math.sin(this.camYaw);
    const cosY = Math.cos(this.camYaw);
    const cosP = Math.cos(this.camPitch);
    const sinP = Math.sin(this.camPitch);

    this.camCurrentLook.set(this.playerPos.x, this.playerPos.y + 1.05, this.playerPos.z);
    this.camCurrentPos.set(
      this.playerPos.x + sinY * cosP * this.camDist,
      this.playerPos.y + 1.05 + sinP * this.camDist,
      this.playerPos.z + cosY * cosP * this.camDist,
    );
    this.camera.position.copy(this.camCurrentPos);
    this.camera.lookAt(this.camCurrentLook);
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.onContextLostChange?.(true);
  };

  private handleContextRestored = (): void => {
    this.onContextLostChange?.(false);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
    ) {
      return;
    }
    this.sound.unlock();
    this.keys.add(e.code);

    if (e.code === 'Space') {
      if (this.activeDialogue) {
        e.preventDefault();
        this.advanceDialogue();
        return;
      }
      e.preventDefault();
      this.jumpBufferTimer = 0.14;
    } else if (e.code === 'KeyE' || e.code === 'Enter') {
      if (this.activeDialogue) {
        this.advanceDialogue();
      } else {
        this.triggerInteract();
      }
    } else if (e.code === 'Escape' && this.activeDialogue) {
      this.closeDialogue();
    } else if (this.activeDialogue && this.activeDialogue.node.choices) {
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < this.activeDialogue.node.choices.length) {
        this.selectDialogueChoice(this.activeDialogue.node.choices[idx]);
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private handlePointerDown = (e: PointerEvent): void => {
    this.sound.unlock();
    this.isDragging = true;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;

    this.camYaw -= dx * 0.0065;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.005, 0.12, 1.05);
  };

  private handlePointerUp = (): void => {
    this.isDragging = false;
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.005, 4.2, 13.5);
  };

  // Public Controls for HUD / Touch
  public unlockAudio(): void {
    this.sound.unlock();
  }

  public toggleMute(): boolean {
    const next = !this.sound.isMuted();
    this.sound.setMuted(next);
    return next;
  }

  public isMuted(): boolean {
    return this.sound.isMuted();
  }

  public resetCamera(): void {
    this.camYaw = this.playerYaw + Math.PI;
    this.camPitch = 0.42;
    this.camDist = 7.4;
  }

  public setVirtualInput(x: number, y: number, sprint = false): void {
    this.virtualMove.x = x;
    this.virtualMove.y = y;
    this.isTouchSprint = sprint;
  }

  public triggerJump(): void {
    this.sound.unlock();
    if (this.activeDialogue) {
      this.advanceDialogue();
      return;
    }
    this.jumpBufferTimer = 0.14;
  }

  public triggerInteract(): void {
    this.sound.unlock();
    if (this.activeDialogue) {
      this.advanceDialogue();
      return;
    }
    if (this.isTransitioning || !this.proximityTarget) return;

    if (this.proximityTarget.type === 'npc') {
      this.startDialogue(this.proximityTarget.id as NpcId);
    } else if (this.proximityTarget.type === 'door') {
      const zone = this.zones[this.currentZoneId];
      const portal = zone.portals.find((p) => p.id === this.proximityTarget?.id);
      if (portal) {
        this.enterPortal(portal.toZone, portal.spawnPosition, portal.spawnYaw);
      }
    }
  }

  private startDialogue(npcId: NpcId): void {
    const profile = NPC_PROFILES[npcId];
    const startNodeId = getInitialDialogueNodeId(npcId, this.dewdropsCollected, TOTAL_DEWDROPS);
    const baseNode = profile.nodes[startNodeId];
    const node =
      npcId === 'elwin' && startNodeId === 'intro' && this.creationConfig.customGreeting
        ? { ...baseNode, text: this.creationConfig.customGreeting }
        : baseNode;
    this.talkedNpcs.add(npcId);
    this.sound.playDialogueTalk();
    this.activeDialogue = {
      npcId,
      npcName: profile.name,
      npcTitle: profile.title,
      accentHex: profile.accentHex,
      node,
    };
    this.keys.clear();
    this.emitHudState(true);
  }

  public advanceDialogue(): void {
    if (!this.activeDialogue) return;
    const { npcId, node } = this.activeDialogue;
    if (node.choices && node.choices.length > 0) return;
    if (node.nextNodeId) {
      const next = NPC_PROFILES[npcId].nodes[node.nextNodeId];
      if (next) {
        this.sound.playDialogueTalk();
        this.activeDialogue = { ...this.activeDialogue, node: next };
        this.emitHudState(true);
        return;
      }
    }
    this.closeDialogue();
  }

  public selectDialogueChoice(choice: DialogueChoice): void {
    if (!this.activeDialogue) return;
    if (choice.grantBlessing && !this.hasWingBlessing) {
      this.hasWingBlessing = true;
      this.sound.playBlessing();
    } else {
      this.sound.playDialogueTalk();
    }

    if (choice.close || !choice.nextNodeId) {
      this.closeDialogue();
      return;
    }
    const next = NPC_PROFILES[this.activeDialogue.npcId].nodes[choice.nextNodeId];
    if (next) {
      this.activeDialogue = { ...this.activeDialogue, node: next };
      this.emitHudState(true);
    } else {
      this.closeDialogue();
    }
  }

  public closeDialogue(): void {
    this.activeDialogue = null;
    this.emitHudState(true);
  }

  private enterPortal(targetZone: ZoneId, spawnPos: THREE.Vector3, spawnYaw: number): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.sound.playDoorTransition();
    this.emitHudState(true);

    window.setTimeout(() => {
      if (this.disposed) return;
      this.currentZoneId = targetZone;
      this.visitedRooms.add(targetZone);
      this.applyZoneAtmosphere(targetZone);
      this.playerPos.copy(spawnPos);
      this.playerVel.set(0, 0, 0);
      this.playerYaw = spawnYaw;
      this.playerRig.root.position.copy(this.playerPos);
      this.playerRig.root.rotation.y = this.playerYaw;
      this.camYaw = spawnYaw + Math.PI;
      this.camDist = targetZone === 'glade' ? 7.4 : 6.0;
      this.snapCameraToPlayer();

      this.isTransitioning = false;
      this.emitHudState(true);
    }, 260);
  }

  // Floor & Collider Resolution
  private getFloorInfo(zone: ZoneData, x: number, z: number, actorY: number): { y: number; surface: 'grass' | 'wood' | 'stone' } {
    const isCity = this.creationConfig.map.worldStyle === 'city';
    let highestY = zone.id === 'glade' ? gladeGroundHeightAt(x, z, isCity) : 0;
    let surface: 'grass' | 'wood' | 'stone' = zone.floorMaterial;

    for (const p of zone.platforms) {
      // Allow stepping onto platforms when feet are above or slightly below topY
      if (actorY < p.topY - 0.45) continue;

      let inside = false;
      if (p.kind === 'box') {
        inside = x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ;
      } else if (p.kind === 'disc' && p.x !== undefined && p.z !== undefined && p.radius !== undefined) {
        inside = Math.hypot(x - p.x, z - p.z) <= p.radius;
      }
      if (inside && p.topY > highestY) {
        highestY = p.topY;
        surface = p.materialKind === 'moss' ? 'grass' : p.materialKind;
      }
    }
    return { y: highestY, surface };
  }

  private resolveCollisions(zone: ZoneData, pos: THREE.Vector3): void {
    const playerRadius = 0.36;

    // 1. Zone perimeter boundary
    const dist = Math.hypot(pos.x, pos.z);
    if (dist > zone.boundaryRadius) {
      const scale = zone.boundaryRadius / dist;
      pos.x *= scale;
      pos.z *= scale;
    }

    // 2. Solid obstacles
    for (const c of zone.colliders) {
      if (pos.y + 1.2 < c.minY || pos.y > c.maxY - 0.12) continue;

      if (c.kind === 'cylinder') {
        const dx = pos.x - c.x;
        const dz = pos.z - c.z;
        const minD = c.radius + playerRadius;
        const dSq = dx * dx + dz * dz;
        if (dSq < minD * minD && dSq > 0.00001) {
          const d = Math.sqrt(dSq);
          pos.x = c.x + (dx / d) * minD;
          pos.z = c.z + (dz / d) * minD;
        }
      } else {
        this.resolveBoxCollider(c, pos, playerRadius);
      }
    }
  }

  private resolveBoxCollider(c: Extract<WorldCollider, { kind: 'box' }>, pos: THREE.Vector3, r: number): void {
    const closestX = THREE.MathUtils.clamp(pos.x, c.minX, c.maxX);
    const closestZ = THREE.MathUtils.clamp(pos.z, c.minZ, c.maxZ);
    const dx = pos.x - closestX;
    const dz = pos.z - closestZ;
    const dSq = dx * dx + dz * dz;
    if (dSq < r * r) {
      if (dSq > 0.00001) {
        const d = Math.sqrt(dSq);
        pos.x = closestX + (dx / d) * r;
        pos.z = closestZ + (dz / d) * r;
      } else {
        pos.z = c.maxZ + r;
      }
    }
  }

  private updatePlayer(delta: number): void {
    const zone = this.zones[this.currentZoneId];

    // 1. Movement Input (camera-relative)
    let inputX = this.virtualMove.x;
    let inputZ = this.virtualMove.y;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) inputX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) inputX += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) inputZ -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) inputZ += 1;

    if (this.activeDialogue || this.isTransitioning || this.previewMode !== 'none') {
      inputX = 0;
      inputZ = 0;
    }

    const inputLen = Math.hypot(inputX, inputZ);
    const sprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.isTouchSprint;
    const baseMaxSpeed = this.hasWingBlessing ? 6.9 : 5.4;
    const maxSpeed = sprinting ? baseMaxSpeed * 1.38 : baseMaxSpeed;

    if (inputLen > 0.01) {
      const nx = inputX / Math.max(1, inputLen);
      const nz = inputZ / Math.max(1, inputLen);

      this.camera.getWorldDirection(_forward);
      _forward.y = 0;
      if (_forward.lengthSq() < 0.0001) _forward.set(0, 0, -1);
      _forward.normalize();
      _right.crossVectors(_forward, _up).normalize();

      _moveDir.set(0, 0, 0).addScaledVector(_right, nx).addScaledVector(_forward, -nz).normalize();
      const targetVx = _moveDir.x * maxSpeed;
      const targetVz = _moveDir.z * maxSpeed;

      const accelLambda = this.isGrounded ? 14 : 7.5;
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, targetVx, accelLambda, delta);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, targetVz, accelLambda, delta);

      const targetYaw = Math.atan2(_moveDir.x, _moveDir.z);
      let diff = targetYaw - this.playerYaw;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.playerYaw += diff * (1 - Math.exp(-13 * delta));
    } else {
      const stopLambda = this.isGrounded ? 15 : 4;
      this.playerVel.x = THREE.MathUtils.damp(this.playerVel.x, 0, stopLambda, delta);
      this.playerVel.z = THREE.MathUtils.damp(this.playerVel.z, 0, stopLambda, delta);
    }

    // 2. Jump & Fairy Double-Jump
    if (this.isGrounded) {
      this.coyoteTimer = 0.12;
      this.canDoubleJump = true;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - delta);
    }

    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - delta);
      const jumpPower = this.hasWingBlessing ? 9.6 : 8.4;

      if (this.coyoteTimer > 0) {
        this.playerVel.y = jumpPower;
        this.isGrounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.squashY = 1.24;
        this.sound.playJump(false);
      } else if (this.canDoubleJump) {
        this.playerVel.y = jumpPower * 0.94;
        this.canDoubleJump = false;
        this.jumpBufferTimer = 0;
        this.squashY = 1.28;
        this.sound.playJump(true);
      }
    }

    // Gravity (gentler when falling with blessing/wings)
    const gravity = this.playerVel.y < 0 ? 19.5 : 22.5;
    this.playerVel.y -= gravity * delta;

    // 3. Integrate Position & Collide
    this.playerPos.x += this.playerVel.x * delta;
    this.playerPos.z += this.playerVel.z * delta;
    this.resolveCollisions(zone, this.playerPos);

    this.playerPos.y += this.playerVel.y * delta;

    const floor = this.getFloorInfo(zone, this.playerPos.x, this.playerPos.z, this.playerPos.y);
    if (this.playerPos.y <= floor.y) {
      if (!this.isGrounded && this.playerVel.y < -3.5) {
        this.squashY = 0.76;
        this.sound.playLand();
      }
      this.playerPos.y = floor.y;
      this.playerVel.y = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // 4. Bouncy Mushrooms
    for (const mush of zone.bounceMushrooms) {
      const dist = Math.hypot(this.playerPos.x - mush.position.x, this.playerPos.z - mush.position.z);
      if (dist < mush.radius && this.playerPos.y <= mush.position.y + 0.85 && this.playerVel.y <= 1.0) {
        this.playerVel.y = mush.boostVelocity;
        this.isGrounded = false;
        this.canDoubleJump = true;
        this.squashY = 1.32;
        mush.bounceAnim = 1.0;
        this.sound.playBounce();
      }
      if (mush.bounceAnim > 0) {
        mush.bounceAnim = Math.max(0, mush.bounceAnim - delta * 4.5);
        const s = 1 + Math.sin(mush.bounceAnim * Math.PI * 2) * 0.22 * mush.bounceAnim;
        mush.capMesh.scale.set(s, 0.58 / s, s);
      }
    }

    // 5. Dewdrop Collectibles
    for (const dew of zone.dewdrops) {
      if (dew.collected) continue;
      const dist = this.playerPos.distanceTo(dew.position);
      if (dist < 1.05) {
        dew.collected = true;
        dew.group.visible = false;
        this.dewdropsCollected += 1;
        this.sound.playDewdrop();
        this.emitHudState(true);
      }
    }

    // 6. Footsteps
    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (this.isGrounded && horizSpeed > 1.2) {
      this.footstepTimer -= delta * (horizSpeed / 4.2);
      if (this.footstepTimer <= 0) {
        this.footstepTimer = 0.34;
        this.sound.playFootstep(floor.surface);
      }
    }

    // 7. Squash & Stretch spring back to 1.0
    const springForce = (1.0 - this.squashY) * 140;
    const dampForce = -this.squashVel * 14;
    this.squashVel += (springForce + dampForce) * delta;
    this.squashY = THREE.MathUtils.clamp(this.squashY + this.squashVel * delta, 0.68, 1.38);

    // 8. Sync Player Rig + Contact Shadow
    this.playerRig.root.position.copy(this.playerPos);
    this.playerRig.root.rotation.y = this.playerYaw;
    animatePlayerSprite(
      this.playerRig,
      this.elapsed,
      Math.min(1.4, horizSpeed / 5.4),
      this.isGrounded,
      this.playerVel.y,
      this.squashY,
      this.hasWingBlessing,
    );

    const heightAboveFloor = Math.max(0, this.playerPos.y - floor.y);
    this.playerRig.contactShadow.position.y = -heightAboveFloor + 0.025;
    const shadowScale = THREE.MathUtils.clamp(1 - heightAboveFloor * 0.14, 0.35, 1.0);
    this.playerRig.contactShadow.scale.setScalar(shadowScale);
    (this.playerRig.contactShadow.material as THREE.MeshBasicMaterial).opacity = 0.45 * shadowScale;

    this.playerLight.position.set(this.playerPos.x, this.playerPos.y + 1.3, this.playerPos.z);

    // Keep shadow frustum centered near player outdoors
    if (this.currentZoneId === 'glade') {
      this.keyLight.position.set(this.playerPos.x + 14, 22, this.playerPos.z + 12);
      this.keyLight.target.position.copy(this.playerPos);
    } else {
      this.keyLight.position.set(6, 12, 6);
      this.keyLight.target.position.set(0, 0, 0);
    }

    // 9. Proximity detection for NPCs & Portals
    let bestTarget: ProximityTarget | null = null;
    let bestDist = Infinity;

    for (const npc of zone.npcs) {
      const d = this.playerPos.distanceTo(npc.position);
      if (d < npc.talkRadius && d < bestDist) {
        bestDist = d;
        const prof = NPC_PROFILES[npc.id];
        bestTarget = {
          type: 'npc',
          id: npc.id,
          label: `与 ${prof.title}·${prof.name} 对话`,
          sublabel: '按 E 键或点击交谈',
        };
      }
    }

    for (const portal of zone.portals) {
      const d = this.playerPos.distanceTo(portal.position);
      if (d < portal.triggerRadius && d < bestDist) {
        bestDist = d;
        bestTarget = {
          type: 'door',
          id: portal.id,
          label: portal.label,
          sublabel: '按 E 键或点击穿过门扉',
        };
      }
    }

    this.proximityTarget = bestTarget;
  }

  private updateWorldAnimations(delta: number): void {
    const zone = this.zones[this.currentZoneId];
    const t = this.elapsed;

    // NPCs gentle idle + look toward player when nearby
    for (const npc of zone.npcs) {
      const dist = this.playerPos.distanceTo(npc.position);
      const targetYaw =
        dist < 4.5
          ? Math.atan2(this.playerPos.x - npc.position.x, this.playerPos.z - npc.position.z)
          : npc.baseYaw;
      let diff = targetYaw - npc.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      npc.group.rotation.y += diff * (1 - Math.exp(-5 * delta));

      npc.headGroup.rotation.z = Math.sin(t * 1.5 + npc.baseYaw) * 0.04;
      npc.indicatorMesh.position.y = 2.08 + Math.sin(t * 2.8) * 0.08;
      npc.indicatorMesh.rotation.y = t * 1.6;
      const scale = dist < npc.talkRadius ? 1.28 : 0.9;
      npc.indicatorMesh.scale.setScalar(THREE.MathUtils.damp(npc.indicatorMesh.scale.x, scale, 8, delta));
    }

    // Portals shimmer
    for (const portal of zone.portals) {
      const near = this.playerPos.distanceTo(portal.position) < portal.triggerRadius;
      const s = (near ? 1.18 : 0.96) + Math.sin(t * 3.5) * 0.06;
      portal.glowRing.scale.setScalar(s);
    }

    // Dewdrops spin & bob
    for (const dew of zone.dewdrops) {
      if (dew.collected) continue;
      dew.group.rotation.y = t * 1.8;
      dew.group.position.y = dew.position.y + Math.sin(t * 2.6 + dew.position.x) * 0.12;
    }

    // Dynamic lights & indoor props
    for (const dl of zone.dynamicLights) {
      dl.light.intensity = dl.baseIntensity + Math.sin(t * dl.speed + dl.phase) * (dl.baseIntensity * 0.16);
    }

    for (const item of zone.animatedMeshes) {
      if (item.kind === 'astrolabe') {
        item.mesh.rotation.y = t * 0.7;
        item.mesh.rotation.x = Math.sin(t * 0.5) * 0.2;
      } else if (item.kind === 'candle') {
        item.mesh.position.y = item.baseY + Math.sin(t * 1.8 + item.phase) * 0.14;
      } else if (item.kind === 'cauldronBubble') {
        item.mesh.position.y = item.baseY + Math.sin(t * 4.0) * 0.02;
      }
    }

    // Drifting outdoor fireflies
    if (zone.fireflyPoints) {
      zone.fireflyPoints.rotation.y = t * 0.03;
      zone.fireflyPoints.position.y = Math.sin(t * 0.8) * 0.25;
    }
  }

  private updateCamera(delta: number): void {
    if (this.previewMode === 'character') {
      // Gentle showcase orbit right in front of the fairy sprite, shifted slightly so dialogue sits to the right/bottom
      const orbitYaw = this.playerYaw + Math.sin(this.elapsed * 0.55) * 0.45;
      const sinY = Math.sin(orbitYaw);
      const cosY = Math.cos(orbitYaw);
      _camTarget.set(this.playerPos.x + 0.55, this.playerPos.y + 0.88, this.playerPos.z);
      _camDesired.set(
        this.playerPos.x + sinY * 2.75,
        this.playerPos.y + 1.25,
        this.playerPos.z + cosY * 2.75,
      );
      this.camCurrentPos.x = THREE.MathUtils.damp(this.camCurrentPos.x, _camDesired.x, 7, delta);
      this.camCurrentPos.y = THREE.MathUtils.damp(this.camCurrentPos.y, _camDesired.y, 7, delta);
      this.camCurrentPos.z = THREE.MathUtils.damp(this.camCurrentPos.z, _camDesired.z, 7, delta);
      this.camCurrentLook.x = THREE.MathUtils.damp(this.camCurrentLook.x, _camTarget.x, 8, delta);
      this.camCurrentLook.y = THREE.MathUtils.damp(this.camCurrentLook.y, _camTarget.y, 8, delta);
      this.camCurrentLook.z = THREE.MathUtils.damp(this.camCurrentLook.z, _camTarget.z, 8, delta);
      this.camera.position.copy(this.camCurrentPos);
      this.camera.lookAt(this.camCurrentLook);
      return;
    }

    if (this.previewMode === 'map') {
      // Scenic wide overview of the valley as kids customize time/biome/layout
      const panAngle = this.elapsed * 0.16;
      _camTarget.set(0, 1.4, -1.2);
      _camDesired.set(Math.sin(panAngle) * 16.5, 9.2, Math.cos(panAngle) * 16.5);
      this.camCurrentPos.x = THREE.MathUtils.damp(this.camCurrentPos.x, _camDesired.x, 5, delta);
      this.camCurrentPos.y = THREE.MathUtils.damp(this.camCurrentPos.y, _camDesired.y, 5, delta);
      this.camCurrentPos.z = THREE.MathUtils.damp(this.camCurrentPos.z, _camDesired.z, 5, delta);
      this.camCurrentLook.x = THREE.MathUtils.damp(this.camCurrentLook.x, _camTarget.x, 6, delta);
      this.camCurrentLook.y = THREE.MathUtils.damp(this.camCurrentLook.y, _camTarget.y, 6, delta);
      this.camCurrentLook.z = THREE.MathUtils.damp(this.camCurrentLook.z, _camTarget.z, 6, delta);
      this.camera.position.copy(this.camCurrentPos);
      this.camera.lookAt(this.camCurrentLook);
      return;
    }

    const sinY = Math.sin(this.camYaw);
    const cosY = Math.cos(this.camYaw);
    const cosP = Math.cos(this.camPitch);
    const sinP = Math.sin(this.camPitch);

    const lookOffset = this.activeDialogue ? 1.25 : 1.05;
    _camTarget.set(this.playerPos.x, this.playerPos.y + lookOffset, this.playerPos.z);

    let dist = this.activeDialogue ? Math.min(this.camDist, 5.2) : this.camDist;
    if (this.currentZoneId !== 'glade') {
      dist = Math.min(dist, 5.8);
    }

    _camDesired.set(
      _camTarget.x + sinY * cosP * dist,
      _camTarget.y + sinP * dist,
      _camTarget.z + cosY * cosP * dist,
    );

    // Clamp camera above outdoor terrain or indoor floor
    const isCity = this.creationConfig.map.worldStyle === 'city';
    const minCamY = (this.currentZoneId === 'glade' ? gladeGroundHeightAt(_camDesired.x, _camDesired.z, isCity) : 0) + 0.65;
    if (_camDesired.y < minCamY) _camDesired.y = minCamY;

    // Keep camera inside indoor walls cleanly
    if (this.currentZoneId !== 'glade') {
      const r = this.zones[this.currentZoneId].boundaryRadius + 0.3;
      const dHoriz = Math.hypot(_camDesired.x, _camDesired.z);
      if (dHoriz > r) {
        _camDesired.x *= r / dHoriz;
        _camDesired.z *= r / dHoriz;
      }
    }

    this.camCurrentPos.x = THREE.MathUtils.damp(this.camCurrentPos.x, _camDesired.x, 9, delta);
    this.camCurrentPos.y = THREE.MathUtils.damp(this.camCurrentPos.y, _camDesired.y, 9, delta);
    this.camCurrentPos.z = THREE.MathUtils.damp(this.camCurrentPos.z, _camDesired.z, 9, delta);

    this.camCurrentLook.x = THREE.MathUtils.damp(this.camCurrentLook.x, _camTarget.x, 12, delta);
    this.camCurrentLook.y = THREE.MathUtils.damp(this.camCurrentLook.y, _camTarget.y, 12, delta);
    this.camCurrentLook.z = THREE.MathUtils.damp(this.camCurrentLook.z, _camTarget.z, 12, delta);

    this.camera.position.copy(this.camCurrentPos);
    this.camera.lookAt(this.camCurrentLook);
  }

  private emitHudState(force = false): void {
    const worldTitle = this.creationConfig.worldTitle || '林涧微光';
    const zoneName =
      this.currentZoneId === 'glade' && this.creationConfig.map.worldStyle === 'city'
        ? '魔法街区'
        : ZONE_NAMES[this.currentZoneId];
    const proxKey = this.proximityTarget ? `${this.proximityTarget.type}:${this.proximityTarget.id}` : 'none';
    const dlgKey = this.activeDialogue ? `${this.activeDialogue.npcId}:${this.activeDialogue.node.id}` : 'none';
    const sig = `${this.currentZoneId}|${zoneName}|${worldTitle}|${this.dewdropsCollected}|${this.hasWingBlessing}|${proxKey}|${dlgKey}|${this.isTransitioning}|${this.visitedRooms.size}|${this.talkedNpcs.size}`;
    if (!force && sig === this.lastHudSignature) return;
    this.lastHudSignature = sig;

    this.onHudChange({
      zone: this.currentZoneId,
      zoneName,
      worldTitle,
      dewdropsCollected: this.dewdropsCollected,
      totalDewdrops: TOTAL_DEWDROPS,
      hasWingBlessing: this.hasWingBlessing,
      proximityTarget: this.proximityTarget,
      activeDialogue: this.activeDialogue,
      isTransitioning: this.isTransitioning,
      visitedRooms: Array.from(this.visitedRooms),
      talkedNpcs: Array.from(this.talkedNpcs),
    });
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;

      const delta = Math.min(0.05, this.clock.getDelta());
      this.elapsed += delta;

      this.updatePlayer(delta);
      this.updateWorldAnimations(delta);
      this.updateCamera(delta);
      this.emitHudState(false);

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.renderer.render(this.scene, this.camera);
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('wheel', this.handleWheel);
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.sound.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m.dispose());
      }
    });

    Object.values(this.textures).forEach((tex) => tex.dispose());
    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
