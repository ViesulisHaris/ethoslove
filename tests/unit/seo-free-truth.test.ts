import { afterEach, describe, expect, it, vi } from "vitest";
import { createTranslator } from "next-intl";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { DIGITAL_GIFT_GUIDE } from "@/content/digital-gifts";
import { pricingGifts } from "@/components/pricing/free-gifts";
import { briefFaq, briefTemplatePrice } from "@/lib/llms/brief";
import { getManifest, listManifests } from "@/templates/manifests";

/**
 * What the site says is free, outside /pricing (reports/seoaudit-audit.md, B1 and B2): /llms.txt, the
 * help chat's guide and the /gifts questions follow `sendsFree` and the free note's answer, with the
 * free note on (the live setting) and off.
 */
afterEach(() => {
  vi.unstubAllEnvs();
});

const freeAnswer = en.pricing.faq.find((f) => f.id === "free")!.a;

describe("the brief's free answer (/llms.txt, the help chat)", () => {
  it("with the free note on, answers with the note and names no second free template", () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "1");
    const text = briefFaq().join("\n");
    expect(text).toContain(en.pricing.faqFreeNote);
    expect(text).not.toContain(freeAnswer);
    expect(text).not.toMatch(/two full templates/i);
  });

  it("with the free note off, keeps the answer with both free templates", () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "");
    const text = briefFaq().join("\n");
    expect(text).toContain(freeAnswer);
    expect(text).not.toContain(en.pricing.faqFreeNote);
  });
});

describe("a template's price line in /llms.txt", () => {
  it("calls Constellations free only while it can be sent free", () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "1");
    expect(briefTemplatePrice(getManifest("constellations")!)).not.toMatch(/free/i);
    expect(briefTemplatePrice(getManifest("the-letter")!)).toMatch(/^Free as a short note/);
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "");
    expect(briefTemplatePrice(getManifest("constellations")!)).toBe("Free.");
    expect(briefTemplatePrice(getManifest("the-letter")!)).toBe("Free.");
    expect(briefTemplatePrice(getManifest("bouquet")!)).toBe("Premium.");
  });

  it("is what the served /llms.txt prints, with the free note on", async () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "1");
    const { GET } = await import("@/app/llms.txt/route");
    const text = await GET().text();
    const line = text.split("\n").find((l) => l.startsWith("- [Constellations]"))!;
    expect(line).toBeTruthy();
    expect(line).not.toMatch(/Free\./);
    expect(line).toContain('Paid once ("Make it special"');
  });
});

describe("/gifts says how many templates there are and how many are free from the catalogue (B3, B4, M1)", () => {
  for (const share of ["1", ""]) {
    it(`with the free note ${share ? "on" : "off"}`, () => {
      vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", share);
      const manifests = listManifests();
      const { free } = pricingGifts(manifests);
      expect(free.length).toBe(share ? 1 : 2);
      // "What is a digital gift?": the gallery's count and the free count, not a typed 54.
      expect(DIGITAL_GIFT_GUIDE.en.notACard).toContain(`Ethos has ${manifests.length} of them`);
      expect(DIGITAL_GIFT_GUIDE.es.notACard).toContain(`Ethos tiene ${manifests.length} para empezar`);
      expect(DIGITAL_GIFT_GUIDE.en.notACard).toMatch(share ? /and one is free\.$/ : /and two are free\.$/);
      expect(DIGITAL_GIFT_GUIDE.es.notACard).toMatch(share ? /y uno es gratis\.$/ : /y dos son gratis\.$/);
      // "How it works", step one, said from the same list.
      for (const [lang, messages] of [
        ["en", en],
        ["es", es],
      ] as const) {
        const t = createTranslator({ locale: lang, messages });
        const body = t("home.how.pickBody", { free: free.length, name: free[0].name[lang] });
        if (share) expect(body).toContain(lang === "en" ? "The Letter is free;" : `${free[0].name.es} es gratis;`);
        else expect(body).toContain(lang === "en" ? "Two are free;" : "Dos son gratis;");
        expect(body).not.toMatch(/[{}]/);
      }
    });
  }
});

/** Every string in a value, however deep. */
function allStrings(o: unknown): string[] {
  if (typeof o === "string") return [o];
  if (Array.isArray(o)) return o.flatMap(allStrings);
  if (o && typeof o === "object") return Object.values(o).flatMap(allStrings);
  return [];
}

describe("the site's pages say what is free as the free-note setting has it (occasions, gift guides, /digital-cards, /gifts, /pt)", () => {
  /** The pages' words with the setting as given, the modules loaded afresh (their choice is made when they load, as at build). */
  async function pagesWith(share: string): Promise<string[]> {
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", share);
    vi.resetModules();
    const [{ OCCASION_GUIDES }, { OCCASION_IDEAS }, { GIFT_GUIDES }, { DIGITAL_GIFT_GUIDE: gifts }, { digitalCardsCopy }, { ptLetterCopy }] = await Promise.all([
      import("@/content/occasions"),
      import("@/content/occasion-ideas"),
      import("@/content/gift-guides"),
      import("@/content/digital-gifts"),
      import("@/content/digital-cards"),
      import("@/content/pt-letter"),
    ]);
    const facts = { single: "S", pick3: "P", everything: "E", extras: "X", photos: "F", notePhotos: 5, count: 61, paid: 60, ideas: 30, finder: true };
    return [OCCASION_GUIDES, OCCASION_IDEAS, GIFT_GUIDES, gifts, digitalCardsCopy("en", facts), digitalCardsCopy("es", facts), ptLetterCopy({ price: "X", currency: "eur" })]
      .flatMap(allStrings)
      .flatMap((s) => s.split(/(?<=[.;:!?])\s+/));
  }
  const saysFree = /\b(?:free|gratis|grátis|gratuita)\b/i;

  it("with the free note on (live), never calls Constellations free or gives free photos", async () => {
    const sentences = (await pagesWith("1")).filter((s) => saysFree.test(s));
    for (const s of sentences) {
      expect.soft(/Constellations|Constelaciones/.test(s) && !/paid|pago|de pago|Make it special|Hazlo especial/i.test(s), s).toBe(false);
      expect.soft(/\b(?:10|ten|diez) (?:photos|fotos)\b/i.test(s), s).toBe(false);
    }
  });

  it("with the free note off, never says the free gift is a short note of 500 characters", async () => {
    const sentences = (await pagesWith("")).filter((s) => saysFree.test(s));
    for (const s of sentences) expect.soft(/short note|nota corta|bilhete curto|500 (?:characters|caracteres)/i.test(s), s).toBe(false);
  });
});
