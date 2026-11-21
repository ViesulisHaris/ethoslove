"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ArrowRight, Check, ChevronDown, Link2, Play, RotateCcw, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import type { FinderPick, FinderUi } from "@/content/finder";
import {
  ANY,
  FINDER_FEELS,
  FINDER_WAIT,
  FINDER_MORE_OCCASIONS,
  FINDER_OCCASIONS,
  FINDER_RECIPIENTS,
  FINDER_STEPS,
  NO_ANSWERS,
  PICKS_PER_PAGE,
  answersQuery,
  openStep,
  parseAnswers,
  pickReason,
  rankGifts,
  type FinderAnswers,
  type FinderStep,
} from "@/lib/gift/finder";
import type { GiftLocale } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import { PhoneFrame } from "@/components/shared/phone-frame";

/**
 * Loaded when someone taps "Watch it", not with the page: a static import reaches the template
 * registry and every template behind it (see template-card.tsx).
 */
const GiftRenderer = dynamic(() => import("@/templates/_shared/GiftRenderer").then((m) => m.GiftRenderer), { ssr: false });

/** Where a pick's "Make this gift" says it came from. */
const REF = "finder";
/** How many times "Show three more" was pressed: in the address, so Back from the editor returns to the same list. */
const MORE = "more";
const MORE_MAX = 30;

/** Fired after the finder rewrites the address, which `popstate` does not report. */
const CHANGED = "ethos:finder";

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(CHANGED, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(CHANGED, callback);
  };
}
const readSearch = () => window.location.search;
/** The server draws the first question: the page is static and knows no address. */
const noSearch = () => "";

function morePages(search: string): number {
  const n = Number(new URLSearchParams(search).get(MORE));
  return Number.isInteger(n) && n > 0 ? Math.min(n, MORE_MAX) : 0;
}

/** The address for these answers: theirs first, in the order asked, then whatever else it carried (a `ref`). */
function addressFor(answers: FinderAnswers, more = 0): string {
  const { pathname, search, hash } = window.location;
  const params = new URLSearchParams(answersQuery(answers));
  for (const [key, value] of new URLSearchParams(search)) {
    if (key !== MORE && !(FINDER_STEPS as readonly string[]).includes(key)) params.append(key, value);
  }
  if (more > 0) params.set(MORE, String(more));
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));

/**
 * The gift finder on /gifts/finder: three questions, then three templates that fit, each with a
 * sentence written for the answer, its live demo and a way into the editor.
 *
 * The answers live in the address (`?for=mom&occasion=birthday&feel=funny`), so a result is a link
 * that can be sent, and Back walks back through the questions. Nothing is fetched: the page hands
 * over every template's fit and the scoring (lib/gift/finder.ts) runs here. The server's HTML is
 * the first question; a visit that arrives with answers switches to them as it hydrates.
 */
export function GiftFinder({ picks, ui, marks, locale }: { picks: FinderPick[]; ui: FinderUi; marks: { free: string; premium: string }; locale: GiftLocale }) {
  const search = useSyncExternalStore(subscribe, readSearch, noSearch);
  const answers = useMemo(() => parseAnswers(search), [search]);
  const extra = useMemo(() => morePages(search), [search]);
  const step = openStep(answers);
  const ranked = useMemo(() => (step ? [] : rankGifts(picks, answers)), [picks, answers, step]);
  const shown = ranked.slice(0, PICKS_PER_PAGE * (1 + extra));

  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  /** True once they have answered or changed something here: only then does the view move focus, scroll or animate. */
  const [moved, setMoved] = useState(false);
  const started = useRef(false);
  const counted = useRef("");
  const [watching, setWatching] = useState<FinderPick | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  /** Set by "Show three more": the place of the first new pick, which takes the focus once it is drawn. */
  const added = useRef<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // The page hid the first question while answers were on their way (see FINDER_WAIT); they are here now.
  useEffect(() => {
    root.current?.closest(`[${FINDER_WAIT}]`)?.removeAttribute(FINDER_WAIT);
  }, []);

  const view = step ?? "result";
  // After an answer the next question (or the picks) takes the focus. Unless the whole tool is already
  // on screen, its top comes to the top: on a phone that is what puts each question on one screen.
  useEffect(() => {
    if (!moved) return;
    const el = root.current;
    if (el) {
      const { top, bottom } = el.getBoundingClientRect();
      if (top < 0 || bottom > window.innerHeight) {
        const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      }
    }
    heading.current?.focus({ preventScroll: true });
  }, [view, moved]);

  // "Show three more" leaves its button behind, or removes it at the end of the list: on to the first new pick.
  useEffect(() => {
    if (added.current === null) return;
    const first = root.current?.querySelectorAll<HTMLElement>("[data-pick] a")[added.current];
    added.current = null;
    first?.focus({ preventScroll: true });
  }, [shown.length]);

  // A result is counted once per set of answers, however it was reached: answered here, opened from a link, or come back to.
  useEffect(() => {
    if (step !== null) return;
    const key = answersQuery(answers);
    if (counted.current === key) return;
    counted.current = key;
    track("finder_result", { for: answers.for, occasion: answers.occasion, feel: answers.feel });
  }, [step, answers]);

  function go(next: FinderAnswers, { more = 0, replace = false }: { more?: number; replace?: boolean } = {}) {
    const url = addressFor(next, more);
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    window.dispatchEvent(new Event(CHANGED));
  }

  function answer<S extends FinderStep>(which: S, value: NonNullable<FinderAnswers[S]>) {
    if (!started.current) {
      started.current = true;
      track("finder_started");
    }
    track("finder_step", { step: which });
    setMoved(true);
    setMoreOpen(false);
    go({ ...answers, [which]: value });
  }

  /** Ask one question again; the others keep their answers. */
  function reopen(which: FinderStep) {
    setMoved(true);
    setMoreOpen(false);
    go({ ...answers, [which]: null });
  }

  function restart() {
    setMoved(true);
    setMoreOpen(false);
    setCopied(false);
    go(NO_ANSWERS);
  }

  /** Opens a pick's demo, remembering its "Watch it" button: the focus goes back there when the demo closes. */
  function watch(pick: FinderPick, from: HTMLElement) {
    opener.current = from.closest("li")?.querySelector<HTMLElement>("[data-watch]") ?? null;
    track("finder_pick", { template: pick.slug, action: "watch" });
    setWatching(pick);
  }

  async function copyLink() {
    try {
      // The three they were given, not however many more they went on to open.
      await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}${answersQuery(answers)}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Blocked by the browser: the address bar still has the link.
    }
  }

  const said = (which: FinderStep): string => {
    const value = answers[which];
    if (value === null) return "";
    if (value === ANY) return ui.notSure;
    if (which === "for") return ui.people[value as keyof FinderUi["people"]];
    if (which === "occasion") return ui.occasions[value as keyof FinderUi["occasions"]];
    return ui.feels[value as keyof FinderUi["feels"]].label;
  };

  const enter = moved ? "animate-in fade-in-0 slide-in-from-bottom-1 duration-300 ease-(--ease-out-quint)" : undefined;

  return (
    <div ref={root} className="scroll-mt-24">
      {/* The three questions as a row of answers: a chosen one is a button that asks it again. */}
      <ol className="flex flex-wrap gap-2" aria-label={ui.answers}>
        {FINDER_STEPS.map((which) => {
          const done = answers[which] !== null;
          const current = which === step;
          return (
            <li key={which}>
              {done ? (
                <button
                  type="button"
                  onClick={() => reopen(which)}
                  className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-ink py-1.5 pr-3 pl-3.5 text-sm text-paper transition-[background-color,scale] duration-200 ease-(--ease-out-quint) hover:bg-ink/85 active:scale-[0.97]"
                >
                  <Check aria-hidden="true" className="size-3.5 text-rose" strokeWidth={2.4} />
                  <span className="font-medium">{said(which)}</span>
                  {/* Read out after the answer: what pressing it does. */}
                  <span className="sr-only">{fill(ui.change, { question: ui.steps[which].question })}</span>
                  <X aria-hidden="true" className="size-3.5 text-paper/50 transition-colors group-hover:text-paper" />
                </button>
              ) : (
                <span
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-full border px-3.5 py-1.5 text-sm",
                    current ? "border-ink font-medium text-ink" : "border-dashed border-ink/25 text-ink-soft",
                  )}
                >
                  {ui.steps[which].label}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {step ? (
        <div key={step} className={cn("mt-6 sm:mt-8", enter)}>
          <p className="text-eyebrow text-ink-soft">{fill(ui.stepOf, { n: FINDER_STEPS.indexOf(step) + 1 })}</p>
          <h2 ref={heading} tabIndex={-1} id="finder-question" className="display-lg mt-3 outline-none">
            {ui.steps[step].question}
          </h2>

          <div role="group" aria-labelledby="finder-question" className={cn("mt-6 grid gap-2.5 sm:mt-7", step === "feel" ? "sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-4")}>
            {step === "for" ? FINDER_RECIPIENTS.map((who) => <Option key={who} label={ui.people[who]} onClick={() => answer("for", who)} />) : null}
            {step === "occasion" ? (
              <>
                {FINDER_OCCASIONS.map((o) => (
                  <Option key={o} label={ui.occasions[o]} onClick={() => answer("occasion", o)} />
                ))}
                <button
                  type="button"
                  aria-expanded={moreOpen}
                  aria-controls="finder-more-occasions"
                  onClick={() => setMoreOpen((open) => !open)}
                  className={cn(OPTION, "border-dashed text-ink-soft", moreOpen && "border-solid border-ink/40 text-ink")}
                >
                  <span className="font-display text-[1.1rem] leading-tight sm:text-[1.2rem]">{ui.moreOccasions}</span>
                  <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 transition-transform duration-200", moreOpen && "rotate-180")} />
                </button>
                {/* In the same grid, so the six that were waiting line up under the seven that weren't. */}
                <div id="finder-more-occasions" hidden={!moreOpen} className="col-span-full grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  {FINDER_MORE_OCCASIONS.map((o) => (
                    <Option key={o} label={ui.occasions[o]} onClick={() => answer("occasion", o)} />
                  ))}
                </div>
              </>
            ) : null}
            {step === "feel" ? FINDER_FEELS.map((feel) => <Option key={feel} label={ui.feels[feel].label} hint={ui.feels[feel].hint} onClick={() => answer("feel", feel)} />) : null}
          </div>

          <button
            type="button"
            onClick={() => answer(step, ANY)}
            className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-ink-soft underline decoration-ink/25 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink active:text-coral"
          >
            {ui.notSure}
          </button>
        </div>
      ) : (
        <div key="result" className={cn("mt-6 sm:mt-8", enter)}>
          <h2 ref={heading} tabIndex={-1} id="finder-picks" className="display-lg outline-none">
            {ui.resultTitle}
          </h2>
          <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">{ui.resultLead}</p>

          <ol aria-labelledby="finder-picks" className="mt-9 grid gap-x-10 gap-y-10 lg:grid-cols-3">
            {shown.map((pick, i) => (
              <li key={pick.slug} data-pick className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-x-4 gap-y-4 lg:flex lg:flex-col lg:gap-0">
                {/* For a pointer: the same demo "Watch it" opens. A screen reader has that button, so this one stays out of its way. */}
                <button
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  onClick={(event) => watch(pick, event.currentTarget)}
                  className="group relative block w-full rounded-[13%/6%] transition-[translate,scale] duration-300 ease-(--ease-out-quint) hover:-translate-y-1 active:scale-[0.98] lg:w-[min(13.5rem,100%)]"
                >
                  <PhoneFrame width="100%">
                    <Image src={pick.poster} alt="" fill sizes={POSTER_SIZES} quality={75} loading={i < PICKS_PER_PAGE ? "eager" : "lazy"} className="object-cover" />
                    <span className="absolute inset-0 grid place-items-center bg-black/10 transition-colors group-hover:bg-black/0">
                      <span className="grid size-9 place-items-center rounded-full bg-cream text-forest shadow-[0_10px_30px_-10px_rgba(0,0,0,0.7)] transition-transform duration-300 ease-(--ease-out-quint) group-hover:scale-110 lg:size-12">
                        <Play className="ml-0.5 size-3.5 fill-current lg:size-4" />
                      </span>
                    </span>
                  </PhoneFrame>
                </button>
                {/* Grows on a wide screen, so the three "Make this gift" buttons sit on one line whatever the sentences' lengths. */}
                <div className="min-w-0 lg:mt-6 lg:flex-1">
                  <p className="flex items-center gap-2.5">
                    {/* A label on a plain span is not read out: the number is for the eye, the words for a screen reader. */}
                    <span aria-hidden="true" className="text-mono-meta text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="sr-only">{fill(ui.pick, { n: i + 1 })}</span>
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] leading-none font-semibold tracking-wide", pick.free ? "bg-cream text-forest ring-1 ring-forest/15" : "bg-forest/80 text-cream")}>
                      {pick.free ? marks.free : marks.premium}
                    </span>
                  </p>
                  <h3 className="mt-2.5 font-display text-[1.5rem] leading-tight text-balance">{pick.name}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{pickReason(pick.why, answers)}</p>
                </div>
                <div className="col-span-2 flex items-center gap-5 lg:mt-5">
                  <Link
                    href={`/create/${pick.slug}?ref=${REF}`}
                    onClick={() => track("finder_pick", { template: pick.slug, action: "make" })}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-forest px-5 text-sm font-medium text-cream transition-[background-color,scale] duration-200 ease-(--ease-out-quint) hover:bg-forest-raised active:scale-[0.98] lg:flex-none"
                  >
                    {ui.make}
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                  <button
                    type="button"
                    data-watch
                    onClick={(event) => watch(pick, event.currentTarget)}
                    aria-label={`${ui.watch}: ${pick.name}`}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-sm font-medium text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline active:text-coral"
                  >
                    <Play aria-hidden="true" className="size-3 fill-current" />
                    {ui.watch}
                  </button>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line pt-5">
            {shown.length < ranked.length ? (
              <button
                type="button"
                onClick={() => {
                  added.current = shown.length;
                  go(answers, { more: extra + 1, replace: true });
                }}
                className="inline-flex h-11 items-center rounded-full border border-ink/20 px-5 text-sm font-medium text-ink transition-[border-color,scale] duration-200 ease-(--ease-out-quint) hover:border-ink active:scale-[0.98]"
              >
                {ui.more}
              </button>
            ) : (
              <p className="py-2.5 text-sm text-ink-soft">{ui.end}</p>
            )}
            <button type="button" onClick={restart} className={QUIET}>
              <RotateCcw aria-hidden="true" className="size-3.5" />
              {ui.restart}
            </button>
            {/* The picks are only ever drawn in a browser (the server draws the first question), so this can ask it. */}
            {typeof navigator !== "undefined" && typeof navigator.clipboard?.writeText === "function" ? (
              <button type="button" onClick={copyLink} className={QUIET}>
                {copied ? <Check aria-hidden="true" className="size-3.5 text-moss" /> : <Link2 aria-hidden="true" className="size-3.5" />}
                <span aria-live="polite">{copied ? ui.copied : ui.copyLink}</span>
              </button>
            ) : null}
          </div>
        </div>
      )}

      <Dialog.Root open={watching !== null} onOpenChange={(open) => (open ? undefined : setWatching(null))}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-forest/45 duration-200 supports-backdrop-filter:backdrop-blur-[3px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <Dialog.Content
            aria-describedby={undefined}
            // The dialog has no trigger of its own for Radix to return to: back to the button that opened it.
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              opener.current?.focus();
            }}
            className={cn(
              "fixed z-[80] flex flex-col bg-blush-paper text-forest outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
              // A phone: a sheet the height of the screen, so the demo is as large as the phone allows (as components/gifts/template-chooser.tsx).
              "inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] bottom-0 rounded-t-[28px] shadow-[0_-20px_60px_-20px_rgba(60,15,35,0.45)] duration-300 data-open:slide-in-from-bottom data-closed:slide-out-to-bottom",
              // Wider: a dialog in the middle.
              "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[calc(100dvh-1.5rem)] sm:w-[26rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:shadow-[0_40px_90px_-30px_rgba(60,15,35,0.6)] sm:duration-200 sm:data-open:slide-in-from-bottom-0 sm:data-open:zoom-in-95 sm:data-closed:slide-out-to-bottom-0 sm:data-closed:zoom-out-95",
              DEMO_ROOM,
            )}
          >
            {watching ? (
              <>
                <div className="flex shrink-0 items-start justify-between gap-3 pt-3 pr-3 pl-6">
                  {/* Two lines for a long name on a narrow phone ("Constellations: live demo"), never cut short. */}
                  <Dialog.Title className="min-w-0 self-center font-display text-[1.25rem] leading-[1.15] text-balance sm:text-[1.35rem]">{fill(ui.demoTitle, { name: watching.name })}</Dialog.Title>
                  <Dialog.Close
                    aria-label={ui.close}
                    className="grid size-11 shrink-0 place-items-center rounded-full text-forest/80 transition-[background-color,color,scale] duration-200 hover:bg-rose-mist hover:text-forest active:scale-95"
                  >
                    <X aria-hidden="true" className="size-5" strokeWidth={1.9} />
                  </Dialog.Close>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                  {/* As tall as the screen allows: the frame is 390:844, and DEMO_ROOM is what the title, the note and the button need. */}
                  <PhoneFrame width="min(300px, 100%, (100dvh - var(--demo-room)) * 0.462)" className="mx-auto">
                    {/*
                     * Until the template's code arrives the screen would be black: the pick's poster waits under it,
                     * at the size the list already loaded, so it is there at once. The template paints over it.
                     */}
                    <Image src={watching.poster} alt="" fill sizes={POSTER_SIZES} quality={75} loading="eager" className="object-cover" />
                    <GiftRenderer slug={watching.slug} mode="demo" demoLocale={locale} />
                  </PhoneFrame>
                  <p className={cn("mx-auto mt-4 max-w-[19rem] text-center text-[13px] leading-snug text-forest/65", DEMO_HINT)}>{ui.demoHint}</p>
                  <Link
                    href={`/create/${watching.slug}?ref=${REF}`}
                    onClick={() => track("finder_pick", { template: watching.slug, action: "make" })}
                    className="btn-rose mx-auto mt-4 flex h-12 w-full max-w-[19rem] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold"
                  >
                    {ui.make}
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </div>
              </>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

/** A pick's poster in the list; the demo borrows the same file while its template loads. */
const POSTER_SIZES = "(min-width: 1024px) 216px, 112px";

/**
 * What the demo's window needs around its phone, which takes the rest of the height: the title (two
 * lines at most), the note and the button. On a phone the window is a sheet the height of the
 * screen, and a short one (an iPhone SE is 568 or 667 tall) drops the note, which only says what the
 * demo shows, so the demo is not the size of a stamp.
 */
const DEMO_ROOM = "[--demo-room:10.75rem] [@media(min-height:700px)]:[--demo-room:14.25rem] sm:[--demo-room:14.5rem] sm:[@media(min-height:700px)]:[--demo-room:14.5rem]";
const DEMO_HINT = "[@media(max-height:699.98px)]:max-sm:hidden";

/** 56px tall at least: a thumb's target, and room for a second line under the feelings. */
const OPTION =
  "group flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border border-line bg-card px-3.5 py-3 text-left sm:px-4 text-ink transition-[border-color,background-color,box-shadow,scale] duration-200 ease-(--ease-out-quint) hover:border-ink/40 hover:bg-white hover:shadow-soft active:scale-[0.98] active:border-coral";

const QUIET =
  "inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline active:text-coral";

function Option({ label, hint, onClick }: { label: string; hint?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={OPTION}>
      <span className="min-w-0">
        <span className="block font-display text-[1.1rem] leading-tight sm:text-[1.2rem]">{label}</span>
        {hint ? <span className="mt-1 block text-[13px] leading-snug text-ink-soft">{hint}</span> : null}
      </span>
      {/* Two columns on a phone leave a label about 120px: the arrow would wrap "Valentine's Day". */}
      <ArrowRight aria-hidden="true" className="hidden size-4 shrink-0 text-ink/20 transition-[color,translate] duration-200 group-hover:translate-x-0.5 group-hover:text-coral sm:block" />
    </button>
  );
}
