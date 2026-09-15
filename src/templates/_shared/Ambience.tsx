"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

export type AmbienceKind = "petals" | "sparkles" | "hearts" | "bokeh" | "dust" | "snow";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  phase: number;
  color: string;
  kind: AmbienceKind;
};

type Layer = { kind: AmbienceKind; colors: string[]; count?: number };

/**
 * A full-screen weather layer, drawn on one canvas: petals falling, sparkles twinkling,
 * hearts rising, bokeh drifting, candle dust, snow. Cheap enough for a phone (a few dozen
 * particles, no images, no shadows) and still all over the screen, which is what makes a gift
 * feel alive on camera. `intensity` scales the counts; reduced motion draws a still frame.
 */
export function Ambience({ layers, intensity = 1, className, opacity = 1 }: { layers: Layer[]; intensity?: number; className?: string; opacity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const parent = canvas.parentElement!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0;
    let h = 0;
    let particles: Particle[] = [];
    let raf = 0;
    let last = performance.now();

    const spawn = (p: Particle, fresh: boolean) => {
      const dir = p.kind === "hearts" || p.kind === "dust" ? -1 : 1; // rising or falling
      p.x = Math.random() * w;
      p.y = fresh ? Math.random() * h : dir > 0 ? -p.size * 2 : h + p.size * 2;
      p.vx = (Math.random() - 0.5) * (p.kind === "petals" ? 26 : 10);
      p.vy = dir * ((p.kind === "sparkles" ? 4 : p.kind === "bokeh" ? 6 : p.kind === "dust" ? 12 : p.kind === "hearts" ? 22 : 30) + Math.random() * (p.kind === "petals" ? 30 : 14));
      p.rot = Math.random() * Math.PI * 2;
      p.vr = (Math.random() - 0.5) * (p.kind === "petals" ? 2.2 : 0.6);
      p.phase = Math.random() * Math.PI * 2;
    };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Density follows the area so a laptop is not sparse and a phone is not swamped.
      const area = (w * h) / (390 * 844);
      particles = [];
      for (const layer of layers) {
        const base = layer.count ?? { petals: 18, sparkles: 26, hearts: 14, bokeh: 12, dust: 22, snow: 40 }[layer.kind];
        const n = Math.round(base * Math.min(2.4, Math.max(0.7, area)) * intensity);
        for (let i = 0; i < n; i++) {
          const p: Particle = {
            x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, phase: 0,
            size: { petals: 7 + Math.random() * 9, sparkles: 2 + Math.random() * 4, hearts: 6 + Math.random() * 8, bokeh: 10 + Math.random() * 26, dust: 1.2 + Math.random() * 2.2, snow: 2 + Math.random() * 3 }[layer.kind],
            color: layer.colors[i % layer.colors.length],
            kind: layer.kind,
          };
          spawn(p, true);
          particles.push(p);
        }
      }
    };

    const draw = (now: number) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = p.color;
        if (p.kind === "petals") {
          ctx.rotate(p.rot);
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "sparkles") {
          const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 2.2 + p.phase));
          ctx.globalAlpha = tw;
          ctx.rotate(p.rot);
          const s = p.size * (0.8 + tw * 0.6);
          ctx.beginPath();
          ctx.moveTo(0, -s * 2);
          ctx.quadraticCurveTo(0, 0, s * 2, 0);
          ctx.quadraticCurveTo(0, 0, 0, s * 2);
          ctx.quadraticCurveTo(0, 0, -s * 2, 0);
          ctx.quadraticCurveTo(0, 0, 0, -s * 2);
          ctx.fill();
        } else if (p.kind === "hearts") {
          ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 1.4 + p.phase);
          ctx.rotate(Math.sin(t + p.phase) * 0.25);
          const s = p.size;
          ctx.beginPath();
          ctx.moveTo(0, s * 0.9);
          ctx.bezierCurveTo(-s * 1.4, -s * 0.2, -s * 0.6, -s * 1.1, 0, -s * 0.35);
          ctx.bezierCurveTo(s * 0.6, -s * 1.1, s * 1.4, -s * 0.2, 0, s * 0.9);
          ctx.fill();
        } else if (p.kind === "bokeh") {
          ctx.globalAlpha = 0.1 + 0.12 * Math.abs(Math.sin(t * 0.6 + p.phase));
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // dust and snow: soft dots
          ctx.globalAlpha = p.kind === "dust" ? 0.35 + 0.35 * Math.abs(Math.sin(t * 1.8 + p.phase)) : 0.85;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      for (const p of particles) {
        const sway = p.kind === "petals" ? Math.sin(t * 1.3 + p.phase) * 22 : p.kind === "snow" ? Math.sin(t + p.phase) * 12 : Math.sin(t * 0.8 + p.phase) * 6;
        p.x += (p.vx + sway) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y > h + 40 || p.y < -40 || p.x < -60 || p.x > w + 60) spawn(p, false);
      }
      draw(now);
      raf = requestAnimationFrame(tick);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(parent);
    if (reduce) draw(performance.now());
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(layers), intensity, reduce]);

  return <canvas ref={ref} aria-hidden="true" className={className ?? "pointer-events-none absolute inset-0"} style={{ opacity }} />;
}
