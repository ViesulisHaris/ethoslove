import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isLatLng, round } from "@/lib/dates/geo";
import { parseOpenMeteo, weatherUrl } from "@/lib/dates/weather";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * Sixteen days of weather and sunsets for wherever the map is, from Open-Meteo (no key). Rounded
 * to about a kilometre: the forecast does not change across a street, and the cache is shared.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  if (!params.get("lat") || !params.get("lng") || !isLatLng(lat, lng)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!(await rateLimit(`dates-weather:${clientIp(request.headers)}`, { limit: 60, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  try {
    const res = await fetch(weatherUrl(round(lat, 2), round(lng, 2)), { next: { revalidate: 60 * 60 }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) return NextResponse.json({ error: "unavailable" }, { status: 502 });
    const forecast = parseOpenMeteo(await res.json());
    if (!forecast) return NextResponse.json({ error: "unavailable" }, { status: 502 });
    return NextResponse.json(forecast, { headers: { "cache-control": "public, s-maxage=3600, stale-while-revalidate=21600" } });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 504 });
  }
}
