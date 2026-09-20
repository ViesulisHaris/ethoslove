/**
 * The scraps the collage templates are made of: real flowers, lipstick kisses, lace, doilies and
 * pressed paper, each cut out of a sheet as one transparent WebP in /public/scraps by
 * scripts/cut-meme-stickers.py. Swap a file for another picture of the same shape and nothing else
 * changes. No film, game, music or brand artwork is in the set.
 */
export type ScrapKind = "pink-flower" | "blue-flower" | "kiss" | "soft" | "lace" | "pressed" | "trinket";
export type ScrapId = "blossom-gold" | "blossom-pale" | "blue-clematis" | "blue-cluster" | "blue-gerbera" | "blue-hibiscus" | "blue-lily" | "blue-pansy" | "blue-poppy" | "blue-rose" | "blue-spray" | "blue-velvet" | "bow-gingham" | "bow-red" | "cats-cuddle" | "cats-kiss" | "cats-nose" | "columbine" | "doily-pink" | "doily-red" | "dried-flowers" | "envelope-ps" | "heart-anatomical" | "heart-damask" | "heart-print" | "heart-print-pink" | "hibiscus-coral" | "hibiscus-pink" | "hibiscus-ruffle" | "kiss-1" | "kiss-2" | "kiss-3" | "kiss-4" | "kiss-dark" | "kiss-red" | "label-ornate" | "lace-red" | "leaf-skeleton" | "lily-blush" | "lily-pink" | "lily-stargazer" | "locket" | "paper-couple" | "peony-kraft" | "plaid-heart" | "plaster-heart" | "plumeria-pink" | "plumeria-rose" | "roses-kraft" | "sakura" | "star-felt" | "tag-tofrom" | "teddy" | "wax-seal";
export type ScrapInfo = { id: ScrapId; w: number; h: number; kind: ScrapKind };

export const SCRAPS: Record<ScrapId, ScrapInfo> = {
  "blossom-gold": { id: "blossom-gold", w: 466, h: 468, kind: "pink-flower" },
  "blossom-pale": { id: "blossom-pale", w: 438, h: 438, kind: "pink-flower" },
  "blue-clematis": { id: "blue-clematis", w: 458, h: 494, kind: "blue-flower" },
  "blue-cluster": { id: "blue-cluster", w: 838, h: 674, kind: "blue-flower" },
  "blue-gerbera": { id: "blue-gerbera", w: 442, h: 438, kind: "blue-flower" },
  "blue-hibiscus": { id: "blue-hibiscus", w: 514, h: 548, kind: "blue-flower" },
  "blue-lily": { id: "blue-lily", w: 414, h: 372, kind: "blue-flower" },
  "blue-pansy": { id: "blue-pansy", w: 432, h: 424, kind: "blue-flower" },
  "blue-poppy": { id: "blue-poppy", w: 504, h: 472, kind: "blue-flower" },
  "blue-rose": { id: "blue-rose", w: 406, h: 430, kind: "blue-flower" },
  "blue-spray": { id: "blue-spray", w: 472, h: 878, kind: "blue-flower" },
  "blue-velvet": { id: "blue-velvet", w: 454, h: 428, kind: "blue-flower" },
  "bow-gingham": { id: "bow-gingham", w: 506, h: 474, kind: "trinket" },
  "bow-red": { id: "bow-red", w: 146, h: 172, kind: "trinket" },
  "cats-cuddle": { id: "cats-cuddle", w: 526, h: 486, kind: "soft" },
  "cats-kiss": { id: "cats-kiss", w: 354, h: 602, kind: "soft" },
  "cats-nose": { id: "cats-nose", w: 412, h: 518, kind: "soft" },
  "columbine": { id: "columbine", w: 336, h: 324, kind: "pink-flower" },
  "doily-pink": { id: "doily-pink", w: 620, h: 644, kind: "lace" },
  "doily-red": { id: "doily-red", w: 804, h: 802, kind: "lace" },
  "dried-flowers": { id: "dried-flowers", w: 340, h: 568, kind: "pressed" },
  "envelope-ps": { id: "envelope-ps", w: 356, h: 432, kind: "trinket" },
  "heart-anatomical": { id: "heart-anatomical", w: 346, h: 456, kind: "trinket" },
  "heart-damask": { id: "heart-damask", w: 276, h: 280, kind: "lace" },
  "heart-print": { id: "heart-print", w: 260, h: 242, kind: "trinket" },
  "heart-print-pink": { id: "heart-print-pink", w: 332, h: 288, kind: "trinket" },
  "hibiscus-coral": { id: "hibiscus-coral", w: 532, h: 522, kind: "pink-flower" },
  "hibiscus-pink": { id: "hibiscus-pink", w: 412, h: 420, kind: "pink-flower" },
  "hibiscus-ruffle": { id: "hibiscus-ruffle", w: 506, h: 514, kind: "pink-flower" },
  "kiss-1": { id: "kiss-1", w: 214, h: 192, kind: "kiss" },
  "kiss-2": { id: "kiss-2", w: 234, h: 210, kind: "kiss" },
  "kiss-3": { id: "kiss-3", w: 242, h: 202, kind: "kiss" },
  "kiss-4": { id: "kiss-4", w: 200, h: 230, kind: "kiss" },
  "kiss-dark": { id: "kiss-dark", w: 242, h: 216, kind: "kiss" },
  "kiss-red": { id: "kiss-red", w: 404, h: 262, kind: "kiss" },
  "label-ornate": { id: "label-ornate", w: 332, h: 506, kind: "trinket" },
  "lace-red": { id: "lace-red", w: 996, h: 1154, kind: "lace" },
  "leaf-skeleton": { id: "leaf-skeleton", w: 388, h: 288, kind: "pressed" },
  "lily-blush": { id: "lily-blush", w: 446, h: 496, kind: "pink-flower" },
  "lily-pink": { id: "lily-pink", w: 478, h: 492, kind: "pink-flower" },
  "lily-stargazer": { id: "lily-stargazer", w: 488, h: 488, kind: "pink-flower" },
  "locket": { id: "locket", w: 550, h: 230, kind: "trinket" },
  "paper-couple": { id: "paper-couple", w: 348, h: 400, kind: "pressed" },
  "peony-kraft": { id: "peony-kraft", w: 544, h: 432, kind: "pressed" },
  "plaid-heart": { id: "plaid-heart", w: 490, h: 458, kind: "trinket" },
  "plaster-heart": { id: "plaster-heart", w: 574, h: 148, kind: "trinket" },
  "plumeria-pink": { id: "plumeria-pink", w: 506, h: 506, kind: "pink-flower" },
  "plumeria-rose": { id: "plumeria-rose", w: 504, h: 502, kind: "pink-flower" },
  "roses-kraft": { id: "roses-kraft", w: 558, h: 752, kind: "pressed" },
  "sakura": { id: "sakura", w: 438, h: 434, kind: "pink-flower" },
  "star-felt": { id: "star-felt", w: 176, h: 178, kind: "trinket" },
  "tag-tofrom": { id: "tag-tofrom", w: 536, h: 280, kind: "trinket" },
  "teddy": { id: "teddy", w: 498, h: 458, kind: "soft" },
  "wax-seal": { id: "wax-seal", w: 308, h: 300, kind: "trinket" },
};

export const SCRAP_IDS = Object.keys(SCRAPS) as ScrapId[];
export const scrapSrc = (id: ScrapId): string => `/scraps/${id}.webp`;
export const ofKind = (kind: ScrapKind): ScrapId[] => SCRAP_IDS.filter((id) => SCRAPS[id].kind === kind);
