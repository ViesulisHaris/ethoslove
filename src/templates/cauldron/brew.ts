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
