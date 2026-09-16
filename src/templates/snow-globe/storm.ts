/**
 * Shaking a phone, turned into weather inside a glass globe.
 *
 * A phone reports acceleration constantly: in a pocket, on a bus, on a table next to a
 * speaker. None of that should set the snow off. So one reading never counts for anything —
 * the globe charges only while the movement stays genuinely violent, and the charge drains
 * the moment it stops. A knock is a spike and dies; a train is a rumble under the floor;
 * only a steady three quarters of a second of someone actually shaking their phone fills it.
 */

export type Vec = { x: number; y: number; z: number };

/** Change between two readings (m/s², summed over the axes) that still counts as carrying it. */
export const DEAD_ZONE = 5;
/** The change a deliberate, wrist-from-the-elbow shake produces. */
export const SHAKE_REF = 36;
/**
 * Below this level nothing charges, however long it goes on. Footsteps and a train reach it for
 * a sample or two and fall straight back; only shaking holds it there.
 */
export const SHAKE_FLOOR = 0.34;
/** Seconds of full-strength shaking that fill the globe. */
export const CHARGE_SECONDS = 0.45;
/** The charge is nearly all gone within a third of a second of stopping: it has to be one go. */
export const DRAIN_PER_SECOND = 3;
/** Readings are taken this far apart, so the deltas mean the same thing on every device. */
export const SAMPLE_MS = 60;
/** No reading for this long means the device is still (or asleep). */
export const SAMPLE_STALE_MS = 220;

export const clamp01 = (v: number): number => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

/** How violent one pair of readings is, 0..1. */
export function sampleStrength(now: Vec, prev: Vec): number {
  const delta = Math.abs(now.x - prev.x) + Math.abs(now.y - prev.y) + Math.abs(now.z - prev.z);
  if (!Number.isFinite(delta)) return 0;
  return clamp01((delta - DEAD_ZONE) / (SHAKE_REF - DEAD_ZONE));
}

/** `level` is what the snow reacts to; `charge` is what decides a shake happened. */
export type Storm = { level: number; charge: number };

export const IDLE_STORM: Storm = { level: 0, charge: 0 };

/**
 * One frame of shaking. The level chases the reading — quickly up, slowly down, so the storm
 * keeps its energy between two swings of the same shake — and the charge only grows while the
 * level is above the floor. Below it the charge drains away almost at once, so the shaking has
 * to be one continuous go: a jolt every few steps of a walk adds up to nothing.
 */
export function advanceStorm(storm: Storm, strength: number, dt: number): Storm {
  const step = Math.min(0.1, Math.max(0, dt));
  const target = clamp01(strength);
  const rate = target > storm.level ? 16 : 3.2;
  const level = storm.level + (target - storm.level) * (1 - Math.exp(-step * rate));
  const drive = level > SHAKE_FLOOR ? (level - SHAKE_FLOOR) / (1 - SHAKE_FLOOR) : 0;
  const charge = drive > 0 ? Math.min(1, storm.charge + (drive / CHARGE_SECONDS) * step) : Math.max(0, storm.charge - DRAIN_PER_SECOND * step);
  return { level: clamp01(level), charge };
}

/** Full: the snow flies. */
export function stormReady(storm: Storm): boolean {
  return storm.charge >= 1;
}

/** How long the snow takes to settle again. The harder the shake, the longer the storm. */
export function settleMs(level: number): number {
  return Math.round(1000 + 2100 * clamp01(level));
}

/**
 * The storm's own weather after the shake ends, so the snow keeps flying even when the phone
 * is held still (or was never shaken at all, because they tapped the button instead).
 */
export function burstLevel(elapsedMs: number, totalMs: number): number {
  if (totalMs <= 0) return 0;
  const t = clamp01(elapsedMs / totalMs);
  if (t >= 1) return 0;
  // Wild at once, then easing off over the whole settle.
  return clamp01(Math.cos((t * Math.PI) / 2) ** 1.4);
}

/**
 * Whether the phone has been turned over. Two angles, not one: it takes a real flip to tip the
 * globe, and a lazy hand has to come most of the way back before it tips again.
 */
export function isFlipped(was: boolean, beta: number | null | undefined): boolean {
  if (beta == null || !Number.isFinite(beta)) return was;
  const angle = Math.abs(beta);
  return was ? angle > 115 : angle > 145;
}

/** How many shakes the globe asks for. */
export const SHAKE_COUNTS = { two: 2, three: 3, four: 4 } as const;
export type ShakeCount = keyof typeof SHAKE_COUNTS;

export type Reveal = { kind: "line"; text: string } | { kind: "photo"; index: number };

/**
 * What has appeared inside once the snow settles, in order: a line from the sender, then a
 * photo hanging in the snow, then a line… whichever runs out, the other carries on alone.
 */
export function revealPlan(lines: string[], photoCount: number, shakes: number): Reveal[] {
  const words = lines.map((line) => line.trim()).filter(Boolean);
  const photos = Math.max(0, Math.floor(photoCount));
  const out: Reveal[] = [];
  let l = 0;
  let p = 0;
  while (out.length < shakes && (l < words.length || p < photos)) {
    const wantsLine = out.length % 2 === 0;
    if (wantsLine && l < words.length) out.push({ kind: "line", text: words[l++] });
    else if (p < photos) out.push({ kind: "photo", index: p++ });
    else if (l < words.length) out.push({ kind: "line", text: words[l++] });
  }
  return out;
}

/** There is always one shake, even for a gift with nothing to reveal but the plaque. */
export function shakesNeeded(plan: Reveal[]): number {
  return Math.max(1, plan.length);
}
