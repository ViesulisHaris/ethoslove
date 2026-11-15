export type Pt = { readonly x: number; readonly y: number };

/** The sweets that can be stuck on, by the names of their pictures (scripts/art/holiday/gingerbread.py). */
export const SWEETS = ["gumdrop-red", "gumdrop-green", "peppermint", "button", "star", "heart", "cane"] as const;
export type Sweet = (typeof SWEETS)[number];
export type Tool = Sweet | "icing";

/** One thing done to the house: a sweet stuck on it, or a line of icing piped along it. */
export type Mark = { readonly kind: "sweet"; readonly sweet: Sweet; readonly at: Pt; readonly turn: number } | { readonly kind: "icing"; readonly path: readonly Pt[] };

/** How many marks the house needs before its door will open. */
export const ENOUGH = 6;
/** How far a finger has to travel before the next sweet goes on, when one is dragged along. */
export const SPACING = 7;

/** Whether a point is inside a shape given by its corners in order. */
export function inside(p: Pt, shape: readonly Pt[]): boolean {
  let hit = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const a = shape[i];
    const b = shape[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/**
 * A house decorated without a finger, for the keyboard and for the still pictures: gumdrops down
 * both edges of the roof, a star under the peak, a peppermint either side of the door, a heart
 * over it, and a scalloped line of icing along the foot of the wall. `c` is the house's corners.
 */
export function readyMade(c: { bl: Pt; br: Pt; tl: Pt; tr: Pt; peak: Pt; doorTop: Pt }): Mark[] {
  const marks: Mark[] = [];
  const down = (p: Pt, by: number): Pt => ({ x: p.x, y: p.y + by });
  for (const [from, sweet] of [
    [c.tl, "gumdrop-red"],
    [c.tr, "gumdrop-green"],
  ] as const)
    for (const t of [0.22, 0.5, 0.78]) marks.push({ kind: "sweet", sweet, at: down(lerp(from, c.peak, t), 7), turn: 0 });
  marks.push({ kind: "sweet", sweet: "star", at: down(c.peak, 13), turn: 0 });
  const mid = (c.bl.y + c.tl.y) / 2;
  marks.push({ kind: "sweet", sweet: "peppermint", at: { x: lerp(c.bl, c.br, 0.2).x, y: mid }, turn: 0 });
  marks.push({ kind: "sweet", sweet: "peppermint", at: { x: lerp(c.bl, c.br, 0.8).x, y: mid }, turn: 0 });
  marks.push({ kind: "sweet", sweet: "heart", at: down(c.doorTop, -5), turn: 0 });
  const wave: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const p = lerp(c.bl, c.br, 0.06 + (0.88 * i) / 24);
    wave.push({ x: p.x, y: p.y - 4 - 1.6 * Math.abs(Math.sin((i / 24) * Math.PI * 6)) });
  }
  marks.push({ kind: "icing", path: wave });
  return marks;
}
