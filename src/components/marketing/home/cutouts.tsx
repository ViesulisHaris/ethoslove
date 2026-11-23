import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { EagerImg } from "@/components/shared/eager-img";

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
  // Ethos for Two's night sky on /pricing: the gold felt star, the gift tag and the paper couple.
  "star-felt": [176, 178],
  "tag-tofrom": [536, 280],
  "paper-couple": [348, 400],
} as const;

export type CutoutId = keyof typeof CUTOUTS;

/**
 * The picture itself, for a cut-out from anywhere: public/scraps here, the rendered page art on a
 * gift's page (content/page-art.ts). Decorative: never announced, never clickable, never the thing
 * the page waits for, and its box is reserved by its width and height.
 * An eager one is drawn through EagerImg, so the homepage's hero lilies stop being preloaded by
 * every page that merely links to the homepage (see eager-img.tsx); a lazy one needs no such care.
 */
export function CutoutImg({ src, width, height, srcSet, sizes, eager = false, className, style }: { src: string; width: number; height: number; srcSet?: string; sizes?: string; eager?: boolean; className?: string; style?: CSSProperties }) {
  const Img = eager ? EagerImg : "img";
  return <Img src={src} srcSet={srcSet} sizes={sizes} alt="" aria-hidden="true" width={width} height={height} draggable={false} loading={eager ? "eager" : "lazy"} decoding="async" className={cn("pointer-events-none h-auto select-none", className)} style={style} />;
}

/** One cut-out from public/scraps, by name. */
export function Cutout({ id, eager = false, className, style }: { id: CutoutId; eager?: boolean; className?: string; style?: CSSProperties }) {
  const [width, height] = CUTOUTS[id];
  return <CutoutImg src={`/scraps/${id}.webp`} width={width} height={height} eager={eager} className={className} style={style} />;
}

/**
 * `phone: false` keeps a bloom off small screens, where it would sit behind the words; `phone: "only"`
 * is one placed for a phone's taller, narrower page and hidden everywhere else. "Phone" means
 * anything under `lg`: a tablet gets the same single column, with the type starting at the left edge.
 */
export type Placement = { x: number; y: number; size: number; rot: number; blur?: number; opacity?: number; phone?: boolean | "only"; eager?: boolean; /** Only from 1440px: under that the words start too near the screen's edge for it. */ wide?: boolean };
type Bloom = Placement & { art: FrameArtId };

/** Which screens a placed bloom is drawn on. */
export function placementClass(b: Pick<Placement, "phone" | "wide">): string {
  // Whole class names, so Tailwind finds them. 90rem is 1440px.
  if (b.wide) return "absolute max-w-none hidden min-[90rem]:block";
  return cn("absolute max-w-none", b.phone === false && "hidden lg:block", b.phone === "only" && "lg:hidden");
}

/**
 * Where a placed bloom lies in its frame: its middle at x and y per cent, as wide as `size` per
 * cent of the screen (never under 4.4 times that in pixels, never over 15 times), turned, and
 * given the shadow of the ground it lies on.
 */
export function placementStyle(b: Placement, shadow: string): CSSProperties {
  return {
    left: `${b.x}%`,
    top: `${b.y}%`,
    width: `clamp(${Math.round(b.size * 4.4)}px, ${b.size}vw, ${b.size * 15}px)`,
    transform: `translate(-50%, -50%) rotate(${b.rot}deg)`,
    filter: `${b.blur ? `blur(${b.blur}px) ` : ""}drop-shadow(0 10px 18px ${shadow})`,
    opacity: b.opacity ?? 1,
  };
}

/**
 * The flowers round a section are the rendered lilies of the gift pages (content/page-art.ts), not
 * the photographs they were until 22 Nov 2026 (the owner: "update the lilies… so it's more high
 * quality"). What comes with a render: it is lit from the top left, so none is mirrored and none
 * turned more than about 25 degrees, and each has a stem, so each lies where its stem can leave
 * the page: `lily-open`'s runs down to the left, `lily-three-quarter`'s up to the right,
 * `lily-side`'s down to the right. Petals and leaves have no such rule.
 */

/**
 * The frame's own pieces, in the ivory colourway of the owner's gallery mock-up (22 Nov 2026): where
 * each file is and how big. The same facts
 * are in the art's manifest (content/page-art.ts); they are written out here because this module
 * is also drawn in the browser (the gallery, the gifts page's hero), and those pages should not
 * download the whole manifest for eight flowers. tests/unit/frame-art.test.ts holds this table to
 * the manifest, so a new render that changes a size fails there and not on a page.
 */
export const FRAME_ART = {
  "lily-open": { src: "/art/pages/lily-open-ivory.webp", src1x: "/art/pages/lily-open-ivory-1x.webp", width: 900, height: 604, width1x: 450 },
  "lily-three-quarter": { src: "/art/pages/lily-three-quarter-ivory.webp", src1x: "/art/pages/lily-three-quarter-ivory-1x.webp", width: 900, height: 771, width1x: 450 },
  "lily-stem-tall": { src: "/art/pages/lily-stem-tall-ivory.webp", src1x: "/art/pages/lily-stem-tall-ivory-1x.webp", width: 1144, height: 1600, width1x: 572 },
  "lily-side": { src: "/art/pages/lily-side-ivory.webp", src1x: "/art/pages/lily-side-ivory-1x.webp", width: 900, height: 726, width1x: 450 },
  "petal-1": { src: "/art/pages/petal-1-ivory.webp", src1x: "/art/pages/petal-1-ivory-1x.webp", width: 360, height: 256, width1x: 180 },
  "petal-2": { src: "/art/pages/petal-2-ivory.webp", src1x: "/art/pages/petal-2-ivory-1x.webp", width: 360, height: 271, width1x: 180 },
  "petal-3": { src: "/art/pages/petal-3-ivory.webp", src1x: "/art/pages/petal-3-ivory-1x.webp", width: 360, height: 264, width1x: 180 },
  "petal-4": { src: "/art/pages/petal-4-ivory.webp", src1x: "/art/pages/petal-4-ivory-1x.webp", width: 360, height: 211, width1x: 180 },
  "leaf-1": { src: "/art/pages/leaf-1.webp", src1x: "/art/pages/leaf-1-1x.webp", width: 700, height: 398, width1x: 350 },
  "leaf-2": { src: "/art/pages/leaf-2.webp", src1x: "/art/pages/leaf-2-1x.webp", width: 700, height: 260, width1x: 350 },
} as const;
export type FrameArtId = keyof typeof FRAME_ART;

/** One rendered piece of the frame by name, for a place outside the frame (a heading's corner). */
export function FrameArt({ art, sizes, eager = false, className, style }: { art: FrameArtId; sizes: string; eager?: boolean; className?: string; style?: CSSProperties }) {
  const a = FRAME_ART[art];
  return <CutoutImg src={a.src1x} srcSet={`${a.src1x} ${a.width1x}w, ${a.src} ${a.width}w`} sizes={sizes} width={a.width} height={a.height} eager={eager} className={className} style={style} />;
}

/**
 * Round the hero: sprays of ivory lilies on their green stems, leaves with them, as the owner's
 * gallery mock-up has them ("the flowers are missing… i like the ones that look like the mockup so
 * its just really pretty. with green", 22 Nov 2026). The first frame of rendered lilies was a few
 * pale heads in the corners; this one has the tall stem and its leaves at the right, a head at each
 * corner and leaves coming in from both edges. The words are left clear.
 */
const HERO: Bloom[] = [
  // the top right: a spray on its stem, a large head in the corner over it, a leaf above
  // One piece of a frame is fetched with the page, the head in the top right corner (the same file
  // on a phone and a desk). The rest arrive after it into the room kept for them: the tall stem is
  // 88 KB (217 KB on a sharp screen), and with two more eager heads the first view carried three
  // times the decoration the old hero did, ahead of the hero's own photograph. A piece that is
  // hidden at a width and not lazy is fetched all the same, which a lazy one is not.
  { art: "lily-stem-tall", x: 94, y: 31, size: 27, rot: 18, phone: false },
  { art: "lily-three-quarter", x: 96.5, y: 8, size: 24, rot: 6, eager: true, phone: false },
  { art: "leaf-1", x: 84, y: 2.5, size: 12, rot: 168, opacity: 0.9, phone: false },
  { art: "lily-side", x: 100.5, y: 62, size: 15, rot: -12, phone: false },
  { art: "leaf-1", x: 99.5, y: 82, size: 13, rot: -150, opacity: 0.85, phone: false },
  // the left edge: a head at the top, leaves down the side, a head and a leaf at the foot
  { art: "lily-open", x: -1.5, y: 8, size: 19, rot: -10, phone: false },
  { art: "leaf-1", x: -1, y: 25, size: 13, rot: 38, opacity: 0.9, wide: true },
  { art: "leaf-2", x: -1.5, y: 41, size: 14, rot: -40, opacity: 0.9, wide: true },
  { art: "petal-2", x: 1.2, y: 60, size: 5, rot: 18, wide: true },
  { art: "lily-open", x: -1, y: 95, size: 18, rot: 16, phone: false },
  { art: "leaf-2", x: 6.5, y: 101.5, size: 12, rot: -18, opacity: 0.85, wide: true },
  // along the foot, soft with depth
  { art: "petal-3", x: 41, y: 101, size: 6, rot: -16, blur: 3, opacity: 0.8, phone: false },
  { art: "leaf-1", x: 78, y: 104, size: 13, rot: 12, blur: 4, opacity: 0.65, phone: false },
  // On a phone the top-left corner is where the first line of type starts, so the lily leans in
  // from the right instead, beside the headline, where the short lines leave room, a leaf under it.
  { art: "lily-three-quarter", x: 105.5, y: 11, size: 24, rot: 8, eager: true, phone: "only" },
  { art: "leaf-2", x: 105, y: 19.5, size: 22, rot: -62, opacity: 0.85, phone: "only" },
];

/** Round the closing section: the same flowers on the dark ground, closer in. */
const CLOSING: Bloom[] = [
  { art: "lily-open", x: 2, y: 10, size: 22, rot: -14, phone: false },
  { art: "lily-open", x: -7, y: 1, size: 22, rot: -14, phone: "only" },
  { art: "leaf-1", x: 0.5, y: 33, size: 14, rot: 40, opacity: 0.85, phone: false },
  { art: "petal-1", x: -0.5, y: 60, size: 6, rot: 24, blur: 2, opacity: 0.8, phone: false },
  { art: "lily-open", x: 3, y: 101, size: 20, rot: 12, blur: 1, phone: false },
  { art: "leaf-2", x: 13, y: 104, size: 13, rot: -14, opacity: 0.8, phone: false },
  { art: "petal-4", x: 38, y: 106, size: 7, rot: 22, blur: 5, opacity: 0.5, phone: false },
  { art: "lily-stem-tall", x: 95.5, y: 40, size: 24, rot: 14, phone: false },
  { art: "lily-three-quarter", x: 97.5, y: 5, size: 20, rot: 10, phone: false },
  { art: "lily-side", x: 96, y: 99, size: 21, rot: 6, phone: false },
  { art: "lily-side", x: 107, y: 101, size: 22, rot: 6, phone: "only" },
  { art: "petal-2", x: 66, y: 108, size: 7, rot: -20, blur: 5, opacity: 0.5, phone: false },
];

/** A head and its leaves, far apart and out of focus, behind the covers. */
const BAND: Bloom[] = [
  { art: "lily-three-quarter", x: 100.5, y: 5, size: 18, rot: 12, blur: 3, opacity: 0.6 },
  // Only on a wide screen: under 1440px a section's paragraph runs to where this leaf lies.
  { art: "leaf-2", x: 93, y: 24, size: 12, rot: -32, blur: 3, opacity: 0.55, wide: true },
  { art: "lily-open", x: 0, y: 96, size: 16, rot: -12, blur: 5, opacity: 0.5, phone: false },
  { art: "leaf-1", x: 7, y: 101, size: 11, rot: 20, blur: 5, opacity: 0.45, phone: false },
];

/** Round a hero whose right half and foot are full: a head in each top corner and nothing along the sides. */
const CORNERS: Bloom[] = [
  { art: "lily-open", x: -2, y: 7, size: 17, rot: -10, wide: true },
  { art: "lily-three-quarter", x: 102.5, y: 3, size: 16, rot: 6, eager: true, phone: false },
  { art: "lily-three-quarter", x: 107, y: 7, size: 22, rot: 8, eager: true, phone: "only" },
];

/**
 * Inside a card (the dark invitation at the foot of a trip or a city): a card is a fraction of the
 * screen and a bloom is sized by the screen, so these are small, and lie in two opposite corners,
 * clear of the card's words and its button at every width.
 */
const CARD: Bloom[] = [
  { art: "lily-three-quarter", x: 100, y: 3, size: 9, rot: 12, blur: 2, opacity: 0.6 },
  { art: "lily-open", x: 0, y: 103, size: 8, rot: -12, blur: 3, opacity: 0.5, phone: false },
];

/**
 * The band frame for a band that ends on a torn edge (the front page's long distance): its two
 * blurred pieces at the foot lay half over the band's lower edge, where the band cut them off flat
 * (walk-agreed-13). Here they lie whole inside it; the head at the top right is as in BAND.
 */
const BAND_INSIDE: Bloom[] = [
  BAND[0],
  BAND[1],
  { art: "lily-open", x: 3, y: 74, size: 14, rot: -12, blur: 5, opacity: 0.5, phone: false },
  { art: "leaf-1", x: 10, y: 84, size: 9, rot: 20, blur: 5, opacity: 0.45, phone: false },
];

/**
 * A trip's hero (walk-rooms-3): BAND cut its lily flat at the hero's foot. The foot's pieces lie whole
 * inside it, as in BAND_INSIDE, and only from 1440px: narrower, the facts and buttons run over it.
 * BAND_INSIDE's leaf is left out: it lay under the first button.
 */
const BAND_HERO: Bloom[] = [BAND[0], BAND[1], { ...BAND_INSIDE[2], wide: true }];

const FRAMES = { hero: HERO, corners: CORNERS, closing: CLOSING, band: BAND, bandInside: BAND_INSIDE, bandHero: BAND_HERO, card: CARD } as const;

/**
 * A frame of real flowers round a section. `light` lays them on blush paper, `dark` on the forest
 * ground with a vignette; `bare` adds the flowers to a ground the section already has.
 */
export function FloralFrame({ frame, ground, className }: { frame: keyof typeof FRAMES; ground: "light" | "dark" | "bare"; className?: string }) {
  return (
    <div aria-hidden="true" data-floral-frame={frame} className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {ground === "light" ? <div className="absolute inset-0 paper-ground" /> : null}
      {ground === "dark" ? <div className="absolute inset-0" style={{ background: "radial-gradient(85% 70% at 50% 30%, #55203f 0%, #2a0f1f 55%, #170810 100%)" }} /> : null}
      {FRAMES[frame].map((b, i) => {
        // A render brings the shadow it was lit with, so none is added: on the dark ground that shadow is lost in the dark, as a real one would be.
        const place = placementStyle(b, "transparent");
        return <FrameArt key={i} art={b.art} sizes={`${Math.round(b.size * 1.2)}vw`} eager={b.eager} className={placementClass(b)} style={{ ...place, filter: `sepia(0.2) saturate(0.92)${b.blur ? ` blur(${b.blur}px)` : ""}` }} />;
      })}
      {ground !== "bare" ? <div className={cn("grain-overlay mix-blend-overlay", ground === "light" ? "opacity-[0.16]" : "opacity-[0.1]")} /> : null}
      {ground === "dark" ? <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 45%, transparent 45%, rgba(16,4,11,0.55) 100%)" }} /> : null}
    </div>
  );
}

/**
 * A torn paper edge between two sections: the lower section's colour, torn along the top, laid
 * over the upper one's. The tear is fixed, so it is the same on the server and in the browser.
 * Every colour is a token by name, never a hex: the pink a hero used to end in was written here
 * by hand on three pages, and was left behind as a pink strip when the paper turned cream. The
 * tear's fibre is the card's paper, a shade lighter than the page, as torn paper is at its edge.
 */
const TEAR = "polygon(0% 62%, 3% 40%, 6.5% 58%, 10% 30%, 13.5% 52%, 17% 28%, 21% 55%, 24.5% 34%, 28% 60%, 32% 38%, 35.5% 56%, 39% 26%, 43% 50%, 46.5% 32%, 50% 58%, 54% 36%, 57.5% 54%, 61% 28%, 65% 52%, 68.5% 34%, 72% 60%, 76% 40%, 79.5% 56%, 83% 30%, 87% 52%, 90.5% 36%, 94% 58%, 97% 42%, 100% 60%, 100% 100%, 0% 100%)";

export function TornEdge({ from, to, fibre = "var(--card)" }: { from: string; to: string; fibre?: string }) {
  return (
    <div aria-hidden="true" className="relative -mb-px h-5 sm:h-7" style={{ background: from }}>
      <div className="absolute inset-0 opacity-70" style={{ background: fibre, clipPath: TEAR, transform: "translateY(-18%)" }} />
      <div className="absolute inset-0" style={{ background: to, clipPath: TEAR }} />
    </div>
  );
}
