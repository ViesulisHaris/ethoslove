import { expect, test, type Page } from "@playwright/test";
import { catchShares, clickInPlace, countEvents, lastShare, noShare } from "./rooms-world";

/**
 * Trips: the room of ready-made trips, the flight search that only builds links (nothing is
 * fetched, so nothing is mocked), a trip's page with its partner links, and a trip turned into a
 * gift. The map's tiles are refused, so no test waits on OpenFreeMap: the page must work without them.
 */

/** The page a partner link lands on, out of our Travelpayouts short link. */
const landsOn = (href: string | null) => new URL(href ?? "").searchParams.get("u") ?? "";
const ISO = String.raw`\d{4}-\d{2}-\d{2}`;

/** Fails the test on any uncaught error in the page. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return () => expect(errors, errors.join("\n")).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
});

test.describe("the trips room", () => {
  test("shows twelve trips, and a chip narrows them to one kind", async ({ page }) => {
    const noErrors = watchErrors(page);
    await page.goto("/trips");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Go somewhere");
    const cards = page.getByTestId("trip-card");
    await expect(cards).toHaveCount(12);

    await page.getByRole("button", { name: /^Islands/ }).click();
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("Santorini and Naxos");
    await page.getByRole("button", { name: /^Road trips/ }).click();
    await expect(cards).toHaveCount(6);
    await expect(page.getByRole("button", { name: /^Road trips/ })).toHaveAttribute("aria-pressed", "true");
    // "All 12", not the footer's "Allow cookies".
    await page.getByRole("button", { name: /^All \d+$/ }).click();
    await expect(cards).toHaveCount(12);
    noErrors();
  });

  test("the flight search builds an Aviasales search first, then the three to compare, all dated", async ({ page }) => {
    const noErrors = watchErrors(page);
    await page.goto("/trips");
    const finder = page.getByTestId("flight-finder");
    // Before any airport is picked, the dates are already a long weekend: a Friday and the Monday after.
    const dates = finder.locator("button[data-date]");
    await expect(dates.nth(0)).toHaveAttribute("data-date", new RegExp(`^${ISO}$`));
    await expect(dates.nth(0)).toHaveAccessibleName(/^Depart: Friday \d+ \w+ \d{4}$/);
    const [out, home] = await dates.evaluateAll((els) => els.map((el) => el.getAttribute("data-date") ?? ""));
    expect(new Date(`${out}T12:00`).getDay()).toBe(5);
    expect(new Date(`${home}T12:00`).getDay()).toBe(1);

    await finder.getByRole("combobox", { name: "From" }).fill("Rig");
    await page.getByRole("option", { name: /Riga · RIX/ }).click();
    await finder.getByRole("combobox", { name: "To" }).fill("Lisb");
    await page.getByRole("option", { name: /Lisbon · LIS/ }).click();

    const aviasales = finder.getByRole("link", { name: /Search on Aviasales/ });
    await expect(aviasales).toBeVisible();
    await expect(aviasales).toHaveAttribute("target", "_blank");
    await expect(aviasales).toHaveAttribute("rel", "noopener noreferrer sponsored");
    const ddmm = (iso: string) => `${iso.slice(8, 10)}${iso.slice(5, 7)}`;
    expect(landsOn(await aviasales.getAttribute("href"))).toBe(`https://www.aviasales.com/search/RIX${ddmm(out)}LIS${ddmm(home)}2`);
    await expect(aviasales).toHaveAttribute("href", /^https:\/\/aviasales\.tpm\.lv\//);

    const google = finder.getByRole("link", { name: /Google Flights/ });
    const href = decodeURIComponent((await google.getAttribute("href")) ?? "");
    expect(href).toContain("https://www.google.com/travel/flights");
    expect(href).toContain("Riga");
    expect(href).toContain("Lisbon");
    expect(href).toContain(`on ${out} through ${home}`);
    await expect(google).toHaveAttribute("target", "_blank");
    // Not a partner of ours, so not marked as one.
    await expect(google).toHaveAttribute("rel", "noopener noreferrer");
    await expect(finder.getByRole("link", { name: /Skyscanner/ })).toHaveAttribute("href", /\/rix\/lis\/\d{6}\/\d{6}\//);
    await expect(finder.getByRole("link", { name: /Kayak/ })).toHaveAttribute("href", new RegExp(`RIX-LIS/${out}/${home}/2adults$`));
    await expect(finder).toContainText("in the air");
    await expect(finder).toContainText("We may earn a commission if you book through some of these links. It costs you nothing extra.");
    await expect(finder).not.toContainText("We don't sell flights");

    // Their own dates replace the weekend, picked on the calendar: the first tap is the day out, the second the way back.
    const later = (iso: string, days: number) => new Date(Date.parse(iso) + days * 86_400_000).toISOString().slice(0, 10);
    const [go, back] = [later(out, 14), later(out, 19)];
    await dates.nth(0).click();
    const picker = page.getByRole("dialog", { name: "Choose your dates" });
    await expect(picker).toBeVisible();
    await expect(picker.getByRole("grid").first()).toBeVisible();
    await picker.locator(`[data-day="${go}"]`).click();
    await expect(picker.locator(`[data-day="${go}"]`)).toHaveAccessibleName(/, Depart$/);
    await picker.locator(`[data-day="${back}"]`).click();
    await expect(picker).toContainText("5 nights");
    await picker.getByRole("button", { name: "Done" }).click();
    await expect(picker).toBeHidden();
    await expect(dates.nth(1)).toHaveAttribute("data-date", back);
    await expect(finder.getByRole("link", { name: /Kayak/ })).toHaveAttribute("href", new RegExp(`RIX-LIS/${go}/${back}/2adults$`));

    // One way drops the return; Escape puts the calendar away and the focus back on the field.
    await dates.nth(1).click();
    await expect(picker).toBeVisible();
    await picker.getByRole("button", { name: "One-way" }).click();
    await expect(picker).toContainText(`One-way · `);
    await page.keyboard.press("Escape");
    await expect(picker).toBeHidden();
    await expect(dates.nth(1)).toBeFocused();
    await expect(dates.nth(1)).toHaveAttribute("data-date", "");
    await expect(finder.getByRole("link", { name: /Kayak/ })).toHaveAttribute("href", new RegExp(`RIX-LIS/${go}/2adults$`));
    expect(landsOn(await aviasales.getAttribute("href"))).toBe(`https://www.aviasales.com/search/RIX${ddmm(go)}LIS2`);
    noErrors();
  });

  test("a trip's page shows the route and the plan, day by day", async ({ page }) => {
    const noErrors = watchErrors(page);
    await page.goto("/trips/baltic-coast");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("The Baltic coast, Riga to Tallinn");
    await expect(page.getByTestId("trip-stops").locator(":scope > li")).toHaveCount(5);
    await expect(page.getByRole("heading", { name: "The plan" })).toBeVisible();
    const days = page.getByTestId("trip-plan").locator(":scope > li");
    await expect(days).toHaveCount(7);
    await expect(days.first()).toContainText("Day 1");
    await expect(days.first()).toContainText("House of the Blackheads");
    await expect(page.getByRole("link", { name: "Date spots here" }).first()).toHaveAttribute("href", /\/dates\?lat=56\.9496&lng=24\.1052&q=Riga/);
    // The flight search starts with the trip's airport already in "To".
    await expect(page.getByTestId("flight-finder").getByRole("combobox", { name: "To" })).toHaveValue("Riga");
    noErrors();
  });

  test("a trip's page sells tickets for its sights, and a car for a road trip", async ({ page }) => {
    const noErrors = watchErrors(page);
    await page.goto("/trips/baltic-coast");
    await expect(page.getByRole("heading", { name: "Tickets for this trip" })).toBeVisible();
    const tickets = page.getByTestId("trip-tickets").getByRole("link");
    await expect(tickets).toHaveCount(2);
    const blackheads = page.getByRole("link", { name: /House of the Blackheads/ });
    await expect(blackheads).toHaveAttribute("rel", "noopener noreferrer sponsored");
    await expect(blackheads).toHaveAttribute("target", "_blank");
    // The name Tiqets lists it under, so its search opens the sight's own page.
    expect(landsOn(await blackheads.getAttribute("href"))).toBe("https://www.tiqets.com/en/search?q=House%20of%20the%20Black%20Heads");
    await expect(page.getByTestId("trip-tickets").locator("..")).toContainText("We may earn a commission");

    const car = page.getByTestId("trip-car").getByRole("link", { name: /Auto Europe/ });
    await expect(car).toHaveAttribute("rel", "noopener noreferrer sponsored");
    expect(landsOn(await car.getAttribute("href"))).toBe("https://www.autoeurope.eu/");

    // Italy has Auto Europe's own page; a city trip has no car at all.
    await page.goto("/trips/tuscany-hill-towns");
    expect(landsOn(await page.getByTestId("trip-car").getByRole("link").getAttribute("href"))).toBe("https://www.autoeurope.eu/car-rental-italy/");
    await page.goto("/trips/prague-krumlov-vienna");
    await expect(page.getByTestId("trip-tickets").getByRole("link")).toHaveCount(4);
    await expect(page.getByTestId("trip-car")).toHaveCount(0);
    noErrors();
  });

  test("in Spanish, the tickets search Tiqets in Spanish and the small print says so", async ({ page }) => {
    await page.goto("/es/trips/amsterdam-by-bike");
    await expect(page.getByRole("heading", { name: "Entradas para este viaje" })).toBeVisible();
    const rijks = page.getByRole("link", { name: /Rijksmuseum/ });
    expect(landsOn(await rijks.getAttribute("href"))).toBe("https://www.tiqets.com/es/search?q=Rijksmuseum");
    await expect(page.getByTestId("flight-finder")).toContainText("Puede que ganemos una comisión");
    // No "from" yet, so the Aviasales button is still a placeholder, already in Spanish.
    await expect(page.getByTestId("flight-finder")).toContainText("Buscar en Aviasales");
  });

  test("Make it a surprise opens the gift with the destination filled in", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/trips/amalfi-coast");
    await page.getByTestId("make-surprise").click();
    await page.waitForURL(/\/create\/pack-your-bags/, { timeout: 60_000 });
    // Generous: against a dev server this may be the first compile of the editor and the template.
    await expect
      .poll(() => page.locator("input").evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value)), { timeout: 60_000 })
      .toContain("Ravello");
  });
});

test.describe("a trip, in search and in their hands", () => {
  const jsonLd = (page: Page) => page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.flatMap((el) => { const v = JSON.parse(el.textContent ?? "{}"); return v["@graph"] ?? [v]; }));

  test("the room is titled with what couples search, in both languages", async ({ page }) => {
    await page.goto("/trips");
    await expect(page).toHaveTitle(/^Couples trip ideas: 12 /);
    const list = (await jsonLd(page)).find((n: { "@type"?: string }) => n["@type"] === "ItemList");
    expect(list?.itemListElement).toHaveLength(12);
    await page.goto("/es/trips");
    await expect(page).toHaveTitle(/^Ideas de viajes en pareja: 12 /);
  });

  test("a trip is titled the way it is searched, keeps its own name on the page, and sends its own picture", async ({ page }) => {
    await page.goto("/trips/lisbon-slow-weekend");
    await expect(page).toHaveTitle(/^3 days in Lisbon for two/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lisbon, slowly");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /itinerary/);
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(og).toContain("/og/share.jpg?k=trip");
    expect(og).toContain("trip=lisbon-slow-weekend");
    await page.goto("/es/trips/lisbon-slow-weekend");
    await expect(page).toHaveTitle(/^3 días en Lisboa/);
  });

  test("Send this trip to them: the share sheet where there is one, a copied link where there is not", async ({ page, context, isMobile }) => {
    await catchShares(page);
    await page.goto("/trips/lisbon-slow-weekend#plan");
    await page.getByTestId("share-trip").click();
    await expect.poll(async () => (await lastShare(page))?.url ?? "").toMatch(/\/trips\/lisbon-slow-weekend$/);
    expect((await lastShare(page))?.text).toBe("Shall we? Lisbon, slowly");
    if (isMobile) return;

    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const copy = await context.newPage();
    await noShare(copy);
    const events = await countEvents(copy);
    await copy.goto("/trips/lisbon-slow-weekend");
    await copy.getByTestId("share-trip").click();
    await expect(copy.getByTestId("share-trip")).toContainText("Link copied");
    expect(await copy.evaluate(() => navigator.clipboard.readText())).toMatch(/\/trips\/lisbon-slow-weekend$/);
    await expect.poll(async () => (await events()).filter((e) => e.name === "trip_shared").map((e) => e.data)).toEqual([{ trip: "lisbon-slow-weekend", how: "copy" }]);
  });

  test("a stop that is one of our cities links to its date ideas, once a city", async ({ page }) => {
    await page.goto("/trips/baltic-coast");
    const cities = page.getByTestId("stop-city");
    await expect(cities).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Date ideas in Riga" })).toHaveAttribute("href", "/dates/riga");
    await expect(page.getByRole("link", { name: "Date ideas in Tallinn" })).toHaveAttribute("href", "/dates/tallinn");
    await expect(page.getByRole("link", { name: "Date spots here" })).toHaveCount(5);
    await page.goto("/trips/lisbon-slow-weekend");
    await expect(page.getByTestId("stop-city")).toHaveCount(1);
    await expect(page.getByTestId("trip-stops").locator("li").first().getByTestId("stop-city")).toHaveText("Date ideas in Lisbon");
    await page.goto("/trips/amalfi-coast");
    await expect(page.getByTestId("stop-city")).toHaveCount(0);
    await page.goto("/es/trips/baltic-coast");
    await expect(page.getByRole("link", { name: "Ideas para una cita en Riga" })).toHaveAttribute("href", "/es/dates/riga");
  });

  test("a partner click on a trip's page says which trip; on the room's page it does not", async ({ page }) => {
    const events = await countEvents(page);
    await page.goto("/trips/baltic-coast");
    await clickInPlace(page.getByRole("link", { name: /House of the Blackheads/ }));
    await expect.poll(async () => (await events()).filter((e) => e.name === "affiliate_click").map((e) => e.data)).toEqual([{ partner: "tiqets", placement: "trip_tickets", trip: "baltic-coast" }]);

    await page.goto("/trips");
    const finder = page.getByTestId("flight-finder");
    await finder.getByRole("combobox", { name: "From" }).fill("Rig");
    await page.getByRole("option", { name: /Riga · RIX/ }).click();
    await finder.getByRole("combobox", { name: "To" }).fill("Lisb");
    await page.getByRole("option", { name: /Lisbon · LIS/ }).click();
    await clickInPlace(finder.getByRole("link", { name: /Search on Aviasales/ }));
    await expect.poll(async () => (await events()).filter((e) => e.name === "affiliate_click").length).toBe(1);
    const [click] = (await events()).filter((e) => e.name === "affiliate_click");
    expect(click.data?.placement).toBe("trips_finder");
    expect(click.data?.partner).toBeTruthy();
    expect(click.data && "trip" in click.data).toBe(false);
  });

  test("the city a trip passes through says so, and a city none passes through says nothing", async ({ page }) => {
    test.setTimeout(90_000);
    // A city's page reads map tiles on the server: its first load is given its time.
    await page.goto("/dates/riga", { timeout: 60_000 });
    const line = page.getByTestId("city-trip");
    await expect(line).toContainText("A trip that passes through here");
    await expect(line.getByRole("link", { name: "The Baltic coast, Riga to Tallinn" })).toHaveAttribute("href", "/trips/baltic-coast");
    await page.goto("/es/dates/riga", { timeout: 60_000 });
    await expect(page.getByTestId("city-trip")).toContainText("Un viaje que pasa por aquí");
    await page.goto("/dates/london", { timeout: 60_000 });
    await expect(page.getByTestId("city-trip")).toHaveCount(0);
  });
});
