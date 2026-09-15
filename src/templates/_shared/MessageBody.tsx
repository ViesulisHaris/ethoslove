"use client";

import { useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GiftData } from "@/lib/gift/schema";
import type { RichBlock } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateMode } from "../types";
import { giftString } from "./i18n";
import { mix, rgba } from "./theme";
import { RichMessage } from "./RichMessage";
import { Typewriter } from "./Typewriter";

type Props = {
  data: Pick<GiftData, "locale" | "recipientName" | "senderName" | "messageStyle" | "accentColor">;
  blocks: RichBlock[];
  mode: TemplateMode;
  /** Dark cards set the words in warm white; light cards in ink. */
  tone?: "light" | "dark";
  /** The face the words are set in: the gift's display serif, or handwriting. */
  face?: "serif" | "hand";
  /** The line above the words. Defaults to "Dear {name},"; null hides it. */
  greeting?: string | null;
  /** A small rule with a heart between the greeting and the words. */
  ornament?: boolean;
  /** Overrides the gift accent for the highlight, the ornament and the signature. */
  accent?: string;
  speed?: number;
  onDone?: () => void;
  onCaretMove?: (el: HTMLElement) => void;
  className?: string;
};

/**
 * The words of a gift, set the way a letter is set: a large greeting in the display face, the
 * message in generous type with bold words highlighted like a marker and italics in the accent,
 * then a handwritten signature whose flourish draws itself once the last word has landed. One
 * component so every template's message reads as carefully as The Letter's.
 */
export function MessageBody({ data, blocks, mode, tone = "light", face = "serif", greeting, ornament = true, accent, speed = 36, onDone, onCaretMove, className }: Props) {
  const reduce = useReducedMotion();
  const instant = mode === "preview" || reduce || data.messageStyle === "fade";
  const [done, setDone] = useState(instant);
  const dark = tone === "dark";
  const color = accent ?? data.accentColor;
  // On a dark card a deep accent would vanish, so the signature and ornament take a lighter tint of it.
  const ink = dark ? mix(color, "#FFFFFF", 0.3) : color;
  const line = greeting === undefined ? giftString(data.locale, "dear", { name: data.recipientName }) : greeting;
  const finish = () => {
    setDone(true);
    onDone?.();
  };

  const vars = {
    "--mb-mark": rgba(color, dark ? 0.42 : 0.3),
    "--mb-accent": ink,
    "--mb-em": dark ? "var(--gift-accent-soft)" : "var(--gift-accent-deep)",
  } as CSSProperties;

  return (
    <div className={cn("relative", className)} style={vars}>
      {line ? (
        <h2 className={cn("leading-[1.08] italic", dark ? "text-[#F8F1E6]" : "text-current")} style={{ fontFamily: "var(--gift-font-display)", fontSize: "clamp(1.9rem, 8.4cqw, 2.5rem)" }}>
          {line}
        </h2>
      ) : null}
      {ornament ? (
        <div className="mt-4 flex items-center gap-3" aria-hidden="true" style={{ color: "var(--mb-accent)" }}>
          <span className="h-px flex-1 bg-current opacity-45" />
          <svg viewBox="0 0 24 24" className="size-3.5 opacity-90">
            <path d="M12 20.8s-7.2-4.4-9.2-8.8C1.4 8.6 3.1 4.8 6.8 4.8c2 0 3.5 1.1 5.2 3.2 1.7-2.1 3.2-3.2 5.2-3.2 3.7 0 5.4 3.8 4 7.2-2 4.4-9.2 8.8-9.2 8.8Z" fill="currentColor" />
          </svg>
          <span className="h-px flex-1 bg-current opacity-45" />
        </div>
      ) : null}
      <div
        className={cn(
          "mt-5 [&_p+p]:mt-[0.85em] [&_em]:italic [&_em]:text-[var(--mb-em)] [&_strong]:box-decoration-clone [&_strong]:rounded-[3px] [&_strong]:px-[0.12em] [&_strong]:font-semibold [&_strong]:[background:linear-gradient(transparent_58%,var(--mb-mark)_58%)]",
          dark ? "text-[#F6EFE3]" : "text-current",
        )}
        style={
          face === "hand"
            ? { fontFamily: "var(--gift-font-hand)", fontSize: "clamp(1.5rem, 6.4cqw, 1.85rem)", lineHeight: 1.45 }
            : { fontFamily: "var(--gift-font-display)", fontSize: "clamp(1.2rem, 5.3cqw, 1.42rem)", lineHeight: 1.55, letterSpacing: "-0.004em" }
        }
      >
        {instant ? <RichMessage blocks={blocks} stagger={mode === "preview" ? 0 : 0.5} onDone={finish} /> : <Typewriter blocks={blocks} active speed={speed} onDone={finish} onCaretMove={onCaretMove} />}
      </div>
      <AnimatePresence>
        {done ? <Signature key="sig" name={data.senderName} reduce={!!reduce} /> : null}
      </AnimatePresence>
    </div>
  );
}

/** The sender's name in handwriting, with a flourish that draws itself underneath. */
function Signature({ name, reduce }: { name: string; reduce: boolean }) {
  return (
    <motion.div className="mt-6 flex flex-col items-end" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }}>
      <span className="inline-block max-w-full -rotate-3 truncate leading-none" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "clamp(2rem, 8.6cqw, 2.6rem)", color: "var(--mb-accent)" }}>
        {name}
      </span>
      <svg viewBox="0 0 240 26" className="mt-1 h-[clamp(14px,3.4cqw,20px)] w-[clamp(120px,36cqw,220px)] overflow-visible" aria-hidden="true" style={{ color: "var(--mb-accent)" }}>
        <motion.path
          d="M3 15c34-11 72 8 112-2s76-8 122 1"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          initial={reduce ? { pathLength: 1 } : { pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: 0.85 }}
          transition={{ delay: 0.55, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
    </motion.div>
  );
}
