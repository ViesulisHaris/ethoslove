import { GAMES, type GameInfo } from "@/lib/games/catalogue";

export type LdrGame = Pick<GameInfo, "href" | "rank" | "suit" | "sticker"> & { id: "draw" | "rather" };

const game = (key: LdrGame["id"]): LdrGame => {
  const g = GAMES.find((x) => x.key === key)!;
  return { id: key, href: g.href, rank: g.rank, suit: g.suit, sticker: g.sticker };
};

/**
 * The games that play across a call: two that deal to two phones. Only games whose page exists go
 * here (tests/unit/rooms-links.test.ts checks each address against the app folder): the day's one
 * question at /games/today is the games area's, and joins once that page is merged.
 */
export const LDR_GAMES: LdrGame[] = [game("draw"), game("rather")];
