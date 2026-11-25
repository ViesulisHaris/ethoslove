import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { readVoteChanges, TARGET, type VoteChange } from "@/lib/dates/votes";
import { applyVotes, readLiked } from "@/lib/dates/votes-server";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * How long one address may move one counter of one target once each way (dates2-C5). A browser that
 * votes yes, then changes to no, moves each counter once; a script from one address can add at most
 * one yes (or take away one) per place in this time, however often it asks.
 */
const MOVE_WINDOW_SECONDS = 30 * 24 * 60 * 60;

/**
 * The changes this address may still make: each one moves its counters, and a counter may move up
 * once and down once per address per target per window. A change with a move already spent is dropped
 * whole. The limiter keeps only the address and the target, for the window, as it does for every route.
 */
async function allowedChanges(ip: string, changes: readonly VoteChange[]): Promise<VoteChange[]> {
  const kept: VoteChange[] = [];
  for (const change of changes) {
    const moves = (["yes", "no"] as const).filter((counter) => change[counter] !== 0).map((counter) => `dates-vote-move:${ip}:${change.target}:${counter}:${change[counter] > 0 ? "up" : "down"}`);
    const allowed = await Promise.all(moves.map((key) => rateLimit(key, { limit: 1, windowSeconds: MOVE_WINDOW_SECONDS })));
    if (allowed.every(Boolean)) kept.push(change);
  }
  return kept;
}

/** How many targets one read may ask about: a screen of places. */
const MAX_READ = 60;
const NOTHING = { available: false, liked: {} };

/**
 * "Was this a good date?" (BRIEF-dates2.md 3). GET ?t=place:node/1,idea:… answers whether votes are
 * taken here at all and, for the targets asked, the yes counts from five up. POST { changes } adds one
 * tap. No account: nothing about the person is written to the database. The limiter's keys are the
 * address for a minute or an hour, as every route's are, and the address with the target for a month,
 * so one address moves each counter of a place at most once up and once down (allowedChanges). Without the database or migration 0026 both answer
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
  // Answered the same whether or not a change was kept: a script learns nothing from the reply.
  const kept = await allowedChanges(ip, changes);
  if (kept.length === 0) return NextResponse.json({ ok: true });
  const written = await applyVotes(db, kept);
  if (!written.ok) {
    if (written.missing) return NextResponse.json({ available: false });
    console.error("[date-votes] write failed", written.error?.code, written.error?.message);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
