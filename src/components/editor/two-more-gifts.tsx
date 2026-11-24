"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { GiftData } from "@/lib/gift/schema";
import { env } from "@/lib/env";
import { track } from "@/lib/analytics/track";
import { formatAmount, formatRound, pairApart } from "@/lib/pricing/products";
import { formatMonthDay, type Reminder } from "@/lib/lifecycle/reminders";
import { dayAway, dayArgs, dayName, occasionIcon, occasionPath, type NextDay } from "@/lib/lifecycle/next-days";
import { DayRows } from "@/components/pricing/day-rows";
import { useNextDays } from "./pair-used";
import type { Entitlements, PairOffer } from "@/components/pricing/entitlements";
import { startCheckout, startOneTapCheckout, useCheckoutError } from "@/components/pricing/checkout";
import { googlePayReady, walletHere, type Wallet } from "@/components/pricing/wallet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Stripe's button and its code come only for a browser with a wallet, once the card is in view.
const PairWallet = dynamic(() => import("./pair-wallet").then((m) => m.PairWallet), { ssr: false });

/** How long the wallet button may take to appear before the card button takes its place. */
const WALLET_WAIT_MS = 4000;

type Pay = "idle" | "paying" | "declined";

/**
 * What the share screen is handed to draw the card with, all of it known before the screen's first
 * frame (the publish sheet loads it while the sheet is open), so the card is either there from the
 * start or never: nothing under the link moves when it arrives.
 */
export type PairOnShare = {
  /** /api/entitlements, read while the sheet was open: `pairOffer` says this account may buy them. */
  ent: Entitlements | null;
  /** This publish followed a payment for this gift (back from checkout, the gift's own purchase paid in the last day, something in it paid). */
  afterPayment: boolean;
  /** Gifts ready left after this one, when it went out on one (the share screen's UsedGiftLine). */
  left: number;
  /** The account's saved days (GET /api/reminders), read while the sheet was open; null when they weren't. */
  saved?: Reminder[] | null;
};

/**
 * "Nobody likes to be forgotten.": two more gifts, offered on the share screen right under the link
 * of a gift just paid for (docs/marketing/growth-build/DESIGN-after-payment.md 2). Who may buy them
 * is the server's (`pairOffer`, lib/commerce/gift-credits.ts pairAllowed); when is the sheet's:
 * only after a payment for this very gift (`afterPayment`), never after a free note, a free reply or
 * a gift on a template already owned. Otherwise nothing at all, no frame and no space, and nothing
 * asked of the server. A gift sent with one of the two gets the quiet line of pair-used.tsx instead,
 * drawn by the share screen itself.
 */
export function TwoMoreGifts({ data, ent, afterPayment, saved, preview }: PairOnShare & { data: GiftData; preview?: PairPreviewState }) {
  const [bought, setBought] = useState(preview === "bought");
  const offered = afterPayment && Boolean(ent?.pairOffer);
  const days = useNextDays(data, saved, bought || offered);
  if (bought) return <Bought days={days} name={data.recipientName} />;
  if (!offered || !ent?.pairOffer) return null;
  return (
    <Offer
      offer={ent.pairOffer}
      days={days}
      name={data.recipientName}
      onBought={() => setBought(true)}
      initialPay={preview === "paying" || preview === "declined" ? preview : "idle"}
      previewWallet={preview === "wallet"}
    />
  );
}

/**
 * A state the development page (app/.../(editor)/share-preview) can open the card in, for pictures
 * and browser tests: paying, declined and bought only ever follow a real wallet payment otherwise,
 * and "wallet" draws a stand-in for Stripe's wallet button arriving (Stripe.js never loads in tests).
 */
export type PairPreviewState = "paying" | "declined" | "bought" | "wallet";

/** A day's name as the reminder card says it: "Mia's birthday", "Your anniversary", "Valentine's Day". */
function useDayName(name: string) {
  const t = useTranslations("editor.share.pair");
  const r = useTranslations("lifecycle.remind");
  return (day: Pick<NextDay, "kind" | "name">) => dayName(day, t, r, name);
}

function Days({ days, name, short = false }: { days: NextDay[]; name: string; short?: boolean }) {
  const t = useTranslations("editor.share.pair");
  const locale = useLocale() === "es" ? "es" : "en";
  const named = useDayName(name);
  return (
    <DayRows
      short={short}
      rows={days.map((d) => ({ key: `${d.kind}-${d.month}-${d.day}-${d.name ?? ""}`, icon: occasionIcon(d.kind), name: named(d), date: formatMonthDay(d, locale), away: dayAway(d.daysAway, t) }))}
    />
  );
}

/** Exported for the unit tests (tests/unit/two-more-gifts.test.tsx), like the two below. */
export function Offer({
  offer,
  days,
  name,
  onBought,
  initialPay = "idle",
  previewWallet = false,
}: {
  offer: PairOffer;
  days: NextDay[];
  name: string;
  onBought: () => void;
  initialPay?: Pay;
  /** The development page's "a wallet arrives": a black stand-in button 2.5 s after view, no Stripe, no session. */
  previewWallet?: boolean;
}) {
  const t = useTranslations("editor.share.pair");
  const locale: "en" | "es" = useLocale() === "es" ? "es" : "en";
  const showCheckoutError = useCheckoutError();
  const price = formatRound(offer.amount, offer.currency, locale);
  const request = { product: "pair" as const, currency: offer.currency, locale, returnTo: "/dashboard" };

  // Which way to pay: the wallet's own button where there is one (and a key to draw it with), else
  // the card button. The wallet falls back to the card button, silently, when it can't be drawn.
  const key = env.stripePublishableKey;
  const [wallet] = useState<Wallet | null>(() => (previewWallet ? "apple" : key && typeof window !== "undefined" ? walletHere() : null));
  const [walletState, setWalletState] = useState<"waiting" | "ready" | "none">(wallet ? "waiting" : "none");
  const [secret, setSecret] = useState<{ clientSecret: string; sessionId?: string } | null>(null);
  const [pay, setPay] = useState<Pay>(initialPay);
  const [cardBusy, setCardBusy] = useState(false);
  // Set before the await, so taps in the same tick ask once (state would still read false for them).
  const cardAsked = useRef(false);
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
    if (previewWallet) {
      const shown = window.setTimeout(() => setWalletState("ready"), 2500);
      return () => window.clearTimeout(shown);
    }
    let live = true;
    const timer = window.setTimeout(() => live && setWalletState((s) => (s === "waiting" ? "none" : s)), WALLET_WAIT_MS);
    // Google Pay is only a guess from the browser's name: Stripe confirms it before a session is made.
    const ready = wallet === "google" && key ? googlePayReady(key, locale, offer.amount, offer.currency) : Promise.resolve(true);
    void ready.then(async (here) => {
      if (!live) return;
      if (!here) return setWalletState("none");
      const result = await startOneTapCheckout(request, { waiver: false });
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
    if (cardAsked.current) return;
    cardAsked.current = true;
    setCardBusy(true);
    setPay("paying");
    // Asking for Stripe's page closes the wallet session this card holds (one checkout open at a
    // time, settlePairSessions), so its button would fail from here on, after a refusal or a Back
    // from Stripe alike: the card button takes its place for good.
    setWalletState("none");
    setSecret(null);
    track("pair_clicked", { how: "card" });
    const result = await startCheckout(request, { total: offer.amount, category: "pair" });
    if ("url" in result) {
      window.location.assign(result.url);
      return;
    }
    cardAsked.current = false;
    setCardBusy(false);
    setPay("idle");
    showCheckoutError(result.error);
  };

  // Back from Stripe's page: the browser restores this page as it was left, mid-"One moment…".
  useEffect(() => {
    const back = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      cardAsked.current = false;
      setCardBusy(false);
      setPay((p) => (p === "paying" ? "idle" : p));
    };
    window.addEventListener("pageshow", back);
    return () => window.removeEventListener("pageshow", back);
  }, []);

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
    // On a short screen (max-height 760 px: an iPhone 13 shows 664 px) the rows are one line each and
    // the "next" line is left to screen readers, so the pay control is on the first screen. Spanish
    // ("San Valentín · 14 de febrero" takes two lines at 390 px) still missed by 2 px: the card's top
    // margin is 20 px there, not 28.
    <section ref={cardRef} className="mt-7 rounded-2xl [@media(max-height:760px)]:mt-5 border border-ink bg-card p-5" data-testid="pair-offer">
      <h3 className="font-display text-2xl leading-tight text-balance text-ink">{t("title")}</h3>
      <p className="mt-1.5 text-[15px] text-ink-soft [@media(max-height:760px)]:sr-only">{t("next")}</p>
      <Days days={days} name={name} short />

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-ink">{t("both")}</p>
          <p className="text-sm text-ink-soft">{t("apart", { price: formatAmount(pairApart(offer.currency), offer.currency, locale) })}</p>
        </div>
        <p className="font-display text-[32px] leading-none text-ink" data-testid="pair-price">
          {price}
        </p>
      </div>

      {pay === "declined" ? (
        <p role="alert" className="mt-5 flex items-start gap-2.5 rounded-xl border border-coral/40 bg-coral/10 p-3.5 text-[15px] text-ink" data-testid="pair-declined">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-coral" />
          <span>{t("declined")}</span>
        </p>
      ) : null}

      {/* Two fixed slots, in every state, so nothing is blank and nothing moves when the wallet answers:
          one (48 px) the wallet's button, its holding pill or the card button; two (44 px) "Pay by card
          instead" beside a wallet, else the "Paid once." line in the same place. */}
      <div className="mt-5" data-testid="pair-pay">
        {useWallet ? (
          <>
            {/* The wallet's own button, with a black pill holding its place while it comes, so nothing moves.
                It stays mounted while it pays: the wallet's confirmation runs inside it. */}
            <div className="relative h-12" data-testid="pair-wallet">
              {previewWallet ? (
                walletState === "ready" ? <span className="block h-12 rounded-full bg-black" data-testid="pair-wallet-standin" /> : null
              ) : secret && key ? (
                <PairWallet clientSecret={secret.clientSecret} publishableKey={key} locale={locale} events={events} />
              ) : null}
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
            {/* Hidden while paying but keeping its slot, so the card keeps its height. */}
            <p className={cn("mt-1 flex h-11 items-center justify-center", paying && "invisible")} data-testid="pair-slot-two">
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
        {useWallet ? null : (
          <p className="mt-1 flex h-11 items-center justify-center text-center text-sm text-ink-soft" data-testid="pair-slot-two">
            {t("foot")}
          </p>
        )}
      </div>

      {/* Under the pay control, so it is on the first screen of a short phone. */}
      <ul className="mt-4 space-y-2">
        {/* The 30-day refund is said once, in the foot beside Terms. */}
        {(["tickAny", "tickMidnight"] as const).map((key) => (
          <li key={key} className="flex items-start gap-2.5 text-sm text-ink">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-moss" />
            <span className="text-pretty">{t(key)}</span>
          </li>
        ))}
      </ul>

      {/* The small line: with a wallet, "Paid once." first (as the second slot holds "Pay by card
          instead"); without one, the notice and Terms only. A card that may show a wallet keeps the
          longer line's height for good, through an unseen copy in the same grid cell, so the card's
          height is the same before and after the wallet answers; the line seen is drawn anew (key)
          when it changes, so no text inside it counts as moved. */}
      <div className="mt-4 grid text-center text-[13px] text-pretty text-muted-foreground" data-testid="pair-foot">
        {wallet !== null ? (
          <p aria-hidden="true" className="invisible col-start-1 row-start-1">
            {t("foot")} {t("notice")} {t("terms")}
          </p>
        ) : null}
        <p key={useWallet ? "wallet" : "card"} className="col-start-1 row-start-1">
          {useWallet ? `${t("foot")} ` : null}
          {t("notice")}{" "}
          {/* The 44 px tap target is a pseudo-element around the word, so the line it sits on keeps its height. */}
          {/* A new tab, so the link above stays on this screen (it is only ever drawn here, after a publish). */}
          <Link
            href="/legal/terms"
            target="_blank"
            rel="noopener"
            className="relative underline underline-offset-2 after:absolute after:-inset-x-2 after:-inset-y-3.5 after:content-[''] hover:text-ink focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {t("terms")}
            <span className="sr-only"> {t("newTab")}</span>
          </Link>
        </p>
      </div>
    </section>
  );
}

/** Picture a7: paid. The two days again, and the first one to start now. */
export function Bought({ days, name }: { days: NextDay[]; name: string }) {
  const t = useTranslations("editor.share.pair");
  const first = days[0];
  const start = first && first.kind !== "other" ? { href: occasionPath(first.kind), label: t("startOne", dayArgs(first, name)) } : { href: "/templates", label: t("startAny") };
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
      {/* Wraps rather than running past the pill: "Start the one for {name}'s birthday now" at 320 px, or with a long name. */}
      <Button asChild variant="outline" className="mt-5 h-auto min-h-12 w-full rounded-full py-3 text-center text-base whitespace-normal [overflow-wrap:anywhere]">
        <Link href={start.href}>{start.label}</Link>
      </Button>
      <p className="mt-3 text-center text-sm text-muted-foreground">{t("readyStay")}</p>
    </section>
  );
}

export { UsedOne } from "./pair-used";
