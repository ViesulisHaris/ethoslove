"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, X } from "lucide-react";
import type { GiftLocale } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import { VoiceRecorder } from "./voice-recorder";

const EMOJI = ["❤️", "😭", "🥹", "😂", "😮"] as const;

const S = {
  en: { title: "Send {sender} a reaction", blurb: "They'll get it right away.", placeholder: "Say something back (optional)", send: "Send", sending: "Sending…", sent: "Sent to {sender}.", sentBlurb: "They'll see it the next time they open their gifts.", close: "Close", error: "Couldn't send. Try again in a moment." },
  es: { title: "Envíale una reacción a {sender}", blurb: "Le llegará al momento.", placeholder: "Responde algo (opcional)", send: "Enviar", sending: "Enviando…", sent: "Enviado a {sender}.", sentBlurb: "Lo verá la próxima vez que abra sus regalos.", close: "Cerrar", error: "No se pudo enviar. Inténtalo en un momento." },
};

export function ReactionSheet({ open, onClose, shortId, senderName, locale }: { open: boolean; onClose: () => void; shortId: string; senderName: string; locale: GiftLocale }) {
  const t = S[locale] ?? S.en;
  const [emoji, setEmoji] = useState<(typeof EMOJI)[number]>("❤️");
  const [text, setText] = useState("");
  const [audio, setAudio] = useState<Blob | null>(null);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [burst, setBurst] = useState(0);

  const send = async () => {
    setState("sending");
    const form = new FormData();
    form.set("emoji", emoji);
    form.set("text", text);
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
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative w-full max-w-md rounded-t-3xl bg-[#1e1a17] p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-paper shadow-2xl sm:rounded-3xl"
          >
            <button type="button" onClick={onClose} aria-label={t.close} className="absolute top-4 right-4 grid size-9 place-items-center rounded-full bg-white/8 text-white/70">
              <X className="size-4" />
            </button>
            {state === "sent" ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Burst key={burst} emoji={emoji} />
                <span className="text-6xl">{emoji}</span>
                <p className="mt-5 text-2xl italic" style={{ fontFamily: "var(--font-display)" }}>{t.sent.replace("{sender}", senderName)}</p>
                <p className="mt-2 text-sm text-white/60">{t.sentBlurb}</p>
              </div>
            ) : (
              <>
                <p className="pr-10 text-2xl italic" style={{ fontFamily: "var(--font-display)" }}>{t.title.replace("{sender}", senderName)}</p>
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
                {state === "error" ? <p className="mt-3 text-sm text-coral">{t.error}</p> : null}
                <button type="button" onClick={send} disabled={state === "sending"} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-coral text-[15px] font-semibold text-paper shadow-glow disabled:opacity-60">
                  {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : null}
                  {state === "sending" ? t.sending : `${t.send} ${emoji}`}
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
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
