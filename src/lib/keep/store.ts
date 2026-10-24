import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import { emailKey } from "@/lib/lifecycle/links";
import { optedOut } from "@/lib/email/optouts";
import { CONFIRMS_PER_ADDRESS_PER_DAY, CONFIRMS_PER_GIFT_PER_DAY, CONFIRM_RESEND_HOURS, PENDING_DAYS, cleanRequests, keepConsent, senderFirstName, type KeepReminderRequest } from "./keep";

type Admin = SupabaseClient<Database>;
const HOUR = 3_600_000;

export type KeepGift = { id: string; shortId: string; locale: "en" | "es"; senderName: string };

/**
 * A published gift by its link's id: the only thing a keep can be for. The sender's name is what a
 * keeper's reminders are about; it is read from the gift, never taken from the page.
 */
export async function keepableGift(admin: Admin, shortId: string): Promise<KeepGift | null> {
  const { data } = await admin.from("gifts").select("id, short_id, locale, data").eq("short_id", shortId).in("status", ["live", "scheduled"]).maybeSingle();
  if (!data) return null;
  const sender = data.data && typeof data.data === "object" && !Array.isArray(data.data) ? (data.data as Record<string, unknown>).senderName : null;
  return { id: data.id, shortId: data.short_id, locale: data.locale === "es" ? "es" : "en", senderName: typeof sender === "string" ? sender.replace(/\s+/g, " ").trim() : "" };
}

/**
 * Someone asked, on the keep page, for `email` to get this gift's link (and the reminders in
 * `requests`). Writes or updates the pending keep and says whether to send the confirmation now:
 * never to an address on the unsubscribe list, at most once a day for a gift and address, at most
 * CONFIRMS_PER_ADDRESS_PER_DAY a day to an address in all, and at most CONFIRMS_PER_GIFT_PER_DAY a
 * day from one gift's page, so the form can't be turned on a stranger, or on a list of them. The
 * answer the page gets is the same whatever happens, so it tells nobody what an address has done.
 */
export async function requestKeep(
  admin: Admin,
  input: { gift: KeepGift; email: string; locale: "en" | "es"; requests: unknown; now: number },
): Promise<{ send: false; reason: "opted_out" | "recently_sent" | "address_limit" | "gift_limit" } | { send: true; keepId: string }> {
  const email = input.email.trim().toLowerCase();
  const key = await emailKey(email);
  if (await optedOut(admin, key)) return { send: false, reason: "opted_out" };
  const since = new Date(input.now - CONFIRM_RESEND_HOURS * HOUR).toISOString();
  const [{ data: existing }, { count: toAddress }, { count: fromGift }] = await Promise.all([
    admin.from("gift_keeps").select("id, confirm_sent_at").eq("gift_id", input.gift.id).eq("email_sha256", key).maybeSingle(),
    admin.from("gift_keeps").select("id", { count: "exact", head: true }).eq("email_sha256", key).gte("confirm_sent_at", since),
    admin.from("gift_keeps").select("id", { count: "exact", head: true }).eq("gift_id", input.gift.id).gte("confirm_sent_at", since),
  ]);
  const requests: KeepReminderRequest[] = cleanRequests(input.requests);
  const recently = Boolean(existing?.confirm_sent_at && new Date(existing.confirm_sent_at).getTime() >= input.now - CONFIRM_RESEND_HOURS * HOUR);
  const addressFull = !recently && (toAddress ?? 0) >= CONFIRMS_PER_ADDRESS_PER_DAY;
  const giftFull = !recently && !addressFull && (fromGift ?? 0) >= CONFIRMS_PER_GIFT_PER_DAY;
  const send = !recently && !addressFull && !giftFull;
  // Over a limit, an address we hold nothing for stays that way: nothing is written for it.
  if (!send && !existing) return { send: false, reason: addressFull ? "address_limit" : "gift_limit" };
  const row = {
    gift_id: input.gift.id,
    email,
    email_sha256: key,
    locale: input.locale,
    consent: keepConsent(input.locale),
    requested: requests as unknown as Json,
    ...(send ? { confirm_sent_at: new Date(input.now).toISOString() } : {}),
  };
  const { data, error } = await admin.from("gift_keeps").upsert(row, { onConflict: "gift_id,email_sha256" }).select("id").single();
  if (error || !data) throw new Error(`keep: ${error?.message ?? "not written"}`);
  if (!send) return { send: false, reason: recently ? "recently_sent" : addressFull ? "address_limit" : "gift_limit" };
  return { send: true, keepId: data.id };
}

/** The confirmation didn't go after all: the day's allowance isn't spent, so asking again can send it. */
export async function confirmNotSent(admin: Admin, keepId: string): Promise<void> {
  await admin.from("gift_keeps").update({ confirm_sent_at: null }).eq("id", keepId).is("confirmed_at", null);
}

/** `sender`: the first name the gift is signed with ("" when the signature has none), for the emails after the yes. */
export type ConfirmedKeep = { email: string; locale: "en" | "es"; shortId: string; sender: string; reminders: KeepReminderRequest[]; first: boolean };

/**
 * The link in the confirmation was followed (and its button pressed): the keep is confirmed, the
 * reminders asked for become real, and the caller sends the gift's link. Confirming again sends
 * nothing new unless new reminders were asked for in between. Null when the keep is gone (never
 * confirmed in time, unsubscribed, or its gift deleted).
 */
export async function confirmKeep(admin: Admin, keepId: string, now: number): Promise<ConfirmedKeep | null> {
  const { data: keep } = await admin.from("gift_keeps").select("id, email, locale, requested, confirmed_at, gift_id").eq("id", keepId).maybeSingle();
  if (!keep) return null;
  const { data: gift } = await admin.from("gifts").select("short_id, data").eq("id", keep.gift_id).in("status", ["live", "scheduled"]).maybeSingle();
  if (!gift) return null;
  const senderName = gift.data && typeof gift.data === "object" && !Array.isArray(gift.data) ? (gift.data as Record<string, unknown>).senderName : null;
  const requests = cleanRequests(keep.requested);
  if (requests.length > 0) {
    const { error } = await admin
      .from("keep_reminders")
      .upsert(
        requests.map((r) => ({ keep_id: keep.id, name: r.name, occasion: r.occasion, month: r.month, day: r.day })),
        { onConflict: "keep_id,occasion,month,day", ignoreDuplicates: true },
      );
    if (error) throw new Error(`keep reminders: ${error.message}`);
  }
  const first = !keep.confirmed_at;
  await admin.from("gift_keeps").update({ confirmed_at: keep.confirmed_at ?? new Date(now).toISOString(), requested: [] }).eq("id", keep.id);
  const { data: all } = await admin.from("keep_reminders").select("name, occasion, month, day").eq("keep_id", keep.id);
  return {
    email: keep.email,
    locale: keep.locale === "es" ? "es" : "en",
    shortId: gift.short_id,
    sender: senderFirstName(typeof senderName === "string" ? senderName : ""),
    reminders: cleanRequests(all ?? []),
    first: first || requests.length > 0,
  };
}

/** "Unsubscribe": the keep goes, with its address and every reminder. Already gone is fine. */
export async function stopKeep(admin: Admin, keepId: string): Promise<"en" | "es" | null> {
  const { data } = await admin.from("gift_keeps").delete().eq("id", keepId).select("locale").maybeSingle();
  return data ? (data.locale === "es" ? "es" : "en") : null;
}

/** Keeps never confirmed within PENDING_DAYS are deleted: a stranger's address isn't kept. */
export async function purgeUnconfirmedKeeps(admin: Admin, now: number): Promise<number> {
  const before = new Date(now - PENDING_DAYS * 24 * HOUR).toISOString();
  const { data, error } = await admin.from("gift_keeps").delete().is("confirmed_at", null).lt("created_at", before).select("id");
  if (error) throw new Error(`keep purge: ${error.message}`);
  return (data ?? []).length;
}
