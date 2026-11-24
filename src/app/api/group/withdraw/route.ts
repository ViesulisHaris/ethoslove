import type { NextRequest } from "next/server";
import { z } from "zod";
import type { Db } from "@/lib/commerce/db";
import { answer, failed, jsonBody, notThere, switchedOff, unavailable } from "@/lib/group/http";
import { withdrawEntry } from "@/lib/group/store";
import { isGroupToken } from "@/lib/group/token";
import { linkSecret } from "@/lib/lifecycle/links";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 10;

const input = z.object({ token: z.string().refine(isGroupToken), withdraw: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/) });

/**
 * "Take my note back": { token, withdraw } → { ok }. `withdraw` is the secret the contribute route
 * handed the browser that wrote the note; only its SHA-256 is stored, so nobody else's note can be
 * named. The secret alone finds the note: `token` only says which page is asking, and a link the
 * sender has reset since still lets its writers take their notes back. Before the gift is sent the
 * note is withdrawn wherever it stood. 410 "sent" afterwards, and 404 for a note that is no longer
 * there (scrubbed, purged, or deleted with its card): for both the page gives the support address
 * instead of saying the note was taken back.
 */
export async function POST(request: NextRequest) {
  if (switchedOff()) return notThere();
  const admin = getSupabaseAdminClient() as Db | null;
  if (!admin || !linkSecret()) return unavailable();
  if (!(await rateLimit(`group-withdraw:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 3600 }))) return answer({ error: "rate_limited" }, 429);
  const parsed = input.safeParse(await jsonBody(request, 1024));
  if (!parsed.success) return answer({ error: "invalid" }, 400);
  try {
    const done = await withdrawEntry(admin, parsed.data.withdraw, Date.now());
    if (done === "sent") return answer({ error: "sent" }, 410);
    if (done === "not_found") return notThere();
    return answer({ ok: true });
  } catch (error) {
    return failed(error);
  }
}
