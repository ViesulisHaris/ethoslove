import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { rateLimit, swapMark } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { readVoteChanges, TARGET, type Delta, type VoteChange } from "@/lib/dates/votes";
import { applyVotes, readLiked } from "@/lib/dates/votes-server";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * How long the limiter remembers an address's answer on one target (dates2-C5, D1). Within it a
 * second tap from that address changes its answer, it never adds one.
 */
const ANSWER_WINDOW_SECONDS = 30 * 24 * 60 * 60;

type Answer = "yes" | "no" | null;
/** What a change asks the counters to end on for this browser: the side it adds to, or none. */
const answerAfter = (change: VoteChange): Answer => (change.yes === 1 ? "yes" : change.no === 1 ? "no" : null);
const ones = (answer: Answer) => ({ yes: answer === "yes" ? 1 : 0, no: answer === "no" ? 1 : 0 });

/** The limiter's key for one address on one target: a hash, so the store never holds an address beside an answer in the clear. */
const answerKey = (ip: string, target: string): string => `dates-vote:${createHash("sha256").update(`${ip}|${target}`).digest("base64url").slice(0, 32)}`;

/**
 * The counter moves this address's taps really make (dates2-D1). The limiter remembers the last
 * answer this address gave on each target, and a change is read only for the answer it ends on: the
 * move is from the remembered answer to the new one. So Yes, No, Yes leaves one yes; an address that
 * never said yes cannot take one away; and one address holds at most one answer per target, however
 * often it asks. With them, `undo` puts the remembered answers back when the write then fails, so
 * the browser's retry is counted. Null when the limiter cannot be reached: then nothing is written.
 */
async function movesFor(ip: string, changes: readonly VoteChange[]): Promise<{ moves: VoteChange[]; undo: () => Promise<void> } | null> {
  const moves: VoteChange[] = [];
  const swapped: { key: string; before: Answer }[] = [];
  const undo = async () => {
    for (const { key, before } of swapped.reverse()) await swapMark(key, before, ANSWER_WINDOW_SECONDS);
  };
  for (const change of changes) {
    const key = answerKey(ip, change.target);
    const after = answerAfter(change);
    const got = await swapMark(key, after, ANSWER_WINDOW_SECONDS);
    if (got === undefined) {
      await undo();
      return null;
    }
    const before: Answer = got === "yes" || got === "no" ? got : null;
    swapped.push({ key, before });
    const was = ones(before);
    const now = ones(after);
    const yes = (now.yes - was.yes) as Delta;
    const no = (now.no - was.no) as Delta;
    if (yes !== 0 || no !== 0) moves.push({ target: change.target, yes, no });
  }
  return { moves, undo };
}

/** How many targets one read may ask about: a screen of places. */
const MAX_READ = 60;
const NOTHING = { available: false, liked: {} };

/**
 * "Was this a good date?" (BRIEF-dates2.md 3). GET ?t=place:node/1,idea:… answers whether votes are
 * taken here at all and, for the targets asked, the yes counts from five up. POST { changes } adds one
 * tap. No account: nothing about the person is written to the database. The limiter's keys are the
 * address for a minute or an hour, as every route's are, and a hash of the address with the target for
 * a month holding that address's last answer, so one address holds at most one answer per place
 * (movesFor). Without the database or migration 0026
 * both answer { available: false } and log nothing.
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
  const moved = await movesFor(ip, changes);
  // Without the limiter's memory a tap cannot be told from a repeat: nothing is written, and the browser puts its answer back.
  if (moved === null) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  // A repeat of this address's answer moves nothing, and is answered like any other tap.
  if (moved.moves.length === 0) return NextResponse.json({ ok: true });
  const written = await applyVotes(db, moved.moves);
  if (!written.ok) {
    await moved.undo();
    if (written.missing) return NextResponse.json({ available: false });
    console.error("[date-votes] write failed", written.error?.code, written.error?.message);
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
