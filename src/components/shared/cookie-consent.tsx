"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { hidesConsentBanner, setConsent } from "@/lib/analytics/consent";
import { useConsent, useIsClient } from "@/lib/analytics/use-consent";

/**
 * Asks once, in the least intrusive place that is still honest.
 *
 * It never appears with no Clarity id configured, and never where a gift is running — a real one
 * at `/g/…` or a demo — because that is most of the traffic, the worst possible moment to
 * interrupt, and the strip would sit directly on top of the gift's own controls. A strip at the
 * bottom rather than a modal, two plain buttons, no "manage preferences" maze — the choice is
 * reversible from the footer, so there is nothing to bury.
 */
export function CookieConsent() {
  const t = useTranslations("cookies");
  const pathname = usePathname();
  const consent = useConsent();
  const isClient = useIsClient();
  const visible = isClient && consent === null && Boolean(env.clarityId) && !hidesConsentBanner(pathname);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 34, mass: 0.9 }}
          // Steps aside while the editor's phone preview is up: that is a gift running full-screen
          // with "Play from the start" docked exactly here. It comes back with the form.
          className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] [[data-gift-running]_&]:hidden"
          role="region"
          aria-label={t("title")}
        >
          {/* The footer's own treatment: forest, cream, and the grain over the top. */}
          {/* The hairline matters on the dark pages: forest on forest has no edge without it. */}
          {/* Kept short on phones: it docks over the hero, so every extra line is a line of the
              page someone came for that they cannot see. */}
          <div className="relative flex w-full max-w-xl flex-col gap-2.5 overflow-hidden rounded-2xl bg-forest px-4 py-3.5 text-cream ring-1 ring-cream/15 shadow-lift sm:flex-row sm:items-center sm:gap-5 sm:px-5 sm:py-4">
            <div className="grain-overlay opacity-[0.08] mix-blend-overlay" />
            <p className="relative text-sm leading-relaxed text-cream/75">
              {t("blurb")}{" "}
              <Link href="/legal/privacy" className="whitespace-nowrap text-cream/90 underline underline-offset-2 transition-colors hover:text-cream">
                {t("readMore")}
              </Link>
            </p>
            <div className="relative flex shrink-0 items-center gap-1 sm:ml-auto">
              <button
                type="button"
                onClick={() => setConsent("denied")}
                className="rounded-full px-3 py-2 text-sm text-cream/65 transition-colors hover:text-cream"
              >
                {t("decline")}
              </button>
              <Button size="sm" className="rounded-full" onClick={() => setConsent("granted")}>
                {t("accept")}
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** The footer's "change your mind" control the privacy policy promises. */
export function CookieChoiceButton({ className }: { className?: string }) {
  const t = useTranslations("cookies");
  const consent = useConsent();

  if (!env.clarityId) return null;

  return (
    <button
      type="button"
      className={className}
      onClick={() => setConsent(consent === "granted" ? "denied" : "granted")}
    >
      {consent === "granted" ? t("turnOff") : t("turnOn")}
    </button>
  );
}
