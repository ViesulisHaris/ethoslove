"use client";

/**
 * What the camera sounds like, made on the spot from the shared synth: the lens motor, the beep it
 * says hello with, the shutter, the buttons, and the printer. Every one is silent when muted.
 */
import { guard, noise, tone } from "../_shared/synth";

/** The lens motor running the barrel out: a gear-chattering buzz that climbs, then a click as it locks. */
export const playWhirr = (muted: boolean, seconds = 0.85) =>
  guard(muted, (c, t) => {
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.linearRampToValueAtTime(215, t + seconds * 0.5);
    osc.frequency.linearRampToValueAtTime(190, t + seconds);
    // The gears: a fast wobble on the motor's pitch.
    const gears = c.createOscillator();
    gears.frequency.value = 42;
    const depth = c.createGain();
    depth.gain.value = 16;
    gears.connect(depth).connect(osc.frequency);
    const band = c.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 950;
    band.Q.value = 1.3;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.06);
    g.gain.setValueAtTime(0.07, t + seconds - 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    osc.connect(band).connect(g).connect(c.destination);
    osc.start(t);
    gears.start(t);
    osc.stop(t + seconds + 0.02);
    gears.stop(t + seconds + 0.02);
    noise(c, t, seconds, 0.035, "bandpass", 3400);
    tone(c, "triangle", 2300, 1900, t + seconds, 0.03, 0.09);
  });

/** Switched on: two bright little notes. */
export const playBeep = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "square", 1568, 1568, t, 0.07, 0.035);
    tone(c, "square", 2093, 2093, t + 0.09, 0.1, 0.035);
  });

/** The shutter: a dry double click with a little weight under it. */
export const playShutter = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.035, 0.42, "highpass", 2600);
    tone(c, "sine", 190, 70, t, 0.07, 0.2);
    noise(c, t + 0.075, 0.05, 0.3, "bandpass", 1700);
    tone(c, "triangle", 1400, 900, t + 0.075, 0.03, 0.06);
  });

/** A button under a thumb. */
export const playClick = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "triangle", 3100, 2500, t, 0.025, 0.07);
  });

/** Nothing further that way: one low, short beep. */
export const playBonk = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "square", 420, 380, t, 0.09, 0.03);
  });

/** The printer feeding the strip: the stepper motor's ticks over a hum, for `seconds`. */
export const playPrinter = (muted: boolean, seconds = 2.2) =>
  guard(muted, (c, t) => {
    const hum = c.createOscillator();
    hum.type = "sawtooth";
    hum.frequency.value = 96;
    const low = c.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 420;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.08);
    g.gain.setValueAtTime(0.05, t + seconds - 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    hum.connect(low).connect(g).connect(c.destination);
    hum.start(t);
    hum.stop(t + seconds + 0.02);
    for (let at = 0.05; at < seconds - 0.1; at += 0.11) noise(c, t + at, 0.03, 0.09, "bandpass", 2600);
  });
