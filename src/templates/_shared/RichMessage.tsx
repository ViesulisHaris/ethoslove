"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import type { RichBlock } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";

/** Paragraphs fade in one after another — the non-typewriter message style. */
export function RichMessage({
  blocks,
  active = true,
  stagger = 0.45,
  className,
  paragraphClassName,
  onDone,
}: {
  blocks: RichBlock[];
  active?: boolean;
  stagger?: number;
  className?: string;
  paragraphClassName?: string;
  onDone?: () => void;
}) {
  // An empty message has no paragraph to finish fading in, so nothing ever said it was done, and
  // every template that waits for it before its end screen stopped there (a gift may have no
  // message: Text Thread's chat, Jar of Reasons' notes). It is done as soon as it shows. Once.
  const doneRef = useRef(false);
  useEffect(() => {
    if (!active || blocks.length > 0 || doneRef.current) return;
    doneRef.current = true;
    onDone?.();
  }, [active, blocks.length, onDone]);
  if (!active) return null;
  return (
    <div className={cn("whitespace-pre-wrap", className)}>
      {blocks.map((block, bi) => (
        <motion.p
          key={bi}
          className={paragraphClassName}
          initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: bi * stagger, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          onAnimationComplete={bi === blocks.length - 1 ? onDone : undefined}
        >
          {block.map((run, ri) =>
            run.br ? (
              <br key={ri} />
            ) : run.bold ? (
              <strong key={ri}>{run.text}</strong>
            ) : run.italic ? (
              <em key={ri}>{run.text}</em>
            ) : (
              <span key={ri}>{run.text}</span>
            ),
          )}
        </motion.p>
      ))}
    </div>
  );
}
