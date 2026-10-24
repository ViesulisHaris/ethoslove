"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Share, X } from "lucide-react";

/**
 * Not "Keep this gift": that is the end screen's link to have the gift's link emailed (lib/keep),
 * and both show at the end of a gift on an iPhone.
 */
const S = {
  en: { tip: "Save it to your phone: tap Share, then “Add to Home Screen”.", close: "Close" },
  es: { tip: "Tenlo en tu móvil: toca Compartir y luego «Añadir a pantalla de inicio».", close: "Cerrar" },
};

/** iOS Safari only — the one browser with no install prompt of its own. */
export function HomeScreenTip({ locale, onReplay }: { locale: "en" | "es"; onReplay?: () => void }) {
  const isIosSafari = typeof navigator !== "undefined" && /iPhone|iPad/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches;
  const [open, setOpen] = useState(isIosSafari);
  void onReplay;
  return (
    <AnimatePresence>
      {open ? (
        // At the top, left of the sound button: at the bottom it sat over the end screen's buttons on
        // the templates that end at the foot of the screen.
        <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }} className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-16 left-4 z-[75] flex items-center gap-3 rounded-2xl bg-white/95 p-3 text-sm text-ink shadow-lift backdrop-blur">
          <Share className="size-4 shrink-0 text-coral" />
          <span className="flex-1">{(S[locale] ?? S.en).tip}</span>
          <button type="button" onClick={() => setOpen(false)} className="-m-1.5 grid size-11 place-items-center rounded-full hover:bg-ink/5" aria-label={(S[locale] ?? S.en).close}>
            <X className="size-4" />
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
