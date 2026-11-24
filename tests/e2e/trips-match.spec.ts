import { expect, test, type Page } from "@playwright/test";
import { clickInPlace, countEvents, watchErrors } from "./rooms-world";

/**
 * "Where should we go together?" on /trips: an airport and a sentence of three choices rank the
 * twelve trips. The clock is pinned to 15 November, when no trip is in season, so the order is
 * whose season starts soonest (December's Prague to Vienna and Copenhagen first) and the airport's. Nothing is fetched: the airports are an offline table.
 */

const picks = (page: Page) => page.locator("#match [data-pick]");
const names = (page: Page) => picks(page).locator("a[href*='/trips/'] > span:last-child");
const summary = (page: Page) => page.locator("[data-match-summary]");

async function open(page: Page, path = "/trips") {
  await page.route("https://tiles.openfreemap.org/**", (r) => r.abort());
  await page.clock.install({ time: new Date("2026-11-15T12:00:00Z") });
  await page.goto(path);
  await page.locator("#match").scrollIntoViewIfNeeded();
}

async function pickAirport(page: Page, typed: string, option: RegExp, box = "Leaving from") {
  await page.locator("#match").getByRole("combobox", { name: box }).fill(typed);
  await page.getByRole("option", { name: option }).first().click();
}

/** The sentence as it reads, each choice as the words it shows. */
const sentence = (page: Page) =>
  page.locator("[data-match-sentence]").evaluate((p) => {
    const copy = p.cloneNode(true) as HTMLElement;
    copy.querySelectorAll("select").forEach((s, i) => {
      const live = p.querySelectorAll("select")[i] as HTMLSelectElement;
      s.replaceWith(document.createTextNode(` ${live.selectedOptions[0]?.textContent ?? ""} `));
    });
    return (copy.textContent ?? "").replace(/\s+/g, " ").replace(/ ([,.])/g, "$1").trim();
  });

test.describe("where should we go together", () => {
  test("before a tap it is a heading, a sentence and a button, and the shelf still has its twelve", async ({ page }) => {
    const noErrors = watchErrors(page);
    await open(page);
    await expect(page.getByRole("heading", { level: 2, name: "Where should we go together?" })).toBeVisible();
    expect(await sentence(page)).toBe("We have any number of days, no ceiling on spending, and we'd like any kind of trip.");
    await expect(page.locator("[data-match-result]")).toHaveCount(0);
    await expect(page.getByTestId("trip-card")).toHaveCount(12);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Go somewhere");
    noErrors();
  });

  test("one tap gives three trips, each a picture and a name, and never a fare", async ({ page }) => {
    const noErrors = watchErrors(page);
    await open(page);
    await page.getByRole("button", { name: "Show our three trips" }).click();
    await expect(summary(page)).toHaveText("Three trips that fit.");
    await expect(picks(page)).toHaveCount(3);
    // In mid November none is in season: the two whose season starts in December lead, then March's Lisbon.
    await expect(names(page)).toHaveText(["Prague to Vienna by train", "A hygge weekend in Copenhagen", "Lisbon, slowly"]);
    for (const img of await picks(page).locator("img").all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    }
    await expect(picks(page).nth(2)).toContainText(/3 days · city break/i);
    await expect(picks(page).nth(2)).toContainText("Best Mar–Jun, Sept–Oct");
    // Each says something of its own, even with no airport and every choice left open (in mid
    // November none is in season: when its season starts); never a flight time then.
    await expect(picks(page).locator("[data-fit]")).toHaveText(["Its season starts in December.", "Its season starts in December.", "Its season starts in March."]);
    await expect(page.locator("#match [data-air]")).toHaveCount(0);
    // No money beside a trip but its band for spending there (€€, and for a screen reader the band's
    // own words, "about €150–300 a day for two", which is not a fare): never a price for a flight.
    const shown = await page.locator("[data-match-result]").evaluate((el) => {
      const copy = el.cloneNode(true) as HTMLElement;
      copy.querySelectorAll(".sr-only").forEach((s) => s.remove());
      return copy.textContent ?? "";
    });
    expect(shown).not.toMatch(/[€$£]\s?\d|\d\s?(€|EUR|USD)/);
    await expect(picks(page).locator(".sr-only")).toHaveText([/^about €150–300 a day for two$/i, /^over €300 a day for two$/i, /^about €150–300 a day for two$/i]);
    await expect(page.getByTestId("trip-card")).toHaveCount(12);
    noErrors();
  });

  test("with an airport it says the hours in the air, and a trip from home needs none", async ({ page }) => {
    await open(page);
    await pickAirport(page, "Rig", /Riga · RIX/);
    await page.getByRole("button", { name: "Show our three trips" }).click();
    await expect(names(page)).toHaveText(["The Baltic coast, Riga to Tallinn", "A hygge weekend in Copenhagen", "Prague to Vienna by train"]);
    await expect(picks(page).nth(0).locator("[data-air]")).toHaveText("It starts where you are. No flight to find.");
    await expect(picks(page).nth(1).locator("[data-air]")).toHaveText("About 1 h 30 min in the air from Riga.");
    await expect(picks(page).nth(2).locator("[data-air]")).toHaveText("About 1 h 50 min in the air from Riga.");
  });

  test("under 600 km it says a train might be nicer", async ({ page }) => {
    await open(page);
    await pickAirport(page, "Lond", /London · LHR/);
    await page.getByRole("button", { name: "Show our three trips" }).click();
    await expect(names(page).first()).toHaveText("Paris without the clichés");
    await expect(picks(page).first().locator("[data-air]")).toHaveText("About 1 h in the air from London. A train might be nicer.");
  });

  test("the airport is remembered, and can be left out again", async ({ page }) => {
    await open(page);
    await pickAirport(page, "Rig", /Riga · RIX/);
    await page.reload();
    const box = page.locator("#match").getByRole("combobox", { name: "Leaving from" });
    await expect(box).toHaveValue("Riga");
    await expect(page.getByTestId("flight-finder").getByRole("combobox", { name: "From" })).toHaveValue("Riga");
    await page.getByRole("button", { name: "Leave the airport out" }).click();
    await expect(box).toHaveValue("");
    await expect(page.locator("#match")).toContainText("Optional. Without it we skip the flight times.");
    await page.getByRole("button", { name: "Show our three trips" }).click();
    await expect(picks(page)).toHaveCount(3);
    await expect(page.locator("#match [data-air]")).toHaveCount(0);
    // The answer in the address was asked with no airport, and a reload keeps it so.
    await page.reload();
    await expect(picks(page)).toHaveCount(3);
    await expect(box).toHaveValue("");
    // Left out is forgotten too: a fresh visit (or another tab) does not bring it back.
    expect(await page.evaluate(() => localStorage.getItem("ethos:trips:from"))).toBeNull();
    await page.goto("/trips");
    await page.waitForTimeout(300);
    await expect(box).toHaveValue("");
  });

  test("the hero's flight search and the matcher leave from the same airport", async ({ page }) => {
    await open(page);
    const hero = page.getByTestId("flight-finder").getByRole("combobox", { name: "From" });
    await hero.fill("Lond");
    await page.getByRole("option", { name: /London · LHR/ }).first().click();
    await expect(page.locator("#match").getByRole("combobox", { name: "Leaving from" })).toHaveValue("London");
    await pickAirport(page, "Rig", /Riga · RIX/);
    await expect(hero).toHaveValue("Riga");
  });

  test("choices made before the page's script arrives are kept, and the button waits for it", async ({ page }) => {
    // A slow phone: the page is there and its selects can be turned before the script runs.
    await page.route("**/_next/static/chunks/**/*.js", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.continue();
    });
    await page.clock.install({ time: new Date("2026-11-15T12:00:00Z") });
    await page.goto("/trips", { waitUntil: "domcontentloaded" });
    const go = page.locator("[data-match-go]");
    await expect(go).toBeDisabled();
    await page.getByRole("combobox", { name: "How long" }).selectOption("weekend");
    await page.getByRole("combobox", { name: "Kind of trip" }).selectOption("city");
    await expect(go).toBeEnabled({ timeout: 30_000 });
    await go.click();
    await expect(page.getByRole("combobox", { name: "How long" })).toHaveValue("weekend");
    await expect(page.getByRole("combobox", { name: "Kind of trip" })).toHaveValue("city");
    await expect(page).toHaveURL(/len=weekend/);
    await expect(page).toHaveURL(/kind=city/);
    await expect(names(page).first()).toHaveText("A hygge weekend in Copenhagen");
  });

  test("an airport typed before the page's script arrives is kept, and can be picked", async ({ page }) => {
    // Remembered from an earlier visit: still never put over what was typed.
    await page.addInitScript(() => {
      try {
        localStorage.setItem("ethos:trips:from", JSON.stringify({ city: "London", iata: "LHR" }));
      } catch {}
    });
    await page.route("**/_next/static/chunks/**/*.js", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.continue();
    });
    await page.clock.install({ time: new Date("2026-11-15T12:00:00Z") });
    await page.goto("/trips", { waitUntil: "domcontentloaded" });
    const box = page.locator("#match").getByRole("combobox", { name: "Leaving from" });
    await box.fill("Riga");
    await expect(page.locator("[data-match-go]")).toBeEnabled({ timeout: 30_000 });
    await page.waitForTimeout(500);
    await expect(box).toHaveValue("Riga");
    await page.getByRole("option", { name: /Riga · RIX/ }).first().click();
    await expect(box).toHaveValue("Riga");
    await page.getByRole("button", { name: "Show our three trips" }).click();
    await expect(names(page).first()).toHaveText("The Baltic coast, Riga to Tallinn");
  });

  test("when only one fits it says so, and the rest come close", async ({ page }) => {
    await open(page);
    await page.getByRole("combobox", { name: "How long" }).selectOption({ label: "a week" });
    await page.getByRole("button", { name: "Show our three trips" }).click();
    await expect(summary(page)).toHaveText("One trip fits all of that. The rest come close.");
    await expect(names(page).first()).toHaveText("The Baltic coast, Riga to Tallinn");
    // The heading says what fits; each card says what is its own, never the select's words again.
    await expect(picks(page).first().locator("[data-fit]")).toHaveText("Fits all of it. Its season starts in June.");
    await expect(picks(page).nth(1).locator("[data-fit]")).toHaveText("The nearest to what you asked. Its season starts in December.");
  });

  test("when nothing fits it lets one wish go and says which", async ({ page }) => {
    await open(page);
    await page.getByRole("combobox", { name: "How long" }).selectOption({ label: "a week" });
    await page.getByRole("combobox", { name: "Kind of trip" }).selectOption({ label: "a city break" });
    await page.getByRole("button", { name: "Show our three trips" }).click();
    await expect(summary(page)).toHaveText("Nothing fits all of that, so we let go of the length.");
    await expect(names(page).first()).toHaveText("Paris without the clichés");
    // The heading has said what all three let go of: each card says when its season starts.
    await expect(picks(page).first().locator("[data-fit]")).toHaveText("Its season starts in April.");
    const lines = await picks(page).locator("[data-fit]").allInnerTexts();
    expect(new Set(lines).size, lines.join(" | ")).toBeGreaterThan(1);

    await page.getByRole("combobox", { name: "Kind of trip" }).selectOption({ label: "islands" });
    await page.getByRole("combobox", { name: "How long" }).selectOption({ label: "a weekend" });
    await page.getByRole("combobox", { name: "Budget there" }).selectOption({ label: "a modest budget" });
    // The three let go of different wishes, so none is named in the heading; each card says its own.
    await expect(summary(page)).toHaveText("Nothing fits all of that. These three come closest.");
    await expect(names(page).first()).toHaveText("Santorini and Naxos");
    await expect(picks(page).nth(0).locator("[data-fit]")).toHaveText("Fits all but the length and the budget. Its season starts in May.");
    await expect(picks(page).nth(1).locator("[data-fit]")).toHaveText(/^Fits all but (the budget and )?the kind of trip. Its season starts in \w+\.$/);
  });

  test("the commas and the full stop stay with their choices", async ({ page }) => {
    await open(page);
    const sentenceBox = page.locator("[data-match-sentence]");
    for (const select of await sentenceBox.locator("select").all()) {
      const gap = await select.evaluate((el) => {
        const after = el.nextSibling;
        if (!after || after.nodeType !== Node.TEXT_NODE) return null;
        const range = document.createRange();
        range.setStart(after, 0);
        range.setEnd(after, 1);
        return range.getBoundingClientRect().left - el.getBoundingClientRect().right;
      });
      expect(gap).not.toBeNull();
      expect(gap!).toBeLessThan(3);
    }
  });

  test("the answer stays in the address: Back from a trip, or a reload, opens on the same three", async ({ page }) => {
    await open(page);
    await pickAirport(page, "Rig", /Riga · RIX/);
    await page.getByRole("combobox", { name: "Kind of trip" }).selectOption({ label: "islands" });
    await page.getByRole("combobox", { name: "Budget there" }).selectOption({ label: "a modest budget" });
    await page.getByRole("button", { name: "Show our three trips" }).click();
    // The wishes in the address; the airport (it says where they live) only in the history entry.
    await expect(page).toHaveURL(/\/trips\?match=1&budget=1&kind=islands$/);
    const shown = await names(page).allInnerTexts();
    expect(shown).toHaveLength(3);

    await picks(page).first().locator("a[href^='/trips/']").click();
    await page.waitForURL(/\/trips\/santorini-naxos$/);
    await page.goBack();
    await expect(names(page)).toHaveText(shown);
    await expect(page.getByRole("combobox", { name: "Kind of trip" })).toHaveValue("islands");
    await expect(page.locator("#match").getByRole("combobox", { name: "Leaving from" })).toHaveValue("Riga");
    // Back where they were, on the three, not on an empty matcher.
    await expect.poll(() => page.locator("[data-match-result]").evaluate((el) => el.getBoundingClientRect().top < window.innerHeight)).toBe(true);

    await page.reload();
    await expect(names(page)).toHaveText(shown);
    await expect(page.getByRole("combobox", { name: "Budget there" })).toHaveValue("1");
    // The airport came back from the history entry, not the address, which still never names it.
    expect(await page.evaluate(() => (window.history.state as Record<string, unknown> | null)?.ethosMatchFrom)).toEqual({ city: "Riga", iata: "RIX" });
    await expect(page.locator("#match").getByRole("combobox", { name: "Leaving from" })).toHaveValue("Riga");
    expect(page.url()).not.toMatch(/Riga|RIX/);
  });

  test("typing an airport straight after Show is never cut short", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Show our three trips" }).click();
    const box = page.locator("#match").getByRole("combobox", { name: "Leaving from" });
    await box.fill("Rig");
    // The answer's heading takes the focus only from the button, never from a box being typed in.
    await page.waitForTimeout(200);
    await expect(box).toBeFocused();
    await expect(box).toHaveValue("Rig");
    await page.getByRole("option", { name: /Riga · RIX/ }).first().click();
    await expect(box).toHaveValue("Riga");
  });

  test("after the first tap a change re-ranks at once, and the focus stays where it was", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Show our three trips" }).click();
    await expect(picks(page)).toHaveCount(3);
    await page.locator("#match-row").evaluate((row) => (row.scrollLeft = 400));
    const kind = page.getByRole("combobox", { name: "Kind of trip" });
    await kind.focus();
    await kind.selectOption("islands");
    await expect(names(page).first()).toHaveText("Santorini and Naxos");
    expect(await kind.evaluate((el) => el === document.activeElement)).toBe(true);
    await expect.poll(() => page.locator("#match-row").evaluate((row) => row.scrollLeft)).toBe(0);
  });

  test("a pick opens its trip, and the first carries the surprise", async ({ page, isMobile }) => {
    test.setTimeout(120_000);
    await open(page);
    await page.getByRole("button", { name: "Show our three trips" }).click();
    const first = picks(page).first();
    await expect(first.getByRole("link", { name: "Prague to Vienna by train" })).toHaveAttribute("href", "/trips/prague-krumlov-vienna");
    const surprise = first.getByTestId("make-surprise");
    await expect(surprise).toBeVisible();
    await expect(surprise).toHaveAttribute("href", "/create/pack-your-bags");
    // One button in the three: on a phone the others lead to their trip, which has its own.
    if (isMobile) {
      await expect(picks(page).nth(1).getByTestId("make-surprise")).toBeHidden();
      return;
    }
    await pickAirport(page, "Rig", /Riga · RIX/);
    await expect(names(page).first()).toHaveText("The Baltic coast, Riga to Tallinn");
    await picks(page).first().getByTestId("make-surprise").click();
    await page.waitForURL(/\/create\/pack-your-bags/, { timeout: 60_000 });
    await expect
      .poll(() => page.locator("input").evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value)), { timeout: 60_000 })
      .toContain("Tallinn");
  });

  test("in Spanish, all of it", async ({ page }) => {
    await open(page, "/es/trips");
    await expect(page.getByRole("heading", { level: 2, name: "¿Adónde nos escapamos?" })).toBeVisible();
    expect(await sentence(page)).toBe("Tenemos los días que hagan falta, sin tope de gasto, y buscamos cualquier tipo de viaje.");
    await page.getByRole("button", { name: "Ver nuestros tres viajes" }).click();
    await expect(summary(page)).toHaveText("Tres viajes que encajan.");
    await pickAirport(page, "Rig", /Riga · RIX/, "Salimos de");
    await expect(picks(page).first().locator("[data-air]")).toHaveText("Empieza donde estáis. No hay vuelo que buscar.");
    await page.getByRole("combobox", { name: "Cuánto tiempo" }).selectOption({ label: "una semana" });
    await page.getByRole("combobox", { name: "Tipo de viaje" }).selectOption({ label: "una escapada urbana" });
    await expect(summary(page)).toHaveText("Nada encaja con todo, así que hemos dejado de lado la duración.");
    await expect(picks(page).first().locator("[data-fit]")).toHaveText("Su temporada empieza en abril.");
    await expect(picks(page).first()).toContainText("Mejor en abr.–jun., sept.–oct.");
    await page.getByRole("combobox", { name: "Presupuesto allí" }).selectOption("2");
    expect(await sentence(page)).toBe("Tenemos una semana, un presupuesto holgado, y buscamos una escapada urbana.");
    await page.getByRole("combobox", { name: "Presupuesto allí" }).selectOption("any");
    await page.getByRole("combobox", { name: "Tipo de viaje" }).selectOption({ label: "unas islas" });
    expect(await sentence(page)).toBe("Tenemos una semana, sin tope de gasto, y buscamos unas islas.");
  });

  test("by keyboard alone", async ({ page, isMobile }) => {
    test.skip(isMobile, "a phone has no Tab key");
    await open(page);
    await page.locator("#match").getByRole("combobox", { name: "Leaving from" }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("combobox", { name: "How long" })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("combobox", { name: "How long" })).not.toHaveValue("any");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("combobox", { name: "Budget there" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("combobox", { name: "Kind of trip" })).toBeFocused();
    await page.keyboard.press("Tab");
    const go = page.getByRole("button", { name: "Show our three trips" });
    await expect(go).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(summary(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(picks(page).first().locator("a[href^='/trips/']")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(picks(page).first().getByTestId("make-surprise")).toBeFocused();
  });

  test("what is counted, and that nothing private is", async ({ page, context }) => {
    const events = await countEvents(page);
    await open(page);
    await pickAirport(page, "Rig", /Riga · RIX/);
    expect((await events()).filter((e) => e.name.startsWith("trip_"))).toEqual([]);
    await page.getByRole("button", { name: "Show our three trips" }).click();
    await expect.poll(async () => (await events()).filter((e) => e.name === "trip_match").map((e) => e.data)).toEqual([{ length: "any", budget: 0, kind: "any", hasOrigin: true }]);
    // Three changes in a row are one settled ask, counted once and marked as refined.
    await page.getByRole("combobox", { name: "Kind of trip" }).selectOption({ label: "islands" });
    await page.getByRole("combobox", { name: "Kind of trip" }).selectOption({ label: "any kind of trip" });
    await page.getByRole("combobox", { name: "How long" }).selectOption({ label: "a week" });
    await expect.poll(async () => (await events()).filter((e) => e.name === "trip_match").map((e) => e.data), { timeout: 8000 }).toEqual([
      { length: "any", budget: 0, kind: "any", hasOrigin: true },
      { length: "week", budget: 0, kind: "any", hasOrigin: true, refined: true },
    ]);
    await page.waitForTimeout(2000);
    expect((await events()).filter((e) => e.name === "trip_match")).toHaveLength(2);
    await clickInPlace(picks(page).first().locator("a[href^='/trips/']"));
    await expect.poll(async () => (await events()).filter((e) => e.name === "trip_match_pick").map((e) => e.data)).toEqual([{ trip: "baltic-coast", to: "page" }]);
    expect(JSON.stringify(await events())).not.toMatch(/Riga|RIX/);

    // Before any tap a change counts nothing.
    const fresh = await context.newPage();
    const freshEvents = await countEvents(fresh);
    await open(fresh);
    await fresh.getByRole("combobox", { name: "How long" }).selectOption({ label: "a week" });
    await fresh.waitForTimeout(300);
    expect((await freshEvents()).filter((e) => e.name.startsWith("trip_"))).toEqual([]);
  });

  test("on a phone the three are one row, one to a screen, with dots; on a desk they stand side by side", async ({ page, isMobile }) => {
    await open(page);
    await page.getByRole("button", { name: "Show our three trips" }).click();
    await expect(picks(page)).toHaveCount(3);
    const dots = page.locator("#match [data-dots]");
    if (isMobile) {
      const width = page.viewportSize()!.width;
      const lefts = await picks(page).evaluateAll((els) => els.map((el) => el.getBoundingClientRect()));
      expect(lefts.filter((r) => r.left >= 0 && r.right <= width + 1)).toHaveLength(1);
      await expect(dots.locator("span")).toHaveCount(3);
      await expect(dots.locator("span").first()).toHaveAttribute("data-on", "");
      await page.locator("#match-row").evaluate((row) => row.scrollTo({ left: row.scrollWidth }));
      await expect(dots.locator("span").last()).toHaveAttribute("data-on", "");
    } else {
      const tops = await picks(page).evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
      expect(new Set(tops).size).toBe(1);
      await expect(dots).toBeHidden();
    }
  });
});
