import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { QuestionList, eitherOr } from "@/components/games/question-list";
import { LIST_SHOWN } from "@/content/game-pages";
import { DARES, KNOW_QUESTIONS, RATHER_PAIRS, TRUTHS } from "@/lib/games/content";
import { DRAW_WORDS } from "@/lib/games/draw";
import { DECK_IDS, DECKS } from "@/lib/games/questions";
import { THIS_PAIRS } from "@/lib/games/this-or-that";

/**
 * A game's page holds every free question (search needs them) but shows only the first few of each
 * group; the rest sit in a closed <details> in the same HTML (docs/marketing/growth-build/
 * DESIGN-LESS-TEXT.md: at most 300 words visible on a page). The browser counts the whole page
 * (tests/e2e/games2.spec.ts, G1); this holds the list's own share of it, so a longer question or a
 * larger LIST_SHOWN is caught here first.
 */
const ROOT = process.cwd();
const G = join(ROOT, "src/app/[currency]/[locale]/(marketing)/games");
const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
type Lang = "en" | "es";
type Messages = typeof en;
const CATALOGUES: Record<Lang, Messages> = { en, es: es as Messages };
const fill = (text: string, count: number) => text.replace("{count}", String(count));

/** A game's groups, built exactly as its page.tsx builds them. */
function groupsOf(key: keyof typeof LIST_SHOWN, l: Lang): { name?: string; items: string[] }[] {
  const m = CATALOGUES[l].games;
  switch (key) {
    case "know":
      return [{ items: KNOW_QUESTIONS.map((q) => `${q.prompt[l]} ${q.options.map((o) => o[l]).join(" · ")}`) }];
    case "rather":
      return [{ items: RATHER_PAIRS.map((p) => eitherOr(p.a[l], p.b[l], l)) }];
    case "thisthat":
      return [{ items: THIS_PAIRS.map((p) => eitherOr(p.a[l], p.b[l], l)) }];
    case "draw":
      return [{ items: DRAW_WORDS.map((w) => w.word[l]) }];
    case "deck":
      return DECK_IDS.map((id) => ({ name: DECKS[id].name[l], items: DECKS[id].cards.map((c) => c[l]) }));
    case "dare":
      return [
        { name: m.dare.listTruths, items: TRUTHS.map((q) => q[l]) },
        { name: m.dare.listDares, items: DARES.map((q) => q[l]) },
      ];
  }
}

const PAGES: Record<keyof typeof LIST_SHOWN, string> = {
  know: "how-well-do-you-know-me",
  rather: "would-you-rather",
  thisthat: "this-or-that",
  draw: "drawing-game",
  deck: "questions-for-couples",
  dare: "truth-or-dare",
};

describe("less text on a game's page", () => {
  it("B1: what a game's list shows fits the page", () => {
    for (const key of Object.keys(LIST_SHOWN) as (keyof typeof LIST_SHOWN)[]) {
      for (const l of ["en", "es"] as const) {
        const m = CATALOGUES[l].games;
        const groups = groupsOf(key, l);
        const total = groups.reduce((n, g) => n + g.items.length, 0);
        const show = LIST_SHOWN[key];
        let count = words(m.list.label) + words(fill(m[key].listTitle, total)) + words(m[key].listIntro);
        for (const g of groups) {
          count += g.name ? words(g.name) : 0;
          count += g.items.slice(0, show).reduce((n, item) => n + words(item), 0);
          if (g.items.length > show) count += words(fill(m.list.more, g.items.length - show));
        }
        expect(count, `${key} (${l})`).toBeLessThanOrEqual(110);
      }
    }
  });

  it("B2: the list's left column is a label, a heading and one line", () => {
    for (const l of ["en", "es"] as const) {
      const m = CATALOGUES[l].games;
      for (const key of Object.keys(LIST_SHOWN) as (keyof typeof LIST_SHOWN)[]) expect(words(m[key].listIntro), `${key}.listIntro (${l})`).toBeLessThanOrEqual(14);
      expect(words(m.list.label), `list.label (${l})`).toBeLessThanOrEqual(4);
      expect(m.list.more, `list.more (${l})`).toContain("{count}");
    }
  });

  it("B3: every item is in the page, the rest closed and numbered on", () => {
    const html = renderToStaticMarkup(
      <QuestionList id="x" label="L" title="T" intro="I" show={2} more={(n) => `${n} more`} groups={[{ name: "A", items: ["a1", "a2", "a3", "a4"] }, { items: ["b1", "b2"] }]} />,
    );
    expect(html.match(/<li>/g)).toHaveLength(6);
    for (const item of ["a1", "a2", "a3", "a4", "b1", "b2"]) expect(html).toContain(`<li>${item}</li>`);
    const details = html.match(/<details[^>]*>/g) ?? [];
    expect(details).toHaveLength(1);
    expect(details[0]).not.toMatch(/\bopen\b/);
    expect(html).toMatch(/<ol start="3"/);
    expect(html).toMatch(/<summary[^>]*>2 more/);
    // The second group shows both its items and has nothing left to close.
    const second = html.slice(html.lastIndexOf("data-list-group"));
    expect(second).not.toContain("<details");
  });

  it("B4: every page that lists questions says how many stay on show", () => {
    for (const [key, folder] of Object.entries(PAGES)) {
      const page = readFileSync(join(G, folder, "page.tsx"), "utf8");
      expect(page, folder).toContain(`show={LIST_SHOWN.${key}}`);
      expect(page, folder).toContain('tl("more"');
    }
    for (const folder of ["memory", "chore-wheel"]) expect(readFileSync(join(G, folder, "page.tsx"), "utf8"), folder).not.toContain("QuestionList");
  });
});
