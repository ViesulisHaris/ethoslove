/**
 * Captures a poster frame (JPG) and a short muted preview (WebM) for every template.
 * Requires the dev server:  npm run dev   then   node scripts/capture-thumbnails.mjs
 */
import { chromium, devices } from "@playwright/test";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3000";
const W = 390;
const H = 600;

const SCRIPTS = {
  "our-timeline": async (page) => {
    await page.getByRole("button", { name: /scroll to begin/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1000);
    const poster = await page.screenshot();
    await page.getByRole("button", { name: /scroll to begin/i }).click();
    const sc = page.locator(".overflow-y-auto").first();
    for (let i = 0; i < 6; i++) { await sc.evaluate((el) => el.scrollBy({ top: el.clientHeight * 0.6, behavior: "smooth" })); await page.waitForTimeout(900); }
    return poster;
  },
  vinyl: async (page) => {
    await page.getByRole("button", { name: /drop the needle/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1000);
    const poster = await page.screenshot();
    await page.getByRole("button", { name: /drop the needle/i }).click();
    await page.waitForTimeout(3500);
    const sc = page.locator(".overflow-y-auto").first();
    await sc.evaluate((el) => el.scrollBy({ top: 520, behavior: "smooth" }));
    await page.waitForTimeout(2500);
    return poster;
  },
  museum: async (page) => {
    await page.getByRole("button", { name: /^enter$/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1000);
    await page.getByRole("button", { name: /^enter$/i }).click();
    await page.waitForTimeout(1600);
    const poster = await page.screenshot();
    for (let i = 0; i < 3; i++) { await page.getByRole("button", { name: /next room/i }).first().click().catch(() => {}); await page.waitForTimeout(1400); }
    return poster;
  },
  "birthday-cinema": async (page) => {
    await page.getByRole("button", { name: /tap to start/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1200);
    const poster = await page.screenshot();
    await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
    await page.waitForTimeout(2500);
    for (let i = 0; i < 7; i++) { await page.mouse.move(195, 520); await page.mouse.down(); await page.mouse.move(195, 320, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(450); }
    await page.waitForTimeout(3500);
    return poster;
  },
  "jar-of-reasons": async (page) => {
    await page.getByRole("button", { name: /pull another/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1200);
    const poster = await page.screenshot();
    for (let i = 0; i < 3; i++) { await page.getByRole("button", { name: /pull another/i }).click(); await page.waitForTimeout(1600); await page.mouse.click(195, 560); await page.waitForTimeout(700); }
    return poster;
  },
  "scratch-card": async (page) => {
    await page.getByRole("button", { name: /tap to begin/i }).waitFor({ timeout: 15000 });
    await page.getByRole("button", { name: /tap to begin/i }).click();
    await page.waitForTimeout(1000);
    const poster = await page.screenshot();
    const box = await page.locator("canvas[role=img]").first().boundingBox();
    if (box) for (let row = 0; row < 6; row++) { const y = box.y + 20 + (row / 5) * (box.height - 40); await page.mouse.move(box.x + 10, y); await page.mouse.down(); await page.mouse.move(box.x + box.width - 10, y, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(150); }
    await page.waitForTimeout(2500);
    return poster;
  },
  "midnight-countdown": async (page) => {
    await page.getByRole("button", { name: /tap to start/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1200);
    const poster = await page.screenshot();
    await page.getByRole("button", { name: /tap to start/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /skip to midnight/i }).click();
    await page.waitForTimeout(6000);
    return poster;
  },
  "front-page": async (page) => {
    await page.getByRole("button", { name: /tap to read/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1800);
    const poster = await page.screenshot();
    await page.getByRole("button", { name: /tap to read/i }).click();
    await page.waitForTimeout(1200);
    const sc = page.locator(".overflow-y-auto").first();
    for (let i = 0; i < 4; i++) { await sc.evaluate((el) => el.scrollBy({ top: 380, behavior: "smooth" })); await page.waitForTimeout(900); }
    return poster;
  },
  "fortune-cookie": async (page) => {
    await page.locator("[data-cookie='0']").waitFor({ timeout: 15000 });
    await page.waitForTimeout(1400);
    const poster = await page.screenshot();
    for (let i = 0; i < 3; i++) { await page.locator(`[data-cookie='${i}']`).click({ force: true }); await page.waitForTimeout(1800); await page.mouse.click(195, 60); await page.waitForTimeout(600); }
    return poster;
  },
  "text-thread": async (page) => {
    await page.getByRole("button", { name: /tap to open the chat/i }).waitFor({ timeout: 15000 });
    await page.getByRole("button", { name: /tap to open the chat/i }).click();
    await page.waitForTimeout(5200);
    const poster = await page.screenshot();
    await page.waitForTimeout(3500);
    return poster;
  },
  arcade: async (page) => {
    await page.getByRole("button", { name: /tap to start/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1400);
    const poster = await page.screenshot();
    await page.getByRole("button", { name: /tap to start/i }).click();
    const box = await page.locator("canvas").first().boundingBox();
    for (let i = 0; i < 26; i++) { const x = box.x + 10 + ((i * 41) % (box.width - 20)); await page.mouse.move(x, box.y + box.height - 20); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(260); }
    return poster;
  },
  passport: async (page) => {
    await page.getByRole("button", { name: /^open$/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1500);
    const poster = await page.screenshot();
    await page.getByRole("button", { name: /^open$/i }).click();
    await page.waitForTimeout(11000);
    return poster;
  },
  bloom: async (page) => {
    await page.locator("[data-hold]").waitFor({ timeout: 15000 });
    await page.waitForTimeout(1500);
    const hold = await page.locator("[data-hold]").boundingBox();
    await page.mouse.move(hold.x + hold.width / 2, hold.y + hold.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(2200);
    const poster = await page.screenshot();
    await page.waitForTimeout(2800);
    await page.mouse.up();
    await page.waitForTimeout(3500);
    return poster;
  },
  passport: async (page) => {
    await page.getByRole("button", { name: /^open$/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1400);
    await page.getByRole("button", { name: /^open$/i }).click();
    await page.waitForTimeout(2600);
    const poster = await page.screenshot();
    await page.waitForTimeout(6000);
    return poster;
  },
  bloom: async (page) => {
    await page.locator("[data-hold]").waitFor({ timeout: 15000 });
    await page.waitForTimeout(1400);
    const box = await page.locator("[data-hold]").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(2000);
    const poster = await page.screenshot();
    await page.waitForTimeout(2600);
    await page.mouse.up();
    await page.waitForTimeout(3000);
    return poster;
  },
  bouquet: async (page) => {
    await page.getByRole("button", { name: /open the card/i }).waitFor({ timeout: 20000 });
    await page.waitForTimeout(800);
    const poster = await page.screenshot();
    await page.getByRole("button", { name: /open the card/i }).click();
    await page.waitForTimeout(4000);
    return poster;
  },
  kawaii: async (page) => {
    // Its demo opens with the gingham cover; tap through it first.
    const cover = page.getByRole("button", { name: /tap to open/i });
    await cover.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1200);
    await cover.click({ force: true });
    await page.getByRole("button", { name: /tap the box/i }).waitFor({ timeout: 20000 });
    await page.waitForTimeout(1600);
    const poster = await page.screenshot();
    // The box pulses forever, which Playwright reads as "not stable"; force the tap.
    await page.getByRole("button", { name: /tap the box/i }).click({ force: true });
    await page.waitForTimeout(5500);
    return poster;
  },
  "the-letter": async (page) => {
    await page.getByRole("button", { name: /tap the seal/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1400);
    const poster = await page.screenshot();
    await page.getByRole("button", { name: /tap the seal/i }).click({ force: true });
    await page.waitForTimeout(6500);
    return poster;
  },
  constellations: async (page) => {
    await page.locator("[data-star]").first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(1500);
    const poster = await page.screenshot();
    for (let i = 0; i < 3; i++) {
      await page.locator(`[data-star="${i}"]`).click();
      await page.waitForTimeout(1500);
      await page.getByTestId("close-photo").click();
      await page.waitForTimeout(1000);
    }
    return poster;
  },
};

const onlySlugs = process.argv.slice(3);
const browser = await chromium.launch();
for (const [slug, run] of Object.entries(SCRIPTS)) {
  if (onlySlugs.length && !onlySlugs.includes(slug)) continue;
  const dir = join("public/templates", slug);
  mkdirSync(dir, { recursive: true });
  const videoDir = join(".tmp-video", slug);
  rmSync(videoDir, { recursive: true, force: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    viewport: { width: W, height: H },
    locale: "en-US",
    recordVideo: { dir: videoDir, size: { width: W, height: H } },
  });
  const page = await context.newPage();
  await page.goto(`${base}/demo/${slug}`, { waitUntil: "networkidle" });
  // Page chrome and the dev indicator do not belong in marketing assets.
  await page.addStyleTag({
    content: '[data-demo-chrome], a[href*="/templates/"], a[href="/?ref=watermark"], nextjs-portal { display: none !important; }',
  });
  const poster = await run(page);
  await sharp(poster).jpeg({ quality: 82, mozjpeg: true }).toFile(join(dir, "poster.jpg"));
  await context.close();
  const [video] = readdirSync(videoDir).filter((f) => f.endsWith(".webm"));
  renameSync(join(videoDir, video), join(dir, "preview.webm"));
  console.log("captured", slug);
}
rmSync(".tmp-video", { recursive: true, force: true });
await browser.close();
