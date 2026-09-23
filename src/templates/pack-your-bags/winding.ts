/**
 * The little paths drawn on the tickets, and how things travel along them: the plane's dotted arc,
 * the train's line, and the road trip's winding road with a pin at every stop. Points are in the
 * drawing's own viewBox units; a path is sampled once into a polyline with running lengths, so
 * finding where the car is at any moment is a lookup, not a curve evaluation per frame.
 */

export type Pt = { x: number; y: number };
export type Track = { pts: Pt[]; lens: number[]; total: number };

export function track(pts: Pt[]): Track {
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, lens, total: lens[lens.length - 1] ?? 0 };
}

/** Where along the track `d` units from its start falls, and which way it faces there (degrees). */
export function pointAt(t: Track, d: number): Pt & { angle: number } {
  const { pts, lens } = t;
  if (pts.length < 2) return { ...(pts[0] ?? { x: 0, y: 0 }), angle: 0 };
  const at = Math.min(Math.max(d, 0), t.total);
  let lo = 0;
  let hi = lens.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (lens[mid] <= at) lo = mid;
    else hi = mid;
  }
  const a = pts[lo];
  const b = pts[hi];
  const span = lens[hi] - lens[lo] || 1;
  const k = (at - lens[lo]) / span;
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
}

/** A quadratic curve from `a` to `b`, pulled towards `c`. */
export function quadPoints(a: Pt, c: Pt, b: Pt, steps = 40): Pt[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
  });
}

/** The SVG path of a sampled track. */
export const pathOf = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join("");

/** The road's box on the pass. */
export const ROAD_VIEW = { w: 100, h: 60 } as const;

/**
 * Where the pins go, start to destination: left to right across the box, swinging up and down so
 * the road has to wind between them and every name has room above or below its pin.
 */
export function roadPins(count: number): Pt[] {
  const n = Math.max(2, count);
  const low = [46, 43, 48];
  const high = [17, 21, 15];
  return Array.from({ length: n }, (_, i) => ({
    x: 10 + (i * 80) / (n - 1),
    y: i % 2 === 0 ? low[(i / 2) % low.length] : high[((i - 1) / 2) % high.length],
  }));
}

/**
 * A smooth road through every pin (Catmull-Rom), and how far along it each pin is. The road leaves
 * and arrives a little sideways, so it reads as a road and not a zigzag.
 */
export function roadThrough(pins: Pt[], steps = 18): { track: Track; pinAt: number[] } {
  if (pins.length < 2) return { track: track(pins), pinAt: pins.map(() => 0) };
  const lead = { x: pins[0].x - 12, y: pins[0].y + 2 };
  const tail = { x: pins[pins.length - 1].x + 12, y: pins[pins.length - 1].y - 2 };
  const all = [lead, ...pins, tail];
  const pts: Pt[] = [];
  const pinIndex: number[] = [];
  for (let i = 1; i < all.length - 2; i++) {
    const [p0, p1, p2, p3] = [all[i - 1], all[i], all[i + 1], all[i + 2]];
    pinIndex.push(pts.length);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      pts.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  pinIndex.push(pts.length);
  pts.push(pins[pins.length - 1]);
  const t = track(pts);
  return { track: t, pinAt: pinIndex.map((i) => t.lens[i]) };
}

/** The longer line of a name broken onto two between words, in letters: "Greve in Chianti" is 8. */
export function twoLineChars(name: string): number {
  const words = name.trim().split(/\s+/);
  let best = Array.from(name.trim()).length;
  for (let k = 1; k < words.length; k++) {
    const first = Array.from(words.slice(0, k).join(" ")).length;
    const rest = Array.from(words.slice(k).join(" ")).length;
    best = Math.min(best, Math.max(first, rest));
  }
  return best;
}

/**
 * How wide each pin's name may be, in the map's width units, so no two names on the same side of
 * the road run into each other: with five long stops they would. `want` is a name's width on one
 * line, `need` its width wrapped onto two, and `lean` how much of it reaches left of its pin (the
 * first name hangs right, the last left). A pair that fits keeps its widths; one that doesn't
 * narrows both together toward two lines, and only past that shares the gap in proportion.
 */
export function labelRoom(pins: Pt[], above: boolean[], want: number[], need: number[], lean: number[], gap = 2): number[] {
  const room = [...want];
  pins.forEach((pin, i) => {
    const j = pins.findIndex((_, k) => k > i && above[k] === above[i]);
    if (j < 0) return;
    const free = Math.max(0, pins[j].x - pin.x - gap);
    const reach = (a: number, b: number) => (1 - lean[i]) * a + lean[j] * b;
    const wide = reach(room[i], room[j]);
    if (wide <= free) return;
    const lo = [Math.min(need[i], room[i]), Math.min(need[j], room[j])];
    const narrow = reach(lo[0], lo[1]);
    if (narrow >= free) {
      const share = narrow ? free / narrow : 0;
      room[i] = lo[0] * share;
      room[j] = lo[1] * share;
      return;
    }
    const t = (free - narrow) / (wide - narrow);
    room[i] = lo[0] + (room[i] - lo[0]) * t;
    room[j] = lo[1] + (room[j] - lo[1]) * t;
  });
  return room;
}

/** One stretch of the drive: from `d0` to `d1` along the road between `t0` and `t1` seconds. */
export type Leg = { t0: number; t1: number; d0: number; d1: number };

/**
 * The car's timetable: it drives from pin to pin, eases into each stop, waits there a moment,
 * and sets off again. Longer stretches take longer, but never so long that the drive drags.
 */
export function driveLegs(pinAt: number[], { perUnit = 0.02, minLeg = 0.7, maxLeg = 1.6, pause = 0.45, delay = 0 } = {}): Leg[] {
  const legs: Leg[] = [];
  let t = delay;
  for (let i = 1; i < pinAt.length; i++) {
    const d0 = pinAt[i - 1];
    const d1 = pinAt[i];
    const length = Math.min(maxLeg, Math.max(minLeg, (d1 - d0) * perUnit));
    legs.push({ t0: t, t1: t + length, d0, d1 });
    t += length + pause;
  }
  return legs;
}

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

/** How far along the road the car is `t` seconds into its timetable. */
export function distanceAt(legs: Leg[], t: number): number {
  if (!legs.length) return 0;
  if (t <= legs[0].t0) return legs[0].d0;
  for (const leg of legs) {
    if (t < leg.t0) return leg.d0;
    if (t <= leg.t1) return leg.d0 + (leg.d1 - leg.d0) * easeInOut((t - leg.t0) / (leg.t1 - leg.t0 || 1));
  }
  return legs[legs.length - 1].d1;
}

/** When the timetable is done: the car has reached the last pin. */
export const legsEnd = (legs: Leg[]) => (legs.length ? legs[legs.length - 1].t1 : 0);
