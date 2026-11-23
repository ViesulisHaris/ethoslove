import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * The pages search asked for and the site did not have (20 Nov 2026): /digital-cards, the six gift
 * pages by kind under /gifts/, and the idea lists on the eight occasions that had none. Each is
 * opened on a phone and on a desktop (the two projects), in both languages: it has its h1, every
 * idea is a template that exists, "Make this gift" opens that template's editor with the page's
 * ref, the answers to its questions are in the HTML a crawler reads, and nothing is wider than
 * the screen.
 *
 * Since 22 Nov 2026 an idea is a picture card that opens (docs/marketing/growth-build/
 * DESIGN-LESS-TEXT.md): its line to borrow and its two links are inside the card, in the HTML from
 * the start and on show once the card is opened. tests/e2e/spread-design.spec.ts holds the layout.
 */

/**
 * The gift finder's page. Another part of the growth build adds it, so it is in this checkout only
 * once that part is merged; /digital-cards links to it exactly then.
 */
const FINDER_BUILT = existsSync(join(process.cwd(), "src/app/[currency]/[locale]/(marketing)/gifts/finder/page.tsx"));

/** Every template there is: a folder in src/templates with a manifest. */
const TEMPLATES = new Set(readdirSync(join(process.cwd(), "src/templates")).filter((dir) => existsSync(join(process.cwd(), "src/templates", dir, "manifest.ts"))));

const LANGS = [
  { prefix: "", lang: "en", make: "Make this gift", makeLead: "Make the one in the phone", watch: "Watch it", faq: "Questions people ask", readNext: "Read next" },
  { prefix: "/es", lang: "es", make: "Crear este regalo", makeLead: "Crear el del móvil", watch: "Verlo", faq: "Preguntas frecuentes", readNext: "Sigue leyendo" },
] as const;

/** The six pages by kind: their h1 in each language, and how many ideas each lists. */
const KINDS = [
  { slug: "last-minute", ideas: 8, h1: { en: "Last-minute gifts you can send today", es: "Regalos de última hora para enviar hoy" } },
  { slug: "video-message", ideas: 7, h1: { en: "Video message gifts", es: "Regalos con mensaje en vídeo" } },
  { slug: "interactive-birthday-card", ideas: 8, h1: { en: "Interactive birthday cards", es: "Tarjetas de cumpleaños interactivas" } },
  { slug: "virtual-birthday-cake", ideas: 5, h1: { en: "A virtual birthday cake they can blow out", es: "Una tarta de cumpleaños virtual para soplar desde su móvil" } },
  { slug: "photo-album", ideas: 8, h1: { en: "Interactive photo albums", es: "Álbumes de fotos interactivos" } },
  { slug: "anniversary-website", ideas: 7, h1: { en: "An anniversary website for your girlfriend or boyfriend", es: "Una página web de aniversario para tu novia o tu novio" } },
] as const;

/** The occasions that gained an idea list, and how many ideas each has. */
const OCCASIONS = [
  ["mothers-day", 10],
  ["fathers-day", 10],
  ["graduation", 10],
  ["wedding", 10],
  ["long-distance", 11],
  ["apology", 8],
  ["just-because", 11],
  ["thanksgiving", 8],
] as const;

/** Fails the test on any uncaught error in the page. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return () => expect(errors, errors.join("\n")).toEqual([]);
}

/** No raw message key or placeholder in what a reader sees, and nothing wider than the screen. */
async function readsClean(page: Page) {
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/MISSING_MESSAGE|\brecipients\.[a-zA-Z]+\b|\{[a-z]+\}|\bundefined\b|\bNaN\b/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

const decode = (s: string) =>
  s
    .replace(/<!-- -->/g, "")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/**
 * The page as a crawler gets it, with no script run: every answer in its FAQPage structured data is
 * also in the page's own HTML, inside a <details>, word for word.
 */
async function answersAreInTheHtml(request: APIRequestContext, path: string) {
  const response = await request.get(path);
  expect(response.status(), path).toBe(200);
  const html = await response.text();
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]) as { "@graph"?: { "@type": string; mainEntity?: { name: string; acceptedAnswer: { text: string } }[] }[] });
  const faq = blocks.flatMap((b) => b["@graph"] ?? []).find((node) => node["@type"] === "FAQPage");
  expect(faq, `${path} has no FAQPage`).toBeTruthy();
  const questions = faq!.mainEntity ?? [];
  expect(questions.length, path).toBeGreaterThanOrEqual(3);
  const visible = decode(html.replace(/<script[\s\S]*?<\/script>/g, ""));
  const details = [...visible.matchAll(/<details[\s\S]*?<\/details>/g)].map((m) => m[0].replace(/<[^>]+>/g, ""));
  for (const q of questions) {
    expect(details.some((d) => d.includes(q.name) && d.includes(q.acceptedAnswer.text)), `${path}: “${q.name}” is answered in the HTML`).toBe(true);
  }
}

/** Every idea on the page: a card whose editor link names a real template, and carries the page's ref when it has one. */
async function ideasCanBeMade(page: Page, prefix: string, count: number, ref?: string) {
  const makes = page.getByTestId("idea-make");
  await expect(makes).toHaveCount(count);
  const hrefs = await makes.evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
  const slugs = hrefs.map((href) => {
    const match = href.match(new RegExp(`^${prefix}/create/([a-z-]+)${ref ? `\\?ref=${ref}` : ""}$`));
    expect(match, `${href} is not an editor link${ref ? ` with ref ${ref}` : ""}`).not.toBeNull();
    return match![1];
  });
  for (const slug of slugs) expect(TEMPLATES.has(slug), `${slug} is not a template`).toBe(true);
  expect(new Set(slugs).size, "an idea is listed twice").toBe(slugs.length);
  return slugs;
}

for (const lang of LANGS) {
  test.describe(`gift pages by kind${lang.prefix ? ` in ${lang.prefix}` : ""}`, () => {
    for (const kind of KINDS) {
      test(`/gifts/${kind.slug}: its h1, ideas that are real templates, a line to borrow on each, and the way on`, async ({ page }) => {
        const noErrors = watchErrors(page);
        const response = await page.goto(`${lang.prefix}/gifts/${kind.slug}`);
        expect(response?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", lang.lang);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(kind.h1[lang.lang]);
        await expect(page.locator("h1")).toHaveCount(1);

        const slugs = await ideasCanBeMade(page, lang.prefix, kind.ideas, `gifts-${kind.slug}`);
        // Each idea is a card with the gift's picture and a title, and can be watched first (the template's demo).
        const cards = page.locator("[data-cards] [data-card]");
        await expect(cards).toHaveCount(kind.ideas);
        const watches = page.getByTestId("idea-watch");
        await expect(watches).toHaveCount(kind.ideas);
        expect(await watches.evaluateAll((links) => links.map((a) => a.getAttribute("href")))).toEqual(slugs.map((slug) => `${lang.prefix}/demo/${slug}`));
        await expect(watches.first()).toContainText(lang.watch);
        // Every card holds one line and a line to borrow, in the HTML from the start, and shows them once it is opened.
        const lines = page.locator("[data-cards] [data-line]");
        await expect(lines).toHaveCount(kind.ideas);
        for (const text of await lines.evaluateAll((els) => els.map((el) => el.textContent ?? ""))) expect(text.trim().length).toBeGreaterThan(5);
        const first = cards.first();
        await first.locator("summary").first().scrollIntoViewIfNeeded();
        await expect(first.locator("[data-line]")).toBeHidden();
        await first.locator("summary").first().click();
        await expect(first.locator("[data-line]")).toBeVisible();
        await expect(first.getByTestId("idea-make")).toBeVisible();
        await expect(first.getByTestId("idea-make")).toHaveText(lang.make);

        await expect(page.getByRole("heading", { level: 2, name: lang.faq })).toBeVisible();
        // The neighbours: the other kinds, four of them as posters, and the pages that answer the searches next to this one.
        const next = page.getByRole("navigation", { name: lang.readNext }).getByRole("link");
        expect(await next.count()).toBeGreaterThanOrEqual(6);
        for (const other of KINDS.filter((k) => k.slug !== kind.slug)) await expect(page.locator(`nav a[href="${lang.prefix}/gifts/${other.slug}"]`).first()).toBeAttached();
        // The pages by person are one row down, in the site's footer.
        await expect(page.locator(`footer a[href="${lang.prefix}/gifts/for-boyfriend"]`).first()).toBeAttached();
        // The hero's one button opens the editor of the gift playing in its phone, with the page's ref. The page lists
        // several gifts, so that gift is named: in the note under the button, and to a screen reader after the button's
        // own words. In the button itself the name read badly ("Hacer Ramo", "Make Bouquet", the deep test of 23 Nov 2026), and
        // "Make this gift" on a page of eight did not say which (round 2, C13): the button points at the phone.
        const heroMake = page.getByTestId("hero-make");
        expect(await heroMake.getAttribute("href")).toMatch(new RegExp(`^${lang.prefix}/create/[a-z-]+\\?ref=gifts-${kind.slug}$`));
        await expect(heroMake).toHaveText(lang.makeLead);
        const named = ((await heroMake.getAttribute("aria-label")) ?? "").slice(`${lang.makeLead}: `.length);
        await expect(heroMake).toHaveAttribute("aria-label", `${lang.makeLead}: ${named}`);
        expect(named).not.toBe("");
        await expect(page.getByTestId("hero-note")).toContainText(`${named},`);
        // Every idea in full is in the HTML from the start, closed inside its card: one closed row a card.
        await expect(page.locator("[data-cards] [data-card] details[data-idea-full]")).toHaveCount(kind.ideas);

        await readsClean(page);
        noErrors();
      });

      test(`/gifts/${kind.slug}: the answers are in the HTML`, async ({ request }) => {
        await answersAreInTheHtml(request, `${lang.prefix}/gifts/${kind.slug}`);
      });
    }

    test("/digital-cards: the category line once, five kinds with a real card each, and prices", async ({ page }) => {
      // The page, then every page it links onward to, each fetched: past 30s on a busy machine (23 Nov 2026).
      test.slow();
      const noErrors = watchErrors(page);
      const response = await page.goto(`${lang.prefix}/digital-cards`);
      expect(response?.status()).toBe(200);
      const line = lang.lang === "en" ? "Digital cards by Tryethos" : "Tarjetas digitales de Tryethos";
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toContainText(line);
      await expect(h1).toContainText(lang.lang === "en" ? "A card that opens on their phone" : "Una tarjeta que se abre en su móvil");
      await expect(page.locator("h1")).toHaveCount(1);
      // The owner's line is a maker's mark: once on the page, and nowhere in the header or footer.
      const body = await page.locator("body").innerText();
      expect(body.toLowerCase().split(line.toLowerCase()).length - 1).toBe(1);

      const kinds = page.locator("[data-kinds] [data-card]");
      await expect(kinds).toHaveCount(5);
      const watch = await kinds.getByTestId("idea-watch").evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
      const make = await kinds.getByTestId("idea-make").evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
      expect(watch).toHaveLength(5);
      for (const [i, href] of watch.entries()) {
        const slug = href.replace(`${lang.prefix}/demo/`, "");
        expect(TEMPLATES.has(slug), href).toBe(true);
        expect(make[i]).toBe(`${lang.prefix}/create/${slug}?ref=digital-cards`);
      }

      // Three prices as cards, and all six in the closed block under the questions: the free note, then five read
      // from the catalogue in this page's currency, the note with photos among them.
      // In whatever currency this browser is charged in: an en-US browser with no country header is charged dollars,
      // which Spanish writes "11,99 US$" (the deep test of 23 Nov 2026).
      const money = /[€$£]\s?\d+[.,]\d{2}|\d+[.,]\d{2}\s?(?:US)?[€$£]/;
      const shown = await page.getByTestId("card-prices").locator("[data-price]").allInnerTexts();
      expect(shown).toHaveLength(3);
      for (const price of shown) expect(price).toMatch(money);
      const prices = await page.getByTestId("card-prices-all").locator("[data-price]").evaluateAll((els) => els.map((el) => el.textContent ?? ""));
      expect(prices).toHaveLength(6);
      expect(prices[0]).toBe(lang.lang === "en" ? "Free" : "Gratis");
      for (const price of prices.slice(1)) expect(price).toMatch(money);
      // The three cards are the last three rows: the list runs from the least to the most (the free note, a note with
      // photos, the full Letter, then one card, three and every card), not with the two cheapest last.
      expect(prices.slice(3, 6)).toEqual(shown);
      const amounts = prices.slice(1).map((price) => Number(price.replace(/[^0-9.,]/g, "").replace(",", ".")));
      expect(amounts, prices.join(" ")).toEqual([...amounts].sort((x, y) => x - y));

      // It links to /gifts, which owns "digital gift", and on to the occasions and the people.
      for (const href of ["/gifts", "/occasions", "/templates", "/pricing", "/gifts/for-mom", "/gifts/photo-album"]) await expect(page.locator(`a[href="${lang.prefix}${href}"]`).first()).toBeAttached();
      // The pages by person have a row of their own in the page, not only the footer's: it opens their list on /gifts.
      await expect(page.locator(`section[aria-labelledby="onward"] nav a[href="${lang.prefix}/gifts#by-person"]`)).toHaveCount(1);
      // The way on: every row opens a page that is there. The finder's row shows exactly when the finder is built.
      const onward = await page.locator('section[aria-labelledby="onward"] nav a').evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
      expect(onward.length).toBeGreaterThanOrEqual(8);
      expect(onward.includes(`${lang.prefix}/gifts/finder`), "the finder's row").toBe(FINDER_BUILT);
      for (const href of onward) expect((await page.request.get(href)).status(), href).toBe(200);
      await readsClean(page);
      noErrors();
    });

    test("/digital-cards: the breadcrumb search engines read has the page's plain name", async ({ request }) => {
      // The category line is on the page once, as its eyebrow; the breadcrumb is not a second place for it.
      const html = await (await request.get(`${lang.prefix}/digital-cards`)).text();
      const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]) as { "@graph"?: { "@type": string; itemListElement?: { name: string }[] }[] });
      const crumbs = blocks.flatMap((b) => b["@graph"] ?? []).find((node) => node["@type"] === "BreadcrumbList");
      expect(crumbs, "no BreadcrumbList").toBeTruthy();
      const names = (crumbs!.itemListElement ?? []).map((item) => item.name);
      expect(names.at(-1)).toBe(lang.lang === "en" ? "Digital cards" : "Tarjetas digitales");
      for (const name of names) expect(name).not.toContain("Tryethos");
    });

    test("/digital-cards: the answers are in the HTML", async ({ request }) => {
      await answersAreInTheHtml(request, `${lang.prefix}/digital-cards`);
    });

    test("/gifts links to /digital-cards and to the pages by kind", async ({ page }) => {
      await page.goto(`${lang.prefix}/gifts`);
      // Where /digital-cards' "Gifts by who it is for" lands: the heading over the seven pages by person.
      await expect(page.locator("main h2#by-person")).toHaveCount(1);
      await expect(page.locator(`main a[href="${lang.prefix}/digital-cards"]`).first()).toBeAttached();
      for (const kind of KINDS) await expect(page.locator(`main a[href="${lang.prefix}/gifts/${kind.slug}"]`).first()).toBeAttached();
      // Where next (fix round 4: the page laid out as the pages by kind end): four pages by kind as posters, and the people,
      // the occasions, the other kinds and /digital-cards as the quiet row of links, each 44px to a thumb.
      const next = page.locator('section[aria-labelledby="by-person"] nav');
      const links = next.locator(`a[href^="${lang.prefix}/gifts/"], a[href="${lang.prefix}/occasions"], a[href="${lang.prefix}/digital-cards"]`);
      expect(await links.count()).toBeGreaterThanOrEqual(KINDS.length + 7 + 2);
      const heights = await next.locator("ul.mt-9 a").evaluateAll((all) => all.map((a) => a.getBoundingClientRect().height));
      for (const h of heights) expect(h).toBeGreaterThanOrEqual(44);
    });

    for (const [occasion, count] of OCCASIONS) {
      test(`/occasions/${occasion}: ${count} ideas, each a template that can be made`, async ({ page }) => {
        const noErrors = watchErrors(page);
        const response = await page.goto(`${lang.prefix}/occasions/${occasion}`);
        expect(response?.status()).toBe(200);
        await expect(page.locator("h1")).toHaveCount(1);
        const heading = page.locator(`#ideas-${occasion}`);
        await expect(heading).toContainText(String(count));
        await ideasCanBeMade(page, lang.prefix, count);
        await readsClean(page);
        noErrors();
      });
    }
  });
}

test.describe("from a gift page into the editor", () => {
  for (const kind of KINDS) {
    test(`/gifts/${kind.slug}: "Make this gift" opens that template's editor, with the page's ref`, async ({ page }) => {
      await page.goto(`/gifts/${kind.slug}`);
      const card = page.locator("[data-cards] [data-card]").first();
      const first = card.getByTestId("idea-make");
      const href = (await first.getAttribute("href")) ?? "";
      const slug = href.match(/^\/create\/([a-z-]+)\?ref=/)?.[1] ?? "";
      expect(TEMPLATES.has(slug), href).toBe(true);
      // The card's own label names its template: "The Letter · Free".
      const name = ((await card.locator("summary > span").nth(1).textContent()) ?? "").split("·")[0].trim();
      expect(name.length).toBeGreaterThan(2);
      // The way into the editor is inside the card: it is opened first, as a visitor would.
      await card.locator("summary").first().click();
      await first.click();
      await expect(page).toHaveURL(new RegExp(`/create/${slug}\\?ref=gifts-${kind.slug}$`), { timeout: 60_000 });
      await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 60_000 });
      // The editor's top bar carries the template's name (on a phone it is in the page, folded away).
      await expect(page.getByText(name, { exact: true }).first()).toBeAttached();
    });
  }

  test('/digital-cards: "Make this one" opens the card shown, and "Watch it" its demo', async ({ page }) => {
    await page.goto("/digital-cards");
    const kind = page.locator("[data-kinds] [data-card]").first();
    await expect(kind.getByTestId("idea-watch")).toHaveAttribute("href", "/demo/the-letter");
    await kind.locator("summary").first().click();
    // The others of its kind are named in the opened card, each a link to its own page.
    await expect(kind.locator('a[href="/templates/keepsake"]')).toBeVisible();
    await kind.getByTestId("idea-make").click();
    await expect(page).toHaveURL(/\/create\/the-letter\?ref=digital-cards$/, { timeout: 60_000 });
    await expect(page.getByLabel("Their name")).toBeVisible({ timeout: 60_000 });
  });
});

test("the gift pages keep their two families apart, and anything else is a 404", async ({ page }) => {
  for (const path of ["/gifts/for-boyfriend", "/es/gifts/for-mom"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    // A page for a person has no "Watch it": that belongs to the pages by kind.
    await expect(page.getByTestId("idea-watch")).toHaveCount(0);
    await expect(page.locator(`nav a[href$="/gifts/last-minute"]`).first()).toBeAttached();
  }
  for (const path of ["/gifts/not-a-page", "/es/gifts/for-nobody", "/gifts/last-minute-ish"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});

test("an occasion page points to the gift pages by kind beside it", async ({ page }) => {
  await page.goto("/occasions/birthday");
  for (const slug of ["interactive-birthday-card", "virtual-birthday-cake", "last-minute"]) await expect(page.locator(`nav a[href="/gifts/${slug}"]`).first()).toBeAttached();
  await page.goto("/es/occasions/anniversary");
  await expect(page.locator('nav a[href="/es/gifts/anniversary-website"]').first()).toBeAttached();
});
