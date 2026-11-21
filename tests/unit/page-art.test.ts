import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ART_IDS, PAGE_ART, pageArt, slotStyle, type PageArtEntry } from "@/content/page-art";

/**
 * The art table of the redesigned pages (content/page-art.ts): every id in every colourway points
 * at a file that exists, with a size, so a render can be dropped in by changing a row and nothing
 * on a page can ask for art that is not there.
 */
const PUBLIC = join(__dirname, "../../public");

describe("page art", () => {
  it("has every id in every colourway, each a real file with its size", () => {
    for (const [flowers, set] of Object.entries(PAGE_ART)) {
      expect(Object.keys(set).sort(), flowers).toEqual([...ART_IDS].sort());
      for (const id of ART_IDS) {
        const entry = pageArt(id, flowers as keyof typeof PAGE_ART, "the-letter");
        expect(entry.width, `${flowers} ${id}`).toBeGreaterThan(0);
        expect(entry.height, `${flowers} ${id}`).toBeGreaterThan(0);
        for (const file of [entry.src, entry.src1x, entry.bezel]) if (file) expect(existsSync(join(PUBLIC, file)), `${flowers} ${id}: ${file} is not in public/`).toBe(true);
        // A stand-in is dressed by the page; a render says where its empty area is, if it has one.
        if (entry.standIn) expect(entry.slot, `${flowers} ${id}: a stand-in has no slot`).toBeUndefined();
        if (entry.tint) expect(entry.standIn, `${flowers} ${id}: only a stand-in is tinted`).toBe(true);
      }
    }
  });

  it("fills in the template whose page it is on", () => {
    expect(pageArt("hero-flatlay", "ivory", "snow-globe").src).toBe("/templates/snow-globe/poster.jpg");
    expect(pageArt("lily-open", "ivory", "snow-globe").src).not.toContain("{slug}");
  });

  it("lays a flat-lay's screen in by the render's own matrix, as shares of the picture", () => {
    // A 2000×1500 picture whose 390×844 screen sits at (620, 180), turned 6 degrees and drawn at 0.9.
    const turn = (6 * Math.PI) / 180;
    const a = 0.9 * Math.cos(turn), b = 0.9 * Math.sin(turn);
    const render: PageArtEntry = { src: "/x.webp", width: 2000, height: 1500, slot: { box: [390, 844], matrix: [a, b, -b, a, 620, 180] } };
    const style = slotStyle(render)!;
    expect(style.left).toBe("31%");
    expect(style.top).toBe("12%");
    expect(style.width).toBe("19.5%");
    expect(style.aspectRatio).toBe("390 / 844");
    expect(style.transformOrigin).toBe("0 0");
    expect(style.transform).toBe(`matrix(${a}, ${b}, ${-b}, ${a}, 0, 0)`);
    // Checked the long way: the box's far corner lands where the matrix says, at any drawn width.
    for (const drawn of [400, 1000, 2000]) {
      const k = drawn / render.width;
      const w = 0.195 * drawn, h = (w * 844) / 390;
      const x = 0.31 * drawn + a * w + -b * h, y = 0.12 * (drawn * 0.75) + b * w + a * h;
      expect(x).toBeCloseTo(k * (a * 390 + -b * 844 + 620), 6);
      expect(y).toBeCloseTo(k * (b * 390 + a * 844 + 180), 6);
    }
    expect(slotStyle({ src: "/x.webp", width: 10, height: 10 })).toBeNull();
  });
});
