import { devices, expect, test, webkit } from "@playwright/test";
import { measure, settle } from "./page-design";

/**
 * The gift finder as a designed page (docs/marketing/growth-build/DESIGN-LESS-TEXT.md, "The finder
 * itself" and "Every device"): built from a gift's page, in the site's own palette, and held to the
 * same ruler. At every size on the owner's list, in both languages and in each of its three states
 * (the first question, the second, the three gifts): no sideways scroll, no flower under words or
 * on a card, words within the budget (150 on a question, 220 on the results), a flower and a real
 * picture in the first view, type never under 14px, and nothing to press smaller than a thumb.
 * Screenshots someone looked at are the other half of the proof (shots/finder/v3-*.png).
 */
const STATES = [
  { name: "the first question", query: "", words: 150 },
  { name: "the second question", query: "?for=girlfriend", words: 150 },
  { name: "the three gifts", query: "?for=girlfriend&occasion=anniversary", words: 220 },
] as const;

/** The owner's list: phones, tablets, laptops and a wide desk; a phone on its side; a short laptop; a laptop zoomed to 200%. */
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

for (const [width, height] of SIZES) {
  test(`${width}×${height}: no sideways scroll, no flower under words or on a card, words within the budget`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width, height });
    for (const locale of ["", "/es"]) {
      for (const state of STATES) {
        const where = `${locale}/gifts/finder${state.query}`;
        await page.goto(where);
        await expect(page.locator(state.query.includes("occasion") ? "#finder-picks" : "#finder-question"), where).toBeVisible();
        await settle(page);
        const m = await measure(page);
        expect(m.overflow, `${where}: the page scrolls sideways`).toBeLessThanOrEqual(0);
        expect(m.overlaps, `${where}: a piece of the art lies under words`).toEqual([]);
        expect(m.onCards, `${where}: a piece of the art lies on a card`).toEqual([]);
        // The check has something to check: a flower at a corner and one across the band's edge.
        expect(m.pieces, where).toBeGreaterThanOrEqual(width >= 1280 || width < 1024 ? 2 : 1);
        // 150 words at most on a question and 220 on the results, the header and the footer aside.
        expect(m.count, `${where}: words on the page`).toBeLessThanOrEqual(state.words);
        expect(m.count, where).toBeGreaterThan(25);
        // Sentences never under 14px; the small mono labels in capitals are 12px, as on a gift's page.
        expect(m.smallest, where).toBeGreaterThanOrEqual(14);
        expect(m.smallestLabel, where).toBeGreaterThanOrEqual(12);
        // What is meant to be pressed is at least 44px each way, for a thumb.
        expect(m.small, `${where}: too small for a thumb`).toEqual([]);
        // The first screen has a real picture in it (a gift on an answer card, or a pick), and a flower
        // wherever the screen has a corner free for one: not between 1024 and 1279 wide, where the
        // cards run to the page's edge and the only lily lies lower, under the words.
        // Not on the shortest screens (a phone on its side, a laptop zoomed to 200%), where the first
        // screen is the heading and the question, and the cards come with the first flick: a gift's
        // page makes the same allowance.
        if (height >= 568) expect(m.picturesInView, `${where}: no gift in the first view`).toBeGreaterThanOrEqual(1);
        if (width < 1024 || width >= 1280) expect(m.decorInView, `${where}: no flower in the first view`).toBeGreaterThanOrEqual(1);
      }
    }
  });
}

test("it is one page of the same site as a gift's: the site's palette on the page's own tokens, one h1, and the footer's flower", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/gifts/finder");
  const theme = page.locator("[data-page-theme=finder]");
  await expect(theme).toHaveCount(1);
  // The site's own paper, ink and rose (content/template-page-themes.ts, DEFAULT_PAGE_THEME): no gift's colours, no dark ground.
  const colours = await theme.evaluate((el) => {
    const cs = getComputedStyle(el);
    return ["--page-ground", "--page-raised", "--page-band", "--page-ink", "--page-accent"].map((name) => cs.getPropertyValue(name).trim());
  });
  expect(colours).toEqual(["#f3e1d5", "#fbf1e9", "#e8cfc1", "#24121b", "#b0245a"]);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Which digital gift should you send?");
  // The left column of the spread: a label, the heading and one line of at most fourteen words.
  const line = await page.locator("#finder-title + p").innerText();
  expect(line.trim().split(/\s+/).length).toBeLessThanOrEqual(14);
  await expect(page.locator("#finder-title").locator("xpath=preceding-sibling::p")).toHaveText(/gift finder/i);
  // Blush flowers, as the site's palette has them, and the faint one in the footer's corner.
  const art = await theme.locator("[data-decor] img").evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src") ?? ""));
  expect(art.length).toBeGreaterThanOrEqual(2);
  for (const src of art) expect(src).toMatch(/\/art\/pages\/[a-z0-9-]+?(-blush)?(-1x)?\.webp$/);
  expect(art.some((src) => src.includes("lily-"))).toBe(true);
  await expect(page.locator("[data-footer-flower]")).toBeVisible();
  // What the first version had and the owner refused is not on the page: the white box, the steps bar, the paragraphs.
  await expect(page.getByText("Question 1 of 3")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "How the finder picks" })).toHaveCount(0);
  await expect(page.locator("details[data-finder-how]")).not.toHaveAttribute("open", "");
});

test("a question fits the first screen of a phone: every first answer at 375×667, all but one row at 320×568", async ({ page }) => {
  for (const locale of ["", "/es"]) {
    for (const query of ["", "?for=girlfriend", "?for=mom", "?for=best-friend"]) {
      const where = `${locale}/gifts/finder${query}`;
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(where);
      await expect(page.locator("#finder-question"), where).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const at375 = await page.evaluate(() => ({
        heading: document.querySelector("h1")!.getBoundingClientRect(),
        question: document.querySelector("#finder-question")!.getBoundingClientRect().top,
        cards: [...document.querySelectorAll("[data-answer]")].map((el) => el.getBoundingClientRect().bottom),
        h1Lines: Math.round(document.querySelector("h1")!.getBoundingClientRect().height / parseFloat(getComputedStyle(document.querySelector("h1")!).lineHeight)),
        scrolled: scrollY,
      }));
      expect(at375.scrolled, where).toBe(0);
      expect(at375.heading.top, where).toBeGreaterThan(0);
      // The heading is three lines at most, and every first answer is on the screen without scrolling.
      expect(at375.h1Lines, where).toBeLessThanOrEqual(3);
      expect(at375.cards.length, where).toBe(query ? 7 : 8);
      for (const bottom of at375.cards) expect(bottom, `${where} at 375×667`).toBeLessThanOrEqual(667);

      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto(where);
      await expect(page.locator("#finder-question"), where).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const below = await page.evaluate(() => [...document.querySelectorAll("[data-answer]")].filter((el) => el.getBoundingClientRect().bottom > innerHeight).map((el) => Math.round(el.getBoundingClientRect().top)));
      // Two cards to a row: at most one row is below the screen's foot.
      expect(below.length, `${where} at 320×568`).toBeLessThanOrEqual(2);
      expect(new Set(below).size, `${where} at 320×568`).toBeLessThanOrEqual(1);
    }
  }
});

test("on a desk the answers are four to a row with the picture on top; on a phone two to a row with the picture beside the words", async ({ page }) => {
  const layout = () =>
    page.evaluate(() => {
      const cards = [...document.querySelectorAll<HTMLElement>("[data-answer]")];
      const first = cards[0].getBoundingClientRect();
      const picture = cards[0].querySelector("img")!.getBoundingClientRect();
      const words = cards[0].querySelector("span:last-child")!.getBoundingClientRect();
      return { perRow: cards.filter((c) => Math.abs(c.getBoundingClientRect().top - first.top) < 2).length, wordsUnder: words.top >= picture.bottom - 1, wordsBeside: words.left >= picture.right - 1 };
    });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/gifts/finder");
  expect(await layout()).toEqual({ perRow: 4, wordsUnder: true, wordsBeside: false });
  await page.setViewportSize({ width: 375, height: 667 });
  expect(await layout()).toEqual({ perRow: 2, wordsUnder: false, wordsBeside: true });
});

test("on a phone the three gifts are one row, one card to a screen, with dots under it; on a desk they stand side by side", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/gifts/finder?for=girlfriend&occasion=anniversary");
  const row = page.locator("#finder-row");
  await expect(row.locator("> li")).toHaveCount(3);
  const seen = () => row.locator("> li").evaluateAll((cards) => cards.map((card) => { const r = card.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
  // Only the first is on the screen, margin to margin; the next is wholly off it.
  expect(await seen()).toEqual([true, false, false]);
  const box = await row.locator("> li").first().boundingBox();
  expect(box!.x).toBeCloseTo(20, 0);
  expect(box!.width).toBeCloseTo(335, 0);
  const dots = page.locator("[data-dots] > span");
  await expect(dots).toHaveCount(3);
  await expect(dots.nth(0)).toHaveAttribute("data-on", "");
  // A swipe brings the next one, and the dots follow.
  await row.evaluate((el) => el.scrollTo({ left: el.clientWidth, behavior: "instant" }));
  await expect(dots.nth(1)).toHaveAttribute("data-on", "");
  expect(await seen()).toEqual([false, true, false]);
  // Three more are three more cards in the same row, and three more dots.
  await page.getByRole("button", { name: "Show three more" }).click();
  await expect(dots).toHaveCount(6);
  // The page itself never scrolls sideways for it.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/gifts/finder?for=girlfriend&occasion=anniversary");
  await expect(row.locator("> li")).toHaveCount(3);
  const tops = await row.locator("> li").evaluateAll((cards) => cards.map((card) => Math.round(card.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  await expect(page.locator("[data-dots]")).toBeHidden();
  // Tall pictures, as "More like this" crops a gift on its page: four wide, five tall.
  const picture = await row.locator("[data-watch]").first().boundingBox();
  expect(picture!.width / picture!.height).toBeCloseTo(4 / 5, 1);
});

test("the page is whole, and the same height, when no picture arrives", async ({ page }) => {
  for (const query of ["", "?for=girlfriend&occasion=anniversary"]) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.unroute(/\.(webp|jpg|jpeg|png|avif|webm)(\?|$)|\/_next\/image/);
    await page.goto(`/gifts/finder${query}`);
    await settle(page);
    const withPictures = await measure(page);

    // Every picture fails: the art, the posters, the films. Boxes are reserved, so nothing moves.
    await page.route(/\.(webp|jpg|jpeg|png|avif|webm)(\?|$)|\/_next\/image/, (route) => route.abort());
    await page.reload();
    await expect(page.locator(query ? "#finder-picks" : "#finder-question")).toBeVisible();
    await settle(page);
    const without = await measure(page);
    expect(without.sections, query).toEqual(withPictures.sections);
    expect(without.height, query).toBe(withPictures.height);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // The answers and the picks still say what they are, and can still be pressed.
    if (query) await expect(page.locator("#finder-row [data-make]").first()).toBeVisible();
    else await expect(page.getByRole("button", { name: "My girlfriend", exact: true })).toBeVisible();
  }
});

test("at the system's largest type and at 200% zoom nothing is cut off or pushed off the page", async ({ page }) => {
  // A laptop zoomed to 200% lays the page out at half its width; larger type is a larger root size.
  await page.setViewportSize({ width: 720, height: 450 });
  for (const query of ["", "?for=girlfriend&occasion=anniversary"]) {
    await page.goto(`/es/gifts/finder${query}`);
    await page.addStyleTag({ content: "html { font-size: 125% !important; }" });
    await settle(page);
    const m = await measure(page);
    expect(m.overflow, query).toBeLessThanOrEqual(0);
    expect(m.overlaps, query).toEqual([]);
    // No answer's words are cut by its card.
    const cut = await page.locator("[data-answer]").evaluateAll((cards) => cards.filter((card) => { const words = card.querySelector("span:last-child")!; return words.scrollHeight > card.clientHeight + 1 || words.scrollWidth > words.clientWidth + 1; }).map((card) => card.textContent));
    expect(cut, query).toEqual([]);
  }
});

test("an iPhone in Safari: the first question on one screen, the picks one card at a time, and nothing off the side", async ({ baseURL }) => {
  test.setTimeout(120_000);
  const browser = await webkit.launch();
  try {
    const origin = new URL(baseURL ?? "http://localhost:3000").origin;
    const context = await browser.newContext({ ...devices["iPhone 13"], baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    const page = await context.newPage();
    await page.goto("/gifts/finder");
    await expect(page.locator("#finder-question")).toBeVisible();
    const first = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, below: [...document.querySelectorAll("[data-answer]")].filter((el) => el.getBoundingClientRect().bottom > innerHeight).length }));
    expect(first.overflow).toBeLessThanOrEqual(0);
    expect(first.below).toBe(0);
    await page.getByRole("button", { name: "My girlfriend", exact: true }).tap();
    await expect(page.getByRole("heading", { level: 2, name: "What's the occasion?" })).toBeVisible();
    await page.getByRole("button", { name: "Anniversary", exact: true }).tap();
    await expect(page.locator("#finder-row > li")).toHaveCount(3);
    const m = await page.evaluate(() => {
      const cards = [...document.querySelectorAll("#finder-row > li")].map((card) => card.getBoundingClientRect());
      return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, onScreen: cards.filter((r) => r.left >= 0 && r.right <= innerWidth).length, heading: document.querySelector("#finder-picks")!.getBoundingClientRect().top };
    });
    expect(m.overflow).toBeLessThanOrEqual(0);
    expect(m.onScreen).toBe(1);
    // The new heading is on the screen, under the header.
    expect(m.heading).toBeGreaterThanOrEqual(0);
    expect(m.heading).toBeLessThan(devices["iPhone 13"].viewport.height);
    // Every pick's picture arrived, and the way into the editor is there without hovering.
    await expect.poll(() => page.locator("#finder-row > li").first().locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(page.locator("#finder-row [data-make]").first()).toBeVisible();
    await context.close();
  } finally {
    await browser.close();
  }
});
