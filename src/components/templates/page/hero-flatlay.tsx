"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, X } from "lucide-react";
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
 * motion or less data, on a connection the browser calls slower than 4g (a film is 0.4 to 2 MB),
 * or on a browser that can't play it: the still cover is the whole of it. Once it plays, a small
 * button beside the phone stops it and starts it again: it loops for as long as it is on screen,
 * and anything that moves for more than five seconds has to be stoppable (WCAG 2.2.2).
 * Most of the recordings open on the demo page's own bar for a second or so; the film starts past
 * it (`frame.from`) and comes back to the same point, so the bar is never in the phone.
 * The covers and films are 13:20 and a phone's screen is taller, so they fill it and lose a little
 * off each side; `frame` moves or shrinks a gift's picture where that would cut something off.
 *
 * A tap plays the gift, and to play it the phone is picked up: the live gift comes up over the
 * lying phone, upright, and the table goes soft behind it. The keyboard's focus goes up with it,
 * and a close button or Escape puts the phone down again and hands the focus back to the button
 * that lifted it. Upright because a rendered phone can't
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
  /** The second the film starts from, and loops back to: past the demo page's own bar, which most recordings open on (content/template-film-starts.ts). */
  from?: number;
};

export function HeroFlatlay({
  slug,
  name,
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
  /** The gift's name, for the label of its live demo. */
  name: string;
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
  /** The film as its pause button needs to know it: not showing, running, or stopped by the visitor. */
  const [filmState, setFilmState] = useState<"off" | "playing" | "paused">("off");
  const film = useRef<HTMLVideoElement>(null);
  const play = useRef<HTMLButtonElement>(null);
  const upright = useRef<HTMLDivElement>(null);
  /** The visitor stopped the film: scrolling it back on screen must not start it again. */
  const stopped = useRef(false);
  const wasLive = useRef(false);
  const from = frame?.from ?? 0;

  // Picking the phone up takes the keyboard's focus with it, and putting it down hands it back to
  // the button that lifted it. That button used to be disabled once pressed, which dropped the
  // focus on the page's body with the gift open and nothing to close it.
  useEffect(() => {
    if (live) upright.current?.focus({ preventScroll: true });
    else if (wasLive.current) play.current?.focus({ preventScroll: true });
    wasLive.current = live;
  }, [live]);

  // The film plays while the lying phone is on screen, and only for someone it suits. All of it is
  // done to the element itself: no state, so the first paint is the still cover on the server and here.
  useEffect(() => {
    const video = film.current;
    if (!video || !preview || live) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    // Less data asked for, or a connection the browser itself rates under 4g (Chromium says; Safari and Firefox don't).
    const sparing = () => {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
      return connection?.saveData === true || (typeof connection?.effectiveType === "string" && connection.effectiveType !== "4g");
    };
    const suits = () => !calm.matches && !sparing() && video.canPlayType("video/webm") !== "";
    const hide = () => {
      video.removeAttribute("data-on");
      setFilmState("off");
    };
    // Seen only once it is really playing, and past the recording's opening.
    const show = () => {
      if (video.paused || video.seeking || video.currentTime < from || video.hasAttribute("data-on")) return;
      video.setAttribute("data-on", "");
      setFilmState("playing");
    };
    const skip = () => {
      if (from > 0 && video.currentTime < from) video.currentTime = from;
    };
    // A film that starts late can't use the browser's own loop, which would go back to the bar.
    const again = () => {
      video.currentTime = from;
      video.play().catch(hide);
    };
    video.addEventListener("loadedmetadata", skip);
    video.addEventListener("playing", show);
    video.addEventListener("timeupdate", show);
    video.addEventListener("ended", again);
    video.addEventListener("error", hide);
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && suits() && !stopped.current) {
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
      video.removeEventListener("loadedmetadata", skip);
      video.removeEventListener("playing", show);
      video.removeEventListener("timeupdate", show);
      video.removeEventListener("ended", again);
      video.removeEventListener("error", hide);
      video.pause();
    };
  }, [preview, live, from]);

  // By what the visitor last asked for, not by whether the film is running this instant: scrolled
  // half off the screen it is paused already, and a press meant to stop it would have started it.
  const toggleFilm = () => {
    const video = film.current;
    if (!video) return;
    if (stopped.current) {
      stopped.current = false;
      setFilmState("playing");
      video.play().catch(() => {
        stopped.current = true;
        setFilmState("paused");
      });
    } else {
      stopped.current = true;
      video.pause();
      setFilmState("paused");
    }
  };

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
        {/* While the gift is up, the lying phone is only a picture: out of the tab order and unseen by a screen reader. */}
        <div className={cn("absolute overflow-hidden bg-night", settle)} style={art.screen} inert={live}>
          {/*
           * The cover until they tap, so the phone never lies there black. The button fills the screen,
           * which cuts off anything drawn outside it, a focus ring included: the keyboard's ring is
           * drawn round the play disc instead, dark then light, so it shows on any cover.
           */}
          <button ref={play} type="button" data-play onClick={() => setLive(true)} aria-label={t("tryDemo")} className="group relative block h-full w-full text-paper focus-visible:outline-none">
            {zoom < 1 ? <img src={`/templates/${slug}/poster.jpg`} alt="" className="absolute inset-0 h-full w-full scale-125 object-cover blur-xl" /> : null}
            <img src={`/templates/${slug}/poster.jpg`} alt="" className="absolute w-full" style={held} />
            {preview ? (
              // Over the still cover, unseen until it is really playing: no black frame, no flicker, and the cover where it can't play.
              <video ref={film} muted loop={from === 0} playsInline preload="none" aria-hidden="true" tabIndex={-1} className="pointer-events-none absolute w-full opacity-0 transition-opacity duration-300 data-on:opacity-100" style={held} />
            ) : null}
            {live ? null : (
              <>
                <span className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/10" />
                <span className="relative flex h-full flex-col items-center justify-center gap-3">
                  <span data-play-disc className="grid size-14 place-items-center rounded-full bg-cream text-forest shadow-[0_14px_40px_-14px_rgba(0,0,0,0.7)] transition-transform group-hover:scale-105 group-focus-visible:shadow-[0_0_0_3px_rgba(24,14,10,0.8),0_0_0_6px_#fffaf5]">
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
      {filmState !== "off" && !live ? (
        // Beside the phone's foot, clear of its screen: the one thing on the page that moves by itself can be stopped.
        <button
          type="button"
          data-film-toggle
          onClick={toggleFilm}
          aria-label={t(filmState === "playing" ? "pausePreview" : "playPreview")}
          className="group/film absolute -right-5 bottom-[4%] z-10 grid size-11 place-items-center rounded-full"
        >
          <span className="grid size-8 place-items-center rounded-full border border-page-line bg-page-raised/90 text-page-ink shadow-page-card backdrop-blur-sm transition-[background-color,scale] duration-200 group-hover/film:bg-page-raised group-active/film:scale-95">
            {filmState === "playing" ? <Pause aria-hidden="true" className="size-3.5 fill-current" strokeWidth={0} /> : <Play aria-hidden="true" className="ml-px size-3.5 fill-current" strokeWidth={0} />}
          </span>
        </button>
      ) : null}
      {live ? (
        // Picked up: the live gift, upright, over where the phone lay. It starts at the lying phone's own turn.
        <div
          ref={upright}
          data-upright
          role="group"
          aria-label={t("liveDemo", { name })}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLive(false);
          }}
          className="hero-lift absolute left-1/2 z-10 outline-none"
          style={{ top: `calc(${width} * ${up})`, "--lift-turn": `${art.turn}deg` } as CSSProperties}
        >
          <TemplatePhonePreview slug={slug} locale={locale} autoStart width={`calc(${width} * 1.14)`} />
          {/* On the phone's top corner, half off it: clear of the gift's own controls, which keep inside the screen. */}
          <button type="button" data-close-demo onClick={() => setLive(false)} aria-label={t("closeDemo")} className="group/close absolute -top-4 -right-4 z-10 grid size-11 place-items-center rounded-full">
            <span className="grid size-9 place-items-center rounded-full border border-page-line bg-page-raised text-page-ink shadow-page-lift transition-[background-color,scale] duration-200 group-hover/close:bg-page-ground group-active/close:scale-95">
              <X aria-hidden="true" className="size-4" strokeWidth={1.8} />
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
