"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import { CHORES } from "@/lib/games/content";
import { GameArt, PlayingCard, Suit } from "./cards";
import { Lobby, useGameRoom, type Session } from "./lobby";
import { ScreenTop } from "./screen-top";

const SEGMENTS = 8;
const SPIN_MS = 3800;

/** Dishes roulette: a wheel of the two of you, a chore per spin, and the wheel's word is final. */
export function Roulette() {
  const t = useTranslations("games.roulette");
  const { room, entry, setEntry } = useGameRoom();
  const [session, setSession] = useState<Session | null>(null);
  if (!session) return <Lobby room={room} entry={entry} onEnter={setEntry} onePhoneOnly title={t("title")} blurb={t("blurb")} art={<GameArt sticker="candy" rank="7" suit="club" back="gold" />} onStart={setSession} />;
  return <Wheel names={session.names} />;
}

function Wheel({ names }: { names: [string, string] }) {
  const t = useTranslations("games.roulette");
  const locale = useLocale() === "es" ? "es" : "en";
  const reduced = useReducedMotion();
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [chore, setChore] = useState(0);
  const [results, setResults] = useState<{ who: 0 | 1; chore: number; n: number }[]>([]);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const spin = () => {
    if (spinning) return;
    const nextChore = Math.floor(Math.random() * CHORES.length);
    setChore(nextChore);
    // Land in the middle of a random segment, after four to six full turns.
    const segment = Math.floor(Math.random() * SEGMENTS);
    const target = 360 * (4 + Math.floor(Math.random() * 3)) + (360 - (segment * (360 / SEGMENTS) + 360 / SEGMENTS / 2));
    setSpinning(true);
    setAngle(angle - (angle % 360) + target);
    timer.current = window.setTimeout(
      () => {
        setSpinning(false);
        setResults((r) => [{ who: (segment % 2) as 0 | 1, chore: nextChore, n: (r[0]?.n ?? 0) + 1 }, ...r].slice(0, 6));
      },
      reduced ? 50 : SPIN_MS,
    );
  };

  const slice = 360 / SEGMENTS;
  const gradient = `conic-gradient(${Array.from({ length: SEGMENTS }, (_, i) => `${i % 2 === 0 ? "#D6336C" : "#FFF6F0"} ${i * slice}deg ${(i + 1) * slice}deg`).join(", ")})`;
  const latest = results[0];

  return (
    <section className="container-narrow py-10 text-center sm:py-14">
      <ScreenTop />
      <p className="text-eyebrow text-blush">{t("eyebrow")}</p>
      <h1 className="mt-2 display-md text-cream">{t("question", { chore: CHORES[chore][locale] })}</h1>
      <div className="relative mx-auto mt-9 aspect-square w-full max-w-[340px]">
        <div aria-hidden="true" className="absolute top-[-14px] left-1/2 z-10 -translate-x-1/2 drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
          <Suit suit="heart" className="size-10 rotate-180" color="#E0962A" />
        </div>
        <div className="size-full rounded-full shadow-[0_30px_60px_-24px_rgba(0,0,0,0.8)] ring-[10px] ring-cream" style={{ background: gradient, transform: `rotate(${angle}deg)`, transition: reduced ? "none" : `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.12, 1)` }}>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span key={i} className="absolute top-1/2 left-1/2 w-[46%] origin-left -translate-y-1/2 truncate pr-6 text-right font-display text-[16px]" style={{ transform: `rotate(${i * slice + slice / 2 - 90}deg)`, color: i % 2 === 0 ? "#FFFFFF" : "#2A0F1F" }}>
              {names[i % 2].slice(0, 12)}
            </span>
          ))}
        </div>
        <div aria-hidden="true" className="absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-cream shadow-lift">
          <Suit suit="heart" className="size-7" />
        </div>
      </div>
      <button type="button" onClick={spin} disabled={spinning} className="btn-rose mt-9 h-14 rounded-full px-12 text-[17px] font-semibold disabled:opacity-70">
        {spinning ? t("spinning") : t("spin")}
      </button>
      <div aria-live="polite" className="mt-7 min-h-[150px]">
        {latest && !spinning ? (
          <PlayingCard key={latest.n} rank="7" suit="club" corners="md" className="deal-in mx-auto w-full max-w-[340px]" faceClassName="items-center justify-center px-8 py-8">
            <p className="font-display text-[28px] leading-tight">
              <span className="text-rose-deep">{names[latest.who]}</span> {CHORES[latest.chore][locale]}.
            </p>
          </PlayingCard>
        ) : null}
      </div>
      {results.length > 1 ? (
        <ul className="mx-auto mt-4 max-w-sm space-y-1 text-[14px] text-cream/55">
          {results.slice(1).map((r) => (
            <li key={r.n}>
              {names[r.who]} {CHORES[r.chore][locale]}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-6 text-[12.5px] text-cream/45">{t("binding")}</p>
    </section>
  );
}
