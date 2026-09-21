import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isLatLng, snapSearch } from "@/lib/dates/geo";
import { GROUP_IDS, type PlaceGroup } from "@/lib/dates/kinds";
import { balance } from "@/lib/dates/places";
import { poisOfTile } from "@/lib/dates/tile-source";
import { mergePlaces, placesFromPois, tilesCovering } from "@/lib/dates/tiles";

export const runtime = "nodejs";
export const maxDuration = 20;

/** Enough of each group to fill the map without sending a city's every restaurant to a phone. */
const PER_GROUP = 60;
/** A neighbourhood changes slowly: a day fresh, a week stale-but-served while it refreshes. */
const FRESH_SECONDS = 60 * 60 * 24;

/**
 * Places for a date near a point, read out of the same OpenStreetMap vector tiles the map is
 * drawn from. The point is snapped to a grid before anything is fetched, so everybody looking at
 * one neighbourhood shares a cached answer and nobody's exact position is in a URL or a log.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const radius = Number(params.get("radius") ?? 1500);
  if (!params.get("lat") || !params.get("lng") || !isLatLng(lat, lng) || !Number.isFinite(radius)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const locale = params.get("locale") === "es" ? "es" : "en";
  const asked = (params.get("groups") ?? "").split(",").filter((g): g is PlaceGroup => (GROUP_IDS as string[]).includes(g));
  const groups = asked.length > 0 ? GROUP_IDS.filter((g) => asked.includes(g)) : GROUP_IDS;

  if (!(await rateLimit(`dates:${clientIp(request.headers)}`, { limit: 60, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const { center, radiusM } = snapSearch({ lat, lng }, radius);
  const tiles = tilesCovering(center, radiusM);
  const results = await Promise.all(tiles.map(async (tile) => ({ tile, ...(await poisOfTile(tile)) })));
  if (results.every((r) => !r.ok)) return NextResponse.json({ error: "unavailable", center, radiusM, places: [] }, { status: 503 });

  const all = mergePlaces(...results.map((r) => placesFromPois(r.features, r.tile, center, radiusM, locale)));
  const places = balance(all.filter((p) => groups.includes(p.group)), PER_GROUP);
  // A missing tile is a hole in the map; say so, and do not let the CDN keep the holey answer for a day.
  const complete = results.every((r) => r.ok);
  return NextResponse.json(
    { center, radiusM, total: all.length, complete, places },
    { headers: { "cache-control": complete ? `public, s-maxage=${FRESH_SECONDS}, stale-while-revalidate=${FRESH_SECONDS * 7}` : "no-store" } },
  );
}
