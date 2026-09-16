import { describe, expect, it } from "vitest";
import { isPrivatePath } from "@/lib/analytics/consent";
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

  it("leaves the rest of the site alone", () => {
    for (const p of ["/", "/templates", "/occasions/birthday", "/pricing", "/create/bloom", "/dashboard"]) {
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
