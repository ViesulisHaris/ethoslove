"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { useContainerSize } from "../_shared/hooks/use-container-size";
import { hashString } from "../_shared/random";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { PAPER_GRAIN, POSTER_FONT, SCRIPT_FONT } from "../_shared/cover-kit";
import { Sticker } from "../_shared/covers/stickers";
import { Caption, COLLAGE_KEYFRAMES, CollageContext, Lightbox, Piece, Polaroid, Scrap, ScriptLines, ScrollHint, Shot, Tape, TornPaper, useReadProgress } from "../_shared/collage/kit";
import { CARD_KEYFRAMES, MusicCard, Postcard, Snippet, Stamp, Ticket } from "../_shared/collage/cards";
import { gingham, scriptLines, ticketNumber } from "../_shared/collage/paper";
import { playChime, playRibbon } from "../_shared/collage/sounds";
import { buzz } from "../_shared/memes/sounds";
import { SatinBow, satinBand } from "./art";
import { scatterHeight, scatterSpots } from "../_shared/collage/layout";
import { arrangePhotos, LOOKS, stripHeight, type Look, type LookId } from "./looks";
import { fieldsSchema, type CoquetteFields } from "./schema";

type Copy = { untie: string; for: string; from: string; scroll: string; note: string; label: string; ticket: string; loveYou: string; pause: string; play: string; script: string };

const S: Record<"en" | "es", Copy> = {
  en: { untie: "untie the bow", for: "for", from: "from", scroll: "scroll", note: "every good day i've had since has you somewhere in it", label: "my favourite person", ticket: "ticket to happiness", loveYou: "i love you", pause: "Pause the song", play: "Play the song", script: "my dearest, i kept every little thing. the tickets, the petals, the way you said my name the first time. with love, always, and then a little more" },
  es: { untie: "desata el lazo", for: "para", from: "de", scroll: "desliza", note: "todos los días buenos que he tenido desde entonces te tienen a ti en algún rincón", label: "mi persona favorita", ticket: "billete a la felicidad", loveYou: "te quiero", pause: "Pausar la canción", play: "Reproducir la canción", script: "mi amor, he guardado cada cosita. las entradas, los pétalos, la forma en que dijiste mi nombre la primera vez. con amor, siempre, y luego un poquito más" },
};

type Stage = "tied" | "untying" | "open";
type Data = TemplateProps<CoquetteFields>["data"];

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<CoquetteFields>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(rootRef);
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const preview = mode === "preview";
  const fields = useMemo(() => {
    const parsed = fieldsSchema.safeParse(data.fields);
    return parsed.success ? parsed.data : fieldsSchema.parse({});
  }, [data.fields]);
  const lookId: LookId = fields.look in LOOKS ? fields.look : "blush";
  const look = LOOKS[lookId];

  const [stage, setStage] = useState<Stage>(preview ? "open" : "tied");
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const untie = () => {
    if (stage !== "tied") return;
    void audio.start();
    playRibbon(audio.muted);
    buzz(12);
    eventRef.current?.({ type: "started" });
    setStage("untying");
    window.setTimeout(
      () => {
        setBurst((b) => b + 1);
        playChime(audio.muted);
        setStage("open");
        eventRef.current?.({ type: "progress", pct: 30 });
      },
      reduce ? 250 : 1050,
    );
  };

  const replay = () => {
    setStage("tied");
    setRun((r) => r + 1);
  };

  const vars = { "--k": "min(var(--u), 0.5cqh)", "--p": "min(1cqw, 5.4px)" } as CSSProperties;
  const unit = size.ready ? Math.min(size.width / 100, 5.4) : 3.9;

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ backgroundColor: look.wall, color: look.ink, fontFamily: "var(--gift-font-body)", ...gingham(look.check, "calc(6.25*var(--p))"), ...vars }}>
      <style>{COLLAGE_KEYFRAMES + CARD_KEYFRAMES}</style>
      <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true">
        <Ambience layers={look.ambience} opacity={0.75} />
      </div>

      <AnimatePresence mode="wait">
        {stage !== "open" ? (
          <Tied key={`tied-${run}`} look={look} s={s} data={data} untying={stage === "untying"} reduce={reduce} onUntie={untie} />
        ) : (
          <Page key={`page-${run}`} look={look} s={s} data={data} fields={fields} mode={mode} still={preview || reduce} unit={unit} audio={audio} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
        )}
      </AnimatePresence>

      <Confetti burst={burst} colors={look.confetti} count={130} origin={{ x: 0.5, y: 0.42 }} className="pointer-events-none absolute inset-0 z-[36]" />
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The page still wrapped: a ribbon round it both ways, the bow where they cross, and a tag with their name. */
function Tied({ look, s, data, untying, reduce, onUntie }: { look: Look; s: Copy; data: Data; untying: boolean; reduce: boolean; onUntie: () => void }) {
  const slide = { duration: reduce ? 0.15 : 0.8, ease: [0.6, 0, 0.3, 1] as const };
  return (
    <motion.div className="absolute inset-0 z-10" exit={{ opacity: 0, transition: { duration: 0.35 } }}>
      <motion.span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-[calc(11*var(--p))] -translate-x-1/2" style={{ background: satinBand(look.satin, false), boxShadow: "0 0 calc(2*var(--p)) rgba(80,20,45,.25)" }} animate={untying ? { y: "105%" } : { y: 0 }} transition={slide} />
      <motion.span aria-hidden="true" className="absolute inset-x-0 top-[42%] h-[calc(11*var(--p))] -translate-y-1/2" style={{ background: satinBand(look.satin, true), boxShadow: "0 0 calc(2*var(--p)) rgba(80,20,45,.25)" }} animate={untying ? { x: "105%" } : { x: 0 }} transition={{ ...slide, delay: untying && !reduce ? 0.08 : 0 }} />

      {/* the tag hangs from the knot on a thread */}
      <motion.div className="absolute top-[42%] left-1/2 z-[3] w-[calc(48*var(--p))] origin-top" style={{ x: "-4%", rotate: 7 }} initial={reduce ? false : { opacity: 0, rotate: 24 }} animate={untying ? { opacity: 0, y: "70%", rotate: 30 } : { opacity: 1, y: 0, rotate: 7 }} transition={untying ? slide : { delay: 0.5, type: "spring", stiffness: 60, damping: 8 }}>
        <span aria-hidden="true" className="mx-auto block h-[calc(30*var(--p))] w-px" style={{ background: look.satin.deep, opacity: 0.6 }} />
        <div className="relative rounded-[calc(1.6*var(--p))] px-[calc(4*var(--p))] pt-[calc(6*var(--p))] pb-[calc(4.4*var(--p))] text-center" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, clipPath: "polygon(22% 0, 78% 0, 100% 16%, 100% 100%, 0 100%, 0 16%)", boxShadow: "0 calc(1.2*var(--p)) calc(2.4*var(--p)) rgba(60,20,40,.3)" }}>
          <span aria-hidden="true" className="absolute top-[calc(2*var(--p))] left-1/2 block h-[calc(2.2*var(--p))] w-[calc(2.2*var(--p))] -translate-x-1/2 rounded-full" style={{ boxShadow: `inset 0 0 0 calc(.5*var(--p)) ${look.satin.mid}`, background: look.wall }} />
          <p className="text-[calc(2.6*var(--p))] font-semibold tracking-[0.34em] uppercase opacity-60">{s.for}</p>
          <p className="mt-[calc(.6*var(--p))] truncate text-[calc(11*var(--p))] leading-[1.05]" style={{ fontFamily: SCRIPT_FONT }}>
            {data.recipientName}
          </p>
          <p className="mt-[calc(1.4*var(--p))] truncate text-[calc(3.2*var(--p))] opacity-70" style={{ fontFamily: "var(--gift-font-hand)" }}>
            {s.from} {data.senderName}
          </p>
        </div>
      </motion.div>

      <motion.div className="absolute top-[42%] left-1/2 z-[2] w-[calc(78*var(--p))]" style={{ x: "-50%", y: "-41.2%" }} initial={reduce ? false : { scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 120, damping: 12, delay: 0.15 }}>
        <SatinBow id="cq-bow" satin={look.satin} untied={untying} reduce={reduce} className="relative w-full" />
      </motion.div>

      <button type="button" onClick={onUntie} aria-label={s.untie} className="absolute inset-0 z-[5] outline-none focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-inset" />
      <motion.p aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[max(9cqh,64px)] z-[4] mx-auto w-max rounded-full px-[calc(4.5*var(--k))] py-[calc(1.7*var(--k))] text-[calc(3.1*var(--k))] font-semibold tracking-[0.22em] uppercase backdrop-blur-sm" style={{ background: "rgba(255,255,255,.85)", color: look.satin.deep, boxShadow: "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(70,25,45,.18)" }} initial={{ opacity: 0 }} animate={untying ? { opacity: 0 } : { opacity: 1, scale: reduce ? 1 : [1, 1.05, 1] }} transition={untying ? { duration: 0.2 } : { opacity: { delay: 0.9, duration: 0.5 }, scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}>
        {s.untie}
      </motion.p>
    </motion.div>
  );
}

function Page({ look, s, data, fields, mode, still, unit, audio, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: Data; fields: CoquetteFields; mode: TemplateProps["mode"]; still: boolean; unit: number; audio: ReturnType<typeof useGiftAudio>; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const scroller = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState(false);
  const [active, setActive] = useState<GiftPhoto | null>(null);
  useReadProgress(scroller, endRef, mode, onEvent, () => setMoved(true));

  const seed = hashString(`${data.recipientName}|${data.senderName}|coquette`);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const lines = useMemo(() => scriptLines(data.message, s.script, 16, seed), [data.message, s.script, seed]);
  const { hero, strip, scatter } = arrangePhotos(data.photos);
  const spots = scatterSpots(scatter.length);
  const f = look.flowers;
  const hasSong = Boolean(data.music?.title);
  const heroH = hasSong ? 188 : 158;
  const stripH = Math.max(stripHeight(strip.length) + 16, 124);
  const frame = { backgroundColor: look.frame, ...gingham(look.frameCheck, "calc(1.3*var(--p))") } as CSSProperties;
  const open = mode === "preview" ? undefined : setActive;
  const context = useMemo(() => ({ container: scroller, still, unit }), [still, unit]);
  const paper = (n: number, sides = { top: true, right: true, bottom: true, left: true }) => ({ seed: seed + n, sides, color: look.scriptPaper, grain: PAPER_GRAIN, depth: 4 });

  return (
    <CollageContext.Provider value={context}>
      <motion.div className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div ref={scroller} data-scroller="" className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none">
          <div className="relative mx-auto w-[calc(100*var(--p))] pt-[calc(9*var(--p))] pb-[calc(72px+env(safe-area-inset-bottom))]">
            {/* the first screen: the two of them, in flowers */}
            <section className="relative" style={{ height: `calc(${heroH} * var(--p))` }}>
              <TornPaper {...paper(1)} className="absolute" style={{ left: "calc(-9*var(--p))", top: "calc(-16*var(--p))", width: "calc(66*var(--p))", height: "calc(65*var(--p))", rotate: "-3deg" }}>
                <div className="relative h-[calc(65*var(--p))]">
                  <ScriptLines lines={lines.slice(0, 8)} color={look.scriptInk} font={SCRIPT_FONT} />
                </div>
              </TornPaper>
              <TornPaper {...paper(2)} className="absolute" style={{ left: "calc(54*var(--p))", top: "calc(92*var(--p))", width: "calc(58*var(--p))", height: `calc(${heroH - 84} * var(--p))`, rotate: "2deg" }}>
                <div className="relative" style={{ height: `calc(${heroH - 84} * var(--p))` }}>
                  <ScriptLines lines={lines.slice(8)} color={look.scriptInk} font={SCRIPT_FONT} />
                </div>
              </TornPaper>

              <Piece x={20} y={111} w={38} rotate={-12} z={7} entrance="left" delay={0.95}>
                <Ticket line={fields.ticket?.trim() || s.ticket} number={ticketNumber(seed)} paper={look.scriptPaper} ink={look.ink} font={POSTER_FONT} />
              </Piece>

              <Piece x={47} y={12} w={54} rotate={-3} z={3} entrance="drop" delay={0.1}>
                <TornPaper seed={seed + 5} sides={{ top: true, right: true, bottom: true, left: true }} color={look.paper} grain={PAPER_GRAIN} depth={5}>
                  <p className="px-[calc(4*var(--p))] pt-[calc(2.6*var(--p))] pb-[calc(3*var(--p))] text-center">
                    <span className="block text-[calc(2.3*var(--p))] font-semibold tracking-[0.36em] uppercase opacity-55">{s.for}</span>
                    <span className="block truncate text-[calc(11*var(--p))] leading-[1.1]" style={{ fontFamily: SCRIPT_FONT }}>
                      {data.recipientName}
                    </span>
                  </p>
                </TornPaper>
              </Piece>

              <Piece x={53} y={64} w={68} rotate={-3} z={4} entrance="drop" delay={0.35}>
                <Tape color={look.tape} width={20} className="-top-[calc(2*var(--p))] left-[34%] z-[1] -rotate-3" />
                <Polaroid photo={hero} lip={10} onOpen={open && hero ? () => open(hero) : undefined} still={still}>
                  <Caption size={3.8}>{hero?.caption}</Caption>
                </Polaroid>
              </Piece>

              <Piece x={84} y={30} w={27} rotate={12} z={6} entrance="bloom" delay={0.7}>
                <Scrap id="bow-gingham" eager style={{ filter: look.tint }} />
              </Piece>
              <Piece x={12} y={46} w={36} rotate={-16} z={5} drift={5} sway entrance="left" delay={0.55}>
                <Scrap id={f.spray} eager />
              </Piece>
              <Piece x={7} y={70} w={24} rotate={12} z={5} entrance="bloom" delay={0.75}>
                <Scrap id={f.small} eager />
              </Piece>
              <Piece x={15} y={86} w={27} rotate={-8} z={6} drift={3} entrance="bloom" delay={0.85}>
                <Scrap id={f.gold} eager />
              </Piece>
              <Piece x={88} y={107} w={40} rotate={18} z={6} drift={7} sway entrance="right" delay={0.65}>
                <Scrap id={f.lily} eager />
              </Piece>
              <Piece x={90} y={54} w={21} rotate={14} z={7} entrance="bloom" delay={1.1}>
                <div className={cn(!still && "cl-flutter")}>
                  <Sticker id="butterfly" />
                </div>
              </Piece>

              {hasSong && data.music ? (
                <Piece x={64} y={131} w={66} rotate={2} z={8} entrance="right" delay={0.2}>
                  <MusicCard music={data.music} audio={audio} cover={hero} live={mode !== "preview"} labels={{ pause: s.pause, play: s.play }} colors={look.card} />
                </Piece>
              ) : null}

              <Piece x={36} y={hasSong ? 163 : 132} w={66} rotate={-4} z={6} entrance="left" delay={0.3}>
                <Postcard
                  paper={look.paper}
                  ink={look.ink}
                  stamp={
                    <Stamp color={look.scriptPaper}>
                      <span className="block w-[62%]">
                        <Sticker id="heart" />
                      </span>
                    </Stamp>
                  }
                >
                  {fields.note?.trim() || s.note}
                </Postcard>
              </Piece>

              <div className="absolute right-[calc(6*var(--p))] z-[9]" style={{ top: `calc(${heroH - 12} * var(--p))` }}>
                <ScrollHint label={s.scroll} color={look.ink} hidden={moved || mode === "preview"} />
              </div>
            </section>

            {/* the strip: three more, in gingham frames */}
            {strip.length ? (
              <section className="relative" style={{ height: `calc(${stripH} * var(--p))` }}>
                <Piece x={31} y={stripHeight(strip.length) / 2 + 8} w={50} rotate={-2} z={3} entrance="stick">
                  <div className="flex w-full flex-col" style={{ ...frame, padding: "calc(2.4*var(--p)) calc(2.4*var(--p)) calc(6*var(--p))", gap: "calc(2.4*var(--p))", boxShadow: "0 calc(1.3*var(--p)) calc(2.8*var(--p)) rgba(40,18,22,.3)" }}>
                    {strip.map((photo) => (
                      <div key={photo.id} style={{ boxShadow: "0 0 0 calc(.35*var(--p)) rgba(255,255,255,.95)" }}>
                        <Shot photo={photo} aspect={1.18} onOpen={open ? () => open(photo) : undefined} still={still} />
                      </div>
                    ))}
                  </div>
                </Piece>
                <Piece x={77} y={42} w={56} rotate={10} z={1} entrance="bloom">
                  <Scrap id="doily-pink" shadow={false} style={{ filter: look.tint, opacity: 0.95 }} />
                </Piece>
                <Piece x={75} y={36} w={38} rotate={-8} z={3} sway entrance="bloom" delay={0.1}>
                  <Scrap id={f.hibiscus} />
                </Piece>
                <Piece x={91} y={61} w={25} rotate={20} z={4} entrance="bloom" delay={0.2}>
                  <Scrap id={f.plumeria} />
                </Piece>
                <Piece x={69} y={68} w={35} rotate={24} z={4} drift={5} entrance="right" delay={0.15}>
                  <Scrap id={f.soft} />
                </Piece>
                <Piece x={73} y={94} w={48} rotate={-5} z={5} entrance="stick" delay={0.25}>
                  <Snippet paper={look.paper} ink={look.ink} font={SCRIPT_FONT} size={5.6} className="w-full">
                    {fields.label?.trim() || s.label}
                  </Snippet>
                </Piece>
                {strip.length >= 3 ? (
                  <Piece x={77} y={120} w={38} rotate={5} z={3} entrance="stick" delay={0.1}>
                    <Scrap id="cats-cuddle" />
                  </Piece>
                ) : null}
                <Piece x={7} y={stripHeight(strip.length) + 4} w={22} rotate={-18} z={5} entrance="bloom" delay={0.3}>
                  <Scrap id={f.pale} />
                </Piece>
              </section>
            ) : null}

            {/* the rest of the photos, scattered in pairs */}
            {scatter.length ? (
              <section className="relative" style={{ height: `calc(${scatterHeight(scatter.length)} * var(--p))` }}>
                <TornPaper {...paper(3)} className="absolute" style={{ left: "calc(-8*var(--p))", top: "calc(8*var(--p))", width: "calc(60*var(--p))", height: "calc(70*var(--p))", rotate: "4deg" }}>
                  <div className="relative h-[calc(70*var(--p))]">
                    <ScriptLines lines={lines.slice(3, 13)} color={look.scriptInk} font={SCRIPT_FONT} />
                  </div>
                </TornPaper>
                {scatter.map((photo, i) => (
                  <Piece key={photo.id} {...spots[i]} z={4 + (i % 2)} entrance={i % 2 ? "right" : "left"} delay={(i % 2) * 0.12}>
                    <Polaroid photo={photo} lip={8} pattern={frame} onOpen={open ? () => open(photo) : undefined} still={still}>
                      <Caption>{photo.caption}</Caption>
                    </Polaroid>
                  </Piece>
                ))}
                <Piece x={50} y={9} w={20} rotate={-10} z={6} entrance="stamp">
                  <Scrap id="heart-print-pink" style={{ filter: look.tint }} />
                </Piece>
                <Piece x={93} y={24} w={18} rotate={16} z={6} entrance="bloom" delay={0.2}>
                  <Scrap id="star-felt" />
                </Piece>
                {scatter.length > 2 ? (
                  <>
                    <Piece x={50} y={74} w={34} rotate={4} z={7} entrance="stick">
                      <Snippet paper={look.paper} ink={look.satin.deep} font={SCRIPT_FONT} size={5.4} className="w-full">
                        {s.loveYou}
                      </Snippet>
                    </Piece>
                    <Piece x={8} y={94} w={24} rotate={-20} z={6} drift={4} entrance="bloom">
                      <Scrap id={f.coral} />
                    </Piece>
                  </>
                ) : null}
              </section>
            ) : null}

            {/* the letter */}
            <section className="relative mt-[calc(10*var(--p))] px-[calc(5*var(--p))]">
              <Piece x={10} y={-2} w={40} rotate={-24} z={4} drift={5} sway entrance="left">
                <Scrap id={f.star} />
              </Piece>
              <Piece x={92} y={4} w={26} rotate={18} z={4} entrance="bloom" delay={0.15}>
                <Scrap id={f.pale} />
              </Piece>
              <TornPaper seed={seed + 9} sides={{ top: true, bottom: true }} color={look.paper} grain={PAPER_GRAIN} depth={1.4} className="z-[2]">
                <article className="px-[calc(6*var(--p))] pt-[calc(15*var(--p))] pb-[calc(12*var(--p))]">
                  <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="hand" accent={data.accentColor} />
                </article>
              </TornPaper>
              <div className="absolute inset-x-0 bottom-0 h-0">
                <Piece x={88} y={-2} w={30} rotate={12} z={4} drift={3} entrance="right">
                  <Scrap id={f.gold} />
                </Piece>
              </div>
            </section>

            <div className="relative z-[2] mt-[calc(9*var(--p))] flex flex-col gap-[calc(7*var(--p))] px-[calc(6*var(--p))]">
              {data.countdown ? (
                <div className="rounded-[calc(3*var(--p))] p-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.ink }}>
                  <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
                </div>
              ) : null}
              {data.surprise ? (
                <div className="rounded-[calc(3*var(--p))] px-[calc(5*var(--p))] pt-[calc(6*var(--p))] pb-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.45)]" style={{ background: look.card.card, color: look.ink }}>
                  <p className="mb-[calc(3*var(--p))] text-center text-[calc(2.6*var(--p))] tracking-[0.24em] uppercase opacity-70">{t("ps")}</p>
                  <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
                </div>
              ) : null}
              <div ref={endRef} className="rounded-[calc(3*var(--p))] px-[calc(3*var(--p))] py-[calc(6*var(--p))]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.ink, boxShadow: "0 14px 26px -18px rgba(0,0,0,.45)" }}>
                <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
              </div>
            </div>
          </div>
        </div>
        <AnimatePresence>{active ? <Lightbox key="box" photo={active} onClose={() => setActive(null)} closeLabel={t("close")} /> : null}</AnimatePresence>
      </motion.div>
    </CollageContext.Provider>
  );
}
