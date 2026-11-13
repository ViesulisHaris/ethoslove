import { expect, test, type Page } from "@playwright/test";

/**
 * The love language quiz end to end: thirty answers, a result, the partner's link opened in another
 * browser, their thirty, and the two results side by side with a gift for each other.
 */
const progress = (n: number) => new RegExp(`^(Question|Pregunta) ${n} (of|de) 30$`);

async function answerAll(page: Page, pick: (i: number) => 0 | 1) {
  for (let i = 0; i < 30; i++) {
    await expect(page.getByText(progress(i + 1))).toBeVisible();
    await page.locator("fieldset button").nth(pick(i)).click();
  }
}

test("a couple compare their love languages by link", async ({ page, browser, baseURL }) => {
  test.setTimeout(90_000);
  await page.goto("/tools/love-language-quiz");
  await expect(page.getByRole("heading", { level: 1, name: "Love language quiz" })).toBeVisible();
  await answerAll(page, (i) => (i % 3 === 0 ? 1 : 0));
  await expect(page.getByText("Your love language", { exact: true })).toBeVisible();
  await expect(page.getByText("Share of your 30 answers")).toBeVisible();

  // The link the "send" button builds: the result in the hash, with the name.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ethos.loveQuiz.v1") ?? "{}") as { mine?: string });
  expect(saved.mine).toMatch(/^[0-9a-c]{5}$/);

  // Another browser: nothing of the first one's, and the cookie question already answered, as in the config.
  const origin = new URL(baseURL ?? "http://localhost:3000").origin;
  const partner = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
  const theirs = await partner.newPage();
  await theirs.goto(`/tools/love-language-quiz#a=${saved.mine}&an=Sam`);
  await expect(theirs.getByText(/^Sam has taken the quiz/)).toBeVisible();
  await answerAll(theirs, (i) => (i % 2 === 0 ? 1 : 0));
  await expect(theirs.getByText("You and Sam", { exact: true })).toBeVisible();
  await expect(theirs.getByRole("heading", { name: "What Sam needs from you" })).toBeVisible();
  await expect(theirs.getByRole("link", { name: /Make it for Sam/ })).toHaveAttribute("href", /\/create\/(the-letter|picnic|bouquet|scratch-card|xoxo)$/);
  // The address bar now holds both results, ready to send back.
  expect(await theirs.evaluate(() => location.hash)).toMatch(/^#a=[0-9a-c]{5}&an=Sam&b=[0-9a-c]{5}$/);
  await partner.close();
});

test("the Spanish quiz asks in Spanish", async ({ page }) => {
  await page.goto("/es/tools/love-language-quiz");
  await expect(page.getByRole("heading", { level: 1, name: "Test de los lenguajes del amor" })).toBeVisible();
  await expect(page.getByText("Pregunta 1 de 30")).toBeVisible();
});
