import { describe, expect, it } from "vitest";
import { TIER_FILTERS, parseTier, searchWithTier } from "@/components/templates/gallery-tier";

describe("the gallery's price filter in the address", () => {
  it("reads only the tiers there are", () => {
    expect(parseTier("free")).toBe("free");
    expect(parseTier("premium")).toBe("premium");
    expect(parseTier("all")).toBe("all");
    expect(parseTier("gold")).toBe("all");
    expect(parseTier(null)).toBe("all");
    expect(TIER_FILTERS).toEqual(["all", "free", "premium"]);
  });

  it("writes the tier and keeps every other parameter", () => {
    expect(searchWithTier("", "premium")).toBe("?tier=premium");
    expect(searchWithTier("?ref=tiktok", "free")).toBe("?ref=tiktok&tier=free");
    expect(searchWithTier("?tier=free&ref=tiktok", "premium")).toBe("?tier=premium&ref=tiktok");
  });

  it("drops the parameter for everything, leaving a clean address", () => {
    expect(searchWithTier("?tier=free", "all")).toBe("");
    expect(searchWithTier("?ref=tiktok&tier=free", "all")).toBe("?ref=tiktok");
  });
});
