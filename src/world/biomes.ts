import { B } from '../items/registry';
import { SeededNoise } from './noise';
import type { RealmId } from '../network/commands';

export interface BiomeDef {
  id: string;
  name: string;
  realm: RealmId;
  topBlock: number;
  subBlock: number;
  stoneBlock: number;
  treeType: 'oak' | 'birch' | 'spruce' | 'jungle' | 'acacia' | 'dark_oak' | 'mangrove' | 'cherry' | 'pale_oak' | 'crimson' | 'warped' | 'chorus' | 'cactus' | 'mushroom' | 'none';
  treeDensity: number;
  flowerDensity: number;
  grassTint: string;
  fogTint: string;
  hostileAllowed: boolean;
}

export const BIOMES: Record<string, BiomeDef> = {
  // Overworld Flatlands
  plains: { id: 'plains', name: 'Plains', realm: 'overworld', topBlock: B.grass, subBlock: B.dirt, stoneBlock: B.stone, treeType: 'oak', treeDensity: 0.004, flowerDensity: 0.03, grassTint: '#6cb840', fogTint: '#9ac8f2', hostileAllowed: true },
  sunflower_plains: { id: 'sunflower_plains', name: 'Sunflower Plains', realm: 'overworld', topBlock: B.grass, subBlock: B.dirt, stoneBlock: B.stone, treeType: 'oak', treeDensity: 0.002, flowerDensity: 0.08, grassTint: '#78c444', fogTint: '#9ed0f5', hostileAllowed: true },
  meadow: { id: 'meadow', name: 'Meadow', realm: 'overworld', topBlock: B.grass, subBlock: B.dirt, stoneBlock: B.stone, treeType: 'oak', treeDensity: 0.008, flowerDensity: 0.09, grassTint: '#65b84d', fogTint: '#9bcdf5', hostileAllowed: true },
  snowy_plains: { id: 'snowy_plains', name: 'Snowy Plains', realm: 'overworld', topBlock: B.snow, subBlock: B.dirt, stoneBlock: B.stone, treeType: 'spruce', treeDensity: 0.003, flowerDensity: 0, grassTint: '#d8e8f5', fogTint: '#c9dcf0', hostileAllowed: true },
  ice_spikes: { id: 'ice_spikes', name: 'Ice Spikes', realm: 'overworld', topBlock: B.snow, subBlock: B.packed_ice, stoneBlock: B.blue_ice, treeType: 'none', treeDensity: 0, flowerDensity: 0, grassTint: '#b4d8fa', fogTint: '#c2ddf5', hostileAllowed: true },

  // Forests & Woodlands
  forest: { id: 'forest', name: 'Forest', realm: 'overworld', topBlock: B.grass, subBlock: B.dirt, stoneBlock: B.stone, treeType: 'oak', treeDensity: 0.028, flowerDensity: 0.03, grassTint: '#59a637', fogTint: '#8dc2ed', hostileAllowed: true },
  flower_forest: { id: 'flower_forest', name: 'Flower Forest', realm: 'overworld', topBlock: B.grass, subBlock: B.dirt, stoneBlock: B.stone, treeType: 'birch', treeDensity: 0.022, flowerDensity: 0.14, grassTint: '#62b33d', fogTint: '#99ccf5', hostileAllowed: true },
  birch_forest: { id: 'birch_forest', name: 'Birch Forest', realm: 'overworld', topBlock: B.grass, subBlock: B.dirt, stoneBlock: B.stone, treeType: 'birch', treeDensity: 0.028, flowerDensity: 0.02, grassTint: '#72b046', fogTint: '#99cbf0', hostileAllowed: true },
  dark_forest: { id: 'dark_forest', name: 'Dark Forest', realm: 'overworld', topBlock: B.grass, subBlock: B.dirt, stoneBlock: B.stone, treeType: 'dark_oak', treeDensity: 0.042, flowerDensity: 0.01, grassTint: '#3e6e2b', fogTint: '#597485', hostileAllowed: true },
  pale_garden: { id: 'pale_garden', name: 'Pale Garden', realm: 'overworld', topBlock: B.grass, subBlock: B.dirt, stoneBlock: B.stone, treeType: 'pale_oak', treeDensity: 0.032, flowerDensity: 0.01, grassTint: '#8e968f', fogTint: '#aeb6bd', hostileAllowed: true },
  taiga: { id: 'taiga', name: 'Taiga', realm: 'overworld', topBlock: B.podzol, subBlock: B.dirt, stoneBlock: B.stone, treeType: 'spruce', treeDensity: 0.03, flowerDensity: 0.01, grassTint: '#487a43', fogTint: '#84b0d4', hostileAllowed: true },
  snowy_taiga: { id: 'snowy_taiga', name: 'Snowy Taiga', realm: 'overworld', topBlock: B.snow, subBlock: B.dirt, stoneBlock: B.stone, treeType: 'spruce', treeDensity: 0.028, flowerDensity: 0, grassTint: '#9cbdc7', fogTint: '#b9d4ea', hostileAllowed: true },
  jungle: { id: 'jungle', name: 'Jungle', realm: 'overworld', topBlock: B.grass, subBlock: B.dirt, stoneBlock: B.stone, treeType: 'jungle', treeDensity: 0.038, flowerDensity: 0.03, grassTint: '#47b82a', fogTint: '#8ad4b8', hostileAllowed: true },
  bamboo_jungle: { id: 'bamboo_jungle', name: 'Bamboo Jungle', realm: 'overworld', topBlock: B.grass, subBlock: B.dirt, stoneBlock: B.stone, treeType: 'jungle', treeDensity: 0.025, flowerDensity: 0.02, grassTint: '#52c230', fogTint: '#92dbb5', hostileAllowed: true },
  cherry_grove: { id: 'cherry_grove', name: 'Cherry Grove', realm: 'overworld', topBlock: B.grass, subBlock: B.dirt, stoneBlock: B.stone, treeType: 'cherry', treeDensity: 0.024, flowerDensity: 0.12, grassTint: '#82c45a', fogTint: '#f5d2df', hostileAllowed: true },

  // Dry & Warm
  desert: { id: 'desert', name: 'Desert', realm: 'overworld', topBlock: B.sand, subBlock: B.sandstone, stoneBlock: B.stone, treeType: 'cactus', treeDensity: 0.008, flowerDensity: 0, grassTint: '#d8c57b', fogTint: '#f0dcb0', hostileAllowed: true },
  savanna: { id: 'savanna', name: 'Savanna', realm: 'overworld', topBlock: B.grass, subBlock: B.coarse_dirt, stoneBlock: B.stone, treeType: 'acacia', treeDensity: 0.009, flowerDensity: 0.01, grassTint: '#9ead44', fogTint: '#e3c898', hostileAllowed: true },
  badlands: { id: 'badlands', name: 'Badlands', realm: 'overworld', topBlock: B.red_sand, subBlock: B.red_sand, stoneBlock: B.granite, treeType: 'cactus', treeDensity: 0.004, flowerDensity: 0, grassTint: '#bd6c3a', fogTint: '#e3ac86', hostileAllowed: true },

  // Mountains & Peaks
  windswept_hills: { id: 'windswept_hills', name: 'Windswept Hills', realm: 'overworld', topBlock: B.grass, subBlock: B.stone, stoneBlock: B.stone, treeType: 'spruce', treeDensity: 0.006, flowerDensity: 0.01, grassTint: '#5e9950', fogTint: '#93bce0', hostileAllowed: true },
  jagged_peaks: { id: 'jagged_peaks', name: 'Jagged Peaks', realm: 'overworld', topBlock: B.snow, subBlock: B.stone, stoneBlock: B.calcite, treeType: 'none', treeDensity: 0, flowerDensity: 0, grassTint: '#eef5fc', fogTint: '#c8def0', hostileAllowed: true },
  stony_peaks: { id: 'stony_peaks', name: 'Stony Peaks', realm: 'overworld', topBlock: B.stone, subBlock: B.calcite, stoneBlock: B.andesite, treeType: 'none', treeDensity: 0, flowerDensity: 0, grassTint: '#96999c', fogTint: '#adc3d6', hostileAllowed: true },

  // Wetlands, Coasts & Oceans
  swamp: { id: 'swamp', name: 'Swamp', realm: 'overworld', topBlock: B.grass, subBlock: B.mud, stoneBlock: B.stone, treeType: 'oak', treeDensity: 0.014, flowerDensity: 0.02, grassTint: '#4f6e3c', fogTint: '#7a9486', hostileAllowed: true },
  mangrove_swamp: { id: 'mangrove_swamp', name: 'Mangrove Swamp', realm: 'overworld', topBlock: B.mud, subBlock: B.mud, stoneBlock: B.stone, treeType: 'mangrove', treeDensity: 0.025, flowerDensity: 0.01, grassTint: '#5e8740', fogTint: '#80a391', hostileAllowed: true },
  river: { id: 'river', name: 'River', realm: 'overworld', topBlock: B.sand, subBlock: B.clay, stoneBlock: B.stone, treeType: 'none', treeDensity: 0, flowerDensity: 0, grassTint: '#65a846', fogTint: '#8dc2ed', hostileAllowed: true },
  beach: { id: 'beach', name: 'Beach', realm: 'overworld', topBlock: B.sand, subBlock: B.sand, stoneBlock: B.stone, treeType: 'none', treeDensity: 0, flowerDensity: 0, grassTint: '#d8cb86', fogTint: '#9fd0f5', hostileAllowed: true },
  warm_ocean: { id: 'warm_ocean', name: 'Warm Ocean', realm: 'overworld', topBlock: B.sand, subBlock: B.sandstone, stoneBlock: B.stone, treeType: 'none', treeDensity: 0, flowerDensity: 0, grassTint: '#48b8d0', fogTint: '#8ecae6', hostileAllowed: true },
  frozen_ocean: { id: 'frozen_ocean', name: 'Frozen Ocean', realm: 'overworld', topBlock: B.gravel, subBlock: B.stone, stoneBlock: B.stone, treeType: 'none', treeDensity: 0, flowerDensity: 0, grassTint: '#89b8e6', fogTint: '#bed8f0', hostileAllowed: true },
  mushroom_fields: { id: 'mushroom_fields', name: 'Mushroom Fields', realm: 'overworld', topBlock: B.mycelium, subBlock: B.dirt, stoneBlock: B.stone, treeType: 'mushroom', treeDensity: 0.018, flowerDensity: 0, grassTint: '#8f7999', fogTint: '#b4a5cc', hostileAllowed: false },

  // Nether Dimension
  nether_wastes: { id: 'nether_wastes', name: 'Nether Wastes', realm: 'nether', topBlock: B.netherrack, subBlock: B.netherrack, stoneBlock: B.netherrack, treeType: 'none', treeDensity: 0, flowerDensity: 0, grassTint: '#8a2b2b', fogTint: '#3c1111', hostileAllowed: true },
  crimson_forest: { id: 'crimson_forest', name: 'Crimson Forest', realm: 'nether', topBlock: B.crimson_nylium, subBlock: B.netherrack, stoneBlock: B.netherrack, treeType: 'crimson', treeDensity: 0.028, flowerDensity: 0, grassTint: '#a62630', fogTint: '#4d1018', hostileAllowed: true },
  warped_forest: { id: 'warped_forest', name: 'Warped Forest', realm: 'nether', topBlock: B.warped_nylium, subBlock: B.netherrack, stoneBlock: B.netherrack, treeType: 'warped', treeDensity: 0.028, flowerDensity: 0, grassTint: '#24948c', fogTint: '#113a40', hostileAllowed: true },
  soul_sand_valley: { id: 'soul_sand_valley', name: 'Soul Sand Valley', realm: 'nether', topBlock: B.soul_sand, subBlock: B.soul_sand, stoneBlock: B.basalt, treeType: 'none', treeDensity: 0, flowerDensity: 0, grassTint: '#594438', fogTint: '#1a2f3a', hostileAllowed: true },
  basalt_deltas: { id: 'basalt_deltas', name: 'Basalt Deltas', realm: 'nether', topBlock: B.basalt, subBlock: B.blackstone, stoneBlock: B.blackstone, treeType: 'none', treeDensity: 0, flowerDensity: 0, grassTint: '#4c4b52', fogTint: '#36343d', hostileAllowed: true },

  // The End Dimension
  end_central: { id: 'end_central', name: 'The End Sanctuary', realm: 'end', topBlock: B.end_stone, subBlock: B.end_stone, stoneBlock: B.end_stone, treeType: 'none', treeDensity: 0, flowerDensity: 0, grassTint: '#e3df9e', fogTint: '#140c21', hostileAllowed: true },
  end_highlands: { id: 'end_highlands', name: 'End Highlands', realm: 'end', topBlock: B.end_stone, subBlock: B.end_stone, stoneBlock: B.end_stone, treeType: 'chorus', treeDensity: 0.015, flowerDensity: 0, grassTint: '#ded999', fogTint: '#170f29', hostileAllowed: true },
};

export const SEA_LEVEL = 62;
export const NETHER_LAVA_LEVEL = 31;

export interface TerrainSample {
  height: number;
  biome: BiomeDef;
  caveBiome: 'lush' | 'dripstone' | 'deep_dark' | 'sulfur' | 'normal';
  riverMask: number;
}

export function sampleTerrain(noise: SeededNoise, x: number, z: number, realm: RealmId): TerrainSample {
  if (realm === 'nether') {
    const t = noise.fbm2(x * 0.0028, z * 0.0028, 3, 120);
    const h = noise.fbm2(x * 0.0028, z * 0.0028, 3, 440);
    let biome = BIOMES.nether_wastes;
    if (t > 0.28) biome = h > 0 ? BIOMES.crimson_forest : BIOMES.basalt_deltas;
    else if (t < -0.26) biome = h > 0 ? BIOMES.warped_forest : BIOMES.soul_sand_valley;
    const base = 42 + noise.fbm2(x * 0.012, z * 0.012, 3, 99) * 24;
    return { height: Math.max(12, Math.min(96, Math.floor(base))), biome, caveBiome: 'normal', riverMask: 0 };
  }

  if (realm === 'end') {
    const dist = Math.hypot(x, z);
    if (dist < 62) {
      const dome = 60 + Math.max(0, 8 - dist * 0.12) + noise.fbm2(x * 0.03, z * 0.03, 2, 55) * 3;
      return { height: Math.floor(dome), biome: BIOMES.end_central, caveBiome: 'normal', riverMask: 0 };
    }
    const islandNoise = noise.fbm2(x * 0.012, z * 0.012, 3, 300);
    if (islandNoise > 0.08 && dist > 110) {
      const h = 58 + islandNoise * 26;
      return { height: Math.floor(h), biome: BIOMES.end_highlands, caveBiome: 'normal', riverMask: 0 };
    }
    return { height: -999, biome: BIOMES.end_highlands, caveBiome: 'normal', riverMask: 0 };
  }

  // Starter Haven Basin around spawn (-95..95) featuring Lodge, River, Cherry Hills, Snow Mountain & Crystal Ocean Cliff Bay
  const havenDist = Math.hypot(x, z);
  const riverCenter = 7 + Math.sin(z * 0.06) * 4.5;
  const riverDist = Math.abs(x - riverCenter);

  if (havenDist < 96) {
    // Dramatic jagged snow-capped mountain peak in the north-west (-19, -40)
    const peakDist = Math.hypot(x + 19, z + 40);
    const peak =
      peakDist < 30
        ? Math.max(0, (30 - peakDist) * 1.55 + noise.fbm2(x * 0.095, z * 0.095, 2, 12) * 4.2)
        : 0;
    const westHill = Math.max(0, 10 - Math.hypot(x + 36, z - 8) * 0.24);
    const eastCherryHill = Math.max(0, 11 - Math.hypot(x - 42, z + 26) * 0.26);
    const gentle = 65 + Math.sin(x * 0.06) * 1.1 + Math.cos(z * 0.05) * 1.1;

    let h = gentle + peak + westHill + eastCherryHill;

    // Crystal Deep Ocean Bay + Coastal Cliff drop-off on South-East (z > 22) matching coastal cliff POV screenshot
    const bayDist = Math.hypot(x - 16, z - 52);
    if (bayDist < 34) {
      const drop = Math.max(0, Math.min(1, (34 - bayDist) / 11));
      const bayFloor = 52 + noise.fbm2(x * 0.14, z * 0.14, 2, 77) * 3.2;
      h = h * (1 - drop) + bayFloor * drop;
    }

    // Scenic river channel feeding into bay
    if (riverDist < 5.5 && z > -42 && z < 60) {
      const depth = Math.cos((riverDist / 5.5) * (Math.PI * 0.5)) * 6.5;
      h = Math.min(h, 64.5 - depth);
    }

    // Flatten lodge, farm courtyard & east keep terrace
    if (x >= -20 && x <= 3 && z >= -15 && z <= 18) {
      h = 65;
    }
    if (x >= 11 && x <= 29 && z >= -16 && z <= 16) {
      h = 65;
    }

    let biome = BIOMES.meadow;
    if (h > 85) biome = BIOMES.jagged_peaks;
    else if (bayDist < 28 && h < SEA_LEVEL) biome = BIOMES.warm_ocean;
    else if (riverDist < 4.5 && h < SEA_LEVEL) biome = BIOMES.river;
    else if (x > 25 && z < -12) biome = BIOMES.cherry_grove;

    return { height: Math.floor(h), biome, caveBiome: 'lush', riverMask: riverDist < 4.5 ? 1 : 0 };
  }

  // Multi-noise procedural Overworld ("Biggest Map Ever")
  const cont = noise.fbm2(x * 0.0022, z * 0.0022, 4, 0);
  const erosion = noise.fbm2(x * 0.004, z * 0.004, 3, 140);
  const temp = noise.fbm2(x * 0.0016, z * 0.0016, 3, 710) * 1.65;
  const humid = noise.fbm2(x * 0.0016, z * 0.0016, 3, 1330) * 1.65;
  const weird = noise.fbm2(x * 0.005, z * 0.005, 3, 2100);
  const riverVal = Math.abs(noise.fbm2(x * 0.0035, z * 0.0035, 2, 3200));

  let h = SEA_LEVEL + 4 + cont * 28 + erosion * 10;
  if (cont > 0.15) {
    const mountain = Math.max(0, weird * 1.4);
    h += mountain * mountain * 65;
  }
  const isRiver = riverVal < 0.032 && cont > -0.15;
  if (isRiver) {
    h = Math.min(h, SEA_LEVEL - 4);
  }
  h = Math.max(12, Math.min(148, Math.floor(h)));

  // Cave biome selection
  const caveRoll = noise.fbm2(x * 0.006, z * 0.006, 2, 4500);
  let caveBiome: TerrainSample['caveBiome'] = 'normal';
  if (caveRoll > 0.35) caveBiome = 'lush';
  else if (caveRoll < -0.38) caveBiome = 'deep_dark';
  else if (weird > 0.35) caveBiome = 'dripstone';
  else if (temp > 0.45) caveBiome = 'sulfur';

  // Biome selection
  let biome = BIOMES.plains;
  if (h < SEA_LEVEL - 2) {
    if (isRiver) biome = BIOMES.river;
    else if (temp < -0.35) biome = BIOMES.frozen_ocean;
    else if (temp > 0.35) biome = BIOMES.warm_ocean;
    else biome = BIOMES.warm_ocean;
  } else if (h <= SEA_LEVEL + 1 && !isRiver) {
    biome = BIOMES.beach;
  } else if (h >= 104) {
    biome = temp < 0.1 ? BIOMES.jagged_peaks : BIOMES.stony_peaks;
  } else if (h >= 84) {
    biome = BIOMES.windswept_hills;
  } else if (weird > 0.52 && cont < 0.05) {
    biome = BIOMES.mushroom_fields;
  } else if (temp > 0.38) {
    if (humid < -0.15) biome = BIOMES.desert;
    else if (humid < 0.15) biome = BIOMES.badlands;
    else if (humid > 0.42) biome = weird > 0 ? BIOMES.bamboo_jungle : BIOMES.jungle;
    else biome = BIOMES.savanna;
  } else if (temp < -0.35) {
    if (humid > 0.15) biome = BIOMES.snowy_taiga;
    else biome = weird > 0.25 ? BIOMES.ice_spikes : BIOMES.snowy_plains;
  } else if (humid > 0.38) {
    biome = weird > 0.1 ? BIOMES.mangrove_swamp : BIOMES.swamp;
  } else if (humid > 0.12) {
    if (weird > 0.25) biome = BIOMES.cherry_grove;
    else if (weird < -0.25) biome = BIOMES.dark_forest;
    else if (temp < -0.05) biome = BIOMES.taiga;
    else if (humid > 0.26) biome = BIOMES.flower_forest;
    else biome = BIOMES.forest;
  } else {
    if (weird > 0.28) biome = BIOMES.pale_garden;
    else if (weird < -0.2) biome = BIOMES.birch_forest;
    else biome = temp > 0.15 ? BIOMES.sunflower_plains : BIOMES.meadow;
  }

  return { height: h, biome, caveBiome, riverMask: isRiver ? 1 : 0 };
}

export const TELEPORT_BIOME_PRESETS: Array<{ id: string; label: string; realm: RealmId; x: number; z: number }> = [
  { id: 'haven', label: 'Sunset Voxel Haven (Spawn)', realm: 'overworld', x: -2, z: 10 },
  { id: 'coastal', label: 'Crystal Ocean Cliffs & Keep', realm: 'overworld', x: 16, z: 22 },
  { id: 'cherry', label: 'Cherry Blossom Grove', realm: 'overworld', x: 38, z: -28 },
  { id: 'desert', label: 'Sunbaked Desert & Temples', realm: 'overworld', x: 420, z: -260 },
  { id: 'badlands', label: 'Eroded Badlands', realm: 'overworld', x: -460, z: 310 },
  { id: 'ice_spikes', label: 'Frozen Ice Spikes', realm: 'overworld', x: -520, z: -480 },
  { id: 'jungle', label: 'Emerald Jungle Canopy', realm: 'overworld', x: 540, z: 420 },
  { id: 'nether', label: 'The Nether (Crimson & Lava)', realm: 'nether', x: 0, z: 0 },
  { id: 'end', label: 'The End (Dragon Citadel)', realm: 'end', x: 0, z: 24 },
];
