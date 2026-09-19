import { mulberry32 } from "../_shared/random";
import { MEME_IDS, MEMES, withTag, type MemeId } from "../_shared/memes/catalogue";
import type { StickerBombFields } from "./schema";

/** How many stickers it takes to bury the page and open the card. */
export const DROPS = 12;

export type PackId = StickerBombFields["pack"];

export function packIds(pack: PackId): MemeId[] {
  if (pack === "party") return withTag("party");
  if (pack === "soft") return withTag("soft");
  if (pack === "cats") return MEME_IDS.filter((id) => MEMES[id].tags.includes("cat") && !MEMES[id].tags.includes("party"));
  return MEME_IDS;
}

export type Drop = { rotate: number; size: number } & ({ kind: "meme"; meme: MemeId; label?: string } | { kind: "photo"; photo: number });

/**
 * The twelve things that will land, decided up front so a replay and a second phone see the same
 * page: memes from the pack in a shuffled order with no two alike in a row, the sender's photos on
 * every other tap from the second, and a label under every other meme until the labels run out.
 */
export function planDrops(pack: PackId, photoCount: number, labels: string[], seed: number, total = DROPS): Drop[] {
  const random = mulberry32(seed);
  const ids = packIds(pack).slice();
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const written = labels.map((l) => l.trim()).filter(Boolean);
  const photos = Math.max(0, Math.min(photoCount, Math.floor(total / 2)));
  const drops: Drop[] = [];
  let meme = 0;
  let photo = 0;
  let label = 0;
  for (let i = 0; i < total; i++) {
    const rotate = Math.round((random() - 0.5) * 44);
    const size = 27 + random() * 8;
    if (i % 2 === 1 && photo < photos) {
      drops.push({ kind: "photo", photo: photo++, rotate: Math.round(rotate / 2), size: 30 + random() * 4 });
      continue;
    }
    const id = ids[meme % ids.length];
    const wantsLabel = meme % 2 === 0 && label < written.length;
    drops.push({ kind: "meme", meme: id, rotate, size, ...(wantsLabel ? { label: written[label++] } : {}) });
    meme++;
  }
  return drops;
}

/** How wide a sticker is drawn, in stage units: tall pictures get narrower so every sticker covers about the same area. */
export const stickerWidth = (id: MemeId, size: number): number => Math.round(size * Math.sqrt(MEMES[id].w / MEMES[id].h) * 10) / 10;

/**
 * Where drop `i` rests when nobody chose the spot: a ring round the middle of the page. Used for the
 * editor's still frame and for a tap from the keyboard, which has no finger to follow.
 */
export function restingSpot(i: number, total: number, seed: number): { x: number; y: number } {
  const random = mulberry32(seed + i * 101);
  const angle = (i / total) * Math.PI * 2 - Math.PI / 2 + (random() - 0.5) * 0.35;
  const reach = 0.82 + random() * 0.3;
  return { x: clamp(50 + Math.cos(angle) * 35 * reach, 12, 88), y: clamp(46 + Math.sin(angle) * 36 * reach, 9, 86) };
}

/** How far from either side a drop must stay, in percent: a labelled sticker needs room for its strip. */
export const sideMargin = (drop: Drop): number => (drop.kind === "meme" && drop.label ? 27 : 9);

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
