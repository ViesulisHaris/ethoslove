import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { MAX_RATED_PLACES, type Ratings } from "@/lib/dates/rank";

export const runtime = "nodejs";
export const maxDuration = 10;

const ID = /^(node|way|relation)\/\d{1,15}$/;

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
  const clean = [...new Set(ids.filter((id): id is string => typeof id === "string" && ID.test(id)))].slice(0, MAX_RATED_PLACES);
  const db = getSupabaseAdminClient();
  if (!db || clean.length === 0) return NextResponse.json({ ratings: {} });
  const { data, error } = await db.rpc("place_rating_summary", { ids: clean });
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const ratings: Ratings = {};
  for (const row of data ?? []) ratings[row.place_id] = { stars: Number(row.stars), reviews: row.reviews, cost: row.cost };
  return NextResponse.json({ ratings }, { headers: { "cache-control": "private, max-age=60" } });
}
