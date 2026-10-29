import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { SITE } from "@/config/site";
import { isConfigured } from "@/lib/env";
import { emailKey, linkSecret, signToken } from "@/lib/lifecycle/links";
import type { ReminderOccasion } from "@/lib/lifecycle/reminders";
import { getManifest } from "@/templates/manifests";
import type { TemplateManifest } from "@/templates/types";
import { suggestTemplate, suggestionPath } from "@/lib/lifecycle/suggest";
import { optedOut } from "./optouts";
import { isUndeliverable, sendEmail } from "./send";
import { pageUrl, siteUrl } from "./urls";
import { GiftOpenedEmail, GiftPublishedEmail, GiftUnlockedEmail, ReactionEmail, ReceiptEmail, WelcomeEmail, type NextIdea } from "@/emails/templates";
import {
  CheckoutRecoveryEmail,
  GiftCardEmail,
  MonthsaryCheckInEmail,
  MonthsaryReminderEmail,
  PassRenewalEmail,
  PassWelcomeEmail,
  PublishReminderEmail,
  ReminderEmail,
  monthsaryCheckInHeading,
  monthsaryHeading,
  publishReminderSubject,
  recoveryHeading,
  reminderHeading,
  type EmailIdea,
} from "@/emails/lifecycle";
import { MembershipEndedEmail, MembershipPaymentEmail, MembershipRenewalEmail, MembershipWelcomeEmail, membershipSubject } from "@/emails/membership";
import { KeepConfirmEmail, KeepLinkEmail, keepConfirmSubject, keepLinkSubject, type KeptDay } from "@/emails/keep";
import { accountUrl, pricingUrl } from "@/lib/commerce/db";
import type { Pass } from "@/lib/commerce/passes";
import { formatAmount, membershipAmount, type Currency, type MembershipPlan } from "@/lib/pricing/products";

type L = "en" | "es";

async function ownerOf(giftId: string): Promise<{ email: string; locale: L; recipientName: string; shortId: string; templateSlug: string } | null> {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;
  const { data: gift } = await admin.from("gifts").select("user_id, locale, short_id, data, template_slug").eq("id", giftId).single();
  if (!gift) return null;
  const { data: profile } = await admin.from("profiles").select("email, locale").eq("id", gift.user_id).single();
  if (!profile?.email) return null;
  const data = gift.data as { recipientName?: string } | null;
  return { email: profile.email, locale: (profile.locale === "es" ? "es" : "en") as L, recipientName: data?.recipientName ?? "", shortId: gift.short_id, templateSlug: gift.template_slug };
}

/** A suggested template as an email shows it: in the reader's language, its editor (with where the click came from) and its poster. */
export function emailIdea(manifest: TemplateManifest, locale: L, ref: string): EmailIdea {
  return { name: manifest.name[locale], tagline: manifest.tagline[locale], url: pageUrl(locale, suggestionPath(manifest.slug, ref)), poster: `${siteUrl()}${manifest.thumbnail.poster}` };
}

/**
 * "Whose day is next?" under the news that a gift was opened or answered: a template other than the
 * one just sent, named and linked (`ref` says which email). Nothing for an address on the
 * unsubscribe list, or when the list can't be read.
 */
async function nextIdea(admin: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, owner: { email: string; locale: L; templateSlug: string }, ref: string): Promise<NextIdea | undefined> {
  if (await optedOut(admin, await emailKey(owner.email))) return undefined;
  const idea = suggestTemplate("next", { avoid: owner.templateSlug });
  return { name: idea.name[owner.locale], url: pageUrl(owner.locale, suggestionPath(idea.slug, ref)) };
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
  return sendEmail({
    to: owner.email,
    subject: owner.locale === "es" ? `${owner.recipientName} ha abierto tu regalo` : `${owner.recipientName} opened your gift`,
    react: GiftOpenedEmail({ locale: owner.locale, recipientName: owner.recipientName, dashboardUrl: `${siteUrl()}/dashboard/gift/${giftId}`, next: await nextIdea(admin, owner, "email-opened") }),
  });
}

/** `sharedId`: the reaction its writer agreed Ethos may show, which the sender can keep private from here. */
export async function notifyReaction(giftId: string, emoji: string, text: string | null, hasAudio: boolean, sharedId: string | null = null) {
  const admin = getSupabaseAdminClient();
  const owner = await ownerOf(giftId);
  if (!admin || !owner) return;
  const secret = sharedId ? linkSecret() : null;
  const privateUrl = sharedId && secret ? `${siteUrl()}/api/reactions/private?t=${await signToken("reaction-private", sharedId, secret)}&l=${owner.locale}` : undefined;
  return sendEmail({
    to: owner.email,
    subject: `${emoji} ${owner.locale === "es" ? `${owner.recipientName} te ha enviado una reacción` : `${owner.recipientName} sent you a reaction`}`,
    react: ReactionEmail({
      locale: owner.locale,
      recipientName: owner.recipientName,
      emoji,
      text,
      hasAudio,
      dashboardUrl: `${siteUrl()}/dashboard/gift/${giftId}`,
      next: await nextIdea(admin, owner, "email-reaction"),
      privateUrl,
    }),
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

/**
 * Whether the email went. One to an address that can never receive mail (a test account, send.ts)
 * counts as gone: nothing will ever deliver it, and a claim released for it would be sent again on
 * every retry of the event, so a once-only email could never be seen being once-only on a test account.
 */
async function deliver(what: string, message: Parameters<typeof sendEmail>[0]): Promise<boolean> {
  const result = await sendEmail(message);
  if (!result.ok) console.error(`[email] ${what} not sent: ${result.error}`);
  return result.ok && (!result.skipped || isUndeliverable(message.to));
}

/** RFC 8058 one-click: the mail app POSTs to the link itself, which acts without a confirmation page. */
const unsubscribeHeaders = (url: string) => ({ "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });

/**
 * "Your gift is still waiting", for a checkout that expired unpaid. Call it only for a buyer who
 * asked for it (Stripe's marketing box: lib/stripe/recovery.ts),
 * and once per session. It is the one optional email, so it checks the opt-out list first and
 * carries a way out; when either can't be done it isn't sent.
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
 * "One step left": a gift paid for and still not published (lib/commerce/publish-reminders.ts). Once
 * per purchase on Resend's side too, for a day, which outlasts the job's window: two runs, or a claim
 * the limiter couldn't keep, can't send it twice.
 */
export async function sendPublishReminder({ to, locale, url, templateSlug, purchaseId }: { to: string; locale: L; url: string; templateSlug: string; purchaseId: string }): Promise<boolean> {
  return safely("publish reminder", async () => {
    const manifest = getManifest(templateSlug);
    if (!manifest) return false;
    return deliver("publish reminder", {
      to,
      subject: publishReminderSubject(locale),
      react: PublishReminderEmail({ locale, url, template: { name: manifest.name[locale], tagline: manifest.tagline[locale], poster: `${siteUrl()}${manifest.thumbnail.poster}` } }),
      idempotencyKey: `publish-reminder/${purchaseId}`,
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

/**
 * Fourteen days before the pass ends. Nothing renews by itself; `renewUrl` is the one tap. While
 * Ethos for Two is sold as a subscription (`subscriptions`) a pass can't be bought again, so the email
 * offers carrying on monthly or yearly from its end instead.
 */
export async function sendPassRenewalReminder({ to, locale, endsAt, renewUrl, subscriptions = false }: { to: string; locale: L; endsAt: string; renewUrl: string; subscriptions?: boolean }): Promise<boolean> {
  return safely("pass renewal", async () => {
    const date = emailDate(endsAt, locale);
    return deliver("pass renewal", {
      to,
      subject: locale === "es" ? `Ethos for Two termina el ${date}` : `Ethos for Two ends on ${date}`,
      react: PassRenewalEmail({ locale, endsAt: date, renewUrl, subscriptions }),
    });
  });
}

// Ethos for Two as a subscription (src/emails/membership.tsx). Each goes to the membership's owner, in
// their account's language, and like the others never throws.

async function ownerContact(userId: string): Promise<{ email: string; locale: L } | null> {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("profiles").select("email, locale").eq("id", userId).maybeSingle();
  return data?.email ? { email: data.email, locale: data.locale === "es" ? "es" : "en" } : null;
}

/**
 * The first payment's confirmation: what it covers, the plan and when it renews, how to cancel, the
 * invite link while the partner's place is empty, and the box ticked at checkout, word for word.
 * `renewsOn` is ISO.
 */
export async function sendMembershipWelcome(args: { to: string; locale: L; plan: MembershipPlan; amount: number; currency: Currency; renewsOn: string; inviteUrl?: string; consent: string | null }): Promise<boolean> {
  return safely("membership welcome", async () =>
    deliver("membership welcome", {
      to: args.to,
      subject: membershipSubject.welcome(args.locale),
      react: MembershipWelcomeEmail({
        locale: args.locale,
        plan: args.plan,
        amount: formatAmount(args.amount, args.currency, args.locale),
        renewsOn: emailDate(args.renewsOn, args.locale),
        inviteUrl: args.inviteUrl,
        consent: args.consent,
        datesUrl: pageUrl(args.locale, "/dates"),
      }),
    }),
  );
}

/**
 * A week before a yearly renewal. `price` is what the subscription itself renews at (its own inline
 * price, which a later catalogue change doesn't touch); a switch to monthly waiting shows the monthly
 * price in its currency instead.
 */
export async function sendMembershipRenewalReminder(row: Pass, price?: { amount: number; currency: Currency }): Promise<boolean> {
  return safely("membership renewal", async () => {
    const owner = await ownerContact(row.owner_user_id);
    if (!owner || !row.current_period_end) return false;
    const { amount, currency } = price ?? { amount: membershipAmount("yearly", "eur"), currency: "eur" as Currency };
    const date = emailDate(row.current_period_end, owner.locale);
    return deliver("membership renewal", {
      to: owner.email,
      subject: membershipSubject.renewal(owner.locale, date),
      react: MembershipRenewalEmail({
        locale: owner.locale,
        renewsOn: date,
        amount: formatAmount(amount, currency, owner.locale),
        ...(row.pending_plan === "monthly" ? { monthly: formatAmount(membershipAmount("monthly", currency), currency, owner.locale) } : {}),
        manageUrl: accountUrl(owner.locale),
      }),
    });
  });
}

/** A renewal that didn't go through, once per invoice: update the card, or confirm with the bank at `url`. */
export async function sendMembershipPaymentProblem(row: Pass, args: { kind: "failed" | "action_required"; amount: number; currency: string; url: string | null }): Promise<boolean> {
  return safely("membership payment", async () => {
    const owner = await ownerContact(row.owner_user_id);
    if (!owner) return false;
    const currency = (["eur", "usd", "gbp"].includes(args.currency) ? args.currency : "eur") as Currency;
    return deliver("membership payment", {
      to: owner.email,
      subject: membershipSubject.payment(owner.locale),
      react: MembershipPaymentEmail({
        locale: owner.locale,
        kind: args.kind === "action_required" && args.url ? "action_required" : "failed",
        amount: formatAmount(args.amount, currency, owner.locale),
        until: emailDate(row.ends_at, owner.locale),
        url: args.kind === "action_required" && args.url ? args.url : accountUrl(owner.locale),
      }),
    });
  });
}

/** Stripe or Apple ended a membership that ran out (never after a refund, a dispute or a withdrawal). */
export async function sendMembershipEnded(row: Pass): Promise<boolean> {
  return safely("membership ended", async () => {
    const owner = await ownerContact(row.owner_user_id);
    if (!owner) return false;
    return deliver("membership ended", { to: owner.email, subject: membershipSubject.ended(owner.locale), react: MembershipEndedEmail({ locale: owner.locale, pricingUrl: pricingUrl(owner.locale) }) });
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

/**
 * "Remind me next year", a year on. `date` is already formatted; `removeUrl` is a signed link
 * (api/reminders/remove). One template is suggested for the occasion; `avoid` is the template the
 * reminder was saved with, skipped so the idea is a new one, and never shown.
 */
/** `ref` says which reminders the click came from: a buyer's own (the default), or a kept gift's (lib/keep). */
export async function sendReminderEmail({
  to,
  locale,
  recipientName,
  occasion,
  date,
  avoid,
  removeUrl,
  ref = "email-reminder",
}: {
  to: string;
  locale: L;
  recipientName: string;
  occasion: ReminderOccasion;
  date: string;
  avoid?: string | null;
  removeUrl: string;
  ref?: string;
}): Promise<boolean> {
  return safely("reminder", async () =>
    deliver("reminder", {
      to,
      subject: reminderHeading(occasion, locale, recipientName, date).replace(/\.$/, ""),
      react: ReminderEmail({
        locale,
        recipientName,
        occasion,
        date,
        idea: emailIdea(suggestTemplate(occasion, { avoid }), locale, ref),
        moreUrl: pageUrl(locale, occasion === "other" ? `/templates?ref=${ref}` : `/occasions/${occasion}?ref=${ref}`),
        removeUrl,
      }),
      headers: unsubscribeHeaders(removeUrl),
    }),
  );
}

/**
 * "Keep this gift": the one email a request on the keep page sends, to confirm the address. It names
 * nobody and nothing from the gift; `neverUrl` (api/keep/never) puts the address on the unsubscribe
 * list, which no keep request gets past, and is also the mail app's one-click unsubscribe.
 */
export async function sendKeepConfirm({ to, locale, confirmUrl, neverUrl }: { to: string; locale: L; confirmUrl: string; neverUrl: string }): Promise<boolean> {
  return safely("keep confirm", async () =>
    deliver("keep confirm", { to, subject: keepConfirmSubject(locale), react: KeepConfirmEmail({ locale, confirmUrl, neverUrl }), headers: unsubscribeHeaders(neverUrl) }),
  );
}

/** After the yes: the gift's own link and the days they'll be reminded of; `stopUrl` ends it all. */
export async function sendKeepLink({ to, locale, giftUrl, days, sender = "", stopUrl }: { to: string; locale: L; giftUrl: string; days: KeptDay[]; sender?: string; stopUrl: string }): Promise<boolean> {
  return safely("keep link", async () =>
    deliver("keep link", { to, subject: keepLinkSubject(locale, sender), react: KeepLinkEmail({ locale, giftUrl, days, sender, stopUrl }), headers: unsubscribeHeaders(stopUrl) }),
  );
}

/**
 * The day before a monthsary: the neutral check-in. `date` is the monthsary, formatted; `yesUrl` and
 * `stopUrl` are signed links (api/monthsaries/yes and /stop). The stop link is also the one-click
 * unsubscribe a mail app offers.
 */
export async function sendMonthsaryCheckIn({ to, locale, partnerName, date, yesUrl, stopUrl }: { to: string; locale: L; partnerName: string; date: string; yesUrl: string; stopUrl: string }): Promise<boolean> {
  return safely("monthsary check-in", async () =>
    deliver("monthsary check-in", {
      to,
      subject: monthsaryCheckInHeading(locale, partnerName),
      react: MonthsaryCheckInEmail({ locale, partnerName, date, yesUrl, stopUrl }),
      headers: unsubscribeHeaders(stopUrl),
    }),
  );
}

/** On a monthsary the buyer said yes to: one small template, a different one each month. */
export async function sendMonthsaryReminder({ to, locale, partnerName, months, stopUrl }: { to: string; locale: L; partnerName: string; months: number; stopUrl: string }): Promise<boolean> {
  return safely("monthsary reminder", async () =>
    deliver("monthsary reminder", {
      to,
      subject: monthsaryHeading(locale, partnerName, months),
      react: MonthsaryReminderEmail({ locale, partnerName, months, idea: emailIdea(suggestTemplate("monthsary", { turn: months }), locale, "email-monthsary"), stopUrl }),
      headers: unsubscribeHeaders(stopUrl),
    }),
  );
}
