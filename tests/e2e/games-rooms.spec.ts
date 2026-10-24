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
    const context = await browser.newContext({ baseURL: origin, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    return context.newPage();
  }

  async function join(page: Page, code: string, name: string, game = "rather") {
    await page.goto(`/games/${game}?room=${code}`);
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

  test("draw it, guess it: the drawing lands on the other phone, and the right word ends the round", async ({ browser, baseURL }) => {
    test.setTimeout(120_000);
    const maya = await phone(browser, baseURL);
    await maya.goto("/games/draw");
    await maya.getByRole("button", { name: /^Two phones/ }).click();
    await maya.getByLabel("Your name").fill("Maya");
    await maya.getByRole("button", { name: "Make a room" }).click();
    const status = maya.getByRole("status");
    await expect(status).toContainText(/Waiting for them|couldn't open/, { timeout: 20_000 });
    test.skip((await status.textContent())?.includes("couldn't open") ?? false, "no realtime in this build: no Supabase keys, as on CI");
    const code = ((await maya.getByLabel(/^Room code /).textContent()) ?? "").trim();

    const marco = await phone(browser, baseURL);
    await join(marco, code, "Marco", "draw");
    await expect(status).toContainText("Marco is here", { timeout: 20_000 });
    await maya.getByRole("button", { name: "Start" }).click();

    // Maya draws first; only her phone is told the word.
    const word = ((await maya.getByTestId("draw-word").textContent()) ?? "").trim();
    expect(word.length).toBeGreaterThan(2);
    await expect(marco.getByTestId("draw-word")).toHaveCount(0);
    await expect(marco.getByText("Maya is drawing")).toBeVisible({ timeout: 15_000 });

    // Whoever is drawing, the paper is the one canvas on the page; the label says which side it is.
    await expect(maya.getByRole("img", { name: "Draw here with your finger" })).toBeVisible();
    await expect(marco.getByRole("img", { name: "The drawing, as it happens" })).toBeVisible();
    const ink = (page: Page) =>
      page.locator("canvas").evaluate((el) => {
        const canvas = el as HTMLCanvasElement;
        const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
        let lit = 0;
        for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 10) lit++;
        return lit;
      });
    expect(await ink(marco)).toBe(0);
    const box = (await maya.locator("canvas").boundingBox())!;
    await maya.mouse.move(box.x + 40, box.y + 40);
    await maya.mouse.down();
    await maya.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 16 });
    await maya.mouse.move(box.x + 60, box.y + box.height - 40, { steps: 16 });
    await maya.mouse.up();
    // The same finger, on the other phone.
    await expect.poll(() => ink(marco), { timeout: 15_000 }).toBeGreaterThan(300);

    await marco.getByLabel("Your guess").fill("not that");
    await marco.getByRole("button", { name: "Guess", exact: true }).click();
    await expect(maya.getByText("not that")).toBeVisible({ timeout: 15_000 });
    await expect(maya.getByText("Got it.")).toHaveCount(0);

    await marco.getByLabel("Your guess").fill(word);
    await marco.getByRole("button", { name: "Guess", exact: true }).click();
    await expect(marco.getByText("Got it.")).toBeVisible({ timeout: 15_000 });
    await expect(maya.getByText("Got it.")).toBeVisible();
    await expect(maya.getByText(`It was ${word}`)).toBeVisible();

    // Next round, and the drawing hand changes over.
    await marco.getByRole("button", { name: "Next round" }).click();
    await expect(marco.getByTestId("draw-word")).toHaveCount(1, { timeout: 15_000 });
    await expect(maya.getByText("Marco is drawing")).toBeVisible();
    // A new round is a clean sheet on both phones.
    expect(await ink(maya)).toBe(0);
    expect(await ink(marco)).toBe(0);

    await maya.context().close();
    await marco.context().close();
  });
});
