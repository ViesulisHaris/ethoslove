import { devices, expect, test, webkit, type Browser, type Locator, type Page } from "@playwright/test";

/**
 * The Advent Calendar, the first group card (docs/GROUP.md), played as whoever gets it plays it:
 * a finger on a door, a note out of its niche and back, the star window's letter, the end. In both
 * languages, on a small phone, a phone on its side and a laptop, by keyboard alone, with less
 * motion, and in WebKit as an iPhone has it.
 *
 * The template is held back until group cards are on sale (src/templates/held.ts) and is found by
 * its slug under `next dev` only, so against a production build (CI) there is nothing to open and
 * the whole file is skipped.
 *
 *   PORT=3432 npx playwright test tests/e2e/advent-calendar.spec.ts --workers=1
 *
 * The cases with three, eight and twenty-four notes, the longest note and name, with and without
 * photos, need the demo page's test switch as the template sweep does: the same command with
 * NEXT_PUBLIC_E2E=1 in front. Without it they say so and skip.
 */
test.skip(!!process.env.CI, "held back: found by its slug under `next dev` only");

const SLUG = "advent-calendar";
const E2E = process.env.NEXT_PUBLIC_E2E === "1";
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${process.env.PORT ?? "3000"}`;
const STORAGE = { cookies: [], origins: [{ origin: new URL(BASE).origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] };

type Watch = { problems: string[] };
function watch(page: Page): Watch {
  const w: Watch = { problems: [] };
  page.on("pageerror", (e) => w.problems.push(`page error: ${e.message.slice(0, 200)}`));
  page.on("console", (m) => {
    if (m.type() === "error" && /template crashed|Maximum update depth|hydrat|Rendered (more|fewer) hooks/i.test(m.text())) w.problems.push(`console: ${m.text().slice(0, 200)}`);
  });
  return w;
}

/** Opens the gift and waits until its house is there to be tapped. */
async function openGift(page: Page, path: string): Promise<Locator> {
  await page.goto(path);
  const root = page.locator(`[data-template="${SLUG}"]`).first();
  await expect(root).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/someone made this for you|alguien hizo esto para ti/i)).toBeHidden({ timeout: 60_000 });
  await expect(root.locator("[data-door]")).toHaveCount(24, { timeout: 30_000 });
  // the pictures the doors are cut from
  await expect.poll(() => root.locator("img").first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  return root;
}

const shut = (root: Locator) => root.locator("[data-door][data-shut]");
const door = (root: Locator, n: number) => root.locator(`[data-door="${n}"]`);
const niche = (root: Locator, n: number) => root.locator(`[data-niche="${n}"]`);
const card = (root: Locator) => root.locator("[data-note-card]");
const putBack = (root: Locator) => root.getByRole("button", { name: /put the note back|volver a guardar la nota/i });
const star = (root: Locator) => root.locator("[data-star]");
const foot = (root: Locator) => root.getByRole("status").first();

/** The numbers of the doors that hold a note: the ones that are still buttons once every door is open. */
async function openEveryDoor(page: Page, root: Locator): Promise<number[]> {
  while (await shut(root).count()) {
    await shut(root).first().click();
    await page.waitForTimeout(60);
  }
  await expect(root.locator("[data-niche]")).toHaveCount(24);
  return root.locator("[data-door]").evaluateAll((els) => els.map((el) => Number(el.getAttribute("data-door"))));
}

async function readEveryNote(page: Page, root: Locator, notes: number[], each?: (n: number) => Promise<void>) {
  for (const n of notes) {
    await door(root, n).click();
    await expect(card(root)).toBeVisible();
    if (each) await each(n);
    await page.keyboard.press("Escape");
    await expect(card(root)).toHaveCount(0);
    await expect(niche(root, n)).toHaveAttribute("data-holds", "tag");
  }
}

/** The letter behind the star, read to its end. */
async function readTheLetter(page: Page, root: Locator) {
  await star(root).click();
  const scroller = root.locator("[data-scroller]");
  await expect(scroller).toBeVisible();
  const end = root.getByRole("button", { name: /watch again|ver otra vez|verlo otra vez|volver a ver/i });
  for (let i = 0; i < 80 && !(await end.isVisible().catch(() => false)); i++) {
    await scroller.evaluate((el) => el.scrollBy({ top: el.clientHeight * 0.8 }));
    await page.waitForTimeout(120);
  }
  await scroller.evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
  await expect(end).toBeVisible({ timeout: 15_000 });
  return end;
}

/** The note's card once it has come to rest: it is lifted out of its niche on a spring. */
async function settled(page: Page, root: Locator) {
  await expect(card(root)).toBeVisible();
  let last = "";
  await expect
    .poll(
      async () => {
        const box = await card(root).boundingBox();
        const now = box ? [box.x, box.y, box.width, box.height].map((n) => n.toFixed(1)).join() : "";
        const still = now !== "" && now === last;
        last = now;
        return still;
      },
      { intervals: [150], timeout: 8_000 },
    )
    .toBe(true);
}

/** A name and a note stay on their card: the card is tilted a degree or two, so a few pixels are its corners'. */
async function onTheCard(root: Locator, box: { x: number; width: number }) {
  for (const el of [card(root).locator("blockquote"), card(root).locator("p[dir=auto]")]) {
    const inner = (await el.boundingBox())!;
    expect(inner.x, "left of the words").toBeGreaterThanOrEqual(box.x - 2);
    expect(inner.x + inner.width, "right of the words").toBeLessThanOrEqual(box.x + box.width + 2);
    // a word longer than the line is broken, not left to run off the card
    expect(await el.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  }
}

const inside = async (page: Page, target: Locator, margin = 1) => {
  const box = await target.boundingBox();
  const view = page.viewportSize()!;
  expect(box, "has a box").not.toBeNull();
  expect(box!.x, "left edge").toBeGreaterThanOrEqual(-margin);
  expect(box!.x + box!.width, "right edge").toBeLessThanOrEqual(view.width + margin);
  return box!;
};

for (const locale of ["en", "es"] as const) {
  const path = locale === "en" ? `/demo/${SLUG}` : `/es/demo/${SLUG}`;

  test(`${locale}: opens on the house with every door shut, and nothing opens by itself`, async ({ page }) => {
    const w = watch(page);
    const root = await openGift(page, path);
    await expect(shut(root)).toHaveCount(24);
    await expect(star(root)).toBeVisible();
    await expect(root.getByRole("heading", { level: 1 })).toHaveText(locale === "en" ? "Merry Christmas, Nora" : "Feliz Navidad, Nora");
    await expect(foot(root)).toHaveText(locale === "en" ? "tap a door to open it" : "toca una puerta para abrirla");
    await expect(root.getByText(locale === "en" ? "for Nora · from Tom and 8 more" : "para Nora · de Tomás y 8 más")).toBeVisible();
    await page.waitForTimeout(3500);
    await expect(shut(root)).toHaveCount(24);
    await expect(root.locator("[data-niche]")).toHaveCount(0);
    await expect(root.locator("[data-star-lit]")).toHaveCount(0);
    // every door has its number in its name, 1 to 24, each once
    const names = await root.locator("[data-door]").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? ""));
    expect(names.map((name) => Number(/\d+/.exec(name)?.[0])).sort((a, b) => a - b)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(w.problems).toEqual([]);
  });

  test(`${locale}: plays to its end: every door, every note, the star, the letter, and back again`, async ({ page }) => {
    test.setTimeout(180_000);
    const w = watch(page);
    const root = await openGift(page, path);

    // a tap on the wall opens nothing, and the line at the foot is still there
    const box = (await root.boundingBox())!;
    await page.mouse.click(box.x + 6, box.y + box.height * 0.3);
    await expect(shut(root)).toHaveCount(24);
    await expect(foot(root)).toBeVisible();

    // Doors by their numbers, until one has held a sweet and one a note: which is which is the gift's own
    // (it is worked out from the two names, and the sender is Tom in one language and Tomás in the other).
    let sweetDoor = 0;
    let noteDoor = 0;
    let opened = 0;
    let found = 0;
    for (let n = 1; n <= 24 && !(sweetDoor && noteDoor); n++) {
      await door(root, n).click();
      opened++;
      await expect(niche(root, n)).toHaveAttribute("data-holds", /.+/);
      const holds = await niche(root, n).getAttribute("data-holds");
      if (holds === "envelope") {
        found++;
        noteDoor ||= n;
      } else sweetDoor ||= n;
      await expect(shut(root)).toHaveCount(24 - opened);
      await expect(foot(root)).toHaveText(locale === "en" ? `${found} of 8 notes found · ${24 - opened} doors left` : `${found} de 8 notas encontradas · quedan ${24 - opened} puertas`);
    }
    expect(sweetDoor).toBeGreaterThan(0);
    expect(noteDoor).toBeGreaterThan(0);
    // a door with a sweet behind it is something to look at, no longer something to press
    await expect(door(root, sweetDoor)).toHaveCount(0);
    await expect(root.getByRole("img", { name: new RegExp(locale === "en" ? `^Door ${sweetDoor}: an? ` : `^Puerta ${sweetDoor}: una? `) })).toBeVisible();

    // The envelope: one person's note, on a card over the same house. The lowest door with a note is the first person's.
    await door(root, noteDoor).click();
    await expect(card(root)).toBeVisible();
    await expect(card(root).locator("blockquote")).toHaveText(
      locale === "en"
        ? "I lit the candles on your cake anyway and Dad blew them out for you. Ring me when you wake up, whatever time it is here."
        : "Encendí las velas de tu tarta igualmente y las sopló papá por ti. Llámame cuando te despiertes, sea la hora que sea aquí.",
    );
    await expect(card(root).getByText(locale === "en" ? "Mum" : "Mamá", { exact: true })).toBeVisible();
    await expect(card(root).getByText(locale === "en" ? `door ${noteDoor}` : `puerta ${noteDoor}`)).toBeVisible();
    await expect(card(root).locator('img[src*="/demo/photos/p3"]')).toBeVisible();
    // the house is still there behind it, and out of reach
    await expect(root.locator("[inert]").first()).toBeAttached();
    await expect(niche(root, noteDoor).locator('img[src*="envelope"]')).toHaveCount(0);
    await settled(page, root);
    await card(root).click();
    await expect(card(root)).toHaveCount(0);
    await expect(niche(root, noteDoor)).toHaveAttribute("data-holds", "tag");
    await expect(niche(root, noteDoor).locator("[data-tag-name]")).toHaveText(locale === "en" ? "Mum" : "Mamá");
    await expect(door(root, noteDoor)).toHaveAccessibleName(locale === "en" ? `Mum, door ${noteDoor}` : `Mamá, puerta ${noteDoor}`);
    await expect(root.locator("[data-star-lit]")).toHaveCount(0);

    // all of it
    const notes = await openEveryDoor(page, root);
    expect(notes).toHaveLength(8);
    await expect(foot(root)).toHaveText(locale === "en" ? "8 of 8 notes found" : "8 de 8 notas encontradas");
    const signed: string[] = [];
    await readEveryNote(page, root, [...notes].sort((a, b) => a - b), async () => {
      signed.push((await card(root).locator("p[dir=auto]").innerText()).trim());
    });
    // whoever is first in the card has the lowest of the chosen doors, and so on up
    expect(signed).toEqual(locale === "en" ? ["Mum", "Iris", "Dad", "The whole Okonkwo family", "Sam", "Gran", "Leo", "Auntie Jo"] : ["Mamá", "Iris", "Papá", "Los Okonkwo, al completo", "Sam", "La abuela", "Leo", "La tía Jo"]);
    await expect(root.locator("[data-star-lit]")).toHaveCount(1);
    await expect(foot(root)).toHaveText(locale === "en" ? "every note read · the star is lit" : "todas las notas leídas · la estrella está encendida");

    // the star window: the sender's own letter, then the end
    const end = await readTheLetter(page, root);
    await expect(root.getByText(locale === "en" ? "a letter from Tom" : "una carta de Tomás")).toBeAttached();
    await expect(root.getByText(locale === "en" ? "Dear Nora," : "Hola, Nora:")).toBeAttached();
    await expect(root.locator('[data-scroller] img[src*="/demo/photos/"]')).toHaveCount(3);

    // back to the doors: everything is as it was left
    await root.getByRole("button", { name: locale === "en" ? "Back to the doors" : "Volver a las puertas" }).click();
    await expect(root.locator("[data-scroller]")).toHaveCount(0);
    await expect(root.locator('[data-holds="tag"]')).toHaveCount(8);
    await expect(star(root)).toBeFocused();

    // and "watch again" shuts every door
    await star(root).click();
    await root.locator("[data-scroller]").evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await end.click();
    await expect(shut(root)).toHaveCount(24);
    await expect(root.locator("[data-niche]")).toHaveCount(0);
    await expect(root.locator("[data-star-lit]")).toHaveCount(0);
    expect(w.problems).toEqual([]);
  });
}

test("other people's words are kept as the contract says: plain, in their own direction, no form, no link out", async ({ page }) => {
  const root = await openGift(page, `/demo/${SLUG}`);
  const notes = await openEveryDoor(page, root);
  await readEveryNote(page, root, notes, async () => {
    const words = card(root).locator("blockquote");
    const name = card(root).locator("p[dir=auto]");
    await expect(words).toHaveAttribute("dir", "auto");
    expect(await words.evaluate((el) => el.children.length)).toBe(0);
    expect(await name.evaluate((el) => el.children.length)).toBe(0);
    for (const el of [words, name]) expect(await el.evaluate((node) => getComputedStyle(node).overflowWrap)).toBe("anywhere");
    await expect(card(root).locator("a, form, input, textarea, select")).toHaveCount(0);
    // a photo, where there is one, has its box before it has come
    for (const img of await card(root).locator('img[src*="/demo/photos/"]').all()) {
      expect(Number(await img.getAttribute("width"))).toBeGreaterThan(0);
      expect(Number(await img.getAttribute("height"))).toBeGreaterThan(0);
    }
  });
  // nothing in the house itself is a link or a form either
  await expect(root.locator("[data-advent-root] > div").first().locator("a, form, input, textarea")).toHaveCount(0);
  for (const tag of await root.locator("[data-tag-name]").all()) await expect(tag).toHaveAttribute("dir", "auto");
});

test("by keyboard alone: a door, its note, back to the door, the star and out again", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "a keyboard belongs to the laptop");
  const root = await openGift(page, `/demo/${SLUG}`);
  // the star is first, then the doors from the top row down, left to right
  await star(root).focus();
  await expect(star(root)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(door(root, 6)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(door(root, 19)).toBeFocused();
  // the focus is drawn where a sighted keyboard user can see it
  expect(await door(root, 19).evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(niche(root, 19)).toHaveAttribute("data-holds", "envelope");
  await expect(door(root, 19)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(card(root)).toBeVisible();
  await expect(putBack(root)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(card(root)).toHaveCount(0);
  await expect(door(root, 19)).toBeFocused();
  // again, and out with Escape
  await page.keyboard.press("Space");
  await expect(card(root)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card(root)).toHaveCount(0);
  await expect(door(root, 19)).toBeFocused();
  // the star, by keyboard, and back
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(star(root)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(root.locator("[data-scroller]")).toBeVisible();
  await expect(root.getByRole("button", { name: "Back to the doors" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(root.locator("[data-scroller]")).toHaveCount(0);
  await expect(star(root)).toBeFocused();
});

test("with less motion nothing swings, and it still plays to its end", async ({ browser }, info) => {
  test.skip(info.project.name !== "mobile-chrome", "one browser is enough for this");
  test.setTimeout(120_000);
  const context = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce", storageState: STORAGE });
  const page = await context.newPage();
  const w = watch(page);
  const root = await openGift(page, `/demo/${SLUG}`);
  await door(root, 13).click();
  await expect(niche(root, 13)).toHaveAttribute("data-holds", "starcookie");
  await expect(root.locator(".ac-leaf")).toHaveCount(0);
  const notes = await openEveryDoor(page, root);
  await readEveryNote(page, root, notes);
  await expect(root.locator("[data-star-lit]")).toHaveCount(1);
  await readTheLetter(page, root);
  expect(w.problems).toEqual([]);
  await context.close();
});

const SIZES = [
  { name: "320x568", width: 320, height: 568 },
  { name: "360x640", width: 360, height: 640 },
  { name: "390x844", width: 390, height: 844 },
  { name: "844x390", width: 844, height: 390 },
  { name: "1280x720", width: 1280, height: 720 },
] as const;

for (const size of SIZES) {
  test(`${size.name}: the whole house is on the screen, a door is big enough to tap, and a note fits`, async ({ browser }, info) => {
    test.skip(info.project.name !== "mobile-chrome", "the sizes are set here, not by the project");
    test.setTimeout(120_000);
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 2, hasTouch: size.width < 900, storageState: STORAGE });
    const page = await context.newPage();
    const w = watch(page);
    const root = await openGift(page, `/demo/${SLUG}`);
    const view = (await root.boundingBox())!;

    // every door and the star, whole, inside the gift
    for (const target of [...(await root.locator("[data-door]").all()), star(root)]) {
      const box = (await target.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(view.x - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(view.x + view.width + 1);
      expect(box.y).toBeGreaterThanOrEqual(view.y - 1);
      expect(box.y + box.height).toBeLessThanOrEqual(view.y + view.height + 1);
    }
    const first = (await door(root, 6).boundingBox())!;
    if (size.name === "360x640" || size.name === "390x844") {
      expect(first.width).toBeGreaterThanOrEqual(44);
      expect(first.height).toBeGreaterThanOrEqual(44);
    }
    // on any of them a door is never smaller than a fingertip can find
    expect(Math.min(first.width, first.height)).toBeGreaterThanOrEqual(32);
    // the title and the line at the foot are on the screen, and nothing scrolls sideways
    await inside(page, root.getByRole("heading", { level: 1 }));
    await inside(page, foot(root));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

    // a note with a photo, and the longest one: the card is on the screen, side to side, and can be put back
    const notes = await openEveryDoor(page, root);
    for (const n of [notes[0], notes[notes.length - 1], notes[3]]) {
      await door(root, n).click();
      await settled(page, root);
      const box = await inside(page, card(root), 12);
      // taller than the screen only where the screen is very low, and then it scrolls
      if (size.height >= 560) expect(box.height).toBeLessThanOrEqual(view.height + 2);
      await onTheCard(root, box);
      await page.keyboard.press("Escape");
      await expect(card(root)).toHaveCount(0);
    }
    // the tag's name stays on its tag
    for (const tag of await root.locator("[data-tag-name]").all()) {
      const host = (await tag.locator("xpath=ancestor::*[@data-niche][1]").boundingBox())!;
      const box = (await tag.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(host.x - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(host.x + host.width + 1);
    }
    await readEveryNote(page, root, notes.filter((n) => ![notes[0], notes[notes.length - 1], notes[3]].includes(n)));
    await readTheLetter(page, root);
    expect(w.problems).toEqual([]);
    await context.close();
  });
}

test("in WebKit as an iPhone 13 has it: doors, a note, the letter, the end", async ({}, info) => {
  test.skip(info.project.name !== "mobile-chrome", "WebKit is started here, once");
  test.setTimeout(240_000);
  let browser: Browser | null = null;
  try {
    browser = await webkit.launch();
  } catch (e) {
    test.skip(true, `WebKit is not installed here: ${(e as Error).message.split("\n")[0]}`);
    return;
  }
  const context = await browser.newContext({ ...devices["iPhone 13"], storageState: STORAGE, baseURL: BASE });
  const page = await context.newPage();
  const w = watch(page);
  const root = await openGift(page, `/demo/${SLUG}`);
  await door(root, 19).tap();
  await expect(niche(root, 19)).toHaveAttribute("data-holds", "envelope");
  // the leaf that swung is gone once it has swung: Safari would go on showing a turned one
  await expect(root.locator(".ac-leaf")).toHaveCount(0, { timeout: 5_000 });
  await door(root, 19).tap();
  await expect(card(root)).toBeVisible();
  await card(root).tap();
  await expect(card(root)).toHaveCount(0);
  await expect(niche(root, 19)).toHaveAttribute("data-holds", "tag");
  const notes = await openEveryDoor(page, root);
  await readEveryNote(page, root, notes.filter((n) => n !== 19));
  await expect(root.locator("[data-star-lit]")).toHaveCount(1);
  await readTheLetter(page, root);
  expect(w.problems).toEqual([]);
  await browser.close();
});

test("the editor shows the house with two or three doors already open, and nothing to press in it", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "the editor's phone preview is beside the form on a wide screen");
  test.setTimeout(120_000);
  const w = watch(page);
  await page.goto(`/create/${SLUG}`);
  const still = page.locator(`[data-template="${SLUG}"][data-mode="preview"]`).first();
  await expect(still).toBeVisible({ timeout: 60_000 });
  await expect(still.locator("[data-niche]")).toHaveCount(2, { timeout: 30_000 });
  await expect(still.locator("button")).toHaveCount(0);
  await expect(still.locator("audio, video")).toHaveCount(0);
  // the look can be changed, and the picture follows
  await expect(still.locator('img[src*="plate-evergreen-closed"]').first()).toBeAttached();
  await page.getByRole("radio", { name: /midnight blue/i }).click();
  await expect(still.locator('img[src*="plate-midnight-closed"]').first()).toBeAttached();
  // the cover picker's own tile draws the house too, with nothing to press in it
  expect(w.problems).toEqual([]);
});

/* ------------------------------------------------------------------------------------------------
 * Three, eight and twenty-four notes; the longest note and name; with photos and without; each look.
 * ---------------------------------------------------------------------------------------------- */

const CASES = [
  { name: "notes-3", notes: 3 },
  { name: "notes-8-long-look-1", notes: 8 },
  { name: "notes-24-long", notes: 24 },
  { name: "notes-24-plain-look-2", notes: 24 },
  { name: "notes-8-plain", notes: 8 },
  { name: "min", notes: 3 },
  { name: "max", notes: 24 },
] as const;

for (const locale of ["en", "es"] as const) {
  for (const c of CASES) {
    test(`${locale} ${c.name}: plays to its end, and every name and note stays on its card`, async ({ page }, info) => {
      test.skip(!E2E, "needs the demo page's test switch: run with NEXT_PUBLIC_E2E=1");
      test.skip(info.project.name !== "mobile-chrome" && locale === "es", "Spanish once, on the phone");
      test.setTimeout(240_000);
      const w = watch(page);
      await page.goto(`${locale === "en" ? "" : "/es"}/demo/${SLUG}?e2e=${c.name}`);
      const root = page.locator(`[data-template="${SLUG}"][data-mode="live"]`);
      await expect(root).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText(/someone made this for you|alguien hizo esto para ti/i)).toBeHidden({ timeout: 60_000 });
      await expect(root.locator("[data-door]")).toHaveCount(24, { timeout: 30_000 });
      const notes = await openEveryDoor(page, root);
      expect(notes).toHaveLength(c.notes);
      // every note is read; every fourth is measured at rest, which is enough to meet each kind (a long one, an Arabic one, one with a tall photo)
      let read = 0;
      await readEveryNote(page, root, notes, async () => {
        if (read++ % 4) return;
        await settled(page, root);
        await onTheCard(root, await inside(page, card(root), 12));
      });
      await expect(root.locator("[data-star-lit]")).toHaveCount(1);
      await expect(root.locator('[data-holds="tag"]')).toHaveCount(c.notes);
      await readTheLetter(page, root);
      // the end is told once its screen is in sight, a moment after the scroll that brought it there
      const told = (type: string) => page.evaluate((t) => ((window as unknown as { __giftEvents?: { type: string }[] }).__giftEvents ?? []).some((e) => e.type === t), type);
      expect(await told("started")).toBe(true);
      await expect.poll(() => told("ended"), { timeout: 10_000 }).toBe(true);
      expect(await root.innerText()).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]/);
      expect(w.problems).toEqual([]);
    });
  }
}
