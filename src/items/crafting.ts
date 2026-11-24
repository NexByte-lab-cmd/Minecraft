import { B, I, getName, maxStack } from './registry';

export interface InventorySlot {
  id: number;
  count: number;
  durability?: number;
  enchants?: Record<string, number>;
  canDestroy?: string[];
  canPlaceOn?: string[];
}

export interface Recipe {
  id: string;
  station: 'hand' | 'crafting' | 'furnace' | 'smithing' | 'brewing';
  output: { id: number; count: number };
  inputs: Array<{ id: number; count: number }>;
  category: 'building' | 'tools' | 'combat' | 'redstone' | 'food' | 'brewing';
  pattern?: string[]; // 1..3 rows of 1..3 chars e.g. ['###', ' | ', ' | ']
  key?: Record<string, number>;
}

export const RECIPES: Recipe[] = [
  // Planks from Logs (hand 2x2)
  { id: 'oak_planks', station: 'hand', output: { id: B.oak_planks, count: 4 }, inputs: [{ id: B.oak_log, count: 1 }], category: 'building' },
  { id: 'spruce_planks', station: 'hand', output: { id: B.spruce_planks, count: 4 }, inputs: [{ id: B.spruce_log, count: 1 }], category: 'building' },
  { id: 'birch_planks', station: 'hand', output: { id: B.birch_planks, count: 4 }, inputs: [{ id: B.birch_log, count: 1 }], category: 'building' },
  { id: 'cherry_planks', station: 'hand', output: { id: B.cherry_planks, count: 4 }, inputs: [{ id: B.cherry_log, count: 1 }], category: 'building' },
  { id: 'jungle_planks', station: 'hand', output: { id: B.jungle_planks, count: 4 }, inputs: [{ id: B.jungle_log, count: 1 }], category: 'building' },
  { id: 'sticks', station: 'hand', output: { id: I.stick, count: 4 }, inputs: [{ id: B.oak_planks, count: 2 }], category: 'building', pattern: ['P', 'P'], key: { P: B.oak_planks } },
  { id: 'crafting_table', station: 'hand', output: { id: B.crafting_table, count: 1 }, inputs: [{ id: B.oak_planks, count: 4 }], category: 'building', pattern: ['PP', 'PP'], key: { P: B.oak_planks } },
  { id: 'torch', station: 'hand', output: { id: B.torch, count: 4 }, inputs: [{ id: I.coal, count: 1 }, { id: I.stick, count: 1 }], category: 'building', pattern: ['C', 'S'], key: { C: I.coal, S: I.stick } },

  // Workstations & Structures (3x3 Crafting Table)
  { id: 'furnace', station: 'crafting', output: { id: B.furnace, count: 1 }, inputs: [{ id: B.cobblestone, count: 8 }], category: 'building', pattern: ['CCC', 'C C', 'CCC'], key: { C: B.cobblestone } },
  { id: 'chest', station: 'crafting', output: { id: B.chest, count: 1 }, inputs: [{ id: B.oak_planks, count: 8 }], category: 'building', pattern: ['PPP', 'P P', 'PPP'], key: { P: B.oak_planks } },
  { id: 'lantern', station: 'crafting', output: { id: B.lantern, count: 1 }, inputs: [{ id: B.torch, count: 1 }, { id: I.iron_ingot, count: 2 }], category: 'building', pattern: [' I ', ' T ', ' I '], key: { I: I.iron_ingot, T: B.torch } },
  { id: 'bookshelf', station: 'crafting', output: { id: B.bookshelf, count: 1 }, inputs: [{ id: B.oak_planks, count: 6 }], category: 'building', pattern: ['PPP', 'PPP'], key: { P: B.oak_planks } },
  { id: 'enchanting_table', station: 'crafting', output: { id: B.enchanting_table, count: 1 }, inputs: [{ id: B.obsidian, count: 4 }, { id: I.diamond, count: 2 }], category: 'building', pattern: ['D D', 'OOO', ' O '], key: { O: B.obsidian, D: I.diamond } },
  { id: 'smithing_table', station: 'crafting', output: { id: B.smithing_table, count: 1 }, inputs: [{ id: B.oak_planks, count: 4 }, { id: I.iron_ingot, count: 2 }], category: 'building', pattern: ['II', 'PP', 'PP'], key: { I: I.iron_ingot, P: B.oak_planks } },
  { id: 'anvil', station: 'crafting', output: { id: B.anvil, count: 1 }, inputs: [{ id: I.iron_ingot, count: 7 }], category: 'building', pattern: ['III', ' I ', 'III'], key: { I: I.iron_ingot } },
  { id: 'fence_oak', station: 'crafting', output: { id: B.fence_oak, count: 3 }, inputs: [{ id: B.oak_planks, count: 4 }, { id: I.stick, count: 2 }], category: 'building', pattern: ['PSP', 'PSP'], key: { P: B.oak_planks, S: I.stick } },
  { id: 'red_bed', station: 'crafting', output: { id: B.red_bed, count: 1 }, inputs: [{ id: B.red_wool, count: 3 }, { id: B.oak_planks, count: 3 }], category: 'building', pattern: ['WWW', 'PPP'], key: { W: B.red_wool, P: B.oak_planks } },
  { id: 'beacon', station: 'crafting', output: { id: B.beacon, count: 1 }, inputs: [{ id: B.glass, count: 5 }, { id: B.obsidian, count: 3 }, { id: I.nether_star, count: 1 }], category: 'building', pattern: ['GGG', 'GNG', 'OOO'], key: { G: B.glass, N: I.nether_star, O: B.obsidian } },
  { id: 'stone_bricks', station: 'hand', output: { id: B.stone_bricks, count: 4 }, inputs: [{ id: B.stone, count: 4 }], category: 'building', pattern: ['SS', 'SS'], key: { S: B.stone } },

  // Tools & Weapons
  { id: 'wood_pickaxe', station: 'crafting', output: { id: I.wood_pickaxe, count: 1 }, inputs: [{ id: B.oak_planks, count: 3 }, { id: I.stick, count: 2 }], category: 'tools', pattern: ['MMM', ' S ', ' S '], key: { M: B.oak_planks, S: I.stick } },
  { id: 'stone_pickaxe', station: 'crafting', output: { id: I.stone_pickaxe, count: 1 }, inputs: [{ id: B.cobblestone, count: 3 }, { id: I.stick, count: 2 }], category: 'tools', pattern: ['MMM', ' S ', ' S '], key: { M: B.cobblestone, S: I.stick } },
  { id: 'copper_pickaxe', station: 'crafting', output: { id: I.copper_pickaxe, count: 1 }, inputs: [{ id: I.copper_ingot, count: 3 }, { id: I.stick, count: 2 }], category: 'tools', pattern: ['MMM', ' S ', ' S '], key: { M: I.copper_ingot, S: I.stick } },
  { id: 'iron_pickaxe', station: 'crafting', output: { id: I.iron_pickaxe, count: 1 }, inputs: [{ id: I.iron_ingot, count: 3 }, { id: I.stick, count: 2 }], category: 'tools', pattern: ['MMM', ' S ', ' S '], key: { M: I.iron_ingot, S: I.stick } },
  { id: 'diamond_pickaxe', station: 'crafting', output: { id: I.diamond_pickaxe, count: 1 }, inputs: [{ id: I.diamond, count: 3 }, { id: I.stick, count: 2 }], category: 'tools', pattern: ['MMM', ' S ', ' S '], key: { M: I.diamond, S: I.stick } },

  { id: 'wood_axe', station: 'crafting', output: { id: I.wood_axe, count: 1 }, inputs: [{ id: B.oak_planks, count: 3 }, { id: I.stick, count: 2 }], category: 'tools', pattern: ['MM', 'MS', ' S'], key: { M: B.oak_planks, S: I.stick } },
  { id: 'iron_axe', station: 'crafting', output: { id: I.iron_axe, count: 1 }, inputs: [{ id: I.iron_ingot, count: 3 }, { id: I.stick, count: 2 }], category: 'tools', pattern: ['MM', 'MS', ' S'], key: { M: I.iron_ingot, S: I.stick } },
  { id: 'iron_shovel', station: 'crafting', output: { id: I.iron_shovel, count: 1 }, inputs: [{ id: I.iron_ingot, count: 1 }, { id: I.stick, count: 2 }], category: 'tools', pattern: ['M', 'S', 'S'], key: { M: I.iron_ingot, S: I.stick } },

  { id: 'wood_sword', station: 'crafting', output: { id: I.wood_sword, count: 1 }, inputs: [{ id: B.oak_planks, count: 2 }, { id: I.stick, count: 1 }], category: 'combat', pattern: ['M', 'M', 'S'], key: { M: B.oak_planks, S: I.stick } },
  { id: 'stone_sword', station: 'crafting', output: { id: I.stone_sword, count: 1 }, inputs: [{ id: B.cobblestone, count: 2 }, { id: I.stick, count: 1 }], category: 'combat', pattern: ['M', 'M', 'S'], key: { M: B.cobblestone, S: I.stick } },
  { id: 'iron_sword', station: 'crafting', output: { id: I.iron_sword, count: 1 }, inputs: [{ id: I.iron_ingot, count: 2 }, { id: I.stick, count: 1 }], category: 'combat', pattern: ['M', 'M', 'S'], key: { M: I.iron_ingot, S: I.stick } },
  { id: 'diamond_sword', station: 'crafting', output: { id: I.diamond_sword, count: 1 }, inputs: [{ id: I.diamond, count: 2 }, { id: I.stick, count: 1 }], category: 'combat', pattern: ['M', 'M', 'S'], key: { M: I.diamond, S: I.stick } },
  { id: 'mace', station: 'crafting', output: { id: I.mace, count: 1 }, inputs: [{ id: I.heavy_core, count: 1 }, { id: I.breeze_rod, count: 1 }], category: 'combat', pattern: ['H', 'B'], key: { H: I.heavy_core, B: I.breeze_rod } },
  { id: 'shield', station: 'crafting', output: { id: I.shield, count: 1 }, inputs: [{ id: B.oak_planks, count: 6 }, { id: I.iron_ingot, count: 1 }], category: 'combat', pattern: ['PIP', 'PPP', ' P '], key: { P: B.oak_planks, I: I.iron_ingot } },
  { id: 'bucket', station: 'crafting', output: { id: I.bucket, count: 1 }, inputs: [{ id: I.iron_ingot, count: 3 }], category: 'tools', pattern: ['I I', ' I '], key: { I: I.iron_ingot } },
  { id: 'flint_and_steel', station: 'crafting', output: { id: I.flint_and_steel, count: 1 }, inputs: [{ id: I.iron_ingot, count: 1 }, { id: B.gravel, count: 1 }], category: 'tools' },
  { id: 'eye_of_ender', station: 'hand', output: { id: I.eye_of_ender, count: 1 }, inputs: [{ id: I.ender_pearl, count: 1 }, { id: I.blaze_rod, count: 1 }], category: 'tools' },

  // Armor
  { id: 'iron_chestplate', station: 'crafting', output: { id: I.iron_chestplate, count: 1 }, inputs: [{ id: I.iron_ingot, count: 8 }], category: 'combat', pattern: ['I I', 'III', 'III'], key: { I: I.iron_ingot } },
  { id: 'diamond_chestplate', station: 'crafting', output: { id: I.diamond_chestplate, count: 1 }, inputs: [{ id: I.diamond, count: 8 }], category: 'combat', pattern: ['D D', 'DDD', 'DDD'], key: { D: I.diamond } },

  // Redstone Automation
  { id: 'redstone_torch', station: 'hand', output: { id: B.redstone_torch, count: 1 }, inputs: [{ id: B.redstone_dust, count: 1 }, { id: I.stick, count: 1 }], category: 'redstone', pattern: ['R', 'S'], key: { R: B.redstone_dust, S: I.stick } },
  { id: 'redstone_block', station: 'crafting', output: { id: B.redstone_block, count: 1 }, inputs: [{ id: B.redstone_dust, count: 9 }], category: 'redstone', pattern: ['RRR', 'RRR', 'RRR'], key: { R: B.redstone_dust } },
  { id: 'lever', station: 'hand', output: { id: B.lever, count: 1 }, inputs: [{ id: B.cobblestone, count: 1 }, { id: I.stick, count: 1 }], category: 'redstone', pattern: ['S', 'C'], key: { S: I.stick, C: B.cobblestone } },
  { id: 'repeater', station: 'crafting', output: { id: B.repeater, count: 1 }, inputs: [{ id: B.redstone_torch, count: 2 }, { id: B.redstone_dust, count: 1 }, { id: B.stone, count: 3 }], category: 'redstone', pattern: ['TRT', 'SSS'], key: { T: B.redstone_torch, R: B.redstone_dust, S: B.stone } },
  { id: 'comparator', station: 'crafting', output: { id: B.comparator, count: 1 }, inputs: [{ id: B.redstone_torch, count: 3 }, { id: B.stone, count: 3 }], category: 'redstone' },
  { id: 'piston', station: 'crafting', output: { id: B.piston, count: 1 }, inputs: [{ id: B.oak_planks, count: 3 }, { id: B.cobblestone, count: 4 }, { id: I.iron_ingot, count: 1 }, { id: B.redstone_dust, count: 1 }], category: 'redstone', pattern: ['PPP', 'CIC', 'CRC'], key: { P: B.oak_planks, C: B.cobblestone, I: I.iron_ingot, R: B.redstone_dust } },
  { id: 'sticky_piston', station: 'hand', output: { id: B.sticky_piston, count: 1 }, inputs: [{ id: B.piston, count: 1 }, { id: B.slime_block, count: 1 }], category: 'redstone', pattern: ['S', 'P'], key: { S: B.slime_block, P: B.piston } },
  { id: 'redstone_lamp', station: 'crafting', output: { id: B.redstone_lamp, count: 1 }, inputs: [{ id: B.glowstone, count: 1 }, { id: B.redstone_dust, count: 4 }], category: 'redstone', pattern: [' R ', 'RGR', ' R '], key: { R: B.redstone_dust, G: B.glowstone } },
  { id: 'tnt', station: 'crafting', output: { id: B.tnt, count: 1 }, inputs: [{ id: B.sand, count: 4 }, { id: B.sulfur_block, count: 2 }], category: 'redstone' },

  // Food & Smelting
  { id: 'bread', station: 'crafting', output: { id: I.bread, count: 1 }, inputs: [{ id: I.wheat, count: 3 }], category: 'food', pattern: ['WWW'], key: { W: I.wheat } },
  { id: 'golden_apple', station: 'crafting', output: { id: I.golden_apple, count: 1 }, inputs: [{ id: I.apple, count: 1 }, { id: I.gold_ingot, count: 8 }], category: 'food', pattern: ['GGG', 'GAG', 'GGG'], key: { G: I.gold_ingot, A: I.apple } },
  { id: 'smelt_iron', station: 'furnace', output: { id: I.iron_ingot, count: 1 }, inputs: [{ id: B.iron_ore, count: 1 }, { id: I.coal, count: 1 }], category: 'building' },
  { id: 'smelt_copper', station: 'furnace', output: { id: I.copper_ingot, count: 1 }, inputs: [{ id: B.copper_ore, count: 1 }, { id: I.coal, count: 1 }], category: 'building' },
  { id: 'smelt_gold', station: 'furnace', output: { id: I.gold_ingot, count: 1 }, inputs: [{ id: B.gold_ore, count: 1 }, { id: I.coal, count: 1 }], category: 'building' },
  { id: 'smelt_netherite', station: 'furnace', output: { id: I.netherite_ingot, count: 1 }, inputs: [{ id: B.ancient_debris, count: 2 }, { id: I.gold_ingot, count: 2 }], category: 'building' },
  { id: 'smelt_glass', station: 'furnace', output: { id: B.glass, count: 1 }, inputs: [{ id: B.sand, count: 1 }, { id: I.coal, count: 1 }], category: 'building' },
  { id: 'smelt_steak', station: 'furnace', output: { id: I.cooked_beef, count: 1 }, inputs: [{ id: I.raw_beef, count: 1 }, { id: I.coal, count: 1 }], category: 'food' },

  // Smithing Upgrades (Diamond -> Netherite)
  { id: 'smith_netherite_sword', station: 'smithing', output: { id: I.netherite_sword, count: 1 }, inputs: [{ id: I.diamond_sword, count: 1 }, { id: I.netherite_ingot, count: 1 }], category: 'combat' },
  { id: 'smith_netherite_pickaxe', station: 'smithing', output: { id: I.netherite_pickaxe, count: 1 }, inputs: [{ id: I.diamond_pickaxe, count: 1 }, { id: I.netherite_ingot, count: 1 }], category: 'tools' },
  { id: 'smith_netherite_chest', station: 'smithing', output: { id: I.netherite_chestplate, count: 1 }, inputs: [{ id: I.diamond_chestplate, count: 1 }, { id: I.netherite_ingot, count: 1 }], category: 'combat' },

  // Brewing Potions
  { id: 'brew_healing', station: 'brewing', output: { id: I.potion_healing, count: 1 }, inputs: [{ id: I.apple, count: 1 }, { id: I.blaze_rod, count: 1 }], category: 'brewing' },
  { id: 'brew_swiftness', station: 'brewing', output: { id: I.potion_swiftness, count: 1 }, inputs: [{ id: I.sweet_berries, count: 2 }, { id: I.blaze_rod, count: 1 }], category: 'brewing' },
  { id: 'brew_fire_res', station: 'brewing', output: { id: I.potion_fire_res, count: 1 }, inputs: [{ id: B.magma_block, count: 1 }, { id: I.blaze_rod, count: 1 }], category: 'brewing' },
  { id: 'brew_strength', station: 'brewing', output: { id: I.potion_strength, count: 1 }, inputs: [{ id: I.blaze_rod, count: 2 }], category: 'brewing' },
];

export const ENCHANTMENTS: Array<{ key: string; name: string; maxLevel: number; target: 'tool' | 'weapon' | 'armor' }> = [
  { key: 'efficiency', name: 'Efficiency', maxLevel: 5, target: 'tool' },
  { key: 'unbreaking', name: 'Unbreaking', maxLevel: 3, target: 'tool' },
  { key: 'fortune', name: 'Fortune', maxLevel: 3, target: 'tool' },
  { key: 'silk_touch', name: 'Silk Touch', maxLevel: 1, target: 'tool' },
  { key: 'mending', name: 'Mending', maxLevel: 1, target: 'tool' },
  { key: 'sharpness', name: 'Sharpness', maxLevel: 5, target: 'weapon' },
  { key: 'fire_aspect', name: 'Fire Aspect', maxLevel: 2, target: 'weapon' },
  { key: 'knockback', name: 'Knockback', maxLevel: 2, target: 'weapon' },
  { key: 'protection', name: 'Protection', maxLevel: 4, target: 'armor' },
  { key: 'feather_falling', name: 'Feather Falling', maxLevel: 4, target: 'armor' },
];

/**
 * Interactive 2x2 or 3x3 crafting grid pattern matcher (translation invariant inside grid).
 */
export function matchCraftingGrid(
  grid: Array<number | null>,
  gridSize: 2 | 3,
): { recipeId: string; id: number; count: number } | null {
  let minR: number = gridSize;
  let maxR = -1;
  let minC: number = gridSize;
  let maxC = -1;
  const presentCounts = new Map<number, number>();

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const id = grid[r * gridSize + c];
      if (id !== null && id > 0) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        presentCounts.set(id, (presentCounts.get(id) || 0) + 1);
      }
    }
  }
  if (maxR < 0) return null;

  const subH = maxR - minR + 1;
  const subW = maxC - minC + 1;

  for (const r of RECIPES) {
    if (r.station !== 'hand' && r.station !== 'crafting') continue;
    if (r.pattern && r.key) {
      const pH = r.pattern.length;
      const pW = r.pattern[0].length;
      if (pH !== subH || pW !== subW) continue;
      let ok = true;
      for (let rr = 0; rr < pH && ok; rr++) {
        for (let cc = 0; cc < pW && ok; cc++) {
          const ch = r.pattern[rr][cc];
          const expected = ch === ' ' ? null : r.key[ch];
          const actual = grid[(minR + rr) * gridSize + (minC + cc)];
          if ((actual ?? null) !== (expected ?? null)) ok = false;
        }
      }
      if (ok) return { recipeId: r.id, id: r.output.id, count: r.output.count };
    } else {
      // Shapeless match: exact multiset match of 1-per-cell items
      const totalReq = r.inputs.reduce((a, b) => a + b.count, 0);
      let totalGrid = 0;
      for (const cnt of presentCounts.values()) totalGrid += cnt;
      if (totalGrid !== totalReq) continue;
      const ok = r.inputs.every((req) => (presentCounts.get(req.id) || 0) === req.count);
      if (ok) return { recipeId: r.id, id: r.output.id, count: r.output.count };
    }
  }
  return null;
}

export function countInventoryItem(slots: Array<InventorySlot | null>, itemId: number): number {
  let total = 0;
  for (const s of slots) {
    if (s && s.id === itemId) total += s.count;
  }
  return total;
}

export function addItemToInventory(
  slots: Array<InventorySlot | null>,
  id: number,
  count: number,
  durability?: number,
): number {
  let remaining = count;
  const limit = maxStack(id);
  if (limit > 1) {
    for (let i = 0; i < slots.length && remaining > 0; i++) {
      const slot = slots[i];
      if (slot && slot.id === id && slot.count < limit) {
        const add = Math.min(limit - slot.count, remaining);
        slot.count += add;
        remaining -= add;
      }
    }
  }
  for (let i = 0; i < slots.length && remaining > 0; i++) {
    if (!slots[i]) {
      const add = Math.min(limit, remaining);
      slots[i] = { id, count: add, ...(durability !== undefined ? { durability } : {}) };
      remaining -= add;
    }
  }
  return remaining;
}

export function removeItemFromInventory(
  slots: Array<InventorySlot | null>,
  id: number,
  count: number,
): boolean {
  if (countInventoryItem(slots, id) < count) return false;
  let remaining = count;
  for (let i = 0; i < slots.length && remaining > 0; i++) {
    const slot = slots[i];
    if (slot && slot.id === id) {
      const take = Math.min(slot.count, remaining);
      slot.count -= take;
      remaining -= take;
      if (slot.count <= 0) slots[i] = null;
    }
  }
  return true;
}

export function canCraftRecipe(
  recipe: Recipe,
  slots: Array<InventorySlot | null>,
  availableStations: Set<Recipe['station']>,
): boolean {
  if (!availableStations.has(recipe.station)) return false;
  return recipe.inputs.every((req) => countInventoryItem(slots, req.id) >= req.count);
}

export function craftRecipe(
  recipe: Recipe,
  slots: Array<InventorySlot | null>,
  availableStations: Set<Recipe['station']>,
): { crafted: boolean; reason?: string } {
  if (!canCraftRecipe(recipe, slots, availableStations)) {
    return { crafted: false, reason: `Requires ${recipe.station} and ingredients for ${getName(recipe.output.id)}` };
  }
  for (const req of recipe.inputs) {
    removeItemFromInventory(slots, req.id, req.count);
  }
  const leftover = addItemToInventory(slots, recipe.output.id, recipe.output.count);
  if (leftover > 0) {
    for (const req of recipe.inputs) {
      addItemToInventory(slots, req.id, req.count);
    }
    return { crafted: false, reason: 'Inventory full' };
  }
  return { crafted: true };
}
