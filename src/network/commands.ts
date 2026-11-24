import { B, BLOCKS, I, ITEMS, getName } from '../items/registry';

export type GameMode =
  | 'survival'
  | 'creative'
  | 'hardcore'
  | 'adventure'
  | 'spectator'
  | 'horror'
  | 'troll'
  | 'architect'
  | 'boss_rush';

export interface GameModeMeta {
  id: GameMode;
  name: string;
  genre: string;
  tagline: string;
  badgeColor: string;
}

export const GAME_MODES: GameModeMeta[] = [
  { id: 'survival', name: 'Survival', genre: 'Classic Sandbox', tagline: 'Gather resources, craft gear, tame pets & survive night monsters', badgeColor: '#52b848' },
  { id: 'creative', name: 'Creative', genre: 'Unlimited Build', tagline: 'Free flight, instant 1-hit break, infinite blocks & full catalog', badgeColor: '#4da6ff' },
  { id: 'spectator', name: 'Spectator', genre: 'Free Camera', tagline: 'Noclip phase flight through mountains, caves & oceans', badgeColor: '#9fb4c7' },
  { id: 'adventure', name: 'Adventure', genre: 'Quest Rules', tagline: 'Explore curated landmarks with tool-tag mining limits', badgeColor: '#e09f3e' },
  { id: 'horror', name: 'Midnight Stalker', genre: 'Horror Genre', tagline: 'Eternal cursed fog, torchlight aura, Warden & Creaking ambushes', badgeColor: '#b8283b' },
  { id: 'troll', name: 'Troll Realm', genre: 'Comedy Chaos', tagline: 'Prank blocks, exploding sheep, turbo bounce & random anvil rain', badgeColor: '#d957d9' },
  { id: 'architect', name: "Architect's Chronicle", genre: 'Studio Builder', tagline: 'Flight + 1-click Castle/Tower blueprints & world chronicles', badgeColor: '#f5b942' },
  { id: 'boss_rush', name: 'Titan Boss Rush', genre: 'Action Arena', tagline: 'Wave-based Ender Dragon, Wither & Warden raids with myth loot', badgeColor: '#8d5cff' },
];

export type Difficulty = 'peaceful' | 'easy' | 'normal' | 'hard';
export type RealmId = 'overworld' | 'nether' | 'end';

export interface ParsedCommandResult {
  handled: boolean;
  reply: string;
  action?:
    | { type: 'gamemode'; mode: GameMode }
    | { type: 'tp'; x: number; y: number; z: number }
    | { type: 'give'; itemId: number; count: number; itemName: string }
    | { type: 'summon'; mob: string }
    | { type: 'time'; ticks: number }
    | { type: 'weather'; weather: 'clear' | 'rain' | 'thunder' }
    | { type: 'seed' }
    | { type: 'kill' }
    | { type: 'effect'; effect: string; seconds: number }
    | { type: 'enchant'; enchant: string; level: number }
    | { type: 'msg'; target: string; text: string }
    | { type: 'realm'; realm: RealmId }
    | { type: 'difficulty'; difficulty: Difficulty };
}

export function findItemOrBlockByName(query: string): number | null {
  const normalized = query.trim().toLowerCase().replace(/_/g, ' ');
  if (!normalized) return null;
  for (let i = 1; i < BLOCKS.length; i++) {
    if (BLOCKS[i] && (BLOCKS[i].name.toLowerCase() === normalized || BLOCKS[i].key.replace(/_/g, ' ') === normalized)) {
      return i;
    }
  }
  for (const key in ITEMS) {
    const it = ITEMS[key];
    if (it.name.toLowerCase() === normalized || it.key.replace(/_/g, ' ') === normalized) {
      return it.id;
    }
  }
  for (let i = 1; i < BLOCKS.length; i++) {
    if (BLOCKS[i] && BLOCKS[i].name.toLowerCase().includes(normalized)) return i;
  }
  for (const key in ITEMS) {
    if (ITEMS[key].name.toLowerCase().includes(normalized)) return ITEMS[key].id;
  }
  return null;
}

export function parseSlashCommand(raw: string, currentSeed: string): ParsedCommandResult {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) {
    return { handled: false, reply: '' };
  }
  const parts = trimmed.slice(1).trim().split(/\s+/);
  const cmd = (parts[0] || '').toLowerCase();

  switch (cmd) {
    case 'help':
      return {
        handled: true,
        reply:
          'Commands: /gamemode <survival|creative|spectator|adventure|horror|troll|architect|boss_rush>, /tp <x> <y> <z>, /give <item> [count], /summon <mob>, /time set <day|sunset|night|ticks>, /weather <clear|rain|thunder>, /realm <overworld|nether|end>, /seed, /kill, /effect <name> [sec], /enchant <name> [lvl], /msg <player> <text>',
      };
    case 'gamemode':
    case 'gm': {
      const m = (parts[1] || '').toLowerCase();
      const map: Record<string, GameMode> = {
        s: 'survival',
        survival: 'survival',
        c: 'creative',
        creative: 'creative',
        a: 'adventure',
        adventure: 'adventure',
        sp: 'spectator',
        spectator: 'spectator',
        h: 'hardcore',
        hardcore: 'hardcore',
        horror: 'horror',
        troll: 'troll',
        architect: 'architect',
        boss: 'boss_rush',
        boss_rush: 'boss_rush',
      };
      const mode = map[m];
      if (!mode) return { handled: true, reply: 'Usage: /gamemode <survival|creative|adventure|spectator|horror|troll|architect|boss_rush>' };
      return { handled: true, reply: `Game mode changed to ${mode}`, action: { type: 'gamemode', mode } };
    }
    case 'tp': {
      const x = Number(parts[1]);
      const y = Number(parts[2]);
      const z = Number(parts[3]);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        return { handled: true, reply: 'Usage: /tp <x> <y> <z>' };
      }
      return { handled: true, reply: `Teleported to ${x}, ${y}, ${z}`, action: { type: 'tp', x, y, z } };
    }
    case 'give': {
      if (parts.length < 2) return { handled: true, reply: 'Usage: /give <item_name> [count]' };
      const maybeCount = Number(parts[parts.length - 1]);
      const hasCount = parts.length >= 3 && Number.isInteger(maybeCount) && maybeCount > 0;
      const count = hasCount ? Math.min(640, maybeCount) : 1;
      const query = parts.slice(1, hasCount ? -1 : parts.length).join(' ');
      const itemId = findItemOrBlockByName(query);
      if (itemId === null) return { handled: true, reply: `Unknown item or block: ${query}` };
      const itemName = getName(itemId);
      return { handled: true, reply: `Gave ${count} × ${itemName}`, action: { type: 'give', itemId, count, itemName } };
    }
    case 'summon': {
      const mob = parts.slice(1).join('_').toLowerCase();
      if (!mob) return { handled: true, reply: 'Usage: /summon <mob_name> (e.g. wolf, creeper, ender_dragon, warden)' };
      return { handled: true, reply: `Summoned ${mob.replace(/_/g, ' ')}`, action: { type: 'summon', mob } };
    }
    case 'time': {
      if ((parts[1] || '').toLowerCase() !== 'set') {
        return { handled: true, reply: 'Usage: /time set <day|sunset|night|noon|ticks>' };
      }
      const arg = (parts[2] || '').toLowerCase();
      const presets: Record<string, number> = { day: 2000, noon: 6000, sunset: 11800, night: 15000, midnight: 18000 };
      const ticks = arg in presets ? presets[arg] : Number(arg);
      if (!Number.isFinite(ticks)) return { handled: true, reply: 'Invalid time value.' };
      const normalized = ((Math.floor(ticks) % 24000) + 24000) % 24000;
      return { handled: true, reply: `Time set to ${normalized} ticks`, action: { type: 'time', ticks: normalized } };
    }
    case 'weather': {
      const w = (parts[1] || '').toLowerCase();
      if (w !== 'clear' && w !== 'rain' && w !== 'thunder') {
        return { handled: true, reply: 'Usage: /weather <clear|rain|thunder>' };
      }
      return { handled: true, reply: `Weather set to ${w}`, action: { type: 'weather', weather: w } };
    }
    case 'realm': {
      const r = (parts[1] || '').toLowerCase();
      if (r !== 'overworld' && r !== 'nether' && r !== 'end') {
        return { handled: true, reply: 'Usage: /realm <overworld|nether|end>' };
      }
      return { handled: true, reply: `Traveling to ${r}...`, action: { type: 'realm', realm: r } };
    }
    case 'seed':
      return { handled: true, reply: `World Seed: ${currentSeed}`, action: { type: 'seed' } };
    case 'kill':
      return { handled: true, reply: 'Player eliminated.', action: { type: 'kill' } };
    case 'effect': {
      const effect = (parts[1] || '').toLowerCase();
      const seconds = Math.max(5, Math.min(600, Number(parts[2]) || 60));
      if (!effect) return { handled: true, reply: 'Usage: /effect <speed|jump|regen|night_vision|fire_resistance|strength> [sec]' };
      return { handled: true, reply: `Applied ${effect} for ${seconds}s`, action: { type: 'effect', effect, seconds } };
    }
    case 'enchant': {
      const enchant = (parts[1] || '').toLowerCase();
      const level = Math.max(1, Math.min(5, Number(parts[2]) || 1));
      if (!enchant) return { handled: true, reply: 'Usage: /enchant <efficiency|sharpness|fortune|silk_touch|mending|protection> [level]' };
      return { handled: true, reply: `Enchanted held item with ${enchant} ${level}`, action: { type: 'enchant', enchant, level } };
    }
    case 'difficulty': {
      const d = (parts[1] || '').toLowerCase();
      if (d !== 'peaceful' && d !== 'easy' && d !== 'normal' && d !== 'hard') {
        return { handled: true, reply: 'Usage: /difficulty <peaceful|easy|normal|hard>' };
      }
      return { handled: true, reply: `Difficulty set to ${d}`, action: { type: 'difficulty', difficulty: d } };
    }
    case 'msg':
    case 'w':
    case 'tell': {
      const target = parts[1];
      const text = parts.slice(2).join(' ');
      if (!target || !text) return { handled: true, reply: 'Usage: /msg <player> <message>' };
      return { handled: true, reply: `Whispered to ${target}`, action: { type: 'msg', target, text } };
    }
    default:
      return { handled: true, reply: `Unknown command "/${cmd}". Type /help for all commands.` };
  }
}

export function getStarterSurvivalHint(): number[] {
  return [B.oak_log, I.apple, I.wheat];
}
