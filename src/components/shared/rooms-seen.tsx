"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { subscribeToConsent } from "@/lib/analytics/consent";
import { noteRoomVisit } from "@/lib/analytics/rooms-marker";

/**
 * Notes which room each marketing page is in, for a visitor who allowed cookies (lib/analytics/
 * rooms-marker.ts). Draws nothing. Mounted in the marketing layout only: never on a gift, the
 * editor, the dashboard or the account page. The path is only the effect's key: the address is read
 * from the window, as ref-capture.tsx does, because the proxy rewrites paths.
 */
export function RoomsSeen() {
  const pathname = usePathname();
  useEffect(() => {
    noteRoomVisit(window.location.pathname);
  }, [pathname]);
  useEffect(() => subscribeToConsent(() => noteRoomVisit(window.location.pathname)), []);
  return null;
}
