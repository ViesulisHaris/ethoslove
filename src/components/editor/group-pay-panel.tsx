"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { startCheckout, useCheckoutError } from "@/components/pricing/checkout";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/track";
import { formatAmount, groupAmount, hasUnlock, type Currency } from "@/lib/pricing/products";
import type { TemplateManifest } from "@/templates/types";

/**
 * The pay panel of a group card: shown on the send screen in place of the usual one when the gift
 * carries notes and the account doesn't yet hold group cards for its template (the publish rule's
 * `needs: "group"`). One thing to buy, one price, one button. The price is the catalogue's
 * (groupAmount), the same number the editor showed before the link existed and the one checkout
 * charges: the full price with the template in it, or the difference for someone who has the template.
 * Only ever the sender's: nobody who was invited sees this.
 */
export function GroupPayPanel({
  manifest,
  currency,
  locale,
  ownedRows,
  returnTo,
  paymentsEnabled,
  inApp = false,
}: {
  manifest: TemplateManifest;
  currency: Currency;
  locale: "en" | "es";
  /** The account's unlock rows, as getEntitlement reads them. */
  ownedRows: string[];
  /** Where Stripe sends them back: the editor, with the send screen open. */
  returnTo: string;
  paymentsEnabled: boolean;
  /** Inside the iPhone app nothing is sold outside the App Store: the panel says where to finish. */
  inApp?: boolean;
}) {
  const t = useTranslations("editor.group.pay");
  const showCheckoutError = useCheckoutError();
  const [busy, setBusy] = useState(false);
  const template = manifest.name[locale];
  const stepUp = hasUnlock(ownedRows, manifest.slug);
  const amount = groupAmount(currency, ownedRows, manifest.slug);
  const price = formatAmount(amount, currency, locale);
  const max = manifest.features.group?.max ?? 25;

  useEffect(() => {
    track("group_pay_shown", { template: manifest.slug, stepUp });
  }, [manifest.slug, stepUp]);

  const pay = async () => {
    if (busy) return;
    setBusy(true);
    track("group_pay_tap", { template: manifest.slug, stepUp });
    const result = await startCheckout({ product: "group", templateSlugs: [manifest.slug], currency, returnTo, locale }, { total: amount, category: manifest.tier });
    if ("url" in result) {
      window.location.assign(result.url);
      return;
    }
    setBusy(false);
    showCheckoutError(result.error);
  };

  return (
    <section className="mt-7 rounded-2xl border border-line bg-card p-5" data-testid="group-pay">
      <p className="font-display text-2xl leading-tight text-balance">{t("title")}</p>
      <div className="mt-4 flex items-start justify-between gap-4 border-t border-border pt-4">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-ink">{t("row", { template })}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t("rowBlurb", { max })}</p>
        </div>
        <p className="shrink-0 text-lg font-semibold text-ink" data-testid="group-pay-price">
          {price}
        </p>
      </div>
      <p className="mt-3 flex items-start gap-2 text-sm text-ink-soft" data-testid="group-pay-template">
        <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-moss" />
        <span>{stepUp ? t("owned", { template }) : t("included", { template })}</span>
      </p>
      {inApp ? (
        <p className="mt-5 rounded-xl border border-border bg-paper p-3.5 text-sm text-ink-soft" data-testid="group-pay-in-app">
          {t("inApp")}
        </p>
      ) : paymentsEnabled ? (
        <>
          <Button type="button" className="mt-5 h-12 w-full rounded-full text-base" disabled={busy} onClick={() => void pay()} data-testid="group-pay-button">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            <span>{busy ? t("starting") : t("button", { price })}</span>
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">{t("small")}</p>
        </>
      ) : (
        <p className="mt-5 rounded-xl border border-border bg-paper p-3.5 text-sm text-ink-soft">{t("soon")}</p>
      )}
    </section>
  );
}
