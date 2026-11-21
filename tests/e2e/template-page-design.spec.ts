import { devices, expect, test, webkit, type Page } from "@playwright/test";

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

/** Scroll the page through once, so everything lazy has arrived and is laid out. */
async function settle(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * 0.7) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await document.fonts.ready;
  });
}

/**
 * What the page looks like to a ruler: its sideways overflow, every flower's box and every word's
 * box (the phones' own screens aside: a flower tucked behind a phone is behind glass, not words),
 * and the words a visitor can read without opening anything.
 */
async function measure(page: Page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-page-theme]")!;
    const shown = (el: Element) => {
      for (let node: Element | null = el; node && node !== root.parentElement; node = node.parentElement) {
        const cs = getComputedStyle(node);
        if (cs.display === "none" || cs.visibility === "hidden") return false;
        if (node instanceof HTMLDetailsElement && !node.open && !(el.closest("summary")?.parentElement === node)) return false;
      }
      return true;
    };
    // A cut-out's picture stops short of its box's corners; a fifth in from each side is still generous to the flower.
    const decor = [...root.querySelectorAll<HTMLElement>("[data-decor]")]
      .filter((el) => shown(el) && !el.closest("[data-flatlay]"))
      .map((el) => {
        const r = el.getBoundingClientRect();
        const dx = r.width * 0.2, dy = r.height * 0.2;
        return { id: el.dataset.decor!, left: r.left + dx + scrollX, right: r.right - dx + scrollX, top: r.top + dy + scrollY, bottom: r.bottom - dy + scrollY, inView: r.top < innerHeight && r.bottom > 0 && r.left < innerWidth && r.right > 0 };
      });
    const words: { text: string; left: number; right: number; top: number; bottom: number; size: number; label: boolean }[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let count = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim() ?? "";
      const parent = node.parentElement;
      if (!text || !parent || !shown(parent) || parent.closest("[data-flatlay], style, script")) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      if (rects.length === 0) continue;
      count += text.split(/\s+/).length;
      const cs = getComputedStyle(parent);
      for (const r of rects) words.push({ text: text.slice(0, 40), left: r.left + scrollX, right: r.right + scrollX, top: r.top + scrollY, bottom: r.bottom + scrollY, size: parseFloat(cs.fontSize), label: cs.textTransform === "uppercase" });
    }
    const overlaps: string[] = [];
    for (const d of decor) for (const w of words) if (d.left < w.right && d.right > w.left && d.top < w.bottom && d.bottom > w.top) overlaps.push(`${d.id} over “${w.text}”`);
    const targets = [...root.querySelectorAll<HTMLElement>("a, button, summary")]
      .filter((el) => shown(el) && !el.closest("[data-flatlay]"))
      .map((el) => {
        // A card's summary is pressed anywhere on the card: its ::after covers it.
        const r = (el.tagName === "SUMMARY" && getComputedStyle(el, "::after").position === "absolute" ? el.parentElement! : el).getBoundingClientRect();
        return { what: (el.textContent ?? "").trim().slice(0, 30), width: Math.round(r.width), height: Math.round(r.height) };
      });
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      height: document.documentElement.scrollHeight,
      overlaps: [...new Set(overlaps)],
      count,
      decorInView: decor.filter((d) => d.inView).length,
      smallest: words.filter((w) => !w.label).reduce((min, w) => Math.min(min, w.size), 99),
      smallestLabel: words.filter((w) => w.label).reduce((min, w) => Math.min(min, w.size), 99),
      small: targets.filter((t) => t.height < 44 || t.width < 44).map((t) => `${t.what} ${t.width}×${t.height}`),
      sections: [...root.querySelectorAll("section")].map((s) => Math.round(s.getBoundingClientRect().top + scrollY)),
    };
  });
}

for (const [width, height] of SIZES) {
  test(`${width}×${height}: no sideways scroll, no flower over words, words within the budget`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto(PAGE);
    await settle(page);
    const m = await measure(page);
    expect(m.overflow, "the page scrolls sideways").toBeLessThanOrEqual(0);
    expect(m.overlaps, "a flower lies over words").toEqual([]);
    // 300 words at most without opening anything, the header and the footer aside.
    expect(m.count).toBeLessThanOrEqual(300);
    expect(m.count).toBeGreaterThan(120);
    // Sentences never under 14 px; the small mono labels over a heading are 12 px capitals.
    expect(m.smallest).toBeGreaterThanOrEqual(14);
    expect(m.smallestLabel).toBeGreaterThanOrEqual(12);
    // What is meant to be pressed is at least 44 px each way, for a thumb.
    expect(m.small).toEqual([]);
    // The first screen has a flower in it and a real picture (the phone with the gift's own cover).
    expect(m.decorInView + (await page.locator("[data-flatlay=hero] [data-decor]").count())).toBeGreaterThanOrEqual(1);
    if (height >= 600) await expect(page.locator("[data-flatlay=hero]")).toBeInViewport();
  });
}

/**
 * The layout is every template's. A long name, a long description, a page without a guide, a
 * premium one, and both languages: each on a desk and on a phone.
 */
const OTHERS = ["/templates/birthday-cinema", "/templates/scratch-card", "/templates/snow-globe", "/templates/vinyl", "/templates/coquette", "/templates/gingerbread-house", "/es/templates/the-letter", "/es/templates/string-the-lights"];

for (const path of OTHERS) {
  test(`${path} holds the same layout, on a desk and on a phone`, async ({ page }) => {
    for (const [width, height] of [[1440, 900], [1024, 768], [375, 812]] as const) {
      await page.setViewportSize({ width, height });
      await page.goto(path);
      await settle(page);
      const m = await measure(page);
      expect(m.overflow, `${width}: the page scrolls sideways`).toBeLessThanOrEqual(0);
      expect(m.overlaps, `${width}: a flower lies over words`).toEqual([]);
      expect(m.count, `${width}: words on the page`).toBeLessThanOrEqual(300);
      expect(m.smallest, `${width}`).toBeGreaterThanOrEqual(14);
      expect(m.small, `${width}: too small for a thumb`).toEqual([]);
    }
    // One h1, and the page says what it is to a search engine.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator('script[type="application/ld+json"]')).not.toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });
}

test("the page is whole, and the same height, when no picture arrives", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PAGE);
  await settle(page);
  const withPictures = await measure(page);

  // Every picture fails: the flowers, the posters, the sample photo. Boxes are reserved, so nothing moves.
  await page.route(/\.(webp|jpg|jpeg|png|avif)(\?|$)|\/_next\/image/, (route) => route.abort());
  await page.reload();
  await settle(page);
  const without = await measure(page);
  expect(without.sections).toEqual(withPictures.sections);
  expect(without.height).toBe(withPictures.height);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Make this gift" })).toBeVisible();
});

test("the demo plays from the hero, and the phone stands up for it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PAGE);
  const hero = page.locator("[data-flatlay=hero]");
  await hero.getByRole("button", { name: /try the live demo/i }).click();
  await expect(hero.locator("[data-template=the-letter]")).toBeVisible({ timeout: 25000 });
  // Upright once it is live: a gift reads where a finger is from an upright box.
  await expect.poll(() => hero.locator("[data-template=the-letter]").evaluate((el) => new DOMMatrix(getComputedStyle(el.closest(".transition-transform")!).transform).b)).toBeCloseTo(0, 3);
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
  // A card still opens, at once.
  const card = page.locator("section[aria-labelledby=template-guide] details").first();
  await card.locator("summary").click();
  await expect(card.locator("[data-reveal]")).toBeVisible();
});

test("each gift's page wears that gift's colours, and the footer follows", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const seen = new Set<string>();
  for (const slug of ["the-letter", "constellations", "coquette", "snow-globe"]) {
    await page.goto(`/templates/${slug}`);
    const colours = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>("[data-page-theme]")!;
      return { ground: getComputedStyle(root).backgroundColor, body: getComputedStyle(document.body).backgroundColor, footer: getComputedStyle(document.querySelector("footer")!).backgroundColor };
    });
    expect(colours.body, slug).toBe(colours.ground);
    expect(colours.footer, slug).not.toBe(colours.ground);
    seen.add(colours.ground);
  }
  expect(seen.size).toBe(4);
  // And it leaves with the page: the homepage keeps the site's own paper.
  await page.goto("/templates/the-letter");
  const themed = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.goto("/");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe(themed);
});

test("WebKit as an iPhone 13: no sideways scroll, no flower over words, the demo starts", async ({ baseURL }) => {
  const browser = await webkit.launch();
  try {
    const origin = new URL(baseURL!).origin;
    const context = await browser.newContext({ ...devices["iPhone 13"], baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    const page = await context.newPage();
    await page.goto(PAGE);
    await settle(page);
    const m = await measure(page);
    expect(m.overflow).toBeLessThanOrEqual(0);
    expect(m.overlaps).toEqual([]);
    expect(m.small).toEqual([]);
    await page.locator("[data-flatlay=hero]").getByRole("button", { name: /try the live demo/i }).tap();
    await expect(page.locator("[data-flatlay=hero] [data-template=the-letter]")).toBeVisible({ timeout: 30000 });
  } finally {
    await browser.close();
  }
});
