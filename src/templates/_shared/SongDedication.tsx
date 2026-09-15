"use client";
/* eslint-disable @next/next/no-img-element -- covers come from the song's own provider */

import { motion, useReducedMotion } from "motion/react";
import type { GiftDedication, GiftLocale } from "@/lib/gift/schema";
import { SONG_PROVIDER_NAMES, parseSongLink } from "@/lib/gift/song-link";
import { cn } from "@/lib/utils";
import { giftString } from "./i18n";

const PROVIDER_BUTTON = {
  youtube: { background: "#FF0033", color: "#FFFFFF" },
  spotify: { background: "#1ED760", color: "#0B1A10" },
  apple: { background: "linear-gradient(135deg, #FA2D48, #FB5C74)", color: "#FFFFFF" },
} as const;

/**
 * "This song reminds me of you" on the end screen. Tapping it opens the full song where they
 * already listen; nothing plays inside the gift, so it never fights the gift's own music.
 */
export function SongDedication({ dedication, locale, dark }: { dedication: GiftDedication; locale: GiftLocale; dark: boolean }) {
  const reduce = useReducedMotion();
  const link = parseSongLink(dedication.url);
  if (!link) return null;
  const provider = SONG_PROVIDER_NAMES[link.provider];
  // Video thumbnails are 16:9 and read best big; album covers are square and sit beside the title.
  const wide = link.provider === "youtube";

  return (
    <motion.a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group mt-7 block w-full max-w-xs overflow-hidden rounded-[22px] text-left shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)] ring-1",
        dark ? "bg-white/[0.08] text-white ring-white/15 backdrop-blur-md" : "bg-white text-[#1A1614] ring-black/10",
      )}
      initial={reduce ? false : { opacity: 0, y: 18, rotate: -1.5 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ type: "spring", stiffness: 120, damping: 16 }}
    >
      <p className={cn("px-4 pt-3.5 pb-2.5 text-center text-[1.4rem] leading-tight", dark ? "text-white/90" : "text-[#1A1614]")} style={{ fontFamily: "var(--gift-font-hand)" }}>
        {dedication.note?.trim() || giftString(locale, "songRemindsMe")}
      </p>
      {wide ? (
        <div className="relative mx-3 aspect-video overflow-hidden rounded-[14px] bg-black">
          {dedication.thumbnail ? <img src={dedication.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" /> : null}
          <span className="absolute inset-0 grid place-items-center" aria-hidden="true">
            <svg viewBox="0 0 68 48" className="w-[60px] drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-110">
              <path d="M66.5 7.7c-.8-2.9-2.5-5.4-5.4-6.2C55.8.1 34 0 34 0S12.2.1 6.9 1.6c-3 .7-4.6 3.2-5.4 6.1C.1 13 0 24 0 24s.1 11 1.5 16.3c.8 2.9 2.5 5.4 5.4 6.2C12.2 47.9 34 48 34 48s21.8-.1 27.1-1.5c2.9-.8 4.6-3.3 5.4-6.2C67.9 35 68 24 68 24s-.1-11-1.5-16.3Z" fill="#FF0033" />
              <path d="M45 24 27 14v20Z" fill="#FFFFFF" />
            </svg>
          </span>
        </div>
      ) : null}
      <div className="flex items-center gap-3 px-4 py-3">
        {!wide ? (
          <div className={cn("size-14 shrink-0 overflow-hidden rounded-[10px]", dark ? "bg-white/10" : "bg-black/5")}>
            {dedication.thumbnail ? <img src={dedication.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{dedication.title || provider}</p>
          {dedication.artist ? <p className={cn("truncate text-[13px]", dark ? "text-white/60" : "text-black/55")}>{dedication.artist}</p> : null}
        </div>
      </div>
      <span className="mx-3 mb-3 flex h-11 items-center justify-center rounded-full text-[14px] font-semibold" style={PROVIDER_BUTTON[link.provider]}>
        {giftString(locale, "listenOn", { provider })}
      </span>
    </motion.a>
  );
}
