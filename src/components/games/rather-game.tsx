/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { newRather, ratherFinished, ratherMatches, ratherPair, ratherPicked, ratherReduce, ratherRoundDone, seedOf, type Player, type RatherMove, type RatherState } from "@/lib/games/play";
import { Waiting } from "./know-game";
import { Lobby, useGameRoom, type Session } from "./lobby";
import { useRoom } from "./use-room";
import { useSynced } from "./use-synced";

export function RatherGame() {
  const t = useTranslations("games.rather");
  const { room, entry, setEntry } = useGameRoom();
  const [session, setSession] = useState<Session | null>(null);
  if (!session) return <Lobby title={t("title")} blurb={t("blurb")} art={<img src="/dates/ideas/arcade-night.webp" alt="" width={960} height={720} className="aspect-[4/3] w-full rotate-[2deg] rounded-[32px] object-cover shadow-lift ring-8 ring-white" />} room={room} entry={entry} onEnter={setEntry} onStart={setSession} />;
  return (
    <RatherPlay
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

function RatherPlay({ session, room, onAgain }: { session: Session; room: ReturnType<typeof useRoom>; onAgain: () => void }) {
  const t = useTranslations("games.rather");
  const locale = useLocale() === "es" ? "es" : "en";
  // Fixed for the game's life: on two phones the room code seeds both the same, on one phone the clock does.
  const [seed] = useState(() => seedOf(session.code ?? String(Date.now())));
  const { state, dispatch, waiting } = useSynced<RatherState, RatherMove>(session, room, () => newRather(seed), ratherReduce);
  const [holder, setHolder] = useState<Player>(0);
  const [handover, setHandover] = useState(false);
  const me: Player = session.mode === "two" ? (session.host ? 0 : 1) : holder;
  const other: Player = me === 0 ? 1 : 0;

  if (waiting) return <Waiting text={t("waitingHost")} />;
  const pair = ratherPair(state);
  const { same, answered } = ratherMatches(state);
  const round = state.round + 1;
  const total = state.order.length;

  if (ratherFinished(state) || !pair) {
    const verdict = same >= total * 0.8 ? t("end.twins") : same >= total * 0.5 ? t("end.balanced") : t("end.opposites");
    return (
      <section className="container-narrow py-12 text-center sm:py-16">
        <p className="text-eyebrow text-lilac">{t("end.eyebrow")}</p>
        <h1 className="mt-3 display-xl text-forest">{verdict}</h1>
        <p className="mt-4 font-display text-[56px] leading-none text-rose">{same}<span className="text-[24px] text-forest/50"> / {answered}</span></p>
        <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-forest/70">{t("end.sub", { same, total: answered })}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onAgain} className="inline-flex h-12 items-center gap-2 rounded-full border border-forest/15 px-6 text-[15px] font-semibold text-forest hover:bg-forest/5">
            <RotateCcw aria-hidden="true" className="size-4" />
            {t("end.again")}
          </button>
          <Link href="/dates" className="btn-rose inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold">
            {t("end.date")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
    );
  }

  if (session.mode === "one" && handover) {
    return (
      <section className="container-narrow py-16 text-center">
        <p className="text-eyebrow text-lilac">{t("round", { n: round, total })}</p>
        <h1 className="mt-3 display-xl text-forest">{t("handTo", { name: session.names[holder] })}</h1>
        <button type="button" onClick={() => setHandover(false)} className="btn-rose mt-8 h-12 rounded-full px-7 text-[15px] font-semibold">
          {t("imHere", { name: session.names[holder] })}
        </button>
      </section>
    );
  }

  if (ratherRoundDone(state)) {
    const a = state.picks[0][pair.id];
    const b = state.picks[1][pair.id];
    const match = a === b;
    return (
      <section className="container-narrow py-10 text-center sm:py-14">
        <p className="text-eyebrow text-lilac">{t("round", { n: round, total })}</p>
        <h1 className={cn("mt-3 display-xl", match ? "text-moss" : "text-rose")}>{match ? t("reveal.match") : t("reveal.clash")}</h1>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {([0, 1] as const).map((p) => (
            <div key={p} className="rounded-[24px] bg-white p-5 shadow-soft ring-1 ring-forest/5">
              <p className="text-[12.5px] font-semibold text-forest/55">{session.names[p]}</p>
              <p className="mt-1 font-display text-[22px] leading-tight text-forest">{(state.picks[p][pair.id] === 0 ? pair.a : pair.b)[locale]}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-[14px] text-forest/60">{t("sofar", { same, total: answered })}</p>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "next" });
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

  if (ratherPicked(state, me)) return <Waiting text={session.mode === "two" ? t("waitingFor", { name: session.names[other] }) : t("handTo", { name: session.names[other] })} />;

  const pick = (side: 0 | 1) => {
    dispatch({ type: "pick", player: me, side });
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
      <h1 className="mt-2 display-md text-forest">{t("prompt")}</h1>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {([pair.a, pair.b] as const).map((side, i) => (
          <button key={i} type="button" onClick={() => pick(i as 0 | 1)} className={cn("min-h-[140px] rounded-[26px] p-6 text-left font-display text-[24px] leading-tight shadow-soft transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-lift", i === 0 ? "bg-rose-soft text-rose-ink" : "bg-lilac-soft text-lilac")}>
            {side[locale]}
          </button>
        ))}
      </div>
    </section>
  );
}
