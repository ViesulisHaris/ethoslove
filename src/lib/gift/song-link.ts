/**
 * "This song reminds me of you": a link out to the full song where the recipient already listens.
 * Only YouTube, Spotify and Apple Music are accepted, and every link is rebuilt from its parts, so a
 * gift can never send someone to an arbitrary site or carry tracking parameters along.
 */
export type SongProvider = "youtube" | "spotify" | "apple";
export type SongLink = { provider: SongProvider; url: string; videoId?: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const SPOTIFY_ID = /^[A-Za-z0-9]{22}$/;

/** Hosts a thumbnail may come from: the providers' own image CDNs. */
const THUMBNAIL_HOSTS = [/^i\.ytimg\.com$/, /^i\.scdn\.co$/, /^[a-z0-9-]+\.spotifycdn\.com$/, /^[a-z0-9-]+\.mzstatic\.com$/];

export function parseSongLink(input: string): SongLink | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1).split("/")[0];
    return YOUTUBE_ID.test(id) ? { provider: "youtube", url: `https://www.youtube.com/watch?v=${id}`, videoId: id } : null;
  }
  if (host === "youtube.com" || host === "music.youtube.com") {
    const id = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/)?.[1];
    if (!id || !YOUTUBE_ID.test(id)) return null;
    const base = host === "music.youtube.com" ? "https://music.youtube.com" : "https://www.youtube.com";
    return { provider: "youtube", url: `${base}/watch?v=${id}`, videoId: id };
  }
  if (host === "open.spotify.com") {
    const m = url.pathname.match(/^\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?(track|album|playlist)\/([^/?#]+)/i);
    return m && SPOTIFY_ID.test(m[2]) ? { provider: "spotify", url: `https://open.spotify.com/${m[1].toLowerCase()}/${m[2]}` } : null;
  }
  if (host === "music.apple.com") {
    const m = url.pathname.match(/^\/([a-z]{2})\/(album|song|playlist)\/([^?#]+)$/i);
    if (!m) return null;
    const segments = m[3].split("/").filter(Boolean);
    if (!segments.length || !segments.every((s) => /^[\p{L}\p{N}._~%-]+$/u.test(s))) return null;
    const track = url.searchParams.get("i");
    const query = track && /^\d+$/.test(track) ? `?i=${track}` : "";
    return { provider: "apple", url: `https://music.apple.com/${m[1].toLowerCase()}/${m[2].toLowerCase()}/${segments.join("/")}${query}` };
  }
  return null;
}

export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** True for an https image on one of the providers' CDNs. */
export function isSongThumbnail(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && THUMBNAIL_HOSTS.some((re) => re.test(url.hostname.toLowerCase()));
  } catch {
    return false;
  }
}

export const SONG_PROVIDER_NAMES: Record<SongProvider, string> = { youtube: "YouTube", spotify: "Spotify", apple: "Apple Music" };
