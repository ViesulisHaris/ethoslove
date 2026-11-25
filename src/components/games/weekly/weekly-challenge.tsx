"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Check, Gift } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import { isInApp, shareLink } from "@/lib/app/bridge";
import { cleanName, DAY_MS, dayOf } from "@/lib/games/daily";
import { deviceStorage, readSaved, removeSaved, savedKey, tabStorage, writeSaved } from "@/lib/games/saved";
import { decodeWeekly, encodeWeekly, picksFrom, picksText, sameCount, weekOf, weekStart, weeklyCards, weeklySentHere, weeklySet, type Side, type WeeklyLink, type WeeklyPicks, type WeeklySent, type WeeklySet } from "@/lib/games/weekly";
import { cn } from "@/lib/utils";
import { NAMES_KEY } from "../lobby";
import { CARD, Corner, PRIMARY, SECOND, plainWhenOffline, rememberedNames } from "../today/today-question";
import { setWeekInView } from "./in-view";

/** `own`: the address is a link this tab sent itself, opened again to check it (lib/games/weekly.ts, weeklySentHere). */
type View = { week: number; set: WeeklySet; link: WeeklyLink | null; broken: boolean; own: boolean };
type Phase = "ask" | "invited" | "answered" | "sent" | "reveal";

/**
 * This tab's own picks of a week's set so far (`p`: none to three of "0" and "1"), so a reload keeps
 * them, and what the last link it sent carried (`s`: the name, the three picks, and `r` when it was
 * a reply), so that link opened again here is known as its own. sessionStorage: it never leaves the tab.
 */
type Kept = { w: number; i: string; p: string; s?: { n: string; p: string; r?: 1 } };
const KEPT = savedKey("weekly", "play");
function reviveWeekly(raw: unknown): Kept | null {
  if (!raw || typeof raw !== "object") return null;
  const { w, i, p, s } = raw as Record<string, unknown>;
  if (!(typeof w === "number" && Number.isInteger(w) && typeof i === "string" && typeof p === "string" && picksFrom(p) !== null)) return null;
  const sent = s && typeof s === "object" ? (s as Record<string, unknown>) : null;
  return sent && typeof sent.n === "string" && typeof sent.p === "string" && picksFrom(sent.p, 3) !== null ? { w, i, p, s: { n: sent.n, p: sent.p, ...(sent.r === 1 ? { r: 1 as const } : {}) } } : { w, i, p };
}

/**
 * What the last link sent from this browser carried (lib/games/weekly.ts, WeeklySent), in the
 * browser's own storage: a chat app opens a link tapped in it in a new tab, where the tab's memory
 * above is empty. One record, replaced by each link sent, and dropped once its week is two weeks gone.
 */
const SENT = "ethos.games.weekly.sent";
function readLastSent(thisWeek: number): WeeklySent | null {
  const sent = readSaved(deviceStorage(), SENT, (raw): WeeklySent | null => {
    if (!raw || typeof raw !== "object") return null;
    const { week, setId, name, picks, reply } = raw as Record<string, unknown>;
    if (!(typeof week === "number" && Number.isInteger(week) && typeof setId === "string" && typeof name === "string" && picksFrom(picks, 3) !== null)) return null;
    return { week, setId, name, picks: picks as string, ...(reply === true ? { reply: true } : {}) };
  });
  if (sent && sent.week < thisWeek - 1) {
    removeSaved(deviceStorage(), SENT);
    return null;
  }
  return sent;
}

/** Next's own state for this page's history entry, which a hash change leaves out of the entry it adds (as in today-question.tsx). */
type RouterState = { __NA?: boolean } & Record<string, unknown>;

const three = (picks: readonly Side[]): WeeklyPicks => [picks[0] ?? 0, picks[1] ?? 0, picks[2] ?? 0];

/** One answer in a list of three: a small raised card, as wide as its column. */
const ROW = "relative flex min-h-16 items-center rounded-2xl border border-page-line bg-page-raised px-4 py-3 pr-10 text-left font-display text-[1.125rem] leading-snug text-page-ink shadow-page-card";
/** A quiet text button, a thumb's target by its height (the finder's quiet link). */
const QUIET = "inline-flex min-h-11 items-center text-[0.9375rem] text-page-ink underline decoration-page-line underline-offset-4 transition-colors hover:decoration-page-ink motion-reduce:transition-none";
const HEADING = "mt-3 font-display text-[1.75rem] leading-tight text-page-ink outline-none sm:text-[2rem]";
// On a small phone (320 by 568) and on a phone on its side the question is set tighter, so both cards are on the first screen (as today's question).
const TIGHT_HEADING = "[@media(orientation:portrait)_and_(max-height:600px)]:mt-2 [@media(orientation:portrait)_and_(max-height:600px)]:text-[1.5rem] [@media(orientation:landscape)_and_(max-height:520px)]:mt-2 [@media(orientation:landscape)_and_(max-height:520px)]:text-[1.375rem]";
const TIGHT_CARDS = "[@media(orientation:portrait)_and_(max-height:600px)]:mt-3 [@media(orientation:portrait)_and_(max-height:600px)]:min-h-0 [@media(orientation:portrait)_and_(max-height:600px)]:gap-3 [@media(orientation:landscape)_and_(max-height:520px)]:mt-3 [@media(orientation:landscape)_and_(max-height:520px)]:min-h-0";
const TIGHT_WORDS = "[@media(orientation:portrait)_and_(max-height:600px)]:text-[1.25rem] [@media(orientation:landscape)_and_(max-height:520px)]:text-[1.125rem]";

/**
 * The weekly challenge (/games/weekly): this week's three this-or-that pairs, one at a time, each
 * answered with a tap; then a link that carries the week, the set, a first name and the three picks
 * after the `#` (lib/games/weekly.ts). The other person answers the same three before seeing them,
 * then both sets of picks show side by side with how many matched, and they can send theirs back.
 * Nothing reaches a server. Built as today's question is (../today/today-question.tsx).
 *
 * The first render, on the server and in the browser, is always the server's week with no link and
 * no picks; the address, the tab's own picks and the remembered name are read a frame after.
 */
export function WeeklyChallenge({ week }: { week: number }) {
  const t = useTranslations("games.weekly");
  const tl = useTranslations("games.lobby");
  const te = useTranslations("games.end");
  const locale = useLocale() === "es" ? "es" : "en";

  const [view, setView] = useState<View>(() => ({ week, set: weeklySet(week), link: null, broken: false, own: false }));
  const [picks, setPicks] = useState<Side[]>([]);
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  // Changed after the link went out: the link they hold carries the old picks, so it must go again.
  const [changed, setChanged] = useState(false);
  const [thisWeek, setThisWeek] = useState(week);
  // Set once the address has been read: the tests wait for it, and nothing is drawn differently.
  const [ready, setReady] = useState(false);
  const counted = useRef<string | null>(null);
  const answered = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusHeading = useRef(false);
  const statusLine = useRef<HTMLParagraphElement>(null);
  const showForm = useRef(false);
  const copiedTimer = useRef<number | undefined>(undefined);
  const routerState = useRef<RouterState | null>(null);

  const read = useCallback(() => {
    // A link opened in a tab that already had this page is a hash change: the browser adds a history
    // entry without Next's state. The entry gets this page's state back (as in today-question.tsx).
    const state = window.history.state as RouterState | null;
    if (state?.__NA) routerState.current = state;
    else if (routerState.current) window.history.replaceState(routerState.current, "", window.location.href);

    const now = weekOf(dayOf(Date.now()));
    const hash = window.location.hash;
    const asked = hash.startsWith("#w=");
    const decoded = asked ? decodeWeekly(hash, now) : null;
    const tabKept = readSaved(tabStorage(), KEPT, reviveWeekly);
    const lastSent = readLastSent(now);
    const ownHere = !!decoded && weeklySentHere(decoded, tabKept?.s ? { week: tabKept.w, setId: tabKept.i, name: tabKept.s.n, picks: tabKept.s.p, reply: tabKept.s.r === 1 } : null);
    // A chat app opens a tapped link in a new tab, never in the one that sent it: the browser's own
    // memory of the last link sent knows it there too, and this tab takes up the picks it carried.
    const ownElsewhere = !!decoded && !ownHere && weeklySentHere(decoded, lastSent);
    const own = ownHere || ownElsewhere;
    const kept: Kept | null = ownElsewhere && lastSent && !decoded.to ? { w: lastSent.week, i: lastSent.setId, p: lastSent.picks, s: { n: lastSent.name, p: lastSent.picks } } : tabKept;
    if (kept !== tabKept) writeSaved(tabStorage(), KEPT, kept);
    // The tab's own first link opens as the tab left it, the picks marked sent: never a reveal against itself.
    const link = own && !decoded.to ? null : decoded;
    const next: View = decoded ? { week: decoded.week, set: decoded.set, link, broken: false, own } : { week: now, set: weeklySet(now), link: null, broken: asked, own: false };
    const names = rememberedNames();
    const restored: Side[] = kept && kept.w === next.week && kept.i === next.set.id && !link?.to ? (picksFrom(kept.p) ?? []) : [];
    setThisWeek(now);
    setView(next);
    setPicks(restored);
    answered.current = restored.length === 3;
    // A link went out for these picks before (the tab's own link opened again, or a reload after
    // sending): it is still sent. Changed since: the link carries the old picks, so it must go again.
    // "Sent" is said of the kind of link this view would send: a first link with no link open, a reply to one.
    const wentOut = restored.length === 3 && !!kept?.s && (kept.s.r === 1) === (!!link && !link.to);
    setSent(wentOut && kept?.p === kept?.s?.p);
    setChanged(wentOut && kept?.p !== kept?.s?.p);
    setCopied(false);
    setReady(true);
    if (names) setName(names[0]);
    if (counted.current !== hash) {
      counted.current = hash;
      // The tab's own link: nothing new happened, so nothing is counted.
      if (!own) {
        track(link ? "weekly_opened_shared" : "weekly_seen");
        if (link?.to) track("weekly_revealed", { same: sameCount(link.from.picks, link.to.picks) });
        // This tab answered the same set before the link came: the reveal shows at once, and counts.
        else if (link && restored.length === 3) track("weekly_revealed", { same: sameCount(link.from.picks, three(restored)) });
      }
    }
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(read);
    window.addEventListener("hashchange", read);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", read);
    };
  }, [read]);

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  const { link } = view;
  const done = picks.length === 3;
  const at = Math.min(picks.length, 2);
  const phase: Phase = link?.to ? "reveal" : link ? (done ? "reveal" : "invited") : !done ? "ask" : sent ? "sent" : "answered";
  const when: "now" | "last" | "older" = view.week >= thisWeek ? "now" : view.week === thisWeek - 1 ? "last" : "older";

  // The page's heading and the two cards under the challenge follow the week and the set on show.
  useEffect(() => {
    setWeekInView({ when, setId: view.set.id });
    return () => setWeekInView(null);
  }, [when, view.set.id]);

  // A new card, the three picks or both answers took the place of what was tapped: the heading over them gets the focus.
  useEffect(() => {
    if (!focusHeading.current) return;
    focusHeading.current = false;
    heading.current?.focus({ preventScroll: true });
  }, [picks.length, phase]);

  // After the third tap on a phone the name field, the send button and its status come up into view
  // (they stood under the bottom edge). Only as far as needed; a desk has them on screen already.
  useEffect(() => {
    if (phase !== "answered" || !showForm.current) return;
    showForm.current = false;
    if (!window.matchMedia("(max-width: 1023.98px)").matches) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    statusLine.current?.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
  }, [phase]);

  const who = (n: string) => n || tl("someone");
  const cards = weeklyCards(view.set);

  /** The tab's picks so far, kept beside what the last link carried. */
  const keep = (next: readonly Side[]) => {
    const kept = readSaved(tabStorage(), KEPT, reviveWeekly);
    const s = kept && kept.w === view.week && kept.i === view.set.id ? kept.s : undefined;
    writeSaved(tabStorage(), KEPT, { w: view.week, i: view.set.id, p: picksText(next), ...(s ? { s } : {}) });
    return s;
  };

  const choose = (side: Side) => {
    // Until the address is read the cards may still be the server's week: a tap then would answer the wrong set.
    if (!ready || done) return;
    const next = [...picks, side];
    const s = keep(next);
    focusHeading.current = true;
    // "Link copied" would hide that the link already sent is now out of date.
    window.clearTimeout(copiedTimer.current);
    setCopied(false);
    setPicks(next);
    if (next.length < 3) return;
    if (!answered.current) track("weekly_answered");
    answered.current = true;
    if (link && !link.to) {
      track("weekly_revealed", { same: sameCount(link.from.picks, three(next)) });
      return;
    }
    showForm.current = true;
    // A first link went out before: with the same picks it is still sent, with others it must go again.
    const first = !!s && s.r !== 1;
    setSent(first && s.p === picksText(next));
    setChanged(first && s.p !== picksText(next));
  };

  /** One card back: the last pick is taken off, and its card is asked again. */
  const back = () => {
    if (picks.length === 0 || done) return;
    const next = picks.slice(0, -1);
    keep(next);
    focusHeading.current = true;
    setPicks(next);
  };

  /** All three again, from the first card. A link already sent stays remembered, so the same picks are still "sent". */
  const startOver = () => {
    keep([]);
    focusHeading.current = true;
    window.clearTimeout(copiedTimer.current);
    setCopied(false);
    setSent(false);
    setChanged(false);
    setPicks([]);
  };

  /** A link went out: remember what it carried, so opening it again here is known as the tab's own. */
  const markSent = () => {
    const p = picksText(picks);
    const reply = !!link && !link.to;
    writeSaved(tabStorage(), KEPT, { w: view.week, i: view.set.id, p, s: { n: cleanName(name), p, ...(reply ? { r: 1 as const } : {}) } });
    writeSaved(deviceStorage(), SENT, { week: view.week, setId: view.set.id, name: cleanName(name), picks: p, ...(reply ? { reply: true } : {}) } satisfies WeeklySent);
    setSent(true);
    setChanged(false);
    setView((v) => (v.own ? { ...v, own: false } : v));
  };

  const url = () =>
    window.location.origin +
    window.location.pathname +
    encodeWeekly({ week: view.week, setId: view.set.id, from: { name, picks: three(picks) }, to: link && !link.to ? link.from : undefined });

  const copy = async () => {
    // On a desk the send block stands under the cards before the third pick: nothing to send yet.
    if (!done) return;
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
      track("weekly_shared", { how: "copy" });
      markSent();
    } catch {
      window.prompt(t("copyFallback"), url());
    }
  };

  const share = async () => {
    if (!done) return;
    // With no name the text speaks for the sender ("I've answered…"): "Someone answered" reads as spam.
    const named = cleanName(name);
    const text = named ? t(link ? "shareBackText" : "shareText", { name: named }) : t(link ? "shareBackTextAnon" : "shareTextAnon");
    const payload = { title: t("shareTitle"), text, url: url() };
    if (isInApp()) {
      if (!(await shareLink(payload))) return copy();
    } else if (navigator.share) {
      try {
        await navigator.share(payload);
      } catch {
        // The sheet was closed: nothing sent, nothing counted.
        return;
      }
    } else return copy();
    track("weekly_shared", { how: "share" });
    markSent();
  };

  const changeName = (value: string) => {
    setName(value);
    try {
      const names = rememberedNames();
      window.localStorage.setItem(NAMES_KEY, JSON.stringify([value, names?.[1] ?? ""]));
    } catch {
      // Not remembered, which is fine.
    }
  };

  const backToThisWeek = () => {
    window.history.replaceState(window.history.state, "", window.location.pathname);
    read();
  };

  // A set from an earlier week says which week, by its Monday, in the reader's own order of day and month.
  const dateLocale = when === "older" && navigator.language?.toLowerCase().startsWith(locale) ? navigator.language : locale;
  const date = when === "older" ? new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(weekStart(view.week) * DAY_MS)) : "";
  const theme = view.set.theme[locale];
  const label = when === "now" ? t("now", { theme }) : when === "last" ? t("last", { theme }) : t("older", { theme, date });

  // In a reveal: the other person's three on the left, the reader's ("You") on the right, both ways
  // round: a reply's `to` is the reader's own answer, unless the reader sent that reply.
  const reveal: { other: { name: string; picks: WeeklyPicks }; mine: WeeklyPicks } | null =
    phase !== "reveal" || !link
      ? null
      : link.to
        ? view.own
          ? { other: { name: who(link.to.name), picks: link.to.picks }, mine: link.from.picks }
          : { other: { name: who(link.from.name), picks: link.from.picks }, mine: link.to.picks }
        : { other: { name: who(link.from.name), picks: link.from.picks }, mine: three(picks) };
  const same = reveal ? sameCount(reveal.other.picks, reveal.mine) : 0;
  // In a reveal there is one thing to do with the link at a time: send yours back, and once it has
  // gone (or when there is nothing to send) the way on to this week's challenge.
  const canSend = phase === "answered" || phase === "sent" || (phase === "reveal" && !link?.to && !sent);
  // On a desk the send block already stands, waiting, under the cards it will send: nothing moves at the third pick.
  const waiting = phase === "ask";
  const status = changed ? t("resend") : copied ? t("copied") : sent ? (view.own ? t("own") : link && !link.to ? t("sentBack", { name: who(link.from.name) }) : t("sent")) : "";
  const pair = cards.picks[at];

  return (
    <div data-weekly data-week={view.week} data-set={view.set.id} data-phase={phase} data-ready={ready || undefined} aria-busy={ready ? undefined : true} className="group/weekly min-h-[31rem] sm:min-h-[28rem] lg:min-h-[26.25rem]">
      <p data-when={when} className="text-page-label text-page-body">
        {label}
      </p>
      {view.broken && phase === "ask" ? <p className="mt-3 text-[0.9375rem] text-page-body">{t("broken")}</p> : null}
      {phase === "invited" && link ? <p className="mt-3 text-[0.9375rem] text-page-body">{t("invited", { name: who(link.from.name) })}</p> : null}

      {reveal ? (
        <>
          <h2 ref={heading} tabIndex={-1} className={HEADING}>
            {same === 3 ? t("revealAll", { total: 3 }) : same === 0 ? t("revealNone", { total: 3 }) : t("revealSome", { same, total: 3 })}
          </h2>
          {/* The two names once, over their columns; each cell says whose it is to a screen reader. */}
          <div aria-hidden="true" className="mt-6 grid grid-cols-2 gap-3 text-page-label text-page-body sm:gap-4">
            <span className="truncate px-1">{reveal.other.name}</span>
            <span className="px-1">{t("you")}</span>
          </div>
          <ol aria-label={t("answers")} className="mt-2 grid gap-3">
            {cards.picks.map((p, i) => {
              const theirs = reveal.other.picks[i];
              const ours = reveal.mine[i];
              return (
                <li key={p.id} data-reveal-row data-same={theirs === ours ? "" : undefined} className="grid grid-cols-2 gap-3 sm:gap-4">
                  <span data-answer data-side={theirs === 0 ? "a" : "b"} className={ROW}>
                    <span className="sr-only">{reveal.other.name}: </span>
                    {(theirs === 0 ? p.a : p.b)[locale]}
                  </span>
                  <span data-answer data-side={ours === 0 ? "a" : "b"} className={cn(ROW, theirs === ours && "border-page-accent")}>
                    <span className="sr-only">{t("you")}: </span>
                    {(ours === 0 ? p.a : p.b)[locale]}
                    {theirs === ours ? (
                      <>
                        <Check aria-hidden="true" className="absolute top-3 right-3 size-4 text-page-accent" strokeWidth={2} />
                        <span className="sr-only"> ({t("rowSame")})</span>
                      </>
                    ) : null}
                  </span>
                </li>
              );
            })}
          </ol>
        </>
      ) : done ? (
        <>
          <h2 ref={heading} tabIndex={-1} id="weekly-question" className={HEADING}>
            {t("yours")}
          </h2>
          <ol data-picks className="mt-6 grid min-h-[15rem] content-start gap-3 sm:min-h-44">
            {cards.picks.map((p, i) => (
              <li key={p.id} data-answer data-side={picks[i] === 0 ? "a" : "b"} className={ROW}>
                {(picks[i] === 0 ? p.a : p.b)[locale]}
              </li>
            ))}
          </ol>
          <div className="mt-2 min-h-11">
            <button type="button" data-change onClick={startOver} className={QUIET}>
              {t("changePicks")}
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 ref={heading} tabIndex={-1} id="weekly-question" className={cn(HEADING, TIGHT_HEADING)}>
            {t("prompt")}
          </h2>
          <p data-step aria-live="polite" className="mt-2 text-page-label text-page-body">
            {t("step", { n: at + 1, total: 3 })}
          </p>
          <div role="group" aria-labelledby="weekly-question" className={cn("relative mt-4 grid min-h-[15rem] gap-4 sm:min-h-44 sm:grid-cols-2", TIGHT_CARDS)}>
            {([0, 1] as const).map((side) => (
              <button
                // A new pair of buttons for each card: nothing of the last tap (its focus, its press) stays on the next one.
                key={`${at}-${side}`}
                type="button"
                data-answer
                data-side={side === 0 ? "a" : "b"}
                aria-disabled={ready ? undefined : true}
                onClick={() => choose(side)}
                className={cn(
                  CARD,
                  "cursor-pointer hover:border-page-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-px",
                  // Still loading a second after it was drawn (a slow phone): the cards dim, so a tap that does nothing yet is not a surprise.
                  "group-not-data-ready/weekly:cursor-progress group-not-data-ready/weekly:animate-[today-wait_0.3s_ease-out_1s_both]",
                )}
              >
                <Corner side={side} />
                <span className={cn("font-display text-[1.375rem] leading-snug text-page-ink sm:text-[1.625rem]", TIGHT_WORDS)}>{(side === 0 ? pair.a : pair.b)[locale]}</span>
              </button>
            ))}
            <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 z-10 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-page-ground font-display text-base text-page-ink italic ring-1 ring-page-line">
              {t("or")}
            </span>
          </div>
          {/* The row keeps its height with no button in it, so the send block under it never moves. */}
          <div className="mt-2 min-h-11">
            {at > 0 ? (
              <button type="button" data-back onClick={back} className={QUIET}>
                {t("back")}
              </button>
            ) : null}
          </div>
        </>
      )}

      {canSend || waiting ? (
        <form
          data-send-block
          onSubmit={(e) => {
            e.preventDefault();
            void share();
          }}
          className={cn("mt-4 flex flex-wrap items-end gap-3", waiting && "max-lg:hidden")}
        >
          <label className="flex w-full flex-col gap-2 sm:w-auto">
            <span className="text-page-label text-page-body">{t("nameLabel")}</span>
            <input
              value={name}
              onChange={(e) => changeName(e.target.value)}
              maxLength={24}
              autoComplete="given-name"
              enterKeyHint="send"
              className="h-12 w-full rounded-full border border-page-line bg-page-raised px-5 text-[1rem] text-page-ink placeholder:text-page-body/70 sm:w-52"
            />
          </label>
          <button type="submit" data-send disabled={waiting} className={PRIMARY}>
            {link ? t("sendBack") : t("send")}
          </button>
          <button type="button" data-copy disabled={waiting} onClick={() => void copy()} className={SECOND}>
            {t("copy")}
          </button>
        </form>
      ) : null}

      <p ref={statusLine} role="status" aria-live="polite" className="mt-4 min-h-6 scroll-mb-4 text-[0.9375rem] text-page-body lg:mt-3">
        {status}
      </p>

      {phase === "reveal" ? (
        <After>
          {/* The reply has gone and its form with it: the same link once more, for a chat it did not reach. */}
          {sent && !canSend && !link?.to ? (
            <button type="button" data-copy-again onClick={() => void copy()} className={SECOND}>
              {t("copyAgain")}
            </button>
          ) : null}
          <Link href="/games/this-or-that" data-whole-game onClick={plainWhenOffline} className={canSend ? SECOND : PRIMARY}>
            {t("wholeGame")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          {when !== "now" && !canSend ? (
            <button type="button" data-this-weeks onClick={backToThisWeek} className={SECOND}>
              {t("thisWeeks")}
            </button>
          ) : null}
          {/* The same two lines and the same address the end of every game uses. Inside the iPhone app the gifts are a tab of their own. */}
          <Link href="/templates?ref=game-end" data-app-hide onClick={plainWhenOffline} className="group mt-2 flex w-full items-center gap-4 rounded-[1.25rem] border border-page-line bg-page-raised p-5 shadow-page-card transition-colors hover:border-page-ink/40">
            <Gift aria-hidden="true" className="size-6 shrink-0 text-page-accent" />
            <span className="min-w-0">
              <span className="block font-display text-[1.375rem] leading-tight text-page-ink">{te("gift")}</span>
              <span className="mt-1 block text-[0.9375rem] leading-snug text-page-body">{te("giftBlurb")}</span>
            </span>
            <ArrowRight aria-hidden="true" className="ml-auto size-4 shrink-0 text-page-ink transition-transform group-hover:translate-x-0.5" />
          </Link>
        </After>
      ) : null}
    </div>
  );
}

function After({ children }: { children: ReactNode }) {
  return <div className="mt-2 flex flex-wrap gap-3">{children}</div>;
}
