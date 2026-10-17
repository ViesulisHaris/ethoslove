import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isPlaceId } from "@/lib/dates/details";
import { lookupPlaceDetails } from "@/lib/dates/sources";

export const runtime = "nodejs";
export const maxDuration = 20;

const MONTH = 60 * 60 * 24 * 30;

/**
 * One place's address, opening hours, website and phone, looked up when somebody opens it: from
 * Nominatim (OpenStreetMap's own lookup), and from Overpass if that has nothing. Kept for a month,
 * so a popular café is asked about once, whoever opens it.
 */
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!isPlaceId(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const locale = request.nextUrl.searchParams.get("locale") === "es" ? "es" : "en";
  if (!(await rateLimit(`dates-place:${clientIp(request.headers)}`, { limit: 60, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const details = await lookupPlaceDetails(id, locale);
  if (!details) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  return NextResponse.json({ details }, { headers: { "cache-control": `public, s-maxage=${MONTH}, stale-while-revalidate=${MONTH * 3}` } });
}
