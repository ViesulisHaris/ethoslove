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
  await expect(cities.getByRole("link")).toHaveCount(31);
});
