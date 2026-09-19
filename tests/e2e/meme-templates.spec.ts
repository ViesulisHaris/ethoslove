import { expect, test, type Page } from "@playwright/test";

/** Past the cover, if the demo has one, and its loading screen. */
async function enter(page: Page, path: string) {
  await page.goto(path);
  const cover = page.getByRole("button", { name: /tap to open|toca para abrir/i });
  await cover.first().waitFor({ timeout: 25000 });
  await page.waitForTimeout(800);
  await cover.first().click({ force: true });
}

test.describe("Party Animals", () => {
  test("greets every guest, then opens the card", async ({ page }) => {
    await enter(page, "/demo/party-animals");
    const guests = page.locator("[data-guest]");
    await guests.first().waitFor({ timeout: 15000 });
    // Everyone springs in over a couple of seconds; a script has to wait for them to land.
    await page.waitForTimeout(3200);
    const count = await guests.count();
    expect(count).toBeGreaterThanOrEqual(9);
    await guests.first().click({ force: true });
    await expect(page.getByRole("status").first()).toContainText(/ana!! ur 30/i);
    await expect(page.getByText(new RegExp(`1/${count}`))).toBeVisible();
    for (let i = 1; i < count; i++) {
      await guests.nth(i).click({ force: true, timeout: 5000 });
      await page.waitForTimeout(160);
    }
    await expect(page.locator("[data-greeted]")).toHaveCount(count);
    await page.getByRole("button", { name: /open the card/i }).click({ force: true });
    await expect(page.getByText(/dear ana/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /send marco a reaction/i })).toBeVisible({ timeout: 60000 });
  });

  test("a photo opens large, and the card can be skipped to", async ({ page }) => {
    await enter(page, "/demo/party-animals");
    await page.locator("[data-guest]").first().waitFor({ timeout: 15000 });
    await page.waitForTimeout(2600);
    await page.getByRole("button", { name: /moments before the incident/i }).click({ force: true });
    await expect(page.locator("figure img")).toBeVisible();
    await page.getByRole("button", { name: /^close$/i }).click({ force: true });
    await expect(page.locator("figure img")).toBeHidden();
    await page.getByRole("button", { name: /skip to the card/i }).click({ force: true });
    await expect(page.getByText(/dear ana/i)).toBeVisible({ timeout: 10000 });
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await enter(page, "/es/demo/party-animals");
    await expect(page.getByText(/toca a cada invitado/i)).toBeVisible({ timeout: 15000 });
    // The loading screen is still lifting off the page when the pill first shows.
    await page.waitForTimeout(2600);
    await page.locator("[data-guest]").first().click({ force: true });
    await expect(page.locator("[data-greeted]")).toHaveCount(1);
  });
});

test.describe("The Council", () => {
  test("hears every finding, stamps the verdict and reads the ruling", async ({ page }) => {
    await page.goto("/demo/the-council");
    await page.getByRole("button", { name: /all rise/i }).click({ force: true, timeout: 25000 });
    // The chair reads the first finding on its own once the gavel has come down. The last bubble is
    // still fading while the next one arrives, so each is looked for by what it says.
    const said = (line: RegExp) => page.getByRole("status").filter({ hasText: line });
    await expect(said(/five minutes away/i)).toBeVisible({ timeout: 6000 });
    for (const line of [/advert for a bank/i, /weren't hungry/i, /favourite person/i]) {
      await page.getByRole("button", { name: /next finding/i }).click({ force: true });
      await expect(said(line)).toBeVisible();
    }
    await page.getByRole("button", { name: /hear the verdict/i }).click({ force: true });
    await expect(page.getByText(/^guilty$/i)).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/official ruling/i)).toBeVisible();
    await page.getByRole("button", { name: /read the full ruling/i }).click({ force: true });
    await expect(page.getByText(/exhibit a/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/dear ana/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /send marco a reaction/i })).toBeVisible({ timeout: 60000 });
  });

  test("a cat on the bench moves the hearing on too, and it can be skipped", async ({ page }) => {
    await page.goto("/demo/the-council");
    await page.locator("[data-seat='2']").waitFor({ timeout: 25000 });
    // The council rises from behind the bench; a cat can't be tapped until its head is over the top.
    await page.waitForTimeout(2200);
    await page.locator("[data-seat='2']").click({ force: true });
    await expect(page.getByRole("status").filter({ hasText: /five minutes away/i })).toBeVisible({ timeout: 6000 });
    await page.locator("[data-seat='0']").click({ force: true });
    await expect(page.getByRole("status").filter({ hasText: /advert for a bank/i })).toBeVisible();
    await page.getByRole("button", { name: /skip to the ruling/i }).click({ force: true });
    await expect(page.getByText(/dear ana/i)).toBeVisible({ timeout: 10000 });
  });

  test("speaks Spanish, and works without motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/es/demo/the-council");
    await page.getByRole("button", { name: /en pie/i }).click({ force: true, timeout: 25000 });
    await expect(page.getByRole("status").filter({ hasText: /cinco minutos/i })).toBeVisible({ timeout: 6000 });
    for (let i = 0; i < 3; i++) await page.getByRole("button", { name: /siguiente conclusión/i }).click({ force: true });
    await page.getByRole("button", { name: /oír el veredicto/i }).click({ force: true });
    await expect(page.getByText(/^culpable$/i)).toBeVisible({ timeout: 8000 });
  });
});

test.describe("Sticker Bomb", () => {
  test("twelve taps bury the page, then the card opens", async ({ page }) => {
    await page.goto("/demo/sticker-bomb");
    const surface = page.locator("[data-surface]");
    await surface.waitFor({ timeout: 25000 });
    await expect(page.getByText(/ana, slap some stickers/i)).toBeVisible();
    const box = (await surface.boundingBox())!;
    for (let i = 0; i < 12; i++) {
      await page.mouse.click(box.x + box.width * (0.2 + ((i * 0.37) % 0.6)), box.y + box.height * (0.15 + ((i * 0.23) % 0.65)));
      await page.waitForTimeout(140);
      await expect(page.locator("[data-slapped]")).toHaveCount(i + 1);
    }
    await expect(page.getByText(/ana before coffee/i)).toBeVisible();
    // The page is full: another tap adds nothing.
    await expect(surface).toBeDisabled();
    await page.getByRole("button", { name: /read the card/i }).click({ force: true });
    await expect(page.getByText(/dear ana/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /send marco a reaction/i })).toBeVisible({ timeout: 60000 });
  });

  test("the keyboard slaps stickers too", async ({ page }) => {
    await page.goto("/demo/sticker-bomb");
    const surface = page.locator("[data-surface]");
    await surface.waitFor({ timeout: 25000 });
    await surface.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(page.locator("[data-slapped]")).toHaveCount(2);
    await expect(page.getByText(/10 to go/i)).toBeVisible();
  });

  test("speaks Spanish", async ({ page }) => {
    await page.goto("/es/demo/sticker-bomb");
    await expect(page.getByText(/ana, pega unos stickers/i)).toBeVisible({ timeout: 25000 });
    await expect(page.getByText(/faltan 12/i)).toBeVisible();
  });
});
