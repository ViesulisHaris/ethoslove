import { expect, test, type Page } from "@playwright/test";

/**
 * The city pages. Their places are read on the server from the map's tiles, which a test cannot
 * intercept, so nothing here depends on them: a page must stand up with or without its places.
 */

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return () => expect(errors, errors.join("\n")).toEqual([]);
}

test("a city's page names the city, lists its ideas and opens the map on it", async ({ page }) => {
  const noErrors = watchErrors(page);
  const response = await page.goto("/dates/london");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/^Date ideas in London: 16 ideas/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Date ideas in London");
  await expect(page.getByTestId("city-ideas").getByRole("listitem").filter({ has: page.locator("article") })).toHaveCount(16);

  const map = page.getByRole("link", { name: "Open the map in London" }).first();
  const href = new URL((await map.getAttribute("href")) ?? "", "http://x");
  expect(href.pathname).toBe("/dates");
  expect(href.searchParams.get("q")).toBe("London");
  expect(Number(href.searchParams.get("lat"))).toBeCloseTo(51.51, 1);

  const gift = page.getByRole("link", { name: "Make them a gift" });
  await expect(gift).toHaveAttribute("href", "/templates?ref=city");

  const tickets = page.getByRole("link", { name: "Tickets in London" });
  await expect(tickets).toHaveAttribute("rel", /sponsored/);
  await expect(tickets).toHaveAttribute("target", "_blank");
  await expect(page.getByText(/may earn a commission/)).toBeVisible();

  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((json) => json.includes('"ItemList"') && json.includes("#idea-"))).toBe(true);
  noErrors();
});

test("the Spanish page speaks Spanish and names the city the Spanish way", async ({ page }) => {
  await page.goto("/es/dates/london");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ideas para una cita en Londres");
  await expect(page.getByRole("link", { name: "Abrir el mapa de Londres" }).first()).toBeVisible();
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/dates\/london$/);
});

test("an idea's link opens the map on that city with the idea chosen", async ({ page }) => {
  await page.goto("/dates/sydney");
  const first = page.getByTestId("city-ideas").getByRole("link", { name: "See it on the map" }).first();
  const href = new URL((await first.getAttribute("href")) ?? "", "http://x");
  expect(href.searchParams.get("q")).toBe("Sydney");
  expect(href.searchParams.get("idea")).toBeTruthy();
});

test("a city that has no page is a 404", async ({ page }) => {
  const response = await page.goto("/dates/atlantis");
  expect(response?.status()).toBe(404);
});

test("the dates map links to every city's page", async ({ page }) => {
  await page.route("https://tiles.openfreemap.org/**", (route) => route.abort());
  await page.route("**/api/dates/here", (route) => route.fulfill({ json: { place: null } }));
  await page.goto("/dates");
  const cities = page.getByRole("navigation", { name: "Date ideas by city" });
  await expect(cities.getByRole("link", { name: "London" })).toHaveAttribute("href", "/dates/london");
  await expect(cities.getByRole("link")).toHaveCount(55);
});

test("X1 a new city's page stands up like the others", async ({ page }) => {
  const noErrors = watchErrors(page);
  const response = await page.goto("/dates/nashville");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Date ideas in Nashville");
  await expect(page.getByTestId("city-ideas").getByRole("listitem").filter({ has: page.locator("article") })).toHaveCount(16);
  await expect(page.getByText(/^The honky-tonks/)).toBeVisible();
  const map = page.getByRole("link", { name: "Open the map in Nashville" }).first();
  expect(new URL((await map.getAttribute("href")) ?? "", "http://x").searchParams.get("q")).toBe("Nashville");
  noErrors();
});

test("X2 the Spanish page of a new city says its name the Spanish way", async ({ page }) => {
  await page.goto("/es/dates/philadelphia");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ideas para una cita en Filadelfia");
  await page.goto("/es/dates/st-louis");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ideas para una cita en San Luis");
});

const PAIRS = [
  { path: "new-york/cheap", city: "new-york", kind: "cheap", en: "Cheap Date Ideas in NYC", es: "Citas baratas en Nueva York", cards: 8 },
  { path: "new-york/first-date", city: "new-york", kind: "first-date", en: "First Date Ideas in NYC", es: "Primera cita en Nueva York", cards: 9 },
  { path: "london/first-date", city: "london", kind: "first-date", en: "First Date Ideas in London", es: "Primera cita en Londres", cards: 9 },
  { path: "london/cheap", city: "london", kind: "cheap", en: "Cheap Date Ideas in London", es: "Citas baratas en Londres", cards: 8 },
  { path: "chicago/romantic", city: "chicago", kind: "romantic", en: "Romantic Date Ideas in Chicago", es: "Citas románticas en Chicago", cards: 10 },
  { path: "london/night", city: "london", kind: "night", en: "Date Night Ideas in London", es: "Noche de cita en Londres", cards: 9 },
];

test("X3 the hand-written city-by-kind pages and two composed ones are there in both languages", async ({ page }) => {
  test.setTimeout(240_000);
  const noErrors = watchErrors(page);
  for (const pair of PAIRS) {
    for (const locale of ["", "/es"]) {
      const path = `${locale}/dates/${pair.path}`;
      // The language last chosen is remembered in a cookie: a bare address would follow it.
      await page.context().clearCookies();
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
      expect((await page.title()).startsWith(locale ? pair.es : pair.en), `${path}: ${await page.title()}`).toBe(true);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.locator("[data-card]")).toHaveCount(pair.cards);
      await expect(page.locator(`a[href="${locale}/dates/${pair.city}"]`).first()).toBeAttached();
      await expect(page.locator(`a[href="${locale}/dates/ideas/${pair.kind}"]`).first()).toBeAttached();
      expect(await page.locator('link[rel="canonical"]').getAttribute("href"), path).toMatch(new RegExp(`${locale}/dates/${pair.path}$`));
      expect(await page.locator('link[rel="alternate"][hreflang="es"]').getAttribute("href"), path).toMatch(new RegExp(`/es/dates/${pair.path}$`));
    }
  }
  noErrors();
});

test("X4 a pair the data does not hold is a 404", async ({ page }) => {
  for (const path of ["/dates/london/outdoor", "/dates/miami/winter", "/dates/boston/night", "/dates/new-york/rainy-day", "/dates/atlantis/cheap", "/dates/london/nope"]) expect((await page.goto(path))?.status(), path).toBe(404);
});

test("X5 a city's page points at exactly the pairs its data holds", async ({ page }) => {
  // London: first date, fun, cheap, romantic, rainy day, date night, unique (tests/unit/city-kind-pairs.test.ts).
  await page.goto("/dates/london");
  const london = page.getByRole("navigation", { name: "In London, by kind" }).getByRole("link");
  await expect(london).toHaveCount(7);
  await expect(page.locator('a[href="/dates/london/night"]').first()).toBeAttached();
  await expect(page.locator('a[href="/dates/london/outdoor"]')).toHaveCount(0);
  await page.goto("/dates/miami");
  await expect(page.getByRole("navigation", { name: "In Miami, by kind" }).getByRole("link")).toHaveCount(4);
});

test("X6 every city's page has the planner", async ({ page }) => {
  for (const [path, button] of [["/dates/sydney", "Plan it"], ["/es/dates/sydney", "Planear"]]) {
    await page.context().clearCookies();
    await page.goto(path);
    const band = page.locator("#tonight");
    await expect(band.locator("p.font-display").first()).toBeVisible();
    await expect(band.getByRole("button", { name: button, exact: true })).toBeVisible();
  }
});
