"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Gift, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import { track } from "@/lib/analytics/track";
import { PRODUCTS, bumpAmount, formatAmount, type Currency } from "@/lib/pricing/products";
import { TEMPLATE_MANIFESTS } from "@/templates/manifests";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { startCheckout, useCheckoutError } from "@/components/pricing/checkout";
import { useInApp } from "@/lib/app/use-bridge";
import {
  bumpOffered,
  defaultPaywallPlan,
  everythingPlan,
  paywallRequest,
  payTotal,
  pick3Href,
  pick3Offered,
  templatePlan,
  type PaywallPlan,
  type UpgradeQuote,
} from "@/components/pricing/offers";
import { cn } from "@/lib/utils";

/**
 * The paywall inside the publish sheet, for guests and signed-in senders alike. Two rows to choose
 * between (this template, or every template), the bump below them, unticked, and the pay button
 * with the guarantee right beside it. Under the button, also unticked, the one email a buyer can ask
 * for if they leave checkout unpaid. Every amount comes from the catalogue, and is what checkout
 * charges: there are no codes or discounts to apply on the way.
 */
export function Paywall({
  manifest,
  currency,
  locale,
  guest,
  features,
  returnTo,
  freeReply = false,
  upgrade,
  blocked,
  ownedElsewhere = [],
  onSignInInstead,
  onAppUnlock,
}: {
  manifest: TemplateManifest;
  currency: Currency;
  locale: GiftLocale;
  guest: boolean;
  /** What in this gift needs paying for, already in words. */
  features: string[];
  returnTo: string;
  /** A free reply that asks for more than a free reply gives (an extra, no footer): it says why there's a price. */
  freeReply?: boolean;
  upgrade: UpgradeQuote | null;
  /** Something else still stops the gift going out (a missing name): paying now would be early. */
  blocked: boolean;
  ownedElsewhere?: TemplateManifest[];
  onSignInInstead?: () => void;
  /**
   * Inside the iPhone app: the App Store's sheet instead of Stripe (lib/app/bridge.ts). Resolves once
   * the app has answered; on "unlocked" the publish sheet re-checks and sends the gift.
   */
  onAppUnlock?: () => Promise<"unlocked" | "cancelled" | "failed">;
}) {
  const t = useTranslations("editor.publishSheet");
  const tm = useTranslations("money.paywall");
  const slug = manifest.slug;
  const forTemplate = templatePlan(manifest.tier);
  const all = everythingPlan(currency, guest ? null : upgrade);
  // Null until the sender picks a row: the default can change when the upgrade quote arrives.
  const [plan, setPlan] = useState<PaywallPlan | null>(null);
  // A plan that stopped existing (the upgrade quote arrived, or went) falls back to its row.
  const chosen: PaywallPlan = plan === null ? defaultPaywallPlan(forTemplate, all, currency) : plan === forTemplate ? forTemplate : all.plan;
  const [bump, setBump] = useState(false);
  const [paying, setPaying] = useState(false);
  const showCheckoutError = useCheckoutError();
  const money = (minor: number) => formatAmount(minor, currency, locale);

  const planAmount = chosen === forTemplate ? PRODUCTS[forTemplate].amounts[currency] : all.amount;
  const showBump = bumpOffered(chosen, all);
  const bumpOn = showBump && bump;
  const total = payTotal(chosen, planAmount, bumpOn, currency);

  useEffect(() => {
    if (manifest.tier === "free") track("extras_offer_shown", { template: slug, guest });
  }, [manifest.tier, slug, guest]);

  // Inside the iPhone app nothing is sold here: no prices, plans, bump or checkout. Apple's own
  // sheet shows the options and their App Store prices (guideline 3.1.1).
  const inApp = useInApp();
  if (inApp && onAppUnlock && !guest)
    return <AppUnlock manifest={manifest} locale={locale} features={features} freeReply={freeReply} ownedElsewhere={ownedElsewhere} blocked={blocked} onUnlock={onAppUnlock} />;

  const pay = async () => {
    setPaying(true);
    track("pay_clicked", { template: slug, product: chosen, bump: bumpOn, reply: freeReply, guest });
    const result = await startCheckout({ ...paywallRequest({ plan: chosen, slug, bump: bumpOn }), currency, returnTo, locale });
    if ("url" in result) {
      window.location.assign(result.url);
      return;
    }
    setPaying(false);
    showCheckoutError(result.error);
  };

  const rows = [
    {
      id: forTemplate,
      name: forTemplate === "extras" ? tm("extras") : t("planSingle"),
      blurb: forTemplate === "extras" ? tm("extrasBlurb") : t("planSingleBlurb"),
      price: money(PRODUCTS[forTemplate].amounts[currency]),
    },
    {
      id: all.plan,
      name: all.plan === "upgrade" ? tm("upgrade") : t("planEverything"),
      blurb: all.plan === "upgrade" ? tm("upgradeBlurb", { full: money(PRODUCTS.everything.amounts[currency]) }) : t("planEverythingBlurb", { n: TEMPLATE_MANIFESTS.length }),
      price: money(all.amount),
    },
  ];

  return (
    <section className="mt-7 rounded-xl border border-ink bg-card p-4 sm:p-5" data-testid="pay-panel">
      <p className="flex items-center gap-2 font-display text-xl">
        <Lock aria-hidden="true" className="size-4 text-coral" />
        {t("payTitle")}
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        {manifest.tier === "free"
          ? tm(guest ? "extrasGuestIntro" : "extrasIntro", { features: features.join(", ") })
          : t(guest ? "payGuestBlurb" : "payBlurb", { features: features.join(", ") })}
      </p>
      {freeReply ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-blush/30 px-3 py-2.5 text-sm text-ink" data-testid="free-reply-extras">
          <Gift aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-coral" />
          <span>{tm("freeReplyExtras")}</span>
        </p>
      ) : null}
      {ownedElsewhere.length ? (
        <p className="mt-3 text-sm text-ink-soft">
          {t("ownedElsewhere", { templates: ownedElsewhere.map((m) => m.name[locale]).join(", ") })}
        </p>
      ) : null}

      <div role="radiogroup" aria-label={t("planLabel")} className="mt-5 grid gap-2">
        {rows.map((row) => {
          const on = chosen === row.id;
          return (
            <button
              key={row.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={paying}
              onClick={() => setPlan(row.id)}
              data-testid={`plan-${row.id}`}
              className={cn(
                "flex min-h-14 w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors disabled:opacity-50",
                on ? "border-ink bg-ink/5" : "border-line hover:border-ink/40",
              )}
            >
              {/*
               * The price sits on the name's line and the blurb runs the full width under both: with
               * the price in a column of its own, a 320px phone left the words ~90px and the Spanish
               * blurb took four lines.
               */}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 font-medium">{row.name}</span>
                  <span className="shrink-0 font-display text-lg leading-none tabular-nums">{row.price}</span>
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{row.blurb}</span>
              </span>
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", on ? "border-coral bg-coral text-paper" : "border-border")}>
                {on ? <Check aria-hidden="true" className="size-3" /> : null}
              </span>
            </button>
          );
        })}
      </div>

      {pick3Offered(manifest.tier, currency, all) ? (
        // Three templates is the better deal for anyone with more than one occasion coming; the
        // choosing happens on the pricing page, with this one already picked.
        <Link
          href={pick3Href(slug, returnTo)}
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          data-testid="pick3-link"
        >
          {tm("pick3", { price: money(PRODUCTS.pick3.amounts[currency]) })}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      ) : null}

      {showBump ? (
        // Unticked, always: EU law, and the only honest way to offer it.
        <label className={cn("mt-3 flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 transition-colors", bump ? "border-coral bg-coral/5" : "border-line hover:border-ink/40")} data-testid="bump">
          <input
            type="checkbox"
            checked={bump}
            disabled={paying}
            onChange={(e) => {
              setBump(e.target.checked);
              track("bump_toggled", { template: slug, on: e.target.checked, product: chosen });
            }}
            className="size-5 shrink-0 accent-coral"
          />
          {/* Laid out like the plans above: the price on the title's line, the blurb across the width. */}
          <span className="min-w-0 flex-1">
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-sm font-medium">{tm("bump")}</span>
              <span className="shrink-0 text-sm font-semibold whitespace-nowrap">{tm("bumpPrice", { price: money(bumpAmount(chosen, currency)) })}</span>
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{tm("bumpBlurb")}</span>
          </span>
        </label>
      ) : null}

      <Button
        className="mt-4 h-12 w-full rounded-full text-base"
        disabled={paying || blocked}
        onClick={pay}
        data-testid="pay-single"
      >
        {paying ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
        <span>{paying ? t("paying") : t("payButton", { price: money(total) })}</span>
      </Button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[13px] font-medium text-ink" data-testid="guarantee">
        <ShieldCheck aria-hidden="true" className="size-4 shrink-0 text-moss" />
        {tm("guarantee")}
      </p>
      <p className="mt-2 text-center text-mono-meta text-muted-foreground">
        {t("payNote")}
        {guest ? ` ${t("uploadsAfterPay")}` : null}
      </p>
      {guest && onSignInInstead ? (
        <button
          type="button"
          onClick={onSignInInstead}
          className="mt-3 min-h-11 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-ink hover:underline"
        >
          {t("signInInstead")}
        </button>
      ) : null}
      {!guest && ownedElsewhere.length === 1 ? (
        <a
          href={`/create/${ownedElsewhere[0].slug}`}
          className="mt-2 flex min-h-11 w-full items-center justify-center text-center text-sm font-medium text-coral underline-offset-4 hover:underline"
        >
          {t("openOwned", { template: ownedElsewhere[0].name[locale] })}
        </a>
      ) : null}
    </section>
  );
}

/** The paywall inside the iPhone app: what needs unlocking, and one button to the App Store's sheet. */
function AppUnlock({
  manifest,
  locale,
  features,
  freeReply,
  ownedElsewhere,
  blocked,
  onUnlock,
}: {
  manifest: TemplateManifest;
  locale: GiftLocale;
  features: string[];
  freeReply: boolean;
  ownedElsewhere: TemplateManifest[];
  blocked: boolean;
  onUnlock: () => Promise<"unlocked" | "cancelled" | "failed">;
}) {
  const t = useTranslations("editor.publishSheet");
  const tm = useTranslations("money.paywall");
  const [state, setState] = useState<"idle" | "waiting" | "failed">("idle");

  const unlock = async () => {
    setState("waiting");
    let outcome: "unlocked" | "cancelled" | "failed" = "failed";
    try {
      outcome = await onUnlock();
    } catch {
      outcome = "failed";
    }
    setState(outcome === "failed" ? "failed" : "idle");
  };

  return (
    <section className="mt-7 rounded-xl border border-ink bg-card p-4 sm:p-5" data-testid="pay-panel-app">
      <p className="flex items-center gap-2 font-display text-xl">
        <Lock aria-hidden="true" className="size-4 text-coral" />
        {t("payTitle")}
      </p>
      <p className="mt-1 text-sm text-ink-soft">{manifest.tier === "free" ? tm("extrasIntro", { features: features.join(", ") }) : t("payBlurb", { features: features.join(", ") })}</p>
      {freeReply ? (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-blush/30 px-3 py-2.5 text-sm text-ink">
          <Gift aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-coral" />
          <span>{tm("freeReplyExtras")}</span>
        </p>
      ) : null}
      {ownedElsewhere.length ? <p className="mt-3 text-sm text-ink-soft">{t("ownedElsewhere", { templates: ownedElsewhere.map((m) => m.name[locale]).join(", ") })}</p> : null}
      <Button className="mt-5 h-12 w-full rounded-full text-base" disabled={state === "waiting" || blocked} onClick={unlock} data-testid="app-unlock">
        {state === "waiting" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Lock aria-hidden="true" className="size-4" />}
        <span>{t("appUnlock")}</span>
      </Button>
      <p className="mt-3 text-center text-mono-meta text-muted-foreground">{t("appUnlockNote")}</p>
      {state === "failed" ? (
        <p role="alert" className="mt-3 text-center text-sm text-ink">
          {t("appUnlockFailed")}
        </p>
      ) : null}
      {ownedElsewhere.length === 1 ? (
        <a href={`/create/${ownedElsewhere[0].slug}`} className="mt-2 flex min-h-11 w-full items-center justify-center text-center text-sm font-medium text-coral underline-offset-4 hover:underline">
          {t("openOwned", { template: ownedElsewhere[0].name[locale] })}
        </a>
      ) : null}
    </section>
  );
}
