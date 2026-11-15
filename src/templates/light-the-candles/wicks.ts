/** How many candles stand on the table: the Blender scene's CANDLES. */
export const CANDLES = 5;

export type Pt = { readonly x: number; readonly y: number };

/** How near the match's flame has to come to a wick for it to catch, in stage units. */
export const CATCH = 4.2;
/** How near a tap has to land to a candle to mean that candle. */
export const TAP_REACH = 12;
/** How far above the finger the flame is held, so the finger does not cover it. */
export const HELD_ABOVE = 9;

/** The unlit wick the flame at `p` is touching, or -1. */
export function wickAt(p: Pt, wicks: readonly Pt[], lit: readonly number[], reach = CATCH): number {
  let best = -1;
  let bestD = reach;
  wicks.forEach((w, i) => {
    if (lit.includes(i)) return;
    const d = Math.hypot(w.x - p.x, w.y - p.y);
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

/**
 * The unlit candle a tap at `p` means: the one whose wick, or whose body under it down to the
 * table at `feet`, is nearest, if any is within reach.
 */
export function candleAt(p: Pt, wicks: readonly Pt[], feet: readonly Pt[], lit: readonly number[], reach = TAP_REACH): number {
  let best = -1;
  let bestD = reach;
  wicks.forEach((w, i) => {
    if (lit.includes(i)) return;
    const foot = feet[i] ?? w;
    // the nearest point on the candle, from its wick down to its foot
    const y = Math.min(Math.max(p.y, w.y), foot.y);
    const d = Math.hypot(w.x - p.x, y - p.y);
    if (d <= bestD) {
      best = i;
      bestD = d;
    }
  });
  return best;
}

/** The first candle not yet lit, left to right, or -1. */
export function nextUnlit(lit: readonly number[], count = CANDLES): number {
  for (let i = 0; i < count; i++) if (!lit.includes(i)) return i;
  return -1;
}
