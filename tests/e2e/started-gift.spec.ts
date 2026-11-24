import { expect, test } from "@playwright/test";
import { needPreviews } from "./server-state";

/**
 * The gift a reminder e-mail's "Open my gift" starts (lib/editor/start-from-gift.ts), drawn with the
 * development-only `?start=demo`: the template's own demo names and photos stand in for the last gift
 * for that person. A production build ignores it, so these skip there.
 */
test.describe("a gift started from the last one", () => {
  test.beforeEach(async ({ request }) => needPreviews(request));

  test("the start never stays in the address", async ({ page }) => {
    await page.goto("/create/scrapbook?start=demo&ref=email-reminder-1");
    await expect(page.getByTestId("started-for-you")).toBeVisible({ timeout: 30_000 });
    expect(new URL(page.url()).searchParams.has("start")).toBe(false);
    expect(new URL(page.url()).searchParams.get("ref")).toBe("email-reminder-1");
  });

  test("on a slow line the form shows after its wait, and the photos that come after go in once, without an offer", async ({ page }) => {
    // Every photo the start copies onto this device takes 9 seconds to arrive: longer than the form waits.
    const fetched: string[] = [];
    await page.route("**/demo/photos/**", async (route) => {
      if (route.request().resourceType() !== "fetch") return route.continue();
      fetched.push(new URL(route.request().url()).pathname);
      await new Promise((r) => setTimeout(r, 9000));
      await route.continue();
    });
    await page.goto("/create/scrapbook?start=demo");
    // The form shows once the wait is up, still empty.
    await expect(page.locator('[data-tour="form"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("started-for-you")).toHaveCount(0);
    // Then the start goes into the empty form in place: no "Use them" to tap, no second download.
    await expect(page.getByTestId("started-for-you")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("started-offer")).toHaveCount(0);
    expect(fetched.length).toBeGreaterThan(0);
    expect(new Set(fetched).size).toBe(fetched.length);
  });

  test("on a free note the card asks for words only: photos are its paid step", async ({ page }) => {
    await page.goto("/create/the-letter?start=demo");
    const card = page.getByTestId("started-for-you");
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(card).toContainText("Both names are in. Add your words.");
    await expect(card).not.toContainText("photos");
  });

  test("and in Spanish", async ({ page }) => {
    await page.goto("/es/create/the-letter?start=demo");
    await expect(page.getByTestId("started-for-you")).toContainText("Los dos nombres ya están puestos. Añade tus palabras.", { timeout: 30_000 });
  });
});
