import { expect, test } from "@playwright/test";

test.describe("the template gallery", () => {
  test("opens on the premium best sellers, then what is new, newest batch first, then the rest", async ({ page }) => {
    await page.goto("/templates");
    const shelves = page.locator("[data-shelf]");
    await expect(shelves).toHaveCount(3);
    await expect(page.getByRole("heading", { level: 2, name: /the best sellers/i })).toBeVisible();

    const popular = page.locator("[data-shelf=popular]");
    await expect(popular.getByRole("heading", { level: 3 })).toHaveText(["Bouquet", "XOXO", "Birthday Cinema", "The Council"]);
    await expect(popular.getByText("Most loved")).toHaveCount(4);

    // NEW_SLUGS in src/config/featured.ts, in its order: change both when the next batch ships.
    const fresh = page.locator("[data-shelf=new]");
    await expect(fresh.getByRole("heading", { level: 3 })).toHaveText(["The Nice List", "Unwrapped", "Snow Globe", "Frosted Window", "String the Lights", "Gingerbread House", "Light the Candles", "Wishbone"]);
    // An older arrival is back in the catalogue below, and so is last season's batch.
    await expect(page.locator("[data-shelf=all]").getByRole("heading", { level: 3, name: "Party Animals" })).toBeVisible();
    await expect(page.locator("[data-shelf=all]").getByRole("heading", { level: 3, name: "Bat Swarm" })).toBeVisible();
    await expect(page.locator("[data-shelf=all]").getByRole("heading", { level: 3, name: "Coquette" })).toBeVisible();

    // Nothing is listed twice.
    const names = await page.locator("[data-shelf] h3").allTextContents();
    expect(new Set(names).size).toBe(names.length);
  });

  test("offers the gift finder above the filters, for someone who can't choose", async ({ page }) => {
    await page.goto("/templates");
    const finder = page.locator("main").getByRole("link", { name: "Answer two questions" });
    await expect(finder).toBeVisible();
    await expect(finder).toHaveAttribute("href", "/gifts/finder");
    const link = await finder.boundingBox();
    const filters = await page.getByRole("link", { name: "All occasions" }).boundingBox();
    expect(link!.y + link!.height).toBeLessThanOrEqual(filters!.y);
    // The gallery under it is as it was: three shelves, the best sellers first.
    await expect(page.locator("[data-shelf]")).toHaveCount(3);
  });

  test("the free filter leaves only the shelf that still has something on it", async ({ page }) => {
    await page.goto("/templates");
    await page.getByRole("button", { name: "Free", exact: true }).click();
    await expect(page.locator("[data-shelf]")).toHaveCount(1);
    await expect(page.locator("[data-shelf=all] h3")).toHaveText(["The Letter", "Constellations"]);
  });

  test("an occasion's page keeps its own order, without shelves, in Spanish too", async ({ page }) => {
    await page.goto("/es/occasions/birthday");
    await expect(page.locator("[data-shelf]")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2, name: /las más vendidas/i })).toHaveCount(0);
    await page.goto("/es/templates");
    await expect(page.getByRole("heading", { level: 2, name: /las más vendidas/i })).toBeVisible();
    await expect(page.getByText("Nueva", { exact: true }).first()).toBeVisible();
  });
});
