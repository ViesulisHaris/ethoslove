import { expect, test } from "@playwright/test";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { measure, settle } from "./page-measure";

/**
 * The front page reads in 300 words, the strip of gifts aside (BRIEF-gifts2.md, 3). Its first three screens are the
 * owner's (the hero, the strip of playable gifts and the four doors) and stay as they are; the words inside the
 * playable gifts are the gifts', not the page's. Below them each section is a heading, something to look at and
 * one way in: the date ideas are pictures with a title, and the lines under the long-distance, games and closing
 * headings went to the rooms they describe, where they are said in full.
 */
test.skip(({ isMobile }) => isMobile, "sets its own screen sizes");

for (const [prefix, messages] of [["", en], ["/es", es]] as const) {
  test(`${prefix || "/"}: the front page reads in 300 words, the strip of gifts aside`, async ({ page }) => {
    test.slow();
    for (const [width, height] of [[1440, 900], [375, 812]] as const) {
      await page.setViewportSize({ width, height });
      await page.goto(prefix || "/");
      await settle(page);
      const all = await measure(page, "main");
      const strip = await measure(page, "[data-template-strip]");
      expect(all.overflow, `${width}: the page scrolls sideways`).toBeLessThanOrEqual(0);
      expect(all.count - strip.count, `${width}: words on show, the strip aside`).toBeLessThanOrEqual(300);

      // The first three screens are whole: the hero's headline as the message file has it, the strip, the four doors.
      const h1 = (await page.locator("h1").first().innerText()).replace(/\s+/g, " ");
      expect(h1).toContain(messages.growth.hero.h1a);
      expect(h1).toContain(messages.growth.hero.h1b);
      expect(await page.locator("[data-template-strip] > div").count()).toBeGreaterThanOrEqual(50);
      await expect(page.locator("section").filter({ has: page.getByText(messages.platform.doors.eyebrow, { exact: true }) }).locator("li a")).toHaveCount(4);

      // Below them: the date ideas are pictures with a title, and no line of words on a card.
      await expect(page.locator("[data-idea-line]")).toHaveCount(0);
      const ideas = page.locator("[data-ideas-row] li");
      await expect(ideas).toHaveCount(8);
      for (const idea of await ideas.all()) {
        await idea.scrollIntoViewIfNeeded();
        await expect.poll(() => idea.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 20_000 }).toBe(true);
        expect((await idea.innerText()).trim().split(/\s+/).length).toBeGreaterThanOrEqual(2);
      }

      // The long-distance band, the games band and the closing: one heading and one way in each, big enough for a thumb.
      for (const heading of [messages.platform.ldr.titleA, messages.platform.games.title, messages.platform.closing.title]) {
        const section = page.locator("main section").filter({ has: page.locator("h2", { hasText: heading }) });
        await expect(section.locator("h2")).toHaveCount(1);
        const heights = await section.locator("a").evaluateAll((links) => links.map((a) => a.getBoundingClientRect().height));
        expect(heights.length, heading).toBeGreaterThanOrEqual(1);
        expect(Math.max(...heights), heading).toBeGreaterThanOrEqual(44);
      }
      await expect(page.locator("[data-games-ways]")).toHaveCount(0);
    }
  });
}

// A link made for Dates (?ref=dates…) opens the same page on the date ideas, with the strip of gifts after them
// (lib/attribution/landing.ts homeHeroFor): it is held to the same ruler (the code review of 25 Nov 2026, C20).
for (const prefix of ["", "/es"]) {
  test(`${prefix || "/"}?ref=dates: the front page opened from a Dates link reads in 300 words, the strip of gifts aside`, async ({ page }) => {
    test.slow();
    for (const [width, height] of [[1440, 900], [375, 812]] as const) {
      await page.setViewportSize({ width, height });
      await page.goto(`${prefix || "/"}?ref=dates-test`);
      await settle(page);
      const all = await measure(page, "main");
      const strip = await measure(page, "[data-template-strip]");
      expect(strip.count, `${width}: the strip is on the page`).toBeGreaterThan(0);
      expect(all.overflow, `${width}: the page scrolls sideways`).toBeLessThanOrEqual(0);
      expect(all.count - strip.count, `${width}: words on show, the strip aside`).toBeLessThanOrEqual(300);
    }
  });
}
