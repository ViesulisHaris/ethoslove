import { describe, expect, it } from "vitest";
import { OCCASIONS } from "@/config/occasions";
import { GIFT_LOCALES } from "@/lib/gift/schema";
import { OCCASION_GUIDES } from "@/content/occasions";
import { listManifests } from "@/templates/manifests";

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
        expect(guide.faq).toHaveLength(3);
        for (const f of guide.faq) {
          expect(f.q.trim().endsWith("?"), f.q).toBe(true);
          expect(words(f.a), f.q).toBeGreaterThanOrEqual(20);
        }
        // Enough on the page to be worth reading, which is also what a thin page lacked.
        const total = words(guide.lead) + guide.sections.reduce((n, s) => n + words(s.body), 0) + guide.faq.reduce((n, f) => n + words(f.q) + words(f.a), 0);
        expect(total, "total words").toBeGreaterThanOrEqual(300);
        expect(new Set(guide.sections.map((s) => s.heading)).size).toBe(3);
      });

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
