import { expect, test, type Page } from "@playwright/test";

/**
 * A visit that arrives with no referrer, only a tag in its address (an assistant's answer, a pin,
 * an Instagram link), is counted once by name (src/lib/attribution/arrival.ts). Vercel's script is
 * only served on Vercel, so the test stands in for it: it takes down what the page hands to
 * `window.va`, the same call the real script receives.
 */
async function eventsOf(page: Page, address: string): Promise<string[]> {
  await page.addInitScript(() => {
    const w = window as unknown as { __counted: unknown[][]; va: (...args: unknown[]) => void };
    w.__counted = [];
    w.va = (...args: unknown[]) => {
      w.__counted.push(args);
    };
  });
  await page.goto(address);
  // The count is made in the page's first effect: give the page a moment to have run it.
  await page.waitForLoadState("networkidle");
  return page.evaluate(() =>
    (window as unknown as { __counted: unknown[][] }).__counted.filter((call) => call[0] === "event").map((call) => String((call[1] as { name?: unknown } | undefined)?.name)),
  );
}

test.describe("an arrival with only a tag in its address", () => {
  test("from ChatGPT is counted once", async ({ page }) => {
    const names = await eventsOf(page, "/templates/the-letter?utm_source=chatgpt.com");
    expect(names.filter((name) => name === "arrived_chatgpt")).toHaveLength(1);
  });

  test("from one of our pins is counted as Pinterest's", async ({ page }) => {
    const names = await eventsOf(page, "/blog/love-notes-for-him?ref=pinterest");
    expect(names.filter((name) => name.startsWith("arrived_"))).toEqual(["arrived_pinterest"]);
  });

  test("an ordinary visit counts no arrival", async ({ page }) => {
    const names = await eventsOf(page, "/templates");
    expect(names.filter((name) => name.startsWith("arrived_"))).toEqual([]);
  });
});
