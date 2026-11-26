"use client";

import { motion } from "motion/react";
import { Volume2 } from "lucide-react";
import type { GiftLocale } from "@/lib/gift/schema";
import { giftString } from "@/templates/_shared/i18n";
import { LogoMark } from "@/components/shared/logo";

/** The single user gesture browsers need before audio can play. Also the emotional threshold. */
/** `soundButton`: the song's sound button (templates/_shared/SongStrip.tsx) stands where the "Turn your sound on" line is, so the line keeps its room and is not drawn. */
export function SoundGate({ recipientName, senderName, locale, onOpen, soundButton = false }: { recipientName: string; senderName: string; locale: GiftLocale; onOpen: () => void; soundButton?: boolean }) {
  return (
    <button type="button" onClick={onOpen} className="group absolute inset-0 z-[70] flex flex-col items-center justify-center bg-night px-10 text-center text-paper">
      <div className="grain-overlay" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_20%,rgba(232,96,76,0.16),transparent)]" />
      <motion.div animate={{ scale: [1, 1.07, 1] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
        <LogoMark className="size-14" />
      </motion.div>
      <p className="mt-8 text-[11px] tracking-[0.3em] text-paper/50 uppercase">{senderName} → {recipientName}</p>
      <p className="mt-3 max-w-xs text-[1.6rem] leading-snug italic" style={{ fontFamily: "var(--font-display)", fontVariationSettings: '"opsz" 36, "SOFT" 60, "WONK" 1' }}>
        {giftString(locale, "loadingFor", { name: recipientName })}
      </p>
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 120, damping: 16 }}
        className="mt-12 flex h-12 items-center gap-2 rounded-full bg-coral px-6 text-[15px] font-semibold text-paper shadow-glow transition-transform group-active:scale-95"
      >
        {giftString(locale, "tapToOpen")}
      </motion.span>
      <span data-sound-anchor className={soundButton ? "invisible mt-5 flex h-9 items-center gap-1.5 text-xs text-paper/55" : "mt-4 flex items-center gap-1.5 text-xs text-paper/55"}>
        <Volume2 className="size-3.5" />
        {giftString(locale, "soundOn")}
      </span>
    </button>
  );
}
