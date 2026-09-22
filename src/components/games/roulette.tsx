/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { CHORES } from "@/lib/games/content";
import { Lobby, useGameRoom, type Session } from "./lobby";

const SEGMENTS = 8;
const SPIN_MS = 3800;

/** Dishes roulette: a wheel of the two of you, a chore per spin, and the result is binding. */
export function Roulette() {
  const t = useTranslations("games.roulette");
  const { room, entry, setEntry } = useGameRoom();
  const [session, setSession] = useState<Session | null>(null);
  if (!session) return <Lobby room={room} entry={entry} onEnter={setEntry} onePhoneOnly title={t("title")} blurb={t("blurb")} art={<img src="/dates/ideas/pasta-and-a-slow-walk.webp" alt="" width={960} height={720} className="aspect-[4/3] w-full rotate-[2deg] rounded-[32px] object-cover shadow-lift ring-8 ring-white" />} onStart={setSession} />;
  return <Wheel names={session.names} />;
}

function Wheel({ names }: { names: [string, string] }) {
  const t = useTranslations("games.roulette");
  const locale = useLocale() === "es" ? "es" : "en";
  const reduced = useReducedMotion();
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [chore, setChore] = useState(0);
  const [results, setResults] = useState<{ who: 0 | 1; chore: number }[]>([]);

  const spin = () => {
    if (spinning) return;
    const nextChore = Math.floor(Math.random() * CHORES.length);
    setChore(nextChore);
    // Land in the middle of a random segment, after four to six full turns.
    const segment = Math.floor(Math.random() * SEGMENTS);
    const target = 360 * (4 + Math.floor(Math.random() * 3)) + (360 - (segment * (360 / SEGMENTS) + 360 / SEGMENTS / 2));
    const finalAngle = angle - (angle % 360) + target;
    setSpinning(true);
    setAngle(finalAngle);
    window.setTimeout(
      () => {
        setSpinning(false);
        setResults((r) => [{ who: (segment % 2) as 0 | 1, chore: nextChore }, ...r].slice(0, 6));
      },
      reduced ? 50 : SPIN_MS,
    );
  };

  const slice = 360 / SEGMENTS;
  const gradient = `conic-gradient(${Array.from({ length: SEGMENTS }, (_, i) => `${i % 2 === 0 ? "var(--color-rose)" : "var(--color-forest)"} ${i * slice}deg ${(i + 1) * slice}deg`).join(", ")})`;
  const latest = results[0];

  return (
    <section className="container-narrow py-10 text-center sm:py-14">
      <p className="text-eyebrow text-lilac">{t("eyebrow")}</p>
      <h1 className="mt-2 display-md text-forest">{t("question", { chore: CHORES[chore][locale] })}</h1>
      <div className="relative mx-auto mt-8 aspect-square w-full max-w-[340px]">
        <div aria-hidden="true" className="absolute top-[-6px] left-1/2 z-10 h-0 w-0 -translate-x-1/2 border-x-[14px] border-t-[26px] border-x-transparent border-t-star drop-shadow-[0_3px_4px_rgba(60,20,40,0.4)]" />
        <div className="size-full rounded-full shadow-lift ring-[10px] ring-white" style={{ background: gradient, transform: `rotate(${angle}deg)`, transition: reduced ? "none" : `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.12, 1)` }}>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span key={i} className="absolute top-1/2 left-1/2 w-[46%] origin-left -translate-y-1/2 pr-5 text-right text-[13px] font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]" style={{ transform: `rotate(${i * slice + slice / 2 - 90}deg)` }}>
              {names[i % 2].slice(0, 12)}
            </span>
          ))}
        </div>
        <div aria-hidden="true" className="absolute top-1/2 left-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-soft" />
      </div>
      <button type="button" onClick={spin} disabled={spinning} className="btn-rose mt-8 h-14 rounded-full px-10 text-[17px] font-semibold disabled:opacity-70">
        {spinning ? t("spinning") : t("spin")}
      </button>
      <div aria-live="polite" className="mt-6 min-h-[64px]">
        {latest && !spinning ? (
          <p className="font-display text-[30px] leading-tight text-forest">
            <span className="text-rose">{names[latest.who]}</span> {CHORES[latest.chore][locale]}.
          </p>
        ) : null}
      </div>
      {results.length > 1 ? (
        <ul className="mx-auto mt-2 max-w-sm space-y-1 text-[14px] text-forest/60">
          {results.slice(1).map((r, i) => (
            <li key={i} className={cn(i === 0 && "text-forest/70")}>
              {names[r.who]} {CHORES[r.chore][locale]}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-6 text-[12.5px] text-forest/45">{t("binding")}</p>
    </section>
  );
}
