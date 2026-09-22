import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { cleanBody, firstName, reviewInput, type PublicReview } from "@/lib/dates/reviews";

export const runtime = "nodejs";
export const maxDuration = 10;

const ID = /^(node|way|relation)\/\d{1,15}$/;
const FALLBACK = { en: "Somebody", es: "Alguien" };

/** The reviews of one place, newest first, with a first name on each and "mine" on the reader's own. */
export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("place") ?? "";
  if (!ID.test(placeId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const locale = request.nextUrl.searchParams.get("locale") === "es" ? "es" : "en";
  const db = getSupabaseAdminClient();
  if (!db) return NextResponse.json({ reviews: [] });
  const user = await getCurrentUser();
  const { data, error } = await db.from("place_reviews").select("id, user_id, stars, cost, went_as, body, created_at").eq("place_id", placeId).order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  const authors = [...new Set((data ?? []).map((r) => r.user_id))];
  const { data: profiles } = authors.length ? await db.from("profiles").select("id, name").in("id", authors) : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.name]));
  const reviews: PublicReview[] = (data ?? []).map((r) => ({ id: r.id, stars: r.stars, cost: r.cost, wentAs: r.went_as, body: r.body, name: firstName(names.get(r.user_id), FALLBACK[locale]), createdAt: r.created_at, mine: user?.id === r.user_id }));
  return NextResponse.json({ reviews }, { headers: { "cache-control": "private, no-store" } });
}

/** Write, or rewrite, the signed-in person's review of a place. One per person per place. */
export async function POST(request: NextRequest) {
  if (!(await rateLimit(`dates-review:${clientIp(request.headers)}`, { limit: 20, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const parsed = reviewInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const r = parsed.data;
  // Through the user's own client, so the row-level rules are what decide, not this code.
  const { error } = await supabase.from("place_reviews").upsert(
    { place_id: r.placeId, user_id: user.id, stars: r.stars, cost: r.cost ?? null, went_as: r.wentAs ?? null, body: cleanBody(r.body), place_name: r.placeName, lat: r.lat, lng: r.lng, locale: r.locale ?? null, updated_at: new Date().toISOString() },
    { onConflict: "place_id,user_id" },
  );
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true });
}

/** Take the signed-in person's review of a place down. */
export async function DELETE(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("place") ?? "";
  if (!ID.test(placeId)) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const { error } = await supabase.from("place_reviews").delete().eq("place_id", placeId).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  return NextResponse.json({ ok: true });
}
