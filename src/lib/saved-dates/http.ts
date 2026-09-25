import "server-only";

import { NextResponse } from "next/server";
import { CoupleUnavailable } from "./couple";
import { SavedStoreError } from "./server";
import { QUIET_HEADER, type SavedDatesUnavailable } from "./types";

/**
 * How /api/saved-dates answers, shared by its routes: never cached (every answer is one person's),
 * and an outage said as such rather than read as "nothing saved" or "free".
 */
const PRIVATE = { "cache-control": "private, no-store" };

/**
 * Per user (docs/MEMBERSHIP.md 3.2): the list 120 a minute (every signed-in view of /plan and of a
 * trip reads it), saving 30 an hour, reading one 120 a minute (the plan re-reads it on focus), editing
 * 600 an hour (autosave, a second apart at most), deleting 120 an hour.
 */
export const LIMITS = {
  list: { key: "read", limit: 120, windowSeconds: 60 },
  save: { key: "save", limit: 30, windowSeconds: 3600 },
  read: { key: "read", limit: 120, windowSeconds: 60 },
  edit: { key: "edit", limit: 600, windowSeconds: 3600 },
  delete: { key: "delete", limit: 120, windowSeconds: 3600 },
} as const;

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: PRIVATE });

/** Saving is unavailable: 503 for the app and any other client, a quiet 200 for the website's own requests (QUIET_HEADER). */
export function notAvailable(request: Request) {
  if (request.headers.get(QUIET_HEADER) === "1") return json({ unavailable: true } satisfies SavedDatesUnavailable);
  return json({ error: "not_configured" }, 503);
}

/** A database that can't answer: logged here, loudly, and answered as unavailable. Anything else is a bug and is thrown. */
export function unavailable(request: Request, what: string, error: unknown) {
  if (!(error instanceof SavedStoreError || error instanceof CoupleUnavailable)) throw error;
  console.error(`[saved-dates] ${what}: ${error.message}`);
  return notAvailable(request);
}
