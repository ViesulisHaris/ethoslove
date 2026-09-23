"use client";

import { useEffect, useRef, type FocusEvent, type PointerEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ROOMS, type RoomKey } from "./rooms";

/** The pill's round ends are 18px wide; its middle piece is drawn 100px wide and scaled to fit. */
const CAP = 18;
const MIDDLE = 100;
const HERE = 'a[aria-current="page"]';

/**
 * The rooms, for a pointer: one rose pill that sits under the room you are in, glides to whichever
 * room is pointed at or focused, and glides back when the pointer leaves. Event handlers move it by
 * setting three custom properties (see .nav-lit in globals.css), so nothing re-renders on hover and
 * the browser animates only `translate` and `scale`.
 *
 * Before hydration the room you are in carries a rose background of its own, so the first paint
 * already says where you are; once the pill is under it, `data-armed` sends that background away.
 */
export function RoomNav({ current }: { current: RoomKey | null }) {
  const t = useTranslations("nav");
  const box = useRef<HTMLDivElement>(null);
  const pill = useRef<HTMLSpanElement>(null);

  // To the room you are in: at once on the first paint, gliding when you go to another room.
  useEffect(() => {
    const root = box.current;
    const lit = pill.current;
    if (!root || !lit) return;
    moveTo(lit, root.querySelector<HTMLElement>(HERE), !root.hasAttribute("data-armed"));
    root.setAttribute("data-armed", "");
    // Fonts arriving and the window crossing `xl` (which adds Pricing) change the rooms' widths.
    // The observer's first call is only it starting, and would cut the glide short.
    let started = false;
    const resized = new ResizeObserver(() => {
      if (started) moveTo(lit, root.querySelector<HTMLElement>("a[data-lit]") ?? root.querySelector<HTMLElement>(HERE), true);
      started = true;
    });
    resized.observe(root);
    return () => resized.disconnect();
  }, [current]);

  const toRoom = (event: PointerEvent<HTMLAnchorElement> | FocusEvent<HTMLAnchorElement>) => {
    // A tap on a tablet sends pointerenter too; only a mouse or a pen is pointing at a room.
    if ("pointerType" in event && event.pointerType === "touch") return;
    if (pill.current) moveTo(pill.current, event.currentTarget, false);
  };
  const toCurrent = () => {
    if (box.current && pill.current) moveTo(pill.current, box.current.querySelector<HTMLElement>(HERE), false);
  };

  return (
    <nav className="hidden lg:block" aria-label={t("mainLabel")}>
      <div
        ref={box}
        className="nav-rooms relative"
        onPointerLeave={toCurrent}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) toCurrent();
        }}
      >
        <span ref={pill} aria-hidden="true" className="nav-lit">
          <i />
          <i />
          <i />
        </span>
        <ul className="flex items-center">
          {ROOMS.map(({ href, key, wide }) => {
            const here = key === current;
            return (
              <li key={href} className={cn(wide && "hidden xl:block")}>
                <Link
                  href={href}
                  aria-current={here ? "page" : undefined}
                  onPointerEnter={toRoom}
                  onFocus={toRoom}
                  className={cn(
                    "relative inline-flex h-11 items-center rounded-full px-3.5 text-[14.5px] font-medium tracking-[-0.005em] whitespace-nowrap transition-colors duration-200",
                    here ? "text-rose-deep" : "text-forest/70 hover:text-forest focus-visible:text-forest",
                  )}
                >
                  {t(key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/** Slide the pill under `target`, or fade it out where it is when there is nothing to mark. */
function moveTo(lit: HTMLElement, target: HTMLElement | null, snap: boolean) {
  lit.parentElement?.querySelectorAll("a[data-lit]").forEach((a) => a.removeAttribute("data-lit"));
  if (!target || target.offsetWidth === 0) {
    lit.removeAttribute("data-on");
    return;
  }
  target.setAttribute("data-lit", "");
  // From nothing it fades in where it lands, rather than sliding over from where it last was.
  if (snap || !lit.hasAttribute("data-on")) lit.setAttribute("data-snap", "");
  // The link's offsetParent is the positioned box that holds the pill: same frame of reference.
  const x = target.offsetLeft;
  const w = target.offsetWidth;
  lit.style.setProperty("--x", `${x}px`);
  lit.style.setProperty("--w", `${w}px`);
  lit.style.setProperty("--sx", String(Math.max(0, w - 2 * CAP + 2) / MIDDLE));
  lit.setAttribute("data-on", "");
  if (lit.hasAttribute("data-snap")) {
    // Two frames: the jump has to be painted before the transitions come back on.
    requestAnimationFrame(() => requestAnimationFrame(() => lit.removeAttribute("data-snap")));
  }
}
