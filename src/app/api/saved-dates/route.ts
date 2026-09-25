import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { json, LIMITS, notAvailable, unavailable } from "@/lib/saved-dates/http";
import { createSavedDate, listSavedDates, savedDatesSession } from "@/lib/saved-dates/server";
import { readSaveInput } from "@/lib/saved-dates/validate";

export const runtime = "nodejs";
export const maxDuration = 10;

/** The signed-in user's saved dates and trips, and their partner's while they share: `?kind=date|trip`. */
export async function GET(request: NextRequest) {
  const session = await savedDatesSession();
  if (!("deps" in session)) return session.status === 503 ? notAvailable(request) : json({ error: session.error }, session.status);
  if (!(await rateLimit(`saved-dates:${LIMITS.list.key}:${session.deps.viewerId}`, LIMITS.list))) return json({ error: "rate_limited" }, 429);
  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== null && kind !== "date" && kind !== "trip") return json({ error: "invalid_input" }, 400);
  try {
    return json(await listSavedDates(session.deps, kind ?? undefined));
  } catch (error) {
    return unavailable(request, "list", error);
  }
}

/** Save a date (`{ kind: "date", data: Plan, title? }`) or a trip (`{ kind: "trip", data: { v: 1, tripId }, title? }`). */
export async function POST(request: NextRequest) {
  const session = await savedDatesSession();
  if (!("deps" in session)) return session.status === 503 ? notAvailable(request) : json({ error: session.error }, session.status);
  if (!(await rateLimit(`saved-dates:${LIMITS.save.key}:${session.deps.viewerId}`, LIMITS.save))) return json({ error: "rate_limited" }, 429);
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
    return unavailable(request, "save", error);
  }
}
