import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isSongThumbnail, parseSongLink, youtubeThumbnail, type SongLink } from "@/lib/gift/song-link";

export const runtime = "nodejs";
export const maxDuration = 5;

export type SongLinkPreview = { link: SongLink; title?: string; artist?: string; thumbnail?: string };

const clip = (value: unknown, max: number) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined);

/**
 * Title and cover for a song link pasted in the editor, from the provider's public oEmbed
 * endpoint (YouTube and Spotify; Apple Music has none, so its links keep what the sender types).
 * The editor stores the result in the gift, so recipients never wait on this.
 */
export async function GET(request: NextRequest) {
  const link = parseSongLink(request.nextUrl.searchParams.get("url") ?? "");
  if (!link) return NextResponse.json({ error: "unsupported" }, { status: 400 });
  if (!(await rateLimit(`oembed:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 })))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const endpoint =
    link.provider === "youtube"
      ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link.url)}`
      : link.provider === "spotify"
        ? `https://open.spotify.com/oembed?url=${encodeURIComponent(link.url)}`
        : null;

  const preview: SongLinkPreview = { link };
  if (endpoint) {
    try {
      const res = await fetch(endpoint, { next: { revalidate: 60 * 60 * 24 }, headers: { "user-agent": "Ethos/1.0 (+https://tryethos.io)" }, signal: AbortSignal.timeout(3500) });
      if (res.ok) {
        const json = (await res.json()) as Record<string, unknown>;
        preview.title = clip(json.title, 120);
        preview.artist = clip(json.author_name, 120);
        const thumb = clip(json.thumbnail_url, 500);
        if (thumb && isSongThumbnail(thumb)) preview.thumbnail = thumb;
      }
    } catch {
      // A slow or failing provider still leaves a usable link.
    }
  }
  if (!preview.thumbnail && link.videoId) preview.thumbnail = youtubeThumbnail(link.videoId);
  return NextResponse.json(preview, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
