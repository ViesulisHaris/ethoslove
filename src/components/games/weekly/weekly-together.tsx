"use client";

import { useLocale } from "next-intl";
import { GAMES, type GameKey } from "@/lib/games/catalogue";
import { setById, weeklyCards, weeklySet } from "@/lib/games/weekly";
import { Sticker } from "@/templates/_shared/covers/stickers";
import { PlayingCard } from "../cards";
import { useWeekInView } from "./in-view";

/** A game's own card from the shelf (lib/games/catalogue.ts), small: the picture beside a line that comes from that game's deck. */
function ShelfCard({ game, tone, turn }: { game: GameKey; tone: "lilac" | "blush"; turn: string }) {
  const g = GAMES.find((x) => x.key === game)!;
  return (
    <PlayingCard rank={g.rank} suit={g.suit} tone={tone} corners="sm" radius={10} className={`aspect-[5/7] h-24 ${turn}`} faceClassName="items-center justify-center shadow-page-card">
      <span className="block w-[56%]">
        <Sticker id={g.sticker} />
      </span>
    </PlayingCard>
  );
}

/**
 * The fourth and fifth cards of the week's set (/games/weekly): a question to ask out loud and a
 * dare, for when both have answered the three. Two picture cards side by side on a desk; on a phone
 * two short rows, the picture small at the start of each (no swipe row: there are only two). The
 * week the server rendered with, until the challenge above shows a set from another week (./in-view).
 */
export function WeeklyTogether({ week, labels }: { week: number; labels: { ask: string; dare: string } }) {
  const locale = useLocale() === "es" ? "es" : "en";
  const { setId } = useWeekInView();
  const cards = weeklyCards((setId ? setById(setId) : null) ?? weeklySet(week));
  const rows = [
    { key: "ask", label: labels.ask, line: cards.ask[locale], picture: <ShelfCard game="deck" tone="lilac" turn="-rotate-4" /> },
    { key: "dare", label: labels.dare, line: cards.dare[locale], picture: <ShelfCard game="dare" tone="blush" turn="rotate-5" /> },
  ];
  return (
    <ul id="weekly-together-cards" className="grid gap-3 sm:grid-cols-2 sm:gap-4">
      {rows.map((row) => (
        <li key={row.key} data-card data-together={row.key} className="flex items-center gap-4 rounded-[1.25rem] border border-page-line bg-page-raised py-4 pr-5 pl-4 shadow-page-card sm:flex-col sm:items-start sm:gap-5 sm:p-6">
          <span aria-hidden="true" className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center">
            {row.picture}
          </span>
          <span className="min-w-0">
            <span className="block text-page-label text-page-body">{row.label}</span>
            <span className="mt-2 block font-display text-[1.25rem] leading-snug text-page-ink sm:text-[1.375rem]">{row.line}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
