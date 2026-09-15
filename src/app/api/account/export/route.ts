import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";

export const runtime = "nodejs";
export const maxDuration = 10;

/** GDPR data export: everything we hold about the signed-in user, as JSON. */
export async function GET() {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const [profile, gifts, purchases, unlocks] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("gifts").select("*").eq("user_id", user.id),
    supabase.from("purchases").select("*").eq("user_id", user.id),
    supabase.from("template_unlocks").select("*").eq("user_id", user.id),
  ]);
  const giftIds = (gifts.data ?? []).map((g) => g.id);
  const [views, reactions] = giftIds.length
    ? await Promise.all([supabase.from("gift_views").select("*").in("gift_id", giftIds), supabase.from("reactions").select("*").in("gift_id", giftIds)])
    : [{ data: [] }, { data: [] }];
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), user: { id: user.id, email: user.email }, profile: profile.data, gifts: gifts.data, purchases: purchases.data, templateUnlocks: unlocks.data, giftViews: views.data, reactions: reactions.data }, null, 2);
  return new NextResponse(body, { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="ethos-export-${new Date().toISOString().slice(0, 10)}.json"` } });
}
