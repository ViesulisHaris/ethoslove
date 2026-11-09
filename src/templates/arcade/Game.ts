/** Low-res canvas catch game: basket follows the pointer, items fall, misses cost a life. */
export type GameState = { level: number; caught: number; misses: number; score: number };
export type GameEvents = { onCatch: (s: GameState) => void; onMiss: (s: GameState) => void; onLevelClear: (s: GameState) => void; onFail: (s: GameState) => void };

/** `gone`: caught, or fell past the floor. Out of play from that frame on, and counted only once. */
type Item = { x: number; y: number; vy: number; wobble: number; kind: "good" | "bad"; gone?: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string };

export const W = 160;
export const H = 260;

/**
 * Catches a level needs: the sender's number, kept to the 3–20 the editor offers, or the default 8.
 * Never anything a level can't be cleared with: a gift once reached its game with none, the counter
 * read "8/undefined" and every level ended in three lost lives.
 */
export function catchesPerLevel(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) ? Math.min(20, Math.max(3, Math.round(n))) : 8;
}

export class CatchGame {
  private ctx: CanvasRenderingContext2D;
  private items: Item[] = [];
  private particles: Particle[] = [];
  private raf = 0;
  private running = false;
  private last = 0;
  private spawnAt = 0;
  private time = 0;
  basketX = W / 2;
  state: GameState = { level: 1, caught: 0, misses: 0, score: 0 };
  perLevel = 8;
  lives = 3;
  sprite: "heart" | "star" | "cake" = "heart";
  accent = "#E8604C";
  reduced = false;
  private audio: AudioContext | null = null;

  constructor(private canvas: HTMLCanvasElement, private events: GameEvents) {
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
  }

  enableSound() {
    try {
      this.audio ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      this.audio = null;
    }
  }

  private beep(freq: number, ms = 70, type: OscillatorType = "square", gain = 0.05) {
    const a = this.audio;
    if (!a) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + ms / 1000);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + ms / 1000);
  }

  startLevel(level: number) {
    this.state = { ...this.state, level, caught: 0, misses: 0 };
    this.items = [];
    this.spawnAt = 0.6;
    this.time = 0;
    this.start();
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

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.04, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    const speed = 40 + this.state.level * 14;
    if (this.time > this.spawnAt) {
      this.items.push({ x: 14 + Math.random() * (W - 28), y: -10, vy: speed * (0.85 + Math.random() * 0.4), wobble: Math.random() * Math.PI * 2, kind: Math.random() < 0.15 + this.state.level * 0.02 ? "bad" : "good" });
      this.spawnAt = this.time + Math.max(0.35, 1.1 - this.state.level * 0.09);
    }
    const bx = this.basketX;
    const by = H - 22;
    for (const it of this.items) {
      it.y += it.vy * dt;
      it.x += Math.sin(this.time * 3 + it.wobble) * 12 * dt;
      if (it.y > by - 8 && it.y < by + 8 && Math.abs(it.x - bx) < 16) {
        it.gone = true;
        if (it.kind === "good") {
          this.state.caught += 1;
          this.state.score += 10 * this.state.level;
          this.beep(880 + this.state.caught * 40, 60);
          this.burst(it.x, by - 6, this.accent);
          this.events.onCatch(this.state);
          if (this.state.caught >= this.perLevel) {
            this.beep(1320, 120);
            setTimeout(() => this.beep(1760, 160), 90);
            this.stop();
            this.events.onLevelClear(this.state);
            return;
          }
        } else {
          this.state.misses += 1;
          this.beep(120, 160, "sawtooth", 0.08);
          this.burst(it.x, by - 6, "#8a8a8a");
          this.events.onMiss(this.state);
          if (this.state.misses >= this.lives) {
            this.stop();
            this.events.onFail(this.state);
            return;
          }
        }
      }
    }
    // Past the floor: a heart that got away costs a life, a bomb is simply gone. One already caught
    // is gone and never counts here: it used to be marked by a y of 999, which this check then took
    // for a heart that fell, so every catch also cost a life and no level of 4+ catches could be won.
    for (const it of this.items) {
      if (it.gone || it.y <= H + 6) continue;
      it.gone = true;
      if (it.kind !== "good") continue;
      this.state.misses += 1;
      this.beep(160, 120, "triangle", 0.06);
      this.events.onMiss(this.state);
      if (this.state.misses >= this.lives) {
        this.stop();
        this.events.onFail(this.state);
        return;
      }
    }
    this.items = this.items.filter((it) => !it.gone);
    for (const p of this.particles) {
      p.life -= dt;
      p.vy += 160 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  private burst(x: number, y: number, color: string) {
    if (this.reduced) return;
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({ x, y, vx: Math.cos(a) * 50, vy: Math.sin(a) * 50 - 30, life: 0.4 + Math.random() * 0.3, color });
    }
  }

  private draw() {
    const { ctx } = this;
    ctx.fillStyle = "#0b0d16";
    ctx.fillRect(0, 0, W, H);
    // starfield
    ctx.fillStyle = "#1e2340";
    for (let i = 0; i < 26; i++) ctx.fillRect((i * 37) % W, ((i * 53 + this.time * 8 * (1 + (i % 3))) % H) | 0, 1, 1);
    // ground
    ctx.fillStyle = "#1b1f33";
    ctx.fillRect(0, H - 10, W, 10);
    // items
    for (const it of this.items) this.drawSprite(it.kind === "good" ? this.sprite : "bomb", it.x | 0, it.y | 0);
    // particles
    for (const p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x | 0, p.y | 0, 2, 2);
    }
    // basket
    const bx = (this.basketX | 0) - 14;
    const by = H - 22;
    ctx.fillStyle = "#d9a15a";
    ctx.fillRect(bx, by, 28, 10);
    ctx.fillStyle = "#8b5a2b";
    for (let i = 0; i < 4; i++) ctx.fillRect(bx + 3 + i * 7, by + 2, 2, 6);
    ctx.fillRect(bx, by, 28, 2);
    // HUD
    ctx.fillStyle = "#e9e4d8";
    ctx.font = "8px monospace";
    ctx.textBaseline = "top";
    ctx.fillText(`LV${this.state.level}`, 4, 4);
    ctx.fillText(`${this.state.caught}/${this.perLevel}`, W / 2 - 10, 4);
    ctx.fillStyle = this.accent;
    for (let i = 0; i < this.lives - this.state.misses; i++) this.drawSprite("heart", W - 10 - i * 10, 8, 0.7);
  }

  private drawSprite(kind: "heart" | "star" | "cake" | "bomb", x: number, y: number, scale = 1) {
    const { ctx } = this;
    const s = scale;
    if (kind === "heart") {
      ctx.fillStyle = this.accent;
      const px = (dx: number, dy: number, w = 1, h = 1) => ctx.fillRect(x + dx * s, y + dy * s, w * s, h * s);
      px(-3, -3, 2, 1); px(1, -3, 2, 1); px(-4, -2, 8, 2); px(-3, 0, 6, 1); px(-2, 1, 4, 1); px(-1, 2, 2, 1);
    } else if (kind === "star") {
      ctx.fillStyle = "#f2c879";
      ctx.fillRect(x - 1, y - 4, 2, 8);
      ctx.fillRect(x - 4, y - 1, 8, 2);
      ctx.fillRect(x - 2, y - 2, 4, 4);
    } else if (kind === "cake") {
      ctx.fillStyle = "#f5d3c4";
      ctx.fillRect(x - 4, y - 1, 8, 5);
      ctx.fillStyle = this.accent;
      ctx.fillRect(x - 4, y - 2, 8, 2);
      ctx.fillStyle = "#fff2a8";
      ctx.fillRect(x, y - 5, 1, 3);
    } else {
      ctx.fillStyle = "#6b6b6b";
      ctx.fillRect(x - 3, y - 2, 6, 6);
      ctx.fillStyle = "#c33";
      ctx.fillRect(x, y - 4, 1, 2);
    }
  }
}
