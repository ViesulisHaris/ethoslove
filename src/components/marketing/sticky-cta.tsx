"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { isConfigured } from "@/lib/env";
import { useConsent } from "@/lib/analytics/use-consent";
import { useScrolledPast } from "@/hooks/use-scrolled-past";

/**
 * Whether the page's footer is on screen. The bar docks over the bottom of the viewport, and at the
 * end of the page that is the footer's last row — the language switch and the cookie choice, which
 * it covered and took the taps of. The footer has its own links by then, so the bar steps aside.
 */
function useFooterInView(enabled: boolean): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, [enabled]);
  return enabled && inView;
}

/** Mobile-only floating "Create" button that appears once the hero scrolls away. */
export function StickyCta() {
  const t = useTranslations("common");
  const pathname = usePathname();
  // Only where the page has no strong call to action of its own (cards and detail pages carry theirs).
  const wanted = pathname === "/gifts" || pathname === "/occasions";
  const consent = useConsent();
  const scrolled = useScrolledPast(480);
  const atFooter = useFooterInView(wanted);
  // The consent banner docks in exactly this spot and sits above it (z-50 against this z-40),
  // so while it is up the button is present but unclickable — every tap aimed at it lands on
  // the banner instead. One dock at a time: this waits until the question has been answered.
  const asking = isConfigured.cookieConsent && consent === null;
  const visible = scrolled && wanted && !asking && !atFooter;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.8 }}
          // The strip is full width but the button isn't: taps beside it go to the page underneath.
          data-app-hide
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-5 pb-[max(1rem,env(safe-area-inset-bottom))] md:hidden"
        >
          <Button asChild size="lg" className="pointer-events-auto h-12 w-full max-w-sm rounded-full text-base shadow-lift">
            <Link href="/templates">{t("createGiftFree")}</Link>
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
