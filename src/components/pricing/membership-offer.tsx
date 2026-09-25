"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, CalendarCheck, CreditCard, Loader2, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { track } from "@/lib/analytics/track";
import { formatAmount, membershipAmount, yearlyPerMonth, yearlySavingPct, type Currency, type MembershipPlan } from "@/lib/pricing/products";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { startCheckout, useCheckoutError } from "./checkout";
import { useEntitlements } from "./entitlements";
import { heroMemberState, membershipRequest } from "./offers";
import { PlanToggle } from "./plan-toggle";
import { SealMark } from "./seal-mark";

const PLANS: MembershipPlan[] = ["monthly", "yearly"];

/**
 * Two versions of one line, laid in the same grid cell so the taller one holds the room: switching
 * plans crossfades them in place (a short fade and rise; reduced motion makes it instant) and
 * nothing under them moves. The one not shown is inert, so it is never read or tabbed to.
 */
function Swap({ shown, items, className }: { shown: string; items: { key: string; node: ReactNode }[]; className?: string }) {
  return (
    <div className={cn("grid", className)}>
      {items.map(({ key, node }) => {
        const on = key === shown;
        return (
          <div
            key={key}
            aria-hidden={!on || undefined}
            inert={!on}
            className={cn("col-start-1 row-start-1 transition-[opacity,translate] duration-300 ease-(--ease-out-quint)", on ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1.5 opacity-0")}
          >
            {node}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The buying half of the pricing hero: the plan, the price, the one button and, under it, exactly
 * what happens (the price today, when it renews, how to stop). While subscriptions are off it sells
 * the one-time year the same way, with no toggle. A signed-in member sees what they have instead of
 * a button, and a pass owner near the end of their year the renewal.
 */
export function MembershipOffer({
  currency,
  paymentsEnabled,
  subscriptions,
  initialPlan,
  highlight,
  renewAsked,
}: {
  currency: Currency;
  paymentsEnabled: boolean;
  subscriptions: boolean;
  initialPlan: MembershipPlan;
  /** Arrived for this (?from=, ?plan=, ?renew=pass): brought into view and picked out. */
  highlight: boolean;
  renewAsked: boolean;
}) {
  const t = useTranslations("membership.hero");
  const tMember = useTranslations("membership.member");
  const tPricing = useTranslations("pricing");
  const locale = useLocale() === "es" ? "es" : "en";
  const [plan, setPlan] = useState<MembershipPlan>(subscriptions ? initialPlan : "yearly");
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const showCheckoutError = useCheckoutError();
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useEntitlements(0, paymentsEnabled);
  const state = heroMemberState(data?.membership ?? null, { subscriptions, renewAsked, now });
  const money = (minor: number) => formatAmount(minor, currency, locale);
  const longDate = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(iso));

  useEffect(() => {
    // The hero is the top of the page; on a phone its offer is a screen further down.
    if (highlight) ref.current?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [highlight]);

  const buy = async () => {
    if (!paymentsEnabled) return void toast(tPricing("comingSoon"));
    const chosen = subscriptions ? plan : "yearly";
    setBusy(true);
    track("pay_clicked", { product: "membership", plan: chosen, source: "pricing", renew: state.kind === "renew" });
    const result = await startCheckout({ ...membershipRequest(chosen), currency, locale, returnTo: "/account" });
    if ("url" in result) return void window.location.assign(result.url);
    setBusy(false);
    showCheckoutError(result.error);
  };

  const priceLine = (p: MembershipPlan | "pass") => (
    <>
      <p className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span className="font-display text-[clamp(3rem,13vw,3.75rem)] leading-none tracking-tight text-cream">{money(membershipAmount(p === "pass" ? "yearly" : p, currency))}</span>
        <span className="text-[15px] text-moonlight/80">{t(p === "monthly" ? "unitMonth" : p === "yearly" ? "unitYear" : "unitPass")}</span>
      </p>
      <p className="mt-2 text-[14px] font-medium text-horizon">
        {p === "yearly"
          ? t("yearlyNote", { price: money(yearlyPerMonth(currency)), pct: yearlySavingPct(currency) })
          : p === "monthly"
            ? t("monthlyNote")
            : t("passNote")}
      </p>
    </>
  );

  const terms = (p: MembershipPlan | "pass") => (
    <p className="text-[13px] leading-snug text-moonlight/70">
      {p === "pass" ? t("passTerms") : t(p === "monthly" ? "termsMonthly" : "termsYearly", { price: money(membershipAmount(p, currency)) })}
    </p>
  );

  const member = state.kind === "member" || state.kind === "partner";

  return (
    <div
      ref={ref}
      data-testid="membership-offer"
      className={cn(
        "relative rounded-[28px] bg-white/[0.06] p-4 ring-1 ring-white/12 backdrop-blur-[2px] sm:p-6",
        highlight && "shadow-starlight-halo ring-2 ring-starlight/70",
      )}
    >
      {subscriptions ? <PlanToggle plan={plan} onChange={setPlan} currency={currency} className="mt-2" /> : null}

      <div className={cn(subscriptions ? "mt-6" : "mt-1", "px-1")}>
        {subscriptions ? <Swap shown={plan} items={PLANS.map((p) => ({ key: p, node: priceLine(p) }))} /> : priceLine("pass")}
        <p className="mt-3 flex items-center gap-2.5 text-[14px] text-moonlight/85">
          <span aria-hidden="true" className="flex -space-x-1.5">
            <span className="grid size-6 place-items-center rounded-full bg-horizon text-[11px] font-bold text-dusk-deep ring-2 ring-dusk">A</span>
            <span className="grid size-6 place-items-center rounded-full bg-starlight text-[11px] font-bold text-dusk-deep ring-2 ring-dusk">S</span>
          </span>
          {subscriptions ? t("coversCancel") : t("covers")}
        </p>
      </div>

      <div className="mt-6">
        {member ? (
          <div className="rounded-[20px] bg-dusk-deep/70 p-4 ring-1 ring-starlight/60 sm:p-5" data-testid="membership-member" data-state={state.kind === "member" ? state.line : state.kind}>
            <p className="flex items-center gap-2.5 text-[15px] font-semibold text-cream">
              <SealMark className="size-6" />
              {state.kind === "partner" ? tMember("partnerIn") : tMember("title")}
            </p>
            {state.kind === "member" ? (
              // A payment to fix reads as one, in the horizon's warm colour, wherever it is fixed (a card here, Settings for Apple).
              <p className={cn("mt-1.5 flex items-start gap-1.5 pl-[34px] text-[14px]", state.needsPayment ? "font-medium text-horizon" : "text-moonlight/80")} data-testid="membership-member-line">
                {state.needsPayment ? <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" /> : null}
                <span>{state.date ? tMember(state.line, { date: longDate(state.date) }) : tMember(state.line)}</span>
              </p>
            ) : null}
            <Link href="/account#for-two" className="mt-3 ml-[34px] inline-flex min-h-11 items-center gap-1.5 text-[14.5px] font-semibold text-starlight underline-offset-4 hover:underline">
              {state.kind === "member" && state.needsPayment && state.line !== "appStoreBilling" ? tMember("fix") : tMember("manage")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={buy}
              disabled={busy}
              data-testid="buy-membership"
              className={cn("btn-star inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-7 text-[16px] font-semibold", busy && "opacity-80")}
            >
              {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
              {state.kind === "renew" ? t("renewCta") : subscriptions ? t("cta") : t("passCta")}
              {busy ? null : <ArrowRight aria-hidden="true" className="size-4" />}
            </button>
            <div className="mt-3 px-1">
              {state.kind === "renew" ? (
                <p className="text-[13px] leading-snug text-moonlight/70">{t("renewNote")}</p>
              ) : subscriptions ? (
                <Swap shown={plan} items={PLANS.map((p) => ({ key: p, node: terms(p) }))} />
              ) : (
                terms("pass")
              )}
            </div>
          </>
        )}
      </div>

      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-white/10 px-1 pt-4 text-[12.5px] text-moonlight/70">
        <li className="flex items-center gap-1.5">
          <Lock aria-hidden="true" className="size-3.5 text-starlight/80" />
          {t("trust.stripe")}
        </li>
        <li className="flex items-center gap-1.5">
          <CreditCard aria-hidden="true" className="size-3.5 text-starlight/80" />
          {t("trust.wallets")}
        </li>
        <li className="flex items-center gap-1.5">
          <CalendarCheck aria-hidden="true" className="size-3.5 text-starlight/80" />
          {subscriptions ? t("trust.cancel") : t("trust.once")}
        </li>
      </ul>
    </div>
  );
}
