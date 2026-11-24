import * as THREE from 'three';
import { B, BLOCKS } from '../items/registry';
import { CHUNK_HEIGHT, CHUNK_SIZE, Y_MAX, Y_MIN, blockIndex, type ChunkData, type VoxelWorld } from '../world/world';
import type { TextureAtlas } from './textures';

interface FaceDef {
  dir: [number, number, number];
  corners: Array<[number, number, number]>;
  shade: number;
  faceType: 'top' | 'bottom' | 'side';
}

const FACES: FaceDef[] = [
  {
    dir: [0, 1, 0],
    corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]],
    shade: 1.0,
    faceType: 'top',
  },
  {
    dir: [0, -1, 0],
    corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]],
    shade: 0.62,
    faceType: 'bottom',
  },
  {
    dir: [0, 0, 1],
    corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]],
    shade: 0.86,
    faceType: 'side',
  },
  {
    dir: [0, 0, -1],
    corners: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]],
    shade: 0.82,
    faceType: 'side',
  },
  {
    dir: [1, 0, 0],
    corners: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]],
    shade: 0.78,
    faceType: 'side',
  },
  {
    dir: [-1, 0, 0],
    corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]],
    shade: 0.78,
    faceType: 'side',
  },
];

interface MeshBuffers {
  pos: number[];
  norm: number[];
  uv: number[];
  tileRect?: number[];
  col: number[];
  idx: number[];
}

function makeBuffers(withTileRect = false): MeshBuffers {
  return withTileRect
    ? { pos: [], norm: [], uv: [], tileRect: [], col: [], idx: [] }
    : { pos: [], norm: [], uv: [], col: [], idx: [] };
}

function toGeometry(buf: MeshBuffers): THREE.BufferGeometry | null {
  if (buf.pos.length === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(buf.pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(buf.norm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(buf.uv, 2));
  if (buf.tileRect) {
    geo.setAttribute('aTileRect', new THREE.Float32BufferAttribute(buf.tileRect, 4));
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(buf.col, 3));
  geo.setIndex(buf.idx);
  geo.computeBoundingSphere();
  return geo;
}

export interface ChunkMeshResult {
  opaque: THREE.BufferGeometry | null;
  cutout: THREE.BufferGeometry | null;
  translucent: THREE.BufferGeometry | null;
  emissivePoints: Array<{ x: number; y: number; z: number; color: string }>;
  waterfalls: Array<{ x: number; y: number; z: number }>;
  quadCount: number;
}

export function buildChunkGeometry(chunk: ChunkData, world: VoxelWorld, atlas: TextureAtlas): ChunkMeshResult {
  const opaque = makeBuffers(true);
  const cutout = makeBuffers(false);
  const translucent = makeBuffers(false);
  const emissivePoints: Array<{ x: number; y: number; z: number; color: string }> = [];
  const waterfalls: Array<{ x: number; y: number; z: number }> = [];
  let quadCount = 0;

  const x0 = chunk.cx * CHUNK_SIZE;
  const z0 = chunk.cz * CHUNK_SIZE;

  const getNeighbor = (wx: number, wy: number, wz: number): number => {
    if (wy < Y_MIN) return B.bedrock;
    if (wy >= Y_MAX) return B.air;
    const lx = wx - x0;
    const lz = wz - z0;
    if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16) {
      return chunk.blocks[blockIndex(lx, wy, lz)];
    }
    return world.getBlock(wx, wy, wz);
  };

  // Find active vertical bounds to skip empty upper sky slabs
  let maxActiveY = Y_MIN;
  for (let i = 0; i < 256; i++) {
    if (chunk.heightMap[i] > maxActiveY) maxActiveY = chunk.heightMap[i];
  }
  const topYLimit = Math.min(Y_MAX, maxActiveY + 2);

  // 1. Greedy Meshing for Solid Opaque Full-Cube Faces
  const pushOpaqueQuad = (
    p0: [number, number, number],
    p1: [number, number, number],
    p2: [number, number, number],
    p3: [number, number, number],
    nx: number,
    ny: number,
    nz: number,
    w: number,
    h: number,
    id: number,
    faceIdx: number,
  ) => {
    const def = BLOCKS[id];
    const f = FACES[faceIdx];
    const texKey =
      f.faceType === 'top' && def.topTex
        ? def.topTex
        : f.faceType === 'side' && def.sideTex
          ? def.sideTex
          : def.tex;
    const uv = atlas.getUV(texKey);
    const tileW = uv.u1 - uv.u0;
    const tileH = uv.v1 - uv.v0;
    const boost = def.emissive ? 1.25 : 1.0;
    const aoFactor = f.faceType === 'top' ? 1.0 : 0.94;
    const c = f.shade * aoFactor * boost;

    const baseIdx = opaque.pos.length / 3;
    opaque.pos.push(...p0, ...p1, ...p2, ...p3);
    for (let k = 0; k < 4; k++) {
      opaque.norm.push(nx, ny, nz);
      opaque.col.push(c, c, c);
      opaque.tileRect!.push(uv.u0, uv.v0, tileW, tileH);
    }
    opaque.uv.push(0, 0, w, 0, w, h, 0, h);
    opaque.idx.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);
    quadCount++;
  };

  // Horizontal slices (+Y / -Y) across 16x16 grid
  const maskH = new Uint16Array(16 * 16);
  for (let faceIdx = 0; faceIdx < 2; faceIdx++) {
    const dy = faceIdx === 0 ? 1 : -1;
    for (let y = Y_MIN; y < topYLimit; y++) {
      maskH.fill(0);
      let any = false;
      for (let v = 0; v < 16; v++) {
        for (let u = 0; u < 16; u++) {
          const id = chunk.blocks[blockIndex(u, y, v)];
          if (id === 0 || !BLOCKS[id]?.opaque) continue;
          const nid = getNeighbor(x0 + u, y + dy, z0 + v);
          if (!BLOCKS[nid]?.opaque) {
            maskH[u + v * 16] = id;
            any = true;
          }
        }
      }
      if (!any) continue;
      for (let v = 0; v < 16; v++) {
        for (let u = 0; u < 16; u++) {
          const id = maskH[u + v * 16];
          if (id === 0) continue;
          let w = 1;
          while (u + w < 16 && maskH[u + w + v * 16] === id) w++;
          let h = 1;
          outerH: while (v + h < 16) {
            for (let k = 0; k < w; k++) {
              if (maskH[u + k + (v + h) * 16] !== id) break outerH;
            }
            h++;
          }
          for (let j = 0; j < h; j++) {
            for (let k = 0; k < w; k++) maskH[u + k + (v + j) * 16] = 0;
          }
          const wx = x0 + u;
          const wz = z0 + v;
          if (faceIdx === 0) {
            pushOpaqueQuad(
              [wx, y + 1, wz + h],
              [wx + w, y + 1, wz + h],
              [wx + w, y + 1, wz],
              [wx, y + 1, wz],
              0, 1, 0, w, h, id, faceIdx,
            );
          } else {
            pushOpaqueQuad(
              [wx, y, wz],
              [wx + w, y, wz],
              [wx + w, y, wz + h],
              [wx, y, wz + h],
              0, -1, 0, w, h, id, faceIdx,
            );
          }
        }
      }
    }
  }

  // Vertical slices (+Z, -Z, +X, -X) across 16 x CHUNK_HEIGHT grid
  const sliceH = Math.max(1, topYLimit - Y_MIN);
  const maskV = new Uint16Array(16 * sliceH);
  for (let faceIdx = 2; faceIdx < 6; faceIdx++) {
    const f = FACES[faceIdx];
    const [dx, , dz] = f.dir;
    for (let slice = 0; slice < 16; slice++) {
      maskV.fill(0);
      let any = false;
      for (let v = 0; v < sliceH; v++) {
        const y = Y_MIN + v;
        for (let u = 0; u < 16; u++) {
          const lx = faceIdx < 4 ? u : slice;
          const lz = faceIdx < 4 ? slice : u;
          const id = chunk.blocks[blockIndex(lx, y, lz)];
          if (id === 0 || !BLOCKS[id]?.opaque) continue;
          const nid = getNeighbor(x0 + lx + dx, y, z0 + lz + dz);
          if (!BLOCKS[nid]?.opaque) {
            maskV[u + v * 16] = id;
            any = true;
          }
        }
      }
      if (!any) continue;
      for (let v = 0; v < sliceH; v++) {
        for (let u = 0; u < 16; u++) {
          const id = maskV[u + v * 16];
          if (id === 0) continue;
          let w = 1;
          while (u + w < 16 && maskV[u + w + v * 16] === id) w++;
          let h = 1;
          outerV: while (v + h < sliceH) {
            for (let k = 0; k < w; k++) {
              if (maskV[u + k + (v + h) * 16] !== id) break outerV;
            }
            h++;
          }
          for (let j = 0; j < h; j++) {
            for (let k = 0; k < w; k++) maskV[u + k + (v + j) * 16] = 0;
          }
          const yBot = Y_MIN + v;
          if (faceIdx === 2) {
            // +Z
            const zf = z0 + slice + 1;
            const wx = x0 + u;
            pushOpaqueQuad([wx, yBot, zf], [wx + w, yBot, zf], [wx + w, yBot + h, zf], [wx, yBot + h, zf], 0, 0, 1, w, h, id, faceIdx);
          } else if (faceIdx === 3) {
            // -Z
            const zf = z0 + slice;
            const wx = x0 + u;
            pushOpaqueQuad([wx + w, yBot, zf], [wx, yBot, zf], [wx, yBot + h, zf], [wx + w, yBot + h, zf], 0, 0, -1, w, h, id, faceIdx);
          } else if (faceIdx === 4) {
            // +X
            const xf = x0 + slice + 1;
            const wz = z0 + u;
            pushOpaqueQuad([xf, yBot, wz + w], [xf, yBot, wz], [xf, yBot + h, wz], [xf, yBot + h, wz + w], 1, 0, 0, w, h, id, faceIdx);
          } else {
            // -X
            const xf = x0 + slice;
            const wz = z0 + u;
            pushOpaqueQuad([xf, yBot, wz], [xf, yBot, wz + w], [xf, yBot + h, wz + w], [xf, yBot + h, wz], -1, 0, 0, w, h, id, faceIdx);
          }
        }
      }
    }
  }

  // 2. Non-opaque / cutout / translucent / emissive / waterfall tracking
  for (let y = Y_MIN; y < topYLimit; y++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const id = chunk.blocks[blockIndex(lx, y, lz)];
        if (id === 0) continue;
        const def = BLOCKS[id];
        if (!def) continue;

        const wx = x0 + lx;
        const wz = z0 + lz;

        if (def.lightColor && def.glow && def.glow >= 0.7 && emissivePoints.length < 16) {
          emissivePoints.push({ x: wx + 0.5, y: y + 0.6, z: wz + 0.5, color: def.lightColor });
        }

        if (def.opaque) continue; // Already handled by Greedy Mesher!

        const isTranslucent =
          id === B.water ||
          id === B.nether_portal ||
          id === B.end_portal ||
          id === B.glass ||
          id === B.ice ||
          id === B.slime_block ||
          id === B.honey_block;
        const targetBuf = isTranslucent ? translucent : cutout;

        if (id === B.water && waterfalls.length < 12 && getNeighbor(wx, y - 1, wz) === B.water && getNeighbor(wx, y, wz + 1) === B.air) {
          waterfalls.push({ x: wx + 0.5, y: y + 0.2, z: wz + 0.5 });
        }

        let bx0 = 0, bx1 = 1, by0 = 0, by1 = 1, bz0 = 0, bz1 = 1;
        if (id === B.water) {
          const above = getNeighbor(wx, y + 1, wz);
          if (above !== B.water) by1 = 0.88;
        } else if (id === B.torch || id === B.redstone_torch) {
          bx0 = 0.42; bx1 = 0.58; by0 = 0; by1 = 0.68; bz0 = 0.42; bz1 = 0.58;
        } else if (id === B.lantern) {
          bx0 = 0.25; bx1 = 0.75; by0 = 0.05; by1 = 0.75; bz0 = 0.25; bz1 = 0.75;
        } else if (id === B.fence_oak) {
          bx0 = 0.34; bx1 = 0.66; by0 = 0; by1 = 1.0; bz0 = 0.34; bz1 = 0.66;
        } else if (id === B.redstone_dust || id === B.pressure_plate) {
          bx0 = 0.05; bx1 = 0.95; by0 = 0; by1 = 0.1; bz0 = 0.05; bz1 = 0.95;
        } else if (id === B.bamboo_stalk) {
          bx0 = 0.35; bx1 = 0.65; by0 = 0; by1 = 1; bz0 = 0.35; bz1 = 0.65;
        } else if (id === B.wheat_block || id === B.wildflower) {
          bx0 = 0.15; bx1 = 0.85; by0 = 0; by1 = 0.8; bz0 = 0.15; bz1 = 0.85;
        } else if (id === B.nether_portal) {
          bx0 = 0; bx1 = 1; by0 = 0; by1 = 1; bz0 = 0.35; bz1 = 0.65;
        }

        const boost = def.emissive ? 1.25 : 1.0;

        for (const f of FACES) {
          const nid = getNeighbor(wx + f.dir[0], y + f.dir[1], wz + f.dir[2]);
          const nDef = BLOCKS[nid];
          if (isTranslucent) {
            if (nid === id) continue;
            if (nDef?.opaque) continue;
          }

          const texKey =
            f.faceType === 'top' && def.topTex
              ? def.topTex
              : f.faceType === 'side' && def.sideTex
                ? def.sideTex
                : def.tex;
          const uv = atlas.getUV(texKey);
          const baseIdx = targetBuf.pos.length / 3;
          const c = f.shade * boost;

          for (let ci = 0; ci < 4; ci++) {
            const [cx, cy, cz] = f.corners[ci];
            targetBuf.pos.push(
              wx + (cx === 0 ? bx0 : bx1),
              y + (cy === 0 ? by0 : by1),
              wz + (cz === 0 ? bz0 : bz1),
            );
            targetBuf.norm.push(f.dir[0], f.dir[1], f.dir[2]);
            targetBuf.col.push(c, c, c);
          }

          targetBuf.uv.push(uv.u0, uv.v0, uv.u1, uv.v0, uv.u1, uv.v1, uv.u0, uv.v1);
          targetBuf.idx.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);
          quadCount++;
        }
      }
    }
  }

  // Keep unused CHUNK_HEIGHT import alive cleanly if needed
  void CHUNK_HEIGHT;

  return {
    opaque: toGeometry(opaque),
    cutout: toGeometry(cutout),
    translucent: toGeometry(translucent),
    emissivePoints,
    waterfalls,
    quadCount,
  };
}
