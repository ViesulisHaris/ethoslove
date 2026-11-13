"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Send, Smartphone } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import type { LanguageCopy, QuizUi } from "@/content/love-language-quiz";
import {
  LANGUAGES,
  NAME_MAX,
  QUIZ_LENGTH,
  answered,
  cleanName,
  decodeScores,
  encodeScores,
  linkHash,
  lowest,
  ranked,
  readLink,
  sameScores,
  score,
  shares,
  tops,
  type Answer,
  type LoveLanguage,
  type Pair,
  type Person,
  type Scores,
} from "@/lib/love-quiz/score";
import { cn } from "@/lib/utils";

export type QuizQuestionView = { prompt: string; a: { lang: LoveLanguage; text: string }; b: { lang: LoveLanguage; text: string } };
export type QuizGift = { slug: string; name: string; poster: string };

/** Where this device keeps the answers, the result and the partner's. Nothing leaves the browser. */
const KEY = "ethos.loveQuiz.v1";
type Saved = { answers?: unknown; mine?: string; partner?: { code?: string; name?: string } | null; name?: string };

type Note = "resumed" | "own" | null;
type State = { answers: Answer[]; index: number; mine: Scores | null; partner: Person | null; note: Note };

const blank = (): Answer[] => Array<Answer>(QUIZ_LENGTH).fill(null);
const START: State = { answers: blank(), index: 0, mine: null, partner: null, note: null };
const QUIZ = "love_language";

function savedAnswers(x: unknown): Answer[] {
  if (!Array.isArray(x) || x.length !== QUIZ_LENGTH) return blank();
  return x.map((a) => (a === 0 || a === 1 ? a : null));
}

const firstOpen = (answers: readonly Answer[]) => {
  const i = answers.findIndex((a) => a === null);
  return i < 0 ? QUIZ_LENGTH - 1 : i;
};

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}

const cap = (s: string) => (s ? s.charAt(0).toLocaleUpperCase() + s.slice(1) : s);

/**
 * The quiz on /tools/love-language-quiz: thirty choices, then the result, a link for the partner and,
 * once both have answered, the two side by side with what each needs and the gift that speaks it.
 * A partner's result arrives in the link's hash (lib/love-quiz/score.ts). Nothing depends on the
 * hash or this device's memory until the page has mounted, so the server's HTML (question 1) and
 * the first render agree.
 */
export function LoveLanguageQuiz({
  questions,
  ui,
  languages,
  gifts,
}: {
  questions: QuizQuestionView[];
  ui: QuizUi;
  languages: Record<LoveLanguage, LanguageCopy>;
  gifts: Record<LoveLanguage, QuizGift>;
}) {
  const pairs = useMemo(() => questions.map((q): Pair => [q.a.lang, q.b.lang]), [questions]);
  const [s, setS] = useState<State>(START);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [picked, setPicked] = useState<0 | 1 | null>(null);
  const [view, setView] = useState<"both" | "mine">("both");
  const [copied, setCopied] = useState(false);
  const [manualLink, setManualLink] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  /** Bring the card's top into view: always for someone arriving from a link, else only when it has scrolled away above. */
  function toCard(force = false) {
    const el = cardRef.current;
    if (!el || (!force && el.getBoundingClientRect().top >= 0)) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce || force ? "auto" : "smooth", block: "start" });
  }

  useEffect(() => {
    /** Where this visit starts: a link's people first, else whatever this device was doing. */
    const apply = (fromLink: boolean) => {
      let saved: Saved = {};
      try {
        saved = (JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Saved) ?? {};
      } catch {
        // Unreadable or blocked: start fresh.
      }
      const mine = decodeScores(saved.mine);
      const answers = savedAnswers(saved.answers);
      const partnerScores = decodeScores(saved.partner?.code);
      const partner: Person | null = partnerScores ? { scores: partnerScores, name: cleanName(saved.partner?.name) } : null;
      const resume = (p: Person | null): State =>
        answered(answers) > 0 ? { answers, index: firstOpen(answers), mine: null, partner: p, note: "resumed" } : { ...START, partner: p };
      const link = readLink(window.location.hash);
      let next: State;
      let myName = cleanName(saved.name);
      if (link.a && link.b) {
        // Both results: "you" is whichever this device's own result matches, else the first, who it was sent back to.
        const flip = mine != null && sameScores(mine, link.b.scores) && !sameScores(mine, link.a.scores);
        const me = flip ? link.b : link.a;
        next = { answers: blank(), index: 0, mine: me.scores, partner: flip ? link.a : link.b, note: null };
        if (!myName && me.name) myName = me.name;
      } else if (link.a) {
        if (mine && sameScores(mine, link.a.scores)) next = { answers: blank(), index: 0, mine, partner, note: "own" };
        else if (mine) next = { answers: blank(), index: 0, mine, partner: link.a, note: null };
        else next = resume(link.a);
      } else if (mine) {
        next = { answers: blank(), index: 0, mine, partner, note: null };
      } else {
        next = resume(partner);
      }
      setS(next);
      setName(myName);
      setView("both");
      setReady(true);
      if (fromLink && link.a) window.requestAnimationFrame(() => toCard(true));
    };
    // One frame later, not during the effect itself: the first paint stays the server's.
    const first = window.requestAnimationFrame(() => {
      setCanShare(typeof navigator.share === "function" && window.matchMedia?.("(pointer: coarse)").matches === true);
      apply(true);
    });
    const onHash = () => {
      if (readLink(window.location.hash).a) apply(true);
    };
    window.addEventListener("hashchange", onHash);
    return () => {
      window.cancelAnimationFrame(first);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const saved: Saved = {
      answers: s.answers,
      mine: s.mine ? encodeScores(s.mine) : undefined,
      partner: s.partner ? { code: encodeScores(s.partner.scores), name: s.partner.name } : null,
      name: cleanName(name),
    };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(saved));
    } catch {
      // Private browsing: the quiz still works, it just won't be here next time.
    }
  }, [ready, s, name]);

  /** The address bar as a link to what is on screen, or to the partner's invite while answering. */
  function setHash(hash: string) {
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) window.history.replaceState(null, "", url);
  }

  function choose(option: 0 | 1) {
    if (busy.current || s.mine) return;
    busy.current = true;
    setPicked(option);
    const answers = [...s.answers];
    answers[s.index] = option;
    if (answered(s.answers) === 0) track("quiz_started", { quiz: QUIZ, invited: s.partner != null });
    window.setTimeout(() => {
      busy.current = false;
      setPicked(null);
      if (answers.every((a) => a !== null)) {
        const mine = score(answers, pairs);
        const top = tops(mine);
        setS({ answers, index: QUIZ_LENGTH - 1, mine, partner: s.partner, note: null });
        setView("both");
        track("quiz_finished", { quiz: QUIZ, top: top[0] ?? null, tie: top.length > 1, invited: s.partner != null });
        if (s.partner) setHash(linkHash(s.partner, { scores: mine, name: cleanName(name) }));
        window.requestAnimationFrame(() => toCard());
        return;
      }
      // On to the next question, answered already or not (after "Back"); past the last, to the first gap.
      const after = s.index + 1;
      setS({ ...s, answers, index: after < QUIZ_LENGTH ? after : firstOpen(answers), note: null });
    }, 200);
  }

  function back() {
    if (busy.current || s.index === 0) return;
    setS({ ...s, index: s.index - 1, note: null });
  }

  /** Answer again from the start, keeping the partner whose result is waiting. */
  function restart() {
    setS({ answers: blank(), index: 0, mine: null, partner: s.partner, note: null });
    setManualLink(null);
    setHash(s.partner ? linkHash(s.partner) : "");
    window.requestAnimationFrame(() => toCard());
  }

  /** The same phone, passed across the sofa: this result becomes the partner's, and the quiz starts again. */
  function handOver() {
    if (!s.mine) return;
    setS({ answers: blank(), index: 0, mine: null, partner: { scores: s.mine, name: cleanName(name) }, note: null });
    setName("");
    setManualLink(null);
    setHash("");
    window.requestAnimationFrame(() => toCard());
  }

  async function send(kind: "invite" | "compare") {
    if (!s.mine) return;
    const me: Person = { scores: s.mine, name: cleanName(name) };
    const hash = kind === "compare" && s.partner ? linkHash(s.partner, me) : linkHash(me);
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    if (canShare) {
      try {
        await navigator.share({ text: kind === "compare" ? ui.compareShareText : ui.shareText, url });
        track("quiz_shared", { quiz: QUIZ, kind, method: "share" });
        return;
      } catch (e) {
        // Closing the share sheet is a choice, not a failure.
        if (e instanceof Error && e.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setManualLink(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
      track("quiz_shared", { quiz: QUIZ, kind, method: "copy" });
    } catch {
      // No clipboard (an in-app browser, a denied permission): show the link to copy by hand.
      setManualLink(url);
      track("quiz_shared", { quiz: QUIZ, kind, method: "manual" });
    }
  }

  function showGifts() {
    const el = document.getElementById("love-quiz-gifts");
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  const nameOf = (l: LoveLanguage) => languages[l].name;
  /** "Quality time and physical touch": a list as a sentence, capitalised only where one starts. */
  const joined = (list: LoveLanguage[], lower = false) => {
    const names = list.map((l, i) => (lower || i > 0 ? nameOf(l).toLocaleLowerCase() : nameOf(l)));
    return names.length > 1 ? `${names.slice(0, -1).join(", ")} ${ui.and} ${names[names.length - 1]}` : (names[0] ?? "");
  };
  /** What came first: one language, a tie, or all five at six each. */
  const firstOf = (x: Scores) => (tops(x).length === LANGUAGES.length ? ui.evenTitle : joined(tops(x)));
  const partnerName = s.partner?.name || ui.yourPartner;

  const shareBox = (kind: "invite" | "compare") => (
    <section className="mt-10 rounded-3xl bg-rose-soft/70 p-5 ring-1 ring-rose/40 sm:p-6" aria-labelledby={`love-quiz-share-${kind}`}>
      <h3 id={`love-quiz-share-${kind}`} className="font-display text-[1.7rem] leading-tight text-forest">
        {kind === "invite" ? ui.shareTitle : fill(ui.sendBack, { name: partnerName })}
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed text-forest/75">{kind === "invite" ? ui.shareBody : ui.sendBackBody}</p>
      <label className="mt-5 block max-w-sm">
        <span className="text-[13px] font-medium text-forest/70">{ui.nameLabel}</span>
        <input
          type="text"
          value={name}
          maxLength={NAME_MAX}
          autoComplete="given-name"
          enterKeyHint="send"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void send(kind);
          }}
          className="mt-1.5 block h-12 w-full rounded-2xl border border-forest/15 bg-white px-4 text-base text-forest placeholder:text-forest/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose"
        />
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void send(kind)} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-forest-raised sm:w-auto">
          {copied ? <Check aria-hidden="true" className="size-4" /> : <Send aria-hidden="true" className="size-4" />}
          {copied ? ui.copied : canShare ? (kind === "invite" ? ui.share : fill(ui.sendBack, { name: partnerName })) : ui.copy}
        </button>
        {kind === "invite" ? (
          <button type="button" onClick={handOver} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-forest/20 bg-white/60 px-5 py-2.5 text-sm font-semibold text-forest transition-colors hover:bg-white sm:w-auto">
            <Smartphone aria-hidden="true" className="size-4" />
            {ui.samePhone}
          </button>
        ) : null}
      </div>
      <p role="status" className="sr-only">
        {copied ? ui.copied : ""}
      </p>
      {manualLink ? <input readOnly value={manualLink} onFocus={(e) => e.currentTarget.select()} aria-label={ui.copy} className="mt-3 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-forest" /> : null}
    </section>
  );

  const giftCard = (lang: LoveLanguage, whose: "mine" | "partner") => {
    const gift = gifts[lang];
    const clicked = (to: "editor" | "template") => track("quiz_gift_click", { quiz: QUIZ, template: gift.slug, language: lang, whose, to });
    return (
      <div className="mt-6 flex gap-4 rounded-3xl border border-forest/10 bg-paper p-4 sm:gap-5 sm:p-5">
        <Link href={`/templates/${gift.slug}`} onClick={() => clicked("template")} className="relative block aspect-[390/600] w-[76px] shrink-0 overflow-hidden rounded-2xl bg-ink/10 ring-1 ring-black/5 sm:w-[92px]">
          {/* Eager: it only exists once a result is on screen, and a lazy one showed up blank on the way down. */}
          <Image src={gift.poster} alt={gift.name} fill sizes="92px" loading="eager" className="object-cover" />
        </Link>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold tracking-[0.18em] text-rose-deep uppercase">{ui.giftTitle}</p>
          <p className="mt-1.5 text-[15px] leading-relaxed text-forest/80">{languages[lang].gift}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href={`/create/${gift.slug}`} onClick={() => clicked("editor")} className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-forest-raised">
              {whose === "partner" ? fill(ui.makeFor, { name: partnerName }) : ui.make}
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href={`/templates/${gift.slug}`} onClick={() => clicked("template")} className="inline-flex min-h-11 items-center text-sm font-medium text-forest/70 underline-offset-4 hover:text-forest hover:underline">
              {whose === "partner" ? ui.seeFirst : ui.see}
            </Link>
          </div>
        </div>
      </div>
    );
  };

  let body: React.ReactNode;
  if (!s.mine) {
    const q = questions[s.index] ?? questions[0]!;
    const current = s.answers[s.index];
    body = (
      <div>
        {s.partner ? <p className="mb-6 rounded-2xl bg-rose-soft px-4 py-3 text-[14.5px] leading-snug text-forest">{fill(ui.invite, { name: cap(partnerName) })}</p> : null}
        <div className="flex min-h-11 items-center justify-between gap-3">
          <p className="text-[12px] font-semibold tracking-[0.18em] text-rose-deep uppercase">{fill(ui.progress, { n: s.index + 1, total: QUIZ_LENGTH })}</p>
          {s.index > 0 ? (
            <button type="button" onClick={back} className="-mr-2 inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium text-forest/65 transition-colors hover:text-forest">
              <ArrowLeft aria-hidden="true" className="size-4" />
              {ui.back}
            </button>
          ) : (
            // The intro above says it on a phone, where this line would push the counter onto two.
            <span className="hidden text-right text-[13px] text-forest/50 sm:inline">{ui.meta}</span>
          )}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-forest/10" aria-hidden="true">
          <div className="h-full rounded-full bg-rose-deep transition-[width] duration-300 ease-out" style={{ width: `${(answered(s.answers) / QUIZ_LENGTH) * 100}%` }} />
        </div>
        {/* The buttons stay the same two elements from question to question, so focus stays where the
            last tap or key press left it; the words fade in, and a screen reader hears the new question. */}
        <p className="sr-only" aria-live="polite">
          {ready && (s.index > 0 || answered(s.answers) > 0) ? `${fill(ui.progress, { n: s.index + 1, total: QUIZ_LENGTH })}. ${q.prompt}` : ""}
        </p>
        <fieldset className="mt-7 min-w-0">
          <legend key={s.index} className="animate-content-in font-display text-[clamp(1.55rem,5.4vw,2.05rem)] leading-[1.15] text-forest">
            {q.prompt}
          </legend>
          <div className="mt-6 grid gap-3">
            {([0, 1] as const).map((option) => {
              const on = picked === option || (picked === null && current === option);
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={on}
                  onClick={() => choose(option)}
                  className={cn(
                    "flex min-h-[4.5rem] w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left text-[16px] leading-snug text-forest transition-[background-color,border-color] duration-150 sm:px-5 sm:text-[17px]",
                    on ? "border-rose-deep bg-rose-soft" : "border-forest/15 bg-paper hover:border-forest/35 hover:bg-white",
                  )}
                >
                  <span aria-hidden="true" className={cn("grid size-8 shrink-0 place-items-center rounded-full border text-[13px] font-semibold", on ? "border-rose-deep bg-rose-deep text-cream" : "border-forest/20 text-forest/55")}>
                    {on ? <Check className="size-4" /> : option === 0 ? "A" : "B"}
                  </span>
                  <span key={s.index} className="animate-content-in min-w-0">
                    {option === 0 ? q.a.text : q.b.text}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
        {s.note === "resumed" ? (
          <p className="mt-5 text-[13.5px] text-forest/60">
            {ui.resumed}{" "}
            <button type="button" onClick={restart} className="inline-flex min-h-11 items-center font-medium text-forest underline underline-offset-4">
              {ui.startOver}
            </button>
          </p>
        ) : null}
      </div>
    );
  } else if (s.partner && view === "both") {
    const mine = s.mine;
    const theirs = s.partner.scores;
    const myTops = tops(mine);
    const theirTops = tops(theirs);
    const theirTop = theirTops[0]!;
    const myTop = myTops[0]!;
    // An even split (all five at six) says nothing about what comes first or last, so it adds no notes.
    const even = (x: Scores) => tops(x).length === LANGUAGES.length;
    const both = myTops.filter((l) => theirTops.includes(l));
    const notes: string[] = [];
    if (!even(mine) && !even(theirs)) notes.push(both.length ? fill(ui.sameTop, { language: joined(both, true) }) : ui.differentTop);
    // First for one and last for the other, where "last" is a real bottom, not part of a tie for first.
    const lastOnly = (x: Scores) => lowest(x).filter((l) => !tops(x).includes(l));
    const theirFirstMyLast = even(theirs) ? [] : theirTops.filter((l) => lastOnly(mine).includes(l));
    if (theirFirstMyLast.length) notes.push(fill(ui.theirTopYourLast, { language: joined(theirFirstMyLast, true), name: partnerName }));
    const myFirstTheirLast = even(mine) ? [] : myTops.filter((l) => lastOnly(theirs).includes(l));
    if (myFirstTheirLast.length) notes.push(fill(ui.yourTopTheirLast, { language: joined(myFirstTheirLast, true), name: partnerName }));
    if (even(mine) || even(theirs)) notes.push(ui.evenBody);
    const mineShares = shares(mine);
    const theirShares = shares(theirs);
    const theirLabel = cap(partnerName);
    body = (
      <div>
        <p className="text-[12px] font-semibold tracking-[0.18em] text-rose-deep uppercase">{fill(ui.compareEyebrow, { name: partnerName })}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-rose-soft/80 p-4 sm:p-5">
            <p className="text-[13.5px] text-forest/65">{cap(fill(ui.firstFor, { name: ui.forYou }))}</p>
            <p className="mt-1 font-display text-[clamp(1.6rem,6vw,2rem)] leading-tight text-forest">{firstOf(mine)}</p>
          </div>
          <div className="rounded-2xl bg-forest/[0.06] p-4 sm:p-5">
            <p className="text-[13.5px] text-forest/65">{cap(fill(ui.firstFor, { name: partnerName }))}</p>
            <p className="mt-1 font-display text-[clamp(1.6rem,6vw,2rem)] leading-tight text-forest">{firstOf(theirs)}</p>
          </div>
        </div>
        <div className="mt-6 space-y-3 text-[15.5px] leading-relaxed text-forest/80">
          {notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
        </div>

        <ul className="mt-8 space-y-5">
          {ranked(mine).map((l) => (
            <li key={l}>
              <p className="font-medium text-forest">{nameOf(l)}</p>
              <Bar label={ui.you} pct={mineShares[l]} tone="rose" />
              <Bar label={theirLabel} pct={theirShares[l]} tone="forest" />
            </li>
          ))}
        </ul>

        <section className="mt-10 border-t border-forest/10 pt-8" aria-labelledby="love-quiz-their-needs">
          <h3 id="love-quiz-their-needs" className="font-display text-[1.7rem] leading-tight text-forest">
            {cap(fill(ui.needsTitle, { name: partnerName }))}
          </h3>
          <Lands title={nameOf(theirTop)} items={languages[theirTop].lands} misses={languages[theirTop].misses} missesTitle={ui.missesTitle} />
          {giftCard(theirTop, "partner")}
        </section>

        <section className="mt-10 border-t border-forest/10 pt-8" aria-labelledby="love-quiz-your-needs">
          <h3 id="love-quiz-your-needs" className="font-display text-[1.7rem] leading-tight text-forest">
            {fill(ui.yourNeedsTitle, { name: partnerName })}
          </h3>
          <Lands title={nameOf(myTop)} items={languages[myTop].lands} />
        </section>

        {shareBox("compare")}

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={() => setView("mine")} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-forest/20 px-5 py-2.5 text-sm font-semibold text-forest transition-colors hover:bg-forest/5">
            {ui.justMine}
          </button>
          <button type="button" onClick={restart} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium text-forest/65 transition-colors hover:text-forest">
            <RotateCcw aria-hidden="true" className="size-4" />
            {ui.retake}
          </button>
        </div>
      </div>
    );
  } else {
    const mine = s.mine;
    const top = tops(mine);
    const first = top[0]!;
    const even = top.length === LANGUAGES.length;
    const pct = shares(mine);
    body = (
      <div>
        {s.note === "own" ? <p className="mb-6 rounded-2xl bg-rose-soft px-4 py-3 text-[14.5px] leading-snug text-forest">{ui.ownLink}</p> : null}
        <p className="text-[12px] font-semibold tracking-[0.18em] text-rose-deep uppercase">{ui.resultEyebrow}</p>
        <h2 className="mt-2 font-display text-[clamp(2.2rem,8.5vw,3.5rem)] leading-[1.02] text-forest">{firstOf(mine)}</h2>
        {even ? (
          <p className="mt-3 text-lg leading-snug text-forest/85">{ui.evenBody}</p>
        ) : (
          <>
            {top.map((l) => (
              <p key={l} className="mt-3 text-lg leading-snug text-forest/85">
                {languages[l].line}
              </p>
            ))}
            <p className="mt-3 leading-relaxed text-forest/70">{languages[first].body}</p>
          </>
        )}

        <div className="mt-8">
          <p className="text-[12px] font-semibold tracking-[0.18em] text-forest/55 uppercase">{ui.sharesNote}</p>
          <ul className="mt-3 space-y-3.5">
            {ranked(mine).map((l) => (
              <li key={l}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className={cn("text-[15.5px]", top.includes(l) ? "font-semibold text-forest" : "text-forest/75")}>{nameOf(l)}</span>
                  <span className="text-[14px] text-forest/60 tabular-nums">{pct[l]}%</span>
                </div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-forest/[0.07]" aria-hidden="true">
                  <div className={cn("h-full rounded-full", top.includes(l) ? "bg-rose-deep" : "bg-forest/35")} style={{ width: `${pct[l]}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* An even split has no first language to explain or give for: the five are below the quiz. */}
        {even ? null : <Lands title={ui.landsTitle} items={languages[first].lands} misses={languages[first].misses} missesTitle={ui.missesTitle} />}

        {s.partner ? null : shareBox("invite")}

        {even ? null : giftCard(first, "mine")}

        <div className="mt-8 flex flex-wrap gap-3">
          {s.partner ? (
            <button type="button" onClick={() => setView("both")} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream transition-colors hover:bg-forest-raised">
              <ArrowLeft aria-hidden="true" className="size-4" />
              {ui.backToCompare}
            </button>
          ) : null}
          <button type="button" onClick={showGifts} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-forest/20 px-5 py-2.5 text-sm font-semibold text-forest transition-colors hover:bg-forest/5">
            {ui.allFive}
          </button>
          <button type="button" onClick={restart} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium text-forest/65 transition-colors hover:text-forest">
            <RotateCcw aria-hidden="true" className="size-4" />
            {ui.retake}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={cardRef} className="scroll-mt-24 rounded-[28px] bg-white/85 p-5 shadow-soft ring-1 ring-forest/10 sm:p-8">
      {body}
      <p className="mt-7 text-[12.5px] leading-relaxed text-forest/45">{ui.privacy}</p>
    </div>
  );
}

function Bar({ label, pct, tone }: { label: string; pct: number; tone: "rose" | "forest" }) {
  return (
    <div className="mt-1.5 grid grid-cols-[minmax(0,5.5rem)_1fr_2.75rem] items-center gap-3">
      <span className="truncate text-[13px] text-forest/60">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-forest/[0.07]" aria-hidden="true">
        <span className={cn("block h-full rounded-full", tone === "rose" ? "bg-rose-deep" : "bg-forest/70")} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-right text-[13px] text-forest/60 tabular-nums">{pct}%</span>
    </div>
  );
}

function Lands({ title, items, misses, missesTitle }: { title: string; items: string[]; misses?: string; missesTitle?: string }) {
  return (
    <div className={cn("mt-6 grid gap-6", misses ? "sm:grid-cols-[1.4fr_1fr]" : "")}>
      <div>
        <p className="text-[12px] font-semibold tracking-[0.18em] text-forest/55 uppercase">{title}</p>
        <ul className="mt-3 space-y-2.5">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-[15.5px] leading-snug text-forest/85">
              <span aria-hidden="true" className="mt-[0.55em] size-1.5 shrink-0 rounded-full bg-rose-deep" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      {misses && missesTitle ? (
        <div>
          <p className="text-[12px] font-semibold tracking-[0.18em] text-forest/55 uppercase">{missesTitle}</p>
          <p className="mt-3 text-[15.5px] leading-snug text-forest/70">{misses}</p>
        </div>
      ) : null}
    </div>
  );
}
