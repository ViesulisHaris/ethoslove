import type { TemplateManifest } from "@/templates/types";

/** The rows of the hero's checklist, as keys of messages `templates.*`. */
export type IncludedKey = "featurePhotos" | "featureMusic" | "featureCaptions" | "featureCountdown" | "featureSurprise" | "featureVideo" | "featureFullLetter" | "featureVoice" | "group.featureNotes";

export type IncludedRow = { key: IncludedKey; values?: Record<string, number> };

/**
 * The checklist under a gift's hero: only what this template has. What it lacks is not a list to read.
 *
 * `note`: the template's free version is the short note (lib/gift/free-tier.ts), and the list is
 * headed "With “Make it special”". It is then what the unlock adds and nothing the free note
 * already has: the note carries its song, its countdown and its hidden P.S. free, and the list
 * used to name all three under that heading, as if they cost the unlock's price (the test of
 * 21 Nov 2026). What the unlock adds is what lib/gift/publish.ts asks an unlock for on a note:
 * photos (and so their captions), a video, a voice message, and a letter past the free length.
 *
 * A template sold only as a group card (lib/gift/free-tier.ts `soldAsGroup`) opens the list with
 * how many notes people can add.
 */
export function includedRows(manifest: Pick<TemplateManifest, "features">, note: boolean): IncludedRow[] {
  const { photos, music, captions, countdown, surprise, video, group } = manifest.features;
  const row = (key: IncludedKey, has: boolean = true, values?: Record<string, number>): IncludedRow[] => (has ? [{ key, values }] : []);
  // Two columns on the page, filled row by row: the long row (the letter) is third, so it lands in the first column, clear of the stem at the page's edge.
  if (note) return [...row("featurePhotos", true, { max: photos.max }), ...row("featureCaptions", captions), ...row("featureFullLetter"), ...row("featureVideo", video), ...row("featureVoice")];
  return [...row("group.featureNotes", (group?.min ?? 0) > 0, { max: group?.max ?? 0 }), ...row("featurePhotos", true, { max: photos.max }), ...row("featureMusic", music), ...row("featureCaptions", captions), ...row("featureCountdown", countdown), ...row("featureSurprise", surprise), ...row("featureVideo", video)];
}
