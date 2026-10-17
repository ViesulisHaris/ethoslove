"use client";

import { useNativeReady } from "@/lib/app/use-bridge";
import type { PayloadOf } from "@/lib/app/bridge";

/**
 * Inside the iPhone app, tells it this page is on screen (it takes its loading screen away and titles
 * its bar). Renders nothing, anywhere; outside the app it does nothing at all.
 */
export function AppReady({ route, title }: { route: PayloadOf<"ready">["route"]; title?: string }) {
  useNativeReady(route, title);
  return null;
}
