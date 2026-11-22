import { describe, expect, it } from "vitest";
import { OCCASIONS } from "@/config/occasions";
import { GIFT_LOCALES } from "@/lib/gift/schema";
import { OCCASION_GUIDES } from "@/content/occasions";
import { occasionCardLine } from "@/content/idea-cards";
import { OCCASION_IDEAS, SAMPLE_FIELDS, SAMPLE_FIELDS_ES, sampleFieldsOf, type ListedOccasion, type SampledOccasion } from "@/content/occasion-ideas";
import { fieldLimit } from "@/lib/gift/field-limit";
import { sendsFree } from "@/lib/gift/free-tier";
import { getManifest, listManifests } from "@/templates/manifests";

const words = (s: string) => s.trim().split(/\s+/).length;

describe("occasion guides", () => {
  for (const occasion of OCCASIONS) {
    for (const locale of GIFT_LOCALES) {
      const guide = OCCASION_GUIDES[occasion]?.[locale];

      it(`${occasion} (${locale}) is a whole guide`, () => {
        expect(guide, "missing").toBeTruthy();
        expect(words(guide.title)).toBeGreaterThanOrEqual(4);
        expect(words(guide.lead)).toBeGreaterThanOrEqual(30);
        expect(guide.sections).toHaveLength(3);
        for (const s of guide.sections) {
          expect(words(s.heading)).toBeGreaterThanOrEqual(2);
          expect(words(s.body), s.heading).toBeGreaterThanOrEqual(45);
        }
        expect(guide.faq.length).toBeGreaterThanOrEqual(3);
        for (const f of guide.faq) {
          expect(f.q.trim().endsWith("?"), f.q).toBe(true);
          expect(words(f.a), f.q).toBeGreaterThanOrEqual(20);
        }
        // Enough on the page to be worth reading, which is also what a thin page lacked.
        const total = words(guide.lead) + guide.sections.reduce((n, s) => n + words(s.body), 0) + guide.faq.reduce((n, f) => n + words(f.q) + words(f.a), 0);
        expect(total, "total words").toBeGreaterThanOrEqual(300);
        expect(new Set(guide.sections.map((s) => s.heading)).size).toBe(3);
      });

      if (guide?.ideas) {
        const ideas = guide.ideas;
        it(`${occasion} (${locale}) lists ideas that can be made`, () => {
          // The same gifts in both languages and in the same order, each one a template that exists.
          const other = OCCASION_GUIDES[occasion][locale === "en" ? "es" : "en"].ideas;
          expect(other?.items.map((i) => i.template)).toEqual(ideas.items.map((i) => i.template));
          expect(new Set(ideas.items.map((i) => i.template)).size).toBe(ideas.items.length);
          for (const idea of ideas.items) {
            expect(getManifest(idea.template), idea.template).not.toBeNull();
            expect(words(idea.heading), idea.template).toBeGreaterThanOrEqual(3);
            expect(words(idea.body), idea.template).toBeGreaterThanOrEqual(25);
          }
          // The number in the heading is the number of ideas under it.
          expect(ideas.title).toContain(String(ideas.items.length));
        });
      }

      it(`${occasion} (${locale}) only names templates that exist`, () => {
        // A template named in a guide must be a real one, so the advice can be followed.
        const names = new Set(listManifests().map((m) => m.name.en));
        const text = [guide.lead, ...guide.sections.map((s) => s.body), ...guide.faq.map((f) => f.a)].join(" ");
        const mentioned = [...names].filter((n) => text.includes(n));
        expect(mentioned.length, "should point at at least one template").toBeGreaterThan(0);
        // Nothing that looks like a template name but isn't one.
        for (const ghost of ["Snowglobe", "Time Line", "Front page", "Jar of reasons"]) expect(text).not.toContain(ghost);
      });
    }
  }
});

/** The quoted samples in an idea's body, in order: “like this”, and in Spanish «like this» (a quotation inside one is “this”, and no sample). */
const samples = (body: string) => [...body.matchAll(/«([^»]*)»|“([^”]*)”/g)].map((m) => m[1] ?? m[2]);

/**
 * The lists added on 20 Nov 2026 (content/occasion-ideas.ts). Every sample line an idea offers is
 * counted against the field it is for, in the template's own schema: a line that would not fit
 * the editor is not a line to borrow.
 */
describe("occasion idea lists added in the growth build", () => {
  const occasions = Object.keys(OCCASION_IDEAS) as ListedOccasion[];

  it("cover the eight occasions that had none, and Halloween is left alone", () => {
    expect([...occasions].sort()).toEqual(["apology", "fathers-day", "graduation", "just-because", "long-distance", "mothers-day", "thanksgiving", "wedding"]);
    expect(OCCASION_GUIDES.halloween.en.ideas).toBeUndefined();
    for (const occasion of occasions) for (const locale of GIFT_LOCALES) expect(OCCASION_GUIDES[occasion][locale].ideas).toBe(OCCASION_IDEAS[occasion][locale]);
  });

  for (const occasion of occasions) {
    for (const locale of GIFT_LOCALES) {
      const list = OCCASION_IDEAS[occasion][locale];

      it(`${occasion} (${locale}) has eight to twelve ideas, each with something to use`, () => {
        expect(list.items.length).toBeGreaterThanOrEqual(8);
        expect(list.items.length).toBeLessThanOrEqual(12);
        expect(new Set(list.items.map((i) => i.heading)).size).toBe(list.items.length);
        for (const idea of list.items) {
          expect(words(idea.body), idea.template).toBeGreaterThanOrEqual(45);
          expect(idea.body, idea.template).not.toContain("—");
          expect(idea.body, idea.template).not.toContain("!");
          // No price typed by hand, and nothing about the one country the owner keeps off the site.
          expect(idea.body, idea.template).not.toMatch(/[€$£]\s?\d|\d\s?[€$£]/);
          expect(idea.body, idea.template).not.toMatch(/\b(spain|españa|spanish|madrid|barcelona|sevilla|valencia|málaga|bilbao|mallorca|ibiza|canarias)\b/i);
        }
      });

    }
  }
});

/**
 * All twelve lists: the eight above and the four written before them (birthday, anniversary,
 * Valentine's, Christmas, in content/occasions.ts). Since 22 Nov 2026 each idea is a card that opens
 * to one line and one sample in handwriting, so what a card says alone has to be true alone.
 */
describe("every occasion's idea list", () => {
  const listed = (Object.keys(SAMPLE_FIELDS) as SampledOccasion[]).filter((occasion) => OCCASION_GUIDES[occasion].en.ideas);

  it("is one of the twelve, each with a row for every idea", () => {
    expect(listed).toHaveLength(12);
    expect(OCCASIONS.filter((occasion) => OCCASION_GUIDES[occasion].en.ideas).sort()).toEqual([...listed].sort());
    for (const occasion of listed) expect(Object.keys(SAMPLE_FIELDS[occasion]).sort(), occasion).toEqual(OCCASION_GUIDES[occasion].en.ideas!.items.map((i) => i.template).sort());
    // A Spanish row of its own only for an idea that list has.
    for (const [occasion, rows] of Object.entries(SAMPLE_FIELDS_ES)) for (const template of Object.keys(rows)) expect(Object.keys(SAMPLE_FIELDS[occasion as SampledOccasion]), `${occasion} ${template}`).toContain(template);
  });

  for (const occasion of listed) {
    for (const locale of GIFT_LOCALES) {
      it(`${occasion} (${locale}) offers only sample lines that fit their fields`, { timeout: 30_000 }, async () => {
        for (const idea of OCCASION_GUIDES[occasion][locale].ideas!.items) {
          const fields = sampleFieldsOf(occasion, idea.template, locale)!;
          const found = samples(idea.body);
          expect(found.length, `${idea.template}: ${found.join(" | ")}`).toBe(fields.length);
          // At most one sample is marked as the card's.
          expect(fields.filter((field) => field.startsWith("+")).length, idea.template).toBeLessThanOrEqual(1);
          for (const [i, marked] of fields.entries()) {
            if (marked === "-") continue;
            // "&" is a sample shown with the one before it (the next bubble of a thread): it follows one for the same field.
            if (marked.startsWith("&")) expect(fields[i - 1]?.replace(/^[+&]/, ""), `${idea.template}: “&” after another field`).toBe(marked.slice(1));
            const field = marked.replace(/^[+&]/, "");
            const limit = await fieldLimit(idea.template, field);
            expect(limit, `${idea.template}.${field} is not a text field`).not.toBeNull();
            expect(found[i].length, `${idea.template}.${field}: “${found[i]}”`).toBeLessThanOrEqual(limit!);
          }
        }
      });
    }
  }

  it("calls only The Letter free: in an idea's title, its text and the one line its card opens to", () => {
    // Constellations was free until 19 Nov 2026 and three of the older lists still said so. On the live site it is
    // paid (lib/gift/free-tier.ts: the note is for everyone, and a sky needs three photos), and its card showed
    // no "Free" tag over a line that read "Free, and made for this."
    for (const occasion of listed)
      for (const locale of GIFT_LOCALES)
        for (const idea of OCCASION_GUIDES[occasion][locale].ideas!.items) {
          if (idea.template === "the-letter") continue;
          // "The date as free text" (The Toast) is about a field, not a price.
          for (const text of [idea.heading, idea.body, idea.brief ?? "", occasionCardLine(idea)]) expect(text, `${occasion} ${locale} ${idea.template}`).not.toMatch(/\b(free(?! text)|gratis|gratuit[ao]s?)\b/i);
        }
    expect(sendsFree(getManifest("constellations")!, 1), "Constellations has no free version once the note is for everyone").toBe(false);
  });

  it("a card tagged Free is an idea about the free note, and says so", () => {
    // An occasion's card is tagged by its template (sendsFree), which is right only while every Letter idea is the free note.
    for (const occasion of listed)
      for (const locale of GIFT_LOCALES)
        for (const idea of OCCASION_GUIDES[occasion][locale].ideas!.items) {
          if (!sendsFree(getManifest(idea.template)!, 1)) continue;
          expect(idea.template, `${occasion} ${locale}`).toBe("the-letter");
          expect(idea.body, `${occasion} ${locale}: its Letter idea does not say it is the free one`).toMatch(/\b(free|gratis|gratuita)\b/i);
        }
  });
});
