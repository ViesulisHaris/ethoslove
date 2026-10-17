import { createElement as h, type CSSProperties, type ReactElement } from "react";
import { SHARE_CARD, type CardLook } from "@/lib/gift/share-card";

/**
 * The picture a gift link shows in Messages, WhatsApp and the rest. On the left, a sealed envelope
 * with a real wax seal, a bow and flowers cut out of the same sheets the templates use; on the
 * right, who it is for, big enough to read in a chat. It never shows the gift, and carries no web
 * address: the chat prints the domain under it anyway.
 *
 * Drawn by the image generator (next/og), which lays out with flexbox and absolute positions; the
 * envelope is an inline SVG, because the generator draws border triangles as bands.
 */

/** A cut-out placed by its top-left corner, in pixels on the 2400×1256 card (or on the envelope). */
type Cut = { file: string; x: number; y: number; w: number; rotate?: number };

type Theme = {
  background: CSSProperties;
  envelope: { body: string; side: string; fold: string; flap: string; edge: string };
  /** The name, and the small words round it. */
  ink: string;
  soft: string;
  seal: string;
  /** The bow on the envelope's corner, which turns with it. */
  bow?: Cut;
  /** Flowers and lace on the card, round the envelope: `under` lie beneath it, `over` on top. */
  under: Cut[];
  over: Cut[];
};

const W = SHARE_CARD.width;
const H = SHARE_CARD.height;
/** The envelope, seen from the back, tilted a little: 980×620 with its flap's tip at 490,350. */
const ENV = { x: 120, y: 330, w: 980, h: 620, tip: 350, rotate: -6 } as const;
const SEAL = 230;
/** The words take the right side, left-aligned from here. */
const TEXT_X = 1330;
const TEXT_W = W - TEXT_X - 110;

export const CARD_THEMES: Record<CardLook, Theme> = {
  blush: {
    background: {
      backgroundColor: "#FCE3EA",
      backgroundImage: "linear-gradient(90deg, rgba(240,130,165,.17) 50%, transparent 50%), linear-gradient(rgba(240,130,165,.17) 50%, transparent 50%)",
      backgroundSize: "160px 160px",
    },
    envelope: { body: "#FFF9F4", side: "#F8ECE5", fold: "#FBF2EC", flap: "#F3E2D9", edge: "rgba(150,70,95,.22)" },
    ink: "#4A2230",
    soft: "#9C5A72",
    seal: "wax-seal-heart",
    bow: { file: "bow-satin-pink", x: -110, y: -150, w: 330, rotate: -14 },
    under: [{ file: "blossom-gold", x: 900, y: 150, w: 290, rotate: -10 }],
    over: [
      { file: "lily-pink", x: 820, y: 690, w: 440, rotate: 12 },
      { file: "sakura", x: 40, y: 860, w: 250, rotate: 8 },
    ],
  },
  rouge: {
    background: {
      backgroundColor: "#F8EFE9",
      backgroundImage: "linear-gradient(90deg, rgba(150,26,48,.14) 0 22%, transparent 22% 100%)",
      backgroundSize: "72px 100%",
    },
    envelope: { body: "#EEDCC2", side: "#E5CFB0", fold: "#EAD5B8", flap: "#DFC5A2", edge: "rgba(90,50,20,.24)" },
    ink: "#3E0D17",
    soft: "#8A3946",
    seal: "wax-seal-flower",
    under: [{ file: "dahlia-wine", x: 880, y: 160, w: 330, rotate: -12 }],
    over: [
      { file: "rose-oxblood", x: 820, y: 700, w: 420, rotate: 10 },
      { file: "carnation-picotee", x: 30, y: 860, w: 300, rotate: -8 },
    ],
  },
  pressed: {
    background: {
      backgroundColor: "#ECE1CE",
      backgroundImage: "radial-gradient(rgba(126,92,56,.2) 0 18%, transparent 21%)",
      backgroundSize: "84px 84px",
    },
    envelope: { body: "#FBF7EE", side: "#F2EADC", fold: "#F6F0E4", flap: "#EDE3D1", edge: "rgba(90,60,30,.2)" },
    ink: "#3B2A1A",
    soft: "#7A5E3E",
    seal: "wax-seal-swans",
    bow: { file: "bow-satin-blush", x: 760, y: -120, w: 280, rotate: 16 },
    under: [{ file: "dried-flowers", x: 60, y: 120, w: 260, rotate: -24 }],
    over: [
      { file: "roses-kraft", x: 900, y: 560, w: 360, rotate: 8 },
      { file: "peony-kraft", x: 20, y: 820, w: 400, rotate: -6 },
    ],
  },
  noir: {
    background: {
      backgroundColor: "#151011",
      backgroundImage: "radial-gradient(55% 75% at 26% 55%, rgba(140,40,55,.38), transparent 72%)",
    },
    envelope: { body: "#F5EFE7", side: "#EBE3D9", fold: "#F0E9DF", flap: "#E5DCD0", edge: "rgba(0,0,0,.28)" },
    ink: "#F7EDE6",
    soft: "rgba(247,237,230,.72)",
    seal: "wax-seal-heart",
    bow: { file: "bow-lace-black", x: -110, y: -140, w: 320, rotate: -14 },
    under: [],
    over: [
      { file: "rose-black-large", x: 860, y: 230, w: 320, rotate: 12 },
      { file: "rose-ember", x: 800, y: 720, w: 400, rotate: -8 },
    ],
  },
};

/** Every file a look draws, so the caller reads only those. */
export function cardFiles(look: CardLook): string[] {
  const t = CARD_THEMES[look];
  return [t.seal, ...(t.bow ? [t.bow.file] : []), ...t.under.map((c) => c.file), ...t.over.map((c) => c.file)];
}

/**
 * The name as big as it can be and still fit its side of the card: 300px for "Maya", less for
 * "Alexandria", and a long one of several words on two lines, its longest word still on one.
 */
export function nameSize(name: string): { size: number; lines: 1 | 2 } {
  const fit = (chars: number, lines: number) => Math.floor((lines * TEXT_W) / (0.53 * chars + 0.3 * lines));
  const chars = Math.max(1, [...name].length);
  const longest = Math.max(1, ...name.split(/\s+/).map((word) => [...word].length));
  const single = fit(chars, 1);
  if (single >= 170 || longest === chars) return { size: Math.max(96, Math.min(300, single)), lines: 1 };
  return { size: Math.max(96, Math.min(220, fit(chars, 2), fit(longest, 1))), lines: 2 };
}

type Child = ReactElement | string | null;
const box = (style: CSSProperties, ...children: Child[]) => h("div", { style: { display: "flex", ...style } }, ...children);

/**
 * The card for `name`, in `look`. `art` maps each file `cardFiles(look)` names to a data URI the
 * caller has read; one that is missing is left out rather than breaking the card.
 */
export function cardArt({ name, look, locale, art }: { name: string; look: CardLook; locale: "en" | "es"; art: Record<string, string> }): ReactElement {
  const t = CARD_THEMES[look];
  const es = locale === "es";
  const { size, lines } = nameSize(name);
  const cut = (c: Cut) => (art[c.file] ? h("img", { src: art[c.file], style: { position: "absolute", left: c.x, top: c.y, width: c.w, transform: c.rotate ? `rotate(${c.rotate}deg)` : undefined } }) : null);
  const { body, side, fold, flap, edge } = t.envelope;
  const envelope = h(
    "svg",
    { width: ENV.w, height: ENV.h, viewBox: `0 0 ${ENV.w} ${ENV.h}`, style: { position: "absolute", left: 0, top: 0 } },
    h("rect", { x: 0, y: 0, width: ENV.w, height: ENV.h, rx: 16, fill: body }),
    h("polygon", { points: `0,0 0,${ENV.h} ${ENV.w / 2 - 20},${ENV.tip - 20}`, fill: side }),
    h("polygon", { points: `${ENV.w},0 ${ENV.w},${ENV.h} ${ENV.w / 2 + 20},${ENV.tip - 20}`, fill: side }),
    h("polygon", { points: `0,${ENV.h} ${ENV.w / 2},${ENV.tip - 50} ${ENV.w},${ENV.h}`, fill: fold }),
    h("polyline", { points: `0,${ENV.h} ${ENV.w / 2},${ENV.tip - 50} ${ENV.w},${ENV.h}`, fill: "none", stroke: edge, strokeWidth: 3 }),
    h("polygon", { points: `0,0 ${ENV.w / 2},${ENV.tip} ${ENV.w},0`, fill: flap }),
    h("polyline", { points: `0,0 ${ENV.w / 2},${ENV.tip} ${ENV.w},0`, fill: "none", stroke: edge, strokeWidth: 3 }),
    h("rect", { x: 1.5, y: 1.5, width: ENV.w - 3, height: ENV.h - 3, rx: 16, fill: "none", stroke: edge, strokeWidth: 3 }),
  );
  return box(
    { position: "relative", width: W, height: H, ...t.background, fontFamily: "Newsreader", overflow: "hidden" },
    ...t.under.map(cut),
    box(
      { position: "absolute", left: ENV.x, top: ENV.y, width: ENV.w, height: ENV.h, transform: `rotate(${ENV.rotate}deg)`, boxShadow: "0 36px 80px rgba(40,15,20,.3)", borderRadius: 16 },
      envelope,
      art[t.seal] ? h("img", { src: art[t.seal], style: { position: "absolute", left: ENV.w / 2 - SEAL / 2, top: ENV.tip - SEAL / 2, width: SEAL, transform: "rotate(-10deg)" } }) : null,
      t.bow ? cut(t.bow) : null,
    ),
    ...t.over.map(cut),
    box(
      { position: "absolute", left: TEXT_X, top: 0, width: TEXT_W, height: H, flexDirection: "column", justifyContent: "center" },
      box({ fontFamily: "Newsreader Italic", fontSize: 120, lineHeight: 1, color: t.soft }, es ? "para" : "for"),
      box({ marginTop: 10, fontSize: size, lineHeight: lines === 1 ? 1.08 : 1.02, letterSpacing: -Math.round(size * 0.025), color: t.ink, maxWidth: TEXT_W, maxHeight: Math.ceil(size * 1.08 * lines), overflow: "hidden", ...(lines === 1 ? { whiteSpace: "nowrap", textOverflow: "ellipsis" } : { flexWrap: "wrap" }) }, name),
      box({ marginTop: 34, width: 150, height: 4, borderRadius: 2, backgroundColor: t.soft, opacity: 0.55 }),
      box({ marginTop: 40, fontFamily: "Newsreader Italic", fontSize: 76, lineHeight: 1.2, color: t.soft }, es ? "alguien te ha hecho algo" : "someone made you something"),
    ),
  );
}
