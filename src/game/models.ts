import * as THREE from 'three';
import type {
  BiomeId,
  CharacterCreationConfig,
  NpcId,
  SpriteThemeId,
  WandStyleId,
  WingStyleId,
} from './types';
import { DEFAULT_CREATION_CONFIG } from './types';

export interface PlayerRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  wingLeftTop: THREE.Group;
  wingRightTop: THREE.Group;
  wingLeftBottom: THREE.Group;
  wingRightBottom: THREE.Group;
  wandGlow: THREE.Mesh;
  wispPivot: THREE.Group;
  contactShadow: THREE.Mesh;
}

export interface TextureBundle {
  mossGrass: THREE.CanvasTexture;
  cobble: THREE.CanvasTexture;
  woodPlank: THREE.CanvasTexture;
  warmWood: THREE.CanvasTexture;
  bark: THREE.CanvasTexture;
  mushroomCap: THREE.CanvasTexture;
  starRug: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  glowSprite: THREE.CanvasTexture;
}

interface ThemePalette {
  tunic: number;
  overskirt: number;
  cape: number;
  hair: number;
  boot: number;
  wingColor: number;
  wingEmissive: number;
  wandEmissive: number;
  metal: number;
}

const SPRITE_THEMES: Record<SpriteThemeId, ThemePalette> = {
  emerald: {
    tunic: 0x3b8f64,
    overskirt: 0x57b57c,
    cape: 0x245e43,
    hair: 0x7c4f33,
    boot: 0x593722,
    wingColor: 0xbef8e5,
    wingEmissive: 0x3ba88f,
    wandEmissive: 0x6ef7c8,
    metal: 0xe7b952,
  },
  sakura: {
    tunic: 0xdf6e93,
    overskirt: 0xf9a8d4,
    cape: 0xa63d66,
    hair: 0xe9c48c,
    boot: 0x6b3b4e,
    wingColor: 0xfce7f3,
    wingEmissive: 0xf472b6,
    wandEmissive: 0xf9a8d4,
    metal: 0xfde68a,
  },
  starlight: {
    tunic: 0x3b4d9b,
    overskirt: 0x7189e6,
    cape: 0x222c62,
    hair: 0xb8d4f4,
    boot: 0x282f4f,
    wingColor: 0xe0f2fe,
    wingEmissive: 0x60a5fa,
    wandEmissive: 0x93c5fd,
    metal: 0xfcd34d,
  },
  amber: {
    tunic: 0xd97724,
    overskirt: 0xf59e0b,
    cape: 0x8f4114,
    hair: 0x5c301c,
    boot: 0x4a2816,
    wingColor: 0xfef3c7,
    wingEmissive: 0xf59e0b,
    wandEmissive: 0xfde047,
    metal: 0xfbbf24,
  },
};

function createWingShapeGeometry(style: WingStyleId, width: number, height: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);

  if (style === 'butterfly') {
    shape.bezierCurveTo(width * 0.35, height * 0.72, width * 0.92, height * 0.68, width, height * 0.16);
    shape.bezierCurveTo(width * 1.06, -height * 0.08, width * 0.82, -height * 0.42, width * 0.42, -height * 0.34);
    shape.bezierCurveTo(width * 0.2, -height * 0.28, width * 0.08, -height * 0.12, 0, -height * 0.05);
  } else if (style === 'star') {
    shape.lineTo(width * 0.45, height * 0.55);
    shape.lineTo(width * 1.08, height * 0.28);
    shape.lineTo(width * 0.72, -height * 0.08);
    shape.lineTo(width * 0.95, -height * 0.36);
    shape.lineTo(width * 0.32, -height * 0.22);
    shape.lineTo(0, -height * 0.06);
  } else {
    // Leaf / cicada wing
    shape.bezierCurveTo(width * 0.45, height * 0.55, width * 1.12, height * 0.4, width * 1.04, -height * 0.04);
    shape.bezierCurveTo(width * 0.85, -height * 0.44, width * 0.3, -height * 0.32, 0, -height * 0.05);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.007,
    bevelSize: 0.007,
    bevelSegments: 2,
    curveSegments: 14,
  });
  geo.computeVertexNormals();
  return geo;
}

function buildWingPart(
  geo: THREE.ExtrudeGeometry,
  wingMat: THREE.Material,
  veinMat: THREE.Material,
  width: number,
  isTop: boolean,
): THREE.Group {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(geo, wingMat);
  g.add(blade);

  // Delicate central & upper structural vein ribs
  const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.011, width * 0.78, 6), veinMat);
  rib.rotation.z = -Math.PI / 2 + (isTop ? 0.14 : -0.18);
  rib.position.set(width * 0.38, isTop ? 0.04 : -0.05, 0.012);
  g.add(rib);

  const dewSpot = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), veinMat);
  dewSpot.position.set(width * 0.72, isTop ? 0.08 : -0.06, 0.012);
  g.add(dewSpot);

  return g;
}

function buildWandProp(
  style: WandStyleId,
  woodMat: THREE.Material,
  metalMat: THREE.Material,
  emissiveHex: number,
): { group: THREE.Group; glowMesh: THREE.Mesh } {
  const group = new THREE.Group();

  const tipMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: emissiveHex,
    emissiveIntensity: 1.75,
    roughness: 0.12,
  });

  if (style === 'lantern_wand') {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.56, 8), woodMat);
    stick.rotation.x = Math.PI / 2.3;
    stick.position.set(0, -0.32, 0.2);
    group.add(stick);

    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.014, 8, 14, Math.PI * 1.2), metalMat);
    hook.position.set(0, -0.22, 0.46);
    hook.rotation.y = Math.PI / 2;
    group.add(hook);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.07, 8), metalMat);
    cap.position.set(0, -0.32, 0.51);
    group.add(cap);

    const lanternOrb = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.11, 8), tipMat);
    lanternOrb.position.set(0, -0.4, 0.51);
    group.add(lanternOrb);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.03, 8), metalMat);
    base.position.set(0, -0.47, 0.51);
    group.add(base);

    return { group, glowMesh: lanternOrb };
  }

  if (style === 'blossom_wand') {
    const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.024, 0.56, 8), woodMat);
    twig.rotation.x = Math.PI / 2.35;
    twig.position.set(0, -0.33, 0.21);
    group.add(twig);

    const flowerCenter = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 10), tipMat);
    flowerCenter.position.set(0, -0.24, 0.45);
    group.add(flowerCenter);

    const petalMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.45 });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), petalMat);
      petal.scale.set(1.2, 0.45, 0.9);
      petal.position.set(Math.cos(a) * 0.065, -0.24 + Math.sin(a) * 0.065, 0.46);
      group.add(petal);
    }

    return { group, glowMesh: flowerCenter };
  }

  // Default: crystal_wand
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.022, 0.55, 8), woodMat);
  stick.rotation.x = Math.PI / 2.35;
  stick.position.set(0, -0.33, 0.21);
  group.add(stick);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.012, 8, 14), metalMat);
  collar.position.set(0, -0.26, 0.41);
  group.add(collar);

  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.072, 0), tipMat);
  crystal.scale.set(0.85, 1.35, 0.85);
  crystal.position.set(0, -0.23, 0.47);
  group.add(crystal);

  return { group, glowMesh: crystal };
}

export function createPlayerSprite(
  contactShadowTex: THREE.CanvasTexture,
  config: CharacterCreationConfig = DEFAULT_CREATION_CONFIG.character,
): PlayerRig {
  const palette = SPRITE_THEMES[config.theme];
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const skinMat = new THREE.MeshStandardMaterial({ color: 0xfde2cf, roughness: 0.7, metalness: 0.0 });
  const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xf7b9a6, roughness: 0.8 });
  const hairMat = new THREE.MeshStandardMaterial({ color: palette.hair, roughness: 0.72, metalness: 0.04 });
  const tunicMat = new THREE.MeshStandardMaterial({ color: palette.tunic, roughness: 0.74, metalness: 0.04 });
  const overskirtMat = new THREE.MeshStandardMaterial({ color: palette.overskirt, roughness: 0.68, metalness: 0.05 });
  const capeMat = new THREE.MeshStandardMaterial({ color: palette.cape, roughness: 0.8, metalness: 0.03 });
  const sockMat = new THREE.MeshStandardMaterial({ color: 0xf7f2e7, roughness: 0.85 });
  const metalMat = new THREE.MeshStandardMaterial({ color: palette.metal, roughness: 0.24, metalness: 0.88 });
  const bootMat = new THREE.MeshStandardMaterial({ color: palette.boot, roughness: 0.62, metalness: 0.06 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x18201d, roughness: 0.16, metalness: 0.12 });
  const catchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blushMat = new THREE.MeshStandardMaterial({ color: 0xf4989c, roughness: 0.85, metalness: 0 });
  const wingMat = new THREE.MeshPhysicalMaterial({
    color: palette.wingColor,
    emissive: palette.wingEmissive,
    emissiveIntensity: 0.38,
    roughness: 0.14,
    metalness: 0.1,
    iridescence: 0.95,
    iridescenceIOR: 1.35,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
  });
  const veinMat = new THREE.MeshStandardMaterial({
    color: palette.metal,
    emissive: palette.wingEmissive,
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.7,
  });

  // 1. Articulated Legs + Knee Socks + Cuffed Buckled Boots
  const makeLeg = (xOffset: number): THREE.Group => {
    const legGroup = new THREE.Group();
    legGroup.position.set(xOffset, 0.42, 0);

    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.12, 6, 10), skinMat);
    thigh.position.y = -0.1;
    thigh.castShadow = true;
    legGroup.add(thigh);

    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.058, 0.14, 10), sockMat);
    sock.position.y = -0.22;
    legGroup.add(sock);

    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.018, 6, 12), overskirtMat);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.28;
    legGroup.add(cuff);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.115, 0.21), bootMat);
    boot.position.set(0, -0.35, 0.03);
    boot.castShadow = true;
    legGroup.add(boot);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.03), metalMat);
    buckle.position.set(0, -0.33, 0.13);
    legGroup.add(buckle);

    return legGroup;
  };

  const leftLeg = makeLeg(-0.11);
  const rightLeg = makeLeg(0.11);
  bodyPivot.add(leftLeg, rightLeg);

  // 2. Layered Tunic Skirt + Scalloped Petal Overskirt + Bodice
  const skirtPoints = [
    new THREE.Vector2(0.01, 0.0),
    new THREE.Vector2(0.34, 0.02),
    new THREE.Vector2(0.25, 0.26),
    new THREE.Vector2(0.19, 0.56),
    new THREE.Vector2(0.0, 0.58),
  ];
  const skirt = new THREE.Mesh(new THREE.LatheGeometry(skirtPoints, 20), tunicMat);
  skirt.position.y = 0.34;
  skirt.castShadow = true;
  skirt.receiveShadow = true;
  bodyPivot.add(skirt);

  // Scalloped Petal Overskirt Tabs (8 radial beveled flaps around waist)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8), overskirtMat);
    petal.scale.set(0.95, 1.35, 0.35);
    petal.position.set(Math.sin(a) * 0.21, 0.57, Math.cos(a) * 0.21);
    petal.rotation.y = a;
    petal.rotation.x = -0.38;
    petal.castShadow = true;
    bodyPivot.add(petal);
  }

  // Waist Sash + Gold Clasp + Side Pouch
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.03, 8, 22), capeMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.67;
  bodyPivot.add(belt);

  const clasp = new THREE.Mesh(new THREE.OctahedronGeometry(0.052, 0), metalMat);
  clasp.position.set(0, 0.67, 0.215);
  bodyPivot.add(clasp);

  const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.06), bootMat);
  pouch.position.set(-0.22, 0.6, 0.04);
  pouch.rotation.z = 0.15;
  bodyPivot.add(pouch);

  // Leaf Collar & Glowing Chest Crystal Brooch
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.28, 0.13, 14), capeMat);
  collar.position.y = 0.86;
  collar.castShadow = true;
  bodyPivot.add(collar);

  const brooch = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.048, 0),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: palette.wandEmissive,
      emissiveIntensity: 1.4,
      roughness: 0.15,
    }),
  );
  brooch.position.set(0, 0.85, 0.23);
  bodyPivot.add(brooch);

  // 3. Arms with Puffed Sleeves, Cuffs, Hands & Selected Wand
  const makeArm = (xOffset: number, withWand: boolean): { group: THREE.Group; wandGlow?: THREE.Mesh } => {
    const armGroup = new THREE.Group();
    armGroup.position.set(xOffset, 0.85, 0);

    const puff = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), overskirtMat);
    puff.position.y = -0.04;
    puff.castShadow = true;
    armGroup.add(puff);

    const sleeve = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.16, 10), tunicMat);
    sleeve.position.y = -0.14;
    sleeve.castShadow = true;
    armGroup.add(sleeve);

    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.18, 6, 8), skinMat);
    arm.position.y = -0.26;
    arm.castShadow = true;
    armGroup.add(arm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 10), skinMat);
    hand.position.y = -0.37;
    armGroup.add(hand);

    let wandGlow: THREE.Mesh | undefined;
    if (withWand) {
      const builtWand = buildWandProp(config.wand, bootMat, metalMat, palette.wandEmissive);
      armGroup.add(builtWand.group);
      wandGlow = builtWand.glowMesh;
    }

    return { group: armGroup, wandGlow };
  };

  const leftArmBuilt = makeArm(-0.24, false);
  const rightArmBuilt = makeArm(0.24, true);
  const leftArm = leftArmBuilt.group;
  const rightArm = rightArmBuilt.group;
  bodyPivot.add(leftArm, rightArm);

  // 4. Expressive Head, Face, Pointed Ears + Ear Rings, Hairstyles & Hats
  const headGroup = new THREE.Group();
  headGroup.position.y = 0.96;
  bodyPivot.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.225, 22, 20), skinMat);
  head.position.y = 0.185;
  head.castShadow = true;
  headGroup.add(head);

  // Cute Nose & Smile
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), skinMat);
  nose.position.set(0, 0.155, 0.225);
  headGroup.add(nose);

  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.036, 0.008, 6, 12, Math.PI * 0.75),
    new THREE.MeshStandardMaterial({ color: 0xc26a6d, roughness: 0.7 }),
  );
  smile.position.set(0, 0.125, 0.205);
  smile.rotation.z = Math.PI + Math.PI * 0.125;
  headGroup.add(smile);

  // Layered Eyes (Iris + Catchlight + Brow) + Ears with Ear Cuff
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 12), eyeMat);
    eye.position.set(side * 0.082, 0.185, 0.198);
    eye.scale.set(0.92, 1.25, 0.58);
    headGroup.add(eye);

    const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 6), catchlightMat);
    catchlight.position.set(side * 0.072, 0.2, 0.216);
    headGroup.add(catchlight);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.013, 0.015), hairMat);
    brow.position.set(side * 0.084, 0.242, 0.202);
    brow.rotation.z = -side * 0.12;
    headGroup.add(brow);

    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), blushMat);
    cheek.position.set(side * 0.125, 0.13, 0.175);
    cheek.scale.set(1.15, 0.62, 0.4);
    headGroup.add(cheek);

    // Sculpted Pointed Elf Ear + Inner Ear + Golden Ear Cuff
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.22, 8), skinMat);
    ear.position.set(side * 0.255, 0.19, 0.0);
    ear.rotation.z = -side * (Math.PI / 2 - 0.34);
    ear.rotation.y = -side * 0.22;
    ear.castShadow = true;
    headGroup.add(ear);

    const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.15, 8), innerEarMat);
    innerEar.position.set(side * 0.25, 0.19, 0.016);
    innerEar.rotation.z = -side * (Math.PI / 2 - 0.34);
    innerEar.rotation.y = -side * 0.22;
    headGroup.add(innerEar);

    const earCuff = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 10), metalMat);
    earCuff.position.set(side * 0.27, 0.195, 0.0);
    earCuff.rotation.y = Math.PI / 2;
    headGroup.add(earCuff);
  }

  // Hair Base + Front Fringe Bangs
  const hairCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.236, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat,
  );
  hairCrown.position.set(0, 0.205, -0.02);
  hairCrown.rotation.x = -0.22;
  headGroup.add(hairCrown);

  for (let b = -2; b <= 2; b++) {
    const bang = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.12, 8), hairMat);
    bang.position.set(b * 0.048, 0.295, 0.175 - Math.abs(b) * 0.025);
    bang.rotation.x = Math.PI - 0.32;
    bang.rotation.z = b * 0.12;
    headGroup.add(bang);
  }

  // Selectable Hairstyle + Headwear!
  if (config.hairHat === 'flower_crown') {
    // Twin braided pigtails + woven floral crown
    for (const side of [-1, 1]) {
      for (let seg = 0; seg < 4; seg++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.068 - seg * 0.008, 10, 10), hairMat);
        puff.position.set(side * (0.21 + seg * 0.022), 0.14 - seg * 0.095, -0.07 - seg * 0.015);
        puff.castShadow = true;
        headGroup.add(puff);
      }
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 6, 12), metalMat);
      tie.position.set(side * 0.21, 0.16, -0.07);
      tie.rotation.x = Math.PI / 2;
      headGroup.add(tie);
    }

    const vineRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.032, 8, 22), capeMat);
    vineRing.rotation.x = Math.PI / 2 + 0.12;
    vineRing.position.set(0, 0.36, -0.01);
    headGroup.add(vineRing);

    const flowerPalette = [0xf9a8d4, 0xfef08a, 0xbae6fd, 0xfda4af];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const flower = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.054, 0),
        new THREE.MeshStandardMaterial({ color: flowerPalette[i % flowerPalette.length], roughness: 0.45 }),
      );
      flower.position.set(Math.cos(a) * 0.22, 0.39 - Math.sin(a) * 0.02, Math.sin(a) * 0.22);
      headGroup.add(flower);
    }
  } else if (config.hairHat === 'star_hat') {
    // Long flowing hair waves + Starlight Wizard Hat
    for (let i = -2; i <= 2; i++) {
      const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.28, 6, 8), hairMat);
      lock.position.set(i * 0.072, 0.02, -0.17);
      lock.rotation.x = 0.14;
      headGroup.add(lock);
    }

    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.41, 0.045, 18), capeMat);
    brim.position.set(0, 0.37, -0.01);
    brim.rotation.x = -0.08;
    brim.castShadow = true;
    headGroup.add(brim);

    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.225, 0.06, 16), metalMat);
    band.position.set(0, 0.4, -0.01);
    headGroup.add(band);

    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.46, 16), tunicMat);
    cone.position.set(0, 0.62, -0.05);
    cone.rotation.x = -0.22;
    cone.castShadow = true;
    headGroup.add(cone);

    const starTip = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), metalMat);
    starTip.position.set(0, 0.83, -0.13);
    headGroup.add(starTip);
  } else {
    // leaf_cap: Short curly side locks + Sculpted Woodland Leaf Cap
    for (const side of [-1, 1]) {
      const curl = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), hairMat);
      curl.position.set(side * 0.19, 0.12, -0.04);
      headGroup.add(curl);
    }

    const hatBrim = new THREE.Mesh(new THREE.ConeGeometry(0.295, 0.13, 16), capeMat);
    hatBrim.position.set(0, 0.355, 0);
    hatBrim.castShadow = true;
    headGroup.add(hatBrim);

    const hatTip = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.38, 16), tunicMat);
    hatTip.position.set(0, 0.51, -0.05);
    hatTip.rotation.x = -0.36;
    hatTip.castShadow = true;
    headGroup.add(hatTip);

    const hatGoldBand = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.016, 6, 16), metalMat);
    hatGoldBand.rotation.x = Math.PI / 2;
    hatGoldBand.position.set(0, 0.38, -0.01);
    headGroup.add(hatGoldBand);

    const hatBell = new THREE.Mesh(new THREE.SphereGeometry(0.044, 10, 10), metalMat);
    hatBell.position.set(0, 0.67, -0.15);
    headGroup.add(hatBell);
  }

  // 5. Back Wing Clasp + Veined 4-Lobe Fairy Wings
  const wingClasp = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), metalMat);
  wingClasp.position.set(0, 0.78, -0.16);
  bodyPivot.add(wingClasp);

  const topWingGeo = createWingShapeGeometry(config.wings, 0.6, 0.38);
  const botWingGeo = createWingShapeGeometry(config.wings, 0.42, 0.27);

  const wingLeftTop = buildWingPart(topWingGeo, wingMat, veinMat, 0.6, true);
  wingLeftTop.position.set(-0.06, 0.82, -0.15);
  wingLeftTop.rotation.y = Math.PI - 0.42;
  wingLeftTop.rotation.z = 0.26;

  const wingRightTop = buildWingPart(topWingGeo, wingMat, veinMat, 0.6, true);
  wingRightTop.position.set(0.06, 0.82, -0.15);
  wingRightTop.rotation.y = 0.42;
  wingRightTop.rotation.z = 0.26;

  const wingLeftBottom = buildWingPart(botWingGeo, wingMat, veinMat, 0.42, false);
  wingLeftBottom.position.set(-0.05, 0.67, -0.15);
  wingLeftBottom.rotation.y = Math.PI - 0.56;
  wingLeftBottom.rotation.z = -0.32;

  const wingRightBottom = buildWingPart(botWingGeo, wingMat, veinMat, 0.42, false);
  wingRightBottom.position.set(0.05, 0.67, -0.15);
  wingRightBottom.rotation.y = 0.56;
  wingRightBottom.rotation.z = -0.32;

  bodyPivot.add(wingLeftTop, wingRightTop, wingLeftBottom, wingRightBottom);

  // 6. Tiny Orbiting Fairy Wisp Companion
  const wispPivot = new THREE.Group();
  wispPivot.position.set(0, 1.15, 0);
  const wispOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: palette.wandEmissive,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    }),
  );
  wispOrb.position.set(0.55, 0.15, 0);
  const wispHalo = new THREE.Mesh(
    new THREE.TorusGeometry(0.085, 0.01, 6, 16),
    metalMat,
  );
  wispHalo.position.copy(wispOrb.position);
  wispHalo.rotation.x = Math.PI / 3;
  wispPivot.add(wispOrb, wispHalo);
  bodyPivot.add(wispPivot);

  // 7. Ground Contact Shadow
  const shadowGeo = new THREE.PlaneGeometry(1.0, 1.0);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: contactShadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.45,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.y = 0.025;
  root.add(contactShadow);

  return {
    root,
    bodyPivot,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    wingLeftTop,
    wingRightTop,
    wingLeftBottom,
    wingRightBottom,
    wandGlow: rightArmBuilt.wandGlow!,
    wispPivot,
    contactShadow,
  };
}

export function animatePlayerSprite(
  rig: PlayerRig,
  time: number,
  speedRatio: number,
  isGrounded: boolean,
  verticalVel: number,
  squashY: number,
  hasBlessing: boolean,
): void {
  const invSqrt = 1 / Math.sqrt(Math.max(0.65, squashY));
  rig.bodyPivot.scale.set(invSqrt, squashY, invSqrt);

  if (isGrounded) {
    if (speedRatio > 0.08) {
      const cycle = time * (9.5 + speedRatio * 4.5);
      const swing = Math.sin(cycle) * 0.65 * Math.min(1, speedRatio);
      rig.leftLeg.rotation.x = swing;
      rig.rightLeg.rotation.x = -swing;
      rig.leftArm.rotation.x = -swing * 0.8;
      rig.rightArm.rotation.x = swing * 0.55 - 0.25;
      rig.bodyPivot.position.y = Math.abs(Math.cos(cycle)) * 0.06 * speedRatio;
      rig.headGroup.rotation.z = Math.sin(cycle) * 0.04;
    } else {
      rig.leftLeg.rotation.x = THREE.MathUtils.lerp(rig.leftLeg.rotation.x, 0, 0.18);
      rig.rightLeg.rotation.x = THREE.MathUtils.lerp(rig.rightLeg.rotation.x, 0, 0.18);
      rig.leftArm.rotation.x = Math.sin(time * 2) * 0.05;
      rig.rightArm.rotation.x = -0.15 + Math.cos(time * 2) * 0.05;
      rig.bodyPivot.position.y = Math.sin(time * 2.4) * 0.02;
      rig.headGroup.rotation.z = Math.sin(time * 1.4) * 0.03;
    }
  } else {
    const tuck = THREE.MathUtils.clamp(-verticalVel * 0.08, -0.35, 0.55);
    rig.leftLeg.rotation.x = 0.38 + tuck;
    rig.rightLeg.rotation.x = -0.18 + tuck * 0.5;
    rig.leftArm.rotation.x = -0.45;
    rig.rightArm.rotation.x = -0.65;
    rig.bodyPivot.position.y = 0;
  }

  const flutterFreq = isGrounded ? (speedRatio > 0.1 ? 14 : 6.5) : 28;
  const flutterAmp = isGrounded ? 0.22 : 0.58;
  const flap = Math.sin(time * flutterFreq) * flutterAmp;
  rig.wingLeftTop.rotation.y = Math.PI - 0.42 - flap;
  rig.wingRightTop.rotation.y = 0.42 + flap;
  rig.wingLeftBottom.rotation.y = Math.PI - 0.56 - flap * 0.85;
  rig.wingRightBottom.rotation.y = 0.56 + flap * 0.85;

  rig.wispPivot.rotation.y = time * 1.9;
  rig.wispPivot.position.y = 1.12 + Math.sin(time * 3.1) * 0.12;

  const glowMat = rig.wandGlow.material as THREE.MeshStandardMaterial;
  glowMat.emissiveIntensity = (hasBlessing ? 2.4 : 1.55) + Math.sin(time * 4.5) * 0.35;
}

export function createNpcModel(
  id: NpcId,
  contactShadowTex: THREE.CanvasTexture,
): { group: THREE.Group; headGroup: THREE.Group; indicatorMesh: THREE.Mesh } {
  const group = new THREE.Group();

  const palette: Record<NpcId, { robe: number; trim: number; hat: number; accent: number; skin: number }> = {
    elwin: { robe: 0x2e5e4e, trim: 0xd4b46a, hat: 0x4b7f52, accent: 0x6ee7b7, skin: 0xf7dcc9 },
    lillian: { robe: 0x8f4d6e, trim: 0xf9a8d4, hat: 0xfde047, accent: 0xf9a8d4, skin: 0xfde2cf },
    chestnut: { robe: 0x7c482b, trim: 0xfbbf24, hat: 0x9b5531, accent: 0xfbbf24, skin: 0xf6d5be },
    orion: { robe: 0x323b6e, trim: 0x93c5fd, hat: 0x242b52, accent: 0x93c5fd, skin: 0xf5dbcb },
  };
  const colors = palette[id];

  const robeMat = new THREE.MeshStandardMaterial({ color: colors.robe, roughness: 0.78, metalness: 0.04 });
  const trimMat = new THREE.MeshStandardMaterial({ color: colors.trim, roughness: 0.35, metalness: 0.55 });
  const hatMat = new THREE.MeshStandardMaterial({ color: colors.hat, roughness: 0.72, metalness: 0.05 });
  const skinMat = new THREE.MeshStandardMaterial({ color: colors.skin, roughness: 0.72, metalness: 0.0 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.2 });
  const catchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  const robePoints = [
    new THREE.Vector2(0.01, 0),
    new THREE.Vector2(0.4, 0.02),
    new THREE.Vector2(0.32, 0.45),
    new THREE.Vector2(0.24, 0.95),
    new THREE.Vector2(0.0, 1.0),
  ];
  const robe = new THREE.Mesh(new THREE.LatheGeometry(robePoints, 18), robeMat);
  robe.castShadow = true;
  robe.receiveShadow = true;
  group.add(robe);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 8, 20), trimMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 0.55;
  group.add(belt);

  const shawl = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.34, 0.2, 14), trimMat);
  shawl.position.y = 0.92;
  shawl.castShadow = true;
  group.add(shawl);

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.28, 6, 8), robeMat);
    arm.position.set(side * 0.28, 0.78, 0.06);
    arm.rotation.z = side * 0.28;
    arm.rotation.x = -0.35;
    arm.castShadow = true;
    group.add(arm);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
    hand.position.set(side * 0.34, 0.62, 0.16);
    group.add(hand);
  }

  const headGroup = new THREE.Group();
  headGroup.position.y = 1.05;
  group.add(headGroup);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 16), skinMat);
  head.position.y = 0.2;
  head.castShadow = true;
  headGroup.add(head);

  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), eyeMat);
    eye.position.set(side * 0.085, 0.2, 0.21);
    headGroup.add(eye);

    const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.01, 6, 6), catchlightMat);
    catchlight.position.set(side * 0.075, 0.212, 0.228);
    headGroup.add(catchlight);

    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.2, 8), skinMat);
    ear.position.set(side * 0.245, 0.21, 0);
    ear.rotation.z = -side * (Math.PI / 2 - 0.3);
    headGroup.add(ear);
  }

  if (id === 'elwin') {
    const beardMat = new THREE.MeshStandardMaterial({ color: 0xe8edf0, roughness: 0.82 });
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 10), beardMat);
    beard.position.set(0, 0.02, 0.18);
    beard.rotation.x = Math.PI - 0.2;
    headGroup.add(beard);

    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.06, 16), hatMat);
    brim.position.y = 0.38;
    brim.castShadow = true;
    headGroup.add(brim);

    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.4, 14), hatMat);
    crown.position.y = 0.58;
    crown.castShadow = true;
    headGroup.add(crown);

    const staff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.038, 1.55, 8),
      new THREE.MeshStandardMaterial({ color: 0x5c3c24, roughness: 0.78 }),
    );
    staff.position.set(0.42, 0.78, 0.18);
    staff.castShadow = true;
    group.add(staff);

    const orb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.11, 0),
      new THREE.MeshStandardMaterial({ color: 0xa7f3d0, emissive: 0x34d399, emissiveIntensity: 1.5, roughness: 0.15 }),
    );
    orb.position.set(0.42, 1.62, 0.18);
    group.add(orb);
  } else if (id === 'lillian') {
    const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.04, 8, 18), robeMat);
    crownRing.rotation.x = Math.PI / 2;
    crownRing.position.y = 0.38;
    headGroup.add(crownRing);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const flower = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.06, 0),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0xf9a8d4 : 0xfef08a, roughness: 0.5 }),
      );
      flower.position.set(Math.cos(a) * 0.21, 0.41, Math.sin(a) * 0.21);
      headGroup.add(flower);
    }

    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.13, 0.22, 10),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.75 }),
    );
    can.position.set(0.36, 0.55, 0.22);
    group.add(can);
  } else if (id === 'chestnut') {
    const apron = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.48, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85 }),
    );
    apron.position.set(0, 0.45, 0.28);
    group.add(apron);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hatMat);
    cap.position.y = 0.24;
    headGroup.add(cap);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.14, 8), trimMat);
    stem.position.y = 0.52;
    headGroup.add(stem);

    const ladle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.75, 8), trimMat);
    ladle.position.set(0.35, 0.68, 0.22);
    ladle.rotation.x = 0.4;
    group.add(ladle);
  } else if (id === 'orion') {
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.48, 12), hatMat);
    hat.position.set(0, 0.52, -0.02);
    hat.rotation.x = -0.15;
    headGroup.add(hat);

    const bookCover = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.04, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 }),
    );
    bookCover.position.set(-0.38, 1.02, 0.35);
    bookCover.rotation.set(0.35, 0.3, 0);
    group.add(bookCover);

    const pages = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.03, 0.2),
      new THREE.MeshStandardMaterial({ color: 0xfefce8, emissive: 0x93c5fd, emissiveIntensity: 0.25, roughness: 0.8 }),
    );
    pages.position.set(-0.38, 1.05, 0.35);
    pages.rotation.set(0.35, 0.3, 0);
    group.add(pages);
  }

  const indicatorMat = new THREE.MeshStandardMaterial({
    color: colors.accent,
    emissive: colors.accent,
    emissiveIntensity: 1.4,
    roughness: 0.15,
    metalness: 0.2,
  });
  const indicatorMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), indicatorMat);
  indicatorMesh.position.y = 2.05;
  group.add(indicatorMesh);

  const shadowGeo = new THREE.PlaneGeometry(1.1, 1.1);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({ map: contactShadowTex, transparent: true, depthWrite: false, opacity: 0.42 }),
  );
  shadow.position.y = 0.025;
  group.add(shadow);

  return { group, headGroup, indicatorMesh };
}

export function createCottageExterior(textures: TextureBundle): THREE.Group {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({ map: textures.cobble, roughness: 0.88, metalness: 0.04 });
  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xeadbc3, roughness: 0.84, metalness: 0.02 });
  const woodMat = new THREE.MeshStandardMaterial({ map: textures.warmWood, roughness: 0.68, metalness: 0.06 });
  const capMat = new THREE.MeshStandardMaterial({ map: textures.mushroomCap, roughness: 0.62, metalness: 0.04 });
  const glowWindowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.25, metalness: 0.85 });

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(3.45, 3.65, 0.6, 16), stoneMat);
  plinth.position.y = 0.3;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);

  const wall = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.3, 2.7, 16), plasterMat);
  wall.position.y = 1.95;
  wall.castShadow = true;
  wall.receiveShadow = true;
  group.add(wall);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.35;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.72, 0.22), woodMat);
    beam.position.set(Math.cos(a) * 3.16, 1.95, Math.sin(a) * 3.16);
    beam.rotation.y = -a;
    beam.castShadow = true;
    group.add(beam);
  }

  const roofPts = [
    new THREE.Vector2(0.0, 2.4),
    new THREE.Vector2(1.4, 2.35),
    new THREE.Vector2(2.8, 1.95),
    new THREE.Vector2(3.95, 1.05),
    new THREE.Vector2(4.25, 0.25),
    new THREE.Vector2(3.9, 0.0),
    new THREE.Vector2(0.0, 0.0),
  ];
  const roof = new THREE.Mesh(new THREE.LatheGeometry(roofPts, 24), capMat);
  roof.position.y = 3.2;
  roof.castShadow = true;
  roof.receiveShadow = true;
  group.add(roof);

  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.54, 1.8, 8), stoneMat);
  chimney.position.set(-1.6, 5.1, -1.1);
  chimney.castShadow = true;
  group.add(chimney);

  for (const angle of [0.85, -0.85, Math.PI * 0.72, -Math.PI * 0.72]) {
    const winGroup = new THREE.Group();
    winGroup.position.set(Math.sin(angle) * 3.2, 2.0, Math.cos(angle) * 3.2);
    winGroup.rotation.y = angle;

    const frame = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 8, 16), woodMat);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.38, 16), glowWindowMat);
    glass.position.z = 0.02;
    winGroup.add(frame, glass);
    group.add(winGroup);
  }

  const porch = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.45, 1.45), woodMat);
  porch.position.set(0, 0.225, 3.6);
  porch.castShadow = true;
  porch.receiveShadow = true;
  group.add(porch);

  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.15, 0.32), woodMat);
  doorFrame.position.set(0, 1.5, 3.18);
  doorFrame.castShadow = true;
  group.add(doorFrame);

  const doorLeaf = new THREE.Mesh(
    new THREE.BoxGeometry(1.16, 1.9, 0.14),
    new THREE.MeshStandardMaterial({ map: textures.woodPlank, roughness: 0.58 }),
  );
  doorLeaf.position.set(0, 1.42, 3.31);
  group.add(doorLeaf);

  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), brassMat);
  handle.position.set(0.38, 1.38, 3.42);
  group.add(handle);

  const lantern = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.18, 0),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 2.0, roughness: 0.2 }),
  );
  lantern.position.set(0.95, 2.45, 3.55);
  group.add(lantern);

  return group;
}

export function createTreehouseExterior(textures: TextureBundle, biome: BiomeId = 'emerald'): THREE.Group {
  const group = new THREE.Group();

  const canopyHex = biome === 'sakura' ? 0xf9a8d4 : biome === 'autumn' ? 0xea580c : 0x3b7a52;
  const canopyTopHex = biome === 'sakura' ? 0xfbcfe8 : biome === 'autumn' ? 0xf59e0b : 0x529b62;

  const barkMat = new THREE.MeshStandardMaterial({ map: textures.bark, roughness: 0.9, metalness: 0.02 });
  const leafMat = new THREE.MeshStandardMaterial({ color: canopyHex, roughness: 0.78, metalness: 0.02 });
  const leafTopMat = new THREE.MeshStandardMaterial({ color: canopyTopHex, roughness: 0.74, metalness: 0.02 });
  const woodMat = new THREE.MeshStandardMaterial({ map: textures.warmWood, roughness: 0.65, metalness: 0.04 });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    emissive: 0x60a5fa,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });

  const trunkPts = [
    new THREE.Vector2(3.4, 0.0),
    new THREE.Vector2(2.75, 1.2),
    new THREE.Vector2(2.45, 3.4),
    new THREE.Vector2(2.65, 5.2),
    new THREE.Vector2(3.15, 6.2),
    new THREE.Vector2(0.0, 6.4),
  ];
  const trunk = new THREE.Mesh(new THREE.LatheGeometry(trunkPts, 18), barkMat);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(a) * 2.2, 1.5, Math.sin(a) * 2.2),
      new THREE.Vector3(Math.cos(a) * 3.3, 0.55, Math.sin(a) * 3.3),
      new THREE.Vector3(Math.cos(a) * 4.2, 0.05, Math.sin(a) * 4.2),
    ]);
    const rootMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.36, 8, false), barkMat);
    rootMesh.castShadow = true;
    rootMesh.receiveShadow = true;
    group.add(rootMesh);
  }

  const canopyOffsets: [number, number, number, number, boolean][] = [
    [0, 7.6, 0, 3.7, false],
    [-2.4, 6.9, 1.4, 2.6, true],
    [2.5, 7.1, -1.2, 2.7, true],
    [0.6, 8.6, 1.6, 2.4, true],
    [-1.4, 8.3, -1.8, 2.3, false],
  ];
  canopyOffsets.forEach(([x, y, z, r, bright]) => {
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), bright ? leafTopMat : leafMat);
    crown.position.set(x, y, z);
    crown.scale.y = 0.72;
    crown.castShadow = true;
    crown.receiveShadow = true;
    group.add(crown);
  });

  const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.55, 0.32, 12), woodMat);
  deck.position.set(-2.5, 1.84, 1.5);
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  const steps: [number, number, number][] = [
    [-4.3, 0.55, -0.3],
    [-3.9, 1.15, 0.75],
  ];
  steps.forEach(([sx, sy, sz]) => {
    const step = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.75, 0.3, 10), woodMat);
    step.position.set(sx, sy - 0.15, sz);
    step.castShadow = true;
    step.receiveShadow = true;
    group.add(step);

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, sy, 8), barkMat);
    post.position.set(sx, sy * 0.5 - 0.15, sz);
    post.castShadow = true;
    group.add(post);
  });

  const doorArch = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.1, 0.45), woodMat);
  doorArch.position.set(-1.95, 3.0, 1.15);
  doorArch.rotation.y = -Math.PI / 3;
  doorArch.castShadow = true;
  group.add(doorArch);

  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.75), glowMat);
  doorGlow.position.set(-2.15, 2.95, 1.28);
  doorGlow.rotation.y = -Math.PI / 3;
  group.add(doorGlow);

  const lantern = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.2, 0),
    new THREE.MeshStandardMaterial({ color: 0xbae6fd, emissive: 0x38bdf8, emissiveIntensity: 2.0, roughness: 0.2 }),
  );
  lantern.position.set(-2.7, 4.1, 1.85);
  group.add(lantern);

  return group;
}

export function createBouncyMushroom(textures: TextureBundle): { group: THREE.Group; cap: THREE.Mesh } {
  const group = new THREE.Group();

  const stemMat = new THREE.MeshStandardMaterial({ color: 0xf7edd5, roughness: 0.78 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.55, 12), stemMat);
  stem.position.y = 0.275;
  stem.castShadow = true;
  stem.receiveShadow = true;
  group.add(stem);

  const capMat = new THREE.MeshStandardMaterial({
    map: textures.mushroomCap,
    emissive: 0xef4444,
    emissiveIntensity: 0.24,
    roughness: 0.45,
  });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.95, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), capMat);
  cap.position.y = 0.46;
  cap.scale.y = 0.58;
  cap.castShadow = true;
  cap.receiveShadow = true;
  group.add(cap);

  return { group, cap };
}

export function createDewdropCollectible(): THREE.Group {
  const group = new THREE.Group();

  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: 0xa7f3d0,
    emissive: 0x34d399,
    emissiveIntensity: 1.5,
    roughness: 0.1,
    metalness: 0.1,
    clearcoat: 1.0,
  });
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), crystalMat);
  crystal.scale.set(0.85, 1.35, 0.85);
  crystal.position.y = 0.52;
  group.add(crystal);

  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xfde68a,
    emissive: 0xfbbf24,
    emissiveIntensity: 1.1,
    roughness: 0.25,
    metalness: 0.7,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.025, 8, 24), ringMat);
  ring.position.y = 0.52;
  ring.rotation.x = Math.PI / 3;
  group.add(ring);

  return group;
}

export function createInstancedForestGrove(
  barkTex: THREE.CanvasTexture,
  groundHeightAt: (x: number, z: number) => number,
  biome: BiomeId = 'emerald',
  extraFlowers = false,
): THREE.Group {
  const grove = new THREE.Group();

  const treePositions: [number, number, number][] = [];
  for (let i = 0; i < 48; i++) {
    const angle = (i / 48) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
    const dist = 21 + Math.random() * 14;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    treePositions.push([x, z, 0.85 + Math.random() * 0.4]);
  }
  const innerSpots: [number, number][] = [
    [-14, 4],
    [-13, -11],
    [13, -10],
    [15, 2],
    [4, -15],
    [-4, 16],
    [10, 15],
  ];
  innerSpots.forEach(([x, z]) => treePositions.push([x, z, 0.85 + Math.random() * 0.3]));

  const count = treePositions.length;
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.42, 3.2, 8);
  trunkGeo.translate(0, 1.6, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.9 });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
  trunks.castShadow = true;
  trunks.receiveShadow = true;

  const crownLowGeo = new THREE.ConeGeometry(1.75, 2.8, 9);
  crownLowGeo.translate(0, 3.8, 0);
  const crownHighGeo = new THREE.ConeGeometry(1.25, 2.3, 9);
  crownHighGeo.translate(0, 5.2, 0);

  const foliageMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  const crownsLow = new THREE.InstancedMesh(crownLowGeo, foliageMat, count);
  const crownsHigh = new THREE.InstancedMesh(crownHighGeo, foliageMat, count);
  crownsLow.castShadow = true;
  crownsHigh.castShadow = true;

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  treePositions.forEach(([x, z, scale], i) => {
    const y = groundHeightAt(x, z) - 0.15;
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(scale, scale * (0.9 + Math.random() * 0.25), scale);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    crownsLow.setMatrixAt(i, dummy.matrix);
    crownsHigh.setMatrixAt(i, dummy.matrix);

    if (biome === 'sakura') {
      tint.setHSL(0.92 + (Math.random() - 0.5) * 0.04, 0.65, 0.72 + Math.random() * 0.1);
    } else if (biome === 'autumn') {
      tint.setHSL(0.08 + (Math.random() - 0.5) * 0.05, 0.78, 0.46 + Math.random() * 0.1);
    } else {
      tint.setHSL(0.36 + (Math.random() - 0.5) * 0.05, 0.42, 0.3 + Math.random() * 0.1);
    }
    crownsLow.setColorAt(i, tint);
    tint.offsetHSL(0.01, 0.03, 0.06);
    crownsHigh.setColorAt(i, tint);
  });

  trunks.instanceMatrix.needsUpdate = true;
  crownsLow.instanceMatrix.needsUpdate = true;
  crownsHigh.instanceMatrix.needsUpdate = true;
  if (crownsLow.instanceColor) crownsLow.instanceColor.needsUpdate = true;
  if (crownsHigh.instanceColor) crownsHigh.instanceColor.needsUpdate = true;
  trunks.computeBoundingSphere();
  crownsLow.computeBoundingSphere();
  crownsHigh.computeBoundingSphere();

  grove.add(trunks, crownsLow, crownsHigh);

  const flowerCount = extraFlowers ? 220 : 95;
  const flowerGeo = new THREE.DodecahedronGeometry(extraFlowers ? 0.18 : 0.14, 0);
  flowerGeo.translate(0, 0.18, 0);
  const flowerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: extraFlowers ? 0x334433 : 0x223322,
    roughness: 0.52,
  });
  const flowers = new THREE.InstancedMesh(flowerGeo, flowerMat, flowerCount);

  const flowerPalette =
    biome === 'sakura'
      ? [0xfbcfe8, 0xf9a8d4, 0xfef08a, 0xffffff]
      : biome === 'autumn'
        ? [0xfbbf24, 0xfb923c, 0xfde047, 0xf87171]
        : [0x93c5fd, 0xfde047, 0xf9a8d4, 0xd8b4fe];

  for (let i = 0; i < flowerCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 4.2 + Math.random() * 16.5;
    const fx = Math.cos(a) * r;
    const fz = Math.sin(a) * r;
    const fy = groundHeightAt(fx, fz);
    dummy.position.set(fx, fy, fz);
    dummy.rotation.set(0, Math.random() * Math.PI, 0);
    dummy.scale.setScalar(0.85 + Math.random() * 0.35);
    dummy.updateMatrix();
    flowers.setMatrixAt(i, dummy.matrix);
    tint.setHex(flowerPalette[i % flowerPalette.length]);
    flowers.setColorAt(i, tint);
  }
  flowers.instanceMatrix.needsUpdate = true;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  flowers.computeBoundingSphere();
  grove.add(flowers);

  return grove;
}
