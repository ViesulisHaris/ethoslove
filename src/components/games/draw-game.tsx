"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Eraser, Loader2, RotateCcw, Undo2, Users, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { drawArtist, drawFinished, drawReduce, drawRoundDone, drawScore, drawWord, newDraw, type DrawMove, type DrawState } from "@/lib/games/draw";
import { applyInk, orderedSkip, orderedTake, readInkNote, type InkNote, type InkOp, type Ordered } from "@/lib/games/ink";
import { seedOf, type Player } from "@/lib/games/play";
import { reviveDraw } from "@/lib/games/saved";
import { Chip, GameArt, PlayingCard } from "./cards";
import { DrawBoard, INK, type Stroke } from "./draw-board";
import { GameEnd } from "./game-end";
import { Lobby, PeerGone, type Session } from "./lobby";
import { ScreenTop } from "./screen-top";
import { Handover, LeaveGame, Waiting } from "./screens";
import { useGame } from "./use-game";
import { useRoom } from "./use-room";
import { useSynced } from "./use-synced";

const EMPTY: Stroke[] = [];
/** How long ink that arrived ahead of its turn waits for the message before it, before that one is given up on. */
const INK_GAP_MS = 400;
/**
 * A phone on its side (short and not wide enough to be a tablet): the board goes on the left,
 * sized to the height under the header, and everything else sits beside it rather than below.
 */
const SIDE = "max-lg:landscape:col-start-2";

/** "Draw it, guess it": one draws with a finger, the other guesses. Two phones, or one passed over. */
export function DrawGame() {
  const t = useTranslations("games.draw");
  const { room, entry, enter, session, start, leave, closed } = useGame("draw");
  if (!session) return <Lobby title={t("title")} blurb={t("blurb")} art={<GameArt sticker="squiggle" rank="9" suit="diamond" back="ocean" />} room={room} entry={entry} onEnter={enter} onStart={start} />;
  return <DrawPlay key={session.code ?? "one"} session={session} room={room} closed={closed} onChangePlayers={leave} />;
}

function DrawPlay({ session, room, closed, onChangePlayers }: { session: Session; room: ReturnType<typeof useRoom>; closed: boolean; onChangePlayers: () => void }) {
  const t = useTranslations("games.draw");
  const tl = useTranslations("games.lobby");
  const locale = useLocale() === "es" ? "es" : "en";
  const [seed] = useState(() => seedOf(session.code ?? String(Date.now())));
  const { state, dispatch, restart, waiting, restarting } = useSynced<DrawState, DrawMove>(session, room, (gen) => newDraw(seed, gen), drawReduce, { game: "draw", revive: reviveDraw });
  const two = session.mode === "two";
  const artist = drawArtist(state);
  // On two phones each is themselves; on one, whoever is drawing is holding it.
  const me: Player = two ? (session.host ? 0 : 1) : artist;
  const iDraw = me === artist;
  const roundKey = `${state.gen}:${state.round}`;

  // One phone: the phone goes over, the word is peeked at in private, then hidden to draw.
  const [stage, setStage] = useState<{ key: string; at: "pass" | "peek" | "draw" }>({ key: "", at: "pass" });
  const at = stage.key === roundKey ? stage.at : "pass";
  // The paper, wiped by the round changing rather than by an effect.
  const [ink, setInk] = useState<{ key: string; strokes: Stroke[] }>({ key: "", strokes: EMPTY });
  const strokes = ink.key === roundKey ? ink.strokes : EMPTY;
  const [colour, setColour] = useState<string>(INK[0].colour);
  const [guess, setGuess] = useState("");

  const paint = useCallback((update: (was: Stroke[]) => Stroke[], key: string) => setInk((was) => ({ key, strokes: update(was.key === key ? was.strokes : EMPTY) })), []);
  // The listeners below outlive any one render, so they reach today's paper and round through these.
  const painter = useRef({ paint, roundKey, iDraw, strokes });
  useEffect(() => {
    painter.current = { paint, roundKey, iDraw, strokes };
  });

  const { on, send, status } = room;
  const peer = session.peer;
  // Ink going out: numbered by this page (see lib/games/ink.ts), and tagged with the round it is for.
  const [inkPage] = useState(() => Math.random().toString(36).slice(2, 10));
  const inkSent = useRef(0);
  const sendInk = useCallback(
    (op: InkOp, key: string) => {
      send("ink", { s: inkPage, q: inkSent.current, k: key, op } satisfies InkNote);
      inkSent.current += 1;
    },
    [send, inkPage],
  );
  // Ink coming in, from the other phone: kept across rounds, since its count runs across them.
  const inkIn = useRef<Ordered<InkNote> | null>(null);
  useEffect(() => {
    if (!two) return;
    const fromPeer = (from: string) => !peer || from === peer;
    const lay = (ready: InkNote[]) => {
      for (const note of ready) {
        const { paint: put, roundKey: key, iDraw: drawing } = painter.current;
        // Last round's ink, or a round this phone hasn't reached yet: it asks for the drawing when it gets there.
        if (note.k === key) put((was) => applyInk(was, note.op, drawing), key);
      }
    };
    let gap: number | undefined;
    const offs = [
      on("ink", (payload, from) => {
        const note = readInkNote(payload);
        if (!fromPeer(from) || !note) return;
        const taken = orderedTake(inkIn.current, note.s, note.q, note, note.op.t === "all" || note.op.t === "clear");
        inkIn.current = taken.stream;
        lay(taken.ready);
        if (taken.stream.held.length === 0) {
          window.clearTimeout(gap);
          gap = undefined;
          return;
        }
        // Timed from the first gap and not pushed back by the ink queuing behind it: a finger still
        // drawing sends every frame, and would hold everything after a lost message until it lifted.
        if (gap !== undefined) return;
        gap = window.setTimeout(() => {
          gap = undefined;
          if (!inkIn.current) return;
          const skipped = orderedSkip(inkIn.current);
          inkIn.current = skipped.stream;
          lay(skipped.ready);
        }, INK_GAP_MS);
      }),
      // Somebody just came into this round or reloaded: whoever holds the drawing sends it. The
      // artist always does (the watcher reloaded); the watcher does when it has a picture (the
      // artist reloaded, and its paper came back blank). The round asked about has to be this one,
      // so a phone a beat behind never sends last round's drawing onto the new paper.
      on("ink?", (payload, from) => {
        const { iDraw: drawing, strokes: now, roundKey: key } = painter.current;
        if (fromPeer(from) && payload === key && (drawing || now.length > 0)) sendInk({ t: "all", strokes: now }, key);
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      window.clearTimeout(gap);
    };
  }, [two, peer, on, sendInk]);
  // Every phone asks on coming into a round (and again once the room is open, after a reload).
  useEffect(() => {
    if (two && status === "open") send("ink?", roundKey);
  }, [two, status, send, roundKey]);

  const peerGone = <PeerGone session={session} room={room} closed={closed} onLeave={onChangePlayers} />;
  if (waiting) return <Waiting text={t("waitingHost")} peerGone={peerGone} />;

  const word = drawWord(state);
  const done = drawRoundDone(state);
  const round = state.round + 1;
  const total = state.order.length;
  const score = drawScore(state);
  const other: Player = me === 0 ? 1 : 0;

  const again = () => {
    restart();
    setStage({ key: "", at: "pass" });
    setInk({ key: "", strokes: EMPTY });
  };

  if (drawFinished(state) || !word) {
    const verdict = score >= total - 1 ? t("end.great") : score >= total / 2 ? t("end.good") : t("end.ok");
    return (
      <section className="container-narrow py-12 text-center sm:py-16">
        <ScreenTop screen={`end:${state.gen}`} />
        {peerGone}
        <p className="text-eyebrow text-blush">{t("end.eyebrow")}</p>
        <h1 className="mt-3 display-xl text-cream">{verdict}</h1>
        <div className="mt-8 flex justify-center">
          <Chip size="lg" value={`${score}/${total}`} tone="gold" />
        </div>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-cream/70">{t("end.sub", { n: score, total })}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {/* Nobody to deal to once the other phone has left the room. */}
          {!closed ? (
            <button type="button" onClick={again} disabled={restarting} className="btn-rose inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold disabled:opacity-70">
              {restarting ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <RotateCcw aria-hidden="true" className="size-4" />}
              {t("end.again")}
            </button>
          ) : null}
          <button type="button" onClick={onChangePlayers} className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-[15px] font-semibold text-cream hover:bg-white/10">
            <Users aria-hidden="true" className="size-4" />
            {tl("change")}
          </button>
        </div>
        <GameEnd guest={two && !session.host} />
      </section>
    );
  }

  // One phone, before the drawing: hand it over, then look at the word in private.
  if (!two && !done && at === "pass") {
    return <Handover back="ocean" eyebrow={t("round", { n: round, total })} title={t("passTo", { name: session.names[artist] })} note={t("passNote", { name: session.names[artist === 0 ? 1 : 0] })} button={t("imHere", { name: session.names[artist] })} onGo={() => setStage({ key: roundKey, at: "peek" })} />;
  }
  if (!two && !done && at === "peek") {
    return (
      <section className="container-narrow py-12 text-center sm:py-16">
        <ScreenTop screen={`peek:${roundKey}`} />
        <p className="text-eyebrow text-blush">{t("peekEyebrow", { name: session.names[artist] })}</p>
        <PlayingCard rank="9" suit="diamond" corners="lg" className="deal-in mx-auto mt-6 w-full max-w-[420px]" faceClassName="min-h-[220px] items-center justify-center px-8 py-10">
          <span data-testid="peek-word" className="font-display text-[42px] leading-none">
            {word.word[locale]}
          </span>
        </PlayingCard>
        <p className="mx-auto mt-6 max-w-sm text-[15px] text-cream/60">{t("peekNote", { name: session.names[artist === 0 ? 1 : 0] })}</p>
        <button type="button" onClick={() => setStage({ key: roundKey, at: "draw" })} className="btn-rose mt-7 inline-flex h-12 items-center gap-2 rounded-full px-7 text-[15px] font-semibold">
          {t("peekGo")}
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </section>
    );
  }

  const canDraw = !done && iDraw && (two || at === "draw");
  const startStroke = (stroke: Stroke) => {
    const op: InkOp = { t: "start", stroke };
    paint((was) => applyInk(was, op, true), roundKey);
    if (two) sendInk(op, roundKey);
  };
  const addPoints = (id: number, points: number[], from: number) => {
    const op: InkOp = { t: "more", id, at: from, p: points };
    paint((was) => applyInk(was, op, true), roundKey);
    if (two) sendInk(op, roundKey);
  };
  const undo = () => {
    const next = strokes.slice(0, -1);
    paint(() => next, roundKey);
    if (two) sendInk({ t: "all", strokes: next }, roundKey);
  };
  const clear = () => {
    paint(() => [], roundKey);
    if (two) sendInk({ t: "clear" }, roundKey);
  };
  const guessed = state.guesses.filter((g) => g.player !== artist);

  return (
    <section className="container-narrow py-8 sm:py-12 max-lg:landscape:py-4">
      <ScreenTop screen={`round:${roundKey}`} />
      {peerGone}
      {/* Sideways, the board's column is as wide as the height allows it to be at 4:3, and never more than 60% of the row. */}
      <div className="grid grid-cols-1 max-lg:landscape:grid-cols-[min(calc((100svh-var(--header-h,76px)-2rem)*4/3),60%)_minmax(0,1fr)] max-lg:landscape:grid-rows-[auto_1fr] max-lg:landscape:gap-x-6">
        <div className={SIDE}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-eyebrow text-blush">{t("round", { n: round, total })}</p>
              <p className="mt-1 font-display text-[22px] text-cream">{done ? t("wordWas", { word: word.word[locale] }) : iDraw ? t("youDraw") : t("theyDraw", { name: session.names[artist] })}</p>
            </div>
            <Chip value={score} tone="gold" label={t("gotLabel")} />
          </div>

          {/* The word, where only the one drawing can see it: on two phones their own screen. */}
          {two && iDraw && !done ? (
            <p data-testid="draw-word" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-display text-[22px] text-cream ring-1 ring-white/15">
              {word.word[locale]}
            </p>
          ) : null}
        </div>

        {/* 4:3 always (strokes are fractions of the board, so the other phone's copy is the same
            shape), and never taller than the screen under the header: sideways, the board used to
            run off the bottom with the pens far below it. */}
        <div className="mx-auto mt-5 aspect-[4/3] w-full max-w-[calc((100svh-var(--header-h,76px)-2rem)*4/3)] max-lg:landscape:col-start-1 max-lg:landscape:row-span-2 max-lg:landscape:row-start-1 max-lg:landscape:mt-0">
          <DrawBoard strokes={strokes} canDraw={canDraw} colour={colour} onStart={startStroke} onPoints={addPoints} label={canDraw ? t("boardDraw") : t("boardWatch")} />
        </div>

        <div className={cn(SIDE, "max-lg:landscape:row-start-2")}>
          {canDraw ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2" role="group" aria-label={t("inkLabel")}>
                {INK.map((pen) => (
                  <button key={pen.id} type="button" aria-label={t(`ink.${pen.id}`)} aria-pressed={colour === pen.colour} onClick={() => setColour(pen.colour)} className={cn("size-11 rounded-full ring-2 transition-transform", colour === pen.colour ? "scale-110 ring-cream" : "ring-white/25 hover:scale-105")} style={{ backgroundColor: pen.colour }} />
                ))}
              </div>
              <button type="button" onClick={undo} disabled={strokes.length === 0} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/20 px-4 text-[13.5px] font-semibold text-cream hover:bg-white/10 disabled:opacity-40">
                <Undo2 aria-hidden="true" className="size-4" />
                {t("undo")}
              </button>
              <button type="button" onClick={clear} disabled={strokes.length === 0} className="inline-flex h-11 items-center gap-1.5 rounded-full border border-white/20 px-4 text-[13.5px] font-semibold text-cream hover:bg-white/10 disabled:opacity-40">
                <Eraser aria-hidden="true" className="size-4" />
                {t("clear")}
              </button>
            </div>
          ) : null}

          {/* Guessing: typed on two phones, out loud on one. */}
          {!done && two && !iDraw ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!guess.trim()) return;
                dispatch({ type: "guess", player: me, text: guess.trim() });
                setGuess("");
              }}
              className="mt-5 flex gap-2"
            >
              <input value={guess} onChange={(e) => setGuess(e.target.value)} maxLength={40} aria-label={t("guessLabel")} placeholder={t("guessPlaceholder")} className="h-12 w-full rounded-full border border-white/20 bg-white/10 px-5 text-[16px] text-cream outline-none placeholder:text-cream/40 focus:border-rose-tint/60" />
              <button type="submit" className="btn-rose h-12 shrink-0 rounded-full px-6 text-[15px] font-semibold">
                {t("guessSend")}
              </button>
            </form>
          ) : null}

          {two && guessed.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={t("guessesLabel")}>
              {guessed.slice(-5).map((g, i) => (
                <li key={`${g.text}-${i}`} className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px] font-semibold", g.right ? "bg-moss-soft text-moss" : "bg-white/10 text-cream/80")}>
                  {g.right ? <Check aria-hidden="true" className="size-3.5" /> : <X aria-hidden="true" className="size-3.5" />}
                  {g.text}
                </li>
              ))}
            </ul>
          ) : null}

          {!done && iDraw ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {!two ? (
                <button type="button" onClick={() => dispatch({ type: "got" })} className="btn-rose inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold">
                  <Check aria-hidden="true" className="size-4" />
                  {t("got", { name: session.names[other] })}
                </button>
              ) : null}
              <button type="button" onClick={() => dispatch({ type: "pass" })} className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-[15px] font-semibold text-cream hover:bg-white/10">
                {t("pass")}
              </button>
            </div>
          ) : null}

          {done ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <p className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14.5px] font-semibold", state.results[state.round] === "got" ? "bg-moss-soft text-moss" : "bg-white/10 text-cream")}>
                {state.results[state.round] === "got" ? <Check aria-hidden="true" className="size-4" /> : <X aria-hidden="true" className="size-4" />}
                {state.results[state.round] === "got" ? t("gotIt") : t("missed")}
              </p>
              <button type="button" onClick={() => dispatch({ type: "next" })} className="btn-rose inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold">
                {round < total ? t("next") : t("results")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            </div>
          ) : null}
          {!two ? <LeaveGame label={tl("change")} onLeave={onChangePlayers} /> : null}
        </div>
      </div>
    </section>
  );
}
