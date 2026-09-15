import type { GiftData } from "./schema";

/**
 * Asset URL conventions.
 *   blob:…            in-editor object URL (never persisted)
 *   idb:{assetId}     local draft reference, blob lives in IndexedDB
 *   gifts/{giftId}/…  Supabase Storage path (bucket "gifts"), persisted in gifts.data
 *   https://…         resolved signed URL (recipient page) or a library asset
 */
export const GIFTS_BUCKET = "gifts";
export const REACTIONS_BUCKET = "reactions";

export function isStoragePath(url: string): boolean {
  return url.startsWith(`${GIFTS_BUCKET}/`);
}

export function isLocalRef(url: string): boolean {
  return url.startsWith("blob:") || url.startsWith("idb:");
}

export function assetIdFromLocalRef(url: string): string | null {
  return url.startsWith("idb:") ? url.slice(4) : null;
}

/** Object key inside the bucket (what the Storage API wants). */
export function storageObjectKey(path: string): string {
  return path.startsWith(`${GIFTS_BUCKET}/`) ? path.slice(GIFTS_BUCKET.length + 1) : path;
}

export function buildStoragePath(giftId: string, assetId: string, ext: string): string {
  return `${GIFTS_BUCKET}/${giftId}/${assetId}.${ext}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The gift whose folder a Storage path sits in (`gifts/{giftId}/{file}`), or null when it isn't one. */
export function giftIdOfStoragePath(path: string): string | null {
  const [bucket, giftId, file, ...rest] = path.split("/");
  return bucket === GIFTS_BUCKET && giftId && UUID.test(giftId) && file && rest.length === 0 ? giftId : null;
}

/** Every Storage path a gift points at: photos, an uploaded song, the video and its poster, the voice note. */
export function storagePathsOf(data: Pick<GiftData, "photos" | "music" | "video" | "voiceNote">): string[] {
  return [
    ...data.photos.map((p) => p.url),
    ...(data.music?.source === "upload" ? [data.music.url] : []),
    ...(data.video ? [data.video.url, data.video.poster ?? ""] : []),
    ...(data.voiceNote ? [data.voiceNote.url] : []),
  ].filter(isStoragePath);
}

export function extensionForMime(mime: string): string {
  const map: Record<string, string> = {
    "image/webp": "webp",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/aac": "aac",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "audio/webm": "webm",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
  };
  return map[mime] ?? "bin";
}
