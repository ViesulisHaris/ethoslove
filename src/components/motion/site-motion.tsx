"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** A navigation that lands sooner than this shows no bar at all: a flash would be noise. */
const SHOW_AFTER = 140;
/** A navigation that never lands (cancelled, or a download) doesn't leave the bar up forever. */
const GIVE_UP_AFTER = 15_000;
const EASE_OUT_QUINT = "cubic-bezier(0.22, 1, 0.36, 1)";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The site's quiet motion, mounted once per layout:
 *
 * - a thin rose bar across the top while a navigation takes long enough to notice. Next 16 has no
 *   router events; src/instrumentation-client.ts re-broadcasts `onRouterTransitionStart` as
 *   `ethos:navigate`, and the new pathname arriving is the end;
 * - the new page's content fading up as it arrives (never on the first load, whose largest paint
 *   must not wait for an animation);
 * - lazy pictures fading in once loaded (CSS in globals.css, armed here);
 * - in-page links (#pick, a contents list) scrolling there smoothly instead of jumping.
 *
 * The bar and the page are moved with the Web Animations API, on transform and opacity: nothing
 * here is React state, and nothing re-renders.
 */
export function SiteMotion() {
  const pathname = usePathname();
  const bar = useRef<HTMLDivElement>(null);
  const progress = useRef<Progress | null>(null);
  const landed = useRef<string | null>(null);

  useEffect(() => {
    const el = bar.current;
    if (!el || typeof el.animate !== "function") return;
    const p = createProgress(el);
    progress.current = p;
    const onNavigate = (event: Event) => {
      const { url } = (event as CustomEvent<{ url: string }>).detail;
      // A new query or hash on the same page has nothing to wait for.
      if (new URL(url, window.location.href).pathname !== window.location.pathname) p.start();
    };
    window.addEventListener("ethos:navigate", onNavigate);
    return () => {
      window.removeEventListener("ethos:navigate", onNavigate);
      p.stop();
      progress.current = null;
    };
  }, []);

  // Before paint, so the new page is never seen whole and then made to fade.
  useLayoutEffect(() => {
    const first = landed.current === null;
    landed.current = pathname;
    if (first) return;
    progress.current?.done();
    riseIn();
  }, [pathname]);

  useEffect(() => armImageFades(), []);
  useEffect(() => smoothInPageLinks(), []);

  return <div ref={bar} aria-hidden="true" className="route-progress" />;
}

type Progress = { start: () => void; done: () => void; stop: () => void };

function createProgress(el: HTMLElement): Progress {
  let showing: Animation | null = null;
  let wait = 0;
  let giveUp = 0;

  const clear = () => {
    window.clearTimeout(wait);
    window.clearTimeout(giveUp);
  };
  const done = () => {
    clear();
    if (!showing) return;
    // From wherever it has crept to: across, then gone.
    const { transform, opacity } = getComputedStyle(el);
    showing.cancel();
    showing = null;
    el.animate(
      [
        { transform, opacity },
        { transform: "scaleX(1)", opacity: 1, offset: 0.45 },
        { transform: "scaleX(1)", opacity: 0 },
      ],
      { duration: 480, easing: EASE_OUT_QUINT },
    );
  };
  const start = () => {
    clear();
    giveUp = window.setTimeout(done, GIVE_UP_AFTER);
    if (showing) return;
    wait = window.setTimeout(() => {
      // Reduced motion: no crawl, just the bar, faded in.
      showing = reducedMotion()
        ? el.animate([{ transform: "scaleX(1)", opacity: 0 }, { transform: "scaleX(1)", opacity: 0.8 }], { duration: 200, fill: "forwards" })
        : // Quick to a third, then ever slower towards nine tenths, so it never claims to be done.
          el.animate([{ transform: "scaleX(0)", opacity: 1 }, { transform: "scaleX(0.92)", opacity: 1 }], { duration: 9000, easing: "cubic-bezier(0.05, 0.75, 0.1, 1)", fill: "forwards" });
    }, SHOW_AFTER);
  };
  const stop = () => {
    clear();
    showing?.cancel();
    showing = null;
  };
  return { start, done, stop };
}

function riseIn() {
  const main = document.getElementById("main");
  if (!main || typeof main.animate !== "function") return;
  const reduced = reducedMotion();
  // The fade is short and the rise long. Faded over 420ms, a wine page arriving from a paper one
  // (home to Games) spent its first frames as a grey wash over the paper; quick, it is only the
  // new page, settling the last few pixels into place.
  main.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 160 : 200, easing: EASE_OUT_QUINT });
  // A rise needs a transform, and while <main> has one, its fixed children (the Dates map, a
  // sheet) are placed against it instead of the screen. Pages that have any only fade.
  if (!reduced && !main.querySelector('[class*="fixed"]')) {
    main.animate([{ transform: "translateY(10px)" }, { transform: "none" }], { duration: 420, easing: EASE_OUT_QUINT });
  }
}

function armImageFades() {
  const root = document.documentElement;
  const loaded = (event: Event) => {
    if (event.target instanceof HTMLImageElement && !event.target.hasAttribute("data-img")) event.target.setAttribute("data-img", "in");
  };
  // Load and error don't bubble; capture sees them for every picture on the page.
  document.addEventListener("load", loaded, true);
  document.addEventListener("error", loaded, true);
  // What has arrived is simply there, and so is anything already on screen, which may be half
  // painted: hiding it now to fade it later would be the very flash this is here to prevent.
  const { innerHeight, innerWidth } = window;
  document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]').forEach((img) => {
    const box = img.getBoundingClientRect();
    const onScreen = box.bottom > 0 && box.top < innerHeight && box.right > 0 && box.left < innerWidth;
    if (img.complete || onScreen) img.setAttribute("data-img", "shown");
  });
  root.classList.add("img-fade-ready");
  return () => {
    document.removeEventListener("load", loaded, true);
    document.removeEventListener("error", loaded, true);
  };
}

function smoothInPageLinks() {
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const a = event.target instanceof Element ? event.target.closest("a") : null;
    if (!a || !a.hash || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    const here = window.location;
    // The skip link keeps the browser's own jump: it moves focus, which is its whole point.
    if (a.origin !== here.origin || a.pathname !== here.pathname || a.search !== here.search || a.hash === "#main") return;
    const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
    if (!target) return;
    // Captured before Next's <Link>, which would otherwise jump there itself.
    event.preventDefault();
    target.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
    if (here.hash !== a.hash) {
      const oldURL = here.href;
      window.history.pushState(window.history.state, "", a.hash);
      // A pushed hash fires no hashchange; anything listening (the date plan) is told by hand.
      window.dispatchEvent(new HashChangeEvent("hashchange", { oldURL, newURL: here.href }));
    }
  };
  window.addEventListener("click", onClick, true);
  return () => window.removeEventListener("click", onClick, true);
}
