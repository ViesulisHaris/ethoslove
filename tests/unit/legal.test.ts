import { describe, expect, it } from "vitest";
import { LEGAL_DOCS, WITHDRAW_DOCS, type LegalDoc } from "@/content/legal";
import { CREATOR_COMMISSION_PCT, CREATOR_PAYOUT_MIN_EUR } from "@/lib/commerce/creators";
import { FREE_SAVED_DATES, PRODUCTS, formatAmount, membershipAmount } from "@/lib/pricing/products";
import { consentSentence } from "@/lib/stripe/line-items";

const all = (doc: LegalDoc) => [doc.intro, ...doc.sections.flatMap((s) => [s.heading, ...s.paragraphs])].join("\n");
const section = (doc: LegalDoc, n: number) => doc.sections.find((s) => s.heading.startsWith(`${n}. `))!.paragraphs.join("\n");
const withdrawal = (doc: LegalDoc) => section(doc, 9);

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
      // A membership's box states its own price and renewal, so each plan's is quoted.
      for (const plan of ["monthly", "yearly"] as const) expect(s9).toContain(consentSentence("membership", locale, { plan }));
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
    const eur = (amount: number, locale: "en" | "es") => formatAmount(amount, "eur", locale);
    expect(all(LEGAL_DOCS.terms.en)).toContain(
      `Ethos for Two ${eur(membershipAmount("monthly", "eur"), "en")} a month or ${eur(membershipAmount("yearly", "eur"), "en")} a year, or, as a one-year pass, ${eur(PRODUCTS.pass.amounts.eur, "en")} for 365 days`,
    );
    expect(all(LEGAL_DOCS.terms.es)).toContain(
      `Ethos for Two, ${eur(membershipAmount("monthly", "eur"), "es")} al mes o ${eur(membershipAmount("yearly", "eur"), "es")} al año o, como pase de un año, ${eur(PRODUCTS.pass.amounts.eur, "es")} por 365 días`,
    );
  });

  // Ethos for Two is a service (docs/MEMBERSHIP.md 5.2): it renews until cancelled, cancelling is
  // not withdrawing, a withdrawal pays only for the days used, and a new price needs 30 days' notice.
  it("sell Ethos for Two as a subscription that can be cancelled and withdrawn from", () => {
    const en = { s7: section(LEGAL_DOCS.terms.en, 7), s9: withdrawal(LEGAL_DOCS.terms.en) };
    const es = { s7: section(LEGAL_DOCS.terms.es, 7), s9: withdrawal(LEGAL_DOCS.terms.es) };
    expect(en.s7).toContain("It renews automatically at the end of each month or year");
    expect(en.s7).toContain("You can cancel at any time from your account page");
    expect(en.s7).toContain("at least 30 days after we've emailed you");
    expect(en.s9).toContain("minus an amount in proportion to the days it ran");
    expect(en.s9).toContain("Cancelling, which stops the renewals (section 7), isn't withdrawing");
    expect(es.s7).toContain("Se renueva automáticamente al final de cada mes o de cada año");
    expect(es.s7).toContain("Puedes cancelarla en cualquier momento desde la página de tu cuenta");
    expect(es.s7).toContain("al menos 30 días después de que te lo hayamos comunicado");
    expect(es.s9).toContain("menos un importe proporcional a los días que estuvo activo");
    expect(es.s9).toContain("Cancelar, que detiene las renovaciones (sección 7), no es desistir");
    // Nothing still says the opposite.
    for (const doc of [LEGAL_DOCS.terms.en, LEGAL_DOCS.terms.es]) expect(all(doc)).not.toMatch(/We don't sell subscriptions|No vendemos suscripciones/);
    for (const doc of [WITHDRAW_DOCS.en, WITHDRAW_DOCS.es]) expect(all(doc)).toMatch(/Ethos for Two, (monthly|mensual)/);
  });

  it("give free accounts the catalogue's number of saved dates", () => {
    expect(section(LEGAL_DOCS.terms.en, 11)).toContain(`a free account keeps up to ${FREE_SAVED_DATES} saved dates and trips`);
    expect(section(LEGAL_DOCS.terms.es, 11)).toContain(`una cuenta gratuita guarda hasta ${FREE_SAVED_DATES} citas y viajes`);
    expect(section(LEGAL_DOCS.privacy.en, 3)).toContain("is sent to us only if you save it to your account");
    expect(section(LEGAL_DOCS.privacy.es, 3)).toContain("solo se nos envía si lo guardas en tu cuenta");
  });

  it("name no country or city the business isn't in", () => {
    for (const doc of [LEGAL_DOCS.terms, LEGAL_DOCS.privacy, WITHDRAW_DOCS]) for (const locale of ["en", "es"] as const) expect(all(doc[locale])).not.toMatch(/Spain|España|Madrid/);
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
