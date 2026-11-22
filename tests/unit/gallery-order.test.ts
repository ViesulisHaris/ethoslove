import { describe, expect, it } from "vitest";
import { occasionRow } from "@/components/templates/gallery-occasions";
import { filedUnder, sortTemplates } from "@/components/templates/gallery-sort";
import { NEW_SLUGS } from "@/config/featured";
import { OCCASIONS } from "@/config/occasions";
import { TEMPLATE_SLUGS, listManifests } from "@/templates/manifests";

/**
 * The gallery's two orders: "Sort by" over the cards, and the row of occasions over them. Both were
 * found wrong by the review of 22 Nov 2026 (a gift badged "New" in 39th place under "Newest";
 * thirteen gifts filed under "The" and "La"; Thanksgiving ninth in the row four days before it).
 */
describe("the gallery's “Sort by”", () => {
  const manifests = listManifests();

  it("puts every gift wearing “New” first under Newest, the newest of them first, then the catalogue backwards", () => {
    const slugs = sortTemplates(manifests, "new", "en", TEMPLATE_SLUGS, NEW_SLUGS).map((m) => m.slug);
    const lead = slugs.slice(0, NEW_SLUGS.length);
    expect([...lead].sort()).toEqual([...NEW_SLUGS].sort());
    // Among themselves, and among the rest, later in the catalogue comes first.
    const at = (slug: string) => TEMPLATE_SLUGS.indexOf(slug);
    for (const part of [lead, slugs.slice(NEW_SLUGS.length)]) expect(part).toEqual([...part].sort((a, b) => at(b) - at(a)));
    // Snow Globe is an older address rebuilt for Christmas: it is new, and not the last one added.
    expect(lead).toContain("snow-globe");
    expect(slugs).toHaveLength(manifests.length);
    expect(slugs.at(-1)).toBe(TEMPLATE_SLUGS[0]);
  });

  it("files a name under its first word that is not an article, in both languages", () => {
    expect(filedUnder("The Letter", "en")).toBe("Letter");
    expect(filedUnder("A Song", "en")).toBe("Song");
    expect(filedUnder("Theatre", "en")).toBe("Theatre");
    expect(filedUnder("La Carta", "es")).toBe("Carta");
    expect(filedUnder("El Consejo", "es")).toBe("Consejo");
    expect(filedUnder("Las Luces", "es")).toBe("Luces");
    expect(filedUnder("Latido", "es")).toBe("Latido");
    // An English article is a word like any other in Spanish, and the other way round.
    expect(filedUnder("The Letter", "es")).toBe("The Letter");
    for (const locale of ["en", "es"] as const) {
      const names = sortTemplates(manifests, "az", locale, TEMPLATE_SLUGS).map((m) => m.name[locale]);
      expect(names).toEqual([...names].sort((a, b) => filedUnder(a, locale).localeCompare(filedUnder(b, locale), locale, { sensitivity: "base" })));
      // Nothing is left bunched under an article.
      const articles = locale === "en" ? /^(the|a|an) /i : /^(el|la|los|las|un|una) /i;
      const withArticle = names.filter((name) => articles.test(name));
      expect(withArticle.length).toBeGreaterThan(3);
      const places = withArticle.map((name) => names.indexOf(name));
      expect(Math.max(...places) - Math.min(...places)).toBeGreaterThan(withArticle.length);
    }
  });
});

describe("the gallery's row of occasions", () => {
  it("is every occasion once, whatever the day", () => {
    for (const day of [undefined, "2026-11-22", "2026-12-26", "2027-02-01", "2027-07-04", "not a day"]) expect([...occasionRow(day)].sort()).toEqual([...OCCASIONS].sort());
  });

  it("is the catalogue's order when nothing is in season, or no day is given", () => {
    expect(occasionRow()).toEqual([...OCCASIONS]);
    expect(occasionRow("2027-07-04")).toEqual([...OCCASIONS]);
  });

  it("leads with the season, then with this month's day", () => {
    // Four days before Thanksgiving, a month before Christmas.
    expect(occasionRow("2026-11-22").slice(0, 3)).toEqual(["christmas", "thanksgiving", "birthday"]);
    // Before the Christmas season opens, November is Thanksgiving's.
    expect(occasionRow("2026-11-10")[0]).toBe("thanksgiving");
    expect(occasionRow("2026-10-20")[0]).toBe("halloween");
    expect(occasionRow("2027-02-10")[0]).toBe("valentines");
    expect(occasionRow("2027-05-02")[0]).toBe("mothers-day");
  });

  it("lets a day with a dated season go when the day is over, not at the end of its month", () => {
    expect(occasionRow("2026-12-25")[0]).toBe("christmas");
    expect(occasionRow("2026-12-26")).toEqual([...OCCASIONS]);
    expect(occasionRow("2027-02-15")[0]).not.toBe("valentines");
  });
});
