import type { Currency, MembershipPlan } from "@/lib/pricing/products";

/**
 * The membership as the pages, the account section and the iPhone app see it (docs/MEMBERSHIP.md
 * 6.4). One `couple_passes` row, whichever way it was paid for: a one-time pass, a Stripe
 * subscription or an App Store one.
 */
export type { MembershipPlan };
export type MembershipProvider = "stripe_pass" | "stripe_subscription" | "app_store" | "app_store_pass";
export type MembershipStatus = "incomplete" | "active" | "past_due" | "ended";
export type MembershipSummary = {
  provider: MembershipProvider;
  /** A pass is "yearly". */
  plan: MembershipPlan;
  status: Exclude<MembershipStatus, "ended">;
  /** Gives access right now. */
  running: boolean;
  isOwner: boolean;
  partnerJoined: boolean;
  /** The other person, once joined. */
  partner: { name: string | null; initial: string } | null;
  /** Owner only, while the place is empty. */
  inviteUrl?: string;
  /** ISO: paid until (a pass: its end, renewals bought ahead counted). */
  periodEnd: string;
  /** An active subscription with renewal on. */
  renews: boolean;
  /** ISO when access ends if nothing changes; null while it renews. */
  endsAt: string | null;
  pendingPlan: MembershipPlan | null;
  /** Where billing is managed; null for the partner. */
  manage: "stripe" | "app_store" | "pass" | null;
  canSwitchToYearly: boolean;
  canSwitchToMonthly: boolean;
};
export type MembershipAction = "cancel" | "resume" | "preview_yearly" | "switch_to_yearly" | "switch_to_monthly" | "keep_plan" | "leave" | "remove_partner";
export type MembershipActionError =
  | "unauthenticated"
  | "invalid_input"
  | "not_member"
  | "not_owner"
  | "not_partner"
  | "not_available"
  | "payment_failed"
  | "requires_action"
  | "rate_limited"
  | "stripe_failed"
  | "not_configured";
export type MembershipActionResponse =
  | { ok: true; membership: MembershipSummary | null }
  | { ok: true; preview: { amountDue: number; currency: Currency; periodEnd: string } }
  | { error: MembershipActionError; reason?: string; url?: string };
export type PortalFlow = "manage" | "update_card" | "cancel";
