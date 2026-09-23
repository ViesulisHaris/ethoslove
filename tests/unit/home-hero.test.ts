import { describe, expect, it } from "vitest";
import { homeHeroFor } from "@/lib/attribution/landing";

describe("front page hero by arrival link", () => {
  it("leads with gifts for the social bio links that bring the buyers", () => {
    for (const ref of ["tt-couple", "tt-ideas", "tt-him", "ig-bio", "yt-shorts", "pin-valentines", "fb-group"]) {
      expect(homeHeroFor(ref), ref).toBe("gift");
    }
  });

  it("leads with gifts for someone who tapped a gift's free-tier badge", () => {
    expect(homeHeroFor("watermark")).toBe("gift");
  });

  it("reads refs the way checkout attribution does: trimmed, any case", () => {
    expect(homeHeroFor("TT-Couple")).toBe("gift");
    expect(homeHeroFor("  watermark ")).toBe("gift");
    expect(homeHeroFor("WATERMARK")).toBe("gift");
  });

  it("uses the first of repeated refs", () => {
    expect(homeHeroFor(["tt-couple", "newsletter"])).toBe("gift");
    expect(homeHeroFor(["newsletter", "tt-couple"])).toBe("dates");
  });

  it("keeps Dates first for everyone else", () => {
    for (const ref of [undefined, "", "   ", "newsletter", "google", "jayandmya", "watermarks", "tiktok", "tt", "att-couple", "x-tt-couple"]) {
      expect(homeHeroFor(ref), String(ref)).toBe("dates");
    }
    expect(homeHeroFor([])).toBe("dates");
  });
});
