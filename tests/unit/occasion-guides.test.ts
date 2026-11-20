import { describe, expect, it } from "vitest";
import { OCCASIONS } from "@/config/occasions";
import { GIFT_LOCALES } from "@/lib/gift/schema";
import { OCCASION_GUIDES } from "@/content/occasions";
import { OCCASION_IDEAS, SAMPLE_FIELDS, type ListedOccasion } from "@/content/occasion-ideas";
import { fieldLimit } from "@/lib/gift/field-limit";
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

/** The quoted samples in an idea's body, in order: “like this”. */
const samples = (body: string) => [...body.matchAll(/“([^”]*)”/g)].map((m) => m[1]);

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

      it(`${occasion} (${locale}) offers only sample lines that fit their fields`, async () => {
        expect(Object.keys(SAMPLE_FIELDS[occasion]).sort()).toEqual(list.items.map((i) => i.template).sort());
        for (const idea of list.items) {
          const fields = SAMPLE_FIELDS[occasion][idea.template];
          const found = samples(idea.body);
          expect(found.length, `${idea.template}: ${found.join(" | ")}`).toBe(fields.length);
          for (const [i, field] of fields.entries()) {
            if (field === "-") continue;
            const limit = await fieldLimit(idea.template, field);
            expect(limit, `${idea.template}.${field} is not a text field`).not.toBeNull();
            expect(found[i].length, `${idea.template}.${field}: “${found[i]}”`).toBeLessThanOrEqual(limit!);
          }
        }
      });
    }
  }

  it("calls only The Letter free", () => {
    for (const occasion of occasions) {
      for (const locale of GIFT_LOCALES) {
        for (const idea of OCCASION_IDEAS[occasion][locale].items) {
          if (idea.template === "the-letter") continue;
          expect(`${idea.heading} ${idea.body}`, `${occasion} ${idea.template}`).not.toMatch(/\b(free|gratis)\b/i);
        }
      }
    }
  });
});
