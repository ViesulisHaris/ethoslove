import { expect, test, type Page } from "@playwright/test";

/**
 * The packs shelf and the end of every game, as a visitor who owns nothing sees them. Checkout is
 * never reached: the one test that presses "Get it" answers the request itself and only looks at
 * what was asked for.
 */

async function startOnePhone(page: Page, path: string) {
  await page.goto(path);
  const onePhone = page.getByRole("button", { name: /^One phone/ });
  // Games that only play on one phone open straight on the names.
  if (await onePhone.isVisible().catch(() => false)) await onePhone.click();
  await page.getByLabel("Your name").fill("Maya");
  await page.getByLabel("Their name").fill("Marco");
  await page.getByRole("button", { name: "Start", exact: true }).click();
}

test.describe("the packs shelf", () => {
  test("shows each pack locked at its price, and what's inside before paying", async ({ page }) => {
    await page.goto("/games/deck");
    const deep = page.getByRole("button", { name: /After a year/ });
    await expect(deep).toContainText("€2.99", { timeout: 15_000 });
    await deep.click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("heading", { name: "After a year" })).toBeVisible();
    await expect(sheet.getByText("A pack of 40 cards")).toBeVisible();
    await expect(sheet.getByRole("list", { name: "Three cards from this pack" }).getByRole("listitem")).toHaveCount(3);
    await expect(sheet.getByRole("button", { name: "Get it for €2.99" })).toBeVisible();
    await expect(sheet.getByRole("link", { name: "Get every pack with Ethos for Two" })).toHaveAttribute("href", "/pricing?renew=pass");
    // Signed out: somebody who bought it on another phone is sent to sign in, not to pay twice.
    await expect(sheet.getByRole("link", { name: "Bought it already? Sign in" })).toHaveAttribute("href", `/login?next=${encodeURIComponent("/games/deck?pack=deep")}`);
    await sheet.getByRole("button", { name: "Close" }).click();
    await expect(sheet).toBeHidden();
  });

  test("buys a pack by its id and comes back to the same game", async ({ page }) => {
    let asked: unknown = null;
    await page.route("**/api/stripe/checkout", async (route) => {
      asked = route.request().postDataJSON();
      await route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ error: "checkout" }) });
    });
    await page.goto("/games/deck");
    const far = page.getByRole("button", { name: /Miles apart/ });
    await expect(far).toContainText("€2.99", { timeout: 15_000 });
    await far.click();
    await page.getByRole("button", { name: "Get it for €2.99" }).click();
    await expect.poll(() => asked).toEqual({ product: "pack", packId: "distance", returnTo: "/games/deck?pack=distance", locale: "en", currency: "eur" });
    await expect(page.getByText("Couldn't open checkout. Please try again.")).toBeVisible();
  });

  test("asks for the 18+ tap before anything from After dark is shown", async ({ page }) => {
    await page.goto("/games/deck");
    const dark = page.getByRole("button", { name: /After dark/ });
    await expect(dark).toContainText("€2.99", { timeout: 15_000 });
    await dark.click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("heading", { name: "For adults" })).toBeVisible();
    await sheet.getByRole("button", { name: "Not now" }).click();
    await expect(sheet).toBeHidden();
    await dark.click();
    await page.getByRole("button", { name: "I'm 18 or over" }).click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "After dark" })).toBeVisible();
    await page.keyboard.press("Escape");
    // Remembered for the tab: straight to what's inside the second time.
    await dark.click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: "After dark" })).toBeVisible();
  });

  test("sits in the lobby of the games it deals into, with the free game first", async ({ page }) => {
    await page.goto("/games/know");
    const shelf = page.getByRole("group", { name: "Packs" });
    await expect(shelf.getByRole("button", { name: /Classic/ })).toHaveAttribute("aria-pressed", "true");
    await expect(shelf.getByRole("button", { name: /After a year/ })).toBeVisible();
    await page.goto("/games/memory");
    await expect(page.getByRole("group", { name: "Packs" })).toHaveCount(0);
  });

  test("is in Spanish at /es", async ({ page }) => {
    await page.goto("/es/games/deck");
    await expect(page.getByRole("button", { name: /A media luz/ })).toContainText("2,99", { timeout: 15_000 });
  });
});

test.describe("the end of every game", () => {
  test("question cards: the last card leads to a gift or another game", async ({ page }) => {
    await page.goto("/games/deck");
    const deal = page.getByRole("button", { name: /^Card 1 of 12/ });
    await expect(deal).toBeVisible();
    for (let n = 1; n <= 12; n++) await page.getByRole("button", { name: new RegExp(`^Card ${n} of 12`) }).click();
    const end = page.getByRole("navigation", { name: "What next" });
    await expect(end.getByRole("link", { name: /Make them a gift/ })).toHaveAttribute("href", "/templates?ref=game-end");
    await expect(end.getByRole("link", { name: /Play another game/ })).toHaveAttribute("href", "/games#pick");
  });

  test("truth or dare ends when they say so", async ({ page }) => {
    await startOnePhone(page, "/games/dare");
    await page.getByRole("button", { name: "Truth", exact: true }).click();
    await page.getByRole("button", { name: /^Done\./ }).click();
    await page.getByRole("button", { name: "We're done for tonight" }).click();
    await expect(page.getByRole("heading", { name: "1 truth and 0 dares later." })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "What next" })).toBeVisible();
  });

  test("dishes roulette ends once everything is settled", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await startOnePhone(page, "/games/roulette");
    await page.getByRole("button", { name: "Spin", exact: true }).click();
    await page.getByRole("button", { name: "That's everything settled" }).click();
    await expect(page.getByRole("heading", { name: "Settled. No appeals." })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "What next" }).getByRole("link", { name: /Make them a gift/ })).toBeVisible();
  });

  test("a guest asked to start their own room lands in the lobby ready to make one", async ({ page }) => {
    await page.goto("/games/rather?mode=two");
    await expect(page.getByRole("button", { name: "Make a room" })).toBeVisible();
  });
});
