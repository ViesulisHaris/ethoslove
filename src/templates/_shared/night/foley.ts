"use client";

/**
 * The tools the night's sounds are built from, on top of WebAudio. Every sound is made of a few
 * layers (a click that starts it, a body that rings, air around it), each with its own envelope, and
 * all of them end in one room: a soft ceiling so nothing clips, and a reverb so nothing sounds like
 * it was recorded in a cupboard. The numbers live in ./sound-math, where they can be tested.
 */
import { mulberry32 } from "../random";
import { FLOOR, fillNoise, roomImpulse, softClipCurve, type Grain, type Mode, type NoiseKind, type Overtone, type Rnd } from "./sound-math";

/** Where a voice ends up: straight to the speakers, or through the room first. */
export type Bus = { dry: AudioNode; wet: AudioNode };

/** A sound being made: the context, the moment it starts, the bus it plays into, and where its luck comes from. */
export type Voice = { c: BaseAudioContext; t: number; bus: Bus; rnd: Rnd };

/**
 * How much of the room's own sound is mixed back in. The convolver is level-normalised and the room
 * filters take energy out, so a send of 1 comes back about 17 dB under the dry sound at 0.5; at 2.4 it is
 * a little under it, and the sends in ./sfx (0.2 to 0.5) put the tail 10 to 15 dB below.
 */
const ROOM_LEVEL = 2.4;

const buses = new WeakMap<BaseAudioContext, Bus>();
const noises = new WeakMap<BaseAudioContext, Record<string, AudioBuffer>>();

export function filter(c: BaseAudioContext, type: BiquadFilterType, hz: number, q = 0.7) {
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = hz;
  f.Q.value = q;
  return f;
}

/** The bus for a context, built the first time it is asked for: a stereo room, and a soft ceiling over everything. */
export function busFor(c: BaseAudioContext): Bus {
  const known = buses.get(c);
  if (known) return known;
  const ceiling = c.createWaveShaper();
  ceiling.curve = softClipCurve() as Float32Array<ArrayBuffer>;
  ceiling.oversample = "2x";
  ceiling.connect(c.destination);
  const dry = c.createGain();
  dry.connect(ceiling);
  const wet = c.createGain();
  const room = c.createConvolver();
  const [l, r] = roomImpulse(c.sampleRate, 2.1, mulberry32(7));
  const ir = c.createBuffer(2, l.length, c.sampleRate);
  ir.copyToChannel(l as Float32Array<ArrayBuffer>, 0);
  ir.copyToChannel(r as Float32Array<ArrayBuffer>, 1);
  room.buffer = ir;
  const level = c.createGain();
  level.gain.value = ROOM_LEVEL;
  // The room keeps out of the way of the low end and the hiss: the tail is a wash, not a second sound.
  wet.connect(room).connect(filter(c, "highpass", 190)).connect(filter(c, "lowpass", 6800)).connect(level).connect(ceiling);
  const bus = { dry, wet };
  buses.set(c, bus);
  return bus;
}

function noiseBuffer(c: BaseAudioContext, kind: NoiseKind) {
  const cache = noises.get(c) ?? {};
  noises.set(c, cache);
  const known = cache[kind];
  if (known) return known;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * 2.4), c.sampleRate);
  fillNoise(kind, buffer.getChannelData(0), mulberry32(kind === "white" ? 11 : kind === "pink" ? 23 : 37));
  cache[kind] = buffer;
  return buffer;
}

/** A stretch of noise, started somewhere random in a long loop so no two strikes are the same strike. */
export function noiseSource(v: Voice, kind: NoiseKind, at: number, length: number) {
  const src = v.c.createBufferSource();
  const buffer = noiseBuffer(v.c, kind);
  src.buffer = buffer;
  src.loop = true;
  src.start(at, v.rnd() * (buffer.duration - 0.3));
  src.stop(at + length + 0.03);
  return src;
}

/** Sends a sound to the speakers: how much dry, how much through the room, and where in the stereo field. */
export function send(v: Voice, node: AudioNode, o: { dry?: number; wet?: number; pan?: number; level?: number } = {}) {
  const { dry = 1, wet = 0.2, pan = 0, level = 1 } = o;
  let tail = node;
  if (pan !== 0 && typeof v.c.createStereoPanner === "function") {
    const p = v.c.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    tail.connect(p);
    tail = p;
  }
  for (const [amount, to] of [[dry, v.bus.dry], [wet, v.bus.wet]] as const) {
    if (amount <= 0) continue;
    const g = v.c.createGain();
    g.gain.value = amount * level;
    tail.connect(g).connect(to);
  }
}

/** Moves a sound across the stereo field while it plays: a wingbeat going past, a gust crossing a room. */
export function sweepPan(v: Voice, node: AudioNode, at: number, over: number, from: number, to: number): AudioNode {
  if (typeof v.c.createStereoPanner !== "function") return node;
  const p = v.c.createStereoPanner();
  p.pan.setValueAtTime(from, at);
  p.pan.linearRampToValueAtTime(to, at + over);
  node.connect(p);
  return p;
}

/** A level that never settles: it wanders between `lo` and `hi` about `rate` times a second, under the arch of `shape`. */
export function wobble(p: AudioParam, at: number, length: number, rate: number, lo: number, hi: number, shape: (x: number) => number, rnd: Rnd) {
  p.setValueAtTime(0, at);
  let x = 0;
  while (x < length) {
    p.linearRampToValueAtTime((lo + (hi - lo) * rnd()) * shape(x / length), at + x);
    x += (1 / rate) * (0.6 + 0.8 * rnd());
  }
  p.linearRampToValueAtTime(0, at + length);
}

/** A strike: up in `attack` seconds, then away exponentially over `decay`. */
export function hit(p: AudioParam, at: number, peak: number, attack: number, decay: number) {
  p.setValueAtTime(0, at);
  p.linearRampToValueAtTime(peak, at + attack);
  p.exponentialRampToValueAtTime(FLOOR, at + attack + decay);
}

/** A swell: up over `attack`, held for `hold`, then away over `release`. */
export function swell(p: AudioParam, at: number, peak: number, attack: number, hold: number, release: number) {
  p.setValueAtTime(0, at);
  p.linearRampToValueAtTime(peak, at + attack);
  if (hold > 0) p.setValueAtTime(peak, at + attack + hold);
  p.exponentialRampToValueAtTime(FLOOR, at + attack + hold + release);
}

/** Sweeps a parameter from one value to another along a curve that is even in pitch (or in loudness). */
export function glide(p: AudioParam, at: number, from: number, to: number, over: number) {
  p.setValueAtTime(from, at);
  p.exponentialRampToValueAtTime(to, at + over);
}

/** A sine that starts and stops itself: `hz` is a pitch, or a pitch it slides from and to. */
export function sine(v: Voice, at: number, length: number, hz: number | [number, number]) {
  const o = v.c.createOscillator();
  o.type = "sine";
  if (typeof hz === "number") o.frequency.value = hz;
  else glide(o.frequency, at, hz[0], hz[1], length);
  o.start(at);
  o.stop(at + length + 0.04);
  return o;
}

/** Plays a grain texture on a gain (and, where a grain carries a pitch, on a filter): every one a short breath of the noise. */
export function sprinkle(level: AudioParam, tone: AudioParam | null, at: number, list: readonly Grain[], attack = 0.003) {
  level.setValueAtTime(0, at);
  list.forEach((g, i) => {
    const start = at + g.at;
    const next = list[i + 1] ? at + list[i + 1].at : Infinity;
    const end = Math.min(start + Math.max(0.004, g.len), next - 0.0008);
    if (end <= start + 0.002) return;
    tone?.setValueAtTime(g.hz, start);
    level.linearRampToValueAtTime(g.level, Math.min(start + attack, end - 0.0005));
    level.exponentialRampToValueAtTime(FLOOR, end);
    level.setValueAtTime(0, end + 0.0002);
  });
}

/** Something struck that keeps ringing: each partial rises, then fades on its own clock. */
export function ring(v: Voice, at: number, hz: number, table: readonly Overtone[], o: { level: number; decay: number; attack?: number; dry?: number; wet?: number; pan?: number }) {
  const { c } = v;
  const attack = o.attack ?? 0.003;
  const mix = c.createGain();
  for (const p of table) {
    const f = hz * p.ratio + (p.beat ?? 0);
    if (f > 11000) continue;
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = f;
    const g = c.createGain();
    hit(g.gain, at, o.level * p.gain, attack, o.decay * p.ring);
    osc.connect(g).connect(mix);
    osc.start(at);
    osc.stop(at + attack + o.decay * p.ring + 0.05);
  }
  send(v, mix, { dry: o.dry, wet: o.wet, pan: o.pan });
}

/**
 * A knock, a tap, a drop: one short click of noise sets a handful of resonances ringing, and each
 * dies away at its own rate. What it is made of lives in the modes.
 *
 * The click fades out exponentially over `burst` seconds, which makes it a noise whose top end starts
 * to roll off at about 1500 / (burst in ms) Hz. So a burst of 2 ms excites resonances up to a kilohertz
 * and a burst of 7 ms wakes only the lowest of them: the shorter it is, the more of a knock is
 * high enough for a phone to play.
 */
export function tap(v: Voice, at: number, modes: readonly Mode[], o: { level: number; burst: number; tone: number; dry?: number; wet?: number; pan?: number }) {
  const { c } = v;
  const click = noiseSource(v, "white", at, o.burst + 0.02);
  const shaped = filter(c, "lowpass", o.tone, 0.7);
  const strike = c.createGain();
  hit(strike.gain, at, 1, 0.0004, o.burst);
  click.connect(shaped).connect(strike);
  const mix = c.createGain();
  mix.gain.value = o.level;
  for (const m of modes) {
    const g = c.createGain();
    g.gain.value = m.gain;
    strike.connect(filter(c, "bandpass", m.hz, m.q)).connect(g).connect(mix);
  }
  send(v, mix, { dry: o.dry, wet: o.wet, pan: o.pan });
}

/** A bubble rising through something thick: a sine that climbs as the bubble does, and is gone. */
export function bubble(v: Voice, at: number, b: { hz: number; rise: number; ring: number; level: number }, o: { level: number; wet?: number; pan?: number }) {
  const length = b.ring * 5;
  const mix = v.c.createGain();
  const body = v.c.createGain();
  hit(body.gain, at, o.level * b.level, 0.0015, b.ring * 3);
  sine(v, at, length, [b.hz, b.hz * b.rise]).connect(body).connect(mix);
  const overtone = v.c.createGain();
  hit(overtone.gain, at, o.level * b.level * 0.2, 0.001, b.ring * 1.5);
  sine(v, at, length, [b.hz * 2.7, b.hz * 2.7 * b.rise]).connect(overtone).connect(mix);
  send(v, mix, { dry: 1, wet: o.wet ?? 0.25, pan: o.pan });
}
