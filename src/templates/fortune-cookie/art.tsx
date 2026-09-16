"use client";

/**
 * The table the cookies are served on: a lacquer tray with a gold rim, two paper lanterns hanging
 * over it, the takeout box with their name brushed on the flap, a coin or two for luck and blossom
 * sprigs at the edges. The tray keeps the same box the cookies were always laid out in (percentages
 * of a 1 / 1.05 frame), so every cookie stays exactly where it was.
 */
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PAPER_GRAIN } from "../_shared/cover-kit";

export const TRAY_KEYFRAMES = `
.fc-sway{transform-origin:50% 0;animation:fc-sway 6.6s ease-in-out infinite alternate}
@keyframes fc-sway{from{rotate:-3.2deg}to{rotate:3.2deg}}
.fc-sway-b .fc-sway{animation-duration:8s;animation-delay:-2.4s}
.fc-shine{animation:fc-shine 9s ease-in-out infinite}
@keyframes fc-shine{0%,60%{opacity:.18}80%{opacity:.4}100%{opacity:.18}}
@media (prefers-reduced-motion: reduce){.fc-sway,.fc-shine{animation:none}}
`;

export type TrayColors = { lacquer: string; deep: string; gold: string };

/** A corner flourish, blocked into the rim in gold. */
function Corner({ gold, className }: { gold: string; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("absolute", className)} aria-hidden="true">
      <g fill="none" stroke={gold} strokeWidth="1.6" strokeLinecap="round" opacity="0.75">
        <path d="M4 20 C4 11 11 4 20 4" />
        <path d="M4 30 C4 16 16 4 30 4" opacity=".55" />
        <circle cx="10" cy="10" r="1.8" fill={gold} stroke="none" />
      </g>
    </svg>
  );
}

/** The tray: lacquer, a gold rim, a recessed bed for the cookies and a slow shine across it. */
export function Tray({ colors, children }: { colors: TrayColors; children: ReactNode }) {
  const { lacquer, deep, gold } = colors;
  return (
    <div className="relative w-full" style={{ aspectRatio: "1 / 1.05" }}>
      <div
        className="absolute inset-0 overflow-hidden rounded-[calc(4*var(--k))]"
        style={{
          backgroundColor: lacquer,
          backgroundImage: "linear-gradient(154deg, rgba(255,255,255,.18), transparent 44%), radial-gradient(72% 48% at 28% 16%, rgba(255,255,255,.14), transparent 72%)",
          boxShadow: `inset 0 0 0 calc(.45*var(--k)) ${gold}, inset 0 0 0 calc(1.5*var(--k)) ${deep}, inset 0 0 0 calc(1.85*var(--k)) ${gold}, inset 0 calc(.8*var(--k)) calc(2.6*var(--k)) rgba(255,255,255,.1), 0 calc(3*var(--k)) calc(6.5*var(--k)) rgba(30,6,6,.45)`,
        }}
      >
        <span aria-hidden="true" className="fc-shine absolute inset-y-[-30%] left-[-10%] w-[36%] rotate-[16deg]" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,.5), transparent)" }} />
      </div>

      {/* the bed the cookies sit in */}
      <div
        className="absolute inset-[6.5%] rounded-[calc(2.4*var(--k))]"
        style={{
          backgroundColor: deep,
          backgroundImage: PAPER_GRAIN,
          boxShadow: `inset 0 calc(.7*var(--k)) calc(2.6*var(--k)) rgba(0,0,0,.5), inset 0 0 0 1px ${gold}`,
        }}
      />

      <Corner gold={gold} className="top-[2.5%] left-[2.5%] w-[13%]" />
      <Corner gold={gold} className="top-[2.5%] right-[2.5%] w-[13%] -scale-x-100" />
      <Corner gold={gold} className="bottom-[2.5%] left-[2.5%] w-[13%] -scale-y-100" />
      <Corner gold={gold} className="right-[2.5%] bottom-[2.5%] w-[13%] -scale-100" />

      {children}
    </div>
  );
}

/** A paper lantern on its cord, swaying over the table. */
export function Lantern({ paper, deep, gold, className, style }: { paper: string; deep: string; gold: string; className?: string; style?: CSSProperties }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute", className)} style={{ aspectRatio: "56 / 128", ...style }}>
      <div className="fc-sway h-full w-full">
        <svg viewBox="0 0 56 128" className="h-full w-full">
          <defs>
            <radialGradient id="fc-lan" cx="36%" cy="32%">
              <stop offset="0" stopColor={paper} stopOpacity="1" />
              <stop offset="0.7" stopColor={paper} stopOpacity="0.92" />
              <stop offset="1" stopColor={deep} stopOpacity="0.95" />
            </radialGradient>
          </defs>
          <path d="M28 0 V20" stroke={gold} strokeWidth="1.6" />
          <rect x="17" y="19" width="22" height="6" rx="2.4" fill={gold} />
          <ellipse cx="28" cy="58" rx="25" ry="33" fill="url(#fc-lan)" />
          <g fill="none" stroke={deep} strokeWidth="1.1" opacity=".35">
            <path d="M28 25 C10 36 10 80 28 91" />
            <path d="M28 25 C19 36 19 80 28 91" />
            <path d="M28 25 C37 36 37 80 28 91" />
            <path d="M28 25 C46 36 46 80 28 91" />
          </g>
          <ellipse cx="20" cy="44" rx="6" ry="9" fill="#FFFFFF" opacity=".22" />
          <rect x="17" y="89" width="22" height="6" rx="2.4" fill={gold} />
          <path d="M28 95 V101" stroke={gold} strokeWidth="1.6" />
          <circle cx="28" cy="103.5" r="3" fill={gold} />
          <g stroke={gold} strokeWidth="1.1" strokeLinecap="round" opacity=".85">
            <path d="M24.5 106 L23 118" />
            <path d="M28 106 L28 121" />
            <path d="M31.5 106 L33 118" />
          </g>
        </svg>
      </div>
    </div>
  );
}

/** The takeout box, folded shut, with their name brushed across the flap. */
export function TakeoutBox({ name, forLabel, ink, className }: { name: string; forLabel: string; ink: string; className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute", className)} style={{ aspectRatio: "100 / 116" }} aria-hidden="true">
      <svg viewBox="0 0 100 116" className="h-full w-full" style={{ filter: "drop-shadow(0 calc(1.2*var(--k)) calc(2*var(--k)) rgba(40,6,6,.4))" }}>
        <defs>
          <linearGradient id="fc-box" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#F3E7D2" />
            <stop offset="0.45" stopColor="#FFFBF2" />
            <stop offset="1" stopColor="#E7D8BE" />
          </linearGradient>
        </defs>
        {/* the wire handle */}
        <path d="M30 22 C34 2 66 2 70 22" fill="none" stroke="#7A6248" strokeWidth="2.6" strokeLinecap="round" />
        {/* body */}
        <path d="M14 48 L86 48 L77 112 L23 112 Z" fill="url(#fc-box)" stroke="rgba(90,60,40,.3)" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M29 48 L32 112 M71 48 L68 112" stroke="rgba(90,60,40,.14)" strokeWidth="1.1" />
        <path d="M20 58 L80 58 L78.5 65 L21.5 65 Z" fill="#C0392B" opacity=".75" />
        {/* the flap, folded over the top, with its notch */}
        <path d="M11 20 L89 20 L86 52 L14 52 Z" fill="#FFFAF0" stroke="rgba(90,60,40,.32)" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M43 20 L50 29 L57 20" fill="none" stroke="rgba(90,60,40,.34)" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
      <p
        className="absolute inset-x-[12%] top-[21%] text-center text-[calc(3.1*var(--k))] leading-[1.02] [overflow-wrap:anywhere]"
        style={{ fontFamily: "var(--gift-font-hand)", color: ink }}
      >
        {forLabel} {name}
      </p>
    </div>
  );
}

/** A coin, for luck. */
export function Coin({ gold, className }: { gold: string; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute", className)} style={{ aspectRatio: "1 / 1" }}>
      <svg viewBox="0 0 40 40" className="h-full w-full" style={{ filter: "drop-shadow(0 calc(.6*var(--k)) calc(1*var(--k)) rgba(40,6,6,.45))" }}>
        <defs>
          <radialGradient id="fc-coin" cx="36%" cy="30%">
            <stop offset="0" stopColor="#FFF0BE" />
            <stop offset="0.55" stopColor={gold} />
            <stop offset="1" stopColor="#9A6B18" />
          </radialGradient>
        </defs>
        <circle cx="20" cy="20" r="18" fill="url(#fc-coin)" />
        <circle cx="20" cy="20" r="18" fill="none" stroke="#7E5512" strokeWidth="1.1" opacity=".6" />
        <circle cx="20" cy="20" r="14" fill="none" stroke="#7E5512" strokeWidth="0.9" opacity=".45" />
        <rect x="15" y="15" width="10" height="10" rx="1.4" fill="#7E5512" opacity=".55" />
        <path d="M9 12 A14 14 0 0 1 20 6" fill="none" stroke="#FFF6D6" strokeWidth="2" strokeLinecap="round" opacity=".7" />
      </svg>
    </div>
  );
}

/** A sprig of blossom at the edge of the page. */
export function Blossom({ petal, centre, branch, className }: { petal: string; centre: string; branch: string; className?: string }) {
  const flowers: [number, number, number][] = [
    [26, 26, 1],
    [58, 16, 0.8],
    [46, 52, 1.1],
    [78, 44, 0.9],
    [22, 66, 0.75],
  ];
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute", className)} style={{ aspectRatio: "100 / 80" }}>
      <svg viewBox="0 0 100 80" className="h-full w-full">
        <g fill="none" stroke={branch} strokeWidth="2.4" strokeLinecap="round">
          <path d="M2 76 C24 70 48 56 68 34 C78 24 88 16 98 12" />
          <path d="M28 66 C34 56 40 48 44 42" strokeWidth="1.6" />
          <path d="M62 44 C70 42 78 38 84 32" strokeWidth="1.6" />
        </g>
        {flowers.map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            {Array.from({ length: 5 }, (_, k) => {
              const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
              return <ellipse key={k} cx={Math.cos(a) * 5.4} cy={Math.sin(a) * 5.4} rx="4.4" ry="3.6" fill={petal} transform={`rotate(${(a * 180) / Math.PI} ${Math.cos(a) * 5.4} ${Math.sin(a) * 5.4})`} />;
            })}
            <circle r="2.4" fill={centre} />
          </g>
        ))}
        {[[12, 58], [88, 22], [70, 62]].map(([x, y], i) => (
          <circle key={`b${i}`} cx={x} cy={y} r="2.6" fill={petal} opacity=".85" />
        ))}
      </svg>
    </div>
  );
}
