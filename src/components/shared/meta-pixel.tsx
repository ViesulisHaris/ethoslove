"use client";

import { useEffect } from "react";
// Next's own, not next-intl's: the raw path, locale prefix and all, is what the path rules expect.
import { usePathname } from "next/navigation";
import { env } from "@/lib/env";
import { isInApp } from "@/lib/app/bridge";
import { useConsent } from "@/lib/analytics/use-consent";
import {
  eraseMetaCookies,
  holdPurchase,
  loadPixel,
  metaTrack,
  pageEvents,
  pixelMayRun,
  setPixelLive,
  takeHeldPurchase,
  type MetaPurchase,
} from "@/lib/analytics/meta";

/** The page whose arrival was last reported, so React's development double-run doesn't report it twice. */
let reported: string | null = null;
/** Whether the pixel was told consent is withdrawn, which holds anything it would send until it is given again. */
let revoked = false;

/**
 * The Meta pixel: tells Meta's ads which visits came from an ad and ended in a sale, so a campaign
 * can learn who buys. It mirrors `Clarity`: nothing loads without a pixel id or without a yes in
 * the banner, and it never runs where `isAdTrackingOff` says the address must stay ours — a gift,
 * checkout, the dashboard and account, and the pages whose address opens something.
 *
 * The rules have to hold on the way into a page as well as on arrival: the app moves between pages
 * without reloading, so a pixel loaded on the editor is still there when the buyer steps onto their
 * gift. It sends nothing by itself (see `loadPixel`), and `metaTrack` sends only while this
 * component says the current page is allowed.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const consent = useConsent();
  const pixelId = env.metaPixelId;

  useEffect(() => {
    if (!pixelId) return;
    if (pixelMayRun({ pixelId, consent, pathname, inApp: isInApp() })) {
      if (!window.fbq) loadPixel(pixelId);
      else if (revoked) window.fbq("consent", "grant");
      revoked = false;
      setPixelLive(true);
      if (reported !== pathname) {
        reported = pathname;
        for (const event of pageEvents(pathname)) metaTrack(event);
      }
      // A sale the success page handed on (see `holdPurchase`).
      const purchase = takeHeldPurchase();
      if (purchase) metaTrack(purchase);
      return;
    }
    setPixelLive(false);
    reported = null;
    if (consent === "denied") {
      if (window.fbq && !revoked) window.fbq("consent", "revoke");
      revoked = true;
      // Consent withdrawn from the footer: the cookies go too, as the privacy policy promises.
      eraseMetaCookies();
    }
  }, [pixelId, consent, pathname]);

  return null;
}

/**
 * On the success page: leaves the sale for the pixel to report from the next page (see
 * `holdPurchase` for why not from here). Only for a visitor who said yes; the rest are never reported.
 */
export function HoldMetaPurchase({ purchase }: { purchase: MetaPurchase }) {
  const consent = useConsent();
  const { eventId, value, currency } = purchase;
  const contentIds = purchase.contentIds.join(",");

  useEffect(() => {
    if (!env.metaPixelId || consent !== "granted" || isInApp()) return;
    holdPurchase({ eventId, value, currency, contentIds: contentIds ? contentIds.split(",") : [] });
  }, [consent, eventId, value, currency, contentIds]);

  return null;
}
