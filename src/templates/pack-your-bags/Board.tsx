"use client";

import { memo, useEffect, useMemo, useRef, type CSSProperties, type RefObject } from "react";
import { mulberry32 } from "../_shared/random";
import { KindIcon } from "./art";
import { boardPlans, planFlips, settledAt, tileWidth, type BoardTexts } from "./flaps";
import type { TripKind } from "./schema";
import { playFlaps } from "./sounds";

/** One leaf's whole fall, both halves, in ms. */
export const FLIP_MS = 76;
/** The board's inner width, in --k. */
const ROOM = 86;
/** Tiles never get bigger than this, however short the name: a board, not a billboard. */
const HERO_CAP = 9.4;
const ROW_CAP = 5.4;
const INFO_TILE = 4.4;
/** A tile is taller than it is wide, like the real ones. */
const TALL = 1.42;
/** The gap between tiles, and between a row's columns, in tile widths. */
const TILE_GAP = 0.12;
const COLUMN_GAP = 1.2;
/** How many tile widths `n` tiles and the gaps between them take up. */
const span = (n: number) => n * (1 + TILE_GAP) - TILE_GAP;
/** Leave at least this long between two clicks of the clatter, so it stays a clatter and not a buzz. */
const CLICK_GAP_MS = 42;

type Skin = { panel: string; frame: string; ink: string; lamp: string; flap: [string, string, string]; label: string };

/** An airport board is black, a station's is navy, and a road trip's is the green of a motorway sign. */
export const SKINS: Record<TripKind, Skin> = {
  flight: { panel: "#121418", frame: "#2B2E35", ink: "#F4ECD8", lamp: "#F5B942", flap: ["#34373E", "#26292F", "#1B1D22"], label: "rgba(244,236,216,.55)" },
  train: { panel: "#0E1A2E", frame: "#24375A", ink: "#F3F1E9", lamp: "#79D8A4", flap: ["#27395A", "#1C2B47", "#142036"], label: "rgba(243,241,233,.55)" },
  road: { panel: "#0F4A31", frame: "#0A3322", ink: "#F7F4EA", lamp: "#F6D44A", flap: ["#1B6A48", "#14583B", "#0E4630"], label: "rgba(247,244,234,.7)" },
};

export type BoardLabels = {
  title: string;
  /** Right of the title: the date. */
  aside: string;
  /** Above the destination: "FLIGHT HR 214", "FROM FLORENCIA". */
  caption: string;
  /** One per info cell. */
  info: string[];
  /** Over the rows' columns. */
  columns: string[];
  status: string;
};

/** A run of tiles. `text` is what they end on; before they play, they show blanks. */
const Cell = memo(function Cell({ text, width, blank }: { text: string; width: number; blank: boolean }) {
  const style = {
    "--tw": `calc(${width} * var(--k))`,
    "--th": `calc(${width * TALL} * var(--k))`,
    "--tr": `calc(${width * 0.12} * var(--k))`,
    "--tg": `calc(${width * TILE_GAP} * var(--k))`,
  } as CSSProperties;
  return (
    <span className="pyb-cell" style={style}>
      {Array.from(text).map((ch, i) => {
        // A text node per half, never an empty one, so the board can rewrite it in place.
        const shown = blank ? " " : ch;
        return (
          <span key={i} data-tile="" className="pyb-tile">
            <span className="pyb-h pyb-t">
              <span>{shown}</span>
            </span>
            <span className="pyb-h pyb-b">
              <span>{shown}</span>
            </span>
            <span className="pyb-h pyb-t pyb-lt">
              <span>{shown}</span>
            </span>
            <span className="pyb-h pyb-b pyb-lb">
              <span>{shown}</span>
            </span>
          </span>
        );
      })}
    </span>
  );
});

const write = (el: Element | undefined, ch: string) => {
  if (!el) return;
  const node = el.firstChild;
  if (node) node.nodeValue = ch;
  else el.textContent = ch;
};

/**
 * The departures board. Every flip is planned before it starts (./flaps); on each animation frame
 * the board applies the flips that are due by rewriting four text nodes and swapping one
 * attribute, and the CSS folds the leaves. Nothing here re-renders while it clatters.
 */
export function Board({
  kind,
  texts,
  labels,
  seed,
  play,
  still,
  mutedRef,
  settled,
  onSettled,
}: {
  kind: TripKind;
  texts: BoardTexts;
  labels: BoardLabels;
  seed: number;
  /** Start clattering. */
  play: boolean;
  /** Preview or reduced motion: every tile already where it lands. */
  still: boolean;
  mutedRef: RefObject<boolean>;
  settled: boolean;
  onSettled: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const skin = SKINS[kind];
  const sequential = kind === "road";
  const flips = useMemo(() => planFlips(boardPlans(texts, sequential), mulberry32(seed), FLIP_MS), [texts, sequential, seed]);

  const heroTile = tileWidth(span(Math.max(...texts.hero.map((l) => l.length))), ROOM, HERO_CAP);
  const columnWidths = texts.rows[0]?.map((_, c) => Math.max(...texts.rows.map((r) => r[c]?.length ?? 0))) ?? [];
  const rowTile = tileWidth(columnWidths.reduce((sum, n) => sum + span(n), 0) + Math.max(0, columnWidths.length - 1) * COLUMN_GAP, ROOM, ROW_CAP);

  const settle = useRef(onSettled);
  useEffect(() => {
    settle.current = onSettled;
  });

  useEffect(() => {
    const root = rootRef.current;
    if (!play || still || !root) return;
    const tiles = Array.from(root.querySelectorAll<HTMLElement>("[data-tile]"));
    const faces = tiles.map((t) => Array.from(t.children).map((half) => half.firstElementChild ?? undefined));
    const shown = tiles.map(() => " ");
    const phase = tiles.map(() => false);
    const end = settledAt(flips, FLIP_MS);
    let next = 0;
    let raf = 0;
    let lastClick = -Infinity;
    let started = 0;
    let done = 0;
    const tick = (now: number) => {
      started ||= now;
      const t = now - started;
      let n = 0;
      while (next < flips.length && flips[next].at <= t) {
        const { tile, char } = flips[next++];
        const [top, bottom, leafTop, leafBottom] = faces[tile] ?? [];
        const was = shown[tile];
        write(top, char);
        write(bottom, was);
        write(leafTop, was);
        write(leafBottom, char);
        phase[tile] = !phase[tile];
        tiles[tile].dataset.f = phase[tile] ? "a" : "b";
        shown[tile] = char;
        n++;
      }
      if (n && t - lastClick >= CLICK_GAP_MS) {
        lastClick = t;
        playFlaps(mutedRef.current, n);
      }
      if (next < flips.length) raf = requestAnimationFrame(tick);
      else done = window.setTimeout(() => settle.current(), Math.max(0, end - t));
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [play, still, flips, mutedRef]);

  const vars = {
    "--panel": skin.panel,
    "--frame": skin.frame,
    "--ink": skin.ink,
    "--lamp": skin.lamp,
    "--f1": skin.flap[0],
    "--f2": skin.flap[1],
    "--f3": skin.flap[2],
    "--fh": `${FLIP_MS / 2}ms`,
  } as CSSProperties;
  const label = { color: skin.label, fontSize: "calc(2.5 * var(--k))", letterSpacing: "0.16em" } as CSSProperties;
  const blank = !still;

  return (
    <div ref={rootRef} className="pyb-board mx-auto" style={vars} data-testid="pyb-board" data-resolved={settled ? "true" : "false"} aria-hidden="true">
      {kind === "road" ? (
        <span aria-hidden="true" className="pointer-events-none absolute rounded-[calc(1.6*var(--k))] opacity-80" style={{ inset: "calc(1.4 * var(--k))", border: `calc(.45 * var(--k)) solid ${skin.ink}` }} />
      ) : (
        [
          { left: "calc(1.4 * var(--k))", top: "calc(1.4 * var(--k))" },
          { right: "calc(1.4 * var(--k))", top: "calc(1.4 * var(--k))" },
          { left: "calc(1.4 * var(--k))", bottom: "calc(1.4 * var(--k))" },
          { right: "calc(1.4 * var(--k))", bottom: "calc(1.4 * var(--k))" },
        ].map((spot, i) => <span key={i} className="pyb-rivet" style={spot} />)
      )}

      <div className="relative flex items-center justify-between gap-[calc(2*var(--k))] font-bold uppercase" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
        <span className="flex min-w-0 items-center gap-[calc(1.6*var(--k))]" style={{ fontSize: "calc(3.1 * var(--k))", letterSpacing: "0.22em" }}>
          <KindIcon kind={kind} className="size-[calc(4.2*var(--k))] shrink-0" />
          <span className="truncate">{labels.title}</span>
        </span>
        <span className="shrink-0 truncate tabular-nums" style={{ ...label, maxWidth: "calc(36 * var(--k))" }}>
          {labels.aside}
        </span>
      </div>
      <div className="relative mt-[calc(2*var(--k))] h-px opacity-25" style={{ background: skin.ink }} />

      <p className="relative mt-[calc(2.6*var(--k))] truncate text-center font-bold uppercase" style={{ ...label, fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
        {labels.caption}
      </p>
      <div className="relative mt-[calc(1.8*var(--k))] flex flex-col items-center gap-[calc(1.4*var(--k))]">
        {texts.hero.map((line, i) => (
          <Cell key={i} text={line} width={heroTile} blank={blank} />
        ))}
      </div>

      <div className="relative mt-[calc(3*var(--k))] flex flex-wrap items-center justify-center gap-x-[calc(3.4*var(--k))] gap-y-[calc(1.6*var(--k))] font-bold uppercase" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
        {texts.info.map((text, i) => (
          <span key={i} className="flex items-center gap-[calc(1.4*var(--k))]">
            <span style={label}>{labels.info[i]}</span>
            <Cell text={text} width={INFO_TILE} blank={blank} />
          </span>
        ))}
        <span className="pyb-lamp" data-on={settled ? "true" : "false"} style={{ fontSize: "calc(2.8 * var(--k))", letterSpacing: "0.2em" }}>
          {labels.status}
        </span>
      </div>

      {texts.rows.length ? (
        <>
          <div className="relative mt-[calc(3.2*var(--k))] h-px opacity-25" style={{ background: skin.ink }} />
          <div className="relative mt-[calc(2.2*var(--k))] flex font-bold uppercase" style={{ ...label, gap: `calc(${rowTile * COLUMN_GAP} * var(--k))`, fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
            {labels.columns.map((col, c) => (
              <span key={c} className="shrink-0 truncate" style={{ width: `calc(${span(columnWidths[c] ?? 1) * rowTile} * var(--k))` }}>
                {col}
              </span>
            ))}
          </div>
          <div className="relative mt-[calc(1.4*var(--k))] flex flex-col gap-[calc(1.2*var(--k))]">
            {texts.rows.map((cells, r) => (
              <div key={r} className="flex" style={{ gap: `calc(${rowTile * COLUMN_GAP} * var(--k))` }}>
                {cells.map((text, c) => (
                  <Cell key={c} text={text} width={rowTile} blank={blank} />
                ))}
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
