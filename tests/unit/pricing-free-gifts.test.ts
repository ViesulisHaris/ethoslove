import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { sendsFree } from "@/lib/gift/free-tier";
import { listManifests } from "@/templates/manifests";
import { pricingFaq, type FaqItem } from "@/components/pricing/offers";
import { headLine, pricingGifts, withFreeAnswer } from "@/components/pricing/free-gifts";

/**
 * /pricing must not say two things about one gift (PLAN-pricing.md, the owner's addendum of 24 Nov 2026):
 * "All 59 premium templates" beside a gallery of 60 paid gifts, and Constellations named as a free gift
 * while the gallery sells it. Every count and every name the page gives for "free" comes from the
 * gifts `sendsFree` lets go out free, and this holds with the free note on (the live setting) and off.
 */
const manifests = listManifests();
const SETTINGS = [
  { share: 1, label: "the free note for everyone (live)" },
  { share: 0, label: "the free note off" },
] as const;

/** The names of the gifts a text names, matched whole and with their capitals, in the text's language. */
function named(text: string, lang: "en" | "es"): string[] {
  return manifests.filter((m) => new RegExp(`(^|[^\\p{L}])${m.name[lang].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}])`, "u").test(text)).map((m) => m.slug);
}

for (const { share, label } of SETTINGS) {
  describe(`/pricing's free and paid gifts, ${label}`, () => {
    const { free, paid, note } = pricingGifts(manifests, share);

    it("splits every gift into free or paid by sendsFree, once each", () => {
      expect(free.every((m) => sendsFree(m, share))).toBe(true);
      expect(paid.some((m) => sendsFree(m, share))).toBe(false);
      expect(free.length + paid.length).toBe(manifests.length);
      expect(new Set([...free, ...paid].map((m) => m.slug)).size).toBe(manifests.length);
      // The gallery's own count: The Letter alone is free with the note on, Constellations too with it off.
      expect(free.map((m) => m.slug).sort()).toEqual(share === 1 ? ["the-letter"] : ["constellations", "the-letter"]);
      expect(note).toBe(share === 1);
    });

    it("the head's line names only free gifts and counts the list", () => {
      for (const subscriptions of [false, true]) {
        const head = headLine(free, subscriptions);
        expect(head).not.toBeNull();
        if (head!.name) expect(sendsFree(head!.name, share)).toBe(true);
        if (free.length === 1) expect(head!.key).toBe(subscriptions ? "lineOneSubs" : "lineOne");
        if (free.length === 2) expect(head!.key).toBe(subscriptions ? "lineTwoSubs" : "lineTwo");
        for (const messages of [en, es]) expect(messages.pricing.page[head!.key]).toBeTruthy();
      }
      // With subscriptions on, the line never says there is no subscription.
      expect(en.pricing.page.lineOneSubs).not.toMatch(/subscription/i);
      expect(en.pricing.page.lineTwoSubs).not.toMatch(/subscription/i);
      expect(es.pricing.page.lineOneSubs).not.toMatch(/suscrip/i);
      expect(es.pricing.page.lineTwoSubs).not.toMatch(/suscrip/i);
      expect(headLine([], true)).toBeNull();
    });

    for (const [lang, messages] of [
      ["en", en],
      ["es", es],
    ] as const) {
      it(`every gift the words about what is free name (${lang}) can be sent free, so none is named under two prices`, () => {
        const names = new Intl.ListFormat(lang, { type: "conjunction" }).format(free.map((m) => m.name[lang]));
        const faq = withFreeAnswer(pricingFaq(messages.pricing.faq as FaqItem[], { giftCards: true, subscriptions: false }), note, messages.pricing.faqFreeNote);
        const freeAnswer = faq.find((item) => item.id === "free");
        expect(freeAnswer, "the free tier's question is marked").toBeTruthy();
        const texts = [
          messages.pricing[note ? "freeNoteShort" : "freeNote"],
          messages.membership.single.special[note ? "blurbShort" : "blurb"].replace("{names}", names),
          freeAnswer!.a,
        ];
        const paidSlugs = new Set(paid.map((m) => m.slug));
        for (const text of texts) {
          for (const slug of named(text, lang)) expect(paidSlugs.has(slug), `${slug} is sold, yet named in: ${text.slice(0, 80)}…`).toBe(false);
        }
        // And the free gifts are the ones the answer names.
        for (const m of free) expect(freeAnswer!.a).toContain(m.name[lang]);
      });
    }

    it("the Everything card counts the paid list, and says paid, not premium", () => {
      for (const messages of [en, es]) {
        const line = messages.pricing.page.cards.everything.line;
        expect(line).toContain("{n}");
        expect(line).not.toMatch(/premium/i);
      }
      expect(paid.length).toBe(manifests.length - (share === 1 ? 1 : 2));
    });
  });
}

describe("/pricing's own words", () => {
  it("never say premium, nor the old card name, in what the page shows", () => {
    for (const messages of [en, es]) {
      const page = JSON.stringify(messages.pricing.page);
      expect(page).not.toMatch(/premium/i);
      expect(page).not.toMatch(/One template|Una plantilla/);
      for (const item of messages.pricing.faq) expect(item.a, item.q).not.toMatch(/premium/i);
      expect(messages.pricing.faqFreeNote).not.toMatch(/premium/i);
    }
  });

  it("the free tier's answer is replaced only with the note for everyone", () => {
    const faq = [{ id: "free", q: "q", a: "two templates" }, { q: "other", a: "x" }];
    expect(withFreeAnswer(faq, false, "note")).toEqual(faq);
    expect(withFreeAnswer(faq, true, "note")).toEqual([{ id: "free", q: "q", a: "note" }, { q: "other", a: "x" }]);
  });
});
