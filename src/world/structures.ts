import { B } from '../items/registry';
import { hash3 } from './noise';
import type { RealmId } from '../network/commands';

export type PutBlockFn = (x: number, y: number, z: number, id: number, overwrite?: boolean) => void;

export function placeTree(
  put: PutBlockFn,
  x: number,
  y: number,
  z: number,
  type: string,
  seed: number,
): void {
  const r = hash3(x, y, z, seed);
  if (type === 'cactus') {
    const h = 2 + Math.floor(r * 3);
    for (let dy = 1; dy <= h; dy++) put(x, y + dy, z, B.cactus);
    return;
  }
  if (type === 'mushroom') {
    const h = 4 + Math.floor(r * 2);
    for (let dy = 1; dy <= h; dy++) put(x, y + dy, z, B.birch_log);
    const cap = r > 0.5 ? B.red_wool : B.brown_wool;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        put(x + dx, y + h + 1, z + dz, cap);
      }
    }
    return;
  }
  if (type === 'chorus') {
    const h = 4 + Math.floor(r * 4);
    for (let dy = 1; dy <= h; dy++) put(x, y + dy, z, B.chorus_plant);
    put(x + 1, y + h, z, B.chorus_plant);
    put(x - 1, y + h - 1, z, B.chorus_plant);
    put(x, y + h + 1, z, B.purpur_block);
    return;
  }

  let logId = B.oak_log;
  let leafId = B.oak_leaves;
  let height = 4 + Math.floor(r * 3);

  switch (type) {
    case 'birch':
      logId = B.birch_log;
      leafId = B.birch_leaves;
      height = 5 + Math.floor(r * 3);
      break;
    case 'spruce':
      logId = B.spruce_log;
      leafId = B.spruce_leaves;
      height = 6 + Math.floor(r * 4);
      break;
    case 'jungle':
      logId = B.jungle_log;
      leafId = B.jungle_leaves;
      height = 8 + Math.floor(r * 5);
      break;
    case 'acacia':
      logId = B.acacia_log;
      leafId = B.acacia_leaves;
      height = 5 + Math.floor(r * 2);
      break;
    case 'dark_oak':
      logId = B.dark_oak_log;
      leafId = B.dark_oak_leaves;
      height = 5 + Math.floor(r * 2);
      break;
    case 'mangrove':
      logId = B.mangrove_log;
      leafId = B.mangrove_leaves;
      height = 5 + Math.floor(r * 2);
      break;
    case 'cherry':
      logId = B.cherry_log;
      leafId = B.cherry_leaves;
      height = 5 + Math.floor(r * 3);
      break;
    case 'pale_oak':
      logId = B.pale_oak_log;
      leafId = B.pale_oak_leaves;
      height = 5 + Math.floor(r * 3);
      break;
    case 'crimson':
      logId = B.crimson_log;
      leafId = B.crimson_leaves;
      height = 5 + Math.floor(r * 3);
      break;
    case 'warped':
      logId = B.warped_log;
      leafId = B.warped_leaves;
      height = 5 + Math.floor(r * 3);
      break;
  }

  for (let dy = 1; dy <= height; dy++) {
    put(x, y + dy, z, logId, true);
  }

  if (type === 'spruce') {
    for (let dy = 2; dy <= height + 1; dy++) {
      const rad = dy === height + 1 ? 0 : Math.max(1, 2 - ((dy - 2) >> 1));
      for (let dx = -rad; dx <= rad; dx++) {
        for (let dz = -rad; dz <= rad; dz++) {
          if (rad >= 2 && Math.abs(dx) === rad && Math.abs(dz) === rad) continue;
          put(x + dx, y + dy, z + dz, leafId);
        }
      }
    }
    return;
  }

  const canopyBase = Math.max(2, height - 2);
  for (let dy = canopyBase; dy <= height + 1; dy++) {
    const rad = dy >= height ? 1 : 2;
    for (let dx = -rad; dx <= rad; dx++) {
      for (let dz = -rad; dz <= rad; dz++) {
        if (Math.abs(dx) === rad && Math.abs(dz) === rad && (dy === height + 1 || hash3(x + dx, y + dy, z + dz, seed) < 0.45)) {
          continue;
        }
        put(x + dx, y + dy, z + dz, leafId);
      }
    }
  }
}

export function buildSpawnHaven(put: PutBlockFn, realm: RealmId): void {
  if (realm === 'overworld') {
    // 1. Two-Story Timber & Cobblestone Lodge (-15..-5, y: 66..75, z: -13..-4)
    const lx0 = -15, lx1 = -5, lz0 = -13, lz1 = -4, baseY = 66;
    for (let x = lx0; x <= lx1; x++) {
      for (let z = lz0; z <= lz1; z++) {
        put(x, 65, z, B.cobblestone, true);
        const isWall = x === lx0 || x === lx1 || z === lz0 || z === lz1;
        const isCorner = (x === lx0 || x === lx1) && (z === lz0 || z === lz1);
        const isDoor = z === lz1 && (x === -10 || x === -9);

        // Ground floor (66..69)
        for (let y = baseY; y <= baseY + 3; y++) {
          if (isCorner) {
            put(x, y, z, B.oak_log, true);
          } else if (isWall) {
            if (isDoor && y <= baseY + 1) {
              put(x, y, z, B.air, true);
            } else if ((x === -12 || x === -7 || z === -9 || z === -7) && (y === baseY + 1 || y === baseY + 2)) {
              put(x, y, z, B.glass, true);
            } else {
              put(x, y, z, B.cobblestone, true);
            }
          } else {
            put(x, y, z, B.air, true);
          }
        }

        // Second floor deck & balcony (70..73)
        put(x, baseY + 4, z, B.oak_planks, true);
        for (let y = baseY + 5; y <= baseY + 7; y++) {
          if (isCorner) {
            put(x, y, z, B.oak_log, true);
          } else if (isWall) {
            if (z === lz1 && y === baseY + 5) {
              put(x, y, z, B.fence_oak, true);
            } else if (z === lz1) {
              put(x, y, z, B.air, true);
            } else if ((x === -12 || x === -7) && y === baseY + 6) {
              put(x, y, z, B.glass, true);
            } else {
              put(x, y, z, B.oak_planks, true);
            }
          } else {
            put(x, y, z, B.air, true);
          }
        }
      }
    }

    // Pitched Spruce Roof
    for (let step = 0; step <= 4; step++) {
      for (let x = lx0 - 1; x <= lx1 + 1; x++) {
        for (let z = lz0 + step; z <= lz1 - step; z++) {
          if (z === lz0 + step || z === lz1 - step || step === 4) {
            put(x, baseY + 8 + Math.floor(step * 0.8), z, B.spruce_planks, true);
          }
        }
      }
    }

    // Chimney
    for (let y = baseY; y <= baseY + 12; y++) {
      put(-6, y, -12, B.cobblestone, true);
    }

    // Lodge Lanterns & Furnishings
    put(lx0, baseY + 2, lz1 + 1, B.lantern, true);
    put(lx1, baseY + 2, lz1 + 1, B.lantern, true);
    put(-11, baseY + 6, lz1, B.lantern, true);
    put(-8, baseY + 6, lz1, B.lantern, true);
    put(-13, baseY, -11, B.crafting_table, true);
    put(-12, baseY, -11, B.furnace, true);
    put(-11, baseY, -11, B.chest, true);
    put(-7, baseY, -11, B.red_bed, true);
    put(-6, baseY, -10, B.enchanting_table, true);
    put(-10, baseY + 5, -11, B.bookshelf, true);
    put(-9, baseY + 5, -11, B.smithing_table, true);

    // 2. Fenced Farm Pen (-17..-8, z: -1..6)
    for (let x = -17; x <= -8; x++) {
      for (let z = -1; z <= 6; z++) {
        put(x, 65, z, B.grass, true);
        if (x === -17 || x === -8 || z === -1 || z === 6) {
          if (!(x === -12 && z === 6)) {
            put(x, 66, z, B.fence_oak, true);
          }
        }
      }
    }
    put(-17, 67, -1, B.lantern, true);
    put(-8, 67, 6, B.lantern, true);

    // 3. Wooden River Bridge (x: 1..12, z: -2..0)
    for (let x = 1; x <= 12; x++) {
      for (let z = -2; z <= 0; z++) {
        put(x, 65, z, B.oak_planks, true);
        if (z === -2 || z === 0) {
          if (x % 3 === 0) {
            put(x, 66, z, B.fence_oak, true);
            if (x === 3 || x === 9) put(x, 67, z, B.lantern, true);
          }
        } else {
          put(x, 66, z, B.air, true);
        }
      }
    }

    // 4. Wheat Patch & Lantern Garden (x: 12..17, z: 1..6)
    for (let x = 12; x <= 17; x++) {
      for (let z = 1; z <= 6; z++) {
        put(x, 65, z, B.dirt, true);
        put(x, 66, z, (x + z) % 5 === 0 ? B.wildflower : B.wheat_block, true);
      }
    }
    put(11, 66, 2, B.fence_oak, true);
    put(11, 67, 2, B.lantern, true);
    put(16, 66, 6, B.fence_oak, true);
    put(16, 67, 6, B.lantern, true);
    for (let dy = 0; dy < 4; dy++) put(11, 66 + dy, -5, B.bamboo_stalk, true);

    // 5. Active Glowing Obsidian Nether Portal (x: 13..16, z: -11)
    for (let x = 13; x <= 16; x++) {
      for (let y = 66; y <= 70; y++) {
        const frame = x === 13 || x === 16 || y === 66 || y === 70;
        put(x, y, -11, frame ? B.obsidian : B.nether_portal, true);
      }
    }
    put(12, 66, -10, B.fence_oak, true);
    put(12, 67, -10, B.lantern, true);
    put(17, 66, -10, B.fence_oak, true);
    put(17, 67, -10, B.lantern, true);

    // 6. Towering 3-wide Mountain Waterfall Cascade plunging into splash pool (-19..-17, z: -34..-18)
    for (let y = 62; y <= 94; y++) {
      const zPos = -34 + Math.floor((94 - y) * 0.42);
      put(-19, y, zPos, B.water, true);
      put(-18, y, zPos, B.water, true);
      put(-17, y, zPos, B.water, true);
      // Wet mossy stone lip beside waterfall
      put(-20, y, zPos, B.mossy_cobblestone, true);
      put(-16, y, zPos, B.mossy_cobblestone, true);
    }
    for (let px = -21; px <= -15; px++) {
      for (let pz = -23; pz <= -17; pz++) {
        put(px, 62, pz, B.water, true);
        put(px, 61, pz, B.sand, true);
      }
    }

    // 7. Waterfront Stone & Brick Belltower + Waterwheel Harbor (x: 20..28, z: 4..14)
    for (let x = 21; x <= 27; x++) {
      for (let z = 6; z <= 12; z++) {
        put(x, 65, z, B.stone_bricks, true);
        const wall = x === 21 || x === 27 || z === 6 || z === 12;
        const corner = (x === 21 || x === 27) && (z === 6 || z === 12);
        const door = x === 21 && z === 9;
        for (let y = 66; y <= 73; y++) {
          if (corner) put(x, y, z, B.oak_log, true);
          else if (wall) {
            if (door && y <= 67) put(x, y, z, B.air, true);
            else if (y === 69 && (x === 24 || z === 9)) put(x, y, z, B.glass, true);
            else put(x, y, z, y < 70 ? B.bricks : B.spruce_planks, true);
          } else {
            put(x, y, z, B.air, true);
          }
        }
      }
    }
    // Tall Belltower Spire & Copper Roof
    for (let x = 23; x <= 25; x++) {
      for (let z = 8; z <= 10; z++) {
        for (let y = 74; y <= 82; y++) {
          const edge = x === 23 || x === 25 || z === 8 || z === 10;
          if (y === 82) put(x, y, z, B.oxidized_copper, true);
          else if (y >= 78 && y <= 80 && !edge) put(x, y, z, B.glowstone, true);
          else if (edge) put(x, y, z, y >= 78 ? B.oak_log : B.bricks, true);
        }
      }
    }
    put(24, 83, 9, B.copper_block, true);
    put(24, 84, 9, B.lantern, true);
    // Harbor Waterwheel on river edge (x: 19, z: 7..11)
    for (let dz = -2; dz <= 2; dz++) {
      for (let dy = -2; dy <= 2; dy++) {
        const d2 = dz * dz + dy * dy;
        if (d2 >= 2 && d2 <= 5) {
          put(19, 65 + dy, 9 + dz, B.spruce_planks, true);
        }
      }
    }
    put(19, 65, 9, B.oak_log, true);

    // 8. Crystal Bay Sea-Lantern Reefs & Stepping Stones (x: 10..22, z: 42..56)
    put(14, 54, 46, B.sea_lantern, true);
    put(18, 53, 52, B.sea_lantern, true);
    put(22, 55, 48, B.moss_block, true);

    // 9. Lush Cherry Blossom & Oak/Spruce Grove framing Spawn Haven
    placeTree(put, 31, 65, -24, 'cherry', 101);
    placeTree(put, 38, 65, -30, 'cherry', 202);
    placeTree(put, 44, 65, -20, 'cherry', 606);
    placeTree(put, 26, 65, -20, 'oak', 303);
    placeTree(put, 19, 65, 16, 'oak', 404);
    placeTree(put, -22, 65, 12, 'spruce', 505);
    placeTree(put, -26, 65, -8, 'cherry', 707);
  } else if (realm === 'nether') {
    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        put(x, 42, z, B.blackstone, true);
        for (let y = 43; y <= 49; y++) put(x, y, z, B.air, true);
      }
    }
    for (let x = 2; x <= 5; x++) {
      for (let y = 43; y <= 47; y++) {
        const frame = x === 2 || x === 5 || y === 43 || y === 47;
        put(x, y, -3, frame ? B.obsidian : B.nether_portal, true);
      }
    }
    put(-3, 43, -3, B.glowstone, true);
    put(-3, 43, 3, B.glowstone, true);
  } else if (realm === 'end') {
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        put(x, 67, z, B.obsidian, true);
      }
    }
    put(0, 68, 0, B.end_portal, true);
    const angles = [0, 1, 2, 3, 4, 5];
    for (const i of angles) {
      const ang = (i / angles.length) * Math.PI * 2;
      const px = Math.round(Math.cos(ang) * 28);
      const pz = Math.round(Math.sin(ang) * 28);
      const top = 76 + (i % 3) * 5;
      for (let y = 55; y <= top; y++) {
        for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
            put(px + dx, y, pz + dz, B.obsidian, true);
          }
        }
      }
      put(px, top + 1, pz, B.bedrock, true);
      put(px, top + 2, pz, B.end_crystal, true);
    }
  }
}

export type BlueprintType = 'watchtower' | 'cherry_shrine' | 'stone_keep' | 'bridge';

export function placeBlueprintStructure(
  put: PutBlockFn,
  type: BlueprintType,
  ox: number,
  oy: number,
  oz: number,
): void {
  if (type === 'watchtower') {
    for (let y = 0; y <= 9; y++) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
          if (y === 0) put(ox + dx, oy + y, oz + dz, B.stone_bricks, true);
          else if (y === 9 && edge) put(ox + dx, oy + y, oz + dz, (dx + dz) % 2 === 0 ? B.stone_bricks : B.air, true);
          else if (edge) put(ox + dx, oy + y, oz + dz, y % 4 === 0 ? B.oak_log : B.cobblestone, true);
          else put(ox + dx, oy + y, oz + dz, y === 8 ? B.oak_planks : B.air, true);
        }
      }
    }
    put(ox, oy + 1, oz + 2, B.air, true);
    put(ox, oy + 2, oz + 2, B.air, true);
    put(ox, oy + 9, oz, B.lantern, true);
  } else if (type === 'cherry_shrine') {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        put(ox + dx, oy, oz + dz, B.stone_bricks, true);
      }
    }
    for (let y = 1; y <= 4; y++) {
      put(ox - 2, oy + y, oz - 2, B.cherry_log, true);
      put(ox + 2, oy + y, oz - 2, B.cherry_log, true);
      put(ox - 2, oy + y, oz + 2, B.cherry_log, true);
      put(ox + 2, oy + y, oz + 2, B.cherry_log, true);
    }
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        put(ox + dx, oy + 5, oz + dz, B.cherry_planks, true);
      }
    }
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        put(ox + dx, oy + 6, oz + dz, B.cherry_leaves, true);
      }
    }
    put(ox, oy + 1, oz, B.amethyst_block, true);
    put(ox, oy + 2, oz, B.lantern, true);
  } else if (type === 'stone_keep') {
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        put(ox + dx, oy, oz + dz, B.stone_bricks, true);
        const wall = Math.abs(dx) === 4 || Math.abs(dz) === 4;
        for (let y = 1; y <= 5; y++) {
          if (wall && !(dx === 0 && dz === 4 && y <= 2)) {
            put(ox + dx, oy + y, oz + dz, y === 5 && (dx + dz) % 2 === 0 ? B.air : B.stone_bricks, true);
          } else {
            put(ox + dx, oy + y, oz + dz, B.air, true);
          }
        }
      }
    }
    put(ox, oy + 1, oz, B.beacon, true);
  } else {
    // bridge
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = 0; dz <= 10; dz++) {
        put(ox + dx, oy, oz + dz, B.oak_planks, true);
        if ((dx === -1 || dx === 1) && dz % 3 === 0) {
          put(ox + dx, oy + 1, oz + dz, B.fence_oak, true);
          put(ox + dx, oy + 2, oz + dz, B.lantern, true);
        }
      }
    }
  }
}
