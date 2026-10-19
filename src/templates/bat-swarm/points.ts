import { mulberry32 } from "../_shared/random";

/**
 * Where the bats go. A word is drawn into a canvas, its pixels are read back, and every bat is
 * given one of the points that fell inside a letter. All of it is arithmetic on plain arrays, so
 * it is the same in the browser and in a test.
 */
export type P = { x: number; y: number };

/** The points on a grid `step` apart whose alpha is set, from RGBA pixels as a canvas gives them. */
export function maskPoints(rgba: ArrayLike<number>, w: number, h: number, step: number, threshold = 128): P[] {
  const out: P[] = [];
  const half = Math.floor(step / 2);
  for (let y = half; y < h; y += step) for (let x = half; x < w; x += step) if (rgba[(y * w + x) * 4 + 3] >= threshold) out.push({ x, y });
  return out;
}

/** How many pixels of the mask are set. */
export function maskArea(rgba: ArrayLike<number>, w: number, h: number, threshold = 128): number {
  let n = 0;
  for (let i = 3; i < w * h * 4; i += 4) if (rgba[i] >= threshold) n++;
  return n;
}

/**
 * Exactly `count` points from `pool`, spread over all of it. A pool that is too big is thinned by a
 * seeded shuffle; one that is too small is topped up with jittered copies, so every bat has a place.
 */
export function pickPoints(pool: P[], count: number, seed: number, jitter = 1.2): P[] {
  if (!pool.length || count <= 0) return [];
  const rng = mulberry32(seed);
  const order = pool.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const out: P[] = [];
  for (let i = 0; i < count; i++) {
    const p = pool[order[i % order.length]];
    out.push(i < order.length ? p : { x: p.x + (rng() - 0.5) * 2 * jitter, y: p.y + (rng() - 0.5) * 2 * jitter });
  }
  return out;
}

/** The grid step that gives about `count` points inside a shape of `area` pixels. */
export function stepFor(area: number, count: number): number {
  return Math.max(1, Math.floor(Math.sqrt(area / Math.max(1, count * 1.15))));
}

/** The classic heart, (x² + y² − 1)³ = x²y³, whose box is 2.276 wide and 2.234 tall around (0, 0.119). */
const HEART = { w: 2.276, cy: 0.119 };

/** The inside of a heart as `count` points, `size` wide and centred on (cx, cy). Rejection-sampled, so seeded. */
export function heartPoints(count: number, cx: number, cy: number, size: number, seed: number): P[] {
  const rng = mulberry32(seed);
  const out: P[] = [];
  const k = size / HEART.w;
  while (out.length < count) {
    const x = (rng() * 2 - 1) * 1.15;
    const y = (rng() * 2 - 1) * 1.25;
    if (Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y > 0) continue;
    out.push({ x: cx + x * k, y: cy - (y - HEART.cy) * k });
  }
  return out;
}
