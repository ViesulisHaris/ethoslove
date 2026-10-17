"use client";

import { useRef, type CSSProperties } from "react";
import { ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog } from "radix-ui";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { LocaleSwitcher } from "./locale-switcher";
import { AuthStatus } from "./auth-status";
import { ROOMS, type RoomKey } from "./rooms";

/**
 * The phone and tablet menu: a full-height sheet from the right with a tile for each room (its
 * icon, its name and a line on what is in it), the rooms dealt in one after another, and the rose
 * "Make a gift" at the bottom where a thumb rests.
 *
 * A Radix dialog, so the page behind is locked and inert, focus stays inside, and Escape or a tap
 * on the dimmed page closes it; the sheet slides back out the way it came.
 */
export function MenuSheet({ open, onOpenChange, current }: { open: boolean; onOpenChange: (open: boolean) => void; current: RoomKey | null }) {
  const t = useTranslations();
  const close = useRef<HTMLButtonElement>(null);
  const done = () => onOpenChange(false);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label={t("common.openMenu")}
          className="grid size-11 shrink-0 place-items-center rounded-full text-forest transition-[background-color,scale] duration-200 hover:bg-rose-mist active:scale-95"
        >
          {/* Two lines, not three: the quieter glyph, the way Apple draws it. */}
          <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3.5 7.25h13M3.5 12.75h13" />
          </svg>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        {/* Over everything a page floats of its own: at 50, the Dates page's Map button (55) and an
            open place (60) sat on top of the menu. Only the tour (100) is higher. */}
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-forest/30 supports-backdrop-filter:backdrop-blur-[3px] data-open:animate-in data-open:fade-in-0 data-open:duration-300 data-open:ease-(--ease-out-quint) data-closed:animate-out data-closed:fade-out-0 data-closed:duration-200" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            // To the way out, not to the first thing in the sheet (the language pill).
            event.preventDefault();
            close.current?.focus();
          }}
          className="fixed inset-y-0 right-0 z-[80] flex w-[min(88vw,25rem)] flex-col rounded-l-[28px] bg-blush-paper text-forest shadow-[-30px_0_70px_-30px_rgba(60,15,35,0.5)] outline-none data-open:animate-in data-open:slide-in-from-right data-open:duration-[440ms] data-open:ease-(--ease-out-quint) data-closed:animate-out data-closed:slide-out-to-right data-closed:duration-[260ms] data-closed:ease-(--ease-in-out-quart)"
        >
          <Dialog.Title className="sr-only">{t("nav.menuLabel")}</Dialog.Title>
          <div className="flex shrink-0 items-center justify-between gap-2 pt-[max(0.75rem,env(safe-area-inset-top))] pr-3 pb-2 pl-5">
            <Logo />
            <div className="flex items-center gap-1">
              <LocaleSwitcher />
              <Dialog.Close
                ref={close}
                aria-label={t("common.closeMenu")}
                className="grid size-11 place-items-center rounded-full text-forest/80 transition-[background-color,color,scale] duration-200 hover:bg-rose-mist hover:text-forest active:scale-95"
              >
                <X aria-hidden="true" className="size-5" strokeWidth={1.9} />
              </Dialog.Close>
            </div>
          </div>
          {/*
           * Scrolls when it must: six tiles and the buttons are taller than a 640px phone, and a phone
           * held sideways runs out after two. `min-h-0` lets it shrink to the sheet instead of
           * growing past it; `overscroll-contain` keeps a fling at the end from tugging the page.
           */}
          <nav aria-label={t("nav.menuLabel")} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-2 pb-4">
            <ul className="flex flex-col gap-2">
              {ROOMS.map(({ href, key, Icon }, i) => {
                const here = key === current;
                return (
                  <li key={href} className="menu-item-in" style={{ "--i": i } as CSSProperties}>
                    <Link
                      href={href}
                      aria-current={here ? "page" : undefined}
                      onClick={done}
                      className={cn(
                        "group flex min-h-[4.5rem] items-center gap-3.5 rounded-[22px] py-3 pr-3.5 pl-3 ring-1 transition-[background-color,scale,box-shadow] duration-200 ease-(--ease-out-quint) active:scale-[0.98]",
                        here ? "bg-rose-soft ring-rose/15" : "bg-white/80 shadow-[0_1px_2px_rgba(60,20,40,0.04)] ring-forest/[0.06] hover:bg-white",
                      )}
                    >
                      <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", here ? "bg-white text-rose" : "bg-rose-mist text-rose-deep")}>
                        <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("font-display block text-[1.35rem] leading-tight", here && "text-rose-deep")}>{t(`nav.${key}`)}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-forest/60">{t(`nav.blurb.${key}`)}</span>
                      </span>
                      <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-forest/30 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {/* Clear of the home indicator, or the rose button sits under it on an iPhone. */}
          <div className="menu-item-in shrink-0 border-t border-forest/[0.07] px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]" style={{ "--i": ROOMS.length } as CSSProperties}>
            <AuthStatus block onNavigate={done} />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
