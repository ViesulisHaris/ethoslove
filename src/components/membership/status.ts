import type { MembershipPlan, MembershipSummary } from "@/lib/membership/types";

/**
 * What a membership is right now, decided once for every page that talks about it: the pricing
 * page's hero, the account section, and anything added later. Each surface words it at its own
 * length, but never draws a different conclusion from the same summary: an App Store renewal Apple
 * can't collect is Apple's billing problem everywhere (no card of ours to update), and a first
 * payment the bank is still confirming is never a failed payment. Pure, so every case is tested.
 *
 * `date` is the day the line is about: when it renews, when it ends, when a payment must be fixed by.
 */
export type MembershipState =
  /** A Stripe subscription whose first payment the bank is confirming: nothing runs yet, nothing has failed. */
  | { kind: "processing" }
  /** A subscription that renews by itself on `date`. */
  | { kind: "renewing"; plan: MembershipPlan; date: string }
  /** Cancelled, running to the end of what was paid for. */
  | { kind: "cancelling"; plan: MembershipPlan; date: string }
  /** Stripe couldn't take a renewal and is retrying: still running, until `date` at the latest. */
  | { kind: "pastDue"; plan: MembershipPlan; date: string }
  /** The retries' grace ran out: nothing runs until the payment goes through. */
  | { kind: "paused"; plan: MembershipPlan }
  /** A one-time year (Stripe or the iPhone app), until `date`. */
  | { kind: "pass"; date: string; web: boolean }
  /** Billed by Apple and renewing on `date`. */
  | { kind: "appStore"; date: string }
  /** Billed by Apple, cancelled in iOS: runs until `date`. */
  | { kind: "appStoreEnding"; date: string }
  /** Apple couldn't take a renewal: fixed in iOS, by `date`. */
  | { kind: "appStoreBilling"; date: string }
  /** In on someone else's running membership; `until` is its end, or null while it renews. */
  | { kind: "partner"; until: string | null }
  /** Nothing to show: no membership, or one that no longer gives anything. */
  | { kind: "none" };

export function membershipState(membership: MembershipSummary | null): MembershipState {
  if (!membership) return { kind: "none" };
  const { provider, plan, status, running } = membership;
  // What access runs to when it doesn't renew. endsAt is only null while it renews.
  const endsAt = membership.endsAt ?? membership.periodEnd;

  if (!membership.isOwner) return running ? { kind: "partner", until: membership.renews ? null : endsAt } : { kind: "none" };

  if (provider === "stripe_subscription") {
    // Incomplete never runs (its end is its start): the bank hasn't said yes yet. It is not a failure.
    if (status === "incomplete") return { kind: "processing" };
    if (status === "past_due") return running ? { kind: "pastDue", plan, date: endsAt } : { kind: "paused", plan };
    if (!running) return { kind: "none" };
    return membership.renews ? { kind: "renewing", plan, date: membership.periodEnd } : { kind: "cancelling", plan, date: endsAt };
  }

  // Everything below gives access only while it runs; an ended App Store or pass year is nothing here.
  if (!running) return { kind: "none" };
  if (provider === "app_store") {
    if (status === "past_due") return { kind: "appStoreBilling", date: endsAt };
    return membership.renews ? { kind: "appStore", date: membership.periodEnd } : { kind: "appStoreEnding", date: endsAt };
  }
  return { kind: "pass", date: endsAt, web: provider === "stripe_pass" };
}

/** A state the owner has to act on: a payment to fix, here or in iOS. */
export function needsPayment(state: MembershipState): boolean {
  return state.kind === "pastDue" || state.kind === "paused" || state.kind === "appStoreBilling";
}
