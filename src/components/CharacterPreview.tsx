import React, { useEffect, useRef, useState } from 'react';
import { PLAYER_SKINS, type PlayerSkin } from '../entities/catalog';

interface CharacterPreviewProps {
  skinId: string;
  width?: number;
  height?: number;
  interactive?: boolean;
  heldItemColor?: string;
  armorTint?: string;
  className?: string;
}

function shadeHex(hex: string, amt: number): string {
  const clean = hex.replace('#', '');
  const n = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16) || 0x888888;
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

function drawVoxelCharacter(
  ctx: CanvasRenderingContext2D,
  skin: PlayerSkin,
  w: number,
  h: number,
  yaw: number,
  time: number,
  heldColor?: string,
  armorTint?: string,
) {
  ctx.clearRect(0, 0, w, h);

  const scale = Math.min(w, h) / 148;
  ctx.save();
  ctx.translate(w * 0.5, h * 0.87 + Math.sin(time * 2.2) * 1.5 * scale);
  ctx.scale(scale, scale);

  // Ground oval shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 6, 26, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const facingBack = cos < 0;
  const sideW = Math.abs(sin) * 12;
  const frontW = Math.max(4, Math.abs(cos) * 28);
  const swing = Math.sin(time * 2.6) * 4;

  // Draw helper for vertical voxel limbs/torso
  const drawBox = (cx: number, topY: number, bw: number, bh: number, col: string, outline = '#181a20') => {
    const x = cx - bw * 0.5;
    ctx.fillStyle = col;
    ctx.fillRect(x, topY, bw, bh);
    if (sideW > 2) {
      ctx.fillStyle = shadeHex(col, -26);
      const sx = sin > 0 ? x + bw : x - sideW * 0.55;
      ctx.fillRect(sx, topY, sideW * 0.55, bh);
    }
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, topY + 0.5, Math.max(1, bw - 1), Math.max(1, bh - 1));
  };

  const legW = Math.max(4, frontW * 0.46);
  const legOffset = frontW * 0.24;

  // Cape (if DarkTitan) behind character when facing front
  if (skin.cape && !facingBack) {
    drawBox(0, -82, frontW * 0.9, 54, skin.cape);
  }

  // Legs
  const shoeCol = skin.style === 'efe' ? skin.accent : '#2a2422';
  drawBox(-legOffset, -42 + swing * 0.35, legW, 42, skin.pants);
  drawBox(-legOffset, -8 + swing * 0.35, legW, 8, shoeCol);
  drawBox(legOffset, -42 - swing * 0.35, legW, 42, skin.pants);
  drawBox(legOffset, -8 - swing * 0.35, legW, 8, shoeCol);

  // Back arm / Front arm ordering based on yaw
  const armW = Math.max(4, frontW * 0.38);
  const armSpread = frontW * 0.5 + armW * 0.5;
  const drawArm = (side: -1 | 1) => {
    const ax = side * armSpread;
    const ay = -82 + (side === -1 ? -swing : swing);
    const isBionic = side === -1 && skin.bionicLeftArm;
    if (isBionic) {
      drawBox(ax, ay, armW, 24, '#8d96a1');
      drawBox(ax, ay + 22, armW, 6, '#525963');
      drawBox(ax, ay + 27, armW, 13, '#aeb7c4');
    } else {
      drawBox(ax, ay, armW, 25, skin.shirt);
      drawBox(ax, ay + 24, armW, 16, skin.skin);
    }
    if (side === 1 && heldColor) {
      ctx.save();
      ctx.translate(ax + armW * 0.25, ay + 35);
      ctx.rotate(-0.45);
      ctx.fillStyle = '#6c4928';
      ctx.fillRect(-2, -16, 4, 16);
      ctx.fillStyle = heldColor;
      ctx.fillRect(-3, -34, 6, 18);
      ctx.restore();
    }
  };

  if (sin >= 0) drawArm(-1);
  else drawArm(1);

  // Torso
  drawBox(0, -84, frontW, 42, armorTint || skin.shirt);
  if (!armorTint && !facingBack) {
    if (skin.style === 'sunny') {
      ctx.fillStyle = skin.accent;
      ctx.fillRect(-frontW * 0.38, -70, frontW * 0.76, 28);
      ctx.fillRect(-frontW * 0.36, -84, frontW * 0.16, 16);
      ctx.fillRect(frontW * 0.2, -84, frontW * 0.16, 16);
      ctx.fillStyle = '#e8c448';
      ctx.fillRect(-frontW * 0.32, -71, 3, 3);
      ctx.fillRect(frontW * 0.22, -71, 3, 3);
    } else if (skin.style === 'kai') {
      ctx.fillStyle = '#4c347a';
      ctx.fillRect(-frontW * 0.32, -84, frontW * 0.64, 42);
      ctx.fillStyle = skin.accent;
      ctx.fillRect(-frontW * 0.25, -83, frontW * 0.18, 22);
      ctx.fillRect(-frontW * 0.08, -62, frontW * 0.2, 20);
    } else if (skin.style === 'zuri') {
      ctx.fillStyle = skin.accent;
      ctx.fillRect(-frontW * 0.22, -84, frontW * 0.44, 7);
    } else if (skin.style === 'noor') {
      ctx.fillStyle = skin.accent;
      ctx.fillRect(-frontW * 0.18, -84, frontW * 0.36, 42);
    } else if (skin.style === 'makena') {
      ctx.fillStyle = skin.accent;
      ctx.fillRect(-frontW * 0.48, -56, frontW * 0.96, 5);
    } else if (skin.style === 'alex') {
      ctx.fillStyle = skin.accent;
      ctx.fillRect(-frontW * 0.5, -52, frontW, 6);
    }
  }

  if (sin >= 0) drawArm(1);
  else drawArm(-1);

  if (skin.cape && facingBack) {
    drawBox(0, -82, frontW * 0.92, 54, skin.cape);
  }

  // Head
  const headW = Math.max(8, frontW * 0.98);
  const headTop = -114;
  drawBox(0, headTop, headW, 30, facingBack ? skin.hair : skin.skin);

  if (!facingBack) {
    // Top hair crown + bangs
    ctx.fillStyle = skin.hair;
    ctx.fillRect(-headW * 0.52, headTop - 2, headW * 1.04, 10);
    if (skin.style === 'makena') {
      ctx.fillRect(-headW * 0.58, headTop - 6, headW * 1.16, 12);
    } else if (skin.style === 'alex' || skin.style === 'ari') {
      ctx.fillRect(headW * 0.3, headTop + 6, headW * 0.22, 24);
    } else if (skin.style === 'noor') {
      ctx.fillRect(-headW * 0.54, headTop + 6, headW * 0.18, 22);
      ctx.fillRect(headW * 0.36, headTop + 6, headW * 0.18, 22);
    } else if (skin.style === 'kai') {
      ctx.fillRect(-headW * 0.52, headTop + 6, headW * 0.22, 12);
      ctx.fillRect(headW * 0.3, headTop + 6, headW * 0.22, 12);
    }

    // Crisp Pixel Eyes + Beard/Smile
    const eyeSpan = headW * 0.25;
    const eyeW = Math.max(2, headW * 0.14);
    ctx.fillStyle = '#f5f6f8';
    ctx.fillRect(-eyeSpan - eyeW * 0.5, headTop + 13, eyeW, 4);
    ctx.fillRect(eyeSpan - eyeW * 0.5, headTop + 13, eyeW, 4);
    ctx.fillStyle = skin.eyeColor;
    ctx.fillRect(-eyeSpan, headTop + 13, eyeW * 0.7, 4);
    ctx.fillRect(eyeSpan - eyeW * 0.4, headTop + 13, eyeW * 0.7, 4);

    if (skin.style === 'steve') {
      ctx.fillStyle = skin.hair;
      ctx.fillRect(-headW * 0.25, headTop + 21, headW * 0.5, 6);
      ctx.fillStyle = '#9c6348';
      ctx.fillRect(-headW * 0.12, headTop + 22, headW * 0.24, 2);
    } else {
      ctx.fillStyle = 'rgba(70,30,20,0.6)';
      ctx.fillRect(-headW * 0.12, headTop + 23, headW * 0.24, 2);
    }
  } else {
    ctx.fillStyle = skin.hair;
    ctx.fillRect(-headW * 0.52, headTop - 2, headW * 1.04, 32);
  }

  ctx.restore();
}

export const CharacterPreview: React.FC<CharacterPreviewProps> = ({
  skinId,
  width = 112,
  height = 148,
  interactive = true,
  heldItemColor,
  armorTint,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragYaw, setDragYaw] = useState(0.32);
  const draggingRef = useRef<{ active: boolean; startX: number; baseYaw: number }>({
    active: false,
    startX: 0,
    baseYaw: 0.32,
  });

  useEffect(() => {
    let raf = 0;
    const skin = PLAYER_SKINS.find((s) => s.id === skinId) || PLAYER_SKINS[0];
    const start = performance.now();

    const loop = () => {
      const c = canvasRef.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      const t = (performance.now() - start) / 1000;
      const yaw = draggingRef.current.active ? dragYaw : dragYaw + Math.sin(t * 0.9) * 0.22;
      drawVoxelCharacter(ctx, skin, width, height, yaw, t, heldItemColor, armorTint);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [skinId, width, height, dragYaw, heldItemColor, armorTint]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      onMouseDown={(e) => {
        if (!interactive) return;
        draggingRef.current = { active: true, startX: e.clientX, baseYaw: dragYaw };
      }}
      onMouseMove={(e) => {
        if (!interactive || !draggingRef.current.active) return;
        setDragYaw(draggingRef.current.baseYaw + (e.clientX - draggingRef.current.startX) * 0.025);
      }}
      onMouseUp={() => {
        draggingRef.current.active = false;
      }}
      onMouseLeave={() => {
        draggingRef.current.active = false;
      }}
      title={interactive ? 'Drag to rotate character' : undefined}
      className={`pixel-render ${interactive ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`}
      style={{ width, height }}
    />
  );
};
