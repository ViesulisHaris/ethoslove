"use client";

import { useEffect, useState } from "react";
import { PlayingCard, type CardProps } from "./cards";

/** A card that arrives face down and turns over by itself after `delay` ms: the reveal. */
export function RevealCard({ delay = 250, ...props }: Omit<CardProps, "faceDown"> & { delay?: number }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setShown(true), delay);
    return () => window.clearTimeout(timer);
  }, [delay]);
  return <PlayingCard {...props} faceDown={!shown} />;
}
