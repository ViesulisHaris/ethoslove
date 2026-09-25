import { expect, test, type Page } from "@playwright/test";

/**
 * Digicam, as a recipient: switch the camera on, go through the roll with the pad, a swipe, the
 * keyboard and the shutter, open a photo large, and print the roll; in both languages and with
 * motion turned down. Then what a sender sets in the editor.
 */

/** The camera's screen: a button named for the photo on it. */
const screen = (page: Page) => page.getByRole("button", { name: /^(photo|foto) \d+ (of|de) \d+/i });

/** Fails the test on any uncaught error in the page. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return () => expect(errors, errors.join("\n")).toEqual([]);
}

async function turnOn(page: Page, path: string, power: RegExp) {
  await page.goto(path);
  // The power button pulses, so it is never "stable"; generous, as this may be the chunk's first compile.
  await page.getByRole("button", { name: power }).click({ force: true, timeout: 60_000 });
  // The screen is there from the start, round the back; it takes a tap once the camera has said hello.
  await expect(screen(page)).toBeEnabled({ timeout: 20_000 });
}

/** The shutter is busy for a moment after each picture, as a real one is. */
async function shoot(page: Page, label: RegExp) {
  await page.getByRole("button", { name: label }).click({ force: true });
  await page.waitForTimeout(800);
}

async function scrollToEnd(page: Page) {
  const scroller = page.locator("[data-scroller]");
  for (let i = 0; i < 24; i++) {
    const done = await scroller.evaluate((el) => {
      el.scrollBy({ top: el.clientHeight * 0.8 });
      return el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    });
    await page.waitForTimeout(250);
    if (done) break;
  }
}

test.describe("Digicam", () => {
  test("turns on, goes through the roll by the pad and a swipe, and prints it", async ({ page }) => {
    test.setTimeout(120_000);
    const noErrors = watchErrors(page);
    await turnOn(page, "/demo/digicam", /turn the camera on/i);
    await expect(page.getByRole("heading", { name: "happy birthday" })).toBeVisible();
    await expect(screen(page)).toHaveAccessibleName(/photo 1 of 6: your cake, last year/i);

    await page.getByRole("button", { name: "Next photo" }).click({ force: true });
    await expect(screen(page)).toHaveAccessibleName(/photo 2 of 6: lisbon, missed the tram/i);
    await page.getByRole("button", { name: "Previous photo" }).click({ force: true });
    await expect(screen(page)).toHaveAccessibleName(/photo 1 of 6/i);
    // The roll stops at its first photo rather than going round.
    await page.getByRole("button", { name: "Previous photo" }).click({ force: true });
    await expect(screen(page)).toHaveAccessibleName(/photo 1 of 6/i);

    // A swipe to the left on the screen is the next photo, and doesn't open it.
    const box = (await screen(page).boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.15, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(screen(page)).toHaveAccessibleName(/photo 2 of 6/i);
    await expect(page.locator("figure img")).toHaveCount(0);

    // Every press of the shutter takes the next one; the print button waits for the last.
    await expect(page.getByRole("button", { name: "Print the photos" })).toBeDisabled();
    for (let n = 3; n <= 6; n++) {
      await shoot(page, /take a picture/i);
      await expect(screen(page)).toHaveAccessibleName(new RegExp(`photo ${n} of 6`, "i"));
    }
    await expect(page.getByRole("button", { name: "Print the photos" })).toBeEnabled();
    await shoot(page, /take a picture/i);

    // The roll comes out as prints, one a photo, then the letter and the end.
    for (const caption of ["your cake, last year", "nube's first day home", "you left this in my book"]) await expect(page.getByRole("button", { name: caption, exact: true })).toBeAttached({ timeout: 15_000 });
    await expect(page.getByText("IMG_0007.JPG")).toHaveCount(0);
    await scrollToEnd(page);
    await expect(page.getByText(/dear nora/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send leo a reaction/i })).toBeVisible({ timeout: 30_000 });
    noErrors();
  });

  test("a tap on the screen opens the photo large, and a print does too", async ({ page }) => {
    test.setTimeout(90_000);
    await turnOn(page, "/demo/digicam", /turn the camera on/i);
    await screen(page).click({ force: true });
    const close = page.getByRole("button", { name: "Close" });
    await expect(close).toBeVisible();
    await expect(page.locator("figure figcaption")).toHaveText("your cake, last year");
    await page.keyboard.press("Escape");
    await expect(close).toBeHidden();
    // The print button, on the last photo, prints as the shutter does.
    for (let n = 2; n <= 6; n++) await page.getByRole("button", { name: "Next photo" }).click({ force: true });
    await expect(screen(page)).toHaveAccessibleName(/photo 6 of 6/i);
    await page.getByRole("button", { name: "Print the photos" }).click({ force: true });
    const print = page.getByRole("button", { name: "the 23:40 to you", exact: true });
    await expect(print).toBeAttached({ timeout: 15_000 });
    await print.scrollIntoViewIfNeeded();
    await print.click({ force: true });
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
    // The print's own caption has its file name beside it; the one opened large is the caption alone.
    await expect(page.locator("figure figcaption", { hasText: /^the 23:40 to you$/ })).toBeVisible();
  });

  test("works from the keyboard: Enter to switch on and to shoot, the arrows to look", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/demo/digicam");
    await expect(page.getByRole("button", { name: /turn the camera on/i })).toBeVisible({ timeout: 60_000 });
    await page.keyboard.press("Enter");
    await expect(screen(page)).toBeEnabled({ timeout: 20_000 });
    // The camera hands the focus to its shutter once it is on.
    await expect(page.getByRole("button", { name: /take a picture/i })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(screen(page)).toHaveAccessibleName(/photo 2 of 6/i);
    await page.keyboard.press("Enter");
    await expect(screen(page)).toHaveAccessibleName(/photo 3 of 6/i);
    await page.keyboard.press("ArrowLeft");
    await expect(screen(page)).toHaveAccessibleName(/photo 2 of 6/i);
  });

  test("speaks Spanish, prints the date the Spanish way, and works without motion", async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await turnOn(page, "/es/demo/digicam", /enciende la cámara/i);
    await expect(page.getByRole("heading", { name: "feliz cumple" })).toBeVisible();
    await expect(screen(page)).toHaveAccessibleName(/foto 1 de 6: tu tarta, el año pasado/i);
    for (let n = 2; n <= 6; n++) {
      await shoot(page, /hacer una foto/i);
      await expect(screen(page)).toHaveAccessibleName(new RegExp(`foto ${n} de 6`, "i"));
    }
    await shoot(page, /hacer una foto/i);
    await expect(page.getByRole("button", { name: "lo dejaste en mi libro", exact: true })).toBeAttached({ timeout: 15_000 });
    await scrollToEnd(page);
    await expect(page.getByText("Hola, Nora:")).toBeAttached();
    await expect(page.getByRole("button", { name: /envíale una reacción a leo/i })).toBeVisible({ timeout: 30_000 });
  });

  test("Watch again puts the camera back in its box, switched off", async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await turnOn(page, "/demo/digicam", /turn the camera on/i);
    for (let n = 2; n <= 7; n++) await shoot(page, /take a picture/i);
    await expect(page.getByRole("button", { name: "you left this in my book", exact: true })).toBeAttached({ timeout: 15_000 });
    await scrollToEnd(page);
    await page.getByRole("button", { name: /watch again/i }).click({ force: true, timeout: 30_000 });
    await expect(page.getByRole("button", { name: /turn the camera on/i })).toBeVisible();
    await page.getByRole("button", { name: /turn the camera on/i }).click({ force: true });
    await expect(screen(page)).toBeEnabled({ timeout: 20_000 });
    await expect(screen(page)).toHaveAccessibleName(/photo 1 of 6/i);
  });
});

test.describe("Digicam in the editor", () => {
  test.skip(({ isMobile }) => isMobile, "the side-by-side preview is the desktop layout");
  test.use({ viewport: { width: 1280, height: 1000 } });

  test("the camera is asked for under the names, and the date is picked from a calendar only while there is a stamp", async ({ page }) => {
    const noErrors = watchErrors(page);
    await page.goto("/create/digicam");
    await expect(page.getByText("The camera", { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("switch", { name: "It's their birthday" })).toBeChecked();
    const colours = page.getByRole("radiogroup", { name: "Its colour" });
    for (const body of ["Baby pink", "Silver", "Lilac", "Black"]) await expect(colours.getByRole("radio", { name: body })).toBeVisible();
    await colours.getByRole("radio", { name: "Lilac" }).click();
    await expect(colours.getByRole("radio", { name: "Lilac" })).toHaveAttribute("aria-checked", "true");
    const date = page.getByRole("button", { name: /the date on the photos/i });
    await expect(date).toHaveAccessibleName(/automatic/i);
    await date.click();
    await page.getByRole("button", { name: "Today", exact: true }).click();
    await expect(date).not.toHaveAccessibleName(/automatic/i);
    await page.getByRole("switch", { name: "Date stamp" }).click();
    await expect(date).toBeHidden();
    // The preview is the camera, on, on its first photo; with no photos yet, as a camera says it.
    await expect(page.locator('[data-template="digicam"]').first()).toBeVisible();
    noErrors();
  });
});
