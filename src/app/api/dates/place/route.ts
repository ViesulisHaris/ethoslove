import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isPlaceId, nominatimIdOf, parseNominatim, parseOverpassOne } from "@/lib/dates/details";
import { askOverpass } from "@/lib/dates/overpass-fetch";
import { buildIdQuery } from "@/lib/dates/overpass";

export const runtime = "nodejs";
export const maxDuration = 20;

const MONTH = 60 * 60 * 24 * 30;
const USER_AGENT = "Ethos/1.0 (+https://tryethos.io)";

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

  const headers = { "cache-control": `public, s-maxage=${MONTH}, stale-while-revalidate=${MONTH * 3}` };
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/lookup?osm_ids=${nominatimIdOf(id)}&format=jsonv2&extratags=1&addressdetails=1&accept-language=${locale}`, {
      next: { revalidate: MONTH },
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const details = parseNominatim(await res.json(), id);
      if (details) return NextResponse.json({ details }, { headers });
    }
  } catch {
    // Fall through to Overpass.
  }
  const query = buildIdQuery(id);
  const json = query ? await askOverpass(query, { deadlineMs: 9000, hedgeMs: 3000, revalidate: MONTH }) : null;
  const details = json ? parseOverpassOne(json, id) : null;
  if (!details) return NextResponse.json({ error: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  return NextResponse.json({ details }, { headers });
}
