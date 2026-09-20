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
import { Confetti } from "../_shared/Confetti";
import { PAPER_GRAIN, POSTER_FONT } from "../_shared/cover-kit";
import { Bubble } from "../_shared/memes/Bubble";
import { MEMES } from "../_shared/memes/catalogue";
import { MemeSticker } from "../_shared/memes/MemeSticker";
import { buzz, playBoing, playHonk, playSqueak, playTada, playThud } from "../_shared/memes/sounds";
import { BenchFront, COUNCIL_KEYFRAMES, COURTS, Crest, Gavel, NamePlate, Paw, RoughInk, Stamp, type BenchId, type Court } from "./art";
import { caseNumber, exhibitLetter, findingsFor, SEATS, speakerFor, type Seat, type Verdict } from "./hearing";
import { fieldsSchema, type CouncilFields } from "./schema";

type Copy = {
  crestTop: string; crestBottom: string; hears: string; charged: string; charge: string; rise: string; next: string; hearVerdict: string; read: string; skip: string;
  ruling: string; caseNo: string; matter: string; finds: string; signed: string; exhibit: string; evidence: string; playing: string; speak: string;
  titles: string[]; portraits: string[]; house: string[]; stamps: Record<Verdict, string>; lines: Record<Verdict, string>;
};

const S: Record<"en" | "es", Copy> = {
  en: {
    crestTop: "Council of Cats", crestBottom: "est. nine lives ago", hears: "will now hear the case of", charged: "charged with", charge: "being far too easy to love", rise: "all rise", next: "next finding", hearVerdict: "hear the verdict", read: "read the full ruling", skip: "skip to the ruling",
    ruling: "Official ruling", caseNo: "case no.", matter: "In the matter of {charge}, the council finds", finds: "the council finds", signed: "signed, the council", exhibit: "Exhibit", evidence: "the evidence", playing: "now playing", speak: "Hear from {name}",
    titles: ["vibes", "prosecution", "the chair", "security", "witness"],
    portraits: ["founder", "employee of the month", "intern"],
    house: ["you laugh at your own jokes before the punchline", "you said “five minutes away” from your bed", "you steal chips and claim you “weren't hungry”", "you remember everyone's birthday. suspicious.", "you are, regrettably, our favourite human"],
    stamps: { guilty: "Guilty", approved: "Approved", certified: "Certified icon", pardoned: "Pardoned" },
    lines: { guilty: "as charged. sentence: one (1) hug, to be served immediately.", approved: "this human may proceed to be celebrated.", certified: "certified by four cats and one shark.", pardoned: "all crimes forgiven. even the chips." },
  },
  es: {
    crestTop: "Consejo de Gatos", crestBottom: "desde hace nueve vidas", hears: "verá ahora el caso de", charged: "se le acusa de", charge: "ser demasiado fácil de querer", rise: "en pie", next: "siguiente conclusión", hearVerdict: "oír el veredicto", read: "leer la sentencia completa", skip: "ir a la sentencia",
    ruling: "Sentencia oficial", caseNo: "expediente n.º", matter: "En el asunto de {charge}, el consejo declara a", finds: "el consejo declara a", signed: "firmado, el consejo", exhibit: "Prueba", evidence: "las pruebas", playing: "sonando", speak: "Escuchar a {name}",
    titles: ["ambiente", "fiscalía", "presidencia", "seguridad", "testigo"],
    portraits: ["fundadora", "empleada del mes", "en prácticas"],
    house: ["te ríes de tus chistes antes del remate", "dijiste «llego en cinco minutos» desde la cama", "robas patatas y dices que «no tenías hambre»", "te acuerdas de todos los cumpleaños. sospechoso.", "eres, lamentablemente, nuestra persona favorita"],
    stamps: { guilty: "Culpable", approved: "Visto bueno", certified: "Icono certificado", pardoned: "Indulto" },
    lines: { guilty: "de todos los cargos. condena: un (1) abrazo, de cumplimiento inmediato.", approved: "esta persona puede proceder a ser celebrada.", certified: "certificado por cuatro gatos y un tiburón.", pardoned: "todos los delitos perdonados. hasta lo de las patatas." },
  },
};

type Phase = "intro" | "hearing" | "verdict";

const voice = (seat: Seat, muted: boolean) => {
  if (seat.voice === "honk") playHonk(muted);
  else if (seat.voice === "boing") playBoing(muted);
  else playSqueak(muted, seat.voice === "squeak" ? 0.9 : 0.25);
};

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<CouncilFields>) {
  const reduce = !!useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const preview = mode === "preview";
  const fields = useMemo(() => {
    const parsed = fieldsSchema.safeParse(data.fields);
    return parsed.success ? parsed.data : fieldsSchema.parse({});
  }, [data.fields]);
  const benchId: BenchId = fields.bench in COURTS ? fields.bench : "oak";
  const court = COURTS[benchId];
  const seed = hashString(`${data.recipientName}|${data.senderName}|the-council`);
  const findings = useMemo(() => findingsFor(fields.findings, s.house), [fields.findings, s.house]);
  const charge = fields.charge?.trim() || s.charge;
  const photos = useMemo(() => data.photos.slice(0, 6), [data.photos]);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);

  const [phase, setPhase] = useState<Phase>(preview ? "verdict" : "intro");
  const [reading, setReading] = useState(preview);
  const [heard, setHeard] = useState(0);
  const [speaking, setSpeaking] = useState<{ seat: number; text: string; key: number } | null>(null);
  const [stamped, setStamped] = useState(preview);
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const started = useRef(false);
  const timers = useRef<number[]>([]);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const [gavelScope, animateGavel] = useAnimate<HTMLDivElement>();
  const [roomScope, animateRoom] = useAnimate<HTMLDivElement>();

  const bang = () => {
    playThud(audio.muted);
    buzz(18);
    if (reduce) return;
    if (gavelScope.current) void animateGavel(gavelScope.current, { rotate: [0, -42, 6, 0] }, { duration: 0.3, ease: "easeOut" });
    if (roomScope.current) void animateRoom(roomScope.current, { x: [0, -5, 4, -2, 0], y: [0, 3, -2, 0, 0] }, { duration: 0.28 });
  };

  const say = (index: number) => {
    const seat = speakerFor(index);
    voice(SEATS[seat], audio.muted);
    buzz(8);
    setSpeaking({ seat, text: findings[index], key: index + 1 + run * 100 });
    setHeard(index + 1);
    eventRef.current?.({ type: "progress", pct: Math.round(((index + 1) / findings.length) * 45) });
  };

  const begin = () => {
    if (!started.current) {
      started.current = true;
      void audio.start();
      eventRef.current?.({ type: "started" });
    }
    bang();
    setPhase("hearing");
    later(reduce ? 50 : 650, () => say(0));
  };

  const verdict = () => {
    setSpeaking(null);
    setPhase("verdict");
    [0, 400, 800].forEach((ms) => later(reduce ? 0 : ms, bang));
    later(reduce ? 50 : 1750, () => {
      setStamped(true);
      playThud(audio.muted);
      buzz(30);
      setBurst((b) => b + 1);
      eventRef.current?.({ type: "progress", pct: 60 });
    });
    later(reduce ? 60 : 1980, () => playTada(audio.muted));
  };

  const advance = () => {
    if (reading) return;
    if (phase === "intro") begin();
    else if (phase === "hearing") {
      if (heard < findings.length) say(heard);
      else verdict();
    }
  };

  const openRuling = () => {
    if (!started.current) {
      started.current = true;
      void audio.start();
      eventRef.current?.({ type: "started" });
    }
    setSpeaking(null);
    setPhase("verdict");
    setStamped(true);
    setReading(true);
  };

  const replay = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    setReading(false);
    setPhase("intro");
    setHeard(0);
    setSpeaking(null);
    setStamped(false);
    setRun((r) => r + 1);
  };

  const vars = { "--k": "min(var(--u), 0.5cqh)", "--p": "min(1cqw, calc(1cqh / 1.78))" } as CSSProperties;
  const benchTop = "calc(50% + min(8cqh, calc(16.4*var(--p))))";
  const stageBox = { width: "calc(100*var(--p))", height: "min(100cqh, calc(205*var(--p)))" } as CSSProperties;
  const last = heard >= findings.length;

  return (
    <div className="absolute inset-0 overflow-hidden select-none" style={{ background: court.wall, color: court.ink, fontFamily: "var(--gift-font-body)", ...vars }}>
      <style>{COUNCIL_KEYFRAMES}</style>
      <RoughInk />
      <div ref={roomScope} className="absolute inset-0">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: court.stripes }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: court.dark ? 0.3 : 0.5 }} />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: court.dark ? "radial-gradient(80% 50% at 50% 30%, rgba(255,226,160,.16), transparent 70%)" : "radial-gradient(80% 50% at 50% 28%, rgba(255,255,255,.5), transparent 70%)" }} />

        {/* the stage: the case on the wall, and the council behind the bench */}
        <div key={run} className="absolute top-1/2 left-1/2 z-[5] -translate-x-1/2 -translate-y-1/2" style={stageBox}>
          <motion.div className="absolute inset-x-0 top-[5%] flex flex-col items-center text-center" initial={preview || reduce ? false : { opacity: 0, y: -16 }} animate={{ opacity: phase === "verdict" ? 0 : 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-[calc(3*var(--p))] font-black tracking-[0.34em] uppercase" style={{ color: court.dark ? court.brass.light : court.wood.deep }}>
              {s.crestTop}
            </p>
            <p className="mt-[calc(2.2*var(--p))] text-[calc(2.5*var(--p))] font-bold tracking-[0.26em] uppercase opacity-70">{s.hears}</p>
            <h1 className="mt-[calc(1*var(--p))] max-w-[92%] truncate text-[calc(13*var(--p))] leading-[1.02] font-black tracking-tight uppercase" style={{ fontFamily: POSTER_FONT }}>
              {data.recipientName}
            </h1>
            <p className="mt-[calc(1.8*var(--p))] max-w-[84%] text-[calc(4.6*var(--p))] leading-[1.15]" style={{ fontFamily: "var(--gift-font-hand)" }}>
              <span className="opacity-60">{s.charged} </span>
              {charge}
            </p>
          </motion.div>

          {/* the wall of fame: three former members, framed */}
          <motion.div className="pointer-events-none absolute inset-x-0 top-[27%] flex items-start justify-center gap-[calc(7*var(--p))]" initial={preview || reduce ? false : { opacity: 0 }} animate={{ opacity: phase === "verdict" ? 0 : 1 }} transition={{ delay: phase === "verdict" ? 0 : 0.5, duration: 0.5 }}>
            {(["round", "blush", "bow-kitten"] as const).map((id, i) => (
              <Portrait key={id} id={id} court={court} caption={s.portraits[i]} tilt={[-3, 1.5, 3][i]} />
            ))}
          </motion.div>

          {/* the council, sitting a little way down behind the top of the bench */}
          <div className="absolute inset-x-0 z-[6] h-0" style={{ top: "58%" }}>
            {SEATS.map((seat, i) => (
              <Member key={seat.id} seat={seat} index={i} label={s.speak.replace("{name}", MEMES[seat.id].name[data.locale] ?? MEMES[seat.id].name.en)} saying={speaking?.seat === i ? speaking : null} still={preview || reduce} reduce={reduce} delay={0.25 + i * 0.12} disabled={reading || phase === "verdict"} onTap={advance} />
            ))}
          </div>
        </div>

        {/* the bench runs the full width of any screen, its top on the stage's 61% line */}
        <BenchFront court={court} className="absolute inset-x-0 bottom-0 z-[8]" style={{ top: benchTop, boxShadow: "0 calc(-1*var(--p)) calc(3*var(--p)) rgba(0,0,0,.28)" }}>
          <div aria-hidden="true" className="absolute inset-x-[6%] top-[calc(11*var(--p))] bottom-[8%] grid grid-cols-3 gap-[4%] opacity-60">
            {[0, 1, 2].map((i) => (
              <span key={i} className="rounded-[calc(1.4*var(--p))]" style={{ boxShadow: `inset 0 calc(.6*var(--p)) calc(1.4*var(--p)) rgba(0,0,0,.35), inset 0 0 0 calc(.35*var(--p)) rgba(255,255,255,.14)` }} />
            ))}
          </div>
        </BenchFront>

        {/* what stands on the front of the bench: the plates, the seal, the gavel, and the ruling when it comes */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-[9] -translate-x-1/2 -translate-y-1/2" style={stageBox}>
          <div className="absolute inset-x-0" style={{ top: "calc(58% + 4.4*var(--p))" }}>
            {SEATS.map((seat, i) => (
              <NamePlate key={seat.id} court={court} className="absolute max-w-[calc(21*var(--p))] -translate-x-1/2" style={{ left: `${seat.x}%`, rotate: `${(i % 2 ? 1 : -1) * 1.5}deg` }}>
                {s.titles[i]}
              </NamePlate>
            ))}
          </div>
          <Crest top={s.crestTop} bottom={s.crestBottom} court={court} className="absolute left-1/2 top-[calc(58%+13*var(--p))] h-[calc(30*var(--p))] w-[calc(30*var(--p))] -translate-x-1/2 drop-shadow-[0_6px_10px_rgba(0,0,0,.45)]" />
          <div ref={gavelScope} className="absolute w-[calc(22*var(--p))]" style={{ right: "3%", top: "calc(58% + 12*var(--p))", transformOrigin: "8% 70%" }}>
            <Gavel court={court} className="w-full drop-shadow-[0_5px_6px_rgba(0,0,0,.45)]" />
          </div>
          <AnimatePresence>
            {phase === "verdict" ? <Ruling key={`ruling-${run}`} s={s} court={court} name={data.recipientName} charge={charge} verdict={fields.verdict} stamped={stamped} caseNo={caseNumber(seed)} reduce={reduce} still={preview} /> : null}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {!reading ? (
          <motion.div key="bar" className="absolute inset-x-0 bottom-[max(2.4cqh,env(safe-area-inset-bottom))] z-[35] flex flex-col items-center gap-[calc(1.4*var(--k))] px-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: reduce || preview ? 0 : 0.9 }}>
            {phase === "verdict" ? (
              stamped ? (
                <PillButton onClick={openRuling} reduce={reduce}>
                  {s.read}
                </PillButton>
              ) : null
            ) : (
              <>
                <PillButton onClick={advance} reduce={reduce}>
                  {phase === "intro" ? s.rise : last ? s.hearVerdict : `${s.next} · ${heard + 1}/${findings.length}`}
                </PillButton>
                <button type="button" onClick={openRuling} className="rounded-full px-3 py-1 text-[calc(2.6*var(--k))] tracking-[0.14em] text-white/85 underline decoration-dotted underline-offset-4 outline-none focus-visible:ring-2">
                  {s.skip}
                </button>
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Confetti burst={burst} colors={court.confetti} count={170} origin={{ x: 0.5, y: 0.4 }} className="pointer-events-none absolute inset-0 z-[36]" />

      <AnimatePresence>
        {reading ? <RulingSheet key="sheet" data={data} mode={mode} blocks={blocks} photos={photos} s={s} t={t} reduce={reduce} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} onOpen={preview ? undefined : setActive} /> : null}
      </AnimatePresence>

      <AnimatePresence>{active !== null && photos[active] ? <Lightbox key="box" photo={photos[active]} onClose={() => setActive(null)} closeLabel={t("close")} /> : null}</AnimatePresence>

      {audio.hasMusic && mode !== "preview" ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

function Portrait({ id, court, caption, tilt }: { id: "round" | "blush" | "bow-kitten"; court: Court; caption: string; tilt: number }) {
  return (
    <figure className="m-0 flex w-[calc(19*var(--p))] flex-col items-center" style={{ rotate: `${tilt}deg` }}>
      <span className="relative block aspect-[4/5] w-full overflow-hidden rounded-[50%]" style={{ background: court.dark ? "#2B3160" : "#F7F0DE", boxShadow: `0 0 0 calc(1.3*var(--p)) ${court.brass.deep}, 0 0 0 calc(1.8*var(--p)) ${court.brass.light}, 0 calc(1.4*var(--p)) calc(2.6*var(--p)) rgba(0,0,0,.35)` }}>
        <MemeSticker id={id} width="118%" shadow={false} className="absolute top-[8%] left-1/2 -translate-x-1/2" />
      </span>
      <figcaption className="mt-[calc(2.4*var(--p))] w-full">
        <NamePlate court={court} className="mx-auto w-max max-w-full">
          {caption}
        </NamePlate>
      </figcaption>
    </figure>
  );
}

function PillButton({ children, onClick, reduce }: { children: React.ReactNode; onClick: () => void; reduce: boolean }) {
  return (
    <motion.button type="button" onClick={onClick} className="rounded-full px-[calc(6*var(--k))] py-[calc(2.4*var(--k))] text-[calc(3.2*var(--k))] font-bold tracking-[0.18em] uppercase shadow-[0_10px_30px_-8px_rgba(0,0,0,.6)] outline-none focus-visible:ring-4 focus-visible:ring-white/70" style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }} animate={{ scale: reduce ? 1 : [1, 1.05, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
      {children}
    </motion.button>
  );
}

function Member({ seat, index, label, saying, still, reduce, delay, disabled, onTap }: { seat: Seat; index: number; label: string; saying: { text: string; key: number } | null; still: boolean; reduce: boolean; delay: number; disabled: boolean; onTap: () => void }) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const key = saying?.key ?? 0;
  // Whoever has the floor leans over the bench to say it.
  useEffect(() => {
    if (!key || reduce || !scope.current) return;
    void animate(scope.current, { y: ["0%", "-16%", "0%", "-6%", "0%"], rotate: [0, -5, 4, -2, 0], scale: [1, 1.1, 1.02, 1.05, 1] }, { duration: 0.7, ease: "easeOut" });
  }, [key, reduce, animate, scope]);
  const side = seat.x < 30 ? "left" : seat.x > 70 ? "right" : "middle";

  return (
    <motion.div className="absolute" style={{ left: `${seat.x}%`, bottom: `calc(${-seat.sink} * var(--p))`, width: `calc(${seat.w} * var(--p))`, translate: "-50% 0", rotate: `${seat.rotate}deg`, zIndex: saying ? 7 : index === 2 ? 4 : 3 }} initial={still ? false : { y: "110%" }} animate={{ y: 0 }} transition={{ delay, type: "spring", stiffness: 190, damping: 15 }}>
      <div className={cn(!still && (index % 2 ? "tc-sway" : "tc-breathe"))} style={{ "--pace": `${3 + index * 0.45}s` } as CSSProperties}>
        <span ref={scope} className="block will-change-transform">
          <MemeSticker id={seat.id} width="100%" />
        </span>
      </div>
      <button type="button" data-seat={index} aria-label={label} disabled={disabled} onClick={onTap} className="absolute inset-x-[8%] top-[4%] bottom-[24%] rounded-[30%] outline-none focus-visible:ring-4 focus-visible:ring-white/80" />
      <AnimatePresence>
        {saying ? (
          <motion.span key={saying.key} role="status" className="pointer-events-none absolute bottom-[96%] z-[2]" style={{ ...(side === "left" ? { left: "6%" } : side === "right" ? { right: "6%" } : { left: "50%", translate: "-50% 0" }), rotate: `${-seat.rotate}deg` }} initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.3, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.14 } }} transition={{ type: "spring", stiffness: 420, damping: 17 }}>
            <Bubble side={side} below={false}>
              {saying.text}
            </Bubble>
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function Ruling({ s, court, name, charge, verdict, stamped, caseNo, reduce, still }: { s: Copy; court: Court; name: string; charge: string; verdict: Verdict; stamped: boolean; caseNo: string; reduce: boolean; still: boolean }) {
  return (
    <motion.div className="absolute top-[7%] left-1/2 z-[12] w-[calc(86*var(--p))]" style={{ translate: "-50% 0" }} initial={still || reduce ? false : { y: "130%", rotate: 7 }} animate={{ y: 0, rotate: -1.2 }} exit={{ opacity: 0 }} transition={{ delay: still || reduce ? 0 : 1.15, type: "spring", stiffness: 120, damping: 17 }}>
      <div className="relative px-[calc(6*var(--p))] pt-[calc(6*var(--p))] pb-[calc(5*var(--p))] text-center text-[#2B211A] shadow-[0_calc(2*var(--p))_calc(5*var(--p))_rgba(0,0,0,.45)]" style={{ backgroundColor: "#FBF3DF", backgroundImage: PAPER_GRAIN }}>
        <span aria-hidden="true" className="pointer-events-none absolute inset-[calc(1.8*var(--p))] border-[calc(.5*var(--p))] border-double" style={{ borderColor: court.brass.deep, borderWidth: "calc(1.1*var(--p))" }} />
        <p className="relative text-[calc(2.3*var(--p))] font-bold tracking-[0.3em] uppercase opacity-60">
          {s.caseNo} {caseNo}
        </p>
        <h2 className="relative mt-[calc(1.4*var(--p))] text-[calc(7.4*var(--p))] leading-none font-black tracking-tight uppercase" style={{ fontFamily: POSTER_FONT }}>
          {s.ruling}
        </h2>
        <p className="relative mx-auto mt-[calc(3*var(--p))] max-w-[92%] text-[calc(3.5*var(--p))] leading-[1.25]" style={{ fontFamily: "var(--gift-font-display)" }}>
          {s.matter.replace("{charge}", charge)}
        </p>
        <p className="relative mt-[calc(1.6*var(--p))] truncate text-[calc(9*var(--p))] leading-[1.05]" style={{ fontFamily: "var(--gift-font-hand)" }}>
          {name}
        </p>
        <div className="relative mt-[calc(1*var(--p))] grid h-[calc(21*var(--p))] place-items-center">
          <AnimatePresence>
            {stamped ? (
              <motion.div key="stamp" initial={still || reduce ? false : { scale: 3.4, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -9 }} transition={{ type: "spring", stiffness: 520, damping: 22 }}>
                <Stamp word={s.stamps[verdict]} style={{ fontSize: `calc(${s.stamps[verdict].length > 9 ? 7.2 : 11} * var(--p))` }} />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        <p className="relative mx-auto max-w-[88%] text-[calc(3.3*var(--p))] leading-[1.25] italic" style={{ fontFamily: "var(--gift-font-display)" }}>
          {s.lines[verdict]}
        </p>
        <div className="relative mt-[calc(3.4*var(--p))] flex items-end justify-center gap-[calc(3*var(--p))]" style={{ color: "#3B2A1E" }}>
          {SEATS.map((seat, i) => (
            <Paw key={seat.id} className="h-[calc(6*var(--p))] w-[calc(6*var(--p))] opacity-80" color={i === 3 ? "#51657A" : undefined} />
          ))}
        </div>
        <p className="relative mt-[calc(1*var(--p))] text-[calc(2.2*var(--p))] font-bold tracking-[0.26em] uppercase opacity-55">{s.signed}</p>
      </div>
    </motion.div>
  );
}

function Lightbox({ photo, onClose, closeLabel }: { photo: GiftPhoto; onClose: () => void; closeLabel: string }) {
  return (
    <motion.div className="absolute inset-0 z-[60] grid place-items-center bg-black/80 p-[calc(5*var(--k))]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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

function RulingSheet({ data, mode, blocks, photos, s, t, reduce, onEvent, onReact, onMakeOne, onReplay, onOpen }: { data: TemplateProps<CouncilFields>["data"]; mode: TemplateProps["mode"]; blocks: ReturnType<typeof parseRichText>; photos: GiftPhoto[]; s: Copy; t: ReturnType<typeof useGiftStrings>; reduce: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void; onOpen?: (i: number) => void }) {
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
        <div className="shrink-0" style={{ height: mode === "preview" ? "min(60cqh, 560px)" : "min(24cqh, 260px)" }} />
        <div className="relative mx-auto w-[min(94cqw,600px)] flex-1 rounded-t-[calc(4*var(--k))] bg-[#FBF3DF] px-[calc(5*var(--k))] pt-[calc(7*var(--k))] pb-[calc(72px+env(safe-area-inset-bottom))] text-[#2B211A] shadow-[0_-24px_60px_-20px_rgba(0,0,0,.55)]" style={{ backgroundImage: PAPER_GRAIN }}>
          <MemeSticker id="lawyer" width="calc(19*var(--k))" className="absolute -top-[calc(13.5*var(--k))] right-[calc(5*var(--k))] rotate-3" />
          {photos.length ? (
            <section className="relative -mx-[calc(5*var(--k))] mb-[calc(5*var(--k))]">
              <p className="mb-[calc(1*var(--k))] text-center text-[calc(2.6*var(--k))] font-bold tracking-[0.26em] uppercase opacity-60">{s.evidence}</p>
              <div className="scrollbar-none flex snap-x snap-mandatory gap-[calc(4*var(--k))] overflow-x-auto px-[calc(6*var(--k))] pt-[calc(4*var(--k))] pb-[calc(3*var(--k))]">
                {photos.map((photo, i) => (
                  <motion.button key={photo.id} type="button" aria-label={photo.caption || photo.alt || "photo"} onClick={() => onOpen?.(i)} className="relative m-0 w-[calc(40*var(--k))] shrink-0 snap-center bg-[#FFFDF8] p-[calc(1.6*var(--k))] pb-[calc(2.4*var(--k))] text-left shadow-[0_16px_26px_-14px_rgba(0,0,0,.5)] outline-none focus-visible:ring-4 focus-visible:ring-black/30" style={{ rotate: `${(i % 2 ? 1 : -1) * (1.5 + (i % 3))}deg` }} initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
                    <span className="absolute -top-[calc(1.6*var(--k))] left-1/2 z-[1] -translate-x-1/2 -rotate-2 px-[calc(2*var(--k))] py-[calc(.5*var(--k))] text-[calc(2.3*var(--k))] font-black tracking-[0.2em] whitespace-nowrap uppercase" style={{ background: "var(--gift-accent)", color: "var(--gift-on-accent)" }}>
                      {s.exhibit} {exhibitLetter(i)}
                    </span>
                    <div className="aspect-[4/3] overflow-hidden bg-[#E9E1D6]">
                      <img src={photo.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
                    </div>
                    <span className="mt-[calc(1.4*var(--k))] block min-h-[calc(4*var(--k))] truncate text-center text-[calc(3.2*var(--k))] leading-tight" style={{ fontFamily: "var(--gift-font-hand)" }}>
                      {photo.caption ?? ""}
                    </span>
                  </motion.button>
                ))}
              </div>
            </section>
          ) : null}

          <article className="relative">
            <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="type" accent={data.accentColor} />
          </article>

          {data.music?.title ? (
            <p className="mt-[calc(6*var(--k))] text-center text-[calc(2.6*var(--k))] tracking-[0.2em] uppercase opacity-55">
              {s.playing} · {data.music.title}
              {data.music.artist ? ` — ${data.music.artist}` : ""}
            </p>
          ) : null}

          {data.countdown ? (
            <div className="mt-[calc(6*var(--k))] rounded-[calc(2*var(--k))] bg-[#EFE2C4] p-[calc(4*var(--k))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ backgroundImage: PAPER_GRAIN }}>
              <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
            </div>
          ) : null}

          {data.surprise ? (
            <div className="mt-[calc(6*var(--k))] rounded-[calc(2*var(--k))] bg-[#EFE2C4] px-[calc(4*var(--k))] pt-[calc(5*var(--k))] pb-[calc(4*var(--k))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ backgroundImage: PAPER_GRAIN }}>
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
