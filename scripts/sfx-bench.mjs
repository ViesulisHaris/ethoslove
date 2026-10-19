/**
 * Renders the Halloween gifts' sound effects without a speaker, in headless Chromium, and measures them:
 * how loud, how bright, and how much of each a phone's speaker would play (a phone makes nothing worth
 * hearing below about 400 Hz, so a knock built from low notes is a faint tick in a pocket).
 *
 *   node scripts/sfx-bench.mjs                      every effect, one seed
 *   node scripts/sfx-bench.mjs --seeds 6 knock      just the knock, the worst of six seeds
 *   node scripts/sfx-bench.mjs --wav out            also write each as a .wav, to listen to
 *   node scripts/sfx-bench.mjs --calibrate          what each MIX entry in sfx.ts would have to be to hit its target
 *   node scripts/sfx-bench.mjs --calibrate --apply  ... and write those numbers into sfx.ts (run it twice: the soft
 *                                                   ceiling over the mix bends a peak that is close to it)
 *
 * The effects are the ones in src/templates/_shared/night/sfx.ts, bundled with vite and played through an
 * OfflineAudioContext, so what is measured is the same graph the gift builds.
 */
import { chromium } from "@playwright/test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "vite";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);
const seeds = Number(option("seeds") ?? 1);
const wavDir = option("wav");
const asked = args.filter((a, i) => !a.startsWith("--") && !["--seeds", "--wav"].includes(args[i - 1]));
const SR = 44100;
const root = resolve(import.meta.dirname, "..");
const sfxPath = join(root, "src/templates/_shared/night/sfx.ts");

/** scene -> [seconds, [[offset, effect, args]]]: each effect played the way a gift plays it. */
const SCENES = {
  "tink-word": [10, [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i * 0.85, "tink", [i, "walk"]])],
  scrape: [3, [[0, "scrape", [450]]]],
  chime: [9, [0, 1, 2, 3].map((i) => [i * 1.4, "chime", [i]])],
  "flutter-emerge": [4, [[0, "flutter", [{ delay: 0.05, ms: 1500, peak: 0.45 }]]]],
  "flutter-orbit": [4, [[0, "flutter", [{ ms: 1700, peak: 0.5, soft: true }]]]],
  "flutter-scatter": [4, [[0, "flutter", [{ delay: 0.1, ms: 1300, peak: 0.35 }]]]],
  whoosh: [3, [[0, "whoosh", []]]],
  "whoosh-form": [3, [[0, "whoosh", [{ delay: 0.3, ms: 950, peak: 0.5 }]]]],
  "whoosh-rush": [3, [[0, "whoosh", [{ delay: 0.12, ms: 700, peak: 0.92 }]]]],
  sparkle: [4, [[0, "sparkle", []]]],
  "sparkle-heart": [4, [[0, "sparkle", [{ delay: 0.1, ms: 1200 }]]]],
  "splash-only": [3.5, [[0, "splash", []]]],
  bubbles: [4.5, [[0, "bubbles", []], [1.2, "bubbles", []], [2.4, "bubbles", []]]],
  boil: [5, [[0, "boil", [{ ms: 2300 }]]]],
  glow: [5, [[0, "glow", [{ ms: 2200 }]]]],
  "cork-only": [3, [[0, "cork", []]]],
  carve: [3.5, [[0, "carve", [450]], [0.8, "carve", [800]]]],
  thunk: [3, [[0, "thunk", []], [0.5, "thunk", []], [1, "thunk", []]]],
  "ignite-only": [4, [[0, "ignite", []]]],
  "thunder-near": [6, [[0, "thunder", [0.85]]]],
  "thunder-far": [6, [[0, "thunder", [0.2]]]],
  creak: [3.5, [[0, "creak", []]]],
  knock: [4, [[0, "knock", []]]],
  "tink-windows": [5, [0, 1, 2, 3, 4, 5].map((i) => [i * 0.42, "tink", [i, "rise"]])],
};

/**
 * The MIX entry each scene calibrates, and the loudest peak (dBFS, worst of the seeds) it should reach. The
 * song under a gift peaks at about -3 dBFS, so a sound that can land on one of its peaks has to stay near
 * -11 or the two add up past full scale: that is what clipping in the speaker is.
 */
const TARGETS = {
  thunder: ["thunder-near", -12],
  creak: ["creak", -15],
  scrape: ["scrape", -22],
  tink: ["tink-word", -16],
  whoosh: ["whoosh", -17],
  flutter: ["flutter-emerge", -18],
  bubbles: ["bubbles", -19],
  splash: ["splash-only", -14],
  boil: ["boil", -19],
  cork: ["cork-only", -11],
  sparkle: ["sparkle", -17],
  glow: ["glow", -18],
  ignite: ["ignite-only", -13],
  carve: ["carve", -20],
  thunk: ["thunk", -16],
  chime: ["chime", -14],
  knock: ["knock", -11],
};

/* ------------------------------------------------------------------ bundle the effects for the page */

const tmp = mkdtempSync(join(tmpdir(), "sfx-bench-"));
const posix = (p) => p.replace(/\\/g, "/");
writeFileSync(
  join(tmp, "entry.ts"),
  `import { EFFECTS } from "${posix(sfxPath)}";
import { busFor } from "${posix(join(root, "src/templates/_shared/night/foley"))}";
import { mulberry32 } from "${posix(join(root, "src/templates/_shared/random"))}";
(window as unknown as { BENCH: unknown }).BENCH = { EFFECTS, busFor, mulberry32 };
`,
);
await build({
  configFile: false,
  logLevel: "silent",
  root: tmp,
  build: { lib: { entry: join(tmp, "entry.ts"), name: "SfxBench", formats: ["iife"], fileName: () => "bench.js" }, outDir: join(tmp, "dist"), minify: false, target: "es2022" },
});
const bundle = readFileSync(join(tmp, "dist/bench.js"), "utf8");

/* ----------------------------------------------------------------------------- render in a browser */

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><title>sfx-bench</title>");
await page.addScriptTag({ content: bundle });

async function render(scene, seed) {
  const [seconds, events] = SCENES[scene];
  const out = await page.evaluate(
    async ({ seconds, events, seed, SR }) => {
      const B = window.BENCH;
      // The room rings for two seconds after the last sound, so the render runs on past it.
      const c = new OfflineAudioContext(2, Math.ceil(SR * (seconds + 2.6)), SR);
      const rnd = B.mulberry32(seed);
      const errors = [];
      for (const [offset, name, a] of events) {
        try {
          B.EFFECTS[name]({ c, t: 0.05 + offset + seed * 0.0000047, bus: B.busFor(c), rnd }, ...a);
        } catch (e) {
          errors.push(`${name}: ${e.message}`);
        }
      }
      const buf = await c.startRendering();
      const pack = (f32) => {
        const u8 = new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength);
        let s = "";
        for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
        return btoa(s);
      };
      return { errors, l: pack(buf.getChannelData(0)), r: pack(buf.getChannelData(1)) };
    },
    { seconds, events, seed, SR },
  );
  const unpack = (b64) => {
    const b = Buffer.from(b64, "base64");
    return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  };
  return { errors: out.errors, l: unpack(out.l), r: unpack(out.r) };
}

/* ---------------------------------------------------------------------------------- measurements */

const db = (x) => 20 * Math.log10(Math.max(x, 1e-9));

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [re[i], re[j], im[i], im[j]] = [re[j], re[i], im[j], im[i]];
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = i + k + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const next = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = next;
      }
    }
  }
}

/** A phone's speaker, roughly: a second-order high-pass at 420 Hz. */
function phoneOf(mono) {
  const w = (2 * Math.PI * 420) / SR;
  const alpha = Math.sin(w) / (2 * 0.707);
  const cs = Math.cos(w);
  const [b0, b1, b2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
  const [a0, a1, a2] = [1 + alpha, -2 * cs, 1 - alpha];
  const out = new Float32Array(mono.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < mono.length; i++) {
    const x = mono[i];
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    [x2, x1, y2, y1] = [x1, x, y1, y];
    out[i] = y;
  }
  return out;
}

/** Clicks: single-sample jumps (at least -45 dBFS) a dozen times bigger than the movement of the sound around them. */
function clicksIn(mono) {
  const W = Math.floor(SR * 0.002);
  const found = [];
  for (let i = W + 1; i < mono.length - W; i++) {
    const d = Math.abs(mono[i] - mono[i - 1]);
    if (d < 0.0056) continue;
    let e = 0;
    for (let k = -W; k <= W; k++) if (k !== 0 && k !== -1 && k !== 1) e += (mono[i + k] - mono[i + k - 1]) ** 2;
    if (d / (Math.sqrt(e / (2 * W - 2)) + 1e-6) > 12 && (!found.length || i / SR - found[found.length - 1] > 0.004)) found.push(i / SR);
  }
  return found;
}

function analyse(l, r) {
  const n = l.length;
  const mono = new Float32Array(n);
  let peak = 0;
  let first = -1;
  let last = -1;
  for (let i = 0; i < n; i++) {
    const loud = Math.max(Math.abs(l[i]), Math.abs(r[i]));
    peak = Math.max(peak, loud);
    mono[i] = (l[i] + r[i]) / 2;
    if (loud > 10 ** (-55 / 20)) {
      if (first < 0) first = i;
      last = i;
    }
  }
  if (first < 0) return { peakDb: -Infinity, rmsDb: -Infinity, active: 0, centroid: 0, bands: [], phoneKeepDb: -Infinity, clicks: [] };
  const phone = phoneOf(mono);
  let sum = 0;
  let phoneSum = 0;
  for (let i = first; i <= last; i++) {
    sum += mono[i] * mono[i];
    phoneSum += phone[i] * phone[i];
  }
  const span = last - first + 1;
  const N = 4096;
  const bins = new Float64Array(N / 2);
  for (let s = first; s + N <= last; s += N / 2) {
    const re = new Float64Array(N);
    const im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = mono[s + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
    fft(re, im);
    for (let k = 0; k < N / 2; k++) bins[k] += re[k] * re[k] + im[k] * im[k];
  }
  const edges = [0, 150, 600, 2000, 5000, SR / 2];
  const bandEnergy = new Array(5).fill(0);
  let total = 0;
  let weighted = 0;
  for (let k = 1; k < N / 2; k++) {
    const f = (k * SR) / N;
    total += bins[k];
    weighted += bins[k] * f;
    for (let b = 0; b < 5; b++) if (f >= edges[b] && f < edges[b + 1]) bandEnergy[b] += bins[k];
  }
  return {
    peakDb: db(peak),
    rmsDb: db(Math.sqrt(sum / span)),
    active: span / SR,
    centroid: weighted / (total || 1),
    bands: bandEnergy.map((e) => Math.round((100 * e) / (total || 1))),
    phoneKeepDb: db(Math.sqrt(phoneSum / span)) - db(Math.sqrt(sum / span)),
    clicks: clicksIn(mono),
  };
}

function writeWav(path, l, r) {
  const n = l.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r[i])) * 32767), 46 + i * 4);
  }
  writeFileSync(path, buf);
}

/* ----------------------------------------------------------------------------------------- run */

if (wavDir) mkdirSync(wavDir, { recursive: true });
const wanted = Object.keys(SCENES).filter((scene) => !asked.length || asked.some((a) => scene === a || scene.startsWith(`${a}-`)));
const worst = {};
console.log("scene          peak dBFS   rms   active  centroid  phone keeps   energy <150 / 600 / 2k / 5k / above   clicks");
const clicked = [];
for (const scene of wanted) {
  const peaks = [];
  let shown;
  for (let seed = 1; seed <= seeds; seed++) {
    const { errors, l, r } = await render(scene, seed);
    if (errors.length) console.log(`  !! ${scene}, seed ${seed}: ${errors.join("; ")}`);
    const a = analyse(l, r);
    peaks.push(a.peakDb);
    if (a.clicks.length) clicked.push(`${scene} (seed ${seed}) at ${a.clicks.slice(0, 3).map((t) => t.toFixed(3) + "s").join(", ")}`);
    if (seed === 1) {
      shown = a;
      if (wavDir) writeWav(join(wavDir, `${scene}.wav`), l, r);
    }
  }
  worst[scene] = Math.max(...peaks);
  console.log(
    `${scene.padEnd(14)} ${worst[scene].toFixed(1).padStart(8)}  ${shown.rmsDb.toFixed(1).padStart(6)}  ${shown.active.toFixed(2).padStart(5)}s  ${String(Math.round(shown.centroid)).padStart(6)} Hz  ${shown.phoneKeepDb.toFixed(1).padStart(8)} dB   ${shown.bands.join(" / ")}   ${shown.clicks.length}`,
  );
}
await browser.close();
rmSync(tmp, { recursive: true, force: true });
console.log(clicked.length ? `\nCLICKS in: ${clicked.join("; ")}` : "\nno clicks in any scene or seed");

if (flag("calibrate")) {
  let src = readFileSync(sfxPath, "utf8");
  console.log("\nMIX entry   scene           worst peak   target    nudge     MIX now -> next");
  for (const [key, [scene, target]] of Object.entries(TARGETS)) {
    if (!(scene in worst)) continue;
    const entry = src.match(new RegExp(`^(\\s*${key}: )(-?[0-9.]+)(,)$`, "m"));
    if (!entry) throw new Error(`no MIX entry for ${key} in sfx.ts`);
    const now = Number(entry[2]);
    const next = Math.round((now + target - worst[scene]) * 10) / 10;
    console.log(`${key.padEnd(11)} ${scene.padEnd(15)} ${worst[scene].toFixed(1).padStart(8)}  ${String(target).padStart(8)}  ${(target - worst[scene]).toFixed(1).padStart(7)}     ${String(now).padStart(6)} -> ${next}`);
    if (flag("apply")) src = src.replace(entry[0], `${entry[1]}${next}${entry[3]}`);
  }
  if (flag("apply")) {
    writeFileSync(sfxPath, src);
    console.log("\nwritten to sfx.ts");
  }
}
