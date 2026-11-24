import * as THREE from 'three';
import { BLOCKS, ITEMS } from '../items/registry';

export interface AtlasUV {
  u0: number;
  v0: number;
  u1: number;
  v1: number;
}

const GRID = 16; // 16x16 tiles = 256 tiles max, 16px each -> 256x256 canvas
const TILE = 16;
const SIZE = GRID * TILE;

function seededRand(seed: number): () => number {
  let s = seed | 0 || 1337;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 10000) / 10000;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const n = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16) || 0x888888;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function shade(rgb: [number, number, number], delta: number): string {
  const r = Math.max(0, Math.min(255, Math.round(rgb[0] + delta)));
  const g = Math.max(0, Math.min(255, Math.round(rgb[1] + delta)));
  const b = Math.max(0, Math.min(255, Math.round(rgb[2] + delta)));
  return `rgb(${r},${g},${b})`;
}

export class TextureAtlas {
  public texture: THREE.CanvasTexture;
  public uvMap = new Map<string, AtlasUV>();
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private nextSlot = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;

    // Register every unique block texture used in BLOCKS
    const seen = new Set<string>();
    for (const b of BLOCKS) {
      if (!b || b.id === 0) continue;
      for (const [texKey, col] of [
        [b.tex, b.color],
        [b.topTex, b.topColor || b.color],
        [b.sideTex, b.sideColor || b.color],
      ] as Array<[string | undefined, string]>) {
        if (texKey && !seen.has(texKey)) {
          seen.add(texKey);
          this.paintTile(texKey, col);
        }
      }
    }

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
  }

  public getUV(texKey: string): AtlasUV {
    return this.uvMap.get(texKey) || this.uvMap.get('stone') || { u0: 0, v0: 0, u1: 1 / GRID, v1: 1 / GRID };
  }

  private paintTile(texKey: string, baseHex: string): void {
    const slot = this.nextSlot++;
    if (slot >= GRID * GRID) return;
    const gx = slot % GRID;
    const gy = Math.floor(slot / GRID);
    const ox = gx * TILE;
    const oy = gy * TILE;
    const ctx = this.ctx;
    const rgb = hexToRgb(baseHex);
    const rand = seededRand(texKey.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));

    ctx.clearRect(ox, oy, TILE, TILE);

    // Base noise fill
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const j = (rand() - 0.5) * 26;
        ctx.fillStyle = shade(rgb, j);
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }

    if (texKey === 'grass_side') {
      const topRgb = hexToRgb('#66b53f');
      for (let x = 0; x < TILE; x++) {
        const drop = 3 + Math.floor(rand() * 3);
        for (let y = 0; y < drop; y++) {
          ctx.fillStyle = shade(topRgb, (rand() - 0.5) * 22);
          ctx.fillRect(ox + x, oy + y, 1, 1);
        }
      }
    } else if (texKey === 'grass_top') {
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = shade(rgb, (rand() - 0.5) * 40);
        ctx.fillRect(ox + Math.floor(rand() * 16), oy + Math.floor(rand() * 16), 1, 2);
      }
    } else if (texKey.startsWith('planks_')) {
      for (let y = 0; y < TILE; y += 4) {
        ctx.fillStyle = shade(rgb, -32);
        ctx.fillRect(ox, oy + y, TILE, 1);
        const splitX = ((y * 3 + 5) % 12) + 2;
        ctx.fillRect(ox + splitX, oy + y, 1, 4);
      }
    } else if (texKey.startsWith('log_top_')) {
      ctx.fillStyle = shade(rgb, -30);
      ctx.strokeRect(ox + 1, oy + 1, 14, 14);
      ctx.fillStyle = shade(rgb, -18);
      ctx.fillRect(ox + 4, oy + 4, 8, 8);
      ctx.fillStyle = shade(rgb, 14);
      ctx.fillRect(ox + 6, oy + 6, 4, 4);
    } else if (texKey.startsWith('log_')) {
      for (let x = 0; x < TILE; x += 2) {
        ctx.fillStyle = shade(rgb, rand() > 0.5 ? -26 : 16);
        ctx.fillRect(ox + x, oy, 1, TILE);
      }
    } else if (texKey.startsWith('leaves_') || texKey === 'wildflower' || texKey === 'wheat') {
      ctx.clearRect(ox, oy, TILE, TILE);
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          if (texKey === 'wheat') {
            if (x % 3 !== 1 && y > 3) {
              ctx.fillStyle = shade(rgb, y < 7 ? 24 : -15);
              ctx.fillRect(ox + x, oy + y, 1, 1);
            }
          } else if (texKey === 'wildflower') {
            if (y > 9 && x % 4 === 2) {
              ctx.fillStyle = '#3f8c32';
              ctx.fillRect(ox + x, oy + y, 1, 1);
            } else if ((x === 4 || x === 11) && y >= 5 && y <= 8) {
              ctx.fillStyle = x === 4 ? '#f24b44' : '#f7d547';
              ctx.fillRect(ox + x - 1, oy + y, 3, 2);
            }
          } else if (rand() > 0.24) {
            ctx.fillStyle = shade(rgb, (rand() - 0.5) * 38);
            ctx.fillRect(ox + x, oy + y, 1, 1);
          }
        }
      }
    } else if (texKey === 'cobblestone' || texKey === 'mossy_cobble' || texKey === 'stone_bricks' || texKey === 'bricks') {
      const step = texKey === 'bricks' ? 4 : 8;
      ctx.fillStyle = texKey === 'bricks' ? '#d4cfc7' : shade(rgb, -36);
      for (let y = 0; y < TILE; y += step) {
        ctx.fillRect(ox, oy + y, TILE, 1);
        const shift = (y / step) % 2 === 0 ? 4 : 8;
        ctx.fillRect(ox + shift, oy + y, 1, step);
        ctx.fillRect(ox + ((shift + 8) % 16), oy + y, 1, step);
      }
      if (texKey === 'mossy_cobble') {
        for (let i = 0; i < 28; i++) {
          ctx.fillStyle = '#487a38';
          ctx.fillRect(ox + Math.floor(rand() * 15), oy + Math.floor(rand() * 15), 2, 2);
        }
      }
    } else if (texKey.endsWith('_ore') || texKey === 'ancient_debris' || texKey === 'quartz_ore') {
      const stoneRgb = texKey === 'quartz_ore' || texKey === 'ancient_debris' ? hexToRgb('#6e2e2e') : hexToRgb('#7a7d82');
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          ctx.fillStyle = shade(stoneRgb, (rand() - 0.5) * 20);
          ctx.fillRect(ox + x, oy + y, 1, 1);
        }
      }
      for (let i = 0; i < 9; i++) {
        const fx = 2 + Math.floor(rand() * 11);
        const fy = 2 + Math.floor(rand() * 11);
        ctx.fillStyle = baseHex;
        ctx.fillRect(ox + fx, oy + fy, 2, 2);
        ctx.fillStyle = shade(rgb, 35);
        ctx.fillRect(ox + fx, oy + fy, 1, 1);
      }
    } else if (texKey === 'glass') {
      ctx.clearRect(ox, oy, TILE, TILE);
      ctx.fillStyle = 'rgba(195,235,250,0.32)';
      ctx.fillRect(ox, oy, TILE, TILE);
      ctx.fillStyle = 'rgba(235,250,255,0.85)';
      ctx.fillRect(ox, oy, TILE, 1);
      ctx.fillRect(ox, oy + TILE - 1, TILE, 1);
      ctx.fillRect(ox, oy, 1, TILE);
      ctx.fillRect(ox + TILE - 1, oy, 1, TILE);
      ctx.fillRect(ox + 3, oy + 3, 3, 1);
      ctx.fillRect(ox + 3, oy + 4, 1, 2);
    } else if (texKey === 'water') {
      const waterRgb = hexToRgb('#3592f2');
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const wave = Math.sin((x + y) * 0.75) * 16 + Math.cos((x - y) * 0.5) * 8;
          ctx.fillStyle = shade(waterRgb, wave + (rand() - 0.5) * 8);
          ctx.fillRect(ox + x, oy + y, 1, 1);
        }
      }
      ctx.fillStyle = 'rgba(200, 242, 255, 0.35)';
      ctx.fillRect(ox + 2, oy + 4, 5, 1);
      ctx.fillRect(ox + 9, oy + 11, 4, 1);
    } else if (texKey === 'nether_portal') {
      for (let y = 0; y < TILE; y++) {
        for (let x = 0; x < TILE; x++) {
          const swirl = Math.sin(x * 0.6 + Math.cos(y * 0.6) * 2) * 32;
          ctx.fillStyle = shade(rgb, swirl);
          ctx.fillRect(ox + x, oy + y, 1, 1);
        }
      }
    } else if (texKey === 'lantern') {
      ctx.fillStyle = '#2b2d36';
      ctx.fillRect(ox, oy, TILE, TILE);
      ctx.fillStyle = '#404452';
      ctx.fillRect(ox + 2, oy + 1, 12, 2);
      ctx.fillRect(ox + 2, oy + 13, 12, 2);
      ctx.fillStyle = '#ffbe4a';
      ctx.fillRect(ox + 3, oy + 3, 10, 10);
      ctx.fillStyle = '#fff0a8';
      ctx.fillRect(ox + 5, oy + 5, 6, 6);
    } else if (texKey === 'torch' || texKey === 'redstone_torch') {
      ctx.clearRect(ox, oy, TILE, TILE);
      ctx.fillStyle = '#6c4d2d';
      ctx.fillRect(ox + 7, oy + 6, 2, 10);
      ctx.fillStyle = texKey === 'torch' ? '#ffcf4d' : '#ff3c2e';
      ctx.fillRect(ox + 6, oy + 2, 4, 4);
      ctx.fillStyle = '#fff7ba';
      ctx.fillRect(ox + 7, oy + 3, 2, 2);
    } else if (texKey === 'bookshelf') {
      ctx.fillStyle = '#b38a53';
      ctx.fillRect(ox, oy, TILE, 2);
      ctx.fillRect(ox, oy + 7, TILE, 2);
      ctx.fillRect(ox, oy + 14, TILE, 2);
      const bookCols = ['#c43b33', '#3962c9', '#4fa646', '#e0b83d', '#8c4fb8'];
      for (let row of [2, 9]) {
        for (let bx = 1; bx < 15; bx += 2) {
          ctx.fillStyle = bookCols[(bx + row) % bookCols.length];
          ctx.fillRect(ox + bx, oy + row, 2, 5);
        }
      }
    } else if (texKey === 'tnt') {
      ctx.fillStyle = '#d44235';
      ctx.fillRect(ox, oy, TILE, TILE);
      ctx.fillStyle = '#f2efe9';
      ctx.fillRect(ox, oy + 5, TILE, 6);
      ctx.fillStyle = '#1f1f24';
      ctx.fillRect(ox + 2, oy + 6, 3, 1);
      ctx.fillRect(ox + 3, oy + 7, 1, 3);
      ctx.fillRect(ox + 6, oy + 6, 1, 4);
      ctx.fillRect(ox + 7, oy + 7, 1, 2);
      ctx.fillRect(ox + 8, oy + 6, 1, 4);
      ctx.fillRect(ox + 10, oy + 6, 3, 1);
      ctx.fillRect(ox + 11, oy + 7, 1, 3);
    } else if (texKey === 'crafting_top') {
      ctx.fillStyle = '#ab7f49';
      ctx.fillRect(ox, oy, TILE, TILE);
      ctx.fillStyle = '#4d361d';
      for (let i = 3; i <= 12; i += 4) {
        ctx.fillRect(ox + i, oy + 2, 1, 12);
        ctx.fillRect(ox + 2, oy + i, 12, 1);
      }
    } else if (texKey === 'furnace' || texKey === 'blast_furnace' || texKey === 'smoker') {
      ctx.fillStyle = '#45484d';
      ctx.fillRect(ox + 3, oy + 4, 10, 4);
      ctx.fillStyle = '#1e1e22';
      ctx.fillRect(ox + 4, oy + 10, 8, 5);
      ctx.fillStyle = '#ff7b29';
      ctx.fillRect(ox + 5, oy + 12, 6, 2);
    } else if (texKey === 'redstone_dust') {
      ctx.clearRect(ox, oy, TILE, TILE);
      ctx.fillStyle = '#e6221c';
      ctx.fillRect(ox + 6, oy, 4, TILE);
      ctx.fillRect(ox, oy + 6, TILE, 4);
      ctx.fillStyle = '#ff6a5e';
      ctx.fillRect(ox + 7, oy + 7, 2, 2);
    }

    const eps = 0.5 / SIZE;
    this.uvMap.set(texKey, {
      u0: gx / GRID + eps,
      v0: 1 - (gy + 1) / GRID + eps,
      u1: (gx + 1) / GRID - eps,
      v1: 1 - gy / GRID - eps,
    });
  }
}

const iconCache = new Map<number, string>();

export function getItemIconUrl(id: number): string {
  const cached = iconCache.get(id);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;

  if (id < 1000) {
    const b = BLOCKS[id];
    const top = b?.topColor || b?.color || '#888';
    const side = b?.sideColor || b?.color || '#777';
    // Isometric cube icon
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.moveTo(16, 4);
    ctx.lineTo(28, 10);
    ctx.lineTo(16, 16);
    ctx.lineTo(4, 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.moveTo(4, 10);
    ctx.lineTo(16, 16);
    ctx.lineTo(16, 28);
    ctx.lineTo(4, 22);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = shade(hexToRgb(side), -28);
    ctx.beginPath();
    ctx.moveTo(16, 16);
    ctx.lineTo(28, 10);
    ctx.lineTo(28, 22);
    ctx.lineTo(16, 28);
    ctx.closePath();
    ctx.fill();

    if (b?.glow) {
      ctx.fillStyle = 'rgba(255, 240, 170, 0.35)';
      ctx.fillRect(12, 12, 8, 8);
    }
  } else {
    const it = ITEMS[id];
    const col = it?.color || '#ccc';
    const icon = it?.icon || 'gem';
    ctx.fillStyle = col;
    if (icon === 'sword') {
      ctx.fillStyle = '#6c4928';
      ctx.fillRect(6, 22, 4, 4);
      ctx.fillRect(9, 19, 4, 4);
      ctx.fillStyle = col;
      for (let i = 0; i < 6; i++) ctx.fillRect(12 + i * 2.5, 16 - i * 2.5, 4, 4);
    } else if (icon === 'pickaxe') {
      ctx.fillStyle = '#6c4928';
      for (let i = 0; i < 6; i++) ctx.fillRect(6 + i * 3, 23 - i * 3, 3, 3);
      ctx.fillStyle = col;
      ctx.fillRect(10, 5, 14, 4);
      ctx.fillRect(22, 8, 4, 10);
    } else if (icon === 'axe') {
      ctx.fillStyle = '#6c4928';
      for (let i = 0; i < 6; i++) ctx.fillRect(6 + i * 3, 23 - i * 3, 3, 3);
      ctx.fillStyle = col;
      ctx.fillRect(14, 5, 10, 10);
    } else if (icon === 'shovel') {
      ctx.fillStyle = '#6c4928';
      for (let i = 0; i < 5; i++) ctx.fillRect(6 + i * 3, 23 - i * 3, 3, 3);
      ctx.fillStyle = col;
      ctx.fillRect(18, 5, 8, 8);
    } else if (icon === 'egg') {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(16, 17, 8, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffffaa';
      ctx.fillRect(12, 12, 3, 4);
      ctx.fillRect(18, 18, 3, 3);
    } else if (icon === 'potion') {
      ctx.fillStyle = '#cfd9e6';
      ctx.fillRect(13, 4, 6, 4);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(16, 19, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff88';
      ctx.fillRect(12, 15, 2, 4);
    } else if (icon === 'apple' || icon === 'berry') {
      ctx.fillStyle = '#4e7a32';
      ctx.fillRect(15, 4, 3, 5);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(16, 18, 9, 0, Math.PI * 2);
      ctx.fill();
    } else if (icon === 'ingot') {
      ctx.fillStyle = col;
      ctx.fillRect(6, 11, 20, 10);
      ctx.fillStyle = shade(hexToRgb(col), 30);
      ctx.fillRect(8, 12, 16, 4);
    } else if (icon === 'helmet' || icon === 'chestplate' || icon === 'leggings' || icon === 'boots') {
      ctx.fillStyle = col;
      if (icon === 'helmet') {
        ctx.fillRect(7, 8, 18, 14);
        ctx.clearRect(11, 15, 10, 7);
      } else if (icon === 'chestplate') {
        ctx.fillRect(6, 7, 20, 18);
        ctx.clearRect(12, 7, 8, 4);
      } else if (icon === 'leggings') {
        ctx.fillRect(8, 7, 16, 18);
        ctx.clearRect(14, 15, 4, 10);
      } else {
        ctx.fillRect(7, 14, 7, 12);
        ctx.fillRect(18, 14, 7, 12);
      }
    } else {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(16, 5);
      ctx.lineTo(26, 16);
      ctx.lineTo(16, 27);
      ctx.lineTo(6, 16);
      ctx.closePath();
      ctx.fill();
    }
  }

  const url = canvas.toDataURL();
  iconCache.set(id, url);
  return url;
}
