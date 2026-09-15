"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { Heart, Mic, Music2, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { GiftData } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import { giftString } from "./i18n";
import { ReplyModeContext } from "./reply-mode";

export function EndScreen({
  data,
  tone = "dark",
  onReact,
  onMakeOne,
  onReplay,
  className,
}: {
  data: GiftData;
  tone?: "light" | "dark";
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const dark = tone === "dark";
  const { locale } = data;
  const reply = useContext(ReplyModeContext);

  return (
    <div className={cn("flex flex-col items-center px-6 text-center", className)}>
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ type: "spring", stiffness: 160, damping: 14 }}
        className="relative grid size-20 place-items-center rounded-full"
        style={{ background: "rgba(var(--gift-accent-rgb), 0.14)" }}
      >
        <motion.div
          animate={reduce ? undefined : { scale: [1, 1.12, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Heart
            className="size-9"
            style={{ color: "var(--gift-accent)", fill: "var(--gift-accent)" }}
          />
        </motion.div>
      </motion.div>

      <p
        className="mt-7 text-[1.6rem] leading-tight italic"
        style={{ fontFamily: "var(--gift-font-display)" }}
      >
        {giftString(locale, "theEnd")}
      </p>
      <p className={cn("mt-2 text-sm", dark ? "text-white/60" : "text-black/50")}>
        {giftString(locale, "madeBy", { sender: data.senderName, recipient: data.recipientName })}
      </p>

      {data.voiceNote ? (
        <VoiceNotePlayer
          url={data.voiceNote.url}
          sender={data.senderName}
          locale={locale}
          dark={dark}
        />
      ) : null}

      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        {data.showReactionCta && onReact ? (
          <motion.button
            type="button"
            onClick={onReact}
            whileTap={{ scale: 0.97 }}
            className="flex h-12 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold shadow-lg"
            style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }}
          >
            <Heart className="size-4 shrink-0" />
            <span className="min-w-0 truncate">{giftString(locale, "sendReaction", { sender: data.senderName })}</span>
          </motion.button>
        ) : null}
        {onMakeOne ? (
          <button
            type="button"
            onClick={onMakeOne}
            className={cn(
              "flex h-12 items-center justify-center gap-2 rounded-full border px-5 text-[15px] font-medium",
              dark
                ? "border-white/20 text-white hover:bg-white/10"
                : "border-black/15 text-current hover:bg-black/5",
            )}
          >
            <Sparkles className="size-4 shrink-0" />
            <span className="min-w-0 truncate">
              {reply ? giftString(locale, "sendOneBack", { sender: data.senderName }) : giftString(locale, "makeOne")}
            </span>
          </button>
        ) : null}
        {onReplay ? (
          <button
            type="button"
            onClick={onReplay}
            className={cn(
              "flex h-11 items-center justify-center gap-2 text-sm",
              dark ? "text-white/60 hover:text-white" : "text-black/50 hover:text-black",
            )}
          >
            <RotateCcw className="size-4" />
            {giftString(locale, "replay")}
          </button>
        ) : null}
      </div>

      {data.music?.source === "catalog" && data.music.title ? (
        <a
          href={data.music.externalUrl || undefined}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "mt-6 flex max-w-full items-center gap-2 text-xs",
            dark ? "text-white/50 hover:text-white/80" : "text-black/45 hover:text-black/70",
          )}
        >
          <Music2 className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate">
            {giftString(locale, "musicCredit")} {data.music.title}
            {data.music.artist ? ` — ${data.music.artist}` : ""}
          </span>
        </a>
      ) : null}
    </div>
  );
}

/** The sender's recorded message: one big button, a progress ring, nothing to configure. */
function VoiceNotePlayer({
  url,
  sender,
  locale,
  dark,
}: {
  url: string;
  sender: string;
  locale: GiftData["locale"];
  dark: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = new Audio(url);
    audio.preload = "auto";
    audioRef.current = audio;
    const onTime = () => setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      audio.pause();
      audioRef.current = null;
    };
  }, [url]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    }
  };

  const ring = `conic-gradient(var(--gift-accent) ${Math.round(progress * 360)}deg, ${dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"} 0)`;
  return (
    <motion.button
      type="button"
      onClick={toggle}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "mt-7 flex w-full max-w-xs items-center gap-3 rounded-full py-2 pr-5 pl-2 text-left",
        dark ? "bg-white/10 text-white" : "bg-black/5 text-current",
      )}
      aria-label={`${giftString(locale, "voiceNote")} · ${sender}`}
    >
      <span
        className="grid size-11 shrink-0 place-items-center rounded-full p-[3px]"
        style={{ background: ring }}
      >
        <span
          className="grid size-full place-items-center rounded-full"
          style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }}
        >
          {playing ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
        </span>
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[15px] font-semibold">
          <Mic className="size-3.5 opacity-70" />
          {giftString(locale, "voiceNote")}
        </span>
        <span className={cn("block text-xs", dark ? "text-white/60" : "text-black/50")}>
          {giftString(locale, playing ? "voiceNotePlaying" : "voiceNoteTap", { sender })}
        </span>
      </span>
    </motion.button>
  );
}
