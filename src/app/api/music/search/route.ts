import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export const runtime = "nodejs";
export const maxDuration = 5;

const SEARCH_CACHE = "public, s-maxage=86400, stale-while-revalidate=604800";

export type CatalogSong = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artwork: string;
  /** 30-second preview (m4a), CORS-enabled. */
  previewUrl: string;
  /** Full-length track in the store, for attribution. */
  url: string;
  durationMs?: number;
};

/**
 * Song search for the "real song" music option. Proxies the public iTunes Search API, which
 * needs no key and returns 30-second previews.
 *
 * Apple's terms allow those previews only to promote the song in the store: not as entertainment,
 * not synchronised with video, not to sell something else. So a real song is free on every gift
 * (never a paid extra), and a gift plays its preview only when the recipient taps it on its own
 * card, once, beside the link to the song on Apple Music and "Preview courtesy of Apple Music"
 * (`SongPreviewCard`, `src/lib/gift/music.ts`). `url` is stored as the gift's link to the track;
 * gifts rebuild it without any query token before showing it.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const country = (request.nextUrl.searchParams.get("country") ?? "US").slice(0, 2).toUpperCase();
  if (q.length < 2) return NextResponse.json({ songs: [] }, { headers: { "cache-control": SEARCH_CACHE } });
  // Every search is a request to Apple from our servers: one visitor must not get us throttled for everyone.
  if (!(await rateLimit(`music:${clientIp(request.headers)}`, { limit: 60, windowSeconds: 60 })))
    return NextResponse.json({ songs: [], error: "rate_limited" }, { status: 429 });
  const url = new URL("https://itunes.apple.com/search");
  url.searchParams.set("term", q);
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "12");
  url.searchParams.set("country", /^[A-Z]{2}$/.test(country) ? country : "US");
  const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 }, headers: { "user-agent": "Ethos/1.0 (+https://tryethos.io)" } });
  if (!res.ok) return NextResponse.json({ songs: [], error: "upstream" }, { status: 502 });
  const json = (await res.json()) as { results?: Array<Record<string, unknown>> };
  const songs: CatalogSong[] = (json.results ?? [])
    .filter((r) => typeof r.previewUrl === "string")
    .map((r) => ({
      id: String(r.trackId),
      title: String(r.trackName ?? ""),
      artist: String(r.artistName ?? ""),
      album: typeof r.collectionName === "string" ? r.collectionName : undefined,
      artwork: String(r.artworkUrl100 ?? "").replace("100x100bb", "200x200bb"),
      previewUrl: String(r.previewUrl),
      url: String(r.trackViewUrl ?? ""),
      durationMs: typeof r.trackTimeMillis === "number" ? r.trackTimeMillis : undefined,
    }));
  return NextResponse.json({ songs }, { headers: { "cache-control": SEARCH_CACHE } });
}
