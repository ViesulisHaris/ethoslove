"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/shared/logo";
import { useHeaderScroll } from "@/components/motion/use-header-scroll";
import { LocaleSwitcher } from "./locale-switcher";
import { AuthStatus } from "./auth-status";
import { MakeGiftLink } from "./make-gift-link";
import { MenuSheet } from "./menu-sheet";
import { RoomNav } from "./room-nav";
import { roomOf } from "./rooms";

/**
 * A floating pill of frosted white. Light, so it reads as part of the paper it floats over, and it
 * still holds on the wine sections; the room you are in is marked, because with six of them
 * "where am I" is a real question.
 *
 * It rests 12px down and 56px tall (the layout's --header-h, 76px, leaves it that room). Past the
 * first 24px of scroll its glass tightens to 50px, it rises 4px and frosts over; scrolling down
 * slides it away and scrolling up brings it back (see .site-header in globals.css). Everything in it
 * is a 44px target, centred on the bar's midline.
 */
export function MarketingHeader() {
  const t = useTranslations();
  const pathname = usePathname();
  const current = roomOf(pathname);
  const { compact, hidden } = useHeaderScroll();
  // The menu is open on the page it was opened on: a navigation (a room, back) closes it by itself.
  const [menuOn, setMenuOn] = useState<string | null>(null);
  const menuOpen = menuOn === pathname;

  return (
    <header
      className="site-header pointer-events-none fixed inset-x-0 top-0 z-40"
      data-compact={compact ? "" : undefined}
      data-hidden={hidden && !menuOpen ? "" : undefined}
    >
      <a
        href="#main"
        className="pointer-events-auto sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-forest focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-cream"
      >
        {t("common.skipToContent")}
      </a>

      <div className="site-header-float px-3 pt-3 sm:px-5">
        <div className="site-header-bar pointer-events-auto relative isolate mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full pr-1.5 pl-4 text-forest max-[359px]:gap-1 max-[359px]:pl-3">
          {/* The airy glass, and over it the denser glass and deeper shadow of the tightened bar. */}
          <span aria-hidden="true" className="site-header-glass glass-petal absolute inset-0 -z-10 rounded-full" />
          <span
            aria-hidden="true"
            className="site-header-glass site-header-frost absolute inset-0 -z-10 rounded-full bg-white/50 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset,0_24px_50px_-22px_rgba(120,20,60,0.5)] supports-backdrop-filter:backdrop-blur-sm"
          />

          <Link
            href="/"
            aria-label={t("common.brand")}
            className="inline-flex h-11 shrink-0 items-center rounded-full px-1 transition-[scale] duration-200 active:scale-[0.97]"
          >
            <Logo />
          </Link>

          {/* Six rooms and three controls do not fit a tablet, in Spanish least of all: below `lg` it is the menu. */}
          <RoomNav current={current} />

          <div className="hidden items-center gap-1 lg:flex">
            <LocaleSwitcher />
            <AuthStatus />
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            {/* Under 360px a little less air, so "Crear un regalo" stays one line on a 320px phone. */}
            <MakeGiftLink className="btn-rose inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap max-[359px]:px-3">
              {t("common.createGift")}
            </MakeGiftLink>
            <MenuSheet open={menuOpen} onOpenChange={(open) => setMenuOn(open ? pathname : null)} current={current} />
          </div>
        </div>
      </div>
    </header>
  );
}
