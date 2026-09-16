/**
 * What counts as a cheer.
 *
 * The microphone hands us a 0..1 loudness. A cheer is a *burst*: it climbs fast, gets well
 * clear of whatever the room was already doing, and then stays up for a moment. That is what
 * separates it from the three things that must never launch the cap — a quiet room, a steady
 * hum (a fan, traffic, a party in the next room) and one sharp knock (a door, a cough, the
 * phone put down on a table).
 */

export const CHEER = {
  /** Below this loudness it is a quiet room, whatever else happens. */
  floor: 0.3,
  /** How far clear of the room's own noise the burst has to get. */
  jump: 0.14,
  /** The window the burst has to climb inside, in milliseconds. */
  riseMs: 260,
  /**
   * How much it has to climb inside that window. A hum is already up there and never climbs; a
   * room swelling back up after a lull climbs, but slowly. A cheer is the only thing that gets
   * this far this fast, and it has to anyway to clear the floor from a quiet room.
   */
  rise: 0.18,
  /** And then hold, so one knock or cough is not a cheer. */
  holdMs: 140,
  /**
   * The first moments of real sound, spent learning the room. Nothing can count until the whole
   * climb window is past it, or the level rising off zero as the stream opens would read as the
   * biggest cheer of the night. It runs from `silence`, not from the moment the stream opened.
   */
  warmupMs: 350,
  /**
   * Under this, the microphone is not delivering sound yet. A stream can be granted and stay at
   * a flat zero for the best part of a second before any audio flows, and the plateau it then
   * lands on is the room, not a cheer — so the warm-up above only starts once this is cleared.
   * A real microphone's own noise floor sits well over it, so a quiet room wakes it at once.
   */
  silence: 0.004,
  /** One cheer, one throw: the quiet again before another burst can count. */
  cooldownMs: 1200,
  /** How fast the room's own level follows the sound, per second, once it is learnt. */
  followUp: 0.5,
  followDown: 1.5,
  /** While learning, it follows much faster, so a humming room is the room within half a second. */
  settle: 6,
  /** How far over the line counts as flat out. */
  fullExcess: 0.62,
} as const;

export type CheerSample = { t: number; level: number };

export type CheerState = {
  /** When the microphone opened, in the same clock as the samples. */
  startedAt: number | null;
  /** When sound first actually arrived. Every clock below runs from here, not from the open. */
  wokeAt: number | null;
  lastAt: number | null;
  /** The room's own level, learnt as it listens. */
  room: number;
  /** The recent past, none of it older than `riseMs`. */
  window: CheerSample[];
  /** When the burst first cleared the line, or null while nothing is happening. */
  armedAt: number | null;
  /** The loudest the burst has been so far. */
  peak: number;
  /** When the last cheer was called, so one long whoop is not three throws. */
  firedAt: number | null;
};

export type Cheer = { power: number; peak: number };
export type Heard = { state: CheerState; cheer: Cheer | null };

export function openEars(): CheerState {
  return { startedAt: null, wokeAt: null, lastAt: null, room: 0, window: [], armedAt: null, peak: 0, firedAt: null };
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** The loudness a burst has to clear right now: never under the floor, always over the room. */
export function cheerLine(room: number): number {
  return Math.min(0.98, Math.max(CHEER.floor, clamp01(room) + CHEER.jump));
}

/** How hard the noise is pushing the cap right now, 0..1 — the live part, before anything fires. */
export function push(level: number, room: number): number {
  return clamp01((clamp01(level) - clamp01(room)) / 0.5);
}

/** How big that cheer was, 0..1: what decides how high the cap goes. */
export function powerOf(peak: number, room: number): number {
  return clamp01((clamp01(peak) - cheerLine(room)) / CHEER.fullExcess);
}

/**
 * One sample of loudness at time `t` (milliseconds, any origin). Returns the next state and,
 * on the frame the cheer is complete, how big it was.
 */
export function hear(state: CheerState, level: number, t: number): Heard {
  const lv = clamp01(level);
  const awake = lv > CHEER.silence;

  if (state.startedAt === null || state.lastAt === null) {
    // Whatever is already making noise when the microphone opens is the room, not a cheer.
    return {
      state: { startedAt: t, wokeAt: awake ? t : null, lastAt: t, room: lv, window: [{ t, level: lv }], armedAt: null, peak: 0, firedAt: null },
      cheer: null,
    };
  }

  // A stream that has not made a sound yet has taught us nothing, so its clock has not started.
  const wokeAt = state.wokeAt ?? (awake ? t : null);
  const awakeMs = wokeAt === null ? -1 : t - wokeAt;
  const settled = awakeMs >= CHEER.warmupMs;
  const dt = Math.min(0.25, Math.max(0, (t - state.lastAt) / 1000));
  const follow = !settled ? CHEER.settle : lv > state.room ? CHEER.followUp : CHEER.followDown;
  const room = state.room + (lv - state.room) * (1 - Math.exp(-follow * dt));
  const window = [...state.window, { t, level: lv }].filter((s) => t - s.t <= CHEER.riseMs);

  // Nothing arms until the whole climb window is past the warm-up, and not straight after a throw.
  const armable =
    awakeMs >= CHEER.warmupMs + CHEER.riseMs && (state.firedAt === null || t - state.firedAt >= CHEER.cooldownMs);
  const holding = lv >= CHEER.floor && lv - room >= CHEER.jump;
  let armedAt = armable ? state.armedAt : null;
  let peak = armable ? state.peak : 0;

  if (!holding) {
    armedAt = null;
    peak = 0;
  } else if (armable && armedAt === null) {
    const quietest = window.reduce((min, s) => Math.min(min, s.level), lv);
    // Only a climb arms it. A level that was already up there is a hum, and hums do not cheer.
    if (lv - quietest >= CHEER.rise) {
      armedAt = t;
      peak = lv;
    }
  } else if (armedAt !== null) {
    peak = Math.max(peak, lv);
  }

  const fired = armedAt !== null && t - armedAt >= CHEER.holdMs;
  return {
    state: {
      startedAt: state.startedAt,
      wokeAt,
      lastAt: t,
      room,
      window,
      armedAt: fired ? null : armedAt,
      peak: fired ? 0 : peak,
      firedAt: fired ? t : state.firedAt,
    },
    cheer: fired ? { power: powerOf(peak, room), peak } : null,
  };
}
