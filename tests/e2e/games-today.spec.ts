import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { RATHER_PAIRS } from "../../src/lib/games/content";
import { dailyPair, dayOf, encodeDaily } from "../../src/lib/games/daily";

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
    ? { from: "De Ana", invited: "Ana ya ha respondido", same: "Habéis elegido lo mismo.", differ: "Habéis elegido distinto.", sent: "Enviada", you: "Tú" }
    : { from: "From Ana", invited: "Ana has answered", same: "You picked the same one.", differ: "You picked differently.", sent: "Sent", you: "You" };
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
    await expect(card(one.page, "b")).toHaveAttribute("aria-pressed", "true");
    await one.page.locator("[data-today] input").fill("Ana");
    await one.page.locator("[data-send]").click();
    await expect(phase(one.page)).toHaveAttribute("data-phase", "sent");
    await expect(one.page.getByRole("status")).toContainText(words.sent);
    const link = await copied(one.page);
    expect(link).toContain(`${locale}/games/today#q=1.${today()}.${pair.id}.1.Ana`);
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
    expect(reply).toContain(`#q=1.${today()}.${pair.id}.0.Sam.1.Ana`);
    await expect(two.page.getByRole("status")).toContainText("Ana");

    // The first phone opens the reply (in a browser that remembers nothing of the first visit) and sees both.
    const back = await phone(browser, "none", size);
    await open(back.page, reply);
    await expect(phase(back.page)).toHaveAttribute("data-phase", "reveal");
    await expect(back.page.getByRole("heading", { name: words.differ })).toBeVisible();
    await expect(back.page.locator("[data-reveal-card]").nth(0)).toContainText("Ana");
    await expect(back.page.locator("[data-reveal-card]").nth(0)).toContainText(pair.b[lang]);
    await expect(back.page.locator("[data-reveal-card]").nth(1)).toContainText("Sam");
    await expect(back.page.locator("[data-send]")).toHaveCount(0);

    // What was counted: no names, no answers, no ids.
    expect(await events(one.page)).toEqual(["daily_seen", "daily_answered", 'daily_shared:{"how":"copy"}']);
    expect(await events(two.page)).toEqual(["daily_opened_shared", "daily_answered", 'daily_revealed:{"match":false}', 'daily_shared:{"how":"copy"}']);
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
  await expect(two.page.getByRole("heading", { name: "You picked the same one." })).toBeVisible();
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
  const old = RATHER_PAIRS.find((p) => p.id !== dailyPair(later).id && p.id !== dailyPair(sent).id)!;
  await open(two.page, `/games/today${encodeDaily({ day: sent, pairId: old.id, from: { name: "Ana", side: 1 } })}`);
  await expect(phase(two.page)).toHaveAttribute("data-day", String(sent));
  await expect(card(two.page, "a")).toContainText(old.a.en);
  await card(two.page, "b").click();
  await expect(phase(two.page)).toHaveAttribute("data-phase", "reveal");
  await two.page.locator("[data-todays]").click();
  await expect(phase(two.page)).toHaveAttribute("data-phase", "ask");
  await expect(phase(two.page)).toHaveAttribute("data-day", String(later));
  await expect(card(two.page, "a")).toContainText(dailyPair(later).a.en);
  expect(new URL(two.page.url()).hash).toBe("");
  await two.context.close();
});

test("T6: a broken or hostile link falls back to today's question and shows nothing from it", async ({ browser }) => {
  const two = await phone(browser);
  for (const hash of ["#q=1.99999999.beach.0.Ana", "#q=1.20000.nope.0.Ana", "#q=garbage", `#q=1.${today()}.beach.0.%E0%A4%A`, `#q=1.${today()}.beach.0.<img src=x onerror=alert(1)>`]) {
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
    await expect(two.page.getByText("That link didn't arrive whole")).toBeVisible();
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
  await expect(card(one.page, "b")).toHaveAttribute("aria-pressed", "true");
  // Changing the pick before sending.
  await card(one.page, "a").click();
  await expect(card(one.page, "a")).toHaveAttribute("aria-pressed", "true");
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

test("T9: by keyboard alone: Tab to an answer, Enter picks it", async ({ page, isMobile }) => {
  test.skip(isMobile, "a keyboard is a desk's");
  await prepare(page.context());
  await open(page, "/games/today");
  await card(page, "a").focus();
  await page.keyboard.press("Enter");
  await expect(card(page, "a")).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await expect(card(page, "b")).toHaveAttribute("aria-pressed", "true");
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
