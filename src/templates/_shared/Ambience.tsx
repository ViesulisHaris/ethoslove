"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

export type AmbienceKind = "petals" | "sparkles" | "hearts" | "bokeh" | "dust" | "snow" | "leaves" | "embers" | "bats";

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

const BASE_COUNT: Record<AmbienceKind, number> = { petals: 18, sparkles: 26, hearts: 14, bokeh: 12, dust: 22, snow: 40, leaves: 16, embers: 24, bats: 5 };

/** Rising kinds spawn at the bottom; bats cross the screen and spawn at a side. */
const RISING: AmbienceKind[] = ["hearts", "dust", "embers"];

function sizeFor(kind: AmbienceKind): number {
  switch (kind) {
    case "petals":
      return 7 + Math.random() * 9;
    case "sparkles":
      return 2 + Math.random() * 4;
    case "hearts":
      return 6 + Math.random() * 8;
    case "bokeh":
      return 10 + Math.random() * 26;
    case "dust":
      return 1.2 + Math.random() * 2.2;
    case "snow":
      return 2 + Math.random() * 3;
    case "leaves":
      return 8 + Math.random() * 8;
    case "embers":
      return 1.4 + Math.random() * 1.8;
    case "bats":
      return 6 + Math.random() * 5;
  }
}

function fallSpeed(kind: AmbienceKind): number {
  switch (kind) {
    case "sparkles":
      return 4 + Math.random() * 14;
    case "bokeh":
      return 6 + Math.random() * 14;
    case "dust":
      return 12 + Math.random() * 14;
    case "hearts":
      return 22 + Math.random() * 14;
    case "embers":
      return 34 + Math.random() * 30;
    case "petals":
      return 30 + Math.random() * 30;
    case "leaves":
      return 24 + Math.random() * 26;
    default:
      return 30 + Math.random() * 14;
  }
}

/**
 * A full-screen weather layer, drawn on one canvas: petals falling, sparkles twinkling,
 * hearts rising, bokeh drifting, candle dust, snow, autumn leaves tumbling, embers rising from
 * a fire, bats crossing a night sky. Cheap enough for a phone (a few dozen particles, no
 * images, no shadows) and still all over the screen, which is what makes a gift feel alive on
 * camera. `intensity` scales the counts; reduced motion draws a still frame.
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
      p.rot = Math.random() * Math.PI * 2;
      p.phase = Math.random() * Math.PI * 2;
      if (p.kind === "bats") {
        // Bats fly across the upper half, each in its own direction, and re-enter from the far side.
        const dir = Math.random() > 0.5 ? 1 : -1;
        p.vx = dir * (40 + Math.random() * 45);
        p.vy = (Math.random() - 0.5) * 8;
        p.vr = 0;
        p.y = h * (0.06 + Math.random() * 0.5);
        p.x = fresh ? Math.random() * w : dir > 0 ? -p.size * 4 : w + p.size * 4;
        return;
      }
      const dir = RISING.includes(p.kind) ? -1 : 1;
      p.x = Math.random() * w;
      p.y = fresh ? Math.random() * h : dir > 0 ? -p.size * 2 : h + p.size * 2;
      p.vx = (Math.random() - 0.5) * (p.kind === "petals" ? 26 : p.kind === "leaves" ? 34 : 10);
      p.vy = dir * fallSpeed(p.kind);
      p.vr = (Math.random() - 0.5) * (p.kind === "petals" ? 2.2 : p.kind === "leaves" ? 3.4 : 0.6);
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
        const base = layer.count ?? BASE_COUNT[layer.kind];
        const n = Math.round(base * Math.min(2.4, Math.max(0.7, area)) * intensity);
        for (let i = 0; i < n; i++) {
          const p: Particle = {
            x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0, phase: 0,
            size: sizeFor(layer.kind),
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
        } else if (p.kind === "leaves") {
          // A leaf tumbling: it also flips, which the squash of its width sells.
          ctx.rotate(p.rot);
          const flip = 0.35 + 0.65 * Math.abs(Math.cos(t * 1.6 + p.phase));
          ctx.scale(flip, 1);
          ctx.globalAlpha = 0.92;
          const s = p.size;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.quadraticCurveTo(s * 0.95, -s * 0.25, 0, s);
          ctx.quadraticCurveTo(-s * 0.95, -s * 0.25, 0, -s);
          ctx.fill();
          ctx.strokeStyle = "rgba(60, 25, 5, 0.35)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, -s * 0.3);
          ctx.lineTo(0, s * 1.15);
          ctx.stroke();
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
        } else if (p.kind === "embers") {
          // Sparks from a fire: bright core, faint halo, flickering and dying out as they climb.
          const life = Math.max(0, Math.min(1, p.y / h));
          const flick = 0.45 + 0.55 * Math.abs(Math.sin(t * 5 + p.phase));
          ctx.globalAlpha = flick * (0.25 + 0.75 * life) * 0.35;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 2.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = flick * (0.25 + 0.75 * life);
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "bats") {
          // A silhouette: a small body, two scalloped wings that beat, and ears.
          const s = p.size;
          const flap = Math.sin(t * 12 + p.phase);
          const lift = -s * (0.55 + flap * 0.45);
          ctx.globalAlpha = 0.9;
          ctx.beginPath();
          ctx.ellipse(0, 0, s * 0.34, s * 0.55, 0, 0, Math.PI * 2);
          ctx.fill();
          for (const d of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(0, -s * 0.1);
            ctx.quadraticCurveTo(d * s * 0.9, lift - s * 0.4, d * s * 1.8, lift);
            ctx.quadraticCurveTo(d * s * 1.5, lift + s * 0.55, d * s * 1.15, lift + s * 0.45);
            ctx.quadraticCurveTo(d * s * 0.95, lift + s * 0.85, d * s * 0.6, lift + s * 0.7);
            ctx.quadraticCurveTo(d * s * 0.4, lift + s * 1.05, 0, s * 0.35);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(d * s * 0.1, -s * 0.45);
            ctx.lineTo(d * s * 0.32, -s * 0.95);
            ctx.lineTo(d * s * 0.36, -s * 0.35);
            ctx.closePath();
            ctx.fill();
          }
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
        if (p.kind === "bats") {
          p.x += p.vx * dt;
          p.y += (p.vy + Math.sin(t * 2.4 + p.phase) * 16) * dt;
          if (p.x < -p.size * 5 || p.x > w + p.size * 5) spawn(p, false);
          continue;
        }
        const sway =
          p.kind === "petals" ? Math.sin(t * 1.3 + p.phase) * 22
          : p.kind === "leaves" ? Math.sin(t * 1.1 + p.phase) * 34
          : p.kind === "snow" ? Math.sin(t + p.phase) * 12
          : p.kind === "embers" ? Math.sin(t * 2.2 + p.phase) * 14
          : Math.sin(t * 0.8 + p.phase) * 6;
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
