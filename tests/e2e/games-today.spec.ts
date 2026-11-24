import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { DAILY_PAIRS, dailyPair, dayOf, encodeDaily } from "../../src/lib/games/daily";

/**
 * Today's question (/games/today), between two phones: one person answers and sends a link, the
 * other opens it in a browser of their own (a second context: nothing shared, as on two phones),
 * picks before seeing the first answer, sees both, and sends theirs back; the first person opens
 * the reply and sees both too. Played on a phone and on a desk (the two projects), in both
 * languages. Nothing on the page talks to a server, so nothing here is mocked but the clipboard,
 * the share sheet and Vercel's counter.
 */

/** Stand in for the clipboard, the share sheet (none, unless a test gives one) and Vercel's script. */
async function prepare(context: BrowserContext, share: "none" | "ok" | "closed" = "none") {
  await context.route((url) => url.hostname === "va.vercel-scripts.com" || url.pathname.startsWith("/_vercel/insights/"), (route) => route.abort());
  await context.addInitScript((share) => {
    const w = window as unknown as { __copied: string[]; __shared: unknown[]; __counted: unknown[][]; va: (...args: unknown[]) => void };
    w.__copied = [];
    w.__shared = [];
    w.__counted = [];
    w.va = (...args: unknown[]) => void w.__counted.push(args);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text: string) => void w.__copied.push(text) } });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value:
        share === "none"
          ? undefined
          : async (data: unknown) => {
              if (share === "closed") throw new DOMException("closed", "AbortError");
              w.__shared.push(data);
            },
    });
  }, share);
}

const copied = (page: Page) => page.evaluate(() => (window as unknown as { __copied: string[] }).__copied.at(-1) ?? "");
const events = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __counted: unknown[][] }).__counted
      .filter((call) => call[0] === "event")
      .map((call) => call[1] as { name: string; data?: Record<string, unknown> })
      .filter((e) => e.name.startsWith("daily_"))
      .map((e) => (e.data ? `${e.name}:${JSON.stringify(e.data)}` : e.name)),
  );

async function phone(browser: Browser, share: "none" | "ok" | "closed" = "none", options: Parameters<Browser["newContext"]>[0] = {}) {
  const context = await browser.newContext(options);
  await prepare(context, share);
  return { context, page: await context.newPage() };
}

const today = () => dayOf(Date.now());
const card = (page: Page, side: "a" | "b") => page.locator(`[data-today] [data-side=${side}]`).first();
const phase = (page: Page) => page.locator("[data-today]");
/** Open a page and wait until the question has read its address (a tap before that would be a tap on the server's HTML). */
async function open(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator("[data-today][data-ready]")).toHaveCount(1);
}

for (const locale of ["", "/es"] as const) {
  const words = locale
    ? { from: "De Ana", invited: "Ana ya ha respondido", differ: /^Cada cual por su lado\./, sent: "Enviada", you: "Tú" }
    : { from: "From Ana", invited: "Ana has answered", differ: /^Different picks\./, sent: "Sent", you: "You" };
  const lang = locale ? "es" : "en";

  test(`T1 ${lang}: the server's page holds today's pair as text, the h1 and how it works`, async ({ page, request }) => {
    const html = await (await request.get(`${locale}/games/today`)).text();
    const pair = dailyPair(today());
    // The pair the server rendered with is today's (or, in the minute round midnight, yesterday's).
    const near = [dailyPair(today()), dailyPair(today() - 1)];
    expect(near.some((p) => html.includes(p[`a`][lang].replace(/'/g, "&#x27;")) || html.includes(p.a[lang]))).toBe(true);
    await page.goto(`${locale}/games/today`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(card(page, "a")).toContainText(pair.a[lang]);
    await expect(card(page, "b")).toContainText(pair.b[lang]);
    await expect(page.locator("#today-steps li")).toHaveCount(3);
    await expect(page).toHaveTitle(locale ? /pregunta del día/i : /question of the day/i);
  });

  test(`T2 ${lang}: one sends, the other picks before seeing it, both see both, and the reply comes back`, async ({ browser, isMobile }) => {
    const size = isMobile ? { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } };
    const one = await phone(browser, "none", size);
    const two = await phone(browser, "none", size);
    const pair = dailyPair(today());

    // The first phone: answer B, give a name, send.
    await open(one.page, `${locale}/games/today`);
    await expect(phase(one.page)).toHaveAttribute("data-phase", "ask");
    await card(one.page, "b").click();
    await expect(phase(one.page)).toHaveAttribute("data-phase", "answered");
    await expect(card(one.page, "b")).toHaveAttribute("aria-checked", "true");
    await one.page.locator("[data-today] input").fill("Ana");
    await one.page.locator("[data-send]").click();
    await expect(phase(one.page)).toHaveAttribute("data-phase", "sent");
    await expect(one.page.getByRole("status")).toContainText(words.sent);
    const link = await copied(one.page);
    expect(link).toContain(`${locale}/games/today#q=1.${today()}.${pair.id}.Ana.1`);
    // Nothing a server would see: no query, and the name only after the #.
    expect(new URL(link).search).toBe("");

    // The second phone: the question, with no answer shown until a pick.
    await open(two.page, link);
    await expect(phase(two.page)).toHaveAttribute("data-phase", "invited");
    await expect(two.page.getByText(words.from)).toBeVisible();
    await expect(two.page.getByText(words.invited)).toBeVisible();
    await expect(two.page.locator("[data-reveal-card]")).toHaveCount(0);
    await card(two.page, "a").click();
    await expect(phase(two.page)).toHaveAttribute("data-phase", "reveal");
    await expect(two.page.getByRole("heading", { name: words.differ })).toBeFocused();
    const cards = two.page.locator("[data-reveal-card]");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toContainText("Ana");
    await expect(cards.nth(0)).toContainText(pair.b[lang]);
    await expect(cards.nth(1)).toContainText(words.you);
    await expect(cards.nth(1)).toContainText(pair.a[lang]);
    // Once, after the reveal: the whole game and the gift.
    await expect(two.page.locator("[data-whole-game]")).toHaveAttribute("href", `${locale}/games/rather`);
    await expect(two.page.locator('a[href*="/templates?ref=game-end"]')).toHaveCount(1);
    await expect(two.page.locator("[data-todays]")).toHaveCount(0);
    await two.page.locator("[data-today] input").fill("Sam");
    await two.page.locator("[data-copy]").click();
    const reply = await copied(two.page);
    expect(reply).toContain(`#q=1.${today()}.${pair.id}.Sam.0.Ana.1`);
    await expect(two.page.getByRole("status")).toContainText("Ana");
    // Sent back: one thing at a time, so the form makes way for the whole game, with the link once more for a chat it missed.
    await expect(two.page.locator("[data-send]")).toHaveCount(0);
    await two.page.locator("[data-copy-again]").click();
    expect(await copied(two.page)).toBe(reply);

    // The first phone opens the reply (in a browser that remembers nothing of the first visit) and sees both.
    const back = await phone(browser, "none", size);
    await open(back.page, reply);
    await expect(phase(back.page)).toHaveAttribute("data-phase", "reveal");
    await expect(back.page.getByRole("heading", { name: words.differ })).toBeVisible();
    // As on the other phone: the other person on the left, the reader's own answer on the right as "You".
    await expect(back.page.locator("[data-reveal-card]").nth(0)).toContainText("Sam");
    await expect(back.page.locator("[data-reveal-card]").nth(0)).toContainText(pair.a[lang]);
    await expect(back.page.locator("[data-reveal-card]").nth(1)).toContainText(words.you);
    await expect(back.page.locator("[data-reveal-card]").nth(1)).toContainText(pair.b[lang]);
    await expect(back.page.locator("[data-reveal-card]").nth(1)).not.toContainText("Ana");
    await expect(back.page.locator("[data-send]")).toHaveCount(0);

    // What was counted: no names, no answers, no ids.
    expect(await events(one.page)).toEqual(["daily_seen", "daily_answered", 'daily_shared:{"how":"copy"}']);
    expect(await events(two.page)).toEqual(["daily_opened_shared", "daily_answered", 'daily_revealed:{"match":false}', 'daily_shared:{"how":"copy"}', 'daily_shared:{"how":"copy"}']);
    expect(await events(back.page)).toEqual(["daily_opened_shared", 'daily_revealed:{"match":false}']);
    for (const p of [one.page, two.page, back.page]) for (const e of await events(p)) expect(e).not.toMatch(/Ana|Sam|#|q=/);
    await Promise.all([one.context.close(), two.context.close(), back.context.close()]);
  });
}

test("T3: the same pick on both phones says so", async ({ browser }) => {
  const two = await phone(browser);
  const pair = dailyPair(today());
  await open(two.page, `/games/today${encodeDaily({ day: today(), pairId: pair.id, from: { name: "Ana", side: 0 } })}`);
  await card(two.page, "a").click();
  await expect(two.page.getByRole("heading", { name: /^Same pick\./ })).toBeVisible();
  await two.context.close();
});

test("T4: the share sheet is used where there is one; a closed sheet sends and counts nothing", async ({ browser }) => {
  const ok = await phone(browser, "ok");
  await open(ok.page, "/games/today");
  await card(ok.page, "a").click();
  await ok.page.locator("[data-today] input").fill("Ana");
  await ok.page.locator("[data-send]").click();
  await expect(phase(ok.page)).toHaveAttribute("data-phase", "sent");
  const shared = await ok.page.evaluate(() => (window as unknown as { __shared: { url: string; text: string }[] }).__shared);
  expect(shared).toHaveLength(1);
  expect(shared[0].url).toContain("#q=1.");
  expect(shared[0].text).toContain("Ana");
  expect(await events(ok.page)).toContain('daily_shared:{"how":"share"}');

  const closed = await phone(browser, "closed");
  await open(closed.page, "/games/today");
  await card(closed.page, "a").click();
  await closed.page.locator("[data-send]").click();
  await expect(phase(closed.page)).toHaveAttribute("data-phase", "answered");
  expect(await events(closed.page)).not.toContain('daily_shared:{"how":"share"}');
  await Promise.all([ok.context.close(), closed.context.close()]);
});

test("T5: a link from an earlier day still opens on the pair it was sent with, and offers today's after", async ({ browser }) => {
  // The page went up on its first day: a link from an earlier day needs a clock a few days on.
  const later = today() + 5;
  const two = await phone(browser);
  await two.context.clock.setFixedTime(later * 86_400_000 + 3_600_000);
  const sent = later - 3;
  const old = DAILY_PAIRS.find((p) => p.id !== dailyPair(later).id && p.id !== dailyPair(sent).id)!;
  await open(two.page, `/games/today${encodeDaily({ day: sent, pairId: old.id, from: { name: "Ana", side: 1 } })}`);
  await expect(phase(two.page)).toHaveAttribute("data-day", String(sent));
  await expect(card(two.page, "a")).toContainText(old.a.en);
  // Marked as that day's, not as today's: the label over the question, and the page's heading and line too.
  await expect(two.page.locator("[data-today] > p").first()).toHaveText(/^From Ana, .+$/);
  await expect(two.page.getByRole("heading", { level: 1 })).toHaveText("That day’s would you rather question");
  await expect(two.page.locator("#today-title + p")).toHaveText(/^Everyone got this one that day\./);  await card(two.page, "b").click();
  await expect(phase(two.page)).toHaveAttribute("data-phase", "reveal");
  await expect(two.page.locator("[data-today] > p").first()).toHaveText(/^Both answers, .+$/);
  // One thing at a time: sending yours back first, then the way on to today's question.
  await expect(two.page.locator("[data-todays]")).toHaveCount(0);
  await two.page.locator("[data-copy]").click();
  await two.page.locator("[data-todays]").click();
  await expect(phase(two.page)).toHaveAttribute("data-phase", "ask");
  await expect(phase(two.page)).toHaveAttribute("data-day", String(later));
  await expect(card(two.page, "a")).toContainText(dailyPair(later).a.en);
  await expect(two.page.getByRole("heading", { level: 1 })).toHaveText("Today’s would you rather question");
  expect(new URL(two.page.url()).hash).toBe("");
  await two.context.close();
});

test("T6: a broken or hostile link falls back to today's question and shows nothing from it", async ({ browser }) => {
  const two = await phone(browser);
  for (const hash of ["#q=1.99999999.beach.0.Ana", "#q=1.20000.nope.0.Ana", "#q=garbage", `#q=1.${today()}.beach.%E0%A4%A.0`, `#q=1.${today()}.beach.<img src=x onerror=alert(1)>.0`]) {
    await open(two.page, `/games/today${hash}`);
    await two.page.reload();
    await expect(two.page.locator("[data-today][data-ready]")).toHaveCount(1);
    const ph = phase(two.page);
    if (hash.includes("<img")) {
      // A name that decodes is shown as text, never as markup.
      await expect(ph).toHaveAttribute("data-phase", "invited");
      await expect(two.page.locator("[data-today] img")).toHaveCount(0);
      continue;
    }
    await expect(ph, hash).toHaveAttribute("data-phase", "ask");
    await expect(ph, hash).toHaveAttribute("data-day", String(today()));
    await expect(two.page.getByText("That link didn’t arrive whole")).toBeVisible();
  }
  await two.context.close();
});

test("T7: a reload keeps the tab's own answer; a new tab starts fresh", async ({ browser }) => {
  const one = await phone(browser);
  await open(one.page, "/games/today");
  await card(one.page, "b").click();
  await one.page.reload();
  await expect(one.page.locator("[data-today][data-ready]")).toHaveCount(1);
  await expect(phase(one.page)).toHaveAttribute("data-phase", "answered");
  await expect(card(one.page, "b")).toHaveAttribute("aria-checked", "true");
  // Changing the pick before sending.
  await card(one.page, "a").click();
  await expect(card(one.page, "a")).toHaveAttribute("aria-checked", "true");
  const fresh = await one.context.newPage();
  await open(fresh, "/games/today");
  await expect(phase(fresh)).toHaveAttribute("data-phase", "ask");
  await one.context.close();
});

test("T8: the name the games remember is offered, and a long name is cut at 24", async ({ browser }) => {
  const one = await phone(browser);
  await one.page.addInitScript(() => window.localStorage.setItem("ethos.games.names", JSON.stringify(["Marta", "Leo"])));
  await open(one.page, "/games/today");
  await card(one.page, "a").click();
  await expect(one.page.locator("[data-today] input")).toHaveValue("Marta");
  await one.page.locator("[data-today] input").fill("x".repeat(40));
  await expect(one.page.locator("[data-today] input")).toHaveValue("x".repeat(24));
  await one.context.close();
});

test("T9: by keyboard alone: the two answers are one radio pair, Enter picks, the arrows move the pick", async ({ page, isMobile }) => {
  test.skip(isMobile, "a keyboard is a desk's");
  await prepare(page.context());
  await open(page, "/games/today");
  // A one-of-two choice, said as one: a radio group named by the question, not two pressed buttons.
  const group = page.getByRole("radiogroup", { name: "Which one would you take?" });
  await expect(group.getByRole("radio")).toHaveCount(2);
  await expect(card(page, "a")).not.toHaveAttribute("aria-pressed");
  await card(page, "a").focus();
  await page.keyboard.press("Enter");
  await expect(card(page, "a")).toHaveAttribute("aria-checked", "true");
  await expect(card(page, "b")).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("ArrowRight");
  await expect(card(page, "b")).toBeFocused();
  await expect(card(page, "b")).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(card(page, "a")).toHaveAttribute("aria-checked", "true");
  // One tab stop for the pair: Tab goes on to the name.
  await page.keyboard.press("Tab");
  await expect(page.locator("[data-today] input")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(card(page, "a")).toBeFocused();
  await page.keyboard.press("Space");
  await expect(card(page, "a")).toHaveAttribute("aria-checked", "true");
});

test("T12: a change after sending asks for the link to go again, and the new link carries the new answer", async ({ browser }) => {
  const one = await phone(browser);
  const pair = dailyPair(today());
  await open(one.page, "/games/today");
  await card(one.page, "a").click();
  await expect(one.page.getByText("Changed your mind? Tap the other one.")).toBeVisible();
  await one.page.locator("[data-today] input").fill("Ana");
  await one.page.locator("[data-copy]").click();
  await expect(phase(one.page)).toHaveAttribute("data-phase", "sent");
  expect(await copied(one.page)).toContain(`.${pair.id}.Ana.0`);
  // Sent: the hint is gone, so nobody believes the link they already sent has changed.
  await expect(one.page.getByText("Changed your mind? Tap the other one.")).toHaveCount(0);
  await card(one.page, "b").click();
  await expect(phase(one.page)).toHaveAttribute("data-phase", "answered");
  await expect(one.page.getByRole("status")).toContainText("Send it again");
  await one.page.locator("[data-copy]").click();
  await expect(phase(one.page)).toHaveAttribute("data-phase", "sent");
  expect(await copied(one.page)).toContain(`.${pair.id}.Ana.1`);
  await expect(one.page.getByRole("status")).not.toContainText("Send it again");
  await one.context.close();
});

test("T13: a tab that already answered opens the other's link straight on the reveal, and counts it", async ({ browser }) => {
  const one = await phone(browser);
  const pair = dailyPair(today());
  await open(one.page, "/games/today");
  await card(one.page, "b").click();
  await open(one.page, `/games/today${encodeDaily({ day: today(), pairId: pair.id, from: { name: "Sam", side: 1 } })}`);
  await expect(phase(one.page)).toHaveAttribute("data-phase", "reveal");
  // The same page, the hash changed: what it counted on its own visit comes first.
  await expect.poll(() => events(one.page)).toEqual(["daily_seen", "daily_answered", "daily_opened_shared", 'daily_revealed:{"match":true}']);
  await one.context.close();
});

test("T15: the sender's own link opened in the tab that sent it is not a reveal against themselves, and counts nothing", async ({ browser }) => {
  const one = await phone(browser);
  await open(one.page, "/games/today");
  await card(one.page, "b").click();
  await one.page.locator("[data-today] input").fill("Ana");
  await one.page.locator("[data-copy]").click();
  const link = await copied(one.page);
  const before = await events(one.page);
  // A tap on their own link in the chat: the same tab, the hash changes.
  await one.page.goto(link);
  await expect(phase(one.page)).toHaveAttribute("data-phase", "sent");
  await expect(card(one.page, "b")).toHaveAttribute("aria-checked", "true");
  await expect(one.page.locator("[data-reveal-card]")).toHaveCount(0);
  await expect(one.page.getByRole("status")).toContainText("This is the link you sent");
  // And after a reload, in the same way.
  await one.page.reload();
  await expect(one.page.locator("[data-today][data-ready]")).toHaveCount(1);
  await expect(phase(one.page)).toHaveAttribute("data-phase", "sent");
  expect(await events(one.page)).toEqual([]);
  expect(before).toEqual(["daily_seen", "daily_answered", 'daily_shared:{"how":"copy"}']);
  await one.context.close();
});

test("T16: a change straight after copying says to send it again, not that it was copied", async ({ browser }) => {
  const one = await phone(browser);
  await open(one.page, "/games/today");
  await card(one.page, "a").click();
  await one.page.locator("[data-copy]").click();
  await expect(one.page.getByRole("status")).toContainText("Link copied");
  await card(one.page, "b").click();
  await expect(one.page.getByRole("status")).toContainText("Send it again");
  await expect(one.page.getByRole("status")).not.toContainText("Link copied");
  await one.context.close();
});

test("T17: a link opened in a tab that had the page, then the whole game, then Back: the question is on screen again", async ({ browser }) => {
  const two = await phone(browser);
  const pair = dailyPair(today());
  await open(two.page, "/games/today");
  // The same document: only the hash changes, as when a link is opened in a tab already on the page.
  await two.page.evaluate((hash) => (window.location.hash = hash), encodeDaily({ day: today(), pairId: pair.id, from: { name: "Ana", side: 0 } }));
  await expect(phase(two.page)).toHaveAttribute("data-phase", "invited");
  await card(two.page, "b").click();
  await expect(phase(two.page)).toHaveAttribute("data-phase", "reveal");
  await two.page.locator("[data-whole-game]").click();
  // The first visit to the game compiles it on a dev server, which can take longer than five seconds.
  await expect(two.page).toHaveURL(/\/games\/rather$/, { timeout: 30_000 });
  await expect(phase(two.page)).toHaveCount(0);
  await two.page.goBack();
  await expect(two.page).toHaveURL(/\/games\/today#q=/);
  await expect(phase(two.page)).toHaveCount(1);
  await two.context.close();
});

test("T18: on a phone, the first tap brings the send button and its status into view", async ({ browser }) => {
  const one = await phone(browser, "none", { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  await one.page.emulateMedia({ reducedMotion: "reduce" });
  await open(one.page, "/games/today");
  await card(one.page, "b").click();
  await expect(phase(one.page)).toHaveAttribute("data-phase", "answered");
  await expect(one.page.locator("[data-send]")).toBeInViewport({ ratio: 1 });
  await expect(one.page.getByRole("status")).toBeInViewport();
  await one.context.close();
});

test("T19: a phone on its side shows an answer on the first screen", async ({ browser }) => {
  const one = await phone(browser, "none", { viewport: { width: 812, height: 375 }, isMobile: true, hasTouch: true });
  await open(one.page, "/games/today");
  await expect(card(one.page, "a")).toBeInViewport({ ratio: 1 });
  await expect(card(one.page, "b")).toBeInViewport({ ratio: 1 });
  await one.context.close();
});

test("T20: a reload after sending still knows the link went out", async ({ browser }) => {
  const one = await phone(browser);
  await open(one.page, "/games/today");
  await card(one.page, "a").click();
  await one.page.locator("[data-copy]").click();
  await expect(phase(one.page)).toHaveAttribute("data-phase", "sent");
  await one.page.reload();
  await expect(one.page.locator("[data-today][data-ready]")).toHaveCount(1);
  await expect(phase(one.page)).toHaveAttribute("data-phase", "sent");
  await expect(one.page.getByRole("status")).toContainText("Sent");
  // A change after the reload still asks for the link to go again.
  await card(one.page, "b").click();
  await expect(one.page.getByRole("status")).toContainText("Send it again");
  await one.context.close();
});

test("T21: two blank names on the same side: the reply is a reveal in the first tab, and counted", async ({ browser }) => {
  const one = await phone(browser);
  const two = await phone(browser);
  await open(one.page, "/games/today");
  await card(one.page, "a").click();
  await one.page.locator("[data-copy]").click();
  const link = await copied(one.page);
  expect(link).toMatch(/\.0$/);
  await open(two.page, link);
  await card(two.page, "a").click();
  await two.page.locator("[data-copy]").click();
  const reply = await copied(two.page);
  expect(reply).toMatch(/\.\.0\.\.0$/);
  // The first tab opens the reply (same tab, the hash changes): both answers, the other's on the left.
  await one.page.goto(reply);
  await expect(phase(one.page)).toHaveAttribute("data-phase", "reveal");
  await expect(one.page.locator("[data-reveal-card]").nth(1)).toContainText("You");
  await expect.poll(() => events(one.page)).toContain('daily_revealed:{"match":true}');
  // The replying tab opening its own reply again is still its own: nothing counted twice.
  const before = (await events(two.page)).length;
  await two.page.goto(reply);
  await expect(phase(two.page)).toHaveAttribute("data-phase", "reveal");
  expect((await events(two.page)).length).toBe(before);
  await Promise.all([one.context.close(), two.context.close()]);
});

test("T22: with no name, the share text speaks for the sender instead of naming somebody", async ({ browser }) => {
  const ok = await phone(browser, "ok");
  await open(ok.page, "/games/today");
  await card(ok.page, "a").click();
  await ok.page.locator("[data-today] input").fill("");
  await ok.page.locator("[data-send]").click();
  const shared = await ok.page.evaluate(() => (window as unknown as { __shared: { text: string }[] }).__shared);
  expect(shared[0].text).toMatch(/^I’ve answered today’s would you rather\./);
  expect(shared[0].text).not.toMatch(/Someone|Somebody/);
  await ok.context.close();
});

test("T23: on a phone, how it works is three rows stacked, with no swipe row and no dots", async ({ browser }) => {
  const one = await phone(browser, "none", { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  await open(one.page, "/games/today");
  const rows = one.page.locator("#today-steps li");
  await expect(rows).toHaveCount(3);
  const boxes = await rows.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON() as DOMRect));
  for (const [i, b] of boxes.entries()) {
    expect(b.left).toBeGreaterThanOrEqual(0);
    expect(b.right).toBeLessThanOrEqual(375);
    if (i) expect(b.top).toBeGreaterThan(boxes[i - 1].bottom - 1);
  }
  expect(await one.page.locator("#today-steps").evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await expect(one.page.locator("section[aria-labelledby=today-how] [data-dots]")).toHaveCount(0);
  await one.context.close();
});

test("T24: a small phone has both answers on the first screen", async ({ browser }) => {
  const one = await phone(browser, "none", { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true });
  await open(one.page, "/games/today");
  await expect(card(one.page, "a")).toBeInViewport({ ratio: 1 });
  await expect(card(one.page, "b")).toBeInViewport({ ratio: 1 });
  await one.context.close();
});

test("T14: the answers are inert until the page has read the day and the address", async ({ request }) => {
  // The server's HTML may be a few minutes old after midnight: a tap on it must not answer yesterday's pair.
  const html = await (await request.get("/games/today")).text();
  expect(html.match(/data-answer[^>]*aria-disabled="true"|aria-disabled="true"[^>]*data-answer/g) ?? []).toHaveLength(2);
});

test("T10: the hub leads with today's question, and the end of would you rather points to it", async ({ page }) => {
  await page.goto("/games");
  const first = page.locator("#pick li").first().locator("a");
  await expect(first).toHaveAttribute("href", "/games/today");
});

test("T11: the page is on the cream, no recorder runs on it, and the share card carries no name", async ({ page }) => {
  await page.goto(`/games/today${encodeDaily({ day: today(), pairId: dailyPair(today()).id, from: { name: "Ana", side: 0 } })}`);
  await expect(page.locator("[data-page-theme=games-today]")).toHaveCount(1);
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(og ?? "").not.toMatch(/Ana|q=/);
  await expect(page.locator('script[src*="clarity"]')).toHaveCount(0);
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.join("")).toContain("FAQPage");
});
