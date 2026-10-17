import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { googleRating, tripadvisorRating, type Elsewhere } from "@/lib/dates/elsewhere";
import { isLatLng } from "@/lib/dates/geo";
import type { Place } from "@/lib/dates/places";

export const runtime = "nodejs";
export const maxDuration = 15;

/** Tripadvisor allows a day; Google asks that scores are not kept. Six hours is inside both. */
const FRESH_SECONDS = 60 * 60 * 6;

/**
 * What Tripadvisor and Google say about one place, when this install has their keys. With no keys
 * it answers `{ ratings: [] }` and the sheet shows links out instead, which is the honest state:
 * neither site gives its scores away, and neither may be scraped.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const name = (params.get("name") ?? "").slice(0, 120).trim();
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (!name || !isLatLng(lat, lng)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!env.tripadvisorKey && !env.googlePlacesKey) return NextResponse.json({ ratings: [] as Elsewhere[], configured: false });
  if (!(await rateLimit(`elsewhere:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const place = { name, lat, lng } as Place;
  const [tripadvisor, google] = await Promise.all([
    env.tripadvisorKey ? tripadvisorRating(place, env.tripadvisorKey).catch(() => null) : null,
    env.googlePlacesKey ? googleRating(place, env.googlePlacesKey).catch(() => null) : null,
  ]);
  const ratings = [tripadvisor, google].filter((r): r is Elsewhere => r !== null);
  return NextResponse.json({ ratings, configured: true }, { headers: { "cache-control": `public, s-maxage=${FRESH_SECONDS}, stale-while-revalidate=${FRESH_SECONDS}` } });
}
