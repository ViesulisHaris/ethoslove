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
 * Only Halfway is choreographed so far: the postcard at rest, the flight, a held moment on the
 * halfway note; the rest of the way to the heart; then the postcard turning over to the letter, and
 * down to the photos if the gift has any. `"photos": []` in gift.json makes it a letter and nothing
 * else. Blowing is faked the way
 * the Halfway e2e tests fake it — a square wave in place of the microphone, as loud as `__breath`.
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { writeLivePhoto } from "./lib/live-photo.mjs";

const [dir, base = "http://localhost:3000"] = process.argv.slice(2);
if (!dir) throw new Error("usage: node scripts/tiktok-gift-live.mjs <carousel folder> [base url]");
const spec = JSON.parse(readFileSync(join(dir, "gift.json"), "utf8"));
if (spec.template !== "halfway") throw new Error(`no choreography for ${spec.template} yet`);
const slug = spec.template;

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
const browser = await chromium.launch();
// A 1080×1920 window, and the gift in a phone-sized box inside it drawn at 2.5×: it lays out exactly as
// it does on a 432-wide phone — including every size clamped in rem — and is filmed at full resolution.
// (A 2× device scale lays out right too, but the screencast then only hands back the CSS pixels.)
const PHONE = { width: 432, height: 768, zoom: 2.5 };
const context = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, locale: "en-GB" });
await context.addInitScript(() => {
  try {
    localStorage.setItem("ethos-analytics-consent", "denied");
  } catch {}
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

// The cover, when there is one: its hint only shows once the pictures have loaded.
const cover = page.getByRole("button", { name: /tap to open/i });
if (await cover.last().waitFor({ timeout: 15000 }).then(() => true, () => false)) {
  await page.getByText(/tap to open/i).last().waitFor({ timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(800);
  await cover.last().evaluate((b) => b.click());
}

// ── Filming: every frame the compositor draws, as the phone shows it at 1080×1920 ───────────────
// Straight to disk as they arrive: at this size a few seconds of frames held in memory is gigabytes.
const reel = join(tmpdir(), `tiktok-reel-${process.pid}`);
rmSync(reel, { recursive: true, force: true });
mkdirSync(reel, { recursive: true });
const cdp = await context.newCDPSession(page);
const frames = [];
cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
  const file = join(reel, `${String(frames.length).padStart(6, "0")}.jpg`);
  writeFileSync(file, Buffer.from(data, "base64"));
  frames.push({ file, t: metadata.timestamp });
  cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
const now = () => Date.now() / 1000;
const marks = {};

// Everything below waits inside the page, not by asking it over and over from here: with the
// screencast running every question from here is slow, and a slow question overshoots the moment.
const live = page.locator('[data-mode="live"]');
const inGift = (fn, arg, seconds) => page.waitForFunction(fn, arg, { timeout: seconds * 1000, polling: 25 }).catch(() => console.log("  (timed out waiting, carrying on)"));
const km = () => live.locator("p.tabular-nums").first().innerText().then((t) => Number(t.replace(/[^\d]/g, "")));

const blowButton = page.getByRole("button", { name: new RegExp(`blow the .* to ${spec.recipientName}`, "i") });
await blowButton.waitFor({ timeout: 60000 }).catch(async (e) => {
  await page.screenshot({ path: join(dir, "debug-gift.png") });
  throw e;
});
await page.waitForTimeout(1200);
console.log(`the postcard says ${await km()} km`);

// The microphone first, so the clip opens on the postcard asking to be blown, not on a permission.
await blowButton.evaluate((b) => b.click());
await live.getByText(/blow into your phone/i).first().waitFor({ timeout: 15000 });
marks.rest = now();
await page.waitForTimeout(350);

// Ease off a little before the middle: the plane glides on after the breath stops, so letting go at
// the note overshoots to three quarters of the way, and "halfway" reads wrong over "148 km to go".
// The glide carries it over the middle and the note comes up; a short puff if it falls short.
const noteUp = (note) => document.querySelector('[data-mode="live"]')?.innerText.includes(note);
const total = await km();
const kmBelow = (limit) => Number((document.querySelector('[data-mode="live"] p.tabular-nums')?.innerText ?? "").replace(/[^\d]/g, "")) < limit;
await breathe(0.5);
// The clip opens a beat before the plane moves, not on the whole wait for a breath to register.
await inGift(kmBelow, total, 6);
marks.rest = Math.max(marks.rest, now() - 0.9);
// Let go at 58% of the way left: at 64% the glide stopped a few kilometres short of the middle.
await inGift(kmBelow, total * 0.58, 8);
await breathe(0);
if (!(await page.waitForFunction(noteUp, spec.fields.halfwayNote, { timeout: 2500, polling: 25 }).then(() => true, () => false))) {
  await breathe(0.5);
  await inGift(noteUp, spec.fields.halfwayNote, 4);
  await breathe(0);
}
await page.waitForTimeout(1700);
marks.noteEnd = now();

// The rest of the way: the path becomes a heart.
marks.resume = now();
await breathe(0.5);
await inGift(() => /together/i.test(document.querySelector('[data-mode="live"]')?.innerText ?? ""), null, 8);
await breathe(0);
marks.together = now();
await page.waitForTimeout(1700);
marks.heart = now();

// The postcard turns over and the letter comes up, signed.
await inGift(() => /a postcard from/i.test(document.querySelector('[data-mode="live"]')?.innerText ?? ""), null, 12);
marks.flipped = now();
await page.waitForTimeout(3400);
marks.letter = now();

// With photos, carry on down to them, the way a thumb would. They only arrive once the letter has
// finished, so wait for them rather than scrolling to where they are going to be.
if (pictures.length) {
  await inGift(() => [...(document.querySelector('[data-mode="live"]')?.querySelectorAll("img") ?? [])].some((i) => i.complete && i.getBoundingClientRect().width > 0 && !i.closest("[aria-hidden=true]")), null, 8);
  await page.waitForTimeout(400);
  await page.evaluate(async () => {
    const gift = document.querySelector('[data-mode="live"]');
    const sc = [...gift.querySelectorAll("div")].find((d) => /overflow-y-auto/.test(d.className));
    const heading = [...gift.querySelectorAll("p,h2,h3,span,div")].find((e) => /^\s*along the way\s*$/i.test(e.textContent ?? ""));
    if (!sc) return;
    // Where the photos start, in the page's own units: inside the zoomed box a bounding rectangle is
    // 2.5 times the size of a scroll position, and mixing the two lands on the end card.
    let y = 0;
    for (let e = heading; e && e !== sc; e = e.offsetParent) y += e.offsetTop;
    const target = Math.min(sc.scrollHeight - sc.clientHeight, heading ? y - 24 : Infinity);
    const from = sc.scrollTop;
    const start = performance.now();
    await new Promise((done) => {
      const step = (t) => {
        const k = Math.min(1, (t - start) / 2600);
        sc.scrollTop = from + (target - from) * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
        if (k < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });
  });
  await page.waitForTimeout(1300);
}
marks.end = now();
await cdp.send("Page.stopScreencast");

// ── Cutting: frames held until the next one arrives, at a steady 30fps, into H.264 ───────────────
async function cut(name, from, to, stillAt = from) {
  const fps = 30;
  const tmp = join(tmpdir(), `tiktok-live-${name}-${process.pid}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  let j = 0;
  const n = Math.round((to - from) * fps);
  const used = [];
  for (let i = 0; i < n; i++) {
    const t = from + i / fps;
    while (j + 1 < frames.length && frames[j + 1].t <= t) j++;
    copyFileSync(frames[j].file, join(tmp, `f${String(i).padStart(5, "0")}.jpg`));
    used.push(frames[j].file);
  }
  // A MOV straight out of ffmpeg, no faststart: the Live Photo writer appends to its mdat, which
  // only works while moov still comes last. No B-frames either, so the video starts on its first frame
  // rather than behind a two-frame edit, as an iPhone's does.
  const raw = join(tmp, "raw.mov");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(fps), "-i", join(tmp, "f%05d.jpg"), "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-bf", "0", "-pix_fmt", "yuv420p", "-map_metadata", "-1", "-f", "mov", raw]);
  // The still is the clip's best moment, not its first — what shows before the Live Photo plays —
  // and it is that exact frame of the movie, at the time the movie says the still was taken.
  const idx = Math.max(0, Math.min(n - 2, Math.floor((stillAt - from) * fps)));
  const still = await sharp(used[idx]).jpeg({ quality: 92 }).toBuffer();
  const { pvt } = writeLivePhoto({ dir, name: `live-${name}`, mov: raw, still, stillTime: idx / fps });
  rmSync(tmp, { recursive: true, force: true });
  console.log(`wrote ${pvt} (${(to - from).toFixed(1)}s, still at ${(idx / fps).toFixed(2)}s)`);
}
if (!frames.length) throw new Error("the screencast caught no frames");
const size = await sharp(frames[0].file).metadata();
console.log(`${frames.length} frames at ${size.width}×${size.height}`);

// Three clips: the flight to the note, the rest of the way to the heart, and the postcard turning over
// to the letter (and down to the photos, when there are some).
await cut("flight", marks.rest, marks.noteEnd, marks.noteEnd - 0.2); // the note up
await cut("home", marks.resume, marks.heart, marks.together + 0.9); // the heart
await cut("letter", marks.heart, marks.end, marks.end - 0.1); // the letter, signed (or the photos)
rmSync(reel, { recursive: true, force: true });
await browser.close();
