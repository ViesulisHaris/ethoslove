import { expect, test, type Page } from "@playwright/test";

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
    await page.getByRole("button", { name: /^I'm Marco, go$/ }).click();
    await page.getByTestId("choice-b").click();
    await page.getByRole("button", { name: round < 10 ? "Next one" : "See the results" }).click();
    if (round < 10) await page.getByRole("button", { name: /^I'm Maya, go$/ }).click();
  }
}

test("E1: the end of the question cards: the gift first, then two named games, and both are counted", async ({ page }) => {
  await counter(page);
  await page.goto("/games/deck");
  for (let n = 1; n <= 12; n++) await page.getByRole("button", { name: new RegExp(`^Card ${n} of 12`) }).click();
  const end = page.getByRole("navigation", { name: "What next" });
  const links = end.getByRole("link");
  await expect(links.nth(0)).toHaveAttribute("href", "/templates?ref=game-end");
  await expect(links.nth(1)).toHaveAttribute("href", "/games/dare");
  await expect(links.nth(2)).toHaveAttribute("href", "/games/know");
  await expect(end.getByRole("link", { name: /Play another game/ })).toHaveCount(0);
  await expect(end.getByRole("link", { name: /today's question/ })).toHaveCount(0);
  await expect.poll(() => events(page)).toEqual(['game_started:{"game":"deck","phones":1}', 'game_finished:{"game":"deck","phones":1}']);
  await links.nth(1).click();
  await expect(page).toHaveURL(/\/games\/dare$/);
  expect(await events(page)).toContain('game_end_pick:{"game":"deck","to":"dare"}');
});

test("E2: the end of would you rather: two named games and today's question", async ({ page }) => {
  test.setTimeout(90_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await counter(page);
  await startOnePhone(page, "/games/rather");
  await playRather(page);
  const end = page.getByRole("navigation", { name: "What next" });
  await expect(end.locator("[data-next-game]")).toHaveCount(2);
  await expect(end.locator("[data-next-game=know]")).toHaveAttribute("href", "/games/know");
  await expect(end.locator("[data-next-game=dare]")).toHaveAttribute("href", "/games/dare");
  await expect(end.locator("[data-end-today]")).toHaveAttribute("href", "/games/today");
  expect(await events(page)).toEqual(['game_started:{"game":"rather","phones":1}', 'game_finished:{"game":"rather","phones":1}']);
  await end.locator("[data-end-today]").click();
  await expect(page).toHaveURL(/\/games\/today$/);
});

test("E3: truth or dare and the roulette end on their own two games", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startOnePhone(page, "/games/dare");
  await page.getByRole("button", { name: "Truth", exact: true }).click();
  await page.getByRole("button", { name: /^Done\./ }).click();
  await page.getByRole("button", { name: "We're done for tonight" }).click();
  let end = page.getByRole("navigation", { name: "What next" });
  await expect(end.locator("[data-next-game]")).toHaveCount(2);
  await expect(end.locator("[data-next-game]").nth(0)).toHaveAttribute("href", "/games/deck");
  await expect(end.locator("[data-next-game]").nth(1)).toHaveAttribute("href", "/games/rather");

  await startOnePhone(page, "/games/roulette");
  await page.getByRole("button", { name: "Spin", exact: true }).click();
  await page.getByRole("button", { name: "That's everything settled" }).click();
  end = page.getByRole("navigation", { name: "What next" });
  await expect(end.locator("[data-next-game]").nth(0)).toHaveAttribute("href", "/games/memory");
  await expect(end.locator("[data-next-game]").nth(1)).toHaveAttribute("href", "/games/rather");
});

test("E4: in Spanish the next games are named in Spanish and keep /es", async ({ page }) => {
  await page.goto("/es/games/deck");
  for (let n = 1; n <= 12; n++) await page.getByRole("button", { name: new RegExp(`^Carta ${n} de 12`) }).click();
  const end = page.getByRole("navigation", { name: "¿Y ahora qué?" });
  await expect(end.locator("[data-next-game]").nth(0)).toHaveAttribute("href", "/es/games/dare");
  await expect(end).toContainText("O jugad a otro");
});
