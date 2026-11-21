import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../../public/art/pages/manifest.json";
import { ART_IDS, artSrcSet, artVariants, pageArt, slotGeometry, slotStyle, type ArtSlot } from "@/content/page-art";
import { TEMPLATE_PAGE_THEMES, type Flowers } from "@/content/template-page-themes";
import { ALL_PLACEMENTS } from "@/components/templates/page/placements";

/**
 * The art of the redesigned pages (content/page-art.ts reads public/art/pages/manifest.json): every
 * id in every colourway is a file that exists, at the size the manifest says, and every empty place
 * a page lays something into is where the manifest says it is. A new render changes files and the
 * manifest and nothing else, so what this holds is that the pages and the manifest still agree.
 */
const PUBLIC = join(__dirname, "../../public");
const FLOWERS: Flowers[] = ["ivory", "blush", "wine", "moonlight"];

/** A WebP's own pixel size, from its header (VP8X, VP8L or VP8), so the test needs no image library. */
function webpSize(file: string): [number, number] {
  const b = readFileSync(file);
  const kind = b.toString("ascii", 12, 16);
  if (kind === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === "VP8L") {
    const bits = b.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}

describe("page art", () => {
  it("has every id the pages ask for, in every colourway a theme can pick", () => {
    for (const id of ART_IDS) {
      const variants = artVariants(id);
      expect(variants.length, id).toBeGreaterThan(0);
      // A piece with flowers in it comes in all four; one without comes once and serves them all.
      if (!variants.includes("plain")) expect(variants.sort(), id).toEqual([...FLOWERS].sort());
      for (const flowers of FLOWERS) expect(() => pageArt(id, flowers), `${id} ${flowers}`).not.toThrow();
    }
    for (const [slug, theme] of Object.entries(TEMPLATE_PAGE_THEMES)) expect(FLOWERS, slug).toContain(theme.flowers);
    // And the manifest has nothing the pages have never heard of.
    expect(Object.keys(manifest.pieces).sort()).toEqual([...ART_IDS].sort());
  });

  it("names files that exist, at the size the manifest gives, with a half-size file beside each", () => {
    for (const id of ART_IDS)
      for (const flowers of FLOWERS) {
        const art = pageArt(id, flowers);
        for (const file of [art.src, art.src1x, art.bezel?.src, art.bezel?.src1x]) if (file) expect(existsSync(join(PUBLIC, file)), `${id} ${flowers}: ${file} is not in public/`).toBe(true);
        expect(webpSize(join(PUBLIC, art.src)), art.src).toEqual([art.width, art.height]);
        expect(webpSize(join(PUBLIC, art.src1x))[0], art.src1x).toBe(art.width1x);
        expect(art.width1x, art.src1x).toBe(Math.round(art.width / 2));
        if (art.bezel) expect(webpSize(join(PUBLIC, art.bezel.src)), art.bezel.src).toEqual([art.width, art.height]);
        expect(artSrcSet(art)).toBe(`${art.src1x} ${art.width1x}w, ${art.src} ${art.width}w`);
      }
  });

  it("keeps every picture light enough for a page: 250 KB at most, 130 KB for the half size", () => {
    for (const id of ART_IDS)
      for (const flowers of FLOWERS) {
        const art = pageArt(id, flowers);
        expect(statSync(join(PUBLIC, art.src)).size, art.src).toBeLessThanOrEqual(250_000);
        expect(statSync(join(PUBLIC, art.src1x)).size, art.src1x).toBeLessThanOrEqual(130_000);
      }
  });

  it("has the empty places the pages lay things into: a screen with its bezel, two photos and a card", () => {
    for (const flowers of FLOWERS) {
      const hero = pageArt("hero-flatlay", flowers);
      expect(hero.slots.screen?.box, flowers).toEqual([390, 844]);
      expect(hero.bezel, `${flowers}: the hero's phone has no bezel layer`).toBeDefined();
      expect(pageArt("experience-flatlay", flowers).slots.photo, flowers).toBeDefined();
      expect(pageArt("step-photo", flowers).slots.photo, flowers).toBeDefined();
      expect(pageArt("step-note", flowers).slots.card, flowers).toBeDefined();
    }
    // Every place lies inside its picture, corner for corner.
    for (const id of ART_IDS) {
      const art = pageArt(id, "ivory");
      for (const slot of Object.values(art.slots)) {
        const [a, b, c, d, e, f] = slot.matrix;
        for (const [x, y] of [[0, 0], [slot.box[0], 0], [slot.box[0], slot.box[1]], [0, slot.box[1]]]) {
          const px = a * x + c * y + e, py = b * x + d * y + f;
          expect(px >= 0 && px <= art.width && py >= 0 && py <= art.height, `${id}: a corner of its slot is outside the picture`).toBe(true);
        }
      }
    }
  });

  it("lays a slot in by the render's own matrix, as shares of the picture, at any width", () => {
    // A 2000×1500 picture whose 390×844 screen sits at (620, 180), turned 6 degrees and drawn at 0.9.
    const turn = (6 * Math.PI) / 180;
    const a = 0.9 * Math.cos(turn), b = 0.9 * Math.sin(turn);
    const picture = { width: 2000, height: 1500 };
    const slot: ArtSlot = { box: [390, 844], matrix: [a, b, -b, a, 620, 180], radius: 39 };
    const style = slotStyle(picture, slot);
    expect(style.left).toBe("31%");
    expect(style.top).toBe("12%");
    expect(style.width).toBe("19.5%");
    expect(style.aspectRatio).toBe("390 / 844");
    expect(style.transformOrigin).toBe("0 0");
    expect(style.transform).toBe(`matrix(${a}, ${b}, ${-b}, ${a}, 0, 0)`);
    expect(style.borderRadius).toBe("10% / 4.6209%");
    // Checked the long way: the box's far corner lands where the matrix says, at any drawn width.
    for (const drawn of [400, 1000, 2000]) {
      const k = drawn / picture.width;
      const w = 0.195 * drawn, h = (w * 844) / 390;
      const x = 0.31 * drawn + a * w + -b * h, y = 0.12 * (drawn * 0.75) + b * w + a * h;
      expect(x).toBeCloseTo(k * (a * 390 + -b * 844 + 620), 6);
      expect(y).toBeCloseTo(k * (b * 390 + a * 844 + 180), 6);
    }
    // And how the picture sits round the slot: its middle, how many screen widths wide the picture is, its turn.
    const g = slotGeometry(picture, slot);
    expect(g.turn).toBeCloseTo(6, 6);
    expect(g.perWidth).toBeCloseTo(2000 / (390 * 0.9), 6);
    expect(g.centerX).toBeCloseTo((620 + (a * 390 - b * 844) / 2) / 2000, 6);
    expect(g.centerY).toBeCloseTo((180 + (b * 390 + a * 844) / 2) / 1500, 6);
    expect(g.spanX).toBeGreaterThan(1);
  });

  it("is placed by the art's own rules: never mirrored, never turned past 25 degrees, only the footer's lily on the dark", () => {
    for (const piece of ALL_PLACEMENTS) {
      expect(ART_IDS, piece.art).toContain(piece.art);
      expect(Math.abs(piece.rot), `${piece.art} is turned ${piece.rot} degrees`).toBeLessThanOrEqual(25);
      expect(piece.size, piece.art).toBeGreaterThan(0);
      // The footer's lily is the footer's own (components/marketing/footer.tsx) and no placement may use it on a pale ground.
      expect(piece.art).not.toBe("lily-footer");
      // The two flat-lays and the step pictures are pictures of their own, never strewn about.
      expect(["hero-flatlay", "experience-flatlay", "step-photo", "step-note", "step-send"]).not.toContain(piece.art);
    }
    // A placement has no way to flip a piece: where it lies, how wide, how far turned, and no more.
    for (const piece of ALL_PLACEMENTS) expect(Object.keys(piece).filter((k) => !["art", "x", "y", "size", "rot", "blur", "opacity", "phone", "eager", "from", "until"].includes(k))).toEqual([]);
    // One tall stem at the right edge, one lily by the questions, a few petals and a leaf: composed, not scattered.
    const desk = ALL_PLACEMENTS.filter((p) => p.phone !== "only" && p.until === undefined);
    expect(desk.filter((p) => p.art.startsWith("lily-")).length).toBeLessThanOrEqual(2);
    expect(desk.length).toBeLessThanOrEqual(7);
    expect(ALL_PLACEMENTS.filter((p) => p.phone === "only").length).toBeLessThanOrEqual(3);
  });
});
