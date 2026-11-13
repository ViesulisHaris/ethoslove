import { describe, expect, it } from "vitest";
import { unsentTemplates, type PaidSingle, type SentGift } from "@/lib/commerce/unsent";

const NOW = Date.parse("2026-11-12T22:20:00Z");
const single = (slug: string, at: string, store: string | null = "stripe"): PaidSingle => ({ template_slugs: [slug], created_at: at, store });
const gift = (slug: string, at: string): SentGift => ({ template_slug: slug, updated_at: at });

describe("My gifts: paid for, not sent yet", () => {
  it("shows a gift paid for a few minutes ago that isn't live yet, and drops it once it is", () => {
    // 12 Nov 2026: paid at 22:01, opened My gifts some forty times, published at 22:28.
    const paid = [single("party-animals", "2026-11-12T22:01:00Z")];
    expect(unsentTemplates(paid, [], NOW)).toEqual(["party-animals"]);
    expect(unsentTemplates(paid, [gift("party-animals", "2026-11-12T22:28:43Z")], Date.parse("2026-11-12T22:30:00Z"))).toEqual([]);
  });

  it("counts only a gift of the same template, saved since the purchase", () => {
    const paid = [single("bouquet", "2026-11-12T21:00:00Z")];
    expect(unsentTemplates(paid, [gift("xoxo", "2026-11-12T21:30:00Z")], NOW)).toEqual(["bouquet"]);
    // Last week's Bouquet isn't this one.
    expect(unsentTemplates(paid, [gift("bouquet", "2026-11-05T12:00:00Z")], NOW)).toEqual(["bouquet"]);
    // A signed-in buyer's purchase begins when checkout opens: a gift saved just before still counts.
    expect(unsentTemplates(paid, [gift("bouquet", "2026-11-12T20:30:00Z")], NOW)).toEqual([]);
  });

  it("one card per template, newest purchase first", () => {
    const paid = [single("coquette", "2026-11-12T10:00:00Z"), single("bouquet", "2026-11-12T20:00:00Z"), single("coquette", "2026-11-12T11:00:00Z")];
    expect(unsentTemplates(paid, [], NOW)).toEqual(["bouquet", "coquette"]);
  });

  it("not for the App Store, which publishes in the app, nor after a month", () => {
    expect(unsentTemplates([single("bloom", "2026-11-12T20:00:00Z", "app_store")], [], NOW)).toEqual([]);
    expect(unsentTemplates([single("bloom", "2026-10-11T20:00:00Z")], [], NOW)).toEqual([]);
    expect(unsentTemplates([single("bloom", "2026-10-14T20:00:00Z", null)], [], NOW)).toEqual(["bloom"]);
  });

  it("skips a purchase that names no template", () => {
    expect(unsentTemplates([{ template_slugs: [], created_at: "2026-11-12T20:00:00Z", store: "stripe" }], [], NOW)).toEqual([]);
  });
});
