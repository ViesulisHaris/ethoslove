"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import { CHORES } from "@/lib/games/content";
import { readSaved, reviveRoulette, savedKey, tabStorage, writeSaved, type RouletteTable } from "@/lib/games/saved";
import { cn } from "@/lib/utils";
import { GameArt, PlayingCard, Suit } from "./cards";
import { GameEnd } from "./game-end";
import { Lobby } from "./lobby";
import { ScreenTop } from "./screen-top";
import { LeaveGame } from "./screens";
import { useGame } from "./use-game";

const SEGMENTS = 8;
const SPIN_MS = 3800;
const SAVED = savedKey("roulette", "play");
/** A name longer than this is set a size smaller on the wheel, so more of it fits before the ellipsis. */
const LONG_NAME = 9;

/** Dishes roulette: a wheel of the two of you, a chore per spin, and the wheel's word is final. */
export function Roulette() {
  const t = useTranslations("games.roulette");
  const { room, entry, enter, session, start, leave } = useGame("roulette", { twoPhones: false });
  if (!session) return <Lobby room={room} entry={entry} onEnter={enter} onePhoneOnly title={t("title")} blurb={t("blurb")} art={<GameArt sticker="candy" rank="7" suit="club" back="gold" />} onStart={start} />;
  return <Wheel names={session.names} onChangePlayers={leave} />;
}

function Wheel({ names, onChangePlayers }: { names: [string, string]; onChangePlayers: () => void }) {
  const t = useTranslations("games.roulette");
  const tl = useTranslations("games.lobby");
  const locale = useLocale() === "es" ? "es" : "en";
  const reduced = useReducedMotion();
  // What the wheel had settled before a reload: a spin still turning when the page went never landed.
  const [kept] = useState(() => readSaved(tabStorage(), SAVED, (raw) => reviveRoulette(raw, CHORES.length)));
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [chore, setChore] = useState(kept?.chore ?? 0);
  const [results, setResults] = useState<RouletteTable["results"]>(kept?.results ?? []);
  // A wheel has no last spin: the game ends when they say everything is settled.
  const [settled, setSettled] = useState(kept?.settled ?? false);
  useEffect(() => writeSaved(tabStorage(), SAVED, { chore, results, settled } satisfies RouletteTable), [chore, results, settled]);
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

  if (settled) {
    return (
      <section className="container-narrow py-12 text-center sm:py-16">
        <ScreenTop screen="settled" />
        <p className="text-eyebrow text-blush">{t("end.eyebrow")}</p>
        <h1 className="mt-3 display-xl text-cream">{t("end.title")}</h1>
        <ul className="mx-auto mt-6 max-w-sm space-y-1.5 text-[15.5px] text-cream/75">
          {results.map((r) => (
            <li key={r.n}>
              <span className="font-semibold text-cream">{names[r.who]}</span> {CHORES[r.chore][locale]}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => setSettled(false)} className="btn-rose inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold">
            <RotateCcw aria-hidden="true" className="size-4" />
            {t("end.again")}
          </button>
          {/* The wheel now comes back after a reload, which used to be the only way to new names. */}
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
      <ScreenTop />
      <p className="text-eyebrow text-blush">{t("eyebrow")}</p>
      <h1 className="mt-2 display-md text-cream">{t("question", { chore: CHORES[chore][locale] })}</h1>
      <div className="relative mx-auto mt-9 aspect-square w-full max-w-[340px]">
        <div aria-hidden="true" className="absolute top-[-14px] left-1/2 z-10 -translate-x-1/2 drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)]">
          <Suit suit="heart" className="size-10 rotate-180" color="#E0962A" />
        </div>
        <div className="size-full rounded-full shadow-[0_30px_60px_-24px_rgba(0,0,0,0.8)] ring-[10px] ring-cream" style={{ background: gradient, transform: `rotate(${angle}deg)`, transition: reduced ? "none" : `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.8, 0.12, 1)` }}>
          {/* Each name runs from the rim towards the middle and stops short of the heart in the centre
              (the padding on the left clears its 32px radius); a name too long for that ends in an
              ellipsis rather than being cut mid-word or slipping under the heart. */}
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <span key={i} className={cn("absolute top-1/2 left-1/2 w-[46%] origin-left -translate-y-1/2 truncate pr-5 pl-10 text-right font-display", names[i % 2].length > LONG_NAME ? "text-[14px]" : "text-[16px]")} style={{ transform: `rotate(${i * slice + slice / 2 - 90}deg)`, color: i % 2 === 0 ? "#FFFFFF" : "#2A0F1F" }}>
              {names[i % 2]}
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
      {/* After a spin, "everything settled" leads to the end, and "change players" is there. */}
      {latest && !spinning ? (
        <button type="button" onClick={() => setSettled(true)} className="mt-3 h-11 rounded-full px-5 text-[14px] font-semibold text-cream/70 underline-offset-4 hover:text-cream hover:underline">
          {t("finish")}
        </button>
      ) : !latest ? (
        <LeaveGame label={tl("change")} onLeave={onChangePlayers} />
      ) : null}
    </section>
  );
}
