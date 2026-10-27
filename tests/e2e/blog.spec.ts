import { expect, test, type Page } from "@playwright/test";

/**
 * The blog: its index and each post, in both languages. The routine that writes the posts publishes
 * without anyone reading them first, and a merge once dropped the blog's own labels (the pages showed
 * MISSING_MESSAGE), so these pages need a guard of their own: they load, they're labelled, the
 * template cards keep their posters' shape, and nothing is wider than a phone.
 */

const POSTS = ["halloween-ideas-for-couples", "long-distance-birthday-ideas-for-boyfriend"];

/** Fails the test on any uncaught error in the page. */
function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return () => expect(errors, errors.join("\n")).toEqual([]);
}

/** No raw message key, placeholder or leftover mark in what a reader sees. */
async function readsClean(page: Page) {
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/MISSING_MESSAGE|\bblog\.[a-zA-Z]+\b|\{minutes\}|\bundefined\b|\*\*|\]\(\//);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
}

const LANGS = [
  { prefix: "", title: "What to write, make and send", takeaways: "Key takeaways", faq: "Questions people ask", make: "Make this gift" },
  { prefix: "/es", title: "Qué escribir, qué hacer y qué enviar", takeaways: "Lo esencial", faq: "Preguntas frecuentes", make: "Hacer este regalo" },
];

for (const lang of LANGS) {
  test.describe(`the blog${lang.prefix ? ` in ${lang.prefix}` : ""}`, () => {
    test("lists every post, each card a link to it", async ({ page }) => {
      const noErrors = watchErrors(page);
      await page.goto(`${lang.prefix}/blog`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(lang.title);
      // The cards are the page's sections: h2 under the h1.
      const cards = page.locator("article").getByRole("heading", { level: 2 });
      await expect(cards).toHaveCount(POSTS.length);
      for (const slug of POSTS) await expect(page.locator(`article a[href="${lang.prefix}/blog/${slug}"]`)).toHaveCount(1);
      await readsClean(page);
      noErrors();
    });

    for (const slug of POSTS) {
      test(`${slug}: labelled, with its takeaways, questions and template cards`, async ({ page }) => {
        const noErrors = watchErrors(page);
        const response = await page.goto(`${lang.prefix}/blog/${slug}`);
        expect(response?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", lang.prefix ? "es" : "en");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.getByRole("heading", { level: 2, name: lang.takeaways })).toBeVisible();
        await expect(page.getByRole("heading", { level: 2, name: lang.faq })).toBeAttached();

        const make = page.getByRole("link", { name: lang.make });
        expect(await make.count()).toBeGreaterThan(0);
        await expect(make.first()).toHaveAttribute("href", new RegExp(`^${lang.prefix}/create/[a-z-]+$`));
        // A template card's poster keeps the poster's shape (390:600) instead of stretching to the
        // card's height.
        const poster = page.getByTestId("blog-template-poster").first();
        await poster.scrollIntoViewIfNeeded();
        const box = await poster.boundingBox();
        expect(box).not.toBeNull();
        expect(Math.abs(box!.height / box!.width - 600 / 390)).toBeLessThan(0.05);

        await readsClean(page);
        noErrors();
      });
    }
  });
}

test("an unknown post is a 404, in both languages", async ({ page }) => {
  for (const path of ["/blog/not-a-post", "/es/blog/not-a-post"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});

test("the footer links to the blog", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("footer").getByRole("link", { name: "Blog", exact: true })).toHaveAttribute("href", "/blog");
  await page.goto("/es");
  await expect(page.locator("footer").getByRole("link", { name: "Blog", exact: true })).toHaveAttribute("href", "/es/blog");
});
