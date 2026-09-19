import { describe, expect, it } from "vitest";
import { buildPages, pageProgress } from "@/templates/sketchbook/pages";
import { DEMO_PHOTOS } from "@/templates/_shared/demo-photos";

const photos = (n: number) => Object.values(DEMO_PHOTOS).slice(0, n);

describe("the pages of the sketchbook", () => {
  it("opens on the cake and ends on the letter, with two photos a page between", () => {
    expect(buildPages([]).map((p) => p.kind)).toEqual(["cake", "letter"]);
    const five = buildPages(photos(5));
    expect(five.map((p) => p.kind)).toEqual(["cake", "photos", "photos", "photos", "letter"]);
    expect(five[1]).toMatchObject({ kind: "photos", index: 0 });
    expect((five[3] as { photos: unknown[] }).photos).toHaveLength(1);
  });

  it("never takes more than twelve photos", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ ...DEMO_PHOTOS.p1, id: `x${i}` }));
    const pages = buildPages(many);
    expect(pages.filter((p) => p.kind === "photos")).toHaveLength(6);
  });

  it("reports progress from the first page to the last", () => {
    expect(pageProgress(0, 5)).toBe(0);
    expect(pageProgress(2, 5)).toBe(50);
    expect(pageProgress(4, 5)).toBe(100);
    expect(pageProgress(0, 1)).toBe(100);
  });
});
