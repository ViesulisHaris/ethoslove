import { devices, expect, test, webkit, type Page } from "@playwright/test";
import { measure, settle } from "./page-measure";

/**
 * /digital-cards, the gift pages by kind and the idea lists of the occasion pages, laid out as the
 * gift's page the owner approved (docs/marketing/growth-build/DESIGN-LESS-TEXT.md, "built from the
 * gift page", 22 Nov 2026) and held to the same ruler as that page (tests/e2e/page-measure.ts):
 * the words a visitor sees without opening anything stay within 300, no flower lies under words,
 * the page never scrolls sideways, the first screen has the art and a real picture of a gift, a
 * thumb can hit what is meant to be pressed, and on a phone a set of cards shows one card at a
 * time. The owner refused the first version of these pages for its wall of text; the screenshots
 * someone looked at are the other half of the proof (shots/pages/v3-*.png).
 */
const KINDS = ["last-minute", "video-message", "interactive-birthday-card", "virtual-birthday-cake", "photo-album", "anniversary-website"] as const;
/** The pages that open on the hero, with how many cards their first set has. */
const HERO_PAGES = ["/digital-cards", ...KINDS.map((kind) => `/gifts/${kind}`)];
/** Occasion pages: one whose list records its samples' fields, one written before that, and one with the links to the pages by kind. */
const OCCASION_PAGES = ["/occasions/mothers-day", "/occasions/christmas", "/occasions/birthday"];

/** The owner's list of screens: phones, tablets, laptops, a wide desk, a phone on its side, a short laptop. */
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

// One browser is enough for a layout that sets its own sizes; the phone project would only repeat it.
test.skip(({ isMobile }) => isMobile, "sets its own screen sizes");

/** What a page's sets of cards look like on the screen: each set's cards, and which of them can be seen. */
async function cardSets(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-cards]")].map((row) => {
      const cards = [...row.querySelectorAll<HTMLElement>("[data-card]")].map((card) => {
        const r = card.getBoundingClientRect();
        const img = card.querySelector("img");
        return { left: r.left, right: r.right, width: r.width, title: card.querySelector("h3")?.textContent ?? "", open: card.querySelector("details")?.open ?? false, picture: !!img && img.complete && img.naturalWidth > 0 };
      });
      const dots = row.parentElement!.querySelector<HTMLElement>("[data-dots]");
      return { id: row.id, cards, scrolls: row.scrollWidth > row.clientWidth + 1, dots: dots && getComputedStyle(dots).display !== "none" ? dots.children.length : 0, on: dots ? [...dots.children].findIndex((d) => d.hasAttribute("data-on")) : -1 };
    }),
  );
}

for (const prefix of ["", "/es"]) {
  for (const path of HERO_PAGES) {
    test(`${prefix}${path}: within 300 words, the art and a gift in the first view, nothing under words`, async ({ page }) => {
      for (const [width, height] of [[1440, 900], [375, 812]] as const) {
        await page.setViewportSize({ width, height });
        await page.goto(`${prefix}${path}`);
        await settle(page);
        const m = await measure(page);
        expect(m.overflow, `${width}: the page scrolls sideways`).toBeLessThanOrEqual(0);
        expect(m.overlaps, `${width}: a piece of the art lies under words`).toEqual([]);
        // 300 words at most without opening anything, the header and the footer aside. And it is a page, not a stub.
        expect(m.count, `${width}: words on the page`).toBeLessThanOrEqual(300);
        expect(m.count, `${width}: words on the page`).toBeGreaterThan(120);
        // A line to borrow is in a card, and a card is closed until it is opened.
        expect(m.hand, `${width}: handwriting on show before a card is opened`).toBe(0);
        expect(m.smallest, `${width}: a sentence under 14px`).toBeGreaterThanOrEqual(14);
        expect(m.smallestLabel, `${width}: a label under 12px`).toBeGreaterThanOrEqual(12);
        expect(m.small, `${width}: too small for a thumb`).toEqual([]);
        // The first screen: a piece of the art, and on a desk the phone on its flowers with a gift's own cover in it.
        expect(m.decorInView, `${width}: no art in the first view`).toBeGreaterThanOrEqual(1);
        if (width >= 1024) await expect(page.locator("[data-flatlay=hero]")).toBeInViewport();
        const cover = page.locator("[data-flatlay=hero] [data-cover] img");
        expect(await cover.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), `${width}: the gift's cover in the phone`).toBe(true);
        // The band's phone on its flowers, and every card's picture.
        expect(m.pieces, `${width}: pieces of art on the page`).toBeGreaterThanOrEqual(4);
        for (const set of await cardSets(page)) for (const card of set.cards) expect(card.picture, `${width}: “${card.title}” has no picture`).toBe(true);
      }
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    });
  }

  for (const path of OCCASION_PAGES) {
    test(`${prefix}${path}: the ideas and the guide are cards and closed rows, within 300 words`, async ({ page }) => {
      for (const [width, height] of [[1440, 900], [375, 812]] as const) {
        await page.setViewportSize({ width, height });
        await page.goto(`${prefix}${path}`);
        await settle(page);
        // The gallery above is the live one, untouched; what is measured is what this build laid out: the ideas and the guide.
        const m = await measure(page);
        expect(m.overflow, `${width}: the page scrolls sideways`).toBeLessThanOrEqual(0);
        expect(m.overlaps, `${width}: a piece of the art lies under words`).toEqual([]);
        expect(m.count, `${width}: words under the gallery`).toBeLessThanOrEqual(300);
        expect(m.count, `${width}: words under the gallery`).toBeGreaterThan(80);
        expect(m.hand, `${width}`).toBe(0);
        expect(m.smallest, `${width}`).toBeGreaterThanOrEqual(14);
        expect(m.small, `${width}: too small for a thumb`).toEqual([]);
        const [set] = await cardSets(page);
        expect(set.cards.length).toBeGreaterThanOrEqual(8);
        await page.locator("[data-cards]").scrollIntoViewIfNeeded();
        for (const card of (await cardSets(page))[0].cards.slice(0, width < 640 ? 1 : 3)) expect(card.picture, `${width}: “${card.title}” has no picture`).toBe(true);
      }
      // No paragraph of an idea is on the page any more: under the gallery, no block of text runs past thirty words until something is opened.
      const longest = await page.evaluate(() => {
        const root = document.querySelector("[data-page-theme]")!;
        return Math.max(0, ...[...root.querySelectorAll("p, li, h2, h3")].filter((el) => !el.closest("details") || el.closest("summary")).map((el) => (el.children.length === 0 ? (el.textContent ?? "").trim().split(/\s+/).length : 0)));
      });
      expect(longest).toBeLessThanOrEqual(30);
    });
  }
}

for (const path of ["/digital-cards", "/gifts/last-minute", "/es/gifts/anniversary-website", "/occasions/mothers-day"]) {
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
      // Under 640px a set of cards is one row with one card to a screen; from 640px it is a grid with every card on the page.
      for (const set of await cardSets(page)) {
        if (width < 640) {
          expect(set.scrolls, `${set.id} is not a row to swipe`).toBe(true);
          expect(set.dots, `${set.id}: a dot for each card`).toBe(set.cards.length);
          const seen = set.cards.filter((card) => card.right > 1 && card.left < width - 1);
          expect(seen.length, `${set.id}: cards on the screen at once`).toBe(1);
          // The next card is wholly off the screen, and the one showing is a screen wide, margin to margin.
          expect(set.cards[1].left).toBeGreaterThanOrEqual(width);
          expect(set.cards[0].width).toBeGreaterThan(width - 48);
        } else {
          expect(set.scrolls, `${set.id} scrolls sideways`).toBe(false);
          expect(set.dots).toBe(0);
          for (const card of set.cards) expect(card.left >= 0 && card.right <= width, `${set.id}: “${card.title}” is off the page`).toBe(true);
        }
      }
    });
  }
}

test("on a phone a swipe brings the next card, and the dots follow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/gifts/last-minute");
  await settle(page);
  const row = page.locator("[data-cards]").first();
  await row.scrollIntoViewIfNeeded();
  expect((await cardSets(page))[0].on).toBe(0);
  // The row snaps a card to the page's margin: a flick of most of a card's width lands on the next one.
  await row.evaluate((el) => el.scrollBy({ left: el.clientWidth * 0.8, behavior: "instant" }));
  await expect.poll(async () => (await cardSets(page))[0].on).toBe(1);
  const set = (await cardSets(page))[0];
  expect(set.cards.filter((card) => card.right > 1 && card.left < 374).length).toBe(1);
  expect(Math.round(set.cards[1].left)).toBe(20);
  // To the end: the last dot, the last card.
  await row.evaluate((el) => el.scrollTo({ left: el.scrollWidth, behavior: "instant" }));
  await expect.poll(async () => (await cardSets(page))[0].on).toBe(set.cards.length - 1);
});

test("a card opens to one line and a line in handwriting, one card at a time, and by keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/gifts/last-minute");
  await settle(page);
  const cards = page.locator("[data-cards] [data-card]");
  const first = cards.nth(0);
  const second = cards.nth(1);
  // Closed: a picture and a title, and nothing of what it holds.
  await expect(first.locator("h3")).toBeVisible();
  await expect(first.locator("[data-line]")).toBeHidden();
  await expect(first.getByTestId("idea-make")).toBeHidden();
  await first.locator("summary").click();
  await expect(first.locator("[data-line]")).toBeVisible();
  await expect(first.getByTestId("idea-make")).toBeVisible();
  await expect(first.getByTestId("idea-watch")).toBeVisible();
  // The handwriting is the gift page's own hand, and what is opened stays short: one line and one line to borrow.
  expect(await first.locator("[data-line]").evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/caveat|hand/i);
  const m = await measure(page);
  expect(m.hand).toBeGreaterThan(3);
  expect(m.hand).toBeLessThanOrEqual(16);
  expect(m.count).toBeLessThanOrEqual(300);
  expect(m.small).toEqual([]);
  expect(m.overlaps).toEqual([]);
  // Opening another closes the first.
  await second.locator("summary").click();
  await expect(second.locator("[data-line]")).toBeVisible();
  await expect(first.locator("[data-line]")).toBeHidden();
  // By keyboard: the card's title is the thing focused, Enter opens and closes it, and the focus ring is drawn.
  const third = cards.nth(2);
  await third.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(third.locator("[data-line]")).toBeVisible();
  expect(await third.locator("summary").evaluate((el) => el.matches(":focus-visible") && getComputedStyle(el).outlineStyle !== "none")).toBe(true);
  await page.keyboard.press("Tab");
  await expect(third.getByTestId("idea-make")).toBeFocused();
  await third.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(third.locator("[data-line]")).toBeHidden();
});

test("an occasion's cards show a sample in handwriting under its field's name, where the list records the field", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/occasions/mothers-day");
  await settle(page);
  const bouquet = page.locator('[data-cards] [data-card]:has(a[href="/create/bouquet"])');
  await bouquet.locator("summary").click();
  // The card in the bouquet: its editor's own name for the field, and the sample that fits its thirty characters.
  await expect(bouquet.locator("[data-line]")).toHaveText("From the one who picked yours");
  await expect(bouquet.getByText("The little card", { exact: true })).toBeVisible();
  await expect(bouquet.getByTestId("idea-make")).toHaveAttribute("href", "/create/bouquet");
  // A list written before the fields were recorded shows the idea's line and no handwriting.
  await page.goto("/occasions/christmas");
  await settle(page);
  const card = page.locator("[data-cards] [data-card]").first();
  await card.locator("summary").click();
  await expect(card.getByTestId("idea-make")).toBeVisible();
  await expect(card.locator("[data-line]")).toHaveCount(0);
});

test("the pages are whole, and the same height, when no picture arrives", async ({ page }) => {
  for (const path of ["/digital-cards", "/gifts/photo-album"]) {
    await page.unroute(/\.(webp|jpg|jpeg|png|avif)(\?|$)|\/_next\/image/).catch(() => {});
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);
    await settle(page);
    const withPictures = await measure(page);
    // Every picture fails: the art, the posters, the sample photo. Boxes are reserved, so nothing moves.
    await page.route(/\.(webp|jpg|jpeg|png|avif)(\?|$)|\/_next\/image/, (route) => route.abort());
    await page.reload();
    await settle(page);
    const without = await measure(page);
    expect(without.sections, path).toEqual(withPictures.sections);
    expect(without.height, path).toBe(withPictures.height);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("the hero's phone plays the gift the page leads with", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/gifts/photo-album");
  const hero = page.locator("[data-flatlay=hero]");
  await expect(page.getByText("In the phone: Scrapbook. Tap it to play.")).toBeVisible();
  await hero.getByRole("button", { name: /try the live demo/i }).click();
  await expect(hero.locator("[data-upright] [data-template=scrapbook]")).toBeVisible({ timeout: 30000 });
  await page.keyboard.press("Escape");
  await expect(hero.locator("[data-upright]")).toHaveCount(0);
  // And the one button beside it opens that gift's editor, with the page's ref.
  await expect(page.getByTestId("hero-make")).toHaveAttribute("href", "/create/scrapbook?ref=gifts-photo-album");
});

test("these pages wear the site's own colours, not a gift's", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const grounds = new Set<string>();
  for (const path of ["/digital-cards", "/gifts/last-minute", "/gifts/video-message", "/occasions/apology"]) {
    await page.goto(path);
    grounds.add(await page.locator("[data-page-theme]").evaluate((el) => `${getComputedStyle(el).backgroundColor} ${getComputedStyle(el).color}`));
    // Blush flowers, the site's colourway, on every one.
    const art = await page.locator("[data-page-theme] [data-decor] img").evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).getAttribute("src") ?? ""));
    for (const src of art) expect(src, src).not.toMatch(/-(ivory|wine|moonlight)[-.]/);
  }
  // The site's paper and ink (globals.css, --brand-paper and --brand-ink), the same on each.
  expect([...grounds]).toEqual(["rgb(253, 247, 243) rgb(36, 18, 27)"]);
});

test("WebKit as an iPhone 13: no sideways scroll, one card to a screen, and a card opens under a finger", async ({ baseURL }) => {
  // Four pages in a second browser, each scrolled through.
  test.setTimeout(180_000);
  const browser = await webkit.launch();
  try {
    const origin = new URL(baseURL!).origin;
    const context = await browser.newContext({ ...devices["iPhone 13"], baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    const page = await context.newPage();
    const thrown: string[] = [];
    page.on("pageerror", (error) => thrown.push(error.message));
    for (const path of ["/gifts/last-minute", "/digital-cards", "/occasions/mothers-day"]) {
      // An occasion page opens on the live gallery, and in this WebKit a page with the gallery's films on it is never
      // "loaded" and its fonts never "ready" (/templates, which this build does not touch, is the same): `settle` would
      // wait for ever. So that page is scrolled through by hand, and its art waited for.
      if (path.startsWith("/occasions")) {
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.locator("[data-page-theme] h2").first().waitFor();
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.7) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, 0);
          await Promise.all([...document.querySelectorAll<HTMLImageElement>("[data-decor] img")].filter((img) => img.getClientRects().length > 0 && !img.complete).map((img) => new Promise((done) => ((img.onload = img.onerror = done), setTimeout(done, 4000)))));
        });
      } else {
        await page.goto(path, { waitUntil: "load" });
        await settle(page);
      }
      const m = await measure(page);
      expect(m.overflow, path).toBeLessThanOrEqual(0);
      expect(m.overlaps, path).toEqual([]);
      expect(m.small, path).toEqual([]);
      expect(m.count, path).toBeLessThanOrEqual(300);
      const [set] = await cardSets(page);
      const width = page.viewportSize()!.width;
      expect(set.cards.filter((card) => card.right > 1 && card.left < width - 1).length, `${path}: cards on the screen at once`).toBe(1);
      expect(set.dots, path).toBe(set.cards.length);
    }
    // A finger opens the card that is showing, and its way into the editor is under a thumb.
    await page.goto("/gifts/last-minute", { waitUntil: "load" });
    const card = page.locator("[data-cards] [data-card]").first();
    await card.locator("summary").scrollIntoViewIfNeeded();
    await card.locator("summary").tap();
    await expect(card.locator("[data-line]")).toBeVisible();
    await expect(card.getByTestId("idea-make")).toBeVisible();
    const box = (await card.getByTestId("idea-make").boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(thrown).toEqual([]);
  } finally {
    await browser.close();
  }
});
