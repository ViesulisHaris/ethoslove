import type { Db } from "@/lib/commerce/db";

/**
 * When a gift was first opened: its earliest row in gift_views (one row per open, written by
 * record_gift_view), as a time in ms, or null when it never was or nothing could be read.
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
