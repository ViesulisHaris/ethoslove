import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isLatLng, snapSearch } from "@/lib/dates/geo";
import { findSights, placeRatings, rareCenter, rareFinds, searchPlaces } from "@/lib/dates/sources";
import { rankForApp } from "@/lib/app/places";
import { appLocale, NO_STORE, queryNumber } from "@/lib/app/http";

export const runtime = "nodejs";
// The rare finds wait up to 22 s on the public Overpass servers (lib/dates/sources.ts); the rest runs
// alongside them. The app asks for them in the background, after its first list without them.
export const maxDuration = 35;

const CACHED = "public, s-maxage=600, stale-while-revalidate=86400";

/**
 * GET /api/app/places: the Explore list for the iPhone app in one call — the neighbourhood's places
 * (and, with rare=1, the rare finds), photographs, couples' ratings and rank, as /dates works them
 * out in the browser (lib/app/places.ts). The phone has rounded lat/lng to three decimals already.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = queryNumber(params, "lat");
  const lng = queryNumber(params, "lng");
  const radius = queryNumber(params, "radius") ?? 1500;
  if (lat === null || lng === null || !isLatLng(lat, lng)) return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  const locale = appLocale(params);
  const withRare = params.get("rare") === "1";
  const withPhotos = params.get("photos") !== "0";
  if (!(await rateLimit(`app-places:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });

  const { center, radiusM } = snapSearch({ lat, lng }, radius);
  const [search, sights, rare] = await Promise.all([
    searchPlaces(center, radiusM, locale),
    withPhotos ? findSights(center, radiusM, locale) : Promise.resolve([]),
    withRare ? rareFinds(rareCenter(center), locale) : Promise.resolve(null),
  ]);
  if ("unavailable" in search) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: NO_STORE });

  const ids = [...search.places, ...(rare ?? [])].map((p) => p.id);
  const rated = await placeRatings(ids);
  const places = rankForApp({ center: search.center, places: search.places, rare, sights, ratings: rated?.ratings ?? {} });
  const rareAnswered = withRare && rare !== null;
  // Only a whole answer is kept at the edge: a missing tile, the ratings or asked-for rare finds that
  // didn't come would otherwise stick for ten minutes.
  const whole = search.complete && rated !== null && (!withRare || rareAnswered);
  return NextResponse.json(
    { center: search.center, radiusM: search.radiusM, total: search.total, complete: search.complete, rare: rareAnswered, places },
    { headers: { "cache-control": whole ? CACHED : "no-store" } },
  );
}
