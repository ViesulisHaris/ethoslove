import { devices, expect, test, webkit, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { GAME_MOVES, GAMES } from "../../src/lib/games/catalogue";
import { DARES, KNOW_QUESTIONS, RATHER_PAIRS, TRUTHS } from "../../src/lib/games/content";
import { dayOf } from "../../src/lib/games/daily";
import { DRAW_WORDS } from "../../src/lib/games/draw";
import { DECK_IDS, DECKS } from "../../src/lib/games/questions";
import { THIS_PAIRS } from "../../src/lib/games/this-or-that";
import { encodeWeekly, weekOf, weekStart, weeklyAskGame, weeklyCards, weeklySet } from "../../src/lib/games/weekly";
import { measure, settle } from "./page-design";

/**
 * games2: the games at the words people search for them (every old address one permanent redirect
 * away, its query kept), this week's challenge between two people in two browsers, and 300 visible
 * words a page. Nothing on the weekly page talks to a server, so nothing is mocked but the
 * clipboard, the share sheet and Vercel's counter (as tests/e2e/games-today.spec.ts).
 */

const DAY = 86_400_000;
const LIST_SHOWN = { know: 3, rather: 5, thisthat: 6, draw: 12, deck: 2, dare: 3 } as const;

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
      .filter((e) => e.name.startsWith("weekly_"))
      .map((e) => (e.data ? `${e.name}:${JSON.stringify(e.data)}` : e.name)),
  );

async function phone(browser: Browser, share: "none" | "ok" | "closed" = "none", options: Parameters<Browser["newContext"]>[0] = {}) {
  const context = await browser.newContext(options);
  await prepare(context, share);
  return { context, page: await context.newPage() };
}

/** Open a page and wait until the challenge has read its address (a tap before that would be a tap on the server's HTML). */
const open = async (page: Page, url: string) => {
  await page.goto(url);
  await expect(page.locator("[data-weekly][data-ready]")).toHaveCount(1);
};
const card = (page: Page, side: "a" | "b") => page.locator(`[data-weekly] [data-side=${side}]`).first();
const weekly = (page: Page) => page.locator("[data-weekly]");
const thisWeek = () => weekOf(dayOf(Date.now()));
const answer = async (page: Page, sides: ("a" | "b")[]) => {
  for (const side of sides) await card(page, side).click();
};

async function startOnePhone(page: Page, path: string) {
  await page.goto(path);
  const onePhone = page.getByRole("button", { name: /^(One phone|Un móvil)/ });
  if (await onePhone.isVisible().catch(() => false)) await onePhone.click();
  await page.getByLabel(/Your name|Tu nombre/).fill("Maya");
  await page.getByLabel(/Their name|Su nombre/).fill("Marco");
  await page.getByRole("button", { name: /^(Start|Empezar)$/ }).click();
}

/* ---- the addresses ---- */

test.describe("the games' addresses", () => {
  test("R1: every old address answers one permanent redirect that keeps the query, in both languages", async ({ request }) => {
    for (const prefix of ["", "/es"]) {
      for (const [from, to] of GAME_MOVES) {
        const old = await request.get(`${prefix}/games/${from}?room=ABCD&pack=deep`, { maxRedirects: 0 });
        expect(old.status(), `${prefix}/games/${from}`).toBe(308);
        expect(old.headers().location, `${prefix}/games/${from}`).toBe(`${prefix}/games/${to}?room=ABCD&pack=deep`);
        expect((await request.get(`${prefix}/games/${from}?room=ABCD&pack=deep`)).status(), `${prefix}/games/${to}`).toBe(200);
      }
    }
  });

  test("R2: an explicit /en keeps its /en, so the page opens in English even after Spanish was chosen", async ({ request, browser }) => {
    const old = await request.get("/en/games/know?mode=two", { maxRedirects: 0 });
    expect(old.status()).toBe(308);
    expect(old.headers().location).toBe("/en/games/how-well-do-you-know-me?mode=two");
    // The proxy then strips /en and sets the English cookie, as it does for every page.
    const next = await request.get("/en/games/how-well-do-you-know-me?mode=two", { maxRedirects: 0, headers: { cookie: "ETHOS_LOCALE=es" } });
    expect(next.headers().location).toBe("/games/how-well-do-you-know-me?mode=two");
    expect(next.headers()["set-cookie"] ?? "").toMatch(/ETHOS_LOCALE=en/);
    // In a browser that had visited the Spanish site first.
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/es/games/today");
    await page.goto("/en/games/dare");
    await expect(page).toHaveURL(/\/games\/truth-or-dare$/);
    expect(new URL(page.url()).pathname).toBe("/games/truth-or-dare");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await context.close();
  });

  test("R3: in every currency", async ({ request }) => {
    for (const country of ["US", "GB", "LV"]) {
      const old = await request.get("/games/rather", { headers: { "x-vercel-ip-country": country }, maxRedirects: 0 });
      expect(old.status(), country).toBe(308);
      expect(old.headers().location, country).toBe("/games/would-you-rather");
    }
  });

  test("R4: a room's link shared before the move opens the same room's door", async ({ page }) => {
    await page.goto("/games/rather?room=ABCD");
    await expect(page).toHaveURL(/\/games\/would-you-rather\?room=ABCD$/);
    await expect(page.getByText("Joining room ABCD")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Would you rather?");
    await page.goto("/es/games/know?room=ABCD");
    await expect(page).toHaveURL(/\/es\/games\/how-well-do-you-know-me\?room=ABCD$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("¿Cuánto me conoces?");
  });

  test("R5: a game begun at the new address is still there when its old address is opened", async ({ page }) => {
    await startOnePhone(page, "/games/would-you-rather");
    await page.getByTestId("choice-a").click();
    await expect(page.getByRole("button", { name: /^I’m Marco, go$/ })).toBeVisible();
    await page.goto("/games/rather");
    await expect(page).toHaveURL(/\/games\/would-you-rather$/);
    await expect(page.getByRole("button", { name: /^I’m Marco, go$/ })).toBeVisible();
  });

  test("R6: a pack's way back and the packs' anchor", async ({ page }) => {
    await page.goto("/games/deck?pack=deep#packs");
    await expect(page).toHaveURL(/\/games\/couple-questions-game\?pack=deep#packs$/);
    await page.goto("/games");
    await expect(page.locator('a[href="/games/couple-questions-game#packs"]')).toHaveCount(3);
  });

  test("R7: each new page names itself", async ({ request }) => {
    const old = new RegExp(`/games/(${GAME_MOVES.map(([from]) => from).join("|")})"`);
    for (const prefix of ["", "/es"]) {
      for (const g of GAMES) {
        const res = await request.get(`${prefix}${g.href}`, { maxRedirects: 0 });
        expect(res.status(), g.href).toBe(200);
        const html = await res.text();
        const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
        expect(canonical && new URL(canonical).pathname, `${prefix}${g.href}`).toBe(`${prefix}${g.href}`);
        for (const lang of ["en", "es", "x-default"]) expect(html, `${prefix}${g.href} ${lang}`).toMatch(new RegExp(`<link rel="alternate" hrefLang="${lang}"`, "i"));
        expect(html.match(old)?.[0] ?? null, `${prefix}${g.href}`).toBeNull();
      }
    }
  });
});

/* ---- the weekly challenge ---- */

for (const locale of ["", "/es"] as const) {
  const lang = locale ? "es" : "en";
  const words = locale
    ? { invited: "Ana ya ha respondido a las tres. Te toca, antes de verlas.", some: "Coincidís en 2 de 3. Preguntad por las que no.", step: (n: number) => `${n} de 3` }
    : { invited: "Ana has answered all three. Your turn, before you see them.", some: "You matched on 2 of 3. Ask about the ones you didn’t.", step: (n: number) => `${n} of 3` };

  test(`W1 ${lang}: the server's page holds this week's five cards as text`, async ({ request }) => {
    const html = (await (await request.get(`${locale}/games/weekly`)).text()).replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    // The set the server rendered with is this week's (or, in the minutes round the turn, last week's).
    const near = [thisWeek(), thisWeek() - 1].map((w) => weeklyCards(weeklySet(w)));
    expect(near.some((c) => html.includes(c.picks[0].a[lang]) && html.includes(c.picks[0].b[lang]) && html.includes(c.ask[lang]) && html.includes(c.dare[lang]))).toBe(true);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain(locale ? "El desafío de esta semana para dos" : "This week’s challenge for two");
    expect(html).not.toContain("#w=");
  });

  test(`W2 ${lang}: two people, two browsers`, async ({ browser }) => {
    const one = await phone(browser);
    const two = await phone(browser);
    const week = thisWeek();
    const set = weeklySet(week);
    const cards = weeklyCards(set);

    await open(one.page, `${locale}/games/weekly`);
    await expect(weekly(one.page)).toHaveAttribute("data-phase", "ask");
    await expect(one.page.locator("[data-step]")).toHaveText(words.step(1));
    await card(one.page, "a").click();
    await expect(one.page.locator("[data-step]")).toHaveText(words.step(2));
    await card(one.page, "b").click();
    await expect(one.page.locator("[data-step]")).toHaveText(words.step(3));
    await card(one.page, "a").click();
    await expect(weekly(one.page)).toHaveAttribute("data-phase", "answered");
    await expect(one.page.locator("[data-picks] li")).toHaveText([cards.picks[0].a[lang], cards.picks[1].b[lang], cards.picks[2].a[lang]]);
    await one.page.locator("[data-weekly] input").fill("Ana");
    await one.page.locator("[data-copy]").click();
    await expect(weekly(one.page)).toHaveAttribute("data-phase", "sent");
    const link = await copied(one.page);
    expect(link.endsWith(`${locale}/games/weekly#w=1.${week}.${set.id}.Ana.010`), link).toBe(true);
    expect(await events(one.page)).toEqual(["weekly_seen", "weekly_answered", 'weekly_shared:{"how":"copy"}']);

    await open(two.page, link);
    await expect(weekly(two.page)).toHaveAttribute("data-phase", "invited");
    await expect(two.page.getByText(words.invited)).toBeVisible();
    await expect(two.page.locator("[data-reveal-row]")).toHaveCount(0);
    // Nothing of Ana's picks on show beyond the first pair's two sides, which are the question itself.
    const shown = await weekly(two.page).innerText();
    for (const i of [1, 2]) for (const side of ["a", "b"] as const) expect(shown).not.toContain(cards.picks[i][side][lang]);
    await answer(two.page, ["b", "b", "a"]);
    await expect(weekly(two.page)).toHaveAttribute("data-phase", "reveal");
    await expect(two.page.getByRole("heading", { name: words.some })).toBeVisible();
    await expect(two.page.locator("[data-reveal-row]")).toHaveCount(3);
    await expect(two.page.locator("[data-reveal-row][data-same]")).toHaveCount(2);
    await expect(two.page.locator("[data-whole-game]")).toHaveAttribute("href", `${locale}/games/this-or-that`);
    await expect(two.page.locator(`a[href="${locale}/templates?ref=game-end"]`)).toHaveCount(1);
    await two.page.locator("[data-weekly] input").fill("Sam");
    await two.page.locator("[data-send]").click();
    await expect.poll(() => copied(two.page)).toMatch(/\.Sam\.110\.Ana\.010$/);
    const reply = await copied(two.page);

    await one.page.goto(reply);
    await one.page.reload();
    await expect(one.page.locator("[data-weekly][data-ready]")).toHaveCount(1);
    await expect(weekly(one.page)).toHaveAttribute("data-phase", "reveal");
    await expect(one.page.locator("[data-weekly] [aria-hidden=true] span").first()).toHaveText("Sam");

    expect(await events(two.page)).toEqual(["weekly_opened_shared", "weekly_answered", 'weekly_revealed:{"same":2}', 'weekly_shared:{"how":"copy"}']);
    await Promise.all([one.context.close(), two.context.close()]);
  });
}

test("W3: last week's link opens last week's set and says so", async ({ browser }) => {
  const later = thisWeek() + 3;
  const two = await phone(browser);
  await two.context.clock.setFixedTime(weekStart(later) * DAY + 3_600_000);
  const set = weeklySet(later - 1);
  await open(two.page, `/games/weekly${encodeWeekly({ week: later - 1, setId: set.id, from: { name: "Ana", picks: [0, 1, 0] } })}`);
  await expect(weekly(two.page)).toHaveAttribute("data-week", String(later - 1));
  await expect(two.page.locator("[data-when=last]")).toHaveText(`Last week: ${set.theme.en}`);
  await expect(two.page.getByRole("heading", { level: 1 })).toHaveText("Last week’s challenge for two");
  await expect(two.page.locator("[data-together=ask]")).toContainText(weeklyCards(set).ask.en);
  await expect(two.page.locator("[data-together=ask]")).toHaveAttribute("data-game", weeklyAskGame(set));
  // Nothing under it still speaks of this week (games2-T4).
  await expect(two.page.locator("#weekly-together + p")).toHaveText("For that week, once you have both answered. Out loud, not by text.");
  await expect(two.page.locator("[data-five]")).toHaveCount(0);
  await answer(two.page, ["a", "a", "a"]);
  await expect(weekly(two.page)).toHaveAttribute("data-phase", "reveal");
  await two.page.locator("[data-copy]").click();
  await two.page.locator("[data-this-weeks]").click();
  await expect(weekly(two.page)).toHaveAttribute("data-week", String(later));
  expect(new URL(two.page.url()).hash).toBe("");
  await expect(two.page.getByRole("heading", { level: 1 })).toHaveText("This week’s challenge for two");
  await expect(two.page.locator("#weekly-together + p")).toHaveText("For this week, once you have both answered. Out loud, not by text.");
  // The server rendered its own week's five cards, not the set this browser's clock is in (games2-D1).
  await expect(two.page.locator("[data-five]")).toHaveCount(0);
  await two.context.close();
});

test("W14: after the Monday turn, a page rendered before it never lists last week's five cards under this week's", async ({ browser }) => {
  // The page the server renders now, opened by a browser whose clock is already in the next week: as a
  // page rendered (or held by a cache) before the turn and read after it.
  const server = thisWeek();
  const next = await phone(browser);
  await next.context.clock.setFixedTime(weekStart(server + 1) * DAY + 3_600_000);
  await open(next.page, "/games/weekly");
  await expect(weekly(next.page)).toHaveAttribute("data-set", weeklySet(server + 1).id);
  await expect(next.page.locator("[data-together=ask]")).toContainText(weeklyCards(weeklySet(server + 1)).ask.en);
  await expect(next.page.locator("[data-five]")).toHaveCount(0);
  // In the server's own week the list is there, closed, and holds the week's five.
  const same = await phone(browser);
  await open(same.page, "/games/weekly");
  await expect(weekly(same.page)).toHaveAttribute("data-set", weeklySet(server).id);
  await expect(same.page.locator("[data-five] li")).toHaveCount(5);
  await expect(same.page.locator("[data-five] li").last()).toHaveText(weeklyCards(weeklySet(server)).dare.en);
  await Promise.all([next.context.close(), same.context.close()]);
});

test("W4: an older link names its week", async ({ browser }) => {
  const later = thisWeek() + 3;
  const two = await phone(browser);
  await two.context.clock.setFixedTime(weekStart(later) * DAY + 3_600_000);
  await open(two.page, `/games/weekly${encodeWeekly({ week: later - 3, setId: weeklySet(later - 3).id, from: { name: "Ana", picks: [0, 1, 0] } })}`);
  await expect(two.page.locator("[data-when=older]")).toHaveText(/^Week of .+: /);
  await expect(two.page.getByRole("heading", { level: 1 })).toHaveText("An earlier week’s challenge");
  await two.context.close();
});

test("W5: a link that did not arrive whole shows this week's and says so", async ({ page }) => {
  await open(page, "/games/weekly#w=1.zzz");
  await expect(weekly(page)).toHaveAttribute("data-phase", "ask");
  await expect(page.getByText("That link didn’t arrive whole, so here is this week’s challenge.")).toBeVisible();
});

test("W6: the tab's own link, opened again, is not a reveal against itself", async ({ browser }) => {
  const one = await phone(browser);
  await open(one.page, "/games/weekly");
  await answer(one.page, ["a", "b", "b"]);
  await one.page.locator("[data-copy]").click();
  const link = await copied(one.page);
  await one.page.goto(link);
  await expect(weekly(one.page)).toHaveAttribute("data-phase", "sent");
  await expect(one.page.getByRole("status")).toHaveText("This is the link you sent. They answer without seeing yours.");
  expect(await events(one.page)).not.toContain("weekly_opened_shared");
  await one.context.close();
});

test("W7: a reload keeps the picks; Back takes one off; Change them starts again", async ({ page }) => {
  await open(page, "/games/weekly");
  await answer(page, ["a", "b"]);
  await page.reload();
  await expect(page.locator("[data-weekly][data-ready]")).toHaveCount(1);
  await expect(page.locator("[data-step]")).toHaveText("3 of 3");
  await page.locator("[data-back]").click();
  await expect(page.locator("[data-step]")).toHaveText("2 of 3");
  await answer(page, ["a", "a"]);
  await expect(weekly(page)).toHaveAttribute("data-phase", "answered");
  await page.locator("[data-change]").click();
  await expect(page.locator("[data-step]")).toHaveText("1 of 3");
});

test("W8: changed after sending, the link must go again", async ({ browser }) => {
  const one = await phone(browser);
  await open(one.page, "/games/weekly");
  await answer(one.page, ["a", "a", "a"]);
  await one.page.locator("[data-copy]").click();
  await expect(weekly(one.page)).toHaveAttribute("data-phase", "sent");
  await one.page.locator("[data-change]").click();
  await answer(one.page, ["b", "b", "b"]);
  await expect(one.page.getByRole("status")).toHaveText("Changed. Send it again so they get the new picks.");
  await one.context.close();
});

test("W9: by keyboard", async ({ browser, isMobile }) => {
  test.skip(isMobile, "a keyboard is a desk's");
  const one = await phone(browser);
  const page = one.page;
  await open(page, "/games/weekly");
  for (let n = 0; n < 3; n++) {
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      if (await page.evaluate(() => !!document.activeElement?.matches("[data-weekly] button[data-side]"))) break;
    }
    await expect(page.locator("[data-weekly] button[data-side=a]").first()).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#weekly-question")).toBeFocused();
  }
  await expect(weekly(page)).toHaveAttribute("data-phase", "answered");
  await page.locator("[data-weekly] input").focus();
  await page.keyboard.type("Ana");
  await page.keyboard.press("Enter");
  await expect(weekly(page)).toHaveAttribute("data-phase", "sent");
  expect(await copied(page)).toMatch(/\.Ana\.000$/);
  await one.context.close();
});

test("W10: the turn of the week", async ({ browser }) => {
  const w = thisWeek() + 2;
  const before = await phone(browser);
  await before.context.clock.setFixedTime(weekStart(w + 1) * DAY - 10_000);
  const after = await phone(browser);
  await after.context.clock.setFixedTime(weekStart(w + 1) * DAY + 10_000);
  await open(before.page, "/games/weekly");
  await open(after.page, "/games/weekly");
  await expect(weekly(before.page)).toHaveAttribute("data-week", String(w));
  await expect(weekly(after.page)).toHaveAttribute("data-week", String(w + 1));
  expect(await weekly(before.page).getAttribute("data-set")).not.toBe(await weekly(after.page).getAttribute("data-set"));
  await Promise.all([before.context.close(), after.context.close()]);
});

test("W11: on the hub, beside today's question", async ({ page }) => {
  await page.goto("/games");
  await expect(page.locator("#pick > ul > li")).toHaveCount(GAMES.length + 2);
  const second = page.locator("#pick > ul > li").nth(1);
  await expect(second.locator('a[data-weekly-card][href="/games/weekly"]')).toContainText("This week’s challenge");
  await expect(page.getByText("Every one is quick")).toHaveCount(0);
  await page.goto("/es/games");
  await expect(page.locator('a[data-weekly-card][href="/es/games/weekly"]')).toContainText("El desafío de la semana");
});

test("W12: no banner and no recorder on the page", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  await prepare(context);
  const page = await context.newPage();
  // The locator is proved on a page that asks first, where the banner is switched on at all: it is
  // drawn only with a Clarity or Meta pixel id configured (isConfigured.cookieConsent), and a worktree has none.
  await page.goto("/games");
  await page.waitForTimeout(1500);
  if ((await page.locator("[data-consent-strip]").count()) === 0) test.info().annotations.push({ type: "note", description: "no pixel id configured: the banner is off everywhere, so its absence below proves only the page" });
  await open(page, "/games/weekly");
  await page.waitForTimeout(1500);
  await expect(page.locator("[data-consent-strip]")).toHaveCount(0);
  await context.close();
});

test("W13: an iPhone in Safari", async ({ baseURL, isMobile }) => {
  test.skip(isMobile, "one run is enough: this test brings its own iPhone");
  test.setTimeout(120_000);
  const browser = await webkit.launch();
  try {
    const origin = new URL(baseURL ?? "http://localhost:3000").origin;
    const context = await browser.newContext({ ...devices["iPhone 13"], baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
    const page = await context.newPage();
    await open(page, "/games/weekly");
    const first = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      below: [...document.querySelectorAll("[data-weekly] button[data-side]")].filter((el) => el.getBoundingClientRect().bottom > innerHeight).length,
    }));
    expect(first).toEqual({ overflow: 0, below: 0 });
    for (const side of ["a", "b", "a"] as const) await card(page, side).tap();
    await expect(weekly(page)).toHaveAttribute("data-phase", "answered");
    await expect(page.locator("[data-weekly] input")).toBeInViewport();
    await context.close();
  } finally {
    await browser.close();
  }
});

/* ---- less text ---- */

test.describe("less text", () => {
  test.skip(({ isMobile }) => isMobile, "the sizes are set here; one run is enough");

  test("G1: 300 words a page, on a desk and a phone, in both languages", async ({ page }) => {
    test.setTimeout(240_000);
    const paths = ["/games", "/games/today", "/games/weekly", ...GAMES.map((g) => g.href)];
    for (const [width, height] of [
      [1440, 900],
      [375, 812],
    ]) {
      await page.setViewportSize({ width, height });
      for (const prefix of ["", "/es"]) {
        for (const path of paths) {
          await page.goto(prefix + path);
          await settle(page);
          const { count } = await measure(page, "main");
          expect(count, `${prefix}${path} at ${width}x${height}`).toBeLessThanOrEqual(300);
        }
      }
    }
  });

  test("G2: every question is in the page; the first few on show, the rest one tap away", async ({ page }) => {
    test.setTimeout(120_000);
    const lists = {
      know: { id: "know-questions", total: KNOW_QUESTIONS.length },
      rather: { id: "rather-questions", total: RATHER_PAIRS.length },
      thisthat: { id: "thisthat-questions", total: THIS_PAIRS.length },
      draw: { id: "draw-words", total: DRAW_WORDS.length },
      deck: { id: "deck-questions", total: DECK_IDS.reduce((n, id) => n + DECKS[id].cards.length, 0) },
      dare: { id: "dare-questions", total: TRUTHS.length + DARES.length },
    };
    expect([lists.rather.total, lists.thisthat.total, lists.draw.total, lists.deck.total, lists.dare.total]).toEqual([150, 120, 40, 96, 100]);
    for (const prefix of ["", "/es"]) {
      for (const [key, { id, total }] of Object.entries(lists) as [keyof typeof LIST_SHOWN, { id: string; total: number }][]) {
        const href = GAMES.find((g) => g.key === key)!.href;
        await page.goto(prefix + href);
        const section = page.locator(`section[aria-labelledby="${id}"]`);
        await expect(section.locator("ol li"), key).toHaveCount(total);
        const more = section.locator("details[data-list-more]").first();
        await expect(more, key).not.toHaveAttribute("open", "");
        await expect(section.locator("[data-list-group] > ol").first().locator("li").last(), key).toBeVisible();
        await expect(more.locator("ol li").first(), key).toBeHidden();
        if (prefix) await expect(more.locator("summary"), key).toHaveText(/^\d+ más$/);
        await more.locator("summary").click();
        await expect(more.locator("ol li").first(), key).toBeVisible();
        await expect(more.locator("ol"), key).toHaveAttribute("start", String(LIST_SHOWN[key] + 1));
      }
    }
  });

  test("G3: the weekly page is a designed spread at every size, in every phase", async ({ browser }) => {
    test.setTimeout(240_000);
    const week = thisWeek();
    const set = weeklySet(week);
    const replyLink = `/games/weekly${encodeWeekly({ week, setId: set.id, from: { name: "Sam", picks: [1, 1, 0] }, to: { name: "Ana", picks: [0, 1, 0] } })}`;
    for (const [width, height] of [
      [320, 568],
      [375, 812],
      [768, 1024],
      [1024, 768],
      [1440, 900],
      [812, 375],
    ]) {
      const { context, page } = await phone(browser, "none", { viewport: { width, height } });
      for (const phase of ["ask", "answered", "reveal"] as const) {
        if (phase === "reveal") await open(page, replyLink);
        else {
          await open(page, "/games/weekly");
          if (phase === "answered") await answer(page, ["a", "b", "a"]);
        }
        await expect(weekly(page)).toHaveAttribute("data-phase", phase);
        await settle(page);
        const m = await measure(page);
        const at = `${phase} at ${width}x${height}`;
        expect(m.overflow, at).toBe(0);
        expect(m.overlaps, at).toEqual([]);
        expect(m.onCards, at).toEqual([]);
        expect(m.count, at).toBeLessThanOrEqual(300);
        expect(m.small, at).toEqual([]);
        // measure() reads the rank letters in the corners of the two small playing-card pictures
        // (weekly-together.tsx, aria-hidden art at 11px) as words; the words a reader reads are held to 14.
        const smallest = await page.evaluate(() => {
          let min = 99;
          const walker = document.createTreeWalker(document.querySelector("[data-page-theme]")!, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const el = node.parentElement;
            if (!node.textContent?.trim() || !el || !el.getClientRects().length || el.closest("[aria-hidden=true], .sr-only, details:not([open]) > :not(summary)")) continue;
            const cs = getComputedStyle(el);
            if (cs.textTransform !== "uppercase") min = Math.min(min, parseFloat(cs.fontSize));
          }
          return min;
        });
        expect(smallest, at).toBeGreaterThanOrEqual(14);
        expect(m.smallestLabel, at).toBeGreaterThanOrEqual(12);
        await expect(page.locator("h1"), at).toHaveCount(1);
        if (width === 1440) expect(m.decorInView, at).toBeGreaterThanOrEqual(1);
        // The next phase starts from a fresh tab.
        await page.evaluate(() => sessionStorage.clear());
      }
      await context.close();
    }
  });
});
