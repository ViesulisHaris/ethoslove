/**
 * What is holding a gift back, in the sender's terms. The editor tracks files by id; the sender
 * thinks in "my song", "the clip", "three photos". A song that won't go up used to be reported as
 * "Some photos didn't upload", and removing "the failed photos" left the song where it was, so the
 * gift could never be published. Everything here is pure, so the checklist and the remove buttons
 * agree.
 */
import { isLocalRef } from "@/lib/gift/assets";
import type { GiftData } from "@/lib/gift/schema";
import type { AssetRecord } from "./types";

export type FailedGroup = "song" | "video" | "voice" | "photos";

/** Why, in a form the sender can act on: another file, a smaller file, the same file again, or another try. */
export type FailedReason = "type" | "too_big" | "missing" | "network" | "processing";

/** A file that is not up yet may simply still be going, which is nobody's fault and needs no alarm. */
export type StuckReason = FailedReason | "waiting";

export type FailedUpload = {
  group: FailedGroup;
  /** Photos that failed; 1 for everything else. */
  count: number;
  /** The song's title, so the sender recognises which file it is. */
  title?: string;
  reason: FailedReason;
  retryable: boolean;
};

export type StuckUpload = Omit<FailedUpload, "reason"> & { reason: StuckReason };

const ORDER: FailedGroup[] = ["song", "video", "voice", "photos"];

/** Failures a retry can't change: only a different file, or the same file added again, fixes these. */
export const LASTING_FAILURES: ReadonlySet<string> = new Set(["unsupported_type", "too_big", "unreadable", "missing_blob", "processing_failed"]);

export function reasonOf(error: string | undefined): FailedReason {
  switch (error) {
    case "unsupported_type":
      return "type";
    case "too_big":
      return "too_big";
    case "unreadable":
    case "missing_blob":
      return "missing";
    case "processing_failed":
      return "processing";
    default:
      return "network";
  }
}

/** Which part of the gift an asset belongs to, or null for a leftover nothing points at any more. */
export function groupOf(data: GiftData, asset: Pick<AssetRecord, "id" | "kind" | "objectUrl">): FailedGroup | null {
  const refers = (url: string | undefined) => Boolean(url) && (url === `idb:${asset.id}` || (asset.objectUrl !== undefined && url === asset.objectUrl));
  if (data.music?.source === "upload" && data.music.trackId === asset.id) return "song";
  if (data.voiceNote && refers(data.voiceNote.url)) return "voice";
  if (data.video && (refers(data.video.url) || refers(data.video.poster))) return "video";
  if (asset.kind === "photo" && data.photos.some((p) => p.id === asset.id)) return "photos";
  return null;
}

/** Is this the clip itself, rather than the still frame we cut from it? */
export function isVideoItself(data: GiftData, asset: Pick<AssetRecord, "id" | "objectUrl">): boolean {
  const url = data.video?.url;
  return Boolean(url) && (url === `idb:${asset.id}` || (asset.objectUrl !== undefined && url === asset.objectUrl));
}

export function summarizeFailedUploads(data: GiftData, assets: Record<string, AssetRecord>): FailedUpload[] {
  const groups = new Map<FailedGroup, FailedUpload>();
  for (const asset of Object.values(assets)) {
    if (asset.status !== "error" || asset.storagePath) continue;
    const group = groupOf(data, asset);
    if (!group) continue;
    const reason = reasonOf(asset.error);
    const entry: FailedUpload = { group, count: 1, reason, retryable: reason === "network" };
    if (group === "song" && data.music?.title) entry.title = data.music.title;
    const seen = groups.get(group);
    if (!seen) {
      groups.set(group, entry);
    } else if (group === "video") {
      // The clip speaks for its still frame: the sender added one thing, and the frame only matters once the clip is up.
      if (isVideoItself(data, asset)) groups.set(group, entry);
    } else {
      seen.count += 1;
      seen.retryable ||= entry.retryable;
      // Say the reason another try won't fix, since that's the one the sender has to act on.
      if (seen.reason === "network" && reason !== "network") seen.reason = reason;
    }
  }
  return ORDER.flatMap((group) => groups.get(group) ?? []);
}

/** The asset behind a url the gift still points at on this device. */
function assetIdFor(url: string, assets: Record<string, AssetRecord>): string | undefined {
  if (url.startsWith("idb:")) return url.slice(4);
  return Object.values(assets).find((a) => a.objectUrl === url)?.id;
}

/**
 * Everything the gift still points at on this device rather than in Storage: the song, the clip, the
 * voice message, the photos. Read from the gift itself rather than from the upload records, because a
 * record that went missing used to leave the checklist waiting on a file nobody could see or remove.
 */
export function stuckUploads(data: GiftData, assets: Record<string, AssetRecord>): StuckUpload[] {
  const groups = new Map<FailedGroup, StuckUpload>();
  const add = (group: FailedGroup, id: string | undefined, title?: string) => {
    const asset = id ? assets[id] : undefined;
    const reason: StuckReason = asset?.status === "error" ? reasonOf(asset.error) : asset ? "waiting" : "missing";
    const retryable = reason === "waiting" || reason === "network";
    const seen = groups.get(group);
    if (!seen) {
      groups.set(group, { group, count: 1, title, reason, retryable });
      return;
    }
    seen.count += 1;
    seen.retryable ||= retryable;
    // A file that failed outranks one that is merely slow: that is the one the sender has to act on.
    if (seen.reason === "waiting" && reason !== "waiting") seen.reason = reason;
  };

  if (data.music?.source === "upload" && isLocalRef(data.music.url)) add("song", data.music.trackId ?? assetIdFor(data.music.url, assets), data.music.title);
  if (data.video && isLocalRef(data.video.url)) add("video", assetIdFor(data.video.url, assets));
  if (data.voiceNote && isLocalRef(data.voiceNote.url)) add("voice", assetIdFor(data.voiceNote.url, assets));
  for (const photo of data.photos) if (isLocalRef(photo.url)) add("photos", photo.id);
  return ORDER.flatMap((group) => groups.get(group) ?? []);
}
