import { expect, test, type Page } from "@playwright/test";

/**
 * Two more gifts on the share screen ("Nobody likes to be forgotten."), on the development page
 * /share-preview (a made-up live gift), with every request held and answered here: nothing reaches
 * Stripe or a database. The page is a 404 in a production build, so these skip under CI, as the
 * keep-preview specs do.
 */
test.skip(!!process.env.CI, "the share preview page exists only on a development server");

const OFFER = { eur: { amount: 500, currency: "eur" }, usd: { amount: 600, currency: "usd" }, gbp: { amount: 400, currency: "gbp" } } as const;
const COUNTRY_CURRENCY: Record<string, keyof typeof OFFER> = { US: "usd", GB: "gbp", DE: "eur" };

type Setup = { ready?: number; offer?: boolean; reminders?: unknown[]; remindersDelayMs?: number; wallet?: boolean; stripeDelayMs?: number; entitlementsDelayMs?: number };

/**
 * Signs the browser in as far as the page can tell (a session cookie's name), and answers what the
 * card asks: the entitlements (the offer in the currency the visitor's country gets), the saved
 * days, and checkout, whose request bodies are kept. Stripe.js is never fetched.
 */
async function open(page: Page, path: string, setup: Setup = {}) {
  const asked: Record<string, unknown>[] = [];
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const base = new URL(test.info().project.use.baseURL ?? "http://localhost:3000");
  await page.context().addCookies([{ name: "sb-placeholder-auth-token", value: "x", domain: base.hostname, path: "/" }]);
  if (setup.wallet) await page.addInitScript(() => Object.assign(window, { ApplePaySession: { canMakePayments: () => true } }));
  await page.route("**/js.stripe.com/**", async (route) => {
    // Stripe.js never loads here; held a while first when a test wants to see the wait.
    if (setup.stripeDelayMs) await new Promise((r) => setTimeout(r, setup.stripeDelayMs));
    await route.abort().catch(() => {});
  });
  await page.route("**/api/entitlements*", async (route) => {
    if (setup.entitlementsDelayMs) await new Promise((r) => setTimeout(r, setup.entitlementsDelayMs));
    const country = route.request().headers()["x-vercel-ip-country"] ?? "DE";
    const offer = setup.offer === false ? null : OFFER[COUNTRY_CURRENCY[country] ?? "eur"];
    await route.fulfill({ json: { signedIn: true, templates: ["coquette"], packs: [], pass: null, membership: null, savedDatesLimit: 3, upgrade: null, giftsReady: setup.ready ?? 0, pairOffer: offer } });
  });
  await page.route("**/api/reminders", async (route) => {
    if (setup.remindersDelayMs) await new Promise((r) => setTimeout(r, setup.remindersDelayMs));
    await route.fulfill({ json: { reminders: setup.reminders ?? [] } });
  });
  await page.route("**/api/monthsaries", (route) => route.fulfill({ json: { monthsaries: [] } }));
  await page.route("**/api/stripe/checkout", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    asked.push(body);
    if (body.oneTap) await route.fulfill({ json: { clientSecret: "cs_test_pairpairpairpair_secret_x", sessionId: "cs_test_pairpairpairpair" } });
    else await route.fulfill({ status: 429, json: { error: "rate_limited" } });
  });
  await page.goto(path);
  return { asked, errors };
}

const noAmounts = (body: Record<string, unknown>) => Object.keys(body).filter((k) => /amount|price|total|waiver/i.test(k));

test.describe("two more gifts under the link", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the card button is on the first screen of a 390x844 phone, and asks for the product, never an amount", async ({ page }) => {
    const { asked, errors } = await open(page, "/share-preview");
    const card = page.getByTestId("pair-offer");
    await expect(card).toContainText("Nobody likes to be forgotten.");
    await expect(card).toContainText("You remembered today. Next up:");
    await expect(card).toContainText("Christmas");
    await expect(card).toContainText("Valentine's Day");
    await expect(card.getByTestId("pair-price")).toHaveText("€5");
    await expect(card).toContainText("Separately €19.98");
    const add = card.getByTestId("pair-add");
    await expect(add).toHaveText("Add both for €5");
    const box = await add.boundingBox();
    expect(box && box.y + box.height).toBeLessThanOrEqual(844);

    await add.click();
    await expect.poll(() => asked.length).toBe(1);
    expect(asked[0]).toMatchObject({ product: "pair", currency: "eur", locale: "en", returnTo: "/dashboard" });
    expect(asked[0]).not.toHaveProperty("oneTap");
    expect(noAmounts(asked[0])).toEqual([]);
    // Refused (here: too many tries): said, and the button is back.
    await expect(page.getByText("Too many tries. Wait a minute and try again.")).toBeVisible();
    await expect(add).toBeEnabled();
    expect(errors.filter((e) => !/Failed to load resource|ERR_FAILED|stripe/i.test(e))).toEqual([]);
  });

  test("nothing moves when the saved days answer", async ({ page }) => {
    await open(page, "/share-preview", { remindersDelayMs: 1500, reminders: [] });
    const add = page.getByTestId("pair-add");
    await expect(add).toBeVisible();
    const before = await add.boundingBox();
    await page.waitForTimeout(2200);
    expect(await add.boundingBox()).toEqual(before);
  });

  test("the card is in the share screen's first frame: nothing under the link moves when it comes", async ({ page }) => {
    // The account's answer is slow; the screen waits for it (the publish sheet loads it while open),
    // so the moment the link's screen is there, the card is too, and the rest sits where it stays.
    await open(page, "/share-preview", { entitlementsDelayMs: 1500 });
    const hint = page.getByText("Instagram:");
    await expect(hint).toBeVisible();
    await expect(page.getByTestId("pair-offer")).toHaveCount(1);
    const qr = page.getByText("QR card");
    const before = await qr.boundingBox();
    await page.waitForTimeout(1500);
    expect(await qr.boundingBox()).toEqual(before);
  });

  test("a saved anniversary for this person comes in as a row", async ({ page }) => {
    await open(page, "/share-preview?occasion=birthday", { reminders: [{ id: "r1", recipientName: "Mia", occasion: "anniversary", month: 1, day: 9, locale: "en", templateSlug: null }] });
    await expect(page.getByTestId("pair-days")).toContainText("Your anniversary");
  });

  test("in Spanish", async ({ page }) => {
    await open(page, "/es/share-preview");
    const card = page.getByTestId("pair-offer");
    await expect(card).toContainText("A nadie le gusta caer en el olvido.");
    await expect(card).toContainText("Hoy te has acordado. Lo próximo:");
    await expect(card).toContainText("Navidad");
    await expect(card.getByTestId("pair-add")).toHaveText("Añadir los dos por 5 €");
  });

  for (const [country, price] of [["US", "$6"], ["GB", "£4"], ["DE", "€5"]] as const) {
    test.describe(`a visitor from ${country}`, () => {
      test.use({ extraHTTPHeaders: { "x-vercel-ip-country": country } });
      test(`is shown ${price}`, async ({ page }) => {
        await open(page, "/share-preview");
        await expect(page.getByTestId("pair-price")).toHaveText(price);
      });
    });
  }

  test("with Apple Pay here: one wallet session, with no box ticked, and the black pill holds the place until the card button takes over", async ({ page }) => {
    const { asked } = await open(page, "/share-preview", { wallet: true, stripeDelayMs: 7000 });
    await expect(page.getByTestId("pair-wallet-holding")).toBeVisible();
    await expect(page.getByTestId("pair-by-card")).toHaveText("Pay by card instead");
    await expect.poll(() => asked.length).toBe(1);
    expect(asked[0]).toMatchObject({ product: "pair", currency: "eur", oneTap: true });
    expect(asked[0]).not.toHaveProperty("waiver");
    // Stripe's button can't load here: after four seconds the card button, silently.
    await expect(page.getByTestId("pair-add")).toBeVisible({ timeout: 8000 });
    expect(asked).toHaveLength(1);
  });

  test("paying, declined and bought", async ({ page }) => {
    await open(page, "/share-preview?state=paying");
    await expect(page.getByTestId("pair-add")).toHaveText("One moment…");
    await expect(page.getByTestId("pair-add")).toBeDisabled();
    await open(page, "/share-preview?state=declined");
    await expect(page.getByRole("alert").filter({ hasText: "payment" })).toHaveText("That payment didn't go through, and nothing was charged. Try again, or pay by card.");
    await expect(page.getByTestId("pair-add")).toBeEnabled();
    await open(page, "/share-preview?state=bought");
    const bought = page.getByTestId("pair-bought");
    await expect(bought).toContainText("Two gifts are ready.");
    await expect(bought.getByRole("link", { name: "Start the Christmas one now" })).toHaveAttribute("href", /\/occasions\/christmas$/);
  });

  test("a gift sent on one of the two says so; a sender with no offer sees no card at all", async ({ page }) => {
    await open(page, "/share-preview?used=1", { ready: 1, offer: false });
    await expect(page.getByTestId("pair-used")).toContainText("This was one of your gifts. Nothing to pay.");
    await expect(page.getByTestId("pair-used")).toContainText("One left, ready for Christmas.");
    await open(page, "/share-preview", { offer: false });
    await expect(page.getByText("Instagram:")).toBeVisible();
    await expect(page.getByTestId("pair-offer")).toHaveCount(0);
  });
});
