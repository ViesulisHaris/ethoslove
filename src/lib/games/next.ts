import { GAMES, type GameInfo, type GameKey } from "./catalogue";

/**
 * The two games offered at the end of each: first one that is played the same way (one phone, or
 * one or two), then one that is played the other way. Every game is somebody's next game.
 */
export const NEXT_GAMES: Record<GameKey, readonly [GameKey, GameKey]> = {
  know: ["thisthat", "deck"],
  rather: ["know", "dare"],
  thisthat: ["rather", "deck"],
  draw: ["know", "memory"],
  memory: ["roulette", "draw"],
  deck: ["dare", "know"],
  dare: ["deck", "rather"],
  roulette: ["memory", "rather"],
};

export const nextGames = (game: GameKey): [GameInfo, GameInfo] => NEXT_GAMES[game].map((key) => GAMES.find((g) => g.key === key)!) as [GameInfo, GameInfo];
