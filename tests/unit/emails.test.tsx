import { describe, expect, it } from "vitest";
import { render } from "@react-email/render";
import { GiftOpenedEmail, GiftPublishedEmail, ReactionEmail, ReceiptEmail, WelcomeEmail } from "@/emails/templates";

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
    const receipt = await render(ReceiptEmail({ locale: "en", productLabel: "Everything", amountLabel: "$24.99", unlocks: ["All templates"], dashboardUrl: "https://x" }));
    expect(receipt).toContain("$24.99");
    // It confirms the consent to immediate unlocking given at payment, in writing, in both languages.
    expect(receipt).toContain("14-day right to cancel no longer applies");
    const receiptEs = await render(ReceiptEmail({ locale: "es", productLabel: "Todo", amountLabel: "22,99 €", unlocks: ["Todas"], dashboardUrl: "https://x" }));
    expect(receiptEs).toContain("derecho de desistimiento de 14 días ya no se aplica");
    const welcome = await render(WelcomeEmail({ locale: "es", siteUrl: "https://ethoslove.com" }));
    expect(welcome).toContain("Hacer un regalo");
  });
});
