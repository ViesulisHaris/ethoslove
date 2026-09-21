import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isLatLng, snapSearch } from "@/lib/dates/geo";
import { geosearchUrl, imageInfoUrl, isDateWorthy, parseGeosearch, parseImageInfo, type Sight } from "@/lib/dates/photos";

export const runtime = "nodejs";
export const maxDuration = 15;

const WEEK = 60 * 60 * 24 * 7;
const USER_AGENT = "Ethos/1.0 (+https://tryethos.io)";
/** A little wider than the places search: a landmark just over the line is still in the photograph. */
const EXTRA_M = 400;

async function ask(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { next: { revalidate: WEEK }, headers: { "user-agent": USER_AGENT, accept: "application/json" }, signal: AbortSignal.timeout(6000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

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
  const langs: ("en" | "es")[] = locale === "es" ? ["es", "en"] : ["en", "es"];
  const sights: Sight[] = [];
  const seen = new Set<string>();
  for (const lang of langs) {
    const found = parseGeosearch(await ask(geosearchUrl(lang, center, radiusM + EXTRA_M))).filter(isDateWorthy);
    const files = found.flatMap((s) => (s.file ? [s.file] : []));
    const credits = files.length > 0 ? parseImageInfo(await ask(imageInfoUrl(lang, files))) : new Map();
    for (const sight of found) {
      // The same building has an article in both languages, with the same picture.
      const key = sight.file ?? `${sight.lat.toFixed(4)},${sight.lng.toFixed(4)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const credit = sight.file ? credits.get(sight.file.replace(/_/g, " ")) : undefined;
      sights.push({ ...sight, photo: { ...sight.photo, ...credit } });
    }
    if (sights.length >= 12) break;
  }
  return NextResponse.json({ center, sights }, { headers: { "cache-control": `public, s-maxage=${WEEK}, stale-while-revalidate=${WEEK * 4}` } });
}
