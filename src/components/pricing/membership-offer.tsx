"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
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
            className={cn("col-start-1 row-start-1 transition-[opacity,translate,visibility] duration-300 ease-(--ease-out-quint)", on ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible translate-y-1.5 opacity-0")}
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
        <span className="text-[15px] text-cream/75">{t(p === "monthly" ? "unitMonth" : p === "yearly" ? "unitYear" : "unitPass")}</span>
      </p>
      <p className="mt-2 text-[14px] font-medium text-cream/85">
        {p === "yearly"
          ? t("yearlyNote", { price: money(yearlyPerMonth(currency)), pct: yearlySavingPct(currency) })
          : p === "monthly"
            ? t("monthlyNote")
            : t("passNote")}
      </p>
    </>
  );

  const terms = (p: MembershipPlan | "pass") => (
    <p className="text-sm leading-snug text-cream/70">
      {p === "pass" ? t("passTerms") : t(p === "monthly" ? "termsMonthly" : "termsYearly", { price: money(membershipAmount(p, currency)) })}
    </p>
  );

  const member = state.kind === "member" || state.kind === "partner";

  // A member isn't sold what they have: no plans, no price, no button. What they have, until when,
  // and the one place to change it; a payment to fix leads, in gold, since that is the thing to do.
  if (member) {
    const fix = state.kind === "member" && state.needsPayment;
    return (
      <div
        ref={ref}
        data-testid="membership-offer"
        className={cn("relative rounded-[28px] bg-cream/[0.06] p-5 ring-1 ring-starlight/40 backdrop-blur-[2px] sm:p-7", highlight && "shadow-starlight-halo ring-2 ring-starlight/70")}
      >
        <div data-testid="membership-member" data-state={state.kind === "member" ? state.line : state.kind}>
          <SealMark className="size-9" />
          <p className="mt-4 font-display text-[1.75rem] leading-tight text-cream sm:text-[2rem]">{state.kind === "partner" ? tMember("partnerIn") : tMember("title")}</p>
          {state.kind === "member" ? (
            // A payment to fix reads as one, in the horizon's warm colour, wherever it is fixed (a card here, Settings for Apple).
            <p className={cn("mt-2 flex items-start gap-2 text-[15px] leading-snug", fix ? "font-medium text-starlight" : "text-cream/75")} data-testid="membership-member-line">
              {fix ? <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : null}
              <span>{state.date ? tMember(state.line, { date: longDate(state.date) }) : tMember(state.line)}</span>
            </p>
          ) : null}
          <Link
            href="/account#for-two"
            className={cn(
              "mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold",
              // Apple's billing is fixed in iOS: the account page says how, so it stays "Manage".
              fix && state.line !== "appStoreBilling" ? "w-full bg-cream text-forest hover:bg-paper sm:w-auto" : "border border-cream/30 text-cream hover:bg-cream/10",
            )}
          >
            {fix && state.line !== "appStoreBilling" ? tMember("fix") : tMember("manage")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      data-testid="membership-offer"
      className={cn(
        "relative rounded-[28px] bg-cream/[0.06] p-4 ring-1 ring-cream/12 backdrop-blur-[2px] sm:p-6",
        highlight && "shadow-starlight-halo ring-2 ring-starlight/70",
      )}
    >
      {subscriptions ? <PlanToggle plan={plan} onChange={setPlan} currency={currency} className="mt-2" /> : null}

      <div className={cn(subscriptions ? "mt-6" : "mt-1", "px-1")}>
        {subscriptions ? <Swap shown={plan} items={PLANS.map((p) => ({ key: p, node: priceLine(p) }))} /> : priceLine("pass")}
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={buy}
          disabled={busy}
          data-testid="buy-membership"
          className={cn("inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-cream px-7 text-[16px] font-semibold text-forest shadow-[0_18px_50px_-18px_rgba(0,0,0,0.7)] transition-[background-color,translate,scale] duration-200 hover:bg-paper focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-cream active:scale-[0.98] disabled:pointer-events-none disabled:opacity-70 pointer-fine:hover:-translate-y-px", busy && "opacity-80")}
        >
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          {state.kind === "renew" ? t("renewCta") : subscriptions ? t("cta") : t("passCta")}
          {busy ? null : <ArrowRight aria-hidden="true" className="size-4" />}
        </button>
        <div className="mt-3 px-1">
          {state.kind === "renew" ? (
            <p className="text-sm leading-snug text-cream/70">{t("renewNote")}</p>
          ) : subscriptions ? (
            <Swap shown={plan} items={PLANS.map((p) => ({ key: p, node: terms(p) }))} />
          ) : (
            terms("pass")
          )}
        </div>
      </div>

    </div>
  );
}
