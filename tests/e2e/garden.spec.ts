import { expect, test, type Page } from "@playwright/test";

/**
 * The Garden, end to end: the gate opens, the page grows as it is scrolled, the letter waits
 * until they reach it, and the walk ends on the bouquet. Also the Spanish gift and the
 * no-motion path, which is the one that skips every animation.
 */

/** Fails the test on any uncaught error in the page. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return () => expect(errors, errors.join("\n")).toEqual([]);
}

const scroller = (page: Page) => page.locator('[data-template="garden"] .overflow-y-auto').first();

async function walk(page: Page, screens: number) {
  await scroller(page).evaluate((el, n) => el.scrollTo({ top: el.clientHeight * n }), screens);
  await page.waitForTimeout(700);
}

/** Keeps walking a screen at a time until it comes into view. The page is a different number of
 * screens long on a phone and on a laptop, so no test should know the number. */
async function walkTo(page: Page, target: ReturnType<Page["getByText"]>, max = 16) {
  for (let i = 0; i < max; i++) {
    if (await target.first().isVisible().catch(() => false)) return;
    await scroller(page).evaluate((el) => el.scrollBy({ top: el.clientHeight * 0.9 }));
    await page.waitForTimeout(450);
  }
  await expect(target.first()).toBeVisible({ timeout: 8000 });
}

async function arrive(page: Page, url = "/demo/garden") {
  await page.goto(url);
  const loading = page.getByText(/someone made this for you|alguien hizo esto para ti/i);
  await expect(loading).toBeHidden({ timeout: 25000 });
}

test.describe("The Garden", () => {
  test("the gate opens and the walk ends on the bouquet", async ({ page }) => {
    const noErrors = watchErrors(page);
    await arrive(page);

    const gate = page.getByRole("button", { name: /push the gate/i });
    await expect(gate).toBeVisible({ timeout: 20000 });
    // The gate's sign carries the recipient's name before anything else does.
    await expect(page.getByText("Ana", { exact: true }).first()).toBeVisible();

    // Nothing below the gate has been read yet: the letter holds until it is reached.
    await expect(page.getByText(/dear ana/i)).toHaveCount(0);

    // The gate is always breathing, so Playwright never sees it as stable.
    await gate.click({ force: true });
    await page.waitForTimeout(2500);
    const moved = await scroller(page).evaluate((el) => el.scrollTop);
    expect(moved, "pushing the gate walks them in").toBeGreaterThan(0);

    await walkTo(page, page.getByRole("img", { name: /café table/i }));
    await walkTo(page, page.getByText(/dear ana/i));

    const end = scroller(page);
    await end.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await page.waitForTimeout(1200);
    await expect(page.getByText(/for ana/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /make one for someone/i })).toBeVisible({ timeout: 10000 });
    noErrors();
  });

  test("the whole walk is in Spanish", async ({ page }) => {
    const noErrors = watchErrors(page);
    await arrive(page, "/es/demo/garden");
    await expect(page.getByRole("button", { name: /abre la verja/i })).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: /abre la verja/i }).click({ force: true });
    await walkTo(page, page.getByText(/querida ana/i));
    await expect(page.getByText(/cortadas para ti/i).first()).toBeVisible({ timeout: 15000 });
    noErrors();
  });

  test("with motion turned off, everything is already there", async ({ page }) => {
    const noErrors = watchErrors(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await arrive(page);
    await page.getByRole("button", { name: /push the gate/i }).click({ force: true });
    await walk(page, 3.4);
    // The meadow's flowers are grown from the start instead of opening as it scrolls.
    const grown = await page
      .locator('[data-template="garden"] section')
      .nth(2)
      .evaluate((el) => {
        const flowers = [...el.querySelectorAll("svg")].filter((s) => s.viewBox.baseVal.height === 320);
        return flowers.filter((f) => (f.closest("[style]") as HTMLElement)?.style.opacity !== "0").length;
      });
    expect(grown, "the meadow is open with no motion").toBeGreaterThan(0);
    noErrors();
  });
});
