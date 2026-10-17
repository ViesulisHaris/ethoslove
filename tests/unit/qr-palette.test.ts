import { describe, expect, it } from "vitest";
import { contrast, darkenUntil, labelColour, normalHex, qrPalette, QR_BACKGROUNDS, QR_MIN_CONTRAST } from "@/lib/qr/palette";
import { ACCENT_SWATCHES } from "@/components/editor/color-input";
import { listManifests } from "@/templates/manifests";

const accents = Array.from(new Set([...ACCENT_SWATCHES, ...listManifests().map((m) => m.defaultAccent), "#FFFFFF", "#FFF8F4", "#FFFF00", "#00FFFF"]));
// Every background the designer offers, the print card's paper colours, and the extremes.
const backgrounds = Array.from(new Set([...QR_BACKGROUNDS, "#FBE3E8", "#E8EFE4", "#000000", "#808080", "#FF0000"]));

describe("QR colours that phones can scan", () => {
  it("every accent on every background ends up dark enough against what it's drawn on", () => {
    for (const accent of accents) {
      for (const background of backgrounds) {
        const p = qrPalette(accent, background);
        expect(contrast(p.dots, p.ground), `${accent} on ${background}`).toBeGreaterThanOrEqual(QR_MIN_CONTRAST);
        expect(contrast(p.dotsEnd, p.ground), `gradient end of ${accent} on ${background}`).toBeGreaterThanOrEqual(QR_MIN_CONTRAST);
        // The ground itself is always light: phones read dark squares on light.
        expect(contrast(p.ground, "#000000"), `ground for ${background}`).toBeGreaterThan(contrast(p.ground, "#FFFFFF"));
      }
    }
  });

  it("leaves a colour that already scans exactly as chosen", () => {
    for (const accent of ["#1A1614", "#2E4A62", "#2F6B4F", "#7A3E6A", "#B23A2E"]) {
      const p = qrPalette(accent, "#FAF7F2");
      expect(p.dots).toBe(accent.toLowerCase());
      expect(p.adjusted).toBe(false);
    }
  });

  it("darkens a pale colour, keeping its hue, and says so", () => {
    const p = qrPalette("#F4C7C3", "#FAF7F2");
    expect(p.adjusted).toBe(true);
    expect(p.dots).not.toBe("#f4c7c3");
    // Still a pink: red stays the strongest channel.
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(p.dots.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });

  it("puts a light panel behind the code on a dark or mid-toned background, not on a light one", () => {
    expect(qrPalette("#E8604C", "#1A1614").panel).toBe(true);
    expect(qrPalette("#E8604C", "#D4A853").panel).toBe(true);
    expect(qrPalette("#E8604C", "#FAF7F2").panel).toBe(false);
    expect(qrPalette("#E8604C", "#F4C7C3").panel).toBe(false);
  });

  it("reads old drafts and short hex, and falls back on anything else", () => {
    expect(normalHex("#abc", "#000000")).toBe("#aabbcc");
    expect(normalHex("", "#123456")).toBe("#123456");
    expect(normalHex("red", "#123456")).toBe("#123456");
    expect(qrPalette(undefined, null).dots).toBe("#1a1614");
  });

  it("darkens step by step and never past black", () => {
    expect(darkenUntil("#FFFFFF", "#FFFFFF")).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrast(darkenUntil("#FFFFFF", "#FFFFFF"), "#FFFFFF")).toBeGreaterThanOrEqual(QR_MIN_CONTRAST);
  });

  it("writes a label that reads on its background", () => {
    for (const background of backgrounds) {
      const p = qrPalette("#E8604C", background);
      expect(contrast(labelColour(p, background), background), background).toBeGreaterThanOrEqual(QR_MIN_CONTRAST);
    }
  });
});
