"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Loader2, Share2, Smartphone, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { makeRoomCode, parseRoomCode } from "@/lib/games/room";
import { PlayingCard } from "./cards";
import { useRoom } from "./use-room";

export type Mode = "one" | "two";
/** `names` is always [player 0, player 1]: on two phones the host is player 0. `peer` is the other phone. */
export type Session = { mode: Mode; code: string | null; host: boolean; names: [string, string]; peer: string | null };
export type Entry = { code: string; name: string; host: boolean };

const NAMES_KEY = "ethos.games.names";
const input = "h-12 w-full rounded-2xl border border-forest/15 bg-white px-4 text-[16px] text-forest outline-none placeholder:text-forest/40 focus:border-rose/50 focus:shadow-[0_0_0_4px_rgba(214,51,108,0.12)]";

/**
 * The room lives in the game, not in the lobby: the lobby leaves the screen when the game starts,
 * and the connection has to stay. A game calls this once and hands `room` to both.
 */
export function useGameRoom() {
  const [entry, setEntry] = useState<Entry | null>(null);
  const room = useRoom(entry?.code ?? null, entry?.name ?? "", entry?.host ?? true);
  return { room, entry, setEntry };
}

type Props = { title: string; blurb: string; art: ReactNode; room: ReturnType<typeof useRoom>; entry: Entry | null; onEnter: (entry: Entry | null) => void; onStart: (session: Session) => void; onePhoneOnly?: boolean; children?: ReactNode };

/**
 * The door to every game, on the table: two names for one phone, or a room for two. A room is
 * four letters and a link; whoever opens the link is the guest, and a third person who opens it
 * is told the room is full.
 */
export function Lobby({ title, blurb, art, room, entry, onEnter, onStart, onePhoneOnly = false, children }: Props) {
  const t = useTranslations("games.lobby");
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode | null>(onePhoneOnly ? "one" : null);
  const [names, setNames] = useState<[string, string]>(["", ""]);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // The host started with somebody else: this phone is the third on the link.
  const [taken, setTaken] = useState(false);
  // Nobody enters a room until they have pressed the button beside their name, even when the name
  // is remembered: a guest on a shared laptop should not join as somebody else.
  const entered = entry !== null;
  const host = joinCode === null;
  const roomCode = joinCode ?? code;

  useEffect(() => {
    // A frame after mount: the page is rendered on the server without a room or names, and reading
    // them here rather than during render keeps the first client render identical to the server's.
    const frame = requestAnimationFrame(() => {
      const wanted = parseRoomCode(new URL(window.location.href).searchParams.get("room"));
      if (wanted && !onePhoneOnly) {
        setJoinCode(wanted);
        setMode("two");
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

  const link = () => `${window.location.origin}${pathname}?room=${roomCode ?? ""}`;
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
    if (!navigator.share) return copy();
    try {
      await navigator.share({ title, text: t("shareText", { name: names[0] || t("someone") }), url: link() });
    } catch {
      // Closed.
    }
  };

  const others = room.peers.filter((p) => p.id !== room.me);
  const hostPeer = others.find((p) => p.host);
  // Peers come sorted by arrival, so this is the first guest in — the same one on every phone.
  // A second guest (the link opened twice, a friend being nosy) is told the room is full.
  const seated = room.peers.find((p) => !p.host);
  const guestPeer = host && seated?.id !== room.me ? seated : undefined;
  const full = !host && (taken || (seated !== undefined && seated.id !== room.me));
  const ready = mode === "two" && room.status === "open" && !full && Boolean(host ? guestPeer : hostPeer);

  return (
    <section className="container-x grid items-center gap-10 pt-10 pb-16 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-16 lg:pb-24">
      <div>
        <h1 className="display-xl text-cream">{title}</h1>
        <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-cream/70">{blurb}</p>
        {children}

        {mode === null ? (
          <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
            {(["one", "two"] as const).map((m, i) => {
              const Icon = m === "one" ? Users : Smartphone;
              return (
                <button key={m} type="button" onClick={() => setMode(m)} className="group block rounded-[20px] text-left">
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
                  <button type="button" onClick={() => setMode(null)} className="h-12 rounded-full px-4 text-[14px] font-semibold text-forest/65 hover:bg-forest/5">
                    {t("back")}
                  </button>
                ) : null}
              </div>
            </form>
          </PlayingCard>
        ) : null}

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
                  {!joinCode ? (
                    <button type="button" onClick={() => setMode(null)} className="h-12 rounded-full px-4 text-[14px] font-semibold text-forest/65 hover:bg-forest/5">
                      {t("back")}
                    </button>
                  ) : null}
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
                  <button type="button" onClick={() => onStart({ mode: "two", code: entry?.code ?? null, host: true, names: [names[0].trim(), guestPeer.name || t("someone")], peer: guestPeer.id })} className="btn-rose mt-4 h-12 rounded-full px-7 text-[15px] font-semibold">
                    {t("start")}
                  </button>
                ) : null}
                {ready && !host && hostPeer ? (
                  <>
                    <p className="mt-3 text-[13.5px] text-forest/55">{t("two.hostStarts", { name: hostPeer.name || t("someone") })}</p>
                    <GuestAutoStart room={room} hostId={hostPeer.id} onTaken={() => setTaken(true)} onStart={() => onStart({ mode: "two", code: entry?.code ?? null, host: false, names: [hostPeer.name || t("someone"), names[0].trim()], peer: hostPeer.id })} />
                  </>
                ) : null}
              </div>
            )}
          </PlayingCard>
        ) : null}
        <p className="mt-6 max-w-xl text-[12.5px] leading-snug text-cream/45">{t("privacy")}</p>
      </div>
      <div className="relative mx-auto w-full max-w-[420px]">{art}</div>
    </section>
  );
}

/**
 * The guest's game begins when the host's first state arrives, addressed to this phone. It says
 * hello every so often in the meantime, so a start the guest missed (the host pressed it a moment
 * too soon) is sent again. A state addressed to someone else means the host started without us.
 */
function GuestAutoStart({ room, hostId, onStart, onTaken }: { room: ReturnType<typeof useRoom>; hostId: string; onStart: () => void; onTaken: () => void }) {
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
      if (to === me) startRef.current();
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

/** On two phones, when the other one goes quiet for a few seconds: say so, and keep the game where it is. */
export function PeerGone({ session, room }: { session: Session; room: ReturnType<typeof useRoom> }) {
  const t = useTranslations("games.lobby");
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
  if (!gone || present) return null;
  return (
    <p role="status" className="mx-auto mb-6 flex max-w-xl items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-[14px] text-cream ring-1 ring-white/15">
      <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin" />
      {t("left", { name: session.names[session.host ? 1 : 0] })}
    </p>
  );
}
