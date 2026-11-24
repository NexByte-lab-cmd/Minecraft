export function hashString(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h | 0;
}

export function hash3(x: number, y: number, z: number, seed: number): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 2147483647) + Math.imul(seed, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export class SeededNoise {
  private perm: Uint8Array;
  public readonly seedInt: number;

  constructor(seed: string | number) {
    this.seedInt = typeof seed === 'number' ? seed | 0 : hashString(seed || 'Kathir');
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = this.seedInt || 1337;
    for (let i = 255; i > 0; i--) {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      const r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      const j = (r * (i + 1)) | 0;
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private static fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private static grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  public noise3(x: number, y: number, z: number): number {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const fz = Math.floor(z);
    const X = fx & 255;
    const Y = fy & 255;
    const Z = fz & 255;
    const dx = x - fx;
    const dy = y - fy;
    const dz = z - fz;
    const u = SeededNoise.fade(dx);
    const v = SeededNoise.fade(dy);
    const w = SeededNoise.fade(dz);
    const p = this.perm;

    const A = p[X] + Y;
    const AA = p[A] + Z;
    const AB = p[A + 1] + Z;
    const B = p[X + 1] + Y;
    const BA = p[B] + Z;
    const BB = p[B + 1] + Z;

    return SeededNoise.lerp(
      SeededNoise.lerp(
        SeededNoise.lerp(SeededNoise.grad(p[AA], dx, dy, dz), SeededNoise.grad(p[BA], dx - 1, dy, dz), u),
        SeededNoise.lerp(SeededNoise.grad(p[AB], dx, dy - 1, dz), SeededNoise.grad(p[BB], dx - 1, dy - 1, dz), u),
        v,
      ),
      SeededNoise.lerp(
        SeededNoise.lerp(SeededNoise.grad(p[AA + 1], dx, dy, dz - 1), SeededNoise.grad(p[BA + 1], dx - 1, dy, dz - 1), u),
        SeededNoise.lerp(SeededNoise.grad(p[AB + 1], dx, dy - 1, dz - 1), SeededNoise.grad(p[BB + 1], dx - 1, dy - 1, dz - 1), u),
        v,
      ),
      w,
    );
  }

  public fbm2(x: number, z: number, octaves = 4, offset = 0): number {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.noise3(x * freq + offset, offset * 0.37 + i * 7.1, z * freq - offset * 0.5);
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  }
}
