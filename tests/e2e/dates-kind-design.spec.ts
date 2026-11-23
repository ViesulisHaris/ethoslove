import { devices, expect, test, webkit } from "@playwright/test";
import { measure, settle } from "./page-design";

/**
 * The pages by kind of date as designed pages (docs/marketing/growth-build/DESIGN-LESS-TEXT.md),
 * held to the gift page's ruler (tests/e2e/page-design.ts): at every size on the owner's list, in
 * both languages, no sideways scroll, no flower under words or on a card, at most 300 words on show,
 * a flower and a real picture in the first view, type never under 14px, and nothing to press smaller
 * than a thumb. Screenshots someone looked at are the other half (shots/dates/v3-*.png).
 */

/** The owner's list (copied from gift-finder-design.spec.ts: a spec file is never imported). */
const SIZES: [number, number][] = [
  [320, 568],
  [360, 740],
  [375, 812],
  [390, 844],
  [414, 896],
  [720, 450],
  [768, 1024],
  [820, 1180],
  [1024, 768],
  [1100, 800],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
  [812, 375],
  [1280, 620],
];
const MAIN = ["/dates/ideas/first-date", "/es/dates/ideas/first-date"];
const MORE = ["/dates/ideas/rainy-day", "/es/dates/ideas/rainy-day", "/dates/ideas/cheap", "/es/dates/ideas/cheap", "/dates/london/first-date", "/es/dates/london/first-date"];

test.skip(({ isMobile }) => isMobile, "sets its own screen sizes");

for (const [width, height] of SIZES) {
  test(`D1 ${width}×${height}: no sideways scroll, no flower under words or on a card, words within the budget`, async ({ page }) => {
    test.setTimeout(150_000);
    await page.setViewportSize({ width, height });
    const pages = (width === 1440 && height === 900) || (width === 375 && height === 812) ? [...MAIN, ...MORE] : MAIN;
    for (const where of pages) {
      // The language last chosen is remembered in a cookie: a bare address would follow it.
      await page.context().clearCookies();
      await page.goto(where);
      await expect(page.getByRole("heading", { level: 1 }), where).toBeVisible();
      await settle(page);
      const m = await measure(page);
      expect(m.overflow, `${where}: the page scrolls sideways`).toBeLessThanOrEqual(0);
      expect(m.overlaps, `${where}: a piece of the art lies under words`).toEqual([]);
      expect(m.onCards, `${where}: a piece of the art lies on a card`).toEqual([]);
      expect(m.count, `${where}: words on the page`).toBeLessThanOrEqual(300);
      expect(m.count, where).toBeGreaterThan(60);
      expect(m.smallest, where).toBeGreaterThanOrEqual(14);
      expect(m.smallestLabel, where).toBeGreaterThanOrEqual(12);
      expect(m.small, `${where}: too small for a thumb`).toEqual([]);
      expect(m.pieces, where).toBeGreaterThanOrEqual(1);
      console.log(`words ${width}x${height} ${where}: ${m.count} (+${m.hand} handwritten)`);
    }
  });
}

test("D2 the first screen has a flower and a real picture, on a desk and on a phone", async ({ page }) => {
  for (const [width, height] of [[1440, 900], [375, 812]] as const) {
    await page.setViewportSize({ width, height });
    for (const where of MAIN) {
      await page.context().clearCookies();
      await page.goto(where);
      await settle(page);
      const m = await measure(page);
      expect(m.decorInView, `${where} ${width}: no flower in the first view`).toBeGreaterThanOrEqual(1);
      expect(m.picturesInView, `${where} ${width}: no picture in the first view`).toBeGreaterThanOrEqual(1);
    }
  }
  await page.setViewportSize({ width: 375, height: 667 });
  await page.context().clearCookies();
  await page.goto("/dates/ideas/first-date");
  const button = page.getByRole("link", { name: "Plan one in a tap" });
  expect((await button.boundingBox())!.y + (await button.boundingBox())!.height).toBeLessThanOrEqual(667);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.reload();
  expect((await button.boundingBox())!.y).toBeLessThan(568);
});

test("D3 on a phone the cards are one row, one to a screen, with dots; on a desk a grid of three", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/dates/ideas/first-date");
  const row = page.locator("#ideas-first-date");
  await row.scrollIntoViewIfNeeded();
  const whole = await row.locator("[data-card]").evaluateAll((cards) => cards.filter((c) => { const r = c.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }).length);
  expect(whole).toBe(1);
  const dots = page.locator("[data-dots]").first();
  await expect(dots.locator("> *")).toHaveCount(9);
  await expect(dots.locator("> *").first()).toHaveAttribute("data-on", /.*/);
  await row.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
  await expect(dots.locator("> *").last()).toHaveAttribute("data-on", /.*/);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dates/ideas/first-date");
  const tops = await page.locator("#ideas-first-date [data-card]").evaluateAll((cards) => cards.slice(0, 4).map((c) => Math.round(c.getBoundingClientRect().top)));
  expect(tops[1]).toBe(tops[0]);
  expect(tops[2]).toBe(tops[0]);
  expect(tops[3]).toBeGreaterThan(tops[0]);
  await expect(page.locator("[data-dots]").first()).toBeHidden();

  // Four cards in rows of three left one alone: the cheap page's two fours are two by two.
  await page.goto("/dates/ideas/cheap");
  for (const id of ["#ideas-cheap-free", "#ideas-cheap-paid"]) {
    const rows = await page.locator(`${id} [data-card]`).evaluateAll((cards) => cards.map((c) => Math.round(c.getBoundingClientRect().top)));
    expect(rows, id).toHaveLength(4);
    expect(rows[1], id).toBe(rows[0]);
    expect(rows[2], id).toBeGreaterThan(rows[0]);
    expect(rows[3], id).toBe(rows[2]);
  }
  // The kinds row: the gap after a short word is the gap after a long one.
  const gaps = await page.locator("nav[aria-label] ul li a[href*='/dates/ideas/']").evaluateAll((links) =>
    links.slice(0, -1).map((a, i) => Math.round(links[i + 1].getBoundingClientRect().left - a.getBoundingClientRect().right)).filter((g) => g > 0),
  );
  expect(gaps.length).toBeGreaterThan(2);
  expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(2);
});

test("D4 the page is whole, and the same height, when no picture arrives", async ({ page }) => {
  for (const [width, height] of [[1440, 900], [375, 812]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/dates/ideas/first-date");
    await settle(page);
    const withPictures = await measure(page);
    await page.route(/\.webp(\?|$)/, (route) => route.abort());
    await page.reload();
    await settle(page);
    const without = await measure(page);
    await page.unroute(/\.webp(\?|$)/);
    expect(Math.abs(without.height - withPictures.height), `${width}`).toBeLessThanOrEqual(2);
    expect(without.overflow).toBeLessThanOrEqual(0);
    for (const title of await page.locator("[data-card-title]").all()) expect(await title.evaluate((el) => el.getBoundingClientRect().height > 0 && (el.textContent ?? "").length > 0)).toBe(true);
  }
});

test("D5 an iPhone in Safari: nothing off the side, a card opens, the choices are a thumb tall", async ({ baseURL }) => {
  test.setTimeout(120_000);
  const browser = await webkit.launch();
  try {
    const origin = new URL(baseURL ?? "http://localhost:3000").origin;
    const context = await browser.newContext({ ...devices["iPhone 13"], baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    const page = await context.newPage();
    for (const where of MAIN) {
      await page.goto(where);
      await settle(page);
      const m = await measure(page);
      expect(m.overflow, where).toBeLessThanOrEqual(0);
      expect(m.overlaps, where).toEqual([]);
      const first = page.locator("[data-card]").first();
      await first.locator("summary").scrollIntoViewIfNeeded();
      await first.locator("summary").tap();
      await expect(first.locator("details > div > p").first()).toBeVisible();
      const selects = await page.locator("#tonight select").evaluateAll((els) => els.map((el) => ({ h: el.getBoundingClientRect().height, f: parseFloat(getComputedStyle(el).fontSize) })));
      expect(selects.length, where).toBeGreaterThanOrEqual(3);
      for (const s of selects) {
        expect(s.h, where).toBeGreaterThanOrEqual(44);
        expect(s.f, where).toBeGreaterThanOrEqual(16);
      }
    }
    await context.close();
  } finally {
    await browser.close();
  }
});
