"use client";

import { useState } from "react";
import { ArrowRight, Heart, RotateCcw, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { newRather, ratherFinished, ratherMatches, ratherPair, ratherPicked, ratherReduce, ratherRoundDone, seedOf, type Player, type RatherMove, type RatherState } from "@/lib/games/play";
import { Chip, GameArt, PlayingCard } from "./cards";
import { RevealCard } from "./flip";
import { Handover, Waiting } from "./screens";
import { Lobby, PeerGone, useGameRoom, type Session } from "./lobby";
import { useRoom } from "./use-room";
import { ScreenTop } from "./screen-top";
import { useSynced } from "./use-synced";

export function RatherGame() {
  const t = useTranslations("games.rather");
  const { room, entry, setEntry } = useGameRoom();
  const [session, setSession] = useState<Session | null>(null);
  if (!session) return <Lobby title={t("title")} blurb={t("blurb")} art={<GameArt sticker="cherries" rank="A" suit="diamond" back="lilac" />} room={room} entry={entry} onEnter={setEntry} onStart={setSession} />;
  return (
    <RatherPlay
      key={session.code ?? "one"}
      session={session}
      room={room}
      onChangePlayers={() => {
        setSession(null);
        setEntry(null);
      }}
    />
  );
}

function RatherPlay({ session, room, onChangePlayers }: { session: Session; room: ReturnType<typeof useRoom>; onChangePlayers: () => void }) {
  const t = useTranslations("games.rather");
  const tl = useTranslations("games.lobby");
  const locale = useLocale() === "es" ? "es" : "en";
  const [seed] = useState(() => seedOf(session.code ?? String(Date.now())));
  const { state, dispatch, restart, waiting } = useSynced<RatherState, RatherMove>(session, room, (gen) => newRather(seed, gen), ratherReduce);
  const [holder, setHolder] = useState<Player>(0);
  const [handover, setHandover] = useState(false);
  const me: Player = session.mode === "two" ? (session.host ? 0 : 1) : holder;
  const other: Player = me === 0 ? 1 : 0;

  if (waiting) return <Waiting text={t("waitingHost")} />;
  const pair = ratherPair(state);
  const { same, answered } = ratherMatches(state);
  const round = state.round + 1;
  const total = state.order.length;
  const meter = (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-semibold text-cream ring-1 ring-white/15">
      <Heart aria-hidden="true" className="size-3.5 fill-rose text-rose" />
      {t("sofar", { same, total: answered })}
    </span>
  );

  if (ratherFinished(state) || !pair) {
    const verdict = same >= total * 0.8 ? t("end.twins") : same >= total * 0.5 ? t("end.balanced") : t("end.opposites");
    return (
      <section className="container-narrow py-12 text-center sm:py-16">
        <ScreenTop screen={`end:${state.gen}`} />
        <PeerGone session={session} room={room} />
        <p className="text-eyebrow text-blush">{t("end.eyebrow")}</p>
        <h1 className="mt-3 display-xl text-cream">{verdict}</h1>
        <div className="mt-8 flex justify-center">
          <Chip size="lg" value={`${same}/${answered}`} tone="gold" />
        </div>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-cream/70">{t("end.sub", { same, total: answered })}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              restart();
              setHolder(0);
              setHandover(false);
            }}
            className="btn-rose inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold"
          >
            <RotateCcw aria-hidden="true" className="size-4" />
            {t("end.again")}
          </button>
          <button type="button" onClick={onChangePlayers} className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-[15px] font-semibold text-cream hover:bg-white/10">
            <Users aria-hidden="true" className="size-4" />
            {tl("change")}
          </button>
          <Link href="/dates" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-[15px] font-semibold text-cream hover:bg-white/10">
            {t("end.date")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
    );
  }

  if (session.mode === "one" && handover) {
    return <Handover eyebrow={t("round", { n: round, total })} title={t("handTo", { name: session.names[holder] })} button={t("imHere", { name: session.names[holder] })} back="lilac" onGo={() => setHandover(false)} />;
  }

  if (ratherRoundDone(state)) {
    const match = state.picks[0][pair.id] === state.picks[1][pair.id];
    return (
      <section className="container-narrow py-10 text-center sm:py-14">
        <ScreenTop screen={`reveal:${state.gen}:${round}`} />
        <PeerGone session={session} room={room} />
        <p className="text-eyebrow text-blush">{t("round", { n: round, total })}</p>
        <h1 className={cn("mt-3 display-xl", match ? "text-cream" : "text-rose-tint")}>{match ? t("reveal.match") : t("reveal.clash")}</h1>
        <div className="mx-auto mt-8 grid max-w-2xl gap-5 sm:grid-cols-2">
          {([0, 1] as const).map((p) => {
            const side = state.picks[p][pair.id];
            return (
              <RevealCard key={p} delay={250 + p * 350} rank={side === 0 ? "A" : "B"} suit={side === 0 ? "heart" : "spade"} tone={side === 0 ? "blush" : "lilac"} back={p === 0 ? "rose" : "lilac"} backLabel={<span className="rounded-full bg-cream/95 px-3 py-1 text-[13px] font-semibold text-forest">{session.names[p]}</span>} className="min-h-[170px]" faceClassName="items-center justify-center px-8 py-8">
                <span className="text-[12px] font-semibold tracking-[0.16em] text-forest/55 uppercase">{session.names[p]}</span>
                <span className="mt-2 font-display text-[24px] leading-tight">{(side === 0 ? pair.a : pair.b)[locale]}</span>
              </RevealCard>
            );
          })}
        </div>
        <div className="mt-6">{meter}</div>
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

  if (ratherPicked(state, me)) return <Waiting text={session.mode === "two" ? t("waitingFor", { name: session.names[other] }) : t("handTo", { name: session.names[other] })} peerGone={<PeerGone session={session} room={room} />} />;

  const choose = (side: 0 | 1) => {
    dispatch({ type: "pick", player: me, side });
    if (session.mode === "one" && me === 0) {
      setHolder(1);
      setHandover(true);
    }
  };

  return (
    <section className="container-narrow py-10 sm:py-14">
      <ScreenTop screen={`ask:${state.gen}:${round}:${me}`} />
      <PeerGone session={session} room={room} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-eyebrow text-blush">
          {t("round", { n: round, total })} · {session.names[me]}
        </p>
        {answered > 0 ? meter : null}
      </div>
      <h1 className="mt-4 display-md text-cream">{t("prompt")}</h1>
      <div key={`${state.gen}:${state.round}`} className="relative mt-7 grid auto-rows-fr gap-5 sm:grid-cols-2">
        {([pair.a, pair.b] as const).map((side, i) => (
          <button key={i} type="button" data-testid={i === 0 ? "choice-a" : "choice-b"} onClick={() => choose(i as 0 | 1)} className="group block rounded-[22px] text-left">
            <PlayingCard rank={i === 0 ? "A" : "B"} suit={i === 0 ? "heart" : "spade"} corners="lg" radius={22} tone={i === 0 ? "blush" : "lilac"} className={cn("deal-in h-full transition-transform duration-300 ease-(--ease-out-quint) group-hover:-translate-y-2", i === 0 ? "sm:rotate-[-2deg]" : "sm:rotate-[2deg]")} style={{ animationDelay: `${i * 120}ms` }} faceClassName="min-h-[180px] items-center justify-center px-10 py-10 text-center sm:min-h-[240px]">
              <span className="font-display text-[26px] leading-tight sm:text-[30px]">{side[locale]}</span>
            </PlayingCard>
          </button>
        ))}
        <span aria-hidden="true" className="absolute top-1/2 left-1/2 z-10 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-cream font-display text-[18px] text-forest shadow-lift italic">
          {t("or")}
        </span>
      </div>
    </section>
  );
}
