import { expect, test, type Browser, type Page } from "@playwright/test";

/**
 * Two phones in one room, for real: separate browsers (each its own player), one room over the
 * realtime channel. Nothing is stored anywhere; the room is gone when the pages close. Skips where
 * the build has no Supabase keys, as on CI, because then no room can open.
 */
test.describe("games on two phones", () => {
  test.skip(({ isMobile }) => isMobile, "the two phones here are two browser contexts; one run is enough");

  async function phone(browser: Browser, baseURL: string | undefined): Promise<Page> {
    const origin = new URL(baseURL ?? "http://localhost:3000").origin;
    const context = await browser.newContext({ baseURL: origin, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-analytics-consent", value: "denied" }] }] } });
    return context.newPage();
  }

  async function join(page: Page, code: string, name: string) {
    await page.goto(`/games/rather?room=${code}`);
    await expect(page.getByText(`Joining room ${code}`)).toBeVisible();
    await page.getByLabel("Your name").fill(name);
    await page.getByRole("button", { name: "Join", exact: true }).click();
  }

  test("the first guest keeps the seat, both phones play, a third is turned away, and play again deals afresh", async ({ browser, baseURL }) => {
    test.setTimeout(120_000);
    const maya = await phone(browser, baseURL);
    await maya.goto("/games/rather");
    await maya.getByRole("button", { name: /^Two phones/ }).click();
    await maya.getByLabel("Your name").fill("Maya");
    await maya.getByRole("button", { name: "Make a room" }).click();
    const status = maya.getByRole("status");
    await expect(status).toContainText(/Waiting for them|couldn't open/, { timeout: 20_000 });
    test.skip((await status.textContent())?.includes("couldn't open") ?? false, "no realtime in this build: no Supabase keys, as on CI");
    const code = ((await maya.getByLabel(/^Room code /).textContent()) ?? "").trim();
    expect(code).toMatch(/^[A-Z]{4}$/);

    const marco = await phone(browser, baseURL);
    await join(marco, code, "Marco");
    await expect(status).toContainText("Marco is here", { timeout: 20_000 });
    await expect(marco.getByRole("status")).toContainText("Maya is here");

    // A third phone on the same link before the start: the first guest in keeps the seat.
    const zoe = await phone(browser, baseURL);
    await join(zoe, code, "Zoe");
    await expect(zoe.getByRole("status")).toContainText("already has two players", { timeout: 20_000 });
    await expect(marco.getByRole("status")).toContainText("Maya is here");
    await expect(status).toContainText("Marco is here");

    await maya.getByRole("button", { name: "Start" }).click();
    await expect(maya.getByText("1 of 10 · Maya")).toBeVisible();
    await expect(marco.getByText("1 of 10 · Marco")).toBeVisible({ timeout: 15_000 });
    const firstChoice = await maya.getByTestId("choice-a").textContent();
    await expect(marco.getByTestId("choice-a")).toHaveText(firstChoice ?? "");
    // The third phone never gets the game.
    await expect(zoe.getByRole("status")).toContainText("already has two players");

    await maya.getByTestId("choice-a").click();
    await expect(maya.getByText("Waiting for Marco…")).toBeVisible();
    await marco.getByTestId("choice-a").click();
    await expect(maya.getByRole("heading", { name: "Same!" })).toBeVisible();
    await expect(marco.getByRole("heading", { name: "Same!" })).toBeVisible();

    for (let round = 2; round <= 10; round++) {
      await maya.getByRole("button", { name: "Next one" }).click();
      await expect(marco.getByText(`${round} of 10 · Marco`)).toBeVisible();
      await maya.getByTestId("choice-a").click();
      await marco.getByTestId("choice-b").click();
      await expect(marco.getByRole("heading", { name: "Not the same." })).toBeVisible();
    }
    await marco.getByRole("button", { name: "See the results" }).click();
    await expect(maya.getByText("You agreed on 1 of 10.")).toBeVisible();
    await expect(marco.getByText("You agreed on 1 of 10.")).toBeVisible();

    // Either phone can deal again; it is a fresh game in the same room, the same on both.
    await marco.getByRole("button", { name: "Play again" }).click();
    await expect(maya.getByText("1 of 10 · Maya")).toBeVisible();
    await expect(marco.getByText("1 of 10 · Marco")).toBeVisible();
    await expect(maya.getByText(/^Agreed on/)).toHaveCount(0);
    await expect(marco.getByTestId("choice-a")).toHaveText((await maya.getByTestId("choice-a").textContent()) ?? "");

    // When one phone goes, the other says so and keeps its place.
    await marco.context().close();
    await expect(maya.getByText("Marco left the room")).toBeVisible({ timeout: 20_000 });
    await expect(maya.getByText("1 of 10 · Maya")).toBeVisible();

    await maya.context().close();
    await zoe.context().close();
  });
});
