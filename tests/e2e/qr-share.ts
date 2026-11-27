import { expect, type Page } from "@playwright/test";

/** Opens the share screen's development preview and collects the page's errors from then on; resolves once the QR code is drawn. */
export async function openShare(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /Maximum update depth|FileReader/.test(m.text())) errors.push(m.text());
  });
  await page.goto("/print-preview/share");
  await expect(page.getByRole("img", { name: /QR/ }).first()).toBeVisible({ timeout: 20_000 });
  return errors;
}
