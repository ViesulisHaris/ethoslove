import { afterEach, describe, expect, it, vi } from "vitest";
import { templateOfferAmount, templateProductNode } from "@/lib/seo";
import { sendsFree, soldAsGroup } from "@/lib/gift/free-tier";
import { PRODUCTS, type Currency } from "@/lib/pricing/products";
import { TEMPLATE_MANIFESTS, getManifest } from "@/templates/manifests";

/**
 * The price a gift's page gives search engines (its Product data) is the price it shows visitors.
 * The deep test of 21 Nov 2026: Constellations showed "Premium" and "€7.49 once when you send it",
 * answered "Is there a free version? No.", and its Product data said price 0, on all sixteen of its
 * pages. The helper wrote 0 for every template whose `tier` is "free", and Constellations kept
 * that tier when it stopped being sendable free on 19 Nov (lib/gift/free-tier.ts).
 */
const CURRENCIES: Currency[] = ["usd", "eur", "gbp"];
const offer = (slug: string, currency: Currency) => (templateProductNode(getManifest(slug)!, "en", currency, "Digital gift").offers as { price: string; priceCurrency: string });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("a template's price in its Product data", () => {
  it("is 0 only while the template can be sent free, as the live site runs (the free version is the short note)", () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "1");
    for (const currency of CURRENCIES) {
      // The Letter goes out free as a short note.
      expect(offer("the-letter", currency).price).toBe("0");
      // Constellations is made of three photos or more, and photos are paid: it sells at "Make it special".
      expect(offer("constellations", currency).price).toBe((PRODUCTS.extras.amounts[currency] / 100).toFixed(2));
      expect(offer("constellations", currency).priceCurrency).toBe(currency.toUpperCase());
      // A premium template costs one template.
      expect(offer("scratch-card", currency).price).toBe((PRODUCTS.single.amounts[currency] / 100).toFixed(2));
    }
    expect(offer("constellations", "eur").price).toBe("7.49");
  });

  it("is 0 for both free templates where the free version still has photos (the switch off)", () => {
    vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", "");
    expect(offer("the-letter", "usd").price).toBe("0");
    expect(offer("constellations", "usd").price).toBe("0");
  });

  it("agrees with what the page calls free, for every template, under either setting", () => {
    for (const share of ["", "1"]) {
      vi.stubEnv("NEXT_PUBLIC_FREE_NOTE_SHARE", share);
      for (const m of TEMPLATE_MANIFESTS)
        for (const currency of CURRENCIES) {
          const amount = templateOfferAmount(m, currency);
          // The page's badge says "Free" exactly when sendsFree does (templates/[slug]/page.tsx), and its price line is the same product's amount.
          expect(amount === 0, `${m.slug} with share "${share}"`).toBe(sendsFree(m));
          // A premium template that cannot go out without other people's notes (the Advent Calendar) is sold only as the group card.
          if (amount > 0) expect(amount, m.slug).toBe(PRODUCTS[m.tier === "free" ? "extras" : soldAsGroup(m) ? "group" : "single"].amounts[currency]);
          expect(offer(m.slug, currency).price).toBe(amount === 0 ? "0" : (amount / 100).toFixed(2));
        }
    }
  });
});
