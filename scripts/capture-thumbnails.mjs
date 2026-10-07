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

/** Every gift now opens on a cover; the capture taps it and waits for the gift underneath. */
/** Opens a collage, takes the first screen as the poster, then scrolls it for the recording. */
async function scrollCollage(page, opener) {
  await page.getByRole("button", { name: opener }).click({ force: true, timeout: 20000 });
  const scroller = page.locator("[data-scroller]");
  await scroller.waitFor({ timeout: 15000 });
  await page.waitForTimeout(3600);
  const poster = await page.screenshot();
  for (let i = 0; i < 5; i++) { await scroller.evaluate((el) => el.scrollBy({ top: el.clientHeight * 0.62, behavior: "smooth" })); await page.waitForTimeout(1500); }
  return poster;
}

async function open(page) {
  const cover = page.getByRole("button", { name: /tap to open/i });
  if (await cover.count()) {
    await cover.first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1400);
    await cover.first().click({ force: true });
    await page.waitForTimeout(2200);
  }
}

const SCRIPTS = {
  "our-timeline": async (page) => {
    await page.getByRole("button", { name: /scroll to begin/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1000);
    const poster = await page.screenshot();
    await page.getByRole("button", { name: /scroll to begin/i }).click({ force: true });
    const sc = page.locator(".overflow-y-auto").first();
    for (let i = 0; i < 6; i++) { await sc.evaluate((el) => el.scrollBy({ top: el.clientHeight * 0.6, behavior: "smooth" })); await page.waitForTimeout(900); }
    return poster;
  },
  vinyl: async (page) => {
    await page.getByRole("button", { name: /drop the needle/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1000);
    const poster = await page.screenshot();
    await page.getByRole("button", { name: /drop the needle/i }).click({ force: true });
    await page.waitForTimeout(3500);
    const sc = page.locator(".overflow-y-auto").first();
    await sc.evaluate((el) => el.scrollBy({ top: 520, behavior: "smooth" }));
    await page.waitForTimeout(2500);
    return poster;
  },
  museum: async (page) => {
    const enter = page.getByRole("button", { name: /^enter$/i }).first();
    await enter.waitFor({ timeout: 15000 });
    await page.waitForTimeout(1800);
    const poster = await page.screenshot();
    await enter.click({ force: true });
    await page.waitForTimeout(1600);
    for (let i = 0; i < 3; i++) { await page.getByRole("button", { name: /next room/i }).first().click({ force: true }).catch(() => {}); await page.waitForTimeout(1400); }
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
    const jar = page.getByRole("button", { name: /tap the jar/i });
    await jar.waitFor({ timeout: 15000 });
    await page.waitForTimeout(1600);
    const poster = await page.screenshot();
    await jar.click({ force: true });
    await page.waitForTimeout(1600);
    await page.mouse.click(195, 560);
    await page.waitForTimeout(700);
    for (let i = 0; i < 3; i++) { await page.getByRole("button", { name: /pull another/i }).click({ force: true }); await page.waitForTimeout(1500); await page.mouse.click(195, 560); await page.waitForTimeout(650); }
    return poster;
  },
  "scratch-card": async (page) => {
    await page.getByRole("button", { name: /scratch here/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1600);
    const ticket = await page.screenshot();
    await page.getByRole("button", { name: /scratch here/i }).first().click({ force: true });
    await page.waitForTimeout(1000);
    const poster = ticket;
    const box = await page.locator("canvas[role=img]").first().boundingBox();
    if (box) for (let row = 0; row < 6; row++) { const y = box.y + 20 + (row / 5) * (box.height - 40); await page.mouse.move(box.x + 10, y); await page.mouse.down(); await page.mouse.move(box.x + box.width - 10, y, { steps: 12 }); await page.mouse.up(); await page.waitForTimeout(150); }
    await page.waitForTimeout(2500);
    return poster;
  },
  "midnight-countdown": async (page) => {
    await page.getByRole("button", { name: /tap to start/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1200);
    const poster = await page.screenshot();
    await page.getByRole("button", { name: /tap to start/i }).click({ force: true });
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /skip to midnight/i }).click({ force: true });
    await page.waitForTimeout(6000);
    return poster;
  },
  "front-page": async (page) => {
    await page.getByRole("button", { name: /tap to read/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1800);
    const poster = await page.screenshot();
    await page.getByRole("button", { name: /tap to read/i }).click({ force: true });
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
    const open = page.getByRole("button", { name: /tap to open the chat/i }).first();
    await open.waitFor({ timeout: 15000 });
    await page.waitForTimeout(1800);
    const poster = await page.screenshot();
    await open.click({ force: true });
    await page.waitForTimeout(6500);
    return poster;
  },
  arcade: async (page) => {
    await page.getByRole("button", { name: /press start/i }).waitFor({ timeout: 15000 });
    await page.waitForTimeout(1600);
    const poster = await page.screenshot();
    await page.getByRole("button", { name: /press start/i }).click({ force: true });
    const box = await page.locator("canvas").first().boundingBox();
    for (let i = 0; i < 26; i++) { const x = box.x + 10 + ((i * 41) % (box.width - 20)); await page.mouse.move(x, box.y + box.height - 20); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(260); }
    return poster;
  },
  passport: async (page) => {
    const open = page.getByRole("button", { name: /^open$/i }).first();
    await open.waitFor({ timeout: 15000 });
    await page.waitForTimeout(1800);
    const poster = await page.screenshot();
    await open.click({ force: true });
    await page.waitForTimeout(8000);
    return poster;
  },
  bloom: async (page) => {
    await page.locator("[data-hold]").waitFor({ timeout: 15000 });
    await page.waitForTimeout(1800);
    const poster = await page.screenshot();
    const box = await page.locator("[data-hold]").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(4600);
    await page.mouse.up();
    await page.waitForTimeout(3000);
    return poster;
  },
  bouquet: async (page) => {
    // The cover object and the pill carry the same words, so take the first match.
    const card = page.getByRole("button", { name: /open the card/i }).first();
    await card.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2600);
    const poster = await page.screenshot();
    await card.click({ force: true });
    await page.waitForTimeout(4000);
    return poster;
  },
  garden: async (page) => {
    // The gate is its own cover: shoot it closed, then push it and walk the page down.
    const gate = page.getByRole("button", { name: /push the gate/i }).first();
    await gate.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2400);
    const poster = await page.screenshot();
    await gate.click({ force: true });
    await page.waitForTimeout(2600);
    const sc = page.locator('[data-template="garden"] .overflow-y-auto').first();
    for (let i = 0; i < 9; i++) {
      await sc.evaluate((el) => el.scrollBy({ top: el.clientHeight * 0.5, behavior: "smooth" }));
      await page.waitForTimeout(820);
    }
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
  fireside: async (page) => {
    // Its demo opens with the harvest cover; tap through it first.
    const cover = page.getByRole("button", { name: /tap to open/i });
    await cover.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1200);
    await cover.click({ force: true });
    await page.getByRole("button", { name: /light the candle/i }).waitFor({ timeout: 20000 });
    await page.waitForTimeout(1800);
    const poster = await page.screenshot();
    await page.getByRole("button", { name: /light the candle/i }).click({ force: true });
    await page.waitForTimeout(6000);
    return poster;
  },
  "trick-or-treat": async (page) => {
    const cover = page.getByRole("button", { name: /tap to open/i });
    await cover.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1200);
    await cover.click({ force: true });
    const bell = page.getByRole("button", { name: /ring the bell/i }).first();
    await bell.waitFor({ timeout: 20000 });
    await page.waitForTimeout(2000);
    const poster = await page.screenshot();
    await bell.click({ force: true });
    await page.waitForTimeout(1800);
    await page.getByRole("button", { name: /^treat$/i }).click({ force: true });
    await page.waitForTimeout(6000);
    return poster;
  },
  halfway: async (page) => {
    // Tapping the plane flies it home; the poster is the postcard before take-off.
    const plane = page.getByRole("button", { name: /fly to/i });
    await plane.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1800);
    const poster = await page.screenshot();
    await plane.click({ force: true });
    await page.waitForTimeout(8000);
    return poster;
  },
  "pack-your-bags": async (page) => {
    // Pack every tag, open the board, and shoot it the moment the destination has landed; then
    // the recording carries on to the boarding pass and tears the stub off.
    const clues = page.getByTestId("pyb-clue");
    await clues.first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(1400);
    const count = await clues.count();
    for (let i = 0; i < count; i++) { await clues.nth(i).click({ force: true }); await page.waitForTimeout(700); }
    await page.getByTestId("pyb-where").click({ force: true, timeout: 12000 });
    await page.locator('[data-testid="pyb-board"][data-resolved="true"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(1100);
    const poster = await page.screenshot();
    await page.getByTestId("pyb-to-ticket").click({ force: true, timeout: 8000 });
    await page.waitForTimeout(2600);
    await page.getByTestId("pyb-stub").click({ force: true });
    await page.waitForTimeout(3500);
    return poster;
  },
  scrapbook: async (page) => {
    const book = page.getByRole("button", { name: /open the scrapbook/i });
    await book.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1800);
    const poster = await page.screenshot();
    await book.click({ force: true });
    await page.waitForTimeout(2500);
    const sc = page.locator('[data-template="scrapbook"] .overflow-y-auto').last();
    for (let i = 0; i < 4; i++) { await sc.evaluate((el) => el.scrollBy({ top: el.clientHeight * 0.45, behavior: "smooth" })); await page.waitForTimeout(1100); }
    return poster;
  },
  "snow-globe": async (page) => {
    await open(page);
    const globe = page.getByRole("button", { name: /shake the globe/i });
    await globe.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1600);
    // The globe lit on its shelf under the garland, before anyone has touched it.
    const poster = await page.screenshot();
    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: /^shake it$/i }).click({ force: true });
      await page.waitForTimeout(3800);
    }
    await page.getByRole("button", { name: /turn it over/i }).click({ force: true });
    await page.waitForTimeout(5000);
    return poster;
  },
  "recipe-box": async (page) => {
    await open(page);
    const pour = page.locator('[data-rb-action="pour"]').last();
    await pour.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1500);
    const poster = await page.screenshot();
    for (let i = 0; i < 4; i++) { await pour.click({ force: true }); await page.waitForTimeout(900); }
    await page.waitForTimeout(1200);
    const stir = page.locator('[data-rb-action="stir"]').last();
    for (let i = 0; i < 5 && (await stir.count()); i++) { await stir.click({ force: true }); await page.waitForTimeout(800); }
    await page.waitForTimeout(3500);
    return poster;
  },
  "cap-toss": async (page) => {
    await open(page);
    const toss = page.getByRole("button", { name: /^throw it$/i });
    await toss.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1600);
    // The cap on the gown, under the bunting, with the year printed behind it.
    const poster = await page.screenshot();
    await toss.click({ force: true });
    await page.waitForTimeout(4200);
    const ribbon = page.getByRole("button", { name: /pull the ribbon/i }).first();
    for (let i = 0; i < 5 && (await ribbon.count()); i++) { await ribbon.click({ force: true }); await page.waitForTimeout(700); }
    await page.waitForTimeout(3500);
    return poster;
  },
  "paper-crane": async (page) => {
    await open(page);
    const fold = page.getByRole("button", { name: /tap to fold/i });
    await fold.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1200);
    // Two creases in, so the card shows a shape being made rather than a blank square.
    for (let i = 0; i < 2; i++) { await fold.click({ force: true }); await page.waitForTimeout(1400); }
    const poster = await page.screenshot();
    for (let i = 0; i < 5 && (await fold.count()); i++) { await fold.click({ force: true }); await page.waitForTimeout(1300); }
    await page.waitForTimeout(1200);
    const go = page.getByRole("button", { name: /let it go/i }).first();
    if (await go.count()) await go.click({ force: true });
    await page.waitForTimeout(5000);
    return poster;
  },
  "the-toast": async (page) => {
    await open(page);
    const pour = page.getByRole("button", { name: /hold to pour/i });
    await pour.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1600);
    // Two empty glasses either side of the card, the candle lit, the bottle waiting above.
    const poster = await page.screenshot();
    // Pouring is a press and hold, so the capture holds it the way a thumb would.
    const box = await pour.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(2400);
    await page.mouse.up();
    await page.waitForTimeout(1800);
    const clink = page.getByRole("button", { name: /^clink$/i }).first();
    if (await clink.count()) await clink.click({ force: true });
    await page.waitForTimeout(4500);
    return poster;
  },
  balloons: async (page) => {
    await open(page);
    const balloon = page.locator("[data-balloon]:not([data-letter])");
    await balloon.first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(2600);
    const poster = await page.screenshot();
    const count = await balloon.count();
    for (let i = 0; i < count; i++) { await page.locator("[data-balloon]:not([data-letter])").first().click({ force: true }); await page.waitForTimeout(650); }
    await page.locator("[data-letter]").first().click({ force: true });
    await page.waitForTimeout(3200);
    const sc = page.locator('[data-template="balloons"] .overflow-y-auto').last();
    for (let i = 0; i < 3; i++) { await sc.evaluate((el) => el.scrollBy({ top: el.clientHeight * 0.5, behavior: "smooth" })); await page.waitForTimeout(1000); }
    return poster;
  },
  "popup-card": async (page) => {
    const card = page.getByRole("button", { name: /open the card/i });
    await card.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1600);
    await card.click({ force: true });
    await page.waitForTimeout(2600);
    const candles = page.locator("[data-candle]");
    const n = await candles.count();
    for (let i = 0; i < n; i++) { await candles.nth(i).click({ force: true }); await page.waitForTimeout(380); }
    await page.waitForTimeout(900);
    // The poster is the lit cake standing out of the card, not the shut front.
    const poster = await page.screenshot();
    await page.mouse.move(195, 520); await page.mouse.down(); await page.mouse.move(195, 300, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(3200);
    return poster;
  },
  // The three scrolling collages open with their own gesture, then the recording is the scroll itself.
  coquette: async (page) => scrollCollage(page, /untie the bow/i),
  xoxo: async (page) => scrollCollage(page, /open it/i),
  "spooky-season": async (page) => scrollCollage(page, /blow the leaves/i),
  "dark-romance": async (page) => scrollCollage(page, /turn the key/i),
  keepsake: async (page) => scrollCollage(page, /break the seal/i),
  "photo-booth": async (page) => {
    const curtain = page.locator("[data-curtain]");
    await curtain.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1900);
    // The booth under its lit sign, the curtain drawn and the card with their name pinned to it.
    const poster = await page.screenshot();
    await curtain.click({ force: true });
    // Four poses, each pressed the moment the button lights again, so the recording is the countdowns and flashes.
    for (let i = 0; i < 4; i++) {
      await page.locator("[data-booth-button][aria-disabled=false]").waitFor({ timeout: 15000 });
      await page.locator("[data-booth-button]").click({ force: true });
      await page.waitForTimeout(300);
    }
    // Long enough to watch it come out grey and come up in colour.
    await page.locator("[data-strip][tabindex='0']").waitFor({ timeout: 20000 });
    await page.waitForTimeout(2800);
    await page.locator("[data-strip]").click({ force: true });
    const scroller = page.locator("[data-scroller]");
    await scroller.waitFor({ timeout: 15000 });
    await page.waitForTimeout(2300);
    await scroller.evaluate((el) => el.scrollBy({ top: el.clientHeight * 0.6, behavior: "smooth" }));
    await page.waitForTimeout(1400);
    return poster;
  },
  picnic: async (page) => {
    const scene = page.getByTestId("picnic-scene");
    await scene.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1600);
    const tap = () => scene.click({ force: true, position: { x: 30, y: 120 } });
    // The lid, then everything in the basket but the date and the note, one tap at a time.
    await tap();
    await page.waitForTimeout(1300);
    for (let i = 0; i < 9; i++) { await tap(); await page.waitForTimeout(950); }
    await page.waitForTimeout(2400);
    // The poster is the picnic laid out: every tag, the photos, the basket open.
    const poster = await page.screenshot();
    // Then the parcel comes out and the date inside it is unwrapped.
    await tap();
    await page.waitForTimeout(2200);
    await tap();
    await page.waitForTimeout(2800);
    return poster;
  },
  "party-animals": async (page) => {
    // The invitation takes a moment to arrive, so wait for it rather than checking once like open().
    const invite = page.getByRole("button", { name: /tap to open/i }).first();
    await invite.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1400);
    await invite.click({ force: true });
    await page.waitForTimeout(2200);
    const guests = page.locator("[data-guest]");
    await guests.first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(2600);
    // The poster is the top of the invitation, one guest mid-shout.
    await guests.first().click({ force: true });
    await page.waitForTimeout(800);
    const poster = await page.screenshot();
    // The preview walks down the page as a guest would: a confetti tap, the booth strip and the song,
    // the guest list, the candles blown out, and the letter.
    const scroller = page.locator("[data-scroller]");
    const glide = (selector, at) =>
      scroller.evaluate((el, [sel, frac]) => {
        const target = el.querySelector(sel);
        const top = target ? target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - el.clientHeight * frac : el.scrollTop + el.clientHeight * 0.7;
        el.scrollTo({ top, behavior: "smooth" });
      }, [selector, at]);
    await page.mouse.click(200, 560);
    await page.waitForTimeout(800);
    await scroller.evaluate((el) => el.scrollBy({ top: el.clientHeight * 0.75, behavior: "smooth" }));
    await page.waitForTimeout(1500);
    await glide("[data-guestlist]", 0.2);
    await page.waitForTimeout(1500);
    await glide("[data-cake]", 0.3);
    await page.waitForTimeout(1300);
    await page.locator("[data-cake]").click({ force: true });
    await page.waitForTimeout(2600);
    await glide("[data-letter]", 0.08);
    await page.waitForTimeout(2200);
    return poster;
  },
  "the-council": async (page) => {
    await page.getByRole("button", { name: /all rise/i }).click({ force: true, timeout: 20000 });
    await page.waitForTimeout(1900);
    // The poster is the hearing: five cats behind the bench and the chair reading the first finding.
    const poster = await page.screenshot();
    for (let i = 0; i < 3; i++) { await page.getByRole("button", { name: /next finding/i }).click({ force: true }); await page.waitForTimeout(1300); }
    await page.getByRole("button", { name: /hear the verdict/i }).click({ force: true });
    await page.waitForTimeout(4200);
    return poster;
  },
  "sticker-bomb": async (page) => {
    const surface = page.locator("[data-surface]");
    await surface.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1200);
    const box = await surface.boundingBox();
    const spots = [[0.27, 0.2], [0.72, 0.27], [0.5, 0.47], [0.27, 0.62], [0.74, 0.66], [0.5, 0.17], [0.3, 0.4], [0.7, 0.47], [0.5, 0.74], [0.28, 0.82], [0.73, 0.83], [0.5, 0.33]];
    let poster = null;
    for (const [i, [fx, fy]] of spots.entries()) {
      await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
      await page.waitForTimeout(520);
      if (i === 8) poster = await page.screenshot();
    }
    await page.waitForTimeout(2200);
    return poster;
  },
  sketchbook: async (page) => {
    const book = page.getByRole("button", { name: /open the sketchbook/i });
    await book.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1600);
    await book.click({ force: true });
    await page.waitForTimeout(6800);
    const poster = await page.screenshot();
    for (let i = 0; i < 3; i++) { await page.locator("[data-turn=next]").click({ force: true }).catch(() => {}); await page.waitForTimeout(2600); }
    return poster;
  },
  digicam: async (page) => {
    // The poster is the camera switched on, the first photo on its screen with the date in the
    // corner; then the recording takes two pictures, skips to the last and prints the roll.
    const power = page.getByRole("button", { name: /turn the camera on/i });
    await power.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1600);
    await power.click({ force: true });
    await page.waitForFunction(() => [...document.querySelectorAll("button[aria-label^='Photo 1 of']")].some((b) => !b.disabled), null, { timeout: 20000 });
    await page.waitForTimeout(700);
    const poster = await page.screenshot();
    const shutter = page.getByRole("button", { name: /take a picture/i });
    for (let i = 0; i < 2; i++) { await shutter.click({ force: true }); await page.waitForTimeout(1300); }
    for (let i = 0; i < 4; i++) { await page.getByRole("button", { name: /next photo/i }).click({ force: true }); await page.waitForTimeout(350); }
    await page.waitForTimeout(500);
    await shutter.click({ force: true });
    await page.waitForTimeout(4200);
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
  "music-box": async (page) => {
    const key = page.locator("[data-key]");
    await key.waitFor({ timeout: 20000 });
    await page.waitForTimeout(1400);
    // Wound the way a thumb does it: round and round the key, three times.
    const box = await key.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    const r = box.width * 0.38;
    await page.mouse.move(cx + r, cy);
    await page.mouse.down();
    for (let i = 1; i <= 100; i++) { const a = (i / 30) * Math.PI * 2; await page.mouse.move(cx + r * Math.cos(a), cy + r * Math.sin(a)); await page.waitForTimeout(12); }
    await page.mouse.up();
    // The poster: the lid up, the ballerina turning in front of the first photo in the mirror.
    await page.waitForTimeout(3800);
    const poster = await page.screenshot();
    await page.waitForTimeout(5600);
    return poster;
  },
  constellations: async (page) => {
    await page.locator("[data-star]").first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(1500);
    const poster = await page.screenshot();
    for (let i = 0; i < 3; i++) {
      await page.locator(`[data-star="${i}"]`).click({ force: true });
      await page.waitForTimeout(1500);
      await page.getByTestId("close-photo").click({ force: true });
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
  // Page chrome and the dev indicator do not belong in marketing assets. Hidden from the first paint,
  // not after the page settles: the recording starts with the page, and the gallery plays it from 0,
  // so a style added after load left the demo bar and the dev badge on the preview's opening second.
  // Into <head> as soon as there is one; React 19 hydrates past an extra tag there.
  await context.addInitScript((css) => {
    const add = () => {
      if (!document.head) return false;
      const style = document.createElement("style");
      style.textContent = css;
      document.head.appendChild(style);
      return true;
    };
    if (add()) return;
    const watch = new MutationObserver(() => add() && watch.disconnect());
    watch.observe(document, { childList: true, subtree: true });
  }, '[data-demo-chrome], a[href*="/templates/"], a[href="/?ref=watermark"], nextjs-portal { display: none !important; }');
  const page = await context.newPage();
  await page.goto(`${base}/demo/${slug}`, { waitUntil: "networkidle" });
  let poster;
  try {
    poster = await run(page);
  } catch (e) {
    console.log("FAILED", slug, e.message.split("\n")[0]);
    await context.close();
    continue;
  }
  await sharp(poster).jpeg({ quality: 82, mozjpeg: true }).toFile(join(dir, "poster.jpg"));
  await context.close();
  const [video] = readdirSync(videoDir).filter((f) => f.endsWith(".webm"));
  renameSync(join(videoDir, video), join(dir, "preview.webm"));
  console.log("captured", slug);
}
rmSync(".tmp-video", { recursive: true, force: true });
await browser.close();
