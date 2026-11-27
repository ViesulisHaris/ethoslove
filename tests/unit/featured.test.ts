import { describe, expect, it } from "vitest";
import { featuredFor, HOME_PICKS, LATER_SLUGS, NEW_SLUGS, POPULAR_SLUGS, sectionTemplates } from "@/config/featured";
import { listManifests } from "@/templates/manifests";

describe("what the gallery leads with", () => {
  const manifests = listManifests();
  const slugs = new Set(manifests.map((m) => m.slug));

  it("only features templates that exist, and none of them twice", () => {
    for (const slug of [...POPULAR_SLUGS, ...NEW_SLUGS]) expect(slugs.has(slug), slug).toBe(true);
    expect(new Set([...POPULAR_SLUGS, ...NEW_SLUGS]).size).toBe(POPULAR_SLUGS.length + NEW_SLUGS.length);
  });

  it("keeps the best sellers to one row of four, all of them premium", () => {
    expect(POPULAR_SLUGS).toHaveLength(4);
    expect(POPULAR_SLUGS[0]).toBe("bouquet");
    for (const slug of POPULAR_SLUGS) expect(manifests.find((m) => m.slug === slug)?.tier, slug).toBe("premium");
  });

  it("leads what is new with the six Christmas gifts, then the two for Thanksgiving", () => {
    expect(NEW_SLUGS).toEqual(["nice-list", "unwrapped", "snow-globe", "frosted-window", "string-the-lights", "gingerbread-house", "light-the-candles", "wishbone"]);
  });

  it("shelves every template exactly once: best sellers, new, then the rest in the order given, out of season last", () => {
    const shelves = sectionTemplates(manifests);
    expect(shelves.map((s) => s.id)).toEqual(["popular", "new", "all"]);
    expect(shelves[0].items.map((m) => m.slug)).toEqual([...POPULAR_SLUGS]);
    expect(shelves[1].items.map((m) => m.slug)).toEqual([...NEW_SLUGS]);
    const all = shelves.flatMap((s) => s.items.map((m) => m.slug));
    expect(all).toHaveLength(manifests.length);
    expect(new Set(all).size).toBe(manifests.length);
    const rest = manifests.filter((m) => !featuredFor(m.slug)).map((m) => m.slug);
    const later: readonly string[] = LATER_SLUGS;
    expect(shelves[2].items.map((m) => m.slug)).toEqual([...rest.filter((s) => !later.includes(s)), ...rest.filter((s) => later.includes(s))]);
  });

  it("closes the gallery with the gifts out of season, all of them real and none on another shelf", () => {
    for (const slug of LATER_SLUGS) {
      expect(slugs.has(slug), slug).toBe(true);
      expect(featuredFor(slug), slug).toBeUndefined();
    }
    const last = sectionTemplates(manifests).at(-1)!.items.slice(-LATER_SLUGS.length).map((m) => m.slug);
    expect([...last].sort()).toEqual([...LATER_SLUGS].sort());
    // The Letter is no longer behind them.
    const order = sectionTemplates(manifests).flatMap((s) => s.items.map((m) => m.slug));
    expect(order.indexOf("the-letter")).toBeLessThan(order.indexOf("seance"));
  });

  it("drops a shelf a filter has emptied, heading and all", () => {
    const free = sectionTemplates(manifests.filter((m) => m.tier === "free"));
    expect(free.map((s) => s.id)).toEqual(["all"]);
    expect(sectionTemplates([])).toEqual([]);
    expect(sectionTemplates([{ slug: "not-a-template" }]).map((s) => s.id)).toEqual(["all"]);
  });

  it("puts three gifts that exist and are sold under the front page's buttons", () => {
    expect(HOME_PICKS).toHaveLength(3);
    for (const slug of HOME_PICKS) expect(manifests.find((m) => m.slug === slug)?.tier, slug).toBe("premium");
  });

  it("badges a card by the shelf it belongs to", () => {
    expect(featuredFor("bouquet")).toBe("popular");
    expect(featuredFor("the-council")).toBe("popular");
    expect(featuredFor("nice-list")).toBe("new");
    expect(featuredFor("the-letter")).toBeUndefined();
    expect(featuredFor("vinyl")).toBeUndefined();
  });
});
