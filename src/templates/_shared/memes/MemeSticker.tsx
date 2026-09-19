/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { MEMES, memeSrc, type MemeId } from "./catalogue";

/**
 * One meme sticker. `width` is any CSS length (the templates pass their own unit); the height
 * follows the picture. Decorative: whatever wraps it carries the label.
 */
export function MemeSticker({ id, width, shadow = true, className, style }: { id: MemeId; width: string; shadow?: boolean; className?: string; style?: CSSProperties }) {
  const meme = MEMES[id];
  return (
    <img
      src={memeSrc(id)}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={cn("pointer-events-none block max-w-none select-none", className)}
      style={{ width, aspectRatio: `${meme.w} / ${meme.h}`, filter: shadow ? "drop-shadow(0 calc(.5*var(--k)) calc(.9*var(--k)) rgba(30,15,20,.28))" : undefined, ...style }}
    />
  );
}
