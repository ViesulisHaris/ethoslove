import "server-only";

import { NextResponse, after } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/get-user";
import type { Db } from "@/lib/commerce/db";
import { linkSecret } from "@/lib/lifecycle/links";
import { rateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { groupGiftsEnabled } from "./flag";
import { GroupUnavailableError } from "./store";

/** Nothing a group route answers is ever cached: it is one person's, or one link's, at this moment. */
export const NO_STORE = { "cache-control": "no-store" };

export const answer = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

/** While the switch is off, every group route is simply not there. */
export const switchedOff = () => !groupGiftsEnabled();
export const notThere = () => answer({ error: "not_found" }, 404);
export const unavailable = () => answer({ error: "unavailable" }, 503);

/**
 * Work that must not hold up an answer (emails): run once the answer has gone, or at once where
 * there is no request to wait for. Someone who is kept waiting on a slow mail service, or told
 * "that didn't go through" when it times out, sends the same thing again.
 */
export function later(task: () => Promise<unknown>) {
  try {
    after(task);
  } catch {
    void task();
  }
}

/** A route's own failure: "unavailable" when the tables are missing (0023 not applied), else a plain 500, logged. */
export function failed(error: unknown): NextResponse {
  if (error instanceof GroupUnavailableError) return unavailable();
  console.error(`[group] ${(error as Error)?.message ?? error}`);
  return answer({ error: "failed" }, 500);
}

export type Organiser = { ok: true; admin: Db; user: User; secret: string } | { ok: false; response: NextResponse };

/**
 * Who a sender's route is talking to: the switch on, a signed-in account, the service role and the
 * link secret to hand, and no more than 120 requests in ten minutes from that account (the panel
 * asks every 20 seconds while it is open). Each route then checks the group is that account's own.
 */
export async function organiser(): Promise<Organiser> {
  if (switchedOff()) return { ok: false, response: notThere() };
  const user = await getCurrentUser();
  if (!user) return { ok: false, response: answer({ error: "unauthenticated" }, 401) };
  const admin = getSupabaseAdminClient();
  const secret = linkSecret();
  if (!admin || !secret) return { ok: false, response: unavailable() };
  if (!(await rateLimit(`group-org:${user.id}`, { limit: 120, windowSeconds: 600 }))) return { ok: false, response: answer({ error: "rate_limited" }, 429) };
  return { ok: true, admin: admin as Db, user, secret };
}

/** A JSON body of at most `max` bytes, or null. */
export async function jsonBody(request: Request, max = 4096): Promise<unknown> {
  const raw = await request.text().catch(() => "");
  if (raw.length > max) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
