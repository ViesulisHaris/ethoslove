"use client";

import { guard, noise, tone } from "../_shared/synth";
import { secondsAt, type Tune } from "./tunes";

/**
 * The box's own sounds, made on the spot with WebAudio: the ratchet as the key is wound, and the
 * comb. A music box's tine is a little steel tongue: a clear fundamental that rings and fades, a
 * breath of the octave, and a very short high "ting" as the pin lets go of it (a clamped bar's
 * first overtone sits at about 6.27 times its note). A small room of reverb puts it on a vanity.
 */

const hz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

/** One partial of a pluck: straight up, then an exponential fade. */
function partial(c: AudioContext, out: AudioNode, freq: number, at: number, peak: number, decay: number) {
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, at);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + decay + 0.05);
}

/** One tine, plucked. Low tines ring longer than high ones. */
export function pluck(c: AudioContext, out: AudioNode, midi: number, at: number, vel: number) {
  const f = hz(midi);
  const ring = Math.min(3.6, Math.max(0.7, 2.4 * (660 / f) ** 0.55));
  const peak = 0.2 * vel;
  partial(c, out, f, at, peak, ring);
  if (f < 2400) partial(c, out, f * 2, at, peak * 0.16, ring * 0.32);
  if (f * 6.27 < 15000) partial(c, out, f * 6.27, at, peak * 0.09, 0.06);
}

/** A soft room: two seconds of decaying noise as an impulse response. */
function room(c: AudioContext): ConvolverNode {
  const seconds = 1.9;
  const length = Math.floor(c.sampleRate * seconds);
  const ir = c.createBuffer(2, length, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp((-i / length) * 6.5);
  }
  const conv = c.createConvolver();
  conv.buffer = ir;
  return conv;
}

type Chain = { c: AudioContext; input: GainNode; master: GainNode };

/** The comb's voice: tines into a gentle low-pass, some room, and a master fader for mute and fade. */
function chain(c: AudioContext): Chain {
  const input = c.createGain();
  const soften = c.createBiquadFilter();
  soften.type = "lowpass";
  soften.frequency.value = 8200;
  const master = c.createGain();
  master.gain.value = 1;
  const wet = c.createGain();
  wet.gain.value = 0.28;
  input.connect(soften);
  soften.connect(master);
  soften.connect(room(c)).connect(wet).connect(master);
  master.connect(c.destination);
  return { c, input, master };
}

/** The shared audio context, awake, or null when there is no sound to be had. */
function context(): AudioContext | null {
  let found: AudioContext | null = null;
  guard(false, (c) => {
    found = c;
  });
  return found;
}

/* -------------------------------------------------------------- the ratchet */

/** One tooth of the ratchet: a dry tick that climbs as the spring tightens (`tension` 0 to 1). */
export const playClick = (muted: boolean, tension: number) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.018, 0.2 + tension * 0.08, "bandpass", 2600 + tension * 1900);
    tone(c, "triangle", 3000 + tension * 900, 2200, t, 0.012, 0.035);
  });

/** A full turn caught: a heavier click, and one tine of the tune's chord sounding. */
export const playTurn = (muted: boolean, midi: number) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.03, 0.32, "bandpass", 1700);
    tone(c, "sine", 190, 90, t, 0.06, 0.1);
    pluck(c, c.destination, midi, t + 0.03, 0.75);
  });

/** The lid lifting on its hinge: a soft wooden creak and the catch letting go. */
export const playLid = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "triangle", 2300, 1500, t, 0.03, 0.05);
    noise(c, t + 0.05, 0.42, 0.05, "bandpass", 820);
    noise(c, t + 0.2, 0.3, 0.035, "bandpass", 1150);
  });

/* ----------------------------------------------------------------- the tune */

export type TunePlayer = {
  /** Turn the comb off and on without losing its place. */
  setMuted: (muted: boolean) => void;
  /** Stop for good: the last tines fade and the nodes are let go. */
  stop: () => void;
};

const LOOKAHEAD = 0.3;

/**
 * Plays the tune against `clock`, the seconds since its first pin (negative before it). Pins are
 * scheduled a little ahead on the audio clock, from a fixed anchor between the two clocks, so they
 * land exactly in time; the anchor only moves when the clock stalls (the tab was hidden and the
 * box paused), and then the tune carries on from where it stopped.
 */
export function playTune(tune: Tune, clock: () => number, muted: boolean): TunePlayer | null {
  const c = context();
  if (!c) return null;
  let parts: Chain;
  try {
    parts = chain(c);
  } catch {
    return null;
  }
  parts.master.gain.value = muted ? 0 : 1;
  const times = tune.pins.map((p) => secondsAt(tune, p.at));
  let next = 0;
  let anchor = { audio: c.currentTime, clock: clock() };

  const tick = () => {
    const now = clock();
    const expected = anchor.audio + (now - anchor.clock);
    if (Math.abs(expected - c.currentTime) > 0.12) anchor = { audio: c.currentTime, clock: now };
    while (next < tune.pins.length && times[next] < now + LOOKAHEAD) {
      const when = anchor.audio + (times[next] - anchor.clock);
      const pin = tune.pins[next];
      next++;
      if (when < c.currentTime - 0.05) continue;
      try {
        pluck(c, parts.input, pin.midi, Math.max(when, c.currentTime + 0.005), pin.vel);
      } catch {
        // a node refused: the next pin will try again
      }
    }
    if (next >= tune.pins.length) window.clearInterval(timer);
  };
  const timer = window.setInterval(tick, 40);
  tick();

  return {
    setMuted: (m) => parts.master.gain.setTargetAtTime(m ? 0 : 1, c.currentTime, 0.04),
    stop: () => {
      window.clearInterval(timer);
      parts.master.gain.setTargetAtTime(0, c.currentTime, 0.12);
      window.setTimeout(() => {
        try {
          parts.master.disconnect();
        } catch {
          // already gone
        }
      }, 1500);
    },
  };
}
