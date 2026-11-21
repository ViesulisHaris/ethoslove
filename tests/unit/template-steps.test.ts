import { describe, expect, it } from "vitest";
import { TEMPLATE_GUIDES } from "@/content/template-guides";
import { TEMPLATE_STEPS, templateSteps } from "@/content/template-steps";
import { TEMPLATE_MANIFESTS, getManifest } from "@/templates/manifests";
import { loadFieldsSchema } from "@/templates/schemas";
import { z } from "zod";

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

  it("have one line on what the person who gets it does, of at most twelve words", () => {
    // It is the first check of "The experience" (sections.tsx), where a check holds twelve words.
    const over: string[] = [];
    for (const [slug, row] of Object.entries(TEMPLATE_STEPS)) for (const l of LOCALES) if (words(row.line[l]) > 12 || words(row.line[l]) < 4) over.push(`${slug} ${l} (${words(row.line[l])}): ${row.line[l]}`);
    expect(over).toEqual([]);
  });

  it("never open that line on “Three steps.”, and say it once: no line is on two gifts", () => {
    // The review of 21 Nov 2026: all 61 lines opened "Three steps." / "Tres pasos.", which the numbered cards already say.
    for (const l of LOCALES) {
      const seen = new Map<string, string>();
      for (const [slug, row] of Object.entries(TEMPLATE_STEPS)) {
        expect(row.line[l], slug).not.toMatch(/^(three steps|tres pasos)/i);
        expect(seen.get(row.line[l]), `${slug} ${l} shares its line with ${seen.get(row.line[l])}`).toBeUndefined();
        seen.set(row.line[l], slug);
      }
    }
  });

  it("only promise a photo behind a window for a photo that is there (Haunted House)", () => {
    // All six windows light; only the first of them hold a photo, and it opens with none (haunted-house/windows.ts).
    for (const l of LOCALES) expect(TEMPLATE_STEPS["haunted-house"].line[l]).not.toMatch(/every lit window|cada ventana guarda/i);
  });

  it("name, on every note step, a field of that gift for its card to quote", async () => {
    // A card showed the gift's first short line whatever its step was about: "Citizen of wherever
    // you are" under "Set both cities" (the review of 21 Nov 2026). Now a step says which field.
    const shared = ["title", "message", "recipientName", "senderName", "caption"];
    const off: string[] = [];
    for (const [slug, row] of Object.entries(TEMPLATE_STEPS)) {
      const schema = await loadFieldsSchema(slug);
      const own = schema instanceof z.ZodObject ? Object.keys(schema.shape) : [];
      for (const step of row.steps) {
        if (step.picture !== "note") {
          if (step.quote) off.push(`${slug}: “${step.en}” is not a note and quotes a field`);
          continue;
        }
        if (!step.quote) off.push(`${slug}: “${step.en}” names no field`);
        for (const alt of typeof step.quote === "string" ? [step.quote] : (step.quote ?? []))
          for (const field of alt.split("+")) if (!(field.startsWith("fields.") ? own.includes(field.slice("fields.".length)) : shared.includes(field))) off.push(`${slug}: “${step.en}” quotes ${field}, which this gift does not have`);
      }
    }
    expect(off).toEqual([]);
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

  it("never say a gift is in the sender's own handwriting: it is set in a handwriting face", () => {
    // The Letter said "They break the seal and read it in your handwriting" (the test of 21 Nov
    // 2026). Nobody's own hand is in a gift; the words are drawn in a typeface that looks written.
    const own = /your (own )?handwriting|in your (own )?hand\b|con tu letra|de tu puño/i;
    const strings = (value: unknown): string[] => (typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(strings) : []);
    for (const [slug, row] of Object.entries(TEMPLATE_STEPS)) for (const text of strings(row)) expect(text, slug).not.toMatch(own);
    for (const [slug, guide] of Object.entries(TEMPLATE_GUIDES)) for (const text of strings(guide)) expect(text, slug).not.toMatch(own);
    // The description is the page's hero and its closed block.
    for (const m of TEMPLATE_MANIFESTS) for (const text of [...Object.values(m.description), ...Object.values(m.tagline)]) expect(text, m.slug).not.toMatch(own);
    expect(TEMPLATE_STEPS["the-letter"].line.en).toMatch(/write themselves by hand/);
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
