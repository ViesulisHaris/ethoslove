import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { GAMES, type GameKey } from "@/lib/games/catalogue";
import { Sticker } from "@/templates/_shared/covers/stickers";
import { PlayingCard } from "./cards";

/**
 * Every game as a hand of cards, fanned; each card opens its game. Sized in its own width (cqw),
 * so the outer cards never spill out of whatever column it is put in.
 */
export function GameHand({ titles, label, className }: { titles: Record<GameKey, string>; label: string; className?: string }) {
  const middle = (GAMES.length - 1) / 2;
  return (
    <ul className={cn("relative mx-auto aspect-[16/9] w-full max-w-[560px] [container-type:inline-size]", className)} aria-label={label}>
      {GAMES.map((g, i) => {
        const k = i - middle;
        return (
          <li key={g.key} className="absolute top-[7%] left-1/2 w-[24cqw] hover:z-20 focus-within:z-20" style={{ rotate: `${k * 7}deg`, marginLeft: `calc(${k * 10}cqw - 12cqw)`, marginTop: `${k * k}cqw`, transformOrigin: "50% 120%" }}>
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
