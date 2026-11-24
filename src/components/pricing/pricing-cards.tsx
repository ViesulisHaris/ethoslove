"use client";

import { useEffect, useRef, useState } from "react";
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
import { useRegisterChoice } from "./pricing-choice";
import { pricingGifts } from "./free-gifts";
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
  quiet = false,
}: {
  currency: Currency;
  manifests: TemplateManifest[];
  authed: boolean;
  paymentsEnabled: boolean;
  preselect?: string;
  /** Sent from the publish sheet's "pick any three": the picker opens with that template chosen. */
  openPick3?: boolean;
  returnTo?: string;
  /**
   * The lighter dress, for /pricing, where these sit under Ethos for Two: Everything keeps its
   * "Best value" and the rose button, but not the wine block, which would compete with the hero.
   */
  quiet?: boolean;
}) {
  const t = useTranslations("pricing");
  // Two branches of "money", not all of it: the pages that show these cards send only what they read.
  const tPlans = useTranslations("money.plans");
  const tAccount = useTranslations("money.account");
  const tCommon = useTranslations("common");
  const locale = useLocale() as GiftLocale;
  const [picking, setPicking] = useState<PlanId | null>(openPick3 && paymentsEnabled ? "pick3" : null);
  const [chosen, setChosen] = useState<string[]>(preselect ? [preselect] : []);
  // The button that opened the picker (a card's, or the head's): focus goes back to it when the picker
  // closes. Opened from state, the dialog has no trigger of its own to hand focus back to.
  const opener = useRef<HTMLElement | null>(null);

  // The editor's "pick any three" link (?plan=pick3) opens the picker once: the address loses `plan`
  // (keeping the gift and the way back), so coming back from checkout, or a reload, shows the page,
  // not "Choose 3" again over it.
  useEffect(() => {
    if (!openPick3) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("plan")) return;
    url.searchParams.delete("plan");
    window.history.replaceState(window.history.state, "", url);
  }, [openPick3]);
  // The card whose checkout is starting: its button alone shows the spinner, every buy button waits.
  const [busy, setBusy] = useState<PlanId | null>(null);
  // One answer for this set of cards: shown under Everything's button and under the picker's, the
  // two places a checkout starts from here.
  const showCheckoutError = useCheckoutError();
  // Someone who already bought templates is never asked for Everything's full price, here or in the
  // home page's teaser: the card becomes the upgrade, the price the owner set for them.
  const upgrade = useUpgradeQuote(currency, paymentsEnabled);
  const all = everythingPlan(currency, upgrade);

  const start = async (card: PlanId, product: PlanId | "upgrade", slugs: string[]) => {
    // Guests pay first; the account is created from the email Stripe collects.
    setBusy(card);
    track("pay_clicked", { product, source: "pricing" });
    const result = await startCheckout({ product, templateSlugs: slugs, currency, returnTo, locale });
    if ("url" in result) return void window.location.assign(result.url);
    setBusy(null);
    showCheckoutError(result.error);
  };

  // "One template" is a premium one: a free template's unlock is "Make it special", sold in its
  // editor at its own, lower price (checkout refuses a single for one). Three may mix both.
  const pickable = (product: PlanId | null) => (product === "single" ? manifests.filter((m) => m.tier === "premium") : manifests);
  const choose = (product: PlanId, from?: HTMLElement | null) => {
    if (!paymentsEnabled) {
      toast(t("comingSoon"));
      return;
    }
    if (product === "everything") return void start("everything", all.plan, []);
    opener.current = from ?? null;
    setChosen(preselect && pickable(product).some((m) => m.slug === preselect) ? [preselect] : []);
    setPicking(product);
  };

  // The pricing page's head presses "One gift" with this same handler (pricing-choice.tsx).
  useRegisterChoice(choose, busy);

  // The picker lists the gift the buyer came with first, so the one already ticked is in sight (the
  // order is fixed while it is open: ticking another never moves a row).
  const rows = (product: PlanId | null) => {
    const list = pickable(product);
    const first = list.find((m) => m.slug === preselect);
    return first ? [first, ...list.filter((m) => m !== first)] : list;
  };

  const needed = picking ? PRODUCTS[picking].picks : 0;
  // Every count of gifts here is the gallery's: every gift that cannot go out free (lib/gift/free-tier.ts),
  // so with the free note live Constellations is one of them (PLAN-pricing.md, addendum of 24 Nov 2026).
  // The home page's teaser counts the same way, so /pricing and the front page never give two numbers.
  const paid = pricingGifts(manifests).paid.length;

  return (
    <>
      {/*
       * One column of minmax(0, 1fr) below lg, not the implicit auto track: that one grows to the
       * widest card's unbreakable content (the price and its "separately" note), which pushed the
       * cards 26px past a 320px screen in Spanish and let the page scroll sideways.
       */}
      <div className={cn("grid grid-cols-1 items-stretch", quiet ? "gap-7 md:grid-cols-3 md:gap-4 xl:gap-5" : "gap-5 lg:grid-cols-3")} data-authed={authed}>
        {PRODUCT_ORDER.map((id) => {
          const p = PRODUCTS[id];
          const dominant = p.highlight && !quiet;
          const picked = p.highlight && quiet;
          const upgrading = id === "everything" && all.plan === "upgrade";
          const amount = id === "everything" ? all.amount : p.amounts[currency];
          const features = t.raw(`plans.${id}.features`) as string[];
          if (quiet) {
            // /pricing (remade 24 Nov 2026): the gallery card's paper, a name, the price, one line, at most three
            // ticks and the button. Every line the cards used to list is in "What each one includes" under them.
            const ticks = t.raw(`page.cards.${id}.ticks`) as string[];
            return (
              <article
                key={id}
                data-plan={id}
                className={cn(
                  "relative flex flex-col rounded-[28px] bg-card p-6 shadow-[0_26px_48px_-34px_rgba(74,32,24,0.55)] ring-1 sm:p-7",
                  picked ? "ring-rose/30" : "ring-ink/[0.07]",
                )}
              >
                {/* The pill sits on the card's top edge, out of the flow, so the three names and prices stand level at every width. */}
                {picked ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-card px-3 py-1 text-page-label text-rose-ink ring-1 ring-rose/30 sm:left-7">{t("bestValue")}</span>
                ) : null}
                <h3 className="font-display text-[1.625rem] leading-tight text-ink">{t(`page.cards.${id}.name`)}</h3>
                {/* The note drops under the price when a narrow phone can't hold both on one line. */}
                <div className="mt-5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <span className="font-display text-[clamp(2.5rem,11vw,3rem)] leading-none tracking-tight text-ink tabular-nums" data-testid={`price-${id}`}>
                    {formatAmount(amount, currency, locale)}
                  </span>
                  {upgrading ? (
                    // The line below says the same in words, for a screen reader that reads no strikethrough.
                    <s aria-hidden="true" className="text-[0.9375rem] text-ink-soft">{formatAmount(p.amounts[currency], currency, locale)}</s>
                  ) : p.compareAt ? (
                    // The sum is three paid gifts: three that take in The Letter would cost less.
                    <span className="text-[0.9375rem] text-ink-soft">{t(id === "pick3" ? "page.pick3Separately" : "separately", { price: formatAmount(p.compareAt[currency], currency, locale) })}</span>
                  ) : null}
                </div>
                {upgrading ? (
                  <p className="mt-3 text-[0.9375rem] leading-snug font-medium text-rose-ink" data-testid="pricing-upgrade">
                    {tPlans("upgradeNote", { full: formatAmount(p.amounts[currency], currency, locale) })}
                  </p>
                ) : (
                  <p className="mt-3 text-[0.9375rem] leading-snug text-balance text-ink-soft">
                    {id === "everything"
                      ? t("page.cards.everything.line", { n: paid, price: formatAmount(Math.round(p.amounts[currency] / Math.max(paid, 1)), currency, locale) })
                      : t(`page.cards.${id}.line`)}
                  </p>
                )}
                <ul className="mt-5 mb-7 flex flex-col gap-2.5 text-[0.9375rem] leading-snug text-ink">
                  {ticks.map((tick) => (
                    <li key={tick} className="flex items-start gap-2.5">
                      <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rose-ink" strokeWidth={2.2} />
                      <span>{tick}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={(event) => choose(id, event.currentTarget)}
                  disabled={busy !== null}
                  aria-busy={busy === id}
                  className={cn(
                    "mt-auto flex h-12 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition-[background-color,border-color,scale] duration-200 active:scale-[0.98] disabled:opacity-60",
                    picked ? "btn-rose" : "border border-ink/20 text-ink hover:border-ink/45 hover:bg-paper active:bg-paper-deep",
                  )}
                >
                  {busy === id ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
                  <span>{upgrading ? tAccount("upgradeCta", { price: formatAmount(amount, currency, locale) }) : t(`plans.${id}.cta`)}</span>
                </button>
              </article>
            );
          }
          return (
            <article
              key={id}
              data-reveal
              style={{ "--reveal-delay": `${PRODUCT_ORDER.indexOf(id) * 90}ms` } as React.CSSProperties}
              className={cn(
                "relative flex flex-col rounded-3xl border sm:p-8",
                quiet ? "p-6" : "p-7",
                dominant ? "border-forest bg-forest text-paper shadow-lift" : picked ? "border-coral/45 bg-card shadow-soft ring-1 ring-coral/25" : "border-line bg-card",
              )}
            >
              {dominant || picked ? (
                <span className={cn("absolute -top-3 left-7 rounded-full px-3 py-1 text-eyebrow", dominant ? "bg-blush text-forest" : "bg-coral text-paper")}>
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
              <div className={cn("flex flex-wrap items-end gap-x-2 gap-y-1", quiet ? "mt-4 sm:mt-6" : "mt-6")}>
                <span className={cn("font-display leading-none tracking-tight", quiet ? "text-[clamp(2.5rem,12vw,3.1rem)]" : "text-[clamp(2.75rem,14vw,3.4rem)]")} data-testid={`price-${id}`}>
                  {formatAmount(amount, currency, locale)}
                </span>
                {upgrading ? (
                  // The note below says the same in words, for a screen reader that reads no strikethrough.
                  <s aria-hidden="true" className={cn("mb-2 text-sm", dominant ? "text-paper/55" : "text-muted-foreground")}>{formatAmount(p.amounts[currency], currency, locale)}</s>
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
                <p className={cn("mt-1.5 text-sm font-medium", dominant ? "text-blush" : "text-coral")} data-testid="pricing-upgrade">
                  {tPlans("upgradeNote", { full: formatAmount(p.amounts[currency], currency, locale) })}
                </p>
              ) : id === "everything" && paid > 0 ? (
                // What "everything" means, in the unit people compare it to: one gift.
                <p className={cn("mt-1.5 text-sm font-medium", dominant ? "text-blush" : "text-coral")}>
                  {t("perTemplate", { n: paid, price: formatAmount(Math.round(p.amounts[currency] / paid), currency, locale) })}
                </p>
              ) : null}
              <ul className={cn("flex flex-col text-sm", quiet ? "mt-5 mb-7 gap-2 sm:mt-6 sm:gap-2.5" : "mt-6 gap-2.5")}>
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
                onClick={(event) => choose(id, event.currentTarget)}
                disabled={busy !== null}
                aria-busy={busy === id}
                className={cn(
                  "flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-transform active:scale-[0.98]",
                  // Quiet: pinned to the card's foot, so the three buttons line up side by side.
                  quiet ? "mt-auto" : "mt-8",
                  dominant
                    ? "bg-coral text-paper hover:bg-coral-deep"
                    : picked
                      ? "btn-rose"
                      : "border border-ink bg-transparent text-ink hover:bg-ink hover:text-paper",
                )}
              >
                {busy === id ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>{upgrading ? tAccount("upgradeCta", { price: formatAmount(amount, currency, locale) }) : t(`plans.${id}.cta`)}</span>
              </button>
              {dominant ? (
                <p className="mt-3 text-center text-xs text-paper/55">{t("priority")}</p>
              ) : null}
            </article>
          );
        })}
      </div>
      <p className={quiet ? "mt-4 text-sm leading-relaxed text-ink-soft" : "mt-5 text-center text-[13px] text-muted-foreground"}>{t("checkoutNote")}</p>

      <Dialog open={picking !== null} onOpenChange={(v) => !v && setPicking(null)}>
        <DialogContent
          closeLabel={tCommon("close")}
          className="sm:max-w-lg"
          onCloseAutoFocus={(event) => {
            const back = opener.current;
            if (!back?.isConnected) return;
            event.preventDefault();
            back.focus({ preventScroll: true });
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {t("pick.title", { n: needed })}
            </DialogTitle>
            <DialogDescription>{t("pick.blurb")}</DialogDescription>
          </DialogHeader>
          <ul className={cn("grid max-h-[50dvh] overflow-y-auto", quiet ? "-mx-1 gap-2.5 px-1 py-1" : "gap-2")}>
            {rows(picking).map((m) => {
              const on = chosen.includes(m.slug);
              return (
                <li key={m.slug}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() =>
                      setChosen((c) =>
                        on ? c.filter((s) => s !== m.slug) : c.length < needed ? [...c, m.slug] : c,
                      )
                    }
                    className={cn(
                      "flex w-full items-center gap-3 text-left",
                      quiet
                        ? // The gallery card's paper: a soft ring, the rose one when ticked.
                          cn(
                            "min-h-[4.5rem] rounded-[20px] bg-card p-2.5 pr-4 ring-1 transition-[box-shadow,background-color,scale] duration-200 hover:ring-ink/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100",
                            on ? "ring-2 ring-rose/60 hover:ring-rose/60" : "ring-ink/[0.08]",
                          )
                        : cn("rounded-lg border p-3", on ? "border-ink bg-ink/5" : "border-line"),
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.thumbnail.poster}
                      alt=""
                      className={quiet ? "h-14 w-10 shrink-0 rounded-[10px] object-cover" : "h-14 w-10 rounded-md object-cover"}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={quiet ? "block font-display text-[1.125rem] leading-tight text-ink" : "block font-medium"}>{m.name[locale]}</span>
                      <span className={quiet ? "mt-0.5 block text-[0.875rem] leading-snug text-ink-soft" : "block text-xs text-muted-foreground"}>
                        {m.tagline[locale]}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid shrink-0 place-items-center rounded-full border",
                        quiet ? "size-6" : "size-5",
                        on ? (quiet ? "border-rose bg-rose text-paper" : "border-coral bg-coral text-paper") : "border-border",
                      )}
                    >
                      {on ? <Check className={quiet ? "size-3.5" : "size-3"} strokeWidth={2.4} /> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            disabled={chosen.length !== needed || busy !== null}
            aria-busy={busy !== null && busy === picking}
            onClick={() => picking && start(picking, picking, chosen)}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-full text-[15px] font-semibold disabled:opacity-50",
              quiet ? "btn-rose focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose" : "bg-coral text-paper shadow-glow",
            )}
          >
            {busy !== null && busy === picking ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            <span>{t("pick.continue", { n: chosen.length, total: needed })}</span>
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
