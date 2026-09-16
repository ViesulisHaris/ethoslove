/**
 * Tipping the bottle. The phone's roll (the `gamma` of a device-orientation reading, in degrees)
 * is how far the bottle is tipped: upright at rest, pouring once it passes the floor, flat out
 * near the full angle. The floor is what keeps a phone lying in someone's lap, or jogging along on
 * a train, from quietly filling the glasses on its own.
 *
 * Levelling the phone off while the glasses are full is what finishes the pour. Keep tipping past
 * the brim and it goes over the side, which is funny rather than fatal: there is still wine in the
 * glasses and they can pour again.
 *
 * One bottle fills one glass at a time, so `level` counts glassfuls across the pair rather than the
 * height of either: the near glass fills first, the bottle crosses, then the far one. `glassesAt`
 * in `art.tsx` turns that one number back into two wine lines and the bottle's place above them.
 */

/** Below this roll, in degrees, the bottle is upright and nothing comes out. */
export const TILT_FLOOR = 14;
/** At this roll the bottle is emptying as fast as it can. */
export const TILT_FULL = 52;
/** Level enough to stop the pour, in degrees either side of flat. */
export const LEVEL_MAX = 9;
/**
 * Glassfuls per second at full tilt, counted across both glasses — a little over two seconds to
 * pour the pair, which is about a second each plus the moment the bottle moves between them.
 */
export const TOP_RATE = 0.42;
/** Both full enough to drink. The second glass stands a shade under the first, as it would. */
export const POUR_FULL = 0.96;
/** Past the brim, and over the side. */
export const SPILL_AT = 1.16;
/** What is left after a spill: the first glass still stands, the second lost most of it. */
export const AFTER_SPILL = 0.72;
/** Nothing rises faster than this, however long a frame takes. */
const MAX_STEP_S = 0.1;

/** The fallback button pours at a steady, sensible angle — the same code path as a real tilt. */
export const BUTTON_TILT = 44;

export type PourStatus = "empty" | "pouring" | "part" | "full" | "brimming" | "spilled";

/** How fast the bottle is running, in glassfuls per second. */
export function pourRate(angle: number): number {
  if (!Number.isFinite(angle)) return 0;
  const tipped = Math.min(90, Math.abs(angle));
  if (tipped <= TILT_FLOOR) return 0;
  const eased = Math.min(1, (tipped - TILT_FLOOR) / (TILT_FULL - TILT_FLOOR));
  return eased * TOP_RATE;
}

/** Is the phone flat enough to have stopped pouring? */
export function isLevel(angle: number): boolean {
  if (!Number.isFinite(angle)) return true;
  return Math.abs(angle) <= LEVEL_MAX;
}

/** How high the wine stands after `dt` seconds at this angle. Never sinks, never runs away. */
export function fill(level: number, angle: number, dt: number): number {
  const from = Number.isFinite(level) ? Math.max(0, level) : 0;
  const step = Number.isFinite(dt) ? Math.min(MAX_STEP_S, Math.max(0, dt)) : 0;
  return Math.min(1.3, from + pourRate(angle) * step);
}

/** What the glasses look like right now, which is also what the prompt says. */
export function pourStatus(level: number, angle: number): PourStatus {
  const at = Number.isFinite(level) ? Math.max(0, level) : 0;
  if (at >= SPILL_AT) return "spilled";
  if (at > 1) return "brimming";
  if (at >= POUR_FULL) return "full";
  if (pourRate(angle) > 0) return "pouring";
  return at <= 0.02 ? "empty" : "part";
}

/** Poured: full to the mark, not over it, and the phone brought back level. */
export function settled(level: number, angle: number): boolean {
  const at = Number.isFinite(level) ? level : 0;
  return at >= POUR_FULL && at < SPILL_AT && isLevel(angle);
}

/** Upright, and as far over as it ever goes: the bottle's two ends, in degrees. */
export const BOTTLE_REST = 4;
export const BOTTLE_OVER = 62;

/**
 * How far the bottle leans on screen for a phone rolled this far — always as a positive amount,
 * because which way it leans is which glass it is filling, and only the scene knows that.
 */
export function bottleAngle(angle: number): number {
  const roll = Number.isFinite(angle) ? Math.abs(angle) : 0;
  return Math.min(BOTTLE_OVER, BOTTLE_REST + roll * 1.32);
}
