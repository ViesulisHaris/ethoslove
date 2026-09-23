import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COVER_LOOKS, type CoverLook, type Cut } from "@/templates/_shared/covers/looks";
import { thumbLook, thumbSrc } from "@/lib/covers/thumbs";

const looks = Object.values(COVER_LOOKS);

function cutsOf(look: CoverLook): Cut[] {
  const cuts: Cut[] = [];
  for (const s of look.stickers) if (s.cut) cuts.push(s.cut);
  for (const a of look.attach ?? []) cuts.push(a.cut);
  if (look.piece.kind === "envelope" && look.piece.colors.sealArt) cuts.push(look.piece.colors.sealArt.cut);
  if (look.piece.kind === "gift" && look.piece.colors.bowArt) cuts.push(look.piece.colors.bowArt.cut);
  return cuts;
}

describe("covers drawn as thumbnails", () => {
  it("names the small copy beside the original", () => {
    expect(thumbSrc("/scraps/lace-red.webp")).toBe("/scraps/lace-red.thumb.webp");
    expect(thumbSrc("/memes/tulips.webp")).toBe("/memes/tulips.thumb.webp");
  });

  it("points every cut-out of every look at a small copy that exists", () => {
    for (const look of looks) {
      const small = cutsOf(thumbLook(look));
      expect(small.length, look.id).toBe(cutsOf(look).length);
      for (const cut of small) {
        expect(cut.src, look.id).toMatch(/\.thumb\.webp$/);
        expect(existsSync(join("public", cut.src)), `${look.id}: public${cut.src}`).toBe(true);
      }
    }
  });

  it("changes nothing else about the look", () => {
    for (const look of looks) {
      const small = thumbLook(look);
      expect(small.background).toBe(look.background);
      expect(small.piece.kind).toBe(look.piece.kind);
      expect(small.stickers.map((s) => [s.id, s.x, s.y, s.size, s.rotate, s.cut?.ratio])).toEqual(look.stickers.map((s) => [s.id, s.x, s.y, s.size, s.rotate, s.cut?.ratio]));
      expect(cutsOf(look).every((cut) => !cut.src.includes(".thumb."))).toBe(true);
    }
  });
});
