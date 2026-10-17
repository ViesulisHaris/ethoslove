import { expect, test, type Page } from "@playwright/test";

/** Past the loading screen, to the shut box and its key. */
async function arrive(page: Page, path = "/demo/music-box") {
  await page.goto(path);
  const key = page.locator("[data-key]");
  await expect(key).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(500);
  return key;
}

/** Wound from the keyboard: a quarter turn a press, twelve presses. */
async function windWithKeys(page: Page, presses = 12) {
  await page.locator("[data-key]").focus();
  for (let i = 0; i < presses; i++) {
    await page.keyboard.press(i % 2 ? "Enter" : "ArrowRight");
    await page.waitForTimeout(150);
  }
}

/** A finger going round the key: `turns` circles, drawn in small steps. */
async function circle(page: Page, turns: number) {
  const box = (await page.locator("[data-key]").boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const r = box.width * 0.38;
  await page.mouse.move(cx + r, cy);
  await page.mouse.down();
  for (let i = 1; i <= turns * 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    await page.mouse.move(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  await page.mouse.up();
}

test.describe("Music Box", () => {
  test("winds with a finger, plays with the photos in the mirror, and ends on the letter", async ({ page }) => {
    test.setTimeout(120_000);
    await arrive(page);
    await expect(page.getByText(/circle it with your finger/i)).toBeVisible();
    await circle(page, 2);
    await expect(page.getByText(/1 of 3 turns/i)).toBeVisible();
    await circle(page, 2);
    // Wound: the tune starts, the first photo comes up in the mirror with its caption underneath.
    await expect(page.locator("[data-key]")).toHaveCount(0, { timeout: 5000 });
    await expect(page.getByText("Swan Lake · Tchaikovsky")).toBeVisible();
    await expect(page.getByText("the café where it started")).toBeVisible({ timeout: 8000 });
    // A tap on the mirror shows the photo close. The lid is still swinging up for a moment, so the
    // tap is retried until it lands on the glass rather than where the glass was.
    await expect(page.getByRole("button", { name: "the café where it started" })).toBeVisible();
    const close = page.getByRole("button", { name: /close/i });
    await expect(async () => {
      await page.locator("[data-mirror]").click({ force: true, timeout: 2000 });
      await expect(close).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 15000 });
    await close.click();
    // The spring runs down and the letter lifts out of the velvet.
    const letter = page.locator("[data-letter]");
    await expect(letter).toBeVisible({ timeout: 60000 });
    await letter.click({ force: true });
    await expect(page.getByText(/dear clara/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/in the mirror/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /send leo a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("winds from the keyboard, and a held thumb winds it too", async ({ page }) => {
    await arrive(page);
    await windWithKeys(page, 4);
    await expect(page.getByText(/1 of 3 turns/i)).toBeVisible();
    // Hold it still: it keeps winding until the spring is full.
    const box = (await page.locator("[data-key]").boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(page.locator("[data-key]")).toHaveCount(0, { timeout: 8000 });
    await page.mouse.up();
    await expect(page.getByText("Swan Lake · Tchaikovsky")).toBeVisible();
  });

  test("speaks Spanish", async ({ page }) => {
    await arrive(page, "/es/demo/music-box");
    await expect(page.getByText(/dale cuerda/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /dar cuerda a la llave/i })).toBeVisible();
    await windWithKeys(page);
    await expect(page.getByText("El lago de los cisnes · Chaikovski")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("el café donde empezó todo")).toBeVisible({ timeout: 8000 });
  });

  test("works without motion: the lid is already open and the letter still comes", async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await arrive(page);
    // Open from the start, the mirror empty until it plays.
    await expect(page.getByText("the café where it started")).toHaveCount(0);
    await windWithKeys(page);
    await expect(page.getByText("the café where it started")).toBeVisible({ timeout: 8000 });
    const letter = page.locator("[data-letter]");
    await expect(letter).toBeVisible({ timeout: 60000 });
    // A keyboard user lands on the letter.
    await expect(letter).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByText(/dear clara/i)).toBeVisible({ timeout: 10000 });
  });
});
