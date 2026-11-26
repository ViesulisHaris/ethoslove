import { env } from "@/lib/env";
import type { AdEvent } from "./ads";

/**
 * The Google Ads tag's wiring: loading it, and turning a sale into its conversion call. Whether it
 * may run, and when, is decided in ./ads.ts and components/shared/ad-pixels.tsx; nothing here checks
 * consent.
 *
 * We tell Google one thing, the sale: its amount, its currency and the sale's id, so a sale reported
 * twice counts once. No template views, no prices seen and no audiences: every other event of ours is
 * dropped here. Unlike Meta and TikTok there is no server-side report, so a sale counts for Google
 * only when the buyer's browser sends it.
 *
 * The tag says one more thing by itself: the moment it loads it reports the address it loaded on, with
 * the ad click, to measure that click (its page view is off, but this still goes out; seen in a
 * headless run, 26 Nov 2026). It loads once per page load, not per step inside the app, and only on a
 * page the rules allow (ad-pixels.tsx). The privacy policy says so (section 7).
 */

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

const SCRIPT = "https://www.googletagmanager.com/gtag/js";

/** Google's consent signals for advertising, all three together: the banner asks one question. */
const signals = (granted: boolean) => {
  const value = granted ? "granted" : "denied";
  return { ad_storage: value, ad_user_data: value, ad_personalization: value };
};

export type GoogleClick = { id: string; at: number };

/** The tag's own click cookie, and its value as the tag writes it: GCL.<seconds first seen>.<gclid>. */
export const GCL_COOKIE = "_gcl_aw";
export const gclValue = (click: GoogleClick): string => `GCL.${Math.floor(click.at / 1000)}.${click.id}`;
const GCL_DAYS = 90;

/**
 * The tag reads `?gclid=` from the address it loads on. A visitor who says yes a page or two after
 * arriving has lost it from the address by then, so the click this tab remembers
 * (lib/attribution/click-ids.ts) is written where the tag would have put it. Never over a cookie the
 * tag already set.
 */
function keepClick(click: GoogleClick | undefined): void {
  if (!click) return;
  try {
    if (document.cookie.split("; ").some((c) => c.startsWith(`${GCL_COOKIE}=`))) return;
    const host = window.location.hostname;
    const domain = host === "localhost" || /^[\d.]+$/.test(host) ? "" : `; domain=.${host.split(".").slice(-2).join(".")}`;
    document.cookie = `${GCL_COOKIE}=${gclValue(click)}; max-age=${GCL_DAYS * 24 * 60 * 60}; path=/${domain}; SameSite=Lax; Secure`;
  } catch {
    // Cookies refused: the sale is still reported, without the click.
  }
}

/**
 * The standard tag snippet, with its page view off: the app moves between pages without reloading,
 * gifts included, and nothing about a page is Google's to know. It loads only after a yes, so the
 * consent it starts from is that yes.
 */
export function loadGoogle(tagId: string, click?: GoogleClick): void {
  if (window.gtag) return;
  keepClick(click);
  const layer = (window.dataLayer = window.dataLayer || []);
  // The tag reads `arguments` objects from this queue, not arrays: a rest parameter would be ignored.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    layer.push(arguments);
  };
  window.gtag("consent", "default", signals(true));
  window.gtag("js", new Date());
  window.gtag("config", tagId, { send_page_view: false });
  const script = document.createElement("script");
  script.async = true;
  script.src = `${SCRIPT}?id=${encodeURIComponent(tagId)}`;
  document.head.appendChild(script);
}

/** Google's call for one of our events: only a sale has one. Exported for the tests. */
export function googleCall(event: AdEvent, ids: { tagId: string; purchaseLabel: string }): unknown[] | null {
  if (event.name !== "Purchase" || event.value === undefined || !event.currency) return null;
  return [
    "event",
    "conversion",
    { send_to: `${ids.tagId}/${ids.purchaseLabel}`, value: event.value, currency: event.currency, ...(event.eventId ? { transaction_id: event.eventId } : {}) },
  ];
}

export function sendToGoogle(event: AdEvent): void {
  const gtag = window.gtag;
  if (!gtag || !env.googleAdsId || !env.googleAdsPurchaseLabel) return;
  const call = googleCall(event, { tagId: env.googleAdsId, purchaseLabel: env.googleAdsPurchaseLabel });
  if (!call) return;
  try {
    gtag(...call);
  } catch {
    // Tracking never gets to break a page.
  }
}

/** Consent withdrawn: the tag stops using its cookies and stops sending; given again, both resume. */
export function setGoogleConsent(granted: boolean): void {
  try {
    window.gtag?.("consent", "update", signals(granted));
  } catch {
    // As above.
  }
}

/** The tag's own cookies: its browser id (_gcl_au) and, after an ad click, the click (_gcl_aw and its kin). */
export const isGoogleCookie = (name: string) => name.startsWith("_gcl_") || name.startsWith("_gac_");
