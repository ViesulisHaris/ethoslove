import { ANCHORS } from "./art-map";

/** How many slices the pie is cut into: the Blender scene's SLICES. */
export const SLICES = 6;

/** Which slices are out of the tin, in the order they came out, and how many ingredients are on the card. */
export type Pie = { readonly taken: readonly number[]; readonly written: number };

type Spot = { readonly x: number; readonly y: number };
const spot = (name: string): Spot => (ANCHORS as unknown as Record<string, Spot>)[name] ?? { x: 50, y: 85 };

/** How far a slice travels as it comes out: most of the way to where the map says it is going, in stage units. */
const OUT = 0.7;

/** A slice's middle on the stage, and the move that takes it out of the tin. */
export function sliceAt(i: number) {
  const from = spot(`slice${i}`);
  const to = spot(`slice${i}Out`);
  return { x: from.x, y: from.y, dx: (to.x - from.x) * OUT, dy: (to.y - from.y) * OUT };
}

/**
 * The slice under a point of the pie's square, given as -1..1 across and down it. The first slice
 * starts at twelve o'clock and they go round anticlockwise, as the scene cut them. A slice already
 * out gives way to the nearest one still in the tin; with none left, -1.
 */
export function pickSlice(dx: number, dy: number, taken: readonly number[]): number {
  const angle = Math.atan2(-dy, dx) - Math.PI / 2;
  const turn = (((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) / ((2 * Math.PI) / SLICES);
  const left = Array.from({ length: SLICES }, (_, i) => i).filter((i) => !taken.includes(i));
  if (!left.length) return -1;
  const around = (i: number) => {
    const d = Math.abs(i + 0.5 - turn) % SLICES;
    return Math.min(d, SLICES - d);
  };
  return left.reduce((best, i) => (around(i) < around(best) ? i : best), left[0]);
}

/**
 * Takes slice `index` out (any slice left, if that one is gone or the index is -1). While there are
 * ingredients still to write, each slice writes one; once they are all on the card, what is left of
 * the pie comes out in one go. Gives back the same pie if there is nothing to take.
 */
export function takeSlice(pie: Pie, index: number, ingredients: number): Pie {
  const left = Array.from({ length: SLICES }, (_, i) => i).filter((i) => !pie.taken.includes(i));
  if (!left.length) return pie;
  if (pie.written >= ingredients) return { taken: [...pie.taken, ...left], written: pie.written };
  const pick = left.includes(index) ? index : left[0];
  return { taken: [...pie.taken, pick], written: pie.written + 1 };
}

/**
 * The part of a picture of the whole pie that is slice `i`, as a CSS clip path: a wedge from the
 * middle out past the crust and its shadow. `rect` is the picture's place on the stage, `centre`
 * and `radius` the pie's, and the round tin is seen `squash` as tall as it is wide.
 */
export function wedgeClip(i: number, rect: { x: number; y: number; w: number; h: number }, centre: Spot, radius: number, squash: number): string {
  const a0 = (2 * Math.PI * i) / SLICES + Math.PI / 2;
  const reach = radius * 1.7;
  const pts = [[centre.x, centre.y]];
  for (let k = 0; k <= 8; k++) {
    const a = a0 + ((2 * Math.PI) / SLICES) * (k / 8);
    pts.push([centre.x + reach * Math.cos(a), centre.y - reach * Math.sin(a) * squash]);
  }
  const share = ([x, y]: number[]) => `${(((x - rect.x) / rect.w) * 100).toFixed(2)}% ${(((y - rect.y) / rect.h) * 100).toFixed(2)}%`;
  return `polygon(${pts.map(share).join(", ")})`;
}
