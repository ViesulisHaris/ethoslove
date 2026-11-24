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

/** Pure: the newest of `gifts` (newest first, each with only its recipient's name and photos) whose recipient is `name`. */
export function pickLastGift(gifts: { id: string; name: unknown; photos: unknown }[], name: string): LastGift | null {
  if (!name.trim()) return null;
  for (const gift of gifts) {
    if (typeof gift.name !== "string" || !sameName(gift.name, name)) continue;
    const photos = Array.isArray(gift.photos) ? gift.photos.filter((p) => p && typeof (p as { url?: unknown }).url === "string").length : 0;
    return { id: gift.id, photos };
  }
  return null;
}

export async function lastGiftFor(admin: Db, userId: string, recipientName: string): Promise<LastGift | null> {
  if (!recipientName.trim()) return null;
  // Only the two fields it needs out of each gift's data: the morning job reads this for every e-mail.
  const { data, error } = await admin
    .from("gifts")
    .select("id, name:data->>recipientName, photos:data->photos")
    .eq("user_id", userId)
    .in("status", ["live", "scheduled"])
    .order("updated_at", { ascending: false })
    .limit(LOOK_BACK);
  if (error) {
    console.error("[reminders] last gift not read", error.message);
    return null;
  }
  return pickLastGift((data ?? []) as { id: string; name: unknown; photos: unknown }[], recipientName);
}
