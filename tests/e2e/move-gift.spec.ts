import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

// Any real JPEG will do; the editor compresses it like a photo off a phone.
const PHOTO = { name: "bus-stop.jpg", mimeType: "image/jpeg", buffer: readFileSync(path.join(process.cwd(), "public/templates/bouquet/poster.jpg")) };

// The photo's tile in the form: dnd-kit makes it a button, named by the file it came from.
const photoTile = (page: Page) => page.getByRole("button", { name: "bus-stop", exact: true });

async function startLetter(page: Page, url: string, words: { to: string; from: string; message: string }) {
  await page.goto(url);
  await expect(page.locator("#recipientName")).toBeVisible({ timeout: 60_000 });
  await page.locator("#recipientName").fill(words.to);
  await page.locator("#senderName").fill(words.from);
  await page.locator("#message").fill(words.message);
}

async function expectWords(page: Page, words: { to: string; from: string; message: string }) {
  await expect(page.locator("#recipientName")).toHaveValue(words.to, { timeout: 60_000 });
  await expect(page.locator("#senderName")).toHaveValue(words.from);
  await expect(page.locator("#message")).toHaveValue(words.message);
}

test.describe("moving a free gift into a premium template", () => {
  test("the letter's names, words and photo go into a Bouquet, and the letter stays as it was", async ({ page }) => {
    test.setTimeout(150_000);
    const words = { to: "Sam", from: "Alex", message: "Remember the bus that never came? I'd wait for it again." };
    await startLetter(page, "/create/the-letter", words);
    await page.locator('input[type=file][accept*="image"]').first().setInputFiles(PHOTO);
    await expect(photoTile(page)).toBeVisible({ timeout: 30_000 });

    const offer = page.getByTestId("move-offer");
    await expect(offer.getByRole("heading", { name: "Same words, a bigger moment" })).toBeVisible();
    await expect(offer).toContainText(/(€9\.99|\$11\.99) once, when you send it/);
    await expect(offer).toContainText("The Letter stays here, free");
    await offer.getByRole("button", { name: "Move it to Bouquet" }).click();

    await expect(page).toHaveURL(/\/create\/bouquet\?from=the-letter$/, { timeout: 30_000 });
    await expectWords(page, words);
    await expect(page.getByTestId("moved-note")).toContainText("Moved over from The Letter");
    await expect(photoTile(page)).toBeVisible();
    // A premium template has nothing to move into.
    await expect(page.getByTestId("move-offer")).toHaveCount(0);

    // It is a draft of its own: it survives a reload.
    await page.reload();
    await expectWords(page, words);
    await expect(photoTile(page)).toBeVisible();

    // And the letter is still there, untouched, one tap back.
    await page.getByTestId("moved-note").getByRole("link", { name: "Back to The Letter" }).click();
    await expect(page).toHaveURL(/\/create\/the-letter$/);
    await expectWords(page, words);
    await expect(photoTile(page)).toBeVisible();
  });

  test("in Spanish too, and a “not now” puts it away", async ({ page }) => {
    test.setTimeout(150_000);
    const words = { to: "Lucía", from: "Dani", message: "Aún guardo el ticket del autobús que nunca llegó." };
    await startLetter(page, "/es/create/the-letter", words);
    const offer = page.getByTestId("move-offer");
    await expect(offer.getByRole("heading", { name: "Las mismas palabras, un momento más grande" })).toBeVisible();
    await expect(offer).toContainText("La carta se queda aquí, gratis");
    await offer.getByRole("button", { name: "Pasarlo a XOXO" }).click();

    await expect(page).toHaveURL(/\/es\/create\/xoxo\?from=the-letter$/, { timeout: 30_000 });
    await expectWords(page, words);
    await expect(page.getByTestId("moved-note")).toContainText("Viene de La carta");

    await page.goto("/es/create/constellations");
    const again = page.getByTestId("move-offer");
    await expect(again).toBeVisible({ timeout: 60_000 });
    await again.getByRole("button", { name: "Ahora no" }).click();
    await expect(again).toHaveCount(0);
    await page.reload();
    await expect(page.locator("#recipientName")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("move-offer")).toHaveCount(0);
  });
});
