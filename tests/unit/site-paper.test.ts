import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND_ROSE, BRAND_ROSE_DEEP } from "@/config/brand-colours";
import { DEFAULT_PAGE_THEME } from "@/content/template-page-themes";

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

  it("puts no white badge on a trip's photo: the kind wears the card's colour (fix round 5; the budget's badge went with trips2's cards of a picture and a name)", () => {
    const card = sources.find((s) => s.path.endsWith("components/trips/trip-card.tsx"));
    expect(card).toBeDefined();
    expect(card!.text).not.toMatch(/(?<![\w:-])bg-white/);
    expect(card!.text.match(/rounded-full bg-card\/95/g)?.length).toBe(1);
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
    // The scan finds the site's torn edges (eight once /occasions and /pricing were remade, 24 Nov 2026), then holds each one.
    expect(tears).toBeGreaterThanOrEqual(8);
    expect(byHand).toEqual([]);
  });
});

describe("type on the cream can be read", () => {
  const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const luminance = (rgb: number[]) => {
    const [r, g, b] = rgb.map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: number[], b: number[]) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const over = (ink: number[], ground: number[], strength: number) => ink.map((v, i) => v * strength + ground[i] * (1 - strength));

  it("no label in the wine is fainter than 65%: at 60% it was 4.3:1 on the cream, at 55% 3.7", () => {
    // The numbers the rule stands on: the paper turned darker on 22 Nov 2026, and 60% of the wine,
    // which had been 4.6:1 on the near-white, fell under what small type needs.
    const wine = hex("#2a0f1f");
    const paper = hex("#f3e1d5");
    expect(contrast(over(wine, paper, 0.6), paper)).toBeLessThan(4.5);
    expect(contrast(over(wine, paper, 0.65), paper)).toBeGreaterThanOrEqual(4.5);
    // On the blush sections and on a card too.
    for (const ground of ["#f6ddd3", "#fbf1e9"]) expect(contrast(over(wine, hex(ground), 0.65), hex(ground)), ground).toBeGreaterThanOrEqual(4.5);
    // So nothing in the site's own files sets type at 55% or 60%. (50% and under is kept for what is
    // not there to be read: a placeholder in an empty field, a control that is switched off.)
    const faint = sources.flatMap(({ path, text }) => [...text.matchAll(/(?<![\w-])text-forest\/(55|60)(?![\w.])/g)].map(([found]) => `${path}: ${found}`));
    expect(faint).toEqual([]);
  });
});

describe("the site's colours are said in one place", () => {
  // The first time a name is declared in the stylesheet is its value at the root (a gift's pin and the dark shell come after).
  const css = readFileSync(join(ROOT, "src/app/globals.css"), "utf8");
  const atRoot = (name: string): string => {
    const found = new RegExp(`${name}:\\s*([^;]+);`).exec(css);
    if (!found) throw new Error(`${name} is not in globals.css`);
    const value = found[1].trim();
    const other = /^var\((--[\w-]+)\)$/.exec(value);
    return other ? atRoot(other[1]) : value;
  };

  it("has one rose: the hexes a map and a canvas take are the stylesheet's", () => {
    expect(BRAND_ROSE).toBe(atRoot("--brand-rose-ui"));
    expect(BRAND_ROSE_DEEP).toBe(atRoot("--brand-rose-ui-deep"));
    // And the rose it replaced is written nowhere in the site's own files (a gift keeps it, by its pin in the stylesheet).
    const old = sources.filter(({ text }) => /#d6336c|#b0245a/i.test(text)).map(({ path }) => path);
    expect(old).toEqual([]);
  });

  it("gives a page that has no gift's colours the root's own: the default palette is the stylesheet's, name for name", () => {
    // The finder's button took the default palette's accent and the header's button the root's; they were two roses.
    expect(DEFAULT_PAGE_THEME.ground).toBe(atRoot("--page-ground"));
    expect(DEFAULT_PAGE_THEME.raised).toBe(atRoot("--page-raised"));
    expect(DEFAULT_PAGE_THEME.band).toBe(atRoot("--page-band"));
    expect(DEFAULT_PAGE_THEME.ink).toBe(atRoot("--page-ink"));
    expect(DEFAULT_PAGE_THEME.body).toBe(atRoot("--page-body"));
    expect(DEFAULT_PAGE_THEME.accent).toBe(atRoot("--page-accent"));
    expect(DEFAULT_PAGE_THEME.badge).toBe(atRoot("--page-badge"));
    expect(DEFAULT_PAGE_THEME.footer).toBe(atRoot("--page-footer"));
    expect(DEFAULT_PAGE_THEME.footerText).toBe(atRoot("--page-footer-text"));
  });
});
