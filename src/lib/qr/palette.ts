import { luminance, mix } from "@/templates/_shared/theme";

/**
 * Below this a phone camera starts missing the code, once it's printed on paper and lit by a lamp:
 * a pale pink on cream reads on a screen and fails on a card. 4.5:1 is the same bar text is held to.
 */
export const QR_MIN_CONTRAST = 4.5;

/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** `#abc` and `#aabbcc` as `#aabbcc`; anything else (an old draft, an empty field) as the fallback. */
export function normalHex(value: string | null | undefined, fallback: string): string {
  const v = (value ?? "").trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) return `#${[...v.slice(1)].map((c) => c + c).join("")}`.toLowerCase();
  return fallback;
}

type Hsl = { h: number; s: number; l: number };

function toHsl(hex: string): Hsl {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s, l };
}

function fromHsl({ h, s, l }: Hsl): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((v) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The colour, made darker until it stands out from `ground` enough to scan. Only the lightness moves,
 * so a pale pink becomes a deeper rose rather than the grey-brown that mixing in black gives it.
 */
export function darkenUntil(colour: string, ground: string, min = QR_MIN_CONTRAST): string {
  const start = normalHex(colour, "#000000");
  if (contrast(start, ground) >= min) return start;
  // A pastel taken this much darker turns loud at full strength; a little less colour keeps it soft.
  const hsl = { ...toHsl(start), s: Math.min(toHsl(start).s, 0.6) };
  for (let l = hsl.l; l > 0; l -= 0.01) {
    const shade = fromHsl({ ...hsl, l });
    if (contrast(shade, ground) >= min) return shade;
  }
  return "#000000";
}

/** The same colour a step deeper, for the far end of a gradient. */
const deepen = (colour: string, by: number) => {
  const hsl = toHsl(colour);
  return fromHsl({ ...hsl, l: Math.max(0, hsl.l - by) });
};

export type QrPalette = {
  /** What the code is drawn on: the background, or the light panel laid over a dark one. */
  ground: string;
  /** True when the background is too dark or mid-toned for dark squares, so the code gets a light panel. */
  panel: boolean;
  /** The squares, and the far end of the gradient: a deeper shade of the same colour. */
  dots: string;
  dotsEnd: string;
  /** True when the chosen colour had to be darkened to scan. */
  adjusted: boolean;
};

/**
 * The colours a QR code is actually drawn in. Phones read dark squares on a light ground, so a
 * background too dark for that gets a light panel behind the code, and a colour too pale against
 * its ground is darkened until it scans. The gradient runs to a deeper shade of the same colour, never
 * to a second colour that might itself be too pale.
 */
export function qrPalette(colour: string | null | undefined, background: string | null | undefined): QrPalette {
  const chosen = normalHex(colour, "#1a1614");
  const bg = normalHex(background, "#faf7f2");
  const panel = luminance(bg) < 0.5;
  const ground = panel ? mix(bg, "#FFFFFF", 0.92) : bg;
  const dots = darkenUntil(chosen, ground);
  const dotsEnd = darkenUntil(deepen(dots, 0.14), ground);
  return { ground, panel, dots, dotsEnd, adjusted: dots !== chosen };
}

/** Text on the background (a line under the code): in the code's colour where that reads, else ink, white or black. */
export function labelColour(palette: QrPalette, background: string): string {
  const bg = normalHex(background, "#faf7f2");
  const candidates = [palette.dots, "#1a1614", "#ffffff", "#000000"];
  return candidates.find((c) => contrast(c, bg) >= QR_MIN_CONTRAST) ?? candidates.reduce((best, c) => (contrast(c, bg) > contrast(best, bg) ? c : best));
}

/** The backgrounds the QR designer offers. */
export const QR_BACKGROUNDS = ["#FAF7F2", "#FFFFFF", "#F4C7C3", "#1A1614", "#D4A853", "#F1ECE4"];
