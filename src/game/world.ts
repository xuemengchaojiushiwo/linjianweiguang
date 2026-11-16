import * as THREE from 'three';
import {
  createBouncyMushroom,
  createCottageExterior,
  createDewdropCollectible,
  createInstancedForestGrove,
  createNpcModel,
  createTreehouseExterior,
  type TextureBundle,
} from './models';
import type {
  BounceMushroom,
  DewdropItem,
  DoorPortal,
  MapCreationConfig,
  NpcInstance,
  WalkablePlatform,
  WorldCollider,
  ZoneId,
} from './types';
import { DEFAULT_CREATION_CONFIG } from './types';

export interface ZoneData {
  id: ZoneId;
  group: THREE.Group;
  colliders: WorldCollider[];
  platforms: WalkablePlatform[];
  portals: DoorPortal[];
  npcs: NpcInstance[];
  bounceMushrooms: BounceMushroom[];
  dewdrops: DewdropItem[];
  boundaryRadius: number;
  floorMaterial: 'grass' | 'wood';
  dynamicLights: { light: THREE.PointLight; baseIntensity: number; speed: number; phase: number }[];
  animatedMeshes: { mesh: THREE.Object3D; kind: 'astrolabe' | 'cauldronBubble' | 'candle' | 'firefly'; baseY: number; phase: number }[];
  fireflyPoints?: THREE.Points;
}

export function gladeGroundHeightAt(x: number, z: number): number {
  const distFromCenter = Math.hypot(x, z);
  if (distFromCenter < 12.5) {
    const streamX = 5.4 + Math.sin(z * 0.22) * 1.1;
    const dxStream = Math.abs(x - streamX);
    if (dxStream < 1.8 && z < 4.8 && z > -14) {
      const t = 1 - dxStream / 1.8;
      return -0.28 * t * t;
    }
    return 0;
  }

  const blend = THREE.MathUtils.clamp((distFromCenter - 12.5) / 8, 0, 1);
  const hills =
    (Math.sin(x * 0.14) * Math.cos(z * 0.14) * 1.15 + Math.sin((x + z) * 0.08) * 0.65) * blend;
  return Math.max(-0.2, hills);
}

export function buildAllZones(
  textures: TextureBundle,
  mapConfig: MapCreationConfig = DEFAULT_CREATION_CONFIG.map,
): Record<ZoneId, ZoneData> {
  const glade = buildGladeZone(textures, mapConfig);
  const apothecary = buildApothecaryZone(textures, mapConfig);
  const library = buildLibraryZone(textures, mapConfig);

  apothecary.group.visible = false;
  library.group.visible = false;

  return { glade, apothecary, library };
}

function buildGladeZone(textures: TextureBundle, mapConfig: MapCreationConfig): ZoneData {
  const group = new THREE.Group();
  const colliders: WorldCollider[] = [];
  const platforms: WalkablePlatform[] = [];
  const portals: DoorPortal[] = [];
  const npcs: NpcInstance[] = [];
  const bounceMushrooms: BounceMushroom[] = [];
  const dewdrops: DewdropItem[] = [];
  const dynamicLights: ZoneData['dynamicLights'] = [];
  const animatedMeshes: ZoneData['animatedMeshes'] = [];

  // 1. Continuous Natural Mossy Terrain tinted slightly by biome
  const terrainGeo = new THREE.PlaneGeometry(76, 76, 68, 68);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    posAttr.setY(i, gladeGroundHeightAt(vx, vz));
  }
  terrainGeo.computeVertexNormals();
  const terrainTint =
    mapConfig.biome === 'sakura' ? 0xd9f2d0 : mapConfig.biome === 'autumn' ? 0xdcb87a : 0xffffff;
  const terrainMat = new THREE.MeshStandardMaterial({
    map: textures.mossGrass,
    color: terrainTint,
    roughness: 0.92,
    metalness: 0.0,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  group.add(terrain);

  // 2. Sparkling Brook Water Ribbon
  const waterGeo = new THREE.PlaneGeometry(3.2, 22, 8, 28);
  waterGeo.rotateX(-Math.PI / 2);
  const wPos = waterGeo.attributes.position;
  for (let i = 0; i < wPos.count; i++) {
    const wz = wPos.getZ(i) - 5;
    wPos.setZ(i, wz);
    wPos.setX(i, wPos.getX(i) + 5.4 + Math.sin(wz * 0.22) * 1.1);
  }
  waterGeo.computeVertexNormals();
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x0e7490,
    emissiveIntensity: 0.25,
    roughness: 0.12,
    metalness: 0.1,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.82,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = -0.14;
  group.add(water);

  // 3. Central Moonwell Stone Plaza + Glowing Fountain
  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(4.2, 4.4, 0.08, 24),
    new THREE.MeshStandardMaterial({ map: textures.cobble, roughness: 0.85 }),
  );
  plaza.position.set(0, 0.01, 0);
  plaza.receiveShadow = true;
  group.add(plaza);

  const wellRim = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.22, 10, 24),
    new THREE.MeshStandardMaterial({ map: textures.cobble, roughness: 0.82 }),
  );
  wellRim.rotation.x = Math.PI / 2;
  wellRim.position.set(0, 0.22, -1.6);
  wellRim.castShadow = true;
  wellRim.receiveShadow = true;
  group.add(wellRim);

  const wellPool = new THREE.Mesh(
    new THREE.CircleGeometry(1.02, 20),
    new THREE.MeshStandardMaterial({
      color: 0x6ee7b7,
      emissive: 0x10b981,
      emissiveIntensity: 0.85,
      roughness: 0.15,
    }),
  );
  wellPool.rotation.x = -Math.PI / 2;
  wellPool.position.set(0, 0.2, -1.6);
  group.add(wellPool);

  colliders.push({ kind: 'cylinder', x: 0, z: -1.6, radius: 1.38, minY: 0, maxY: 1.0 });

  // 4. Arched Wooden Bridge over the Brook at z = -1.2, x = 5.15
  const bridgeMat = new THREE.MeshStandardMaterial({ map: textures.warmWood, roughness: 0.68 });
  const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.24, 1.8), bridgeMat);
  bridgeDeck.position.set(5.15, 0.22, -1.2);
  bridgeDeck.castShadow = true;
  bridgeDeck.receiveShadow = true;
  group.add(bridgeDeck);

  // Bridge posts
  for (const bx of [3.4, 6.9]) {
    for (const bz of [-2.0, -0.4]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.85, 8), bridgeMat);
      post.position.set(bx, 0.55, bz);
      post.castShadow = true;
      group.add(post);
    }
  }
  platforms.push({
    kind: 'box',
    minX: 3.2,
    maxX: 7.1,
    minZ: -2.15,
    maxZ: -0.25,
    topY: 0.34,
    materialKind: 'wood',
  });

  // Layout-driven building placements
  const cottagePos =
    mapConfig.layout === 'plaza_pair'
      ? new THREE.Vector3(-6.8, 0, -8.8)
      : new THREE.Vector3(-8.2, 0, -7.2);
  const treePos =
    mapConfig.layout === 'plaza_pair'
      ? new THREE.Vector3(8.5, 0, -8.5)
      : new THREE.Vector3(8.4, 0, 6.8);

  // 5. Acorn Apothecary Cottage
  const cottage = createCottageExterior(textures);
  cottage.position.copy(cottagePos);
  group.add(cottage);

  colliders.push({ kind: 'cylinder', x: cottagePos.x, z: cottagePos.z, radius: 3.4, minY: 0, maxY: 3.3 });
  platforms.push({
    kind: 'box',
    minX: cottagePos.x - 1.25,
    maxX: cottagePos.x + 1.25,
    minZ: cottagePos.z + 2.8,
    maxZ: cottagePos.z + 4.45,
    topY: 0.45,
    materialKind: 'wood',
  });
  platforms.push({
    kind: 'disc',
    minX: cottagePos.x - 2.6,
    maxX: cottagePos.x + 2.6,
    minZ: cottagePos.z - 2.6,
    maxZ: cottagePos.z + 2.6,
    x: cottagePos.x,
    z: cottagePos.z,
    radius: 2.6,
    topY: 5.5,
    materialKind: 'moss',
  });

  const cottageLight = new THREE.PointLight(0xf59e0b, 2.4, 10, 1.8);
  cottageLight.position.set(cottagePos.x + 0.95, 2.5, cottagePos.z + 3.8);
  group.add(cottageLight);
  dynamicLights.push({ light: cottageLight, baseIntensity: 2.4, speed: 3.2, phase: 0 });

  const apothDoorPos = new THREE.Vector3(cottagePos.x, 0.48, cottagePos.z + 3.85);
  const apothGlowRing = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.64, 24),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide, transparent: true, opacity: 0.78 }),
  );
  apothGlowRing.rotation.x = -Math.PI / 2;
  apothGlowRing.position.copy(apothDoorPos);
  group.add(apothGlowRing);

  portals.push({
    id: 'enter_apothecary',
    label: '进入 橡实炼金小屋',
    fromZone: 'glade',
    toZone: 'apothecary',
    position: apothDoorPos,
    spawnPosition: new THREE.Vector3(0, 0.05, 4.3),
    spawnYaw: Math.PI,
    triggerRadius: 1.55,
    glowRing: apothGlowRing,
  });

  // 6. Starlight Treehouse Library
  const treehouse = createTreehouseExterior(textures, mapConfig.biome);
  treehouse.position.copy(treePos);
  group.add(treehouse);

  colliders.push({ kind: 'cylinder', x: treePos.x, z: treePos.z, radius: 2.65, minY: 0, maxY: 6.4 });
  // Stepping platforms up to balcony
  platforms.push({
    kind: 'disc',
    minX: 0,
    maxX: 0,
    minZ: 0,
    maxZ: 0,
    x: treePos.x - 4.3,
    z: treePos.z - 0.3,
    radius: 0.95,
    topY: 0.55,
    materialKind: 'wood',
  });
  platforms.push({
    kind: 'disc',
    minX: 0,
    maxX: 0,
    minZ: 0,
    maxZ: 0,
    x: treePos.x - 3.9,
    z: treePos.z + 0.75,
    radius: 0.95,
    topY: 1.15,
    materialKind: 'wood',
  });
  // Elevated Balcony Deck
  platforms.push({
    kind: 'disc',
    minX: 0,
    maxX: 0,
    minZ: 0,
    maxZ: 0,
    x: treePos.x - 2.5,
    z: treePos.z + 1.5,
    radius: 1.8,
    topY: 2.0,
    materialKind: 'wood',
  });

  const treeLight = new THREE.PointLight(0x60a5fa, 2.4, 11, 1.8);
  treeLight.position.set(treePos.x - 2.7, 4.1, treePos.z + 1.9);
  group.add(treeLight);
  dynamicLights.push({ light: treeLight, baseIntensity: 2.4, speed: 2.4, phase: 1.7 });

  // Door Portal into Library (on elevated balcony!)
  const libDoorPos = new THREE.Vector3(treePos.x - 2.35, 2.04, treePos.z + 1.45);
  const libGlowRing = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.64, 24),
    new THREE.MeshBasicMaterial({ color: 0x60a5fa, side: THREE.DoubleSide, transparent: true, opacity: 0.78 }),
  );
  libGlowRing.rotation.x = -Math.PI / 2;
  libGlowRing.position.copy(libDoorPos);
  group.add(libGlowRing);

  portals.push({
    id: 'enter_library',
    label: '进入 星辉树洞书屋',
    fromZone: 'glade',
    toZone: 'library',
    position: libDoorPos,
    spawnPosition: new THREE.Vector3(0, 0.05, 4.8),
    spawnYaw: Math.PI,
    triggerRadius: 1.55,
    glowRing: libGlowRing,
  });

  // 7. Bouncy Mushrooms (+ extra mushrooms if selected!)
  const mushSpecs: { pos: [number, number, number]; boost: number }[] = [
    { pos: [cottagePos.x + 4.0, 0, cottagePos.z + 1.4], boost: 13.8 },
    { pos: [3.2, 0, 4.2], boost: 11.5 },
  ];
  if (mapConfig.surprise === 'extra_mushrooms' || mapConfig.layout === 'parkour') {
    mushSpecs.push(
      { pos: [-4.5, 0, 4.6], boost: 12.8 },
      { pos: [0.5, 0, -6.2], boost: 13.2 },
      { pos: [10.4, 0, -1.2], boost: 12.5 },
      { pos: [-10.8, 0, 1.5], boost: 12.5 },
    );
  }
  mushSpecs.forEach(({ pos, boost }) => {
    const mush = createBouncyMushroom(textures);
    mush.group.position.set(pos[0], pos[1], pos[2]);
    group.add(mush.group);
    bounceMushrooms.push({
      position: new THREE.Vector3(pos[0], pos[1], pos[2]),
      radius: 1.05,
      capMesh: mush.cap,
      boostVelocity: boost,
      bounceAnim: 0,
    });
  });

  // Optional Parkour Sky-Steps when layout === 'parkour'
  if (mapConfig.layout === 'parkour') {
    const skySteps: [number, number, number][] = [
      [-3.5, 2.2, -3.5],
      [0.0, 3.1, -4.8],
      [3.8, 2.6, -4.5],
      [6.2, 2.2, 2.2],
    ];
    const skyMat = new THREE.MeshStandardMaterial({ map: textures.warmWood, roughness: 0.65 });
    skySteps.forEach(([sx, sy, sz]) => {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.9, 0.28, 12), skyMat);
      disc.position.set(sx, sy - 0.14, sz);
      disc.castShadow = true;
      disc.receiveShadow = true;
      group.add(disc);
      platforms.push({
        kind: 'disc',
        minX: 0,
        maxX: 0,
        minZ: 0,
        maxZ: 0,
        x: sx,
        z: sz,
        radius: 1.15,
        topY: sy,
        materialKind: 'wood',
      });
    });
  }

  // Scenic Stone Stepping Pillar near East Brook
  const stonePillar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.35, 1.85, 12),
    new THREE.MeshStandardMaterial({ map: textures.cobble, roughness: 0.88 }),
  );
  stonePillar.position.set(8.8, 0.925, -4.5);
  stonePillar.castShadow = true;
  stonePillar.receiveShadow = true;
  group.add(stonePillar);
  colliders.push({ kind: 'cylinder', x: 8.8, z: -4.5, radius: 1.25, minY: 0, maxY: 1.8 });
  platforms.push({
    kind: 'disc',
    minX: 0,
    maxX: 0,
    minZ: 0,
    maxZ: 0,
    x: 8.8,
    z: -4.5,
    radius: 1.15,
    topY: 1.85,
    materialKind: 'stone',
  });

  // 8. Instanced Forest Grove Perimeter & Wildflowers (biome-reactive!)
  const grove = createInstancedForestGrove(
    textures.bark,
    gladeGroundHeightAt,
    mapConfig.biome,
    mapConfig.surprise === 'extra_flowers',
  );
  group.add(grove);

  // 9. Outdoor NPCs: Elder Elwin & Lillian
  const elwinBuilt = createNpcModel('elwin', textures.contactShadow);
  const elwinPos = new THREE.Vector3(-2.1, 0, -1.35);
  elwinBuilt.group.position.copy(elwinPos);
  elwinBuilt.group.rotation.y = 0.55;
  group.add(elwinBuilt.group);
  colliders.push({ kind: 'cylinder', x: elwinPos.x, z: elwinPos.z, radius: 0.55, minY: 0, maxY: 1.8 });
  npcs.push({
    id: 'elwin',
    zone: 'glade',
    group: elwinBuilt.group,
    headGroup: elwinBuilt.headGroup,
    indicatorMesh: elwinBuilt.indicatorMesh,
    position: elwinPos,
    baseYaw: 0.55,
    talkRadius: 2.75,
  });

  const lillianBuilt = createNpcModel('lillian', textures.contactShadow);
  const lillianPos = new THREE.Vector3(2.5, 0, -2.5);
  lillianBuilt.group.position.copy(lillianPos);
  lillianBuilt.group.rotation.y = -0.75;
  group.add(lillianBuilt.group);
  colliders.push({ kind: 'cylinder', x: lillianPos.x, z: lillianPos.z, radius: 0.55, minY: 0, maxY: 1.8 });
  npcs.push({
    id: 'lillian',
    zone: 'glade',
    group: lillianBuilt.group,
    headGroup: lillianBuilt.headGroup,
    indicatorMesh: lillianBuilt.indicatorMesh,
    position: lillianPos,
    baseYaw: -0.75,
    talkRadius: 2.75,
  });

  // 10. Five Outdoor Starlight Dewdrops
  const outdoorDewdropPositions: [string, number, number, number][] = [
    ['dew_plaza', 0, 0.55, -1.6],
    ['dew_bridge', 5.15, 0.55, -1.2],
    ['dew_roof', cottagePos.x, 5.65, cottagePos.z],
    ['dew_pillar', 8.8, 2.0, -4.5],
    ['dew_tree_balcony', treePos.x - 2.9, 2.15, treePos.z + 1.8],
  ];
  outdoorDewdropPositions.forEach(([id, dx, dy, dz]) => {
    const dewGroup = createDewdropCollectible();
    dewGroup.position.set(dx, dy, dz);
    group.add(dewGroup);
    dewdrops.push({
      id,
      zone: 'glade',
      position: new THREE.Vector3(dx, dy, dz),
      group: dewGroup,
      collected: false,
    });
  });

  // 11. Floating Forest Fireflies (Points — boosted when night or extra_fireflies!)
  const ffCount =
    mapConfig.surprise === 'extra_fireflies' || mapConfig.timeOfDay === 'night' ? 240 : 110;
  const ffPositions = new Float32Array(ffCount * 3);
  for (let i = 0; i < ffCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 2 + Math.random() * 19;
    ffPositions[i * 3] = Math.cos(a) * r;
    ffPositions[i * 3 + 1] = 0.8 + Math.random() * 4.5;
    ffPositions[i * 3 + 2] = Math.sin(a) * r;
  }
  const ffGeo = new THREE.BufferGeometry();
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPositions, 3));
  const ffMat = new THREE.PointsMaterial({
    size: mapConfig.surprise === 'extra_fireflies' ? 0.44 : 0.34,
    map: textures.glowSprite,
    color: mapConfig.biome === 'sakura' ? 0xfbcfe8 : 0xd9f99d,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const fireflyPoints = new THREE.Points(ffGeo, ffMat);
  group.add(fireflyPoints);

  return {
    id: 'glade',
    group,
    colliders,
    platforms,
    portals,
    npcs,
    bounceMushrooms,
    dewdrops,
    boundaryRadius: 19.5,
    floorMaterial: 'grass',
    dynamicLights,
    animatedMeshes,
    fireflyPoints,
  };
}

function buildApothecaryZone(textures: TextureBundle, mapConfig: MapCreationConfig): ZoneData {
  const group = new THREE.Group();
  const colliders: WorldCollider[] = [];
  const platforms: WalkablePlatform[] = [];
  const portals: DoorPortal[] = [];
  const npcs: NpcInstance[] = [];
  const dewdrops: DewdropItem[] = [];
  const dynamicLights: ZoneData['dynamicLights'] = [];
  const animatedMeshes: ZoneData['animatedMeshes'] = [];

  const roomRadius = 6.2;
  const wallHeight = 4.6;

  // 1. Warm Oak Plank Floor
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(roomRadius, 28),
    new THREE.MeshStandardMaterial({ map: textures.woodPlank, roughness: 0.65 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  // 2. Woven Star Rug (offset +0.025 on Y to prevent z-fighting)
  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(2.7, 28),
    new THREE.MeshStandardMaterial({ map: textures.starRug, roughness: 0.92 }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.025;
  rug.receiveShadow = true;
  group.add(rug);

  // 3. Curved Plaster Interior Wall & Timber Ribs & Domed Ceiling
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe6d4b8, roughness: 0.85, side: THREE.BackSide });
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(roomRadius, roomRadius, wallHeight, 24, 1, true), wallMat);
  wall.position.y = wallHeight / 2;
  wall.receiveShadow = true;
  group.add(wall);

  const ceiling = new THREE.Mesh(
    new THREE.SphereGeometry(roomRadius, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45),
    new THREE.MeshStandardMaterial({ color: 0x5c3a24, roughness: 0.85, side: THREE.BackSide }),
  );
  ceiling.position.y = wallHeight - 1.2;
  group.add(ceiling);

  const woodMat = new THREE.MeshStandardMaterial({ map: textures.warmWood, roughness: 0.68 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.24, wallHeight, 0.24), woodMat);
    beam.position.set(Math.cos(a) * (roomRadius - 0.14), wallHeight / 2, Math.sin(a) * (roomRadius - 0.14));
    beam.rotation.y = -a;
    group.add(beam);
  }

  // 4. Stone Hearth Fireplace (North wall z = -5.1) + Bubbling Cauldron
  const stoneMat = new THREE.MeshStandardMaterial({ map: textures.cobble, roughness: 0.88 });
  const hearthBase = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 1.3), stoneMat);
  hearthBase.position.set(0, 1.1, -5.2);
  hearthBase.castShadow = true;
  hearthBase.receiveShadow = true;
  group.add(hearthBase);

  const fireEmber = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xfdba74, emissive: 0xf97316, emissiveIntensity: 2.2, roughness: 0.4 }),
  );
  fireEmber.scale.set(1.4, 0.6, 0.8);
  fireEmber.position.set(0, 0.35, -4.65);
  group.add(fireEmber);

  const hearthLight = new THREE.PointLight(0xfb923c, 5.5, 13, 1.6);
  hearthLight.position.set(0, 1.25, -4.1);
  group.add(hearthLight);
  dynamicLights.push({ light: hearthLight, baseIntensity: 5.5, speed: 6.5, phase: 0.3 });

  colliders.push({ kind: 'box', minX: -1.35, maxX: 1.35, minZ: -5.9, maxZ: -4.45, minY: 0, maxY: 2.4 });

  // Alchemy Cauldron in front of hearth
  const cauldronMat = new THREE.MeshStandardMaterial({ color: 0x262b30, roughness: 0.38, metalness: 0.8 });
  const cauldron = new THREE.Mesh(new THREE.SphereGeometry(0.68, 16, 12, 0, Math.PI * 2, 0.35, Math.PI * 0.75), cauldronMat);
  cauldron.position.set(-1.35, 0.56, -2.55);
  cauldron.castShadow = true;
  group.add(cauldron);

  const potionSurface = new THREE.Mesh(
    new THREE.CircleGeometry(0.56, 16),
    new THREE.MeshStandardMaterial({ color: 0x6ee7b7, emissive: 0x10b981, emissiveIntensity: 1.5, roughness: 0.15 }),
  );
  potionSurface.rotation.x = -Math.PI / 2;
  potionSurface.position.set(-1.35, 0.92, -2.55);
  group.add(potionSurface);
  animatedMeshes.push({ mesh: potionSurface, kind: 'cauldronBubble', baseY: 0.92, phase: 0 });

  colliders.push({ kind: 'cylinder', x: -1.35, z: -2.55, radius: 0.75, minY: 0, maxY: 1.1 });

  // 5. Alchemy Worktable (East side x = 3.2, z = -1.2) + Colorful Potion Flasks + Walkable Table Top!
  const table = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 3.0), woodMat);
  table.position.set(3.2, 0.45, -1.2);
  table.castShadow = true;
  table.receiveShadow = true;
  group.add(table);
  colliders.push({ kind: 'box', minX: 2.35, maxX: 4.05, minZ: -2.7, maxZ: 0.3, minY: 0, maxY: 0.9 });
  platforms.push({
    kind: 'box',
    minX: 2.3,
    maxX: 4.1,
    minZ: -2.75,
    maxZ: 0.35,
    topY: 0.9,
    materialKind: 'wood',
  });

  // Stepping stool next to table
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.48, 0.48, 12), woodMat);
  stool.position.set(1.9, 0.24, -0.4);
  stool.castShadow = true;
  stool.receiveShadow = true;
  group.add(stool);
  platforms.push({
    kind: 'disc',
    minX: 0,
    maxX: 0,
    minZ: 0,
    maxZ: 0,
    x: 1.9,
    z: -0.4,
    radius: 0.5,
    topY: 0.48,
    materialKind: 'wood',
  });

  // Potion flasks on the table & shelf
  const flaskColors = [0xf59e0b, 0x34d399, 0xa78bfa, 0xf472b6, 0x38bdf8];
  flaskColors.forEach((col, i) => {
    const flask = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.14, 0.32, 10),
      new THREE.MeshPhysicalMaterial({
        color: col,
        emissive: col,
        emissiveIntensity: 0.35,
        roughness: 0.12,
        clearcoat: 1.0,
      }),
    );
    flask.position.set(3.45, 1.06, -2.1 + i * 0.45);
    group.add(flask);
  });

  // 6. Potion Shelf on West Wall (x = -4.6, z = 0)
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.5, 2.8), woodMat);
  shelf.position.set(-4.6, 1.25, 0);
  shelf.castShadow = true;
  shelf.receiveShadow = true;
  group.add(shelf);
  colliders.push({ kind: 'box', minX: -5.0, maxX: -4.2, minZ: -1.45, maxZ: 1.45, minY: 0, maxY: 2.5 });

  // 7. Granny Chestnut NPC
  const chestnutBuilt = createNpcModel('chestnut', textures.contactShadow);
  const chestnutPos = new THREE.Vector3(-0.3, 0, -2.55);
  chestnutBuilt.group.position.copy(chestnutPos);
  chestnutBuilt.group.rotation.y = 0.25;
  group.add(chestnutBuilt.group);
  colliders.push({ kind: 'cylinder', x: chestnutPos.x, z: chestnutPos.z, radius: 0.55, minY: 0, maxY: 1.8 });
  npcs.push({
    id: 'chestnut',
    zone: 'apothecary',
    group: chestnutBuilt.group,
    headGroup: chestnutBuilt.headGroup,
    indicatorMesh: chestnutBuilt.indicatorMesh,
    position: chestnutPos,
    baseYaw: 0.25,
    talkRadius: 2.7,
  });

  // 8. Indoor Dewdrop on top of the Alchemy Table!
  const dew = createDewdropCollectible();
  dew.position.set(3.0, 1.05, -0.5);
  group.add(dew);
  dewdrops.push({
    id: 'dew_apothecary',
    zone: 'apothecary',
    position: new THREE.Vector3(3.0, 1.05, -0.5),
    group: dew,
    collected: false,
  });

  // 9. Exit Doorway back to Outdoor Glade (South wall z = +5.6)
  const exitFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.3, 0.35), woodMat);
  exitFrame.position.set(0, 1.15, 5.75);
  group.add(exitFrame);

  const exitPortalMat = new THREE.MeshStandardMaterial({
    color: 0xd1fae5,
    emissive: 0x34d399,
    emissiveIntensity: 1.2,
    roughness: 0.2,
  });
  const exitDoor = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 2.0), exitPortalMat);
  exitDoor.position.set(0, 1.05, 5.55);
  exitDoor.rotation.y = Math.PI;
  group.add(exitDoor);

  const exitPos = new THREE.Vector3(0, 0.04, 5.1);
  const exitGlowRing = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.64, 24),
    new THREE.MeshBasicMaterial({ color: 0x6ee7b7, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
  );
  exitGlowRing.rotation.x = -Math.PI / 2;
  exitGlowRing.position.copy(exitPos);
  group.add(exitGlowRing);

  const apothReturnPos =
    mapConfig.layout === 'plaza_pair'
      ? new THREE.Vector3(-6.8, 0.48, -4.85)
      : new THREE.Vector3(-8.2, 0.48, -3.25);

  portals.push({
    id: 'exit_apothecary',
    label: '回到 精灵林涧',
    fromZone: 'apothecary',
    toZone: 'glade',
    position: exitPos,
    spawnPosition: apothReturnPos,
    spawnYaw: 0,
    triggerRadius: 1.55,
    glowRing: exitGlowRing,
  });

  return {
    id: 'apothecary',
    group,
    colliders,
    platforms,
    portals,
    npcs,
    bounceMushrooms: [],
    dewdrops,
    boundaryRadius: 5.5,
    floorMaterial: 'wood',
    dynamicLights,
    animatedMeshes,
  };
}

function buildLibraryZone(textures: TextureBundle, mapConfig: MapCreationConfig): ZoneData {
  const group = new THREE.Group();
  const colliders: WorldCollider[] = [];
  const platforms: WalkablePlatform[] = [];
  const portals: DoorPortal[] = [];
  const npcs: NpcInstance[] = [];
  const dewdrops: DewdropItem[] = [];
  const dynamicLights: ZoneData['dynamicLights'] = [];
  const animatedMeshes: ZoneData['animatedMeshes'] = [];

  const roomRadius = 6.8;
  const wallHeight = 5.2;

  // 1. Timber Floor & Star Rug
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(roomRadius, 28),
    new THREE.MeshStandardMaterial({ map: textures.woodPlank, roughness: 0.62 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const rug = new THREE.Mesh(
    new THREE.CircleGeometry(3.1, 28),
    new THREE.MeshStandardMaterial({ map: textures.starRug, roughness: 0.9 }),
  );
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.025;
  rug.receiveShadow = true;
  group.add(rug);

  // 2. Hollow Ancient Tree Bark Interior Walls & Canopy Ceiling
  const barkWall = new THREE.Mesh(
    new THREE.CylinderGeometry(roomRadius, roomRadius, wallHeight, 24, 1, true),
    new THREE.MeshStandardMaterial({ map: textures.bark, roughness: 0.88, side: THREE.BackSide }),
  );
  barkWall.position.y = wallHeight / 2;
  barkWall.receiveShadow = true;
  group.add(barkWall);

  const ceiling = new THREE.Mesh(
    new THREE.SphereGeometry(roomRadius, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.45),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, side: THREE.BackSide }),
  );
  ceiling.position.y = wallHeight - 1.0;
  group.add(ceiling);

  // 3. Arched Bookshelves along the Curved Tree Wall
  const woodMat = new THREE.MeshStandardMaterial({ map: textures.warmWood, roughness: 0.66 });
  const bookColors = [0x93c5fd, 0xfbbf24, 0xf472b6, 0x6ee7b7, 0xc4b5fd];
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI * 0.82 + i * 0.52;
    const bx = Math.sin(angle) * (roomRadius - 0.9);
    const bz = -Math.cos(angle) * (roomRadius - 0.9);

    const shelfUnit = new THREE.Group();
    shelfUnit.position.set(bx, 0, bz);
    shelfUnit.rotation.y = -angle;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.8, 0.55), woodMat);
    frame.position.y = 1.4;
    frame.castShadow = true;
    frame.receiveShadow = true;
    shelfUnit.add(frame);

    for (let row = 0; row < 3; row++) {
      for (let b = 0; b < 5; b++) {
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.36, 0.36),
          new THREE.MeshStandardMaterial({ color: bookColors[(i + row + b) % bookColors.length], roughness: 0.72 }),
        );
        book.position.set(-0.55 + b * 0.27, 0.68 + row * 0.75, 0.14);
        shelfUnit.add(book);
      }
    }

    group.add(shelfUnit);
    colliders.push({ kind: 'cylinder', x: bx, z: bz, radius: 0.95, minY: 0, maxY: 2.8 });
  }

  // 4. Central Star-Chart Table + Rotating Brass Astrolabe (Walkable!)
  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.45, 0.18, 20), woodMat);
  tableTop.position.set(0, 0.82, -0.4);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  group.add(tableTop);

  const tablePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, 0.78, 12), woodMat);
  tablePedestal.position.set(0, 0.39, -0.4);
  tablePedestal.castShadow = true;
  group.add(tablePedestal);

  colliders.push({ kind: 'cylinder', x: 0, z: -0.4, radius: 1.45, minY: 0, maxY: 0.9 });
  platforms.push({
    kind: 'disc',
    minX: 0,
    maxX: 0,
    minZ: 0,
    maxZ: 0,
    x: 0,
    z: -0.4,
    radius: 1.55,
    topY: 0.91,
    materialKind: 'wood',
  });

  // Reading step stool
  const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.48, 0.46, 12), woodMat);
  stool.position.set(-1.9, 0.23, 0.5);
  stool.castShadow = true;
  group.add(stool);
  platforms.push({
    kind: 'disc',
    minX: 0,
    maxX: 0,
    minZ: 0,
    maxZ: 0,
    x: -1.9,
    z: 0.5,
    radius: 0.5,
    topY: 0.46,
    materialKind: 'wood',
  });

  // Rotating Brass Astrolabe above table center
  const astrolabeGroup = new THREE.Group();
  astrolabeGroup.position.set(0, 1.52, -0.4);
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.22, metalness: 0.88 });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 8, 24), brassMat);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.022, 8, 24), brassMat);
  ring2.rotation.x = Math.PI / 3;
  const starCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.14, 0),
    new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x60a5fa, emissiveIntensity: 2.0, roughness: 0.1 }),
  );
  astrolabeGroup.add(ring1, ring2, starCore);
  group.add(astrolabeGroup);
  animatedMeshes.push({ mesh: astrolabeGroup, kind: 'astrolabe', baseY: 1.52, phase: 0 });

  const astroLight = new THREE.PointLight(0x93c5fd, 4.5, 13, 1.6);
  astroLight.position.set(0, 2.2, -0.4);
  group.add(astroLight);
  dynamicLights.push({ light: astroLight, baseIntensity: 4.5, speed: 2.2, phase: 0 });

  // 5. Floating Enchanted Candles
  const candleOffsets: [number, number, number][] = [
    [-2.8, 2.6, -2.5],
    [2.9, 2.9, -2.1],
    [-3.2, 2.4, 2.1],
    [3.1, 2.7, 1.9],
  ];
  candleOffsets.forEach(([cx, cy, cz], idx) => {
    const cGroup = new THREE.Group();
    cGroup.position.set(cx, cy, cz);
    const wax = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.08, 0.34, 8),
      new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.7 }),
    );
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.14, 8),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 2.5 }),
    );
    flame.position.y = 0.24;
    cGroup.add(wax, flame);
    group.add(cGroup);
    animatedMeshes.push({ mesh: cGroup, kind: 'candle', baseY: cy, phase: idx * 1.4 });
  });

  // 6. Orion the Starlight Archivist NPC
  const orionBuilt = createNpcModel('orion', textures.contactShadow);
  const orionPos = new THREE.Vector3(1.85, 0, -2.35);
  orionBuilt.group.position.copy(orionPos);
  orionBuilt.group.rotation.y = -0.5;
  group.add(orionBuilt.group);
  colliders.push({ kind: 'cylinder', x: orionPos.x, z: orionPos.z, radius: 0.55, minY: 0, maxY: 1.8 });
  npcs.push({
    id: 'orion',
    zone: 'library',
    group: orionBuilt.group,
    headGroup: orionBuilt.headGroup,
    indicatorMesh: orionBuilt.indicatorMesh,
    position: orionPos,
    baseYaw: -0.5,
    talkRadius: 2.7,
  });

  // 7. Indoor Dewdrop on top of the Star-Chart Table!
  const dew = createDewdropCollectible();
  dew.position.set(0.65, 1.0, -0.4);
  group.add(dew);
  dewdrops.push({
    id: 'dew_library',
    zone: 'library',
    position: new THREE.Vector3(0.65, 1.0, -0.4),
    group: dew,
    collected: false,
  });

  // 8. Exit Doorway back to Outdoor Glade (South wall z = +6.2)
  const exitFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.3, 0.35), woodMat);
  exitFrame.position.set(0, 1.15, 6.35);
  group.add(exitFrame);

  const exitDoor = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 2.0),
    new THREE.MeshStandardMaterial({
      color: 0xd1fae5,
      emissive: 0x34d399,
      emissiveIntensity: 1.2,
      roughness: 0.2,
    }),
  );
  exitDoor.position.set(0, 1.05, 6.15);
  exitDoor.rotation.y = Math.PI;
  group.add(exitDoor);

  const exitPos = new THREE.Vector3(0, 0.04, 5.65);
  const exitGlowRing = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.64, 24),
    new THREE.MeshBasicMaterial({ color: 0x6ee7b7, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
  );
  exitGlowRing.rotation.x = -Math.PI / 2;
  exitGlowRing.position.copy(exitPos);
  group.add(exitGlowRing);

  const libReturnPos =
    mapConfig.layout === 'plaza_pair'
      ? new THREE.Vector3(5.55, 2.04, -6.75)
      : new THREE.Vector3(5.45, 2.04, 8.55);

  portals.push({
    id: 'exit_library',
    label: '回到 精灵林涧',
    fromZone: 'library',
    toZone: 'glade',
    position: exitPos,
    spawnPosition: libReturnPos,
    spawnYaw: -Math.PI * 0.65,
    triggerRadius: 1.55,
    glowRing: exitGlowRing,
  });

  return {
    id: 'library',
    group,
    colliders,
    platforms,
    portals,
    npcs,
    bounceMushrooms: [],
    dewdrops,
    boundaryRadius: 6.0,
    floorMaterial: 'wood',
    dynamicLights,
    animatedMeshes,
  };
}
