import type { Options } from "qr-code-styling";
import { HEART, SEAL } from "@/components/shared/logo";
import type { QrPalette } from "./palette";

export type QrFrame = "none" | "circle" | "heart";
export type QrDots = "rounded" | "square" | "dots" | "classy";
export type QrCentre = "none" | "logo" | "photo";
export type QrCentreSize = "s" | "m" | "l";

export const QR_FRAMES: QrFrame[] = ["none", "circle", "heart"];
export const QR_DOTS: QrDots[] = ["rounded", "square", "dots", "classy"];
export const QR_CENTRES: QrCentre[] = ["none", "logo", "photo"];
export const QR_CENTRE_SIZES: QrCentreSize[] = ["s", "m", "l"];

/** How much of the code the logo or photo in the middle covers. Error correction H survives all three. */
const CENTRE_SIZE: Record<QrCentreSize, number> = { s: 0.22, m: 0.3, l: 0.38 };

/** The longest line under the code: it has to fit the narrow part of the heart. */
export const QR_LABEL_MAX = 28;

/** The site's seal, for the middle of the code: the same mark as the header's. */
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="${SEAL}" fill="#D6336C"/><path d="${HEART}" fill="#FBF6EE" opacity="0.95"/></svg>`;
export const QR_LOGO = `data:image/svg+xml;utf8,${encodeURIComponent(LOGO_SVG)}`;

/** Heart outline in a 100 × 100 box. */
export const HEART_PATH = "M50 88 C 20 66, 6 50, 6 32 C 6 18, 17 9, 29 9 C 38 9, 45 14, 50 21 C 55 14, 62 9, 71 9 C 83 9, 94 18, 94 32 C 94 50, 80 66, 50 88 Z";

/** The options for the code itself, in the palette's colours: what preview, download and print card all draw. */
export function qrCodeOptions({ url, dots, palette, gradient, image, centreSize, size = 600 }: { url: string; dots: QrDots; palette: QrPalette; gradient: boolean; image?: string; centreSize: QrCentreSize; size?: number }): Partial<Options> {
  return {
    width: size,
    height: size,
    type: "svg",
    data: url,
    margin: 0,
    image,
    qrOptions: { errorCorrectionLevel: "H" },
    // The photo is written into the SVG itself, so a saved file keeps it after the link to it expires.
    imageOptions: { crossOrigin: "anonymous", margin: 6, imageSize: CENTRE_SIZE[centreSize], hideBackgroundDots: true, saveAsBlob: true },
    dotsOptions: {
      type: dots,
      color: palette.dots,
      gradient: gradient ? { type: "linear", rotation: Math.PI / 4, colorStops: [{ offset: 0, color: palette.dots }, { offset: 1, color: palette.dotsEnd }] } : undefined,
    },
    cornersSquareOptions: { type: dots === "square" ? "square" : "extra-rounded", color: palette.dots },
    cornersDotOptions: { type: dots === "square" ? "square" : "dot", color: palette.dots },
    backgroundOptions: { color: "transparent" },
  };
}

type Layout = { x: number; y: number; size: number; labelY: number; labelSize: number; labelWidth: number };

/** Where the code and the line under it sit on a 1000 × 1000 card, for each frame. */
export function qrLayout(frame: QrFrame, withLabel: boolean): Layout {
  if (frame === "circle") {
    const size = withLabel ? 500 : 580;
    return { x: (1000 - size) / 2, y: withLabel ? 175 : 210, size, labelY: 790, labelSize: 58, labelWidth: 600 };
  }
  if (frame === "heart") {
    // Between the lobes and the point, where the heart is widest.
    const size = withLabel ? 380 : 420;
    return { x: (1000 - size) / 2, y: withLabel ? 215 : 230, size, labelY: 690, labelSize: 46, labelWidth: 400 };
  }
  const size = withLabel ? 700 : 800;
  return { x: (1000 - size) / 2, y: withLabel ? 75 : 100, size, labelY: 900, labelSize: 64, labelWidth: 860 };
}

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** The inside of an SVG document and the size it was drawn at. */
function unwrap(svg: string): { inner: string; width: number; height: number } {
  const open = svg.match(/<svg\b[^>]*>/);
  const close = svg.lastIndexOf("</svg>");
  if (!open || close < 0) return { inner: "", width: 1, height: 1 };
  const attr = (name: string) => Number(open[0].match(new RegExp(`\\b${name}="([\\d.]+)`))?.[1] ?? 0);
  return { inner: svg.slice((open.index ?? 0) + open[0].length, close), width: attr("width") || 1, height: attr("height") || 1 };
}

/**
 * The whole card as one SVG: the frame in the background colour, a light panel when the background is
 * too dark for the code, the code, and the line under it. Preview, SVG download and PNG download are all
 * this same drawing, so what you see is what you get.
 */
export function composeQrSvg({ qrSvg, frame, background, palette, label, labelFill }: { qrSvg: string; frame: QrFrame; background: string; palette: QrPalette; label: string; labelFill: string }): string {
  const text = label.trim().slice(0, QR_LABEL_MAX);
  const L = qrLayout(frame, Boolean(text));
  const code = unwrap(qrSvg);
  const shape =
    frame === "circle"
      ? `<circle cx="500" cy="500" r="500" fill="${background}"/>`
      : frame === "heart"
        ? `<path transform="scale(10)" d="${HEART_PATH}" fill="${background}"/>`
        : `<rect width="1000" height="1000" rx="70" fill="${background}"/>`;
  const pad = Math.round(L.size * 0.07);
  const panel = palette.panel ? `<rect x="${L.x - pad}" y="${L.y - pad}" width="${L.size + pad * 2}" height="${L.size + pad * 2}" rx="${Math.round(pad * 1.2)}" fill="${palette.ground}"/>` : "";
  // A serif every device has: an SVG drawn as an image can't reach the page's own fonts.
  const fontSize = text ? Math.min(L.labelSize, Math.floor(L.labelWidth / (text.length * 0.5))) : 0;
  const line = text ? `<text x="500" y="${L.labelY}" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="${fontSize}" fill="${labelFill}">${escapeXml(text)}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1000 1000" width="1000" height="1000">${shape}${panel}<svg x="${L.x}" y="${L.y}" width="${L.size}" height="${L.size}" viewBox="0 0 ${code.width} ${code.height}">${code.inner}</svg>${line}</svg>`;
}

export type QrDesign = { dots: QrDots; colour: string; gradient: boolean; centre: QrCentre; photo: string; size: QrCentreSize; label: string };

/** The designer's choices as a query string, so the print card draws the same code. */
export function qrDesignQuery(design: QrDesign): string {
  const q = new URLSearchParams({ dots: design.dots, colour: design.colour, centre: design.centre, size: design.size });
  if (design.gradient) q.set("gradient", "1");
  if (design.centre === "photo" && design.photo) q.set("photo", design.photo);
  if (design.label.trim()) q.set("label", design.label.trim().slice(0, QR_LABEL_MAX));
  return q.toString();
}

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => (typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback);

/** Reads that query string back, trusting nothing in it. */
export function readQrDesign(params: Record<string, string | string[] | undefined>, accent: string): QrDesign {
  const one = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const colour = one("colour");
  return {
    dots: pick(one("dots"), QR_DOTS, "rounded"),
    colour: colour && /^#[0-9a-f]{6}$/i.test(colour) ? colour : accent,
    gradient: one("gradient") === "1",
    centre: pick(one("centre"), QR_CENTRES, "logo"),
    photo: (one("photo") ?? "").slice(0, 80),
    size: pick(one("size"), QR_CENTRE_SIZES, "m"),
    label: (one("label") ?? "").slice(0, QR_LABEL_MAX),
  };
}
