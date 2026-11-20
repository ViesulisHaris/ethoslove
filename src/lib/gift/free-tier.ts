import type { TemplateManifest } from "@/templates/types";

/**
 * The free Letter as a short note (the owner's decision, 19 Nov 2026): 213 people a day sent a free
 * gift with their photos and nobody who did ever paid afterwards, so the free version of a "note"
 * template is the words and the song, and photos and a long letter belong to "Make it special".
 *
 * A gift is held to these rules when its own data says so (`freeTier: "note"`), which the editor
 * writes when the draft is started (lib/editor/free-tier-split.ts) and the server keeps from then
 * on (app/actions/gift.ts). A gift without it follows the rules it was made under: ten photos and
 * the whole letter, free.
 *
 * Constellations is held to the same rules (the owner, 19 Nov 2026: "Make it paid"), and for it
 * they mean there is no free version at all: a sky is made of at least three photos, and photos
 * are paid. noteCanBeFree tells the two apart.
 */
export const NOTE_TEMPLATES: readonly string[] = ["the-letter", "constellations"];

/** How long a free note may be, in characters as the sender counts them. */
export const FREE_NOTE_MAX_CHARS = 500;

/**
 * A note with photos (the "photos" product, lib/pricing/products.ts): the short note keeps up to
 * this many of the sender's photos. It is still a note: the free length and the footer stay.
 */
export const NOTE_PHOTOS_MAX = 5;

export type FreeTier = "note";

/** The letter's length the way the counter shows it: an emoji is one, the edges' blank space none. */
export function noteLength(message: string): number {
  return Array.from(message.trim()).length;
}

/** The share of new gifts held to the note's rules, from the build's setting (0 to 1): 0 when unset or unreadable. */
export function noteShare(raw: string | undefined = process.env.NEXT_PUBLIC_FREE_NOTE_SHARE): number {
  const n = Number(raw);
  return raw !== undefined && raw !== "" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}

/** True once every new gift is held to the note's rules: the test is over and the note is the only version. */
export function noteForEveryone(share: number = noteShare()): boolean {
  return share >= 1;
}

/**
 * The version a gift is published under, decided by the server. One that is already out keeps its
 * row's, whatever an edit claims. A first publish takes the draft's word only while the test splits
 * visitors, when either answer is what half of them get anyway; once the note is for everyone it
 * is the note, and what the draft says no longer matters.
 */
export function freeTierAtPublish(claimed: unknown, row: { live: boolean; stored: unknown }, share: number = noteShare()): FreeTier | undefined {
  if (row.live) return row.stored === "note" ? "note" : undefined;
  return noteForEveryone(share) || claimed === "note" ? "note" : undefined;
}

/** Whether an edit brings a photo the gift didn't already hold, by its stored path. */
export function addsPhotos(stored: unknown, next: readonly { url: string }[]): boolean {
  const had = new Set(
    Array.isArray(stored) ? stored.map((p) => (p && typeof p === "object" && typeof (p as { url?: unknown }).url === "string" ? (p as { url: string }).url : "")) : [],
  );
  return next.some((p) => !had.has(p.url));
}

/**
 * Once the note is for everyone, a free gift sent under the earlier rules keeps the photos it has
 * and takes no new ones without the unlock: otherwise anyone with an old free Letter could edit it
 * into the next free gift with photos, for good.
 */
export function oldFreeGiftAddsPhotos(
  manifest: Pick<TemplateManifest, "slug" | "tier">,
  row: { stored: unknown; photos: unknown },
  next: readonly { url: string }[],
  share: number = noteShare(),
): boolean {
  return noteForEveryone(share) && manifest.tier === "free" && NOTE_TEMPLATES.includes(manifest.slug) && row.stored !== "note" && addsPhotos(row.photos, next);
}

/**
 * Whether a template held to the note's rules can still go out free: only one that works without
 * photos (The Letter asks for one at most, and a note drops even that). One built from photos
 * (Constellations, three or more) has nothing left to send free.
 */
export function noteCanBeFree(manifest: Pick<TemplateManifest, "features">): boolean {
  return manifest.features.photos.min <= 1;
}

/**
 * Whether "a note with photos" is sold on a template: one whose free version is the short note
 * and can go out free at all (The Letter). Constellations has no free note for photos to join.
 */
export function sellsNotePhotos(manifest: Pick<TemplateManifest, "slug" | "tier" | "features"> | null | undefined): boolean {
  return Boolean(manifest) && manifest!.tier === "free" && NOTE_TEMPLATES.includes(manifest!.slug) && noteCanBeFree(manifest!);
}

/**
 * Whether a template is shown as free: a free template, unless the note is for everyone and the
 * template has no free version under it (Constellations then sells at the "Make it special" price).
 * It is what the gallery, the template pages and the price lists say. The commerce code keeps
 * reading `tier`, which never changes: "Make it special" is still what both free templates sell.
 */
export function sendsFree(manifest: Pick<TemplateManifest, "slug" | "tier" | "features">, share: number = noteShare()): boolean {
  return manifest.tier === "free" && !(noteForEveryone(share) && NOTE_TEMPLATES.includes(manifest.slug) && !noteCanBeFree(manifest));
}

/** Whether this gift's free version is the short note. A gift that hasn't loaded yet is not one. */
export function noteRules(manifest: Pick<TemplateManifest, "slug" | "tier">, data: { freeTier?: unknown } | null | undefined): boolean {
  return manifest.tier === "free" && NOTE_TEMPLATES.includes(manifest.slug) && data?.freeTier === "note";
}
