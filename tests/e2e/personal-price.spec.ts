import { createHmac } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

/**
 * A personal price from an offer email (lib/commerce/personal-price.ts), end to end in the browser:
 * the email's link keeps it in a cookie and opens the gallery, the notice under the header says it,
 * the pay sheet shows it on the gift's own row with the usual price struck through, and the pay
 * button asks checkout for it without ever sending an amount. Checkout itself is answered here.
 *
 * The server signs links with PERSONAL_PRICE_SECRET (else VIEWER_HASH_SECRET, else the service key); this spec signs its own
 * link with the same secret, so it runs only when the server was started with one it can read.
 */
const SECRET = process.env.PERSONAL_PRICE_SECRET || process.env.VIEWER_HASH_SECRET || "";
const ACCOUNT = "5f0c6f7e-3a55-4d2b-9a57-0e8a3f1b2c4d";

function link(endsAt: number): string {
  const value = `${ACCOUNT}:${Math.floor(endsAt / 1000)}`;
  const signature = createHmac("sha256", SECRET).update(`personal-price:${value}`).digest("base64url");
  return `/api/offer/open?t=${encodeURIComponent(`${value}.${signature}`)}&r=bf-test`;
}

async function answerCheckout(page: Page, answer: { status: number; body: Record<string, unknown> }) {
  const asked: Record<string, unknown>[] = [];
  await page.route("**/api/stripe/checkout", async (route) => {
    asked.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: answer.status, contentType: "application/json", body: JSON.stringify(answer.body) });
  });
  return asked;
}

async function openSheet(page: Page) {
  await page.goto("/create/bouquet");
  await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Their name").fill("Leo");
  await page.getByLabel("Your name").fill("Mia");
  await page.getByLabel("Message", { exact: true }).fill("For every Sunday morning.");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const panel = page.getByRole("dialog").getByTestId("pay-panel");
  await expect(panel).toBeVisible();
  return panel;
}

test.describe("the two-hour notice that the policy changed", () => {
  // POLICY_NOTICE in src/components/marketing/top-notice.tsx: 19 Nov 2026, 20:30 to 23:30 UTC.
  test("shows inside its two hours, links to the policy, and closes", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-19T22:00:00Z") });
    await page.goto("/templates");
    const notice = page.getByTestId("top-notice");
    await expect(notice).toContainText("We've updated our Privacy Policy and Terms.");
    await expect(notice.getByRole("link", { name: "What changed" })).toHaveAttribute("href", "/legal/privacy");
    await notice.getByRole("button", { name: "Close" }).click();
    await expect(notice).toHaveCount(0);
  });

  test("is gone before and after them", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-11-19T23:30:01Z") });
    await page.goto("/templates");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.getByTestId("top-notice")).toHaveCount(0);
  });
});

test.describe("a personal price from an offer email", () => {
  test.skip(!SECRET, "the server's link secret isn't known to this run (set VIEWER_HASH_SECRET for both)");

  test("the link opens the gallery with the price said under the header", async ({ page }) => {
    await page.goto(link(Date.now() + 2 * 3_600_000));
    await expect(page).toHaveURL(/\/templates\?ref=bf-test$/);
    const notice = page.getByTestId("top-notice");
    await expect(notice).toContainText("Your personal price: any gift for €4.99, until");
    await expect(notice.getByRole("link", { name: "Choose a gift" })).toBeVisible();
  });

  test("the pay sheet shows it on the gift's row, alone, and asks checkout for it without an amount", async ({ page }) => {
    await page.goto(link(Date.now() + 2 * 3_600_000));
    const asked = await answerCheckout(page, { status: 400, body: { error: "checkout" } });
    const panel = await openSheet(page);
    const single = panel.getByTestId("plan-single");
    await expect(single).toHaveAttribute("aria-checked", "true");
    await expect(single).toContainText("€4.99");
    await expect(single.getByTestId("price-was")).toHaveText("€9.99");
    await expect(panel.getByTestId("personal-price-note")).toContainText("Your personal price from our email, until");
    // One gift at that price: no every-template bump, no second gift beside it.
    await expect(panel.getByTestId("bump")).toHaveCount(0);
    await expect(panel.getByTestId("second")).toHaveCount(0);
    await expect(panel.getByTestId("pay-single")).toHaveText("Pay €4.99 and send");

    await panel.getByTestId("pay-single").click();
    await expect.poll(() => asked.length).toBe(1);
    expect(asked[0]).toMatchObject({ product: "single", templateSlugs: ["bouquet"], currency: "eur", personalPrice: true });
    expect(asked[0]).not.toHaveProperty("addEverything");
    expect(asked[0]).not.toHaveProperty("secondSlug");
    expect(Object.keys(asked[0]).filter((k) => /amount|total/i.test(k))).toEqual([]);

    // Every template is still there, at its own price and without the personal one.
    await panel.getByTestId("plan-everything").click();
    await expect(panel.getByTestId("personal-price-note")).toHaveCount(0);
    await expect(panel.getByTestId("pay-single")).toHaveText("Pay €24.99 and send");
  });

  test("ended while the sheet was open: says so and goes back to the usual price", async ({ page }) => {
    await page.goto(link(Date.now() + 2 * 3_600_000));
    const asked = await answerCheckout(page, { status: 409, body: { error: "personal_price_ended" } });
    const panel = await openSheet(page);
    await panel.getByTestId("pay-single").click();
    await expect.poll(() => asked.length).toBe(1);
    await expect(page.getByText("Your personal price has ended or has already been used, so the usual price shows again.")).toBeVisible();
    await expect(panel.getByTestId("pay-single")).toHaveText("Pay €9.99 and send");
    await expect(panel.getByTestId("price-was")).toHaveCount(0);
    await expect(panel.getByTestId("bump")).toHaveCount(1);
  });

  test("a link that has ended, or was edited, opens the gallery at the usual prices", async ({ page }) => {
    await page.goto(link(Date.now() - 60_000));
    await expect(page).toHaveURL(/\/templates\?ref=bf-test$/);
    await expect(page.getByTestId("top-notice")).toHaveCount(0);
    const edited = link(Date.now() + 3_600_000).replace(/%3A(\d+)\./, (_, s: string) => `%3A${Number(s) + 86_400}.`);
    await page.goto(edited);
    await expect(page.getByTestId("top-notice")).toHaveCount(0);
    const panel = await openSheet(page);
    await expect(panel.getByTestId("plan-single")).toContainText("€9.99");
    await expect(panel.getByTestId("price-was")).toHaveCount(0);
  });
});
