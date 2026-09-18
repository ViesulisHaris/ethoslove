"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "motion/react";
import { BouquetArt, timingFor } from "@/templates/bouquet/Bouquet";
import { arrange } from "@/templates/bouquet/arrange";
import { DEFAULT_STEMS } from "@/templates/bouquet/catalogue";
import type { BouquetFields } from "@/templates/bouquet/schema";

/** The same bouquet as the demo and the poster: the template's own defaults. */
const FIELDS: BouquetFields = { stems: DEFAULT_STEMS, wrap: "kraft", ribbon: "cream", backdrop: "linen", seed: 1 };

/** How long the finished bouquet sits before it assembles again. */
const HOLD_S = 2.6;
/** The card's own drop, after `timingFor().card` — the last thing that moves. */
const CARD_DROP_S = 1.4;

/**
 * The Bouquet template's real art, live in the hero's phone: the paper, the greens, every head
 * in turn, the fold, the ribbon, the card — then a pause, and again. It is the template's own
 * SVG, so it is crisp at any size; the screencast it replaces was recorded at 1× and looked it.
 *
 * Nothing else: no cover, no loading screen, no title. Just the flowers arriving.
 */
export function HeroBouquet({ cardText }: { cardText: string }) {
  const reduce = useReducedMotion();
  const [run, setRun] = useState(0);
  const total = useMemo(() => timingFor(arrange(FIELDS.stems, FIELDS.seed)).card + CARD_DROP_S, []);

  useEffect(() => {
    if (reduce) return;
    // Remounting with a new key restarts the assembly from the paper.
    const id = window.setTimeout(() => setRun((r) => r + 1), (total + HOLD_S) * 1000);
    return () => window.clearTimeout(id);
  }, [run, reduce, total]);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center px-[6%] pt-[13%] pb-[9%]"
      style={{ background: "radial-gradient(120% 80% at 50% 30%,#F8F2E9 0%,#E9DDCA 100%)" }}
    >
      {/*
       * Width-limited, height from its own viewBox. The art is `xMidYMin meet`, so given a box
       * taller than itself it pins to the top and leaves linen underneath; a box of exactly its
       * own ratio has no slack, and the flex container centres it. Nothing is ever cropped —
       * the viewBox is already cut tight to the paper.
       */}
      <BouquetArt
        key={run}
        fields={FIELDS}
        cardText={cardText}
        animate={!reduce}
        className="h-auto w-full drop-shadow-[0_18px_24px_rgba(40,25,20,0.16)]"
      />
    </div>
  );
}
