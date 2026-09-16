import { describe, expect, it } from "vitest";
import { hidesConsentBanner, isPrivatePath } from "@/lib/analytics/consent";
import { routing } from "@/i18n/routing";

/**
 * Analytics must never run on a gift page: it is someone's private letter, opened at a private
 * link, and Clarity records sessions. This is the one check standing between that and a
 * recording of a stranger's photos, so it is worth pinning down.
 */
describe("isPrivatePath", () => {
  it("covers gift pages in every locale, prefixed or not", () => {
    const paths = ["/g/abc123", "/g"];
    for (const p of paths) {
      expect(isPrivatePath(p), p).toBe(true);
      for (const locale of routing.locales) {
        expect(isPrivatePath(`/${locale}${p}`), `/${locale}${p}`).toBe(true);
      }
    }
  });

  it("covers the paths that carry a secret or an id", () => {
    // /checkout/success?session_id=cs_… is a Stripe session; /dashboard/gift/<uuid> is a gift id.
    const paths = ["/checkout", "/checkout/success", "/dashboard", "/dashboard/gift/79fe7c36", "/account"];
    for (const p of paths) {
      expect(isPrivatePath(p), p).toBe(true);
      for (const locale of routing.locales) {
        expect(isPrivatePath(`/${locale}${p}`), `/${locale}${p}`).toBe(true);
      }
    }
  });

  it("leaves the rest of the site alone", () => {
    // The public funnel, which is the whole point of measuring anything.
    for (const p of ["/", "/templates", "/occasions/birthday", "/pricing", "/create/bloom"]) {
      expect(isPrivatePath(p), p).toBe(false);
      for (const locale of routing.locales) {
        expect(isPrivatePath(`/${locale}${p}`), `/${locale}${p}`).toBe(false);
      }
    }
  });

  it("does not mistake a path that merely starts with the letter for a gift", () => {
    // `/garden` is a real template slug; stripping too eagerly would silence analytics on it.
    for (const p of ["/garden", "/templates/garden", "/gallery", "/gift"]) {
      expect(isPrivatePath(p), p).toBe(false);
    }
  });

  it("only strips a locale segment, not any first segment", () => {
    // A future route called /fr/... is not a locale here, so it must not be stripped into /g/.
    expect(isPrivatePath("/fr/g/abc")).toBe(false);
  });
});

/**
 * The banner is pinned to the bottom of the screen, and the bottom of the screen is where a gift
 * keeps every control it has. So wherever a gift is actually running it must not be there at all
 * — a recipient blowing a paper plane home should never be asked about cookies first.
 */
describe("hidesConsentBanner", () => {
  it("keeps the banner off a gift, real or demo, in every locale", () => {
    for (const p of ["/g/abc123", "/demo/halfway", "/demo/the-toast", "/demo"]) {
      expect(hidesConsentBanner(p), p).toBe(true);
      for (const locale of routing.locales) {
        expect(hidesConsentBanner(`/${locale}${p}`), `/${locale}${p}`).toBe(true);
      }
    }
  });

  it("still asks everywhere the person is making one, not opening one", () => {
    for (const p of ["/", "/templates", "/templates/halfway", "/occasions/birthday", "/pricing", "/create/bloom"]) {
      expect(hidesConsentBanner(p), p).toBe(false);
      for (const locale of routing.locales) {
        expect(hidesConsentBanner(`/${locale}${p}`), `/${locale}${p}`).toBe(false);
      }
    }
  });

  it("does not mistake a slug that merely starts the same way", () => {
    for (const p of ["/demos", "/democracy", "/templates/demo"]) {
      expect(hidesConsentBanner(p), p).toBe(false);
    }
  });

  it("leaves session replay's own rule alone: the demos are still measured", () => {
    // Only the banner moves. Clarity sets nothing without consent, and a heatmap of the demos is
    // the most useful one on the site, so `/demo` must stay out of the replay block-list.
    expect(isPrivatePath("/demo/halfway")).toBe(false);
    expect(isPrivatePath("/es/demo/halfway")).toBe(false);
  });
});
