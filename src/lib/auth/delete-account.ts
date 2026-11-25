import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { Db } from "@/lib/commerce/db";
import { deleteGiftStorage } from "@/lib/gift/storage-cleanup";
import { groupGiftsEnabled } from "@/lib/group/flag";
import { forgetGroupPhotos } from "@/lib/group/store";
import { missingTable } from "@/lib/lifecycle/date-letter-store";
import { getStripe } from "@/lib/stripe/server";
import { cancelSubscriptionNow } from "@/lib/stripe/subscriptions";

type Admin = SupabaseClient<Database>;

const PAGE = 1000;

async function cancelWithStripe(subscriptionId: string): Promise<void> {
  const stripe = getStripe();
  if (!stripe) throw new Error("stripe_not_configured");
  await cancelSubscriptionNow(stripe, subscriptionId);
}

/**
 * Deletes an account and everything under it. First every Ethos for Two subscription it pays for is
 * cancelled at once (the time left isn't refunded): an account must never be gone while its card
 * keeps being charged, so if Stripe can't be reached nothing is deleted. The Stripe customer stays
 * (invoices, disputes). App Store subscriptions can only be cancelled in iOS: the page says so first.
 * Then every gift's files in storage (rows cascade, files don't), the photos waiting at its group
 * cards' links while those are switched on, then the auth user, whose rows cascade from there, and the date letter's row at the same address. Purchases outlive it without a user, as the accounts need (migration 0011).
 * Shared by the account page's server action and the iPhone app's POST /api/app/account/delete; the
 * caller has already decided who `userId` is. The storage step stops the deletion if it fails, so
 * nobody is left with files and no account.
 */
export async function deleteAccountData(
  admin: Admin,
  userId: string,
  removeStorage: (giftId: string) => Promise<{ errors: string[] }> = deleteGiftStorage,
  cancelSubscription: (subscriptionId: string) => Promise<void> = cancelWithStripe,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // "*": before migration 0014 there is no provider column, and no subscription either.
  const { data: memberships, error: unread } = await admin.from("couple_passes").select("*").eq("owner_user_id", userId);
  if (unread) return { ok: false, error: unread.message };
  for (const row of memberships ?? []) {
    if (row.provider !== "stripe_subscription" || !row.stripe_subscription_id || row.status === "ended") continue;
    try {
      await cancelSubscription(row.stripe_subscription_id);
    } catch (e) {
      console.error("[account] subscription not cancelled: account kept", userId, (e as Error).message);
      return { ok: false, error: "subscription_cancel_failed" };
    }
  }

  const giftIds: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from("gifts")
      .select("id")
      .eq("user_id", userId)
      .range(from, from + PAGE - 1);
    if (error) return { ok: false, error: error.message };
    giftIds.push(...(data ?? []).map((g) => g.id));
    if ((data?.length ?? 0) < PAGE) break;
  }

  const errors: string[] = [];
  for (const giftId of giftIds) {
    const cleanup = await removeStorage(giftId);
    errors.push(...cleanup.errors);
  }
  if (errors.length) return { ok: false, error: "storage_cleanup_failed" };

  // Photos people added at this account's group cards and that were still waiting: their rows go
  // with the account, the files are removed here (and by the daily job, should this miss any).
  // Only while group cards are on; it can't fail, so it never keeps an account that asked to go.
  if (groupGiftsEnabled()) await forgetGroupPhotos({ userId }, admin as Db);

  // The address, read before the user (and its profile) is gone, for the date letter's row below.
  let address: string | null = null;
  try {
    const { data: profile } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
    address = profile?.email?.trim().toLowerCase() || null;
  } catch {
    address = null;
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };
  // The date letter's row at the same address (0027): it names no account, so it doesn't cascade.
  // It can never fail the deletion; before 0027 there is nothing to delete.
  if (address) {
    try {
      const { error: letterError } = await admin.from("date_letter").delete().eq("email", address);
      if (letterError && !missingTable(letterError)) console.error("[delete-account] date letter row not deleted", letterError.message);
    } catch (e) {
      console.error("[delete-account] date letter row not deleted", (e as Error).message);
    }
  }
  return { ok: true };
}
