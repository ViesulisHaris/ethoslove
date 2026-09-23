"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { animate, motion, useMotionValue } from "motion/react";
import type { GiftLocale } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import { buzz } from "../_shared/synth";
import { Barcode, KindIcon, Matrix, P, Scissors, Traveller } from "./art";
import { fill, type Copy } from "./copy";
import type { TripKind } from "./schema";
import { playTear } from "./sounds";
import { formatDuration, type TicketDetails } from "./trip";
import {
  ROAD_VIEW,
  distanceAt,
  driveLegs,
  labelRoom,
  legsEnd,
  pathOf,
  pointAt,
  quadPoints,
  roadPins,
  roadThrough,
  track,
  twoLineChars,
  type Leg,
  type Track,
} from "./winding";

/** What every ticket prints, worked out once by the template. */
export type PassInfo = {
  kind: TripKind;
  recipient: string;
  sender: string;
  from: string;
  to: string;
  stops: string[];
  fromCode: string;
  toCode: string;
  date: string;
  nights: number;
  details: TicketDetails;
  km: number | null;
  minutes: number | null;
  bars: number[];
  grid: boolean[];
  gridSize: number;
  /** Tooth depths along the tear, 0..1. */
  edge: number[];
};

/** The main part and the stub, in --k. The stage centres the two together. */
export const MAIN_H = 100;
export const STUB_H = 28;
const TOOTH = 1.7;
/** The road map's pins, against its 100-unit width: big enough to see, small enough to leave the names room. */
const PIN_SCALE = 0.74;
/** How far short of the destination's pin the car parks, in the map's units. */
const PARK_SHORT = 5;
/** How far along its line the plane or train stops. */
const LANDS_AT = 0.86;
/** Drag the stub down this far (in --k) and it gives. */
const TEAR_AT = 13;
/** The road map's width in --k: the pass, less its padding. Its names are measured against it. */
const MAP_W = 74;
/**
 * A name on the map: its size, its widest, and how wide a letter of it runs (in em), guessed on
 * the wide side, since a guess that falls short breaks a one-word name in two.
 */
const PIN_FONT = 2.9;
const PIN_FONT_SMALL = 2.5;
const PIN_LABEL_MAX = 26;
const PIN_LABEL_PAD = 2;
const PIN_GLYPH = 0.6;

const shadow = "drop-shadow(0 calc(1.4*var(--k)) calc(2.2*var(--k)) rgba(0,0,0,.42))";

/** The two edges a tear leaves: the pass keeps the teeth, the stub the gaps between them. */
function tornEdges(edge: number[]) {
  const n = edge.length - 1;
  const x = (i: number) => `${((i / n) * 100).toFixed(2)}%`;
  const main = [
    "0 0",
    "100% 0",
    ...edge.map(
      (_, i) => `${x(n - i)} calc(100% - ${((1 - edge[n - i]) * TOOTH).toFixed(2)} * var(--k))`,
    ),
  ].join(",");
  const stub = [
    ...edge.map((d, i) => `${x(i)} calc(${(d * TOOTH).toFixed(2)} * var(--k))`),
    "100% 100%",
    "0 100%",
  ].join(",");
  return { main: `polygon(${main})`, stub: `polygon(${stub})` };
}

/** Moves an SVG group along a track on its timetable, one transform per frame, and lights each pin as it passes. */
function useRunner(
  target: RefObject<SVGGElement | null>,
  trk: Track,
  legs: Leg[],
  active: boolean,
  pins?: { at: number[]; els: RefObject<(SVGGElement | null)[]> },
) {
  useEffect(() => {
    const el = target.current;
    if (!active || !el) return;
    const end = legsEnd(legs);
    let raf = 0;
    let started = 0;
    let lit = 0;
    const tick = (now: number) => {
      started ||= now;
      const t = (now - started) / 1000;
      const d = distanceAt(legs, t);
      const p = pointAt(trk, d);
      el.setAttribute(
        "transform",
        `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${p.angle.toFixed(1)})`,
      );
      while (pins && lit < pins.at.length && d >= pins.at[lit] - 0.05)
        pins.els.current?.[lit++]?.setAttribute("data-on", "true");
      if (t < end) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, trk, legs, active, pins]);
}

const placeAt = (trk: Track, d: number) => {
  const p = pointAt(trk, d);
  return `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) rotate(${p.angle.toFixed(1)})`;
};

function Field({
  label,
  value,
  className,
  big,
}: {
  label: string;
  value: ReactNode;
  className?: string;
  big?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <span className="pyb-lbl">{label}</span>
      <span className="pyb-val" style={big ? { fontSize: "calc(4.4 * var(--k))" } : undefined}>
        {value}
      </span>
    </div>
  );
}

/** The route across the top of a boarding pass: two codes, a dotted arc, and the plane on it. */
function FlightRoute({
  info,
  s,
  moving,
  still,
}: {
  info: PassInfo;
  s: Copy;
  moving: boolean;
  still: boolean;
}) {
  const trk = useMemo(
    () => track(quadPoints({ x: 4, y: 25 }, { x: 50, y: -5 }, { x: 96, y: 25 }, 48)),
    [],
  );
  // It lands just short of the far dot, so it never sits on the destination's code.
  const legs = useMemo(() => [{ t0: 0.5, t1: 2.9, d0: 0, d1: trk.total * LANDS_AT }], [trk]);
  const plane = useRef<SVGGElement>(null);
  useRunner(plane, trk, legs, moving);
  const code = {
    fontSize: "calc(11 * var(--k))",
    lineHeight: 1,
    fontWeight: 800,
    letterSpacing: "0.02em",
    fontFamily: "var(--font-sans), system-ui, sans-serif",
  } as CSSProperties;
  return (
    <div className="relative">
      <div className="flex items-end justify-between">
        <div className="min-w-0">
          <span className="pyb-lbl">{s.from}</span>
          <span className="block tabular-nums" style={code}>
            {info.fromCode}
          </span>
          <span className="block max-w-[calc(30*var(--k))] truncate text-[calc(3*var(--k))] opacity-70">
            {info.from}
          </span>
        </div>
        <div className="min-w-0 text-right">
          <span className="pyb-lbl">{s.toLabel}</span>
          <span className="block tabular-nums" style={code}>
            {info.toCode}
          </span>
          <span className="ml-auto block max-w-[calc(30*var(--k))] truncate text-[calc(3*var(--k))] opacity-70">
            {info.to}
          </span>
        </div>
      </div>
      <svg
        viewBox="0 0 100 30"
        className="absolute top-[calc(3.4*var(--k))] left-[calc(22*var(--k))] h-[calc(10*var(--k))] w-[calc(30*var(--k))] overflow-visible"
        aria-hidden="true"
      >
        <path
          d={pathOf(trk.pts)}
          fill="none"
          stroke={P.ink}
          strokeOpacity=".45"
          strokeWidth="1.3"
          strokeDasharray="2.2 3"
          strokeLinecap="round"
        />
        <circle cx="4" cy="25" r="2.2" fill={P.ink} opacity=".5" />
        <circle cx="96" cy="25" r="2.2" fill="var(--gift-accent)" />
        <g ref={plane} transform={placeAt(trk, still ? trk.total * 0.62 : 0)}>
          <g transform="scale(1.9)">
            <Traveller kind="flight" color="var(--gift-accent)" />
          </g>
        </g>
      </svg>
    </div>
  );
}

/** A train ticket's route: both names, and the line between them with the train on it. */
function TrainRoute({
  info,
  s,
  moving,
  still,
}: {
  info: PassInfo;
  s: Copy;
  moving: boolean;
  still: boolean;
}) {
  const trk = useMemo(
    () => track(quadPoints({ x: 3, y: 9 }, { x: 50, y: 4 }, { x: 97, y: 9 }, 40)),
    [],
  );
  const legs = useMemo(() => [{ t0: 0.5, t1: 3.1, d0: 0, d1: trk.total * LANDS_AT }], [trk]);
  const train = useRef<SVGGElement>(null);
  useRunner(train, trk, legs, moving);
  const size = (name: string) =>
    `calc(${name.length <= 8 ? 6.4 : name.length <= 12 ? 5 : 3.8} * var(--k))`;
  return (
    <div>
      <div className="flex items-start justify-between gap-[calc(3*var(--k))]">
        <div className="min-w-0 flex-1">
          <span className="pyb-lbl">{s.from}</span>
          <span
            className="mt-[calc(.6*var(--k))] line-clamp-2 leading-[1.05] font-bold [overflow-wrap:anywhere]"
            style={{ fontSize: size(info.from), fontFamily: "var(--gift-font-display)" }}
          >
            {info.from}
          </span>
        </div>
        <div className="min-w-0 flex-1 text-right">
          <span className="pyb-lbl">{s.toLabel}</span>
          <span
            className="mt-[calc(.6*var(--k))] line-clamp-2 leading-[1.05] font-bold [overflow-wrap:anywhere]"
            style={{ fontSize: size(info.to), fontFamily: "var(--gift-font-display)" }}
          >
            {info.to}
          </span>
        </div>
      </div>
      <svg
        viewBox="0 0 100 14"
        className="mt-[calc(1.6*var(--k))] block h-[calc(10*var(--k))] w-full overflow-visible"
        aria-hidden="true"
      >
        <path
          d={pathOf(trk.pts)}
          fill="none"
          stroke={P.ink}
          strokeOpacity=".3"
          strokeWidth="2.6"
          strokeDasharray=".5 1.6"
        />
        <path d={pathOf(trk.pts)} fill="none" stroke={P.ink} strokeOpacity=".55" strokeWidth=".5" />
        <circle cx="3" cy="9" r="1.6" fill={P.ink} opacity=".55" />
        <circle cx="97" cy="9" r="1.6" fill="var(--gift-accent)" />
        <g ref={train} transform={placeAt(trk, still ? trk.total * 0.62 : 0)}>
          <g transform="translate(0 -2.4) scale(.9)">
            <Traveller kind="train" color="var(--gift-accent)" />
          </g>
        </g>
      </svg>
    </div>
  );
}

/** A road trip's map: a winding road through every stop, a pin at each, and the car driving it stop by stop. */
function RoadMap({ info, moving, still }: { info: PassInfo; moving: boolean; still: boolean }) {
  const names = useMemo(
    () => [info.from, ...info.stops, info.to],
    [info.from, info.stops, info.to],
  );
  const { trk, pinAt, pins } = useMemo(() => {
    const spots = roadPins(names.length);
    const road = roadThrough(spots);
    // The car pulls up just short of the last pin, so the heart stays in sight.
    const stops = road.pinAt.map((d, i, all) =>
      i === all.length - 1 ? Math.max(all[i - 1] ?? 0, d - PARK_SHORT) : d,
    );
    return { trk: road.track, pinAt: stops, pins: spots };
  }, [names.length]);
  const legs = useMemo(() => driveLegs(pinAt, { delay: 0.6 }), [pinAt]);
  const car = useRef<SVGGElement>(null);
  const pinEls = useRef<(SVGGElement | null)[]>([]);
  const lights = useMemo(() => ({ at: pinAt, els: pinEls }), [pinAt]);
  useRunner(car, trk, legs, moving, lights);
  const d = pathOf(trk.pts);
  const last = names.length - 1;
  const font = names.length > 5 ? PIN_FONT_SMALL : PIN_FONT;
  const labels = useMemo(() => {
    const above = pins.map((p) => p.y < ROAD_VIEW.h / 2);
    const lean = pins.map((_, i) => (i === 0 ? 0.18 : i === pins.length - 1 ? 0.82 : 0.5));
    // In the map's own units, which are percent of its width.
    const width = (letters: number) =>
      (Math.min(PIN_LABEL_MAX, letters * font * PIN_GLYPH + PIN_LABEL_PAD) / MAP_W) * 100;
    const want = names.map((name) => width(Array.from(name).length));
    const need = names.map((name) => width(twoLineChars(name)));
    const room = labelRoom(pins, above, want, need, lean);
    return pins.map((_, i) => ({ above: above[i], lean: lean[i], room: room[i] }));
  }, [pins, names, font]);

  return (
    <div className="relative mx-auto aspect-[100/60] w-full">
      <svg
        viewBox={`0 0 ${ROAD_VIEW.w} ${ROAD_VIEW.h}`}
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden="true"
      >
        <rect x="0" y="0" width="100" height="60" rx="3" fill="#EDE3CC" />
        <path
          d="M-2 34C14 28 22 40 38 36S62 22 78 30 96 40 102 36"
          fill="none"
          stroke="#9DC3D6"
          strokeWidth="2.2"
          opacity=".55"
        />
        <g fill="none" stroke={P.hillDeep} strokeOpacity=".28" strokeWidth=".45">
          <ellipse cx="22" cy="14" rx="14" ry="7" />
          <ellipse cx="22" cy="14" rx="9" ry="4.2" />
          <ellipse cx="80" cy="50" rx="15" ry="7" />
          <ellipse cx="80" cy="50" rx="9.5" ry="4" />
          <ellipse cx="56" cy="8" rx="9" ry="4" />
        </g>
        {[
          [4, 18],
          [6.5, 20],
          [47, 57],
          [95, 12],
          [61, 30],
        ].map(([x, y]) => (
          <path
            key={`${x}-${y}`}
            d={`M${x} ${y}c-1.2-2.2-1.2-5.4 0-8 1.2 2.6 1.2 5.8 0 8z`}
            fill={P.hillDeep}
            opacity=".75"
          />
        ))}
        <path
          d={d}
          fill="none"
          stroke="#2A2D33"
          strokeWidth="6.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={d}
          fill="none"
          stroke={P.asphalt}
          strokeWidth="5.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d={d} fill="none" stroke="#F7F0E1" strokeWidth=".55" strokeDasharray="2.2 2.2" />
        {pins.map((p, i) => (
          // The pop is a CSS transform, which would replace an SVG transform on the same element; so the pin is placed by its parent.
          <g key={i} transform={`translate(${p.x} ${p.y})`}>
            <g
              ref={(el) => {
                pinEls.current[i] = el;
              }}
              className="pyb-pin"
              data-on={still || i === 0 ? "true" : "false"}
            >
              <g transform={`scale(${PIN_SCALE})`}>
                {i === last ? (
                  <path
                    d="M0 0C-4.6-4.2-6.4-7-6.4-9.4-6.4-11.6-4.7-13.2-2.8-13.2-1.6-13.2-.6-12.6 0-11.6.6-12.6 1.6-13.2 2.8-13.2 4.7-13.2 6.4-11.6 6.4-9.4 6.4-7 4.6-4.2 0 0Z"
                    fill="var(--gift-accent)"
                    stroke="#F7F0E1"
                    strokeWidth=".9"
                  />
                ) : (
                  <>
                    <path
                      d="M0 0C-3.4-3.6-4.6-5.6-4.6-7.6A4.6 4.6 0 0 1 4.6-7.6C4.6-5.6 3.4-3.6 0 0Z"
                      fill={i === 0 ? P.ink : "var(--gift-accent)"}
                      stroke="#F7F0E1"
                      strokeWidth=".8"
                    />
                    <circle cy="-7.6" r="1.6" fill="#F7F0E1" />
                  </>
                )}
              </g>
            </g>
          </g>
        ))}
        <g ref={car} transform={placeAt(trk, still ? (pinAt.at(-1) ?? trk.total) : 0)}>
          <g transform="scale(1.05)">
            <Traveller kind="road" color="var(--gift-accent)" />
          </g>
        </g>
      </svg>
      {pins.map((p, i) => {
        const { above, lean, room } = labels[i];
        return (
          <span
            key={i}
            className="absolute line-clamp-2 w-max rounded-[calc(.8*var(--k))] px-[calc(1*var(--k))] text-center leading-[1.15] font-semibold [overflow-wrap:anywhere]"
            style={{
              left: `${p.x}%`,
              top: `${(p.y / ROAD_VIEW.h) * 100}%`,
              // Crowded, a name takes a second line before it gives up any letters.
              maxWidth: `${room.toFixed(2)}%`,
              // Above a pin that stands up from the road, or under the road where it only touches.
              translate: `${-lean * 100}% ${above ? "calc(-100% - 7.4 * var(--k))" : "calc(1.8 * var(--k))"}`,
              fontSize: `calc(${font} * var(--k))`,
              background: "rgba(247,240,225,.88)",
              color: i === last ? "var(--gift-accent-deep)" : P.ink,
            }}
          >
            {names[i]}
          </span>
        );
      })}
    </div>
  );
}

function Header({ kind, title, aside }: { kind: TripKind; title: string; aside: string }) {
  return (
    <div
      className="flex h-[calc(13*var(--k))] items-center justify-between gap-[calc(2*var(--k))] px-[calc(5*var(--k))]"
      style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }}
    >
      <span
        className="flex min-w-0 items-center gap-[calc(1.6*var(--k))] font-bold uppercase"
        style={{
          fontSize: "calc(2.9 * var(--k))",
          letterSpacing: "0.22em",
          fontFamily: "var(--font-sans), system-ui, sans-serif",
        }}
      >
        <KindIcon kind={kind} className="size-[calc(4.4*var(--k))] shrink-0" />
        <span className="truncate">{title}</span>
      </span>
      <span
        className="shrink-0 font-semibold uppercase tabular-nums opacity-85"
        style={{ fontSize: "calc(2.7 * var(--k))", letterSpacing: "0.12em" }}
      >
        {aside}
      </span>
    </div>
  );
}

/**
 * The ticket: the main part with everything on it, and a stub under a perforated line. Pull the
 * stub down (or tap it, or press Enter on it) and it tears off with a jagged edge and falls away;
 * `onTorn` fires once it has gone, for the message to come up.
 */
export function Pass({
  info,
  s,
  locale,
  preview,
  reduce,
  moving,
  muted,
  torn,
  onTear,
  onTorn,
}: {
  info: PassInfo;
  s: Copy;
  locale: GiftLocale;
  preview: boolean;
  reduce: boolean;
  /** The plane, train or car sets off along its line. */
  moving: boolean;
  muted: boolean;
  torn: boolean;
  onTear: () => void;
  onTorn: () => void;
}) {
  const still = preview || reduce;
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);
  const opacity = useMotionValue(1);
  const recoil = useMotionValue(0);
  const drag = useRef<{ id: number; from: number; moved: number } | null>(null);
  const [kPx, setKPx] = useState(4);
  const stubRef = useRef<HTMLButtonElement>(null);
  const edges = useMemo(() => tornEdges(info.edge), [info.edge]);
  const leftSide = info.edge[0] > 0.5 ? -1 : 1;

  const gone = useRef(0);
  useEffect(() => () => window.clearTimeout(gone.current), []);

  // --k in pixels, for turning a finger's drag into the ticket's units. The layout height, not the
  // drawn one: the ticket is still tilted from sliding in when this first measures.
  useEffect(() => {
    const el = stubRef.current;
    if (!el) return;
    const measure = () => setKPx(el.offsetHeight / STUB_H || 4);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tear = () => {
    if (torn || preview) return;
    drag.current = null;
    onTear();
    playTear(muted);
    buzz(18);
    if (reduce) {
      void animate(opacity, 0, { duration: 0.3 });
      gone.current = window.setTimeout(onTorn, 320);
      return;
    }
    void animate(y, kPx * 150, { duration: 1, ease: [0.55, 0, 1, 0.45] });
    void animate(rotate, leftSide * 26, { type: "spring", stiffness: 55, damping: 8 });
    void animate(opacity, 0, { delay: 0.7, duration: 0.3 });
    void animate(recoil, [0, -1.4, 0.6, 0], { duration: 0.7, ease: "easeOut" });
    gone.current = window.setTimeout(onTorn, 650);
  };

  const down = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (torn || preview) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { id: e.pointerId, from: e.clientY, moved: 0 };
  };
  const move = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = Math.max(0, e.clientY - d.from);
    d.moved = Math.max(d.moved, Math.abs(e.clientY - d.from));
    // Card stretches a little before it gives: the stub follows the finger at half speed.
    y.set(dy * 0.5);
    rotate.set(leftSide * dy * 0.02);
    if (dy / kPx >= TEAR_AT) tear();
  };
  const up = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    // A cancelled touch (the system took the gesture) is never a tap, however little it moved.
    if (d.moved < 6 && e.type === "pointerup") tear();
    else {
      void animate(y, 0, { type: "spring", stiffness: 500, damping: 22 });
      void animate(rotate, 0, { type: "spring", stiffness: 400, damping: 20 });
    }
  };

  const { kind, details } = info;
  const aside =
    kind === "flight"
      ? details.flightNo
      : kind === "train"
        ? `${s.train} ${details.trainNo}`
        : fill(info.nights === 1 ? s.night : s.nights, { n: info.nights });
  const distance =
    info.km !== null && info.minutes !== null
      ? `${info.km.toLocaleString(locale)} km · ${fill(s.about[kind], { time: formatDuration(info.minutes) })}`
      : null;
  const via =
    info.stops.length && kind !== "road" ? fill(s.via, { places: info.stops.join(", ") }) : null;

  return (
    <div
      className="relative mx-auto w-[calc(84*var(--k))]"
      data-testid="pyb-pass"
      data-torn={torn ? "true" : "false"}
    >
      <motion.div style={{ rotate: recoil, filter: shadow, transformOrigin: "50% 0%" }}>
        <div
          className={cn(
            "pyb-paper pyb-notch-b relative flex flex-col overflow-hidden rounded-t-[calc(3.4*var(--k))]",
          )}
          style={{ height: `calc(${MAIN_H} * var(--k))`, clipPath: torn ? edges.main : undefined }}
        >
          <Header kind={kind} title={s.pass[kind]} aside={aside} />
          <div className="flex flex-1 flex-col px-[calc(5*var(--k))] pt-[calc(3.6*var(--k))] pb-[calc(4.4*var(--k))]">
            {kind === "flight" ? (
              <FlightRoute info={info} s={s} moving={moving} still={still} />
            ) : kind === "train" ? (
              <TrainRoute info={info} s={s} moving={moving} still={still} />
            ) : (
              <RoadMap info={info} moving={moving} still={still} />
            )}
            {/* The distance first: a long list of stops is what the line can afford to lose. */}
            {distance || via ? (
              <p className="mt-[calc(1.8*var(--k))] truncate text-center text-[calc(2.9*var(--k))] opacity-65">
                {[distance, via].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            <div className="my-auto grid grid-cols-3 gap-x-[calc(3*var(--k))] gap-y-[calc(2.6*var(--k))] pt-[calc(2.4*var(--k))]">
              <Field label={s.passenger} value={info.recipient} className="col-span-2" big />
              <Field label={s.with} value={info.sender} big />
              <Field label={s.date} value={info.date} />
              {kind === "flight" ? (
                <>
                  <Field label={s.boarding} value={details.boards} />
                  <Field label={s.gate} value={details.gate} />
                  <Field label={s.seats} value={details.seats.join(" · ")} />
                  <Field label={s.departsLabel} value={details.departs} />
                  <Field label={s.nightsLabel} value={info.nights} />
                </>
              ) : kind === "train" ? (
                <>
                  <Field label={s.departsLabel} value={details.departs} />
                  <Field label={s.platform} value={details.platform} />
                  <Field label={s.coach} value={details.coach} />
                  <Field label={s.seats} value={details.trainSeats.join(" · ")} />
                  <Field label={s.nightsLabel} value={info.nights} />
                </>
              ) : (
                <>
                  <Field label={s.nightsLabel} value={info.nights} />
                  <Field label={s.stops} value={info.stops.length} />
                </>
              )}
            </div>
            {kind === "flight" ? (
              <div className="mt-[calc(3*var(--k))]">
                <Barcode
                  bars={info.bars}
                  className="block h-[calc(7.5*var(--k))] w-full text-[#1F2735]"
                />
                <p className="mt-[calc(1*var(--k))] truncate text-center font-mono text-[calc(2.3*var(--k))] tracking-[0.24em] opacity-60">
                  {details.flightNo.replace(" ", "")} · {details.seats.join("")} · {info.fromCode}
                  {info.toCode}
                </p>
              </div>
            ) : kind === "train" ? (
              <div className="mt-[calc(3*var(--k))] flex items-center gap-[calc(3.4*var(--k))]">
                <Matrix
                  cells={info.grid}
                  size={info.gridSize}
                  className="size-[calc(13*var(--k))] shrink-0 text-[#1F2735]"
                />
                <p className="min-w-0 font-mono text-[calc(2.4*var(--k))] leading-[1.6] tracking-[0.16em] uppercase opacity-65">
                  <span className="block truncate">
                    {s.train} {details.trainNo}
                  </span>
                  <span className="block truncate">
                    {s.coach} {details.coach} · {details.trainSeats.join("/")}
                  </span>
                  <span className="block truncate">{info.date}</span>
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>

      <motion.button
        ref={stubRef}
        type="button"
        data-testid="pyb-stub"
        aria-label={s.tearLabel}
        disabled={torn || preview}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onClick={(e) => {
          // A keyboard press arrives as a click with no pointer behind it; a tap was handled on pointer-up.
          if (e.detail === 0) tear();
        }}
        className="relative block w-full touch-none rounded-b-[calc(3.4*var(--k))] text-left outline-none select-none focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white/80"
        style={{
          y,
          rotate,
          opacity,
          filter: shadow,
          transformOrigin: leftSide < 0 ? "0% 0%" : "100% 0%",
          height: `calc(${STUB_H} * var(--k))`,
          cursor: torn || preview ? "default" : "grab",
        }}
      >
        <div
          className="pyb-paper pyb-notch-t relative flex h-full items-center gap-[calc(3*var(--k))] rounded-b-[calc(3.4*var(--k))] px-[calc(5*var(--k))] pt-[calc(1.6*var(--k))]"
          style={{ clipPath: torn ? edges.stub : undefined }}
        >
          <span
            aria-hidden="true"
            className="absolute top-0 right-[calc(3.6*var(--k))] left-[calc(3.6*var(--k))] border-t-[calc(.45*var(--k))] border-dashed opacity-40"
            style={{ borderColor: P.ink }}
          />
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-[calc(2.4*var(--k))] gap-y-[calc(1.6*var(--k))]">
            <Field label={s.passenger} value={info.recipient} />
            {kind === "flight" ? (
              <Field label={s.seats} value={details.seats.join(" · ")} />
            ) : kind === "train" ? (
              <Field label={s.coach} value={`${details.coach} · ${details.trainSeats.join("/")}`} />
            ) : (
              <Field label={s.nightsLabel} value={info.nights} />
            )}
            <Field label={s.with} value={info.sender} />
            {kind === "flight" ? (
              <Field label={s.gate} value={details.gate} />
            ) : kind === "train" ? (
              <Field label={s.platform} value={details.platform} />
            ) : (
              <Field label={s.date} value={info.date} />
            )}
          </div>
          {kind === "road" ? (
            <span
              className="grid size-[calc(17*var(--k))] shrink-0 -rotate-12 place-items-center rounded-full border-[calc(.5*var(--k))] border-double text-center font-bold uppercase"
              style={{
                borderColor: "var(--gift-accent-deep)",
                color: "var(--gift-accent-deep)",
                fontSize: "calc(2.5 * var(--k))",
                letterSpacing: "0.12em",
                lineHeight: 1.2,
              }}
            >
              {s.admitTwo}
            </span>
          ) : (
            <div className="shrink-0 text-right">
              <span
                className="block font-extrabold tabular-nums"
                style={{
                  fontSize: "calc(5.4 * var(--k))",
                  lineHeight: 1,
                  fontFamily: "var(--font-sans), system-ui, sans-serif",
                }}
              >
                {kind === "flight" ? info.toCode : details.departs}
              </span>
              <Barcode
                bars={info.bars.slice(0, 40)}
                className="mt-[calc(1.4*var(--k))] ml-auto block h-[calc(5*var(--k))] w-[calc(20*var(--k))] text-[#1F2735]"
              />
            </div>
          )}
        </div>
      </motion.button>

      {!torn ? (
        <div
          className={cn(
            "pointer-events-none absolute left-[calc(4.6*var(--k))] flex items-center gap-[calc(1*var(--k))] rounded-full px-[calc(2*var(--k))] py-[calc(.6*var(--k))] font-semibold uppercase",
            !still && "pyb-hint",
          )}
          style={{
            top: `calc(${MAIN_H - 2.6} * var(--k))`,
            background: P.ink,
            color: "#F7F0E1",
            fontSize: "calc(2.6 * var(--k))",
            letterSpacing: "0.16em",
          }}
          aria-hidden="true"
        >
          <Scissors className="size-[calc(3.3*var(--k))]" />
          {s.tear}
        </div>
      ) : null}
    </div>
  );
}
