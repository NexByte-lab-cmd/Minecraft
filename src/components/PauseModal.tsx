import React, { useState } from 'react';
import { Compass, Copy, Home, Mic, MicOff, Play, Save, Sparkles, Volume2, VolumeX, Wand2 } from 'lucide-react';
import { TELEPORT_BIOME_PRESETS } from '../world/biomes';
import type { RealmId } from '../network/commands';
import type { HudSnapshot } from '../game/GameEngine';

interface PauseModalProps {
  snap: HudSnapshot;
  audioMuted: boolean;
  onResume: () => void;
  onSaveOffline: () => void;
  onOpenMap: () => void;
  onOpenCreator: () => void;
  onSwitchRealm: (realm: RealmId) => void;
  onTeleportBiome: (name: string) => void;
  onToggleMic: () => void;
  onUpdateVoice: (patch: Partial<{ muted: boolean; globalRadio: boolean; vadThreshold: number }>) => void;
  onToggleAudioMute: () => void;
  onReturnToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  snap,
  audioMuted,
  onResume,
  onSaveOffline,
  onOpenMap,
  onOpenCreator,
  onSwitchRealm,
  onTeleportBiome,
  onToggleMic,
  onUpdateVoice,
  onToggleAudioMute,
  onReturnToTitle,
}) => {
  const [copied, setCopied] = useState(false);

  const copyRoom = () => {
    try {
      void navigator.clipboard.writeText(snap.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="voxel-panel rounded-lg w-full max-w-2xl p-5 flex flex-col gap-4 max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
          <div>
            <h2 className="text-xl font-black text-white">Game Paused</h2>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 mt-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              Designed and Created by KATHIR
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onResume();
                onOpenMap();
              }}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Compass className="w-3.5 h-3.5 text-sky-400" /> Map [M]
            </button>
            <button
              type="button"
              onClick={() => {
                onResume();
                onOpenCreator();
              }}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" /> Creator [C]
            </button>
            <button
              type="button"
              onClick={onResume}
              className="px-4 py-2 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Resume
            </button>
          </div>
        </div>

        {/* Dimensions & World Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded bg-slate-900/90 border border-slate-700 p-3 flex flex-col gap-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" /> Dimensions & Fast Travel
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['overworld', 'nether', 'end'] as RealmId[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    onSwitchRealm(r);
                    onResume();
                  }}
                  className={`py-1.5 rounded text-xs font-bold uppercase cursor-pointer border ${
                    snap.realm === r
                      ? 'bg-amber-500 text-slate-950 border-amber-300'
                      : 'bg-slate-800 text-slate-200 border-slate-600 hover:bg-slate-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {TELEPORT_BIOME_PRESETS.slice(0, 6).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    onTeleportBiome(b.label);
                    onResume();
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 border border-slate-600 cursor-pointer"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Audio & Spatial Voice Chat */}
          <div className="rounded bg-slate-900/90 border border-slate-700 p-3 flex flex-col gap-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Sound & Proximity Voice Chat
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onToggleAudioMute}
                className="flex-1 py-1.5 px-2 rounded bg-slate-800 border border-slate-600 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {audioMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                {audioMuted ? 'SFX Muted' : 'SFX On'}
              </button>
              <button
                type="button"
                onClick={onToggleMic}
                className="flex-1 py-1.5 px-2 rounded bg-slate-800 border border-slate-600 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {snap.voice.micEnabled && !snap.voice.muted ? (
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <MicOff className="w-3.5 h-3.5 text-slate-400" />
                )}
                {snap.voice.micEnabled ? (snap.voice.muted ? 'Mic Muted' : 'Mic Active') : 'Enable Mic'}
              </button>
            </div>
            <label className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Voice Channel</span>
              <button
                type="button"
                onClick={() => onUpdateVoice({ globalRadio: !snap.voice.globalRadio })}
                className="px-2 py-0.5 rounded bg-slate-800 border border-slate-600 text-[10px] font-bold text-amber-300 cursor-pointer"
              >
                {snap.voice.globalRadio ? 'Global Radio' : '3D Proximity (8–48m)'}
              </button>
            </label>
            <div>
              <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                <span>VAD Gate (V = Push-to-Talk)</span>
                <span>{Math.round(snap.voice.vadThreshold * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.02}
                max={0.4}
                step={0.02}
                value={snap.voice.vadThreshold}
                onChange={(e) => onUpdateVoice({ vadThreshold: Number(e.target.value) })}
                className="w-full accent-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Save / Multiplayer Info / Exit */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700">
          {snap.playMode === 'offline' ? (
            <button
              type="button"
              onClick={onSaveOffline}
              className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save Offline World
            </button>
          ) : (
            <button
              type="button"
              onClick={copyRoom}
              className="px-3 py-2 rounded bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied Room Code!' : `Room: ${snap.roomCode} (${1 + snap.peers.length}/12)`}
            </button>
          )}
          <button
            type="button"
            onClick={onReturnToTitle}
            className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" /> Save & Return to Title
          </button>
        </div>
      </div>
    </div>
  );
};
