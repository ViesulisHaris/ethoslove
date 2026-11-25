import { describe, expect, it } from "vitest";
import { LEGAL_DOCS, LETTER_LEGAL, WITHDRAW_DOCS, legalDocs, type LegalDoc } from "@/content/legal";
import { CONTRIBUTION_LIMITS } from "@/lib/gift/schema";
import { GROUP_RETENTION } from "@/lib/group/limits";
import { CREATOR_COMMISSION_PCT, CREATOR_PAYOUT_MIN_EUR } from "@/lib/commerce/creators";
import { FREE_SAVED_DATES, PRODUCTS, formatAmount, groupAmount, membershipAmount } from "@/lib/pricing/products";
import { consentSentence } from "@/lib/stripe/line-items";
import { ROOMS_KEY } from "@/lib/analytics/rooms-marker";
import { STARTED_NOTE } from "@/lib/attribution/recipient-loop";
import { fillerIn } from "./filler";

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
      for (const product of ["single", "extras", "pack", "upgrade", "pass", "giftcard", "pair"] as const) expect(s9).toContain(consentSentence(product, locale));
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

  // A reader from a reminder e-mail may pay a gift with the next two in one payment (kind "with_pair").
  it("cover the two more gifts bought with a gift from a reminder e-mail, and what of that payment is refunded", () => {
    const en = all(LEGAL_DOCS.terms.en);
    const es = all(LEGAL_DOCS.terms.es);
    const pair = { en: formatAmount(PRODUCTS.pair.amounts.eur, "eur", "en"), es: formatAmount(PRODUCTS.pair.amounts.eur, "eur", "es") };
    expect(en).toContain("When you come from one of our reminder emails, we may instead offer them with the gift itself, in the same payment");
    expect(en).toContain("Bought with a gift in the same payment, it is the two's part of that payment");
    expect(en).toContain(pair.en);
    expect(es).toContain("Si llegas desde uno de nuestros correos de recordatorio, puede que te los ofrezcamos con el propio regalo, en el mismo pago");
    expect(es).toContain("Si los compraste con un regalo en el mismo pago, lo que se devuelve así es la parte de los dos");
    expect(es).toContain(pair.es);
  });

  // Two more gifts paid with Apple Pay or Google Pay on our page tick nothing: a used one can't be
  // said to be beyond cancelling for them, in section 6 or 9.
  it("keep the 14 days for two more gifts bought with the wallet, even once used", () => {
    const en = all(LEGAL_DOCS.terms.en);
    const es = all(LEGAL_DOCS.terms.es);
    expect(en).toContain("Bought with Apple Pay or Google Pay on our page, there is no box to tick, so you keep the 14-day right to withdraw in section 9 even for a gift you have used");
    expect(withdrawal(LEGAL_DOCS.terms.en)).toContain("you keep the 14-day right to withdraw, even for a gift you have used");
    expect(es).toContain("conservas el derecho de desistimiento de 14 días de la sección 9 aunque ya hayas usado un regalo");
    expect(withdrawal(LEGAL_DOCS.terms.es)).toContain("conservas el derecho de desistimiento de 14 días, aunque ya hayas usado un regalo");
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

  it("the privacy policy names the rooms entry, in both languages, beside the first visit's", () => {
    const sentences = {
      en: /We keep which sections of the site you opened[^.]*\./,
      es: /Guardamos qué secciones de la web has abierto[^.]*\./,
    };
    for (const locale of ["en", "es"] as const) {
      const text = all(LEGAL_DOCS.privacy[locale]);
      expect(text).toContain(ROOMS_KEY);
      const sentence = sentences[locale].exec(text)?.[0] ?? "";
      expect(sentence).toContain("30");
      expect(text.indexOf(ROOMS_KEY)).toBeGreaterThan(text.indexOf("ethos-first-visit"));
      expect(text.indexOf(ROOMS_KEY)).toBeLessThan(text.indexOf("ethos-free-tier"));
      expect(sentence).not.toMatch(/Spain|España|!/);
    }
    // loop2-C8: the rooms sentence said "also keep", right before the next one's "also keep".
    expect(all(LEGAL_DOCS.privacy.en)).not.toContain("also keep, in your browser's storage (ethos-rooms");
    expect(all(LEGAL_DOCS.privacy.es)).not.toContain("también, en el almacenamiento de tu navegador (ethos-rooms");
    // loop2-D3: the sentence read as cut up (an aside between commas before its object), "more than
    // one" had to reach back three clauses, "only that count is sent" was untrue (one signal is sent,
    // nothing is counted on the device), and "a distancia" read as a loose adverb in a list of nouns.
    const en = sentences.en.exec(all(LEGAL_DOCS.privacy.en))?.[0] ?? "";
    const es = sentences.es.exec(all(LEGAL_DOCS.privacy.es))?.[0] ?? "";
    expect(en).toContain("in your browser's storage (ethos-rooms, 30 days), so we can count how many visitors use more than one section;");
    expect(en).toContain("only a signal that you used two is sent, never the list");
    expect(en).not.toContain("only that count is sent");
    expect(es).toContain("(regalos, citas, viajes, relaciones a distancia, juegos)");
    expect(es).toContain("en el almacenamiento de tu navegador (ethos-rooms, 30 días), para contar cuántas personas usan más de una sección;");
    expect(es).toContain("solo se envía un aviso de que has usado dos, nunca la lista");
    expect(es).not.toContain("ese recuento");
  });

  // loop2-D2: the once-per-visit note is written for every recipient who starts a gift of their own
  // (the badge, "make one for someone else", the kept-gift reminder), not only for a reply, and
  // whatever the cookie answer is, so the policy names it and what it is for.
  it("the privacy policy names the note that counts a recipient's own gift once, in both languages", () => {
    expect(STARTED_NOTE).toBe("ethos-recipient-started");
    expect(section(LEGAL_DOCS.privacy.en, 12)).toContain("a note, kept until you close the tab, that you started a gift of your own after receiving one, so it is counted only once");
    expect(section(LEGAL_DOCS.privacy.es, 12)).toContain("una nota, hasta que cierras la pestaña, de que has empezado un regalo propio después de recibir uno, para contarlo una sola vez");
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
    expect(section(on.terms.es, 13)).toContain("«Avisar de una nota»");
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
    // "Within 7 days" is what everyone who adds a note agreed to; the job, which runs once a day,
    // deletes a day inside it so that the sentence holds at any hour.
    expect(en).toContain(`within ${GROUP_RETENTION.sentPromiseDays} days of the card being sent`);
    expect(es).toContain(`en los ${GROUP_RETENTION.sentPromiseDays} días siguientes al envío de la tarjeta`);
    expect(GROUP_RETENTION.afterSentDays).toBeLessThan(GROUP_RETENTION.sentPromiseDays);
    // Counted from the day the link was due to close, which is what the job counts from, not from the day the sender closed it by hand.
    expect(en).toContain(`${GROUP_RETENTION.afterClosedDays} days after the date its link was due to close, even if the person putting the card together closed it sooner`);
    expect(es).toContain(`${GROUP_RETENTION.afterClosedDays} días después de la fecha en que su enlace debía cerrarse, aunque quien prepara la tarjeta lo cerrase antes`);
    for (const text of [en, es]) expect(text).not.toMatch(/stops taking notes|deje de admitir notas/);
  });

  it("promises the finished card only to someone whose note is in it, and says how a note is taken back and when it can't be", () => {
    const en = section(on.privacy.en, 1);
    const es = section(on.privacy.es, 1);
    expect(en).toContain("then, if your note is in the card, one email with the card's link once it is sent");
    expect(en).toContain("If your note isn't in the card, no second email comes, and the address is deleted with the note.");
    expect(es).toContain("después, si tu nota va en la tarjeta, un correo con su enlace cuando se envíe");
    expect(es).toContain("Si tu nota no va en la tarjeta, no llega un segundo correo y la dirección se borra con la nota.");
    // The key the page keeps is in the browser's storage (it outlives the tab), and the policy says so.
    expect(en).toContain("that browser keeps a random key for each note you added, in its own storage for that page");
    expect(en).toContain("If you have cleared the browser's storage, or once the card is sent, write to us with the card's link.");
    expect(es).toContain("ese navegador guarda una clave aleatoria por cada nota que añadiste, en su propio almacenamiento para esa página");
    expect(es).toContain("Si has borrado el almacenamiento del navegador, o una vez enviada la tarjeta, escríbenos con el enlace de la tarjeta.");
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

describe("the monthly idea in the documents", () => {
  const MODES = ["optin", "buyers", "all"] as const;

  it("L1 name it, say how to stop it and that stopping never takes a gift offline, in both languages, only while it is on", () => {
    const off = legalDocs(false);
    expect(legalDocs(false, "off")).toEqual(off);
    for (const locale of ["en", "es"] as const) expect(all(off.terms[locale]) + all(off.privacy[locale])).not.toMatch(/monthly idea|gift idea a month|idea del mes|idea de regalo al mes/);
    for (const mode of MODES) {
      const docs = legalDocs(false, mode);
      // The same shape in both languages, section by section.
      for (const kind of ["terms", "privacy"] as const) expect(docs[kind].es.sections.map((s) => s.paragraphs.length)).toEqual(docs[kind].en.sections.map((s) => s.paragraphs.length));
      const en = { t5: section(docs.terms.en, 5), t6: section(docs.terms.en, 6), p1: section(docs.privacy.en, 1), p8: section(docs.privacy.en, 8), p11: section(docs.privacy.en, 11), p12: section(docs.privacy.en, 12), p13: section(docs.privacy.en, 13) };
      const es = { t5: section(docs.terms.es, 5), t6: section(docs.terms.es, 6), p1: section(docs.privacy.es, 1), p8: section(docs.privacy.es, 8), p11: section(docs.privacy.es, 11), p12: section(docs.privacy.es, 12), p13: section(docs.privacy.es, 13) };
      expect(en.t5).toContain("one gift idea a month, for a year after your last gift");
      expect(en.t5).toContain("stop these emails with the link in any of them or on your account's reminders page; they stay off if you send another gift, and nothing happens to the gifts you've sent");
      expect(en.t6).toContain("The first monthly idea email (section 5) may carry one, once per account");
      expect(en.p1).toContain("The monthly idea:");
      expect(en.p1).toContain("it has no tracking pixel");
      // A purchase from the email's link carries its ref and the one-time price (checkout-source.ts,
      // personal-price.ts): the policy says so instead of "we don't record who taps its links" alone (monthly-D2).
      expect(en.p1).toContain("If you buy after tapping one, we note with that purchase that it came from this email");
      expect(es.p1).toContain("Si compras después de pulsar uno, anotamos con esa compra que vino de este correo");
      // A scheduled gift counts from the day it opens (ideaSince), and the Terms say so (monthly-D11).
      expect(en.t5).toContain("the day of the month your gift went out (for a gift you scheduled, the day it opens)");
      expect(es.t5).toContain("el día del mes en que salió tu regalo (si lo programaste, el día en que se abre)");
      expect(en.p1).toContain("your gifts stay online");
      // The legitimate-interest basis is claimed only for whom the setting sends it to without a box:
      // everyone in "all", customers in "buyers", nobody in "optin" (consent, the box, covers it).
      if (mode === "all") expect(en.p8).toContain("send the monthly idea to people who have sent a gift");
      else if (mode === "buyers") expect(en.p8).toContain("send the monthly idea to customers who have sent a gift");
      else expect(en.p8).not.toMatch(/send the monthly idea to/);
      // Consent covers the idea only through the offers box that names it; the Terms box a free sender
      // ticks in "all" is not a consent to it (that sender is under the legitimate interest above), so
      // the consent clause names its box and can't be read as the Terms box too.
      expect(en.p8).toContain("where the box for offer emails you ticked names it, the monthly idea");
      expect(es.p8).toContain("si la casilla de los correos de ofertas que marcaste la nombra, la idea del mes");
      expect(en.p8).not.toContain("where the box you ticked names it");
      if (mode === "optin") expect(es.p8).not.toMatch(/enviar la idea del mes a/);
      // The send screen's sentence says what that setting really shows: a button only where the line
      // with "Don't send these" is drawn after a send (offer-emails-box.tsx ideaNotice), else the box.
      if (mode === "optin") {
        expect(en.t5).not.toMatch(/button/);
        expect(en.t5).toContain("unticking it there turns it off");
        expect(es.t5).not.toMatch(/botón/);
      } else expect(en.t5).toContain("with a button");
      if (mode === "buyers") expect(en.t5).toContain("unticking the box turns it off too");
      expect(en.p11).toContain("The monthly idea: its record, until you delete your account");
      expect(en.p12).toContain("from one of our emails, until that price ends");
      expect(en.p13).toContain("reminders, the monthly idea, views");
      expect(es.t5).toContain("una idea de regalo al mes, durante un año desde tu último regalo");
      expect(es.t5).toContain("siguen desactivados aunque envíes otro regalo, y a los regalos que has enviado no les pasa nada");
      expect(es.t6).toContain("El primer correo de la idea del mes (sección 5) puede traer uno");
      expect(es.p1).toContain("La idea del mes:");
      expect(es.p1).toContain("tus regalos siguen en línea");
      if (mode === "all") expect(es.p8).toContain("enviar la idea del mes a quienes han enviado un regalo");
      if (mode === "buyers") expect(es.p8).toContain("enviar la idea del mes a los clientes que han enviado un regalo");
      expect(es.p11).toContain("La idea del mes: su registro");
      expect(es.p12).toContain("desde uno de nuestros correos, hasta que");
      expect(es.p13).toContain("recordatorios, la idea del mes, visualizaciones");
      // The sentence "no other emails and no newsletters" stays the last word of privacy 1's offers paragraph.
      const p1 = docs.privacy.en.sections[0].paragraphs;
      expect(p1.findIndex((p) => p.startsWith("The monthly idea:"))).toBe(p1.findIndex((p) => p.startsWith("Offer emails:")) - 1);
      // The free version comes with it only where every sender gets it.
      const free = section(docs.terms.en, 1).includes("The free version comes with one email a month from us");
      expect(free).toBe(mode === "all");
      expect(section(docs.terms.es, 1).includes("La versión gratuita incluye un correo nuestro al mes")).toBe(mode === "all");
    }
  });

  it("L2 the cookie line no longer says offer emails only, no percentage appears, and nothing names a country it shouldn't", () => {
    for (const mode of MODES) {
      const docs = legalDocs(false, mode);
      for (const locale of ["en", "es"] as const) {
        expect(section(docs.privacy[locale], 12)).not.toMatch(/offer emails, until|correos de ofertas, hasta/);
        for (const kind of ["terms", "privacy"] as const) {
          expect(all(docs[kind][locale])).not.toMatch(/\d+ ?%[^)]*(off|de descuento)|a third off|un tercio/i);
          expect(all(docs[kind][locale])).not.toMatch(/Spain|España|Madrid/);
        }
      }
    }
    // With group cards on as well, every change still finds its place.
    expect(() => legalDocs(true, "all")).not.toThrow();
  });
});

// MONTHLY_LEGAL_OUT=<file> writes every paragraph the monthly idea changes, old and new, in both
// languages, for the owner's approval (docs/marketing/growth-build/reports/monthly-legal-changes.md).
describe("the monthly idea's legal changes, written out", () => {
  const out = process.env.MONTHLY_LEGAL_OUT;
  it.skipIf(!out)("writes the old and new paragraphs", async () => {
    const { writeFileSync } = await import("node:fs");
    const before = legalDocs(false);
    const lines: string[] = [];
    for (const mode of ["all", "buyers", "optin"] as const) {
      const after = legalDocs(false, mode);
      lines.push(`## Setting \`${mode}\``, "");
      for (const kind of ["terms", "privacy"] as const)
        for (const locale of ["en", "es"] as const) {
          const old = before[kind][locale];
          const now = after[kind][locale];
          for (const [i, section] of now.sections.entries()) {
            const was = old.sections[i].paragraphs;
            const added = section.paragraphs.filter((p) => !was.includes(p));
            const gone = was.filter((p) => !section.paragraphs.includes(p));
            if (added.length === 0 && gone.length === 0) continue;
            lines.push(`### ${kind === "terms" ? "Terms" : "Privacy policy"} (${locale}), ${section.heading}`, "");
            for (const p of gone) lines.push("**Old:**", "", `> ${p}`, "");
            for (const p of added) lines.push(gone.length ? "**New:**" : "**New paragraph:**", "", `> ${p}`, "");
          }
        }
    }
    writeFileSync(out!, lines.join("\n"));
  });
});

// The date letter ships switched off (lib/lifecycle/date-letter-flag.ts). The privacy policy
// describes it only while DATE_LETTER=on (LETTER_LEGAL), and its changes must leave the monthly
// idea's in place whatever that setting is.
describe("the date letter in the documents", () => {
  const IDEAS = ["off", "optin", "buyers", "all"] as const;
  const letterIn = (doc: LegalDoc) => all(doc).match(/date letter|carta de citas/gi) ?? [];

  it("L1 switched off, both documents are what they were and never name it", () => {
    for (const group of [false, true]) {
      for (const idea of IDEAS) {
        const off = legalDocs(group, idea);
        expect(legalDocs(group, idea, false)).toEqual(off);
        for (const kind of ["terms", "privacy"] as const) for (const locale of ["en", "es"] as const) expect(letterIn(off[kind][locale])).toEqual([]);
      }
    }
  });

  it("L2 switched on, only adds: the terms unchanged, every paragraph still there or one of its changed sentences, no section renumbered", () => {
    for (const group of [false, true]) {
      for (const idea of IDEAS) {
        const off = legalDocs(group, idea);
        const on = legalDocs(group, idea, true);
        expect(on.terms).toEqual(off.terms);
        for (const locale of ["en", "es"] as const) {
          const edits = LETTER_LEGAL[locale];
          const before = off.privacy[locale];
          const after = on.privacy[locale];
          expect(after.sections.map((s) => s.heading)).toEqual(before.sections.map((s) => s.heading));
          for (const [i, s] of before.sections.entries()) {
            const n = Number(s.heading.split(".")[0]);
            for (const p of s.paragraphs) {
              const changed = edits.filter((e) => e.section === n && "find" in e && p.includes(e.find)).reduce((text, e) => ("find" in e ? text.replace(e.find, "after" in e ? e.find + e.after : e.replace) : text), p);
              expect(after.sections[i].paragraphs, `${group} ${idea} ${locale} §${n}`).toContain(changed);
            }
            const added = edits.filter((e) => e.section === n && "paragraphBefore" in e).length;
            expect(after.sections[i].paragraphs.length, `${group} ${idea} ${locale} §${n}`).toBe(s.paragraphs.length + added);
          }
        }
        expect(on.privacy.es.sections.map((s) => s.paragraphs.length)).toEqual(on.privacy.en.sections.map((s) => s.paragraphs.length));
      }
    }
  });

  it("L3 says what is kept and for how long, how it stops, and what an account's deletion does, in both languages", () => {
    const on = legalDocs(false, "off", true).privacy;
    const words = {
      en: ["Thursdays", "confirming email", "Resend", "stops it at once", "delete an account with the same address", "no tracking pixel"],
      es: ["jueves", "correo de confirmación", "Resend", "la detiene al momento", "eliminas una cuenta con la misma dirección", "píxel de seguimiento"],
    };
    for (const locale of ["en", "es"] as const) {
      const one = section(on[locale], 1);
      for (const w of words[locale]) expect(one, `${locale}: ${w}`).toContain(w);
      const own = on[locale].sections.find((s) => s.heading.startsWith("1. "))!.paragraphs.find((p) => /^(The date letter|La carta de citas): /.test(p))!;
      expect(own.match(/30 (days|días)/g), locale).toHaveLength(2);
      expect(all(on[locale])).not.toMatch(/no newsletters|ni boletines/);
      expect(all(on[locale])).not.toMatch(/Spain|España|Madrid/);
      expect(fillerIn(all(on[locale]), locale)).toEqual([]);
      expect(section(on[locale], 11)).toMatch(locale === "en" ? /The date letter: an address never confirmed, 30 days/ : /La carta de citas: una dirección sin confirmar, 30 días/);
      expect(section(on[locale], 13)).toMatch(locale === "en" ? /date letter sign-up, as a JSON file/ : /carta de citas, en un archivo JSON/);
    }
  });
});
