import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { parsePhoton } from "@/lib/places/photon";
import { spotAt } from "@/lib/places/photon-reverse";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * Photon is a free public server and some days takes eight seconds or more on a town it has not
 * been asked about lately. Giving up sooner threw away the answer every time, so it was never
 * cached and the next try was just as slow; waiting lets the slow answer arrive and be kept.
 */
const PHOTON_TIMEOUT_MS = 8000;

/**
 * Towns and cities for the place pickers (the editor's, and the where box on Dates, the home page
 * and Long distance), searched in OpenStreetMap through Photon (komoot's public geocoder, no key).
 * The editor saves the chosen coordinates into the gift, so recipients never wait on this; if
 * Photon is slow or down, the pickers still offer the built-in cities. A failure is answered with
 * an error status, never a 200 with no results: "no such town" and "couldn't ask" read differently.
 */
export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");
  if (lat !== null || lng !== null) return reverse(request, lat, lng);
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (query.length < 2) return NextResponse.json({ results: [] });
  if (!(await rateLimit(`places:${clientIp(request.headers)}`, { limit: 60, windowSeconds: 60 })))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  // Photon speaks English names on request; otherwise it answers with each place's local name.
  const lang = request.nextUrl.searchParams.get("lang") === "en" ? "&lang=en" : "";
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=15&osm_tag=place${lang}`, {
      next: { revalidate: 60 * 60 * 24 * 7 },
      headers: { "user-agent": "Ethos/1.0 (+https://tryethos.io)" },
      signal: AbortSignal.timeout(PHOTON_TIMEOUT_MS),
    });
    if (!res.ok) return NextResponse.json({ results: [] }, { status: 502 });
    return NextResponse.json({ results: parsePhoton(await res.json(), 8, query) }, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return NextResponse.json({ results: [] }, { status: 504 });
  }
}

const COORD = /^-?\d{1,3}(\.\d{1,6})?$/;

/**
 * What lies at a point (the halfway finder's middle): the city or town to name there, or whether it
 * is open water (lib/places/photon-reverse.ts). The point is rounded to about a kilometre and the
 * journey to ten, so the same halfway asks Photon once and is kept.
 */
async function reverse(request: NextRequest, latText: string | null, lngText: string | null) {
  if (!latText || !lngText || !COORD.test(latText) || !COORD.test(lngText)) return NextResponse.json({ error: "bad_point" }, { status: 400 });
  const lat = Math.round(Number(latText) * 100) / 100;
  const lng = Math.round(Number(lngText) * 100) / 100;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return NextResponse.json({ error: "bad_point" }, { status: 400 });
  if (!(await rateLimit(`places:${clientIp(request.headers)}`, { limit: 60, windowSeconds: 60 })))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  try {
    // How far each of them travels (to ten kilometres): how far off the middle a city may be and still be fair.
    const each = Math.round(Math.min(20040, Math.max(0, Number(request.nextUrl.searchParams.get("each")) || 0)) / 10) * 10;
    const spot = await spotAt({ lat, lng }, each, request.nextUrl.searchParams.get("lang") === "en" ? "en" : null);
    return NextResponse.json({ spot }, { headers: { "cache-control": "public, s-maxage=604800, stale-while-revalidate=2592000" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 504 });
  }
}
