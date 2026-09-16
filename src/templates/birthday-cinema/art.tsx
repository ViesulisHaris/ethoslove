"use client";

/**
 * The house before the show: a lit marquee hung off the pelmet, two spotlight beams crossing the
 * velvet, and a gold ticket with their name printed on it. All of it sizes in --k, so the sign
 * still reads on a phone, on a laptop and in the 390 x 600 poster crop.
 */
import { useId } from "react";
import { POSTER_FONT } from "../_shared/cover-kit";

/** Bulbs per edge of the marquee. */
const BULBS = 13;

/** The ticket outline, with the two notches of the stub's perforation cut out of it. */
const TICKET =
  "M8 0 H178 A8 8 0 0 0 194 0 H252 A8 8 0 0 1 260 8 V96 A8 8 0 0 1 252 104 H194 A8 8 0 0 0 178 104 H8 A8 8 0 0 1 0 96 V8 A8 8 0 0 1 8 0 Z";

/* The bulbs chase in three groups and the beams drift; both stop for reduced motion. */
export const CINEMA_KEYFRAMES = `
.bc-bulb{animation:bc-chase 1.5s linear infinite}
@keyframes bc-chase{0%,32%{opacity:1}33%,100%{opacity:.2}}
.bc-beam{transform-origin:50% 0;animation:bc-sway 11s ease-in-out infinite alternate}
@keyframes bc-sway{from{rotate:-2.4deg}to{rotate:2.4deg}}
@media (prefers-reduced-motion: reduce){.bc-bulb,.bc-beam{animation:none}}
`;

/** The lit sign over the curtains. `hang` drops two chains up to the pelmet. */
export function Marquee({ text, compact = false, hang = false }: { text: string; compact?: boolean; hang?: boolean }) {
  const width = compact ? 70 : 80;
  const font = compact ? 2.9 : 3.5;
  const border = compact ? 0.9 : 1.2;
  return (
    <div className="relative" style={{ width: `calc(${width}*var(--k))` }} aria-hidden="true">
      {hang ? (
        <>
          <span className="absolute bottom-full left-[17%] h-[calc(7*var(--k))] w-[calc(.7*var(--k))]" style={{ background: "linear-gradient(180deg, rgba(255,214,150,.25), rgba(60,38,18,.9))" }} />
          <span className="absolute bottom-full right-[17%] h-[calc(7*var(--k))] w-[calc(.7*var(--k))]" style={{ background: "linear-gradient(180deg, rgba(255,214,150,.25), rgba(60,38,18,.9))" }} />
        </>
      ) : null}
      <span
        className="pointer-events-none absolute -inset-[calc(8*var(--k))] rounded-[50%]"
        style={{ background: "radial-gradient(closest-side, rgba(255,203,116,.5), rgba(255,180,90,0) 74%)" }}
      />
      <div
        className="relative text-center"
        style={{
          backgroundColor: "#F8E9C6",
          backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.72), rgba(212,175,112,.4))",
          border: `calc(${border}*var(--k)) solid #3A2817`,
          borderRadius: "calc(2.4*var(--k))",
          padding: `calc(${compact ? 2 : 3.2}*var(--k)) calc(5*var(--k))`,
          boxShadow: "0 calc(1.4*var(--k)) calc(3.6*var(--k)) rgba(0,0,0,.55), inset 0 0 0 calc(.5*var(--k)) #D8BC87",
        }}
      >
        <p
          className="text-balance uppercase [overflow-wrap:anywhere]"
          style={{ fontFamily: POSTER_FONT, fontSize: `calc(${font}*var(--k))`, letterSpacing: "0.06em", lineHeight: 1.16, color: "#38230F" }}
        >
          {text}
        </p>
      </div>
      {Array.from({ length: BULBS * 2 }, (_, i) => {
        const top = i < BULBS;
        const frac = ((i % BULBS) + 0.5) / BULBS;
        return (
          <span
            key={i}
            className="bc-bulb absolute rounded-full"
            style={{
              left: `${frac * 100}%`,
              ...(top ? { top: "calc(-1.1*var(--k))" } : { bottom: "calc(-1.1*var(--k))" }),
              width: "calc(1.8*var(--k))",
              height: "calc(1.8*var(--k))",
              marginLeft: "calc(-.9*var(--k))",
              backgroundColor: "#FFE7AC",
              boxShadow: "0 0 calc(1.8*var(--k)) calc(.5*var(--k)) rgba(255,196,92,.85)",
              animationDelay: `${(i % 3) * 0.5}s`,
            }}
          />
        );
      })}
    </div>
  );
}

/** A gold ADMIT ONE ticket with their name where the seat number would be. */
export function Ticket({ admit, forLabel, name, seat, stub }: { admit: string; forLabel: string; name: string; seat: string; stub: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <div className="relative w-full" style={{ aspectRatio: "260 / 104", filter: "drop-shadow(0 calc(1.2*var(--k)) calc(1.8*var(--k)) rgba(20,6,6,.55))" }}>
      <svg viewBox="0 0 260 104" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FBE3A8" />
            <stop offset=".34" stopColor="#E8C171" />
            <stop offset=".58" stopColor="#F5DB9C" />
            <stop offset="1" stopColor="#C89A45" />
          </linearGradient>
        </defs>
        <path d={TICKET} fill={`url(#${id}-gold)`} />
        <path d={TICKET} fill="none" stroke="rgba(88,54,12,.5)" strokeWidth="1.4" />
        <rect x="9" y="9" width="160" height="86" rx="4" fill="none" stroke="rgba(88,54,12,.34)" strokeWidth="1.1" />
        <path d="M186 13 V91" stroke="rgba(88,54,12,.55)" strokeWidth="1.4" strokeDasharray="3 5" strokeLinecap="round" />
        {/* the light catching the top edge */}
        <path d="M10 3 H176" stroke="#FFF6DC" strokeOpacity=".7" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <div className="absolute inset-y-0 left-0 flex w-[68.5%] flex-col items-center justify-center px-[5%] text-center" style={{ color: "#4A2E08" }}>
        <p className="text-[calc(1.9*var(--k))] leading-none font-semibold tracking-[0.34em] uppercase opacity-80" style={{ fontFamily: POSTER_FONT }}>
          {admit}
        </p>
        <span aria-hidden="true" className="my-[calc(1*var(--k))] h-px w-[46%]" style={{ background: "rgba(88,54,12,.4)" }} />
        <p className="text-[calc(1.7*var(--k))] leading-none tracking-[0.3em] uppercase opacity-70" style={{ fontFamily: POSTER_FONT }}>
          {forLabel}
        </p>
        <p className="mt-[calc(.4*var(--k))] line-clamp-2 text-[calc(5.6*var(--k))] leading-[1.05] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", color: "#3A2206" }}>
          {name}
        </p>
        <p className="mt-[calc(1*var(--k))] text-[calc(1.5*var(--k))] leading-none tracking-[0.22em] uppercase opacity-60">{seat}</p>
      </div>

      <div className="absolute inset-y-0 right-0 flex w-[28%] flex-col items-center justify-center gap-[calc(.6*var(--k))]" style={{ color: "#4A2E08" }}>
        <span className="text-[calc(5*var(--k))] leading-none opacity-75">★</span>
        <span className="text-[calc(1.6*var(--k))] leading-none tracking-[0.2em] uppercase opacity-70" style={{ fontFamily: POSTER_FONT }}>
          {stub}
        </span>
      </div>
    </div>
  );
}
