import type { Db } from "@/lib/commerce/db";

/**
 * When a gift was first opened: its earliest row in gift_views, as a time in ms, or null when it
 * never was or nothing could be read. record_gift_view writes one row per viewer per day (the same
 * viewer again within 24 hours reuses their row and leaves its opened_at alone), so the earliest
 * row is still the first open.
 */
export async function firstOpenOf(db: Db, giftId: string): Promise<number | null> {
  const { data, error } = await db
    .from("gift_views")
    .select("opened_at")
    .eq("gift_id", giftId)
    .order("opened_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data?.opened_at) return null;
  const at = Date.parse(data.opened_at);
  return Number.isFinite(at) ? at : null;
}
