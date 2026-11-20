import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * The Letter's send screen in its "keep" version (lib/editor/keep-split.ts): the note shown with
 * and without the sender's photos, the step that takes the photos out offering to keep them in the
 * note for less ("a note with photos"), and a pay button where a long letter is being cut. And the
 * other version, which stays as it was.
 *
 * Both versions are picked through the address (?free=note&keep=on|off), which only a build that
 * allows trying things out honours (NEXT_PUBLIC_FREE_NOTE_TRYOUT=on, never production): where it
 * isn't honoured these skip, and say so. Checkout is answered here; nothing is paid.
 */

const photo = (n: number) => path.join(process.cwd(), "public", "demo", "photos", `p${n}.webp`);
const SHORT = "Happy anniversary. I would pick you again in every version of this.";

async function answerCheckout(page: Page) {
  const asked: Record<string, unknown>[] = [];
  await page.route("**/api/stripe/checkout", async (route) => {
    asked.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "checkout" }) });
  });
  return asked;
}

/** A guest's Letter held to the short note, in the asked version, with this many photos. */
async function letter(page: Page, keep: "on" | "off", options: { photos: number; message?: string }) {
  await page.goto(`/create/the-letter?free=note&keep=${keep}`);
  await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
  const skip = page.getByRole("button", { name: /Skip/ });
  if (await skip.count()) await skip.first().click().catch(() => {});
  await page.getByLabel("Their name").fill("Maya");
  await page.getByLabel("Your name").fill("Leo");
  await page.locator("#message").fill(options.message ?? SHORT);
  // The line under the photos is only there for a note: without it the address was not honoured.
  const honoured = await page.getByTestId("photos-note-hint").isVisible().catch(() => false);
  test.skip(!honoured, "this server does not honour ?free= and ?keep= (NEXT_PUBLIC_FREE_NOTE_TRYOUT is not on)");
  if (options.photos > 0) {
    await page.locator('input[type="file"][accept*="image"]').first().setInputFiles(Array.from({ length: options.photos }, (_, i) => photo(i + 1)));
    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(options.photos, { timeout: 30_000 });
  }
}

async function sendScreen(page: Page) {
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const panel = page.getByTestId("pay-panel");
  await expect(panel).toBeVisible({ timeout: 30_000 });
  return panel;
}

test.describe("the Letter's send screen, keep version", () => {
  test("shows the note with and without the photos, and offers to keep them for less when they are taken out", async ({ page }) => {
    const asked = await answerCheckout(page);
    await letter(page, "on", { photos: 3 });
    const panel = await sendScreen(page);

    // Two small pictures in place of the row of photos.
    const compare = panel.getByTestId("pay-compare");
    await expect(compare).toContainText("Here's what Maya will open.");
    await expect(compare).toContainText("With your 3 photos");
    await expect(compare).toContainText("The free note");
    await expect(panel.getByTestId("pay-note-photos")).toHaveCount(0);
    // The panel's own price is the full Letter's, as before.
    await expect(panel.getByTestId("pay-single")).toHaveText("Pay €7.49 and send");

    // Taking the photos out shows them and offers the smaller thing.
    await page.getByTestId("free-note-send").click();
    const step = page.getByTestId("keep-step");
    await expect(step.getByTestId("keep-title")).toHaveText("Keep your 3 photos for €3.99?");
    await expect(step.getByTestId("keep-photos").locator("img")).toHaveCount(3);
    await expect(step).toContainText("It is still a note: up to 500 characters, with the small Ethos footer.");
    await expect(step).toContainText("The full Letter (€7.49) also has your whole letter");
    await expect(step.getByTestId("keep-pay")).toHaveText("Keep my photos · €3.99");

    // The button asks checkout for that product on this template, with no amount of its own.
    await step.getByTestId("keep-pay").click();
    await expect.poll(() => asked.length).toBe(1);
    expect(asked[0]).toMatchObject({ product: "photos", templateSlugs: ["the-letter"], currency: "eur" });
    expect(Object.keys(asked[0]).filter((k) => /amount|total|price/i.test(k))).toEqual([]);

    // "Send without them" is the same yes as before: the photos come out and the note goes free.
    await step.getByTestId("free-note-yes").click();
    await expect(page.getByTestId("pay-panel")).toHaveCount(0, { timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Remove" })).toHaveCount(0);
  });

  test("lists a note with photos among the other options", async ({ page }) => {
    const asked = await answerCheckout(page);
    await letter(page, "on", { photos: 2 });
    const panel = await sendScreen(page);
    await panel.getByTestId("pay-note-more").locator("summary").click();
    const row = panel.getByTestId("more-note-photos");
    await expect(row).toContainText("A note with your photos");
    await expect(row).toContainText("€3.99");
    await expect(row).toContainText("Up to 5 photos in the short note.");
    await row.click();
    await expect.poll(() => asked.length).toBe(1);
    expect(asked[0]).toMatchObject({ product: "photos", templateSlugs: ["the-letter"] });
  });

  test("with more photos than a note holds, the step offers the full Letter instead", async ({ page }) => {
    const asked = await answerCheckout(page);
    await letter(page, "on", { photos: 7 });
    const panel = await sendScreen(page);
    await expect(panel.getByTestId("pay-compare")).toContainText("With your 7 photos");
    // No smaller thing to list: seven photos are more than it holds.
    await panel.getByTestId("pay-note-more").locator("summary").click();
    await expect(panel.getByTestId("more-note-photos")).toHaveCount(0);

    await page.getByTestId("free-note-send").click();
    const step = page.getByTestId("keep-step");
    await expect(step.getByTestId("keep-title")).toHaveText("These 7 photos come out.");
    await expect(step.getByTestId("keep-pay")).toHaveText("Keep my photos · €7.49");
    await expect(step).not.toContainText("€3.99");
    await step.getByTestId("keep-pay").click();
    await expect.poll(() => asked.length).toBe(1);
    expect(asked[0]).toMatchObject({ product: "extras", templateSlugs: ["the-letter"] });
  });

  test("a letter past the free length gets a button that keeps every word, and it opens the send screen", async ({ page }) => {
    const long = `${"We missed the last train and walked home in the rain. ".repeat(11)}And that was the night I knew.`;
    await letter(page, "on", { photos: 0, message: long });
    const box = page.getByTestId("keep-words");
    await expect(box).toContainText("A free note would end at:");
    await expect(box.getByTestId("keep-words-pay")).toHaveText("Keep every word · €7.49");
    await expect(box).toContainText("or shorten it to 500 to send free");
    await box.getByTestId("keep-words-pay").click();
    const panel = page.getByTestId("pay-panel");
    await expect(panel).toBeVisible({ timeout: 30_000 });
    await expect(panel.getByTestId("pay-single")).toHaveText("Pay €7.49 and send");
    // A long letter can't be sent as a note with photos, so nothing offers that here.
    await expect(page.getByTestId("free-note-too-long")).toBeVisible();
  });
});

test.describe("the Letter's send screen, as it was", () => {
  test("keeps the row of photos, the plain question and no smaller offer", async ({ page }) => {
    await letter(page, "off", { photos: 3 });
    const panel = await sendScreen(page);
    await expect(panel.getByTestId("pay-compare")).toHaveCount(0);
    await expect(panel.getByTestId("pay-note-photos")).toBeVisible();
    await panel.getByTestId("pay-note-more").locator("summary").click();
    await expect(panel.getByTestId("more-note-photos")).toHaveCount(0);

    await page.getByTestId("free-note-send").click();
    await expect(page.getByTestId("keep-step")).toHaveCount(0);
    await expect(page.getByTestId("free-note-confirm")).toHaveText("This takes your 3 photos out of the gift.");
    await expect(page.getByTestId("free-note-yes")).toHaveText("Yes, send the short note");
    await expect(page.getByTestId("free-note-no")).toHaveText("Keep it as I made it");
  });

  test("a long letter gets no button in the editor", async ({ page }) => {
    await letter(page, "off", { photos: 0, message: "x".repeat(620) });
    await expect(page.getByTestId("keep-words")).toHaveCount(0);
  });
});
