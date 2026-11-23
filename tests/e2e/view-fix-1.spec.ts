import { expect, test, type Page } from "@playwright/test";
import { templateFilmStart } from "../../src/content/template-film-starts";

/**
 * The first fix round on the preview (docs/marketing/growth-build/reports/view-fix-1-brief.md): each
 * test holds one finding of the four user walks of 23 Nov 2026 (view-walk-*.md), named by its number.
 */

/** Hovers a card and follows its film: every moment it is visible, and after one loop. */
async function hoverFilm(page: Page, card: string, slug: string) {
  const from = templateFilmStart(slug);
  expect(from, slug).toBeGreaterThan(0);
  const box = page.locator(card);
  await box.scrollIntoViewIfNeeded();
  const video = box.locator("video[data-card-film]");
  // Watch the film from before the hover: the lowest time at which it was ever visible.
  await video.evaluate((v: HTMLVideoElement) => {
    const w = window as unknown as { seenAt: number[] };
    w.seenAt = [];
    const note = () => {
      if (v.hasAttribute("data-on")) w.seenAt.push(v.currentTime);
    };
    v.addEventListener("timeupdate", note);
    new MutationObserver(note).observe(v, { attributes: true, attributeFilter: ["data-on"] });
  });
  await box.hover();
  await expect(video).toHaveAttribute("data-on", "", { timeout: 20_000 });
  expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime), slug).toBeGreaterThanOrEqual(from);
  // To the end of the film and round once more.
  await video.evaluate((v: HTMLVideoElement) => {
    v.currentTime = Math.max(0, v.duration - 0.4);
  });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 10_000 }).toBeLessThan(from + 1.2);
  await page.waitForTimeout(400);
  const after = await video.evaluate((v: HTMLVideoElement) => ({ t: v.currentTime, on: v.hasAttribute("data-on"), paused: v.paused }));
  expect(after.paused, slug).toBe(false);
  expect(after.t, slug).toBeGreaterThanOrEqual(from);
  const seen = await page.evaluate(() => (window as unknown as { seenAt: number[] }).seenAt);
  expect(seen.length, slug).toBeGreaterThan(0);
  expect(Math.min(...seen), `${slug}: never seen before ${from}s`).toBeGreaterThanOrEqual(from);
}

test.describe("front-3: a card's hover film skips the recording's opening", () => {
  for (const slug of ["popup-card", "xoxo", "the-letter"]) {
    test(`gallery card, ${slug}`, async ({ page }) => {
      await page.goto("/templates");
      await hoverFilm(page, `[data-gallery-card="${slug}"]`, slug);
    });
  }

  test("the front page's strip, popup-card", async ({ page }) => {
    await page.goto("/");
    const card = page.locator("[data-template-strip] article", { has: page.locator('a[href="/templates/popup-card"]') });
    await card.evaluate((el) => el.setAttribute("data-test-card", ""));
    await hoverFilm(page, "[data-template-strip] article[data-test-card] > div:first-child", "popup-card");
  });
});

for (const [width, height] of [
  [1440, 900],
  [390, 844],
] as const) {
  test.describe(`the front page's rows at ${width}`, () => {
    test.use({ viewport: { width, height } });

    test("front-2: the strip's first card starts under the section's heading", async ({ page }) => {
      await page.goto("/");
      const strip = page.locator("[data-template-strip]");
      await strip.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      const heading = page.locator("h2", { hasText: "Every template is a whole experience." });
      const first = strip.locator(":scope > div").first();
      const [h, c] = [(await heading.boundingBox())!, (await first.boundingBox())!];
      expect(Math.abs(h.x - c.x)).toBeLessThanOrEqual(2);
      expect(await strip.evaluate((el) => el.scrollLeft)).toBeLessThanOrEqual(1);
    });

    test("front-15: no line on the front page ends in an ellipsis", async ({ page }) => {
      for (const path of ["/", "/es"]) {
        await page.goto(path);
        const cut = await page.evaluate(() =>
          [...document.querySelectorAll("main *")]
            .filter((el) => {
              const s = getComputedStyle(el);
              const clamped = s.webkitLineClamp !== "none" && s.webkitLineClamp !== "" ? true : s.textOverflow === "ellipsis";
              return clamped && (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1);
            })
            .map((el) => (el.textContent ?? "").slice(0, 60)),
        );
        expect(cut, path).toEqual([]);
      }
    });
  });
}

test.describe("front-15 at 1280 too", () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test("no line on the front page ends in an ellipsis, and a row of cards keeps its buttons level", async ({ page }) => {
    for (const path of ["/", "/es"]) {
      await page.goto(path);
      const cut = await page.evaluate(() =>
        [...document.querySelectorAll("main [data-card-line], main [data-idea-line]")].filter((el) => el.scrollHeight > el.clientHeight + 1).map((el) => el.textContent),
      );
      expect(cut, path).toEqual([]);
    }
    // The first four cards never fade in (the others rise 16px as they come into view): their buttons stand on one line.
    const tops = await page.locator("[data-template-strip] article a[href^='/es/create/'], [data-template-strip] article a[href^='/create/']").evaluateAll((links) => links.slice(0, 4).map((a) => Math.round(a.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    // And every card fills its row's height.
    const fills = await page.locator("[data-template-strip] > div").evaluateAll((cells) => cells.every((c) => Math.abs((c.firstElementChild as HTMLElement).offsetHeight - (c as HTMLElement).offsetHeight) <= 1));
    expect(fills).toBe(true);
  });
});

test.describe("front-5: a mouse can move the front page's rows", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  for (const row of ["[data-template-strip]", "[data-ideas-row]"]) {
    test(row, async ({ page }) => {
      await page.goto("/");
      const scroller = page.locator(row);
      await scroller.scrollIntoViewIfNeeded();
      const frame = scroller.locator("xpath=..");
      const previous = frame.locator("[data-row-previous]");
      const next = frame.locator("[data-row-next]");
      await expect(previous).toBeDisabled();
      await expect(previous).toHaveAttribute("aria-label", /Earlier/);
      await expect(next).toBeEnabled();
      await next.click();
      await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
      await expect(previous).toBeEnabled();
    });
  }

  test("in Spanish the buttons have Spanish names, and they are not there on a phone", async ({ page }) => {
    await page.goto("/es");
    await expect(page.locator("[data-row-next]").first()).toHaveAttribute("aria-label", "Más regalos");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator("[data-row-next]").first()).toBeHidden();
  });
});
