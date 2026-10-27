"use client";

import { useId } from "react";
import type { Look } from "./looks";
import { BODY_PATH, wingPath } from "./sprites";
import type { Moon } from "./flight";

/** A bat as a still drawing: the same paths the canvas stamps, for the page, the cover and a photo's corner. */
export function BatSvg({ look, up = 0.4, className }: { look: Look; up?: number; className?: string }) {
  return (
    <svg viewBox="0 0 48 28" className={className} aria-hidden="true">
      <g fill={look.bat} stroke={look.rim} strokeWidth=".7" strokeLinejoin="round">
        <path d={wingPath(up)} />
        <path d={wingPath(up)} transform="translate(48 0) scale(-1 1)" />
        <path d={BODY_PATH} />
      </g>
    </svg>
  );
}

/** The moon, in the pixels the canvas uses, so the bats and the disc agree about where it is. */
export function MoonDisc({ moon, look }: { moon: Moon; look: Look }) {
  const id = useId().replace(/:/g, "");
  const d = moon.r * 2;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute" style={{ left: moon.cx - moon.r, top: moon.cy - moon.r, width: d, height: d }}>
      <div className="absolute rounded-full" style={{ inset: "-42%", background: `radial-gradient(circle, ${look.glow}55 0%, ${look.glow}22 40%, transparent 68%)` }} />
      <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle at 36% 30%, ${look.moon[0]} 0%, ${look.moon[0]} 36%, ${look.moon[1]} 100%)`, boxShadow: `0 0 ${d * 0.07}px ${look.glow}aa, inset ${-d * 0.05}px ${-d * 0.04}px ${d * 0.1}px rgba(40,20,60,.3)` }} />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-hidden rounded-full" style={{ mixBlendMode: "multiply" }}>
        <defs>
          <filter id={`${id}b`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="1.1" />
          </filter>
        </defs>
        <g filter={`url(#${id}b)`} fill="rgba(120,92,80,.36)">
          <ellipse cx="31" cy="35" rx="11" ry="9" />
          <ellipse cx="64" cy="27" rx="7" ry="6" />
          <ellipse cx="70" cy="60" rx="12" ry="10" />
          <ellipse cx="40" cy="71" rx="8" ry="6" />
          <ellipse cx="22" cy="58" rx="5" ry="4.5" />
          <ellipse cx="55" cy="47" rx="4" ry="3.6" />
        </g>
      </svg>
    </div>
  );
}

/** Two long clouds that cross the moon, dark against it, and never quite finish. */
export function Clouds({ look, moon }: { look: Look; moon: Moon }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0">
      {[0.62, 1.12].map((at, i) => (
        <div key={i} className="bs-cloud absolute" style={{ left: "-30%", width: "160%", top: moon.cy - moon.r + moon.r * at, height: moon.r * 0.24, background: `radial-gradient(50% 50% at 50% 50%, ${look.sky[0]}59, transparent 72%)`, filter: `blur(${moon.r * 0.07}px)`, animationDuration: `${46 + i * 14}s`, animationDirection: i ? "alternate-reverse" : "alternate" }} />
      ))}
    </div>
  );
}

/** Hills, a castle with two lit windows and a bare tree, in front of the sky and behind the swarm's exit. */
export function Skyline({ look }: { look: Look }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[6]">
      <div className="mx-auto" style={{ width: "calc(100 * var(--k))" }}>
        <svg viewBox="0 0 100 40" className="block w-full" fill={look.ground}>
          <path d="M0 34 C 8 31, 14 30, 22 31 S 38 27, 48 28 S 66 25, 76 26 S 94 29, 100 34 V40 H0 Z" />
          {/* the castle */}
          <path d="M62 30 V22 H64 V20 H66 V22 H68 V20 H70 V22 H72 V30 Z" />
          <path d="M72 30 V13 H83 V30 Z" />
          <path d="M70.6 13 L77.5 2 L84.4 13 Z" />
          <path d="M83 30 V19 H92 V30 Z" />
          <path d="M82 19 L87.5 9.5 L93 19 Z" />
          <path d="M92 30 V24 H98 V30 Z" />
          <rect x="76" y="17" width="1.8" height="3.2" rx=".9" fill="#ffd27a" className="bs-win" />
          <rect x="87" y="23" width="1.6" height="2.8" rx=".8" fill="#ffd27a" className="bs-win" style={{ animationDelay: "-1.3s" }} />
          {/* a bare tree, leaning in */}
          <path d="M13 34 C 13.5 28, 12.5 24, 11 19 M12.6 25 C 9.5 23, 7.5 21.5, 5.5 17 M12.4 22.5 C 15 20.5, 17 19.5, 19.5 15.5 M11.4 19.5 C 10 16.5, 9.5 14.5, 9.5 11.5 M12.2 24 C 15.5 24.2, 17.5 23.2, 20.5 21.5" fill="none" stroke={look.ground} strokeWidth=".95" strokeLinecap="round" />
          {/* stones */}
          <path d="M30 34 V30.8 a1.5 1.5 0 0 1 3 0 V34 Z M37 34 V31.8 a1.2 1.2 0 0 1 2.4 0 V34 Z M47 34 V31 a1.6 1.6 0 0 1 3.2 0 V34 Z" />
          <rect y="34" width="100" height="6" />
        </svg>
      </div>
      <div className="absolute bottom-0 left-0" style={{ right: "calc(50% + 50 * var(--k) - 1px)", height: "calc(6 * var(--k))", background: look.ground }} />
      <div className="absolute right-0 bottom-0" style={{ left: "calc(50% + 50 * var(--k) - 1px)", height: "calc(6 * var(--k))", background: look.ground }} />
    </div>
  );
}
