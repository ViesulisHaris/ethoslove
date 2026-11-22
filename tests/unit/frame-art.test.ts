import { describe, expect, it } from "vitest";
import { FRAME_ART, type FrameArtId } from "@/components/marketing/home/cutouts";
import { pageArt, type ArtId } from "@/content/page-art";

/**
 * The flower frame round the front page's sections keeps a small table of its own pieces, so the
 * pages that draw it in the browser need not download the art's whole manifest. It has to say what
 * the manifest says: a new render that changes a file or a size shows up here.
 */
describe("the flower frame's table of rendered pieces", () => {
  it("names the blush files and sizes the manifest has", () => {
    for (const id of Object.keys(FRAME_ART) as FrameArtId[]) {
      const art = pageArt(id as ArtId, "blush");
      expect(FRAME_ART[id], id).toEqual({ src: art.src, src1x: art.src1x, width: art.width, height: art.height, width1x: art.width1x });
    }
  });
});
