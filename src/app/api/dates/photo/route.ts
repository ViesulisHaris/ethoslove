import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isLatLng } from "@/lib/dates/geo";
import { isQid, PHOTO_NAME_MIN } from "@/lib/dates/photos";
import { findPlacePhoto } from "@/lib/dates/sources";

export const runtime = "nodejs";
export const maxDuration = 15;

const MONTH = 60 * 60 * 24 * 30;

/**
 * A real photograph of one place, if anybody has given one away: the picture its Wikidata item
 * names when it has one, otherwise a geotagged photograph on Wikimedia Commons taken within a
 * couple of hundred metres and named after it. Author and licence come with it. "No photo" is an
 * answer too, and is kept for a month like any other.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const name = (params.get("name") ?? "").trim().slice(0, 120);
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const qid = params.get("qid") ?? "";
  // A short name is only worth a request when a Wikidata id comes with it: the id finds the picture, the name alone can't.
  if ((name.length < PHOTO_NAME_MIN && !qid) || name.length === 0 || !params.get("lat") || !params.get("lng") || !isLatLng(lat, lng) || (qid !== "" && !isQid(qid))) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!(await rateLimit(`dates-photo:${clientIp(request.headers)}`, { limit: 120, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const photo = await findPlacePhoto({ name, lat, lng, qid });
  return NextResponse.json({ photo }, { headers: { "cache-control": `public, s-maxage=${MONTH}, stale-while-revalidate=${MONTH * 3}` } });
}
