import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isLatLng } from "@/lib/dates/geo";
import { RARE_RADIUS_M } from "@/lib/dates/overpass";
import { rareCenter, rareFinds } from "@/lib/dates/sources";

export const runtime = "nodejs";
export const maxDuration = 30;

const HOUR = 60 * 60;
const WEEK = HOUR * 24 * 7;

/**
 * The rare finds within a short ride: bowling, arcades, climbing, karaoke, boats, spas, wineries,
 * the beach. Asked of the public Overpass servers, which are slow when they answer at all, so the
 * page shows the neighbourhood first and adds these when they arrive. The point is rounded to
 * about a kilometre: a bowling alley eight kilometres away is the same one from the next street.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (!params.get("lat") || !params.get("lng") || !isLatLng(lat, lng)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const locale = params.get("locale") === "es" ? "es" : "en";
  if (!(await rateLimit(`dates-rare:${clientIp(request.headers)}`, { limit: 20, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const center = rareCenter({ lat, lng });
  const places = await rareFinds(center, locale);
  // Not an error as far as the page is concerned: the rare finds are a bonus, and a red line in
  // somebody's console for a busy third-party server helps nobody. Not cached, so the next visitor asks again.
  if (!places) return NextResponse.json({ center, radiusM: RARE_RADIUS_M, places: [], unavailable: true }, { headers: { "cache-control": "no-store" } });
  // Nothing found is an answer, but kept an hour, not weeks: it may be a server with holes in its data.
  const kept = places.length > 0 ? `public, s-maxage=${WEEK}, stale-while-revalidate=${WEEK * 4}` : `public, s-maxage=${HOUR}`;
  return NextResponse.json({ center, radiusM: RARE_RADIUS_M, places }, { headers: { "cache-control": kept } });
}
