import { expect, test, type Page } from "@playwright/test";

/**
 * The five Halloween gifts of October 2026, played through the way a recipient plays them: the
 * first tap, whatever the gift asks after that, and the letter at the end of it. Each is run in
 * English, in Spanish, and with motion turned down, which is where a staged animation most often
 * leaves someone stuck. A gift must never throw, so every test also listens for page errors.
 */

type Gift = {
  slug: string;
  en: { first: RegExp; dear: RegExp };
  es: { first: RegExp; dear: RegExp };
  /** After the first tap: play it through to the letter. `reduced` is true under reduced motion. */
  finish: (page: Page, lang: "en" | "es", reduced: boolean) => Promise<void>;
};

/**
 * Page errors, and the console errors React raises for invalid markup. The editor puts each gift's
 * still opening inside a button tile, so an opening with a button of its own is a button inside a
 * button: React calls that a hydration error, and the dev overlay shows it as an issue.
 */
const watch = (page: Page) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`${e.name}: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // Vercel's analytics scripts exist only on Vercel: a production build served from a laptop answers them with a 404 page.
    if (m.location().url.includes("/_vercel/") || m.text().includes("/_vercel/")) return;
    errors.push(`console.error: ${m.text().slice(0, 200)}`);
  });
  return errors;
};

/** Past the loading screen, to the thing that asks for the first tap. */
async function arrive(page: Page, gift: Gift, lang: "en" | "es") {
  await page.goto(lang === "es" ? `/es/demo/${gift.slug}` : `/demo/${gift.slug}`);
  const first = page.getByRole("button", { name: gift[lang].first });
  await first.first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(700);
  return first.first();
}

/** The "skip" link that appears a few seconds into the long animations. */
const skip = (page: Page) => page.getByRole("button", { name: /^(skip|saltar)$/i });

const GIFTS: Gift[] = [
  {
    slug: "seance",
    en: { first: /touch the planchette/i, dear: /dear ivy/i },
    es: { first: /toca la plancheta/i, dear: /hola, ivy/i },
    finish: async (page, _lang, reduced) => {
      if (!reduced) await skip(page).click({ timeout: 15000 });
    },
  },
  {
    slug: "bat-swarm",
    en: { first: /tap the moon/i, dear: /dear nora/i },
    es: { first: /toca la luna/i, dear: /hola, nora/i },
    finish: async (page, _lang, reduced) => {
      if (!reduced) await skip(page).click({ timeout: 15000 });
    },
  },
  {
    slug: "cauldron",
    en: { first: /to the potion$/i, dear: /dear luna/i },
    es: { first: /a la poción$/i, dear: /hola, luna/i },
    finish: async (page, lang, reduced) => {
      const jars = page.getByRole("button", { name: lang === "es" ? /a la poción$/i : /to the potion$/i });
      // The first jar was the first tap; the other two can only be tapped once the one before has landed.
      for (let i = 1; i < 3; i++) {
        await expect(jars.nth(i)).toBeEnabled({ timeout: 8000 });
        await jars.nth(i).click({ force: true });
        await page.waitForTimeout(reduced ? 200 : 1300);
      }
      await page.getByRole("button", { name: lang === "es" ? /descorcha/i : /pop the cork/i }).first().click({ force: true, timeout: 15000 });
    },
  },
  {
    slug: "jack-o-lantern",
    en: { first: /tap to carve/i, dear: /dear maya/i },
    es: { first: /toca para tallar/i, dear: /hola, maya/i },
    finish: async (page, lang, reduced) => {
      if (!reduced) await skip(page).click({ timeout: 15000 });
      await page.getByRole("button", { name: lang === "es" ? /enciende la vela/i : /light the candle/i }).first().click({ force: true, timeout: 15000 });
      await page.getByRole("button", { name: lang === "es" ? /lee la nota/i : /read the note/i }).click({ force: true, timeout: 15000 });
    },
  },
  {
    slug: "haunted-house",
    en: { first: /open the gate/i, dear: /dear ruby/i },
    es: { first: /abrir la verja/i, dear: /hola, ruby/i },
    finish: async (page, lang) => {
      const knock = page.getByRole("button", { name: lang === "es" ? /llamar a la puerta/i : /knock on the door/i });
      await knock.waitFor({ timeout: 30000 });
      // One window opens onto its photo and closes again before the knock.
      const lit = page.locator('button[aria-label*="lost on purpose"], button[aria-label*="perdidos a prop"]').first();
      await lit.click({ force: true, timeout: 10000 });
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: lang === "es" ? /cerrar la ventana/i : /close the window/i }).click({ force: true });
      await expect(page.getByRole("dialog")).toBeHidden();
      await knock.click({ force: true });
    },
  },
];

for (const gift of GIFTS) {
  test.describe(`${gift.slug}, played through`, () => {
    // These are long on purpose: a staged reveal takes the time it takes.
    test.setTimeout(120_000);

    test("in English, from the first tap to the letter and the end screen", async ({ page }) => {
      const errors = watch(page);
      const first = await arrive(page, gift, "en");
      await first.click({ force: true });
      await gift.finish(page, "en", false);
      await expect(page.getByText(gift.en.dear).last()).toBeVisible({ timeout: 30000 });
      await expect(page.getByRole("button", { name: /send .* a reaction/i })).toBeVisible({ timeout: 60000 });
      expect(errors).toEqual([]);
    });

    test("in Spanish, in the sender's own language all the way through", async ({ page }) => {
      const errors = watch(page);
      const first = await arrive(page, gift, "es");
      await first.click({ force: true });
      await gift.finish(page, "es", false);
      await expect(page.getByText(gift.es.dear).last()).toBeVisible({ timeout: 30000 });
      expect(errors).toEqual([]);
    });

    test("with motion turned down it still gets to the letter, with no flight to wait for", async ({ page }) => {
      const errors = watch(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const first = await arrive(page, gift, "en");
      await first.click({ force: true });
      await gift.finish(page, "en", true);
      await expect(page.getByText(gift.en.dear).last()).toBeVisible({ timeout: 30000 });
      expect(errors).toEqual([]);
    });
  });
}

test.describe("the editor", () => {
  for (const gift of GIFTS) {
    test(`${gift.slug}: opens with its own fields and a preview of the letter`, async ({ page }) => {
      const errors = watch(page);
      await page.goto(`/create/${gift.slug}`);
      // The preview is the finished gift, so what the sender types shows up in it as they type it.
      await page.locator("#recipientName").fill("Zed");
      // On a phone the preview is its own tab.
      const previewTab = page.getByRole("tab").nth(1);
      if (await previewTab.isVisible()) await previewTab.click();
      await expect(page.getByText(/dear zed|hola, zed/i).filter({ visible: true }).first()).toBeVisible({ timeout: 25000 });
      expect(errors).toEqual([]);
    });

    test(`${gift.slug}: its Classic cover tile draws the first screen at the tile's size, not at full size`, async ({ page }) => {
      await page.goto(`/create/${gift.slug}`);
      const tile = page.getByTestId("cover-classic").locator("[class*='container-type']").first();
      await tile.scrollIntoViewIfNeeded();
      await expect(tile).toBeVisible({ timeout: 25000 });
      // The tile is not a .gift-root, so a scene that sizes itself from --u has to bring its own. Without it
      // every calc() in the scene is invalid and its text falls back to the page's size, many times the tile's.
      const tooBig = await tile.evaluate((el) => {
        const height = el.getBoundingClientRect().height;
        return [...el.querySelectorAll("*")].filter((n) => n.childNodes.length && [...n.childNodes].some((c) => c.nodeType === 3 && c.textContent?.trim()) && parseFloat(getComputedStyle(n).fontSize) > height / 8).map((n) => `${n.textContent?.trim().slice(0, 24)} (${getComputedStyle(n).fontSize})`);
      });
      expect(tooBig, "text in the tile that is bigger than an eighth of its height").toEqual([]);
      expect(await tile.evaluate((el) => getComputedStyle(el.firstElementChild as Element).getPropertyValue("--u").trim())).not.toBe("");
    });
  }
});
