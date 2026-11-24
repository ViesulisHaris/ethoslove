import { expect, test, type Page } from "@playwright/test";
import { catchShares, clickInPlace, countEvents, lastShare, mockTowns, noShare, posterRows, TOWNS, typeTown, watchErrors, type Spot } from "./rooms-world";

/**
 * The halfway finder's own page (/tools/halfway-between-two-cities): two towns in, the halfway city
 * out with how far it is for each of them, a link that carries the two towns, and three ways on.
 * The place search and the weather are answered here (rooms-world.ts): nothing leaves the machine.
 * (tests/e2e/halfway.spec.ts is the Halfway gift's own spec.)
 */

const TOOL = "/tools/halfway-between-two-cities";
const ways = (page: Page) => page.locator("[data-way]");
const way = (page: Page, key: string) => page.locator(`[data-way="${key}"] a`);

async function both(page: Page, a: string, b: string, es = false) {
  await typeTown(page, es ? "Dónde estás tú" : "Where you are", a);
  await typeTown(page, es ? "Dónde está la otra persona" : "Where they are", b);
}

const jsonLd = (page: Page) =>
  page.locator('script[type="application/ld+json"]').evaluateAll((els) =>
    els.flatMap((el) => {
      const v = JSON.parse(el.textContent ?? "{}");
      return v["@graph"] ?? [v];
    }),
  );

/** The map's answer for every point it is asked about, in place of the default (open country). */
const mapSays = (page: Page, spot: (lat: number, lng: number) => Spot | null) => mockTowns(page, TOWNS, spot);

/** Riga and Lisbon meet near Reims: the table's Luxembourg is 139 km off the middle and 1,440 km against 1,711, so the map is asked. */
const REIMS: Spot = { kind: "town", name: "Reims", region: "Grand Est", countryCode: "FR", lat: 49.2583, lng: 4.0317 };

test.beforeEach(async ({ page }) => {
  await mockTowns(page);
});

// Kilometres: a visitor from Ireland (the browser's language stands in for Vercel's country). Miles are their own test below.
test.use({ locale: "en-IE" });

test.describe("halfway between two cities", () => {
  test("the page is there in both languages, titled with its search", async ({ page }) => {
    const noErrors = watchErrors(page);
    for (const [prefix, title] of [["", /^Halfway Between Two Cities/], ["/es", /^A medio camino entre dos ciudades/]] as const) {
      const res = await page.goto(`${prefix}${TOOL}?a=Riga~56.95~24.11&b=Lisbon~38.72~-9.14`);
      expect(res?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${prefix}${TOOL}$`));
      await expect(page.locator('link[rel="alternate"][hreflang="es"]')).toHaveAttribute("href", new RegExp(`/es${TOOL}$`));
      const nodes = await jsonLd(page);
      expect(nodes.find((n: { "@type"?: string }) => n["@type"] === "FAQPage")?.mainEntity).toHaveLength(4);
      expect(nodes.find((n: { "@type"?: string }) => n["@type"] === "BreadcrumbList")?.itemListElement).toHaveLength(2);
    }
    noErrors();
  });

  test("two towns in, the halfway city out, and how far for each of them", async ({ page }) => {
    await page.goto(TOOL);
    await both(page, "London", "Edinburgh");
    await expect(page.locator("[data-halfway-city]")).toHaveText("Manchester");
    await expect(page.locator("[data-halfway-result]")).toContainText("Almost exactly halfway between you.");
    await expect(page.locator("[data-halfway-each]")).toHaveText(/^26\d km for you · 28\d km for them$/);
  });

  test("a city in the table that is not fair to both is never called halfway: the map is asked", async ({ page }) => {
    // Boston and Philadelphia: New York is 88 km off the middle, 306 km for one and 130 for the other.
    const asked = await mapSays(page, () => ({ kind: "town", name: "Bridgeport", region: "Connecticut", countryCode: "US", lat: 41.1865, lng: -73.1952 }));
    await page.goto(TOOL);
    await both(page, "Boston", "Philadelphia");
    await expect(page.locator("[data-halfway-city]")).toHaveText("Bridgeport");
    expect(asked.length).toBeGreaterThan(0);
    await expect(page.locator("[data-halfway-tool]")).not.toContainText("New York");
    // Riga and Lisbon: not Luxembourg (1,440 km against 1,711).
    await mapSays(page, () => REIMS);
    await page.goto(TOOL);
    await both(page, "Riga", "Lisbon");
    await expect(page.locator("[data-halfway-city]")).toHaveText("Reims");
    await expect(page.locator("[data-halfway-tool]")).not.toContainText("Luxembourg");
  });

  test("'almost exactly halfway' is said only when the two journeys are even", async ({ page }) => {
    // Dallas and Houston: Madisonville is 33 km off the middle, but 219 km for one and 142 for the other.
    await mapSays(page, () => ({ kind: "town", name: "Madisonville", region: "Texas", countryCode: "US", lat: 30.9499, lng: -95.9116 }));
    await page.goto(TOOL);
    await both(page, "Dallas", "Houston");
    await expect(page.locator("[data-halfway-city]")).toHaveText("Madisonville");
    await expect(page.locator("[data-halfway-result]")).toContainText(/Texas, \d+ km from the exact middle\./);
    await expect(page.locator("[data-halfway-result]")).not.toContainText(/exactly halfway/);
  });

  test("the three ways on, before and after", async ({ page }) => {
    await page.goto(TOOL);
    await expect(ways(page)).toHaveCount(3);
    await expect(way(page, "gift")).toHaveAttribute("href", "/templates/halfway");
    await expect(way(page, "dates")).toHaveAttribute("href", "/dates");
    await expect(way(page, "trip")).toHaveAttribute("href", "/trips");
    await expect(way(page, "gift")).toContainText("Make them the Halfway gift");
    await expect(way(page, "dates")).toContainText("Date ideas near either of you");
    await expect(way(page, "trip")).toContainText("Trips for two, planned day by day");
    for (const img of await ways(page).locator("img").all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
    // The gift's poster shows its map alone: not its own sample "6,863 km between you" above it (the
    // top 21%), nor the sample names and towns below (Iván, Clara, LISBON, BOSTON: from 63%), which
    // under the couple's real answer would read as theirs.
    const rows = await posterRows(way(page, "gift").locator("img"));
    expect(rows.top).toBeGreaterThan(0.21);
    expect(rows.bottom).toBeLessThan(0.63);

    await both(page, "London", "Edinburgh");
    await expect(way(page, "gift")).toHaveAttribute("href", "/create/halfway");
    await expect(way(page, "dates")).toContainText("Date ideas in Manchester");
    await expect(way(page, "dates")).toHaveAttribute("href", "/dates/manchester");
    await expect(way(page, "trip")).toHaveAttribute("href", "/trips/scottish-highlands");

    // A town the map names, not one of ours: its dates by where it is.
    await mapSays(page, () => REIMS);
    await page.goto(TOOL);
    await both(page, "Riga", "Lisbon");
    await expect(page.locator("[data-halfway-city]")).toHaveText("Reims");
    await expect(way(page, "dates")).toContainText("Date ideas in Reims");
    await expect(way(page, "dates")).toHaveAttribute("href", /^\/dates\?lat=49\.2583&lng=4\.0317&q=Reims$/);
    await expect(way(page, "trip")).toContainText("The Baltic coast, Riga to Tallinn");
    await expect(way(page, "trip")).toHaveAttribute("href", "/trips/baltic-coast");
  });

  test("the Halfway gift starts with the two towns and a line for the middle", async ({ page, isMobile }) => {
    test.setTimeout(120_000);
    await page.goto(TOOL);
    await both(page, "London", "Edinburgh");
    await expect(page.locator("[data-halfway-city]")).toHaveText("Manchester");
    await clickInPlace(way(page, "gift"));
    const seed = JSON.parse((await page.evaluate(() => sessionStorage.getItem("ethos:gift-seed"))) ?? "{}");
    expect(seed.slug).toBe("halfway");
    expect(seed.fields.from.name).toBe("London");
    expect(seed.fields.to.name).toBe("Edinburgh");
    expect(seed.fields.stops).toEqual([]);
    expect(seed.fields.halfwayNote).toBe("Halfway is Manchester. Meet me there?");
    expect("distanceKm" in seed.fields).toBe(false);
    if (isMobile) return;

    await way(page, "gift").click();
    await page.waitForURL(/\/create\/halfway/, { timeout: 60_000 });
    await expect
      .poll(() => page.locator("input").evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value)), { timeout: 60_000 })
      .toEqual(expect.arrayContaining(["London", "Edinburgh"]));
  });

  test("the link carries the two towns, and opens on the same answer without asking anybody", async ({ page, context, isMobile }) => {
    test.skip(isMobile, "the clipboard is a desk's");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await noShare(page);
    await page.goto(TOOL);
    await both(page, "London", "Edinburgh");
    await page.getByRole("button", { name: "Send them this" }).click();
    await expect(page.locator("[data-halfway-share]")).toContainText("Link copied");
    const link = await page.evaluate(() => navigator.clipboard.readText());
    // Each town to two decimals.
    expect(link).toMatch(new RegExp(`${TOOL}\\?a=London~51\\.51~-0\\.1\\d&b=Edinburgh~55\\.95~-3\\.19$`));

    // The answer is in the page the server sends: no empty box first, then the answer.
    const html = await (await page.request.get(link)).text();
    expect(html).toContain("data-halfway-city");
    expect(html).toContain("Manchester");

    const opened = await context.newPage();
    const asked: string[] = [];
    opened.on("request", (r) => {
      if (r.url().includes("/api/places")) asked.push(r.url());
    });
    await opened.goto(link);
    await expect(opened.locator("[data-halfway-city]")).toHaveText("Manchester");
    await expect(opened.locator("[data-halfway-each]")).toHaveText(/^26\d km for you · 28\d km for them$/);
    await expect(opened.getByRole("combobox", { name: "Where you are" })).toHaveValue("London");
    await expect(opened.getByRole("combobox", { name: "Where they are" })).toHaveValue("Edinburgh");
    expect(asked).toEqual([]);

    const shared = await context.newPage();
    await catchShares(shared);
    await shared.goto(link);
    await expect(shared.locator("[data-halfway-city]")).toHaveText("Manchester");
    await shared.getByRole("button", { name: "Send them this" }).click();
    await expect.poll(async () => (await lastShare(shared))?.text).toBe("Halfway between us is Manchester.");
  });

  test("a link that needs the map says, without JavaScript, how far each travels and never 'Finding…'", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, locale: "en-IE" });
    const page = await context.newPage();
    await page.goto(`${TOOL}?a=Austin~30.27~-97.74&b=Denver~39.74~-104.99`);
    await expect(page.locator("[data-halfway-city]")).toHaveText(/62\d km each/);
    const result = page.locator("[data-halfway-result]");
    await expect(result).toContainText("How far each of you would travel to meet exactly halfway.");
    await expect(result).not.toContainText("Finding");
    await context.close();
  });

  test("the towns are never written into the address, yet a reload and Back open on the answer again", async ({ page }) => {
    await page.goto(TOOL);
    await both(page, "London", "Edinburgh");
    await expect(page.locator("[data-halfway-city]")).toHaveText("Manchester");
    await page.waitForTimeout(300);
    expect(new URL(page.url()).search).toBe("");
    await page.reload();
    await expect(page.locator("[data-halfway-city]")).toHaveText("Manchester");
    await expect(page.getByRole("combobox", { name: "Where you are" })).toHaveValue("London");
    expect(new URL(page.url()).search).toBe("");

    await way(page, "dates").click();
    await page.waitForURL(/\/dates\/manchester$/);
    await page.goBack();
    await expect(page.locator("[data-halfway-city]")).toHaveText("Manchester");
    await expect(page.getByRole("combobox", { name: "Where they are" })).toHaveValue("Edinburgh");

    // Opened from a link, the address keeps it until a town is changed; then it is dropped.
    await page.goto(`${TOOL}?a=London~51.51~-0.13&b=Edinburgh~55.95~-3.19`);
    await expect(page.locator("[data-halfway-city]")).toHaveText("Manchester");
    await page.waitForTimeout(300);
    expect(new URL(page.url()).search).toContain("a=London");
    await typeTown(page, "Where they are", "Paris");
    await expect(page.locator("[data-halfway-city]")).not.toHaveText("Manchester");
    await expect.poll(() => new URL(page.url()).search).toBe("");
  });

  test("a link that is not two towns says so, and opens the empty tool", async ({ page }) => {
    const noErrors = watchErrors(page);
    for (const query of ["?a=x&b=y", "?a=Riga~91~0&b=Lisbon~38.72~-9.14", "?a=Riga~56.95~24.11"]) {
      await page.goto(`${TOOL}${query}`);
      await expect(page.locator("[data-halfway-result]")).toContainText("That link's towns couldn't be read. Type them again and we'll do the math.");
      await expect(page.getByRole("combobox", { name: "Where you are" })).toHaveValue("");
      await expect(page.getByRole("combobox", { name: "Where they are" })).toHaveValue("");
    }
    await page.goto(TOOL);
    await expect(page.locator("[data-halfway-result]")).toContainText("Pick both towns and we'll do the math.");
    noErrors();
  });

  test("dry land is never called the sea: a town on the map is named, and open country is said as such", async ({ page }) => {
    // Austin and Denver: halfway is the Texas panhandle, 400 km and more from any city in the table.
    const asked = await mapSays(page, () => ({ kind: "none" }));
    await page.goto(TOOL);
    await both(page, "Austin", "Denver");
    await expect(page.locator("[data-halfway-city]")).toHaveText("No town near halfway");
    await expect(page.locator("[data-halfway-result]")).toContainText(/62\d km each\. The middle is open country, with no town close to it\./);
    await expect(page.locator("[data-halfway-result]")).not.toContainText(/water|sea\b|land/i);
    await expect(page.locator("[data-halfway-map]")).toHaveAttribute("href", /^https:\/\/www\.openstreetmap\.org\/\?mlat=35\.\d+&mlon=-101\.\d+/);
    // Only the middle is asked about, never a town, and never in a language: the server always asks in English.
    expect(asked.length).toBeGreaterThan(0);
    for (const point of asked) {
      expect(Math.abs(point.lat - 35.2)).toBeLessThan(0.6);
      expect(Math.abs(point.lng + 101.6)).toBeLessThan(0.6);
    }

    await mapSays(page, () => ({ kind: "town", name: "Amarillo", region: "Texas", countryCode: "US", lat: 35.2073, lng: -101.8371 }));
    await page.goto(TOOL);
    await both(page, "Austin", "Denver");
    await expect(page.locator("[data-halfway-city]")).toHaveText("Amarillo");
    await expect(page.locator("[data-halfway-result]")).toContainText(/Texas, 6\d km from the exact middle\./);
    await expect(page.locator("[data-halfway-each]")).toHaveText(/^6[67]\d km for you · 57\d km for them$/);
    await expect(page.getByRole("link", { name: "Town names © OpenStreetMap" })).toHaveAttribute("href", "https://www.openstreetmap.org/copyright");
    await expect(way(page, "dates")).toContainText("Date ideas in Amarillo");

    // The map cannot be asked: how far each, and the spot on a map; no claim about what is there.
    await mapSays(page, () => null);
    await page.goto(TOOL);
    await both(page, "Austin", "Denver");
    await expect(page.locator("[data-halfway-city]")).toHaveText(/62\d km each/);
    await expect(page.locator("[data-halfway-result]")).toContainText("We couldn't name the town nearest halfway just now.");
    await expect(page.locator("[data-halfway-map]")).toBeVisible();
    // Back online, it asks again by itself.
    await mapSays(page, () => ({ kind: "town", name: "Amarillo", region: "Texas", countryCode: "US", lat: 35.2073, lng: -101.8371 }));
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.locator("[data-halfway-city]")).toHaveText("Amarillo");
  });

  test("open sea is said, a place in Spain is never named, and their own town is not called halfway", async ({ page }) => {
    await mapSays(page, () => ({ kind: "sea" }));
    await page.goto(TOOL);
    await both(page, "New York", "London");
    await expect(page.locator("[data-halfway-city]")).toHaveText("Open water");
    await expect(page.locator("[data-halfway-result]")).toContainText(/2,78\d km each\. Halfway between you is out at sea\./);

    await page.goto(TOOL);
    await both(page, "Lisbon", "Paris");
    await expect(page.locator("[data-halfway-city]")).toHaveText(/72[67] km each/);
    await expect(page.locator("[data-halfway-result]")).toContainText("How far each of you would travel to meet exactly halfway.");
    expect(await page.locator("[data-halfway-tool]").innerText()).not.toMatch(/Bilbao|Madrid|Spain|España/i);
    for (const text of await ways(page).allInnerTexts()) expect(text).not.toMatch(/Bilbao|Madrid|Spain|España/i);
    // Halfway in a country never named: no typed town is echoed on the card either.
    await expect(way(page, "dates")).toContainText("Date ideas near either of you");
    await expect(way(page, "dates")).toHaveAttribute("href", "/dates");

    // Prague and Vienna: the table's nearest city is Vienna itself, so the map is asked what lies between.
    await mapSays(page, () => ({ kind: "town", name: "Jihlava", region: "Vysočina", countryCode: "CZ", lat: 49.3961, lng: 15.5912 }));
    await page.goto(TOOL);
    await both(page, "Prague", "Vienna");
    await expect(page.locator("[data-halfway-city]")).toHaveText("Jihlava");
    // The map finds only one of their own towns: no town is named, and the line says why.
    await mapSays(page, () => ({ kind: "town", name: "Vienna", countryCode: "AT", lat: 48.2082, lng: 16.3738 }));
    await page.goto(TOOL);
    await both(page, "Prague", "Vienna");
    await expect(page.locator("[data-halfway-city]")).toHaveText(/12[56] km each/);
    await expect(page.locator("[data-halfway-result]")).toContainText("No town lies nearer the middle than your own two, so take turns visiting.");
    expect(await page.locator("[data-halfway-city]").innerText()).not.toMatch(/Prague|Vienna/i);
  });

  test("in Spanish, all of it", async ({ page }) => {
    const asked: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/places?lat=")) asked.push(r.url());
    });
    await page.goto(`/es${TOOL}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("A medio camino entre dos ciudades");
    await expect(page.locator("[data-halfway-tool]")).toContainText("Dónde estás tú");
    await expect(page.locator("[data-halfway-tool]")).toContainText("Dónde está la otra persona");
    await both(page, "Prague", "Milan", true);
    await expect(page.locator("[data-halfway-city]")).toHaveText("Múnich");
    await expect(page.locator("[data-halfway-each]")).toHaveText(/km para ti · .* km para la otra persona/);
    await expect(way(page, "dates")).toContainText("Ideas para una cita en Múnich");
    await expect(way(page, "dates")).toHaveAttribute("href", "/es/dates/munich");
    await expect(way(page, "gift")).toContainText("Hazle el regalo «A medio camino»");
    await expect(page.getByRole("button", { name: "Envíaselo" })).toBeVisible();

    // A town from the map is the name the map gives in English (Photon has no Spanish; with no
    // language it answered 恵那市 for Tokyo and Osaka): the Spanish page asks just as the English one does.
    await mapSays(page, () => ({ kind: "town", name: "Ena", region: "Gifu Prefecture", countryCode: "JP", lat: 35.4497, lng: 137.4127 }));
    await page.goto(`/es${TOOL}`);
    await both(page, "Austin", "Denver", true);
    await expect(page.locator("[data-halfway-city]")).toHaveText("Ena");
    expect(asked.length).toBeGreaterThan(0);
    for (const url of asked) expect(new URL(url).searchParams.has("lang"), url).toBe(false);
  });

  test("the footer and the long-distance room lead here, and the sitemap lists it", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.locator("footer").getByRole("link", { name: "Halfway between two cities" })).toHaveAttribute("href", TOOL);
    await page.goto("/long-distance");
    await expect(page.getByTestId("ldr-tool")).toHaveAttribute("href", TOOL);
    const xml = await (await request.get("/sitemap.xml")).text();
    expect(xml).toContain(TOOL);
    expect(xml).toContain(`/es${TOOL}`);
  });

  test("a way on is counted, and no town ever is", async ({ page }) => {
    await noShare(page);
    const events = await countEvents(page);
    await page.goto(TOOL);
    await both(page, "London", "Edinburgh");
    await page.getByRole("button", { name: "Send them this" }).click();
    await page.waitForTimeout(300);
    expect((await events()).filter((e) => e.name === "room_handoff" || e.name.startsWith("trip_"))).toEqual([]);
    await clickInPlace(way(page, "gift"));
    await clickInPlace(way(page, "trip"));
    await expect
      .poll(async () => (await events()).filter((e) => e.name === "room_handoff").map((e) => e.data))
      .toEqual([
        { from: "halfway_tool", to: "halfway_gift" },
        { from: "halfway_tool", to: "trip" },
      ]);
    expect(JSON.stringify(await events())).not.toMatch(/London|Edinburgh|Manchester/);
  });
});

test.describe("in miles, for a visitor from the United States", () => {
  test.use({ locale: "en-US" });

  test("every distance is in miles", async ({ page }) => {
    await page.goto(TOOL);
    await both(page, "London", "Edinburgh");
    await expect(page.locator("[data-halfway-city]")).toHaveText("Manchester");
    await expect(page.locator("[data-halfway-each]")).toHaveText(/^16\d miles for you · 17\d miles for them$/);
    await mapSays(page, () => ({ kind: "town", name: "Amarillo", region: "Texas", countryCode: "US", lat: 35.2073, lng: -101.8371 }));
    await page.goto(TOOL);
    await both(page, "Austin", "Denver");
    await expect(page.locator("[data-halfway-result]")).toContainText(/Texas, 4\d miles from the exact middle\./);
    await expect(page.locator("[data-halfway-tool]")).not.toContainText(" km");
  });
});
