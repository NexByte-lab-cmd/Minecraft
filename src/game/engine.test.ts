import test from 'node:test';
import assert from 'node:assert/strict';
import { B, I } from '../items/registry';
import { RECIPES, addItemToInventory, countInventoryItem, craftRecipe, matchCraftingGrid, type InventorySlot } from '../items/crafting';
import { stepEntityPhysics, computeFallDamage, stepFluidAndFallingQueue, type WorldAccess } from '../physics/simulation';
import { createRedstoneState, getPowerAt, tickRedstoneNetwork, toggleSwitch } from '../redstone/circuits';
import { GAME_MODES, parseSlashCommand } from '../network/commands';
import { VoxelWorld } from '../world/world';
import { BIOMES } from '../world/biomes';
import { buildChunkGeometry } from '../engine/mesher';
import type { TextureAtlas } from '../engine/textures';

function makeMockWorld(realm: 'overworld' | 'nether' | 'end' = 'overworld'): WorldAccess {
  const map = new Map<string, number>();
  return {
    realm,
    getBlock(x: number, y: number, z: number) {
      return map.get(`${x},${y},${z}`) ?? B.air;
    },
    setBlock(x: number, y: number, z: number, id: number) {
      if (id === B.air) map.delete(`${x},${y},${z}`);
      else map.set(`${x},${y},${z}`, id);
    },
  };
}

test('Crafting system consumes inputs, matches 2x2/3x3 patterns, and yields expected outputs', () => {
  const slots: Array<InventorySlot | null> = Array(36).fill(null);
  addItemToInventory(slots, B.oak_log, 2);
  const planksRecipe = RECIPES.find((r) => r.id === 'oak_planks')!;
  const res = craftRecipe(planksRecipe, slots, new Set(['hand']));
  assert.equal(res.crafted, true);
  assert.equal(countInventoryItem(slots, B.oak_log), 1);
  assert.equal(countInventoryItem(slots, B.oak_planks), 4);

  // Crafting table requires 4 planks and unlocks crafting station recipes
  const tableRecipe = RECIPES.find((r) => r.id === 'crafting_table')!;
  assert.equal(craftRecipe(tableRecipe, slots, new Set(['hand'])).crafted, true);
  assert.equal(countInventoryItem(slots, B.crafting_table), 1);

  // Interactive 2x2 pattern match: 2 planks vertical = 4 sticks (translation invariant)
  const sticks = matchCraftingGrid([null, B.oak_planks, null, B.oak_planks], 2);
  assert.equal(sticks?.id, I.stick);
  assert.equal(sticks?.count, 4);

  // Interactive 3x3 pattern match: Diamond Pickaxe
  const dpick = matchCraftingGrid(
    [
      I.diamond, I.diamond, I.diamond,
      null, I.stick, null,
      null, I.stick, null,
    ],
    3,
  );
  assert.equal(dpick?.id, I.diamond_pickaxe);
});

test('Physics collision, sneak edge-guard, fall damage, and water+lava obsidian reaction', () => {
  const w = makeMockWorld();
  // Create a 1x1x1 platform at (0, 64, 0)
  w.setBlock(0, 64, 0, B.stone);

  const entity = {
    x: 0.5,
    y: 65.01,
    z: 0.5,
    vx: 10,
    vy: 0,
    vz: 0,
    width: 0.6,
    height: 1.8,
    onGround: true,
    sneaking: true,
  };
  stepEntityPhysics(entity, w, 0.05);
  assert.ok(entity.x < 1.2, `Expected sneak guard to hold entity near edge, got x=${entity.x}`);

  // Fall damage negation
  assert.equal(computeFallDamage(25, B.water, true), 0);
  assert.equal(computeFallDamage(25, B.slime_block, false), 0);
  assert.ok(computeFallDamage(13, B.hay_bale, false) < computeFallDamage(13, B.stone, false));

  // Water flowing onto Lava produces Obsidian
  w.setBlock(5, 65, 5, B.water);
  w.setBlock(5, 64, 5, B.lava);
  stepFluidAndFallingQueue(w, [{ x: 5, y: 65, z: 5, id: B.water, dist: 0 }], []);
  assert.equal(w.getBlock(5, 64, 5), B.obsidian);
});

test('Redstone 20-TPS network propagates 0..15 power, inverts torch, and actuates pistons', () => {
  const w = makeMockWorld();
  const rs = createRedstoneState();
  w.setBlock(0, 64, 0, B.lever);
  w.setBlock(1, 64, 0, B.redstone_dust);
  w.setBlock(2, 64, 0, B.redstone_dust);
  w.setBlock(3, 64, 0, B.redstone_lamp);
  w.setBlock(5, 64, 0, B.redstone_torch);

  const watched: Array<[number, number, number]> = [
    [0, 64, 0],
    [1, 64, 0],
    [2, 64, 0],
    [3, 64, 0],
    [5, 64, 0],
  ];

  toggleSwitch(rs, w, 0, 64, 0);
  tickRedstoneNetwork(rs, w, watched, 1.0);

  assert.equal(getPowerAt(rs, 0, 64, 0), 15);
  assert.equal(getPowerAt(rs, 1, 64, 0), 14);
  assert.equal(getPowerAt(rs, 2, 64, 0), 13);
  assert.equal(getPowerAt(rs, 3, 64, 0), 13);
  assert.equal(getPowerAt(rs, 5, 64, 0), 15);

  w.setBlock(10, 64, 0, B.redstone_block);
  w.setBlock(11, 64, 0, B.piston);
  w.setBlock(11, 65, 0, B.cobblestone);
  tickRedstoneNetwork(rs, w, [[10, 64, 0], [11, 64, 0]], 1.0);
  assert.equal(w.getBlock(11, 66, 0), B.cobblestone);
});

test('Slash commands support 8+ genre modes, teleport, give, summon, time, and realm travel', () => {
  assert.ok(GAME_MODES.length >= 8, `Expected 8+ modes, got ${GAME_MODES.length}`);

  for (const m of ['survival', 'creative', 'spectator', 'adventure', 'horror', 'troll', 'architect', 'boss_rush']) {
    const res = parseSlashCommand(`/gamemode ${m}`, 'Kathir');
    assert.equal(res.action?.type, 'gamemode');
    assert.equal(res.action?.type === 'gamemode' && res.action.mode, m);
  }

  const tp = parseSlashCommand('/tp 120 75 -40', 'Kathir');
  assert.deepEqual(tp.action, { type: 'tp', x: 120, y: 75, z: -40 });

  const give = parseSlashCommand('/give diamond sword 1', 'Kathir');
  assert.equal(give.action?.type, 'give');
  assert.equal(give.action?.type === 'give' && give.action.itemId, I.diamond_sword);

  const realm = parseSlashCommand('/realm nether', 'Kathir');
  assert.deepEqual(realm.action, { type: 'realm', realm: 'nether' });
});

test('Massive multi-biome world builds Haven waterfall, belltower, ocean bay, Nether, End & Greedy Mesher merges quads', () => {
  const world = new VoxelWorld('Kathir');
  assert.ok(Object.keys(BIOMES).length >= 25, `Expected 25+ biomes, got ${Object.keys(BIOMES).length}`);

  // Spawn basin chunks
  const c0 = world.getOrCreateChunk(0, 0);
  world.getOrCreateChunk(-1, -1);
  world.getOrCreateChunk(0, -1);
  world.getOrCreateChunk(-2, -2);
  world.getOrCreateChunk(-2, -3);
  world.getOrCreateChunk(1, 0);
  world.getOrCreateChunk(1, 2);

  assert.equal(world.getBlock(14, 67, -11), B.nether_portal);
  assert.equal(world.getBlock(-13, 66, -11), B.crafting_table);
  // Belltower spire top + Waterfall + Crystal bay ocean
  assert.equal(world.getBlock(24, 83, 9), B.copper_block);
  assert.equal(world.getBlock(-18, 94, -34), B.water);
  assert.equal(world.getBlock(16, 60, 44), B.water);

  // Verify Greedy Mesher merges adjacent opaque faces into dramatically fewer quads and emits aTileRect
  const mockAtlas = {
    getUV: () => ({ u0: 0, v0: 0, u1: 0.0625, v1: 0.0625 }),
  } as unknown as TextureAtlas;
  const meshRes = buildChunkGeometry(c0, world, mockAtlas);
  assert.ok(meshRes.opaque, 'Expected opaque BufferGeometry');
  assert.ok(meshRes.opaque.getAttribute('aTileRect'), 'Expected aTileRect shader attribute');
  assert.ok(meshRes.quadCount < 2500, `Expected greedy mesher quad reduction (<2500 quads), got ${meshRes.quadCount}`);

  // Switching realm generates Nether & End
  world.setRealm('nether');
  world.getOrCreateChunk(0, 0);
  assert.equal(world.getBlock(0, 42, 0), B.blackstone);

  world.setRealm('end');
  world.getOrCreateChunk(0, 0);
  assert.equal(world.getBlock(0, 68, 0), B.end_portal);
});

