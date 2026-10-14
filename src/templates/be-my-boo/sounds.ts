"use client";

import { guard, noise, tone } from "../_shared/synth";

/** The ghost's "boo": a soft voice sliding down, with a breath under it. */
export const playBoo = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "sine", 380, 210, t, 0.58, 0.2);
    tone(c, "triangle", 760, 430, t + 0.02, 0.42, 0.035);
    noise(c, t, 0.32, 0.05, "lowpass", 760);
  });

/** A tiny ghost popping up where the page was tapped. */
export const playPop = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "sine", 540, 1020, t, 0.13, 0.11);
    tone(c, "sine", 1020, 820, t + 0.1, 0.12, 0.05);
  });

/** Bats taking off: a quick flutter of wings. */
export const playFlutter = (muted: boolean) =>
  guard(muted, (c, t) => {
    for (let i = 0; i < 5; i++) noise(c, t + i * 0.045, 0.04, 0.12 - i * 0.015, "bandpass", 1300 + i * 160);
  });
