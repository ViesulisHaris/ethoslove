"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString } from "../_shared/random";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { PAPER_GRAIN, SCRIPT_FONT } from "../_shared/cover-kit";
import { MEMES } from "../_shared/memes/catalogue";
import { Bubble } from "../_shared/memes/Bubble";
import { MemeSticker } from "../_shared/memes/MemeSticker";
import { buzz, playBoing, playHonk, playSlap, playSqueak, playTada } from "../_shared/memes/sounds";
import { BoothStrip, LOOKS, PARTY_KEYFRAMES, Polaroid, RansomRows, Spark, type Look, type LookId } from "./art";
import { bannerRows, letterSize, planFrames, planGuests, shoutFor, type FrameSpot, type GuestSpot, type Voice } from "./scene";
import { fieldsSchema, type PartyAnimalsFields } from "./schema";

type Copy = { greet: string; greetOne: string; open: string; skip: string; banner: string; word: string; playing: string; house: string[]; ageLine: string };

const S: Record<"en" | "es", Copy> = {
  en: {
    greet: "tap every guest",
    greetOne: "Say hi to {name}",
    open: "open the card",
    skip: "skip to the card",
    banner: "happy birthday",
    word: "happiness.",
    playing: "now playing",
    house: ["HAPPY BIRTHDAY!!", "i was told there'd be cake", "ur my favourite human", "who invited the ferrets", "make a wish. make it snacks", "party party party", "we love u (the cat made me say it)", "is it cake time yet", "ur glowing. is that the candles", "best day of the year tbh", "i wore the hat for u"],
    ageLine: "{age}?? in THIS economy",
  },
  es: {
    greet: "toca a cada invitado",
    greetOne: "Saluda a {name}",
    open: "abre la tarjeta",
    skip: "ir a la tarjeta",
    banner: "feliz cumple",
    word: "felicidad.",
    playing: "sonando",
    house: ["¡¡FELIZ CUMPLE!!", "me dijeron que había tarta", "eres mi persona favorita", "quién invitó a los hurones", "pide un deseo. que sean snacks", "fiesta fiesta fiesta", "te queremos (me obligó el gato)", "¿ya toca la tarta?", "estás brillando. ¿son las velas?", "el mejor día del año, la verdad", "me puse el gorro por ti"],
    ageLine: "¿¿{age}?? con esta economía",
  },
};

type Stage = "party" | "read";

const speak = (voice: Voice, muted: boolean, pitch: number) => {
  if (voice === "honk") playHonk(muted);
  else if (voice === "boing") playBoing(muted);
  else playSqueak(muted, voice === "squeak" ? 0.55 + pitch * 0.45 : pitch * 0.5);
};

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<PartyAnimalsFields>) {
  const reduce = !!useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const preview = mode === "preview";
  // A draft saved before a field changed shape still opens: bad fields fall back to the defaults.
  const fields = useMemo(() => {
    const parsed = fieldsSchema.safeParse(data.fields);
    return parsed.success ? parsed.data : fieldsSchema.parse({});
  }, [data.fields]);
  const lookId: LookId = fields.look in LOOKS ? fields.look : "linen";
  const look = LOOKS[lookId];
  const seed = hashString(`${data.recipientName}|${data.senderName}|party-animals`);
  const photos = useMemo(() => data.photos.slice(0, 7), [data.photos]);
  const frames = useMemo(() => planFrames(photos.length), [photos.length]);
  const guests = useMemo(() => planGuests(photos.length, seed), [photos.length, seed]);
  const rows = useMemo(() => bannerRows(fields.banner?.trim() || s.banner), [fields.banner, s.banner]);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);

  const [stage, setStage] = useState<Stage>(preview ? "read" : "party");
  const [greeted, setGreeted] = useState<boolean[]>(() => Array(guests.length).fill(false));
  const [said, setSaid] = useState<{ i: number; text: string; key: number } | null>(null);
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const started = useRef(false);
  const saidCount = useRef(0);
  const hush = useRef<number | undefined>(undefined);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });
  useEffect(() => () => window.clearTimeout(hush.current), []);

  const done = greeted.filter(Boolean).length;
  const everyone = guests.length > 0 && done >= guests.length;
  const frameDelay = (i: number) => 0.3 + i * 0.24;
  const guestDelay = (i: number) => frameDelay(frames.length) + 0.1 + i * 0.085;

  // Each frame lands with a slap. Timers only: nothing here touches state.
  useEffect(() => {
    if (preview || reduce) return;
    const timers = frames.map((_, i) => window.setTimeout(() => playSlap(audio.muted), (0.3 + i * 0.24) * 1000 + 120));
    return () => timers.forEach((id) => window.clearTimeout(id));
    // The entrance plays once per run; muting half-way through it is not worth a restart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, preview, reduce, frames.length]);

  const begin = () => {
    if (started.current) return;
    started.current = true;
    void audio.start();
    eventRef.current?.({ type: "started" });
  };

  const greet = (i: number) => {
    if (stage !== "party") return;
    begin();
    const spot = guests[i];
    speak(spot.voice, audio.muted, i / Math.max(1, guests.length - 1));
    buzz(10);
    saidCount.current += 1;
    setSaid({ i, text: shoutFor(i, fields.shouts, s.house, fields.age, s.ageLine), key: saidCount.current });
    window.clearTimeout(hush.current);
    hush.current = window.setTimeout(() => setSaid(null), 2200);
    if (greeted[i]) return;
    const next = greeted.slice();
    next[i] = true;
    setGreeted(next);
    const count = next.filter(Boolean).length;
    eventRef.current?.({ type: "progress", pct: Math.round((count / guests.length) * 60) });
    if (count === guests.length) {
      setBurst((b) => b + 1);
      window.setTimeout(() => playTada(audio.muted), 180);
      window.setTimeout(() => setBurst((b) => b + 1), 650);
    }
  };

  const openCard = () => {
    begin();
    setSaid(null);
    setStage("read");
  };

  const replay = () => {
    setStage("party");
    setGreeted(Array(guests.length).fill(false));
    setSaid(null);
    setRun((r) => r + 1);
  };

  const vars = { "--k": "min(var(--u), 0.5cqh)", "--p": "min(1cqw, calc(1cqh / 1.78))" } as CSSProperties;
  const size = letterSize(rows);

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ background: look.ground, color: look.ink, fontFamily: "var(--gift-font-body)", ...vars }}>
      <style>{PARTY_KEYFRAMES}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: look.pattern, backgroundSize: look.patternSize }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: look.dark ? 0.3 : 0.55 }} />
      <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
        <Ambience layers={look.ambience} opacity={stage === "read" ? 0.4 : 0.8} />
      </div>

      {/* the page: a phone-shaped stage, centred, so the collage stays whole on any screen */}
      <div key={run} className="absolute top-1/2 left-1/2 z-[5] -translate-x-1/2 -translate-y-1/2" style={{ width: "calc(100*var(--p))", height: "min(100cqh, calc(205*var(--p)))" }}>
        <div className="pointer-events-none absolute inset-x-0 top-[2.2%] z-[6]">
          <RansomRows rows={rows} size={size} tiles={look.tiles} seed={seed % 89}>
            {(letter, i) => (
              <motion.span className={cn("block", everyone && !reduce && "pa-idle-bob")} style={{ "--pace": "0.9s", animationDelay: `${i * 0.06}s` } as CSSProperties} initial={preview || reduce ? false : { y: "-160%", opacity: 0, rotate: -24 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 0.1 + i * 0.04, type: "spring", stiffness: 260, damping: 15 }}>
                {letter}
              </motion.span>
            )}
          </RansomRows>
        </div>

        {frames.map((frame, i) => (
          <motion.div key={frame.kind} className="absolute z-[8]" style={{ left: `${frame.x}%`, top: `${frame.y}%`, rotate: `${frame.rotate}deg` }} initial={preview || reduce ? false : { opacity: 0, scale: 1.5, rotate: frame.rotate + 12 }} animate={{ opacity: 1, scale: 1, rotate: frame.rotate }} transition={{ delay: frameDelay(i), type: "spring", stiffness: 280, damping: 18 }}>
            <Frame frame={frame} photos={photos} name={data.recipientName} age={fields.age} word={fields.word?.trim() || s.word} accent={data.accentColor} onOpen={preview ? undefined : setActive} />
          </motion.div>
        ))}

        {guests.map((spot, i) => (
          <Guest key={spot.id} spot={spot} index={i} label={s.greetOne.replace("{name}", MEMES[spot.id].name[data.locale] ?? MEMES[spot.id].name.en)} greeted={greeted[i] ?? false} saying={said?.i === i ? said : null} sparkColor={look.tiles[i % look.tiles.length]} delay={guestDelay(i)} still={preview || reduce} reduce={reduce} disabled={stage !== "party"} onGreet={() => greet(i)} />
        ))}
      </div>

      <AnimatePresence>
        {stage === "party" ? (
          <motion.div key="bar" className="absolute inset-x-0 bottom-[max(1.6cqh,env(safe-area-inset-bottom))] z-[35] flex flex-col items-center gap-[calc(1.2*var(--k))] px-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: reduce ? 0 : guestDelay(guests.length) + 0.2 }}>
            {everyone ? (
              <motion.button type="button" onClick={openCard} className="rounded-full px-[calc(6*var(--k))] py-[calc(2.4*var(--k))] text-[calc(3.4*var(--k))] font-bold tracking-[0.2em] uppercase shadow-[0_10px_30px_-8px_rgba(0,0,0,.5)] outline-none focus-visible:ring-4 focus-visible:ring-white/70" style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }} initial={{ scale: 0.6 }} animate={{ scale: reduce ? 1 : [1, 1.07, 1] }} transition={{ scale: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } }}>
                {s.open}
              </motion.button>
            ) : (
              <>
                <p aria-live="polite" className="rounded-full px-[calc(4.5*var(--k))] py-[calc(1.7*var(--k))] text-[calc(3*var(--k))] font-semibold tracking-[0.2em] uppercase backdrop-blur-sm" style={{ background: look.dark ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.86)", color: look.dark ? "#FFF8EE" : "#2E2622", boxShadow: "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(40,20,20,.18)" }}>
                  {s.greet} · {done}/{guests.length}
                </p>
                <button type="button" onClick={openCard} className="rounded-full px-3 py-1 text-[calc(2.6*var(--k))] tracking-[0.14em] underline decoration-dotted underline-offset-4 opacity-80 outline-none focus-visible:ring-2" style={{ color: look.ink }}>
                  {s.skip}
                </button>
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Confetti burst={burst} colors={look.confetti} count={170} origin={{ x: 0.5, y: 0.42 }} className="pointer-events-none absolute inset-0 z-[36]" />

      <AnimatePresence>
        {stage === "read" ? <CardSheet key="sheet" data={data} mode={mode} blocks={blocks} look={look} s={s} t={t} reduce={reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} /> : null}
      </AnimatePresence>

      <AnimatePresence>{active !== null && photos[active] ? <Lightbox key="box" photo={photos[active]} onClose={() => setActive(null)} closeLabel={t("close")} /> : null}</AnimatePresence>

      {audio.hasMusic && mode !== "preview" ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

function Frame({ frame, photos, name, age, word, accent, onOpen }: { frame: FrameSpot; photos: GiftPhoto[]; name: string; age?: number; word: string; accent: string; onOpen?: (index: number) => void }) {
  const first = photos[frame.photos[0]];
  if (!first) return null;
  const open = onOpen ? () => onOpen(frame.photos[0]) : undefined;
  if (frame.kind === "strip") return <BoothStrip photos={frame.photos.map((i) => photos[i]).filter(Boolean)} width={frame.w} onOpen={onOpen ? (i) => onOpen(frame.photos[i]) : undefined} />;
  if (frame.kind === "big")
    return (
      <Polaroid photo={first} width={frame.w} aspect={0.92} lip={7.4} onOpen={open}>
        <span className="block max-w-full truncate px-[calc(2*var(--p))] text-[calc(4.4*var(--p))] leading-none" style={{ fontFamily: "var(--gift-font-hand)" }}>
          {name}
          {age ? <span style={{ color: accent }}> · {age}</span> : null}
        </span>
      </Polaroid>
    );
  if (frame.kind === "wide")
    return (
      <Polaroid photo={first} width={frame.w} aspect={1.58} lip={8.6} onOpen={open}>
        <span className="flex max-w-full items-center justify-end gap-[calc(1.2*var(--p))] self-stretch px-[calc(3*var(--p))] text-[calc(5.2*var(--p))] leading-none" style={{ fontFamily: SCRIPT_FONT }}>
          <span className="truncate">{word}</span>
          <svg viewBox="0 0 24 24" className="h-[calc(2.8*var(--p))] w-[calc(2.8*var(--p))] shrink-0" aria-hidden="true">
            <path d="M12 21s-7.6-4.7-9.7-9.3C.9 8.4 2.7 4.6 6.4 4.6c2 0 3.6 1.1 5.6 3.3 2-2.2 3.6-3.3 5.6-3.3 3.7 0 5.5 3.8 4.1 7.1C19.6 16.3 12 21 12 21Z" fill="#221A1E" />
          </svg>
        </span>
      </Polaroid>
    );
  return <Polaroid photo={first} width={frame.w} aspect={1.42} lip={2.2} onOpen={open} />;
}

function Guest({ spot, index, label, greeted, saying, sparkColor, delay, still, reduce, disabled, onGreet }: { spot: GuestSpot; index: number; label: string; greeted: boolean; saying: { text: string; key: number } | null; sparkColor: string; delay: number; still: boolean; reduce: boolean; disabled: boolean; onGreet: () => void }) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const side = spot.x < 30 ? "left" : spot.x > 70 ? "right" : "middle";
  const below = spot.y < 24;

  const react = () => {
    onGreet();
    if (reduce || !scope.current) return;
    const moves = {
      jump: { y: ["0%", "-34%", "0%", "-12%", "0%"], scaleY: [1, 1.08, 0.9, 1.03, 1] },
      spin: { rotate: [0, 380, 360], scale: [1, 1.2, 1] },
      zoom: { scale: [1, 1.75, 0.92, 1.06, 1], rotate: [0, -8, 6, 0, 0] },
      wiggle: { rotate: [0, -18, 16, -12, 8, 0], scale: [1, 1.12, 1.12, 1.06, 1.02, 1] },
    } as const;
    void animate(scope.current, moves[spot.move], { duration: spot.move === "spin" ? 0.75 : 0.62, ease: "easeOut" }).then(() => {
      if (scope.current) scope.current.style.transform = "";
    });
  };

  return (
    <motion.div className="absolute" style={{ left: `${spot.x}%`, top: `${spot.y}%`, width: `calc(${spot.w} * var(--p))`, translate: "-50% -50%", rotate: `${spot.rotate}deg`, zIndex: saying ? 30 : 12 + (index % 5) }} initial={still ? false : { scale: 0, rotate: spot.rotate - 30 }} animate={{ scale: 1, rotate: spot.rotate }} transition={{ delay, type: "spring", stiffness: 320, damping: 13 }}>
      <div className={cn(!still && `pa-idle-${spot.idle}`)} style={{ "--pace": `${spot.pace}s`, animationDelay: `${spot.phase}s` } as CSSProperties}>
        <span ref={scope} className="block will-change-transform">
          <MemeSticker id={spot.id} width="100%" />
        </span>
      </div>
      <button type="button" data-guest={index} data-greeted={greeted ? "" : undefined} aria-label={label} disabled={disabled} onClick={react} className="absolute inset-[6%] rounded-[30%] outline-none focus-visible:ring-4 focus-visible:ring-white/80" />
      <AnimatePresence>
        {greeted ? (
          <motion.span key="spark" aria-hidden="true" className="pointer-events-none absolute -top-[6%] -right-[4%] h-[calc(5.4*var(--p))] w-[calc(5.4*var(--p))]" initial={reduce ? false : { scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 12 }}>
            <Spark color={sparkColor} />
          </motion.span>
        ) : null}
        {saying ? (
          <motion.span key={saying.key} role="status" className="pointer-events-none absolute z-[2]" style={{ ...(below ? { top: "92%" } : { bottom: "92%" }), ...(side === "left" ? { left: 0 } : side === "right" ? { right: 0 } : { left: "50%", translate: "-50% 0" }), rotate: `${-spot.rotate}deg` }} initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.3, y: below ? -10 : 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.16 } }} transition={{ type: "spring", stiffness: 420, damping: 16 }}>
            <Bubble side={side} below={below}>
              {saying.text}
            </Bubble>
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function Lightbox({ photo, onClose, closeLabel }: { photo: GiftPhoto; onClose: () => void; closeLabel: string }) {
  return (
    <motion.div className="absolute inset-0 z-[60] grid place-items-center bg-black/80 p-[calc(5*var(--k))]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.figure className="m-0 max-h-full bg-[#FFFDF8] p-[calc(2.4*var(--k))] pb-[calc(3*var(--k))] shadow-2xl" initial={{ scale: 0.8, rotate: -4 }} animate={{ scale: 1, rotate: -1.5 }} exit={{ scale: 0.85 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
        <img src={photo.url} alt={photo.alt ?? ""} className="block max-h-[68cqh] max-w-full object-contain" />
        {photo.caption ? (
          <figcaption className="mt-[calc(2*var(--k))] text-center text-[calc(4*var(--k))] leading-tight text-[#2E2622]" style={{ fontFamily: "var(--gift-font-hand)" }}>
            {photo.caption}
          </figcaption>
        ) : null}
      </motion.figure>
      <button type="button" aria-label={closeLabel} onClick={onClose} className="absolute inset-0 outline-none" />
    </motion.div>
  );
}

function CardSheet({ data, mode, blocks, look, s, t, reduce, onEvent, onReact, onMakeOne, onReplay }: { data: TemplateProps<PartyAnimalsFields>["data"]; mode: TemplateProps["mode"]; blocks: ReturnType<typeof parseRichText>; look: Look; s: Copy; t: ReturnType<typeof useGiftStrings>; reduce: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    const el = endRef.current;
    if (!el || mode === "preview") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !endedRef.current) {
          endedRef.current = true;
          onEvent?.({ type: "progress", pct: 100 });
          onEvent?.({ type: "ended" });
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onEvent, mode]);

  return (
    <motion.div className="absolute inset-0 z-[40] overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" initial={reduce ? { y: 0 } : { y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%", transition: { duration: 0.35 } }} transition={{ type: "spring", stiffness: 64, damping: 18 }}>
      <div className="flex min-h-full flex-col">
        <div className="shrink-0" style={{ height: mode === "preview" ? "min(58cqh, 540px)" : "min(26cqh, 280px)" }} />
        <div className="relative mx-auto w-[min(94cqw,600px)] flex-1 rounded-t-[calc(4*var(--k))] px-[calc(5*var(--k))] pt-[calc(9*var(--k))] pb-[calc(72px+env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-20px_rgba(0,0,0,.45)]" style={{ background: look.paper, color: look.paperInk, backgroundImage: PAPER_GRAIN }}>
          {/* two guests who read over the top of the card */}
          <MemeSticker id="party-kitten" width="calc(17*var(--k))" className="absolute -top-[calc(15*var(--k))] left-[calc(4*var(--k))] -rotate-6" />
          <MemeSticker id="hamster-cake" width="calc(11*var(--k))" className="absolute -top-[calc(12.5*var(--k))] right-[calc(6*var(--k))] rotate-6" />
          <article className="relative">
            <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="hand" accent={data.accentColor} />
          </article>

          {data.music?.title ? (
            <p className="mt-[calc(6*var(--k))] text-center text-[calc(2.6*var(--k))] tracking-[0.2em] uppercase opacity-55">
              {s.playing} · {data.music.title}
              {data.music.artist ? ` — ${data.music.artist}` : ""}
            </p>
          ) : null}

          {data.countdown ? (
            <div className="mt-[calc(6*var(--k))] rounded-[calc(2*var(--k))] bg-[#F3E9D8] p-[calc(4*var(--k))] text-[#2E2521] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ backgroundImage: PAPER_GRAIN }}>
              <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
            </div>
          ) : null}

          {data.surprise ? (
            <div className="mt-[calc(6*var(--k))] rounded-[calc(2*var(--k))] bg-[#F3E9D8] px-[calc(4*var(--k))] pt-[calc(5*var(--k))] pb-[calc(4*var(--k))] text-[#2E2521] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ backgroundImage: PAPER_GRAIN }}>
              <p className="mb-[calc(3*var(--k))] text-center text-[calc(2.6*var(--k))] tracking-[0.24em] uppercase opacity-70">{t("ps")}</p>
              <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
            </div>
          ) : null}

          <div ref={endRef} className="mt-[calc(8*var(--k))]">
            <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
