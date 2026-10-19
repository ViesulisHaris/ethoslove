"use client";

/**
 * The noises of a Halloween night, made on the spot with WebAudio (see ../synth): nothing is
 * downloaded, and every one is silent when the gift is muted or the browser has no audio device.
 * They are quiet on purpose: the sender's song is the floor, these are the room it plays in.
 */
import { guard, noise, tone } from "../synth";

/** Thunder: a crack, then a long low roll. */
export const playThunder = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.14, 0.15, "highpass", 2400);
    noise(c, t + 0.08, 2.4, 0.32, "lowpass", 170);
    noise(c, t + 0.55, 1.9, 0.16, "lowpass", 110);
    tone(c, "sine", 62, 34, t + 0.05, 1.6, 0.2);
  });

/** A hinge that has not been oiled: two slow saw glides over a rasp. */
export const playCreak = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "sawtooth", 150, 96, t, 0.55, 0.03);
    tone(c, "sawtooth", 98, 172, t + 0.5, 0.5, 0.026);
    tone(c, "square", 64, 58, t + 0.2, 0.7, 0.014);
    noise(c, t, 0.9, 0.045, "bandpass", 620);
  });

/** Wood sliding on wood: the planchette moving. */
export const playScrape = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.34, 0.08, "lowpass", 520);
    noise(c, t + 0.03, 0.26, 0.04, "bandpass", 1500);
  });

/** A fingertip on glass: a letter lighting up. `step` lifts the pitch a little along the word. */
export const playTink = (muted: boolean, step = 0) =>
  guard(muted, (c, t) => {
    const f = 1040 + (step % 7) * 70;
    tone(c, "sine", f, f * 1.12, t, 0.16, 0.05);
    tone(c, "triangle", f * 2, f * 2.02, t, 0.09, 0.012);
  });

/** Air moving through a room: a rising sweep, for gusts and things arriving. */
export const playWhoosh = (muted: boolean) =>
  guard(muted, (c, t) => {
    for (let i = 0; i < 7; i++) noise(c, t + i * 0.055, 0.15, 0.06, "bandpass", 420 + i * 340);
  });

/** Wing-beats: bats taking off. */
export const playFlutter = (muted: boolean) =>
  guard(muted, (c, t) => {
    for (let i = 0; i < 6; i++) noise(c, t + i * 0.045, 0.04, 0.12 - i * 0.015, "bandpass", 1300 + i * 160);
  });

/** One bubble breaking the surface of something thick. */
export const playBubble = (muted: boolean) =>
  guard(muted, (c, t) => {
    const r = Math.random();
    tone(c, "sine", 200 + r * 160, 480 + r * 220, t, 0.09, 0.06);
  });

/** Something dropped into liquid. */
export const playSplash = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.36, 0.15, "bandpass", 900);
    tone(c, "sine", 330, 110, t, 0.24, 0.11);
    tone(c, "sine", 520, 180, t + 0.06, 0.2, 0.05);
  });

/** A cork leaving a bottle. */
export const playCork = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "sine", 220, 70, t, 0.16, 0.28);
    noise(c, t, 0.12, 0.16, "bandpass", 1500);
  });

/** Magic dust: a quick climb of small bells. */
export const playSparkle = (muted: boolean) =>
  guard(muted, (c, t) => {
    for (let i = 0; i < 5; i++) tone(c, "sine", 1100 + i * 260, 1480 + i * 260, t + i * 0.06, 0.3, 0.045);
  });

/** A wick catching: a soft whoomp and a few crackles. */
export const playIgnite = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.55, 0.2, "lowpass", 900);
    tone(c, "triangle", 90, 220, t, 0.6, 0.11);
    for (let i = 0; i < 5; i++) noise(c, t + 0.3 + i * 0.09 + Math.random() * 0.05, 0.03, 0.09, "highpass", 3200);
  });

/** A blade scoring a rind. */
export const playCarve = (muted: boolean) =>
  guard(muted, (c, t) => {
    for (let i = 0; i < 7; i++) noise(c, t + i * 0.07, 0.06, 0.1, "bandpass", 1900 + i * 50);
  });

/** A cut-out piece dropping onto the table. */
export const playThunk = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "sine", 150, 70, t, 0.1, 0.16);
    noise(c, t, 0.06, 0.07, "lowpass", 700);
  });

/** A bell, struck once, left to ring. */
export const playChime = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "sine", 523, 520, t, 1.7, 0.1);
    tone(c, "sine", 784, 780, t, 1.2, 0.06);
    tone(c, "sine", 1318, 1310, t, 0.9, 0.03);
  });

/** Knuckles on a door, twice. */
export const playKnock = (muted: boolean) =>
  guard(muted, (c, t) => {
    for (const at of [0, 0.24]) {
      tone(c, "sine", 130, 52, t + at, 0.16, 0.3);
      noise(c, t + at, 0.05, 0.08, "lowpass", 400);
    }
  });
