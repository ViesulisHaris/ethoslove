"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Gift } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, getPathname, usePathname } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import { closeInApp } from "@/lib/app/bridge";
import type { GameKey } from "@/lib/games/catalogue";
import { nextGames } from "@/lib/games/next";
import { Sticker } from "@/templates/_shared/covers/stickers";
import { PlayingCard } from "./cards";

/**
 * What every game ends on, under its own score: a gift for the person across the table first, then
 * two games named for the one just played (lib/games/next.ts), each a tap from being dealt. On two
 * phones the guest is also asked to deal the next one themselves: they came in on somebody else's
 * link, and this is where a guest becomes a host.
 */
export function GameEnd({ game, phones = 1, guest = false }: { game: GameKey; phones?: 1 | 2; guest?: boolean }) {
  const t = useTranslations("games.end");
  const tg = useTranslations("games");
  const locale = useLocale();
  const pathname = usePathname();
  // The whole address, locale prefix and all: the room is left with a real page load (see below).
  const ownRoom = getPathname({ href: { pathname, query: { mode: "two" } }, locale });

  // A game finished, counted once per end screen.
  const counted = useRef(false);
  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    track("game_finished", { game, phones });
  }, [game, phones]);

  return (
    <nav aria-label={t("label")} className="mx-auto mt-10 w-full max-w-xl text-left">
      {/* Inside the iPhone app the gifts are a tab of their own: no link out to the site's gallery. */}
      <Link href="/templates?ref=game-end" data-app-hide onClick={() => track("game_end_pick", { game, to: "gift" })} className="group block rounded-[20px]">
        <PlayingCard rank="A" suit="heart" className="h-full transition-transform duration-300 ease-(--ease-out-quint) group-hover:-translate-y-1.5" faceClassName="min-h-[164px] px-6 pt-11 pb-6">
          <Gift aria-hidden="true" className="size-6 text-rose-deep" />
          <span className="mt-3 block font-display text-[23px] leading-tight">{t("gift")}</span>
          <span className="mt-1.5 block text-[14px] leading-snug text-forest/65">{t("giftBlurb")}</span>
        </PlayingCard>
      </Link>

      <p className="mt-6 text-eyebrow text-blush">{t("next")}</p>
      {/* The two named games are web links. Inside the iPhone app a page cannot open another game (a
          link that leaves what the app opened closes it, lib/app/bridge.ts), so a named card there
          would land on the app's list, not on the game it names: the app gets one plain card instead
          that says where it goes. */}
      <div data-app-hide className="mt-3 grid grid-cols-2 gap-3">
        {nextGames(game).map((g) => (
          <Link key={g.key} href={g.href} data-next-game={g.key} onClick={() => track("game_end_pick", { game, to: g.key })} className="group block rounded-[20px]">
            <PlayingCard rank={g.rank} suit={g.suit} className="h-full transition-transform duration-300 ease-(--ease-out-quint) group-hover:-translate-y-1.5" faceClassName="min-h-[150px] items-center px-3 pt-9 pb-4 text-center sm:px-6">
              <span className="block size-12 sm:size-14">
                <Sticker id={g.sticker} />
              </span>
              <span className="mt-2 block font-display text-[18px] leading-tight sm:text-[21px]">{tg(`${g.key}.title`)}</span>
              <span className="mt-1.5 block text-[12.5px] font-semibold text-forest/70">{tg(g.phones === "two" ? "play.two" : "play.one")}</span>
            </PlayingCard>
          </Link>
        ))}
      </div>

      <Link href="/games" data-app-only data-end-games onClick={(e) => closeInApp(e)} className="group mt-3 block rounded-[20px]">
        <PlayingCard rank="7" suit="club" className="transition-transform duration-300 ease-(--ease-out-quint) group-hover:-translate-y-1.5" faceClassName="min-h-[96px] justify-center px-6 py-6">
          <span className="flex items-center gap-2 font-display text-[21px] leading-tight">
            {t("another")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </span>
        </PlayingCard>
      </Link>

      {game === "rather" ? (
        <Link href="/games/today" data-end-today onClick={() => track("game_end_pick", { game, to: "today" })} className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-cream/75 underline decoration-cream/30 underline-offset-4 hover:text-cream">
          {t("today")}
        </Link>
      ) : null}

      {guest ? (
        <div className="mt-3 flex flex-col items-start gap-3 rounded-[20px] bg-white/[0.07] px-5 py-4 ring-1 ring-white/12 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="block font-display text-[21px] leading-tight text-cream">{t("host.title")}</span>
            <span className="mt-1 block text-[14px] leading-snug text-cream/65">{t("host.blurb")}</span>
          </p>
          {/* A plain link on purpose: the same page with a client-side hop would keep this room's
              game on screen. A fresh load leaves the room and opens the lobby ready to make one. */}
          <a href={ownRoom} onClick={() => track("game_end_pick", { game, to: "host" })} className="btn-rose inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-6 text-[15px] font-semibold">
            {t("host.cta")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </a>
        </div>
      ) : null}
    </nav>
  );
}
