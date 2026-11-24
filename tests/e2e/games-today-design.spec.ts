import { expect, test, type Page } from "@playwright/test";
import { dailyPair, dayOf, encodeDaily } from "../../src/lib/games/daily";
import { measure, settle } from "./page-design";

/**
 * Today's question as a designed page (docs/marketing/growth-build/DESIGN-LESS-TEXT.md), held to
 * the finder's ruler (./page-design.ts): at the owner's sizes, in both languages and in its three
 * kinds of screen (the question, an answer picked, both answers shown), no sideways scroll, no
 * flower under words or on an answer, at most 300 words, type never under 14px (labels 12px), and
 * nothing to press smaller than a thumb.
 */
const SIZES: [number, number][] = [
  [320, 568],
  [375, 812],
  [414, 896],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
  [812, 375],
];

const day = () => dayOf(Date.now());
const reveal = () => encodeDaily({ day: day(), pairId: dailyPair(day()).id, from: { name: "Ana", side: 1 }, to: { name: "Sam", side: 0 } });

async function state(page: Page, path: string, which: "ask" | "answered" | "reveal") {
  await page.goto(path + (which === "reveal" ? reveal() : ""));
  await expect(page.locator("[data-today][data-ready]")).toHaveCount(1);
  // The tab remembers its own answer: forget it, so the question is asked again.
  if (which !== "reveal" && (await page.locator("[data-today]").getAttribute("data-phase")) !== "ask") {
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await expect(page.locator("[data-today][data-ready]")).toHaveCount(1);
  }
  if (which === "answered") await page.locator("[data-today] [data-side=a]").first().click();
  await expect(page.locator("[data-today]")).toHaveAttribute("data-phase", which);
}

test.skip(({ isMobile }) => isMobile, "sets its own screen sizes");

for (const [width, height] of SIZES) {
  test(`Y1 ${width}×${height}: no sideways scroll, no flower under words or on an answer, words within 300`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height });
    for (const locale of ["", "/es"]) {
      for (const which of ["ask", "answered", "reveal"] as const) {
        const where = `${locale}/games/today (${which})`;
        await state(page, `${locale}/games/today`, which);
        await settle(page);
        const m = await measure(page);
        expect(m.overflow, `${where}: the page scrolls sideways`).toBeLessThanOrEqual(0);
        expect(m.overlaps, `${where}: a piece of the art lies under words`).toEqual([]);
        expect(m.onCards, `${where}: a piece of the art lies on an answer`).toEqual([]);
        expect(m.pieces, where).toBeGreaterThanOrEqual(1);
        expect(m.count, `${where}: words on the page`).toBeLessThanOrEqual(300);
        expect(m.smallest, where).toBeGreaterThanOrEqual(14);
        expect(m.smallestLabel, where).toBeGreaterThanOrEqual(12);
        expect(m.small, `${where}: too small for a thumb`).toEqual([]);
      }
    }
  });
}

test("Y2: one h1, the left column's line within fourteen words, the site's palette and ivory lilies", async ({ page }) => {
  for (const locale of ["", "/es"]) {
    await page.goto(`${locale}/games/today`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const line = await page.locator("#today-title + p").innerText();
    expect(line.trim().split(/\s+/).length).toBeLessThanOrEqual(14);
    for (const id of ["today-how", "today-more"]) {
      const l = await page.locator(`#${id} + p`).innerText();
      expect(l.trim().split(/\s+/).length, id).toBeLessThanOrEqual(14);
    }
  }
  const art = await page.locator("[data-page-theme=games-today] [data-decor] img").evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src") ?? ""));
  expect(art.length).toBeGreaterThanOrEqual(2);
  for (const src of art) expect(src).toMatch(/-ivory(-1x)?\.webp$|\/art\/pages\/[a-z0-9-]+(-1x)?\.webp$/);
});

test("Y3: the questions are closed, and nothing moves when an answer is picked", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await state(page, "/games/today", "ask");
  for (const d of await page.locator("[data-page-theme] details").all()) await expect(d).not.toHaveAttribute("open", "");
  const top = () => page.locator("#today-how").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  // Measured once the type has loaded and laid out: under load the fallback font was still up, and a 2px move was the font, not the page.
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  });
  const before = await top();
  // The room kept for the send block is the send block, waiting with nothing to send yet: no band of
  // empty cream under the answers (the second pass, C16 and D12: 178px of it at this size).
  const block = page.locator("[data-send-block]");
  await expect(block).toBeVisible();
  await expect(block.locator("[data-send]")).toBeDisabled();
  await expect(block.locator("[data-copy]")).toBeDisabled();
  const gap = await page.evaluate(() => {
    const status = document.querySelector("[data-today] [role=status]")!.getBoundingClientRect().bottom;
    return document.querySelector("#today-how")!.closest("section")!.getBoundingClientRect().top - status;
  });
  expect(gap, "empty cream between the question's block and the band below").toBeLessThan(60);
  await page.locator("[data-today] [data-side=b]").first().click();
  await expect(block.locator("[data-send]")).toBeEnabled();
  await page.locator("[data-copy]").click();
  const after = await top();
  // The send block and the status line fill the space the question keeps for them: the band below does not move.
  expect(Math.abs(after - before)).toBeLessThan(1);
});

test("Y4: on a phone the send block waits for an answer; in the reveal the two names stand level", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await state(page, "/games/today", "ask");
  await expect(page.locator("[data-send-block]")).toBeHidden();
  await page.locator("[data-today] [data-side=a]").first().click();
  await expect(page.locator("[data-send-block]")).toBeVisible();
  // A short answer beside a long one: the names sit at the top under the corner, at one height.
  for (const [width, height] of [[375, 812], [1440, 900]] as const) {
    await page.setViewportSize({ width, height });
    await state(page, "/games/today", "reveal");
    const tops = await page.locator("[data-reveal-card] > span:nth-of-type(2)").evaluateAll((names) => names.map((n) => n.getBoundingClientRect().top));
    expect(tops).toHaveLength(2);
    expect(Math.abs(tops[0] - tops[1]), `${width}px: the names' heights`).toBeLessThan(1);
  }
});
