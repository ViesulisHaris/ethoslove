"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PlayingCard, type CardProps } from "./cards";

/** How long a card takes to turn over: the `.card-3d` transition in globals.css. */
const TURN_MS = 700;
/** When the reveal's `i`th card starts to turn: the first after a beat, the next a little after. */
export const flipAt = (i: number) => 250 + i * 350;
/** When its face is showing: past half a turn, the face is what you see. */
export const faceUpAt = (i: number) => flipAt(i) + TURN_MS * 0.6;
/** When the last of `count` cards has landed. */
export const flippedAt = (count: number) => flipAt(count - 1) + TURN_MS;

/** A card that arrives face down and turns over by itself after `delay` ms: the reveal. */
export function RevealCard({ delay = flipAt(0), ...props }: Omit<CardProps, "faceDown"> & { delay?: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);
  return <PlayingCard {...props} faceDown={!shown} />;
}

/**
 * What a reveal says about the cards (the verdict, the scores, who guessed right) held back until
 * the cards above it have turned over: shown on the first frame, it gave the result away while
 * they were still face down. Only its opacity changes, so nothing around it moves when it arrives.
 */
export function AfterFlip({ delay, className, children }: { delay: number; className?: string; children: ReactNode }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);
  return (
    <div aria-hidden={!shown || undefined} className={cn("transition-[opacity,translate] duration-300 ease-(--ease-out-quint) motion-reduce:transition-none", shown ? "opacity-100" : "translate-y-1.5 opacity-0", className)}>
      {children}
    </div>
  );
}
