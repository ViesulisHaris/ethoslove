import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Picnic, as the person it's for opens it: the basket, one thing at a time with its tag, the
 * parcel with the date in it just before the note, the letter, and back to the blanket. In
 * Spanish from the keyboard, with motion turned down (all of it laid out at once), and in the
 * editor, where the still frame is the picnic half unpacked. Nothing is published.
 */

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return () => expect(errors, errors.join("\n")).toEqual([]);
}

/** The demo, past its loading screen, with the basket waiting. */
async function openDemo(page: Page, path: string) {
  await page.goto(path);
  const scene = page.getByTestId("picnic-scene");
  await expect(scene).toBeVisible({ timeout: 30_000 });
  return scene;
}

/** Taps the scene (away from anything that answers a tap of its own) until it asks for `label`. */
async function tapUntil(scene: Locator, label: RegExp, most = 20) {
  for (let i = 0; i < most; i++) {
    if (label.test((await scene.getAttribute("aria-label")) ?? "")) return;
    await scene.click({ force: true, position: { x: 24, y: 90 } });
    await scene.page().waitForTimeout(250);
  }
  await expect(scene).toHaveAttribute("aria-label", label);
}

test.describe("picnic", () => {
  test("they open the basket, take everything out, unwrap the date and read the note", async ({ page }) => {
    test.setTimeout(150_000);
    const noErrors = watchErrors(page);
    const scene = await openDemo(page, "/demo/picnic");
    await expect(page.getByText("no reason, just a picnic")).toBeVisible();
    await expect(scene).toHaveAttribute("aria-label", "tap the basket");
    // Nothing is out before the lid is open.
    await expect(page.getByText("the way you eat the strawberries first")).toHaveCount(0);

    await scene.click({ force: true, position: { x: 24, y: 90 } });
    await expect(scene).toHaveAttribute("aria-label", "tap for the next thing");
    await scene.click({ force: true, position: { x: 24, y: 90 } });
    await expect(page.getByText("the way you eat the strawberries first")).toBeVisible();

    // One tap, one thing: the rest of the tags, and the photos with their captions.
    await tapUntil(scene, /tap to unwrap it/);
    for (const line of ["how you tie cherry stems in knots to show off", "your terrible playlist. i know it by heart", "you still bring me flowers on a tuesday", "you always save me the window seat", "you cut my crusts off and pretend you didn't"]) await expect(page.getByText(line)).toBeVisible();
    await expect(page.getByText("lisbon, lost on purpose")).toBeVisible();
    await expect(page.getByText("ticket to happiness")).toBeVisible();

    // The date comes out of the basket before the note, and opens over the blanket.
    await scene.click({ force: true, position: { x: 24, y: 90 } });
    const plan = page.getByTestId("picnic-plan");
    await expect(plan).toBeVisible();
    const card = plan.getByTestId("unwrap-card");
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card).toHaveAttribute("data-kind", "date");
    await expect(card.getByRole("heading", { name: "This Saturday" })).toBeVisible();
    await expect(card.getByText("The cherry tree on the hill")).toBeVisible();
    await plan.getByRole("button", { name: "Close" }).click();
    await expect(plan).toBeHidden();

    await expect(scene).toHaveAttribute("aria-label", "tap for the next thing");
    await scene.click({ force: true, position: { x: 24, y: 90 } });
    await expect(scene).toHaveAttribute("aria-label", "tap to read the note");
    await expect(page.getByText("for Lola")).toBeVisible();
    await scene.click({ force: true, position: { x: 24, y: 90 } });

    await expect(page.getByRole("heading", { name: "Dear Lola," })).toBeVisible();
    await expect(page.getByText("The end. For now.")).toBeVisible({ timeout: 60_000 });
    // The date came out of the basket: the end screen doesn't wrap it up a second time.
    await expect(page.getByTestId("unwrap")).toHaveCount(0);

    // Back to the blanket, where the photos open large and the note opens again.
    await page.getByRole("button", { name: "Back to the picnic" }).click();
    await expect(page.getByRole("heading", { name: "Dear Lola," })).toBeHidden();
    await expect(scene).toHaveAttribute("aria-label", "tap to read it again");
    await page.getByTestId("picnic-photo").and(page.getByRole("button", { name: "lisbon, lost on purpose" })).click();
    await expect(page.locator("figcaption", { hasText: "lisbon, lost on purpose" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await page.getByTestId("picnic-note").click();
    await expect(page.getByRole("heading", { name: "Dear Lola," })).toBeVisible();
    noErrors();
  });

  test("en español, con el teclado", async ({ page }) => {
    test.setTimeout(120_000);
    const noErrors = watchErrors(page);
    const scene = await openDemo(page, "/es/demo/picnic");
    await expect(page.getByText("sin motivo, solo un pícnic")).toBeVisible();
    await expect(scene).toHaveAttribute("aria-label", "toca la cesta");

    await page.keyboard.press("Enter");
    await expect(scene).toHaveAttribute("aria-label", "toca para sacar otra cosa");
    await page.keyboard.press(" ");
    await expect(page.getByText("cómo te comes las fresas antes que nada")).toBeVisible();
    for (let i = 0; i < 20 && (await scene.getAttribute("aria-label")) !== "toca para abrirlo"; i++) {
      await page.keyboard.press(" ");
      await page.waitForTimeout(200);
    }
    await expect(scene).toHaveAttribute("aria-label", "toca para abrirlo");
    await expect(page.getByText("que me quites la corteza del pan y lo niegues")).toBeVisible();
    await expect(page.getByText("billete a la felicidad")).toBeVisible();

    await page.keyboard.press("Enter");
    const plan = page.getByTestId("picnic-plan");
    await expect(plan.getByRole("heading", { name: "Este sábado" })).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");
    await expect(plan).toBeHidden();

    await page.keyboard.press(" ");
    await expect(scene).toHaveAttribute("aria-label", "toca para leer la nota");
    await expect(page.getByText("para Lola")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Hola, Lola:" })).toBeVisible();
    await expect(page.getByText("Fin. Por ahora.")).toBeVisible({ timeout: 60_000 });
    noErrors();
  });

  test("with motion turned down, the whole picnic is laid out at once", async ({ page }) => {
    test.setTimeout(90_000);
    const noErrors = watchErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const scene = await openDemo(page, "/demo/picnic");
    // No tapping: every tag, the photos, the parcel and the note are already on the blanket.
    for (const line of ["the way you eat the strawberries first", "you cut my crusts off and pretend you didn't", "july, when everything was slow"]) await expect(page.getByText(line)).toBeVisible();
    await expect(page.getByText("for Lola")).toBeVisible();
    await expect(scene).toHaveAttribute("aria-label", "tap to read the note");

    await page.getByRole("button", { name: "A present from Teo. Unwrap it" }).click();
    const plan = page.getByTestId("picnic-plan");
    await expect(plan.getByTestId("unwrap-card")).toBeVisible({ timeout: 2_000 });
    await plan.getByRole("button", { name: "Close" }).click();
    await expect(plan).toBeHidden();

    await scene.click({ force: true, position: { x: 24, y: 90 } });
    await expect(page.getByRole("heading", { name: "Dear Lola," })).toBeVisible();
    // Without motion the letter is set at once, and the end is right there under it.
    await expect(page.getByText("The end. For now.")).toBeVisible({ timeout: 10_000 });
    noErrors();
  });

  test("in the editor, the still frame is the picnic half unpacked, with the sender's own lines", async ({ page, isMobile }) => {
    test.setTimeout(120_000);
    const noErrors = watchErrors(page);
    await page.goto("/create/picnic");
    await expect(page.locator("#recipientName")).toBeVisible({ timeout: 60_000 });
    await page.locator("#recipientName").fill("Nora");
    await page.locator("#senderName").fill("Sam");
    await expect(page.getByText("The little tags")).toBeVisible();
    const lines = page.getByTestId("list-item");
    await lines.first().fill("your cold feet on my legs");
    await lines.first().press("Enter");
    await lines.nth(1).fill("the face you make at crosswords");
    await lines.nth(1).press("Enter");
    await lines.nth(2).fill("sunday pancakes");

    if (isMobile) await page.getByRole("tab", { name: "Preview" }).click();
    const frame = page.locator("[data-template=picnic]").locator("visible=true");
    await expect(frame).toBeVisible({ timeout: 30_000 });
    // Three lines, no photos: two things out of the basket, the third still inside.
    await expect(frame.getByText("your cold feet on my legs")).toBeVisible();
    await expect(frame.getByText("the face you make at crosswords")).toBeVisible();
    await expect(frame.getByText("sunday pancakes")).toHaveCount(0);
    // A still frame: nothing to tap in it.
    await expect(frame.getByTestId("picnic-scene")).toHaveCount(0);
    noErrors();
  });
});
