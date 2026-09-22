"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DARES, TRUTHS } from "@/lib/games/content";
import { shuffle } from "@/lib/games/play";
import { GameArt, PlayingCard } from "./cards";
import { Lobby, useGameRoom, type Session } from "./lobby";
import { ScreenTop } from "./screen-top";

/** Truth or dare, the soft edition: two decks on the table, the phone goes round, no card twice until it must. */
export function Dare() {
  const t = useTranslations("games.dare");
  const { room, entry, setEntry } = useGameRoom();
  const [session, setSession] = useState<Session | null>(null);
  if (!session) return <Lobby room={room} entry={entry} onEnter={setEntry} onePhoneOnly title={t("title")} blurb={t("blurb")} art={<GameArt sticker="kiss" rank="J" suit="spade" />} onStart={setSession} />;
  return <Cards names={session.names} />;
}

function Deck({ label, tone, onDraw, left }: { label: string; tone: "lilac" | "rose"; onDraw: () => void; left: string }) {
  return (
    <button type="button" aria-label={label} onClick={onDraw} className="group block w-full">
      {/* The stack sits behind the top card only, not behind the count under it. */}
      <span className="relative block">
        {[3, 2, 1].map((n) => (
          <span key={n} aria-hidden="true" className="absolute inset-0" style={{ translate: `${n * 3}px ${n * 4}px`, rotate: `${n * (tone === "rose" ? 1.2 : -1.2)}deg` }}>
            <PlayingCard faceDown back={tone} className="size-full" />
          </span>
        ))}
        <PlayingCard faceDown back={tone} className="relative aspect-[5/7] w-full transition-transform duration-300 ease-(--ease-out-quint) group-hover:-translate-y-3 group-hover:rotate-[-2deg]" backLabel={<span className="rounded-full bg-cream/95 px-4 py-1.5 font-display text-[22px] text-forest shadow">{label}</span>} />
      </span>
      <span className="mt-5 block text-center text-[12.5px] font-semibold text-cream/55">{left}</span>
    </button>
  );
}

function Cards({ names }: { names: [string, string] }) {
  const t = useTranslations("games.dare");
  const locale = useLocale() === "es" ? "es" : "en";
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const [turn, setTurn] = useState<0 | 1>(0);
  const [used, setUsed] = useState({ truth: 0, dare: 0 });
  const [card, setCard] = useState<{ kind: "truth" | "dare"; text: string; n: number } | null>(null);
  const truths = shuffle(TRUTHS, seed);
  const dares = shuffle(DARES, seed + 1);

  const draw = (kind: "truth" | "dare") => {
    const deck = kind === "truth" ? truths : dares;
    const n = used[kind];
    setCard({ kind, text: deck[n % deck.length][locale], n: n + 1 });
    setUsed({ ...used, [kind]: n + 1 });
  };
  const left = (kind: "truth" | "dare") => {
    const size = kind === "truth" ? TRUTHS.length : DARES.length;
    return t("left", { n: size - (used[kind] % size) });
  };

  return (
    <section className="container-narrow py-10 text-center sm:py-14">
      <ScreenTop screen={card ? `card:${card.kind}:${card.n}` : `pick:${turn}`} />
      <p className="text-eyebrow text-blush">{t("turn", { name: names[turn] })}</p>
      {card ? (
        <>
          <PlayingCard key={`${card.kind}${card.n}`} rank={card.kind === "truth" ? "T" : "D"} suit={card.kind === "truth" ? "spade" : "heart"} corners="lg" radius={26} tone={card.kind === "truth" ? "lilac" : "blush"} className="deal-in mx-auto mt-6 w-full max-w-[420px]" faceClassName="min-h-[400px] justify-between px-9 py-12 text-left">
            <span className="text-[12px] font-semibold tracking-[0.18em] text-forest/55 uppercase">{t(card.kind)}</span>
            <span className="font-display text-[29px] leading-[1.14] sm:text-[33px]" aria-live="polite">
              {card.text}
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
            <Deck label={t("truth")} tone="lilac" left={left("truth")} onDraw={() => draw("truth")} />
            <Deck label={t("dare")} tone="rose" left={left("dare")} onDraw={() => draw("dare")} />
          </div>
          <p className="mt-8 text-[13px] text-cream/50">{t("soft")}</p>
        </>
      )}
    </section>
  );
}
