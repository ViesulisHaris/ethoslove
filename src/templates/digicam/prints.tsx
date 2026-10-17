"use client";
/* eslint-disable @next/next/no-img-element */

import type { CSSProperties, ReactNode } from "react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { PAPER_GRAIN } from "../_shared/cover-kit";
import { DateStamp, PixelText } from "./screen";
import { fileName } from "./roll";

/** One print on the strip, in --k: the margin, the 4:3 photo, the line written under it. */
export const PRINT = { w: 72, pad: 3.2, caption: 8.6 } as const;
/** How tall one print stands, perforation included; for placing things beside the strip. */
export const printHeight = (): number => PRINT.pad + ((PRINT.w - PRINT.pad * 2) * 3) / 4 + PRINT.caption + 1.4;

const GLOSS = "linear-gradient(112deg, rgba(255,255,255,0) 32%, rgba(255,255,255,.2) 43%, rgba(255,255,255,0) 56%)";

/**
 * The roll, printed: one long glossy strip, a photo to a print, each with its date in the corner
 * and its caption written underneath, perforated between. A print opens large when tapped.
 */
export function PrintStrip({ photos, stamp, onOpen, style }: { photos: GiftPhoto[]; stamp: string | null; onOpen?: (index: number) => void; style?: CSSProperties }) {
  return (
    <div className="relative" style={{ width: `calc(${PRINT.w} * var(--k))`, background: "#FFFEFA", boxShadow: "0 calc(1.4*var(--k)) calc(3.2*var(--k)) rgba(60,20,35,.28), 0 0 0 1px rgba(60,40,40,.06)", ...style }}>
      {photos.map((photo, i) => (
        <figure key={`${photo.id}-${i}`} className="relative m-0" style={{ padding: `calc(${PRINT.pad} * var(--k)) calc(${PRINT.pad} * var(--k)) 0` }}>
          <button
            type="button"
            onClick={onOpen ? () => onOpen(i) : undefined}
            disabled={!onOpen}
            aria-label={photo.caption?.trim() || photo.alt || fileName(i)}
            className="relative block w-full overflow-hidden bg-[#1A1716] outline-none focus-visible:ring-4 focus-visible:ring-[#E0558A]/60 disabled:cursor-default"
            style={{ aspectRatio: "4 / 3" }}
          >
            <img src={photo.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
            {stamp ? <DateStamp text={stamp} height="calc(3.6*var(--k))" className="absolute" style={{ right: "calc(2.8*var(--k))", bottom: "calc(2.4*var(--k))" }} /> : null}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: GLOSS }} />
          </button>
          <figcaption className="flex items-center justify-between gap-[calc(2*var(--k))]" style={{ height: `calc(${PRINT.caption} * var(--k))` }}>
            <span className="min-w-0 truncate pr-[0.12em] text-[#2E2226]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(4.6*var(--k))", lineHeight: 1.3 }}>
              {photo.caption}
            </span>
            <span className="shrink-0 tracking-[0.08em] text-[#A79C99] tabular-nums" style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: "calc(2.1*var(--k))" }}>
              {fileName(i)}
            </span>
          </figcaption>
          {i < photos.length - 1 ? <span aria-hidden="true" className="block border-t border-dashed border-[#D9CFCB]" style={{ marginTop: "calc(1.4*var(--k))", marginInline: "calc(-1*var(--k))" }} /> : <span className="block" style={{ height: "calc(1.4*var(--k))" }} />}
        </figure>
      ))}
    </div>
  );
}

/**
 * The last print: the letter, on a glossy card with the camera's writing across the top (the
 * next file number, as if it were one more photo) and the date in the corner.
 */
export function PrintedCard({ file, stamp, children }: { file: string; stamp: string | null; children: ReactNode }) {
  return (
    <div className="relative" style={{ backgroundColor: "#FFFDF8", backgroundImage: PAPER_GRAIN, boxShadow: "0 calc(1.6*var(--k)) calc(4*var(--k)) rgba(60,20,35,.26), 0 0 0 1px rgba(60,40,40,.05)" }}>
      <div className="flex items-center justify-between px-[calc(5*var(--k))] pt-[calc(4.4*var(--k))]">
        {/* Its own little screen-width, so the pixel type is set at print size. */}
        <div className="w-[calc(64*var(--k))] [container-type:inline-size]">
          <PixelText lines={[`▶ ${file}`]} color="#B7AAA6" edge={null} />
        </div>
        <span aria-hidden="true" className="text-[calc(3.4*var(--k))] text-[#E0558A]">
          ♥
        </span>
      </div>
      <div className="px-[calc(6*var(--k))] pt-[calc(5*var(--k))] pb-[calc(12*var(--k))]">{children}</div>
      {stamp ? <DateStamp text={stamp} height="calc(3.6*var(--k))" className="absolute" style={{ right: "calc(5*var(--k))", bottom: "calc(4*var(--k))" }} /> : null}
    </div>
  );
}
