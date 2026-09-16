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
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] };
  }
}

/**
 * Microsoft Clarity: heatmaps, scroll maps and session replay.
 *
 * It loads only once all three are true — a project id is configured, the visitor has accepted
 * analytics cookies, and this is not a gift page. Recipients opening `/g/...` are reading a
 * private letter with someone's photos in it, and that is not ours to record.
 */
export function Clarity() {
  const pathname = usePathname();
  const consent = useConsent();
  const wanted = Boolean(env.clarityId) && consent === "granted" && !isPrivatePath(pathname);

  useEffect(() => {
    if (!wanted) {
      // Revoked after loading: stop collecting now, and the next page load won't start it.
      window.clarity?.("consent", false);
      return;
    }
    if (window.clarity) {
      window.clarity("consent");
      return;
    }
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.clarity.ms/tag/${env.clarityId}`;
    // The queue the tag expects, so calls made before it finishes loading are not lost.
    window.clarity = Object.assign(
      (...args: unknown[]) => {
        (window.clarity!.q = window.clarity!.q || []).push(args);
      },
      { q: [] as unknown[] },
    );
    document.head.appendChild(s);
  }, [wanted]);

  return null;
}
