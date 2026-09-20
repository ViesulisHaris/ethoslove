/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * The real flowers, bows and kisses the collage templates are made of (public/scraps), used on the
 * homepage as decoration. Their pixel sizes live here, not in the templates' catalogue, so the
 * homepage does not download the catalogue to draw a dozen of them; the box is reserved before the
 * picture arrives, so nothing on the page moves when it does.
 */
const CUTOUTS = {
  "lily-pink": [478, 492],
  "lily-stargazer": [488, 488],
  "lily-blush": [446, 496],
  "hibiscus-pink": [412, 420],
  "hibiscus-coral": [532, 522],
  "plumeria-pink": [506, 506],
  "blossom-gold": [466, 468],
  "blossom-pale": [438, 438],
  sakura: [438, 434],
  "bow-gingham": [506, 474],
  "kiss-1": [214, 192],
  "kiss-red": [404, 262],
  "envelope-ps": [356, 432],
} as const;

export type CutoutId = keyof typeof CUTOUTS;

/** One cut-out. Decorative: never announced, never clickable, never the thing the page waits for. */
export function Cutout({ id, eager = false, className, style }: { id: CutoutId; eager?: boolean; className?: string; style?: CSSProperties }) {
  const [width, height] = CUTOUTS[id];
  return <img src={`/scraps/${id}.webp`} alt="" aria-hidden="true" width={width} height={height} draggable={false} loading={eager ? "eager" : "lazy"} decoding="async" className={cn("pointer-events-none h-auto select-none", className)} style={style} />;
}

/**
 * `phone: false` keeps a bloom off small screens, where it would sit behind the words; `phone: "only"`
 * is one placed for a phone's taller, narrower page and hidden everywhere else. "Phone" means
 * anything under `lg`: a tablet gets the same single column, with the type starting at the left edge.
 */
type Bloom = { id: CutoutId; x: number; y: number; size: number; rot: number; blur?: number; opacity?: number; phone?: boolean | "only"; eager?: boolean };

/** Round the hero: lilies spilling off the corners, a few soft with depth, the words left clear. */
const HERO: Bloom[] = [
  { id: "lily-stargazer", x: -1, y: 11, size: 19, rot: -24, eager: true, phone: false },
  // On a phone the top-left corner is where the first line of type starts, so the lily leans in
  // from the right instead, beside the headline, where the short lines leave room.
  { id: "lily-stargazer", x: 103, y: 17, size: 28, rot: 28, eager: true, phone: "only" },
  { id: "sakura", x: -1.2, y: 60, size: 7, rot: 18, phone: false },
  { id: "hibiscus-pink", x: -2, y: 92, size: 15, rot: 10, blur: 1, phone: false },
  { id: "plumeria-pink", x: 41, y: 102, size: 12, rot: -16, blur: 4, opacity: 0.7, phone: false },
  { id: "blossom-gold", x: 99, y: 6, size: 16, rot: 22, blur: 2, opacity: 0.9, eager: true },
  { id: "lily-blush", x: 101.5, y: 41, size: 14, rot: -28, phone: false },
  { id: "hibiscus-coral", x: 77, y: 105, size: 17, rot: 12, blur: 6, opacity: 0.55, phone: false },
];

/** Round the closing section: the same flowers on the dark ground, closer in. */
const CLOSING: Bloom[] = [
  { id: "lily-pink", x: 1, y: 8, size: 20, rot: -18 },
  { id: "blossom-pale", x: -2, y: 58, size: 11, rot: 24, blur: 2, opacity: 0.8, phone: false },
  { id: "hibiscus-coral", x: 4, y: 102, size: 19, rot: 8, blur: 1 },
  { id: "plumeria-pink", x: 38, y: 108, size: 13, rot: 30, blur: 6, opacity: 0.5, phone: false },
  { id: "blossom-gold", x: 98, y: 4, size: 18, rot: 20, blur: 3, opacity: 0.7 },
  { id: "lily-blush", x: 102, y: 50, size: 15, rot: -30, phone: false },
  { id: "lily-stargazer", x: 95, y: 98, size: 20, rot: -12 },
  { id: "sakura", x: 66, y: 110, size: 12, rot: -20, blur: 5, opacity: 0.5, phone: false },
];

/** Two, far apart and out of focus, behind the covers. */
const BAND: Bloom[] = [
  { id: "lily-pink", x: 99, y: 8, size: 17, rot: 26, blur: 3, opacity: 0.55 },
  { id: "hibiscus-pink", x: -1, y: 96, size: 15, rot: -14, blur: 5, opacity: 0.45, phone: false },
];

const FRAMES = { hero: HERO, closing: CLOSING, band: BAND } as const;

/**
 * A frame of real flowers round a section. `light` lays them on blush paper, `dark` on the forest
 * ground with a vignette; `bare` adds the flowers to a ground the section already has.
 */
export function FloralFrame({ frame, ground, className }: { frame: keyof typeof FRAMES; ground: "light" | "dark" | "bare"; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {ground === "light" ? <div className="absolute inset-0" style={{ background: "radial-gradient(58% 60% at 80% 46%, rgba(243,185,196,.5) 0%, rgba(243,185,196,0) 70%), radial-gradient(46% 42% at 0% 0%, rgba(248,214,208,.9) 0%, rgba(248,214,208,0) 72%), linear-gradient(180deg, #FCF5F0 0%, #F9E8E4 100%)" }} /> : null}
      {ground === "dark" ? <div className="absolute inset-0" style={{ background: "radial-gradient(85% 70% at 50% 30%, #21402f 0%, #0f2219 55%, #09150f 100%)" }} /> : null}
      {FRAMES[frame].map((b, i) => (
        <Cutout
          key={i}
          id={b.id}
          eager={b.eager}
          className={cn("absolute max-w-none", b.phone === false && "hidden lg:block", b.phone === "only" && "lg:hidden")}
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `clamp(${Math.round(b.size * 4.4)}px, ${b.size}vw, ${b.size * 15}px)`,
            transform: `translate(-50%, -50%) rotate(${b.rot}deg)`,
            filter: `${b.blur ? `blur(${b.blur}px) ` : ""}drop-shadow(0 10px 18px rgba(${ground === "light" ? "120,50,70,.22" : "0,0,0,.5"}))`,
            opacity: b.opacity ?? 1,
          }}
        />
      ))}
      {ground !== "bare" ? <div className={cn("grain-overlay mix-blend-overlay", ground === "light" ? "opacity-[0.16]" : "opacity-[0.1]")} /> : null}
      {ground === "dark" ? <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 45%, transparent 45%, rgba(6,14,10,0.55) 100%)" }} /> : null}
    </div>
  );
}

/**
 * A torn paper edge between two sections: the lower section's colour, torn along the top, laid
 * over the upper one's. The tear is fixed, so it is the same on the server and in the browser.
 */
const TEAR = "polygon(0% 62%, 3% 40%, 6.5% 58%, 10% 30%, 13.5% 52%, 17% 28%, 21% 55%, 24.5% 34%, 28% 60%, 32% 38%, 35.5% 56%, 39% 26%, 43% 50%, 46.5% 32%, 50% 58%, 54% 36%, 57.5% 54%, 61% 28%, 65% 52%, 68.5% 34%, 72% 60%, 76% 40%, 79.5% 56%, 83% 30%, 87% 52%, 90.5% 36%, 94% 58%, 97% 42%, 100% 60%, 100% 100%, 0% 100%)";

export function TornEdge({ from, to, fibre = "#FFFFFF" }: { from: string; to: string; fibre?: string }) {
  return (
    <div aria-hidden="true" className="relative -mb-px h-5 sm:h-7" style={{ background: from }}>
      <div className="absolute inset-0 opacity-70" style={{ background: fibre, clipPath: TEAR, transform: "translateY(-18%)" }} />
      <div className="absolute inset-0" style={{ background: to, clipPath: TEAR }} />
    </div>
  );
}
