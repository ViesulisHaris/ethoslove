import { expect, test, type Page } from "@playwright/test";
import { needPreviews } from "./server-state";

/**
 * Bringing recipients back: "Keep this gift", the small page off a gift's end screen (drawn from its
 * development-only preview: a real one needs a published gift, and the dev server's database is
 * production, so on a production build these skip), and the page a free gift's "Made with Ethos"
 * footer opens. The keep form talks to the real route, which each test answers itself, and looks at
 * what was asked for: an address, and the days ticked, never a name.
 */

async function answer(page: Page, url: string, reply: { status: number; body: Record<string, unknown> }) {
  const asked: Record<string, unknown>[] = [];
  await page.route(url, async (route) => {
    asked.push(route.request().postDataJSON() as Record<string, unknown>);
    await route.fulfill({ status: reply.status, contentType: "application/json", body: JSON.stringify(reply.body) });
  });
  return asked;
}

test.describe("keep this gift", () => {
  test.beforeEach(async ({ request }) => needPreviews(request));

  test("asks for an address, with every reminder unticked, and says to check the inbox", async ({ page }) => {
    const asked = await answer(page, "**/api/keep", { status: 200, body: { ok: true } });
    await page.goto("/keep-preview");
    await expect(page.getByRole("heading", { name: "Keep this gift" })).toBeVisible();
    await expect(page.getByText("We'll email you the link so you can open it again any time.")).toBeVisible();
    for (const label of ["Remind me before Mia's birthday", "Remind me before our anniversary", "Remind me before Valentine's Day"]) {
      await expect(page.getByRole("checkbox", { name: label })).not.toBeChecked();
    }
    // No price and nothing to buy here either.
    await expect(page.locator("body")).not.toContainText(/€|\$|pay|buy/i);
    await page.getByTestId("keep-email").fill("leo@example.com");
    await page.getByTestId("keep-submit").click();
    await expect(page.getByTestId("keep-sent")).toContainText("Check your inbox.");
    await expect(page.getByTestId("keep-sent")).toContainText("leo@example.com");
    expect(asked).toEqual([{ shortId: "prev2ew3k", email: "leo@example.com", reminders: [] }]);
    // A mistyped address can be put right.
    await page.getByTestId("keep-change").click();
    await expect(page.getByTestId("keep-email")).toHaveValue("leo@example.com");
  });

  test("a ticked birthday asks for its day; Valentine's needs none; the page never sends a name", async ({ page }) => {
    const asked = await answer(page, "**/api/keep", { status: 200, body: { ok: true } });
    await page.goto("/keep-preview");
    await page.getByTestId("keep-email").fill("leo@example.com");
    await page.getByRole("checkbox", { name: "Remind me before Mia's birthday" }).check();
    await page.getByRole("checkbox", { name: "Remind me before Valentine's Day" }).check();
    // The address stays through the ticks, even typed before the page had finished loading.
    await expect(page.getByTestId("keep-email")).toHaveValue("leo@example.com");
    await expect(page.getByTestId("keep-valentines-month")).toHaveCount(0);
    await page.getByTestId("keep-submit").click();
    await expect(page.getByTestId("keep-birthday").getByRole("alert")).toHaveText("Pick the date, or untick this one.");
    expect(asked).toEqual([]);
    await page.getByTestId("keep-birthday-month").selectOption({ label: "May" });
    await page.getByTestId("keep-birthday-day").selectOption("3");
    await page.getByTestId("keep-submit").click();
    await expect(page.getByTestId("keep-sent")).toBeVisible();
    expect(asked).toEqual([{ shortId: "prev2ew3k", email: "leo@example.com", reminders: [{ occasion: "birthday", month: 5, day: 3 }, { occasion: "valentines" }] }]);
  });

  test("a month with fewer days drops a day it doesn't have", async ({ page }) => {
    await page.goto("/keep-preview");
    await page.getByRole("checkbox", { name: "Remind me before our anniversary" }).check();
    await page.getByTestId("keep-anniversary-day").selectOption("31");
    await page.getByTestId("keep-anniversary-month").selectOption({ label: "April" });
    await expect(page.getByTestId("keep-anniversary-day")).toHaveValue("");
    await expect(page.getByTestId("keep-anniversary-day").locator("option")).toHaveCount(31);
  });

  test("says when it's been asked too often, or failed, and lets them try again", async ({ page }) => {
    await answer(page, "**/api/keep", { status: 429, body: { error: "rate_limited" } });
    await page.goto("/keep-preview");
    await page.getByTestId("keep-email").fill("leo@example.com");
    await page.getByTestId("keep-submit").click();
    await expect(page.getByTestId("keep-form").getByRole("alert")).toHaveText("Too many tries from this connection. Try again in an hour.");
    await expect(page.getByTestId("keep-submit")).toBeEnabled();
  });

  test("names the birthday as the emails will: by the first name signed, else as the sender's", async ({ page }) => {
    await page.goto("/keep-preview?sender=Mia%20Rose");
    await expect(page.getByRole("checkbox", { name: "Remind me before Mia's birthday" })).toBeVisible();
    await page.goto("/keep-preview?sender=Your%20babe");
    await expect(page.getByRole("checkbox", { name: "Remind me before the sender's birthday" })).toBeVisible();
    await page.goto("/keep-preview?lang=es&sender=Ana%20y%20Leo");
    await expect(page.getByRole("checkbox", { name: "Avísame antes del cumpleaños de quien te lo regaló" })).toBeVisible();
  });

  test("offers no reminders for a gift without a sender's name, and goes back to the gift", async ({ page }) => {
    await page.goto("/keep-preview?sender=");
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Back to the gift" })).toHaveAttribute("href", "/g/prev2ew3k");
  });

  test("in Spanish, for a Spanish gift", async ({ page }) => {
    await answer(page, "**/api/keep", { status: 200, body: { ok: true } });
    await page.goto("/keep-preview?lang=es");
    await expect(page.getByRole("heading", { name: "Guardar este regalo" })).toBeVisible();
    await expect(page.getByRole("checkbox", { name: "Avísame antes del cumpleaños de Mia" })).not.toBeChecked();
    await page.getByRole("checkbox", { name: "Avísame antes del cumpleaños de Mia" }).check();
    await expect(page.getByTestId("keep-birthday-month").locator("option").nth(5)).toHaveText("Mayo");
    await page.getByTestId("keep-birthday").getByRole("checkbox").uncheck();
    await page.getByTestId("keep-email").fill("leo@example.com");
    await page.getByTestId("keep-submit").click();
    await expect(page.getByTestId("keep-sent")).toContainText("Mira tu correo.");
  });
});

test.describe("the page a free gift's footer opens", () => {
  // A page of template previews: what's checked is there with the HTML, and the previews' videos
  // needn't have loaded (WebKit on Windows never fires "load" for them, on /templates too).
  const ready = { waitUntil: "domcontentloaded" } as const;

  test("someone made you one of these: free templates first, premium after, the gift's own first among its kind", async ({ page }) => {
    await page.goto("/made-with-ethos?ref=watermark&template=constellations", ready);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Someone made you one of these.");
    await expect(page.getByText("Make one back — free to start.")).toBeVisible();
    const shelves = page.locator("[data-shelf]");
    await expect(shelves).toHaveCount(2);
    await expect(shelves.nth(0)).toHaveAttribute("data-shelf", "free");
    await expect(shelves.nth(1)).toHaveAttribute("data-shelf", "premium");
    const free = shelves.nth(0).getByRole("link", { name: /^Make this/ });
    await expect(free.first()).toHaveAttribute("href", "/create/constellations?ref=watermark");
    // Marked as the one they got, and only that one.
    await expect(page.getByText("The one you got", { exact: true })).toHaveCount(1);
  });

  test("no straight-to-checkout path, and every card keeps the footer's tag on the way to the editor", async ({ page }) => {
    await page.goto("/made-with-ethos?ref=watermark&template=bouquet", ready);
    const page_ = page.getByTestId("made-with-ethos");
    await expect(page_.getByRole("button", { name: /unlock|pay|buy|checkout/i })).toHaveCount(0);
    const makes = page_.getByRole("link", { name: /^Make this/ });
    expect(await makes.count()).toBeGreaterThan(4);
    for (const href of await makes.evaluateAll((links) => links.map((a) => a.getAttribute("href")))) expect(href).toMatch(/^\/create\/[a-z0-9-]+\?ref=watermark$/);
    // The gift's premium template leads the premium shelf.
    await expect(page.locator('[data-shelf="premium"]').getByRole("link", { name: /^Make this/ }).first()).toHaveAttribute("href", "/create/bouquet?ref=watermark");
  });

  test("in Spanish, and found by nobody searching", async ({ page }) => {
    await page.goto("/es/made-with-ethos?ref=watermark", ready);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Alguien te ha hecho uno de estos.");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
