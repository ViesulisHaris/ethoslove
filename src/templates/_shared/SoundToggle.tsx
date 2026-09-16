"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { GiftLocale } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import type { GiftAudio } from "./hooks/use-gift-audio";
import { giftString } from "./i18n";

/**
 * Mute button. Fades to a ghost after a few seconds so it doesn't sit in every screenshot
 * or screen recording of the gift; any hover or tap brings it back.
 */
export function SoundToggle({ audio, locale, className }: { audio: GiftAudio; locale: GiftLocale; className?: string }) {
  const [dimmed, setDimmed] = useState(false);
  const playing = audio.hasMusic && audio.playing;

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => setDimmed(true), 3500);
    return () => window.clearTimeout(id);
  }, [playing]);

  if (!playing) return null;
  return (
    <button
      type="button"
      onClick={audio.toggleMute}
      onPointerEnter={() => setDimmed(false)}
      onFocus={() => setDimmed(false)}
      aria-label={giftString(locale, audio.muted ? "unmute" : "mute")}
      className={cn(
        "absolute top-[max(0.75rem,var(--gift-safe-top,env(safe-area-inset-top)))] right-3 z-40 grid size-10 place-items-center rounded-full bg-black/35 text-white/90 backdrop-blur-md transition-[opacity,background-color] duration-700 hover:bg-black/50",
        dimmed && !audio.muted && "opacity-25",
        className,
      )}
    >
      {audio.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </button>
  );
}
