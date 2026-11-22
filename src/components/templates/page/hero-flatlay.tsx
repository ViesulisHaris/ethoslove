"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { GiftLocale } from "@/lib/gift/schema";
import { CutoutImg } from "@/components/marketing/home/cutouts";
import { TemplatePhonePreview } from "@/components/templates/template-phone-preview";
import { loadTemplate } from "@/templates/registry";

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
 * The covers and films are 13:20 and a phone's screen is far taller (about 6:13). They used to fill
 * it, which cut a seventh off each side: "No signal. No plans. Just stars." read "lo signal. No
 * plans. Just star" on Constellations, and a dozen gifts had words cut in half in the first and
 * largest picture of their page (the test of 21 Nov 2026). So the picture is drawn whole, at the
 * screen's width, and what is left of the screen above and below it is a soft copy of the same
 * picture: of the cover while it is still, and of the film's own frame while it plays, so the
 * wash keeps the film's colours when the scene changes. Nothing of a gift is ever cut.
 *
 * A tap plays the gift, and to play it the phone is picked up: the live gift comes up over the
 * lying phone, upright, and the table goes soft behind it. The keyboard's focus goes up with it,
 * and a close button, Escape (wherever the focus is by then) or a tap on the page beside it puts
 * the phone down again and hands the focus back to the button that lifted it. While it is up the
 * page says a gift is running, as the editor's preview does, so the consent strip and the help
 * button leave the foot of the screen to the gift. A gift whose code can't be fetched (no
 * connection, or a page older than the last deploy) puts the phone back down by itself. It is
 * never taller than the screen has room for, and the page moves to show all of it. Upright
 * because a rendered phone can't be stood up, and a gift is played with a finger: 24 of the 61
 * templates read where the finger
 * is (a scratch card, a frosted window, a cork to pull), and a template works that out from an
 * upright box, so on a screen turned 14 degrees the scratch would land beside the finger. One
 * way for every gift, so nobody learns two.
 *
 * `width` is how wide the lying screen is drawn, as CSS; `up` and `down` how much room the page
 * keeps above and below the screen's middle, in screen widths. The picture itself is far larger
 * than that box and spills past it on every side: the page decides how much of that spill may
 * meet anything (on a phone it keeps nearly all of it clear; on a desk the leaves run into the
 * section's own padding). `sizes` is how wide the picture is drawn, for the browser's choice of
 * file: a CSS variable can't say it. On a phone the page gives a far smaller number than the truth,
 * on purpose. The picture is drawn 758px wide there, twice the screen, so a phone with three
 * device pixels to a pixel asked for 2,223 and was sent the full-size picture and rim, 250 KB,
 * before anything else on the page, where the art's half-size files (100 KB the pair) are the
 * ones made for a phone (DESIGN-LESS-TEXT.md, "a 1× version for phones"; the confirming test of
 * 22 Nov 2026). The render is soft-lit and loses a little of a leaf's veins at that size, and
 * nothing of the phone's shape; the gift's cover in the screen is not part of it and stays sharp.
 */
export type HeroFrame = {
  /** The second the film starts from, and loops back to: past the demo page's own bar, which most recordings open on (content/template-film-starts.ts). */
  from?: number;
};

/** The shape every cover and film is recorded in: 13 across, 20 down (public/templates/<slug>/poster.jpg and preview.webm; tests/unit/template-film-starts.test.ts measures them). */
export const COVER_SHAPE = [13, 20] as const;
const COVER_RATIO = `${COVER_SHAPE[0]} / ${COVER_SHAPE[1]}`;

/** A finger's tap beside the picked-up phone: it lifts where it came down, give or take this many pixels, within this many milliseconds. */
const TAP_SLOP = 10;
const TAP_MS = 600;

/** How often the wash behind the film is redrawn from it, in milliseconds: a soft blur needs no more. */
const WASH_EVERY = 200;

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
  const wash = useRef<HTMLCanvasElement>(null);
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

  // The picked-up phone comes up round the lying one's middle, which on a short screen or a phone
  // is partly off it: the foot of a gift, where most keep their first button, was under the fold,
  // and scrolled down, the close button sat level with the header (the test of 21 Nov 2026). So
  // the page moves just far enough to show the whole phone under the header, and not at all when
  // it is already in view. Worked out from where it ends up, not from its box while it turns.
  useEffect(() => {
    const phone = upright.current;
    const ground = phone?.offsetParent;
    if (!live || !phone || !ground) return;
    const header = parseFloat(getComputedStyle(phone).getPropertyValue("--header-h")) || 0;
    // Under the header, with the close button that sits half above the phone's corner; a finger's width at the foot.
    const head = header + 28;
    const foot = 16;
    const middle = ground.getBoundingClientRect().top + phone.offsetTop;
    const top = middle - phone.offsetHeight / 2;
    const bottom = middle + phone.offsetHeight / 2;
    const fits = phone.offsetHeight + head + foot <= window.innerHeight;
    const by = top < head || !fits ? top - head : bottom > window.innerHeight - foot ? bottom - (window.innerHeight - foot) : 0;
    if (Math.abs(by) > 1) window.scrollBy({ top: by, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [live]);

  // A gift running: the consent strip and the help button are fixed to the foot of the screen,
  // which is where gifts keep their first controls, and stand down for `data-gift-running` on
  // <html> (components/shared/cookie-consent.tsx), as they do for the editor's preview. Without
  // it every new visitor, who has not answered the strip yet, had it lying over the lower quarter
  // of the picked-up phone (the deep test of 21 Nov 2026).
  useEffect(() => {
    if (!live) return;
    document.documentElement.dataset.giftRunning = "true";
    return () => {
      delete document.documentElement.dataset.giftRunning;
    };
  }, [live]);

  // The gift's code is fetched when the phone is picked up. Where it can't be (no connection, or a
  // page older than the last deploy, whose files have new names) the renderer has only a black
  // screen with a developer's line to show, so the phone goes back down: the cover and "Try the
  // live demo" are the right thing to see, and the next tap tries again.
  useEffect(() => {
    if (!live) return;
    let on = true;
    loadTemplate(slug).then(
      (found) => on && !found && setLive(false),
      () => on && setLive(false),
    );
    return () => {
      on = false;
    };
  }, [live, slug]);

  // A tap on the page beside the picked-up phone puts it down, as a tap beside anything that has
  // come up over a page does. A click, not a press: a finger that drags the page to see the
  // gift's foot must not close it. Not the header's, and not one inside the gift whose target the
  // gift took away as it handled it.
  // An iPhone makes a click out of a tap only on something it takes for clickable; a tap on the
  // page's ground gives pointer events and no click (the deep test of 21 Nov 2026: the phone
  // stayed up on every WebKit run). So a finger is followed by its own events: down and up beside
  // the phone, in the same place and without a pause, is a tap. A drag scrolls and a long press
  // selects, and neither closes.
  // Escape closes from anywhere: a gift that takes away the button just pressed leaves the
  // keyboard's focus on the page's body, outside the phone, where a handler on the phone never heard it.
  useEffect(() => {
    if (!live) return;
    const beside = (at: EventTarget | null) => at instanceof Element && at.isConnected && !upright.current?.contains(at) && !play.current?.contains(at) && at.closest("[data-page-theme]") !== null;
    const away = (event: MouseEvent) => {
      if (beside(event.target)) setLive(false);
    };
    let pressed: { x: number; y: number; at: number } | null = null;
    const press = (event: PointerEvent) => {
      pressed = event.pointerType === "touch" && event.isPrimary && beside(event.target) ? { x: event.clientX, y: event.clientY, at: event.timeStamp } : null;
    };
    const release = (event: PointerEvent) => {
      const from = pressed;
      pressed = null;
      if (!from || event.pointerType !== "touch" || !beside(event.target)) return;
      if (Math.hypot(event.clientX - from.x, event.clientY - from.y) <= TAP_SLOP && event.timeStamp - from.at <= TAP_MS) setLive(false);
    };
    const cancel = () => {
      pressed = null;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLive(false);
    };
    document.addEventListener("click", away);
    document.addEventListener("pointerdown", press);
    document.addEventListener("pointerup", release);
    document.addEventListener("pointercancel", cancel);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", away);
      document.removeEventListener("pointerdown", press);
      document.removeEventListener("pointerup", release);
      document.removeEventListener("pointercancel", cancel);
      document.removeEventListener("keydown", escape);
    };
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
    // The soft copy behind the film: its own frame, drawn small a few times a second, with the
    // frame turned over above it and below it as the cover's copies are. Only ever drawn, never
    // read back, and left as it is when the film is stopped, so it matches the frame.
    const canvas = wash.current;
    const paint = () => {
      if (!canvas || !canvas.clientHeight || video.paused || video.readyState < 2 || video.currentTime < from) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const [across, down] = COVER_SHAPE;
      // The frame's height as a share of the screen's, in the canvas's own rows.
      const tall = (canvas.height * canvas.clientWidth * down) / across / canvas.clientHeight;
      const top = (canvas.height - tall) / 2;
      try {
        for (const edge of [top, top + tall]) {
          ctx.setTransform(1, 0, 0, -1, 0, 2 * edge);
          ctx.drawImage(video, 0, top, canvas.width, tall);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(video, 0, top, canvas.width, tall);
        canvas.setAttribute("data-on", "");
      } catch {
        // A browser that will not draw a film to a canvas keeps the cover's soft copy.
      }
    };
    const painting = window.setInterval(paint, WASH_EVERY);
    const hide = () => {
      video.removeAttribute("data-on");
      canvas?.removeAttribute("data-on");
      setFilmState("off");
    };
    // Seen only once it is really playing, and past the recording's opening.
    const show = () => {
      if (video.paused || video.seeking || video.currentTime < from || video.hasAttribute("data-on")) return;
      paint();
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
      window.clearInterval(painting);
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

  // The picture in the screen's middle, and the same picture turned over above it and below it: a
  // reflection carries on from the picture's own edge, so the soft copy never changes colour there.
  const copy = "absolute top-1/2 left-0 block w-full";
  const picture = `calc(${width} * ${art.perWidth})`;
  // The picked-up phone: a little larger than the lying one, but never taller than the screen has
  // room for under the header (a frame is 390:844, so its width is 0.462 of its height), and never
  // so small that a gift can't be played in it: a phone on its side scrolls instead.
  const lifted = `max(12.5rem, min(calc(${width} * 1.14), calc((var(--lift-vh, 100vh) - var(--header-h, 4.25rem) - 2.75rem) * 0.462)))`;
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
            {/* The soft copy that fills the taller screen: blurred as one piece, and larger than the screen, so its faded rim is never seen. */}
            <span data-soft aria-hidden="true" className="pointer-events-none absolute inset-0 block scale-125 blur-lg">
              {["-150%", "50%", "-50%"].map((shift) => (
                <img key={shift} src={`/templates/${slug}/poster.jpg`} alt="" className={copy} style={{ aspectRatio: COVER_RATIO, transform: `translateY(${shift})${shift === "-50%" ? "" : " scaleY(-1)"}` }} />
              ))}
              {preview ? <canvas ref={wash} width={26} height={56} className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-300 data-on:opacity-100" /> : null}
            </span>
            {/*
             * The picture itself, whole: as wide as the screen, in the shape it was recorded in, in the
             * screen's middle. Its top and bottom edges fade into the soft copy, so no line is drawn
             * across the phone where one ends and the other begins.
             */}
            <span data-cover className={cn("hero-cover", copy, "-translate-y-1/2")} style={{ aspectRatio: COVER_RATIO }}>
              <img src={`/templates/${slug}/poster.jpg`} alt="" className="absolute inset-0 h-full w-full object-contain" />
              {preview ? (
                // Over the still cover, unseen until it is really playing: no black frame, no flicker, and the cover where it can't play.
                <video ref={film} muted loop={from === 0} playsInline preload="none" aria-hidden="true" tabIndex={-1} className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-0 transition-opacity duration-300 data-on:opacity-100" />
              ) : null}
            </span>
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
          className="hero-lift absolute left-1/2 z-10 outline-none"
          style={{ top: `calc(${width} * ${up})`, "--lift-turn": `${art.turn}deg` } as CSSProperties}
        >
          <TemplatePhonePreview slug={slug} locale={locale} autoStart width={lifted} />
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
