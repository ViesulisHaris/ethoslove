import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { formatYmd, isValidSince, parseYmd, type MonthsaryView } from "@/lib/lifecycle/monthsaries";
import { monthsaryInput } from "@/lib/lifecycle/reminder-input";

export const runtime = "nodejs";
export const maxDuration = 10;

const COLUMNS = "id, partner_name, since, locale";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRIVATE = { "cache-control": "private, no-store" };

const toView = (r: { id: string; partner_name: string; since: string; locale: "en" | "es" }): MonthsaryView => ({ id: r.id, partnerName: r.partner_name, since: r.since, locale: r.locale });

/**
 * Monthly anniversaries (lib/lifecycle/monthsaries.ts). The signed-in person reads their own through
 * their session (row-level security); every write is the server's, with the service role, after the
 * values are checked, because the claims in the same row are the morning job's.
 */
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { data, error } = await supabase.from("monthsaries").select(COLUMNS).limit(1);
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ monthsaries: (data ?? []).map(toView) }, { headers: PRIVATE });
}

/**
 * Turn them on: { partnerName, since: "YYYY-MM-DD", locale }. One per account, so saving again
 * replaces the one there (a new date starts its months afresh). Idempotent for the same name and day.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const admin = getSupabaseAdminClient();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if (!(await rateLimit(`monthsaries:${user.id}`, { limit: 10, windowSeconds: 600 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const parsed = monthsaryInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const since = parseYmd(parsed.data.since);
  if (!isValidSince(since, new Date())) return NextResponse.json({ error: "bad_date" }, { status: 400 });

  const { data: existing, error: readError } = await admin.from("monthsaries").select("id, partner_name, since, locale").eq("user_id", user.id).maybeSingle();
  if (readError) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const sinceYmd = formatYmd(since);
  if (existing && existing.partner_name === parsed.data.partnerName && existing.since === sinceYmd) {
    if (existing.locale !== parsed.data.locale) await admin.from("monthsaries").update({ locale: parsed.data.locale }).eq("id", existing.id);
    return NextResponse.json({ monthsary: toView({ ...existing, locale: parsed.data.locale }), created: false }, { headers: PRIVATE });
  }
  // A new name or day: what was asked, answered or sent for the old one doesn't carry over.
  const { data, error } = await admin
    .from("monthsaries")
    .upsert(
      { user_id: user.id, partner_name: parsed.data.partnerName, since: sinceYmd, locale: parsed.data.locale, checkin_for: null, confirmed_for: null, reminded_for: null },
      { onConflict: "user_id" },
    )
    .select(COLUMNS)
    .single();
  if (error || !data) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ monthsary: toView(data), created: !existing }, { status: existing ? 200 : 201, headers: PRIVATE });
}

/** Turn them off: `?id=`, the signed-in person's own. */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!UUID.test(id)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const user = await getCurrentUser();
  const admin = getSupabaseAdminClient();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!admin) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const { data, error } = await admin.from("monthsaries").delete().eq("id", id).eq("user_id", user.id).select("id");
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  // Not theirs, or gone already: nothing was stopped, and the answer says so.
  if (!data?.length) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
