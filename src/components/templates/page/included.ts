import type { TemplateManifest } from "@/templates/types";

/** The rows of the hero's checklist, as keys of messages `templates.*`. */
export type IncludedKey = "featurePhotos" | "featureMusic" | "featureCaptions" | "featureCountdown" | "featureSurprise" | "featureVideo" | "featureFullLetter" | "featureVoice";

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
 */
export function includedRows(manifest: Pick<TemplateManifest, "features">, note: boolean): IncludedRow[] {
  const { photos, music, captions, countdown, surprise, video } = manifest.features;
  const row = (key: IncludedKey, has: boolean = true, values?: Record<string, number>): IncludedRow[] => (has ? [{ key, values }] : []);
  if (note) return [...row("featurePhotos", true, { max: photos.max }), ...row("featureCaptions", captions), ...row("featureVideo", video), ...row("featureFullLetter"), ...row("featureVoice")];
  return [...row("featurePhotos", true, { max: photos.max }), ...row("featureMusic", music), ...row("featureCaptions", captions), ...row("featureCountdown", countdown), ...row("featureSurprise", surprise), ...row("featureVideo", video)];
}
