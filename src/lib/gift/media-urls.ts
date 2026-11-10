import { giftIdOfStoragePath, isLocalRef, isStoragePath } from "./assets";
import { isApplePreviewUrl } from "./music";
import type { GiftData } from "./schema";

/**
 * Where a gift's photos, video, poster, voice note and music may point. Recipients' browsers load
 * every one of these the moment the gift opens, without asking anybody, so each is a request made
 * in their name: a URL on another server tells that server who opened the gift (address, device,
 * time), and a URL on this site is a request with the recipient's cookies. Until November 2026 a
 * sender could set a photo to their own sign-in link (/auth/confirm?token_hash=…) and every
 * recipient who opened the gift was signed in to the sender's account. The editor only ever
 * produces the kinds below, and on 10 Nov 2026 every published gift held only these (checked
 * read-only across 15,147 live and scheduled gifts), so nothing honest is refused.
 *
 *   gifts/<gift id>/<file>    the sender's upload (ownership is checked separately: ownsAssets)
 *   /demo/photos/…, /demo/audio/…   the template's demo files
 *   /audio/library/<file>     the bundled music library
 *   https://…apple…           a 30-second Apple preview (music only)
 *   idb:… / blob:…            an upload still on the sender's device: saved while it uploads,
 *                             never shown to anyone (publishing refuses it as "uploadsPending")
 */

/** A way out of the folder a site path names ("/demo/../auth/…"), written plainly or escaped. */
const CLIMB = /\.\.|%2e|%2f|\\/i;
const SITE_FOLDERS = ["/demo/photos/", "/demo/audio/", "/audio/library/"] as const;

function isSiteFile(url: string): boolean {
  return SITE_FOLDERS.some((folder) => url.startsWith(folder)) && !CLIMB.test(url);
}

export type MediaKind = "image" | "video" | "voice" | "music";

/** May a gift store this URL for this kind of media? `local`: also an upload still on the device. */
export function isAllowedMediaUrl(url: unknown, kind: MediaKind, { local = false }: { local?: boolean } = {}): boolean {
  if (typeof url !== "string" || url.length === 0 || url.length > 2000) return false;
  if (isStoragePath(url)) return giftIdOfStoragePath(url) !== null;
  if (isLocalRef(url)) return local;
  if (isSiteFile(url)) return true;
  return kind === "music" && isApplePreviewUrl(url);
}

/** Every media URL in a gift and the kind it is, as recipients would load them. */
function mediaUrls(data: Pick<GiftData, "photos" | "video" | "voiceNote" | "music">): { url: unknown; kind: MediaKind }[] {
  const out: { url: unknown; kind: MediaKind }[] = [];
  for (const photo of data.photos ?? []) out.push({ url: photo?.url, kind: "image" });
  if (data.video) {
    out.push({ url: data.video.url, kind: "video" });
    if (data.video.poster) out.push({ url: data.video.poster, kind: "image" });
  }
  if (data.voiceNote) out.push({ url: data.voiceNote.url, kind: "voice" });
  if (data.music) out.push({ url: data.music.url, kind: "music" });
  return out;
}

/** True when every photo, video, poster, voice note and music URL is one the gift may hold. */
export function mediaUrlsAllowed(data: Pick<GiftData, "photos" | "video" | "voiceNote" | "music">, options?: { local?: boolean }): boolean {
  return mediaUrls(data).every(({ url, kind }) => isAllowedMediaUrl(url, kind, options));
}

/** A transparent pixel: what a refused photo shows instead, so a template's layout keeps its shape. */
export const BLANK_IMAGE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * The recipient's copy with every refused URL taken out, for gifts saved before the rule above. A
 * local upload that never finished stays as it was (it was already broken, and is the sender's to
 * fix); anything else that isn't allowed becomes a blank photo or no video, voice note or music.
 */
export function withoutForeignMedia<T extends Pick<GiftData, "photos" | "video" | "voiceNote" | "music">>(data: T): T {
  const ok = (url: unknown, kind: MediaKind) => isAllowedMediaUrl(url, kind, { local: true });
  return {
    ...data,
    photos: (data.photos ?? []).map((photo) => (ok(photo?.url, "image") ? photo : { ...photo, url: BLANK_IMAGE })),
    video: data.video && ok(data.video.url, "video") ? { ...data.video, poster: data.video.poster && ok(data.video.poster, "image") ? data.video.poster : undefined } : undefined,
    voiceNote: data.voiceNote && ok(data.voiceNote.url, "voice") ? data.voiceNote : undefined,
    music: data.music && ok(data.music.url, "music") ? data.music : undefined,
  };
}
