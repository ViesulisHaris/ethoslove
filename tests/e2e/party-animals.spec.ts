import { expect, test, type Page } from "@playwright/test";

/** Opens the invitation and waits for the party page under it. */
async function openInvitation(page: Page, path: string, opener = /tap to open/i) {
  await page.goto(path);
  await page.getByRole("button", { name: opener }).click({ force: true, timeout: 25000 });
  const scroller = page.locator("[data-scroller]");
  await scroller.waitFor({ timeout: 10000 });
  // The headline and the first guests arrive a piece at a time.
  await page.waitForTimeout(2600);
  return scroller;
}

/**
 * Brings something on the page into the middle of the screen, the way a thumb would. The guests
 * spring onto the page when they scroll into view, so one below the fold can't be tapped until then.
 */
async function scrollTo(page: Page, selector: string) {
  await page.locator("[data-scroller]").evaluate((el, sel) => {
    const target = el.querySelector(sel);
    if (!target) throw new Error(`nothing matches ${sel}`);
    const top = target.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - el.clientHeight * 0.4;
    el.scrollTo({ top: Math.max(0, top) });
  }, selector);
  await page.waitForTimeout(900);
}

async function scrollToEnd(page: Page) {
  const scroller = page.locator("[data-scroller]");
  for (let i = 0; i < 20; i++) {
    const done = await scroller.evaluate((el) => {
      el.scrollBy({ top: el.clientHeight * 0.85 });
      return el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    });
    await page.waitForTimeout(200);
    if (done) break;
  }
}

test.describe("Party Animals", () => {
  test("opens the invitation, a guest yells, confetti pops, the candles go out, the letter is at the bottom", async ({ page }) => {
    await openInvitation(page, "/demo/party-animals");
    await expect(page.getByText(/tap anywhere for confetti/i)).toBeVisible();

    await page.locator("[data-guest='0']").click({ force: true });
    await expect(page.getByRole("status").first()).toContainText(/ana!! ur 30/i);
    await expect(page.locator("[data-greeted]")).toHaveCount(1);

    // The wall, not a guest or a photo: a handful of confetti lands where the finger was.
    await page.getByText(/tap a guest to say hi/i).click();
    await expect(page.locator("[data-pop]")).toHaveCount(1);

    await scrollTo(page, "[data-cake]");
    await page.locator("[data-cake]").click({ force: true });
    await expect(page.locator("[data-cake][data-out]")).toHaveCount(1);
    await expect(page.getByText(/wish made/i)).toBeVisible({ timeout: 5000 });

    await scrollToEnd(page);
    await expect(page.getByText(/dear ana/i)).toBeAttached();
    await expect(page.getByRole("button", { name: /send marco a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("reading never waits on the guests: the letter is there with nobody greeted", async ({ page }) => {
    await openInvitation(page, "/demo/party-animals");
    await scrollToEnd(page);
    await expect(page.locator("[data-greeted]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /send marco a reaction/i })).toBeVisible({ timeout: 20000 });
  });

  test("every guest greeted: all ticked on the guest list, and stamped", async ({ page }) => {
    await openInvitation(page, "/demo/party-animals");
    const count = await page.locator("[data-guest]").count();
    expect(count).toBe(10);
    for (let i = 0; i < count; i++) {
      await scrollTo(page, `[data-guest='${i}']`);
      await page.locator(`[data-guest='${i}']`).click({ force: true });
    }
    await expect(page.locator("[data-greeted]")).toHaveCount(10);
    await scrollTo(page, "[data-guestlist]");
    await expect(page.locator("[data-listed]")).toHaveCount(10);
    await expect(page.getByText(/everyone's here/i)).toBeVisible();
  });

  test("a photo opens large, and a tap on it throws no confetti", async ({ page }) => {
    await openInvitation(page, "/demo/party-animals");
    await page.getByRole("button", { name: /moments before the incident/i }).click({ force: true });
    await expect(page.locator("figure img")).toBeVisible();
    await expect(page.locator("[data-pop]")).toHaveCount(0);
    await page.getByRole("button", { name: /^close$/i }).click({ force: true });
    await expect(page.locator("figure img")).toBeHidden();
  });

  test("the keyboard opens it, greets a guest and blows out the candles", async ({ page }) => {
    await page.goto("/demo/party-animals");
    const opener = page.getByRole("button", { name: /tap to open/i });
    await opener.waitFor({ timeout: 25000 });
    await opener.focus();
    await page.keyboard.press("Enter");
    await page.locator("[data-scroller]").waitFor({ timeout: 10000 });
    await page.waitForTimeout(2600);
    // Tab through the page to the first guest.
    let reached = false;
    for (let i = 0; i < 8 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await page.evaluate(() => document.activeElement?.getAttribute("data-guest") === "0");
    }
    expect(reached).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status").first()).toContainText(/ana!! ur 30/i);
    await page.locator("[data-cake]").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-cake][data-out]")).toHaveCount(1);
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openInvitation(page, "/es/demo/party-animals", /toca para abrir/i);
    await expect(page.getByText(/toca a un invitado para saludar/i)).toBeVisible();
    await page.locator("[data-guest='0']").click({ force: true });
    await expect(page.getByRole("status").first()).toContainText(/¡¡ana!!/i);
    await scrollTo(page, "[data-cake]");
    await page.locator("[data-cake]").click({ force: true });
    await expect(page.getByText(/deseo pedido/i)).toBeVisible({ timeout: 5000 });
    await scrollToEnd(page);
    await expect(page.getByText(/hola, ana/i)).toBeAttached();
  });

  test("a gift that came through a cover goes straight to the party", async ({ page }) => {
    await page.goto("/demo/party-animals?cover=party");
    await page.getByRole("button", { name: /tap to open/i }).click({ force: true, timeout: 25000 });
    await expect(page.locator("[data-scroller]")).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/you're invited/i)).toHaveCount(0);
  });
});
