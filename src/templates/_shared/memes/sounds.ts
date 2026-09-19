"use client";

/**
 * The noises the meme templates make, synthesised on the spot with WebAudio: no files to load, and
 * no two are quite the same. Every one is silent when the gift is muted.
 */
let context: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context ??= new Ctor();
    if (context.state === "suspended") void context.resume();
    return context;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, type: OscillatorType, from: number, to: number, at: number, length: number, gain: number) {
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, at);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + length);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(g).connect(c.destination);
  osc.start(at);
  osc.stop(at + length + 0.02);
}

function noise(c: AudioContext, at: number, length: number, gain: number, filter: BiquadFilterType, freq: number) {
  const n = Math.floor(c.sampleRate * length);
  const buffer = c.createBuffer(1, n, c.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < n; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + length);
  src.connect(f).connect(g).connect(c.destination);
  src.start(at);
}

const guard = (muted: boolean, play: (c: AudioContext, t: number) => void) => {
  if (muted) return;
  const c = ctx();
  if (!c) return;
  try {
    play(c, c.currentTime);
  } catch {
    // no audio device: the joke still lands without it
  }
};

/** A squeaky toy. `pitch` 0..1 picks where in its range it squeaks. */
export const playSqueak = (muted: boolean, pitch = 0.5) =>
  guard(muted, (c, t) => {
    const base = 620 + pitch * 520;
    tone(c, "triangle", base, base * 1.9, t, 0.09, 0.22);
    tone(c, "triangle", base * 1.7, base * 0.9, t + 0.09, 0.12, 0.16);
  });

/** A spring: a low note wobbling down. */
export const playBoing = (muted: boolean) =>
  guard(muted, (c, t) => {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(95, t + 0.42);
    const wobble = c.createOscillator();
    wobble.frequency.value = 22;
    const depth = c.createGain();
    depth.gain.value = 46;
    wobble.connect(depth).connect(osc.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.26, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    wobble.start(t);
    osc.stop(t + 0.47);
    wobble.stop(t + 0.47);
  });

/** A party blower: a reedy note that swells and gives up. */
export const playHonk = (muted: boolean) =>
  guard(muted, (c, t) => {
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(392, t);
    osc.frequency.linearRampToValueAtTime(466, t + 0.22);
    osc.frequency.linearRampToValueAtTime(349, t + 0.5);
    const band = c.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1300;
    band.Q.value = 2.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.05);
    g.gain.setValueAtTime(0.3, t + 0.34);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.52);
    osc.connect(band).connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.55);
  });

/** A sticker hitting the page. */
export const playSlap = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.07, 0.5, "lowpass", 2400 + Math.random() * 900);
    tone(c, "sine", 170, 60, t, 0.08, 0.24);
  });

/** A gavel, or a rubber stamp: wood and weight. */
export const playThud = (muted: boolean) =>
  guard(muted, (c, t) => {
    noise(c, t, 0.05, 0.42, "bandpass", 1100);
    tone(c, "sine", 140, 38, t, 0.2, 0.5);
  });

/** Ta-da: four notes up a major chord. */
export const playTada = (muted: boolean) =>
  guard(muted, (c, t) => {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, "triangle", f, f, t + i * 0.085, i === 3 ? 0.5 : 0.16, 0.2));
  });

export function buzz(ms = 12): void {
  try {
    navigator.vibrate?.(ms);
  } catch {
    // not every browser has a motor
  }
}
