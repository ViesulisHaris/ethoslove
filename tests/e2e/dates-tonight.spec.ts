import { expect, test, type Page } from "@playwright/test";
import { catchShares, LISBON, lisbonUrl, mockWorld, ymd } from "./dates-world";

/**
 * "Plan our date tonight" in one step (components/dates/tonight): on the dates map, on a city's
 * page and on a page by kind. The world is mocked (dates-world.ts) and the clock is pinned to the
 * runner's own day at 17:10 UTC: the mocked forecast says the place is an hour ahead, so it is
 * 18:10 there and tonight starts at 18:45. The browser's zone is Lisbon's, so its day and the
 * place's are the same day on any machine.
 */
test.use({ timezoneId: "Europe/Lisbon" });

const at = (hour: number, minute: number): Date => {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate(), hour, minute));
};
const today = (): string => ymd(new Date());
/** The first visit to /plan compiles it on a dev server: longer than an assertion's usual wait. */
const PLAN_COMPILES = { timeout: 20_000 };

async function pinClock(page: Page, time = at(17, 10)) {
  await page.clock.install({ time });
}

const planButton = (page: Page, name = "Plan it") => page.locator("[data-tonight], #tonight").getByRole("button", { name, exact: true });
const result = (page: Page) => page.locator("[data-tonight-result]");

/** On /dates the ideas re-sort as the places and then the rare find arrive: wait for both. */
async function openLisbon(page: Page, url = lisbonUrl) {
  await page.goto(url);
  await expect(page.getByRole("button", { name: /^Livraria do Bairro/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Bowling Alvalade/ })).toBeVisible();
}

/** The words of the planner's sentence, each select read as its chosen option. */
const sentence = (page: Page) =>
  page.locator("[data-tonight] p.font-display, #tonight p.font-display").first().evaluate((p) => {
    const walk = (node: Node): string => {
      // Trimmed: each choice carries a no-break space for the lean of its italic letters.
      if (node instanceof HTMLSelectElement) return (node.selectedOptions[0]?.textContent ?? "").trim();
      if (node instanceof HTMLElement && node.classList.contains("sr-only")) return "";
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
      return [...node.childNodes].map(walk).join("");
    };
    return walk(p).replace(/\s+/g, " ").trim();
  });

/** Stands in for Vercel's script and keeps what the page hands to window.va (as gift-finder.spec.ts does). */
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
      (window as unknown as { __counted: unknown[][] }).__counted
        .filter((call) => call[0] === "event")
        .map((call) => call[1] as { name: string; data?: Record<string, unknown> }),
    );
}

test.describe("plan our date tonight", () => {
  test("E1 one tap gives one finished plan with real stops and their times, and Another gives the next", async ({ page }) => {
    await mockWorld(page);
    await pinClock(page);
    await openLisbon(page);
    await planButton(page).click();
    const card = result(page);
    await expect(card.getByRole("heading", { name: "Dinner, then the long way home" })).toBeVisible();
    for (const text of ["19:00", "Taberna Boa Noite", "20:30", "Miradouro das Flores", "Order for each other. No vetoes."]) await expect(card).toContainText(text);
    await expect(card).not.toContainText("Nothing");
    await card.getByRole("button", { name: "Another" }).click();
    const next = card.getByRole("heading", { name: "Bowling, bumpers optional" });
    await expect(next).toBeVisible();
    await expect(next).toBeFocused();
    const url = new URL(page.url());
    expect([...url.searchParams.keys()].sort()).toEqual(["date", "lat", "lng", "q"]);
    expect(url.searchParams.get("date")).toBe(today());
  });

  test("E2 Open the plan lands in /plan as adding the idea by hand does", async ({ page }) => {
    await mockWorld(page);
    await pinClock(page);
    await openLisbon(page);
    await planButton(page).click();
    await expect(result(page).getByRole("heading", { name: "Dinner, then the long way home" })).toBeVisible();
    await result(page).getByRole("button", { name: "Open the plan" }).click();
    await expect(page).toHaveURL(/\/plan$/, PLAN_COMPILES);
    await expect(page.getByRole("heading", { level: 2, name: "Taberna Boa Noite" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Miradouro das Flores" })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Time at Taberna Boa Noite/ })).toHaveText("19:00");
    await expect(page.getByText("Lisbon · Dinner, then the long way home")).toBeVisible();
    const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem("ethos.dates.plan.v1") ?? "null"));
    expect(stored).toMatchObject({ idea: "pasta-and-a-slow-walk", date: today() });
  });

  test("E3 a wish nothing fits gives way, and the page says which", async ({ page }) => {
    await mockWorld(page, { wet: true });
    await pinClock(page);
    await openLisbon(page);
    await page.getByRole("combobox", { name: "Budget" }).selectOption("0");
    await planButton(page).click();
    await expect(result(page).getByRole("heading", { name: "Look up" })).toBeVisible();
    await expect(result(page)).toContainText("Nothing free fits a rainy day here; this one costs a coffee each.");
  });

  test("E4 a city's page asks for its places on the tap, not before, and plans there", async ({ page }) => {
    await mockWorld(page);
    await pinClock(page);
    const searches: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/dates/search")) searches.push(r.url());
    });
    await page.goto("/dates/london");
    await page.locator("#tonight").scrollIntoViewIfNeeded();
    await expect(planButton(page)).toBeVisible();
    expect(searches).toHaveLength(0);
    await planButton(page).click();
    await expect(result(page).getByRole("heading")).toBeVisible();
    expect(searches).toHaveLength(1);
    expect(Number(new URL(searches[0]).searchParams.get("lat"))).toBeCloseTo(51.51, 1);
    await planButton(page).click();
    await expect(result(page).getByRole("heading")).toBeVisible();
    expect(searches).toHaveLength(1);
    await result(page).getByRole("button", { name: "Open the plan" }).click();
    await expect(page).toHaveURL(/\/plan$/, PLAN_COMPILES);
    await expect(page.getByText(/^London · /)).toBeVisible();
  });

  test("E5 in Spanish, all of it", async ({ page }) => {
    await mockWorld(page, { wet: true });
    await pinClock(page);
    await openLisbon(page, `/es/dates?lat=${LISBON.lat}&lng=${LISBON.lng}&q=Lisboa`);
    expect(await sentence(page)).toBe("Planead una cita de cualquier tipo esta noche. Cualquier duración, con cualquier presupuesto.");
    await expect(planButton(page, "Planeadla")).toBeVisible();
    await page.getByRole("combobox", { name: "Presupuesto" }).selectOption("0");
    await planButton(page, "Planeadla").click();
    await expect(result(page).getByRole("button", { name: "Abrir el plan" })).toBeVisible();
    await expect(result(page).getByRole("button", { name: "Otra" })).toBeVisible();
    await expect(result(page)).toContainText("Nada gratis encaja con un día de lluvia aquí; esta cuesta un café cada uno.");
  });

  test("E6 by keyboard alone", async ({ page, isMobile }) => {
    test.skip(isMobile, "a keyboard is a desktop's");
    await mockWorld(page);
    await pinClock(page);
    await openLisbon(page);
    const mood = page.getByRole("combobox", { name: "Mood" });
    await mood.focus();
    for (const name of ["When", "How long", "Budget"]) {
      await page.keyboard.press("Tab");
      await expect(page.getByRole("combobox", { name })).toBeFocused();
    }
    await page.keyboard.press("Tab");
    await expect(planButton(page)).toBeFocused();
    await mood.focus();
    await page.keyboard.press("ArrowDown");
    await expect(mood).toHaveValue("cozy");
    await planButton(page).focus();
    await page.keyboard.press("Enter");
    const heading = result(page).getByRole("heading");
    await expect(heading).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(result(page).getByRole("button", { name: "Open the plan" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(result(page).getByRole("button", { name: "Another" })).toBeFocused();
  });

  test("E7 when the places cannot be had it says so and offers the map", async ({ page }) => {
    await mockWorld(page);
    await pinClock(page);
    let down = true;
    await page.route("**/api/dates/search*", (route) => (down ? route.fulfill({ status: 503, json: { error: "busy" } }) : route.fallback()));
    const errors: Error[] = [];
    page.on("pageerror", (e) => errors.push(e));
    await page.goto("/dates/london");
    await planButton(page).click();
    const band = page.locator("#tonight");
    await expect(band).toContainText("We couldn't load the places just now.");
    const map = band.getByRole("link", { name: "Open the map" });
    await expect(map).toHaveAttribute("href", /\/dates\?lat=.*&q=London/);
    down = false;
    await band.getByRole("button", { name: "Try again" }).click();
    await expect(result(page).getByRole("heading")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("E8 late at night it says tonight is over and offers tomorrow", async ({ page }) => {
    await mockWorld(page);
    await pinClock(page, at(22, 50));
    await openLisbon(page);
    await planButton(page).click();
    const band = page.locator("[data-tonight]");
    await expect(band).toContainText("It is late for tonight. Tomorrow has more.");
    await band.getByRole("button", { name: "Plan tomorrow" }).click();
    await expect(result(page).getByRole("heading")).toBeVisible();
    expect(await sentence(page)).toContain("tomorrow");
  });

  test("E9 an existing plan is asked about before it is replaced", async ({ page }) => {
    await mockWorld(page);
    await pinClock(page);
    const before = { v: 1, stops: [{ id: "node/101", name: "Livraria do Bairro", kind: "bookshop", lat: 38.715, lng: -9.138 }, { id: "node/103", name: "Café da Esquina", kind: "cafe", lat: 38.716, lng: -9.1375 }] };
    await page.addInitScript((plan) => {
      if (!window.sessionStorage.getItem("seeded")) {
        window.localStorage.setItem("ethos.dates.plan.v1", JSON.stringify(plan));
        window.sessionStorage.setItem("seeded", "1");
      }
    }, before);
    await openLisbon(page);
    await planButton(page).click();
    const open = result(page).getByRole("button", { name: "Open the plan" });
    page.once("dialog", (d) => void d.dismiss());
    await open.click();
    await expect(open).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(window.localStorage.getItem("ethos.dates.plan.v1") ?? "null"))).toEqual(before);
    page.once("dialog", (d) => void d.accept());
    await open.click();
    await expect(page).toHaveURL(/\/plan$/, PLAN_COMPILES);
    await expect(page.getByRole("heading", { level: 2, name: "Taberna Boa Noite" })).toBeVisible();
    expect(await page.evaluate(() => window.localStorage.getItem("ethos.dates.saved.v1"))).toBeNull();
  });

  test("E10 what is counted, and that nothing private is", async ({ page, context }) => {
    // Three pages, a reload and five events: longer than one page's test.
    test.setTimeout(90_000);
    await mockWorld(page);
    await pinClock(page);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => undefined);
    await catchShares(page);
    const events = await catchEvents(page);
    const ours = async () => (await events()).filter((e) => ["tonight_planned", "tonight_another", "plan_shared", "shared_plan_opened", "shared_plan_kept"].includes(e.name));
    await openLisbon(page);
    await page.getByRole("combobox", { name: "Mood" }).selectOption("cozy");
    await page.getByRole("combobox", { name: "Budget" }).selectOption("1");
    await planButton(page).click();
    await result(page).getByRole("button", { name: "Another" }).click();
    await expect.poll(ours).toEqual([{ name: "tonight_planned", data: { mood: "cozy", budget: 1, when: "tonight" } }, { name: "tonight_another" }]);

    await result(page).getByRole("button", { name: "Open the plan" }).click();
    await expect(page).toHaveURL(/\/plan$/, PLAN_COMPILES);
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect.poll(async () => (await ours()).filter((e) => e.name === "plan_shared")).toEqual([{ name: "plan_shared", data: { how: "copy" } }]);
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await expect.poll(async () => (await ours()).filter((e) => e.name === "plan_shared").at(-1)).toEqual({ name: "plan_shared", data: { how: "share" } });

    const plan = { v: 1, date: today(), where: "Lisbon", stops: [{ id: "node/105", name: "Miradouro das Flores", kind: "viewpoint", lat: 38.712, lng: -9.138, time: "18:45" }] };
    const encoded = Buffer.from(JSON.stringify(plan), "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    await page.goto(`/plan#p=${encoded}`);
    await expect(page.getByRole("button", { name: "Keep this plan" })).toBeVisible();
    await expect.poll(async () => (await ours()).filter((e) => e.name === "shared_plan_opened")).toEqual([{ name: "shared_plan_opened" }]);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Keep this plan" })).toBeVisible();
    await expect.poll(async () => (await ours()).filter((e) => e.name === "shared_plan_opened")).toEqual([{ name: "shared_plan_opened" }]);
    page.once("dialog", (d) => void d.accept());
    await page.getByRole("button", { name: "Keep this plan" }).click();
    await expect.poll(async () => (await ours()).map((e) => e.name)).toContain("shared_plan_kept");
    for (const e of await ours()) for (const key of Object.keys(e.data ?? {})) expect(["mood", "budget", "when", "how"]).toContain(key);
  });

  test("E11 the page does not jump when the planner arrives", async ({ browser, isMobile }) => {
    test.skip(isMobile, "sets its own screen sizes");
    for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 800 }]) {
      const off = await browser.newContext({ javaScriptEnabled: false, viewport });
      const still = await off.newPage();
      await still.goto(lisbonUrl);
      const y0 = await still.getByRole("heading", { name: "Ideas for that day" }).evaluate((h) => h.getBoundingClientRect().top + window.scrollY);
      await off.close();
      const on = await browser.newContext({ viewport, timezoneId: "Europe/Lisbon" });
      const page = await on.newPage();
      await mockWorld(page);
      await pinClock(page);
      await openLisbon(page);
      await expect(page.locator("[data-tonight]")).toBeVisible();
      const y1 = await page.getByRole("heading", { name: "Ideas for that day" }).evaluate((h) => h.getBoundingClientRect().top + window.scrollY);
      await on.close();
      expect(Math.abs(y1 - y0), `${viewport.width}: ${y0} then ${y1}`).toBeLessThanOrEqual(8);
    }
  });

  test("E12 the planner on a page by kind asks where first, then plans only from that kind", async ({ page }) => {
    await mockWorld(page);
    await pinClock(page);
    await page.goto("/dates/ideas/fun");
    const band = page.locator("#tonight");
    const waiting = band.getByRole("button", { name: "Say where first" });
    await expect(waiting).toBeVisible();
    // It says why it waits and stays reachable (aria-disabled, not disabled): pressed, it does nothing.
    await waiting.click({ force: true });
    await expect(result(page)).toHaveCount(0);
    await expect(band.getByRole("combobox", { name: "Mood" })).toHaveCount(0);
    await page.evaluate(() => window.localStorage.setItem("ethos.dates.where.v1", JSON.stringify({ lat: 38.714, lng: -9.139, name: "Lisbon", share: true })));
    await page.reload();
    await expect(band.getByRole("combobox", { name: "Where" })).toHaveValue("Lisbon");
    await planButton(page).click();
    await expect(result(page).getByRole("heading")).toHaveText("Bowling, bumpers optional");
  });
});
