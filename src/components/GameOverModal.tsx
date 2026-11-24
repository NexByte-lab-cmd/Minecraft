import React from 'react';
import { Eye, Home, RotateCcw } from 'lucide-react';
import type { GameMode } from '../network/commands';

interface GameOverModalProps {
  mode: GameMode;
  xpLevel: number;
  onRespawn: () => void;
  onReturnToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  mode,
  xpLevel,
  onRespawn,
  onReturnToTitle,
}) => {
  const isHardcore = mode === 'hardcore';
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-rose-950/75 p-4">
      <div className="voxel-panel rounded-lg w-full max-w-md p-6 text-center flex flex-col gap-4">
        <h2 className="text-3xl font-black text-rose-400">
          {isHardcore ? 'HARDCORE GAME OVER' : 'You Died!'}
        </h2>
        <p className="text-sm text-slate-300">
          Score / Level Reached: <span className="font-bold text-lime-400">Lv.{xpLevel}</span>
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onRespawn}
            className="w-full py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {isHardcore ? <Eye className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
            {isHardcore ? 'Spectate World' : 'Respawn at Sunset Haven'}
          </button>
          <button
            type="button"
            onClick={onReturnToTitle}
            className="w-full py-2 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" /> Return to Title (By KATHIR)
          </button>
        </div>
      </div>
    </div>
  );
};
