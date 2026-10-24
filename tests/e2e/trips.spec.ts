import { expect, test, type Page } from "@playwright/test";

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
