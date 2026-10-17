"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { PACK_CARDS, type PackCards } from "./pack-cards";
import { isPackId, rowsUnlockPack } from "./packs";

export type OpenedPack = { ok: true; cards: PackCards } | { ok: false; reason: "signin" | "locked" | "unavailable" };

/**
 * A pack's cards, for somebody who owns it. The shelf decides what looks locked from
 * /api/entitlements; this is the check that counts, read from the unlock rows themselves (a pass
 * grants "pack:*" and the pass cron takes it away again), so the cards never ship to a phone that
 * has not paid for them. On two phones only the host calls this: the guest gets the dealt cards
 * in the game's state.
 */
export async function openPack(id: unknown): Promise<OpenedPack> {
  if (!isPackId(id)) return { ok: false, reason: "locked" };
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { ok: false, reason: "unavailable" };
  const user = await getCurrentUser();
  if (!user) return { ok: false, reason: "signin" };
  const { data, error } = await supabase
    .from("template_unlocks")
    .select("template_slug")
    .eq("user_id", user.id)
    .in("template_slug", [`pack:${id}`, "pack:*"]);
  if (error) {
    console.error("[packs] unlock lookup failed", error.message);
    return { ok: false, reason: "unavailable" };
  }
  if (!rowsUnlockPack((data ?? []).map((row) => row.template_slug), id)) return { ok: false, reason: "locked" };
  return { ok: true, cards: PACK_CARDS[id] };
}
