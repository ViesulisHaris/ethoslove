import { expect, test } from "@playwright/test";

/**
 * No page scrolls sideways on a phone. The review of 22 Nov 2026 found /dates 17px too wide at 390:
 * the "Where are you two?" screen is a grid whose one column took the width of the search box's
 * shortest line (383px in a 350px page). The live site rarely shows that screen, because it knows
 * the visitor's town; a visitor it cannot place got the sideways scroll. This is that screen (a test
 * has no town), with the pages that share its parts, at the widths phones come in.
 */
const PAGES = ["/dates", "/es/dates", "/", "/gifts", "/templates", "/trips", "/long-distance", "/gifts/finder"];
const WIDTHS = [320, 360, 390, 414];

// One browser is enough for a layout that sets its own sizes.
test.skip(({ isMobile }) => isMobile, "sets its own screen sizes");

for (const path of PAGES) {
  test(`${path} does not scroll sideways on a phone`, async ({ page }) => {
    await page.setViewportSize({ width: WIDTHS[0], height: 740 });
    await page.goto(path);
    await expect(page.locator("main h1").first()).toBeVisible({ timeout: 60_000 });
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 740 });
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(null)))));
      const over = await page.evaluate(() => {
        const root = document.documentElement;
        const extra = root.scrollWidth - root.clientWidth;
        if (extra <= 0) return null;
        // Name the widest thing, so a failure says what to fix.
        let widest: Element | null = null;
        let right = root.clientWidth;
        for (const el of document.querySelectorAll("main *")) {
          const r = el.getBoundingClientRect();
          if (r.right > right + 0.5 && r.width > 0) {
            right = r.right;
            widest = el;
          }
        }
        return `${extra}px: ${widest ? `${widest.tagName.toLowerCase()}.${String(widest.getAttribute("class") ?? "").slice(0, 80)}` : "nothing in main"}`;
      });
      expect(over, `${path} at ${width}px`).toBeNull();
    }
  });
}

test("the dates page's search box fits its screen with room for a town's name", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/dates");
  const field = page.getByRole("combobox").first();
  await expect(field).toBeVisible({ timeout: 60_000 });
  const box = await field.boundingBox();
  // Still a field to type in: at least a dozen characters wide beside the pin and "Near me".
  expect(box!.width).toBeGreaterThan(110);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
});
