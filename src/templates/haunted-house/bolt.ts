import { mulberry32 } from "../_shared/random";

export type Pt = { x: number; y: number };

/**
 * A bolt of lightning, made by splitting a straight line again and again and pushing each new middle
 * sideways by less than the last: the zigzag every real one has, different each time, and the same
 * for the same seed, so a test can hold it to its word.
 */
export function boltPoints(seed: number, from: Pt, to: Pt, roughness = 0.2, depth = 5): Pt[] {
  const rng = mulberry32(seed);
  let points: Pt[] = [from, to];
  let push = Math.hypot(to.x - from.x, to.y - from.y) * roughness;
  for (let d = 0; d < depth; d++) {
    const next: Pt[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const shove = (rng() - 0.5) * 2 * push;
      next.push(a, { x: (a.x + b.x) / 2 + (-dy / len) * shove, y: (a.y + b.y) / 2 + (dx / len) * shove });
    }
    next.push(points[points.length - 1]);
    points = next;
    push *= 0.55;
  }
  return points;
}

export const toPath = (points: Pt[]) => points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

/** Keeps a bolt inside the sky it is drawn in: the sideways shoves can carry a point a little past the edge. */
const within = (points: Pt[], width: number, height: number): Pt[] => points.map((p) => ({ x: Math.min(width, Math.max(0, p.x)), y: Math.min(height, Math.max(0, p.y)) }));

export type Bolt = { main: string; forks: string[] };

/** A bolt from the top of a `width` × `height` sky, with two or three forks off its lower half. */
export function makeBolt(seed: number, width: number, height: number): Bolt {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const x = width * (0.18 + rng() * 0.64);
  const main = within(boltPoints(seed, { x, y: 0 }, { x: x + (rng() - 0.5) * width * 0.28, y: height }), width, height);
  const forks: string[] = [];
  const count = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < count; i++) {
    const at = main[Math.floor(main.length * (0.35 + rng() * 0.5))];
    const side = rng() < 0.5 ? -1 : 1;
    const to = { x: at.x + side * width * (0.1 + rng() * 0.16), y: Math.min(height, at.y + height * (0.14 + rng() * 0.2)) };
    forks.push(toPath(within(boltPoints(seed + 17 * (i + 1), at, to, 0.26, 4), width, height)));
  }
  return { main: toPath(main), forks };
}

/** Milliseconds until the next strike: not a rhythm, but never long enough to forget the storm. */
export function nextStrikeMs(random: () => number): number {
  return Math.round(3400 + random() * 4600);
}

/** How long after a strike its thunder arrives: farther lightning, longer wait. */
export function thunderDelayMs(random: () => number): number {
  return Math.round(350 + random() * 900);
}
