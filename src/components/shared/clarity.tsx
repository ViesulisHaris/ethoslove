"use client";

import { useEffect } from "react";
// Next's own, not next-intl's: this component needs no translations, and the raw path
// (locale prefix and all) is what `isPrivatePath` expects.
import { usePathname } from "next/navigation";
import { env } from "@/lib/env";
import { isPrivatePath } from "@/lib/analytics/consent";
import { useConsent } from "@/lib/analytics/use-consent";

declare global {
  interface Window {
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[]; v?: string };
  }
}

/**
 * What the visitor agreed to: analytics, not advertising. Clarity's plain `consent` grants both,
 * and ad storage makes its tag sync a Microsoft Ads id — which the banner never asked about.
 */
const ANALYTICS_ONLY = { ad_Storage: "denied", analytics_Storage: "granted" } as const;

/** Clarity's user and session cookies, on whichever parent domain it managed to set them. */
function eraseClarityCookies() {
  const parts = window.location.hostname.split(".");
  const domains = [""];
  for (let i = parts.length - 2; i >= 0; i--) domains.push(`.${parts.slice(i).join(".")}`);
  for (const name of ["_clck", "_clsk"]) {
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ""}`;
    }
  }
  try {
    sessionStorage.removeItem("_cltk");
  } catch {
    // storage blocked: nothing was kept there either
  }
}

/**
 * The last line: nothing is sent to Clarity while the address bar shows a private page.
 *
 * Stopping Clarity is not enough on its own. When the app moves to another page, Clarity notices
 * the new address and flushes what it holds for the old one — after the address has changed, and
 * every upload carries the current address. So stepping from the editor onto a gift sent the gift's
 * link, twice, even when recording stopped at once (measured on a production build: 240 and 750
 * bytes, before and after this). The back button is the same with no warning at all: the address
 * changes before any of our code runs. So the requests themselves are checked on their way out.
 * Only Clarity's uploads are touched; every other request passes straight through.
 */
let gated = false;
function gateUploads() {
  if (gated) return;
  gated = true;
  const toClarity = (url: unknown) => /\.clarity\.ms\/collect/.test(String(url));
  const onPrivatePage = () => isPrivatePath(window.location.pathname);

  const beacon = navigator.sendBeacon?.bind(navigator);
  if (beacon) {
    // `true` tells Clarity it went, so it doesn't retry the same payload over XHR.
    navigator.sendBeacon = ((url: string | URL, data?: BodyInit | null) =>
      toClarity(url) && onPrivatePage() ? true : beacon(url, data)) as typeof navigator.sendBeacon;
  }

  const proto = XMLHttpRequest.prototype;
  const open = proto.open;
  const send = proto.send;
  const bound = new WeakSet<XMLHttpRequest>();
  proto.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
    if (toClarity(url)) bound.add(this);
    return (open as (...args: unknown[]) => void).call(this, method, url, ...rest);
  } as typeof proto.open;
  proto.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    // Aborted before it was sent: no request leaves, and no error reaches Clarity either.
    if (bound.has(this) && onPrivatePage()) return this.abort();
    return send.call(this, body);
  };
}

function load() {
  gateUploads();
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.clarity.ms/tag/${env.clarityId}`;
  // The queue the tag expects, so calls made before it finishes loading run, in order, once it has.
  window.clarity = Object.assign(
    (...args: unknown[]) => {
      (window.clarity!.q = window.clarity!.q || []).push(args);
    },
    { q: [] as unknown[] },
  );
  document.head.appendChild(s);
}

/**
 * Whether we have Clarity recording. It outlives any one page: the app moves between pages
 * without reloading, and Clarity keeps running across those moves unless it is told otherwise.
 */
let recording = false;

/**
 * Microsoft Clarity: heatmaps, scroll maps and session replay.
 *
 * It records only while all three hold — a project id is configured, the visitor has accepted
 * analytics cookies, and this is not a private page. Recipients opening `/g/...` are reading a
 * private letter with someone's photos in it, and that is not ours to record; the checkout,
 * dashboard and account pages carry ids and tokens (see `isPrivatePath`).
 *
 * Those rules have to hold on the way *into* a page, not only on arrival. Moving from the editor
 * to a gift, or from the gallery to the dashboard, is a client-side navigation: the Clarity that
 * loaded on the public page is still running. This used to call `clarity("consent", false)` to
 * stop it, which is not a stop — Clarity deletes its cookies, stops, and starts itself again 250ms
 * later without them — so it went on recording gift and dashboard pages. `stop` stops it, and
 * `start` resumes it when the visitor is back on a public page.
 */
export function Clarity() {
  const pathname = usePathname();
  const consent = useConsent();
  const configured = Boolean(env.clarityId);
  const record = configured && consent === "granted" && !isPrivatePath(pathname);

  useEffect(() => {
    if (!configured) return;
    if (record) {
      if (!window.clarity) load();
      // An empty config, so Clarity doesn't look for its tag a second time and warn about it.
      else if (!recording) window.clarity("start", {});
      // Without this Clarity runs cookieless: every visit looks like a new visitor, and a visit
      // ends at every full page load. The visitor has said yes, so let it keep its id.
      window.clarity!("consentv2", ANALYTICS_ONLY);
      recording = true;
      return;
    }
    if (recording) {
      window.clarity?.("stop");
      recording = false;
    }
    // Consent withdrawn from the footer: the cookies go too, as the privacy policy promises.
    if (consent === "denied") eraseClarityCookies();
  }, [configured, record, consent]);

  return null;
}
