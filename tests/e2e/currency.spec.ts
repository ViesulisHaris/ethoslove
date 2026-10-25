import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * Prices in the visitor's own currency, from the page to the checkout request: a visitor in the
 * United States sees and is asked to pay $11.99 for one template, one in Latvia €9.99, one in the
 * United Kingdom £8.99. The country comes in as Vercel's x-vercel-ip-country header, which the proxy
 * reads to serve that currency's copy of the page (src/proxy.ts, src/app/[currency]).
 *
 * Which currencies a build charges is NEXT_PUBLIC_PRICE_CURRENCIES at build time, read back from
 * /llms.txt, which lists every price in each. Unset (CI, and the live site until the owners switch
 * it on), every country must still see euros; built with "eur,usd,gbp", each its own.
 */

type Country = { code: string; currency: "usd" | "eur" | "gbp"; single: string; singleEs: string; everything: string };
const COUNTRIES: Country[] = [
  { code: "US", currency: "usd", single: "$11.99", singleEs: "11,99 US$", everything: "$29.99" },
  { code: "LV", currency: "eur", single: "€9.99", singleEs: "9,99 €", everything: "€24.99" },
  // Spanish writes pounds out as GBP.
  { code: "GB", currency: "gbp", single: "£8.99", singleEs: "8,99 GBP", everything: "£21.99" },
];
const EURO = COUNTRIES[1];

/** What this build charges in, from the prices /llms.txt lists. */
async function chargedHere(request: APIRequestContext): Promise<Set<Country["currency"]>> {
  const text = await (await request.get("/llms.txt")).text();
  return new Set(COUNTRIES.filter((c) => text.includes(c.single)).map((c) => c.currency));
}

/** Answers checkout itself and keeps what it was asked: Stripe is never reached. */
async function answerCheckout(page: Page) {
  const asked: Record<string, unknown>[] = [];
  await page.route("**/api/stripe/checkout", async (route) => {
    asked.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "checkout" }) });
  });
  return asked;
}

/** The offer in a template page's structured data: what a search result quotes. */
async function productOffer(page: Page): Promise<{ price: string; priceCurrency: string }> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const nodes = blocks.flatMap((b) => {
    const json = JSON.parse(b);
    return Array.isArray(json["@graph"]) ? json["@graph"] : [json];
  });
  return nodes.find((n: { "@type"?: string }) => n["@type"] === "Product").offers;
}

for (const country of COUNTRIES) {
  test.describe(`a visitor in ${country.code}`, () => {
    test.use({ extraHTTPHeaders: { "x-vercel-ip-country": country.code } });

    /** This visitor's prices if the build charges their currency, otherwise euros. */
    const expected = async (request: APIRequestContext) => ((await chargedHere(request)).has(country.currency) ? country : EURO);

    test("sees the template page, its price and its structured data in one currency", async ({ page, request }) => {
      const want = await expected(request);
      await page.goto("/templates/bouquet");
      await expect(page.getByText(`${want.single} once when you send it`)).toBeVisible();
      expect(await productOffer(page)).toMatchObject({ price: want.single.replace(/[^0-9.]/g, ""), priceCurrency: want.currency.toUpperCase() });
      // No other country's price anywhere in the page, the FAQ and the structured data included.
      const html = await page.content();
      for (const other of COUNTRIES.filter((c) => c.currency !== want.currency)) expect(html).not.toContain(other.single);
    });

    test("in Spanish too", async ({ page, request }) => {
      const want = await expected(request);
      await page.goto("/es/templates/bouquet");
      await expect(page.locator("html")).toHaveAttribute("lang", "es");
      await expect(page.getByText(want.singleEs, { exact: false }).first()).toBeVisible();
    });

    test("sees the pricing page in that currency", async ({ page, request }) => {
      const want = await expected(request);
      await page.goto("/pricing");
      await expect(page.getByTestId("price-single")).toHaveText(want.single);
      await expect(page.getByTestId("price-everything")).toHaveText(want.everything);
    });

    test("is shown that price at the paywall, and checkout is asked for that currency", async ({ page, request }) => {
      const want = await expected(request);
      const asked = await answerCheckout(page);
      // Where the US ads land.
      await page.goto("/create/bouquet?ref=ad-meta-bq");
      await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
      await page.getByLabel("Their name").fill("Leo");
      await page.getByLabel("Your name").fill("Mia");
      await page.getByLabel("Message", { exact: true }).fill("For every Sunday morning.");
      await page.getByRole("button", { name: "Publish", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      // A build with no Supabase or Stripe keys (CI) has no pay sheet: "Publishing needs Supabase".
      // Built with keys at a dead address and any STRIPE_SECRET_KEY, it has one, and checkout is
      // answered here, so nothing reaches either service.
      test.skip((await dialog.getByText("Publishing needs Supabase").count()) > 0, "no pay sheet on a server without Supabase and Stripe configured");
      const panel = dialog.getByTestId("pay-panel");
      await expect(panel.getByTestId("plan-single")).toContainText(want.single);
      await expect(panel.getByTestId("pay-single")).toHaveText(`Pay ${want.single} and send`);
      await panel.getByTestId("pay-single").click();
      await expect.poll(() => asked.length).toBe(1);
      // The currency the page showed, and never an amount: the server prices it (tests/unit/visitor-currency.test.ts
      // follows the same request on to the Stripe session: $11.99, €9.99, £8.99).
      expect(asked[0]).toMatchObject({ product: "single", templateSlugs: ["bouquet"], currency: want.currency, ref: "ad-meta-bq" });
      expect(Object.keys(asked[0]).filter((k) => /amount|price|total/i.test(k))).toEqual([]);
    });
  });
}

test("the terms say which currency each buyer is charged in", async ({ page, request }) => {
  const charged = await chargedHere(request);
  await page.goto("/legal/terms");
  const terms = page.locator("main");
  if (charged.has("usd") && charged.has("gbp")) {
    await expect(terms).toContainText("We charge in euros, or in US dollars if you're in the United States and in pounds sterling if you're in the United Kingdom");
    await expect(terms).toContainText("one template €9.99 ($11.99 in the US, £8.99 in the UK)");
  } else {
    await expect(terms).toContainText("We charge in euros. If you pay in another currency");
    await expect(terms).toContainText("one template €9.99;");
  }
});
