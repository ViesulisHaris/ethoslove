import { devices, expect, test, webkit, type Page } from "@playwright/test";
import { MONTHS, monthSlug } from "../../src/content/month-anniversaries";
import { measure, settle } from "./page-measure";

/**
 * The pages of the gifts2 area (BRIEF-gifts2.md): the 24 anniversary months and the five pages by name, held to
 * the same ruler as the pages beside them (tests/e2e/spread-design.spec.ts): within 300 words without opening
 * anything, the art and a gift in the first view, no flower under words, nothing too small for a thumb, and on a
 * phone one card to a screen.
 */
const NAMED = ["apology-for-him", "apology-for-her", "long-distance-care-package", "surprise", "memory-book"];
const PAGES = [...MONTHS.map((n) => `/gifts/${monthSlug(n)}`), ...NAMED.map((slug) => `/gifts/${slug}`)];

/** The owner's list of screens, as in spread-design.spec.ts. */
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

test.skip(({ isMobile }) => isMobile, "sets its own screen sizes");

/** What a page's sets of cards look like on the screen (copied from spread-design.spec.ts). */
async function cardSets(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-cards]")].map((row) => {
      const cards = [...row.querySelectorAll<HTMLElement>("[data-card]")].map((card) => {
        const r = card.getBoundingClientRect();
        const img = card.querySelector("img");
        return { left: r.left, right: r.right, width: r.width, title: card.querySelector("[data-card-title]")?.textContent ?? "", picture: !!img && img.complete && img.naturalWidth > 0 };
      });
      const dots = row.parentElement!.querySelector<HTMLElement>("[data-dots]");
      return { id: row.id, cards, scrolls: row.scrollWidth > row.clientWidth + 1, dots: dots && getComputedStyle(dots).display !== "none" ? dots.children.length : 0 };
    }),
  );
}

/** Each row swiped to its end, a card at a time, and put back: a poster is fetched when its card comes on screen. */
async function swipeThrough(page: Page) {
  await page.evaluate(async () => {
    for (const row of document.querySelectorAll<HTMLElement>("[data-cards]")) {
      if (row.scrollWidth <= row.clientWidth + 1) continue;
      row.scrollIntoView({ block: "center" });
      for (const card of row.querySelectorAll<HTMLElement>("[data-card]")) {
        row.scrollTo({ left: card.offsetLeft - row.offsetLeft, behavior: "instant" });
        await new Promise((r) => setTimeout(r, 120));
      }
      row.scrollTo({ left: 0, behavior: "instant" });
    }
    window.scrollTo(0, 0);
  });
}

for (const prefix of ["", "/es"]) {
  for (const path of PAGES) {
    test(`${prefix}${path}: within 300 words, the art and a gift in the first view, nothing under words`, async ({ page }) => {
      test.slow();
      for (const [width, height] of [[1440, 900], [375, 812]] as const) {
        await page.setViewportSize({ width, height });
        await page.goto(`${prefix}${path}`);
        await settle(page);
        const m = await measure(page);
        expect(m.overflow, `${width}: the page scrolls sideways`).toBeLessThanOrEqual(0);
        expect(m.overlaps, `${width}: a piece of the art lies under words`).toEqual([]);
        expect(m.count, `${width}: words on the page`).toBeLessThanOrEqual(300);
        expect(m.count, `${width}: words on the page`).toBeGreaterThan(120);
        expect(m.hand, `${width}: handwriting on show before a card is opened`).toBe(0);
        expect(m.smallest, `${width}: a sentence under 14px`).toBeGreaterThanOrEqual(14);
        expect(m.smallestLabel, `${width}: a label under 12px`).toBeGreaterThanOrEqual(12);
        expect(m.small, `${width}: too small for a thumb`).toEqual([]);
        expect(m.decorInView, `${width}: no art in the first view`).toBeGreaterThanOrEqual(1);
        if (width >= 1024) await expect(page.locator("[data-flatlay=hero]")).toBeInViewport();
        const cover = page.locator("[data-flatlay=hero] [data-cover] img");
        expect(await cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), `${width}: the gift's cover in the phone`).toBe(true);
        expect(m.pieces, `${width}: pieces of art on the page`).toBeGreaterThanOrEqual(4);
        await swipeThrough(page);
        await expect
          .poll(async () => (await cardSets(page)).flatMap((set) => set.cards).filter((card) => !card.picture).map((card) => card.title), { message: `${width}: cards with no picture`, timeout: 20_000 })
          .toEqual([]);
      }
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    });
  }
}

for (const path of ["/gifts/1-month-anniversary", "/es/gifts/12-month-anniversary", "/gifts/surprise", "/es/gifts/apology-for-her"]) {
  for (const [width, height] of SIZES) {
    test(`${path} at ${width}×${height}: no sideways scroll, no flower under words, nothing too small to press`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto(path);
      await settle(page);
      const m = await measure(page);
      expect(m.overflow, "the page scrolls sideways").toBeLessThanOrEqual(0);
      expect(m.overlaps, "a piece of the art lies under words").toEqual([]);
      expect(m.count).toBeLessThanOrEqual(300);
      expect(m.smallest).toBeGreaterThanOrEqual(14);
      expect(m.smallestLabel).toBeGreaterThanOrEqual(12);
      expect(m.small).toEqual([]);
      for (const set of await cardSets(page)) {
        if (width < 640) {
          expect(set.scrolls, `${set.id} is not a row to swipe`).toBe(true);
          expect(set.dots, `${set.id}: a dot for each card`).toBe(set.cards.length);
          expect(set.cards.filter((card) => card.right > 1 && card.left < width - 1).length, `${set.id}: cards on the screen at once`).toBe(1);
        } else {
          expect(set.scrolls, `${set.id} scrolls sideways`).toBe(false);
          for (const card of set.cards) expect(card.left >= 0 && card.right <= width, `${set.id}: “${card.title}” is off the page`).toBe(true);
        }
      }
    });
  }
}

test("WebKit as an iPhone 13: a month page and a page by name", async ({ baseURL }) => {
  test.setTimeout(180_000);
  const browser = await webkit.launch();
  try {
    const origin = new URL(baseURL!).origin;
    const context = await browser.newContext({ ...devices["iPhone 13"], baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    const page = await context.newPage();
    const thrown: string[] = [];
    page.on("pageerror", (error) => thrown.push(error.message));
    for (const path of ["/gifts/6-month-anniversary", "/gifts/long-distance-care-package"]) {
      await page.goto(path, { waitUntil: "load", timeout: 30_000 });
      expect(await page.evaluate(() => document.readyState), path).toBe("complete");
      await settle(page);
      const m = await measure(page);
      expect(m.overflow, path).toBeLessThanOrEqual(0);
      expect(m.overlaps, path).toEqual([]);
      expect(m.small, path).toEqual([]);
      expect(m.count, path).toBeLessThanOrEqual(300);
      const [set] = await cardSets(page);
      const width = page.viewportSize()!.width;
      expect(set.cards.filter((card) => card.right > 1 && card.left < width - 1).length, `${path}: cards on the screen at once`).toBe(1);
      expect(set.dots, path).toBe(set.cards.length);
      const card = page.locator("[data-cards] [data-card]").first();
      await card.locator("summary").first().scrollIntoViewIfNeeded();
      await card.locator("summary").first().tap();
      await expect(card.locator("[data-line]")).toBeVisible();
      await expect(card.getByTestId("idea-make")).toBeVisible();
      expect((await card.getByTestId("idea-make").boundingBox())!.height, path).toBeGreaterThanOrEqual(44);
    }
    expect(thrown).toEqual([]);
  } finally {
    await browser.close();
  }
});

test("on the smallest phone the hero's button is on the first screen", async ({ page }) => {
  test.slow();
  await page.setViewportSize({ width: 320, height: 568 });
  for (const prefix of ["", "/es"]) {
    for (const path of ["/gifts/1-month-anniversary", "/gifts/12-month-anniversary", "/gifts/24-month-anniversary", ...NAMED.map((slug) => `/gifts/${slug}`)]) {
      await page.goto(`${prefix}${path}`);
      const box = (await page.getByTestId("hero-make").boundingBox())!;
      expect(box.y + box.height, `${prefix}${path}: the hero's button ends below the first screen`).toBeLessThanOrEqual(568);
      expect(box.height, `${prefix}${path}`).toBeGreaterThanOrEqual(44);
    }
  }
});
