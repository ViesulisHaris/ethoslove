import { EVERY_PACK, EVERY_TEMPLATE, PASS_DAYS } from "@/lib/pricing/products";
import type { Tables } from "@/lib/supabase/types";
import { generateInviteCode } from "./codes";
import { DAY_MS, chunks, iso, unique, type Db } from "./db";
import { revokeUnlocksOf } from "./unlocks";

/**
 * "Ethos for Two": a year paid once, for the buyer and a partner who joins with the invite link.
 * couple_passes is the membership table (lib/commerce/memberships.ts): a subscription is a row of it
 * too, whose end moves as it renews, and what grants access is the same `starts_at <= now < ends_at`,
 * so the grant, join, regrant and sweep below serve both.
 *
 * Each pass PURCHASE is one couple_passes row a year long. Renewing adds a row that starts where the
 * owner's running year (and any renewal already bought) ends, so years never overlap, fulfilment can
 * add a year only once (one row per purchase), and a refund takes back exactly the year it paid for.
 * While a row runs, its owner and partner hold "*" and "pack:*" unlock rows pointing at its purchase;
 * the daily cron takes them away when it ends and hands over to the next year if there is one.
 */
export type Pass = Tables<"couple_passes">;

export const PASS_UNLOCKS = [EVERY_TEMPLATE, EVERY_PACK];
export const PASS_MS = PASS_DAYS * DAY_MS;
/** The renewal email goes out this long before a pass ends. */
export const RENEWAL_NOTICE_MS = 14 * DAY_MS;
/** How far back the expiry sweep looks, so a cron that missed a few days still catches up. */
export const SWEEP_LOOKBACK_MS = 45 * DAY_MS;

// Ids travel in the request URL for an `in` filter: keep each list well under any URL limit.
const IN_CHUNK = 100;

const ms = (timestamp: string) => Date.parse(timestamp);

export function isRunning(pass: Pick<Pass, "starts_at" | "ends_at">, now: number): boolean {
  return ms(pass.starts_at) <= now && now < ms(pass.ends_at);
}

/** Whether a membership renews by itself: a subscription (Stripe's or Apple's) that is active and hasn't been cancelled. */
export function renews(pass: Pick<Pass, "provider" | "status" | "cancel_at_period_end">): boolean {
  return (pass.provider === "stripe_subscription" || pass.provider === "app_store") && pass.status === "active" && !pass.cancel_at_period_end;
}

/** Where a newly bought year starts: now, or where the owner's paid-up time runs out. */
export function nextStart(ownerPasses: Pick<Pass, "ends_at">[], now: number): number {
  return ownerPasses.reduce((start, pass) => Math.max(start, ms(pass.ends_at)), now);
}

/** When the owner's paid-up time runs out, counting renewals bought ahead: what the buyer sees. */
export function paidUntil(ownerPasses: Pick<Pass, "ends_at">[], now: number): number | null {
  const end = nextStart(ownerPasses, now);
  return end > now ? end : null;
}

async function ownerPasses(db: Db, ownerId: string): Promise<Pass[]> {
  const { data } = await db.from("couple_passes").select("*").eq("owner_user_id", ownerId).order("starts_at", { ascending: true });
  return data ?? [];
}

/** Every pass the user owns or joined. */
export async function passesOf(db: Db, userId: string): Promise<Pass[]> {
  const [owned, joined] = await Promise.all([
    db.from("couple_passes").select("*").eq("owner_user_id", userId),
    db.from("couple_passes").select("*").eq("partner_user_id", userId),
  ]);
  const all = [...(owned.data ?? []), ...(joined.data ?? [])];
  return all.filter((pass, i) => all.findIndex((other) => other.id === pass.id) === i);
}

/** While a year runs, its owner and partner hold every template and every pack through it. */
export async function grantPassUnlocks(db: Db, pass: Pass, now: number): Promise<{ error?: string }> {
  if (!isRunning(pass, now)) return {};
  const holders = [pass.owner_user_id, pass.partner_user_id].filter((id): id is string => Boolean(id));
  const rows = holders.flatMap((user_id) => PASS_UNLOCKS.map((template_slug) => ({ user_id, template_slug, purchase_id: pass.purchase_id })));
  // A holder who already owns Everything keeps that row, and with it Everything after the pass ends.
  const { error } = await db.from("template_unlocks").upsert(rows, { onConflict: "user_id,template_slug", ignoreDuplicates: true });
  return error ? { error: error.message } : {};
}

/**
 * Turns a paid pass purchase into a year: from now, or from the end of the owner's paid-up time when
 * they renew early. A renewal keeps the partner. Safe to run twice for the same purchase.
 *
 * `now` is when the year is reckoned from: the moment of purchase. `grantAt` (default `now`) is the
 * moment the unlock rows are handed over for, which differs only when a purchase is recorded after
 * the fact (an App Store purchase heard about later, lib/commerce/app-store.ts): a year that has
 * already run out then gets no rows, which nothing would ever sweep away again.
 */
export async function startPass(
  db: Db,
  args: { purchaseId: string; ownerId: string; now: number; grantAt?: number; provider?: "stripe_pass" | "app_store_pass" },
): Promise<{ pass: Pass; created: boolean; paidUntil: number } | { error: string }> {
  const { purchaseId, ownerId, now } = args;
  const grantAt = args.grantAt ?? now;
  const existing = await db.from("couple_passes").select("*").eq("purchase_id", purchaseId).maybeSingle();
  if (existing.data) {
    const granted = await grantPassUnlocks(db, existing.data, grantAt);
    if (granted.error) return { error: granted.error };
    return { pass: existing.data, created: false, paidUntil: paidUntil(await ownerPasses(db, ownerId), now) ?? now };
  }

  // A year follows the owner's other years; a subscription's end moves by itself, so it isn't one.
  const owned = (await ownerPasses(db, ownerId)).filter((pass) => pass.provider === "stripe_pass" || pass.provider === "app_store_pass");
  const ahead = owned.filter((pass) => ms(pass.ends_at) > now);
  const start = nextStart(ahead, now);
  const partner = ahead.map((pass) => pass.partner_user_id).find(Boolean) ?? null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await db
      .from("couple_passes")
      .upsert(
        { purchase_id: purchaseId, owner_user_id: ownerId, partner_user_id: partner, invite_code: generateInviteCode(), starts_at: iso(start), ends_at: iso(start + PASS_MS), provider: args.provider ?? "stripe_pass", plan: "yearly" },
        { onConflict: "purchase_id", ignoreDuplicates: true },
      )
      .select("*");
    // 23505 on the invite code (the purchase is the conflict target, so it can't be that): draw again.
    if (error?.code === "23505") continue;
    if (error) return { error: error.message };
    const created = data?.[0];
    const pass = created ?? (await db.from("couple_passes").select("*").eq("purchase_id", purchaseId).maybeSingle()).data;
    if (!pass) return { error: "pass_missing" };
    const granted = await grantPassUnlocks(db, pass, grantAt);
    if (granted.error) return { error: granted.error };
    return { pass, created: Boolean(created), paidUntil: start + PASS_MS };
  }
  return { error: "invite_code_collision" };
}

export type JoinResult =
  | { ok: true; pass: Pass; paidUntil: number; renews: boolean }
  | { ok: false; error: "not_found" | "expired" | "own_pass" | "has_own" | "taken" | "failed" };

/**
 * The partner joins with the owner's invite code: signed in, not the owner, while the membership runs
 * and the partner's place is empty. They join every year the owner has paid for from now on (a
 * subscription is one row, whose end moves as it renews). The write only fills an empty place, so of
 * two people joining at once exactly one gets in. Somebody who already has Ethos for Two, their own
 * or as another couple's partner, can't join a second one: one person, one partner to share with.
 */
export async function joinPass(db: Db, args: { code: string; userId: string; now: number }): Promise<JoinResult> {
  const { code, userId, now } = args;
  const { data: invited } = await db.from("couple_passes").select("*").eq("invite_code", code).maybeSingle();
  if (!invited) return { ok: false, error: "not_found" };
  if (invited.owner_user_id === userId) return { ok: false, error: "own_pass" };
  if (ms(invited.ends_at) <= now) return { ok: false, error: "expired" };

  const ahead = (await ownerPasses(db, invited.owner_user_id)).filter((pass) => ms(pass.ends_at) > now);
  const running = ahead.find((pass) => isRunning(pass, now));
  if (!running) return { ok: false, error: "expired" };
  const theirs = await passesOf(db, userId);
  if (theirs.some((pass) => pass.owner_user_id !== invited.owner_user_id && isRunning(pass, now))) return { ok: false, error: "has_own" };
  if (ahead.some((pass) => pass.partner_user_id && pass.partner_user_id !== userId)) return { ok: false, error: "taken" };

  const { error } = await db
    .from("couple_passes")
    .update({ partner_user_id: userId })
    .in("id", ahead.map((pass) => pass.id))
    .is("partner_user_id", null);
  if (error) return { ok: false, error: "failed" };
  const { data: after } = await db.from("couple_passes").select("*").eq("id", running.id).maybeSingle();
  if (!after || after.partner_user_id !== userId) return { ok: false, error: "taken" };

  const granted = await grantPassUnlocks(db, after, now);
  if (granted.error) return { ok: false, error: "failed" };
  return { ok: true, pass: after, paidUntil: paidUntil(ahead, now) ?? ms(after.ends_at), renews: renews(after) };
}

/** Hands every running year its unlock rows again, for users who just lost some (an ended year, a refund). */
export async function regrantRunningPasses(db: Db, userIds: string[], now: number): Promise<void> {
  for (const users of chunks(unique(userIds), IN_CHUNK)) {
    const [owned, joined] = await Promise.all([
      db.from("couple_passes").select("*").in("owner_user_id", users).lte("starts_at", iso(now)).gt("ends_at", iso(now)),
      db.from("couple_passes").select("*").in("partner_user_id", users).lte("starts_at", iso(now)).gt("ends_at", iso(now)),
    ]);
    for (const pass of [...(owned.data ?? []), ...(joined.data ?? [])]) await grantPassUnlocks(db, pass, now);
  }
}

/**
 * The cron's sweep: years that ended lose their unlock rows, and anyone who still has a year running
 * (a renewal, or a pass of their own) gets them back from it at once. Gifts sent while the pass ran
 * stay as they are.
 */
export async function sweepEndedPasses(db: Db, now: number): Promise<{ ended: number; users: number }> {
  // Newest first: past the limit, it's the years swept on earlier days that are left out, never
  // the ones that ended since the last run.
  const { data: ended } = await db
    .from("couple_passes")
    .select("purchase_id")
    .lte("ends_at", iso(now))
    .gte("ends_at", iso(now - SWEEP_LOOKBACK_MS))
    .order("ends_at", { ascending: false })
    .limit(1000);
  const affected: string[] = [];
  for (const ids of chunks(unique((ended ?? []).map((pass) => pass.purchase_id)), IN_CHUNK)) affected.push(...(await revokeUnlocksOf(db, ids)));
  await regrantRunningPasses(db, affected, now);
  return { ended: (ended ?? []).length, users: unique(affected).length };
}

/**
 * Years ending within the notice period whose owner hasn't already bought the next one, and hasn't
 * been reminded. Each is claimed (renewal_reminded_at) before the email goes, so two overlapping cron
 * runs can't both send it, and released again if sending fails so tomorrow's run tries again. A year
 * already renewed is marked too, with no email: left unmarked it would come back every day and take
 * a place in the batch from somebody who does need reminding.
 */
export async function remindRenewals(
  db: Db,
  now: number,
  send: (pass: Pass) => Promise<boolean>,
): Promise<{ due: number; sent: number }> {
  const { data: due } = await db
    .from("couple_passes")
    .select("*")
    // A subscription renews by itself: a yearly one gets its own reminder (lib/commerce/memberships.ts).
    .in("provider", ["stripe_pass", "app_store_pass"])
    .is("renewal_reminded_at", null)
    .gt("ends_at", iso(now))
    .lte("ends_at", iso(now + RENEWAL_NOTICE_MS))
    .limit(200);
  let sent = 0;
  for (const pass of due ?? []) {
    // A refunded year that never started is closed to zero length: nothing to renew there.
    if (ms(pass.ends_at) <= ms(pass.starts_at)) continue;
    const { data: next } = await db
      .from("couple_passes")
      .select("id")
      .eq("owner_user_id", pass.owner_user_id)
      .gte("starts_at", pass.ends_at)
      .gt("ends_at", pass.ends_at)
      .limit(1);
    if ((next ?? []).length > 0) {
      await db.from("couple_passes").update({ renewal_reminded_at: iso(now) }).eq("id", pass.id).is("renewal_reminded_at", null);
      continue;
    }
    const { data: claimed } = await db
      .from("couple_passes")
      .update({ renewal_reminded_at: iso(now) })
      .eq("id", pass.id)
      .is("renewal_reminded_at", null)
      .select("id");
    if ((claimed ?? []).length === 0) continue;
    if (await send(pass)) sent += 1;
    else await db.from("couple_passes").update({ renewal_reminded_at: null }).eq("id", pass.id);
  }
  return { due: (due ?? []).length, sent };
}

/**
 * A refunded or disputed pass purchase: its year ends now (or never starts), and any year bought
 * after it moves up to close the gap, so what is left of the owner's paid-up time runs without a hole.
 * The caller then revokes the purchase's unlock rows and re-grants from whatever year still runs.
 */
export async function shortenRefundedPass(db: Db, purchaseId: string, now: number): Promise<void> {
  const { data: pass } = await db.from("couple_passes").select("*").eq("purchase_id", purchaseId).maybeSingle();
  if (!pass) return;
  const start = ms(pass.starts_at);
  const end = ms(pass.ends_at);
  // A year already used up has nothing left to take back.
  if (end <= now) return;
  const cut = Math.max(start, now);
  const removed = end - cut;
  await db.from("couple_passes").update({ ends_at: iso(cut) }).eq("id", pass.id);
  // A renewal that never started: the year it would have followed isn't renewed after all, so its
  // renewal email (skipped because of this purchase) is due again.
  if (cut === start)
    await db.from("couple_passes").update({ renewal_reminded_at: null }).eq("owner_user_id", pass.owner_user_id).eq("ends_at", pass.starts_at);
  const later = (await ownerPasses(db, pass.owner_user_id)).filter((other) => other.id !== pass.id && ms(other.starts_at) >= end);
  for (const other of later)
    await db
      .from("couple_passes")
      .update({ starts_at: iso(ms(other.starts_at) - removed), ends_at: iso(ms(other.ends_at) - removed) })
      .eq("id", other.id);
}
