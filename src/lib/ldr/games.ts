import { GAMES, type GameInfo } from "@/lib/games/catalogue";

export type LdrGame = Pick<GameInfo, "href" | "rank" | "suit" | "sticker"> & { id: "draw" | "rather" | "today" };

const game = (key: "draw" | "rather"): LdrGame => {
  const g = GAMES.find((x) => x.key === key)!;
  return { id: key, href: g.href, rank: g.rank, suit: g.suit, sticker: g.sticker };
};

/**
 * The games that play across a call: two that deal to two phones, and the day's one question.
 * "/games/today" is built by the games area of the growth build: whoever merges checks the page is
 * there, or removes the third entry.
 */
export const LDR_GAMES: LdrGame[] = [game("draw"), game("rather"), { id: "today", href: "/games/today", rank: "10", suit: "spade", sticker: "sparkle" }];
