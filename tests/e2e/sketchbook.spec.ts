import { expect, test, type Page } from "@playwright/test";

/** Past the loading screen, to the shut book. */
async function arrive(page: Page, path = "/demo/sketchbook") {
  await page.goto(path);
  const book = page.getByRole("button", { name: /open the sketchbook|abre el cuaderno/i });
  await book.waitFor({ timeout: 25000 });
  await page.waitForTimeout(600);
  return book;
}

const next = (page: Page) => page.locator("[data-turn=next]");

test.describe("Sketchbook", () => {
  test("opens on the cake, turns through the photos to the letter, and back", async ({ page }) => {
    const book = await arrive(page);
    await book.click({ force: true });
    await expect(page.getByRole("heading", { name: /happy birthday/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("1 / 5")).toBeVisible();
    await page.waitForTimeout(1200);
    await next(page).click({ force: true });
    await expect(page.getByText("2 / 5")).toBeVisible();
    await expect(page.getByText(/last year's candles/i)).toBeVisible({ timeout: 5000 });
    // A swipe turns the page too, and the left edge goes back.
    await page.locator("[data-turn=back]").click({ force: true });
    await expect(page.getByText("1 / 5")).toBeVisible();
    for (let i = 0; i < 4; i++) {
      await next(page).click({ force: true, timeout: 5000 });
      await page.waitForTimeout(900);
    }
    await expect(page.getByText("5 / 5")).toBeVisible();
    await expect(next(page)).toHaveCount(0);
    await expect(page.getByText(/dear ana/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /send marco a reaction/i })).toBeVisible({ timeout: 60000 });
  });

  test("the keyboard turns the pages", async ({ page }) => {
    const book = await arrive(page);
    await book.click({ force: true });
    await expect(page.getByText("1 / 5")).toBeVisible({ timeout: 10000 });
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText("2 / 5")).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("1 / 5")).toBeVisible();
  });

  test("speaks Spanish", async ({ page }) => {
    const book = await arrive(page, "/es/demo/sketchbook");
    await book.click({ force: true });
    await expect(page.getByRole("heading", { name: /feliz cumple/i })).toBeVisible({ timeout: 10000 });
  });

  test("works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const book = await arrive(page);
    await book.click({ force: true });
    await expect(page.getByRole("heading", { name: /happy birthday/i })).toBeVisible({ timeout: 10000 });
    for (let i = 0; i < 4; i++) await next(page).click({ force: true, timeout: 5000 });
    await expect(page.getByText(/dear ana/i)).toBeVisible({ timeout: 10000 });
  });
});
