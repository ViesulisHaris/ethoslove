import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { optedOut } from "@/lib/email/optouts";
import { emailKey } from "./links";

/**
 * The date letter's list (migration 0027, table date_letter): asking from the box, confirming from
 * the inbox, stopping from any letter, and the tidying the job does. One row per address; the server
 * alone reads and writes it. Every read that fails throws: a failed read is never taken for "no row",
 * so nothing is deleted, stopped or confirmed because the database was briefly away.
 */

type Admin = SupabaseClient<Database>;
type L = "en" | "es";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** At most one confirming e-mail a day to an address. */
export const CONFIRM_RESEND_HOURS = 24;
/** An address never confirmed is deleted this long after it asked. */
export const LETTER_PENDING_DAYS = 30;
/** A stopped address is deleted this long after the stop. */
export const LETTER_STOPPED_DAYS = 30;

const localeOf = (v: string | null | undefined): L => (v === "es" ? "es" : "en");
const iso = (ms: number) => new Date(ms).toISOString();

/** What PostgREST answers for a table the database doesn't have (0027 not applied). */
export const missingTable = (error: { code?: string } | null | undefined): boolean => error?.code === "42P01" || error?.code === "PGRST205";

let probe: { there: boolean; until: number } | null = null;

/** Whether 0027 has been applied. Remembered for ten minutes when it has, one minute when it has not. */
export async function letterTableThere(admin: Admin): Promise<boolean> {
  const now = Date.now();
  if (probe && probe.until > now) return probe.there;
  const { error } = await admin.from("date_letter").select("id", { count: "exact", head: true });
  if (!error) {
    probe = { there: true, until: now + 10 * 60_000 };
    return true;
  }
  if (missingTable(error)) probe = { there: false, until: now + 60_000 };
  // Any other error: not there for this request, and asked again on the next.
  return false;
}

/** For tests. */
export function forgetLetterProbe(): void {
  probe = null;
}

export type LetterState = "none" | "pending" | "on" | "stopped";

/** The state of an address's row. Throws when the read fails: a failed read is never "none". */
export async function letterStateOf(admin: Admin, email: string): Promise<LetterState> {
  const { data, error } = await admin.from("date_letter").select("confirmed_at, stopped_at").eq("email", email.trim().toLowerCase()).maybeSingle();
  if (error) throw new Error(`date letter state: ${error.message}`);
  if (!data) return "none";
  if (data.stopped_at) return "stopped";
  return data.confirmed_at ? "on" : "pending";
}

/**
 * Someone pressed the box. Writes or refreshes the address's row and says whether to send the
 * confirming e-mail now: never to an address on the unsubscribe list, never to one already on the
 * list, at most once a day. `verified` (signed in, and this is the account's own address): the press
 * is the yes, and no e-mail goes. The route answers the same whatever this says, so the box tells
 * nobody what an address has done.
 */
export async function askLetter(
  admin: Admin,
  input: { email: string; locale: L; path: string; wording: string; verified: boolean; now: number },
): Promise<{ send: false; state: "asked" | "on" } | { send: true; id: string }> {
  const email = input.email.trim().toLowerCase();
  if (await optedOut(admin, await emailKey(email))) return { send: false, state: "asked" };
  const { data: row, error } = await admin.from("date_letter").select("id, confirm_sent_at, confirmed_at, stopped_at").eq("email", email).maybeSingle();
  if (error) throw new Error(`date letter ask: ${error.message}`);
  if (row?.confirmed_at && !row.stopped_at) return { send: false, state: "on" };
  const now = iso(input.now);
  const asked = { email, locale: input.locale, wording: input.wording, source_path: input.path, asked_at: now };
  if (input.verified) {
    const { error: write } = await admin.from("date_letter").upsert({ ...asked, confirmed_at: now, stopped_at: null }, { onConflict: "email" });
    if (write) throw new Error(`date letter ask: ${write.message}`);
    return { send: false, state: "on" };
  }
  if (row?.confirm_sent_at && Date.parse(row.confirm_sent_at) >= input.now - CONFIRM_RESEND_HOURS * HOUR) return { send: false, state: "asked" };
  // An existing row keeps its confirmed_at and stopped_at: a stop stands until the new e-mail's button is pressed.
  const { data, error: write } = await admin.from("date_letter").upsert({ ...asked, confirm_sent_at: now }, { onConflict: "email" }).select("id").single();
  if (write || !data) throw new Error(`date letter ask: ${write?.message ?? "not written"}`);
  return { send: true, id: data.id };
}

/** The confirming e-mail didn't go after all: the day's allowance isn't spent, so asking again can send it. */
export async function confirmNotSent(admin: Admin, id: string): Promise<void> {
  await admin.from("date_letter").update({ confirm_sent_at: null }).eq("id", id);
}

/**
 * "Yes, send me the date letter", pressed on the page behind the confirming e-mail's link. An old
 * e-mail's link never undoes a stop: a stopped row confirms again only when a confirming e-mail went
 * after the stop.
 */
export async function confirmLetter(admin: Admin, id: string, now: number): Promise<{ result: "confirmed" | "already" | "gone"; locale: L }> {
  const { data: row, error } = await admin.from("date_letter").select("id, locale, confirmed_at, stopped_at, confirm_sent_at").eq("id", id).maybeSingle();
  if (error) throw new Error(`date letter confirm: ${error.message}`);
  if (!row) return { result: "gone", locale: "en" };
  const locale = localeOf(row.locale);
  if (row.stopped_at && (!row.confirm_sent_at || Date.parse(row.confirm_sent_at) <= Date.parse(row.stopped_at))) return { result: "gone", locale };
  if (row.confirmed_at && !row.stopped_at) return { result: "already", locale };
  const { error: write } = await admin.from("date_letter").update({ confirmed_at: iso(now), stopped_at: null }).eq("id", id);
  if (write) throw new Error(`date letter confirm: ${write.message}`);
  return { result: "confirmed", locale };
}

/**
 * "Stop these emails" (or the mail app's one tap). A confirmed address is stopped at once and kept
 * thirty days; one never confirmed ("Not you?" in the confirming e-mail) is deleted now and its hash
 * goes on the unsubscribe list, so the box can't write to it again.
 */
export async function stopLetter(admin: Admin, id: string, now: number): Promise<{ result: "stopped" | "not_me" | "gone"; locale: L }> {
  const { data: row, error } = await admin.from("date_letter").select("id, email, locale, confirmed_at, stopped_at").eq("id", id).maybeSingle();
  if (error) throw new Error(`date letter stop: ${error.message}`);
  if (!row) return { result: "gone", locale: "en" };
  const locale = localeOf(row.locale);
  if (!row.confirmed_at) {
    const { error: listed } = await admin.from("email_optouts").upsert({ email_sha256: await emailKey(row.email) }, { onConflict: "email_sha256", ignoreDuplicates: true });
    if (listed) throw new Error(`date letter not me: ${listed.message}`);
    const { error: gone } = await admin.from("date_letter").delete().eq("id", id);
    if (gone) throw new Error(`date letter not me: ${gone.message}`);
    return { result: "not_me", locale };
  }
  const { error: write } = await admin.from("date_letter").update({ stopped_at: iso(now) }).eq("id", id).is("stopped_at", null);
  if (write) throw new Error(`date letter stop: ${write.message}`);
  return { result: "stopped", locale };
}

/** Deletes addresses never confirmed within thirty days, and addresses stopped thirty days ago. The rows gone. */
export async function purgeLetter(admin: Admin, now: number): Promise<number> {
  const [pending, stopped] = await Promise.all([
    admin.from("date_letter").delete().is("confirmed_at", null).lt("asked_at", iso(now - LETTER_PENDING_DAYS * DAY)).select("id"),
    admin.from("date_letter").delete().lt("stopped_at", iso(now - LETTER_STOPPED_DAYS * DAY)).select("id"),
  ]);
  if (pending.error) throw new Error(`date letter purge: ${pending.error.message}`);
  if (stopped.error) throw new Error(`date letter purge: ${stopped.error.message}`);
  return (pending.data ?? []).length + (stopped.data ?? []).length;
}
