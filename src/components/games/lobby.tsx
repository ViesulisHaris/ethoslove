"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, Loader2, Share2, Smartphone, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { makeRoomCode, parseRoomCode } from "@/lib/games/room";
import { useRoom, type Peer } from "./use-room";

export type Mode = "one" | "two";
/** `names` is always [player 0, player 1]: on two phones the host is player 0, whoever they are. */
export type Session = { mode: Mode; code: string | null; host: boolean; names: [string, string] };

const NAMES_KEY = "ethos.games.names";

/**
 * The door to every game: two names for one phone, or a room for two. A room is four letters
 * and a link; whoever opens the link is the guest. The game itself starts once it knows who is
 * playing, and this hands it a session that says how.
 */
export type Entry = { code: string; name: string; host: boolean };

/**
 * The room lives in the game, not in the lobby: the lobby leaves the screen when the game starts,
 * and the connection has to stay. A game calls this once and hands `room` to both.
 */
export function useGameRoom() {
  const [entry, setEntry] = useState<Entry | null>(null);
  const room = useRoom(entry?.code ?? null, entry?.name ?? "", entry?.host ?? true);
  return { room, entry, setEntry };
}

export function Lobby({ title, blurb, art, room, entry, onEnter, onStart, onePhoneOnly = false, children }: { title: string; blurb: string; art: ReactNode; room: ReturnType<typeof useRoom>; entry: Entry | null; onEnter: (entry: Entry | null) => void; onStart: (session: Session) => void; onePhoneOnly?: boolean; children?: ReactNode }) {
  const t = useTranslations("games.lobby");
  const pathname = usePathname();
  const [mode, setMode] = useState<Mode | null>(onePhoneOnly ? "one" : null);
  const [names, setNames] = useState<[string, string]>(["", ""]);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  // Nobody enters a room until they have pressed the button with their name beside it, even
  // when the name is remembered: a guest on a shared laptop should not join as somebody else.
  const entered = entry !== null;
  const host = joinCode === null;
  const roomCode = joinCode ?? code;

  useEffect(() => {
    // A frame after mount: the page is server-rendered without a room or names, and reading them
    // here rather than during render keeps the first client render identical to the server's.
    const frame = requestAnimationFrame(() => {
      const wanted = parseRoomCode(new URL(window.location.href).searchParams.get("room"));
      if (wanted) {
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
  }, []);

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

  const guest: Peer | undefined = room.peers.find((p) => p.id !== room.me);
  const ready = mode === "two" && room.status === "open" && room.peers.length >= 2;

  return (
    <section className="container-x grid items-start gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-16">
      <div>
        <h1 className="display-xl text-forest">{title}</h1>
        <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-forest/70">{blurb}</p>
        {children}

        {mode === null ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {(["one", "two"] as const).map((m) => {
              const Icon = m === "one" ? Users : Smartphone;
              return (
                <button key={m} type="button" onClick={() => setMode(m)} className="rounded-[24px] bg-white p-5 text-left shadow-soft ring-1 ring-forest/5 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-lift">
                  <Icon aria-hidden="true" className="size-6 text-lilac" />
                  <span className="mt-4 block font-display text-[22px] leading-tight text-forest">{t(`${m}.title`)}</span>
                  <span className="mt-1.5 block text-[14px] leading-snug text-forest/65">{t(`${m}.blurb`)}</span>
                </button>
              );
            })}
          </div>
        ) : null}

        {mode === "one" ? (
          <form
            className="mt-8 rounded-[24px] bg-white p-5 shadow-soft ring-1 ring-forest/5"
            onSubmit={(e) => {
              e.preventDefault();
              if (names[0].trim() && names[1].trim()) onStart({ mode: "one", code: null, host: true, names: [names[0].trim(), names[1].trim()] });
            }}
          >
            <p className="font-display text-[20px] text-forest">{t("one.who")}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <input key={i} value={names[i]} maxLength={24} required placeholder={t(i === 0 ? "you" : "them")} aria-label={t(i === 0 ? "you" : "them")} onChange={(e) => remember(i === 0 ? [e.target.value, names[1]] : [names[0], e.target.value])} className="h-12 rounded-2xl border border-forest/15 bg-white px-4 text-[16px] text-forest outline-none focus:border-rose/50 focus:shadow-[0_0_0_4px_rgba(214,51,108,0.12)]" />
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button type="submit" className="btn-rose h-12 rounded-full px-6 text-[15px] font-semibold">
                {t("start")}
              </button>
              {!onePhoneOnly ? (
                <button type="button" onClick={() => setMode(null)} className="h-12 rounded-full px-4 text-[14px] font-semibold text-forest/70 hover:bg-forest/5">
                  {t("back")}
                </button>
              ) : null}
            </div>
          </form>
        ) : null}

        {mode === "two" ? (
          <div className="mt-8 rounded-[24px] bg-white p-5 shadow-soft ring-1 ring-forest/5">
            {!entered ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!names[0].trim()) return;
                  const fresh = host && !code ? makeRoomCode() : null;
                  if (fresh) setCode(fresh);
                  onEnter({ code: joinCode ?? fresh ?? code!, name: names[0].trim(), host });
                }}
              >
                <p className="font-display text-[20px] text-forest">{joinCode ? t("two.joining", { code: joinCode }) : t("two.yourName")}</p>
                <input value={names[0]} maxLength={24} required autoFocus placeholder={t("you")} aria-label={t("you")} onChange={(e) => remember([e.target.value, names[1]])} className="mt-3 h-12 w-full rounded-2xl border border-forest/15 bg-white px-4 text-[16px] text-forest outline-none focus:border-rose/50 focus:shadow-[0_0_0_4px_rgba(214,51,108,0.12)]" />
                <div className="mt-4 flex items-center gap-2">
                  <button type="submit" className="btn-rose h-12 rounded-full px-6 text-[15px] font-semibold">
                    {joinCode ? t("two.join") : t("two.create")}
                  </button>
                  {!joinCode ? (
                    <button type="button" onClick={() => { onEnter(null); setMode(null); }} className="h-12 rounded-full px-4 text-[14px] font-semibold text-forest/70 hover:bg-forest/5">
                      {t("back")}
                    </button>
                  ) : null}
                </div>
              </form>
            ) : (
              <div>
                <p className="text-eyebrow text-lilac">{t("two.room")}</p>
                <p className="mt-2 font-display text-[44px] leading-none tracking-[0.18em] text-forest" aria-label={t("two.codeLabel", { code: roomCode ?? "" })}>
                  {roomCode}
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
                  ) : ready ? (
                    <>
                      <Check aria-hidden="true" className="size-4 text-moss" />
                      {t("two.here", { name: guest?.name || t("someone") })}
                    </>
                  ) : (
                    <>
                      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                      {room.status === "open" ? t("two.waiting") : t("two.connecting")}
                    </>
                  )}
                </p>
                {ready ? (
                  host ? (
                    <button type="button" onClick={() => onStart({ mode: "two", code: roomCode, host: true, names: [names[0].trim(), guest?.name || t("someone")] })} className="btn-rose mt-4 h-12 rounded-full px-6 text-[15px] font-semibold">
                      {t("start")}
                    </button>
                  ) : (
                    <p className="mt-3 text-[13.5px] text-forest/55">{t("two.hostStarts", { name: room.peers.find((p) => p.host)?.name || t("someone") })}</p>
                  )
                ) : null}
                {!host && ready ? <GuestAutoStart onStart={() => onStart({ mode: "two", code: roomCode, host: false, names: [room.peers.find((p) => p.host)?.name || t("someone"), names[0].trim()] })} on={room.on} /> : null}
              </div>
            )}
          </div>
        ) : null}
        <p className="mt-6 text-[12.5px] leading-snug text-forest/45">{t("privacy")}</p>
      </div>
      <div className="relative mx-auto w-full max-w-[460px]" aria-hidden="true">
        {art}
      </div>
    </section>
  );
}

/** The guest's game begins when the host's first state arrives. */
function GuestAutoStart({ onStart, on }: { onStart: () => void; on: ReturnType<typeof useRoom>["on"] }) {
  useEffect(() => on("state", () => onStart()), [on, onStart]);
  return null;
}
