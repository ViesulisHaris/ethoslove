"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GiftData } from "@/lib/gift/schema";
import { env } from "@/lib/env";
import { track } from "@/lib/analytics/track";
import { formatAmount, formatRound, pairApart } from "@/lib/pricing/products";
import { REMINDER_NAME_MAX, formatMonthDay, reminderDateFor, reminderOccasionFor, type Reminder } from "@/lib/lifecycle/reminders";
import { dayAway, dayName, localToday, nextDays, occasionIcon, occasionPath, type NextDay } from "@/lib/lifecycle/next-days";
import { DayRows } from "@/components/pricing/day-rows";
import { getManifest } from "@/templates/manifests";
import { useEntitlements, type PairOffer } from "@/components/pricing/entitlements";
import { startCheckout, startOneTapCheckout, useCheckoutError } from "@/components/pricing/checkout";
import { walletHere, type Wallet } from "@/components/pricing/wallet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Stripe's button and its code come only for a browser with a wallet, once the card is in view.
const PairWallet = dynamic(() => import("./pair-wallet").then((m) => m.PairWallet), { ssr: false });

/** How long the wallet button may take to appear before the card button takes its place. */
const WALLET_WAIT_MS = 4000;

type Pay = "idle" | "paying" | "declined";

/**
 * "Nobody likes to be forgotten.": two more gifts, offered on the share screen right under the link
 * of a gift just paid for (docs/marketing/growth-build/DESIGN-after-payment.md). The server decides
 * who sees it (/api/entitlements `pairOffer`, lib/commerce/gift-credits.ts pairAllowed); this only
 * draws what it says, and nothing at all, no frame and no space, when it says no. A gift sent with
 * one of the two shows the quiet "This was one of your gifts" instead.
 */
export function TwoMoreGifts({ data, usedGift = false, preview }: { data: GiftData; usedGift?: boolean; preview?: PairPreviewState }) {
  const { data: ent } = useEntitlements();
  const [bought, setBought] = useState(preview === "bought");
  const days = useNextDays(data);
  if (usedGift && ent) return <UsedOne left={ent.giftsReady} days={days} name={data.recipientName} />;
  if (bought) return <Bought days={days} name={data.recipientName} />;
  if (!ent?.pairOffer) return null;
  return <Offer offer={ent.pairOffer} days={days} name={data.recipientName} onBought={() => setBought(true)} initialPay={preview === "paying" || preview === "declined" ? preview : "idle"} />;
}

/**
 * A state the development page (app/.../(editor)/share-preview) can open the card in, for pictures
 * and browser tests: paying, declined and bought only ever follow a real wallet payment otherwise.
 */
export type PairPreviewState = "paying" | "declined" | "bought";

/**
 * The next two days for this recipient: Christmas and Valentine's Day until the account's saved days
 * answer, then those too (GET /api/reminders, as the reminder card reads it), and again each time
 * the reminder card below saves one ("ethos:reminder-saved").
 */
function useNextDays(data: GiftData): NextDay[] {
  const [made] = useState(() => {
    const occasions = getManifest(data.templateSlug)?.occasions;
    if (occasions?.[0] === "christmas") return { occasion: "christmas" as const, month: 12, day: 25 };
    const occasion = reminderOccasionFor(occasions);
    return { occasion, ...reminderDateFor(occasion, data.countdown, new Date()) };
  });
  const [saved, setSaved] = useState<Reminder[]>([]);
  const who = data.recipientName.trim().slice(0, REMINDER_NAME_MAX).toLowerCase();
  const read = useCallback(() => {
    if (!who) return () => {};
    let live = true;
    fetch("/api/reminders", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { reminders?: Reminder[] } | null) => {
        if (!live || !body?.reminders) return;
        setSaved(body.reminders.filter((r) => r.recipientName.trim().toLowerCase() === who));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [who]);
  useEffect(() => {
    const stop = read();
    const again = () => void read();
    window.addEventListener("ethos:reminder-saved", again);
    return () => {
      stop();
      window.removeEventListener("ethos:reminder-saved", again);
    };
  }, [read]);
  // Recomputed only when what it reads changes, so the rows never move unless the days really differ.
  return useMemo(() => nextDays(localToday(), saved, made), [saved, made]);
}

/** A day's name as the reminder card says it: "Mia's birthday", "Your anniversary", "Valentine's Day". */
function useDayName(name: string) {
  const t = useTranslations("editor.share.pair");
  const r = useTranslations("lifecycle.remind");
  return (day: Pick<NextDay, "kind" | "name">) => dayName(day, t, r, name);
}

function Days({ days, name }: { days: NextDay[]; name: string }) {
  const t = useTranslations("editor.share.pair");
  const locale = useLocale() === "es" ? "es" : "en";
  const named = useDayName(name);
  return (
    <DayRows
      rows={days.map((d) => ({ key: `${d.kind}-${d.month}-${d.day}-${d.name ?? ""}`, icon: occasionIcon(d.kind), name: named(d), date: formatMonthDay(d, locale), away: dayAway(d.daysAway, t) }))}
    />
  );
}

/** Exported for the unit tests (tests/unit/two-more-gifts.test.tsx), like the two below. */
export function Offer({ offer, days, name, onBought, initialPay = "idle" }: { offer: PairOffer; days: NextDay[]; name: string; onBought: () => void; initialPay?: Pay }) {
  const t = useTranslations("editor.share.pair");
  const locale: "en" | "es" = useLocale() === "es" ? "es" : "en";
  const showCheckoutError = useCheckoutError();
  const price = formatRound(offer.amount, offer.currency, locale);
  const request = { product: "pair" as const, currency: offer.currency, locale, returnTo: "/dashboard" };

  // Which way to pay: the wallet's own button where there is one (and a key to draw it with), else
  // the card button. The wallet falls back to the card button, silently, when it can't be drawn.
  const key = env.stripePublishableKey;
  const [wallet] = useState<Wallet | null>(() => (key && typeof window !== "undefined" ? walletHere() : null));
  const [walletState, setWalletState] = useState<"waiting" | "ready" | "none">(wallet ? "waiting" : "none");
  const [secret, setSecret] = useState<{ clientSecret: string; sessionId?: string } | null>(null);
  const [pay, setPay] = useState<Pay>(initialPay);
  const [cardBusy, setCardBusy] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  // Counted once when the card is first seen; the wallet's session is asked for then too.
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setInView(true);
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (inView) track("pair_offer_shown", { currency: offer.currency, wallet: wallet ?? "none" });
  }, [inView, offer.currency, wallet]);

  useEffect(() => {
    if (!inView || walletState !== "waiting") return;
    let live = true;
    const timer = window.setTimeout(() => live && setWalletState((s) => (s === "waiting" ? "none" : s)), WALLET_WAIT_MS);
    void startOneTapCheckout(request, { waiver: false }).then((result) => {
      if (!live) return;
      if ("clientSecret" in result) setSecret(result);
      else setWalletState("none");
    });
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
    // The request is the offer's: the same offer asks once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, walletState === "waiting"]);

  const payByCard = async () => {
    if (cardBusy) return;
    setCardBusy(true);
    setPay("paying");
    track("pair_clicked", { how: "card" });
    const result = await startCheckout(request, { total: offer.amount, category: "pair" });
    if ("url" in result) {
      window.location.assign(result.url);
      return;
    }
    setCardBusy(false);
    setPay("idle");
    showCheckoutError(result.error);
  };

  const events = useMemo(
    () => ({
      onReady: () => {
        setWalletState("ready");
        track("pair_wallet_shown", { wallet: wallet ?? "none" });
      },
      onNone: () => setWalletState("none"),
      onStart: () => {
        setPay("paying");
        track("pair_clicked", { how: "wallet" });
      },
      onPaid: () => {
        track("pair_paid", { how: "wallet" });
        // Fulfilled here beside the webhook; the webhook alone would also do it.
        if (secret?.sessionId) void fetch("/api/money/pair/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId: secret.sessionId }) }).catch(() => {});
        onBought();
      },
      onDeclined: () => {
        setPay("declined");
        track("pair_declined", { how: "wallet" });
      },
    }),
    [wallet, secret, onBought],
  );

  const useWallet = wallet !== null && walletState !== "none";
  const paying = pay === "paying";

  return (
    <section ref={cardRef} className="mt-7 rounded-2xl border border-ink bg-card p-5" data-testid="pair-offer">
      <h3 className="font-display text-2xl leading-tight text-balance text-ink">{t("title")}</h3>
      <p className="mt-1.5 text-[15px] text-ink-soft">{t("next")}</p>
      <Days days={days} name={name} />

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-ink">{t("both")}</p>
          <p className="text-sm text-ink-soft">{t("apart", { price: formatAmount(pairApart(offer.currency), offer.currency, locale) })}</p>
        </div>
        <p className="font-display text-[32px] leading-none text-ink" data-testid="pair-price">
          {price}
        </p>
      </div>

      <ul className="mt-4 space-y-2">
        {(["tickAny", "tickMidnight", "tickBack"] as const).map((key) => (
          <li key={key} className="flex items-start gap-2.5 text-sm text-ink">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-moss" />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>

      {pay === "declined" ? (
        <p role="alert" className="mt-5 flex items-start gap-2.5 rounded-xl border border-coral/40 bg-coral/10 p-3.5 text-[15px] text-ink" data-testid="pair-declined">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-coral" />
          <span>{t("declined")}</span>
        </p>
      ) : null}

      <div className="mt-5">
        {useWallet ? (
          <>
            {/* The wallet's own button, with a black pill holding its place while it comes, so nothing moves.
                It stays mounted while it pays: the wallet's confirmation runs inside it. */}
            <div className="relative h-12" data-testid="pair-wallet">
              {secret && key ? <PairWallet clientSecret={secret.clientSecret} publishableKey={key} locale={locale} events={events} /> : null}
              {paying ? (
                <span role="status" className="absolute inset-0 flex items-center justify-center gap-2 rounded-full bg-primary/55 text-base font-medium text-primary-foreground" data-testid="pair-paying">
                  <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                  {t("paying")}
                </span>
              ) : walletState !== "ready" ? (
                <span role="status" aria-label={t("paying")} className="absolute inset-0 flex items-center justify-center rounded-full bg-black text-white" data-testid="pair-wallet-holding">
                  <Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
                </span>
              ) : null}
            </div>
            <p className={cn("mt-3 text-center", paying && "hidden")}>
              <button
                type="button"
                onClick={() => void payByCard()}
                disabled={cardBusy}
                className="inline-flex min-h-11 items-center text-[15px] text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
                data-testid="pair-by-card"
              >
                {t("byCard")}
              </button>
            </p>
          </>
        ) : (
          <Button type="button" onClick={() => void payByCard()} disabled={paying} className="h-12 w-full rounded-full text-base" data-testid="pair-add">
            {paying ? <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : null}
            <span>{paying ? t("paying") : t("add", { price })}</span>
          </Button>
        )}
      </div>

      <p className={cn("text-center text-[13px] text-muted-foreground", useWallet && !paying ? "mt-2" : "mt-4")}>{t("foot")}</p>
      <p className="mt-1 text-center text-[13px] text-muted-foreground">
        {t("notice")}{" "}
        <Link href="/legal/terms" target="_blank" className="underline underline-offset-2 hover:text-ink">
          {t("terms")}
        </Link>
      </p>
    </section>
  );
}

/** Picture a7: paid. The two days again, and the first one to start now. */
export function Bought({ days, name }: { days: NextDay[]; name: string }) {
  const t = useTranslations("editor.share.pair");
  const named = useDayName(name);
  const first = days[0];
  const start = first && first.kind !== "other" ? { href: occasionPath(first.kind), label: t("startOne", { day: named(first) }) } : { href: "/templates", label: t("startAny") };
  return (
    <section className="mt-7 rounded-2xl border border-border bg-card p-5" data-testid="pair-bought" aria-live="polite">
      <div className="flex items-start gap-3">
        <Check aria-hidden="true" className="mt-1 size-6 shrink-0 text-moss" />
        <div className="min-w-0">
          <h3 className="font-display text-2xl leading-tight text-ink">{t("readyTitle")}</h3>
          <p className="mt-1 text-[15px] text-ink-soft">{t("readyLine")}</p>
        </div>
      </div>
      <Days days={days} name={name} />
      <Button asChild variant="outline" className="mt-5 h-12 w-full rounded-full text-base">
        <Link href={start.href}>{start.label}</Link>
      </Button>
      <p className="mt-3 text-center text-sm text-muted-foreground">{t("readyStay")}</p>
    </section>
  );
}

/** Picture a8: this gift went out on one of the two. */
export function UsedOne({ left, days, name }: { left: number; days: NextDay[]; name: string }) {
  const t = useTranslations("editor.share.pair");
  const named = useDayName(name);
  const next = days[0];
  return (
    <section className="mt-7 flex items-start gap-3 rounded-2xl border border-border bg-card p-5" data-testid="pair-used">
      <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-moss" />
      <div className="min-w-0">
        <p className="text-base font-medium text-ink">{t("usedOne")}</p>
        <p className="mt-1 text-[15px] text-ink-soft">{left > 0 && next ? t("leftOne", { day: named(next) }) : t("leftNone")}</p>
      </div>
    </section>
  );
}
