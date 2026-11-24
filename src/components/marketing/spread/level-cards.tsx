"use client";

import { useEffect } from "react";

/**
 * Keeps a grid of picture cards level while one of them is open (sections.tsx, IdeaCards).
 *
 * Closed, the cards of a row are stretched to one height by the grid. A stretched row would pull
 * every card down beside an open one, so while a card is open the grid stops stretching: and then
 * each closed card fell back to the height of its own title. A card with a one-line title, in a
 * row of two-line ones, lost a line of height the moment its neighbour was opened: a card nobody
 * touched moved (the test of 23 Nov 2026: 388px to 363px on /digital-cards).
 *
 * So while a card is open, every card's closed face is held at the height its row has closed: the
 * tallest closed face of that row. It is set on the press that opens a card, before the card
 * opens, so no frame is drawn in between; again whenever a card opens or closes some other way (a
 * browser's find-in-page opens what it finds); and again when the grid's width changes. With no
 * card open nothing is set, and the grid's own stretch does the work.
 *
 * Under 640px the cards are one row, one to a screen, and nothing is held. Without script the
 * cards behave as they did: each closed card at its own height while one is open.
 */
export function LevelCards({ target }: { target: string }) {
  useEffect(() => {
    const list = document.getElementById(target);
    if (!list) return;
    const grid = window.matchMedia("(min-width: 640px)");
    const faces = () => [...list.querySelectorAll<HTMLElement>(":scope > li > details > summary")];
    const anyOpen = () => list.querySelector(":scope > li > details[open]") !== null;
    const release = () => {
      for (const face of faces()) face.style.minHeight = "";
    };
    const hold = () => {
      release();
      if (!grid.matches) return;
      // Every face is read before any is written: one layout, not one a card.
      const rows = new Map<number, HTMLElement[]>();
      for (const face of faces()) {
        const top = Math.round(face.getBoundingClientRect().top);
        rows.set(top, [...(rows.get(top) ?? []), face]);
      }
      const heights = [...rows.values()].map((row) => Math.max(...row.map((face) => face.getBoundingClientRect().height)));
      [...rows.values()].forEach((row, i) => {
        for (const face of row) face.style.minHeight = `${heights[i]}px`;
      });
    };
    const settle = () => (anyOpen() ? hold() : release());

    // The press that is about to open or close a card: its own face, not a link or the closed row inside it.
    const onPress = (event: MouseEvent) => {
      const face = (event.target as Element | null)?.closest("summary");
      if (face && face.parentElement?.parentElement?.parentElement === list) hold();
    };
    // `toggle` does not bubble: it is caught on its way down. A row inside a card toggles too, and changes nothing here.
    const onToggle = (event: Event) => {
      if ((event.target as Element | null)?.parentElement?.parentElement === list) settle();
    };
    let width = list.clientWidth;
    const resized = new ResizeObserver(() => {
      if (list.clientWidth === width) return;
      width = list.clientWidth;
      settle();
    });

    list.addEventListener("click", onPress, true);
    list.addEventListener("toggle", onToggle, true);
    grid.addEventListener("change", settle);
    resized.observe(list);
    // A page come back to, or opened by a link to a card, may arrive with one open.
    settle();
    return () => {
      list.removeEventListener("click", onPress, true);
      list.removeEventListener("toggle", onToggle, true);
      grid.removeEventListener("change", settle);
      resized.disconnect();
      release();
    };
  }, [target]);
  return null;
}
