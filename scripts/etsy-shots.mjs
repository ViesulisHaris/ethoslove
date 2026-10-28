// For the Etsy listings: each gift's live demo on an iPhone, played through, with a screenshot every
// 1.2 s (3x pixels). Interactions follow scripts/capture-thumbnails.mjs.
//   node scripts/etsy-shots.mjs <repo> <out> [base=https://tryethos.io] [slugs…]
// With ETSY_VIDEO=1 it plays them through again for the listing video instead: the screen recorded at
// full 3x size (Chrome's screencast), no stills taken meanwhile, made into a 15 s 1080x1920 <out>/<slug>/video.mp4.
// (Stills during Playwright's own recording slipped 3x frames into it: the video kept zooming in and out.)
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { linkSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [WT, OUT, BASE = "https://tryethos.io", ...only] = process.argv.slice(2);
const req = createRequire(join(WT, "package.json"));
const { chromium, devices } = req("@playwright/test");
const W = 405, H = 720;
const VIDEO = process.env.ETSY_VIDEO === "1";

/** Seconds of the first screen kept before the first tap: the bouquet is the picture itself, so it stays longer. */
const PREROLL = { bouquet: 3.5 };

/** Records the screen while `run` plays the gift, then cuts the first 15 s into dir/video.mp4. */
async function screencast(page, dir, run, slug) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  mkdirSync(join(dir, "cast"), { recursive: true });
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    const file = join(dir, "cast", `${String(frames.length).padStart(5, "0")}.jpg`).replace(/\\/g, "/");
    writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, t: metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  // The video starts just before the first tap, not on the seconds the script waits for the page to settle.
  await page.evaluate(() => { window.__firstTap = null; addEventListener("pointerdown", () => { window.__firstTap ??= Date.now(); }, true); });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W * 3, maxHeight: H * 3, everyNthFrame: 1 });
  try { await run(); } catch (e) { console.log("FAILED", e.message.split("\n")[0]); }
  await page.waitForTimeout(1500);
  await cdp.send("Page.stopScreencast").catch(() => {});
  const firstTap = await page.evaluate(() => window.__firstTap).catch(() => null);
  const from = firstTap ? firstTap / 1000 - (PREROLL[slug] ?? 1.2) : frames[0].t;
  // Chrome sends a frame only when the screen changes (about every 16.7 ms while something moves). Laid out
  // on an exact 60 fps clock (each tick shows the latest frame), then every other tick: an even 30 fps.
  // (ffmpeg's concat with per-frame durations rounds them to 1/25 s and repeated every 6th frame.)
  const seq = join(dir, "seq");
  mkdirSync(seq, { recursive: true });
  const last = frames.at(-1).t;
  let i = 0;
  for (let k = 0; k < 15 * 60 && from + k / 60 <= last; k++) {
    const t = from + k / 60;
    while (i + 1 < frames.length && frames[i + 1].t <= t) i++;
    linkSync(frames[i].file, join(seq, `${String(k).padStart(5, "0")}.jpg`));
  }
  // Etsy takes up to 10 MB per upload here: busy collages get a lighter encode.
  const encode = (crf) => execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", "60", "-i", join(seq, "%05d.jpg"), "-vf", "fps=30,scale=1080:1920:flags=lanczos", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", String(crf), "-preset", "slow", "-movflags", "+faststart", join(dir, "video.mp4")]);
  encode(20);
  if (statSync(join(dir, "video.mp4")).size > 9.5e6) encode(25);
  return frames.length;
}

/**
 * Moves a scroller from where it is to `to(el)` over 1.1 s, eased, one step per frame. The browser's own
 * smooth scroll covers half a screen in three frames and drops one on the way: a jerk in the video.
 */
const GLIDE = `(el, top) => new Promise((done) => {
  const y0 = el.scrollTop, t0 = performance.now(), ms = 1100;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / ms), e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
    el.scrollTo({ top: y0 + (top - y0) * e, behavior: "instant" });
    if (p < 1) requestAnimationFrame(step); else done();
  };
  requestAnimationFrame(step);
})`;
const glideBy = (scroller, part) => scroller.evaluate((el, [glide, part]) => (0, eval)(glide)(el, el.scrollTop + el.clientHeight * part), [GLIDE, part]);

async function scrollCollage(page, opener) {
  await page.getByRole("button", { name: opener }).first().click({ force: true, timeout: 20000 });
  const scroller = page.locator("[data-scroller]");
  await scroller.waitFor({ timeout: 15000 });
  await page.waitForTimeout(3600);
  for (let i = 0; i < 6; i++) { await glideBy(scroller, 0.62); await page.waitForTimeout(700); }
}
const swipeUp = async (page) => { await page.mouse.move(W / 2, H * 0.8); await page.mouse.down(); await page.mouse.move(W / 2, H * 0.45, { steps: 6 }); await page.mouse.up(); };
/** Taps through a gift's cover, when it has one. */
async function open(page) {
  const cover = page.getByRole("button", { name: /tap to open/i }).first();
  if (await cover.waitFor({ timeout: 6000 }).then(() => true, () => false)) { await page.waitForTimeout(1600); await cover.click({ force: true }); await page.waitForTimeout(2200); }
}
/** Scrolls the gift so a section starts at the top of the screen (no half-scrolled stills): the last text matching `re`, `offset` px down. */
const scrollToText = (page, re, offset = 30) =>
  page.evaluate(({ src, flags, offset, glide }) => {
    const rx = new RegExp(src, flags);
    const el = [...document.querySelectorAll("body *")].filter((e) => e.children.length === 0 && rx.test((e.textContent || "").trim())).pop();
    let sc = el?.parentElement;
    while (sc && !(sc.scrollHeight > sc.clientHeight + 10 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    if (sc) return (0, eval)(glide)(sc, el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - offset);
  }, { src: re.source, flags: re.flags, offset, glide: GLIDE });
const scrollDown = async (page, sel, times, part = 0.55, wait = 1500) => {
  const sc = page.locator(sel).last();
  if (await sc.count()) for (let i = 0; i < times; i++) { await glideBy(sc, part).catch(() => {}); await page.waitForTimeout(Math.max(300, wait - 1100)); }
};

const SCRIPTS = {
  "popup-card": async (page) => {
    const card = page.getByRole("button", { name: /open the card/i });
    await card.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2000);
    await card.click({ force: true });
    await page.waitForTimeout(2800);
    const candles = page.locator("[data-candle]");
    const n = await candles.count();
    for (let i = 0; i < n; i++) { await candles.nth(i).click({ force: true }); await page.waitForTimeout(450); }
    await page.waitForTimeout(1500);
    await swipeUp(page);
    await page.waitForTimeout(4500);
    const sc = page.locator(".overflow-y-auto").last();
    if (await sc.count()) for (let i = 0; i < 3; i++) { await glideBy(sc, 0.6).catch(() => {}); await page.waitForTimeout(500); }
  },
  bouquet: async (page) => {
    const card = page.getByRole("button", { name: /open the card/i }).first();
    await card.waitFor({ timeout: 20000 });
    await page.waitForTimeout(4000);
    await card.click({ force: true });
    await page.waitForTimeout(6000);
  },
  xoxo: async (page) => scrollCollage(page, /open it/i),
  coquette: async (page) => scrollCollage(page, /untie the bow/i),
  "birthday-cinema": async (page) => {
    await page.getByRole("button", { name: /tap to start/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1600);
    await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
    await page.waitForTimeout(3000);
    for (let i = 0; i < 7; i++) { await swipeUp(page); await page.waitForTimeout(450); }
    await page.waitForTimeout(6000);
  },
  digicam: async (page) => {
    const power = page.getByRole("button", { name: /turn the camera on/i });
    await power.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1800);
    await power.click({ force: true });
    await page.waitForFunction(() => [...document.querySelectorAll("button[aria-label^='Photo 1 of']")].some((b) => !b.disabled), null, { timeout: 20000 });
    await page.waitForTimeout(1200);
    const shutter = page.getByRole("button", { name: /take a picture/i });
    for (let i = 0; i < 2; i++) { await shutter.click({ force: true }); await page.waitForTimeout(1500); }
    for (let i = 0; i < 4; i++) { await page.getByRole("button", { name: /next photo/i }).click({ force: true }); await page.waitForTimeout(400); }
    await page.waitForTimeout(600);
    await shutter.click({ force: true });
    await page.waitForTimeout(6000);
  },
  scrapbook: async (page) => {
    const book = page.getByRole("button", { name: /open the scrapbook/i });
    await book.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2000);
    await book.click({ force: true });
    await page.waitForTimeout(3000);
    const sc = page.locator('[data-template="scrapbook"] .overflow-y-auto').last();
    for (let i = 0; i < 6; i++) { await glideBy(sc, 0.45); await page.waitForTimeout(400); }
  },
  museum: async (page) => {
    const enter = page.getByRole("button", { name: /^enter$/i }).first();
    await enter.waitFor({ timeout: 15000 });
    await page.waitForTimeout(2200);
    await enter.click({ force: true });
    await page.waitForTimeout(2000);
    for (let i = 0; i < 5; i++) { await page.getByRole("button", { name: /next room/i }).first().click({ force: true }).catch(() => {}); await page.waitForTimeout(1800); }
  },
  "jar-of-reasons": async (page) => {
    const jar = page.getByRole("button", { name: /tap the jar/i });
    await jar.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    await jar.click({ force: true });
    await page.waitForTimeout(2200);
    await page.mouse.click(W / 2, H * 0.93);
    await page.waitForTimeout(1200);
    for (let i = 0; i < 5; i++) { await page.getByRole("button", { name: /pull another/i }).click({ force: true, timeout: 5000 }).catch(() => {}); await page.waitForTimeout(2200); await page.mouse.click(W / 2, H * 0.93); await page.waitForTimeout(1200); }
  },
  halfway: async (page) => {
    const plane = page.getByRole("button", { name: /fly to/i });
    await plane.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    await plane.click({ force: true });
    await page.waitForTimeout(10000);
    await scrollDown(page, ".overflow-y-auto", 3);
  },
  passport: async (page) => {
    const cover = page.getByRole("button", { name: /^open$/i }).first();
    await cover.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    await cover.click({ force: true });
    await page.waitForTimeout(16000);
    await scrollToText(page, /^visa$/i, 40);
    await page.waitForTimeout(9000);
  },
  "pack-your-bags": async (page) => {
    const clues = page.getByTestId("pyb-clue");
    await clues.first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(2000);
    const count = await clues.count();
    for (let i = 0; i < count; i++) { await clues.nth(i).click({ force: true }); await page.waitForTimeout(1100); }
    await page.waitForTimeout(1200);
    await page.getByTestId("pyb-where").click({ force: true, timeout: 12000 });
    await page.locator('[data-testid="pyb-board"][data-resolved="true"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(2400);
    await page.getByTestId("pyb-to-ticket").click({ force: true, timeout: 8000 });
    await page.waitForTimeout(3600);
    await page.getByTestId("pyb-stub").click({ force: true });
    await page.waitForTimeout(4500);
    await scrollDown(page, ".overflow-y-auto", 2);
  },
  "scratch-card": async (page) => {
    const start = page.getByRole("button", { name: /scratch here/i }).first();
    await start.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    await start.click({ force: true });
    await page.waitForTimeout(1400);
    for (let card = 0; card < 6; card++) {
      const box = await page.locator("canvas[role=img]").first().boundingBox().catch(() => null);
      // Back and forth in one long stroke, close rows, until the foil gives way (it clears itself past 55%).
      if (box) {
        await page.mouse.move(box.x + 6, box.y + 10);
        await page.mouse.down();
        for (let row = 0; row < 14; row++) { const y = box.y + 10 + (row / 13) * (box.height - 20); await page.mouse.move(row % 2 ? box.x + 6 : box.x + box.width - 6, y, { steps: 24 }); }
        await page.mouse.up();
      }
      await page.waitForTimeout(2200);
      const next = page.getByRole("button", { name: /^(next card|the last one)$/i });
      if (!(await next.count())) break;
      await next.click({ force: true });
      await page.waitForTimeout(1200);
    }
    await page.waitForTimeout(3000);
  },
  "snow-globe": async (page) => {
    await open(page);
    await page.getByRole("button", { name: /shake the globe/i }).waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    for (let i = 0; i < 3; i++) { await page.getByRole("button", { name: /^shake it$/i }).click({ force: true }); await page.waitForTimeout(4200); }
    await page.getByRole("button", { name: /turn it over/i }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(6500);
  },
  fireside: async (page) => {
    await open(page);
    const candle = page.getByRole("button", { name: /light the candle/i });
    await candle.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    await candle.click({ force: true });
    await page.waitForTimeout(9000);
    await scrollDown(page, ".overflow-y-auto", 3);
  },
  arcade: async (page) => {
    await page.getByRole("button", { name: /press start/i }).waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    await page.getByRole("button", { name: /press start/i }).click({ force: true });
    for (let level = 0; level < 4; level++) {
      const box = await page.locator("canvas").first().boundingBox().catch(() => null);
      // A few seconds of play, then on to the photo the level unlocks (the video has 15 s for it all).
      if (box) for (let i = 0; i < (VIDEO ? 3 : 14); i++) { const x = box.x + 20 + ((i * 53) % (box.width - 40)); await page.mouse.move(x, box.y + box.height - 24, { steps: 4 }); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(260); }
      // "Skip level" only shows once a level is lost; the video waits for it rather than for the end.
      await page.getByRole("button", { name: /skip level/i }).click({ force: true, timeout: VIDEO ? 15000 : 4000 }).catch(() => {});
      await page.waitForTimeout(2600);
      const next = page.getByRole("button", { name: /next level/i });
      if (!(await next.count())) break;
      await next.click({ force: true });
      await page.waitForTimeout(800);
    }
    await page.getByRole("button", { name: /read message/i }).click({ force: true, timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(4500);
  },
  "on-repeat": async (page) => {
    await page.getByRole("button", { name: /press play/i }).first().click({ force: true, timeout: 20000 });
    await page.locator("[data-scroller]").waitFor({ timeout: 15000 });
    await page.waitForTimeout(4800);
    await scrollToText(page, /^playlist$/i, 34);
    await page.waitForTimeout(3600);
    await scrollToText(page, /^dear /i, 64);
    await page.waitForTimeout(8000);
  },
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const [slug, run] of Object.entries(SCRIPTS)) {
  if (only.length && !only.includes(slug)) continue;
  const dir = join(OUT, slug);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "frames"), { recursive: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    viewport: { width: W, height: H },
    deviceScaleFactor: 3,
    locale: "en-US",
  });
  await context.route(/clarity\.ms|facebook|_vercel\//, (r) => r.abort());
  await context.addInitScript((css) => {
    const add = () => { if (!document.head) return false; const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); return true; };
    if (add()) return;
    const w = new MutationObserver(() => add() && w.disconnect());
    w.observe(document, { childList: true, subtree: true });
  }, '[data-demo-chrome], a[href*="/templates/"], a[href="/?ref=watermark"], nextjs-portal, [data-consent], [role="dialog"][aria-label*="ookie" i] { display: none !important; }');
  const page = await context.newPage();
  await page.goto(`${BASE}/demo/${slug}`, { waitUntil: "networkidle", timeout: 90000 });
  // Controls that aren't part of the gift (skip, mute) stay out of the pictures.
  await page.evaluate(() => {
    const hide = () => document.querySelectorAll("button").forEach((b) => { if (/^(skip|saltar)$/i.test((b.textContent || "").trim()) || /^(mute music|play music)/i.test(b.getAttribute("aria-label") || "")) b.style.visibility = "hidden"; });
    hide(); new MutationObserver(hide).observe(document.body, { childList: true, subtree: true });
  });
  if (VIDEO) {
    const n = await screencast(page, dir, () => run(page), slug);
    await context.close();
    console.log("recorded", slug, n, "screen frames");
    continue;
  }
  let running = true;
  let n = 0;
  const loop = (async () => {
    while (running) {
      const at = Date.now();
      try { writeFileSync(join(dir, "frames", `${String(n++).padStart(3, "0")}.png`), await page.screenshot()); } catch {}
      await page.waitForTimeout(Math.max(0, 1200 - (Date.now() - at)));
    }
  })();
  try { await run(page); } catch (e) { console.log("FAILED", slug, e.message.split("\n")[0]); }
  await page.waitForTimeout(1500);
  running = false;
  await loop;
  await context.close();
  console.log("captured", slug, n, "frames");
}
await browser.close();
