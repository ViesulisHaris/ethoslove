/**
 * The numbers behind the night's sounds, kept apart from the audio graph so each of them can be tested
 * without a speaker: pitches, the partials of a bell, the shape of a rumble, when a hinge sticks and
 * slips, how a room decays. Anything random takes the random function as an argument, so a test can seed it.
 */

export type Rnd = () => number;

/** The quietest level an exponential ramp may reach: -80 dB, which nobody hears and WebAudio will accept. */
export const FLOOR = 1e-4;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const between = (rnd: Rnd, lo: number, hi: number) => lo + (hi - lo) * rnd();
export const dB = (db: number) => 10 ** (db / 20);
export const midiHz = (note: number) => 440 * 2 ** ((note - 69) / 12);

/* ---------------------------------------------------------------- pitch */

/** A minor pentatonic: every note agrees with every other, so a run of them is music by accident. */
const PENTATONIC = [0, 3, 5, 7, 10];

/** The Nth note of the scale above `root` (a MIDI note), counting up through the octaves. */
export const scaleHz = (root: number, degree: number) => {
  const d = Math.max(0, Math.floor(degree));
  return midiHz(root + 12 * Math.floor(d / 5) + PENTATONIC[d % 5]);
};

/** A at the bottom of the glass notes, so degree 2 is D5 and degree 9 is G6. */
const GLASS_ROOT = 69;
/** A small walk with no big leaps, so letters lighting up one by one make a tune rather than a scatter. */
const WALK = [4, 5, 3, 6, 4, 2, 5, 7, 6, 4, 3, 5, 2, 4, 6, 5];

/**
 * The pitch of the Nth glass note. A "walk" wanders (letters on a board); a "rise" climbs a rung per
 * step (windows lighting up one after another).
 */
export function glassHz(step: number, mode: "walk" | "rise" = "walk") {
  const s = Math.max(0, Math.floor(step));
  return mode === "rise" ? scaleHz(GLASS_ROOT, 3 + Math.min(s, 6)) : scaleHz(GLASS_ROOT, WALK[s % WALK.length]);
}

/** The bell's pitch: the fifth degree and up from A3, so the first is A4 and the fifth is G5. */
export const bellHz = (step = 0) => scaleHz(57, 5 + (Math.max(0, Math.floor(step)) % 5));

/** The notes of a shower of sparks, from C6 upward: bright, never shrill. */
export const sparkHz = (degree: number) => scaleHz(84, clamp(degree, 0, 9));

/* ------------------------------------------------------------- partials */

/** One partial of a struck thing: a multiple of the pitch, how loud it starts, how long it rings against the note's length. */
export type Overtone = { ratio: number; gain: number; ring: number; beat?: number };

/** A wine glass, tapped: the modes sit at 1 : 2.32 : 4.25 : 6.63 and the high ones die first. */
export const GLASS: readonly Overtone[] = [
  { ratio: 1, gain: 1, ring: 1 },
  { ratio: 2.32, gain: 0.38, ring: 0.55 },
  { ratio: 4.25, gain: 0.16, ring: 0.3 },
  { ratio: 6.63, gain: 0.06, ring: 0.18 },
];

/** A celesta or a music box: a free bar, whose first overtone is 2.76 times the pitch and whose second is 5.4. */
export const CELESTA: readonly Overtone[] = [
  { ratio: 1, gain: 1, ring: 1 },
  { ratio: 2.76, gain: 0.28, ring: 0.45 },
  { ratio: 5.4, gain: 0.1, ring: 0.2 },
];

/**
 * A bell, after Jean-Claude Risset's: a hum below the pitch, a prime and a tierce, then the strike
 * tones above. Two partials are a hair apart (`beat`, in Hz) and slowly beat against each other, which is
 * what makes a bell shimmer rather than hum.
 */
export const BELL: readonly Overtone[] = [
  { ratio: 0.56, gain: 0.33, ring: 1 },
  { ratio: 0.56, gain: 0.22, ring: 0.9, beat: 1 },
  { ratio: 0.92, gain: 0.33, ring: 0.65 },
  { ratio: 0.92, gain: 0.6, ring: 0.55, beat: 1.7 },
  { ratio: 1.19, gain: 0.9, ring: 0.325 },
  { ratio: 1.7, gain: 0.55, ring: 0.35 },
  { ratio: 2, gain: 0.48, ring: 0.25 },
  { ratio: 2.74, gain: 0.44, ring: 0.2 },
  { ratio: 3, gain: 0.44, ring: 0.15 },
  { ratio: 3.76, gain: 0.33, ring: 0.1 },
  { ratio: 4.07, gain: 0.44, ring: 0.075 },
];

/** A resonance of something hollow or solid: where it rings, how sharply, how loud it starts. */
export type Mode = { hz: number; q: number; gain: number };

/**
 * A heavy door under a fist: a low body for a big speaker and, above it, the wood's own notes, which are
 * what a phone can play: nothing a phone makes is much use below 400 Hz, so most of the knock lives above it.
 */
export const DOOR_MODES: readonly Mode[] = [
  { hz: 150, q: 12, gain: 0.6 },
  { hz: 260, q: 12, gain: 0.9 },
  { hz: 400, q: 11, gain: 1 },
  { hz: 600, q: 10, gain: 1.1 },
  { hz: 900, q: 9, gain: 1.1 },
  { hz: 1300, q: 8, gain: 0.8 },
];

/** A piece of pumpkin rind landing on wood: soft, damped, nothing rings for long. Here `hz` is a multiple of the piece’s own pitch. */
export const RIND_MODES: readonly Mode[] = [
  { hz: 1, q: 6, gain: 1 },
  { hz: 1.62, q: 5, gain: 0.6 },
  { hz: 2.5, q: 4, gain: 0.4 },
  { hz: 3.9, q: 4, gain: 0.22 },
  { hz: 5.8, q: 3, gain: 0.12 },
];

/** The hollow of a small bottle when the cork has just left it. */
export const BOTTLE_MODES: readonly Mode[] = [
  { hz: 330, q: 14, gain: 1 },
  { hz: 520, q: 18, gain: 0.5 },
  { hz: 780, q: 14, gain: 0.25 },
];

/* ---------------------------------------------------------- the shapes */

/**
 * The shape of a rumble as [seconds, level]: a hard first hit, then swells and troughs that roll along
 * slower than they flicker, the whole thing dying away. It always starts and ends at silence.
 */
export function thunderEnvelope(rnd: Rnd, length: number): [number, number][] {
  const pts: [number, number][] = [[0, 0], [0.022, 1]];
  const phase = rnd() * Math.PI * 2;
  const wobble = between(rnd, 3.2, 5.4);
  let t = 0.16;
  while (t < length - 0.35) {
    const decay = Math.exp(-t / (length * 0.34));
    const roll = 0.58 + 0.42 * Math.sin(phase + t * wobble);
    pts.push([t, clamp(decay * roll * between(rnd, 0.8, 1.15), 0.01, 1)]);
    t += between(rnd, 0.11, 0.3);
  }
  pts.push([length, 0]);
  return pts;
}

/** One moment of a hinge sticking and letting go. */
export type Slip = { at: number; amp: number; len: number };

/**
 * When a hinge sticks and slips over `length` seconds: slow at the start and the end of the door's
 * swing, quick through the middle, never in a rhythm. Each slip is a small rattle in the sound.
 */
export function creakSlips(rnd: Rnd, length: number): Slip[] {
  const out: Slip[] = [];
  let t = 0;
  while (t < length) {
    const speed = Math.sin(Math.PI * clamp(t / length, 0, 1));
    const gap = (1 / (16 + 30 * speed)) * between(rnd, 0.6, 1.4);
    out.push({ at: t, amp: between(rnd, 0.55, 1) * (0.45 + 0.55 * speed), len: Math.min(gap * 0.9, 0.05) });
    t += gap;
  }
  return out;
}

/** The pitch a hinge sings over its swing, in Hz: it climbs as the door speeds up and sags as it slows. */
export function creakPitch(rnd: Rnd, points: number): number[] {
  const base = between(rnd, 118, 150);
  const top = between(rnd, 1.7, 2.1);
  let drift = 1;
  return Array.from({ length: points }, (_, i) => {
    const x = points === 1 ? 0 : i / (points - 1);
    drift = clamp(drift + between(rnd, -0.025, 0.025), 0.93, 1.07);
    return base * (1 + (top - 1) * Math.sin(Math.PI * x * 0.9) ** 0.8) * drift;
  });
}

/** A short burst of filtered noise in a texture: when it lands, how loud, at what pitch, for how long. */
export type Grain = { at: number; level: number; hz: number; len: number };

type GrainSpec = {
  /** How long the texture runs, in seconds. */
  length: number;
  /** Grains per second, on average. */
  rate: number;
  hz: [number, number];
  len: [number, number];
  level: [number, number];
  /** The loudness of the texture over its length, 0..1 at each point of 0..1. Default: a gentle arch. */
  shape?: (x: number) => number;
};

/** Grains in time order, never overlapping, with their loudness following `shape`. */
export function grains(rnd: Rnd, spec: GrainSpec): Grain[] {
  const shape = spec.shape ?? ((x: number) => Math.sin(Math.PI * clamp(x, 0, 1)) ** 0.6);
  const out: Grain[] = [];
  let at = between(rnd, 0, 0.5 / spec.rate);
  while (at < spec.length) {
    const gap = (1 / spec.rate) * between(rnd, 0.55, 1.45);
    out.push({
      at,
      level: between(rnd, spec.level[0], spec.level[1]) * shape(at / spec.length),
      hz: between(rnd, spec.hz[0], spec.hz[1]),
      len: Math.min(between(rnd, spec.len[0], spec.len[1]), gap * 0.92),
    });
    at += gap;
  }
  return out;
}

/** A bubble, by Minnaert's rule: the bigger it is, the lower it sings; it climbs a little as it rises and rings briefly. */
export type BubbleSpec = { hz: number; rise: number; ring: number; level: number };

export function bubbleSpec(rnd: Rnd, size = rnd()): BubbleSpec {
  const s = clamp(size, 0, 1);
  return { hz: 230 * 2 ** (2 * (1 - s)), rise: between(rnd, 1.25, 1.5), ring: 0.016 + 0.034 * s, level: 0.45 + 0.55 * s };
}

/* ------------------------------------------------------------ the room */

export type NoiseKind = "white" | "pink" | "brown";

/** Fills `out` with noise whose loudness is the same for every kind, so one can stand in for another. */
export function fillNoise(kind: NoiseKind, out: Float32Array, rnd: Rnd) {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
  let energy = 0;
  for (let i = 0; i < out.length; i++) {
    const w = rnd() * 2 - 1;
    let y = w;
    if (kind === "pink") {
      // Paul Kellet's economy filter: within a few tenths of a dB of -3 dB per octave.
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      y = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
    } else if (kind === "brown") {
      last = (last + 0.02 * w) / 1.02;
      y = last;
    }
    out[i] = y;
    energy += y * y;
  }
  const scale = 0.25 / Math.sqrt(energy / out.length || 1);
  for (let i = 0; i < out.length; i++) out[i] = clamp(out[i] * scale, -1, 1);
}

/**
 * The room the sounds are in: a big, dark, stone-and-timber room, as two ears hear it. A few early
 * reflections, then noise dying away over `seconds` and getting duller as it goes, as air takes the
 * high end first.
 */
export function roomImpulse(sampleRate: number, seconds: number, rnd: Rnd): [Float32Array, Float32Array] {
  const n = Math.floor(sampleRate * seconds);
  const preDelay = Math.floor(sampleRate * 0.009);
  const reflections = [0.011, 0.019, 0.029, 0.041, 0.057, 0.073];
  return [0, 1].map((ear) => {
    const ir = new Float32Array(n);
    let y = 0;
    for (let i = preDelay; i < n; i++) {
      const x = (i - preDelay) / (n - preDelay);
      const bright = 0.8 - 0.68 * x;
      y += bright * ((rnd() * 2 - 1) - y);
      ir[i] = y * Math.exp(-6.9 * (i / sampleRate) / (seconds * 0.92)) * (1 - x * 0.2);
    }
    // A wall is not a point: each early reflection is a few milliseconds of smear, so a sharp sound
    // comes back as a room around it and not as a slap echo.
    const smear = Math.floor(sampleRate * 0.004);
    reflections.forEach((r, k) => {
      const at = Math.floor(sampleRate * (r + ear * 0.0031 * (k + 1)));
      for (let j = 0; j < smear && at + j < n; j++) ir[at + j] += (rnd() * 2 - 1) * 0.5 * 0.8 ** k * Math.exp(-j / (smear * 0.35));
    });
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(ir[i]));
    for (let i = 0; i < n; i++) ir[i] /= peak || 1;
    return ir;
  }) as [Float32Array, Float32Array];
}

/**
 * A soft ceiling for everything at once: untouched below about -8 dB, it rounds off what would
 * otherwise clip when a thunderclap lands on top of a bell. Output never exceeds 1 / drive.
 */
export function softClipCurve(points = 2048, drive = 1.25): Float32Array {
  const curve = new Float32Array(points);
  for (let i = 0; i < points; i++) curve[i] = Math.tanh(drive * ((i / (points - 1)) * 2 - 1)) / drive;
  return curve;
}
