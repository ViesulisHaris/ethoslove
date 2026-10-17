"use client";

import { useEffect, useRef } from "react";

type Piece = { x: number; y: number; vx: number; vy: number; w: number; h: number; rot: number; vr: number; color: string; life: number };

/** A rose petal: a soft teardrop, round at the outer edge and pinched where it left the flower. */
function petal(ctx: CanvasRenderingContext2D, size: number) {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(0, s);
  ctx.bezierCurveTo(-s * 1.05, s * 0.35, -s * 0.8, -s * 0.95, 0, -s);
  ctx.bezierCurveTo(s * 0.8, -s * 0.95, s * 1.05, s * 0.35, 0, s);
  ctx.fill();
}

/** A small heart centred on the origin, `size` across. */
function heart(ctx: CanvasRenderingContext2D, size: number) {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(0, s * 0.8);
  ctx.bezierCurveTo(-s * 1.3, -s * 0.1, -s * 0.6, -s * 1.15, 0, -s * 0.42);
  ctx.bezierCurveTo(s * 0.6, -s * 1.15, s * 1.3, -s * 0.1, 0, s * 0.8);
  ctx.fill();
}

/**
 * Canvas confetti cannon. Mount with a `burst` counter; each increment fires once from
 * `origin` (fractions of the container). Cheap: paths only, no images. `shape="heart"` throws
 * little hearts, and `shape="petal"` rose petals, that flip as they fall instead of paper rectangles.
 */
export function Confetti({ burst, colors, origin = { x: 0.5, y: 0.6 }, count = 160, shape = "rect", className }: { burst: number; colors: string[]; origin?: { x: number; y: number }; count?: number; shape?: "rect" | "heart" | "petal"; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pieces = useRef<Piece[]>([]);
  const raf = useRef(0);

  useEffect(() => {
    if (burst === 0) return;
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const s = 520 + Math.random() * 520;
      pieces.current.push({
        x: w * origin.x,
        y: h * origin.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 10,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 12,
        color: colors[i % colors.length],
        life: 2.6 + Math.random() * 1.4,
      });
    }
    let last = performance.now();
    cancelAnimationFrame(raf.current);
    const tick = (now: number) => {
      const dt = Math.min(0.04, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      pieces.current = pieces.current.filter((p) => p.life > 0 && p.y < h + 40);
      for (const p of pieces.current) {
        p.life -= dt;
        p.vy += 900 * dt;
        p.vx *= 0.985;
        p.vy *= 0.99;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, p.life);
        ctx.fillStyle = p.color;
        if (shape === "heart" || shape === "petal") {
          ctx.scale(0.3 + 0.7 * Math.abs(Math.cos(p.rot * 1.3)), 1);
          if (shape === "heart") heart(ctx, p.h);
          else petal(ctx, p.h * 1.25);
        } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 1.7)));
        ctx.restore();
      }
      if (pieces.current.length) raf.current = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burst]);

  return <canvas ref={ref} className={className ?? "pointer-events-none absolute inset-0 z-30"} aria-hidden="true" />;
}
