import type { CSSProperties } from "react";
import type { FontPairing } from "@/lib/gift/schema";

type RGB = { r: number; g: number; b: number };

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex({ r: A.r + (B.r - A.r) * t, g: A.g + (B.g - A.g) * t, b: A.b + (B.b - A.b) * t });
}

export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const ratio = (a: string, b: string) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/** `hex`, stepped toward `to` until it reads at 4.5:1 on `ground`: a pale accent still makes readable words. */
function readableOn(hex: string, to: string, ground: string): string {
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const c = mix(hex, to, t);
    if (ratio(c, ground) >= 4.5) return c;
  }
  return to;
}

/** CSS variables every template can rely on. Spread onto the template root. */
export function giftThemeVars(rawAccent: string, fontPairing: FontPairing): CSSProperties {
  // An old draft can carry something that isn't a colour; every derived shade would come out NaN.
  const accent = /^#([0-9a-f]{3}){1,2}$/i.test(rawAccent?.trim() ?? "") ? rawAccent.trim() : "#D6336C";
  // WCAG contrast against ink vs. paper; whichever reads better wins.
  const l = luminance(accent);
  const onAccent = (l + 0.05) / (0.011 + 0.05) >= (1.0 + 0.05) / (l + 0.05) ? "#1A1614" : "#FFF8F4";
  const fonts: Record<FontPairing, { display: string; body: string }> = {
    editorial: { display: "var(--font-gift-display), Georgia, serif", body: "var(--font-sans), system-ui, sans-serif" },
    modern: { display: "var(--font-sans), system-ui, sans-serif", body: "var(--font-sans), system-ui, sans-serif" },
    handwritten: { display: "var(--font-hand), cursive", body: "var(--font-sans), system-ui, sans-serif" },
  };
  return {
    "--gift-accent": accent,
    // Soft is for words on dark pages and deep for words on light ones (MessageBody's emphasis among
    // them), so each is pushed far enough from its page to read whatever accent was picked.
    "--gift-accent-soft": readableOn(mix(accent, "#FFFFFF", 0.35), "#FFFFFF", "#1A1614"),
    "--gift-accent-pale": mix(accent, "#FFFFFF", 0.82),
    "--gift-accent-deep": readableOn(mix(accent, "#000000", 0.25), "#000000", "#FAF7F2"),
    "--gift-accent-rgb": (() => {
      const { r, g, b } = hexToRgb(accent);
      return `${r}, ${g}, ${b}`;
    })(),
    "--gift-on-accent": onAccent,
    "--gift-font-display": fonts[fontPairing].display,
    "--gift-font-body": fonts[fontPairing].body,
    "--gift-font-hand": "var(--font-hand), cursive",
  } as CSSProperties;
}
