import { describe, expect, it } from "vitest";
import { featuredFor, NEW_SLUGS, POPULAR_SLUGS, sectionTemplates } from "@/config/featured";
import { listManifests } from "@/templates/manifests";

describe("what the gallery leads with", () => {
  const manifests = listManifests();
  const slugs = new Set(manifests.map((m) => m.slug));

  it("only features templates that exist, and none of them twice", () => {
    for (const slug of [...POPULAR_SLUGS, ...NEW_SLUGS]) expect(slugs.has(slug), slug).toBe(true);
    expect(new Set([...POPULAR_SLUGS, ...NEW_SLUGS]).size).toBe(POPULAR_SLUGS.length + NEW_SLUGS.length);
  });

  it("keeps the best sellers to one row of four, most sold first", () => {
    expect(POPULAR_SLUGS).toHaveLength(4);
    expect(POPULAR_SLUGS[0]).toBe("the-letter");
  });

  it("puts the cats at the front of what is new", () => {
    expect(NEW_SLUGS.slice(0, 3)).toEqual(["party-animals", "the-council", "sticker-bomb"]);
  });

  it("shelves every template exactly once: best sellers, new, then the rest in the order given", () => {
    const shelves = sectionTemplates(manifests);
    expect(shelves.map((s) => s.id)).toEqual(["popular", "new", "all"]);
    expect(shelves[0].items.map((m) => m.slug)).toEqual([...POPULAR_SLUGS]);
    expect(shelves[1].items.map((m) => m.slug)).toEqual([...NEW_SLUGS]);
    const all = shelves.flatMap((s) => s.items.map((m) => m.slug));
    expect(all).toHaveLength(manifests.length);
    expect(new Set(all).size).toBe(manifests.length);
    const rest = manifests.filter((m) => !featuredFor(m.slug)).map((m) => m.slug);
    expect(shelves[2].items.map((m) => m.slug)).toEqual(rest);
  });

  it("drops a shelf a filter has emptied, heading and all", () => {
    const free = sectionTemplates(manifests.filter((m) => m.tier === "free"));
    expect(free.map((s) => s.id)).toEqual(["popular"]);
    expect(sectionTemplates([])).toEqual([]);
    expect(sectionTemplates([{ slug: "not-a-template" }]).map((s) => s.id)).toEqual(["all"]);
  });

  it("badges a card by the shelf it belongs to", () => {
    expect(featuredFor("bouquet")).toBe("popular");
    expect(featuredFor("the-council")).toBe("new");
    expect(featuredFor("vinyl")).toBeUndefined();
  });
});
