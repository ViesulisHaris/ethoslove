import { expect, test } from "@playwright/test";
import { TEMPLATE_GUIDES } from "../../src/content/template-guides";

/**
 * A template page with a guide of its own (content/template-guides.ts): what people make with it,
 * the lines to borrow and the questions that are only true of that template, in both languages.
 * The words themselves are held to the templates' limits by tests/unit/template-guides.test.ts;
 * this is that they reach the page, and the page's structured data, whole. So the words come from
 * the guides themselves: a copy fix there must not have to be made here a second time.
 */
function fromGuide(slug: string, locale: "en" | "es") {
  const guide = TEMPLATE_GUIDES[slug][locale];
  // A question that is on the page whatever the build's switches say.
  const { q, a } = guide.faq.findLast((f) => !f.whileFreeNote && f.notePhotos === undefined)!;
  return { title: guide.ideas.title, ideas: guide.ideas.items.length, line: guide.ideas.items[0].borrow![0].line, question: q, answer: a };
}

const PAGES = [
  { path: "/templates/the-letter", ...fromGuide("the-letter", "en") },
  { path: "/es/templates/nice-list", ...fromGuide("nice-list", "es") },
];

for (const p of PAGES) {
  test(`${p.path} shows what people make with it, a line to borrow and its own questions`, async ({ page }) => {
    await page.goto(p.path);
    const guide = page.locator("section[aria-labelledby=template-guide]");
    await expect(guide.getByRole("heading", { level: 2, name: p.title })).toBeVisible();
    // The three steps, then the ideas: two numbered lists, every idea in the second.
    const lists = guide.locator("ol");
    await expect(lists).toHaveCount(2);
    await expect(lists.nth(1).locator("> li")).toHaveCount(p.ideas);
    await expect(lists.nth(1)).toContainText(p.line);

    // Its own question opens on a tap, and the answer is in the document either way, for a search engine.
    const question = guide.locator("details").filter({ hasText: p.question });
    await expect(question).toHaveCount(1);
    await expect(question.locator("p")).toHaveText(p.answer);
    await expect(question.locator("p")).toBeHidden();
    await question.locator("summary").click();
    await expect(question.locator("p")).toBeVisible();

    // The same question and answer are in the page's FAQPage data.
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((text) => JSON.stringify(JSON.parse(text))).join("\n");
    expect(ld).toContain('"@type":"FAQPage"');
    expect(ld).toContain(JSON.stringify(p.question));
    expect(ld).toContain(JSON.stringify(p.answer));

    // Nothing on the page is wider than the screen.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test("The Letter answers about the free note only while the page says the free version is the note", async ({ page }) => {
  await page.goto("/templates/the-letter");
  const guide = page.locator("section[aria-labelledby=template-guide]");
  // The page's own "Is it free?" is written from the same switch (lib/gift/free-tier.ts), so the two can be compared on any server.
  const free = guide.locator("details").filter({ hasText: "Is it free?" });
  await expect(free).toHaveCount(1);
  const note = ((await free.locator("p").textContent()) ?? "").includes("as a short note");
  await expect(guide.locator("details").filter({ hasText: "Can I add photos to a free love letter?" })).toHaveCount(note ? 1 : 0);
  await expect(guide.locator("details").filter({ hasText: "How long is 500 characters?" })).toHaveCount(note ? 1 : 0);
  // The questions that don't depend on it are always there.
  await expect(guide.locator("details").filter({ hasText: "What date does the letter show?" })).toHaveCount(1);
});

test("a template with no guide of its own keeps the three steps and the shared questions", async ({ page }) => {
  await page.goto("/templates/vinyl");
  const guide = page.locator("section[aria-labelledby=template-guide]");
  await expect(guide.locator("ol")).toHaveCount(1);
  await expect(guide.locator("details")).toHaveCount(3);
});
