import { expect, test, type APIRequestContext } from "@playwright/test";
import { parseDocument } from "htmlparser2";
import type { AnyNode, Element } from "domhandler";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { OCCASIONS, type Occasion } from "../../src/config/occasions";
import { OCCASION_GUIDES } from "../../src/content/occasions";
import { RECIPIENTS, RECIPIENT_GUIDES, recipientSlug } from "../../src/content/recipients";
import { DIGITAL_GIFT_GUIDE, DIGITAL_GIFT_IDEAS } from "../../src/content/digital-gifts";
import { GIFT_GUIDE_SLUGS } from "../../src/content/gift-guides";
import { templateSeo } from "../../src/content/template-seo";
import { listManifests } from "../../src/templates/manifests";

/**
 * The occasion pages, /gifts and the pages by person were made short to the eye (fix round 4, 24 Nov
 * 2026: the owner, "so google doesnt rewoke our things"): what a search engine reads must all still be
 * there. For each of the 21 pages in both languages, from the HTML the server sends, with no script
 * run: one h1 with the page's heading, its title, description, canonical and hreflang links, its
 * structured data with the same items, every link the page had, and every sentence of the page's own
 * text, in the page's language. A sentence the eye no longer sees is inside a closed <details>, never
 * hidden by a style alone: each idea's paragraph, each how-to and each answer is checked to be in one.
 * The before-and-after record of the same pages is docs/marketing/growth-build/reports/view-fix-4-seo.
 */

type Lang = { prefix: "" | "/es"; l: "en" | "es"; m: typeof en };
const LANGS: Lang[] = [
  { prefix: "", l: "en", m: en },
  { prefix: "/es", l: "es", m: es as unknown as typeof en },
];

const squash = (s: string) => s.replace(/\s+/g, "");
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

type Page = {
  html: string;
  doc: ReturnType<typeof parseDocument>;
  /** Every text of the page outside scripts and styles, run together without spaces (so a sentence across two elements is found). */
  text: string;
  links: Set<string>;
  ld: { "@type": string; [k: string]: unknown }[];
};

const isTag = (n: AnyNode): n is Element => n.type === "tag" || n.type === "script" || n.type === "style";

async function load(request: APIRequestContext, path: string): Promise<Page> {
  const res = await request.get(path);
  expect(res.status(), path).toBe(200);
  const html = await res.text();
  const doc = parseDocument(html);
  let text = "";
  const links = new Set<string>();
  const ld: Page["ld"] = [];
  const walk = (n: AnyNode) => {
    if (n.type === "text") text += n.data;
    if (!isTag(n)) return;
    if (n.name === "script") {
      if (n.attribs.type === "application/ld+json") {
        const json = JSON.parse((n.children[0] as { data?: string })?.data ?? "{}");
        ld.push(...(json["@graph"] ?? (Array.isArray(json) ? json : [json])));
      }
      return;
    }
    if (n.name === "style" || n.name === "noscript" || n.name === "template") return;
    if (n.name === "a" && n.attribs.href) links.add(decode(n.attribs.href));
    n.children.forEach(walk);
  };
  doc.children.forEach(walk);
  return { html, doc, text: squash(decode(text)), links, ld };
}

/** The text of the element that holds `needle`, and whether that element is inside a <details> (closed or not). */
function inDetails(page: Page, needle: string): boolean {
  const want = squash(needle);
  let found = false;
  const walk = (n: AnyNode, details: boolean) => {
    if (found || !isTag(n) || n.name === "script" || n.name === "style") return;
    const here = details || n.name === "details";
    // The innermost element whose own text holds the sentence.
    const own = squash(decode(n.children.filter((c) => c.type === "text").map((c) => (c as { data: string }).data).join("")));
    if (own.includes(want)) {
      found = here;
      if (found) return;
    }
    n.children.forEach((c) => walk(c, here));
  };
  page.doc.children.forEach((c) => walk(c, false));
  return found;
}

function head(page: Page) {
  const pick = (re: RegExp) => decode(page.html.match(re)?.[1] ?? "");
  return {
    title: pick(/<title>([^<]*)<\/title>/),
    description: pick(/<meta name="description" content="([^"]*)"/),
    canonical: pick(/<link rel="canonical" href="([^"]*)"/),
    hreflang: [...page.html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/gi)].map((m) => m[1]),
    h1: [...page.html.matchAll(/<h1[\s>]/g)].length,
  };
}

function expectText(page: Page, path: string, sentences: readonly string[]) {
  const missing = sentences.filter((s) => s && !page.text.includes(squash(s)));
  expect(missing, `${path}: sentences not in the HTML`).toEqual([]);
}

function expectLinks(page: Page, path: string, hrefs: readonly string[]) {
  const missing = hrefs.filter((h) => !page.links.has(h));
  expect(missing, `${path}: links not on the page`).toEqual([]);
}

function node(page: Page, type: string) {
  return page.ld.find((n) => n["@type"] === type) as { itemListElement?: { name: string; url?: string; item?: string }[]; mainEntity?: { name: string }[] } | undefined;
}

function expectHead(page: Page, path: string, title: string, description: string) {
  const h = head(page);
  expect(h.title, path).toContain(title);
  expect(h.description, path).toBe(description);
  expect(h.canonical, path).toMatch(new RegExp(`${path.replace(/\//g, "\\/")}$`));
  expect(new Set(h.hreflang), path).toEqual(new Set(["en", "es", "x-default"]));
  expect(h.h1, `${path}: one h1`).toBe(1);
}

for (const { prefix, l, m } of LANGS) {
  test.describe(`nothing a search engine reads is lost (${l})`, () => {
    for (const occasion of OCCASIONS as readonly Occasion[]) {
      test(`/occasions/${occasion}`, async ({ request }) => {
        const path = `${prefix}/occasions/${occasion}`;
        const page = await load(request, path);
        const seo = (m.seo.occasion as Record<string, { title: string; metaTitle?: string; description: string; intro: string }>)[occasion];
        const guide = OCCASION_GUIDES[occasion][l];
        expectHead(page, path, seo.metaTitle ?? seo.title, seo.description);
        const ideas = guide.ideas?.items ?? [];
        expectText(page, path, [seo.title, seo.intro, guide.title, guide.lead, guide.ideas?.title ?? "", ...ideas.flatMap((i) => [i.heading, i.body]), ...guide.sections.flatMap((s) => [s.heading, s.body]), ...guide.faq.flatMap((f) => [f.q, f.a])]);
        // What the eye no longer sees is in a closed row, never only behind a style.
        for (const hidden of [...ideas.map((i) => i.body), ...guide.sections.map((s) => s.body), ...guide.faq.map((f) => f.a), guide.lead]) expect(inDetails(page, hidden), `${path}: “${hidden.slice(0, 40)}” not in a <details>`).toBe(true);
        expectLinks(page, path, ideas.map((i) => `${prefix}/create/${i.template}`));
        expect(node(page, "FAQPage")?.mainEntity?.map((q) => q.name), path).toEqual(guide.faq.map((f) => f.q));
        expect(node(page, "BreadcrumbList")?.itemListElement?.length, path).toBe(3);
        expect(node(page, "ItemList")?.itemListElement?.length, path).toBeGreaterThan(0);
      });
    }

    for (const who of RECIPIENTS) {
      test(`/gifts/${recipientSlug(who)}`, async ({ request }) => {
        const path = `${prefix}/gifts/${recipientSlug(who)}`;
        const page = await load(request, path);
        const guide = RECIPIENT_GUIDES[who][l];
        expectHead(page, path, guide.title, guide.description);
        expectText(page, path, [guide.h1, guide.lead, ...guide.ideas.flatMap((i) => [i.heading, i.body]), ...guide.sections.flatMap((s) => [s.heading, s.body]), ...guide.faq.flatMap((f) => [f.q, f.a]), m.recipients.more, m.recipients.byKind]);
        for (const hidden of [...guide.ideas.map((i) => i.body), ...guide.sections.map((s) => s.body), ...guide.faq.map((f) => f.a), guide.lead]) expect(inDetails(page, hidden), `${path}: “${hidden.slice(0, 40)}” not in a <details>`).toBe(true);
        expectLinks(page, path, [
          ...guide.ideas.flatMap((i) => [`${prefix}/templates/${i.template}`, `${prefix}/create/${i.template}`]),
          ...RECIPIENTS.filter((r) => r !== who).map((r) => `${prefix}/gifts/${recipientSlug(r)}`),
          `${prefix}/occasions`,
          ...GIFT_GUIDE_SLUGS.map((s) => `${prefix}/gifts/${s}`),
        ]);
        const list = node(page, "ItemList")?.itemListElement ?? [];
        expect(list.map((i) => i.name), path).toEqual(guide.ideas.map((i) => i.heading));
        expect(node(page, "FAQPage")?.mainEntity?.map((q) => q.name), path).toEqual(guide.faq.map((f) => f.q));
        expect(node(page, "BreadcrumbList")?.itemListElement?.length, path).toBe(3);
      });
    }

    test("/gifts", async ({ request }) => {
      const path = `${prefix}/gifts`;
      const page = await load(request, path);
      const guide = DIGITAL_GIFT_GUIDE[l];
      const hero = m.home.hero;
      expect(head(page).h1, path).toBe(1);
      expect(page.text, path).toContain(squash(`${hero.eyebrow}${hero.h1a}${hero.h1b}${hero.h1c}`));
      const manifests = listManifests();
      const steps = m.home.how.steps;
      expectText(page, path, [
        hero.sub, hero.ctaNote, hero.caption,
        guide.title, guide.definition, guide.notACard, guide.ideasTitle, guide.ideasLead, guide.byWho, guide.byKind, guide.cards,
        ...guide.groups.map((g) => g.title),
        ...DIGITAL_GIFT_IDEAS.map((slug) => templateSeo(slug, l)?.keyword ?? ""),
        ...manifests.flatMap((mf) => [mf.name[l], mf.tagline[l]]),
        ...guide.faq.flatMap((f) => [f.q, f.a]),
        ...steps.flatMap((s) => [s.title, s.body]),
        m.home.templates.title, m.home.templates.blurb, m.home.openings.title, m.home.openings.blurb, m.home.occasions.title, m.home.occasions.blurb,
        m.pricing.title, m.pricing.subtitle, m.home.final.title, m.home.final.blurb,
        ...Object.values(hero.facts).map((f) => f.b),
      ]);
      for (const hidden of [guide.definition, guide.notACard, ...guide.faq.map((f) => f.a), ...steps.map((s) => s.body), m.pricing.subtitle, m.home.templates.blurb]) expect(inDetails(page, hidden), `${path}: “${hidden.slice(0, 40)}” not in a <details>`).toBe(true);
      expectLinks(page, path, [
        `${prefix}/templates`,
        `${prefix}/gifts/finder`,
        `${prefix}/demo/bouquet`,
        `${prefix}/digital-cards`,
        `${prefix}/occasions`,
        ...manifests.flatMap((mf) => [`${prefix}/templates/${mf.slug}`, `${prefix}/create/${mf.slug}`]),
        ...OCCASIONS.map((o) => `${prefix}/occasions/${o}`),
        ...RECIPIENTS.map((r) => `${prefix}/gifts/${recipientSlug(r)}`),
        ...GIFT_GUIDE_SLUGS.map((s) => `${prefix}/gifts/${s}`),
      ]);
      // /digital-cards' "Gifts by who it is for" lands here.
      expect(page.html, path).toMatch(/id="by-person"/);
      expect(node(page, "ItemList")?.itemListElement?.map((i) => i.name), path).toEqual(DIGITAL_GIFT_IDEAS.map((slug) => templateSeo(slug, l)?.keyword ?? slug));
      expect(node(page, "FAQPage")?.mainEntity?.map((q) => q.name), path).toEqual(guide.faq.map((f) => f.q));
      // The owner, 23 Nov 2026: "remove the 'sample reactions'". Made-up reactions are never on the page.
      for (const sample of ["Sample reactions", "Reacciones de muestra", "stairwell", "escaleras", "tent night", "noche de la tienda", "Marco → Ana", "Lo vi cuatro veces ya", "Ya lo vi cuatro veces"]) expect(page.html, `${path}: ${sample}`).not.toContain(sample);
    });
  });
}
