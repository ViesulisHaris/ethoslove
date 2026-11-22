"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { ArrowRight, ChevronDown, Pause, Pencil, Play, Plus, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import type { Occasion } from "@/config/occasions";
import type { FinderPick, FinderUi } from "@/content/finder";
import {
  ANY,
  FINDER_ASK,
  FINDER_FEELS,
  FINDER_KEYS,
  FINDER_RECIPIENTS,
  FINDER_STEPS,
  FINDER_WAIT,
  NO_ANSWERS,
  PICKS_PER_PAGE,
  answerGifts,
  answersQuery,
  askedStep,
  chosenFeel,
  occasionsFor,
  openStep,
  parseAnswers,
  rankGifts,
  reasonKey,
  type Any,
  type FinderAnswers,
  type FinderDay,
  type FinderFeel,
  type FinderRecipient,
  type FinderStep,
} from "@/lib/gift/finder";
import type { GiftLocale } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import { PhoneFrame } from "@/components/shared/phone-frame";
import { IdeasDots } from "@/components/templates/page/ideas-dots";
import { PosterFilm } from "@/components/templates/page/poster-film";

/**
 * Loaded when someone taps a pick's picture, not with the page: a static import reaches the template
 * registry and every template behind it (see template-card.tsx).
 */
const GiftRenderer = dynamic(() => import("@/templates/_shared/GiftRenderer").then((m) => m.GiftRenderer), { ssr: false });

/** Where a pick's "Make this gift" says it came from. */
const REF = "finder";
/** How many times "Show three more" was pressed: in the address, so Back from the editor returns to the same list. */
const MORE = "more";
const MORE_MAX = 30;
/** What the finder writes in the address itself; anything else there (a `ref`) is carried along untouched. `who` is an old spelling of `for`. */
const OWN: readonly string[] = [...FINDER_KEYS, "who", MORE, FINDER_ASK];

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
function addressFor(answers: FinderAnswers, { more = 0, ask = null }: { more?: number; ask?: FinderStep | null } = {}): string {
  const { pathname, search, hash } = window.location;
  const params = new URLSearchParams(answersQuery(answers));
  for (const [key, value] of new URLSearchParams(search)) if (!OWN.includes(key)) params.append(key, value);
  if (more > 0) params.set(MORE, String(more));
  if (ask) params.set(FINDER_ASK, ask);
  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}

const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));

type Option = FinderRecipient | Occasion | Any;

/**
 * The gift finder on /gifts/finder: two questions answered by tapping a picture, then three gifts
 * that fit, each playing its own preview, with a line on why, its live demo and a way into the
 * editor (docs/marketing/growth-build/DESIGN-LESS-TEXT.md, "The finder itself").
 *
 * The answers live in the address (`?for=mom&occasion=birthday`), so a result is a link that can
 * be sent, and Back walks back through the questions. A feeling is not asked: four small pills over
 * the results re-rank them in place (`&feel=funny`), and an old three-question link still opens its
 * result. Tapping one of the two answers over the results asks that question again (`&ask=for`)
 * with the current answer marked. Nothing is fetched: the page hands over every template's fit and
 * the scoring (lib/gift/finder.ts) runs here. The server's HTML is the first question; a visit that
 * arrives with answers switches to them as it hydrates.
 */
export function GiftFinder({
  picks,
  ui,
  freeLabel,
  price,
  locale,
  today,
}: {
  picks: FinderPick[];
  ui: FinderUi;
  /** "Free", and what a premium gift costs here ("$11.99"): the mark under a pick's name. */
  freeLabel: string;
  price: string;
  locale: GiftLocale;
  /** The day the page was rendered, for what is in season (lib/gift/finder.ts, occasionsFor). */
  today: FinderDay;
}) {
  const search = useSyncExternalStore(subscribe, readSearch, noSearch);
  const answers = useMemo(() => parseAnswers(search), [search]);
  const extra = useMemo(() => morePages(search), [search]);
  // A question asked again only once both are answered: until then the open one is the question.
  const step = openStep(answers) ?? askedStep(search);
  const ranked = useMemo(() => (step ? [] : rankGifts(picks, answers)), [picks, answers, step]);
  const shown = ranked.slice(0, PICKS_PER_PAGE * (1 + extra));
  const feel = chosenFeel(answers);

  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  /** True once they have answered or changed something here: only then does the view move focus or scroll. */
  const [moved, setMoved] = useState(false);
  const started = useRef(false);
  const counted = useRef("");
  const [watching, setWatching] = useState<FinderPick | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  /** Set by "Show three more": the place of the first new pick, which takes the focus once it is drawn. */
  const added = useRef<number | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  /** The previews: stopped by the visitor, and whether any is really running (the button is only there when one is). */
  const [filmsPaused, setFilmsPaused] = useState(false);
  const [filmsMoving, setFilmsMoving] = useState(false);

  // The page hid the tool while answers were on their way (see FINDER_WAIT); they are here now.
  useEffect(() => {
    root.current?.closest(`[${FINDER_WAIT}]`)?.removeAttribute(FINDER_WAIT);
  }, []);

  const view = step ?? "result";
  // After an answer the next question (or the picks) takes the focus. The page moves only when the
  // new heading is not on screen, which on a phone is what keeps it in view; otherwise nothing jumps.
  useEffect(() => {
    if (!moved) return;
    const el = heading.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const { top, bottom } = el.getBoundingClientRect();
    const header = parseFloat(getComputedStyle(el).getPropertyValue("--header-h")) || 0;
    if (top < header || bottom > window.innerHeight) {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }, [view, moved]);

  // "Show three more" leaves its button behind, or removes it at the end of the list: on to the first new pick.
  useEffect(() => {
    if (added.current === null) return;
    const first = root.current?.querySelectorAll<HTMLElement>("[data-pick] [data-watch]")[added.current];
    added.current = null;
    if (!first) return;
    // On a phone the picks are one row to swipe: the new one is brought in sideways, and the page stays where it is.
    first.closest("[data-pick]")?.scrollIntoView({ inline: "start", block: "nearest" });
    first.focus({ preventScroll: true });
  }, [shown.length]);

  // A result is counted once per set of answers, however it was reached: answered here, opened from a link, or come back to.
  useEffect(() => {
    if (step !== null) return;
    const key = answersQuery(answers);
    if (counted.current === key) return;
    counted.current = key;
    track("finder_result", { for: answers.for, occasion: answers.occasion, feel: answers.feel });
  }, [step, answers]);

  function go(next: FinderAnswers, { more = 0, ask = null, replace = false }: { more?: number; ask?: FinderStep | null; replace?: boolean } = {}) {
    const url = addressFor(next, { more, ask });
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    window.dispatchEvent(new Event(CHANGED));
  }

  function answer(which: FinderStep, value: Option) {
    if (!started.current) {
      started.current = true;
      track("finder_started");
    }
    track("finder_step", { step: which });
    setMoved(true);
    setMoreOpen(false);
    go({ ...answers, [which]: value });
  }

  /** Ask one question again; both answers stay, and the current one is marked. */
  function reopen(which: FinderStep) {
    setMoved(true);
    go(answers, { ask: which });
  }

  /** A feeling's pill: on, or off again. The picks re-rank where they are, so the address is rewritten, not added to. */
  function toggleFeel(which: FinderFeel) {
    track("finder_step", { step: "feel" });
    go({ ...answers, feel: feel === which ? null : which }, { replace: true });
  }

  function restart() {
    setMoved(true);
    setMoreOpen(false);
    go(NO_ANSWERS);
  }

  /** Opens a pick's demo, remembering the picture that opened it: the focus goes back there when the demo closes. */
  function watch(pick: FinderPick, from: HTMLElement) {
    opener.current = from;
    track("finder_pick", { template: pick.slug, action: "watch" });
    setWatching(pick);
  }

  // The answer cards of the open question, each with the gift it leads to.
  const occasions = useMemo(() => occasionsFor(answers.for, today), [answers.for, today]);
  const cards = useMemo(() => {
    if (step === "for") {
      const options: Option[] = [...FINDER_RECIPIENTS, ANY];
      return { first: FINDER_RECIPIENTS as readonly Option[], more: [] as Option[], gifts: answerGifts(picks, { ...answers, for: null }, "for", options) };
    }
    if (step === "occasion") {
      const first: Option[] = occasions.first;
      const more: Option[] = occasions.more;
      return { first, more, gifts: answerGifts(picks, { ...answers, occasion: null }, "occasion", [...first, ANY, ...more]) };
    }
    return null;
  }, [step, picks, answers, occasions]);
  // A question asked again shows its answer marked: if that answer waits behind "More occasions", they are open.
  const moreShown = moreOpen || (step === "occasion" && cards !== null && answers.occasion !== null && cards.more.includes(answers.occasion));

  const label = (which: FinderStep, value: Option): string => {
    if (value === ANY) return ui.notSure;
    return which === "for" ? ui.people[value as FinderRecipient] : ui.occasions[value as Occasion];
  };

  /** Arrow keys walk the cards as they are laid out: across a row, and up and down by a row. */
  function walk(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, [number, number]> = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    const move = moves[event.key];
    if (!move) return;
    const all = [...event.currentTarget.querySelectorAll<HTMLElement>("[data-answer]")];
    const at = all.indexOf(document.activeElement as HTMLElement);
    if (at < 0) return;
    const columns = all.filter((el) => el.offsetTop === all[0].offsetTop).length || 1;
    const next = all[at + move[0] + move[1] * columns];
    if (!next) return;
    event.preventDefault();
    next.focus();
  }

  const enter = moved ? "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300" : undefined;

  return (
    <div ref={root}>
      {step && cards ? (
        <div key={step} className={enter}>
          <p className="text-page-label text-page-body">{fill(ui.stepOf, { n: FINDER_STEPS.indexOf(step) + 1 })}</p>
          <h2 ref={heading} tabIndex={-1} id="finder-question" className="mt-2 scroll-mt-[calc(var(--header-h,0px)+2.5rem)] font-display text-[1.5rem] leading-tight tracking-[-0.015em] text-page-ink outline-none sm:mt-3 sm:text-[1.85rem]">
            {ui.questions[step]}
          </h2>

          <div id="finder-answers" role="group" aria-labelledby="finder-question" onKeyDown={walk} className="mt-3.5 grid grid-cols-2 gap-1.5 sm:mt-6 sm:grid-cols-4 sm:gap-x-4 sm:gap-y-5">
            {/* "Not sure" is an answer like the others, and always the last card, whether or not the rest are open. */}
            {[...cards.first, ...(moreShown ? cards.more : []), ANY as Option].map((option, i) => {
              const gift = cards.gifts.get(option);
              return <AnswerCard key={option} label={label(step, option)} poster={gift?.poster} current={answers[step] === option} eager={i < cards.first.length || option === ANY} onClick={() => answer(step, option)} />;
            })}
          </div>

          {cards.more.length > 0 ? (
            <button
              type="button"
              aria-expanded={moreShown}
              aria-controls="finder-answers"
              onClick={() => setMoreOpen((open) => !open)}
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-medium text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink active:text-page-accent sm:mt-4"
            >
              {ui.moreOccasions}
              <ChevronDown aria-hidden="true" className={cn("size-4 text-page-body transition-transform duration-200", moreShown && "rotate-180")} />
            </button>
          ) : null}
        </div>
      ) : (
        <div key="result" className={enter}>
          {/* The two answers, where they can be changed: each asks its question again. */}
          <div className="flex flex-wrap gap-2">
            {FINDER_STEPS.map((which) => (
              <button
                key={which}
                type="button"
                data-answered={which}
                onClick={() => reopen(which)}
                className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-page-line bg-page-raised py-1.5 pr-3.5 pl-4 text-[0.9375rem] font-medium text-page-ink shadow-page-card transition-[border-color,scale] duration-200 ease-(--ease-out-quint) hover:border-page-ink/40 active:scale-[0.97]"
              >
                {which === "for" ? ui.forWho[answers.for ?? ANY] : answers.occasion && answers.occasion !== ANY ? ui.occasions[answers.occasion] : ui.anyOccasion}
                {/* Read out after the answer: what pressing it does. */}
                <span className="sr-only">{fill(ui.change, { question: ui.questions[which] })}</span>
                <Pencil aria-hidden="true" className="size-3.5 text-page-body transition-colors group-hover:text-page-ink" strokeWidth={1.8} />
              </button>
            ))}
          </div>

          <h2 ref={heading} tabIndex={-1} id="finder-picks" className="mt-6 scroll-mt-[calc(var(--header-h,0px)+5rem)] font-display text-[1.5rem] leading-tight tracking-[-0.015em] text-page-ink outline-none sm:text-[1.85rem]">
            {ui.resultTitle}
          </h2>

          <div className="mt-1.5 flex items-center justify-between gap-3">
            {/* A feeling is never asked. Whoever wants one taps it, and the same picks come back in another order. */}
            <div role="group" aria-label={ui.feelsLabel} className="-ml-1.5 flex flex-wrap">
              {FINDER_FEELS.map((which) => (
                <button key={which} type="button" data-feel={which} aria-pressed={feel === which} onClick={() => toggleFeel(which)} className="group inline-flex min-h-11 items-center px-1">
                  <span
                    className={cn(
                      "inline-flex h-8 items-center rounded-full border px-3 text-[0.875rem] transition-[background-color,border-color,color] duration-200",
                      feel === which ? "border-page-ink bg-page-ink text-page-ground" : "border-page-line text-page-body group-hover:border-page-ink/40 group-hover:text-page-ink",
                    )}
                  >
                    {ui.feels[which]}
                  </span>
                </button>
              ))}
            </div>
            {filmsMoving || filmsPaused ? (
              <button type="button" data-films-toggle onClick={() => setFilmsPaused((paused) => !paused)} aria-label={filmsPaused ? ui.playFilms : ui.pauseFilms} className="group/film grid size-11 shrink-0 place-items-center rounded-full">
                <span className="grid size-8 place-items-center rounded-full border border-page-line bg-page-raised text-page-ink shadow-page-card transition-[background-color,scale] duration-200 group-hover/film:bg-page-ground group-active/film:scale-95">
                  {filmsPaused ? <Play aria-hidden="true" className="ml-px size-3.5 fill-current" strokeWidth={0} /> : <Pause aria-hidden="true" className="size-3.5 fill-current" strokeWidth={0} />}
                </span>
              </button>
            ) : null}
          </div>

          {/*
           * Three tall picture cards, as "More like this" shows a gift, each playing its own preview.
           * On a phone they are one row, one card to a screen, swiped sideways, with dots under it
           * (the owner, 22 Nov 2026: a set of cards is never shown all at once on a phone); the row
           * runs to the screen's edges and each card stops at the page's own margin.
           */}
          <ol
            id="finder-row"
            aria-labelledby="finder-picks"
            className="-mx-5 mt-3 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pt-1 pb-2 scrollbar-none sm:mx-0 sm:mt-4 sm:grid sm:snap-none sm:grid-cols-3 sm:gap-x-5 sm:gap-y-12 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-x-6"
          >
            {shown.map((pick, i) => {
              const key = reasonKey(pick.why, answers);
              const line = pick.line[key] as string;
              const whole = pick.why[key] as string;
              return (
                <li key={pick.slug} data-card data-pick className="group/pick flex w-full shrink-0 snap-start flex-col sm:w-auto">
                  {/* The picture is the way into the live demo: the real gift, with sample words, in a phone. */}
                  <button
                    type="button"
                    data-watch
                    onClick={(event) => watch(pick, event.currentTarget)}
                    aria-label={`${ui.watch}: ${pick.name}`}
                    className="group relative block aspect-square w-full overflow-hidden rounded-[1.25rem] bg-page-band shadow-page-card transition-[translate,box-shadow,scale] duration-300 ease-(--ease-out-quint) hover:shadow-page-lift active:scale-[0.99] sm:aspect-[4/5] pointer-fine:hover:-translate-y-1"
                  >
                    <PosterFilm poster={pick.poster} film={pick.film} from={pick.filmFrom} paused={filmsPaused} eager={i < PICKS_PER_PAGE} onMoving={() => setFilmsMoving(true)} sizes="(min-width: 1280px) 260px, (min-width: 640px) 30vw, 90vw" />
                    <span aria-hidden="true" className="absolute bottom-3 left-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-black/45 pr-3 pl-2.5 text-[0.875rem] font-medium text-white backdrop-blur-sm transition-colors group-hover:bg-black/60">
                      <Play className="size-3 fill-current" strokeWidth={0} />
                      {ui.watch}
                    </span>
                  </button>
                  <h3 className="mt-3.5 font-display text-xl leading-tight text-page-ink">{pick.name}</h3>
                  <p className="mt-1.5 text-page-label text-page-body">{pick.free ? freeLabel : price}</p>
                  <p data-why className="mt-2.5 text-[0.9375rem] leading-relaxed text-page-body">
                    {line}
                  </p>
                  {whole !== line ? (
                    // The sentence whole, for whoever wants it: closed, and in the page for a search engine once the picks are drawn.
                    <details className="group/why">
                      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[0.875rem] font-medium text-page-ink [&::-webkit-details-marker]:hidden">
                        {ui.whyThis}
                        <Plus aria-hidden="true" className="size-3.5 text-page-body transition-transform duration-200 group-open/why:rotate-45" strokeWidth={1.6} />
                      </summary>
                      <p data-reveal className="pb-2 text-[0.9375rem] leading-relaxed text-page-body">
                        {whole}
                      </p>
                    </details>
                  ) : null}
                  {/*
                   * The first pick carries the way into the editor. The other two show theirs when the
                   * card is pointed at or reached by keyboard, and always where there is no pointer to
                   * hover with (a phone, a tablet). Its room is kept either way, so nothing moves.
                   */}
                  <Link
                    href={`/create/${pick.slug}?ref=${REF}`}
                    data-make
                    onClick={() => track("finder_pick", { template: pick.slug, action: "make" })}
                    className={cn(
                      "mt-auto inline-flex h-11 items-center justify-center gap-1.5 self-start rounded-full px-5 text-[0.9375rem] font-medium transition-[background-color,border-color,opacity,scale] duration-200 ease-(--ease-out-quint) active:scale-[0.98] max-sm:w-full",
                      whole === line && "mt-3",
                      i === 0
                        ? "bg-page-accent text-page-on-accent shadow-[0_14px_28px_-16px_var(--page-accent)] hover:bg-page-accent-hover"
                        : "border border-page-ink/30 text-page-ink hover:border-page-ink/50 hover:bg-page-raised lg:pointer-fine:opacity-0 lg:pointer-fine:group-focus-within/pick:opacity-100 lg:pointer-fine:group-hover/pick:opacity-100",
                    )}
                  >
                    {ui.make}
                    <ArrowRight aria-hidden="true" className="size-3.5" />
                  </Link>
                </li>
              );
            })}
          </ol>
          <IdeasDots key={shown.length} target="finder-row" count={shown.length} className="mt-3 sm:hidden" />

          <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-1 sm:mt-9">
            {shown.length < ranked.length ? (
              <button
                type="button"
                onClick={() => {
                  added.current = shown.length;
                  go(answers, { more: extra + 1, replace: true });
                }}
                className={QUIET}
              >
                {ui.more}
              </button>
            ) : (
              <p className="py-2.5 text-[0.9375rem] text-page-body">{ui.end}</p>
            )}
            <button type="button" onClick={restart} className={QUIET}>
              {ui.restart}
            </button>
          </div>
        </div>
      )}

      <Dialog.Root open={watching !== null} onOpenChange={(open) => (open ? undefined : setWatching(null))}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-forest/45 duration-200 supports-backdrop-filter:backdrop-blur-[3px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
          <Dialog.Content
            aria-describedby={undefined}
            // The dialog has no trigger of its own for Radix to return to: back to the picture that opened it.
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
                    <Image src={watching.poster} alt="" fill sizes="300px" quality={75} loading="eager" className="object-cover" />
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

/**
 * What the demo's window needs around its phone, which takes the rest of the height: the title (two
 * lines at most), the note and the button. On a phone the window is a sheet the height of the
 * screen, and a short one (an iPhone SE is 568 or 667 tall) drops the note, which only says what the
 * demo shows, so the demo is not the size of a stamp.
 */
const DEMO_ROOM = "[--demo-room:10.75rem] [@media(min-height:700px)]:[--demo-room:14.25rem] sm:[--demo-room:14.5rem] sm:[@media(min-height:700px)]:[--demo-room:14.5rem]";
const DEMO_HINT = "[@media(max-height:699.98px)]:max-sm:hidden";

const QUIET =
  "inline-flex min-h-11 items-center text-[0.9375rem] font-medium text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink active:text-page-accent";

/**
 * An answer: a picture of the gift it leads to, and its words. The whole card is the button. On a
 * phone it is a short row (picture, then words), two to a row, so a whole question fits one screen;
 * from 640px the picture is on top and the words under it, four to a row.
 */
function AnswerCard({ label, poster, current, eager, onClick }: { label: string; poster?: string; current: boolean; eager: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      data-answer
      aria-current={current ? "true" : undefined}
      onClick={onClick}
      className={cn(
        "group flex h-[3.25rem] items-center overflow-hidden rounded-[0.875rem] border border-page-line bg-page-raised text-left shadow-page-card transition-[border-color,box-shadow,translate,scale] duration-200 ease-(--ease-out-quint) hover:border-page-ink/35 hover:shadow-page-lift active:scale-[0.98] sm:block sm:h-auto sm:rounded-[1.25rem] pointer-fine:hover:-translate-y-0.5",
        current && "border-page-accent ring-2 ring-page-accent/60",
      )}
    >
      <span className="relative block h-full w-12 shrink-0 overflow-hidden bg-page-band sm:aspect-[6/5] sm:h-auto sm:w-full">
        {poster ? <Image src={poster} alt="" fill sizes="(min-width: 1280px) 190px, (min-width: 640px) 23vw, 48px" loading={eager ? "eager" : "lazy"} className="object-cover object-[50%_32%]" /> : null}
      </span>
      <span className="block min-w-0 px-2.5 font-display text-[0.9375rem] leading-[1.12] text-page-ink sm:px-3.5 sm:pt-2.5 sm:pb-3 sm:text-[1.0625rem] sm:leading-snug">{label}</span>
    </button>
  );
}
