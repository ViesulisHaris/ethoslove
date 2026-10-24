import { env } from "@/lib/env";
import { isInApp } from "@/lib/app/bridge";
import { currentFbc } from "@/lib/attribution/fbclid";
import { getConsent, isAdTrackingOff, withoutLocale, type Consent } from "./consent";

/**
 * The Meta (Facebook and Instagram) pixel's side of the site: which pages it may run on, what each
 * page reports, the sale handed from the success page to the next page, and what a checkout tells
 * our server so the webhook can report the sale itself (lib/meta/capi.ts). The component that loads
 * the pixel is components/shared/meta-pixel.tsx.
 *
 * It runs only while all four hold: a pixel id is configured, the visitor said yes in the cookie
 * banner (which names advertising and Meta), this is not the iPhone app (which promises no
 * tracking), and the page is not one whose address must stay ours (`isAdTrackingOff`). Nothing
 * here sends a thing on its own: every event goes through `metaTrack`, which checks.
 */

export type MetaEventName = "PageView" | "ViewContent" | "InitiateCheckout" | "Purchase";
export type MetaEvent = { name: MetaEventName; params?: Record<string, unknown>; eventId?: string };

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Fbq;
  loaded: boolean;
  version: string;
  disablePushState?: boolean;
  allowDuplicatePageViews?: boolean;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

export function pixelMayRun(input: { pixelId: string | undefined; consent: Consent | null; pathname: string; inApp: boolean }): boolean {
  return Boolean(input.pixelId) && input.consent === "granted" && !input.inApp && !isAdTrackingOff(input.pathname);
}

const TEMPLATE_PAGE = /^\/templates\/([a-z0-9-]{1,80})\/?$/;

/** What arriving on a page reports: a view, and on a template's own page, which template. */
export function pageEvents(pathname: string): MetaEvent[] {
  const slug = TEMPLATE_PAGE.exec(withoutLocale(pathname))?.[1];
  const view: MetaEvent = { name: "PageView" };
  return slug ? [view, { name: "ViewContent", params: { content_ids: [slug], content_type: "product" } }] : [view];
}

/** Set by the pixel component: loaded, consented and on a page it may run on. */
let live = false;

export function setPixelLive(value: boolean): void {
  live = value;
}

export function metaTrack(event: MetaEvent): void {
  if (!live || typeof window === "undefined" || !window.fbq) return;
  try {
    window.fbq("track", event.name, event.params ?? {}, ...(event.eventId ? [{ eventID: event.eventId }] : []));
  } catch {
    // Tracking never gets to break a page.
  }
}

/**
 * The standard pixel snippet, minus the two things it does by default that would follow the visitor
 * onto a page it must not see: a PageView on every history change (`disablePushState`; the app moves
 * between pages with pushState, gifts included) and automatic events from button taps and page
 * metadata (`autoConfig`). Every event is ours, sent from a page `pixelMayRun` allowed.
 */
export function loadPixel(pixelId: string): void {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod.apply(fbq, args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  fbq.disablePushState = true;
  fbq.allowDuplicatePageViews = true;
  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
  fbq("set", "autoConfig", false, pixelId);
  fbq("init", pixelId);
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
}

/** The pixel's own cookies, on whichever parent domain it set them: removed when consent is withdrawn. */
export function eraseMetaCookies(): void {
  const parts = window.location.hostname.split(".");
  const domains = [""];
  for (let i = parts.length - 2; i >= 0; i--) domains.push(`.${parts.slice(i).join(".")}`);
  for (const name of ["_fbp", "_fbc"]) {
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

/**
 * A sale, as the success page hands it on. `eventId` is the one the webhook's Conversions API event
 * carries (lib/meta/capi.ts), so Meta counts the two as one purchase.
 */
export type MetaPurchase = { eventId: string; value: number; currency: string; contentIds: string[] };

const HELD = "ethos:meta-purchase";
const SENT = "ethos:meta-purchase-sent";

/**
 * The success page never runs the pixel: its address carries the Stripe session id, and for 30
 * minutes that id signs the browser holding it in as a guest buyer. Every pixel event sends the
 * address it was fired from, so the page leaves the sale here, in this tab, and the pixel reports it
 * from the next page it may run on — usually the gift the buyer is sent straight back to.
 */
export function holdPurchase(purchase: MetaPurchase): void {
  try {
    if (sessionStorage.getItem(SENT) === purchase.eventId) return;
    sessionStorage.setItem(HELD, JSON.stringify(purchase));
  } catch {
    // Storage refused: the Conversions API still reports the sale.
  }
}

const isPurchase = (v: unknown): v is MetaPurchase => {
  const p = v as Partial<MetaPurchase> | null;
  return (
    typeof p?.eventId === "string" &&
    typeof p.value === "number" &&
    Number.isFinite(p.value) &&
    typeof p.currency === "string" &&
    Array.isArray(p.contentIds) &&
    p.contentIds.every((id) => typeof id === "string")
  );
};

/** The held sale as a Purchase event, once: reading it marks it sent. */
export function takeHeldPurchase(): MetaEvent | null {
  try {
    const raw = sessionStorage.getItem(HELD);
    if (!raw) return null;
    sessionStorage.removeItem(HELD);
    const purchase: unknown = JSON.parse(raw);
    if (!isPurchase(purchase) || sessionStorage.getItem(SENT) === purchase.eventId) return null;
    sessionStorage.setItem(SENT, purchase.eventId);
    return {
      name: "Purchase",
      params: { value: purchase.value, currency: purchase.currency, content_ids: purchase.contentIds, content_type: "product" },
      eventId: purchase.eventId,
    };
  } catch {
    return null;
  }
}

/** What a consented checkout tells our server about the visitor for Meta: the click and the browser ids. */
export type MetaCheckoutFields = { fbc?: string; fbp?: string };

function cookie(name: string): string | undefined {
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) || undefined : undefined;
}

/**
 * Sent with every checkout, and only for a visitor who said yes: its presence is the consent flag the
 * webhook checks before telling Meta about the sale. The pixel's own `_fbc` wins over the click this
 * tab remembers, so both sides name the same click.
 */
export function metaCheckoutFields(): MetaCheckoutFields | undefined {
  if (!env.metaPixelId || getConsent() !== "granted" || isInApp()) return undefined;
  try {
    const fbc = cookie("_fbc") ?? currentFbc();
    const fbp = cookie("_fbp");
    return { ...(fbc ? { fbc } : {}), ...(fbp ? { fbp } : {}) };
  } catch {
    return {};
  }
}
