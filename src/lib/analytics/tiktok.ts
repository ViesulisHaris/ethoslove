import type { AdEvent } from "./ads";
import { isAdTrackingOffHere } from "./consent";

/**
 * The TikTok pixel's wiring: loading it, and turning our events into its calls. Whether it may run,
 * and when, is decided in ./ads.ts and components/shared/ad-pixels.tsx; nothing here checks consent.
 */

type TtqMethod = (...args: unknown[]) => void;
type Queue = unknown[] & Record<string, unknown>;
type Ttq = Queue & {
  methods: string[];
  setAndDefer: (target: Queue, method: string) => void;
  instance: (id: string) => Queue;
  load: (id: string, options?: Record<string, unknown>) => void;
  page: TtqMethod;
  track: TtqMethod;
  grantConsent: TtqMethod;
  revokeConsent: TtqMethod;
  enableCookie: TtqMethod;
  disableCookie: TtqMethod;
  _i?: Record<string, Queue>;
  _t?: Record<string, number>;
  _o?: Record<string, unknown>;
};

declare global {
  interface Window {
    ttq?: Ttq;
    TiktokAnalyticsObject?: string;
  }
}

const METHODS = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
const SCRIPT = "https://analytics.tiktok.com/i18n/pixel/events.js";

/**
 * The last line on a page the pixel must not see. TikTok's script can also report on its own: taps,
 * forms and page details, switched on per pixel in TikTok's Events Manager rather than in code, and it
 * reports them with the address of the page they happened on. The app moves onto a gift without
 * reloading, so a pixel loaded on the editor is still there. Its uploads go out by beacon, and while
 * the address bar shows a page `isAdTrackingOffHere` covers (a hash carrying a shared plan included),
 * they are dropped on the way out (answered as sent, so it doesn't retry). Every other beacon passes
 * straight through.
 */
let gated = false;
function gateUploads() {
  if (gated) return;
  gated = true;
  const beacon = navigator.sendBeacon?.bind(navigator);
  if (!beacon) return;
  const toTikTok = (url: unknown) => /^https:\/\/analytics\.tiktok\.com\/api\//.test(String(url));
  navigator.sendBeacon = ((url: string | URL, data?: BodyInit | null) =>
    toTikTok(url) && isAdTrackingOffHere(window.location) ? true : beacon(url, data)) as typeof navigator.sendBeacon;
}

/**
 * The standard pixel snippet, with the history observer off: by default the pixel reports a page view
 * on every history change, and the app moves between pages with pushState, gifts included. Page views
 * are ours, sent from a page the rules allowed.
 */
export function loadTikTok(pixelId: string): void {
  if (window.ttq) return;
  window.TiktokAnalyticsObject = "ttq";
  const defer = (target: Queue, method: string) => {
    target[method] = (...args: unknown[]) => {
      target.push([method, ...args]);
    };
  };
  const ttq = [] as unknown as Ttq;
  ttq.methods = METHODS;
  ttq.setAndDefer = defer;
  for (const method of METHODS) defer(ttq, method);
  ttq.instance = (id: string) => {
    const instance = ttq._i?.[id] ?? ([] as unknown as Queue);
    for (const method of METHODS) defer(instance, method);
    return instance;
  };
  ttq.load = (id: string, options?: Record<string, unknown>) => {
    ttq._i = ttq._i || {};
    ttq._i[id] = [] as unknown as Queue;
    ttq._i[id]._u = SCRIPT;
    ttq._t = ttq._t || {};
    ttq._t[id] = Date.now();
    ttq._o = ttq._o || {};
    ttq._o[id] = options || {};
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = `${SCRIPT}?sdkid=${encodeURIComponent(id)}&lib=ttq`;
    document.head.appendChild(script);
  };
  window.ttq = ttq;
  gateUploads();
  ttq.load(pixelId, { historyObserver: false });
}

/** TikTok's call for one of our events. Exported for the tests. */
export function tiktokCall(event: AdEvent): unknown[] {
  if (event.name === "PageView") return ["page"];
  const params = {
    contents: event.contents.map((c) => ({ content_id: c.id, content_type: "product", ...(c.category ? { content_category: c.category } : {}) })),
    content_type: "product",
    ...(event.value !== undefined && event.currency ? { value: event.value, currency: event.currency } : {}),
  };
  // PaywallSeen isn't a TikTok standard event: a custom one, which audiences can use the same way.
  const call = ["track", event.name, params];
  return event.eventId ? [...call, { event_id: event.eventId }] : call;
}

export function sendToTikTok(event: AdEvent): void {
  const ttq = window.ttq;
  if (!ttq) return;
  try {
    const [method, ...args] = tiktokCall(event) as [string, ...unknown[]];
    (ttq[method] as TtqMethod)(...args);
  } catch {
    // Tracking never gets to break a page.
  }
}

/** Consent withdrawn: TikTok stops reporting and stops using its cookies; given again, both resume. */
export function setTikTokConsent(granted: boolean): void {
  const ttq = window.ttq;
  if (!ttq) return;
  try {
    if (granted) {
      ttq.grantConsent();
      ttq.enableCookie();
    } else {
      ttq.revokeConsent();
      ttq.disableCookie();
    }
  } catch {
    // As above.
  }
}

/** The pixel's own cookies: its browser id, its cookie check, its session ids and the ad click. */
export const isTikTokCookie = (name: string) => name === "_ttp" || name === "_tt_enable_cookie" || name === "ttclid" || name.startsWith("ttcsid");
