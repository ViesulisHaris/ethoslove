import { expect, test, type Page } from "@playwright/test";

/**
 * The second fix round on the preview (docs/marketing/growth-build/reports/view-fix-2-brief.md): each
 * test holds one finding of the user walks of 23 Nov 2026 (view-walk-make.md, view-walk-rooms.md),
 * named by its number. No sign-in request leaves the browser: every call to Supabase's auth is held
 * here and answered by the test, and nothing ever reaches checkout.
 */

/** Holds every Supabase auth call (sign-in link, code, Google) and records the bodies. */
async function holdSignIn(page: Page) {
  const sent: string[] = [];
  await page.route(/\/auth\/v1\//, (route) => {
    sent.push(route.request().postData() ?? route.request().url());
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  return sent;
}

test.describe("make-2: a mistyped address is caught before the sign-in link goes", () => {
  for (const [lang, path, words] of [
    ["en", "/login", { noDot: "That address is missing its ending, like .com", mean: "Did you mean", keep: "No, send it to", inbox: "Check your inbox" }],
    ["es", "/es/login", { noDot: "A esa dirección le falta el final, como .com", mean: "¿Quisiste decir", keep: "No, envíalo a", inbox: "Revisa tu correo" }],
  ] as const) {
    test(`${lang}: no dot is refused, a slip is offered a correction, and nothing is sent until chosen`, async ({ page }) => {
      const sent = await holdSignIn(page);
      await page.goto(path);
      const email = page.locator("#email");
      await expect(email).toBeVisible();
      const send = page.getByRole("button", { name: /magic link|enlace mágico/i });

      await email.fill("maya@gmail");
      await send.click();
      await expect(page.locator("[data-email-note=noDot]")).toHaveText(words.noDot);

      await email.fill("ana@gmail.con");
      await expect(page.locator("[data-email-note]")).toHaveCount(0);
      await send.click();
      const note = page.locator("[data-email-note=suggest]");
      await expect(note).toContainText(`${words.mean} ana@gmail.com?`);
      await page.waitForTimeout(500);
      expect(sent).toEqual([]);

      await note.locator("[data-take-suggestion]").click();
      await expect(page.getByText(words.inbox)).toBeVisible();
      expect(sent).toHaveLength(1);
      expect(sent[0]).toContain('"email":"ana@gmail.com"');
      expect(sent[0]).not.toContain("gmail.con");
    });
  }

  test("the slip may be kept, and a real address goes straight out", async ({ page }) => {
    const sent = await holdSignIn(page);
    await page.goto("/login");
    const email = page.locator("#email");
    await expect(email).toBeVisible();
    await email.fill("ana@gmail.con");
    await page.getByRole("button", { name: /magic link/i }).click();
    await page.getByRole("button", { name: "No, send it to ana@gmail.con" }).click();
    await expect(page.getByText("Check your inbox")).toBeVisible();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain('"email":"ana@gmail.con"');

    await page.getByRole("button", { name: "Use a different email" }).click();
    await email.fill("ana@yahoo.co.uk");
    await page.getByRole("button", { name: /magic link/i }).click();
    await expect(page.getByText("Check your inbox")).toBeVisible();
    expect(sent).toHaveLength(2);
    expect(sent[1]).toContain('"email":"ana@yahoo.co.uk"');
  });
});

test.describe("make-8 and make-2 in the publish sheet", () => {
  test("a guest's sign-in card has one title, no dead Publish button, and catches a slip", async ({ page }) => {
    const sent = await holdSignIn(page);
    await page.goto("/create/the-letter");
    await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
    await page.getByRole("button", { name: "Publish", exact: true }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("Sign in to publish")).toBeVisible();
    await expect(sheet.getByText("Welcome back")).toHaveCount(0);
    await expect(sheet.getByText("We'll email you a link. No password to remember.")).toHaveCount(0);
    await expect(sheet.getByRole("button", { name: /^(Publish now|Schedule)/ })).toBeHidden();

    await sheet.locator("#email").fill("ana@gmail.con");
    await sheet.getByRole("button", { name: /magic link/i }).click();
    await expect(sheet.locator("[data-email-note=suggest]")).toContainText("ana@gmail.com");
    await page.waitForTimeout(500);
    expect(sent).toEqual([]);
  });
});

test.describe("make-3: a checkout that could not be confirmed", () => {
  for (const [path, link, pricing] of [
    ["/checkout/success?session_id=cs_test_madeup123", "the pricing page", "/pricing"],
    ["/es/checkout/success?session_id=cs_test_madeup123", "la página de precios", "/es/pricing"],
    ["/checkout/success", "the pricing page", "/pricing"],
  ] as const) {
    test(`shows an alert mark, not the tick, and links the pricing page (${path})`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("[data-success-mark=alert]")).toBeVisible();
      await expect(page.locator("main svg.text-moss, .container-narrow svg.text-moss")).toHaveCount(0);
      await expect(page.getByRole("link", { name: link })).toHaveAttribute("href", pricing);
    });
  }

  test("the paid page keeps its green tick", async ({ page }) => {
    await page.goto("/checkout/success/preview");
    await expect(page.locator(".container-narrow svg.text-moss")).toBeVisible();
    await expect(page.locator("[data-success-mark=alert]")).toHaveCount(0);
  });
});

test.describe("make-4: the sign-in wall remembers where the person was going", () => {
  test("a signed-out visit lands on /login with next", async ({ request }) => {
    for (const [asked, login] of [
      ["/account/reminders", "/login?next=%2Faccount%2Freminders"],
      ["/dashboard/gift/k7m2p9xqa?tab=share", "/login?next=%2Fdashboard%2Fgift%2Fk7m2p9xqa%3Ftab%3Dshare"],
      ["/es/my-dates", "/es/login?next=%2Fmy-dates"],
    ] as const) {
      const res = await request.get(asked, { maxRedirects: 0 });
      expect(res.status(), asked).toBe(307);
      expect(new URL(res.headers().location, "http://x").pathname + new URL(res.headers().location, "http://x").search, asked).toBe(login);
    }
  });

  test("a header sent from outside never becomes the next", async ({ request }) => {
    const res = await request.get("/account", { maxRedirects: 0, headers: { "x-ethos-asked-path": "https://evil.example/" } });
    expect(new URL(res.headers().location, "http://x").search).toBe("?next=%2Faccount");
  });
});

test.describe("make-6: the Spanish editor's music list", () => {
  test("every track's note is in Spanish and the first mood pill says Todas", async ({ page }) => {
    await page.goto("/es/create/photo-booth");
    const library = page.getByRole("radio", { name: "De la biblioteca" });
    await library.scrollIntoViewIfNeeded();
    await library.click();
    await expect(page.getByRole("button", { name: "Todas", exact: true })).toBeVisible();
    await expect(page.getByText("Piano con fieltro · lento · Cálida")).toBeVisible();
    await expect(page.getByText("First Light", { exact: true })).toBeVisible();
    for (const english of ["Felt piano", "Music box", "Fingerpicked", "Air Force Band"]) await expect(page.getByText(english)).toHaveCount(0);
  });

  test("in English the pill says All", async ({ page }) => {
    await page.goto("/create/photo-booth");
    const library = page.getByRole("radio", { name: "From the library" });
    await library.scrollIntoViewIfNeeded();
    await library.click();
    await expect(page.getByRole("button", { name: "All", exact: true })).toBeVisible();
    await expect(page.getByText("Felt piano · slow · Warm")).toBeVisible();
  });
});

test.describe("make-7: a long name shows its count before it is cut", () => {
  test("from 30 characters, under both name fields", async ({ page }) => {
    await page.goto("/create/the-letter");
    for (const label of ["Their name", "Your name"]) {
      const field = page.getByLabel(label, { exact: true });
      await expect(field).toBeVisible({ timeout: 30_000 });
      await field.fill("Maximiliano Alexander");
      const count = field.locator("xpath=following-sibling::p[@data-name-count]");
      await expect(count).toHaveCount(0);
      await field.fill("Maximiliano Alexander Fitzgerald-Mo");
      await expect(count).toHaveText("35 / 40");
      await field.fill("Maximiliano Alexander Fitzgerald-Montgomery the Third");
      await expect(count).toHaveText("40 / 40");
    }
  });
});
