import { expect, test, type Page } from "@playwright/test";

/** Presses the template's own opener and waits for the page to be there to scroll. */
async function openPage(page: Page, path: string, opener: RegExp) {
  await page.goto(path);
  await page.getByRole("button", { name: opener }).click({ force: true, timeout: 25000 });
  const scroller = page.locator("[data-scroller]");
  await scroller.waitFor({ timeout: 10000 });
  // The first screen arrives a piece at a time.
  await page.waitForTimeout(2200);
  return scroller;
}

/** Scrolls the collage to its foot, a screen at a time, the way a thumb does. */
async function scrollToEnd(page: Page) {
  const scroller = page.locator("[data-scroller]");
  for (let i = 0; i < 14; i++) {
    const done = await scroller.evaluate((el) => {
      el.scrollBy({ top: el.clientHeight * 0.85 });
      return el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    });
    await page.waitForTimeout(220);
    if (done) break;
  }
}

test.describe("Coquette", () => {
  test("unties the bow, shows the collage, and scrolls down to the letter", async ({ page }) => {
    await openPage(page, "/demo/coquette", /untie the bow/i);
    await expect(page.getByText("Elena").first()).toBeVisible();
    await expect(page.getByText(/ticket to happiness/i)).toBeVisible();
    await expect(page.getByText(/every good day i've had since/i)).toBeVisible();
    await expect(page.getByText("Golden Hour").first()).toBeVisible();
    await scrollToEnd(page);
    await expect(page.getByText(/dear elena/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send sam a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("the song on the card really pauses, and a photo opens large", async ({ page }) => {
    await openPage(page, "/demo/coquette", /untie the bow/i);
    await page.getByRole("button", { name: /pause the song/i }).click({ force: true });
    await expect(page.getByRole("button", { name: /play the song/i })).toBeVisible();
    await page.getByRole("button", { name: /our first coffee/i }).click({ force: true });
    await expect(page.locator("figure img")).toBeVisible();
    await page.getByRole("button", { name: /^close$/i }).click({ force: true });
    await expect(page.locator("figure img")).toBeHidden();
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPage(page, "/es/demo/coquette", /desata el lazo/i);
    await expect(page.getByText(/billete a la felicidad/i)).toBeVisible();
    await expect(page.getByText(/mi persona favorita/i)).toBeAttached();
  });
});

test.describe("XOXO", () => {
  test("opens the envelope and scrolls from the headline to the letter", async ({ page }) => {
    await openPage(page, "/demo/xoxo", /open it/i);
    await expect(page.getByText(/you walked in like it was nothing/i)).toBeVisible();
    await expect(page.locator("[data-mark]").first()).toBeVisible();
    await scrollToEnd(page);
    await expect(page.getByText(/dear dani/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send sam a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("a tap on the page leaves a kiss, a tap on a photo opens it instead", async ({ page }) => {
    const scroller = await openPage(page, "/demo/xoxo", /open it/i);
    const box = (await scroller.boundingBox())!;
    // Top middle of the first screen: lace and wall, nothing to press.
    await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.12);
    await expect(page.locator("[data-kiss]")).toHaveCount(1);
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.16);
    await expect(page.locator("[data-kiss]")).toHaveCount(2);
    await page.getByRole("button", { name: /us, 4pm, no plans/i }).click({ force: true });
    await expect(page.locator("figure img")).toBeVisible();
    await expect(page.locator("[data-kiss]")).toHaveCount(2);
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPage(page, "/es/demo/xoxo", /ábrelo/i);
    await expect(page.getByText(/entraste como si nada/i)).toBeVisible();
    await expect(page.getByText(/toca donde quieras para dejar un beso/i)).toBeAttached();
  });
});

test.describe("Keepsake", () => {
  test("breaks the seal, opens the locket, and scrolls to the letter", async ({ page }) => {
    await openPage(page, "/demo/keepsake", /break the seal/i);
    await expect(page.getByText("My dearest,").first()).toBeVisible();
    await expect(page.getByText("Happiness", { exact: true })).toBeAttached();
    const locket = page.locator("[data-locket]");
    await locket.scrollIntoViewIfNeeded();
    await expect(locket).toHaveAttribute("aria-expanded", "false");
    await locket.click({ force: true });
    await expect(locket).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("since 2021")).toBeAttached();
    await expect(page.getByRole("button", { name: /close the locket/i })).toBeVisible();
    await scrollToEnd(page);
    await expect(page.getByText(/dear elena/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send sam a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("the locket works from the keyboard", async ({ page }) => {
    await openPage(page, "/demo/keepsake", /break the seal/i);
    const locket = page.locator("[data-locket]");
    await locket.focus();
    await page.keyboard.press("Enter");
    await expect(locket).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Enter");
    await expect(locket).toHaveAttribute("aria-expanded", "false");
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPage(page, "/es/demo/keepsake", /rompe el sello/i);
    await expect(page.getByText("Mi vida,").first()).toBeVisible();
    await expect(page.getByText("Felicidad", { exact: true })).toBeAttached();
  });
});
