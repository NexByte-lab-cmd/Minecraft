import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Compass, Globe, MapPin, Navigation, Trash2, X } from 'lucide-react';
import { SeededNoise } from '../world/noise';
import { SEA_LEVEL, TELEPORT_BIOME_PRESETS, sampleTerrain } from '../world/biomes';
import type { RealmId } from '../network/commands';
import type { HudSnapshot } from '../game/GameEngine';

interface TacticalMapModalProps {
  snap: HudSnapshot;
  onClose: () => void;
  onTeleportCoords: (x: number, z: number) => void;
  onSetWaypoint: (x: number, z: number, label: string) => void;
  onClearWaypoint: () => void;
  onSwitchRealm: (realm: RealmId) => void;
  onTeleportBiome: (name: string) => void;
}

const CANVAS_SIZE = 360;
const GRID_N = 90;

export const TacticalMapModal: React.FC<TacticalMapModalProps> = ({
  snap,
  onClose,
  onTeleportCoords,
  onSetWaypoint,
  onClearWaypoint,
  onSwitchRealm,
  onTeleportBiome,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scaleBlocks, setScaleBlocks] = useState<number>(4); // blocks per sample -> 360x360 or 720x720 span
  const [hoverInfo, setHoverInfo] = useState<{ x: number; z: number; biome: string; y: number } | null>(null);
  const [pinMode, setPinMode] = useState<'teleport' | 'waypoint'>('teleport');

  const noise = useMemo(() => new SeededNoise(snap.seed), [snap.seed]);
  const spanHalf = Math.floor((GRID_N * scaleBlocks) / 2);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellPx = CANVAS_SIZE / GRID_N;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    for (let gz = 0; gz < GRID_N; gz++) {
      for (let gx = 0; gx < GRID_N; gx++) {
        const wx = snap.x - spanHalf + gx * scaleBlocks;
        const wz = snap.z - spanHalf + gz * scaleBlocks;
        const t = sampleTerrain(noise, wx, wz, snap.realm);

        let color = t.biome.grassTint;
        if (snap.realm === 'overworld') {
          if (t.height < SEA_LEVEL || t.riverMask > 0) {
            const depthShade = Math.max(0.55, 1 - (SEA_LEVEL - t.height) * 0.04);
            const r = Math.round(36 * depthShade);
            const g = Math.round(135 * depthShade);
            const b = Math.round(220 * depthShade);
            color = `rgb(${r},${g},${b})`;
          } else if (t.height > 88) {
            color = '#e8f1fa';
          } else {
            // Subtle elevation contour shade
            const shade = Math.max(0.76, Math.min(1.18, 0.85 + (t.height - 64) * 0.009));
            const hex = t.biome.grassTint.replace('#', '');
            const r = Math.min(255, Math.round(parseInt(hex.slice(0, 2), 16) * shade));
            const g = Math.min(255, Math.round(parseInt(hex.slice(2, 4), 16) * shade));
            const b = Math.min(255, Math.round(parseInt(hex.slice(4, 6), 16) * shade));
            color = `rgb(${r},${g},${b})`;
          }
        } else if (snap.realm === 'nether' && t.height <= 31) {
          color = '#e05319';
        } else if (snap.realm === 'end' && t.height < 0) {
          color = '#090612';
        }

        ctx.fillStyle = color;
        ctx.fillRect(gx * cellPx, gz * cellPx, Math.ceil(cellPx), Math.ceil(cellPx));
      }
    }

    // Cardinal grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const p = (CANVAS_SIZE / 4) * i;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, CANVAS_SIZE);
      ctx.moveTo(0, p);
      ctx.lineTo(CANVAS_SIZE, p);
      ctx.stroke();
    }

    // Waypoint Marker
    if (snap.waypoint) {
      const wxPx = ((snap.waypoint.x - (snap.x - spanHalf)) / (GRID_N * scaleBlocks)) * CANVAS_SIZE;
      const wzPx = ((snap.waypoint.z - (snap.z - spanHalf)) / (GRID_N * scaleBlocks)) * CANVAS_SIZE;
      if (wxPx >= 0 && wxPx <= CANVAS_SIZE && wzPx >= 0 && wzPx <= CANVAS_SIZE) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(wxPx, wzPx, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // Online Peers
    for (const peer of snap.peers) {
      if (peer.realm !== snap.realm) continue;
      const pxPx = ((peer.x - (snap.x - spanHalf)) / (GRID_N * scaleBlocks)) * CANVAS_SIZE;
      const pzPx = ((peer.z - (snap.z - spanHalf)) / (GRID_N * scaleBlocks)) * CANVAS_SIZE;
      if (pxPx >= 0 && pxPx <= CANVAS_SIZE && pzPx >= 0 && pzPx <= CANVAS_SIZE) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(pxPx, pzPx, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Center Player Direction Arrow
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-snap.yaw);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }, [noise, scaleBlocks, snap.peers, snap.realm, snap.waypoint, snap.x, snap.yaw, snap.z, spanHalf]);

  const toWorldCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const nz = (e.clientY - rect.top) / rect.height;
    const wx = Math.round(snap.x - spanHalf + nx * (GRID_N * scaleBlocks));
    const wz = Math.round(snap.z - spanHalf + nz * (GRID_N * scaleBlocks));
    return { wx, wz };
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { wx, wz } = toWorldCoords(e);
    const t = sampleTerrain(noise, wx, wz, snap.realm);
    setHoverInfo({ x: wx, z: wz, biome: t.biome.name, y: t.height });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { wx, wz } = toWorldCoords(e);
    if (pinMode === 'waypoint') {
      onSetWaypoint(wx, wz, `Pin (${wx}, ${wz})`);
    } else {
      onTeleportCoords(wx, wz);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="voxel-panel rounded-lg w-full max-w-4xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-black text-white leading-tight">
                Tactical World Atlas · {snap.realm.toUpperCase()}
              </h2>
              <div className="text-[11px] text-slate-400">
                Current Position: ({snap.x}, {snap.y}, {snap.z}) · {snap.biomeName} · Seed: {snap.seed}
              </div>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close Map"
            onClick={onClose}
            className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-[380px_1fr] gap-4">
          {/* Radar Canvas */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative border-2 border-slate-600 rounded overflow-hidden">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                onMouseMove={handleCanvasMove}
                onClick={handleCanvasClick}
                className="block w-[360px] h-[360px] cursor-crosshair"
              />
              <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[10px] font-black text-amber-300 bg-slate-950/70 px-1.5 rounded">
                N
              </span>
              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-300 bg-slate-950/70 px-1.5 rounded">
                S
              </span>
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 bg-slate-950/70 px-1 rounded">
                W
              </span>
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 bg-slate-950/70 px-1 rounded">
                E
              </span>
            </div>

            <div className="w-full flex items-center justify-between text-[11px] text-slate-300 px-1">
              <span>
                {hoverInfo
                  ? `${hoverInfo.biome} · X:${hoverInfo.x} Z:${hoverInfo.z} (Y~${hoverInfo.y})`
                  : 'Click map to fast-travel or drop waypoint'}
              </span>
              <span className="font-mono text-amber-300">
                Span {GRID_N * scaleBlocks}×{GRID_N * scaleBlocks}m
              </span>
            </div>
          </div>

          {/* Controls, Dimensions & Biomes */}
          <div className="flex flex-col gap-3">
            {/* Click Mode + Zoom */}
            <div className="rounded bg-slate-900 border border-slate-700 p-3 flex flex-col gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Map Interaction & Radar Zoom
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPinMode('teleport')}
                  className={`py-1.5 px-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${
                    pinMode === 'teleport'
                      ? 'bg-amber-500 border-amber-300 text-slate-950'
                      : 'bg-slate-800 border-slate-600 text-slate-300'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" /> Click to Teleport
                </button>
                <button
                  type="button"
                  onClick={() => setPinMode('waypoint')}
                  className={`py-1.5 px-2 rounded text-xs font-bold flex items-center justify-center gap-1.5 border cursor-pointer ${
                    pinMode === 'waypoint'
                      ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                      : 'bg-slate-800 border-slate-600 text-slate-300'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" /> Drop Waypoint
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {[2, 4, 8, 16].map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setScaleBlocks(sc)}
                    className={`flex-1 py-1 rounded text-[11px] font-bold border cursor-pointer ${
                      scaleBlocks === sc
                        ? 'bg-sky-600 border-sky-400 text-white'
                        : 'bg-slate-800 border-slate-600 text-slate-300'
                    }`}
                  >
                    {GRID_N * sc}m
                  </button>
                ))}
              </div>
              {snap.waypoint && (
                <div className="flex items-center justify-between bg-amber-950/50 border border-amber-500/40 rounded px-2.5 py-1.5 text-xs">
                  <span className="text-amber-200 font-semibold">
                    Active Pin: {snap.waypoint.label}
                  </span>
                  <button
                    type="button"
                    onClick={onClearWaypoint}
                    className="text-rose-300 hover:text-rose-200 flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
              )}
            </div>

            {/* Dimension Switch */}
            <div className="rounded bg-slate-900 border border-slate-700 p-3 flex flex-col gap-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-sky-400" /> Dimensions
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['overworld', 'nether', 'end'] as RealmId[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      onSwitchRealm(r);
                      onClose();
                    }}
                    className={`py-1.5 rounded text-xs font-bold uppercase border cursor-pointer ${
                      snap.realm === r
                        ? 'bg-amber-500 border-amber-300 text-slate-950'
                        : 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Landmarks & Giant Biome Teleports */}
            <div className="rounded bg-slate-900 border border-slate-700 p-3 flex flex-col gap-2 flex-1">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                World Biomes & Landmarks
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {TELEPORT_BIOME_PRESETS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      onTeleportBiome(b.label);
                      onClose();
                    }}
                    className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-left cursor-pointer"
                  >
                    <div className="text-xs font-bold text-white truncate">{b.label}</div>
                    <div className="text-[10px] text-slate-400">
                      {b.realm.toUpperCase()} · ({b.x}, {b.z})
                    </div>
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
