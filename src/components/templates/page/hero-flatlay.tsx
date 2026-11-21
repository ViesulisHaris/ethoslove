"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
 * In that screen the gift's own preview loops, silent (public/templates/<slug>/preview.webm, the
 * film the gallery's cards play on hover): it starts when the phone is on screen and stops when it
 * leaves, over the still cover, which stays underneath so nothing flickers when the film arrives
 * and nothing is missing where it can't play. No film at all for someone who asked for less
 * motion or less data, or on a browser that can't play it: the still cover is the whole of it.
 * The covers and films are 13:20 and a phone's screen is taller, so they fill it and lose a little
 * off each side; `frame` moves or shrinks a gift's picture where that would cut something off.
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
export type HeroFrame = {
  /** Where the cover is held when it is wider than the screen: CSS object-position. The middle unless said. */
  position?: string;
  /** Under 1, the cover is drawn smaller than the screen's height and a soft copy of itself fills what is left above and below. */
  zoom?: number;
};

export function HeroFlatlay({
  slug,
  locale,
  art,
  preview,
  frame,
  width,
  up,
  down,
  sizes,
  className,
}: {
  slug: string;
  locale: GiftLocale;
  art: HeroFlatlayArt;
  /** The gift's looping preview film, if it has one. */
  preview?: string;
  frame?: HeroFrame;
  width: string;
  up: string;
  down: string;
  sizes: string;
  className?: string;
}) {
  const t = useTranslations("templates");
  const [live, setLive] = useState(false);
  const film = useRef<HTMLVideoElement>(null);

  // The film plays while the lying phone is on screen, and only for someone it suits. All of it is
  // done to the element itself: no state, so the first paint is the still cover on the server and here.
  useEffect(() => {
    const video = film.current;
    if (!video || !preview || live) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sparing = () => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const suits = () => !calm.matches && !sparing() && video.canPlayType("video/webm") !== "";
    const show = () => video.setAttribute("data-on", "");
    const hide = () => video.removeAttribute("data-on");
    video.addEventListener("playing", show);
    video.addEventListener("error", hide);
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && suits()) {
          if (!video.getAttribute("src")) video.src = preview;
          video.play().catch(hide);
        } else video.pause();
      },
      { threshold: 0.4 },
    );
    watcher.observe(video);
    const settle = () => {
      if (calm.matches) {
        video.pause();
        hide();
      }
    };
    calm.addEventListener("change", settle);
    return () => {
      watcher.disconnect();
      calm.removeEventListener("change", settle);
      video.removeEventListener("playing", show);
      video.removeEventListener("error", hide);
      video.pause();
    };
  }, [preview, live]);

  // How the 13:20 cover sits in the taller screen: filling it, held where `frame` says, or drawn a little smaller.
  const zoom = frame?.zoom ?? 1;
  const held: CSSProperties = zoom < 1 ? { objectFit: "cover", objectPosition: frame?.position ?? "50% 50%", inset: `${((1 - zoom) / 2) * 100}% 0`, height: `${zoom * 100}%` } : { objectFit: "cover", objectPosition: frame?.position ?? "50% 50%", inset: 0, height: "100%" };
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
            {zoom < 1 ? <img src={`/templates/${slug}/poster.jpg`} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover blur-xl" /> : null}
            <img src={`/templates/${slug}/poster.jpg`} alt="" className="absolute w-full" style={held} />
            {preview ? (
              // Over the still cover, unseen until it is really playing: no black frame, no flicker, and the cover where it can't play.
              <video ref={film} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} className="pointer-events-none absolute w-full opacity-0 transition-opacity duration-300 data-on:opacity-100" style={held} />
            ) : null}
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
