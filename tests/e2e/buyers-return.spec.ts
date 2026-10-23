import { expect, test, type Page } from "@playwright/test";
import { needPreviews } from "./server-state";

/**
 * Reasons for a buyer to come back: "every template for the difference" on the success page, and
 * the share screen's reminder card (their birthday, your anniversary, Valentine's Day, someone else,
 * every month). Both are drawn from the development-only previews (a real success page needs a
 * finished Stripe checkout, a real share screen a published gift, and the dev server's database is
 * production), so on a production build these skip. Every button talks to the real route, which each
 * test answers itself, and looks at what was asked for: never an amount, a product or a user.
 * Prices are the euro catalogue (NEXT_PUBLIC_PRICE_CURRENCIES unset).
 */

/** Answers the POSTs to `url` and records what each asked; a GET (the card reading what's saved) goes on to the server. */
async function answer(page: Page, url: string, reply: { status: number; body: Record<string, unknown> }, delayMs = 0) {
  const asked: Record<string, unknown>[] = [];
  await page.route(url, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    asked.push(route.request().postDataJSON() as Record<string, unknown>);
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({ status: reply.status, contentType: "application/json", body: JSON.stringify(reply.body) });
  });
  return asked;
}

test.describe("every template for the difference, on the success page", () => {
  test.beforeEach(async ({ request }) => needPreviews(request));

  test("says what was paid counts, in one offer with one button, under the way back to the gift", async ({ page }) => {
    await page.goto("/checkout/success/preview?state=single");
    const card = page.getByTestId("upgrade-after");
    await expect(card).toContainText("That's one occasion sorted.");
    await expect(card).toContainText("And their birthday, your anniversary, ");
    await expect(card).toContainText("every template, forever, for €15.00 more.");
    await expect(card.getByTestId("upgrade-after-credit")).toHaveText("You've already paid €9.99 of the €24.99.");
    await expect(card.getByRole("button")).toHaveCount(1);
    await expect(card.getByTestId("upgrade-after-buy")).toHaveText("Add every template for €15.00 more");
    // Credit, never a discount, and no deadline: none is set.
    await expect(card).not.toContainText(/discount|save|% off|until|expires|hurry|today only|last chance/i);
    const back = page.getByRole("link", { name: "Back to your gift" });
    await expect(back).toBeVisible();
    expect((await back.boundingBox())!.y).toBeLessThan((await card.boundingBox())!.y);
  });

  test("names the occasion only when the template leaves no doubt", async ({ page }) => {
    await page.goto("/checkout/success/preview?state=birthday");
    const card = page.getByTestId("upgrade-after");
    await expect(card).toContainText("Their birthday's sorted.");
    await expect(card).not.toContainText("And their birthday");
    await expect(card).toContainText("And your anniversary, ");
  });

  test("after a pick three or make it special, what each of them paid", async ({ page }) => {
    await page.goto("/checkout/success/preview?state=pick3");
    await expect(page.getByTestId("upgrade-after-buy")).toHaveText("Add every template for €10.00 more");
    await expect(page.getByTestId("upgrade-after-credit")).toHaveText("You've already paid €14.99 of the €24.99.");
    await page.goto("/checkout/success/preview?state=extras");
    await expect(page.getByTestId("upgrade-after-buy")).toHaveText("Add every template for €17.50 more");
    await expect(page.getByTestId("upgrade-after-credit")).toHaveText("You've already paid €7.49 of the €24.99.");
  });

  test("counts earlier purchases too, and says when a real deadline is set", async ({ page }) => {
    await page.goto("/checkout/success/preview?state=earlier");
    await expect(page.getByTestId("upgrade-after-credit")).toHaveText("What you've paid so far counts towards the €24.99.");
    await expect(page.getByTestId("upgrade-after-buy")).toHaveText("Add every template for €4.99 more");
    await page.goto("/checkout/success/preview?state=until");
    await expect(page.getByTestId("upgrade-after-credit")).toContainText("You've already paid €9.99 of the €24.99, and that counts until ");
  });

  test("in Spanish", async ({ page }) => {
    await page.goto("/es/checkout/success/preview?state=single");
    const card = page.getByTestId("upgrade-after");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(card).toContainText("Ya tienes un regalo listo.");
    await expect(card).toContainText("Para su cumpleaños, vuestro aniversario, ");
    await expect(card).toContainText("por 15,00 € más.");
    await expect(card.getByTestId("upgrade-after-credit")).toHaveText("Ya has pagado 9,99 € de los 24,99 €.");
    await expect(card.getByTestId("upgrade-after-buy")).toHaveText("Añadir todas por 15,00 € más");
    await expect(page.getByRole("link", { name: "Volver a tu regalo" })).toBeVisible();
  });

  test("buys with the checkout it follows and nothing else, and goes where the server says", async ({ page }) => {
    const asked = await answer(page, "**/api/money/upgrade/after-checkout", { status: 200, body: { url: "/pricing?from=upgrade-test" } });
    await page.goto("/checkout/success/preview?state=single");
    await page.getByTestId("upgrade-after-buy").click();
    await page.waitForURL(/\/pricing\?from=upgrade-test/);
    expect(asked).toEqual([{ sessionId: "cs_test_previewpreviewpreview", returnTo: "/create/bouquet?resume=publish", locale: "en" }]);
  });

  test("a guest's way back to the gift signs them in when tapped, not with a link drawn with the page", async ({ page }) => {
    const asked = await answer(page, "**/api/checkout/continue", { status: 200, body: { url: "/pricing?from=continue-test" } });
    await page.goto("/checkout/success/preview?state=single&guest=1");
    await page.getByTestId("back-to-gift").click();
    await page.waitForURL(/\/pricing\?from=continue-test/);
    expect(asked).toEqual([{ sessionId: "cs_test_previewpreviewpreview", returnTo: "/create/bouquet?resume=publish", locale: "en" }]);
  });

  test("a double tap opens one checkout", async ({ page }) => {
    const asked = await answer(page, "**/api/money/upgrade/after-checkout", { status: 429, body: { error: "rate_limited" } }, 800);
    await page.goto("/checkout/success/preview?state=single");
    const buy = page.getByTestId("upgrade-after-buy");
    await buy.click();
    await buy.click({ force: true }).catch(() => {});
    await expect(page.getByText("Too many tries. Wait a minute and try again.")).toBeVisible();
    expect(asked).toHaveLength(1);
  });

  test("someone who already has every template sees the offer go, and why", async ({ page }) => {
    await answer(page, "**/api/money/upgrade/after-checkout", { status: 409, body: { error: "already_owned" } });
    await page.goto("/checkout/success/preview?state=single");
    await page.getByTestId("upgrade-after-buy").click();
    await expect(page.getByText("That's already on your account. Nothing to pay.")).toBeVisible();
    await expect(page.getByTestId("upgrade-after")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Back to your gift" })).toBeVisible();
  });
});

test.describe("the share screen's reminder card", () => {
  test.beforeEach(async ({ request }) => needPreviews(request));

  async function pickDay(page: Page, field: ReturnType<Page["getByRole"]>, month: string, day: number) {
    await field.click();
    await page.getByRole("radio", { name: month, exact: true }).click();
    await page.getByRole("radio", { name: String(day), exact: true }).click();
    // The card closes on the day; the next field is for after it has gone.
    await expect(page.getByRole("radio", { name: month, exact: true })).toHaveCount(0);
  }

  test("holds this gift's day next year and the other days, none of them added until tapped", async ({ page }) => {
    const reminders = await answer(page, "**/api/reminders", { status: 201, body: {} });
    await page.goto("/reminders/preview?template=birthday-cinema&name=Ana");
    const card = page.getByTestId("remind-card");
    await expect(card).toContainText("Want a nudge before the next one?");
    await expect(card.getByTestId("remind-row-next")).toContainText("Ana's birthday");
    await expect(card.getByTestId("remind-row-next")).toContainText("next year");
    // The gift's own occasion isn't offered twice.
    await expect(card.getByTestId("remind-row-birthday")).toHaveCount(0);
    await expect(card.getByTestId("remind-row-anniversary")).toContainText("Your anniversary");
    await expect(card.getByTestId("remind-row-valentines")).toContainText("Valentine's Day");
    await expect(card.getByTestId("remind-row-monthly")).toContainText("Every month too");
    await expect(card.getByTestId("remind-row-someone")).toContainText("Someone else");
    await expect(card.getByText("Added")).toHaveCount(0);
    await expect(card.getByRole("checkbox", { checked: true })).toHaveCount(0);
    expect(reminders).toHaveLength(0);
  });

  test("a day the account already has for them shows as added, and isn't asked for again", async ({ page }) => {
    const reminders = await answer(page, "**/api/reminders", { status: 201, body: {} });
    await page.route("**/api/reminders", (route) =>
      route.request().method() === "GET"
        ? route.fulfill({ json: { reminders: [{ id: "r1", recipientName: "ana", occasion: "valentines", month: 2, day: 14, locale: "en", templateSlug: null }, { id: "r2", recipientName: "Ana", occasion: "anniversary", month: 6, day: 9, locale: "en", templateSlug: null }] } })
        : route.fallback(),
    );
    await page.route("**/api/monthsaries", (route) => (route.request().method() === "GET" ? route.fulfill({ json: { monthsaries: [{ id: "m1", partnerName: "Ana", since: "2025-04-03", locale: "en" }] } }) : route.fallback()));
    await page.goto("/reminders/preview?template=birthday-cinema&name=Ana");
    await expect(page.getByTestId("remind-row-valentines").getByText("Added")).toBeVisible();
    await expect(page.getByTestId("remind-row-anniversary")).toContainText("9 June");
    await expect(page.getByTestId("remind-row-anniversary").getByText("Added")).toBeVisible();
    await expect(page.getByTestId("remind-row-monthly")).toContainText("Day 3 of each month");
    await expect(page.getByTestId("remind-row-next").getByText("Added")).toHaveCount(0);
    expect(reminders).toHaveLength(0);
  });

  test("Valentine's Day is one tap, as another day than the gift's", async ({ page }) => {
    const reminders = await answer(page, "**/api/reminders", { status: 201, body: {} });
    await page.goto("/reminders/preview?template=birthday-cinema&name=Ana");
    const row = page.getByTestId("remind-row-valentines");
    await row.getByRole("button", { name: "Remind me: Valentine's Day" }).click();
    await expect(row.getByText("Added")).toBeVisible();
    expect(reminders).toEqual([{ recipientName: "Ana", occasion: "valentines", month: 2, day: 14, locale: "en", templateSlug: "birthday-cinema", forThisGift: false }]);
    await expect(page.getByRole("link", { name: "All your reminders" })).toBeVisible();
  });

  test("this gift's own day is one tap too, and skips this year when it's the day just made for", async ({ page }) => {
    const reminders = await answer(page, "**/api/reminders", { status: 201, body: {} });
    await page.goto("/reminders/preview?template=bouquet&name=Ana");
    await page.getByTestId("remind-row-next").getByRole("button", { name: "Remind me: Valentine's Day" }).click();
    await expect(page.getByTestId("remind-row-next").getByText("Added")).toBeVisible();
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ recipientName: "Ana", occasion: "valentines", month: 2, day: 14, templateSlug: "bouquet" });
    expect(reminders[0]).not.toHaveProperty("forThisGift");
  });

  test("a birthday waits for its day: nothing is saved on a guessed date", async ({ page }) => {
    const reminders = await answer(page, "**/api/reminders", { status: 201, body: {} });
    await page.goto("/reminders/preview?template=bouquet&name=Ana");
    const row = page.getByTestId("remind-row-birthday");
    await expect(row).toContainText("Pick the day");
    await row.getByRole("button", { name: "Remind me: Ana's birthday" }).click();
    const save = row.getByTestId("remind-save-birthday");
    await expect(save).toBeDisabled();
    await pickDay(page, row.getByRole("button", { name: "Date", exact: true }), "March", 14);
    await expect(save).toBeEnabled();
    await save.click();
    await expect(row.getByText("Added")).toBeVisible();
    await expect(row).toContainText("14 March");
    expect(reminders).toEqual([{ recipientName: "Ana", occasion: "birthday", month: 3, day: 14, locale: "en", templateSlug: "bouquet", forThisGift: false }]);
  });

  test("someone else: a name and a day, and then another", async ({ page }) => {
    const reminders = await answer(page, "**/api/reminders", { status: 201, body: {} });
    await page.goto("/reminders/preview?template=bouquet&name=Ana");
    const row = page.getByTestId("remind-row-someone");
    await row.getByRole("button", { name: "Remind me: Someone else" }).click();
    const save = row.getByTestId("remind-save-someone");
    await expect(save).toBeDisabled();
    await row.getByLabel("Who it's for").fill("Mum");
    await pickDay(page, row.getByRole("button", { name: "Date", exact: true }), "May", 4);
    await save.click();
    await expect(row).toContainText("Mum · Birthday · 4 May");
    await expect(row).toContainText("Someone else too");
    // Someone else's day has nothing to do with this gift's template.
    expect(reminders).toEqual([{ recipientName: "Mum", occasion: "birthday", month: 5, day: 4, locale: "en", forThisGift: false }]);
    await row.getByRole("button", { name: "Remind me: Someone else" }).click();
    await row.getByLabel("Who it's for").fill("Sam");
    await pickDay(page, row.getByRole("button", { name: "Date", exact: true }), "July", 9);
    await row.getByTestId("remind-save-someone").click();
    await expect(row).toContainText("Sam · Birthday · 9 July");
    expect(reminders).toHaveLength(2);
  });

  test("every month: a day that has come, a check the day before, nothing ever sent to the partner", async ({ page }) => {
    const monthly = await answer(page, "**/api/monthsaries", { status: 201, body: {} });
    await page.goto("/reminders/preview?template=bouquet&name=Ana");
    const row = page.getByTestId("remind-row-monthly");
    await row.getByRole("button", { name: "Remind me: Every month too" }).click();
    await expect(row).toContainText("The day before each one, we'll ask if it's still on, and only remind you if you say yes. Nothing is ever sent to Ana.");
    const save = row.getByTestId("remind-save-monthly");
    await expect(save).toBeDisabled();
    // Tomorrow's day this year hasn't come yet.
    const tomorrow = new Date(Date.now() + 86_400_000);
    const thisYear = new Date().getFullYear();
    test.skip(tomorrow.getFullYear() !== thisYear, "on 31 December no day of this year is still to come");
    const month = new Intl.DateTimeFormat("en-GB", { month: "long" }).format(tomorrow);
    await pickDay(page, row.getByRole("button", { name: "Together since", exact: true }), month, tomorrow.getDate());
    // Unless the year is changed, a day still to come counts from last year.
    const year = row.getByRole("button", { name: /^Year/ });
    await expect(year).toContainText(String(thisYear - 1));
    const chooseYear = async (value: number) => {
      // The menu animates in and out: open it until its choice is there, then wait for it to go.
      await expect(async () => {
        if ((await page.getByRole("menu").count()) === 0) await year.click();
        await page.getByRole("menuitemradio", { name: String(value) }).click({ timeout: 1500 });
      }).toPass({ timeout: 15_000 });
      await expect(page.getByRole("menu")).toHaveCount(0);
      await expect(year).toContainText(String(value));
    };
    await chooseYear(thisYear);
    await expect(row.getByText("That day hasn't come yet.")).toBeVisible();
    await expect(save).toBeDisabled();
    await chooseYear(thisYear - 1);
    await expect(row.getByText("That day hasn't come yet.")).toHaveCount(0);
    await save.click();
    await expect(row.getByText("Added")).toBeVisible();
    const day = `${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    expect(monthly).toEqual([{ partnerName: "Ana", since: `${thisYear - 1}-${day}`, locale: "en" }]);
  });

  test("says when the account already has fifty reminders", async ({ page }) => {
    await answer(page, "**/api/reminders", { status: 409, body: { error: "too_many", max: 50 } });
    await page.goto("/reminders/preview?template=birthday-cinema&name=Ana");
    const row = page.getByTestId("remind-row-valentines");
    await row.getByRole("button", { name: "Remind me: Valentine's Day" }).click();
    await expect(row.getByRole("alert")).toHaveText("You already have 50 reminders. Remove one on your account page to add this one.");
  });

  test("in Spanish", async ({ page }) => {
    await page.goto("/es/reminders/preview?template=bouquet&name=Ana");
    const card = page.getByTestId("remind-card");
    await expect(card).toContainText("¿Te avisamos antes de la próxima fecha?");
    await expect(card.getByTestId("remind-row-birthday")).toContainText("El cumpleaños de Ana");
    await expect(card.getByTestId("remind-row-anniversary")).toContainText("Vuestro aniversario");
    await expect(card.getByTestId("remind-row-monthly")).toContainText("Y cada mes");
    await expect(card.getByTestId("remind-row-monthly")).toContainText("A Ana no le enviamos nada.");
    await expect(card.getByTestId("remind-row-someone")).toContainText("Otra persona");
    await expect(card.getByTestId("remind-row-next")).toContainText("el año que viene");
  });
});

test.describe("the routes behind them", () => {
  test("the upgrade route takes nothing it can't check, and sells nothing without payments", async ({ request }) => {
    for (const data of [{}, { sessionId: "pi_123" }, { sessionId: "cs_test_x'; drop table purchases;--" }, { sessionId: "cs_test_previewpreviewpreview", returnTo: "//evil.example" }]) {
      const response = await request.post("/api/money/upgrade/after-checkout", { data });
      // Without Stripe configured the route answers 503 before it looks; with it, 400.
      expect([400, 503]).toContain(response.status());
    }
  });

  test("monthly reminders need a sign-in to list, save or stop", async ({ request }) => {
    expect((await request.get("/api/monthsaries")).status()).toBe(401);
    expect((await request.post("/api/monthsaries", { data: { partnerName: "Ana", since: "2026-03-03" } })).status()).toBe(401);
    expect((await request.delete("/api/monthsaries?id=5f0c6f7e-3a55-4d2b-9a57-0e8a3f1b2c4d")).status()).toBe(401);
  });

  for (const path of ["/api/monthsaries/yes", "/api/monthsaries/stop"]) {
    test(`${path} with a forged token shows a page and acts on nothing`, async ({ page, request }) => {
      const response = await page.goto(`${path}?t=5f0c6f7e-3a55-4d2b-9a57-0e8a3f1b2c4d.forged&l=en`);
      expect([404, 503]).toContain(response?.status());
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(/This link doesn't work\.|Something went wrong\./);
      await expect(page.getByRole("button")).toHaveCount(0);
      const oneClick = await request.post(`${path}?t=forged`, { form: { "List-Unsubscribe": "One-Click" } });
      expect([404, 503]).toContain(oneClick.status());
    });
  }
});
