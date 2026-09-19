import { expect, test, type Page } from "@playwright/test";

/** Past the loading screen, to the closed card. */
async function arrive(page: Page, path = "/demo/popup-card") {
  await page.goto(path);
  const card = page.getByRole("button", { name: /open the card|abre la tarjeta/i });
  await card.waitFor({ timeout: 25000 });
  await page.waitForTimeout(600);
  return card;
}

async function openAndLight(page: Page) {
  const card = await arrive(page);
  await card.click({ force: true });
  const candles = page.locator("[data-candle]");
  await expect(candles.first()).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(2200);
  const n = await candles.count();
  for (let i = 0; i < n; i++) {
    await candles.nth(i).click({ force: true, timeout: 5000 });
    await page.waitForTimeout(150);
  }
  return n;
}

async function blow(page: Page) {
  const vp = page.viewportSize()!;
  await page.mouse.move(vp.width / 2, vp.height * 0.7);
  await page.mouse.down();
  await page.mouse.move(vp.width / 2, vp.height * 0.3, { steps: 8 });
  await page.mouse.up();
}

test.describe("Pop-up Card", () => {
  test("opens, lights five candles, blows them out and reads the letter", async ({ page }) => {
    const n = await openAndLight(page);
    expect(n).toBe(5);
    await expect(page.getByText(/make a wish/i)).toBeVisible();
    await blow(page);
    // Two buttons say "read the letter" now, the lid and the pill; the pill is the one that appeared.
    const read = page.locator("[data-read-pill]");
    await expect(read).toBeVisible({ timeout: 8000 });
    await read.click({ force: true });
    await expect(page.getByText(/dear ana/i).last()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /send marco a reaction/i })).toBeVisible({ timeout: 60000 });
  });

  test("the lid opens the letter early too", async ({ page }) => {
    const card = await arrive(page);
    await card.click({ force: true });
    const lid = page.getByRole("button", { name: /read the letter/i });
    await expect(lid).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2200);
    await lid.click({ force: true });
    await expect(page.getByText(/the photos/i)).toBeVisible({ timeout: 10000 });
  });

  test("speaks Spanish", async ({ page }) => {
    await arrive(page, "/es/demo/popup-card");
    await expect(page.getByText(/abre la tarjeta/i).first()).toBeVisible();
  });

  test("works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openAndLight(page);
    await blow(page);
    await page.locator("[data-read-pill]").click({ force: true, timeout: 8000 });
    await expect(page.getByText(/dear ana/i).last()).toBeVisible({ timeout: 10000 });
  });
});
