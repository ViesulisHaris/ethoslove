"use client";

import { useState } from "react";
import { Gamepad2, Gift, Luggage, MapPinned, Menu, Plane, Tag } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useScrolledPast } from "@/hooks/use-scrolled-past";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { LocaleSwitcher } from "./locale-switcher";
import { AuthStatus } from "./auth-status";
import { MakeGiftLink } from "./make-gift-link";

/**
 * Which room a path belongs to, so the navbar can say where you are. Gifts has several front doors.
 * `wide` rooms only join the desktop bar from `xl`: six rooms and "Crear un regalo" overflow the
 * pill at 1024px in Spanish, so Pricing, which the footer and the menu also carry, steps out there.
 */
const ROOMS = [
  { href: "/dates", key: "dates", Icon: MapPinned, match: ["/dates", "/plan"], wide: false },
  { href: "/trips", key: "trips", Icon: Luggage, match: ["/trips"], wide: false },
  { href: "/gifts", key: "gifts", Icon: Gift, match: ["/gifts", "/templates", "/occasions", "/create", "/demo"], wide: false },
  { href: "/long-distance", key: "longDistance", Icon: Plane, match: ["/long-distance"], wide: false },
  { href: "/games", key: "games", Icon: Gamepad2, match: ["/games"], wide: false },
  { href: "/pricing", key: "pricing", Icon: Tag, match: ["/pricing"], wide: true },
] as const;

/**
 * A floating pill of frosted white. Light, so it reads as part of the paper it floats over, and it
 * still holds on the wine sections; the room you are in is marked, because with six of them
 * "where am I" is a real question.
 */
export function MarketingHeader() {
  const t = useTranslations();
  const pathname = usePathname();
  const scrolled = useScrolledPast(12);
  const [open, setOpen] = useState(false);
  const isIn = (match: readonly string[]) => match.some((m) => pathname === m || pathname.startsWith(`${m}/`));

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
      >
        {t("common.skipToContent")}
      </a>

      <div className="px-3 pt-3 sm:px-5">
        <div
          className={cn(
            // Under 360px a little less air, so "Crear un regalo" stays one line on a 320px phone.
            "glass-petal mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-full pr-2 pl-5 text-forest transition-shadow duration-300 max-[359px]:gap-2 max-[359px]:pl-4",
            scrolled && "shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_22px_54px_-22px_rgba(120,20,60,0.55)]",
          )}
        >
          {/* 44px tall for a thumb; the bar is 56. */}
          <Link href="/" className="inline-flex h-11 items-center rounded-full" aria-label={t("common.brand")}>
            <Logo />
          </Link>

          {/* Six rooms and three controls do not fit a tablet, in Spanish least of all: below `lg` it is the menu button. */}
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label={t("nav.mainLabel")}>
            {ROOMS.map(({ href, key, match, wide }) => {
              const here = isIn(match);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={here ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-[14.5px] font-medium whitespace-nowrap transition-colors",
                    wide && "hidden xl:inline",
                    here ? "bg-rose-soft text-rose-deep" : "text-forest/70 hover:bg-rose-mist hover:text-forest",
                  )}
                >
                  {t(`nav.${key}`)}
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-1 lg:flex">
            <LocaleSwitcher className="text-forest/75 hover:bg-rose-mist hover:text-forest" />
            <AuthStatus />
          </div>

          <div className="flex items-center gap-1 lg:hidden">
            <MakeGiftLink className="btn-rose inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold whitespace-nowrap max-[359px]:px-3">
              {t("common.createGift")}
            </MakeGiftLink>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <button type="button" aria-label={t("common.openMenu")} className="grid size-10 place-items-center rounded-full text-forest hover:bg-rose-mist">
                  <Menu className="size-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" closeLabel={t("common.closeMenu")} className="w-[86vw] max-w-sm border-l-0 bg-blush-paper text-forest">
                <SheetTitle className="sr-only">{t("common.openMenu")}</SheetTitle>
                {/*
                 * Scrolls when it must: with six rooms, a 667px phone runs out of height before the
                 * sign-in buttons, and a phone held sideways (390px) before the fourth room. The body
                 * is locked while the sheet is open, so this column is the only thing that can move;
                 * `min-h-0` lets it shrink to the sheet instead of growing past it, and
                 * `overscroll-contain` keeps a fling at the end from tugging the locked page.
                 */}
                <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto overscroll-contain px-2 pt-10">
                  <Logo />
                  <nav className="flex flex-col gap-1" aria-label={t("nav.menuLabel")}>
                    {ROOMS.map(({ href, key, Icon, match }) => {
                      const here = isIn(match);
                      return (
                        <Link
                          key={href}
                          href={href}
                          aria-current={here ? "page" : undefined}
                          onClick={() => setOpen(false)}
                          className={cn("flex items-center gap-3.5 rounded-2xl px-3 py-3 font-display text-[1.6rem] leading-none", here ? "bg-rose-soft text-rose-deep" : "text-forest hover:bg-rose-mist")}
                        >
                          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", here ? "bg-white text-rose" : "bg-white text-forest/60 shadow-soft")}>
                            <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
                          </span>
                          {t(`nav.${key}`)}
                        </Link>
                      );
                    })}
                  </nav>
                  {/* Clear of the home indicator, or the language switch sits under it on an iPhone. */}
                  <div className="mt-auto flex flex-col gap-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                    <AuthStatus onNavigate={() => setOpen(false)} block />
                    <LocaleSwitcher className="text-forest/75 hover:bg-rose-mist hover:text-forest" />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
