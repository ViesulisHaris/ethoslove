import { expect, test, type Page } from "@playwright/test";

/**
 * Pack Your Bags, end to end, as a recipient plays it: pack every clue into the case, open the
 * departures board, take the ticket and tear its stub off to get to the letter. In English (a
 * flight to Santorini) and Spanish (a road trip through Tuscany), by tap, by drag, from the
 * keyboard, and with motion turned down; then what a sender sees in the editor.
 */

/** Fails the test on any uncaught error in the page. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return () => expect(errors, errors.join("\n")).toEqual([]);
}

const board = (page: Page) => page.getByTestId("pyb-board");
const pass = (page: Page) => page.getByTestId("pyb-pass");

async function openDemo(page: Page, path: string, firstClue: string) {
  await page.goto(path);
  // Generous: against a dev server this may be the first compile of the template's chunk.
  await expect(page.getByRole("button", { name: firstClue })).toBeVisible({ timeout: 60_000 });
}

/** Taps every tag into the case, then waits for the lid, the zip and the tag on the handle. */
async function packAll(page: Page, where: string) {
  const clues = page.getByTestId("pyb-clue");
  const count = await clues.count();
  expect(count).toBeGreaterThan(0);
  for (let i = 0; i < count; i++) {
    const clue = clues.nth(i);
    await clue.click();
    await expect(clue).toBeDisabled();
  }
  await expect(page.getByRole("button", { name: where })).toBeVisible({ timeout: 10_000 });
}

async function tapThrough(page: Page, where: string, next: string) {
  await page.getByRole("button", { name: where }).click();
  await expect(board(page)).toBeVisible({ timeout: 5_000 });
  await expect(board(page)).toHaveAttribute("data-resolved", "true", { timeout: 20_000 });
  await page.getByRole("button", { name: next }).click();
  await expect(pass(page)).toBeVisible({ timeout: 5_000 });
}

test.describe("Pack Your Bags: the recipient", () => {
  test("packs the case, reads the board, tears the ticket and gets the whole gift", async ({ page }) => {
    test.setTimeout(150_000);
    const noErrors = watchErrors(page);
    await openDemo(page, "/demo/pack-your-bags", "Pack the white linen shirt");

    await expect(page.getByRole("heading", { name: "Pack your bags, Hannah." })).toBeVisible();
    await expect(page.getByText("Everything you'll need. Where to? Not yet.", { exact: true })).toBeVisible();
    await expect(page.getByTestId("pyb-clue")).toHaveCount(3);
    await expect(page.getByRole("button", { name: "Pack your passport (it's in the drawer)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pack sun cream, the strong one" })).toBeVisible();

    await packAll(page, "Where to?");
    await expect(page.getByRole("heading", { name: "All packed, Hannah." })).toBeVisible();
    // The tag on the handle: when, how long, and not where.
    await expect(page.getByText("Fri 16 Oct", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("4 nights", { exact: true })).toBeAttached();
    await expect(page.getByText("to: ? ? ?", { exact: true })).toBeAttached();

    await page.getByRole("button", { name: "Where to?" }).click();
    await expect(page.getByRole("heading", { name: "Where are we going?" })).toBeVisible({ timeout: 5_000 });
    await expect(board(page)).toHaveAttribute("data-resolved", "false");
    await expect(board(page)).toHaveAttribute("data-resolved", "true", { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "We're going to Santorini." })).toBeVisible();
    // What a screen reader hears once it lands: the countdown's 07:40 and a seeded gate.
    await expect(page.getByText(/^Santorini\. Gate [A-H]\d{1,2}, 07:40\. Boarding\.$/)).toBeAttached();

    await page.getByRole("button", { name: "Your boarding pass" }).click();
    const ticket = pass(page);
    await expect(ticket).toBeVisible({ timeout: 5_000 });
    await expect(ticket).toHaveAttribute("data-torn", "false");
    for (const text of ["Boarding pass", "LHR", "JTR", "London", "Santorini", "Hannah", "Rory", "07:10", "07:40"]) await expect(ticket.getByText(text, { exact: true }).first()).toBeVisible();
    await expect(ticket.getByText(/^\d{1,2}A · \d{1,2}B$/).first()).toBeVisible();
    await expect(ticket.getByText(/^\d{1,3}(,\d{3})* km · about \d+ h( \d+ min)? in the air$/)).toBeVisible();

    await page.getByRole("button", { name: "Tear off the stub" }).click();
    await expect(ticket).toHaveAttribute("data-torn", "true");
    await expect(page.getByTestId("pyb-message")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: "Dear Hannah," })).toBeVisible();
    await expect(page.getByText("Everyone does.")).toBeVisible({ timeout: 60_000 });

    for (const caption of ["the sea in july. next one's warmer", "lisbon. you navigated. we don't talk about it", "no signal, no plans. again soon"]) {
      await expect(page.getByText(caption, { exact: true })).toBeAttached();
    }
    await expect(page.getByText("Until we fly", { exact: true })).toBeAttached();
    await expect(page.getByText("The end. For now.", { exact: true })).toBeAttached();
    await page.getByRole("button", { name: /Send Rory a reaction/ }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: /Send Rory a reaction/ })).toBeVisible();

    // And back to the open case.
    await page.getByRole("button", { name: "Watch again" }).click();
    await expect(page.getByRole("heading", { name: "Pack your bags, Hannah." })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Pack the white linen shirt" })).toBeEnabled();
    noErrors();
  });

  test("the stub tears when it's pulled down far enough, and springs back when it isn't", async ({ page }) => {
    test.setTimeout(90_000);
    const noErrors = watchErrors(page);
    await openDemo(page, "/demo/pack-your-bags", "Pack the white linen shirt");
    await packAll(page, "Where to?");
    await tapThrough(page, "Where to?", "Your boarding pass");
    // Let the ticket finish sliding up before taking hold of it.
    await page.waitForTimeout(1_500);

    const stub = page.getByTestId("pyb-stub");
    const box = (await stub.boundingBox())!;
    const x = box.x + box.width * 0.6;
    const y = box.y + box.height * 0.5;

    // A little tug: not enough.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 14, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    await expect(pass(page)).toHaveAttribute("data-torn", "false");

    // A real pull.
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + box.height * 1.6, { steps: 12 });
    await page.mouse.up();
    await expect(pass(page)).toHaveAttribute("data-torn", "true");
    await expect(page.getByRole("heading", { name: "Dear Hannah," })).toBeVisible({ timeout: 10_000 });
    noErrors();
  });

  test("can be played from the keyboard alone", async ({ page }) => {
    test.setTimeout(90_000);
    await openDemo(page, "/demo/pack-your-bags", "Pack the white linen shirt");
    for (const name of ["Pack your passport (it's in the drawer)", "Pack the white linen shirt", "Pack sun cream, the strong one"]) {
      await page.getByRole("button", { name }).focus();
      await page.keyboard.press("Enter");
    }
    const where = page.getByRole("button", { name: "Where to?" });
    await expect(where).toBeVisible({ timeout: 10_000 });
    await where.focus();
    await page.keyboard.press("Enter");
    await expect(board(page)).toHaveAttribute("data-resolved", "true", { timeout: 20_000 });
    const next = page.getByRole("button", { name: "Your boarding pass" });
    await next.focus();
    await page.keyboard.press("Enter");
    const stub = page.getByRole("button", { name: "Tear off the stub" });
    await expect(stub).toBeVisible({ timeout: 5_000 });
    await stub.focus();
    await page.keyboard.press("Enter");
    await expect(pass(page)).toHaveAttribute("data-torn", "true");
    await expect(page.getByRole("heading", { name: "Dear Hannah," })).toBeVisible({ timeout: 10_000 });
  });

  test("the Spanish demo is a road trip through Tuscany, in Spanish", async ({ page }) => {
    test.setTimeout(120_000);
    const noErrors = watchErrors(page);
    await openDemo(page, "/es/demo/pack-your-bags", "Meter gafas de sol");
    await expect(page.getByRole("heading", { name: "Haz la maleta, Lucía." })).toBeVisible();
    await expect(page.getByText("Todo lo que vas a necesitar. ¿Adónde? Todavía no.", { exact: true })).toBeVisible();
    for (const name of ["Meter tu chaqueta vaquera", "Meter hambre de pasta"]) await expect(page.getByRole("button", { name })).toBeVisible();

    await packAll(page, "¿Adónde?");
    await expect(page.getByRole("heading", { name: "Maleta hecha, Lucía." })).toBeVisible();
    await expect(page.getByText("vie 23 oct", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("3 noches", { exact: true })).toBeAttached();

    await page.getByRole("button", { name: "¿Adónde?" }).click();
    await expect(page.getByRole("heading", { name: "¿Adónde vamos?" })).toBeVisible({ timeout: 5_000 });
    await expect(board(page)).toHaveAttribute("data-resolved", "true", { timeout: 25_000 });
    await expect(page.getByRole("heading", { name: "Nos vamos a Montepulciano." })).toBeVisible();
    await expect(page.getByText("Montepulciano. 3 noches", { exact: true })).toBeAttached();

    await page.getByRole("button", { name: "Tu hoja de ruta" }).click();
    const ticket = pass(page);
    await expect(ticket).toBeVisible({ timeout: 5_000 });
    for (const text of ["Hoja de ruta", "Florencia", "Greve in Chianti", "Siena", "Pienza", "Montepulciano", "Lucía", "Andrés", "Válido para dos"]) await expect(ticket.getByText(text, { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Arrancar el resguardo" }).click();
    await expect(ticket).toHaveAttribute("data-torn", "true");
    await expect(page.getByRole("heading", { name: "Hola, Lucía:" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("aunque sea lo de siempre.")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Hasta que arranquemos", { exact: true })).toBeAttached();
    await expect(page.getByText("Fin. Por ahora.", { exact: true })).toBeAttached();
    noErrors();
  });
});

test.describe("Pack Your Bags: reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("everything lands at once, and the stub simply goes", async ({ page }) => {
    test.setTimeout(90_000);
    const noErrors = watchErrors(page);
    await openDemo(page, "/demo/pack-your-bags", "Pack the white linen shirt");
    await packAll(page, "Where to?");
    await page.getByRole("button", { name: "Where to?" }).click();
    // No clatter: the board is already on the destination.
    await expect(board(page)).toHaveAttribute("data-resolved", "true", { timeout: 3_000 });
    await expect(page.getByRole("heading", { name: "We're going to Santorini." })).toBeVisible();
    await page.getByRole("button", { name: "Your boarding pass" }).click();
    await page.getByRole("button", { name: "Tear off the stub" }).click();
    await expect(page.getByRole("heading", { name: "Dear Hannah," })).toBeVisible({ timeout: 5_000 });
    // The typewriter stands down too: the letter is there whole.
    await expect(page.getByText("Everyone does.")).toBeVisible({ timeout: 5_000 });
    noErrors();
  });
});

test.describe("Pack Your Bags: the editor", () => {
  test.skip(({ isMobile }) => isMobile, "the side-by-side preview is the desktop layout");
  test.use({ viewport: { width: 1280, height: 1000 } });

  test("asks for the trip first, and the preview is the ticket for that trip", async ({ page }) => {
    const noErrors = watchErrors(page);
    await page.goto("/create/pack-your-bags");
    const group = page.getByText("The trip", { exact: true });
    await expect(group).toBeVisible({ timeout: 30_000 });
    const groupBox = await group.boundingBox();
    const wordsBox = await page.getByRole("heading", { name: "Your words" }).boundingBox();
    expect(groupBox!.y).toBeLessThan(wordsBox!.y);

    const trip = page.getByRole("radiogroup", { name: "Trip" });
    for (const option of ["Plane", "Road trip", "Train"]) await expect(trip.getByRole("radio", { name: option })).toBeVisible();
    await expect(trip.getByRole("radio", { name: "Plane" })).toHaveAttribute("aria-checked", "true");

    // The editor keeps a second, hidden preview for phones; only the one on screen counts.
    const preview = page.locator('[data-testid="pyb-pass"]:visible');
    await expect(preview).toContainText("Boarding pass");
    await expect(preview).toContainText("RIX");
    await expect(preview).toContainText("LIS");

    await trip.getByRole("radio", { name: "Train" }).click();
    await expect(preview).toContainText("Train ticket");
    await trip.getByRole("radio", { name: "Road trip" }).click();
    await expect(preview).toContainText("Admit two");
    noErrors();
  });
});
