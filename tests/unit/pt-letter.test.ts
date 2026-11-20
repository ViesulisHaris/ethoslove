import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import { PT_FREE_CHARS, PT_LETTER_LANG, PT_LETTER_PATH, ptLetterCopy } from "@/content/pt-letter";
import { FREE_NOTE_MAX_CHARS, NOTE_TEMPLATES } from "@/lib/gift/free-tier";
import sitemap from "@/app/sitemap";

const copy = ptLetterCopy({ price: "7,49 €", currency: "eur" });
const everything = JSON.stringify(copy);

describe("the Portuguese page for The Letter", () => {
  it("says the same about what is free as the template's own guide", () => {
    expect(PT_FREE_CHARS).toBe(FREE_NOTE_MAX_CHARS);
    expect(NOTE_TEMPLATES).toContain("the-letter");
    // The English guide it restates: a short note free, the rest with "Make it special", paid once.
    const guide = en.templates.guide.faqFreeAShort;
    expect(guide).toContain("up to 500 characters, music and a small “Made with Ethos” footer");
    expect(guide).toContain("Photos, a longer letter, a video, a voice message, no footer and scheduling");
    expect(copy.pricing.free).toContain(`até ${FREE_NOTE_MAX_CHARS} caracteres`);
    for (const said of ["fotos", "uma carta mais longa", "um vídeo", "uma mensagem de voz", "agendamento", "sem o rodapé"]) expect(copy.pricing.paid, said).toContain(said);
    expect(copy.pricing.paid).toContain("7,49 €");
    expect(copy.faq.items[0].a).toContain("7,49 €");
  });

  it("names the currency the price is charged in", () => {
    expect(copy.pricing.once).toContain("euros");
    expect(ptLetterCopy({ price: "US$ 8,99", currency: "usd" }).pricing.once).toContain("dólares americanos");
    expect(ptLetterCopy({ price: "£ 6,49", currency: "gbp" }).pricing.once).toContain("libras esterlinas");
  });

  it("says plainly that the editor is not in Portuguese", () => {
    expect(copy.languageNote).toContain("inglês");
    expect(copy.faq.items.find((item) => item.q.includes("português"))?.a).toContain("inglês");
  });

  it("is written for the phrases Brazil searches, with nothing left unfilled", () => {
    expect(copy.metaTitle.toLowerCase()).toContain("carta digital");
    expect(copy.metaTitle.toLowerCase()).toContain("carta virtual");
    expect(`${copy.metaTitle} · Ethos`.length).toBeLessThanOrEqual(70);
    expect(copy.metaDescription.length).toBeLessThanOrEqual(160);
    expect(copy.faq.items.length).toBeGreaterThanOrEqual(5);
    expect(copy.lines.items).toHaveLength(6);
    expect(everything).not.toMatch(/undefined|\$\{|TODO/);
  });

  it("is in the sitemap once, under Portuguese, not as an English or Spanish page", () => {
    const entries = sitemap().filter((entry) => entry.url.endsWith(PT_LETTER_PATH));
    expect(entries).toHaveLength(1);
    expect(entries[0].url).toBe(`${entries[0].url.split("/pt/")[0]}${PT_LETTER_PATH}`);
    expect(Object.keys(entries[0].alternates?.languages ?? {})).toEqual([PT_LETTER_LANG]);
  });
});
