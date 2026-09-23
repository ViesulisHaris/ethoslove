import { describe, expect, it } from "vitest";
import { render } from "@react-email/render";
import { GiftOpenedEmail, GiftPublishedEmail, ReactionEmail, ReceiptEmail, WelcomeEmail } from "@/emails/templates";
import { consentSentence } from "@/lib/stripe/line-items";

describe("email templates", () => {
  it("render to HTML in both languages with the key facts", async () => {
    const published = await render(GiftPublishedEmail({ locale: "en", recipientName: "Ana", url: "https://ethoslove.com/g/abc123def" }));
    expect(published).toContain("Ana");
    expect(published).toContain("ethoslove.com/g/abc123def");
    const es = await render(GiftOpenedEmail({ locale: "es", recipientName: "Ana", dashboardUrl: "https://ethoslove.com/dashboard" }));
    expect(es).toContain("lo ha abierto");
    const reaction = await render(ReactionEmail({ locale: "en", recipientName: "Ana", emoji: "❤️", text: "Crying at work.", hasAudio: true, dashboardUrl: "https://x" }));
    expect(reaction).toContain("Crying at work.");
    expect(reaction).toContain("voice note");
    const receipt = await render(ReceiptEmail({ locale: "en", productLabel: "Everything", amountLabel: "$24.99", unlocks: ["All templates"], dashboardUrl: "https://x", consent: consentSentence("everything", "en") }));
    expect(receipt).toContain("$24.99");
    // It confirms the consent to immediate unlocking given at payment, in writing, in both languages.
    expect(receipt).toContain("14-day right to cancel no longer applies");
    const receiptEs = await render(ReceiptEmail({ locale: "es", productLabel: "Todo", amountLabel: "22,99 €", unlocks: ["Todas"], dashboardUrl: "https://x", consent: consentSentence("everything", "es") }));
    expect(receiptEs).toContain("derecho de desistimiento de 14 días ya no se aplica");
    const welcome = await render(WelcomeEmail({ locale: "es", siteUrl: "https://ethoslove.com" }));
    expect(welcome).toContain("Hacer un regalo");
  });

  it("quotes the withdrawal box the buyer ticked, word for word, and says it was a tick", async () => {
    const text = (html: string) => html.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
    const unlock = consentSentence("single", "en");
    const en = text(await render(ReceiptEmail({ locale: "en", productLabel: "One template", amountLabel: "€9.99", unlocks: ["Vinyl"], dashboardUrl: "https://x", consent: unlock })));
    expect(en).toContain(`At checkout you ticked: “${unlock}”`);
    expect(en).toContain("14-day right to cancel no longer applies");
    const es = text(await render(ReceiptEmail({ locale: "es", productLabel: "Una plantilla", amountLabel: "9,99 €", unlocks: ["Vinilo"], dashboardUrl: "https://x", consent: consentSentence("single", "es") })));
    expect(es).toContain(`Al pagar marcaste: «${consentSentence("single", "es")}»`);
    // A gift card keeps its right to cancel until the code is redeemed: the receipt never says it's gone.
    const card = text(await render(ReceiptEmail({ locale: "en", productLabel: "Gift card", amountLabel: "€24.99", unlocks: [], dashboardUrl: "https://x", giftCard: true, consent: consentSentence("giftcard", "en") })));
    expect(card).toContain("before the code is redeemed, reply to this email");
    expect(card).not.toContain("no longer applies");
    // Stripe couldn't show the box: nothing was ticked, so, like a sale from before the box, it keeps
    // its right to cancel (terms s.9, /legal/withdraw), and the receipt must not say it has gone.
    const notice = text(await render(ReceiptEmail({ locale: "en", productLabel: "One template", amountLabel: "€9.99", unlocks: ["Vinyl"], dashboardUrl: "https://x" })));
    expect(notice).not.toContain("you ticked");
    expect(notice).toContain("notice above the Pay button");
    expect(notice).toContain("you keep the 14-day right to cancel");
    expect(notice).not.toContain("no longer applies");
    const noticeEs = text(await render(ReceiptEmail({ locale: "es", productLabel: "Una plantilla", amountLabel: "9,99 €", unlocks: ["Vinilo"], dashboardUrl: "https://x" })));
    expect(noticeEs).toContain("conservas el derecho de desistimiento de 14 días");
    expect(noticeEs).not.toContain("ya no se aplica");
    // A pass renewal bought early starts later: the right goes when the pass year starts, not at payment.
    const pass = text(await render(ReceiptEmail({ locale: "en", productLabel: "Ethos for Two", amountLabel: "€29.00", unlocks: [], dashboardUrl: "https://x", until: "23 September 2027", consent: consentSentence("pass", "en") })));
    expect(pass).toContain("once the pass year has started, the 14-day right to cancel no longer applies");
  });
});
