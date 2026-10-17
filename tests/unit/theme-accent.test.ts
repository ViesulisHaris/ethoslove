import { describe, expect, it } from "vitest";
import { giftThemeVars, luminance } from "@/templates/_shared/theme";
import { ACCENT_SWATCHES } from "@/components/editor/color-input";
import { listManifests } from "@/templates/manifests";

const ratio = (a: string, b: string) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};
const accents = Array.from(new Set([...ACCENT_SWATCHES, ...listManifests().map((m) => m.defaultAccent), "#FFFFFF", "#000000", "#FFFF00", "#F4C7C3"]));
const vars = (accent: string) => giftThemeVars(accent, "editorial") as Record<string, string>;

describe("accent colours in every template", () => {
  it("the deep shade reads on light pages and the soft one on dark pages, for any accent", () => {
    for (const accent of accents) {
      const v = vars(accent);
      expect(ratio(v["--gift-accent-deep"], "#FAF7F2"), `deep of ${accent}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(v["--gift-accent-soft"], "#1A1614"), `soft of ${accent}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("words on an accent button are dark or light, whichever reads better", () => {
    for (const accent of accents) {
      const v = vars(accent);
      const on = v["--gift-on-accent"];
      const other = on === "#1A1614" ? "#FFF8F4" : "#1A1614";
      expect(ratio(on, accent), accent).toBeGreaterThanOrEqual(ratio(other, accent) - 0.0001);
    }
  });

  it("an accent that isn't a colour still gives every shade", () => {
    for (const bad of ["", "red", "#12", "#zzzzzz"]) {
      for (const value of Object.values(vars(bad))) expect(String(value)).not.toMatch(/NaN/);
    }
  });
});
