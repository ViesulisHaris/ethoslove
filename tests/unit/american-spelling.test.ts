import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The site's English is American (fix round 5, 24 Nov 2026: "theatre" and "centre" on the date pages,
 * "Organised" in a game, "neighbourhood" on /long-distance). Every sentence the site shows from these
 * files is read for the usual British forms. A real place keeps its own name ("Pitlochry Festival
 * Theatre", "Glencoe visitor centre"). Ids and keys ("theatre-night", "centreSize") are not sentences:
 * only strings with a space in them are read. The blog, the legal texts and the gifts themselves are
 * not in this list.
 */
const FILES = [
  "messages/en.json",
  "src/content/date-kinds.ts",
  "src/content/game-pages.ts",
  "src/content/gift-guides.ts",
  "src/content/occasion-ideas.ts",
  "src/content/occasions.ts",
  "src/content/template-guides.ts",
  "src/content/digital-cards.ts",
  "src/content/recipients.ts",
  "src/content/finder.ts",
  "src/lib/dates/ideas.ts",
  "src/lib/dates/kinds.ts",
  "src/lib/dates/virtual.ts",
  "src/lib/games/content.ts",
  "src/lib/games/pack-cards.ts",
  "src/lib/games/packs.ts",
  "src/lib/games/this-or-that.ts",
  "src/lib/trips/presets.ts",
];

const BRITISH =
  /\b(colour\w*|favour\w*|behaviour\w*|neighbour\w*|humour\w*|flavour\w*|harbour\w*|savour\w*|centre|centres|theatre|theatres|litre\w*|organis\w*|realis\w*|recognis\w*|apologis\w*|personalis\w*|summaris\w*|labelled|travelled|practised|cancelled|whilst|amongst|grey|cosy|pyjamas|catalogue|programme|biscuit\w*|jumpers?)\b/i;
const OWN_NAMES = /Festival Theatre|visitor centre/;

const strings = (file: string): string[] => {
  const src = readFileSync(file, "utf8");
  if (file.endsWith(".json")) {
    const out: string[] = [];
    const walk = (o: unknown) => (typeof o === "string" ? out.push(o) : o && typeof o === "object" && Object.values(o).forEach(walk));
    walk(JSON.parse(src));
    return out;
  }
  return src
    .split(/\r?\n/)
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .flatMap((line) => [...line.matchAll(/(["`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => m[2]));
};

describe("the site's English spelling", () => {
  it("is American in every sentence these files show", () => {
    const found = FILES.flatMap((file) =>
      strings(file)
        .filter((s) => s.includes(" ") && BRITISH.test(s.replace(OWN_NAMES, "")))
        .map((s) => `${file}: ${s.replace(OWN_NAMES, "").match(BRITISH)![0]} in “${s.slice(0, 80)}”`),
    );
    expect(found).toEqual([]);
  });
});
