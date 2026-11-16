import { mulberry32 } from "../_shared/random";
import type { Point } from "./shapes";

type Star = { x: number; y: number; r: number; phase: number; speed: number; depth: number; warm: boolean };
export type Link = { a: number; b: number; progress: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number };
type Shooting = { x: number; y: number; vx: number; vy: number; born: number; life: number };

export type Camera = { cx: number; cy: number; scale: number };

/**
 * 2D canvas night sky. Runs its own rAF loop; React only mutates public fields.
 * Everything drawn per-frame is a pre-rendered sprite so it stays at 60fps on mid-range phones.
 */
export class Starfield {
  private ctx: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private stars: Star[] = [];
  private raf = 0;
  private running = false;
  private last = 0;
  private time = 0;
  private starSprite!: HTMLCanvasElement;
  private warmSprite!: HTMLCanvasElement;
  private glowSprite!: HTMLCanvasElement;
  private coreSprite!: HTMLCanvasElement;
  private shooting: Shooting | null = null;
  private nextShooting = 2.5;
  private particles: Particle[] = [];
  private seed: number;

  nodes: Point[] = [];
  visited: boolean[] = [];
  nextIndex: number | null = null;
  links: Link[] = [];
  outline: Point[] = [];
  /** 0..1 — how much of the finished constellation outline is drawn. */
  completion = 0;
  camera: Camera = { cx: 0, cy: 0, scale: 1 };
  parallax = { x: 0, y: 0 };
  reduced = false;
  accent: [number, number, number] = [242, 200, 121];

  constructor(private canvas: HTMLCanvasElement, opts: { seed: number; accent: [number, number, number]; reduced: boolean }) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("2d context unavailable");
    this.ctx = ctx;
    this.seed = opts.seed;
    this.accent = opts.accent;
    this.reduced = opts.reduced;
    this.makeSprites();
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.generateStars();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  burst(x: number, y: number, count = 64) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 160;
      const max = 1.2 + Math.random() * 1.4;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: max, max });
    }
  }

  worldToScreen(p: Point): Point {
    const { cx, cy, scale } = this.camera;
    return { x: (p.x - cx) * scale + this.w / 2, y: (p.y - cy) * scale + this.h / 2 };
  }

  screenToWorld(p: Point): Point {
    const { cx, cy, scale } = this.camera;
    return { x: (p.x - this.w / 2) / scale + cx, y: (p.y - this.h / 2) / scale + cy };
  }

  hitTest(sx: number, sy: number, radius = 34): number | null {
    let best: number | null = null;
    let bestD = radius;
    this.nodes.forEach((n, i) => {
      const s = this.worldToScreen(n);
      const d = Math.hypot(s.x - sx, s.y - sy);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  /* ----------------------------------------------------------------- */

  private generateStars() {
    const rng = mulberry32(this.seed);
    const count = Math.min(560, Math.max(160, Math.round((this.w * this.h) / 2200)));
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      const depth = [0.35, 0.6, 1][i % 3];
      stars.push({
        x: rng() * this.w,
        y: rng() * this.h,
        r: 0.6 + rng() * 1.5 * depth,
        phase: rng() * Math.PI * 2,
        speed: 0.5 + rng() * 1.8,
        depth,
        warm: rng() < 0.14,
      });
    }
    this.stars = stars;
  }

  private makeSprites() {
    const radial = (size: number, stops: [number, string][]) => {
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const g = c.getContext("2d")!;
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      stops.forEach(([o, col]) => grad.addColorStop(o, col));
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      return c;
    };
    const [r, g, b] = this.accent;
    this.starSprite = radial(32, [
      [0, "rgba(255,255,255,1)"],
      [0.3, "rgba(230,238,255,0.8)"],
      [1, "rgba(200,220,255,0)"],
    ]);
    this.warmSprite = radial(32, [
      [0, "rgba(255,244,220,1)"],
      [0.3, `rgba(${r},${g},${b},0.75)`],
      [1, `rgba(${r},${g},${b},0)`],
    ]);
    this.glowSprite = radial(160, [
      [0, `rgba(${r},${g},${b},0.85)`],
      [0.18, `rgba(${r},${g},${b},0.45)`],
      [0.5, `rgba(${r},${g},${b},0.12)`],
      [1, `rgba(${r},${g},${b},0)`],
    ]);
    this.coreSprite = radial(24, [
      [0, "rgba(255,255,255,1)"],
      [0.45, "rgba(255,255,255,0.95)"],
      [1, "rgba(255,255,255,0)"],
    ]);
  }

  private loop = (now: number) => {
    if (!this.running) return;
    // rAF's timestamp is the frame's start, which can be a moment before the performance.now() in
    // start(): a negative step would run time backwards and draw a ring with a negative radius.
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.time += dt;
    this.draw(this.time, dt);
    this.raf = requestAnimationFrame(this.loop);
  };

  private draw(t: number, dt: number) {
    const { ctx, w, h, dpr } = this;
    if (w === 0 || h === 0) return;
    const { cx, cy, scale } = this.camera;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (w / 2 - cx * scale), dpr * (h / 2 - cy * scale));

    this.drawStars(t);
    this.drawShooting(t, dt);
    this.drawOutline(t);
    this.drawLinks();
    this.drawNodes(t);
    this.drawParticles(dt);
    ctx.globalAlpha = 1;
  }

  private drawStars(t: number) {
    const { ctx } = this;
    const px = this.parallax.x * 28;
    const py = this.parallax.y * 28;
    for (const s of this.stars) {
      const tw = this.reduced ? 0.8 : 0.62 + 0.38 * Math.sin(t * s.speed + s.phase);
      const size = s.r * 5.5;
      const x = s.x + px * s.depth;
      const y = s.y + py * s.depth;
      ctx.globalAlpha = tw * (0.3 + 0.7 * s.depth);
      ctx.drawImage(s.warm ? this.warmSprite : this.starSprite, x - size / 2, y - size / 2, size, size);
    }
  }

  private drawShooting(t: number, dt: number) {
    const { ctx } = this;
    if (this.reduced) return;
    if (!this.shooting && t > this.nextShooting) {
      const fromLeft = Math.random() < 0.5;
      this.shooting = {
        x: fromLeft ? -20 : this.w * (0.3 + Math.random() * 0.6),
        y: this.h * Math.random() * 0.35,
        vx: (fromLeft ? 1 : -0.7) * (520 + Math.random() * 300),
        vy: 220 + Math.random() * 160,
        born: t,
        life: 0.9,
      };
      this.nextShooting = t + 5 + Math.random() * 7;
    }
    const s = this.shooting;
    if (!s) return;
    const age = t - s.born;
    if (age > s.life) {
      this.shooting = null;
      return;
    }
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    const tail = 0.12;
    const alpha = Math.sin((age / s.life) * Math.PI);
    const grad = ctx.createLinearGradient(s.x - s.vx * tail, s.y - s.vy * tail, s.x, s.y);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(1, `rgba(255,255,255,${alpha})`);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(s.x - s.vx * tail, s.y - s.vy * tail);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
  }

  private drawLinks() {
    const { ctx } = this;
    const [r, g, b] = this.accent;
    for (const l of this.links) {
      if (l.progress <= 0) continue;
      const a = this.nodes[l.a];
      const bn = this.nodes[l.b];
      if (!a || !bn) continue;
      const ex = a.x + (bn.x - a.x) * l.progress;
      const ey = a.y + (bn.y - a.y) * l.progress;
      ctx.globalAlpha = 1;
      ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(${r},${g},${b},0.22)`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.78)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
  }

  private drawOutline(t: number) {
    if (this.completion <= 0 || this.outline.length < 2) return;
    const { ctx } = this;
    const [r, g, b] = this.accent;
    const n = Math.max(2, Math.floor(this.outline.length * Math.min(1, this.completion)));
    const pulse = this.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 1.6);
    ctx.globalAlpha = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    // soft fill
    if (this.completion >= 1) {
      ctx.beginPath();
      this.outline.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = `rgba(${r},${g},${b},${0.05 + 0.05 * pulse})`;
      ctx.fill();
    }
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = this.outline[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    if (this.completion >= 1) ctx.closePath();
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.28 + 0.15 * pulse})`;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,250,240,${0.75 + 0.2 * pulse})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  private drawNodes(t: number) {
    const { ctx } = this;
    const scale = this.camera.scale;
    this.nodes.forEach((n, i) => {
      const visited = this.visited[i];
      const isNext = this.nextIndex === i;
      const pulse = this.reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t * 2.2 + i);
      const glow = (visited ? 96 : 76 + pulse * 10) / Math.sqrt(scale);
      ctx.globalAlpha = visited ? 0.95 : 0.55 + 0.35 * pulse;
      ctx.drawImage(this.glowSprite, n.x - glow / 2, n.y - glow / 2, glow, glow);
      const core = (visited ? 15 : 11 + pulse * 3) / Math.sqrt(scale);
      ctx.globalAlpha = 1;
      ctx.drawImage(this.coreSprite, n.x - core / 2, n.y - core / 2, core, core);
      if (isNext && !visited) {
        const ring = (((t * 0.9 + i * 0.3) % 1) + 1) % 1;
        ctx.globalAlpha = (1 - ring) * 0.7;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 1.2 / scale;
        ctx.beginPath();
        ctx.arc(n.x, n.y, (10 + ring * 22) / scale, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }

  private drawParticles(dt: number) {
    if (this.particles.length === 0) return;
    const { ctx } = this;
    const [r, g, b] = this.accent;
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.vy = p.vy * 0.985 + 12 * dt;
      const a = Math.max(0, p.life / p.max);
      ctx.globalAlpha = a;
      ctx.fillStyle = Math.random() < 0.5 ? "white" : `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2 + a * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
