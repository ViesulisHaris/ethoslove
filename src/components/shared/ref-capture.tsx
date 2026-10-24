"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { rememberClickIds } from "@/lib/attribution/click-ids";
import { rememberRef } from "@/lib/attribution/ref";

/**
 * Picks up `?ref=` on every navigation, including the client-side one from a gift's "make your own",
 * and a Meta or TikTok ad's click id (`?fbclid=`, `?ttclid=`) the same way.
 */
export function RefCapture() {
  const pathname = usePathname();
  useEffect(() => {
    rememberRef(window.location.search);
    rememberClickIds(window.location.search);
  }, [pathname]);
  return null;
}
