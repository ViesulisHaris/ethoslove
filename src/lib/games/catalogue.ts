import type { StickerId } from "@/templates/_shared/covers/stickers";

/** The games on the shelf, in the order they are offered. Each is a card: a rank, a suit, a sticker. */
export type GameKey = "know" | "rather" | "memory" | "deck" | "dare" | "roulette";
export type GameInfo = { key: GameKey; href: string; rank: string; suit: "heart" | "diamond" | "club" | "spade"; sticker: StickerId; phones: "one" | "two"; minutes: number };

export const GAMES: GameInfo[] = [
  { key: "know", href: "/games/know", rank: "K", suit: "heart", sticker: "heart", phones: "two", minutes: 10 },
  { key: "rather", href: "/games/rather", rank: "A", suit: "diamond", sticker: "cherries", phones: "two", minutes: 5 },
  { key: "memory", href: "/games/memory", rank: "2", suit: "diamond", sticker: "butterfly", phones: "one", minutes: 5 },
  { key: "deck", href: "/games/deck", rank: "Q", suit: "heart", sticker: "mug", phones: "one", minutes: 15 },
  { key: "dare", href: "/games/dare", rank: "J", suit: "spade", sticker: "kiss", phones: "one", minutes: 10 },
  { key: "roulette", href: "/games/roulette", rank: "7", suit: "club", sticker: "candy", phones: "one", minutes: 1 },
];
