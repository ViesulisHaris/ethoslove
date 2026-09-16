"use client";

/**
 * The entrance to the gallery: a brass plaque engraved under the picture, and a velvet rope slung
 * between two posts across the front of it. Both size in --k, so the room holds together on a
 * phone, on a laptop and in the 390 x 600 poster crop.
 */
import { useId } from "react";
import { POSTER_FONT } from "../_shared/cover-kit";

/** Engraved brass: dark letters with a light edge under them, screwed to the wall. */
export function Plaque({ title, meta }: { title: string; meta?: string }) {
  return (
    <div
      className="relative px-[calc(5*var(--k))] py-[calc(2.1*var(--k))] text-center"
      style={{
        backgroundColor: "#C6A35B",
        backgroundImage: "linear-gradient(176deg, rgba(255,247,219,.9), rgba(198,163,91,.15) 42%, rgba(110,80,26,.38))",
        borderRadius: "calc(.6*var(--k))",
        boxShadow: "0 calc(.9*var(--k)) calc(2.2*var(--k)) rgba(40,26,10,.38), inset 0 0 0 1px rgba(255,241,205,.55)",
      }}
    >
      {[0, 1].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute top-1/2 size-[calc(1.1*var(--k))] -translate-y-1/2 rounded-full"
          style={{ ...(i ? { right: "calc(1.5*var(--k))" } : { left: "calc(1.5*var(--k))" }), background: "radial-gradient(circle at 35% 30%, #FBF0CE, #8A6A28)" }}
        />
      ))}
      <p
        className="text-[calc(2.4*var(--k))] leading-[1.25] tracking-[0.24em] text-balance uppercase [overflow-wrap:anywhere]"
        style={{ fontFamily: POSTER_FONT, color: "#38280E", textShadow: "0 1px 0 rgba(255,246,216,.6)" }}
      >
        {title}
      </p>
      {meta ? (
        <p className="mt-[calc(.8*var(--k))] text-[calc(1.6*var(--k))] leading-none tracking-[0.22em] uppercase" style={{ color: "#4A3714", opacity: 0.75 }}>
          {meta}
        </p>
      ) : null}
    </div>
  );
}

/** Two brass stanchions with a twisted velvet rope swagging between them. */
export function VelvetRope({ rope = "#8C2333", ropeLight = "#B9515C" }: { rope?: string; ropeLight?: string }) {
  const id = useId().replace(/:/g, "");
  const post = (x: number) => (
    <g key={x}>
      <ellipse cx={x} cy="106" rx="17" ry="5" fill="rgba(0,0,0,.28)" />
      <ellipse cx={x} cy="103" rx="15" ry="4.6" fill={`url(#${id}-brass)`} />
      <path d={`M${x - 4.2} 34 L${x - 3} 100 L${x + 3} 100 L${x + 4.2} 34 Z`} fill={`url(#${id}-brass)`} />
      <rect x={x - 5.6} y="40" width="11.2" height="3.4" rx="1.7" fill={`url(#${id}-brass)`} />
      <circle cx={x} cy="27" r="7.4" fill={`url(#${id}-brass)`} />
      <circle cx={x - 2.4} cy="24.6" r="2.4" fill="#FFF3D2" opacity=".65" />
    </g>
  );
  return (
    <svg viewBox="0 0 300 112" className="h-auto w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-brass`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8E6B24" />
          <stop offset=".3" stopColor="#E7CB84" />
          <stop offset=".55" stopColor="#C6A35B" />
          <stop offset="1" stopColor="#7C5B1C" />
        </linearGradient>
      </defs>
      {post(26)}
      {post(274)}
      {/* the rope: a shadow under it, the velvet, its twist and the light along the top */}
      <path d="M26 38 Q150 96 274 38" fill="none" stroke="rgba(0,0,0,.28)" strokeWidth="10" strokeLinecap="round" transform="translate(0 3)" />
      <path d="M26 38 Q150 96 274 38" fill="none" stroke={rope} strokeWidth="9.5" strokeLinecap="round" />
      <path d="M26 38 Q150 96 274 38" fill="none" stroke={ropeLight} strokeWidth="9.5" strokeLinecap="round" strokeDasharray="2.5 7" opacity=".55" />
      <path d="M26 36 Q150 93 274 36" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="26" cy="38" r="5.4" fill={`url(#${id}-brass)`} />
      <circle cx="274" cy="38" r="5.4" fill={`url(#${id}-brass)`} />
    </svg>
  );
}
