"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, type CSSProperties } from "react";
import { Play } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { GiftLocale } from "@/lib/gift/schema";
import { CutoutImg } from "@/components/marketing/home/cutouts";
import { TemplatePhonePreview } from "@/components/templates/template-phone-preview";

/**
 * What the page hands over about the render (content/page-art.ts reads it from the art's manifest
 * on the server, so the manifest never reaches a browser): the picture, its bezel layer, where
 * the screen is and how the picture sits round it.
 */
export type HeroFlatlayArt = {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  bezel?: { src: string; srcSet: string };
  /** CSS that carries a box onto the phone's screen (slotStyle). */
  screen: CSSProperties;
  /** The screen's middle as shares of the picture, the picture's width in screen widths, the screen's turn, and the turned screen's own width in screen widths (slotGeometry). */
  centerX: number;
  centerY: number;
  perWidth: number;
  turn: number;
  spanX: number;
};

/**
 * The hero's picture: a phone lying at a slight angle on lilies, the page art's `hero-flatlay`,
 * with the gift's cover laid into its screen by the render's own matrix and the render's bezel
 * layer over it. Nothing else overlaps the phone.
 *
 * A tap plays the gift, and to play it the phone is picked up: the live gift comes up over the
 * lying phone, upright, and the table goes soft behind it. Upright because a rendered phone can't
 * be stood up, and a gift is played with a finger: 24 of the 61 templates read where the finger
 * is (a scratch card, a frosted window, a cork to pull), and a template works that out from an
 * upright box, so on a screen turned 14 degrees the scratch would land beside the finger. One
 * way for every gift, so nobody learns two.
 *
 * `width` is how wide the lying screen is drawn, as CSS; `up` and `down` how much room the page
 * keeps above and below the screen's middle, in screen widths. The picture itself is far larger
 * than that box and spills past it on every side: the page decides how much of that spill may
 * meet anything (on a phone it keeps nearly all of it clear; on a desk the leaves run into the
 * section's own padding). `sizes` is how wide the picture is drawn, for the browser's choice of
 * file: a CSS variable can't say it.
 */
export function HeroFlatlay({ slug, locale, art, width, up, down, sizes, className }: { slug: string; locale: GiftLocale; art: HeroFlatlayArt; width: string; up: string; down: string; sizes: string; className?: string }) {
  const t = useTranslations("templates");
  const [live, setLive] = useState(false);
  const picture = `calc(${width} * ${art.perWidth})`;
  const settle = cn("transition-[opacity,filter] duration-500 ease-(--ease-out-quint)", live && "opacity-55 blur-[2px]");
  return (
    <div data-flatlay="hero" data-live={live ? "" : undefined} className={cn("relative mx-auto", className)} style={{ width: `calc(${width} * ${art.spanX})`, height: `calc(${width} * (${up} + ${down}))` }}>
      <div
        className="absolute"
        style={{
          width: picture,
          aspectRatio: `${art.width} / ${art.height}`,
          left: `calc(50% - ${width} * ${art.perWidth * art.centerX})`,
          top: `calc(${width} * (${up} - ${(art.perWidth * art.centerY * art.height) / art.width}))`,
        }}
      >
        <span data-decor="hero-flatlay" className={cn("pointer-events-none absolute inset-0 block", settle)}>
          <CutoutImg src={art.src} srcSet={art.srcSet} sizes={sizes} width={art.width} height={art.height} eager className="block w-full" />
        </span>
        <div className={cn("absolute overflow-hidden bg-night", settle)} style={art.screen}>
          {/* The cover until they tap, so the phone never lies there black. */}
          <button type="button" onClick={() => setLive(true)} disabled={live} aria-label={t("tryDemo")} className="group relative block h-full w-full text-paper">
            <img src={`/templates/${slug}/poster.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" />
            {live ? null : (
              <>
                <span className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/10" />
                <span className="relative flex h-full flex-col items-center justify-center gap-3">
                  <span className="grid size-14 place-items-center rounded-full bg-cream text-forest shadow-[0_14px_40px_-14px_rgba(0,0,0,0.7)] transition-transform group-hover:scale-105">
                    <Play className="ml-0.5 size-5 fill-current" />
                  </span>
                  <span aria-hidden="true" className="rounded-full bg-black/35 px-3 py-1 text-sm font-medium backdrop-blur">
                    {t("tryDemo")}
                  </span>
                </span>
              </>
            )}
          </button>
        </div>
        {art.bezel ? (
          // Over the screen, and never in a finger's way: a tap goes through the rim to the cover under it.
          <span className={cn("pointer-events-none absolute inset-0 block", settle)}>
            <CutoutImg src={art.bezel.src} srcSet={art.bezel.srcSet} sizes={sizes} width={art.width} height={art.height} eager className="block w-full" />
          </span>
        ) : null}
      </div>
      {live ? (
        // Picked up: the live gift, upright, over where the phone lay. It starts at the lying phone's own turn.
        <div data-upright className="hero-lift absolute left-1/2 z-10" style={{ top: `calc(${width} * ${up})`, "--lift-turn": `${art.turn}deg` } as CSSProperties}>
          <TemplatePhonePreview slug={slug} locale={locale} autoStart width={`calc(${width} * 1.14)`} />
        </div>
      ) : null}
    </div>
  );
}
