import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isLatLng, snapSearch } from "@/lib/dates/geo";
import { findSights } from "@/lib/dates/sources";

export const runtime = "nodejs";
export const maxDuration = 15;

const WEEK = 60 * 60 * 24 * 7;

/**
 * Freely licensed photographs of what is near a search, from Wikipedia, each with its author and
 * licence. English first in an English page and Spanish in a Spanish one, and the other language
 * as well when the first knows little about the neighbourhood.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const radius = Number(params.get("radius") ?? 1500);
  if (!params.get("lat") || !params.get("lng") || !isLatLng(lat, lng) || !Number.isFinite(radius)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const locale = params.get("locale") === "es" ? "es" : "en";
  if (!(await rateLimit(`dates-photos:${clientIp(request.headers)}`, { limit: 40, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const { center, radiusM } = snapSearch({ lat, lng }, radius);
  const sights = await findSights(center, radiusM, locale);
  return NextResponse.json({ center, sights }, { headers: { "cache-control": `public, s-maxage=${WEEK}, stale-while-revalidate=${WEEK * 4}` } });
}
