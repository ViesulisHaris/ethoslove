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

/** The gift once its house is there to be tapped. */
async function ready(page: Page, root: Locator): Promise<Locator> {
  await expect(root).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/someone made this for you|alguien hizo esto para ti/i)).toBeHidden({ timeout: 60_000 });
  await expect(root.locator("[data-door]")).toHaveCount(24, { timeout: 30_000 });
  // the pictures the doors are cut from
  await expect.poll(() => root.locator("img").first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  return root;
}

/** Opens the gift and waits until its house is there to be tapped. */
async function openGift(page: Page, path: string): Promise<Locator> {
  await page.goto(path);
  return ready(page, page.locator(`[data-template="${SLUG}"]`).first());
}

/** One of the test cases (src/templates/_shared/e2e/edge-cases.ts), which the demo page reads only with its test switch on. */
async function openCase(page: Page, locale: "en" | "es", name: string): Promise<Locator> {
  await page.goto(`${locale === "en" ? "" : "/es"}/demo/${SLUG}?e2e=${name}`);
  return ready(page, page.locator(`[data-template="${SLUG}"][data-mode="live"]`));
}

const shut = (root: Locator) => root.locator("[data-door][data-shut]");
const door = (root: Locator, n: number) => root.locator(`[data-door="${n}"]`);
const niche = (root: Locator, n: number) => root.locator(`[data-niche="${n}"]`);
const card = (root: Locator) => root.locator("[data-note-card]");
const putBack = (root: Locator) => root.getByRole("button", { name: /put the note back|volver a guardar la nota/i });
const star = (root: Locator) => root.locator("[data-star]");
/** The line at the foot: what it counts, the line under it that says what can be done next, and what it says out of sight. */
const foot = (root: Locator) => root.locator("[data-foot-count]");
const hint = (root: Locator) => root.locator("[data-foot-hint]");
const said = (root: Locator) => root.locator("[data-foot] .sr-only");
/** The line under a note in hand. */
const under = (root: Locator) => root.getByRole("dialog").locator(":scope > p");
/** The gift's music button, in the corner over everything. */
const soundButton = (root: Locator) => root.getByRole("button", { name: /^(mute music|play music|silenciar música|reproducir música)$/i });
/**
 * Until a door has all but swung, a finger's tap on it is the second tap of a double tap and opens nothing more (it
 * took the note out before the door had opened, and the next tap put it back unseen). A test that taps a door it has
 * just opened, to read its note, waits this long first, as a hand does.
 */
const swung = (page: Page) => page.waitForTimeout(600);

/** Every door opened. The numbers of the doors that hold a note come back: the ones still there to be pressed. */
async function openEveryDoor(page: Page, root: Locator): Promise<number[]> {
  while (await shut(root).count()) {
    await shut(root).first().click();
    await page.waitForTimeout(60);
  }
  await expect(root.locator("[data-niche]")).toHaveCount(24);
  await swung(page);
  return root.locator("[data-door][data-note]").evaluateAll((els) => els.map((el) => Number(el.getAttribute("data-door"))));
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

const END = /watch again|ver otra vez|verlo otra vez|volver a ver/i;

/** The letter behind the star, read to its end. */
async function readTheLetter(page: Page, root: Locator) {
  await star(root).click();
  const scroller = root.locator("[data-scroller]");
  await expect(scroller).toBeVisible();
  const end = root.getByRole("button", { name: END });
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

/** A note's photo is printed whole: its box is the photo's own shape (up to a phone held upright, or twice as wide as tall), with nothing cut away. */
async function photoWhole(root: Locator) {
  for (const img of await card(root).locator("img[width][height]").all()) {
    const shape = await img.evaluate((el: HTMLImageElement) => ({ own: Number(el.getAttribute("width")) / Number(el.getAttribute("height")), drawn: el.getBoundingClientRect().width / el.getBoundingClientRect().height }));
    const kept = Math.min(2, Math.max(9 / 16, shape.own));
    expect(Math.abs(shape.drawn - kept), `a photo ${shape.own.toFixed(2)} wide for its height is drawn ${shape.drawn.toFixed(2)}`).toBeLessThan(0.03);
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

/** Every name on a tag is on its tag, and written at a size that reads. */
async function tagsRead(root: Locator, least: number) {
  for (const tag of await root.locator("[data-tag-name]").all()) {
    const host = (await tag.locator("xpath=ancestor::*[@data-niche][1]").boundingBox())!;
    const box = (await tag.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(host.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(host.x + host.width + 1);
    expect(box.y).toBeGreaterThanOrEqual(host.y - 1);
    expect(box.y + box.height).toBeLessThanOrEqual(host.y + host.height + 1);
    const size = await tag.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size, await tag.innerText()).toBeGreaterThanOrEqual(least);
    // a name written whole has no word wider than its line, and is on one line or two
    if ((await tag.getAttribute("data-whole")) !== null) {
      expect(await tag.evaluate((el) => el.scrollWidth <= el.clientWidth + 1), await tag.innerText()).toBe(true);
      // (lines counted from where the words are drawn: a name in a script the handwriting face has no letters for is drawn
      // in another face, whose line stands taller than the line-height says)
      const lines = await tag.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        let count = 0;
        let foot = -Infinity;
        for (const rect of [...range.getClientRects()].sort((a, b) => a.top - b.top)) {
          if (rect.top >= foot - rect.height * 0.5) count++;
          foot = Math.max(foot, rect.bottom);
        }
        return count;
      });
      expect(lines, await tag.innerText()).toBeLessThanOrEqual(2);
    }
  }
}

/** Nothing brings the room sideways inside its own box: asked to bring a far door to the left edge, it stays where it is. */
async function staysPut(page: Page) {
  const moved = await page.evaluate(() => {
    const room = document.querySelector("[data-advent-root]")!;
    document.querySelector('[data-door="23"]')!.scrollIntoView({ inline: "start", block: "nearest" });
    document.querySelector('[data-door="6"]')!.scrollIntoView({ inline: "end", block: "nearest" });
    return { left: room.scrollLeft, top: room.scrollTop };
  });
  expect(moved).toEqual({ left: 0, top: 0 });
}

for (const locale of ["en", "es"] as const) {
  const path = locale === "en" ? `/demo/${SLUG}` : `/es/demo/${SLUG}`;
  const en = locale === "en";

  test(`${locale}: opens on the house with every door shut, and nothing opens by itself`, async ({ page }) => {
    const w = watch(page);
    const root = await openGift(page, path);
    await expect(shut(root)).toHaveCount(24);
    await expect(star(root)).toBeVisible();
    await expect(root.getByRole("heading", { level: 1 })).toHaveText(en ? "Merry Christmas, Nora" : "Feliz Navidad, Nora");
    await expect(foot(root)).toHaveText(en ? "tap a door to open it" : "toca una puerta para abrirla");
    await expect(hint(root)).toHaveCount(0);
    await expect(root.getByText(en ? "for Nora · from Tom and 8 more" : "para Nora · de Tomás y 8 más")).toBeVisible();
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
      await expect(foot(root)).toHaveText(en ? `${found} of 8 notes found · ${24 - opened} doors left` : `${found} de 8 notas encontradas · quedan ${24 - opened} puertas`);
      // an envelope in sight and none opened yet: the line under the count says it can be, and nothing says so before there is one
      if (found) await expect(hint(root)).toHaveText(en ? "tap an envelope to read it" : "toca un sobre para leerlo");
      else await expect(hint(root)).toHaveCount(0);
    }
    expect(sweetDoor).toBeGreaterThan(0);
    expect(noteDoor).toBeGreaterThan(0);
    // A door with a sweet behind it is something to look at, no longer something to press: still a button, switched off,
    // named for what it holds, and a tap on it opens nothing.
    await expect(door(root, sweetDoor)).toHaveAttribute("aria-disabled", "true");
    await expect(door(root, sweetDoor)).toHaveAccessibleName(new RegExp(en ? `^Door ${sweetDoor}: an? ` : `^Puerta ${sweetDoor}: una? `));
    const sweetBox = (await door(root, sweetDoor).boundingBox())!;
    await page.mouse.click(sweetBox.x + sweetBox.width / 2, sweetBox.y + sweetBox.height / 2);
    await expect(shut(root)).toHaveCount(24 - opened);
    await expect(card(root)).toHaveCount(0);

    // The envelope: one person's note, on a card over the same house. The lowest door with a note is the first person's.
    await swung(page);
    await door(root, noteDoor).click();
    await expect(card(root)).toBeVisible();
    await expect(card(root).locator("blockquote")).toHaveText(
      en
        ? "I lit the candles on your cake anyway and Dad blew them out for you. Call me when you wake up, whatever time it is here."
        : "Encendí las velas de tu tarta de todas formas y las sopló papá por ti. Llámame cuando te despiertes, sea la hora que sea aquí.",
    );
    await expect(card(root).getByText(en ? "Mom" : "Mamá", { exact: true })).toBeVisible();
    await expect(card(root).getByText(en ? `door ${noteDoor}` : `puerta ${noteDoor}`)).toBeVisible();
    await expect(card(root).locator('img[src*="/demo/photos/p3"]')).toBeVisible();
    // under it: how many notes have been read, this one among them. Not how many envelopes are in sight.
    await expect(under(root)).toHaveText(en ? "1 of 8 notes read · tap to put it back" : "1 de 8 notas leídas · toca para guardarla");
    // the house is still there behind it, and out of reach
    await expect(root.locator("[inert]").first()).toBeAttached();
    await expect(niche(root, noteDoor).locator('img[src*="envelope"]')).toHaveCount(0);
    await settled(page, root);
    await photoWhole(root);
    // Put back, and at once a finger on the next shut door: the card on its way into its niche is not in the way of it.
    const nextShut = Number(await shut(root).first().getAttribute("data-door"));
    const nextBox = (await door(root, nextShut).boundingBox())!;
    await card(root).click();
    await page.mouse.click(nextBox.x + nextBox.width / 2, nextBox.y + nextBox.height / 2);
    await expect(niche(root, nextShut)).toHaveAttribute("data-holds", /.+/, { timeout: 2_000 });
    await expect(card(root)).toHaveCount(0);
    await expect(niche(root, noteDoor)).toHaveAttribute("data-holds", "tag");
    await expect(niche(root, noteDoor).locator("[data-tag-name]")).toHaveText(en ? "Mom" : "Mamá");
    await expect(door(root, noteDoor)).toHaveAccessibleName(en ? `Mom, door ${noteDoor}` : `Mamá, puerta ${noteDoor}`);
    await expect(root.locator("[data-star-lit]")).toHaveCount(0);
    // a note has been read: the line that said an envelope can be opened has done its work
    await expect(hint(root)).toHaveCount(0);

    // All of it. With every door open the line counts what has been read: "8 of 8 notes found" read as done.
    const notes = await openEveryDoor(page, root);
    expect(notes).toHaveLength(8);
    await expect(foot(root)).toHaveText(en ? "1 of 8 notes read" : "1 de 8 notas leídas");
    // every door is open and a note has been read: the line under the count says where the sender's own letter is
    await expect(hint(root)).toHaveText(en ? "tap the star for Tom’s letter" : "toca la estrella para leer la carta de Tomás");
    const signed: string[] = [];
    await readEveryNote(page, root, [...notes].sort((a, b) => a - b), async () => {
      signed.push((await card(root).locator("p[dir=auto]").innerText()).trim());
    });
    // whoever is first in the card has the lowest of the chosen doors, and so on up
    expect(signed).toEqual(en ? ["Mom", "Iris", "Dad", "The Okonkwos", "Sam", "Nana", "Leo", "Aunt Jo"] : ["Mamá", "Iris", "Papá", "Los Okonkwo", "Sam", "Abuela", "Leo", "Tía Jo"]);
    await expect(root.locator("[data-star-lit]")).toHaveCount(1);
    await expect(foot(root)).toHaveText(en ? "every note read · the star is lit" : "todas las notas leídas · la estrella brilla");
    // "the star is lit" never said it could be tapped, and everything of the sender's is behind it
    await expect(hint(root)).toHaveText(en ? "tap the star for Tom’s letter" : "toca la estrella para leer la carta de Tomás");
    // Names of one short word are written in one hand, at one size: "Papá" and "Mamá" two rows apart were 14.6 and 11.6 px.
    const sizes = await root.locator("[data-tag-name]").evaluateAll((els) =>
      els.filter((el) => !/\s/.test((el.textContent ?? "").trim()) && [...(el.textContent ?? "").trim()].length <= 6).map((el) => getComputedStyle(el).fontSize),
    );
    expect(sizes.length).toBeGreaterThanOrEqual(5);
    expect(new Set(sizes).size, sizes.join()).toBe(1);
    await staysPut(page);

    // the star window: the sender's own letter, then the end
    const end = await readTheLetter(page, root);
    await expect(root.getByText(en ? "a letter from Tom" : "una carta de Tomás")).toBeAttached();
    await expect(root.getByText(en ? "Dear Nora," : "Hola, Nora:")).toBeAttached();
    await expect(root.locator('[data-scroller] img[src*="/demo/photos/"]')).toHaveCount(3);
    // behind the letter the star's ring is at rest: it ran for ever under the page being scrolled
    expect(await root.locator("[data-star-lit] > span").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");

    // back to the doors: everything is as it was left
    await root.getByRole("button", { name: en ? "Back to the doors" : "Volver a las puertas" }).click();
    await expect(root.locator("[data-scroller]")).toHaveCount(0);
    await expect(root.locator('[data-holds="tag"]')).toHaveCount(8);
    await expect(star(root)).toBeFocused();
    expect(await root.locator("[data-star-lit] > span").evaluate((el) => getComputedStyle(el).animationName)).toBe("ac-ring");

    // and "watch again" shuts every door
    await star(root).click();
    await root.locator("[data-scroller]").evaluate((el) => el.scrollTo({ top: el.scrollHeight }));
    await end.click();
    await expect(shut(root)).toHaveCount(24);
    await expect(root.locator("[data-niche]")).toHaveCount(0);
    await expect(root.locator("[data-star-lit]")).toHaveCount(0);
    await expect(foot(root)).toHaveText(en ? "tap a door to open it" : "toca una puerta para abrirla");
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

test("by keyboard alone: a sweet's door keeps the focus, a note comes out and goes back, every door, the star's letter to its end", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "a keyboard belongs to the laptop");
  test.setTimeout(180_000);
  const w = watch(page);
  const root = await openGift(page, `/demo/${SLUG}`);
  const inHouse = () => page.evaluate(() => !!document.activeElement?.closest("[data-advent-root]") && document.activeElement !== document.body);
  const focusedDoor = () => page.evaluate(() => Number(document.activeElement?.getAttribute("data-door") ?? 0));

  // the star is first, then the doors from the top row down, left to right
  await star(root).focus();
  await expect(star(root)).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(door(root, 6)).toBeFocused();
  // the focus is drawn where a sighted keyboard user can see it
  expect(await door(root, 6).evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none");

  // Door 6 holds a sweet. Opened by keyboard, the door is still where the focus is (it used to be taken away, and the
  // focus dropped to the page), it says what it holds, and what was found is said once for whoever cannot see it.
  await page.keyboard.press("Enter");
  await expect(niche(root, 6)).toHaveAttribute("data-holds", "bauble");
  await expect(door(root, 6)).toBeFocused();
  expect(await inHouse()).toBe(true);
  await expect(door(root, 6)).toHaveAttribute("aria-disabled", "true");
  await expect(door(root, 6)).toHaveAccessibleName("Door 6: a glass bauble");
  await expect(said(root)).toHaveText("Door 6: a glass bauble.");
  await expect(root.getByRole("status")).toContainText("0 of 8 notes found · 23 doors left");
  // pressed again it opens nothing and goes nowhere
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  await expect(shut(root)).toHaveCount(23);
  await expect(card(root)).toHaveCount(0);
  await expect(door(root, 6)).toBeFocused();

  // door 19 holds a note
  await page.keyboard.press("Tab");
  await expect(door(root, 19)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(niche(root, 19)).toHaveAttribute("data-holds", "envelope");
  await expect(door(root, 19)).toBeFocused();
  await expect(door(root, 19)).toHaveAccessibleName("Read the note behind door 19");
  await expect(said(root)).toHaveText("Door 19: a note.");
  await expect(hint(root)).toHaveText("tap an envelope to read it");
  await page.keyboard.press("Enter");
  await expect(card(root)).toBeVisible();
  await expect(putBack(root)).toBeFocused();
  // Focused from a key, the veil (the button that puts the note back) is ringed: Tab went between it and the sound button,
  // and on every other press nothing on the screen looked focused (N1-1).
  expect(await putBack(root).evaluate((el) => el.matches(":focus-visible") && /inset/.test(getComputedStyle(el).boxShadow) && /3px/.test(getComputedStyle(el).boxShadow))).toBe(true);
  await page.keyboard.press("Enter");
  await expect(card(root)).toHaveCount(0);
  await expect(door(root, 19)).toBeFocused();
  // again, and out with Escape
  await page.keyboard.press("Space");
  await expect(card(root)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card(root)).toHaveCount(0);
  await expect(door(root, 19)).toBeFocused();

  // With a note out, the Tab key goes round what is in front of the room and never out of the gift: it used to go from
  // the sound button to the page, where Escape was no longer heard and the room behind was inert.
  await page.keyboard.press("Enter");
  await expect(putBack(root)).toBeFocused();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    expect(await inHouse(), `Tab ${i + 1} with a note out`).toBe(true);
  }
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await inHouse(), `Shift+Tab ${i + 1} with a note out`).toBe(true);
  }
  // and Escape is heard with the focus lost to the page
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Escape");
  await expect(card(root)).toHaveCount(0);
  await expect(door(root, 19)).toBeFocused();

  // The rest of the house by Tab, Enter and nothing else: every door opened, every note read and put back.
  for (let i = 0; i < 22; i++) {
    await page.keyboard.press("Tab");
    const n = await focusedDoor();
    expect(n, `the ${i + 3}rd stop of the Tab key is a door`).toBeGreaterThan(0);
    await page.keyboard.press("Enter");
    await expect(niche(root, n)).toHaveAttribute("data-holds", /.+/);
    await expect(door(root, n)).toBeFocused();
    if ((await niche(root, n).getAttribute("data-holds")) !== "envelope") continue;
    await page.keyboard.press("Enter");
    await expect(card(root)).toBeVisible();
    await expect(putBack(root)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(card(root)).toHaveCount(0);
    await expect(door(root, n)).toBeFocused();
  }
  await expect(shut(root)).toHaveCount(0);
  await expect(root.locator('[data-holds="tag"]')).toHaveCount(8);
  await expect(root.locator("[data-star-lit]")).toHaveCount(1);
  await expect(foot(root)).toHaveText("every note read · the star is lit");
  await expect(hint(root)).toHaveText("tap the star for Tom’s letter");

  // back up the house to the star, and into the letter
  for (let i = 0; i < 24; i++) await page.keyboard.press("Shift+Tab");
  await expect(star(root)).toBeFocused();
  await page.keyboard.press("Enter");
  const scroller = root.locator("[data-scroller]");
  await expect(scroller).toBeVisible();
  await expect(root.getByRole("button", { name: "Back to the doors" })).toBeFocused();

  // On through the letter by Tab. A print opens large, and Escape closes the print and nothing else: it used to close the
  // whole letter and lose the reader's place.
  const onPrint = () => page.evaluate(() => !!document.activeElement?.closest("[data-scroller] figure"));
  for (let i = 0; i < 20 && !(await onPrint()); i++) await page.keyboard.press("Tab");
  expect(await onPrint()).toBe(true);
  await page.waitForTimeout(900);
  const place = await scroller.evaluate((el) => el.scrollTop);
  expect(place).toBeGreaterThan(40);
  await page.keyboard.press("Enter");
  await expect(root.locator("[data-lightbox]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(root.locator("[data-lightbox]")).toHaveCount(0);
  await expect(scroller).toBeVisible();
  expect(Math.abs((await scroller.evaluate((el) => el.scrollTop)) - place)).toBeLessThan(3);
  expect(await onPrint()).toBe(true);

  // to the end of it
  const end = root.getByRole("button", { name: END });
  const onEnd = () => page.evaluate((source) => new RegExp(source, "i").test(document.activeElement?.textContent ?? ""), END.source);
  for (let i = 0; i < 30 && !(await onEnd()); i++) await page.keyboard.press("Tab");
  await expect(end).toBeFocused();
  await expect(end).toBeInViewport();
  // past the end the Tab key goes round the letter, and never out of the gift
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    expect(await inHouse(), `Tab ${i + 1} past the letter's end`).toBe(true);
  }
  // lost to the page, Escape still leaves the letter
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("Escape");
  await expect(scroller).toHaveCount(0);
  await expect(star(root)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(scroller).toBeVisible();

  // and Escape, with no print open, is the way back to the doors
  await page.keyboard.press("Escape");
  await expect(scroller).toHaveCount(0);
  await expect(star(root)).toBeFocused();
  expect(w.problems).toEqual([]);
});

test("with a mouse: an open door with an envelope answers the pointer over it and the press on it", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "a pointer that hovers belongs to the laptop");
  const root = await openGift(page, `/demo/${SLUG}`);
  await door(root, 19).click();
  await expect(niche(root, 19)).toHaveAttribute("data-holds", "envelope");
  await swung(page);
  const glow = () => door(root, 19).evaluate((el) => getComputedStyle(el).backgroundImage);
  await page.mouse.move(5, 300);
  expect(await glow()).toBe("none");
  await door(root, 19).hover();
  const over = await glow();
  expect(over).toContain("radial-gradient");
  await page.mouse.down();
  const pressed = await glow();
  expect(pressed).toContain("radial-gradient");
  expect(pressed).not.toBe(over);
  await page.mouse.up();
  await expect(card(root)).toBeVisible();
  await page.keyboard.press("Escape");
  // a sweet's door, open, answers neither: there is nothing behind it to press for
  await door(root, 6).click();
  await expect(niche(root, 6)).toHaveAttribute("data-holds", "bauble");
  await page.mouse.move(5, 300);
  const sweet = (await door(root, 6).boundingBox())!;
  await page.mouse.move(sweet.x + sweet.width / 2, sweet.y + sweet.height / 2);
  expect(await door(root, 6).evaluate((el) => getComputedStyle(el).backgroundImage)).toBe("none");
  expect(await door(root, 6).evaluate((el) => getComputedStyle(el).cursor)).toBe("default");
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
    const starBox = (await star(root).boundingBox())!;
    if (size.name === "360x640" || size.name === "390x844") {
      expect(first.width).toBeGreaterThanOrEqual(44);
      expect(first.height).toBeGreaterThanOrEqual(44);
    }
    // the star window is 44 px to a finger on every one of them
    expect(Math.min(starBox.width, starBox.height)).toBeGreaterThanOrEqual(44);
    // And every door, on every one of them. A phone on its side, under the demo's own bar, has six rows and a gable in
    // 342 px: the whole house made a door 46 by 36 there, then 48.7 by 38.3. The house is drawn large enough for 44, and
    // the snow on its ridge and the wood under it are what the screen leaves out (C5).
    for (const box of await root.locator("[data-door]").evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ w: r.width, h: r.height })))) {
      expect(box.w).toBeGreaterThanOrEqual(44);
      expect(box.h).toBeGreaterThanOrEqual(44);
    }
    expect(first.height).toBeGreaterThanOrEqual(44);
    // the title and the line at the foot are on the screen, and nothing scrolls sideways
    await inside(page, root.getByRole("heading", { level: 1 }));
    await inside(page, foot(root));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await staysPut(page);

    // the first envelope found: both lines at the foot are whole on the screen
    await door(root, 19).click();
    await expect(hint(root)).toBeVisible();
    const lines = (await root.locator("[data-foot]").boundingBox())!;
    expect(lines.y + lines.height, "the foot's two lines end on the screen").toBeLessThanOrEqual(view.y + view.height + 0.5);
    await inside(page, hint(root));

    // a note with a photo, and the longest one: the card is on the screen, side to side, and can be put back
    const notes = await openEveryDoor(page, root);
    for (const n of [notes[0], notes[notes.length - 1], notes[3]]) {
      await door(root, n).click();
      await settled(page, root);
      const box = await inside(page, card(root), 12);
      // taller than the screen only where the screen is very low, and then it scrolls
      if (size.height >= 560) expect(box.height).toBeLessThanOrEqual(view.height + 2);
      await onTheCard(root, box);
      await photoWhole(root);
      await page.keyboard.press("Escape");
      await expect(card(root)).toHaveCount(0);
    }
    // the tag's name stays on its tag
    await tagsRead(root, 8.5);
    await readEveryNote(page, root, notes.filter((n) => ![notes[0], notes[notes.length - 1], notes[3]].includes(n)));
    // Every name of the demo, read on its tag: on a phone 390 wide none is under 10 px ("Auntie Jo" was 9.4, the longest 7.4).
    await expect(root.locator("[data-tag-name]")).toHaveCount(8);
    await tagsRead(root, size.name === "390x844" || size.name === "1280x720" ? 10 : 8.2);
    // And every one of them whole, no word broken, on every screen: each is measured and written as large as leaves it so.
    // (On a phone on its side "The Okonkwos" was cut to "The Okon…"; the house is drawn larger there now, and a name whole
    // only a hair under 8.5 px is written whole at 8.)
    await expect(root.locator("[data-tag-name][data-whole]")).toHaveCount(8);
    await readTheLetter(page, root);
    expect(w.problems).toEqual([]);
    await context.close();
  });
}

/**
 * Low screens with little room beside the house: a laptop at 200% (1280 by 800 is 640 by 400) and small phones on their
 * side. The byline was one line cut to "FOR NORA · FROM…" and the title two lines cut to "Merry Christmas…": the name and
 * the count of who else signed were gone.
 */
for (const view of [
  { width: 640, height: 400 },
  { width: 667, height: 375 },
  { width: 740, height: 360 },
] as const) {
  test(`${view.width}x${view.height}: the title and the byline beside the house are whole, the count of who signed with them too`, async ({ browser }, info) => {
    test.skip(info.project.name !== "desktop-chrome", "the sizes are set here, not by the project");
    test.setTimeout(120_000);
    const context = await browser.newContext({ viewport: view, storageState: STORAGE });
    const page = await context.newPage();
    const w = watch(page);
    for (const [path, more] of [
      [`/demo/${SLUG}`, "and 8 more"],
      // (before the Spanish page: once it has been seen the demo stays in Spanish)
      ...(E2E ? ([[`/demo/${SLUG}?e2e=notes-24-long`, "and 24 more"]] as const) : []),
      [`/es/demo/${SLUG}`, "y 8 más"],
    ] as const) {
      await page.goto(path);
      const root = await ready(page, page.locator(`[data-template="${SLUG}"]`).first());
      const view_ = (await root.boundingBox())!;
      const title = root.getByRole("heading", { level: 1 });
      const byline = title.locator("xpath=preceding-sibling::p[1]");
      // nothing cut: no line clamped away, nothing run past its column
      for (const el of [title, byline]) {
        // (a line clamp hides whole lines: the element unclamped is as tall as it is clamped, give or take a descender)
        const cut = await el.evaluate((node) => {
          const el = node as HTMLElement;
          const clamped = el.getBoundingClientRect().height;
          const was = el.style.cssText;
          el.style.setProperty("-webkit-line-clamp", "unset");
          el.style.setProperty("display", "block");
          el.style.setProperty("overflow", "visible");
          const whole = el.getBoundingClientRect().height;
          el.style.cssText = was;
          return whole > clamped + 2 || el.scrollWidth > el.clientWidth + 1;
        });
        expect(cut, `${path}: ${await el.textContent()}`).toBe(false);
        await inside(page, el);
      }
      const count = byline.locator("span.whitespace-nowrap");
      await expect(count).toHaveText(more);
      const countBox = (await count.boundingBox())!;
      const bylineBox = (await byline.boundingBox())!;
      expect(countBox.x + countBox.width).toBeLessThanOrEqual(bylineBox.x + bylineBox.width + 1);
      // the words stay clear of the house: they end left of its first door
      const doorsLeft = Math.min(...(await root.locator("[data-door]").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().left))));
      expect((await title.boundingBox())!.x + (await title.boundingBox())!.width).toBeLessThanOrEqual(doorsLeft);
      // and the whole house is still on the screen
      for (const target of [...(await root.locator("[data-door]").all()), star(root)]) {
        const box = (await target.boundingBox())!;
        expect(box.x + box.width).toBeLessThanOrEqual(view_.x + view_.width + 1);
      }
      // Every door 44 px to a finger and whole on the screen, and 44 px of the star's tap area on it: the house is drawn
      // that large, and on a screen this low the ridge over the star and the wood under the doors are left out (C5).
      for (const box of await root.locator("[data-door]").evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ y: r.top, w: r.width, h: r.height })))) {
        expect(Math.min(box.w, box.h), `${path}: a door`).toBeGreaterThanOrEqual(44);
        expect(box.y).toBeGreaterThanOrEqual(view_.y - 1);
        expect(box.y + box.h).toBeLessThanOrEqual(view_.y + view_.height + 1);
      }
      const starBox = (await star(root).boundingBox())!;
      expect(Math.min(starBox.y + starBox.height, view_.y + view_.height) - Math.max(starBox.y, view_.y), `${path}: the star`).toBeGreaterThanOrEqual(44);
    }
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
  await expect(hint(root)).toBeVisible();
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
  // (under the demo page's own bar an iPhone 13 fits the house to its height: a hair under the 10 px it has without the bar)
  await tagsRead(root, 9.5);
  await staysPut(page);
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
  // The cover picker's own tile draws the house too, in the look that was chosen, every door shut, with nothing to
  // press in it: the tile itself is the thing to press.
  const classic = page.getByTestId("cover-classic");
  await classic.scrollIntoViewIfNeeded();
  const tile = classic.locator("[data-advent-tile]");
  await expect(tile).toBeVisible({ timeout: 30_000 });
  await expect(tile.locator('img[src*="plate-midnight-closed"]').first()).toBeAttached();
  await expect.poll(() => tile.locator('img[src*="plate-midnight-closed"]').first().evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(tile.locator("button, [data-door], [data-star], [data-niche]")).toHaveCount(0);
  // On a tile a thumb wide it is the house and the title. The small lines are left out: they have a smallest size, and at
  // it the byline was cut short and "tap a door to open it" ran off the tile's foot.
  await expect(tile.locator("[data-foot]")).toHaveCount(0);
  await expect(tile.getByRole("heading", { level: 1 })).toBeAttached();
  const shown = (await tile.boundingBox())!;
  for (const text of await tile.locator("h1, p").all()) {
    const box = (await text.boundingBox())!;
    expect(box.y + box.height, "words in the tile end inside it").toBeLessThanOrEqual(shown.y + shown.height + 0.5);
    expect(box.x).toBeGreaterThanOrEqual(shown.x - 0.5);
    expect(box.x + box.width).toBeLessThanOrEqual(shown.x + shown.width + 0.5);
    expect(await text.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  }
  await expect(tile.locator('[role="img"][aria-label*="advent house of twenty-four numbered doors" i]')).toBeVisible();
  const frame = (await classic.boundingBox())!;
  const drawn = (await tile.boundingBox())!;
  expect(drawn.width).toBeGreaterThan(40);
  expect(drawn.x).toBeGreaterThanOrEqual(frame.x - 1);
  expect(drawn.x + drawn.width).toBeLessThanOrEqual(frame.x + frame.width + 1);
  expect(w.problems).toEqual([]);
});

test("with group cards on, the editor talks to a group: the letter and the surprise under it say nothing of a couple, in both languages", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop-chrome", "the editor's words are the same on every screen");
  test.setTimeout(120_000);
  const couple = {
    en: /only the two of you|Plan a date|trips for two|A surprise inside|Add your date plan|Date night/,
    es: /solo vosotros dos|planea una cita|Planear una cita|viajes en pareja|Una sorpresa dentro|plan de cita|Noche de cita/i,
  };
  for (const locale of ["en", "es"] as const) {
    await page.goto(`${locale === "en" ? "" : "/es"}/create/${SLUG}?group=on`);
    await expect(page.getByTestId("group-section")).toBeVisible({ timeout: 60_000 });
    const surprise = page.getByTestId("unwrap-section");
    await expect(surprise).toContainText(locale === "en" ? "A present from all of you" : "Un regalo de parte de todos");
    await expect(surprise).toContainText(locale === "en" ? "Open the map" : "Abrir el mapa");
    await expect(surprise).not.toContainText(couple[locale]);
    await expect(page.getByPlaceholder(locale === "en" ? /why you asked everyone to write/ : /por qué pediste a todos/)).toBeVisible();
    await expect(page.getByPlaceholder(couple[locale])).toHaveCount(0);
  }
  // Every other template's editor keeps its own words with the switch on: it is not a group card. (Last in Spanish: the
  // site keeps the language a visitor last chose.)
  await page.goto(`/es/create/the-letter?group=on`);
  await expect(page.getByTestId("unwrap-section")).toContainText("Una sorpresa dentro", { timeout: 60_000 });
  await expect(page.getByTestId("unwrap-section")).toContainText("Planear una cita");
});

/* ------------------------------------------------------------------------------------------------
 * Three, eight and twenty-four notes; the longest note and name; with photos and without; each look.
 * ---------------------------------------------------------------------------------------------- */

/** A case played to its end: every door, every note read (every fourth measured at rest), the star, the letter. */
async function playCase(page: Page, root: Locator, count: number, least = 8.2) {
  const notes = await openEveryDoor(page, root);
  expect(notes).toHaveLength(count);
  // every note is read; every fourth is measured at rest, which is enough to meet each kind (a long one, an Arabic one, one with a tall photo)
  let read = 0;
  await readEveryNote(page, root, notes, async () => {
    if (read++ % 4) return;
    await settled(page, root);
    await onTheCard(root, await inside(page, card(root), 12));
    await photoWhole(root);
    await clearOfSound(root);
  });
  await expect(root.locator("[data-star-lit]")).toHaveCount(1);
  await expect(root.locator('[data-holds="tag"]')).toHaveCount(count);
  await tagsRead(root, least);
  await readTheLetter(page, root);
  expect(await root.innerText()).not.toMatch(/\bundefined\b|\bNaN\b|\[object Object\]/);
}

/** A note's card, from the top of its scroll, never starts under the music button in the corner (a card taller than 320 by 568 did). */
async function clearOfSound(root: Locator) {
  const button = soundButton(root);
  if (!(await button.count())) return;
  const scroll = card(root).locator("xpath=ancestor::*[contains(@class,'overflow-y-auto')][1]");
  await scroll.evaluate((el) => el.scrollTo({ top: 0 }));
  const b = (await button.boundingBox())!;
  const c = (await card(root).boundingBox())!;
  // only where the card is under it from side to side (on a phone on its side it is not); the card leans a degree or two
  if (c.x + c.width > b.x && c.x < b.x + b.width) expect(c.y, "the card's top is under the music button").toBeGreaterThanOrEqual(b.y + b.height - 3);
}

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
      const root = await openCase(page, locale, c.name);
      await playCase(page, root, c.notes);
      // the end is told once its screen is in sight, a moment after the scroll that brought it there
      const told = (type: string) => page.evaluate((t) => ((window as unknown as { __giftEvents?: { type: string }[] }).__giftEvents ?? []).some((e) => e.type === t), type);
      expect(await told("started")).toBe(true);
      await expect.poll(() => told("ended"), { timeout: 10_000 }).toBe(true);
      expect(w.problems).toEqual([]);
    });
  }
}

/*
 * Twenty-four notes at their limits where there is least room for them: the smallest phone and a phone on its
 * side in Chromium with less motion, and Spanish in the pale look in WebKit as an iPhone 13 has it. The sizes,
 * WebKit and less motion were only ever tried on the demo's eight.
 */
for (const size of [SIZES[0], SIZES[3]]) {
  test(`${size.name}, twenty-four notes at their limits, with less motion: plays to its end`, async ({ browser }, info) => {
    test.skip(!E2E, "needs the demo page's test switch: run with NEXT_PUBLIC_E2E=1");
    test.skip(info.project.name !== "mobile-chrome", "the size is set here, not by the project");
    test.setTimeout(300_000);
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 2, hasTouch: true, reducedMotion: "reduce", storageState: STORAGE, baseURL: BASE });
    const page = await context.newPage();
    const w = watch(page);
    const root = await openCase(page, "en", "notes-24-long");
    await playCase(page, root, 24);
    expect(w.problems).toEqual([]);
    await context.close();
  });
}

test("in WebKit as an iPhone 13 has it, in Spanish and the pale look: twenty-four notes at their limits play to the end", async ({}, info) => {
  test.skip(!E2E, "needs the demo page's test switch: run with NEXT_PUBLIC_E2E=1");
  test.skip(info.project.name !== "mobile-chrome", "WebKit is started here, once");
  test.setTimeout(360_000);
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
  const root = await openCase(page, "es", "notes-24-long-look-1");
  await expect(root.locator('img[src*="plate-nordic-closed"]').first()).toBeAttached();
  await playCase(page, root, 24, 9.5);
  expect(w.problems).toEqual([]);
  await browser.close();
});

/*
 * What the hands-on test found that only a browser can show: the free gift's badge over the foot's lines, a finger
 * tapping fast through the house, and the star's line.
 */

for (const view of [
  // the gift's own size is the viewport less the demo page's bar (48 px): 505, 553 (an iPhone SE in Safari), 560, 664 (an iPhone 13 in Safari)
  { width: 375, height: 553 },
  { width: 375, height: 601 },
  { width: 360, height: 608 },
  { width: 390, height: 712 },
]) {
  test(`${view.width}x${view.height}, a free gift: the "Made with Ethos" badge never lies over the line at the foot`, async ({ browser }, info) => {
    test.skip(!E2E, "needs the demo page's test switch: run with NEXT_PUBLIC_E2E=1");
    test.skip(info.project.name !== "mobile-chrome", "the size is set here, not by the project");
    test.setTimeout(120_000);
    const context = await browser.newContext({ viewport: view, deviceScaleFactor: 2, hasTouch: true, storageState: STORAGE, baseURL: BASE });
    const page = await context.newPage();
    const w = watch(page);
    const root = await openCase(page, "en", "watermarked");
    const badge = page.getByRole("link", { name: /made with ethos/i });
    await expect(badge).toBeVisible({ timeout: 10_000 });
    const lowest = async () => Math.max(...(await root.locator("[data-door]").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().bottom))));
    const check = async (state: string) => {
      await expect(badge).toBeVisible({ timeout: 10_000 });
      const b = (await badge.boundingBox())!;
      const lines = (await root.locator("[data-foot]").boundingBox())!;
      expect(lines.y + lines.height, `${state}: the foot's lines end over the badge`).toBeLessThanOrEqual(b.y + 0.5);
      for (const line of await root.locator("[data-foot-count], [data-foot-hint]").all()) {
        const box = (await line.boundingBox())!;
        expect(box.y + box.height, `${state}: "${await line.innerText()}" ends over the badge`).toBeLessThanOrEqual(b.y + 0.5);
        // under the house's lowest row (a door's tap area takes in half the frame below its paint, which the line may touch)
        expect(box.y, `${state}: "${await line.innerText()}" starts under the doors`).toBeGreaterThanOrEqual((await lowest()) - 3);
      }
      // and the title over the roof is still on the screen
      expect((await root.getByRole("heading", { level: 1 }).boundingBox())!.y).toBeGreaterThanOrEqual((await root.boundingBox())!.y);
    };
    await check("shut");
    // the first envelope found: both lines
    await door(root, 19).click();
    await expect(hint(root)).toBeVisible();
    await check("an envelope in sight");
    expect(w.problems).toEqual([]);
    await context.close();
  });
}

/**
 * Taps made by the page itself, at the moments a hand makes them: a click whose `detail` counts the taps, as a finger's
 * does. (Playwright's own taps, on a test machine busy with other work, landed seconds apart: a double tap was two taps.)
 * A target that is only now coming (the veil round a note's card) is waited for, a frame at a time.
 */
const taps = (page: Page, steps: { target: string; after?: number; detail: number }[]) =>
  page.evaluate(async (plan) => {
    for (const step of plan) {
      if (step.after) await new Promise((done) => setTimeout(done, step.after));
      let el = document.querySelector(step.target);
      for (let i = 0; !el && i < 120; i++) {
        await new Promise((done) => requestAnimationFrame(done));
        el = document.querySelector(step.target);
      }
      el?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, detail: step.detail }));
    }
  }, steps);
const VEIL = "[data-advent-root] [role=dialog] > button";

test("a finger tapping fast: a double tap opens a door and nothing more, and no note is put back before it was seen", async ({ browser }, info) => {
  test.skip(info.project.name !== "mobile-chrome", "a touch screen is set up here");
  test.setTimeout(120_000);
  const context = await browser.newContext({ ...devices["Pixel 7"], storageState: STORAGE, baseURL: BASE });
  const page = await context.newPage();
  const w = watch(page);
  const root = await openGift(page, `/demo/${SLUG}`);
  // Door 3 holds a note in the English demo. Two taps 140 ms apart: the door opens, and its note stays in its niche.
  await expect(door(root, 3)).toHaveAttribute("data-shut", "");
  await taps(page, [
    { target: '[data-door="3"]', detail: 1 },
    { target: '[data-door="3"]', after: 140, detail: 2 },
  ]);
  await expect(niche(root, 3)).toHaveAttribute("data-holds", "envelope");
  await page.waitForTimeout(400);
  await expect(card(root)).toHaveCount(0);
  // the next tap, a real finger's, is for the next door, and opens it
  const box = (await door(root, 19).boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await expect(niche(root, 19)).toHaveAttribute("data-holds", "envelope");
  await expect(niche(root, 3)).toHaveAttribute("data-holds", "envelope");
  await expect(card(root)).toHaveCount(0);

  // Once door 3 has swung, its envelope is a tap away. A tap on the veil the moment the card is out (meant for something
  // else) leaves it out; one after it has arrived puts it back, read.
  await swung(page);
  await taps(page, [
    { target: '[data-door="3"]', detail: 1 },
    { target: VEIL, detail: 1 },
  ]);
  await page.waitForTimeout(150);
  await expect(card(root)).toBeVisible();
  await settled(page, root);
  const view = page.viewportSize()!;
  await page.touchscreen.tap(view.width / 2, view.height - 70);
  await expect(card(root)).toHaveCount(0);
  await expect(niche(root, 3)).toHaveAttribute("data-holds", "tag");

  // Two taps on every shut door, as fast as a hand goes: every door opens, and not one note is taken out or put back.
  for (const n of await shut(root).evaluateAll((els) => els.map((el) => Number(el.getAttribute("data-door"))))) {
    await taps(page, [
      { target: `[data-door="${n}"]`, detail: 1 },
      { target: `[data-door="${n}"]`, after: 120, detail: 2 },
    ]);
    await page.waitForTimeout(110);
  }
  await expect(shut(root)).toHaveCount(0);
  await expect(card(root)).toHaveCount(0);
  await expect(root.locator('[data-holds="tag"]')).toHaveCount(1);
  await expect(root.locator("[data-star-lit]")).toHaveCount(0);
  await expect(foot(root)).toHaveText("1 of 8 notes read");
  expect(w.problems).toEqual([]);
  await context.close();
});
