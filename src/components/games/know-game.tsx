"use client";

import { useRef, useState } from "react";
import { ArrowRight, Check, Loader2, RotateCcw, Users, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { KnowQuestion } from "@/lib/games/content";
import { knowAnswered, knowFinished, knowQuestion, knowReduce, knowRoundDone, knowScore, newKnow, seedOf, type KnowMove, type KnowState, type PackDeal, type Player } from "@/lib/games/play";
import { reviveKnow } from "@/lib/games/saved";
import { Chip, GameArt, PlayingCard, type SuitName } from "./cards";
import { AfterFlip, RevealCard, faceUpAt, flipAt, flippedAt } from "./flip";
import { GameEnd } from "./game-end";
import { Lobby, PeerGone, type Session } from "./lobby";
import { AdultGate, LobbyShelf, PackSheets, useAdultTap } from "./pack-shelf";
import { usePacks } from "./use-packs";
import { useGame } from "./use-game";
import { useRoom } from "./use-room";
import { Handover, LeaveGame, Waiting } from "./screens";
import { ScreenTop } from "./screen-top";
import { useSynced } from "./use-synced";

const RANKS = ["A", "B", "C", "D"];
const SUITS: SuitName[] = ["heart", "spade", "diamond", "club"];

/** "How well do you know me?": both answer about themselves and guess the other; the guesses score. */
export function KnowGame() {
  const t = useTranslations("games.know");
  const { room, entry, enter, session, start, leave, closed } = useGame("know");
  const shelf = usePacks("know");
  const deal = shelf.playing && shelf.cards?.know ? { pack: shelf.playing, cards: shelf.cards.know } : null;
  return (
    <>
      {!session ? (
        <Lobby title={t("title")} blurb={t("blurb")} art={<GameArt sticker="heart" rank="K" suit="heart" />} room={room} entry={entry} onEnter={enter} onStart={start} setup={<LobbyShelf shelf={shelf} twoPhones />} />
      ) : (
        <KnowPlay key={session.code ?? "one"} session={session} room={room} deal={deal} closed={closed} onChangePlayers={leave} />
      )}
      <PackSheets shelf={shelf} />
    </>
  );
}

function KnowPlay({ session, room, deal, closed, onChangePlayers }: { session: Session; room: ReturnType<typeof useRoom>; deal: PackDeal<KnowQuestion> | null; closed: boolean; onChangePlayers: () => void }) {
  const t = useTranslations("games.know");
  const tl = useTranslations("games.lobby");
  const locale = useLocale() === "es" ? "es" : "en";
  // Fixed for the game's life: on two phones the room code seeds both the same, on one phone the clock does.
  const [seed] = useState(() => seedOf(session.code ?? String(Date.now())));
  const { state, dispatch, restart, waiting, restored, restarting } = useSynced<KnowState, KnowMove>(session, room, (gen) => newKnow(seed, gen, deal), knowReduce, { game: "know", revive: reviveKnow });
  const [adultOk, confirmAdultTap] = useAdultTap();
  // On one phone the two take turns holding it: the first player until they have answered, then
  // the other. On two each is themselves.
  const holder: Player = knowAnswered(state, 0) && !knowRoundDone(state) ? 1 : 0;
  // Back from a reload mid-round, the phone is handed over again: nobody sees a half-answered turn.
  const [handover, setHandover] = useState(() => restored && session.mode === "one" && !knowRoundDone(state) && !knowFinished(state));
  const me: Player = session.mode === "two" ? (session.host ? 0 : 1) : holder;
  const other: Player = me === 0 ? 1 : 0;
  // A pick belongs to one round of one game; a new round or a restart clears it without an effect.
  const roundKey = `${state.gen}:${state.round}:${me}`;
  const [pick, setPick] = useState<{ key: string; self: number | null; guess: number | null }>({ key: "", self: null, guess: null });
  const self = pick.key === roundKey ? pick.self : null;
  const guess = pick.key === roundKey ? pick.guess : null;
  // Picking your own answer brings in the second question under it, below the fold on a phone:
  // the first pick of a turn scrolls "Lock it in" into view, and with it the new question above.
  const lockIn = useRef<HTMLButtonElement>(null);
  const setSelf = (n: number) => {
    const first = self === null;
    setPick({ key: roundKey, self: n, guess });
    if (!first) return;
    requestAnimationFrame(() => {
      const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      lockIn.current?.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
    });
  };
  const setGuess = (n: number) => setPick({ key: roundKey, self, guess: n });
  const peerGone = <PeerGone session={session} room={room} closed={closed} onLeave={onChangePlayers} />;

  if (waiting) return <Waiting text={t("waitingHost")} peerGone={peerGone} />;
  if (session.mode === "two" && !session.host && state.pack && !adultOk(state.pack)) return <AdultGate pack={state.pack} host={session.names[0]} onYes={confirmAdultTap} onLeave={onChangePlayers} />;
  const question = knowQuestion(state);
  const score = knowScore(state);
  const round = state.round + 1;
  const total = state.order.length;
  const scores = (
    <div className="ml-auto flex items-start gap-4">
      {([0, 1] as const).map((p) => (
        <Chip key={p} value={score[p]} tone={p === 0 ? "rose" : "lilac"} label={session.names[p]} />
      ))}
    </div>
  );

  const again = () => {
    restart();
    setHandover(false);
  };

  if (knowFinished(state) || !question) {
    const both = score[0] + score[1];
    const verdict = both >= total * 1.5 ? t("end.great") : both >= total ? t("end.good") : t("end.ok");
    return (
      <section className="container-narrow py-12 text-center sm:py-16">
        <ScreenTop screen={`end:${state.gen}`} />
        {peerGone}
        <p className="text-eyebrow text-blush">{t("end.eyebrow")}</p>
        <h1 className="mt-3 display-xl text-cream">{verdict}</h1>
        {/* The total rides in the chip, like the other games' end screens: in the label it was the
            part a longer name pushed out of sight. */}
        <div className="mt-9 flex justify-center gap-8 sm:gap-10">
          {([0, 1] as const).map((p) => (
            <Chip key={p} size="lg" value={`${score[p]}/${total}`} tone={p === 0 ? "rose" : "lilac"} label={session.names[p]} active={score[p] > score[p === 0 ? 1 : 0]} />
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-md text-[15px] leading-relaxed text-cream/70">{t("end.sub")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {!closed ? (
            <button type="button" onClick={again} disabled={restarting} className="btn-rose inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold disabled:opacity-70">
              {restarting ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <RotateCcw aria-hidden="true" className="size-4" />}
              {t("end.again")}
            </button>
          ) : null}
          <button type="button" onClick={onChangePlayers} className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-[15px] font-semibold text-cream hover:bg-white/10">
            <Users aria-hidden="true" className="size-4" />
            {tl("change")}
          </button>
        </div>
        <GameEnd guest={session.mode === "two" && !session.host} />
      </section>
    );
  }

  // One phone, between turns: a card nobody should peek under.
  if (session.mode === "one" && handover) {
    return <Handover eyebrow={t("round", { n: round, total })} title={t("handTo", { name: session.names[holder] })} note={t("noPeeking")} button={t("imHere", { name: session.names[holder] })} onGo={() => setHandover(false)} />;
  }

  if (knowRoundDone(state)) {
    const a = state.answers[0][question.id];
    const b = state.answers[1][question.id];
    return (
      <section className="container-narrow py-10 sm:py-14">
        <ScreenTop screen={`reveal:${state.gen}:${round}`} />
        {peerGone}
        {/* Wraps rather than squeezing: two long names' chips would leave the question a column one word wide. */}
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 flex-[1_1_11rem]">
            <p className="text-eyebrow text-blush">{t("round", { n: round, total })}</p>
            <h1 className="mt-2 display-md text-cream">{question.prompt[locale]}</h1>
          </div>
          {/* This round's points are already in the scores: they wait for the cards, like the verdicts under them. */}
          <AfterFlip delay={flippedAt(2)} className="ml-auto">
            {scores}
          </AfterFlip>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {([0, 1] as const).map((p) => {
            const own = p === 0 ? a : b;
            const theirGuess = p === 0 ? b : a;
            const right = theirGuess.guess === own.self;
            return (
              <div key={p}>
                {/* The height goes on the face: the card is a plain block here, not a stretched grid
                    cell, so a height on the outer card never reached the face and left a gap under it. */}
                <RevealCard delay={flipAt(p)} rank={RANKS[own.self]} suit={SUITS[own.self]} back={p === 0 ? "rose" : "lilac"} backLabel={<span className="rounded-full bg-cream/95 px-3 py-1 text-[13px] font-semibold text-forest">{session.names[p]}</span>} faceClassName="min-h-[170px] items-center justify-center px-8 py-8 text-center">
                  <span className="text-[12px] font-semibold tracking-[0.16em] text-forest/55 uppercase">{t("reveal.said", { name: session.names[p] })}</span>
                  <span className="mt-2 font-display text-[24px] leading-tight">{question.options[own.self][locale]}</span>
                </RevealCard>
                <AfterFlip delay={faceUpAt(p)}>
                  <p className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold", right ? "bg-moss-soft text-moss" : "bg-white/10 text-cream")}>
                    {right ? <Check aria-hidden="true" className="size-3.5" /> : <X aria-hidden="true" className="size-3.5" />}
                    {right ? t("reveal.right", { name: session.names[p === 0 ? 1 : 0] }) : t("reveal.wrong", { name: session.names[p === 0 ? 1 : 0], answer: question.options[theirGuess.guess][locale] })}
                  </p>
                </AfterFlip>
              </div>
            );
          })}
        </div>
        <AfterFlip delay={flippedAt(2)}>
          <p className="mt-6 text-[14px] text-cream/60">{t("score", { a: session.names[0], sa: score[0], b: session.names[1], sb: score[1] })}</p>
        </AfterFlip>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "next" });
            if (session.mode === "one") setHandover(true);
          }}
          className="btn-rose mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold"
        >
          {round < total ? t("next") : t("results")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </section>
    );
  }

  if (knowAnswered(state, me)) return <Waiting text={session.mode === "two" ? t("waitingFor", { name: session.names[other] }) : t("handTo", { name: session.names[other] })} peerGone={peerGone} />;

  const submit = () => {
    if (self === null || guess === null) return;
    dispatch({ type: "answer", player: me, self, guess });
    if (session.mode === "one" && me === 0) setHandover(true);
  };

  return (
    <section className="container-narrow py-10 sm:py-14">
      <ScreenTop screen={`ask:${state.gen}:${round}:${me}`} />
      {peerGone}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <p className="min-w-0 flex-[1_1_11rem] text-eyebrow text-blush">
          {t("round", { n: round, total })} · {session.names[me]}
        </p>
        {scores}
      </div>
      <PlayingCard key={roundKey} rank={String(round)} suit="heart" corners="lg" className="deal-in mx-auto mt-6 w-full max-w-[560px]" faceClassName="min-h-[170px] items-center justify-center px-12 py-10 text-center">
        <h1 className="font-display text-[27px] leading-tight sm:text-[33px]">{question.prompt[locale]}</h1>
      </PlayingCard>
      <Hand label={t("yourAnswer")} options={question.options.map((o) => o[locale])} value={self} onChange={setSelf} tone="blush" />
      {self !== null ? <Hand label={t("theirAnswer", { name: session.names[other] })} options={question.options.map((o) => o[locale])} value={guess} onChange={setGuess} tone="lilac" /> : null}
      <button ref={lockIn} type="button" disabled={self === null || guess === null} onClick={submit} className="btn-rose mt-7 inline-flex h-12 scroll-mb-6 items-center gap-2 rounded-full px-7 text-[15px] font-semibold disabled:bg-none disabled:bg-white/10 disabled:text-cream/45 disabled:shadow-none">
        {t("lockIn")}
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>
      {session.mode === "one" ? <LeaveGame label={tl("change")} onLeave={onChangePlayers} /> : null}
    </section>
  );
}

/** Four answers as a hand of cards. The chosen one lifts out of the hand. */
function Hand({ label, options, value, onChange, tone }: { label: string; options: string[]; value: number | null; onChange: (n: number) => void; tone: "blush" | "lilac" }) {
  return (
    <fieldset className="mt-7">
      <legend className="text-[13px] font-semibold tracking-wide text-cream/70">{label}</legend>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {options.map((text, i) => {
          const on = value === i;
          return (
            <button key={i} type="button" aria-pressed={on} onClick={() => onChange(i)} className="group block rounded-[16px] text-left">
              <PlayingCard rank={RANKS[i]} suit={SUITS[i]} corners="sm" radius={16} tone={on ? tone : "cream"} className={cn("h-full transition-transform duration-300 ease-(--ease-out-quint)", on ? "-translate-y-2" : "group-hover:-translate-y-1")} faceClassName={cn("min-h-[112px] items-center justify-center px-5 py-6 text-center", on && (tone === "blush" ? "ring-[3px] ring-rose" : "ring-[3px] ring-[#5B4FB0]"))}>
                <span className="text-[14.5px] leading-snug font-semibold">{text}</span>
                {on ? (
                  <span className={cn("absolute top-2 right-2 grid size-6 place-items-center rounded-full text-white", tone === "blush" ? "bg-rose" : "bg-[#5B4FB0]")}>
                    <Check aria-hidden="true" className="size-3.5" />
                  </span>
                ) : null}
              </PlayingCard>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
