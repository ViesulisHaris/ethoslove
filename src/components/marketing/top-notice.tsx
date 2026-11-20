"use client";

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { personalPriceEnds, usePersonalPrice } from "@/components/pricing/use-personal-price";
import { formatAmount } from "@/lib/pricing/products";
import { useCurrency } from "@/lib/pricing/use-currency";

/**
 * The window in which every page says the Privacy Policy and Terms have changed: two hours from the
 * release that changed them (the owner's choice, 19 Nov 2026; released 20 Nov). Times in UTC.
 */
export const POLICY_NOTICE = { from: Date.parse("2026-11-20T07:30:00Z"), until: Date.parse("2026-11-20T10:00:00Z") };

// The time the page was opened, in the browser only: the built page carries neither notice.
let openedAt: number | null = null;
const never = () => () => {};
const clientTime = () => (openedAt ??= Date.now());
const buildTime = () => null;

/**
 * A small box under the header, on the marketing pages only (never on a gift): a personal price from
 * an offer email while it holds (lib/commerce/personal-price.ts), else, inside POLICY_NOTICE, that
 * the policy changed. Drawn after the page loads, so a cached page never carries either. Closing it
 * hides it until the next page load.
 */
export function TopNotice() {
  const t = useTranslations("notice");
  const locale = useLocale() === "es" ? "es" : "en";
  const currency = useCurrency();
  const { price } = usePersonalPrice();
  const now = useSyncExternalStore(never, clientTime, buildTime);
  const [closed, setClosed] = useState(false);

  if (closed || now === null) return null;
  const policy = now >= POLICY_NOTICE.from && now < POLICY_NOTICE.until;
  if (!price && !policy) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--header-h,76px)+0.25rem)] z-30 flex justify-center px-4" data-testid="top-notice">
      <div role="status" className="pointer-events-auto flex max-w-xl items-center gap-2 rounded-2xl bg-forest py-1.5 pr-1.5 pl-4 text-sm text-cream shadow-lift">
        <p className="min-w-0">
          {price ? t("offer", { price: formatAmount(price.amounts[currency], currency, locale), ends: personalPriceEnds(price.endsAt, locale, currency) }) : t("policy")}{" "}
          <Link href={price ? "/templates" : "/legal/privacy"} className="whitespace-nowrap text-cream underline underline-offset-2">
            {price ? t("offerLink") : t("policyLink")}
          </Link>
        </p>
        <button
          type="button"
          onClick={() => setClosed(true)}
          aria-label={t("close")}
          className="grid size-11 shrink-0 place-items-center rounded-full text-cream/70 transition-colors hover:text-cream"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}
