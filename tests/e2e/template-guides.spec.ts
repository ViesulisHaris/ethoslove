import { expect, test } from "@playwright/test";
import { TEMPLATE_GUIDES } from "../../src/content/template-guides";
import { TEMPLATE_STEPS } from "../../src/content/template-steps";

/**
 * A template page with a guide of its own (content/template-guides.ts): what people make with it,
 * the lines to borrow and the questions that are only true of that template, in both languages.
 * The words themselves are held to the templates' limits by tests/unit/template-guides.test.ts;
 * this is that they reach the page, and the page's structured data, whole. So the words come from
 * the guides themselves: a copy fix there must not have to be made here a second time.
 *
 * Since 21 Nov 2026 an idea is a quiet card that opens to its line (the owner: "it's SOOO MUCH
 * TEXT"), so this also holds that nothing was lost by closing it: every line, every answer and
 * what to do with each idea is in the document for a search engine, opened or not.
 */
function fromGuide(slug: string, locale: "en" | "es") {
  const guide = TEMPLATE_GUIDES[slug][locale];
  // A question that is on the page whatever the build's switches say.
  const { q, a } = guide.faq.findLast((f) => !f.whileFreeNote && f.notePhotos === undefined)!;
  const first = guide.ideas.items[0];
  const steps = TEMPLATE_STEPS[slug].steps.map((step) => step[locale]);
  return { slug, steps, title: guide.ideas.title, ideas: guide.ideas.items.length, heading: first.heading, how: first.how, line: first.borrow.line, question: q, answer: a };
}

const PAGES = [
  { path: "/templates/the-letter", ...fromGuide("the-letter", "en") },
  { path: "/es/templates/nice-list", ...fromGuide("nice-list", "es") },
];

for (const p of PAGES) {
  test(`${p.path} shows what people make with it, a line to borrow and its own questions`, async ({ page }) => {
    await page.goto(p.path);
    // How to send: three steps, numbered because they are an order, and this gift's own (content/template-steps.ts).
    await expect(page.locator("section[aria-labelledby=template-how] ol > li")).toHaveCount(3);
    await expect(page.locator("section[aria-labelledby=template-how] ol > li h3")).toHaveText(p.steps);

    const guide = page.locator("section[aria-labelledby=template-guide]");
    await expect(guide.getByRole("heading", { level: 2, name: p.title })).toBeVisible();
    // Every idea is a card; its line to borrow is in the document, and shows when the card is opened.
    const cards = guide.locator(`#ideas-${p.slug} > li`);
    await expect(cards).toHaveCount(p.ideas);
    const card = cards.filter({ hasText: p.heading });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(p.line);
    const line = card.getByText(p.line, { exact: true });
    await expect(line).toBeHidden();
    await card.locator("summary").click();
    await expect(line).toBeVisible();
    await card.locator("summary").click();
    await expect(line).toBeHidden();
    // "See more examples" opens them all, and closes them again.
    const all = guide.getByRole("button", { expanded: false });
    await all.click();
    await expect(guide.locator("details[open]")).toHaveCount(p.ideas);
    await expect(line).toBeVisible();
    await guide.getByRole("button", { expanded: true }).click();
    await expect(guide.locator("details[open]")).toHaveCount(0);

    const questions = page.locator("section[aria-labelledby=template-questions]");
    // Its own question opens on a tap, and the answer is in the document either way, for a search engine.
    const question = questions.locator("details").filter({ hasText: p.question });
    await expect(question).toHaveCount(1);
    await expect(question.locator("p")).toHaveText(p.answer);
    await expect(question.locator("p")).toBeHidden();
    await question.locator("summary").click();
    await expect(question.locator("p")).toBeVisible();
    // What to do with each idea left the cards; it is in the one closed block under the questions.
    const more = questions.locator("details[data-more-about]");
    await expect(more).toHaveCount(1);
    await expect(more).toContainText(p.how);
    await expect(more.getByText(p.how)).toBeHidden();

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
  const questions = page.locator("section[aria-labelledby=template-questions]");
  // The page's own "Is it free?" is written from the same switch (lib/gift/free-tier.ts), so the two can be compared on any server.
  const free = questions.locator("details").filter({ hasText: "Is it free?" });
  await expect(free).toHaveCount(1);
  const note = ((await free.locator("p").textContent()) ?? "").includes("as a short note");
  await expect(questions.locator("details").filter({ hasText: "Can I add photos to a free love letter?" })).toHaveCount(note ? 1 : 0);
  await expect(questions.locator("details").filter({ hasText: "How long is 500 characters?" })).toHaveCount(note ? 1 : 0);
  // The questions that don't depend on it are always there.
  await expect(questions.locator("details").filter({ hasText: "What date does the letter show?" })).toHaveCount(1);
});

test("The Letter's steps are a letter's: nothing about photos, and its own cover in the phone that sends it", async ({ page }) => {
  // The owner, 21 Nov 2026: "change the ways when to send the gifts, as its kinda weird for letter".
  await page.goto("/templates/the-letter");
  const steps = page.locator("section[aria-labelledby=template-how] ol > li");
  await expect(steps.locator("h3")).toHaveText(["Write the letter", "Seal and sign it", "Send the link"]);
  await expect(page.locator("section[aria-labelledby=template-how]")).not.toContainText(/photo/i);
  // Two note cards with a line each in handwriting, and no polaroid.
  await expect(steps.locator("[data-decor=step-note]")).toHaveCount(2);
  await expect(steps.locator("[data-decor=step-photo]")).toHaveCount(0);
  const notes = await steps.locator("[data-decor=step-note]").allInnerTexts();
  expect(notes.every((line) => line.trim().length >= 8)).toBe(true);
  expect(new Set(notes).size).toBe(2);
  // The last picture is the small phone with The Letter's own cover under its rim.
  const phone = steps.nth(2).locator("[data-decor=step-phone]");
  await phone.scrollIntoViewIfNeeded();
  await expect(phone.locator("img")).toHaveCount(3);
  expect(await phone.locator("img").nth(1).getAttribute("src")).toContain(encodeURIComponent("/templates/the-letter/poster.jpg"));
  expect(await phone.locator("img").nth(2).getAttribute("src")).toContain("step-phone-bezel");
});

test("a gift with no questions of its own still has its six cards, its own steps and the shared questions", async ({ page }) => {
  await page.goto("/templates/vinyl");
  const vinyl = TEMPLATE_GUIDES.vinyl.en;
  expect(vinyl.faq).toHaveLength(0);
  const guide = page.locator("section[aria-labelledby=template-guide]");
  await expect(guide.locator("#ideas-vinyl > li")).toHaveCount(6);
  await expect(guide.locator("#ideas-vinyl > li").first()).toContainText(vinyl.ideas.items[0].heading);
  const steps = page.locator("section[aria-labelledby=template-how] ol > li");
  await expect(steps.locator("h3")).toHaveText(TEMPLATE_STEPS.vinyl.steps.map((step) => step.en));
  // A step about photos shows the gift's own sample photo in the polaroid.
  await expect(steps.locator("[data-decor=step-photo] img")).toHaveCount(2);
  const questions = page.locator("section[aria-labelledby=template-questions]");
  // The three shared questions, one open at a time, and the closed block with what to do for each card.
  await expect(questions.locator("details[name]")).toHaveCount(3);
  await expect(questions.locator("details[data-more-about]")).toContainText(vinyl.ideas.items[0].how);
});
