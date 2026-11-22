import { expect, test, type Page } from "@playwright/test";
import { christmasPicks, finderPicks } from "../../src/content/finder";
import { ANY, occasionsFor, occasionsInSeason, rankGifts, reasonKey, type FinderAnswers } from "../../src/lib/gift/finder";
import { getManifest } from "../../src/templates/manifests";

/**
 * The gift finder end to end (/gifts/finder): two questions answered by tapping a picture, three
 * picks with a line each, a feeling that re-ranks them, a link that can be sent, Back through the
 * questions, the demo, and the editor it ends in. Both projects run it, so every flow is walked on
 * a phone and on a desktop. What the page looks like is tests/e2e/gift-finder-design.spec.ts.
 *
 * The picks are worked out here by the finder's own scoring (lib/gift/finder.ts, unit-tested), and
 * the second question's order by the day, as the page does: Christmas leads it from 15 Nov to 25 Dec.
 */
const EN = finderPicks("en");
const top = (answers: FinderAnswers, n = 3) => rankGifts(EN, answers).slice(0, n);
const topNames = (answers: FinderAnswers, n = 3) => top(answers, n).map((pick) => pick.name);
const TODAY = new Date().toISOString().slice(0, 10);

const picks = (page: Page) => page.locator("#finder-row > li");
const names = (page: Page) => picks(page).locator("h3").allTextContents();
const question = (page: Page, text: string) => page.getByRole("heading", { level: 2, name: text });
const answer = (page: Page, name: string) => page.locator("[data-answer]").filter({ hasText: new RegExp(`^${name}$`) });
const search = (page: Page) => new URL(page.url()).search;
const words = (text: string) => text.trim().split(/\s+/).length;

const OCCASION_NAMES: Record<string, string> = {
  birthday: "Birthday",
  anniversary: "Anniversary",
  valentines: "Valentine's Day",
  christmas: "Christmas",
  "long-distance": "Long distance",
  apology: "Saying sorry",
  "just-because": "No occasion",
  wedding: "Wedding",
  graduation: "Graduation",
  halloween: "Halloween",
  thanksgiving: "Thanksgiving",
  "mothers-day": "Mother's Day",
  "fathers-day": "Father's Day",
};

test.describe("the gift finder", () => {
  test("two taps end on three ranked gifts, and the answers are the address", async ({ page }) => {
    await page.goto("/gifts/finder");
    await expect(page.getByRole("heading", { level: 1, name: "Which digital gift should you send?" })).toBeVisible();
    await expect(page.getByText("1 of 2", { exact: true })).toBeVisible();
    await expect(question(page, "Who is it for?")).toBeVisible();

    await answer(page, "My mom").click();
    await expect(question(page, "What's the occasion?")).toBeVisible();
    await expect(page.getByText("2 of 2", { exact: true })).toBeVisible();
    expect(search(page)).toBe("?for=mom");
    // The next question has the focus, for a keyboard and a screen reader.
    await expect(question(page, "What's the occasion?")).toBeFocused();

    await answer(page, "Birthday").click();
    // The second tap is the last: no third question, straight to the picks.
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    await expect(question(page, "Three gifts that fit")).toBeFocused();
    expect(search(page)).toBe("?for=mom&occasion=birthday");
    await expect(page.getByText(/feel like/i)).toHaveCount(0);
    await expect(picks(page)).toHaveCount(3);
    const answers: FinderAnswers = { for: "mom", occasion: "birthday", feel: null };
    expect(await names(page)).toEqual(topNames(answers));

    // Each pick: its picture (the way into the demo), its name, Free or the price, one line of at most fourteen words, and the editor.
    const best = top(answers)[0];
    const first = picks(page).first();
    await expect(first.getByRole("button", { name: `Watch it: ${best.name}` })).toBeVisible();
    await expect(first.locator("h3 + p")).toHaveText(best.free ? "Free" : /^[$€£]\d+[.,]\d\d$/);
    const line = await first.locator("[data-why]").innerText();
    expect(line).toBe(best.line[reasonKey(best.why, answers)]);
    expect(words(line)).toBeLessThanOrEqual(14);
    await expect(first.getByRole("link", { name: "Make this gift" })).toHaveAttribute("href", `/create/${best.slug}?ref=finder`);
    for (const each of await picks(page).locator("[data-why]").allInnerTexts()) expect(words(each), each).toBeLessThanOrEqual(14);

    // One address for search engines, whatever the answers.
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/gifts\/finder$/);

    // The two answers are over the picks, each a button that asks its question again.
    await expect(page.getByRole("button", { name: "For my mom Change: Who is it for?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Birthday Change: What's the occasion?" })).toBeVisible();
  });

  test("every answer is a card with a picture that loaded and its words, and no two cards of a question show the same gift", async ({ page }) => {
    // Seven people and "Not sure" on the first question: "Someone else" is not a card (the owner, 22 Nov 2026).
    for (const [path, count] of [["/gifts/finder", 8], ["/gifts/finder?for=girlfriend", 7], ["/es/gifts/finder?for=dad", 7]] as const) {
      await page.goto(path);
      const cards = page.locator("[data-answer]");
      await expect(cards, path).toHaveCount(count);
      await expect.poll(() => cards.locator("img").evaluateAll((imgs) => imgs.every((img) => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)), { message: `${path}: a picture did not load` }).toBe(true);
      const shown = await cards.evaluateAll((els) =>
        els.map((el) => ({ words: (el.textContent ?? "").trim(), picture: new URL(el.querySelector("img")!.currentSrc).searchParams.get("url") ?? el.querySelector("img")!.currentSrc, button: el.tagName, height: el.getBoundingClientRect().height })),
      );
      for (const card of shown) {
        expect(card.words.length, path).toBeGreaterThan(2);
        expect(card.picture, path).toMatch(/\/templates\/[a-z0-9-]+\/poster\.jpg/);
        // The whole card is the button, and a thumb can hit it.
        expect(card.button, path).toBe("BUTTON");
        expect(card.height, path).toBeGreaterThanOrEqual(44);
      }
      expect(new Set(shown.map((card) => card.picture)).size, path).toBe(count);
      // "Not sure" is an answer like the others: the last card, with a picture of its own.
      expect(shown.at(-1)!.words, path).toBe(path.startsWith("/es") ? "No lo sé" : "Not sure");
    }
  });

  test("Back, a reload and a pasted address each land on the same state", async ({ page, context }) => {
    await page.goto("/gifts/finder");
    await answer(page, "My girlfriend").click();
    await expect(question(page, "What's the occasion?")).toBeVisible();
    // A reload on the second question is still the second question.
    await page.reload();
    await expect(question(page, "What's the occasion?")).toBeVisible();
    await expect(question(page, "Who is it for?")).toHaveCount(0);
    await answer(page, "Anniversary").click();
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    const result = await names(page);
    expect(result).toEqual(topNames({ for: "girlfriend", occasion: "anniversary", feel: null }));

    await page.reload();
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    expect(await names(page)).toEqual(result);

    // Back steps back one question at a time, and forward again.
    await page.goBack();
    await expect(question(page, "What's the occasion?")).toBeVisible();
    expect(search(page)).toBe("?for=girlfriend");
    await page.goBack();
    await expect(question(page, "Who is it for?")).toBeVisible();
    expect(search(page)).toBe("");
    await page.goForward();
    await page.goForward();
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    expect(await names(page)).toEqual(result);

    // The address pasted into another tab is the same picks.
    const pasted = await context.newPage();
    await pasted.goto(page.url());
    await expect(question(pasted, "Three gifts that fit")).toBeVisible();
    expect(await names(pasted)).toEqual(result);
    await pasted.close();
  });

  test("a feeling is never asked: its pill over the picks re-ranks them in place, and one in the address is honoured", async ({ page }) => {
    await page.goto("/gifts/finder?for=girlfriend&occasion=anniversary&feel=funny");
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    const pill = (name: string) => page.getByRole("group", { name: "Order them by feeling" }).getByRole("button", { name, exact: true });
    await expect(pill("Funny")).toHaveAttribute("aria-pressed", "true");
    for (const other of ["Romantic", "Sentimental", "Unusual"]) await expect(pill(other)).toHaveAttribute("aria-pressed", "false");
    expect(await names(page)).toEqual(topNames({ for: "girlfriend", occasion: "anniversary", feel: "funny" }));

    await pill("Romantic").click();
    await expect(pill("Romantic")).toHaveAttribute("aria-pressed", "true");
    await expect(pill("Funny")).toHaveAttribute("aria-pressed", "false");
    expect(search(page)).toBe("?for=girlfriend&occasion=anniversary&feel=romantic");
    expect(await names(page)).toEqual(topNames({ for: "girlfriend", occasion: "anniversary", feel: "romantic" }));
    // Still the picks: nothing was asked, and the heading did not move away.
    await expect(question(page, "Three gifts that fit")).toBeVisible();

    // Tapped again it is off, and the picks are the two answers' own.
    await pill("Romantic").click();
    await expect(pill("Romantic")).toHaveAttribute("aria-pressed", "false");
    expect(search(page)).toBe("?for=girlfriend&occasion=anniversary");
    expect(await names(page)).toEqual(topNames({ for: "girlfriend", occasion: "anniversary", feel: null }));
  });

  test("the first version's three-question links still open their result", async ({ page }) => {
    await page.goto("/gifts/finder?for=best-friend&occasion=birthday&feel=funny");
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    expect(await names(page)).toEqual(topNames({ for: "best-friend", occasion: "birthday", feel: "funny" }));
    expect(await names(page)).toContain("Party Animals");
    await expect(page.getByRole("button", { name: "Funny", exact: true })).toHaveAttribute("aria-pressed", "true");

    // "Not sure" was an answer to the third question: the same picks, with no pill on.
    await page.goto("/gifts/finder?for=dad&occasion=christmas&feel=any");
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    expect(await names(page)).toEqual(topNames({ for: "dad", occasion: "christmas", feel: ANY }));
    await expect(page.locator('[data-feel][aria-pressed="true"]')).toHaveCount(0);

    // And the address as people say it, with "who".
    await page.goto("/gifts/finder?who=mom&occasion=birthday&feel=sentimental");
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    expect(await names(page)).toEqual(topNames({ for: "mom", occasion: "birthday", feel: "sentimental" }));
    await expect(page.getByRole("button", { name: "For my mom Change: Who is it for?" })).toBeVisible();
  });

  test("an answer can be changed where it is shown, with the current one marked", async ({ page }) => {
    await page.goto("/gifts/finder?for=girlfriend&occasion=anniversary");
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    const before = await names(page);
    await page.getByRole("button", { name: "For my girlfriend Change: Who is it for?" }).click();
    await expect(question(page, "Who is it for?")).toBeFocused();
    // Both answers stay in the address, and the question says so.
    expect(search(page)).toBe("?for=girlfriend&occasion=anniversary&ask=for");
    await expect(page.locator('[data-answer][aria-current="true"]')).toHaveText("My girlfriend");
    await answer(page, "My dad").click();
    // The occasion was kept: straight back to picks, and different ones.
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    expect(search(page)).toBe("?for=dad&occasion=anniversary");
    expect(await names(page)).toEqual(topNames({ for: "dad", occasion: "anniversary", feel: null }));
    expect(await names(page)).not.toEqual(before);

    // Back: the question that was asked again, then the picks it was asked from.
    await page.goBack();
    await expect(question(page, "Who is it for?")).toBeVisible();
    await page.goBack();
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    expect(await names(page)).toEqual(before);

    // The occasion the same way. One that waits behind "More occasions" is shown, and marked, when it is the answer.
    await page.getByRole("button", { name: "Anniversary Change: What's the occasion?" }).click();
    await expect(question(page, "What's the occasion?")).toBeFocused();
    await expect(page.locator('[data-answer][aria-current="true"]')).toHaveText("Anniversary");
    await page.goto("/gifts/finder?for=girlfriend&occasion=wedding&ask=occasion");
    await expect(page.locator('[data-answer][aria-current="true"]')).toHaveText("Wedding");
    await expect(page.getByRole("button", { name: "More occasions" })).toHaveAttribute("aria-expanded", "true");
  });

  test("a result link opens on the picks in someone else's browser, with no flash of the first question", async ({ page, browser, baseURL }) => {
    await page.goto("/gifts/finder?for=best-friend&occasion=birthday");
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    const mine = await names(page);

    const origin = new URL(baseURL ?? "http://localhost:3000").origin;
    const friend = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    const theirs = await friend.newPage();
    const errors: string[] = [];
    theirs.on("console", (message) => (message.type() === "error" ? errors.push(message.text()) : undefined));
    theirs.on("pageerror", (error) => errors.push(String(error)));
    // What is painted before the page's scripts run: the tool is held back, so the first question is never seen.
    await theirs.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const held = document.querySelector("[data-finder-wait]");
        (window as unknown as { heldBack: boolean }).heldBack = held !== null && getComputedStyle(held.querySelector("#finder-question")!).visibility === "hidden";
      });
    });
    await theirs.goto(page.url());
    await expect(question(theirs, "Three gifts that fit")).toBeVisible();
    expect(await theirs.evaluate(() => (window as unknown as { heldBack: boolean }).heldBack)).toBe(true);
    await expect(question(theirs, "Who is it for?")).toHaveCount(0);
    await expect(theirs.locator("[data-finder-wait]")).toHaveCount(0);
    expect(await names(theirs)).toEqual(mine);
    // Nothing about arriving with answers upsets the page (a hydration mismatch would be logged).
    expect(errors.filter((e) => /hydrat|did not match|Minified React/i.test(e))).toEqual([]);
    await friend.close();
  });

  test("a broken or half-written link starts at the first question it leaves open", async ({ page }) => {
    await page.goto("/gifts/finder?for=alien&occasion=%3Cscript%3E&feel=42");
    await expect(question(page, "Who is it for?")).toBeVisible();

    await page.goto("/gifts/finder?occasion=christmas&feel=nonsense");
    await expect(question(page, "Who is it for?")).toBeVisible();
    await answer(page, "My dad").click();
    // The occasion it did carry is kept: straight to the picks.
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    expect(search(page)).toBe("?for=dad&occasion=christmas");

    // A question can only be asked again once both are answered.
    await page.goto("/gifts/finder?ask=occasion");
    await expect(question(page, "Who is it for?")).toBeVisible();
    await page.goto("/gifts/finder?for=mom&ask=for");
    await expect(question(page, "What's the occasion?")).toBeVisible();

    await page.goto("/gifts/finder?for=wife&occasion=apology&more=banana&ask=nothing");
    await expect(picks(page)).toHaveCount(3);
  });

  test("“Not sure” on both questions still ends on three gifts", async ({ page }) => {
    await page.goto("/gifts/finder");
    for (const heading of ["Who is it for?", "What's the occasion?"]) {
      await expect(question(page, heading)).toBeVisible();
      await answer(page, "Not sure").click();
    }
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    expect(search(page)).toBe("?for=any&occasion=any");
    expect(await names(page)).toEqual(["The Letter", "Bouquet", "Constellations"]);
    await expect(page.getByRole("button", { name: "For anyone Change: Who is it for?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Any occasion Change: What's the occasion?" })).toBeVisible();
  });

  test("the second question shows that person's six occasions, the season's first, and the rest open in place", async ({ page }) => {
    await page.goto("/gifts/finder?for=someone");
    const { first, more } = occasionsFor("someone", TODAY);
    const cards = page.locator("[data-answer]");
    await expect(cards).toHaveText([...first.map((o) => OCCASION_NAMES[o]), "Not sure"]);
    if (occasionsInSeason(TODAY).includes("christmas")) await expect(cards.first()).toHaveText("Christmas");

    const open = page.getByRole("button", { name: "More occasions" });
    await expect(open).toHaveAttribute("aria-expanded", "false");
    await expect(answer(page, "Halloween")).toHaveCount(0);
    await open.click();
    await expect(open).toHaveAttribute("aria-expanded", "true");
    // In the same grid, under the six, with "Not sure" still the last card; the address has not changed.
    await expect(cards).toHaveText([...first.map((o) => OCCASION_NAMES[o]), ...more.map((o) => OCCASION_NAMES[o]), "Not sure"]);
    expect(search(page)).toBe("?for=someone");
    await expect(question(page, "What's the occasion?")).toBeVisible();
    await answer(page, "Halloween").click();
    await expect(picks(page)).toHaveCount(3);
    const halloween = await names(page);
    // Every one of them a gift made for Halloween, by its own manifest.
    const made = EN.filter((pick) => pick.occasions.includes("halloween")).map((pick) => pick.name);
    expect(made).toEqual(expect.arrayContaining(["Trick or Treat", "Haunted House", "Bat Swarm"]));
    for (const name of halloween) expect(made).toContain(name);

    // A mother is asked about Mother's Day, and never up front about Valentine's.
    await page.goto("/gifts/finder?for=mom");
    await expect(answer(page, "Mother's Day")).toBeVisible();
    await expect(answer(page, "Valentine's Day")).toHaveCount(0);

    // The same person at Christmas: Christmas gifts lead, and not one Halloween gift, however many they ask to see.
    await page.goto("/gifts/finder?for=someone&occasion=christmas&more=20");
    await expect(picks(page).first()).toBeVisible();
    const christmas = await names(page);
    expect(christmas.slice(0, 3)).toEqual(topNames({ for: "someone", occasion: "christmas", feel: null }));
    for (const name of halloween) expect(christmas).not.toContain(name);
    // And a mother is never offered the couples' collages.
    await page.goto("/gifts/finder?for=mom&occasion=valentines&feel=romantic&more=20");
    await expect(picks(page).first()).toBeVisible();
    const forMom = await names(page);
    for (const name of ["XOXO", "Coquette", "Dark Romance", "Evergreen", "Snow Globe"]) expect(forMom).not.toContain(name);
    await expect(page.getByText("Those are all the gifts that fit.")).toBeVisible();
  });

  test("three more, then start again", async ({ page }) => {
    await page.goto("/gifts/finder?for=boyfriend&occasion=just-because");
    await expect(picks(page)).toHaveCount(3);
    const three = await names(page);
    await page.getByRole("button", { name: "Show three more" }).click();
    await expect(picks(page)).toHaveCount(6);
    const six = await names(page);
    expect(six.slice(0, 3)).toEqual(three);
    expect(new Set(six).size).toBe(6);
    // The focus moved on to the first of the new three.
    await expect(picks(page).nth(3).locator("[data-watch]")).toBeFocused();
    // In the address, so coming Back from the editor finds the same six.
    expect(search(page)).toBe("?for=boyfriend&occasion=just-because&more=1");
    await page.reload();
    await expect(picks(page)).toHaveCount(6);

    await page.getByRole("button", { name: "Start again" }).click();
    await expect(question(page, "Who is it for?")).toBeVisible();
    expect(search(page)).toBe("");
    await page.goBack();
    await expect(picks(page)).toHaveCount(6);
  });

  test("the first pick carries “Make this gift”; the others show theirs on hover and focus on a desk, and always on a phone", async ({ page, isMobile }) => {
    await page.goto("/gifts/finder?for=wife&occasion=anniversary");
    await expect(picks(page)).toHaveCount(3);
    const make = (i: number) => picks(page).nth(i).locator("[data-make]");
    const opacity = (i: number) => make(i).evaluate((el) => getComputedStyle(el).opacity);
    expect(await opacity(0)).toBe("1");
    for (const i of [0, 1, 2]) await expect(make(i)).toHaveAttribute("href", /^\/create\/[a-z0-9-]+\?ref=finder$/);
    if (isMobile) {
      expect(await opacity(1)).toBe("1");
      expect(await opacity(2)).toBe("1");
      return;
    }
    expect(await opacity(1)).toBe("0");
    // Its room is kept, so nothing moves when it appears.
    const before = await picks(page).nth(1).boundingBox();
    await picks(page).nth(1).hover();
    await expect.poll(() => opacity(1)).toBe("1");
    expect((await picks(page).nth(1).boundingBox())!.height).toBeCloseTo(before!.height, 1);
    // A keyboard reaches it too, and sees it.
    await picks(page).nth(2).locator("[data-watch]").focus();
    await expect.poll(() => opacity(2)).toBe("1");
  });

  test("the whole sentence waits in a pick's closed “Why this one”", async ({ page }) => {
    await page.goto("/gifts/finder?for=girlfriend&occasion=anniversary");
    await expect(picks(page)).toHaveCount(3);
    const answers: FinderAnswers = { for: "girlfriend", occasion: "anniversary", feel: null };
    const best = top(answers)[0];
    const key = reasonKey(best.why, answers);
    expect(best.line[key]).not.toBe(best.why[key]);
    const first = picks(page).first();
    await expect(first.locator("[data-why]")).toHaveText(best.line[key] as string);
    const why = first.locator("details");
    await expect(why.locator("summary")).toHaveText("Why this one");
    await expect(why.locator("p")).toBeHidden();
    await why.locator("summary").click();
    await expect(why.locator("p")).toBeVisible();
    await expect(why.locator("p")).toHaveText(best.why[key] as string);
  });

  test("each pick plays its own preview while it is on screen, one button stops them all, and less motion means none", async ({ page, isMobile }) => {
    test.skip(isMobile, "the films are the same; the phone project's row shows one card at a time");
    await page.goto("/gifts/finder?for=girlfriend&occasion=anniversary");
    await expect(picks(page)).toHaveCount(3);
    const films = page.locator("#finder-row video");
    await expect(films).toHaveCount(3);
    // The poster is there first; the film shows only once it is really playing.
    await expect(picks(page).first().locator("img")).toBeVisible();
    await expect(films.first()).toHaveAttribute("data-on", "", { timeout: 20_000 });
    expect(await films.first().evaluate((v: HTMLVideoElement) => ({ muted: v.muted, src: v.getAttribute("src") }))).toEqual({ muted: true, src: `/templates/${top({ for: "girlfriend", occasion: "anniversary", feel: null })[0].slug}/preview.webm` });
    // Past the recording's opening, where the gift's own first screen is up.
    expect(await films.first().evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(1);
    const stop = page.getByRole("button", { name: "Pause the previews" });
    await expect(stop).toBeVisible();
    await stop.click();
    await expect(page.getByRole("button", { name: "Play the previews" })).toBeVisible();
    await expect.poll(() => films.evaluateAll((all) => all.every((v) => (v as HTMLVideoElement).paused))).toBe(true);
    await page.getByRole("button", { name: "Play the previews" }).click();
    await expect.poll(() => films.first().evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);

    // Someone who asked for less motion gets the posters, no film is fetched, and there is nothing to stop.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const fetched: string[] = [];
    page.on("request", (request) => (request.url().endsWith(".webm") ? fetched.push(request.url()) : undefined));
    await page.goto("/gifts/finder?for=girlfriend&occasion=anniversary");
    await expect(picks(page)).toHaveCount(3);
    await page.waitForTimeout(1500);
    expect(fetched).toEqual([]);
    await expect(page.locator("#finder-row video[data-on]")).toHaveCount(0);
    await expect(page.locator("[data-films-toggle]")).toHaveCount(0);
  });

  test("a pick's picture plays the real template, and “Make this gift” lands in its editor", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/gifts/finder?for=any&occasion=any");
    await expect(picks(page)).toHaveCount(3);
    const name = (await names(page))[0];
    expect(name).toBe("The Letter");

    await page.getByRole("button", { name: `Watch it: ${name}` }).click();
    const demo = page.getByRole("dialog", { name: `${name}: live demo` });
    await expect(demo).toBeVisible();
    // The template itself, with its sample gift, inside the phone.
    await expect(demo.getByRole("button", { name: /tap the seal/i })).toBeVisible({ timeout: 30_000 });
    await expect(demo.getByRole("link", { name: "Make this gift" })).toHaveAttribute("href", "/create/the-letter?ref=finder");
    await page.keyboard.press("Escape");
    await expect(demo).toBeHidden();
    await expect(page.getByRole("button", { name: `Watch it: ${name}` })).toBeFocused();

    await picks(page).first().getByRole("link", { name: "Make this gift" }).click();
    // The editor is a big page for a dev server to build the first time it is asked for.
    await expect(page).toHaveURL(/\/create\/the-letter\?ref=finder$/, { timeout: 30_000 });
    await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 30_000 });
    // Back from the editor: the same picks, not the first question.
    await page.goBack();
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    expect(await names(page)).toContain("The Letter");
  });

  test("works from the keyboard alone: arrows and Tab walk the cards, Enter answers, and the focus moves to the new heading", async ({ page, isMobile }) => {
    test.skip(isMobile, "a phone has no Tab key");
    await page.goto("/gifts/finder");
    await answer(page, "My girlfriend").focus();
    await page.keyboard.press("ArrowRight");
    await expect(answer(page, "My boyfriend")).toBeFocused();
    // Down a row of four, and up again.
    await page.keyboard.press("ArrowDown");
    await expect(answer(page, "My dad")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(answer(page, "My boyfriend")).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(answer(page, "My girlfriend")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(answer(page, "My boyfriend")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(question(page, "What's the occasion?")).toBeFocused();
    expect(search(page)).toBe("?for=boyfriend");
    await page.keyboard.press("Tab");
    const first = OCCASION_NAMES[occasionsFor("boyfriend", TODAY).first[0]];
    await expect(answer(page, first)).toBeFocused();
    await page.keyboard.press("Space");
    await expect(question(page, "Three gifts that fit")).toBeFocused();
    // On from the heading: the feelings, then the first pick's picture, its closed sentence and its way into the editor.
    const focused = () => page.evaluate(() => { const el = document.activeElement as HTMLElement; return el.dataset.feel ? "feel" : el.hasAttribute("data-films-toggle") ? "films" : el.hasAttribute("data-watch") ? "watch" : el.tagName === "SUMMARY" ? "why" : el.hasAttribute("data-make") ? "make" : el.tagName; });
    const stops: string[] = [];
    for (let i = 0; i < 9 && stops.at(-1) !== "make"; i++) {
      await page.keyboard.press("Tab");
      stops.push(await focused());
    }
    expect(stops.filter((s) => s !== "films" && s !== "why")).toEqual(["feel", "feel", "feel", "feel", "watch", "make"]);
    await expect(picks(page).first().locator("[data-make]")).toBeFocused();
  });

  test("in Spanish, from the first question to the editor's address", async ({ page }) => {
    await page.goto("/es/gifts/finder");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.getByRole("heading", { level: 1, name: "¿Qué regalo digital deberías enviar?" })).toBeVisible();
    await expect(page.getByText("1 de 2", { exact: true })).toBeVisible();
    await answer(page, "Mi novia").click();
    await expect(question(page, "¿Cuál es la ocasión?")).toBeVisible();
    await answer(page, "San Valentín").click();
    await expect(question(page, "Tres regalos que encajan")).toBeVisible();
    // The same values in the address as in English: a link works in either language.
    expect(search(page)).toBe("?for=girlfriend&occasion=valentines");
    await expect(picks(page)).toHaveCount(3);
    const es = finderPicks("es");
    const answers: FinderAnswers = { for: "girlfriend", occasion: "valentines", feel: null };
    expect(await names(page)).toEqual(rankGifts(es, answers).slice(0, 3).map((pick) => pick.name));
    expect(await names(page)).toContain("XOXO");
    const xoxo = picks(page).filter({ has: page.getByRole("heading", { level: 3, name: "XOXO" }) });
    await expect(xoxo.locator("[data-why]")).toHaveText("Un sobre sellado con un beso de pintalabios se abre a un collage rojo.");
    await expect(xoxo.locator("details summary")).toHaveText("Por qué este");
    await expect(xoxo.getByRole("link", { name: "Crear este regalo" })).toHaveAttribute("href", "/es/create/xoxo?ref=finder");
    await expect(page.getByRole("button", { name: /^Para mi novia/ })).toBeVisible();
    await page.getByRole("button", { name: "Romántico", exact: true }).click();
    await expect(page.getByRole("button", { name: "Romántico", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Ver tres más" }).click();
    await expect(picks(page)).toHaveCount(6);
    await page.getByRole("button", { name: "Empezar de nuevo" }).click();
    await expect(question(page, "¿Para quién es?")).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/es\/gifts\/finder$/);
  });

  test("with scripts off the page still asks its first question with its pictures, and links on", async ({ page }) => {
    await page.route("**/*.js", (route) => route.abort());
    await page.goto("/gifts/finder?for=mom&occasion=birthday");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Which digital gift should you send?");
    await expect(page.getByRole("heading", { level: 2, name: "Who is it for?" })).toBeAttached();
    // Seven people and "Not sure": two even rows of four. "Someone else" is not a card (an address can still carry it).
    await expect(page.locator("[data-answer]")).toHaveCount(8);
    await expect(page.locator("[data-answer] img")).toHaveCount(8);
    // At the foot: one row of quiet links to the seven pages that start from a person, and every gift.
    const foot = page.locator('section[aria-labelledby="finder-people"]');
    await expect(foot.getByRole("heading", { level: 2 })).toHaveText("Or start from the person");
    await expect(foot.locator("ul a")).toHaveCount(8);
    for (const href of ["/gifts/for-mom", "/gifts/for-best-friend", "/gifts/for-boyfriend", "/templates"]) await expect(foot.locator(`ul a[href="${href}"]`)).toBeVisible();
    // How it picks is not on the page to be read, and is still in its HTML: one closed block, with the days as links.
    const how = page.locator("details[data-finder-how]");
    await expect(how.locator("summary")).toHaveText("How the finder picks");
    await expect(how.locator("p").first()).toBeHidden();
    expect(await how.locator("p").first().textContent()).toContain("tagged by hand");
    await expect(how.locator('a[href^="/occasions/"]')).toHaveCount(13);
    for (const href of ["/occasions/birthday", "/occasions/just-because"]) await expect(how.locator(`a[href="${href}"]`)).toBeAttached();
    // A native <details> opens without scripts.
    await how.locator("summary").click();
    await expect(how.locator("p").first()).toBeVisible();
    const data = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("");
    expect(data).toContain('"BreadcrumbList"');
    expect(data).toContain("/gifts/finder");
    await expect(page).toHaveTitle(/^Gift Finder: Which Digital Gift Should You Send\?/);
  });

  test("fits a phone's width at every step", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the phone project's check");
    for (const query of ["", "?for=best-friend", "?for=best-friend&occasion=long-distance&ask=occasion", "?for=best-friend&occasion=long-distance&feel=unusual&more=2"]) {
      for (const locale of ["", "/es"]) {
        await page.goto(`${locale}/gifts/finder${query}`);
        await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${locale}/gifts/finder${query}`).toBeLessThanOrEqual(0);
        // Everything that can be tapped is at least 44px tall: the tool, and the links under it.
        const small = await page.locator("main button:visible, main a:visible, main summary:visible").evaluateAll((els) => els.filter((el) => el.getBoundingClientRect().height < 43.5).map((el) => el.textContent));
        expect(small, `${locale}/gifts/finder${query}`).toEqual([]);
      }
    }
  });
});

test.describe("the ways into the finder", () => {
  test("from the front page's templates, the gifts page and the gallery", async ({ page }) => {
    for (const path of ["/", "/gifts", "/templates"]) {
      await page.goto(path);
      const link = page.locator("main").getByRole("link", { name: "Answer two questions" });
      await expect(link, path).toHaveCount(1);
      await expect(link, path).toHaveAttribute("href", "/gifts/finder");
      await expect(page.getByText("Not sure which?").first(), path).toBeVisible();
    }
    await page.goto("/es/templates");
    await expect(page.locator("main").getByRole("link", { name: "Responde dos preguntas" })).toHaveAttribute("href", "/es/gifts/finder");
    await page.locator("main").getByRole("link", { name: "Responde dos preguntas" }).click();
    await expect(page).toHaveURL(/\/es\/gifts\/finder$/);
    await expect(question(page, "¿Para quién es?")).toBeVisible();
  });

  test("the finder is in the sitemap, in both languages, and nowhere on a gift", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toMatch(/<loc>[^<]*\/gifts\/finder<\/loc>/);
    expect(sitemap).toMatch(/<loc>[^<]*\/es\/gifts\/finder<\/loc>/);
    const demo = await (await request.get("/demo/the-letter")).text();
    expect(demo).not.toContain("/gifts/finder");
  });
});

test.describe("Christmas gifts on a boyfriend's and a girlfriend's page", () => {
  // The row is there from 15 Nov to 25 Dec, by the day the page is rendered with; the test follows the calendar.
  const inSeason = occasionsInSeason(TODAY).includes("christmas");

  test("in season: four gifts as pictures, the finder's own first four, and a way on to the finder", async ({ page, isMobile }) => {
    for (const [path, who, heading] of [
      ["/gifts/for-boyfriend", "boyfriend", "Christmas gifts for your boyfriend"],
      ["/gifts/for-girlfriend", "girlfriend", "Christmas gifts for your girlfriend"],
      ["/es/gifts/for-boyfriend", "boyfriend", "Regalos de Navidad para tu novio"],
    ] as const) {
      await page.goto(path);
      const row = page.locator('section[aria-labelledby="christmas-gifts"]');
      if (!inSeason) {
        await expect(row, path).toHaveCount(0);
        continue;
      }
      await expect(row.getByRole("heading", { level: 2 }), path).toHaveText(heading);
      const es = path.startsWith("/es");
      const expected = christmasPicks(who).map((slug) => getManifest(slug)!);
      await expect(row.locator("li a"), path).toHaveCount(4);
      expect(await row.locator("li a").evaluateAll((links) => links.map((a) => a.getAttribute("href"))), path).toEqual(expected.map((m) => `${es ? "/es" : ""}/templates/${m.slug}`));
      await expect(row.locator("li a span:last-child"), path).toHaveText(expected.map((m) => m.name[es ? "es" : "en"]));
      // One line of at most fourteen words, and one button, which opens the finder on this answer.
      expect(words(await row.locator("h2 + p").innerText()), path).toBeLessThanOrEqual(14);
      await expect(row.getByRole("link", { name: es ? "Ver más regalos de Navidad" : "See more Christmas gifts" }), path).toHaveAttribute("href", `${es ? "/es" : ""}/gifts/finder?for=${who}&occasion=christmas`);
      // The page's own list of ideas is still under it, whole.
      await expect(page.locator("main ol > li").first(), path).toBeVisible();
      // On a phone the four are one row, one card to a screen, with four dots.
      if (isMobile) {
        const seen = await row.locator("li").evaluateAll((cards) => cards.filter((card) => { const r = card.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }).length);
        expect(seen, path).toBe(1);
        await expect(row.locator("[data-dots] > span"), path).toHaveCount(4);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(0);
    }
  });

  test("the button's answer opens the finder on Christmas gifts for that person, and nobody else's page has the row", async ({ page }) => {
    await page.goto("/gifts/finder?for=boyfriend&occasion=christmas");
    await expect(question(page, "Three gifts that fit")).toBeVisible();
    expect(await names(page)).toEqual(christmasPicks("boyfriend", 3).map((slug) => getManifest(slug)!.name.en));
    for (const path of ["/gifts/for-mom", "/gifts/for-husband", "/gifts/for-best-friend"]) {
      await page.goto(path);
      await expect(page.locator('section[aria-labelledby="christmas-gifts"]'), path).toHaveCount(0);
    }
  });
});
