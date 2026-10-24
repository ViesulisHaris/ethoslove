import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { busFor, type Voice } from "@/templates/_shared/night/foley";
import { mulberry32 } from "@/templates/_shared/random";
import { EFFECTS } from "@/templates/_shared/night/sfx";
import {
  BELL,
  BOTTLE_MODES,
  CELESTA,
  DOOR_MODES,
  FLOOR,
  GLASS,
  LOUDEST_EFFECT_DB,
  MUSIC_CEILING,
  RIND_MODES,
  bellHz,
  bubbleSpec,
  creakPitch,
  dB,
  creakSlips,
  fillNoise,
  glassHz,
  grains,
  roomImpulse,
  scaleHz,
  softClipCurve,
  sparkHz,
  thunderEnvelope,
} from "@/templates/_shared/night/sound-math";

const semitones = (a: number, b: number) => Math.abs(12 * Math.log2(a / b));
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

describe("the headroom the song is given", () => {
  it("is enough that the loudest effect on the loudest moment of the loudest song cannot pass full scale", () => {
    // The library songs peak at 0 dBFS (one decodes to +0.3), so the share of it that is left to the effects is what the song gives up.
    expect(MUSIC_CEILING + dB(LOUDEST_EFFECT_DB)).toBeLessThanOrEqual(1);
    expect(MUSIC_CEILING).toBeGreaterThan(0.5);
    expect(LOUDEST_EFFECT_DB).toBeLessThan(-8);
  });

  it("is applied by every one of the five gifts, to the song they start", () => {
    for (const slug of ["seance", "bat-swarm", "cauldron", "jack-o-lantern", "haunted-house"]) {
      const source = readFileSync(`src/templates/${slug}/Template.tsx`, "utf8");
      expect(source, slug).toMatch(/useGiftAudio\(data\.music, mode !== "preview", MUSIC_CEILING\)/);
    }
  });
});

describe("the pitches", () => {
  it("counts a minor pentatonic up from its root, an octave every five notes", () => {
    expect(scaleHz(69, 0)).toBeCloseTo(440, 5);
    expect(scaleHz(69, 5)).toBeCloseTo(880, 5);
    expect(scaleHz(69, 1)).toBeCloseTo(523.25, 1);
    expect(scaleHz(69, 4)).toBeCloseTo(783.99, 1);
  });

  it("walks the glass notes without a leap bigger than a sixth, and stays in a sweet part of the range", () => {
    let last = glassHz(0);
    for (let step = 0; step < 48; step++) {
      const hz = glassHz(step);
      expect(hz, `step ${step}`).toBeGreaterThan(550);
      expect(hz, `step ${step}`).toBeLessThan(1400);
      if (step) expect(semitones(hz, last), `step ${step}`).toBeLessThanOrEqual(9.01);
      last = hz;
    }
  });

  it("climbs a rung a step when things light one after another, and never past where it is comfortable", () => {
    const run = [0, 1, 2, 3, 4, 5, 6].map((s) => glassHz(s, "rise"));
    run.forEach((hz, i) => i && expect(hz).toBeGreaterThan(run[i - 1]));
    expect(glassHz(40, "rise")).toBe(glassHz(6, "rise"));
    expect(Math.max(...run)).toBeLessThan(1800);
  });

  it("gives each word its own bell, five before they come round again, all between A4 and G5", () => {
    const bells = [0, 1, 2, 3, 4].map(bellHz);
    bells.forEach((hz, i) => i && expect(hz).toBeGreaterThan(bells[i - 1]));
    expect(bells[0]).toBeCloseTo(440, 0);
    expect(bells[4]).toBeCloseTo(783.99, 0);
    expect(bellHz(5)).toBe(bellHz(0));
  });

  it("keeps the sparks high but never shrill, however far up the shower climbs", () => {
    expect(sparkHz(0)).toBeGreaterThan(1000);
    expect(sparkHz(0)).toBeCloseTo(1046.5, 0);
    expect(sparkHz(9)).toBeCloseTo(3520, 0);
    expect(sparkHz(9)).toBeLessThan(4200);
    expect(sparkHz(99)).toBe(sparkHz(9));
    expect(sparkHz(-3)).toBe(sparkHz(0));
  });
});

describe("what a struck thing is made of", () => {
  it("lets the high partials of a glass, a celesta bar and a bell die before the low ones", () => {
    for (const table of [GLASS, CELESTA]) {
      for (const p of table) {
        expect(p.gain).toBeGreaterThan(0);
        expect(p.ring).toBeGreaterThan(0);
        expect(p.ring).toBeLessThanOrEqual(1);
      }
      for (let i = 1; i < table.length; i++) {
        expect(table[i].ratio).toBeGreaterThan(table[i - 1].ratio);
        expect(table[i].ring).toBeLessThan(table[i - 1].ring);
      }
    }
    for (const p of BELL) expect(p.ring).toBeLessThanOrEqual(1);
    // The two beating pairs are a hair apart, not a different note.
    expect(BELL.filter((p) => p.beat).every((p) => (p.beat ?? 0) < 3)).toBe(true);
  });

  it("keeps every mode of a door, a rind and a bottle in a believable place", () => {
    for (const m of DOOR_MODES) expect(m.hz).toBeGreaterThan(60);
    for (const m of DOOR_MODES) expect(m.hz).toBeLessThan(1400);
    // Most of a knock has to live where a phone's speaker can play it.
    expect(DOOR_MODES.filter((m) => m.hz >= 400).reduce((s, m) => s + m.gain, 0)).toBeGreaterThan(DOOR_MODES.filter((m) => m.hz < 400).reduce((s, m) => s + m.gain, 0) * 0.5);
    for (const m of BOTTLE_MODES) expect(m.hz).toBeGreaterThan(200);
    for (const m of RIND_MODES) expect(m.hz).toBeGreaterThanOrEqual(1);
    for (const modes of [DOOR_MODES, RIND_MODES, BOTTLE_MODES]) for (const m of modes) expect(m.q).toBeGreaterThan(1);
    // A heavier door has a lower body than a bottle does.
    expect(Math.min(...DOOR_MODES.map((m) => m.hz))).toBeLessThan(Math.min(...BOTTLE_MODES.map((m) => m.hz)));
  });

  it("makes a bigger bubble lower and slower to ring out", () => {
    const rnd = mulberry32(3);
    const small = bubbleSpec(rnd, 0);
    const big = bubbleSpec(rnd, 1);
    expect(big.hz).toBeLessThan(small.hz);
    expect(big.ring).toBeGreaterThan(small.ring);
    expect(big.level).toBeGreaterThan(small.level);
    expect(big.hz).toBeGreaterThan(200);
    expect(small.hz).toBeLessThan(1000);
  });
});

describe("the rumble", () => {
  it("starts and ends in silence, with a hard first hit and a long way down after it", () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const length = 3.6;
      const env = thunderEnvelope(mulberry32(seed), length);
      expect(env[0]).toEqual([0, 0]);
      expect(env[1][1]).toBe(1);
      expect(env[1][0]).toBeLessThan(0.05);
      expect(env[env.length - 1]).toEqual([length, 0]);
      env.forEach(([at, level], i) => {
        expect(level).toBeGreaterThanOrEqual(0);
        expect(level).toBeLessThanOrEqual(1);
        if (i) expect(at, `point ${i}`).toBeGreaterThan(env[i - 1][0]);
      });
      const early = mean(env.filter(([at]) => at > 0.1 && at < length / 3).map(([, v]) => v));
      const late = mean(env.filter(([at]) => at > (2 * length) / 3 && at < length - 0.2).map(([, v]) => v));
      expect(late, `seed ${seed}`).toBeLessThan(early);
    }
  });

  it("is a different storm each time, and the same one for the same seed", () => {
    expect(thunderEnvelope(mulberry32(9), 3.5)).toEqual(thunderEnvelope(mulberry32(9), 3.5));
    expect(thunderEnvelope(mulberry32(9), 3.5)).not.toEqual(thunderEnvelope(mulberry32(10), 3.5));
  });
});

describe("the hinge", () => {
  it("sticks and slips faster through the middle of the swing than at either end, and never in step", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const length = 1.2;
      const slips = creakSlips(mulberry32(seed), length);
      slips.forEach((s, i) => {
        // Long enough to rise (4 ms) before it falls; over before the next begins.
        expect(s.len, `slip ${i}`).toBeGreaterThan(0.0045);
        expect(s.len, `slip ${i}`).toBeLessThanOrEqual(0.05);
        expect(s.amp).toBeGreaterThan(0);
        expect(s.amp).toBeLessThanOrEqual(1);
        if (i) expect(s.at, `slip ${i}`).toBeGreaterThan(slips[i - 1].at + slips[i - 1].len);
      });
      const inWindow = (a: number, b: number) => slips.filter((s) => s.at >= a * length && s.at < b * length).length / ((b - a) * length);
      expect(inWindow(0.35, 0.65), `seed ${seed}`).toBeGreaterThan(inWindow(0, 0.15));
      const gaps = slips.slice(1).map((s, i) => s.at - slips[i].at);
      expect(new Set(gaps.map((g) => g.toFixed(5))).size).toBeGreaterThan(gaps.length / 2);
    }
  });

  it("sings between about 100 and 350 Hz, climbing and sagging, never leaping", () => {
    const pitch = creakPitch(mulberry32(4), 28);
    expect(pitch).toHaveLength(28);
    for (const hz of pitch) {
      expect(hz).toBeGreaterThan(100);
      expect(hz).toBeLessThan(350);
    }
    pitch.forEach((hz, i) => i && expect(semitones(hz, pitch[i - 1])).toBeLessThan(4));
    expect(Math.max(...pitch)).toBeGreaterThan(pitch[0] * 1.4);
  });
});

describe("textures made of grains", () => {
  const spec = { length: 1, rate: 40, hz: [500, 1500] as [number, number], len: [0.01, 0.03] as [number, number], level: [0.4, 1] as [number, number] };

  it("keeps grains in order, one at a time, inside the texture and inside their own ranges", () => {
    const list = grains(mulberry32(2), spec);
    expect(list.length).toBeGreaterThan(20);
    expect(list.length).toBeLessThan(70);
    list.forEach((g, i) => {
      expect(g.at).toBeGreaterThanOrEqual(0);
      expect(g.at).toBeLessThan(spec.length);
      expect(g.hz).toBeGreaterThanOrEqual(500);
      expect(g.hz).toBeLessThanOrEqual(1500);
      expect(g.level).toBeLessThanOrEqual(1);
      expect(g.level).toBeGreaterThanOrEqual(0);
      expect(g.len).toBeGreaterThan(0);
      if (i) expect(g.at).toBeGreaterThanOrEqual(list[i - 1].at + list[i - 1].len);
    });
  });

  it("follows the shape it is given: quiet at the ends and loud in the middle by default", () => {
    const list = grains(mulberry32(2), spec);
    const middle = mean(list.filter((g) => g.at > 0.4 && g.at < 0.6).map((g) => g.level));
    const edge = mean(list.filter((g) => g.at < 0.08 || g.at > 0.92).map((g) => g.level));
    expect(middle).toBeGreaterThan(edge);
    const fading = grains(mulberry32(2), { ...spec, shape: (x) => 1 - x });
    expect(mean(fading.filter((g) => g.at < 0.3).map((g) => g.level))).toBeGreaterThan(mean(fading.filter((g) => g.at > 0.7).map((g) => g.level)));
  });
});

describe("the room", () => {
  it("makes noise of a steady loudness, white or pink or brown, each tilted the way it should be", () => {
    const tilt = (kind: "white" | "pink" | "brown") => {
      const a = new Float32Array(20000);
      fillNoise(kind, a, mulberry32(1));
      let rms = 0, diff = 0, peak = 0;
      for (let i = 0; i < a.length; i++) {
        rms += a[i] * a[i];
        peak = Math.max(peak, Math.abs(a[i]));
        if (i) diff += (a[i] - a[i - 1]) ** 2;
        expect(Number.isFinite(a[i])).toBe(true);
      }
      return { rms: Math.sqrt(rms / a.length), brightness: Math.sqrt(diff / rms), peak };
    };
    const [white, pink, brown] = [tilt("white"), tilt("pink"), tilt("brown")];
    for (const n of [white, pink, brown]) {
      expect(n.rms).toBeCloseTo(0.25, 1);
      expect(n.peak).toBeLessThanOrEqual(1);
    }
    expect(white.brightness).toBeGreaterThan(pink.brightness);
    expect(pink.brightness).toBeGreaterThan(brown.brightness);
  });

  it("is a stereo tail that dies away to nothing, a different one in each ear, no louder than 1", () => {
    const sr = 44100;
    const [l, r] = roomImpulse(sr, 2.1, mulberry32(7));
    expect(l).toHaveLength(Math.floor(sr * 2.1));
    expect(r).toHaveLength(l.length);
    const energy = (a: Float32Array, from: number, to: number) => {
      let e = 0;
      for (let i = Math.floor(from * a.length); i < Math.floor(to * a.length); i++) e += a[i] * a[i];
      return e;
    };
    for (const ear of [l, r]) {
      expect(energy(ear, 0.75, 1)).toBeLessThan(energy(ear, 0, 0.25) * 0.01);
      expect(Math.max(...ear.map(Math.abs))).toBeCloseTo(1, 5);
      expect(ear.every(Number.isFinite)).toBe(true);
    }
    expect(l).not.toEqual(r);
    // Nothing arrives before the pre-delay, so a sound is heard first and its room after.
    expect(Math.max(...l.slice(0, 200).map(Math.abs))).toBe(0);
  });

  it("rounds off a pile-up of sounds instead of clipping it, and leaves quiet ones alone", () => {
    const curve = softClipCurve();
    const mid = (curve.length - 1) / 2;
    expect(curve[Math.round(mid)]).toBeCloseTo(0, 2);
    expect(curve[0]).toBeCloseTo(-curve[curve.length - 1], 6);
    expect(Math.max(...curve.map(Math.abs))).toBeLessThan(0.7);
    // A signal at -12 dB (0.25) comes out within half a dB of itself.
    const at = (x: number) => curve[Math.round(((x + 1) / 2) * (curve.length - 1))];
    expect(Math.abs(20 * Math.log10(at(0.25) / 0.25))).toBeLessThan(0.5);
    // And the louder it goes the more it is held back.
    expect(at(0.9) / 0.9).toBeLessThan(at(0.5) / 0.5);
  });
});

/* ---------------------------------------------------------------------------------------------
 * Every effect is built against a stand-in for the audio context that records what it is asked to
 * do. The browser throws on the things these checks look for (a non-finite time, an exponential
 * ramp to nothing) and the effects run inside a try/catch, so without this a broken sound would
 * simply be silent and nobody would know.
 * ------------------------------------------------------------------------------------------- */

type Event = { kind: string; time: number; value?: number };

class Param {
  /** What a fresh parameter holds before anything is scheduled on it: 1 for a gain, which is the whole trap. */
  value: number;
  events: Event[] = [];
  constructor(initial = 0) {
    this.value = initial;
  }
  private add(kind: string, time: number, value?: number) {
    expect(Number.isFinite(time), `${kind} time`).toBe(true);
    expect(time, `${kind} time`).toBeGreaterThanOrEqual(0);
    if (value !== undefined) expect(Number.isFinite(value), `${kind} value`).toBe(true);
    const last = this.events[this.events.length - 1];
    if (last) expect(time, `${kind} scheduled before the one ahead of it`).toBeGreaterThanOrEqual(last.time - 1e-9);
    this.events.push({ kind, time, value });
    return this;
  }
  setValueAtTime(value: number, time: number) {
    return this.add("set", time, value);
  }
  linearRampToValueAtTime(value: number, time: number) {
    return this.add("linear", time, value);
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    expect(value, "an exponential ramp has to end above zero").toBeGreaterThan(0);
    return this.add("exp", time, value);
  }
  setValueCurveAtTime(values: Float32Array, time: number, duration: number) {
    expect(values.length).toBeGreaterThanOrEqual(2);
    expect(values.every(Number.isFinite)).toBe(true);
    expect(duration).toBeGreaterThan(0);
    this.add("curve", time);
    return this.add("curve-end", time + duration);
  }
}

/** What an automated parameter is at `time`, following its ramps the way the browser does. */
function valueAt(p: Param, time: number): number {
  let value = 0;
  for (let i = 0; i < p.events.length; i++) {
    const e = p.events[i];
    if (e.value === undefined) continue;
    if (e.time <= time) {
      value = e.value;
      continue;
    }
    if ((e.kind === "linear" || e.kind === "exp") && i > 0) {
      const from = p.events.slice(0, i).reverse().find((x) => x.value !== undefined);
      if (from && from.value !== undefined && e.time > from.time) {
        const x = (time - from.time) / (e.time - from.time);
        return e.kind === "linear" ? from.value + (e.value - from.value) * x : from.value > 0 ? from.value * (e.value / from.value) ** x : from.value;
      }
    }
    return value;
  }
  return value;
}

class Node {
  gain = new Param(1);
  frequency = new Param(440);
  Q = new Param(1);
  pan = new Param(0);
  type = "";
  loop = false;
  oversample = "none";
  curve: Float32Array | null = null;
  buffer: { duration: number } | null = null;
  started: number | null = null;
  stopped: number | null = null;
  outs: Node[] = [];
  constructor(readonly kind: string, readonly ctx: Fake) {
    ctx.nodes.push(this);
  }
  connect<T>(to: T): T {
    if (to instanceof Node) this.outs.push(to);
    return to;
  }
  start(when = 0, offset = 0) {
    expect(Number.isFinite(when)).toBe(true);
    expect(offset).toBeGreaterThanOrEqual(0);
    if (this.buffer && this.loop) expect(offset).toBeLessThan(this.buffer.duration);
    this.started = when;
  }
  stop(when = 0) {
    expect(Number.isFinite(when)).toBe(true);
    this.stopped = when;
  }
  copyToChannel() {}
}

class Fake {
  sampleRate = 44100;
  currentTime = 0;
  nodes: Node[] = [];
  destination = new Node("destination", this);
  createGain = () => new Node("gain", this);
  createOscillator = () => new Node("oscillator", this);
  createBufferSource = () => new Node("source", this);
  createBiquadFilter = () => new Node("filter", this);
  createStereoPanner = () => new Node("panner", this);
  createConvolver = () => new Node("convolver", this);
  createWaveShaper = () => new Node("shaper", this);
  createBuffer = (_channels: number, length: number, rate: number) => ({ duration: length / rate, length, getChannelData: () => new Float32Array(length), copyToChannel() {} });
}

/** How long each effect may run, from the moment it starts, before it has to be over: the sound plus its room. */
const MOST_SECONDS: Record<keyof typeof EFFECTS, number> = {
  thunder: 5, creak: 1.6, scrape: 1.4, tink: 1.5, whoosh: 1.7, flutter: 2, bubbles: 0.9, splash: 1.4, boil: 3, cork: 0.5, sparkle: 2, glow: 2.6, ignite: 2, carve: 1.3, thunk: 1.4, chime: 4, knock: 0.9,
};
/** How each is played by the gifts that play it with a timing. */
const ARGS: Partial<Record<keyof typeof EFFECTS, unknown[]>> = {
  thunder: [0.8],
  scrape: [450],
  carve: [450],
  tink: [3, "rise"],
  chime: [2, 0.3],
  whoosh: [{ delay: 0.3, ms: 950, peak: 0.5 }],
  flutter: [{ delay: 0.05, ms: 1500, peak: 0.45 }],
  sparkle: [{ delay: 0.1, ms: 1200 }],
  thunk: [{ delay: 0.85 }],
  boil: [{ ms: 2300 }],
  glow: [{ ms: 2200 }],
};

describe("every night sound, built against a recording stand-in", () => {
  for (const [name, effect] of Object.entries(EFFECTS) as [keyof typeof EFFECTS, (v: Voice, ...args: never[]) => void][]) {
    it(`${name}: schedules nothing the browser would refuse, stops everything it starts, and is over in good time`, () => {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const c = new Fake();
        const bus = busFor(c as unknown as BaseAudioContext);
        const before = c.nodes.length;
        const t = 1;
        effect({ c: c as unknown as BaseAudioContext, t, bus, rnd: mulberry32(seed) }, ...((ARGS[name] ?? []) as never[]));
        const mine = c.nodes.slice(before);
        expect(mine.length, `${name} seed ${seed}`).toBeGreaterThan(2);
        expect(mine.length, `${name} seed ${seed} nodes`).toBeLessThan(900);
        let end = 0;
        for (const n of mine) {
          if (n.kind === "oscillator" || n.kind === "source") {
            expect(n.started, `${name}: a ${n.kind} that never starts`).not.toBeNull();
            expect(n.stopped, `${name}: a ${n.kind} that never stops`).not.toBeNull();
            expect(n.started!, `${name}: starts before it is asked to`).toBeGreaterThanOrEqual(t - 1e-9);
            expect(n.stopped!, `${name}: stops before it starts`).toBeGreaterThan(n.started!);
            end = Math.max(end, n.stopped!);
          }
          for (const p of [n.gain, n.frequency, n.Q, n.pan]) for (const e of p.events) end = Math.max(end, e.time);
        }
        expect(end - t, `${name} seed ${seed} runs for`).toBeLessThan(MOST_SECONDS[name]);
        // A source is cut off by its stop, and a click is what that sounds like unless an envelope on its way
        // to the speakers has already faded it out.
        for (const n of mine) {
          if (n.kind !== "oscillator" && n.kind !== "source") continue;
          const shapers: Node[] = [];
          const seen = new Set<Node>();
          const walk = (from: Node) => {
            for (const next of from.outs) {
              if (seen.has(next)) continue;
              seen.add(next);
              if (next.kind === "gain" && next.gain.events.length >= 2) shapers.push(next);
              walk(next);
            }
          };
          walk(n);
          expect(shapers.length, `${name}: a ${n.kind} with no envelope`).toBeGreaterThan(0);
          // And an envelope that is silent until it speaks. A gain that has not been told what to do yet is 1, so a
          // source that starts before its envelope plays at full volume until the envelope arrives (the cork's puff of
          // air did, for ten milliseconds, at -10 dBFS whatever the mix was set to; and a start time that is not on a
          // sample boundary does it for one sample, as a tick). The envelope's own value has to be 0 from the start.
          const silent = shapers.some((g) => g.gain.value === 0);
          expect(silent, `${name}: a ${n.kind} that no envelope holds silent before it speaks`).toBe(true);
          const quiet = shapers.some((g) => valueAt(g.gain, n.stopped!) <= 0.002);
          expect(quiet, `${name}: a ${n.kind} stopped while still audible`).toBe(true);
        }
      }
    });
  }

  it("fades to a floor nobody can hear, and one the browser will accept", () => {
    expect(FLOOR).toBeGreaterThan(0);
    expect(20 * Math.log10(FLOOR)).toBeLessThanOrEqual(-70);
  });
});
