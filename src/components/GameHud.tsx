import React, { useEffect, useRef, useState } from 'react';
import { Compass, Mic, MicOff, Pause, Signal, Users, Wand2 } from 'lucide-react';
import { PLAYER_SKINS } from '../entities/catalog';
import { getItemIconUrl } from '../engine/textures';
import { getName } from '../items/registry';
import { GAME_MODES } from '../network/commands';
import type { HudSnapshot } from '../game/GameEngine';

interface GameHudProps {
  snap: HudSnapshot;
  onSelectHotbar: (idx: number) => void;
  onOpenInventory: () => void;
  onOpenMap: () => void;
  onOpenCreator: () => void;
  onCycleCamera: () => void;
  onOpenPause: () => void;
  onToggleMic: () => void;
  onSubmitChat: (text: string) => void;
  onCloseChat: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  snap,
  onSelectHotbar,
  onOpenInventory,
  onOpenMap,
  onOpenCreator,
  onCycleCamera,
  onOpenPause,
  onToggleMic,
  onSubmitChat,
  onCloseChat,
}) => {
  const [chatInput, setChatInput] = useState('');
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (snap.activeModal === 'chat') {
      setTimeout(() => chatInputRef.current?.focus(), 20);
    }
  }, [snap.activeModal]);

  const skin = PLAYER_SKINS.find((s) => s.id === snap.skinId) || PLAYER_SKINS[0];
  const modeMeta = GAME_MODES.find((g) => g.id === snap.mode);
  const heartsCount = Math.ceil(snap.hp / 2);
  const foodCount = Math.ceil(snap.hunger / 2);
  const playerTotal = 1 + snap.peers.length;
  const hideVitals = snap.mode === 'creative' || snap.mode === 'architect' || snap.mode === 'spectator';

  const wpDist = snap.waypoint
    ? Math.round(Math.hypot(snap.waypoint.x - snap.x, snap.waypoint.z - snap.z))
    : null;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 md:p-4">
      {/* Top Row: Left Profile Card | Center Title & Boss Bar | Right Multiplayer & GTA-Style Compass Radar */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left Profile Card */}
        <div className="voxel-panel rounded-md px-3 py-2 flex items-center gap-2.5 min-w-[245px]">
          <div
            className="w-10 h-10 rounded border-2 border-amber-400/80 relative shrink-0 overflow-hidden"
            style={{ backgroundColor: skin.skin }}
          >
            <div className="absolute inset-x-0 top-0 h-3" style={{ backgroundColor: skin.hair }} />
            <div className="absolute left-2 top-4 w-1.5 h-1.5 bg-white" />
            <div className="absolute left-2.5 top-4 w-1 h-1.5" style={{ backgroundColor: skin.eyeColor }} />
            <div className="absolute right-2 top-4 w-1.5 h-1.5 bg-white" />
            <div className="absolute right-2 top-4 w-1 h-1.5" style={{ backgroundColor: skin.eyeColor }} />
            <div className="absolute left-3 bottom-1.5 w-3.5 h-1 bg-amber-950/60" />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold text-white truncate">{snap.playerName}</span>
              <span className="text-[11px] font-bold text-amber-300">Lv.{snap.xpLevel}</span>
            </div>
            <div className="flex items-center gap-0.5 text-[10px] leading-none mt-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <span key={i} className={i < heartsCount ? 'text-rose-500' : 'text-slate-600'}>
                  ♥
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-300 mt-1 gap-2">
              <span className="truncate">{snap.biomeName}</span>
              <span className="font-mono text-amber-200/90 shrink-0">
                {snap.x}, {snap.y}, {snap.z}
              </span>
            </div>
          </div>
        </div>

        {/* Top-Center: Creator Credit + Mode Status + Boss Bar */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="px-3 py-1 rounded bg-slate-950/75 border border-amber-400/45 text-[11px] font-bold tracking-wide text-amber-200 flex items-center gap-2">
            <span>VOXEL REALMS · By KATHIR</span>
            <span className="text-slate-500">|</span>
            <span className="text-white">{snap.realm.toUpperCase()}</span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-black text-slate-950"
              style={{ backgroundColor: modeMeta?.badgeColor || '#f5b942' }}
            >
              {modeMeta?.name || snap.mode}
            </span>
          </div>

          {snap.modeStatus && (snap.mode === 'horror' || snap.mode === 'troll' || snap.mode === 'boss_rush' || snap.mode === 'architect') && (
            <div className="px-2.5 py-0.5 rounded bg-slate-950/75 border border-white/15 text-[10px] font-semibold text-slate-200">
              {snap.modeStatus}
            </div>
          )}

          {wpDist !== null && snap.waypoint && (
            <div className="px-2.5 py-0.5 rounded bg-amber-950/80 border border-amber-400/50 text-[10px] font-bold text-amber-200">
              Pin "{snap.waypoint.label}" · {wpDist}m away
            </div>
          )}

          {snap.bossBar && (
            <div className="w-72 voxel-panel rounded px-3 py-1.5">
              <div className="flex justify-between text-[11px] font-bold text-purple-200 mb-1">
                <span>{snap.bossBar.name}</span>
                <span>
                  {snap.bossBar.hp} / {snap.bossBar.maxHp}
                </span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{ width: `${Math.max(0, Math.min(100, (snap.bossBar.hp / snap.bossBar.maxHp) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Players Counter, Tool Buttons & Corner Tactical Radar */}
        <div className="flex items-start gap-2.5">
          <div className="flex flex-col items-end gap-1.5">
            <div className="voxel-panel rounded px-2.5 py-1.5 flex items-center gap-2 text-xs font-bold">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-white">
                {snap.playMode === 'online' ? `Players: ${playerTotal}/12` : 'Offline Solo'}
              </span>
              <Signal
                className={`w-3.5 h-3.5 ${
                  snap.playMode === 'offline' ? 'text-slate-400' : snap.connected ? 'text-emerald-400' : 'text-amber-400'
                }`}
              />
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              {snap.playMode === 'online' && (
                <button
                  type="button"
                  onClick={onToggleMic}
                  aria-label="Toggle Microphone"
                  title="Toggle Microphone (N)"
                  className={`voxel-panel rounded p-1.5 cursor-pointer ${
                    snap.voice.micEnabled && !snap.voice.muted ? 'text-emerald-300' : 'text-slate-300'
                  }`}
                >
                  {snap.voice.micEnabled && !snap.voice.muted ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              )}
              <button
                type="button"
                onClick={onOpenCreator}
                aria-label="Open Creator Studio"
                title="Creator Studio & Modes (C)"
                className="voxel-panel rounded p-1.5 text-amber-300 hover:text-amber-200 cursor-pointer"
              >
                <Wand2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onCycleCamera}
                title="Switch Camera Perspective (F5)"
                className="voxel-panel rounded px-2 py-1 text-[11px] font-bold text-slate-200 hover:text-amber-300 cursor-pointer"
              >
                {snap.cameraMode === 'first' ? '1st' : snap.cameraMode === 'third_back' ? '3rd' : 'Front'}
              </button>
              <button
                type="button"
                onClick={onOpenPause}
                aria-label="Open Pause Menu"
                title="Pause Menu (Esc)"
                className="voxel-panel rounded p-1.5 text-slate-200 hover:text-amber-300 cursor-pointer"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Clickable GTA-Style Corner Tactical Radar Minimap */}
          <button
            type="button"
            onClick={onOpenMap}
            aria-label="Open Tactical Map"
            title="Click or press [M] for Full Tactical World Map"
            className="voxel-panel rounded-md p-1.5 relative w-28 h-28 flex flex-col items-center justify-center pointer-events-auto cursor-pointer hover:border-amber-400"
          >
            <span className="text-[9px] font-black text-amber-300 absolute top-0.5 left-1/2 -translate-x-1/2">N</span>
            <span className="text-[9px] font-bold text-slate-300 absolute bottom-0.5 left-1/2 -translate-x-1/2">S</span>
            <span className="text-[9px] font-bold text-slate-300 absolute left-1 top-1/2 -translate-y-1/2">W</span>
            <span className="text-[9px] font-bold text-slate-300 absolute right-1 top-1/2 -translate-y-1/2">E</span>
            <div className="grid grid-cols-15 w-20 h-20 border border-slate-600 rounded-sm overflow-hidden">
              {snap.minimapCells.map((col, idx) => (
                <div key={idx} style={{ backgroundColor: col }} />
              ))}
            </div>
            {/* Directional Player Arrow */}
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              className="absolute pointer-events-none"
              style={{ transform: `rotate(${-snap.yaw}rad)` }}
            >
              <polygon points="6,1 10,10 6,7.5 2,10" fill="#ffffff" stroke="#0f172a" strokeWidth="1.2" />
            </svg>
            <span className="absolute bottom-1 right-1 bg-slate-950/85 border border-slate-600 px-1 rounded text-[8px] font-bold text-amber-300 flex items-center gap-0.5">
              <Compass className="w-2.5 h-2.5" /> M
            </span>
          </button>
        </div>
      </div>

      {/* Center Crosshair & Target Block Tooltip */}
      {snap.activeModal === 'none' && (
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
          <div className="w-4 h-4 relative flex items-center justify-center">
            <div className="w-3.5 h-0.5 bg-white/90 shadow" />
            <div className="h-3.5 w-0.5 bg-white/90 shadow absolute" />
          </div>
          {snap.targetBlockName && (
            <div className="mt-4 px-2 py-0.5 rounded bg-slate-950/75 text-[11px] font-semibold text-amber-200 border border-white/10">
              {snap.targetBlockName}
            </div>
          )}
        </div>
      )}

      {/* Bottom Row: Left Chat + Hints | Center Vitals & 9-Slot Hotbar | Right Pickup Toasts */}
      <div className="flex items-end justify-between gap-4">
        {/* Bottom-Left Chat Box + Hint Strip */}
        <div className="w-80 flex flex-col gap-1.5">
          <div className="flex flex-col gap-0.5 max-h-32 overflow-hidden bg-slate-950/65 rounded p-2 border border-white/10">
            {snap.chat.slice(-5).map((c) => (
              <div
                key={c.id}
                className={`text-[11px] leading-snug ${
                  c.system ? 'text-amber-300' : c.whisper ? 'text-fuchsia-300 italic' : 'text-slate-100'
                }`}
              >
                <span className="font-bold">{c.sender}: </span>
                <span>{c.text}</span>
              </div>
            ))}
          </div>

          {snap.activeModal === 'chat' ? (
            <form
              className="pointer-events-auto flex gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                if (chatInput.trim()) onSubmitChat(chatInput);
                setChatInput('');
                onCloseChat();
              }}
            >
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                placeholder="Type chat or /help command..."
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    onCloseChat();
                  }
                }}
                className="flex-1 bg-slate-950/95 border border-amber-400 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Send
              </button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-200 pointer-events-auto">
              <button
                type="button"
                onClick={onOpenInventory}
                className="voxel-panel rounded px-2 py-0.5 hover:text-amber-300 cursor-pointer"
              >
                [E] Craft
              </button>
              <button
                type="button"
                onClick={onOpenMap}
                className="voxel-panel rounded px-2 py-0.5 hover:text-amber-300 cursor-pointer"
              >
                [M] Map
              </button>
              <button
                type="button"
                onClick={onOpenCreator}
                className="voxel-panel rounded px-2 py-0.5 hover:text-amber-300 cursor-pointer"
              >
                [C] Creator
              </button>
              <button
                type="button"
                onClick={onCycleCamera}
                className="voxel-panel rounded px-2 py-0.5 hover:text-amber-300 cursor-pointer"
              >
                [F5] POV
              </button>
            </div>
          )}
        </div>

        {/* Bottom-Center Survival Bars & 9-Slot Hotbar */}
        <div className="flex flex-col items-center gap-1 pointer-events-auto">
          {!hideVitals && (
            <div className="w-full flex items-center justify-between px-1 text-xs">
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span key={i} className={i < heartsCount ? 'text-rose-500 drop-shadow' : 'text-slate-700'}>
                    ♥
                  </span>
                ))}
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <span key={i} className={i < foodCount ? 'text-amber-500 drop-shadow' : 'text-slate-700'}>
                    🍖
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Green XP Level + Progress Bar */}
          <div className="w-full relative flex flex-col items-center px-1">
            <span className="text-xs font-black text-lime-400 leading-none mb-0.5 drop-shadow">
              {snap.xpLevel}
            </span>
            <div className="w-full h-1.5 bg-slate-900 border border-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-lime-400" style={{ width: `${Math.round(snap.xpProgress * 100)}%` }} />
            </div>
          </div>

          {/* 9-Slot Hotbar */}
          <div className="flex gap-1 p-1 voxel-panel rounded-md">
            {snap.hotbar.map((slot, idx) => {
              const active = idx === snap.selectedHotbar;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectHotbar(idx)}
                  title={slot ? getName(slot.id) : `Slot ${idx + 1}`}
                  className={`w-11 h-11 rounded relative flex items-center justify-center cursor-pointer ${
                    active ? 'voxel-slot-active' : 'voxel-slot hover:border-slate-400'
                  }`}
                >
                  <span className="absolute top-0.5 left-1 text-[9px] text-slate-400 font-mono">{idx + 1}</span>
                  {slot && (
                    <>
                      <img src={getItemIconUrl(slot.id)} alt={getName(slot.id)} className="w-8 h-8 pixel-render" />
                      {slot.enchants && Object.keys(slot.enchants).length > 0 && (
                        <span className="absolute inset-0 rounded ring-1 ring-fuchsia-400/70 pointer-events-none" />
                      )}
                      {slot.count > 1 && (
                        <span className="absolute bottom-0 right-1 text-[11px] font-black text-white drop-shadow">
                          {slot.count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom-Right Item Pickup Toasts */}
        <div className="w-56 flex flex-col items-end gap-1.5">
          {snap.toasts.map((t) => (
            <div
              key={t.id}
              className="voxel-panel rounded px-2.5 py-1.5 flex items-center gap-2 text-xs font-bold text-white"
            >
              <img src={getItemIconUrl(t.itemId)} alt={t.name} className="w-5 h-5 pixel-render" />
              <span>
                +{t.count} {t.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
