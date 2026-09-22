/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2, RotateCcw, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { HERO_ART } from "@/lib/dates/art";
import { KNOW_QUESTIONS } from "@/lib/games/content";
import { knowAnswered, knowFinished, knowQuestion, knowReduce, knowRoundDone, knowScore, newKnow, seedOf, type KnowMove, type KnowState, type Player } from "@/lib/games/play";
import { Lobby, useGameRoom, type Session } from "./lobby";
import { useRoom } from "./use-room";
import { useSynced } from "./use-synced";

/** "How well do you know me?": both answer about themselves and guess the other; the guesses score. */
export function KnowGame() {
  const t = useTranslations("games.know");
  const { room, entry, setEntry } = useGameRoom();
  const [session, setSession] = useState<Session | null>(null);
  if (!session) return <Lobby title={t("title")} blurb={t("blurb")} art={<img src={HERO_ART.games} alt="" width={1800} height={1350} className="aspect-[4/3] w-full rotate-[-2deg] rounded-[32px] object-cover shadow-lift ring-8 ring-white" />} room={room} entry={entry} onEnter={setEntry} onStart={setSession} />;
  return (
    <KnowPlay
      key={session.code ?? "one"}
      session={session}
      room={room}
      onAgain={() => {
        setSession(null);
        setEntry(null);
      }}
    />
  );
}

function KnowPlay({ session, room, onAgain }: { session: Session; room: ReturnType<typeof useRoom>; onAgain: () => void }) {
  const t = useTranslations("games.know");
  const locale = useLocale() === "es" ? "es" : "en";
  // Fixed for the game's life: on two phones the room code seeds both the same, on one phone the clock does.
  const [seed] = useState(() => seedOf(session.code ?? String(Date.now())));
  const { state, dispatch, waiting } = useSynced<KnowState, KnowMove>(session, room, () => newKnow(seed), knowReduce);
  // On one phone the two take turns holding it; on two each is themselves.
  const [holder, setHolder] = useState<Player>(0);
  const [handover, setHandover] = useState(false);
  const me: Player = session.mode === "two" ? (session.host ? 0 : 1) : holder;
  const other: Player = me === 0 ? 1 : 0;
  const [self, setSelf] = useState<number | null>(null);
  const [guess, setGuess] = useState<number | null>(null);

  if (waiting) return <Waiting text={t("waitingHost")} />;
  const question = knowQuestion(state);
  const score = knowScore(state);

  if (knowFinished(state) || !question) {
    const total = state.order.length;
    const verdict = score[0] + score[1] >= total * 1.5 ? t("end.great") : score[0] + score[1] >= total ? t("end.good") : t("end.ok");
    return (
      <section className="container-narrow py-12 text-center sm:py-16">
        <p className="text-eyebrow text-lilac">{t("end.eyebrow")}</p>
        <h1 className="mt-3 display-xl text-forest">{verdict}</h1>
        <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-3">
          {([0, 1] as const).map((p) => (
            <div key={p} className={cn("rounded-[24px] p-5", score[p] >= score[p === 0 ? 1 : 0] ? "bg-forest text-cream" : "bg-white text-forest shadow-soft ring-1 ring-forest/5")}>
              <p className="truncate text-[13px] font-semibold opacity-75">{session.names[p]}</p>
              <p className="mt-1 font-display text-[44px] leading-none">{score[p]}</p>
              <p className="mt-1 text-[12.5px] opacity-70">{t("end.of", { total })}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-forest/70">{t("end.sub")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onAgain} className="inline-flex h-12 items-center gap-2 rounded-full border border-forest/15 px-6 text-[15px] font-semibold text-forest hover:bg-forest/5">
            <RotateCcw aria-hidden="true" className="size-4" />
            {t("end.again")}
          </button>
          <Link href="/templates" className="btn-rose inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold">
            {t("end.gift")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
    );
  }

  const done = knowRoundDone(state);
  const mineDone = knowAnswered(state, me);
  const round = state.round + 1;
  const total = state.order.length;

  // One phone, between turns: a screen nobody should peek at.
  if (session.mode === "one" && handover) {
    return (
      <section className="container-narrow py-16 text-center">
        <p className="text-eyebrow text-lilac">{t("round", { n: round, total })}</p>
        <h1 className="mt-3 display-xl text-forest">{t("handTo", { name: session.names[holder] })}</h1>
        <p className="mt-3 text-[15px] text-forest/65">{t("noPeeking")}</p>
        <button type="button" onClick={() => setHandover(false)} className="btn-rose mt-8 h-12 rounded-full px-7 text-[15px] font-semibold">
          {t("imHere", { name: session.names[holder] })}
        </button>
      </section>
    );
  }

  if (done) {
    const a = state.answers[0][question.id];
    const b = state.answers[1][question.id];
    return (
      <section className="container-narrow py-10 sm:py-14">
        <p className="text-eyebrow text-lilac">{t("round", { n: round, total })}</p>
        <h1 className="mt-2 display-md text-forest">{question.prompt[locale]}</h1>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {([0, 1] as const).map((p) => {
            const own = p === 0 ? a : b;
            const theirGuess = p === 0 ? b : a;
            const right = theirGuess.guess === own.self;
            return (
              <div key={p} className="rounded-[24px] bg-white p-5 shadow-soft ring-1 ring-forest/5">
                <p className="text-[12.5px] font-semibold text-forest/55">{t("reveal.said", { name: session.names[p] })}</p>
                <p className="mt-1 font-display text-[22px] leading-tight text-forest">{question.options[own.self][locale]}</p>
                <p className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold", right ? "bg-moss-soft text-moss" : "bg-rose-soft text-rose-ink")}>
                  {right ? <Check aria-hidden="true" className="size-3.5" /> : <X aria-hidden="true" className="size-3.5" />}
                  {right ? t("reveal.right", { name: session.names[p === 0 ? 1 : 0] }) : t("reveal.wrong", { name: session.names[p === 0 ? 1 : 0], answer: question.options[theirGuess.guess][locale] })}
                </p>
              </div>
            );
          })}
        </div>
        <p className="mt-5 text-[14px] text-forest/60">{t("score", { a: session.names[0], sa: score[0], b: session.names[1], sb: score[1] })}</p>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "next" });
            setSelf(null);
            setGuess(null);
            if (session.mode === "one") {
              setHolder(0);
              setHandover(true);
            }
          }}
          className="btn-rose mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold"
        >
          {round < total ? t("next") : t("results")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </section>
    );
  }

  if (mineDone) return <Waiting text={session.mode === "two" ? t("waitingFor", { name: session.names[other] }) : t("handTo", { name: session.names[other] })} />;

  const submit = () => {
    if (self === null || guess === null) return;
    dispatch({ type: "answer", player: me, self, guess });
    setSelf(null);
    setGuess(null);
    if (session.mode === "one" && me === 0) {
      setHolder(1);
      setHandover(true);
    }
  };

  return (
    <section className="container-narrow py-10 sm:py-14">
      <p className="text-eyebrow text-lilac">
        {t("round", { n: round, total })} · {session.names[me]}
      </p>
      <h1 className="mt-2 display-md text-forest">{question.prompt[locale]}</h1>
      <Options label={t("yourAnswer")} question={question.id} locale={locale} value={self} onChange={setSelf} />
      <Options label={t("theirAnswer", { name: session.names[other] })} question={question.id} locale={locale} value={guess} onChange={setGuess} />
      <button type="button" disabled={self === null || guess === null} onClick={submit} className="btn-rose mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold disabled:bg-none disabled:bg-forest/10 disabled:text-forest/50 disabled:shadow-none">
        {t("lockIn")}
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>
    </section>
  );
}

function Options({ label, question, locale, value, onChange }: { label: string; question: string; locale: "en" | "es"; value: number | null; onChange: (n: number) => void }) {
  const q = KNOW_QUESTIONS.find((x) => x.id === question)!;
  return (
    <fieldset className="mt-6">
      <legend className="text-[13px] font-semibold text-forest/60">{label}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {q.options.map((o, i) => (
          <button key={i} type="button" aria-pressed={value === i} onClick={() => onChange(i)} className={cn("min-h-12 rounded-2xl px-4 py-3 text-left text-[15px] font-medium transition-colors", value === i ? "bg-forest text-cream" : "bg-white text-forest shadow-soft ring-1 ring-forest/5 hover:bg-rose-mist")}>
            {o[locale]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Waiting({ text }: { text: string }) {
  return (
    <section className="container-narrow py-20 text-center" aria-live="polite">
      <Loader2 aria-hidden="true" className="mx-auto size-6 animate-spin text-rose" />
      <p className="mt-4 font-display text-[24px] text-forest">{text}</p>
    </section>
  );
}
