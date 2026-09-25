import { describe, expect, it } from "vitest";
import { render } from "@react-email/render";
import { CheckoutRecoveryEmail, GiftCardEmail, PassRenewalEmail, PassWelcomeEmail, ReminderEmail, reminderHeading } from "@/emails/lifecycle";
import { GiftOpenedEmail, ReceiptEmail } from "@/emails/templates";
import { MembershipEndedEmail, MembershipPaymentEmail, MembershipRenewalEmail, MembershipWelcomeEmail, membershipSubject } from "@/emails/membership";
import { consentSentence } from "@/lib/stripe/line-items";

/** React escapes apostrophes in text; compare against what a reader sees. */
const text = (html: string) => html.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

describe("lifecycle emails", () => {
  it("checkout recovery says why it came and how to stop it, in both languages", async () => {
    const en = text(await render(CheckoutRecoveryEmail({ locale: "en", url: "https://checkout.stripe.com/c/pay/cs_test_1", templateName: "Pack Your Bags", unsubscribeUrl: "https://ethos.test/api/email/unsubscribe?t=abc" })));
    expect(en).toContain("Your gift is still waiting.");
    expect(en).toContain("Pack Your Bags");
    expect(en).toContain("https://checkout.stripe.com/c/pay/cs_test_1");
    expect(en).toContain("ticked the box");
    expect(en).toContain("https://ethos.test/api/email/unsubscribe?t=abc");
    expect(en).toContain("Unsubscribe");
    const es = text(await render(CheckoutRecoveryEmail({ locale: "es", url: "https://checkout.stripe.com/x", unsubscribeUrl: "https://ethos.test/u" })));
    // No template (a pass, a pack, a gift card): it says a checkout was left, without calling it a gift.
    expect(es).toContain("Tu compra sigue guardada.");
    expect(es).not.toContain("regalo sigue");
    expect(es).toContain("Empezaste una compra en Ethos");
    expect(es).toContain("Terminar la compra");
    expect(es).toContain("Darme de baja");
  });

  it("pass welcome leaves the invite out when the partner carried over from the last year", async () => {
    const html = text(await render(PassWelcomeEmail({ locale: "en", inviteUrl: "https://ethos.test/for-two/join?code=AB12CD", endsAt: "23 September 2027", makeUrl: "https://ethos.test/templates", partnerJoined: true })));
    expect(html).toContain("Your partner is already in");
    expect(html).not.toContain("for-two/join");
    const es = text(await render(PassWelcomeEmail({ locale: "es", inviteUrl: "https://ethos.test/es/for-two/join?code=AB12CD", endsAt: "23 de septiembre de 2027", makeUrl: "https://ethos.test/es/templates", partnerJoined: true })));
    expect(es).toContain("Tu pareja ya está dentro");
  });

  it("pass welcome carries the end date and the invite link", async () => {
    const html = text(await render(PassWelcomeEmail({ locale: "en", inviteUrl: "https://ethos.test/for-two/join?code=AB12CD", endsAt: "23 September 2027", makeUrl: "https://ethos.test/templates" })));
    expect(html).toContain("Until 23 September 2027");
    expect(html).toContain("ethos.test/for-two/join?code=AB12CD");
    expect(html).toContain("doesn't renew by itself");
    const es = text(await render(PassWelcomeEmail({ locale: "es", inviteUrl: "https://ethos.test/es/for-two/join?code=AB12CD", endsAt: "23 de septiembre de 2027", makeUrl: "https://ethos.test/es/templates" })));
    expect(es).toContain("Hasta el 23 de septiembre de 2027");
    expect(es).toContain("No se renueva solo");
  });

  it("pass renewal names the day and has the one-tap renew", async () => {
    const html = text(await render(PassRenewalEmail({ locale: "en", endsAt: "7 October 2027", renewUrl: "https://ethos.test/for-two?renew=1" })));
    expect(html).toContain("Your year ends on 7 October 2027.");
    expect(html).toContain("https://ethos.test/for-two?renew=1");
    expect(html).toContain("Renew for another year");
    expect(html).toContain("nothing is charged");
  });

  it("pass renewal, while Ethos for Two is a subscription, points to monthly or yearly from the end date", async () => {
    const html = text(await render(PassRenewalEmail({ locale: "en", endsAt: "7 October 2027", renewUrl: "https://ethos.test/pricing#for-two", subscriptions: true })));
    expect(html).toContain("To carry on after that, choose monthly or yearly from 7 October 2027.");
    expect(html).toContain("See monthly and yearly");
    expect(html).not.toContain("Renew for another year");
    const es = text(await render(PassRenewalEmail({ locale: "es", endsAt: "7 de octubre de 2027", renewUrl: "https://ethos.test/es/pricing#for-two", subscriptions: true })));
    expect(es).toContain("elige mensual o anual a partir del 7 de octubre de 2027");
  });

  it("membership welcome: what it covers, the plan and its renewal, how to cancel, the invite and the box ticked", async () => {
    const consent = consentSentence("membership", "en", { plan: "monthly", currency: "eur" });
    const html = text(await render(MembershipWelcomeEmail({ locale: "en", plan: "monthly", amount: "€4.99", renewsOn: "24 October 2026", inviteUrl: "https://ethos.test/for-two/join?code=abcdefghij", consent, datesUrl: "https://ethos.test/dates" })));
    expect(html).toContain("Ethos for Two is on.");
    expect(html).toContain("Unlimited saved dates and trips, shared between you");
    expect(html).toContain("ethos.test/for-two/join?code=abcdefghij");
    expect(html).toContain("Your plan: €4.99 a month, renewing on 24 October 2026 and every month after that until you cancel.");
    expect(html).toContain("Cancel any time from your account page");
    expect(html).toContain(`At checkout you ticked: “${consent}”`);
    expect(html).toContain("we refund what you paid, less the days you've used");
    expect(html).toContain("Plan a date");
    expect(membershipSubject.welcome("en")).toBe("Welcome to Ethos for Two");

    const yearly = text(await render(MembershipWelcomeEmail({ locale: "es", plan: "yearly", amount: "29,99 €", renewsOn: "24 de septiembre de 2027", consent: null, datesUrl: "https://ethos.test/es/dates" })));
    expect(yearly).toContain("Tu suscripción: 29,99 € al año, se renueva el 24 de septiembre de 2027");
    expect(yearly).toContain("Te escribiremos una semana antes de cada renovación.");
    // Nothing ticked: the right to withdraw is a full refund, and no invite once the partner is in.
    expect(yearly).toContain("te devolvemos el importe íntegro");
    expect(yearly).not.toContain("for-two/join");
    expect(membershipSubject.welcome("es")).toBe("Bienvenidos a Ethos for Two");
  });

  it("membership renewal reminder: the day, the amount, and that not renewing costs nothing", async () => {
    const html = text(await render(MembershipRenewalEmail({ locale: "en", renewsOn: "1 October 2027", amount: "€29.99", manageUrl: "https://ethos.test/account#for-two" })));
    expect(html).toContain("Your year renews on 1 October 2027.");
    expect(html).toContain("On 1 October 2027 we'll charge €29.99 for another year of Ethos for Two, for both of you.");
    expect(html).toContain("you keep everything until 1 October 2027, and nothing more is charged");
    expect(html).toContain("Manage Ethos for Two");
    const monthly = text(await render(MembershipRenewalEmail({ locale: "en", renewsOn: "1 October 2027", amount: "€29.99", monthly: "€4.99", manageUrl: "https://x" })));
    expect(monthly).toContain("it switches to monthly, as you asked: €4.99 a month until you cancel");
    expect(monthly).not.toContain("we'll charge €29.99");
    expect(membershipSubject.renewal("es", "1 de octubre de 2027")).toBe("Ethos for Two se renueva el 1 de octubre de 2027");
  });

  it("membership payment problem: update the card, or confirm with the bank", async () => {
    const failed = text(await render(MembershipPaymentEmail({ locale: "en", kind: "failed", amount: "€4.99", until: "31 October 2026", url: "https://ethos.test/account#for-two" })));
    expect(failed).toContain("We couldn't take your payment.");
    expect(failed).toContain("Your card didn't go through for €4.99. Ethos for Two stays on for both of you until 31 October 2026 while we try again");
    expect(failed).toContain("Update my card");
    const confirm = text(await render(MembershipPaymentEmail({ locale: "es", kind: "action_required", amount: "4,99 €", until: "31 de octubre de 2026", url: "https://invoice.stripe.com/i/x" })));
    expect(confirm).toContain("Tu banco quiere que confirmes el pago de 4,99 €.");
    expect(confirm).toContain("https://invoice.stripe.com/i/x");
    expect(confirm).toContain("Confirmar el pago");
  });

  it("membership ended: what stays, and the way back", async () => {
    const html = text(await render(MembershipEndedEmail({ locale: "en", pricingUrl: "https://ethos.test/pricing#for-two" })));
    expect(html).toContain("Ethos for Two has ended.");
    expect(html).toContain("Your saved dates and trips are still in your account");
    expect(html).toContain("Get Ethos for Two again");
    expect(html).toContain("https://ethos.test/pricing#for-two");
    const es = text(await render(MembershipEndedEmail({ locale: "es", pricingUrl: "https://ethos.test/es/pricing#for-two" })));
    expect(es).toContain("Ethos for Two ha terminado.");
  });

  it("gift card shows the code, how to redeem it and who it's for", async () => {
    const html = text(await render(GiftCardEmail({ locale: "en", code: "ETHS-7K2P-QX9M", redeemUrl: "https://ethos.test/redeem?code=ETHS-7K2P-QX9M", recipientName: "Ana", note: "Happy birthday, you" })));
    expect(html).toContain("For Ana.");
    expect(html).toContain("ETHS-7K2P-QX9M");
    expect(html).toContain("ethos.test/redeem");
    expect(html).toContain("Happy birthday, you");
    expect(html).toContain("within 24 months");
    const es = text(await render(GiftCardEmail({ locale: "es", code: "ETHS-7K2P-QX9M", redeemUrl: "https://ethos.test/es/redeem" })));
    expect(es).toContain("Tu tarjeta regalo.");
    expect(es).toContain("no se puede canjear por dinero");
  });

  it("reminder names the person and the day, and links to make and remove", async () => {
    const html = text(await render(ReminderEmail({ locale: "en", recipientName: "Ana", occasion: "birthday", date: "3 October", makeUrl: "https://ethos.test/occasions/birthday?ref=email-reminder", removeUrl: "https://ethos.test/api/reminders/remove?t=x" })));
    expect(html).toContain("Ana's birthday is on 3 October.");
    expect(html).toContain("Make Ana something");
    expect(html).toContain("https://ethos.test/occasions/birthday?ref=email-reminder");
    expect(html).toContain("Remove this reminder");
    expect(html).toContain("https://ethos.test/api/reminders/remove?t=x");
    expect(reminderHeading("anniversary", "es", "Ana", "3 de octubre")).toBe("Tu aniversario con Ana es el 3 de octubre.");
    expect(reminderHeading("valentines", "en", "Ana", "14 February")).toBe("Valentine's Day is on 14 February.");
    const es = text(await render(ReminderEmail({ locale: "es", recipientName: "Ana", occasion: "other", date: "3 de octubre", makeUrl: "https://x", removeUrl: "https://y" })));
    expect(es).toContain("Un día para Ana: el 3 de octubre.");
    expect(es).toContain("Quitar este recordatorio");
  });

  it("receipt offers Everything for the difference, and says until when for a pass", async () => {
    const single = text(await render(ReceiptEmail({ locale: "en", productLabel: "One template", amountLabel: "€9.99", unlocks: ["Pack Your Bags"], dashboardUrl: "https://x", upgrade: { url: "https://ethos.test/pricing?upgrade=1", amountLabel: "€15.00" } })));
    expect(single).toContain("For you, Everything is now €15.00");
    expect(single).toContain("https://ethos.test/pricing?upgrade=1");
    expect(single).toContain("It's yours, forever.");
    const pass = text(await render(ReceiptEmail({ locale: "es", productLabel: "Ethos for Two", amountLabel: "29,00 €", unlocks: [], dashboardUrl: "https://x", until: "23 de septiembre de 2027" })));
    expect(pass).toContain("Es tuyo hasta el 23 de septiembre de 2027.");
    expect(pass).not.toContain("Desbloqueado:");
  });

  it("a gift card receipt keeps the right to cancel until the code is redeemed", async () => {
    const card = text(await render(ReceiptEmail({ locale: "en", productLabel: "Give Everything", amountLabel: "€24.99", unlocks: [], dashboardUrl: "https://x", giftCard: true })));
    expect(card).toContain("The code comes in its own email.");
    expect(card).toContain("as long as the code hasn't been redeemed");
    expect(card).not.toContain("no longer applies");
    expect(card).not.toContain("forever");
    const es = text(await render(ReceiptEmail({ locale: "es", productLabel: "Regálalo todo", amountLabel: "24,99 €", unlocks: [], dashboardUrl: "https://x", giftCard: true })));
    expect(es).toContain("siempre que el código no se haya canjeado");
    expect(es).not.toContain("ya no se aplica");
    // Everything else confirms the waiver the buyer ticked, on a durable medium.
    const single = text(await render(ReceiptEmail({ locale: "en", productLabel: "One template", amountLabel: "€9.99", unlocks: ["The Letter"], dashboardUrl: "https://x", consent: "I ask Ethos to unlock my purchase straight away." })));
    expect(single).toContain("the 14-day right to cancel no longer applies");
  });

  it("first open offers the next gift", async () => {
    const html = text(await render(GiftOpenedEmail({ locale: "en", recipientName: "Ana", dashboardUrl: "https://x", nextUrl: "https://ethos.test/templates?ref=email-opened" })));
    expect(html).toContain("Start the next gift");
    expect(html).toContain("https://ethos.test/templates?ref=email-opened");
    const without = text(await render(GiftOpenedEmail({ locale: "es", recipientName: "Ana", dashboardUrl: "https://x" })));
    expect(without).not.toContain("siguiente regalo");
  });
});
