import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";

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
  const [profile, gifts, purchases, unlocks, reviews, passes, giftCards, reminders, savedDates, monthsaries] = await Promise.all([
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
  ]);
  // The waitlist is only readable by the server (no row policies), so it is asked with the service key, by this person's email only.
  const admin = getSupabaseAdminClient();
  const waitlist = admin && user.email ? await admin.from("waitlist").select("*").eq("email", user.email.toLowerCase()) : { data: [] };
  const giftIds = (gifts.data ?? []).map((g) => g.id);
  const [views, reactions] = giftIds.length
    ? await Promise.all([supabase.from("gift_views").select("*").in("gift_id", giftIds), supabase.from("reactions").select("*").in("gift_id", giftIds)])
    : [{ data: [] }, { data: [] }];
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), user: { id: user.id, email: user.email }, profile: profile.data, gifts: gifts.data, purchases: purchases.data, templateUnlocks: unlocks.data, giftViews: views.data, reactions: reactions.data, placeReviews: reviews.data, couplePasses: passes.data, giftCards: giftCards.data, reminders: reminders.data, monthlyReminders: monthsaries.data, savedDates: savedDates.data, waitlist: waitlist.data }, null, 2);
  return new NextResponse(body, { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="ethos-export-${new Date().toISOString().slice(0, 10)}.json"` } });
}
