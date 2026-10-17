"use client";

import { guard, noise, tone } from "../_shared/synth";

/** A party popper going off: a crack, the hiss of paper thrown, and a squeak on top. */
export const playPopper = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.05, 0.42, "bandpass", 1300);
    noise(c, t + 0.02, 0.22, 0.12, "highpass", 4200);
    tone(c, "triangle", 1250, 1800, t + 0.01, 0.07, 0.06);
  });

/** A small pop, for a handful of confetti thrown wherever they tapped. */
export const playPuff = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.035, 0.24, "bandpass", 1700 + Math.random() * 500);
    tone(c, "sine", 820 + Math.random() * 160, 1240, t, 0.05, 0.05);
  });

/** A breath across the candles: a long soft rush of air that falls away. */
export const playBlow = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.55, 0.26, "bandpass", 700);
    noise(c, t + 0.05, 0.4, 0.1, "highpass", 2600);
  });
