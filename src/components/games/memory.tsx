/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, RotateCcw, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { MEMORY_PAIRS, memoryDone, memoryFlip, memoryIsPair, memoryResolve, newMemory, type MemoryState } from "@/lib/games/memory";
import { readSaved, reviveMemory, savedKey, tabStorage, writeSaved } from "@/lib/games/saved";
import { Sticker, type StickerId } from "@/templates/_shared/covers/stickers";
import { Chip, GameArt, PlayingCard } from "./cards";
import { GameEnd } from "./game-end";
import { Lobby } from "./lobby";
import { ScreenTop } from "./screen-top";
import { LeaveGame } from "./screens";
import { useGame } from "./use-game";

const FACES: StickerId[] = ["heart", "cherries", "strawberry", "bow", "daisy", "kiss", "butterfly", "cake"];
const SHOW_PAIR_MS = 650;
const SHOW_MISS_MS = 1100;
/** The first letter of a name, whole even when it is an emoji. */
const initial = (name: string) => (Array.from(name.trim())[0] ?? "").toUpperCase();

/** Memory: the pairs game, dealt from our stickers or from your own photos. */
export function MemoryGame() {
  const t = useTranslations("games.memory");
  const { room, entry, enter, session, start, leave } = useGame("memory", { twoPhones: false });
  if (!session) return <Lobby room={room} entry={entry} onEnter={enter} onePhoneOnly title={t("title")} blurb={t("blurb")} art={<GameArt sticker="butterfly" rank="2" suit="diamond" back="lilac" />} onStart={start} />;
  return <Board names={session.names} onChangePlayers={leave} />;
}

const SAVED = savedKey("memory", "play");

function Board({ names, onChangePlayers }: { names: [string, string]; onChangePlayers: () => void }) {
  const t = useTranslations("games.memory");
  const tl = useTranslations("games.lobby");
  // The board as it was before a reload, if there was one. Two cards left face up were about to be
  // settled when the page went, so they are settled now. Photos were this page's own object URLs
  // and don't survive it: the pairs come back as our stickers, in the same places.
  const [state, setState] = useState<MemoryState>(() => {
    const kept = readSaved(tabStorage(), SAVED, reviveMemory);
    return kept ? memoryResolve(kept) : newMemory(Math.floor(Math.random() * 1e9));
  });
  useEffect(() => writeSaved(tabStorage(), SAVED, state), [state]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<"pair" | "miss" | null>(null);
  // Photos stay on this phone: object URLs, let go of when they are replaced or the game ends.
  const [photos, setPhotos] = useState<string[]>([]);
  // A picture the browser can't read (an iPhone HEIC on a desktop, say) falls back to our sticker
  // rather than leaving a blank card: a pair has to be recognisable to be playable.
  const [broken, setBroken] = useState<Record<string, true>>({});
  const photoFor = (face: number) => (photos[face] && !broken[photos[face]] ? photos[face] : null);
  const picker = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => () => photos.forEach((url) => URL.revokeObjectURL(url)), [photos]);

  const deal = () => {
    window.clearTimeout(timer.current);
    setBusy(false);
    setNote(null);
    setState(newMemory(Math.floor(Math.random() * 1e9)));
  };

  const tap = (slot: number) => {
    if (busy) return;
    const next = memoryFlip(state, slot);
    if (next === state) return;
    setState(next);
    if (next.open.length < 2) return;
    const pair = memoryIsPair(next);
    setBusy(true);
    timer.current = window.setTimeout(
      () => {
        setState((s) => memoryResolve(s));
        setNote(pair ? "pair" : "miss");
        setBusy(false);
      },
      pair ? SHOW_PAIR_MS : SHOW_MISS_MS,
    );
  };

  const done = memoryDone(state);
  const [a, b] = state.scores;
  const status = done ? (a === b ? t("tie") : t("winner", { name: names[a > b ? 0 : 1] })) : note === "pair" ? t("pair", { name: names[state.turn] }) : note === "miss" ? t("miss", { name: names[state.turn] }) : t("turn", { name: names[state.turn] });

  return (
    <section className="container-narrow py-8 sm:py-12 max-lg:landscape:py-4">
      <ScreenTop screen={done ? "done" : "board"} />
      {/* Wraps under long names rather than hiding the photos button's words on a phone: the photos are the point. */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-5">
          {([0, 1] as const).map((p) => (
            <Chip key={p} value={state.scores[p]} tone={p === 0 ? "rose" : "lilac"} label={names[p]} active={!done && state.turn === p} />
          ))}
        </div>
        <button type="button" onClick={() => picker.current?.click()} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full border border-white/20 px-4 text-[13.5px] font-semibold text-cream hover:bg-white/10">
          <ImagePlus aria-hidden="true" className="size-4" />
          <span>{photos.length ? t("photosAgain") : t("photos")}</span>
        </button>
        <input
          ref={picker}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = [...(e.target.files ?? [])].filter((f) => f.type.startsWith("image/")).slice(0, MEMORY_PAIRS);
            e.target.value = "";
            if (files.length === 0) return;
            setBroken({});
            setPhotos(files.map((f) => URL.createObjectURL(f)));
            deal();
          }}
        />
      </div>
      <p aria-live="polite" className="mt-5 min-h-8 font-display text-[24px] leading-tight text-cream">
        {status}
      </p>

      {/* Every card on one screen, since the game is flipping back and forth across the board: its
          width is capped by the height left under the header, the chips and the buttons (a card is
          3:4, so four rows are 4/3 of the width tall), and floored so cards stay big enough to tap.
          A phone on its side lays the sixteen out in two rows of eight. */}
      <div className="mx-auto mt-5 grid max-w-[min(560px,max(260px,calc((100svh-370px)*0.75)))] grid-cols-4 gap-2.5 sm:gap-3.5 max-lg:landscape:max-w-[max(452px,calc((100svh-var(--header-h,76px)-9rem)*3))] max-lg:landscape:grid-cols-8">
        {state.cards.map((face, slot) => {
          const up = state.open.includes(slot) || state.matched[slot] !== null;
          const owner = state.matched[slot];
          return (
            <button key={slot} type="button" disabled={up || busy || done} onClick={() => tap(slot)} aria-label={up ? t("cardUp", { n: slot + 1, face: photoFor(face) ? t("photo", { n: face + 1 }) : t(`faces.${FACES[face]}`) }) : t("cardDown", { n: slot + 1 })} className="block rounded-[14px] disabled:cursor-default">
              <PlayingCard faceDown={!up} back="rose" radius={14} className={cn("aspect-[3/4] w-full transition-transform duration-300", !up && !busy && !done && "hover:-translate-y-1")} faceClassName={cn("items-center justify-center p-2", owner === 0 && "ring-[3px] ring-rose", owner === 1 && "ring-[3px] ring-[#5B4FB0]")}>
                {photoFor(face) ? (
                  <img src={photos[face]} alt="" onError={() => setBroken((was) => ({ ...was, [photos[face]]: true }))} className="absolute inset-[5px] size-[calc(100%-10px)] rounded-[10px] object-cover" />
                ) : (
                  <span className="block w-[70%]">
                    <Sticker id={FACES[face]} />
                  </span>
                )}
                {owner !== null ? <span className={cn("absolute right-1.5 bottom-1.5 grid size-5 place-items-center rounded-full text-[10px] font-bold text-white", owner === 0 ? "bg-rose" : "bg-[#5B4FB0]")}>{initial(names[owner])}</span> : null}
              </PlayingCard>
            </button>
          );
        })}
      </div>

      {done ? (
        <>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={deal} className="btn-rose inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold">
              <RotateCcw aria-hidden="true" className="size-4" />
              {t("again")}
            </button>
            <button type="button" onClick={onChangePlayers} className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-[15px] font-semibold text-cream hover:bg-white/10">
              <Users aria-hidden="true" className="size-4" />
              {tl("change")}
            </button>
          </div>
          <GameEnd />
        </>
      ) : (
        <>
          <p className="mt-6 text-center text-[12.5px] text-cream/45">{t("rules")}</p>
          <LeaveGame label={tl("change")} onLeave={onChangePlayers} />
        </>
      )}
    </section>
  );
}
