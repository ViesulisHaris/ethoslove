"use client";

import { ArrowRight, Gift, Shuffle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, getPathname, usePathname } from "@/i18n/navigation";
import { PlayingCard } from "./cards";
import { closeInApp } from "@/lib/app/bridge";

/**
 * What every game ends on, under its own score: a gift for the person across the table, or another
 * game. On two phones the guest is also asked to deal the next one themselves: they came in on
 * somebody else's link, and this is where a guest becomes a host.
 */
export function GameEnd({ guest = false }: { guest?: boolean }) {
  const t = useTranslations("games.end");
  const locale = useLocale();
  const pathname = usePathname();
  // The whole address, locale prefix and all: the room is left with a real page load (see below).
  const ownRoom = getPathname({ href: { pathname, query: { mode: "two" } }, locale });
  return (
    <nav aria-label={t("label")} className="mx-auto mt-10 w-full max-w-xl text-left">
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Inside the iPhone app the gifts are a tab of their own: no link out to the site's gallery. */}
        <Link href="/templates?ref=game-end" data-app-hide className="group block rounded-[20px]">
          <PlayingCard rank="A" suit="heart" className="h-full transition-transform duration-300 ease-(--ease-out-quint) group-hover:-translate-y-1.5" faceClassName="min-h-[164px] px-6 pt-11 pb-6">
            <Gift aria-hidden="true" className="size-6 text-rose-deep" />
            <span className="mt-3 block font-display text-[23px] leading-tight">{t("gift")}</span>
            <span className="mt-1.5 block text-[14px] leading-snug text-forest/65">{t("giftBlurb")}</span>
          </PlayingCard>
        </Link>
        <Link href="/games#pick" onClick={closeInApp} className="group block rounded-[20px]">
          <PlayingCard rank="K" suit="spade" className="h-full transition-transform duration-300 ease-(--ease-out-quint) group-hover:-translate-y-1.5" faceClassName="min-h-[164px] px-6 pt-11 pb-6">
            <Shuffle aria-hidden="true" className="size-6 text-rose-deep" />
            <span className="mt-3 block font-display text-[23px] leading-tight">{t("another")}</span>
            <span className="mt-1.5 block text-[14px] leading-snug text-forest/65">{t("anotherBlurb")}</span>
          </PlayingCard>
        </Link>
      </div>
      {guest ? (
        <div className="mt-3 flex flex-col items-start gap-3 rounded-[20px] bg-white/[0.07] px-5 py-4 ring-1 ring-white/12 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="block font-display text-[21px] leading-tight text-cream">{t("host.title")}</span>
            <span className="mt-1 block text-[14px] leading-snug text-cream/65">{t("host.blurb")}</span>
          </p>
          {/* A plain link on purpose: the same page with a client-side hop would keep this room's
              game on screen. A fresh load leaves the room and opens the lobby ready to make one. */}
          <a href={ownRoom} className="btn-rose inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-6 text-[15px] font-semibold">
            {t("host.cta")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        </div>
      ) : null}
    </nav>
  );
}
