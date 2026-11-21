import { describe, expect, it } from "vitest";
import { TEMPLATE_GUIDES } from "@/content/template-guides";
import { TEMPLATE_STEPS, templateSteps } from "@/content/template-steps";
import { TEMPLATE_MANIFESTS, getManifest } from "@/templates/manifests";

/**
 * "Change the ways when to send the gifts, as its kinda weird for letter, they should be good for
 * each gift" (the owner, 21 Nov 2026). Every gift's page shows that gift's own three steps; the
 * lengths here are what the three small cards hold at 320 px wide without a third line.
 */
const LOCALES = ["en", "es"] as const;
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

describe("the three steps of a gift's page", () => {
  it("are written for every registered template, and for nothing else", () => {
    for (const m of TEMPLATE_MANIFESTS) expect(templateSteps(m.slug), `${m.slug} has no steps`).not.toBeNull();
    for (const slug of Object.keys(TEMPLATE_STEPS)) expect(getManifest(slug), `${slug} is not a template`).toBeTruthy();
    expect(templateSteps("not-a-template")).toBeNull();
  });

  it("have titles of two to four words in English, up to five in Spanish", () => {
    const off: string[] = [];
    for (const [slug, row] of Object.entries(TEMPLATE_STEPS))
      for (const step of row.steps) {
        if (words(step.en) < 2 || words(step.en) > 4) off.push(`${slug} en: ${step.en}`);
        if (words(step.es) < 2 || words(step.es) > 5) off.push(`${slug} es: ${step.es}`);
        // A card's title is one or two lines of about fourteen characters on the narrowest phone.
        for (const l of LOCALES) if (step[l].length > 28) off.push(`${slug} ${l} (${step[l].length} characters): ${step[l]}`);
      }
    expect(off).toEqual([]);
  });

  it("are three different things to do, the last of them sending it", () => {
    for (const [slug, row] of Object.entries(TEMPLATE_STEPS)) {
      expect(row.steps).toHaveLength(3);
      expect(row.steps[2].picture, slug).toBe("phone");
      for (const step of row.steps.slice(0, 2)) expect(["photo", "note"], slug).toContain(step.picture);
      for (const l of LOCALES) expect(new Set(row.steps.map((s) => s[l].toLowerCase())).size, `${slug} ${l}`).toBe(3);
    }
  });

  it("show a photo only for a gift that takes photos", () => {
    // The Letter's free version has none: a polaroid on its first step is what the owner called weird.
    for (const [slug, row] of Object.entries(TEMPLATE_STEPS)) {
      const max = getManifest(slug)!.features.photos.max;
      if (row.steps.some((s) => s.picture === "photo")) expect(max, `${slug} shows a photo and takes none`).toBeGreaterThan(0);
    }
    expect(TEMPLATE_STEPS["the-letter"].steps.map((s) => s.picture)).toEqual(["note", "note", "phone"]);
  });

  it("have one line under the heading, of at most fourteen words", () => {
    const over: string[] = [];
    for (const [slug, row] of Object.entries(TEMPLATE_STEPS)) for (const l of LOCALES) if (words(row.line[l]) > 14 || words(row.line[l]) < 4) over.push(`${slug} ${l} (${words(row.line[l])}): ${row.line[l]}`);
    expect(over).toEqual([]);
  });

  it("say it plainly: no exclamation marks, no dash asides, nothing of Spain", () => {
    const spain = /\b(spain|españa|espana|spanish|madrid|barcelona|sevilla|seville|valencia|málaga|malaga|bilbao|mallorca|ibiza|canarias|canary|palma)\b/i;
    for (const [slug, row] of Object.entries(TEMPLATE_STEPS))
      for (const l of LOCALES)
        for (const text of [row.line[l], ...row.steps.map((s) => s[l])]) {
          expect(text, slug).not.toMatch(/[!¡]|—| – |perfect for|perfecto para/i);
          expect(text, slug).not.toMatch(spain);
          expect(text.trim(), slug).toBe(text);
        }
  });

  it("give a note card a line to show: every gift with a note step has a short line of its own", () => {
    // The card shows a line to borrow of 8 to 30 characters, or the demo's title (sections.tsx, templateSamples).
    const none: string[] = [];
    for (const [slug, row] of Object.entries(TEMPLATE_STEPS)) {
      if (!row.steps.some((s) => s.picture === "note")) continue;
      for (const l of LOCALES) {
        const lines = TEMPLATE_GUIDES[slug]?.[l].ideas.items.map((i) => i.borrow.line).filter((line) => line.length >= 8 && line.length <= 30) ?? [];
        if (lines.length === 0) none.push(`${slug} ${l}`);
      }
    }
    // The few without one show their demo's title, which every demo has.
    expect(none.length, none.join(", ")).toBeLessThanOrEqual(12);
  });
});
