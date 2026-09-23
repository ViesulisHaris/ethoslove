"use client";

import { useEffect, useState } from "react";
import { ArrowRight, RotateCcw, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DARES, TRUTHS } from "@/lib/games/content";
import { PACKS, type PackId } from "@/lib/games/packs";
import { shuffle } from "@/lib/games/play";
import { readSaved, reviveDare, savedKey, tabStorage, writeSaved, type DareTable } from "@/lib/games/saved";
import { GameArt, PlayingCard, type BackTone } from "./cards";
import { GameEnd } from "./game-end";
import { Lobby } from "./lobby";
import { LobbyShelf, PackSheets } from "./pack-shelf";
import { ScreenTop } from "./screen-top";
import { LeaveGame } from "./screens";
import { useGame } from "./use-game";
import { usePacks } from "./use-packs";

type L = { en: string; es: string };
type Decks = { pack: PackId; truths: L[]; dares: L[] };

/** Truth or dare, the soft edition: two decks on the table, the phone goes round, no card twice until it must. */
export function Dare() {
  const t = useTranslations("games.dare");
  const { room, entry, enter, session, start, leave } = useGame("dare", { twoPhones: false });
  const shelf = usePacks("dare");
  const decks: Decks | null = shelf.playing && shelf.cards?.truths && shelf.cards.dares ? { pack: shelf.playing, truths: shelf.cards.truths, dares: shelf.cards.dares } : null;
  return (
    <>
      {!session ? (
        <Lobby room={room} entry={entry} onEnter={enter} onePhoneOnly title={t("title")} blurb={t("blurb")} art={<GameArt sticker="kiss" rank="J" suit="spade" />} onStart={start} setup={<LobbyShelf shelf={shelf} />} />
      ) : (
        <Cards key={decks?.pack ?? "classic"} names={session.names} decks={decks} onChangePlayers={leave} />
      )}
      <PackSheets shelf={shelf} />
    </>
  );
}

function Deck({ label, tone, tilt, onDraw, left }: { label: string; tone: BackTone; tilt: 1 | -1; onDraw: () => void; left: string }) {
  return (
    <button type="button" aria-label={label} onClick={onDraw} className="group block w-full">
      {/* The stack sits behind the top card only, not behind the count under it. */}
      <span className="relative block">
        {[3, 2, 1].map((n) => (
          <span key={n} aria-hidden="true" className="absolute inset-0" style={{ translate: `${n * 3}px ${n * 4}px`, rotate: `${n * 1.2 * tilt}deg` }}>
            <PlayingCard faceDown back={tone} className="size-full" />
          </span>
        ))}
        <PlayingCard faceDown back={tone} className="relative aspect-[5/7] w-full transition-transform duration-300 ease-(--ease-out-quint) group-hover:-translate-y-3 group-hover:rotate-[-2deg]" backLabel={<span className="rounded-full bg-cream/95 px-4 py-1.5 font-display text-[22px] text-forest shadow">{label}</span>} />
      </span>
      <span className="mt-5 block text-center text-[12.5px] font-semibold text-cream/55">{left}</span>
    </button>
  );
}

const SAVED = savedKey("dare", "play");

function Cards({ names, decks, onChangePlayers }: { names: [string, string]; decks: Decks | null; onChangePlayers: () => void }) {
  const t = useTranslations("games.dare");
  const tl = useTranslations("games.lobby");
  const locale = useLocale() === "es" ? "es" : "en";
  const pack = decks?.pack ?? null;
  // The table as it was before a reload: the same shuffle, whose turn, how far each deck has gone.
  // Only for the same deck: a pack is opened again from the shelf after a reload, and until then the
  // free decks are on the table, whose cards are different ones.
  const [kept] = useState(() => {
    const table = readSaved(tabStorage(), SAVED, reviveDare);
    return table && table.pack === pack ? table : null;
  });
  const [seed, setSeed] = useState(() => kept?.seed ?? Math.floor(Math.random() * 1e9));
  const [turn, setTurn] = useState<0 | 1>(kept?.turn ?? 0);
  const [used, setUsed] = useState(kept?.used ?? { truth: 0, dare: 0 });
  // The card on the table, by deck and number; its words come from the deck, in today's language.
  const [card, setCard] = useState<DareTable["card"]>(kept?.card ?? null);
  // Truth or dare has no last round: it ends when both decks have gone round once, or when they say so.
  const [stopped, setStopped] = useState(kept?.stopped ?? false);
  useEffect(() => writeSaved(tabStorage(), SAVED, { pack, seed, turn, used, card, stopped } satisfies DareTable), [pack, seed, turn, used, card, stopped]);
  const allTruths = decks?.truths ?? TRUTHS;
  const allDares = decks?.dares ?? DARES;
  const truths = shuffle(allTruths, seed);
  const dares = shuffle(allDares, seed + 1);
  const over = stopped || (used.truth >= allTruths.length && used.dare >= allDares.length);
  const cardText = card ? (card.kind === "truth" ? truths : dares)[(card.n - 1) % (card.kind === "truth" ? truths : dares).length][locale] : "";

  const draw = (kind: "truth" | "dare") => {
    const n = used[kind];
    setCard({ kind, n: n + 1 });
    setUsed({ ...used, [kind]: n + 1 });
  };
  const left = (kind: "truth" | "dare") => {
    const size = kind === "truth" ? allTruths.length : allDares.length;
    return t("left", { n: size - (used[kind] % size) });
  };
  const again = () => {
    setSeed((s) => s + 1);
    setUsed({ truth: 0, dare: 0 });
    setTurn(0);
    setCard(null);
    setStopped(false);
  };

  if (over && !card) {
    return (
      <section className="container-narrow py-12 text-center sm:py-16">
        <ScreenTop screen={`end:${seed}`} />
        <p className="text-eyebrow text-blush">{t("end.eyebrow")}</p>
        <h1 className="mt-3 display-xl text-cream">{t("end.title", { truths: used.truth, dares: used.dare })}</h1>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-cream/70">{t("end.sub")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={again} className="btn-rose inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold">
            <RotateCcw aria-hidden="true" className="size-4" />
            {t("end.again")}
          </button>
          <button type="button" onClick={onChangePlayers} className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-[15px] font-semibold text-cream hover:bg-white/10">
            <Users aria-hidden="true" className="size-4" />
            {tl("change")}
          </button>
        </div>
        <GameEnd />
      </section>
    );
  }

  return (
    <section className="container-narrow py-10 text-center sm:py-14">
      <ScreenTop screen={card ? `card:${card.kind}:${card.n}` : `pick:${turn}`} />
      <p className="text-eyebrow text-blush">{t("turn", { name: names[turn] })}</p>
      {card ? (
        <>
          <PlayingCard key={`${card.kind}${card.n}`} rank={card.kind === "truth" ? "T" : "D"} suit={card.kind === "truth" ? "spade" : "heart"} corners="lg" radius={26} tone={card.kind === "truth" ? "lilac" : "blush"} className="deal-in mx-auto mt-6 w-full max-w-[420px]" faceClassName="min-h-[400px] justify-between px-9 py-12 text-left">
            <span className="text-[12px] font-semibold tracking-[0.18em] text-forest/55 uppercase">{t(card.kind)}</span>
            <span className="font-display text-[29px] leading-[1.14] sm:text-[33px]" aria-live="polite">
              {cardText}
            </span>
            <span className="text-[13px] text-forest/55">{t("for", { name: names[turn] })}</span>
          </PlayingCard>
          <button
            type="button"
            onClick={() => {
              setCard(null);
              setTurn(turn === 0 ? 1 : 0);
            }}
            className="btn-rose mt-7 inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold"
          >
            {t("done", { name: names[turn === 0 ? 1 : 0] })}
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </>
      ) : (
        <>
          <h1 className="mt-3 display-xl text-cream">{t("pick", { name: names[turn] })}</h1>
          <div className="mx-auto mt-10 grid max-w-md grid-cols-2 gap-8 px-3">
            <Deck label={t("truth")} tone="lilac" tilt={-1} left={left("truth")} onDraw={() => draw("truth")} />
            <Deck label={t("dare")} tone={decks ? PACKS[decks.pack].back : "rose"} tilt={1} left={left("dare")} onDraw={() => draw("dare")} />
          </div>
          <p className="mt-8 text-[13px] text-cream/50">{decks ? t("softPack", { name: PACKS[decks.pack].name[locale], n: allTruths.length }) : t("soft")}</p>
          {/* Once a card is out, "done for tonight" leads to the end, and "change players" is there. */}
          {used.truth + used.dare > 0 ? (
            <button type="button" onClick={() => setStopped(true)} className="mt-4 h-11 rounded-full px-5 text-[14px] font-semibold text-cream/70 underline-offset-4 hover:text-cream hover:underline">
              {t("finish")}
            </button>
          ) : (
            <LeaveGame label={tl("change")} onLeave={onChangePlayers} />
          )}
        </>
      )}
    </section>
  );
}
