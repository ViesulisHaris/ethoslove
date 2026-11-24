import "server-only";

import type { Db } from "@/lib/commerce/db";
import { GIFTS_BUCKET, storageObjectKey } from "@/lib/gift/assets";

/**
 * Where a group card's photos live. A photo waits in the private `contributions` bucket (migration
 * 0023) at "<group id>/<contribution id>.webp" until the sender says yes: the gifts bucket would
 * sweep it away after a day as a file no gift mentions. Saying yes copies it into the gift's own
 * folder, "gifts/<gift id>/c<key>.webp", and from then on it is one of the gift's files like any
 * other. Only the server reads or writes either: there are no storage policies for this bucket.
 *
 * Kept apart from ./photo (which only re-encodes) so the routes' tests can stand in for Storage.
 */
export const CONTRIBUTIONS_BUCKET = "contributions";

export const pendingPhotoPath = (groupId: string, entryId: string) => `${groupId}/${entryId}.webp`;
export const giftPhotoPath = (giftId: string, key: string) => `${GIFTS_BUCKET}/${giftId}/c${key}.webp`;

/** How long the sender's panel can show a waiting photo before it asks again. */
const PREVIEW_SECONDS = 60 * 60;
/** As the editor's own previews of a gift's files (signAssetUrls). */
const GIFT_PREVIEW_SECONDS = 60 * 60 * 6;

export async function storePendingPhoto(admin: Db, path: string, webp: Buffer): Promise<boolean> {
  const { error } = await admin.storage.from(CONTRIBUTIONS_BUCKET).upload(path, webp, { contentType: "image/webp", upsert: false });
  return !error;
}

export async function removePendingPhotos(admin: Db, paths: string[]): Promise<void> {
  for (let i = 0; i < paths.length; i += 100) await admin.storage.from(CONTRIBUTIONS_BUCKET).remove(paths.slice(i, i + 100));
}

/** Signed addresses for waiting photos, by path; a path that can't be signed is simply absent. */
export async function signPendingPhotos(admin: Db, paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const { data } = await admin.storage.from(CONTRIBUTIONS_BUCKET).createSignedUrls(paths, PREVIEW_SECONDS);
  const out: Record<string, string> = {};
  (data ?? []).forEach((row, i) => {
    if (row.signedUrl) out[paths[i]] = row.signedUrl;
  });
  return out;
}

/**
 * The sender said yes, with the photo: it is copied into the gift's own folder under the note's key.
 * Returns the gift's path for it and an address to preview it by, or null when the copy failed.
 */
export async function copyPhotoToGift(admin: Db, from: string, giftId: string, key: string): Promise<{ path: string; previewUrl: string | null } | null> {
  const { data: file, error } = await admin.storage.from(CONTRIBUTIONS_BUCKET).download(from);
  if (error || !file) return null;
  const path = giftPhotoPath(giftId, key);
  const { error: failed } = await admin.storage.from(GIFTS_BUCKET).upload(storageObjectKey(path), Buffer.from(await file.arrayBuffer()), { contentType: "image/webp", upsert: true, cacheControl: "31536000" });
  if (failed) return null;
  const { data: signed } = await admin.storage.from(GIFTS_BUCKET).createSignedUrl(storageObjectKey(path), GIFT_PREVIEW_SECONDS);
  return { path, previewUrl: signed?.signedUrl ?? null };
}

/** Every waiting photo of one group (its folder), removed. Best effort: the daily job finds what is left. */
export async function deleteGroupStorage(admin: Db, groupId: string): Promise<void> {
  for (let page = 0; page < 5; page++) {
    const { data, error } = await admin.storage.from(CONTRIBUTIONS_BUCKET).list(groupId, { limit: 100 });
    if (error || !data?.length) return;
    await removePendingPhotos(admin, data.map((file) => `${groupId}/${file.name}`));
    if (data.length < 100) return;
  }
}
