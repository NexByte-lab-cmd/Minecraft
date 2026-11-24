export type ToolKind = 'none' | 'pick' | 'axe' | 'shovel' | 'sword' | 'hoe' | 'shears';

export type ItemCategory =
  | 'natural'
  | 'building'
  | 'wood'
  | 'dyed'
  | 'redstone'
  | 'tools'
  | 'combat'
  | 'food'
  | 'brewing'
  | 'mods'
  | 'eggs';

export interface BlockDef {
  id: number;
  key: string;
  name: string;
  category: ItemCategory;
  color: string;
  topColor?: string;
  sideColor?: string;
  tex: string;
  topTex?: string;
  sideTex?: string;
  opaque: boolean;
  solid: boolean;
  hardness: number; // -1 = unbreakable
  tool: ToolKind;
  minTier: number; // 0=hand, 1=wood, 2=stone/copper, 3=iron, 4=diamond
  gravity?: boolean;
  fluid?: boolean;
  flammable?: boolean;
  glow?: number;
  lightColor?: string;
  emissive?: boolean;
  friction?: number; // default 1.0; ice = 0.08; soul sand = 0.45
  bounce?: number; // slime = 0.85
  fallReduce?: number; // water=1, hay=0.8, slime=1, honey=0.8
  damage?: number; // cactus/lava/magma
  dropId?: number;
  dropCount?: number;
  workstation?: 'crafting' | 'furnace' | 'blast' | 'smoker' | 'anvil' | 'enchant' | 'smithing' | 'brewing' | 'chest' | 'ender_chest' | 'beacon' | 'jukebox' | 'bed';
  circuit?: 'dust' | 'block' | 'torch' | 'lever' | 'button' | 'plate' | 'repeater' | 'comparator' | 'piston' | 'sticky_piston' | 'lamp' | 'tnt' | 'observer' | 'hopper' | 'dispenser' | 'dropper' | 'daylight' | 'sculk_sensor';
  portal?: 'nether' | 'end';
  modId?: string;
}

export interface ItemDef {
  id: number; // >= 1000 for non-block items
  key: string;
  name: string;
  category: ItemCategory;
  color: string;
  icon: string;
  tool?: ToolKind;
  tier?: number;
  speed?: number;
  damage?: number;
  durability?: number;
  armorSlot?: 'head' | 'chest' | 'legs' | 'feet';
  armorPoints?: number;
  food?: number;
  saturation?: number;
  potionEffect?: string;
  spawnMob?: string;
  canDestroy?: string[];
  canPlaceOn?: string[];
  fireproof?: boolean;
  modId?: string;
  special?: 'mace' | 'trident' | 'shield' | 'elytra' | 'flint_steel' | 'eye_of_ender' | 'bone' | 'saddle' | 'bucket' | 'water_bucket' | 'lava_bucket' | 'firework' | 'honeycomb' | 'bow';
}

export interface ModPack {
  id: string;
  name: string;
  tagline: string;
  enabledByDefault: boolean;
}

export const MOD_PACKS: ModPack[] = [
  { id: 'vibrant_lanterns', name: 'Vibrant Lanterns & Architecture', tagline: 'Decorative lanterns, stained timber & glowing shrines', enabledByDefault: true },
  { id: 'industrial_redstone', name: 'Industrial Redstone & Quarry', tagline: 'Copper bulbs, fast hoppers, quarry drills & logic gates', enabledByDefault: true },
  { id: 'arcane_bosses', name: 'Arcane Relics & Boss Craft', tagline: 'Sulfur crystals, heavy mace cores, totem relics & beacon boosts', enabledByDefault: true },
  { id: 'mythic_mounts', name: 'Mythic Companions & Mounts', tagline: 'Wolf armor, camel dashes, allay helpers & sulfur cubes', enabledByDefault: true },
  { id: 'sky_glider', name: 'Sky-Islands & Elytra Boosters', tagline: 'Chorus clouds, wind charges & firework glider propulsion', enabledByDefault: true },
];

export const BLOCKS: BlockDef[] = [];
export const BLOCK_BY_KEY: Record<string, BlockDef> = {};
export const B: Record<string, number> = {};

let nextBlockId = 0;
function addBlock(def: Omit<BlockDef, 'id'>): number {
  const id = nextBlockId++;
  const full: BlockDef = { id, ...def };
  BLOCKS[id] = full;
  BLOCK_BY_KEY[def.key] = full;
  B[def.key] = id;
  return id;
}

// 0: Air
addBlock({ key: 'air', name: 'Air', category: 'natural', color: '#000000', tex: 'air', opaque: false, solid: false, hardness: 0, tool: 'none', minTier: 0 });

// Natural & Stone
addBlock({ key: 'grass', name: 'Grass Block', category: 'natural', color: '#5da639', topColor: '#66b53f', sideColor: '#7a593c', tex: 'grass_side', topTex: 'grass_top', sideTex: 'grass_side', opaque: true, solid: true, hardness: 0.7, tool: 'shovel', minTier: 0, dropId: 2 });
addBlock({ key: 'dirt', name: 'Dirt', category: 'natural', color: '#7e593a', tex: 'dirt', opaque: true, solid: true, hardness: 0.6, tool: 'shovel', minTier: 0 });
addBlock({ key: 'coarse_dirt', name: 'Coarse Dirt', category: 'natural', color: '#6b4a30', tex: 'coarse_dirt', opaque: true, solid: true, hardness: 0.65, tool: 'shovel', minTier: 0 });
addBlock({ key: 'podzol', name: 'Podzol', category: 'natural', color: '#6b4f2f', topColor: '#5b4125', tex: 'podzol', opaque: true, solid: true, hardness: 0.7, tool: 'shovel', minTier: 0 });
addBlock({ key: 'mycelium', name: 'Mycelium', category: 'natural', color: '#7b687c', topColor: '#8d7990', tex: 'mycelium', opaque: true, solid: true, hardness: 0.7, tool: 'shovel', minTier: 0 });
addBlock({ key: 'mud', name: 'Mud', category: 'natural', color: '#3b373c', tex: 'mud', opaque: true, solid: true, hardness: 0.6, tool: 'shovel', minTier: 0, friction: 0.7 });
addBlock({ key: 'clay', name: 'Clay', category: 'natural', color: '#9ca4b3', tex: 'clay', opaque: true, solid: true, hardness: 0.7, tool: 'shovel', minTier: 0 });
addBlock({ key: 'sand', name: 'Sand', category: 'natural', color: '#e2d393', tex: 'sand', opaque: true, solid: true, hardness: 0.6, tool: 'shovel', minTier: 0, gravity: true });
addBlock({ key: 'red_sand', name: 'Red Sand', category: 'natural', color: '#be662d', tex: 'red_sand', opaque: true, solid: true, hardness: 0.6, tool: 'shovel', minTier: 0, gravity: true });
addBlock({ key: 'gravel', name: 'Gravel', category: 'natural', color: '#837f7d', tex: 'gravel', opaque: true, solid: true, hardness: 0.7, tool: 'shovel', minTier: 0, gravity: true });
addBlock({ key: 'stone', name: 'Stone', category: 'natural', color: '#7d8084', tex: 'stone', opaque: true, solid: true, hardness: 1.8, tool: 'pick', minTier: 1, dropId: 12 });
addBlock({ key: 'cobblestone', name: 'Cobblestone', category: 'building', color: '#707377', tex: 'cobblestone', opaque: true, solid: true, hardness: 2.0, tool: 'pick', minTier: 1 });
addBlock({ key: 'mossy_cobblestone', name: 'Mossy Cobblestone', category: 'building', color: '#5b7256', tex: 'mossy_cobble', opaque: true, solid: true, hardness: 2.0, tool: 'pick', minTier: 1 });
addBlock({ key: 'granite', name: 'Granite', category: 'natural', color: '#9c6c5c', tex: 'granite', opaque: true, solid: true, hardness: 1.8, tool: 'pick', minTier: 1 });
addBlock({ key: 'diorite', name: 'Diorite', category: 'natural', color: '#c7c7c9', tex: 'diorite', opaque: true, solid: true, hardness: 1.8, tool: 'pick', minTier: 1 });
addBlock({ key: 'andesite', name: 'Andesite', category: 'natural', color: '#878b8c', tex: 'andesite', opaque: true, solid: true, hardness: 1.8, tool: 'pick', minTier: 1 });
addBlock({ key: 'tuff', name: 'Tuff', category: 'natural', color: '#6b6d64', tex: 'tuff', opaque: true, solid: true, hardness: 1.8, tool: 'pick', minTier: 1 });
addBlock({ key: 'calcite', name: 'Calcite', category: 'natural', color: '#dfe0da', tex: 'calcite', opaque: true, solid: true, hardness: 1.2, tool: 'pick', minTier: 1 });
addBlock({ key: 'deepslate', name: 'Deepslate', category: 'natural', color: '#4c4d53', tex: 'deepslate', opaque: true, solid: true, hardness: 3.4, tool: 'pick', minTier: 1 });
addBlock({ key: 'dripstone', name: 'Dripstone Block', category: 'natural', color: '#846b5c', tex: 'dripstone', opaque: true, solid: true, hardness: 1.8, tool: 'pick', minTier: 1 });
addBlock({ key: 'obsidian', name: 'Obsidian', category: 'building', color: '#1b1429', tex: 'obsidian', opaque: true, solid: true, hardness: 14.0, tool: 'pick', minTier: 4 });
addBlock({ key: 'bedrock', name: 'Bedrock', category: 'natural', color: '#333438', tex: 'bedrock', opaque: true, solid: true, hardness: -1, tool: 'pick', minTier: 99 });
addBlock({ key: 'sandstone', name: 'Sandstone', category: 'building', color: '#dccb8c', tex: 'sandstone', opaque: true, solid: true, hardness: 1.2, tool: 'pick', minTier: 1 });
addBlock({ key: 'bricks', name: 'Bricks', category: 'building', color: '#9c4e40', tex: 'bricks', opaque: true, solid: true, hardness: 2.2, tool: 'pick', minTier: 1 });
addBlock({ key: 'stone_bricks', name: 'Stone Bricks', category: 'building', color: '#7a7d81', tex: 'stone_bricks', opaque: true, solid: true, hardness: 2.0, tool: 'pick', minTier: 1 });

// Fluids & Ice & Snow
addBlock({ key: 'water', name: 'Water', category: 'natural', color: '#2b77d9', tex: 'water', opaque: false, solid: false, hardness: -1, tool: 'none', minTier: 0, fluid: true, fallReduce: 1.0 });
addBlock({ key: 'lava', name: 'Lava', category: 'natural', color: '#e95a14', tex: 'lava', opaque: true, solid: false, hardness: -1, tool: 'none', minTier: 0, fluid: true, glow: 0.95, lightColor: '#ff6d1f', emissive: true, damage: 4 });
addBlock({ key: 'snow', name: 'Snow Block', category: 'natural', color: '#eff6fc', tex: 'snow', opaque: true, solid: true, hardness: 0.4, tool: 'shovel', minTier: 0 });
addBlock({ key: 'ice', name: 'Ice', category: 'natural', color: '#94c5f7', tex: 'ice', opaque: false, solid: true, hardness: 0.6, tool: 'pick', minTier: 0, friction: 0.08 });
addBlock({ key: 'packed_ice', name: 'Packed Ice', category: 'natural', color: '#8ab4e6', tex: 'packed_ice', opaque: true, solid: true, hardness: 0.9, tool: 'pick', minTier: 0, friction: 0.06 });
addBlock({ key: 'blue_ice', name: 'Blue Ice', category: 'natural', color: '#6ea8f7', tex: 'blue_ice', opaque: true, solid: true, hardness: 1.4, tool: 'pick', minTier: 0, friction: 0.03 });

// Ores & Minerals
addBlock({ key: 'coal_ore', name: 'Coal Ore', category: 'natural', color: '#5c5f63', tex: 'coal_ore', opaque: true, solid: true, hardness: 2.6, tool: 'pick', minTier: 1 });
addBlock({ key: 'iron_ore', name: 'Iron Ore', category: 'natural', color: '#b5927c', tex: 'iron_ore', opaque: true, solid: true, hardness: 2.8, tool: 'pick', minTier: 2 });
addBlock({ key: 'copper_ore', name: 'Copper Ore', category: 'natural', color: '#b87654', tex: 'copper_ore', opaque: true, solid: true, hardness: 2.6, tool: 'pick', minTier: 2 });
addBlock({ key: 'gold_ore', name: 'Gold Ore', category: 'natural', color: '#ead249', tex: 'gold_ore', opaque: true, solid: true, hardness: 3.0, tool: 'pick', minTier: 3 });
addBlock({ key: 'redstone_ore', name: 'Redstone Ore', category: 'natural', color: '#c43b3b', tex: 'redstone_ore', opaque: true, solid: true, hardness: 3.0, tool: 'pick', minTier: 3, glow: 0.35, lightColor: '#ff3b30' });
addBlock({ key: 'lapis_ore', name: 'Lapis Lazuli Ore', category: 'natural', color: '#395cc4', tex: 'lapis_ore', opaque: true, solid: true, hardness: 3.0, tool: 'pick', minTier: 2 });
addBlock({ key: 'emerald_ore', name: 'Emerald Ore', category: 'natural', color: '#41cc6a', tex: 'emerald_ore', opaque: true, solid: true, hardness: 3.2, tool: 'pick', minTier: 3 });
addBlock({ key: 'diamond_ore', name: 'Diamond Ore', category: 'natural', color: '#56e6ee', tex: 'diamond_ore', opaque: true, solid: true, hardness: 3.6, tool: 'pick', minTier: 3 });
addBlock({ key: 'ancient_debris', name: 'Ancient Debris', category: 'natural', color: '#5b3f36', tex: 'ancient_debris', opaque: true, solid: true, hardness: 9.0, tool: 'pick', minTier: 4 });
addBlock({ key: 'amethyst_block', name: 'Block of Amethyst', category: 'natural', color: '#9c6ad8', tex: 'amethyst', opaque: true, solid: true, hardness: 1.5, tool: 'pick', minTier: 1, glow: 0.4, lightColor: '#b57dff' });

// 12 Complete Wood Sets (Log, Planks, Leaves)
const WOOD_SETS: Array<[string, string, string, string, string]> = [
  ['oak', 'Oak', '#6c5132', '#b38a53', '#3b8d2e'],
  ['spruce', 'Spruce', '#45301f', '#755636', '#2e5d34'],
  ['birch', 'Birch', '#d7d3c8', '#c8b67d', '#629c46'],
  ['jungle', 'Jungle', '#5a4927', '#a67550', '#389928'],
  ['acacia', 'Acacia', '#6c645c', '#b55e34', '#559632'],
  ['dark_oak', 'Dark Oak', '#3b2b1d', '#49311c', '#2b6b22'],
  ['mangrove', 'Mangrove', '#573c2f', '#7a352f', '#458732'],
  ['cherry', 'Cherry', '#4c343d', '#e5b3bd', '#f49fc5'],
  ['bamboo', 'Bamboo', '#759638', '#cdb755', '#82aa3a'],
  ['crimson', 'Crimson', '#7a2c44', '#6d3146', '#941f27'],
  ['warped', 'Warped', '#2a6f72', '#2b7a78', '#1f9982'],
  ['pale_oak', 'Pale Oak', '#6e6a6a', '#dbd4ce', '#9da19b'],
];

for (const [wKey, wName, logCol, plankCol, leafCol] of WOOD_SETS) {
  addBlock({
    key: `${wKey}_log`,
    name: `${wName} Log`,
    category: 'wood',
    color: logCol,
    topColor: plankCol,
    tex: `log_${wKey}`,
    topTex: `log_top_${wKey}`,
    opaque: true,
    solid: true,
    hardness: 1.5,
    tool: 'axe',
    minTier: 0,
    flammable: wKey !== 'crimson' && wKey !== 'warped',
  });
  addBlock({
    key: `${wKey}_planks`,
    name: `${wName} Planks`,
    category: 'wood',
    color: plankCol,
    tex: `planks_${wKey}`,
    opaque: true,
    solid: true,
    hardness: 1.4,
    tool: 'axe',
    minTier: 0,
    flammable: wKey !== 'crimson' && wKey !== 'warped',
  });
  addBlock({
    key: `${wKey}_leaves`,
    name: `${wName} Leaves`,
    category: 'wood',
    color: leafCol,
    tex: `leaves_${wKey}`,
    opaque: false,
    solid: true,
    hardness: 0.25,
    tool: 'shears',
    minTier: 0,
    flammable: wKey !== 'crimson' && wKey !== 'warped',
  });
}

// Copper Family
addBlock({ key: 'copper_block', name: 'Block of Copper', category: 'building', color: '#c46a49', tex: 'copper_0', opaque: true, solid: true, hardness: 2.5, tool: 'pick', minTier: 2 });
addBlock({ key: 'exposed_copper', name: 'Exposed Copper', category: 'building', color: '#9c7863', tex: 'copper_1', opaque: true, solid: true, hardness: 2.5, tool: 'pick', minTier: 2 });
addBlock({ key: 'weathered_copper', name: 'Weathered Copper', category: 'building', color: '#6b9478', tex: 'copper_2', opaque: true, solid: true, hardness: 2.5, tool: 'pick', minTier: 2 });
addBlock({ key: 'oxidized_copper', name: 'Oxidized Copper', category: 'building', color: '#4da38b', tex: 'copper_3', opaque: true, solid: true, hardness: 2.5, tool: 'pick', minTier: 2 });
addBlock({ key: 'copper_bulb', name: 'Copper Bulb', category: 'redstone', color: '#d48248', tex: 'copper_bulb', opaque: true, solid: true, hardness: 2.2, tool: 'pick', minTier: 2, glow: 0.85, lightColor: '#ffbe73', emissive: true, circuit: 'lamp', modId: 'industrial_redstone' });

// Nether & End & Cave Biomes
addBlock({ key: 'netherrack', name: 'Netherrack', category: 'natural', color: '#6e2e2e', tex: 'netherrack', opaque: true, solid: true, hardness: 0.6, tool: 'pick', minTier: 1 });
addBlock({ key: 'crimson_nylium', name: 'Crimson Nylium', category: 'natural', color: '#8f2930', tex: 'crimson_nylium', opaque: true, solid: true, hardness: 0.7, tool: 'pick', minTier: 1 });
addBlock({ key: 'warped_nylium', name: 'Warped Nylium', category: 'natural', color: '#267874', tex: 'warped_nylium', opaque: true, solid: true, hardness: 0.7, tool: 'pick', minTier: 1 });
addBlock({ key: 'soul_sand', name: 'Soul Sand', category: 'natural', color: '#524034', tex: 'soul_sand', opaque: true, solid: true, hardness: 0.6, tool: 'shovel', minTier: 0, friction: 0.45 });
addBlock({ key: 'basalt', name: 'Basalt', category: 'natural', color: '#4f4e54', tex: 'basalt', opaque: true, solid: true, hardness: 1.5, tool: 'pick', minTier: 1 });
addBlock({ key: 'blackstone', name: 'Blackstone', category: 'natural', color: '#2e2b33', tex: 'blackstone', opaque: true, solid: true, hardness: 1.8, tool: 'pick', minTier: 1 });
addBlock({ key: 'glowstone', name: 'Glowstone', category: 'building', color: '#f2ca66', tex: 'glowstone', opaque: true, solid: true, hardness: 0.5, tool: 'none', minTier: 0, glow: 1.0, lightColor: '#ffd978', emissive: true });
addBlock({ key: 'magma_block', name: 'Magma Block', category: 'natural', color: '#9e3e1c', tex: 'magma', opaque: true, solid: true, hardness: 0.8, tool: 'pick', minTier: 1, glow: 0.5, lightColor: '#ff5d1c', emissive: true, damage: 1 });
addBlock({ key: 'nether_quartz_ore', name: 'Nether Quartz Ore', category: 'natural', color: '#a87d76', tex: 'quartz_ore', opaque: true, solid: true, hardness: 2.2, tool: 'pick', minTier: 1 });
addBlock({ key: 'end_stone', name: 'End Stone', category: 'natural', color: '#dedaa2', tex: 'end_stone', opaque: true, solid: true, hardness: 2.4, tool: 'pick', minTier: 1 });
addBlock({ key: 'purpur_block', name: 'Purpur Block', category: 'building', color: '#a676a8', tex: 'purpur', opaque: true, solid: true, hardness: 1.8, tool: 'pick', minTier: 1 });
addBlock({ key: 'chorus_plant', name: 'Chorus Plant', category: 'natural', color: '#784e7c', tex: 'chorus', opaque: true, solid: true, hardness: 0.6, tool: 'axe', minTier: 0 });
addBlock({ key: 'sculk', name: 'Sculk', category: 'natural', color: '#142a33', tex: 'sculk', opaque: true, solid: true, hardness: 0.6, tool: 'hoe', minTier: 0, glow: 0.35, lightColor: '#25b5bd' });
addBlock({ key: 'moss_block', name: 'Moss Block', category: 'natural', color: '#588233', tex: 'moss', opaque: true, solid: true, hardness: 0.3, tool: 'hoe', minTier: 0 });
addBlock({ key: 'sulfur_block', name: 'Sulfur Crystal', category: 'mods', color: '#e4c542', tex: 'sulfur', opaque: true, solid: true, hardness: 1.3, tool: 'pick', minTier: 1, glow: 0.45, lightColor: '#ffe159', modId: 'arcane_bosses' });
addBlock({ key: 'cinnabar_block', name: 'Cinnabar Ore', category: 'mods', color: '#c43e36', tex: 'cinnabar', opaque: true, solid: true, hardness: 1.8, tool: 'pick', minTier: 2, modId: 'arcane_bosses' });

// Flora, Farm & Special Physics
addBlock({ key: 'cactus', name: 'Cactus', category: 'natural', color: '#2b8a39', tex: 'cactus', opaque: true, solid: true, hardness: 0.5, tool: 'none', minTier: 0, damage: 1 });
addBlock({ key: 'bamboo_stalk', name: 'Bamboo', category: 'natural', color: '#6ba32f', tex: 'bamboo_stalk', opaque: true, solid: true, hardness: 0.4, tool: 'axe', minTier: 0 });
addBlock({ key: 'hay_bale', name: 'Hay Bale', category: 'building', color: '#d4b342', tex: 'hay_bale', opaque: true, solid: true, hardness: 0.5, tool: 'hoe', minTier: 0, fallReduce: 0.8 });
addBlock({ key: 'slime_block', name: 'Slime Block', category: 'redstone', color: '#70c45c', tex: 'slime_block', opaque: false, solid: true, hardness: 0.2, tool: 'none', minTier: 0, bounce: 0.85, fallReduce: 1.0 });
addBlock({ key: 'honey_block', name: 'Honey Block', category: 'redstone', color: '#eda838', tex: 'honey_block', opaque: false, solid: true, hardness: 0.2, tool: 'none', minTier: 0, friction: 0.35, fallReduce: 0.8 });
addBlock({ key: 'wheat_block', name: 'Golden Wheat', category: 'natural', color: '#d8ba4e', tex: 'wheat', opaque: false, solid: false, hardness: 0.15, tool: 'none', minTier: 0 });
addBlock({ key: 'wildflower', name: 'Wildflowers', category: 'natural', color: '#e6564c', tex: 'wildflower', opaque: false, solid: false, hardness: 0.1, tool: 'none', minTier: 0 });
addBlock({ key: 'glass', name: 'Glass', category: 'building', color: '#ccebf5', tex: 'glass', opaque: false, solid: true, hardness: 0.4, tool: 'none', minTier: 0 });
addBlock({ key: 'fence_oak', name: 'Oak Fence', category: 'building', color: '#a8814a', tex: 'fence', opaque: false, solid: true, hardness: 1.2, tool: 'axe', minTier: 0 });
addBlock({ key: 'bookshelf', name: 'Bookshelf', category: 'building', color: '#8f6c43', tex: 'bookshelf', opaque: true, solid: true, hardness: 1.4, tool: 'axe', minTier: 0 });

// Workstations & Lights
addBlock({ key: 'crafting_table', name: 'Crafting Table', category: 'building', color: '#ab7f49', tex: 'crafting_side', topTex: 'crafting_top', opaque: true, solid: true, hardness: 1.5, tool: 'axe', minTier: 0, workstation: 'crafting' });
addBlock({ key: 'furnace', name: 'Furnace', category: 'building', color: '#75777b', tex: 'furnace', opaque: true, solid: true, hardness: 2.2, tool: 'pick', minTier: 1, workstation: 'furnace' });
addBlock({ key: 'blast_furnace', name: 'Blast Furnace', category: 'building', color: '#585b61', tex: 'blast_furnace', opaque: true, solid: true, hardness: 2.6, tool: 'pick', minTier: 1, workstation: 'blast' });
addBlock({ key: 'smoker', name: 'Smoker', category: 'building', color: '#6b5c49', tex: 'smoker', opaque: true, solid: true, hardness: 2.2, tool: 'pick', minTier: 1, workstation: 'smoker' });
addBlock({ key: 'anvil', name: 'Anvil', category: 'building', color: '#45484f', tex: 'anvil', opaque: true, solid: true, hardness: 3.5, tool: 'pick', minTier: 1, gravity: true, workstation: 'anvil' });
addBlock({ key: 'enchanting_table', name: 'Enchanting Table', category: 'building', color: '#39284f', tex: 'enchant_table', opaque: true, solid: true, hardness: 3.5, tool: 'pick', minTier: 1, glow: 0.45, lightColor: '#8d6eff', workstation: 'enchant' });
addBlock({ key: 'smithing_table', name: 'Smithing Table', category: 'building', color: '#443d47', tex: 'smithing_table', opaque: true, solid: true, hardness: 2.0, tool: 'axe', minTier: 0, workstation: 'smithing' });
addBlock({ key: 'brewing_stand', name: 'Brewing Stand', category: 'building', color: '#b5924a', tex: 'brewing_stand', opaque: false, solid: true, hardness: 1.0, tool: 'pick', minTier: 1, glow: 0.35, lightColor: '#ffba52', workstation: 'brewing' });
addBlock({ key: 'chest', name: 'Chest', category: 'building', color: '#a87b3b', tex: 'chest', opaque: true, solid: true, hardness: 1.5, tool: 'axe', minTier: 0, workstation: 'chest' });
addBlock({ key: 'ender_chest', name: 'Ender Chest', category: 'building', color: '#263a3e', tex: 'ender_chest', opaque: true, solid: true, hardness: 5.0, tool: 'pick', minTier: 1, glow: 0.5, lightColor: '#8558ff', workstation: 'ender_chest' });
addBlock({ key: 'beacon', name: 'Beacon', category: 'mods', color: '#79f2eb', tex: 'beacon', opaque: false, solid: true, hardness: 2.0, tool: 'none', minTier: 0, glow: 1.0, lightColor: '#9cfaff', emissive: true, workstation: 'beacon', modId: 'arcane_bosses' });
addBlock({ key: 'torch', name: 'Torch', category: 'building', color: '#ffbd4a', tex: 'torch', opaque: false, solid: false, hardness: 0.1, tool: 'none', minTier: 0, glow: 0.9, lightColor: '#ffad42', emissive: true });
addBlock({ key: 'lantern', name: 'Lantern', category: 'building', color: '#ffb84d', tex: 'lantern', opaque: false, solid: true, hardness: 1.0, tool: 'pick', minTier: 0, glow: 1.0, lightColor: '#ffb347', emissive: true });
addBlock({ key: 'sea_lantern', name: 'Sea Lantern', category: 'building', color: '#a9ebe2', tex: 'sea_lantern', opaque: true, solid: true, hardness: 0.6, tool: 'none', minTier: 0, glow: 0.95, lightColor: '#9ef5ea', emissive: true });
addBlock({ key: 'nether_portal', name: 'Nether Portal', category: 'building', color: '#9c3dff', tex: 'nether_portal', opaque: false, solid: false, hardness: -1, tool: 'none', minTier: 99, glow: 0.9, lightColor: '#b55cff', emissive: true, portal: 'nether' });
addBlock({ key: 'end_portal', name: 'End Portal', category: 'building', color: '#14172b', tex: 'end_portal', opaque: false, solid: false, hardness: -1, tool: 'none', minTier: 99, glow: 0.6, lightColor: '#56e8c8', emissive: true, portal: 'end' });
addBlock({ key: 'end_crystal', name: 'End Crystal', category: 'building', color: '#ea6bff', tex: 'amethyst', opaque: false, solid: true, hardness: 0.4, tool: 'none', minTier: 0, glow: 0.9, lightColor: '#ff70ff', emissive: true });

// Redstone Engineering Family
addBlock({ key: 'redstone_dust', name: 'Redstone Dust', category: 'redstone', color: '#c41e1e', tex: 'redstone_dust', opaque: false, solid: false, hardness: 0.1, tool: 'none', minTier: 0, circuit: 'dust' });
addBlock({ key: 'redstone_block', name: 'Redstone Block', category: 'redstone', color: '#b5211b', tex: 'redstone_block', opaque: true, solid: true, hardness: 2.5, tool: 'pick', minTier: 1, glow: 0.5, lightColor: '#ff3629', emissive: true, circuit: 'block' });
addBlock({ key: 'redstone_torch', name: 'Redstone Torch', category: 'redstone', color: '#ff3e2e', tex: 'redstone_torch', opaque: false, solid: false, hardness: 0.1, tool: 'none', minTier: 0, glow: 0.65, lightColor: '#ff4233', emissive: true, circuit: 'torch' });
addBlock({ key: 'lever', name: 'Lever', category: 'redstone', color: '#8f795b', tex: 'lever', opaque: false, solid: false, hardness: 0.3, tool: 'none', minTier: 0, circuit: 'lever' });
addBlock({ key: 'stone_button', name: 'Stone Button', category: 'redstone', color: '#828588', tex: 'stone', opaque: false, solid: false, hardness: 0.3, tool: 'none', minTier: 0, circuit: 'button' });
addBlock({ key: 'pressure_plate', name: 'Pressure Plate', category: 'redstone', color: '#b38a53', tex: 'planks_oak', opaque: false, solid: false, hardness: 0.3, tool: 'none', minTier: 0, circuit: 'plate' });
addBlock({ key: 'repeater', name: 'Redstone Repeater', category: 'redstone', color: '#9c8f8f', tex: 'repeater', opaque: false, solid: true, hardness: 0.3, tool: 'none', minTier: 0, circuit: 'repeater' });
addBlock({ key: 'comparator', name: 'Redstone Comparator', category: 'redstone', color: '#9f9494', tex: 'comparator', opaque: false, solid: true, hardness: 0.3, tool: 'none', minTier: 0, circuit: 'comparator' });
addBlock({ key: 'piston', name: 'Piston', category: 'redstone', color: '#9c8664', tex: 'piston', opaque: true, solid: true, hardness: 1.2, tool: 'pick', minTier: 0, circuit: 'piston' });
addBlock({ key: 'sticky_piston', name: 'Sticky Piston', category: 'redstone', color: '#7cb55b', tex: 'sticky_piston', opaque: true, solid: true, hardness: 1.2, tool: 'pick', minTier: 0, circuit: 'sticky_piston' });
addBlock({ key: 'observer', name: 'Observer', category: 'redstone', color: '#58595e', tex: 'observer', opaque: true, solid: true, hardness: 1.8, tool: 'pick', minTier: 1, circuit: 'observer' });
addBlock({ key: 'hopper', name: 'Hopper', category: 'redstone', color: '#4c4e54', tex: 'hopper', opaque: false, solid: true, hardness: 1.8, tool: 'pick', minTier: 1, circuit: 'hopper' });
addBlock({ key: 'dispenser', name: 'Dispenser', category: 'redstone', color: '#6b6d70', tex: 'dispenser', opaque: true, solid: true, hardness: 1.8, tool: 'pick', minTier: 1, circuit: 'dispenser' });
addBlock({ key: 'redstone_lamp', name: 'Redstone Lamp', category: 'redstone', color: '#704d30', tex: 'redstone_lamp', opaque: true, solid: true, hardness: 0.6, tool: 'none', minTier: 0, circuit: 'lamp' });
addBlock({ key: 'tnt', name: 'TNT', category: 'redstone', color: '#d44235', tex: 'tnt', opaque: true, solid: true, hardness: 0.2, tool: 'none', minTier: 0, circuit: 'tnt' });
addBlock({ key: 'daylight_detector', name: 'Daylight Detector', category: 'redstone', color: '#a89f87', tex: 'daylight', opaque: false, solid: true, hardness: 0.4, tool: 'axe', minTier: 0, circuit: 'daylight' });
addBlock({ key: 'sculk_sensor', name: 'Sculk Sensor', category: 'redstone', color: '#1b5d66', tex: 'sculk_sensor', opaque: false, solid: true, hardness: 1.0, tool: 'hoe', minTier: 0, glow: 0.45, lightColor: '#36dae0', circuit: 'sculk_sensor' });

// 16-Color Dyed Wool, Concrete, Glass, Bed (16 Wool + 16 Concrete + Red Bed)
export const DYE_COLORS: Array<[string, string, string]> = [
  ['white', 'White', '#eceef0'],
  ['light_gray', 'Light Gray', '#9da1a4'],
  ['gray', 'Gray', '#4e5256'],
  ['black', 'Black', '#222328'],
  ['brown', 'Brown', '#6e472b'],
  ['red', 'Red', '#b6342c'],
  ['orange', 'Orange', '#eb7a26'],
  ['yellow', 'Yellow', '#f0ca35'],
  ['lime', 'Lime', '#72c22e'],
  ['green', 'Green', '#4b6d22'],
  ['cyan', 'Cyan', '#238a94'],
  ['light_blue', 'Light Blue', '#5bb6e8'],
  ['blue', 'Blue', '#3246aa'],
  ['purple', 'Purple', '#7e34b5'],
  ['magenta', 'Magenta', '#be47b2'],
  ['pink', 'Pink', '#ee88ad'],
];

for (const [cKey, cName, hex] of DYE_COLORS) {
  addBlock({ key: `${cKey}_wool`, name: `${cName} Wool`, category: 'dyed', color: hex, tex: `wool_${cKey}`, opaque: true, solid: true, hardness: 0.8, tool: 'shears', minTier: 0, flammable: true });
  addBlock({ key: `${cKey}_concrete`, name: `${cName} Concrete`, category: 'dyed', color: hex, tex: `concrete_${cKey}`, opaque: true, solid: true, hardness: 1.8, tool: 'pick', minTier: 1 });
}
addBlock({ key: 'red_bed', name: 'Red Bed', category: 'dyed', color: '#c43b33', tex: 'bed', opaque: false, solid: true, hardness: 0.4, tool: 'none', minTier: 0, workstation: 'bed' });

// Non-block Items (>= 1000)
export const ITEMS: Record<number, ItemDef> = {};
export const ITEM_BY_KEY: Record<string, ItemDef> = {};
export const I: Record<string, number> = {};

let nextItemId = 1000;
export function addItem(def: Omit<ItemDef, 'id'>): number {
  const id = nextItemId++;
  const full: ItemDef = { id, ...def };
  ITEMS[id] = full;
  ITEM_BY_KEY[def.key] = full;
  I[def.key] = id;
  return id;
}

// Materials & Resources
addItem({ key: 'stick', name: 'Stick', category: 'wood', color: '#8a6638', icon: 'stick' });
addItem({ key: 'coal', name: 'Coal', category: 'natural', color: '#323539', icon: 'coal' });
addItem({ key: 'copper_ingot', name: 'Copper Ingot', category: 'building', color: '#ce7046', icon: 'ingot' });
addItem({ key: 'iron_ingot', name: 'Iron Ingot', category: 'building', color: '#dcdedf', icon: 'ingot' });
addItem({ key: 'gold_ingot', name: 'Gold Ingot', category: 'building', color: '#f7d547', icon: 'ingot' });
addItem({ key: 'diamond', name: 'Diamond', category: 'building', color: '#5beaf4', icon: 'gem' });
addItem({ key: 'emerald', name: 'Emerald', category: 'building', color: '#45d46e', icon: 'gem' });
addItem({ key: 'lapis_lazuli', name: 'Lapis Lazuli', category: 'building', color: '#3962db', icon: 'gem' });
addItem({ key: 'netherite_ingot', name: 'Netherite Ingot', category: 'building', color: '#4a4245', icon: 'ingot', fireproof: true });
addItem({ key: 'amethyst_shard', name: 'Amethyst Shard', category: 'natural', color: '#b47bff', icon: 'gem' });
addItem({ key: 'blaze_rod', name: 'Blaze Rod', category: 'brewing', color: '#ffae26', icon: 'rod' });
addItem({ key: 'ender_pearl', name: 'Ender Pearl', category: 'brewing', color: '#279e8d', icon: 'orb' });
addItem({ key: 'eye_of_ender', name: 'Eye of Ender', category: 'mods', color: '#49e6b2', icon: 'orb', special: 'eye_of_ender' });
addItem({ key: 'nether_star', name: 'Nether Star', category: 'mods', color: '#f4f0ff', icon: 'star', modId: 'arcane_bosses' });
addItem({ key: 'breeze_rod', name: 'Breeze Rod', category: 'mods', color: '#99c4e6', icon: 'rod', modId: 'sky_glider' });
addItem({ key: 'heavy_core', name: 'Heavy Core', category: 'mods', color: '#494e5a', icon: 'core', modId: 'arcane_bosses' });
addItem({ key: 'flint_and_steel', name: 'Flint and Steel', category: 'tools', color: '#aeb5bf', icon: 'flint', durability: 64, special: 'flint_steel' });
addItem({ key: 'bucket', name: 'Bucket', category: 'tools', color: '#b8bec4', icon: 'bucket', special: 'bucket' });
addItem({ key: 'water_bucket', name: 'Water Bucket', category: 'tools', color: '#3b82e6', icon: 'bucket', special: 'water_bucket' });
addItem({ key: 'lava_bucket', name: 'Lava Bucket', category: 'tools', color: '#ef6a1f', icon: 'bucket', special: 'lava_bucket' });
addItem({ key: 'shears', name: 'Shears', category: 'tools', color: '#c4cad0', icon: 'shears', tool: 'shears', tier: 2, speed: 6, durability: 238 });
addItem({ key: 'bone', name: 'Bone', category: 'natural', color: '#ebe6d4', icon: 'bone', special: 'bone' });
addItem({ key: 'saddle', name: 'Saddle', category: 'tools', color: '#8f5228', icon: 'saddle', special: 'saddle' });
addItem({ key: 'honeycomb', name: 'Honeycomb', category: 'natural', color: '#f0b63d', icon: 'gem', special: 'honeycomb' });
addItem({ key: 'firework_rocket', name: 'Firework Rocket', category: 'mods', color: '#e65847', icon: 'rocket', special: 'firework', modId: 'sky_glider' });

// Tool & Weapon Tiers: Wood -> Stone -> Copper -> Iron -> Gold -> Diamond -> Netherite
const TOOL_TIERS: Array<[string, string, number, number, number, number, string, boolean?]> = [
  ['wood', 'Wooden', 1, 2.2, 4, 59, '#ab8149'],
  ['stone', 'Stone', 2, 4.0, 5, 131, '#8c9096'],
  ['copper', 'Copper', 2, 4.8, 5.5, 190, '#cf7148'],
  ['iron', 'Iron', 3, 6.2, 6, 250, '#dce0e6'],
  ['gold', 'Golden', 2, 10.0, 4.5, 48, '#f5d245'],
  ['diamond', 'Diamond', 4, 8.5, 7, 1561, '#58e8f2'],
  ['netherite', 'Netherite', 5, 10.5, 8.5, 2031, '#52474c', true],
];

for (const [tKey, tName, tier, speed, swordDmg, dur, col, fireproof] of TOOL_TIERS) {
  addItem({ key: `${tKey}_sword`, name: `${tName} Sword`, category: 'combat', color: col, icon: 'sword', tool: 'sword', tier, speed: 1.5, damage: swordDmg, durability: dur, fireproof });
  addItem({ key: `${tKey}_pickaxe`, name: `${tName} Pickaxe`, category: 'tools', color: col, icon: 'pickaxe', tool: 'pick', tier, speed, damage: Math.max(2, swordDmg - 2), durability: dur, fireproof });
  addItem({ key: `${tKey}_axe`, name: `${tName} Axe`, category: 'tools', color: col, icon: 'axe', tool: 'axe', tier, speed, damage: swordDmg + 1, durability: dur, fireproof });
  addItem({ key: `${tKey}_shovel`, name: `${tName} Shovel`, category: 'tools', color: col, icon: 'shovel', tool: 'shovel', tier, speed, damage: 2, durability: dur, fireproof });
}

// Special Weapons & Gear
addItem({ key: 'bow', name: 'Bow', category: 'combat', color: '#9e7442', icon: 'bow', damage: 6, durability: 384, special: 'bow' });
addItem({ key: 'arrow', name: 'Arrow', category: 'combat', color: '#c4b89b', icon: 'arrow' });
addItem({ key: 'shield', name: 'Shield', category: 'combat', color: '#8f6b41', icon: 'shield', durability: 336, special: 'shield' });
addItem({ key: 'mace', name: 'Mace', category: 'mods', color: '#586475', icon: 'mace', tool: 'sword', tier: 5, damage: 9, durability: 500, special: 'mace', modId: 'arcane_bosses' });
addItem({ key: 'trident', name: 'Trident', category: 'combat', color: '#45c7b5', icon: 'trident', tool: 'sword', tier: 4, damage: 8, durability: 250, special: 'trident' });
addItem({ key: 'elytra', name: 'Elytra Wings', category: 'mods', color: '#7a7591', icon: 'elytra', armorSlot: 'chest', armorPoints: 2, durability: 432, special: 'elytra', modId: 'sky_glider' });

// Armor Sets
const ARMOR_SETS: Array<[string, string, number, string, boolean?]> = [
  ['iron', 'Iron', 15, '#dce0e6'],
  ['gold', 'Golden', 11, '#f5d245'],
  ['diamond', 'Diamond', 20, '#58e8f2'],
  ['netherite', 'Netherite', 22, '#4d4448', true],
];
for (const [aKey, aName, totalPts, col, fireproof] of ARMOR_SETS) {
  addItem({ key: `${aKey}_helmet`, name: `${aName} Helmet`, category: 'combat', color: col, icon: 'helmet', armorSlot: 'head', armorPoints: Math.round(totalPts * 0.2), durability: 300, fireproof });
  addItem({ key: `${aKey}_chestplate`, name: `${aName} Chestplate`, category: 'combat', color: col, icon: 'chestplate', armorSlot: 'chest', armorPoints: Math.round(totalPts * 0.4), durability: 400, fireproof });
  addItem({ key: `${aKey}_leggings`, name: `${aName} Leggings`, category: 'combat', color: col, icon: 'leggings', armorSlot: 'legs', armorPoints: Math.round(totalPts * 0.25), durability: 360, fireproof });
  addItem({ key: `${aKey}_boots`, name: `${aName} Boots`, category: 'combat', color: col, icon: 'boots', armorSlot: 'feet', armorPoints: Math.round(totalPts * 0.15), durability: 320, fireproof });
}

// Food & Potions
addItem({ key: 'apple', name: 'Apple', category: 'food', color: '#df3c32', icon: 'apple', food: 4, saturation: 2.4 });
addItem({ key: 'golden_apple', name: 'Golden Apple', category: 'food', color: '#f7d13d', icon: 'apple', food: 4, saturation: 9.6, potionEffect: 'regeneration' });
addItem({ key: 'bread', name: 'Bread', category: 'food', color: '#d49d4c', icon: 'bread', food: 5, saturation: 6 });
addItem({ key: 'wheat', name: 'Wheat', category: 'food', color: '#e2c258', icon: 'wheat' });
addItem({ key: 'raw_beef', name: 'Raw Beef', category: 'food', color: '#c44b45', icon: 'meat', food: 3, saturation: 1.8 });
addItem({ key: 'cooked_beef', name: 'Steak', category: 'food', color: '#7a452d', icon: 'meat', food: 8, saturation: 12.8 });
addItem({ key: 'sweet_berries', name: 'Sweet Berries', category: 'food', color: '#c42741', icon: 'berry', food: 2, saturation: 1.2 });
addItem({ key: 'potion_healing', name: 'Potion of Healing', category: 'brewing', color: '#ef3c5d', icon: 'potion', potionEffect: 'healing' });
addItem({ key: 'potion_swiftness', name: 'Potion of Swiftness', category: 'brewing', color: '#69c9eb', icon: 'potion', potionEffect: 'speed' });
addItem({ key: 'potion_fire_res', name: 'Potion of Fire Resistance', category: 'brewing', color: '#f28735', icon: 'potion', potionEffect: 'fire_resistance' });
addItem({ key: 'potion_night_vision', name: 'Potion of Night Vision', category: 'brewing', color: '#3955c9', icon: 'potion', potionEffect: 'night_vision' });
addItem({ key: 'potion_strength', name: 'Potion of Strength', category: 'brewing', color: '#9c2d31', icon: 'potion', potionEffect: 'strength' });

export function getName(id: number): string {
  if (id < 1000) return BLOCKS[id]?.name ?? 'Unknown Block';
  return ITEMS[id]?.name ?? 'Unknown Item';
}

export function getColor(id: number): string {
  if (id < 1000) return BLOCKS[id]?.color ?? '#888888';
  return ITEMS[id]?.color ?? '#cccccc';
}

export function isTool(id: number): boolean {
  if (id < 1000) return false;
  return Boolean(ITEMS[id]?.tool || ITEMS[id]?.special);
}

export function maxStack(id: number): number {
  if (id >= 1000) {
    const it = ITEMS[id];
    if (it && (it.durability || it.armorSlot || it.special === 'bucket' || it.special === 'water_bucket' || it.special === 'lava_bucket' || it.special === 'saddle' || it.potionEffect)) {
      return 1;
    }
  }
  return 64;
}
