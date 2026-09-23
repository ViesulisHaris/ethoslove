"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { track } from "@/lib/analytics/track";
import { PRODUCTS, formatAmount, type Currency } from "@/lib/pricing/products";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { startCheckout, useCheckoutError } from "./checkout";
import { useEntitlements } from "./entitlements";
import { RecoveryOptIn } from "./recovery-opt-in";

const FREE = ["dates", "plans", "ldr", "deck"] as const;
const PASS_FEATURES = ["templates", "extras", "packs", "invite"] as const;

/**
 * "Ethos for Two": a year of every template and every game pack for both of them, paid once. Not a
 * subscription, and it says so where the price is: nothing renews without the buyer choosing to.
 * Arriving with ?renew=pass (the renewal email, the account page, a game pack's "every pack" link)
 * the card is picked out; it talks about renewing only to someone whose own pass is running, since
 * the game packs send first-time buyers the same way.
 */
export function PassCard({
  currency,
  paymentsEnabled,
  renewing,
  className,
}: {
  currency: Currency;
  paymentsEnabled: boolean;
  /** Arrived with ?renew=pass. */
  renewing: boolean;
  className?: string;
}) {
  const t = useTranslations("money.pass");
  const tPricing = useTranslations("pricing");
  const locale = useLocale() === "es" ? "es" : "en";
  const [busy, setBusy] = useState(false);
  const [remindMe, setRemindMe] = useState(false);
  const showCheckoutError = useCheckoutError();
  const ref = useRef<HTMLElement>(null);
  // Someone whose own pass is running is renewing it, whichever way they arrived: buying again adds
  // a year from its end, and the card should say that rather than sell them a first one.
  const { data: held } = useEntitlements(0, paymentsEnabled);
  const renewal = Boolean(held?.pass?.isOwner);

  useEffect(() => {
    if (renewing) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [renewing]);

  const buy = async () => {
    if (!paymentsEnabled) return void toast(tPricing("comingSoon"));
    setBusy(true);
    track("pay_clicked", { product: "pass", source: "pricing", renew: renewal });
    const result = await startCheckout({ product: "pass", currency, locale, returnTo: "/account", remindMe });
    if ("url" in result) return void window.location.assign(result.url);
    setBusy(false);
    showCheckoutError(result.error);
  };

  return (
    <article
      ref={ref}
      id="for-two"
      data-testid="pass-card"
      className={cn(
        "relative flex scroll-mt-28 flex-col overflow-hidden rounded-[28px] bg-forest p-6 text-cream shadow-lift sm:p-8",
        renewing && "ring-4 ring-blush ring-offset-4 ring-offset-paper",
        className,
      )}
    >
      <span className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-rose/30 blur-3xl" aria-hidden="true" />
      <p className="relative text-eyebrow text-blush">{t("eyebrow")}</p>
      <h2 className="relative mt-3 max-w-md font-display text-[32px] leading-[1.05] sm:text-[38px]">{t("title")}</h2>
      <p className="relative mt-5 flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-[3.2rem] leading-none tracking-tight">{formatAmount(PRODUCTS.pass.amounts[currency], currency, locale)}</span>
        <span className="text-[15px] text-cream/70">{t("per")}</span>
      </p>
      <p className="relative mt-3 max-w-md text-[15px] text-cream/80">{t("blurb")}</p>
      <ul className="relative mt-6 grid gap-2.5 sm:grid-cols-2">
        {PASS_FEATURES.map((k) => (
          <li key={k} className="flex items-start gap-2.5 text-[15px] text-cream/90">
            <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-blush" />
            {t(`features.${k}`)}
          </li>
        ))}
      </ul>
      {renewal ? <p className="relative mt-6 rounded-2xl bg-white/10 p-4 text-[14px] text-cream/90" data-testid="pass-renewing">{t("renewing")}</p> : null}
      <div className="relative mt-auto pt-7">
        <button
          type="button"
          onClick={buy}
          disabled={busy}
          className={cn("btn-rose inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-transform active:scale-[0.98] sm:w-auto", busy && "opacity-80")}
          data-testid="buy-pass"
        >
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          {renewal ? t("renewCta") : t("cta")}
        </button>
        {paymentsEnabled ? <RecoveryOptIn checked={remindMe} onChange={setRemindMe} disabled={busy} className="mt-2 text-cream/75" /> : null}
        <p className="mt-3 text-[13px] text-cream/60">{t("note")}</p>
      </div>
    </article>
  );
}

/** What costs nothing, for good: the part of Ethos that brings couples back every weekend. */
export function FreeForever() {
  const t = useTranslations("forTwo");
  return (
    <div className="grid gap-6 rounded-[28px] bg-white p-6 shadow-soft ring-1 ring-forest/5 sm:p-8 lg:grid-cols-[1fr_1.4fr] lg:items-center">
      <div>
        <p className="text-eyebrow text-moss">{t("free.eyebrow")}</p>
        <h2 className="mt-3 font-display text-[34px] leading-none text-forest">{t("free.price")}</h2>
        <p className="mt-2 text-[15px] text-forest/70">{t("free.blurb")}</p>
        <Link href="/dates" className="mt-6 inline-flex h-12 items-center rounded-full border border-forest/15 px-6 text-[15px] font-semibold text-forest hover:bg-forest/5">
          {t("free.cta")}
        </Link>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {FREE.map((k) => (
          <li key={k} className="flex items-start gap-2.5 text-[15px] text-forest/85">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-moss" />
            {t(`free.${k}`)}
          </li>
        ))}
      </ul>
    </div>
  );
}
