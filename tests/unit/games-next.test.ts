import { describe, expect, it } from "vitest";
import { GAMES } from "@/lib/games/catalogue";
import { NEXT_GAMES, nextGames } from "@/lib/games/next";

describe("the end of a game names the next two", () => {
  it("N1: every game offers two other games, never itself and never the same one twice", () => {
    for (const g of GAMES) {
      const [a, b] = NEXT_GAMES[g.key];
      expect(a).not.toBe(g.key);
      expect(b).not.toBe(g.key);
      expect(a).not.toBe(b);
      expect(nextGames(g.key).map((n) => n.key)).toEqual([a, b]);
    }
  });

  it("N2: the first is played the same way, the second the other way", () => {
    for (const g of GAMES) {
      const [same, other] = nextGames(g.key);
      expect(same.phones, g.key).toBe(g.phones);
      expect(other.phones, g.key).not.toBe(g.phones);
    }
  });

  it("N3: every game is somebody's next game", () => {
    const offered = new Set(Object.values(NEXT_GAMES).flat());
    for (const g of GAMES) expect(offered.has(g.key), g.key).toBe(true);
  });
});
