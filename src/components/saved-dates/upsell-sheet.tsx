"use client";

import { useEffect } from "react";
import { ArrowRight, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import { FREE_SAVED_DATES, formatAmount, membershipAmount, type Currency } from "@/lib/pricing/products";
import type { UpsellReason } from "@/lib/saved-dates/types";
import { Cutout } from "@/components/marketing/home/cutouts";
import { BottomSheet } from "./bottom-sheet";

/**
 * What Ethos for Two would add, at the moment somebody reaches for it: the free saves are used, a
 * date is read-only, or a members' button was pressed (Maps, the reminder). A small card in the
 * membership's own night colours with the reason and both prices; it sells nothing itself. The
 * button goes to /pricing, where the plans, the terms and the checkout are.
 */
export function SavedDatesUpsell({ open, onOpenChange, reason, monthly, currency }: { open: boolean; onOpenChange: (open: boolean) => void; reason: UpsellReason; monthly: boolean; currency: Currency }) {
  const t = useTranslations("savedDates.upsell");
  const tc = useTranslations("common");
  const locale = useLocale();
  const price = (plan: "monthly" | "yearly") => formatAmount(membershipAmount(plan, currency), currency, locale);
  // A way back to the dates for the two reasons that are about them; the others just close.
  const manage = reason === "limit" || reason === "read_only";

  useEffect(() => {
    if (open) track("saved_date_upsell", { reason });
  }, [open, reason]);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      tone="dusk"
      closeLabel={tc("close")}
      testId="saved-dates-upsell"
      eyebrow={
        <p className="flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.22em] text-starlight uppercase">
          <Star aria-hidden="true" className="size-3.5 fill-current" />
          {t("eyebrow")}
        </p>
      }
      title={<span className="mt-2 block">{t(`${reason}.title`, { limit: FREE_SAVED_DATES })}</span>}
      description={t(`${reason}.body`, { limit: FREE_SAVED_DATES })}
    >
      <Cutout id="star-felt" className="pointer-events-none absolute top-10 right-5 w-11 rotate-12 opacity-90 drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)] sm:top-14 sm:right-8" />
      <div className="mt-6 rounded-[22px] bg-dusk-raised/80 p-4 ring-1 ring-white/10">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 font-display text-[22px] leading-tight text-cream">
          {monthly ? (
            <>
              <span>{t("perMonth", { price: price("monthly") })}</span>
              <span className="text-[15px] text-moonlight/70">{t("or")}</span>
              <span>{t("perYear", { price: price("yearly") })}</span>
            </>
          ) : (
            <span>{t("forYear", { price: price("yearly") })}</span>
          )}
        </p>
        <p className="mt-1 text-[13.5px] text-moonlight/75">{t("forBoth")}</p>
      </div>
      <div className="mt-5 grid gap-2">
        <Link href="/pricing?from=saved-dates#for-two" onClick={() => onOpenChange(false)} className="btn-star inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold">
          {t("cta")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
        {manage ? (
          <Link href="/my-dates" onClick={() => onOpenChange(false)} className="inline-flex h-12 items-center justify-center rounded-full text-[15px] font-semibold text-moonlight transition-colors hover:bg-white/10 hover:text-cream">
            {t("manage")}
          </Link>
        ) : (
          <button type="button" onClick={() => onOpenChange(false)} className="inline-flex h-12 items-center justify-center rounded-full text-[15px] font-semibold text-moonlight transition-colors hover:bg-white/10 hover:text-cream">
            {t("notNow")}
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
