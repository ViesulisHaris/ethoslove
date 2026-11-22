import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { TEMPLATE_GUIDES } from "@/content/template-guides";
import { TEMPLATE_LEADS } from "@/content/template-leads";
import { templateSeo } from "@/content/template-seo";
import { TEMPLATE_STEPS } from "@/content/template-steps";
import { TEMPLATE_MANIFESTS } from "@/templates/manifests";

/**
 * One kind of apostrophe and one kind of quotation mark on a gift's page. The page sets its words
 * large and in a display face, where a typewriter's straight ' next to a curly ’ shows: the deep
 * test of 21 Nov 2026 found them mixed at heading size, and the confirming test of 22 Nov 2026
 * found the one that was left, "Links don't expire", in an answer every English page shares.
 * So every word the page can show is read here, wherever it is kept: the page's own lines in
 * messages/*.json, each gift's name, tagline and description, its steps, its cards and questions,
 * and the names its editor gives its fields and their choices.
 */
const LOCALES = ["en", "es"] as const;
type Locale = (typeof LOCALES)[number];

/** Every string under a value, with the path that leads to it. */
function strings(value: unknown, path: string): [string, string][] {
  if (typeof value === "string") return [[path, value]];
  if (value && typeof value === "object") return Object.entries(value).flatMap(([key, inner]) => strings(inner, `${path}.${key}`));
  return [];
}

/** The lines of messages/*.json a gift's page shows (templates/[slug]/page.tsx and components/templates/page). */
function pageMessages(messages: typeof en): [string, string][] {
  const t = messages.templates as Record<string, unknown>;
  const own = Object.keys(t).filter((key) => /^(feature|included|pagePrice|noteLead$|style$|makeThis$|fullscreenDemo$|tryDemo$|liveDemo$|closeDemo$|pausePreview$|playPreview$|guide$)/.test(key));
  return [
    ...own.flatMap((key) => strings(t[key], `templates.${key}`)),
    ...strings(messages.common.free, "common.free"),
    ...strings(messages.common.premium, "common.premium"),
    ...(["title", "message", "recipientName", "senderName"] as const).flatMap((key) => strings(messages.editor.fields[key], `editor.fields.${key}`)),
    ...strings(messages.editor.photos.caption, "editor.photos.caption"),
  ];
}

/** A gift's own words in a language, from everywhere the page reads them. */
async function giftWords(slug: string, l: Locale): Promise<[string, string][]> {
  const m = TEMPLATE_MANIFESTS.find((x) => x.slug === slug)!;
  const seo = templateSeo(slug, l);
  const meta = ((await import(`../../src/templates/${slug}/field-meta.ts`).catch(() => ({ fieldMeta: { en: {}, es: {} } }))) as { fieldMeta: Record<string, Record<string, { label: string; options?: Record<string, string> }>> }).fieldMeta[l] ?? {};
  return [
    [`${slug} name`, m.name[l]],
    [`${slug} tagline`, m.tagline[l]],
    [`${slug} description`, m.description[l]],
    ...strings(TEMPLATE_GUIDES[slug]?.[l], `${slug} guide`),
    ...strings(TEMPLATE_STEPS[slug]?.line[l], `${slug} steps.line`),
    ...(TEMPLATE_STEPS[slug]?.steps ?? []).flatMap((step, i) => [...strings(step[l], `${slug} steps.${i}`), ...strings(step.sample?.[l], `${slug} steps.${i}.sample`)]),
    ...strings(TEMPLATE_LEADS[slug]?.[l], `${slug} lead`),
    ...strings(seo?.keyword, `${slug} seo.keyword`),
    ...strings(seo?.howTo, `${slug} seo.howTo`),
    ...Object.entries(meta).flatMap(([key, field]) => [...strings(field.label, `${slug} field ${key}`), ...strings(field.options, `${slug} field ${key} options`)]),
  ];
}

describe("the type of a gift's page", () => {
  it("has no straight apostrophe or quotation mark in the page's own lines, in either language", () => {
    const off: string[] = [];
    for (const [l, messages] of [["en", en], ["es", es]] as const)
      for (const [path, text] of pageMessages(messages as typeof en)) if (/['"]/.test(text)) off.push(`${l} ${path}: ${text}`);
    expect(off).toEqual([]);
    // The one that was left on every English page.
    expect(en.templates.guide.faqEditA).toContain("Links don’t expire");
  });

  it("reads the lines the page shows: the price line, the checklist's heading, the questions", () => {
    const paths = pageMessages(en).map(([path]) => path);
    for (const path of ["templates.included", "templates.includedSpecial", "templates.pagePricePaid", "templates.featurePhotos", "templates.tryDemo", "templates.guide.faqEditA", "templates.guide.step2Body", "templates.guide.madeForDay.valentines", "templates.style.romantic"]) expect(paths, path).toContain(path);
  });

  it("has none in any gift's own words either: its name, lines, steps, cards, questions and field names", async () => {
    const off: string[] = [];
    let read = 0;
    for (const m of TEMPLATE_MANIFESTS)
      for (const l of LOCALES)
        for (const [path, text] of await giftWords(m.slug, l)) {
          read += 1;
          if (/['"]/.test(text)) off.push(`${l} ${path}: ${text}`);
        }
    expect(off).toEqual([]);
    // Every gift, both languages: a name, two lines, three steps, six cards of three lines each, at the least.
    expect(read).toBeGreaterThan(TEMPLATE_MANIFESTS.length * 2 * 20);
  });

  it("Spanish pages quote with « » only, as the rest of the Spanish site does", async () => {
    const off: string[] = [];
    for (const [path, text] of pageMessages(es as unknown as typeof en)) if (/[“”]/.test(text)) off.push(`${path}: ${text}`);
    for (const m of TEMPLATE_MANIFESTS) for (const [path, text] of await giftWords(m.slug, "es")) if (/[“”]/.test(text)) off.push(`${path}: ${text}`);
    expect(off).toEqual([]);
  });
});
