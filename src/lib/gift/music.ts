import type { GiftLocale, GiftMusic } from "./schema";
import { parseSongLink } from "./song-link";
import { isLocalRef, isStoragePath } from "./assets";

/**
 * The three kinds of music a gift can carry, and what each is allowed to do.
 *
 * Library tracks and the sender's own file are the gift's soundtrack: they may start when the gift
 * opens and loop under it. A real song is a 30-second preview from Apple's iTunes Search API, and
 * Apple allows those only to promote the track: never as background music, never looped, never
 * under a video, always beside a link to the song on Apple Music. So a preview only ever plays when
 * the recipient taps it on its own card (`SongPreviewCard`), once.
 *
 * Everything here goes by the URL as well as the `source` label, because the label is whatever the
 * client sent: a preview relabelled "library" must still never loop under the gift.
 */

/** Where iTunes Search serves previews from (audio-ssl.itunes.apple.com today, mzstatic.com before). */
const APPLE_PREVIEW_DOMAINS = ["itunes.apple.com", "mzstatic.com"];

/** Apple Music storefronts the editor searches in; a link we build ourselves uses the gift's. */
const STOREFRONT: Record<GiftLocale, string> = { en: "us", es: "es" };

export function isApplePreviewUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return parsed.protocol === "https:" && APPLE_PREVIEW_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

/** A real song from Apple's catalogue, whatever its label says. */
export function isCatalogPreview(music: GiftMusic | undefined): music is GiftMusic {
  return Boolean(music && (music.source === "catalog" || isApplePreviewUrl(music.url)));
}

/**
 * The music that may play under the gift: a library track or the sender's file. An Apple preview
 * never does; it gets its own tap-to-play card instead. This is what makes a gift published before
 * the rule changed stop looping its preview too.
 */
export function backgroundMusic(music: GiftMusic | undefined): GiftMusic | undefined {
  return music && !isCatalogPreview(music) ? music : undefined;
}

/**
 * Music we can vouch for: our own library, a file the sender uploaded, or a preview from Apple's
 * catalogue. Anything else is a URL the editor never produces.
 */
export function isKnownMusic(music: GiftMusic): boolean {
  if (isApplePreviewUrl(music.url)) return true;
  if (music.source === "library") return music.url.startsWith("/audio/library/");
  if (music.source === "upload") return isStoragePath(music.url) || isLocalRef(music.url);
  return false;
}

/**
 * The song's page on Apple Music, for the link beside the preview. Rebuilt from its parts by
 * `parseSongLink`, so nothing the search result carried in its query string (`uo=`, or an affiliate
 * `at=` token) reaches a gift page: only the track's own `?i=` survives.
 */
export function appleMusicTrackUrl(music: Pick<GiftMusic, "externalUrl" | "trackId">, locale: GiftLocale): string | null {
  const stored = music.externalUrl ? parseSongLink(music.externalUrl) : null;
  if (stored?.provider === "apple") return stored.url;
  if (music.trackId && /^\d{1,20}$/.test(music.trackId)) return `https://music.apple.com/${STOREFRONT[locale] ?? "us"}/song/${music.trackId}`;
  return null;
}
