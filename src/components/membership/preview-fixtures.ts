import type { MembershipSummary } from "@/lib/membership/types";

/**
 * The account section's states, for the development-only preview (/for-two/preview?state=…): the
 * account page itself needs a signed-in member, and the dev server's database is production, where
 * nobody signs in for a screenshot or a test. Days are counted from `now`, so the dates always read
 * as the future they are in real life.
 */
const DAY = 86_400_000;

export const PREVIEW_STATES = [
  "none",
  "monthly",
  "yearly",
  "switching",
  "cancelling",
  "past-due",
  "paused",
  "processing",
  "pass",
  "pass-ending",
  "app-store",
  "app-store-billing",
  "partner",
  "with-partner",
] as const;
export type PreviewState = (typeof PREVIEW_STATES)[number];

export const isPreviewState = (value: unknown): value is PreviewState => typeof value === "string" && (PREVIEW_STATES as readonly string[]).includes(value);

export function previewMembership(state: PreviewState, now: number = Date.now()): MembershipSummary | null {
  const at = (days: number) => new Date(now + days * DAY).toISOString();
  const base: MembershipSummary = {
    provider: "stripe_subscription",
    plan: "monthly",
    status: "active",
    running: true,
    isOwner: true,
    partnerJoined: false,
    partner: null,
    inviteUrl: "https://tryethos.io/for-two/join?code=preview234",
    periodEnd: at(18),
    renews: true,
    endsAt: null,
    pendingPlan: null,
    manage: "stripe",
    canSwitchToYearly: true,
    canSwitchToMonthly: false,
  };
  const yearly = { plan: "yearly" as const, periodEnd: at(210), canSwitchToYearly: false, canSwitchToMonthly: true };
  switch (state) {
    case "none":
      return null;
    case "monthly":
      return base;
    case "yearly":
      return { ...base, ...yearly };
    case "switching":
      return { ...base, ...yearly, pendingPlan: "monthly", canSwitchToMonthly: false };
    case "cancelling":
      return { ...base, renews: false, endsAt: base.periodEnd };
    case "past-due":
      return { ...base, status: "past_due", renews: false, periodEnd: at(-2), endsAt: at(5), canSwitchToYearly: false };
    case "paused":
      return { ...base, status: "past_due", running: false, renews: false, periodEnd: at(-9), endsAt: at(-2), canSwitchToYearly: false };
    case "processing":
      return { ...base, status: "incomplete", running: false, renews: false, periodEnd: at(0), endsAt: at(0), canSwitchToYearly: false };
    case "pass":
      return { ...base, ...yearly, provider: "stripe_pass", renews: false, endsAt: yearly.periodEnd, manage: "pass", canSwitchToMonthly: false };
    case "pass-ending":
      return { ...base, ...yearly, provider: "stripe_pass", periodEnd: at(12), renews: false, endsAt: at(12), manage: "pass", canSwitchToMonthly: false };
    case "app-store":
      return { ...base, provider: "app_store", manage: "app_store", canSwitchToYearly: false };
    case "app-store-billing":
      return { ...base, provider: "app_store", manage: "app_store", status: "past_due", renews: false, endsAt: at(4), canSwitchToYearly: false };
    case "partner":
      return { ...base, isOwner: false, partnerJoined: true, partner: { name: "Alex", initial: "A" }, inviteUrl: undefined, manage: null, canSwitchToYearly: false };
    case "with-partner":
      return { ...base, partnerJoined: true, partner: { name: "Sam", initial: "S" }, inviteUrl: undefined };
  }
}
