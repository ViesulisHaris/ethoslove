import { expect, test } from "@playwright/test";
import { openShare } from "./qr-share";

/**
 * Error AKK0IW, "undefined is not a constructor (evaluating 'new e.FileReader')", from Chrome on an
 * iPhone: Lockdown Mode turns FileReader off in WebKit (bug 249189), every browser on an iPhone is
 * WebKit, and the QR library read the centre picture through FileReader, so the share screen's code
 * was never drawn. Played in WebKit with FileReader taken away, as Lockdown Mode leaves it.
 */
test.use({ browserName: "webkit" });

test.describe("the share screen's QR card without FileReader (iPhone Lockdown Mode)", () => {
  test.skip(!!process.env.CI, "/print-preview/share is development-only");

  test("still draws the code, with the logo in the middle", async ({ page }) => {
    await page.addInitScript(() => {
      // As Lockdown Mode leaves it: no FileReader at all.
      delete (window as { FileReader?: unknown }).FileReader;
    });
    const errors = await openShare(page);
    const src = await page.getByRole("img", { name: /QR/ }).first().getAttribute("src");
    expect(src).toMatch(/^data:image\/svg\+xml/);
    // The logo is in the drawing itself.
    expect(decodeURIComponent(src!)).toContain("<image");
    expect(errors).toEqual([]);
  });
});
