import { NextResponse, type NextRequest } from "next/server";

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
 * needs no key and returns 30-second previews that may be embedded with attribution.
 * Streaming full tracks from Spotify/Apple in a third-party player isn't possible without the
 * listener signing in, so previews are the ceiling for any gift product.
 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  const country = (request.nextUrl.searchParams.get("country") ?? "US").slice(0, 2).toUpperCase();
  if (q.length < 2) return NextResponse.json({ songs: [] }, { headers: { "cache-control": SEARCH_CACHE } });
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
