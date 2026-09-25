import "server-only";

import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { isProductId } from "@/lib/pricing/products";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendCheckoutRecovery } from "@/lib/email/notify";
import { optedOut } from "@/lib/email/optouts";
import { rateLimit } from "@/lib/rate-limit";

export type RecoveryTarget = { to: string; locale: "en" | "es"; url: string; templateSlug?: string };

/** One recovery email per address in this long, however many checkouts they leave open. */
export const RECOVERY_PER_ADDRESS_SECONDS = 7 * 86_400;

/**
 * Whether the buyer asked for the reminder: only by ticking Stripe's marketing box. Stripe shows it to
 * US merchants only and this account isn't one ("not available in your country"), so today nobody can
 * tick it and no recovery email is sent. An opt-in box of our own under the pay button was tried and
 * taken out: it cluttered the moment of paying for a promise nobody expects there.
 */
function askedForRecovery(session: Stripe.Checkout.Session): boolean {
  return session.consent?.promotions === "opt_in";
}

/**
 * Who to send an abandoned checkout's recovery link to, if anyone. Only a session this site made
 * (the Stripe account is shared), only a buyer who asked for it (askedForRecovery), and only when
 * Stripe made a recovery link and an email was typed.
 */
export function recoveryTarget(session: Stripe.Checkout.Session): RecoveryTarget | null {
  const m = session.metadata ?? {};
  // A subscription checkout has no recovery link, and nobody is chased into a subscription.
  if (session.mode === "subscription") return null;
  if (!m.purchase_id || !m.product || !isProductId(m.product)) return null;
  if (!askedForRecovery(session)) return null;
  const url = session.after_expiration?.recovery?.url;
  const to = (session.customer_details?.email ?? session.customer_email ?? "").trim().toLowerCase();
  if (!url || !to) return null;
  const templateSlug = m.product === "single" || m.product === "extras" ? (m.template_slugs ?? "").split(",").find(Boolean) : undefined;
  return { to, locale: m.locale === "es" ? "es" : "en", url, ...(templateSlug ? { templateSlug } : {}) };
}

/** Somebody who came back and paid after this session started doesn't need chasing. */
async function paidSince(session: Stripe.Checkout.Session, email: string): Promise<boolean> {
  const admin = getSupabaseAdminClient();
  if (!admin) return false;
  let userId = session.metadata?.user_id || null;
  if (!userId) {
    const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    userId = profile?.id ?? null;
  }
  if (!userId) return false;
  const { data } = await admin
    .from("purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "paid")
    .gte("created_at", new Date(session.created * 1000).toISOString())
    .limit(1);
  return (data ?? []).length > 0;
}

/**
 * checkout.session.expired: one recovery email, at most, per session and per address a week.
 * Somebody who opens checkout three times and leaves gets one nudge, not three.
 */
export async function recoverExpiredSession(session: Stripe.Checkout.Session): Promise<boolean> {
  const target = recoveryTarget(session);
  if (!target) return false;
  // Hashed: the limiter's store has no business holding email addresses. The same hash is the
  // unsubscribe list's key (emailKey).
  const address = createHash("sha256").update(target.to).digest("hex");
  // Ticking the box on a later checkout doesn't undo an unsubscribe. Checked before the limits, so an
  // address on the list doesn't use up its week. The email checks again, next to its opt-out link.
  const admin = getSupabaseAdminClient();
  if (!admin || (await optedOut(admin, address))) return false;
  if (await paidSince(session, target.to)) return false;
  // Stripe may deliver the same event more than once.
  if (!(await rateLimit(`checkout-recovery:${session.id}`, { limit: 1, windowSeconds: 7 * 86_400 }))) return false;
  if (!(await rateLimit(`checkout-recovery-to:${address}`, { limit: 1, windowSeconds: RECOVERY_PER_ADDRESS_SECONDS }))) return false;
  return sendCheckoutRecovery(target);
}
