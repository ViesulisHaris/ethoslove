"use client";

import { useEffect } from "react";

/** What a set of cards was left at: the card that was open (-1 for none), how far its row was swiped, and the page's scroll. */
type Kept = { open: number; x: number; y: number };

/**
 * Brings a set of picture cards back as it was left (sections.tsx, IdeaCards). A visitor reads a
 * card, taps "Make this gift", looks at the editor and comes Back: the row was on its first card,
 * every card was closed and the page stood 380px lower, so the card they had been reading was gone
 * (the deep test of 23 Nov 2026, a Pixel 7 on /gifts/last-minute).
 *
 * What the set was left at is kept in the page's own entry in the browser's history: the open card,
 * the row's swipe and the page's scroll. It is written on the way out (a press on a link in the
 * cards), and as the visitor opens a card, swipes or scrolls (a moment after they stop). Coming
 * Back to that entry, or reloading it, puts the three back; a new visit to the page is a new entry
 * and starts closed, as before.
 * It counts nothing and sends nothing: it stays in this tab's history.
 *
 * Next's router keeps its own state in the same entry and carries a page's own beside it on Back
 * (next/dist/client/components/app-router.js: its internals are copied in, and a traverse keeps
 * the custom state).
 */
export function KeepCards({ target }: { target: string }) {
  useEffect(() => {
    const list = document.getElementById(target);
    if (!list) return;
    const key = `ethos:cards:${target}`;
    const cards = () => [...list.querySelectorAll<HTMLDetailsElement>(":scope > li > details")];
    const read = (): Kept | null => {
      try {
        const kept = (window.history.state as Record<string, unknown> | null)?.[key] as Kept | undefined;
        return kept && typeof kept.open === "number" ? kept : null;
      } catch {
        return null;
      }
    };
    const write = () => {
      const kept: Kept = { open: cards().findIndex((card) => card.open), x: Math.round(list.scrollLeft), y: Math.round(window.scrollY) };
      try {
        window.history.replaceState({ ...(window.history.state ?? {}), [key]: kept }, "");
      } catch {
        // A browser that refuses: the cards come back closed, as they did.
      }
    };

    const saved = read();
    if (saved) {
      const card = cards()[saved.open];
      if (card && !card.open) card.open = true;
      list.scrollLeft = saved.x;
      // After the opened card has its height: the page is where it was, with the card in view.
      requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - saved.y) > 2) window.scrollTo({ top: saved.y, behavior: "instant" });
      });
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const later = () => {
      clearTimeout(timer);
      timer = setTimeout(write, 200);
    };
    // A card of the set opening or closing (not the closed row inside one).
    const onToggle = (event: Event) => {
      if ((event.target as Element | null)?.parentElement?.parentElement === list) later();
    };
    // The way out: a press on a link in the cards is written at once, before the next page takes over the history.
    const onPress = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest("a")) write();
    };
    list.addEventListener("toggle", onToggle, true);
    list.addEventListener("scroll", later, { passive: true });
    list.addEventListener("click", onPress, true);
    window.addEventListener("scroll", later, { passive: true });
    return () => {
      window.removeEventListener("scroll", later);
      clearTimeout(timer);
      list.removeEventListener("toggle", onToggle, true);
      list.removeEventListener("scroll", later);
      list.removeEventListener("click", onPress, true);
    };
  }, [target]);
  return null;
}
