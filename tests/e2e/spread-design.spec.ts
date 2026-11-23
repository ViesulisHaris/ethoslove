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

/**
 * A row of cards on a phone shows one card at a time, and a poster is lazy: the browser asks for it when its card
 * comes onto the screen (measured 22 Nov 2026: at 375px, with nothing swiped, one poster of eight is ever asked for).
 * So "every card has its picture" is read the way a visitor meets the cards: each row is swiped to its end, a card
 * at a time, and put back. Read without the swipe it passed or failed by what the browser happened to have fetched
 * at the width before, on one page in fourteen.
 */
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
        // On a phone the row is swiped through first: a poster is asked for when its card comes on screen. And waited
        // for, not read once: a poster asked for at a new width is made by the dev server's image optimizer the first time.
        await swipeThrough(page);
        await expect
          .poll(async () => (await cardSets(page)).flatMap((set) => set.cards).filter((card) => !card.picture).map((card) => card.title), { message: `${width}: cards with no picture`, timeout: 20_000 })
          .toEqual([]);
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
      // No paragraph of an idea is on show any more: under the gallery, no block of text runs past thirty words until something is opened.
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

test("on the smallest phone the hero's button is on the first screen, in both languages", async ({ page }) => {
  // Fourteen pages are opened one after another: on a busy machine that outran thirty seconds with nothing wrong on any of them.
  test.slow();
  // 320×568: the tags, the heading (four rows at its longest), the italic line, the sentence, and still the button.
  await page.setViewportSize({ width: 320, height: 568 });
  for (const prefix of ["", "/es"])
    for (const path of HERO_PAGES) {
      await page.goto(`${prefix}${path}`);
      const button = page.locator("[data-page-theme] > div > section").first().locator("a").first();
      const box = (await button.boundingBox())!;
      expect(box.y + box.height, `${prefix}${path}: the button ends at ${Math.round(box.y + box.height)}`).toBeLessThanOrEqual(568);
      expect(box.height).toBeGreaterThanOrEqual(44);
      // The tags over the heading are the gift page's small capitals.
      const tag = page.locator("[data-page-theme] h1").first().locator("xpath=preceding-sibling::div/span").first();
      if ((await tag.count()) > 0) expect(await tag.evaluate((el) => `${getComputedStyle(el).textTransform} ${getComputedStyle(el).fontSize}`)).toBe("uppercase 12px");
    }
});

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
  await first.locator("summary").first().click();
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
  await second.locator("summary").first().click();
  await expect(second.locator("[data-line]")).toBeVisible();
  await expect(first.locator("[data-line]")).toBeHidden();
  // By keyboard: the card's title is the thing focused, Enter opens and closes it, and the focus ring is drawn.
  const third = cards.nth(2);
  await third.locator("summary").first().focus();
  await page.keyboard.press("Enter");
  await expect(third.locator("[data-line]")).toBeVisible();
  expect(await third.locator("summary").first().evaluate((el) => el.matches(":focus-visible") && getComputedStyle(el).outlineStyle !== "none")).toBe(true);
  // Then what the card holds, in the order it is read: "Copy" beside the line to borrow, then the way into the editor.
  await page.keyboard.press("Tab");
  await expect(third.getByTestId("idea-copy")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(third.getByTestId("idea-make")).toBeFocused();
  await third.locator("summary").first().focus();
  await page.keyboard.press("Enter");
  await expect(third.locator("[data-line]")).toBeHidden();
});

test("an occasion's cards show a sample in handwriting under its field's name, where the list records the field", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/occasions/mothers-day");
  await settle(page);
  const bouquet = page.locator('[data-cards] [data-card]:has(a[href="/create/bouquet"])');
  await bouquet.locator("summary").first().click();
  // The card in the bouquet: its editor's own name for the field, and the sample that fits its thirty characters.
  await expect(bouquet.locator("[data-line]")).toHaveText("From the one who picked yours");
  await expect(bouquet.getByText("The little card", { exact: true })).toBeVisible();
  await expect(bouquet.getByTestId("idea-make")).toHaveAttribute("href", "/create/bouquet");
  // The four older lists show one too (Christmas had none): the first sample that goes in a field…
  await page.goto("/occasions/christmas");
  await settle(page);
  const globe = page.locator('[data-cards] [data-card]:has(a[href="/create/snow-globe"])');
  await globe.locator("summary").first().click();
  await expect(globe.getByTestId("idea-make")).toBeVisible();
  await expect(globe.locator("[data-line]")).toHaveText("January: we said this would be the year");
  // …or the one the list marks as the card's: the news on the last scratch card, not the caption before it.
  const scratch = page.locator('[data-cards] [data-card]:has(a[href="/create/scratch-card"])');
  await scratch.locator("summary").first().click();
  await expect(scratch.locator("[data-line]")).toHaveText("We got the house");
  // Most of the twelve cards have a line to borrow, and no card opens onto a slogan or two words.
  const lines = await page.locator("[data-cards] [data-card]").evaluateAll((cards) => cards.map((card) => ({ line: card.querySelector("details > div > p")?.textContent ?? "", hand: card.querySelector("[data-line]")?.textContent ?? "" })));
  expect(lines).toHaveLength(12);
  expect(lines.filter((card) => card.hand).length).toBeGreaterThanOrEqual(10);
  for (const card of lines) expect(card.line.trim().split(/\s+/).length, card.line).toBeGreaterThanOrEqual(6);
});

test("the idea in full is in the HTML, closed inside its card, and opens there", async ({ page, request }) => {
  // Four of these lists are live and found by search today. What each idea said in a paragraph is no longer printed,
  // and it has not left the page: a closed row inside the card holds it, as the owner's rule for longer words asks.
  for (const [path, phrase] of [
    ["/occasions/birthday", "Their age in foil balloons, their name in cut-out letters and ten animals in party hats"],
    ["/gifts/last-minute", "Five hundred characters is room for one specific memory and one promise."],
    ["/digital-cards", "Choose this kind when the message is the gift and everything else should stay out of its way."],
    // Spanish last: a visit to /es leaves the language cookie, and an English address after it is answered in Spanish.
    ["/es/occasions/christmas", "Va envuelto en papel de periódico y cordel, con su nombre en la etiqueta"],
  ] as const) {
    const html = (await (await request.get(path)).text()).replace(/&#x27;|&#39;/g, "'");
    const rows = [...html.matchAll(/<details data-idea-full[\s\S]*?<\/details>/g)].map((m) => m[0].replace(/<[^>]+>/g, ""));
    expect(rows.length, path).toBeGreaterThanOrEqual(5);
    expect(rows.some((row) => row.includes(phrase)), `${path}: “${phrase}”`).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/occasions/birthday");
  await settle(page);
  const card = page.locator('[data-cards] [data-card]:has(a[href="/create/party-animals"])');
  const full = card.locator("details[data-idea-full]");
  // Closed with the card, closed when the card opens, and open only when asked for.
  await expect(full.locator("p")).toBeHidden();
  await card.locator("summary").first().click();
  await expect(full.locator("summary")).toBeVisible();
  await expect(full.locator("summary")).toHaveText("The idea in full");
  await expect(full.locator("p")).toBeHidden();
  const closed = await measure(page);
  expect(closed.count).toBeLessThanOrEqual(300);
  expect(closed.small).toEqual([]);
  await full.locator("summary").first().click();
  await expect(full.locator("p")).toBeVisible();
  await expect(full.locator("p")).toContainText("At the bottom they blow out the candles into the phone.");
  // By keyboard too: the row is a summary of its own, focused after the card's two links.
  await full.locator("summary").first().focus();
  await page.keyboard.press("Enter");
  await expect(full.locator("p")).toBeHidden();
});

test("what a card says alone is true: no card but The Letter's says free, and a Letter with a clip in it is not tagged", async ({ page }) => {
  // Whatever the build's free-note switch says: these are the card's own words.
  for (const path of ["/occasions/birthday", "/occasions/anniversary", "/occasions/valentines", "/es/occasions/birthday", "/es/occasions/anniversary", "/es/occasions/valentines"]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", path.startsWith("/es") ? "es" : "en");
    const sky = page.locator(`[data-cards] [data-card]:has(a[href$="/create/constellations"])`);
    await expect(sky).toHaveCount(1);
    // Its label, its title, its line and its idea in full: none says free.
    expect(((await sky.textContent()) ?? "").toLowerCase(), path).not.toMatch(/\b(free|gratis|gratuita)\b/);
  }
  // The video page's Letter needs "Make it special" for its clip, so its card carries no "Free"; the last-minute note is the free one.
  // (The Spanish pages above left the language cookie: without it gone, these English addresses are answered in Spanish.)
  await page.context().clearCookies();
  await page.goto("/gifts/video-message");
  const withClip = page.locator('[data-cards] [data-card]:has(a[href^="/create/the-letter"])');
  await expect(withClip.locator("summary").first()).toContainText("The Letter");
  await expect(withClip.locator("summary").first()).not.toContainText("Free");
  await page.goto("/gifts/last-minute");
  await expect(page.locator('[data-cards] [data-card]:has(a[href^="/create/the-letter"]) summary').first()).toContainText("The Letter · Free");
  await page.goto("/es/gifts/anniversary-website");
  await expect(page.locator('[data-cards] [data-card]:has(a[href*="/create/the-letter"]) summary').first()).not.toContainText("Gratis");
});

test("a card opened at the foot of the screen shows what it holds, without a scroll", async ({ page }) => {
  // The site's scroll-reveal hid anything marked data-reveal until it was well inside the screen, and a card's opened
  // part carries that mark for its own fade: opened with its title at the bottom edge, it stayed at opacity 0.
  test.slow();
  for (const reduced of [false, true]) {
    await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/gifts/last-minute");
    await settle(page);
    const card = page.locator("[data-cards] [data-card]").first();
    const summary = card.locator("summary").first();
    // The card's title ends thirty pixels above the bottom edge.
    await summary.evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().bottom - (window.innerHeight - 30)));
    await summary.click();
    const opened = card.locator("details > div[data-reveal]");
    expect(await opened.evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThan(812 - 60);
    await expect.poll(async () => opened.evaluate((el) => getComputedStyle(el).opacity), { timeout: 3000 }).toBe("1");
    expect(await opened.evaluate((el) => el.classList.contains("is-in"))).toBe(false);
    // The same for a question's answer, on these pages and on a gift's own page.
    const row = page.locator("#kind-questions").locator("xpath=ancestor::section").locator("details").first();
    await row.locator("summary").first().evaluate((el) => window.scrollBy(0, el.getBoundingClientRect().bottom - (window.innerHeight - 10)));
    await row.locator("summary").first().click();
    await expect.poll(async () => row.locator("[data-reveal]").evaluate((el) => getComputedStyle(el).opacity), { timeout: 3000 }).toBe("1");
  }
  // And what is not inside a <details> still rises into view as the page is scrolled: the fix is only for what opens.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/games");
  // Nothing is hidden until the observer has run (it arms the CSS by a class on <html>): on a slow first load that is
  // seconds after the page is there, and what is below was read as shown before it had been hidden.
  await expect(page.locator("html")).toHaveClass(/reveal-ready/, { timeout: 30_000 });
  const below = page.locator("[data-reveal]:not(details *)").last();
  await expect(below).toHaveCSS("opacity", "0");
  await below.scrollIntoViewIfNeeded();
  await expect(below).toHaveCSS("opacity", "1");
});

test("on a desk the heading stays beside a long list of cards, and a row of cards ends on one line", async ({ page }) => {
  // Several pages, each a first compile under a dev server: on a busy machine this ran past 30s (23 Nov 2026).
  test.slow();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/occasions/christmas");
  await settle(page);
  const heading = page.locator("#ideas-christmas");
  const rows = page.locator("#idea-cards-christmas");
  // Scrolled to the third row of cards: the left column is not empty, the heading is still on the screen, clear of the header.
  await rows.locator("[data-card]").nth(7).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 200));
  await expect(heading).toBeInViewport({ ratio: 1 });
  const top = await heading.evaluate((el) => el.getBoundingClientRect().top);
  const header = await page.locator("header").first().evaluate((el) => el.getBoundingClientRect().bottom);
  expect(top).toBeGreaterThan(header);
  // It stops with its section: at the questions below, it has scrolled away with the cards.
  await page.locator("#guide-christmas").scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, 300));
  await expect(heading).not.toBeInViewport();
  // No flower under the words where the heading now rests, at the top and part-way down.
  await rows.locator("[data-card]").nth(4).scrollIntoViewIfNeeded();
  expect((await measure(page)).overlaps).toEqual([]);
  // Cards in one row are one height closed, whatever the length of their titles (a three-line title beside a one-line one).
  for (const path of ["/gifts/last-minute", "/occasions/christmas", "/es/occasions/birthday"]) {
    await page.goto(path);
    await settle(page);
    const boxes = await page.locator("[data-cards]").first().locator("[data-card]").evaluateAll((cards) => cards.map((card) => ({ top: Math.round(card.getBoundingClientRect().top), bottom: Math.round(card.getBoundingClientRect().bottom) })));
    const byRow = new Map<number, number[]>();
    for (const box of boxes) byRow.set(box.top, [...(byRow.get(box.top) ?? []), box.bottom]);
    expect(byRow.size, path).toBeGreaterThanOrEqual(3);
    // Titles of different lengths stand in these rows: the test has something to hold level.
    expect(new Set(await page.locator("[data-cards]").first().locator("[data-card] h3").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)))).size, path).toBeGreaterThanOrEqual(2);
    for (const [rowTop, bottoms] of byRow) expect(Math.max(...bottoms) - Math.min(...bottoms), `${path}: the row at ${rowTop}`).toBeLessThanOrEqual(1);
  }
  // While a card is open the open one grows alone: its neighbours are not stretched down beside it, and none of them
  // loses a pixel either. A closed card fell back to its own title's height the moment a neighbour opened, so a card
  // nobody touched moved: 388px to 363px for The Letter's on /digital-cards (the test of 23 Nov 2026).
  const cards = page.locator("[data-cards]").first().locator("[data-card]");
  const heights = () => cards.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  for (const [path, opened] of [["/digital-cards", 2], ["/es/gifts/photo-album", 1], ["/occasions/christmas", 4]] as const) {
    await page.context().clearCookies();
    await page.goto(path);
    await settle(page);
    const before = await heights();
    // Titles of one line and of two stand in these rows, or the test holds nothing.
    expect(new Set(await cards.locator("h3").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)))).size, path).toBeGreaterThanOrEqual(2);
    await cards.nth(opened).locator("summary").first().click();
    await expect(cards.nth(opened).getByTestId("idea-make")).toBeVisible();
    const during = await heights();
    expect(during[opened], path).toBeGreaterThan(before[opened] + 100);
    expect(during.filter((_, i) => i !== opened), `${path}: closed cards while card ${opened} is open`).toEqual(before.filter((_, i) => i !== opened));
    // Another card opened in its place: the first is back at its closed height, and the rest have still not moved.
    const other = 0;
    await cards.nth(other).locator("summary").first().click();
    await expect(cards.nth(other).getByTestId("idea-make")).toBeVisible();
    expect((await heights()).filter((_, i) => i !== other), `${path}: closed cards while card ${other} is open`).toEqual(before.filter((_, i) => i !== other));
    // By keyboard as by pointer: closed with Enter, every card is as it was and nothing is left held.
    await cards.nth(other).locator("summary").first().focus();
    await page.keyboard.press("Enter");
    await expect(cards.nth(other).getByTestId("idea-make")).toBeHidden();
    expect(await heights(), `${path}: closed again`).toEqual(before);
    // (The browser tells the page a card has closed a moment after it has: the hold is let go then.)
    await expect.poll(() => page.locator("[data-cards] summary[style*='min-height']").count(), { message: `${path}: heights still held with every card closed` }).toBe(0);
  }
  // Open while the screen changes width: the cards are levelled again for the new rows, not left at the old row's height.
  await cards.nth(0).locator("summary").first().click();
  await expect(cards.nth(0).getByTestId("idea-make")).toBeVisible();
  await page.setViewportSize({ width: 1100, height: 800 });
  await expect.poll(async () => new Set((await heights()).slice(2, 4)).size).toBe(1);
  const narrow = await heights();
  await cards.nth(0).locator("summary").first().click();
  await expect(cards.nth(0).getByTestId("idea-make")).toBeHidden();
  expect((await heights()).slice(1), "closed cards at 1100px").toEqual(narrow.slice(1));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/occasions/christmas");
  await settle(page);
  // And the plus of a card that is taller than its own words is still in the card's corner.
  const gaps = await cards.evaluateAll((els) => els.map((card) => card.getBoundingClientRect().bottom - card.querySelector("summary > svg")!.getBoundingClientRect().bottom));
  for (const gap of gaps) expect(gap).toBeLessThan(40);
  // On a tablet the column is one, and nothing sticks.
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/occasions/christmas");
  expect(await page.locator("#ideas-christmas").evaluate((el) => getComputedStyle(el.closest("div.lg\\:sticky")!).position)).toBe("static");
});

test("a card's picture is asked for at the size it is drawn, and its links are named by what they say", async ({ page }) => {
  for (const [width, path] of [[1024, "/occasions/christmas"], [1280, "/gifts/last-minute"], [768, "/digital-cards"], [1440, "/digital-cards"]] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(path);
    const pictures = await page.locator("[data-cards]").first().locator("[data-card] summary img").evaluateAll((imgs) => imgs.map((img) => ({ drawn: img.getBoundingClientRect().width, sizes: (img as HTMLImageElement).sizes })));
    expect(pictures.length).toBeGreaterThanOrEqual(5);
    for (const picture of pictures) {
      // What `sizes` tells the browser the picture's width is, at this screen: within a third of what is drawn (it said 45vw, twice a card, at 1024px).
      const slot = picture.sizes.split(",").map((part) => part.trim()).find((part) => { const media = part.match(/^\(min-width: (\d+)px\)/); return !media || width >= Number(media[1]); })!.replace(/^\([^)]*\)\s*/, "");
      const told = slot.endsWith("vw") ? (parseFloat(slot) / 100) * width : parseFloat(slot);
      expect(told / picture.drawn, `${path} at ${width}: told ${Math.round(told)}px, drawn ${Math.round(picture.drawn)}px`).toBeLessThan(1.34);
      expect(told / picture.drawn, `${path} at ${width}: told ${Math.round(told)}px, drawn ${Math.round(picture.drawn)}px`).toBeGreaterThan(0.75);
    }
  }
  // "Watch it" is named by its own words, then the gift: what is on the button is in its name (WCAG 2.5.3).
  for (const [path, label] of [["/gifts/last-minute", "Watch it"], ["/es/gifts/last-minute", "Verlo"], ["/digital-cards", "Watch it"], ["/es/digital-cards", "Verla"], ["/occasions/apology", "Watch it"]] as const) {
    // Each address in its own language: a Spanish page leaves a cookie that would answer the next English one in Spanish.
    await page.context().clearCookies();
    await page.goto(path);
    const watches = await page.getByTestId("idea-watch").evaluateAll((links) => links.map((a) => ({ name: a.getAttribute("aria-label") ?? "", text: (a.textContent ?? "").trim() })));
    expect(watches.length).toBeGreaterThanOrEqual(5);
    for (const watch of watches) {
      expect(watch.text, path).toBe(label);
      expect(watch.name.startsWith(`${label}: `), `${path}: “${watch.name}”`).toBe(true);
    }
    // The picture's alt says what the poster shows; the gift's name is the next thing read, and is not said twice.
    const cards = await page.locator("[data-cards] [data-card]").evaluateAll((els) => els.map((el) => ({ alt: el.querySelector("img")?.getAttribute("alt") ?? "", name: (el.querySelector("summary > span:nth-of-type(2)")?.textContent ?? "").split("·")[0].trim() })));
    for (const card of cards) {
      expect(card.alt.length, path).toBeGreaterThan(8);
      expect(card.alt.startsWith(`${card.name}:`), `${path}: “${card.alt}”`).toBe(false);
    }
  }
});

test("the hero says which gift its button makes, each page opens on a gift of its own, and the heading reads as two phrases", async ({ page }) => {
  // Several pages, each a first compile under a dev server: on a busy machine this ran past 30s (23 Nov 2026).
  test.slow();
  await page.setViewportSize({ width: 1440, height: 900 });
  const covers = new Map<string, string>();
  for (const path of HERO_PAGES) {
    await page.goto(path);
    const cover = (await page.locator("[data-flatlay=hero] [data-cover] img").getAttribute("src")) ?? "";
    const poster = decodeURIComponent(cover).match(/templates\/([a-z-]+)\//)?.[1] ?? cover;
    // No two of the seven pages have the same first screen: /digital-cards and the last-minute page both opened on The Letter.
    expect(covers.has(poster), `${path} opens on the same gift as ${covers.get(poster)}: ${poster}`).toBe(false);
    covers.set(poster, path);
    if (path.startsWith("/gifts/")) {
      const href = (await page.getByTestId("hero-make").getAttribute("href")) ?? "";
      expect(href, path).toContain(`/create/${poster}?ref=`);
      await expect(page.getByTestId("hero-make")).toHaveText(/^Make [A-Z]/);
      // The band over the three how-tos has this page's own heading.
      await expect(page.locator("#kind-guide")).not.toHaveText("How to make it land");
    }
  }
  expect(covers.get("birthday-cinema")).toBe("/gifts/video-message");
  await page.goto("/gifts/video-message");
  await expect(page.locator("[data-cards] [data-card]").first().getByTestId("idea-make")).toHaveAttribute("href", "/create/birthday-cinema?ref=gifts-video-message");
  // Two blocks to the eye, two phrases to whatever reads the heading's text.
  await page.goto("/digital-cards");
  expect(await page.locator("h1").evaluate((el) => el.textContent)).toBe("Digital cards by Tryethos A card that opens on their phone");
  // A gift's own page has the same heading of two blocks (the phrase people search for, then the gift's name), and the same space.
  await page.goto("/templates/the-letter");
  const giftHeading = (await page.locator("h1").evaluate((el) => el.textContent)) ?? "";
  expect(giftHeading.endsWith(" The Letter"), giftHeading).toBe(true);
  expect(giftHeading.trim()).not.toBe("The Letter");
  await page.goto("/digital-cards");
  // The five kinds are headed "The five kinds of card": no card's title says "Cards" again.
  const titles = await page.locator("[data-kinds] [data-card] h3").allTextContents();
  expect(titles).toEqual(["Open like a letter", "Built from your photos", "With a game in them", "For a date on the calendar", "For someone far away"]);
});

// The rule is 300 words a page (DESIGN-LESS-TEXT.md). Under the gallery an occasion page keeps it; with the gallery
// above it does not (anniversary 1,086, just-because 1,070, birthday 817 at 1440×900, the review of 22 Nov 2026),
// and the test above measures only what this build laid out. The gallery is the live one, shared with /templates
// and redrawn to the owner's own mock-up on another branch (growth/home), so whether an occasion page keeps it,
// and in what shape, is the owner's to decide. Until then this stands here, not passing, so the gap is not hidden.
test.fixme("an occasion page, its gallery included, is within 300 words", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ["/occasions/birthday", "/occasions/anniversary", "/occasions/christmas", "/occasions/mothers-day"]) {
    await page.goto(path);
    await settle(page);
    expect((await measure(page, "main")).count, path).toBeLessThanOrEqual(300);
  }
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
  // The line under the button names the gift and what it costs to send, in the page's currency.
  await expect(page.getByTestId("hero-note")).toHaveText(/^In the phone: Scrapbook, [€$£]\d+\.\d{2} once\. Tap it to play\.$/);
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
    await card.locator("summary").first().scrollIntoViewIfNeeded();
    await card.locator("summary").first().tap();
    await expect(card.locator("[data-line]")).toBeVisible();
    await expect(card.getByTestId("idea-make")).toBeVisible();
    const box = (await card.getByTestId("idea-make").boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    // The same on an occasion page, under its gallery. In this WebKit that page never reports "load" (see above), and no
    // picture could be taken of it by the tester (23 Nov 2026): what a finger does there is held here. The quiet link
    // at the top goes to the ideas, the card showing opens under a tap, and its way into the editor is under a thumb.
    await page.goto("/occasions/mothers-day", { waitUntil: "domcontentloaded" });
    await page.getByTestId("to-ideas").tap();
    const heading = page.locator("#ideas-mothers-day");
    await expect(heading).toBeInViewport({ ratio: 1 });
    const idea = page.locator("[data-cards] [data-card]").first();
    await idea.locator("summary").first().scrollIntoViewIfNeeded();
    await idea.locator("summary").first().tap();
    await expect(idea.getByTestId("idea-make")).toBeVisible();
    await expect(idea.locator("[data-line]")).toBeVisible();
    expect((await idea.getByTestId("idea-make").boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // Opening the next closes it: one card of a set at a time, in Safari's engine too.
    await page.locator("[data-cards]").first().evaluate((row) => row.scrollBy({ left: row.clientWidth, behavior: "instant" }));
    const next = page.locator("[data-cards] [data-card]").nth(1);
    await next.locator("summary").first().tap();
    await expect(next.getByTestId("idea-make")).toBeVisible();
    await expect(idea.getByTestId("idea-make")).toBeHidden();
    expect(thrown).toEqual([]);
  } finally {
    await browser.close();
  }
});

// ---- The test of 23 Nov 2026 (reports/pages-test.md): what it found between a tablet and a small laptop, on a phone
// ---- turned on its side, in the pictures the seven pages share, and at the top of an occasion page.

test("between a tablet and a small laptop the idea cards stay two across, and three only where a card is wide enough to read", async ({ page }) => {
  // Three across began at 1024px: cards of 197px, a Spanish title on five rows and an opened card 1,269px tall.
  for (const [width, across, least] of [[768, 2, 300], [1024, 2, 290], [1100, 2, 320], [1151, 2, 340], [1152, 3, 236], [1280, 3, 236], [1440, 3, 236]] as const) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/es/gifts/last-minute");
    const boxes = await page.locator("[data-cards]").first().locator("[data-card]").evaluateAll((cards) => cards.map((card) => ({ top: Math.round(card.getBoundingClientRect().top), width: card.getBoundingClientRect().width, rows: Math.round(card.querySelector("h3")!.getBoundingClientRect().height / parseFloat(getComputedStyle(card.querySelector("h3")!).lineHeight)) })));
    expect(boxes.filter((box) => box.top === boxes[0].top).length, `${width}: cards in the first row`).toBe(across);
    for (const box of boxes) {
      expect(box.width, `${width}: a card's width`).toBeGreaterThanOrEqual(least);
      // No title on more than four rows, in the longer language.
      expect(box.rows, `${width}: rows of a title`).toBeLessThanOrEqual(4);
    }
  }
});

test("the five kinds never leave a row with an empty place: the short row is centred under the full one", async ({ page }) => {
  for (const [width, rows] of [[700, [2, 2, 1]], [768, [3, 2]], [1024, [3, 2]], [1100, [3, 2]], [1280, [5]]] as const) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/digital-cards");
    const boxes = await page.locator("[data-kinds] [data-card]").evaluateAll((cards) => cards.map((card) => ({ top: Math.round(card.getBoundingClientRect().top), left: card.getBoundingClientRect().left, right: card.getBoundingClientRect().right, width: Math.round(card.getBoundingClientRect().width) })));
    const tops = [...new Set(boxes.map((box) => box.top))];
    expect(tops.map((top) => boxes.filter((box) => box.top === top).length), `${width}: cards a row`).toEqual(rows);
    // Every card is one width, and each row sits in the middle of the first: as much room on its left as on its right.
    expect(new Set(boxes.map((box) => box.width)).size, `${width}: card widths`).toBe(1);
    const first = boxes.filter((box) => box.top === tops[0]);
    const [edgeLeft, edgeRight] = [first[0].left, first.at(-1)!.right];
    for (const top of tops) {
      const row = boxes.filter((box) => box.top === top);
      expect(Math.abs(row[0].left - edgeLeft - (edgeRight - row.at(-1)!.right)), `${width}: the row at ${top} is off centre`).toBeLessThanOrEqual(1);
    }
  }
});

test("on a phone turned on its side the hero's button is on the first screen, and a card's picture and title share one", async ({ page }) => {
  test.slow();
  // 812×375 and the shorter 667×375: the button began at the fold, and a card's poster alone was 455px tall.
  for (const [width, height] of [[812, 375], [667, 375]] as const) {
    await page.setViewportSize({ width, height });
    for (const prefix of ["", "/es"])
      for (const path of HERO_PAGES) {
        await page.context().clearCookies();
        await page.goto(`${prefix}${path}`);
        const button = page.locator("[data-page-theme] > div > section").first().locator("a").first();
        const box = (await button.boundingBox())!;
        expect(box.y + box.height, `${width}×${height} ${prefix}${path}: the button ends at ${Math.round(box.y + box.height)}`).toBeLessThanOrEqual(height);
        expect(box.height).toBeGreaterThanOrEqual(44);
        // The heading is still the page's largest words.
        expect(await page.locator("h1 > span").last().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(26);
      }
  }
  await page.setViewportSize({ width: 812, height: 375 });
  await page.goto("/gifts/last-minute");
  await settle(page);
  const m = await measure(page);
  expect(m.overflow).toBeLessThanOrEqual(0);
  expect(m.overlaps).toEqual([]);
  expect(m.smallest).toBeGreaterThanOrEqual(14);
  const cards = await page.locator("[data-cards]").first().locator("[data-card]").evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  for (const card of cards) expect(card, "a closed card on a 375px-tall screen").toBeLessThanOrEqual(375);
  // A tablet and a laptop keep the tall poster: the squarer crop is only for a screen that short.
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/gifts/last-minute");
  const tall = await page.locator("[data-cards] [data-card] summary > span").first().evaluate((el) => el.getBoundingClientRect().height / el.getBoundingClientRect().width);
  expect(tall).toBeGreaterThan(1.2);
});

test("each of the seven pages has a photo of its own on the band's phone, and the cake page shows the cake", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const photos = new Map<string, string>();
  for (const path of HERO_PAGES) {
    await page.goto(path);
    const picture = page.locator("[data-flatlay=experience] img[src*='demo']");
    await picture.scrollIntoViewIfNeeded();
    await expect.poll(async () => picture.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { message: `${path}: the band's photo`, timeout: 20_000 }).toBe(true);
    const photo = decodeURIComponent((await picture.getAttribute("src")) ?? "").match(/\/demo\/photos\/(p\d)\.webp/)?.[1] ?? "";
    expect(photo, path).not.toBe("");
    expect(photos.has(photo), `${path} has the same photo as ${photos.get(photo)}: ${photo}`).toBe(false);
    photos.set(photo, path);
  }
  expect(photos.get("p3")).toBe("/gifts/virtual-birthday-cake");
  // On /digital-cards the first step's polaroid and the band's are two photos, not one twice.
  await page.goto("/digital-cards");
  const shown = await page.locator("img[src*='demo']").evaluateAll((imgs) => imgs.map((img) => decodeURIComponent(img.getAttribute("src") ?? "").match(/\/demo\/photos\/(p\d)\.webp/)?.[1]).filter(Boolean));
  expect(shown.length).toBeGreaterThanOrEqual(2);
  expect(new Set(shown).size).toBe(shown.length);
});

test("a page by kind names the price of the gift its button makes, the one that gift's own page gives", async ({ page }) => {
  // Several pages, each a first compile under a dev server: on a busy machine this ran past 30s (23 Nov 2026).
  test.slow();
  await page.setViewportSize({ width: 1440, height: 900 });
  // What one card costs in this visitor's currency, as /digital-cards prints it from the catalogue.
  await page.goto("/digital-cards");
  const one = (await page.getByTestId("card-prices").locator("[data-price]").first().innerText()).trim();
  expect(one).toMatch(/^[€$£]\d+\.\d{2}$/);
  for (const kind of KINDS) {
    await page.goto(`/gifts/${kind}`);
    const note = (await page.getByTestId("hero-note").innerText()).trim();
    // Every page leads with a paid gift today: the line carries one card's price. A page that led with the free note would say so.
    expect(note, kind).toMatch(/^In the phone: .+, [€$£]\d+\.\d{2} once\. Tap it to play\.$/);
    expect(note, kind).toContain(`, ${one} once.`);
    // It is the gift the button opens.
    const name = ((await page.getByTestId("hero-make").innerText()) ?? "").replace(/^Make /, "").trim();
    expect(note, kind).toContain(`In the phone: ${name},`);
  }
  await page.goto("/es/gifts/photo-album");
  await expect(page.getByTestId("hero-note")).toHaveText(/^En el móvil: Álbum de recortes, \d+,\d{2}\s€ una vez\. Tócalo para verlo\.$/);
});

test("“See full pricing” lands on the cards' prices, not on the dates membership", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const prefix of ["", "/es"]) {
    await page.goto(`${prefix}/digital-cards`);
    const link = page.getByTestId("full-pricing");
    await expect(link).toHaveAttribute("href", `${prefix}/pricing#gifts`);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${prefix}/pricing#gifts$`), { timeout: 60_000 });
    // The single gifts' own section is what is on the screen: its heading, at the top.
    const section = page.locator("section#gifts");
    await expect(section.getByRole("heading").first()).toBeInViewport({ timeout: 30_000 });
    await expect.poll(async () => section.evaluate((el) => Math.round(el.getBoundingClientRect().top)), { message: `${prefix}/pricing#gifts: the section's top`, timeout: 15_000 }).toBeLessThan(450);
    expect(await section.evaluate((el) => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
  }
});

test("a Text Thread's card shows the first bubbles of the conversation, one to a row", async ({ page }) => {
  // "Dad." alone, in handwriting, was the whole line to borrow.
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [path, rows] of [
    ["/occasions/fathers-day", ["Dad.", "I know you’d answer this with a thumbs up."]],
    ["/occasions/long-distance", ["You’re asleep.", "I walked past the place with the bad coffee and missed you anyway."]],
    // Spanish last: a visit to /es leaves the language cookie.
    ["/es/occasions/apology", ["Dijiste que no podías más.", "Yo entendí “me da igual”. Querías decir “estoy sin fuerzas”."]],
  ] as const) {
    await page.goto(path);
    const card = page.locator('[data-cards] [data-card]:has(a[href$="/create/text-thread"])');
    await card.locator("summary").first().click();
    await expect(card.locator("[data-line]")).toBeVisible();
    expect(await card.locator("[data-line] > span").allInnerTexts(), path).toEqual(rows);
    // Each bubble is a row of its own, the second below the first, and the two are a card's sixteen words at most.
    const tops = await card.locator("[data-line] > span").evaluateAll((spans) => spans.map((span) => span.getBoundingClientRect().top));
    expect(tops[1]).toBeGreaterThan(tops[0]);
    expect(rows.join(" ").split(/\s+/).length).toBeLessThanOrEqual(16);
  }
});

for (const [width, height] of [[375, 812], [1440, 900]] as const) {
  test(`an occasion page says at its top that its ideas are below, and goes to them (${width}×${height})`, async ({ page }) => {
    // The ideas lie under the whole gallery: seven screens down on a phone for Christmas. Whether an occasion page keeps
    // two grids is the owner's to decide (the fixme above); until then a visitor can at least reach what the title promised.
    await page.setViewportSize({ width, height });
    for (const path of ["/occasions/christmas", "/es/occasions/anniversary"]) {
      await page.goto(path);
      const link = page.getByTestId("to-ideas");
      // On the first screen, a thumb tall, and saying how many there are in the list's own words.
      await expect(link).toBeInViewport({ ratio: 1 });
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      const occasion = path.split("/").at(-1)!;
      const heading = page.locator(`#ideas-${occasion}`);
      expect((await link.innerText()).trim()).toBe((await heading.innerText()).replace(/\s+/g, " ").trim());
      await expect(heading).not.toBeInViewport();
      await link.click();
      await expect(heading).toBeInViewport({ ratio: 1 });
      // Clear of the floating header, and the first card with it.
      const top = await heading.evaluate((el) => el.getBoundingClientRect().top);
      const header = await page.locator("header").first().evaluate((el) => el.getBoundingClientRect().bottom);
      expect(top).toBeGreaterThan(header);
      await expect(page.locator("[data-cards] [data-card]").first()).toBeInViewport();
      // By keyboard too: it is a link like any other.
      await page.goto(path);
      await link.focus();
      await page.keyboard.press("Enter");
      await expect(heading).toBeInViewport({ ratio: 1 });
    }
    // An occasion with no list has no such link.
    await page.goto("/occasions/halloween");
    await expect(page.getByTestId("to-ideas")).toHaveCount(0);
  });
}

test("“Copy” puts a card's line to borrow on the clipboard, whole, and says so", async ({ page, context, browser, baseURL }) => {
  // The card shows a line and "Make this gift" opens an empty editor: on a phone the line had to be remembered.
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/gifts/last-minute");
  await settle(page);
  const card = page.locator("[data-cards] [data-card]").first();
  const copy = card.getByTestId("idea-copy");
  await expect(copy).toBeHidden();
  await card.locator("summary").first().click();
  await expect(copy).toBeVisible();
  await expect(copy).toHaveText("Copy");
  const box = (await copy.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  // It takes a label's room: the handwriting begins where it did, a few pixels under the field's name.
  const gap = await card.evaluate((el) => el.querySelector("[data-line]")!.getBoundingClientRect().top - el.querySelector("[data-line]")!.previousElementSibling!.querySelector("p")!.getBoundingClientRect().bottom);
  expect(gap).toBeLessThan(12);
  expect((await measure(page)).small).toEqual([]);
  await copy.click();
  await expect(copy).toHaveText("Copied");
  // The whole note, of which the card shows the first sentence: all of it fits the free note's 500 characters.
  const shown = (await card.locator("[data-line]").innerText()).trim();
  const taken = await page.evaluate(() => navigator.clipboard.readText());
  expect(taken.startsWith(shown), taken).toBe(true);
  expect(taken.length).toBeGreaterThan(shown.length);
  expect(taken.length).toBeLessThanOrEqual(500);
  // It goes back to "Copy" by itself, and works from the keyboard.
  await expect(copy).toHaveText("Copy", { timeout: 6000 });
  await card.locator("summary").first().focus();
  await page.keyboard.press("Tab");
  await expect(copy).toBeFocused();
  expect(await copy.evaluate((el) => el.matches(":focus-visible") && getComputedStyle(el).outlineStyle !== "none")).toBe(true);
  await page.keyboard.press("Enter");
  await expect(copy).toHaveText("Copied");
  // A thread's bubbles are copied one to a row, as the field takes them.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/occasions/fathers-day");
  const thread = page.locator('[data-cards] [data-card]:has(a[href$="/create/text-thread"])');
  await thread.locator("summary").first().click();
  await thread.getByTestId("idea-copy").click();
  await expect(thread.getByTestId("idea-copy")).toHaveText("Copied");
  // (Windows hands a clipboard's line ends back as CR LF.)
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n")).toBe("Dad.\nI know you’d answer this with a thumbs up.");
  // A card with no line to borrow has no button: the five kinds of /digital-cards.
  await page.goto("/digital-cards");
  await expect(page.locator("[data-kinds] [data-card]")).toHaveCount(5);
  await expect(page.getByTestId("idea-copy")).toHaveCount(0);
  // In Spanish it says so in Spanish.
  await page.goto("/es/gifts/last-minute");
  const carta = page.locator("[data-cards] [data-card]").first();
  await carta.locator("summary").first().click();
  await expect(carta.getByTestId("idea-copy")).toHaveText("Copiar");
  await carta.getByTestId("idea-copy").click();
  await expect(carta.getByTestId("idea-copy")).toHaveText("Copiada");
  // Without script the card still opens, and a button that could copy nothing is not shown.
  const plain = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 }, baseURL });
  try {
    const still = await plain.newPage();
    await still.goto("/gifts/last-minute");
    const first = still.locator("[data-cards] [data-card]").first();
    await first.locator("summary").first().click();
    await expect(first.getByTestId("idea-make")).toBeVisible();
    await expect(first.locator("[data-line]")).toBeVisible();
    await expect(first.getByTestId("idea-copy")).toBeHidden();
  } finally {
    await plain.close();
  }
});
