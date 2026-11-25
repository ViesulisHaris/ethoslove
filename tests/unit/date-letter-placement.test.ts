import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

/**
 * Where the date letter's box may be (BRIEF-letter.md 2; PLAN-letter step 8, P1-P2): read from the
 * files themselves, so a box added anywhere else, or a page that loses its own, fails here.
 */
const ROOT = process.cwd();
const MARKETING = "src/app/[currency]/[locale]/(marketing)";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(tsx?|mdx?)$/.test(name) ? [relative(ROOT, path).replaceAll("\\", "/")] : [];
  });
}
const SOURCES = [...files(join(ROOT, "src/app")), ...files(join(ROOT, "src/components"))];
const importing = (name: string, from: string) => SOURCES.filter((f) => new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*"${from}"`).test(readFileSync(join(ROOT, f), "utf8")));

/** The pages that carry the box, and the one left off with the reason. */
const WITH_BOX = [
  "dates/page.tsx",
  "dates/[city]/page.tsx",
  "dates/[city]/[kind]/page.tsx",
  "dates/ideas/[kind]/page.tsx",
  "blog/[slug]/page.tsx",
].map((f) => `${MARKETING}/${f}`);
const LEFT_OFF: Record<string, string> = {
  [`${MARKETING}/games/page.tsx`]: "the Spanish games hub reaches 301 words with the box drawn, over the page's 300 (PLAN-letter step 8's rule)",
  [`${MARKETING}/plan/page.tsx`]: "an empty plan, as a new visitor sees it, is so short that the box would be in the first screen (BRIEF-letter.md 2: never in the first screen)",
  // Each was already far over the 300 visible words before the box (letter-T11: 787, 603 and 496 in
  // English); the brief says a page with no room goes without it, as /games does (letter-C7).
  [`${MARKETING}/trips/page.tsx`]: "already over 300 visible words without the box",
  [`${MARKETING}/trips/[id]/page.tsx`]: "already over 300 visible words without the box",
  [`${MARKETING}/long-distance/page.tsx`]: "already over 300 visible words without the box",
};

describe("where the date letter's box is", () => {
  it("P1 exactly on its pages, and never on a gift, the editor, an account page, pricing, checkout or a game's own page", () => {
    expect(importing("LetterSlot", "@/components/date-letter/letter-slot").sort()).toEqual([...WITH_BOX].sort());
    for (const file of Object.keys(LEFT_OFF)) expect(readFileSync(join(ROOT, file), "utf8"), `${file}: ${LEFT_OFF[file]}`).not.toContain("LetterSlot");
    for (const file of SOURCES) {
      if (!/\((gift|editor|app|auth)\)|\/pricing\/|\/checkout\/|\/games\/today\/|\/games\/weekly\//.test(file)) continue;
      expect(readFileSync(join(ROOT, file), "utf8"), file).not.toMatch(/LetterSlot|LetterBox|date-letter\/letter/);
    }
    expect(importing("LetterBox", "@/components/date-letter/letter-box").sort()).toEqual([`${MARKETING}/date-letter/preview/page.tsx`]);
    expect(readFileSync(join(ROOT, "src/components/date-letter/letter-slot.tsx"), "utf8")).toContain('from "./letter-box"');
    expect(readFileSync(join(ROOT, "src/components/date-letter/letter-box.tsx"), "utf8")).not.toContain("useTranslations");
  });

  it("P2 the box adds at most twenty words, its field's visible label included, and says what comes", () => {
    for (const messages of [en, es]) {
      const w = messages.dateLetter;
      const n = [w.title, w.line, w.emailLabel, w.send, w.privacy].join(" ").split(/\s+/).filter(Boolean).length;
      expect(n).toBeLessThanOrEqual(20);
    }
    expect(en.dateLetter.line).toBe("One date idea every Thursday. Stop any time.");
  });
});
