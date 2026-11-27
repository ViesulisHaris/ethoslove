import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * The editor keeps the gift on screen while the sender changes it, so a template that remembers
 * "which card" or "which page" has to cope with the photos changing under it. On 16 Nov 2026 two
 * didn't: removing a photo crashed Scratch Card's preview (it opens on the last card, past the new
 * end) and Sketchbook's (on a page past the new end), and the preview showed the error screen.
 */

/** The photos' own Remove buttons: a list field (Light the Candles' thankful lines) has Remove buttons too. */
const photoRemoves = (page: Page) => page.getByRole("listitem").filter({ has: page.getByRole("button", { name: "Rotate" }) }).getByRole("button", { name: "Remove" });

const PHOTOS =["p1", "p2", "p5"].map((id) => path.join(process.cwd(), "public", "demo", "photos", `${id}.webp`));

/**
 * A guest's draft with three photos, opened again the way a sender comes back to it: the photos go
 * in through the editor's own file picker (a restored draft keeps only photos the editor stored),
 * then the page reloads, so the gift mounts with the photos already in it.
 */
async function draftWithPhotos(page: Page, slug: string) {
  await page.goto(`/create/${slug}`);
  await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Their name").fill("Ana");
  await page.getByLabel("Your name").fill("Leo");
  await page.locator('input[type="file"][accept*="image"]').first().setInputFiles(PHOTOS);
  await expect(photoRemoves(page)).toHaveCount(PHOTOS.length, { timeout: 30_000 });
  const key = `ethos:draft:${slug}`;
  await expect
    .poll(() => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "null")?.data?.photos?.length ?? 0, key), { timeout: 15_000 })
    .toBe(PHOTOS.length);
  await page.reload();
  await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
  await expect(photoRemoves(page)).toHaveCount(PHOTOS.length, { timeout: 30_000 });
}

/** Every crash the gift's error boundary catches: it logs "[gift] template crashed" with the error. */
function crashes(page: Page) {
  const seen: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" && m.text().includes("template crashed")) seen.push(m.text().slice(0, 200));
  });
  return seen;
}

test.describe("removing a photo while the preview shows the gift", () => {
  test.skip(({ isMobile }) => isMobile, "the preview sits beside the form on a desktop; the phone shows the same component on a tab");

  test("Scratch Card keeps showing its last card", async ({ page }) => {
    test.setTimeout(90_000);
    const seen = crashes(page);
    await draftWithPhotos(page, "scratch-card");
    await photoRemoves(page).first().click();
    await expect(photoRemoves(page)).toHaveCount(PHOTOS.length - 1);
    await page.waitForTimeout(1500);
    expect(seen, "the preview crashed").toEqual([]);
    await expect(page.getByText("— Leo").first()).toBeVisible();
  });

  test("Sketchbook stays on a page that still exists", async ({ page }) => {
    test.setTimeout(90_000);
    const seen = crashes(page);
    await draftWithPhotos(page, "sketchbook");
    // Turn to the letter, the last of four pages: the cake, two pages of photos, the letter.
    const next = page.locator("[data-turn=next]").first();
    for (let i = 0; i < 3 && (await next.count()) > 0; i++) {
      await next.click({ force: true });
      await page.waitForTimeout(900);
    }
    await expect(page.getByText("4 / 4").first()).toBeVisible();
    await photoRemoves(page).first().click();
    await expect(photoRemoves(page)).toHaveCount(PHOTOS.length - 1);
    await page.waitForTimeout(1500);
    expect(seen, "the preview crashed").toEqual([]);
    await expect(page.getByText("3 / 3").first()).toBeVisible();
  });

  // Error MIPULH, 26 Nov, an iPhone on /create/light-the-candles: "undefined is not an object
  // (evaluating 'T.kind')". The note is gone through a step at a time (_shared/holiday/steps.tsx),
  // and a step that no longer exists was read when the note grew shorter under it.
  test("Light the Candles stays on a step that still exists", async ({ page }) => {
    test.setTimeout(120_000);
    const seen = crashes(page);
    await draftWithPhotos(page, "light-the-candles");
    // The editor's preview opens on the letter. To its last step, the end, past the three photos.
    const next = page.getByRole("button", { name: /^next$/ }).first();
    for (let i = 0; i < 30 && (await next.isEnabled()); i++) {
      await next.click();
      await page.waitForTimeout(350);
    }
    await expect(next).toBeDisabled();
    await photoRemoves(page).first().click();
    await expect(photoRemoves(page)).toHaveCount(PHOTOS.length - 1);
    await page.waitForTimeout(1500);
    expect(seen, "the preview crashed").toEqual([]);
    // Still on the end, now one step sooner.
    await expect(next).toBeDisabled();
  });
});
