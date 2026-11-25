import { test } from "@playwright/test";
import { measure, settle } from "./page-design";
const PAGES = (process.env.ZZ_PAGES ?? "").split(",").filter(Boolean);
test.skip(({ isMobile }) => isMobile, "own sizes");
test("words", async ({ page }) => {
  test.setTimeout(600_000);
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    await page.setViewportSize({ width: w, height: h });
    for (const where of PAGES) {
      await page.context().clearCookies();
      await page.goto("/" + where.replace(/^\/+/, ""));
      await settle(page);
      const m = await measure(page);
      console.log(`WORDS ${w} ${where} ${m.count} overflow=${m.overflow} overlaps=${m.overlaps.length} small=${JSON.stringify(m.small).slice(0, 200)} smallest=${m.smallest}`);
    }
  }
});
