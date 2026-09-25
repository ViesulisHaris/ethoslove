"use client";

import { useRef, type KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatAmount, membershipAmount, yearlySavingPct, type Currency, type MembershipPlan } from "@/lib/pricing/products";
import { cn } from "@/lib/utils";

const PLANS: MembershipPlan[] = ["monthly", "yearly"];

/**
 * Monthly or yearly, as one control: a radio group of two segments of the same size and weight,
 * each saying what it costs, with a cream thumb that slides to the chosen one (transform only, so
 * nothing around it moves). Arrow keys move the choice, as in any radio group; only the chosen
 * segment is in the tab order.
 */
export function PlanToggle({ plan, onChange, currency, className }: { plan: MembershipPlan; onChange: (plan: MembershipPlan) => void; currency: Currency; className?: string }) {
  const t = useTranslations("membership.hero");
  const locale = useLocale() === "es" ? "es" : "en";
  const refs = useRef<Record<MembershipPlan, HTMLButtonElement | null>>({ monthly: null, yearly: null });
  const price = (p: MembershipPlan) => formatAmount(membershipAmount(p, currency), currency, locale);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next =
      event.key === "ArrowLeft" || event.key === "ArrowUp" || event.key === "Home"
        ? "monthly"
        : event.key === "ArrowRight" || event.key === "ArrowDown" || event.key === "End"
          ? "yearly"
          : null;
    if (!next) return;
    event.preventDefault();
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("choose")}
      onKeyDown={onKeyDown}
      data-testid="plan-toggle"
      className={cn("relative grid grid-cols-2 rounded-[22px] bg-white/[0.07] p-1.5 ring-1 ring-white/12", className)}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc(50%-0.375rem)] rounded-[17px] bg-cream shadow-[0_10px_24px_-12px_rgba(6,8,30,0.9)] transition-transform duration-300 ease-(--ease-out-quint)"
        style={{ transform: plan === "yearly" ? "translateX(100%)" : "translateX(0)" }}
      />
      {PLANS.map((p) => {
        const on = plan === p;
        return (
          <button
            key={p}
            ref={(el) => {
              refs.current[p] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(p)}
            data-testid={`plan-${p}`}
            className={cn(
              "relative flex min-h-[60px] flex-col items-center justify-center rounded-[17px] px-2 py-2 text-center transition-colors duration-300 focus-visible:outline-starlight",
              on ? "text-dusk" : "text-moonlight/85 hover:text-cream",
            )}
          >
            <span className="text-[15px] leading-tight font-semibold">{t(p)}</span>
            <span className={cn("mt-0.5 text-[13px] leading-tight", on ? "text-dusk/70" : "text-moonlight/65")}>
              {t(p === "monthly" ? "perMonth" : "perYear", { price: price(p) })}
            </span>
            {p === "yearly" ? (
              <span className="absolute -top-3 right-2 rounded-full bg-starlight px-2 py-0.5 text-[11px] leading-4 font-bold whitespace-nowrap text-dusk-deep shadow-[0_6px_14px_-6px_rgba(245,207,107,0.8)] sm:right-3">
                {t("save", { pct: yearlySavingPct(currency) })}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
