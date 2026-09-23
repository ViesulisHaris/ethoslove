"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type RefObject } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "motion/react";
import { Dialog, Popover } from "radix-ui";
import { cn } from "@/lib/utils";
import type { Ymd } from "@/lib/dates/calendar";
import {
  clearRange,
  daysIn,
  formatLong,
  formatShort,
  formatSpan,
  lastDay,
  markDay,
  monthKey,
  monthOf,
  monthsApart,
  monthsFrom,
  monthTitle,
  monthWeeks,
  moveDay,
  nightsBetween,
  pickDay,
  previewEnd,
  quickRanges,
  setOneWay,
  weekdayNames,
  type DateRange,
  type Month,
  type RangeEnd,
  type RangeState,
} from "@/lib/dates/range";

export type DateRangeLabels = {
  /** The two fields: "Depart" and "Return". */
  start: string;
  end: string;
  /** Said after the end's label when it can be left empty: "optional". */
  optional?: string;
  /** The dialog's name. */
  title: string;
  /** An empty field: "Add date". */
  add: string;
  roundTrip: string;
  oneWay: string;
  tripType: string;
  quick: string;
  thisWeekend: string;
  nextWeekend: string;
  weekAway: string;
  nights: (count: number) => string;
  pickStart: string;
  pickEnd: string;
  clear: string;
  done: string;
  close: string;
  previous: string;
  next: string;
  today: string;
};

type Props = {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** The visitor's own today. The server doesn't know it, so until the browser does the fields show and don't open. */
  today: Ymd | undefined;
  locale: "en" | "es";
  labels: DateRangeLabels;
  /** A one-way switch in the picker, which drops the end and keeps it off. */
  allowOneWay?: boolean;
  /**
   * The row of the form the fields sit in (the fields themselves by default). The card centres on
   * the white card around it, a little wider than that card, so none of its edges runs along the
   * edge of a box underneath: near misses of a few pixels, and the corners of the boxes below
   * peeking out beside its round ones, are what make a popover look stuck on. Without such a card
   * it centres on the row.
   */
  alignTo?: RefObject<HTMLElement | null>;
  className?: string;
};

/** Below this, a sheet from the bottom with every month in one scroll; from here up, a card under the fields with two months. */
const WIDE = "(min-width: 768px)";
const QUINT = [0.22, 1, 0.36, 1] as const;
/** The card at its narrowest: two months of seven 44px days, 40px apart, in 24px of padding. Wider, the days spread out. */
const CARD_MIN = 704;
/** Past this two months look sparse, so a wider form gets a card that sits inside it. */
const CARD_MAX = 800;
/** How far the card reaches past each side of the white card the form sits on, when it can. */
const OVERHANG = 16;
/** The card with six weeks in both months, its tallest. */
const CARD_HEIGHT = 560;
const CARD_GAP = 10;
const EDGE = 16;
/** A form's card with this much more room on one side of it than on the other is off to one side. */
const OFF_CENTRE = 48;
/** How far up from the fields to look for the white card they sit on. */
const SURFACE_DEPTH = 6;
const SEE_THROUGH = /^transparent$|rgba\(\d+, \d+, \d+, 0\)$|\/ 0\)$/;
/** The fixed header (76px) and a little air: the fields never scroll up under it. */
const HEADER_CLEARANCE = 88;
/** How far down, or how fast, the sheet's handle has to be pulled to put it away. */
const FLING_PX = 110;
const FLING_SPEED = 600;

const subscribeWide = (onChange: () => void) => {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const isWide = () => window.matchMedia(WIDE).matches;
const sameRange = (a: DateRange, b: DateRange) => a.start === b.start && a.end === b.end;

/** The box the form sits on: the nearest one around it that paints a background and rounds its corners. */
function surfaceOf(el: HTMLElement): DOMRect | null {
  let node = el.parentElement;
  for (let i = 0; node && node !== document.body && i < SURFACE_DEPTH; i++, node = node.parentElement) {
    const style = getComputedStyle(node);
    if (parseFloat(style.borderTopLeftRadius) > 0 && !SEE_THROUGH.test(style.backgroundColor)) return node.getBoundingClientRect();
  }
  return null;
}

/**
 * Where the card goes, across. At least CARD_MIN wide, and a clear OVERHANG wider than the form's
 * card on each side; a form's card too wide for that gets one a clear OVERHANG narrower instead,
 * at most CARD_MAX. A form in the middle of the screen gets it centred. A form off to one side (in
 * a hero's column) gets it reaching just the OVERHANG past its outer edge and the rest of the way
 * in over the page, rather than out past the page's margin. Never wider than the screen, and kept
 * off its edges.
 */
function placeCard(row: DOMRect, surface: DOMRect | null, screen: number): { left: number; width: number } {
  const around = surface ?? row;
  const wider = around.width + 2 * OVERHANG;
  const fit = wider <= CARD_MAX ? Math.max(CARD_MIN, wider) : Math.min(CARD_MAX, around.width - 2 * OVERHANG);
  const width = Math.min(screen - 2 * EDGE, fit);
  const toLeft = around.left;
  const toRight = screen - around.right;
  let left = around.left + (around.width - width) / 2;
  if (toRight < toLeft - OFF_CENTRE) left = around.right + Math.min(OVERHANG, (width - around.width) / 2) - width;
  else if (toLeft < toRight - OFF_CENTRE) left = around.left - Math.min(OVERHANG, (width - around.width) / 2);
  return { left: Math.round(Math.max(EDGE, Math.min(left, screen - EDGE - width))), width: Math.round(width) };
}

/** The card's place as Radix takes it: its left edge as an offset from the fields', and its width. */
function measureCard(fields: HTMLElement | null, row: HTMLElement | null | undefined): { offset: number; width: number } | null {
  if (!fields) return null;
  const box = fields.getBoundingClientRect();
  const { left, width } = placeCard(row?.getBoundingClientRect() ?? box, surfaceOf(row ?? fields), window.innerWidth);
  return { offset: Math.round(left - box.left), width };
}

/**
 * Two dates, picked the way the booking sites do it. The fields read like a boarding pass ("Fri
 * 16 Oct"); a tap on either opens a calendar on that end: a card with two months under the
 * fields on a tablet or a computer, a sheet with the whole year scrolling on a phone. The first
 * tap is the start and the second the end, with the range drawn under the pointer before the
 * second tap lands. Every tap goes straight out through `onChange`, so whatever sits behind the
 * picker is up to date the moment it closes. The day logic lives in lib/dates/range.ts.
 */
export function DateRangePicker({ value, onChange, today, locale, labels, allowOneWay = false, alignTo, className }: Props) {
  const uid = useId();
  const reduced = useReducedMotion() ?? false;
  const wide = useSyncExternalStore(subscribeWide, isWide, () => true);
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState<RangeEnd>("start");
  const [oneWayChosen, setOneWayChosen] = useState(false);
  /** The day that takes the Tab key in the grid (a roving tabindex), and the one the arrows move. */
  const [cursor, setCursor] = useState<Ymd>("");
  const [hover, setHover] = useState<Ymd | null>(null);
  /** The card's left-hand month, as an index into `months`, and which way it last moved. */
  const [view, setView] = useState({ at: 0, dir: 0 });
  /** How far the card's left edge sits from the fields', and how wide it is: worked out as it opens, and again if the window changes. */
  const [placement, setPlacement] = useState({ offset: 0, width: CARD_MIN });
  const anchor = useRef<HTMLDivElement>(null);
  const fields = { start: useRef<HTMLButtonElement>(null), end: useRef<HTMLButtonElement>(null) };
  const opener = useRef<RangeEnd>("start");
  const panel = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef(false);
  /** The return that one way took away, given back if they go back to a return. */
  const dropped = useRef<Ymd | "">("");

  const oneWay = allowOneWay && oneWayChosen && !value.end;
  const state: RangeState = { start: value.start, end: value.end, focus, oneWay };
  const min = today ?? "";
  const max = today ? lastDay(today) : "";
  const months = today ? monthsFrom(today) : [];
  const lastView = Math.max(0, months.length - 2);
  const preview = previewEnd(state, hover);
  const quick = today ? quickRanges(today, value.start) : null;

  // After a key moves the cursor (or the card turns a page to follow it), the new day takes the focus.
  useEffect(() => {
    if (!pendingFocus.current) return;
    pendingFocus.current = false;
    panel.current?.querySelector<HTMLElement>(`[data-day="${cursor}"]`)?.focus();
  }, [cursor, view]);

  const place = () => {
    const next = measureCard(anchor.current, alignTo?.current);
    if (next) setPlacement(next);
  };
  // A window made wider or narrower while the card is open (a tablet turned round) moves the form under it.
  useEffect(() => {
    if (!open || !wide) return;
    const onResize = () => {
      const next = measureCard(anchor.current, alignTo?.current);
      if (next) setPlacement(next);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, wide, alignTo]);

  const indexOf = (day: Ymd) => (today ? monthsApart(monthOf(today), monthOf(day)) : 0);
  /** Turn the card to a month, or to both ends of a range when they fit side by side. */
  const showOnCard = (from: Ymd, to: Ymd = from) => {
    const a = indexOf(from);
    const b = indexOf(to);
    setView((v) => {
      if (a >= v.at && b <= v.at + 1) return v;
      const at = Math.max(0, Math.min(b - a <= 1 ? a : b, lastView));
      return at === v.at ? v : { at, dir: Math.sign(at - v.at) };
    });
  };
  /** Bring a day's month into the sheet's scroll, when it isn't already. */
  const showInSheet = (day: Ymd) => {
    panel.current?.querySelector<HTMLElement>(`[data-month="${day.slice(0, 7)}"]`)?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
  };
  const show = (from: Ymd, to?: Ymd) => (wide ? showOnCard(from, to) : showInSheet(from));

  const apply = (next: RangeState) => {
    setFocus(next.focus);
    setOneWayChosen(next.oneWay);
    if (next.start !== value.start || next.end !== value.end) onChange({ start: next.start, end: next.end });
  };

  /** Back from one way to a return, with the return that one way dropped when it still fits. The return it leaves. */
  const backToReturn = () => {
    const next = setOneWay(state, false, oneWay ? dropped.current : "");
    dropped.current = "";
    apply(next);
    return next.end;
  };

  const openAt = (which: RangeEnd) => {
    if (!today) return;
    // Tapping the return means they want one.
    const returning = which === "end" && oneWay ? backToReturn() : value.end;
    const end: RangeEnd = which === "end" && !value.start ? "start" : which;
    const wanted = (end === "end" ? returning || value.start : value.start) || today;
    const day = wanted < min ? min : wanted > max ? max : wanted;
    setFocus(end);
    setCursor(day);
    setHover(null);
    const at = indexOf(day);
    const from = value.start && value.start >= min ? indexOf(value.start) : at;
    setView({ at: Math.max(0, Math.min(at - from === 1 ? from : at, lastView)), dir: 0 });
    if (open) {
      pendingFocus.current = true;
      return;
    }
    opener.current = which;
    const box = anchor.current?.getBoundingClientRect();
    if (wide && box) {
      // Room for the card under the fields: the page is still while it is open, so scroll first.
      const short = box.bottom + CARD_GAP + CARD_HEIGHT + EDGE - window.innerHeight;
      const room = box.top - HEADER_CLEARANCE;
      if (short > 0 && room > 0) window.scrollBy({ top: Math.min(short, room), behavior: "instant" });
      place();
    }
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setHover(null);
  };
  // Back to the field that opened it, once the dialog has gone and the page is no longer hidden from screen readers.
  const returnFocus = (e: Event) => {
    e.preventDefault();
    fields[opener.current].current?.focus({ preventScroll: true });
  };
  // Into the grid on the day being chosen, not onto the first button in the header.
  const focusCursor = (e: Event) => {
    e.preventDefault();
    panel.current?.querySelector<HTMLElement>('[data-day][tabindex="0"]')?.focus({ preventScroll: true });
  };

  const choose = (day: Ymd) => {
    if (!today || day < min || day > max) return;
    apply(pickDay(state, day, max));
    setCursor(day);
    // The pointer is still on the day just picked: a preview from it would hide a return kept from
    // before behind a same-day one. The preview comes back as soon as it moves to another day.
    setHover(null);
  };
  const chooseOneWay = (on: boolean) => {
    if (!on) {
      backToReturn();
      return;
    }
    if (value.end) dropped.current = value.end;
    apply(setOneWay(state, true));
  };
  const chooseEnd = (which: RangeEnd) => {
    if (which === "end" && !value.start) return;
    // The dimmed return of a one-way trip asks for a return again, as the one on the page does.
    const returning = which === "end" && oneWay ? backToReturn() : value.end;
    setFocus(which);
    const day = (which === "end" ? returning || value.start : value.start) || min;
    setCursor(day);
    show(day);
  };
  const chooseQuick = (range: DateRange) => {
    apply({ ...range, focus: "start", oneWay: false });
    setCursor(range.start);
    setHover(null);
    show(range.start, range.end);
  };
  const clear = () => {
    apply(clearRange(state));
    setHover(null);
  };
  const turn = (step: number) => setView((v) => ({ at: Math.max(0, Math.min(v.at + step, lastView)), dir: step }));

  const onGridKey = (e: KeyboardEvent<HTMLElement>) => {
    const from = (e.target as HTMLElement).dataset.day;
    if (!from || !today) return;
    const to = moveDay(from, e.key, e.shiftKey, min, max);
    if (!to) return;
    e.preventDefault();
    pendingFocus.current = true;
    setCursor(to);
    if (focus === "end") setHover(to);
    if (wide) showOnCard(to);
  };

  const summary = (() => {
    if (value.start && value.end) return { lead: labels.nights(nightsBetween(value.start, value.end)), rest: formatSpan(value.start, value.end, locale) };
    if (value.start && oneWay) return { lead: labels.oneWay, rest: formatShort(value.start, locale) };
    if (value.start) return { lead: formatShort(value.start, locale), rest: labels.pickEnd };
    return { lead: "", rest: labels.pickStart };
  })();

  const calendar = {
    locale,
    labels,
    today: min,
    max,
    range: { start: value.start, end: value.end },
    preview,
    uid,
    onPick: choose,
    onHover: setHover,
  };
  const tabDay = (shown: Month[]) => {
    const keys = shown.map(monthKey);
    if (keys.includes(cursor.slice(0, 7))) return cursor;
    const first = shown[0];
    const firstDay = `${monthKey(first)}-01`;
    return firstDay < min ? min : firstDay;
  };
  const chips = quick
    ? ([
        [labels.thisWeekend, quick.thisWeekend],
        [labels.nextWeekend, quick.nextWeekend],
        [labels.weekAway, quick.weekAway],
      ] as const)
    : [];
  const summaryLine = (
    <p aria-live="polite" className="min-w-0 truncate text-[14.5px] leading-snug text-forest/70 first-letter:uppercase">
      {summary.lead ? <span className="font-semibold text-forest">{summary.lead}</span> : null}
      {summary.lead ? " · " : null}
      {summary.rest}
    </p>
  );
  const toggle = allowOneWay ? <TripToggle uid={uid} oneWay={oneWay} labels={labels} reduced={reduced} big={!wide} onChange={chooseOneWay} /> : null;
  const chipRow = <QuickChips chips={chips} value={value} max={max} big={!wide} onPick={chooseQuick} />;

  return (
    <div className={cn("@container", className)}>
      <div
        ref={anchor}
        className="grid grid-cols-2 gap-2.5"
        // The page is inert under the card, but the fields stay live: a click on the other one moves to that end, as on the booking sites.
        style={open && wide ? { pointerEvents: "auto" } : undefined}
      >
        {(["start", "end"] as const).map((which) => (
          <Field
            key={which}
            ref={fields[which]}
            label={which === "start" ? labels.start : labels.end}
            extra={which === "end" ? labels.optional : undefined}
            date={value[which]}
            empty={which === "end" && oneWay ? labels.oneWay : labels.add}
            muted={which === "end" && oneWay}
            locale={locale}
            expanded={open}
            active={open && focus === which && !(which === "end" && oneWay)}
            onOpen={() => openAt(which)}
          />
        ))}
      </div>

      {wide ? (
        <Popover.Root open={open} onOpenChange={(next) => (next ? undefined : close())} modal>
          <Popover.Anchor virtualRef={anchor} />
          <Popover.Portal>
            <Popover.Content
              ref={panel}
              aria-label={labels.title}
              side="bottom"
              align="start"
              alignOffset={placement.offset}
              sideOffset={CARD_GAP}
              collisionPadding={EDGE}
              onOpenAutoFocus={focusCursor}
              onCloseAutoFocus={returnFocus}
              onPointerDownOutside={(e) => {
                if (anchor.current?.contains(e.target as Node)) e.preventDefault();
              }}
              style={{ width: placement.width }}
              className="z-[70] max-h-(--radix-popover-content-available-height) max-w-[calc(100vw-32px)] origin-(--radix-popover-content-transform-origin) overflow-y-auto overscroll-contain rounded-[28px] bg-white p-6 text-forest shadow-lift ring-1 ring-forest/8 outline-none duration-250 ease-out-quint data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-97 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-97 data-[state=open]:slide-in-from-top-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                {toggle}
                <div role="group" aria-label={labels.quick} className="flex flex-wrap gap-2">
                  {chipRow}
                </div>
              </div>

              <div className="relative mt-5" onKeyDown={onGridKey} onPointerLeave={() => setHover(null)}>
                {/* Before the months, so Tab goes header, arrows, the day, then the footer. */}
                <button type="button" onClick={() => turn(-1)} disabled={view.at <= 0} aria-label={labels.previous} className="absolute top-0 left-0 z-10 grid size-10 place-items-center rounded-full border border-forest/10 bg-white text-forest transition-[background-color,opacity] hover:bg-rose-mist disabled:pointer-events-none disabled:opacity-30">
                  <ChevronLeft aria-hidden="true" className="size-[18px]" />
                </button>
                <button type="button" onClick={() => turn(1)} disabled={view.at >= lastView} aria-label={labels.next} className="absolute top-0 right-0 z-10 grid size-10 place-items-center rounded-full border border-forest/10 bg-white text-forest transition-[background-color,opacity] hover:bg-rose-mist disabled:pointer-events-none disabled:opacity-30">
                  <ChevronRight aria-hidden="true" className="size-[18px]" />
                </button>
                <motion.div key={view.at} initial={view.dir === 0 || reduced ? false : { opacity: 0, x: view.dir * 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.24, ease: QUINT }} className="grid grid-cols-2 gap-10">
                  {months.slice(view.at, view.at + 2).map((month, _, shown) => (
                    <MonthGrid key={monthKey(month)} month={month} tabDay={tabDay(shown)} size="card" {...calendar} />
                  ))}
                </motion.div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4 border-t border-forest/8 pt-4">
                {summaryLine}
                <div className="flex shrink-0 items-center gap-1.5">
                  <button type="button" onClick={clear} disabled={!value.start && !value.end} className="h-11 rounded-full px-4 text-[14.5px] font-semibold text-forest/75 underline-offset-4 transition-colors hover:text-forest hover:underline disabled:opacity-35 disabled:hover:no-underline">
                    {labels.clear}
                  </button>
                  <button type="button" onClick={close} className="btn-rose h-11 rounded-full px-7 text-[15px] font-semibold transition-[filter,transform] hover:brightness-110 active:scale-[0.98]">
                    {labels.done}
                  </button>
                </div>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      ) : (
        <Dialog.Root open={open} onOpenChange={(next) => (next ? undefined : close())}>
          <AnimatePresence>
            {open ? (
              <Dialog.Portal forceMount>
                <Dialog.Overlay forceMount asChild>
                  <motion.div className="fixed inset-0 z-[90] bg-forest/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.25, ease: QUINT }} />
                </Dialog.Overlay>
                <Sheet
                  panel={panel}
                  reduced={reduced}
                  cursorMonth={cursor.slice(0, 7)}
                  onOpenAutoFocus={focusCursor}
                  onCloseAutoFocus={returnFocus}
                  onClose={close}
                  header={
                    <>
                      <div className="flex items-center gap-2">
                        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                          {(["start", "end"] as const).map((which) => {
                            const date = value[which];
                            // No return before there is a departure; a one-way trip's return is only dimmed, and a tap asks for one again.
                            const blocked = which === "end" && !value.start;
                            const muted = which === "end" && oneWay;
                            const active = focus === which && !blocked && !muted;
                            return (
                              <button
                                key={which}
                                type="button"
                                aria-pressed={active}
                                aria-disabled={blocked || undefined}
                                onClick={() => chooseEnd(which)}
                                className={cn(
                                  "flex h-14 min-w-0 flex-col justify-center rounded-2xl border px-3 text-left transition-[border-color,background-color,box-shadow] duration-200",
                                  active ? "border-rose/55 bg-rose-mist shadow-[0_0_0_3px_rgba(178,58,94,0.12)]" : "border-forest/12 bg-white",
                                  muted && "border-dashed border-forest/20 bg-transparent",
                                  blocked && "opacity-55",
                                )}
                              >
                                <span className="truncate text-[11.5px] leading-none font-semibold tracking-wide text-forest/55 uppercase">{which === "start" ? labels.start : labels.end}</span>
                                <span className={cn("mt-1 truncate text-[15.5px] leading-tight font-medium", date ? "text-forest" : "font-normal text-forest/45")}>{date ? formatShort(date, locale) : muted ? labels.oneWay : labels.add}</span>
                              </button>
                            );
                          })}
                        </div>
                        <Dialog.Close aria-label={labels.close} className="grid size-11 shrink-0 place-items-center rounded-full bg-forest/[0.06] text-forest transition-colors active:bg-forest/10">
                          <X aria-hidden="true" className="size-[18px]" />
                        </Dialog.Close>
                      </div>
                      {/* Wider than a phone: it scrolls sideways, and fades at the edges so the chip cut off there reads as more to come. */}
                      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5 scrollbar-none [mask-image:linear-gradient(to_right,transparent,#000_16px,#000_calc(100%-16px),transparent)]">
                        {toggle}
                        <div role="group" aria-label={labels.quick} className="flex gap-2">
                          {chipRow}
                        </div>
                      </div>
                    </>
                  }
                  title={labels.title}
                  weekdays={weekdayNames(locale)}
                  footer={
                    <>
                      <div className="flex min-h-11 items-center justify-between gap-3">
                        {summaryLine}
                        <button type="button" onClick={clear} disabled={!value.start && !value.end} className="-mr-2 h-11 shrink-0 px-2 text-[14.5px] font-semibold text-forest underline underline-offset-4 disabled:opacity-35">
                          {labels.clear}
                        </button>
                      </div>
                      <Dialog.Close className="btn-rose mt-2 h-14 w-full rounded-2xl text-[16px] font-semibold transition-transform active:scale-[0.99]">{labels.done}</Dialog.Close>
                    </>
                  }
                >
                  <div onKeyDown={onGridKey}>
                    {months.map((month) => (
                      <MonthGrid key={monthKey(month)} month={month} tabDay={tabDay(months)} size="sheet" {...calendar} />
                    ))}
                  </div>
                </Sheet>
              </Dialog.Portal>
            ) : null}
          </AnimatePresence>
        </Dialog.Root>
      )}
    </div>
  );
}

type QuickChipsProps = { chips: readonly (readonly [string, DateRange])[]; value: DateRange; max: Ymd; big: boolean; onPick: (range: DateRange) => void };

/** The one-tap ranges, lit when the dates chosen are theirs. */
function QuickChips({ chips, value, max, big, onPick }: QuickChipsProps) {
  return chips.map(([name, range]) => (
    <button
      key={name}
      type="button"
      aria-pressed={sameRange(value, range)}
      disabled={range.end > max}
      onClick={() => onPick(range)}
      className={cn(
        "shrink-0 rounded-full border px-3.5 text-[13.5px] font-semibold whitespace-nowrap transition-[background-color,border-color,color,transform] active:scale-[0.97] disabled:opacity-35",
        big ? "h-11 px-4" : "h-9",
        sameRange(value, range) ? "border-forest bg-forest text-cream" : "border-forest/15 bg-white text-forest hover:border-forest/40",
      )}
    >
      {name}
    </button>
  ));
}

type FieldProps = {
  ref: RefObject<HTMLButtonElement | null>;
  label: string;
  extra?: string;
  date: Ymd | "";
  empty: string;
  /** The return while the trip is one way: still a button, since a tap on it asks for a return again. */
  muted?: boolean;
  locale: "en" | "es";
  expanded: boolean;
  active: boolean;
  onOpen: () => void;
};

/** One end, as a field the size of an airport's: the label in small capitals, the date as people say it. */
function Field({ ref, label, extra, date, empty, muted = false, locale, expanded, active, onOpen }: FieldProps) {
  return (
    <button
      ref={ref}
      type="button"
      data-date={date}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      aria-label={`${label}${extra ? ` (${extra})` : ""}: ${date ? formatLong(date, locale) : empty}`}
      onClick={onOpen}
      className={cn(
        "flex h-14 min-w-0 items-center gap-2.5 rounded-2xl border border-forest/15 bg-white px-3 text-left transition-[border-color,box-shadow] duration-200 hover:border-forest/30 @xs:px-4",
        active && "border-rose/50 shadow-[0_0_0_4px_rgba(178,58,94,0.12)] hover:border-rose/50",
        muted && "border-dashed border-forest/20 bg-transparent",
      )}
    >
      <CalendarDays aria-hidden="true" className={cn("hidden size-[18px] shrink-0 @xs:block", muted ? "text-forest/30" : "text-rose-deep")} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[12px] leading-none font-semibold tracking-wide text-forest/55 uppercase">
          {label}
          {/* Only where it fits: at 320px it would cut the label to "Return · opt…". The field's name still says it. */}
          {extra ? <span className="hidden font-normal tracking-normal normal-case @min-[17rem]:inline"> · {extra}</span> : null}
        </span>
        <span className={cn("mt-1 truncate text-[16px] leading-tight", date ? "font-medium text-forest" : "text-forest/40")}>{date ? formatShort(date, locale) : empty}</span>
      </span>
    </button>
  );
}

type TripToggleProps = { uid: string; oneWay: boolean; labels: DateRangeLabels; reduced: boolean; big: boolean; onChange: (oneWay: boolean) => void };

/** Return or one way, as a segmented switch whose white thumb slides to the one that is on. */
function TripToggle({ uid, oneWay, labels, reduced, big, onChange }: TripToggleProps) {
  return (
    <div role="group" aria-label={labels.tripType} className={cn("inline-flex shrink-0 rounded-full bg-forest/[0.06]", big ? "p-[3px]" : "p-1")}>
      {([false, true] as const).map((on) => (
        <button
          key={String(on)}
          type="button"
          aria-pressed={oneWay === on}
          onClick={() => onChange(on)}
          // On a phone the whole 44px of the group is the target, not just the 38px of the thumb.
          className={cn("relative rounded-full px-4 text-[13.5px] font-semibold whitespace-nowrap transition-colors", big ? "h-[38px] before:absolute before:inset-x-0 before:-inset-y-[3px]" : "h-9", oneWay === on ? "text-forest" : "text-forest/60 hover:text-forest")}
        >
          {oneWay === on ? <motion.span layoutId={`${uid}-trip`} aria-hidden="true" className="absolute inset-0 rounded-full bg-white shadow-soft" transition={{ duration: reduced ? 0 : 0.25, ease: QUINT }} /> : null}
          <span className="relative">{on ? labels.oneWay : labels.roundTrip}</span>
        </button>
      ))}
    </div>
  );
}

type SheetProps = {
  panel: RefObject<HTMLDivElement | null>;
  reduced: boolean;
  cursorMonth: string;
  title: string;
  weekdays: string[];
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
  onOpenAutoFocus: (e: Event) => void;
  onCloseAutoFocus: (e: Event) => void;
  onClose: () => void;
};

/**
 * The phone's version: a sheet up to just under the top of the screen, pulled down by its handle
 * or put away with the cross, Done, the backdrop or Escape. The dates, the one-way switch and the
 * shortcuts stay at the top and the summary and Done at the bottom while the months scroll between.
 */
function Sheet({ panel, reduced, cursorMonth, title, weekdays, header, footer, children, onOpenAutoFocus, onCloseAutoFocus, onClose }: SheetProps) {
  const drag = useDragControls();
  const scroller = useRef<HTMLDivElement>(null);
  // Only the month it opened on: after that, the scroll is theirs.
  const [firstMonth] = useState(cursorMonth);
  // Already in place before the first frame, so the sheet slides up onto the month being chosen.
  useLayoutEffect(() => {
    const box = scroller.current;
    const month = box?.querySelector<HTMLElement>(`[data-month="${firstMonth}"]`);
    if (box && month) box.scrollTop = month.offsetTop;
  }, [firstMonth]);

  return (
    <Dialog.Content forceMount asChild aria-describedby={undefined} onOpenAutoFocus={onOpenAutoFocus} onCloseAutoFocus={onCloseAutoFocus}>
      <motion.div
        ref={panel}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ duration: reduced ? 0 : 0.3, ease: QUINT }}
        drag="y"
        dragListener={false}
        dragControls={drag}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.9 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > FLING_PX || info.velocity.y > FLING_SPEED) onClose();
        }}
        className="fixed inset-x-0 bottom-0 z-[90] flex h-[calc(100dvh-max(12px,env(safe-area-inset-top)))] flex-col overflow-hidden rounded-t-[28px] bg-white text-forest shadow-[0_-18px_50px_-20px_rgba(42,15,31,0.5)] outline-none"
      >
        <div aria-hidden="true" onPointerDown={(e) => drag.start(e)} className="flex h-6 shrink-0 cursor-grab touch-none justify-center pt-2.5 active:cursor-grabbing">
          <span className="h-1.5 w-10 rounded-full bg-forest/20" />
        </div>
        <Dialog.Title className="sr-only">{title}</Dialog.Title>
        <div className="shrink-0 px-4 pt-1 pb-3">{header}</div>
        <div aria-hidden="true" className="grid shrink-0 grid-cols-7 border-y border-forest/8 bg-blush-paper px-4 py-2 text-center text-[11.5px] font-semibold tracking-wide text-forest/55 uppercase">
          {weekdays.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
          {children}
        </div>
        <div className="shrink-0 border-t border-forest/8 bg-white px-4 pt-2 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-10px_24px_-18px_rgba(42,15,31,0.35)]">{footer}</div>
      </motion.div>
    </Dialog.Content>
  );
}

type MonthGridProps = {
  month: Month;
  size: "card" | "sheet";
  locale: "en" | "es";
  labels: DateRangeLabels;
  today: Ymd;
  max: Ymd;
  range: DateRange;
  preview: Ymd | null;
  tabDay: Ymd;
  uid: string;
  onPick: (day: Ymd) => void;
  onHover: (day: Ymd | null) => void;
};

/** Rows in the sheet are a fixed 48px, so a month's height is known before it is drawn and the scroll never jumps. */
const SHEET_ROW = 48;
const SHEET_TITLE = 64;

/**
 * One month as an ARIA grid: a row per week, a cell per day, and in each cell a button named
 * with the whole date. The range is a rose band behind the days, running from the middle of the
 * start's circle to the middle of the end's, rounded where a week or the month breaks it.
 */
function MonthGrid({ month, size, locale, labels, today, max, range, preview, tabDay, uid, onPick, onHover }: MonthGridProps) {
  const weeks = monthWeeks(month);
  const title = monthTitle(month, locale);
  const titleId = `${uid}-${monthKey(month)}`;
  const card = size === "card";
  const short = weekdayNames(locale);
  const long = weekdayNames(locale, "long");
  const lastOfMonth = daysIn(month);

  return (
    <section
      data-month={monthKey(month)}
      className={cn(!card && "pt-5 [content-visibility:auto]")}
      style={card ? undefined : { containIntrinsicSize: `auto ${SHEET_TITLE + weeks.length * SHEET_ROW}px` }}
    >
      {/* In the sheet the month's name stays in view while its weeks scroll under it, until the next month's takes its place. */}
      <h3 id={titleId} className={cn("flex items-center font-display text-forest", card ? "h-10 justify-center text-[19px]" : "sticky top-0 z-10 -mx-4 h-11 bg-white px-5 text-[20px]")}>
        {title.name}
        <span className="ml-1.5 text-forest/40">{title.year}</span>
      </h3>
      {/* The card keeps room for six weeks, so it doesn't change height as the months turn. */}
      <div role="grid" aria-labelledby={titleId} className={cn(card ? "mt-2 min-h-[302px] space-y-0.5" : "mt-0")}>
        {card ? (
          <div role="row" className="grid grid-cols-7 pb-1.5">
            {short.map((d, i) => (
              <span key={d} role="columnheader" aria-label={long[i]} className="text-center text-[11px] font-semibold tracking-wide text-forest/50 uppercase">
                {d}
              </span>
            ))}
          </div>
        ) : null}
        {weeks.map((week, w) => (
          <div key={w} role="row" className="grid grid-cols-7">
            {week.map((day, col) => {
              if (!day) return <span key={`blank-${col}`} role="gridcell" className={card ? "h-11" : "h-12"} />;
              const mark = markDay(day, range, preview);
              const chosen = markDay(day, range, null);
              const selected = chosen.isStart || chosen.isEnd || chosen.inRange;
              const off = day < today || day > max;
              const filled = mark.isStart || (mark.isEnd && !mark.isPreview);
              const outlined = mark.isEnd && mark.isPreview && !mark.isStart;
              const date = Number(day.slice(8));
              const rowStart = col === 0 || date === 1;
              const rowEnd = col === 6 || date === lastOfMonth;
              // An end on the edge of a row has nothing on that side to join: no half band poking out past its circle.
              const band = mark.inRange && !(mark.isStart && mark.isEnd) && !(mark.isStart && rowEnd) && !(mark.isEnd && rowStart);
              const roundLeft = !mark.isStart && rowStart;
              const roundRight = !mark.isEnd && rowEnd;
              const isToday = day === today;
              const name = `${isToday ? `${labels.today}, ` : ""}${formatLong(day, locale)}${chosen.isStart ? `, ${labels.start}` : ""}${chosen.isEnd && range.end ? `, ${labels.end}` : ""}`;
              return (
                <div key={day} role="gridcell" aria-selected={selected} className={cn("relative flex items-center justify-center", card ? "h-11" : "h-12")}>
                  {band ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute",
                        card ? "inset-y-0" : "inset-y-0.5",
                        mark.isStart ? "right-0 left-1/2" : mark.isEnd ? "right-1/2 left-0" : "inset-x-0",
                        mark.isPreview ? "bg-rose-mist" : "bg-rose-soft",
                        roundLeft && "rounded-l-full",
                        roundRight && "rounded-r-full",
                      )}
                    />
                  ) : null}
                  <button
                    type="button"
                    data-day={day}
                    tabIndex={day === tabDay ? 0 : -1}
                    aria-label={name}
                    aria-disabled={off || undefined}
                    aria-current={isToday ? "date" : undefined}
                    onClick={() => onPick(day)}
                    onPointerEnter={(e) => {
                      if (e.pointerType === "mouse" && !off) onHover(day);
                    }}
                    className={cn(
                      "relative grid size-11 place-items-center rounded-full text-[15px] tabular-nums transition-[background-color,color,box-shadow] duration-150 outline-offset-2",
                      off ? "cursor-default text-forest/25" : "font-medium text-forest",
                      !off && !filled && !outlined && "hover:shadow-[inset_0_0_0_1.5px_rgba(42,15,31,0.55)]",
                      band && !filled && !outlined && "text-rose-ink",
                      filled && "bg-rose font-semibold text-white shadow-[0_6px_14px_-6px_rgba(214,51,108,0.7)]",
                      outlined && "bg-white font-semibold text-rose-deep shadow-[inset_0_0_0_2px_var(--color-rose)]",
                    )}
                  >
                    {date}
                    {isToday && !filled ? <span aria-hidden="true" className="absolute bottom-[7px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-rose" /> : null}
                  </button>
                  {/* The length of the trip the pointer (or the keyboard) is about to pick, over the day, as the booking sites show it. The summary says it once it is picked. */}
                  {outlined && range.start ? (
                    <span aria-hidden="true" className="pointer-events-none absolute bottom-[calc(100%+2px)] left-1/2 z-20 -translate-x-1/2 rounded-full bg-forest px-2.5 py-1 text-[12px] leading-none font-semibold whitespace-nowrap text-cream shadow-soft animate-in fade-in-0 zoom-in-95 duration-150">
                      {labels.nights(nightsBetween(range.start, day))}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
