import { describe, expect, it } from "vitest";
import { SITE } from "@/config/site";
import { SHARE_CARD, shareCardUrl } from "@/lib/gift/share-card";

describe("a gift's share card", () => {
  it("lives beside the gift, with no locale in front to redirect", () => {
    const url = shareCardUrl("abc123", { recipientName: "Ana", locale: "en" });
    expect(url.startsWith(`${SITE.url}/g/abc123/card.jpg?v=`)).toBe(true);
    expect(url).not.toContain("/en/");
  });

  it("gets a new address when what it shows changes, and never carries the name", () => {
    const a = shareCardUrl("abc123", { recipientName: "Ana", locale: "en" });
    expect(shareCardUrl("abc123", { recipientName: "Ana", locale: "en" })).toBe(a);
    expect(shareCardUrl("abc123", { recipientName: "Anna", locale: "en" })).not.toBe(a);
    expect(shareCardUrl("abc123", { recipientName: "Ana", locale: "es" })).not.toBe(a);
    expect(a).not.toContain("Ana");
  });

  it("is big enough for iMessage's full-width preview", () => {
    expect(SHARE_CARD).toEqual({ width: 2400, height: 1256 });
  });
});
