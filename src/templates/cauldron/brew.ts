import { mulberry32 } from "../_shared/random";

/** What the potion does as ingredients go in, and when. Plain arithmetic, so a test can hold it to its word. */
export const MAX_INGREDIENTS = 3;

/** Their ingredients as the pot can take them: trimmed, none empty, at most three; the fallback if they gave none. */
export function ingredientsFor(raw: readonly string[] | undefined, fallback: readonly string[]): string[] {
  const own = (raw ?? []).map((line) => line.trim()).filter(Boolean).slice(0, MAX_INGREDIENTS);
  return own.length ? own : [...fallback].slice(0, MAX_INGREDIENTS);
}

/** The colour of the potion once `level` ingredients are in; a level past the end stays on the last colour. */
export function potionColor<T extends string>(liquid: readonly T[], level: number): T {
  return liquid[Math.max(0, Math.min(liquid.length - 1, level))];
}

/** How many bubbles are rising: a few at rest, and more with each ingredient. */
export const bubblesFor = (level: number) => 5 + Math.max(0, level) * 4;

export type Bubble = { x: number; size: number; delay: number; dur: number; drift: number };

/** The same bubbles every time: where each starts across the surface (0-1), how big, when, how long, how far it drifts. */
export function bubbleSpecs(seed: number, count: number): Bubble[] {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, () => ({ x: 0.14 + rng() * 0.72, size: 0.7 + rng() * 1.5, delay: -rng() * 3.2, dur: 1.5 + rng() * 1.6, drift: (rng() - 0.5) * 3 }));
}

/** The beats after the last ingredient, in milliseconds from it landing. */
export const BOIL = { heart: 900, bottle: 2300 } as const;
/** How long an ingredient flies, and how long its words hang over the pot. */
export const FLY_MS = 820;
export const WORDS_MS = 2600;

/**
 * Where the sounds go, against what the picture does. The ingredient's flight is eased in (it speeds up
 * all the way to the pot), so the rush of air has to build to the landing and stop on it, not fire as
 * the jar lifts; the steam heart draws itself over `HEART_DRAW_MS`, so its glints run as long as the
 * drawing; the bottle springs into place and has reached it (before it overshoots) about
 * `BOTTLE_ARRIVES_MS` after it appears, which is when its bell is struck; and the drops the splash
 * throws up come back down over the following second.
 */
export const RUSH = { delay: 120, ms: FLY_MS - 120, peak: 0.92 } as const;
export const HEART_DRAW_S = 1.3;
export const HEART_DRAW_MS = HEART_DRAW_S * 1000;
export const CHURN_MS = [300, 620] as const;

/** The bottle's spring, as the picture uses it, and how long a spring of that kind takes to first reach where it is going. */
export const BOTTLE_SPRING = { stiffness: 90, damping: 13 } as const;
export function springArrivalMs(stiffness: number, damping: number, mass = 1): number {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta >= 1) return Infinity;
  const wd = w0 * Math.sqrt(1 - zeta * zeta);
  // x(t) = 1 - e^(-zeta w0 t) (cos wd t + (zeta w0 / wd) sin wd t) first crosses 1 where the bracket is zero.
  return Math.round(((Math.PI - Math.atan(wd / (zeta * w0))) / wd) * 1000);
}
export const BOTTLE_ARRIVES_MS = springArrivalMs(BOTTLE_SPRING.stiffness, BOTTLE_SPRING.damping);
