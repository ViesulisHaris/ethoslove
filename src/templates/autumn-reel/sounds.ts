"use client";

import { guard, noise, tone } from "../_shared/synth";

/** The darkroom light switched on: a dry click, then the hum of the bulb. */
export const playSwitch = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.03, 0.4, "highpass", 3000);
    tone(c, "triangle", 1800, 1200, t, 0.03, 0.1);
    tone(c, "sine", 120, 120, t + 0.05, 0.5, 0.025);
  });

/** The prints coming up: three soft notes. */
export const playDevelop = (muted: boolean) =>
  guard(muted, (c, t) => {
    [392, 493.88, 587.33, 783.99].forEach((f, i) => tone(c, "sine", f, f, t + i * 0.16, 0.8, 0.06));
  });

/** A pressed leaf laid on the page: a papery tap. */
export const playPress = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.06, 0.22, "bandpass", 1800);
    tone(c, "sine", 260, 180, t, 0.08, 0.08);
  });
