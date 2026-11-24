import React from 'react';
import { CloudLightning, CloudRain, Compass, Layers, Moon, Sparkles, Sun, Sunrise, Sunset, Users, Wand2, X } from 'lucide-react';
import { PLAYER_SKINS } from '../entities/catalog';
import { GAME_MODES, type GameMode } from '../network/commands';
import type { BlueprintType } from '../world/structures';
import type { HudSnapshot } from '../game/GameEngine';
import { CharacterPreview } from './CharacterPreview';

interface CreatorPanelModalProps {
  snap: HudSnapshot;
  onClose: () => void;
  onSetMode: (mode: GameMode) => void;
  onSetSkin: (skinId: string) => void;
  onSetTime: (ticks: number) => void;
  onSetWeather: (w: 'clear' | 'rain' | 'storm') => void;
  onBuildBlueprint: (type: BlueprintType) => void;
}

const BLUEPRINTS: Array<{ type: BlueprintType; label: string; desc: string }> = [
  { type: 'watchtower', label: 'Medieval Watchtower', desc: '10-block stone spire + glowing lantern beacon' },
  { type: 'cherry_shrine', label: 'Cherry Blossom Shrine', desc: 'Amethyst & cherry timber pavilion' },
  { type: 'stone_keep', label: 'Fortified Stone Keep', desc: '9×9 battlement fortress + Beacon core' },
  { type: 'bridge', label: 'Lantern River Bridge', desc: '11-block oak plank walkway with posts' },
];

export const CreatorPanelModal: React.FC<CreatorPanelModalProps> = ({
  snap,
  onClose,
  onSetMode,
  onSetSkin,
  onSetTime,
  onSetWeather,
  onBuildBlueprint,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="voxel-panel rounded-lg w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-black text-white leading-tight">
                Creator Studio & Live Sandbox Controls
              </h2>
              <div className="text-[11px] text-amber-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Designed & Created by KATHIR · Switch Modes, Characters, Sky & Blueprints Live
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Creator Studio"
            onClick={onClose}
            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column: Live Game Mode Switcher + Sky & Weather */}
          <div className="flex flex-col gap-3">
            <div className="rounded bg-slate-900 border border-slate-700 p-3 flex flex-col gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" /> Switch Game Mode (8 Genres)
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {GAME_MODES.map((m) => {
                  const active = snap.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSetMode(m.id)}
                      className={`p-2 rounded border text-left transition cursor-pointer ${
                        active
                          ? 'bg-amber-500/20 border-amber-400 text-white'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-black truncate">{m.name}</span>
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: m.badgeColor }}
                        />
                      </div>
                      <div className="text-[10px] text-amber-300 font-semibold">{m.genre}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded bg-slate-900 border border-slate-700 p-3 flex flex-col gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-300" /> Time of Day & Living Sky
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => onSetTime(2000)}
                  className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-bold text-amber-200 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sunrise className="w-3.5 h-3.5" /> Dawn
                </button>
                <button
                  type="button"
                  onClick={() => onSetTime(6000)}
                  className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-bold text-sky-200 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sun className="w-3.5 h-3.5" /> Noon
                </button>
                <button
                  type="button"
                  onClick={() => onSetTime(11900)}
                  className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-bold text-orange-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Sunset className="w-3.5 h-3.5" /> Sunset
                </button>
                <button
                  type="button"
                  onClick={() => onSetTime(18000)}
                  className="py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-bold text-indigo-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Moon className="w-3.5 h-3.5" /> Night
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                <button
                  type="button"
                  onClick={() => onSetWeather('clear')}
                  className={`py-1.5 rounded border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                    snap.weather === 'clear'
                      ? 'bg-emerald-600 border-emerald-400 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-300'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" /> Clear
                </button>
                <button
                  type="button"
                  onClick={() => onSetWeather('rain')}
                  className={`py-1.5 rounded border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                    snap.weather === 'rain'
                      ? 'bg-sky-600 border-sky-400 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-300'
                  }`}
                >
                  <CloudRain className="w-3.5 h-3.5" /> Rain
                </button>
                <button
                  type="button"
                  onClick={() => onSetWeather('storm')}
                  className={`py-1.5 rounded border text-xs font-bold flex items-center justify-center gap-1 cursor-pointer ${
                    snap.weather === 'storm'
                      ? 'bg-purple-600 border-purple-400 text-white'
                      : 'bg-slate-800 border-slate-600 text-slate-300'
                  }`}
                >
                  <CloudLightning className="w-3.5 h-3.5" /> Storm
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Avatar Switcher + 1-Click Architect Blueprints */}
          <div className="flex flex-col gap-3">
            <div className="rounded bg-slate-900 border border-slate-700 p-3 flex items-center gap-3">
              <CharacterPreview skinId={snap.skinId} width={88} height={114} className="shrink-0" />
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" /> Switch Player Avatar Live
                </div>
                <div className="flex flex-wrap gap-1">
                  {PLAYER_SKINS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      title={s.name}
                      onClick={() => onSetSkin(s.id)}
                      className={`py-1 px-2 rounded border text-[10px] font-bold whitespace-nowrap cursor-pointer ${
                        snap.skinId === s.id
                          ? 'bg-amber-500 border-amber-300 text-slate-950'
                          : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded bg-slate-900 border border-slate-700 p-3 flex flex-col gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-amber-400" /> 1-Click Architect Blueprints (Spawns Ahead)
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {BLUEPRINTS.map((bp) => (
                  <button
                    key={bp.type}
                    type="button"
                    onClick={() => {
                      onBuildBlueprint(bp.type);
                      onClose();
                    }}
                    className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-amber-400 text-left flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{bp.label}</div>
                      <div className="text-[10px] text-slate-400">{bp.desc}</div>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                      Build
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
