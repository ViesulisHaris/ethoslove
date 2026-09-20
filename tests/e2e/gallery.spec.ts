import { expect, test } from "@playwright/test";

test.describe("the template gallery", () => {
  test("opens on the best sellers, then what is new with the cats first, then the rest", async ({ page }) => {
    await page.goto("/templates");
    const shelves = page.locator("[data-shelf]");
    await expect(shelves).toHaveCount(3);
    await expect(page.getByRole("heading", { level: 2, name: /the ones people send most/i })).toBeVisible();

    const popular = page.locator("[data-shelf=popular]");
    await expect(popular.getByRole("heading", { level: 3 })).toHaveText(["The Letter", "Birthday Cinema", "Bouquet", "Constellations"]);
    await expect(popular.getByText("Most loved")).toHaveCount(4);

    const fresh = page.locator("[data-shelf=new]");
    await expect(fresh.getByRole("heading", { level: 3 }).first()).toHaveText("Party Animals");
    await expect(fresh.getByRole("heading", { level: 3 }).nth(1)).toHaveText("The Council");
    await expect(fresh.getByRole("heading", { level: 3, name: "Coquette" })).toBeVisible();

    // Nothing is listed twice.
    const names = await page.locator("[data-shelf] h3").allTextContents();
    expect(new Set(names).size).toBe(names.length);
  });

  test("the free filter leaves only the shelf that still has something on it", async ({ page }) => {
    await page.goto("/templates");
    await page.getByRole("button", { name: "Free", exact: true }).click();
    await expect(page.locator("[data-shelf]")).toHaveCount(1);
    await expect(page.locator("[data-shelf=popular] h3")).toHaveText(["The Letter", "Constellations"]);
  });

  test("an occasion's page keeps its own order, without shelves, in Spanish too", async ({ page }) => {
    await page.goto("/es/occasions/birthday");
    await expect(page.locator("[data-shelf]")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2, name: /las que más se envían/i })).toHaveCount(0);
    await page.goto("/es/templates");
    await expect(page.getByRole("heading", { level: 2, name: /las que más se envían/i })).toBeVisible();
    await expect(page.getByText("Nueva", { exact: true }).first()).toBeVisible();
  });
});
