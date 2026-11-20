import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { bring, endControls, playToEnd } from "./play-gift";

/**
 * The person who receives a gift makes the next one: the end screen's "or make one for someone
 * else", the step after a reaction, the two-line maker's mark, and the counts that say how often
 * each is used. A real gift needs a database, which a worktree doesn't have, so the gift is the
 * development-only /gift-preview (the real GiftExperience around a template's demo gift); on a
 * production build that page is a 404 and these skip. Vercel's script is only served on Vercel, so
 * the tests stand in for it and take down what the page hands to `window.va` (as arrival.spec.ts does).
 */

async function needGiftPreview(request: APIRequestContext) {
  const status = (await request.get("/gift-preview?template=the-letter")).status();
  test.skip(status === 404, "/gift-preview is development-only: a production build answers 404");
}

type Counted = { name: string; data: Record<string, unknown> };

async function countEvents(page: Page) {
  // In development Vercel's debug script does load, from its CDN, and takes `window.va` over a moment
  // after the page opens: a tap made later than that would go to it and not to the list below.
  await page.route(/va\.vercel-scripts\.com|\/_vercel\/(insights|speed-insights)\//, (route) => route.abort());
  await page.addInitScript(() => {
    const w = window as unknown as { __counted?: unknown[][]; va: (...args: unknown[]) => void };
    w.__counted ??= [];
    w.va = (...args: unknown[]) => {
      w.__counted!.push(args);
    };
  });
}

async function events(page: Page): Promise<Counted[]> {
  return page.evaluate(() =>
    ((window as unknown as { __counted?: unknown[][] }).__counted ?? [])
      .filter((call) => call[0] === "event")
      .map((call) => {
        const sent = call[1] as { name?: unknown; data?: Record<string, unknown> } | undefined;
        return { name: String(sent?.name), data: sent?.data ?? {} };
      }),
  );
}

/** Every control on the end screen can be scrolled to and pressed, and is a thumb tall. */
async function expectAllReachable(page: Page, template: string, names: string[]) {
  const { sideways, controls } = await endControls(page, template);
  expect(sideways, "the gift scrolls sideways").toBe(false);
  for (const name of names) expect(controls.map((c) => c.name), `the end screen has "${name}"`).toContainEqual(expect.stringContaining(name));
  for (const control of controls) {
    expect(control.inside && control.hit, `"${control.name}" can be scrolled to and pressed`).toBe(true);
    expect(control.height, `"${control.name}" is at least 44px tall`).toBeGreaterThanOrEqual(44);
  }
}

test.describe("a gift's end screen, for whoever received it", () => {
  // A gift is a phone thing (93% of opens), and each test plays one to its end: the phone project only.
  test.skip(({ isMobile }) => !isMobile, "played once, on the phone project");
  test.beforeEach(async ({ request }) => needGiftPreview(request));
  test.setTimeout(240_000);

  test("a free gift: the quiet link after Send one back, the two-line mark, and both counted", async ({ page, context }) => {
    await countEvents(page);
    expect(await playToEnd(page, { template: "the-letter" }), "The Letter plays to its end").toBe(true);
    const gift = page.url();

    const link = page.getByTestId("make-for-someone-else");
    await bring(page, '[data-testid="make-for-someone-else"]');
    await expect(link).toHaveText("or make one for someone else");
    await expect(link).toHaveAttribute("href", "/made-with-ethos?ref=g&template=the-letter");
    await expect(link).toHaveAttribute("target", "_blank");
    // In the link group: after "Send one back", before "Keep this gift".
    const order = await page.evaluate(() => {
      const y = (el: Element | null | undefined) => el?.getBoundingClientRect().top ?? NaN;
      const reply = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Send one back to"));
      return [y(reply), y(document.querySelector('[data-testid="make-for-someone-else"]')), y(document.querySelector('[data-testid="keep-gift"]'))];
    });
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);

    // It opens the page made for a recipient in a new tab, their template first; the gift stays open.
    const [made] = await Promise.all([context.waitForEvent("page"), link.click()]);
    await made.waitForLoadState("domcontentloaded");
    expect(new URL(made.url()).pathname + new URL(made.url()).search).toBe("/made-with-ethos?ref=g&template=the-letter");
    await expect(made.getByText("The one you got", { exact: true })).toHaveCount(1);
    await made.close();
    expect(page.url()).toBe(gift);
    expect(await events(page)).toContainEqual({ name: "make_own_clicked", data: { template: "the-letter", from: "end" } });

    // The maker's mark at the foot of a free gift: two quiet lines, one link.
    const badge = page.getByRole("link", { name: /Made with Ethos/ });
    await bring(page, '[data-testid="keep-gift"]', "end");
    await expect(badge).toContainText("Made with Ethos");
    await expect(badge).toContainText("Digital cards by Tryethos");
    await expect(badge).toHaveAttribute("href", "/made-with-ethos?ref=watermark&template=the-letter");
    const [fromBadge] = await Promise.all([context.waitForEvent("page"), badge.click()]);
    await fromBadge.close();
    expect(await events(page)).toContainEqual({ name: "watermark_clicked", data: { template: "the-letter" } });

    await expectAllReachable(page, "the-letter", ["Send Marco a reaction", "Send one back to Marco", "make-for-someone-else", "keep-gift", "Watch again", "Made with Ethos"]);

    // "Send one back" itself: counted as the end screen's, and the editor knows a recipient opened it.
    await bring(page, '[data-testid="make-for-someone-else"]');
    await page.getByRole("button", { name: "Send one back to Marco" }).click();
    await page.waitForURL("**/create/the-letter?ref=reply");
    await expect.poll(async () => events(page)).toContainEqual({ name: "reply_started", data: { template: "the-letter", from: "end" } });
    await expect.poll(async () => events(page), { timeout: 60_000 }).toContainEqual({ name: "recipient_editor_opened", data: { via: "reply", template: "the-letter" } });
  });

  test("a paid gift in Spanish on a small phone: the link in Spanish, no badge, nothing pushed out of reach", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    expect(await playToEnd(page, { template: "bouquet", lang: "es", paid: true }), "Bouquet plays to its end").toBe(true);
    const link = page.getByTestId("make-for-someone-else");
    await bring(page, '[data-testid="make-for-someone-else"]');
    await expect(link).toHaveText("o hazle uno a otra persona");
    await expect(link).toHaveAttribute("href", "/es/made-with-ethos?ref=g&template=bouquet");
    await expect(page.getByText("La primera respuesta es gratis")).toBeVisible();
    // A paid gift carries no badge and no brand line.
    await expect(page.getByText("Hecho con Ethos")).toHaveCount(0);
    await expect(page.getByText("Tarjetas digitales de Tryethos")).toHaveCount(0);
    await expectAllReachable(page, "bouquet", ["Hazle uno a Marco", "make-for-someone-else", "keep-gift"]);
    // Still no price and no form on a gift.
    await expect(page.locator(".gift-root form, .gift-root input")).toHaveCount(0);
    expect(await page.locator(".gift-root").innerText()).not.toMatch(/€|\$\d|£/);
  });

  test("the tallest end screen (a surprise, a voice message, a song, a dedication) on 320×568", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    expect(await playToEnd(page, { template: "the-letter", full: true }), "The Letter plays to its end").toBe(true);
    await expectAllReachable(page, "the-letter", ["Send Marco a reaction", "Send one back to Marco", "make-for-someone-else", "keep-gift", "Watch again", "Made with Ethos"]);
  });

  test("after a reaction is sent, one quiet next step: send one back, counted as the reaction's", async ({ page }) => {
    await countEvents(page);
    await page.route("**/api/gift/*/react", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) }));
    expect(await playToEnd(page, { template: "the-letter" }), "The Letter plays to its end").toBe(true);
    await bring(page, '[data-testid="make-for-someone-else"]');
    await page.getByRole("button", { name: "Send Marco a reaction" }).click();
    const sheet = page.getByRole("dialog");
    // Before it is sent there is nothing about replying.
    await expect(sheet.getByTestId("reaction-reply")).toHaveCount(0);
    await sheet.getByRole("button", { name: /^Send/ }).click();
    await expect(sheet.getByText("Sent to Marco.")).toBeVisible();
    const next = sheet.getByTestId("reaction-reply");
    await expect(next).toHaveText("Send one back to Marco");
    // The one action there, besides closing the sheet.
    await expect(sheet.getByRole("button")).toHaveCount(2);
    await expect(sheet.getByRole("link")).toHaveCount(0);
    expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await next.click();
    // The same door as the end screen's button: the same editor, the names already swapped.
    await page.waitForURL("**/create/the-letter?ref=reply");
    await expect.poll(async () => events(page)).toContainEqual({ name: "reply_started", data: { template: "the-letter", from: "reaction" } });
    await expect(page.locator("#recipientName")).toHaveValue("Marco", { timeout: 60_000 });
    await expect(page.locator("#senderName")).toHaveValue("Ana");
  });
});

test.describe("the page the badge and the new link open", () => {
  const ready = { waitUntil: "domcontentloaded" } as const;

  test("carries the brand line as its eyebrow, in both languages", async ({ page }) => {
    await page.goto("/made-with-ethos?ref=watermark&template=the-letter", ready);
    await expect(page.locator("header").getByText("Digital cards by Tryethos", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Someone made you one of these.");
    await page.goto("/es/made-with-ethos?ref=watermark", ready);
    await expect(page.locator("header").getByText("Tarjetas digitales de Tryethos", { exact: true })).toBeVisible();
  });

  test("for someone making one for someone else: their template first, the tag carried to every editor link", async ({ page }) => {
    await page.goto("/made-with-ethos?ref=g&template=bouquet", ready);
    await expect(page.getByText("Make one for someone else. Free to start.")).toBeVisible();
    // Their gift may have had no footer (a paid one): the free shelf doesn't say it was like theirs.
    await expect(page.locator('[data-shelf="free"]')).not.toContainText("like the one you got");
    await expect(page.locator('[data-shelf="premium"]').getByRole("link", { name: /^Make this/ }).first()).toHaveAttribute("href", "/create/bouquet?ref=g");
    await expect(page.getByText("The one you got", { exact: true })).toHaveCount(1);
    for (const href of await page.getByTestId("made-with-ethos").getByRole("link", { name: /^Make this/ }).evaluateAll((links) => links.map((a) => a.getAttribute("href"))))
      expect(href).toMatch(/^\/create\/[a-z0-9-]+\?ref=g$/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await page.goto("/es/made-with-ethos?ref=g&template=bouquet", ready);
    await expect(page.getByText("Hazle uno a otra persona: empezar es gratis.")).toBeVisible();
  });
});

test.describe("the editor counts a recipient's arrival, and nobody else's", () => {
  const opened = async (page: Page, address: string) => {
    await countEvents(page);
    await page.goto(address);
    await expect.poll(async () => (await events(page)).map((e) => e.name), { timeout: 60_000 }).toContain("editor_opened");
    return (await events(page)).filter((e) => e.name === "recipient_editor_opened");
  };

  for (const via of ["reply", "g", "watermark", "gift-keep"]) {
    test(`?ref=${via} is a recipient`, async ({ page }) => {
      const counted = await opened(page, `/create/the-letter?ref=${via}`);
      expect(counted.length).toBeGreaterThan(0);
      for (const event of counted) expect(event.data).toEqual({ via, template: "the-letter" });
    });
  }

  test("a TikTok link, a plain visit, and a return from signing in are not", async ({ page }) => {
    expect(await opened(page, "/create/the-letter?ref=tt-couple")).toEqual([]);
    expect(await opened(page, "/create/the-letter")).toEqual([]);
    // Back from signing in or paying: the same gift, not a second opening.
    expect(await opened(page, "/create/the-letter?resume=publish&ref=reply")).toEqual([]);
  });
});
