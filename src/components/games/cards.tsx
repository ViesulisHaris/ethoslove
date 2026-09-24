import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Sticker, type StickerId } from "@/templates/_shared/covers/stickers";
import { AppReady } from "@/components/app/app-ready";

/**
 * The games' deck: cards that look like cards. A cream face with a thin inner frame and the rank
 * and suit in two corners, a patterned back, and a 3D turn between the two (the CSS is in
 * globals.css, `.card-3d`). Nothing here holds state, so a server page can deal them too.
 */
export type SuitName = "heart" | "diamond" | "club" | "spade";
const RED: SuitName[] = ["heart", "diamond"];

export function Suit({ suit, className, color }: { suit: SuitName; className?: string; color?: string }) {
  const fill = color ?? (RED.includes(suit) ? "#D6336C" : "#2A0F1F");
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill={fill}>
      {suit === "heart" ? <path d="M12 21.2s-7.7-4.7-9.8-9.4C.7 8.4 2.7 4.3 6.6 4.3c2.1 0 3.6 1.1 5.4 3.2 1.8-2.1 3.3-3.2 5.4-3.2 3.9 0 5.9 4.1 4.4 7.5C19.7 16.5 12 21.2 12 21.2Z" /> : null}
      {suit === "diamond" ? <path d="M12 1.8 20.6 12 12 22.2 3.4 12Z" /> : null}
      {suit === "spade" ? <path d="M12 1.6s8 5.4 9.6 9.9c1.3 3.6-.9 6.6-4 6.6-1.7 0-3-.8-4.1-2.1.3 2.3 1.1 4.2 2.6 5.8H7.9c1.5-1.6 2.3-3.5 2.6-5.8-1.1 1.3-2.4 2.1-4.1 2.1-3.1 0-5.3-3-4-6.6C4 7 12 1.6 12 1.6Z" /> : null}
      {suit === "club" ? (
        <>
          <circle cx="12" cy="6.6" r="4.4" />
          <circle cx="6.6" cy="13.2" r="4.4" />
          <circle cx="17.4" cy="13.2" r="4.4" />
          <path d="M10.6 12.5h2.8l1.7 9.7H8.9Z" />
        </>
      ) : null}
    </svg>
  );
}

export type BackTone = "rose" | "lilac" | "ocean" | "wine" | "gold";
const BACKS: Record<BackTone, [string, string]> = {
  rose: ["#D6336C", "#A61E52"],
  lilac: ["#5B4FB0", "#3B3187"],
  ocean: ["#2F7FA8", "#1E5876"],
  wine: ["#7A2A52", "#431630"],
  gold: ["#C9923A", "#946420"],
};
const LATTICE = "repeating-linear-gradient(45deg, rgba(255,255,255,0.13) 0 1.5px, transparent 1.5px 11px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.13) 0 1.5px, transparent 1.5px 11px)";

/** The back of a card: a lattice over the tone, a thin cream frame, and a heart (or a label) in the middle. */
export function CardBack({ tone = "rose", label, className }: { tone?: BackTone; label?: ReactNode; className?: string }) {
  const [base, deep] = BACKS[tone];
  return (
    <div className={cn("relative size-full overflow-hidden", className)} style={{ backgroundColor: base, backgroundImage: `radial-gradient(120% 90% at 50% 45%, ${base} 0%, ${deep} 100%)` }}>
      <span aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: LATTICE }} />
      <span aria-hidden="true" className="absolute inset-[7px] rounded-[calc(var(--card-r,20px)-6px)] border-[1.5px] border-white/50" />
      <span className="absolute inset-0 grid place-items-center p-4 text-center">
        {label ?? (
          <span className="grid aspect-square w-[34%] max-w-16 place-items-center rounded-full bg-cream/95 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.5)]">
            <Suit suit="heart" className="w-1/2" color={base} />
          </span>
        )}
      </span>
    </div>
  );
}

type Tone = "cream" | "blush" | "lilac" | "sky";
const TONES: Record<Tone, string> = { cream: "bg-[#FFFBF5]", blush: "bg-rose-mist", lilac: "bg-[#F3F0FC]", sky: "bg-[#EEF6FA]" };
const CORNERS = {
  sm: { text: "text-[11px]", suit: "size-2.5", tl: "top-2 left-2", br: "bottom-2 right-2" },
  md: { text: "text-[15px]", suit: "size-3", tl: "top-3 left-3", br: "bottom-3 right-3" },
  lg: { text: "text-[20px]", suit: "size-4", tl: "top-3.5 left-3.5", br: "bottom-3.5 right-3.5" },
};

function Corner({ rank, suit, size, flip = false }: { rank: string; suit: SuitName; size: keyof typeof CORNERS; flip?: boolean }) {
  const c = CORNERS[size];
  return (
    <span aria-hidden="true" className={cn("pointer-events-none absolute z-[1] flex flex-col items-center font-display leading-none", flip ? cn(c.br, "rotate-180") : c.tl)} style={{ color: RED.includes(suit) ? "var(--color-rose-deep)" : "var(--color-forest)" }}>
      <span className={c.text}>{rank}</span>
      <Suit suit={suit} className={cn("mt-0.5", c.suit)} />
    </span>
  );
}

export type CardProps = {
  rank?: string;
  suit?: SuitName;
  /** Shows the back; changing it turns the card over. */
  faceDown?: boolean;
  back?: BackTone;
  backLabel?: ReactNode;
  tone?: Tone;
  corners?: keyof typeof CORNERS;
  radius?: number;
  className?: string;
  faceClassName?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

export function PlayingCard({ rank, suit = "heart", faceDown = false, back = "rose", backLabel, tone = "cream", corners = "md", radius = 20, className, faceClassName, style, children }: CardProps) {
  return (
    <div className={cn("card-3d relative", faceDown && "is-flipped", className)} style={{ ...style, ["--card-r" as string]: `${radius}px` }}>
      <div className="card-inner relative size-full">
        <div aria-hidden={faceDown || undefined} className={cn("card-face relative flex size-full flex-col overflow-hidden rounded-[var(--card-r)] text-forest shadow-[0_1px_0_rgba(255,255,255,0.85)_inset,0_22px_44px_-22px_rgba(10,2,8,0.75)] ring-1 ring-black/5", TONES[tone], faceClassName)}>
          <span aria-hidden="true" className="pointer-events-none absolute inset-[6px] rounded-[calc(var(--card-r)-5px)] border border-rose/15" />
          {rank ? <Corner rank={rank} suit={suit} size={corners} /> : null}
          {rank ? <Corner rank={rank} suit={suit} size={corners} flip /> : null}
          {children}
        </div>
        <div aria-hidden={!faceDown || undefined} className="card-back absolute inset-0 overflow-hidden rounded-[var(--card-r)] shadow-[0_22px_44px_-22px_rgba(10,2,8,0.75)] ring-1 ring-black/10">
          <CardBack tone={back} label={backLabel} />
        </div>
      </div>
    </div>
  );
}

/** A score token like a poker chip: a dashed ring inside, the number in the middle. */
export function Chip({ value, tone = "rose", label, active = false, size = "md" }: { value: ReactNode; tone?: "rose" | "lilac" | "gold"; label?: string; active?: boolean; size?: "md" | "lg" }) {
  const bg = tone === "rose" ? "bg-rose" : tone === "lilac" ? "bg-[#5B4FB0]" : "bg-star";
  // The end chip's score is set smaller the more figures it has: at 34px "7/10" ran over the
  // stitching and "10/10" off the chip altogether.
  const figures = typeof value === "string" || typeof value === "number" ? String(value).length : 0;
  const big = figures >= 5 ? "text-[22px]" : figures === 4 ? "text-[26px]" : "text-[34px]";
  return (
    <span className="inline-flex flex-col items-center gap-1.5">
      <span className={cn("relative grid place-items-center rounded-full font-display text-white shadow-[0_10px_22px_-10px_rgba(0,0,0,0.7)] transition-transform", bg, size === "lg" ? cn("size-20", big) : "size-12 text-[20px]", active && "scale-110 ring-4 ring-cream/80")}>
        <span aria-hidden="true" className="absolute inset-[4px] rounded-full border-2 border-dashed border-white/55" />
        <span className="relative tabular-nums">{value}</span>
      </span>
      {/* In play a long name is cut short, to keep the chips beside the question; under a big end-of-game chip it wraps, so it reads whole. */}
      {label ? <span className={cn("text-[12.5px] font-semibold", size === "lg" ? "max-w-32 text-center text-balance break-words" : "max-w-28 truncate", active ? "text-cream" : "text-cream/65")}>{label}</span> : null}
    </span>
  );
}

const FELT = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='76' height='76'%3E%3Cpath fill='%23ffffff' fill-opacity='0.035' d='M38 48s-8-4.9-10.2-9.8c-1.6-3.5.5-7.7 4.5-7.7 2.2 0 3.7 1.1 5.7 3.3 1.9-2.2 3.4-3.3 5.6-3.3 4 0 6.1 4.2 4.5 7.7C46 43.1 38 48 38 48Z'/%3E%3C/svg%3E")`;

/** The table's surface: a soft light over deep wine, a felt of faint hearts, and grain. Goes inside an `isolate` box. */
export function TableFelt() {
  return (
    <>
      <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ background: "radial-gradient(110% 70% at 50% -8%, #6b2447 0%, #3a1830 40%, #200b18 78%)" }} />
      <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ backgroundImage: FELT }} />
      <div aria-hidden="true" className="grain-overlay -z-10 opacity-[0.12] mix-blend-overlay" />
    </>
  );
}

/** Game night: every games page is laid on the table. Pages sit under the floating header. */
export function GameTable({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate -mt-[var(--header-h)] min-h-dvh overflow-hidden bg-[#200b18] pt-[var(--header-h)] text-cream">
      <AppReady route="game" />
      <TableFelt />
      {children}
    </div>
  );
}

/** Three cards held in a hand: two backs and the game's own card face up. For the side of a lobby. */
export function GameArt({ sticker, rank, suit, back = "rose" }: { sticker: StickerId; rank: string; suit: SuitName; back?: BackTone }) {
  const hand = [
    { r: -15, x: -78, y: 34 },
    { r: -4, x: -22, y: 12 },
  ];
  return (
    <div aria-hidden="true" className="relative mx-auto h-[300px] w-full max-w-[400px] sm:h-[380px]">
      {hand.map(({ r, x, y }, i) => (
        <div key={i} className="absolute top-0 left-1/2 w-[44%] max-w-[190px] -translate-x-1/2" style={{ rotate: `${r}deg`, marginLeft: x, marginTop: y }}>
          <PlayingCard faceDown back={back} className="aspect-[5/7] w-full" />
        </div>
      ))}
      <div className="absolute top-0 left-1/2 w-[48%] max-w-[210px] -translate-x-1/2" style={{ rotate: "9deg", marginLeft: 44 }}>
        <PlayingCard rank={rank} suit={suit} corners="lg" className="aspect-[5/7] w-full" faceClassName="items-center justify-center">
          <span className="block w-[62%]">
            <Sticker id={sticker} />
          </span>
        </PlayingCard>
      </div>
    </div>
  );
}
