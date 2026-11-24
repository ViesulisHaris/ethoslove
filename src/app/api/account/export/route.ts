import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import type { Db } from "@/lib/commerce/db";
import { groupGiftsEnabled } from "@/lib/group/flag";

export const runtime = "nodejs";
export const maxDuration = 10;

/** GDPR data export: everything we hold about the signed-in user, as JSON. */
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  // Row-level security limits each of these to this person's rows: passes they own or joined, gift
  // cards they bought, their own reminders. Saved dates are asked for by owner: RLS would also hand
  // over a partner's, which are theirs to export, not this person's.
  const [profile, gifts, purchases, unlocks, reviews, passes, giftCards, reminders, savedDates, monthsaries, monthlyIdeas] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("gifts").select("*").eq("user_id", user.id),
    supabase.from("purchases").select("*").eq("user_id", user.id),
    supabase.from("template_unlocks").select("*").eq("user_id", user.id),
    supabase.from("place_reviews").select("*").eq("user_id", user.id),
    supabase.from("couple_passes").select("*"),
    supabase.from("gift_cards").select("*").eq("buyer_user_id", user.id),
    supabase.from("reminders").select("*").eq("user_id", user.id),
    supabase.from("saved_dates").select("*").eq("owner_user_id", user.id),
    supabase.from("monthsaries").select("*").eq("user_id", user.id),
    supabase.from("monthly_ideas").select("*").eq("user_id", user.id),
  ]);
  // The waitlist is only readable by the server (no row policies), so it is asked with the service key, by this person's email only.
  const admin = getSupabaseAdminClient();
  const waitlist = admin && user.email ? await admin.from("waitlist").select("*").eq("email", user.email.toLowerCase()) : { data: [] };
  const giftIds = (gifts.data ?? []).map((g) => g.id);
  const [views, reactions] = giftIds.length
    ? await Promise.all([supabase.from("gift_views").select("*").in("gift_id", giftIds), supabase.from("reactions").select("*").in("gift_id", giftIds)])
    : [{ data: [] }, { data: [] }];
  // Group cards (src/lib/group), while they are switched on: the groups this person started, and
  // what was added to them. Both tables are the server's alone, so they are asked for with the
  // service key, by this person's own account and groups. A note's name, words and dates are the
  // sender's to see already; a contributor's email address is someone else's data and is never
  // exported, nor is anything that could open a link.
  const group = admin && groupGiftsEnabled() ? await exportedGroups(admin as Db, user.id) : null;
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), user: { id: user.id, email: user.email }, profile: profile.data, gifts: gifts.data, purchases: purchases.data, templateUnlocks: unlocks.data, giftViews: views.data, reactions: reactions.data, placeReviews: reviews.data, couplePasses: passes.data, giftCards: giftCards.data, reminders: reminders.data, monthlyReminders: monthsaries.data, monthlyIdea: monthlyIdeas.data, savedDates: savedDates.data, waitlist: waitlist.data, ...(group ?? {}) }, null, 2);
  return new NextResponse(body, { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="ethos-export-${new Date().toISOString().slice(0, 10)}.json"` } });
}

const GROUP_COLUMNS = ["id", "gift_id", "template_slug", "locale", "from_name", "for_name", "prompt", "max_entries", "note_max", "takes_photos", "created_at", "closes_at", "closed_at", "sent_at"] as const;
const CONTRIBUTION_COLUMNS = ["id", "group_id", "status", "name", "note", "created_at", "decided_at", "scrubbed_at"] as const;

/** Only the named columns, whatever the row came back with: what is exported is decided here, not by the query. */
const only = <K extends string>(row: Record<string, unknown>, columns: readonly K[]) => Object.fromEntries(columns.map((column) => [column, row[column] ?? null])) as Record<K, unknown>;

/** Empty lists before migration 0023, or when either read fails: an export never fails over a group. */
async function exportedGroups(admin: Db, userId: string): Promise<{ giftGroups: unknown[]; groupContributions: unknown[] }> {
  const { data: groups } = await admin.from("gift_groups").select(GROUP_COLUMNS.join(", ")).eq("user_id", userId);
  const rows = (groups ?? []) as unknown as Record<string, unknown>[];
  const ids = rows.map((row) => String(row.id));
  const { data: contributions } = ids.length ? await admin.from("gift_contributions").select(CONTRIBUTION_COLUMNS.join(", ")).in("group_id", ids) : { data: [] };
  return { giftGroups: rows.map((row) => only(row, GROUP_COLUMNS)), groupContributions: ((contributions ?? []) as unknown as Record<string, unknown>[]).map((row) => only(row, CONTRIBUTION_COLUMNS)) };
}
