/**
 * Renders the bundled music library: ten short, loopable, consonant pieces built from
 * synthesised piano, plucked strings (Karplus–Strong), music box and pads, through a
 * Schroeder reverb, encoded to MP3.   node scripts/gen-library.mjs [id]
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
// lamejs 1.2 expects these on the global scope when loaded from Node.
globalThis.MPEGMode = require("lamejs/src/js/MPEGMode");
globalThis.Lame = require("lamejs/src/js/Lame");
globalThis.BitStream = require("lamejs/src/js/BitStream");
const lamejs = require("lamejs");

const SR = 44100;
const TAU = Math.PI * 2;

// ---------- pitch helpers ----------
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function hz(name) {
  const m = name.match(/^([A-G])(#|b)?(-?\d)$/);
  const semis = NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (Number(m[3]) + 1) * 12;
  return 440 * Math.pow(2, (semis - 69) / 12);
}
const up = (name, semis) => 440 * Math.pow(2, (Math.round(12 * Math.log2(hz(name) / 440)) + semis) / 12);

// ---------- instruments: each returns a mono Float32Array for one note ----------
function piano(f, dur, vel, { felt = false } = {}) {
  const tail = 2.6;
  const n = Math.floor(SR * (dur + tail));
  const out = new Float32Array(n);
  const harm = felt ? [1, 0.32, 0.1, 0.04, 0.015] : [1, 0.55, 0.3, 0.14, 0.07, 0.03];
  const bright = Math.min(1, vel * 1.1);
  const baseDecay = 1.6 * Math.pow(220 / f, 0.55);
  for (let h = 0; h < harm.length; h++) {
    const k = h + 1;
    const fk = f * k * (1 + 0.00035 * k * k);
    if (fk > 16000) break;
    const amp = harm[h] * vel * (h === 0 ? 1 : Math.pow(bright, h * 0.6));
    const decay = baseDecay / (1 + 0.55 * h);
    const ph = h * 1.7;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      let env = Math.exp(-t / decay) * Math.min(1, t / 0.004);
      if (t > dur) env *= Math.exp(-(t - dur) / 0.32);
      out[i] += Math.sin(TAU * fk * t + ph) * amp * env;
    }
  }
  // hammer noise
  const hn = Math.floor(SR * 0.012);
  for (let i = 0; i < hn; i++) out[i] += (Math.random() * 2 - 1) * vel * 0.035 * (1 - i / hn);
  return out;
}

function epiano(f, dur, vel) {
  const n = Math.floor(SR * (dur + 2.2));
  const out = new Float32Array(n);
  const decay = 1.9 * Math.pow(220 / f, 0.4);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let env = Math.exp(-t / decay) * Math.min(1, t / 0.006);
    if (t > dur) env *= Math.exp(-(t - dur) / 0.3);
    const trem = 1 - 0.12 * (0.5 + 0.5 * Math.sin(TAU * 4.3 * t));
    const bell = Math.exp(-t / 0.35) * 0.35;
    out[i] = (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * f * 2 * t) + bell * Math.sin(TAU * f * 3.01 * t)) * vel * env * trem;
  }
  return out;
}

function musicBox(f, dur, vel) {
  const n = Math.floor(SR * 1.8);
  const out = new Float32Array(n);
  const partials = [[1, 1], [2, 0.35], [3, 0.18], [4.2, 0.08], [5.6, 0.04]];
  for (const [r, a] of partials) {
    const fk = f * r;
    if (fk > 15000) continue;
    const decay = 0.9 / Math.sqrt(r);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      out[i] += Math.sin(TAU * fk * t) * a * vel * Math.exp(-t / decay) * Math.min(1, t / 0.002);
    }
  }
  return out;
}

function pad(f, dur, vel) {
  const n = Math.floor(SR * (dur + 2.4));
  const out = new Float32Array(n);
  const detune = [-0.004, 0, 0.004];
  for (const d of detune) {
    const f0 = f * (1 + d);
    for (let h = 1; h <= 7; h++) {
      const fk = f0 * h;
      const lp = 1 / (1 + Math.pow((h * f0) / 1100, 2));
      const amp = (vel * lp) / h;
      if (amp < 0.002 || fk > 12000) continue;
      const ph = Math.random() * TAU;
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        const att = Math.min(1, t / 1.4);
        const rel = t > dur ? Math.exp(-(t - dur) / 1.6) : 1;
        const vib = 1 + 0.0015 * Math.sin(TAU * 0.17 * t + ph);
        out[i] += Math.sin(TAU * fk * vib * t + ph) * amp * att * rel;
      }
    }
  }
  return out;
}

function pluck(f, dur, vel, { bright = 0.5, damp = 0.9965 } = {}) {
  const n = Math.floor(SR * (dur + 1.6));
  const N = Math.max(2, Math.round(SR / f));
  const out = new Float32Array(n);
  const buf = new Float32Array(N);
  let last = 0;
  for (let i = 0; i < N; i++) {
    const w = Math.random() * 2 - 1;
    last = last * (1 - bright) + w * bright; // softer excitation = warmer tone
    buf[i] = last;
  }
  let idx = 0;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    const cur = buf[idx];
    const nxt = buf[(idx + 1) % N];
    const y = 0.5 * (cur + nxt) * damp;
    buf[idx] = y;
    idx = (idx + 1) % N;
    const t = i / SR;
    const rel = t > dur ? Math.exp(-(t - dur) / 0.5) : 1;
    // body: a touch of low-pass smoothing
    prev = prev * 0.2 + y * 0.8;
    out[i] = prev * vel * rel;
  }
  return out;
}

function bass(f, dur, vel) {
  const n = Math.floor(SR * (dur + 0.8));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let env = Math.exp(-t / 1.6) * Math.min(1, t / 0.012);
    if (t > dur) env *= Math.exp(-(t - dur) / 0.2);
    out[i] = (Math.sin(TAU * f * t) + 0.22 * Math.sin(TAU * f * 2 * t)) * vel * env;
  }
  return out;
}

// ---------- mixer ----------
class Mix {
  constructor(seconds) {
    this.len = Math.floor(SR * seconds);
    this.L = new Float32Array(this.len + SR * 4);
    this.R = new Float32Array(this.len + SR * 4);
  }
  add(buf, at, pan = 0, gain = 1) {
    const start = Math.floor(at * SR);
    const gl = Math.cos(((pan + 1) / 2) * (Math.PI / 2)) * gain;
    const gr = Math.sin(((pan + 1) / 2) * (Math.PI / 2)) * gain;
    for (let i = 0; i < buf.length; i++) {
      const j = start + i;
      if (j >= this.L.length) break;
      this.L[j] += buf[i] * gl;
      this.R[j] += buf[i] * gr;
    }
  }
  /** Wrap everything past the loop point back to the start, so the loop is seamless. */
  wrap() {
    for (let i = this.len; i < this.L.length; i++) {
      this.L[i - this.len] += this.L[i];
      this.R[i - this.len] += this.R[i];
      this.L[i] = 0;
      this.R[i] = 0;
    }
  }
}

function reverb(x, { wet = 0.28, room = 0.8, damp = 0.35 } = {}) {
  const combs = [1557, 1617, 1491, 1422];
  const aps = [225, 556];
  const n = x.length;
  const wetBuf = new Float32Array(n);
  for (const d of combs) {
    const buf = new Float32Array(d);
    let idx = 0;
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const y = buf[idx];
      lp = lp * damp + y * (1 - damp);
      buf[idx] = x[i] + lp * room;
      idx = (idx + 1) % d;
      wetBuf[i] += y;
    }
  }
  let sig = wetBuf;
  for (const d of aps) {
    const buf = new Float32Array(d);
    let idx = 0;
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const bufout = buf[idx];
      const inp = sig[i];
      out[i] = -inp + bufout;
      buf[idx] = inp + bufout * 0.5;
      idx = (idx + 1) % d;
    }
    sig = out;
  }
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) y[i] = x[i] + sig[i] * wet * 0.25;
  return y;
}

function finish(mix, { wet, room, damp }) {
  mix.wrap();
  let L = reverb(mix.L, { wet, room, damp });
  let R = reverb(mix.R, { wet, room: room * 0.98, damp });
  // wrap the reverb tail too, then trim
  for (let i = mix.len; i < L.length; i++) {
    L[i - mix.len] += L[i];
    R[i - mix.len] += R[i];
  }
  L = L.subarray(0, mix.len);
  R = R.subarray(0, mix.len);
  let peak = 0;
  for (let i = 0; i < mix.len; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 0.89 / (peak || 1);
  const fade = Math.floor(SR * 0.03);
  const out = new Int16Array(mix.len * 2);
  for (let i = 0; i < mix.len; i++) {
    const f = i < fade ? i / fade : i > mix.len - fade ? (mix.len - i) / fade : 1;
    const l = Math.tanh(L[i] * g * 1.15) * f;
    const r = Math.tanh(R[i] * g * 1.15) * f;
    out[i * 2] = Math.max(-32768, Math.min(32767, Math.round(l * 32767)));
    out[i * 2 + 1] = Math.max(-32768, Math.min(32767, Math.round(r * 32767)));
  }
  return out;
}

function toMp3(pcm) {
  const enc = new lamejs.Mp3Encoder(2, SR, 128);
  const left = new Int16Array(pcm.length / 2);
  const right = new Int16Array(pcm.length / 2);
  for (let i = 0; i < left.length; i++) {
    left[i] = pcm[i * 2];
    right[i] = pcm[i * 2 + 1];
  }
  const chunks = [];
  const block = 1152;
  for (let i = 0; i < left.length; i += block) {
    const b = enc.encodeBuffer(left.subarray(i, i + block), right.subarray(i, i + block));
    if (b.length) chunks.push(Buffer.from(b));
  }
  const end = enc.flush();
  if (end.length) chunks.push(Buffer.from(end));
  return Buffer.concat(chunks);
}

// ---------- composition helpers ----------
const jitter = (s = 0.008) => (Math.random() * 2 - 1) * s;
const vj = (v, s = 0.07) => Math.max(0.05, v + (Math.random() * 2 - 1) * s);
/** chord tones by intervals from a root note name, spread across octaves */
function chord(root, intervals, octaveShift = 0) {
  return intervals.map((iv) => up(root, iv + octaveShift * 12));
}
const MAJ = [0, 4, 7], MIN = [0, 3, 7], MAJ7 = [0, 4, 7, 11], ADD9 = [0, 4, 7, 14], MIN7 = [0, 3, 7, 10], SUS2 = [0, 2, 7];

// ---------- the pieces ----------
const PIECES = {
  "first-light": { mood: "warm", note: "Felt piano · slow", render() {
    const bpm = 66, beat = 60 / bpm, bars = 16, len = bars * 4 * beat;
    const mix = new Mix(len);
    const prog = [["C3", MAJ7], ["G2", MAJ], ["A2", MIN7], ["F2", MAJ7]];
    for (let bar = 0; bar < bars; bar++) {
      const [root, q] = prog[Math.floor(bar / 2) % 4];
      const tones = chord(root, q, 1); // one octave up for the arpeggio
      const t0 = bar * 4 * beat;
      const pattern = [0, 1, 2, 3, 2, 1, 2, 3].map((k) => tones[k % tones.length]);
      pattern.forEach((f, i) => mix.add(piano(f, beat * 0.9, vj(0.34 + (i === 0 ? 0.08 : 0)), { felt: true }), t0 + i * beat * 0.5 + jitter(), (i % 2 ? 0.25 : -0.2)));
      mix.add(bass(hz(root), beat * 3.6, 0.25), t0 + jitter(0.004), 0);
      mix.add(pad(hz(root) * 2, beat * 4, 0.05), t0, 0.1);
      mix.add(pad(tones[1], beat * 4, 0.035), t0, -0.3);
    }
    // a simple melody from bar 5
    const mel = [["E5", 2], ["D5", 1], ["C5", 1], ["G4", 3], ["A4", 1], ["C5", 2], ["D5", 2], ["E5", 3], ["D5", 1], ["C5", 4], ["A4", 2], ["G4", 2], ["E5", 2], ["G5", 2], ["F5", 2], ["E5", 2], ["D5", 4], ["C5", 4]];
    let tm = 4 * 4 * beat;
    for (const [n, b] of mel) { mix.add(piano(hz(n), b * beat * 0.95, vj(0.42), { felt: true }), tm + jitter(), 0.05); tm += b * beat; }
    return finish(mix, { wet: 0.32, room: 0.82, damp: 0.4 });
  } },

  "paper-boats": { mood: "dreamy", note: "Music box · floating", render() {
    const bpm = 72, beat = 60 / bpm, bars = 16, len = bars * 4 * beat;
    const mix = new Mix(len);
    const prog = [["G2", ADD9], ["E2", MIN7], ["C3", MAJ7], ["D3", SUS2]];
    for (let bar = 0; bar < bars; bar++) {
      const [root, q] = prog[Math.floor(bar / 2) % 4];
      const t0 = bar * 4 * beat;
      mix.add(pad(hz(root) * 2, beat * 4, 0.075), t0, -0.15);
      mix.add(pad(chord(root, q, 1)[1], beat * 4, 0.05), t0, 0.25);
      mix.add(pluck(hz(root), beat * 2, 0.5, { bright: 0.25, damp: 0.997 }), t0 + jitter(), -0.1);
      mix.add(pluck(chord(root, q)[2], beat * 2, 0.35, { bright: 0.25, damp: 0.997 }), t0 + 2 * beat + jitter(), 0.1);
    }
    const scale = ["G4", "A4", "B4", "D5", "E5", "G5", "A5", "B5"];
    const motif = [5, 4, 3, 4, 5, 6, 5, 3, 2, 3, 4, 3, 1, 2, 3, 0];
    for (let bar = 0; bar < bars; bar++) {
      if (bar % 4 === 3) continue; // breathe every fourth bar
      const t0 = bar * 4 * beat;
      motif.forEach((deg, i) => {
        if (i % 2 === 1 && Math.random() < 0.3) return;
        mix.add(musicBox(hz(scale[deg]), 0.4, vj(0.3)), t0 + i * beat * 0.5 + jitter(0.01), 0.3 - 0.6 * (i % 2));
      });
    }
    return finish(mix, { wet: 0.4, room: 0.86, damp: 0.3 });
  } },

  "sunday-slowly": { mood: "calm", note: "Fingerpicked guitar", render() {
    const bpm = 76, beat = 60 / bpm, bars = 16, len = bars * 4 * beat;
    const mix = new Mix(len);
    const prog = [["D3", MAJ], ["A2", MAJ], ["B2", MIN], ["G2", MAJ]];
    for (let bar = 0; bar < bars; bar++) {
      const [root, q] = prog[Math.floor(bar / 2) % 4];
      const t0 = bar * 4 * beat;
      const low = chord(root, q, 0);
      const high = chord(root, q, 1);
      // Travis picking: bass on beats 1 and 3, trebles between
      const seq = [[low[0], 0], [high[1], 0.5], [high[2], 1], [high[1], 1.5], [low[2], 2], [high[1], 2.5], [high[2], 3], [high[3 % high.length], 3.5]];
      seq.forEach(([f, b], i) => mix.add(pluck(f, beat * 0.9, vj(i % 2 === 0 ? 0.55 : 0.4), { bright: 0.35, damp: 0.9962 }), t0 + b * beat + jitter(0.006), i % 2 ? 0.2 : -0.15));
      mix.add(pad(hz(root), beat * 4, 0.03), t0, 0);
    }
    return finish(mix, { wet: 0.22, room: 0.75, damp: 0.5 });
  } },

  "golden-hour": { mood: "hopeful", note: "Piano · bright", render() {
    const bpm = 84, beat = 60 / bpm, bars = 16, len = bars * 4 * beat;
    const mix = new Mix(len);
    const prog = [["A2", MAJ], ["E3", MAJ], ["F#2", MIN7], ["D3", MAJ7]];
    for (let bar = 0; bar < bars; bar++) {
      const [root, q] = prog[Math.floor(bar / 2) % 4];
      const t0 = bar * 4 * beat;
      const tones = chord(root, q, 1);
      // gentle pulse: chord on 1 and 3, single tones on 2 and 4
      [0, 2].forEach((b) => tones.slice(0, 3).forEach((f, k) => mix.add(piano(f, beat * 1.6, vj(0.3)), t0 + b * beat + k * 0.012 + jitter(0.004), -0.2 + k * 0.2)));
      [1, 3].forEach((b, i) => mix.add(piano(tones[(i + 1) % tones.length] * 2, beat * 0.8, vj(0.24)), t0 + b * beat + jitter(), 0.3));
      mix.add(bass(hz(root), beat * 3.6, 0.22), t0, 0);
    }
    const mel = [["C#5", 1], ["E5", 1], ["A5", 2], ["G#5", 1], ["E5", 1], ["C#5", 2], ["D5", 1], ["E5", 1], ["F#5", 2], ["E5", 2], ["C#5", 2], ["B4", 2], ["A4", 2], ["C#5", 1], ["E5", 1], ["A5", 2], ["B5", 1], ["A5", 1], ["G#5", 2], ["E5", 4], ["D5", 2], ["C#5", 2], ["B4", 2], ["A4", 6]];
    let tm = 2 * 4 * beat;
    for (const [n, b] of mel) { mix.add(piano(hz(n), b * beat * 0.9, vj(0.44)), tm + jitter(), 0.1); tm += b * beat; }
    return finish(mix, { wet: 0.26, room: 0.78, damp: 0.45 });
  } },

  "slow-dance": { mood: "romantic", note: "Electric piano · waltz", render() {
    const bpm = 63, beat = 60 / bpm, bars = 16, len = bars * 3 * beat;
    const mix = new Mix(len);
    const prog = [["F3", MAJ7], ["D3", MIN7], ["Bb2", MAJ7], ["C3", MAJ]];
    for (let bar = 0; bar < bars; bar++) {
      const [root, q] = prog[Math.floor(bar / 2) % 4];
      const t0 = bar * 3 * beat;
      const tones = chord(root, q, 1);
      mix.add(bass(hz(root), beat * 2.7, 0.24), t0, 0);
      // 1 – and – 2 – and – 3 arpeggio
      [0, 1, 2, 3, 2, 1].forEach((k, i) => mix.add(epiano(tones[k % tones.length], beat * 0.9, vj(0.32)), t0 + i * beat * 0.5 + jitter(), -0.25 + 0.5 * (i % 2)));
      mix.add(pad(tones[0] / 2, beat * 3, 0.04), t0, 0.1);
    }
    const mel = [["A4", 3], ["C5", 2], ["A4", 1], ["G4", 3], ["F4", 3], ["A4", 2], ["C5", 1], ["D5", 3], ["C5", 3], ["A4", 3], ["G4", 2], ["A4", 1], ["F4", 6], ["E4", 3], ["G4", 3], ["C5", 3], ["Bb4", 2], ["A4", 1], ["G4", 3], ["F4", 3]];
    let tm = 4 * 3 * beat;
    for (const [n, b] of mel) { mix.add(epiano(hz(n) * 2, b * beat * 0.9, vj(0.36)), tm + jitter(), 0.05); tm += b * beat; }
    return finish(mix, { wet: 0.34, room: 0.84, damp: 0.35 });
  } },

  "under-the-stars": { mood: "cinematic", note: "Pads · wide", render() {
    const bpm = 56, beat = 60 / bpm, bars = 12, len = bars * 4 * beat;
    const mix = new Mix(len);
    const prog = [["E2", ADD9], ["C#2", MIN7], ["A2", MAJ7], ["B2", SUS2]];
    for (let bar = 0; bar < bars; bar++) {
      const [root, q] = prog[Math.floor(bar / 3) % 4];
      const t0 = bar * 4 * beat;
      const tones = chord(root, q, 1);
      tones.forEach((f, k) => mix.add(pad(f, beat * 4, 0.075), t0, -0.5 + k * 0.33));
      mix.add(bass(hz(root), beat * 3.8, 0.2), t0, 0);
    }
    const stars = ["B5", "G#5", "E5", "F#5", "C#6", "B5", "E6", "G#5"];
    for (let bar = 0; bar < bars; bar++) {
      const t0 = bar * 4 * beat;
      [0, 1.5, 2.75].forEach((b, i) => { if (Math.random() < 0.75) mix.add(piano(hz(stars[(bar * 3 + i) % stars.length]), beat * 2, vj(0.26), { felt: true }), t0 + b * beat + jitter(0.02), -0.4 + 0.8 * Math.random()); });
    }
    return finish(mix, { wet: 0.5, room: 0.9, damp: 0.25 });
  } },

  home: { mood: "playful", note: "Ukulele · sunny", render() {
    const bpm = 96, beat = 60 / bpm, bars = 16, len = bars * 4 * beat;
    const mix = new Mix(len);
    const prog = [["C4", MAJ], ["A3", MIN], ["F3", MAJ], ["G3", MAJ]];
    const strum = (tones, at, vel, down = true) => tones.forEach((f, k) => mix.add(pluck(f, beat * 0.6, vj(vel), { bright: 0.55, damp: 0.994 }), at + (down ? k : tones.length - 1 - k) * 0.014, -0.2 + k * 0.15));
    for (let bar = 0; bar < bars; bar++) {
      const [root, q] = prog[Math.floor(bar / 2) % 4];
      const t0 = bar * 4 * beat;
      const tones = [...chord(root, q, 0), up(root, 12)];
      // island strum: D, D U, U D U
      [[0, 0.5, true], [1, 0.42, true], [1.5, 0.3, false], [2.5, 0.3, false], [3, 0.42, true], [3.5, 0.3, false]].forEach(([b, v, d]) => strum(tones, t0 + b * beat + jitter(0.005), v, d));
      mix.add(bass(hz(root) / 2, beat * 1.8, 0.24), t0, 0);
      mix.add(bass(chord(root, q)[2] / 2, beat * 1.8, 0.2), t0 + 2 * beat, 0);
    }
    const hook = [["E5", 0.5], ["G5", 0.5], ["A5", 1], ["G5", 0.5], ["E5", 0.5], ["D5", 1], ["C5", 2]];
    for (const bar of [3, 7, 11, 15]) {
      let tm = bar * 4 * beat;
      for (const [n, b] of hook) { mix.add(musicBox(hz(n), 0.3, vj(0.28)), tm + jitter(), 0.3); tm += b * beat; }
    }
    return finish(mix, { wet: 0.18, room: 0.7, damp: 0.5 });
  } },

  "quiet-hours": { mood: "calm", note: "Piano · sparse", render() {
    const bpm = 60, beat = 60 / bpm, bars = 16, len = bars * 4 * beat;
    const mix = new Mix(len);
    const prog = [["G2", MAJ7], ["D3", MAJ], ["E2", MIN7], ["C3", MAJ7]];
    for (let bar = 0; bar < bars; bar++) {
      const [root, q] = prog[Math.floor(bar / 2) % 4];
      const t0 = bar * 4 * beat;
      const tones = chord(root, q, 1);
      tones.slice(0, 3).forEach((f, k) => mix.add(piano(f, beat * 3.8, vj(0.3), { felt: true }), t0 + k * 0.03 + jitter(0.004), -0.2 + k * 0.2));
      mix.add(piano(tones[1] * 2, beat * 1.8, vj(0.22), { felt: true }), t0 + 2 * beat + jitter(), 0.3);
      mix.add(pad(hz(root) * 2, beat * 4, 0.04), t0, 0);
    }
    const mel = [["B4", 2], ["D5", 2], ["G5", 3], ["F#5", 1], ["E5", 4], ["D5", 2], ["B4", 2], ["A4", 4], ["G4", 4], ["B4", 2], ["D5", 2], ["E5", 4], ["D5", 2], ["C5", 2], ["B4", 4], ["G4", 4]];
    let tm = 4 * 4 * beat;
    for (const [n, b] of mel) { mix.add(piano(hz(n), b * beat * 0.9, vj(0.36), { felt: true }), tm + jitter(), 0.05); tm += b * beat; }
    return finish(mix, { wet: 0.36, room: 0.84, damp: 0.4 });
  } },
  fireside: { mood: "warm", note: "Felt piano · by the fire", render() {
    const bpm = 58, beat = 60 / bpm, bars = 16, len = bars * 4 * beat;
    const mix = new Mix(len);
    const prog = [["F2", MAJ7], ["C3", MAJ], ["D3", MIN7], ["Bb2", MAJ7]];
    for (let bar = 0; bar < bars; bar++) {
      const [root, q] = prog[Math.floor(bar / 2) % 4];
      const tones = chord(root, q, 1);
      const t0 = bar * 4 * beat;
      // a rocking-chair arpeggio: low, high, middle, high, over and over
      const pattern = [0, 2, 1, 2, 0, 3 % tones.length, 1, 2].map((k) => tones[k % tones.length]);
      pattern.forEach((f, i) => mix.add(piano(f, beat * 1.1, vj(0.3 + (i === 0 ? 0.1 : 0)), { felt: true }), t0 + i * beat * 0.5 + jitter(), (i % 2 ? 0.22 : -0.22)));
      mix.add(bass(hz(root), beat * 3.7, 0.26), t0 + jitter(0.004), 0);
      mix.add(pad(hz(root) * 2, beat * 4, 0.06), t0, -0.1);
      mix.add(pad(tones[2], beat * 4, 0.03), t0, 0.3);
      // a music-box glint on the last beat of every other bar, like a spark leaving the fire
      if (bar % 2 === 1) mix.add(musicBox(tones[1] * 4, 0.5, vj(0.14)), t0 + 3.5 * beat + jitter(0.01), 0.4);
    }
    const mel = [["A4", 2], ["C5", 2], ["F5", 3], ["E5", 1], ["D5", 2], ["C5", 2], ["A4", 4], ["G4", 2], ["A4", 2], ["C5", 3], ["D5", 1], ["C5", 2], ["A4", 2], ["F4", 4], ["A4", 2], ["C5", 2], ["D5", 3], ["C5", 1], ["Bb4", 2], ["A4", 2], ["G4", 4], ["A4", 2], ["G4", 2], ["F4", 6], ["E4", 2], ["F4", 4]];
    let tm = 4 * 4 * beat;
    for (const [n, b] of mel) { mix.add(piano(hz(n), b * beat * 0.95, vj(0.4), { felt: true }), tm + jitter(), 0.05); tm += b * beat; }
    return finish(mix, { wet: 0.34, room: 0.84, damp: 0.42 });
  } },

  "all-hallows": { mood: "dreamy", note: "Music box · a waltz in the dark", render() {
    const bpm = 80, beat = 60 / bpm, bars = 16, len = bars * 3 * beat;
    const mix = new Mix(len);
    // A minor with the E major that gives an old music box its shiver.
    const prog = [["A2", MIN], ["F2", MAJ7], ["E2", MAJ], ["A2", MIN]];
    for (let bar = 0; bar < bars; bar++) {
      const [root, q] = prog[Math.floor(bar / 2) % 4];
      const t0 = bar * 3 * beat;
      const tones = chord(root, q, 1);
      // oom-pah-pah: the bass on one, two plucked chords after it
      mix.add(bass(hz(root), beat * 1.4, 0.26), t0 + jitter(0.004), 0);
      [1, 2].forEach((b) => tones.slice(0, 3).forEach((f, k) => mix.add(pluck(f, beat * 0.7, vj(0.3), { bright: 0.3, damp: 0.996 }), t0 + b * beat + k * 0.012 + jitter(0.005), -0.25 + k * 0.25)));
      mix.add(pad(hz(root) * 2, beat * 3, 0.045), t0, 0.15);
    }
    const scale = ["A4", "B4", "C5", "D5", "E5", "F5", "G#5", "A5", "B5", "C6"];
    const tune = [[4, 2], [7, 1], [6, 1], [7, 1], [9, 1], [7, 2], [4, 1], [5, 1], [4, 1], [3, 1], [2, 2], [3, 1], [4, 2], [1, 1], [0, 3]];
    for (const start of [0, 4, 8, 12]) {
      let tm = start * 3 * beat;
      for (const [deg, b] of tune) { mix.add(musicBox(hz(scale[deg]), 0.45, vj(0.32)), tm + jitter(0.01), 0.3 - 0.6 * (deg % 2)); tm += b * beat; }
    }
    return finish(mix, { wet: 0.44, room: 0.88, damp: 0.3 });
  } },
};

mkdirSync("public/audio/library", { recursive: true });
const only = process.argv[2];
// Rendering one piece keeps the others' entries in the manifest.
const meta = only && existsSync("public/audio/library/manifest.json") ? JSON.parse(readFileSync("public/audio/library/manifest.json", "utf8")).filter((m) => m.id !== only) : [];
for (const [id, piece] of Object.entries(PIECES)) {
  if (only && only !== id) continue;
  const t = Date.now();
  const pcm = piece.render();
  const mp3 = toMp3(pcm);
  writeFileSync(`public/audio/library/${id}.mp3`, mp3);
  const seconds = Math.round(pcm.length / 2 / SR);
  meta.push({ id, seconds, mood: piece.mood, note: piece.note, kb: Math.round(mp3.length / 1024) });
  console.log(`${id.padEnd(16)} ${seconds}s  ${Math.round(mp3.length / 1024)} KB  (${Date.now() - t} ms)`);
}
writeFileSync("public/audio/library/manifest.json", JSON.stringify(meta, null, 2) + "\n");
