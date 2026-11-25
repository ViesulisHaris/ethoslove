import { describe, expect, it } from "vitest";
import { DEMO_MARKS, PAGE_ABOUT, demoFits, type DemoMark } from "@/content/demo-occasions";
import { GIFT_GUIDES, GIFT_GUIDE_SLUGS, GUIDE_BAND_COVERS, type GiftGuideSlug } from "@/content/gift-guides";
import { MONTHS, MONTH_GUIDES, monthNeighbours } from "@/content/month-anniversaries";
import { TEMPLATE_SLUGS } from "@/templates/manifests";
import { DEMO_PHOTOS } from "@/templates/_shared/demo-photos";

/*
 * A poster, a hero or a band on an anniversary or a couple's page never shows a gift made for another
 * relationship or another occasion (the lead, 25 Nov 2026, after the confirming test found Museum's
 * "DANI → MAMÁ" leading month 18 and Unwrapped's Christmas table leading month 12: gifts2-N1, N2).
 * A template's demo is what it is and is never edited, so the page picks another template.
 */

// The words a demo uses when it is made for one of these. Read from every string in the demo, both
// languages: the names on it, the title, the message, the fields, the countdown and the P.S.
const SAYS: Record<Exclude<DemoMark, "parent" | "friends">, RegExp> = {
  birthday: /happy birthday|feliz cumpleaños|\bturns \d+|\bcumple \d+|\bcumples \d+|\byou['’]re \d+/i,
  christmas: /\bchristmas\b|\bnavidad\b/i,
  proposal: /\bmarry me\b|cásate conmigo|casarte conmigo/i,
  apology: /\bI['’]m sorry\b|\blo siento\b|\bperdóname\b|\bforgive me\b/i,
  halloween: /halloween|\bpumpkins?\b|\bcalabazas?\b|\bspooky\b/i,
  thanksgiving: /thanksgiving|acción de gracias|\bthankful\b/i,
  graduation: /\bgraduat|\bgraduaci/i,
};
// A flag or a choice named for the occasion (Digicam's `birthday: true`, Balloons' "birthday" look).
const CHOSEN: Partial<Record<DemoMark, string>> = { birthday: "birthday" };
const PARENT = /^(mum|mom|mam[aá]|mother|madre|dad|pap[aá]|father|padre|grandma|grandpa|abuel[ao])$/i;

// The sample photos are shared by every demo (a birthday cake among them), so their default words say nothing of one demo.
const SHARED = new Set<string>(Object.values(DEMO_PHOTOS).flatMap((photo) => [photo.alt, photo.caption]));
const SKIP = new Set(["templateSlug", "url", "src", "poster", "trackId"]);

function strings(value: unknown, chosen: string[]): string[] {
  if (typeof value === "string") return SHARED.has(value) ? [] : [value];
  if (Array.isArray(value)) return value.flatMap((v) => strings(v, chosen));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, v]) => {
      if (SKIP.has(key)) return [];
      if (v === true) chosen.push(key);
      if (typeof v === "string") chosen.push(v);
      return strings(v, chosen);
    });
  }
  return [];
}

async function marksOf(slug: string): Promise<DemoMark[]> {
  const { template } = await import(`../../src/templates/${slug}/index.ts`);
  const marks = new Set<DemoMark>();
  for (const demo of Object.values(template.demoData) as { recipientName?: string; senderName?: string; fields?: { age?: unknown } }[]) {
    const chosen: string[] = [];
    const text = strings(demo, chosen).join("\n");
    for (const [mark, words] of Object.entries(SAYS) as [DemoMark, RegExp][]) if (words.test(text)) marks.add(mark);
    for (const [mark, value] of Object.entries(CHOSEN) as [DemoMark, string][]) if (chosen.includes(value)) marks.add(mark);
    for (const name of [demo.recipientName, demo.senderName]) {
      if (name && PARENT.test(name.trim())) marks.add("parent");
    }
    if (demo.recipientName && /\s(&|y|and)\s/.test(demo.recipientName)) marks.add("friends");
    // An age to celebrate is a birthday, whatever the words around it (Party Animals draws "HAPPY BIRTHDAY" and the number).
    if (typeof demo.fields?.age === "number") marks.add("birthday");
  }
  return [...marks].sort();
}

/** Every picture a month page shows: the phone (its first gift), every card, the band (its second), the months either side. */
function monthPictures(n: number): { where: string; template: string }[] {
  const ideas = MONTH_GUIDES[n].en.ideas;
  return [
    { where: "phone", template: ideas[0].template },
    ...ideas.map((idea, i) => ({ where: `card ${i + 1}`, template: idea.template })),
    { where: "band", template: ideas[1].template },
    ...monthNeighbours(n).map((m) => ({ where: `the poster for month ${m}`, template: MONTH_GUIDES[m].en.ideas[0].template })),
  ];
}

const NAMED = ["apology-for-him", "apology-for-her", "long-distance-care-package", "surprise", "memory-book"] as const satisfies readonly GiftGuideSlug[];
const lead = (slug: GiftGuideSlug) => GIFT_GUIDES[slug].en.film ?? GIFT_GUIDES[slug].en.ideas[0].template;

/** As the page draws its posters ([slug]/page.tsx, KindPage): the other kinds from its own place round, the first four that fit. */
function kindPosters(kind: GiftGuideSlug): GiftGuideSlug[] {
  const at = GIFT_GUIDE_SLUGS.indexOf(kind);
  const about = PAGE_ABOUT[kind];
  return [...GIFT_GUIDE_SLUGS.slice(at + 1), ...GIFT_GUIDE_SLUGS.slice(0, at)].filter((slug) => !about || demoFits(lead(slug), about)).slice(0, 4);
}

describe("what a template's demo is made for", () => {
  it("is listed in content/demo-occasions.ts exactly as the demos' own data says", async () => {
    const derived: Record<string, DemoMark[]> = {};
    for (const slug of TEMPLATE_SLUGS) {
      const marks = await marksOf(slug);
      if (marks.length) derived[slug] = marks;
    }
    const listed = Object.fromEntries(Object.entries(DEMO_MARKS).map(([slug, marks]) => [slug, [...marks].sort()]));
    expect(listed).toEqual(derived);
  }, 60_000);

  it("names the demos the confirming test saw on these pages", () => {
    // A floor under the derivation: if a regular expression above stops matching, these still have to be found.
    expect(DEMO_MARKS.museum).toContain("parent");
    expect(DEMO_MARKS.bloom).toContain("parent");
    expect(DEMO_MARKS["recipe-box"]).toContain("parent");
    expect(DEMO_MARKS.unwrapped).toContain("christmas");
    expect(DEMO_MARKS.digicam).toContain("birthday");
    expect(DEMO_MARKS["front-page"]).toContain("birthday");
    expect(DEMO_MARKS["midnight-countdown"]).toContain("birthday");
    expect(DEMO_MARKS["the-toast"]).toContain("friends");
    expect(DEMO_MARKS["scratch-card"]).toContain("proposal");
  });
});

describe("no picture on a couple's page shows a gift made for someone or something else", () => {
  for (const n of MONTHS) {
    it(`month ${n}: the phone, every card, the band and the posters of the months either side`, () => {
      const wrong = monthPictures(n).filter(({ template }) => !demoFits(template, PAGE_ABOUT.month!)).map(({ where, template }) => `${where}: ${template} (${DEMO_MARKS[template]!.join(", ")})`);
      expect(wrong).toEqual([]);
    });
  }

  for (const slug of NAMED) {
    it(`/gifts/${slug}: the phone, every card, the band and the four posters of the other pages`, () => {
      const about = PAGE_ABOUT[slug];
      expect(about, slug).toBeDefined();
      const pictures = [
        { where: "phone", template: lead(slug) },
        ...GIFT_GUIDES[slug].en.ideas.map((idea, i) => ({ where: `card ${i + 1}`, template: idea.template })),
        // The band's phone shows The Letter's cover where the page names none (ExperienceFlatlay).
        { where: "band", template: GUIDE_BAND_COVERS[slug] ?? "the-letter" },
        ...kindPosters(slug).map((other) => ({ where: `the poster for /gifts/${other}`, template: lead(other) })),
      ];
      expect(kindPosters(slug)).toHaveLength(4);
      const wrong = pictures.filter(({ template }) => !demoFits(template, about!)).map(({ where, template }) => `${where}: ${template} (${DEMO_MARKS[template]!.join(", ")})`);
      expect(wrong).toEqual([]);
    });
  }

  it("the Spanish pages show the same gifts as the English ones", () => {
    for (const n of MONTHS) expect(MONTH_GUIDES[n].es.ideas.map((i) => i.template), String(n)).toEqual(MONTH_GUIDES[n].en.ideas.map((i) => i.template));
    for (const slug of NAMED) expect(GIFT_GUIDES[slug].es.ideas.map((i) => i.template), slug).toEqual(GIFT_GUIDES[slug].en.ideas.map((i) => i.template));
  });
});
