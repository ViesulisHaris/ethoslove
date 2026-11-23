"use client";

import { useEffect } from "react";

/** On <html> while a sheet or dialog with a backdrop is open (globals.css). */
const ATTR = "data-overlay-open";
let open = 0;
let leave = 0;

/**
 * Rendered inside a Radix sheet or dialog that has a backdrop. A modal Radix dialog sets
 * `pointer-events: none` on <body> while it is open, so nothing behind it can be pressed; it is an
 * inherited property, so the browser worked out the style of every element on the page again, once
 * to open and once to close (0.7 s on the front page on a slow phone, inside the press). The
 * backdrop already covers the page and takes every press beside the sheet, so while one is open the
 * body keeps its pointer events (globals.css, [data-overlay-open]) and the page is not restyled.
 *
 * Set before Radix's own effect (a child's effects run before its parent's), and taken away a turn
 * after the dialog is gone, once Radix has given the body back what it had.
 */
export function KeepPagePointer() {
  useEffect(() => {
    open += 1;
    window.clearTimeout(leave);
    document.documentElement.setAttribute(ATTR, "");
    return () => {
      open -= 1;
      window.clearTimeout(leave);
      leave = window.setTimeout(() => {
        if (open === 0) document.documentElement.removeAttribute(ATTR);
      }, 0);
    };
  }, []);
  return null;
}
