// For the Etsy listings: each gift's live demo on an iPhone, played through, with a screenshot every
// 1.2 s (3x pixels) and a 9:16 video. Interactions follow scripts/capture-thumbnails.mjs.
//   node scripts/etsy-shots.mjs . <out> [base=https://tryethos.io] [slugs…]
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [WT, OUT, BASE = "https://tryethos.io", ...only] = process.argv.slice(2);
const req = createRequire(join(WT, "package.json"));
const { chromium, devices } = req("@playwright/test");
const W = 405, H = 720;

async function scrollCollage(page, opener) {
  await page.getByRole("button", { name: opener }).first().click({ force: true, timeout: 20000 });
  const scroller = page.locator("[data-scroller]");
  await scroller.waitFor({ timeout: 15000 });
  await page.waitForTimeout(3600);
  for (let i = 0; i < 6; i++) { await scroller.evaluate((el) => el.scrollBy({ top: el.clientHeight * 0.62, behavior: "smooth" })); await page.waitForTimeout(1600); }
}
const swipeUp = async (page) => { await page.mouse.move(W / 2, H * 0.8); await page.mouse.down(); await page.mouse.move(W / 2, H * 0.45, { steps: 6 }); await page.mouse.up(); };

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
    if (await sc.count()) for (let i = 0; i < 3; i++) { await sc.evaluate((el) => el.scrollBy({ top: el.clientHeight * 0.6, behavior: "smooth" })).catch(() => {}); await page.waitForTimeout(1500); }
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
    for (let i = 0; i < 6; i++) { await sc.evaluate((el) => el.scrollBy({ top: el.clientHeight * 0.45, behavior: "smooth" })); await page.waitForTimeout(1400); }
  },
  museum: async (page) => {
    const enter = page.getByRole("button", { name: /^enter$/i }).first();
    await enter.waitFor({ timeout: 15000 });
    await page.waitForTimeout(2200);
    await enter.click({ force: true });
    await page.waitForTimeout(2000);
    for (let i = 0; i < 5; i++) { await page.getByRole("button", { name: /next room/i }).first().click({ force: true }).catch(() => {}); await page.waitForTimeout(1800); }
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
    recordVideo: { dir: join(dir, "video"), size: { width: 1080, height: 1920 } },
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
  const vids = readdirSync(join(dir, "video")).filter((f) => f.endsWith(".webm"));
  if (vids[0]) renameSync(join(dir, "video", vids[0]), join(dir, "demo.webm"));
  rmSync(join(dir, "video"), { recursive: true, force: true });
  console.log("captured", slug, n, "frames");
}
await browser.close();
