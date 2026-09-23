"use client";

import { useId, useState } from "react";
import { ArrowRight, Check, Gift, Loader2, PenLine } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { track } from "@/lib/analytics/track";
import { GIFT_CARD_MONTHS, PRODUCTS, formatAmount, type Currency } from "@/lib/pricing/products";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { startCheckout, useCheckoutError } from "./checkout";
import { GIFT_CARD_NAME_MAX, GIFT_CARD_NOTE_MAX, giftCardTouch } from "./offers";

const FEATURES = ["templates", "forever", "valid"] as const;

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

  const field = "w-full rounded-2xl border border-forest/15 bg-white/80 px-4 text-base text-forest outline-none placeholder:text-forest/40 focus:border-forest";

  return (
    <article data-testid="giftcard-card" className={cn("relative flex flex-col overflow-hidden rounded-[28px] bg-blush-paper p-6 ring-1 ring-rose/15 sm:p-8", className)}>
      <span className="pointer-events-none absolute -right-6 -bottom-8 text-rose/10" aria-hidden="true">
        <Gift className="size-40" strokeWidth={1.25} />
      </span>
      <p className="relative text-eyebrow text-rose-ink">{t("eyebrow")}</p>
      <h2 className="relative mt-3 font-display text-[32px] leading-[1.05] text-forest sm:text-[38px]">{t("title")}</h2>
      <p className="relative mt-5 font-display text-[3.2rem] leading-none tracking-tight text-forest">{formatAmount(PRODUCTS.giftcard.amounts[currency], currency, locale)}</p>
      <p className="relative mt-3 text-[15px] text-forest/75">{t("blurb")}</p>
      <ul className="relative mt-6 grid gap-2.5">
        {FEATURES.map((k) => (
          <li key={k} className="flex items-start gap-2.5 text-[15px] text-forest/85">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-rose" />
            {t(`features.${k}`, { months: GIFT_CARD_MONTHS })}
          </li>
        ))}
      </ul>

      {personal ? (
        <div className="relative mt-6 grid gap-3" data-testid="giftcard-personal">
          <div>
            <label htmlFor={`${id}-name`} className="text-sm font-medium text-forest">
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
          <div>
            <label htmlFor={`${id}-note`} className="text-sm font-medium text-forest">
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
            <p className="mt-1 text-[13px] text-forest/55">{t("noteHelp")}</p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setPersonal(true)}
          className="relative mt-5 inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-medium text-forest/75 underline-offset-4 hover:text-forest hover:underline"
          data-testid="giftcard-personal-toggle"
        >
          <PenLine aria-hidden="true" className="size-3.5" />
          {t("personalise")}
        </button>
      )}

      <div className="relative mt-auto pt-7">
        <button
          type="button"
          onClick={buy}
          disabled={busy}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-forest bg-transparent px-6 text-[15px] font-semibold text-forest transition-colors hover:bg-forest hover:text-cream active:scale-[0.98] disabled:opacity-60"
          data-testid="buy-giftcard"
        >
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          {t("cta")}
        </button>
        <p className="mt-3 text-[13px] text-forest/60">{t("note")}</p>
        <Link href="/redeem" className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-rose-ink underline-offset-4 hover:underline">
          {t("redeem")}
          <ArrowRight aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
