import { describe, expect, it } from "vitest";
import { DEFAULT_PAGE_THEME, ON_ACCENT, TEMPLATE_PAGE_THEMES, contrast, luminance, pageThemeChromeCss, pageThemeVars, templatePageTheme, type PageTheme } from "@/content/template-page-themes";
import { artVariants } from "@/content/page-art";
import { TEMPLATE_SLUGS } from "@/templates/manifests";

/**
 * A gift's page in the gift's own colours (content/template-page-themes.ts). Every palette is
 * someone's choice by eye; this holds each one to what must be true whatever the eye liked: words
 * that can be read (WCAG AA), a ground that is light, a footer that is the only dark thing.
 */
const ALL: [string, PageTheme][] = [...Object.entries(TEMPLATE_PAGE_THEMES), ["(default)", DEFAULT_PAGE_THEME]];
const AA = 4.5;
const HEX = /^#[0-9a-f]{6}$/;

describe("template page themes", () => {
  it("every template in the registry has its own colours, and no palette is left over", () => {
    for (const slug of TEMPLATE_SLUGS) expect(Object.hasOwn(TEMPLATE_PAGE_THEMES, slug), `${slug} has no page theme`).toBe(true);
    for (const slug of Object.keys(TEMPLATE_PAGE_THEMES)) expect(TEMPLATE_SLUGS.includes(slug), `${slug} is not a template`).toBe(true);
    expect(Object.keys(TEMPLATE_PAGE_THEMES)).toHaveLength(TEMPLATE_SLUGS.length);
  });

  it("a template added later gets the site's own palette until it has one", () => {
    expect(templatePageTheme("not-a-template-yet")).toBe(DEFAULT_PAGE_THEME);
    expect(templatePageTheme("constructor")).toBe(DEFAULT_PAGE_THEME);
    expect(templatePageTheme("the-letter")).toBe(TEMPLATE_PAGE_THEMES["the-letter"]);
  });

  it("every colour is written as #rrggbb, and every colourway of flowers has its art", () => {
    for (const [slug, t] of ALL) {
      for (const key of ["ground", "raised", "band", "ink", "body", "accent", "badge", "footer", "footerText"] as const) expect(t[key], `${slug}.${key}`).toMatch(HEX);
      if (t.onAccent) expect(t.onAccent, `${slug}.onAccent`).toMatch(HEX);
      expect(artVariants("lily-open"), `${slug}: no art for “${t.flowers}”`).toContain(t.flowers);
    }
  });

  it("body text, headings and button text meet WCAG AA on every ground they are set on", () => {
    const failures: string[] = [];
    const need = (slug: string, what: string, a: string, b: string, min: number) => {
      const ratio = contrast(a, b);
      if (ratio < min) failures.push(`${slug}: ${what} ${a} on ${b} is ${ratio.toFixed(2)}:1, needs ${min}:1`);
    };
    for (const [slug, t] of ALL) {
      for (const ground of ["ground", "raised", "band"] as const) {
        need(slug, `body on ${ground}`, t.body, t[ground], AA);
        need(slug, `heading on ${ground}`, t.ink, t[ground], AA);
        // The check marks, the hearts and the plus signs: marks, not words (WCAG 1.4.11).
        need(slug, `accent mark on ${ground}`, t.accent, t[ground], 3);
      }
      need(slug, "button text on accent", t.onAccent ?? ON_ACCENT, t.accent, AA);
      need(slug, "a step's number on its badge", t.ink, t.badge, AA);
      need(slug, "footer text", t.footerText, t.footer, AA);
    }
    expect(failures).toEqual([]);
  });

  it("is light on the eyes: a pale ground that is neither white nor grey, the footer the only dark area", () => {
    // The owner, 21 Nov 2026: "in the tone of the colors, like its light on the eyes". The Letter's
    // sand (#f1e3d3, luminance 0.79) is the reference: nothing much darker, nothing bleached.
    const spread = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      return Math.max(...rgb) - Math.min(...rgb);
    };
    for (const [slug, t] of ALL) {
      if (slug === "(default)") continue; // the site's own paper, kept as it is
      const l = luminance(t.ground);
      expect(l, `${slug}: ground ${t.ground} is too dark`).toBeGreaterThan(0.72);
      expect(l, `${slug}: ground ${t.ground} is nearly white`).toBeLessThan(0.88);
      expect(spread(t.ground), `${slug}: ground ${t.ground} is grey`).toBeGreaterThanOrEqual(9);
      // One small step lighter and one small step deeper than the ground.
      expect(luminance(t.raised), `${slug}: raised`).toBeGreaterThan(l);
      expect(luminance(t.band), `${slug}: band`).toBeLessThan(l);
      expect(contrast(t.raised, t.ground), `${slug}: raised is a jump, not a step`).toBeLessThan(1.16);
      expect(contrast(t.band, t.ground), `${slug}: band is a jump, not a step`).toBeLessThan(1.3);
      // Ink is deep but never black; the accent is a muted deep tone, never a light or neon one.
      expect(luminance(t.ink), `${slug}: ink ${t.ink} is black`).toBeGreaterThan(0.008);
      expect(luminance(t.accent), `${slug}: accent ${t.accent} is too light to be the one strong colour`).toBeLessThan(0.16);
      expect(luminance(t.footer), `${slug}: footer ${t.footer}`).toBeLessThan(0.05);
    }
  });

  it("reaches the page as --page-* variables, and the footer and header through one rule", () => {
    const t = TEMPLATE_PAGE_THEMES["the-letter"];
    const vars = pageThemeVars(t);
    expect(vars["--page-ground"]).toBe("#f1e3d3");
    expect(vars["--page-accent"]).toBe("#7b1d3a");
    expect(vars["--page-on-accent"]).toBe(ON_ACCENT);
    expect(Object.keys(vars)).toHaveLength(10);
    const css = pageThemeChromeCss("the-letter", t);
    expect(css.startsWith('body:has([data-page-theme="the-letter"]){')).toBe(true);
    expect(css).toContain("--page-footer:#2d0e18");
    // Nothing a palette holds can close the rule or open another.
    for (const [slug, theme] of ALL) expect(pageThemeChromeCss(slug, theme)).toMatch(/^body:has\(\[data-page-theme="[a-z()-]+"\]\)\{[-a-z0-9#:;]+\}$/);
  });
});
