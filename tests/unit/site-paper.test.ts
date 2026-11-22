import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The site's paper is cream since 22 Nov 2026 (the owner: "update the white color so it matches the
 * templates", and, asked whether only the landing page, "Whole site"). A colour written by hand
 * does not follow the paper: the review of that day found pure white cards left on the cream on
 * four kinds of page, and a strip of the old pink under three heroes. These hold the two things
 * that were left behind. They read the source, so they cover pages no browser test opens (a signed-in
 * plan, a campaign's page) as well as the ones that do.
 */
const ROOT = process.cwd();

/** Where the site's own pages and their parts live. A gift, the editor and the app's dark shell keep their own colours. */
const SITE = ["src/app/[currency]/[locale]/(marketing)", "src/components/marketing", "src/components/trips", "src/components/cities", "src/components/dates", "src/components/saved-dates", "src/components/pricing", "src/components/campaign", "src/components/ldr", "src/components/tools", "src/components/games", "src/components/tour"];

function files(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files(path, found);
    else if (path.endsWith(".tsx")) found.push(path);
  }
  return found;
}

const sources = SITE.flatMap((dir) => files(join(ROOT, dir))).map((path) => ({ path: relative(ROOT, path).replace(/\\/g, "/"), text: readFileSync(path, "utf8") }));

describe("the site's paper", () => {
  it("reads the site's files", () => {
    expect(sources.length).toBeGreaterThan(100);
  });

  it("has no large white card on it: a card takes the card's colour by name", () => {
    // A card is a box with a corner of 20px or more. A text field, a small chip and a see-through
    // white (bg-white/85, laid over a picture) are not cards, and are left as they are.
    const large = /rounded-(?:[trbl]{1,2}-)?\[(?:2|3|4)\d(?:\.\d+)?px\]|rounded-(?:[trbl]{1,2}-)?(?:3xl|4xl)/;
    const white = /(?<![\w:-])bg-white(?![\w/-])|(?<![\w:-])bg-\[#(?:fff|ffffff)\](?![\w/-])/i;
    const left: string[] = [];
    for (const { path, text } of sources) {
      text.split("\n").forEach((line, i) => {
        for (const [, classes] of line.matchAll(/"([^"\n]*)"/g)) if (large.test(classes) && white.test(classes)) left.push(`${path}:${i + 1}`);
      });
    }
    expect(left).toEqual([]);
  });

  it("tears every edge in the paper's own colours: a torn edge never takes a colour written by hand for its two sides", () => {
    // `from` and `to` are the grounds of the sections above and below, and those are tokens. A hex
    // here was the foot of the old pink hero, left as a 28px pink strip on three pages. (`fibre`
    // may be a hex: on the dark sections it is a shade of their own wine, which has no name.)
    const byHand: string[] = [];
    let tears = 0;
    for (const { path, text } of sources) {
      for (const [tag] of text.matchAll(/<TornEdge\b[^>]*>/g)) {
        tears += 1;
        for (const [, side, value] of tag.matchAll(/\b(from|to)=(?:"([^"]*)"|\{[^}]*\})/g)) if (value !== undefined && !/^(var\(--[\w-]+\)|transparent)$/.test(value)) byHand.push(`${path}: ${side}="${value}"`);
        // A side chosen in code ({hero === "gift" ? a : b}): no string in it may be a colour written out.
        for (const [, expression] of tag.matchAll(/\b(?:from|to)=\{([^}]*)\}/g)) for (const [, value] of expression.matchAll(/"([^"]*)"/g)) if (/^(#|rgb|hsl|oklch|oklab|color-mix)/i.test(value)) byHand.push(`${path}: "${value}"`);
      }
    }
    expect(tears).toBeGreaterThan(8);
    expect(byHand).toEqual([]);
  });
});
