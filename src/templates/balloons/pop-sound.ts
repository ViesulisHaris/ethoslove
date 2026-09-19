"use client";

/**
 * The sound of a balloon going: a short burst of noise through a band-pass for the snap, and a
 * sine dropping through the bass for the thump. Made on the spot with WebAudio, so there is no
 * file to load and no two pops are quite the same. Silent when the gift is muted.
 */
let context: AudioContext | null = null;

export function playPop(muted: boolean): void {
  if (muted || typeof window === "undefined") return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    context ??= new Ctor();
    const c = context;
    if (c.state === "suspended") void c.resume();
    const t = c.currentTime;

    const length = Math.floor(c.sampleRate * 0.09);
    const buffer = c.createBuffer(1, length, c.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
    const noise = c.createBufferSource();
    noise.buffer = buffer;
    const band = c.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 900 + Math.random() * 600;
    band.Q.value = 0.9;
    const snap = c.createGain();
    snap.gain.setValueAtTime(0.55, t);
    snap.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    noise.connect(band).connect(snap).connect(c.destination);
    noise.start(t);

    const thump = c.createOscillator();
    thump.type = "sine";
    thump.frequency.setValueAtTime(190, t);
    thump.frequency.exponentialRampToValueAtTime(42, t + 0.09);
    const thumpGain = c.createGain();
    thumpGain.gain.setValueAtTime(0.32, t);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
    thump.connect(thumpGain).connect(c.destination);
    thump.start(t);
    thump.stop(t + 0.13);
  } catch {
    // no audio device, or a browser that refused: the pop is still visible
  }
}
