import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { CoupleUnavailable } from "@/lib/saved-dates/couple";
import { deleteSavedDate, readSavedDate, SavedStoreError, savedDatesSession, updateSavedDate } from "@/lib/saved-dates/server";
import { readPatchInput } from "@/lib/saved-dates/validate";

export const runtime = "nodejs";
export const maxDuration = 10;

const PRIVATE = { "cache-control": "private, no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE });

function unavailable(what: string, error: unknown) {
  if (!(error instanceof SavedStoreError || error instanceof CoupleUnavailable)) throw error;
  console.error(`[saved-dates] ${what}: ${error.message}`);
  return json({ error: "not_configured" }, 503);
}

/**
 * One saved date, as the signed-in user may see it. An id that isn't one, a row that doesn't
 * exist and a row that is somebody else's all answer the same 404, so nothing can be learnt by
 * guessing ids. Limits per user: reading 120 a minute (the plan re-reads on focus), editing 600 an
 * hour (autosave, a second apart at most), deleting 120 an hour.
 */
async function open(ctx: RouteContext<"/api/saved-dates/[id]">, limit: { key: string; limit: number; windowSeconds: number }) {
  const { id } = await ctx.params;
  const session = await savedDatesSession();
  if (!("deps" in session)) return { response: json({ error: session.error }, session.status) };
  if (!(await rateLimit(`saved-dates:${limit.key}:${session.deps.viewerId}`, limit))) return { response: json({ error: "rate_limited" }, 429) };
  if (!UUID.test(id)) return { response: json({ error: "not_found" }, 404) };
  return { id: id.toLowerCase(), deps: session.deps };
}

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/saved-dates/[id]">) {
  const opened = await open(ctx, { key: "read", limit: 120, windowSeconds: 60 });
  if ("response" in opened) return opened.response;
  try {
    const answer = await readSavedDate(opened.deps, opened.id);
    return json(answer.body, answer.status);
  } catch (error) {
    return unavailable("read", error);
  }
}

/** `{ baseVersion?, data?, title?, remind? }`: see readPatchInput. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/saved-dates/[id]">) {
  const opened = await open(ctx, { key: "edit", limit: 600, windowSeconds: 3600 });
  if ("response" in opened) return opened.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_input" }, 400);
  }
  const patch = readPatchInput(body);
  if (!patch.ok) return json({ error: patch.error }, 400);
  try {
    const answer = await updateSavedDate(opened.deps, opened.id, patch.value);
    return json(answer.body, answer.status);
  } catch (error) {
    return unavailable("edit", error);
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/saved-dates/[id]">) {
  const opened = await open(ctx, { key: "delete", limit: 120, windowSeconds: 3600 });
  if ("response" in opened) return opened.response;
  try {
    const answer = await deleteSavedDate(opened.deps, opened.id);
    return json(answer.body, answer.status);
  } catch (error) {
    return unavailable("delete", error);
  }
}
