import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { PRODUCTS, formatAmount, type Currency } from "../../src/lib/pricing/products";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { listManifests } from "../../src/templates/manifests";
import { pricingGifts, specialGifts, withCurrencyAnswer, withFreeAnswer } from "../../src/components/pricing/free-gifts";
import { createTranslator } from "next-intl";
import { measure, settle } from "./page-measure";
import { serverNoteShare } from "./server-settings";

/**
 * /pricing remade in the site's new look (docs/marketing/growth-build/PLAN-pricing.md, 24 Nov 2026): a
 * gift's price first, the three ways to pay for gifts, Ethos for Two in its band, the table and the
 * questions closed. This page takes money, so the first thing held here is that every buy button
 * sends exactly what it sent before the remake: the bodies below were recorded on the commit the
 * remake started from (c4ebe320), with the request held by page.route and never sent on. Nothing
 * reaches checkout or sign-in.
 */

// One browser is enough for a layout that sets its own sizes; the phone project would only repeat it.
test.skip(({ isMobile }) => isMobile, "sets its own screen sizes");

/** What a buy button asked checkout for before the remake, in a currency, without the moment it was pressed. */
const BEFORE = {
  single: { product: "single", templateSlugs: ["bouquet"], locale: "en" },
  singleFromEditor: { product: "single", templateSlugs: ["bouquet"], returnTo: "/create/bouquet?resume=publish", locale: "en" },
  pick3: { product: "pick3", templateSlugs: ["bouquet", "the-letter", "constellations"], locale: "en" },
  pick3FromEditor: { product: "pick3", templateSlugs: ["bouquet", "the-letter", "constellations"], returnTo: "/create/bouquet?resume=publish", locale: "en" },
  everything: { product: "everything", templateSlugs: [], locale: "en" },
  everythingEs: { product: "everything", templateSlugs: [], locale: "es" },
  membershipYearly: { product: "membership", plan: "yearly", locale: "en", returnTo: "/account" },
  membershipMonthly: { product: "membership", plan: "monthly", locale: "en", returnTo: "/account" },
} as const;

type Country = { code: string; currency: Currency };
const COUNTRIES: Country[] = [
  { code: "US", currency: "usd" },
  { code: "GB", currency: "gbp" },
  { code: "LV", currency: "eur" },
];
const FROM_EDITOR = `return=${encodeURIComponent("/create/bouquet?resume=publish")}`;

/** The currency a visitor from `country` is charged in by this build: their own where the build sells it (/llms.txt lists it), else euros. */
async function chargedFor(request: APIRequestContext, country: Country): Promise<Currency> {
  const text = await (await request.get("/llms.txt")).text();
  return text.includes(formatAmount(PRODUCTS.single.amounts[country.currency], country.currency, "en")) ? country.currency : "eur";
}

/** Holds every checkout request and answers it itself; keeps each body. */
async function hold(page: Page) {
  const asked: Record<string, unknown>[] = [];
  await page.route("**/api/stripe/checkout", async (route) => {
    asked.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "rate_limited" }) });
  });
  return asked;
}

/** The body as it was recorded: the moment of the press is the only thing that differs between two presses. */
function recorded(body: Record<string, unknown>, landing: string) {
  const source = body.source as { at?: unknown; landing?: unknown; remembered?: unknown } | undefined;
  expect(typeof source?.at).toBe("number");
  expect(source).toMatchObject({ landing, remembered: false });
  return Object.fromEntries(Object.entries(body).filter(([key]) => key !== "source"));
}

/** A server with no Stripe key draws the buttons and answers them with "Payments open soon": then there is no body to compare. */
async function paymentsOff(page: Page) {
  return (await page.getByText("Payments open soon").count()) > 0;
}

async function pick(page: Page, names: string[], total: number) {
  const dialog = page.getByRole("dialog");
  for (const name of names) await dialog.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  await dialog.getByRole("button", { name: `Continue (${total}/${total})` }).click();
}

for (const country of COUNTRIES) {
  test.describe(`a visitor from ${country.code}`, () => {
    test.use({ extraHTTPHeaders: { "x-vercel-ip-country": country.code } });

    test("sees the catalogue's prices in the head and on each card", async ({ page, request }) => {
      const currency = await chargedFor(request, country);
      await page.goto("/pricing");
      const money = (minor: number) => formatAmount(minor, currency, "en");
      await expect(page.getByTestId("head-price")).toHaveText(money(PRODUCTS.single.amounts[currency]));
      await expect(page.getByTestId("price-single")).toHaveText(money(PRODUCTS.single.amounts[currency]));
      await expect(page.getByTestId("price-pick3")).toHaveText(money(PRODUCTS.pick3.amounts[currency]));
      await expect(page.getByTestId("price-everything")).toHaveText(money(PRODUCTS.everything.amounts[currency]));
      await expect(page.getByTestId("price-extras")).toHaveText(money(PRODUCTS.extras.amounts[currency]));

      // The currency question answers in the currency the page charges in, on the page and in its structured
      // data (pricing-D1: a US visitor under dollar prices read "Prices are in euros").
      const name = { usd: "US dollars", gbp: "pounds sterling", eur: "euros" }[currency];
      const answer = page.getByTestId("pricing-faq-rest").locator("details", { hasText: "Which currencies and payment methods?" });
      await expect(answer).toContainText(`Prices are in ${name},`, { useInnerText: false });
      const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(ld.join("\n")).toContain(`Prices are in ${name},`);
      for (const other of Object.values({ usd: "US dollars", gbp: "pounds sterling", eur: "euros" }).filter((n) => n !== name)) {
        expect(ld.join("\n")).not.toContain(`Prices are in ${other}`);
      }
    });

    test("each of the four buy buttons sends what it sent before the remake", async ({ page, request }) => {
      test.setTimeout(120_000);
      const currency = await chargedFor(request, country);
      const asked = await hold(page);
      const expectBody = async (want: Record<string, unknown>, landing: string) => {
        await expect.poll(() => asked.length).toBe(1);
        expect(recorded(asked[0], landing)).toEqual({ ...want, currency });
        asked.length = 0;
      };

      await page.goto("/pricing");
      await page.getByRole("button", { name: "Unlock one" }).click();
      test.skip(await paymentsOff(page), "payments are off on this server (no Stripe key): the buttons only say so");
      await pick(page, ["Bouquet"], 1);
      await expectBody(BEFORE.single, "/pricing");

      await page.goto("/pricing");
      await page.getByRole("button", { name: "Pick three" }).click();
      await pick(page, ["Bouquet", "The Letter", "Constellations"], 3);
      await expectBody(BEFORE.pick3, "/pricing");

      await page.goto("/pricing");
      await page.getByRole("button", { name: "Unlock everything" }).click();
      await expectBody(BEFORE.everything, "/pricing");

      for (const [state, plan, want] of [
        ["off", "", BEFORE.membershipYearly],
        ["on", "", BEFORE.membershipYearly],
        ["on", "&plan=monthly", BEFORE.membershipMonthly],
      ] as const) {
        await page.goto(`/pricing?subscriptions=${state}${plan}`);
        await page.getByTestId("buy-membership").click();
        await expectBody(want, "/pricing");
      }

      // The links the editor sends here: pick three opens with Bouquet chosen, and both come back to the editor.
      await page.goto(`/pricing?template=bouquet&plan=pick3&${FROM_EDITOR}`);
      await pick(page, ["The Letter", "Constellations"], 3);
      await expectBody(BEFORE.pick3FromEditor, "/pricing");

      await page.goto("/es/pricing");
      await page.getByRole("button", { name: "Desbloquear todo" }).click();
      await expectBody(BEFORE.everythingEs, "/es/pricing");
    });

    test("?template=bouquet names Bouquet in the head, and its button buys Bouquet", async ({ page, request }) => {
      const currency = await chargedFor(request, country);
      const asked = await hold(page);
      await page.goto(`/pricing?template=bouquet&${FROM_EDITOR}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Unlock Bouquet");
      await expect(page.locator("[data-flatlay=hero] [data-cover] img").last()).toHaveAttribute("src", /bouquet/);
      await page.getByTestId("head-buy-single").click();
      test.skip(await paymentsOff(page), "payments are off on this server (no Stripe key)");
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("button", { name: /^Bouquet/ })).toBeVisible();
      await dialog.getByRole("button", { name: "Continue (1/1)" }).click();
      await expect.poll(() => asked.length).toBe(1);
      expect(recorded(asked[0], "/pricing")).toEqual({ ...BEFORE.singleFromEditor, currency });
    });
  });
}

test("with a gift named, the head sells that gift: no line about what is free, no link away to it", async ({ page }) => {
  await page.goto("/pricing?template=bouquet");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Unlock Bouquet");
  await expect(page.locator("[data-price-head] p.italic")).toHaveCount(0);
  await expect(page.locator("[data-price-head]").getByRole("link", { name: "See what is free" })).toHaveCount(0);
  await expect(page.getByTestId("head-buy-single")).toBeVisible();
  // Without one, both are there.
  await page.goto("/pricing");
  await expect(page.locator("[data-price-head] p.italic")).toHaveCount(1);
  await expect(page.locator("[data-price-head]").getByRole("link", { name: "See what is free" })).toBeVisible();
});

test("every gift the page counts as paid can be bought from a card on it", async ({ page, request }) => {
  const manifests = listManifests();
  const share = await serverNoteShare(request);
  const { paid } = pricingGifts(manifests, share);
  const { sold } = specialGifts(manifests, share);
  await page.goto("/pricing");
  const special = page.getByTestId("special-card");
  // Make it special opens The Letter, and every free template sold whole at its price (Constellations, with the note live).
  await expect(special.getByRole("link", { name: "Open The Letter" })).toHaveAttribute("href", "/create/the-letter");
  for (const m of sold) await expect(special.getByRole("link", { name: `Open ${m.name.en}` })).toHaveAttribute("href", `/create/${m.slug}`);
  // The One gift picker sells the rest, if payments are open on this server.
  await page.getByRole("button", { name: "Unlock one" }).click();
  test.skip(await paymentsOff(page), "payments are off on this server (no Stripe key): the picker does not open");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Choose 1" })).toBeVisible();
  const listed = new Set(await dialog.locator("li button").evaluateAll((rows) => rows.map((row) => row.querySelector(".block")?.textContent ?? "")));
  const soldSlugs = new Set(sold.map((m) => m.slug));
  for (const m of paid) expect(listed.has(m.name.en) || soldSlugs.has(m.slug), `${m.slug} is counted as paid but no card sells it`).toBe(true);
});

test("the picker shows the gift the buyer came with first, ticked", async ({ page }) => {
  await page.goto("/pricing?template=bouquet&plan=pick3");
  const dialog = page.getByRole("dialog");
  test.skip((await dialog.count()) === 0, "payments are off on this server (no Stripe key): the picker does not open");
  await expect(dialog.getByRole("heading", { name: "Choose 3" })).toBeVisible();
  const first = dialog.locator("li button").first();
  await expect(first).toHaveAccessibleName(/^Bouquet/);
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await expect(first).toBeInViewport();
});

test("a press shows its spinner on its own button; the others only wait", async ({ page }) => {
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/api/stripe/checkout", async (route) => {
    await held;
    await route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "rate_limited" }) });
  });
  await page.goto("/pricing");
  const card = (plan: string) => page.locator(`[data-plan=${plan}] button`);
  await card("everything").click();
  test.skip(await paymentsOff(page), "payments are off on this server (no Stripe key)");
  await expect(card("everything").locator(".animate-spin")).toHaveCount(1);
  for (const plan of ["single", "pick3"]) {
    await expect(card(plan)).toBeDisabled();
    await expect(card(plan).locator(".animate-spin")).toHaveCount(0);
  }
  release();
  await expect(card("pick3")).toBeEnabled();
  await expect(card("everything").locator(".animate-spin")).toHaveCount(0);
});

test("a free template or one that does not exist leaves the head as it is", async ({ page }) => {
  for (const slug of ["the-letter", "not-a-template"]) {
    await page.goto(`/pricing?template=${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("One gift, paid once.");
    await expect(page.getByTestId("head-make")).toHaveAttribute("href", "/templates");
  }
});

for (const [width, height] of [
  [1440, 900],
  [390, 844],
] as const) {
  test(`the first screen at ${width}×${height} holds the heading, the price and "Make a gift"`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { level: 1 })).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId("head-price")).toBeInViewport({ ratio: 1 });
    const make = page.getByTestId("head-make");
    await expect(make).toBeInViewport({ ratio: 1 });
    await expect(make).toHaveText("Make a gift");
    await expect(make).toHaveAttribute("href", "/templates");
    await expect(page.getByRole("link", { name: "See what is free" })).toHaveAttribute("href", "/templates?tier=free");
  });
}

for (const prefix of ["", "/es"]) {
  test(`${prefix}/pricing: at most 300 words with every row closed, nothing under words, nothing too small`, async ({ page }) => {
    test.setTimeout(120_000);
    // Both ways Ethos for Two can be sold (a development server shows either for ?subscriptions=).
    for (const [width, height, query] of [
      [1440, 900, "?subscriptions=off"],
      [390, 844, "?subscriptions=off"],
      [320, 568, "?subscriptions=off"],
      [1440, 900, "?subscriptions=on"],
      [390, 844, "?subscriptions=on"],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto(`${prefix}/pricing${query}`);
      await settle(page);
      const m = await measure(page);
      expect(m.overflow, `${width}: the page scrolls sideways`).toBeLessThanOrEqual(0);
      expect(m.overlaps, `${width}: a piece of the art lies under words`).toEqual([]);
      expect(m.count, `${width} ${query}: words on the page`).toBeLessThanOrEqual(300);
      expect(m.smallest, `${width}: a sentence under 14px`).toBeGreaterThanOrEqual(14);
      expect(m.smallestLabel, `${width}: a label under 12px`).toBeGreaterThanOrEqual(12);
      expect(m.small, `${width}: too small for a thumb`).toEqual([]);
      expect(m.decorInView, `${width}: no art in the first view`).toBeGreaterThanOrEqual(1);
    }
    // Every row is closed: the table, what each plan includes, and every question.
    expect(await page.locator("[data-page-theme] details[open]").count()).toBe(0);
  });

  test(`${prefix}/pricing: every question and answer is in the HTML, and in the structured data`, async ({ request }) => {
    const html = await (await request.get(`${prefix}/pricing?subscriptions=off`, { headers: { "x-vercel-ip-country": "LV" } })).text();
    const text = html.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    const messages = prefix ? es : en;
    const faq = messages.pricing.faq as { q: string; a: string; id?: string }[];
    // While gift cards are off their question is not asked, and with the switch off the pass's answers are the ones given.
    // With the free note for everyone, the free tier's answer is the one written for the note.
    const note = pricingGifts(listManifests(), await serverNoteShare(request)).note;
    // The request comes from Latvia (below): the currency answer is said in euros, whatever the build sells.
    const said = createTranslator({ locale: prefix ? "es" : "en", messages })("pricing.faqCurrency", { currency: "eur" });
    const asked = withCurrencyAnswer(withFreeAnswer(faq, note, messages.pricing.faqFreeNote), said).filter((item) => item.id !== "giftcard" && item.id !== "subscriptions");
    expect(asked.length).toBeGreaterThan(10);
    const ld = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join("\n");
    for (const item of asked) {
      expect(text, item.q).toContain(`>${item.q}`);
      expect(text, item.q).toContain(item.a);
      expect(ld, item.q).toContain(JSON.stringify(item.q).slice(1, -1));
    }
    expect(ld).toContain('"FAQPage"');
    expect(ld).toContain('"BreadcrumbList"');
  });

  test(`${prefix}/pricing: no navy anywhere on the page`, async ({ page }) => {
    for (const query of ["", "?subscriptions=on&plan=yearly"]) {
      await page.goto(`${prefix}/pricing${query}`);
      const navy = await page.evaluate(() => {
        const probe = document.createElement("div");
        probe.style.backgroundColor = "var(--color-dusk)";
        document.body.append(probe);
        const dusk = getComputedStyle(probe).backgroundColor;
        // The whole dusk family, as a fill or inside a gradient (bg-dusk-sky paints its sky as a background-image).
        const tones = ["--color-dusk", "--color-dusk-deep", "--color-dusk-raised", "--brand-dusk-glow"].map((token) => {
          probe.style.backgroundColor = `var(${token})`;
          return getComputedStyle(probe).backgroundColor;
        });
        probe.remove();
        return [...document.querySelectorAll("body *")]
          .filter((el) => {
            const style = getComputedStyle(el);
            return style.backgroundColor === dusk || tones.some((tone) => style.backgroundImage.includes(tone));
          })
          .map((el) => `${el.tagName}.${String(el.className).slice(0, 60)}`);
      });
      expect(navy).toEqual([]);
    }
  });
}

test("someone who came for the membership lands on its band, with the table open", async ({ page }) => {
  for (const query of ["?plan=yearly", "?renew=pass", "?from=saved-dates"]) {
    await page.goto(`/pricing${query}`);
    await expect(page.getByTestId("membership-offer")).toBeInViewport();
    await expect(page.getByTestId("membership-offer")).toHaveClass(/ring-starlight/);
    await expect(page.locator("details[data-compare]")).toHaveAttribute("open", "");
  }
  await page.goto("/pricing");
  await expect(page.locator("details[data-compare]")).not.toHaveAttribute("open", "");
  await expect(page.getByTestId("membership-offer")).not.toHaveClass(/ring-starlight/);
});

test("the anchors other pages link to still land", async ({ page }) => {
  await page.goto("/pricing#gifts");
  await expect(page.locator("#gifts")).toBeInViewport();
  await page.goto("/pricing#for-two");
  await expect(page.locator("#for-two")).toBeInViewport();
});

/**
 * The owner's addendum (24 Nov 2026): no count and no name on the page may disagree with the gallery. This runs
 * at whatever free-note setting the server has; run it once with NEXT_PUBLIC_FREE_NOTE_SHARE=1 (live) and once
 * without. tests/unit/pricing-free-gifts.test.ts holds the words for both settings in one run.
 */
for (const prefix of ["", "/es"]) {
  test(`${prefix}/pricing: every count is the paid list's length, and only free gifts are called free`, async ({ page, request }) => {
    const lang = prefix ? "es" : "en";
    const manifests = listManifests();
    const { free, paid } = pricingGifts(manifests, await serverNoteShare(request));
    await page.goto(`${prefix}/pricing?subscriptions=off`);

    // Everything counts the gifts that cannot go out free, as the gallery does.
    const everything = page.locator("[data-plan=everything]");
    await expect(everything).toContainText(new RegExp(`\\b${paid.length} (paid gifts|regalos de pago)`));

    // The head's italic line, the table's free column, the includes row and the free tier's answer: each gift they name is free.
    await page.locator("[data-includes] summary").click();
    await page.locator("details[data-compare] summary").click();
    const freeQuestion = (prefix ? es : en).pricing.faq.find((item) => "id" in item && item.id === "free")!.q;
    await page.getByText(freeQuestion, { exact: true }).click();
    const said = [
      await page.locator("[data-price-head] p.italic").innerText(),
      await page.locator("[data-includes]").innerText(),
      await page.locator("details[data-compare]").innerText(),
      await page.locator("details", { hasText: freeQuestion }).innerText(),
    ].join("\n");
    const sold = paid.filter((m) => new RegExp(`(^|[^\\p{L}])${m.name[lang]}($|[^\\p{L}])`, "u").test(said)).map((m) => m.slug);
    // The includes row names gifts only where it says what is free, so a paid gift named anywhere in these is a contradiction.
    expect(sold).toEqual([]);
    for (const m of free) expect(said).toContain(m.name[lang]);
  });
}

/** The deep test of 24 Nov 2026 (reports/pricing-deep.md): the picker, the way back, the head's button, a phone's spacing. */

test("closing the picker hands focus back to the button that opened it (pricing-D3)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/pricing?template=bouquet");
  for (const [opener, close] of [
    [page.locator("[data-plan=single] button"), "Escape"],
    [page.locator("[data-plan=pick3] button"), "button"],
    [page.getByTestId("head-buy-single"), "Escape"],
  ] as const) {
    await expect(opener).toBeEnabled();
    await opener.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog");
    test.skip((await dialog.count()) === 0 && (await paymentsOff(page)), "payments are off on this server (no Stripe key): the picker does not open");
    await expect(dialog).toBeVisible();
    if (close === "Escape") await page.keyboard.press("Escape");
    else await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(opener).toBeFocused();
  }
});

test("the picker's X answers a tap across 44px, though it is drawn at 28 (pricing-D4)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pricing");
  await page.getByRole("button", { name: "Unlock one" }).click();
  test.skip(await paymentsOff(page), "payments are off on this server (no Stripe key): the picker does not open");
  const close = page.getByRole("dialog").getByRole("button", { name: "Close" });
  const box = (await close.boundingBox())!;
  // The four corners of a 44px square centred on the drawn button land on it (its ::after), not on the sheet.
  const hits = await page.evaluate(({ x, y, w, h }) => {
    const cx = x + w / 2;
    const cy = y + h / 2;
    return [[-21, -21], [21, -21], [-21, 21], [21, 21]].map(([dx, dy]) => Boolean(document.elementFromPoint(cx + dx, cy + dy)?.closest("[data-slot=dialog-close]")));
  }, { x: box.x, y: box.y, w: box.width, h: box.height });
  expect(hits).toEqual([true, true, true, true]);
});

test("the editor's pick-three link opens the picker once: back from checkout shows the page (pricing-D5)", async ({ page }) => {
  await page.route("**/api/stripe/checkout", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "/about" }) }));
  await page.goto(`/pricing?template=bouquet&plan=pick3&${FROM_EDITOR}`);
  const dialog = page.getByRole("dialog");
  test.skip((await dialog.count()) === 0 && (await paymentsOff(page)), "payments are off on this server (no Stripe key): the picker does not open");
  await expect(dialog.getByRole("heading", { name: "Choose 3" })).toBeVisible();
  // The address keeps the gift and the way back, and loses the order to open the picker.
  await expect.poll(() => new URL(page.url()).searchParams.has("plan")).toBe(false);
  expect(new URL(page.url()).searchParams.get("template")).toBe("bouquet");
  expect(new URL(page.url()).searchParams.get("return")).toBe("/create/bouquet?resume=publish");
  await page.keyboard.press("Escape");
  // One gift through the head's button, to "checkout" (answered with /about), then Back.
  await page.getByTestId("head-buy-single").click();
  await dialog.getByRole("button", { name: "Continue (1/1)" }).click();
  await page.waitForURL("**/about");
  await page.goBack({ timeout: 30_000 });
  expect(new URL(page.url()).searchParams.has("plan")).toBe(false);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Unlock Bouquet", { timeout: 15_000 });
  await expect(page.getByTestId("head-buy-single")).toBeEnabled();
  await expect(dialog).toHaveCount(0);
});

test("the head's buy button waits, drawn as waiting, until it can open the picker (pricing-D6)", async ({ page, request }) => {
  // In the server's HTML, before any script runs, it is disabled and busy: a tap then is not lost without a sign.
  const html = await (await request.get("/pricing?template=bouquet")).text();
  const button = html.match(/<button[^>]*data-testid="head-buy-single"[^>]*>/)?.[0] ?? "";
  expect(button).toContain('disabled=""');
  expect(button).toContain('aria-busy="true"');
  // Hydrated, it is ready, and a press opens the picker (or says payments are not open).
  await page.goto("/pricing?template=bouquet");
  const head = page.getByTestId("head-buy-single");
  await expect(head).toHaveAttribute("data-ready", "");
  await expect(head).toBeEnabled();
  await expect(head).toHaveAttribute("aria-busy", "false");
  await head.click();
  if (!(await paymentsOff(page))) await expect(page.getByRole("dialog").getByRole("heading", { name: "Choose 1" })).toBeVisible();
});

for (const prefix of ["", "/es"]) {
  test(`${prefix}/pricing on a phone: the Best value pill stands clear, and Make it special's buttons share a width (pricing-D7)`, async ({ page }) => {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${prefix}/pricing`);
      const pick3 = (await page.locator("[data-plan=pick3]").boundingBox())!;
      const pill = (await page.locator("[data-plan=everything] > span").first().boundingBox())!;
      expect(pill.y - (pick3.y + pick3.height), `${width}: the pill nearly touches Pick three`).toBeGreaterThanOrEqual(12);
      const widths = await page.getByTestId("special-card").getByRole("link").evaluateAll((links) => links.map((l) => Math.round(l.getBoundingClientRect().width)));
      expect(new Set(widths).size, `${width}: ${widths.join(", ")}`).toBe(1);
    }
  });
}

test("the header's language button shows its focus ring to a keyboard (pricing-D10)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/pricing");
  const button = page.locator("header").getByRole("button", { name: /^Language/ });
  // Reach it by keyboard, so :focus-visible holds.
  for (let i = 0; i < 30 && !(await button.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
  await expect(button).toBeFocused();
  // The ring is drawn round the pill inside the 44px target, not on the target itself.
  const ring = await button.evaluate((el) => {
    const pill = el.firstElementChild as HTMLElement;
    const style = getComputedStyle(pill);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(ring.style).toBe("solid");
  expect(ring.width).toBeGreaterThanOrEqual(2);
});

test("the band's buttons show a cream focus ring to a keyboard, not wine on wine (pricing-C15)", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/pricing?subscriptions=on");
  const band = page.getByTestId("membership-hero");
  const buy = page.getByTestId("buy-membership");
  // Reach the band by keyboard, so :focus-visible holds: Tab from a stand-in put just before it.
  await band.evaluate((el) => {
    const marker = document.createElement("button");
    marker.dataset.testMarker = "";
    el.before(marker);
    marker.focus();
  });
  const seen: string[] = [];
  for (let i = 0; i < 12 && !(await buy.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      if (!el.closest("[data-testid=membership-hero]") || !el.matches(":focus-visible")) return null;
      return getComputedStyle(el).outlineColor;
    });
    if (ring) seen.push(ring);
  }
  await expect(buy).toBeFocused();
  seen.push(await buy.evaluate((el) => getComputedStyle(el).outlineColor));
  const ground = await band.evaluate((el) => getComputedStyle(el).backgroundColor);
  const cream = await band.evaluate((el) => {
    const probe = document.createElement("span");
    probe.style.color = "var(--color-cream)";
    el.append(probe);
    const c = getComputedStyle(probe).color;
    probe.remove();
    return c;
  });
  // The plan toggle's two choices and the buy button, each drawn in cream on the wine.
  expect(seen.length).toBeGreaterThanOrEqual(2);
  for (const ring of seen) {
    expect(ring).toBe(cream);
    expect(ring).not.toBe(ground);
  }
  const style = await buy.evaluate((el) => ({ style: getComputedStyle(el).outlineStyle, offset: parseFloat(getComputedStyle(el).outlineOffset) }));
  expect(style.style).toBe("solid");
  expect(style.offset).toBeGreaterThan(0);
});

for (const [prefix, messages] of [["", en], ["/es", es]] as const) {
  test(`${prefix}/pricing: the band has its one line, as the plan on sale has it (pricing-C10)`, async ({ page }) => {
    for (const [subs, key] of [["on", "forTwoLine"], ["off", "forTwoLinePass"]] as const) {
      await page.goto(`${prefix}/pricing?subscriptions=${subs}`);
      await expect(page.getByTestId("membership-hero").getByText(messages.pricing.page[key], { exact: true })).toBeVisible();
    }
  });
}
