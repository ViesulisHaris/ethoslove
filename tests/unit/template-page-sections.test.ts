import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { stepQuote, type QuoteSource } from "@/components/templates/page/quote";
import { experienceChecks, moreLikeThis, type ExperienceKey } from "@/components/templates/page/sections";
import { TEMPLATE_GUIDES } from "@/content/template-guides";
import { TEMPLATE_STEPS } from "@/content/template-steps";
import { FREE_NOTE_MAX_CHARS } from "@/lib/gift/free-tier";
import { TEMPLATE_MANIFESTS, getManifest, listManifests } from "@/templates/manifests";

/**
 * What a gift's page reads off the gift below its hero (components/templates/page/sections.tsx):
 * the line on each note card of "How to send", the three checks of "The experience", and the four
 * gifts of "More like this". Each was the same on every page, or unrelated to its step, before the
 * second review of 21 Nov 2026.
 */
const LOCALES = ["en", "es"] as const;

/** A gift's demo, lines and choices, as the page gathers them (templateSamples). */
async function sourceOf(slug: string, l: (typeof LOCALES)[number]): Promise<QuoteSource> {
  const demo = ((await import(`../../src/templates/${slug}/demo-data.ts`)) as { demoData: Record<string, Record<string, unknown>> }).demoData[l];
  const meta = ((await import(`../../src/templates/${slug}/field-meta.ts`).catch(() => ({ fieldMeta: { en: {}, es: {} } }))) as { fieldMeta: Record<string, Record<string, { options?: Record<string, string> }>> }).fieldMeta[l];
  return {
    lent: TEMPLATE_GUIDES[slug][l].ideas.items.map((idea) => ({ field: idea.borrow.field, line: idea.borrow.line })),
    demo,
    options: Object.fromEntries(Object.entries(meta).flatMap(([key, m]) => (m.options ? [[key, m.options]] : []))),
  };
}

describe("the line on a note card of “How to send”", () => {
  it("is a value of the field its step is about", async () => {
    // Passport's "Set both cities" showed "Citizen of wherever you are", a nationality line.
    const passport = await sourceOf("passport", "en");
    expect(stepQuote("fields.fromCity+fields.toCity", passport)).toBe(`${(passport.demo!.fields as { fromCity: string }).fromCity} → ${(passport.demo!.fields as { toCity: string }).toCity}`);
    // A name: the demo's.
    const bats = await sourceOf("bat-swarm", "en");
    expect(stepQuote("recipientName", bats)).toBe(bats.demo!.recipientName);
    // A line the gift's own cards lend for that field comes before the demo's.
    expect(stepQuote("fields.line", bats)).toBe(TEMPLATE_GUIDES["bat-swarm"].en.ideas.items.find((i) => i.borrow.field === "fields.line")!.borrow.line);
    // A choice is shown by the name the editor gives it, in the page's language.
    expect(stepQuote("fields.flower", await sourceOf("bloom", "en"))).toMatch(/^(Peony|Tulip|Daisy)$/);
    expect(stepQuote("fields.flower", await sourceOf("bloom", "es"))).toMatch(/^(Peonía|Tulipán|Margarita)$/);
    // A place is shown by its name.
    const halfway = await sourceOf("halfway", "es");
    expect(stepQuote("fields.from+fields.to", halfway)).toBe(`${(halfway.demo!.fields as { from: { name: string } }).from.name} → ${(halfway.demo!.fields as { to: { name: string } }).to.name}`);
  });

  it("is never longer than the card can show, and gives way when nothing short enough is there", () => {
    const source: QuoteSource = { lent: [{ field: "fields.note", line: "x".repeat(31) }], demo: { fields: { note: "y".repeat(40), label: "short one" } }, options: {} };
    expect(stepQuote("fields.note", source)).toBeNull();
    expect(stepQuote(["fields.note", "fields.label"], source)).toBe("short one");
    expect(stepQuote("fields.missing", source)).toBeNull();
    expect(stepQuote("fields.note+fields.label", source)).toBeNull();
  });

  it("is found for nearly every note step of every gift, in both languages, and never names Spain", async () => {
    const spain = /\b(spain|españa|espana|spanish|madrid|barcelona|sevilla|seville|valencia|málaga|malaga|bilbao|mallorca|ibiza|canarias|canary|palma)\b/i;
    const none: string[] = [];
    let steps = 0;
    for (const [slug, row] of Object.entries(TEMPLATE_STEPS))
      for (const l of LOCALES) {
        const source = await sourceOf(slug, l);
        for (const step of row.steps) {
          if (step.picture !== "note" || !step.quote) continue;
          steps += 1;
          const quote = stepQuote(step.quote, source);
          if (quote === null) none.push(`${slug} ${l}: ${step.en}`);
          else expect(quote, `${slug} ${l}`).not.toMatch(spain);
        }
      }
    expect(steps).toBeGreaterThan(130);
    // The few with nothing short enough in the field show a spare line of the gift, as every card did before.
    expect(none.length, none.join("; ")).toBeLessThanOrEqual(14);
  });
});

describe("the three checks of “The experience”", () => {
  const t = (l: (typeof LOCALES)[number]) => (key: ExperienceKey, values?: Record<string, number>) => {
    let text: string = (l === "en" ? en : es).templates.guide[key];
    for (const [name, value] of Object.entries(values ?? {})) text = text.replace(`{${name}}`, String(value));
    return text;
  };

  it("are the gift's own: what they do, how many photos it is made of, what it asks of their phone", () => {
    const of = (slug: string, note = false) => experienceChecks(getManifest(slug)!, TEMPLATE_STEPS[slug].line.en, note, t("en"));
    expect(of("arcade")[0]).toBe(TEMPLATE_STEPS.arcade.line.en);
    // Photos: none needed, one is enough, or a number to start from.
    expect(of("bloom")[1]).toBe("Works without photos, or with up to 8");
    expect(of("passport")[1]).toBe("One photo is enough; it holds 10");
    expect(of("constellations")[1]).toBe("Made from 3 to 12 of your photos");
    // A gift that listens or feels a shake says so, and that a tap does it too.
    expect(of("halfway")[2]).toMatch(/blow/);
    expect(of("snow-globe")[2]).toMatch(/shake/);
    expect(of("the-letter")[2]).toMatch(/song/);
    // Arcade has no music.
    expect(of("arcade")[2]).toMatch(/finger/);
    // The free note has no photos: its page gives the note's length and promises none.
    expect(of("the-letter", true)[1]).toBe(`The free note holds ${FREE_NOTE_MAX_CHARS} characters`);
    expect(of("the-letter", true).join(" ")).not.toMatch(/photo/);
  });

  it("differ from gift to gift, and leave no placeholder unfilled in either language", () => {
    for (const l of LOCALES) {
      const seen = new Set<string>();
      for (const m of TEMPLATE_MANIFESTS) {
        const checks = experienceChecks(m, TEMPLATE_STEPS[m.slug].line[l], false, t(l));
        expect(checks).toHaveLength(3);
        for (const check of checks) expect(check, `${m.slug} ${l}`).not.toMatch(/[{}]|undefined/);
        seen.add(checks.join(" | "));
      }
      expect(seen.size).toBe(TEMPLATE_MANIFESTS.length);
    }
  });

  it("say “or tap” only of a gift whose template really takes a tap in place of the microphone or a shake", async () => {
    // Read from each template's own words: a gift that asks for the microphone or for motion offers a tap, a swipe or a button too.
    const { readFileSync } = await import("node:fs");
    for (const m of TEMPLATE_MANIFESTS) {
      const needs = m.features.needs ?? [];
      if (!needs.includes("microphone") && !needs.includes("deviceMotion")) continue;
      const code = readFileSync(`src/templates/${m.slug}/Template.tsx`, "utf8");
      expect(/or tap|tap instead|tap to|tap the|swipe|the button does it/i.test(code), `${m.slug} offers no touch in place of its sensor`).toBe(true);
    }
  });
});

describe("the four gifts of “More like this”", () => {
  it("are the next four made for the same day, counted on from the gift itself", () => {
    const list = listManifests({ occasion: "anniversary" }).map((m) => m.slug);
    const letter = getManifest("the-letter")!;
    expect(letter.occasions[0]).toBe("anniversary");
    const at = list.indexOf("the-letter");
    expect(moreLikeThis(letter).map((m) => m.slug)).toEqual([1, 2, 3, 4].map((step) => list[(at + step) % list.length]));
  });

  it("never include the gift itself or one gift twice, and wrap round the end of the list", () => {
    for (const m of TEMPLATE_MANIFESTS) {
      const more = moreLikeThis(m).map((x) => x.slug);
      expect(more, m.slug).not.toContain(m.slug);
      expect(new Set(more).size, m.slug).toBe(more.length);
      expect(more.length, m.slug).toBeGreaterThan(0);
    }
    const list = listManifests({ occasion: "anniversary" });
    const last = list[list.length - 1];
    if (last.occasions[0] === "anniversary") expect(moreLikeThis(last)[0].slug).toBe(list[0].slug);
  });

  it("differ between two gifts of one day: The Letter and Constellations no longer link to the same four", () => {
    const a = moreLikeThis(getManifest("the-letter")!).map((m) => m.slug);
    const b = moreLikeThis(getManifest("constellations")!).map((m) => m.slug);
    expect(a).not.toEqual(b);
    // Before, an occasion page set linked to its first four gifts only; now most of a list is reached from some gift.
    const linked = new Set(TEMPLATE_MANIFESTS.flatMap((m) => moreLikeThis(m).map((x) => x.slug)));
    expect(linked.size).toBeGreaterThan(40);
  });
});
