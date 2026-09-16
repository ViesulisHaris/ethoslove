/** Headless walkthrough of the second template batch. */
import { chromium, devices } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2] ?? "./.verify";
const base = process.argv[3] ?? "http://localhost:3000";
const only = process.argv[4];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices["iPhone 13"], locale: "en-US" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text().slice(0, 300)}`));
const shot = (n) => page.screenshot({ path: join(out, `${n}.png`) });
const go = async (slug) => {
  await page.goto(`${base}/demo/${slug}`, { waitUntil: "networkidle" });
  await page.getByText(/someone made this for you/i).waitFor({ timeout: 15000 });
  await page.getByText(/someone made this for you/i).waitFor({ state: "hidden", timeout: 25000 });
  await page.waitForTimeout(800);
};

if (!only || only === "cinema") {
  await go("birthday-cinema");
  await shot("cinema-01-curtains");
  await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
  await page.waitForTimeout(2200);
  await shot("cinema-02-cake");
  // swipe up to blow, three times
  for (let i = 0; i < 8; i++) {
    if (await page.getByText(/happy birthday/i).isVisible().catch(() => false)) break;
    await page.mouse.move(190, 600);
    await page.mouse.down();
    await page.mouse.move(190, 380, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1200);
  await shot("cinema-03-out");
  await page.getByText(/dear ana/i).waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500);
  await shot("cinema-04-film");
}

if (!only || only === "jar") {
  await go("jar-of-reasons");
  await shot("jar-01-jar");
  await page.getByRole("button", { name: /tap the jar/i }).click({ force: true });
  await page.waitForTimeout(1200);
  await shot("jar-02-note");
  await page.mouse.click(195, 632);
  await page.waitForTimeout(700);
  for (let i = 0; i < 11; i++) {
    await page.getByRole("button", { name: /pull another/i }).click();
    await page.waitForTimeout(350);
    await page.mouse.click(195, 632);
    await page.waitForTimeout(350);
  }
  await shot("jar-03-empty");
  await page.getByRole("button", { name: /read the letter/i }).click();
  await page.waitForTimeout(1500);
  await shot("jar-04-letter");
}

if (!only || only === "scratch") {
  await go("scratch-card");
  await page.getByRole("button", { name: /tap to begin/i }).click();
  await page.waitForTimeout(800);
  await shot("scratch-01-card");
  const scratchAll = async () => {
    const canvas = page.locator("canvas[role=img]").first();
    const box = await canvas.boundingBox();
    if (!box) return;
    for (let row = 0; row < 8; row++) {
      const y = box.y + 20 + (row / 7) * (box.height - 40);
      await page.mouse.move(box.x + 10, y);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width - 10, y, { steps: 10 });
      await page.mouse.up();
    }
    await page.waitForTimeout(700);
  };
  await scratchAll();
  await shot("scratch-02-revealed");
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: /next card|the last one/i }).click();
    await page.waitForTimeout(700);
    await scratchAll();
  }
  await shot("scratch-03-final");
}

if (!only || only === "midnight") {
  await go("midnight-countdown");
  await shot("midnight-01-countdown");
  await page.getByRole("button", { name: /tap to start/i }).click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: /skip to midnight/i }).click();
  await page.waitForTimeout(2200);
  await shot("midnight-02-fireworks");
  await page.getByText(/dear ana/i).waitFor({ timeout: 15000 });
  await page.waitForTimeout(1800);
  await shot("midnight-03-gift");
}

if (!only || only === "timeline") {
  await go("our-timeline");
  await shot("timeline-01-cover");
  await page.getByRole("button", { name: /scroll to begin/i }).click();
  await page.waitForTimeout(1200);
  const sc = page.locator(".overflow-y-auto").first();
  for (let i = 0; i < 8; i++) {
    await sc.evaluate((el) => el.scrollBy({ top: el.clientHeight * 0.9, behavior: "instant" }));
    await page.waitForTimeout(500);
    if (i === 2) await shot("timeline-02-milestone");
  }
  await page.waitForTimeout(1500);
  await shot("timeline-03-ending");
}

if (!only || only === "vinyl") {
  await go("vinyl");
  await shot("vinyl-01-turntable");
  await page.getByRole("button", { name: /drop the needle/i }).click();
  await page.waitForTimeout(1800);
  await shot("vinyl-02-playing");
  const sc = page.locator(".overflow-y-auto").first();
  await sc.evaluate((el) => el.scrollBy({ top: 700, behavior: "instant" }));
  await page.waitForTimeout(1500);
  await shot("vinyl-03-crate");
}

if (!only || only === "museum") {
  await go("museum");
  await shot("museum-01-entrance");
  await page.getByRole("button", { name: /^enter$/i }).click();
  await page.waitForTimeout(1500);
  await shot("museum-02-room");
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: /next room/i }).first().click().catch(() => {});
    await page.waitForTimeout(700);
  }
  await page.waitForTimeout(1500);
  await shot("museum-03-walltext");
}

if (!only || only === "frontpage") {
  await go("front-page");
  await page.waitForTimeout(1600);
  await shot("frontpage-01-landed");
  await page.getByRole("button", { name: /tap to read/i }).click();
  await page.waitForTimeout(1500);
  await shot("frontpage-02-top");
  const sc = page.locator(".overflow-y-auto").first();
  await sc.evaluate((el) => el.scrollBy({ top: 900, behavior: "instant" }));
  await page.waitForTimeout(800);
  await shot("frontpage-03-columns");
  await sc.evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(1200);
  await shot("frontpage-04-back");
}

if (!only || only === "fortune") {
  await go("fortune-cookie");
  await shot("fortune-01-plate");
  await page.locator("[data-cookie='0']").click();
  await page.waitForTimeout(1200);
  await shot("fortune-02-slip");
  await page.mouse.click(195, 60);
  await page.waitForTimeout(600);
  for (let i = 1; i < 8; i++) {
    await page.locator(`[data-cookie='${i}']`).click({ force: true });
    await page.waitForTimeout(500);
    await page.mouse.click(195, 60);
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1500);
  await shot("fortune-03-finale");
}

if (!only || only === "thread") {
  await go("text-thread");
  await shot("thread-01-gate");
  await page.getByRole("button", { name: /tap to open the chat/i }).click();
  await page.waitForTimeout(4500);
  await shot("thread-02-typing");
  await page.getByText(/read this when you land|window seat|arrivals hall/i).first().waitFor({ timeout: 60000 });
  await page.waitForTimeout(2500);
  await shot("thread-03-letter");
}

if (!only || only === "arcade") {
  await go("arcade");
  await shot("arcade-01-title");
  await page.getByRole("button", { name: /tap to start/i }).click();
  await page.waitForTimeout(1500);
  await shot("arcade-02-playing");
  // cheat: drive the basket under the nearest good item via the exposed frame width
  const frame = page.locator("canvas").first();
  const box = await frame.boundingBox();
  for (let i = 0; i < 40; i++) {
    const x = box.x + 10 + ((i * 37) % (box.width - 20));
    await page.mouse.move(x, box.y + box.height - 20);
    await page.mouse.down();
    await page.mouse.move(x + 5, box.y + box.height - 20);
    await page.mouse.up();
    await page.waitForTimeout(250);
    if (await page.getByText(/level clear|you win|ouch/i).isVisible().catch(() => false)) break;
  }
  await page.waitForTimeout(600);
  await shot("arcade-03-overlay");
  const skip = page.getByRole("button", { name: /skip level/i });
  for (let i = 0; i < 16; i++) {
    if (await page.getByText(/you win/i).isVisible().catch(() => false)) break;
    if (await skip.isVisible().catch(() => false)) {
      await skip.click();
      await page.waitForTimeout(500);
    } else if (await page.getByRole("button", { name: /next level/i }).isVisible().catch(() => false)) {
      await page.getByRole("button", { name: /next level/i }).click();
      // stand still and lose on purpose; the fail screen has the skip button
      await page.getByText(/ouch|level clear|you win/i).first().waitFor({ timeout: 40000 });
      await page.waitForTimeout(400);
    } else await page.waitForTimeout(800);
  }
  await page.waitForTimeout(800);
  await shot("arcade-04-win");
  await page.getByRole("button", { name: /read message/i }).click();
  await page.waitForTimeout(2500);
  await shot("arcade-05-message");
}

if (!only || only === "passport") {
  await go("passport");
  await page.waitForTimeout(1200);
  await shot("passport-01-cover");
  await page.getByRole("button", { name: /^open$/i }).click();
  await page.waitForTimeout(2500);
  await shot("passport-02-flight");
  await page.getByText(/^arrived$/i).waitFor({ timeout: 30000 });
  await page.waitForTimeout(2600);
  await page.locator("[data-stamp='0']").waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await shot("passport-03-pages");
  const sc = page.locator(".overflow-y-auto").first();
  await sc.evaluate((el) => el.scrollBy({ top: 620, behavior: "instant" }));
  await page.waitForTimeout(1200);
  await shot("passport-04-stamps");
  await page.getByText(/arrived · lucas/i).waitFor({ timeout: 90000 });
  await sc.evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(1200);
  await shot("passport-05-visa");
}

if (!only || only === "bloom") {
  await go("bloom");
  await page.waitForTimeout(1500);
  await shot("bloom-01-closed");
  const hold = page.locator("[data-hold]");
  const box = await hold.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2000);
  await shot("bloom-02-opening");
  await page.waitForTimeout(3000);
  await page.mouse.up();
  await page.getByText(/it's open\./i).waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500);
  await shot("bloom-03-open");
  await page.getByRole("button", { name: /read the note/i }).click();
  await page.waitForTimeout(3000);
  await shot("bloom-04-note");
  await page.getByText(/— dani/i).waitFor({ timeout: 90000 });
  const sc2 = page.locator(".overflow-y-auto").first();
  await sc2.evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(1200);
  await shot("bloom-05-end");
}

if (!only || only === "passport") {
  await go("passport");
  await shot("passport-01-cover");
  await page.getByRole("button", { name: /^open$/i }).click();
  await page.waitForTimeout(2500);
  await shot("passport-02-flight");
  await page.getByText(/arrived/i).first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(600);
  await shot("passport-03-arrived");
  await page.getByText(/entries/i).first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(1200);
  await shot("passport-04-pages");
  const sc = page.locator(".overflow-y-auto").first();
  await sc.evaluate((el) => el.scrollBy({ top: 700, behavior: "instant" }));
  await page.waitForTimeout(1500);
  await shot("passport-05-stamps");
  await page.locator("[data-stamp='1']").click();
  await page.waitForTimeout(800);
  await shot("passport-06-lightbox");
  await page.mouse.click(195, 40);
  await sc.evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(1500);
  await shot("passport-07-visa");
}

if (!only || only === "bloom") {
  await go("bloom");
  await page.waitForTimeout(1200);
  await shot("bloom-01-closed");
  const hold = page.locator("[data-hold]");
  const box = await hold.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1800);
  await shot("bloom-02-opening");
  await page.waitForTimeout(2600);
  await page.mouse.up();
  await page.getByText(/it's open/i).waitFor({ timeout: 15000 });
  await page.waitForTimeout(1800);
  await shot("bloom-03-open");
  await page.getByRole("button", { name: /read the note/i }).click();
  await page.waitForTimeout(2500);
  await shot("bloom-04-note");
}

await browser.close();
console.log(errors.length ? `ERRORS:\n${errors.join("\n")}` : "no page errors");
