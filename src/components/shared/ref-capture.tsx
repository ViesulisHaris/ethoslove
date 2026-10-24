"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { rememberFbclid } from "@/lib/attribution/fbclid";
import { rememberRef } from "@/lib/attribution/ref";

/**
 * Picks up `?ref=` on every navigation, including the client-side one from a gift's "make your own",
 * and a Meta ad's `?fbclid=` the same way.
 */
export function RefCapture() {
  const pathname = usePathname();
  useEffect(() => {
    rememberRef(window.location.search);
    rememberFbclid(window.location.search);
  }, [pathname]);
  return null;
}
