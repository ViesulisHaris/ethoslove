import { expect, test, type Page } from "@playwright/test";
import { GAMES } from "../../src/lib/games/catalogue";
import { THIS_PAIRS } from "../../src/lib/games/this-or-that";

/**
 * The games' pages beyond the game itself: the end of a game names the next two (lib/games/next.ts)
 * after the gift, a game begun and finished is counted, and each page says how it is played and
 * answers what people ask about it.
 */

async function counter(page: Page) {
  await page.route((url) => url.hostname === "va.vercel-scripts.com" || url.pathname.startsWith("/_vercel/insights/"), (route) => route.abort());
  await page.addInitScript(() => {
    const w = window as unknown as { __counted: unknown[][]; va: (...args: unknown[]) => void };
    w.__counted = [];
    w.va = (...args: unknown[]) => void w.__counted.push(args);
  });
}
const events = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __counted: unknown[][] }).__counted
      .filter((call) => call[0] === "event")
      .map((call) => call[1] as { name: string; data?: Record<string, unknown> })
      .filter((e) => /^(game_|room_)/.test(e.name))
      .map((e) => `${e.name}:${JSON.stringify(e.data ?? {})}`),
  );

async function startOnePhone(page: Page, path: string) {
  await page.goto(path);
  const onePhone = page.getByRole("button", { name: /^(One phone|Un móvil)/ });
  if (await onePhone.isVisible().catch(() => false)) await onePhone.click();
  await page.getByLabel(/Your name|Tu nombre/).fill("Maya");
  await page.getByLabel(/Their name|Su nombre/).fill("Marco");
  await page.getByRole("button", { name: /^(Start|Empezar)$/ }).click();
}

/** Ten rounds of would you rather on one phone, Maya always A, Marco always B. */
export async function playRather(page: Page) {
  for (let round = 1; round <= 10; round++) {
    await page.getByTestId("choice-a").click();
    await page.getByRole("button", { name: /^I’m Marco, go$/ }).click();
    await page.getByTestId("choice-b").click();
    await page.getByRole("button", { name: round < 10 ? "Next one" : "See the results" }).click();
    if (round < 10) await page.getByRole("button", { name: /^I’m Maya, go$/ }).click();
  }
}

test("E1: the end of the question cards: the gift first, then two named games, and both are counted", async ({ page }) => {
  await counter(page);
  await page.goto("/games/couple-questions-game");
  for (let n = 1; n <= 12; n++) await page.getByRole("button", { name: new RegExp(`^Card ${n} of 12`) }).click();
  const end = page.getByRole("navigation", { name: "What next" });
  const links = end.getByRole("link");
  await expect(links.nth(0)).toHaveAttribute("href", "/templates?ref=game-end");
  await expect(links.nth(1)).toHaveAttribute("href", "/games/truth-or-dare");
  await expect(links.nth(2)).toHaveAttribute("href", "/games/how-well-do-you-know-me");
  await expect(end.getByRole("link", { name: /Play another game/ })).toHaveCount(0);
  await expect(end.getByRole("link", { name: /today's question/ })).toHaveCount(0);
  await expect.poll(() => events(page)).toEqual(['game_started:{"game":"deck","phones":1}', 'game_finished:{"game":"deck","phones":1}']);
  await links.nth(1).click();
  await expect(page).toHaveURL(/\/games\/truth-or-dare$/);
  expect(await events(page)).toContain('game_end_pick:{"game":"deck","to":"dare"}');
});

test("E2: the end of would you rather: two named games and today's question", async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await counter(page);
  await startOnePhone(page, "/games/would-you-rather");
  await playRather(page);
  const end = page.getByRole("navigation", { name: "What next" });
  await expect(end.locator("[data-next-game]")).toHaveCount(2);
  await expect(end.locator("[data-next-game=know]")).toHaveAttribute("href", "/games/how-well-do-you-know-me");
  await expect(end.locator("[data-next-game=dare]")).toHaveAttribute("href", "/games/truth-or-dare");
  await expect(end.locator("[data-end-today]")).toHaveAttribute("href", "/games/today");
  expect(await events(page)).toEqual(['game_started:{"game":"rather","phones":1}', 'game_finished:{"game":"rather","phones":1}']);
  await end.locator("[data-end-today]").click();
  await expect(page).toHaveURL(/\/games\/today$/);
});

test("E3: truth or dare and the roulette end on their own two games", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startOnePhone(page, "/games/truth-or-dare");
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  await page.getByRole("button", { name: /^Done\./ }).click();
  await page.getByRole("button", { name: "We’re done for tonight" }).click();
  let end = page.getByRole("navigation", { name: "What next" });
  await expect(end.locator("[data-next-game]")).toHaveCount(2);
  await expect(end.locator("[data-next-game]").nth(0)).toHaveAttribute("href", "/games/couple-questions-game");
  await expect(end.locator("[data-next-game]").nth(1)).toHaveAttribute("href", "/games/would-you-rather");

  await startOnePhone(page, "/games/chore-wheel");
  await page.getByRole("button", { name: "Spin", exact: true }).click();
  await page.getByRole("button", { name: "That’s everything settled" }).click();
  end = page.getByRole("navigation", { name: "What next" });
  await expect(end.locator("[data-next-game]").nth(0)).toHaveAttribute("href", "/games/memory");
  await expect(end.locator("[data-next-game]").nth(1)).toHaveAttribute("href", "/games/would-you-rather");
});

test("E4: in Spanish the next games are named in Spanish and keep /es", async ({ page }) => {
  await page.goto("/es/games/couple-questions-game");
  for (let n = 1; n <= 12; n++) await page.getByRole("button", { name: new RegExp(`^Carta ${n} de 12`) }).click();
  const end = page.getByRole("navigation", { name: "¿Y ahora qué?" });
  await expect(end.locator("[data-next-game]").nth(0)).toHaveAttribute("href", "/es/games/truth-or-dare");
  await expect(end).toContainText("O jugad a otro");
});

test("E5: every game's page answers its questions, closed, and gives them to search engines", async ({ page }) => {
  test.setTimeout(120_000);
  for (const { key: g, href } of GAMES) {
    await page.goto(href);
    const notes = page.locator(`section[aria-labelledby="${g}-notes"]`);
    const details = notes.locator("details");
    expect(await details.count(), g).toBeGreaterThanOrEqual(2);
    for (const d of await details.all()) await expect(d, g).not.toHaveAttribute("open", "");
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("");
    expect(ld, g).toContain('"FAQPage"');
    // "How to play" opens the list where a game has one; it is not a question, so the FAQ data starts at the next.
    expect(ld, g).toContain(await notes.locator("details:not([data-how])").first().locator("summary").innerText());
  }
});

test("E6: Draw, Memory and the wheel say how they are played, closed beside the questions, and Draw lists its words", async ({ page }) => {
  for (const { key: g, href } of GAMES.filter((x) => ["draw", "memory", "roulette"].includes(x.key))) {
    await page.goto(href);
    const how = page.locator(`section[aria-labelledby="${g}-notes"] details[data-how]`);
    // The first entry of the closed list, not a numbered block in view (DESIGN-LESS-TEXT: "how it works" is never shown open).
    await expect(how.locator("summary"), g).toHaveText("How to play");
    await expect(how, g).not.toHaveAttribute("open", "");
    await expect(how.locator("ol li").first(), g).toBeHidden();
    await expect(how.locator("ol li"), g).toHaveCount(4);
    await how.locator("summary").click();
    await expect(how.locator("ol li").first(), g).toBeVisible();
  }
  await page.goto("/games/drawing-game");
  await expect(page.getByRole("heading", { name: /^40 words for a drawing game/ })).toBeVisible();
  await expect(page.locator("#draw-words").locator("xpath=ancestor::section").locator("ol li")).toHaveCount(40);
});

test("E7: the blog posts that link to a game are linked back from it", async ({ page }) => {
  await page.goto("/games/would-you-rather");
  const more = page.locator('section[aria-labelledby="rather-notes"]');
  await expect(more.locator('a[href="/blog/would-you-rather-questions-for-couples"]')).toHaveCount(1);
  // A picture card: the poster of the gift the post leads with, and the post's title.
  await expect(more.locator('[data-more] a[href="/blog/would-you-rather-questions-for-couples"] img')).toHaveCount(1);
  await expect(more.getByRole("heading", { name: "More like this" })).toBeVisible();
  await page.goto("/games/truth-or-dare");
  await expect(page.locator('section[aria-labelledby="dare-notes"] a[href="/blog/truth-or-dare-questions-for-couples"]')).toHaveCount(1);
});

test("E8: in Spanish, the same in Spanish", async ({ page }) => {
  await page.goto("/es/games/memory");
  await expect(page.locator('section[aria-labelledby="memory-notes"] details[data-how] summary')).toHaveText("Cómo se juega");
  await expect(page.getByRole("heading", { name: "Preguntas sobre este juego" })).toBeVisible();
  await page.goto("/es/games/drawing-game");
  await expect(page.getByRole("heading", { name: /^40 palabras/ })).toBeVisible();
});

test("E9: the hub shows the three tiers once, as the packs' own header, with the pack's price", async ({ page }) => {
  await page.goto("/games");
  const tiers = page.locator("[data-tiers] li");
  await expect(page.locator("[data-tiers]")).toHaveCount(1);
  await expect(tiers).toHaveCount(3);
  await expect(tiers.nth(0)).toContainText("Free");
  await expect(tiers.nth(0)).toContainText(`All ${GAMES.length} games`);
  await expect(tiers.nth(1)).toContainText("A pack, €2.99");
  await expect(tiers.nth(1)).toContainText("two or three of the games");
  await expect(tiers.nth(2).getByRole("link")).toHaveAttribute("href", "/pricing#for-two");
  // Said once: the packs under it carry no second sentence about the price or Ethos for Two.
  const packs = page.locator("section#packs");
  await expect(packs.locator("[data-tiers]")).toHaveCount(1);
  await expect(packs).not.toContainText("each and yours for good");
  await expect(packs.locator('[data-tour="packs"] a[href="/games/couple-questions-game#packs"]')).toHaveCount(3);
  await page.goto("/games/would-you-rather");
  await expect(page.locator("[data-tiers]")).toHaveCount(0);
});

test("E9b: on a desk the hub holds to 300 words, its cards a title and a picture, and the tiers stand as wide as the packs", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const locale of ["", "/es"]) {
    await page.goto(`${locale}/games`);
    const words = await page.locator("main").evaluate((el) => (el as HTMLElement).innerText.trim().split(/\s+/).filter(Boolean).length);
    expect(words, `${locale}/games: words on the page`).toBeLessThanOrEqual(300);
    const tiers = (await page.locator("[data-tiers]").boundingBox())!;
    const packs = (await page.locator('[data-tour="packs"]').boundingBox())!;
    expect(Math.abs(tiers.x - packs.x)).toBeLessThan(1);
    expect(Math.abs(tiers.width - packs.width)).toBeLessThan(1);
  }
});

// A visitor in the US or the UK: their own price where this build charges their currency
// (NEXT_PUBLIC_PRICE_CURRENCIES, read back from /llms.txt as tests/e2e/currency.spec.ts does), euros otherwise.
for (const [country, price, single] of [
  ["US", "$2.99", "$11.99"],
  ["GB", "£2.49", "£8.99"],
] as const) {
  test.describe(`E9 ${country}`, () => {
    test.use({ extraHTTPHeaders: { "x-vercel-ip-country": country } });
    test(`the pack's price on the hub is the shelf's: ${price} where that currency is charged`, async ({ page, request }) => {
      const charged = (await (await request.get("/llms.txt")).text()).includes(single);
      const want = charged ? price : "€2.99";
      await page.goto("/games");
      await expect(page.locator("[data-tiers] li").nth(1)).toContainText(`A pack, ${want}`);
      await page.goto("/games/couple-questions-game");
      await expect(page.getByRole("button", { name: /Miles apart/ })).toContainText(want, { timeout: 15_000 });
    });
  });
}

test("E12: This or that, a whole game on one phone, and its page", async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await counter(page);
  await startOnePhone(page, "/games/this-or-that");
  await expect(page.getByRole("heading", { name: "This or that?" })).toBeVisible();
  await playRather(page);
  await expect(page.getByText("You matched on 0 of 10.")).toBeVisible();
  const end = page.getByRole("navigation", { name: "What next" });
  await expect(end.locator("[data-next-game]").nth(0)).toHaveAttribute("href", "/games/would-you-rather");
  await expect(end.locator("[data-next-game]").nth(1)).toHaveAttribute("href", "/games/couple-questions-game");
  expect(await events(page)).toEqual(['game_started:{"game":"thisthat","phones":1}', 'game_finished:{"game":"thisthat","phones":1}']);
  await expect(page).toHaveTitle(/^This or That Questions for Couples/);
  const list = page.locator("#thisthat-questions").locator("xpath=ancestor::section").locator("ol li");
  await expect(list).toHaveCount(THIS_PAIRS.length);
  await expect(list.first()).toHaveText(/ or .+\?$/);
  await expect(page.locator('section[aria-labelledby="thisthat-notes"] details[data-how] summary')).toHaveText("How to play");

  await page.goto("/es/games/this-or-that");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("¿Esto o aquello?");
  await expect(page).toHaveTitle(/^Preguntas de esto o aquello para parejas/);
});

test("E13: the hub deals every game, in the grid and in the hand on top", async ({ page }) => {
  await page.goto("/games");
  await expect(page.locator("#pick > ul > li")).toHaveCount(GAMES.length + 2);
  for (const g of GAMES) await expect(page.locator(`#pick a[href="${g.href}"]`), g.key).toHaveCount(1);
  // "Eight little card games": the hub's hand holds all eight (the app's catalogue and the home page's hand keep their seven).
  await expect(page.getByRole("list", { name: "Pick a game" }).getByRole("link")).toHaveCount(GAMES.length);
  await expect(page).toHaveTitle(/Eight Free Games/);
});

test("E10: inside the iPhone app the end of a game offers the app's own list, not a web link it cannot follow", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __told: string[]; EthosNative: unknown };
    w.__told = [];
    w.EthosNative = { version: 1, platform: "ios", locale: "en", signedIn: false, request: (type: string) => (w.__told.push(type), { ok: true }) };
    document.documentElement.setAttribute("data-app", "ios");
  });
  await page.goto("/games/couple-questions-game");
  for (let n = 1; n <= 12; n++) await page.getByRole("button", { name: new RegExp(`^Card ${n} of 12`) }).click();
  const end = page.getByRole("navigation", { name: "What next" });
  await expect(end.locator("[data-next-game]").first()).toBeHidden();
  await end.locator("[data-end-games]").click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __told: string[] }).__told)).toContain("close");
  await expect(page).toHaveURL(/\/games\/couple-questions-game$/);
});

test("E11: in a browser the app's card is never shown", async ({ page }) => {
  await page.goto("/games/couple-questions-game");
  for (let n = 1; n <= 12; n++) await page.getByRole("button", { name: new RegExp(`^Card ${n} of 12`) }).click();
  const end = page.getByRole("navigation", { name: "What next" });
  await expect(end.locator("[data-next-game]")).toHaveCount(2);
  await expect(end.locator("[data-end-games]")).toBeHidden();
});
