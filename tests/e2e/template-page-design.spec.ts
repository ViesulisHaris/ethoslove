import { devices, expect, test, webkit, type Page } from "@playwright/test";
import sharp from "sharp";
import { templateFilmStart } from "../../src/content/template-film-starts";
import { TEMPLATE_SLUGS } from "../../src/templates/manifests";
import { measure, settle } from "./page-measure";

/**
 * A gift's page as the owner's mock-up lays it out (docs/marketing/growth-build/
 * DESIGN-LESS-TEXT.md), held to "on no device will it break": at every size on the owner's list
 * the page does not scroll sideways, no flower lies over or under words, the words on it stay
 * within the budget, the first screen has a flower and a real picture, a thumb can hit what is
 * meant to be pressed, and the page is the same height whether or not its pictures arrive.
 * Screenshots someone looked at are the other half of the proof (shots/guides/v3-*.png).
 */
const PAGE = "/templates/the-letter";

/** The owner's list: phones, tablets, laptops and a wide desk; a phone on its side; a short laptop. */
const SIZES: [number, number][] = [
  [320, 568],
  [360, 740],
  [375, 812],
  [390, 844],
  [414, 896],
  // A 1440 px laptop zoomed to 200% lays the page out at this width.
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
  test(`${width}×${height}: no sideways scroll, no flower under words, words within the budget`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(PAGE);
    await settle(page);
    const m = await measure(page);
    expect(m.overflow, "the page scrolls sideways").toBeLessThanOrEqual(0);
    expect(m.overlaps, "a piece of the art lies under words").toEqual([]);
    // The check has something to check: the two phones on their flowers, the three steps, and what lies round them.
    expect(m.pieces).toBeGreaterThanOrEqual(6);
    // 300 words at most without opening anything, the header and the footer aside.
    expect(m.count).toBeLessThanOrEqual(300);
    expect(m.count).toBeGreaterThan(120);
    // And the six lines to borrow, in handwriting on their cards: fifty words between them at most.
    expect(m.hand).toBeGreaterThan(6);
    expect(m.hand).toBeLessThanOrEqual(50);
    // Sentences never under 14 px; the small mono labels over a heading are 12 px capitals.
    expect(m.smallest).toBeGreaterThanOrEqual(14);
    expect(m.smallestLabel).toBeGreaterThanOrEqual(12);
    // What is meant to be pressed is at least 44 px each way, for a thumb.
    expect(m.small).toEqual([]);
    // The first screen has the art in it, and the gift's own cover on the lying phone. Not on the
    // shortest screens (a 320×568 phone, a phone on its side), where the first screen is the name,
    // the buttons and the price, and the phone comes with the first flick.
    if (height >= 740 || width >= 1280) {
      expect(m.decorInView).toBeGreaterThanOrEqual(1);
      await expect(page.locator("[data-flatlay=hero]")).toBeInViewport();
    }
  });
}

/**
 * The layout is every template's. A long name, a long description, a page without a guide, a
 * premium one, each colourway of the art, and both languages: each on a desk, a laptop and a phone.
 */
const SOME = ["/templates/birthday-cinema", "/templates/scratch-card", "/templates/snow-globe", "/templates/vinyl", "/templates/coquette", "/templates/constellations", "/templates/gingerbread-house", "/templates/xoxo", "/es/templates/the-letter", "/es/templates/string-the-lights", "/es/templates/midnight-countdown"];
/**
 * Every gift's page in both languages, for a change to the shared layout or to the words in it:
 *
 *   ALL_GIFT_PAGES=1 PORT=3413 npx playwright test tests/e2e/template-page-design.spec.ts -g "holds the same layout" --project=desktop-chrome --workers=1
 *
 * (122 pages at four sizes, about a quarter of an hour.)
 */
const OTHERS = process.env.ALL_GIFT_PAGES === "1" ? [...TEMPLATE_SLUGS.map((slug) => `/templates/${slug}`), ...TEMPLATE_SLUGS.map((slug) => `/es/templates/${slug}`)] : SOME;

for (const path of OTHERS) {
  test(`${path} holds the same layout, on a desk and on a phone`, async ({ page }) => {
    for (const [width, height] of [[1440, 900], [1280, 800], [1024, 768], [375, 812]] as const) {
      await page.setViewportSize({ width, height });
      await page.goto(path);
      await settle(page);
      const m = await measure(page);
      expect(m.overflow, `${width}: the page scrolls sideways`).toBeLessThanOrEqual(0);
      expect(m.overlaps, `${width}: a piece of the art lies under words`).toEqual([]);
      expect(m.count, `${width}: words on the page`).toBeLessThanOrEqual(300);
      expect(m.hand, `${width}: words of handwriting on the idea cards`).toBeLessThanOrEqual(50);
      expect(m.smallest, `${width}`).toBeGreaterThanOrEqual(14);
      expect(m.small, `${width}: too small for a thumb`).toEqual([]);
    }
    // One h1, and the page says what it is to a search engine.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator('script[type="application/ld+json"]')).not.toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });
}

test("the footer's lily leans in beside the last column and lies under none of the footer's words", async ({ page }) => {
  for (const [width, height] of [[1024, 768], [1280, 800], [1440, 900], [1920, 1080]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(PAGE);
    await settle(page);
    const m = await measure(page, "[data-site-footer]");
    expect(m.pieces, `${width}: the lily is there`).toBe(1);
    expect(m.overlaps, `${width}`).toEqual([]);
  }
  // Not on a phone, where the footer is all links; and on no page that is not a gift's.
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(PAGE);
  await expect(page.locator("[data-footer-flower]")).toBeHidden();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/pricing");
  await expect(page.locator("[data-footer-flower]")).toBeHidden();
});

test("La carta's hero says the whole of its two sentences, not the first five words", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/es/templates/the-letter");
  const hero = page.locator("[data-page-theme] > section").first();
  await expect(hero.getByText("Toca para romper el sello. La carta sale del sobre", { exact: false })).toBeVisible();
});

test("the page is whole, and the same height, when no picture arrives", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PAGE);
  await settle(page);
  const withPictures = await measure(page);

  // Every picture fails: the art, the posters, the sample photo. Boxes are reserved, so nothing moves.
  await page.route(/\.(webp|jpg|jpeg|png|avif)(\?|$)|\/_next\/image/, (route) => route.abort());
  await page.reload();
  await settle(page);
  const without = await measure(page);
  expect(without.sections).toEqual(withPictures.sections);
  expect(without.height).toBe(withPictures.height);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Make this gift" })).toBeVisible();
});

/** Whether an element is drawn upright and unscaled: its box on the page is its own size. */
async function upright(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return Math.abs(r.width - (el as HTMLElement).offsetWidth) < 1 && Math.abs(r.height - (el as HTMLElement).offsetHeight) < 1;
  });
}

test("the cover lies in the phone's screen, and a tap picks the phone up to play the gift upright", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PAGE);
  const hero = page.locator("[data-flatlay=hero]");
  // At rest: the gift's cover laid into the lying phone by the render's matrix, so it is turned with it.
  const play = hero.getByRole("button", { name: /try the live demo/i });
  await expect(play).toBeVisible();
  expect(await play.evaluate((el) => new DOMMatrix(getComputedStyle(el.parentElement!).transform).b)).not.toBeCloseTo(0, 2);
  await play.click();
  await expect(hero.locator("[data-upright] [data-template=the-letter]")).toBeVisible({ timeout: 25000 });
  // Upright once it has come up: a gift reads where a finger is from an upright box.
  await expect.poll(() => upright(page, "[data-flatlay=hero] [data-upright] [data-template=the-letter]")).toBe(true);
  // And it plays: the seal breaks under a tap.
  await expect(page.getByText(/someone made this for you/i)).toBeHidden({ timeout: 20000 });
  await hero.getByRole("button", { name: /tap the seal/i }).click({ force: true });
  await expect(hero.getByText(/dear ana/i)).toBeVisible({ timeout: 10000 });
});

/** What the film in the lying phone is doing. */
async function film(page: Page) {
  return page.locator("[data-flatlay=hero] video").evaluate((v: HTMLVideoElement) => {
    const still = v.parentElement!.querySelector<HTMLImageElement>("img:last-of-type")!;
    const a = v.getBoundingClientRect();
    const b = still.getBoundingClientRect();
    return { src: v.getAttribute("src") ?? "", on: v.hasAttribute("data-on"), paused: v.paused, at: v.currentTime, opacity: Number(getComputedStyle(v).opacity), sameBox: Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1, stillShown: still.complete && still.naturalWidth > 0 };
  });
}

test("the gift's film plays in the lying phone while it is on screen, and moves nothing", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const films: string[] = [];
  page.on("request", (request) => void (request.url().endsWith("preview.webm") && films.push(request.url())));
  await page.goto(PAGE);
  await settle(page);
  const hero = page.locator("[data-flatlay=hero]");
  const box = async () => JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("[data-flatlay=hero], [data-flatlay=hero] video, h1, section[aria-labelledby=template-how]")].map((el) => { const r = el.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)]; })));
  const before = await box();
  // It is this gift's own film, laid where the cover is, turned with the phone, and shown once it is really playing.
  await expect(hero.locator("video[data-on]")).toHaveCount(1, { timeout: 20000 });
  const f = await film(page);
  expect(f.src).toBe("/templates/the-letter/preview.webm");
  expect(f.paused).toBe(false);
  expect(f.sameBox).toBe(true);
  expect(f.stillShown).toBe(true);
  await expect.poll(async () => (await film(page)).opacity).toBe(1);
  const t0 = f.at;
  await expect.poll(async () => (await film(page)).at).toBeGreaterThan(t0);
  expect(await hero.locator("video").evaluate((v: HTMLVideoElement) => [v.muted, v.playsInline, v.controls])).toEqual([true, true, false]);
  // The recording opens on the demo page's own bar ("All templates … Use this template"). The film
  // is first seen past it, and comes back to the same point when it has gone round, never to the bar.
  const from = templateFilmStart("the-letter");
  expect(from).toBeGreaterThan(1);
  expect(t0).toBeGreaterThanOrEqual(from);
  await hero.locator("video").evaluate((v: HTMLVideoElement) => void (v.currentTime = v.duration - 0.4));
  await expect.poll(async () => (await film(page)).at, { timeout: 10000 }).toBeLessThan(from + 2);
  const round = await film(page);
  expect(round.at).toBeGreaterThanOrEqual(from);
  expect(round.paused).toBe(false);
  expect(round.on).toBe(true);
  // Nothing on the page moved when it arrived.
  expect(await box()).toBe(before);
  // It stops when the phone has scrolled away, and picks up again when it is back.
  await page.locator("section[aria-labelledby=template-questions]").scrollIntoViewIfNeeded();
  await expect.poll(async () => (await film(page)).paused).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(async () => (await film(page)).paused).toBe(false);
  // One film, asked for once; and a tap still goes through it to the button under it.
  expect(new Set(films).size).toBe(1);
  await hero.getByRole("button", { name: /try the live demo/i }).click();
  await expect(hero.locator("[data-upright]")).toBeVisible();
  await expect.poll(async () => (await film(page)).paused).toBe(true);
});

test("no film for someone who asked for less motion or less data, or on a slow connection: the still cover is the whole of it", async ({ browser, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const storageState = { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] };
  // "slow": a film is 0.4 to 2 MB, and the browser itself says the connection is under 4g (the review of 21 Nov 2026).
  for (const kind of ["motion", "data", "slow"] as const) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, baseURL, storageState, reducedMotion: kind === "motion" ? "reduce" : "no-preference" });
    if (kind === "data") await context.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } }));
    if (kind === "slow") await context.addInitScript(() => Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: false, effectiveType: "3g" } }));
    const page = await context.newPage();
    const films: string[] = [];
    page.on("request", (request) => void (/\.(webm|mp4)$/.test(new URL(request.url()).pathname) && films.push(request.url())));
    await page.goto(PAGE);
    await settle(page);
    await page.waitForTimeout(1500);
    const f = await film(page);
    expect(f.src, kind).toBe("");
    expect(f.on, kind).toBe(false);
    expect(f.opacity, kind).toBe(0);
    expect(f.stillShown, kind).toBe(true);
    expect(films, kind).toEqual([]);
    // And no pause button for a film that is not there.
    await expect(page.locator("[data-film-toggle]"), kind).toHaveCount(0);
    await context.close();
  }
});

test("the film starts on the gift's own screen, never on the cover that says “turn your sound on”", async ({ page }) => {
  // Every recording opens on the demo page's bar and then the cover every gift opens on, for two
  // dark seconds. In the hero the film is silent, so that was a play button over "turn your sound on".
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const slug of ["passport", "coquette"]) {
    await page.goto(`/templates/${slug}`);
    const video = page.locator("[data-flatlay=hero] video");
    await expect(page.locator("[data-flatlay=hero] video[data-on]")).toHaveCount(1, { timeout: 20000 });
    const from = templateFilmStart(slug);
    expect(from, slug).toBeGreaterThanOrEqual(2);
    expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime), slug).toBeGreaterThanOrEqual(from);
  }
});

test("the film can be stopped and started again, and stays stopped when the phone scrolls back", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PAGE);
  const hero = page.locator("[data-flatlay=hero]");
  // No button until there is a film to stop.
  await expect(hero.locator("video[data-on]")).toHaveCount(1, { timeout: 20000 });
  const toggle = hero.locator("[data-film-toggle]");
  await expect(toggle).toHaveAccessibleName(/pause the preview/i);
  const box = (await toggle.boundingBox())!;
  expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
  // It is beside the phone, not on its screen: what is under its middle is the button itself, and a tap on it must not start the demo.
  expect(await toggle.evaluate((el) => { const r = el.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return el.contains(top) && !top!.closest("[data-play]"); })).toBe(true);
  await toggle.click();
  await expect(hero.locator("[data-upright]")).toHaveCount(0);
  await expect.poll(async () => (await film(page)).paused).toBe(true);
  await expect(toggle).toHaveAccessibleName(/play the preview/i);
  // Stopped by the visitor, it stays stopped: off the screen and back does not start it.
  await page.locator("section[aria-labelledby=template-questions]").scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);
  expect((await film(page)).paused).toBe(true);
  // By keyboard too.
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await film(page)).paused).toBe(false);
  await expect(toggle).toHaveAccessibleName(/pause the preview/i);
});

test("by keyboard: the play button shows its focus, the picked-up phone takes it, and it can be put down again", async ({ page }) => {
  // The review of 21 Nov 2026: the button's ring was cut off by the phone's screen, pressing it
  // disabled it and dropped the focus on the page's body, and nothing could put the phone down.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PAGE);
  const hero = page.locator("[data-flatlay=hero]");
  const play = hero.locator("[data-play]");
  await expect(play).toBeVisible();
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press("Tab");
    if (await play.evaluate((el) => el === document.activeElement)) break;
  }
  await expect(play).toBeFocused();
  // The ring is drawn inside the screen, round the play disc, where nothing cuts it off.
  expect(await play.evaluate((el) => el.matches(":focus-visible"))).toBe(true);
  const ring = await hero.locator("[data-play-disc]").evaluate((el) => {
    const disc = el.getBoundingClientRect();
    const screen = el.closest("[data-play]")!.parentElement!.getBoundingClientRect();
    return { shadow: getComputedStyle(el).boxShadow, inside: disc.left - 8 > screen.left && disc.right + 8 < screen.right && disc.top - 8 > screen.top && disc.bottom + 8 < screen.bottom };
  });
  expect(ring.shadow).toMatch(/0px 0px 0px 6px/);
  expect(ring.inside).toBe(true);

  await page.keyboard.press("Enter");
  const up = hero.locator("[data-upright]");
  await expect(up).toBeVisible();
  // The focus went up with the phone, to something with a name.
  await expect(up).toBeFocused();
  await expect(up).toHaveAccessibleName(/the letter, the live demo/i);
  // The lying phone is only a picture now: not disabled, and out of the tab order.
  expect(await play.evaluate((el) => [(el as HTMLButtonElement).disabled, el.closest("[inert]") !== null])).toEqual([false, true]);
  // The next tab stop is inside the gift or its close button, never the button underneath.
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.closest("[data-upright]") !== null)).toBe(true);

  // The close button puts the phone down and hands the focus back.
  const close = up.getByRole("button", { name: /close the demo/i });
  const box = (await close.boundingBox())!;
  expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(up).toHaveCount(0);
  await expect(play).toBeFocused();
  expect(await play.evaluate((el) => el.closest("[inert]") === null)).toBe(true);

  // And Escape does the same.
  await page.keyboard.press("Enter");
  await expect(up).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(up).toHaveCount(0);
  await expect(play).toBeFocused();
});

test("every card of “What to write” shows its line to borrow, with nothing to press", async ({ page }) => {
  // The owner, 22 Nov 2026, on a closed card being a title in an empty box: "Yes, show it".
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(size);
    await page.goto(PAGE);
    const section = page.locator("section[aria-labelledby=template-guide]");
    const cards = section.locator("[data-card]");
    await expect(cards).toHaveCount(6);
    await expect(section.locator("details, summary, button")).toHaveCount(0);
    const shown = await cards.evaluateAll((all) =>
      all.map((card) => {
        const line = card.querySelector<HTMLElement>("[data-line]")!;
        const box = card.getBoundingClientRect();
        const at = line.getBoundingClientRect();
        const heart = card.querySelector("svg")!.getBoundingClientRect();
        return {
          words: (line.textContent ?? "").trim().split(/\s+/).length,
          hand: getComputedStyle(line).fontFamily !== getComputedStyle(card.querySelector("h3")!).fontFamily,
          inside: at.width > 0 && at.height > 0 && at.left >= box.left && at.right <= box.right + 0.5 && at.bottom <= box.bottom + 0.5,
          // The heart never sits on the handwriting.
          clear: heart.top >= at.bottom || heart.left >= at.right || heart.bottom <= at.top,
        };
      }),
    );
    for (const [i, card] of shown.entries()) {
      expect(card.words, `${size.width}: card ${i + 1} has a line`).toBeGreaterThan(1);
      expect(card, `${size.width}: card ${i + 1}`).toMatchObject({ hand: true, inside: true, clear: true });
    }
    // The cards of a row end together: no card is left short beside a taller one.
    const rows = await cards.evaluateAll((all) => {
      const byTop = new Map<number, number[]>();
      for (const card of all) {
        const r = card.getBoundingClientRect();
        byTop.set(Math.round(r.top), [...(byTop.get(Math.round(r.top)) ?? []), Math.round(r.height)]);
      }
      return [...byTop.values()];
    });
    for (const row of rows) expect(Math.max(...row) - Math.min(...row), `${size.width}: a row's cards`).toBeLessThanOrEqual(1);
    // On a phone the six are one row, one card to a screen: stacked they were a screen and a half of boxes, and seeing
    // all six at once was what made it "clustered" (the owner, 22 Nov 2026). Dots under the row say there are six.
    const row = await section.locator(`#ideas-the-letter`).evaluate(async (list) => {
      const cards = [...list.querySelectorAll<HTMLElement>("[data-card]")];
      const at = (i: number) => cards[i].getBoundingClientRect();
      const first = { left: Math.round(at(0).left), right: Math.round(at(0).right) };
      const next = Math.round(at(1).left);
      const dots = () => [...document.querySelectorAll<HTMLElement>("[data-dots] > span")].map((dot) => (dot.offsetParent === null ? "-" : dot.dataset.on === undefined ? "o" : "x")).join("");
      const before = dots();
      const heading = Math.round(document.querySelector("#template-guide")!.getBoundingClientRect().left);
      list.scrollLeft = list.scrollWidth;
      await new Promise((done) => setTimeout(done, 400));
      return { swipes: list.scrollWidth > list.clientWidth + 1, first, next, before, after: dots(), heading, lastRight: Math.round(at(5).right), width: innerWidth, page: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    if (size.width < 640) {
      expect(rows, `${size.width}: one row`).toHaveLength(1);
      expect(row.swipes, `${size.width}: the row swipes`).toBe(true);
      // One card fills the row, from the heading's margin to the same margin on the right; the next is wholly off the screen.
      expect(row.first.left, `${size.width}`).toBe(row.heading);
      expect(row.width - row.first.right, `${size.width}: the card's right margin`).toBe(row.heading);
      expect(row.next, `${size.width}: the next card is off the screen`).toBeGreaterThanOrEqual(row.width);
      // The dots follow the row: the first is lit, and at the end of the row the sixth.
      expect(row.before, `${size.width}`).toBe("xooooo");
      expect(row.after, `${size.width}`).toBe("ooooox");
      expect(row.width - row.lastRight, `${size.width}: the last card's margin`).toBe(row.heading);
    } else {
      expect(rows, `${size.width}: two rows of three`).toHaveLength(2);
      expect(row.swipes, `${size.width}: a grid has nothing to swipe`).toBe(false);
      expect(row.before, `${size.width}: no dots over a grid`).toBe("------");
    }
    // The row moves; the page never does.
    expect(row.page, `${size.width}: the page scrolls sideways`).toBeLessThanOrEqual(0);
  }
});

test("Passport's page shows the route its demo flies, on its step card and nowhere a place in Spain", async ({ page }) => {
  // Its cover and film said Berlin to Madrid, and its first step card quoted a nationality line.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/templates/passport");
  const first = page.locator("section[aria-labelledby=template-how] li").first();
  await expect(first).toContainText(/set both cities/i);
  await expect(first.locator("[data-flatlay=step]")).toHaveText("Berlin → Riga");
  // A step about a choice shows the choice as the editor names it.
  await page.goto("/templates/bloom");
  await expect(page.locator("section[aria-labelledby=template-how] li").first().locator("[data-flatlay=step]")).toHaveText(/^(Peony|Tulip|Daisy)$/);
  // The Spanish pages last: a visit to one is remembered, and the next page would come in Spanish.
  for (const path of ["/templates/passport", "/templates/picnic", "/templates/halfway", "/es/templates/passport", "/es/templates/halfway"]) {
    await page.goto(path);
    const text = await page.locator("[data-page-theme]").evaluate((el) => el.textContent ?? "");
    expect(text, path).not.toMatch(/\b(spain|españa|madrid|barcelona|sevilla|seville|valencia|málaga|bilbao|mallorca|ibiza|retiro|las palmas)\b/i);
  }
});

test("“The experience” is about the gift beside it, and “More like this” differs from gift to gift", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const read = async (path: string) => {
    await page.goto(path);
    const checks = await page.locator("section[aria-labelledby=template-experience] li").allTextContents();
    const more = await page.locator("section[aria-labelledby=template-more] li a").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    const heading = await page.locator("#template-more").textContent();
    const how = await page.locator("section[aria-labelledby=template-how] p").nth(1).textContent();
    return { checks, more, heading, how };
  };
  const halfway = await read("/templates/halfway");
  const globe = await read("/templates/snow-globe");
  // Three checks each: what they do and what it asks of their phone differ between two gifts
  // (both hold one to eight photos), and none is one of the three every page used to have.
  expect(halfway.checks).toHaveLength(3);
  expect(globe.checks).toHaveLength(3);
  expect(halfway.checks.join(" ")).toMatch(/blow/i);
  expect(globe.checks.join(" ")).toMatch(/shake/i);
  expect(halfway.checks[0]).not.toBe(globe.checks[0]);
  expect(halfway.checks[2]).not.toBe(globe.checks[2]);
  // The third does not say the first over again: "blow" once, "shake" in one check's own words only.
  expect(halfway.checks[2]).not.toMatch(/blow/i);
  expect(globe.checks[2]).toMatch(/a tap does it too/i);
  expect([...halfway.checks, ...globe.checks].join(" ")).not.toMatch(/any phone or laptop|QR code|after sending/i);
  // Nothing opens "Three steps." any more.
  expect(`${halfway.how} ${globe.how} ${halfway.checks.join(" ")}`).not.toMatch(/three steps/i);
  // Four gifts each, for the day the page's gift is first made for, named in the heading.
  expect(halfway.more).toHaveLength(4);
  expect(halfway.heading).toMatch(/long distance/i);
  expect(globe.heading).toMatch(/christmas/i);
  const letter = await read("/templates/the-letter");
  const sky = await read("/templates/constellations");
  // A gift that asks nothing of their phone names something of its own to choose, by the editor's names:
  // "Carries the song you choose" was the third check on 50 of the 61 pages.
  expect(letter.checks[2]).toBe("Paper: Cream, White or Kraft");
  expect(sky.checks[2]).toBe("Sky: Midnight, Aurora or Dawn");
  expect(letter.more).toHaveLength(4);
  expect(letter.more).not.toEqual(sky.more);
  expect(letter.more).not.toContain("/templates/the-letter");
});

/**
 * The live site runs with the free Letter as a short note (NEXT_PUBLIC_FREE_NOTE_SHARE=1) and “a note
 * with photos” offered to everyone (NEXT_PUBLIC_LETTER_KEEP_SHARE=1). A worktree has no env file, so
 * every run here used to see the page as it is with both off, and the page live visitors get was
 * never opened by a test: under “Free” it listed 20 photos, captions and a video clip, which the
 * free note does not have (the review of 21 Nov 2026). Run the suite with both set to see this:
 *
 *   NEXT_PUBLIC_FREE_NOTE_SHARE=1 NEXT_PUBLIC_LETTER_KEEP_SHARE=1 PORT=3413 npx playwright test tests/e2e/template-page-design.spec.ts --workers=1
 *
 * (stop any dev server on the port first: the switches are read when the server builds a page).
 */
const NOTE_FOR_EVERYONE = process.env.NEXT_PUBLIC_FREE_NOTE_SHARE === "1";

test("The Letter's page never lists under “Free” what the free note does not have", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const [path, special, included, chars] of [
    ["/templates/the-letter", /with “make it special”/i, /what.s included/i, /the free note holds 500 characters/i],
    ["/es/templates/the-letter", /con «hazlo especial»/i, /qué incluye/i, /la nota gratis admite 500 caracteres/i],
  ] as const) {
    await page.goto(path);
    const hero = page.locator("[data-page-theme] > section").first();
    const list = hero.locator("ul").last();
    await expect(list).toContainText(/20/);
    const heading = hero.getByRole("heading", { level: 2 });
    const experience = page.locator("section[aria-labelledby=template-experience]");
    const rows = (await list.locator("li").allTextContents()).join(" | ");
    if (NOTE_FOR_EVERYONE) {
      // The list of photos, captions and a video is what “Make it special” adds, and says so.
      await expect(heading).toHaveText(special);
      await expect(hero).not.toContainText(included);
      // And only what it adds: the free note has its song, its countdown and its hidden P.S., and all
      // three stood under this heading as if they cost the unlock's price (the test of 21 Nov 2026).
      expect(rows, path).not.toMatch(/music|countdown|surprise|música|cuenta atrás|sorpresa/i);
      expect(rows, path).toMatch(/4[.,]000/);
      expect(rows, path).toMatch(/voice message|mensaje de voz/i);
      await expect(list.locator("li")).toHaveCount(5);
      // The page's own fourth question says the same of the free note.
      await expect(page.locator("section[aria-labelledby=template-questions]")).toContainText(/a song, a countdown and a hidden P\.S\.|una canción, una cuenta atrás y una posdata escondida/);
      // Nor does the sentence beside the phone promise photos dropping in.
      await expect(hero).not.toContainText(/photos drop in|fotos caen/i);
      await expect(hero).toContainText(/handwriting|escritas a mano/i);
      // The band beside the picture promises no photos either, and gives the note's own length.
      await expect(experience).toContainText(chars);
      await expect(experience).not.toContainText(/photo|foto/i);
      // The first card is something 500 characters can do.
      await expect(page.locator("[data-more-about]")).not.toContainText(/a year to a paragraph|un párrafo por año/i);
    } else {
      await expect(heading).toHaveText(included);
      await expect(experience).toContainText(/20/);
      // Under “What's included” the song, the countdown and the surprise belong: they come with it.
      expect(rows, path).toMatch(/music|música/i);
      await expect(list.locator("li")).toHaveCount(6);
    }
  }
  if (NOTE_FOR_EVERYONE) {
    // Constellations has no free version then: it is sold, its photos come with it, and its list is plain (in the language the last page left).
    await page.goto("/templates/constellations");
    await expect(page.locator("[data-page-theme] > section").first().getByRole("heading", { level: 2 })).toHaveText(/what.s included|qué incluye/i);
  }
});

/**
 * How the cover and the film sit in the lying phone's screen: the box they are drawn in against the
 * screen's, in the screen's own unturned pixels, and how much of the recording that box shows.
 */
async function coverFit(page: Page) {
  return page.locator("[data-flatlay=hero] [data-cover]").evaluate((cover: HTMLElement) => {
    const screen = cover.closest("[data-play]") as HTMLElement;
    const video = cover.querySelector("video");
    const still = cover.querySelector("img")!;
    // The share of a 13:20 recording's width that a box shows when the picture is fitted into it by `fit`.
    const shown = (el: HTMLElement) => {
      const fit = getComputedStyle(el).objectFit;
      const box = el.offsetWidth / el.offsetHeight;
      return fit === "cover" ? Math.min(1, box / (13 / 20)) : 1;
    };
    return {
      screen: [screen.offsetWidth, screen.offsetHeight],
      cover: [cover.offsetWidth, cover.offsetHeight, cover.offsetLeft],
      stillShown: shown(still),
      filmShown: video ? shown(video) : 1,
      filmBox: video ? [video.offsetWidth, video.offsetHeight] : null,
      playing: video?.hasAttribute("data-on") ?? false,
      soft: screen.querySelectorAll("[data-soft] img").length,
      wash: screen.querySelector("[data-soft] canvas")?.hasAttribute("data-on") ?? false,
    };
  });
}

test("the lying phone shows the whole of a gift's cover and film: nothing is cut off its sides", async ({ page }) => {
  // The test of 21 Nov 2026: the screen is 6:13 and the recordings 13:20, and filling the screen cut
  // a seventh off each side. Constellations' caption read "lo signal. No plans. Just star", Fireside
  // lost the first word of its title in the film and in the still, and a dozen gifts had words cut
  // mid-word in the first and largest picture of their page. These are the gifts it named, at a
  // desk's size and a phone's; the unit test holds every recording to the shape this relies on.
  for (const [width, height] of [[1440, 900], [375, 812]] as const) {
    await page.setViewportSize({ width, height });
    for (const slug of ["constellations", "fireside", "digicam", "front-page", "coquette", "evergreen"]) {
      await page.goto(`/templates/${slug}`);
      await page.locator("[data-flatlay=hero]").scrollIntoViewIfNeeded();
      const still = await coverFit(page);
      // The picture is as wide as the screen and no wider, in the recordings' own shape, in the screen's middle.
      expect(still.cover[0], `${slug} ${width}`).toBe(still.screen[0]);
      expect(still.cover[2], `${slug} ${width}`).toBe(0);
      expect(still.cover[0] / still.cover[1], `${slug} ${width}`).toBeCloseTo(13 / 20, 2);
      expect(still.cover[1], `${slug} ${width}`).toBeLessThan(still.screen[1]);
      expect(still.stillShown, `${slug} ${width}: the still cover is cut`).toBe(1);
      // What is left of the taller screen is a soft copy of the same cover: itself, and turned over above and below.
      expect(still.soft, `${slug} ${width}`).toBe(3);
      // And the film, once it plays, is laid in the same box and is whole too, over a wash of its own frame.
      await expect(page.locator("[data-flatlay=hero] video[data-on]"), `${slug} ${width}`).toHaveCount(1, { timeout: 25000 });
      const film = await coverFit(page);
      expect(film.filmBox, `${slug} ${width}`).toEqual([film.cover[0], film.cover[1]]);
      expect(film.filmShown, `${slug} ${width}: the film is cut`).toBe(1);
      await expect.poll(async () => (await coverFit(page)).wash, { message: `${slug} ${width}: the wash follows the film` }).toBe(true);
    }
  }
});

test("a step's note card can be read on a phone: its handwriting is never under 12 px", async ({ page }) => {
  // It was an eighth of the card's width, which on a phone is 8 px: "Berlin → Riga" was a scribble (the test of 21 Nov 2026).
  for (const [width, path] of [[375, "/templates/passport"], [320, "/templates/passport"], [320, "/templates/birthday-cinema"], [375, "/es/templates/the-council"]] as const) {
    await page.setViewportSize({ width, height: 812 });
    await page.goto(path);
    const notes = await page.locator("[data-note-line]").evaluateAll((lines) =>
      lines.map((line) => {
        const card = line.parentElement!;
        const range = document.createRange();
        range.selectNodeContents(line);
        const rects = [...range.getClientRects()];
        const picture = line.closest("[data-flatlay=step]")!.getBoundingClientRect();
        const title = line.closest("li")!.querySelector("h3")!.getBoundingClientRect();
        return { size: parseFloat(getComputedStyle(line).fontSize), fits: Math.max(...rects.map((r) => r.bottom)) - Math.min(...rects.map((r) => r.top)) <= card.offsetHeight + 1 && line.scrollWidth <= card.offsetWidth + 1, clear: picture.right <= title.left };
      }),
    );
    expect(notes.length, path).toBeGreaterThan(0);
    for (const note of notes) {
      expect(note.size, `${path} ${width}`).toBeGreaterThanOrEqual(12);
      // The whole line is on the card, and the wider picture stops short of the step's title.
      expect(note.fits, `${path} ${width}: the line runs off its card`).toBe(true);
      expect(note.clear, `${path} ${width}: the picture meets the title`).toBe(true);
    }
  }
  // On a desk the card is larger and the line is the eighth of its width it always was.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/templates/passport");
  expect(await page.locator("[data-note-line]").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(13.5);
});

test("the picked-up phone fits a short screen under the header, and a tap beside it puts it down", async ({ page }) => {
  // A 1366×768 laptop with its browser bars, and a short one: the gift's foot, where most keep their
  // first button, was under the fold, and scrolled down the close button sat level with the header.
  for (const [width, height] of [[1366, 650], [1280, 620], [375, 812]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/templates/snow-globe");
    const hero = page.locator("[data-flatlay=hero]");
    await hero.locator("[data-play]").click();
    const up = hero.locator("[data-upright]");
    await expect(up).toBeVisible();
    // Once it has come up and the page has moved to show it: all of it between the header and the screen's foot.
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const phone = document.querySelector("[data-upright]")!.getBoundingClientRect();
            const close = document.querySelector("[data-close-demo]")!.getBoundingClientRect();
            const header = parseFloat(getComputedStyle(document.querySelector("[data-upright]")!).getPropertyValue("--header-h"));
            return close.top >= header && phone.top >= header && phone.bottom <= innerHeight;
          }),
        { message: `${width}×${height}: the phone is not whole on the screen`, timeout: 8000 },
      )
      .toBe(true);
    // Never so small that the gift can't be played.
    expect((await up.boundingBox())!.width, `${width}×${height}`).toBeGreaterThanOrEqual(200);
  }
  // A tap inside the gift plays it; a tap on the page beside it puts the phone down and hands the focus back.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/templates/snow-globe");
  const hero = page.locator("[data-flatlay=hero]");
  await hero.locator("[data-play]").click();
  const up = hero.locator("[data-upright]");
  await expect(up.locator("[data-template=snow-globe]")).toBeVisible({ timeout: 25000 });
  await up.click({ position: { x: 100, y: 300 }, force: true });
  await expect(up).toHaveCount(1);
  // Not the header's: the language switch and the links are not "beside the phone".
  await page.locator(".site-header").click({ position: { x: 560, y: 20 }, force: true });
  await expect(up).toHaveCount(1);
  await page.locator("h1").click();
  await expect(up).toHaveCount(0);
  await expect(hero.locator("[data-play]")).toBeFocused();
  // And it comes up again.
  await hero.locator("[data-play]").click();
  await expect(up).toBeVisible();
});

test("a card of “What to write” is read, not pressed: the keyboard goes past the six of them", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/templates/snow-globe");
  const section = page.locator("section[aria-labelledby=template-guide]");
  await expect(section.locator("[data-card]")).toHaveCount(6);
  const stops = await section.evaluate((el) => [...el.querySelectorAll<HTMLElement>("*")].filter((node) => node.tabIndex >= 0).length);
  expect(stops).toBe(0);
  // And no card looks pressable.
  expect(await section.locator("[data-card]").first().evaluate((card) => getComputedStyle(card).cursor)).toBe("auto");
});

test("with motion turned down and the type turned up, nothing breaks", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  // The system's largest type: the page is set in rem, so this is what a 200% text size does to it.
  await page.addStyleTag({ content: "html { font-size: 200% !important }" });
  await settle(page);
  const m = await measure(page);
  expect(m.overflow).toBeLessThanOrEqual(0);
  expect(m.overlaps).toEqual([]);
  // Every card still shows its line, and a question still opens, at once.
  await expect(page.locator("section[aria-labelledby=template-guide] [data-line]:visible")).toHaveCount(6);
  const question = page.locator("section[aria-labelledby=template-questions] details").first();
  await question.locator("summary").click();
  await expect(question.locator("[data-reveal]")).toBeVisible();
});

test("each gift's page wears that gift's colours and flowers, and the footer follows", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const seen = new Set<string>();
  const flowers = new Set<string>();
  for (const slug of ["the-letter", "constellations", "coquette", "birthday-cinema"]) {
    await page.goto(`/templates/${slug}`);
    const look = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>("[data-page-theme]")!;
      return {
        ground: getComputedStyle(root).backgroundColor,
        body: getComputedStyle(document.body).backgroundColor,
        footer: getComputedStyle(document.querySelector("footer")!).backgroundColor,
        art: root.querySelector<HTMLImageElement>("[data-decor=hero-flatlay] img")!.currentSrc.split("/").pop()!,
      };
    });
    expect(look.body, slug).toBe(look.ground);
    expect(look.footer, slug).not.toBe(look.ground);
    seen.add(look.ground);
    flowers.add(look.art.replace(/-1x|\.webp/g, ""));
  }
  expect(seen.size).toBe(4);
  // Ivory, moonlight, blush and wine: each of the four colourways of the art.
  expect([...flowers].sort()).toEqual(["hero-flatlay-blush", "hero-flatlay-ivory", "hero-flatlay-moonlight", "hero-flatlay-wine"]);
  // And it leaves with the page: the homepage keeps the site's own paper.
  await page.goto("/templates/the-letter");
  const themed = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.goto("/");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(themed);
});

test("a phone's first screen is light: the lying phone, its rim and the gift's cover", async ({ browser, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const context = await browser.newContext({ ...devices["Pixel 7"], baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
  const page = await context.newPage();
  const fetched = new Map<string, number>();
  const films = new Map<string, number>();
  page.on("response", async (response) => {
    // The film in the lying phone comes in pieces; the last piece's Content-Range says how long the whole is.
    if (new URL(response.url()).pathname.endsWith(".webm")) films.set(response.url(), Number((response.headers()["content-range"] ?? "").split("/")[1] ?? response.headers()["content-length"] ?? 0));
    if (!(response.headers()["content-type"] ?? "").startsWith("image/")) return;
    fetched.set(response.url(), await response.body().then((b) => b.length, () => 0));
  });
  await page.goto(PAGE, { waitUntil: "networkidle" });
  // What is on the first screen, by where each picture is, and what each of those weighed on the wire.
  const onScreen = await page.evaluate(() => [...document.images].filter((img) => { const r = img.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; }).map((img) => img.currentSrc));
  const first = [...new Set(onScreen)].map((url) => ({ name: new URL(url).pathname.split("/").pop()!, bytes: fetched.get(url) ?? 0 }));
  const firstKb = Math.round(first.reduce((n, p) => n + p.bytes, 0) / 1024);
  const allKb = Math.round([...fetched.values()].reduce((n, b) => n + b, 0) / 1024);
  console.log(`a phone's first screen: ${firstKb} KB in ${first.length} pictures (${first.map((p) => `${p.name} ${Math.round(p.bytes / 1024)} KB`).join(", ")}); ${allKb} KB of pictures fetched before any scroll, the browser's own look-ahead for lazy ones included`);
  // The half-size picture and rim: the full-size pair was 250 KB of a phone's first screen (the confirming test of 22 Nov 2026).
  expect(first.map((p) => p.name).sort()).toEqual(["hero-flatlay-ivory-1x.webp", "hero-flatlay-ivory-bezel-1x.webp", "poster.jpg"]);
  // The film is not part of a phone's first screen: under two fifths of the lying phone is on it, so the film has not been asked for.
  expect([...films.keys()]).toEqual([]);
  expect(firstKb).toBeLessThan(200);
  // Lower down, a phone is given the half-size files where they are enough: the band's picture and the loose pieces.
  const names = [...fetched.keys()].map((url) => new URL(url).pathname.split("/").pop()!);
  expect(names).not.toContain("experience-flatlay-ivory.webp");
  expect(names).not.toContain("hero-flatlay-ivory.webp");
  expect(names).not.toContain("hero-flatlay-ivory-bezel.webp");
  expect(allKb).toBeLessThan(470);
  // One flick down and the phone is on screen: the film is asked for then, one file, this gift's own.
  await page.locator("[data-flatlay=hero] video").evaluate((v) => v.scrollIntoView({ block: "center" }));
  await expect(page.locator("[data-flatlay=hero] video[data-on]")).toHaveCount(1, { timeout: 20000 });
  console.log(`the film in the lying phone, asked for once the phone is on screen: ${[...films].map(([url, bytes]) => `${new URL(url).pathname} ${Math.round(bytes / 1024)} KB`).join(", ")}`);
  expect([...films.keys()].map((url) => new URL(url).pathname)).toEqual(["/templates/the-letter/preview.webm"]);
  await context.close();
});

/**
 * What the deep test of 21 Nov 2026 found on the picked-up phone and round it (reports/guides-deep.md,
 * D1 to D12). Each of these fails on the page as it was.
 */
test("while the phone is up the page says a gift is running, so the consent strip leaves the gift's foot alone", async ({ browser, baseURL }) => {
  // Every other test starts with the consent answer stored (playwright.config.ts), and a worktree
  // shows no strip at all without a pixel id, so nobody had seen it lying over the lower quarter of
  // the picked-up phone: the banner stands down only for `data-gift-running` on <html>. This one
  // starts as a new visitor does. The strip itself is checked where the server shows one (a server
  // started with any NEXT_PUBLIC_CLARITY_ID); what hides it is checked everywhere.
  const context = await browser.newContext({ viewport: { width: 390, height: 664 }, baseURL, storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto("/templates/scratch-card");
  expect(await page.evaluate(() => localStorage.getItem("ethos-consent"))).toBeNull();
  const running = () => page.evaluate(() => document.documentElement.dataset.giftRunning ?? null);
  const strip = page.getByRole("region", { name: "Cookies" });
  await page.waitForTimeout(1500);
  const shown = await strip.isVisible();
  console.log(`the consent strip ${shown ? "is shown by this server: checked against the picked-up phone" : "is not shown by this server (no pixel id): only its stand-down hook is checked"}`);
  expect(await running()).toBeNull();
  const hero = page.locator("[data-flatlay=hero]");
  const play = hero.locator("[data-play]");
  await play.scrollIntoViewIfNeeded();
  await play.click();
  const up = hero.locator("[data-upright]");
  await expect(up).toBeVisible();
  await expect.poll(running).toBe("true");
  if (shown) {
    await expect(strip).toBeHidden();
    // Nothing fixed to the screen lies over the phone: under its foot's middle is the phone itself.
    await expect.poll(() => page.evaluate(() => { const r = document.querySelector("[data-upright]")!.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, Math.min(r.bottom, innerHeight) - 30)?.closest("[data-upright]") !== null; })).toBe(true);
  }
  // Put down, the page is a page again and the strip comes back for an answer.
  await up.getByRole("button", { name: /close the demo/i }).click();
  await expect(up).toHaveCount(0);
  await expect.poll(running).toBeNull();
  if (shown) await expect(strip).toBeVisible();
  // Leaving the page with the phone up does not leave the mark behind for the next page.
  await play.click();
  await expect.poll(running).toBe("true");
  await page.locator('section[aria-labelledby="template-more"] a').first().evaluate((a: HTMLAnchorElement) => a.click());
  await page.waitForURL((url) => !url.pathname.endsWith("/scratch-card"));
  await expect.poll(running).toBeNull();
  await context.close();
});

test("Escape puts the phone down wherever the keyboard's focus has got to", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  // Past the close button, on the page behind: the handler used to be on the phone and never heard it.
  await page.goto("/templates/the-letter");
  const hero = page.locator("[data-flatlay=hero]");
  const play = hero.locator("[data-play]");
  const up = hero.locator("[data-upright]");
  await play.focus();
  await page.keyboard.press("Enter");
  await expect(up).toBeFocused();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(() => document.activeElement !== null && document.activeElement.closest("[data-upright]") === null && document.activeElement !== document.body)) break;
  }
  expect(await page.evaluate(() => document.activeElement?.closest("[data-upright]") === null)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(up).toHaveCount(0);
  await expect(play).toBeFocused();

  // A gift that takes away the button just pressed leaves the focus on <body>: Scratch Card's "scratch here".
  await page.goto("/templates/scratch-card");
  await play.focus();
  await page.keyboard.press("Enter");
  await expect(up.locator("[data-template=scratch-card]")).toBeVisible({ timeout: 25000 });
  const scratch = up.getByRole("button", { name: /scratch here/i });
  await expect(scratch).toBeVisible({ timeout: 15000 });
  await scratch.focus();
  await page.keyboard.press("Enter");
  await expect(scratch).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(up).toHaveCount(0);
  await expect(play).toBeFocused();
});

test("a gift whose code can't be fetched puts the phone back down, and the next tap tries again", async ({ browser, baseURL }) => {
  // No connection, or a page older than the last deploy: the picked-up phone was a black screen that
  // said `Unknown template “xoxo”.` in English on any page, and stayed that way once back online.
  const origin = new URL(baseURL!).origin;
  const context = await browser.newContext({ ...devices["Pixel 7"], baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
  const page = await context.newPage();
  // A gift no other test of this file has opened, so its code is not in this page yet.
  await page.goto("/templates/wishbone", { waitUntil: "networkidle" });
  const hero = page.locator("[data-flatlay=hero]");
  const play = hero.locator("[data-play]");
  const up = hero.locator("[data-upright]");
  await context.setOffline(true);
  await play.scrollIntoViewIfNeeded();
  const said: string[] = [];
  const watch = setInterval(() => void page.evaluate(() => document.querySelector("[data-upright]")?.textContent ?? "").then((text) => said.push(text), () => {}), 150);
  await play.tap();
  // Down again by itself, the cover and its button back, the page no longer "a gift running".
  await expect(up).toHaveCount(0, { timeout: 20000 });
  clearInterval(watch);
  expect(said.join(" ")).not.toMatch(/unknown template/i);
  await expect(play).toBeVisible();
  await expect(play).toHaveAccessibleName(/try the live demo/i);
  expect(await page.evaluate(() => document.documentElement.dataset.giftRunning ?? null)).toBeNull();
  // Back online, the same button plays the gift.
  await context.setOffline(false);
  await play.tap();
  await expect(up.locator("[data-template=wishbone]")).toBeVisible({ timeout: 30000 });
  await context.close();
});

test("The Letter's page in Portuguese is linked where a visitor sees it, and only from The Letter", async ({ page }) => {
  // It stood under the preview before the redesign, then became the last line of a closed block: in
  // the HTML and on nobody's screen (tests/e2e/about-and-pt.spec.ts failed on it in both projects).
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/templates/the-letter");
  const link = page.getByRole("link", { name: "Também em português: carta digital" });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("href", "/pt/carta-digital");
  await expect(link).toHaveAttribute("hreflang", "pt-BR");
  // One link, in the hero, under the price: not also inside the closed block.
  expect(await page.locator('[data-page-theme] a[href="/pt/carta-digital"]').count()).toBe(1);
  expect(await link.evaluate((a) => a.closest("details") === null && a.closest("section")?.querySelector("h1") !== null)).toBe(true);
  const box = (await link.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(await link.evaluate((a) => parseFloat(getComputedStyle(a).fontSize))).toBeGreaterThanOrEqual(14);
  await page.goto("/templates/xoxo");
  await expect(page.locator('[data-page-theme] a[href="/pt/carta-digital"]')).toHaveCount(0);
});

test("the days a gift is made for read as a sentence, not a double-spaced list, and each is still a thumb's target", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  // Scrapbook is made for four days: the sentence runs to two or three rows on a phone.
  await page.goto("/templates/scrapbook");
  const block = page.locator("details[data-more-about]");
  await block.locator("summary").click();
  const links = block.locator('a[href*="/occasions/"]');
  await expect(links.first()).toBeVisible();
  const m = await block.evaluate((el) => {
    el.querySelector('a[href*="/occasions/"]')!.scrollIntoView({ block: "center" });
    const all = [...el.querySelectorAll<HTMLAnchorElement>('a[href*="/occasions/"]')];
    const boxes = all.map((a) => a.getBoundingClientRect());
    const rows = [...new Set(boxes.map((b) => Math.round(b.top)))].sort((a, b) => a - b);
    // Where each word's own row is: the middle of its box, since the padding is the same above and below.
    const taken = all.map((a) => { const first = a.getClientRects()[0]; return document.elementFromPoint(first.left + 4, first.top + first.height / 2) === a; });
    return { count: all.length, rows, heights: boxes.map((b) => Math.round(b.height)), taken, listRow: parseFloat(getComputedStyle(el.querySelector("li")!).lineHeight) };
  });
  expect(m.count).toBeGreaterThanOrEqual(4);
  expect(m.rows.length).toBeGreaterThanOrEqual(2);
  // 44px apart was a sentence set double-spaced under a list set at 24.
  for (let i = 1; i < m.rows.length; i++) expect(m.rows[i] - m.rows[i - 1]).toBeLessThanOrEqual(34);
  for (const h of m.heights) expect(h).toBeGreaterThanOrEqual(44);
  // A tap on a day's own words opens that day, not the one on the row under it.
  expect(m.taken).toEqual(m.taken.map(() => true));
});

test("an iPhone-sharp phone still gets the half-size picture of “The experience”", async ({ browser, baseURL }) => {
  // Three device pixels to a pixel: "80vw" asked for 936 and was sent the 1800px file, twice the bytes.
  const origin = new URL(baseURL!).origin;
  for (const width of [390, 430]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    const page = await context.newPage();
    await page.goto(PAGE);
    const picture = page.locator("[data-decor=experience-flatlay] img");
    await picture.scrollIntoViewIfNeeded();
    await expect.poll(() => picture.evaluate((img: HTMLImageElement) => (img.complete && img.naturalWidth > 0 ? new URL(img.currentSrc).pathname.split("/").pop() : "")), { timeout: 15000 }).toBe("experience-flatlay-ivory-1x.webp");
    // And it is not drawn soft: the file itself (its own pixels, not what `sizes` makes of them) has
    // more than one and a half pixels for each CSS pixel the picture is drawn across.
    expect(await picture.evaluate(async (img: HTMLImageElement) => (await createImageBitmap(await (await fetch(img.currentSrc)).blob())).width / img.getBoundingClientRect().width)).toBeGreaterThan(1.5);
    await context.close();
  }
});

test("a phone is sent the half-size picture and rim of the hero's phone, and a desk the full ones", async ({ browser, baseURL }) => {
  // The hero's picture is drawn twice as wide as a phone's screen, so "190vw" had a phone with three
  // device pixels to a pixel ask for 2,223 and get the full-size picture and rim, 250 KB before
  // anything else on the page (the confirming test of 22 Nov 2026). The half-size pair is 100 KB.
  const origin = new URL(baseURL!).origin;
  const files = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLImageElement>("[data-flatlay=hero] img[srcset]")].map((img) => (img.complete && img.naturalWidth > 0 ? new URL(img.currentSrc).pathname.split("/").pop()! : "")));
  for (const [width, height, scale, mobile, want] of [
    [390, 844, 3, true, ["hero-flatlay-ivory-1x.webp", "hero-flatlay-ivory-bezel-1x.webp"]],
    [440, 956, 3, true, ["hero-flatlay-ivory-1x.webp", "hero-flatlay-ivory-bezel-1x.webp"]],
    [412, 915, 2.625, true, ["hero-flatlay-ivory-1x.webp", "hero-flatlay-ivory-bezel-1x.webp"]],
    [320, 568, 2, true, ["hero-flatlay-ivory-1x.webp", "hero-flatlay-ivory-bezel-1x.webp"]],
    // From a tablet up the picture is the art's full size: nothing on a larger screen is softer than it was.
    [820, 1180, 2, true, ["hero-flatlay-ivory.webp", "hero-flatlay-ivory-bezel.webp"]],
    [1440, 900, 1, false, ["hero-flatlay-ivory.webp", "hero-flatlay-ivory-bezel.webp"]],
    [1440, 900, 2, false, ["hero-flatlay-ivory.webp", "hero-flatlay-ivory-bezel.webp"]],
  ] as const) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile, baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    const page = await context.newPage();
    const asked: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/art/pages/hero-flatlay")) asked.push(new URL(request.url()).pathname.split("/").pop()!);
    });
    await page.goto(PAGE);
    await expect.poll(() => files(page), { timeout: 15000, message: `${width}x${height}@${scale}` }).toEqual(want);
    // And only those were asked for: not the other size first and then this one.
    expect([...new Set(asked)].sort(), `${width}x${height}@${scale}`).toEqual([...want].sort());
    await context.close();
  }
});

test("the picked-up phone's shadow is drawn inside its own layer, with nothing to cut it", async ({ page }) => {
  await page.setViewportSize({ width: 412, height: 839 });
  await page.goto("/templates/xoxo");
  const hero = page.locator("[data-flatlay=hero]");
  await hero.locator("[data-play]").click();
  await expect(hero.locator("[data-upright]")).toBeVisible();
  const shadow = await page.evaluate(() => {
    const up = document.querySelector("[data-upright]")!;
    const drawn = getComputedStyle(up, "::before");
    return { frame: getComputedStyle(up.querySelector("[data-phone-body]")!).boxShadow, content: drawn.content, bottom: parseFloat(drawn.bottom), left: parseFloat(drawn.left), mask: drawn.maskImage || drawn.webkitMaskImage, events: drawn.pointerEvents };
  });
  // The frame keeps only its inner rim; its 80px blur, which Android Chrome paints in squares, is gone.
  expect(shadow.frame).toMatch(/inset/);
  expect(shadow.frame).not.toMatch(/80px/);
  // The gradient shadow reaches well past the phone on every side it shows, and ends on nothing there.
  expect(shadow.content).not.toBe("none");
  expect(shadow.bottom).toBeLessThanOrEqual(-100);
  expect(shadow.left).toBeLessThanOrEqual(-70);
  expect(shadow.mask).toMatch(/linear-gradient/);
  expect(shadow.events).toBe("none");
});

test("the picked-up phone's shadow ends on nothing: no straight line down its layer's sides", async ({ browser, baseURL }) => {
  // The test above measures boxes, and passed while the layer drew a one-pixel column down each of
  // its sides, 15 to 24 levels darker than the page (the confirming test of 22 Nov 2026): the sides
  // fall between two pixels, and the half pixel past the mask was painted unmasked. So this one
  // reads the screen: at the two sizes it was seen at, no column of pixels is darker than both of
  // its neighbours down 200px or more.
  const origin = new URL(baseURL!).origin;
  for (const [width, height, scale, path] of [[1280, 620, 1, "/templates/string-the-lights"], [1440, 900, 2, "/templates/the-letter"]] as const) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    const page = await context.newPage();
    await page.goto(path);
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    const hero = page.locator("[data-flatlay=hero]");
    await hero.locator("[data-play]").click();
    const up = hero.locator("[data-upright]");
    await expect(up).toBeVisible();
    // Up and still: the lift is 0.7s, and the table behind it takes half a second to go soft.
    await up.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    await page.waitForTimeout(900);
    const sides = await up.evaluate((el) => { const b = el.getBoundingClientRect(); return [(b.left - 76) * devicePixelRatio, (b.right + 76) * devicePixelRatio]; });
    // The case this is about: a side that falls between two pixels.
    expect(sides.some((x) => Math.abs(x - Math.round(x)) > 0.1), `${path}: a side of the layer falls between two pixels`).toBe(true);
    const { data, info } = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const at = (x: number, y: number) => data[(y * info.width + x) * info.channels];
    const lines: string[] = [];
    // Round the layer's sides, where the line was; the gift's own drawing has straight edges of its own.
    for (const side of sides)
      for (let x = Math.max(1, Math.floor(side) - 3); x <= Math.min(info.width - 2, Math.ceil(side) + 3); x++) {
        let run = 0;
        let longest = 0;
        for (let y = 0; y < info.height; y++) {
          run = at(x - 1, y) - at(x, y) >= 2 && at(x + 1, y) - at(x, y) >= 2 ? run + 1 : 0;
          longest = Math.max(longest, run);
        }
        if (longest >= 200 * scale) lines.push(`${path} ${width}x${height}@${scale}: a column at x=${x}, ${longest} device pixels long`);
      }
    expect(lines).toEqual([]);
    await context.close();
  }
});

// The second sentence of each gift's tagline, as it stands under the italic line (a few words of it).
const UNDER_THE_LINE: Record<string, string> = {
  "/templates/light-the-candles": "with a match",
  "/es/templates/light-the-candles": "con una cerilla",
  // Two sentences and 17 to 19 words, which the rule left whole until the confirming test of 22 Nov 2026:
  // the Spanish Photo Booth's button began at 567 of the first screen's 568, Evergreen's at 550.
  "/es/templates/photo-booth": "Cuatro flashes",
  "/templates/photo-booth": "Four flashes",
  "/es/templates/evergreen": "Salen mariposas",
  "/es/templates/haunted-house": "Tus fotos, en ventanas encendidas",
  "/templates/haunted-house": "Your photos wait in lit windows",
  "/es/templates/party-animals": "invadido por hámsters",
  "/es/templates/wishbone": "la mitad grande",
  "/es/templates/keepsake": "un relicario de oro",
};

test("no hero's italic line is a paragraph: Light the Candles and Photo Booth keep “Make this gift” on a small phone's first screen", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 568 });
  for (const path of Object.keys(UNDER_THE_LINE)) {
    const slug = path.split("/").pop()!;
    // A visit to a Spanish page leaves the language's cookie, and the next English address would be answered in Spanish.
    await page.context().clearCookies();
    await page.goto(path);
    const hero = page.locator("[data-page-theme] section").first();
    const italic = hero.locator("h1 + p");
    const m = await italic.evaluate((p) => ({ rows: Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight)), words: p.textContent!.trim().split(/\s+/).length, style: getComputedStyle(p).fontStyle }));
    expect(m.style).toBe("italic");
    // 24 and 31 words in five and seven rows, before.
    expect(m.words, path).toBeLessThanOrEqual(14);
    expect(m.rows, path).toBeLessThanOrEqual(3);
    // The rest of the tagline is the sentence under it.
    await expect(hero.locator("h1 + p + p")).toContainText(UNDER_THE_LINE[path]);
    const button = (await hero.locator(`a[href$="/create/${slug}"]`).boundingBox())!;
    expect(button.y, `${path}: the button's top`).toBeLessThan(568);
    // Light the Candles has the longest tagline there is (31 words in Spanish) and keeps most of its
    // button on the first screen; the other gifts read here keep all 48px of it. (Of these ten pages
    // only: the test below reads every gift's.)
    if (slug !== "light-the-candles") expect(button.y + button.height, `${path}: the button's foot`).toBeLessThanOrEqual(568);
  }
});

/** The page at rest for a ruler: its type loaded, and the short rise it comes in on (settle() says more) over. */
async function atRest(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      (document.querySelector("main")?.getAnimations() ?? [])
        .filter((a) => Number.isFinite(Number(a.effect?.getComputedTiming().endTime)))
        .map((a) => a.finished.catch(() => {})),
    );
  });
}

/** Every gift's page, in both languages: 122 of them. */
const EVERY_GIFT = [...TEMPLATE_SLUGS.map((slug) => `/templates/${slug}`), ...TEMPLATE_SLUGS.map((slug) => `/es/templates/${slug}`)];

test("on the smallest phone every gift's “Make this gift” begins on the first screen, in both languages", async ({ page }) => {
  // The test above reads ten pages, and its comment said "every other gift". The second confirming
  // test (22 Nov 2026) read all 122 at 320×568: the Spanish Witch's Brew's button began at 586 of
  // 568, wholly under the first screen, behind two rows of italic and a first sentence of 34 words;
  // on two dozen more the first screen's foot cut the button. So this one reads every page, and the
  // next long opening sentence fails here by name.
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 320, height: 568 });
  const under: string[] = [];
  const cut: string[] = [];
  const pills: string[] = [];
  for (const path of EVERY_GIFT) {
    const slug = path.split("/").pop()!;
    // A visit to a Spanish page leaves the language's cookie, and the next English address would be answered in Spanish.
    await page.context().clearCookies();
    await page.goto(path);
    await atRest(page);
    const hero = page.locator("[data-page-theme] section").first();
    await expect(page.locator("html"), path).toHaveAttribute("lang", path.startsWith("/es/") ? "es" : "en");
    const button = (await hero.locator(`a[href$="/create/${slug}"]`).boundingBox())!;
    const top = Math.round(button.y);
    const foot = Math.round(button.y + button.height);
    if (top >= 568) under.push(`${path}: “Make this gift” begins at ${top}`);
    else if (foot > 568) cut.push(`${path} ${top}–${foot}`);
    // The second button is one row in a pill of 48px, in both languages (its Spanish label was two
    // rows under 360px wide, 2px from the pill's top and bottom edges).
    const pill = await hero.locator(`a[href$="/demo/${slug}"]`).evaluate((a) => {
      const range = document.createRange();
      range.selectNodeContents(a);
      const rects = [...range.getClientRects()].filter((r) => r.width > 20 && r.height < 40);
      return { height: Math.round(a.getBoundingClientRect().height), rows: new Set(rects.map((r) => Math.round(r.top))).size };
    });
    if (pill.rows !== 1 || pill.height !== 48) pills.push(`${path}: ${pill.rows} row(s) in ${pill.height}px`);
  }
  expect(under, "under the first screen of a 320×568 phone").toEqual([]);
  expect(pills, "the second button").toEqual([]);
  // The page it was found on has the whole button on the first screen now.
  expect(cut.filter((row) => row.startsWith("/es/templates/cauldron "))).toEqual([]);
  // Twenty-four pages (twenty of them Spanish) still have the first screen's foot through the
  // button, which begins 7 to 45px above it: whether that matters on a phone this small is the
  // owner's to say (reports/guides-confirm.md, N2-1). Held here so that it does not become more.
  console.log(`320×568: the first screen's foot cuts “Make this gift” on ${cut.length} of ${EVERY_GIFT.length} pages: ${cut.join("; ")}`);
  expect(cut.length, cut.join("; ")).toBeLessThanOrEqual(24);
});

test("the second button's label has room: one row on a narrow phone, and rows that wrap are centred in a taller pill", async ({ page }) => {
  // "Abrir demo a pantalla completa" was two rows from 320 to 359px wide, in a pill of a fixed 48px:
  // 2px above the first row and 2px under the second, set left beside the play mark.
  const room = (a: Element) => {
    const range = document.createRange();
    range.selectNodeContents(a);
    const rects = [...range.getClientRects()].filter((r) => r.width > 20 && r.height < 40);
    const box = a.getBoundingClientRect();
    const svg = a.querySelector("svg")!.getBoundingClientRect();
    return {
      rows: new Set(rects.map((r) => Math.round(r.top))).size,
      height: Math.round(box.height),
      above: Math.round(Math.min(...rects.map((r) => r.top)) - box.top),
      below: Math.round(box.bottom - Math.max(...rects.map((r) => r.bottom))),
      // The play mark and the label are centred in the pill together.
      left: Math.round(svg.left - box.left),
      right: Math.round(box.right - Math.max(...rects.map((r) => r.right))),
      align: getComputedStyle(a).textAlign,
    };
  };
  for (const width of [320, 344, 360, 375]) {
    await page.setViewportSize({ width, height: 700 });
    for (const path of ["/es/templates/photo-booth", "/templates/photo-booth"]) {
      await page.context().clearCookies();
      await page.goto(path);
      await atRest(page);
      const pill = page.locator("[data-page-theme] section").first().locator('a[href$="/demo/photo-booth"]');
      await expect(pill).toHaveText(path.startsWith("/es/") ? "Demo a pantalla completa" : "Open full-screen demo");
      const m = await pill.evaluate(room);
      expect(m, `${path} at ${width}`).toMatchObject({ rows: 1, height: 48 });
      expect(Math.min(m.above, m.below), `${path} at ${width}: room above and below the label`).toBeGreaterThanOrEqual(10);
      expect(Math.abs(m.left - m.right), `${path} at ${width}: the mark and the label sit in the middle`).toBeLessThanOrEqual(2);
      if (width !== 320 || !path.startsWith("/es/")) continue;
      // A label that does wrap (a longer one, the system's largest type): the pill grows round its rows.
      // Made to wrap by a narrower pill, from a style sheet: the label is React's, and words changed
      // under it before the page has hydrated are a mismatch it answers by drawing the hero again.
      await page.addStyleTag({ content: '[data-page-theme] a[href*="/demo/"]{max-width:13rem;align-self:center}' });
      const wrapped = await pill.evaluate(room);
      expect(wrapped.rows, "the label wraps in a narrower pill").toBeGreaterThanOrEqual(2);
      expect(wrapped.height).toBeGreaterThan(48);
      expect(Math.min(wrapped.above, wrapped.below), "room above and below the rows").toBeGreaterThanOrEqual(8);
      expect(wrapped.align).toBe("center");
    }
  }
});

test("WebKit as an iPhone 13: no sideways scroll, no flower under words, the gift plays", async ({ baseURL }) => {
  const browser = await webkit.launch();
  try {
    const origin = new URL(baseURL!).origin;
    const context = await browser.newContext({ ...devices["iPhone 13"], baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    const page = await context.newPage();
    const thrown: string[] = [];
    page.on("pageerror", (error) => thrown.push(error.message));
    const art: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/art/pages/")) art.push(new URL(request.url()).pathname.split("/").pop()!);
    });
    await page.goto(PAGE, { waitUntil: "load" });
    // Before any scroll an iPhone is sent the hero's picture and rim at half size, never the full-size
    // pair: Safari takes the first file with a pixel for each of the screen's. And it waits for a lazy
    // picture until it is nearly on screen: the band's picture, four screens down, is not asked for.
    const of = (piece: string) => [...new Set(art.filter((file) => file.startsWith(piece)))].sort();
    await expect.poll(() => of("hero-flatlay"), { timeout: 15000 }).toEqual(["hero-flatlay-ivory-1x.webp", "hero-flatlay-ivory-bezel-1x.webp"]);
    await page.waitForTimeout(1500);
    expect(of("hero-flatlay")).toEqual(["hero-flatlay-ivory-1x.webp", "hero-flatlay-ivory-bezel-1x.webp"]);
    expect(of("experience-flatlay")).toEqual([]);
    await settle(page);
    const m = await measure(page);
    expect(m.overflow).toBeLessThanOrEqual(0);
    expect(m.overlaps).toEqual([]);
    expect(m.small).toEqual([]);
    // The film: this WebKit either plays it or cannot, and where it cannot the still cover is what shows. Never a black screen, never an error.
    await page.locator("[data-flatlay=hero]").scrollIntoViewIfNeeded();
    await page.waitForTimeout(3000);
    const f = await film(page);
    const can = await page.evaluate(() => document.createElement("video").canPlayType("video/webm"));
    console.log(`WebKit as an iPhone 13: canPlayType("video/webm") = "${can}", film ${f.on ? "playing" : "not shown"}, still cover ${f.stillShown ? "shown" : "MISSING"}`);
    expect(f.stillShown).toBe(true);
    expect(f.on ? f.opacity : 0).toBe(f.on ? 1 : 0);
    if (!f.on) expect(await page.locator("[data-flatlay=hero] video").evaluate((v) => Number(getComputedStyle(v).opacity))).toBe(0);
    if (can === "") expect(f.src).toBe("");
    expect(thrown).toEqual([]);
    await page.locator("[data-flatlay=hero]").getByRole("button", { name: /try the live demo/i }).tap();
    const up = page.locator("[data-flatlay=hero] [data-upright]");
    await expect(up.locator("[data-template=the-letter]")).toBeVisible({ timeout: 30000 });
    // A finger beside the phone puts it down. WebKit makes a click of a tap only on something it takes for
    // clickable, and the page's ground is not: the click the page listened for never came (the deep test of
    // 21 Nov 2026, all 23 WebKit runs). A real touch, on plain ground left of the phone.
    const beside = await page.evaluate(() => {
      const phone = document.querySelector("[data-upright]")!.getBoundingClientRect();
      const y = Math.round(phone.top + phone.height / 2);
      const at = document.elementFromPoint(8, y)!;
      return { x: 8, y, plain: at.closest("a, button, summary, [data-upright]") === null && at.closest("[data-page-theme]") !== null, cursor: getComputedStyle(at).cursor };
    });
    expect(beside.plain).toBe(true);
    expect(beside.cursor).not.toBe("pointer");
    // A finger on the gift itself is the gift's: the phone stays up.
    await page.touchscreen.tap(Math.round((await up.boundingBox())!.x + 60), beside.y);
    await expect(up).toHaveCount(1);
    await page.touchscreen.tap(beside.x, beside.y);
    await expect(up).toHaveCount(0);
    // And it comes up again.
    await page.locator("[data-flatlay=hero]").getByRole("button", { name: /try the live demo/i }).tap();
    await expect(up).toBeVisible();
  } finally {
    await browser.close();
  }
});
