import { expect, test } from "@playwright/test";
import { needPreviews } from "./server-state";

/**
 * My dates (docs/MEMBERSHIP.md 3.1, 3.4), drawn by the development-only preview
 * (/for-two/preview/my-dates?state=…): the real page needs a signed-in account, and the dev
 * server's database is production, where nobody signs in for a test. The preview hands the grid the
 * list GET /api/saved-dates would answer; what the grid asks the API afterwards is answered here.
 * A production build answers the preview 404, and these tests skip there (./server-state.ts).
 */

test.beforeEach(async ({ page, request }) => {
  await needPreviews(request);
  await page.route(/\/api\/saved-dates(\/|\?|$)/, (route) => route.fulfill({ status: 401, json: { error: "unauthenticated" } }));
});

test("a free account at its limit: three of three, and the way to more is a 44px link to the offer", async ({ page }) => {
  await page.goto("/for-two/preview/my-dates?state=free-full");
  await expect(page.getByRole("heading", { level: 1, name: "My dates" })).toBeVisible();
  await expect(page.getByTestId("saved-quota")).toContainText("3 of 3 free saves");
  await expect(page.getByTestId("saved-grid").getByRole("listitem")).toHaveCount(3);
  const upgrade = page.getByRole("link", { name: "Save as many as you like" });
  await expect(upgrade).toHaveAttribute("href", "/pricing?from=saved-dates#for-two");
  expect((await upgrade.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("shared with the partner: their date says whose it is, and there's no limit to show", async ({ page }) => {
  await page.goto("/for-two/preview/my-dates?state=member");
  await expect(page.getByText("Dates and trips you've saved, shared with Ben.")).toBeVisible();
  await expect(page.getByTestId("saved-quota")).toHaveCount(0);
  await expect(page.getByTestId("saved-grid").getByRole("listitem")).toHaveCount(4);
  await expect(page.getByTestId("saved-grid")).toContainText("From Ben");
  await expect(page.getByTestId("saved-grid")).toContainText("Lisbon, slowly");
});

test("after a membership ends, in Spanish: the oldest is read-only, and its badge explains why", async ({ page }) => {
  await page.goto("/es/for-two/preview/my-dates?state=ended");
  await expect(page.getByRole("heading", { level: 1, name: "Mis citas" })).toBeVisible();
  // Four saved, three free: the count never reads "4 of 3".
  await expect(page.getByTestId("saved-quota")).toContainText("3 de 3 guardados gratis");
  const badge = page.getByRole("button", { name: "Solo lectura" });
  await expect(badge).toHaveCount(1);
  // Drawn 32px tall, tappable 44px: a tap just above the pill still lands on it.
  await badge.scrollIntoViewIfNeeded();
  const box = (await badge.boundingBox())!;
  const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("button")?.textContent ?? null, { x: box.x + box.width / 2, y: box.y - 5 });
  expect(hit).toContain("Solo lectura");
  await badge.click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Por ahora, esta cita es de solo lectura" })).toBeVisible();
  await expect(sheet.locator('a[href="/es/pricing?from=saved-dates#for-two"]')).toHaveCount(1);
  await expect(sheet.locator('a[href="/es/my-dates"]')).toHaveCount(1);
});
