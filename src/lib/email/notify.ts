import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { SITE } from "@/config/site";
import { isConfigured } from "@/lib/env";
import { emailKey, linkSecret, signToken } from "@/lib/lifecycle/links";
import type { ReminderOccasion } from "@/lib/lifecycle/reminders";
import { getManifest } from "@/templates/manifests";
import { sendEmail } from "./send";
import { pageUrl, siteUrl } from "./urls";
import { GiftOpenedEmail, GiftPublishedEmail, GiftUnlockedEmail, ReactionEmail, ReceiptEmail, WelcomeEmail } from "@/emails/templates";
import { CheckoutRecoveryEmail, GiftCardEmail, PassRenewalEmail, PassWelcomeEmail, ReminderEmail, recoveryHeading, reminderHeading } from "@/emails/lifecycle";

type L = "en" | "es";
type Admin = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

/**
 * Whether an address (by its emailKey) is on the unsubscribe list. Besides the checkout reminder, the
 * list covers the offers inside service emails (the receipt's "Everything for the difference", the
 * "start the next gift" line), which the privacy policy promises to leave out for anyone on it. A
 * lookup that fails counts as on the list: no offer is worth sending against someone's wishes.
 */
async function optedOut(admin: Admin, key: string): Promise<boolean> {
  const { data, error } = await admin.from("email_optouts").select("email_sha256").eq("email_sha256", key).maybeSingle();
  return Boolean(error || data);
}

async function ownerOf(giftId: string): Promise<{ email: string; locale: L; recipientName: string; shortId: string } | null> {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;
  const { data: gift } = await admin.from("gifts").select("user_id, locale, short_id, data").eq("id", giftId).single();
  if (!gift) return null;
  const { data: profile } = await admin.from("profiles").select("email, locale").eq("id", gift.user_id).single();
  if (!profile?.email) return null;
  const data = gift.data as { recipientName?: string } | null;
  return { email: profile.email, locale: (profile.locale === "es" ? "es" : "en") as L, recipientName: data?.recipientName ?? "", shortId: gift.short_id };
}

/** "23 September 2027" / "23 de septiembre de 2027": a day, in UTC, which is how the pass dates are kept. */
export function emailDate(iso: string, locale: L): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es" : "en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(iso));
}

export async function notifyWelcome(email: string, locale: L) {
  return sendEmail({ to: email, subject: locale === "es" ? "Bienvenido a Ethos" : "Welcome to Ethos", react: WelcomeEmail({ locale, siteUrl: siteUrl() }) });
}

export async function notifyPublished(giftId: string, scheduledFor?: string) {
  const owner = await ownerOf(giftId);
  if (!owner) return;
  const url = `${siteUrl()}${SITE.giftPath}/${owner.shortId}`;
  return sendEmail({
    to: owner.email,
    subject: owner.locale === "es" ? `Tu regalo para ${owner.recipientName} está ${scheduledFor ? "programado" : "publicado"}` : `Your gift for ${owner.recipientName} is ${scheduledFor ? "scheduled" : "live"}`,
    react: GiftPublishedEmail({ locale: owner.locale, recipientName: owner.recipientName, url, scheduledFor }),
  });
}

/** Only for the first open of a gift; later opens are dashboard-only. */
export async function notifyFirstOpen(giftId: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) return;
  const { count } = await admin.from("gift_views").select("id", { count: "exact", head: true }).eq("gift_id", giftId);
  if ((count ?? 0) !== 1) return;
  const owner = await ownerOf(giftId);
  if (!owner) return;
  const offer = !(await optedOut(admin, await emailKey(owner.email)));
  return sendEmail({
    to: owner.email,
    subject: owner.locale === "es" ? `${owner.recipientName} ha abierto tu regalo` : `${owner.recipientName} opened your gift`,
    react: GiftOpenedEmail({ locale: owner.locale, recipientName: owner.recipientName, dashboardUrl: `${siteUrl()}/dashboard/gift/${giftId}`, nextUrl: offer ? pageUrl(owner.locale, "/templates?ref=email-opened") : undefined }),
  });
}

export async function notifyReaction(giftId: string, emoji: string, text: string | null, hasAudio: boolean) {
  const owner = await ownerOf(giftId);
  if (!owner) return;
  return sendEmail({
    to: owner.email,
    subject: `${emoji} ${owner.locale === "es" ? `${owner.recipientName} te ha enviado una reacción` : `${owner.recipientName} sent you a reaction`}`,
    react: ReactionEmail({ locale: owner.locale, recipientName: owner.recipientName, emoji, text, hasAudio, dashboardUrl: `${siteUrl()}/dashboard/gift/${giftId}` }),
  });
}

export async function notifyUnlocked(giftId: string) {
  const owner = await ownerOf(giftId);
  if (!owner) return;
  return sendEmail({
    to: owner.email,
    subject: owner.locale === "es" ? `Tu regalo para ${owner.recipientName} ya está abierto` : `Your gift for ${owner.recipientName} just unlocked`,
    react: GiftUnlockedEmail({ locale: owner.locale, recipientName: owner.recipientName, url: `${siteUrl()}${SITE.giftPath}/${owner.shortId}` }),
  });
}

/**
 * `extra.until` (ISO) is for a purchase that ends, the Ethos for Two pass. `extra.upgrade` offers
 * Everything for the difference after a single or a pick three; its amount is the caller's, from the
 * catalogue and what the buyer has paid, already formatted, and left out for an address on the
 * unsubscribe list. `extra.giftCard` is for a gift card, whose receipt must not say the right to
 * cancel is gone (it lasts until the code is redeemed). `extra.consent` is the withdrawal sentence the
 * buyer ticked, as recorded on the purchase, which the receipt quotes.
 */
export async function notifyReceipt(userId: string, productLabel: string, amountLabel: string, unlocks: string[], extra?: { until?: string; upgrade?: { url: string; amountLabel: string }; giftCard?: boolean; consent?: string }) {
  const admin = getSupabaseAdminClient();
  if (!admin) return;
  const { data: profile } = await admin.from("profiles").select("email, locale").eq("id", userId).single();
  if (!profile?.email) return;
  const locale: L = profile.locale === "es" ? "es" : "en";
  const until = extra?.until ? emailDate(extra.until, locale) : undefined;
  const upgrade = extra?.upgrade && !(await optedOut(admin, await emailKey(profile.email))) ? extra.upgrade : undefined;
  return sendEmail({ to: profile.email, subject: locale === "es" ? `Recibo de Ethos: ${productLabel}` : `Your Ethos receipt: ${productLabel}`, react: ReceiptEmail({ locale, productLabel, amountLabel, unlocks, dashboardUrl: `${siteUrl()}/account`, until, upgrade, giftCard: extra?.giftCard, consent: extra?.consent }) });
}

// Lifecycle emails (contract C6). Each returns whether an email went out, and none of them throws:
// the callers are webhooks and daily jobs that must finish their own work whatever happens to the
// email. Without Resend configured they send nothing and return false.

async function safely(what: string, run: () => Promise<boolean>): Promise<boolean> {
  if (!isConfigured.resend) return false;
  try {
    return await run();
  } catch (e) {
    console.error(`[email] ${what} failed: ${(e as Error).message}`);
    return false;
  }
}

async function deliver(what: string, message: Parameters<typeof sendEmail>[0]): Promise<boolean> {
  const result = await sendEmail(message);
  if (!result.ok) console.error(`[email] ${what} not sent: ${result.error}`);
  return result.ok && !result.skipped;
}

/** RFC 8058 one-click: the mail app POSTs to the link itself, which acts without a confirmation page. */
const unsubscribeHeaders = (url: string) => ({ "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });

/**
 * "Your gift is still waiting", for a checkout that expired unpaid. Call it only when the Stripe
 * session's consent.promotions is "opt_in", and once per session. It is the one optional email, so
 * it checks the opt-out list first and carries a way out; when either can't be done it isn't sent.
 */
export async function sendCheckoutRecovery({ to, locale, url, templateSlug }: { to: string; locale: L; url: string; templateSlug?: string }): Promise<boolean> {
  return safely("checkout recovery", async () => {
    const admin = getSupabaseAdminClient();
    const secret = linkSecret();
    if (!admin || !secret || !/^https:\/\//.test(url)) return false;
    const key = await emailKey(to);
    if (await optedOut(admin, key)) return false;
    const unsubscribeUrl = `${siteUrl()}/api/email/unsubscribe?t=${await signToken("email-optout", key, secret)}&l=${locale}`;
    const templateName = templateSlug ? getManifest(templateSlug)?.name[locale] : undefined;
    return deliver("checkout recovery", {
      to,
      subject: recoveryHeading(locale, Boolean(templateName)).replace(/\.$/, ""),
      react: CheckoutRecoveryEmail({ locale, url, templateName, unsubscribeUrl }),
      headers: unsubscribeHeaders(unsubscribeUrl),
    });
  });
}

/**
 * Right after the pass is paid: until when, and the invite link for the partner. `endsAt` is ISO.
 * `partnerJoined` (a renewal, whose partner carries over) leaves the "send them this link" part out.
 */
export async function sendPassWelcome({ to, locale, inviteUrl, endsAt, partnerJoined = false }: { to: string; locale: L; inviteUrl: string; endsAt: string; partnerJoined?: boolean }): Promise<boolean> {
  return safely("pass welcome", async () =>
    deliver("pass welcome", {
      to,
      subject: locale === "es" ? "Ethos for Two: todo desbloqueado para dos" : "Ethos for Two: everything unlocked for two",
      react: PassWelcomeEmail({ locale, inviteUrl, endsAt: emailDate(endsAt, locale), makeUrl: pageUrl(locale, "/templates"), partnerJoined }),
    }),
  );
}

/** Fourteen days before the pass ends. Nothing renews by itself; `renewUrl` is the one tap. */
export async function sendPassRenewalReminder({ to, locale, endsAt, renewUrl }: { to: string; locale: L; endsAt: string; renewUrl: string }): Promise<boolean> {
  return safely("pass renewal", async () => {
    const date = emailDate(endsAt, locale);
    return deliver("pass renewal", {
      to,
      subject: locale === "es" ? `Ethos for Two termina el ${date}` : `Ethos for Two ends on ${date}`,
      react: PassRenewalEmail({ locale, endsAt: date, renewUrl }),
    });
  });
}

/** To the buyer of a "Give Everything" card, who passes the code on. */
export async function sendGiftCardEmail({ to, locale, code, redeemUrl, recipientName, note }: { to: string; locale: L; code: string; redeemUrl: string; recipientName?: string; note?: string }): Promise<boolean> {
  return safely("gift card", async () => {
    const name = recipientName?.trim();
    return deliver("gift card", {
      to,
      subject: name ? (locale === "es" ? `Tu tarjeta regalo para ${name}` : `Your gift card for ${name}`) : locale === "es" ? "Tu tarjeta regalo de Ethos" : "Your Ethos gift card",
      react: GiftCardEmail({ locale, code, redeemUrl, recipientName: name, note }),
    });
  });
}

/** "Remind me next year", a year on. `date` is already formatted; `removeUrl` is a signed link (api/reminders/remove). */
export async function sendReminderEmail({ to, locale, recipientName, occasion, date, makeUrl, removeUrl }: { to: string; locale: L; recipientName: string; occasion: ReminderOccasion; date: string; makeUrl: string; removeUrl: string }): Promise<boolean> {
  return safely("reminder", async () =>
    deliver("reminder", {
      to,
      subject: reminderHeading(occasion, locale, recipientName, date).replace(/\.$/, ""),
      react: ReminderEmail({ locale, recipientName, occasion, date, makeUrl, removeUrl }),
      headers: unsubscribeHeaders(removeUrl),
    }),
  );
}
