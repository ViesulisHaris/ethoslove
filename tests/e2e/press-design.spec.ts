import { devices, expect, test, webkit, type Page } from "@playwright/test";
import { measure, settle } from "./page-design";

/**
 * /press as a designed page (docs/marketing/growth-build/DESIGN-LESS-TEXT.md), held to the same
 * ruler as a gift's page and the finder: at every size on the owner's list and in both languages,
 * no sideways scroll, no flower under words or on a card, at most 300 words on show, type never
 * under 14px and nothing to press smaller than a thumb. It needs the sample figures, so the whole
 * file is skipped unless the dev server was started with PRESS_PREVIEW=1.
 */
const PREVIEW = process.env.PRESS_PREVIEW === "1";
test.skip(!PREVIEW, "needs a dev server started with PRESS_PREVIEW=1");
// One browser is enough for a layout that sets its own sizes; the phone project would only repeat it.
test.skip(({ isMobile }) => isMobile, "sets its own screen sizes");

/** The owner's list (the finder's spec has the same): phones, tablets, laptops and a wide desk; a phone on its side; a short laptop. */
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

async function open(page: Page, where: string) {
  await page.goto(where);
  await expect(page.locator("#press-title")).toBeVisible();
  await settle(page);
}

for (const [width, height] of SIZES) {
  test(`D1 ${width}×${height}: no sideways scroll, no flower under words or on a card, words within the budget`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height });
    for (const where of ["/press", "/es/press"]) {
      await open(page, where);
      const m = await measure(page);
      expect(m.overflow, `${where}: the page scrolls sideways`).toBeLessThanOrEqual(0);
      expect(m.overlaps, `${where}: a piece of the art lies under words`).toEqual([]);
      expect(m.onCards, `${where}: a piece of the art lies on a card`).toEqual([]);
      // The check has something to check: the phone on its lilies and the band's.
      expect(m.pieces, where).toBeGreaterThanOrEqual(2);
      expect(m.count, `${where}: words on the page`).toBeLessThanOrEqual(300);
      expect(m.count, where).toBeGreaterThan(150);
      expect(m.smallest, where).toBeGreaterThanOrEqual(14);
      expect(m.smallestLabel, where).toBeGreaterThanOrEqual(12);
      expect(m.small, `${where}: too small for a thumb`).toEqual([]);
      // On a shorter single-column screen the first screen is the words, and the phone comes with the first flick.
      if (width >= 1024 || height >= 700) {
        expect(m.decorInView, `${where}: no flower in the first view`).toBeGreaterThanOrEqual(1);
        expect(m.picturesInView, `${where}: no picture in the first view`).toBeGreaterThanOrEqual(1);
      }
    }
  });
}

test("D2 the first screen says what the page is: the brand line, the heading, the sentence and the way to write", async ({ page }) => {
  const inFirst = (selector: string, part: "whole" | "top" = "whole") =>
    page.locator(selector).first().evaluate((el, part) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && (part === "top" ? r.top < innerHeight : r.bottom <= innerHeight);
    }, part);
  // English at every size first, then Spanish: a visit in Spanish is remembered, and the plain address would follow it.
  for (const [where, button] of [
    ["/press", "Write to us"],
    ["/es/press", "Escríbenos"],
  ]) {
    for (const [width, height] of [
      [1440, 900],
      [375, 812],
      [320, 568],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto(where);
      if (width === 320) {
        // On the smallest phone the button begins within the first screen.
        await page.evaluate(() => document.fonts.ready);
        expect(await inFirst(`[data-page-theme] a[href^="mailto:"]:has-text("${button}")`, "top"), `${where} 320`).toBe(true);
        continue;
      }
      await expect(page.locator("#press-title")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await inFirst("[data-maker]"), `${where} ${width}`).toBe(true);
      expect(await inFirst("h1"), `${where} ${width}`).toBe(true);
      expect(await inFirst(`[data-page-theme] a[href^="mailto:"]:has-text("${button}")`), `${where} ${width}`).toBe(true);
      if (width === 1440) {
        const cover = page.locator('[data-flatlay=press] img[alt]:not([alt=""])');
        expect(await inFirst('[data-flatlay=press] img[alt]:not([alt=""])'), where).toBe(true);
        await expect.poll(() => cover.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
      }
    }
  }
});

test("D3 on a phone the figures are a list and the gifts one card to a screen with dots; on a desk the figures are unboxed columns under hairlines and the gifts a row", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await open(page, "/press");
  const phone = await page.evaluate(() => ({
    backgrounds: [...document.querySelectorAll("[data-figure]")].map((el) => getComputedStyle(el).backgroundColor),
    lefts: [...document.querySelectorAll("[data-figure]")].map((el) => Math.round(el.getBoundingClientRect().left)),
    whole: [...document.querySelectorAll("[data-card]")].map((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth;
    }),
  }));
  for (const bg of phone.backgrounds) expect(bg).toBe("rgba(0, 0, 0, 0)");
  expect(new Set(phone.lefts).size).toBe(1);
  expect(phone.whole).toEqual([true, false, false, false, false]);
  const dots = page.locator("[data-dots] > *");
  await expect(dots).toHaveCount(5);
  await expect(dots.first()).toHaveAttribute("data-on", /.*/);
  await page.locator("#press-most-made").evaluate((row) => row.scrollTo({ left: row.scrollWidth, behavior: "instant" }));
  await expect(dots.last()).toHaveAttribute("data-on", /.*/);

  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "/press");
  const desk = await page.evaluate(() => ({
    backgrounds: [...document.querySelectorAll("[data-figure]")].map((el) => getComputedStyle(el).backgroundColor),
    tops: [...document.querySelectorAll("[data-figure]")].map((el) => Math.round(el.getBoundingClientRect().top)),
    widths: [...document.querySelectorAll("[data-figure]")].map((el) => Math.round(el.getBoundingClientRect().width)),
    boxes: [...document.querySelectorAll("[data-figure]")].map((el) => {
      const cs = getComputedStyle(el);
      return { radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, left: cs.borderLeftWidth, top: cs.borderTopWidth };
    }),
    cardTops: [...document.querySelectorAll("[data-card]")].map((el) => Math.round(el.getBoundingClientRect().top)),
  }));
  // Not a dashboard of boxed cards: no ground, no radius, no shadow, no side borders; a hairline over each.
  for (const bg of desk.backgrounds) expect(bg).toBe("rgba(0, 0, 0, 0)");
  for (const box of desk.boxes) expect(box).toEqual({ radius: "0px", shadow: "none", left: "0px", top: "1px" });
  // The last figure keeps its column's width: nothing is stretched across a row.
  expect(new Set(desk.widths).size).toBe(1);
  expect(desk.tops[1]).toBe(desk.tops[0]);
  expect(desk.tops[2]).toBe(desk.tops[0]);
  expect(desk.tops[3]).toBeGreaterThan(desk.tops[0]!);
  expect(new Set(desk.cardTops).size).toBe(1);
  await expect(page.locator("[data-dots]")).toBeHidden();
});

test("D4 the page is whole, and the same height, when no picture arrives", async ({ page }) => {
  test.setTimeout(90_000);
  for (const [width, height] of [
    [1440, 900],
    [375, 812],
  ]) {
    await page.setViewportSize({ width, height });
    await open(page, "/press");
    const withPictures = (await measure(page)).height;
    await page.route(/\.(webp|jpg|png)(\?|$)|\/_next\/image/, (route) => route.abort());
    await open(page, "/press");
    const m = await measure(page);
    expect(Math.abs(m.height - withPictures), `${width}: height without pictures`).toBeLessThanOrEqual(2);
    expect(m.overflow).toBeLessThanOrEqual(0);
    for (const value of await page.locator("[data-value]").all()) await expect(value).toBeVisible();
    for (const name of await page.locator("[data-card-title]").all()) {
      await name.scrollIntoViewIfNeeded();
      await expect(name).toBeVisible();
    }
    await page.unroute(/\.(webp|jpg|png)(\?|$)|\/_next\/image/);
  }
});

test("D5 it is one page of the same site as a gift's: the site's palette on the page's own tokens, blush flowers, the footer's flower", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page, "/press");
  const theme = page.locator("[data-page-theme=press]");
  await expect(theme).toHaveCount(1);
  const colours = await theme.evaluate((el) => {
    const cs = getComputedStyle(el);
    return ["--page-ground", "--page-raised", "--page-band", "--page-ink", "--page-accent"].map((name) => cs.getPropertyValue(name).trim());
  });
  expect(colours).toEqual(["#f3e1d5", "#fbf1e9", "#e8cfc1", "#24121b", "#a31f52"]);
  const art = await theme.locator("[data-decor] img").evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src") ?? ""));
  expect(art.length).toBeGreaterThanOrEqual(2);
  for (const src of art) expect(src).toMatch(/\/art\/pages\/[a-z0-9-]+?(-blush)?(-bezel)?(-1x)?\.webp$/);
  await expect(page.locator("[data-footer-flower]")).toBeVisible();
  for (const line of ["#press-numbers + p", "#press-made + p", "#press-contact + p"]) {
    const words = (await page.locator(line).innerText()).trim().split(/\s+/).length;
    expect(words, line).toBeLessThanOrEqual(14);
  }
});

test("D6 an iPhone in Safari: nothing off the side, no flower under a word, a question opens to a tap", async ({ baseURL }) => {
  test.setTimeout(120_000);
  const browser = await webkit.launch();
  try {
    const origin = new URL(baseURL ?? "http://localhost:3000").origin;
    const context = await browser.newContext({ ...devices["iPhone 13"], baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    const page = await context.newPage();
    for (const where of ["/press", "/es/press"]) {
      await open(page, where);
      const m = await measure(page);
      expect(m.overflow, where).toBeLessThanOrEqual(0);
      expect(m.overlaps, where).toEqual([]);
      expect(m.small, where).toEqual([]);
      const summary = page.locator("details[name=press-faq] summary").first();
      await summary.scrollIntoViewIfNeeded();
      await summary.tap();
      await expect(page.locator("details[name=press-faq]").first().locator("p")).toBeVisible();
      const mail = await page.locator("[data-press-mail]").evaluate((a) => {
        const r = a.getBoundingClientRect();
        return { height: r.height, width: r.width, screen: innerWidth };
      });
      expect(mail.height).toBeGreaterThanOrEqual(44);
      expect(mail.width).toBeLessThanOrEqual(mail.screen);
    }
    await context.close();
  } finally {
    await browser.close();
  }
});
