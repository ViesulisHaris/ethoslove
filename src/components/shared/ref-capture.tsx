"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { subscribeToConsent } from "@/lib/analytics/consent";
import { track } from "@/lib/analytics/track";
import { arrivalEvent } from "@/lib/attribution/arrival";
import { rememberClickIds } from "@/lib/attribution/click-ids";
import { keepFirstVisit, rememberVisit } from "@/lib/attribution/first-visit";
import { keepAdRef, rememberRef } from "@/lib/attribution/ref";
import { keepFreeTier } from "@/lib/editor/free-tier-split";
import { keepPaySheet } from "@/lib/editor/pay-sheet-split";

/**
 * Picks up `?ref=` on every navigation, including the client-side one from a gift's "make your own",
 * and a Meta or TikTok ad's click id (`?fbclid=`, `?ttclid=`) the same way. The first page of the
 * visit is taken down once, for the checkout's record of where the buyer came from
 * (lib/attribution/first-visit.ts). When the cookie choice changes, what is kept for a visitor who
 * said yes (an ad's ref, the first visit, which version of the free Letter they were shown) follows it.
 */
export function RefCapture() {
  const pathname = usePathname();
  useEffect(() => {
    rememberRef(window.location.search);
    rememberClickIds(window.location.search);
  }, [pathname]);
  useEffect(() => {
    rememberVisit(window.location, document.referrer);
    // An arrival the dashboard can't see otherwise (an assistant's answer, a pin, an Instagram link), counted once.
    const arrived = arrivalEvent(window.location, document.referrer);
    if (arrived) track(arrived);
  }, []);
  useEffect(
    () =>
      subscribeToConsent(() => {
        keepAdRef();
        keepFirstVisit();
        keepFreeTier();
        keepPaySheet();
      }),
    [],
  );
  return null;
}
