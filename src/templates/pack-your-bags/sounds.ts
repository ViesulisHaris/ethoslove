"use client";

import { guard, noise, tone } from "../_shared/synth";

/**
 * The trip's noises, all made on the spot: a tag tossed into the case, the lid, the zip, the
 * departures board's clatter, the terminal chime and the stub tearing off. Each is silent when the
 * gift is muted and harmless when the browser has no audio at all.
 */

/**
 * One leaf of a split-flap tile falling: a very short, bright tick. The board fires hundreds of
 * these, so the noise is made once per audio context and replayed, instead of built per click.
 */
const clickBuffers = new WeakMap<AudioContext, AudioBuffer>();

function clickBuffer(c: AudioContext): AudioBuffer {
  const cached = clickBuffers.get(c);
  if (cached) return cached;
  const n = Math.floor(c.sampleRate * 0.018);
  const buffer = c.createBuffer(1, n, c.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 4;
  clickBuffers.set(c, buffer);
  return buffer;
}

/** A clatter of `count` leaves landing at once. Kept very quiet: it sits under the music, not over it. */
export const playFlaps = (muted: boolean, count: number) =>
  guard(muted, (c, t) => {
    const src = c.createBufferSource();
    src.buffer = clickBuffer(c);
    src.playbackRate.value = 0.85 + Math.random() * 0.4;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 2600 + Math.random() * 1400;
    f.Q.value = 1.4;
    const g = c.createGain();
    g.gain.value = Math.min(0.1, 0.035 + count * 0.008);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  });

/** A tag leaving the hand: a short papery swish. */
export const playToss = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.14, 0.12, "bandpass", 2400);
  });

/** Landing in the case, on the clothes: a soft pat and a small bright tick. */
export const playPacked = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.06, 0.18, "lowpass", 900);
    tone(c, "triangle", 1760, 1480, t + 0.04, 0.07, 0.07);
  });

/** The lid coming down: a leathery thump with some weight under it. */
export const playLid = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "sine", 150, 55, t, 0.22, 0.3);
    noise(c, t, 0.09, 0.22, "lowpass", 600);
  });

/** A zip run in one go: a burst of teeth whose pitch climbs as it goes. */
export const playZip = (muted: boolean, seconds = 0.55) =>
  guard(muted, (c, t) => {
    const steps = 22;
    for (let i = 0; i < steps; i++) noise(c, t + (i / steps) * seconds, 0.02, 0.07, "bandpass", 1800 + i * 90);
  });

/** The terminal chime before an announcement: two soft notes, falling. */
export const playChime = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "sine", 880, 880, t, 0.9, 0.08);
    tone(c, "sine", 698.46, 698.46, t + 0.42, 1.1, 0.08);
  });

/** Card giving way along its perforations: a quick rip that rises. */
export const playTear = (muted: boolean) =>
  guard(muted, (c, t) => {
    for (let i = 0; i < 7; i++) noise(c, t + i * 0.028, 0.035, 0.16, "bandpass", 1400 + i * 260);
  });
