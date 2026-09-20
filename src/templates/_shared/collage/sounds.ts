"use client";

import { guard, noise, tone } from "../synth";

/** A kiss: a short wet smack, then a tiny rising "mwah". */
export const playSmooch = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.05, 0.34, "bandpass", 2600 + Math.random() * 700);
    tone(c, "sine", 520, 880, t + 0.03, 0.09, 0.12);
  });

/** Paper being handled: a soft rustle. */
export const playPaper = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.16, 0.2, "highpass", 3200);
    noise(c, t + 0.07, 0.12, 0.14, "bandpass", 1800);
  });

/** Satin pulled loose: a breathy swish falling in pitch. */
export const playRibbon = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.32, 0.22, "bandpass", 1500);
    tone(c, "sine", 900, 300, t, 0.28, 0.05);
  });

/** Wax giving way: a dry crack with a little weight under it. */
export const playSealCrack = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.04, 0.5, "highpass", 2200);
    noise(c, t + 0.05, 0.03, 0.3, "bandpass", 1400);
    tone(c, "sine", 160, 60, t, 0.1, 0.22);
  });

/** A locket clasp: two small bright clicks. */
export const playClasp = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "triangle", 2400, 1800, t, 0.03, 0.16);
    tone(c, "triangle", 3100, 2500, t + 0.07, 0.04, 0.12);
  });

/** Something landing on the page: a soft chime for a finished moment. */
export const playChime = (muted: boolean) =>
  guard(muted, (c, t) => {
    [783.99, 1174.66, 1567.98].forEach((f, i) => tone(c, "sine", f, f, t + i * 0.09, 0.5, 0.1));
  });
