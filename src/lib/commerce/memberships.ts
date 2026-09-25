import type { MembershipAction, MembershipActionResponse, MembershipPlan, MembershipProvider, MembershipStatus, MembershipSummary, NotAvailableReason } from "@/lib/membership/types";
import type { Currency } from "@/lib/pricing/products";
import type { Updates } from "@/lib/supabase/types";
import type { MembershipContext } from "./plan";
import { generateInviteCode } from "./codes";
import { DAY_MS, chunks, inviteUrl, iso, membershipRows, missingMembershipColumns, unique, type Db, type Locale } from "./db";
import { grantPassUnlocks, isRunning, paidUntil, regrantRunningPasses, renews, shortenRefundedPass, type Pass } from "./passes";
import { relockGifts, revokeUnlocksOf } from "./unlocks";

/**
 * Ethos for Two as a membership (docs/MEMBERSHIP.md): one couple_passes row, whichever way it was
 * paid for. A pass is a year paid once (lib/commerce/passes.ts); a subscription, Stripe's or the App
 * Store's, is one row for its whole life whose end moves as it renews. Access is what it always was,
 * `starts_at <= now < ends_at`, so the lent unlock rows, the invite, the partner, the cron's sweep and
 * the triggers all work the same for both.
 *
 * Everything here is pure over `Db` (the unit tests run it against the in-memory fake) and knows
 * nothing of Stripe: a subscription arrives as a SubscriptionSnapshot (lib/stripe/subscriptions.ts
 * reads one), and whatever has to change at Stripe goes through a BillingPort passed in.
 */

/** A renewing membership keeps running this long past its period end while the renewal is collected. */
export const MEMBERSHIP_GRACE_MS = 7 * DAY_MS;
/** The yearly renewal reminder goes out this long before the renewal. */
export const YEARLY_REMINDER_MS = 7 * DAY_MS;
/** A yearly → monthly switch is made this long before the year ends (the unused days are credited). */
export const PENDING_SWITCH_WINDOW_MS = 3 * DAY_MS;
/** How many rows each of the cron's steps takes on in one run. */
const CRON_BATCH = 100;

const ms = (timestamp: string) => Date.parse(timestamp);
const PASS_PROVIDERS: readonly MembershipProvider[] = ["stripe_pass", "app_store_pass"];
/** A year paid once (the pass, on the web or in the app), rather than a subscription. */
export const isPassProvider = (provider: MembershipProvider) => PASS_PROVIDERS.includes(provider);

/** A Stripe subscription, as the membership code needs it. Times are epoch milliseconds. */
export type SubscriptionSnapshot = {
  id: string;
  /** Stripe's status, as it is: every one of them is handled (subscriptionState). */
  status: string;
  customerId: string | null;
  /** From the item's price interval; null when it is neither a month nor a year. */
  plan: MembershipPlan | null;
  startDate: number;
  /**
   * The item's current period. Stripe starts the next period when it invoices it, paid or not, so
   * the end is what has been paid for only while the subscription is active; while a renewal is
   * past due, what was paid for ends where the period Stripe is still collecting for starts.
   */
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: number | null;
  endedAt: number | null;
  /** cancellation_details.reason: "cancellation_requested", "payment_failed", "payment_disputed". */
  cancellationReason: string | null;
  itemId: string | null;
  /** The item's Product, which a plan switch keeps. */
  productId: string | null;
  currency: string | null;
  /** What it renews at: its own inline price, which a later catalogue change never touches. */
  unitAmount: number | null;
  metadata: Record<string, string>;
};

/** What changes at Stripe goes through this (lib/stripe/subscriptions.ts stripeBilling), so this file stays Stripe-free. */
export type BillingPort = {
  retrieve(subscriptionId: string): Promise<SubscriptionSnapshot>;
  setCancelAtPeriodEnd(subscription: SubscriptionSnapshot, cancel: boolean): Promise<SubscriptionSnapshot>;
  /** Ends it now, refunding nothing; `voidOpenInvoices` also voids the renewal it was trying to collect. */
  cancelNow(subscriptionId: string, options?: { voidOpenInvoices?: boolean }): Promise<SubscriptionSnapshot>;
  previewSwitch(subscription: SubscriptionSnapshot, plan: MembershipPlan): Promise<{ amountDue: number; currency: string; periodEnd: number }>;
  /**
   * `confirmable: false` when nobody is there to confirm a payment the bank wants confirmed (the
   * cron): the switch is then dropped like a failed one rather than left waiting on an open invoice.
   */
  switchPlan(subscription: SubscriptionSnapshot, plan: MembershipPlan, options?: { confirmable?: boolean }): Promise<SwitchOutcome>;
};
export type SwitchOutcome = { outcome: "switched"; subscription: SubscriptionSnapshot } | { outcome: "payment_failed" } | { outcome: "requires_action"; url: string | null };

/** Sends the "Ethos for Two has ended" email to the row's owner; false when it didn't go. */
export type SendEnded = (row: Pass) => Promise<boolean>;

type State = Pick<Pass, "status" | "ends_at" | "plan" | "current_period_end" | "cancel_at_period_end">;

/**
 * The one mapping from a Stripe subscription to the row (docs/MEMBERSHIP.md 2.5). Every Stripe event
 * about a subscription ends here, with the subscription as retrieved now, so the order events arrive
 * in never matters. `current_period_end` is what has been paid for, and `ends_at` is when access ends
 * if nothing else happens:
 * - renewing: the period end plus a week's grace, so a renewal whose payment is late never cuts a
 *   couple off at midnight;
 * - past due (a renewal's card being retried): a week from the end of what was paid for. Stripe
 *   moves the period on as soon as it invoices the renewal, so its period end is then a month or a
 *   year nobody has paid for, and the week runs from where that period starts instead;
 * - cancelling: the period end (or an earlier cancel_at): what was paid for, and not a day more;
 * - incomplete: where it started, so it never runs before its first payment is through;
 * - over (canceled, unpaid after the last retry, incomplete_expired, paused): when it ended, never
 *   later than it already was. Nothing Ethos makes is ever trialing or paused (no trials, R8), but a
 *   trialing one is treated as active and a paused one as over, so no status goes unhandled (R11).
 */
export function subscriptionState(row: Pick<Pass, "starts_at" | "ends_at" | "plan">, sub: SubscriptionSnapshot, now: number): State {
  const startsAt = ms(row.starts_at);
  const periodEnd = sub.currentPeriodEnd ?? ms(row.ends_at);
  const cancelling = sub.cancelAtPeriodEnd || sub.cancelAt !== null;
  const common = { plan: sub.plan ?? row.plan, current_period_end: sub.currentPeriodEnd === null ? null : iso(sub.currentPeriodEnd), cancel_at_period_end: cancelling };
  const at = (end: number) => iso(Math.max(startsAt, end));
  switch (sub.status) {
    case "active":
    case "trialing":
      return { ...common, status: "active", ends_at: at(cancelling ? Math.min(periodEnd, sub.cancelAt ?? Infinity) : periodEnd + MEMBERSHIP_GRACE_MS) };
    case "past_due": {
      const paidUntil = sub.currentPeriodStart ?? periodEnd;
      return { ...common, current_period_end: iso(paidUntil), status: "past_due", ends_at: at(paidUntil + MEMBERSHIP_GRACE_MS) };
    }
    case "incomplete":
      return { ...common, status: "incomplete", ends_at: at(startsAt) };
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
    case "paused":
      return { ...common, status: "ended", ends_at: at(Math.min(ms(row.ends_at), sub.endedAt ?? now)) };
    default:
      // A status Stripe added after this was written: keep the couple going through the grace while
      // it is looked at, rather than cut them off over something we don't understand.
      console.warn("[membership] unknown subscription status, treated as past_due", sub.id, sub.status);
      return { ...common, status: "past_due", ends_at: at(periodEnd + MEMBERSHIP_GRACE_MS) };
  }
}

/**
 * Unlock rows after a row changed: while it runs, its owner and partner hold "*" and "pack:*"
 * (ignoreDuplicates: an Everything owner keeps their own row); once it doesn't, the rows it lent
 * go, and whoever held them gets them straight back from any other membership still running. Gifts
 * stay live either way (a membership that simply ran out was paid for).
 */
export async function settleUnlocks(db: Db, row: Pass, now: number): Promise<{ error?: string }> {
  if (isRunning(row, now)) return grantPassUnlocks(db, row, now);
  const holders = [row.owner_user_id, ...(row.partner_user_id ? [row.partner_user_id] : [])];
  const affected = unique([...holders, ...(await revokeUnlocksOf(db, row.purchase_id))]);
  await regrantRunningPasses(db, affected, now);
  return {};
}

async function update(db: Db, row: Pass, patch: Updates<"couple_passes">): Promise<Pass | { error: string }> {
  const { data, error } = await db.from("couple_passes").update(patch).eq("id", row.id).select("*");
  if (error) return { error: error.message };
  return data?.[0] ?? { ...row, ...(patch as Partial<Pass>) };
}

/**
 * Claims the "has ended" email (ended_notified_at, once) and sends it, releasing the claim if it
 * didn't go. `quietly` marks it told without sending. A caller with no way to send leaves it alone,
 * for the next one that has.
 */
async function tellEnded(db: Db, row: Pass, now: number, send: SendEnded | undefined, quietly: boolean): Promise<void> {
  if (!quietly && !send) return;
  const { data: claimed } = await db.from("couple_passes").update({ ended_notified_at: iso(now) }).eq("id", row.id).is("ended_notified_at", null).select("id");
  if ((claimed ?? []).length === 0 || quietly || !send) return;
  if (!(await send(row))) await db.from("couple_passes").update({ ended_notified_at: null }).eq("id", row.id);
}

/**
 * Writes what Stripe says about a subscription onto its row and hands over or takes back the unlock
 * rows to match. When it has just ended, the "has ended" email goes once, and only to a couple whose
 * membership ran out: at the end of what they paid for, or after the last failed retry. One ended
 * earlier on purpose (a refund, a withdrawal, a dispute, cancelling a failed renewal) was somebody's
 * decision, and nobody who asked for their money back is told to come back. One that never started
 * (incomplete_expired) says nothing either.
 */
export async function applySubscriptionState(db: Db, row: Pass, sub: SubscriptionSnapshot, now: number, options: { sendEnded?: SendEnded } = {}): Promise<{ row: Pass } | { error: string }> {
  // What it was, read before anything is written (a caller may hand in an object that gets updated).
  const was = row.status;
  const state = subscriptionState(row, sub, now);
  const revived = was === "ended" && state.status !== "ended";
  const patch: Updates<"couple_passes"> = {
    ...state,
    ...(sub.customerId ? { stripe_customer_id: sub.customerId } : {}),
    provider_event_at: iso(now),
    // A switch that has happened, a cancellation or an end leaves nothing waiting to switch.
    ...(row.pending_plan && (state.plan === row.pending_plan || state.cancel_at_period_end || state.status === "ended") ? { pending_plan: null } : {}),
    // Paid again after it had ended (an unpaid subscription settled late): its next end is news again.
    ...(revived ? { ended_notified_at: null } : {}),
  };
  const after = await update(db, row, patch);
  if ("error" in after) return after;
  const settled = await settleUnlocks(db, after, now);
  if (settled.error) return { error: settled.error };
  if (after.status === "ended" && was !== "ended") {
    const ranOut = sub.endedAt === null || sub.currentPeriodEnd === null || sub.endedAt >= sub.currentPeriodEnd - 60_000 || sub.cancellationReason === "payment_failed";
    await tellEnded(db, after, now, options.sendEnded, was === "incomplete" || !ranOut);
  }
  return { row: after };
}

/**
 * The row for a subscription that has just been paid for at checkout: made once (keyed by the
 * subscription id, so the webhook and the success page can both call this), in the state Stripe
 * says it is in, with a fresh invite code (drawn again on a clash, as a pass's is), and then the
 * unlock rows are handed over. No partner is carried over from an earlier membership: a
 * resubscriber invites again.
 */
export async function startSubscriptionMembership(
  db: Db,
  args: { purchaseId: string; ownerId: string; customerId: string | null; subscription: SubscriptionSnapshot; now: number },
): Promise<{ row: Pass; created: boolean } | { error: string }> {
  const { purchaseId, ownerId, subscription: sub, now } = args;
  const existing = await rowBySubscription(db, sub.id);
  if (existing) {
    const applied = await applySubscriptionState(db, existing, sub, now);
    return "error" in applied ? applied : { row: applied.row, created: false };
  }
  // The same person paying twice (a guest who typed the address of an account that already has a
  // running membership): they still get what they paid for, and the owner decides about a refund.
  const running = (await ownedRows(db, ownerId)).filter((row) => isRunning(row, now));
  if (running.length > 0) console.error("[membership] second running membership: refund one", ownerId, sub.id);

  const startsAt = iso(Math.min(sub.startDate, now));
  const state = subscriptionState({ starts_at: startsAt, ends_at: startsAt, plan: sub.plan ?? "yearly" }, sub, now);
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await db
      .from("couple_passes")
      .upsert(
        {
          purchase_id: purchaseId,
          owner_user_id: ownerId,
          invite_code: generateInviteCode(),
          provider: "stripe_subscription",
          starts_at: startsAt,
          ...state,
          stripe_customer_id: args.customerId,
          stripe_subscription_id: sub.id,
          provider_event_at: iso(now),
        },
        { onConflict: "stripe_subscription_id", ignoreDuplicates: true },
      )
      .select("*");
    // 23505 on the invite code: draw again.
    if (error?.code === "23505") continue;
    if (error) return { error: missingMembershipColumns(error, "a subscription's membership is written")?.message ?? error.message };
    const created = data?.[0];
    const row = created ?? (await rowBySubscription(db, sub.id));
    if (!row) return { error: "membership_missing" };
    const settled = await settleUnlocks(db, row, now);
    if (settled.error) return { error: settled.error };
    return { row, created: Boolean(created) };
  }
  return { error: "invite_code_collision" };
}

/**
 * The row of a Stripe subscription, or null when it has none. A read that fails throws rather than
 * reading as "no row": the webhook would answer an Ethos event 200 without acting on it, and Stripe
 * would never send it again (a renewal unrecorded, a refund of it unrecognised).
 */
export async function rowBySubscription(db: Db, subscriptionId: string): Promise<Pass | null> {
  const { data, error } = await db.from("couple_passes").select("*").eq("stripe_subscription_id", subscriptionId).maybeSingle();
  const missing = missingMembershipColumns(error, "a subscription's membership is read");
  if (missing) throw missing;
  if (error) throw new Error(`membership not read: ${error.message}`);
  return data ?? null;
}

/**
 * A user's rows. A read that fails throws rather than reading as "no membership" (which would sell a
 * member a second one, or show a pass owner nothing); before migration 0014 that is a
 * MissingMigrationError naming it (lib/commerce/db.ts).
 */
async function ownedRows(db: Db, userId: string): Promise<Pass[]> {
  const { data, error } = await db.from("couple_passes").select("*").eq("owner_user_id", userId);
  if (error) throw new Error(`memberships not read: ${error.message}`);
  return membershipRows(data, "a membership read");
}

async function rowsOf(db: Db, userId: string): Promise<Pass[]> {
  const [owned, joined] = await Promise.all([ownedRows(db, userId), db.from("couple_passes").select("*").eq("partner_user_id", userId)]);
  if (joined.error) throw new Error(`memberships not read: ${joined.error.message}`);
  const all = [...owned, ...membershipRows(joined.data, "a membership read")];
  return all.filter((row, i) => all.findIndex((other) => other.id === row.id) === i);
}

/**
 * The membership a user holds: the running one they own, else the running one they joined (the
 * latest end first), else the latest subscription of theirs Stripe is still collecting (a renewal
 * past its grace, a first payment being confirmed), so the pages can say the payment didn't go
 * through. Null when there is none of these.
 */
export function currentMembership(rows: Pass[], userId: string, now: number): Pass | null {
  const byEnd = [...rows].sort((a, b) => ms(b.ends_at) - ms(a.ends_at));
  const running = byEnd.filter((row) => isRunning(row, now) && row.status !== "ended");
  return (
    running.find((row) => row.owner_user_id === userId) ??
    running.find((row) => row.partner_user_id === userId) ??
    [...rows]
      .filter((row) => row.owner_user_id === userId && row.provider === "stripe_subscription" && (row.status === "past_due" || row.status === "incomplete"))
      .sort((a, b) => ms(b.created_at) - ms(a.created_at))[0] ??
    null
  );
}

/** What checkout needs to know about the buyer's own membership (lib/commerce/plan.ts). */
export async function membershipContextOf(db: Db, userId: string, now: number): Promise<MembershipContext | null> {
  const row = currentMembership(await rowsOf(db, userId), userId, now);
  if (!row) return null;
  return { running: isRunning(row, now), isOwner: row.owner_user_id === userId, provider: row.provider, status: row.status };
}

export type Person = { name: string | null; initial: string };

/** A name and an initial to show, never the email itself. */
export function personOf(profile: { name: string | null; email: string | null } | null | undefined): Person | null {
  if (!profile) return null;
  const name = profile.name?.trim() || null;
  return { name, initial: (name ?? profile.email ?? "?").trim().charAt(0).toUpperCase() || "?" };
}

/**
 * The membership as the pages and the app see it (MembershipSummary, docs/MEMBERSHIP.md 6.4). A
 * pass's period end counts the years its owner bought ahead, as the pass always has; a
 * subscription's is what has been paid for. Only the owner gets the invite link, and only while the
 * partner's place is empty.
 */
export function summariseMembership(rows: Pass[], userId: string, now: number, options: { invite: (code: string) => string; partner?: Person | null }): MembershipSummary | null {
  const row = currentMembership(rows, userId, now);
  if (!row) return null;
  const isOwner = row.owner_user_id === userId;
  const partnerJoined = Boolean(row.partner_user_id);
  const pass = isPassProvider(row.provider);
  const periodEnd = pass
    ? (paidUntil(
        rows.filter((other) => other.owner_user_id === row.owner_user_id && isPassProvider(other.provider)),
        now,
      ) ?? ms(row.ends_at))
    : ms(row.current_period_end ?? row.ends_at);
  const renewing = renews(row);
  const active = row.status === "active" && isRunning(row, now);
  const stripe = row.provider === "stripe_subscription";
  return {
    provider: row.provider,
    plan: row.plan,
    status: row.status === "ended" ? "active" : row.status,
    running: isRunning(row, now),
    isOwner,
    partnerJoined,
    partner: isOwner && !partnerJoined ? null : (options.partner ?? null),
    ...(isOwner && !partnerJoined ? { inviteUrl: options.invite(row.invite_code) } : {}),
    periodEnd: iso(periodEnd),
    renews: renewing,
    endsAt: renewing ? null : iso(pass ? periodEnd : ms(row.ends_at)),
    pendingPlan: row.pending_plan,
    manage: !isOwner ? null : stripe ? "stripe" : row.provider === "app_store" ? "app_store" : "pass",
    canSwitchToYearly: isOwner && stripe && active && row.plan === "monthly",
    canSwitchToMonthly: isOwner && stripe && active && row.plan === "yearly" && !row.cancel_at_period_end && row.pending_plan === null,
  };
}

/**
 * The user's membership, read with `db` (their own session: row-level security lets owner and
 * partner read the row) and the other person's name read with `names` (the service role: profiles
 * are own-row only).
 */
export async function readMembership(db: Db, userId: string, options: { locale: Locale; now: number; names?: Db | null }): Promise<MembershipSummary | null> {
  const rows = await rowsOf(db, userId);
  const row = currentMembership(rows, userId, options.now);
  if (!row) return null;
  const other = row.owner_user_id === userId ? row.partner_user_id : row.owner_user_id;
  let partner: Person | null = null;
  if (other) {
    const { data } = await (options.names ?? db).from("profiles").select("name, email").eq("id", other).maybeSingle();
    partner = personOf(data) ?? { name: null, initial: "?" };
  }
  return summariseMembership(rows, userId, options.now, { invite: (code) => inviteUrl(code, options.locale), partner });
}

/**
 * The partner leaves (or is removed): their place on the owner's running and ahead rows empties, the
 * rows those memberships lent them go, and anything else they hold running (a membership of their own)
 * hands its rows back. What they saved stays theirs; sharing stops with the membership.
 */
async function dropPartner(db: Db, rows: Pass[], partnerId: string, now: number): Promise<{ error?: string }> {
  for (const row of rows) {
    const { error } = await db.from("couple_passes").update({ partner_user_id: null }).eq("id", row.id).eq("partner_user_id", partnerId);
    if (error) return { error: error.message };
  }
  const purchaseIds = unique(rows.map((row) => row.purchase_id));
  for (const ids of chunks(purchaseIds, 100)) {
    const { error } = await db.from("template_unlocks").delete().eq("user_id", partnerId).in("purchase_id", ids);
    if (error) return { error: error.message };
  }
  await regrantRunningPasses(db, [partnerId], now);
  return {};
}

/** "Leave": the partner steps out of every running or bought-ahead membership they share. */
export async function leaveMembership(db: Db, partnerId: string, now: number): Promise<{ error?: string }> {
  // A read that fails is an error, never "nothing to leave": that answered 200 with the partner still in.
  const { data, error } = await db.from("couple_passes").select("*").eq("partner_user_id", partnerId).gt("ends_at", iso(now));
  if (error) return { error: error.message };
  return dropPartner(db, data ?? [], partnerId, now);
}

/** "Remove": the owner takes their partner out, and the invite link changes so the old one stops working. */
export async function removePartner(db: Db, ownerId: string, now: number): Promise<{ error?: string }> {
  // As in leaving: a failed read must not answer "removed" while the partner and the old link stay.
  const { data, error } = await db.from("couple_passes").select("*").eq("owner_user_id", ownerId).gt("ends_at", iso(now));
  if (error) return { error: error.message };
  const rows = data ?? [];
  const partners = unique(rows.map((row) => row.partner_user_id).filter((id): id is string => Boolean(id)));
  for (const partnerId of partners) {
    const dropped = await dropPartner(db, rows.filter((row) => row.partner_user_id === partnerId), partnerId, now);
    if (dropped.error) return dropped;
  }
  // A new code on every running and ahead row, each drawn again if it clashes.
  for (const row of rows) {
    let done = false;
    for (let attempt = 0; attempt < 3 && !done; attempt++) {
      const { error } = await db.from("couple_passes").update({ invite_code: generateInviteCode() }).eq("id", row.id);
      if (error?.code === "23505") continue;
      if (error) return { error: error.message };
      done = true;
    }
    if (!done) return { error: "invite_code_collision" };
  }
  return {};
}

export type ActionResult = { status: number; body: MembershipActionResponse };

type ActionError = Extract<MembershipActionResponse, { error: string }>["error"];

const refused = (status: number, error: ActionError, reason?: NotAvailableReason, url?: string | null): ActionResult => ({
  status,
  body: { error, ...(reason ? { reason } : {}), ...(url ? { url } : {}) },
});

/** 409: not available to this membership, with the reason the member can act on when there is one. */
const unavailable = (reason?: NotAvailableReason) => refused(409, "not_available", reason);

/**
 * A payment Stripe is still collecting (a renewal past due, or a first payment not through yet) is
 * the one state a member can do something about: `past_due`. A membership that has just ended has no
 * reason to give.
 */
const unavailableIn = (status: MembershipStatus) => unavailable(status === "past_due" || status === "incomplete" ? "past_due" : undefined);

/** A database error after Stripe answered: ours, not Stripe's (500 failed, never 502 stripe_failed). */
class DatabaseFailure extends Error {}

const failedWith = (action: MembershipAction, rowId: string | null, message: string): ActionResult => {
  console.error("[membership] action failed in the database", action, rowId, message);
  return refused(500, "failed");
};

/**
 * POST /api/membership (docs/MEMBERSHIP.md 2.7): what an owner or a partner can do to their
 * membership. Who may do what is decided here from the row, exactly as the contract's "who, when"
 * column says, and nothing that isn't there answers 200; what changes at Stripe goes through
 * `billing`, and the state Stripe answers with is applied at once, so the summary the route reads
 * afterwards is already true. `ok` answers carry no summary: the route reads it (it needs the names).
 * A Stripe failure is 502 stripe_failed; a database failure, 500 failed.
 */
export async function runMembershipAction(db: Db, userId: string, action: MembershipAction, ctx: { now: number; billing: BillingPort | null; sendEnded?: SendEnded }): Promise<ActionResult> {
  const { now, billing } = ctx;
  let rows: Pass[];
  try {
    rows = await rowsOf(db, userId);
  } catch (e) {
    // Nothing is known about the membership, so nothing is decided: the contract's 500 failed.
    return failedWith(action, null, (e as Error).message);
  }
  const joined = rows.find((row) => row.partner_user_id === userId && isRunning(row, now));
  const current = currentMembership(rows, userId, now);
  const owned = current && current.owner_user_id === userId ? current : null;
  const done: ActionResult = { status: 200, body: { ok: true, membership: null } };

  if (action === "leave") {
    if (!joined) return owned ? refused(403, "not_partner") : refused(404, "not_member");
    const left = await leaveMembership(db, userId, now);
    return left.error ? failedWith(action, joined.id, left.error) : done;
  }
  if (!owned) return joined ? refused(403, "not_owner") : refused(404, "not_member");
  if (action === "remove_partner") {
    // Only an owner with somebody in the partner's place, on the running year or one bought ahead.
    if (!rows.some((row) => row.owner_user_id === userId && row.partner_user_id && ms(row.ends_at) > now)) return unavailable();
    const removed = await removePartner(db, userId, now);
    return removed.error ? failedWith(action, owned.id, removed.error) : done;
  }
  if (owned.provider === "app_store") return unavailable("app_store");
  if (owned.provider !== "stripe_subscription" || !owned.stripe_subscription_id) return unavailable("pass");

  if (action === "keep_plan") {
    if (!owned.pending_plan) return unavailable();
    const { error } = await db.from("couple_passes").update({ pending_plan: null }).eq("id", owned.id);
    return error ? failedWith(action, owned.id, error.message) : done;
  }
  if (action === "switch_to_monthly") {
    if (owned.status !== "active") return unavailableIn(owned.status);
    if (owned.plan !== "yearly") return unavailable("not_yearly");
    if (owned.cancel_at_period_end) return unavailable("cancelling");
    // The renewal is when it happens: the cron switches it a couple of days before (applyPendingSwitches).
    const { error } = await db.from("couple_passes").update({ pending_plan: "monthly" }).eq("id", owned.id);
    return error ? failedWith(action, owned.id, error.message) : done;
  }

  if (!billing) return refused(503, "not_configured");
  const apply = async (sub: SubscriptionSnapshot) => {
    const applied = await applySubscriptionState(db, owned, sub, now, { sendEnded: ctx.sendEnded });
    if ("error" in applied) throw new DatabaseFailure(applied.error);
    return applied.row;
  };
  try {
    const sub = await billing.retrieve(owned.stripe_subscription_id);
    const row = await apply(sub);
    const cancelling = sub.cancelAtPeriodEnd || sub.cancelAt !== null;
    switch (action) {
      case "cancel":
        if (row.status === "past_due") {
          // Nothing has been paid for the period it is in: it ends now, and the renewal it was trying
          // to collect is voided rather than left owing (the dialog says so).
          await apply(await billing.cancelNow(sub.id, { voidOpenInvoices: true }));
          return done;
        }
        if (row.status !== "active") return unavailableIn(row.status);
        // Already cancelling: cancelling again changes nothing, and says so with the same answer.
        if (!cancelling) await apply(await billing.setCancelAtPeriodEnd(sub, true));
        return done;
      case "resume":
        if (row.status !== "active" && row.status !== "past_due") return unavailableIn(row.status);
        if (!cancelling) return unavailable();
        await apply(await billing.setCancelAtPeriodEnd(sub, false));
        return done;
      case "preview_yearly": {
        const refusal = yearlyRefusal(row);
        if (refusal) return refusal;
        const preview = await billing.previewSwitch(sub, "yearly");
        return { status: 200, body: { ok: true, preview: { amountDue: preview.amountDue, currency: preview.currency as Currency, periodEnd: iso(preview.periodEnd) } } };
      }
      case "switch_to_yearly": {
        const refusal = yearlyRefusal(row);
        if (refusal) return refusal;
        // A cancelling subscription is un-cancelled first (a pending update can't carry it), and
        // cancelled again if the switch doesn't go through: nothing changes unless it does.
        const ready = cancelling ? await billing.setCancelAtPeriodEnd(sub, false) : sub;
        const switched = await billing.switchPlan(ready, "yearly");
        if (switched.outcome === "switched") {
          await apply(switched.subscription);
          return done;
        }
        if (cancelling) await apply(await billing.setCancelAtPeriodEnd(ready, true));
        return switched.outcome === "requires_action" ? refused(402, "requires_action", undefined, switched.url) : refused(402, "payment_failed");
      }
      default:
        return refused(400, "invalid_input");
    }
  } catch (e) {
    if (e instanceof DatabaseFailure) return failedWith(action, owned.id, e.message);
    console.error("[membership] action failed at Stripe", action, owned.id, (e as Error).message);
    return refused(502, "stripe_failed");
  }
}

function yearlyRefusal(row: Pass): ActionResult | null {
  if (row.status !== "active") return unavailableIn(row.status);
  if (row.plan !== "monthly") return unavailable("not_monthly");
  return null;
}

/**
 * A cron step's read that failed stops the step (the cron reports it and goes on with the others)
 * instead of reading as "nothing due"; before migration 0014, by name.
 */
export function cronRead(error: { code?: string | null; message?: string | null } | null | undefined, what: string): void {
  const missing = missingMembershipColumns(error, what);
  if (missing) throw missing;
  if (error) throw new Error(`${what} not read: ${error.message}`);
}

/**
 * The cron's step for yearly → monthly switches the owner asked for: a couple of days before the
 * year ends the item moves to the monthly price, the unused days are credited, and the monthly
 * periods start. A switch whose payment doesn't go through stays pending and is tried again on the
 * next run; if the year renews first, invoice.paid switches it straight away (lib/stripe/events.ts).
 */
export async function applyPendingSwitches(db: Db, now: number, billing: BillingPort, options: { sendEnded?: SendEnded } = {}): Promise<{ due: number; switched: number }> {
  const { data, error } = await db
    .from("couple_passes")
    .select("*")
    .eq("provider", "stripe_subscription")
    .eq("pending_plan", "monthly")
    .eq("status", "active")
    .eq("cancel_at_period_end", false)
    .lte("current_period_end", iso(now + PENDING_SWITCH_WINDOW_MS))
    .limit(CRON_BATCH);
  cronRead(error, "pending monthly switches");
  let switched = 0;
  for (const row of data ?? []) {
    if (!row.stripe_subscription_id) continue;
    if (await switchToMonthlyNow(db, row, now, billing, options)) switched += 1;
  }
  return { due: (data ?? []).length, switched };
}

/** Moves a yearly subscription whose owner asked for monthly onto the monthly price, now. */
export async function switchToMonthlyNow(db: Db, row: Pass, now: number, billing: BillingPort, options: { sendEnded?: SendEnded } = {}): Promise<boolean> {
  try {
    const sub = await billing.retrieve(row.stripe_subscription_id!);
    if (sub.status !== "active" || sub.cancelAtPeriodEnd || sub.cancelAt !== null || sub.plan !== "yearly") {
      await applySubscriptionState(db, row, sub, now, options);
      return false;
    }
    // Off-session: a bank that wants the payment confirmed has nobody to ask, so the switch waits
    // for the next run (or the renewal, lib/stripe/events.ts) rather than on an open invoice.
    const outcome = await billing.switchPlan(sub, "monthly", { confirmable: false });
    if (outcome.outcome !== "switched") {
      console.warn("[membership] monthly switch not paid, tried again later", row.id, outcome.outcome);
      return false;
    }
    const applied = await applySubscriptionState(db, row, outcome.subscription, now, options);
    return !("error" in applied);
  } catch (e) {
    console.error("[membership] monthly switch failed", row.id, (e as Error).message);
    return false;
  }
}

/**
 * A week before a yearly renewal, one email to the owner: when, how much, and that cancelling before
 * then costs nothing. Claimed per period end (renewal_reminded_for), so two overlapping runs send it
 * once, and released if sending fails so the next run tries again. Monthly plans get none; App Store
 * renewals are Apple's to announce.
 */
export async function remindYearlyRenewals(db: Db, now: number, send: (row: Pass) => Promise<boolean>): Promise<{ due: number; sent: number }> {
  const { data, error } = await db
    .from("couple_passes")
    .select("*")
    .eq("provider", "stripe_subscription")
    .eq("plan", "yearly")
    .eq("status", "active")
    .eq("cancel_at_period_end", false)
    .gt("current_period_end", iso(now))
    .lte("current_period_end", iso(now + YEARLY_REMINDER_MS))
    .limit(CRON_BATCH);
  cronRead(error, "yearly renewal reminders");
  const due = (data ?? []).filter((row) => row.current_period_end && (!row.renewal_reminded_for || ms(row.renewal_reminded_for) !== ms(row.current_period_end)));
  let sent = 0;
  for (const row of due) {
    const previous = row.renewal_reminded_for;
    const claim = db.from("couple_passes").update({ renewal_reminded_for: row.current_period_end }).eq("id", row.id);
    const { data: claimed } = await (previous ? claim.eq("renewal_reminded_for", previous) : claim.is("renewal_reminded_for", null)).select("id");
    if ((claimed ?? []).length === 0) continue;
    if (await send(row)) sent += 1;
    else await db.from("couple_passes").update({ renewal_reminded_for: previous }).eq("id", row.id);
  }
  return { due: due.length, sent };
}

/**
 * The cron's safety net for missed webhooks: a Stripe subscription whose paid period has passed (a
 * renewal not heard of, or one past due, whose card may have been updated since), or a first payment
 * still unconfirmed after a day, is read from Stripe again. The grace gives a renewing membership
 * seven runs to hear of its renewal, so a lost event never costs access. The ones read longest ago
 * go first, so rows Stripe leaves past due for good can't crowd the others out of a run.
 */
export async function reconcileSubscriptions(db: Db, now: number, billing: BillingPort, options: { sendEnded?: SendEnded } = {}): Promise<{ checked: number; failed: number }> {
  const [overdue, stuck] = await Promise.all([
    db
      .from("couple_passes")
      .select("*")
      .eq("provider", "stripe_subscription")
      .in("status", ["active", "past_due", "incomplete"])
      .lte("current_period_end", iso(now))
      .order("provider_event_at", { ascending: true, nullsFirst: true })
      .limit(CRON_BATCH),
    db.from("couple_passes").select("*").eq("provider", "stripe_subscription").eq("status", "incomplete").lte("starts_at", iso(now - DAY_MS)).limit(CRON_BATCH),
  ]);
  cronRead(overdue.error ?? stuck.error, "subscriptions to reconcile");
  const rows = [...(overdue.data ?? []), ...(stuck.data ?? [])].filter((row, i, all) => all.findIndex((other) => other.id === row.id) === i);
  let failed = 0;
  for (const row of rows) {
    if (!row.stripe_subscription_id) continue;
    try {
      const applied = await applySubscriptionState(db, row, await billing.retrieve(row.stripe_subscription_id), now, options);
      if ("error" in applied) failed += 1;
    } catch (e) {
      failed += 1;
      console.error("[membership] reconcile failed", row.id, (e as Error).message);
    }
  }
  return { checked: rows.length, failed };
}

/**
 * Ends a membership now, for both people: a dispute, a full refund of the period it is in, or a
 * withdrawal within the 14 days (docs/MEMBERSHIP.md 2.6). The unlock rows it lent go (found by the
 * row's own purchase: a renewal's purchase has none of its own), everyone gets back whatever else
 * they hold running, gifts go back to draft only when the money went back (`relock`), and a Stripe
 * subscription is cancelled at once through `cancelSubscription`. The "has ended" email is marked as
 * sent without sending. Safe to run twice.
 */
export async function endMembershipNow(
  db: Db,
  row: Pass,
  now: number,
  options: { relock: boolean; cancelSubscription?: ((subscriptionId: string) => Promise<void>) | null },
): Promise<{ error?: string }> {
  if (isPassProvider(row.provider)) await shortenRefundedPass(db, row.purchase_id, now);
  else {
    const ended = await update(db, row, { ends_at: iso(Math.max(ms(row.starts_at), Math.min(ms(row.ends_at), now))) });
    if ("error" in ended) return ended;
  }
  const { error } = await db
    .from("couple_passes")
    .update({ status: "ended", pending_plan: null, ...(row.ended_notified_at ? {} : { ended_notified_at: iso(now) }) })
    .eq("id", row.id);
  if (error) return { error: error.message };
  const holders = [row.owner_user_id, ...(row.partner_user_id ? [row.partner_user_id] : [])];
  const affected = unique([...holders, ...(await revokeUnlocksOf(db, row.purchase_id))]);
  await regrantRunningPasses(db, affected, now);
  if (options.relock) for (const userId of affected) await relockGifts(db, userId);
  // Last, and every time (the callback leaves an already-cancelled one alone): if Stripe can't be
  // reached, the webhook answers 500 and the retry cancels it, so the card is never charged again.
  if (row.provider === "stripe_subscription" && row.stripe_subscription_id && options.cancelSubscription) await options.cancelSubscription(row.stripe_subscription_id);
  return {};
}

/**
 * The membership a purchase paid for: the row it links to, or the row it started. Before migration
 * 0014 the row can't say whether it is a pass or a subscription, and ending it the wrong way can't be
 * undone: that throws, naming the migration.
 */
export async function membershipOfPurchase(db: Db, purchase: { id: string; membership_id?: string | null }): Promise<Pass | null> {
  if (purchase.membership_id) {
    const { data } = await db.from("couple_passes").select("*").eq("id", purchase.membership_id).maybeSingle();
    if (data) return membershipRows([data], "a refund ends a membership")[0];
  }
  const { data } = await db.from("couple_passes").select("*").eq("purchase_id", purchase.id).maybeSingle();
  return data ? membershipRows([data], "a refund ends a membership")[0] : null;
}

/**
 * Whether a payment is the one for the period a membership is in now: its latest paid purchase (the
 * checkout's, a renewal's or a switch's). Refunding that one ends the membership; refunding an older
 * period changes nothing else.
 */
export async function paysLatestPeriod(db: Db, row: Pass, purchaseId: string): Promise<boolean> {
  const [linked, first] = await Promise.all([
    db.from("purchases").select("id, created_at, status").eq("membership_id", row.id),
    db.from("purchases").select("id, created_at, status").eq("id", row.purchase_id),
  ]);
  const all = [...(linked.data ?? []), ...(first.data ?? [])];
  const paid = all.filter((p, i) => all.findIndex((other) => other.id === p.id) === i && (p.id === purchaseId || p.status === "paid"));
  if (paid.length === 0) return true;
  const at = (p: { created_at: string | null }) => (p.created_at ? ms(p.created_at) : -Infinity);
  const latest = paid.reduce((a, b) => (at(b) > at(a) ? b : a));
  return latest.id === purchaseId;
}

export type { MembershipStatus };
