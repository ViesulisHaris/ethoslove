"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { PlayingCard, type BackTone } from "./cards";
import { GameEnd } from "./game-end";
import { PackSheets, PackStatus } from "./pack-shelf";
import { usePacks } from "./use-packs";
import { DECK_IDS, DECKS, shuffled, type DeckId } from "@/lib/games/questions";
import { PACK_IDS, PACKS } from "@/lib/games/packs";

const BACK: Record<DeckId, BackTone> = { light: "rose", deep: "lilac", apart: "ocean" };

/**
 * The first game, and the simplest there is: a deck of questions, one phone, two people. Tap for
 * the next card; whoever is holding the phone reads it out and both answer. The order is shuffled
 * once per sitting, so going back and forth between decks does not repeat a card.
 *
 * The three free decks come first; the packs sit under the card, a shelf of their own.
 */
export function QuestionDeck() {
  const t = useTranslations("games.deck");
  const tp = useTranslations("packs");
  const locale = useLocale() === "es" ? "es" : "en";
  const reduced = useReducedMotion();
  const shelf = usePacks("deck");
  const [deckId, setDeckId] = useState<DeckId>("light");
  const [seed, setSeed] = useState(1);
  // Where each deck is up to, free decks and packs alike, keyed "light" or "pack:deep".
  const [at, setAt] = useState<Record<string, number>>({});
  const pack = shelf.playing && shelf.cards?.deck ? { id: shelf.playing, cards: shelf.cards.deck } : null;
  const key = pack ? `pack:${pack.id}` : deckId;
  const cards = pack ? pack.cards : DECKS[deckId].cards;
  const back: BackTone = pack ? PACKS[pack.id].back : BACK[deckId];
  // Packs shuffle on their own offsets, clear of the free decks', so no two decks share an order.
  const offset = pack ? DECK_IDS.length + PACK_IDS.indexOf(pack.id) : DECK_IDS.indexOf(deckId);
  const order = shuffled(cards.length, seed * 7919 + offset);
  const index = at[key] ?? 0;
  const done = index >= cards.length;
  const card = done ? null : cards[order[index]];
  const eyebrow = done ? t("doneEyebrow") : t("count", { n: index + 1, total: cards.length });
  const question = card ? card[locale] : t("done");
  const action = done ? t("again") : t("next");

  // A pack opens from the shelf under the card, often scrolled below it: bring the card back up.
  const table = useRef<HTMLDivElement>(null);
  const opened = pack?.id ?? null;
  useEffect(() => {
    if (!opened) return;
    table.current?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "center" });
  }, [opened, reduced]);

  return (
    <div className="mx-auto w-full max-w-[460px]">
      <div className="grid grid-cols-3 gap-3" role="group" aria-label={t("choose")}>
        {DECK_IDS.map((id) => {
          const on = !pack && id === deckId;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => {
                shelf.clear();
                setDeckId(id);
              }}
              className="group block text-center"
            >
              {/* Smaller on a phone: the three backs sit above the question, which should start on the first screen. */}
              <PlayingCard faceDown back={BACK[id]} radius={12} className={cn("mx-auto aspect-[5/7] w-[52%] transition-transform duration-300 ease-(--ease-out-quint) sm:w-[72%]", on ? "-translate-y-2 rotate-[-3deg]" : "opacity-70 group-hover:-translate-y-1 group-hover:opacity-100")} />
              <span className={cn("mt-2 block text-[13.5px] font-semibold", on ? "text-cream" : "text-cream/60")}>{DECKS[id].name[locale]}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[13.5px] text-cream/55">{pack ? PACKS[pack.id].blurb[locale] : DECKS[deckId].blurb[locale]}</p>

      <div ref={table} className="relative mt-5 aspect-[4/5] scroll-mt-28 sm:mt-7">
        {/* the rest of the deck, underneath */}
        <span aria-hidden="true" className="absolute inset-0 translate-y-3 rotate-3">
          <PlayingCard faceDown back={back} radius={30} className="size-full" />
        </span>
        <span aria-hidden="true" className="absolute inset-0 translate-y-1.5 -rotate-2">
          <PlayingCard faceDown back={back} radius={30} className="size-full" />
        </span>
        {/* The cards are scenery: one steady button on top does the dealing, and a live region reads each
            question out, so a screen reader hears one control and one sentence rather than a pile of buttons. */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`${key}-${seed}-${index}`}
            aria-hidden="true"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 26, rotate: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -240, rotate: -16 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="absolute inset-0"
          >
            <PlayingCard rank={done ? "★" : String(index + 1)} suit="heart" corners="lg" radius={30} className="size-full" faceClassName="justify-between px-9 py-14 text-left">
              <span className="text-[12px] font-semibold tracking-[0.18em] text-rose-deep uppercase">{pack ? `${PACKS[pack.id].name[locale]} · ${eyebrow}` : eyebrow}</span>
              <span className="font-display text-[29px] leading-[1.12] sm:text-[33px]">{question}</span>
              <span className="text-[14px] font-semibold text-rose-deep">{action}</span>
            </PlayingCard>
          </motion.div>
        </AnimatePresence>
        <button
          type="button"
          aria-label={`${eyebrow}. ${question} ${action}`}
          onClick={() => {
            if (!done) return setAt((a) => ({ ...a, [key]: index + 1 }));
            setSeed((n) => n + 1);
            setAt((a) => ({ ...a, [key]: 0 }));
          }}
          className="absolute inset-0 rounded-[30px]"
        />
        <p className="sr-only" aria-live="polite">
          {question}
        </p>
      </div>

      {done ? <GameEnd /> : null}

      {shelf.ids.length > 0 ? (
        <div id="packs" className="mt-12 scroll-mt-28" data-tour="packs">
          <p id="packs-deck" className="text-center text-eyebrow text-blush">
            {tp("title")}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3" role="group" aria-labelledby="packs-deck">
            {shelf.ids.map((id) => {
              const on = pack?.id === id;
              return (
                // A column, with the price pushed to the bottom: a name that wraps on a phone
                // ("Después de un año") left its price a line lower than the other two.
                <button key={id} type="button" aria-pressed={on} onClick={() => shelf.pick(id)} className="group flex flex-col text-center">
                  <PlayingCard faceDown back={PACKS[id].back} radius={12} className={cn("mx-auto aspect-[5/7] w-[72%] transition-transform duration-300 ease-(--ease-out-quint)", on ? "-translate-y-2 rotate-[-3deg]" : "opacity-80 group-hover:-translate-y-1 group-hover:opacity-100")} backLabel={PACKS[id].adult ? <span className="rounded-full bg-cream/95 px-2 py-0.5 text-[11px] font-bold text-forest">18+</span> : undefined} />
                  <span className={cn("mt-2 block text-[13.5px] leading-tight font-semibold", on ? "text-cream" : "text-cream/75")}>{PACKS[id].name[locale]}</span>
                  <span className="mt-auto flex min-h-4 items-center justify-center gap-1 pt-1 text-[12px] leading-tight text-cream/55">
                    <PackStatus shelf={shelf} id={id} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      <PackSheets shelf={shelf} />
    </div>
  );
}
