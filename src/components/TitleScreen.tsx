import React, { useEffect, useState } from 'react';
import { Globe, HardDrive, Layers, Play, RefreshCw, Sparkles, Users } from 'lucide-react';
import { PLAYER_SKINS } from '../entities/catalog';
import { MOD_PACKS } from '../items/registry';
import { TELEPORT_BIOME_PRESETS } from '../world/biomes';
import { GAME_MODES, type Difficulty, type GameMode } from '../network/commands';
import type { RoomSummary } from '../network/client';
import { hasSavedOfflineWorld, type PlayMode, type StartGameOptions } from '../game/GameEngine';
import { CharacterPreview } from './CharacterPreview';

interface TitleScreenProps {
  onStart: (opts: StartGameOptions) => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart }) => {
  const [playMode, setPlayMode] = useState<PlayMode>('offline');
  const [roomCode, setRoomCode] = useState('KATHIR-1');
  const [playerName, setPlayerName] = useState('KathirHero');
  const [skinId, setSkinId] = useState('sunny');
  const [seed, setSeed] = useState('Kathir');
  const [mode, setMode] = useState<GameMode>('survival');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [biomePreset, setBiomePreset] = useState(TELEPORT_BIOME_PRESETS[0].label);
  const [enabledMods, setEnabledMods] = useState<string[]>(
    MOD_PACKS.filter((m) => m.enabledByDefault).map((m) => m.id),
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const hasSave = hasSavedOfflineWorld();

  const selectedSkin = PLAYER_SKINS.find((s) => s.id === skinId) || PLAYER_SKINS[0];
  const selectedModeMeta = GAME_MODES.find((g) => g.id === mode) || GAME_MODES[0];

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = (await res.json()) as { rooms?: RoomSummary[] };
        setRooms(data.rooms || []);
      }
    } catch {
      // ignore if offline
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    void fetchRooms();
  }, []);

  const launch = (loadSaved = false) => {
    onStart({
      playMode,
      roomCode: roomCode.trim().toUpperCase() || 'KATHIR-1',
      playerName: playerName.trim() || 'Traveler',
      skinId,
      seed: seed.trim() || 'Kathir',
      mode,
      difficulty,
      biomePreset,
      enabledMods,
      loadSaved,
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      if (e.code === 'Enter') {
        e.preventDefault();
        launch(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const toggleMod = (id: string) => {
    setEnabledMods((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-4 md:p-7 pointer-events-none">
      {/* Left Main Setup Column (leaves right side Sunset Haven / Belltower / Waterfall vista open) */}
      <div className="w-full max-w-[576px] pointer-events-auto flex flex-col gap-3 my-auto">
        {/* Title Lockup + Prominent Creator Credit */}
        <div className="voxel-panel rounded-lg px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <svg width="44" height="44" viewBox="0 0 48 48" className="shrink-0">
              <polygon points="24,4 44,14 24,24 4,14" fill="#6cc04a" stroke="#1e242c" strokeWidth="2" />
              <polygon points="4,14 24,24 24,44 4,34" fill="#855e3c" stroke="#1e242c" strokeWidth="2" />
              <polygon points="24,24 44,14 44,34 24,44" fill="#63452b" stroke="#1e242c" strokeWidth="2" />
              <rect x="20" y="10" width="8" height="6" fill="#ffbe4a" />
            </svg>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
                Endless 3D Voxel Sandbox
              </div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-white leading-tight truncate">
                VOXEL REALMS REMASTERED
              </h1>
              <div className="mt-1 inline-flex items-center gap-1.5 rounded bg-amber-500/20 border border-amber-400/50 px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-amber-200">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Designed and Created by KATHIR
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Setup Card */}
        <div className="voxel-panel rounded-lg p-3.5 flex flex-col gap-3 max-h-[72vh] overflow-y-auto">
          {/* Play Mode Toggle: Offline Solo vs Online Multiplayer */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPlayMode('offline')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-bold border transition cursor-pointer ${
                playMode === 'offline'
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-slate-800/80 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <HardDrive className="w-4 h-4" />
              Offline Single-Player
            </button>
            <button
              type="button"
              onClick={() => {
                setPlayMode('online');
                void fetchRooms();
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-bold border transition cursor-pointer ${
                playMode === 'online'
                  ? 'bg-sky-600 border-sky-400 text-white'
                  : 'bg-slate-800/80 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Globe className="w-4 h-4" />
              Online Multiplayer
            </button>
          </div>

          {/* Character Avatar Showcase + 10 Skins Selector + Player Name */}
          <div className="rounded bg-slate-900/90 border border-slate-700 p-2.5 flex items-center gap-3">
            <CharacterPreview
              skinId={skinId}
              width={96}
              height={124}
              className="shrink-0"
            />
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-white">{selectedSkin.name}</div>
                  <div className="text-[10px] text-amber-300">{selectedSkin.tagline}</div>
                </div>
                <div className="w-36">
                  <label htmlFor="player-name-input" className="sr-only">
                    Player Name
                  </label>
                  <input
                    id="player-name-input"
                    type="text"
                    maxLength={16}
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Player Name"
                    className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-5 gap-1">
                {PLAYER_SKINS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Select character ${s.name}`}
                    title={`${s.name} — ${s.tagline}`}
                    onClick={() => setSkinId(s.id)}
                    className={`py-1 px-1 rounded border text-[10px] font-bold flex items-center gap-1 justify-center cursor-pointer transition ${
                      skinId === s.id
                        ? 'bg-amber-500/25 border-amber-400 text-white ring-1 ring-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-sm shrink-0 border border-black/40"
                      style={{ backgroundColor: s.shirt }}
                    />
                    <span className="whitespace-nowrap">{s.name}</span>
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-slate-400">
                Drag 3D avatar to rotate · 9 Official Cast + DarkTitan
              </div>
            </div>
          </div>

          {/* 8 Playable Game Modes (4 Core + 4 Unique Genres) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400">
              <span>Select Game Mode (8 Genres)</span>
              <span className="text-amber-300 font-bold">{selectedModeMeta.genre}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {GAME_MODES.map((m) => {
                const active = mode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`p-1.5 rounded border text-left transition cursor-pointer ${
                      active
                        ? 'bg-amber-500/20 border-amber-400 text-white'
                        : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[11px] font-black leading-tight">{m.name}</span>
                      <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ backgroundColor: m.badgeColor }} />
                    </div>
                    <div className="text-[9px] text-slate-400 leading-tight mt-0.5">{m.genre}</div>
                  </button>
                );
              })}
            </div>
            <div className="text-[11px] text-slate-300 bg-slate-900/75 border border-slate-700/80 rounded px-2.5 py-1">
              {selectedModeMeta.tagline}
            </div>
          </div>

          {/* Online Multiplayer Room Bar + Live Server Browser */}
          {playMode === 'online' && (
            <div className="rounded bg-slate-900/90 border border-sky-500/40 p-2.5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label htmlFor="room-code-input" className="block text-[10px] uppercase tracking-wider text-sky-300 mb-0.5">
                    Room Code (Create or Join)
                  </label>
                  <input
                    id="room-code-input"
                    type="text"
                    maxLength={20}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-600 rounded px-2 py-1 text-xs font-mono text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void fetchRooms()}
                  aria-label="Refresh Active Rooms"
                  className="mt-4 p-1.5 rounded bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 cursor-pointer"
                  title="Refresh Active Rooms"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingRooms ? 'animate-spin' : ''}`} />
                </button>
              </div>
              {rooms.length > 0 ? (
                <div className="flex flex-col gap-1 max-h-20 overflow-y-auto">
                  {rooms.map((r) => (
                    <button
                      key={r.code}
                      type="button"
                      onClick={() => setRoomCode(r.code)}
                      className="flex items-center justify-between px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-left border border-slate-700 cursor-pointer"
                    >
                      <span className="font-mono font-bold text-amber-300">{r.code}</span>
                      <span className="text-slate-300 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {r.players}/{r.maxPlayers} · {r.mode}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-slate-400">
                  Enter any Room Code above to host a live multiplayer world up to 12 players with 3D spatial voice chat!
                </div>
              )}
            </div>
          )}

          {/* World Seed, Biomes & Mods Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center justify-between text-xs text-slate-300 hover:text-white py-1.5 px-2.5 rounded bg-slate-800/70 border border-slate-700 cursor-pointer"
          >
            <span className="flex items-center gap-1.5 font-semibold">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Massive Multi-Biome Map, Seed & Mod Packs ({enabledMods.length}/{MOD_PACKS.length} active)
            </span>
            <span>{showAdvanced ? '▲' : '▼'}</span>
          </button>

          {showAdvanced && (
            <div className="flex flex-col gap-2 pt-1 border-t border-slate-700/80">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="difficulty-select" className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    Difficulty
                  </label>
                  <select
                    id="difficulty-select"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="peaceful">Peaceful</option>
                    <option value="easy">Easy</option>
                    <option value="normal">Normal</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="seed-input" className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                    World Seed
                  </label>
                  <input
                    id="seed-input"
                    type="text"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="biome-select" className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                  Starting Biome (28+ Seamless Biomes)
                </label>
                <select
                  id="biome-select"
                  value={biomePreset}
                  onChange={(e) => setBiomePreset(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                >
                  {TELEPORT_BIOME_PRESETS.map((b) => (
                    <option key={b.id} value={b.label}>
                      {b.label} ({b.realm})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Installed Game Mods</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {MOD_PACKS.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-start gap-2 text-[11px] bg-slate-900/80 border border-slate-700 rounded px-2 py-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={enabledMods.includes(m.id)}
                        onChange={() => toggleMod(m.id)}
                        className="mt-0.5 accent-amber-400"
                      />
                      <div>
                        <div className="font-semibold text-white">{m.name}</div>
                        <div className="text-[10px] text-slate-400">{m.tagline}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Primary Launch CTA */}
          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              data-start="true"
              onClick={() => launch(false)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm tracking-wide shadow-lg cursor-pointer transition"
            >
              <Play className="w-4 h-4 fill-current" />
              {playMode === 'online' ? `Join / Host ${roomCode || 'KATHIR-1'}` : 'Enter Offline World'}
            </button>
            {playMode === 'offline' && hasSave && (
              <button
                type="button"
                onClick={() => launch(true)}
                className="py-2.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer transition"
              >
                Continue Save
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Single flat control hint line */}
      <div className="text-[11px] font-medium text-amber-100/90 bg-slate-950/75 px-3 py-1.5 rounded w-fit border border-white/10">
        WASD Move · Space Jump/Fly · Left-Click Mine/Attack · Right-Click Place/Use · [E] Inventory · [M] Map · [C] Creator Studio · [F5] POV · [T] Chat
      </div>
    </div>
  );
};
