/**
 * Knocking the phone, the way you touch two glasses together.
 *
 * A knock is one sharp bump on a phone that was still a moment before it: the jump in
 * acceleration between two readings is big, and the background jitter just before it was small.
 * That second half is what matters. A room full of dancing, a bus over cobbles or a phone being
 * waved about all keep the background high, so none of them ever count as a clink — you have to
 * hold the phone steady and tap it, which is exactly the gesture.
 */

/** The jump in acceleration, in m/s² between readings, that counts as a knock. */
export const KNOCK_JERK = 6;
/** How much the phone may already be jittering, in the same units, for a bump to count. */
export const CALM_CEILING = 2.2;
/** Two knocks closer together than this are one knock. */
export const REFRACTORY_MS = 340;
/** Small bumps below this aren't worth showing on the meter. */
export const BUMP_FLOOR = 1.2;
/**
 * Readings to listen to before anything can count. A fifth of a second nobody notices, and
 * without it a phone that was already being jostled when the glasses filled would clink itself
 * on the very first reading, before there is any background to compare against.
 */
export const WARMUP = 12;
/** How quickly the background jitter follows what's happening: a little under a tenth of a second. */
const SETTLE = 0.14;

export type KnockState = {
  /** The background jitter, as a running average of recent jumps. */
  ema: number;
  /** The previous reading's strength, or null before the first one. */
  lastMag: number | null;
  lastKnockAt: number;
  /** Readings seen so far, capped once it is past the warm-up. */
  samples: number;
};

export type KnockStep = {
  state: KnockState;
  /** This reading was a clink. */
  knocked: boolean;
  /** 0..1.4 of the threshold, for the meter. 0 below the floor. */
  strength: number;
  /** Sharp enough, but the phone was already being shaken about — worth saying so. */
  tooBusy: boolean;
};

export function newKnock(): KnockState {
  return { ema: 0, lastMag: null, lastKnockAt: 0, samples: 0 };
}

/**
 * Is there anything in this reading? A laptop with no accelerometer still fires `devicemotion`,
 * with every axis null. Counting those as readings would make the gift tell someone to knock a
 * machine that cannot feel it, so they are dropped and the button stays the honest way through.
 */
export function hasReading(x: unknown, y: unknown, z: unknown): boolean {
  return [x, y, z].some((v) => typeof v === "number" && Number.isFinite(v));
}

/** The strength of one acceleration reading: how far it is from standing still. */
export function magnitude(x: number | null | undefined, y: number | null | undefined, z: number | null | undefined): number {
  const a = Number.isFinite(x) ? (x as number) : 0;
  const b = Number.isFinite(y) ? (y as number) : 0;
  const c = Number.isFinite(z) ? (z as number) : 0;
  return Math.hypot(a, b, c);
}

/** One reading in, the next state out. Pure, so the rule is the thing under test. */
export function stepKnock(state: KnockState, mag: number, at: number): KnockStep {
  if (!Number.isFinite(mag) || !Number.isFinite(at)) {
    return { state, knocked: false, strength: 0, tooBusy: false };
  }
  if (state.lastMag === null) {
    return { state: { ...state, lastMag: mag, samples: 1 }, knocked: false, strength: 0, tooBusy: false };
  }

  const jerk = Math.abs(mag - state.lastMag);
  const listened = state.samples >= WARMUP;
  const sharp = jerk >= KNOCK_JERK;
  const calm = state.ema <= CALM_CEILING;
  const rested = at - state.lastKnockAt >= REFRACTORY_MS;
  const knocked = listened && sharp && calm && rested;

  return {
    state: {
      // The background follows the jitter, so a phone being shaken stays "busy" between bumps.
      ema: state.ema + (jerk - state.ema) * SETTLE,
      lastMag: mag,
      lastKnockAt: knocked ? at : state.lastKnockAt,
      samples: Math.min(WARMUP, state.samples + 1),
    },
    knocked,
    strength: jerk < BUMP_FLOOR ? 0 : Math.min(1.4, jerk / KNOCK_JERK),
    tooBusy: listened && sharp && !calm,
  };
}
