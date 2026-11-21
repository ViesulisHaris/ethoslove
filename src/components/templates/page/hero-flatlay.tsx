"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { GiftLocale } from "@/lib/gift/schema";
import { CutoutImg } from "@/components/marketing/home/cutouts";
import { pageArt, slotStyle } from "@/content/page-art";
import type { Flowers } from "@/content/template-page-themes";
import { TemplatePhonePreview } from "@/components/templates/template-phone-preview";
import { Art } from "./art";

/**
 * The hero's picture: a phone lying at a slight angle among flowers, with the live demo in its
 * screen. It is the page art's `hero-flatlay`.
 *
 * - Once that is a render, the picture is the phone and the flowers in one, and the demo is laid
 *   into its empty screen by the render's own matrix, under its bezel layer.
 * - Until then the phone is the site's CSS frame, tilted, with three of the colourway's flowers
 *   tucked behind it. A tap starts the demo and stands the phone upright: a gift is played with a
 *   finger (a scratch card, a seal to break), and the template reads where the finger is from an
 *   upright box.
 *
 * `width` is the phone's own width as CSS; everything else follows from it, so the layout is the
 * same whichever of the two is drawn. A render's picture is wider than its phone and is never let
 * past its column: if it would be, make `width` smaller where the page sets it, because the gift's
 * clearance under the island (`--gift-safe-top`) is worked out from `width` as given.
 */
export function HeroFlatlay({ slug, locale, flowers, width, className }: { slug: string; locale: GiftLocale; flowers: Flowers; width: string; className?: string }) {
  const [live, setLive] = useState(false);
  const art = pageArt("hero-flatlay", flowers, slug);
  const slot = slotStyle(art);

  if (!art.standIn && slot && art.slot) {
    // How much of the picture's width the screen takes, so the screen comes out `width` wide.
    const [a, b] = art.slot.matrix;
    const share = (art.slot.box[0] * Math.hypot(a, b)) / art.width;
    return (
      <div data-flatlay="hero" className={cn("relative mx-auto", className)} style={{ width: `calc(${width} / ${share})`, maxWidth: "100%", aspectRatio: `${art.width} / ${art.height}` }}>
        <CutoutImg src={art.src} srcSet={art.src1x ? `${art.src1x} 1x, ${art.src} 2x` : undefined} width={art.width} height={art.height} eager className="absolute inset-0 w-full" />
        <div className="absolute overflow-hidden rounded-[11%/5.2%]" style={{ ...slot, "--gift-safe-top": `calc(${width} / ${Math.hypot(a, b)} * 0.143)` } as CSSProperties}>
          <TemplatePhonePreview slug={slug} locale={locale} bare />
        </div>
        {art.bezel ? <CutoutImg src={art.bezel} width={art.width} height={art.height} eager className="absolute inset-0 w-full" /> : null}
      </div>
    );
  }

  return (
    <div data-flatlay="hero" className={cn("relative mx-auto", className)} style={{ width }}>
      <Art id="lily-open" flowers={flowers} eager className="absolute top-[3%] left-[-52%] w-[86%] -rotate-[22deg] drop-shadow-[0_18px_22px_var(--page-shade-soft)]" />
      <Art id="lily-side" flowers={flowers} eager className="absolute top-[19%] right-[-33%] w-[58%] rotate-[28deg] drop-shadow-[0_14px_18px_var(--page-shade-soft)]" />
      <Art id="lily-three-quarter" flowers={flowers} className="absolute bottom-[-3%] left-[-30%] w-[48%] rotate-[14deg] blur-[1.5px] drop-shadow-[0_14px_18px_var(--page-shade-soft)]" />
      <div className={cn("relative origin-center transition-transform duration-700 ease-(--ease-out-quint)", live ? "rotate-0" : "-rotate-[5deg]")}>
        <div aria-hidden="true" className="absolute inset-x-[6%] top-[12%] bottom-[-2%] rounded-[18%/9%] bg-(--page-shade) opacity-70 blur-2xl" />
        <TemplatePhonePreview slug={slug} locale={locale} width={width} onLive={() => setLive(true)} />
      </div>
    </div>
  );
}
