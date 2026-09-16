"use client";

/**
 * The morning table: the paper folded so the masthead and the headline sit above the crease, with
 * their name written in the margin, and the cup, the glasses and the pen that were already there.
 * Everything sizes in --k, so the table reads on a phone, on a laptop and in the poster crop.
 */
import { POSTER_FONT } from "../_shared/cover-kit";

/** Steam off the cup; it stands still for reduced motion. */
export const FP_KEYFRAMES = `
.fp-steam{transform-box:fill-box;transform-origin:50% 100%;animation:fp-steam 4.2s ease-in-out infinite}
@keyframes fp-steam{0%{opacity:0;transform:translateY(6%) scaleX(.9)}28%{opacity:.55}100%{opacity:0;transform:translateY(-26%) scaleX(1.25)}}
@media (prefers-reduced-motion: reduce){.fp-steam{animation:none;opacity:.35}}
`;

/** Faint column text, so the page reads as newsprint without anything to actually read. */
const columns = (rows: number) => ({
  backgroundImage: `repeating-linear-gradient(180deg, currentColor 0 1px, transparent 1px calc(${rows}*var(--k)))`,
});

export function FoldedPaper({
  paperName,
  headline,
  subhead,
  date,
  strap,
  extra,
  name,
  forLabel,
  ink,
  accent,
}: {
  paperName: string;
  headline: string;
  subhead?: string;
  date: string;
  strap: string;
  extra: string;
  name: string;
  forLabel: string;
  ink: string;
  accent: string;
}) {
  return (
    <div className="relative w-full" style={{ color: ink }}>
      {/* the half that is folded under, receding from the crease */}
      <div
        aria-hidden="true"
        className="absolute inset-x-[2%] top-[100%] h-[calc(20*var(--k))] overflow-hidden"
        style={{ clipPath: "polygon(0 0, 100% 0, 95.5% 100%, 4.5% 100%)", background: "linear-gradient(180deg, #E4DCC8, #C8BEA6)" }}
      >
        <div className="flex gap-[calc(3*var(--k))] px-[calc(6*var(--k))] pt-[calc(2.6*var(--k))] opacity-30">
          <div className="h-[calc(12*var(--k))] flex-1" style={columns(2.1)} />
          <div className="h-[calc(12*var(--k))] flex-1" style={columns(2.1)} />
        </div>
      </div>

      {/* the page above the fold */}
      <div
        className="relative px-[calc(4.5*var(--k))] pt-[calc(7.5*var(--k))] pb-[calc(3.4*var(--k))]"
        style={{
          backgroundColor: "#F6F0E3",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.3 0 0 0 0 0.25 0 0 0 0 0.2 0 0 0 0.06 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          boxShadow: "0 calc(2*var(--k)) calc(3.4*var(--k)) calc(-1*var(--k)) rgba(48,28,12,.45)",
        }}
      >
        {/* their name, written in the margin */}
        <p
          className="absolute top-[calc(1.4*var(--k))] right-[calc(4*var(--k))] max-w-[62%] rotate-[-5deg] text-right text-[calc(4.2*var(--k))] leading-[1.05] [overflow-wrap:anywhere]"
          style={{ fontFamily: "var(--gift-font-hand)", color: "#2F4E92" }}
        >
          {forLabel} {name}
        </p>

        <div className="flex items-center justify-center border-y text-[calc(1.5*var(--k))] leading-none tracking-[0.18em] uppercase" style={{ borderColor: ink }}>
          <span className="truncate py-[calc(.7*var(--k))]">{strap}</span>
        </div>
        <h1
          className="mt-[calc(1.8*var(--k))] text-center text-[calc(9*var(--k))] leading-[.92] text-balance [overflow-wrap:anywhere]"
          style={{ fontFamily: POSTER_FONT, fontWeight: 900 }}
        >
          {paperName}
        </h1>
        <div className="mt-[calc(1.4*var(--k))] border-y-[calc(.5*var(--k))] py-[calc(.7*var(--k))] text-center text-[calc(1.5*var(--k))] leading-none tracking-[0.2em] uppercase" style={{ borderColor: ink }}>
          {date}
        </div>

        <p
          className="mx-auto mt-[calc(2.6*var(--k))] w-fit -rotate-2 border-[calc(.4*var(--k))] px-[calc(1.4*var(--k))] py-[calc(.4*var(--k))] text-[calc(1.6*var(--k))] leading-none font-bold tracking-[0.24em] uppercase"
          style={{ borderColor: accent, color: accent }}
        >
          {extra}
        </p>
        <h2 className="mt-[calc(2.2*var(--k))] text-center text-[calc(5.6*var(--k))] leading-[1.02] font-bold text-balance uppercase [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT }}>
          {headline}
        </h2>
        {subhead ? (
          <p className="mt-[calc(1.6*var(--k))] line-clamp-2 text-center text-[calc(2.2*var(--k))] leading-[1.2] text-balance italic" style={{ fontFamily: POSTER_FONT }}>
            {subhead}
          </p>
        ) : null}

        <div aria-hidden="true" className="mt-[calc(2.6*var(--k))] flex gap-[calc(2.4*var(--k))] border-t pt-[calc(2*var(--k))] opacity-35" style={{ borderColor: ink }}>
          <div className="h-[calc(9*var(--k))] flex-1" style={columns(2.1)} />
          <div className="h-[calc(9*var(--k))] flex-1" style={columns(2.1)} />
          <div className="h-[calc(9*var(--k))] flex-1" style={columns(2.1)} />
        </div>

        {/* the crease */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(4*var(--k))]" style={{ background: "linear-gradient(180deg, rgba(70,45,20,0), rgba(70,45,20,.3))" }} />
      </div>
    </div>
  );
}

export function CoffeeCup() {
  return (
    <svg viewBox="0 0 200 156" className="h-auto w-full overflow-visible" aria-hidden="true">
      <g className="fp-steam" style={{ animationDelay: "0s" }}>
        <path d="M84 40 C74 28 94 22 84 8" fill="none" stroke="#FFF6E6" strokeOpacity=".7" strokeWidth="4" strokeLinecap="round" />
      </g>
      <g className="fp-steam" style={{ animationDelay: "1.4s" }}>
        <path d="M108 40 C98 26 118 20 108 4" fill="none" stroke="#FFF6E6" strokeOpacity=".6" strokeWidth="4" strokeLinecap="round" />
      </g>
      <ellipse cx="100" cy="128" rx="82" ry="20" fill="rgba(40,20,8,.28)" />
      <ellipse cx="100" cy="124" rx="80" ry="19" fill="#F3ECDF" />
      <ellipse cx="100" cy="122" rx="66" ry="14.5" fill="#E6DCCB" />
      <path d="M142 68 C168 62 178 88 150 100" fill="none" stroke="#F6F1E7" strokeWidth="11" strokeLinecap="round" />
      <path d="M142 68 C168 62 178 88 150 100" fill="none" stroke="rgba(120,96,62,.28)" strokeWidth="2" strokeLinecap="round" />
      <path d="M46 58 L54 106 C56 116 76 122 100 122 C124 122 144 116 146 106 L154 58 Z" fill="#FBF6EC" />
      <path d="M46 58 L50 82 C64 90 136 90 150 82 L154 58 Z" fill="#F1E9DA" />
      <ellipse cx="100" cy="58" rx="54" ry="15" fill="#EFE6D6" />
      <ellipse cx="100" cy="58" rx="47" ry="12" fill="#5A3318" />
      <ellipse cx="100" cy="58" rx="47" ry="12" fill="url(#fp-crema)" />
      <defs>
        <radialGradient id="fp-crema" cx=".38" cy=".3" r=".8">
          <stop offset="0" stopColor="#B8813F" stopOpacity=".85" />
          <stop offset="1" stopColor="#4A2A12" stopOpacity=".2" />
        </radialGradient>
      </defs>
      <path d="M58 52 C74 46 128 46 142 52" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Glasses() {
  return (
    <svg viewBox="0 0 240 96" className="h-auto w-full overflow-visible" aria-hidden="true">
      <g fill="rgba(255,255,255,.22)" stroke="#3B322B" strokeWidth="6">
        <rect x="10" y="22" width="84" height="56" rx="24" />
        <rect x="126" y="22" width="84" height="56" rx="24" />
      </g>
      <path d="M94 44 C104 36 116 36 126 44" fill="none" stroke="#3B322B" strokeWidth="6" strokeLinecap="round" />
      <path d="M210 40 C226 38 232 46 236 58" fill="none" stroke="#3B322B" strokeWidth="6" strokeLinecap="round" />
      <path d="M10 40 C0 44 2 58 12 66" fill="none" stroke="#3B322B" strokeWidth="6" strokeLinecap="round" />
      <path d="M22 32 C34 24 60 24 74 30" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Pen() {
  return (
    <svg viewBox="0 0 240 34" className="h-auto w-full overflow-visible" aria-hidden="true">
      <path d="M4 17 L36 5 L36 29 Z" fill="#E3CB92" />
      <path d="M14 17 L36 10 L36 24 Z" fill="#B99B5C" opacity=".55" />
      <rect x="33" y="5" width="11" height="24" rx="3" fill="#D9BE7A" />
      <rect x="42" y="4" width="142" height="26" rx="13" fill="#1F3A63" />
      <rect x="42" y="7" width="142" height="8" rx="4" fill="rgba(255,255,255,.2)" />
      <rect x="178" y="4" width="11" height="26" rx="3" fill="#D9BE7A" />
      <rect x="186" y="4" width="48" height="26" rx="13" fill="#16283F" />
      <rect x="186" y="7" width="48" height="7" rx="3.5" fill="rgba(255,255,255,.14)" />
      <rect x="196" y="0" width="32" height="7" rx="3.5" fill="#D9BE7A" />
    </svg>
  );
}
