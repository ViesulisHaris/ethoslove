import { devices, expect, test, webkit, type Page } from "@playwright/test";
import { measure, settle } from "./page-design";
import { mockTowns, typeTown } from "./rooms-world";

/**
 * The rooms' new sections held to the ruler of a designed page (DESIGN-LESS-TEXT.md, "Every
 * device"): the halfway finder's page at every size on the owner's list, the matcher on /trips
 * before and after a tap, and the ways on of /long-distance. No sideways scroll, no flower under
 * words or on a card, words within the budget, type never under 14px (12px for the small capitals
 * labels), and nothing to press smaller than a thumb.
 */

const TOOL = "/tools/halfway-between-two-cities";

/** The owner's list (as tests/e2e/gift-finder-design.spec.ts has it). */
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
const MATCH_SIZES: [number, number][] = [
  [320, 568],
  [375, 812],
  [768, 1024],
  [1024, 768],
  [1280, 800],
  [1440, 900],
  [1920, 1080],
];

test.skip(({ isMobile }) => isMobile, "sets its own screen sizes");

async function towns(page: Page, a: string, b: string, es = false) {
  await typeTown(page, es ? "Dónde estás tú" : "Where you are", a);
  await typeTown(page, es ? "Dónde está la otra persona" : "Where they are", b);
  await expect(page.locator("[data-halfway-city]").or(page.locator('[data-testid="meet-ways"]')).first()).toBeVisible();
}

function ruled(m: Awaited<ReturnType<typeof measure>>, where: string, words: number) {
  expect(m.overflow, `${where}: the page scrolls sideways`).toBeLessThanOrEqual(0);
  expect(m.overlaps, `${where}: a piece of the art lies under words`).toEqual([]);
  expect(m.onCards, `${where}: a piece of the art lies on a card`).toEqual([]);
  expect(m.count, `${where}: words on show`).toBeLessThanOrEqual(words);
  expect(m.smallest, where).toBeGreaterThanOrEqual(14);
  expect(m.smallestLabel, where).toBeGreaterThanOrEqual(12);
  expect(m.small, `${where}: too small for a thumb`).toEqual([]);
}

for (const [width, height] of SIZES) {
  test(`${width}×${height}: the halfway finder has no sideways scroll, no flower under words or on a card, and its words within the budget`, async ({ page }) => {
    test.setTimeout(120_000);
    await mockTowns(page);
    await page.setViewportSize({ width, height });
    const runs: { path: string; typed?: boolean }[] = [{ path: TOOL }];
    // The Spanish page last: once it is opened, the language is remembered for the English address too.
    if ((width === 1440 && height === 900) || (width === 375 && height === 812)) runs.push({ path: TOOL, typed: true });
    if ((width === 1440 && height === 900) || (width === 375 && height === 812) || (width === 320 && height === 568)) runs.push({ path: `/es${TOOL}` });
    for (const run of runs) {
      const where = `${run.path}${run.typed ? " (Riga–Lisbon)" : ""}`;
      await page.goto(run.path);
      if (run.typed) await towns(page, "Riga", "Lisbon");
      await settle(page);
      const m = await measure(page);
      ruled(m, where, 300);
      expect(m.count, where).toBeGreaterThan(60);
      expect(m.pieces, where).toBeGreaterThanOrEqual(1);
    }
  });
}

test("the first screen has a flower, a real picture and both town boxes", async ({ page }) => {
  test.setTimeout(120_000);
  for (const [width, height] of [
    [1440, 900],
    [375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    for (const prefix of ["", "/es"]) {
      await page.goto(`${prefix}${TOOL}`);
      await settle(page);
      const m = await measure(page);
      expect(m.decorInView, `${prefix} ${width}`).toBeGreaterThanOrEqual(1);
      expect(m.picturesInView, `${prefix} ${width}`).toBeGreaterThanOrEqual(1);
    }
  }
  const boxesIn = () => page.locator("[data-halfway-tool] [role=combobox]").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().bottom <= innerHeight));
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(TOOL);
  expect(await boxesIn()).toEqual([true, true]);
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(TOOL);
  expect((await boxesIn())[0]).toBe(true);
});

test("nothing moves when the answer arrives", async ({ page }) => {
  await mockTowns(page);
  for (const [width, height] of [
    [375, 812],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(TOOL);
    const at = () => page.evaluate(() => [document.querySelector("[data-halfway-tool] + p")!, document.querySelector("[data-way] img")!].map((el) => Math.round(el.getBoundingClientRect().top + scrollY)));
    await settle(page);
    const before = await at();
    await towns(page, "Riga", "Lisbon");
    await page.waitForTimeout(400);
    const after = await at();
    for (const i of [0, 1]) expect(Math.abs(after[i] - before[i]), `${width}: ${["the label", "the first picture"][i]}`).toBeLessThanOrEqual(1);
  }
});

for (const [width, height] of MATCH_SIZES) {
  test(`${width}×${height}: the matcher on /trips, before and after a tap`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.clock.install({ time: new Date("2026-11-15T12:00:00Z") });
    await page.route("https://tiles.openfreemap.org/**", (r) => r.abort());
    await page.setViewportSize({ width, height });
    const locales = (width === 320 && height === 568) || (width === 1440 && height === 900) ? ["", "/es"] : [""];
    for (const prefix of locales) {
      const where = `${prefix}/trips ${width}`;
      await page.goto(`${prefix}/trips`);
      await page.locator("#match").scrollIntoViewIfNeeded();
      await settle(page);
      ruled(await measure(page, "#match"), `${where} before`, 80);
      await page.locator("#match").getByRole("combobox", { name: prefix ? "Salimos de" : "Leaving from" }).fill("Rig");
      await page.getByRole("option", { name: /Riga · RIX/ }).click();
      await page.locator("[data-match-go]").click();
      await expect(page.locator("#match [data-pick]")).toHaveCount(3);
      await settle(page);
      ruled(await measure(page, "#match"), `${where} after`, 170);
    }
  });
}

test("on a phone a set of cards is one row, one to a screen, with dots; on a desk they stand side by side", async ({ page }) => {
  await mockTowns(page);
  const check = async (row: string, count: number, phone: boolean) => {
    const cards = await page.locator(`${row} > li`).evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ left: r.left, right: r.right, top: Math.round(r.top) })));
    expect(cards).toHaveLength(count);
    const dots = page.locator(`${row} ~ [data-dots]`);
    if (phone) {
      expect(cards.filter((r) => r.left >= 0 && r.right <= 376)).toHaveLength(1);
      await expect(dots.locator("span")).toHaveCount(count);
    } else {
      expect(new Set(cards.map((c) => c.top)).size).toBe(1);
      await expect(dots).toBeHidden();
    }
  };
  for (const [width, height, phone] of [
    [375, 812, true],
    [1440, 900, false],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(TOOL);
    await check("#halfway-ways-row", 3, phone);
    await page.goto("/long-distance");
    await typeTown(page, "Where you are", "Riga");
    await typeTown(page, "Where they are", "Lisbon");
    await expect(page.getByTestId("meet-ways")).toBeVisible();
    await check("#meet-ways-row", 2, phone);
  }
});

test("the pages are whole, and the same height, when no picture arrives", async ({ page, context }) => {
  test.setTimeout(120_000);
  for (const [width, height] of [
    [1440, 900],
    [375, 812],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(TOOL);
    await settle(page);
    const tall = await page.evaluate(() => document.documentElement.scrollHeight);
    const bare = await context.newPage();
    await bare.route(/\/(art|trips|templates|dates)\/.*\.(webp|jpg|png)(\?.*)?$/, (r) => r.abort());
    await bare.setViewportSize({ width, height });
    await bare.goto(TOOL);
    await settle(bare);
    const m = await bare.evaluate(() => ({ height: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
    expect(Math.abs(m.height - tall), `${width}`).toBeLessThanOrEqual(2);
    expect(m.overflow).toBeLessThanOrEqual(0);
    for (const title of await bare.locator("[data-way] a > span:last-child").all()) await expect(title).toBeVisible();

    await bare.clock.install({ time: new Date("2026-11-15T12:00:00Z") });
    await bare.goto("/trips#match");
    await bare.locator("[data-match-go]").click();
    for (const name of await bare.locator("#match [data-pick] a > span:last-child").all()) await expect(name).toBeVisible();
    await bare.close();
  }
});

test("at the system's largest type and at 200% zoom nothing is cut off or pushed off the page", async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 450 });
  await page.goto(`/es${TOOL}`);
  await page.addStyleTag({ content: "html { font-size: 125% !important; }" });
  await settle(page);
  const m = await measure(page);
  expect(m.overflow).toBeLessThanOrEqual(0);
  expect(m.overlaps).toEqual([]);

  await page.clock.install({ time: new Date("2026-11-15T12:00:00Z") });
  await page.goto("/es/trips");
  await page.addStyleTag({ content: "html { font-size: 125% !important; }" });
  await page.locator("[data-match-go]").click();
  await expect(page.locator("#match [data-pick]")).toHaveCount(3);
  await settle(page);
  const t = await measure(page, "#match");
  expect(t.overflow).toBeLessThanOrEqual(0);
  expect(t.overlaps).toEqual([]);
  // The sentence's choices are never wider than the column.
  const wide = await page.locator("[data-match-sentence] select").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().right > el.closest("[data-trip-matcher]")!.getBoundingClientRect().right + 1).length);
  expect(wide).toBe(0);
});

test("an iPhone in Safari: nothing off the side, the choices a thumb tall, no zoom on focus", async ({ baseURL }) => {
  test.setTimeout(150_000);
  const browser = await webkit.launch();
  try {
    const origin = new URL(baseURL ?? "http://localhost:3000").origin;
    const context = await browser.newContext({ ...devices["iPhone 13"], baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    const page = await context.newPage();
    for (const path of [TOOL, `/es${TOOL}`]) {
      await page.goto(path);
      await expect(page.locator("[data-halfway-tool]")).toBeVisible();
      const m = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        fonts: [...document.querySelectorAll("[data-halfway-tool] input")].map((el) => parseFloat(getComputedStyle(el).fontSize)),
      }));
      expect(m.overflow, path).toBeLessThanOrEqual(0);
      for (const size of m.fonts) expect(size, path).toBeGreaterThanOrEqual(16);
    }
    await page.goto("/trips");
    await page.locator("#match").scrollIntoViewIfNeeded();
    const selects = await page.locator("#match select").evaluateAll((els) => els.map((el) => ({ height: el.getBoundingClientRect().height, font: parseFloat(getComputedStyle(el).fontSize) })));
    expect(selects).toHaveLength(3);
    for (const s of selects) {
      expect(s.height).toBeGreaterThanOrEqual(44);
      expect(s.font).toBeGreaterThanOrEqual(16);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await page.locator("[data-match-go]").tap();
    await expect(page.locator("#match [data-pick]").first()).toBeVisible();
    await context.close();
  } finally {
    await browser.close();
  }
});
