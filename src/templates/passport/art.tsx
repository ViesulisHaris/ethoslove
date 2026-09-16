"use client";

/**
 * The travel desk, seen from above: the booklet itself in embossed leather, the boarding pass tucked
 * into it showing the route this gift already knows, a luggage tag on a string, the ink stamps the
 * desk has collected and a paper plane going past. All --k, all drawn here, so the cover holds from
 * a 390 x 600 poster to a laptop.
 */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { NameTag, PAPER_GRAIN, POSTER_FONT } from "../_shared/cover-kit";

/** Gold blocking: the light runs across it, so one fill reads as foil on a rule and on a letter. */
const FOIL = "linear-gradient(118deg, #8A6626 0%, #F0D89C 20%, #FFF6DC 32%, #D5AE59 46%, #97712B 60%, #EFD79B 78%, #C4983F 100%)";

/** Pressed into the leather: gold in the letter, a dark edge under it. */
const emboss: CSSProperties = {
  backgroundImage: FOIL,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  textShadow: "0 calc(.24*var(--k)) calc(.24*var(--k)) rgba(0,0,0,.55)",
};

export const DESK_KEYFRAMES = `
.ps-plane{animation:ps-plane 9s ease-in-out infinite alternate}
@keyframes ps-plane{from{translate:0 0;rotate:-2deg}to{translate:calc(-2.4*var(--k)) calc(-1.8*var(--k));rotate:2deg}}
.ps-tag{transform-origin:70% 0;animation:ps-tag 6s ease-in-out infinite alternate}
@keyframes ps-tag{from{rotate:-9deg}to{rotate:-3deg}}
@media (prefers-reduced-motion: reduce){.ps-plane,.ps-tag{animation:none}}
`;

/** Three letters off a city's name, the way a departure board would print it. */
export function cityCode(name: string): string {
  const letters = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z]/g, "");
  return (letters.slice(0, 3) || "AWA").toUpperCase();
}

/** The crest: a winged globe over a ribbon, the way a passport blocks one in gold. */
function Crest() {
  return (
    <svg viewBox="0 0 120 92" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="ps-crest" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8A6626" />
          <stop offset="0.3" stopColor="#F2DCA4" />
          <stop offset="0.6" stopColor="#D0A854" />
          <stop offset="1" stopColor="#F6E7BC" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#ps-crest)" strokeWidth="1.6" strokeLinecap="round">
        {/* wings */}
        <path d="M44 44 C33 36 20 32 5 33 C17 40 30 45 44 49" />
        <path d="M46 52 C35 47 23 45 11 46 C22 52 33 55 45 56" />
        <path d="M76 44 C87 36 100 32 115 33 C103 40 90 45 76 49" />
        <path d="M74 52 C85 47 97 45 109 46 C98 52 87 55 75 56" />
        {/* globe */}
        <circle cx="60" cy="46" r="17" strokeWidth="1.8" />
        <ellipse cx="60" cy="46" rx="17" ry="7" />
        <ellipse cx="60" cy="46" rx="7" ry="17" />
        <path d="M45 38 H75 M45 54 H75" strokeWidth="1.2" opacity=".8" />
        {/* ribbon */}
        <path d="M30 74 C44 84 76 84 90 74" strokeWidth="2" />
        <path d="M30 74 L24 80 M90 74 L96 80" />
      </g>
      <path d="M60 6 l3.4 7 7.6 1 -5.5 5.4 1.3 7.6 -6.8 -3.6 -6.8 3.6 1.3 -7.6 -5.5 -5.4 7.6 -1Z" fill="url(#ps-crest)" />
    </svg>
  );
}

/** The closed booklet: leather, a gold rule, the crest, and their name blocked under it. */
export function Passport({
  leather,
  nationality,
  passportLabel,
  name,
}: {
  leather: string;
  nationality: string;
  passportLabel: string;
  name: string;
}) {
  return (
    <div
      className="relative flex w-full flex-col items-center justify-between px-[calc(5*var(--k))] pt-[calc(7.5*var(--k))] pb-[calc(6.5*var(--k))] text-center"
      style={{
        aspectRatio: "88 / 125",
        backgroundColor: leather,
        backgroundImage:
          "radial-gradient(rgba(255,255,255,.06) calc(.12*var(--k)), transparent calc(.16*var(--k))) 0 0/calc(1.5*var(--k)) calc(1.5*var(--k)), radial-gradient(rgba(0,0,0,.16) calc(.1*var(--k)), transparent calc(.15*var(--k))) calc(.5*var(--k)) calc(.7*var(--k))/calc(2.2*var(--k)) calc(2.2*var(--k)), linear-gradient(118deg, rgba(255,255,255,.12), transparent 44%), linear-gradient(202deg, rgba(0,0,0,.38), transparent 58%)",
        borderRadius: "calc(.7*var(--k)) calc(2.4*var(--k)) calc(2.4*var(--k)) calc(.7*var(--k))",
        boxShadow:
          "inset calc(1.4*var(--k)) 0 calc(1.8*var(--k)) rgba(0,0,0,.38), inset calc(-.4*var(--k)) 0 calc(1*var(--k)) rgba(255,255,255,.07), inset 0 0 0 1px rgba(255,255,255,.08), 0 calc(3*var(--k)) calc(6.5*var(--k)) rgba(20,40,60,.4)",
      }}
    >
      {/* the spine, and the stitching down it */}
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[9%] rounded-l-[calc(.7*var(--k))]" style={{ background: "linear-gradient(90deg, rgba(0,0,0,.42), rgba(0,0,0,.05))" }} />
      <span
        aria-hidden="true"
        className="absolute inset-y-[7%] left-[4.5%] w-px"
        style={{ background: "repeating-linear-gradient(180deg, rgba(226,196,126,.32) 0 calc(1.2*var(--k)), transparent calc(1.2*var(--k)) calc(2.6*var(--k)))" }}
      />
      {/* the blocked rule around everything */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-[5%] rounded-[calc(1.2*var(--k))]" style={{ boxShadow: "inset 0 0 0 1px rgba(226,196,126,.5)" }} />
      <span aria-hidden="true" className="pointer-events-none absolute inset-[7.5%] rounded-[calc(.8*var(--k))]" style={{ boxShadow: "inset 0 0 0 1px rgba(226,196,126,.22)" }} />

      <p className="relative max-w-[86%] truncate text-[calc(1.7*var(--k))] leading-none tracking-[0.2em] uppercase" style={{ ...emboss, fontFamily: POSTER_FONT }}>
        {nationality}
      </p>

      <div className="relative flex w-full flex-col items-center gap-[calc(2.4*var(--k))]">
        <div className="w-[42%]">
          <Crest />
        </div>
        <p className="text-[calc(3.4*var(--k))] leading-none tracking-[0.34em] uppercase" style={{ ...emboss, fontFamily: POSTER_FONT }}>
          {passportLabel}
        </p>
      </div>

      <p
        className="relative max-w-full text-[calc(3.2*var(--k))] leading-[1.15] tracking-[0.16em] uppercase [overflow-wrap:anywhere]"
        style={{ ...emboss, fontFamily: POSTER_FONT }}
      >
        {name}
      </p>
    </div>
  );
}

/** The pass tucked into the booklet: the stub stays hidden inside, the route end sticks out. */
export function BoardingPass({ from, to, label, passenger, className }: { from: string; to: string; label: string; passenger: string; className?: string }) {
  return (
    <div
      className={cn("flex items-stretch overflow-hidden rounded-[calc(.8*var(--k))]", className)}
      style={{
        backgroundColor: "#FBF3E2",
        backgroundImage: PAPER_GRAIN,
        boxShadow: "0 calc(1.2*var(--k)) calc(2.6*var(--k)) rgba(20,40,60,.3), inset 0 0 0 1px rgba(90,60,30,.12)",
      }}
    >
      {/* the stub, which the booklet covers */}
      <div className="flex w-[38%] items-center justify-center gap-[calc(.3*var(--k))] px-[calc(1*var(--k))]" style={{ backgroundColor: "rgba(200,166,110,.18)" }}>
        {[1.1, 0.4, 0.7, 0.4, 1.4, 0.5, 0.9, 0.4].map((w, i) => (
          <span key={i} className="block h-[46%] rounded-full" style={{ width: `calc(${w}*var(--k))`, background: "rgba(40,30,20,.55)" }} />
        ))}
      </div>
      <span aria-hidden="true" className="w-px" style={{ background: "repeating-linear-gradient(180deg, rgba(90,60,30,.45) 0 calc(.8*var(--k)), transparent calc(.8*var(--k)) calc(1.6*var(--k)))" }} />
      <div className="min-w-0 flex-1 px-[calc(1.6*var(--k))] py-[calc(1.6*var(--k))] text-left" style={{ color: "#2A2016" }}>
        <p className="truncate text-[calc(1.4*var(--k))] leading-none tracking-[0.2em] uppercase opacity-60">{label}</p>
        <p className="mt-[calc(1*var(--k))] flex items-baseline gap-[calc(.7*var(--k))] text-[calc(3.4*var(--k))] leading-none" style={{ fontFamily: POSTER_FONT }}>
          <span>{from}</span>
          <span className="text-[calc(2.2*var(--k))] opacity-70">{"✈"}</span>
          <span>{to}</span>
        </p>
        <p className="mt-[calc(1*var(--k))] truncate text-[calc(1.4*var(--k))] leading-none tracking-[0.2em] uppercase opacity-55">{passenger}</p>
      </div>
    </div>
  );
}

/** A luggage tag on its string, hanging off the booklet. */
export function LuggageTag({ name, eyebrow, className }: { name: string; eyebrow: string; className?: string }) {
  return (
    <div className={cn("pointer-events-none", className)} aria-hidden="true">
      <span
        className="absolute top-0 right-[6%] h-[calc(7*var(--k))] w-[calc(.5*var(--k))] origin-top rotate-[24deg] rounded-full"
        style={{ background: "linear-gradient(180deg, rgba(198,166,104,.95), rgba(140,110,60,.7))" }}
      />
      <div className="ps-tag pt-[calc(6*var(--k))]">
        <NameTag name={name} eyebrow={eyebrow} paper="#FFF6E4" />
      </div>
    </div>
  );
}

/** A rubber stamp the desk has collected. Multiplied into the page, like ink into paper. */
export function Stamp({ ink, title, sub, round = false, className }: { ink: string; title: string; sub: string; round?: boolean; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute flex flex-col items-center justify-center text-center", className)}
      style={{
        color: ink,
        border: "calc(.5*var(--k)) double currentColor",
        borderRadius: round ? "50%" : "calc(1*var(--k))",
        mixBlendMode: "multiply",
        opacity: 0.5,
      }}
    >
      <p className="max-w-[86%] truncate text-[calc(2*var(--k))] leading-none font-bold tracking-[0.16em] uppercase">{title}</p>
      <p className="mt-[calc(.7*var(--k))] max-w-[86%] truncate text-[calc(1.4*var(--k))] leading-none tracking-[0.3em] uppercase opacity-80">{sub}</p>
    </div>
  );
}

/** A paper plane and the line it has left behind. */
export function PaperPlane({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute", className)} style={{ aspectRatio: "160 / 92" }}>
      <svg viewBox="0 0 160 92" className="ps-plane h-full w-full overflow-visible">
        <path d="M2 86 C36 82 58 70 76 54" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="1 8" opacity=".75" />
        <path d="M74 56 L156 10 L118 84 L104 60Z" fill="#FFFFFF" opacity=".55" />
        <path d="M74 56 L156 10 L104 60Z" fill="#FFFFFF" />
        <path d="M104 60 L156 10 L118 84Z" fill="#DDE9F5" />
        <path d="M74 56 L104 60 L118 84" fill="none" stroke="rgba(120,150,180,.5)" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
