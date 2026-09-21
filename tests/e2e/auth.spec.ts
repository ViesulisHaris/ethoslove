import { expect, test } from "@playwright/test";

/**
 * A sign-in link that failed — opened in a different browser than the one that asked for it, or
 * expired — must not be a dead end: the code from the same email gets the person in right there.
 */
test.describe("a sign-in link that failed", () => {
  for (const [locale, path] of [
    ["en", "/login?error=callback"],
    ["es", "/es/login?error=callback"],
  ] as const) {
    test(`${locale}: the login page offers the code from the same email`, async ({ page }) => {
      await page.goto(path);
      const alert = page.getByRole("alert").first();
      await expect(alert).toContainText(/different browser|otro navegador/);
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
    await expect(page.locator("#otp")).toHaveCount(0);
    await expect(page.locator("#email")).toBeVisible();
  });
});
