import { B, BLOCKS } from '../items/registry';

export interface WorldAccess {
  getBlock(x: number, y: number, z: number): number;
  setBlock(x: number, y: number, z: number, id: number): void;
  realm: 'overworld' | 'nether' | 'end';
}

export interface PhysicsEntity {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  width: number;
  height: number;
  onGround: boolean;
  sneaking?: boolean;
  noclip?: boolean;
  inWater?: boolean;
  inLava?: boolean;
}

export function isSolidBlock(id: number): boolean {
  if (id <= 0) return false;
  return BLOCKS[id]?.solid ?? false;
}

export function aabbIntersectsWorld(
  world: WorldAccess,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
): boolean {
  const hw = width * 0.5;
  const x0 = Math.floor(x - hw);
  const x1 = Math.floor(x + hw - 1e-4);
  const y0 = Math.floor(y);
  const y1 = Math.floor(y + height - 1e-4);
  const z0 = Math.floor(z - hw);
  const z1 = Math.floor(z + hw - 1e-4);

  for (let by = y0; by <= y1; by++) {
    for (let bz = z0; bz <= z1; bz++) {
      for (let bx = x0; bx <= x1; bx++) {
        if (isSolidBlock(world.getBlock(bx, by, bz))) {
          return true;
        }
      }
    }
  }
  return false;
}

export function stepEntityPhysics(
  entity: PhysicsEntity,
  world: WorldAccess,
  dt: number,
): { hitX: boolean; hitZ: boolean; landed: boolean } {
  const clampedDt = Math.min(dt, 0.05);
  if (entity.noclip) {
    entity.x += entity.vx * clampedDt;
    entity.y += entity.vy * clampedDt;
    entity.z += entity.vz * clampedDt;
    entity.onGround = false;
    return { hitX: false, hitZ: false, landed: false };
  }

  const hw = entity.width * 0.5;
  const wasGround = entity.onGround;
  entity.onGround = false;
  let hitX = false;
  let hitZ = false;

  const subSteps = Math.max(
    1,
    Math.ceil(
      (Math.max(Math.abs(entity.vx), Math.abs(entity.vy), Math.abs(entity.vz)) * clampedDt) / 0.35,
    ),
  );
  const subDt = clampedDt / subSteps;

  for (let i = 0; i < subSteps; i++) {
    const nextX = entity.x + entity.vx * subDt;
    if (aabbIntersectsWorld(world, nextX, entity.y, entity.z, entity.width, entity.height)) {
      entity.x = entity.vx > 0
        ? Math.floor(nextX + hw) - hw - 1e-3
        : Math.floor(nextX - hw) + 1 + hw + 1e-3;
      entity.vx = 0;
      hitX = true;
    } else if (
      entity.sneaking &&
      wasGround &&
      !aabbIntersectsWorld(world, nextX, entity.y - 0.15, entity.z, entity.width, 0.15)
    ) {
      entity.vx = 0;
    } else {
      entity.x = nextX;
    }

    const nextZ = entity.z + entity.vz * subDt;
    if (aabbIntersectsWorld(world, entity.x, entity.y, nextZ, entity.width, entity.height)) {
      entity.z = entity.vz > 0
        ? Math.floor(nextZ + hw) - hw - 1e-3
        : Math.floor(nextZ - hw) + 1 + hw + 1e-3;
      entity.vz = 0;
      hitZ = true;
    } else if (
      entity.sneaking &&
      wasGround &&
      !aabbIntersectsWorld(world, entity.x, entity.y - 0.15, nextZ, entity.width, 0.15)
    ) {
      entity.vz = 0;
    } else {
      entity.z = nextZ;
    }

    const nextY = entity.y + entity.vy * subDt;
    if (aabbIntersectsWorld(world, entity.x, nextY, entity.z, entity.width, entity.height)) {
      if (entity.vy < 0) {
        entity.y = Math.floor(nextY) + 1 + 1e-4;
        entity.onGround = true;
      } else {
        entity.y = Math.floor(nextY + entity.height) - entity.height - 1e-3;
      }
      entity.vy = 0;
    } else {
      entity.y = nextY;
    }
  }

  return { hitX, hitZ, landed: !wasGround && entity.onGround };
}

export function computeFallDamage(fallDistance: number, landingBlockId: number, inWater: boolean): number {
  if (inWater || fallDistance <= 3) return 0;
  const raw = Math.floor(fallDistance - 3);
  const block = BLOCKS[landingBlockId];
  const reduce = block?.fallReduce ?? 0;
  if (reduce >= 1) return 0;
  return Math.max(0, Math.round(raw * (1 - reduce)));
}

export function getGroundModifiers(blockId: number): { friction: number; bounce: number; damage: number } {
  const block = BLOCKS[blockId];
  return {
    friction: block?.friction ?? 1.0,
    bounce: block?.bounce ?? 0,
    damage: block?.damage ?? 0,
  };
}

export interface FluidNode {
  x: number;
  y: number;
  z: number;
  id: number;
  dist: number;
}

export function stepFluidAndFallingQueue(
  world: WorldAccess,
  fluidQueue: FluidNode[],
  fallingQueue: Array<[number, number, number]>,
  maxSteps = 96,
): void {
  // 1. Gravity blocks (Sand, Red Sand, Gravel, Anvil)
  let steps = 0;
  while (fallingQueue.length > 0 && steps < maxSteps) {
    const [fx, fy, fz] = fallingQueue.shift()!;
    steps++;
    const id = world.getBlock(fx, fy, fz);
    if (id > 0 && BLOCKS[id]?.gravity) {
      let curY = fy;
      while (curY > -63) {
        const below = world.getBlock(fx, curY - 1, fz);
        if (below === B.air || BLOCKS[below]?.fluid) {
          world.setBlock(fx, curY, fz, B.air);
          curY--;
          world.setBlock(fx, curY, fz, id);
        } else {
          break;
        }
      }
    }
  }

  // 2. Fluid spread & reactions (Water + Lava -> Obsidian / Cobblestone / Stone)
  let fluidSteps = 0;
  while (fluidQueue.length > 0 && fluidSteps < 48) {
    const node = fluidQueue.shift()!;
    fluidSteps++;
    const cur = world.getBlock(node.x, node.y, node.z);
    if (cur !== node.id) continue;

    const maxSpread = node.id === B.water ? 7 : world.realm === 'nether' ? 7 : 3;

    // Check downward first
    const below = world.getBlock(node.x, node.y - 1, node.z);
    if (below === B.air && node.y > -63) {
      world.setBlock(node.x, node.y - 1, node.z, node.id);
      fluidQueue.push({ x: node.x, y: node.y - 1, z: node.z, id: node.id, dist: 0 });
      continue;
    }
    if (node.id === B.water && below === B.lava) {
      world.setBlock(node.x, node.y - 1, node.z, B.obsidian);
      continue;
    }
    if (node.id === B.lava && below === B.water) {
      world.setBlock(node.x, node.y - 1, node.z, B.stone);
      continue;
    }

    if (node.dist >= maxSpread) continue;

    const dirs: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dz] of dirs) {
      const nx = node.x + dx;
      const nz = node.z + dz;
      const neighbor = world.getBlock(nx, node.y, nz);
      if (neighbor === B.air) {
        world.setBlock(nx, node.y, nz, node.id);
        fluidQueue.push({ x: nx, y: node.y, z: nz, id: node.id, dist: node.dist + 1 });
      } else if (node.id === B.water && neighbor === B.lava) {
        world.setBlock(nx, node.y, nz, B.cobblestone);
      } else if (node.id === B.lava && neighbor === B.water) {
        world.setBlock(nx, node.y, nz, B.cobblestone);
      }
    }
  }
}
