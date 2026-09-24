import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isPlaceId } from "@/lib/dates/details";
import { isLatLng } from "@/lib/dates/geo";
import { findPlacePhoto, lookupPlaceDetails } from "@/lib/dates/sources";
import { isPlaceKind, placeExtras, placeWeek } from "@/lib/app/places";
import { appLocale, NO_STORE, queryNumber } from "@/lib/app/http";

export const runtime = "nodejs";
export const maxDuration = 25;

const CACHED = "public, s-maxage=86400, stale-while-revalidate=2592000";

/**
 * GET /api/app/place: one place for the app's detail screen — its details (address, hours, website,
 * phone), the week's opening hours already read, a real photograph where one exists (by its Wikidata
 * item, then by name), the searches on other review sites, and a Tiqets link where the kind sells a
 * door. `name`, `lat` and `lng` come from the list; `kind`, `named`, `notable` and `where` (the
 * town searched in) are optional and only shape the links.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const id = params.get("id") ?? "";
  const lat = queryNumber(params, "lat");
  const lng = queryNumber(params, "lng");
  const name = (params.get("name") ?? "").trim().slice(0, 120);
  if (!isPlaceId(id) || lat === null || lng === null || !isLatLng(lat, lng)) return NextResponse.json({ error: "bad_request" }, { status: 400, headers: NO_STORE });
  const locale = appLocale(params);
  const kind = params.get("kind");
  if (!(await rateLimit(`app-place:${clientIp(request.headers)}`, { limit: 60, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });

  const details = await lookupPlaceDetails(id, locale);
  const photo = name || details?.wikidata ? await findPlacePhoto({ name, lat, lng, qid: details?.wikidata }) : null;
  const { links, tickets } = placeExtras({
    name,
    lat,
    lng,
    locale,
    details,
    kind: isPlaceKind(kind) ? kind : null,
    named: params.get("named") !== "0",
    notable: params.get("notable") === "1",
    where: (params.get("where") ?? "").slice(0, 80),
  });
  // Nominatim and Overpass both failing is usually a moment's trouble: not kept for a day.
  return NextResponse.json({ details, week: placeWeek(details?.hours), photo, links, tickets }, { headers: { "cache-control": details ? CACHED : "no-store" } });
}
