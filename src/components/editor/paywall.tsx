"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Gift, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import type { ShownReaction } from "@/lib/proof/numbers";
import { track } from "@/lib/analytics/track";
import { adTrack } from "@/lib/analytics/ads";
import { PRODUCTS, SECOND_GIFT, bumpAmount, formatAmount, type Currency } from "@/lib/pricing/products";
import { TEMPLATE_MANIFESTS, getManifest } from "@/templates/manifests";
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
  secondOffered,
  secondSuggestions,
  templatePlan,
  type PaywallPlan,
  type UpgradeQuote,
} from "@/components/pricing/offers";
import { cn } from "@/lib/utils";
import { EtsyClaim, useEtsyMode } from "./etsy-claim";

// Apple Pay / Google Pay in one tap: in the browser only, and its code loads with the pay sheet.
const OneTapPay = dynamic(() => import("./one-tap-pay").then((m) => m.OneTapPay), { ssr: false });

/**
 * The paywall inside the publish sheet, for guests and signed-in senders alike. It opens with what
 * the gift is for (their face when it opens, or a real reaction to one when the site has one it may
 * show), then what each paid part does for them. Two rows to choose between (this template, or every
 * template), the add-ons below them in one group, unticked (every template, or a second gift), the pay
 * button with the guarantee right under it, then one-tap Apple Pay / Google Pay where the phone has it. Every amount comes from the catalogue, and is what checkout
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
  reaction = null,
}: {
  manifest: TemplateManifest;
  currency: Currency;
  locale: GiftLocale;
  guest: boolean;
  /** What each paid part of this gift does for them, already in words ("Your voice saying it"). */
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
  /** A real reaction to an Ethos gift, shown with its writer's agreement and nothing else of theirs. */
  reaction?: ShownReaction | null;
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
  // The second gift: off until ticked; its template is the first suggestion until another is picked.
  const [secondOn, setSecondOn] = useState(false);
  const [secondPick, setSecondPick] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  // Taps that land together are one checkout, not one each.
  const going = useRef(false);
  const showCheckoutError = useCheckoutError();
  const money = (minor: number) => formatAmount(minor, currency, locale);

  const planAmount = chosen === forTemplate ? PRODUCTS[forTemplate].amounts[currency] : all.amount;
  const showBump = bumpOffered(chosen, all);
  const bumpOn = showBump && bump;
  const suggestions = secondSuggestions(slug, ownedElsewhere.map((m) => m.slug));
  const pick = secondPick && suggestions.includes(secondPick) ? secondPick : (suggestions[0] ?? null);
  const showSecond = secondOffered(chosen, bumpOn) && pick !== null;
  const second = showSecond && secondOn ? pick : null;
  const total = payTotal(chosen, planAmount, bumpOn, currency, second !== null);

  useEffect(() => {
    if (manifest.tier === "free") track("extras_offer_shown", { template: slug, guest });
  }, [manifest.tier, slug, guest]);

  // The price seen, once per opening, for the ad pixels' "saw the price, didn't pay" audiences.
  // Nothing without advertising consent (lib/analytics/ads.ts).
  const shownTotal = useRef(total);
  useEffect(() => {
    adTrack({ name: "PaywallSeen", contents: [{ id: slug, category: manifest.tier }], value: shownTotal.current / 100, currency: currency.toUpperCase() });
  }, [slug, manifest.tier, currency]);

  // Inside the iPhone app nothing is sold here: no prices, plans, bump or checkout. Apple's own
  // sheet shows the options and their App Store prices (guideline 3.1.1).
  const inApp = useInApp();
  // Bought on Etsy (the order's PDF links here with ?etsy=1): the order number instead of prices.
  const [etsy, setEtsy] = useEtsyMode();
  if (inApp && onAppUnlock && !guest)
    return <AppUnlock manifest={manifest} locale={locale} features={features} freeReply={freeReply} ownedElsewhere={ownedElsewhere} blocked={blocked} onUnlock={onAppUnlock} />;
  if (etsy && !freeReply) return <EtsyClaim slug={slug} locale={locale} guest={guest} returnTo={returnTo} blocked={blocked} onLeave={() => setEtsy(false)} />;

  const pay = async () => {
    if (going.current) return;
    going.current = true;
    setPaying(true);
    track("pay_clicked", { template: slug, product: chosen, bump: bumpOn, second: second !== null, reply: freeReply, guest });
    const result = await startCheckout({ ...paywallRequest({ plan: chosen, slug, bump: bumpOn, second }), currency, returnTo, locale }, { total, category: manifest.tier });
    if ("url" in result) {
      window.location.assign(result.url);
      return;
    }
    going.current = false;
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
      {reaction ? (
        <p className="font-display text-xl leading-snug" data-testid="pay-reaction">
          “{reaction.text}” <span aria-hidden="true">{reaction.emoji}</span>{" "}
          <span className="font-sans text-xs whitespace-nowrap text-muted-foreground">· {t("realReaction")}</span>
        </p>
      ) : (
        <p className="font-display text-xl leading-snug">{t("payTitle")}</p>
      )}
      {features.length ? (
        <p className="mt-1.5 text-sm font-medium text-ink" data-testid="pay-benefits">
          {t("payIncludes", { features: features.join(" · ") })}
        </p>
      ) : null}
      <p className="mt-1 text-sm text-ink-soft">
        {manifest.tier === "free" ? tm(guest ? "extrasGuestIntro" : "extrasIntro") : t(guest ? "payGuestBlurb" : "payBlurb")}
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

      {/*
       * One column of controls on the left (radios, then tickboxes) and one of prices on the right, in
       * the sans: the display serif's old-style numbers sat off the names' baseline. Proportional
       * figures, as tabular ones leave a figure-wide gap either side of the decimal point.
       */}
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
                "flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors disabled:opacity-50",
                on ? "border-ink bg-ink/5" : "border-line hover:border-ink/40",
              )}
            >
              <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-[1.5px]", on ? "border-coral" : "border-ink/30")}>
                {on ? <span className="size-2.5 rounded-full bg-coral" /> : null}
              </span>
              {/* The blurb runs under the price too: a 320px phone has no room for a price column. */}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3 leading-6">
                  <span className="min-w-0 font-medium">{row.name}</span>
                  <span className="shrink-0 font-semibold">{row.price}</span>
                </span>
                <span className="block text-xs text-muted-foreground">{row.blurb}</span>
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
          className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
          data-testid="pick3-link"
        >
          {tm("pick3", { price: money(PRODUCTS.pick3.amounts[currency]) })}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      ) : null}

      {showBump || showSecond ? (
        // The add-ons, one group: unticked, always (EU law, and the only honest way to offer them).
        <div className="mt-2 divide-y divide-dashed divide-line overflow-hidden rounded-lg border border-dashed border-line">
          {showBump ? (
            <label className={cn("flex cursor-pointer items-start gap-3 px-3 py-3 transition-colors", bump ? "bg-coral/5" : "hover:bg-ink/[0.03]")} data-testid="bump">
              <input
                type="checkbox"
                checked={bump}
                disabled={paying}
                onChange={(e) => {
                  setBump(e.target.checked);
                  // Every template includes the second gift: one or the other.
                  if (e.target.checked) setSecondOn(false);
                  track("bump_toggled", { template: slug, on: e.target.checked, product: chosen });
                }}
                className="size-5 shrink-0 accent-coral"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3 text-sm leading-5">
                  <span className="min-w-0 font-medium">{tm("bump")}</span>
                  <span className="shrink-0 font-semibold">{tm("bumpPrice", { price: money(bumpAmount(chosen, currency)) })}</span>
                </span>
                <span className="block text-xs text-muted-foreground">{tm("bumpBlurb")}</span>
              </span>
            </label>
          ) : null}
          {showSecond ? (
            <div className={cn("px-3 py-3 transition-colors", secondOn ? "bg-coral/5" : "hover:bg-ink/[0.03]")} data-testid="second">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={secondOn}
                  disabled={paying}
                  onChange={(e) => {
                    setSecondOn(e.target.checked);
                    track("second_toggled", { template: slug, on: e.target.checked, pick: pick ?? "" });
                  }}
                  className="size-5 shrink-0 accent-coral"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3 text-sm leading-5">
                    <span className="min-w-0 font-medium">{tm("second")}</span>
                    <span className="shrink-0 font-semibold">{tm("secondPrice", { price: money(SECOND_GIFT.amounts[currency]) })}</span>
                  </span>
                  <span className="block text-xs text-muted-foreground">{tm("secondBlurb")}</span>
                </span>
              </label>
              {secondOn ? (
                <div role="radiogroup" aria-label={tm("secondPick")} className="mt-2.5 flex flex-wrap gap-1.5 pl-8" data-testid="second-pick">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={pick === s}
                      disabled={paying}
                      onClick={() => setSecondPick(s)}
                      className={cn("min-h-9 rounded-full border px-3 text-xs font-medium transition-colors", pick === s ? "border-coral bg-coral text-paper" : "border-line bg-card hover:border-ink/40")}
                    >
                      {getManifest(s)?.name[locale] ?? s}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
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
      {/* Right under the button, for either way of paying; the shield sits in the line, so the line centres. */}
      <p className="mt-2.5 text-center text-[13px] text-balance text-ink-soft" data-testid="guarantee">
        <ShieldCheck aria-hidden="true" className="mr-1 inline size-4 -translate-y-px align-middle text-moss" />
        {tm("guarantee")}
      </p>
      <OneTapPay
        request={{ ...paywallRequest({ plan: chosen, slug, bump: bumpOn, second }), currency, returnTo, locale }}
        locale={locale}
        disabled={paying || blocked}
        sale={{ template: slug, product: chosen, bump: bumpOn, second: second !== null, reply: freeReply, guest, total, category: manifest.tier, currency }}
      />
      <p className="mt-4 text-center text-xs text-balance text-muted-foreground">
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
      {features.length ? <p className="mt-1.5 text-sm font-medium text-ink">{t("payIncludes", { features: features.join(" · ") })}</p> : null}
      <p className="mt-1 text-sm text-ink-soft">{manifest.tier === "free" ? tm("extrasIntro") : t("payBlurb")}</p>
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
