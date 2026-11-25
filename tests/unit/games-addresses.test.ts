import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { GAMES_LIVE, pageUpdated } from "@/content/page-dates";
import { appCatalog } from "@/lib/app/catalog";
import { GAME_MOVES, GAMES, HAND_GAMES } from "@/lib/games/catalogue";
import { LDR_GAMES } from "@/lib/ldr/games";

/**
 * The games' addresses (growth build, games2): each game lives at the words people search for it,
 * and every address a game had before still opens it, for good, by one permanent redirect that
 * next.config.ts makes from its own copy of GAME_MOVES. A link shared in 2026 (a room's, a pack's,
 * a bookmark) must open the same game years on, so a line of that list is never taken out.
 */
const ROOT = process.cwd();
const APP = join(ROOT, "src/app/[currency]/[locale]/(marketing)");
/** Every address a game was live at before this change. */
const BEFORE = ["know", "rather", "this-or-that", "draw", "memory", "deck", "dare", "roulette"];
/** Six words by choice: the exact phrase people search, named by the audit and by the brief. */
const LONGER_BY_CHOICE = ["how-well-do-you-know-me"];
const slugOf = (href: string) => href.slice("/games/".length);
const slugs = GAMES.map((g) => slugOf(g.href));
const froms = GAME_MOVES.map(([from]) => from);
const tos = GAME_MOVES.map(([, to]) => to);

describe("the games' addresses", () => {
  it("A1: every game is at /games/ and plain lower-case words, five at most (one by choice), none twice, none stuffed", () => {
    expect(new Set(slugs).size).toBe(GAMES.length);
    for (const g of GAMES) {
      expect(g.href, g.key).toMatch(/^\/games\/[a-z]+(-[a-z]+)*$/);
      const count = slugOf(g.href).split("-").length;
      expect(count, g.href).toBeLessThanOrEqual(LONGER_BY_CHOICE.includes(slugOf(g.href)) ? 6 : 5);
      expect(slugOf(g.href), g.href).not.toMatch(/(^|-)(online|free|best|game-for-couples)(-|$)/);
    }
    for (const slug of LONGER_BY_CHOICE) expect(slugs).toContain(slug);
  });

  it("A2: every address a game ever had still leads to a game: kept as it was, or moved", () => {
    for (const old of BEFORE) expect(slugs.includes(old) || froms.includes(old), `/games/${old}`).toBe(true);
    // And each move starts from an address that was really live.
    for (const from of froms) expect(BEFORE, from).toContain(from);
  });

  it("A3: one redirect and no more: no move lands on a moved address, none starts from a live page, none twice", () => {
    expect(new Set(froms).size).toBe(froms.length);
    expect(new Set(tos).size).toBe(tos.length);
    for (const [from, to] of GAME_MOVES) {
      expect(froms, `${from} goes to ${to}, which moves again`).not.toContain(to);
      expect(slugs, `${from} goes to ${to}, where no game lives`).toContain(to);
      expect(slugs, `${from} is still a game's address`).not.toContain(from);
      expect(["today", "weekly"], from).not.toContain(from);
    }
  });

  it("A4: next.config.ts redirects the same moves, permanently, in English, Spanish and with an explicit /en", () => {
    const config = readFileSync(join(ROOT, "next.config.ts"), "utf8");
    const list = config.match(/const GAME_MOVES = (\[[\s\S]*?\]);/);
    expect(list, "next.config.ts has no GAME_MOVES").not.toBeNull();
    expect(JSON.parse(list![1])).toEqual(GAME_MOVES.map(([from, to]) => [from, to]));
    const block = config.slice(config.indexOf("GAME_MOVES.map"), config.indexOf("GAME_MOVES.map") + 400);
    expect(config).toContain('["", "/es", "/en"].flatMap');
    expect(block).toContain("source: `${prefix}/games/${from}`");
    // An explicit /en keeps its /en, so the proxy sets the English cookie as it strips it (games2-T1).
    expect(block).toContain("destination: `${prefix}/games/${to}`");
    expect(block).toContain("permanent: true");
  });

  it("A5: each game's page is where its address says, and no folder is left at an old address", () => {
    for (const g of GAMES) expect(existsSync(join(APP, g.href, "page.tsx")), g.href).toBe(true);
    for (const from of froms) expect(existsSync(join(APP, "games", from)), `games/${from}`).toBe(false);
    expect(existsSync(join(APP, "games/weekly/page.tsx"))).toBe(true);
  });

  it("A6: the sitemap lists every game's new address in both languages, none of the old ones, and the weekly challenge, all dated", () => {
    const paths = sitemap().map((p) => new URL(p.url).pathname);
    for (const g of GAMES) for (const prefix of ["", "/es"]) expect(paths, prefix + g.href).toContain(prefix + g.href);
    for (const from of froms) for (const prefix of ["", "/es"]) expect(paths, `${prefix}/games/${from}`).not.toContain(`${prefix}/games/${from}`);
    for (const path of ["/games/weekly", "/es/games/weekly", "/games/today", "/games"]) expect(paths, path).toContain(path);
    for (const path of [...GAMES.map((g) => g.href), "/games", "/games/today", "/games/weekly"]) expect(pageUpdated(path), path).toBe(GAMES_LIVE);
    expect(GAMES_LIVE <= new Date().toISOString().slice(0, 10)).toBe(true);
  });

  it("A7: nothing the site serves, and nothing the blog routine reads, still names an old address", () => {
    // Not a module's path: "@/lib/games/draw" and "@/components/games/dare" are files, not addresses.
    const old = new RegExp(`(?<!lib)(?<!components)/games/(${froms.join("|")})(?![a-z-])`);
    const files = [
      ...readdirSync(join(ROOT, "src"), { recursive: true, encoding: "utf8" })
        .filter((f) => /\.(tsx?|json|css)$/.test(f))
        .map((f) => join("src", f)),
      "messages/en.json",
      "messages/es.json",
      "docs/blog/TOPIC-GROUPS.md",
      "docs/blog/queue.json",
      "docs/LAUNCH.md",
      "docs/marketing/approved-posts/01-would-you-rather-the-fight.md",
      "docs/blog/seo-backlog.md",
      "docs/marketing/KEYWORDS.md",
      "docs/marketing/SEO-ORGANIC.md",
    ];
    const found = files.flatMap((file) =>
      readFileSync(join(ROOT, file), "utf8")
        .split("\n")
        .map((line, i) => (old.test(line) ? `${file}:${i + 1}: ${line.trim().slice(0, 100)}` : null))
        .filter((hit): hit is string => hit !== null),
    );
    expect(found).toEqual([]);
  });

  it("A8: the rooms that hand over to a game, and the iPhone app's catalogue, give the new addresses", () => {
    for (const g of LDR_GAMES) expect(slugs, g.href).toContain(slugOf(g.href));
    const { catalog } = appCatalog();
    expect(catalog.games.map((g) => g.path)).toEqual(HAND_GAMES.map((g) => g.href));
    for (const g of catalog.games) expect(slugs, g.path).toContain(slugOf(g.path));
  });
});
