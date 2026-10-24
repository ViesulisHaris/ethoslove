import type { AdEvent } from "./ads";

/**
 * The Meta pixel's wiring: loading it, and turning our events into its calls. Whether it may run, and
 * when, is decided in ./ads.ts and components/shared/ad-pixels.tsx; nothing here checks consent.
 */

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

/**
 * The standard pixel snippet, minus the two things it does by default that would follow the visitor
 * onto a page it must not see: a PageView on every history change (`disablePushState`; the app moves
 * between pages with pushState, gifts included) and automatic events from button taps and page
 * metadata (`autoConfig`). Every event is ours, sent from a page the rules allowed.
 */
export function loadMeta(pixelId: string): void {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
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

/** Meta's parameters for one of our events. Exported for the tests. */
export function metaCall(event: AdEvent): unknown[] {
  if (event.name === "PageView") return ["track", "PageView"];
  const ids = event.contents.map((c) => c.id);
  const category = event.contents.find((c) => c.category)?.category;
  const params = {
    content_ids: ids,
    content_type: "product",
    contents: event.contents.map((c) => ({ id: c.id, quantity: 1 })),
    num_items: ids.length,
    ...(category ? { content_category: category } : {}),
    ...(event.value !== undefined && event.currency ? { value: event.value, currency: event.currency } : {}),
  };
  // PaywallSeen isn't one of Meta's standard events: a custom one, which audiences can use the same way.
  const call = event.name === "PaywallSeen" ? ["trackCustom", event.name, params] : ["track", event.name, params];
  return event.eventId ? [...call, { eventID: event.eventId }] : call;
}

export function sendToMeta(event: AdEvent): void {
  if (!window.fbq) return;
  try {
    window.fbq(...metaCall(event));
  } catch {
    // Tracking never gets to break a page.
  }
}

/** Consent withdrawn (`revoke`) holds whatever the pixel would send; given again (`grant`) lets it go on. */
export function setMetaConsent(granted: boolean): void {
  try {
    window.fbq?.("consent", granted ? "grant" : "revoke");
  } catch {
    // As above.
  }
}

/** The pixel's own cookies: its browser id and, after an ad click, the click. */
export const isMetaCookie = (name: string) => name === "_fbp" || name === "_fbc";
