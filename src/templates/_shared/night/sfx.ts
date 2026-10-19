"use client";

/**
 * The noises of a Halloween night, made on the spot with WebAudio: nothing is downloaded, and every
 * one is silent when the gift is muted or the browser has no audio device. Each is a few layers (a
 * click that starts it, a body that rings, air around it) played into one room (see ./foley), and
 * every pitch and shape is picked by the numbers in ./sound-math. They are quiet on purpose: the
 * sender's song is the floor, these are the room it plays in.
 */
import { guard } from "../synth";
import { busFor, filter, glide, hit, noiseSource, ring, send, sine, sprinkle, swell, sweepPan, tap, wobble, bubble, type Voice } from "./foley";
import { BELL, BOTTLE_MODES, CELESTA, DOOR_MODES, GLASS, RIND_MODES, bellHz, between, bubbleSpec, clamp, creakPitch, creakSlips, dB, glassHz, grains, sparkHz, thunderEnvelope } from "./sound-math";

/**
 * Where each sound sits in the mix, in dB against how it is built. Found by rendering each one under
 * many seeds and measuring its loudest peak, against a target of its own: a thunderclap and a knock
 * peak at -9 dBFS, a cork at -10, a creak at -17, a planchette's scrape at -24. A sound that is turned
 * up or down is turned here, without touching its design.
 */
const MIX = {
  thunder: -13.3,
  creak: -13.4,
  scrape: -8,
  tink: 1,
  whoosh: 1.8,
  flutter: -5.2,
  bubbles: -3.5,
  splash: -5.1,
  cork: -11.2,
  sparkle: 4.8,
  ignite: -0.9,
  carve: -8,
  thunk: -1.6,
  chime: 0.3,
  knock: -7.1,
};

/** The arch of a sound that comes up out of nothing and goes back into it. */
const arch = (x: number) => Math.sin(Math.PI * clamp(x, 0, 1)) ** 0.7;

/** A short click of filtered noise: the dry edge of a strike, a tap of the tongue on a bottle. */
function click(v: Voice, at: number, level: number, hz: number, q: number, decay: number, o: { wet?: number; pan?: number } = {}) {
  const src = noiseSource(v, "white", at, decay + 0.02);
  const g = v.c.createGain();
  hit(g.gain, at, level, 0.0003, decay);
  src.connect(filter(v.c, "bandpass", hz, q)).connect(g);
  send(v, g, { dry: 1, wet: o.wet ?? 0.1, pan: o.pan });
}

/**
 * Thunder: a crack if the strike is near, then a long low roll that darkens as it goes, which is what
 * distance does to a sound. `near` is 0 (far off) to 1 (overhead).
 */
const thunder = (v: Voice, near = 0.6) => {
  const { c, t, rnd } = v;
  // Distance does three things to thunder: it takes the crack out, it shortens the roll, and it makes it quieter.
  const k = dB(MIX.thunder) * (0.5 + 0.5 * near);
  const length = between(rnd, 2.2, 2.8) + 1.6 * near;
  // The roll: two slabs of dark noise, one to each side, swelling and fading on their own schedules.
  [-0.3, 0.3].forEach((side, i) => {
    const slab = noiseSource(v, "brown", t, length);
    const dark = filter(c, "lowpass", 300 + 520 * near, 0.6);
    glide(dark.frequency, t, 300 + 520 * near, 72, length * 0.9);
    const rolls = c.createGain();
    rolls.gain.setValueAtTime(0, t);
    for (const [at, level] of thunderEnvelope(rnd, length)) rolls.gain.linearRampToValueAtTime(level * (i ? 0.8 : 1), t + at);
    slab.connect(dark).connect(rolls);
    send(v, rolls, { dry: 1, wet: 0.45, pan: side, level: 3.4 * k });
  });
  // The growl: the same roll in the middle of the voice, where a phone's speaker lives and the weight cannot reach.
  const growl = noiseSource(v, "pink", t, length);
  const throat = filter(c, "bandpass", 900, 0.6);
  glide(throat.frequency, t, 900, 240, length * 0.85);
  const gg = c.createGain();
  gg.gain.setValueAtTime(0, t);
  for (const [at, level] of thunderEnvelope(rnd, length)) gg.gain.linearRampToValueAtTime(level, t + at);
  growl.connect(throat).connect(gg);
  send(v, gg, { dry: 1, wet: 0.4, level: 1.5 * k });
  // The weight under it: a sine falling through the floor of hearing.
  const boom = c.createGain();
  hit(boom.gain, t + 0.02, 0.5 * k, 0.03, 1.4);
  sine(v, t + 0.02, 1.6, [58, 30]).connect(boom);
  send(v, boom, { dry: 1, wet: 0.2 });
  // The crack, only if the lightning was close: a hard snap, then the air sizzling along the bolt.
  if (near > 0.25) {
    const snap = noiseSource(v, "white", t, 0.5);
    const bright = filter(c, "highpass", 1100);
    const top = filter(c, "lowpass", 5200);
    snap.connect(bright).connect(top);
    const crack = c.createGain();
    hit(crack.gain, t, 0.55 * near * k, 0.001, 0.07);
    const sizzle = c.createGain();
    sprinkle(sizzle.gain, null, t, grains(rnd, { length: 0.34, rate: 70, hz: [2000, 2000], len: [0.004, 0.012], level: [0.12, 0.35], shape: (x) => (1 - x) ** 1.4 }).map((g) => ({ ...g, level: g.level * near * k })));
    top.connect(crack);
    top.connect(sizzle);
    send(v, crack, { dry: 1, wet: 0.3, pan: 0.1 });
    send(v, sizzle, { dry: 1, wet: 0.3, pan: -0.1 });
  }
};

/**
 * A hinge that has not been oiled: a sawtooth voice sliding up and down, set singing in the places
 * wood and iron resonate, and broken into the quick sticks and slips of friction.
 */
const creak = (v: Voice) => {
  const { c, t, rnd } = v;
  const k = dB(MIX.creak);
  const length = between(rnd, 0.95, 1.35);
  const voice = c.createOscillator();
  voice.type = "sawtooth";
  voice.frequency.setValueCurveAtTime(Float32Array.from(creakPitch(rnd, 28)), t, length);
  voice.start(t);
  voice.stop(t + length + 0.05);
  const mix = c.createGain();
  for (const [hz, q, gain] of [[520, 7, 4], [1250, 9, 2.8], [2400, 6, 1.1]] as const) {
    const g = c.createGain();
    g.gain.value = gain;
    voice.connect(filter(c, "bandpass", hz, q)).connect(g).connect(mix);
  }
  const rasp = noiseSource(v, "pink", t, length);
  const rg = c.createGain();
  rg.gain.value = 1.4;
  rasp.connect(filter(c, "bandpass", 1500, 1.8)).connect(rg).connect(mix);
  // Sticking and slipping: the amplitude never settles, and never repeats itself.
  const slip = c.createGain();
  slip.gain.setValueAtTime(0.16, t);
  for (const s of creakSlips(rnd, length)) {
    slip.gain.linearRampToValueAtTime(s.amp, t + s.at + 0.004);
    slip.gain.exponentialRampToValueAtTime(0.16, t + s.at + s.len);
  }
  const shaped = c.createGain();
  swell(shaped.gain, t, 1, 0.12, length * 0.5, length * 0.35);
  mix.connect(slip).connect(shaped);
  // The groan of the wood the hinge is screwed into.
  const groan = c.createGain();
  swell(groan.gain, t, 0.05, 0.2, length * 0.4, length * 0.3);
  sine(v, t, length, [84, 104]).connect(groan);
  const out = c.createGain();
  shaped.connect(out);
  groan.connect(out);
  send(v, out, { dry: 1, wet: 0.25, pan: between(rnd, -0.15, 0.15), level: 0.9 * k });
};

/** Wood sliding on wood: the planchette moving. `ms` is how long it travels. */
const scrape = (v: Voice, ms = 450) => {
  const { c, t, rnd } = v;
  const k = dB(MIX.scrape);
  const length = clamp(ms / 1000, 0.22, 1.1);
  const mix = c.createGain();
  // The friction itself, always faltering a little.
  const grit = noiseSource(v, "pink", t, length);
  const band = filter(c, "bandpass", 900, 0.9);
  glide(band.frequency, t, between(rnd, 750, 1000), between(rnd, 1300, 1800), length);
  const gg = c.createGain();
  wobble(gg.gain, t, length, 38, 0.45, 1, arch, rnd);
  grit.connect(band).connect(gg).connect(mix);
  // The weight of the wood under it.
  const weight = noiseSource(v, "brown", t, length);
  const wg = c.createGain();
  swell(wg.gain, t, 0.5, length * 0.3, length * 0.2, length * 0.45);
  weight.connect(filter(c, "lowpass", 420)).connect(wg).connect(mix);
  // A hair of air on top.
  const air = noiseSource(v, "white", t, length);
  const ag = c.createGain();
  wobble(ag.gain, t, length, 30, 0.3, 1, arch, rnd);
  air.connect(filter(c, "highpass", 4200)).connect(filter(c, "lowpass", 8000)).connect(ag);
  const ar = c.createGain();
  ar.gain.value = 0.07;
  ag.connect(ar).connect(mix);
  send(v, mix, { dry: 1, wet: 0.15, pan: between(rnd, -0.2, 0.2), level: 0.55 * k });
};

/**
 * A fingertip on a wine glass: a letter lighting up. The pitch follows a pentatonic scale, so a word
 * of them plays a small tune; `rise` climbs it instead, for things lighting one after another.
 */
const tink = (v: Voice, step = 0, mode: "walk" | "rise" = "walk") => {
  const { t, rnd } = v;
  const k = dB(MIX.tink);
  const hz = glassHz(step, mode) * between(rnd, 0.998, 1.002);
  const pan = between(rnd, -0.3, 0.3);
  ring(v, t, hz, GLASS, { level: 0.09 * k, decay: 1.15, attack: 0.004, wet: 0.45, pan });
  // A twin a hair out of tune, so it shimmers the way a real glass does.
  ring(v, t, hz * 1.0032, [GLASS[0]], { level: 0.05 * k, decay: 1, attack: 0.004, wet: 0.4, pan });
  click(v, t, 0.02 * k, 5200, 1, 0.006, { wet: 0.2, pan });
};

/** Air moving through a room: a rising sweep, for gusts and things arriving. */
const whoosh = (v: Voice) => {
  const { c, t, rnd } = v;
  const k = dB(MIX.whoosh);
  const length = between(rnd, 0.34, 0.5);
  const mix = c.createGain();
  const air = noiseSource(v, "pink", t, length);
  const band = filter(c, "bandpass", 400, 1.1);
  glide(band.frequency, t, between(rnd, 300, 420), between(rnd, 2200, 3000), length);
  const g = c.createGain();
  swell(g.gain, t, 0.5, length * 0.5, 0, length * 0.5);
  air.connect(band).connect(g).connect(mix);
  const hiss = noiseSource(v, "white", t, length);
  const hg = c.createGain();
  swell(hg.gain, t, 0.06, length * 0.55, 0, length * 0.45);
  hiss.connect(filter(c, "highpass", 3200)).connect(filter(c, "lowpass", 9000)).connect(hg).connect(mix);
  const dir = rnd() < 0.5 ? -1 : 1;
  send(v, sweepPan(v, mix, t, length, dir * -0.5, dir * 0.5), { dry: 1, wet: 0.3, level: k });
};

/** Wing-beats: bats taking off. A hundred small leathery flaps, scattered to either side, in a stir of air. */
const flutter = (v: Voice) => {
  const { c, t, rnd } = v;
  const k = dB(MIX.flutter);
  const length = between(rnd, 0.8, 1.05);
  for (const side of [-1, 1]) {
    // The flaps: soft, leathery, each a little different in pitch and none of them sharp.
    const src = noiseSource(v, "pink", t, length);
    const band = filter(c, "bandpass", 900, 1.6);
    const g = c.createGain();
    sprinkle(g.gain, band.frequency, t, grains(rnd, { length, rate: 11, hz: [450, 1700], len: [0.026, 0.055], level: [0.35, 1] }), 0.008);
    src.connect(band).connect(g);
    send(v, g, { dry: 1, wet: 0.25, pan: side * 0.45, level: 0.6 * k });
    // The push of air under each beat.
    const push = noiseSource(v, "pink", t, length);
    const low = filter(c, "bandpass", 380, 0.7);
    const pg = c.createGain();
    sprinkle(pg.gain, low.frequency, t, grains(rnd, { length, rate: 9, hz: [280, 520], len: [0.03, 0.06], level: [0.4, 1] }), 0.01);
    push.connect(low).connect(pg);
    send(v, pg, { dry: 1, wet: 0.2, pan: side * 0.3, level: 0.9 * k });
  }
  const air = noiseSource(v, "pink", t, length);
  const ag = c.createGain();
  swell(ag.gain, t, 0.22, length * 0.3, 0, length * 0.6);
  air.connect(filter(c, "bandpass", 900, 0.8)).connect(ag);
  send(v, ag, { dry: 1, wet: 0.2, level: k });
};

/** One to three bubbles breaking the surface of something thick: each a different size, so each its own note. */
const bubbles = (v: Voice) => {
  const { t, rnd } = v;
  const k = dB(MIX.bubbles);
  const n = rnd() < 0.55 ? 1 : rnd() < 0.6 ? 2 : 3;
  let at = t;
  for (let i = 0; i < n; i++) {
    bubble(v, at, bubbleSpec(rnd, between(rnd, 0.3, 1) * (1 - i * 0.25)), { level: 0.25 * k, pan: between(rnd, -0.3, 0.3) });
    at += between(rnd, 0.06, 0.14);
  }
};

/** Something dropped into liquid: a plunk, the water thrown up, drops falling back, and a big bubble following it down. */
const splash = (v: Voice) => {
  const { c, t, rnd } = v;
  const k = dB(MIX.splash);
  const plunk = c.createGain();
  hit(plunk.gain, t, 0.45 * k, 0.0015, 0.09);
  sine(v, t, 0.14, [between(rnd, 380, 460), 150]).connect(plunk);
  send(v, plunk, { dry: 1, wet: 0.2 });
  click(v, t, 0.25 * k, 520, 1.2, 0.045, { wet: 0.2 });
  const spray = noiseSource(v, "pink", t, 0.5);
  const band = filter(c, "bandpass", 2400, 0.9);
  glide(band.frequency, t, 2600, 650, 0.42);
  const sg = c.createGain();
  hit(sg.gain, t, 0.42 * k, 0.006, 0.26);
  spray.connect(band).connect(sg);
  send(v, sg, { dry: 1, wet: 0.3 });
  for (let i = 0; i < 6; i++) bubble(v, t + between(rnd, 0.07, 0.5), bubbleSpec(rnd, between(rnd, 0, 0.25)), { level: 0.16 * k, pan: between(rnd, -0.4, 0.4) });
  bubble(v, t + 0.045, bubbleSpec(rnd, 0.9), { level: 0.3 * k });
};

/** A cork leaving a bottle: a hollow note that falls as it leaves, the bottle ringing after it, and a puff of air. */
const cork = (v: Voice) => {
  const { c, t, rnd } = v;
  const k = dB(MIX.cork);
  const f = between(rnd, 0.95, 1.05);
  const pop = c.createGain();
  hit(pop.gain, t, 0.8 * k, 0.0006, 0.045);
  sine(v, t, 0.07, [900 * f, 300 * f]).connect(pop);
  send(v, pop, { dry: 1, wet: 0.2 });
  tap(v, t, BOTTLE_MODES.map((m) => ({ ...m, hz: m.hz * f })), { level: 4 * k, burst: 0.0025, tone: 2600, wet: 0.3 });
  click(v, t, 0.07 * k, 3000, 0.8, 0.006);
  const puff = noiseSource(v, "pink", t, 0.16);
  const pg = c.createGain();
  hit(pg.gain, t + 0.01, 0.025 * k, 0.006, 0.12);
  puff.connect(filter(c, "bandpass", 2400, 0.7)).connect(pg);
  send(v, pg, { dry: 1, wet: 0.2 });
};

/** Magic dust: nine small bells, climbing in no hurry and not in step, with a breath of high air above them. */
const sparkle = (v: Voice) => {
  const { c, t, rnd } = v;
  const k = dB(MIX.sparkle);
  let at = t;
  let degree = between(rnd, 0, 2);
  for (let i = 0; i < 9; i++) {
    ring(v, at, sparkHz(Math.floor(degree)), CELESTA, { level: 0.05 * k * between(rnd, 0.6, 1), decay: between(rnd, 0.4, 0.65), attack: 0.002, wet: 0.5, pan: between(rnd, -0.6, 0.6) });
    degree += between(rnd, 0.3, 1.1);
    at += between(rnd, 0.04, 0.085);
  }
  const dust = noiseSource(v, "white", t, 0.9);
  const dg = c.createGain();
  swell(dg.gain, t, 0.01 * k, 0.12, 0, 0.55);
  dust.connect(filter(c, "highpass", 6000)).connect(filter(c, "lowpass", 12000)).connect(dg);
  send(v, dg, { dry: 1, wet: 0.3 });
};

/** A wick catching: the match's dry rasp, the soft whoomp of the flame taking, and a small flame settling with a crackle in it. */
const ignite = (v: Voice) => {
  const { c, t, rnd } = v;
  const k = dB(MIX.ignite);
  const scratch = noiseSource(v, "pink", t, 0.2);
  const sg = c.createGain();
  wobble(sg.gain, t, 0.16, 120, 0.4, 1, (x) => x ** 1.4, rnd);
  scratch.connect(filter(c, "bandpass", 2800, 1.3)).connect(sg);
  send(v, sg, { dry: 1, wet: 0.1, level: 0.16 * k });
  const flare = t + 0.1;
  const puff = noiseSource(v, "pink", flare, 0.6);
  const open = filter(c, "bandpass", 350, 0.7);
  glide(open.frequency, flare, 350, 1800, 0.28);
  const pg = c.createGain();
  hit(pg.gain, flare, 0.9 * k, 0.05, 0.4);
  puff.connect(open).connect(pg);
  send(v, pg, { dry: 1, wet: 0.35 });
  const thump = c.createGain();
  hit(thump.gain, flare, 0.25 * k, 0.01, 0.25);
  sine(v, flare, 0.3, [170, 85]).connect(thump);
  send(v, thump, { dry: 1, wet: 0.2 });
  const flame = noiseSource(v, "pink", flare + 0.1, 1.2);
  const fg = c.createGain();
  wobble(fg.gain, flare + 0.1, 1.2, 14, 0.5, 1, (x) => (1 - x) ** 1.2 * Math.min(1, x * 8), rnd);
  flame.connect(filter(c, "bandpass", 650, 0.6)).connect(fg);
  send(v, fg, { dry: 1, wet: 0.2, level: 0.05 * k });
  for (let i = 0; i < 6; i++) click(v, flare + between(rnd, 0.2, 1), between(rnd, 0.05, 0.14) * k, 3400, 0.9, 0.004, { pan: between(rnd, -0.4, 0.4) });
};

/** A blade scoring a rind: a crunch that comes in grains, the edge scraping, and a small wet bite as it goes in. `ms` is the length of the cut. */
const carve = (v: Voice, ms = 450) => {
  const { c, t, rnd } = v;
  const k = dB(MIX.carve);
  const length = clamp(ms / 1000, 0.18, 1);
  const rind = noiseSource(v, "pink", t, length);
  const lo = filter(c, "bandpass", 1000, 1.1);
  const g = c.createGain();
  sprinkle(g.gain, lo.frequency, t, grains(rnd, { length, rate: 55, hz: [650, 1700], len: [0.01, 0.022], level: [0.45, 1], shape: (x) => Math.min(1, x * 8, (1 - x) * 5) }));
  rind.connect(lo).connect(g);
  send(v, g, { dry: 1, wet: 0.1, level: 0.9 * k });
  const edge = noiseSource(v, "white", t, length);
  const eg = c.createGain();
  wobble(eg.gain, t, length, 40, 0.3, 1, arch, rnd);
  edge.connect(filter(c, "bandpass", 3800, 1.2)).connect(filter(c, "lowpass", 6000)).connect(eg);
  send(v, eg, { dry: 1, wet: 0.05, level: 0.06 * k });
  tap(v, t, [{ hz: 700, q: 3, gain: 1 }, { hz: 1300, q: 3, gain: 0.5 }], { level: 0.5 * k, burst: 0.012, tone: 3000, wet: 0.08 });
};

/** A cut-out piece dropping onto the table: a soft knock that tips and settles. */
const thunk = (v: Voice) => {
  const { c, t, rnd } = v;
  const k = dB(MIX.thunk);
  const f = between(rnd, 190, 290);
  const pan = between(rnd, -0.25, 0.25);
  const modes = (m: number) => RIND_MODES.map((r) => ({ ...r, hz: r.hz * f * m }));
  tap(v, t, modes(1), { level: 9 * k, burst: 0.0025, tone: 3000, wet: 0.15, pan });
  const body = c.createGain();
  hit(body.gain, t, 0.07 * k, 0.001, 0.07);
  sine(v, t, 0.1, [f * 1.15, f * 0.55]).connect(body);
  send(v, body, { dry: 1, wet: 0.1, pan });
  tap(v, t + between(rnd, 0.05, 0.08), modes(1.4), { level: 3.5 * k, burst: 0.002, tone: 2600, wet: 0.1, pan });
  tap(v, t + between(rnd, 0.11, 0.14), modes(1.7), { level: 1.5 * k, burst: 0.0018, tone: 2600, wet: 0.1, pan });
};

/** A bell, struck once, left to ring. Each call is the next note up, so a run of them is a phrase. */
const chime = (v: Voice, step = 0) => {
  const { t } = v;
  const k = dB(MIX.chime);
  ring(v, t, bellHz(step), BELL, { level: 0.07 * k, decay: 3.2, attack: 0.002, wet: 0.5 });
  click(v, t, 0.03 * k, 3200, 1, 0.012);
};

/** Knuckles on a heavy door, twice: the wood's own low notes, a dull thump, and a dry tick where skin meets it. */
const knock = (v: Voice) => {
  const { c, t, rnd } = v;
  const k = dB(MIX.knock);
  const gap = between(rnd, 0.2, 0.26);
  [0, gap].forEach((at, i) => {
    const soft = i === 0 ? 1 : 0.82;
    const f = i === 0 ? 1 : 0.97;
    tap(v, t + at, DOOR_MODES.map((m) => ({ ...m, hz: m.hz * f })), { level: 22 * soft * k, burst: 0.002, tone: 2400, wet: 0.3 });
    const thump = c.createGain();
    hit(thump.gain, t + at, 0.06 * soft * k, 0.001, 0.1);
    sine(v, t + at, 0.16, [140 * f, 80 * f]).connect(thump);
    send(v, thump, { dry: 1, wet: 0.25 });
    click(v, t + at, 0.15 * soft * k, 2000, 1.2, 0.006);
  });
};

/** Every effect as a function of a voice, for anything that wants to render them without a speaker. */
export const EFFECTS = { thunder, creak, scrape, tink, whoosh, flutter, bubbles, splash, cork, sparkle, ignite, carve, thunk, chime, knock };

const play =
  <A extends unknown[]>(effect: (v: Voice, ...args: A) => void) =>
  (muted: boolean, ...args: A) =>
    guard(muted, (c, t) => effect({ c, t: t + 0.005, bus: busFor(c), rnd: Math.random }, ...args));

/** Thunder: a crack, then a long low roll. `near` is 0 (far off) to 1 (overhead). */
export const playThunder = play(thunder);
/** A hinge that has not been oiled. */
export const playCreak = play(creak);
/** Wood sliding on wood: the planchette moving, for `ms` milliseconds. */
export const playScrape = play(scrape);
/** A fingertip on glass: a letter lighting up. `step` picks the note along the word. */
export const playTink = play(tink);
/** Air moving through a room: a rising sweep, for gusts and things arriving. */
export const playWhoosh = play(whoosh);
/** Wing-beats: bats taking off. */
export const playFlutter = play(flutter);
/** Bubbles breaking the surface of something thick. */
export const playBubble = play(bubbles);
/** Something dropped into liquid. */
export const playSplash = play(splash);
/** A cork leaving a bottle. */
export const playCork = play(cork);
/** Magic dust: a quick climb of small bells. */
export const playSparkle = play(sparkle);
/** A wick catching. */
export const playIgnite = play(ignite);
/** A blade scoring a rind, for `ms` milliseconds. */
export const playCarve = play(carve);
/** A cut-out piece dropping onto the table. */
export const playThunk = play(thunk);
/** A bell, struck once, left to ring. `step` picks the note. */
export const playChime = play(chime);
/** Knuckles on a door, twice. */
export const playKnock = play(knock);
