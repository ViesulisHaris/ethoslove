import { artSrcSet, pageArt, slotGeometry, slotStyle } from "@/content/page-art";
import type { Flowers } from "@/content/template-page-themes";
import type { HeroFlatlayArt } from "./hero-flatlay";

/**
 * The hero's picture, as the browser needs it: the render of a phone lying on flowers
 * (content/page-art.ts, `hero-flatlay`), its bezel layer, and where its screen is. Worked out on
 * the server, so the art's manifest never reaches a browser. One function for every page whose
 * hero is that phone: a gift's page, and the pages built from it (components/marketing/spread).
 */
export function heroFlatlayArt(flowers: Flowers): HeroFlatlayArt {
  const flatlay = pageArt("hero-flatlay", flowers);
  const screen = flatlay.slots.screen!;
  const { centerX, centerY, perWidth, turn, spanX } = slotGeometry(flatlay, screen);
  return {
    src: flatlay.src1x,
    srcSet: artSrcSet(flatlay),
    width: flatlay.width,
    height: flatlay.height,
    bezel: flatlay.bezel ? { src: flatlay.bezel.src1x, srcSet: `${flatlay.bezel.src1x} ${flatlay.width1x}w, ${flatlay.bezel.src} ${flatlay.width}w` } : undefined,
    screen: slotStyle(flatlay, screen),
    centerX,
    centerY,
    perWidth,
    turn,
    spanX,
  };
}

/**
 * How the hero is laid out, wherever that phone is the hero's picture.
 *
 * `HERO_GRID`: below `lg` it is one column, and the phone alone is taller than a phone's screen,
 * so the words come first there and the phone after them. From `lg` the phone takes the left
 * column.
 *
 * `HERO_PHONE_BOX`: --hero-phone is how wide the phone's screen is drawn; --fl-up and --fl-down
 * the room kept above and below the screen's middle, in screen widths. Below `lg` the words are
 * above and below it, so nearly the whole picture is kept clear of them. From `lg` it has the
 * left column: its leaves run into the section's own padding. Between 1024 and 1280 the phone is
 * drawn smaller, by the same share of the screen.
 *
 * `HERO_PHONE_PLACE`: it sits left of centre, by less on a wider screen, so its right-hand lilies
 * stop short of the words and its left-hand one is not lost off the page.
 *
 * `HERO_SIZES` says how wide the picture is drawn, except on a phone, where it says far less than
 * the 758px it is (hero-flatlay.tsx says why): the half-size files are a phone's.
 */
export const HERO_GRID = "container-x relative grid gap-y-10 pt-8 pb-14 sm:pb-20 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center lg:gap-x-10 lg:pt-10 lg:pb-24 xl:gap-x-14 xl:pb-28";
export const HERO_PHONE_BOX = "min-w-0 [--fl-down:1.76] [--fl-up:1.74] [--hero-phone:min(13.75rem,57vw)] lg:order-first lg:[--fl-down:1.2] lg:[--fl-up:1.2] lg:[--hero-phone:clamp(11.25rem,17.8vw,16rem)]";
export const HERO_PHONE_PLACE = "lg:mx-0 lg:ml-[calc(6.8rem-(80rem-100vw)*0.09)] xl:ml-[clamp(3.25rem,calc(6.8rem-(100vw-80rem)*0.36),6.8rem)]";
export const HERO_SIZES = "(min-width: 1280px) 860px, (min-width: 1024px) 700px, (min-width: 640px) 800px, 40vw";

/** The hero's two buttons: the one strong one, and the quiet one beside it. */
export const HERO_BUTTON =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-page-accent px-6 text-base font-medium text-page-on-accent shadow-[0_14px_28px_-16px_var(--page-accent)] transition-[background-color,translate,scale] duration-200 ease-(--ease-out-quint) hover:bg-page-accent-hover active:scale-[0.98] pointer-fine:hover:-translate-y-px";
export const HERO_BUTTON_QUIET =
  "inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full border border-page-ink/30 px-6 py-2.5 text-center text-base font-medium text-page-ink transition-[background-color,border-color,scale] duration-200 ease-(--ease-out-quint) hover:border-page-ink/50 hover:bg-page-raised active:scale-[0.98]";
