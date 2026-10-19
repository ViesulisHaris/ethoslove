import { mulberry32 } from "../_shared/random";
import type { P } from "./points";

/**
 * The flight of the swarm, as a pure function of time: where bat `i` is `t` seconds after the tap.
 * There is no state to drift, so a skip, a replay and a test are all just a different `t`.
 *
 *   emerge  the bats pour out of the moon in a spiral, a few at a time
 *   orbit   they circle it in a leaning vortex
 *   form    they fly to the points of a word (then, last, a heart) ...
 *   hold    ... and hang there, wings beating, until it can be read
 *   scatter they burst outwards and are gone
 */
export type Moon = { cx: number; cy: number; r: number };

export const TAU = Math.PI * 2;
/** The bats already circling the moon before anyone has touched it. */
export const IDLE_BATS = 14;

export type Bat = {
  /** How far out it flies, 0 to 1. */
  ring: number;
  /** Radians a second, signed: some go round the other way. */
  spin: number;
  a0: number;
  /** How flat its orbit is. */
  squash: number;
  size: number;
  flap: number;
  /** Wing-beats a second in flight. */
  rate: number;
  /** When it leaves the moon, 0 to 0.8 s after the tap. */
  delay: number;
  curve: number;
  away: number;
};

export function makeBats(count: number, seed: number): Bat[] {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    ring: rng(),
    spin: (0.5 + rng() * 0.85) * (rng() < 0.62 ? 1 : -1),
    a0: rng() * TAU,
    squash: 0.4 + rng() * 0.32,
    size: 0.82 + rng() * 0.42,
    flap: rng(),
    rate: 6.5 + rng() * 4,
    delay: rng() * 0.8,
    curve: (rng() - 0.5) * 2,
    away: (rng() - 0.5) * 2,
  }));
}

export type Step =
  | { kind: "emerge"; t0: number; t1: number }
  | { kind: "orbit"; t0: number; t1: number }
  | { kind: "form"; t0: number; t1: number; word: number }
  | { kind: "hold"; t0: number; t1: number; word: number }
  | { kind: "scatter"; t0: number; t1: number };

export type Script = { steps: Step[]; total: number };

/** A sound that belongs to a step of the flight, and where in the step it goes: `delay` seconds in, over `ms`, loudest `peak` of the way through. */
export type Cue = { sound: "flutter" | "whoosh" | "chime" | "sparkle"; delay: number; ms?: number; peak?: number; soft?: boolean; note?: number };

/**
 * The sounds of a step, timed to what the bats are doing and not to the moment the step begins. Each
 * bat leaves the moon at its own moment in the first 0.8 s and eases out, so the pour is thickest at
 * about 0.8 s; each flies to its letter with an ease in and out that is quickest about 0.75 s into the
 * 1.55 s; and they scatter faster the further they have gone, so they are streaming off the screen (the
 * busiest it gets) about 0.35 s in. A sound that starts with the step is over
 * before any of that has happened, which is why the whoosh used to land on nothing. `heart` is the index
 * of the last shape, which a shimmer is for and a bell is not.
 */
export function cuesFor(step: Step, heart: number): Cue[] {
  switch (step.kind) {
    case "emerge":
      return [
        { sound: "flutter", delay: 0.05, ms: 1500, peak: 0.45 },
        { sound: "whoosh", delay: 0.4, ms: 900, peak: 0.55 },
      ];
    case "orbit":
      return [{ sound: "flutter", delay: 0, ms: Math.round((step.t1 - step.t0) * 1000), peak: 0.5, soft: true }];
    case "form":
      return [{ sound: "whoosh", delay: 0.3, ms: 950, peak: 0.5 }];
    case "hold":
      return step.word === heart ? [{ sound: "sparkle", delay: 0.05, ms: 1100 }] : [{ sound: "chime", delay: 0.05, note: step.word }];
    case "scatter":
      return [
        { sound: "flutter", delay: 0.08, ms: 1200, peak: 0.25 },
        { sound: "whoosh", delay: 0.1, ms: 850, peak: 0.3 },
      ];
  }
}

export const TIMING = { emerge: 1.6, orbit: 1.7, gather: 1.55, hold: 1.9, holdLast: 1.5, scatter: 1.5 } as const;

/** `words` is how many shapes the bats make, the heart included: a name, perhaps a line, then the heart. */
export function buildScript(words: number): Script {
  const steps: Step[] = [];
  let t = 0;
  const add = <K extends Step["kind"]>(kind: K, length: number, extra?: { word: number }) => {
    steps.push({ kind, t0: t, t1: t + length, ...extra } as Step);
    t += length;
  };
  add("emerge", TIMING.emerge);
  add("orbit", TIMING.orbit);
  for (let word = 0; word < words; word++) {
    add("form", TIMING.gather, { word });
    add("hold", word === words - 1 ? TIMING.holdLast : TIMING.hold, { word });
  }
  add("scatter", TIMING.scatter);
  return { steps, total: t };
}

/** The step `t` falls in, or the last one once it is over. */
export function stepAt(script: Script, t: number): { step: Step; index: number } {
  const index = Math.max(0, script.steps.findIndex((s) => t < s.t1));
  const i = t >= script.total ? script.steps.length - 1 : index;
  return { step: script.steps[i], index: i };
}

/** The moon, from the size of the screen: wide on a phone, as high as a laptop's height allows. */
export function moonFor(w: number, h: number): Moon {
  return { cx: w / 2, cy: h * 0.43, r: Math.min(w * 0.43, h * 0.27) };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const easeOut = (s: number) => 1 - Math.pow(1 - s, 3);
const easeInOut = (s: number) => (s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2);

/** A point on the bat's circle round the moon. A circle seen at an angle, with the whole vortex leaning. */
export function orbitAt(bat: Bat, t: number, moon: Moon): P {
  const r = moon.r * (0.5 + bat.ring * 1.15);
  const a = bat.a0 + bat.spin * t;
  const ex = Math.cos(a) * r * 1.05;
  const ey = Math.sin(a) * r * bat.squash + Math.sin(t * 1.4 + bat.a0 * 3) * moon.r * 0.04;
  const lean = -0.2;
  return { x: moon.cx + ex * Math.cos(lean) - ey * Math.sin(lean), y: moon.cy + ex * Math.sin(lean) + ey * Math.cos(lean) };
}

export type Flight = {
  bats: readonly Bat[];
  script: Script;
  moon: Moon;
  /** One point per bat for each shape, in the order the script makes them. */
  targets: readonly (readonly P[])[];
  /** The idle bats were already flying before the tap; their clock runs this far ahead so they do not jump. */
  idleClock: number;
};

const orbitClock = (flight: Flight, i: number, t: number) => (i < IDLE_BATS ? t + flight.idleClock : t);

/** Where bat `i` is `t` seconds after the tap, and whether it has left the moon yet. */
export function positionAt(flight: Flight, i: number, t: number): { x: number; y: number; visible: boolean } {
  const { bats, script, moon, targets } = flight;
  const bat = bats[i];
  const { step } = stepAt(script, t);
  const emergeEnd = script.steps[0].t1;
  const lands = (at: number) => orbitAt(bat, orbitClock(flight, i, at), moon);

  if (step.kind === "emerge") {
    if (i >= IDLE_BATS && t < bat.delay) return { x: moon.cx, y: moon.cy, visible: false };
    if (i < IDLE_BATS) return { ...lands(t), visible: true };
    const s = easeOut(clamp01((t - bat.delay) / (emergeEnd - 0.8)));
    const to = lands(emergeEnd);
    const dx = to.x - moon.cx;
    const dy = to.y - moon.cy;
    const angle = Math.atan2(dy, dx) - (1 - s) * 2.4 * Math.sign(bat.spin);
    const len = Math.hypot(dx, dy) * s;
    return { x: moon.cx + Math.cos(angle) * len, y: moon.cy + Math.sin(angle) * len, visible: true };
  }
  if (step.kind === "orbit") return { ...lands(t), visible: true };

  if (step.kind === "form") {
    const from = step.word === 0 ? lands(step.t0) : targets[step.word - 1][i];
    const to = targets[step.word][i];
    const lag = bat.delay * 0.45;
    const e = easeInOut(clamp01((t - step.t0 - lag) / (step.t1 - step.t0 - 0.4)));
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    // The flight bows to one side, so the bats arrive in streams rather than along ruled lines.
    const bow = bat.curve * len * 0.22 * Math.sin(Math.PI * e);
    return { x: from.x + dx * e + (-dy / len) * bow, y: from.y + dy * e + (dx / len) * bow, visible: true };
  }
  if (step.kind === "hold") {
    const to = targets[step.word][i];
    // A shiver: every bat is still beating its wings, and the word breathes.
    return { x: to.x + Math.sin(t * 9 + i * 1.7) * 0.8 + Math.sin(t * 4.3 + i) * 0.5, y: to.y + Math.cos(t * 8 + i * 2.1) * 0.8, visible: true };
  }

  // scatter: out from the middle of the moon, a little upwards, faster as they go
  const from = targets[targets.length - 1][i];
  const u = Math.max(0, t - step.t0 - bat.delay * 0.4);
  const angle = Math.atan2(from.y - moon.cy, from.x - moon.cx) + bat.away * 0.5;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle) - 0.35;
  const len = Math.hypot(dx, dy) || 1;
  const travel = (230 + bat.size * 150) * u + 560 * u * u;
  return { x: from.x + (dx / len) * travel, y: from.y + (dy / len) * travel, visible: true };
}

/** How high the wings are, -1 (down) to 1 (up), and how fast they beat in each part of the script. */
export function flapAt(bat: Bat, kind: Step["kind"], t: number): number {
  const rate = kind === "hold" ? bat.rate * 0.6 : kind === "form" || kind === "scatter" ? bat.rate * 1.25 : bat.rate;
  return Math.sin((t * rate + bat.flap) * TAU);
}

/**
 * How big a bat is drawn, as a multiple of its size in a word. Big while it circles, so the vortex
 * has weight; small once it is a pixel of a letter; and big again as it flies past on the way out.
 */
export const FLYING = 2.1;
export function scaleAt(step: Step, t: number): number {
  switch (step.kind) {
    case "emerge":
    case "orbit":
      return FLYING;
    case "form": {
      const from = step.word === 0 ? FLYING : 1;
      return from + (1 - from) * easeInOut(clamp01((t - step.t0) / (step.t1 - step.t0 - 0.2)));
    }
    case "hold":
      return 1;
    case "scatter":
      return 1 + 1.9 * easeOut(clamp01((t - step.t0) / (step.t1 - step.t0)));
  }
}
