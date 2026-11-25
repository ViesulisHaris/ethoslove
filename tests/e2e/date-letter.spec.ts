import { chromium, devices, expect, test, webkit, type APIRequestContext, type Page, type Route } from "@playwright/test";
import { measure, settle } from "./page-design";

/**
 * The date letter's box (PLAN-letter 5.2, B1-B15). A worktree has no database, so the box's GET and
 * POST are answered here (page.route); its states are drawn by /date-letter/preview. Tests marked
 * "on" need the server started with DATE_LETTER=on and skip without it; "off" ones the other way
 * round; the preview ones run either way. Each test sets its own screen sizes, so it runs in the
 * desktop project only.
 */

type Get = { available: boolean; email: string | null; state: "none" | "on" };
const NONE: Get = { available: true, email: null, state: "none" };

let mode: "on" | "off" | "absent" | null = null;
async function letter(request: APIRequestContext): Promise<"on" | "off" | "absent"> {
  if (mode) return mode;
  const res = await request.get("/date-letter/preview");
  if (res.status() === 404) return (mode = "absent");
  mode = (await res.text()).includes('data-date-letter="on"') ? "on" : "off";
  return mode;
}
async function needs(want: "on" | "off" | "dev", request: APIRequestContext) {
  const is = await letter(request);
  test.skip(is === "absent", "a production build has no preview page: these tests run against `npm run dev`");
  if (want === "on") test.skip(is !== "on", "needs the server started with DATE_LETTER=on");
  if (want === "off") test.skip(is !== "off", "needs the server started without DATE_LETTER");
}
test.beforeEach(({}, info) => {
  test.skip(info.project.name !== "desktop-chrome", "each test sets its own screen sizes: run once, in the desktop project");
});

/** Answers the box's GET and POST; `post` may be a status, an object, or "abort". Returns the POST bodies seen. */
async function answer(page: Page, get: Get | number | "hold" = NONE, post: { status?: number; json?: unknown; delay?: number } | "abort" = { json: { ok: true, state: "asked" } }) {
  const posts: unknown[] = [];
  const gets: string[] = [];
  await page.route("**/api/date-letter", async (route: Route) => {
    if (route.request().method() === "GET") {
      gets.push(route.request().url());
      if (get === "hold") return; // never answered
      if (typeof get === "number") return route.fulfill({ status: get, json: { error: "unavailable" } });
      return route.fulfill({ json: get });
    }
    posts.push(route.request().postDataJSON());
    if (post === "abort") return route.abort();
    if (post.delay) await new Promise((r) => setTimeout(r, post.delay));
    return route.fulfill({ status: post.status ?? 200, json: post.json ?? { error: "x" } });
  });
  return { posts, gets };
}

/** Scrolls to the end of the page, step by step, so anything waiting for the screen has seen it. */
async function toEnd(page: Page) {
  await page.evaluate(async () => {
    let last = -1;
    for (let i = 0; i < 60 && document.documentElement.scrollHeight !== last; i++) {
      last = document.documentElement.scrollHeight;
      for (let y = window.scrollY; y < last; y += window.innerHeight * 0.8) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 40));
      }
      window.scrollTo(0, document.documentElement.scrollHeight);
      await new Promise((r) => setTimeout(r, 150));
    }
  });
}

let blogPost: string | null = null;
async function pages(page: Page): Promise<string[]> {
  if (!blogPost) {
    await page.goto("/blog");
    blogPost = (await page.locator('main a[href^="/blog/"]').first().getAttribute("href")) ?? "/blog";
  }
  // Left off: /games (its Spanish hub reaches 301 words with the box; PLAN-letter step 8's rule), /plan
  // (empty, as a new visitor sees it, the page is so short the box would be in the first screen), and
  // /trips, a trip and /long-distance (each already far over 300 words without it: letter-C7).
  return ["/dates", "/dates/london", "/dates/london/first-date", "/dates/ideas/cheap", blogPost];
}

test("B1 (off) switched off, nothing of it exists", async ({ page, request }) => {
  await needs("off", request);
  test.setTimeout(240_000);
  const asked: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/date-letter")) asked.push(r.url());
  });
  for (const path of await pages(page)) {
    await page.goto(path);
    await toEnd(page);
    expect(await page.content(), path).not.toContain("data-letter-slot");
    expect(await page.locator("[data-letter-slot]").count(), path).toBe(0);
  }
  expect(asked).toEqual([]);
  for (const url of ["/api/date-letter", "/api/date-letter/confirm?t=x", "/api/date-letter/stop?t=x"]) {
    expect((await request.get(url)).status(), `GET ${url}`).toBe(404);
    expect((await request.post(url, { data: { email: "sam@mail.com" } })).status(), `POST ${url}`).toBe(404);
  }
});

test("B2 (on) one box a page, near its end, never in the first screen", async ({ page, request }) => {
  await needs("on", request);
  test.setTimeout(480_000);
  await answer(page);
  for (const size of [{ width: 375, height: 812 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(size);
    for (const path of await pages(page)) {
      await page.goto(path);
      await toEnd(page);
      const box = page.getByTestId("letter-box");
      await expect(box, `${path} ${size.width}`).toHaveCount(1);
      const facts = await box.evaluate((el) => {
        const top = el.getBoundingClientRect().top + window.scrollY;
        const stuck: string[] = [];
        for (let n: Element | null = el; n; n = n.parentElement) {
          const p = getComputedStyle(n).position;
          if (p === "fixed" || p === "sticky") stuck.push(`${n.tagName}.${n.className}`);
        }
        return { top, stuck, dialog: Boolean(el.closest('[role="dialog"], dialog')) };
      });
      // At or below the first screen's foot: /dates on a desk is a full-height map, and the box starts exactly where it ends.
      expect(facts.top, `${path} ${size.width}: the box's top`).toBeGreaterThanOrEqual(size.height);
      expect(facts.stuck, path).toEqual([]);
      expect(facts.dialog, path).toBe(false);
    }
  }
});

test("B3 (on) never where it must not be", async ({ page, request }) => {
  await needs("on", request);
  test.setTimeout(300_000);
  const { gets } = await answer(page);
  for (const path of ["/", "/pricing", "/templates", "/templates/the-letter", "/demo/the-letter", "/create/the-letter", "/gifts", "/plan", "/trips", "/trips/lisbon-slow-weekend", "/long-distance", "/games", "/games/today", "/games/weekly", "/games/truth-or-dare", "/login", "/legal/privacy"]) {
    await page.goto(path);
    await toEnd(page);
    expect(await page.locator("[data-letter-slot]").count(), path).toBe(0);
  }
  expect(gets).toEqual([]);
});

test("B4 (on) no list, no box, no gap", async ({ page, request }) => {
  await needs("on", request);
  const path = "/dates/ideas/cheap";
  const heightWith = async (get: Get | number | "hold") => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await answer(page, get);
    await page.goto(path);
    await toEnd(page);
    await page.waitForTimeout(500);
    const slot = await page.locator("[data-letter-slot]").evaluate((el) => el.getBoundingClientRect().height);
    return { slot, page: await page.evaluate(() => document.documentElement.scrollHeight) };
  };
  await page.setViewportSize({ width: 375, height: 812 });
  const never = await heightWith("hold");
  for (const get of [{ available: false, email: null, state: "none" } as Get, 503]) {
    const seen = await heightWith(get);
    expect(seen.slot, String(get)).toBe(0);
    expect(seen.page, String(get)).toBe(never.page);
  }
});

async function boxOn(page: Page, path: string) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(path);
  await toEnd(page);
  const box = page.getByTestId("letter-box");
  await box.scrollIntoViewIfNeeded();
  return box;
}

test("B5 (on) asking", async ({ page, request }) => {
  await needs("on", request);
  const { posts } = await answer(page, NONE, { json: { ok: true, state: "asked" }, delay: 400 });
  const box = await boxOn(page, "/dates/ideas/cheap");
  await box.getByTestId("letter-email").fill("sam@mail.com");
  await box.getByTestId("letter-send").click();
  await expect(box.getByTestId("letter-send")).toHaveAttribute("aria-disabled", "true");
  expect(await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).toBe("letter-send");
  await expect(box.getByTestId("letter-done")).toHaveText("Check your inbox. One tap there and you’re in.");
  expect(posts).toEqual([{ email: "sam@mail.com", locale: "en", path: "/dates/ideas/cheap" }]);
  expect(await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).toBe("letter-status");
});

test("B6 (on) in Spanish", async ({ page, request }) => {
  await needs("on", request);
  const { posts } = await answer(page);
  const box = await boxOn(page, "/es/dates/ideas/cheap");
  await expect(box).toContainText("La carta de citas");
  await expect(box).toContainText("Una idea de cita cada jueves. Date de baja cuando quieras.");
  await expect(box.getByTestId("letter-send")).toHaveText("Envíame la carta");
  await box.getByTestId("letter-email").fill("sam@mail.com");
  await box.getByTestId("letter-send").click();
  await expect(box.getByTestId("letter-done")).toHaveText("Mira tu correo. Un toque allí y ya está.");
  expect(posts).toEqual([{ email: "sam@mail.com", locale: "es", path: "/es/dates/ideas/cheap" }]);
});

test("B7 (on) when it does not go through", async ({ page, request }) => {
  await needs("on", request);
  for (const [post, line] of [
    [{ status: 400 }, "Check the email address."],
    [{ status: 429 }, "Too many tries. Try again later."],
    [{ status: 500 }, "That didn’t go through. Try again."],
    ["abort", "That didn’t go through. Try again."],
  ] as const) {
    await page.unrouteAll({ behavior: "ignoreErrors" });
    await answer(page, NONE, post);
    const box = await boxOn(page, "/dates/ideas/cheap");
    await box.getByTestId("letter-email").fill("sam@mail.com");
    await box.getByTestId("letter-send").click();
    const alert = box.getByRole("alert");
    await expect(alert, line).toHaveText(line);
    await expect(box.getByTestId("letter-email")).toHaveValue("sam@mail.com");
    expect(await page.evaluate(() => document.activeElement === document.body), line).toBe(false);
    if (line === "Check the email address.") expect(await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).toBe("letter-email");
  }
});

test("B8 (on) an empty press sends nothing", async ({ page, request }) => {
  await needs("on", request);
  const { posts } = await answer(page);
  const box = await boxOn(page, "/dates/ideas/cheap");
  await box.getByTestId("letter-send").click();
  await expect(box.getByRole("alert")).toHaveText("Check the email address.");
  expect(await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))).toBe("letter-email");
  await box.getByTestId("letter-email").fill("sam@mail");
  await box.getByTestId("letter-send").click();
  await page.waitForTimeout(300);
  expect(posts).toEqual([]);
});

test("B9 (on) signed in, the address is there and still has to be pressed", async ({ page, request }) => {
  await needs("on", request);
  const { posts } = await answer(page, { available: true, email: "sam@mail.com", state: "none" }, { json: { ok: true, state: "on" } });
  const box = await boxOn(page, "/dates/ideas/cheap");
  await expect(box.getByTestId("letter-email")).toHaveValue("sam@mail.com");
  await page.waitForTimeout(300);
  expect(posts).toEqual([]);
  await box.getByTestId("letter-send").click();
  await expect(box.getByTestId("letter-done")).toHaveText("You’re on the list. A date idea comes every Thursday.");
  expect(posts).toHaveLength(1);
});

test("B10 (on) already on the list", async ({ page, request }) => {
  await needs("on", request);
  await answer(page, { available: true, email: "sam@mail.com", state: "on" });
  const box = await boxOn(page, "/dates/ideas/cheap");
  await expect(box.getByTestId("letter-done")).toHaveText("You’re on the list. A date idea comes every Thursday.");
  await expect(box.getByTestId("letter-email")).toHaveCount(0);
  await expect(box.getByTestId("letter-send")).toHaveCount(0);
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test("B11 (dev) the box never changes height", async ({ page, request }) => {
  await needs("dev", request);
  test.setTimeout(240_000);
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const variant of ["card", "band"]) {
      for (const locale of ["", "/es"]) {
        const height = async (state: string) => {
          await page.goto(`${locale}/date-letter/preview?state=${state}&variant=${variant}`);
          return page.getByTestId("letter-box").evaluate((el) => el.getBoundingClientRect().height);
        };
        const empty = await height("empty");
        for (const state of ["sending", "asked", "on", "invalid", "limited", "failed"]) {
          expect(Math.abs((await height(state)) - empty), `${width} ${variant} ${locale || "/en"} ${state}`).toBeLessThanOrEqual(1);
        }
      }
    }
  }
});

test("B12 (on) by keyboard", async ({ page, request }) => {
  await needs("on", request);
  const { posts } = await answer(page);
  const box = await boxOn(page, "/dates/ideas/cheap");
  await box.getByRole("heading").click();
  const ring = () => page.evaluate(() => {
    const cs = getComputedStyle(document.activeElement!);
    return cs.boxShadow !== "none" || (cs.outlineStyle !== "none" && cs.outlineWidth !== "0px");
  });
  const focused = () => page.evaluate(() => document.activeElement?.getAttribute("data-testid") ?? document.activeElement?.textContent?.trim());
  await page.keyboard.press("Tab");
  expect(await focused()).toBe("letter-email");
  expect(await ring()).toBe(true);
  await page.keyboard.press("Tab");
  expect(await focused()).toBe("letter-send");
  expect(await ring()).toBe(true);
  await page.keyboard.press("Tab");
  expect(await focused()).toBe("Privacy");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.type("sam@mail.com");
  await page.keyboard.press("Enter");
  await expect(box.getByTestId("letter-done")).toBeVisible();
  expect(posts).toHaveLength(1);
  // Focus is on the line that says so; "Use another address" is just before it.
  expect(await focused()).toBe("letter-status");
  await page.keyboard.press("Shift+Tab");
  expect(await focused()).toBe("Use another address");
  await page.keyboard.press("Enter");
  await expect(box.getByTestId("letter-email")).toBeFocused();
  await expect(box.getByTestId("letter-email")).toHaveValue("");
});

test("B13 (dev) fits a phone, an iPhone included", async ({ page, request }) => {
  await needs("dev", request);
  test.setTimeout(180_000);
  const check = async (p: Page, label: string) => {
    for (const variant of ["card", "band"]) {
      for (const locale of ["", "/es"]) {
        await p.goto(`${locale}/date-letter/preview?variant=${variant}`);
        const facts = await p.evaluate(() => {
          const box = document.querySelector('[data-testid="letter-box"]')!;
          const h = (sel: string) => box.querySelector(sel)!.getBoundingClientRect().height;
          return {
            overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            field: h('[data-testid="letter-email"]'),
            button: h('[data-testid="letter-send"]'),
            privacy: h('a[href$="/legal/privacy#date-letter"]'),
            font: parseFloat(getComputedStyle(box.querySelector('[data-testid="letter-email"]')!).fontSize),
          };
        });
        const where = `${label} ${variant} ${locale || "/en"}`;
        expect(facts.overflow, where).toBeLessThanOrEqual(0);
        expect(facts.field, where).toBeGreaterThanOrEqual(44);
        expect(facts.button, where).toBeGreaterThanOrEqual(44);
        expect(facts.privacy, where).toBeGreaterThanOrEqual(44);
        expect(facts.font, where).toBeGreaterThanOrEqual(16);
      }
    }
  };
  for (const size of [{ width: 320, height: 568 }, { width: 375, height: 812 }]) {
    await page.setViewportSize(size);
    await check(page, String(size.width));
  }
  const iphone = await webkit.launch();
  try {
    const context = await iphone.newContext({ ...devices["iPhone 13"], baseURL: test.info().project.use.baseURL });
    await check(await context.newPage(), "iPhone 13");
  } finally {
    await iphone.close();
  }
  void chromium;
});

for (const size of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
  for (const locale of ["", "/es"]) {
    test(`B14 (on) the box keeps each page inside its words, and no flower lies on it: ${size.width} ${locale || "/en"}`, async ({ page, request }) => {
      await needs("on", request);
      test.setTimeout(600_000);
      await page.setViewportSize(size);
      // Every kind of page with the box. Not a blog post: an article is long-form under the blog's own
      // rules (docs/blog/RUBRIC.md), well over 300 words with or without the box; B14's last test
      // holds the box itself to twenty words there.
      for (const path of ["/dates", "/dates/london", "/dates/london/first-date", "/dates/ideas/cheap", "/dates/ideas/rainy-day", "/dates/ideas/first-date"]) {
        await page.unrouteAll({ behavior: "ignoreErrors" });
        await answer(page);
        await page.goto(`${locale}${path}`);
        await toEnd(page);
        await expect(page.getByTestId("letter-box")).toHaveCount(1);
        await settle(page);
        const m = await measure(page);
        const where = `${locale}${path} ${size.width}`;
        expect(m.count, `${where}: words`).toBeLessThanOrEqual(300);
        expect(m.overlaps, where).toEqual([]);
        expect(m.onCards, where).toEqual([]);
        expect(m.overflow, where).toBeLessThanOrEqual(0);
      }
    });
  }
}

test("B14 (on) on every page the box adds at most twenty words", async ({ page, request }) => {
  await needs("on", request);
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await answer(page);
  // The box's own visible words: counting the whole page twice reads lazy sections that may not have
  // arrived on one of the two loads, so the box is counted by itself.
  for (const path of await pages(page)) {
    await page.goto(path);
    await toEnd(page);
    const box = page.getByTestId("letter-box");
    await expect(box, path).toHaveCount(1);
    const words = await box.evaluate((el) => (el as HTMLElement).innerText.trim().split(/\s+/).filter(Boolean).length);
    expect(words, `${path}: words the box adds`).toBeLessThanOrEqual(20);
  }
});

test("B15 (on) links from the e-mails act on nothing without a real token", async ({ page, request }) => {
  await needs("on", request);
  for (const kind of ["confirm", "stop"]) {
    for (const [l, h1, home] of [
      ["en", /This link doesn’t work\.|Something went wrong\./, "Go to Ethos"],
      ["es", /Este enlace no funciona\.|Algo ha fallado\./, "Ir a Ethos"],
    ] as const) {
      const url = `/api/date-letter/${kind}?t=5f0c6f7e-3a55-4d2b-9a57-0e8a3f1b2c4d.forged&l=${l}`;
      const res = await page.goto(url);
      expect([404, 503], url).toContain(res!.status());
      await expect(page.locator("h1")).toHaveText(h1);
      await expect(page.locator("button")).toHaveCount(0);
      await expect(page.getByText(home)).toBeVisible();
      const oneClick = await request.post(url, { headers: { "content-type": "application/x-www-form-urlencoded" }, data: "List-Unsubscribe=One-Click" });
      expect([404, 503], `POST ${url}`).toContain(oneClick.status());
    }
  }
});
