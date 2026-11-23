import { expect, test, type Page } from "@playwright/test";
import { catchShares, clickInPlace, countEvents, lastShare, mockTowns, noShare, typeTown, watchErrors } from "./rooms-world";

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

test.beforeEach(async ({ page }) => {
  await mockTowns(page);
});

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
    await both(page, "Riga", "Lisbon");
    await expect(page.locator("[data-halfway-city]")).toHaveText("Luxembourg");
    await expect(page.locator("[data-halfway-result]")).toContainText(/The nearest city to your halfway point, 13\d km from it\./);
    await expect(page.locator("[data-halfway-each]")).toHaveText(/^1,4[34]\d km for you · 1,71\d km for them$/);
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
    await both(page, "Riga", "Lisbon");
    await expect(way(page, "gift")).toHaveAttribute("href", "/create/halfway");
    await expect(way(page, "dates")).toContainText("Date ideas in Luxembourg");
    await expect(way(page, "dates")).toHaveAttribute("href", /^\/dates\?lat=49\.6\d*&lng=6\.1\d*&q=Luxembourg$/);
    await expect(way(page, "trip")).toContainText("The Baltic coast, Riga to Tallinn");
    await expect(way(page, "trip")).toHaveAttribute("href", "/trips/baltic-coast");

    await page.goto(TOOL);
    await both(page, "London", "Edinburgh");
    await expect(way(page, "dates")).toContainText("Date ideas in Manchester");
    await expect(way(page, "dates")).toHaveAttribute("href", "/dates/manchester");
  });

  test("the Halfway gift starts with the two towns and a line for the middle", async ({ page, isMobile }) => {
    test.setTimeout(120_000);
    await page.goto(TOOL);
    await both(page, "Riga", "Lisbon");
    await clickInPlace(way(page, "gift"));
    const seed = JSON.parse((await page.evaluate(() => sessionStorage.getItem("ethos:gift-seed"))) ?? "{}");
    expect(seed.slug).toBe("halfway");
    expect(seed.fields.from.name).toBe("Riga");
    expect(seed.fields.to.name).toBe("Lisbon");
    expect(seed.fields.stops).toEqual([]);
    expect(seed.fields.halfwayNote).toBe("Halfway is Luxembourg. Meet me there?");
    expect("distanceKm" in seed.fields).toBe(false);
    if (isMobile) return;

    await way(page, "gift").click();
    await page.waitForURL(/\/create\/halfway/, { timeout: 60_000 });
    await expect
      .poll(() => page.locator("input").evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value)), { timeout: 60_000 })
      .toEqual(expect.arrayContaining(["Riga", "Lisbon"]));
  });

  test("the link carries the two towns, and opens on the same answer without asking anybody", async ({ page, context, isMobile }) => {
    test.skip(isMobile, "the clipboard is a desk's");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await noShare(page);
    await page.goto(TOOL);
    await both(page, "Riga", "Lisbon");
    await page.getByRole("button", { name: "Send them this" }).click();
    await expect(page.locator("[data-halfway-share]")).toContainText("Link copied");
    const link = await page.evaluate(() => navigator.clipboard.readText());
    // Each town to two decimals. Lisbon is the place search's own pick: the offline table's centre (38.71…).
    expect(link).toMatch(new RegExp(`${TOOL}\\?a=Riga~56\\.95~24\\.11&b=Lisbon~38\\.7\\d~-9\\.14$`));

    const opened = await context.newPage();
    const asked: string[] = [];
    opened.on("request", (r) => {
      if (r.url().includes("/api/places")) asked.push(r.url());
    });
    await opened.goto(link);
    await expect(opened.locator("[data-halfway-city]")).toHaveText("Luxembourg");
    await expect(opened.locator("[data-halfway-each]")).toHaveText(/^1,4[34]\d km for you · 1,71\d km for them$/);
    await expect(opened.getByRole("combobox", { name: "Where you are" })).toHaveValue("Riga");
    await expect(opened.getByRole("combobox", { name: "Where they are" })).toHaveValue("Lisbon");
    expect(asked).toEqual([]);

    const shared = await context.newPage();
    await catchShares(shared);
    await shared.goto(link);
    await expect(shared.locator("[data-halfway-city]")).toHaveText("Luxembourg");
    await shared.getByRole("button", { name: "Send them this" }).click();
    await expect.poll(async () => (await lastShare(shared))?.text).toBe("Halfway between us is Luxembourg.");
  });

  test("a link that is not two towns opens the empty tool", async ({ page }) => {
    const noErrors = watchErrors(page);
    for (const query of ["?a=x&b=y", "?a=Riga~91~0&b=Lisbon~38.72~-9.14", "?a=Riga~56.95~24.11"]) {
      await page.goto(`${TOOL}${query}`);
      await expect(page.locator("[data-halfway-result]")).toContainText("Pick both towns and we'll do the math.");
      await expect(page.getByRole("combobox", { name: "Where you are" })).toHaveValue("");
      await expect(page.getByRole("combobox", { name: "Where they are" })).toHaveValue("");
    }
    noErrors();
  });

  test("open sea is said, a place in Spain is never named, and their own town is not called halfway", async ({ page }) => {
    await page.goto(TOOL);
    await both(page, "New York", "London");
    await expect(page.locator("[data-halfway-city]")).toHaveText("Open water, more or less");
    await expect(page.locator("[data-halfway-result]")).toContainText(/2,78\d km each/);

    await page.goto(TOOL);
    await both(page, "Lisbon", "Paris");
    await expect(page.locator("[data-halfway-city]")).toHaveText(/72[67] km each/);
    await expect(page.locator("[data-halfway-result]")).toContainText("How far each of you would travel to meet exactly halfway.");
    expect(await page.locator("[data-halfway-tool]").innerText()).not.toMatch(/Bilbao|Madrid|Spain|España/i);
    for (const text of await ways(page).allInnerTexts()) expect(text).not.toMatch(/Bilbao|Madrid|Spain|España/i);
    await expect(way(page, "dates")).toContainText("Date ideas near Paris");

    await page.goto(TOOL);
    await both(page, "Prague", "Vienna");
    await expect(page.locator("[data-halfway-city]")).toHaveText(/12[56] km each/);
    await expect(page.locator("[data-halfway-result]")).toContainText(/No big city lies between you\. The nearest to halfway is (Vienna|Prague)\./);
  });

  test("in Spanish, all of it", async ({ page }) => {
    await page.goto(`/es${TOOL}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("A medio camino entre dos ciudades");
    await expect(page.locator("[data-halfway-tool]")).toContainText("Dónde estás tú");
    await expect(page.locator("[data-halfway-tool]")).toContainText("Dónde está la otra persona");
    await both(page, "Berlin", "Rome", true);
    await expect(page.locator("[data-halfway-city]")).toHaveText("Múnich");
    await expect(page.locator("[data-halfway-each]")).toHaveText(/km para ti · .* km para la otra persona/);
    await expect(way(page, "dates")).toContainText("Ideas para una cita en Múnich");
    await expect(way(page, "dates")).toHaveAttribute("href", "/es/dates/munich");
    await expect(way(page, "gift")).toContainText("Hazle el regalo A medio camino");
    await expect(page.getByRole("button", { name: "Envíaselo" })).toBeVisible();
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
    await both(page, "Riga", "Lisbon");
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
    expect(JSON.stringify(await events())).not.toMatch(/Riga|Lisbon|Luxembourg/);
  });
});
