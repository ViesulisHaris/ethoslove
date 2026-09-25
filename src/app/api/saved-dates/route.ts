import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { CoupleUnavailable } from "@/lib/saved-dates/couple";
import { createSavedDate, listSavedDates, SavedStoreError, savedDatesSession } from "@/lib/saved-dates/server";
import { readSaveInput } from "@/lib/saved-dates/validate";

export const runtime = "nodejs";
export const maxDuration = 10;

const PRIVATE = { "cache-control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE });

/** A database that can't answer is said as such, and logged: never read as "nothing saved" or "free". */
function unavailable(what: string, error: unknown) {
  if (!(error instanceof SavedStoreError || error instanceof CoupleUnavailable)) throw error;
  console.error(`[saved-dates] ${what}: ${error.message}`);
  return json({ error: "not_configured" }, 503);
}

/** The signed-in user's saved dates and trips, and their partner's while they share: `?kind=date|trip`. */
export async function GET(request: NextRequest) {
  const session = await savedDatesSession();
  if (!("deps" in session)) return json({ error: session.error }, session.status);
  if (!(await rateLimit(`saved-dates:read:${session.deps.viewerId}`, { limit: 120, windowSeconds: 60 }))) return json({ error: "rate_limited" }, 429);
  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== null && kind !== "date" && kind !== "trip") return json({ error: "invalid_input" }, 400);
  try {
    return json(await listSavedDates(session.deps, kind ?? undefined));
  } catch (error) {
    return unavailable("list", error);
  }
}

/** Save a date (`{ kind: "date", data: Plan, title? }`) or a trip (`{ kind: "trip", data: { v: 1, tripId }, title? }`). */
export async function POST(request: NextRequest) {
  const session = await savedDatesSession();
  if (!("deps" in session)) return json({ error: session.error }, session.status);
  if (!(await rateLimit(`saved-dates:save:${session.deps.viewerId}`, { limit: 30, windowSeconds: 3600 }))) return json({ error: "rate_limited" }, 429);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_input" }, 400);
  }
  const input = readSaveInput(body);
  if (!input.ok) return json({ error: input.error }, 400);
  try {
    const answer = await createSavedDate(session.deps, input.value);
    return json(answer.body, answer.status);
  } catch (error) {
    return unavailable("save", error);
  }
}
