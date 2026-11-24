import { expect, test } from "@playwright/test";
import { clickInPlace, countEvents, mockTowns, posterRows, TOWNS, typeTown, watchErrors } from "./rooms-world";

/**
 * The ways from one room to another, each once and where it fits: long distance after its halfway
 * city (the Halfway gift, a trip for the next visit), its games for a call, and the sender's share
 * screen after an anniversary gift (one line to date ideas). The saved-trip line is in
 * saved-dates.spec.ts, beside the save it follows.
 */

test.describe("long distance, joined up", () => {
  test.beforeEach(async ({ page }) => {
    await mockTowns(page);
  });

  test("after the halfway city, the gift and a trip, and still one link to the dates", async ({ page }) => {
    const noErrors = watchErrors(page);
    // Riga and Lisbon: the table's Luxembourg is not fair to both, so the map is asked; it names Reims.
    await mockTowns(page, TOWNS, () => ({ kind: "town", name: "Reims", region: "Grand Est", countryCode: "FR", lat: 49.2583, lng: 4.0317 }));
    await page.goto("/long-distance");
    await expect(page.getByTestId("meet-ways")).toHaveCount(0);
    await typeTown(page, "Where you are", "Riga");
    await typeTown(page, "Where they are", "Lisbon");
    await expect(page.getByText("Reims", { exact: true })).toBeVisible();
    const ways = page.getByTestId("meet-ways").locator("[data-way]");
    await expect(ways).toHaveCount(2);
    const gift = page.locator('[data-way="gift"] a');
    await expect(gift).toHaveAttribute("href", "/create/halfway");
    await expect(page.locator('[data-way="trip"] a')).toContainText("The Baltic coast, Riga to Tallinn");
    await expect(page.locator('[data-way="trip"] a')).toHaveAttribute("href", "/trips/baltic-coast");
    await expect(page.getByRole("link", { name: /^Date ideas in / })).toHaveCount(1);

    await clickInPlace(gift);
    const seed = JSON.parse((await page.evaluate(() => sessionStorage.getItem("ethos:gift-seed"))) ?? "{}");
    expect(seed.slug).toBe("halfway");
    expect(seed.fields.from.name).toBe("Riga");
    expect(seed.fields.to.name).toBe("Lisbon");
    expect(seed.fields.stops).toEqual([]);
    expect(seed.fields.halfwayNote).toBe("Halfway is Reims. Meet me there?");
    noErrors();
  });

  test("the halfway card says a map town's region, and in miles where people read miles", async ({ page }) => {
    await mockTowns(page, TOWNS, () => ({ kind: "town", name: "Warren", region: "Ohio", countryCode: "US", lat: 41.2376, lng: -80.8184 }));
    await page.goto("/long-distance");
    await typeTown(page, "Where you are", "New York");
    await typeTown(page, "Where they are", "Chicago");
    await expect(page.getByText("Warren", { exact: true })).toBeVisible();
    await expect(page.getByText(/^Ohio, /)).toBeVisible();
    // A euro visitor reads kilometres first.
    await expect(page.getByText(/^1,1\d\d km$/)).toBeVisible();
  });

  test("two ways on share the whole width on a desk, and the gift's picture shows no sample names", async ({ page, isMobile }) => {
    await page.goto("/long-distance");
    await typeTown(page, "Where you are", "Riga");
    await typeTown(page, "Where they are", "Lisbon");
    const row = page.locator("#meet-ways-row");
    await expect(row.locator("[data-way]")).toHaveCount(2);
    const img = row.locator('[data-way="gift"] img');
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const rows = await posterRows(img);
    expect(rows.top).toBeGreaterThan(0.21);
    expect(rows.bottom).toBeLessThan(0.63);
    if (isMobile) return;
    const [r, cards] = await Promise.all([row.boundingBox(), row.locator("[data-way]").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().right))]);
    // The second card ends at the row's right edge: no empty third.
    expect(Math.abs(Math.max(...cards) - (r!.x + r!.width))).toBeLessThanOrEqual(2);
  });

  test("when no trip starts near them it offers the shelf, not a trip", async ({ page }) => {
    await page.goto("/long-distance");
    await typeTown(page, "Where you are", "Chicago");
    await typeTown(page, "Where they are", "Boston");
    await expect(page.getByTestId("meet-ways")).toBeVisible();
    const trip = page.locator('[data-way="trip"] a');
    await expect(trip).toContainText("Trips for two, planned day by day");
    await expect(trip).toHaveAttribute("href", "/trips");
  });

  test("two games to play on the call, and every one of them opens", async ({ page, request }) => {
    await page.goto("/long-distance");
    const games = page.getByTestId("ldr-games").getByRole("link");
    await expect(games).toHaveCount(2);
    await expect(games.nth(0)).toHaveAccessibleName("Draw it, guess it");
    await expect(games.nth(0)).toHaveAttribute("href", "/games/draw");
    await expect(games.nth(1)).toHaveAccessibleName("Would you rather?");
    await expect(games.nth(1)).toHaveAttribute("href", "/games/rather");
    for (const href of await games.evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""))) expect((await request.get(href)).status(), href).toBe(200);
  });

  test("the page says where it sits, and leads to the tool", async ({ page }) => {
    await page.goto("/long-distance");
    const nodes = await page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.flatMap((el) => { const v = JSON.parse(el.textContent ?? "{}"); return v["@graph"] ?? [v]; }));
    const crumbs = nodes.find((n: { "@type"?: string }) => n["@type"] === "BreadcrumbList");
    expect(crumbs?.itemListElement[1].name).toBe("Long distance");
    expect(crumbs?.itemListElement[1].item ?? crumbs?.itemListElement[1].url).toMatch(/\/long-distance$/);
    const tool = page.getByTestId("ldr-tool");
    await expect(tool).toBeVisible();
    expect((await tool.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe("the share screen after an anniversary gift", () => {
  test("one line under the reminders leads to date ideas", async ({ page }) => {
    await page.goto("/reminders/preview?template=our-timeline&name=Ana");
    const line = page.getByTestId("anniversary-dates");
    await expect(line).toHaveText("Planning the day too? An anniversary evening, planned hour by hour (opens in a new tab)");
    await expect(line.getByRole("link")).toHaveAccessibleName("An anniversary evening, planned hour by hour (opens in a new tab)");
    const link = line.getByRole("link");
    // The words promise anniversary ideas, so it leads to the post that has them, not the dates map.
    await expect(link).toHaveAttribute("href", "/blog/anniversary-ideas-at-home");
    expect((await page.request.get("/blog/anniversary-ideas-at-home")).status()).toBe(200);
    await expect(link).toHaveAttribute("target", "_blank");
    // It comes after the reminder card.
    expect(await page.evaluate(() => { const card = document.querySelector('[data-testid="remind-card"]'); const line = document.querySelector('[data-testid="anniversary-dates"]'); return Boolean(card && line && card.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING); })).toBe(true);
    for (const template of ["birthday-cinema", "bouquet", "pack-your-bags", "the-letter", "museum"]) {
      await page.goto(`/reminders/preview?template=${template}&name=Ana`);
      await expect(page.getByTestId("remind-card")).toBeVisible();
      await expect(page.getByTestId("anniversary-dates"), template).toHaveCount(0);
    }
    await page.goto("/es/reminders/preview?template=our-timeline&name=Ana");
    await expect(page.getByTestId("anniversary-dates")).toHaveText("¿Preparáis también el día? Una noche de aniversario, hora a hora (se abre en otra pestaña)");
    await expect(page.getByTestId("anniversary-dates").getByRole("link")).toHaveAttribute("href", "/es/blog/anniversary-ideas-at-home");
    expect((await page.request.get("/es/blog/anniversary-ideas-at-home")).status()).toBe(200);
  });

  test("that line sells nothing", async ({ page }) => {
    const events = await countEvents(page);
    await page.goto("/reminders/preview?template=our-timeline&name=Ana");
    const line = page.getByTestId("anniversary-dates");
    await expect(line.locator('a[rel*="sponsored"]')).toHaveCount(0);
    expect(await line.innerText()).not.toMatch(/[€$£]|\d+[.,]\d{2}/);
    await clickInPlace(line.getByRole("link"));
    await expect.poll(async () => (await events()).filter((e) => e.name === "room_handoff").map((e) => e.data)).toEqual([{ from: "share_screen", to: "anniversary_ideas" }]);
  });
});
