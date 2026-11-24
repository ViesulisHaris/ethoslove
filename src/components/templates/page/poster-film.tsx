"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { posterFit } from "@/components/templates/poster-fit";

/**
 * A gift as a tall picture that moves: its poster, and over it the gift's own silent preview
 * (public/templates/<slug>/preview.webm), as the phone in a gift page's hero plays it
 * (./hero-flatlay.tsx, whose rules these are). The poster is what the server sends and what stays
 * wherever the film can't or shouldn't play: someone who asked for less motion or less data, a
 * connection the browser rates under 4g (a film is 0.4 to 2 MB), a browser without WebM. The film
 * is fetched only once its card is mostly on screen, starts past the recording's opening
 * (`from`, content/template-film-starts.ts), loops back to that point, and stops when the card
 * leaves the screen or `paused` says the visitor stopped the row: anything that moves for more
 * than five seconds has to be stoppable (WCAG 2.2.2), and the page that draws these gives one
 * button for all of them. `onMoving` tells that page a film is really running, so the button is
 * only there when it has something to stop.
 *
 * It fills its parent, which gives it its shape (a 4:5 card, as "More like this" crops a poster).
 */
export function PosterFilm({
  poster,
  film,
  from = 0,
  sizes,
  paused = false,
  eager = false,
  onMoving,
  className,
}: {
  poster: string;
  film?: string;
  from?: number;
  sizes: string;
  paused?: boolean;
  eager?: boolean;
  onMoving?: () => void;
  className?: string;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const moving = useRef(onMoving);
  useEffect(() => {
    moving.current = onMoving;
  }, [onMoving]);

  useEffect(() => {
    const el = video.current;
    if (!el || !film) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sparing = () => {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
      return connection?.saveData === true || (typeof connection?.effectiveType === "string" && connection.effectiveType !== "4g");
    };
    const suits = () => !paused && !calm.matches && !sparing() && el.canPlayType("video/webm") !== "";
    const hide = () => el.removeAttribute("data-on");
    // Seen only once it is really playing, and past the recording's opening: no black frame, no flicker.
    const show = () => {
      if (el.paused || el.seeking || el.currentTime < from || el.hasAttribute("data-on")) return;
      el.setAttribute("data-on", "");
      moving.current?.();
    };
    const skip = () => {
      if (from > 0 && el.currentTime < from) el.currentTime = from;
    };
    // A film that starts late can't use the browser's own loop, which would go back to the opening.
    const again = () => {
      el.currentTime = from;
      el.play().catch(hide);
    };
    el.addEventListener("loadedmetadata", skip);
    el.addEventListener("playing", show);
    el.addEventListener("timeupdate", show);
    el.addEventListener("ended", again);
    el.addEventListener("error", hide);
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && suits()) {
          if (!el.getAttribute("src")) el.src = film;
          el.play().catch(hide);
        } else el.pause();
      },
      { threshold: 0.6 },
    );
    // The frame, not the film: a film zoomed past its frame (poster-fit.ts) is never 60% inside it.
    watcher.observe(el.parentElement ?? el);
    const settle = () => {
      if (calm.matches) {
        el.pause();
        hide();
      }
    };
    calm.addEventListener("change", settle);
    return () => {
      watcher.disconnect();
      calm.removeEventListener("change", settle);
      el.removeEventListener("loadedmetadata", skip);
      el.removeEventListener("playing", show);
      el.removeEventListener("timeupdate", show);
      el.removeEventListener("ended", again);
      el.removeEventListener("error", hide);
      el.pause();
    };
  }, [film, from, paused]);

  return (
    <span data-poster-film className={cn("absolute inset-0 block", className)}>
      <Image src={poster} alt="" fill sizes={sizes} loading={eager ? "eager" : "lazy"} className={cn("object-cover object-[50%_32%]", posterFit(poster))} />
      {film ? (
        <video
          ref={video}
          muted
          loop={from === 0}
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          className={cn("pointer-events-none absolute inset-0 h-full w-full object-cover object-[50%_32%] opacity-0 transition-opacity duration-300 data-on:opacity-100", posterFit(poster))}
        />
      ) : null}
    </span>
  );
}
