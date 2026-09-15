import type { GiftData } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import { isLocalRef, isStoragePath } from "./assets";

export type Entitlement = {
  /** User owns this template (or Everything). */
  unlocked: boolean;
};

export type PublishDecision =
  | { ok: true; watermark: boolean; isPremium: boolean }
  | { ok: false; reason: "payment_required" | "not_ready"; problems?: string[] };

/**
 * Pure publish rules — unit tested, shared by the server action and the publish sheet.
 *
 * Free templates publish for free with a watermark. Any unlock (the template or "Everything")
 * removes the watermark and lifts limits. Premium templates need an unlock, full stop.
 */
export function decidePublish(
  manifest: TemplateManifest,
  data: GiftData,
  entitlement: Entitlement,
  options: { removeWatermark: boolean; schedule: boolean; password: boolean },
): PublishDecision {
  const problems = readinessProblems(manifest, data);
  if (problems.length > 0) return { ok: false, reason: "not_ready", problems };

  const needsUnlock = manifest.tier === "premium" || options.removeWatermark || options.schedule || options.password || premiumExtras(data).length > 0;

  if (needsUnlock && !entitlement.unlocked) return { ok: false, reason: "payment_required" };

  return { ok: true, watermark: !entitlement.unlocked, isPremium: manifest.tier === "premium" };
}

export type PremiumExtra = "song" | "video" | "voiceNote" | "morePhotos";

/** Content-level extras that need an unlock on any template (the free tier stays a real gift, these are the upsell). */
export function premiumExtras(data: GiftData): PremiumExtra[] {
  const extras: PremiumExtra[] = [];
  if (data.music && !isFreeMusic(data.music)) extras.push("song");
  if (data.video) extras.push("video");
  if (data.voiceNote) extras.push("voiceNote");
  if (data.photos.length > 10) extras.push("morePhotos");
  return extras;
}

/**
 * Free music is a track from our own library or a file the sender uploaded. Anything else is the
 * paid real-song feature whatever its `source` says, so a catalog preview relabelled "library" or
 * "upload" still counts as one.
 */
function isFreeMusic(music: NonNullable<GiftData["music"]>): boolean {
  if (music.source === "library") return music.url.startsWith("/audio/library/");
  if (music.source === "upload") return isStoragePath(music.url) || isLocalRef(music.url);
  return false;
}

/**
 * Editing a gift that is already live or scheduled must not sneak premium content past the
 * paywall: anything that would have needed an unlock at publish time needs one now too.
 */
export function liveEditNeedsUnlock(
  manifest: TemplateManifest,
  data: Pick<GiftData, "music" | "video" | "voiceNote" | "photos">,
  row: { hasSchedule: boolean; hasPassword: boolean; watermark: boolean },
): boolean {
  return manifest.tier === "premium" || premiumExtras(data as GiftData).length > 0 || row.hasSchedule || row.hasPassword || !row.watermark;
}

/** Human-readable blockers, keyed for translation on the client. */
export function readinessProblems(manifest: TemplateManifest, data: GiftData): string[] {
  const problems: string[] = [];
  if (!data.recipientName.trim()) problems.push("recipientName");
  if (!data.senderName.trim()) problems.push("senderName");
  if (!data.message.trim()) problems.push("message");
  if (data.photos.length < manifest.features.photos.min) problems.push("photosMin");
  if (data.photos.length > manifest.features.photos.max) problems.push("photosMax");
  if (data.photos.some((p) => !isStoragePath(p.url) && !p.url.startsWith("http"))) problems.push("uploadsPending");
  if (data.music?.source === "upload" && !isStoragePath(data.music.url) && !data.music.url.startsWith("http")) problems.push("uploadsPending");
  if (data.video && !isStoragePath(data.video.url) && !data.video.url.startsWith("http")) problems.push("uploadsPending");
  if (data.voiceNote && !isStoragePath(data.voiceNote.url) && !data.voiceNote.url.startsWith("http")) problems.push("uploadsPending");
  return Array.from(new Set(problems));
}
