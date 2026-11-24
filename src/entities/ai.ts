import { MOBS_BY_KEY, type MobDef } from './catalog';
import { stepEntityPhysics, type WorldAccess } from '../physics/simulation';
import type { Difficulty, RealmId } from '../network/commands';

export interface ActiveMob {
  id: number;
  def: MobDef;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  hp: number;
  maxHp: number;
  onGround: boolean;
  tamed: boolean;
  baby: boolean;
  wanderTimer: number;
  wanderYaw: number | null;
  attackCooldown: number;
  windupTimer: number; // visible telegraph before heavy attack
  fuseTimer: number; // creeper hiss fuse
  flashTimer: number;
  panicTimer: number;
  koTimer: number; // 0.35s KO dissolve/topple transition
  phase: number;
}

export interface MobStepOutput {
  playerDamage: number;
  knockX: number;
  knockZ: number;
  explosion?: { x: number; y: number; z: number; radius: number; damage: number };
  projectile?: { x: number; y: number; z: number; vx: number; vy: number; vz: number; kind: 'arrow' | 'fireball' | 'sonic' };
  killedMobs: ActiveMob[];
}

const DIFF_MULT: Record<Difficulty, number> = {
  peaceful: 0,
  easy: 0.5,
  normal: 1.0,
  hard: 1.5,
};

let nextMobUid = 1;

export function createMobInstance(key: string, x: number, y: number, z: number, tamed = false): ActiveMob | null {
  const def = MOBS_BY_KEY[key];
  if (!def) return null;
  return {
    id: nextMobUid++,
    def,
    x,
    y,
    z,
    vx: 0,
    vy: 0,
    vz: 0,
    yaw: Math.random() * Math.PI * 2,
    hp: def.hp,
    maxHp: def.hp,
    onGround: false,
    tamed,
    baby: false,
    wanderTimer: 1 + Math.random() * 3,
    wanderYaw: null,
    attackCooldown: 0.8,
    windupTimer: 0,
    fuseTimer: 0,
    flashTimer: 0,
    panicTimer: 0,
    koTimer: 0,
    phase: Math.random() * 10,
  };
}

export function stepMobAI(
  mobs: ActiveMob[],
  world: WorldAccess,
  player: { x: number; y: number; z: number; alive: boolean; invulnerable: boolean },
  difficulty: Difficulty,
  dt: number,
  isDaytime: boolean,
): MobStepOutput {
  const out: MobStepOutput = { playerDamage: 0, knockX: 0, knockZ: 0, killedMobs: [] };
  const clampedDt = Math.min(dt, 0.05);
  const diffMult = DIFF_MULT[difficulty];

  for (let i = mobs.length - 1; i >= 0; i--) {
    const m = mobs[i];
    if (m.flashTimer > 0) m.flashTimer = Math.max(0, m.flashTimer - clampedDt);

    if (m.koTimer > 0) {
      m.koTimer -= clampedDt;
      if (m.koTimer <= 0) {
        out.killedMobs.push(m);
        mobs.splice(i, 1);
      }
      continue;
    }

    const dx = player.x - m.x;
    const dy = player.y - m.y;
    const dz = player.z - m.z;
    const dist = Math.hypot(dx, dz);

    // Sunlight burn for undead
    if (m.def.burnsInSun && isDaytime && m.y >= 62) {
      m.hp -= clampedDt * 1.6;
      if (m.hp <= 0) {
        m.koTimer = 0.32;
        continue;
      }
    }

    let moveSpeed = 0;
    let moveYaw = m.yaw;

    const isHostile = (m.def.group === 'Hostile' || m.def.group === 'Bosses') && diffMult > 0 && player.alive && !player.invulnerable;

    if (m.tamed && m.def.policy === 'companion') {
      // Follow player politely at 3-18 blocks
      if (dist > 4 && dist < 36) {
        moveYaw = Math.atan2(-dx, -dz);
        moveSpeed = m.def.speed;
      }
    } else if (isHostile && dist < (m.def.policy === 'boss' ? 60 : 24) && Math.abs(dy) < 18) {
      moveYaw = Math.atan2(-dx, -dz);

      if (m.def.policy === 'creeper') {
        if (dist < 3.0) {
          m.fuseTimer += clampedDt;
          if (m.fuseTimer >= 1.5) {
            out.explosion = { x: m.x, y: m.y + 0.5, z: m.z, radius: 3.2, damage: 14 * diffMult };
            mobs.splice(i, 1);
            continue;
          }
        } else {
          m.fuseTimer = Math.max(0, m.fuseTimer - clampedDt);
          moveSpeed = m.def.speed;
        }
      } else if (m.def.policy === 'ranged' || m.def.policy === 'boss') {
        m.attackCooldown -= clampedDt;
        if (dist > 9) moveSpeed = m.def.speed;
        else if (dist < 4.5 && m.def.policy !== 'boss') {
          moveYaw += Math.PI;
          moveSpeed = m.def.speed * 0.85;
        }
        if (m.attackCooldown <= 0 && dist < 32) {
          if (m.windupTimer <= 0) {
            m.windupTimer = 0.35; // telegraph windup
          } else {
            m.windupTimer -= clampedDt;
            if (m.windupTimer <= 0) {
              m.attackCooldown = m.def.policy === 'boss' ? 1.8 : 2.3;
              const len = Math.hypot(dx, dy + 0.8, dz) || 1;
              const spd = m.def.policy === 'boss' ? 17 : 21;
              out.projectile = {
                x: m.x,
                y: m.y + m.def.height * 0.72,
                z: m.z,
                vx: (dx / len) * spd,
                vy: ((dy + 0.8) / len) * spd,
                vz: (dz / len) * spd,
                kind: m.def.key === 'ghast' || m.def.key === 'blaze' || m.def.key === 'wither' ? 'fireball' : m.def.key === 'ender_dragon' ? 'sonic' : 'arrow',
              };
            }
          }
        }
      } else {
        // Melee chaser
        moveSpeed = m.def.speed;
        m.attackCooldown -= clampedDt;
        if (dist < 1.55 && Math.abs(dy) < 2.2 && m.attackCooldown <= 0) {
          m.attackCooldown = 1.05;
          out.playerDamage += m.def.damage * diffMult;
          const nLen = dist || 1;
          out.knockX = dx / nLen;
          out.knockZ = dz / nLen;
        }
      }
    } else {
      // Passive / Neutral / Out-of-range wandering
      if (m.panicTimer > 0) {
        m.panicTimer -= clampedDt;
        moveYaw = Math.atan2(dx, dz);
        moveSpeed = m.def.speed * 1.6;
      } else {
        m.wanderTimer -= clampedDt;
        if (m.wanderTimer <= 0) {
          m.wanderTimer = 2 + Math.random() * 4;
          m.wanderYaw = Math.random() < 0.45 ? null : Math.random() * Math.PI * 2;
        }
        if (m.wanderYaw !== null) {
          moveYaw = m.wanderYaw;
          moveSpeed = m.def.speed * 0.55;
        }
      }
    }

    m.yaw = moveYaw;
    const targetVx = -Math.sin(moveYaw) * moveSpeed;
    const targetVz = -Math.cos(moveYaw) * moveSpeed;
    m.vx += (targetVx - m.vx) * Math.min(1, 8 * clampedDt);
    m.vz += (targetVz - m.vz) * Math.min(1, 8 * clampedDt);

    if (m.def.fly) {
      const hoverTarget = m.def.policy === 'boss' ? Math.max(player.y + 7, 74) : Math.max(player.y + 2.5, 68);
      m.vy += ((hoverTarget - m.y) * 1.4 - m.vy) * Math.min(1, 4 * clampedDt);
    } else {
      m.vy = Math.max(-40, m.vy - 28 * clampedDt);
    }

    stepSingleMobPhysics(m, world, clampedDt, moveSpeed);
  }

  return out;
}

export function stepSingleMobPhysics(m: ActiveMob, world: WorldAccess, dt: number, speed: number): void {
  const phys = {
    x: m.x,
    y: m.y,
    z: m.z,
    vx: m.vx,
    vy: m.vy,
    vz: m.vz,
    width: m.def.width,
    height: m.def.height,
    onGround: m.onGround,
    noclip: m.def.fly,
  };
  const res = stepEntityPhysics(phys, world, dt);
  m.x = phys.x;
  m.y = phys.y;
  m.z = phys.z;
  m.vx = phys.vx;
  m.vy = phys.vy;
  m.vz = phys.vz;
  m.onGround = phys.onGround;
  if ((res.hitX || res.hitZ) && m.onGround && speed > 0) {
    m.vy = 8.4;
  }
}

export function getSpawnPoolForRealm(realm: RealmId, isNight: boolean, difficulty: Difficulty): string[] {
  if (realm === 'nether') {
    return difficulty === 'peaceful'
      ? ['strider']
      : ['piglin', 'zombified_piglin', 'blaze', 'ghast', 'wither_skeleton', 'hoglin', 'strider'];
  }
  if (realm === 'end') {
    return difficulty === 'peaceful' ? ['enderman'] : ['enderman', 'shulker', 'endermite'];
  }
  if (difficulty === 'peaceful' || !isNight) {
    return ['cow', 'pig', 'sheep', 'chicken', 'wolf', 'cat', 'horse', 'fox', 'rabbit', 'bee', 'villager'];
  }
  return ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'pillager', 'witch', 'slime'];
}

export function createStarterHavenMobs(realm: RealmId, difficulty: Difficulty): ActiveMob[] {
  const list: ActiveMob[] = [];
  const add = (key: string, x: number, y: number, z: number, tamed = false) => {
    const m = createMobInstance(key, x, y, z, tamed);
    if (m) list.push(m);
  };

  if (realm === 'overworld') {
    // Fenced farm pen (-17..-8, z: -1..6)
    add('cow', -14, 66.2, 2);
    add('pig', -11, 66.2, 3);
    add('sheep', -13, 66.2, 4);
    add('chicken', -10, 66.2, 1);
    // Loyal tamed wolf companion by player courtyard
    add('wolf', -2, 66.2, 1, true);
    // Friendly villager & horse near lodge
    add('villager', -8, 66.2, -2);
    add('horse', 16, 66.2, 8);
    if (difficulty !== 'peaceful') {
      // Iconic Enderman near the glowing Nether Portal
      add('enderman', 18, 66.2, -13);
    }
  } else if (realm === 'nether') {
    add('strider', 6, 33, 6);
    if (difficulty !== 'peaceful') {
      add('piglin', -6, 44, 5);
      add('blaze', 12, 45, 10);
      add('ghast', 16, 56, -14);
    }
  } else if (realm === 'end') {
    add('enderman', 10, 66, 8);
    add('enderman', -12, 66, -10);
    if (difficulty !== 'peaceful') {
      add('ender_dragon', 0, 82, -22);
    }
  }
  return list;
}

