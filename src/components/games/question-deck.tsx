"use client";

import { useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { DECK_IDS, DECKS, shuffled, type DeckId } from "@/lib/games/questions";

/**
 * The first game, and the simplest there is: a deck of questions, one phone, two people. Tap for
 * the next card; whoever is holding the phone reads it out and both answer. The order is shuffled
 * once per sitting, so going back and forth between decks does not repeat a card.
 */
export function QuestionDeck() {
  const t = useTranslations("games.deck");
  const locale = useLocale() === "es" ? "es" : "en";
  const reduced = useReducedMotion();
  const [deckId, setDeckId] = useState<DeckId>("light");
  const [seed, setSeed] = useState(1);
  const [at, setAt] = useState<Record<DeckId, number>>({ light: 0, deep: 0, apart: 0 });
  const deck = DECKS[deckId];
  const order = shuffled(deck.cards.length, seed * 7919 + DECK_IDS.indexOf(deckId));
  const index = at[deckId];
  const done = index >= deck.cards.length;
  const card = done ? null : deck.cards[order[index]];
  const eyebrow = done ? t("doneEyebrow") : t("count", { n: index + 1, total: deck.cards.length });
  const question = card ? card[locale] : t("done");
  const action = done ? t("again") : t("next");

  return (
    <div className="mx-auto w-full max-w-[440px]">
      <div className="flex justify-center gap-1.5" role="group" aria-label={t("choose")}>
        {DECK_IDS.map((id) => (
          <button key={id} type="button" aria-pressed={id === deckId} onClick={() => setDeckId(id)} className={cn("h-10 rounded-full px-4 text-[13.5px] font-semibold transition-colors", id === deckId ? "text-white" : "bg-white text-forest/75 ring-1 ring-forest/10 hover:bg-forest/5")} style={id === deckId ? { background: DECKS[id].ink } : undefined}>
            {DECKS[id].name[locale]}
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-[13.5px] text-forest/55">{deck.blurb[locale]}</p>

      <div className="relative mt-6 aspect-[4/5]">
        {/* the rest of the deck, underneath */}
        <span aria-hidden="true" className="absolute inset-0 translate-y-3 rotate-3 rounded-[30px] opacity-60" style={{ background: deck.to }} />
        <span aria-hidden="true" className="absolute inset-0 translate-y-1.5 -rotate-2 rounded-[30px] opacity-80" style={{ background: deck.to }} />
        {/* The cards are scenery: one steady button on top does the dealing, and a live region reads each
            question out, so a screen reader hears one control and one sentence rather than a pile of buttons. */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`${deckId}-${seed}-${index}`}
            aria-hidden="true"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 26, rotate: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -220, rotate: -14 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="absolute inset-0 flex flex-col overflow-hidden rounded-[30px] p-7 text-left shadow-lift"
            style={{ background: `linear-gradient(160deg, ${deck.from} 0%, ${deck.to} 100%)` }}
          >
            <span className="grain-overlay opacity-[0.12] mix-blend-overlay" />
            <span className="relative text-[12px] font-semibold tracking-[0.18em] uppercase" style={{ color: deck.ink }}>
              {eyebrow}
            </span>
            <span className="relative my-auto font-display text-[30px] leading-[1.12] text-forest sm:text-[34px]">{question}</span>
            <span className="relative inline-flex items-center gap-2 text-[14px] font-semibold" style={{ color: deck.ink }}>
              {done ? <RotateCcw className="size-4" /> : <ArrowRight className="size-4" />}
              {action}
            </span>
          </motion.div>
        </AnimatePresence>
        <button
          type="button"
          aria-label={`${eyebrow}. ${question} ${action}`}
          onClick={() => {
            if (!done) return setAt((a) => ({ ...a, [deckId]: index + 1 }));
            setSeed((n) => n + 1);
            setAt((a) => ({ ...a, [deckId]: 0 }));
          }}
          className="absolute inset-0 rounded-[30px]"
        />
        <p className="sr-only" aria-live="polite">
          {question}
        </p>
      </div>
      <p className="mt-6 text-center text-[13px] text-forest/50">{t("how")}</p>
    </div>
  );
}
