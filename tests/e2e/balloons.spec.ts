import { expect, test, type Page } from "@playwright/test";

/** Past the cover and its loading screen, to the room. */
async function enter(page: Page, path = "/demo/balloons") {
  await page.goto(path);
  const cover = page.getByRole("button", { name: /tap to open|toca para abrir/i });
  await cover.first().waitFor({ timeout: 25000 });
  await page.waitForTimeout(800);
  await cover.first().click({ force: true });
  await page.locator("[data-balloon]").first().waitFor({ timeout: 15000 });
  // The balloons float in over a few seconds. A person taps wherever a balloon is at that
  // moment; a script decides where to click before it clicks, so it waits for them to settle.
  await page.waitForTimeout(3200);
}

const others = (page: Page) => page.locator("[data-balloon]:not([data-letter])");

test.describe("Balloons", () => {
  test("pops every balloon, and the last one opens the letter", async ({ page }) => {
    await enter(page);
    // The letter waits for the others: tapping it first only wobbles it.
    await page.locator("[data-letter]").click({ force: true });
    await expect(page.getByText(/pop the others first/i)).toBeVisible();
    await expect(page.locator("[data-letter]")).toHaveCount(1);

    const count = await others(page).count();
    expect(count).toBeGreaterThanOrEqual(7);
    for (let i = 0; i < count; i++) {
      await others(page).first().click({ force: true, timeout: 5000 });
      await page.waitForTimeout(250);
    }
    await expect(others(page)).toHaveCount(0);
    // Every photo balloon left a polaroid on the floor.
    await expect(page.getByRole("button", { name: /coffee that started it/i })).toBeVisible();

    await page.locator("[data-letter]").click({ force: true });
    await expect(page.getByText(/dear ana/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/what fell out/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /send marco a reaction/i })).toBeVisible({ timeout: 60000 });
  });

  test("a fallen photo opens large, and closes", async ({ page }) => {
    await enter(page);
    await others(page).first().click({ force: true });
    const photo = page.getByRole("button", { name: /last year's cake/i });
    await expect(photo).toBeVisible();
    await page.waitForTimeout(1400);
    await photo.click({ force: true });
    const large = page.locator("figure img");
    await expect(large).toBeVisible();
    // A tap on the dark round the photo closes it. The corner of the gift, that is: the corner of
    // the page is the demo's own bar, which is not part of the gift and closes nothing.
    const gift = (await page.locator(".gift-root").boundingBox())!;
    await page.mouse.click(gift.x + 12, gift.y + 12);
    await expect(large).toBeHidden();
  });

  test("speaks Spanish", async ({ page }) => {
    await enter(page, "/es/demo/balloons");
    await expect(page.getByText(/toca un globo para explotarlo/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /abrir la carta/i })).toHaveCount(1);
  });

  test("works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await enter(page);
    const count = await others(page).count();
    for (let i = 0; i < count; i++) await others(page).first().click({ force: true, timeout: 5000 });
    await page.locator("[data-letter]").click({ force: true });
    await expect(page.getByText(/dear ana/i)).toBeVisible({ timeout: 10000 });
  });
});
