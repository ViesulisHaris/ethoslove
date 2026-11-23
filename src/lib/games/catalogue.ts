import type { StickerId } from "@/templates/_shared/covers/stickers";

/** The games on the shelf, in the order they are offered. Each is a card: a rank, a suit, a sticker. */
export type GameKey = "know" | "rather" | "thisthat" | "draw" | "memory" | "deck" | "dare" | "roulette";
export type GameInfo = {
  key: GameKey;
  href: string;
  rank: string;
  suit: "heart" | "diamond" | "club" | "spade";
  sticker: StickerId;
  phones: "one" | "two";
  minutes: number;
  /** On the website only: not in the iPhone app's catalogue nor in the fanned hand (see HAND_GAMES). */
  webOnly?: true;
};

export const GAMES: GameInfo[] = [
  { key: "know", href: "/games/know", rank: "K", suit: "heart", sticker: "heart", phones: "two", minutes: 10 },
  { key: "rather", href: "/games/rather", rank: "A", suit: "diamond", sticker: "cherries", phones: "two", minutes: 5 },
  { key: "thisthat", href: "/games/this-or-that", rank: "10", suit: "club", sticker: "bow", phones: "two", minutes: 5, webOnly: true },
  { key: "draw", href: "/games/draw", rank: "9", suit: "diamond", sticker: "squiggle", phones: "two", minutes: 10 },
  { key: "memory", href: "/games/memory", rank: "2", suit: "diamond", sticker: "butterfly", phones: "one", minutes: 5 },
  { key: "deck", href: "/games/deck", rank: "Q", suit: "heart", sticker: "mug", phones: "one", minutes: 15 },
  { key: "dare", href: "/games/dare", rank: "J", suit: "spade", sticker: "kiss", phones: "one", minutes: 10 },
  { key: "roulette", href: "/games/roulette", rank: "7", suit: "club", sticker: "candy", phones: "one", minutes: 1 },
];

/**
 * The seven the iPhone app knows and the fanned hand is drawn for (GameHand, on the hub and the home
 * page). The app reads its games from /api/app/catalog and nobody can see from here what a shipped
 * app does with a game it has never heard of; a hand of more cards leaves a thumb too little of
 * each on a phone. So both keep the seven until someone has looked at each with more.
 */
export const HAND_GAMES: GameInfo[] = GAMES.filter((g) => !g.webOnly);
