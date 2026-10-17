"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { Volume2 } from "lucide-react";
import type { GiftLocale } from "@/lib/gift/schema";
import { LogoMark } from "@/components/shared/logo";
import { giftString } from "./i18n";
import { introLook, type IntroVariant } from "./intro-variants";

/** Deterministic scatter, so the motes do not jump on re-render. */
function scatter(count: number, seed: number) {
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  return Array.from({ length: count }, () => ({
    x: rnd() * 100,
    y: rnd() * 100,
    size: 3 + rnd() * 6,
    bright: rnd() > 0.82,
    delay: rnd() * 5,
    duration: 5 + rnd() * 7,
    drift: -20 + rnd() * 40,
    opacity: 0.4 + rnd() * 0.55,
  }));
}

export function LoadingScreen({
  recipientName,
  progress,
  locale,
  variant = "starlight",
}: {
  recipientName?: string;
  progress: number;
  locale: GiftLocale;
  variant?: IntroVariant;
}) {
  const look = introLook(variant);
  const motes = useMemo(() => scatter(look.motes.count, variant.length * 7919), [look.motes.count, variant]);
  const pct = Math.max(6, Math.round(progress * 100));

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-[60] overflow-hidden"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } }}
      style={{ background: look.background, color: look.ink }}
    >
      <div className="grain-overlay" />

      {/* Drifting motes. Slow enough to read as atmosphere, not as loading. */}
      <div aria-hidden="true" className="absolute inset-0">
        {motes.map((m, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${m.x}%`,
              top: `${m.y}%`,
              width: m.bright ? m.size * 1.5 : m.size,
              height: look.motes.kind === "petal" ? m.size * 1.6 : m.bright ? m.size * 1.5 : m.size,
              borderRadius: look.motes.kind === "petal" ? "60% 40% 55% 45%" : "50%",
              background:
                look.motes.kind === "star"
                  ? "#FFFFFF"
                  : look.motes.kind === "ember"
                    ? "var(--gift-accent)"
                    : look.motes.kind === "petal"
                      ? "var(--gift-accent-soft)"
                      : "rgba(255,240,220,0.9)",
              boxShadow:
                look.motes.kind === "star"
                  ? `0 0 ${m.bright ? 14 : 7}px rgba(255,255,255,${m.bright ? 0.75 : 0.4})`
                  : look.motes.kind === "ember"
                    ? "0 0 10px rgba(var(--gift-accent-rgb),0.6)"
                    : "none",
              filter: look.motes.kind === "star" ? "none" : "blur(0.6px)",
            }}
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, m.opacity, 0],
              y: look.motes.kind === "ember" ? [0, -60] : [0, 40],
              x: [0, m.drift],
            }}
            transition={{ duration: m.duration, delay: m.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* A slow breath of light from above, so the frame is never flat. */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-2/3"
        style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(var(--gift-accent-rgb),0.20), transparent 70%)" }}
        animate={{ opacity: [0.55, 1, 0.55] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Weight at the foot of the frame, so the type sits on something. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.45))" }}
      />

      {/* The mark and the eyebrow come in on CSS animations, not motion's: a demo page has this
          screen in its server HTML, and those start with the page instead of waiting seconds for
          the scripts, so a phone sees them at once. */}
      <div className="relative flex h-full flex-col items-center justify-center px-10 pb-[14cqh] text-center">
        <div className="animate-in duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] fill-mode-both fade-in zoom-in-86 motion-reduce:animate-none">
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <LogoMark className="size-9 opacity-90" />
          </motion.div>
        </div>

        <p className="mt-7 animate-in text-[0.68rem] font-medium tracking-[0.32em] uppercase opacity-62 delay-350 duration-900 ease-[cubic-bezier(0.22,1,0.36,1)] fill-mode-both fade-in slide-in-from-bottom-2.5 motion-reduce:animate-none">
          {giftString(locale, "introEyebrow")}
        </p>

        {recipientName ? (
          <motion.p
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.55, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-4 max-w-[12ch] text-[clamp(2.6rem,15cqw,4.4rem)] leading-[0.95] italic"
            style={{ fontFamily: "var(--font-display)", fontVariationSettings: '"opsz" 144, "SOFT" 40, "WONK" 1' }}
          >
            {recipientName}
          </motion.p>
        ) : null}

        {/* The hairline is the progress bar. It draws itself out from the middle. */}
        <div className="relative mt-9 h-px w-40 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 rounded-full" style={{ background: "currentColor", opacity: 0.14 }} />
          <motion.div
            className="absolute inset-y-0 left-1/2 -translate-x-1/2 rounded-full"
            style={{ background: "var(--gift-accent)" }}
            initial={{ width: "6%" }}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 55, damping: 22 }}
          />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0.32] }}
          transition={{ delay: 1.1, duration: 2, times: [0, 0.4, 1] }}
          className="mt-6 flex items-center gap-2 text-[0.72rem] tracking-[0.14em] uppercase"
        >
          <Volume2 className="size-3.5" />
          {giftString(locale, "soundOn")}
        </motion.p>
      </div>
    </motion.div>
  );
}
