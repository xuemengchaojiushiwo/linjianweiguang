import type * as THREE from 'three';

export type ZoneId = 'glade' | 'apothecary' | 'library';

export type NpcId = 'elwin' | 'lillian' | 'chestnut' | 'orion';

export interface DialogueChoice {
  label: string;
  nextNodeId?: string;
  grantBlessing?: boolean;
  close?: boolean;
}

export interface DialogueNode {
  id: string;
  text: string;
  choices?: DialogueChoice[];
  nextNodeId?: string;
}

export interface NpcProfile {
  id: NpcId;
  name: string;
  title: string;
  zone: ZoneId;
  accentHex: string;
  greetingNodeId: string;
  nodes: Record<string, DialogueNode>;
}

export interface NpcInstance {
  id: NpcId;
  zone: ZoneId;
  group: THREE.Group;
  headGroup: THREE.Object3D;
  indicatorMesh: THREE.Mesh;
  position: THREE.Vector3;
  baseYaw: number;
  talkRadius: number;
}

export interface CylinderCollider {
  kind: 'cylinder';
  x: number;
  z: number;
  radius: number;
  minY: number;
  maxY: number;
}

export interface BoxCollider {
  kind: 'box';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

export type WorldCollider = CylinderCollider | BoxCollider;

export interface WalkablePlatform {
  kind: 'box' | 'disc';
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  x?: number;
  z?: number;
  radius?: number;
  topY: number;
  materialKind: 'wood' | 'stone' | 'moss';
}

export interface DoorPortal {
  id: string;
  label: string;
  fromZone: ZoneId;
  toZone: ZoneId;
  position: THREE.Vector3;
  spawnPosition: THREE.Vector3;
  spawnYaw: number;
  triggerRadius: number;
  glowRing: THREE.Mesh;
}

export interface BounceMushroom {
  position: THREE.Vector3;
  radius: number;
  capMesh: THREE.Object3D;
  boostVelocity: number;
  bounceAnim: number;
}

export interface DewdropItem {
  id: string;
  zone: ZoneId;
  position: THREE.Vector3;
  group: THREE.Group;
  collected: boolean;
}

export interface ProximityTarget {
  type: 'npc' | 'door';
  id: string;
  label: string;
  sublabel: string;
}

export interface GameHudState {
  zone: ZoneId;
  zoneName: string;
  dewdropsCollected: number;
  totalDewdrops: number;
  hasWingBlessing: boolean;
  proximityTarget: ProximityTarget | null;
  activeDialogue: {
    npcId: NpcId;
    npcName: string;
    npcTitle: string;
    accentHex: string;
    node: DialogueNode;
  } | null;
  isTransitioning: boolean;
  visitedRooms: ZoneId[];
  talkedNpcs: NpcId[];
}

export type SpriteThemeId = 'emerald' | 'sakura' | 'starlight' | 'amber';
export type HairHatStyleId = 'leaf_cap' | 'flower_crown' | 'star_hat';
export type WingStyleId = 'butterfly' | 'leaf' | 'star';
export type WandStyleId = 'crystal_wand' | 'lantern_wand' | 'blossom_wand';

export type TimeOfDayId = 'morning' | 'sunset' | 'night';
export type BiomeId = 'emerald' | 'sakura' | 'autumn';
export type LayoutPresetId = 'classic' | 'plaza_pair' | 'parkour';
export type WorldSurpriseId = 'extra_mushrooms' | 'extra_fireflies' | 'extra_flowers';

export interface CharacterCreationConfig {
  theme: SpriteThemeId;
  hairHat: HairHatStyleId;
  wings: WingStyleId;
  wand: WandStyleId;
}

export interface MapCreationConfig {
  timeOfDay: TimeOfDayId;
  biome: BiomeId;
  layout: LayoutPresetId;
  surprise: WorldSurpriseId;
}

export interface WorldCreationConfig {
  character: CharacterCreationConfig;
  map: MapCreationConfig;
}

export const DEFAULT_CREATION_CONFIG: WorldCreationConfig = {
  character: {
    theme: 'emerald',
    hairHat: 'leaf_cap',
    wings: 'butterfly',
    wand: 'crystal_wand',
  },
  map: {
    timeOfDay: 'morning',
    biome: 'emerald',
    layout: 'classic',
    surprise: 'extra_fireflies',
  },
};
