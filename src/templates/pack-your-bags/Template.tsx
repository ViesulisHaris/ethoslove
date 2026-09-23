"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { PAPER_GRAIN } from "../_shared/cover-kit";
import { Board, type BoardLabels } from "./Board";
import { CSS } from "./css";
import { S, fill, type Copy } from "./copy";
import { flapText, wrapLines, type BoardTexts } from "./flaps";
import { PackStage } from "./Pack";
import { MAIN_H, Pass, STUB_H, type PassInfo } from "./Passes";
import { Reading } from "./Reading";
import { fieldsSchema, type PackYourBagsFields } from "./schema";
import { playChime } from "./sounds";
import { barcode, cluesFor, codeGrid, decoyRows, locate, placeCode, tearEdge, ticketDate, ticketDetails, travelMinutes, tripKm, tripSeed } from "./trip";

type Stage = "pack" | "board" | "ticket";
type Data = TemplateProps<PackYourBagsFields>["data"];

/** The destination's longest line on the board, in letters, before it wraps. */
const HERO_LINE = 12;
/** A stop's name on the road board is cut to this, so the column fits a phone. */
const STOP_LINE = 18;
const GRID = 19;

/** A departure lounge at golden hour: deep blue, warm light from the windows, the sender's colour low down. */
const ROOM: CSSProperties = {
  background:
    "radial-gradient(120% 70% at 50% -12%, rgba(255,190,120,.3), transparent 60%), radial-gradient(90% 55% at 50% 116%, rgba(var(--gift-accent-rgb),.24), transparent 70%), linear-gradient(180deg, #1B2434 0%, #121A28 58%, #0B1019 100%)",
  color: "#F7F0E1",
  fontFamily: "var(--gift-font-body)",
};
const BEAMS = "repeating-linear-gradient(112deg, rgba(255,226,180,.05) 0 calc(9*var(--u)), transparent calc(9*var(--u)) calc(23*var(--u)))";

/** The first letter of a name, for the monogram sewn into the lid. */
const initialOf = (name: string) => (Array.from(name.trim().normalize("NFD"))[0] ?? "·").toUpperCase();

/** Everything the board and the ticket print, worked out once from the gift. */
function planTrip(data: Data, fields: PackYourBagsFields, s: Copy) {
  const kind = fields.trip;
  const seed = tripSeed(data.recipientName, data.senderName, fields.fromCity, fields.toCity);
  const details = ticketDetails(seed, { recipient: data.recipientName, sender: data.senderName }, data.countdown);
  const date = ticketDate(fields.when, data.countdown, data.locale, s.soon);
  const from = locate(fields.fromCity, fields.fromCoords);
  const to = locate(fields.toCity, fields.toCoords);
  const km = tripKm(
    from,
    fields.stops.map((stop) => locate(stop)),
    to,
  );
  const board = s.board[kind];

  const hero = wrapLines(flapText(fields.toCity) || "?", HERO_LINE);
  const stops = fields.stops.map((stop) => flapText(stop).slice(0, STOP_LINE));
  const stopWidth = Math.max(0, ...stops.map((stop) => stop.length));
  const texts: BoardTexts =
    kind === "road"
      ? { hero, info: [String(fields.nights).padStart(2, "0")], rows: stops.map((stop, i) => [String(i + 1).padStart(2, "0"), stop.padEnd(stopWidth)]) }
      : {
          hero,
          info: [details.departs, kind === "flight" ? details.gate : details.platform.padStart(2)],
          rows: decoyRows(kind, data.locale, seed, details.departs, [fields.toCity, fields.fromCity, ...hero]),
        };
  const labels: BoardLabels = {
    title: board.title,
    aside: date,
    caption: fill(board.caption, { no: kind === "flight" ? details.flightNo : details.trainNo, from: fields.fromCity }),
    info: board.info,
    columns: board.columns,
    status: board.status,
  };
  const detail =
    kind === "road"
      ? fill(fields.nights === 1 ? s.night : s.nights, { n: fields.nights })
      : kind === "flight"
        ? `${s.gate} ${details.gate}, ${details.departs}. ${board.status}.`
        : `${s.platform} ${details.platform}, ${details.departs}. ${board.status}.`;

  const pass: PassInfo = {
    kind,
    recipient: data.recipientName,
    sender: data.senderName,
    from: fields.fromCity,
    to: fields.toCity,
    stops: fields.stops,
    fromCode: placeCode(fields.fromCity),
    toCode: placeCode(fields.toCity),
    date,
    nights: fields.nights,
    details,
    km,
    minutes: km === null ? null : travelMinutes(km, kind),
    bars: barcode(seed),
    grid: codeGrid(seed, GRID),
    gridSize: GRID,
    edge: tearEdge(seed),
  };

  return {
    kind,
    seed,
    date,
    texts,
    labels,
    pass,
    next: board.next,
    announce: fill(s.announce, { place: fields.toCity, detail }),
    clues: cluesFor(kind, fields.clues, data.locale),
    monogram: `${initialOf(data.recipientName)} & ${initialOf(data.senderName)}`,
  };
}

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<PackYourBagsFields>) {
  const reduce = !!useReducedMotion();
  const preview = mode === "preview";
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, !preview);
  // Parsed here as well, so a draft saved before a field changed shape still opens instead of crashing.
  const fields = useMemo(() => {
    const parsed = fieldsSchema.safeParse(data.fields);
    return parsed.success ? parsed.data : fieldsSchema.parse({});
  }, [data.fields]);
  const trip = useMemo(() => planTrip(data, fields, s), [data, fields, s]);

  const [stage, setStage] = useState<Stage>(preview ? "ticket" : "pack");
  const [run, setRun] = useState(0);
  const eventRef = useRef(onEvent);
  const mutedRef = useRef(audio.muted);
  useEffect(() => {
    eventRef.current = onEvent;
    mutedRef.current = audio.muted;
  });

  const { start } = audio;
  const replay = () => {
    setStage("pack");
    setRun((r) => r + 1);
  };

  return (
    <div className="pyb absolute inset-0 overflow-hidden select-none" style={ROOM}>
      <style>{CSS}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: BEAMS, maskImage: "linear-gradient(180deg, #000, transparent 70%)", WebkitMaskImage: "linear-gradient(180deg, #000, transparent 70%)" }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: PAPER_GRAIN }} />
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[#05080E]" initial={false} animate={{ opacity: stage === "board" ? 0.45 : 0 }} transition={{ duration: 0.6 }} />
      {!preview && !reduce && stage !== "board" ? (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <Ambience layers={[{ kind: "dust", colors: ["#FFE7BF", "#FFFFFF"], count: 14 }]} opacity={0.7} />
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {stage === "pack" ? (
          <motion.div key={`pack-${run}`} className="absolute inset-0" exit={{ opacity: 0, scale: reduce ? 1 : 0.97, transition: { duration: reduce ? 0.2 : 0.45 } }}>
            <PackStage
              s={s}
              recipient={data.recipientName}
              clues={trip.clues}
              date={trip.date}
              nights={fields.nights}
              monogram={trip.monogram}
              seed={trip.seed}
              reduce={reduce}
              muted={audio.muted}
              onStart={() => {
                void start();
                eventRef.current?.({ type: "started" });
              }}
              onPacked={() => eventRef.current?.({ type: "progress", pct: 25 })}
              onGo={() => {
                void start();
                setStage("board");
              }}
            />
          </motion.div>
        ) : stage === "board" ? (
          <motion.div key={`board-${run}`} className="absolute inset-0" initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: reduce ? 0.2 : 0.4 } }} transition={{ duration: reduce ? 0.2 : 0.5 }}>
            <Departures
              s={s}
              trip={trip}
              toCity={fields.toCity}
              still={reduce}
              mutedRef={mutedRef}
              onResolved={() => eventRef.current?.({ type: "progress", pct: 50 })}
              onNext={() => {
                void start();
                setStage("ticket");
              }}
            />
          </motion.div>
        ) : (
          <TicketStage
            key={`ticket-${run}`}
            data={data}
            mode={mode}
            s={s}
            pass={trip.pass}
            preview={preview}
            reduce={reduce}
            muted={audio.muted}
            onTear={() => eventRef.current?.({ type: "progress", pct: 75 })}
            onEvent={onEvent}
            onReact={onReact}
            onMakeOne={onMakeOne}
            onReplay={preview ? undefined : replay}
          />
        )}
      </AnimatePresence>

      <SoundToggle audio={audio} locale={data.locale} />
    </div>
  );
}

/** The board clatters, lands on where they're going, and says it out loud. */
function Departures({
  s,
  trip,
  toCity,
  still,
  mutedRef,
  onResolved,
  onNext,
}: {
  s: Copy;
  trip: ReturnType<typeof planTrip>;
  toCity: string;
  still: boolean;
  mutedRef: RefObject<boolean>;
  onResolved: () => void;
  onNext: () => void;
}) {
  const [play, setPlay] = useState(false);
  const [settled, setSettled] = useState(still);
  const resolved = useRef(onResolved);
  useEffect(() => {
    resolved.current = onResolved;
  });

  // Let the stage fade in before the first leaf falls.
  useEffect(() => {
    if (still) {
      resolved.current();
      return;
    }
    const id = window.setTimeout(() => setPlay(true), 520);
    return () => window.clearTimeout(id);
  }, [still]);

  const land = () => {
    setSettled(true);
    playChime(mutedRef.current);
    resolved.current();
  };

  const [before, after] = s.answer.split("{place}");
  const k = (n: number) => `calc(${n} * var(--k))`;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[calc(4.4*var(--k))] px-[calc(3*var(--k))]">
      <div className="flex min-h-[calc(17*var(--k))] w-[calc(92*var(--k))] items-end justify-center text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.h2
            key={settled ? "answer" : "question"}
            className="leading-[1.05] text-balance italic [overflow-wrap:anywhere]"
            style={{ fontFamily: "var(--gift-font-display)", fontSize: k(toCity.length > 16 && settled ? 6 : 7.4) }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
          >
            {settled ? (
              <>
                {before}
                <span style={{ color: "var(--gift-accent-soft)" }}>{toCity}</span>
                {after}
              </>
            ) : (
              s.question
            )}
          </motion.h2>
        </AnimatePresence>
      </div>

      <Board kind={trip.kind} texts={trip.texts} labels={trip.labels} seed={trip.seed} play={play} still={still} mutedRef={mutedRef} settled={settled} onSettled={land} />
      <p className="sr-only" aria-live="polite">
        {settled ? trip.announce : ""}
      </p>

      <div className="flex min-h-[calc(13*var(--k))] items-start justify-center">
        <AnimatePresence>
          {settled ? (
            <motion.button
              key="next"
              type="button"
              data-testid="pyb-to-ticket"
              onClick={onNext}
              className="pyb-go relative min-h-11 rounded-full font-semibold tracking-[0.18em] uppercase shadow-[0_calc(1.4*var(--k))_calc(3*var(--k))_rgba(0,0,0,.45)] outline-none focus-visible:ring-4 focus-visible:ring-white/70"
              style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)", fontSize: k(3.2), padding: `${k(3.3)} ${k(7)}` }}
              initial={still ? { opacity: 0 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: still ? 0 : 0.9, type: "spring", stiffness: 200, damping: 18 }}
            >
              {trip.next}
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** The ticket slides up; tear the stub and the letter comes up under it. */
function TicketStage({
  data,
  mode,
  s,
  pass,
  preview,
  reduce,
  muted,
  onTear,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
}: {
  data: Data;
  mode: TemplateProps["mode"];
  s: Copy;
  pass: PassInfo;
  preview: boolean;
  reduce: boolean;
  muted: boolean;
  onTear: () => void;
  onEvent?: TemplateProps["onEvent"];
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
}) {
  const [torn, setTorn] = useState(false);
  const [reading, setReading] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={scroller}
      className={cn("absolute inset-0 overflow-x-hidden overscroll-contain scrollbar-none", reading ? "overflow-y-auto" : "overflow-y-hidden")}
      initial={{ opacity: preview ? 1 : 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative" style={{ paddingTop: `max(calc(6 * var(--k)), calc((100cqh - ${MAIN_H + STUB_H} * var(--k)) / 2))` }}>
        <motion.div initial={preview ? false : reduce ? { opacity: 0 } : { y: "70%", rotate: 4, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} transition={reduce ? { duration: 0.3 } : { type: "spring", stiffness: 70, damping: 15, opacity: { duration: 0.35 } }}>
          <Pass
            info={pass}
            s={s}
            locale={data.locale}
            preview={preview}
            reduce={reduce}
            moving={!preview && !reduce}
            muted={muted}
            torn={torn}
            onTear={() => {
              setTorn(true);
              onTear();
            }}
            onTorn={() => setReading(true)}
          />
        </motion.div>
        {reading ? <Reading data={data} s={s} mode={mode} reduce={reduce} scroller={scroller} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} /> : null}
      </div>
    </motion.div>
  );
}
