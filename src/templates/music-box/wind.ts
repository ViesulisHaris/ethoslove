/**
 * Winding the key, as arithmetic. A finger circling the key is read as the angle it makes round the
 * key's axle, frame to frame; a key only winds one way, so the first clear direction the finger
 * takes becomes the way it winds and turning back does nothing, like the ratchet inside. A press of
 * a key on the keyboard, or a thumb held still on it, wind it too.
 */
export const FULL = Math.PI * 2;
/** Turns of the key before the spring is wound. */
export const TURNS = 3;
export const WOUND = TURNS * FULL;
/** The ratchet catches every twelfth of a turn, and that is a click. */
export const CLICK_STEP = FULL / 12;
/** One press of Enter, Space or an arrow: a quarter turn. */
export const KEY_STEP = FULL / 4;
/** A thumb held on the key winds it at this many radians a second. */
export const HOLD_RATE = FULL * 0.8;
/** How far a finger has to go one way before that way counts as winding (radians). */
const COMMIT = 0.3;
/** More than this between two readings is the finger jumping, not turning. */
const JUMP = 1.4;

export type Wind = {
  /** How far it has been wound, in radians, 0 to WOUND. */
  wound: number;
  /** The way it winds, once a finger has shown it: 1 clockwise on screen, -1 anticlockwise. */
  dir: 1 | -1 | 0;
  /** Where the finger was last, round the axle, or null between drags. */
  last: number | null;
  /** Movement before the way was known: it counts once it is. */
  pending: number;
};

export const WIND_START: Wind = { wound: 0, dir: 0, last: null, pending: 0 };

/** An angle folded into (-π, π]. */
export function fold(angle: number): number {
  let a = angle % FULL;
  if (a > Math.PI) a -= FULL;
  if (a <= -Math.PI) a += FULL;
  return a;
}

const capped = (wound: number): number => Math.min(WOUND, Math.max(0, wound));

/** The finger is now at `angle` round the axle (screen radians, y down, so positive is clockwise). */
export function drag(state: Wind, angle: number): Wind {
  if (state.last === null) return { ...state, last: angle };
  const step = fold(angle - state.last);
  if (Math.abs(step) > JUMP) return { ...state, last: angle };
  if (state.dir === 0) {
    const pending = state.pending + step;
    if (Math.abs(pending) < COMMIT) return { ...state, last: angle, pending };
    return { wound: capped(state.wound + Math.abs(pending)), dir: pending > 0 ? 1 : -1, last: angle, pending: 0 };
  }
  const gain = Math.sign(step) === state.dir ? Math.abs(step) : 0;
  return { ...state, wound: capped(state.wound + gain), last: angle };
}

/** The finger came off: the next touch starts a new reading, but the way it winds is kept. */
export const lift = (state: Wind): Wind => ({ ...state, last: null, pending: 0 });

/** Wound a little further without a drag: a key press or a held thumb. */
export const nudge = (state: Wind, by: number): Wind => ({ ...state, wound: capped(state.wound + by) });

/** Whole turns so far. */
export const turnsOf = (wound: number): number => Math.floor(wound / FULL + 1e-9);

/** Ratchet clicks so far. */
export const clicksOf = (wound: number): number => Math.floor(wound / CLICK_STEP + 1e-9);

export const isWound = (state: Wind): boolean => state.wound >= WOUND - 1e-9;
