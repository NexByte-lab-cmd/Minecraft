import * as THREE from 'three';
import { addItem, I } from '../items/registry';
import type { RealmId } from '../network/commands';

export type SkinFeatureStyle =
  | 'sunny'
  | 'kai'
  | 'makena'
  | 'steve'
  | 'alex'
  | 'zuri'
  | 'efe'
  | 'ari'
  | 'noor'
  | 'darktitan';

export interface PlayerSkin {
  id: string;
  name: string;
  style: SkinFeatureStyle;
  tagline: string;
  skin: string;
  hair: string;
  shirt: string;
  accent: string;
  pants: string;
  eyeColor: string;
  bionicLeftArm?: boolean;
  cape?: string;
}

export const PLAYER_SKINS: PlayerSkin[] = [
  {
    id: 'sunny',
    name: 'Sunny',
    style: 'sunny',
    tagline: 'Bionic Arm · Overalls',
    skin: '#d99e73',
    hair: '#1e1f24',
    shirt: '#6eb043',
    accent: '#2c68c9',
    pants: '#2c68c9',
    eyeColor: '#1f2836',
    bionicLeftArm: true,
  },
  {
    id: 'kai',
    name: 'Kai',
    style: 'kai',
    tagline: 'Martial Robe · Blonde',
    skin: '#f0c097',
    hair: '#f2df68',
    shirt: '#2a2238',
    accent: '#d43f52',
    pants: '#1c1824',
    eyeColor: '#2a5a8a',
  },
  {
    id: 'makena',
    name: 'Makena',
    style: 'makena',
    tagline: 'Patterned Knit · Coral',
    skin: '#54372a',
    hair: '#141010',
    shirt: '#ebba34',
    accent: '#8f471e',
    pants: '#c4585c',
    eyeColor: '#1a1210',
  },
  {
    id: 'steve',
    name: 'Steve',
    style: 'steve',
    tagline: 'Classic Hero · Goatee',
    skin: '#c48d62',
    hair: '#3b2618',
    shirt: '#1ca6bd',
    accent: '#158296',
    pants: '#3a36a1',
    eyeColor: '#3f5296',
  },
  {
    id: 'alex',
    name: 'Alex',
    style: 'alex',
    tagline: 'Side Ponytail · Ranger',
    skin: '#f2ccb0',
    hair: '#db7632',
    shirt: '#70b854',
    accent: '#4d3a2c',
    pants: '#4d3a2c',
    eyeColor: '#377332',
  },
  {
    id: 'zuri',
    name: 'Zuri',
    style: 'zuri',
    tagline: 'Crimson Polo · Cargo',
    skin: '#6e452e',
    hair: '#171515',
    shirt: '#c93848',
    accent: '#f0ece6',
    pants: '#d1c2a3',
    eyeColor: '#181414',
  },
  {
    id: 'efe',
    name: 'Efe',
    style: 'efe',
    tagline: 'Amethyst Bob · Gold Trim',
    skin: '#bd845e',
    hair: '#965cc9',
    shirt: '#99d4de',
    accent: '#ebc042',
    pants: '#281c2e',
    eyeColor: '#4c3463',
  },
  {
    id: 'ari',
    name: 'Ari',
    style: 'ari',
    tagline: 'Copper Braid · Teal',
    skin: '#eab694',
    hair: '#9e4724',
    shirt: '#e3a239',
    accent: '#236d7d',
    pants: '#236d7d',
    eyeColor: '#2a5963',
  },
  {
    id: 'noor',
    name: 'Noor',
    style: 'noor',
    tagline: 'Dreads · Crimson Jacket',
    skin: '#a36446',
    hair: '#241410',
    shirt: '#bd372d',
    accent: '#1b1d22',
    pants: '#1c7862',
    eyeColor: '#1d1614',
  },
  {
    id: 'darktitan',
    name: 'DarkTitan',
    style: 'darktitan',
    tagline: 'Shadow Cloak · Titan',
    skin: '#3b2f34',
    hair: '#1a151b',
    shirt: '#211f24',
    accent: '#c92620',
    pants: '#17161c',
    eyeColor: '#ff4238',
    cape: '#c92620',
  },
];

export type MobGroup = 'Companions' | 'Wildlife' | 'Aquatic' | 'Neutral' | 'Hostile' | 'Bosses';
export type MobBodyType = 'person' | 'quad' | 'horse' | 'cat' | 'bird' | 'fish' | 'stalker' | 'spider' | 'float' | 'blob' | 'blaze' | 'wither' | 'dragon' | 'bee';
export type MobPolicy = 'passive' | 'companion' | 'mount' | 'aquatic' | 'neutral' | 'chaser' | 'ranged' | 'creeper' | 'boss';

export interface MobDef {
  key: string;
  name: string;
  group: MobGroup;
  body: MobBodyType;
  policy: MobPolicy;
  realm: RealmId;
  color: string;
  accent: string;
  eyeColor?: string;
  hp: number;
  damage: number;
  speed: number;
  scale: number;
  width: number;
  height: number;
  fly?: boolean;
  water?: boolean;
  tameItem?: number;
  burnsInSun?: boolean;
  drops: Array<[number, number, number]>;
  xp: number;
  eggId: number;
}

export const MOB_CATALOG: MobDef[] = [];
export const MOBS_BY_KEY: Record<string, MobDef> = {};

function regMob(def: Omit<MobDef, 'eggId'>): MobDef {
  const eggId = addItem({
    key: `egg_${def.key}`,
    name: `${def.name} Spawn Egg`,
    category: 'eggs',
    color: def.accent,
    icon: 'egg',
    spawnMob: def.key,
  });
  const full: MobDef = { ...def, eggId };
  MOB_CATALOG.push(full);
  MOBS_BY_KEY[def.key] = full;
  return full;
}

// Tameable Pets & Rideable Companions
regMob({ key: 'wolf', name: 'Wolf', group: 'Companions', body: 'quad', policy: 'companion', realm: 'overworld', color: '#cfc8be', accent: '#d63e36', hp: 16, damage: 4, speed: 3.4, scale: 0.95, width: 0.7, height: 0.9, tameItem: I.bone, drops: [[I.bone, 1, 2]], xp: 3 });
regMob({ key: 'cat', name: 'Cat', group: 'Companions', body: 'cat', policy: 'companion', realm: 'overworld', color: '#d49a52', accent: '#f2e0c4', hp: 12, damage: 2, speed: 3.2, scale: 0.72, width: 0.6, height: 0.7, drops: [[I.wheat, 0, 1]], xp: 2 });
regMob({ key: 'parrot', name: 'Parrot', group: 'Companions', body: 'bird', policy: 'companion', realm: 'overworld', color: '#cf4238', accent: '#3f76cc', hp: 8, damage: 0, speed: 3.6, scale: 0.75, width: 0.5, height: 0.8, fly: true, drops: [[I.wheat, 1, 1]], xp: 2 });
regMob({ key: 'allay', name: 'Allay', group: 'Companions', body: 'bird', policy: 'companion', realm: 'overworld', color: '#58c9ff', accent: '#a8f8ff', hp: 14, damage: 0, speed: 3.8, scale: 0.72, width: 0.5, height: 0.8, fly: true, drops: [[I.amethyst_shard, 1, 1]], xp: 3 });
regMob({ key: 'axolotl', name: 'Axolotl', group: 'Companions', body: 'fish', policy: 'aquatic', realm: 'overworld', color: '#f29eb8', accent: '#d64b7c', hp: 14, damage: 2, speed: 2.8, scale: 0.7, width: 0.6, height: 0.5, water: true, drops: [[I.raw_beef, 0, 1]], xp: 2 });
regMob({ key: 'fox', name: 'Fox', group: 'Companions', body: 'cat', policy: 'passive', realm: 'overworld', color: '#d96932', accent: '#f5ead8', hp: 12, damage: 2, speed: 3.5, scale: 0.85, width: 0.6, height: 0.7, drops: [[I.sweet_berries, 1, 2]], xp: 2 });

// Rideable Mounts
regMob({ key: 'horse', name: 'Horse', group: 'Companions', body: 'horse', policy: 'mount', realm: 'overworld', color: '#8f603e', accent: '#3d3026', hp: 24, damage: 0, speed: 4.5, scale: 1.28, width: 1.1, height: 1.6, drops: [[I.raw_beef, 1, 2]], xp: 3 });
regMob({ key: 'donkey', name: 'Donkey', group: 'Companions', body: 'horse', policy: 'mount', realm: 'overworld', color: '#857b72', accent: '#dbd2c3', hp: 22, damage: 0, speed: 3.8, scale: 1.12, width: 1.0, height: 1.5, drops: [[I.raw_beef, 1, 1]], xp: 3 });
regMob({ key: 'mule', name: 'Mule', group: 'Companions', body: 'horse', policy: 'mount', realm: 'overworld', color: '#6b4d38', accent: '#a88462', hp: 22, damage: 0, speed: 4.0, scale: 1.15, width: 1.0, height: 1.5, drops: [[I.raw_beef, 1, 1]], xp: 3 });
regMob({ key: 'camel', name: 'Camel', group: 'Companions', body: 'horse', policy: 'mount', realm: 'overworld', color: '#d4a76a', accent: '#b5844a', hp: 30, damage: 0, speed: 4.2, scale: 1.45, width: 1.2, height: 2.1, drops: [[I.raw_beef, 1, 2]], xp: 4 });
regMob({ key: 'llama', name: 'Llama', group: 'Companions', body: 'horse', policy: 'mount', realm: 'overworld', color: '#d9c6b0', accent: '#5680b8', hp: 20, damage: 1, speed: 3.4, scale: 1.2, width: 0.9, height: 1.8, drops: [[I.raw_beef, 1, 1]], xp: 3 });
regMob({ key: 'strider', name: 'Strider', group: 'Companions', body: 'quad', policy: 'mount', realm: 'nether', color: '#9e3e3b', accent: '#e08d6c', hp: 20, damage: 0, speed: 3.4, scale: 1.15, width: 0.9, height: 1.4, drops: [[I.blaze_rod, 0, 1]], xp: 4 });
regMob({ key: 'skeleton_horse', name: 'Skeleton Horse', group: 'Companions', body: 'horse', policy: 'mount', realm: 'overworld', color: '#d4d9cc', accent: '#8e9688', hp: 20, damage: 0, speed: 4.6, scale: 1.24, width: 1.0, height: 1.6, drops: [[I.bone, 1, 3]], xp: 4 });

// Farm & Wildlife
regMob({ key: 'cow', name: 'Cow', group: 'Wildlife', body: 'quad', policy: 'passive', realm: 'overworld', color: '#593b2a', accent: '#ede6d8', hp: 12, damage: 0, speed: 1.8, scale: 1.15, width: 0.9, height: 1.4, drops: [[I.raw_beef, 1, 3]], xp: 2 });
regMob({ key: 'mooshroom', name: 'Mooshroom', group: 'Wildlife', body: 'quad', policy: 'passive', realm: 'overworld', color: '#b53c3c', accent: '#f2e8dc', hp: 12, damage: 0, speed: 1.8, scale: 1.15, width: 0.9, height: 1.4, drops: [[I.raw_beef, 1, 2]], xp: 2 });
regMob({ key: 'pig', name: 'Pig', group: 'Wildlife', body: 'quad', policy: 'mount', realm: 'overworld', color: '#f09ca8', accent: '#d67483', hp: 10, damage: 0, speed: 2.0, scale: 0.92, width: 0.8, height: 0.95, drops: [[I.raw_beef, 1, 2]], xp: 2 });
regMob({ key: 'sheep', name: 'Sheep', group: 'Wildlife', body: 'quad', policy: 'passive', realm: 'overworld', color: '#ebeae1', accent: '#c9a68b', hp: 10, damage: 0, speed: 1.8, scale: 1.05, width: 0.9, height: 1.3, drops: [[I.raw_beef, 1, 2]], xp: 2 });
regMob({ key: 'chicken', name: 'Chicken', group: 'Wildlife', body: 'bird', policy: 'passive', realm: 'overworld', color: '#f2efe4', accent: '#d43d39', hp: 6, damage: 0, speed: 2.1, scale: 0.65, width: 0.5, height: 0.75, drops: [[I.raw_beef, 1, 1]], xp: 1 });
regMob({ key: 'rabbit', name: 'Rabbit', group: 'Wildlife', body: 'cat', policy: 'passive', realm: 'overworld', color: '#a8845c', accent: '#e8dcc5', hp: 6, damage: 0, speed: 3.1, scale: 0.58, width: 0.45, height: 0.6, drops: [[I.raw_beef, 1, 1]], xp: 1 });
regMob({ key: 'goat', name: 'Goat', group: 'Wildlife', body: 'quad', policy: 'passive', realm: 'overworld', color: '#dad6c3', accent: '#8f8878', hp: 12, damage: 2, speed: 2.5, scale: 1.0, width: 0.8, height: 1.2, drops: [[I.raw_beef, 1, 1]], xp: 2 });
regMob({ key: 'frog', name: 'Frog', group: 'Wildlife', body: 'blob', policy: 'passive', realm: 'overworld', color: '#6ea84c', accent: '#e0c76e', hp: 10, damage: 0, speed: 2.2, scale: 0.55, width: 0.5, height: 0.5, drops: [[I.sweet_berries, 0, 1]], xp: 1 });
regMob({ key: 'turtle', name: 'Turtle', group: 'Wildlife', body: 'quad', policy: 'passive', realm: 'overworld', color: '#398f5c', accent: '#9bb564', hp: 20, damage: 0, speed: 1.2, scale: 0.8, width: 0.9, height: 0.6, drops: [[I.wheat, 0, 1]], xp: 2 });
regMob({ key: 'armadillo', name: 'Armadillo', group: 'Wildlife', body: 'quad', policy: 'passive', realm: 'overworld', color: '#ad7a65', accent: '#d49d80', hp: 12, damage: 0, speed: 1.7, scale: 0.65, width: 0.6, height: 0.6, drops: [[I.bone, 0, 1]], xp: 2 });
regMob({ key: 'sniffer', name: 'Sniffer', group: 'Wildlife', body: 'quad', policy: 'passive', realm: 'overworld', color: '#a34848', accent: '#7da64e', hp: 20, damage: 0, speed: 1.3, scale: 1.4, width: 1.3, height: 1.5, drops: [[I.wheat, 1, 3]], xp: 4 });
regMob({ key: 'panda', name: 'Panda', group: 'Wildlife', body: 'quad', policy: 'passive', realm: 'overworld', color: '#f0ece4', accent: '#2b2d30', hp: 20, damage: 2, speed: 1.6, scale: 1.18, width: 1.0, height: 1.3, drops: [[I.wheat, 1, 2]], xp: 3 });
regMob({ key: 'polar_bear', name: 'Polar Bear', group: 'Wildlife', body: 'quad', policy: 'neutral', realm: 'overworld', color: '#f0f5f7', accent: '#c5d2d6', hp: 30, damage: 4, speed: 2.3, scale: 1.3, width: 1.1, height: 1.5, drops: [[I.raw_beef, 1, 2]], xp: 3 });
regMob({ key: 'ocelot', name: 'Ocelot', group: 'Wildlife', body: 'cat', policy: 'passive', realm: 'overworld', color: '#e3b24f', accent: '#6e5028', hp: 10, damage: 0, speed: 3.3, scale: 0.78, width: 0.6, height: 0.7, drops: [[I.wheat, 0, 1]], xp: 2 });
regMob({ key: 'bat', name: 'Bat', group: 'Wildlife', body: 'bird', policy: 'passive', realm: 'overworld', color: '#544e5c', accent: '#94786b', hp: 6, damage: 0, speed: 3.2, scale: 0.5, width: 0.4, height: 0.5, fly: true, drops: [[I.coal, 0, 1]], xp: 1 });
regMob({ key: 'sulfur_cube', name: 'Sulfur Cube', group: 'Wildlife', body: 'blob', policy: 'passive', realm: 'overworld', color: '#e0bb3d', accent: '#ffe169', hp: 14, damage: 0, speed: 2.0, scale: 0.85, width: 0.8, height: 0.8, drops: [[I.gold_ingot, 0, 1]], xp: 3 });
regMob({ key: 'villager', name: 'Villager', group: 'Wildlife', body: 'person', policy: 'passive', realm: 'overworld', color: '#7d5b44', accent: '#bd8a68', hp: 20, damage: 0, speed: 2.1, scale: 1.02, width: 0.6, height: 1.9, drops: [[I.emerald, 0, 2]], xp: 3 });
regMob({ key: 'wandering_trader', name: 'Wandering Trader', group: 'Wildlife', body: 'person', policy: 'passive', realm: 'overworld', color: '#395a8f', accent: '#bd8a68', hp: 20, damage: 0, speed: 2.2, scale: 1.02, width: 0.6, height: 1.9, drops: [[I.emerald, 1, 2]], xp: 4 });
regMob({ key: 'iron_golem', name: 'Iron Golem', group: 'Wildlife', body: 'person', policy: 'neutral', realm: 'overworld', color: '#c4c7be', accent: '#648f4f', hp: 80, damage: 10, speed: 1.9, scale: 1.48, width: 1.1, height: 2.6, drops: [[I.iron_ingot, 3, 5]], xp: 8 });
regMob({ key: 'snow_golem', name: 'Snow Golem', group: 'Wildlife', body: 'person', policy: 'passive', realm: 'overworld', color: '#eef5f7', accent: '#d9832b', hp: 10, damage: 1, speed: 2.0, scale: 1.0, width: 0.7, height: 1.8, drops: [[I.wheat, 0, 1]], xp: 2 });
regMob({ key: 'bee', name: 'Bee', group: 'Wildlife', body: 'bee', policy: 'neutral', realm: 'overworld', color: '#f0b83a', accent: '#3d2c1c', hp: 10, damage: 2, speed: 3.1, scale: 0.55, width: 0.5, height: 0.5, fly: true, drops: [[I.honeycomb, 1, 2]], xp: 2 });

// Aquatic
regMob({ key: 'cod', name: 'Cod', group: 'Aquatic', body: 'fish', policy: 'aquatic', realm: 'overworld', color: '#b5a06e', accent: '#e0cd99', hp: 4, damage: 0, speed: 2.5, scale: 0.6, width: 0.5, height: 0.4, water: true, drops: [[I.raw_beef, 1, 1]], xp: 1 });
regMob({ key: 'salmon', name: 'Salmon', group: 'Aquatic', body: 'fish', policy: 'aquatic', realm: 'overworld', color: '#a8474c', accent: '#628562', hp: 4, damage: 0, speed: 2.7, scale: 0.68, width: 0.5, height: 0.4, water: true, drops: [[I.raw_beef, 1, 1]], xp: 1 });
regMob({ key: 'pufferfish', name: 'Pufferfish', group: 'Aquatic', body: 'blob', policy: 'aquatic', realm: 'overworld', color: '#e6b84c', accent: '#f5e0a3', hp: 6, damage: 2, speed: 2.0, scale: 0.6, width: 0.5, height: 0.5, water: true, drops: [[I.raw_beef, 1, 1]], xp: 2 });
regMob({ key: 'tropical_fish', name: 'Tropical Fish', group: 'Aquatic', body: 'fish', policy: 'aquatic', realm: 'overworld', color: '#f07137', accent: '#69c6d6', hp: 4, damage: 0, speed: 2.8, scale: 0.58, width: 0.4, height: 0.4, water: true, drops: [[I.raw_beef, 1, 1]], xp: 1 });
regMob({ key: 'squid', name: 'Squid', group: 'Aquatic', body: 'float', policy: 'aquatic', realm: 'overworld', color: '#455c85', accent: '#758cb8', hp: 10, damage: 0, speed: 2.0, scale: 0.8, width: 0.7, height: 0.9, water: true, drops: [[I.coal, 1, 2]], xp: 2 });
regMob({ key: 'glow_squid', name: 'Glow Squid', group: 'Aquatic', body: 'float', policy: 'aquatic', realm: 'overworld', color: '#39ada6', accent: '#9af5e3', hp: 10, damage: 0, speed: 2.0, scale: 0.8, width: 0.7, height: 0.9, water: true, drops: [[I.amethyst_shard, 1, 2]], xp: 3 });
regMob({ key: 'dolphin', name: 'Dolphin', group: 'Aquatic', body: 'fish', policy: 'aquatic', realm: 'overworld', color: '#84a2b8', accent: '#c9d7e0', hp: 14, damage: 2, speed: 3.8, scale: 1.05, width: 0.8, height: 0.7, water: true, drops: [[I.raw_beef, 1, 1]], xp: 3 });

// Neutral
regMob({ key: 'enderman', name: 'Enderman', group: 'Neutral', body: 'person', policy: 'neutral', realm: 'end', color: '#1b1724', accent: '#231f2e', eyeColor: '#d96bff', hp: 40, damage: 6, speed: 3.4, scale: 1.48, width: 0.7, height: 2.8, drops: [[I.ender_pearl, 1, 2]], xp: 6 });
regMob({ key: 'piglin', name: 'Piglin', group: 'Neutral', body: 'person', policy: 'neutral', realm: 'nether', color: '#b58458', accent: '#db9a8e', hp: 18, damage: 4, speed: 2.7, scale: 1.0, width: 0.6, height: 1.85, drops: [[I.gold_ingot, 1, 2]], xp: 5 });
regMob({ key: 'zombified_piglin', name: 'Zombified Piglin', group: 'Neutral', body: 'person', policy: 'neutral', realm: 'nether', color: '#7b995e', accent: '#cf8e8c', hp: 20, damage: 5, speed: 2.6, scale: 1.02, width: 0.6, height: 1.85, drops: [[I.gold_ingot, 1, 2]], xp: 5 });

// Hostile Monsters (Overworld, Nether, End)
regMob({ key: 'zombie', name: 'Zombie', group: 'Hostile', body: 'person', policy: 'chaser', realm: 'overworld', color: '#2b918e', accent: '#548c44', eyeColor: '#1a2417', hp: 20, damage: 3, speed: 2.3, scale: 1.0, width: 0.6, height: 1.9, burnsInSun: true, drops: [[I.iron_ingot, 0, 1], [I.bread, 0, 1]], xp: 5 });
regMob({ key: 'husk', name: 'Husk', group: 'Hostile', body: 'person', policy: 'chaser', realm: 'overworld', color: '#8a7659', accent: '#ab9468', hp: 20, damage: 3, speed: 2.3, scale: 1.02, width: 0.6, height: 1.9, drops: [[I.iron_ingot, 0, 1]], xp: 5 });
regMob({ key: 'drowned', name: 'Drowned', group: 'Hostile', body: 'person', policy: 'chaser', realm: 'overworld', color: '#3b7375', accent: '#64b8a4', eyeColor: '#88fff5', hp: 20, damage: 4, speed: 2.2, scale: 1.0, width: 0.6, height: 1.9, water: true, drops: [[I.copper_ingot, 0, 2], [I.trident, 0, 1]], xp: 6 });
regMob({ key: 'zombie_villager', name: 'Zombie Villager', group: 'Hostile', body: 'person', policy: 'chaser', realm: 'overworld', color: '#6e523a', accent: '#5e8c49', hp: 20, damage: 3, speed: 2.2, scale: 1.04, width: 0.6, height: 1.9, burnsInSun: true, drops: [[I.emerald, 0, 1]], xp: 5 });
regMob({ key: 'skeleton', name: 'Skeleton', group: 'Hostile', body: 'person', policy: 'ranged', realm: 'overworld', color: '#c4c7bf', accent: '#dfe3da', eyeColor: '#1e1f1e', hp: 18, damage: 3, speed: 2.3, scale: 1.0, width: 0.6, height: 1.9, burnsInSun: true, drops: [[I.bone, 1, 2], [I.arrow, 1, 3]], xp: 5 });
regMob({ key: 'stray', name: 'Stray', group: 'Hostile', body: 'person', policy: 'ranged', realm: 'overworld', color: '#587485', accent: '#b7c8cf', hp: 18, damage: 3, speed: 2.3, scale: 1.02, width: 0.6, height: 1.9, burnsInSun: true, drops: [[I.bone, 1, 2], [I.arrow, 1, 2]], xp: 5 });
regMob({ key: 'bogged', name: 'Bogged', group: 'Hostile', body: 'person', policy: 'ranged', realm: 'overworld', color: '#597049', accent: '#8ca16b', hp: 16, damage: 3, speed: 2.2, scale: 1.02, width: 0.6, height: 1.9, burnsInSun: true, drops: [[I.bone, 1, 2]], xp: 5 });
regMob({ key: 'phantom', name: 'Phantom', group: 'Hostile', body: 'bird', policy: 'ranged', realm: 'overworld', color: '#394675', accent: '#7ab352', eyeColor: '#76ff4a', hp: 18, damage: 4, speed: 3.8, scale: 1.1, width: 0.9, height: 0.7, fly: true, burnsInSun: true, drops: [[I.arrow, 1, 2]], xp: 6 });
regMob({ key: 'creeper', name: 'Creeper', group: 'Hostile', body: 'stalker', policy: 'creeper', realm: 'overworld', color: '#4c993b', accent: '#82bf56', hp: 18, damage: 14, speed: 2.4, scale: 1.0, width: 0.6, height: 1.7, drops: [[I.coal, 1, 3]], xp: 6 });
regMob({ key: 'witch', name: 'Witch', group: 'Hostile', body: 'person', policy: 'ranged', realm: 'overworld', color: '#4d3257', accent: '#b59275', hp: 24, damage: 4, speed: 2.2, scale: 1.05, width: 0.6, height: 1.9, drops: [[I.potion_healing, 0, 1]], xp: 7 });
regMob({ key: 'breeze', name: 'Breeze', group: 'Hostile', body: 'blaze', policy: 'ranged', realm: 'overworld', color: '#8277a8', accent: '#b4e4ed', hp: 26, damage: 4, speed: 3.4, scale: 1.0, width: 0.8, height: 1.7, fly: true, drops: [[I.breeze_rod, 1, 2]], xp: 8 });
regMob({ key: 'spider', name: 'Spider', group: 'Hostile', body: 'spider', policy: 'chaser', realm: 'overworld', color: '#3d3330', accent: '#c93338', hp: 16, damage: 3, speed: 3.2, scale: 1.15, width: 1.2, height: 0.8, drops: [[I.arrow, 0, 2]], xp: 5 });
regMob({ key: 'cave_spider', name: 'Cave Spider', group: 'Hostile', body: 'spider', policy: 'chaser', realm: 'overworld', color: '#245257', accent: '#c93338', hp: 12, damage: 3, speed: 3.4, scale: 0.8, width: 0.8, height: 0.6, drops: [[I.iron_ingot, 0, 1]], xp: 5 });
regMob({ key: 'silverfish', name: 'Silverfish', group: 'Hostile', body: 'spider', policy: 'chaser', realm: 'overworld', color: '#8c948d', accent: '#c5c7ba', hp: 8, damage: 2, speed: 3.0, scale: 0.45, width: 0.4, height: 0.4, drops: [[I.coal, 0, 1]], xp: 3 });
regMob({ key: 'slime', name: 'Slime', group: 'Hostile', body: 'blob', policy: 'chaser', realm: 'overworld', color: '#6cb84d', accent: '#427536', hp: 16, damage: 3, speed: 2.0, scale: 1.0, width: 1.0, height: 1.0, drops: [[I.emerald, 0, 1]], xp: 4 });
regMob({ key: 'pillager', name: 'Pillager', group: 'Hostile', body: 'person', policy: 'ranged', realm: 'overworld', color: '#5c3c4a', accent: '#9ba19c', hp: 24, damage: 4, speed: 2.5, scale: 1.04, width: 0.6, height: 1.9, drops: [[I.emerald, 1, 2], [I.arrow, 1, 3]], xp: 7 });
regMob({ key: 'vindicator', name: 'Vindicator', group: 'Hostile', body: 'person', policy: 'chaser', realm: 'overworld', color: '#5b4c63', accent: '#9ba19c', hp: 24, damage: 6, speed: 2.9, scale: 1.04, width: 0.6, height: 1.9, drops: [[I.emerald, 1, 3]], xp: 7 });
regMob({ key: 'evoker', name: 'Evoker', group: 'Hostile', body: 'person', policy: 'ranged', realm: 'overworld', color: '#39323d', accent: '#adb0a6', hp: 24, damage: 5, speed: 2.3, scale: 1.04, width: 0.6, height: 1.9, drops: [[I.emerald, 2, 4]], xp: 10 });
regMob({ key: 'ravager', name: 'Ravager', group: 'Hostile', body: 'quad', policy: 'chaser', realm: 'overworld', color: '#6b6e6a', accent: '#999985', hp: 70, damage: 8, speed: 2.7, scale: 1.55, width: 1.4, height: 1.8, drops: [[I.saddle, 1, 1]], xp: 15 });
regMob({ key: 'warden', name: 'Warden', group: 'Hostile', body: 'person', policy: 'chaser', realm: 'overworld', color: '#1b3d42', accent: '#45b5aa', eyeColor: '#45b5aa', hp: 140, damage: 12, speed: 2.8, scale: 1.58, width: 1.1, height: 2.8, drops: [[I.diamond, 2, 4]], xp: 25 });
regMob({ key: 'blaze', name: 'Blaze', group: 'Hostile', body: 'blaze', policy: 'ranged', realm: 'nether', color: '#d99a2b', accent: '#ffe16b', hp: 20, damage: 5, speed: 2.5, scale: 1.05, width: 0.7, height: 1.7, fly: true, drops: [[I.blaze_rod, 1, 2]], xp: 8 });
regMob({ key: 'ghast', name: 'Ghast', group: 'Hostile', body: 'float', policy: 'ranged', realm: 'nether', color: '#ebe6e6', accent: '#bf5658', hp: 16, damage: 7, speed: 2.4, scale: 1.65, width: 2.0, height: 2.2, fly: true, drops: [[I.gold_ingot, 1, 2]], xp: 8 });
regMob({ key: 'magma_cube', name: 'Magma Cube', group: 'Hostile', body: 'blob', policy: 'chaser', realm: 'nether', color: '#5c262b', accent: '#f7882f', hp: 18, damage: 4, speed: 2.2, scale: 1.08, width: 1.0, height: 1.0, drops: [[I.gold_ingot, 0, 1]], xp: 5 });
regMob({ key: 'hoglin', name: 'Hoglin', group: 'Hostile', body: 'quad', policy: 'chaser', realm: 'nether', color: '#9c5b49', accent: '#e0ba9b', hp: 32, damage: 6, speed: 2.8, scale: 1.28, width: 1.1, height: 1.4, drops: [[I.raw_beef, 2, 4]], xp: 6 });
regMob({ key: 'piglin_brute', name: 'Piglin Brute', group: 'Hostile', body: 'person', policy: 'chaser', realm: 'nether', color: '#6b483d', accent: '#d6a256', hp: 38, damage: 8, speed: 2.9, scale: 1.12, width: 0.7, height: 2.0, drops: [[I.gold_ingot, 2, 4]], xp: 10 });
regMob({ key: 'wither_skeleton', name: 'Wither Skeleton', group: 'Hostile', body: 'person', policy: 'chaser', realm: 'nether', color: '#2b292e', accent: '#4d4852', hp: 24, damage: 6, speed: 2.7, scale: 1.18, width: 0.7, height: 2.2, drops: [[I.coal, 1, 3], [I.bone, 1, 2]], xp: 8 });
regMob({ key: 'endermite', name: 'Endermite', group: 'Hostile', body: 'spider', policy: 'chaser', realm: 'end', color: '#5c416e', accent: '#a4549d', hp: 8, damage: 2, speed: 3.1, scale: 0.48, width: 0.4, height: 0.4, drops: [[I.ender_pearl, 0, 1]], xp: 3 });
regMob({ key: 'shulker', name: 'Shulker', group: 'Hostile', body: 'blob', policy: 'ranged', realm: 'end', color: '#9e689e', accent: '#bd92b8', hp: 26, damage: 4, speed: 0.4, scale: 0.96, width: 1.0, height: 1.0, drops: [[I.ender_pearl, 1, 2]], xp: 7 });

// True Bosses (Top-screen Boss Bar)
regMob({ key: 'ender_dragon', name: 'Ender Dragon', group: 'Bosses', body: 'dragon', policy: 'boss', realm: 'end', color: '#282336', accent: '#cf6ee8', eyeColor: '#eb7bff', hp: 200, damage: 10, speed: 5.5, scale: 2.1, width: 3.0, height: 2.5, fly: true, drops: [[I.diamond, 6, 10], [I.nether_star, 1, 1]], xp: 150 });
regMob({ key: 'wither', name: 'Wither', group: 'Bosses', body: 'wither', policy: 'boss', realm: 'nether', color: '#3b3545', accent: '#9d7cb3', eyeColor: '#d9f2ff', hp: 180, damage: 9, speed: 4.0, scale: 1.65, width: 1.6, height: 2.6, fly: true, drops: [[I.nether_star, 1, 1]], xp: 120 });
regMob({ key: 'elder_guardian', name: 'Elder Guardian', group: 'Bosses', body: 'fish', policy: 'boss', realm: 'overworld', color: '#aba79e', accent: '#8f5954', eyeColor: '#ffb74a', hp: 100, damage: 7, speed: 2.4, scale: 1.75, width: 1.8, height: 1.8, water: true, drops: [[I.diamond, 2, 4]], xp: 60 });

function makePart(
  w: number,
  h: number,
  d: number,
  color: string,
  emissive?: string,
  map?: THREE.Texture,
): THREE.Mesh {
  const mat = new THREE.MeshStandardMaterial({
    color: map ? '#ffffff' : color,
    map: map || null,
    roughness: 0.72,
    metalness: 0.08,
    ...(emissive ? { emissive, emissiveIntensity: 0.65 } : {}),
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeLimb(w: number, h: number, d: number, color: string, px: number, py: number, pz: number): THREE.Group {
  const pivot = new THREE.Group();
  pivot.position.set(px, py, pz);
  const mesh = makePart(w, h, d, color);
  mesh.position.set(0, -h * 0.5, 0);
  pivot.add(mesh);
  return pivot;
}

function makePixelTexture(size: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

function buildFaceTexture(skin: PlayerSkin): THREE.CanvasTexture {
  return makePixelTexture(16, (ctx) => {
    ctx.fillStyle = skin.skin;
    ctx.fillRect(0, 0, 16, 16);
    // Subtle cheek pixel noise
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(1, 10, 2, 2);
    ctx.fillRect(13, 10, 2, 2);

    // Hair fringe across forehead matching character_470a46dd.jfif
    ctx.fillStyle = skin.hair;
    if (skin.style === 'steve' || skin.style === 'sunny' || skin.style === 'zuri') {
      ctx.fillRect(0, 0, 16, 4);
      ctx.fillRect(0, 4, 2, 2);
      ctx.fillRect(14, 4, 2, 2);
    } else if (skin.style === 'kai') {
      ctx.fillRect(0, 0, 16, 4);
      ctx.fillRect(0, 4, 3, 4);
      ctx.fillRect(13, 4, 3, 4);
      ctx.fillRect(4, 4, 3, 2);
    } else if (skin.style === 'alex' || skin.style === 'ari') {
      ctx.fillRect(0, 0, 16, 4);
      ctx.fillRect(0, 4, 3, 5);
      ctx.fillRect(12, 4, 4, 3);
    } else if (skin.style === 'efe' || skin.style === 'makena' || skin.style === 'noor') {
      ctx.fillRect(0, 0, 16, 4);
      ctx.fillRect(0, 4, 2, 4);
      ctx.fillRect(14, 4, 2, 4);
    } else {
      ctx.fillRect(0, 0, 16, 5);
    }

    // Crisp 2x2 eyes with white sclera & colored iris
    ctx.fillStyle = '#f6f7f9';
    ctx.fillRect(2, 7, 2, 2);
    ctx.fillRect(12, 7, 2, 2);
    ctx.fillStyle = skin.eyeColor;
    ctx.fillRect(4, 7, 2, 2);
    ctx.fillRect(10, 7, 2, 2);

    // Nose & mouth / beard
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(7, 10, 2, 2);
    if (skin.style === 'steve') {
      ctx.fillStyle = skin.hair;
      ctx.fillRect(4, 12, 8, 3);
      ctx.fillRect(6, 11, 4, 1);
      ctx.fillStyle = '#9c6348';
      ctx.fillRect(6, 12, 4, 1);
    } else {
      ctx.fillStyle = 'rgba(80,35,20,0.55)';
      ctx.fillRect(6, 13, 4, 1);
    }
  });
}

function buildTorsoTexture(skin: PlayerSkin): THREE.CanvasTexture {
  return makePixelTexture(16, (ctx) => {
    ctx.fillStyle = skin.shirt;
    ctx.fillRect(0, 0, 16, 16);

    if (skin.style === 'sunny') {
      // Green tee top + blue denim overalls with shoulder straps & brass buttons
      ctx.fillStyle = skin.accent;
      ctx.fillRect(2, 5, 12, 11);
      ctx.fillRect(3, 0, 2, 5);
      ctx.fillRect(11, 0, 2, 5);
      ctx.fillStyle = '#e8c448';
      ctx.fillRect(3, 5, 2, 2);
      ctx.fillRect(11, 5, 2, 2);
    } else if (skin.style === 'kai') {
      // Purple/black martial tunic with diagonal red sash
      ctx.fillStyle = '#4c347a';
      ctx.fillRect(2, 0, 12, 16);
      ctx.fillStyle = skin.accent;
      ctx.fillRect(3, 1, 2, 4);
      ctx.fillRect(5, 4, 2, 4);
      ctx.fillRect(7, 8, 3, 8);
    } else if (skin.style === 'makena') {
      // Golden yellow sweater with brown geometric motif
      ctx.fillStyle = skin.accent;
      ctx.fillRect(0, 10, 16, 2);
      ctx.fillRect(2, 4, 4, 3);
      ctx.fillRect(10, 4, 4, 3);
    } else if (skin.style === 'zuri') {
      // Crisp crimson polo over white collar tee
      ctx.fillStyle = skin.accent;
      ctx.fillRect(5, 0, 6, 3);
      ctx.fillRect(0, 14, 16, 2);
    } else if (skin.style === 'efe') {
      // Ice blue shirt with dark collar & golden belt buckle
      ctx.fillStyle = '#281c2e';
      ctx.fillRect(5, 0, 6, 3);
      ctx.fillStyle = skin.accent;
      ctx.fillRect(6, 14, 4, 2);
    } else if (skin.style === 'alex') {
      // Green ranger tunic with brown belt
      ctx.fillStyle = skin.accent;
      ctx.fillRect(0, 12, 16, 3);
      ctx.fillStyle = '#d9b84c';
      ctx.fillRect(7, 12, 2, 3);
    } else if (skin.style === 'noor') {
      // Crimson jacket open over dark undershirt
      ctx.fillStyle = skin.accent;
      ctx.fillRect(5, 0, 6, 16);
      ctx.fillStyle = '#751f19';
      ctx.fillRect(2, 2, 2, 12);
      ctx.fillRect(12, 2, 2, 12);
    } else if (skin.style === 'steve') {
      // Classic tucked cyan shirt edge
      ctx.fillStyle = skin.accent;
      ctx.fillRect(0, 12, 16, 4);
      ctx.fillStyle = skin.skin;
      ctx.fillRect(5, 0, 6, 2);
    } else if (skin.style === 'ari') {
      ctx.fillStyle = '#cf8929';
      ctx.fillRect(0, 12, 16, 4);
    }
  });
}

export function buildCharacterMesh(skin: PlayerSkin): THREE.Group {
  const g = new THREE.Group();
  const legL = makeLimb(0.25, 0.72, 0.25, skin.pants, -0.135, 0.72, 0);
  const legR = makeLimb(0.25, 0.72, 0.25, skin.pants, 0.135, 0.72, 0);
  g.add(legL, legR);

  // Subtle shoes matching reference screenshot
  const shoeCol = skin.style === 'efe' ? skin.accent : '#2a2422';
  const shoeL = makePart(0.26, 0.14, 0.26, shoeCol);
  shoeL.position.set(0, -0.66, 0);
  const shoeR = makePart(0.26, 0.14, 0.26, shoeCol);
  shoeR.position.set(0, -0.66, 0);
  legL.add(shoeL);
  legR.add(shoeR);

  // Torso with front/back textured material
  const torsoSideMat = new THREE.MeshStandardMaterial({ color: skin.shirt, roughness: 0.78 });
  const torsoFrontMat = new THREE.MeshStandardMaterial({ map: buildTorsoTexture(skin), roughness: 0.75 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.72, 0.26), [
    torsoSideMat,
    torsoSideMat,
    torsoSideMat,
    torsoSideMat,
    torsoFrontMat,
    torsoFrontMat,
  ]);
  torso.position.set(0, 1.08, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  g.add(torso);

  // Left arm (Sunny gets signature silver mechanical prosthetic arm!)
  const armL = new THREE.Group();
  armL.position.set(-0.39, 1.44, 0);
  if (skin.bionicLeftArm) {
    const bionicUpper = makePart(0.22, 0.44, 0.22, '#8b939e');
    bionicUpper.position.set(0, -0.22, 0);
    const bionicJoint = makePart(0.24, 0.1, 0.24, '#515863');
    bionicJoint.position.set(0, -0.45, 0);
    const bionicHand = makePart(0.22, 0.2, 0.22, '#a7b0bd');
    bionicHand.position.set(0, -0.6, 0);
    armL.add(bionicUpper, bionicJoint, bionicHand);
  } else {
    const sleeveL = makePart(0.22, 0.44, 0.22, skin.shirt);
    sleeveL.position.set(0, -0.22, 0);
    const handL = makePart(0.22, 0.26, 0.22, skin.skin);
    handL.position.set(0, -0.57, 0);
    armL.add(sleeveL, handL);
  }

  // Right arm
  const armR = new THREE.Group();
  armR.position.set(0.39, 1.44, 0);
  const sleeveR = makePart(0.22, 0.44, 0.22, skin.shirt);
  sleeveR.position.set(0, -0.22, 0);
  const handR = makePart(0.22, 0.26, 0.22, skin.skin);
  handR.position.set(0, -0.57, 0);
  armR.add(sleeveR, handR);
  g.add(armL, armR);

  // Head with crisp pixel face & 3D hairstyle overhang
  const head = new THREE.Group();
  head.position.set(0, 1.44, 0);
  const skinMat = new THREE.MeshStandardMaterial({ color: skin.skin, roughness: 0.75 });
  const hairMat = new THREE.MeshStandardMaterial({ color: skin.hair, roughness: 0.78 });
  const faceMat = new THREE.MeshStandardMaterial({ map: buildFaceTexture(skin), roughness: 0.72 });
  // BoxGeometry material order: +x, -x, +y, -y, +z (back in -Z forward), -z (front facing -Z)
  const skull = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.48), [
    skinMat,
    skinMat,
    hairMat,
    skinMat,
    hairMat,
    faceMat,
  ]);
  skull.position.set(0, 0.24, 0);
  skull.castShadow = true;
  head.add(skull);

  const hairCrown = makePart(0.51, 0.14, 0.51, skin.hair);
  hairCrown.position.set(0, 0.44, 0);
  head.add(hairCrown);

  // Characteristic 3D hair details per official character
  if (skin.style === 'alex' || skin.style === 'ari') {
    const tail = makePart(0.14, 0.42, 0.14, skin.hair);
    tail.position.set(0.22, 0.06, 0.1);
    head.add(tail);
  } else if (skin.style === 'makena') {
    const puff = makePart(0.56, 0.22, 0.54, skin.hair);
    puff.position.set(0, 0.46, 0.04);
    head.add(puff);
  } else if (skin.style === 'noor') {
    const dreadL = makePart(0.12, 0.36, 0.16, skin.hair);
    dreadL.position.set(-0.24, 0.12, 0.08);
    const dreadR = makePart(0.12, 0.36, 0.16, skin.hair);
    dreadR.position.set(0.24, 0.12, 0.08);
    head.add(dreadL, dreadR);
  } else if (skin.style === 'kai') {
    const bangs = makePart(0.51, 0.12, 0.1, skin.hair);
    bangs.position.set(0, 0.38, -0.22);
    head.add(bangs);
  }

  g.add(head);

  if (skin.cape) {
    const cape = makePart(0.46, 0.85, 0.04, skin.cape);
    cape.position.set(0, 1.0, 0.18);
    cape.rotation.x = 0.14;
    g.add(cape);
  }

  g.userData = { legs: [legL, legR], arms: [armL, armR], head };
  return g;
}

export function buildMobMesh(def: MobDef, tamed = false): THREE.Group {
  const g = new THREE.Group();
  const s = def.scale;
  const eyeC = def.eyeColor || '#1e1f24';

  if (def.body === 'person') {
    const isSlender = def.key === 'enderman' || def.key === 'skeleton' || def.key === 'wither_skeleton';
    const legW = isSlender ? 0.14 * s : 0.24 * s;
    const armW = isSlender ? 0.13 * s : 0.22 * s;
    const legH = def.key === 'enderman' ? 0.92 * s : 0.7 * s;
    const legL = makeLimb(legW, legH, legW, def.color, -0.14 * s, legH, 0);
    const legR = makeLimb(legW, legH, legW, def.color, 0.14 * s, legH, 0);
    g.add(legL, legR);
    const torsoH = 0.7 * s;
    const body = makePart(0.5 * s, torsoH, 0.26 * s, def.color);
    body.position.set(0, legH + torsoH * 0.5, 0);
    g.add(body);
    const armH = def.key === 'enderman' ? 0.88 * s : 0.68 * s;
    const armL = makeLimb(armW, armH, armW, def.accent, -0.37 * s, legH + torsoH, 0);
    const armR = makeLimb(armW, armH, armW, def.accent, 0.37 * s, legH + torsoH, 0);
    g.add(armL, armR);
    const head = new THREE.Group();
    head.position.set(0, legH + torsoH + 0.02 * s, 0);
    const skull = makePart(0.46 * s, 0.46 * s, 0.46 * s, def.accent);
    skull.position.set(0, 0.23 * s, 0);
    const eyeL = makePart(0.09 * s, 0.06 * s, 0.02 * s, eyeC, def.eyeColor);
    eyeL.position.set(-0.1 * s, 0.24 * s, -0.235 * s);
    const eyeR = makePart(0.09 * s, 0.06 * s, 0.02 * s, eyeC, def.eyeColor);
    eyeR.position.set(0.1 * s, 0.24 * s, -0.235 * s);
    head.add(skull, eyeL, eyeR);
    if (def.key === 'villager' || def.key === 'wandering_trader' || def.key === 'witch') {
      const nose = makePart(0.1 * s, 0.18 * s, 0.1 * s, def.accent);
      nose.position.set(0, 0.16 * s, -0.28 * s);
      head.add(nose);
    }
    if (def.key === 'witch') {
      const brim = makePart(0.62 * s, 0.06 * s, 0.62 * s, '#291e33');
      brim.position.set(0, 0.47 * s, 0);
      const cone = makePart(0.38 * s, 0.32 * s, 0.38 * s, '#3b284a');
      cone.position.set(0, 0.65 * s, 0);
      head.add(brim, cone);
    }
    g.add(head);
    g.userData = { legs: [legL, legR], arms: [armL, armR], head };
  } else if (def.body === 'quad' || def.body === 'horse' || def.body === 'cat') {
    const legH = def.body === 'horse' ? 0.68 * s : def.body === 'cat' ? 0.32 * s : 0.42 * s;
    const torso = makePart(0.62 * s, 0.52 * s, 0.92 * s, def.color);
    torso.position.set(0, legH + 0.26 * s, 0);
    g.add(torso);
    const head = new THREE.Group();
    head.position.set(0, legH + 0.42 * s, -0.52 * s);
    const skull = makePart(0.46 * s, 0.44 * s, 0.44 * s, def.key === 'wolf' ? def.color : def.accent);
    skull.position.set(0, 0, -0.18 * s);
    const snout = makePart(0.28 * s, 0.18 * s, 0.18 * s, def.color);
    snout.position.set(0, -0.09 * s, -0.42 * s);
    const eyeL = makePart(0.07 * s, 0.07 * s, 0.02 * s, eyeC);
    eyeL.position.set(-0.12 * s, 0.06 * s, -0.405 * s);
    const eyeR = makePart(0.07 * s, 0.07 * s, 0.02 * s, eyeC);
    eyeR.position.set(0.12 * s, 0.06 * s, -0.405 * s);
    head.add(skull, snout, eyeL, eyeR);
    if (def.key === 'wolf' || def.key === 'cat' || def.key === 'fox' || def.body === 'horse' || def.key === 'cow') {
      const earL = makePart(0.1 * s, 0.16 * s, 0.1 * s, def.color);
      earL.position.set(-0.15 * s, 0.26 * s, -0.14 * s);
      const earR = makePart(0.1 * s, 0.16 * s, 0.1 * s, def.color);
      earR.position.set(0.15 * s, 0.26 * s, -0.14 * s);
      head.add(earL, earR);
    }
    if (tamed || def.key === 'wolf') {
      const collar = makePart(0.48 * s, 0.1 * s, 0.46 * s, '#db322c');
      collar.position.set(0, -0.16 * s, -0.05 * s);
      head.add(collar);
    }
    g.add(head);
    const legs: THREE.Group[] = [];
    for (const [lx, lz] of [
      [-0.2 * s, -0.32 * s],
      [0.2 * s, -0.32 * s],
      [-0.2 * s, 0.32 * s],
      [0.2 * s, 0.32 * s],
    ]) {
      const l = makeLimb(0.16 * s, legH, 0.16 * s, def.color, lx, legH, lz);
      g.add(l);
      legs.push(l);
    }
    g.userData = { legs, head };
  } else if (def.body === 'stalker') {
    const body = makePart(0.42 * s, 0.8 * s, 0.42 * s, def.color);
    body.position.set(0, 0.7 * s, 0);
    const head = makePart(0.5 * s, 0.5 * s, 0.5 * s, def.accent);
    head.position.set(0, 1.35 * s, 0);
    const eyeL = makePart(0.1 * s, 0.1 * s, 0.02 * s, '#171f14');
    eyeL.position.set(-0.12 * s, 1.42 * s, -0.255 * s);
    const eyeR = makePart(0.1 * s, 0.1 * s, 0.02 * s, '#171f14');
    eyeR.position.set(0.12 * s, 1.42 * s, -0.255 * s);
    const mouth = makePart(0.16 * s, 0.16 * s, 0.02 * s, '#171f14');
    mouth.position.set(0, 1.24 * s, -0.255 * s);
    g.add(body, head, eyeL, eyeR, mouth);
    const legs: THREE.Group[] = [];
    for (const [lx, lz] of [
      [-0.16 * s, -0.22 * s],
      [0.16 * s, -0.22 * s],
      [-0.16 * s, 0.22 * s],
      [0.16 * s, 0.22 * s],
    ]) {
      const l = makeLimb(0.2 * s, 0.32 * s, 0.2 * s, def.color, lx, 0.32 * s, lz);
      g.add(l);
      legs.push(l);
    }
    g.userData = { legs, head };
  } else if (def.body === 'spider') {
    const abdomen = makePart(0.66 * s, 0.42 * s, 0.76 * s, def.color);
    abdomen.position.set(0, 0.38 * s, 0.25 * s);
    const head = makePart(0.48 * s, 0.36 * s, 0.42 * s, def.color);
    head.position.set(0, 0.35 * s, -0.35 * s);
    const eyeL = makePart(0.1 * s, 0.08 * s, 0.02 * s, def.accent, def.accent);
    eyeL.position.set(-0.12 * s, 0.4 * s, -0.565 * s);
    const eyeR = makePart(0.1 * s, 0.08 * s, 0.02 * s, def.accent, def.accent);
    eyeR.position.set(0.12 * s, 0.4 * s, -0.565 * s);
    g.add(abdomen, head, eyeL, eyeR);
    const legs: THREE.Group[] = [];
    for (let i = 0; i < 4; i++) {
      const z = -0.2 + i * 0.2;
      for (const side of [-1, 1]) {
        const l = makeLimb(0.55 * s, 0.1 * s, 0.1 * s, def.color, side * 0.32 * s, 0.35 * s, z * s);
        l.rotation.z = side * -0.4;
        g.add(l);
        legs.push(l);
      }
    }
    g.userData = { legs };
  } else if (def.body === 'blaze') {
    const head = makePart(0.48 * s, 0.48 * s, 0.48 * s, def.color, def.accent);
    head.position.set(0, 1.3 * s, 0);
    g.add(head);
    const rods: THREE.Group[] = [];
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const rod = makeLimb(0.11 * s, 0.56 * s, 0.11 * s, def.accent, Math.cos(ang) * 0.45 * s, 0.9 * s, Math.sin(ang) * 0.45 * s);
      g.add(rod);
      rods.push(rod);
    }
    g.userData = { legs: rods, head };
  } else if (def.body === 'dragon' || def.body === 'bird' || def.body === 'bee') {
    const body = makePart(0.5 * s, 0.42 * s, 0.9 * s, def.color);
    body.position.set(0, 0.65 * s, 0);
    const head = makePart(0.36 * s, 0.32 * s, 0.44 * s, def.accent);
    head.position.set(0, 0.8 * s, -0.58 * s);
    const wingL = makeLimb(0.75 * s, 0.08 * s, 0.48 * s, def.accent, -0.5 * s, 0.8 * s, 0);
    const wingR = makeLimb(0.75 * s, 0.08 * s, 0.48 * s, def.accent, 0.5 * s, 0.8 * s, 0);
    const eye = makePart(0.28 * s, 0.06 * s, 0.02 * s, eyeC, def.eyeColor);
    eye.position.set(0, 0.85 * s, -0.805 * s);
    g.add(body, head, wingL, wingR, eye);
    g.userData = { wings: [wingL, wingR], head };
  } else if (def.body === 'wither') {
    const spine = makePart(0.42 * s, 1.1 * s, 0.34 * s, def.color);
    spine.position.set(0, 1.0 * s, 0);
    const bar = makePart(1.3 * s, 0.24 * s, 0.24 * s, def.accent);
    bar.position.set(0, 1.45 * s, 0);
    const h0 = makePart(0.48 * s, 0.48 * s, 0.48 * s, def.color);
    h0.position.set(0, 1.85 * s, 0);
    const h1 = makePart(0.36 * s, 0.36 * s, 0.36 * s, def.accent);
    h1.position.set(-0.62 * s, 1.65 * s, 0);
    const h2 = makePart(0.36 * s, 0.36 * s, 0.36 * s, def.accent);
    h2.position.set(0.62 * s, 1.65 * s, 0);
    g.add(spine, bar, h0, h1, h2);
    g.userData = { head: h0 };
  } else {
    // float (Ghast / Squid) / fish / blob
    const body = makePart(0.68 * s, 0.62 * s, 0.72 * s, def.color);
    body.position.set(0, 0.55 * s, 0);
    const eyeL = makePart(0.09 * s, 0.09 * s, 0.02 * s, eyeC, def.eyeColor);
    eyeL.position.set(-0.15 * s, 0.6 * s, -0.365 * s);
    const eyeR = makePart(0.09 * s, 0.09 * s, 0.02 * s, eyeC, def.eyeColor);
    eyeR.position.set(0.15 * s, 0.6 * s, -0.365 * s);
    g.add(body, eyeL, eyeR);
    if (def.body === 'float') {
      const legs: THREE.Group[] = [];
      for (let t = -1; t <= 1; t++) {
        const tent = makeLimb(0.1 * s, 0.46 * s, 0.1 * s, def.accent, t * 0.2 * s, 0.24 * s, 0);
        g.add(tent);
        legs.push(tent);
      }
      g.userData = { legs, head: body };
    } else {
      const fin = makePart(0.2 * s, 0.28 * s, 0.3 * s, def.accent);
      fin.position.set(0, 0.5 * s, 0.44 * s);
      g.add(fin);
      g.userData = { head: body };
    }
  }

  return g;
}

export function animateArticulatedMesh(
  mesh: THREE.Group,
  moving: number,
  time: number,
  swing = 0,
): void {
  const ud = mesh.userData as {
    legs?: THREE.Group[];
    arms?: THREE.Group[];
    wings?: THREE.Group[];
    head?: THREE.Object3D;
  };
  if (ud.legs) {
    for (let i = 0; i < ud.legs.length; i++) {
      const phase = i % 2 === 0 ? 0 : Math.PI;
      ud.legs[i].rotation.x = Math.sin(time * 8 + phase) * 0.65 * moving;
    }
  }
  if (ud.arms) {
    for (let i = 0; i < ud.arms.length; i++) {
      const phase = i === 0 ? Math.PI : 0;
      ud.arms[i].rotation.x = Math.sin(time * 8 + phase) * 0.55 * moving;
    }
    if (swing > 0 && ud.arms[1]) {
      ud.arms[1].rotation.x = -Math.sin(swing * Math.PI) * 1.65;
    }
  }
  if (ud.wings) {
    const flap = Math.sin(time * 10) * 0.45;
    ud.wings[0].rotation.z = flap;
    ud.wings[1].rotation.z = -flap;
  }
}
