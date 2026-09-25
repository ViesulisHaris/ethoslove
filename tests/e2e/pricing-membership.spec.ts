import { expect, test, type Locator, type Page } from "@playwright/test";
import { needSubscriptions } from "./server-state";

/**
 * /pricing led by Ethos for Two (docs/MEMBERSHIP.md 4.1), signed out, in both languages and both
 * states of the switch. A development server reads ?subscriptions=on|off to show either; a production
 * build shows what its switch says, and there the other state's tests skip (./server-state.ts).
 * Checkout is never reached: the buy button's request is answered here and only looked at, and it
 * must never carry an amount or a code.
 */

/** Answers checkout with `answer` and keeps every request body it was sent. */
async function answerCheckout(page: Page, answer: { status: number; body: Record<string, unknown> }) {
  const asked: Record<string, unknown>[] = [];
  await page.route("**/api/stripe/checkout", async (route) => {
    asked.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: answer.status, contentType: "application/json", body: JSON.stringify(answer.body) });
  });
  return asked;
}

const noAmounts = (body: Record<string, unknown>) => Object.keys(body).filter((k) => /amount|price|total|code/i.test(k));

/**
 * The plan's two versions of a line share one spot and crossfade: the one not shown stays in the page,
 * inert and aria-hidden. Shown means no aria-hidden on it or above it.
 */
const hiddenAbove = (line: Locator) => line.locator("xpath=ancestor-or-self::*[@aria-hidden='true']");

test.describe("Ethos for Two, sold as a subscription", () => {
  test.beforeEach(async ({ request }) => needSubscriptions(request, "on"));

  test("leads the page: yearly chosen, what that is a month, and the terms under the one button", async ({ page }) => {
    await page.goto("/pricing?subscriptions=on");
    await expect(page.getByTestId("membership-hero").getByRole("heading", { level: 1 })).toHaveText("Every date you plan, kept for both of you.");
    await expect(page.getByTestId("plan-yearly")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("plan-monthly")).toHaveAttribute("aria-checked", "false");
    await expect(page.getByTestId("plan-yearly")).toContainText("Save 50%");

    const offer = page.getByTestId("membership-offer");
    await expect(hiddenAbove(offer.getByText("That's €2.50 a month · save 50% on monthly"))).toHaveCount(0);
    await expect(hiddenAbove(offer.getByText("€29.99 today, then every year until you cancel. We'll remind you a week before each renewal."))).toHaveCount(0);
    await expect(offer.getByText("One payment covers both of you · cancel any time")).toBeVisible();
    await expect(page.getByTestId("buy-membership")).toHaveText("Get Ethos for Two");
    await expect(page.getByTestId("membership-hero").getByRole("listitem")).toHaveCount(6 + 3);
  });

  test("the toggle changes the price and the terms, by tap or by arrow key, and nothing below it moves", async ({ page }) => {
    await page.goto("/pricing?subscriptions=on");
    const offer = page.getByTestId("membership-offer");
    const button = page.getByTestId("buy-membership");
    // Measured from the offer's own top, so scrolling to tap the toggle doesn't count as moving.
    const buttonTop = async () => ((await button.boundingBox())?.y ?? 0) - ((await offer.boundingBox())?.y ?? 0);
    const before = await buttonTop();

    await page.getByTestId("plan-monthly").click();
    await expect(page.getByTestId("plan-monthly")).toHaveAttribute("aria-checked", "true");
    await expect(hiddenAbove(offer.getByText("Billed monthly · cancel any time"))).toHaveCount(0);
    await expect(hiddenAbove(offer.getByText("€4.99 today, then every month until you cancel. Cancel any time from your account."))).toHaveCount(0);
    await expect(hiddenAbove(offer.getByText("That's €2.50 a month · save 50% on monthly"))).toHaveCount(1);
    expect(await buttonTop()).toBe(before);

    // A radio group: the arrow keys move the choice and the focus with it.
    await page.getByTestId("plan-monthly").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("plan-yearly")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("plan-yearly")).toBeFocused();
  });

  test("asks checkout for the product and the plan, and nothing else it could be charged by", async ({ page }) => {
    const asked = await answerCheckout(page, { status: 429, body: { error: "rate_limited" } });
    await page.goto("/pricing?subscriptions=on&plan=monthly");
    await expect(page.getByTestId("plan-monthly")).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("buy-membership").click();
    await expect.poll(() => asked.length).toBe(1);
    expect(asked[0]).toMatchObject({ product: "membership", plan: "monthly", currency: "eur", locale: "en", returnTo: "/account" });
    expect(noAmounts(asked[0])).toEqual([]);
    await expect(page.getByText("Too many tries. Wait a minute and try again.")).toBeVisible();
  });

  test("the comparison is a real table: free next to Ethos for Two, with the catalogue's prices", async ({ page }) => {
    await page.goto("/pricing?subscriptions=on");
    const table = page.getByTestId("membership-compare");
    await expect(table.getByRole("columnheader", { name: "Free" })).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Ethos for Two" })).toBeVisible();
    await expect(table.getByRole("row", { name: /Saved dates and trips/ })).toContainText("Up to 3");
    await expect(table.getByRole("row", { name: /Saved dates and trips/ })).toContainText("Unlimited");
    await expect(table.getByRole("row", { name: /^Price/ })).toContainText("€4.99 a month or €29.99 a year, for two");
  });

  test("answers the questions for a subscription, Ethos for Two's first", async ({ page }) => {
    await page.goto("/pricing?subscriptions=on");
    const forTwo = page.getByTestId("pricing-faq-forTwo");
    await expect(forTwo.getByRole("button", { name: "What is Ethos for Two?" })).toBeVisible();
    await expect(forTwo.getByRole("button", { name: "How do I cancel?" })).toBeVisible();
    await expect(forTwo.getByRole("button", { name: "Can I change my mind after subscribing?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Can I change my mind after buying?" })).toHaveCount(0);
    await expect(page.getByTestId("pricing-faq-rest").getByRole("button", { name: "Refunds?" })).toBeVisible();
    // Only one of the two answers to "Is this a subscription?".
    await expect(page.getByRole("button", { name: "Is this a subscription?" })).toHaveCount(1);
  });
});

test.describe("Ethos for Two, sold as a one-year pass (the switch off)", () => {
  test.beforeEach(async ({ request }) => needSubscriptions(request, "off"));

  test("has no toggle: one year, paid once, and the button asks for the yearly plan", async ({ page }) => {
    const asked = await answerCheckout(page, { status: 429, body: { error: "rate_limited" } });
    await page.goto("/pricing?subscriptions=off&plan=monthly");
    await expect(page.getByTestId("plan-toggle")).toHaveCount(0);
    const offer = page.getByTestId("membership-offer");
    await expect(offer).toContainText("€29.99");
    await expect(offer).toContainText("for a year");
    await expect(offer).toContainText("Paid once · it doesn't renew by itself");
    await expect(offer).toContainText("One payment for 365 days. We'll email you two weeks before it ends.");
    await expect(offer).not.toContainText("a month");
    await page.getByTestId("buy-membership").click();
    await expect.poll(() => asked.length).toBe(1);
    // The server makes the yearly plan the pass while subscriptions are off (docs/MEMBERSHIP.md 2.10).
    expect(asked[0]).toMatchObject({ product: "membership", plan: "yearly" });
    expect(noAmounts(asked[0])).toEqual([]);
  });

  test("the table and the questions talk about the pass", async ({ page }) => {
    await page.goto("/pricing?subscriptions=off");
    await expect(page.getByTestId("membership-compare").getByRole("row", { name: /^Price/ })).toContainText("€29.99 for a year, paid once, for two");
    await expect(page.getByRole("button", { name: "Can I change my mind after buying?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "How do I cancel?" })).toHaveCount(0);
  });
});

test.describe("the single gifts under it", () => {
  test("keep their prices and the links the editor sends here", async ({ page }) => {
    await page.goto(`/pricing?template=bouquet&plan=pick3&return=${encodeURIComponent("/create/bouquet?resume=publish")}`);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Choose 3" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("price-single")).toHaveText("€9.99");
    await expect(page.getByTestId("price-pick3")).toHaveText("€14.99");
    await expect(page.getByTestId("price-everything")).toHaveText("€24.99");
    await expect(page.getByTestId("price-extras")).toHaveText("€7.49");
    await expect(page.getByTestId("special-card").getByRole("link", { name: "Open The Letter" })).toHaveAttribute("href", "/create/the-letter");
  });
});

test.describe("in Spanish", () => {
  test("writes the prices the Spanish way and fits a phone", async ({ page, request }) => {
    await needSubscriptions(request, "on");
    await page.goto("/es/pricing?subscriptions=on");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByTestId("plan-monthly")).toContainText("4,99 € al mes");
    await expect(page.getByTestId("plan-yearly")).toContainText("Ahorra un 50 %");
    const offer = page.getByTestId("membership-offer");
    await expect(hiddenAbove(offer.getByText("Salen a 2,50 € al mes · ahorras un 50 % frente al plan mensual"))).toHaveCount(0);
    await expect(page.getByTestId("buy-membership")).toHaveText("Conseguir Ethos for Two");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });

  test("the pass in Spanish", async ({ page, request }) => {
    await needSubscriptions(request, "off");
    await page.goto("/es/pricing?subscriptions=off");
    const offer = page.getByTestId("membership-offer");
    await expect(offer).toContainText("29,99 €");
    await expect(offer).toContainText("Se paga una vez · no se renueva solo");
    await expect(page.getByTestId("buy-membership")).toHaveText("Conseguir un año para los dos");
  });
});
