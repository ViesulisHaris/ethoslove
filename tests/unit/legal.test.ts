import { describe, expect, it } from "vitest";
import { LEGAL_DOCS, WITHDRAW_DOCS, type LegalDoc } from "@/content/legal";
import { CREATOR_COMMISSION_PCT, CREATOR_PAYOUT_MIN_EUR } from "@/lib/commerce/creators";
import { PRODUCTS, formatAmount } from "@/lib/pricing/products";
import { consentSentence } from "@/lib/stripe/line-items";

const all = (doc: LegalDoc) => [doc.intro, ...doc.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join("\n");
const withdrawal = (doc: LegalDoc) => doc.sections.find((s) => /^9\. /.test(s.heading))!.paragraphs.join("\n");

describe("legal documents", () => {
  it("say the same things in English and Spanish, section by section", () => {
    for (const doc of [LEGAL_DOCS.terms, LEGAL_DOCS.privacy, WITHDRAW_DOCS]) {
      expect(doc.es.sections.map((s) => s.paragraphs.length)).toEqual(doc.en.sections.map((s) => s.paragraphs.length));
      expect(doc.es.sections.map((s) => s.heading.split(".")[0])).toEqual(doc.en.sections.map((s) => s.heading.split(".")[0]));
    }
  });

  // The law asks for the buyer's own request and acknowledgement: the terms quote the box itself.
  it("quote the checkout's withdrawal box word for word, for every kind of purchase", () => {
    for (const locale of ["en", "es"] as const) {
      // /legal/withdraw links to it as #s9.
      expect(LEGAL_DOCS.terms[locale].sections[8].heading).toMatch(/^9\. .*(withdrawal|desistimiento)/);
      const s9 = withdrawal(LEGAL_DOCS.terms[locale]);
      for (const product of ["single", "extras", "pack", "upgrade", "pass", "giftcard"] as const) expect(s9).toContain(consentSentence(product, locale));
    }
  });

  // The fallback notice is the same line purchases carried before the box existed, and those keep
  // their right to cancel (/legal/withdraw): a sale where nothing was ticked must keep it too.
  it("don't take the right to cancel from a buyer who ticked nothing", () => {
    expect(withdrawal(LEGAL_DOCS.terms.en)).toContain("that notice doesn't bind you: you keep the right to withdraw for 14 days");
    expect(withdrawal(LEGAL_DOCS.terms.es)).toContain("ese aviso no te obliga: conservas el derecho a desistir durante 14 días");
    expect(WITHDRAW_DOCS.en.sections[0].paragraphs.join("\n")).toContain("Stripe's page couldn't show it");
    expect(WITHDRAW_DOCS.es.sections[0].paragraphs.join("\n")).toContain("la página de Stripe no pudo mostrarla");
  });

  it("pay creators the programme's own numbers", () => {
    expect(all(LEGAL_DOCS.terms.en)).toContain(`${CREATOR_COMMISSION_PCT}% of what we receive`);
    expect(all(LEGAL_DOCS.terms.en)).toContain(`passes €${CREATOR_PAYOUT_MIN_EUR}`);
    expect(all(LEGAL_DOCS.terms.es)).toContain(`supera los ${CREATOR_PAYOUT_MIN_EUR} €`);
  });

  it("state the catalogue's prices, in euros", () => {
    expect(all(LEGAL_DOCS.terms.en)).toContain(`“Make it special” ${formatAmount(PRODUCTS.extras.amounts.eur, "eur", "en")}`);
    expect(all(LEGAL_DOCS.terms.es)).toContain(`«Hazlo especial», ${formatAmount(PRODUCTS.extras.amounts.eur, "eur", "es")}`);
    expect(all(LEGAL_DOCS.terms.en)).toContain(`Ethos for Two ${formatAmount(PRODUCTS.pass.amounts.eur, "eur", "en")} for 365 days`);
  });

  it("carry none of the dropped offers: discounts, codes and the paid song", () => {
    for (const locale of ["en", "es"] as const) {
      const terms = all(LEGAL_DOCS.terms[locale]);
      expect(terms).not.toMatch(/\b(10|20) ?%/);
      expect(terms).not.toMatch(/real songs|canciones reales/i);
      expect(terms).not.toMatch(/cleared for embedding/i);
    }
    // The privacy policy lists every email we send instead of claiming there is no marketing.
    expect(all(LEGAL_DOCS.privacy.en)).not.toMatch(/no other marketing emails/i);
    expect(all(LEGAL_DOCS.privacy.es)).not.toMatch(/ningún otro correo comercial/i);
    expect(all(LEGAL_DOCS.privacy.en)).toContain("The checkout reminder");
  });
});
