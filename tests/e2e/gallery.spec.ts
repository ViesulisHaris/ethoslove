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

  test("“Sort by” puts the whole gallery in one list, newest first or by name, and keeps the order in the address", async ({ page }) => {
    await page.goto("/templates");
    const sort = page.locator("[data-gallery-sort]");
    await expect(sort).toHaveValue("popular");
    await sort.selectOption("new");
    await expect(page).toHaveURL(/[?&]sort=new/);
    await expect(page.locator("[data-shelf]")).toHaveCount(1);
    const newest = await page.locator("[data-shelf] h3").allTextContents();
    // The catalogue is listed in the order its gifts were added: the last one in is the first one shown.
    expect(newest[0]).toBe("Gingerbread House");
    expect(newest.at(-1)).toBe("The Letter");
    await sort.selectOption("az");
    await expect(page).toHaveURL(/[?&]sort=az/);
    const names = await page.locator("[data-shelf] h3").allTextContents();
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
    expect(new Set(names).size).toBe(newest.length);
    // A reload keeps the order; the default order leaves the address as it was.
    await page.reload();
    await expect(page.locator("[data-gallery-sort]")).toHaveValue("az");
    await page.locator("[data-gallery-sort]").selectOption("popular");
    await expect(page).not.toHaveURL(/sort=/);
    await expect(page.locator("[data-shelf]")).toHaveCount(3);
  });

  test("an occasion is a tile with its own picture, and a card is one link to the gift's own page", async ({ page, request }) => {
    await page.goto("/templates");
    const tiles = page.locator("[data-occasion-tile]");
    await expect(tiles).toHaveCount(14);
    await expect(page.locator("[data-occasion-tile=all]")).toHaveAttribute("aria-current", "page");
    // Every tile's picture exists.
    const srcs = await tiles.locator("img").evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src")!));
    for (const src of srcs) expect((await request.get(src)).ok(), src).toBe(true);
    // A tile is at least a thumb's size.
    for (const box of await tiles.evaluateAll((all) => all.map((el) => el.getBoundingClientRect()).map((r) => ({ w: r.width, h: r.height })))) {
      expect(box.w).toBeGreaterThanOrEqual(44);
      expect(box.h).toBeGreaterThanOrEqual(44);
    }
    await page.locator("[data-occasion-tile=birthday]").click();
    // A dev server builds the occasion's page the first time it is asked for.
    await expect(page).toHaveURL(new RegExp("/occasions/birthday$"), { timeout: 60_000 });
    await expect(page.locator("[data-occasion-tile=birthday]")).toHaveAttribute("aria-current", "page");
    // An occasion's page keeps its own order, so it has no "Sort by".
    await expect(page.locator("[data-gallery-sort]")).toHaveCount(0);
    const card = page.locator("[data-gallery-card]").first();
    const slug = await card.getAttribute("data-gallery-card");
    await expect(card.getByRole("link")).toHaveCount(1);
    await card.getByRole("link").click();
    // A dev server builds the gift's page the first time it is asked for.
    await expect(page).toHaveURL(new RegExp(`/templates/${slug}$`), { timeout: 60_000 });
  });
});
