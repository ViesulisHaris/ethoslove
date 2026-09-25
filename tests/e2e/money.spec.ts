import { expect, test, type Page } from "@playwright/test";

/**
 * What a visitor sees when paying: the pricing page, the paywall in the publish sheet, and the pages
 * for gift cards and joining Ethos for Two. Checkout is never reached: every test that presses a buy button
 * answers POST /api/stripe/checkout itself and only looks at what was asked for, which must never
 * carry an amount or a code. Prices are the euro catalogue (NEXT_PUBLIC_PRICE_CURRENCIES unset), and
 * gift cards are off (GIFT_CARDS_ENABLED unset).
 */

const GIFT_SHORT_ID = "k7m2p9xqa";
/** Shaped like a reply token; the server would refuse it, the sheet only reads its shape. */
const REPLY_TOKEN = `AQ${"x".repeat(118)}`;

/** Answers checkout with `answer` and keeps every request body it was sent. */
async function answerCheckout(page: Page, answer: { status: number; body: Record<string, unknown> }) {
  const asked: Record<string, unknown>[] = [];
  await page.route("**/api/stripe/checkout", async (route) => {
    asked.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: answer.status, contentType: "application/json", body: JSON.stringify(answer.body) });
  });
  return asked;
}

const noAmounts = (body: Record<string, unknown>) => Object.keys(body).filter((k) => /amount|price|total/i.test(k));

/**
 * /pricing with Ethos for Two sold as the one-time year (STRIPE_SUBSCRIPTIONS_ENABLED off). A
 * development server shows that state for ?subscriptions=off whatever its switch says (the one at
 * :3310 runs with it on); a production build ignores the query, so there, with the switch on,
 * these tests skip: tests/e2e/pricing-membership.spec.ts covers that page.
 */
async function pricingAsOneTimeYear(page: Page, path = "/pricing", query = "") {
  await page.goto(`${path}?subscriptions=off${query ? `&${query}` : ""}`);
  test.skip((await page.getByTestId("plan-toggle").count()) > 0, "subscriptions are on, and this server doesn't take ?subscriptions=off");
}

test.describe("the pricing page", () => {
  // With STRIPE_SUBSCRIPTIONS_ENABLED off, Ethos for Two is sold as the one-time year
  // (docs/MEMBERSHIP.md 2.10). tests/e2e/pricing-membership.spec.ts covers both states.
  test("leads with Ethos for Two, then the single gifts at their prices; no gift card and no code field while they're off", async ({ page }) => {
    await pricingAsOneTimeYear(page);
    const offer = page.getByTestId("membership-offer");
    await expect(offer).toContainText("€29.99");
    await expect(offer).toContainText("for a year");
    await expect(offer).toContainText("Paid once · it doesn't renew by itself");
    await expect(offer).toContainText("One payment for 365 days. We'll email you two weeks before it ends.");
    await expect(page.getByTestId("buy-membership")).toHaveText("Get a year of Ethos for Two");

    await expect(page.getByTestId("price-single")).toHaveText("€9.99");
    await expect(page.getByTestId("price-pick3")).toHaveText("€14.99");
    await expect(page.getByTestId("price-everything")).toHaveText("€24.99");
    await expect(page.getByTestId("price-extras")).toHaveText("€7.49");
    await expect(page.getByText("€29.97 separately")).toBeVisible();

    await expect(page.getByTestId("giftcard-card")).toHaveCount(0);
    await expect(page.getByTestId("creator-code-toggle")).toHaveCount(0);

    // Ethos for Two is for sale: no waitlist form anywhere.
    await expect(page.getByRole("textbox", { name: /email/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Is this a subscription?" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "What is Ethos for Two?" })).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Can they send one back?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Is there a discount code?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "How do gift cards work?" })).toHaveCount(0);
  });

  test("buys Ethos for Two with nothing but the product and the plan: no code, no amount", async ({ page }) => {
    const asked = await answerCheckout(page, { status: 429, body: { error: "rate_limited" } });
    await pricingAsOneTimeYear(page);
    await page.getByTestId("buy-membership").click();
    await expect.poll(() => asked.length).toBe(1);
    // The server makes the yearly plan the one-time year while subscriptions are off.
    expect(asked[0]).toMatchObject({ product: "membership", plan: "yearly", currency: "eur", locale: "en", returnTo: "/account" });
    expect(asked[0]).not.toHaveProperty("creatorCode");
    expect(noAmounts(asked[0])).toEqual([]);
    await expect(page.getByText("Too many tries. Wait a minute and try again.")).toBeVisible();
  });

  test("buys a single gift the same way: the product, never an amount", async ({ page }) => {
    const asked = await answerCheckout(page, { status: 429, body: { error: "rate_limited" } });
    await page.goto("/pricing");
    await page.getByRole("button", { name: "Unlock everything" }).click();
    await expect.poll(() => asked.length).toBe(1);
    expect(asked[0]).toMatchObject({ product: "everything", currency: "eur", locale: "en" });
    expect(noAmounts(asked[0])).toEqual([]);
  });

  test("won't sell a gift card while they're off", async ({ request }) => {
    const response = await request.post("/api/stripe/checkout", { data: { product: "giftcard", currency: "eur" } });
    // Without Stripe configured the route answers 503 before it looks; with it, "not_on_sale".
    expect([400, 503]).toContain(response.status());
    if (response.status() === 400) expect(await response.json()).toMatchObject({ error: "not_on_sale" });
  });

  test("only shows prices in a currency checkout charges, and ignores a template that doesn't exist", async ({ page }) => {
    // Euros only (NEXT_PUBLIC_PRICE_CURRENCIES unset): pounds on the page would be charged as euros.
    await page.goto("/pricing?currency=gbp&template=not-a-template&plan=pick3");
    await expect(page.getByTestId("price-single")).toHaveText("€9.99");
    await expect(page.getByTestId("membership-offer")).toContainText("€29.99");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("?renew=pass (old emails) picks Ethos for Two out, and only talks about renewing to someone who has a pass", async ({ page }) => {
    await pricingAsOneTimeYear(page, "/pricing", "renew=pass");
    const offer = page.getByTestId("membership-offer");
    await expect(offer).toBeInViewport();
    await expect(offer).toHaveClass(/ring-starlight/);
    // A visitor without a pass (old links send them here too) is simply buying one.
    await expect(page.getByTestId("buy-membership")).toHaveText("Get a year of Ethos for Two");
    await expect(offer).not.toContainText("Renew for another year");
  });

  test("the publish sheet's pick-three link opens the picker with that template chosen", async ({ page }) => {
    await page.goto(`/pricing?template=bouquet&plan=pick3&return=${encodeURIComponent("/create/bouquet?resume=publish")}`);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Choose 3" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Continue (1/3)" })).toBeDisabled();
  });

  test("in Spanish, with Spanish prices", async ({ page }) => {
    await pricingAsOneTimeYear(page, "/es/pricing");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByTestId("price-single")).toHaveText("9,99 €");
    await expect(page.getByTestId("price-everything")).toHaveText("24,99 €");
    const offer = page.getByTestId("membership-offer");
    await expect(offer).toContainText("29,99 €");
    await expect(offer).toContainText("Se paga una vez · no se renueva solo");
    await expect(offer).toContainText("Un solo pago por 365 días.");
  });
});

test.describe("the upgrade quote", () => {
  test("is nothing to upgrade for a visitor who isn't signed in, and never cached", async ({ request }) => {
    const response = await request.get("/api/money/upgrade?currency=eur");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(await response.json()).toEqual({ amount: null });
  });
});

test.describe("the paywall in the publish sheet", () => {
  async function openSheet(page: Page, path: string, { fill = true } = {}) {
    await page.goto(path);
    await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
    if (fill) {
      await page.getByLabel("Their name").fill("Leo");
      await page.getByLabel("Your name").fill("Mia");
      await page.getByLabel("Message", { exact: true }).fill("For every Sunday morning.");
    }
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    const panel = page.getByRole("dialog").getByTestId("pay-panel");
    await expect(panel).toBeVisible();
    return panel;
  }

  test("offers this template first, every template beside it, and the extra templates unticked", async ({ page }) => {
    const panel = await openSheet(page, "/create/bouquet");
    const single = panel.getByTestId("plan-single");
    await expect(single).toHaveAttribute("aria-checked", "true");
    await expect(single).toContainText("€9.99");
    await expect(panel.getByTestId("plan-everything")).toContainText("€24.99");
    await expect(panel.getByTestId("pick3-link")).toContainText("Or pick any three for €14.99");

    // EU law: the order bump is never pre-ticked.
    const bump = panel.getByTestId("bump").getByRole("checkbox");
    await expect(bump).not.toBeChecked();
    await expect(panel.getByTestId("bump")).toContainText("+€15.00");
    await expect(panel.getByTestId("pay-single")).toHaveText("Pay €9.99 and send");
    await bump.check();
    // The bump always makes it exactly Everything's price.
    await expect(panel.getByTestId("pay-single")).toHaveText("Pay €24.99 and send");

    // Every template already includes every other one: no bump beside it.
    await panel.getByTestId("plan-everything").click();
    await expect(panel.getByTestId("bump")).toHaveCount(0);
    await expect(panel.getByTestId("pay-single")).toHaveText("Pay €24.99 and send");

    await expect(panel.getByTestId("guarantee")).toHaveText("If it doesn't open on their phone, you get your money back.");
  });

  test("has no checkout-reminder box anywhere near the pay button", async ({ page }) => {
    const panel = await openSheet(page, "/create/bouquet");
    await expect(panel.getByTestId("pay-single")).toBeVisible();
    await expect(page.getByTestId("recovery-optin")).toHaveCount(0);
  });

  test("sends the template and the bump, never an amount or a code", async ({ page }) => {
    const asked = await answerCheckout(page, { status: 400, body: { error: "checkout" } });
    const panel = await openSheet(page, "/create/bouquet");
    await expect(panel.getByTestId("creator-code-toggle")).toHaveCount(0);
    await panel.getByTestId("bump").getByRole("checkbox").check();
    await panel.getByTestId("pay-single").click();
    await expect.poll(() => asked.length).toBe(1);
    expect(asked[0]).toEqual({
      product: "single",
      templateSlugs: ["bouquet"],
      addEverything: true,
      currency: "eur",
      returnTo: "/create/bouquet?resume=publish",
      locale: "en",
    });
    await expect(page.getByText("Couldn't open checkout. Please try again.")).toBeVisible();
    await expect(panel.getByTestId("pay-single")).toBeEnabled();
  });

  test("a free reply signed out asks for a sign-in, not a payment, and keeps its token through it", async ({ page }) => {
    await page.goto(`/create/bouquet?ref=reply&reply=${REPLY_TOKEN}`);
    await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
    await page.getByLabel("Their name").fill("Leo");
    await page.getByLabel("Your name").fill("Mia");
    await page.getByLabel("Message", { exact: true }).fill("Right back at you.");
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByTestId("pay-panel")).toHaveCount(0);
    await expect(sheet).toContainText("Sending this one back is free.");
  });

  test("a gift's short id in the link promises nothing", async ({ page }) => {
    const panel = await openSheet(page, `/create/bouquet?ref=${GIFT_SHORT_ID}`);
    await expect(panel.getByTestId("free-reply-extras")).toHaveCount(0);
    await expect(panel.getByTestId("plan-single")).toContainText("€9.99");
  });

  test("a free template with extras is made special, for less", async ({ page }) => {
    await page.goto("/create/the-letter");
    await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("switch", { name: "Remove the “Made with Ethos” footer" }).click();
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    const panel = page.getByRole("dialog").getByTestId("pay-panel");
    const extras = panel.getByTestId("plan-extras");
    await expect(extras).toHaveAttribute("aria-checked", "true");
    await expect(extras).toContainText("Make it special");
    await expect(extras).toContainText("€7.49");
    await expect(panel.getByTestId("bump")).toContainText("+€17.50");
    await expect(panel.getByTestId("plan-everything")).toContainText("€24.99");
    await expect(panel.getByTestId("bump").getByRole("checkbox")).not.toBeChecked();
    // Three templates is a premium-template offer.
    await expect(panel.getByTestId("pick3-link")).toHaveCount(0);
  });
});

test.describe("“One payment, no subscription” in the publish sheet", () => {
  const WORDS = {
    en: { line: "One payment, no subscription. Yours for good.", theirName: "Their name", publish: "Publish", footer: "Remove the “Made with Ethos” footer", signInInstead: "Already have an account? Sign in instead", signIn: "Sign in to publish" },
    es: { line: "Un solo pago, sin suscripción. Tuyo para siempre.", theirName: "Su nombre", publish: "Publicar", footer: "Quitar el pie «Hecho con Ethos»", signInInstead: "¿Ya tienes cuenta? Inicia sesión", signIn: "Inicia sesión para publicar" },
  } as const;

  for (const locale of ["en", "es"] as const) {
    const w = WORDS[locale];
    const prefix = locale === "es" ? "/es" : "";
    async function openSheet(page: Page, path: string, { removeFooter = false } = {}) {
      await page.goto(`${prefix}${path}`);
      await expect(page.getByLabel(w.theirName)).toBeVisible({ timeout: 30_000 });
      if (removeFooter) await page.getByRole("switch", { name: w.footer }).click();
      await page.getByRole("button", { name: w.publish, exact: true }).click();
      const sheet = page.getByRole("dialog");
      await expect(sheet).toBeVisible();
      return sheet;
    }

    test(`${locale}: is said under the paywall, and under the sign-in that names its price`, async ({ page }) => {
      const sheet = await openSheet(page, "/create/bouquet");
      await expect(sheet.getByTestId("pay-panel")).toBeVisible();
      await expect(sheet.getByTestId("no-subscription")).toHaveText(w.line);
      await sheet.getByRole("button", { name: w.signInInstead }).click();
      await expect(sheet.getByText(w.signIn)).toBeVisible();
      await expect(sheet.getByTestId("no-subscription")).toHaveText(w.line);
    });

    test(`${locale}: is said when a free template is made special`, async ({ page }) => {
      const sheet = await openSheet(page, "/create/the-letter", { removeFooter: true });
      await expect(sheet.getByTestId("plan-extras")).toBeVisible();
      await expect(sheet.getByTestId("no-subscription")).toHaveText(w.line);
    });

    test(`${locale}: is not said when sending costs nothing: a free template, a free reply`, async ({ page }) => {
      let sheet = await openSheet(page, "/create/the-letter");
      await expect(sheet.getByText(w.signIn)).toBeVisible();
      await expect(sheet.getByTestId("pay-panel")).toHaveCount(0);
      await expect(sheet.getByTestId("no-subscription")).toHaveCount(0);
      await expect(sheet).not.toContainText(w.line);

      sheet = await openSheet(page, `/create/bouquet?ref=reply&reply=${REPLY_TOKEN}`);
      await expect(sheet.getByText(w.signIn)).toBeVisible();
      await expect(sheet.getByTestId("pay-panel")).toHaveCount(0);
      await expect(sheet).not.toContainText(w.line);
    });
  }
});

test.describe("redeeming a gift card", () => {
  test("keeps the code while the visitor signs in first", async ({ page }) => {
    await page.goto("/redeem?code=ethos-abcd-2345");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Someone gave you everything.");
    await expect(page.getByLabel("Gift card code")).toHaveValue("ETHOS-ABCD-2345");
    await expect(page.getByTestId("redeem-sign-in")).toBeVisible();
    // The sign-in form inside is a section of this page, not a second page title.
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByTestId("redeem-submit")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("in Spanish", async ({ page }) => {
    await page.goto("/es/redeem");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Alguien te ha regalado todo.");
  });
});

test.describe("joining a pass", () => {
  test("explains the pass and asks the partner to sign in to join", async ({ page }) => {
    await page.goto("/for-two/join?code=abcdefghij");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your partner saved you a seat.");
    await expect(page.getByText("Nothing to pay, no card needed")).toBeVisible();
    await expect(page.getByTestId("join-sign-in")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    // The link carried its code: nothing to paste.
    await expect(page.getByTestId("join-code-input")).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("a link without its code asks for it", async ({ page }) => {
    await page.goto("/for-two/join");
    await expect(page.getByText("This link has lost its code.", { exact: false })).toBeVisible();
    await expect(page.getByTestId("join-code-input")).toBeVisible();
  });
});

test.describe("after checkout", () => {
  test("a success page without a session says it couldn't confirm, and isn't indexed", async ({ page }) => {
    await page.goto("/checkout/success");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("We couldn't confirm that.");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
