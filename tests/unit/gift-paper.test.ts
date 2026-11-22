import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A gift keeps the colours it was drawn with (globals.css, "A gift keeps the paper it was drawn
 * with"). The site's paper turned cream on 22 Nov 2026 and its rose a shade deeper; a gift, in the
 * editor's preview, in a demo and at its own link, must read every colour by name exactly as the
 * live site gave it before that day.
 *
 * LIVE is what each name was on the live site (origin/main, 22 Nov 2026), worked out to a colour.
 * The test works the stylesheet out the way a browser does: a name declared on :root as
 * var(--other) is worked out there and handed down finished, so inside a gift it only follows a
 * pinned colour if the pin says the name again. The first pin missed that for --border and --input
 * (the review of 22 Nov), which this would have caught: any name whose root value is no longer the
 * live one must come out as the live one inside a gift.
 */
const LIVE: Record<string, string> = {
  "--brand-paper": "#fdf7f3",
  "--brand-paper-deep": "#f7ebe5",
  "--brand-coral": "#d6336c",
  "--brand-coral-deep": "#b0245a",
  "--brand-line": "#ecdcd6",
  "--background": "#fdf7f3",
  "--card": "#fffaf7",
  "--popover": "#fffaf7",
  "--primary": "#d6336c",
  "--secondary": "#f7ebe5",
  "--muted": "#f6eae5",
  "--border": "#ecdcd6",
  "--input": "#ecdcd6",
  "--chart-1": "#d6336c",
  "--sidebar-primary": "#d6336c",
  "--sidebar-border": "#ecdcd6",
  "--color-background": "#fdf7f3",
  "--color-card": "#fffaf7",
  "--color-popover": "#fffaf7",
  "--color-primary": "#d6336c",
  "--color-secondary": "#f7ebe5",
  "--color-muted": "#f6eae5",
  "--color-border": "#ecdcd6",
  "--color-input": "#ecdcd6",
  "--color-chart-1": "#d6336c",
  "--color-sidebar-primary": "#d6336c",
  "--color-sidebar-border": "#ecdcd6",
  "--color-paper": "#fdf7f3",
  "--color-paper-deep": "#f7ebe5",
  "--color-coral": "#d6336c",
  "--color-coral-deep": "#b0245a",
  "--color-rose": "#d6336c",
  "--color-rose-deep": "#b0245a",
  "--color-line": "#ecdcd6",
  "--color-blush-paper": "#fff5f2",
  // Unchanged, and listed so that a change to one of them at the root is seen here too.
  "--brand-ink": "#24121b",
  "--brand-ink-soft": "#5d4652",
  "--foreground": "#24121b",
  "--muted-foreground": "#6e5963",
  "--brand-rose": "#f9d5de",
  "--brand-rose-soft": "#fdeef2",
  "--brand-gold": "#c9923a",
  "--brand-night": "#14110e",
  "--brand-forest": "#2a0f1f",
  "--brand-cream": "#fff6f0",
  "--brand-blush": "#f9cdd8",
  "--color-ink": "#24121b",
  "--color-ink-soft": "#5d4652",
  "--color-forest": "#2a0f1f",
  "--color-cream": "#fff6f0",
};

// Without its comments: a comment's lines would otherwise be read as the start of the next rule's selector.
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8")
  .replace(/\r\n/g, "\n")
  .replace(/\/\*[\s\S]*?\*\//g, "");

type Decls = Record<string, string>;

function declarations(body: string): Decls {
  const out: Decls = {};
  for (const part of body.replace(/\/\*[\s\S]*?\*\//g, "").split(";")) {
    const at = part.indexOf(":");
    if (at < 0) continue;
    const name = part.slice(0, at).trim();
    if (name.startsWith("--")) out[name] = part.slice(at + 1).trim().replace(/\s+/g, " ");
  }
  return out;
}

/** The bodies of every top-level rule whose selector, with its white space made single, is exactly `selector`. */
function rules(selector: string): Decls[] {
  const found: Decls[] = [];
  const rule = /(?:^|\n)([^\n{}@/][^{}]*|@theme inline)\s*\{([^{}]*)\}/g;
  for (let m = rule.exec(css); m; m = rule.exec(css)) if (m[1].trim().replace(/\s+/g, " ") === selector) found.push(declarations(m[2]));
  return found;
}

const merge = (all: Decls[]): Decls => Object.assign({}, ...all);

/**
 * Every name in `declared` worked out to a value, a name it does not declare being read from
 * `inherited`. A name that asks for itself (the theme's `--ease-spring: var(--ease-spring)`) asks
 * its parent.
 */
function workOut(declared: Decls, inherited: Decls = {}): Decls {
  const read = (name: string, asking: string[]): string => {
    const value = asking.includes(name) ? undefined : declared[name];
    if (value === undefined) return inherited[name] ?? `var(${name})`;
    return value.replace(/var\((--[\w-]+)\)/g, (_, other: string) => read(other, [...asking, name]));
  };
  return { ...inherited, ...Object.fromEntries(Object.keys(declared).map((name) => [name, read(name, [])])) };
}

// Tailwind writes the names of `@theme inline` on :root as well; `[data-page-theme]` shares one rule with :root.
const root = workOut(merge(rules("@theme inline")), workOut(merge([...rules(":root"), ...rules(":root, [data-page-theme]")])));

const always = rules(".gift-root, [data-gift-page]").filter((decls) => "--brand-paper" in decls);
const light = rules(":root:not(.dark) .gift-root, :root:not(.dark) [data-gift-page]");
const route = rules(":root:has([data-gift-page])").filter((decls) => "--brand-paper" in decls);

describe("a gift keeps the paper it was drawn with", () => {
  it("finds the three rules of the pin", () => {
    expect(always).toHaveLength(1);
    expect(light).toHaveLength(1);
    expect(route).toHaveLength(1);
    // The stylesheet was read: the site's paper is the cream.
    expect(root["--brand-paper"]).toBe("#f3e1d5");
  });

  it("reads every colour whose root value changed as the live site had it", () => {
    const gift = workOut({ ...always[0], ...light[0] }, root);
    const changed = Object.keys(LIVE).filter((name) => root[name] !== LIVE[name]);
    // The paper, the line and the rose did change: an empty list would mean nothing was compared.
    expect(changed).toEqual(expect.arrayContaining(["--brand-paper", "--border", "--input", "--color-rose", "--color-rose-deep", "--color-blush-paper"]));
    for (const name of changed) expect(gift[name], `${name} inside a gift`).toBe(LIVE[name]);
    // And nothing else moved inside a gift: every name on the list is the live one there.
    for (const name of Object.keys(LIVE)) expect(gift[name], `${name} inside a gift`).toBe(LIVE[name]);
  });

  it("leaves the names the dark shell sets to the dark shell", () => {
    const dark = merge(rules(".dark"));
    // In the app's dark shell only the first rule reaches a gift, and it sets none of the shell's names.
    for (const name of Object.keys(always[0])) expect(name in dark, `${name} is the dark shell's`).toBe(false);
    // Outside it, each of the shell's names whose light value changed is pinned by the second rule.
    for (const name of Object.keys(dark)) if (LIVE[name] && root[name] !== LIVE[name]) expect(name in light[0], `${name} is pinned outside the dark shell`).toBe(true);
  });

  it("pins the whole document on a gift route with the same values, for what is drawn outside the gift's page (a toast)", () => {
    expect(route[0]).toEqual({ ...always[0], ...light[0] });
  });

  it("covers every colour name the root works out from a pinned one", () => {
    // A new name added at the root as var(--brand-paper) must be added to the pin, or it carries the cream into a gift.
    const pinned = { ...always[0], ...light[0] };
    const rootDeclared = merge([...rules(":root"), ...rules(":root, [data-page-theme]"), ...rules("@theme inline")]);
    const follows = (name: string, depth = 0): boolean => {
      const value = rootDeclared[name];
      if (value === undefined || depth > 20) return false;
      return [...value.matchAll(/var\((--[\w-]+)\)/g)].some(([, other]) => other in pinned || follows(other, depth + 1));
    };
    // The gift's page names (--page-*) are its own page's palette, set on [data-page-theme], and are not a gift's to read.
    const missing = Object.keys(rootDeclared).filter((name) => !name.startsWith("--page-") && !name.startsWith("--color-page-") && !name.startsWith("--shadow-page-") && follows(name) && !(name in pinned));
    expect(missing).toEqual([]);
  });
});
