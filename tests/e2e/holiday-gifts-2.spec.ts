import { expect, test, type Page } from "@playwright/test";

/**
 * The second batch of holiday gifts (November 2026), played through the way a recipient plays them:
 * Frosted Window (wipe the frost off the glass), Light the Candles (carry a match from wick to
 * wick), String the Lights (hang the bulbs, throw the switch) and Gingerbread House (stick on the
 * sweets, open the door). Each in English, in Spanish and with motion turned down from the
 * keyboard, and once more with a finger. A gift must never throw, so every test listens for page
 * errors, and the editor's still opening must hold no button of its own.
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

/** Drags a finger across a box in sweeps, from `from` of its height down, `gap` apart. */
async function sweep(page: Page, box: { x: number; y: number; width: number; height: number }, passes: number, from: number, gap: number, x0 = 0.05, x1 = 0.95) {
  for (let pass = 0; pass < passes; pass++) {
    const y = box.y + box.height * (from + pass * gap);
    await page.mouse.move(box.x + box.width * x0, y);
    await page.mouse.down();
    for (let i = 0; i <= 20; i++) await page.mouse.move(box.x + box.width * (x0 + (x1 - x0) * (pass % 2 ? 1 - i / 20 : i / 20)), y + Math.sin(i / 2) * 6);
    await page.mouse.up();
  }
}

const middle = async (page: Page, selector: string) => {
  const box = (await page.locator(selector).first().boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/**
 * A note that is gone through a step at a time (the words in the candlelit room, the cards under
 * the lights, the gingerbread book) is stepped to its last; one that scrolls needs nothing.
 */
async function toTheEnd(page: Page) {
  const next = page.getByRole("button", { name: /^(next|siguiente)$/ });
  for (let i = 0; i < 30; i++) {
    if (!(await next.count()) || !(await next.isVisible()) || !(await next.isEnabled())) return;
    await next.click();
    await page.waitForTimeout(350);
  }
}

const GIFTS: Gift[] = [
  {
    slug: "frosted-window",
    first: { en: /wipe the frost away/i, es: /limpia la escarcha/i },
    dear: { en: /dear ava/i, es: /hola, ava/i },
    finish: async (page, lang) => {
      await page.getByRole("button", { name: lang === "es" ? /limpia la escarcha/i : /wipe the frost away/i }).press("Enter");
      await page.getByRole("button", { name: READ }).click({ timeout: 20000 });
      // the letter comes in an envelope, which has to be opened
      await page.getByRole("button", { name: lang === "es" ? /abre el sobre/i : /open the envelope/i }).click({ timeout: 15000 });
    },
  },
  {
    slug: "light-the-candles",
    first: { en: /strike a match/i, es: /enciende una cerilla/i },
    dear: { en: /dear june/i, es: /hola, june/i },
    finish: async (page) => {
      const read = page.getByRole("button", { name: READ });
      const table = page.getByRole("button", { name: /strike a match|light the candles|enciende una cerilla|enciende las velas/i });
      for (let i = 0; i < 8 && (await table.isVisible()); i++) {
        await table.press("Enter");
        await page.waitForTimeout(250);
      }
      await read.click({ timeout: 20000 });
    },
  },
  {
    slug: "string-the-lights",
    first: { en: /hang the lights/i, es: /cuelga las luces/i },
    dear: { en: /dear mia/i, es: /hola, mia/i },
    finish: async (page, lang) => {
      const roof = page.getByRole("button", { name: lang === "es" ? /cuelga las luces/i : /hang the lights/i });
      for (let i = 0; i < 10 && (await roof.isVisible()); i++) {
        await roof.press("Enter");
        await page.waitForTimeout(150);
      }
      await page.getByRole("button", { name: lang === "es" ? /dale al interruptor/i : /flip the switch/i }).click({ timeout: 10000 });
      await page.getByRole("button", { name: READ }).click({ timeout: 20000 });
    },
  },
  {
    slug: "gingerbread-house",
    first: { en: /decorate the house/i, es: /decora la casita/i },
    dear: { en: /dear lena/i, es: /hola, lena/i },
    finish: async (page, lang) => {
      const house = page.getByRole("button", { name: lang === "es" ? /decora la casita/i : /decorate the house/i });
      for (let i = 0; i < 3; i++) {
        await house.press("Enter");
        await page.waitForTimeout(200);
      }
      await page.getByRole("button", { name: lang === "es" ? /abre la puerta/i : /open the door/i }).click({ timeout: 10000 });
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
        if (lang === "en") {
          await toTheEnd(page);
          await expect(page.getByRole("button", { name: /send .* a reaction/i })).toBeVisible({ timeout: 60000 });
        }
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

  test("the frost goes only where the finger wipes: nothing melts by itself", async ({ page }) => {
    const errors = watch(page);
    const glass = await arrive(page, GIFTS[0], "en");
    const box = (await glass.boundingBox())!;
    // the foot of the glass, well away from the snowman's board: wiped, and nothing more happens
    await sweep(page, box, 2, 0.78, 0.1);
    await page.waitForTimeout(2500);
    await expect(page.getByRole("button", { name: READ })).toBeHidden();
    await expect(glass).toHaveCSS("opacity", "1");
    // over the board: now it reads, and the letter is offered, but the frost round it is still there
    await sweep(page, box, 4, 0.32, 0.06, 0.3, 0.85);
    await page.getByRole("button", { name: READ }).waitFor({ timeout: 10000 });
    await page.waitForTimeout(2000);
    await expect(glass).toHaveCSS("opacity", "1");
    expect(errors).toEqual([]);
  });

  test("a match carried to a wick lights that candle, and its line appears", async ({ page }) => {
    const errors = watch(page);
    const table = await arrive(page, GIFTS[1], "en");
    const box = (await table.boundingBox())!;
    const wick = await middle(page, "[data-wick='2']");
    // strike the match low on the table, then carry it up: the flame is held above the finger
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.75);
    await page.mouse.down();
    const k = box.width / 100;
    for (let i = 1; i <= 20; i++) await page.mouse.move(box.x + box.width * 0.6 + ((wick.x - box.x - box.width * 0.6) * i) / 20, box.y + box.height * 0.75 + ((wick.y + 9 * k - box.y - box.height * 0.75) * i) / 20);
    await page.mouse.up();
    await expect(page.getByText("the coffee you bring me before I ask")).toBeVisible({ timeout: 5000 });
    // a tap on another candle carries the match to it
    const other = await middle(page, "[data-wick='0']");
    await page.mouse.click(other.x, other.y + 4 * k);
    await expect(page.getByText("your hand finding mine in the cinema")).toBeVisible({ timeout: 5000 });
    expect(errors).toEqual([]);
  });

  test("bulbs go up where the finger runs along the roof, and the switch waits for the last one", async ({ page }) => {
    const errors = watch(page);
    await arrive(page, GIFTS[2], "en");
    await expect(page.locator("[data-hook]")).toHaveCount(46);
    const first = await middle(page, "[data-hook='0']");
    const tenth = await middle(page, "[data-hook='9']");
    await page.mouse.move(first.x, first.y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(first.x + ((tenth.x - first.x) * i) / 12, first.y + ((tenth.y - first.y) * i) / 12);
    await page.mouse.up();
    const left = await page.locator("[data-hook]").count();
    expect(left).toBeLessThan(40);
    expect(left).toBeGreaterThan(20);
    await expect(page.getByRole("button", { name: /flip the switch/i })).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("a sweet sticks where the house is tapped, icing follows the finger, and undo takes the last off", async ({ page }) => {
    const errors = watch(page);
    await arrive(page, GIFTS[3], "en");
    const wall = await middle(page, "[data-wall]");
    await page.mouse.click(wall.x, wall.y);
    await expect(page.locator("img[src*='gumdrop-red']").filter({ visible: true })).toHaveCount(2); // the one in the tray and the one on the house
    await page.getByRole("button", { name: "icing", exact: true }).click();
    await page.mouse.move(wall.x - 8, wall.y + 14);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(wall.x - 8 + i * 2, wall.y + 14);
    await page.mouse.up();
    await expect(page.locator("polyline")).toHaveCount(3);
    await page.getByRole("button", { name: "undo" }).click();
    await expect(page.locator("polyline")).toHaveCount(0);
    // a tap on the counter, off the house, sticks nothing
    await page.getByRole("button", { name: "peppermint" }).click();
    await page.mouse.click(wall.x - 120, wall.y + 60);
    await expect(page.locator("img[src*='peppermint']").filter({ visible: true })).toHaveCount(1);
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

test.describe("the note, each gift its own way", () => {
  test.setTimeout(120_000);

  test("Light the Candles: the letter is written into the room a part at a time, forward and back", async ({ page }) => {
    const errors = watch(page);
    await arrive(page, GIFTS[1], "en");
    await GIFTS[1].finish(page, "en");
    await expect(page.getByText(/dear june/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole("button", { name: "back", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "next", exact: true }).click();
    await expect(page.getByText(/dear june/i)).toBeHidden({ timeout: 5000 });
    await page.getByRole("button", { name: "back", exact: true }).click();
    await expect(page.getByText(/dear june/i)).toBeVisible({ timeout: 5000 });
    // the arrow keys do the same
    await page.keyboard.press("ArrowRight");
    await expect(page.getByText(/dear june/i)).toBeHidden({ timeout: 5000 });
    await toTheEnd(page);
    await expect(page.getByRole("button", { name: "next", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: /watch again/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("String the Lights: cards are turned by tapping them, and every photo has a card", async ({ page }) => {
    const errors = watch(page);
    await arrive(page, GIFTS[2], "en");
    await GIFTS[2].finish(page, "en");
    await expect(page.getByText(/dear mia/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText("1 / 9")).toBeVisible();
    // a tap on the right of the card goes on, on its left goes back
    const vp = page.viewportSize()!;
    await page.mouse.click(vp.width * 0.7, vp.height * 0.5);
    await expect(page.getByText("2 / 9")).toBeVisible({ timeout: 5000 });
    await page.mouse.click(vp.width * 0.16, vp.height * 0.5);
    await expect(page.getByText("1 / 9")).toBeVisible({ timeout: 5000 });
    await toTheEnd(page);
    await expect(page.getByText("9 / 9")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Gingerbread House: the book opens by itself and its pages turn", async ({ page }) => {
    const errors = watch(page);
    await arrive(page, GIFTS[3], "en");
    await GIFTS[3].finish(page, "en");
    await expect(page.getByText(/dear lena/i)).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: "next", exact: true }).click({ timeout: 10000 });
    await expect(page.getByText("2 / 9")).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText("1 / 9")).toBeVisible({ timeout: 5000 });
    await toTheEnd(page);
    await expect(page.getByRole("button", { name: /watch again/i })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Frosted Window: the envelope is opened, the letter unfolds, and the photos turn as a stack", async ({ page }) => {
    const errors = watch(page);
    await arrive(page, GIFTS[0], "en");
    await page.getByRole("button", { name: /wipe the frost away/i }).press("Enter");
    await page.getByRole("button", { name: READ }).click({ timeout: 20000 });
    await expect(page.getByText(/dear ava/i)).toBeHidden();
    await page.getByRole("button", { name: /open the envelope/i }).click({ timeout: 15000 });
    await expect(page.getByText(/dear ava/i)).toBeVisible({ timeout: 15000 });
    const stack = page.getByRole("button", { name: "next photo" });
    await stack.scrollIntoViewIfNeeded();
    await expect(page.getByText("1 / 4")).toBeVisible();
    await stack.click();
    await expect(page.getByText("2 / 4")).toBeVisible({ timeout: 5000 });
    for (let i = 0; i < 3; i++) {
      await stack.click();
      await page.waitForTimeout(700);
    }
    await expect(page.getByText("1 / 4")).toBeVisible({ timeout: 5000 });
    expect(errors).toEqual([]);
  });

  test("Watch again starts the gift over", async ({ page }) => {
    const errors = watch(page);
    await arrive(page, GIFTS[3], "en");
    await GIFTS[3].finish(page, "en");
    await toTheEnd(page);
    await page.getByRole("button", { name: /watch again/i }).click();
    await expect(page.getByRole("button", { name: /decorate the house/i })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("img[src*='gumdrop-red']").filter({ visible: true })).toHaveCount(1);
    expect(errors).toEqual([]);
  });
});
