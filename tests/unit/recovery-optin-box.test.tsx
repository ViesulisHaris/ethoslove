import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { LEGAL_DOCS } from "@/content/legal";
import { Paywall } from "@/components/editor/paywall";
import { PassCard } from "@/components/pricing/for-two";
import { GiftCardOffer } from "@/components/pricing/gift-card-offer";
import { PricingCards } from "@/components/pricing/pricing-cards";
import { getManifest, listManifests } from "@/templates/manifests";

// next-intl's navigation imports "next/navigation" in a way Node's resolver can't follow outside
// Next; a plain anchor is all these components need from its Link.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const messages = { en, es } as const;
const render = (node: React.ReactNode, locale: "en" | "es" = "en") =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="UTC">
      {node}
    </NextIntlClientProvider>,
  );

/** Every "email me one link" box in the markup, as its <input> tag. */
const boxes = (html: string) => [...html.matchAll(/<input[^>]*data-testid="recovery-optin-box"[^>]*>/g)].map((m) => m[0]);

const paywall = (locale: "en" | "es" = "en") =>
  render(<Paywall manifest={getManifest("vinyl")!} currency="eur" locale={locale} guest features={["no footer"]} returnTo="/create/vinyl" upgrade={null} blocked={false} />, locale);

describe("the recovery opt-in box", () => {
  it("sits under the publish sheet's pay button, once, unticked and optional", () => {
    const html = paywall();
    expect(boxes(html)).toHaveLength(1);
    const [box] = boxes(html);
    expect(box).toContain('type="checkbox"');
    expect(box).not.toMatch(/\schecked\b/);
    expect(box).not.toMatch(/\srequired\b/);
    expect(html.indexOf('data-testid="recovery-optin"')).toBeGreaterThan(html.indexOf('data-testid="pay-single"'));
    expect(html).toContain("If I don&#x27;t finish paying, email me one link to come back to it.");
  });

  it("says it in Spanish on a Spanish page", () => {
    expect(paywall("es")).toContain("Si no termino de pagar, enviadme un solo enlace para volver.");
  });

  it("is unticked under every pricing-page button that goes straight to checkout", () => {
    const pricing = render(<PricingCards currency="eur" manifests={listManifests()} authed={false} paymentsEnabled />);
    // Everything's button; the other two open the picker, which carries its own when it opens.
    expect(boxes(pricing)).toHaveLength(1);
    for (const html of [pricing, render(<PassCard currency="eur" paymentsEnabled renewing={false} />), render(<GiftCardOffer currency="eur" paymentsEnabled />)]) {
      expect(boxes(html)).toHaveLength(1);
      expect(boxes(html)[0]).not.toMatch(/\schecked\b/);
    }
  });

  it("isn't offered where nothing can be bought yet", () => {
    expect(boxes(render(<PricingCards currency="eur" manifests={listManifests()} authed={false} paymentsEnabled={false} />))).toHaveLength(0);
    expect(boxes(render(<PassCard currency="eur" paymentsEnabled={false} renewing={false} />))).toHaveLength(0);
    expect(boxes(render(<GiftCardOffer currency="eur" paymentsEnabled={false} />))).toHaveLength(0);
  });

  // The privacy policy describes the email by the box's own words, so they can't drift apart.
  it("is quoted word for word in the privacy policy", () => {
    const policy = (locale: "en" | "es") => LEGAL_DOCS.privacy[locale].sections.flatMap((s) => s.paragraphs).join("\n");
    expect(policy("en")).toContain(en.money.recovery.optIn.replace(/\.$/, ""));
    expect(policy("es")).toContain(es.money.recovery.optIn.replace(/\.$/, ""));
  });
});
