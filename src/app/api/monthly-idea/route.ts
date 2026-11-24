import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * The monthly idea's switch for a signed-in account (lib/lifecycle/monthly-idea.ts): "Don't send
 * these" on the share screen and the row on /account/reminders. GET says whether it is on; POST
 * { on } turns it off (off_at = now) or back on. Only a row that exists can be switched: turning it
 * on never enrols anyone, that is sending a gift's job.
 */
const input = z.object({ on: z.boolean() });
const noStore = { "cache-control": "private, no-store" };
type State = "none" | "on" | "off";

export async function GET() {
  const user = await getCurrentUser();
  const admin = getSupabaseAdminClient();
  if (!user || !admin) return NextResponse.json({ state: "none" satisfies State }, { headers: noStore });
  const { data } = await admin.from("monthly_ideas").select("off_at").eq("user_id", user.id).maybeSingle();
  const state: State = !data ? "none" : data.off_at ? "off" : "on";
  return NextResponse.json({ state }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if (!(await rateLimit(`monthly-idea:${user.id}`, { limit: 20, windowSeconds: 600 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const { data: row, error } = await admin.from("monthly_ideas").select("user_id").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { error: saveError } = await admin
    .from("monthly_ideas")
    .update({ off_at: parsed.data.on ? null : new Date().toISOString() })
    .eq("user_id", user.id);
  if (saveError) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ state: (parsed.data.on ? "on" : "off") satisfies State }, { headers: noStore });
}
