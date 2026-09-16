"use client";

/**
 * The ticket's printing: the die-cut edge, the rule around the print, the foil panel and the coin
 * someone left beside it. All CSS and SVG, sized in --k, so a ticket printed for a phone still reads
 * on a laptop and in a 390 × 600 poster.
 */
import { useId, type CSSProperties } from "react";

/**
 * Notches punched down both edges. Two mask layers kept only where they overlap, so the paper is
 * cut on the left and the right. A masked element loses its box-shadow, so the drop shadow has to
 * live on a parent.
 */
const NOTCH =
  "radial-gradient(circle calc(1.7*var(--k)) at left, transparent 96%, #000 100%), radial-gradient(circle calc(1.7*var(--k)) at right, transparent 96%, #000 100%)";

export const DIE_CUT = {
  maskImage: NOTCH,
  maskSize: "100% calc(6.4*var(--k))",
  maskRepeat: "repeat-y",
  maskComposite: "intersect",
  WebkitMaskImage: NOTCH,
  WebkitMaskSize: "100% calc(6.4*var(--k))",
  WebkitMaskRepeat: "repeat-y",
  WebkitMaskComposite: "source-in",
} as CSSProperties;

/** The double rule printed just inside the ticket's edge. */
export function TicketRule() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-[calc(2.4*var(--k))] rounded-[calc(1.8*var(--k))]"
      style={{
        boxShadow:
          "inset 0 0 0 calc(.34*var(--k)) rgba(154,92,42,.55), inset 0 0 0 calc(1.5*var(--k)) rgba(0,0,0,0), inset 0 0 0 calc(1.8*var(--k)) rgba(154,92,42,.3)",
      }}
    />
  );
}

/** A coin, milled edge and all, resting beside the ticket. */
export function Coin() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 100" className="w-full" aria-hidden="true">
      <defs>
        <radialGradient id={`${id}-face`} cx="38%" cy="32%">
          <stop offset="0" stopColor="#FCEBA8" />
          <stop offset=".55" stopColor="#E9C25E" />
          <stop offset="1" stopColor="#B6871F" />
        </radialGradient>
        <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F3D77E" />
          <stop offset=".5" stopColor="#A8791A" />
          <stop offset="1" stopColor="#E3BC55" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="52" r="44" fill={`url(#${id}-edge)`} />
      {Array.from({ length: 36 }, (_, i) => {
        const a = (i / 36) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={50 + Math.cos(a) * 39}
            y1={52 + Math.sin(a) * 39}
            x2={50 + Math.cos(a) * 44}
            y2={52 + Math.sin(a) * 44}
            stroke="rgba(92,62,12,.32)"
            strokeWidth="2.4"
          />
        );
      })}
      <circle cx="50" cy="50" r="40" fill={`url(#${id}-face)`} />
      <circle cx="50" cy="50" r="32" fill="none" stroke="rgba(120,85,15,.35)" strokeWidth="1.6" />
      <path d="M50 66 C36 56 30 48 34 41 C37 36 44 37 50 44 C56 37 63 36 66 41 C70 48 64 56 50 66 Z" fill="rgba(122,86,16,.32)" />
      <path d="M29 35 A26 26 0 0 1 47 17" fill="none" stroke="rgba(255,255,255,.72)" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
}

/** Silver foil with the holographic sweep the real panel scratches off. */
function Foil({ label }: { label: string }) {
  return (
    <span
      aria-hidden="true"
      className="relative block w-full overflow-hidden rounded-[calc(1.6*var(--k))]"
      style={{
        aspectRatio: "5 / 2",
        backgroundImage:
          "linear-gradient(118deg, rgba(120,220,255,.5), rgba(210,150,255,.45) 22%, rgba(255,170,205,.4) 42%, rgba(255,232,150,.45) 62%, rgba(150,255,210,.45) 82%, rgba(140,210,255,.5)), linear-gradient(160deg, #E7EBEF, #B9C2CB 28%, #F6F8FA 46%, #A9B3BD 68%, #DDE3E9)",
        boxShadow: "inset 0 0 0 calc(.3*var(--k)) rgba(90,100,110,.45), inset 0 calc(.8*var(--k)) calc(1.6*var(--k)) rgba(255,255,255,.55), 0 calc(.5*var(--k)) calc(1.4*var(--k)) rgba(60,50,40,.22)",
      }}
    >
      <span
        className="absolute inset-0"
        style={{ backgroundImage: "repeating-linear-gradient(72deg, rgba(255,255,255,.28) 0 calc(.5*var(--k)), rgba(255,255,255,0) calc(.5*var(--k)) calc(2.2*var(--k)))" }}
      />
      <span
        className="absolute inset-0 grid place-items-center text-center text-[calc(3.1*var(--k))] font-bold tracking-[0.3em] uppercase"
        style={{ color: "rgba(70,78,88,.62)", textShadow: "0 calc(.15*var(--k)) 0 rgba(255,255,255,.8)" }}
      >
        {label}
      </span>
    </span>
  );
}

/**
 * The ticket itself: printed header, their name, the foil panel and the prize line, with the
 * notched edge a real scratch card has.
 */
export function Ticket({
  name,
  forLabel,
  kind,
  prize,
  foilLabel,
  serial,
  cards,
}: {
  name: string;
  forLabel: string;
  kind: string;
  prize: string;
  foilLabel: string;
  serial: string;
  /** How many cards are in the gift, printed as the little stubs along the bottom. */
  cards: number;
}) {
  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: "5 / 6.2", filter: "drop-shadow(0 calc(1.6*var(--k)) calc(2.4*var(--k)) rgba(90,60,30,.3))" }}
    >
      <div
        className="absolute inset-0 flex flex-col items-center px-[calc(5*var(--k))] pt-[calc(5.5*var(--k))] pb-[calc(4*var(--k))] text-center"
        style={{ backgroundColor: "#FFFCF2", backgroundImage: "radial-gradient(120% 90% at 50% 0%, rgba(255,214,150,.4), transparent 60%)", ...DIE_CUT }}
      >
        <TicketRule />
        <p className="text-[calc(2.2*var(--k))] tracking-[0.42em] uppercase" style={{ color: "rgba(154,92,42,.75)" }}>
          {kind}
        </p>
        <p className="mt-[calc(.6*var(--k))] text-[calc(1.9*var(--k))] tracking-[0.34em] uppercase" style={{ color: "rgba(120,92,60,.55)" }}>
          {forLabel}
        </p>
        <p
          className="mt-[calc(.4*var(--k))] max-w-full text-[calc(8*var(--k))] leading-[1.05] [overflow-wrap:anywhere]"
          style={{ fontFamily: "var(--gift-font-hand)", color: "#8A3B12" }}
        >
          {name}
        </p>
        <div className="mt-[calc(3*var(--k))] w-[86%]">
          <Foil label={foilLabel} />
        </div>
        <p className="mt-[calc(2.6*var(--k))] text-[calc(2.9*var(--k))] leading-[1.25] text-balance italic" style={{ fontFamily: "var(--font-poster), Georgia, serif", color: "#5A4632" }}>
          {prize}
        </p>
        {/* One stub per card in the gift, the first one punched. */}
        <div aria-hidden="true" className="mt-[calc(2.4*var(--k))] flex items-center gap-[calc(1.1*var(--k))]">
          {Array.from({ length: Math.max(1, Math.min(cards, 12)) }, (_, i) => (
            <span
              key={i}
              className="block h-[calc(2.4*var(--k))] w-[calc(1.7*var(--k))] rounded-[calc(.4*var(--k))]"
              style={{ background: i === 0 ? "rgba(154,92,42,.85)" : "rgba(154,92,42,.26)" }}
            />
          ))}
        </div>
        <span aria-hidden="true" className="mt-auto w-[86%] border-t border-dashed" style={{ borderColor: "rgba(154,92,42,.4)" }} />
        <p className="mt-[calc(1.5*var(--k))] text-[calc(1.8*var(--k))] tracking-[0.28em]" style={{ fontFamily: "ui-monospace, Menlo, monospace", color: "rgba(120,92,60,.5)" }}>
          {serial}
        </p>
      </div>
    </div>
  );
}
