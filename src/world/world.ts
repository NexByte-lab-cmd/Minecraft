import { B, BLOCKS } from '../items/registry';
import { SeededNoise, hash3 } from './noise';
import { NETHER_LAVA_LEVEL, SEA_LEVEL, sampleTerrain, type BiomeDef } from './biomes';
import { buildSpawnHaven, placeTree } from './structures';
import type { RealmId } from '../network/commands';
import type { WorldAccess } from '../physics/simulation';

export const CHUNK_SIZE = 16;
export const Y_MIN = -32;
export const Y_MAX = 160;
export const CHUNK_HEIGHT = Y_MAX - Y_MIN; // 192 blocks vertical

export interface ChunkData {
  cx: number;
  cz: number;
  realm: RealmId;
  blocks: Uint16Array; // 16 * 192 * 16
  heightMap: Int16Array; // 16 * 16 top solid Y
  dirty: boolean;
}

export function chunkKey(cx: number, cz: number, realm: RealmId): string {
  return `${realm}:${cx},${cz}`;
}

export function blockIndex(lx: number, y: number, lz: number): number {
  return lx + 16 * lz + 256 * (y - Y_MIN);
}

export class VoxelWorld implements WorldAccess {
  public realm: RealmId = 'overworld';
  public seedStr: string;
  public noise: SeededNoise;
  public chunks = new Map<string, ChunkData>();
  public edits = new Map<string, number>(); // "realm:x,y,z" -> blockId
  private structureCache = new Map<string, Map<string, number>>(); // chunkKey -> map of "x,y,z" -> id
  public watchedRedstone = new Map<string, [number, number, number]>();

  constructor(seed = 'Kathir') {
    this.seedStr = seed;
    this.noise = new SeededNoise(seed);
    this.prebuildHavenStructures();
  }

  public setSeed(seed: string): void {
    this.seedStr = seed;
    this.noise = new SeededNoise(seed);
    this.chunks.clear();
    this.edits.clear();
    this.structureCache.clear();
    this.watchedRedstone.clear();
    this.prebuildHavenStructures();
  }

  public setRealm(realm: RealmId): void {
    this.realm = realm;
    this.structureCache.clear();
    this.prebuildHavenStructures();
  }

  private prebuildHavenStructures(): void {
    const put = (x: number, y: number, z: number, id: number) => {
      if (y < Y_MIN || y >= Y_MAX) return;
      const cx = Math.floor(x / 16);
      const cz = Math.floor(z / 16);
      const ck = chunkKey(cx, cz, this.realm);
      let map = this.structureCache.get(ck);
      if (!map) {
        map = new Map();
        this.structureCache.set(ck, map);
      }
      map.set(`${x},${y},${z}`, id);
    };
    buildSpawnHaven(put, this.realm);
  }

  public getOrCreateChunk(cx: number, cz: number): ChunkData {
    const key = chunkKey(cx, cz, this.realm);
    const existing = this.chunks.get(key);
    if (existing) return existing;

    const blocks = new Uint16Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);
    const heightMap = new Int16Array(CHUNK_SIZE * CHUNK_SIZE);
    const x0 = cx * CHUNK_SIZE;
    const z0 = cz * CHUNK_SIZE;
    const seedInt = this.noise.seedInt;
    const pendingTrees: Array<{ x: number; y: number; z: number; type: string }> = [];

    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const wx = x0 + lx;
        const wz = z0 + lz;
        const sample = sampleTerrain(this.noise, wx, wz, this.realm);
        const h = sample.height;
        const biome = sample.biome;

        if (this.realm === 'end') {
          if (h > -100) {
            for (let y = Math.max(Y_MIN, h - 10); y <= h; y++) {
              blocks[blockIndex(lx, y, lz)] = B.end_stone;
            }
            if (biome.treeType === 'chorus' && lx >= 2 && lx <= 13 && lz >= 2 && lz <= 13 && hash3(wx, h, wz, seedInt) < biome.treeDensity) {
              pendingTrees.push({ x: wx, y: h, z: wz, type: 'chorus' });
            }
          }
          heightMap[lx + 16 * lz] = h > -100 ? h : Y_MIN;
          continue;
        }

        if (this.realm === 'nether') {
          for (let y = Y_MIN; y < Y_MAX; y++) {
            if (y <= Y_MIN + 1 || y >= 126) {
              blocks[blockIndex(lx, y, lz)] = B.bedrock;
            } else if (y <= h) {
              const id = y === h ? biome.topBlock : y >= h - 3 ? biome.subBlock : biome.stoneBlock;
              const nOre = hash3(wx >> 1, y >> 1, wz >> 1, seedInt + 55);
              blocks[blockIndex(lx, y, lz)] = y < h - 3 && nOre < 0.015 ? B.nether_quartz_ore : y < 22 && nOre > 0.992 ? B.ancient_debris : id;
            } else if (y <= NETHER_LAVA_LEVEL) {
              blocks[blockIndex(lx, y, lz)] = B.lava;
            } else if (y >= 115) {
              blocks[blockIndex(lx, y, lz)] = B.netherrack;
            }
          }
          if (h > NETHER_LAVA_LEVEL + 1 && biome.treeType !== 'none' && lx >= 2 && lx <= 13 && lz >= 2 && lz <= 13) {
            if (hash3(wx, h, wz, seedInt + 88) < biome.treeDensity) {
              pendingTrees.push({ x: wx, y: h, z: wz, type: biome.treeType });
            }
          }
          heightMap[lx + 16 * lz] = h;
          continue;
        }

        // Overworld column
        const isHavenZone = Math.hypot(wx, wz) < 62;
        for (let y = Y_MIN; y <= Math.max(h, SEA_LEVEL); y++) {
          if (y === Y_MIN || (y <= Y_MIN + 2 && hash3(wx, y, wz, seedInt) < 0.5)) {
            blocks[blockIndex(lx, y, lz)] = B.bedrock;
            continue;
          }

          if (y <= h) {
            let id: number;
            if (y === h) {
              if (h > 85) id = B.snow;
              else id = biome.topBlock;
            } else if (y >= h - 3) {
              id = h > 85 ? B.stone : biome.subBlock;
            } else if (y < 0) {
              id = B.deepslate;
            } else {
              id = biome.stoneBlock;
            }

            // Ores & underground caves (skip caves directly beneath starter lodge/haven surface)
            if (y < h - 4) {
              const bx = wx >> 1;
              const by = y >> 1;
              const bz = wz >> 1;
              const rOre = hash3(bx, by, bz, seedInt + 31);
              if (rOre < 0.014) id = B.coal_ore;
              else if (rOre < 0.024 && y < 60) id = B.iron_ore;
              else if (rOre < 0.031 && y < 70) id = B.copper_ore;
              else if (rOre < 0.035 && y < 32) id = B.gold_ore;
              else if (rOre < 0.039 && y < 18) id = B.redstone_ore;
              else if (rOre < 0.042 && y < 24) id = B.lapis_ore;
              else if (rOre < 0.0445 && y < 10) id = B.diamond_ore;
              else if (rOre > 0.996 && h > 80) id = B.emerald_ore;

              // Cave worms
              if (!isHavenZone && y > Y_MIN + 3) {
                const c1 = Math.abs(this.noise.noise3(wx * 0.042, y * 0.06, wz * 0.042));
                const c2 = Math.abs(this.noise.noise3(wx * 0.042 + 41, y * 0.06 + 17, wz * 0.042 + 63));
                if (c1 < 0.068 && c2 < 0.068) {
                  id = y < -20 ? B.lava : B.air;
                } else if (c1 < 0.085 && c2 < 0.085) {
                  if (sample.caveBiome === 'deep_dark' && y < 0) id = B.sculk;
                  else if (sample.caveBiome === 'lush') id = B.moss_block;
                  else if (sample.caveBiome === 'sulfur') id = B.sulfur_block;
                  else if (sample.caveBiome === 'dripstone') id = B.dripstone;
                }
              }
            }
            blocks[blockIndex(lx, y, lz)] = id;
          } else if (y <= SEA_LEVEL) {
            blocks[blockIndex(lx, y, lz)] = B.water;
          }
        }

        // Ice spikes spire generation
        if (biome.id === 'ice_spikes' && hash3(wx, 77, wz, seedInt) < 0.015) {
          const spikeH = 7 + Math.floor(hash3(wx, 12, wz, seedInt) * 10);
          for (let sy = h + 1; sy <= Math.min(Y_MAX - 2, h + spikeH); sy++) {
            blocks[blockIndex(lx, sy, lz)] = sy > h + spikeH - 3 ? B.blue_ice : B.packed_ice;
          }
        }

        // Surface flora & trees (keep starter lodge courtyard clean)
        const inCourtyard = wx >= -20 && wx <= 18 && wz >= -16 && wz <= 14;
        if (!inCourtyard && h > SEA_LEVEL && blocks[blockIndex(lx, h, lz)] !== B.water) {
          if (biome.flowerDensity > 0 && hash3(wx, h + 1, wz, seedInt + 19) < biome.flowerDensity) {
            blocks[blockIndex(lx, h + 1, lz)] = B.wildflower;
          }
          if (
            biome.treeType !== 'none' &&
            lx >= 2 &&
            lx <= 13 &&
            lz >= 2 &&
            lz <= 13 &&
            hash3(wx, h, wz, seedInt + 99) < biome.treeDensity
          ) {
            pendingTrees.push({ x: wx, y: h, z: wz, type: biome.treeType });
          }
        }

        heightMap[lx + 16 * lz] = Math.max(h, SEA_LEVEL);
      }
    }

    const putLocal = (x: number, y: number, z: number, id: number, overwrite = false) => {
      if (y < Y_MIN || y >= Y_MAX) return;
      const lx = x - x0;
      const lz = z - z0;
      if (lx < 0 || lx >= 16 || lz < 0 || lz >= 16) return;
      const idx = blockIndex(lx, y, lz);
      if (overwrite || blocks[idx] === B.air) {
        blocks[idx] = id;
      }
    };

    for (const tr of pendingTrees) {
      placeTree(putLocal, tr.x, tr.y, tr.z, tr.type, seedInt);
    }

    // Apply prebuilt spawn structures in this chunk
    const structMap = this.structureCache.get(key);
    if (structMap) {
      for (const [coord, id] of structMap.entries()) {
        const [sx, sy, sz] = coord.split(',').map(Number);
        putLocal(sx, sy, sz, id, true);
      }
    }

    // Apply persisted edits in this chunk
    for (let lz = 0; lz < 16; lz++) {
      for (let lx = 0; lx < 16; lx++) {
        const wx = x0 + lx;
        const wz = z0 + lz;
        // Fast check only if edits exist
        if (this.edits.size > 0) {
          for (let y = Y_MIN; y < Y_MAX; y++) {
            const ek = `${this.realm}:${wx},${y},${wz}`;
            const eid = this.edits.get(ek);
            if (eid !== undefined) {
              blocks[blockIndex(lx, y, lz)] = eid;
            }
          }
        }
      }
    }

    // Recompute heightmap accurately & track redstone blocks
    for (let lz = 0; lz < 16; lz++) {
      for (let lx = 0; lx < 16; lx++) {
        let top = Y_MIN;
        for (let y = Y_MAX - 1; y >= Y_MIN; y--) {
          const id = blocks[blockIndex(lx, y, lz)];
          if (id > 0) {
            if (top === Y_MIN) top = y;
            if (BLOCKS[id]?.circuit) {
              this.watchedRedstone.set(`${x0 + lx},${y},${z0 + lz}`, [x0 + lx, y, z0 + lz]);
            }
          }
        }
        heightMap[lx + 16 * lz] = top;
      }
    }

    const chunk: ChunkData = { cx, cz, realm: this.realm, blocks, heightMap, dirty: true };
    this.chunks.set(key, chunk);
    return chunk;
  }

  public getBlock(x: number, y: number, z: number): number {
    if (y < Y_MIN) return B.bedrock;
    if (y >= Y_MAX) return B.air;
    const cx = Math.floor(x / 16);
    const cz = Math.floor(z / 16);
    const chunk = this.chunks.get(chunkKey(cx, cz, this.realm));
    if (!chunk) {
      const ek = `${this.realm}:${x},${y},${z}`;
      const edit = this.edits.get(ek);
      return edit !== undefined ? edit : B.air;
    }
    const lx = ((x % 16) + 16) % 16;
    const lz = ((z % 16) + 16) % 16;
    return chunk.blocks[blockIndex(lx, y, lz)];
  }

  public setBlock(x: number, y: number, z: number, id: number, recordEdit = true): void {
    if (y < Y_MIN || y >= Y_MAX) return;
    const ek = `${this.realm}:${x},${y},${z}`;
    if (recordEdit) {
      this.edits.set(ek, id);
    }
    const cx = Math.floor(x / 16);
    const cz = Math.floor(z / 16);
    const chunk = this.chunks.get(chunkKey(cx, cz, this.realm));
    if (!chunk) return;
    const lx = ((x % 16) + 16) % 16;
    const lz = ((z % 16) + 16) % 16;
    chunk.blocks[blockIndex(lx, y, lz)] = id;
    chunk.dirty = true;

    if (BLOCKS[id]?.circuit) {
      this.watchedRedstone.set(`${x},${y},${z}`, [x, y, z]);
    } else {
      this.watchedRedstone.delete(`${x},${y},${z}`);
    }

    // Mark border neighbors dirty
    if (lx === 0) this.markDirty(cx - 1, cz);
    if (lx === 15) this.markDirty(cx + 1, cz);
    if (lz === 0) this.markDirty(cx, cz - 1);
    if (lz === 15) this.markDirty(cx, cz + 1);
  }

  private markDirty(cx: number, cz: number): void {
    const c = this.chunks.get(chunkKey(cx, cz, this.realm));
    if (c) c.dirty = true;
  }

  public getSurfaceY(x: number, z: number): number {
    const cx = Math.floor(x / 16);
    const cz = Math.floor(z / 16);
    const c = this.getOrCreateChunk(cx, cz);
    const lx = ((x % 16) + 16) % 16;
    const lz = ((z % 16) + 16) % 16;
    for (let y = Y_MAX - 2; y >= Y_MIN + 1; y--) {
      const id = c.blocks[blockIndex(lx, y, lz)];
      if (id > 0 && BLOCKS[id]?.solid) return y + 1;
    }
    return 66;
  }

  public getBiomeAt(x: number, z: number): BiomeDef {
    return sampleTerrain(this.noise, x, z, this.realm).biome;
  }

  public exportEditsArray(): Array<[RealmId, number, number, number, number]> {
    const out: Array<[RealmId, number, number, number, number]> = [];
    for (const [k, id] of this.edits.entries()) {
      const [realmPart, coords] = k.split(':');
      const [x, y, z] = coords.split(',').map(Number);
      out.push([realmPart as RealmId, x, y, z, id]);
    }
    return out;
  }
}
