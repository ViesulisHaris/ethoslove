import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import type { GiftData } from "@/lib/gift/schema";
import { nextDays } from "@/lib/lifecycle/next-days";

/**
 * The "two more gifts" card under the link and the publish sheet's "It's already paid for."
 * (PLAN-pair.md 5), drawn as the server would first draw them. What happens on a tap (the session
 * asked for, the card's checkout body, a declined wallet) is held in tests/e2e/pair-offer.spec.ts,
 * in a real browser: this suite has no DOM.
 */
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: () => undefined }),
}));
vi.mock("sonner", () => ({ toast: Object.assign(() => undefined, { error: () => undefined }) }));

const { Offer, Bought, UsedOne, TwoMoreGifts } = await import("@/components/editor/two-more-gifts");
const { AlreadyPaid } = await import("@/components/editor/already-paid");

const intl = (node: React.ReactNode, locale: "en" | "es" = "en") =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "es" ? es : en} timeZone="UTC">
      {node}
    </NextIntlClientProvider>,
  );
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, " ").replace(/ /g, " ");

const days = nextDays(new Date("2026-11-24T00:00:00.000Z"), [], null);
const gift = { templateSlug: "frosted-window", recipientName: "Mia", locale: "en", photos: [] } as unknown as GiftData;

describe("the two more gifts card", () => {
  it("draws nothing at all before the server says it may be offered", () => {
    // First draw: entitlements not read yet, so no frame and no space.
    expect(intl(<TwoMoreGifts data={gift} />)).toBe("");
  });

  it("names the two days and the price, in English, for each currency", () => {
    for (const [currency, price, apart] of [["eur", "€5", "€19.98"], ["usd", "$6", "$23.98"], ["gbp", "£4", "£17.98"]] as const) {
      const html = text(intl(<Offer offer={{ amount: { eur: 500, usd: 600, gbp: 400 }[currency], currency }} days={days} name="Mia" onBought={() => {}} />));
      expect(html).toContain("Nobody likes to be forgotten.");
      expect(html).toContain("You remembered today. Next up:");
      expect(html).toContain("Christmas 25 December in 4 weeks");
      expect(html).toContain("Valentine's Day 14 February in 12 weeks");
      expect(html).toContain(`Both gifts Separately ${apart} ${price}`);
      expect(html).toContain(`Add both for ${price}`);
      expect(html).toContain("Not used? Your money back, for 30 days");
      expect(html).toContain("One payment. No subscription.");
      expect(html).not.toMatch(/!|unforgettable|perfect for/i);
    }
  });

  it("in Spanish, with the price after the number", () => {
    const html = text(intl(<Offer offer={{ amount: 500, currency: "eur" }} days={days} name="Mia" onBought={() => {}} />, "es"));
    expect(html).toContain("A nadie le gusta que se olviden.");
    expect(html).toContain("Navidad 25 de diciembre en 4 semanas");
    expect(html).toContain("San Valentín 14 de febrero en 12 semanas");
    expect(html).toContain("Por separado 19,98 €");
    expect(html).toContain("Añadir los dos por 5 €");
  });

  it("without a wallet here, draws the card button, never Stripe's", () => {
    const html = intl(<Offer offer={{ amount: 500, currency: "eur" }} days={days} name="Mia" onBought={() => {}} />);
    expect(html).toContain('data-testid="pair-add"');
    expect(html).not.toContain('data-testid="pair-wallet"');
  });

  it("once bought: two gifts ready, the first day to start now", () => {
    const html = text(intl(<Bought days={days} name="Mia" />));
    expect(html).toContain("Two gifts are ready.");
    expect(html).toContain("Paid for. Nobody gets forgotten.");
    expect(html).toContain("Start the Christmas one now");
    expect(intl(<Bought days={days} name="Mia" />)).toContain('href="/occasions/christmas"');
    expect(html).toContain("They stay ready until you need them.");
  });

  it("after a gift sent with one of them: one left for the next day, or none", () => {
    const valentines = days.slice(1);
    expect(text(intl(<UsedOne left={1} days={valentines} name="Mia" />))).toContain("This was one of your gifts. Nothing to pay. One left, ready for Valentine's Day.");
    expect(text(intl(<UsedOne left={0} days={valentines} name="Mia" />))).toContain("That was your last gift ready.");
  });

  it("names a saved birthday with the person's name", () => {
    const withBirthday = nextDays(new Date("2026-11-24T00:00:00.000Z"), [{ occasion: "birthday", month: 12, day: 10, recipientName: "Mia" }], null);
    expect(text(intl(<Bought days={withBirthday} name="Mia" />))).toContain("Mia's birthday 10 December in 2 weeks");
  });
});

describe("It's already paid for.", () => {
  const draw = (ready: number, opensWhen: string | null = null, locale: "en" | "es" = "en") =>
    text(intl(<AlreadyPaid ready={ready} thumbs={[]} photos={0} name="Mia" opensWhen={opensWhen} busy={false} onSend={() => {}} onPayInstead={() => {}} />, locale));

  it("says which of the two this is, by the count", () => {
    expect(draw(2)).toContain("It's already paid for. One of your two gifts. One left after this.");
    expect(draw(1)).toContain("Your last gift ready.");
    expect(draw(1)).not.toContain("One of your two gifts");
  });

  it("says when it opens, or that it arrives at once, and names who it is for", () => {
    expect(draw(2)).toContain("Arrives the moment you send it");
    expect(draw(2, "5 March 2027 at 00:00")).toContain("Opens 5 March 2027 at 00:00");
    expect(draw(2)).toContain("Yours for good, with everything in it");
    expect(draw(2)).toContain("Send to Mia");
    expect(draw(2)).toContain("Pay for this one instead");
    expect(draw(2, null, "es")).toContain("Ya está pagado. Uno de tus dos regalos. Te queda otro.");
    expect(draw(2, null, "es")).toContain("Enviar a Mia");
  });

  it("has the send button and the quiet way to the pay panel", () => {
    const html = intl(<AlreadyPaid ready={2} thumbs={["/a.webp", "/b.webp"]} photos={2} name="" opensWhen={null} busy={false} onSend={() => {}} onPayInstead={() => {}} />);
    expect(html).toContain('data-testid="already-paid-send"');
    expect(html).toContain('data-testid="already-paid-pay"');
    expect(text(html)).toContain("Send it");
    expect(html.match(/<img /g)).toHaveLength(2);
  });
});
