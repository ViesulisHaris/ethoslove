"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Loader2, Share2, Smartphone, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getPathname, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { makeRoomCode, parseRoomCode, type Entry, type Mode, type Session } from "@/lib/games/room";
import { PlayingCard } from "./cards";
import { isInApp, shareLink } from "@/lib/app/bridge";
import { ScreenTop } from "./screen-top";
import type { useRoom } from "./use-room";

export type { Entry, Mode, Session };

const NAMES_KEY = "ethos.games.names";
/** How long a guest waits for the room's maker before being told the room may be gone. */
const NO_HOST_MS = 8000;
const input = "h-12 w-full rounded-2xl border border-forest/15 bg-white px-4 text-[16px] text-forest outline-none placeholder:text-forest/40 focus:border-rose/50 focus:shadow-[0_0_0_4px_rgba(214,51,108,0.12)]";
const quiet = "h-12 rounded-full px-4 text-[14px] font-semibold text-forest/65 hover:bg-forest/5";

/** `setup` is for whoever deals (a pack to play, say): it is not shown to a guest joining a room. */
type Props = { title: string; blurb: string; art: ReactNode; room: ReturnType<typeof useRoom>; entry: Entry | null; onEnter: (entry: Entry | null) => void; onStart: (session: Session) => void; onePhoneOnly?: boolean; setup?: ReactNode; children?: ReactNode };

/**
 * The door to every game, on the table: two names for one phone, or a room for two. A room is
 * four letters and a link; whoever opens the link is the guest, and a third person who opens it
 * is told the room is full.
 */
export function Lobby({ title, blurb, art, room, entry, onEnter, onStart, onePhoneOnly = false, setup, children }: Props) {
  const t = useTranslations("games.lobby");
  const [picked, setMode] = useState<Mode | null>(onePhoneOnly ? "one" : null);
  const [names, setNames] = useState<[string, string]>(["", ""]);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // The host started with somebody else: this phone is the third on the link.
  const [taken, setTaken] = useState(false);
  // Nobody enters a room until they have pressed the button beside their name, even when the name
  // is remembered: a guest on a shared laptop should not join as somebody else.
  const entered = entry !== null;
  // A room this tab went back into after a reload arrives as `entry`, before anything was picked here.
  const mode: Mode | null = entered ? "two" : picked;
  const host = entry ? entry.host : joinCode === null;
  const roomCode = entry?.code ?? joinCode ?? code;

  useEffect(() => {
    // A frame after mount: the page is rendered on the server without a room or names, and reading
    // them here rather than during render keeps the first client render identical to the server's.
    const frame = requestAnimationFrame(() => {
      const params = new URL(window.location.href).searchParams;
      const wanted = parseRoomCode(params.get("room"));
      if (wanted && !onePhoneOnly) {
        setJoinCode(wanted);
        setMode("two");
      } else if (params.get("mode") === "two" && !onePhoneOnly) {
        // A guest at the end of somebody else's game, asked to start their own room. Taken out of
        // the address once read: left there, it would also say "nothing old" to the reload that
        // should bring this phone back into the room it is about to make.
        setMode("two");
        window.history.replaceState(window.history.state, "", window.location.pathname);
      }
      try {
        const saved = JSON.parse(window.localStorage.getItem(NAMES_KEY) ?? "null") as [string, string] | null;
        if (Array.isArray(saved) && saved.length === 2) setNames([String(saved[0]).slice(0, 24), String(saved[1]).slice(0, 24)]);
      } catch {
        // No names remembered.
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [onePhoneOnly]);

  const remember = (next: [string, string]) => {
    setNames(next);
    try {
      window.localStorage.setItem(NAMES_KEY, JSON.stringify(next));
    } catch {
      // Fine.
    }
  };

  // The address as it is in the bar, /es and all, so the other phone opens the room in the language it was made in.
  const link = () => `${window.location.origin}${window.location.pathname}?room=${roomCode ?? ""}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t("copyFallback"), link());
    }
  };
  const share = async () => {
    // Inside the iPhone app, its own share sheet (lib/app/bridge.ts); in a browser, the browser's.
    if (!isInApp() && !navigator.share) return copy();
    if (!(await shareLink({ title, text: t("shareText", { name: entry?.name || names[0] || t("someone") }), url: link() }))) return copy();
  };

  const others = room.peers.filter((p) => p.id !== room.me);
  const hostPeer = others.find((p) => p.host);
  const hostHere = hostPeer !== undefined;
  // A guest on a link whose room nobody is in (the host closed the tab, or it's an old link): after
  // a while, say so and offer a room of their own. The channel stays open, so a host who comes back
  // still turns this into "is here".
  const [noHost, setNoHost] = useState(false);
  const lonely = entered && !host && !hostHere && room.status === "open";
  useEffect(() => {
    if (!lonely) {
      const frame = requestAnimationFrame(() => setNoHost(false));
      return () => cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(() => setNoHost(true), NO_HOST_MS);
    return () => window.clearTimeout(timer);
  }, [lonely]);

  /** Out of the room, before any game: the host closes it, a guest stops waiting. A guest's link is forgotten, so the lobby offers a room of their own. */
  const leave = (then: Mode | null = "two") => {
    onEnter(null);
    setTaken(false);
    setCode(null);
    setMode(then);
    if (joinCode) {
      setJoinCode(null);
      window.history.replaceState(window.history.state, "", window.location.pathname);
    }
  };
  // Peers come sorted by arrival, so this is the first guest in — the same one on every phone.
  // A second guest (the link opened twice, a friend being nosy) is told the room is full.
  const seated = room.peers.find((p) => !p.host);
  const guestPeer = host && seated?.id !== room.me ? seated : undefined;
  const full = !host && (taken || (seated !== undefined && seated.id !== room.me));
  const ready = mode === "two" && room.status === "open" && !full && Boolean(host ? guestPeer : hostPeer);

  return (
    // As far down on a phone as anywhere: the tour's "How it works" button floats top right under
    // the header, and a title that fills the first line ("¿Cuánto me conoces?") ran into it.
    <section className="container-x grid items-center gap-10 pt-14 pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16 lg:pb-24">
      <div>
        <h1 className="display-xl text-cream">{title}</h1>
        <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-cream/70">{blurb}</p>
        {children}
        {host ? setup : null}

        {mode === null ? (
          <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-2" data-tour="mode">
            {(["one", "two"] as const).map((m, i) => {
              const Icon = m === "one" ? Users : Smartphone;
              return (
                <button key={m} type="button" onClick={() => setMode(m)} className="group block rounded-[20px] text-left" data-tour={m === "two" ? "room" : undefined}>
                  <PlayingCard rank={String(i + 1)} suit={i === 0 ? "heart" : "diamond"} className="transition-transform duration-300 ease-(--ease-out-quint) group-hover:-translate-y-1.5" faceClassName="min-h-[190px] px-6 pt-12 pb-6">
                    <Icon aria-hidden="true" className="size-6 text-rose-deep" />
                    <span className="mt-3 block font-display text-[23px] leading-tight">{t(`${m}.title`)}</span>
                    <span className="mt-1.5 block text-[14px] leading-snug text-forest/65">{t(`${m}.blurb`)}</span>
                  </PlayingCard>
                </button>
              );
            })}
          </div>
        ) : null}

        {mode === "one" ? (
          <PlayingCard className="mt-8 max-w-xl" faceClassName="p-6 sm:p-7">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (names[0].trim() && names[1].trim()) onStart({ mode: "one", code: null, host: true, names: [names[0].trim(), names[1].trim()], peer: null });
              }}
            >
              <p className="font-display text-[22px]">{t("one.who")}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <input key={i} value={names[i]} maxLength={24} required placeholder={t(i === 0 ? "you" : "them")} aria-label={t(i === 0 ? "you" : "them")} onChange={(e) => remember(i === 0 ? [e.target.value, names[1]] : [names[0], e.target.value])} className={input} />
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button type="submit" className="btn-rose h-12 rounded-full px-7 text-[15px] font-semibold">
                  {t("start")}
                </button>
                {!onePhoneOnly ? (
                  <button type="button" onClick={() => setMode(null)} className={quiet}>
                    {t("back")}
                  </button>
                ) : null}
              </div>
            </form>
          </PlayingCard>
        ) : null}

        {/* The room takes the name form's place, and on a phone the form had been scrolled up to
            reach its button: the code, the thing read out across the table, came in half under
            the header. Above the card's margin, so the whole card comes into view. */}
        {entry ? <ScreenTop screen={`room:${entry.code}`} /> : null}
        {mode === "two" ? (
          <PlayingCard className="mt-8 max-w-xl" faceClassName="p-6 sm:p-7">
            {!entered ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!names[0].trim()) return;
                  const fresh = host && !code ? makeRoomCode() : null;
                  if (fresh) setCode(fresh);
                  onEnter({ code: joinCode ?? fresh ?? code ?? makeRoomCode(), name: names[0].trim(), host });
                }}
              >
                <p className="font-display text-[22px]">{joinCode ? t("two.joining", { code: joinCode }) : t("two.yourName")}</p>
                <input value={names[0]} maxLength={24} required placeholder={t("you")} aria-label={t("you")} onChange={(e) => remember([e.target.value, names[1]])} className={cn(input, "mt-3")} />
                <div className="mt-4 flex items-center gap-2">
                  <button type="submit" className="btn-rose h-12 rounded-full px-7 text-[15px] font-semibold">
                    {joinCode ? t("two.join") : t("two.create")}
                  </button>
                  {/* A guest can step back too: the link might be old, or they'd rather play on one phone. */}
                  <button type="button" onClick={() => (joinCode ? leave(null) : setMode(null))} className={quiet}>
                    {t("back")}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <p className="text-eyebrow text-rose-deep">{t("two.room")}</p>
                <p className="mt-2 font-display text-[48px] leading-none tracking-[0.2em]" aria-label={t("two.codeLabel", { code: entry?.code ?? "" })}>
                  {entry?.code}
                </p>
                {host ? (
                  <>
                    <p className="mt-3 text-[14.5px] leading-relaxed text-forest/70">{t("two.sendIt")}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={share} className="btn-rose inline-flex h-12 items-center justify-center gap-2 rounded-full text-[14.5px] font-semibold">
                        <Share2 aria-hidden="true" className="size-4" />
                        {t("two.share")}
                      </button>
                      <button type="button" onClick={copy} className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-full border text-[14.5px] font-semibold", copied ? "border-moss/30 bg-moss-soft text-moss" : "border-forest/15 text-forest hover:bg-forest/5")}>
                        {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                        {copied ? t("two.copied") : t("two.copy")}
                      </button>
                    </div>
                  </>
                ) : null}
                <p role="status" className="mt-4 flex items-center gap-2 text-[14.5px] text-forest/75">
                  {room.status === "failed" ? (
                    t("two.failed")
                  ) : full ? (
                    t("two.full")
                  ) : noHost && !ready ? (
                    t("two.noHost")
                  ) : ready ? (
                    <>
                      <Check aria-hidden="true" className="size-4 text-moss" />
                      {t("two.here", { name: (host ? guestPeer : hostPeer)?.name || t("someone") })}
                    </>
                  ) : (
                    <>
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                      {room.status !== "open" ? t("two.connecting") : host ? t("two.waiting") : t("two.waitingHost")}
                    </>
                  )}
                </p>
                {ready && host && guestPeer ? (
                  <button type="button" onClick={() => onStart({ mode: "two", code: entry?.code ?? null, host: true, names: [entry?.name ?? names[0].trim(), guestPeer.name || t("someone")], peer: guestPeer.id })} className="btn-rose mt-4 h-12 rounded-full px-7 text-[15px] font-semibold">
                    {t("start")}
                  </button>
                ) : null}
                {ready && !host && hostPeer ? (
                  <>
                    <p className="mt-3 text-[13.5px] text-forest/55">{t("two.hostStarts", { name: hostPeer.name || t("someone") })}</p>
                    <GuestAutoStart room={room} hostId={hostPeer.id} onTaken={() => setTaken(true)} onStart={(first) => onStart({ mode: "two", code: entry?.code ?? null, host: false, names: [hostPeer.name || t("someone"), entry?.name ?? names[0].trim()], peer: hostPeer.id, first })} />
                  </>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {(noHost && !ready) || full || room.status === "failed" ? (
                    <button type="button" onClick={() => leave("two")} className="btn-rose h-12 rounded-full px-7 text-[15px] font-semibold">
                      {t("two.makeOwn")}
                    </button>
                  ) : null}
                  <button type="button" onClick={() => leave(onePhoneOnly ? "one" : null)} className={quiet}>
                    {host ? t("two.cancel") : t("two.leave")}
                  </button>
                </div>
              </div>
            )}
          </PlayingCard>
        ) : null}
        {/* About rooms, so not under a game that never opens one (Memory, Truth or dare, the wheel). */}
        {!onePhoneOnly ? <p className="mt-6 max-w-xl text-[12.5px] leading-snug text-cream/45">{t("privacy")}</p> : null}
      </div>
      <div className="relative mx-auto w-full max-w-[420px]">{art}</div>
    </section>
  );
}

/**
 * The guest's game begins when the host's first state arrives, addressed to this phone. It says
 * hello every so often in the meantime, so a start the guest missed (the host pressed it a moment
 * too soon) is sent again. A state addressed to someone else means the host started without us.
 * The state itself goes into the game, which opens on it rather than asking the host again.
 */
function GuestAutoStart({ room, hostId, onStart, onTaken }: { room: ReturnType<typeof useRoom>; hostId: string; onStart: (first: unknown) => void; onTaken: () => void }) {
  const startRef = useRef(onStart);
  const takenRef = useRef(onTaken);
  useEffect(() => {
    startRef.current = onStart;
    takenRef.current = onTaken;
  });
  const { on, send, me } = room;
  useEffect(() => {
    const off = on("state", (payload, from) => {
      if (from !== hostId) return;
      const to = (payload as { to?: unknown } | null)?.to;
      if (to === me) startRef.current(payload);
      else if (typeof to === "string") takenRef.current();
    });
    send("hello", null);
    const timer = window.setInterval(() => send("hello", null), 1500);
    return () => {
      off();
      window.clearInterval(timer);
    };
  }, [on, send, me, hostId]);
  return null;
}

/**
 * On two phones, when the other one goes quiet for a few seconds: say so, and keep the game where
 * it is. When it left on purpose (`closed`: "change players" over there), there is nothing to wait
 * for: say that instead, with the way to a room of one's own.
 */
export function PeerGone({ session, room, closed = false, onLeave }: { session: Session; room: ReturnType<typeof useRoom>; closed?: boolean; onLeave?: () => void }) {
  const t = useTranslations("games.lobby");
  const locale = useLocale();
  const pathname = usePathname();
  const present = session.mode !== "two" || room.peers.some((p) => p.id === session.peer);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (present) {
      const frame = requestAnimationFrame(() => setGone(false));
      return () => cancelAnimationFrame(frame);
    }
    const timer = window.setTimeout(() => setGone(true), 3500);
    return () => window.clearTimeout(timer);
  }, [present]);
  const name = session.names[session.host ? 1 : 0];
  if (closed) {
    // A plain link, as at the end of a game: a fresh load leaves this room for good.
    const ownRoom = getPathname({ href: { pathname, query: { mode: "two" } }, locale });
    return (
      <div role="status" className="mx-auto mb-6 flex max-w-xl flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-white/10 px-4 py-3 text-left text-[14px] text-cream ring-1 ring-white/15">
        <p>{t("closed", { name })}</p>
        <a href={ownRoom} className="inline-flex h-11 shrink-0 items-center rounded-full bg-cream px-5 text-[14px] font-semibold text-forest hover:bg-white">
          {t("closedCta")}
        </a>
      </div>
    );
  }
  if (!gone || present) return null;
  return (
    <div role="status" className="mx-auto mb-6 flex max-w-xl flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl bg-white/10 px-4 py-3 text-left text-[14px] text-cream ring-1 ring-white/15">
      <p className="flex items-center gap-2">
        <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin" />
        {t("left", { name })}
      </p>
      {/* Waiting is the default, since they usually come back; this is for when they won't. */}
      {onLeave ? (
        <button type="button" onClick={onLeave} className="h-11 shrink-0 rounded-full px-4 text-[14px] font-semibold text-cream/75 underline-offset-4 hover:text-cream hover:underline">
          {t("two.leave")}
        </button>
      ) : null}
    </div>
  );
}
