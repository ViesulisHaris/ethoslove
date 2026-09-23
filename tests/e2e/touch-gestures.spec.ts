import { expect, test, type CDPSession, type Page } from "@playwright/test";

/**
 * Swipes made of real touch events, so the browser's own gesture handling runs. A drag with the
 * mouse always worked; with a finger Chrome claimed the drag for scrolling and sent
 * `pointercancel` instead of `pointerup`, so "swipe up to blow" and the sketchbook's page swipe
 * did nothing on a phone, and without a microphone the birthday gifts were stuck on the cake.
 */
test.skip(({ isMobile }) => !isMobile, "touch only");

async function swipe(
  cdp: CDPSession,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: from.x + ((to.x - from.x) * i) / 10, y: from.y + ((to.y - from.y) * i) / 10 },
      ],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function swipeUp(page: Page, cdp: CDPSession) {
  const { width, height } = page.viewportSize()!;
  await swipe(cdp, { x: width / 2, y: height * 0.72 }, { x: width / 2, y: height * 0.38 });
}

test("Birthday Cinema: swiping up blows the candles out", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await page.goto("/demo/birthday-cinema");
  const start = page.getByRole("button", { name: /tap to start/i });
  await start.waitFor({ timeout: 30000 });
  await page.waitForTimeout(600);
  await start.tap({ force: true });
  const wish = page.getByText(/make a wish/i);
  await expect(wish).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1200);
  for (let i = 0; i < 10 && (await wish.isVisible()); i++) {
    await swipeUp(page, cdp);
    await page.waitForTimeout(400);
  }
  await expect(page.getByText(/happy birthday,/i)).toBeVisible({ timeout: 5000 });
});

test("Pop-up Card: swiping up blows the candles out", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await page.goto("/demo/popup-card");
  const card = page.getByRole("button", { name: /open the card/i });
  await card.waitFor({ timeout: 30000 });
  await page.waitForTimeout(600);
  await card.tap({ force: true });
  const candles = page.locator("[data-candle]");
  await expect(candles.first()).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(2200);
  const n = await candles.count();
  for (let i = 0; i < n; i++) await candles.nth(i).tap({ force: true });
  await expect(page.getByText(/make a wish/i)).toBeVisible();
  await swipeUp(page, cdp);
  await expect(page.locator("[data-read-pill]")).toBeVisible({ timeout: 8000 });
});

test("Sketchbook: a sideways swipe turns the page, both ways", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await page.goto("/demo/sketchbook");
  const book = page.getByRole("button", { name: /open the sketchbook/i });
  await book.waitFor({ timeout: 30000 });
  await page.waitForTimeout(600);
  await book.tap({ force: true });
  await expect(page.getByText("1 / 5")).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1200);
  const { width, height } = page.viewportSize()!;
  await swipe(cdp, { x: width * 0.8, y: height / 2 }, { x: width * 0.15, y: height / 2 + 10 });
  await expect(page.getByText("2 / 5")).toBeVisible({ timeout: 5000 });
  await page.waitForTimeout(1000);
  await swipe(cdp, { x: width * 0.15, y: height / 2 }, { x: width * 0.85, y: height / 2 + 10 });
  await expect(page.getByText("1 / 5")).toBeVisible({ timeout: 5000 });
});
