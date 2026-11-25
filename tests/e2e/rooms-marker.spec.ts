import { expect, test, type Page } from "@playwright/test";
import { countEvents, type Counted } from "./rooms-world";

/**
 * Visitors who use two or more rooms within 30 days (lib/analytics/rooms-marker.ts): the browser
 * entry `ethos-rooms` and the one event `two_rooms_30d`. Kept and sent only with a yes to cookies;
 * the config starts every test with "denied", so a test that wants the yes gives it before the page
 * loads. Never on a gift, a demo, the editor or the account pages.
 */

const ROOMS_KEY = "ethos-rooms";
const today = () => Math.floor(Date.now() / 86_400_000);
const allow = (page: Page) => page.addInitScript(() => localStorage.setItem("ethos-consent", "granted"));
const kept = (page: Page) => page.evaluate((key) => localStorage.getItem(key), ROOMS_KEY);
const parsed = async (page: Page) => JSON.parse((await kept(page)) ?? "null") as { seen: Record<string, number>; sent?: number } | null;
const twoRooms = (events: Counted[]) => events.filter((e) => e.name === "two_rooms_30d");

/** A page, given time to load and to run its effects (a page that does nothing gives no signal to wait for). */
async function visit(page: Page, path: string) {
  await page.goto(path, { waitUntil: "load" });
  await page.waitForTimeout(1500);
}

test.describe("which rooms a visitor used", () => {
  test.setTimeout(180_000);

  test("with cookies declined (the default) two rooms keep nothing and send nothing", async ({ page }) => {
    const events = await countEvents(page);
    for (const path of ["/templates", "/dates", "/games"]) {
      await visit(page, path);
      expect(await kept(page), path).toBeNull();
      expect(twoRooms(await events()), path).toEqual([]);
      expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("ethos-rooms")))).toEqual([]);
    }
  });

  test("with cookies not answered yet: the same", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("ethos-consent"));
    const events = await countEvents(page);
    for (const path of ["/templates", "/trips"]) {
      await visit(page, path);
      expect(await kept(page), path).toBeNull();
      expect(twoRooms(await events()), path).toEqual([]);
    }
  });

  test("with a yes: the first room is written down, the second sends the count once, with no data", async ({ page, isMobile }) => {
    await allow(page);
    const events = await countEvents(page);
    await page.goto("/templates");
    await expect.poll(() => parsed(page), { timeout: 30_000 }).toEqual({ seen: { gifts: today() } });
    expect(twoRooms(await events())).toEqual([]);

    if (isMobile) await page.goto("/dates");
    else await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dates" }).click();
    await page.waitForURL(/\/dates$/);
    await expect.poll(async () => twoRooms(await events()).length, { timeout: 30_000 }).toBe(1);
    const [sent] = twoRooms(await events());
    expect(sent.data === undefined || Object.keys(sent.data).length === 0, JSON.stringify(sent)).toBe(true);
    let total = 1;

    for (const path of ["/games", "/trips"]) {
      await visit(page, path);
      total += twoRooms(await events()).length;
    }
    // Each full load starts its own list: added up, still one.
    expect(total).toBe(1);
    const entry = await parsed(page);
    expect(Object.keys(entry ?? {}).sort()).toEqual(["seen", "sent"]);
    expect(entry?.seen).toEqual({ gifts: today(), dates: today(), games: today(), trips: today() });
  });

  test("the same room twice, and pages between rooms, send nothing", async ({ page }) => {
    await allow(page);
    const events = await countEvents(page);
    let total = 0;
    for (const path of ["/templates", "/templates/the-letter", "/occasions/birthday", "/pricing", "/"]) {
      await visit(page, path);
      total += twoRooms(await events()).length;
    }
    expect(total).toBe(0);
    expect((await parsed(page))?.seen).toEqual({ gifts: today() });
  });

  test("a room seen 31 days ago does not pair; one seen 30 days ago does", async ({ browser }) => {
    for (const [ago, expected] of [
      [31, 0],
      [30, 1],
    ] as const) {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.addInitScript((day) => {
        localStorage.setItem("ethos-consent", "granted");
        // Written once, before the first page of this context runs.
        if (!sessionStorage.getItem("seeded")) {
          localStorage.setItem("ethos-rooms", JSON.stringify({ seen: { gifts: day } }));
          sessionStorage.setItem("seeded", "1");
        }
      }, today() - ago);
      const events = await countEvents(page);
      await visit(page, "/dates");
      await expect.poll(async () => (await parsed(page))?.seen.dates, { timeout: 30_000 }).toBe(today());
      expect(twoRooms(await events()).length, `${ago} days ago`).toBe(expected);
      if (ago === 31) expect((await parsed(page))?.seen).toEqual({ dates: today() });
      await context.close();
    }
  });

  test("never on a gift, a demo, the editor or the account pages, and taking the yes back removes it", async ({ page, request }) => {
    const events = await countEvents(page);
    // The yes is given on a page that is in no room, so the pages below start from no entry.
    await page.goto("/pricing", { waitUntil: "load" });
    await page.evaluate(() => localStorage.setItem("ethos-consent", "granted"));

    const outside = ["/demo/the-letter", "/create/the-letter", "/login"];
    if ((await request.get("/gift-preview?template=the-letter")).status() !== 404) outside.unshift("/gift-preview?template=the-letter");
    for (const path of outside) {
      await visit(page, path);
      expect(await kept(page), path).toBeNull();
      expect(twoRooms(await events()), path).toEqual([]);
    }

    await visit(page, "/templates");
    await expect.poll(() => parsed(page), { timeout: 30_000 }).toEqual({ seen: { gifts: today() } });

    const stop = page.getByRole("contentinfo").getByRole("button", { name: "Stop cookies" });
    if (await stop.count()) await stop.click();
    else {
      // The cookie strip and its footer button exist only where Clarity or a pixel is configured.
      await page.evaluate(() => localStorage.setItem("ethos-consent", "denied"));
      await page.reload({ waitUntil: "load" });
    }
    await expect.poll(() => kept(page), { timeout: 30_000 }).toBeNull();
  });
});
