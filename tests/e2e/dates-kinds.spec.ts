import { expect, test, type Page } from "@playwright/test";

/**
 * The pages by kind of date (/dates/ideas/<kind>): there in both languages and titled with the
 * search they answer, a 404 for a kind with too few ideas, the cards that open, free date ideas as
 * a section of their own, the links in and out, what is counted, and the cache they are served with.
 */
const KINDS = [
  { kind: "first-date", phrase: "First Date Ideas", es: "Ideas para una primera cita", count: 9, heading: "First date ideas that are easy to say yes to" },
  { kind: "fun", phrase: "Fun Date Ideas", es: "Ideas para una cita divertida", count: 8, heading: "Fun date ideas that give you something to do" },
  { kind: "cheap", phrase: "Cheap Date Ideas", es: "Ideas para una cita barata", count: 8, heading: "Cheap date ideas, and four that are free" },
  { kind: "romantic", phrase: "Romantic Date Ideas", es: "Ideas para una cita romántica", count: 10, heading: "Romantic date ideas that slow the evening down" },
  { kind: "double-date", phrase: "Double Date Ideas", es: "Ideas para una cita doble", count: 8, heading: "Double date ideas that work better with four" },
  { kind: "winter", phrase: "Winter Date Ideas", es: "Ideas para una cita en invierno", count: 9, heading: "Winter date ideas for when it’s dark by five" },
  { kind: "rainy-day", phrase: "Rainy Day Date Ideas", es: "Ideas para una cita con lluvia", count: 12, heading: "Rainy day date ideas that never needed the sun" },
  { kind: "night", phrase: "Date Night Ideas", es: "Planes para una noche en pareja", count: 9, heading: "Date night ideas that start at seven or later" },
  { kind: "outdoor", phrase: "Outdoor Date Ideas", es: "Ideas para una cita al aire libre", count: 8, heading: "Outdoor date ideas for a dry day" },
  { kind: "unique", phrase: "Unique Date Ideas", es: "Ideas para una cita diferente", count: 8, heading: "Unique date ideas that aren’t dinner and a film" },
] as const;

const FIRST_DATE_TITLES = ["Pick a book for each other", "Ice cream and nowhere to be", "Gallery hop", "Mini golf, loser buys dessert", "Bowling, bumpers optional", "Arcade night", "Museum, then a glass of something", "An afternoon in a garden", "Skate, fall, hot chocolate"];

/** Every JSON-LD node on the page, however it is nested. */
const jsonLd = (page: Page) =>
  page.locator('script[type="application/ld+json"]').evaluateAll((scripts) => {
    const out: Record<string, unknown>[] = [];
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") {
        out.push(v as Record<string, unknown>);
        Object.values(v).forEach(walk);
      }
    };
    for (const s of scripts) walk(JSON.parse(s.textContent ?? "null"));
    return out;
  });

/** Stands in for Vercel's script and keeps what the page hands to window.va (as gift-finder.spec.ts does). */
async function catchEvents(page: Page) {
  await page.route((url) => url.hostname === "va.vercel-scripts.com" || url.pathname.startsWith("/_vercel/insights/"), (route) => route.abort());
  await page.addInitScript(() => {
    const w = window as unknown as { __counted: unknown[][]; va: (...args: unknown[]) => void };
    w.__counted = [];
    w.va = (...args: unknown[]) => {
      w.__counted.push(args);
    };
  });
  return () =>
    page.evaluate(() =>
      (window as unknown as { __counted: unknown[][] }).__counted.filter((call) => call[0] === "event").map((call) => call[1] as { name: string; data?: Record<string, unknown> }),
    );
}

test.describe("the pages by kind of date", () => {
  test("P1 each of the ten pages is there in both languages, titled with its search", async ({ page }) => {
    test.setTimeout(180_000);
    const errors: Error[] = [];
    page.on("pageerror", (e) => errors.push(e));
    for (const k of KINDS) {
      for (const locale of ["", "/es"]) {
        const path = `${locale}/dates/ideas/${k.kind}`;
        // The language last chosen is remembered in a cookie: a bare address would follow it.
        await page.context().clearCookies();
        const res = await page.goto(path);
        expect(res?.status(), path).toBe(200);
        const title = await page.title();
        expect(title.startsWith(`${locale ? k.es : k.phrase}: ${k.count} `), `${path}: ${title}`).toBe(true);
        const h1 = page.getByRole("heading", { level: 1 });
        await expect(h1).toHaveCount(1);
        if (!locale) await expect(h1).toContainText(k.heading);
        await expect(h1).toContainText(locale ? "Ideas para una cita " : "Date ideas ");
        expect(await page.locator('link[rel="canonical"]').getAttribute("href"), path).toMatch(new RegExp(`${locale}/dates/ideas/${k.kind}$`));
        expect(await page.locator('link[rel="alternate"][hreflang="es"]').getAttribute("href"), path).toMatch(new RegExp(`/es/dates/ideas/${k.kind}$`));
      }
    }
    expect(errors).toEqual([]);
  });

  test("P2 a kind with too few ideas, an unknown kind and the bare folder are 404s", async ({ page }) => {
    for (const path of ["/dates/ideas/at-home", "/dates/ideas/nope", "/dates/ideas"]) expect((await page.goto(path))?.status(), path).toBe(404);
  });

  test("P3 the cards are the kind's ideas, each a picture and a title that loaded", async ({ page }) => {
    await page.goto("/dates/ideas/first-date");
    const cards = page.locator("[data-card]");
    await expect(cards).toHaveCount(9);
    await expect(page.locator("[data-card-title]")).toHaveText(FIRST_DATE_TITLES);
    for (let i = 0; i < 9; i++) {
      const img = cards.nth(i).locator("img");
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    }
    const nodes = await jsonLd(page);
    const list = nodes.find((n) => n["@type"] === "ItemList") as { itemListElement: { url: string }[] } | undefined;
    expect(list?.itemListElement).toHaveLength(9);
    for (const item of list!.itemListElement) expect(item.url).toMatch(/#idea-[a-z-]+$/);
    const faq = nodes.find((n) => n["@type"] === "FAQPage") as { mainEntity: unknown[] } | undefined;
    expect(faq?.mainEntity).toHaveLength(4);
  });

  test("P4 a card opens to why it fits, the twist in handwriting and a way to plan it, one at a time", async ({ page }) => {
    await page.goto("/dates/ideas/first-date");
    const first = page.locator("[data-card]").nth(0);
    await first.locator("summary").click();
    await expect(first.getByText("Twenty minutes apart is a breather for both of you")).toBeVisible();
    await expect(first.getByText("The twist", { exact: true })).toBeVisible();
    const twist = first.locator("[data-line]");
    await expect(twist).toHaveText("Write the first page a note before you hand it over.");
    await expect(twist).toHaveClass(/font-hand/);
    await expect(first.getByRole("link", { name: "Plan it near you" })).toHaveAttribute("href", "/dates?idea=bookshop-and-coffee");
    const second = page.locator("[data-card]").nth(1);
    await second.locator("summary").click();
    await expect(second.locator("details")).toHaveAttribute("open", "");
    await expect(first.locator("details")).not.toHaveAttribute("open", "");
  });

  test("P5 free date ideas are a section of their own on the cheap page", async ({ page }) => {
    await page.goto("/dates/ideas/cheap");
    const free = page.locator("section#free");
    await expect(free.getByRole("heading", { level: 2, name: "Free date ideas" })).toBeVisible();
    await expect(free.locator("[data-card-title]")).toHaveText(["Gallery hop", "Golden hour picnic", "Up before the city", "An afternoon in a garden"]);
    const paid = page.locator("section#pocket-change");
    await expect(paid.getByRole("heading", { level: 2, name: "For pocket change" })).toBeVisible();
    await expect(paid.locator("[data-card]")).toHaveCount(4);
    const all = await page.locator("[data-card-title]").allTextContents();
    expect(all).toHaveLength(8);
    expect(new Set(all).size).toBe(8);
  });

  test("P6 the dates map links to every kind, and a kind links on to cities and to the other kinds", async ({ page }) => {
    await page.goto("/dates");
    const byKind = page.getByRole("navigation", { name: "Date ideas by kind" });
    await expect(byKind.getByRole("link")).toHaveCount(10);
    await expect(byKind.getByRole("link").first()).toHaveAttribute("href", "/dates/ideas/first-date");

    await page.goto("/dates/ideas/first-date");
    for (const href of ["/dates/new-york/first-date", "/dates/london/first-date", "/dates/chicago/first-date"]) await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "All 55 cities" })).toHaveAttribute("href", "/dates");
    const more = page.getByRole("navigation", { name: "More kinds of date" });
    await expect(more.getByRole("link")).toHaveCount(9);
    await expect(more.locator('a[href="/dates/ideas/first-date"]')).toHaveCount(0);
  });

  test("P7 a kind page seen is counted once, with its kind", async ({ page }) => {
    const events = await catchEvents(page);
    await page.goto("/dates/ideas/rainy-day");
    await expect.poll(async () => (await events()).filter((e) => e.name === "date_kind_view")).toEqual([{ name: "date_kind_view", data: { kind: "rainy-day" } }]);
    await page.waitForTimeout(500);
    expect((await events()).filter((e) => e.name === "date_kind_view")).toHaveLength(1);
  });

  test("P8 a page by kind is not served with the pictures' week-long cache", async ({ page }) => {
    const pageRes = await page.request.get("/dates/ideas/first-date");
    expect(pageRes.headers()["cache-control"] ?? "").not.toContain("604800");
    const picture = await page.request.get("/dates/ideas/bowling-night.webp");
    expect(picture.headers()["cache-control"] ?? "").toContain("604800");
  });
});
