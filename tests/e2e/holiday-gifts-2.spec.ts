import { expect, test, type Page } from "@playwright/test";

/**
 * The second batch of holiday gifts (November 2026), played through the way a recipient plays them:
 * Thankful Pie (lift the slices), Leaf Pile (brush the leaves off the card) and Frosted Window (wipe
 * the frost off the glass). Each in English, in Spanish and with motion turned down, by tapping or
 * the keyboard, and once more with a finger dragged across. A gift must never throw, so every test
 * listens for page errors, and the editor's still opening must hold no button of its own.
 */

type Lang = "en" | "es";
type Gift = {
  slug: string;
  first: Record<Lang, RegExp>;
  dear: Record<Lang, RegExp>;
  /** From the gift's first screen to the letter, without a finger. */
  finish: (page: Page, lang: Lang) => Promise<void>;
};

const READ = /^(read the letter|lee la carta)$/i;

const watch = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${e.name}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (m.location().url.includes("/_vercel/") || m.text().includes("/_vercel/")) return;
    // a phone buzz asked for before the first tap is refused by the browser, and says so
    if (m.text().includes("navigator.vibrate")) return;
    errors.push(`console.error: ${m.text().slice(0, 200)}`);
  });
  return errors;
};

async function arrive(page: Page, gift: Gift, lang: Lang) {
  await page.goto(lang === "es" ? `/es/demo/${gift.slug}` : `/demo/${gift.slug}`);
  const first = page.getByRole("button", { name: gift.first[lang] }).first();
  await first.waitFor({ timeout: 30000 });
  await page.waitForTimeout(600);
  return first;
}

/** Drags a finger across a box in sweeps, top to bottom. */
async function sweep(page: Page, box: { x: number; y: number; width: number; height: number }, passes: number, from = 0.1, gap = 0.14) {
  for (let pass = 0; pass < passes; pass++) {
    const y = box.y + box.height * (from + pass * gap);
    await page.mouse.move(box.x + box.width * 0.05, y);
    await page.mouse.down();
    for (let i = 0; i <= 20; i++) await page.mouse.move(box.x + box.width * (0.05 + 0.9 * (pass % 2 ? 1 - i / 20 : i / 20)), y + Math.sin(i / 2) * 8);
    await page.mouse.up();
  }
}

const GIFTS: Gift[] = [
  {
    slug: "thankful-pie",
    first: { en: /lift a slice/i, es: /toma un trozo/i },
    dear: { en: /dear june/i, es: /hola, june/i },
    finish: async (page) => {
      const read = page.getByRole("button", { name: READ });
      for (let i = 0; i < 12 && !(await read.isVisible()); i++) {
        const pie = page.getByRole("button", { name: /lift a slice|toma un trozo|take the rest|llévate el resto/i });
        if (await pie.isVisible()) await pie.press("Enter");
        await page.waitForTimeout(500);
      }
      await read.click({ timeout: 15000 });
    },
  },
  {
    slug: "leaf-pile",
    first: { en: /brush the leaves away/i, es: /aparta las hojas/i },
    dear: { en: /dear mara/i, es: /hola, mara/i },
    finish: async (page, lang) => {
      await page.getByRole("button", { name: lang === "es" ? /aparta las hojas/i : /brush the leaves away/i }).press("Enter");
      await page.getByRole("button", { name: READ }).click({ timeout: 20000 });
    },
  },
  {
    slug: "frosted-window",
    first: { en: /wipe the frost away/i, es: /limpia la escarcha/i },
    dear: { en: /dear ava/i, es: /hola, ava/i },
    finish: async (page, lang) => {
      await page.getByRole("button", { name: lang === "es" ? /limpia la escarcha/i : /wipe the frost away/i }).press("Enter");
      await page.getByRole("button", { name: READ }).click({ timeout: 20000 });
    },
  },
];

for (const gift of GIFTS) {
  test.describe(`${gift.slug}, played through`, () => {
    test.setTimeout(120_000);

    for (const lang of ["en", "es"] as const) {
      test(`in ${lang === "en" ? "English" : "Spanish"}, from the first screen to the letter and the end screen`, async ({ page }) => {
        const errors = watch(page);
        await arrive(page, gift, lang);
        await gift.finish(page, lang);
        await expect(page.getByText(gift.dear[lang]).last()).toBeVisible({ timeout: 30000 });
        if (lang === "en") await expect(page.getByRole("button", { name: /send .* a reaction/i })).toBeVisible({ timeout: 60000 });
        expect(errors).toEqual([]);
      });
    }

    test("with motion turned down it still gets to the letter", async ({ page }) => {
      const errors = watch(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await arrive(page, gift, "en");
      await gift.finish(page, "en");
      await expect(page.getByText(gift.dear.en).last()).toBeVisible({ timeout: 30000 });
      expect(errors).toEqual([]);
    });
  });
}

test.describe("by hand, the way a finger does it", () => {
  test.setTimeout(90_000);

  test("each slice of the pie writes the next ingredient onto the card", async ({ page }) => {
    const errors = watch(page);
    const pie = await arrive(page, GIFTS[0], "en");
    const box = (await pie.boundingBox())!;
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.3);
    await expect(page.getByText("two cups of you humming while you cook")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("a pinch of you stealing the blanket")).toBeHidden();
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.7);
    await expect(page.getByText("a pinch of you stealing the blanket")).toBeVisible({ timeout: 5000 });
    expect(errors).toEqual([]);
  });

  test("the leaves slide off the card under a finger until the wind takes the rest", async ({ page }) => {
    const errors = watch(page);
    const pile = await arrive(page, GIFTS[1], "en");
    const box = (await pile.boundingBox())!;
    await expect(page.getByRole("button", { name: READ })).toBeHidden();
    await sweep(page, box, 8, 0.3, 0.04);
    await page.getByRole("button", { name: READ }).waitFor({ timeout: 15000 });
    expect(errors).toEqual([]);
  });

  test("the frost wipes off under a finger, and melts once most of it is gone", async ({ page }) => {
    const errors = watch(page);
    const glass = await arrive(page, GIFTS[2], "en");
    const box = (await glass.boundingBox())!;
    await sweep(page, box, 2, 0.2, 0.2);
    await expect(page.getByRole("button", { name: READ })).toBeHidden();
    await sweep(page, box, 7, 0.06, 0.14);
    await page.getByRole("button", { name: READ }).waitFor({ timeout: 15000 });
    await expect(page.getByText("merry christmas, Ava")).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("the editor", () => {
  for (const gift of GIFTS) {
    test(`${gift.slug}: opens with its own fields and a preview of the letter`, async ({ page }) => {
      const errors = watch(page);
      await page.goto(`/create/${gift.slug}`);
      await page.locator("#recipientName").fill("Zed");
      const previewTab = page.getByRole("tab").nth(1);
      if (await previewTab.isVisible()) await previewTab.click();
      await expect(page.getByText(/dear zed|hola, zed/i).filter({ visible: true }).first()).toBeVisible({ timeout: 25000 });
      expect(errors).toEqual([]);
    });

    test(`${gift.slug}: its Classic cover tile draws the first screen at the tile's size`, async ({ page }) => {
      await page.goto(`/create/${gift.slug}`);
      const tile = page.getByTestId("cover-classic").locator("[class*='container-type']").first();
      await tile.scrollIntoViewIfNeeded();
      await expect(tile).toBeVisible({ timeout: 25000 });
      const tooBig = await tile.evaluate((el) => {
        const height = el.getBoundingClientRect().height;
        return [...el.querySelectorAll("*")].filter((n) => n.childNodes.length && [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent?.trim()) && parseFloat(getComputedStyle(n).fontSize) > height / 8).map((n) => `${n.textContent?.trim().slice(0, 24)} (${getComputedStyle(n).fontSize})`);
      });
      expect(tooBig, "text in the tile that is bigger than an eighth of its height").toEqual([]);
      // A button inside the tile's own button is invalid markup.
      expect(await tile.locator("button, [role=button]").count()).toBe(0);
    });
  }
});
