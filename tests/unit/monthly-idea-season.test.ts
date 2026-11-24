import { describe, expect, it } from "vitest";
import { OCCASIONS } from "@/config/occasions";
import { getManifest } from "@/templates/manifests";
import { SEASON_IDEAS, seasonFor, seasonTemplate } from "@/lib/lifecycle/suggest";
import { monthsaryIn } from "@/lib/lifecycle/monthsaries";

const on = (month: number, day: number, year = 2027) => new Date(Date.UTC(year, month - 1, day));

describe("the monthly idea's year", () => {
  it("S1 every idea is a real premium template, and every link a real page", () => {
    for (const row of SEASON_IDEAS) {
      for (const slug of [row.idea, row.alternate]) {
        const manifest = getManifest(slug);
        expect(manifest, slug).not.toBeNull();
        // The idea's link opens its editor with the photos in it: only a premium template has them.
        expect(manifest!.tier, slug).toBe("premium");
      }
      expect(row.more === "templates" || (OCCASIONS as readonly string[]).includes(row.more), row.id).toBe(true);
    }
  });

  it("S2 the rows cover the year, in order", () => {
    expect(SEASON_IDEAS[0].from).toEqual([1, 1]);
    const keys = SEASON_IDEAS.map((r) => r.from[0] * 100 + r.from[1]);
    expect([...keys].sort((a, b) => a - b)).toEqual(keys);
    expect(new Set(SEASON_IDEAS.map((r) => r.id)).size).toBe(SEASON_IDEAS.length);
    const at = (m: number, d: number, y?: number) => seasonFor(on(m, d, y)).id;
    expect([at(1, 14), at(1, 15)]).toEqual(["jan-birthday", "valentines"]);
    expect([at(2, 13), at(2, 14)]).toEqual(["valentines", "feb-anniversary"]);
    expect(at(2, 29, 2028)).toBe("feb-anniversary");
    expect([at(11, 24), at(11, 25)]).toEqual(["november", "christmas"]);
    expect([at(12, 24), at(12, 25), at(12, 31)]).toEqual(["christmas", "year-end", "year-end"]);
  });

  it("S3 nobody is shown the same idea twice in a year", () => {
    for (let month = 1; month <= 12; month++)
      for (let day = 1; day <= 31; day++) {
        const since = { year: 2026, month, day };
        const ideas = Array.from({ length: 12 }, (_, i) => {
          const m = month + i + 1;
          return seasonFor(monthsaryIn(since, 2026 + Math.floor((m - 1) / 12), ((m - 1) % 12) + 1)).idea;
        });
        expect(new Set(ideas).size, `${month}/${day}: ${ideas.join(", ")}`).toBe(12);
      }
  });

  it("S4 the alternate steps in for their last template, and is never another month's idea", () => {
    const ideas = new Set(SEASON_IDEAS.map((r) => r.idea));
    for (const row of SEASON_IDEAS) {
      expect(seasonTemplate(row, row.idea).slug).toBe(row.alternate);
      expect(seasonTemplate(row, null).slug).toBe(row.idea);
      expect(seasonTemplate(row, "the-letter").slug).toBe(row.idea);
      expect(ideas.has(row.alternate), row.alternate).toBe(false);
    }
  });
});
