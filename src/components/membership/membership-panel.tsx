"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, CreditCard, Loader2, RefreshCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import type { MembershipAction, MembershipSummary, PortalFlow } from "@/lib/membership/types";
import { formatAmount, membershipAmount, yearlySavingPct, type Currency } from "@/lib/pricing/products";
import { useInApp } from "@/lib/app/use-bridge";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { InviteLink } from "@/components/pricing/invite-link";
import { PASS_RENEW_WITHIN_DAYS } from "@/components/pricing/offers";
import { SealMark } from "@/components/pricing/seal-mark";
import { membershipErrorKey, openPortal, postMembership } from "./actions";
import { ConfirmDialog, YearlyDialog } from "./membership-dialogs";

type DialogKind = "cancel" | "yearly" | "monthly" | "leave" | "remove";
const DAY = 86_400_000;

/**
 * Ethos for Two on the account page (docs/MEMBERSHIP.md 4.2): what they have and until when, their
 * partner, and every change they can make: billing, the plan, cancelling (as easy as subscribing:
 * one button, one confirm), leaving or removing a partner. Each change asks first, says exactly what
 * happens, and the summary the server answers with replaces this one, so the section is never behind.
 * Inside the iPhone app nothing here sells or bills: that's the App Store's.
 */
export function MembershipPanel({ membership: initial, currency, subscriptions }: { membership: MembershipSummary | null; currency: Currency; subscriptions: boolean }) {
  const t = useTranslations("membership.account");
  const locale = useLocale() === "es" ? "es" : "en";
  const router = useRouter();
  const inApp = useInApp();
  const [membership, setMembership] = useState(initial);
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [busy, setBusy] = useState<MembershipAction | PortalFlow | null>(null);
  const [dialogError, setDialogError] = useState<ReactNode>(null);
  const [now] = useState(() => Date.now());
  const money = (minor: number) => formatAmount(minor, currency, locale);
  const longDate = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(iso));

  const open = (kind: DialogKind | null) => {
    setDialogError(null);
    setDialog(kind);
  };

  const portal = async (flow: PortalFlow) => {
    setBusy(flow);
    const answer = await openPortal(flow, locale);
    if ("url" in answer) return void window.location.assign(answer.url);
    setBusy(null);
    toast.error(t(`errors.${membershipErrorKey(answer.error, answer.reason)}`));
  };

  const act = async (action: MembershipAction, done?: string) => {
    setBusy(action);
    setDialogError(null);
    const answer = await postMembership(action, locale);
    setBusy(null);
    if (answer.ok) {
      if ("membership" in answer) setMembership(answer.membership);
      setDialog(null);
      if (done) toast.success(done);
      // The purchases, unlocks and packs above and below come from the server.
      router.refresh();
      return;
    }
    // The bank wants to confirm the switch's payment: its own page, then back here.
    if (answer.error === "requires_action" && answer.url) {
      toast(t("errors.requiresAction"));
      return void window.location.assign(answer.url);
    }
    const key = membershipErrorKey(answer.error, answer.reason);
    if (key === "paymentFailed") {
      setDialogError(
        <>
          {t("errors.paymentFailed")}{" "}
          <button type="button" onClick={() => void portal("update_card")} className="font-semibold underline underline-offset-4">
            {t("updateCard")}
          </button>
        </>,
      );
      return;
    }
    setDialog(null);
    toast.error(t(`errors.${key}`));
  };

  if (!membership) return <JoinCard currency={currency} subscriptions={subscriptions} />;

  const owner = membership.isOwner;
  const stripe = membership.provider === "stripe_subscription";
  const pass = membership.provider === "stripe_pass" || membership.provider === "app_store_pass";
  const pastDue = membership.status === "past_due" || (stripe && !membership.running);
  const endsAt = membership.endsAt ?? membership.periodEnd;
  const daysLeft = Math.max(0, Math.ceil((Date.parse(endsAt) - now) / DAY));
  const partnerName = membership.partner?.name ?? null;

  const status = (() => {
    if (!owner) return partnerName ? t("partnerOf", { name: partnerName }) : t("partnerOfNoName");
    if (membership.provider === "app_store") return t(membership.renews ? "appStore" : "appStoreEnds", { date: longDate(membership.renews ? membership.periodEnd : endsAt) });
    if (pass) return t("pass", { date: longDate(endsAt) });
    const price = money(membershipAmount(membership.plan, currency));
    // A renewal that didn't go through hasn't renewed anything: the plan, and the warning below says the rest.
    if (pastDue) return t(membership.plan === "monthly" ? "monthlyPlan" : "yearlyPlan", { price });
    if (!membership.renews) return t("ending", { date: longDate(endsAt) });
    return t(membership.plan, { price, date: longDate(membership.periodEnd) });
  })();

  const busyIcon = (key: MembershipAction | PortalFlow) => (busy === key ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null);
  const quiet = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[14.5px] font-semibold transition-colors disabled:opacity-60";

  // #for-two is where the emails and Stripe's billing page send people back: clear of the phone's sticky bar.
  return (
    <section id="for-two" data-testid="account-membership" className="relative mt-6 scroll-mt-20 overflow-hidden rounded-[24px] bg-dusk-sky p-6 text-cream ring-1 ring-starlight/25 sm:p-7">
      <div aria-hidden="true" className="dusk-stars absolute inset-0 opacity-60 [mask-image:linear-gradient(90deg,transparent_45%,#000_85%)]" />
      <div className="relative">
        <p className="flex items-center gap-2.5 text-eyebrow text-starlight">
          <SealMark className="size-6" />
          {t("title")}
        </p>
        <p className="mt-3 font-display text-[1.45rem] leading-snug text-cream sm:text-[1.65rem]" data-testid="membership-status" data-app-hide={owner && stripe ? true : undefined}>
          {status}
        </p>
        {!owner ? <p className="mt-1 text-[14.5px] text-moonlight/75">{membership.renews ? t("partnerRenews") : t("partnerUntil", { date: longDate(endsAt) })}</p> : null}
        {owner && membership.provider === "app_store" ? <p className="mt-1.5 text-[14.5px] text-moonlight/75">{t("appStoreManage")}</p> : null}
        {owner && stripe && inApp ? <p className="mt-2 text-[14.5px] text-moonlight/80">{t("inApp")}</p> : null}

        {owner && stripe && membership.pendingPlan === "monthly" && !pastDue ? (
          <Row>
            <p className="min-w-0 flex-1 text-[14.5px] text-moonlight/85">{t("switching", { date: longDate(membership.periodEnd) })}</p>
            <button type="button" onClick={() => void act("keep_plan", t("done.keepPlan"))} disabled={busy !== null} className={cn(quiet, "border border-white/25 text-cream hover:bg-white/10")} data-app-hide>
              {busyIcon("keep_plan")}
              {t("keepYearly")}
            </button>
          </Row>
        ) : null}

        {owner && stripe && !membership.renews && !pastDue ? (
          <Row>
            <RefreshCcw aria-hidden="true" className="size-4 shrink-0 text-starlight" />
            {/* The status above already says when it ends: this is the way back. */}
            <p className="min-w-0 flex-1 text-[14.5px] text-moonlight/85">{t("resumeHint")}</p>
            <button type="button" onClick={() => void act("resume", t("done.resume"))} disabled={busy !== null} className={cn(quiet, "btn-star")} data-app-hide data-testid="membership-resume">
              {busyIcon("resume")}
              {t("resume")}
            </button>
          </Row>
        ) : null}

        {owner && stripe && pastDue ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-horizon/15 p-4 ring-1 ring-horizon/40" role="status" data-testid="membership-past-due">
            <AlertTriangle aria-hidden="true" className="size-5 shrink-0 text-horizon" />
            <p className="min-w-0 flex-1 basis-56 text-[14.5px] leading-snug text-cream">{membership.running ? t("pastDue", { date: longDate(endsAt) }) : t("paused")}</p>
            <button type="button" onClick={() => void portal("update_card")} disabled={busy !== null} className={cn(quiet, "btn-star")} data-app-hide>
              {busyIcon("update_card")}
              <CreditCard aria-hidden="true" className="size-4" />
              {t("updateCard")}
            </button>
          </div>
        ) : null}

        {owner && pass && daysLeft <= PASS_RENEW_WITHIN_DAYS && membership.provider === "stripe_pass" ? (
          <Row>
            <p className="min-w-0 flex-1 basis-56 text-[14.5px] text-moonlight/85">
              {subscriptions ? t("passCarryOn", { days: daysLeft, date: longDate(endsAt) }) : t("passEnding", { days: daysLeft })}
            </p>
            <Link href={subscriptions ? "/pricing#for-two" : "/pricing?renew=pass#for-two"} className={cn(quiet, "btn-star")} data-app-hide>
              {subscriptions ? t("seePlans") : t("passRenew", { price: money(membershipAmount("yearly", currency)) })}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Row>
        ) : null}

        {owner ? (
          <div className="mt-6 border-t border-white/10 pt-5">
            {membership.partnerJoined ? (
              <div className="flex flex-wrap items-center gap-3">
                <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-starlight font-display text-[18px] text-dusk-deep">
                  {membership.partner?.initial ?? "?"}
                </span>
                <p className="min-w-0 flex-1 text-[15px] text-cream">{partnerName ? t("joined", { name: partnerName }) : t("joinedNoName")}</p>
                <button type="button" onClick={() => open("remove")} disabled={busy !== null} className={cn(quiet, "border border-white/25 text-cream hover:bg-white/10")} data-testid="membership-remove">
                  {t("remove")}
                </button>
              </div>
            ) : membership.inviteUrl ? (
              // It says what it is ("Your partner's invite link") and who to send it to.
              <InviteLink url={membership.inviteUrl} tone="dark" className="max-w-md" />
            ) : null}
          </div>
        ) : (
          <div className="mt-5">
            <button type="button" onClick={() => open("leave")} disabled={busy !== null} className={cn(quiet, "border border-white/25 text-cream hover:bg-white/10")} data-testid="membership-leave">
              {t("leave")}
            </button>
          </div>
        )}

        {owner && stripe ? (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-5" data-app-hide>
            <button type="button" onClick={() => void portal("manage")} disabled={busy !== null} className={cn(quiet, "bg-cream text-dusk hover:bg-white")} data-testid="membership-billing">
              {busyIcon("manage")}
              <CreditCard aria-hidden="true" className="size-4" />
              {t("manageBilling")}
            </button>
            {membership.canSwitchToYearly && !pastDue ? (
              <button type="button" onClick={() => open("yearly")} disabled={busy !== null} className={cn(quiet, "border border-starlight/60 text-starlight hover:bg-starlight/10")} data-testid="membership-switch-yearly">
                {t("switchYearly", { pct: yearlySavingPct(currency) })}
              </button>
            ) : null}
            {membership.canSwitchToMonthly && !pastDue ? (
              <button type="button" onClick={() => open("monthly")} disabled={busy !== null} className={cn(quiet, "border border-white/25 text-cream hover:bg-white/10")} data-testid="membership-switch-monthly">
                {t("switchMonthly")}
              </button>
            ) : null}
            {membership.renews || pastDue ? (
              <button type="button" onClick={() => open("cancel")} disabled={busy !== null} className={cn(quiet, "text-moonlight/85 underline-offset-4 hover:text-cream hover:underline")} data-testid="membership-cancel">
                {t("cancel")}
              </button>
            ) : null}
            <p className="w-full pt-1 text-[12.5px] text-moonlight/60">{t("manageBillingBlurb")}</p>
          </div>
        ) : null}
      </div>

      <ConfirmDialog
        open={dialog === "cancel"}
        onOpenChange={(v) => open(v ? "cancel" : null)}
        title={t("dialogs.cancel.title")}
        body={pastDue ? t("dialogs.cancel.bodyNow") : t("dialogs.cancel.body", { date: longDate(membership.periodEnd) })}
        confirm={t("dialogs.cancel.confirm")}
        keep={t("dialogs.cancel.keep")}
        onConfirm={() => void act("cancel", pastDue ? t("done.cancelNow") : t("done.cancel", { date: longDate(membership.periodEnd) }))}
        busy={busy === "cancel"}
        danger
        error={dialogError}
      />
      <YearlyDialog open={dialog === "yearly"} onOpenChange={(v) => open(v ? "yearly" : null)} currency={currency} onConfirm={() => void act("switch_to_yearly", t("done.switchYearly"))} busy={busy === "switch_to_yearly"} error={dialogError} />
      <ConfirmDialog
        open={dialog === "monthly"}
        onOpenChange={(v) => open(v ? "monthly" : null)}
        title={t("dialogs.monthly.title")}
        body={t("dialogs.monthly.body", { date: longDate(membership.periodEnd), monthly: money(membershipAmount("monthly", currency)), yearly: money(membershipAmount("yearly", currency)) })}
        confirm={t("dialogs.monthly.confirm")}
        keep={t("dialogs.monthly.keep")}
        onConfirm={() => void act("switch_to_monthly", t("done.switchMonthly", { date: longDate(membership.periodEnd) }))}
        busy={busy === "switch_to_monthly"}
        error={dialogError}
      />
      <ConfirmDialog
        open={dialog === "leave"}
        onOpenChange={(v) => open(v ? "leave" : null)}
        title={partnerName ? t("dialogs.leave.title", { name: partnerName }) : t("dialogs.leave.titleNoName")}
        body={t("dialogs.leave.body")}
        confirm={t("dialogs.leave.confirm")}
        keep={t("dialogs.leave.keep")}
        onConfirm={() => void act("leave", t("done.leave"))}
        busy={busy === "leave"}
        danger
        error={dialogError}
      />
      <ConfirmDialog
        open={dialog === "remove"}
        onOpenChange={(v) => open(v ? "remove" : null)}
        title={partnerName ? t("dialogs.remove.title", { name: partnerName }) : t("dialogs.remove.titleNoName")}
        body={t("dialogs.remove.body")}
        confirm={t("dialogs.remove.confirm")}
        keep={t("dialogs.remove.keep")}
        onConfirm={() => void act("remove_partner", t("done.removePartner"))}
        busy={busy === "remove_partner"}
        danger
        error={dialogError}
      />
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10">{children}</div>;
}

/** Not a member: what it is and what it costs, and the way to it. Nothing to sell inside the iPhone app. */
function JoinCard({ currency, subscriptions }: { currency: Currency; subscriptions: boolean }) {
  const t = useTranslations("membership.account");
  const locale = useLocale() === "es" ? "es" : "en";
  const money = (minor: number) => formatAmount(minor, currency, locale);
  return (
    <section id="for-two" data-testid="account-membership-none" data-app-hide className="relative mt-6 scroll-mt-20 overflow-hidden rounded-[24px] bg-dusk-sky p-6 text-cream ring-1 ring-starlight/25 sm:p-7">
      <div aria-hidden="true" className="dusk-stars absolute inset-0 opacity-60 [mask-image:linear-gradient(90deg,transparent_50%,#000_90%)]" />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0 flex-1 basis-72">
          <p className="flex items-center gap-2.5 text-eyebrow text-starlight">
            <SealMark className="size-6" />
            {t("title")}
          </p>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-moonlight/85">
            {subscriptions
              ? t("none", { monthly: money(membershipAmount("monthly", currency)), yearly: money(membershipAmount("yearly", currency)) })
              : t("nonePass", { yearly: money(membershipAmount("yearly", currency)) })}
          </p>
        </div>
        <Link href="/pricing?from=account#for-two" className="btn-star inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-6 text-[15px] font-semibold">
          {t("see")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </section>
  );
}
