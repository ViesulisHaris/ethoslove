import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { placeRatings } from "@/lib/dates/sources";

export const runtime = "nodejs";
export const maxDuration = 10;

/** Stars, review count and typical cost for every place one search can show, in one go: what the cards need. */
export async function POST(request: NextRequest) {
  if (!(await rateLimit(`dates-ratings:${clientIp(request.headers)}`, { limit: 60, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  let ids: unknown;
  try {
    ids = ((await request.json()) as { ids?: unknown }).ids;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (!Array.isArray(ids)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const result = await placeRatings(ids);
  if (!result) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  // Nothing to ask (or no database): an empty answer, with nothing to cache.
  if (!result.queried) return NextResponse.json({ ratings: result.ratings });
  return NextResponse.json({ ratings: result.ratings }, { headers: { "cache-control": "private, max-age=60" } });
}
