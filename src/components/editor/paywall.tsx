"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, Check, Gift, Loader2, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GiftLocale } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import type { ShownReaction } from "@/lib/proof/numbers";
import { freeTestEvent, track } from "@/lib/analytics/track";
import { rememberPayClick, type PayArm } from "@/lib/editor/pay-sheet-split";
import { rememberLetterClick, type KeepArm } from "@/lib/editor/keep-split";
import { adTrack } from "@/lib/analytics/ads";
import { PRODUCTS, SECOND_GIFT, bumpAmount, extrasAmount, formatAmount, type Currency } from "@/lib/pricing/products";
import { TEMPLATE_MANIFESTS, getManifest } from "@/templates/manifests";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { startCheckout, useCheckoutError } from "@/components/pricing/checkout";
import { personalPriceEnds, usePersonalPrice } from "@/components/pricing/use-personal-price";
import { useInApp } from "@/lib/app/use-bridge";
import { extraOnOffer } from "@/lib/lifecycle/holiday-extras";
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
 * button, then one-tap Apple Pay / Google Pay where the phone has it. Every amount comes from the catalogue, and is what checkout
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
  note = null,
  letterArm = null,
  one = null,
  payArm = null,
  compare = null,
  keepArm = null,
  keepRow = null,
  ownedRows = [],
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
  /**
   * A Letter whose free version is the short note (lib/gift/free-tier.ts): the panel opens with what
   * paying sends, in their own count, and says what the price is next to a premium template's.
   */
  note?: { photos: number; longLetter: boolean; /** The first few of their photos, as the editor shows them. */ thumbs?: string[] } | null;
  /** The free Letter test's version of this gift, so a pay tap is counted to it; null on any other gift. */
  letterArm?: "note" | "classic" | null;
  /**
   * A premium gift's panel in its simpler form (lib/editor/pay-sheet-split.ts): the gift named for
   * who it is for, one price and one button, with the other plans and the add-ons under "More options".
   */
  one?: { name: string; photos: number; thumbs?: string[] } | null;
  /** Which panel this visitor is shown, so a pay tap is counted to it; null where there is no choice of panel. */
  payArm?: PayArm | null;
  /**
   * The Letter's "keep" version (lib/editor/keep-split.ts): the note as it will open with their
   * photos and without, side by side, in place of the row of small photos.
   */
  compare?: { photo: string; line: string; name: string; photos: number } | null;
  /** Which version of the Letter's send screen this visitor is shown, so a pay tap is counted to it; null elsewhere. */
  keepArm?: KeepArm | null;
  /** "A note with photos", listed with the other options where it can be bought for this gift. */
  keepRow?: { price: string; max: number; busy: boolean; onPay: () => void } | null;
  /** The account's unlock rows, for a price that depends on them (extrasAmount). */
  ownedRows?: string[];
}) {
  const t = useTranslations("editor.publishSheet");
  const tm = useTranslations("money.paywall");
  const slug = manifest.slug;
  const forTemplate = templatePlan(manifest.tier);
  const all = everythingPlan(currency, guest ? null : upgrade);
  // A personal price from an offer email (lib/commerce/personal-price.ts) goes on this gift's own row:
  // the price shown is the price checkout charges, and checkout refuses rather than charge another.
  const { price: personal, forget: forgetPersonal } = usePersonalPrice();
  // "Make it special" is the difference for an account that already paid for a note with photos.
  const listedForTemplate = forTemplate === "extras" ? extrasAmount(currency, ownedRows, slug) : PRODUCTS[forTemplate].amounts[currency];
  const personalFor = personal !== null && personal.onto.includes(forTemplate) ? Math.min(listedForTemplate, personal.amounts[currency]) : null;
  const forTemplateAmount = personalFor ?? listedForTemplate;
  // Null until the sender picks a row: the default can change when the upgrade quote arrives.
  const [plan, setPlan] = useState<PaywallPlan | null>(null);
  // A plan that stopped existing (the upgrade quote arrived, or went) falls back to its row.
  const chosen: PaywallPlan =
    plan === null ? (note || one || personalFor !== null ? forTemplate : defaultPaywallPlan(forTemplate, all, currency)) : plan === forTemplate ? forTemplate : all.plan;
  // The personal price is for this one gift: no add-ons with it.
  const personalOn = personalFor !== null && chosen === forTemplate;
  const [bump, setBump] = useState(false);
  // The second gift: off until ticked; its template is the first suggestion until another is picked.
  const [secondOn, setSecondOn] = useState(false);
  const [secondPick, setSecondPick] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  // Taps that land together are one checkout, not one each.
  const going = useRef(false);
  const showCheckoutError = useCheckoutError();
  const money = (minor: number) => formatAmount(minor, currency, locale);
  const noteHeadline = !note
    ? null
    : note.photos > 0 && note.longLetter
      ? tm("noteHeadlineBoth", { count: note.photos })
      : note.photos > 0
        ? tm("noteHeadlinePhotos", { count: note.photos })
        : note.longLetter
          ? tm("noteHeadlineLetter")
          : null;
  // What paying sends, as a short ticked list: their photos and letter first, then anything else paid in it.
  const noteChecks = note
    ? [
        note.photos > 0 ? tm("noteCheckPhotos", { count: note.photos }) : null,
        note.longLetter ? tm("noteCheckLetter") : null,
        ...features.filter((feature) => feature !== t("benefitNoWatermark")),
        tm("noteCheckFooter"),
      ].filter((text): text is string => Boolean(text))
    : [];
  // The one-price layout, for a note and for a premium gift shown the simpler panel: what it opens
  // with, the ticked list under the price, and the line the other plans fold under.
  const panel = note
    ? { kind: "note" as const, photos: note.photos, thumbs: note.thumbs, headline: noteHeadline ?? t("payTitle"), checks: noteChecks, more: tm("noteMore", { price: money(all.amount) }) }
    : one
      ? {
          kind: "one" as const,
          photos: one.photos,
          thumbs: one.thumbs,
          headline: one.name ? tm("oneHeadline", { template: manifest.name[locale], name: one.name }) : manifest.name[locale],
          // Their photos first, then what one payment buys, then anything else paid in this gift.
          checks: [one.photos > 0 ? tm("noteCheckPhotos", { count: one.photos }) : null, t("planSingleBlurb"), ...features].filter((text): text is string => Boolean(text)),
          more: tm("oneMore"),
        }
      : null;

  const planAmount = chosen === forTemplate ? forTemplateAmount : all.amount;
  // Read once, when the panel opens: the sheet is never rendered on the server.
  const [treeTag] = useState(() => extraOnOffer() === "tree-tag");
  const showBump = !personalOn && bumpOffered(chosen, all);
  const bumpOn = showBump && bump;
  const suggestions = secondSuggestions(slug, ownedElsewhere.map((m) => m.slug));
  const pick = secondPick && suggestions.includes(secondPick) ? secondPick : (suggestions[0] ?? null);
  const showSecond = !personalOn && secondOffered(chosen, bumpOn) && pick !== null;
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
    if (letterArm) track(freeTestEvent(slug, "pay", letterArm), { guest });
    if (keepArm) {
      track(keepArm === "keep" ? "letter_pay_keep" : "letter_pay_plain", { guest });
      rememberLetterClick(keepArm);
    }
    if (payArm) {
      track(payArm === "one" ? "pay_one_clicked" : "pay_classic_clicked", { template: slug, guest });
      rememberPayClick(payArm);
    }
    const result = await startCheckout(
      { ...paywallRequest({ plan: chosen, slug, bump: bumpOn, second }), currency, returnTo, locale, ...(personalOn ? { personalPrice: true } : {}) },
      { total, category: manifest.tier },
    );
    if ("url" in result) {
      window.location.assign(result.url);
      return;
    }
    going.current = false;
    setPaying(false);
    // Ended or used since the sheet opened: the usual price shows again, and the next tap pays it.
    if (result.error.startsWith("personal_price_")) forgetPersonal();
    showCheckoutError(result.error);
  };

  const rows: { id: PaywallPlan; name: string; blurb: string; price: string; was?: string }[] = [
    {
      id: forTemplate,
      name: forTemplate === "extras" ? tm("extras") : t("planSingle"),
      blurb: forTemplate === "extras" ? tm(note ? "extrasBlurbNote" : "extrasBlurb") : t("planSingleBlurb"),
      price: money(forTemplateAmount),
      ...(personalFor !== null ? { was: money(listedForTemplate) } : {}),
    },
    {
      id: all.plan,
      name: all.plan === "upgrade" ? tm("upgrade") : t("planEverything"),
      blurb: all.plan === "upgrade" ? tm("upgradeBlurb", { full: money(PRODUCTS.everything.amounts[currency]) }) : t("planEverythingBlurb", { n: TEMPLATE_MANIFESTS.length }),
      price: money(all.amount),
    },
  ];

  // The plans and the add-ons. In the panel for most gifts; for a note they fold under "More options",
  // so the panel is one price and one button (lib/gift/free-tier.ts).
  const chooser = (
    <>
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
                    <span className="shrink-0 font-semibold">
                      {row.was ? <s className="mr-1.5 font-normal text-muted-foreground" data-testid="price-was">{row.was}</s> : null}
                      {row.price}
                    </span>
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
    </>
  );

  return (
    <section className="mt-7 rounded-xl border border-ink bg-card p-4 sm:p-5" data-testid="pay-panel">
      {panel ? (
        <div data-testid={panel.kind === "note" ? "pay-note" : "pay-one"}>
          {compare ? (
            // What they are choosing between, as two small pictures made of what is already here:
            // their first photo over the letter's first lines, and the lines alone.
            <div className="mb-4" data-testid="pay-compare">
              <p className="font-display text-lg leading-snug text-balance">{tm("seeTitle", { name: compare.name || "…" })}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <figure className="m-0">
                  <div className="flex aspect-[3/4] flex-col overflow-hidden rounded-xl border-2 border-coral bg-paper p-2 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element -- the sender's own photo, as the editor already shows it */}
                    <img src={compare.photo} alt="" draggable={false} className="h-[58%] w-full rounded-md object-cover" />
                    <p className="mt-2 line-clamp-3 font-display text-[11px] leading-snug text-ink [overflow-wrap:anywhere]" aria-hidden="true">
                      {compare.line}
                    </p>
                  </div>
                  <figcaption className="mt-1.5 text-center text-xs font-medium text-ink">{tm("seeWith", { count: compare.photos })}</figcaption>
                </figure>
                <figure className="m-0">
                  <div className="flex aspect-[3/4] flex-col overflow-hidden rounded-xl border border-line bg-paper p-2">
                    <p className="line-clamp-[9] font-display text-[11px] leading-snug text-ink-soft [overflow-wrap:anywhere]" aria-hidden="true">
                      {compare.line}
                    </p>
                  </div>
                  <figcaption className="mt-1.5 text-center text-xs text-ink-soft">{tm("seeFree")}</figcaption>
                </figure>
              </div>
            </div>
          ) : panel.thumbs?.length ? (
            <div className="mb-3 flex items-center" aria-hidden="true" data-testid="pay-note-photos">
              {panel.thumbs.slice(0, 4).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element -- the sender's own photo, as the editor already shows it
                <img key={src} src={src} alt="" draggable={false} className={cn("size-12 rounded-lg border-2 border-card object-cover shadow-sm", i > 0 && "-ml-2")} />
              ))}
              {panel.photos > 4 ? (
                <span className="-ml-2 grid size-12 place-items-center rounded-lg border-2 border-card bg-blush/40 text-sm font-medium text-ink">+{panel.photos - 4}</span>
              ) : null}
            </div>
          ) : null}
          <p className="font-display text-2xl leading-tight text-balance" data-testid={panel.kind === "note" ? "pay-note-headline" : "pay-one-headline"}>
            {panel.headline}
          </p>
          <p className="mt-2 text-base" data-testid="pay-note-price">
            {personalFor !== null ? <s className="mr-1.5 text-muted-foreground">{money(listedForTemplate)}</s> : null}
            <span className="font-semibold">{money(forTemplateAmount)}</span> <span className="text-ink-soft">{tm("noteOnce")}</span>
          </p>
          <ul className="mt-3 grid gap-1.5 text-sm text-ink" data-testid="pay-note-checks">
            {panel.checks.map((text) => (
              <li key={text} className="flex items-start gap-2">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-moss" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : reaction ? (
        <p className="font-display text-xl leading-snug" data-testid="pay-reaction">
          “{reaction.text}” <span aria-hidden="true">{reaction.emoji}</span>{" "}
          <span className="font-sans text-xs whitespace-nowrap text-muted-foreground">· {t("realReaction")}</span>
        </p>
      ) : (
        <p className="font-display text-xl leading-snug">{t("payTitle")}</p>
      )}
      {features.length && !panel ? (
        <p className="mt-1.5 text-sm font-medium text-ink" data-testid="pay-benefits">
          {t("payIncludes", { features: features.join(" · ") })}
        </p>
      ) : null}
      {panel ? null : (
        <p className="mt-1 text-sm text-ink-soft">
          {manifest.tier === "free" ? tm(guest ? "extrasGuestIntro" : "extrasIntro") : t(guest ? "payGuestBlurb" : "payBlurb")}
        </p>
      )}
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
      {/* The Christmas e-mail's bonus, said once where it is paid for (lib/lifecycle/holiday-extras.ts): only while it is given. */}
      {treeTag ? (
        <p className="mt-3 flex items-center gap-2.5 text-sm text-ink" data-testid="pay-tree-tag">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/occasions/christmas.webp" alt="" width={24} height={24} className="size-6 shrink-0" />
          {/* "A note with your photos" (keepRow) is paid but leaves the template locked, so it gets no tag: said here, beside it. */}
          <span>{tm(keepRow ? "treeTagUnlock" : "treeTag")}</span>
        </p>
      ) : null}

      {panel ? null : chooser}

      {personalOn && personal ? (
        // Said where the price is: it's a personal price, and when it ends (EU law asks for the first).
        <p className="mt-3 rounded-lg bg-blush/30 px-3 py-2.5 text-sm text-ink" data-testid="personal-price-note">
          {tm("personalPrice", { ends: personalPriceEnds(personal.endsAt, locale, currency) })}
        </p>
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
      <OneTapPay
        request={{ ...paywallRequest({ plan: chosen, slug, bump: bumpOn, second }), currency, returnTo, locale, ...(personalOn ? { personalPrice: true } : {}) }}
        locale={locale}
        disabled={paying || blocked}
        sale={{ template: slug, product: chosen, bump: bumpOn, second: second !== null, reply: freeReply, guest, total, category: manifest.tier, currency, letterArm, payArm, keepArm }}
      />
      {panel ? (
        <>
          {note ? (
            <p className="mt-4 text-center text-[13px] text-balance text-ink-soft" data-testid="pay-note-compare">
              {tm("noteCompare", { premium: money(PRODUCTS.single.amounts[currency]), price: money(forTemplateAmount) })}
            </p>
          ) : null}
          <details className={cn("group rounded-lg border border-line px-3", note ? "mt-3" : "mt-4")} data-testid={panel.kind === "note" ? "pay-note-more" : "pay-one-more"}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm text-ink-soft [&::-webkit-details-marker]:hidden">
              <span>{panel.more}</span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0 transition-transform group-open:rotate-90" />
            </summary>
            <div className="pb-3">
              {chooser}
              {keepRow ? (
                // The smaller thing, said beside the bigger ones: nobody pays the full price without having been shown it.
                <button
                  type="button"
                  onClick={keepRow.onPay}
                  disabled={keepRow.busy || paying || blocked}
                  className="mt-2 flex w-full items-start gap-3 rounded-xl border border-line p-3 text-left hover:border-ink/40 disabled:opacity-60"
                  data-testid="more-note-photos"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-3 leading-6">
                      <span className="min-w-0 font-medium">{tm("moreNotePhotos")}</span>
                      <span className="shrink-0 font-semibold">{keepRow.price}</span>
                    </span>
                    <span className="block text-xs text-muted-foreground">{tm("moreNotePhotosBlurb", { n: keepRow.max })}</span>
                  </span>
                </button>
              ) : null}
            </div>
          </details>
        </>
      ) : null}
      <p className="mt-4 text-center text-xs text-balance text-muted-foreground">
        {t("payNote")}
        {guest ? ` ${t("uploadsAfterPay")}` : null}
        {panel && guest ? ` ${tm("noteGuest")}` : null}
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
