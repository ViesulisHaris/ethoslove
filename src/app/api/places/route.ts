import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { parsePhoton } from "@/lib/places/photon";

export const runtime = "nodejs";
export const maxDuration = 5;

/**
 * Towns and cities for the place pickers in the editor, searched in OpenStreetMap through
 * Photon (komoot's public geocoder, no key). The editor saves the chosen coordinates into the
 * gift, so recipients never wait on this; if Photon is slow or down, the pickers still offer the
 * built-in cities and the sender can type the distance themselves.
 */
export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (query.length < 2) return NextResponse.json({ results: [] });
  if (!(await rateLimit(`places:${clientIp(request.headers)}`, { limit: 60, windowSeconds: 60 })))
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  // Photon speaks English names on request; otherwise it answers with each place's local name.
  const lang = request.nextUrl.searchParams.get("lang") === "en" ? "&lang=en" : "";
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=15&osm_tag=place${lang}`, {
      next: { revalidate: 60 * 60 * 24 * 7 },
      headers: { "user-agent": "Ethos/1.0 (+https://tryethos.io)" },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return NextResponse.json({ results: [] }, { status: 502 });
    return NextResponse.json({ results: parsePhoton(await res.json()) }, { headers: { "cache-control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
  } catch {
    return NextResponse.json({ results: [] }, { status: 504 });
  }
}
