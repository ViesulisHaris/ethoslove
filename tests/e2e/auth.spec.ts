import { expect, test, type Page } from "@playwright/test";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

/**
 * A sign-in link that failed (already used, expired, or replaced by a newer email) must not be a
 * dead end. The page says so plainly, and offers a new link or the code from the newest email. The
 * link and the code in one email are the same one-time token, so that email's own code is spent too.
 */
test.describe("a sign-in link that failed", () => {
  for (const [locale, path] of [
    ["en", "/login?error=callback"],
    ["es", "/es/login?error=callback"],
  ] as const) {
    test(`${locale}: the login page offers a new link or the newest email's code`, async ({ page }) => {
      await page.goto(path);
      await skipWithoutSignIn(page);
      const alert = page.getByRole("alert").first();
      await expect(alert).toContainText(/already been used or has expired|ya se usó o caducó/);
      await expect(page.getByText(/newest email|correo más reciente/).first()).toBeVisible();
      const otp = page.locator("#otp");
      await expect(otp).toBeVisible();
      const verify = page.getByRole("button", { name: /^(Verify|Verificar)$/ });
      await expect(verify).toBeDisabled();
      await page.fill("#email-for-code", "ana@example.com");
      await otp.fill("12-34-56");
      await expect(otp).toHaveValue("123456");
      await expect(verify).toBeEnabled();
      // The ordinary way is still there underneath, using the same address: one email field on the page.
      await expect(page.locator("#email")).toHaveCount(0);
      await expect(page.getByRole("button", { name: /magic link|enlace/i })).toBeEnabled();
    });
  }

  test("without the error, the login page is unchanged", async ({ page }) => {
    await page.goto("/login");
    await skipWithoutSignIn(page);
    await expect(page.locator("#otp")).toHaveCount(0);
    await expect(page.locator("#email")).toBeVisible();
  });
});

/**
 * A build without Supabase keys, like CI's, shows "Auth isn't connected yet" where the form would
 * be: there is no sign-in to test, so these skip. Anywhere with keys, they run. It waits for one or
 * the other, since the form only appears once the page is running in the browser, and a page with
 * neither still fails: only that note skips, never a form that has gone missing.
 */
async function skipWithoutSignIn(page: Page) {
  const notConnected = page.getByText(en.auth.notConfiguredTitle).or(page.getByText(es.auth.notConfiguredTitle));
  await expect(notConnected.or(page.locator("#email, #email-for-code")).first()).toBeVisible();
  test.skip(await notConnected.first().isVisible(), "sign-in isn't set up in this build: no Supabase keys, as on CI");
}
