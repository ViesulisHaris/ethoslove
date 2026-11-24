import { devices, expect, test, type Page } from "@playwright/test";

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

const MIA_BIRTHDAY = (month: number, day: number) => [{ id: "r1", recipientName: "Mia", occasion: "birthday", month, day, locale: "en", templateSlug: null }];

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
  // Defined, not assigned: WebKit has an ApplePaySession of its own, which an assignment may not replace.
  if (setup.wallet) await page.addInitScript(() => Object.defineProperty(window, "ApplePaySession", { value: { canMakePayments: () => true }, configurable: true, writable: true }));
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
/** The card's own checkout requests: on an Android phone (mobile-chrome) the wallet's session is asked for on view too. */
const byCard = (asked: Record<string, unknown>[]) => asked.filter((body) => !body.oneTap);

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
    await expect.poll(() => byCard(asked).length).toBe(1);
    expect(byCard(asked)[0]).toMatchObject({ product: "pair", currency: "eur", locale: "en", returnTo: "/dashboard" });
    for (const body of asked) expect(noAmounts(body)).toEqual([]);
    // Refused (here: too many tries): said, and the button is back.
    await expect(page.getByText("Too many tries. Wait a minute and try again.")).toBeVisible();
    await expect(add).toBeEnabled();
    expect(errors.filter((e) => !/Failed to load resource|ERR_FAILED|stripe/i.test(e))).toEqual([]);
  });

  test("the pay control is on the first screen of an iPhone 13 in WebKit (664 px seen), in English and Spanish, with a wallet and without", async ({ playwright, baseURL }, info) => {
    test.skip(info.project.name !== "desktop-chrome", "WebKit is launched here by hand: once is enough");
    test.setTimeout(120_000);
    const browser = await playwright.webkit.launch();
    try {
      for (const locale of ["en", "es"] as const)
        for (const wallet of [false, true]) {
          const context = await browser.newContext({
            ...devices["iPhone 13"],
            baseURL,
            storageState: { cookies: [], origins: [{ origin: new URL(baseURL!).origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] },
          });
          const page = await context.newPage();
          await open(page, `${locale === "es" ? "/es" : ""}/share-preview`, { wallet, stripeDelayMs: 7000 });
          // With a wallet: its pill, or the card button in the same place once four seconds have gone by
          // (a slow first load of the page in WebKit can take that long).
          const control = wallet ? page.getByTestId("pair-wallet").or(page.getByTestId("pair-add")).first() : page.getByTestId("pair-add");
          await expect(control).toBeVisible();
          if (wallet) await expect(page.getByTestId("pair-by-card").or(page.getByTestId("pair-add"))).toHaveCount(1);
          await page.evaluate(() => document.fonts.ready);
          const seen = await page.evaluate(() => ({ height: window.innerHeight, scrolled: window.scrollY }));
          expect(seen).toEqual({ height: 664, scrolled: 0 });
          const box = (await control.boundingBox())!;
          expect(box.height).toBe(48);
          expect(box.y + box.height, `${locale} ${wallet ? "wallet" : "card"}`).toBeLessThanOrEqual(seen.height);
          // The day rows are one line each where they fit ("Christmas · 25 December"); the "next" line is still read aloud.
          await expect(page.getByTestId("pair-offer")).toContainText(locale === "es" ? "Hoy te has acordado. Lo próximo:" : "You remembered today. Next up:");
          await expect(page.getByTestId("pair-offer").getByText(locale === "es" ? "Hoy te has acordado. Lo próximo:" : "You remembered today. Next up:")).toHaveCSS("position", "absolute");
          const row = (await page.getByTestId("pair-days").locator("li").first().boundingBox())!;
          expect(row.height).toBeLessThanOrEqual(42);
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
          await context.close();
        }
    } finally {
      await browser.close();
    }
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

  test("three taps in one go ask for one checkout", async ({ page }) => {
    const { asked } = await open(page, "/share-preview");
    const add = page.getByTestId("pair-add");
    await expect(add).toBeEnabled();
    await add.evaluate((el: HTMLElement) => {
      el.click();
      el.click();
      el.click();
    });
    await expect.poll(() => byCard(asked).length).toBe(1);
    await page.waitForTimeout(800);
    expect(byCard(asked)).toHaveLength(1);
  });

  test("a saved birthday that answers late is a row in the card's first frame: no row is added or swapped", async ({ page }) => {
    await open(page, "/share-preview?occasion=christmas", { remindersDelayMs: 1500, reminders: MIA_BIRTHDAY(1, 20) });
    await expect(page.getByTestId("pair-offer")).toBeVisible();
    // The moment the card is there, its rows are the final ones.
    const rows = page.getByTestId("pair-days").locator("li");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Mia's birthday");
    await expect(rows.nth(1)).toContainText("Valentine's Day");
    const before = await page.getByTestId("pair-add").boundingBox();
    await page.waitForTimeout(1000);
    expect(await page.getByTestId("pair-add").boundingBox()).toEqual(before);
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText("Mia's birthday");
  });

  for (const [when, rows] of [
    ["2026-12-20T10:00:00", ["Valentine's Day", "Christmas"]],
    ["2027-02-10T10:00:00", ["Christmas", "Valentine's Day"]],
  ] as const) {
    test(`in the busiest week (${when.slice(0, 10)}) the card still names two days`, async ({ page }) => {
      await page.clock.setFixedTime(new Date(when));
      await open(page, "/share-preview?occasion=birthday");
      const days = page.getByTestId("pair-days").locator("li");
      await expect(days).toHaveCount(2);
      for (const [i, name] of rows.entries()) await expect(days.nth(i)).toContainText(name);
    });
  }

  test("a saved anniversary for this person comes in as a row", async ({ page }) => {
    await open(page, "/share-preview?occasion=birthday", { reminders: [{ id: "r1", recipientName: "Mia", occasion: "anniversary", month: 1, day: 9, locale: "en", templateSlug: null }] });
    await expect(page.getByTestId("pair-days")).toContainText("Your anniversary");
  });

  test("in Spanish", async ({ page }) => {
    await open(page, "/es/share-preview");
    const card = page.getByTestId("pair-offer");
    await expect(card).toContainText("Que nadie caiga en el olvido.");
    await expect(card).toContainText("Hoy te has acordado. Lo próximo:");
    await expect(card).toContainText("Navidad");
    await expect(card.getByTestId("pair-add")).toHaveText("Añadir los dos por 5 €");
    // The Spanish card is taller (the Instagram line wraps): its button is still on the first screen.
    const box = await card.getByTestId("pair-add").boundingBox();
    expect(box && box.y + box.height).toBeLessThanOrEqual(844);
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
    const height = (await page.getByTestId("pair-offer").boundingBox())!.height;
    const pill = (await page.getByTestId("pair-wallet-holding").boundingBox())!.y;
    const foot = (await page.getByTestId("pair-foot").boundingBox())!;
    // Stripe's button can't load here: after four seconds the card button, silently, in the same height,
    // where the pill was, with the foot where it was drawn.
    await expect(page.getByTestId("pair-add")).toBeVisible({ timeout: 8000 });
    expect(asked).toHaveLength(1);
    expect((await page.getByTestId("pair-offer").boundingBox())!.height).toBe(height);
    expect((await page.getByTestId("pair-add").boundingBox())!.y).toBe(pill);
    expect(await page.getByTestId("pair-foot").boundingBox()).toEqual(foot);
  });

  test.describe("on an Android phone in Chrome", () => {
    test.use({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36" });
    test.skip(!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, "the wallet is only tried with a publishable key (run with the placeholder one)");

    test("without Google Pay confirmed: no wallet session is made, and nothing below the card moves when the card button takes over", async ({ page }) => {
      // Stripe.js can't load here (held, then refused), as on a phone where Stripe can't answer: Google Pay is never confirmed.
      await page.addInitScript(() => {
        const w = window as unknown as { shifts: string[] };
        w.shifts = [];
        new PerformanceObserver((list) => {
          for (const e of list.getEntries() as unknown as { value: number; sources?: { node?: Node | null }[] }[])
            for (const src of e.sources ?? []) w.shifts.push(((src.node as HTMLElement | null)?.dataset?.testid ?? (src.node as Element | null)?.nodeName ?? "?") + ":" + e.value);
        }).observe({ type: "layout-shift", buffered: true });
      });
      const { asked } = await open(page, "/share-preview", { stripeDelayMs: 2500 });
      await expect(page.getByTestId("pair-wallet-holding")).toBeVisible();
      const foot = (await page.getByTestId("pair-foot").boundingBox())!;
      const shiftsBefore = await page.evaluate(() => (window as unknown as { shifts: string[] }).shifts.length);
      const card = page.getByTestId("pair-offer");
      const qr = page.getByText("QR card");
      const before = { card: (await card.boundingBox())!.height, qr: (await qr.boundingBox())!.y };
      await expect(page.getByTestId("pair-add")).toBeVisible({ timeout: 8000 });
      expect((await card.boundingBox())!.height).toBe(before.card);
      expect((await qr.boundingBox())!.y).toBe(before.qr);
      // The foot keeps its place and size: the reserved space is in the pay block, nothing jumps inside the card.
      expect(await page.getByTestId("pair-foot").boundingBox()).toEqual(foot);
      expect(await page.evaluate((n) => (window as unknown as { shifts: string[] }).shifts.slice(n), shiftsBefore)).toEqual([]);
      expect(asked.filter((b) => b.oneTap)).toHaveLength(0);
    });
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

  test("with Apple Pay here, paying by card instead leaves the card button, not a wallet button whose session was closed", async ({ page }) => {
    const { asked } = await open(page, "/share-preview", { wallet: true, stripeDelayMs: 7000 });
    await expect(page.getByTestId("pair-wallet-holding")).toBeVisible();
    await expect.poll(() => asked.filter((b) => b.oneTap).length).toBe(1);
    await page.getByTestId("pair-by-card").click();
    await expect(page.getByText("Too many tries. Wait a minute and try again.")).toBeVisible();
    // Asking for Stripe's page closed the wallet's session: from here on, the card button only.
    await expect(page.getByTestId("pair-wallet")).toHaveCount(0);
    await expect(page.getByTestId("pair-add")).toBeEnabled();
    expect(asked.filter((b) => b.oneTap)).toHaveLength(1);
  });

  test("on a 320 px phone the bought card's start button keeps its words inside the pill", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    for (const [path, label] of [
      ["/share-preview?state=bought&occasion=christmas", "Start the one for Mia's birthday now"],
      ["/es/share-preview?state=bought&occasion=christmas", "Empezar ya el del cumpleaños de Mia"],
    ] as const) {
      await page.clock.setFixedTime(new Date("2026-11-24T10:00:00"));
      await open(page, path, { reminders: MIA_BIRTHDAY(12, 10) });
      const start = page.getByTestId("pair-bought").getByRole("link");
      await expect(start).toHaveText(label);
      expect(await start.evaluate((a) => a.scrollWidth <= a.clientWidth)).toBe(true);
      const box = (await start.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(320);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
    }
  });

  test("a 40-character name keeps 'Send to …' inside a 375 px screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const long = "Maximiliana Alexandra de la Cruz Fernán";
    await open(page, `/share-preview?paid=2&name=${encodeURIComponent(long)}`);
    const send = page.getByTestId("already-paid-send");
    await expect(send).toContainText(long);
    const box = (await send.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(375);
    expect(await send.evaluate((b) => b.scrollWidth <= b.clientWidth)).toBe(true);
  });

  test("the foot's lines are evenly spaced, and Terms is still a 44 px tap target", async ({ page }) => {
    await open(page, "/share-preview");
    const foot = page.getByTestId("pair-foot");
    await expect(foot).toContainText("A gift you haven't used can be refunded for 30 days. Terms");
    // Every line box the same height: the link's tap area no longer stretches the one it sits on.
    const lines = await foot.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = [...new Set([...range.getClientRects()].map((r) => Math.round(r.top)))].sort((a, b) => a - b);
      return tops.slice(1).map((top, i) => top - tops[i]);
    });
    expect(lines.length).toBeGreaterThan(0);
    for (const gap of lines) expect(gap).toBeLessThanOrEqual(22);
    // The tap area is the pseudo-element around the word.
    const hit = await foot.getByRole("link", { name: "Terms" }).evaluate((a) => parseFloat(getComputedStyle(a, "::after").height));
    expect(hit).toBeGreaterThanOrEqual(44);
  });

  test("on a short 320 px phone (640 px) the name and date share a line, the distance goes under them, and nothing leaves the screen", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await open(page, "/es/share-preview");
    const row = page.getByTestId("pair-days").locator("li").nth(1);
    const name = (await row.getByText("San Valentín", { exact: true }).boundingBox())!;
    const date = (await row.getByText("14 de febrero", { exact: true }).boundingBox())!;
    const away = (await row.getByText(/^en \d+ semanas$/).boundingBox())!;
    expect(name.height).toBeLessThan(22);
    expect(date.x).toBeGreaterThan(name.x + name.width - 1);
    expect(Math.abs(date.y - name.y)).toBeLessThan(4);
    expect(away.y).toBeGreaterThan(name.y + name.height - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });

  test("on a 320 px phone the day rows keep the name on one line and the distance goes under the date", async ({ page }) => {
    // Tall enough not to be a short screen: there the rows are one line each (the test above).
    await page.setViewportSize({ width: 320, height: 800 });
    await open(page, "/es/share-preview");
    const row = page.getByTestId("pair-days").locator("li").nth(1);
    await expect(row).toContainText("San Valentín");
    const name = row.getByText("San Valentín", { exact: true });
    const date = row.getByText("14 de febrero", { exact: true });
    const away = row.getByText(/^en \d+ semanas$/);
    // One line each (15 px text, leading-snug; 14 px text).
    expect((await name.boundingBox())!.height).toBeLessThan(26);
    expect((await date.boundingBox())!.height).toBeLessThan(24);
    expect((await away.boundingBox())!.y).toBeGreaterThan((await date.boundingBox())!.y);
    expect((await away.boundingBox())!.x).toBe((await date.boundingBox())!.x);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  });

  test("a gift sent on one of the two says so; a sender with no offer sees no card at all", async ({ page }) => {
    await open(page, "/share-preview?used=1", { ready: 1, offer: false });
    await expect(page.getByTestId("pair-used")).toContainText("This one was already paid for. Nothing to pay.");
    await expect(page.getByTestId("pair-used")).toContainText("One left, ready for Christmas.");
    await open(page, "/share-preview", { offer: false });
    await expect(page.getByText("Instagram:")).toBeVisible();
    await expect(page.getByTestId("pair-offer")).toHaveCount(0);
  });
});
