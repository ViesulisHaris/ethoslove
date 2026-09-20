import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { POSTER_FONT, SCRIPT_FONT } from "../cover-kit";

const FACES = ["var(--gift-font-display)", POSTER_FONT, "'Courier New', ui-monospace, monospace", SCRIPT_FONT, "var(--gift-font-body)"];

/** Pick black or white for a letter, whichever reads on its tile. */
function inkOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 165 ? "#221A1E" : "#FFFFFF";
}

/**
 * The banner, cut out of five different magazines: every letter its own tile, face, colour and
 * tilt, with the white edge of a sticker round it.
 */
export function RansomRows({ rows, size, tiles, seed, className, children }: { rows: string[]; size: number; tiles: string[]; seed: number; className?: string; children?: (letter: ReactNode, index: number) => ReactNode }) {
  let index = 0;
  return (
    <div className={cn("flex flex-col items-center", className)} style={{ gap: `calc(${size * 0.16} * var(--p))` }}>
      {rows.map((row, r) => (
        <div key={r} className="flex items-end justify-center" style={{ gap: `calc(${size * 0.1} * var(--p))` }}>
          {[...row].map((ch, c) => {
            if (ch === " ") return <span key={c} style={{ width: `calc(${size * 0.45} * var(--p))` }} />;
            const i = index++;
            const pick = (seed + i * 7 + r * 3) % 97;
            const tile = tiles[pick % tiles.length];
            const face = FACES[(pick >> 1) % FACES.length];
            const tilt = ((pick % 13) - 6) * 1.1;
            const tall = 1 + ((pick % 5) - 2) * 0.05;
            const style: CSSProperties = {
              width: `calc(${size * (face === SCRIPT_FONT ? 0.92 : 0.84)} * var(--p))`,
              height: `calc(${size * 1.08 * tall} * var(--p))`,
              background: tile,
              color: inkOn(tile),
              fontFamily: face,
              fontSize: `calc(${size * (face === SCRIPT_FONT ? 0.86 : 0.78)} * var(--p))`,
              fontWeight: face === SCRIPT_FONT ? 400 : 800,
              rotate: `${tilt}deg`,
              boxShadow: `0 0 0 calc(${size * 0.07} * var(--p)) #FFFFFF, 0 calc(.5*var(--p)) calc(1.1*var(--p)) rgba(30,15,20,.3)`,
              borderRadius: `calc(${size * 0.06} * var(--p))`,
            };
            const letter = (
              <span className="grid place-items-center leading-none uppercase" style={style}>
                {ch}
              </span>
            );
            return <span key={c}>{children ? children(letter, i) : letter}</span>;
          })}
        </div>
      ))}
    </div>
  );
}
