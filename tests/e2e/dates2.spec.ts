import { expect, test, type Page, type Request } from "@playwright/test";
import { LISBON, lisbonUrl, mockWorld, PLACES, ymd } from "./dates-world";

/**
 * What dates2 added to the Dates room (PLAN-dates2.md, BRIEF-dates2.md): indoors or outdoors and a
 * walking distance in the planner (the position granted, refused and missing), a date marked done on
 * /plan, its yes or no, the log and its one count, the hand-over to the timeline gift at three, a
 * place's "couples liked this" and "Book a table", the three new kinds, one new city pair, and the
 * page for venues. The world is mocked (dates-world.ts) and every request to the votes route and to
 * the saved dates is held and answered here: nothing leaves the machine.
 */
test.use({ timezoneId: "Europe/Lisbon" });

const at = (hour: number, minute: number): Date => {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate(), hour, minute));
};
const today = (): string => ymd(new Date());
const addDays = (day: string, n: number): string => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
/** /plan and the editor compile on their first visit to a dev server: longer than an assertion's usual wait. */
const PLAN_COMPILES = { timeout: 30_000 };
/** A point a little off Lisbon's centre that no mocked place sits on, so finding it in a request means the position leaked. */
const ME = { latitude: 38.7147, longitude: -9.1386 };
const LEAKS = ["38.7147", "-9.1386"];

async function pinClock(page: Page, time = at(17, 10)) {
  await page.clock.install({ time });
}
const planButton = (page: Page, name = "Plan it") => page.locator("[data-tonight], #tonight").getByRole("button", { name, exact: true });
const result = (page: Page) => page.locator("[data-tonight-result]");
const sentence = (page: Page) =>
  page.locator("[data-tonight] p.font-display, #tonight p.font-display").first().evaluate((p) => {
    const walk = (node: Node): string => {
      if (node instanceof HTMLSelectElement) return (node.selectedOptions[0]?.textContent ?? "").trim();
      if (node instanceof HTMLElement && node.classList.contains("sr-only")) return "";
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
      return [...node.childNodes].map(walk).join("");
    };
    return walk(p).replace(/\s+/g, " ").trim();
  });

async function catchEvents(page: Page) {
  await page.route((url) => url.hostname === "va.vercel-scripts.com" || url.pathname.startsWith("/_vercel/insights/"), (route) => route.abort());
  await page.addInitScript(() => {
    const w = window as unknown as { __counted: unknown[][]; va: (...args: unknown[]) => void };
    w.__counted = [];
    w.va = (...args: unknown[]) => {
      w.__counted.push(args);
    };
  });
  return () =>
    page.evaluate(() =>
      (window as unknown as { __counted: unknown[][] }).__counted.filter((call) => call[0] === "event").map((call) => call[1] as { name: string; data?: Record<string, unknown> }),
    );
}

type Votes = { available: boolean; liked?: Record<string, number>; posts: unknown[] };
/** The votes route and the saved dates, answered here. GET says whether votes are taken; POST bodies are kept. */
async function holdTheDatabase(page: Page, votes: Votes = { available: false, posts: [] }) {
  await page.route("**/api/dates/votes*", async (route) => {
    const req = route.request();
    if (req.method() === "POST") {
      votes.posts.push(req.postDataJSON());
      return route.fulfill({ json: votes.available ? { ok: true } : { available: false } });
    }
    return route.fulfill({ json: { available: votes.available, liked: votes.liked ?? {} } });
  });
  await page.route("**/api/saved-dates*", (route) => route.fulfill({ json: { unavailable: true } }));
  return votes;
}

/** Every request the page made, to check what left and what it carried. */
function recordRequests(page: Page): Request[] {
  const seen: Request[] = [];
  page.on("request", (r) => seen.push(r));
  return seen;
}
const MOCKED_HOSTS = ["upload.wikimedia.org", "tiles.openfreemap.org", "va.vercel-scripts.com"];
function onlyLocal(seen: Request[]) {
  for (const r of seen) {
    const host = new URL(r.url()).hostname;
    if (r.url().startsWith("data:") || r.url().startsWith("blob:")) continue;
    expect(host === "localhost" || MOCKED_HOSTS.includes(host), r.url()).toBe(true);
  }
}

/** The where box remembered, so a page by kind plans in Lisbon without asking. */
const rememberLisbon = (page: Page) => page.addInitScript(() => window.localStorage.setItem("ethos.dates.where.v1", JSON.stringify({ lat: 38.714, lng: -9.139, name: "Lisbon", share: true })));

/** A geolocation that answers with ME (or, "far", with New York), counting how often it was asked; or refuses; or is not there. */
async function geolocation(page: Page, how: "grant" | "far" | "refuse" | "none") {
  await page.addInitScript(
    ({ how, me }) => {
      const w = window as unknown as { __asked: number };
      w.__asked = 0;
      if (how === "none") {
        delete (Navigator.prototype as { geolocation?: unknown }).geolocation;
        return;
      }
      const fake = {
        getCurrentPosition(ok: PositionCallback, fail?: PositionErrorCallback) {
          w.__asked += 1;
          if (how === "refuse") setTimeout(() => fail?.({ code: 1, message: "denied", PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError), 10);
          else setTimeout(() => ok({ coords: { latitude: me.latitude, longitude: me.longitude, accuracy: 20, altitude: null, altitudeAccuracy: null, heading: null, speed: null, toJSON: () => ({}) }, timestamp: Date.now(), toJSON: () => ({}) } as GeolocationPosition), 10);
        },
        watchPosition: () => 0,
        clearWatch: () => undefined,
      };
      Object.defineProperty(Navigator.prototype, "geolocation", { configurable: true, get: () => fake });
    },
    { how, me: how === "far" ? { latitude: 40.7128, longitude: -74.006 } : ME },
  );
}
const asked = (page: Page) => page.evaluate(() => (window as unknown as { __asked?: number }).__asked ?? 0);

async function openLisbon(page: Page, url = `${lisbonUrl}&date=${today()}`) {
  await page.goto(url);
  await expect(page.getByRole("button", { name: /^Livraria do Bairro/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Bowling Alvalade/ })).toBeVisible();
}

/** A plan on this device, as /dates leaves it: two of the mocked places, the dinner idea. */
const PLAN_STOPS = [
  { id: "node/106", name: "Taberna Boa Noite", kind: "restaurant", lat: LISBON.lat + 0.0005, lng: LISBON.lng - 0.002, time: "19:00" },
  { id: "node/105", name: "Miradouro das Flores", kind: "viewpoint", lat: LISBON.lat - 0.002, lng: LISBON.lng + 0.001, time: "20:30" },
];
async function seedPlan(page: Page, plan: Record<string, unknown>) {
  await page.addInitScript((p) => {
    if (!window.sessionStorage.getItem("seeded-plan")) {
      window.localStorage.setItem("ethos.dates.plan.v1", JSON.stringify(p));
      window.sessionStorage.setItem("seeded-plan", "1");
    }
  }, plan);
}
const done = (day: string, title: string, places: string[] = ["node/106"]) => ({ id: `${day}:${places.join(",")}:${title}`, day, title, where: "Lisbon", idea: "pasta-and-a-slow-walk", places });
async function seedDone(page: Page, list: unknown[]) {
  await page.addInitScript((l) => {
    if (!window.sessionStorage.getItem("seeded-done")) {
      window.localStorage.setItem("ethos.dates.done.v1", JSON.stringify(l));
      window.sessionStorage.setItem("seeded-done", "1");
    }
  }, list);
}

test.describe("dates2: the planner's two new controls", () => {
  test("G1 the two controls are in the planner's sentence, each named once", async ({ page }) => {
    test.setTimeout(90_000);
    await mockWorld(page);
    await holdTheDatabase(page);
    await pinClock(page);
    await rememberLisbon(page);
    for (const url of [`${lisbonUrl}&date=${today()}`, "/dates/london", "/dates/ideas/night"]) {
      await page.goto(url);
      const p = page.locator("[data-tonight] p.font-display, #tonight p.font-display").first();
      for (const name of ["Indoors or outdoors", "Distance"]) {
        await expect(page.getByRole("combobox", { name })).toHaveCount(1);
        await expect(p.getByRole("combobox", { name })).toBeVisible();
      }
      expect(await sentence(page), url).toMatch(/\. In or out, any distance\.$/);
    }
  });

  test("G2 indoors on a dry day, outdoors on a wet one", async ({ page }) => {
    test.setTimeout(90_000);
    for (const wet of [false, true]) {
      await page.unrouteAll({ behavior: "ignoreErrors" });
      await mockWorld(page, { wet });
      await holdTheDatabase(page);
      await pinClock(page);
      await openLisbon(page);
      const band = page.locator("[data-tonight]");
      await band.getByRole("combobox", { name: "When" }).selectOption("tomorrow");
      const setting = band.getByRole("combobox", { name: "Indoors or outdoors" });
      const heading = result(page).getByRole("heading");
      // The choice is kept between visits: the wet half starts from "either" again.
      await setting.selectOption("");
      if (!wet) {
        await planButton(page).click();
        await expect(heading).toHaveText("Golden hour picnic");
        await setting.selectOption("indoors");
        await planButton(page).click();
        // The first idea that has a roof: the dinner, with its dry stops (lib/dates/ideas.ts underARoof), never the viewpoint.
        await expect(heading).toHaveText("Dinner, then dessert somewhere dry");
        await expect(result(page)).not.toContainText("Miradouro das Flores");
      } else {
        await planButton(page).click();
        await expect(heading).not.toHaveText("Golden hour picnic");
        await expect(result(page)).toContainText("Rain is likely tomorrow, so this one is under a roof.");
        await setting.selectOption("outdoors");
        await planButton(page).click();
        await expect(heading).toHaveText("Golden hour picnic");
        await expect(result(page)).toContainText("Rain is likely tomorrow. You asked for outdoors, so take a coat.");
      }
    }
  });

  test("G3 position granted: the walk narrows the plan, and the position goes nowhere", async ({ page }) => {
    const seen = recordRequests(page);
    const events = await catchEvents(page);
    await mockWorld(page);
    await holdTheDatabase(page);
    await pinClock(page);
    await geolocation(page, "grant");
    await openLisbon(page);
    const firstSearch = seen.findIndex((r) => r.url().includes("/api/dates/search"));
    const band = page.locator("[data-tonight]");
    await band.getByRole("combobox", { name: "Mood" }).selectOption("playful");
    await planButton(page).click();
    await expect(result(page)).toContainText("Bowling Alvalade");
    expect(await asked(page)).toBe(0);
    await band.getByRole("combobox", { name: "Distance" }).selectOption("10");
    await expect.poll(() => asked(page)).toBeGreaterThan(0);
    await planButton(page).click();
    await expect(result(page).getByRole("heading")).toBeVisible();
    await expect(result(page)).not.toContainText("Bowling Alvalade");
    const named = await result(page).locator("li").allTextContents();
    const ours = PLACES.map((p) => p.name);
    for (const line of named) expect(ours.some((n) => line.includes(n)) || !/[A-Z][a-z]+ [A-Z]/.test(line), line).toBe(true);

    for (const r of seen.slice(firstSearch + 1)) for (const leak of LEAKS) expect(`${r.url()} ${r.postData() ?? ""}`, r.url()).not.toContain(leak);
    for (const e of await events()) for (const key of Object.keys(e.data ?? {})) expect(["mood", "budget", "when", "kind", "city"]).toContain(key);
    const storage = await page.evaluate(() => ({ local: { ...window.localStorage }, session: { ...window.sessionStorage } }));
    for (const value of [...Object.values(storage.local), ...Object.values(storage.session)]) for (const leak of LEAKS) expect(value).not.toContain(leak);
    expect(JSON.parse(storage.local["ethos.dates.picker.v1"])).toEqual({ reach: 10 });
    expect(storage.session["ethos.dates.tonight.v1"]).toBeUndefined();
  });

  test("G4 position refused: the distance goes back to any and the line says so", async ({ page }) => {
    await mockWorld(page);
    await holdTheDatabase(page);
    await pinClock(page);
    await geolocation(page, "refuse");
    await openLisbon(page);
    await planButton(page).click();
    const plain = await result(page).getByRole("heading").textContent();
    const reach = page.locator("[data-tonight]").getByRole("combobox", { name: "Distance" });
    await reach.selectOption("10");
    await expect(page.getByText("We couldn’t get your position, so distance is off. Nothing else changed.")).toBeVisible();
    await expect(reach).toHaveValue("");
    await planButton(page).click();
    await expect(result(page).getByRole("heading")).toHaveText(plain ?? "");
  });

  test("G4b a position an ocean away: the distance goes back to any, says why, and the plan is the plain one (dates2-C6)", async ({ page }) => {
    await mockWorld(page);
    await holdTheDatabase(page);
    await pinClock(page);
    await geolocation(page, "far");
    await openLisbon(page);
    await planButton(page).click();
    const plain = await result(page).getByRole("heading").textContent();
    const reach = page.locator("[data-tonight]").getByRole("combobox", { name: "Distance" });
    await reach.selectOption("30");
    await expect.poll(() => asked(page)).toBeGreaterThan(0);
    await planButton(page).click();
    await expect(page.getByText("You’re more than a half-hour walk from these places, so distance is off.")).toBeVisible();
    await expect(reach).toHaveValue("");
    await expect(result(page).getByRole("heading")).toHaveText(plain ?? "");
    await expect(page.getByText(/Try a longer walk/)).toHaveCount(0);
  });

  test("G5 position unavailable: no distance, and the button does not move", async ({ browser, isMobile }) => {
    test.skip(isMobile, "sets its own screen size");
    const top = async (how: "grant" | "none") => {
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, timezoneId: "Europe/Lisbon" });
      const page = await context.newPage();
      await mockWorld(page);
      await holdTheDatabase(page);
      await pinClock(page);
      await geolocation(page, how);
      await openLisbon(page);
      if (how === "none") {
        await expect(page.getByRole("combobox", { name: "Distance" })).toHaveCount(0);
        expect(await sentence(page)).toMatch(/\. In or out\.$/);
      }
      const y = await planButton(page).evaluate((b) => b.getBoundingClientRect().top + window.scrollY);
      await context.close();
      return y;
    };
    expect(Math.abs((await top("none")) - (await top("grant")))).toBeLessThanOrEqual(1);
  });

  test("G6 the choices are kept across rooms, nothing is asked on load, and nothing jumps", async ({ browser, isMobile }) => {
    test.skip(isMobile, "sets its own screen sizes");
    test.setTimeout(120_000);
    for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 800 }]) {
      const fresh = await browser.newContext({ viewport, timezoneId: "Europe/Lisbon" });
      const before = await fresh.newPage();
      await mockWorld(before);
      await holdTheDatabase(before);
      await pinClock(before);
      await rememberLisbon(before);
      await geolocation(before, "grant");
      await before.goto("/dates/ideas/fun");
      const plainTop = await planButton(before).evaluate((b) => b.getBoundingClientRect().top + window.scrollY);
      await fresh.close();

      const context = await browser.newContext({ viewport, timezoneId: "Europe/Lisbon" });
      const page = await context.newPage();
      await mockWorld(page);
      await holdTheDatabase(page);
      await pinClock(page);
      await rememberLisbon(page);
      await geolocation(page, "grant");
      await page.goto("/dates/ideas/night");
      const band = page.locator("#tonight");
      await band.getByRole("combobox", { name: "Indoors or outdoors" }).selectOption("outdoors");
      await band.getByRole("combobox", { name: "Distance" }).selectOption("20");
      await expect.poll(() => asked(page)).toBe(1);
      await page.goto("/games");
      await page.goto("/dates/ideas/fun");
      await expect(band.getByRole("combobox", { name: "Indoors or outdoors" })).toHaveValue("outdoors");
      await expect(band.getByRole("combobox", { name: "Distance" })).toHaveValue("20");
      expect(await asked(page)).toBe(0);
      const keptTop = await planButton(page).evaluate((b) => b.getBoundingClientRect().top + window.scrollY);
      expect(Math.abs(keptTop - plainTop), `${viewport.width}: ${plainTop} then ${keptTop}`).toBeLessThanOrEqual(1);
      await planButton(page).click();
      await expect.poll(() => asked(page)).toBe(1);
      await context.close();
    }
  });
});

test.describe("dates2: done dates on /plan", () => {
  test("G7 a date marked done, and taken back", async ({ page }) => {
    const seen = recordRequests(page);
    await holdTheDatabase(page);
    await seedPlan(page, { v: 1, date: today(), where: "Lisbon", idea: "pasta-and-a-slow-walk", stops: PLAN_STOPS });
    await page.goto("/plan");
    const mark = page.getByRole("button", { name: "Mark as done" });
    await expect(mark).toBeVisible(PLAN_COMPILES);
    await mark.click();
    await expect(page.getByText(/^Done on /)).toBeVisible();
    const log = page.getByTestId("done-log");
    await expect(log.getByRole("heading", { name: "Dates you’ve done" })).toBeVisible();
    await expect(log.locator("ol > li")).toHaveCount(1);
    expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem("ethos.dates.done.v1") ?? "[]").length)).toBe(1);
    await page.reload();
    await expect(page.getByText(/^Done on /)).toBeVisible(PLAN_COMPILES);
    await page.getByRole("button", { name: "Not done after all" }).click();
    await expect(page.getByRole("button", { name: "Mark as done" })).toBeVisible();
    await expect(log).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem("ethos.dates.done.v1") ?? "[]").length)).toBe(0);
    onlyLocal(seen);
  });

  test("G7b a quick double tap on Mark as done leaves it done (dates2-T1)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await holdTheDatabase(page);
    await seedPlan(page, { v: 1, date: today(), where: "Lisbon", idea: "pasta-and-a-slow-walk", stops: PLAN_STOPS });
    await page.goto("/plan");
    const mark = page.getByRole("button", { name: "Mark as done" });
    await expect(mark).toBeVisible(PLAN_COMPILES);
    await mark.scrollIntoViewIfNeeded();
    const box = (await mark.boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.click(x, y);
    await page.waitForTimeout(150);
    await page.mouse.click(x, y);
    await page.waitForTimeout(400);
    await expect(page.getByText(/^Done on /)).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem("ethos.dates.done.v1") ?? "[]").length)).toBe(1);
    // A deliberate tap later still takes it back.
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Not done after all" }).click();
    await expect(page.getByRole("button", { name: "Mark as done" })).toBeVisible();
  });

  test("G7c taken back after a stop was changed: the log loses that date too (dates2-T2)", async ({ page }) => {
    await holdTheDatabase(page);
    await seedPlan(page, { v: 1, date: today(), where: "Lisbon", idea: "pasta-and-a-slow-walk", stops: PLAN_STOPS });
    await page.goto("/plan");
    await page.getByRole("button", { name: "Mark as done" }).click(PLAN_COMPILES);
    const log = page.getByTestId("done-log");
    await expect(log.locator("ol > li")).toHaveCount(1);
    await page.getByRole("button", { name: "Take Taberna Boa Noite out of the plan" }).click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Not done after all" }).click();
    await expect(page.getByRole("button", { name: "Mark as done" })).toBeVisible();
    await expect(log).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem("ethos.dates.done.v1") ?? "[]").length)).toBe(0);
    // Marked again: one entry, not two.
    await page.getByRole("button", { name: "Mark as done" }).click();
    await expect(log.locator("ol > li")).toHaveCount(1);
  });

  test("G7 a plan dated tomorrow cannot be marked done", async ({ page }) => {
    await holdTheDatabase(page);
    await seedPlan(page, { v: 1, date: addDays(today(), 1), where: "Lisbon", stops: PLAN_STOPS });
    await page.goto("/plan");
    await expect(page.getByRole("heading", { level: 2, name: "Taberna Boa Noite" })).toBeVisible(PLAN_COMPILES);
    await expect(page.getByRole("button", { name: "Mark as done" })).toHaveCount(0);
  });

  test("G8 the vote: asked only where votes are taken, one POST a change", async ({ page }) => {
    const events = await catchEvents(page);
    const votes = await holdTheDatabase(page, { available: true, posts: [] });
    await seedPlan(page, { v: 1, date: today(), where: "Lisbon", idea: "pasta-and-a-slow-walk", stops: PLAN_STOPS });
    await page.goto("/plan");
    await page.getByRole("button", { name: "Mark as done" }).click(PLAN_COMPILES);
    const done = page.getByTestId("plan-done");
    await expect(done.getByText("Was this a good date?")).toBeVisible();
    const yes = done.getByRole("button", { name: "Yes", exact: true });
    const no = done.getByRole("button", { name: "No", exact: true });
    await yes.click();
    await expect(yes).toHaveAttribute("aria-pressed", "true");
    await expect(done.getByText("Noted. You can change it.")).toBeVisible();
    await expect.poll(() => votes.posts.length).toBe(1);
    const first = (votes.posts[0] as { changes: { target: string; yes: number; no: number }[] }).changes;
    expect(first.length).toBe(3);
    for (const c of first) expect([c.yes, c.no]).toEqual([1, 0]);
    expect(first.map((c) => c.target).sort()).toEqual(["idea:pasta-and-a-slow-walk", "place:node/105", "place:node/106"]);
    await no.click();
    await expect.poll(() => votes.posts.length).toBe(2);
    for (const c of (votes.posts[1] as { changes: { yes: number; no: number }[] }).changes) expect([c.yes, c.no]).toEqual([-1, 1]);
    await no.click();
    await page.waitForTimeout(300);
    expect(votes.posts.length).toBe(2);
    await expect(page.getByTestId("done-log")).toContainText("Not this time");
    // Asked once on the screen: the plan's own row in the log says the answer and asks nothing (dates2-T12).
    await expect(page.getByTestId("done-log").getByRole("button", { name: "Yes", exact: true })).toHaveCount(0);
    await expect(done.getByRole("group", { name: "Was this a good date?" })).toBeVisible();
    // G17: what was counted.
    const counted = await events();
    expect(counted.filter((e) => e.name === "date_done")).toEqual([{ name: "date_done" }]);
    expect(counted.filter((e) => e.name === "date_vote")).toEqual([{ name: "date_vote", data: { vote: "yes" } }, { name: "date_vote", data: { vote: "no" } }]);
  });

  test("G8 where votes are not taken, nothing is asked and nothing is sent", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => (m.type() === "error" ? errors.push(m.text()) : undefined));
    page.on("pageerror", (e) => errors.push(e.message));
    const votes = await holdTheDatabase(page, { available: false, posts: [] });
    await seedPlan(page, { v: 1, date: today(), where: "Lisbon", idea: "pasta-and-a-slow-walk", stops: PLAN_STOPS });
    await page.goto("/plan");
    await page.getByRole("button", { name: "Mark as done" }).click(PLAN_COMPILES);
    await expect(page.getByText(/^Done on /)).toBeVisible();
    await page.waitForTimeout(800);
    await expect(page.getByText("Was this a good date?")).toHaveCount(0);
    await expect(page.getByTestId("done-log").getByRole("button", { name: "Yes", exact: true })).toHaveCount(0);
    expect(votes.posts).toEqual([]);
    expect(errors.filter((e) => !/Download the React DevTools|\[HMR\]|webpack/i.test(e))).toEqual([]);
  });

  test("G8b in the log: a group named by its date, the answer in words, and Change to show the pills again (dates2-C18, T12)", async ({ page }) => {
    const votes = await holdTheDatabase(page, { available: true, posts: [] });
    await seedDone(page, [done(today(), "Gallery hop", ["node/105"]), done(addDays(today(), -7), "Bowling", ["node/106"])]);
    await page.goto("/plan");
    const log = page.getByTestId("done-log");
    const group = log.getByRole("group", { name: "Was this a good date? Gallery hop" });
    await expect(group).toBeVisible(PLAN_COMPILES);
    await expect(log.getByRole("group")).toHaveCount(2);
    await group.getByRole("button", { name: "Yes", exact: true }).click();
    await expect.poll(() => votes.posts.length).toBe(1);
    await expect(group).toHaveCount(0);
    await expect(log).toContainText("A good one");
    await log.getByRole("button", { name: "Change your answer for Gallery hop" }).click();
    await expect(group.getByRole("button", { name: "Yes", exact: true })).toHaveAttribute("aria-pressed", "true");
    await group.getByRole("button", { name: "No", exact: true }).click();
    await expect.poll(() => votes.posts.length).toBe(2);
    await expect(log).toContainText("Not this time");
  });

  test("G8c an answer stays with its date; taking the date back takes its answer off (dates2-D3, D6)", async ({ page }) => {
    const votes = await holdTheDatabase(page, { available: true, posts: [] });
    // An older date at the miradouro, then tonight's plan, which stops there too.
    await seedDone(page, [done(addDays(today(), -21), "Sunset at the miradouro", ["node/105"])]);
    await seedPlan(page, { v: 1, date: today(), where: "Lisbon", idea: "pasta-and-a-slow-walk", stops: PLAN_STOPS });
    await page.goto("/plan");
    await page.getByRole("button", { name: "Mark as done" }).click(PLAN_COMPILES);
    const plan = page.getByTestId("plan-done");
    await plan.getByRole("button", { name: "Yes", exact: true }).click();
    await expect.poll(() => votes.posts.length).toBe(1);
    // The older row still asks: it was never answered.
    const log = page.getByTestId("done-log");
    const older = log.getByRole("group", { name: "Was this a good date? Sunset at the miradouro" });
    await expect(older).toBeVisible();
    await expect(log.getByRole("listitem").filter({ hasText: "Sunset at the miradouro" })).not.toContainText("A good one");
    // Not done after all: the yes comes off every place it was on.
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Not done after all" }).click();
    await expect.poll(() => votes.posts.length).toBe(2);
    const back = (votes.posts[1] as { changes: { target: string; yes: number; no: number }[] }).changes;
    expect(back.map((c) => c.target).sort()).toEqual(["idea:pasta-and-a-slow-walk", "place:node/105", "place:node/106"]);
    for (const c of back) expect([c.yes, c.no]).toEqual([-1, 0]);
    expect(await page.evaluate(() => window.localStorage.getItem("ethos.dates.votes.v1"))).toBe("{}");
    // A row answered and then removed from the log: the same.
    await older.getByRole("button", { name: "No", exact: true }).click();
    await expect.poll(() => votes.posts.length).toBe(3);
    await log.getByRole("button", { name: "Take Sunset at the miradouro off the list" }).click();
    await expect.poll(() => votes.posts.length).toBe(4);
    for (const c of (votes.posts[3] as { changes: { yes: number; no: number }[] }).changes) expect([c.yes, c.no]).toEqual([0, -1]);
  });

  test("G8d focus stays with the work when the pressed button goes away (dates2-D4)", async ({ page }) => {
    await holdTheDatabase(page, { available: true, posts: [] });
    await seedDone(page, [done(addDays(today(), -7), "Bowling", ["node/106"]), done(addDays(today(), -14), "Gallery hop", ["node/105"])]);
    await seedPlan(page, { v: 1, date: today(), where: "Lisbon", idea: "pasta-and-a-slow-walk", stops: PLAN_STOPS });
    await page.goto("/plan");
    const focused = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute("aria-label") || document.activeElement?.textContent?.trim() || document.activeElement?.tagName);
    await page.getByRole("button", { name: "Mark as done" }).focus(PLAN_COMPILES);
    await page.keyboard.press("Enter");
    await expect.poll(focused).toBe("Not done after all");
    await page.waitForTimeout(800);
    await page.keyboard.press("Enter");
    await expect.poll(focused).toBe("Mark as done");
    const log = page.getByTestId("done-log");
    await log.getByRole("group", { name: "Was this a good date? Bowling" }).getByRole("button", { name: "Yes", exact: true }).click();
    await expect.poll(focused).toBe("Change your answer for Bowling");
    await page.keyboard.press("Enter");
    await expect.poll(focused).toBe("Yes");
    // A row removed: the next row's first control, Gallery hop's Yes.
    await log.getByRole("button", { name: "Take Bowling off the list" }).click();
    await expect.poll(() => page.evaluate(() => document.activeElement?.closest("[role=group]")?.getAttribute("aria-label"))).toBe("Was this a good date? Gallery hop");
    await log.getByRole("button", { name: "Take Gallery hop off the list" }).click();
    // The last one gone, the log with it: the next card's heading.
    await expect(log).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("plan-send-title");
  });

  test("G8e a vote that is not kept says so, where it was made (dates2-D5)", async ({ page }) => {
    await holdTheDatabase(page, { available: true, posts: [] });
    await page.route("**/api/dates/votes", (route) => (route.request().method() === "POST" ? route.fulfill({ status: 503, json: { error: "unavailable" } }) : route.fallback()));
    await seedPlan(page, { v: 1, date: today(), where: "Lisbon", idea: "pasta-and-a-slow-walk", stops: PLAN_STOPS });
    await page.goto("/plan");
    await page.getByRole("button", { name: "Mark as done" }).click(PLAN_COMPILES);
    const plan = page.getByTestId("plan-done");
    const yes = plan.getByRole("button", { name: "Yes", exact: true });
    await yes.click();
    await expect(plan.getByText("Not saved. Try again in a moment.")).toBeVisible();
    await expect(yes).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("done-log")).not.toContainText("A good one");
  });

    test("G9 the log and its one count", async ({ page }) => {
    await holdTheDatabase(page);
    const t = today();
    const year = t.slice(0, 4);
    // Three in this year that are not three weeks in a row (or this is early January: then only the count by year is checked loosely).
    await seedDone(page, [done(`${year}-01-01`, "New year walk"), done(`${year}-01-20`, "Bowling"), done(`${year}-02-25`, "Gallery hop")]);
    await page.goto("/plan");
    const log = page.getByTestId("done-log");
    await expect(log.getByRole("heading", { name: "Dates you’ve done" })).toBeVisible(PLAN_COMPILES);
    // No plan: the log sits under "Nothing planned yet".
    if (t >= `${year}-03-20`) await expect(log).toContainText("3 dates this year");
    await expect(log.locator("ol > li")).toHaveCount(3);

    await page.evaluate((list) => window.localStorage.setItem("ethos.dates.done.v1", JSON.stringify(list)), [done(t, "This week"), done(addDays(t, -7), "Last week"), done(addDays(t, -14), "The week before")]);
    await page.reload();
    await expect(log).toContainText("3 weeks in a row", PLAN_COMPILES);
  });

  test("G10 the hand-over: none at two, one at three, and the editor takes the dates", async ({ page }) => {
    test.setTimeout(120_000);
    const events = await catchEvents(page);
    await holdTheDatabase(page);
    const t = today();
    await seedDone(page, [done(addDays(t, -1), "Dinner, then the long way home"), done(addDays(t, -9), "Bowling, bumpers optional")]);
    await page.goto("/plan");
    const log = page.getByTestId("done-log");
    await expect(log).toBeVisible(PLAN_COMPILES);
    await expect(log.getByRole("link", { name: "Start the gift" })).toHaveCount(0);
    await page.evaluate((entry) => {
      const list = JSON.parse(window.localStorage.getItem("ethos.dates.done.v1") ?? "[]");
      window.localStorage.setItem("ethos.dates.done.v1", JSON.stringify([...list, entry]));
    }, done(addDays(t, -20), "Gallery hop"));
    await page.reload();
    const start = log.getByRole("link", { name: "Start the gift" });
    await expect(start).toHaveCount(1, PLAN_COMPILES);
    await expect(log).toContainText("3 dates done. Add a photo of each and they make a timeline.");
    const labels = await page.evaluate(() => JSON.parse(window.localStorage.getItem("ethos.dates.done.v1") ?? "[]").length);
    expect(labels).toBe(3);
    await start.click();
    await expect(page).toHaveURL(/\/create\/our-timeline/, { timeout: 60_000 });
    await expect
      .poll(async () => page.getByRole("textbox", { name: /^Milestone dates \d+$/ }).evaluateAll((boxes) => boxes.map((b) => (b as HTMLTextAreaElement).value)), { timeout: 60_000 })
      .toEqual([expect.stringContaining("Gallery hop"), expect.stringContaining("Bowling"), expect.stringContaining("Dinner")]);
    expect((await events()).filter((e) => e.name === "done_dates_gift")).toEqual([{ name: "done_dates_gift" }]);
  });
});

test.describe("dates2: a place's sheet", () => {
  async function openSheet(page: Page, name: string) {
    await page.getByRole("button", { name: new RegExp(`^${name}`) }).first().click();
    const sheet = page.locator("[data-place-sheet]");
    await expect(sheet.getByRole("heading", { name })).toBeVisible();
    return sheet;
  }

  test("G11 a place five couples liked says how many; another says nothing", async ({ page }) => {
    await mockWorld(page);
    await holdTheDatabase(page, { available: true, liked: { "place:node/101": 14 }, posts: [] });
    await page.route("**/api/dates/votes*", (route) => {
      const t = new URL(route.request().url()).searchParams.get("t") ?? "";
      return route.fulfill({ json: { available: true, liked: t.includes("node/101") ? { "place:node/101": 14 } : {} } });
    });
    await pinClock(page);
    await openLisbon(page);
    const sheet = await openSheet(page, "Livraria do Bairro");
    await expect(sheet.getByText("14 couples said it was a good date")).toBeVisible();
    // Inside "Couples say", beside the stars it could be mistaken for (dates2-T14).
    await expect(sheet.getByRole("region", { name: "Couples say" }).getByTestId("place-liked")).toBeVisible();
    await sheet.getByRole("button", { name: "Close" }).click();
    const other = await openSheet(page, "Café da Esquina");
    await page.waitForTimeout(500);
    await expect(other.getByTestId("place-liked")).toHaveCount(0);
  });

  test("G12 Book a table where the map names a booking page, plain and unpaid", async ({ page }) => {
    await mockWorld(page);
    await holdTheDatabase(page);
    await page.route("**/api/dates/place*", (route) => {
      const id = new URL(route.request().url()).searchParams.get("id");
      return route.fulfill({ json: { details: { id, address: "Rua das Flores 12, Lisbon", hours: "Mo-Su 10:00-22:00", cuisine: [], outdoorSeating: false, vegetarian: false, stepFree: false, notable: false, ...(id === "node/106" ? { booking: "https://example.com/book" } : {}) } } });
    });
    await pinClock(page);
    await openLisbon(page);
    const sheet = await openSheet(page, "Taberna Boa Noite");
    const book = sheet.getByRole("link", { name: /^Book a table/ });
    await expect(book).toHaveAttribute("href", "https://example.com/book");
    await expect(book).toHaveAttribute("target", "_blank");
    expect(await book.getAttribute("rel")).not.toContain("sponsored");
    await sheet.getByRole("button", { name: "Close" }).click();
    const shop = await openSheet(page, "Livraria do Bairro");
    await expect(shop.getByRole("link", { name: /^Book a table/ })).toHaveCount(0);
  });
});

test.describe("dates2: new pages", () => {
  test("G13 the three new kinds, in both languages", async ({ page }) => {
    test.setTimeout(120_000);
    const events = await catchEvents(page);
    const kinds = [
      { kind: "night", en: "Date Night Ideas", es: "Planes para una noche en pareja", count: 9 },
      { kind: "outdoor", en: "Outdoor Date Ideas", es: "Ideas para una cita al aire libre", count: 8 },
      { kind: "unique", en: "Unique Date Ideas", es: "Ideas para una cita diferente", count: 8 },
    ];
    for (const k of kinds) {
      for (const locale of ["", "/es"]) {
        await page.context().clearCookies();
        const res = await page.goto(`${locale}/dates/ideas/${k.kind}`);
        expect(res?.status()).toBe(200);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        expect((await page.title()).startsWith(locale ? k.es : k.en)).toBe(true);
        await expect(page.locator("[data-card]")).toHaveCount(k.count);
        await expect.poll(async () => (await events()).filter((e) => e.name === "date_kind_view").at(-1)?.data).toEqual({ kind: k.kind });
      }
    }
  });

  test("G14 a new city pair, and every pair linked from the city answers", async ({ page, request }) => {
    test.setTimeout(180_000);
    expect((await page.goto("/dates/chicago/romantic"))?.status()).toBe(200);
    await expect(page.locator("[data-card]")).toHaveCount(10);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Romantic date ideas in Chicago");
    await page.context().clearCookies();
    expect((await page.goto("/es/dates/chicago/romantic"))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("En Chicago, ideas para una cita romántica");
    await page.context().clearCookies();
    await page.goto("/dates/chicago");
    const hrefs = [...new Set(await page.locator('a[href^="/dates/chicago/"]').evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? "")))];
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect((await request.get(href)).status(), href).toBe(200);
    expect((await request.get("/dates/chicago/fun")).status()).toBe(404);
  });

  test("G15 the page for venues: not indexed, the address, the label, no price", async ({ page }) => {
    for (const locale of ["", "/es"]) {
      await page.context().clearCookies();
      expect((await page.goto(`${locale}/dates/for-venues`))?.status()).toBe(200);
      expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
      await expect(page.getByRole("link", { name: "support@secuora.xyz" })).toHaveAttribute("href", /^mailto:support@secuora\.xyz/);
      await expect(page.getByText(locale ? "Destacado" : "Featured", { exact: true })).toBeVisible();
      const text = await page.locator("main").innerText();
      expect(text).not.toMatch(/[€$£]/);
    }
  });

  test("G16 in Spanish", async ({ page }) => {
    await mockWorld(page);
    await holdTheDatabase(page, { available: true, posts: [] });
    await pinClock(page);
    await openLisbon(page, `/es/dates?lat=${LISBON.lat}&lng=${LISBON.lng}&q=Lisboa&date=${today()}`);
    expect(await sentence(page)).toMatch(/Dentro o fuera, cerca o lejos\.$/);
    await seedPlan(page, { v: 1, date: today(), where: "Lisboa", idea: "pasta-and-a-slow-walk", stops: PLAN_STOPS });
    await page.goto("/es/plan");
    await page.getByRole("button", { name: "Marcar como hecha" }).click(PLAN_COMPILES);
    await expect(page.getByText("¿Fue una buena cita?")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Citas que ya habéis hecho" })).toBeVisible();
  });
});
