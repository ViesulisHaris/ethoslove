"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { Bookmark, Heart, Loader2, Mic, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { GiftData, GiftLocale } from "@/lib/gift/schema";
import { isCatalogPreview } from "@/lib/gift/music";
import { MAKE_OWN_REF, madeWithEthosHref } from "@/lib/attribution/recipient";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics/track";
import { getManifest } from "../manifests";
import { useGiftChrome } from "./gift-chrome";
import { giftString } from "./i18n";
import { ReplyModeContext } from "./reply-mode";
import { SongDedication } from "./SongDedication";
import { SongPreviewCard } from "./SongPreview";
import { claimSound, onSoundClaimed } from "./sound-floor";
import { UnwrapGift } from "./UnwrapGift";
import { Watermark } from "./Watermark";

/**
 * The reply offer, "or make one for someone else" and "Keep this gift", in the gift's own language
 * like every other line here. Only this screen says these, so they live with it rather than in
 * ./i18n. "The first": a gift has one free reply, and a page can't know it's been sent without
 * asking, so the line stays true after it has (a "free" that turns out not to be is a banned claim;
 * once it's used the editor opens at the normal price). "or …" is the other thing to do after "Send
 * one back to {sender}", which is why it starts small; it stands in a row of its own, so on a paid
 * gift it is not read as the next words of the free line.
 */
const REPLY_OFFER = {
  en: { free: "The first reply is free", someoneElse: "or make one for someone else", keep: "Keep this gift" },
  es: { free: "La primera respuesta es gratis", someoneElse: "o hazle uno a otra persona", keep: "Guardar este regalo" },
} as const satisfies Record<GiftLocale, Record<string, string>>;

/**
 * A paid premium gift (a premium template, sent without the footer) comes with one free reply in the
 * same template (lib/commerce/free-reply.ts). A free template costs nothing to send back anyway, and
 * a gift that was itself a free reply passes nothing on, so neither says it.
 */
function freeReplyLine(locale: GiftLocale, templateSlug: string, watermarked: boolean): string | null {
  if (watermarked || getManifest(templateSlug)?.tier !== "premium") return null;
  return (REPLY_OFFER[locale] ?? REPLY_OFFER.en).free;
}

export function EndScreen({
  data,
  tone = "dark",
  onReact,
  onMakeOne,
  onReplay,
  songShown = false,
  compact = false,
  heart = true,
  className,
}: {
  data: GiftData;
  tone?: "light" | "dark";
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
  /** The template already shows the song's card, with Apple's link and credit (PreviewMusicCard). */
  songShown?: boolean;
  /**
   * For a gift that hands its end over on a card or a page of its own (String the Lights, Gingerbread
   * House), which is far smaller than a screen: the same end, set closer. The card already has
   * margins, so the end takes none of its own (they left a column too narrow for a button's words to
   * stay on one line); the heart is smaller, the rows sit nearer, and "Keep this gift" and "Watch
   * again" share a row where both fit. Every control is still a thumb tall.
   */
  compact?: boolean;
  /**
   * False where the gift sets a mark of its own over the end (String the Lights: its sign, in foil),
   * so the end has one emblem and not two, and the card keeps the room.
   */
  heart?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const dark = tone === "dark";
  const { locale } = data;
  const reply = useContext(ReplyModeContext);
  // The free-tier badge floats at the foot of the gift, which is where these buttons are. While this
  // screen is the one being looked at, the badge steps aside and comes in at the end of it instead.
  // (Being mounted isn't enough — half the templates keep the end screen at the bottom of a long
  // scroll, where it sits unseen for most of the gift.)
  const chrome = useGiftChrome();
  const replyFree = reply && onMakeOne ? freeReplyLine(locale, data.templateSlug, chrome.watermarked) : null;
  // "Send one back" was tapped on a real gift page and the editor is loading (gift-experience.tsx).
  const busy = Boolean(chrome.makeOnePending);
  const onScreen = useRef<HTMLDivElement>(null);
  const tell = chrome.onEndScreen;
  useEffect(() => {
    const el = onScreen.current;
    if (!el || !tell) return;
    const io = new IntersectionObserver(([entry]) => tell(entry.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => {
      io.disconnect();
      tell(false);
    };
  }, [tell]);

  // The two that stay with this gift: its own link by email, and playing it again.
  const stay = (
    <>
      {reply && chrome.keepHref ? (
        <a
          data-app-hide
          href={chrome.keepHref}
          onClick={() => track("keep_tapped", { template: data.templateSlug })}
          className={cn(
            "flex min-h-11 items-center justify-center gap-1.5 text-sm underline-offset-4 hover:underline",
            dark ? "text-white/70 hover:text-white" : "text-black/60 hover:text-black",
          )}
          data-testid="keep-gift"
        >
          <Bookmark aria-hidden="true" className="size-3.5 shrink-0" />
          <span>{(REPLY_OFFER[locale] ?? REPLY_OFFER.en).keep}</span>
        </a>
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
    </>
  );

  return (
    <div ref={onScreen} data-end-screen className={cn("flex flex-col items-center text-center", compact ? "w-full" : "px-6", className)}>
      {heart ? (
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ type: "spring", stiffness: 160, damping: 14 }}
          className={cn("relative grid place-items-center rounded-full", compact ? "size-12" : "size-20")}
          style={{ background: "rgba(var(--gift-accent-rgb), 0.14)" }}
        >
          <motion.div
            animate={reduce ? undefined : { scale: [1, 1.12, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Heart
              className={compact ? "size-[1.375rem]" : "size-9"}
              style={{ color: "var(--gift-accent)", fill: "var(--gift-accent)" }}
            />
          </motion.div>
        </motion.div>
      ) : null}

      <p
        className={cn("leading-tight italic", compact ? "text-[1.45rem]" : "text-[1.6rem]", heart && (compact ? "mt-3" : "mt-7"))}
        style={{ fontFamily: "var(--gift-font-display)" }}
      >
        {giftString(locale, "theEnd")}
      </p>
      <p className={cn("max-w-full text-sm [overflow-wrap:anywhere]", compact ? "mt-1" : "mt-2", dark ? "text-white/60" : "text-black/50")}>
        {giftString(locale, "madeBy", { sender: data.senderName, recipient: data.recipientName })}
      </p>

      {/* The P.S. of the whole gift: under its last words and before anything asks them to act. */}
      {data.unwrap ? <UnwrapGift unwrap={data.unwrap} locale={locale} sender={data.senderName} accent={data.accentColor} dark={dark} className={compact ? "mt-6" : "mt-10"} /> : null}

      {data.voiceNote ? (
        <VoiceNotePlayer
          url={data.voiceNote.url}
          sender={data.senderName}
          locale={locale}
          dark={dark}
        />
      ) : null}

      {/* The real song, heard only on a tap here — including on gifts made when it looped under them. */}
      {isCatalogPreview(data.music) && !songShown ? <SongPreviewCard music={data.music} locale={locale} dark={dark} /> : null}

      {data.dedication ? <SongDedication dedication={data.dedication} locale={locale} dark={dark} /> : null}

      <div className={cn("flex w-full max-w-xs flex-col", compact ? "mt-4 gap-2" : "mt-8 gap-3")}>
        {data.showReactionCta && onReact ? (
          <motion.button
            type="button"
            onClick={onReact}
            whileTap={{ scale: 0.97 }}
            className="flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-center text-[15px] leading-snug font-semibold shadow-lg"
            style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }}
          >
            <Heart className="size-4 shrink-0" />
            <span className="min-w-0 [overflow-wrap:anywhere]">{giftString(locale, "sendReaction", { sender: data.senderName })}</span>
          </motion.button>
        ) : null}
        {onMakeOne ? (
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={onMakeOne}
              // Once tapped it waits for the editor: it says so, and takes no second tap.
              disabled={busy}
              aria-busy={busy || undefined}
              className={cn(
                "flex min-h-12 items-center justify-center gap-2 rounded-full border px-5 py-2.5 text-center text-[15px] leading-snug font-medium disabled:cursor-default",
                dark
                  ? "border-white/20 text-white hover:bg-white/10 disabled:bg-white/10"
                  : "border-black/15 text-current hover:bg-black/5 disabled:bg-black/5",
              )}
            >
              {busy ? <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" /> : <Sparkles className="size-4 shrink-0" />}
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {reply ? giftString(locale, "sendOneBack", { sender: data.senderName }) : giftString(locale, "makeOne")}
              </span>
            </button>
            {replyFree ? (
              <p className={cn("text-xs font-medium", dark ? "text-white/70" : "text-black/60")}>{replyFree}</p>
            ) : null}
          </div>
        ) : null}
        {/* Not everyone who loved the gift wants to answer its sender. For anyone else in their life:
            the page made for a recipient (/made-with-ethos), the template they just watched first, in
            a new tab so the gift stays open. A text link, the weight of "Keep this gift", in a row of
            its own: the free line above belongs to the button, not to this. Its address carries the
            template and never the gift, and the page it opens is told only the site's name as where
            the tap came from, never the gift's address (next.config.ts: Referrer-Policy on /g/).
            On a real gift only (free or paid), and not inside the iPhone app, where the gifts are a
            tab of their own. */}
        {reply && onMakeOne ? (
          <a
            data-app-hide
            href={madeWithEthosHref(locale, MAKE_OWN_REF, data.templateSlug)}
            target="_blank"
            rel="noopener"
            onClick={() => track("make_own_clicked", { template: data.templateSlug, from: "end" })}
            // Underlined, lightly: with no icon beside it, that is what says it can be tapped. On a
            // narrow card it breaks in two even lines rather than leaving "else" on its own.
            // Its keyboard ring sits on its own box, clear of the button above, and on a dark end
            // screen it is a light one (the site's ring is a dark plum, which a dark gift swallows).
            className={cn(
              "flex min-h-11 items-center justify-center rounded-full py-2 text-center text-sm leading-snug text-balance underline decoration-current/30 underline-offset-4 hover:decoration-current focus-visible:outline-offset-0 active:opacity-70",
              compact ? "px-1" : "px-2",
              dark ? "text-white/70 hover:text-white focus-visible:outline-white/60" : "text-black/60 hover:text-black",
            )}
            data-testid="make-for-someone-else"
          >
            {(REPLY_OFFER[locale] ?? REPLY_OFFER.en).someoneElse}
          </a>
        ) : null}
        {/* Their reason to make one comes later (the sender's birthday, the anniversary): the gift's own
            link by email, to open again, and a nudge before the day if they want one. On a page off
            the gift (the gift itself carries no form). Not inside the iPhone app, which has its own.
            On a card the two stand side by side where both fit (and one under the other where they
            don't: Spanish, a narrow phone), which saves the card a row. */}
        {compact ? <div className="flex flex-wrap items-center justify-center gap-x-5">{stay}</div> : stay}
      </div>

      {chrome.watermarked ? <Watermark locale={locale} slug={data.templateSlug} inline tone={tone} counted={reply} className={compact ? "mt-2" : "mt-8"} /> : null}
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
    // The song preview starting stops the voice message: one voice at a time (./sound-floor).
    const off = onSoundClaimed((kind) => {
      if (kind !== "songPreview") return;
      audio.pause();
      setPlaying(false);
    });
    return () => {
      off();
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
      claimSound("voiceNote", audio);
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
