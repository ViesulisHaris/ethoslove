import { expect, test } from "@playwright/test";
import { mockWorld } from "./dates-world";

/**
 * The third fix round on the preview (docs/marketing/growth-build/reports/view-fix-3-brief.md): the
 * Dates pages, once growth/dates was merged in. Each test holds one finding, named by its number.
 * The places, the forecast and the map's style come from dates-world.ts, never from the outside.
 */

test.describe("rooms-1: Back from a Dates search leaves no search on another page's address", () => {
  test("/ > Dates > New York > the map > Back, Back, reload, Back", async ({ page }) => {
    test.setTimeout(120_000);
    await mockWorld(page);
    const seen: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) seen.push(frame.url());
    });
    const offDates = () => {
      const all = [...seen, page.url()];
      return all.filter((href) => {
        const url = new URL(href);
        return !/^\/(es\/)?dates$/.test(url.pathname) && (url.searchParams.has("lat") || url.searchParams.has("q"));
      });
    };

    await page.goto("/");
    await page.getByRole("link", { name: "or find a date idea instead" }).first().click();
    await expect(page).toHaveURL(/\/dates$|\/dates\?/);
    await page.locator("main").getByRole("link", { name: "New York", exact: true }).first().click();
    await expect(page).toHaveURL(/\/dates\/new-york/);
    await page.getByRole("link", { name: "Open the map in New York" }).first().click();
    await expect(page).toHaveURL(/\/dates\?.*lat=/);
    await expect(page.getByRole("button", { name: /^Livraria do Bairro/ }).first()).toBeVisible({ timeout: 30_000 });

    await page.goBack();
    await page.waitForTimeout(800);
    await page.goBack();
    await page.waitForTimeout(800);
    await page.reload();
    await page.waitForTimeout(1500);
    await page.goBack();
    await page.waitForTimeout(1500);
    expect(new URL(page.url()).pathname).toBe("/");
    // The explorer may still be on its way out: give it the time it used to need to write.
    await page.waitForTimeout(1000);
    expect(offDates()).toEqual([]);
    await page.reload();
    expect(new URL(page.url()).search).toBe("");
  });
});

test.describe("rooms-3: a city page's hero at 1440", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  // The dates2 job (70a6cbad) rebuilt the city page on the pages by kind's spread: the hero is DateHero, laid on
  // the page's own ground (no band of its own, so no edge to fade), its rendered art placed by DATE_HERO_ART and
  // the rendered lily stem beside the planner just under it (DATE_CARDS_ART). The final pass of 25 Nov 2026
  // looked at it beside a kind page and the front page: the flowers are there, drawn the new way.
  test("its rendered flowers lie whole inside it, a lily is in the first view, and it has no ground of its own", async ({ page }) => {
    for (const path of ["/dates/london", "/es/dates/lisbon", "/dates/new-york"]) {
      await page.goto(path);
      const hero = page.locator("main section").first();
      await expect(hero.getByRole("heading", { level: 1 }), path).toBeVisible();
      const layer = hero.locator(":scope > [data-art-layer]");
      await expect(layer, path).toHaveCount(1);
      const seen = await layer.evaluate((box) => {
        const band = box.getBoundingClientRect();
        const shown = [...box.querySelectorAll<HTMLImageElement>("[data-decor] img")].filter((img) => getComputedStyle(img.parentElement!).display !== "none" && img.getClientRects().length > 0);
        return {
          rendered: shown.filter((img) => /\/art\/pages\/[a-z0-9-]+\.webp$/.test(img.currentSrc || img.src)).length,
          // A piece on the left half that hangs out of the hero's foot would lie on the planner's words.
          out: shown.map((img) => img.getBoundingClientRect()).filter((r) => r.left < band.left + band.width / 2 && r.bottom > band.bottom + 1).map((r) => Math.round(r.bottom - band.bottom)),
        };
      });
      expect(seen.rendered, `${path}: the hero draws a rendered piece`).toBeGreaterThanOrEqual(1);
      expect(seen.out, path).toEqual([]);
      // The lily of the first view: a rendered lily drawn on the first screen.
      const lilies = await page.locator('[data-art-layer] [data-decor^="lily"] img').evaluateAll((imgs) =>
        (imgs as HTMLImageElement[]).filter((img) => getComputedStyle(img.parentElement!).display !== "none" && img.getClientRects().length > 0).map((img) => ({ src: img.currentSrc || img.src, top: img.getBoundingClientRect().top + window.scrollY })),
      );
      const firstView = lilies.filter((l) => l.top < 900 && /\/art\/pages\/lily-[a-z-]+(-1x)?\.webp$/.test(l.src));
      expect(firstView.length, `${path}: a rendered lily in the first view`).toBeGreaterThanOrEqual(1);
      const ground = await hero.evaluate((section) => getComputedStyle(section).backgroundColor);
      expect(ground, `${path}: the hero lies on the page's ground`).toBe("rgba(0, 0, 0, 0)");
    }
  });
});

test.describe("rooms-9: the strip of cities and kinds at the foot of /dates is on the page's grid", () => {
  for (const width of [1440, 1024, 390]) {
    test(`at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await mockWorld(page);
      await page.goto("/dates");
      const strip = page.getByRole("navigation", { name: "Date ideas by city" });
      await expect(strip).toBeAttached();
      const lefts = await page.evaluate(() => {
        const left = (el: Element | null) => (el ? Math.round(el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft)) : null);
        const nav = document.querySelector('nav[aria-label="Date ideas by city"]');
        return { cities: left(nav?.querySelector("h2") ?? null), footer: left(document.querySelector("footer .container-x")) };
      });
      expect(lefts.cities).toBe(lefts.footer);
      // Its label is the site's eyebrow (mono, tracked caps), as on a city's page, not the serif of a heading.
      const [label, eyebrow] = await Promise.all([
        strip.locator("h2").evaluate((h) => getComputedStyle(h).fontFamily),
        page.evaluate(() => {
          const probe = document.createElement("span");
          probe.className = "text-eyebrow";
          document.body.append(probe);
          const family = getComputedStyle(probe).fontFamily;
          probe.remove();
          return family;
        }),
      ]);
      expect(label).toBe(eyebrow);
    });
  }
});

test.describe("rooms-11: the where box's placeholder is whole on a small phone", () => {
  for (const width of [320, 360, 390]) {
    for (const [lang, prefix] of [["en", ""], ["es", "/es"]] as const) {
      test(`${lang} at ${width}, on the start screen and over the results`, async ({ page }) => {
        await page.setViewportSize({ width, height: 700 });
        await mockWorld(page);
        for (const path of [`${prefix}/dates`, `${prefix}/dates?lat=38.714&lng=-9.139&q=Lisbon`]) {
          await page.goto(path);
          const box = page.getByRole("combobox").first();
          await expect(box).toBeVisible();
          if (path.includes("lat=")) await box.fill("");
          // The words drawn in the field's own font, against the room the field leaves them.
          const fit = await box.evaluate((input: HTMLInputElement) => {
            const style = getComputedStyle(input);
            const ctx = document.createElement("canvas").getContext("2d")!;
            ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
            const room = input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
            return { placeholder: input.placeholder, text: Math.ceil(ctx.measureText(input.placeholder).width), room: Math.floor(room), size: parseFloat(style.fontSize) };
          });
          expect(fit.size, path).toBeGreaterThanOrEqual(16);
          expect(fit.text, `${path}: "${fit.placeholder}"`).toBeLessThanOrEqual(fit.room);
        }
      });
    }
  }
});
