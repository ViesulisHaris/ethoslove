import { expect, test, type Page } from "@playwright/test";

/**
 * Checkout tells the server where the buyer's visit began (lib/attribution/first-visit.ts): the first
 * page, the referring site's name, the landing link's utm tags and which platform's click id it
 * carried, never the id. Without a yes to cookies nothing is written to the device; with one, the
 * first visit is kept for 30 days, so a buyer who comes back is counted to it. Checkout is never
 * reached: the test answers POST /api/stripe/checkout itself and looks at what it was sent.
 */

async function answerCheckout(page: Page) {
  const asked: Record<string, unknown>[] = [];
  await page.route("**/api/stripe/checkout", async (route) => {
    asked.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "rate_limited" }) });
  });
  return asked;
}

const kept = (page: Page) => page.evaluate(() => localStorage.getItem("ethos-first-visit"));

test("sends the visit's first page, the site that sent it and the link's tags, and keeps nothing without a yes", async ({ page }) => {
  const asked = await answerCheckout(page);
  await page.goto("/templates?utm_source=Pinterest&utm_medium=social&utm_campaign=Gift-Ideas&fbclid=IwAR0secretclick", { referer: "https://www.google.com/", waitUntil: "networkidle" });
  // On to the pricing page inside the site: the visit's first page stays the one it began on.
  await page.getByRole("contentinfo").getByRole("link", { name: "Pricing" }).click();
  await page.waitForURL(/\/pricing$/);
  await page.getByRole("button", { name: "Unlock everything" }).click();
  await expect.poll(() => asked.length).toBe(1);
  expect(asked[0].source).toMatchObject({ landing: "/templates", referrer: "google.com", utmSource: "pinterest", utmMedium: "social", utmCampaign: "gift-ideas", click: "meta", remembered: false });
  expect(JSON.stringify(asked[0])).not.toContain("IwAR0secretclick");
  expect(await kept(page)).toBeNull();
});

test.describe("a visitor who allowed cookies", () => {
  // The same origin playwright.config.ts gives every test, with the other answer.
  const origin = new URL(process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PORT ?? "3000"}`).origin;
  test.use({ storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "granted" }] }] } });

  test("is counted to their first visit when they come back to pay", async ({ page, context }) => {
    await page.goto("/blog?utm_source=newsletter", { referer: "https://duckduckgo.com/" });
    await expect.poll(() => kept(page)).not.toBeNull();
    await page.close();

    // Another day, typed in: a new tab with nothing in memory.
    const later = await context.newPage();
    const asked = await answerCheckout(later);
    await later.goto("/pricing", { waitUntil: "networkidle" });
    await later.getByRole("button", { name: "Unlock everything" }).click();
    await expect.poll(() => asked.length).toBe(1);
    expect(asked[0].source).toMatchObject({ landing: "/blog", referrer: "duckduckgo.com", utmSource: "newsletter", remembered: true });
  });
});
