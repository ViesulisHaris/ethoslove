import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { readVoteChanges, TARGET } from "@/lib/dates/votes";
import { applyVotes, readLiked } from "@/lib/dates/votes-server";

export const runtime = "nodejs";
export const maxDuration = 10;

/** How many targets one read may ask about: a screen of places. */
const MAX_READ = 60;
const NOTHING = { available: false, liked: {} };

/**
 * "Was this a good date?" (BRIEF-dates2.md 3). GET ?t=place:node/1,idea:… answers whether votes are
 * taken here at all and, for the targets asked, the yes counts from five up. POST { changes } adds one
 * tap. No account: nothing about the person is written, and the limiter's key is the address for a
 * minute or an hour, as every route's is. Without the database or migration 0026 both answer
 * { available: false } and log nothing.
 */
export async function GET(request: NextRequest) {
  if (!(await rateLimit(`dates-votes-read:${clientIp(request.headers)}`, { limit: 120, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const targets = (request.nextUrl.searchParams.get("t") ?? "").split(",").filter(Boolean);
  if (targets.length === 0 || targets.length > MAX_READ || targets.some((t) => !TARGET.test(t))) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const db = getSupabaseAdminClient();
  if (!db) return NextResponse.json(NOTHING, { headers: { "cache-control": "no-store" } });
  const read = await readLiked(db, [...new Set(targets)]);
  if (!read.ok) {
    if (read.missing) return NextResponse.json(NOTHING, { headers: { "cache-control": "no-store" } });
    console.error("[date-votes] read failed", read.error?.code, read.error?.message);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({ available: true, liked: read.liked }, { headers: { "cache-control": "public, max-age=60, s-maxage=300" } });
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  if (!(await rateLimit(`dates-votes:${ip}`, { limit: 20, windowSeconds: 60 })) || !(await rateLimit(`dates-votes-hour:${ip}`, { limit: 120, windowSeconds: 3600 }))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const changes = readVoteChanges(body);
  if (!changes) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const db = getSupabaseAdminClient();
  if (!db) return NextResponse.json({ available: false });
  const written = await applyVotes(db, changes);
  if (!written.ok) {
    if (written.missing) return NextResponse.json({ available: false });
    console.error("[date-votes] write failed", written.error?.code, written.error?.message);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
