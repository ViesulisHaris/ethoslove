"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Gift } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import { isInApp, shareLink } from "@/lib/app/bridge";
import type { RatherPair } from "@/lib/games/content";
import { cleanName, dailyPair, dayOf, decodeDaily, encodeDaily, type DailyLink } from "@/lib/games/daily";
import { readSaved, savedKey, tabStorage, writeSaved } from "@/lib/games/saved";
import { cn } from "@/lib/utils";
import { Suit } from "../cards";
import { NAMES_KEY } from "../lobby";

type Side = 0 | 1;
type View = { day: number; pair: RatherPair; link: DailyLink | null; broken: boolean };
type Phase = "ask" | "invited" | "answered" | "sent" | "reveal";

/** This tab's own answer to a day's pair, so a reload keeps it. sessionStorage: it never leaves the tab. */
type Kept = { d: number; p: string; a: Side };
const KEPT = savedKey("today", "play");
function reviveToday(raw: unknown): Kept | null {
  if (!raw || typeof raw !== "object") return null;
  const { d, p, a } = raw as Record<string, unknown>;
  return typeof d === "number" && Number.isInteger(d) && typeof p === "string" && (a === 0 || a === 1) ? { d, p, a } : null;
}

function rememberedNames(): [string, string] | null {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(NAMES_KEY) ?? "null");
    return Array.isArray(saved) && saved.length === 2 ? [cleanName(saved[0]), cleanName(saved[1])] : null;
  } catch {
    return null;
  }
}

const CARD =
  "group relative flex min-h-28 w-full flex-col justify-end rounded-[1.25rem] border border-page-line bg-page-raised px-5 pt-11 pb-5 text-left shadow-page-card transition-[border-color,opacity,translate] duration-200 sm:min-h-44 sm:px-6 sm:pb-6 motion-reduce:transition-none";
const PRIMARY =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-page-accent px-7 text-[0.9375rem] font-semibold text-page-on-accent transition-colors hover:bg-page-accent-hover active:translate-y-px disabled:opacity-60 motion-reduce:transition-none";
const SECOND =
  "inline-flex h-12 items-center justify-center rounded-full border border-page-ink/25 px-6 text-[0.9375rem] font-medium text-page-ink transition-colors hover:border-page-ink active:translate-y-px disabled:opacity-60 motion-reduce:transition-none";

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

  const [view, setView] = useState<View>(() => ({ day, pair: dailyPair(day), link: null, broken: false }));
  const [mine, setMine] = useState<Side | null>(null);
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);
  const [today, setToday] = useState(day);
  // Set once the address has been read: the tests wait for it, and nothing is drawn differently.
  const [ready, setReady] = useState(false);
  const counted = useRef<string | null>(null);
  const revealHeading = useRef<HTMLHeadingElement>(null);
  const focusReveal = useRef(false);

  const read = useCallback(() => {
    const now = dayOf(Date.now());
    const hash = window.location.hash;
    const asked = hash.startsWith("#q=");
    const link = asked ? decodeDaily(hash, now) : null;
    const next: View = link ? { day: link.day, pair: link.pair, link, broken: false } : { day: now, pair: dailyPair(now), link: null, broken: asked };
    const kept = readSaved(tabStorage(), KEPT, reviveToday);
    const names = rememberedNames();
    setToday(now);
    setView(next);
    setMine(kept && kept.d === next.day && kept.p === next.pair.id && !link?.to ? kept.a : null);
    setSent(false);
    setReady(true);
    if (names) setName(names[0]);
    if (counted.current !== hash) {
      counted.current = hash;
      track(link ? "daily_opened_shared" : "daily_seen");
      if (link?.to) track("daily_revealed", { match: link.from.side === link.to.side });
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

  const { link } = view;
  const phase: Phase = link?.to ? "reveal" : link ? (mine === null ? "invited" : "reveal") : mine === null ? "ask" : sent ? "sent" : "answered";

  useEffect(() => {
    if (phase !== "reveal" || !focusReveal.current) return;
    focusReveal.current = false;
    revealHeading.current?.focus();
  }, [phase]);

  const who = (n: string) => n || tl("someone");

  const choose = (side: Side) => {
    if (phase === "reveal") return;
    if (mine === null) track("daily_answered");
    if (phase === "invited" && link) {
      track("daily_revealed", { match: side === link.from.side });
      focusReveal.current = true;
    }
    setMine(side);
    writeSaved(tabStorage(), KEPT, { d: view.day, p: view.pair.id, a: side });
  };

  const url = () =>
    window.location.origin +
    window.location.pathname +
    encodeDaily({ day: view.day, pairId: view.pair.id, from: { name, side: mine ?? 0 }, to: link && !link.to ? link.from : undefined });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      track("daily_shared", { how: "copy" });
      setSent(true);
    } catch {
      window.prompt(t("copyFallback"), url());
    }
  };

  const share = async () => {
    const payload = { title: t("shareTitle"), text: t(link ? "shareBackText" : "shareText", { name: who(name) }), url: url() };
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
    setSent(true);
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
  const label = phase === "invited" && link ? t("from", { name: who(link.from.name) }) : t("daily");

  // In a reveal: whose answer is which. A reply shows the replier's answer to the first person.
  const reveal: { left: { name: string; side: Side }; right: { name: string; side: Side } } | null =
    phase !== "reveal" || !link
      ? null
      : link.to
        ? { left: { name: who(link.to.name), side: link.to.side }, right: { name: who(link.from.name), side: link.from.side } }
        : { left: { name: who(link.from.name), side: link.from.side }, right: { name: t("you"), side: mine ?? 0 } };
  const match = reveal ? reveal.left.side === reveal.right.side : false;
  const canSend = phase === "answered" || phase === "sent" || (phase === "reveal" && !link?.to);
  const status = copied ? t("copied") : sent ? (link && !link.to ? t("sentBack", { name: who(link.from.name) }) : t("sent")) : "";
  const notToday = view.day !== today || view.pair.id !== dailyPair(today).id;

  return (
    <div data-today data-day={view.day} data-phase={phase} data-ready={ready || undefined} className="min-h-[27rem] sm:min-h-[28rem]">
      <p className="text-page-label text-page-body">{label}</p>
      {view.broken && phase === "ask" ? <p className="mt-3 text-[0.9375rem] text-page-body">{t("broken")}</p> : null}
      {phase === "invited" && link ? <p className="mt-3 text-[0.9375rem] text-page-body">{t("invited", { name: who(link.from.name) })}</p> : null}

      {reveal ? (
        <h2 ref={revealHeading} tabIndex={-1} className="mt-3 font-display text-[1.75rem] leading-tight text-page-ink outline-none sm:text-[2rem]">
          {t(match ? "match" : "clash")}
        </h2>
      ) : (
        <h2 id="today-question" className="mt-3 font-display text-[1.75rem] leading-tight text-page-ink sm:text-[2rem]">
          {t("prompt")}
        </h2>
      )}

      {reveal ? (
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:gap-4">
          {[reveal.left, reveal.right].map((who, i) => (
            <div key={i} data-reveal-card data-answer data-side={who.side === 0 ? "a" : "b"} className={cn(CARD, "px-4 sm:px-6")}>
              <Corner side={who.side} />
              <span className="block truncate text-page-label text-page-body">{who.name}</span>
              <span className="mt-2 font-display text-[1.25rem] leading-snug text-page-ink sm:text-[1.625rem]">{words(who.side)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative mt-6 grid gap-4 sm:grid-cols-2">
          {([0, 1] as const).map((side) => (
            <button
              key={side}
              type="button"
              data-answer
              data-side={side === 0 ? "a" : "b"}
              aria-pressed={mine === side}
              onClick={() => choose(side)}
              className={cn(
                CARD,
                "cursor-pointer hover:border-page-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-px aria-pressed:border-page-accent aria-pressed:ring-2 aria-pressed:ring-page-accent",
                mine !== null && mine !== side && "opacity-60 hover:opacity-90",
              )}
            >
              <Corner side={side} />
              <span className="font-display text-[1.375rem] leading-snug text-page-ink sm:text-[1.625rem]">{words(side)}</span>
            </button>
          ))}
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 z-10 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-page-ground font-display text-base text-page-ink italic ring-1 ring-page-line">
            {t("or")}
          </span>
        </div>
      )}

      {phase === "answered" || phase === "sent" ? <p className="mt-3 text-[0.875rem] text-page-body">{t("change")}</p> : null}

      {canSend ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void share();
          }}
          className="mt-6 flex flex-wrap items-end gap-3"
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
          <button type="submit" data-send className={PRIMARY}>
            {link ? t("sendBack") : t("send")}
          </button>
          <button type="button" data-copy onClick={() => void copy()} className={SECOND}>
            {t("copy")}
          </button>
        </form>
      ) : null}

      <p role="status" aria-live="polite" className="mt-4 min-h-6 text-[0.9375rem] text-page-body">
        {status}
      </p>

      {phase === "reveal" ? (
        <After>
          <Link href="/games/rather" data-whole-game className={PRIMARY}>
            {t("wholeGame")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          {notToday ? (
            <button type="button" data-todays onClick={backToToday} className={SECOND}>
              {t("todays")}
            </button>
          ) : null}
          {/* The same two lines and the same address the end of every game uses. Inside the iPhone app the gifts are a tab of their own. */}
          <Link href="/templates?ref=game-end" data-app-hide className="group mt-2 flex w-full items-center gap-4 rounded-[1.25rem] border border-page-line bg-page-raised p-5 shadow-page-card transition-colors hover:border-page-ink/40">
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
