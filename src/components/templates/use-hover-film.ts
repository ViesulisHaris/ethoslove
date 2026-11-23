"use client";

import { useCallback, useEffect, useRef } from "react";
import { templateFilmStart } from "@/content/template-film-starts";

/**
 * A card's preview film that plays while a pointer rests on the card (the gallery's card, the front
 * page's strip). A film opens on things that are not the gift: a black frame, the demo page's own bar,
 * the dark "someone made this for you" cover (content/template-film-starts.ts). The hero of a gift page
 * already skips that opening; a card does the same: it starts at the gift's first screen, loops back
 * to it and not to 0, and the poster stays until the film is really playing past that point
 * (`data-on` on the video, which the card's class turns into opacity). The walk of 23 Nov 2026 saw
 * Pop-up Card's card turn black with the demo bar in it on hover (walk-front-3).
 *
 * `canPlay` says whether this pointer and this visitor want a film at all.
 */
export function useHoverFilm(slug: string, canPlay: () => boolean = () => true) {
  const ref = useRef<HTMLVideoElement>(null);
  const from = templateFilmStart(slug);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const show = () => {
      if (el.paused || el.seeking || el.currentTime < from || el.hasAttribute("data-on")) return;
      el.setAttribute("data-on", "");
    };
    const skip = () => {
      if (from > 0 && el.currentTime < from) el.currentTime = from;
    };
    // The browser's own loop would go back to the opening.
    const again = () => {
      el.currentTime = from;
      el.play().catch(() => el.removeAttribute("data-on"));
    };
    el.addEventListener("loadedmetadata", skip);
    el.addEventListener("playing", show);
    el.addEventListener("timeupdate", show);
    el.addEventListener("seeked", show);
    el.addEventListener("ended", again);
    return () => {
      el.removeEventListener("loadedmetadata", skip);
      el.removeEventListener("playing", show);
      el.removeEventListener("timeupdate", show);
      el.removeEventListener("seeked", show);
      el.removeEventListener("ended", again);
    };
  }, [from]);

  const play = useCallback(() => {
    const v = ref.current;
    if (!v || !canPlay()) return;
    // Before its metadata a video ignores a seek on some browsers; `loadedmetadata` above catches that.
    if (v.readyState >= 1) v.currentTime = from;
    v.play().catch(() => {});
  }, [from, canPlay]);

  const pause = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    v.pause();
    v.removeAttribute("data-on");
  }, []);

  return { ref, play, pause, loop: from === 0 };
}
