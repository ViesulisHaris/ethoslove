"use client";
/* eslint-disable @next/next/no-img-element */

/**
 * The shelf: a record sleeve with their photo as the album art and the disc sliding out of it, a
 * plant and a cassette for company. All of it sizes in --k so the still life reads on a phone, on
 * a laptop and in the 390 x 600 poster crop.
 */
import type { GiftPhoto } from "@/lib/gift/schema";
import { POSTER_FONT } from "../_shared/cover-kit";

/** The sleeve, the disc behind it, the printed title and the sticker with their name. */
export function Sleeve({
  photo,
  album,
  artist,
  name,
  forLabel,
  paper,
}: {
  photo?: GiftPhoto;
  album: string;
  artist: string;
  name: string;
  forLabel: string;
  paper: string;
}) {
  return (
    <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
      {/* the record, half out of the sleeve */}
      <div
        className="absolute top-[3.5%] right-[-46%] aspect-square h-[93%] rounded-full"
        style={{
          background: "radial-gradient(circle, #101010 0%, #171717 28%, #0b0b0b 29%, #191919 100%)",
          boxShadow: "0 calc(1.4*var(--k)) calc(2.6*var(--k)) rgba(20,10,6,.45)",
        }}
      >
        <span className="absolute inset-0 rounded-full" style={{ background: "repeating-radial-gradient(circle, rgba(255,255,255,.07) 0 1px, transparent 1px calc(.7*var(--k)))" }} />
        <span className="absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 210deg, rgba(255,255,255,.16), transparent 22%, transparent 52%, rgba(255,255,255,.1) 64%, transparent 82%)" }} />
        {/* the label is half inside the sleeve, so it carries the pressing marks rather than the title */}
        <div className="absolute inset-[32%] rounded-full" style={{ background: "var(--gift-accent)", boxShadow: "inset 0 0 0 calc(.4*var(--k)) rgba(0,0,0,.18)" }}>
          <span className="absolute inset-[16%] rounded-full" style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,.22)" }} />
          <span className="absolute top-1/2 left-1/2 size-[13%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#141414]" />
        </div>
      </div>

      {/* the sleeve itself */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          backgroundColor: paper,
          boxShadow: "0 calc(2.2*var(--k)) calc(4*var(--k)) calc(-1*var(--k)) rgba(35,18,10,.5), inset 0 0 0 1px rgba(0,0,0,.18)",
        }}
      >
        {photo ? <img src={photo.url} alt="" draggable={false} className="absolute inset-0 h-full w-full object-cover" /> : null}
        {/* the printed band along the foot of the cover */}
        <div className="absolute inset-x-0 bottom-0 px-[6%] pt-[14%] pb-[6%]" style={{ background: "linear-gradient(180deg, rgba(20,12,8,0), rgba(20,12,8,.78) 62%)" }}>
          <p className="line-clamp-2 text-[calc(3.5*var(--k))] leading-[1.08] text-balance italic [overflow-wrap:anywhere]" style={{ fontFamily: POSTER_FONT, color: "#FFF6E7" }}>
            {album}
          </p>
          <p className="mt-[calc(.8*var(--k))] truncate text-[calc(1.6*var(--k))] leading-none tracking-[0.3em] uppercase" style={{ color: "#FFF6E7", opacity: 0.75 }}>
            {artist}
          </p>
        </div>
        {/* the spine on the left, the opening on the right */}
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[6%]" style={{ background: "linear-gradient(90deg, rgba(0,0,0,.42), rgba(0,0,0,0))" }} />
        <span aria-hidden="true" className="absolute inset-y-0 right-0 w-[3.5%]" style={{ background: "linear-gradient(90deg, rgba(0,0,0,.3), rgba(255,255,255,.28))" }} />
        {/* the ring the record has worn into the card */}
        <span aria-hidden="true" className="absolute top-[6%] left-[8%] aspect-square h-[88%] rounded-full" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,.14)" }} />
      </div>

      {/* their name, stuck on the corner */}
      <div className="absolute -top-[5%] -left-[6%] max-w-[64%] rotate-[-9deg]">
        <div
          className="rounded-full px-[calc(2.6*var(--k))] pt-[calc(1*var(--k))] pb-[calc(1.2*var(--k))] text-center"
          style={{ backgroundColor: "#FBF0D6", color: "#3A2718", boxShadow: "0 calc(.7*var(--k)) calc(1.6*var(--k)) rgba(30,16,8,.4), inset 0 0 0 1px rgba(150,110,50,.4)" }}
        >
          <p className="text-[calc(1.4*var(--k))] leading-none tracking-[0.32em] uppercase opacity-65" style={{ fontFamily: POSTER_FONT }}>
            {forLabel}
          </p>
          <p className="mt-[calc(.4*var(--k))] text-[calc(3.4*var(--k))] leading-[1.05] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)" }}>
            {name}
          </p>
        </div>
      </div>
    </div>
  );
}

/** A pot plant, for the end of the shelf. */
export function Plant() {
  return (
    <svg viewBox="0 0 100 156" className="h-auto w-full overflow-visible" aria-hidden="true">
      <g fill="none" stroke="#3F6B44" strokeWidth="3" strokeLinecap="round">
        <path d="M50 108 C48 86 40 70 26 58" />
        <path d="M50 108 C52 84 62 68 76 56" />
        <path d="M50 108 C50 88 50 70 50 44" />
      </g>
      <g fill="#4E8250">
        <path d="M26 58 C10 50 8 30 22 22 C34 30 36 48 26 58 Z" />
        <path d="M50 44 C38 30 44 12 58 10 C64 24 60 40 50 44 Z" />
      </g>
      <g fill="#68A06A">
        <path d="M76 56 C90 46 92 28 80 20 C68 28 66 46 76 56 Z" />
        <path d="M50 76 C36 72 28 58 34 46 C46 50 54 64 50 76 Z" />
        <path d="M50 70 C64 66 74 54 70 42 C58 46 48 58 50 70 Z" />
      </g>
      {/* the pot */}
      <path d="M28 106 L72 106 L66 150 C66 153 62 154 50 154 C38 154 34 153 34 150 Z" fill="#C06A4A" />
      <path d="M28 106 L72 106 L70 118 L30 118 Z" fill="#D07C58" />
      <path d="M34 108 L40 152 C36 152 35 151 34 150 Z" fill="rgba(255,255,255,.18)" />
      <ellipse cx="50" cy="106" rx="22" ry="4" fill="#8E4A32" />
    </svg>
  );
}

/** A cassette, lying on the shelf. */
export function Cassette({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 160 100" className="h-auto w-full overflow-visible" aria-hidden="true">
      <rect x="1" y="1" width="158" height="98" rx="7" fill="#2B2724" />
      <rect x="1" y="1" width="158" height="98" rx="7" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="2" />
      <rect x="10" y="9" width="140" height="44" rx="3" fill="#E8DCC2" />
      <path d="M14 20 H146" stroke="#B9AA8C" strokeWidth="2" />
      <path d="M14 30 H146" stroke="#B9AA8C" strokeWidth="2" />
      <path d="M14 40 H110" stroke="#B9AA8C" strokeWidth="2" />
      <text x="18" y="18" fontSize="9" fill="#6B5B3E" fontFamily="var(--gift-font-body)" letterSpacing="2">
        {label}
      </text>
      <rect x="26" y="60" width="108" height="30" rx="4" fill="#15120F" />
      <circle cx="53" cy="75" r="11" fill="#54493E" />
      <circle cx="107" cy="75" r="11" fill="#54493E" />
      <circle cx="53" cy="75" r="5" fill="#8C7B66" />
      <circle cx="107" cy="75" r="5" fill="#8C7B66" />
      <rect x="64" y="66" width="32" height="18" rx="2" fill="#3A332B" />
      {[14, 146].map((x) => (
        <circle key={x} cx={x} cy="90" r="2.6" fill="#57504A" />
      ))}
    </svg>
  );
}
