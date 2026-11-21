import type { NextRequest } from "next/server";
import { z } from "zod";
import type { Db } from "@/lib/commerce/db";
import { answer, failed, jsonBody, notThere, switchedOff, unavailable } from "@/lib/group/http";
import { groupByToken, withdrawEntry } from "@/lib/group/store";
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
 * named. Before the gift is sent the note is withdrawn wherever it stood. 410 "sent" afterwards:
 * the page then gives the support address instead.
 */
export async function POST(request: NextRequest) {
  if (switchedOff()) return notThere();
  const admin = getSupabaseAdminClient() as Db | null;
  if (!admin || !linkSecret()) return unavailable();
  if (!(await rateLimit(`group-withdraw:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 3600 }))) return answer({ error: "rate_limited" }, 429);
  const parsed = input.safeParse(await jsonBody(request, 1024));
  if (!parsed.success) return answer({ error: "invalid" }, 400);
  try {
    const group = await groupByToken(admin, parsed.data.token);
    if (!group) return notThere();
    const done = await withdrawEntry(admin, group, parsed.data.withdraw, Date.now());
    if (done === "sent") return answer({ error: "sent" }, 410);
    if (done === "not_found") return notThere();
    return answer({ ok: true });
  } catch (error) {
    return failed(error);
  }
}
