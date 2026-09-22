import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { GAMES, type GameKey } from "@/lib/games/catalogue";
import { Sticker } from "@/templates/_shared/covers/stickers";
import { PlayingCard } from "./cards";

/**
 * Every game as a hand of cards, fanned; each card opens its game. Everything is sized in the
 * hand's own width (cqw), so it fills whatever column it is put in and the outer cards never spill
 * onto the words beside it.
 */
export function GameHand({ titles, label, className }: { titles: Record<GameKey, string>; label: string; className?: string }) {
  const middle = (GAMES.length - 1) / 2;
  // The outer cards sit 34cqw either side of the middle, however many there are. A card is 1.6
  // steps wide, so each one covers only part of the one before it: the middle of every card stays
  // uncovered, which is what a finger aims at. More games means a tighter fan and smaller cards.
  const step = 68 / (GAMES.length - 1);
  const card = Math.min(24, step * 1.6);
  const tilt = 36 / (GAMES.length - 1);
  return (
    <ul className={cn("relative mx-auto aspect-[16/9] w-full max-w-[560px] [container-type:inline-size]", className)} aria-label={label} style={{ ["--card-w" as string]: `${card.toFixed(2)}cqw` }}>
      {GAMES.map((g, i) => {
        const k = i - middle;
        return (
          <li key={g.key} className="absolute top-[7%] left-1/2 w-[var(--card-w)] hover:z-20 focus-within:z-20" style={{ rotate: `${(k * tilt).toFixed(2)}deg`, marginLeft: `calc(${(k * step).toFixed(2)}cqw - var(--card-w) / 2)`, marginTop: `${(k * k).toFixed(2)}cqw`, transformOrigin: "50% 120%" }}>
            <Link href={g.href} aria-label={titles[g.key]} className="group block rounded-[16px]">
              <PlayingCard rank={g.rank} suit={g.suit} radius={16} className="aspect-[5/7] w-full transition-transform duration-300 ease-(--ease-out-quint) group-hover:-translate-y-6 group-focus-visible:-translate-y-6" faceClassName="items-center justify-center">
                <span className="block w-[64%]">
                  <Sticker id={g.sticker} />
                </span>
              </PlayingCard>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
