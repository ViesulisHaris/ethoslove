import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { eitherOr } from "@/components/games/question-list";
import { WEEKLY_FAQ } from "@/content/game-pages";
import { GAMES, HAND_GAMES } from "@/lib/games/catalogue";
import { PACK_IDS, PACKS } from "@/lib/games/packs";
import { WEEKLY_SETS, weeklyCards } from "@/lib/games/weekly";

/**
 * At most 300 words visible on a page (docs/marketing/growth-build/DESIGN-LESS-TEXT.md), held here
 * for the two pages of the games that are made of message strings only: the hub (/games) and the
 * weekly challenge (/games/weekly). The browser counts the whole page as it is drawn
 * (tests/e2e/games2.spec.ts, G1); this adds up every string each page draws on first sight, from
 * the catalogues, so a longer line or a new card is caught here first, in every week's set. The
 * site's header and footer are not the page's, and are not counted (as G1 does not). A playing
 * card's two corner ranks ("K", "10") are counted as the browser counts them: two words a card.
 */
type Lang = "en" | "es";
type Messages = typeof en;
const CATALOGUES: Record<Lang, Messages> = { en, es: es as Messages };
const words = (...texts: string[]) => texts.join(" ").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const LIMIT = 300;
/** The two corner ranks of a playing card drawn with its face up. */
const ranks = (cards: number) => 2 * cards;

/** The hub as games/page.tsx draws it: the hero, the two cards played by a link, a card a game, the tiers and the packs. */
function hubWords(l: Lang): number {
  const m = CATALOGUES[l];
  const g = m.games;
  const hero = [g.hub.eyebrow, g.h1a, g.h1b, g.hub.sub, g.hub.one, g.hub.two, g.hub.deal, g.hub.pickTitle];
  const linkCards = [g.hub.todayTitle, g.hub.todayPhones, g.hub.minutes, g.hub.todayCta, g.hub.weeklyTitle, g.hub.todayPhones, g.hub.minutes, g.hub.weeklyCta];
  const games = GAMES.flatMap((game) => [g[game.key].title, game.phones === "two" ? g.play.two : g.play.one, g.hub.minutes, g.play.cta]);
  const tiers = (["free", "pack", "two"] as const).flatMap((tier) => [g.hub.tiers[tier].title, g.hub.tiers[tier].line]).concat(g.hub.tiers.cta);
  const packs = PACK_IDS.flatMap((id) => [PACKS[id].name[l], m.packs.sheet.plays, ...PACKS[id].games.map((key) => m.packs.games[key as keyof typeof m.packs.games]), m.packs.hub.cta]);
  // The hand in the hero, today's and this week's cards, and a card a game.
  return words(...hero, ...linkCards, ...games, m.packs.hub.title, ...tiers, ...packs) + ranks(HAND_GAMES.length + 2 + GAMES.length);
}

/** The weekly page as weekly/page.tsx and its challenge draw it before a tap: the heading, the first pair and the send row, the question and the dare, the links and the closed rows. */
function weeklyWords(l: Lang, set: (typeof WEEKLY_SETS)[number]): number {
  const w = CATALOGUES[l].games.weekly;
  const g = CATALOGUES[l].games;
  const cards = weeklyCards(set);
  const top = [w.label, w.h1, w.line, w.now.replace("{theme}", set.theme[l]), w.prompt, w.step, cards.picks[0].a[l], w.or, cards.picks[0].b[l], w.nameLabel, w.send, w.copy];
  const together = [w.together.label, w.together.heading, w.together.lineThen, w.together.ask, cards.ask[l], w.together.dare, cards.dare[l]];
  const more = [w.more.label, w.more.heading, w.more.line, g.thisthat.title, g.deck.title, g.dare.title, g.hub.todayTitle, w.more.all, ...WEEKLY_FAQ.map((f) => f.q[l]), w.more.cards];
  // The question's card and the dare's.
  return words(...top, ...together, ...more) + ranks(2);
}

describe("words on the games' own pages", () => {
  it("P1: the hub shows at most 300 words, in both languages", () => {
    for (const l of ["en", "es"] as const) expect(hubWords(l), l).toBeLessThanOrEqual(LIMIT);
  });

  it("P2: the weekly challenge shows at most 300 words in every week's set, in both languages, with room for its later states", () => {
    for (const l of ["en", "es"] as const)
      for (const set of WEEKLY_SETS) {
        const n = weeklyWords(l, set);
        expect(n, `${set.id} ${l}`).toBeLessThanOrEqual(LIMIT);
        // The reveal adds three rows of two picks, a line and the gift's two lines: about 60 words more.
        expect(n + 60, `${set.id} ${l}, revealed`).toBeLessThanOrEqual(LIMIT);
      }
  });

  it("P3: the count is a real count: the strings it adds up are not empty", () => {
    for (const l of ["en", "es"] as const) {
      expect(hubWords(l), l).toBeGreaterThan(150);
      expect(weeklyWords(l, WEEKLY_SETS[0]), l).toBeGreaterThan(80);
    }
  });
});
