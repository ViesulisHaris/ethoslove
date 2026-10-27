"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { subscribeToConsent } from "@/lib/analytics/consent";
import { rememberClickIds } from "@/lib/attribution/click-ids";
import { keepAdRef, rememberRef } from "@/lib/attribution/ref";

/**
 * Picks up `?ref=` on every navigation, including the client-side one from a gift's "make your own",
 * and a Meta or TikTok ad's click id (`?fbclid=`, `?ttclid=`) the same way. When the cookie choice
 * changes, the ad ref kept for a visitor who said yes follows it (lib/attribution/ref.ts).
 */
export function RefCapture() {
  const pathname = usePathname();
  useEffect(() => {
    rememberRef(window.location.search);
    rememberClickIds(window.location.search);
  }, [pathname]);
  useEffect(() => subscribeToConsent(() => keepAdRef()), []);
  return null;
}
