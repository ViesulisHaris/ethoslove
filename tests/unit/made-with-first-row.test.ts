import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PREMIUM_SHOWN, firstRow, freeSpan, wordsSpan } from "@/app/[currency]/[locale]/(marketing)/made-with-ethos/first-row";
import { listManifests } from "@/templates/manifests";
import { sendsFree } from "@/lib/gift/free-tier";

const slugs = (list: { slug: string }[]) => list.map((m) => m.slug);

// /made-with-ethos is where "or make one for someone else" and the badge send a recipient. It said
// "Someone made you one of these." over a picture of The Letter to someone who had been sent a
// Bouquet, whose own card was a screen and a half down (the tester's loop-T3).
describe("the page a gift sends its recipient to opens with the gift they got", () => {
  const all = listManifests();
  type Manifest = (typeof all)[number];
  const today = (m: Manifest) => sendsFree(m, 0);
  /** The live site since 19 Nov 2026: the free note is for everyone, and Constellations has no free version. */
  const live = (m: Manifest) => sendsFree(m, 1);

  it("a paid gift's template leads the page, in front of the free shelf, and is shown once", () => {
    for (const rule of [today, live]) {
      const { lead, free, premium } = firstRow(all, "bouquet", rule);
      expect(lead?.slug).toBe("bouquet");
      expect(slugs(free)).not.toContain("bouquet");
      expect(slugs(premium)).not.toContain("bouquet");
      expect(free.length + premium.length + 1).toBe(all.length);
    }
  });

  it("a free gift's template leads the free shelf, and nothing stands in front of it", () => {
    const { lead, free, premium } = firstRow(all, "constellations", today);
    expect(lead).toBeNull();
    expect(slugs(free)).toEqual(["constellations", "the-letter"]);
    expect(free.length + premium.length).toBe(all.length);
    expect(slugs(firstRow(all, "the-letter", live).free)).toEqual(["the-letter"]);
  });

  it("Constellations leads the page too, once it no longer sends free", () => {
    const { lead, free, premium } = firstRow(all, "constellations", live);
    expect(lead?.slug).toBe("constellations");
    expect(slugs(free)).toEqual(["the-letter"]);
    expect(slugs(premium)).not.toContain("constellations");
  });

  it("no template, or one that does not exist, leads nothing and loses nothing", () => {
    for (const theirs of [null, "", "nope", "<script>", "BOUQUET"]) {
      const { lead, free, premium } = firstRow(all, theirs, today);
      expect(lead, String(theirs)).toBeNull();
      expect(slugs(free)).toEqual(["the-letter", "constellations"]);
      expect(free.length + premium.length).toBe(all.length);
    }
  });

  it("the free shelf's words take what its cards leave of their row, or a row of their own", () => {
    // One card (The Letter alone, as on the live site): the words stand beside it, not three empty columns.
    expect([2, 3, 4].map((columns) => wordsSpan(1, columns))).toEqual([1, 2, 3]);
    // The Letter and Constellations.
    expect([2, 3, 4].map((columns) => wordsSpan(2, columns))).toEqual([2, 1, 2]);
    // Three free cards.
    expect([2, 3, 4].map((columns) => wordsSpan(3, columns))).toEqual([1, 3, 1]);
    for (let cards = 1; cards <= 9; cards++) for (const columns of [2, 3, 4]) expect((cards + wordsSpan(cards, columns)) % columns).toBe(0);
  });

  it("beside their card, the free shelf takes the rest of the row when its cards fit there, or a row of its own", () => {
    // The Letter alone (the live site): beside their card at every width.
    expect([2, 3, 4].map((columns) => freeSpan(1, columns))).toEqual([1, 2, 3]);
    // The Letter and Constellations: beside it from three columns, under it on two.
    expect([2, 3, 4].map((columns) => freeSpan(2, columns))).toEqual([2, 2, 3]);
    for (let cards = 1; cards <= 4; cards++) for (const columns of [2, 3, 4]) expect(freeSpan(cards, columns)).toBeGreaterThanOrEqual(Math.min(cards, columns - 1));
  });

  it("the page has a class for every span it can ask for", () => {
    const page = readFileSync("src/app/[currency]/[locale]/(marketing)/made-with-ethos/page.tsx", "utf8");
    for (const [at, columns] of [["sm", 2], ["lg", 3], ["xl", 4]] as const)
      for (let span = 1; span <= columns; span++) {
        expect(page).toContain(`"${at}:col-span-${span}"`);
        expect(page).toContain(`"${at}:grid-cols-${span}"`);
      }
    expect(page).toContain("sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4");
  });

  // Every recipient lands on this page, mostly on a phone. It listed all 61 templates, each with a
  // title, a line, a price and two links: about twenty-five phone screens (the deep tester's loop-D5).
  it("shows one row of premium cards, then a link to all of them, never the whole catalogue", () => {
    const page = readFileSync("src/app/[currency]/[locale]/(marketing)/made-with-ethos/page.tsx", "utf8");
    expect(PREMIUM_SHOWN).toBe(4);
    expect(page).toContain("premium.slice(0, PREMIUM_SHOWN)");
    expect(page).not.toContain("premium.map(");
    expect(page).toContain('href={`/templates${linkQuery}`}');
  });
});
