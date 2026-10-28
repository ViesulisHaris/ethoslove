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

/**
 * Words a buyer types into the gift, swapped into a demo whose listing sells it for another day: the
 * Midnight Countdown demo counts to a birthday, its listing to New Year's Eve (its own countdown already
 * ends at midnight on 1 January). Only the fields' text changes; the template draws it as it would.
 */
const WORDS = {
  "midnight-countdown": [
    ["Until you're 30", "Until 2027"],
    ["Happy birthday, Ana.", "Happy New Year, Ana."],
    ["I wanted to be the first. Not", "I wanted to be the first this year. Not"],
    ["the day gets loud", "everyone starts singing"],
    ["So: happy birthday. Here's the year in six frames.", "So: happy New Year. Here's the last one in six frames."],
  ],
};

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

async function scrollCollage(page, opener, wait = 0) {
  const button = page.getByRole("button", { name: opener }).first();
  // `wait`: a still of the closed cover before it opens.
  if (wait) { await button.waitFor({ timeout: 20000 }); await page.waitForTimeout(wait); }
  await button.click({ force: true, timeout: 20000 });
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
  // Wave 3, the other 37 (interactions from scripts/capture-thumbnails.mjs, held longer for the stills).
  constellations: async (page) => {
    await page.locator("[data-star]").first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    // Every star, so the heart closes and the message comes up under it. The stars are only there while
    // no photo is open, and some sit outside the screen until the phone tilts: tapped from the page.
    const unseen = page.locator('[data-star][data-visited="false"]');
    for (let i = 0; i < 12 && (await unseen.count()); i++) {
      await unseen.first().click({ force: true, timeout: 2000 }).catch(() => page.evaluate(() => document.querySelector('[data-star][data-visited="false"]')?.click()));
      await page.waitForTimeout(VIDEO ? 1600 : 2200);
      await page.getByTestId("close-photo").click({ force: true, timeout: 4000 }).catch(() => {});
      await page.locator("[data-star]").first().waitFor({ timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(VIDEO ? 300 : 800);
    }
    await page.waitForTimeout(9000);
  },
  "the-letter": async (page) => {
    const seal = page.getByRole("button", { name: /tap the seal/i });
    await seal.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    await seal.click({ force: true });
    // The letter writes itself and scrolls along with the pen.
    await page.waitForTimeout(24000);
  },
  "autumn-reel": async (page) => scrollCollage(page, /tap to develop/i),
  "be-my-boo": async (page) => scrollCollage(page, /tap the ghost/i),
  "dark-romance": async (page) => scrollCollage(page, /turn the key/i),
  evergreen: async (page) => scrollCollage(page, /unwrap the newspaper/i),
  "fall-for-you": async (page) => scrollCollage(page, /light the candle/i),
  "favorite-person": async (page) => scrollCollage(page, /lift the tissue paper/i, 2400),
  keepsake: async (page) => scrollCollage(page, /break the seal/i),
  "spooky-season": async (page) => scrollCollage(page, /blow the leaves/i),
  balloons: async (page) => {
    await open(page);
    const balloon = page.locator("[data-balloon]:not([data-letter])");
    await balloon.first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(2600);
    const count = await balloon.count();
    for (let i = 0; i < count; i++) { await page.locator("[data-balloon]:not([data-letter])").first().click({ force: true }); await page.waitForTimeout(900); }
    await page.waitForTimeout(1200);
    await page.locator("[data-letter]").first().click({ force: true });
    await page.waitForTimeout(3600);
    await scrollDown(page, '[data-template="balloons"] .overflow-y-auto', 3);
  },
  "bat-swarm": async (page) => {
    const moon = page.getByRole("button", { name: /tap the moon/i });
    await moon.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    await moon.click({ force: true });
    await page.waitForTimeout(13000);
    await scrollDown(page, ".overflow-y-auto", 3);
  },
  bloom: async (page) => {
    const hold = page.locator("[data-hold]");
    await hold.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    const box = await hold.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    // Held until it is fully open: headless WebGL draws few frames, so that takes longer than on a phone.
    await page.waitForFunction(() => { const bar = document.querySelector("[role=progressbar]"); return !bar || bar.getAttribute("aria-valuenow") === "100"; }, null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(400);
    await page.mouse.up();
    await page.waitForTimeout(VIDEO ? 2200 : 4500);
    await page.getByRole("button", { name: /read the note/i }).click({ force: true, timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(6000);
  },
  "cap-toss": async (page) => {
    await open(page);
    const toss = page.getByRole("button", { name: /^throw it$/i });
    await toss.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    await toss.click({ force: true });
    await page.waitForTimeout(4800);
    const ribbon = page.getByRole("button", { name: /pull the ribbon/i }).first();
    for (let i = 0; i < 5 && (await ribbon.count()); i++) { await ribbon.click({ force: true }); await page.waitForTimeout(800); }
    await page.waitForTimeout(4000);
    await scrollDown(page, ".overflow-y-auto", 3);
  },
  cauldron: async (page) => {
    const jars = page.getByRole("button", { name: /to the potion$/i });
    await jars.first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    for (let i = 0; i < 3; i++) { await jars.nth(i).click({ force: true }); await page.waitForTimeout(2100); }
    await page.getByRole("button", { name: /pop the cork/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1800);
    await page.getByRole("button", { name: /pop the cork/i }).click({ force: true });
    await page.waitForTimeout(4500);
    await scrollDown(page, ".overflow-y-auto", 3);
  },
  "fortune-cookie": async (page) => {
    await page.locator("[data-cookie='0']").waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    for (let i = 0; i < 4; i++) { await page.locator(`[data-cookie='${i}']`).click({ force: true }); await page.waitForTimeout(2600); await page.mouse.click(W / 2, 60); await page.waitForTimeout(900); }
    await page.waitForTimeout(2000);
  },
  "front-page": async (page) => {
    const read = page.getByRole("button", { name: /tap to read/i });
    await read.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    await read.click({ force: true });
    await page.waitForTimeout(2400);
    // The video reads it slower and stops short of the end screen.
    await scrollDown(page, ".overflow-y-auto", VIDEO ? 4 : 6, VIDEO ? 0.45 : 0.6, VIDEO ? 2300 : 1500);
  },
  garden: async (page) => {
    const gate = page.getByRole("button", { name: /push the gate/i }).first();
    await gate.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    await gate.click({ force: true });
    await page.waitForTimeout(3000);
    await scrollDown(page, '[data-template="garden"] .overflow-y-auto', 18, 0.55, 1300);
  },
  "haunted-house": async (page) => {
    const gate = page.getByRole("button", { name: /open the gate/i });
    await gate.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    await gate.click({ force: true });
    await page.getByRole("button", { name: /knock on the door/i }).waitFor({ timeout: 25000 });
    await page.waitForTimeout(1200);
    await page.locator('button[aria-label*="lost on purpose"]').first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.mouse.click(W / 2, 60);
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /knock on the door/i }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(5000);
    await scrollDown(page, ".overflow-y-auto", 3);
  },
  "jack-o-lantern": async (page) => {
    const carve = page.getByRole("button", { name: /tap to carve/i });
    await carve.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    await carve.click({ force: true });
    const light = page.getByRole("button", { name: /light the candle/i });
    await light.waitFor({ timeout: 25000 });
    await page.waitForTimeout(1000);
    await light.click({ force: true });
    await page.waitForTimeout(4500);
    await page.getByRole("button", { name: /read the note/i }).click({ force: true, timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(4000);
    await scrollDown(page, ".overflow-y-auto", 3);
  },
  kawaii: async (page) => {
    await open(page);
    const box = page.getByRole("button", { name: /tap the box/i });
    await box.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    await box.click({ force: true });
    await page.waitForTimeout(6000);
    await scrollDown(page, ".overflow-y-auto", 3);
  },
  "midnight-countdown": async (page) => {
    const start = page.getByRole("button", { name: /tap to start/i });
    await start.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    await start.click({ force: true });
    await page.waitForTimeout(2400);
    await page.getByRole("button", { name: /skip to midnight/i }).click({ force: true }).catch(() => {});
    await page.waitForTimeout(9000);
    await scrollDown(page, ".overflow-y-auto", 3);
  },
  "music-box": async (page) => {
    const key = page.locator("[data-key]");
    await key.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    const box = await key.boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2, r = box.width * 0.38;
    await page.mouse.move(cx + r, cy);
    await page.mouse.down();
    for (let i = 1; i <= 100; i++) { const a = (i / 30) * Math.PI * 2; await page.mouse.move(cx + r * Math.cos(a), cy + r * Math.sin(a)); await page.waitForTimeout(12); }
    await page.mouse.up();
    // The photos come up in the mirror while it plays; the letter lifts out when the spring runs down.
    await page.locator("[data-letter]").waitFor({ timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    await page.locator("[data-letter]").click({ force: true }).catch(() => {});
    await page.waitForTimeout(4000);
    await scrollDown(page, ".overflow-y-auto", 3);
  },
  "our-timeline": async (page) => {
    const begin = page.getByRole("button", { name: /scroll to begin/i });
    await begin.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    await begin.click({ force: true });
    await page.waitForTimeout(1500);
    await scrollDown(page, ".overflow-y-auto", 16, 0.5, 1700);
  },
  "paper-crane": async (page) => {
    await open(page);
    const fold = page.getByRole("button", { name: /tap to fold/i });
    await fold.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2000);
    for (let i = 0; i < 9 && (await fold.count()); i++) { await fold.click({ force: true }); await page.waitForTimeout(1500); }
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /let it go/i }).first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(7000);
  },
  "party-animals": async (page) => {
    const invite = page.getByRole("button", { name: /tap to open/i }).first();
    await invite.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    await invite.click({ force: true });
    const guests = page.locator("[data-guest]");
    await guests.first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(2800);
    await guests.first().click({ force: true });
    await page.waitForTimeout(1600);
    const scroller = page.locator("[data-scroller]");
    const to = (sel, frac) => scroller.evaluate((el, [glide, sel, frac]) => {
      const t = el.querySelector(sel);
      return (0, eval)(glide)(el, t ? t.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - el.clientHeight * frac : el.scrollTop + el.clientHeight * 0.7);
    }, [GLIDE, sel, frac]);
    await page.mouse.click(200, 560);
    await page.waitForTimeout(1000);
    await glideBy(scroller, 0.75);
    await page.waitForTimeout(1600);
    await to("[data-guestlist]", 0.2);
    await page.waitForTimeout(1600);
    await to("[data-cake]", 0.3);
    await page.waitForTimeout(1400);
    await page.locator("[data-cake]").click({ force: true });
    await page.waitForTimeout(2800);
    await to("[data-letter]", 0.08);
    await page.waitForTimeout(3000);
  },
  "photo-booth": async (page) => {
    const curtain = page.locator("[data-curtain]");
    await curtain.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    await curtain.click({ force: true });
    for (let i = 0; i < 4; i++) {
      await page.locator("[data-booth-button][aria-disabled=false]").waitFor({ timeout: 15000 });
      await page.locator("[data-booth-button]").click({ force: true });
      await page.waitForTimeout(300);
    }
    await page.locator("[data-strip][tabindex='0']").waitFor({ timeout: 20000 });
    await page.waitForTimeout(3200);
    await page.locator("[data-strip]").click({ force: true });
    const scroller = page.locator("[data-scroller]");
    await scroller.waitFor({ timeout: 15000 });
    await page.waitForTimeout(2600);
    for (let i = 0; i < 3; i++) { await glideBy(scroller, 0.6); await page.waitForTimeout(900); }
  },
  picnic: async (page) => {
    const scene = page.getByTestId("picnic-scene");
    await scene.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    const tap = () => scene.click({ force: true, position: { x: 30, y: 120 } });
    await tap();
    await page.waitForTimeout(1500);
    for (let i = 0; i < 9; i++) { await tap(); await page.waitForTimeout(1100); }
    await page.waitForTimeout(2400);
    await tap();
    await page.waitForTimeout(2400);
    await tap();
    await page.waitForTimeout(4000);
  },
  "recipe-box": async (page) => {
    await open(page);
    const pour = page.locator('[data-rb-action="pour"]').last();
    await pour.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    // Each pour takes a couple of seconds to land; a tap while one is falling is lost.
    for (let i = 0; i < 8 && (await pour.count()); i++) { await pour.click({ force: true }); await page.waitForTimeout(2600); }
    await page.waitForTimeout(1500);
    const stir = page.locator('[data-rb-action="stir"]').last();
    for (let i = 0; i < 8 && (await stir.count()); i++) { await stir.click({ force: true }); await page.waitForTimeout(900); }
    await page.waitForTimeout(4500);
    await scrollDown(page, ".overflow-y-auto", 3);
  },
  seance: async (page) => {
    const touch = page.getByRole("button", { name: /touch the planchette/i });
    await touch.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    await touch.click({ force: true });
    await page.waitForTimeout(16000);
    await scrollDown(page, ".overflow-y-auto", 3);
  },
  sketchbook: async (page) => {
    const book = page.getByRole("button", { name: /open the sketchbook/i });
    await book.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    await book.click({ force: true });
    await page.waitForTimeout(6800);
    for (let i = 0; i < 4; i++) { await page.locator("[data-turn=next]").click({ force: true }).catch(() => {}); await page.waitForTimeout(3600); }
  },
  "sticker-bomb": async (page) => {
    const surface = page.locator("[data-surface]");
    await surface.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    const box = await surface.boundingBox();
    const spots = [[0.27, 0.2], [0.72, 0.27], [0.5, 0.47], [0.27, 0.62], [0.74, 0.66], [0.5, 0.17], [0.3, 0.4], [0.7, 0.47], [0.5, 0.74], [0.28, 0.82], [0.73, 0.83], [0.5, 0.33]];
    for (const [fx, fy] of spots) { await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy); await page.waitForTimeout(650); }
    await page.waitForTimeout(2600);
    await page.getByRole("button", { name: /read the card/i }).click({ force: true, timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(5000);
    await scrollDown(page, ".overflow-y-auto", 2);
  },
  "text-thread": async (page) => {
    const chat = page.getByRole("button", { name: /tap to open the chat/i }).first();
    await chat.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    await chat.click({ force: true });
    await page.waitForTimeout(16000);
  },
  "the-council": async (page) => {
    await page.getByRole("button", { name: /all rise/i }).waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    await page.getByRole("button", { name: /all rise/i }).click({ force: true });
    await page.waitForTimeout(2600);
    for (let i = 0; i < 3; i++) { await page.getByRole("button", { name: /next finding/i }).click({ force: true }); await page.waitForTimeout(2000); }
    await page.getByRole("button", { name: /hear the verdict/i }).click({ force: true });
    await page.waitForTimeout(6000);
    await scrollDown(page, ".overflow-y-auto", 3);
  },
  "the-toast": async (page) => {
    await open(page);
    const pour = page.getByRole("button", { name: /hold to pour/i });
    await pour.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    const box = await pour.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    // Held until both glasses are full and the clink comes up.
    const clink = page.getByRole("button", { name: /clink the glasses/i }).first();
    await clink.waitFor({ timeout: 15000 }).catch(() => {});
    await page.mouse.up();
    await page.waitForTimeout(1600);
    await clink.click({ force: true }).catch(() => {});
    await page.waitForTimeout(7000);
    await scrollDown(page, ".overflow-y-auto", 3);
  },
  "trick-or-treat": async (page) => {
    await open(page);
    const bell = page.getByRole("button", { name: /ring the bell/i }).first();
    await bell.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    await bell.click({ force: true });
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: /^treat$/i }).click({ force: true });
    await page.waitForTimeout(7000);
    await scrollDown(page, ".overflow-y-auto", 3);
  },
  vinyl: async (page) => {
    const needle = page.getByRole("button", { name: /drop the needle/i }).first();
    await needle.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2200);
    await needle.click({ force: true });
    await page.waitForTimeout(4500);
    await scrollDown(page, ".overflow-y-auto", 5, 0.6, 1600);
  },
};

mkdirSync(OUT, { recursive: true });
// ETSY_GPU=1: draw WebGL on the graphics card (Bloom's 3D flower drops frames in software).
const browser = await chromium.launch(process.env.ETSY_GPU === "1" ? { args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"] } : {});
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
  if (WORDS[slug]) await context.route(/\/_next\/static\/.*\.js/, async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    for (const [from, to] of WORDS[slug]) body = body.split(from).join(to);
    await route.fulfill({ response, body });
  });
  await context.addInitScript((css) => {
    const add = () => { if (!document.head) return false; const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); return true; };
    if (add()) return;
    const w = new MutationObserver(() => add() && w.disconnect());
    w.observe(document, { childList: true, subtree: true });
  }, '[data-demo-chrome], a[href*="/templates/"], a[href="/?ref=watermark"], a[href*="ref=watermark"], nextjs-portal, [data-consent], [role="dialog"][aria-label*="ookie" i] { display: none !important; }');
  const page = await context.newPage();
  await page.goto(`${BASE}/demo/${slug}`, { waitUntil: "networkidle", timeout: 90000 });
  // Controls that aren't part of the gift (skip, mute) stay out of the pictures.
  await page.evaluate(() => {
    const hide = () => document.querySelectorAll("button").forEach((b) => { if (/^(skip|saltar)$/i.test((b.textContent || "").trim()) || /^(mute music|play music)/i.test(b.getAttribute("aria-label") || "") || /^enable motion$/i.test((b.textContent || "").trim())) b.style.visibility = "hidden"; });
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
