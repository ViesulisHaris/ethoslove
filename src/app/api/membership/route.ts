import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";
import { rateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/server";
import { stripeBilling } from "@/lib/stripe/subscriptions";
import { readMembership, runMembershipAction } from "@/lib/commerce/memberships";
import { sendMembershipEnded } from "@/lib/email/notify";
import type { MembershipAction, MembershipActionResponse } from "@/lib/membership/types";

export const runtime = "nodejs";
export const maxDuration = 20;

const NO_STORE = { "cache-control": "private, no-store" };

// An explicit allowlist: anything else is refused before it reaches the membership code.
const ACTIONS = ["cancel", "resume", "preview_yearly", "switch_to_yearly", "switch_to_monthly", "keep_plan", "leave", "remove_partner"] as const satisfies readonly MembershipAction[];
const input = z.object({ action: z.enum(ACTIONS), locale: z.enum(["en", "es"]).optional() });

/**
 * POST /api/membership { action } (docs/MEMBERSHIP.md 2.7): cancel or resume, switch between
 * monthly and yearly, leave a partner's membership or remove one's partner. Cookie or Bearer. Who
 * may do what, and what changes at Stripe, is lib/commerce/memberships.ts runMembershipAction; the
 * state Stripe answers with is applied before this answers, so the summary it returns is already
 * true. → { ok, membership } | { ok, preview } | { error, reason?, url? }
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return reply(401, { error: "unauthenticated" });
  if (!(await rateLimit(`membership:${user.id}`, { limit: 20, windowSeconds: 60 }))) return reply(429, { error: "rate_limited" });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply(400, { error: "invalid_input" });
  const db = getSupabaseAdminClient();
  if (!db) return reply(503, { error: "not_configured" });

  const { action } = parsed.data;
  const locale = parsed.data.locale ?? (request.nextUrl.searchParams.get("locale") === "es" ? "es" : "en");
  const stripe = getStripe();
  const now = Date.now();
  let result: Awaited<ReturnType<typeof runMembershipAction>>;
  try {
    result = await runMembershipAction(db, user.id, action, { now, billing: stripe ? stripeBilling(stripe) : null, sendEnded: sendMembershipEnded });
  } catch (e) {
    // runMembershipAction answers its own failures; anything it lets escape is still the contract's
    // `failed`, never Next's bare 500 page.
    console.error("[membership] action threw", action, user.id, (e as Error).message);
    return reply(500, { error: "failed" });
  }
  if (result.status !== 200 || action === "preview_yearly" || action === "leave") return reply(result.status, result.body);
  try {
    return reply(200, { ok: true, membership: await readMembership(db, user.id, { locale, now, names: db }) });
  } catch (e) {
    // Done, but the membership couldn't be read back: a database error, answered as the contract's
    // `failed` (the page reloads the truth), never as an HTML error page.
    console.error("[membership] read after the action failed", action, user.id, (e as Error).message);
    return reply(500, { error: "failed" });
  }
}

function reply(status: number, body: MembershipActionResponse) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}
