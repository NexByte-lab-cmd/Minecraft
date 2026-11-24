import { B, BLOCKS } from '../items/registry';
import type { WorldAccess } from '../physics/simulation';

export interface RedstoneCircuitState {
  activeSwitches: Map<string, boolean>; // key: "x,y,z" -> on/off for levers, buttons, plates
  powerLevels: Map<string, number>; // key: "x,y,z" -> 0..15
  extendedPistons: Map<string, [number, number, number]>; // piston pos -> push dir
  buttonTimers: Map<string, number>; // ticks left before button turns off
  tntFuses: Array<{ x: number; y: number; z: number; ticksLeft: number }>;
}

export function posKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export function createRedstoneState(): RedstoneCircuitState {
  return {
    activeSwitches: new Map(),
    powerLevels: new Map(),
    extendedPistons: new Map(),
    buttonTimers: new Map(),
    tntFuses: [],
  };
}

const NEIGHBORS: Array<[number, number, number]> = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

export function toggleSwitch(
  state: RedstoneCircuitState,
  world: WorldAccess,
  x: number,
  y: number,
  z: number,
): boolean {
  const id = world.getBlock(x, y, z);
  const circuit = BLOCKS[id]?.circuit;
  if (!circuit) return false;
  const k = posKey(x, y, z);
  if (circuit === 'lever' || circuit === 'plate') {
    const next = !state.activeSwitches.get(k);
    state.activeSwitches.set(k, next);
    return next;
  }
  if (circuit === 'button') {
    state.activeSwitches.set(k, true);
    state.buttonTimers.set(k, 20); // 1 second (20 ticks)
    return true;
  }
  if (circuit === 'tnt') {
    igniteTnt(state, x, y, z);
    return true;
  }
  return false;
}

export function igniteTnt(state: RedstoneCircuitState, x: number, y: number, z: number): void {
  if (!state.tntFuses.some((t) => t.x === x && t.y === y && t.z === z)) {
    state.tntFuses.push({ x, y, z, ticksLeft: 80 }); // 4 seconds = 80 ticks
  }
}

export function getPowerAt(state: RedstoneCircuitState, x: number, y: number, z: number): number {
  return state.powerLevels.get(posKey(x, y, z)) ?? 0;
}

/**
 * Deterministic 20-TPS redstone signal propagation solver (0..15 strength).
 * Supports Redstone Blocks, Torches (NOT inverter), Levers, Buttons, Plates,
 * Redstone Dust decay (1 per block), Repeaters (boost back to 15), Comparators,
 * Pistons/Sticky Pistons (up to 12 blocks), Redstone Lamps, and TNT ignition.
 */
export function tickRedstoneNetwork(
  state: RedstoneCircuitState,
  world: WorldAccess,
  watchedCoords: Array<[number, number, number]>,
  daylightLevel: number,
): Array<{ x: number; y: number; z: number }> {
  // Decay button timers
  for (const [k, ticks] of state.buttonTimers.entries()) {
    if (ticks <= 1) {
      state.buttonTimers.delete(k);
      state.activeSwitches.set(k, false);
    } else {
      state.buttonTimers.set(k, ticks - 1);
    }
  }

  const nextPower = new Map<string, number>();
  const queue: Array<{ x: number; y: number; z: number; power: number }> = [];

  const pushPower = (x: number, y: number, z: number, power: number) => {
    if (power <= 0) return;
    const k = posKey(x, y, z);
    const prev = nextPower.get(k) ?? 0;
    if (power > prev) {
      nextPower.set(k, power);
      queue.push({ x, y, z, power });
    }
  };

  // Seed constant/switch sources
  for (const [x, y, z] of watchedCoords) {
    const id = world.getBlock(x, y, z);
    const circuit = BLOCKS[id]?.circuit;
    if (!circuit) continue;
    const k = posKey(x, y, z);

    if (circuit === 'block') {
      pushPower(x, y, z, 15);
    } else if (circuit === 'lever' || circuit === 'button' || circuit === 'plate') {
      if (state.activeSwitches.get(k)) pushPower(x, y, z, 15);
    } else if (circuit === 'daylight') {
      if (daylightLevel > 0) pushPower(x, y, z, Math.min(15, Math.round(daylightLevel * 15)));
    } else if (circuit === 'torch') {
      // Redstone torch acts as NOT inverter: active unless an adjacent block (excluding dust above) powers its base
      const basePowered =
        (state.powerLevels.get(posKey(x, y - 1, z)) ?? 0) > 0 ||
        (state.powerLevels.get(posKey(x - 1, y, z)) ?? 0) > 0 && world.getBlock(x - 1, y, z) !== B.redstone_dust ||
        (state.powerLevels.get(posKey(x + 1, y, z)) ?? 0) > 0 && world.getBlock(x + 1, y, z) !== B.redstone_dust;
      if (!basePowered) {
        pushPower(x, y, z, 15);
      }
    }
  }

  // BFS propagation through dust, repeaters, and direct neighbors
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curId = world.getBlock(cur.x, cur.y, cur.z);
    const curCircuit = BLOCKS[curId]?.circuit;

    for (const [dx, dy, dz] of NEIGHBORS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const nz = cur.z + dz;
      const nid = world.getBlock(nx, ny, nz);
      if (nid <= 0) continue;
      const nCircuit = BLOCKS[nid]?.circuit;

      if (nCircuit === 'dust') {
        const nextLevel = curCircuit === 'repeater' ? 15 : cur.power - 1;
        if (nextLevel > 0) pushPower(nx, ny, nz, nextLevel);
      } else if (nCircuit === 'repeater' && cur.power > 0) {
        pushPower(nx, ny, nz, 15);
      } else if (nCircuit === 'comparator' && cur.power > 0) {
        pushPower(nx, ny, nz, cur.power);
      } else if ((nCircuit === 'lamp' || nCircuit === 'piston' || nCircuit === 'sticky_piston' || nCircuit === 'tnt') && cur.power > 0) {
        const nk = posKey(nx, ny, nz);
        nextPower.set(nk, Math.max(nextPower.get(nk) ?? 0, cur.power));
      } else if (BLOCKS[nid]?.opaque && curCircuit !== 'dust' && cur.power === 15) {
        // Strong power into opaque solid block
        const nk = posKey(nx, ny, nz);
        nextPower.set(nk, Math.max(nextPower.get(nk) ?? 0, 14));
      }
    }
  }

  state.powerLevels = nextPower;

  // Actuate TNT & Pistons
  for (const [x, y, z] of watchedCoords) {
    const id = world.getBlock(x, y, z);
    const circuit = BLOCKS[id]?.circuit;
    const p = getPowerAt(state, x, y, z);
    if (circuit === 'tnt' && p > 0) {
      igniteTnt(state, x, y, z);
    } else if ((circuit === 'piston' || circuit === 'sticky_piston') && p > 0) {
      const k = posKey(x, y, z);
      if (!state.extendedPistons.has(k)) {
        // Push up to 12 blocks along +Y if free
        const dir: [number, number, number] = [0, 1, 0];
        let pushLen = 0;
        let canPush = true;
        while (pushLen < 12) {
          const bx = x + dir[0] * (pushLen + 1);
          const by = y + dir[1] * (pushLen + 1);
          const bz = z + dir[2] * (pushLen + 1);
          const bid = world.getBlock(bx, by, bz);
          if (bid === B.air) break;
          if (bid === B.obsidian || bid === B.bedrock || BLOCKS[bid]?.workstation) {
            canPush = false;
            break;
          }
          pushLen++;
        }
        if (canPush && pushLen < 12) {
          for (let step = pushLen; step >= 1; step--) {
            const fromId = world.getBlock(x, y + step, z);
            world.setBlock(x, y + step + 1, z, fromId);
            world.setBlock(x, y + step, z, B.air);
          }
          state.extendedPistons.set(k, dir);
        }
      }
    } else if ((circuit === 'piston' || circuit === 'sticky_piston') && p === 0) {
      const k = posKey(x, y, z);
      const ext = state.extendedPistons.get(k);
      if (ext) {
        if (circuit === 'sticky_piston') {
          const pulled = world.getBlock(x, y + 2, z);
          if (pulled !== B.air && pulled !== B.obsidian && pulled !== B.bedrock) {
            world.setBlock(x, y + 1, z, pulled);
            world.setBlock(x, y + 2, z, B.air);
          }
        }
        state.extendedPistons.delete(k);
      }
    }
  }

  // Advance TNT fuses
  const detonated: Array<{ x: number; y: number; z: number }> = [];
  for (let i = state.tntFuses.length - 1; i >= 0; i--) {
    const tnt = state.tntFuses[i];
    tnt.ticksLeft--;
    if (tnt.ticksLeft <= 0) {
      state.tntFuses.splice(i, 1);
      if (world.getBlock(tnt.x, tnt.y, tnt.z) === B.tnt) {
        detonated.push({ x: tnt.x, y: tnt.y, z: tnt.z });
      }
    }
  }
  return detonated;
}
