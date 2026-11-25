"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { ArrowRight, Gift } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import { isInApp, shareLink } from "@/lib/app/bridge";
import type { RatherPair } from "@/lib/games/content";
import { cleanName, DAY_MS, dailyPair, dayOf, decodeDaily, encodeDaily, sentHere, type DailyLink } from "@/lib/games/daily";
import { readSaved, savedKey, tabStorage, writeSaved } from "@/lib/games/saved";
import { cn } from "@/lib/utils";
import { Suit } from "../cards";
import { NAMES_KEY } from "../lobby";
import { setOldDay } from "./old-day";

type Side = 0 | 1;
/** `own`: the address is a link this tab sent itself, opened again to check it (lib/games/daily.ts, sentHere). */
type View = { day: number; pair: RatherPair; link: DailyLink | null; broken: boolean; own: boolean };
type Phase = "ask" | "invited" | "answered" | "sent" | "reveal";

/**
 * This tab's own answer to a day's pair, so a reload keeps it, and what the last link it sent
 * carried (`s`: the name, the answer, and `r` when it was a reply), so that link opened again here
 * is known as its own, and a reload still knows the link went out. sessionStorage: it never leaves the tab.
 */
type Kept = { d: number; p: string; a: Side; s?: { n: string; a: Side; r?: 1 } };
const KEPT = savedKey("today", "play");
function reviveToday(raw: unknown): Kept | null {
  if (!raw || typeof raw !== "object") return null;
  const { d, p, a, s } = raw as Record<string, unknown>;
  if (!(typeof d === "number" && Number.isInteger(d) && typeof p === "string" && (a === 0 || a === 1))) return null;
  const sent = s && typeof s === "object" ? (s as Record<string, unknown>) : null;
  return sent && typeof sent.n === "string" && (sent.a === 0 || sent.a === 1) ? { d, p, a, s: { n: sent.n, a: sent.a, ...(sent.r === 1 ? { r: 1 as const } : {}) } } : { d, p, a };
}

/** Next's own state for this page's history entry, which a hash change leaves out of the entry it adds. */
type RouterState = { __NA?: boolean } & Record<string, unknown>;

/**
 * A link made by Next's <Link> does nothing at all when the phone is offline (the page's code is
 * fetched first). Offline, it goes the old way, so the browser says it has no connection.
 */
function plainWhenOffline(e: MouseEvent<HTMLAnchorElement>) {
  if (navigator.onLine !== false) return;
  e.preventDefault();
  window.location.assign(e.currentTarget.href);
}

function rememberedNames(): [string, string] | null {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(NAMES_KEY) ?? "null");
    return Array.isArray(saved) && saved.length === 2 ? [cleanName(saved[0]), cleanName(saved[1])] : null;
  } catch {
    return null;
  }
}

// On a phone on its side the cards are shorter, so the question is on the first screen (the page's spread, page.tsx).
const CARD =
  "group relative flex min-h-28 w-full flex-col justify-end rounded-[1.25rem] border border-page-line bg-page-raised px-5 pt-11 pb-5 text-left shadow-page-card transition-[border-color,opacity,translate] duration-200 sm:min-h-44 sm:px-6 sm:pb-6 motion-reduce:transition-none [@media(orientation:landscape)_and_(max-height:520px)]:min-h-0 [@media(orientation:landscape)_and_(max-height:520px)]:pt-9 [@media(orientation:landscape)_and_(max-height:520px)]:pb-3 [@media(orientation:portrait)_and_(max-height:600px)]:min-h-0 [@media(orientation:portrait)_and_(max-height:600px)]:pt-9 [@media(orientation:portrait)_and_(max-height:600px)]:pb-4";
const PRIMARY =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-page-accent px-7 text-[0.9375rem] font-semibold text-page-on-accent transition-colors hover:bg-page-accent-hover active:translate-y-px disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none";
const SECOND =
  "inline-flex h-12 items-center justify-center rounded-full border border-page-ink/25 px-6 text-[0.9375rem] font-medium text-page-ink transition-colors hover:border-page-ink active:translate-y-px disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none";

/**
 * Today's question (/games/today): one "Would you rather" pair a day, answered with one tap and
 * sent in a link that carries the day, the pair, a first name and the answer after the `#`
 * (lib/games/daily.ts). The other person picks before seeing it, then both answers show side by
 * side, and they can send theirs back the same way. Nothing reaches a server.
 *
 * The first render, on the server and in the browser, is always the server's day with no link and
 * no answer; the address, the tab's own answer and the remembered name are read a frame after.
 */
export function TodayQuestion({ day }: { day: number }) {
  const t = useTranslations("games.today");
  const tl = useTranslations("games.lobby");
  const te = useTranslations("games.end");
  const locale = useLocale() === "es" ? "es" : "en";

  const [view, setView] = useState<View>(() => ({ day, pair: dailyPair(day), link: null, broken: false, own: false }));
  const [mine, setMine] = useState<Side | null>(null);
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  // Changed after the link went out: the link they hold carries the old answer, so it must go again.
  const [changed, setChanged] = useState(false);
  const [today, setToday] = useState(day);
  // Set once the address has been read: the tests wait for it, and nothing is drawn differently.
  const [ready, setReady] = useState(false);
  const counted = useRef<string | null>(null);
  const revealHeading = useRef<HTMLHeadingElement>(null);
  const focusReveal = useRef(false);
  const statusLine = useRef<HTMLParagraphElement>(null);
  const showForm = useRef(false);
  const copiedTimer = useRef<number | undefined>(undefined);
  const routerState = useRef<RouterState | null>(null);

  const read = useCallback(() => {
    // A link opened in a tab that already had this page is a hash change: the browser adds a history
    // entry without Next's state, and Back to it from another page changed the address but left that
    // page on screen. The entry gets this page's state back, so Next can draw it (it is the same page).
    const state = window.history.state as RouterState | null;
    if (state?.__NA) routerState.current = state;
    else if (routerState.current) window.history.replaceState(routerState.current, "", window.location.href);

    const now = dayOf(Date.now());
    const hash = window.location.hash;
    const asked = hash.startsWith("#q=");
    const decoded = asked ? decodeDaily(hash, now) : null;
    const kept = readSaved(tabStorage(), KEPT, reviveToday);
    const own = !!decoded && sentHere(decoded, kept?.s ? { day: kept.d, pairId: kept.p, name: kept.s.n, side: kept.s.a, reply: kept.s.r === 1 } : null);
    // The tab's own first link opens as the tab left it, the answer marked sent: never a reveal against itself.
    const link = own && !decoded.to ? null : decoded;
    const next: View = decoded ? { day: decoded.day, pair: decoded.pair, link, broken: false, own } : { day: now, pair: dailyPair(now), link: null, broken: asked, own: false };
    const names = rememberedNames();
    setToday(now);
    setView(next);
    const restored = kept && kept.d === next.day && kept.p === next.pair.id && !link?.to ? kept.a : null;
    setMine(restored);
    // A link went out for this answer before (the tab's own link opened again, or a reload after
    // sending): it is still sent. Changed since: the link carries the old answer, so it must go again.
    const wentOut = restored !== null && !!kept?.s;
    setSent(wentOut && restored === kept?.s?.a);
    setChanged(wentOut && restored !== kept?.s?.a);
    setCopied(false);
    setReady(true);
    if (names) setName(names[0]);
    if (counted.current !== hash) {
      counted.current = hash;
      // The tab's own link: nothing new happened, so nothing is counted.
      if (!own) {
        track(link ? "daily_opened_shared" : "daily_seen");
        if (link?.to) track("daily_revealed", { match: link.from.side === link.to.side });
        // This tab answered the same pair before the link came: the reveal shows at once, and counts.
        else if (link && restored !== null) track("daily_revealed", { match: link.from.side === restored });
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
  const phase: Phase = link?.to ? "reveal" : link ? (mine === null ? "invited" : "reveal") : mine === null ? "ask" : sent ? "sent" : "answered";

  useEffect(() => {
    if (phase !== "reveal" || !focusReveal.current) return;
    focusReveal.current = false;
    revealHeading.current?.focus();
  }, [phase]);

  // After the first tap on a phone the name field, the send button and its status come up into view
  // (they stood under the bottom edge). Only as far as needed; a desk has them on screen already.
  useEffect(() => {
    if (phase !== "answered" || !showForm.current) return;
    showForm.current = false;
    if (!window.matchMedia("(max-width: 1023.98px)").matches) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    statusLine.current?.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
  }, [phase]);

  const who = (n: string) => n || tl("someone");

  // The two answers are a radio pair: one tab stop, and the arrows move to the other answer and pick it.
  const answerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const arrow = (e: KeyboardEvent<HTMLButtonElement>, side: Side) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const other: Side = side === 0 ? 1 : 0;
    answerRefs.current[other]?.focus();
    choose(other);
  };

  const choose = (side: Side) => {
    // Until the address is read the cards may still be the server's day: a tap then would answer the wrong pair.
    if (!ready || phase === "reveal" || side === mine) return;
    if (mine === null) track("daily_answered");
    if (mine === null && phase === "ask") showForm.current = true;
    if (phase === "invited" && link) {
      track("daily_revealed", { match: side === link.from.side });
      focusReveal.current = true;
    }
    if (sent) {
      setSent(false);
      setChanged(true);
    }
    // "Link copied" would hide that the link already sent is now out of date.
    window.clearTimeout(copiedTimer.current);
    setCopied(false);
    setMine(side);
    const kept = readSaved(tabStorage(), KEPT, reviveToday);
    const s = kept && kept.d === view.day && kept.p === view.pair.id ? kept.s : undefined;
    writeSaved(tabStorage(), KEPT, { d: view.day, p: view.pair.id, a: side, ...(s ? { s } : {}) });
  };

  /** A link went out: remember what it carried, so opening it again here is known as the tab's own. */
  const markSent = () => {
    const side = mine ?? 0;
    writeSaved(tabStorage(), KEPT, { d: view.day, p: view.pair.id, a: side, s: { n: cleanName(name), a: side, ...(link && !link.to ? { r: 1 as const } : {}) } });
    setSent(true);
    setChanged(false);
    setView((v) => (v.own ? { ...v, own: false } : v));
  };

  const url = () =>
    window.location.origin +
    window.location.pathname +
    encodeDaily({ day: view.day, pairId: view.pair.id, from: { name, side: mine ?? 0 }, to: link && !link.to ? link.from : undefined });

  const copy = async () => {
    // On a desk the send block stands under the question before an answer is picked: nothing to send yet.
    if (mine === null) return;
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
      track("daily_shared", { how: "copy" });
      markSent();
    } catch {
      window.prompt(t("copyFallback"), url());
    }
  };

  const share = async () => {
    if (mine === null) return;
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
    track("daily_shared", { how: "share" });
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

  const backToToday = () => {
    window.history.replaceState(window.history.state, "", window.location.pathname);
    read();
  };

  const words = (side: Side) => (side === 0 ? view.pair.a : view.pair.b)[locale];
  const notToday = view.day !== today || view.pair.id !== dailyPair(today).id;
  // A pair from another day says which day, where today's says it is the day's.
  // In the reader's own order of day and month where the browser says it (24 November, or November 24).
  const dateLocale = notToday && navigator.language?.toLowerCase().startsWith(locale) ? navigator.language : locale;
  const date = notToday ? new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(view.day * DAY_MS)) : "";
  // The page's heading and line above say "today": with another day's pair they say that day instead.
  useEffect(() => {
    setOldDay(notToday);
    return () => setOldDay(false);
  }, [notToday]);

  // In a reveal: whose answer is which. The other person on the left, the reader ("You") on the right,
  // both ways round: a reply's `to` is the reader's own answer, unless the reader sent that reply.
  const reveal: { left: { name: string; side: Side }; right: { name: string; side: Side } } | null =
    phase !== "reveal" || !link
      ? null
      : link.to
        ? view.own
          ? { left: { name: who(link.to.name), side: link.to.side }, right: { name: t("you"), side: link.from.side } }
          : { left: { name: who(link.from.name), side: link.from.side }, right: { name: t("you"), side: link.to.side } }
        : { left: { name: who(link.from.name), side: link.from.side }, right: { name: t("you"), side: mine ?? 0 } };
  const match = reveal ? reveal.left.side === reveal.right.side : false;
  const label =
    phase === "invited" && link
      ? notToday
        ? t("fromOn", { name: who(link.from.name), date })
        : t("from", { name: who(link.from.name) })
      : phase === "reveal"
        ? notToday
          ? t("bothOn", { date })
          : t("both")
        : notToday
          ? t("on", { date })
          : t("daily");
  // In a reveal there is one thing to do with the link at a time: send yours back, and once it has
  // gone (or when there is nothing to send) the way on to today's question.
  const canSend = phase === "answered" || phase === "sent" || (phase === "reveal" && !link?.to && !sent);
  // On a desk the send block already stands, waiting, under the question it will send: the space
  // kept for it was an empty band of cream there, and nothing moves when an answer is picked.
  const waiting = phase === "ask";
  const status = changed ? t("resend") : copied ? t("copied") : sent ? (view.own ? t("own") : link && !link.to ? t("sentBack", { name: who(link.from.name) }) : t("sent")) : "";

  return (
    <div data-today data-day={view.day} data-phase={phase} data-ready={ready || undefined} aria-busy={ready ? undefined : true} className="group/today min-h-[27rem] sm:min-h-[28rem] lg:min-h-[26.25rem]">
      <p className="text-page-label text-page-body">{label}</p>
      {view.broken && phase === "ask" ? <p className="mt-3 text-[0.9375rem] text-page-body">{t("broken")}</p> : null}
      {phase === "invited" && link ? <p className="mt-3 text-[0.9375rem] text-page-body">{t("invited", { name: who(link.from.name) })}</p> : null}

      {reveal ? (
        <h2 ref={revealHeading} tabIndex={-1} className="mt-3 font-display text-[1.75rem] leading-tight text-page-ink outline-none sm:text-[2rem]">
          {t(match ? "match" : "clash")}
        </h2>
      ) : (
        <h2 id="today-question" className={cn("mt-3 font-display text-[1.75rem] leading-tight text-page-ink sm:text-[2rem]", "[@media(orientation:portrait)_and_(max-height:600px)]:mt-2 [@media(orientation:portrait)_and_(max-height:600px)]:text-[1.5rem] [@media(orientation:landscape)_and_(max-height:520px)]:mt-2 [@media(orientation:landscape)_and_(max-height:520px)]:text-[1.375rem]")}>
          {t("prompt")}
        </h2>
      )}

      {reveal ? (
        <ul aria-label={t("answers")} className="relative mt-6 grid grid-cols-2 gap-3 sm:gap-4">
          {[reveal.left, reveal.right].map((who, i) => (
            // The name at the top under the corner, so the two names stand level however the answers wrap.
            <li key={i} data-reveal-card data-answer data-side={who.side === 0 ? "a" : "b"} className={cn(CARD, "justify-start px-4 sm:px-6")}>
              <Corner side={who.side} />
              <span className="block truncate text-page-label text-page-body">
                {who.name}
                <span className="sr-only">:</span>
              </span>
              <span className="mt-2 font-display text-[1.25rem] leading-snug text-page-ink sm:text-[1.625rem]">{words(who.side)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div role="radiogroup" aria-labelledby="today-question" className="relative mt-6 grid gap-4 sm:grid-cols-2 [@media(orientation:portrait)_and_(max-height:600px)]:mt-4 [@media(orientation:portrait)_and_(max-height:600px)]:gap-3 [@media(orientation:landscape)_and_(max-height:520px)]:mt-3">
          {([0, 1] as const).map((side) => (
            <button
              key={side}
              ref={(el) => {
                answerRefs.current[side] = el;
              }}
              type="button"
              role="radio"
              data-answer
              data-side={side === 0 ? "a" : "b"}
              aria-checked={mine === side}
              aria-disabled={ready ? undefined : true}
              tabIndex={(mine ?? 0) === side ? 0 : -1}
              onClick={() => choose(side)}
              onKeyDown={(e) => arrow(e, side)}
              className={cn(
                CARD,
                "cursor-pointer hover:border-page-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-px aria-checked:border-page-accent aria-checked:ring-2 aria-checked:ring-page-accent",
                // Still loading a second after it was drawn (a slow phone): the cards dim, so a tap that does nothing yet is not a surprise.
                "group-not-data-ready/today:cursor-progress group-not-data-ready/today:animate-[today-wait_0.3s_ease-out_1s_both]",
              )}
            >
              <Corner side={side} />
              {/* The side not taken dims its words only: the corner letter keeps its contrast. */}
              <span
                className={cn(
                  "font-display text-[1.375rem] leading-snug text-page-ink transition-opacity sm:text-[1.625rem] motion-reduce:transition-none [@media(orientation:portrait)_and_(max-height:600px)]:text-[1.25rem] [@media(orientation:landscape)_and_(max-height:520px)]:text-[1.125rem]",
                  mine !== null && mine !== side && "opacity-60 group-hover:opacity-90",
                )}
              >
                {words(side)}
              </span>
            </button>
          ))}
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 z-10 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-page-ground font-display text-base text-page-ink italic ring-1 ring-page-line">
            {t("or")}
          </span>
        </div>
      )}

      {/* Once sent, the hint goes (a change then asks for the link to go again, in the status) but its line stays, so the form does not move under the thumb. */}
      {phase === "answered" || phase === "sent" || waiting ? (
        <p className={cn("mt-3 min-h-5 text-[0.875rem] text-page-body lg:mt-2", waiting && "max-lg:hidden")}>{phase === "answered" && !changed ? t("change") : ""}</p>
      ) : null}

      {canSend || waiting ? (
        <form
          data-send-block
          onSubmit={(e) => {
            e.preventDefault();
            void share();
          }}
          className={cn("mt-6 flex flex-wrap items-end gap-3 lg:mt-4", waiting && "max-lg:hidden")}
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
          <Link href="/games/would-you-rather" data-whole-game onClick={plainWhenOffline} className={canSend ? SECOND : PRIMARY}>
            {t("wholeGame")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          {notToday && !canSend ? (
            <button type="button" data-todays onClick={backToToday} className={SECOND}>
              {t("todays")}
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

/** The card's corner: A with the room's heart, B with its spade. */
function Corner({ side }: { side: Side }) {
  return (
    <span aria-hidden="true" className="absolute top-4 left-5 flex items-center gap-1.5 text-page-label text-page-body">
      {side === 0 ? "A" : "B"}
      <Suit suit={side === 0 ? "heart" : "spade"} className={cn("size-3", side === 0 ? "fill-page-accent" : "fill-page-ink")} />
    </span>
  );
}
