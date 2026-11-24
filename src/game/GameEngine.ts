import { B, BLOCKS, I, ITEMS, MOD_PACKS, getColor, getName, maxStack } from '../items/registry';
import {
  RECIPES,
  addItemToInventory,
  canCraftRecipe,
  craftRecipe,
  matchCraftingGrid,
  type InventorySlot,
  type Recipe,
} from '../items/crafting';
import { VoxelWorld } from '../world/world';
import { TELEPORT_BIOME_PRESETS } from '../world/biomes';
import { placeBlueprintStructure, type BlueprintType } from '../world/structures';
import { stepEntityPhysics, computeFallDamage, getGroundModifiers, stepFluidAndFallingQueue, type FluidNode } from '../physics/simulation';
import { createRedstoneState, igniteTnt, tickRedstoneNetwork, toggleSwitch, type RedstoneCircuitState } from '../redstone/circuits';
import { GAME_MODES, parseSlashCommand, type Difficulty, type GameMode, type RealmId } from '../network/commands';
import {
  createMobInstance,
  createStarterHavenMobs,
  getSpawnPoolForRealm,
  stepMobAI,
  type ActiveMob,
} from '../entities/ai';
import { AudioEngine, SpatialVoiceManager } from '../engine/audio';
import { VoxelRenderer, type DroppedItemVisual, type ProjectileVisual } from '../engine/renderer';
import { MultiplayerClient, type PeerState } from '../network/client';

export type GameState = 'title' | 'playing' | 'paused' | 'gameover';
export type CameraMode = 'first' | 'third_back' | 'third_front';
export type PlayMode = 'offline' | 'online';

export interface StartGameOptions {
  playMode: PlayMode;
  roomCode: string;
  playerName: string;
  skinId: string;
  seed: string;
  mode: GameMode;
  difficulty: Difficulty;
  biomePreset?: string;
  enabledMods: string[];
  loadSaved?: boolean;
}

export interface ChatEntry {
  id: number;
  sender: string;
  text: string;
  system?: boolean;
  whisper?: boolean;
}

export interface PickupToast {
  id: number;
  itemId: number;
  name: string;
  count: number;
  expiresAt: number;
}

export interface HudSnapshot {
  gameState: GameState;
  playMode: PlayMode;
  roomCode: string;
  connected: boolean;
  playerName: string;
  skinId: string;
  mode: GameMode;
  difficulty: Difficulty;
  realm: RealmId;
  seed: string;
  biomeName: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  hp: number;
  maxHp: number;
  hunger: number;
  armor: number;
  xpLevel: number;
  xpProgress: number;
  cameraMode: CameraMode;
  timeOfDay: number;
  weather: 'clear' | 'rain' | 'storm';
  targetBlockName: string | null;
  hotbar: Array<InventorySlot | null>;
  backpack: Array<InventorySlot | null>;
  craftGrid: Array<InventorySlot | null>;
  armorSlots: { head: InventorySlot | null; chest: InventorySlot | null; legs: InventorySlot | null; feet: InventorySlot | null };
  selectedHotbar: number;
  nearbyStations: Array<Recipe['station']>;
  peers: PeerState[];
  bossBar: { name: string; hp: number; maxHp: number } | null;
  bossWave: number;
  modeStatus: string;
  waypoint: { x: number; z: number; label: string } | null;
  chat: ChatEntry[];
  toasts: PickupToast[];
  enabledMods: string[];
  voice: {
    micEnabled: boolean;
    muted: boolean;
    pttActive: boolean;
    globalRadio: boolean;
    vadThreshold: number;
    micLevel: number;
  };
  minimapCells: string[]; // 15x15 hex colors around player
  activeModal: 'none' | 'inventory' | 'chat' | 'map' | 'creator';
  activeStation: Recipe['station'] | 'enchant' | null;
  pointerLocked: boolean;
}

interface DropEntity {
  uid: number;
  id: number;
  count: number;
  x: number;
  y: number;
  z: number;
  vy: number;
  ttl: number;
}

interface ActiveProjectile {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  kind: 'arrow' | 'fireball' | 'sonic';
  fromPlayer: boolean;
  ttl: number;
}

const SAVE_KEY = 'voxelRealmsKathir_save_v1';

export function hasSavedOfflineWorld(): boolean {
  try {
    return Boolean(localStorage.getItem(SAVE_KEY));
  } catch {
    return false;
  }
}

export class GameEngine {
  public world = new VoxelWorld('Kathir');
  public renderer: VoxelRenderer;
  public audio = new AudioEngine();
  public voice = new SpatialVoiceManager();
  public net: MultiplayerClient;

  public gameState: GameState = 'title';
  public playMode: PlayMode = 'offline';
  public roomCode = 'KATHIR-1';
  public playerName = 'KathirHero';
  public skinId = 'sunny';
  public mode: GameMode = 'survival';
  public difficulty: Difficulty = 'normal';
  public cameraMode: CameraMode = 'first';
  public enabledMods = new Set<string>(MOD_PACKS.filter((m) => m.enabledByDefault).map((m) => m.id));

  // Player Physics & Stats
  public px = 0.5;
  public py = 66.2;
  public pz = 6.5;
  public vx = 0;
  public vy = 0;
  public vz = 0;
  public yaw = 0;
  public pitch = -0.1;
  public onGround = true;
  public flying = false;
  public ridingMobId: number | null = null;
  private fallStartY = 66.2;
  private wasFalling = false;
  private lastSpaceAt = 0;

  public hp = 20;
  public maxHp = 20;
  public hunger = 20;
  public saturation = 5;
  public xpLevel = 3;
  public xpProgress = 0.35;
  private hungerTick = 0;
  private regenTick = 0;
  private portalCooldown = 0;

  // World Time & Weather
  public timeOfDay = 11900; // Golden sunset showcase
  public weather: 'clear' | 'rain' | 'storm' = 'clear';

  // Inventory (9 hotbar + 27 backpack + 9 craftGrid + 4 armor)
  public hotbar: Array<InventorySlot | null> = Array(9).fill(null);
  public backpack: Array<InventorySlot | null> = Array(27).fill(null);
  public craftGrid: Array<InventorySlot | null> = Array(9).fill(null);
  public armorSlots: { head: InventorySlot | null; chest: InventorySlot | null; legs: InventorySlot | null; feet: InventorySlot | null } = {
    head: null,
    chest: null,
    legs: null,
    feet: null,
  };
  public selectedHotbar = 0;

  // Entities & Queues
  public mobs: ActiveMob[] = [];
  public drops: DropEntity[] = [];
  public projectiles: ActiveProjectile[] = [];
  private nextUid = 1;
  private fluidQueue: FluidNode[] = [];
  private fallingQueue: Array<[number, number, number]> = [];
  private redstone: RedstoneCircuitState = createRedstoneState();
  private redstoneAccum = 0;
  private mobSpawnTimer = 0;

  // Special Mode Timers & Waypoints
  public bossWave = 0;
  private horrorSpawnTimer = 0;
  private trollBreakCount = 0;
  private trollCooldown = 0;
  public waypoint: { x: number; z: number; label: string } | null = null;

  // Mining & Swing
  private swingTimer = 0;
  private attackHeld = false;
  private mineTarget: { x: number; y: number; z: number; progress: number } | null = null;
  private currentAim: { hit: [number, number, number]; prev: [number, number, number]; id: number } | null = null;

  // UI & Modal state
  public activeModal: 'none' | 'inventory' | 'chat' | 'map' | 'creator' = 'none';
  public activeStation: Recipe['station'] | 'enchant' | null = null;
  public chat: ChatEntry[] = [];
  public toasts: PickupToast[] = [];
  private activeEffects = new Map<string, number>();

  // Voice Settings
  public micEnabled = false;
  public micMuted = false;
  public pttActive = false;
  public globalRadio = false;
  public vadThreshold = 0.08;

  // Loop & Input
  private keys = new Set<string>();
  private disposed = false;
  private lastFrameMs = performance.now();
  private elapsed = 0;
  private hudAccum = 0;
  private netPoseAccum = 0;
  private onHudUpdate: (snap: HudSnapshot) => void;

  constructor(container: HTMLElement, onHudUpdate: (snap: HudSnapshot) => void) {
    this.onHudUpdate = onHudUpdate;
    this.renderer = new VoxelRenderer(container);

    this.net = new MultiplayerClient(
      {
        onConnected: (_pid, edits, serverSeed) => {
          if (serverSeed && serverSeed !== this.world.seedStr) {
            this.world.setSeed(serverSeed);
          }
          for (const [realm, x, y, z, id] of edits) {
            if (realm === this.world.realm) {
              this.world.setBlock(x, y, z, id, true);
            } else {
              this.world.edits.set(`${realm}:${x},${y},${z}`, id);
            }
          }
          this.pushChat('System', `Connected to room ${this.roomCode} (Online Multiplayer)`, true);
          this.emitHud();
        },
        onDisconnected: () => {
          this.emitHud();
        },
        onBlockEdit: (realm, x, y, z, id) => {
          if (realm === this.world.realm) {
            this.world.setBlock(x, y, z, id, true);
          } else {
            this.world.edits.set(`${realm}:${x},${y},${z}`, id);
          }
        },
        onChat: (sender, text, system, whisper) => {
          this.pushChat(sender, text, system, whisper);
        },
        onPeersChange: () => {
          this.emitHud();
        },
      },
      this.voice,
    );

    // Preload Sunset Haven chunks and render Frame 0 immediately for Title Screen showcase
    this.preloadSpawnRadius(2);
    this.mobs = createStarterHavenMobs('overworld', 'normal');
    this.syncBodyState('title');
    this.bindEvents();
    this.stepTitleTour(0.016);
    this.renderer.syncWorldChunks(this.world, 0, -2, 2);
    this.renderer.updateAtmosphere('overworld', this.timeOfDay, 'clear', 0, 68, -2, 0, this.mode, false);
    this.renderer.updateEntities(
      {
        x: this.px,
        y: this.py,
        z: this.pz,
        yaw: 0,
        skinId: this.skinId,
        moving: 0,
        swing: 0,
        visible: false,
        firstPerson: false,
        heldColor: null,
      },
      this.mobs,
      [],
      [],
      [],
      'overworld',
      0.016,
      0,
    );
    this.renderer.renderFrame();
    this.emitHud();
    this.scheduleNextTick();
  }

  private syncBodyState(state: GameState): void {
    this.gameState = state;
    if (typeof document !== 'undefined') {
      document.body.dataset.state = state;
    }
  }

  private preloadSpawnRadius(r: number): void {
    const cx0 = Math.floor(this.px / 16);
    const cz0 = Math.floor(this.pz / 16);
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        this.world.getOrCreateChunk(cx0 + dx, cz0 + dz);
      }
    }
  }

  public startNewGame(opts: StartGameOptions): void {
    this.audio.unlock();
    this.playMode = opts.playMode;
    this.roomCode = opts.roomCode || 'KATHIR-1';
    this.playerName = opts.playerName.trim() || 'Traveler';
    this.skinId = opts.skinId || 'steve';
    this.mode = opts.mode;
    this.difficulty = opts.difficulty;
    this.enabledMods = new Set(opts.enabledMods);
    this.activeModal = 'none';
    this.activeStation = null;
    this.keys.clear();

    this.net.disconnect();

    if (opts.loadSaved && opts.playMode === 'offline' && this.loadOfflineWorld()) {
      this.syncBodyState('playing');
      this.pushChat('System', 'Loaded saved offline world · Designed & Created by KATHIR', true);
      this.emitHud();
      return;
    }

    this.world.setSeed(opts.seed || 'Kathir');
    this.world.setRealm('overworld');
    this.redstone = createRedstoneState();
    this.fluidQueue = [];
    this.fallingQueue = [];
    this.drops = [];
    this.projectiles = [];
    this.chat = [];
    this.toasts = [];
    this.activeEffects.clear();

    const preset = TELEPORT_BIOME_PRESETS.find((b) => b.label === opts.biomePreset);
    this.px = preset ? preset.x + 0.5 : 0.5;
    this.pz = preset ? preset.z + 0.5 : 6.5;
    this.preloadSpawnRadius(3);
    this.py = Math.max(66.2, this.world.getSurfaceY(Math.floor(this.px), Math.floor(this.pz)));
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.yaw = 0.25;
    this.pitch = -0.06;
    this.flying = this.isCreativeLike() || this.mode === 'spectator';

    this.hp = 20;
    this.maxHp = 20;
    this.hunger = 20;
    this.xpLevel = 3;
    this.xpProgress = 0.25;
    this.timeOfDay = this.mode === 'horror' ? 18000 : 11900;
    this.weather = this.mode === 'horror' ? 'storm' : 'clear';
    this.bossWave = this.mode === 'boss_rush' ? 1 : 0;
    this.horrorSpawnTimer = 2;
    this.trollBreakCount = 0;
    this.trollCooldown = 0;

    this.grantStarterKit();
    this.mobs = createStarterHavenMobs('overworld', this.difficulty);

    if (this.mode === 'boss_rush') {
      this.spawnBossRushWave(1);
    } else if (this.mode === 'horror') {
      const stalker = createMobInstance('warden', this.px + 14, this.world.getSurfaceY(Math.floor(this.px + 14), Math.floor(this.pz - 12)) + 0.2, this.pz - 12);
      if (stalker) this.mobs.push(stalker);
    }

    const modeMeta = GAME_MODES.find((g) => g.id === this.mode);
    this.pushChat('System', `Welcome to Voxel Realms Remastered — Designed and Created by KATHIR!`, true);
    this.pushChat('System', `Mode: ${modeMeta?.name || this.mode} (${modeMeta?.genre || ''})`, true);
    if (this.playMode === 'online') {
      this.net.connect({
        room: this.roomCode,
        name: this.playerName,
        skinId: this.skinId,
        seed: this.world.seedStr,
        mode: this.mode,
        difficulty: this.difficulty,
        realm: this.world.realm,
      });
    } else {
      this.pushChat('System', 'Offline Single-Player active. [E] Craft · [M] Tactical Map · [C] Creator Studio · [F5] Camera · [T] Chat.', true);
    }

    this.syncBodyState('playing');
    this.emitHud();
  }

  private isCreativeLike(): boolean {
    return this.mode === 'creative' || this.mode === 'architect';
  }

  private spawnBossRushWave(wave: number): void {
    this.bossWave = wave;
    const bossKey = wave === 1 ? 'elder_guardian' : wave === 2 ? 'wither' : wave === 3 ? 'ender_dragon' : 'warden';
    const bx = Math.floor(this.px + 16);
    const bz = Math.floor(this.pz - 14);
    const by = Math.max(66, this.world.getSurfaceY(bx, bz)) + (bossKey === 'ender_dragon' || bossKey === 'wither' ? 6 : 0.5);
    const boss = createMobInstance(bossKey, bx + 0.5, by, bz + 0.5);
    if (boss) {
      boss.hp = Math.round(boss.hp * (1 + (wave - 1) * 0.25));
      boss.maxHp = boss.hp;
      this.mobs.push(boss);
      this.pushChat('System', `TITAN BOSS WAVE ${wave}: ${boss.def.name} has descended!`, true);
    }
  }

  private grantStarterKit(): void {
    this.hotbar.fill(null);
    this.backpack.fill(null);
    this.craftGrid.fill(null);
    this.armorSlots = { head: null, chest: null, legs: null, feet: null };
    if (this.mode === 'creative') {
      this.hotbar[0] = { id: I.diamond_pickaxe, count: 1 };
      this.hotbar[1] = { id: I.diamond_sword, count: 1 };
      this.hotbar[2] = { id: B.oak_planks, count: 64 };
      this.hotbar[3] = { id: B.cobblestone, count: 64 };
      this.hotbar[4] = { id: B.lantern, count: 64 };
      this.hotbar[5] = { id: B.redstone_lamp, count: 64 };
      this.hotbar[6] = { id: B.piston, count: 64 };
      this.hotbar[7] = { id: B.tnt, count: 64 };
      this.hotbar[8] = { id: I.egg_wolf || B.glass, count: 16 };
    } else if (this.mode === 'architect') {
      this.hotbar[0] = { id: I.diamond_pickaxe, count: 1 };
      this.hotbar[1] = { id: B.stone_bricks, count: 64 };
      this.hotbar[2] = { id: B.oak_planks, count: 64 };
      this.hotbar[3] = { id: B.bricks, count: 64 };
      this.hotbar[4] = { id: B.cherry_leaves, count: 64 };
      this.hotbar[5] = { id: B.lantern, count: 64 };
      this.hotbar[6] = { id: B.glass, count: 64 };
      this.hotbar[7] = { id: B.copper_block, count: 64 };
      this.hotbar[8] = { id: B.beacon, count: 16 };
    } else if (this.mode === 'boss_rush') {
      this.armorSlots.chest = { id: I.diamond_chestplate, count: 1, durability: 528 };
      this.hotbar[0] = { id: I.diamond_sword, count: 1, durability: 1561, enchants: { sharpness: 3 } };
      this.hotbar[1] = { id: I.bow, count: 1, durability: 384 };
      this.hotbar[2] = { id: I.golden_apple, count: 8 };
      this.hotbar[3] = { id: I.cooked_beef, count: 16 };
      this.hotbar[4] = { id: I.diamond_pickaxe, count: 1, durability: 1561 };
      this.hotbar[5] = { id: B.cobblestone, count: 32 };
      this.hotbar[6] = { id: B.torch, count: 16 };
      this.hotbar[7] = { id: I.potion_healing, count: 3 };
      this.hotbar[8] = { id: I.shield, count: 1 };
    } else if (this.mode === 'troll') {
      this.hotbar[0] = { id: I.diamond_pickaxe, count: 1, durability: 1561 };
      this.hotbar[1] = { id: I.mace, count: 1, durability: 500 };
      this.hotbar[2] = { id: B.tnt, count: 32 };
      this.hotbar[3] = { id: B.slime_block, count: 32 };
      this.hotbar[4] = { id: I.firework_rocket, count: 16 };
      this.hotbar[5] = { id: I.apple, count: 8 };
      this.hotbar[6] = { id: B.anvil, count: 8 };
      this.hotbar[7] = { id: B.oak_planks, count: 32 };
      this.hotbar[8] = { id: I.egg_wolf || B.sponge, count: 8 };
    } else {
      this.hotbar[0] = { id: I.wood_pickaxe, count: 1, durability: 59 };
      this.hotbar[1] = { id: I.iron_sword, count: 1, durability: 250 };
      this.hotbar[2] = { id: B.oak_planks, count: 24 };
      this.hotbar[3] = { id: B.cobblestone, count: 24 };
      this.hotbar[4] = { id: B.torch, count: 16 };
      this.hotbar[5] = { id: I.apple, count: 6 };
      this.hotbar[6] = { id: I.cooked_beef, count: 4 };
      this.hotbar[7] = { id: I.bone, count: 4 };
      this.hotbar[8] = { id: B.crafting_table, count: 1 };
    }
    this.selectedHotbar = 0;
  }

  public saveOfflineWorld(): boolean {
    try {
      const payload = {
        seed: this.world.seedStr,
        realm: this.world.realm,
        mode: this.mode,
        difficulty: this.difficulty,
        playerName: this.playerName,
        skinId: this.skinId,
        px: this.px,
        py: this.py,
        pz: this.pz,
        hp: this.hp,
        hunger: this.hunger,
        xpLevel: this.xpLevel,
        xpProgress: this.xpProgress,
        timeOfDay: this.timeOfDay,
        hotbar: this.hotbar,
        backpack: this.backpack,
        armorSlots: this.armorSlots,
        enabledMods: Array.from(this.enabledMods),
        edits: this.world.exportEditsArray(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      this.pushChat('System', 'World saved to offline browser storage.', true);
      return true;
    } catch {
      return false;
    }
  }

  private loadOfflineWorld(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const d = JSON.parse(raw) as Record<string, unknown>;
      this.world.setSeed(String(d.seed || 'Kathir'));
      this.world.setRealm((d.realm as RealmId) || 'overworld');
      this.mode = (d.mode as GameMode) || 'survival';
      this.difficulty = (d.difficulty as Difficulty) || 'normal';
      this.playerName = String(d.playerName || this.playerName);
      this.skinId = String(d.skinId || this.skinId);
      this.px = Number(d.px) || 0.5;
      this.py = Number(d.py) || 66.2;
      this.pz = Number(d.pz) || 6.5;
      this.hp = Number(d.hp) || 20;
      this.hunger = Number(d.hunger) || 20;
      this.xpLevel = Number(d.xpLevel) || 1;
      this.xpProgress = Number(d.xpProgress) || 0;
      this.timeOfDay = Number(d.timeOfDay) || 11900;
      if (Array.isArray(d.hotbar)) this.hotbar = d.hotbar as Array<InventorySlot | null>;
      if (Array.isArray(d.backpack)) this.backpack = d.backpack as Array<InventorySlot | null>;
      if (d.armorSlots) this.armorSlots = d.armorSlots as typeof this.armorSlots;
      if (Array.isArray(d.enabledMods)) this.enabledMods = new Set(d.enabledMods as string[]);
      if (Array.isArray(d.edits)) {
        for (const [realm, x, y, z, id] of d.edits as Array<[RealmId, number, number, number, number]>) {
          this.world.edits.set(`${realm}:${x},${y},${z}`, id);
        }
      }
      this.preloadSpawnRadius(3);
      this.mobs = createStarterHavenMobs(this.world.realm, this.difficulty);
      return true;
    } catch {
      return false;
    }
  }

  public resumeGame(): void {
    if (this.gameState === 'paused') {
      this.syncBodyState('playing');
      this.emitHud();
    }
  }

  public pauseGame(): void {
    if (this.gameState === 'playing') {
      this.keys.clear();
      this.attackHeld = false;
      this.exitPointerLock();
      this.syncBodyState('paused');
      this.emitHud();
    }
  }

  public returnToTitle(): void {
    this.keys.clear();
    this.attackHeld = false;
    this.activeModal = 'none';
    this.exitPointerLock();
    if (this.playMode === 'offline') this.saveOfflineWorld();
    this.net.disconnect();
    this.world.setRealm('overworld');
    this.px = 0.5;
    this.py = 66.2;
    this.pz = 6.5;
    this.preloadSpawnRadius(3);
    this.mobs = createStarterHavenMobs('overworld', 'normal');
    this.syncBodyState('title');
    this.emitHud();
  }

  public respawnPlayer(): void {
    if (this.mode === 'hardcore') {
      this.mode = 'spectator';
      this.flying = true;
      this.hp = 20;
      this.syncBodyState('playing');
      this.emitHud();
      return;
    }
    this.world.setRealm('overworld');
    this.px = 0.5;
    this.pz = 6.5;
    this.preloadSpawnRadius(3);
    this.py = Math.max(66.2, this.world.getSurfaceY(0, 6));
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.hp = this.maxHp;
    this.hunger = 20;
    this.syncBodyState('playing');
    this.emitHud();
  }

  public setHotbarSlot(index: number): void {
    if (index >= 0 && index < 9) {
      this.selectedHotbar = index;
      this.emitHud();
    }
  }

  public toggleInventory(station: Recipe['station'] | 'enchant' | null = null): void {
    if (this.gameState !== 'playing') return;
    if (this.activeModal === 'inventory') {
      this.returnCraftGridToInventory();
      this.activeModal = 'none';
      this.activeStation = null;
    } else {
      this.keys.clear();
      this.exitPointerLock();
      this.activeModal = 'inventory';
      this.activeStation = station;
    }
    this.emitHud();
  }

  public toggleMap(): void {
    if (this.gameState !== 'playing') return;
    if (this.activeModal === 'map') {
      this.activeModal = 'none';
    } else {
      this.keys.clear();
      this.exitPointerLock();
      this.activeModal = 'map';
    }
    this.emitHud();
  }

  public toggleCreatorPanel(): void {
    if (this.gameState !== 'playing') return;
    if (this.activeModal === 'creator') {
      this.activeModal = 'none';
    } else {
      this.keys.clear();
      this.exitPointerLock();
      this.activeModal = 'creator';
    }
    this.emitHud();
  }

  public openChat(prefill = ''): void {
    if (this.gameState !== 'playing') return;
    this.keys.clear();
    this.exitPointerLock();
    this.activeModal = 'chat';
    this.emitHud();
    void prefill;
  }

  public closeModal(): void {
    if (this.activeModal === 'inventory') {
      this.returnCraftGridToInventory();
    }
    this.activeModal = 'none';
    this.activeStation = null;
    this.emitHud();
  }

  private returnCraftGridToInventory(): void {
    const combined = [...this.hotbar, ...this.backpack];
    for (let i = 0; i < this.craftGrid.length; i++) {
      const s = this.craftGrid[i];
      if (s && s.count > 0) {
        addItemToInventory(combined, s.id, s.count, s.durability);
        this.craftGrid[i] = null;
      }
    }
    for (let i = 0; i < 9; i++) this.hotbar[i] = combined[i];
    for (let i = 0; i < 27; i++) this.backpack[i] = combined[9 + i];
  }

  public cycleCamera(): void {
    this.cameraMode =
      this.cameraMode === 'first'
        ? 'third_back'
        : this.cameraMode === 'third_back'
          ? 'third_front'
          : 'first';
    this.emitHud();
  }

  public setSkin(skinId: string): void {
    this.skinId = skinId;
    this.emitHud();
  }

  public setMode(mode: GameMode): void {
    this.mode = mode;
    this.flying = this.isCreativeLike() || mode === 'spectator';
    if (mode === 'horror') {
      this.timeOfDay = 18000;
      this.weather = 'storm';
    } else if (mode === 'boss_rush' && !this.mobs.some((m) => m.def.group === 'Bosses' && m.hp > 0)) {
      this.spawnBossRushWave(Math.max(1, this.bossWave || 1));
    }
    const meta = GAME_MODES.find((g) => g.id === mode);
    this.pushChat('System', `Switched Mode: ${meta?.name || mode}`, true);
    this.emitHud();
  }

  public setWorldTime(ticks: number): void {
    this.timeOfDay = ((Math.floor(ticks) % 24000) + 24000) % 24000;
    this.emitHud();
  }

  public setWorldWeather(w: 'clear' | 'rain' | 'storm'): void {
    this.weather = w;
    this.emitHud();
  }

  public toggleMod(modId: string): void {
    if (this.enabledMods.has(modId)) this.enabledMods.delete(modId);
    else this.enabledMods.add(modId);
    this.emitHud();
  }

  public async toggleMic(): Promise<void> {
    if (!this.micEnabled) {
      const ok = await this.net.enableVoice();
      this.micEnabled = ok;
      this.pushChat('System', ok ? 'Microphone enabled (V = Push-to-Talk).' : 'Microphone permission denied or unavailable.', true);
    } else {
      this.micMuted = !this.micMuted;
    }
    this.emitHud();
  }

  public setVoiceConfig(patch: Partial<{ muted: boolean; globalRadio: boolean; vadThreshold: number }>): void {
    if (patch.muted !== undefined) this.micMuted = patch.muted;
    if (patch.globalRadio !== undefined) this.globalRadio = patch.globalRadio;
    if (patch.vadThreshold !== undefined) this.vadThreshold = patch.vadThreshold;
    this.emitHud();
  }

  public grantItem(id: number, count: number): void {
    const combined = [...this.hotbar, ...this.backpack];
    addItemToInventory(combined, id, count, ITEMS[id]?.durability);
    for (let i = 0; i < 9; i++) this.hotbar[i] = combined[i];
    for (let i = 0; i < 27; i++) this.backpack[i] = combined[9 + i];
    this.pushToast(id, count);
    this.emitHud();
  }

  public swapSlots(
    sectionA: 'hotbar' | 'backpack' | 'craft',
    idxA: number,
    sectionB: 'hotbar' | 'backpack' | 'craft',
    idxB: number,
  ): void {
    const getArr = (s: 'hotbar' | 'backpack' | 'craft') =>
      s === 'hotbar' ? this.hotbar : s === 'backpack' ? this.backpack : this.craftGrid;
    const arrA = getArr(sectionA);
    const arrB = getArr(sectionB);
    const a = arrA[idxA];
    const b = arrB[idxB];
    if (a && b && a.id === b.id && a !== b) {
      const cap = maxStack(a.id);
      const move = Math.min(cap - b.count, a.count);
      if (move > 0) {
        b.count += move;
        a.count -= move;
        if (a.count <= 0) arrA[idxA] = null;
        this.emitHud();
        return;
      }
    }
    arrA[idxA] = b;
    arrB[idxB] = a;
    this.emitHud();
  }

  public placeOneInCraftGrid(fromSec: 'hotbar' | 'backpack', fromIdx: number, gridIdx: number): void {
    const arr = fromSec === 'hotbar' ? this.hotbar : this.backpack;
    const src = arr[fromIdx];
    if (!src) return;
    const dst = this.craftGrid[gridIdx];
    if (dst && dst.id !== src.id) return;
    if (!dst) {
      this.craftGrid[gridIdx] = { id: src.id, count: 1, durability: src.durability };
    } else if (dst.count < maxStack(dst.id)) {
      dst.count++;
    } else {
      return;
    }
    src.count--;
    if (src.count <= 0) arr[fromIdx] = null;
    this.emitHud();
  }

  public craftFromGrid(gridSize: 2 | 3): boolean {
    const ids = Array.from({ length: gridSize * gridSize }, (_, i) => this.craftGrid[i]?.id ?? null);
    const matched = matchCraftingGrid(ids, gridSize);
    if (!matched) return false;
    const combined = [...this.hotbar, ...this.backpack];
    const leftover = addItemToInventory(combined, matched.id, matched.count, ITEMS[matched.id]?.durability);
    if (leftover > 0) {
      this.pushChat('System', 'Inventory full!', true);
      return false;
    }
    for (let i = 0; i < gridSize * gridSize; i++) {
      const s = this.craftGrid[i];
      if (s) {
        s.count--;
        if (s.count <= 0) this.craftGrid[i] = null;
      }
    }
    for (let i = 0; i < 9; i++) this.hotbar[i] = combined[i];
    for (let i = 0; i < 27; i++) this.backpack[i] = combined[9 + i];
    this.audio.play('xp');
    this.pushToast(matched.id, matched.count);
    this.gainXp(4);
    this.emitHud();
    return true;
  }

  public equipArmorSlot(armorKey: keyof GameEngine['armorSlots'], fromSec: 'hotbar' | 'backpack', fromIdx: number): void {
    const arr = fromSec === 'hotbar' ? this.hotbar : this.backpack;
    const src = arr[fromIdx];
    const prev = this.armorSlots[armorKey];
    this.armorSlots[armorKey] = src;
    arr[fromIdx] = prev;
    this.emitHud();
  }

  public craftById(recipeId: string): boolean {
    const r = RECIPES.find((rec) => rec.id === recipeId);
    if (!r) return false;
    const stations = new Set(this.getNearbyStations());
    const combined = [...this.hotbar, ...this.backpack];
    const res = craftRecipe(r, combined, stations);
    if (res.crafted) {
      for (let i = 0; i < 9; i++) this.hotbar[i] = combined[i];
      for (let i = 0; i < 27; i++) this.backpack[i] = combined[9 + i];
      this.audio.play('xp');
      this.pushToast(r.output.id, r.output.count);
      this.gainXp(4);
      this.emitHud();
      return true;
    }
    this.pushChat('System', res.reason || 'Cannot craft recipe.', true);
    return false;
  }

  public enchantHeldItem(enchantKey: string): boolean {
    const slot = this.hotbar[this.selectedHotbar];
    if (!slot) return false;
    if (!this.isCreativeLike() && this.xpLevel < 1) {
      this.pushChat('System', 'Need at least 1 XP Level to enchant.', true);
      return false;
    }
    if (!this.isCreativeLike()) this.xpLevel -= 1;
    slot.enchants = slot.enchants || {};
    slot.enchants[enchantKey] = Math.min(5, (slot.enchants[enchantKey] || 0) + 1);
    this.audio.play('xp');
    this.pushChat('System', `Enchanted ${getName(slot.id)} with ${enchantKey} ${slot.enchants[enchantKey]}!`, true);
    this.emitHud();
    return true;
  }

  public teleportToCoords(x: number, z: number): void {
    const ix = Math.round(x);
    const iz = Math.round(z);
    this.px = ix + 0.5;
    this.pz = iz + 0.5;
    this.preloadSpawnRadius(3);
    this.py = Math.max(46, this.world.getSurfaceY(ix, iz) + 0.2);
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.pushChat('System', `Teleported to ${ix}, ${Math.round(this.py)}, ${iz}`, true);
    this.emitHud();
  }

  public setWaypoint(x: number, z: number, label = 'Pin'): void {
    this.waypoint = { x: Math.round(x), z: Math.round(z), label };
    this.emitHud();
  }

  public clearWaypoint(): void {
    this.waypoint = null;
    this.emitHud();
  }

  public buildBlueprint(type: BlueprintType): void {
    const dir = this.getLookVector();
    const ox = Math.round(this.px + dir.dx * 7);
    const oz = Math.round(this.pz + dir.dz * 7);
    const oy = Math.max(45, this.world.getSurfaceY(ox, oz) - 1);
    placeBlueprintStructure(
      (x, y, z, id) => {
        this.placeBlockWorld(x, y, z, id);
      },
      type,
      ox,
      oy,
      oz,
    );
    this.audio.play('place');
    this.pushChat('System', `Built ${type.replace('_', ' ')} blueprint at (${ox}, ${oy}, ${oz})!`, true);
    this.emitHud();
  }

  public teleportToBiome(presetName: string): void {
    const p = TELEPORT_BIOME_PRESETS.find((b) => b.label === presetName);
    if (!p) return;
    if (p.realm !== this.world.realm) {
      this.switchRealm(p.realm);
    }
    this.px = p.x + 0.5;
    this.pz = p.z + 0.5;
    this.preloadSpawnRadius(3);
    this.py = Math.max(46, this.world.getSurfaceY(p.x, p.z));
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.pushChat('System', `Fast-traveled to ${p.label}`, true);
    this.emitHud();
  }

  public switchRealm(targetRealm: RealmId): void {
    if (this.world.realm === targetRealm) return;
    this.world.setRealm(targetRealm);
    this.audio.play('portal');
    if (targetRealm === 'overworld') {
      this.px = 14.5;
      this.pz = -8.5;
      this.py = 66.5;
    } else if (targetRealm === 'nether') {
      this.px = 0.5;
      this.pz = 0.5;
      this.py = 44.5;
    } else {
      this.px = 0.5;
      this.pz = 2.5;
      this.py = 69.5;
    }
    this.preloadSpawnRadius(3);
    this.mobs = createStarterHavenMobs(targetRealm, this.difficulty);
    this.portalCooldown = 3.0;
    this.pushChat('System', `Entered realm: ${targetRealm.toUpperCase()}`, true);
    this.emitHud();
  }

  public submitChatOrCommand(raw: string): void {
    const trimmed = raw.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('/')) {
      const parsed = parseSlashCommand(trimmed, this.world.seedStr);
      if (parsed.action) {
        const act = parsed.action;
        if (act.type === 'gamemode') {
          this.setMode(act.mode);
        } else if (act.type === 'tp') {
          this.px = act.x;
          this.py = act.y;
          this.pz = act.z;
          this.preloadSpawnRadius(3);
        } else if (act.type === 'give') {
          this.grantItem(act.itemId, act.count);
        } else if (act.type === 'summon') {
          const m = createMobInstance(act.mob, this.px + 2, this.py + 0.5, this.pz + 2);
          if (m) {
            this.mobs.push(m);
          } else {
            this.pushChat('System', `Unknown mob "${act.mob}".`, true);
            return;
          }
        } else if (act.type === 'time') {
          this.timeOfDay = act.ticks;
        } else if (act.type === 'weather') {
          this.weather = act.weather === 'thunder' ? 'storm' : act.weather;
        } else if (act.type === 'realm') {
          this.switchRealm(act.realm);
        } else if (act.type === 'kill') {
          this.hp = 0;
          this.syncBodyState('gameover');
        } else if (act.type === 'effect') {
          this.activeEffects.set(act.effect, act.seconds);
        } else if (act.type === 'enchant') {
          this.enchantHeldItem(act.enchant);
        } else if (act.type === 'difficulty') {
          this.difficulty = act.difficulty;
        } else if (act.type === 'msg' && this.playMode === 'online') {
          this.net.sendChat(act.text, act.target);
        }
      }
      this.pushChat('System', parsed.reply, true);
    } else {
      this.pushChat(this.playerName, trimmed);
      if (this.playMode === 'online') {
        this.net.sendChat(trimmed);
      }
    }
    this.emitHud();
  }

  private pushChat(sender: string, text: string, system = false, whisper = false): void {
    this.chat.push({ id: this.nextUid++, sender, text, system, whisper });
    if (this.chat.length > 40) this.chat.shift();
  }

  private pushToast(itemId: number, count: number): void {
    const now = performance.now();
    this.toasts.push({
      id: this.nextUid++,
      itemId,
      name: getName(itemId),
      count,
      expiresAt: now + 3500,
    });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  private gainXp(amount: number): void {
    this.xpProgress += amount / (12 + this.xpLevel * 4);
    while (this.xpProgress >= 1) {
      this.xpProgress -= 1;
      this.xpLevel++;
      this.audio.play('xp');
    }
  }

  private getNearbyStations(): Array<Recipe['station']> {
    const stations: Array<Recipe['station']> = ['hand'];
    if (this.activeStation && this.activeStation !== 'enchant') stations.push(this.activeStation);
    const bx = Math.floor(this.px);
    const by = Math.floor(this.py);
    const bz = Math.floor(this.pz);
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dz = -3; dz <= 3; dz++) {
          const id = this.world.getBlock(bx + dx, by + dy, bz + dz);
          const ws = BLOCKS[id]?.workstation;
          if (ws === 'crafting') stations.push('crafting');
          else if (ws === 'furnace' || ws === 'blast' || ws === 'smoker') stations.push('furnace');
          else if (ws === 'smithing') stations.push('smithing');
          else if (ws === 'brewing') stations.push('brewing');
        }
      }
    }
    if (this.isCreativeLike()) {
      stations.push('crafting', 'furnace', 'smithing', 'brewing');
    }
    return Array.from(new Set(stations));
  }

  private exitPointerLock(): void {
    try {
      if (document.pointerLockElement) document.exitPointerLock();
    } catch {
      // ignore
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    document.addEventListener('visibilitychange', this.handleVisibility);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    const canvas = this.renderer.renderer.domElement;
    canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    window.addEventListener('wheel', this.handleWheel, { passive: true });
  }

  private handleResize = () => {
    this.renderer.resize();
    this.renderer.renderFrame();
  };

  private handleBlur = () => {
    this.keys.clear();
    this.attackHeld = false;
    this.pttActive = false;
  };

  private handleVisibility = () => {
    if (document.hidden) {
      this.keys.clear();
      this.attackHeld = false;
    }
  };

  private handlePointerLockChange = () => {
    this.emitHud();
  };

  private handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private handleWheel = (e: WheelEvent) => {
    if (this.gameState !== 'playing' || this.activeModal !== 'none') return;
    if (e.deltaY > 0) this.selectedHotbar = (this.selectedHotbar + 1) % 9;
    else if (e.deltaY < 0) this.selectedHotbar = (this.selectedHotbar + 8) % 9;
    this.emitHud();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (this.gameState === 'title') return;

    if (e.code === 'Escape') {
      e.preventDefault();
      if (this.activeModal !== 'none') {
        this.closeModal();
      } else if (this.gameState === 'playing') {
        this.pauseGame();
      } else if (this.gameState === 'paused') {
        this.resumeGame();
      }
      return;
    }

    if (this.gameState !== 'playing') return;

    if (this.activeModal === 'none') {
      if (e.code === 'KeyE') {
        e.preventDefault();
        this.toggleInventory();
        return;
      }
      if (e.code === 'KeyM') {
        e.preventDefault();
        this.toggleMap();
        return;
      }
      if (e.code === 'KeyC') {
        e.preventDefault();
        this.toggleCreatorPanel();
        return;
      }
      if (e.code === 'KeyT' || e.key === '/') {
        e.preventDefault();
        this.openChat(e.key === '/' ? '/' : '');
        return;
      }
      if (e.code === 'F5') {
        e.preventDefault();
        this.cycleCamera();
        return;
      }
      if (e.code === 'KeyN') {
        this.micMuted = !this.micMuted;
        this.emitHud();
        return;
      }
      if (e.code === 'KeyV') {
        this.pttActive = true;
      }
      if (e.code === 'KeyQ') {
        this.dropSelectedItem();
        return;
      }
      if (e.code.startsWith('Digit')) {
        const n = Number(e.code.replace('Digit', ''));
        if (n >= 1 && n <= 9) {
          this.setHotbarSlot(n - 1);
        }
      }
      if (e.code === 'Space') {
        const now = performance.now();
        if ((this.isCreativeLike() || this.mode === 'spectator') && now - this.lastSpaceAt < 280) {
          this.flying = !this.flying;
          this.vy = 0;
        }
        this.lastSpaceAt = now;
        if (this.ridingMobId !== null) {
          this.ridingMobId = null;
        }
      }
    } else if (this.activeModal === 'inventory' && e.code === 'KeyE') {
      e.preventDefault();
      this.closeModal();
      return;
    } else if (this.activeModal === 'map' && e.code === 'KeyM') {
      e.preventDefault();
      this.closeModal();
      return;
    } else if (this.activeModal === 'creator' && e.code === 'KeyC') {
      e.preventDefault();
      this.closeModal();
      return;
    }

    this.keys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    if (e.code === 'KeyV') this.pttActive = false;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (this.gameState !== 'playing' || this.activeModal !== 'none') return;
    this.audio.unlock();
    const canvas = this.renderer.renderer.domElement;
    if (document.pointerLockElement !== canvas) {
      try {
        canvas.requestPointerLock?.();
      } catch {
        // fallback drag-look works automatically
      }
    }
    if (e.button === 0) {
      this.attackHeld = true;
      this.swingTimer = 0.25;
      this.tryAttackMob();
    } else if (e.button === 2) {
      this.swingTimer = 0.22;
      this.handleRightClick();
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.attackHeld = false;
      this.mineTarget = null;
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.gameState !== 'playing' || this.activeModal !== 'none') return;
    const locked = document.pointerLockElement === this.renderer.renderer.domElement;
    if (locked || (e.buttons & 1) !== 0 || (e.buttons & 4) !== 0) {
      this.yaw -= e.movementX * 0.0024;
      this.pitch = Math.max(-1.48, Math.min(1.48, this.pitch - e.movementY * 0.0024));
    }
  };

  private dropSelectedItem(): void {
    const slot = this.hotbar[this.selectedHotbar];
    if (!slot) return;
    const dropId = slot.id;
    slot.count--;
    if (slot.count <= 0) this.hotbar[this.selectedHotbar] = null;
    this.drops.push({
      uid: this.nextUid++,
      id: dropId,
      count: 1,
      x: this.px - Math.sin(this.yaw) * 1.4,
      y: this.py + 1.0,
      z: this.pz - Math.cos(this.yaw) * 1.4,
      vy: 2.5,
      ttl: 120,
    });
    this.emitHud();
  }

  private getEyePosition(): { x: number; y: number; z: number } {
    const sneakOff = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 1.38 : 1.62;
    return { x: this.px, y: this.py + sneakOff, z: this.pz };
  }

  private getLookVector(): { dx: number; dy: number; dz: number } {
    const cp = Math.cos(this.pitch);
    return {
      dx: -Math.sin(this.yaw) * cp,
      dy: Math.sin(this.pitch),
      dz: -Math.cos(this.yaw) * cp,
    };
  }

  private raycastBlock(maxDist = 6): { hit: [number, number, number]; prev: [number, number, number]; id: number } | null {
    const eye = this.getEyePosition();
    const dir = this.getLookVector();
    let prevX = Math.floor(eye.x);
    let prevY = Math.floor(eye.y);
    let prevZ = Math.floor(eye.z);

    for (let t = 0.2; t <= maxDist; t += 0.08) {
      const bx = Math.floor(eye.x + dir.dx * t);
      const by = Math.floor(eye.y + dir.dy * t);
      const bz = Math.floor(eye.z + dir.dz * t);
      if (bx === prevX && by === prevY && bz === prevZ) continue;
      const id = this.world.getBlock(bx, by, bz);
      if (id > 0 && id !== B.water && id !== B.lava) {
        return { hit: [bx, by, bz], prev: [prevX, prevY, prevZ], id };
      }
      prevX = bx;
      prevY = by;
      prevZ = bz;
    }
    return null;
  }

  private tryAttackMob(): boolean {
    const eye = this.getEyePosition();
    const dir = this.getLookVector();
    const held = this.hotbar[this.selectedHotbar];
    const itemDef = held && held.id >= 1000 ? ITEMS[held.id] : null;
    let dmg = itemDef?.damage ?? 2;
    if (held?.enchants?.sharpness) dmg += held.enchants.sharpness * 1.25;
    if (itemDef?.special === 'mace' && this.vy < -5) {
      dmg += Math.min(24, Math.abs(this.vy) * 1.1);
    }

    let bestMob: ActiveMob | null = null;
    let bestDist = 4.4;
    for (const m of this.mobs) {
      if (m.koTimer > 0) continue;
      const mx = m.x - eye.x;
      const my = m.y + m.def.height * 0.5 - eye.y;
      const mz = m.z - eye.z;
      const d = Math.hypot(mx, my, mz);
      if (d > bestDist) continue;
      const dot = (mx * dir.dx + my * dir.dy + mz * dir.dz) / (d || 1);
      if (dot > 0.72) {
        bestMob = m;
        bestDist = d;
      }
    }

    if (!bestMob) return false;

    bestMob.hp -= dmg;
    bestMob.flashTimer = 0.22;
    bestMob.panicTimer = 3.0;
    bestMob.vx += dir.dx * 7;
    bestMob.vz += dir.dz * 7;
    bestMob.vy = 4.2;
    this.audio.play('hit');

    if (bestMob.hp <= 0) {
      bestMob.koTimer = 0.34;
    }
    return true;
  }

  private handleRightClick(): void {
    const held = this.hotbar[this.selectedHotbar];
    const heldItem = held && held.id >= 1000 ? ITEMS[held.id] : null;

    // 1. Food & Potions
    if (heldItem && (heldItem.food || heldItem.potionEffect)) {
      if (heldItem.food && this.hunger < 20) {
        this.hunger = Math.min(20, this.hunger + heldItem.food);
        this.saturation = Math.min(20, this.saturation + (heldItem.saturation || 2));
      }
      if (heldItem.potionEffect) {
        if (heldItem.potionEffect === 'healing') this.hp = Math.min(this.maxHp, this.hp + 8);
        else this.activeEffects.set(heldItem.potionEffect, 90);
      }
      this.audio.play('eat');
      if (!this.isCreativeLike() && held) {
        held.count--;
        if (held.count <= 0) this.hotbar[this.selectedHotbar] = null;
      }
      this.emitHud();
      return;
    }

    // 2. Spawn Egg
    if (heldItem?.spawnMob && this.currentAim) {
      const [, ,] = this.currentAim.prev;
      const [px, py, pz] = this.currentAim.prev;
      const m = createMobInstance(heldItem.spawnMob, px + 0.5, py + 0.1, pz + 0.5);
      if (m) {
        this.mobs.push(m);
        this.audio.play('place');
        if (!this.isCreativeLike() && held) {
          held.count--;
          if (held.count <= 0) this.hotbar[this.selectedHotbar] = null;
        }
      }
      return;
    }

    // 3. Firework Rocket (Elytra boost)
    if (heldItem?.special === 'firework') {
      const look = this.getLookVector();
      this.vx += look.dx * 16;
      this.vy += Math.max(6, look.dy * 14);
      this.vz += look.dz * 16;
      this.audio.play('shoot');
      if (!this.isCreativeLike() && held) {
        held.count--;
        if (held.count <= 0) this.hotbar[this.selectedHotbar] = null;
      }
      return;
    }

    // 4. Bow / Trident Projectile
    if (heldItem?.special === 'bow' || heldItem?.special === 'trident') {
      const eye = this.getEyePosition();
      const dir = this.getLookVector();
      this.projectiles.push({
        x: eye.x + dir.dx * 0.6,
        y: eye.y + dir.dy * 0.6,
        z: eye.z + dir.dz * 0.6,
        vx: dir.dx * 26,
        vy: dir.dy * 26,
        vz: dir.dz * 26,
        kind: 'arrow',
        fromPlayer: true,
        ttl: 4,
      });
      this.audio.play('shoot');
      return;
    }

    // 5. Interact with nearby Mob (Tame Wolf with Bone or Mount Horse/Pig/Camel)
    const eye = this.getEyePosition();
    for (const m of this.mobs) {
      if (Math.hypot(m.x - eye.x, m.z - eye.z) < 3.6) {
        if (held?.id === I.bone && m.def.key === 'wolf' && !m.tamed) {
          m.tamed = true;
          this.audio.play('xp');
          this.pushChat('System', 'You tamed a loyal Wolf companion!', true);
          if (!this.isCreativeLike()) {
            held.count--;
            if (held.count <= 0) this.hotbar[this.selectedHotbar] = null;
          }
          return;
        }
        if (m.def.policy === 'mount' && this.ridingMobId === null) {
          this.ridingMobId = m.id;
          this.pushChat('System', `Mounted ${m.def.name}. Press Space to dismount.`, true);
          return;
        }
      }
    }

    if (!this.currentAim) return;
    const [hx, hy, hz] = this.currentAim.hit;
    const hitId = this.currentAim.id;
    const hitDef = BLOCKS[hitId];

    // 6. Workstation Interaction
    if (hitDef?.workstation && !this.keys.has('ShiftLeft')) {
      if (hitDef.workstation === 'bed') {
        this.timeOfDay = 2000;
        this.pushChat('System', 'Rested until morning.', true);
        this.emitHud();
        return;
      }
      const stationMap: Record<string, Recipe['station'] | 'enchant'> = {
        crafting: 'crafting',
        furnace: 'furnace',
        blast: 'furnace',
        smoker: 'furnace',
        smithing: 'smithing',
        brewing: 'brewing',
        enchant: 'enchant',
      };
      this.toggleInventory(stationMap[hitDef.workstation] || 'crafting');
      return;
    }

    // 7. Redstone Switch Interaction
    if (hitDef?.circuit && !this.keys.has('ShiftLeft')) {
      if (toggleSwitch(this.redstone, this.world, hx, hy, hz)) {
        this.audio.play('place');
        return;
      }
    }

    // 8. Water / Lava Bucket or Flint & Steel
    const [px, py, pz] = this.currentAim.prev;
    if (heldItem?.special === 'water_bucket') {
      this.placeBlockWorld(px, py, pz, B.water);
      if (!this.isCreativeLike()) this.hotbar[this.selectedHotbar] = { id: I.bucket, count: 1 };
      return;
    }
    if (heldItem?.special === 'lava_bucket') {
      this.placeBlockWorld(px, py, pz, B.lava);
      if (!this.isCreativeLike()) this.hotbar[this.selectedHotbar] = { id: I.bucket, count: 1 };
      return;
    }
    if (heldItem?.special === 'flint_steel' && hitId === B.tnt) {
      igniteTnt(this.redstone, hx, hy, hz);
      this.audio.play('place');
      return;
    }

    // 9. Place Block
    if (held && held.id > 0 && held.id < 1000) {
      if (this.mode === 'adventure') {
        const targetKey = hitDef?.key || '';
        if (!held.canPlaceOn?.includes(targetKey)) {
          this.pushChat('System', 'Adventure Mode: requires CanPlaceOn permission.', true);
          return;
        }
      }
      // Do not place solid block intersecting player AABB
      const overlapsPlayer =
        px + 1 > this.px - 0.3 &&
        px < this.px + 0.3 &&
        pz + 1 > this.pz - 0.3 &&
        pz < this.pz + 0.3 &&
        py + 1 > this.py &&
        py < this.py + 1.8;
      if (overlapsPlayer && BLOCKS[held.id]?.solid) return;

      this.placeBlockWorld(px, py, pz, held.id);
      this.audio.play('place');
      if (!this.isCreativeLike()) {
        held.count--;
        if (held.count <= 0) this.hotbar[this.selectedHotbar] = null;
        this.emitHud();
      }
    }
  }

  private placeBlockWorld(x: number, y: number, z: number, id: number): void {
    this.world.setBlock(x, y, z, id, true);
    if (this.playMode === 'online') {
      this.net.sendBlockEdit(this.world.realm, x, y, z, id);
    }
    if (BLOCKS[id]?.gravity) {
      this.fallingQueue.push([x, y, z]);
    }
    if (BLOCKS[id]?.fluid) {
      this.fluidQueue.push({ x, y, z, id, dist: 0 });
    }
  }

  private breakBlockWorld(x: number, y: number, z: number, oldId: number): void {
    this.world.setBlock(x, y, z, B.air, true);
    if (this.playMode === 'online') {
      this.net.sendBlockEdit(this.world.realm, x, y, z, B.air);
    }
    this.renderer.spawnBreakParticles(x, y, z, getColor(oldId));
    this.audio.play('break');

    // Trigger gravity block above if any
    const aboveId = this.world.getBlock(x, y + 1, z);
    if (aboveId > 0 && BLOCKS[aboveId]?.gravity) {
      this.fallingQueue.push([x, y + 1, z]);
    }

    if (!this.isCreativeLike()) {
      const def = BLOCKS[oldId];
      const dropId = def?.dropId ?? oldId;
      const dropCount = def?.dropCount ?? 1;
      if (dropId > 0) {
        this.drops.push({
          uid: this.nextUid++,
          id: dropId,
          count: dropCount,
          x: x + 0.5,
          y: y + 0.4,
          z: z + 0.5,
          vy: 2.2,
          ttl: 120,
        });
      }
    }

    // Troll Realm chaos pranks every 5th broken block
    if (this.mode === 'troll') {
      this.trollBreakCount++;
      if (this.trollBreakCount % 5 === 0) {
        const roll = Math.floor(Math.random() * 3);
        if (roll === 0) {
          this.vy = 11.5;
          this.onGround = false;
          this.pushChat('Troll Realm', 'BOING! Gravity just decided to prank you!', true);
        } else if (roll === 1) {
          const prank = createMobInstance('slime', x + 0.5, y + 1.2, z + 0.5);
          if (prank) this.mobs.push(prank);
          this.pushChat('Troll Realm', 'Surprise! A bouncy slime popped out of that block!', true);
        } else {
          this.grantItem(I.diamond, 1);
          this.pushChat('Troll Realm', 'Shiny prank! Have a free Diamond!', true);
        }
      }
    }
  }

  private triggerExplosion(cx: number, cy: number, cz: number, radius: number, maxDamage: number): void {
    this.audio.play('explosion');
    const r = Math.ceil(radius);
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dz = -r; dz <= r; dz++) {
          if (dx * dx + dy * dy + dz * dz <= radius * radius) {
            const wx = Math.floor(cx + dx);
            const wy = Math.floor(cy + dy);
            const wz = Math.floor(cz + dz);
            const bid = this.world.getBlock(wx, wy, wz);
            if (bid > 0 && BLOCKS[bid]?.hardness >= 0 && bid !== B.obsidian && bid !== B.bedrock) {
              this.world.setBlock(wx, wy, wz, B.air, true);
              if (this.playMode === 'online') {
                this.net.sendBlockEdit(this.world.realm, wx, wy, wz, B.air);
              }
            }
          }
        }
      }
    }
    this.renderer.spawnBreakParticles(cx, cy, cz, '#ff7733');

    const distToPlayer = Math.hypot(this.px - cx, this.py - cy, this.pz - cz);
    if (distToPlayer < radius * 1.8 && !this.isCreativeLike() && this.mode !== 'spectator') {
      const dmg = Math.round(maxDamage * (1 - distToPlayer / (radius * 1.8)));
      this.damagePlayer(Math.max(1, dmg));
    }
  }

  private damagePlayer(rawAmount: number): void {
    if (this.isCreativeLike() || this.mode === 'spectator' || this.gameState !== 'playing') return;
    let armorPts = 0;
    for (const s of Object.values(this.armorSlots)) {
      if (s) armorPts += ITEMS[s.id]?.armorPoints || 0;
    }
    const reduced = Math.max(1, Math.round(rawAmount * (1 - Math.min(0.75, armorPts * 0.03))));
    this.hp = Math.max(0, this.hp - reduced);
    this.audio.play('hurt');
    if (this.hp <= 0) {
      this.syncBodyState('gameover');
      this.exitPointerLock();
      this.emitHud();
    }
  }

  private scheduleNextTick(): void {
    this.renderer.afterDraw(this.tick);
  }

  private tick = () => {
    if (this.disposed) return;

    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastFrameMs) / 1000));
    this.lastFrameMs = now;
    this.elapsed += dt;

    if (this.gameState === 'title') {
      this.stepTitleTour(dt);
    } else if (this.gameState === 'playing') {
      this.stepGameplay(dt);
    }

    this.renderer.syncWorldChunks(
      this.world,
      this.gameState === 'title' ? 0 : this.px,
      this.gameState === 'title' ? -2 : this.pz,
      this.renderer.isSoftwareGl ? 3 : 4,
    );

    const peerVisuals = Array.from(this.net.peers.values());
    const eyeHeadBlock = this.world.getBlock(Math.floor(this.px), Math.floor(this.py + 1.55), Math.floor(this.pz));
    const headUnderwater = eyeHeadBlock === B.water;
    const heldSlot = this.hotbar[this.selectedHotbar];
    const heldColor = heldSlot ? getColor(heldSlot.id) : null;
    const heldItem = heldSlot && heldSlot.id >= 1000 ? ITEMS[heldSlot.id] : null;
    const heldKind: 'tool' | 'sword' | 'block' | 'none' = !heldSlot
      ? 'none'
      : heldItem?.tool === 'sword'
        ? 'sword'
        : heldItem?.tool
          ? 'tool'
          : 'block';

    this.renderer.updateAtmosphere(
      this.world.realm,
      this.timeOfDay,
      this.weather,
      this.px,
      this.py,
      this.pz,
      this.elapsed,
      this.mode,
      headUnderwater,
    );
    this.renderer.updateEntities(
      {
        x: this.px,
        y: this.py,
        z: this.pz,
        yaw: this.yaw,
        skinId: this.skinId,
        moving: Math.min(1, Math.hypot(this.vx, this.vz) / 4.2),
        swing: this.swingTimer > 0 ? this.swingTimer / 0.25 : 0,
        visible: this.gameState === 'playing' && this.cameraMode !== 'first',
        firstPerson: this.gameState === 'playing' && this.cameraMode === 'first',
        heldColor,
        heldKind,
      },
      this.mobs,
      peerVisuals,
      this.drops.map((d): DroppedItemVisual => ({ uid: d.uid, x: d.x, y: d.y, z: d.z, color: getColor(d.id) })),
      this.projectiles.map((p): ProjectileVisual => ({ x: p.x, y: p.y, z: p.z, kind: p.kind })),
      this.world.realm,
      dt,
      this.elapsed,
    );

    this.renderer.renderFrame();

    this.hudAccum += dt;
    if (this.hudAccum >= 0.1) {
      this.hudAccum = 0;
      this.emitHud();
    }

    this.scheduleNextTick();
  };

  private stepTitleTour(dt: number): void {
    this.timeOfDay = 11900; // Iconic warm sunset tour
    const angle = this.elapsed * 0.14 + 0.55;
    const camX = Math.cos(angle) * 23;
    const camZ = Math.sin(angle) * 23 - 2;
    this.renderer.camera.position.set(camX, 74.5 + Math.sin(this.elapsed * 0.35) * 1.4, camZ);
    this.renderer.camera.lookAt(-2, 68.0, -4);
    stepMobAI(this.mobs, this.world, { x: 0, y: 66.2, z: 6, alive: false, invulnerable: true }, 'peaceful', dt, true);
  }

  private stepGameplay(dt: number): void {
    this.timeOfDay = (this.timeOfDay + dt * 4) % 24000;
    if (this.swingTimer > 0) this.swingTimer = Math.max(0, this.swingTimer - dt);
    if (this.portalCooldown > 0) this.portalCooldown = Math.max(0, this.portalCooldown - dt);

    // Decay timed potion effects
    for (const [k, rem] of this.activeEffects.entries()) {
      if (rem <= dt) this.activeEffects.delete(k);
      else this.activeEffects.set(k, rem - dt);
    }

    // Player movement
    const speedBoost = this.activeEffects.has('speed') ? 1.45 : 1.0;
    const sneaking = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
    const sprinting = (this.keys.has('ControlLeft') || this.keys.has('KeyR')) && !sneaking && this.hunger > 6;
    const baseSpeed = this.flying ? 12.5 : sneaking ? 2.4 : sprinting ? 7.2 : 4.9;
    const moveSpeed = baseSpeed * speedBoost;

    let fwd = 0;
    let strafe = 0;
    if (this.activeModal === 'none') {
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) fwd += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) fwd -= 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) strafe += 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) strafe -= 1;
    }

    const len = Math.hypot(fwd, strafe) || 1;
    const nf = fwd / len;
    const ns = strafe / len;
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    const wishVx = (-sinY * nf + cosY * ns) * (fwd !== 0 || strafe !== 0 ? moveSpeed : 0);
    const wishVz = (-cosY * nf - sinY * ns) * (fwd !== 0 || strafe !== 0 ? moveSpeed : 0);

    const feetBlock = this.world.getBlock(Math.floor(this.px), Math.floor(this.py - 0.1), Math.floor(this.pz));
    const bodyBlock = this.world.getBlock(Math.floor(this.px), Math.floor(this.py + 0.5), Math.floor(this.pz));
    const inWater = bodyBlock === B.water;
    const inLava = bodyBlock === B.lava;
    const gMod = getGroundModifiers(feetBlock);

    const accel = this.onGround ? Math.max(0.15, Math.min(1, gMod.friction * 12 * dt)) : 6 * dt;
    this.vx += (wishVx - this.vx) * accel;
    this.vz += (wishVz - this.vz) * accel;

    if (this.flying) {
      let vert = 0;
      if (this.activeModal === 'none') {
        if (this.keys.has('Space')) vert += 1;
        if (sneaking) vert -= 1;
      }
      this.vy += (vert * 10 - this.vy) * Math.min(1, 10 * dt);
    } else if (inWater || inLava) {
      this.vy = Math.max(-6, this.vy - 9 * dt);
      if (this.activeModal === 'none' && this.keys.has('Space')) this.vy = 5.4;
      if (inLava && !this.activeEffects.has('fire_resistance')) {
        this.damagePlayer(2);
      }
    } else {
      this.vy = Math.max(-44, this.vy - 28 * dt);
      if (this.onGround && this.activeModal === 'none' && this.keys.has('Space')) {
        const jumpPower = this.activeEffects.has('jump') ? 12.2 : 9.4;
        this.vy = jumpPower;
        this.onGround = false;
      }
    }

    // Track fall height
    if (!this.onGround && !this.flying && !inWater) {
      if (!this.wasFalling) {
        this.wasFalling = true;
        this.fallStartY = this.py;
      } else if (this.py > this.fallStartY) {
        this.fallStartY = this.py;
      }
    }

    // Riding Mount Override
    if (this.ridingMobId !== null) {
      const mount = this.mobs.find((m) => m.id === this.ridingMobId);
      if (!mount) {
        this.ridingMobId = null;
      } else {
        mount.yaw = this.yaw;
        mount.vx = wishVx * 1.4;
        mount.vz = wishVz * 1.4;
        this.px = mount.x;
        this.py = mount.y + mount.def.height * 0.72;
        this.pz = mount.z;
      }
    } else {
      const phys = {
        x: this.px,
        y: this.py,
        z: this.pz,
        vx: this.vx,
        vy: this.vy,
        vz: this.vz,
        width: 0.6,
        height: 1.8,
        onGround: this.onGround,
        sneaking,
        noclip: this.mode === 'spectator',
      };
      const res = stepEntityPhysics(phys, this.world, dt);
      this.px = phys.x;
      this.py = phys.y;
      this.pz = phys.z;
      this.vx = phys.vx;
      this.vy = phys.vy;
      this.vz = phys.vz;
      this.onGround = phys.onGround;

      if (res.landed && this.wasFalling) {
        this.wasFalling = false;
        const landedId = this.world.getBlock(Math.floor(this.px), Math.floor(this.py - 0.15), Math.floor(this.pz));
        const fallDmg = computeFallDamage(this.fallStartY - this.py, landedId, inWater);
        if (fallDmg > 0) this.damagePlayer(fallDmg);
        const lm = getGroundModifiers(landedId);
        if (lm.bounce > 0 && !sneaking) {
          this.vy = 11.5 * lm.bounce;
          this.onGround = false;
        }
      } else if (this.onGround) {
        this.wasFalling = false;
      }
    }

    if (this.onGround && Math.hypot(this.vx, this.vz) > 1.2) {
      this.audio.play('step');
    }

    // Void safety net
    if (this.py < -44) {
      if (this.isCreativeLike() || this.mode === 'spectator') this.py = 80;
      else this.damagePlayer(99);
    }

    // Nether & End Portal detection
    if (this.portalCooldown <= 0) {
      const pBlock = this.world.getBlock(Math.floor(this.px), Math.floor(this.py + 0.5), Math.floor(this.pz));
      if (pBlock === B.nether_portal) {
        this.switchRealm(this.world.realm === 'nether' ? 'overworld' : 'nether');
      } else if (pBlock === B.end_portal) {
        this.switchRealm(this.world.realm === 'end' ? 'overworld' : 'end');
      }
    }

    // Survival Hunger & Regeneration
    if (!this.isCreativeLike() && this.mode !== 'spectator') {
      this.hungerTick += dt;
      if (this.hungerTick >= (sprinting ? 6 : 16)) {
        this.hungerTick = 0;
        if (this.hunger > 0) this.hunger--;
      }
      this.regenTick += dt;
      if (this.regenTick >= 2.4) {
        this.regenTick = 0;
        if (this.hunger >= 17 && this.hp < this.maxHp) this.hp++;
        else if (this.hunger === 0 && this.hp > 1) this.damagePlayer(1);
      }
    }

    // Aim & Progressive Mining
    this.currentAim = this.raycastBlock(6);
    if (this.attackHeld && this.activeModal === 'none' && this.currentAim) {
      const [hx, hy, hz] = this.currentAim.hit;
      const bDef = BLOCKS[this.currentAim.id];
      if (bDef && bDef.hardness >= 0) {
        const held = this.hotbar[this.selectedHotbar];
        const heldDef = held && held.id >= 1000 ? ITEMS[held.id] : null;
        if (this.mode === 'adventure' && (!held?.canDestroy || !held.canDestroy.includes(bDef.key))) {
          this.mineTarget = null;
        } else {
          if (!this.mineTarget || this.mineTarget.x !== hx || this.mineTarget.y !== hy || this.mineTarget.z !== hz) {
            this.mineTarget = { x: hx, y: hy, z: hz, progress: 0 };
          }
          const rightTool = heldDef?.tool === bDef.tool;
          const mult = this.isCreativeLike() ? 50 : rightTool ? (heldDef?.speed || 3.5) : 1.0;
          const effBonus = held?.enchants?.efficiency ? 1 + held.enchants.efficiency * 0.3 : 1;
          const rate = (mult * effBonus) / Math.max(0.15, bDef.hardness);
          this.mineTarget.progress += dt * rate;
          if (this.mineTarget.progress >= 1) {
            this.breakBlockWorld(hx, hy, hz, this.currentAim.id);
            this.mineTarget = null;
          }
        }
      }
    } else if (!this.attackHeld) {
      this.mineTarget = null;
    }

    this.renderer.updateTargetHighlight(
      this.currentAim ? { x: this.currentAim.hit[0], y: this.currentAim.hit[1], z: this.currentAim.hit[2] } : null,
      this.mineTarget?.progress ?? 0,
    );

    // Mob AI & Ambient Spawning
    const isNight = this.mode === 'horror' || (this.timeOfDay > 13500 && this.timeOfDay < 22500);
    const mobOut = stepMobAI(
      this.mobs,
      this.world,
      {
        x: this.px,
        y: this.py,
        z: this.pz,
        alive: this.hp > 0,
        invulnerable: this.isCreativeLike() || this.mode === 'spectator',
      },
      this.difficulty,
      dt,
      !isNight,
    );
    if (mobOut.playerDamage > 0) {
      this.damagePlayer(mobOut.playerDamage);
      this.vx += mobOut.knockX * 7;
      this.vz += mobOut.knockZ * 7;
      this.vy = Math.max(this.vy, 4.5);
    }
    if (mobOut.explosion) {
      const ex = mobOut.explosion;
      this.triggerExplosion(ex.x, ex.y, ex.z, ex.radius, ex.damage);
    }
    if (mobOut.projectile) {
      this.projectiles.push({ ...mobOut.projectile, fromPlayer: false, ttl: 4 });
    }
    for (const km of mobOut.killedMobs) {
      this.gainXp(km.def.xp);
      for (const [itemId, minC, maxC] of km.def.drops) {
        const cnt = minC + Math.floor(Math.random() * (maxC - minC + 1));
        if (cnt > 0) {
          this.drops.push({
            uid: this.nextUid++,
            id: itemId,
            count: cnt,
            x: km.x,
            y: km.y + 0.5,
            z: km.z,
            vy: 3.0,
            ttl: 120,
          });
        }
      }
    }

    // Horror / Boss Rush / Troll unique mode events
    if (this.mode === 'horror') {
      this.timeOfDay = 18000;
      this.horrorSpawnTimer += dt;
      if (this.horrorSpawnTimer >= 13 && this.mobs.length < 15) {
        this.horrorSpawnTimer = 0;
        const pool = ['warden', 'enderman', 'creaking', 'skeleton'];
        const pick = pool[Math.floor(Math.random() * pool.length)];
        const ang = Math.random() * Math.PI * 2;
        const sx = Math.floor(this.px + Math.cos(ang) * 18);
        const sz = Math.floor(this.pz + Math.sin(ang) * 18);
        const m = createMobInstance(pick, sx + 0.5, this.world.getSurfaceY(sx, sz) + 0.2, sz + 0.5);
        if (m) {
          this.mobs.push(m);
          this.pushChat('Midnight Stalker', `Footsteps echo nearby... A ${m.def.name} hunts you!`, true);
        }
      }
    } else if (this.mode === 'boss_rush') {
      const aliveBoss = this.mobs.some((m) => m.def.group === 'Bosses' && m.hp > 0);
      if (!aliveBoss) {
        this.grantItem(I.diamond, 3);
        this.spawnBossRushWave((this.bossWave || 0) + 1);
      }
    } else if (this.mode === 'troll') {
      this.trollCooldown += dt;
      if (this.trollCooldown >= 24) {
        this.trollCooldown = 0;
        const prankMob = createMobInstance('sheep', this.px + 2, this.py + 4, this.pz + 2);
        if (prankMob) this.mobs.push(prankMob);
        this.pushChat('Troll Realm', 'A sky-sheep has parachuted onto your location!', true);
      }
    }

    // Keep lively nearby wildlife / night monsters up to cap 18
    this.mobSpawnTimer += dt;
    if (this.mobSpawnTimer >= 5.5) {
      this.mobSpawnTimer = 0;
      if (this.mobs.length < 18) {
        const pool = getSpawnPoolForRealm(this.world.realm, isNight, this.difficulty);
        const key = pool[Math.floor(Math.random() * pool.length)];
        const ang = Math.random() * Math.PI * 2;
        const dist = 16 + Math.random() * 14;
        const sx = Math.floor(this.px + Math.cos(ang) * dist);
        const sz = Math.floor(this.pz + Math.sin(ang) * dist);
        const sy = this.world.getSurfaceY(sx, sz);
        const m = createMobInstance(key, sx + 0.5, sy + 0.2, sz + 0.5);
        if (m) this.mobs.push(m);
      }
    }

    // Projectiles step
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.ttl -= dt;
      pr.vy -= 9 * dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.z += pr.vz * dt;
      const bHit = this.world.getBlock(Math.floor(pr.x), Math.floor(pr.y), Math.floor(pr.z));
      if (pr.ttl <= 0 || (bHit > 0 && BLOCKS[bHit]?.solid)) {
        if (pr.kind === 'fireball') this.triggerExplosion(pr.x, pr.y, pr.z, 2.2, 8);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (pr.fromPlayer) {
        let hit = false;
        for (const m of this.mobs) {
          if (Math.hypot(m.x - pr.x, m.y + m.def.height * 0.5 - pr.y, m.z - pr.z) < 0.95) {
            m.hp -= 7;
            m.flashTimer = 0.22;
            if (m.hp <= 0) m.koTimer = 0.34;
            this.audio.play('hit');
            hit = true;
            break;
          }
        }
        if (hit) this.projectiles.splice(i, 1);
      } else if (Math.hypot(this.px - pr.x, this.py + 0.9 - pr.y, this.pz - pr.z) < 0.75) {
        this.damagePlayer(pr.kind === 'fireball' ? 6 : 3);
        this.projectiles.splice(i, 1);
      }
    }

    // Dropped Items gravity & pickup
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.ttl -= dt;
      if (d.ttl <= 0) {
        this.drops.splice(i, 1);
        continue;
      }
      const below = this.world.getBlock(Math.floor(d.x), Math.floor(d.y - 0.1), Math.floor(d.z));
      if (below <= 0 || !BLOCKS[below]?.solid) {
        d.vy = Math.max(-14, d.vy - 18 * dt);
        d.y += d.vy * dt;
      } else {
        d.vy = 0;
      }
      if (Math.hypot(d.x - this.px, d.y - this.py, d.z - this.pz) < 1.9) {
        this.grantItem(d.id, d.count);
        this.audio.play('xp');
        this.drops.splice(i, 1);
      }
    }

    // Fluid, Gravity & Redstone 20-TPS tick
    if (this.fluidQueue.length > 0 || this.fallingQueue.length > 0) {
      stepFluidAndFallingQueue(this.world, this.fluidQueue, this.fallingQueue, 48);
    }

    this.redstoneAccum += dt;
    while (this.redstoneAccum >= 0.05) {
      this.redstoneAccum -= 0.05;
      if (this.world.watchedRedstone.size > 0) {
        const daylight = !isNight && this.world.realm === 'overworld' ? 1.0 : 0.0;
        const detonated = tickRedstoneNetwork(
          this.redstone,
          this.world,
          Array.from(this.world.watchedRedstone.values()),
          daylight,
        );
        for (const tnt of detonated) {
          this.triggerExplosion(tnt.x + 0.5, tnt.y + 0.5, tnt.z + 0.5, 3.6, 16);
        }
      }
    }

    // Camera Positioning (1st / 3rd Back / 3rd Front)
    const eye = this.getEyePosition();
    const dir = this.getLookVector();
    if (this.cameraMode === 'first') {
      this.renderer.camera.position.set(eye.x, eye.y, eye.z);
      this.renderer.camera.lookAt(eye.x + dir.dx * 10, eye.y + dir.dy * 10, eye.z + dir.dz * 10);
    } else {
      const sign = this.cameraMode === 'third_back' ? -1 : 1;
      let camDist = 4.6;
      // Pull camera forward if wall behind
      for (let d = 0.6; d <= 4.6; d += 0.35) {
        const cx = eye.x + dir.dx * d * sign;
        const cy = eye.y + 0.65 + dir.dy * d * sign;
        const cz = eye.z + dir.dz * d * sign;
        const bid = this.world.getBlock(Math.floor(cx), Math.floor(cy), Math.floor(cz));
        if (bid > 0 && BLOCKS[bid]?.solid) {
          camDist = Math.max(1.2, d - 0.35);
          break;
        }
      }
      const targetCam = {
        x: eye.x + dir.dx * camDist * sign,
        y: eye.y + 0.75 + dir.dy * camDist * sign,
        z: eye.z + dir.dz * camDist * sign,
      };
      const alpha = Math.min(1, 14 * dt);
      this.renderer.camera.position.x += (targetCam.x - this.renderer.camera.position.x) * alpha;
      this.renderer.camera.position.y += (targetCam.y - this.renderer.camera.position.y) * alpha;
      this.renderer.camera.position.z += (targetCam.z - this.renderer.camera.position.z) * alpha;
      this.renderer.camera.lookAt(eye.x, eye.y + 0.15, eye.z);
    }

    // Multiplayer pose & Spatial Voice update
    if (this.playMode === 'online') {
      const micLvl = this.micEnabled ? this.voice.getMicLevel() : 0;
      const talking = this.micEnabled && !this.micMuted && (this.pttActive || micLvl > this.vadThreshold);
      if (this.voice.localStream) {
        for (const t of this.voice.localStream.getAudioTracks()) {
          t.enabled = talking;
        }
      }
      for (const peer of this.net.peers.values()) {
        this.voice.updatePeerSpatial(
          peer.id,
          { x: this.px, y: this.py, z: this.pz, yaw: this.yaw },
          { x: peer.x, y: peer.y, z: peer.z },
          this.globalRadio,
          false,
        );
      }
      this.netPoseAccum += dt;
      if (this.netPoseAccum >= 0.09) {
        this.netPoseAccum = 0;
        this.net.sendPose({
          x: this.px,
          y: this.py,
          z: this.pz,
          yaw: this.yaw,
          pitch: this.pitch,
          realm: this.world.realm,
          moving: Math.min(1, Math.hypot(this.vx, this.vz) / 4.2),
          swing: this.swingTimer > 0 ? 1 : 0,
          talking,
        });
      }
    }
  }

  private sampleMinimap(): string[] {
    const out: string[] = [];
    const px = Math.floor(this.px);
    const pz = Math.floor(this.pz);
    const step = 4;
    for (let dz = -7; dz <= 7; dz++) {
      for (let dx = -7; dx <= 7; dx++) {
        const wx = px + dx * step;
        const wz = pz + dz * step;
        const b = this.world.getBiomeAt(wx, wz);
        const surfY = this.world.getSurfaceY(wx, wz);
        const topId = this.world.getBlock(wx, Math.max(40, surfY - 1), wz);
        if (surfY <= 62 || topId === B.water) out.push('#2976d6');
        else if (topId === B.oak_planks || topId === B.stone_bricks || topId === B.bricks) out.push('#c78d52');
        else if (surfY > 82) out.push('#e2ebf5');
        else out.push(getColor(b.topBlock));
      }
    }
    return out;
  }

  public getSnapshot(): HudSnapshot {
    const now = performance.now();
    this.toasts = this.toasts.filter((t) => t.expiresAt > now);
    const boss = this.mobs.find((m) => m.def.group === 'Bosses' && m.hp > 0);
    let armor = 0;
    for (const s of Object.values(this.armorSlots)) {
      if (s) armor += ITEMS[s.id]?.armorPoints || 0;
    }

    const modeMeta = GAME_MODES.find((g) => g.id === this.mode);
    const modeStatus =
      this.mode === 'boss_rush'
        ? `Boss Wave ${this.bossWave || 1}`
        : this.mode === 'horror'
          ? 'Cursed Midnight · Stay in Light'
          : this.mode === 'troll'
            ? `Prank Counter: ${this.trollBreakCount}`
            : this.mode === 'architect'
              ? 'Architect Studio · Press C'
              : modeMeta?.genre || '';

    return {
      gameState: this.gameState,
      playMode: this.playMode,
      roomCode: this.roomCode,
      connected: this.net.connected,
      playerName: this.playerName,
      skinId: this.skinId,
      mode: this.mode,
      difficulty: this.difficulty,
      realm: this.world.realm,
      seed: this.world.seedStr,
      biomeName: this.world.getBiomeAt(Math.floor(this.px), Math.floor(this.pz)).name,
      x: Math.round(this.px),
      y: Math.round(this.py),
      z: Math.round(this.pz),
      yaw: this.yaw,
      hp: this.hp,
      maxHp: this.maxHp,
      hunger: this.hunger,
      armor,
      xpLevel: this.xpLevel,
      xpProgress: this.xpProgress,
      cameraMode: this.cameraMode,
      timeOfDay: Math.round(this.timeOfDay),
      weather: this.weather,
      targetBlockName: this.currentAim ? getName(this.currentAim.id) : null,
      hotbar: this.hotbar.map((s) => (s ? { ...s } : null)),
      backpack: this.backpack.map((s) => (s ? { ...s } : null)),
      craftGrid: this.craftGrid.map((s) => (s ? { ...s } : null)),
      armorSlots: { ...this.armorSlots },
      selectedHotbar: this.selectedHotbar,
      nearbyStations: this.getNearbyStations(),
      peers: Array.from(this.net.peers.values()),
      bossBar: boss ? { name: boss.def.name, hp: Math.ceil(boss.hp), maxHp: boss.maxHp } : null,
      bossWave: this.bossWave,
      modeStatus,
      waypoint: this.waypoint ? { ...this.waypoint } : null,
      chat: [...this.chat],
      toasts: [...this.toasts],
      enabledMods: Array.from(this.enabledMods),
      voice: {
        micEnabled: this.micEnabled,
        muted: this.micMuted,
        pttActive: this.pttActive,
        globalRadio: this.globalRadio,
        vadThreshold: this.vadThreshold,
        micLevel: this.micEnabled ? this.voice.getMicLevel() : 0,
      },
      minimapCells: this.sampleMinimap(),
      activeModal: this.activeModal,
      activeStation: this.activeStation,
      pointerLocked: typeof document !== 'undefined' && document.pointerLockElement === this.renderer.renderer.domElement,
    };
  }

  private emitHud(): void {
    this.onHudUpdate(this.getSnapshot());
  }

  public dispose(): void {
    this.disposed = true;
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    document.removeEventListener('visibilitychange', this.handleVisibility);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
    const canvas = this.renderer.renderer.domElement;
    canvas.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    canvas.removeEventListener('contextmenu', this.handleContextMenu);
    window.removeEventListener('wheel', this.handleWheel);
    this.net.disconnect();
    this.voice.dispose();
    this.renderer.dispose();
  }
}

export { maxStack, MOD_PACKS };
