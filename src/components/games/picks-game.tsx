"use client";

import { useState } from "react";
import { ArrowRight, Heart, Loader2, RotateCcw, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { seedOf, type Player } from "@/lib/games/play";
import { newPicks, picksFinished, picksId, picksMatches, picksPicked, picksReduce, picksRoundDone, type PicksMove, type PicksState } from "@/lib/games/picks";
import { revivePicks } from "@/lib/games/saved";
import { THIS_PAIRS } from "@/lib/games/this-or-that";
import { Chip, GameArt, PlayingCard } from "./cards";
import { AfterFlip, RevealCard, flipAt, flippedAt } from "./flip";
import { GameEnd } from "./game-end";
import { Handover, LeaveGame, Waiting } from "./screens";
import { Lobby, PeerGone, type Session } from "./lobby";
import { useGame } from "./use-game";
import { useRoom } from "./use-room";
import { ScreenTop } from "./screen-top";
import { useSynced } from "./use-synced";

const THIS_IDS = THIS_PAIRS.map((p) => p.id);
const reviveThisThat = revivePicks("thisthat");

/**
 * This or that (/games/this-or-that): ten quick pairs, both pick in secret, then both picks turn
 * over. The same screens in the same order as Would you rather (rather-game.tsx), on the same
 * parts (Lobby, useGame, useSynced, RevealCard, Handover, GameEnd), without packs: every pair is free.
 */
export function ThisOrThatGame() {
  const t = useTranslations("games.thisthat");
  const { room, entry, enter, session, start, leave, closed } = useGame("thisthat");
  return !session ? (
    <Lobby title={t("title")} blurb={t("blurb")} art={<GameArt sticker="bow" rank="10" suit="club" back="ocean" />} room={room} entry={entry} onEnter={enter} onStart={start} />
  ) : (
    <ThisOrThatPlay key={session.code ?? "one"} session={session} room={room} closed={closed} onChangePlayers={leave} />
  );
}

function ThisOrThatPlay({ session, room, closed, onChangePlayers }: { session: Session; room: ReturnType<typeof useRoom>; closed: boolean; onChangePlayers: () => void }) {
  const t = useTranslations("games.thisthat");
  // The words the two games share: whose turn, hand-overs, waiting, next.
  const tr = useTranslations("games.rather");
  const tl = useTranslations("games.lobby");
  const locale = useLocale() === "es" ? "es" : "en";
  const [seed] = useState(() => seedOf(session.code ?? String(Date.now())));
  const { state, dispatch, restart, waiting, restored, restarting } = useSynced<PicksState, PicksMove>(session, room, (gen) => newPicks("thisthat", THIS_IDS, seed, gen), picksReduce, { game: "thisthat", revive: reviveThisThat });
  // On one phone, whoever hasn't picked yet is holding it: the first player until they have, then the other.
  const holder: Player = picksPicked(state, 0) && !picksRoundDone(state) ? 1 : 0;
  // Back from a reload mid-round, the phone is handed over again rather than showing anybody's turn.
  const [handover, setHandover] = useState(() => restored && session.mode === "one" && !picksRoundDone(state) && !picksFinished(state));
  const me: Player = session.mode === "two" ? (session.host ? 0 : 1) : holder;
  const other: Player = me === 0 ? 1 : 0;
  const peerGone = <PeerGone session={session} room={room} closed={closed} onLeave={onChangePlayers} />;

  if (waiting) return <Waiting text={tr("waitingHost")} peerGone={peerGone} />;
  const id = picksId(state);
  const pair = id ? (THIS_PAIRS.find((p) => p.id === id) ?? null) : null;
  const { same, answered } = picksMatches(state);
  const round = state.round + 1;
  const total = state.order.length;
  const meter = (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-cream ring-1 ring-white/15">
      <Heart aria-hidden="true" className="size-3.5 fill-rose text-rose" />
      {t("sofar", { same, total: answered })}
    </span>
  );

  if (picksFinished(state) || !pair) {
    const verdict = same >= total * 0.8 ? t("end.twins") : same >= total * 0.5 ? t("end.balanced") : t("end.opposites");
    return (
      <section className="container-narrow py-12 text-center sm:py-16">
        <ScreenTop screen={`end:${state.gen}`} />
        {peerGone}
        <p className="text-eyebrow text-blush">{t("end.eyebrow")}</p>
        <h1 className="mt-3 display-xl text-cream">{verdict}</h1>
        <div className="mt-8 flex justify-center">
          <Chip size="lg" value={`${same}/${answered}`} tone="gold" />
        </div>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-cream/70">{t("end.sub", { same, total: answered })}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {/* Nobody to deal to once the other phone has left the room. */}
          {!closed ? (
            <button
              type="button"
              disabled={restarting}
              onClick={() => {
                restart();
                setHandover(false);
              }}
              className="btn-rose inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold disabled:opacity-70"
            >
              {restarting ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <RotateCcw aria-hidden="true" className="size-4" />}
              {t("end.again")}
            </button>
          ) : null}
          <button type="button" onClick={onChangePlayers} className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-[15px] font-semibold text-cream hover:bg-white/10">
            <Users aria-hidden="true" className="size-4" />
            {tl("change")}
          </button>
        </div>
        <GameEnd game="thisthat" phones={session.mode === "two" ? 2 : 1} guest={session.mode === "two" && !session.host} />
      </section>
    );
  }

  if (session.mode === "one" && handover) {
    return <Handover eyebrow={tr("round", { n: round, total })} title={tr("handTo", { name: session.names[holder] })} button={tr("imHere", { name: session.names[holder] })} back="ocean" onGo={() => setHandover(false)} />;
  }

  if (picksRoundDone(state)) {
    const match = state.picks[0][pair.id] === state.picks[1][pair.id];
    return (
      <section className="container-narrow py-10 text-center sm:py-14">
        <ScreenTop screen={`reveal:${state.gen}:${round}`} />
        {peerGone}
        <p className="text-eyebrow text-blush">{tr("round", { n: round, total })}</p>
        {/* The verdict waits for both cards to land: before them, it was the spoiler. */}
        <AfterFlip delay={flippedAt(2)}>
          <h1 className={cn("mt-3 display-xl", match ? "text-cream" : "text-rose-tint")}>{match ? t("reveal.match") : t("reveal.clash")}</h1>
        </AfterFlip>
        <div className="mx-auto mt-8 grid max-w-2xl gap-5 sm:grid-cols-2">
          {([0, 1] as const).map((p) => {
            const side = state.picks[p][pair.id];
            return (
              <RevealCard key={p} delay={flipAt(p)} rank={side === 0 ? "A" : "B"} suit={side === 0 ? "heart" : "spade"} tone={side === 0 ? "blush" : "lilac"} back={p === 0 ? "ocean" : "lilac"} backLabel={<span className="rounded-full bg-cream/95 px-3 py-1 text-[13px] font-semibold text-forest">{session.names[p]}</span>} className="min-h-[170px]" faceClassName="items-center justify-center px-8 py-8">
                <span className="text-[12px] font-semibold tracking-[0.16em] text-forest/65 uppercase">{session.names[p]}</span>
                <span className="mt-2 font-display text-[24px] leading-tight">{(side === 0 ? pair.a : pair.b)[locale]}</span>
              </RevealCard>
            );
          })}
        </div>
        <AfterFlip delay={flippedAt(2)} className="mt-6">
          {meter}
        </AfterFlip>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "next" });
            if (session.mode === "one") setHandover(true);
          }}
          className="btn-rose mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold"
        >
          {round < total ? tr("next") : tr("results")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </section>
    );
  }

  if (picksPicked(state, me)) return <Waiting text={session.mode === "two" ? tr("waitingFor", { name: session.names[other] }) : tr("handTo", { name: session.names[other] })} peerGone={peerGone} />;

  const choose = (side: 0 | 1) => {
    dispatch({ type: "pick", player: me, side });
    if (session.mode === "one" && me === 0) setHandover(true);
  };

  return (
    <section className="container-narrow py-10 sm:py-14">
      <ScreenTop screen={`ask:${state.gen}:${round}:${me}`} />
      {peerGone}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-eyebrow text-blush">
          {tr("round", { n: round, total })} · {session.names[me]}
        </p>
        {answered > 0 ? meter : null}
      </div>
      <h1 className="mt-4 display-md text-cream">{t("prompt")}</h1>
      <div key={`${state.gen}:${state.round}`} className="relative mt-7 grid auto-rows-fr gap-5 sm:grid-cols-2">
        {([pair.a, pair.b] as const).map((side, i) => (
          <button key={i} type="button" data-testid={i === 0 ? "choice-a" : "choice-b"} onClick={() => choose(i as 0 | 1)} className="group block rounded-[22px] text-left">
            <PlayingCard rank={i === 0 ? "A" : "B"} suit={i === 0 ? "heart" : "spade"} corners="lg" radius={22} tone={i === 0 ? "blush" : "lilac"} className={cn("deal-in h-full transition-transform duration-300 ease-(--ease-out-quint) group-hover:-translate-y-2", i === 0 ? "sm:rotate-[-2deg]" : "sm:rotate-[2deg]")} style={{ animationDelay: `${i * 120}ms` }} faceClassName="min-h-[150px] items-center justify-center px-10 py-10 text-center sm:min-h-[200px]">
              <span className="font-display text-[26px] leading-tight sm:text-[30px]">{side[locale]}</span>
            </PlayingCard>
          </button>
        ))}
        <span aria-hidden="true" className="absolute top-1/2 left-1/2 z-10 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-cream font-display text-[18px] text-forest shadow-lift italic">
          {tr("or")}
        </span>
      </div>
      {session.mode === "one" ? <LeaveGame label={tl("change")} onLeave={onChangePlayers} /> : null}
    </section>
  );
}
