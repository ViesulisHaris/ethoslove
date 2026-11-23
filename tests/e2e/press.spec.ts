import { expect, test, type Page } from "@playwright/test";

/**
 * /press, "Ethos in numbers" (docs/marketing/growth-build/PLAN-partners.md). Two modes, told apart
 * by the variable the dev server reads: without PRESS_PREVIEW the committed snapshot is not filled
 * in, so the page must be a 404 that nothing points at; with PRESS_PREVIEW=1 a dev server shows
 * the invented sample, and the page must be whole in both languages. Playwright reuses a server
 * already on the port: stop it between the two modes.
 *
 * English first, then Spanish, in every test: a visit in Spanish is remembered.
 */
const PREVIEW = process.env.PRESS_PREVIEW === "1";

/** Page errors and console errors, collected from before the first visit. */
function errorsOf(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  return errors;
}

test.describe("while the figures are not in", () => {
  test.skip(PREVIEW, "the dev server is showing sample figures");

  test("O1 the page is a 404 in both languages, the site's own", async ({ page }) => {
    for (const where of ["/press", "/es/press"]) {
      const response = await page.goto(where);
      expect(response?.status(), `${where}: a dev server started with PRESS_PREVIEW=1 is still on this port: stop it`).toBe(404);
      await expect(page.getByText("404").first()).toBeVisible();
    }
  });

  test("O2 nothing points at it: no link on the site, not the sitemap, not llms.txt", async ({ page, request }) => {
    for (const where of ["/", "/es"]) {
      await page.goto(where);
      await expect(page.locator('a[href$="/press"]'), where).toHaveCount(0);
    }
    expect(await (await request.get("/sitemap.xml")).text()).not.toContain("/press<");
    const llms = await (await request.get("/llms.txt")).text();
    expect(llms).not.toContain("/press");
    expect(llms).not.toContain("Ethos in numbers");
  });
});

test.describe("with figures in (the sample)", () => {
  test.skip(!PREVIEW, "needs a dev server started with PRESS_PREVIEW=1");

  test("V1 the page stands in both languages, titled for a writer, with the brand line over its heading", async ({ page }) => {
    const errors = errorsOf(page);
    const cases = [
      { where: "/press", title: "Ethos in numbers: facts, figures and pictures for the press", h1: "Ethos in numbers", maker: "Digital cards by Tryethos", canonical: "/press" },
      { where: "/es/press", title: "Ethos en cifras: datos, números e imágenes para la prensa", h1: "Ethos en cifras", maker: "Tarjetas digitales de Tryethos", canonical: "/es/press" },
    ];
    for (const c of cases) {
      const response = await page.goto(c.where);
      expect(response?.status(), `${c.where}: start the dev server with PRESS_PREVIEW=1`).toBe(200);
      await expect(page).toHaveTitle(c.title);
      expect(await page.title()).not.toContain("Tryethos");
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText(c.h1);
      await expect(page.locator("[data-maker]")).toHaveText(c.maker);
      // Here, and the footer's signature: nowhere else.
      await expect(page.getByText(c.maker, { exact: true })).toHaveCount(2);
      expect(await page.locator("link[rel=canonical]").getAttribute("href")).toMatch(new RegExp(`${c.canonical.replace("/", "\\/")}$`));
      expect(await page.locator("link[rel=alternate][hreflang=es]").getAttribute("href")).toMatch(/\/es\/press$/);
      expect(await page.locator("meta[name=robots]").getAttribute("content")).toContain("noindex");
      await expect(page.locator("[data-press-sample]")).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test("V2 every figure says what it is, what it counts, and the day it was counted", async ({ page }) => {
    await page.goto("/press");
    await expect(page.locator("[data-figure]")).toHaveCount(7);
    const values = { cardsMade: "21,000+", cardsOpened: "15,000+", opensEach: "3.2", openedAgain: "61%", onPhone: "88%", countries: "64", reminder: "48%" };
    for (const [id, value] of Object.entries(values)) {
      const figure = page.locator(`[data-figure="${id}"]`);
      await expect(figure.locator("[data-value]")).toHaveText(value);
      expect((await figure.locator("dt").textContent())?.trim(), id).not.toBe("");
      const counts = (await figure.locator("[data-counts]").textContent())?.trim() ?? "";
      expect(counts, id).not.toBe("");
      expect(counts.split(/\s+/).length, id).toBeLessThanOrEqual(12);
    }
    await expect(page.locator('time[datetime="2026-11-20"]')).toHaveText("Counted on 20 November 2026.");
  });

  test("V3 the five most-made gifts are there in order, each a picture that arrived, its name, its share and a way to its page", async ({ page, isMobile }) => {
    await page.goto("/press");
    const row = page.locator("#press-most-made");
    expect(await row.evaluate((el) => el.tagName)).toBe("OL");
    const cards = page.locator("#press-most-made > li");
    await expect(cards).toHaveCount(5);
    await expect(cards.locator("[data-card-title]")).toHaveText(["The Letter", "Bouquet", "Jar of Reasons", "Scratch Card", "Constellations"]);
    await expect(cards.locator("[data-share]")).toHaveText(["32%", "11%", "8%", "6%", "5%"]);
    const hrefs = await cards.locator("a").evaluateAll((links) => links.map((a) => a.getAttribute("href")));
    expect(hrefs).toEqual(["the-letter", "bouquet", "jar-of-reasons", "scratch-card", "constellations"].map((s) => `/templates/${s}`));
    await row.scrollIntoViewIfNeeded();
    for (let i = 0; i < 5; i++) {
      const img = cards.nth(i).locator("img");
      if (isMobile) await cards.nth(i).evaluate((card) => card.parentElement!.scrollTo({ left: (card as HTMLElement).offsetLeft, behavior: "instant" }));
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { timeout: 15_000 }).toBe(true);
    }
  });

  test("V4 search engines read one company, which also goes by Tryethos, and no dataset", async ({ page }) => {
    await page.goto("/press");
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join("\n");
    expect(ld).toContain('"@type":"Organization"');
    expect(ld).toContain('"alternateName":["Ethos Love","Tryethos"]');
    expect(ld).toContain('"@type":"WebPage"');
    expect(ld).toContain('"dateModified":"2026-11-20"');
    expect(ld).toContain('"@type":"BreadcrumbList"');
    expect(ld).not.toContain("Dataset");
  });

  test("V5 the way to reach the team, the logo, and the closed questions", async ({ page, request }) => {
    await page.goto("/press");
    const mails = page.locator('[data-page-theme] a[href^="mailto:"]');
    await expect(mails).toHaveCount(2);
    for (const href of await mails.evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""))) {
      expect(href.startsWith("mailto:support@")).toBe(true);
      expect(href).toContain("subject=Press");
    }
    const logo = page.locator("a[download]");
    await expect(logo).toHaveCount(1);
    const file = await request.get((await logo.getAttribute("href"))!);
    expect(file.status()).toBe(200);
    expect(file.headers()["content-type"]).toMatch(/^image\/png/);

    const details = page.locator("section:has(#press-method) details");
    await expect(details).toHaveCount(4);
    for (let i = 0; i < 4; i++) expect(await details.nth(i).evaluate((d: HTMLDetailsElement) => d.open)).toBe(false);
    await details.nth(1).locator("summary").click();
    await expect(details.nth(1).locator("p")).toBeVisible();
    await expect(details.nth(1).locator("p")).toContainText("ten minutes");
    await details.nth(0).locator("summary").click();
    await expect.poll(() => details.nth(1).evaluate((d: HTMLDetailsElement) => d.open)).toBe(false);

    const contact = page.locator("#contact");
    expect(await contact.locator('a[href="/about"]').count()).toBe(1);
    const profiles = contact.locator('a[target="_blank"]');
    await expect(profiles).toHaveCount(4);
    const found = await profiles.evaluateAll((links) => links.map((a) => ({ href: a.getAttribute("href") ?? "", rel: a.getAttribute("rel") ?? "" })));
    ["etsy.com", "pinterest.com", "tiktok.com", "youtube.com"].forEach((host, i) => {
      expect(found[i]!.href).toContain(host);
      expect(found[i]!.rel).toContain("noopener");
    });
  });

  test("V6 in Spanish, all of it", async ({ page }) => {
    await page.goto("/press");
    await page.goto("/es/press");
    await expect(page.locator('[data-figure="cardsMade"] [data-value]')).toHaveText("21.000+");
    await expect(page.locator('[data-figure="cardsOpened"] [data-value]')).toHaveText("15.000+");
    await expect(page.locator('[data-figure="opensEach"] [data-value]')).toHaveText("3,2");
    for (const id of ["openedAgain", "onPhone", "reminder"]) await expect(page.locator(`[data-figure="${id}"] [data-value]`)).toHaveText(/^\d+\s?%$/);
    await expect(page.locator("time")).toHaveText("Contado el 20 de noviembre de 2026.");
    const button = page.getByRole("link", { name: "Escríbenos" });
    await expect(button).toBeVisible();
    expect(await button.getAttribute("href")).toContain("subject=Prensa");
    await expect(page.locator("#press-most-made > li").first().locator("[data-card-title]")).toHaveText("La carta");
    expect(await page.locator("#press-most-made > li a").first().getAttribute("href")).toBe("/es/templates/the-letter");
    await expect(page.locator("details[name=press-faq] summary").first()).toHaveText("¿Qué cuenta como una tarjeta hecha?");
    const text = await page.locator("[data-page-theme]").innerText();
    for (const english of ["cards made", "Write to us", "Most made"]) expect(text).not.toContain(english);
  });

  test("V7 by keyboard alone", async ({ page, isMobile }) => {
    test.skip(isMobile, "a keyboard is a desk's");
    await page.goto("/press");
    const order = ["Write to us", "The Letter", "Bouquet", "Jar of Reasons", "Scratch Card", "Constellations", "Download the logo", "See every template", "What counts as a card made?", "What counts as an open?", "May I use the numbers and the pictures?", "Can I try a paid template?", "support@", "About Ethos", "Etsy", "Pinterest", "TikTok", "YouTube"];
    let at = 0;
    for (let i = 0; i < 120 && at < order.length; i++) {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || !el.closest("[data-page-theme]")) return null;
        const cs = getComputedStyle(el);
        return { text: (el.textContent ?? "").trim(), outline: cs.outlineStyle !== "none" && cs.outlineWidth !== "0px" };
      });
      if (!focused) continue;
      expect(focused.text.startsWith(order[at]!), `focus ${at}: expected “${order[at]}”, got “${focused.text.slice(0, 40)}”`).toBe(true);
      expect(focused.outline, `${focused.text.slice(0, 30)} has no visible focus`).toBe(true);
      if (order[at] === "What counts as a card made?") {
        await page.keyboard.press("Enter");
        await expect(page.locator("details[name=press-faq]").first()).toHaveJSProperty("open", true);
      }
      at++;
    }
    expect(at).toBe(order.length);
  });
});
