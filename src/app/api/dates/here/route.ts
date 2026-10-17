import { NextResponse, type NextRequest } from "next/server";
import { isLatLng, round } from "@/lib/dates/geo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Roughly where this visitor is, so the map can open on their city rather than on a blank world.
 * It only repeats what the host already worked out from the connection (city-level, rounded to
 * about a kilometre); nothing is stored or logged. Off Vercel there are no such headers, and the
 * page asks instead.
 */
export function GET(request: NextRequest) {
  const lat = Number(request.headers.get("x-vercel-ip-latitude"));
  const lng = Number(request.headers.get("x-vercel-ip-longitude"));
  const rawCity = request.headers.get("x-vercel-ip-city");
  if (!request.headers.get("x-vercel-ip-latitude") || !isLatLng(lat, lng) || (lat === 0 && lng === 0)) return NextResponse.json({ place: null }, { headers: { "cache-control": "private, no-store" } });
  let city = "";
  try {
    city = rawCity ? decodeURIComponent(rawCity).slice(0, 80) : "";
  } catch {
    city = "";
  }
  return NextResponse.json({ place: { lat: round(lat, 2), lng: round(lng, 2), name: city } }, { headers: { "cache-control": "private, no-store" } });
}
