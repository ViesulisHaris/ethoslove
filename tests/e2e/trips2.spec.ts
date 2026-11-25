import { devices, expect, test, webkit, type APIRequestContext, type Page } from "@playwright/test";
import { measure, settle } from "./page-design";
import { clickInPlace, countEvents, mockTowns, typeTown, watchErrors } from "./rooms-world";

/**
 * The trips room's second pass (docs/marketing/growth-build/BRIEF-trips2.md): the pages by where
 * you leave from and by kind of trip, a place to stay under each stop a trip sleeps in, the day
 * costs in the visitor's currency, the folded plan, and every page of the room at 300 words or
 * fewer, held to the designed pages' ruler. On a phone and a desk, in both languages. The map's
 * style is answered with an empty one, so the map draws without the internet.
 */

test.beforeEach(async ({ page }) => {
  await page.route("https://tiles.openfreemap.org/**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ version: 8, sources: {}, layers: [] }) }));
});

const TRIP_IDS = [
  "lisbon-slow-weekend",
  "amalfi-coast",
  "tuscany-hill-towns",
  "paris-without-cliches",
  "scottish-highlands",
  "iceland-south-coast",
  "baltic-coast",
  "prague-krumlov-vienna",
  "santorini-naxos",
  "copenhagen-hygge",
  "algarve-coast",
  "amsterdam-by-bike",
];
const ORIGINS = ["london", "edinburgh", "dublin", "paris", "amsterdam", "berlin", "riga"];
const KINDS = ["weekend-getaways", "road-trips"];

/** Every JSON-LD node on the page, however nested. */
async function ldNodes(page: Page): Promise<Record<string, unknown>[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const out: Record<string, unknown>[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (o["@type"]) out.push(o);
      Object.values(o).forEach(walk);
    }
  };
  for (const b of blocks) walk(JSON.parse(b));
  return out;
}
const listOf = (nodes: Record<string, unknown>[], type: string) => nodes.find((n) => n["@type"] === type) as { itemListElement: unknown[] } | undefined;

/** The visitor's today, a day after it, as YYYY-MM-DD (the page works it out in the browser, the same way). */
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const plusDays = (s: string, n: number) => {
  const [y, m, d] = s.split("-").map(Number);
  return ymd(new Date(y, m - 1, d + n, 12));
};
const daysFromToday = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  const now = new Date();
  return Math.round((new Date(y, m - 1, d, 12).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).getTime()) / 86_400_000);
};

/** What this build charges in, from the prices /llms.txt lists (tests/e2e/currency.spec.ts). */
type Country = { code: string; currency: "usd" | "eur" | "gbp"; single: string };
const COUNTRIES: Country[] = [
  { code: "US", currency: "usd", single: "$11.99" },
  { code: "LV", currency: "eur", single: "€9.99" },
  { code: "GB", currency: "gbp", single: "£8.99" },
];
async function chargedHere(request: APIRequestContext): Promise<Set<Country["currency"]>> {
  const text = await (await request.get("/llms.txt")).text();
  return new Set(COUNTRIES.filter((c) => text.includes(c.single)).map((c) => c.currency));
}
const plain = (s: string) => s.replace(/ /g, " ");

test.describe("the pages by where you leave from", () => {
  test("E1 a page by where you leave from: London", async ({ page }) => {
    const noErrors = watchErrors(page);
    await page.goto("/trips/from-london");
    await expect(page).toHaveTitle(/^Weekend trips from London/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("12 trips from London");
    await expect(page.locator("[data-trip]")).toHaveCount(12);
    const cards = page.locator("#from-row > li");
    await expect(cards).toHaveCount(6);
    const names = ["Paris without the clichés", "Amsterdam by bike", "The Scottish Highlands"];
    for (let i = 0; i < 3; i++) {
      await expect(cards.nth(i)).toContainText(names[i]);
      await expect(cards.nth(i)).toContainText("A train works");
    }
    await expect(cards.nth(3)).toContainText("Copenhagen");
    await expect(cards.nth(3)).toContainText("About 1 h 50 min in the air");
    for (let i = 0; i < 6; i++) {
      const img = cards.nth(i).locator("img");
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth), { message: `card ${i}` }).toBeGreaterThan(0);
      await expect(cards.nth(i).locator("p")).toHaveText(/^Best /);
    }
    await expect(page.getByText("Three of the twelve start at a London station, not an airport.")).toBeVisible();
    await expect(page.getByText(/^Paris and Amsterdam fit a long weekend by Eurostar/)).toBeVisible();
    // The hero's photograph is a trip the six cards do not show.
    await expect(page.locator("[data-line]")).toHaveText("Iceland's south coast");
    expect(await cards.evaluateAll((els) => els.map((el) => el.getAttribute("data-trip")))).not.toContain("iceland-south-coast");
    expect(await page.locator("main").innerText()).not.toMatch(/[€$£]\s?\d/);
    expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(/\/trips\/from-london$/);
    expect(await page.locator('link[rel="alternate"][hreflang="es"]').getAttribute("href")).toMatch(/\/es\/trips\/from-london$/);
    const nodes = await ldNodes(page);
    expect(listOf(nodes, "ItemList")?.itemListElement).toHaveLength(12);
    expect(listOf(nodes, "BreadcrumbList")?.itemListElement).toHaveLength(3);
    noErrors();
  });

  test("E2 …in Spanish", async ({ page }) => {
    await page.goto("/es/trips/from-london");
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page).toHaveTitle(/^Escapadas desde Londres/);
    await expect(page.locator("#from-row > li").first()).toContainText("Se llega en tren");
    const hrefs = await page.locator('main a[href^="/"]').evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThan(10);
    for (const href of hrefs) expect(href, href).toMatch(/^\/es(\/|$)/);
  });

  test("E3 a city one of the trips starts in shows that trip in the hero, and leads the rest with it", async ({ page }) => {
    for (const [slug, home, name] of [
      ["edinburgh", "scottish-highlands", "The Scottish Highlands"],
      ["riga", "baltic-coast", "The Baltic coast, Riga to Tallinn"],
    ] as const) {
      await page.goto(`/trips/from-${slug}`);
      await expect(page.locator("[data-line]")).toHaveText(name);
      expect(await page.locator("#from-row > li").evaluateAll((els) => els.map((el) => el.getAttribute("data-trip")))).not.toContain(home);
      const first = page.locator("#from-list details ol > li").first();
      await expect(first).toHaveAttribute("data-trip", home);
      await expect(first).toContainText("Starts where you are");
    }
  });

  test("E3b no two origin pages open on the same cards, and no hero is a card", async ({ page }) => {
    const seen = new Map<string, string>();
    for (const o of ORIGINS) {
      await page.goto(`/trips/from-${o}`);
      const ids = await page.locator("#from-row > li").evaluateAll((els) => els.map((el) => el.getAttribute("data-trip") ?? ""));
      expect(ids, o).toHaveLength(6);
      expect(seen.get(ids.join()), `${o} has ${seen.get(ids.join())}'s cards`).toBeUndefined();
      seen.set(ids.join(), o);
      const heroSrc = await page.locator("[data-line]").locator("xpath=..").locator("img").first().getAttribute("src");
      const cardSrcs = await page.locator("#from-row img").evaluateAll((els) => els.map((el) => el.getAttribute("src") ?? ""));
      const stem = (s: string | null) => (s ?? "").replace(/-sm\.webp$|\.webp$/, "");
      expect(cardSrcs.map(stem), o).not.toContain(stem(heroSrc));
    }
  });

  test("E4 the six further away are in the page, folded", async ({ page }) => {
    await page.goto("/trips/from-london");
    const rest = page.locator("#from-list details").first();
    await expect(rest).not.toHaveAttribute("open", "");
    const rows = rest.locator("ol > li");
    await expect(rows).toHaveCount(6);
    for (let i = 0; i < 6; i++) await expect(rows.nth(i)).toBeHidden();
    await rest.locator("summary").click();
    for (let i = 0; i < 6; i++) {
      await expect(rows.nth(i)).toBeVisible();
      const id = await rows.nth(i).getAttribute("data-trip");
      await expect(rows.nth(i).getByRole("link")).toHaveAttribute("href", `/trips/${id}`);
    }
  });

  test("E5 there is no page from a city out of reach, or from one not on the list", async ({ page }) => {
    for (const path of ["/trips/from-new-york", "/trips/from-madrid", "/trips/from-", "/trips/from-glasgow", "/trips/from-manchester", "/trips/from-birmingham"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(404);
    }
  });

  test("E6 Trips links to every new page, and each links back", async ({ page }) => {
    await page.goto("/trips");
    const links = page.getByTestId("trips-more").getByRole("link");
    await expect(links).toHaveCount(9);
    const hrefs = await links.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    expect(hrefs.filter((h) => h?.startsWith("/trips/from-"))).toHaveLength(7);
    expect(hrefs.filter((h) => h?.startsWith("/trips/ideas/"))).toHaveLength(2);
    for (const box of await links.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44);

    await page.goto("/trips/from-berlin");
    const main = page.locator("main");
    const all = await main.locator("a").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    expect(all).toContain("/trips");
    for (const o of ORIGINS.filter((x) => x !== "berlin")) expect(all, o).toContain(`/trips/from-${o}`);
    for (const k of KINDS) expect(all, k).toContain(`/trips/ideas/${k}`);
    expect(all).toContain("/dates/berlin");

    await page.goto("/trips/ideas/road-trips");
    const fromKind = await page.locator("main a").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    expect(fromKind).toContain("/trips");
    expect(fromKind).toContain("/trips/ideas/weekend-getaways");
    for (const o of ORIGINS) expect(fromKind, o).toContain(`/trips/from-${o}`);
  });
});

test.describe("the pages by kind of trip", () => {
  test("E7 a page by kind: weekend getaways", async ({ page }) => {
    const noErrors = watchErrors(page);
    await page.goto("/trips/ideas/weekend-getaways");
    await expect(page).toHaveTitle(/^Weekend getaways for couples: 4/);
    const cards = page.locator("#ideas-row > li");
    await expect(cards).toHaveCount(4);
    expect(await cards.evaluateAll((els) => els.map((el) => el.getAttribute("data-trip")))).toEqual(["lisbon-slow-weekend", "paris-without-cliches", "copenhagen-hygge", "amsterdam-by-bike"]);
    await expect(cards.first().locator("p")).toHaveText("Three days on foot, sleeping in Alfama.");
    // The hero's photograph is the last card's, not the first's.
    await expect(page.locator("[data-line]")).toHaveText("Amsterdam by bike");
    for (let i = 0; i < 4; i++) await expect(cards.nth(i).locator("p")).toHaveText(/\.$/);
    expect(listOf(await ldNodes(page), "ItemList")?.itemListElement).toHaveLength(4);
    const why = page.locator("details[data-more-about]");
    await expect(why).not.toHaveAttribute("open", "");
    await expect(why).toContainText("Paris is three, so take the Monday too");
    await expect(why).not.toContainText("no page of their own");
    noErrors();
  });

  test("E8 a page by kind: road trips, in both languages", async ({ page }) => {
    await page.goto("/trips/ideas/road-trips");
    await expect(page.locator("#ideas-row > li")).toHaveCount(6);
    await page.goto("/es/trips/ideas/road-trips");
    await expect(page).toHaveTitle(/^Viajes en coche por Europa/);
    await expect(page.locator("#ideas-row > li")).toHaveCount(6);
  });

  test("E9 the kinds that are not pages are not pages", async ({ page }) => {
    for (const path of ["/trips/ideas/romantic-city-breaks", "/trips/ideas/cheap-trips-in-europe", "/trips/ideas"]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(404);
    }
  });
});

test.describe("a trip's page", () => {
  test("E10 a place to stay: one closed row under Before you go, a search for each stop the trip sleeps in", async ({ page }) => {
    const events = await countEvents(page);
    await page.goto("/trips/lisbon-slow-weekend");
    // None under the stops themselves: one partner action and one disclosure line a screen.
    await expect(page.getByTestId("trip-stops").getByTestId("trip-stay")).toHaveCount(0);
    const row = page.locator("#book details#stay");
    await expect(row).not.toHaveAttribute("open", "");
    // Beside flights, tickets and the car, second after the flights.
    expect(await page.locator("#book details").evaluateAll((els) => els.map((el) => el.id))).toEqual(["flights", "stay", "tickets"]);
    const stays = page.getByTestId("trip-stay");
    await expect(stays).toHaveCount(1);
    await expect(stays).toBeHidden();
    await row.locator("summary").click();
    const link = row.getByRole("link", { name: /Find a place to stay in Alfama, 2 nights/ });
    await expect(link).toBeVisible();
    await expect(link).toContainText("Alfama");
    await expect(link).toContainText("2 nights");
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toHaveAttribute("href", /checkin=/);
    const url = new URL((await link.getAttribute("href"))!);
    expect(url.host).toBe("www.booking.com");
    expect(url.searchParams.get("ss")).toBe("Alfama, Lisbon");
    expect(url.searchParams.get("group_adults")).toBe("2");
    const checkin = url.searchParams.get("checkin")!;
    const [y, m, d] = checkin.split("-").map(Number);
    expect(new Date(y, m - 1, d, 12).getDay()).toBe(5);
    expect(daysFromToday(checkin)).toBeGreaterThanOrEqual(21);
    expect(daysFromToday(checkin)).toBeLessThanOrEqual(27);
    expect(url.searchParams.get("checkout")).toBe(plusDays(checkin, 2));
    await expect(row).not.toContainText("Stay22");
    await expect(row).not.toContainText("commission");
    await clickInPlace(link);
    await expect.poll(async () => (await events()).filter((e) => e.name === "affiliate_click").map((e) => e.data)).toEqual([{ partner: "booking", placement: "trip_stay", trip: "lisbon-slow-weekend" }]);
  });

  test("E10b the stops and the days are headings outside their folded rows, and the costs say flights are not in them", async ({ page }) => {
    await page.goto("/trips/baltic-coast");
    for (const name of ["Riga", "Sigulda", "Tallinn"]) await expect(page.getByRole("heading", { level: 3, name, exact: true })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 3, name: /^Day 2: / })).toHaveCount(1);
    expect(await page.locator("summary h3, summary [role=heading]").count()).toBe(0);
    await expect(page.locator("dl")).toContainText("A day for two, no flights");
    await expect(page.locator("[aria-description]")).toHaveCount(0);
    await page.locator("details[data-trip-more] > summary").click();
    await expect(page.locator("details[data-trip-more]")).not.toContainText("not the flights");
  });

  test("E10c an address ending in #flights, #stay, #tickets or #car lands on that row open", async ({ page }) => {
    for (const id of ["flights", "stay", "tickets", "car"]) {
      await page.goto(`/trips/baltic-coast#${id}`);
      await expect(page.locator(`details#${id}`), id).toHaveAttribute("open", "");
    }
    await expect(page.getByTestId("flight-finder")).toBeHidden();
    await page.evaluate(() => (window.location.hash = "#flights"));
    await expect(page.locator("details#flights")).toHaveAttribute("open", "");
    await expect(page.getByTestId("flight-finder")).toBeVisible();
  });

  test("E11 each night's stop gets its own nights", async ({ page }) => {
    await page.goto("/trips/baltic-coast");
    const stays = page.getByTestId("trip-stay");
    await expect(stays).toHaveCount(5);
    await expect(page.locator("#stay li")).toHaveText([/^Riga\s*2 nights$/, /^Sigulda\s*1 night$/, /^Cēsis\s*1 night$/, /^Pärnu\s*1 night$/, /^Tallinn\s*1 night$/]);
    await expect(stays.first()).toHaveAttribute("href", /checkin=/);
    const urls = (await stays.evaluateAll((els) => els.map((el) => el.getAttribute("href")!))).map((h) => new URL(h).searchParams);
    const depart = urls[0].get("checkin")!;
    const nights = [2, 1, 1, 1, 1];
    const before = [0, 2, 3, 4, 5];
    urls.forEach((u, i) => {
      expect(u.get("checkin"), `stop ${i}`).toBe(plusDays(depart, before[i]));
      expect(u.get("checkout"), `stop ${i}`).toBe(plusDays(u.get("checkin")!, nights[i]));
    });
    await page.goto("/es/trips/baltic-coast");
    const first = page.getByTestId("trip-stay").first();
    await expect(first).toHaveAttribute("aria-label", /^Buscar dónde dormir en Riga, 2 noches/);
    expect(new URL((await first.getAttribute("href"))!).searchParams.get("lang")).toBe("es");
  });

  for (const country of COUNTRIES) {
    test.describe(`E12 day costs in the visitor's own currency: a visitor in ${country.code}`, () => {
      test.use({ extraHTTPHeaders: { "x-vercel-ip-country": country.code } });

      test("the costs and the marks are in the currency they are charged in", async ({ page, request }) => {
        const charged = (await chargedHere(request)).has(country.currency) ? country.currency : "eur";
        const expected = { usd: "About $165–330", gbp: "About £125–250", eur: "About €150–300" }[charged];
        const sign = { usd: "$", gbp: "£", eur: "€" }[charged];
        await page.goto("/trips/lisbon-slow-weekend");
        const fact = page.locator("dl > div").filter({ hasText: "A day for two, no flights" }).locator("dd");
        await expect(fact).toHaveText(expected);
        if (charged !== "eur") expect(await page.locator("main").innerText()).not.toContain("€");
        await page.goto("/trips");
        await page.getByRole("button", { name: "Show our three trips" }).click();
        const marks = page.locator("#match [data-pick] p span[aria-hidden]");
        await expect(marks).toHaveCount(3);
        for (const text of await marks.allTextContents()) {
          expect(text).toMatch(/^[$£€]{1,3}$/);
          expect([...text].every((c) => c === sign), text).toBe(true);
        }
      });
    });
  }

  for (const country of COUNTRIES.filter((c) => c.code !== "GB")) {
    test.describe(`E13 …and in Spanish: a visitor in ${country.code}`, () => {
      test.use({ extraHTTPHeaders: { "x-vercel-ip-country": country.code } });

      test("the costs read in Spanish", async ({ page, request }) => {
        const charged = (await chargedHere(request)).has(country.currency) ? country.currency : "eur";
        await page.goto("/es/trips/lisbon-slow-weekend");
        const fact = page.locator("dl > div").filter({ hasText: "Al día para dos, sin vuelos" }).locator("dd");
        expect(plain((await fact.textContent()) ?? "").trim()).toBe(charged === "usd" ? "Unos 165–330 $" : "Unos 150–300 €");
      });
    });
  }

  test("E14 the plan is folded, the first day open", async ({ page }) => {
    await page.goto("/trips/baltic-coast");
    const days = page.getByTestId("trip-plan").locator(":scope > li");
    await expect(days).toHaveCount(7);
    for (let i = 0; i < 7; i++) {
      await expect(days.nth(i).locator(":scope > details")).toHaveCount(1);
      if (i === 0) await expect(days.nth(i).locator("details")).toHaveAttribute("open", "");
      else await expect(days.nth(i).locator("details")).not.toHaveAttribute("open", "");
    }
    await expect(days.first().getByText(/House of the Blackheads/)).toBeVisible();
    const day2item = days.nth(1).locator("li").first();
    await expect(day2item).toBeAttached();
    await expect(day2item).toBeHidden();
    await days.nth(1).locator("summary").click();
    await expect(day2item).toBeVisible();
    await expect(days.first().locator("details")).toHaveAttribute("open", "");
    await days.nth(2).locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(days.nth(2).locator("details")).toHaveAttribute("open", "");
    const evenings = await page.getByTestId("trip-plan").locator("li li").evaluateAll((els) => els.filter((el) => el.textContent?.trim().startsWith("Evening:")).map((el) => el.querySelector("strong")?.textContent));
    expect(evenings.length).toBeGreaterThan(0);
    for (const e of evenings) expect(e).toBe("Evening:");
  });

  test("E15 flights, tickets and the car are one tap away", async ({ page }) => {
    await page.goto("/trips/amalfi-coast");
    for (const id of ["#flights", "#tickets", "#car"]) await expect(page.locator(id)).not.toHaveAttribute("open", "");
    await page.locator("#flights > summary").click();
    await expect(page.getByTestId("flight-finder").getByRole("combobox", { name: "To" })).toHaveValue("Naples");
    await page.locator("#car > summary").click();
    await expect(page.locator("#car").getByRole("link", { name: /Auto Europe/ })).toBeVisible();
    await expect(page.locator("#car").getByText(/We may earn a commission/)).toBeVisible();
    await page.locator("#tickets > summary").click();
    await expect(page.getByTestId("trip-tickets").getByRole("link")).toHaveCount(2);
    await expect(page.getByTestId("trip-tickets").getByRole("link").first()).toBeVisible();
    await expect(page.locator("#tickets").getByText(/We may earn a commission/)).toBeVisible();
  });
});

test.describe("300 words a page, and the designed pages' ruler", () => {
  test.skip(({ isMobile }) => isMobile, "sets its own screen sizes");

  async function words(page: Page, path: string, within = "main") {
    await page.goto(path);
    await settle(page);
    return (await measure(page, within)).count;
  }

  test("E16 every trip's page is 300 words or fewer", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const id of TRIP_IDS) {
      const count = await words(page, `/trips/${id}`);
      expect(count, id).toBeLessThanOrEqual(300);
      expect(count, id).toBeGreaterThan(120);
    }
  });

  test("E17 …in Spanish", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const id of TRIP_IDS) {
      const count = await words(page, `/es/trips/${id}`);
      expect(count, id).toBeLessThanOrEqual(300);
      expect(count, id).toBeGreaterThan(120);
    }
  });

  test("E18 …on a phone", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of ["/trips/baltic-coast", "/trips/amalfi-coast", "/trips/lisbon-slow-weekend", "/es/trips/baltic-coast", "/es/trips/amalfi-coast", "/es/trips/lisbon-slow-weekend"]) {
      expect(await words(page, path), path).toBeLessThanOrEqual(300);
    }
  });

  test("E19 Trips and Long distance are 300 words or fewer", async ({ page }) => {
    test.setTimeout(240_000);
    await mockTowns(page);
    for (const [width, height] of [
      [1440, 900],
      [375, 812],
    ]) {
      await page.setViewportSize({ width, height });
      expect(await words(page, "/trips"), `/trips ${width}`).toBeLessThanOrEqual(300);
      expect(await words(page, "/long-distance"), `/long-distance ${width}`).toBeLessThanOrEqual(300);
      await typeTown(page, "Where you are", "Riga");
      await typeTown(page, "Where they are", "Lisbon");
      await expect(page.locator("[data-halfway-city]").or(page.locator('[data-testid="meet-ways"]')).first()).toBeVisible();
      await settle(page);
      expect((await measure(page, "main")).count, `/long-distance with two towns ${width}`).toBeLessThanOrEqual(300);
    }
    for (const [width, height] of [
      [1440, 900],
      [375, 812],
    ]) {
      await page.setViewportSize({ width, height });
      expect(await words(page, "/es/trips"), `/es/trips ${width}`).toBeLessThanOrEqual(300);
      expect(await words(page, "/es/long-distance"), `/es/long-distance ${width}`).toBeLessThanOrEqual(300);
    }
  });

  test("E20 the new pages are 300 words or fewer", async ({ page }) => {
    test.setTimeout(240_000);
    const paths = ["/trips/from-london", "/trips/from-riga", "/trips/ideas/weekend-getaways", "/trips/ideas/road-trips"];
    for (const [width, height] of [
      [1440, 900],
      [375, 812],
    ]) {
      await page.setViewportSize({ width, height });
      for (const path of [...paths, ...paths.map((p) => `/es${p}`)]) {
        const count = await words(page, path, "[data-page-theme]");
        expect(count, `${path} ${width}`).toBeLessThanOrEqual(300);
        expect(count, `${path} ${width}`).toBeGreaterThan(80);
      }
    }
  });

  const SIZES: [number, number][] = [
    [320, 568],
    [375, 812],
    [768, 1024],
    [1024, 768],
    [1280, 800],
    [1440, 900],
    [1920, 1080],
    [812, 375],
  ];
  for (const [width, height] of SIZES) {
    test(`E21 the new pages hold to the ruler at ${width}×${height}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height });
      const paths = ["/trips/from-london", "/trips/ideas/road-trips"];
      if ((width === 320 && height === 568) || width === 1440) paths.push("/es/trips/from-london", "/es/trips/ideas/road-trips");
      for (const path of paths) {
        await page.goto(path);
        await settle(page);
        const m = await measure(page);
        const where = `${path} at ${width}×${height}`;
        expect(m.overflow, `${where}: sideways`).toBeLessThanOrEqual(0);
        expect(m.overlaps, `${where}: art under words`).toEqual([]);
        expect(m.onCards, `${where}: art on a card`).toEqual([]);
        expect(m.smallest, where).toBeGreaterThanOrEqual(14);
        expect(m.smallestLabel, where).toBeGreaterThanOrEqual(12);
        expect(m.small, `${where}: too small for a thumb`).toEqual([]);
        if (width >= 1280) expect(m.pieces, where).toBeGreaterThanOrEqual(1);
      }
    });
  }

  test("E22 the first screen has a flower and a real picture", async ({ page }) => {
    for (const [width, height] of [
      [1440, 900],
      [375, 812],
    ]) {
      await page.setViewportSize({ width, height });
      for (const path of ["/trips/from-london", "/trips/ideas/weekend-getaways"]) {
        await page.goto(path);
        await settle(page);
        const m = await measure(page);
        expect(m.decorInView, `${path} ${width}`).toBeGreaterThanOrEqual(1);
        expect(m.picturesInView, `${path} ${width}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test("E23 on a phone a set of cards is one row with dots; on a desk they stand side by side", async ({ page }) => {
    test.setTimeout(180_000);
    const check = async (row: string, count: number, phone: boolean) => {
      const cards = await page.locator(`${row} > li`).evaluateAll((els) => els.map((el) => el.getBoundingClientRect()).map((r) => ({ left: r.left, right: r.right, top: Math.round(r.top) })));
      expect(cards, row).toHaveLength(count);
      const dots = page.locator(`${row} ~ [data-dots]`);
      if (phone) {
        expect(cards.filter((r) => r.left >= 0 && r.right <= 376), row).toHaveLength(1);
        await expect(dots.locator("span")).toHaveCount(count);
      } else {
        expect(cards[0].top, row).toBe(cards[1].top);
        await expect(dots).toBeHidden();
      }
    };
    for (const [width, height, phone] of [
      [375, 812, true],
      [1440, 900, false],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.goto("/trips/from-london");
      await check("#from-row", 6, phone);
      await page.goto("/trips/ideas/weekend-getaways");
      await check("#ideas-row", 4, phone);
      await page.goto("/trips");
      await check("#trips-row", 12, phone);
      // Eight ideas for a call (lib/dates/virtual.ts).
      await page.goto("/long-distance");
      await check("#ldr-virtual-row", 8, phone);
    }
  });

  test("E24 a chip narrows the row and its dots", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/trips");
    await page.locator("#trips-row").evaluate((el) => el.scrollTo({ left: 600 }));
    await page.getByRole("button", { name: /^Road trips/ }).click();
    await expect(page.locator("#trips-row > li")).toHaveCount(6);
    await expect(page.locator("#trips-row ~ [data-dots] span")).toHaveCount(6);
    expect(await page.locator("#trips-row").evaluate((el) => el.scrollLeft)).toBe(0);
  });

  test("E26 the pages are whole when no picture arrives", async ({ page, browser }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    const heights: Record<string, number> = {};
    for (const path of ["/trips/from-london", "/trips"]) {
      await page.goto(path);
      await settle(page);
      heights[path] = await page.evaluate(() => document.documentElement.scrollHeight);
    }
    const bare = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await bare.route(/\/(art|trips|templates)\/.*\.(webp|jpg|png)/, (r) => r.abort());
    await bare.route("https://tiles.openfreemap.org/**", (r) => r.abort());
    for (const path of ["/trips/from-london", "/trips"]) {
      await bare.goto(path);
      await settle(bare);
      const h = await bare.evaluate(() => document.documentElement.scrollHeight);
      expect(Math.abs(h - heights[path]), path).toBeLessThanOrEqual(2);
      expect(await bare.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(0);
      const names = path === "/trips" ? bare.getByTestId("trip-card") : bare.locator("#from-row > li");
      for (let i = 0; i < (await names.count()); i++) await expect(names.nth(i).locator(".font-display").first()).toBeVisible();
    }
    await bare.close();
  });

  test("E27 an iPhone in Safari", async ({ baseURL }) => {
    test.setTimeout(180_000);
    const browser = await webkit.launch();
    try {
      const origin = new URL(baseURL ?? "http://localhost:3000").origin;
      const context = await browser.newContext({ ...devices["iPhone 13"], baseURL, storageState: { cookies: [], origins: [{ origin, localStorage: [{ name: "ethos-consent", value: "denied" }] }] } });
      const page = await context.newPage();
      await page.route("https://tiles.openfreemap.org/**", (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify({ version: 8, sources: {}, layers: [] }) }));
      for (const path of ["/trips/from-london", "/trips/ideas/road-trips", "/trips/baltic-coast"]) {
        await page.goto(path);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(0);
      }
      await page.locator("#stay > summary").tap();
      await expect(page.getByTestId("trip-stay").first()).toBeVisible();
      await page.locator("#flights > summary").tap();
      await expect(page.getByTestId("flight-finder")).toBeVisible();
      const fonts = await page.getByTestId("flight-finder").locator("input").evaluateAll((els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)));
      expect(fonts.length).toBeGreaterThan(0);
      for (const size of fonts) expect(size).toBeGreaterThanOrEqual(16);
    } finally {
      await browser.close();
    }
  });

  test("E28 at the system's largest type nothing is cut off", async ({ page }) => {
    await page.setViewportSize({ width: 720, height: 450 });
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        const s = document.createElement("style");
        s.textContent = "html { font-size: 125% !important }";
        document.head.appendChild(s);
      });
    });
    for (const [path, within] of [
      ["/es/trips/from-dublin", "[data-page-theme]"],
      ["/es/trips/baltic-coast", "main"],
    ]) {
      await page.goto(path);
      await settle(page);
      const m = await measure(page, within);
      expect(m.overflow, path).toBeLessThanOrEqual(0);
      expect(m.overlaps, path).toEqual([]);
    }
  });
});

test("E25 an idea for a call opens to its words", async ({ page }) => {
  await page.goto("/long-distance");
  const ideas = page.locator("#ldr-virtual-row > li");
  const n = await ideas.count();
  expect(n).toBeGreaterThanOrEqual(4);
  for (let i = 0; i < n; i++) await expect(ideas.nth(i).locator("details > p").first()).toBeHidden();
  const first = ideas.first();
  await first.scrollIntoViewIfNeeded();
  await first.locator("summary").click();
  await expect(first.locator("details > p").first()).toBeVisible();
  await expect(first.getByText("The twist:")).toBeVisible();
  const plan = page.locator("[data-plan-visit]");
  await expect(plan).toHaveCount(1);
  await plan.scrollIntoViewIfNeeded();
  await expect(plan).toBeVisible();
  const card = page.locator("#ldr-virtual-row > li").filter({ has: plan });
  await card.locator("summary").click();
  await expect(card.locator("details")).toHaveAttribute("open", "");
  const gifts = page.getByTestId("ldr-gifts").getByRole("link");
  await expect(gifts).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    await expect(gifts.nth(i)).toHaveAttribute("href", /^\/templates\//);
    await expect(gifts.nth(i).locator("img")).toHaveCount(1);
  }
  await expect(page.getByRole("link", { name: /All long-distance gifts/ })).toHaveAttribute("href", "/occasions/long-distance");
});

test("E29 reduced motion: nothing turns or rises", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/trips/baltic-coast");
  const day2 = page.getByTestId("trip-plan").locator(":scope > li").nth(1);
  const plus = day2.locator("summary svg");
  expect(await plus.evaluate((el) => getComputedStyle(el).transitionDuration)).toBe("0s");
  await day2.locator("summary").click();
  await expect(day2.locator("li").first()).toBeVisible({ timeout: 100 });
});

test("E30 the sitemap lists the new pages", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const path of ["/trips/from-london", "/es/trips/from-riga", "/trips/ideas/weekend-getaways", "/es/trips/ideas/road-trips"]) expect(xml, path).toContain(`${path}<`);
  expect(xml).not.toContain("from-new-york");
  expect(xml).not.toContain("romantic-city-breaks");
});
