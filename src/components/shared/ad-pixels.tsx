"use client";

import { useEffect } from "react";
// Next's own, not next-intl's: the raw path, locale prefix and all, is what the path rules expect.
import { usePathname } from "next/navigation";
import { isInApp } from "@/lib/app/bridge";
import { useConsent } from "@/lib/analytics/use-consent";
import {
  AD_PIXELS,
  adTrack,
  eraseCookies,
  holdPurchase,
  leaveTemplateView,
  noteTemplateView,
  pixelsMayRun,
  reportPage,
  setAdsLive,
  takeHeldPurchases,
  type AdPurchase,
} from "@/lib/analytics/ads";
import { isMetaCookie, loadMeta, setMetaConsent } from "@/lib/analytics/meta";
import { isTikTokCookie, loadTikTok, setTikTokConsent } from "@/lib/analytics/tiktok";

/** Whether the pixels were told consent is withdrawn, so they are told when it is given again. */
let withdrawn = false;

/**
 * The Meta and TikTok pixels: they tell each platform's ads which visits came from an ad, which
 * template was opened, and which ended in a sale, so a campaign can find the people who opened a gift
 * and didn't buy it. They mirror `Clarity`: nothing loads without an id or without a yes in the
 * banner, and they never run where `isAdTrackingOff` says the address must stay ours — a gift,
 * checkout, the dashboard and account, and the pages whose address opens something.
 *
 * The rules have to hold on the way into a page as well as on arrival: the app moves between pages
 * without reloading, so pixels loaded on the editor are still there when the buyer steps onto their
 * gift. Neither reports page views by itself (see `loadMeta`, `loadTikTok`), and `adTrack` sends only
 * while this component says the current page is allowed.
 */
export function AdPixels() {
  const pathname = usePathname();
  const consent = useConsent();

  useEffect(() => {
    if (!AD_PIXELS.meta && !AD_PIXELS.tiktok) return;
    if (pixelsMayRun({ ids: AD_PIXELS, consent, pathname, inApp: isInApp() })) {
      if (AD_PIXELS.meta) loadMeta(AD_PIXELS.meta);
      if (AD_PIXELS.tiktok) loadTikTok(AD_PIXELS.tiktok);
      if (withdrawn) {
        setMetaConsent(true);
        setTikTokConsent(true);
        withdrawn = false;
      }
      setAdsLive(true);
      reportPage(pathname);
      // Sales the success page handed on (see `holdPurchase`).
      for (const purchase of takeHeldPurchases()) adTrack(purchase);
      return;
    }
    setAdsLive(false);
    if (consent === "denied") {
      if (!withdrawn) {
        setMetaConsent(false);
        setTikTokConsent(false);
        withdrawn = true;
      }
      // Consent withdrawn from the footer: the cookies go too, as the privacy policy promises.
      eraseCookies((name) => isMetaCookie(name) || isTikTokCookie(name));
    }
  }, [consent, pathname]);

  return null;
}

/**
 * On a template's page and in its editor: which template is open, for the ViewContent that per-template
 * audiences are built from. `tier` is the template's ("free" or "premium").
 */
export function AdTemplateView({ slug, tier }: { slug: string; tier: string }) {
  const pathname = usePathname();
  useEffect(() => {
    noteTemplateView(pathname, slug, tier);
    return () => leaveTemplateView(pathname);
  }, [pathname, slug, tier]);
  return null;
}

/**
 * On the success page: leaves the sale for the pixels to report from the next page (see `holdPurchase`
 * for why not from here). Only for a visitor who said yes; nobody else's sale is reported.
 */
export function HoldAdPurchase({ purchase }: { purchase: AdPurchase }) {
  const consent = useConsent();
  const { eventId, value, currency } = purchase;
  const contents = JSON.stringify(purchase.contents);

  useEffect(() => {
    if (!(AD_PIXELS.meta || AD_PIXELS.tiktok) || consent !== "granted" || isInApp()) return;
    holdPurchase({ eventId, value, currency, contents: JSON.parse(contents) });
  }, [consent, eventId, value, currency, contents]);

  return null;
}
