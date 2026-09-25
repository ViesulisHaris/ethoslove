import type { NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { json, LIMITS, notAvailable, unavailable } from "@/lib/saved-dates/http";
import { deleteSavedDate, readSavedDate, savedDatesSession, updateSavedDate } from "@/lib/saved-dates/server";
import { readPatchInput } from "@/lib/saved-dates/validate";

export const runtime = "nodejs";
export const maxDuration = 10;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One saved date, as the signed-in user may see it. An id that isn't one, a row that doesn't
 * exist and a row that is somebody else's all answer the same 404, so nothing can be learnt by
 * guessing ids.
 */
async function open(request: NextRequest, ctx: RouteContext<"/api/saved-dates/[id]">, limit: (typeof LIMITS)[keyof typeof LIMITS]) {
  const { id } = await ctx.params;
  const session = await savedDatesSession();
  if (!("deps" in session)) return { response: session.status === 503 ? notAvailable(request) : json({ error: session.error }, session.status) };
  if (!(await rateLimit(`saved-dates:${limit.key}:${session.deps.viewerId}`, limit))) return { response: json({ error: "rate_limited" }, 429) };
  if (!UUID.test(id)) return { response: json({ error: "not_found" }, 404) };
  return { id: id.toLowerCase(), deps: session.deps };
}

export async function GET(request: NextRequest, ctx: RouteContext<"/api/saved-dates/[id]">) {
  const opened = await open(request, ctx, LIMITS.read);
  if ("response" in opened) return opened.response;
  try {
    const answer = await readSavedDate(opened.deps, opened.id);
    return json(answer.body, answer.status);
  } catch (error) {
    return unavailable(request, "read", error);
  }
}

/** `{ baseVersion?, data?, title?, remind? }`: see readPatchInput. */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/saved-dates/[id]">) {
  const opened = await open(request, ctx, LIMITS.edit);
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
    return unavailable(request, "edit", error);
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/saved-dates/[id]">) {
  const opened = await open(request, ctx, LIMITS.delete);
  if ("response" in opened) return opened.response;
  try {
    const answer = await deleteSavedDate(opened.deps, opened.id);
    return json(answer.body, answer.status);
  } catch (error) {
    return unavailable(request, "delete", error);
  }
}
