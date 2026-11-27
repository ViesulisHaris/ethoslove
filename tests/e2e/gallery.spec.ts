import { expect, test } from "@playwright/test";
import { occasionRow } from "../../src/components/templates/gallery-occasions";
import { filedUnder } from "../../src/components/templates/gallery-sort";
import { NEW_SLUGS } from "../../src/config/featured";

test.describe("the template gallery", () => {
  test("opens on the premium best sellers, then what is new, newest batch first, then the rest", async ({ page }) => {
    await page.goto("/templates");
    const shelves = page.locator("[data-shelf]");
    await expect(shelves).toHaveCount(3);
    await expect(page.getByRole("heading", { level: 2, name: /the best sellers/i })).toBeVisible();

    const popular = page.locator("[data-shelf=popular]");
    await expect(popular.getByRole("heading", { level: 3 })).toHaveText(["Bouquet", "XOXO", "Birthday Cinema", "The Council"]);
    await expect(popular.getByText("Most loved")).toHaveCount(4);

    // NEW_SLUGS in src/config/featured.ts, in its order: change both when the next batch ships.
    const fresh = page.locator("[data-shelf=new]");
    await expect(fresh.getByRole("heading", { level: 3 })).toHaveText(["The Nice List", "Unwrapped", "Snow Globe", "Frosted Window", "String the Lights", "Gingerbread House", "Light the Candles", "Wishbone"]);
    // An older arrival is back in the catalogue below, and so is last season's batch.
    await expect(page.locator("[data-shelf=all]").getByRole("heading", { level: 3, name: "Party Animals" })).toBeVisible();
    await expect(page.locator("[data-shelf=all]").getByRole("heading", { level: 3, name: "Bat Swarm" })).toBeVisible();
    await expect(page.locator("[data-shelf=all]").getByRole("heading", { level: 3, name: "Coquette" })).toBeVisible();

    // Nothing is listed twice.
    const names = await page.locator("[data-shelf] h3").allTextContents();
    expect(new Set(names).size).toBe(names.length);
  });

  test("offers the gift finder above the filters, for someone who can't choose", async ({ page }) => {
    await page.goto("/templates");
    const finder = page.locator("main").getByRole("link", { name: "Answer two questions" });
    await expect(finder).toBeVisible();
    await expect(finder).toHaveAttribute("href", "/gifts/finder");
    const link = await finder.boundingBox();
    const filters = await page.locator("main").getByRole("link", { name: "All occasions" }).boundingBox();
    expect(link!.y + link!.height).toBeLessThanOrEqual(filters!.y);
    // The gallery under it is as it was: three shelves, the best sellers first.
    await expect(page.locator("[data-shelf]")).toHaveCount(3);
  });

  test("the free filter leaves only the shelf that still has something on it", async ({ page }) => {
    await page.goto("/templates");
    await page.getByRole("button", { name: "Free", exact: true }).click();
    await expect(page.locator("[data-shelf]")).toHaveCount(1);
    // "Free" is what can be sent free as the build is set (lib/gift/free-tier.ts, sendsFree). The live site has run since
    // 19 Nov 2026 with the free version as The Letter's short note (NEXT_PUBLIC_FREE_NOTE_SHARE=1): Constellations is made
    // of photos, so there it is paid. Run with the server's own setting, the spec follows it; it used to expect both always.
    const noteForEveryone = Number(process.env.NEXT_PUBLIC_FREE_NOTE_SHARE) >= 1;
    // One list under "Free gifts" (walk-choose-5).
    await expect(page.locator("[data-shelf=tierFree] h3")).toHaveText(noteForEveryone ? ["The Letter"] : ["The Letter", "Constellations"]);
  });

  test("an occasion's page keeps its own order, without shelves, in Spanish too", async ({ page }) => {
    await page.goto("/es/occasions/birthday");
    await expect(page.locator("[data-shelf]")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 2, name: /las más vendidas/i })).toHaveCount(0);
    await page.goto("/es/templates");
    await expect(page.getByRole("heading", { level: 2, name: /las más vendidas/i })).toBeVisible();
    await expect(page.getByText("Nueva", { exact: true }).first()).toBeVisible();
  });

  test("“Sort by” puts the whole gallery in one list, newest first or by name, and keeps the order in the address", async ({ page }) => {
    await page.goto("/templates");
    const sort = page.locator("[data-gallery-sort]");
    await expect(sort).toHaveValue("popular");
    await sort.selectOption("new");
    await expect(page).toHaveURL(/[?&]sort=new/);
    await expect(page.locator("[data-shelf]")).toHaveCount(1);
    // The cards follow a press a moment after the select and the address (useDeferredValue, template-gallery.tsx).
    await expect(page.locator("[data-shelf] h3").first()).toHaveText("Gingerbread House");
    const newest = await page.locator("[data-shelf] h3").allTextContents();
    // The catalogue is listed in the order its gifts were added: the last one in is the first one shown.
    expect(newest[0]).toBe("Gingerbread House");
    expect(newest.at(-1)).toBe("The Letter");
    // Every card wearing "New" stands before every card that does not: Snow Globe, an older address
    // rebuilt for Christmas, was 39th under "Newest" with "New" on it (the review of 22 Nov 2026).
    const wearsNew = await page.locator("[data-gallery-card]").evaluateAll((cards) => cards.map((card) => [...card.querySelectorAll("span")].some((span) => span.textContent?.trim() === "New")));
    expect(wearsNew.filter(Boolean).length).toBe(NEW_SLUGS.length);
    expect(wearsNew.lastIndexOf(true)).toBe(NEW_SLUGS.length - 1);
    // The eyebrow over a sorted list is how many there are, not the order said a second time.
    await expect(page.locator("[data-shelf] header p").first()).toHaveText(`${newest.length} gifts`);
    await sort.selectOption("az");
    await expect(page).toHaveURL(/[?&]sort=az/);
    await expect(page.locator("[data-shelf] h3").first()).not.toHaveText("Gingerbread House");
    const names = await page.locator("[data-shelf] h3").allTextContents();
    // By name without its article: The Letter is under L, between Kawaii and Light the Candles.
    expect(names).toEqual([...names].sort((a, b) => filedUnder(a, "en").localeCompare(filedUnder(b, "en"), "en", { sensitivity: "base" })));
    expect(names.indexOf("The Letter")).toBeGreaterThan(names.indexOf("Kawaii"));
    expect(names.indexOf("The Letter")).toBeLessThan(names.indexOf("Light the Candles"));
    expect(new Set(names).size).toBe(newest.length);
    // A reload keeps the order; the default order leaves the address as it was.
    await page.reload();
    await expect(page.locator("[data-gallery-sort]")).toHaveValue("az");
    await page.locator("[data-gallery-sort]").selectOption("popular");
    await expect(page).not.toHaveURL(/sort=/);
    await expect(page.locator("[data-shelf]")).toHaveCount(3);
  });

  test("every occasion can be reached with a mouse: on a laptop and a desk the row is eight tiles, and More lays out the other seven, in season first", async ({ page, isMobile }) => {
    // The review of 22 Nov 2026: one row ran off the right edge with no scroll bar and no arrow, and a
    // wheel or a drag could not move it, so six occasions had no link a mouse could press. Then all
    // fourteen stood in two rows, and at 1440 by 900 no gift was on the first screen (the user walk of
    // 23 Nov 2026). Now: "All occasions", the six in season and "More", as the owner drew it.
    test.skip(isMobile, "a phone swipes the row");
    // Two languages at four widths, each page opened fresh.
    test.setTimeout(300_000);
    const look = (nav: Element) => {
      const box = nav.getBoundingClientRect();
      const shown = [...nav.querySelectorAll<HTMLElement>("[data-occasion-tile], [data-occasion-more]")].filter((tile) => tile.getBoundingClientRect().width > 0);
      const pills = [...document.querySelectorAll("[aria-pressed]")].map((pill) => pill.getBoundingClientRect());
      return {
        shown: shown.map((tile) => tile.dataset.occasionTile ?? "more"),
        scrolls: nav.scrollWidth - nav.clientWidth,
        outside: shown
          .filter((tile) => {
            const r = tile.getBoundingClientRect();
            return r.left < box.left - 1 || r.right > box.right + 1 || r.right > window.innerWidth || r.left < 0;
          })
          .map((tile) => tile.dataset.occasionTile ?? "more"),
        // No tile stands under the price filter beside the row.
        underFilter: shown
          .filter((tile) => {
            const r = tile.getBoundingClientRect();
            return pills.some((p) => r.right > p.left - 4 && r.left < p.right && r.bottom > p.top && r.top < p.bottom);
          })
          .map((tile) => tile.dataset.occasionTile ?? "more"),
        // No name is cut: a tile's words fit the tile.
        cut: shown.flatMap((tile) => [...tile.querySelectorAll<HTMLElement>("span")]).filter((label) => label.scrollWidth > label.clientWidth + 1 || label.scrollHeight > label.clientHeight + 1).map((label) => label.textContent),
        // The rows the shown links stand in, by their tops (the open tile and a tile under the pointer are drawn a pixel or two off).
        rows: shown.filter((tile) => tile.dataset.occasionTile).map((tile) => Math.round(tile.getBoundingClientRect().top / 20)).filter((top, i, all) => all.indexOf(top) === i).length,
      };
    };
    for (const path of ["/templates", "/es/templates"])
      for (const [width, height] of [
        [1024, 768],
        [1280, 800],
        [1440, 900],
        [1920, 1080],
      ]) {
        await page.setViewportSize({ width, height });
        await page.goto(path);
        const row = page.locator("[data-occasion-row]");
        await expect(row.locator("[data-occasion-tile]")).toHaveCount(14);
        const today = new Date().toISOString().slice(0, 10);
        const closed = await row.evaluate(look);
        expect(closed.shown, `${path} at ${width}px`).toEqual(["all", ...occasionRow(today).slice(0, 6), "more"]);
        expect(closed.rows, `${path} at ${width}px: one row`).toBe(1);
        expect(closed.outside, `${path}: tiles outside the row at ${width}px`).toEqual([]);
        expect(closed.underFilter, `${path}: tiles under the filter at ${width}px`).toEqual([]);
        expect(closed.scrolls, `${path}: the row scrolls at ${width}px`).toBeLessThanOrEqual(0);
        expect(closed.cut, `${path}: names cut at ${width}px`).toEqual([]);
        // What the row was folded for: on a 1440 by 900 screen the best sellers' pictures begin well inside the first screen.
        if (width === 1440 && path === "/templates") expect((await page.locator("[data-gallery-card]").first().boundingBox())!.y).toBeLessThan(600);
        const more = page.locator("[data-occasion-more]");
        await expect(more).toHaveAttribute("aria-expanded", "false");
        // Pressed again if the page had not yet come alive under the first press.
        await expect(async () => {
          if ((await more.getAttribute("aria-expanded")) !== "true") await more.click();
          await expect(more).toHaveAttribute("aria-expanded", "true", { timeout: 1500 });
        }).toPass({ timeout: 30_000 });
        const open = await row.evaluate(look);
        expect(open.shown.filter((name) => name !== "more").sort(), `${path} at ${width}px, opened`).toEqual(["all", ...occasionRow(today)].sort());
        expect(open.rows, `${path} at ${width}px: two rows`).toBe(2);
        expect(open.outside, `${path}: tiles outside the opened row at ${width}px`).toEqual([]);
        expect(open.underFilter, `${path}: tiles under the filter at ${width}px, opened`).toEqual([]);
        expect(open.cut, `${path}: names cut at ${width}px, opened`).toEqual([]);
        await more.click();
        await expect(more).toHaveAttribute("aria-expanded", "false");
      }
    // An occasion that is not one of the six in season still has its tile in the first row when its page is open.
    const today = new Date().toISOString().slice(0, 10);
    const late = occasionRow(today)[12];
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/occasions/${late}`);
    const openTile = page.locator(`[data-occasion-tile=${late}]`);
    await expect(openTile).toHaveAttribute("aria-current", "page");
    await expect(openTile).toBeVisible();
    expect(Math.abs((await openTile.boundingBox())!.y - (await page.locator("[data-occasion-tile=all]").boundingBox())!.y)).toBeLessThan(4);
    await expect(page.locator("[data-occasion-tile]:visible")).toHaveCount(7);
    await page.goto("/templates");
    // In season first, by the day the page was rendered with (gallery-occasions.ts), then the catalogue's order.
    const order = await page.locator("[data-occasion-tile]").evaluateAll((tiles) => tiles.map((tile) => (tile as HTMLElement).dataset.occasionTile));
    expect(order).toEqual(["all", ...occasionRow(today)]);
    // And an occasion's page has the row in the same order.
    await page.goto("/occasions/thanksgiving");
    await expect(page.locator("[data-occasion-tile=thanksgiving]")).toHaveAttribute("aria-current", "page");
    expect(await page.locator("[data-occasion-tile]").evaluateAll((tiles) => tiles.map((tile) => (tile as HTMLElement).dataset.occasionTile))).toEqual(order);
  });

  test("no card cuts its line short, in English or Spanish, from a small phone to a wide desk", async ({ page, isMobile }) => {
    // The review of 22 Nov 2026: the one line ended in an ellipsis on 59 of 61 cards.
    test.skip(isMobile, "sets its own screen sizes");
    test.setTimeout(180_000);
    for (const path of ["/templates", "/es/templates"]) {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(path);
      await expect(page.locator("[data-gallery-card]").first()).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      for (const width of [320, 390, 640, 768, 1024, 1280, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(null)))));
        // Two cards to a row on a phone (since 27 Nov 2026): the line has three rows' room there, two from 640px.
        const most = width < 640 ? 3 : 2;
        const found = await page.locator("[data-gallery-card]").evaluateAll((cards, most) => {
          const cut: string[] = [];
          for (const card of cards) {
            const line = card.querySelector<HTMLElement>("[data-card-line]")!;
            const style = getComputedStyle(line);
            const rows = Math.round(line.scrollHeight / parseFloat(style.lineHeight));
            // Whole on the card: not clipped sideways, no ellipsis, and within the lines the card keeps for it.
            if (line.scrollWidth > line.clientWidth + 1 || style.textOverflow === "ellipsis" || rows > most || line.scrollHeight > line.clientHeight + 1) cut.push(`${(card as HTMLElement).dataset.galleryCard}: "${line.textContent}" (${rows} lines)`);
          }
          return { cards: cards.length, cut, sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth };
        }, most);
        expect(found.cards).toBeGreaterThan(50);
        expect(found.cut, `${path} at ${width}px`).toEqual([]);
        expect(found.sideways, `${path} at ${width}px scrolls sideways`).toBeLessThanOrEqual(0);
      }
    }
  });

  test("a card says its price and has two ways out: the gift's own page, and straight to the editor", async ({ page }) => {
    // The review of 22 Nov 2026: with the older card's "Make this gift" gone, nothing on the most
    // visited page reached the editor, and no price was printed anywhere on it.
    await page.goto("/templates");
    const cards = page.locator("[data-gallery-card]");
    await expect(cards.first()).toBeVisible();
    const found = await cards.evaluateAll((all) =>
      all.map((card) => ({
        slug: (card as HTMLElement).dataset.galleryCard!,
        links: [...card.querySelectorAll("a")].map((a) => a.getAttribute("href")!),
        price: card.querySelector("[data-price]")?.textContent?.trim() ?? "",
        makeHeight: card.querySelector<HTMLElement>("[data-card-make]")?.getBoundingClientRect().height ?? 0,
        // What a screen reader hears for the card's first link: the picture's words are not said again.
        pictureHidden: card.querySelector("img")?.getAttribute("aria-hidden") === "true",
      })),
    );
    expect(found.length).toBeGreaterThan(50);
    for (const card of found) {
      expect(card.links, card.slug).toEqual([`/templates/${card.slug}`, `/create/${card.slug}`]);
      expect(card.price, card.slug).toMatch(/^(Free|[$€£]\d+\.\d{2} once)$/);
      expect(card.makeHeight, `${card.slug}: "Make this gift" is a thumb tall`).toBeGreaterThanOrEqual(44);
      expect(card.pictureHidden, card.slug).toBe(true);
    }
    // The two that can be sent free say so; a best seller says its price.
    // With the free version as The Letter's short note (the live site's setting), Constellations is paid: the spec follows the server's own setting.
    const noteForEveryone = Number(process.env.NEXT_PUBLIC_FREE_NOTE_SHARE) >= 1;
    expect(found.filter((card) => card.price === "Free").map((card) => card.slug).sort()).toEqual(noteForEveryone ? ["the-letter"] : ["constellations", "the-letter"]);
    // "Make this gift" names its gift for a screen reader, and opens that gift's editor.
    const make = cards.first().getByRole("link", { name: "Make this gift: Bouquet" });
    await make.click();
    await expect(page).toHaveURL(/\/create\/bouquet$/, { timeout: 60_000 });
  });

  test("with less motion asked for, a card's film is neither fetched nor played, and no card rises into place", async ({ browser, baseURL, isMobile }) => {
    test.skip(isMobile, "the film is for a pointer resting on a card");
    const context = await browser.newContext({ baseURL, reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const films: string[] = [];
    page.on("request", (request) => {
      if (/\.webm(\?|$)/.test(request.url())) films.push(request.url());
    });
    await page.goto("/templates");
    const card = page.locator("[data-gallery-card]").first();
    await expect(card).toBeVisible();
    await card.hover();
    await page.waitForTimeout(600);
    expect(await card.locator("video").evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
    expect(films).toEqual([]);
    // A card further down does not travel into place: it is 16px low until it is in view (the server
    // draws it there), and then it is in its place, with no frame anywhere between the two.
    const seen = await page.locator("[data-gallery-card]").nth(9).evaluate(async (card) => {
      const heights = new Set<number>();
      card.scrollIntoView({ block: "center" });
      const until = performance.now() + 1500;
      while (performance.now() < until) {
        heights.add(new DOMMatrixReadOnly(getComputedStyle(card).transform).m42);
        await new Promise((frame) => requestAnimationFrame(frame));
      }
      return [...heights];
    });
    expect(seen).toContain(0);
    expect(seen.filter((y) => y !== 0 && y !== 16)).toEqual([]);
    await context.close();
  });

  test("without JavaScript every card is drawn: none waits unseen for a script to fade it in", async ({ browser, baseURL }) => {
    // The review of 22 Nov 2026: 57 of 61 cards were drawn at opacity 0 with scripts off (the server
    // writes a card's first state, and only a script moved it on).
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto("/templates");
    const found = await page.locator("[data-gallery-card]").evaluateAll((cards) => ({ cards: cards.length, unseen: cards.filter((card) => Number(getComputedStyle(card).opacity) < 1 || getComputedStyle(card).transform !== "none").length }));
    expect(found.cards).toBeGreaterThan(50);
    expect(found.unseen).toBe(0);
    await context.close();
  });

  test("an occasion is a tile with its own picture, and a card's picture and name lead to the gift's own page", async ({ page, request }) => {
    await page.goto("/templates");
    const tiles = page.locator("[data-occasion-tile]");
    await expect(tiles).toHaveCount(14);
    await expect(page.locator("[data-occasion-tile=all]")).toHaveAttribute("aria-current", "page");
    // On a desk seven of them are folded under "More"; a phone has them all in the row.
    const more = page.locator("[data-occasion-more]");
    if (await more.isVisible()) await more.click();
    // Every tile's picture exists.
    const srcs = await tiles.locator("img").evaluateAll((imgs) => imgs.map((img) => img.getAttribute("src")!));
    for (const src of srcs) expect((await request.get(src)).ok(), src).toBe(true);
    // A tile is at least a thumb's size.
    for (const box of await tiles.evaluateAll((all) => all.map((el) => el.getBoundingClientRect()).map((r) => ({ w: r.width, h: r.height })))) {
      expect(box.w).toBeGreaterThanOrEqual(44);
      expect(box.h).toBeGreaterThanOrEqual(44);
    }
    await page.locator("[data-occasion-tile=birthday]").click();
    // A dev server builds the occasion's page the first time it is asked for.
    await expect(page).toHaveURL(new RegExp("/occasions/birthday$"), { timeout: 60_000 });
    await expect(page.locator("[data-occasion-tile=birthday]")).toHaveAttribute("aria-current", "page");
    // An occasion's page keeps its own order, so it has no "Sort by".
    await expect(page.locator("[data-gallery-sort]")).toHaveCount(0);
    const card = page.locator("[data-gallery-card]").first();
    const slug = await card.getAttribute("data-gallery-card");
    await expect(card.getByRole("link")).toHaveCount(2);
    await card.locator("[data-card-page]").click();
    // A dev server builds the gift's page the first time it is asked for.
    await expect(page).toHaveURL(new RegExp(`/templates/${slug}$`), { timeout: 60_000 });
  });
});
