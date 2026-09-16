/**
 * The two physical things this gift asks for, and the rules that keep them honest.
 *
 * A crease takes a steady press, not a tap: while a finger is down the fold creeps forward, and
 * the moment it lifts the paper springs back faster than it folded, so a knocked screen or a
 * hurried tap leaves nothing behind. A breath is the same idea in sound: the microphone hears a
 * café, a train and a television as well as a mouth, so loudness alone never counts.
 *
 * What tells a breath from a room is not how loud it is but how long it holds. Clatter is
 * milliseconds; a breath runs for the better part of a second. So nothing counts until the sound
 * has held steady for `BREATH_MIN_RUN` — and once it has, the whole breath counts, from the
 * moment it started. That one rule does all the work of keeping a café on the table, which leaves
 * the rest free to be kind: a breath buys a pause to take the next one, and what the crane loses
 * after that it loses slowly, because nobody should have to empty their lungs to send it.
 */

/** Seconds of steady pressing one crease takes. */
export const FOLD_SECONDS = 1.15;
/** Let go and the paper opens again this many times faster than it folded. */
export const SPRING_BACK = 3.4;
/** How long each fold that follows on by itself takes, once its press is done. */
export const AUTO_SECONDS = 0.5;

/** Quieter than this is a room, not a mouth. */
export const BREATH_FLOOR = 0.3;
/**
 * The same floor as raw loudness, for the shared detector's own "that was a blow" test, which
 * measures the microphone directly instead of the 0…1 level it reports. Ours is the rule that
 * matters; this only decides when the room's sound is worth waking the music for.
 */
export const BREATH_RMS = 0.1;
/** Louder than this is as much breath as the crane can use. */
export const BREATH_FULL = 0.78;
/** Weaker than this much of a breath is a room talking, and lifts nothing. */
export const LIFT_MIN = 0.24;
/**
 * Seconds a sound must hold, unbroken, before any of it counts. A dropped fork, a laugh, a bar
 * and a passing bus are all loud and all brief; a breath is the only thing on this list that
 * keeps going. Nothing shorter than this ever moves the crane, however loud it was.
 */
export const BREATH_MIN_RUN = 0.28;
/** Seconds of full breath the crane needs before it lifts. */
export const LIFT_SECONDS = 0.95;
/** Seconds of quiet a breath buys, to take the next one. Earned as you blow, never more than this. */
export const LIFT_HOLD = 0.55;
/** Seconds the crane takes to settle back onto the table, once that pause is spent. */
export const LIFT_FADE = 3.4;

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
const at0 = (v: number) => (Number.isFinite(v) ? Math.max(0, v) : 0);
/** A frame the tab slept through must not fold the paper on its own. */
const step = (dt: number) => (Number.isFinite(dt) ? Math.min(0.05, Math.max(0, dt)) : 0);

/** Where a fold has got to after one frame of pressing — or of not pressing. */
export function foldStep(progress: number, holding: boolean, dt: number): number {
  const d = step(dt) / FOLD_SECONDS;
  return clamp01(clamp01(progress) + (holding ? d : -d * SPRING_BACK));
}

/** How much of a breath the microphone is hearing, as 0…1 of all the crane needs. */
export function breathPush(level: number): number {
  if (!Number.isFinite(level)) return 0;
  return clamp01((level - BREATH_FLOOR) / (BREATH_FULL - BREATH_FLOOR));
}

/**
 * Everything the crane remembers between frames.
 *
 * `run` is how long the sound it is hearing has held; `held` is the lift that run has earned but
 * not yet been given, because the sound has not proved itself a breath; `pause` is how much quiet
 * the breath so far has paid for.
 */
export type Breath = { lift: number; run: number; held: number; pause: number };

/** A crane on the table, hearing nothing. */
export const STILL: Breath = { lift: 0, run: 0, held: 0, pause: 0 };

/**
 * Where the crane is after one frame.
 *
 * While a sound holds, it earns lift — set aside at first, handed over in full the moment the
 * sound has run long enough to be a breath. When it stops, the breath's own pause covers the
 * quiet; only past that does the crane start down, and it goes down gently.
 */
export function liftStep(breath: Breath, push: number, dt: number): Breath {
  const from: Breath = {
    lift: clamp01(breath?.lift ?? 0),
    run: at0(breath?.run ?? 0),
    held: at0(breath?.held ?? 0),
    pause: Math.min(LIFT_HOLD, at0(breath?.pause ?? 0)),
  };
  const d = step(dt);
  const p = clamp01(push);
  if (d === 0) return from;

  if (p >= LIFT_MIN) {
    const run = from.run + d;
    const earned = from.held + (p * d) / LIFT_SECONDS;
    const counts = run >= BREATH_MIN_RUN;
    return {
      lift: counts ? clamp01(from.lift + earned) : from.lift,
      run,
      held: counts ? 0 : earned,
      pause: Math.min(LIFT_HOLD, from.pause + d),
    };
  }

  // The sound stopped. Whatever it had earned but not proved is lost, the pause is spent first,
  // and only the quiet left over after that brings the crane down.
  const spent = Math.min(from.pause, d);
  const falling = d - spent;
  return {
    lift: clamp01(from.lift - falling / LIFT_FADE),
    run: 0,
    held: 0,
    pause: from.pause - spent,
  };
}
