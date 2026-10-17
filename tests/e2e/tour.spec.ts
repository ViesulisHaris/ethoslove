import { expect, test, type Page } from "@playwright/test";

/**
 * The tour on the Dates page: it opens by itself on a first visit, walks through every step,
 * remembers it was shown, replays from "How it works", and gets out of the way when skipped.
 *
 * The tour keeps itself off automated browsers (it would cover every first visit in the rest of
 * the suite), so these tests tell the page they are a person. The outside world is mocked the way
 * dates.spec.ts does it, trimmed to what the first screen needs.
 */
const LISBON = { lat: 38.714, lng: -9.139 };
const lisbonUrl = `/dates?lat=${LISBON.lat}&lng=${LISBON.lng}&q=Lisbon`;
const TOUR_KEY = "ethos.tour.dates.v1";
/** Idle, then the room settling, then a quiet moment: a few seconds, never instant. */
const OPENS_WITHIN = 20_000;

const place = (id: string, name: string, kind: string, group: string, dLat: number, dLng: number, score: number) => ({ id, name, named: true, kind, group, lat: LISBON.lat + dLat, lng: LISBON.lng + dLng, distanceKm: 0.2, cuisine: [], outdoorSeating: false, vegetarian: false, stepFree: false, notable: false, score });
const PLACES = [
  place("node/101", "Livraria do Bairro", "bookshop", "culture", 0.001, 0.001, 90),
  place("node/103", "Café da Esquina", "cafe", "sweet", 0.002, 0.0015, 78),
  place("node/105", "Miradouro das Flores", "viewpoint", "outdoors", -0.002, 0.001, 88),
];

async function asAPerson(page: Page) {
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "webdriver", { get: () => false }));
}

async function mockWorld(page: Page) {
  const days = Array.from({ length: 16 }, (_, i) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + i);
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { date: ymd, condition: "clear", tMax: 24, tMin: 12, rainChance: 5, sunrise: "07:27", sunset: "19:27" };
  });
  await page.route("**/api/dates/search*", (route) => route.fulfill({ json: { center: LISBON, radiusM: 1500, total: PLACES.length, complete: true, places: PLACES } }));
  await page.route("**/api/dates/rare*", (route) => route.fulfill({ json: { center: LISBON, radiusM: 8000, places: [] } }));
  await page.route("**/api/dates/weather*", (route) => route.fulfill({ json: { days, utcOffsetSeconds: 3600, timezone: "Europe/Lisbon" } }));
  await page.route("**/api/dates/here", (route) => route.fulfill({ json: { place: null } }));
  await page.route("**/api/dates/photos*", (route) => route.fulfill({ json: { center: LISBON, sights: [] } }));
  await page.route("**/api/dates/photo*", (route) => route.fulfill({ json: { photo: null } }));
  await page.route("**/api/dates/ratings", (route) => route.fulfill({ json: { ratings: {} } }));
  await page.route("https://tiles.openfreemap.org/**", (route) =>
    route.request().url().endsWith("/styles/positron") ? route.fulfill({ json: { version: 8, sources: {}, layers: [{ id: "background", type: "background", paint: { "background-color": "#f2f3f0" } }] } }) : route.abort(),
  );
}

const STEPS = ["Pick your town", "Pick a day", "Pick a mood", "Have a look", "Add it to your plan", "Send it to your person"];

test.describe("the Dates tour", () => {
  test("opens by itself on a first visit, walks every step, and is replayable but not repeated", async ({ page }) => {
    await asAPerson(page);
    await mockWorld(page);
    await page.goto(lisbonUrl);

    const tour = page.getByRole("dialog");
    await expect(tour).toHaveAccessibleName(STEPS[0], { timeout: OPENS_WITHIN });
    await expect(tour).toContainText(`1 of ${STEPS.length}`);
    // Focus starts on the way forward.
    await expect(tour.getByRole("button", { name: "Next" })).toBeFocused();

    for (const [i, title] of STEPS.entries()) {
      await expect(tour).toHaveAccessibleName(title);
      await expect(tour).toContainText(`${i + 1} of ${STEPS.length}`);
      if (i < STEPS.length - 1) await tour.getByRole("button", { name: "Next" }).click();
    }
    // Back goes back, and the last step says it's done rather than "Next".
    await tour.getByRole("button", { name: "Back" }).click();
    await expect(tour).toHaveAccessibleName(STEPS[STEPS.length - 2]);
    await page.keyboard.press("ArrowRight");
    await tour.getByRole("button", { name: "Got it" }).click();
    await expect(tour).toBeHidden();
    expect(await page.evaluate((key) => localStorage.getItem(key), TOUR_KEY)).toBe("1");

    // Shown once: a second visit goes straight to the page.
    await page.reload();
    await expect(page.getByRole("button", { name: /^Livraria do Bairro/ }).first()).toBeVisible();
    await page.waitForTimeout(5000);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // "How it works" plays it again; Escape ends it and hands focus back. The button tucks away
    // once the page is scrolled, and the reload may have kept the scroll the tour left behind.
    await page.evaluate(() => window.scrollTo(0, 0));
    const help = page.getByRole("button", { name: "How it works" });
    await help.click();
    await expect(tour).toHaveAccessibleName(STEPS[0]);
    await page.keyboard.press("Escape");
    await expect(tour).toBeHidden();
    await expect(help).toBeFocused();
  });

  test("Skip ends it at once and it stays gone", async ({ page }) => {
    await asAPerson(page);
    await mockWorld(page);
    await page.goto(lisbonUrl);

    const tour = page.getByRole("dialog");
    await expect(tour).toHaveAccessibleName(STEPS[0], { timeout: OPENS_WITHIN });
    await tour.getByRole("button", { name: "Next" }).click();
    await tour.getByRole("button", { name: "Skip the tour" }).click();
    await expect(tour).toBeHidden();
    // The page is usable straight away.
    const cozy = page.getByRole("button", { name: "Cozy", exact: true });
    await cozy.click();
    await expect(cozy).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate((key) => localStorage.getItem(key), TOUR_KEY)).toBe("1");

    await page.reload();
    await page.waitForTimeout(5000);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("waits while the map is open over the list on a phone, then opens once it is closed", async ({ page, isMobile }) => {
    test.skip(!isMobile, "only a phone opens the map as a layer over the list");
    await asAPerson(page);
    await mockWorld(page);
    await page.goto(lisbonUrl);
    await page.getByRole("button", { name: "Map", exact: true }).click();
    // Well past the moment it would have opened over the list.
    await page.waitForTimeout(6000);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.getByRole("button", { name: "List", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveAccessibleName(STEPS[0], { timeout: OPENS_WITHIN });
  });

  test("speaks Spanish on the Spanish site", async ({ page }) => {
    await asAPerson(page);
    await mockWorld(page);
    await page.goto(`/es${lisbonUrl}`);
    const tour = page.getByRole("dialog");
    await expect(tour).toHaveAccessibleName("Elige tu ciudad", { timeout: OPENS_WITHIN });
    await tour.getByRole("button", { name: "Saltar la guía" }).click();
    await expect(tour).toBeHidden();
  });

  test("stays off pages without a tour", async ({ page }) => {
    await asAPerson(page);
    await page.goto("/pricing");
    await page.waitForTimeout(6000);
    await expect(page.getByRole("button", { name: "How it works" })).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
