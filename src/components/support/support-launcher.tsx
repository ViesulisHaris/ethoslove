"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { MessageCircleQuestionMark } from "lucide-react";
import { usePathname } from "@/i18n/navigation";
import { isConfigured } from "@/lib/env";
import { useConsent } from "@/lib/analytics/use-consent";
import { cn } from "cn";

// The chat's own code loads the first time someone reaches for the button, never with the page.
const SupportPanel = dynamic(() => import("./support-panel").then((m) => m.SupportPanel), { ssr: false });

/** Pages where the mobile "Make yours" bar docks at the bottom (StickyCta): the button sits above it. */
const STICKY_BAR_PAGES = ["/gifts", "/occasions"];

/**
 * The help chat's button, bottom right on the marketing pages, My gifts, Account and sign-in (never on
 * a gift someone received, nor over the editor). Rendered only when the chat is on (the layouts check
 * isConfigured.supportChat on the server).
 */
export function SupportLauncher() {
  const t = useTranslations("support");
  const pathname = usePathname();
  const consent = useConsent();
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  // The cookie banner docks along the bottom while it asks: one thing there at a time.
  const asking = isConfigured.cookieConsent && consent === null;
  const raised = STICKY_BAR_PAGES.includes(pathname);

  return (
    <>
      {!open && !asking ? (
        <button
          ref={button}
          type="button"
          data-app-hide
          aria-label={t("openLabel")}
          aria-haspopup="dialog"
          onPointerEnter={() => setWanted(true)}
          onFocus={() => setWanted(true)}
          onClick={() => {
            setWanted(true);
            setOpen(true);
          }}
          title={t("open")}
          // The small round chat button people know from other sites.
          className={cn(
            "fixed right-4 z-40 inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift transition-[translate,background-color] duration-200 hover:bg-primary/85 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-fine:hover:-translate-y-px md:right-6 md:bottom-6 [[data-gift-running]_&]:hidden",
            raised ? "bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.5rem)]" : "bottom-[max(1rem,env(safe-area-inset-bottom))]",
          )}
        >
          <MessageCircleQuestionMark className="size-6" aria-hidden />
        </button>
      ) : null}
      {wanted ? (
        <SupportPanel
          open={open}
          onClose={() => {
            setOpen(false);
            // Back to the button that opened it, once it is on the page again.
            requestAnimationFrame(() => button.current?.focus());
          }}
        />
      ) : null}
    </>
  );
}
