"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { track } from "@/lib/analytics/track";
import { formatAmount, type Currency } from "@/lib/pricing/products";
import type { AheadOccasion } from "@/lib/lifecycle/occasions-ahead";
import { useCheckoutError } from "./checkout";
import { checkoutErrorKey } from "./offers";
import { errorOf, postJson } from "./requests";

/** Set while the card's checkout is opening: the way back to the gift doesn't go by itself then. */
let upgradeStarted = false;
export const upgradeStarting = () => upgradeStarted;

/** What the success page knows about the upgrade it offers (lib/commerce/after-checkout.ts UpgradeAfter). */
export type UpgradeAfterCard = {
  amount: number;
  currency: Currency;
  /** ISO, only while the credit has a deadline (UPGRADE_CREDIT_DAYS): today it never runs out. */
  creditUntil?: string;
  full: number;
  paid: number;
  earlier: boolean;
  sorted: AheadOccasion | null;
  ahead: AheadOccasion[];
};

/**
 * "Every template for the difference", right after a single, a pick three or "make it special".
 * One offer and one button, under the way back to the gift. It talks about the next occasions and
 * says plainly that what they just paid counts towards every template's full price: it is credit,
 * never a discount, and it carries no deadline unless a real one is set. The button needs no
 * password: the server knows the buyer from the checkout they have just finished (POST
 * /api/money/upgrade/after-checkout), and a second tap, here or in another tab, gets the checkout
 * already open rather than a second one to pay.
 */
export function UpgradeAfterPurchase({ sessionId, returnTo, upgrade }: { sessionId: string; returnTo: string; upgrade: UpgradeAfterCard }) {
  const t = useTranslations("money.after");
  const tErrors = useTranslations("money.checkoutErrors");
  const locale = useLocale() === "es" ? "es" : "en";
  const showCheckoutError = useCheckoutError();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  // Taps that land together (a switch that bounces, an assistive tool) are one tap.
  const going = useRef(false);
  const money = (minor: number) => formatAmount(minor, upgrade.currency, locale);
  const price = money(upgrade.amount);

  // Back from Stripe's page by the browser's back button, the page can come back from the cache as
  // it was, with links that have been used up since: ask the server for it again instead.
  useEffect(() => {
    const fresh = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", fresh);
    return () => window.removeEventListener("pageshow", fresh);
  }, []);

  if (gone) return null;

  const names = upgrade.ahead.map((occasion) => t(`ahead.${occasion}`));
  const list = new Intl.ListFormat(locale === "es" ? "es" : "en-GB", { style: "long", type: "conjunction" }).format(names);
  const credit = upgrade.creditUntil
    ? t("creditUntil", { paid: money(upgrade.paid), full: money(upgrade.full), date: new Intl.DateTimeFormat(locale === "es" ? "es" : "en-GB", { dateStyle: "long" }).format(new Date(upgrade.creditUntil)) })
    : upgrade.earlier
      ? t("creditEarlier", { full: money(upgrade.full) })
      : t("credit", { paid: money(upgrade.paid), full: money(upgrade.full) });

  const buy = async () => {
    if (going.current) return;
    going.current = true;
    upgradeStarted = true;
    setBusy(true);
    track("pay_clicked", { product: "upgrade", source: "success" });
    const result = await postJson("/api/money/upgrade/after-checkout", { sessionId, returnTo, locale });
    const url = result.json.url;
    if (typeof url === "string" && url.length > 0) return void window.location.assign(url);
    going.current = false;
    upgradeStarted = false;
    setBusy(false);
    const error = errorOf(result) ?? (result.status === 0 ? "network" : "checkout");
    // Everything is theirs already (another tab, another device): nothing left to offer.
    if (checkoutErrorKey(error) === "alreadyOwned") {
      setGone(true);
      toast(tErrors("alreadyOwned"));
    } else showCheckoutError(error);
    // The server may have signed this browser in on the way (or spent the page's one-time link
    // trying): draw the page again, so "Back to your gift" is a link that still works.
    if (result.status !== 0) router.refresh();
  };

  return (
    <section className="mt-10 w-full max-w-sm rounded-3xl border border-rose/20 bg-blush-paper p-5 text-left" data-testid="upgrade-after">
      <p className="text-eyebrow text-rose-ink">{t("eyebrow")}</p>
      <p className="mt-2 text-[17px] leading-snug text-forest">
        <span className="font-semibold">{t(`sorted.${upgrade.sorted ?? "one"}`)}</span> <span>{t("next", { occasions: list, price })}</span>
      </p>
      <p className="mt-2 text-[13.5px] leading-snug text-forest/70" data-testid="upgrade-after-credit">
        {credit}
      </p>
      <button
        type="button"
        onClick={buy}
        disabled={busy}
        // Second to "Back to your gift" above it: sending the gift stays the page's first thing to do.
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-forest bg-white px-5 text-[15px] font-semibold text-forest hover:bg-forest hover:text-cream disabled:opacity-70"
        data-testid="upgrade-after-buy"
      >
        {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
        <span className="[text-wrap:balance]">{t("cta", { price })}</span>
      </button>
      <p className="mt-2 text-center text-[12.5px] text-forest/55">{t("note")}</p>
    </section>
  );
}

/**
 * "Back to your gift" for a guest, on a success page with the card above: the browser is signed in
 * as the buyer when it's tapped (POST /api/checkout/continue), not by a one-time link drawn with the
 * page, which the card's own sign-in spends and which a page brought back from the browser's cache,
 * or open in a second tab, would still carry.
 */
/**
 * The same sign-in as "Back to your gift", made in the background as soon as the page is open, so
 * a guest is already in the account the purchase is on whichever way they leave: the way back, the
 * card, or the login page. Buyers who never tapped the way back were left signed out, signed up
 * under another address, and were asked to pay again. Nothing moves the page; the server's rules
 * are the tap's.
 */
export function SignInWhileHere({ sessionId, returnTo }: { sessionId: string; returnTo: string }) {
  const locale = useLocale() === "es" ? "es" : "en";
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void postJson("/api/checkout/continue", { sessionId, returnTo, locale });
  }, [sessionId, returnTo, locale]);
  return null;
}

/**
 * The way back to the gift. With `autoAfterMs` it also goes by itself that long after the page
 * opens, as the success page without an offer always has: the gift is still only on this device, and
 * it publishes itself once the editor is open again. Waiting for a tap here left a guest's gift
 * unsent: in the three weeks to 13 Nov 2026, 41 of 523 guests who paid for one template took over
 * 15 minutes to publish or never did, nearly all of them on the very browser that had the gift, while
 * one buyer in 601 took the offer below. Tapping the offer first keeps them with it.
 */
export function BackToGift({ sessionId, returnTo, label, autoAfterMs }: { sessionId: string; returnTo: string; label: string; autoAfterMs?: number }) {
  const t = useTranslations("money.success");
  const locale = useLocale() === "es" ? "es" : "en";
  const [busy, setBusy] = useState(false);
  const going = useRef(false);
  const go = async () => {
    if (going.current) return;
    going.current = true;
    setBusy(true);
    const result = await postJson("/api/checkout/continue", { sessionId, returnTo, locale });
    const url = result.json.url;
    // Without an answer, the gift's own page: its draft is on this device, and it asks for a sign-in itself.
    window.location.assign(typeof url === "string" && url.startsWith("/") ? url : returnTo);
  };
  useEffect(() => {
    if (autoAfterMs === undefined) return;
    const id = window.setTimeout(() => {
      if (!upgradeStarted) void go();
    }, autoAfterMs);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- go reads only this page's props, which don't change
  }, [autoAfterMs]);
  return (
    <>
      <Button onClick={go} disabled={busy} className="mt-8 h-12 rounded-full px-6" data-testid="back-to-gift">
        {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
        <span>{label}</span>
      </Button>
      {autoAfterMs !== undefined ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground" role="status" data-testid="back-to-gift-auto">
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
          {t("redirecting")}
        </p>
      ) : null}
    </>
  );
}
