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

export type FreeTier = "note";

/** The letter's length the way the counter shows it: an emoji is one, the edges' blank space none. */
export function noteLength(message: string): number {
  return Array.from(message.trim()).length;
}

/**
 * Whether a template held to the note's rules can still go out free: only one that works without
 * photos (The Letter asks for one at most, and a note drops even that). One built from photos
 * (Constellations, three or more) has nothing left to send free.
 */
export function noteCanBeFree(manifest: Pick<TemplateManifest, "features">): boolean {
  return manifest.features.photos.min <= 1;
}

/** Whether this gift's free version is the short note. A gift that hasn't loaded yet is not one. */
export function noteRules(manifest: Pick<TemplateManifest, "slug" | "tier">, data: { freeTier?: unknown } | null | undefined): boolean {
  return manifest.tier === "free" && NOTE_TEMPLATES.includes(manifest.slug) && data?.freeTier === "note";
}
