"use client";

/**
 * WebAudio building blocks for the noises templates make on the spot: a pitched blip, a burst of
 * filtered noise, and a guard that keeps every sound silent when the gift is muted or the browser
 * has no audio device. Nothing here loads a file.
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

export function tone(c: AudioContext, type: OscillatorType, from: number, to: number, at: number, length: number, gain: number) {
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

export function noise(c: AudioContext, at: number, length: number, gain: number, filter: BiquadFilterType, freq: number) {
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

export const guard = (muted: boolean, play: (c: AudioContext, t: number) => void) => {
  if (muted) return;
  const c = ctx();
  if (!c) return;
  try {
    play(c, c.currentTime);
  } catch {
    // no audio device: the joke still lands without it
  }
};
