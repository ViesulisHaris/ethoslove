/**
 * Throwing the cap. A cheer gives a 0..1 power; the rest is a thrown object — up, over,
 * and back down to the same spot, turning over itself on the way.
 */

/** Even the politest cheer that counts still gets the cap properly airborne. */
export const MIN_THROW = 0.32;
/** What the "throw it" button does: one good, solid throw, the same every time. */
export const TAP_THROW = 0.72;
/** The shortest and longest the cap can be in the air, in milliseconds. */
const SHORTEST = 980;
const LONGEST = 1880;

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** The throw a cheer of this size buys. */
export function throwFrom(power: number): number {
  return MIN_THROW + (1 - MIN_THROW) * clamp01(power);
}

/** How high it goes, as a fraction of the way from the plinth to the top of the sky. */
export function apexFor(power: number): number {
  return 0.4 + 0.6 * clamp01(power);
}

/** How long it is up there. */
export function flightMs(power: number): number {
  return SHORTEST + (LONGEST - SHORTEST) * clamp01(power);
}

/** Whole turns, so it always lands flat side up. */
export function spinTurns(power: number): number {
  return 1 + Math.round(2 * clamp01(power));
}

export type CapAt = {
  /** 0 at the throw, 1 when it is back in your hands. */
  phase: number;
  /** 0 on the plinth, up to `apexFor(power)` at the top. */
  rise: number;
  /** Degrees turned so far. */
  spin: number;
  /** A gentle lean out and back, -1..1, so it is not a lift shaft. */
  drift: number;
  done: boolean;
};

/** Where the cap is, `elapsed` milliseconds after a throw of this power. */
export function capAt(power: number, elapsed: number): CapAt {
  const p = clamp01(power);
  const duration = flightMs(p);
  const phase = clamp01(Number.isFinite(elapsed) ? elapsed / duration : 1);
  return {
    phase,
    // A thrown thing rises and falls the same way: symmetrical, fastest at the start.
    rise: apexFor(p) * 4 * phase * (1 - phase),
    spin: spinTurns(p) * 360 * phase,
    drift: Math.sin(phase * Math.PI) * (0.35 + 0.65 * p),
    done: phase >= 1,
  };
}
