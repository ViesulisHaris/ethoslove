import { expect, test, type Page } from "@playwright/test";

/** Past the loading screen, to the booth with its curtain drawn. */
async function arrive(page: Page, path = "/demo/photo-booth") {
  await page.goto(path);
  const curtain = page.locator("[data-curtain]");
  await curtain.waitFor({ timeout: 25000 });
  await page.waitForTimeout(600);
  return curtain;
}

/**
 * One press of the big red button, once it is lit, until pose `n`'s lamp comes on. A press only
 * counts while the button is lit, so it is pressed again only if it is still lit and nothing
 * started: a lost tap, never a second pose.
 */
async function pose(page: Page, n: number) {
  const button = page.locator("[data-booth-button]");
  const lamps = page.locator("[data-lamp=on]");
  await expect(button).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
  await expect(async () => {
    if ((await lamps.count()) < n && (await button.getAttribute("aria-disabled")) === "false") await button.click({ force: true });
    await expect(lamps).toHaveCount(n, { timeout: 5000 });
  }).toPass({ timeout: 30000 });
}

/** Four presses of the big red button, each once it is lit again, each lighting one more lamp. */
async function fourPoses(page: Page) {
  for (let i = 1; i <= 4; i++) await pose(page, i);
}

/** The strip is out of the slot and can be taken. */
async function stripOut(page: Page) {
  const strip = page.locator("[data-strip]");
  await expect(strip).toHaveAttribute("tabindex", "0", { timeout: 20000 });
  return strip;
}

async function toTheEnd(page: Page) {
  await page.locator("[data-scroller]").evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
}

test.describe("Photo Booth", () => {
  test("pull the curtain, four flashes, and the strip lands on the wall", async ({ page }) => {
    test.setTimeout(120_000);
    const curtain = await arrive(page);
    await expect(page.getByText("pull the curtain", { exact: true })).toBeVisible();
    await expect(page.getByText("Maya", { exact: true }).first()).toBeVisible();
    await curtain.click({ force: true });

    const button = page.locator("[data-booth-button]");
    await expect(button).toHaveAttribute("aria-disabled", "false", { timeout: 10000 });
    await expect(page.getByText("press the button", { exact: true })).toBeVisible();
    await expect(page.locator("[data-mirror=live]")).toBeVisible();

    // The first pose, beat by beat: a countdown in the mirror, then the picture frozen in it.
    await button.click({ force: true });
    await expect(page.locator("[data-count]")).toBeVisible({ timeout: 2000 });
    await expect(page.locator("[data-mirror=frozen]")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("[data-lamp=on]")).toHaveCount(1);
    await expect(page.getByText("again!", { exact: true })).toBeVisible({ timeout: 5000 });

    for (let i = 2; i <= 4; i++) await pose(page, i);

    const strip = await stripOut(page);
    await expect(page.getByText("tap the strip", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(strip.locator("img")).toHaveCount(4);
    await strip.click({ force: true });

    await expect(page.locator("[data-stage=wall]")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("my favourite blur")).toBeVisible();
    await expect(page.getByText("Dear Maya,")).toBeVisible();
    // The strip on the wall opens its photos large.
    await page.getByRole("button", { name: /lisbon, lost on purpose/i }).first().click();
    await expect(page.getByRole("button", { name: /close/i })).toBeVisible();
    await page.getByRole("button", { name: /close/i }).click();

    await toTheEnd(page);
    await expect(page.getByRole("button", { name: /send leo a reaction/i })).toBeVisible({ timeout: 60000 });
  });

  test("the curtain can be dragged open, and falls back if let go too soon", async ({ page }) => {
    const curtain = await arrive(page);
    const box = (await curtain.boundingBox())!;
    const y = box.y + box.height * 0.7;
    // A nudge: it swings back shut.
    await page.mouse.move(box.x + box.width * 0.8, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.7, y, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(700);
    await expect(page.locator("[data-stage=outside]")).toBeVisible();
    // A real pull: it runs open and the camera goes in.
    await page.mouse.move(box.x + box.width * 0.85, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.15, y, { steps: 10 });
    await page.mouse.up();
    await expect(page.locator("[data-booth-button]")).toHaveAttribute("aria-disabled", "false", { timeout: 10000 });
  });

  test("speaks Spanish", async ({ page }) => {
    test.setTimeout(120_000);
    const curtain = await arrive(page, "/es/demo/photo-booth");
    await expect(page.getByText("corre la cortina", { exact: true })).toBeVisible();
    await expect(page.getByText("reservado para")).toBeVisible();
    await curtain.click({ force: true });
    await expect(page.getByText("pulsa el botón", { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("mira aquí")).toBeVisible();
    await fourPoses(page);
    const strip = await stripOut(page);
    await expect(page.getByText("toca la tira", { exact: true })).toBeVisible({ timeout: 10000 });
    await strip.click({ force: true });
    await expect(page.getByText("mi borrón favorito")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Hola, Maya:")).toBeVisible();
  });

  test("without motion: no countdown, no flash, the strip already printed", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const curtain = await arrive(page);
    await curtain.click({ force: true });
    const button = page.locator("[data-booth-button]");
    await expect(button).toHaveAttribute("aria-disabled", "false", { timeout: 3000 });
    await button.click({ force: true });
    // The shutter goes the moment it is pressed.
    await expect(page.locator("[data-mirror=frozen]")).toBeVisible({ timeout: 1000 });
    await expect(page.locator("[data-count]")).toHaveCount(0);
    for (let i = 2; i <= 4; i++) await pose(page, i);
    const strip = await stripOut(page);
    await strip.click({ force: true });
    await expect(page.locator("[data-stage=wall]")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("my favourite blur")).toBeVisible();
  });

  test("works from the keyboard: Space and Enter press whatever comes next", async ({ page }) => {
    test.setTimeout(120_000);
    await arrive(page);
    await page.keyboard.press("Space");
    const button = page.locator("[data-booth-button]");
    await expect(button).toBeFocused({ timeout: 10000 });
    for (let i = 1; i <= 4; i++) {
      await expect(button).toHaveAttribute("aria-disabled", "false", { timeout: 20000 });
      await page.keyboard.press(i % 2 ? "Enter" : "Space");
      await expect(page.locator("[data-lamp=on]")).toHaveCount(i, { timeout: 20000 });
    }
    const strip = await stripOut(page);
    await expect(strip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-stage=wall]")).toBeVisible({ timeout: 10000 });
  });
});
