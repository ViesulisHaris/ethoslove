export type Pt = { readonly x: number; readonly y: number };

/** How near a finger has to pass to a hook for a bulb to go up on it, in stage units. */
export const REACH = 5.5;
/** A tap, with no drag, reaches further. */
export const TAP_REACH = 10;
/** How many bulbs one press of the keyboard hangs. */
export const PER_KEY = 8;

/** The hooks a finger at `p` is near enough to that have no bulb yet. */
export function hooksNear(p: Pt, hooks: readonly (readonly [number, number])[], hung: ReadonlySet<number>, reach = REACH): number[] {
  const out: number[] = [];
  hooks.forEach(([x, y], i) => {
    if (!hung.has(i) && Math.hypot(x - p.x, y - p.y) <= reach) out.push(i);
  });
  return out;
}

/** The next `count` hooks without a bulb, in the string's order. */
export function nextHooks(total: number, hung: ReadonlySet<number>, count = PER_KEY): number[] {
  const out: number[] = [];
  for (let i = 0; i < total && out.length < count; i++) if (!hung.has(i)) out.push(i);
  return out;
}

/**
 * The lengths of wire that show: between two neighbouring bulbs once both are up. `breaks` are the
 * indexes where one string ends and the next begins (the gable's, then the porch's).
 */
export function wires(total: number, hung: ReadonlySet<number>, breaks: readonly number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < total; i++) if (!breaks.includes(i + 1) && hung.has(i) && hung.has(i + 1)) out.push([i, i + 1]);
  return out;
}
