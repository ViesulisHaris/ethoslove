"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { isConfigured } from "@/lib/env";
import { hidesConsentBanner, setConsent, type Consent } from "@/lib/analytics/consent";
import { useConsent } from "@/lib/analytics/use-consent";

/** How long the strip takes to slide away (globals.css, .consent-strip[data-leaving]). */
const LEAVE_MS = 260;

/**
 * Asks once, in the least intrusive place that is still honest.
 *
 * It never appears with neither a Clarity nor a Meta pixel id configured (nothing would wait for the
 * answer), and never where a gift is running — a real one
 * at `/g/…` or a demo — because that is most of the traffic, the worst possible moment to
 * interrupt, and the strip would sit directly on top of the gift's own controls. A strip at the
 * bottom rather than a modal, two plain buttons, no "manage preferences" maze — the choice is
 * reversible from the footer, so there is nothing to bury.
 *
 * It is in the page's HTML, so it is drawn with the page rather than seconds later once the scripts
 * have run: on a slow phone the strip arriving late was the largest thing painted on the editor and
 * set its "largest paint" at 8 s. A visitor who has already answered never sees it, not even for a
 * frame: the root layout's first script marks <html> with `data-consent-answered` before the strip
 * is parsed (CONSENT_ANSWERED_SCRIPT, globals.css hides it), and once React is up the answer it
 * reads takes the strip away. It slides in and away with CSS, not the motion library, which it
 * alone put on every page of the site.
 *
 * A press slides it away first and records the answer as it goes: what an answer starts (Clarity,
 * the pixels, the tour that waits for the strip) is work, and done inside the press it held the
 * press's paint back by a second on a slow phone.
 */
export function CookieConsent() {
  const t = useTranslations("cookies");
  const pathname = usePathname();
  const consent = useConsent();
  const [leaving, setLeaving] = useState(false);
  const answered = useRef(false);
  const visible = consent === null && isConfigured.cookieConsent && !hidesConsentBanner(pathname);

  const answer = (value: Consent) => {
    if (answered.current) return;
    answered.current = true;
    setLeaving(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(() => setConsent(value), reduced ? 0 : LEAVE_MS);
  };

  return (
    <>
      {visible ? (
        <div
          data-consent-strip
          data-leaving={leaving ? "" : undefined}
          // Steps aside while the editor's phone preview is up: that is a gift running full-screen
          // with "Play from the start" docked exactly here. It comes back with the form.
          // Never inside the iPhone app: its web view asks nobody for consent, so neither Clarity nor the pixel runs there.
          // A page with its own button docked at the bottom sets --bottom-dock (globals.css): the strip
          // docks just above that button instead of over it. The ad landing (/try) did that until the
          // strip stopped showing there at all (`hidesConsentBanner`).
          data-app-hide
          className="consent-strip fixed inset-x-0 bottom-[var(--bottom-dock,0px)] z-50 flex justify-center sm:px-4 sm:pb-[var(--bottom-dock-pad,max(1rem,env(safe-area-inset-bottom)))] [[data-gift-running]_&]:hidden"
          role="region"
          aria-label={t("title")}
        >
          {/* The footer's own treatment: forest, cream, and the grain over the top. */}
          {/* The hairline matters on the dark pages: forest on forest has no edge without it. */}
          {/* Kept short on phones: it docks over the hero, so every extra line is a line of the
              page someone came for that they cannot see. On a phone it is one thin band on the
              screen's bottom edge, two short lines and the two buttons beside them: as a floating
              card of four lines it covered the front page's "Make a gift" on a first visit, the
              button that takes half of that page's taps (Clarity, 21–27 Nov 2026; the owner's yes
              of 27 Nov). The full sentence is the desk's, and the policy's. */}
          <div className="relative flex w-full max-w-xl flex-row items-center gap-2 overflow-hidden rounded-t-2xl bg-forest px-3.5 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] text-cream ring-1 ring-cream/15 shadow-lift sm:gap-5 sm:rounded-2xl sm:px-5 sm:py-4">
            <div className="grain-overlay opacity-[0.08] mix-blend-overlay" />
            <p className="relative min-w-0 text-[12.5px] leading-snug text-cream/75 sm:hidden">
              {t("blurbShort")}{" "}
              <Link href="/legal/privacy" className="whitespace-nowrap text-cream/90 underline underline-offset-2 transition-colors hover:text-cream">
                {t("readMoreShort")}
              </Link>
            </p>
            <p className="relative hidden text-sm leading-relaxed text-cream/75 sm:block">
              {t("blurb")}{" "}
              <Link href="/legal/privacy" className="whitespace-nowrap text-cream/90 underline underline-offset-2 transition-colors hover:text-cream">
                {t("readMore")}
              </Link>
            </p>
            <div className="relative ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
              <button
                type="button"
                onClick={() => answer("denied")}
                className="min-h-11 rounded-full px-2.5 text-[13px] text-cream/65 transition-colors hover:text-cream sm:px-3 sm:text-sm"
              >
                {t("decline")}
              </button>
              <Button size="sm" className="rounded-full" onClick={() => answer("granted")}>
                {t("accept")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** The footer's "change your mind" control the privacy policy promises. */
export function CookieChoiceButton({ className }: { className?: string }) {
  const t = useTranslations("cookies");
  const consent = useConsent();

  if (!isConfigured.cookieConsent) return null;

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
