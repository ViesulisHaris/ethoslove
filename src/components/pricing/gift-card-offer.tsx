"use client";

import { useId, useState } from "react";
import { Loader2, PenLine } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { track } from "@/lib/analytics/track";
import { PRODUCTS, formatAmount, type Currency } from "@/lib/pricing/products";
import { cn } from "@/lib/utils";
import { startCheckout, useCheckoutError } from "./checkout";
import { GIFT_CARD_NAME_MAX, GIFT_CARD_NOTE_MAX, giftCardTouch } from "./offers";

/**
 * "Give Everything": the Everything unlock bought for somebody else, as a code. The buyer gets the
 * code by email (and on the success page); whoever redeems it gets "*" on their own account. Their
 * name and a note are optional and closed by default: the email prints them beside the code, for a
 * buyer who forwards it or prints it out. They are kept in our database until the card is made, never
 * sent to Stripe. Shown only while gift cards are on sale (giftCardsOnSale).
 */
export function GiftCardOffer({
  currency,
  paymentsEnabled,
  className,
}: {
  currency: Currency;
  paymentsEnabled: boolean;
  className?: string;
}) {
  const t = useTranslations("money.giftcard");
  const tPricing = useTranslations("pricing");
  const locale = useLocale() === "es" ? "es" : "en";
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [personal, setPersonal] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const showCheckoutError = useCheckoutError();

  const buy = async () => {
    if (!paymentsEnabled) return void toast(tPricing("comingSoon"));
    setBusy(true);
    const giftCard = personal ? giftCardTouch(name, note) : undefined;
    track("pay_clicked", { product: "giftcard", source: "pricing", personal: Boolean(giftCard) });
    const result = await startCheckout({ product: "giftcard", currency, locale, returnTo: "/account", ...(giftCard ? { giftCard } : {}) });
    if ("url" in result) return void window.location.assign(result.url);
    setBusy(false);
    showCheckoutError(result.error);
  };

  const field = "w-full rounded-2xl border border-ink/15 bg-paper px-4 text-base text-ink outline-none placeholder:text-ink-soft/70 focus:border-ink focus-visible:ring-2 focus-visible:ring-rose/30";
  const quietLink = "inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline focus-visible:text-ink focus-visible:underline";

  // In the dress of "Make it special" beside it (the gallery card's paper, PLAN-pricing.md 2): its name and
  // price, one line, the button. What it holds, how long a code lasts and when it is emailed are in "What
  // each one includes" over the two cards; the name and the note stay one tap away, as before. A code is
  // redeemed from the footer's "Redeem a gift card".
  return (
    <article
      data-testid="giftcard-card"
      className={cn(
        "relative flex flex-col gap-4 rounded-[28px] bg-card p-6 shadow-[0_26px_48px_-34px_rgba(74,32,24,0.55)] ring-1 ring-ink/[0.07] sm:px-7",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h3 className="font-display text-[1.5rem] leading-tight text-ink">{t("title")}</h3>
            <span className="font-display text-[1.75rem] leading-none tracking-tight text-ink tabular-nums" data-testid="price-giftcard">
              {formatAmount(PRODUCTS.giftcard.amounts[currency], currency, locale)}
            </span>
          </div>
          <p className="mt-2 max-w-xl text-[0.9375rem] leading-snug text-ink-soft">{tPricing("page.giftCardLine")}</p>
        </div>
        <button
          type="button"
          onClick={buy}
          disabled={busy}
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 self-start rounded-full border border-ink/20 px-6 text-[15px] font-semibold text-ink transition-[background-color,border-color,scale] duration-200 hover:border-ink/45 hover:bg-paper active:scale-[0.98] active:bg-paper-deep disabled:pointer-events-none disabled:opacity-60 sm:self-center"
          data-testid="buy-giftcard"
        >
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          {t("cta")}
        </button>
      </div>

      {personal ? (
        <div className="grid gap-3 sm:grid-cols-2" data-testid="giftcard-personal">
          <div>
            <label htmlFor={`${id}-name`} className="text-sm font-medium text-ink">
              {t("nameLabel")}
            </label>
            <input
              id={`${id}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={GIFT_CARD_NAME_MAX}
              autoComplete="off"
              disabled={busy}
              className={cn(field, "mt-1.5 h-11")}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-note`} className="text-sm font-medium text-ink">
              {t("noteLabel")}
            </label>
            <textarea
              id={`${id}-note`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={GIFT_CARD_NOTE_MAX}
              rows={3}
              disabled={busy}
              placeholder={t("notePlaceholder")}
              className={cn(field, "mt-1.5 resize-none py-3")}
            />
            <p className="mt-1 text-sm text-ink-soft">{t("noteHelp")}</p>
          </div>
        </div>
      ) : null}

      {personal ? null : (
        <button type="button" onClick={() => setPersonal(true)} className={cn(quietLink, "-my-1 self-start")} data-testid="giftcard-personal-toggle">
          <PenLine aria-hidden="true" className="size-3.5" />
          {tPricing("page.giftCardNote")}
        </button>
      )}
    </article>
  );
}
