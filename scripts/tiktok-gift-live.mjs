/**
 * Films a gift the way the person who gets it sees it, for a carousel's Live Photos.
 *
 *   node scripts/tiktok-gift-live.mjs docs/marketing/tiktok-105 [http://localhost:3000]
 *
 * Nothing is published. The gift goes into the editor's own draft in a fresh browser, plays from the
 * start in the phone preview, and is filmed full screen at 1080×1920 — so the video is the product
 * running, not a mock-up of it. The carousel folder holds `gift.json` (the editor fields) and, when you
 * have them, the pictures in `photos/` (1.jpg, 2.jpg… in order); any that are missing fall back to
 * the site's own demo pictures, and it says which. They go in through the editor's photo picker and
 * stay on that browser.
 *
 * Out come Live Photos, not videos: one `live-<name>.pvt/` per clip — a JPEG of the clip's best
 * moment and a MOV of the clip, H.264 at 30fps, carrying the same content identifier, plus the
 * metadata.plist that makes the folder a Live Photo package (see lib/live-photo.mjs). Nothing is
 * left to convert on the phone; what remains is getting them into its Photos library in one piece,
 * which from Windows means going through a Mac (see docs/marketing/LIVE-PHOTOS.md).
 *
 * What happens on screen is the template's choreography, in scripts/lib/choreo/<template>.mjs: it
 * presses what a person would press and returns the clips to cut, as `{ name, from, to, stillAt }`
 * in seconds. `"photos": []` in gift.json leaves a gift with words and nothing else. Blowing is faked the way
 * the Halfway e2e tests fake it — a square wave in place of the microphone, as loud as `__breath`.
 *
 * Two things keep it looking right on TikTok:
 *  - The whole gift is on the slide, never cropped: the phone's screen sits inside the 1080×1920
 *    slide, on black like the chat slides, clear of TikTok's own buttons down the right and the
 *    caption along the bottom (SCREEN below).
 *  - It is smooth whatever the machine: while filming, the gift runs SLOW (8) times slower — its clocks,
 *    timers, animation frames and CSS animations all together — so a screencast that manages 6
 *    frames a second still catches 48 of the gift's. The choreography never sees it: `now()`, `page.waitForTimeout`
 *    and `inGift` all count in the gift's own seconds.
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { writeLivePhoto } from "./lib/live-photo.mjs";

const [dir, base = "http://localhost:3000"] = process.argv.slice(2);
if (!dir) throw new Error("usage: node scripts/tiktok-gift-live.mjs <carousel folder> [base url]");
const spec = JSON.parse(readFileSync(join(dir, "gift.json"), "utf8"));
const slug = spec.template;
// What to press, and which moments to cut, live in one small file per template.
// (TIKTOK_CHOREO points at another one, to try something out without touching the real one.)
const choreoFile = process.env.TIKTOK_CHOREO ?? join(import.meta.dirname, "lib/choreo", `${slug}.mjs`);
if (!existsSync(choreoFile)) throw new Error(`no choreography for ${slug} yet: add scripts/lib/choreo/${slug}.mjs`);
const { film } = await import(pathToFileURL(choreoFile).href);

// ── The pictures ────────────────────────────────────────────────────────────────────────────────
// Yours from photos/, or the site's own demo pictures where one is missing. They go in through the
// editor's own photo picker, exactly as a person adds them: the editor keeps a draft's photos only if
// it stored them itself, and stores them on this browser — nothing is uploaded.
const pictures = (spec.photos ?? []).map((p, i) => {
  const own = p.src ? join(dir, p.src) : null;
  if (own && existsSync(own)) return { file: own, caption: p.caption };
  console.log(`photo ${i + 1}: ${own ?? "(none)"} not found, using the demo ${p.fallback}`);
  return { file: join("public/demo/photos", `${p.fallback}.webp`), caption: p.caption };
});

// ── The browser: a phone, no cookie question, and a microphone we can blow into ───────────────────
// The templates that draw in 3D (Bloom, Passport) need WebGL, and Chrome stopped falling back to
// software rendering for it on its own — without these flags the pot comes out empty. Only for them:
// software GL slows everything else down.
const THREE_D = ["bloom", "passport"];
// TIKTOK_CHROMIUM points at a browser already on the machine (a cloud box that cannot download
// Playwright's own); otherwise Playwright's.
const browser = await chromium.launch({ ...(process.env.TIKTOK_CHROMIUM ? { executablePath: process.env.TIKTOK_CHROMIUM } : {}), args: THREE_D.includes(slug) ? ["--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--ignore-gpu-blocklist"] : [] });
// A 1080×1920 window, and the gift in a phone-sized box inside it drawn at 2.5×: it lays out exactly as
// it does on a 432-wide phone — including every size clamped in rem — and is filmed at full resolution.
// (A 2× device scale lays out right too, but the screencast then only hands back the CSS pixels.)
const PHONE = { width: 432, height: 768, zoom: 2.5 };
// Where that phone's screen goes on the slide: all of it, a little above the middle, between TikTok's
// header and its caption and left of its buttons, even on a tall phone that fills the screen by
// cropping the slide's sides. 9:16, so the gift is exactly as it was drawn, just smaller.
const SLIDE = { width: 1080, height: 1920 };
const SCREEN = { left: 189, top: 200, width: 702, height: 1248, radius: 60 };
// How the gift sits on the slide. "phone" is the phone's screen on black. "safari" is how the
// account's hits are posted: the gift full-bleed, as a screenshot, with Safari's bar along the
// bottom carrying tryethos.io — so the domain is on every gift slide. TIKTOK_STILLS=1 writes only
// the stills (still-<name>.jpg), no Live Photos, which is what a screenshot carousel needs.
const FRAME = process.env.TIKTOK_FRAME ?? "phone";
const STILLS = !!process.env.TIKTOK_STILLS;
const SLOW = Math.max(1, Math.round(Number(process.env.TIKTOK_SLOW ?? 8)));
const context = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, locale: "en-GB" });
await context.addInitScript(() => {
  try {
    localStorage.setItem("ethos-analytics-consent", "denied");
  } catch {}
  // Canvases (foil, confetti, sparkles) size themselves by the pixel ratio: at 1 they are drawn at a
  // phone's size and blown up 2.5 times with everything else. Told 2.5, they draw at their sharpest.
  Object.defineProperty(window, "devicePixelRatio", { get: () => 2.5, configurable: true });
  // The gift's clock, which can be slowed: performance.now, Date.now, timers and animation frames all
  // run `k` times slower from the moment __slowMotion(k) is called (CSS animations are slowed from the
  // outside, with the same k). Animation frames come at most 60 times a second of the gift's time, so
  // anything that counts frames instead of time keeps its speed too; and on a busy machine, where the
  // real frames thin out, each one still moves the gift on by less than the 50ms most loops clamp to.
  const realPerf = performance.now.bind(performance);
  const realDate = Date.now;
  const realRAF = window.requestAnimationFrame.bind(window);
  const realTimeout = window.setTimeout.bind(window);
  const realInterval = window.setInterval.bind(window);
  let k = 1;
  let p0 = 0;
  let d0 = 0;
  Object.defineProperty(performance, "now", { value: () => (k === 1 ? realPerf() : p0 + (realPerf() - p0) / k), configurable: true, writable: true });
  Date.now = () => (k === 1 ? realDate() : d0 + (realDate() - d0) / k);
  window.setTimeout = (fn, ms, ...args) => realTimeout(fn, (Number(ms) || 0) * k, ...args);
  window.setInterval = (fn, ms, ...args) => realInterval(fn, (Number(ms) || 0) * k, ...args);
  let queue = new Map();
  let next = 0;
  let pending = false;
  let last = -Infinity;
  const pump = () => {
    if (pending) return;
    pending = true;
    realRAF(function frame(ts) {
      // Not from `ts`: slowing the CSS animations slows the frame timestamps with them, so scaling
      // those again would run everything drawn by script k times slower still.
      const t = k === 1 ? ts : performance.now();
      if (k > 1 && t - last < 1000 / 60 - 1) return void realRAF(frame);
      last = t;
      pending = false;
      const run = queue;
      queue = new Map();
      for (const cb of run.values()) {
        try {
          cb(t);
        } catch (e) {
          reportError(e);
        }
      }
    });
  };
  window.requestAnimationFrame = (cb) => {
    queue.set(++next, cb);
    pump();
    return next;
  };
  window.cancelAnimationFrame = (id) => void queue.delete(id);
  window.__slowMotion = (factor) => {
    p0 = realPerf();
    d0 = realDate();
    k = factor;
    return d0;
  };
  window.__breath = 0;
  if (!navigator.mediaDevices) return;
  navigator.mediaDevices.getUserMedia = async () => {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = 160;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const out = ctx.createMediaStreamDestination();
    osc.connect(gain).connect(out);
    osc.start();
    await ctx.resume();
    window.setInterval(() => (gain.gain.value = window.__breath), 30);
    return out.stream;
  };
});
const page = await context.newPage();
const breathe = (v) => page.evaluate((x) => (window.__breath = x), v);

// ── The draft: let the editor write its own, then fill it in, so every field it needs is there ───
await page.goto(`${base}/create/${slug}`, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.getByLabel(/their name/i).first().fill(spec.recipientName, { timeout: 120000 });
await page.waitForFunction((k) => localStorage.getItem(k), `ethos:draft:${slug}`, { timeout: 30000 });
if (pictures.length) {
  // One at a time: given several at once the picker stores them in whatever order they finish.
  for (let n = 1; n <= pictures.length; n++) {
    await page.locator('input[type="file"][accept*="image"]').first().setInputFiles(pictures[n - 1].file);
    // Saved once it is in the draft as this browser's own copy.
    await page.waitForFunction(
      ({ key, n }) => {
        const d = JSON.parse(localStorage.getItem(key) ?? "null");
        return d && d.data.photos.length === n && d.data.photos.every((p) => p.url.startsWith("idb:"));
      },
      { key: `ethos:draft:${slug}`, n },
      { timeout: 60000 },
    );
  }
}
await page.evaluate(
  ({ key, spec, captions }) => {
    const d = JSON.parse(localStorage.getItem(key));
    d.data = {
      ...d.data,
      recipientName: spec.recipientName,
      senderName: spec.senderName,
      title: spec.title ?? "",
      message: spec.message ?? "",
      ...(spec.messageStyle ? { messageStyle: spec.messageStyle } : {}),
      photos: d.data.photos.map((p, i) => ({ ...p, caption: captions[i] ?? p.caption, alt: captions[i] ?? p.alt })),
      ...(spec.cover ? { cover: spec.cover } : {}),
      fields: { ...d.data.fields, ...spec.fields },
    };
    d.updatedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(d));
  },
  { key: `ethos:draft:${slug}`, spec, captions: pictures.map((p) => p.caption) },
);
await page.reload({ waitUntil: "domcontentloaded" });
// Wait for the editor to have read the draft back, photos and all, or the preview shows the gift
// before it.
await page.waitForFunction((name) => [...document.querySelectorAll("input")].some((i) => i.value === name), spec.recipientName, { timeout: 120000 });
await page.waitForTimeout(1500);

// ── Play it, full screen: the gift sizes itself to its box, so the box becomes the whole phone ───
// At this width the editor is in its laptop layout, with the preview in a phone frame. The frame's
// screen is the box; everything else in it (the dynamic island) goes.
await page.locator("[data-template]:visible").first().waitFor({ timeout: 60000 });
await page.evaluate((phone) => {
  const gift = [...document.querySelectorAll("[data-template]")].find((el) => el.getBoundingClientRect().width > 0);
  const box = gift.parentElement;
  for (const el of box.children) if (el !== gift) el.style.display = "none";
  // The editor stays where it is and simply isn't drawn; only the phone is.
  document.body.style.visibility = "hidden";
  box.style.visibility = "visible";
  Object.assign(box.style, { position: "fixed", inset: "auto", left: "0", top: "0", width: `${phone.width}px`, height: `${phone.height}px`, zoom: String(phone.zoom), borderRadius: "0", zIndex: "2147483000", background: "#000" });
  // The preview's own play button, beside the frame.
  let el = box;
  while (el && ![...el.querySelectorAll("button")].some((b) => /play from the start/i.test(b.textContent))) el = el.parentElement;
  [...el.querySelectorAll("button")].find((b) => /play from the start/i.test(b.textContent)).click();
}, PHONE);
await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });

// The cover, when there is one: its hint only shows once the pictures have loaded. For stills it is
// a slide of its own — every gift in the account's hits opens on "For Maya · tap to open" — so keep it.
const cover = page.getByRole("button", { name: /tap to open/i });
let coverShot = null;
if (await cover.last().waitFor({ timeout: 15000 }).then(() => true, () => false)) {
  await page.getByText(/tap to open/i).last().waitFor({ timeout: 30000 }).catch(() => {});
  // The name letters itself in over a second and a half; a still wants it written.
  await page.waitForTimeout(STILLS ? 2600 : 800);
  if (STILLS) coverShot = await page.screenshot({ type: "jpeg", quality: 95 });
  await cover.last().evaluate((b) => b.click());
}

// The templates that draw in 3D (Bloom, Passport) can't start WebGL inside a zoomed box: three.js
// measures itself as it mounts, reads the zoomed size, and draws the flower two and a half times too
// big, outside the phone — which is why the pot came out empty. So for those: take the zoom off, wait
// for three to start and measure the phone properly, put the zoom back, and hold its canvas to the
// phone's size, because it resizes itself again the moment anything else changes.
if (THREE_D.includes(slug)) {
  const sized = await page.evaluate(async (phone) => {
    const gift = document.querySelector('[data-mode="live"]');
    const box = gift?.parentElement;
    if (!box) return "no gift";
    box.style.zoom = "1";
    const until = Date.now() + 6000;
    let canvas = null;
    while (Date.now() < until && !(canvas = gift.querySelector("canvas[data-engine]"))) await new Promise((done) => setTimeout(done, 100));
    await new Promise((done) => setTimeout(done, 500));
    box.style.zoom = String(phone.zoom);
    if (!canvas) return "three never started";
    const pin = () => {
      if (canvas.style.width !== "100%" || canvas.style.height !== "100%") {
        canvas.style.width = "100%";
        canvas.style.height = "100%";
      }
    };
    pin();
    new MutationObserver(pin).observe(canvas, { attributes: true, attributeFilter: ["style"] });
    return `${canvas.dataset.engine} drawing at ${canvas.width}×${canvas.height}`;
  }, PHONE);
  console.log(`3D: ${sized}`);
  await page.waitForTimeout(800);
}

// ── Filming: every frame the compositor draws, as the phone shows it at 1080×1920 ───────────────
// Straight to disk as they arrive: at this size a few seconds of frames held in memory is gigabytes.
const reel = join(tmpdir(), `tiktok-reel-${process.pid}`);
rmSync(reel, { recursive: true, force: true });
mkdirSync(reel, { recursive: true });
const cdp = await context.newCDPSession(page);
// From here on the gift runs SLOW times slower. Every time below is the gift's own: real seconds after
// the switch count 1/SLOW each, for the frames as much as for the choreography.
await cdp.send("Animation.enable");
const switchedAt = await page.evaluate((k) => window.__slowMotion(k), SLOW);
await cdp.send("Animation.setPlaybackRate", { playbackRate: 1 / SLOW });
const gift = (real) => (real * 1000 < switchedAt ? real : (switchedAt + (real * 1000 - switchedAt) / SLOW) / 1000);
const frames = [];
cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
  const file = join(reel, `${String(frames.length).padStart(6, "0")}.jpg`);
  writeFileSync(file, Buffer.from(data, "base64"));
  frames.push({ file, t: gift(metadata.timestamp) });
  cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
const now = () => gift(Date.now() / 1000);

// Everything the choreography does waits inside the page, not by asking it over and over from here:
// with the screencast running every question from here is slow, and a slow question overshoots.
const live = page.locator('[data-mode="live"]');
const inGift = (fn, arg, seconds) => page.waitForFunction(fn, arg, { timeout: seconds * 1000 * SLOW, polling: 25 }).catch(() => console.log("  (timed out waiting, carrying on)"));
// The page as the choreography sees it: its waits are in the gift's seconds too.
const slowed = new Proxy(page, {
  get(target, key) {
    if (key === "waitForTimeout") return (ms) => target.waitForTimeout(ms * SLOW);
    if (key === "waitForFunction") return (fn, arg, opts = {}) => target.waitForFunction(fn, arg, { ...opts, timeout: (opts.timeout ?? 30000) * SLOW });
    const v = Reflect.get(target, key, target);
    return typeof v === "function" ? v.bind(target) : v;
  },
});
const clips = await film({ page: slowed, live, spec, breathe, inGift, now, pictures, slow: SLOW }).catch(async (e) => {
  await page.screenshot({ path: join(dir, "debug-gift.png") });
  throw e;
});
await cdp.send("Page.stopScreencast");

// ── The slide: black, and the phone's screen on it with the corners a phone has ─────────────────
const svg = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SLIDE.width}" height="${SLIDE.height}">${body}</svg>`);
const { left: L, top: T, width: W, height: H, radius: R } = SCREEN;
// A hairline round the screen, so a dark gift doesn't melt into the black.
const backdrop = await sharp(svg(`<rect width="100%" height="100%" fill="#000"/><rect x="${L - 1.5}" y="${T - 1.5}" width="${W + 3}" height="${H + 3}" rx="${R + 1.5}" fill="none" stroke="#fff" stroke-opacity="0.16" stroke-width="3"/>`)).png().toBuffer();
const corners = await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="${R}" fill="#fff"/></svg>`)).png().toBuffer();
// Safari's bar, the way an iPhone draws it over a page: three pills along the foot of the screen,
// the middle one with the site's name. Drawn over the frame, as on a screenshot.
const safariBar = await sharp(svg(`
  <defs><filter id="s" x="-10%" y="-30%" width="120%" height="170%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.13"/></filter></defs>
  <g filter="url(#s)" fill="#fbf8f2" fill-opacity="0.94">
    <rect x="96" y="1770" width="112" height="110" rx="55"/><rect x="258" y="1770" width="568" height="110" rx="55"/><rect x="858" y="1770" width="116" height="110" rx="58"/>
  </g>
  <g fill="none" stroke="#3a3a3c" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M162 1802 l-22 23 22 23" stroke="#b8b8bc"/>
    <rect x="300" y="1811" width="34" height="22" rx="4"/><path d="M296 1841 h42" stroke-width="6"/>
    <path d="M785 1812 a15 15 0 1 1 -4 -11" /><path d="M781 1796 l4 5 -6 3"/>
  </g>
  <g fill="#3a3a3c"><circle cx="898" cy="1825" r="4.5"/><circle cx="916" cy="1825" r="4.5"/><circle cx="934" cy="1825" r="4.5"/></g>
  <text x="542" y="1840" text-anchor="middle" font-family="Inter, Helvetica, Arial, sans-serif" font-size="38" font-weight="600" fill="#1c1c1e">tryethos.io</text>
`)).png().toBuffer();
const onSlide = async (frame) =>
  FRAME === "safari"
    ? sharp(frame).resize(SLIDE.width, SLIDE.height, { kernel: "lanczos3" }).composite([{ input: safariBar, left: 0, top: 0 }]).removeAlpha()
    : sharp(backdrop)
        .composite([{ input: await sharp(frame).resize(W, H, { kernel: "lanczos3" }).composite([{ input: corners, blend: "dest-in" }]).png().toBuffer(), left: L, top: T }])
        .removeAlpha();

if (coverShot) {
  const out = join(dir, "still-cover.jpg");
  await (await onSlide(coverShot)).jpeg({ quality: 95 }).toFile(out);
  console.log(`wrote ${out}`);
}

// ── Cutting: frames held until the next one arrives, at a steady 30fps, into H.264 ───────────────
async function cut(name, from, to, stillAt = from) {
  const fps = 30;
  if (STILLS) {
    // Just the moment: the last frame the screencast caught before stillAt, on the slide.
    let k = 0;
    while (k + 1 < frames.length && frames[k + 1].t <= stillAt) k++;
    const out = join(dir, `still-${name}.jpg`);
    await (await onSlide(frames[k].file)).jpeg({ quality: 95 }).toFile(out);
    console.log(`wrote ${out}`);
    return;
  }
  const tmp = join(tmpdir(), `tiktok-live-${name}-${process.pid}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  let j = 0;
  const n = Math.round((to - from) * fps);
  const used = [];
  for (let i = 0; i < n; i++) {
    const t = from + i / fps;
    while (j + 1 < frames.length && frames[j + 1].t <= t) j++;
    used.push(frames[j].file);
  }
  // Each frame onto the slide once, however many times it is held.
  const placed = new Map();
  for (const [i, file] of used.entries()) {
    if (!placed.has(file)) {
      const out = join(tmp, `p${String(placed.size).padStart(5, "0")}.jpg`);
      await (await onSlide(file)).jpeg({ quality: 97, chromaSubsampling: "4:4:4" }).toFile(out);
      placed.set(file, out);
    }
    copyFileSync(placed.get(file), join(tmp, `f${String(i).padStart(5, "0")}.jpg`));
  }
  // A MOV straight out of ffmpeg, no faststart: the Live Photo writer appends to its mdat, which
  // only works while moov still comes last. No B-frames either, so the video starts on its first frame
  // rather than behind a two-frame edit, as an iPhone's does. Tagged BT.709, as an iPhone's video is.
  const raw = join(tmp, "raw.mov");
  execFileSync("ffmpeg", [
    ...["-y", "-loglevel", "error", "-framerate", String(fps), "-i", join(tmp, "f%05d.jpg")],
    ...["-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "15", "-bf", "0"],
    ...["-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"],
    ...["-movflags", "+write_colr", "-map_metadata", "-1", "-f", "mov", raw],
  ]);
  // The still is the clip's best moment, not its first — what shows before the Live Photo plays —
  // and it is that exact frame of the movie, at the time the movie says the still was taken.
  const idx = Math.max(0, Math.min(n - 2, Math.floor((stillAt - from) * fps)));
  const still = await (await onSlide(used[idx])).jpeg({ quality: 95 }).toBuffer();
  const { pvt } = writeLivePhoto({ dir, name: `live-${name}`, mov: raw, still, stillTime: idx / fps });
  rmSync(tmp, { recursive: true, force: true });
  console.log(`wrote ${pvt} (${(to - from).toFixed(1)}s from ${placed.size} different frames, still at ${(idx / fps).toFixed(2)}s)`);
}
if (!frames.length) throw new Error("the screencast caught no frames");
const size = await sharp(frames[0].file).metadata();
const span = frames.at(-1).t - frames[0].t;
console.log(`${frames.length} frames at ${size.width}×${size.height}, ${(frames.length / span).toFixed(0)} a second of the gift's time (filmed ${SLOW}× slowed)`);

for (const c of clips) await cut(c.name, c.from, c.to, c.stillAt ?? c.from);
rmSync(reel, { recursive: true, force: true });
await browser.close();
