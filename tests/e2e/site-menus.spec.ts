import { expect, test, type Page } from "@playwright/test";

/**
 * The site's own ways round: the header's row of rooms on a desk, the sheet it becomes on a phone,
 * the language switch, and every link the header and the footer carry. Nothing held these before
 * 22 Nov 2026, when the site's paper and its rose changed colour under them.
 *
 * A dev server builds a page the first time it is asked for, so every arrival is given a minute.
 */
const ARRIVE = { timeout: 60_000 };
const ROOMS = [
  ["Gifts", "/gifts"],
  ["Dates", "/dates"],
  ["Trips", "/trips"],
  ["Long distance", "/long-distance"],
  ["Games", "/games"],
  ["Pricing", "/pricing"],
] as const;

const header = (page: Page) => page.locator(".site-header");

/** How far a colour stands from what is painted behind it, as WCAG counts it. */
function contrastOf(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((els) => {
    const lum = (r: number, g: number, b: number) => {
      const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const behind = (el: Element) => {
      for (let n: Element | null = el; n; n = n.parentElement) {
        const c = rgb(getComputedStyle(n).backgroundColor);
        if (c.length >= 3 && (c[3] === undefined || c[3] > 0.9)) return c;
      }
      return [255, 255, 255];
    };
    return els.map((el) => {
      const f = rgb(getComputedStyle(el).color);
      const b = behind(el);
      const [a, z] = [lum(f[0], f[1], f[2]), lum(b[0], b[1], b[2])];
      return { text: (el.textContent ?? "").trim().slice(0, 24), ratio: (Math.max(a, z) + 0.05) / (Math.min(a, z) + 0.05) };
    });
  });
}

test.describe("the site's menus", () => {
  test("on a desk each room in the header opens its page, and marks itself there", async ({ page }) => {
    // Six pages, each built by a dev server the first time it is asked for.
    test.setTimeout(420_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [label, path] of ROOMS) {
      await page.goto("/");
      const link = header(page).getByRole("link", { name: label, exact: true });
      await expect(link).toBeVisible();
      await link.click();
      await expect(page).toHaveURL(new RegExp(path + "$"), ARRIVE);
      await expect(header(page).getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    }
  });

  test("the header's words are readable on what is behind them, on the cream", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/templates");
    for (const { text, ratio } of await contrastOf(page, ".site-header nav a")) expect(ratio, `“${text}” in the header`).toBeGreaterThanOrEqual(4.5);
  });

  test("the language switch goes to the same page in Spanish and back", async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    // The header holds the switch twice, for a desk and for a phone: the one on show is the one to press. It is the
    // header's one dropdown, and it says the language's code ("en", set in capitals by the style sheet).
    const switcher = (code: string) => header(page).locator('button:visible[aria-haspopup="menu"]').filter({ hasText: new RegExp(code, "i") });
    await page.goto("/templates");
    await switcher("en").click();
    await page.getByRole("menuitemradio", { name: /Español/ }).click();
    await expect(page).toHaveURL(/\/es\/templates$/, ARRIVE);
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(header(page).getByRole("link", { name: "Regalos", exact: true })).toBeVisible();
    await switcher("es").click();
    await page.getByRole("menuitemradio", { name: /English/ }).click();
    await expect(page).toHaveURL(/\/templates$/, ARRIVE);
    await expect(page).not.toHaveURL(/\/es\//);
  });

  for (const [width, height] of [[390, 844], [320, 568]] as const) {
    test(`on a ${width}px phone the menu opens as a sheet, each row a thumb tall, and a row opens its page`, async ({ page }) => {
      test.setTimeout(180_000);
      await page.setViewportSize({ width, height });
      await page.goto("/");
      const open = page.getByRole("button", { name: "Open menu" });
      await expect(open).toBeVisible();
      const box = (await open.boundingBox())!;
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
      await open.click();
      const sheet = page.getByRole("navigation", { name: /menu/i }).last();
      const rows = sheet.getByRole("link");
      await expect(rows).toHaveCount(ROOMS.length);
      for (const [label] of ROOMS) await expect(rows.filter({ hasText: label }).first()).toBeVisible();
      for (const h of await rows.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) expect(h).toBeGreaterThanOrEqual(44);
      // The sheet never pushes the page sideways, and its two buttons are on the screen.
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      await expect(page.getByRole("link", { name: "Log in" }).last()).toBeInViewport();
      await expect(page.getByRole("link", { name: "Make a gift" }).last()).toBeInViewport();
      // Escape closes it; opened again, a row opens its page and the sheet is gone.
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Close menu" })).toHaveCount(0);
      await open.click();
      await rows.filter({ hasText: "Dates" }).first().click();
      await expect(page).toHaveURL(/\/dates$/, ARRIVE);
      await expect(page.getByRole("button", { name: "Close menu" })).toHaveCount(0);
    });
  }

  test("every link in the header and the footer answers, in both languages", async ({ page, request }) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const start of ["/", "/es"]) {
      await page.goto(start);
      const hrefs = await page.evaluate(() => [...new Set([...document.querySelectorAll(".site-header a[href], [data-site-footer] a[href], footer a[href]")].map((a) => a.getAttribute("href") ?? "").filter((h) => h.startsWith("/")))]);
      expect(hrefs.length, start).toBeGreaterThanOrEqual(20);
      for (const href of hrefs) {
        const res = await request.get(href, { timeout: 120_000 });
        expect(res.status(), `${start}: ${href}`).toBe(200);
      }
    }
  });
});
