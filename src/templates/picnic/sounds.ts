"use client";

import { guard, noise, tone } from "../_shared/synth";

/**
 * A wicker lid on a dry hinge: stick-slip friction is a run of tiny clicks whose rate wanders,
 * under a low groan that bends as the lid goes over.
 */
export const playCreak = (muted: boolean) =>
  guard(muted, (c, t) => {
    let at = t + 0.02;
    for (let i = 0; i < 26; i++) {
      // The clicks come faster in the middle of the swing and slow again at the end.
      const gap = 0.018 + Math.abs(Math.sin(i / 4.2)) * 0.022;
      noise(c, at, 0.012, 0.16 + (i % 5 === 0 ? 0.08 : 0), "bandpass", 900 + (i % 7) * 140);
      at += gap;
    }
    tone(c, "sawtooth", 150, 96, t + 0.04, 0.55, 0.03);
    tone(c, "triangle", 310, 210, t + 0.1, 0.45, 0.025);
  });

/** Fruit set down on cloth: a soft round pop. */
export const playPop = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "sine", 520, 190, t, 0.14, 0.2);
    noise(c, t, 0.05, 0.08, "lowpass", 900);
  });

/** Glass, touched: two bright partials that ring a moment. */
export const playClink = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "sine", 2093, 2080, t, 0.5, 0.07);
    tone(c, "sine", 3136, 3120, t + 0.004, 0.36, 0.04);
    tone(c, "triangle", 1318, 1310, t + 0.01, 0.28, 0.03);
  });

/** Paper and ribbon: a dry rustle. */
export const playRustle = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.18, 0.18, "highpass", 3000);
    noise(c, t + 0.08, 0.14, 0.12, "bandpass", 1700);
  });

/** A photo laid on the pile: a soft slap of card. */
export const playCard = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.06, 0.22, "bandpass", 1300);
    tone(c, "sine", 240, 140, t, 0.08, 0.08);
  });

/** Three notes going up, for the last thing out of the basket. */
export const playLast = (muted: boolean) =>
  guard(muted, (c, t) => {
    [659.25, 830.61, 987.77].forEach((f, i) => tone(c, "sine", f, f, t + i * 0.1, 0.55, 0.07));
  });
