/**
 * Turning a tilted phone into an ingredient in the bowl.
 *
 * The jar tips with the phone, but nothing comes out until the tilt is really held: a pothole,
 * a jolt on the bus or a phone put down on the table all spike for a moment and stop, and a
 * moment is shorter than `STEADY_MS`. Levelling the phone stops the pour and keeps what's in.
 * Stirring works the same way: one knock is an accident, several inside `STIR_WINDOW_MS` is a
 * pair of hands shaking a bowl.
 */

/** Under this angle the jar is level enough that nothing comes out. */
export const TILT_FLOOR = 18;
/** Past this the phone is being tipped on purpose, so the prompt starts encouraging it. */
export const TILT_NUDGE = 7;
/** At this angle the jar is right over and pouring as fast as it can. */
export const TILT_FULL = 55;
/** How far the jar itself tips on screen, so it answers the phone long before it pours. */
export const MAX_TIP = 66;
/** The tilt has to be held this long before the first grain falls. */
export const STEADY_MS = 260;
/** Seconds of full pouring to empty one jar. */
export const POUR_SECONDS = 1.5;
/** Most ingredients one recipe can ask for; each one is a jar to pour. */
export const MAX_INGREDIENTS = 6;

/** Two shakes further apart than this are two accidents, not stirring. */
export const STIR_WINDOW_MS = 900;
/** How much of the stir one counted shake is worth. */
export const STIR_PER_SHAKE = 0.11;
/** And one press of the stir button, so the fallback takes about as long as shaking does. */
export const STIR_PER_TAP = 0.26;

export type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The phone's sideways tilt in degrees, positive tipping one way and negative the other.
 * Anything the sensor can't tell us reads as level.
 */
export function pourTilt(reading: { gamma?: number | null }): number {
  const gamma = reading.gamma;
  if (typeof gamma !== "number" || !Number.isFinite(gamma)) return 0;
  return clamp(gamma, -90, 90);
}

/** How fast it pours at that angle: nothing at all until the floor, then eased up to full. */
export function rateFor(tiltDeg: number): number {
  const magnitude = Math.abs(tiltDeg);
  if (!Number.isFinite(magnitude) || magnitude <= TILT_FLOOR) return 0;
  const t = Math.min(1, (magnitude - TILT_FLOOR) / (TILT_FULL - TILT_FLOOR));
  return t * t * (3 - 2 * t);
}

/** How far the jar leans on screen at that angle — it answers every degree, floor or no floor. */
export function tipFor(tiltDeg: number): number {
  if (!Number.isFinite(tiltDeg)) return 0;
  return clamp(Math.abs(tiltDeg) * 1.35, 0, MAX_TIP);
}

export type Pour = {
  /** Milliseconds the tilt has been past the floor without a break. */
  held: number;
  /** How much of this ingredient is in the bowl, 0..1. */
  filled: number;
  /** What's coming out right now, 0..1 — the stream, and the meter. */
  rate: number;
};

export const IDLE_POUR: Pour = { held: 0, filled: 0, rate: 0 };

/** One frame of pouring. `dt` is seconds; the caller clamps it so a background tab can't dump a jar. */
export function advancePour(state: Pour, tiltDeg: number, dt: number): Pour {
  const step = Math.max(0, Math.min(0.05, dt));
  const rate = rateFor(tiltDeg);
  if (rate <= 0) return { held: 0, filled: state.filled, rate: 0 };
  const held = state.held + step * 1000;
  // Still inside the jolt window: the jar is tipping, but nothing has come out yet.
  if (held < STEADY_MS) return { held, filled: state.filled, rate: 0 };
  return { held, filled: Math.min(1, state.filled + (rate * step) / POUR_SECONDS), rate };
}

export function pourDone(state: Pour): boolean {
  return state.filled >= 1;
}

/** What the plaque above the bowl should be saying, given the angle and what's already fallen. */
export type PourPrompt = "idle" | "more" | "holding" | "pouring";

export function promptFor(tiltDeg: number, state: Pour): PourPrompt {
  if (state.rate > 0) return "pouring";
  if (state.held > 0) return "holding";
  return Number.isFinite(tiltDeg) && Math.abs(tiltDeg) > TILT_NUDGE ? "more" : "idle";
}

/** Two readings closer together than this are one jolt read twice, not two shakes. */
export const SHAKE_GAP_MS = 90;
/** How hard the phone has to change direction before it counts as a shake at all. */
export const SHAKE_FORCE = 16;

/** One reading off the accelerometer, gravity included, with the moment it arrived. */
export type Motion = { x: number; y: number; z: number; t: number };

export const IDLE_MOTION: Motion = { x: 0, y: 0, z: 0, t: 0 };

/**
 * Is this reading a shake? Only if it is far enough from the one before it and not so close in
 * time that it is the same movement twice. The first reading only gives us something to compare
 * against — a phone picked up off a table is not stirring.
 */
export function readShake(last: Motion, now: Motion): { last: Motion; shook: boolean } {
  if (last.t !== 0 && now.t - last.t < SHAKE_GAP_MS) return { last, shook: false };
  const force = Math.abs(now.x - last.x) + Math.abs(now.y - last.y) + Math.abs(now.z - last.z);
  return { last: now, shook: last.t !== 0 && force > SHAKE_FORCE };
}

export type Stir = {
  /** When the last shake arrived. */
  last: number;
  /** Shakes in a row, close enough together to be one pair of hands. */
  combo: number;
  progress: number;
};

export const IDLE_STIR: Stir = { last: 0, combo: 0, progress: 0 };

/** A shake. The first one only arms the stir; after that every one inside the window counts. */
export function shakeStir(state: Stir, nowMs: number): Stir {
  const gap = state.combo > 0 ? nowMs - state.last : Infinity;
  if (gap < 0 || gap > STIR_WINDOW_MS) return { last: nowMs, combo: 1, progress: state.progress };
  return {
    last: nowMs,
    combo: state.combo + 1,
    progress: Math.min(1, state.progress + STIR_PER_SHAKE),
  };
}

/** The button under it, for a phone that can't feel a shake. Every press counts. */
export function tapStir(state: Stir): Stir {
  return { ...state, progress: Math.min(1, state.progress + STIR_PER_TAP) };
}

export function stirDone(state: Stir): boolean {
  return state.progress >= 1;
}

/**
 * Where a point on the jar ends up once the jar is tipped `deg` towards the bowl.
 * Screen coordinates, so y grows downwards and a positive angle tips to the left.
 */
export function tipPoint(pivot: Point, local: Point, deg: number): Point {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return {
    x: pivot.x + local.x * cos + local.y * sin,
    y: pivot.y - local.x * sin + local.y * cos,
  };
}

/** The sender's lines, tidied: blanks dropped, never more jars than one recipe can hold. */
export function ingredientLines(written: readonly string[] | undefined, fallback: readonly string[]): string[] {
  const clean = (written ?? []).map((line) => line.trim()).filter(Boolean).slice(0, MAX_INGREDIENTS);
  return clean.length ? clean : fallback.slice(0, MAX_INGREDIENTS).map((line) => line.trim());
}

/**
 * Where each written line sits on the card: the block is centred in the space the card has,
 * and the lines close up as more of them go in, so one ingredient and six both look deliberate.
 */
export function cardSlots(count: number, top: number, bottom: number, maxSlot = 9.5): { top: number; slot: number; font: number } {
  const n = Math.max(1, count);
  const room = Math.max(0, bottom - top);
  const slot = Math.min(maxSlot, room / n);
  return { top: top + (room - slot * n) / 2, slot, font: clamp(slot * 0.44, 2.9, 4.1) };
}
