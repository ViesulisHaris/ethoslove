"use client";

import { guard, noise, tone } from "../_shared/synth";

/** A match struck: a dry scratch, then the flare catching. */
export const playStrike = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.09, 0.32, "highpass", 2600);
    noise(c, t + 0.08, 0.5, 0.12, "lowpass", 900);
    tone(c, "sine", 180, 120, t + 0.08, 0.35, 0.06);
  });

/** The room warming: a low, soft swell. */
export const playWarm = (muted: boolean) =>
  guard(muted, (c, t) => {
    [523.25, 659.25, 783.99].forEach((f, i) => tone(c, "sine", f, f, t + i * 0.11, 0.7, 0.07));
  });

/** A leaf let go of: a light rustle. */
export const playLeaf = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.14, 0.14, "bandpass", 2400 + Math.random() * 600);
    noise(c, t + 0.06, 0.1, 0.08, "highpass", 3800);
  });
