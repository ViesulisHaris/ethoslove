import { expect, test, type Page } from "@playwright/test";

/**
 * The partner links outside the trips pages: "Tickets" on a plan's stops, the plan wrapped as a
 * Paper Crane, and Meet in the middle's flights. Nothing is booked or fetched from a partner; the
 * tests read the links. The map's tiles and the forecast are replaced, so nothing waits on them.
 */

const PLAN_KEY = "ethos.dates.plan.v1";
const PLAN = {
  v: 1,
  date: "2030-06-15",
  where: "Lisbon",
  note: "Wear something you can walk in",
  stops: [
    { id: "node/107", name: "Museu do Fado Pequeno", kind: "museum", lat: 38.7118, lng: -9.1284, time: "17:00" },
    { id: "node/104", name: "Gelados Santini", kind: "dessert", lat: 38.713, lng: -9.137, time: "18:30" },
  ],
};

/** The page a partner link lands on, out of our Travelpayouts short link. */
const landsOn = (href: string | null) => new URL(href ?? "").searchParams.get("u") ?? "";

async function quietWorld(page: Page) {
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.route("**/api/dates/weather*", (route) => route.fulfill({ json: { days: [], utcOffsetSeconds: 3600, timezone: "Europe/Lisbon" } }));
}

async function withPlan(page: Page) {
  await page.addInitScript(([key, plan]) => window.localStorage.setItem(key, plan), [PLAN_KEY, JSON.stringify(PLAN)] as const);
}

test.describe("a plan's partner links", () => {
  test("a museum stop has Tickets on Tiqets, marked and disclosed; an ice cream doesn't", async ({ page }) => {
    await quietWorld(page);
    await withPlan(page);
    await page.goto("/plan");
    const tickets = page.getByRole("link", { name: /Tickets for Museu do Fado Pequeno/ });
    await expect(tickets).toHaveCount(1);
    await expect(tickets).toHaveAttribute("rel", "noopener noreferrer sponsored");
    await expect(tickets).toHaveAttribute("target", "_blank");
    expect(landsOn(await tickets.getAttribute("href"))).toBe("https://www.tiqets.com/en/search?q=Museu%20do%20Fado%20Pequeno%20Lisbon");
    await expect(page.getByRole("link", { name: /Tickets for Gelados Santini/ })).toHaveCount(0);
    await expect(page.getByText(/We may earn a commission if you book through some of these links/)).toBeVisible();
  });

  test("Wrap it in a gift opens Paper Crane with the plan on its folds", async ({ page }) => {
    test.setTimeout(120_000);
    await quietWorld(page);
    await withPlan(page);
    await page.goto("/plan");
    await page.getByTestId("plan-gift").click();
    await page.waitForURL(/\/create\/paper-crane/, { timeout: 60_000 });
    // Generous: against a dev server this may be the first compile of the editor and the template.
    await expect
      .poll(() => page.locator("input, textarea").evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value)), { timeout: 60_000 })
      .toEqual(expect.arrayContaining(["1. Museu do Fado Pequeno at 17:00", "2. Gelados Santini at 18:30", "Wear something you can walk in"]));
  });

  test("in Spanish the gift is written in Spanish", async ({ page }) => {
    test.setTimeout(120_000);
    await quietWorld(page);
    await withPlan(page);
    await page.goto("/es/plan");
    await expect(page.getByRole("link", { name: /Entradas para Museu do Fado Pequeno/ })).toHaveAttribute("href", /tiqets\.com%2Fes%2Fsearch/);
    await page.getByTestId("plan-gift").click();
    await page.waitForURL(/\/es\/create\/paper-crane/, { timeout: 60_000 });
    await expect
      .poll(() => page.locator("input, textarea").evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value)), { timeout: 60_000 })
      .toEqual(expect.arrayContaining(["1. Museu do Fado Pequeno a las 17:00"]));
  });
});

test.describe("meet in the middle", () => {
  test("each flight is an Aviasales search with Google Flights beside it", async ({ page }) => {
    const towns: Record<string, { lat: number; lng: number; offset: number; country: string }> = {
      Riga: { lat: 56.9494, lng: 24.1052, offset: 10800, country: "Latvia" },
      Lisbon: { lat: 38.7223, lng: -9.1393, offset: 3600, country: "Portugal" },
    };
    await page.route("**/api/places*", (route) => {
      const q = new URL(route.request().url()).searchParams.get("q") ?? "";
      const town = towns[q];
      return route.fulfill({ json: { results: town ? [{ name: q, kind: "city", lat: town.lat, lng: town.lng, country: town.country }] : [] } });
    });
    await page.route("**/api/dates/weather*", (route) => {
      const lat = Number(new URL(route.request().url()).searchParams.get("lat"));
      return route.fulfill({ json: { days: [], utcOffsetSeconds: lat > 50 ? towns.Riga.offset : towns.Lisbon.offset, timezone: "x" } });
    });
    await page.goto("/long-distance");
    const you = page.getByRole("combobox", { name: "Where you are" });
    await you.fill("Riga");
    await you.press("Enter");
    const them = page.getByRole("combobox", { name: "Where they are" });
    await them.fill("Lisbon");
    await them.press("Enter");

    const flights = page.getByTestId("meet-flights");
    const aviasales = flights.getByRole("link", { name: /Aviasales/ });
    await expect(aviasales.first()).toBeVisible();
    await expect(aviasales.first()).toHaveAttribute("rel", "noopener noreferrer sponsored");
    // One seat, on a weekend three weeks out: a search, never the bare home page.
    expect(landsOn(await aviasales.first().getAttribute("href"))).toMatch(/^https:\/\/www\.aviasales\.com\/search\/[A-Z]{3}\d{4}[A-Z]{3}\d{4}1$/);
    const google = flights.getByRole("link", { name: /Google Flights/ });
    await expect(google).toHaveCount(await aviasales.count());
    await expect(google.first()).toHaveAttribute("rel", "noopener noreferrer");
    await expect(flights).toContainText("We may earn a commission");
  });
});
