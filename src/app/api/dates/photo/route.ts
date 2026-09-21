import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { isLatLng, round } from "@/lib/dates/geo";
import { commonsFileUrl, commonsSearchUrl, isQid, parseCommonsFile, parseWikidataImage, pickCommonsPhoto, wikidataImageUrl, type PlacePhoto } from "@/lib/dates/photos";

export const runtime = "nodejs";
export const maxDuration = 15;

const MONTH = 60 * 60 * 24 * 30;
const USER_AGENT = "Ethos/1.0 (+https://tryethos.io)";

async function ask(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { next: { revalidate: MONTH }, headers: { "user-agent": USER_AGENT, accept: "application/json" }, signal: AbortSignal.timeout(6000) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

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
  if (name.length < 3 || !params.get("lat") || !params.get("lng") || !isLatLng(lat, lng) || (qid !== "" && !isQid(qid))) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  if (!(await rateLimit(`dates-photo:${clientIp(request.headers)}`, { limit: 120, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  let photo: PlacePhoto | null = null;
  if (qid) {
    const file = parseWikidataImage(await ask(wikidataImageUrl(qid)));
    if (file) photo = parseCommonsFile(await ask(commonsFileUrl(file)));
  }
  if (!photo) photo = pickCommonsPhoto(await ask(commonsSearchUrl(name, { lat: round(lat, 4), lng: round(lng, 4) })), name);
  return NextResponse.json({ photo }, { headers: { "cache-control": `public, s-maxage=${MONTH}, stale-while-revalidate=${MONTH * 3}` } });
}
