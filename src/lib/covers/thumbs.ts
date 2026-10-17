import type { CoverLook, Cut } from "@/templates/_shared/covers/looks";

/**
 * A cover drawn as a thumbnail — a tile in the editor's cover picker, a card in the Openings strip
 * on /gifts — draws its cut-outs a few dozen pixels wide, yet asked for the full-size files:
 * 1.4 MB for the picker's sixteen tiles, a 996×1154 lace for a 66×76 corner. Each cut-out a cover
 * uses has a small copy next to it (`<name>.thumb.webp`, about a third of the weight in all): 256px
 * on its long side, or 336px wide for the Kisses cover's lace and doily, which span nearly the
 * width of a 228px Openings card and went soft on a retina screen at 256. A look passed through
 * `thumbLook` points at those. The gift itself keeps the originals: there the cover fills the screen.
 */
export const thumbSrc = (src: string): string => src.replace(/\.webp$/, ".thumb.webp");

const thumbCut = (cut: Cut): Cut => ({ ...cut, src: thumbSrc(cut.src) });

export function thumbLook(look: CoverLook): CoverLook {
  const { piece } = look;
  return {
    ...look,
    piece:
      piece.kind === "envelope"
        ? { kind: "envelope", colors: { ...piece.colors, sealArt: piece.colors.sealArt && { ...piece.colors.sealArt, cut: thumbCut(piece.colors.sealArt.cut) } } }
        : { kind: "gift", colors: { ...piece.colors, bowArt: piece.colors.bowArt && { ...piece.colors.bowArt, cut: thumbCut(piece.colors.bowArt.cut) } } },
    stickers: look.stickers.map((item) => (item.cut ? { ...item, cut: thumbCut(item.cut) } : item)),
    attach: look.attach?.map((item) => ({ ...item, cut: thumbCut(item.cut) })),
  };
}
