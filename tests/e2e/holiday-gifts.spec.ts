import { expect, test, type Page } from "@playwright/test";

/**
 * The holiday gifts of November 2026, played through the way a recipient plays them: The Nice List
 * (untie, pull, stamp), Unwrapped (tear every present, then the receipt) and Wishbone (pull until it
 * snaps). Each in English, in Spanish and with motion turned down, by tapping, and the two that
 * are pulled once more by dragging a finger. A gift must never throw, so every test listens for
 * page errors, and the editor's still opening must hold no button of its own.
 */

type Lang = "en" | "es";
type Gift = {
  slug: string;
  first: Record<Lang, RegExp>;
  dear: Record<Lang, RegExp>;
  /** After the first tap: everything up to the letter. */
  finish: (page: Page, lang: Lang) => Promise<void>;
};

const READ = /^(read the letter|lee la carta)$/i;

const watch = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${e.name}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    if (m.location().url.includes("/_vercel/") || m.text().includes("/_vercel/")) return;
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

const GIFTS: Gift[] = [
  {
    slug: "nice-list",
    first: { en: /untie the ribbon/i, es: /desata el lazo/i },
    dear: { en: /dear ava/i, es: /hola, ava/i },
    finish: async (page, lang) => {
      await page.getByRole("button", { name: lang === "es" ? /tira hacia abajo/i : /pull it down/i }).click({ force: true, timeout: 10000 });
      // It rolls the rest of the way, ticks every line, and the stamp comes down.
      await page.getByRole("button", { name: READ }).click({ timeout: 20000 });
    },
  },
  {
    slug: "unwrapped",
    first: { en: /tap to unwrap/i, es: /toca para abrirlo/i },
    dear: { en: /dear nina/i, es: /hola, nina/i },
    finish: async (page, lang) => {
      const unwrap = page.getByRole("button", { name: lang === "es" ? /toca para abrirlo/i : /tap to unwrap/i });
      const next = page.getByRole("button", { name: lang === "es" ? /siguiente|queda uno/i : /next one|one more/i });
      const read = page.getByRole("button", { name: READ });
      // Six presents and the gold one: a tap or two each, then on to the next, until the receipt prints.
      for (let i = 0; i < 40 && !(await read.isVisible()); i++) {
        if (await unwrap.isVisible()) await unwrap.click({ force: true });
        else if (await next.isVisible()) await next.click({ force: true });
        await page.waitForTimeout(350);
      }
      await read.click({ timeout: 15000 });
    },
  },
  {
    slug: "wishbone",
    first: { en: /pull your side/i, es: /tira de tu lado/i },
    dear: { en: /dear rosa/i, es: /hola, rosa/i },
    finish: async (page) => {
      // A tap pulls by itself until it gives.
      await page.getByRole("button", { name: READ }).click({ timeout: 20000 });
    },
  },
];

for (const gift of GIFTS) {
  test.describe(`${gift.slug}, played through`, () => {
    test.setTimeout(120_000);

    for (const lang of ["en", "es"] as const) {
      test(`in ${lang === "en" ? "English" : "Spanish"}, from the first tap to the letter and the end screen`, async ({ page }) => {
        const errors = watch(page);
        const first = await arrive(page, gift, lang);
        await first.click({ force: true });
        await gift.finish(page, lang);
        await expect(page.getByText(gift.dear[lang]).last()).toBeVisible({ timeout: 30000 });
        if (lang === "en") await expect(page.getByRole("button", { name: /send .* a reaction/i })).toBeVisible({ timeout: 60000 });
        expect(errors).toEqual([]);
      });
    }

    test("with motion turned down it still gets to the letter", async ({ page }) => {
      const errors = watch(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const first = await arrive(page, gift, "en");
      await first.click({ force: true });
      await gift.finish(page, "en");
      await expect(page.getByText(gift.dear.en).last()).toBeVisible({ timeout: 30000 });
      expect(errors).toEqual([]);
    });
  });
}

test.describe("by hand, the way a finger does it", () => {
  test.setTimeout(90_000);

  test("the Nice List comes down as far as it is pulled, and rolls the rest when let go", async ({ page }) => {
    const errors = watch(page);
    const first = await arrive(page, GIFTS[0], "en");
    await first.click({ force: true });
    const handle = page.getByRole("button", { name: /pull it down/i });
    await handle.waitFor();
    await page.waitForTimeout(900);
    const box = (await handle.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(x, y + i * 14);
    // Part of the list is showing, and the first lines already have their ticks.
    await expect(page.getByText(/made me soup/i)).toBeVisible();
    await page.mouse.up();
    await page.getByRole("button", { name: READ }).waitFor({ timeout: 20000 });
    await expect(page.getByRole("img", { name: "NAUGHTY" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Unwrapped tears as a finger is dragged across the paper", async ({ page }) => {
    const errors = watch(page);
    const present = await arrive(page, GIFTS[1], "en");
    const box = (await present.boundingBox())!;
    await page.mouse.move(box.x + 10, box.y + box.height * 0.4);
    await page.mouse.down();
    for (let i = 0; i <= 40; i++) await page.mouse.move(box.x + 10 + (box.width - 20) * ((i % 20) / 20), box.y + box.height * (0.3 + 0.4 * ((i * 7) % 10) / 10));
    await page.mouse.up();
    await expect(page.getByText("voice notes")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("1,284")).toBeVisible({ timeout: 5000 });
    expect(errors).toEqual([]);
  });

  test("the wishbone bends with the finger, springs back if let go early, and snaps when pulled hard", async ({ page }) => {
    const errors = watch(page);
    const handle = await arrive(page, GIFTS[2], "en");
    const box = (await handle.boundingBox())!;
    const x = box.x + box.width * 0.55;
    const y = box.y + box.height * 0.75;
    const pull = async (steps: number) => {
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let i = 1; i <= steps; i++) await page.mouse.move(x + i * 5, y + i * 3);
      await page.mouse.up();
    };
    // A gentle tug: it bends and comes back, whole.
    await pull(6);
    await page.waitForTimeout(500);
    await expect(page.getByRole("button", { name: /pull your side/i })).toBeVisible();
    await expect(page.getByText(/you got the big half/i)).toBeHidden();
    // A real pull: it gives.
    await pull(30);
    await expect(page.getByText(/you got the big half/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/another year at the same table/i)).toBeVisible();
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
      expect(await tile.locator("button").count()).toBe(0);
    });
  }
});
