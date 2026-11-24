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
    await page.addInitScript(() => {
      const w = window as unknown as { __shift: number };
      w.__shift = 0;
      // Shifts of the form column only: the preview beside it on a desktop redraws with the names, as it should.
      const inForm = (node: Node | null) => node instanceof Element && node.closest('[data-tour="form"], [data-testid^="started"]') !== null;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean; sources: { node: Node | null }[] }[])
          if (!e.hadRecentInput && e.sources.some((s) => inForm(s.node))) w.__shift += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto("/create/scrapbook?start=demo");
    // The form shows once the wait is up, still empty, under the card's place held for the photos.
    const form = page.locator('[data-tour="form"]');
    await expect(form).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("started-pending")).toBeVisible();
    await expect(page.getByTestId("started-for-you")).toHaveCount(0);
    const before = await form.locator("input").first().boundingBox();
    const shiftBefore = await page.evaluate(() => (window as unknown as { __shift: number }).__shift);
    // Then the start goes into the empty form in place: no "Use them" to tap, no second download.
    await expect(page.getByTestId("started-for-you")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId("started-pending")).toHaveCount(0);
    await expect(page.getByTestId("started-offer")).toHaveCount(0);
    // And the form did not move when they landed.
    const after = await form.locator("input").first().boundingBox();
    expect(Math.abs((after?.y ?? 0) - (before?.y ?? -1))).toBeLessThan(1);
    expect(await page.evaluate(() => (window as unknown as { __shift: number }).__shift)).toBeLessThan(shiftBefore + 0.01);
    expect(fetched.length).toBeGreaterThan(0);
    expect(new Set(fetched).size).toBe(fetched.length);
  });

  test("'Start empty' while the photos are still coming keeps the form empty when they land", async ({ page }) => {
    await page.route("**/demo/photos/**", async (route) => {
      if (route.request().resourceType() !== "fetch") return route.continue();
      await new Promise((r) => setTimeout(r, 9000));
      await route.continue();
    });
    await page.goto("/create/our-timeline?start=demo&ref=email-reminder-1");
    const pending = page.getByTestId("started-pending");
    await expect(pending).toBeVisible({ timeout: 30_000 });
    await expect(pending.getByRole("button", { name: "Change the photos" })).toBeDisabled();
    await pending.getByRole("button", { name: "Start empty" }).click();
    await expect(pending).toHaveCount(0);
    // Well after the photos would have landed: nothing came in, no card came back.
    await page.waitForTimeout(10_000);
    await expect(page.getByTestId("started-for-you")).toHaveCount(0);
    await expect(page.getByTestId("started-offer")).toHaveCount(0);
    await expect(page.locator('[data-tour="form"] input').first()).toHaveValue("");
  });

  test.describe("on a phone, the card that holds the place is the height of the one that comes", () => {
    test.use({ viewport: { width: 375, height: 812 } });
    const slowPhotos = async (page: import("@playwright/test").Page) =>
      page.route("**/demo/photos/**", async (route) => {
        if (route.request().resourceType() !== "fetch") return route.continue();
        await new Promise((r) => setTimeout(r, 9000));
        await route.continue();
      });

    test("in Spanish, where the spinner once wrapped 'Empezar de cero' onto a line of its own", async ({ page }) => {
      await slowPhotos(page);
      await page.goto("/es/create/our-timeline?start=demo&ref=email-reminder-1");
      const pending = page.getByTestId("started-pending");
      await expect(pending).toBeVisible({ timeout: 30_000 });
      await expect(pending.getByRole("button", { name: "Cambiar las fotos" })).toBeDisabled();
      const held = await pending.boundingBox();
      const input = page.locator('[data-tour="form"] input').first();
      const before = await input.boundingBox();
      const done = page.getByTestId("started-for-you");
      await expect(done).toBeVisible({ timeout: 30_000 });
      const landed = await done.boundingBox();
      expect(Math.abs((landed?.height ?? 0) - (held?.height ?? -1))).toBeLessThan(1);
      expect(Math.abs(((await input.boundingBox())?.y ?? 0) - (before?.y ?? -1))).toBeLessThan(1);
    });

    test("typing while the photos come: the offer keeps the card's height, so the field does not jump", async ({ page }) => {
      await slowPhotos(page);
      await page.goto("/create/our-timeline?start=demo&ref=email-reminder-1");
      const pending = page.getByTestId("started-pending");
      await expect(pending).toBeVisible({ timeout: 30_000 });
      const held = await pending.boundingBox();
      const input = page.locator('[data-tour="form"] input').first();
      await input.fill("Sam");
      const before = await input.boundingBox();
      const offer = page.getByTestId("started-offer");
      await expect(offer).toBeVisible({ timeout: 30_000 });
      await expect(pending).toHaveCount(0);
      expect(Math.abs(((await offer.boundingBox())?.height ?? 0) - (held?.height ?? -1))).toBeLessThan(1);
      expect(Math.abs(((await input.boundingBox())?.y ?? 0) - (before?.y ?? -1))).toBeLessThan(1);
      await expect(input).toHaveValue("Sam");
    });
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
