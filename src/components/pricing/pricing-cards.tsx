"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import type { GiftLocale } from "@/lib/gift/schema";
import { track } from "@/lib/analytics/track";
import {
  PRODUCTS,
  PRODUCT_ORDER,
  formatAmount,
  type Currency,
  type PlanId,
} from "@/lib/pricing/products";
import type { TemplateManifest } from "@/templates/types";
import { cn } from "@/lib/utils";
import { startCheckout, useCheckoutError } from "./checkout";
import { everythingPlan } from "./offers";
import { useUpgradeQuote } from "./upgrade-quote";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function PricingCards({
  currency,
  manifests,
  authed,
  paymentsEnabled,
  preselect,
  openPick3 = false,
  returnTo,
}: {
  currency: Currency;
  manifests: TemplateManifest[];
  authed: boolean;
  paymentsEnabled: boolean;
  preselect?: string;
  /** Sent from the publish sheet's "pick any three": the picker opens with that template chosen. */
  openPick3?: boolean;
  returnTo?: string;
}) {
  const t = useTranslations("pricing");
  // Two branches of "money", not all of it: the pages that show these cards send only what they read.
  const tPlans = useTranslations("money.plans");
  const tAccount = useTranslations("money.account");
  const tCommon = useTranslations("common");
  const locale = useLocale() as GiftLocale;
  const [picking, setPicking] = useState<PlanId | null>(openPick3 && paymentsEnabled ? "pick3" : null);
  const [chosen, setChosen] = useState<string[]>(preselect ? [preselect] : []);
  const [busy, setBusy] = useState(false);
  // One answer for this set of cards: shown under Everything's button and under the picker's, the
  // two places a checkout starts from here.
  const showCheckoutError = useCheckoutError();
  // Someone who already bought templates is never asked for Everything's full price, here or in the
  // home page's teaser: the card becomes the upgrade, the price the owner set for them.
  const upgrade = useUpgradeQuote(currency, paymentsEnabled);
  const all = everythingPlan(currency, upgrade);

  const start = async (product: PlanId | "upgrade", slugs: string[]) => {
    // Guests pay first; the account is created from the email Stripe collects.
    setBusy(true);
    track("pay_clicked", { product, source: "pricing" });
    const result = await startCheckout({ product, templateSlugs: slugs, currency, returnTo, locale });
    if ("url" in result) return void window.location.assign(result.url);
    setBusy(false);
    showCheckoutError(result.error);
  };

  // "One template" is a premium one: a free template's unlock is "Make it special", sold in its
  // editor at its own, lower price (checkout refuses a single for one). Three may mix both.
  const pickable = (product: PlanId | null) => (product === "single" ? manifests.filter((m) => m.tier === "premium") : manifests);
  const choose = (product: PlanId) => {
    if (!paymentsEnabled) {
      toast(t("comingSoon"));
      return;
    }
    if (product === "everything") return void start(all.plan, []);
    setChosen(preselect && pickable(product).some((m) => m.slug === preselect) ? [preselect] : []);
    setPicking(product);
  };

  const needed = picking ? PRODUCTS[picking].picks : 0;
  const premium = manifests.filter((m) => m.tier === "premium").length;

  return (
    <>
      {/*
       * One column of minmax(0, 1fr) below lg, not the implicit auto track: that one grows to the
       * widest card's unbreakable content (the price and its "separately" note), which pushed the
       * cards 26px past a 320px screen in Spanish and let the page scroll sideways.
       */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-stretch" data-authed={authed}>
        {PRODUCT_ORDER.map((id) => {
          const p = PRODUCTS[id];
          const dominant = p.highlight;
          const upgrading = id === "everything" && all.plan === "upgrade";
          const amount = id === "everything" ? all.amount : p.amounts[currency];
          const features = t.raw(`plans.${id}.features`) as string[];
          return (
            <article
              key={id}
              data-reveal
              style={{ "--reveal-delay": `${PRODUCT_ORDER.indexOf(id) * 90}ms` } as React.CSSProperties}
              className={cn(
                "relative flex flex-col rounded-3xl border p-7 sm:p-8",
                dominant ? "border-forest bg-forest text-paper shadow-lift" : "border-line bg-card",
              )}
            >
              {dominant ? (
                <span className="absolute -top-3 left-7 rounded-full bg-blush px-3 py-1 text-eyebrow text-forest">
                  {t("bestValue")}
                </span>
              ) : null}
              <h3 className="font-display text-[1.75rem] leading-tight">{t(`plans.${id}.name`)}</h3>
              <p
                className={cn("mt-1 text-sm", dominant ? "text-paper/65" : "text-muted-foreground")}
              >
                {t(`plans.${id}.blurb`)}
              </p>
              {/* The note drops under the price when a narrow phone can't hold both on one line. */}
              <div className="mt-6 flex flex-wrap items-end gap-x-2 gap-y-1">
                <span className="font-display text-[clamp(2.75rem,14vw,3.4rem)] leading-none tracking-tight" data-testid={`price-${id}`}>
                  {formatAmount(amount, currency, locale)}
                </span>
                {upgrading ? (
                  // The note below says the same in words, for a screen reader that reads no strikethrough.
                  <s aria-hidden="true" className="mb-2 text-sm text-paper/55">{formatAmount(p.amounts[currency], currency, locale)}</s>
                ) : p.compareAt ? (
                  <span className={cn("mb-2 text-sm", dominant ? "text-paper/55" : "text-muted-foreground")}>
                    {t("separately", { price: formatAmount(p.compareAt[currency], currency, locale) })}
                  </span>
                ) : null}
              </div>
              <p
                className={cn(
                  "mt-3 text-mono-meta",
                  dominant ? "text-paper/60" : "text-muted-foreground",
                )}
              >
                {t("oneTime")}
              </p>
              {upgrading ? (
                <p className="mt-1.5 text-sm font-medium text-blush" data-testid="pricing-upgrade">
                  {tPlans("upgradeNote", { full: formatAmount(p.amounts[currency], currency, locale) })}
                </p>
              ) : id === "everything" && premium > 0 ? (
                // What "everything" means, in the unit people compare it to: one gift.
                <p className={cn("mt-1.5 text-sm font-medium", dominant ? "text-blush" : "text-coral")}>
                  {t("perTemplate", { n: premium, price: formatAmount(Math.round(p.amounts[currency] / premium), currency, locale) })}
                </p>
              ) : null}
              <ul className="mt-6 flex flex-col gap-2.5 text-sm">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check
                      className={cn(
                        "mt-0.5 size-4 shrink-0",
                        dominant ? "text-paper/70" : "text-coral",
                      )}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => choose(id)}
                disabled={busy}
                className={cn(
                  "mt-8 flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-transform active:scale-[0.98]",
                  dominant
                    ? "bg-coral text-paper hover:bg-coral-deep"
                    : "border border-ink bg-transparent text-ink hover:bg-ink hover:text-paper",
                )}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>{upgrading ? tAccount("upgradeCta", { price: formatAmount(amount, currency, locale) }) : t(`plans.${id}.cta`)}</span>
              </button>
              {dominant ? (
                <p className="mt-3 text-center text-xs text-paper/55">{t("priority")}</p>
              ) : null}
            </article>
          );
        })}
      </div>
      <p className="mt-5 text-center text-[13px] text-muted-foreground">{t("checkoutNote")}</p>

      <Dialog open={picking !== null} onOpenChange={(v) => !v && setPicking(null)}>
        <DialogContent closeLabel={tCommon("close")} className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {t("pick.title", { n: needed })}
            </DialogTitle>
            <DialogDescription>{t("pick.blurb")}</DialogDescription>
          </DialogHeader>
          <ul className="grid max-h-[50dvh] gap-2 overflow-y-auto">
            {pickable(picking).map((m) => {
              const on = chosen.includes(m.slug);
              return (
                <li key={m.slug}>
                  <button
                    type="button"
                    onClick={() =>
                      setChosen((c) =>
                        on ? c.filter((s) => s !== m.slug) : c.length < needed ? [...c, m.slug] : c,
                      )
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-3 text-left",
                      on ? "border-ink bg-ink/5" : "border-line",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.thumbnail.poster}
                      alt=""
                      className="h-14 w-10 rounded-md object-cover"
                    />
                    <span className="flex-1">
                      <span className="block font-medium">{m.name[locale]}</span>
                      <span className="block text-xs text-muted-foreground">
                        {m.tagline[locale]}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded-full border",
                        on ? "border-coral bg-coral text-paper" : "border-border",
                      )}
                    >
                      {on ? <Check className="size-3" /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            disabled={chosen.length !== needed || busy}
            onClick={() => picking && start(picking, chosen)}
            className="flex h-12 items-center justify-center gap-2 rounded-full bg-coral text-[15px] font-semibold text-paper shadow-glow disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            <span>{t("pick.continue", { n: chosen.length, total: needed })}</span>
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
