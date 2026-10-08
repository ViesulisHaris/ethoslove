import { describe, expect, it } from "vitest";
import { homeHeroFor } from "@/lib/attribution/landing";

describe("front page hero by arrival link", () => {
  it("leads with gifts for someone who typed tryethos.io in, with no ref at all", () => {
    for (const ref of [undefined, "", "   "]) expect(homeHeroFor(ref), String(ref)).toBe("gift");
    expect(homeHeroFor([])).toBe("gift");
  });

  it("leads with gifts for the social bio links and a gift's free-tier badge", () => {
    for (const ref of ["tt-couple", "tt-ideas", "tt-him", "ig-bio", "yt-shorts", "pin-valentines", "fb-group", "watermark"]) {
      expect(homeHeroFor(ref), ref).toBe("gift");
    }
  });

  it("leads with gifts for every other link too", () => {
    for (const ref of ["newsletter", "google", "jayandmya", "tiktok", "c-maya", "datesx", "my-dates", "dates_city"]) {
      expect(homeHeroFor(ref), ref).toBe("gift");
    }
  });

  it("opens on the date ideas only for a link made for Dates", () => {
    for (const ref of ["dates", "dates-lisbon", "DATES", "  dates-autumn "]) expect(homeHeroFor(ref), ref).toBe("dates");
  });

  it("uses the first of repeated refs, as checkout attribution does", () => {
    expect(homeHeroFor(["dates", "tt-couple"])).toBe("dates");
    expect(homeHeroFor(["tt-couple", "dates"])).toBe("gift");
  });
});
