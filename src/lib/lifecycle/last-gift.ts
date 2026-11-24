import "server-only";

import type { Db } from "@/lib/commerce/db";

/**
 * The gift a reminder's "Open my gift" starts from: the account's newest gift that is live or
 * scheduled for someone of the reminder's name. Names are typed by hand at different times ("Mia",
 * " mia"), so they are compared trimmed and lower-case; when nothing matches, the new gift starts with
 * the name alone. Only the id and how many photos it has leave here: nothing of the gift goes into an
 * e-mail, and the photos themselves are read in the owner's own browser (lib/editor/start-from-gift.ts).
 */

/** How many of the account's newest gifts are looked through: far more than anyone makes for one name. */
const LOOK_BACK = 100;

export const sameName = (a: string, b: string): boolean => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

export type LastGift = { id: string; photos: number };

/** Pure: the newest of `gifts` (newest first) whose recipient is `name`. */
export function pickLastGift(gifts: { id: string; data: unknown }[], name: string): LastGift | null {
  if (!name.trim()) return null;
  for (const gift of gifts) {
    const data = (gift.data ?? {}) as { recipientName?: unknown; photos?: unknown };
    if (typeof data.recipientName !== "string" || !sameName(data.recipientName, name)) continue;
    const photos = Array.isArray(data.photos) ? data.photos.filter((p) => p && typeof (p as { url?: unknown }).url === "string").length : 0;
    return { id: gift.id, photos };
  }
  return null;
}

export async function lastGiftFor(admin: Db, userId: string, recipientName: string): Promise<LastGift | null> {
  if (!recipientName.trim()) return null;
  const { data, error } = await admin
    .from("gifts")
    .select("id, data, updated_at")
    .eq("user_id", userId)
    .in("status", ["live", "scheduled"])
    .order("updated_at", { ascending: false })
    .limit(LOOK_BACK);
  if (error) {
    console.error("[reminders] last gift not read", error.message);
    return null;
  }
  return pickLastGift(data ?? [], recipientName);
}
