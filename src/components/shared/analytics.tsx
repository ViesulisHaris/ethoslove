"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const KEPT_PARAMS = /^(ref|utm_[a-z]+)$/;

/**
 * Gift links are private, so /g/abc123 is reported as /g/[shortId]. Query strings are dropped too
 * (they carry Stripe session ids and auth codes), except the ones that say where a visit came from.
 */
function redact<T extends { url: string }>(event: T): T {
  try {
    const url = new URL(event.url);
    url.pathname = url.pathname.replace(/^((?:\/(?:en|es))?\/g\/)[^/]+/, "$1[shortId]");
    for (const key of [...url.searchParams.keys()]) if (!KEPT_PARAMS.test(key)) url.searchParams.delete(key);
    return { ...event, url: url.toString() };
  } catch {
    return event;
  }
}

/** Vercel Web Analytics and Speed Insights: cookieless, on every page. */
export function SiteAnalytics() {
  return (
    <>
      <Analytics beforeSend={redact} />
      <SpeedInsights beforeSend={redact} />
    </>
  );
}
