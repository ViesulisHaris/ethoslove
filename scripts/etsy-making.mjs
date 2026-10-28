// For the Etsy listings' second video, "made in a minute": a buyer's path on the live site, as a guest
// coming from Etsy. The /etsy/<slug> page, then the editor (their name and yours typed, the first line
// of the message typed, the photos added), the preview, and Publish with the Etsy order box, a number
// typed in it. The number is never sent.
//   node scripts/etsy-making.mjs <repo> <out> [slugs…]
// Writes <out>/<slug>/making.mp4 (1080x1920, at most 15 s) and stills for the listing photos:
// names.png, message.png, photos.png, preview.png, order.png (1215x2160). Run again with ETSY_LOADING=1
// for loading.png, the gift's first screen with their name, from its demo.
// The template's own fields (reasons, fortunes, the trip…) come from its demo, written into the
// editor's local draft before the page opens, so the preview at the end is a whole gift. Nothing
// reaches the server: a guest's draft and photos stay on the device until an order is claimed.
// The waits between the parts (page loads, scrolling to the next field) are cut out, and the stills
// are taken there too, never while a part is being recorded.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { linkSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { WORDS, swapWords } from "./etsy-words.mjs";

const [WT, OUT, ...only] = process.argv.slice(2);
const req = createRequire(join(WT, "package.json"));
const { chromium, devices } = req("@playwright/test");
const { createJiti } = req("jiti");
const jiti = createJiti(join(WT, "package.json"), { alias: { "@": join(WT, "src") } });
const W = 405, H = 720;
const BASE = "https://tryethos.io";
/** Not an Etsy order number yet (Etsy's are around 4.2 billion in October 2026), and never sent. */
const ORDER = "4613027584";
/** Free templates, whose Etsy listings sell the full version (etsyProduct() in src/lib/etsy). */
const FREE = new Set(["the-letter", "constellations"]);

const md = readFileSync(join(WT, "docs/marketing/ETSY.md"), "utf8");
const slugs = [...new Set([...md.matchAll(/SKU `ethos-([a-z0-9-]+)`/g)].map((m) => m[1]))].filter((s) => !only.length || only.includes(s));

/** The first sentence of the message, as the part typed on camera (the rest is filled in the cut after it). */
function firstLine(message) {
  const plain = message.replace(/\*\*/g, "").split("\n")[0];
  const m = plain.match(/^.{12,70}?[.!?:](\s|$)/);
  return (m ? m[0] : plain.slice(0, 48)).trimEnd();
}

/** Milliseconds between keystrokes: `most`, or quicker so the whole text takes at most `total` ms. */
const pace = (text, most, total) => Math.min(most, Math.round(total / Math.max(1, text.length)));

/**
 * Scrolls the page so `selector` (or the first button reading `text`) sits `offset` px below the top,
 * at once: it happens in a cut.
 */
const place = (page, selector, offset = 90, text = null) =>
  page.evaluate(([sel, off, txt]) => {
    const el = txt ? [...document.querySelectorAll(sel)].find((e) => e.textContent.includes(txt)) : document.querySelector(sel);
    if (el) window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - off);
  }, [selector, offset, text]);

/** The editor's own Edit / Preview / Publish buttons, in the bar at the top (music tracks have Preview buttons too). */
const topBar = (page, name) => page.locator("header button").filter({ hasText: new RegExp("^" + name + "$") }).filter({ visible: true }).first();

/** Swaps WORDS into the demo's own scripts, as etsy-shots.mjs does. */
async function routeWords(context, slug) {
  if (WORDS[slug]) await context.route(/\/_next\/static\/.*\.js/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: swapWords(slug, await response.text()) });
  });
}

/**
 * ETSY_LOADING=1: only <out>/<slug>/loading.png, the first screen of the gift with their name on it:
 * "Someone made this for you" and the name, or the gift's own first screen ("For Ana") where that
 * screen has no name. The name fades in over two seconds and the screen fades out right after, so the
 * picture holds the screen at the end of the fade-in (an !important rule keeps the name and the screen
 * opaque while it is taken); a "For Ana" that types itself in gets time to finish.
 */
async function loadingStill(browser, slug, dir, name) {
  mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: W, height: H }, deviceScaleFactor: 3, locale: "en-US" });
  await context.route(/clarity\.ms|facebook|tiktok|_vercel\//, (r) => r.abort());
  await routeWords(context, slug);
  await context.addInitScript((css) => {
    const add = () => { if (!document.head) return false; const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); return true; };
    if (!add()) new MutationObserver((m, o) => add() && o.disconnect()).observe(document, { childList: true, subtree: true });
  }, '[data-demo-chrome], a[href*="/templates/"], a[href*="ref=watermark"], [data-consent], [role="dialog"][aria-label*="ookie" i] { display: none !important; }');
  const page = await context.newPage();
  await page.goto(`${BASE}/demo/${slug}`, { waitUntil: "commit", timeout: 90000 });
  const look = () => page.evaluate((name) => {
    const screen = [...document.querySelectorAll("body *")].find((e) => e.children.length === 0 && /made this for you/i.test(e.textContent))?.closest(".inset-0");
    const named = screen && [...screen.querySelectorAll("*")].find((e) => e.textContent.trim() === name);
    if (named) {
      for (let x = named; x && x !== screen.parentElement; x = x.parentElement) x.setAttribute("data-etsy-hold", "");
      const s = document.createElement("style");
      s.textContent = "[data-etsy-hold] { opacity: 1 !important; filter: none !important; }";
      document.head.appendChild(s);
      return "loading";
    }
    const own = !screen && [...document.querySelectorAll("body *")].find((e) => e.textContent.trim().toLowerCase() === `for ${name}`.toLowerCase());
    return own ? "first screen" : null;
  }, name).catch(() => null);
  let seen = null;
  for (let i = 0; i < 80 && !seen; i++) {
    await page.waitForTimeout(100);
    seen = await look();
  }
  await page.waitForTimeout(seen === "first screen" ? 1500 : 250);
  await page.screenshot({ path: join(dir, "loading.png") });
  await context.close();
  return seen;
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
for (const slug of slugs) {
  // The demo, with WORDS swapped in where its listing sells it for another day.
  const demo = JSON.parse(swapWords(slug, JSON.stringify((await jiti.import(join(WT, "src/templates", slug, "demo-data.ts"))).demoData.en)));
  if (process.env.ETSY_LOADING === "1") {
    console.log(slug, (await loadingStill(browser, slug, join(OUT, slug), demo.recipientName)) ?? "NAME NOT SEEN");
    continue;
  }
  const dir = join(OUT, slug);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "cast"), { recursive: true });
  const draft = {
    version: 1,
    slug,
    data: { ...demo, recipientName: "", senderName: "", message: "", photos: [] },
    giftId: null,
    shortId: null,
    status: "draft",
    schedule: { enabled: false, timezone: "America/New_York" },
    password: "",
    // The two free templates are sold on Etsy as their full version: the Etsy box comes up once an extra
    // is on, here no "Made with Ethos" footer (a plain free gift asks for a sign-in instead).
    removeWatermark: FREE.has(slug),
    updatedAt: Date.now(),
  };
  const context = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: W, height: H }, deviceScaleFactor: 3, locale: "en-US" });
  await context.route(/clarity\.ms|facebook|tiktok|_vercel\//, (r) => r.abort());
  await routeWords(context, slug);
  await context.addInitScript(([key, value]) => {
    if (!sessionStorage.getItem("etsy-making-seeded")) {
      localStorage.setItem(key, value);
      sessionStorage.setItem("etsy-making-seeded", "1");
    }
  }, [`ethos:draft:${slug}`, JSON.stringify(draft)]);
  const page = await context.newPage();
  await page.goto(`${BASE}/etsy/${slug}`, { waitUntil: "networkidle", timeout: 90000 });
  // The cookie banner, answered the private way, so it stays out of the video.
  await page.getByRole("button", { name: "No thanks" }).click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(800);

  const cdp = await context.newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", ({ data, metadata, sessionId }) => {
    const file = join(dir, "cast", `${String(frames.length).padStart(5, "0")}.jpg`).replace(/\\/g, "/");
    writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, t: metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
  });
  const parts = [];
  const now = () => page.evaluate(() => Date.now() / 1000);
  /** Records `run` as one part of the video, after the screen has settled for `settle` ms. */
  const part = async (name, run, settle = 350) => {
    await page.waitForTimeout(settle);
    const from = await now();
    await run();
    parts.push({ name, from, to: await now() });
  };
  const still = (name) => page.screenshot({ path: join(dir, `${name}.png`) });

  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W * 3, maxHeight: H * 3, everyNthFrame: 1 });
  try {
    await part("etsy page", async () => {
      await page.waitForTimeout(1100);
      await page.getByRole("link", { name: /^Make my/ }).click();
      await page.waitForTimeout(250);
    });
    await page.locator('#recipientName').waitFor({ timeout: 30000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.evaluate(() => window.scrollTo(0, 0));
    await part("names", async () => {
      await page.locator('#recipientName').click();
      await page.keyboard.type(demo.recipientName, { delay: pace(demo.recipientName, 110, 700) });
      await page.waitForTimeout(150);
      await page.locator('#senderName').click();
      await page.keyboard.type(demo.senderName, { delay: pace(demo.senderName, 90, 700) });
      await page.waitForTimeout(350);
    }, 900);
    await page.locator('#senderName').blur();
    await still("names");
    await place(page, 'textarea#message', 210);
    await part("message", async () => {
      await page.locator('textarea#message').click();
      // Some editors answer each keystroke slowly (Pack Your Bags draws its trip): typing stops at the
      // first space after 1.7 s, and the cut after this part fills in the rest.
      const line = firstLine(demo.message);
      const started = Date.now();
      for (const ch of line) {
        if (ch === " " && Date.now() - started > 1700) break;
        await page.keyboard.type(ch);
        await page.waitForTimeout(pace(line, 38, 2000));
      }
      await page.waitForTimeout(350);
    });
    await page.locator('textarea#message').fill(demo.message.replace(/\*\*/g, ""));
    await page.locator('textarea#message').blur();
    await page.waitForTimeout(400);
    await still("message");
    const photosInput = page.locator('input[type="file"][accept*="image"]').first();
    await place(page, "button", 200, "choose from your device");
    const files = demo.photos.slice(0, 6).map((p) => join(WT, "public", p.url));
    await part("photos", async () => {
      await page.waitForTimeout(250);
      await photosInput.setInputFiles(files);
      await page.waitForTimeout(1700);
    });
    await still("photos");
    await page.evaluate(() => window.scrollTo(0, 0));
    await part("preview", async () => {
      await topBar(page, "Preview").click();
      await page.waitForTimeout(3000);
    });
    await still("preview");
    await part("publish", async () => {
      await topBar(page, "Publish").click();
      const order = page.locator('input[inputmode="numeric"][placeholder="3456789012"]');
      await order.waitFor({ timeout: 15000 });
      await page.waitForTimeout(500);
      await order.click();
      await page.keyboard.type(ORDER, { delay: 75 });
      await page.waitForTimeout(1200);
    });
    await still("order");
  } catch (e) {
    console.log("FAILED", slug, e.message.split("\n")[0]);
  }
  await cdp.send("Page.stopScreencast").catch(() => {});
  await context.close();
  if (parts.length < 6) continue;

  // The parts, end to end, on an exact 60 fps clock (each tick shows the newest frame), then every
  // other tick: an even 30 fps, as etsy-shots.mjs does. At most 15 s, Etsy's limit: over it (long
  // names, a slow page), the preview gives up time first, down to 2 s.
  const total = parts.reduce((t, p) => t + p.to - p.from, 0);
  const preview = parts.find((p) => p.name === "preview");
  if (total > 14.9) preview.to -= Math.min(total - 14.9, preview.to - preview.from - 2);
  const seq = join(dir, "seq");
  mkdirSync(seq, { recursive: true });
  let k = 0;
  for (const { from, to } of parts) {
    let i = 0;
    for (let t = from; t <= to && k < 15 * 60; t += 1 / 60, k++) {
      while (i + 1 < frames.length && frames[i + 1].t <= t) i++;
      linkSync(frames[i].file, join(seq, `${String(k).padStart(5, "0")}.jpg`));
    }
  }
  const encode = (crf) => execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", "60", "-i", join(seq, "%05d.jpg"), "-vf", "fps=30,scale=1080:1920:flags=lanczos", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", String(crf), "-preset", "slow", "-movflags", "+faststart", join(dir, "making.mp4")]);
  encode(20);
  if (statSync(join(dir, "making.mp4")).size > 9.5e6) encode(25);
  writeFileSync(join(dir, "parts.json"), JSON.stringify(parts.map((p) => ({ name: p.name, s: +(p.to - p.from).toFixed(2) }))));
  console.log(slug, parts.map((p) => `${p.name} ${(p.to - p.from).toFixed(1)}s`).join(", "), `= ${(k / 60).toFixed(1)}s`);
}
await browser.close();
