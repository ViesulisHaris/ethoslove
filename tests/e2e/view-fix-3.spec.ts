import { expect, test } from "@playwright/test";
import { mockWorld } from "./dates-world";

/**
 * The third fix round on the preview (docs/marketing/growth-build/reports/view-fix-3-brief.md): the
 * Dates pages, once growth/dates was merged in. Each test holds one finding, named by its number.
 * The places, the forecast and the map's style come from dates-world.ts, never from the outside.
 */

test.describe("rooms-1: Back from a Dates search leaves no search on another page's address", () => {
  test("/ > Dates > New York > the map > Back, Back, reload, Back", async ({ page }) => {
    test.setTimeout(120_000);
    await mockWorld(page);
    const seen: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) seen.push(frame.url());
    });
    const offDates = () => {
      const all = [...seen, page.url()];
      return all.filter((href) => {
        const url = new URL(href);
        return !/^\/(es\/)?dates$/.test(url.pathname) && (url.searchParams.has("lat") || url.searchParams.has("q"));
      });
    };

    await page.goto("/");
    await page.getByRole("link", { name: "or find a date idea instead" }).first().click();
    await expect(page).toHaveURL(/\/dates$|\/dates\?/);
    await page.locator("main").getByRole("link", { name: "New York", exact: true }).first().click();
    await expect(page).toHaveURL(/\/dates\/new-york/);
    await page.getByRole("link", { name: "Open the map in New York" }).first().click();
    await expect(page).toHaveURL(/\/dates\?.*lat=/);
    await expect(page.getByRole("button", { name: /^Livraria do Bairro/ }).first()).toBeVisible({ timeout: 30_000 });

    await page.goBack();
    await page.waitForTimeout(800);
    await page.goBack();
    await page.waitForTimeout(800);
    await page.reload();
    await page.waitForTimeout(1500);
    await page.goBack();
    await page.waitForTimeout(1500);
    expect(new URL(page.url()).pathname).toBe("/");
    // The explorer may still be on its way out: give it the time it used to need to write.
    await page.waitForTimeout(1000);
    expect(offDates()).toEqual([]);
    await page.reload();
    expect(new URL(page.url()).search).toBe("");
  });
});

test.describe("rooms-3: a city page's hero at 1440", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test("its flowers lie whole inside it, and its ground fades into the page's", async ({ page }) => {
    for (const path of ["/dates/london", "/es/dates/lisbon", "/dates/new-york"]) {
      await page.goto(path);
      const hero = page.locator("main section").first();
      const frame = hero.locator("[data-floral-frame]");
      await expect(frame).toHaveAttribute("data-floral-frame", "bandHero");
      const out = await frame.evaluate((box) => {
        const band = box.getBoundingClientRect();
        return [...box.querySelectorAll("img")]
          .map((img) => ({ r: img.getBoundingClientRect(), shown: getComputedStyle(img).display !== "none" }))
          .filter(({ r, shown }) => shown && r.left < band.left + band.width / 2 && r.bottom > band.bottom + 1)
          .map(({ r }) => Math.round(r.bottom - band.bottom));
      });
      expect(out, path).toEqual([]);
      const gap = await hero.evaluate((section) => {
        const fade = section.querySelector("[data-hero-fade]");
        return fade ? Math.abs(section.getBoundingClientRect().bottom - fade.getBoundingClientRect().bottom) : null;
      });
      expect(gap, path).not.toBeNull();
      expect(gap!, path).toBeLessThanOrEqual(1);
    }
  });
});
