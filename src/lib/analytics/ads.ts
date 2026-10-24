import { env } from "@/lib/env";
import { isInApp } from "@/lib/app/bridge";
import { currentFbc, currentTtclid } from "@/lib/attribution/click-ids";
import { getConsent, isAdTrackingOff, isAdTrackingOffHere, type Consent } from "./consent";
import { sendToMeta } from "./meta";
import { sendToTikTok } from "./tiktok";

/**
 * The ad pixels' side of the site, Meta's (Facebook, Instagram) and TikTok's: which pages they may run
 * on, what each page reports, the sale handed from the success page to the next page, and what a
 * checkout tells our server so the webhook can report the sale itself (lib/ads). The component that
 * loads them is components/shared/ad-pixels.tsx; each pixel's own wiring is in ./meta.ts and ./tiktok.ts.
 *
 * They run only while all four hold: the pixel's id is configured, the visitor said yes in the cookie
 * banner (which names advertising, Meta and TikTok), this is not the iPhone app (which promises no
 * tracking), and the page is not one whose address must stay ours (`isAdTrackingOff`). Every event goes
 * through `adTrack`, which checks.
 *
 * What they report is what retargeting needs, per template: a template's page or editor opened
 * (ViewContent, with the template and its tier), the price seen (PaywallSeen), pay tapped
 * (InitiateCheckout) and the sale (Purchase). "Opened a premium editor, didn't buy" is an audience
 * either ads manager can build from these.
 */

export type AdContent = { id: string; category?: string };
export type AdEventName = "PageView" | "ViewContent" | "PaywallSeen" | "InitiateCheckout" | "Purchase";
export type AdEvent =
  | { name: "PageView" }
  | { name: Exclude<AdEventName, "PageView">; contents: AdContent[]; value?: number; currency?: string; eventId?: string };

export type AdPixelIds = { meta?: string; tiktok?: string };

export const AD_PIXELS: AdPixelIds = { meta: env.metaPixelId, tiktok: env.tiktokPixelId };

export function pixelsMayRun(input: { ids: AdPixelIds; consent: Consent | null; pathname: string; inApp: boolean }): boolean {
  return Boolean(input.ids.meta || input.ids.tiktok) && input.consent === "granted" && !input.inApp && !isAdTrackingOff(input.pathname);
}

/** Set by the pixel component: loaded, consented and on a page they may run on. */
let live = false;

export function setAdsLive(value: boolean): void {
  live = value;
  if (!value) reportedPage = null;
}

export function adTrack(event: AdEvent): void {
  // Checked again at the moment of sending: the address can change under a page without a new one.
  if (!live || typeof window === "undefined" || isAdTrackingOffHere(window.location)) return;
  sendToMeta(event);
  sendToTikTok(event);
}

/**
 * A template's page or editor says which template is open, and the pixel component says when the
 * page's view went out. Whichever comes second sends ViewContent, once per arrival: the two run in
 * effects of different components, in an order React doesn't promise.
 */
let reportedPage: string | null = null;
let templateView: { pathname: string; event: AdEvent; sent: boolean } | null = null;

export function reportPage(pathname: string): void {
  if (!live || reportedPage === pathname) return;
  reportedPage = pathname;
  adTrack({ name: "PageView" });
  if (templateView && templateView.pathname === pathname && !templateView.sent) {
    templateView.sent = true;
    adTrack(templateView.event);
  }
}

export function noteTemplateView(pathname: string, slug: string, tier: string): void {
  if (templateView?.pathname === pathname && templateView.sent) return;
  templateView = { pathname, event: { name: "ViewContent", contents: [{ id: slug, category: tier }] }, sent: false };
  if (live && reportedPage === pathname) {
    templateView.sent = true;
    adTrack(templateView.event);
  }
}

/** Leaving a page: the next arrival on it is a new view. */
export function leaveTemplateView(pathname: string): void {
  if (templateView?.pathname === pathname) templateView = null;
}

/**
 * A sale, as the success page hands it on. `eventId` is the one the webhook's server event carries
 * (lib/ads/purchase.ts), so each platform counts the two as one purchase.
 */
export type AdPurchase = { eventId: string; value: number; currency: string; contents: AdContent[] };

const HELD = "ethos:ad-purchases";
const SENT = "ethos:ad-purchases-sent";

const readList = (key: string): unknown[] => {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

/**
 * The success page never runs the pixels: its address carries the Stripe session id, and for 30
 * minutes that id signs the browser holding it in as a guest buyer. Every pixel event sends the
 * address it was fired from, so the page leaves the sale here, in this tab, and the pixels report it
 * from the next page they may run on: usually the gift the buyer is sent straight back to. The server
 * reports it as well, so a buyer who closes the tab on the success page is still counted. A list, not
 * one slot: the success page offers an upgrade, so a second sale can arrive before the first is sent.
 */
export function holdPurchase(purchase: AdPurchase): void {
  try {
    if (readList(SENT).includes(purchase.eventId)) return;
    const held = readList(HELD).filter((p) => isPurchase(p) && p.eventId !== purchase.eventId);
    sessionStorage.setItem(HELD, JSON.stringify([...held, purchase]));
  } catch {
    // Storage refused: the server's report still counts the sale.
  }
}

const isContent = (c: unknown): c is AdContent => {
  const v = c as Partial<AdContent> | null;
  return typeof v?.id === "string" && (v.category === undefined || typeof v.category === "string");
};

const isPurchase = (v: unknown): v is AdPurchase => {
  const p = v as Partial<AdPurchase> | null;
  return (
    typeof p?.eventId === "string" &&
    typeof p.value === "number" &&
    Number.isFinite(p.value) &&
    typeof p.currency === "string" &&
    Array.isArray(p.contents) &&
    p.contents.every(isContent)
  );
};

/** The held sales as Purchase events, each once: taking them marks them sent. */
export function takeHeldPurchases(): AdEvent[] {
  try {
    const held = readList(HELD);
    if (held.length === 0) return [];
    sessionStorage.removeItem(HELD);
    const sent = readList(SENT);
    const fresh = held.filter((p): p is AdPurchase => isPurchase(p) && !sent.includes(p.eventId));
    // The last few are enough to stop a repeat: a tab sees a handful of sales at most.
    sessionStorage.setItem(SENT, JSON.stringify([...sent, ...fresh.map((p) => p.eventId)].slice(-20)));
    return fresh.map((p) => ({ name: "Purchase", contents: p.contents, value: p.value, currency: p.currency, eventId: p.eventId }));
  } catch {
    return [];
  }
}

/** What a consented checkout tells our server for the platforms: the ad click and the browser ids. */
export type AdCheckoutFields = { fbc?: string; fbp?: string; ttclid?: string; ttp?: string };

function cookie(name: string): string | undefined {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) || undefined : undefined;
}

/**
 * Sent with every checkout, and only for a visitor who said yes: its presence is the consent flag the
 * webhook checks before reporting the sale to anyone. A pixel's own cookie wins over the click this tab
 * remembers, so the browser's report and the server's name the same click.
 */
export function adCheckoutFields(): AdCheckoutFields | undefined {
  if (!(AD_PIXELS.meta || AD_PIXELS.tiktok) || getConsent() !== "granted" || isInApp()) return undefined;
  const fields: AdCheckoutFields = {};
  try {
    if (AD_PIXELS.meta) {
      fields.fbc = cookie("_fbc") ?? currentFbc();
      fields.fbp = cookie("_fbp");
    }
    if (AD_PIXELS.tiktok) {
      // The pixel keeps the click in its own `ttclid` cookie, with the time it saw it appended.
      fields.ttclid = currentTtclid() ?? cookie("ttclid")?.replace(/\.\d{13}$/, "");
      fields.ttp = cookie("_ttp");
    }
  } catch {
    // Cookies unreadable: the consent still travels, without the ids.
  }
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v)) as AdCheckoutFields;
}

/** Every cookie on this page whose name passes `match`, on whichever parent domain it was set. */
export function eraseCookies(match: (name: string) => boolean): void {
  const names = document.cookie
    .split("; ")
    .map((c) => c.slice(0, c.indexOf("=")))
    .filter((name) => name && match(name));
  const parts = window.location.hostname.split(".");
  const domains = [""];
  for (let i = parts.length - 2; i >= 0; i--) domains.push(`.${parts.slice(i).join(".")}`);
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }
}
