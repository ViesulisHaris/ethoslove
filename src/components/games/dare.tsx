/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { DARES, TRUTHS } from "@/lib/games/content";
import { shuffle } from "@/lib/games/play";
import { Lobby, useGameRoom, type Session } from "./lobby";

/** Truth or dare, the soft edition: the phone goes round, the cards do not repeat until they must. */
export function Dare() {
  const t = useTranslations("games.dare");
  const { room, entry, setEntry } = useGameRoom();
  const [session, setSession] = useState<Session | null>(null);
  if (!session) return <Lobby room={room} entry={entry} onEnter={setEntry} onePhoneOnly title={t("title")} blurb={t("blurb")} art={<img src="/dates/ideas/karaoke-duet.webp" alt="" width={960} height={720} className="aspect-[4/3] w-full rotate-[-2deg] rounded-[32px] object-cover shadow-lift ring-8 ring-white" />} onStart={setSession} />;
  return <Cards names={session.names} />;
}

function Cards({ names }: { names: [string, string] }) {
  const t = useTranslations("games.dare");
  const locale = useLocale() === "es" ? "es" : "en";
  const [seed] = useState(() => Math.floor(Math.random() * 1e9));
  const [turn, setTurn] = useState<0 | 1>(0);
  const [used, setUsed] = useState({ truth: 0, dare: 0 });
  const [card, setCard] = useState<{ kind: "truth" | "dare"; text: string } | null>(null);
  const truths = shuffle(TRUTHS, seed);
  const dares = shuffle(DARES, seed + 1);

  const draw = (kind: "truth" | "dare") => {
    const deck = kind === "truth" ? truths : dares;
    const n = used[kind];
    setCard({ kind, text: deck[n % deck.length][locale] });
    setUsed({ ...used, [kind]: n + 1 });
  };
  const done = () => {
    setCard(null);
    setTurn(turn === 0 ? 1 : 0);
  };

  return (
    <section className="container-narrow py-10 text-center sm:py-14">
      <p className="text-eyebrow text-lilac">{t("turn", { name: names[turn] })}</p>
      {card ? (
        <>
          <div className={cn("mx-auto mt-6 flex aspect-[4/5] w-full max-w-[400px] flex-col justify-between rounded-[30px] p-7 text-left shadow-lift", card.kind === "truth" ? "bg-lilac-soft" : "bg-rose-soft")}>
            <span className={cn("text-[12px] font-semibold tracking-[0.18em] uppercase", card.kind === "truth" ? "text-lilac" : "text-rose-ink")}>{t(card.kind)}</span>
            <span className="font-display text-[28px] leading-[1.12] text-forest sm:text-[32px]" aria-live="polite">
              {card.text}
            </span>
            <span className="text-[13px] text-forest/55">{t("for", { name: names[turn] })}</span>
          </div>
          <button type="button" onClick={done} className="btn-rose mt-6 inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold">
            {t("done", { name: names[turn === 0 ? 1 : 0] })}
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
        </>
      ) : (
        <>
          <h1 className="mt-3 display-xl text-forest">{t("pick", { name: names[turn] })}</h1>
          <div className="mx-auto mt-8 grid max-w-md grid-cols-2 gap-3">
            <button type="button" onClick={() => draw("truth")} className="min-h-[150px] rounded-[26px] bg-lilac-soft p-6 font-display text-[30px] text-lilac shadow-soft transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-lift">
              {t("truth")}
            </button>
            <button type="button" onClick={() => draw("dare")} className="min-h-[150px] rounded-[26px] bg-rose-soft p-6 font-display text-[30px] text-rose-ink shadow-soft transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-lift">
              {t("dare")}
            </button>
          </div>
          <p className="mt-6 text-[13px] text-forest/50">{t("soft")}</p>
        </>
      )}
    </section>
  );
}
