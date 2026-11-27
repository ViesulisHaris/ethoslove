import { expect, test } from "@playwright/test";
import { openShare } from "./qr-share";

/**
 * Two errors visitors hit on the share screen's QR card (src/components/editor/qr-designer.tsx), drawn
 * from its development-only preview (/print-preview/share): a real share screen needs a published gift.
 *
 * - "Minified React error #185" (code YAD2U4, Chrome on Windows, 27 Nov): dragging the colour picker
 *   sends an input event per mouse move, and Chrome runs input before React's scheduled work. Each
 *   change also told the share screen the new design from an effect, a second render left waiting;
 *   fifty changes with one always waiting is React's "Maximum update depth exceeded".
 * - "undefined is not a constructor (evaluating 'new e.FileReader')" (code AKK0IW, Chrome on an iPhone,
 *   26 Nov): Lockdown Mode turns FileReader off in WebKit (bug 249189), and the QR library read the
 *   centre picture through it, so the code was never drawn.
 */

test.describe("the share screen's QR card", () => {
  test.skip(!!process.env.CI, "/print-preview/share is development-only");

  test.beforeEach(async ({ request }) => {
    const status = (await request.get("/print-preview/share")).status();
    test.skip(status === 404, "/print-preview/share is development-only: a production build answers 404");
  });

  test("a fast drag on the colour picker never reaches React's update limit", async ({ page }) => {
    const errors = await openShare(page);
    // The code's own colour picker, the first colour input in the QR card. Eighty input events in one
    // task: what a drag looks like when the browser hands over input before React's next turn.
    const sent = await page.evaluate(() => {
      const input = document.querySelector<HTMLInputElement>('input[type="color"]');
      if (!input) return 0;
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      for (let i = 0; i < 80; i++) {
        set.call(input, `#${(0x200000 + i * 0x010203).toString(16).padStart(6, "0").slice(-6)}`);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return 80;
    });
    expect(sent).toBe(80);
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
    // And the drawing kept up: the code is on the screen.
    await expect(page.getByRole("img", { name: /QR/ }).first()).toBeVisible();
  });
});
