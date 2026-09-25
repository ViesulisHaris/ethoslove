"use client";

import { guard, noise, tone } from "../_shared/synth";

/** Curtain rings running along the rail, and the velvet swinging after them. */
export const playCurtain = (muted: boolean) =>
  guard(muted, (c, t) => {
    [0, 0.045, 0.1, 0.15, 0.22].forEach((d, i) => tone(c, "triangle", 3300 + i * 170, 2700 + i * 140, t + d, 0.05, 0.03));
    noise(c, t + 0.03, 0.45, 0.14, "bandpass", 850);
  });

/** The big red button going down: a plastic thunk with a click at the bottom of its travel. */
export const playButton = (muted: boolean) =>
  guard(muted, (c, t) => {
    tone(c, "sine", 200, 70, t, 0.09, 0.3);
    noise(c, t + 0.018, 0.03, 0.22, "highpass", 3000);
  });

/** The countdown: a soft beep on three and two, a higher one on one. */
export const playBeep = (muted: boolean, n: number) =>
  guard(muted, (c, t) => {
    const f = n === 1 ? 1318.5 : 880;
    tone(c, "sine", f, f, t, 0.13, 0.11);
  });

/** The flash charging: a thin whine climbing almost out of hearing. */
export const playCharge = (muted: boolean) => guard(muted, (c, t) => tone(c, "sine", 1900, 7400, t, 0.6, 0.022));

/** The shutter: two dry clicks (shutter, then mirror) with the flash's soft pop under them. */
export const playShutter = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.03, 0.5, "highpass", 3800);
    noise(c, t + 0.075, 0.024, 0.3, "highpass", 3100);
    noise(c, t, 0.2, 0.18, "lowpass", 900);
    tone(c, "sine", 150, 48, t, 0.15, 0.2);
  });

/**
 * The motor pushing the strip out: a low sawtooth that stutters as the rollers take the paper, a
 * little grind on top, and a clunk when it lets go.
 */
export const playWhirr = (muted: boolean, seconds = 3) =>
  guard(muted, (c, t) => {
    const motor = c.createOscillator();
    motor.type = "sawtooth";
    motor.frequency.setValueAtTime(58, t);
    motor.frequency.linearRampToValueAtTime(72, t + seconds);
    const body = c.createBiquadFilter();
    body.type = "lowpass";
    body.frequency.value = 480;
    const envelope = c.createGain();
    envelope.gain.setValueAtTime(0.0001, t);
    envelope.gain.exponentialRampToValueAtTime(0.16, t + 0.14);
    envelope.gain.setValueAtTime(0.16, t + seconds - 0.3);
    envelope.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    // The stutter multiplies the envelope rather than adding to it, so the fade still ends in silence.
    const stutter = c.createGain();
    stutter.gain.value = 1;
    const wobble = c.createOscillator();
    wobble.frequency.value = 7.5;
    const depth = c.createGain();
    depth.gain.value = 0.4;
    wobble.connect(depth).connect(stutter.gain);
    motor.connect(body).connect(envelope).connect(stutter).connect(c.destination);
    motor.start(t);
    wobble.start(t);
    motor.stop(t + seconds + 0.05);
    wobble.stop(t + seconds + 0.05);
    for (let at = 0.2; at < seconds - 0.3; at += 0.55) noise(c, t + at, 0.28, 0.045, "bandpass", 2300);
    tone(c, "sine", 120, 55, t + seconds - 0.05, 0.12, 0.18);
  });
