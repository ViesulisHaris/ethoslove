"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PlayingCard, type BackTone } from "./cards";
import { DECK_IDS, DECKS, shuffled, type DeckId } from "@/lib/games/questions";

const BACK: Record<DeckId, BackTone> = { light: "rose", deep: "lilac", apart: "ocean" };

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
    <div className="mx-auto w-full max-w-[460px]">
      <div className="grid grid-cols-3 gap-3" role="group" aria-label={t("choose")}>
        {DECK_IDS.map((id) => (
          <button key={id} type="button" aria-pressed={id === deckId} onClick={() => setDeckId(id)} className="group block text-center">
            <PlayingCard faceDown back={BACK[id]} radius={12} className={cn("mx-auto aspect-[5/7] w-[72%] transition-transform duration-300 ease-(--ease-out-quint)", id === deckId ? "-translate-y-2 rotate-[-3deg]" : "opacity-70 group-hover:-translate-y-1 group-hover:opacity-100")} />
            <span className={cn("mt-2 block text-[13.5px] font-semibold", id === deckId ? "text-cream" : "text-cream/60")}>{DECKS[id].name[locale]}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-center text-[13.5px] text-cream/55">{deck.blurb[locale]}</p>

      <div className="relative mt-7 aspect-[4/5]">
        {/* the rest of the deck, underneath */}
        <span aria-hidden="true" className="absolute inset-0 translate-y-3 rotate-3">
          <PlayingCard faceDown back={BACK[deckId]} radius={30} className="size-full" />
        </span>
        <span aria-hidden="true" className="absolute inset-0 translate-y-1.5 -rotate-2">
          <PlayingCard faceDown back={BACK[deckId]} radius={30} className="size-full" />
        </span>
        {/* The cards are scenery: one steady button on top does the dealing, and a live region reads each
            question out, so a screen reader hears one control and one sentence rather than a pile of buttons. */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`${deckId}-${seed}-${index}`}
            aria-hidden="true"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 26, rotate: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -240, rotate: -16 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="absolute inset-0"
          >
            <PlayingCard rank={done ? "★" : String(index + 1)} suit="heart" corners="lg" radius={30} className="size-full" faceClassName="justify-between px-9 py-14 text-left">
              <span className="text-[12px] font-semibold tracking-[0.18em] text-rose-deep uppercase">{eyebrow}</span>
              <span className="font-display text-[29px] leading-[1.12] sm:text-[33px]">{question}</span>
              <span className="text-[14px] font-semibold text-rose-deep">{action}</span>
            </PlayingCard>
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
    </div>
  );
}
