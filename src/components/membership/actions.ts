import type { Currency } from "@/lib/pricing/products";
import type { MembershipAction, MembershipSummary, PortalFlow } from "@/lib/membership/types";
import { parseMembership } from "@/components/pricing/entitlements";
import { errorOf, postJson } from "@/components/pricing/requests";

/**
 * The account page's side of POST /api/membership and POST /api/stripe/portal (docs/MEMBERSHIP.md
 * 2.7), read the way the pricing page reads checkout: one shape back, never a throw.
 */
export type ActionAnswer =
  | { ok: true; membership: MembershipSummary | null }
  | { ok: true; preview: { amountDue: number; currency: Currency; periodEnd: string } }
  | { ok: false; error: string; reason?: string; url?: string; status: number };

const CURRENCIES: readonly Currency[] = ["eur", "usd", "gbp"];

export async function postMembership(action: MembershipAction, locale: "en" | "es"): Promise<ActionAnswer> {
  const result = await postJson("/api/membership", { action, locale });
  const body = result.json;
  if (result.ok && body.ok === true) {
    const preview = body.preview;
    if (preview && typeof preview === "object") {
      const { amountDue, currency, periodEnd } = preview as Record<string, unknown>;
      if (typeof amountDue === "number" && typeof periodEnd === "string" && CURRENCIES.includes(currency as Currency)) return { ok: true, preview: { amountDue, currency: currency as Currency, periodEnd } };
    }
    return { ok: true, membership: parseMembership(body.membership) };
  }
  return {
    ok: false,
    error: errorOf(result) ?? (result.status === 0 ? "network" : "failed"),
    status: result.status,
    ...(typeof body.reason === "string" ? { reason: body.reason } : {}),
    ...(typeof body.url === "string" ? { url: body.url } : {}),
  };
}

/** Stripe's billing page for this member, on Ethos's own portal configuration: a URL to go to, or why not. */
export async function openPortal(flow: PortalFlow, locale: "en" | "es"): Promise<{ url: string } | { error: string; reason?: string; status: number }> {
  const result = await postJson("/api/stripe/portal", { flow, locale });
  const url = result.json.url;
  if (typeof url === "string" && url.startsWith("https://")) return { url };
  return { error: errorOf(result) ?? (result.status === 0 ? "network" : "failed"), status: result.status, ...(typeof result.json.reason === "string" ? { reason: result.json.reason } : {}) };
}

/** Why a membership change or the billing page didn't happen, as a key under membership.account.errors. */
export type MembershipErrorKey = "generic" | "tooMany" | "signIn" | "unavailable" | "appStore" | "notConfigured" | "paymentFailed" | "requiresAction";

export function membershipErrorKey(error: string, reason?: string): MembershipErrorKey {
  switch (error) {
    case "unauthenticated":
      return "signIn";
    case "rate_limited":
      return "tooMany";
    case "not_available":
      return reason === "app_store" ? "appStore" : "unavailable";
    case "not_member":
    case "not_owner":
    case "not_partner":
      return "unavailable";
    case "payment_failed":
      return "paymentFailed";
    case "requires_action":
      return "requiresAction";
    case "not_configured":
    case "portal_not_configured":
      return "notConfigured";
    default:
      return "generic";
  }
}
