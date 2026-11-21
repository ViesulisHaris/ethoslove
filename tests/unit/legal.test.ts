import { describe, expect, it } from "vitest";
import { LEGAL_DOCS, WITHDRAW_DOCS, legalDocs, type LegalDoc } from "@/content/legal";
import { CONTRIBUTION_LIMITS } from "@/lib/gift/schema";
import { GROUP_RETENTION } from "@/lib/group/limits";
import { CREATOR_COMMISSION_PCT, CREATOR_PAYOUT_MIN_EUR } from "@/lib/commerce/creators";
import { FREE_SAVED_DATES, PRODUCTS, formatAmount, groupAmount, membershipAmount } from "@/lib/pricing/products";
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

// Group cards ship switched off (lib/group/flag.ts). The terms and the privacy policy describe them,
// and quote their price, only while they are on sale: legalDocs(true). Switched off they are the
// documents they always were.
describe("legal documents and group cards", () => {
  const off = legalDocs(false);
  const on = legalDocs(true);
  const eur = (amount: number, locale: "en" | "es") => formatAmount(amount, "eur", locale);

  it("switched off, neither document mentions a group card, and the pages' default is that", () => {
    expect(LEGAL_DOCS).toEqual(off);
    for (const kind of ["terms", "privacy"] as const) for (const locale of ["en", "es"] as const) expect(all(off[kind][locale])).not.toMatch(/group card|tarjetas? en grupo/i);
  });

  it("switched on, only adds: every paragraph that was there is still there, in the same section, and no section is renumbered", () => {
    for (const kind of ["terms", "privacy"] as const)
      for (const locale of ["en", "es"] as const) {
        const before = off[kind][locale];
        const after = on[kind][locale];
        expect(after.sections.map((s) => s.heading)).toEqual(before.sections.map((s) => s.heading));
        expect(after.intro).toBe(before.intro);
        before.sections.forEach((section, i) => {
          for (const paragraph of section.paragraphs) {
            // Two sentences grow at their end (the price list, what the export holds); the rest are untouched.
            const kept = after.sections[i].paragraphs.some((p) => p === paragraph || p.startsWith(paragraph.slice(0, -1)));
            expect(kept, `${kind} ${locale} ${section.heading}: ${paragraph.slice(0, 50)}`).toBe(true);
          }
        });
      }
  });

  it("says the same in English and Spanish, section by section", () => {
    for (const kind of ["terms", "privacy"] as const) expect(on[kind].es.sections.map((s) => s.paragraphs.length)).toEqual(on[kind].en.sections.map((s) => s.paragraphs.length));
  });

  it("quotes the catalogue's price, and the step up as the difference from one template", () => {
    const step = PRODUCTS.group.amounts.eur - PRODUCTS.single.amounts.eur;
    const en = section(on.terms.en, 6);
    expect(en).toContain(`; a group card ${eur(PRODUCTS.group.amounts.eur, "en")}`);
    expect(en).toContain(`Unlocking group cards on one template costs ${eur(PRODUCTS.group.amounts.eur, "en")}`);
    expect(en).toContain(`If you already have the template, you pay ${eur(step, "en")}`);
    const es = section(on.terms.es, 6);
    expect(es).toContain(`; una tarjeta en grupo, ${eur(PRODUCTS.group.amounts.eur, "es")}`);
    expect(es).toContain(`Si ya tienes la plantilla, pagas ${eur(step, "es")}`);
    // The step up is what checkout charges someone who holds the template (groupAmount), to the cent.
    for (const currency of ["eur", "usd", "gbp"] as const) expect(groupAmount(currency, ["some-template"], "some-template")).toBe(PRODUCTS.group.amounts[currency] - PRODUCTS.single.amounts[currency]);
  });

  it("says who never pays, what it is not part of, and how many can sign", () => {
    const en = section(on.terms.en, 6);
    expect(en).toContain(`Up to ${CONTRIBUTION_LIMITS.max} people can add to one card.`);
    expect(en).toContain("neither “Everything” nor Ethos for Two includes it");
    expect(en).toContain("The people you invite never pay, and we never collect or hold money from them or for you.");
    const es = section(on.terms.es, 6);
    expect(es).toContain(`hasta ${CONTRIBUTION_LIMITS.max} personas`);
    expect(es).toContain("ni «Todo» ni Ethos for Two la incluyen");
    expect(es).toContain("Las personas a las que invitas no pagan nunca");
  });

  it("the sender chooses what goes in and answers for it, and a note can be reported where the screens say", () => {
    expect(section(on.terms.en, 3)).toContain("you choose what goes in, and you answer for it");
    expect(section(on.terms.es, 3)).toContain("tú eliges lo que entra y respondes de ello");
    // The three links, by the words the screens use.
    expect(section(on.terms.en, 13)).toContain("“Report a note”");
    expect(section(on.terms.en, 13)).toContain("“Report this page”");
    expect(section(on.terms.es, 13)).toContain("«Denunciar una nota»");
    expect(section(on.terms.es, 13)).toContain("«Denunciar esta página»");
  });

  it("the privacy policy keeps the daily job's own numbers", () => {
    const en = section(on.privacy.en, 11);
    const es = section(on.privacy.es, 11);
    expect(en).toContain(`after ${GROUP_RETENTION.undoHours} hours`);
    expect(es).toContain(`a las ${GROUP_RETENTION.undoHours} horas`);
    expect(GROUP_RETENTION.unconfirmedDays).toBe(7);
    expect(en).toContain("never confirmed: seven days");
    expect(es).toContain("sin confirmar: siete días");
    expect(en).toContain(`${GROUP_RETENTION.afterSentDays} days after the card is sent`);
    expect(es).toContain(`${GROUP_RETENTION.afterSentDays} días después de que la tarjeta se envíe`);
    expect(en).toContain(`${GROUP_RETENTION.afterClosedDays} days after its link stops taking notes`);
    expect(es).toContain(`${GROUP_RETENTION.afterClosedDays} días después de que su enlace deje de admitir notas`);
  });

  it("says what a contributor is asked for, that no IP address is kept, and that the address goes with its one email", () => {
    const en = section(on.privacy.en, 1);
    expect(en).toContain("You need no account.");
    expect(en).toContain("We don't store your IP address with any of this.");
    expect(en).toContain("we delete your address as that email goes");
    expect(section(on.privacy.en, 13)).toContain("without anyone's email address");
    expect(section(on.privacy.en, 14)).toContain("you must confirm that you are 16 or older");
    const es = section(on.privacy.es, 1);
    expect(es).toContain("No necesitas cuenta.");
    expect(es).toContain("No guardamos tu dirección IP con nada de esto.");
    expect(section(on.privacy.es, 14)).toContain("debes confirmar que tienes 16 años o más");
  });

  it("names no country or city the business isn't in, and promises nothing the filler list bans", () => {
    for (const kind of ["terms", "privacy"] as const) for (const locale of ["en", "es"] as const) expect(all(on[kind][locale])).not.toMatch(/Spain|España|Madrid|unforgettable|inolvidable|perfect for/i);
  });
});
