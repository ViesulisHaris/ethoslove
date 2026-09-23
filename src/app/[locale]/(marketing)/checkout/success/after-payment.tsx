"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/analytics/track";

const TRACKED_KEY = "ethos:purchase-tracked";
/**
 * Long enough for "Unlocked." to be read, and for the analytics script to send the purchase before
 * the page goes; short enough that the gift is still the next thing they see.
 */
const CONTINUE_AFTER_MS = 900;

/**
 * purchase_completed, once per checkout session: reopening the page (the receipt email links back
 * to it, and phones restore tabs) must not count the same sale twice.
 */
export function TrackPurchase({ sessionId, product, bump }: { sessionId: string; product: string; bump: boolean }) {
  useEffect(() => {
    try {
      const seen = window.sessionStorage.getItem(TRACKED_KEY);
      if (seen === sessionId) return;
      window.sessionStorage.setItem(TRACKED_KEY, sessionId);
    } catch {
      // Storage refused: count it anyway, a rare double beats a missing sale.
    }
    track("purchase_completed", { product, bump });
  }, [sessionId, product, bump]);
  return null;
}

/**
 * A guest who just paid for a gift goes straight back to it, signed in, where it publishes itself.
 * The redirect waits a moment in the browser rather than on the server, so the sale is counted first.
 */
export function AutoContinue({ href }: { href: string }) {
  const t = useTranslations("money.success");
  useEffect(() => {
    const id = window.setTimeout(() => window.location.replace(href), CONTINUE_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [href]);
  return (
    <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground" role="status">
      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      {t("redirecting")}
    </p>
  );
}

/** The gift card's code, big enough to read out, with copy and share (the share carries the redeem link). */
export function GiftCardCode({ code, redeemUrl, redeemAt }: { code: string; redeemUrl: string; redeemAt: string }) {
  const t = useTranslations("money.success");
  const tInvite = useTranslations("money.invite");
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // The code is on screen to copy by hand.
    }
  };
  const share = async () => {
    if (!navigator.share) return void copy();
    try {
      await navigator.share({ text: code, url: redeemUrl });
    } catch {
      // Dismissed.
    }
  };

  return (
    <div className="mt-8 w-full max-w-sm rounded-3xl border border-rose/20 bg-blush-paper p-5 text-left" data-testid="giftcard-code">
      <p className="text-eyebrow text-rose-ink">{t("codeLabel")}</p>
      <p className="mt-2 font-mono text-2xl tracking-[0.12em] text-forest select-all">{code}</p>
      <p className="mt-1 text-[13px] text-forest/60">{t("redeemAt", { url: redeemAt })}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-forest text-sm font-semibold text-cream hover:bg-forest-raised">
          {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
          <span aria-live="polite">{copied ? t("copied") : t("copyCode")}</span>
        </button>
        <button type="button" onClick={share} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-forest text-sm font-semibold text-forest hover:bg-forest hover:text-cream">
          <Share2 aria-hidden="true" className="size-4" />
          {tInvite("share")}
        </button>
      </div>
    </div>
  );
}
