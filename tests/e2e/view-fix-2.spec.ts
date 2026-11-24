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

/** The tour keeps itself off automated browsers; these tests tell the page they are a person (tour.spec.ts). */
async function asAPerson(page: Page) {
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
}

test.describe("rooms-10: after a room's tour a phone is where it started", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  for (const [path, how] of [
    ["/trips", "finished"],
    ["/games", "finished"],
    ["/trips", "skipped"],
  ] as const) {
    test(`${path}, ${how}`, async ({ page }) => {
      await asAPerson(page);
      await page.goto(path);
      const tour = page.locator("[data-tour-card]");
      await expect(tour).toBeVisible({ timeout: 20_000 });
      const started = await page.evaluate(() => window.scrollY);
      if (how === "skipped") {
        // A step on, so the page has moved, then Skip.
        await tour.getByRole("button", { name: "Next" }).click();
        await page.waitForTimeout(900);
        await tour.getByRole("button", { name: /^Skip/ }).click();
      } else {
        for (let i = 0; i < 8; i++) {
          const done = tour.getByRole("button", { name: "Got it" });
          if (await done.isVisible()) {
            await page.waitForTimeout(900);
            expect(await page.evaluate(() => window.scrollY), "the tour moved the page").toBeGreaterThan(started + 100);
            await done.click();
            break;
          }
          await tour.getByRole("button", { name: "Next" }).click();
          await page.waitForTimeout(500);
        }
      }
      await expect(tour).toBeHidden();
      await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 }).toBeLessThanOrEqual(started + 2);
    });
  }
});

test.describe("rooms-13: a trip map's zoom buttons are a finger's size on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });
  test("44 by 44", async ({ page }) => {
    await page.goto("/trips/lisbon-slow-weekend");
    const map = page.locator(".ethos-map-canvas");
    await map.scrollIntoViewIfNeeded();
    for (const name of ["Zoom in", "Zoom out"]) {
      const button = map.getByRole("button", { name });
      await expect(button).toBeVisible({ timeout: 30_000 });
      const box = (await button.boundingBox())!;
      expect(Math.round(box.width), name).toBeGreaterThanOrEqual(44);
      expect(Math.round(box.height), name).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("rooms-3: a trip's hero at 1440", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test("its flowers lie whole inside it, and its ground fades into the page's", async ({ page }) => {
    for (const id of ["baltic-coast", "lisbon-slow-weekend"]) {
      await page.goto(`/trips/${id}`);
      const frame = page.locator("main section").first().locator("[data-floral-frame]");
      await expect(frame).toHaveAttribute("data-floral-frame", "bandHero");
      const out = await frame.evaluate((box) => {
        const band = box.getBoundingClientRect();
        return [...box.querySelectorAll("img")]
          .map((img) => ({ r: img.getBoundingClientRect(), shown: getComputedStyle(img).display !== "none" }))
          .filter(({ r, shown }) => shown && r.left < band.left + band.width / 2 && r.bottom > band.bottom + 1)
          .map(({ r }) => Math.round(r.bottom - band.bottom));
      });
      expect(out, id).toEqual([]);
      // Measured in one go: the page may still be settling between two separate reads.
      const gap = await page.locator("main section").first().evaluate((section) => {
        const fade = section.querySelector("[data-hero-fade]");
        return fade ? Math.abs(section.getBoundingClientRect().bottom - fade.getBoundingClientRect().bottom) : null;
      });
      expect(gap, id).not.toBeNull();
      expect(gap!, id).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("rooms-14: Plan the next visit opens Dates", () => {
  test("on /dates, then on their town once the box has one; the idea cards are warm", async ({ page }) => {
    await page.goto("/long-distance");
    const plan = page.locator("[data-plan-visit]");
    await expect(plan).toHaveAttribute("href", "/dates");
    const them = page.getByRole("combobox", { name: "Where they are" });
    await them.fill("Paris");
    await page.getByRole("option", { name: /^Paris/ }).first().click();
    await expect(plan).toHaveAttribute("href", /^\/dates\?lat=[-\d.]+&lng=[-\d.]+&q=Paris/);
    // No cool card left among the ideas: each gradient's colours have more red than blue.
    const cool = await page.$$eval("main ul li[style*='linear-gradient']", (cards) =>
      cards
        .flatMap((c) => [...(c as HTMLElement).style.background.matchAll(/rgb\((\d+), (\d+), (\d+)\)/g)].map((m) => ({ r: +m[1], b: +m[3], title: c.querySelector("h3")?.textContent })))
        .filter(({ r, b }) => b > r)
        .map(({ title }) => title),
    );
    expect(cool).toEqual([]);
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
