"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Sparkles, X } from "lucide-react";
import type { GiftLocale } from "@/lib/gift/schema";
import { giftString } from "@/templates/_shared/i18n";
import { cn } from "@/lib/utils";
import { VoiceRecorder } from "./voice-recorder";

const EMOJI = ["❤️", "😭", "🥹", "😂", "😮"] as const;

const S = {
  en: {
    title: "Send {sender} a reaction",
    blurb: "They'll get it right away.",
    placeholder: "Say something back (optional)",
    share: "Ethos may show this reaction on its site, without your name",
    shareSub: "Only the emoji and your words, never your voice.",
    send: "Send",
    sending: "Sending…",
    sent: "Sent to {sender}.",
    sentBlurb: "They'll see it the next time they open their gifts.",
    close: "Close",
    error: "Couldn't send. Try again in a moment.",
  },
  es: {
    title: "Envíale una reacción a {sender}",
    blurb: "Le llegará al momento.",
    placeholder: "Responde algo (opcional)",
    share: "Ethos puede mostrar esta reacción en la web de Ethos, sin tu nombre",
    shareSub: "Solo el emoji y tus palabras, nunca tu voz.",
    send: "Enviar",
    sending: "Enviando…",
    sent: "Enviado a {sender}.",
    sentBlurb: "Lo verá la próxima vez que abra sus regalos.",
    close: "Cerrar",
    error: "No se pudo enviar. Inténtalo en un momento.",
  },
};

/** "{sender}" in a line, filled in with a function so a "$&" or "$$" in a name stays as typed. */
function withSender(line: string, senderName: string): string {
  return line.replace("{sender}", () => senderName);
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * `onSendOneBack`: once the reaction has gone, the confirmation offers the one next step there is,
 * the end screen's own "Send one back to {sender}" (the same words, the same handler, handed down
 * by the gift page). Nothing else is added there: no price, no second link. `sendingBack`: it has
 * been tapped and the editor is loading, so the button shows it and takes no second tap.
 */
export function ReactionSheet({
  open,
  onClose,
  shortId,
  senderName,
  locale,
  onSendOneBack,
  sendingBack = false,
}: {
  open: boolean;
  onClose: () => void;
  shortId: string;
  senderName: string;
  locale: GiftLocale;
  onSendOneBack?: () => void;
  sendingBack?: boolean;
}) {
  const t = S[locale] ?? S.en;
  const [emoji, setEmoji] = useState<(typeof EMOJI)[number]>("❤️");
  const [text, setText] = useState("");
  const [audio, setAudio] = useState<Blob | null>(null);
  // Unticked until they tick it: the reaction is theirs, and so is whether anyone else sees it.
  const [share, setShare] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [burst, setBurst] = useState(0);
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  // A modal sheet behaves like one: it takes the focus when it opens and gives it back when it
  // closes, Escape closes it, and Tab goes round its own controls instead of the gift behind it.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => dialog.current?.focus({ preventScroll: true }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialog.current) return;
      const stops = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      if (!stops.length) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const at = document.activeElement;
      const inside = at instanceof Node && dialog.current.contains(at);
      if (e.shiftKey && (!inside || at === first || at === dialog.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (!inside || at === last)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open]);

  const send = async () => {
    setState("sending");
    const form = new FormData();
    form.set("emoji", emoji);
    form.set("text", text);
    if (share) form.set("share", "1");
    if (audio) form.set("audio", audio, "reaction.webm");
    const res = await fetch(`/api/gift/${shortId}/react`, { method: "POST", body: form }).catch(() => null);
    if (res?.ok) {
      setState("sent");
      setBurst((b) => b + 1);
    } else setState("error");
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="absolute inset-0 z-[80] flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative max-h-full w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-[#1e1a17] p-6 outline-none pb-[max(1.5rem,env(safe-area-inset-bottom))] text-paper shadow-2xl sm:rounded-3xl"
          >
            <button type="button" onClick={onClose} aria-label={t.close} className="absolute top-4 right-4 grid size-9 place-items-center rounded-full bg-white/8 text-white/70">
              <X className="size-4" />
            </button>
            {/* Present from the start, so the words that the reaction went are read out when they come. */}
            <p role="status" className="sr-only">{state === "sent" ? withSender(t.sent, senderName) : ""}</p>
            {state === "sent" ? (
              <ReactionSent key={burst} emoji={emoji} senderName={senderName} locale={locale} onSendOneBack={onSendOneBack} busy={sendingBack} titleId={titleId} />
            ) : (
              <>
                <p id={titleId} className="pr-10 text-2xl italic" style={{ fontFamily: "var(--font-display)" }}>{withSender(t.title, senderName)}</p>
                <p className="mt-1 text-sm text-white/55">{t.blurb}</p>
                <div className="mt-5 flex justify-between gap-2">
                  {EMOJI.map((e) => (
                    <motion.button key={e} type="button" onClick={() => setEmoji(e)} whileTap={{ scale: 0.85 }} animate={{ scale: emoji === e ? 1.18 : 1 }} className={cn("grid size-14 place-items-center rounded-2xl text-3xl transition-colors", emoji === e ? "bg-white/15 ring-2 ring-coral" : "bg-white/5")} aria-pressed={emoji === e}>
                      {e}
                    </motion.button>
                  ))}
                </div>
                <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 1000))} placeholder={t.placeholder} rows={3} className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-3.5 text-base text-paper placeholder:text-white/35 focus:border-coral focus:outline-none" />
                <div className="mt-3">
                  <VoiceRecorder locale={locale} value={audio} onChange={setAudio} />
                </div>
                <label className="mt-4 flex cursor-pointer items-start gap-3 text-left text-sm text-white/80">
                  <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-coral" data-testid="reaction-share" />
                  <span>
                    {t.share}
                    <span className="mt-0.5 block text-xs text-white/50">{t.shareSub}</span>
                  </span>
                </label>
                {state === "error" ? <p className="mt-3 text-sm text-coral">{t.error}</p> : null}
                <button type="button" onClick={send} disabled={state === "sending"} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-coral text-[15px] font-semibold text-paper shadow-glow disabled:opacity-60">
                  {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : null}
                  <span>{state === "sending" ? t.sending : `${t.send} ${emoji}`}</span>
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * What the sheet says once the reaction has gone: that it went, and to whom. Under it, the one
 * next step: the end screen's outline button, on the sheet's dark, so the same action looks the
 * same in both places. Once tapped (`busy`) it waits for the editor, as the sheet's own Send waits
 * for the reaction: a turning mark, and no second tap.
 */
export function ReactionSent({
  emoji,
  senderName,
  locale,
  onSendOneBack,
  busy = false,
  titleId,
}: {
  emoji: string;
  senderName: string;
  locale: GiftLocale;
  onSendOneBack?: () => void;
  busy?: boolean;
  /** The sheet is named by its title; once sent, by this line. */
  titleId?: string;
}) {
  const t = S[locale] ?? S.en;
  const next = useRef<HTMLButtonElement>(null);
  const said = useRef<HTMLDivElement>(null);
  // The Send button that had the focus is gone: the focus goes to the next step, or to the words.
  useEffect(() => {
    (next.current ?? said.current)?.focus({ preventScroll: true });
  }, []);
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <Burst emoji={emoji} />
      <span className="text-6xl" aria-hidden="true">{emoji}</span>
      <div ref={said} tabIndex={-1} className="outline-none">
        <p id={titleId} className="mt-5 text-2xl italic" style={{ fontFamily: "var(--font-display)" }}>{withSender(t.sent, senderName)}</p>
        <p className="mt-2 text-sm text-white/60">{t.sentBlurb}</p>
      </div>
      {onSendOneBack ? (
        <button
          ref={next}
          type="button"
          onClick={onSendOneBack}
          disabled={busy}
          aria-busy={busy || undefined}
          // The sheet is dark, so its keyboard ring is a light one (the site's own would not show).
          className="relative mt-7 flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-center text-[15px] leading-snug font-medium text-white hover:bg-white/10 focus-visible:outline-white/60 active:bg-white/15 disabled:cursor-default disabled:bg-white/10"
          data-testid="reaction-reply"
        >
          {busy ? <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" /> : <Sparkles aria-hidden="true" className="size-4 shrink-0" />}
          <span className="min-w-0 [overflow-wrap:anywhere]">{giftString(locale, "sendOneBack", { sender: senderName })}</span>
        </button>
      ) : null}
    </div>
  );
}

function Burst({ emoji }: { emoji: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 text-2xl"
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
          animate={{ x: (Math.cos((i / 14) * Math.PI * 2) * (90 + (i % 3) * 40)), y: (Math.sin((i / 14) * Math.PI * 2) * (90 + (i % 2) * 40)) - 40, opacity: 0, scale: 1.2, rotate: (i % 2 ? 1 : -1) * 40 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: i * 0.02 }}
        >
          {emoji}
        </motion.span>
      ))}
    </div>
  );
}
