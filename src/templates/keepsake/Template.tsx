"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
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
import { COLLAGE_KEYFRAMES, CollageContext, Lightbox, Piece, Scrap, ScrollHint, TornPaper, useReadProgress } from "../_shared/collage/kit";
import { Ticket } from "../_shared/collage/cards";
import { initials, ticketNumber } from "../_shared/collage/paper";
import { playChime, playClasp, playPaper, playSealCrack } from "../_shared/collage/sounds";
import { buzz } from "../_shared/memes/sounds";
import { DeckleFrame, Locket, Parcel, TornWord } from "./art";
import { LOOKS, pressedHeight, pressedSpots, type Look, type LookId } from "./looks";
import { fieldsSchema, type KeepsakeFields } from "./schema";

type Copy = { breakSeal: string; dearest: string; from: string; scroll: string; word: string; ticket: string; openLocket: string; closeLocket: string; tapLocket: string; no: string };

const S: Record<"en" | "es", Copy> = {
  en: { breakSeal: "break the seal", dearest: "My dearest,", from: "from", scroll: "scroll", word: "Happiness", ticket: "ticket to happiness", openLocket: "Open the locket", closeLocket: "Close the locket", tapLocket: "tap the locket", no: "No." },
  es: { breakSeal: "rompe el sello", dearest: "Mi vida,", from: "de", scroll: "desliza", word: "Felicidad", ticket: "billete a la felicidad", openLocket: "Abrir el relicario", closeLocket: "Cerrar el relicario", tapLocket: "toca el relicario", no: "N.º" },
};

type Stage = "sealed" | "breaking" | "open";
type Data = TemplateProps<KeepsakeFields>["data"];

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<KeepsakeFields>) {
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
  const lookId: LookId = fields.look in LOOKS ? fields.look : "kraft";
  const look = LOOKS[lookId];

  const [stage, setStage] = useState<Stage>(preview ? "open" : "sealed");
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const breakSeal = () => {
    if (stage !== "sealed") return;
    void audio.start();
    playSealCrack(audio.muted);
    buzz(20);
    eventRef.current?.({ type: "started" });
    setStage("breaking");
    window.setTimeout(() => playPaper(audio.muted), reduce ? 0 : 420);
    window.setTimeout(
      () => {
        setBurst((b) => b + 1);
        playChime(audio.muted);
        setStage("open");
        eventRef.current?.({ type: "progress", pct: 30 });
      },
      reduce ? 250 : 1250,
    );
  };

  const replay = () => {
    setStage("sealed");
    setRun((r) => r + 1);
  };

  const vars = { "--k": "min(var(--u), 0.5cqh)", "--p": "min(1cqw, 5.4px)" } as CSSProperties;
  const unit = size.ready ? Math.min(size.width / 100, 5.4) : 3.9;

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ backgroundColor: look.wall, color: look.ink, fontFamily: "var(--gift-font-body)", ...vars }}>
      <style>{COLLAGE_KEYFRAMES}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: `${PAPER_GRAIN}, repeating-linear-gradient(8deg, rgba(90,60,20,.05) 0 1px, transparent 1px 5px)`, opacity: 0.85 }} />
      <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true">
        <Ambience layers={[{ kind: "dust", colors: ["#FFFFFF", "#FFEFC2"], count: 16 }]} opacity={0.7} />
      </div>

      <AnimatePresence mode="wait">
        {stage !== "open" ? (
          <motion.div key={`sealed-${run}`} className="absolute inset-0 z-10 grid place-items-center" exit={{ opacity: 0, scale: 1.05, transition: { duration: 0.4 } }}>
            <motion.div className="w-[calc(86*var(--p))]" initial={reduce ? false : { opacity: 0, y: 30, rotate: 5 }} animate={{ opacity: 1, y: 0, rotate: 2 }} transition={{ type: "spring", stiffness: 80, damping: 14 }}>
              <Parcel look={look} dearest={s.dearest} name={data.recipientName} from={`${s.from} ${data.senderName}`} broken={stage === "breaking"} reduce={reduce} />
            </motion.div>
            <button type="button" onClick={breakSeal} aria-label={s.breakSeal} className="absolute inset-0 z-[5] outline-none focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-inset" />
            <motion.p aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[max(9cqh,64px)] z-[4] mx-auto w-max rounded-full px-[calc(4.5*var(--k))] py-[calc(1.7*var(--k))] text-[calc(3.1*var(--k))] font-semibold tracking-[0.22em] uppercase backdrop-blur-sm" style={{ background: "rgba(255,252,244,.86)", color: "#6E1F1F", boxShadow: "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(40,20,5,.22)" }} initial={{ opacity: 0 }} animate={stage === "breaking" ? { opacity: 0 } : { opacity: 1, scale: reduce ? 1 : [1, 1.05, 1] }} transition={stage === "breaking" ? { duration: 0.2 } : { opacity: { delay: 0.9, duration: 0.5 }, scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}>
              {s.breakSeal}
            </motion.p>
          </motion.div>
        ) : (
          <Page key={`page-${run}`} look={look} s={s} data={data} fields={fields} mode={mode} still={preview || reduce} reduce={reduce} unit={unit} muted={audio.muted} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
        )}
      </AnimatePresence>

      <Confetti burst={burst} colors={look.confetti} count={110} origin={{ x: 0.5, y: 0.45 }} className="pointer-events-none absolute inset-0 z-[36]" />
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

function Page({ look, s, data, fields, mode, still, reduce, unit, muted, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: Data; fields: KeepsakeFields; mode: TemplateProps["mode"]; still: boolean; reduce: boolean; unit: number; muted: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const scroller = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState(false);
  const [active, setActive] = useState<GiftPhoto | null>(null);
  const preview = mode === "preview";
  // The editor's still frame shows the locket open, so the photo inside can be checked.
  const [locketOpen, setLocketOpen] = useState(preview);
  useReadProgress(scroller, endRef, mode, onEvent, () => setMoved(true));

  const seed = hashString(`${data.recipientName}|${data.senderName}|keepsake`);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const [hero, second] = data.photos;
  const rest = data.photos.slice(2, 9);
  const spots = pressedSpots(rest.length);
  const openPhoto = preview ? undefined : setActive;
  const context = useMemo(() => ({ container: scroller, still, unit }), [still, unit]);
  const engraved = initials(data.recipientName, data.senderName);

  const toggleLocket = () => {
    if (preview) return;
    playClasp(muted);
    buzz(10);
    setLocketOpen((o) => !o);
  };

  return (
    <CollageContext.Provider value={context}>
      <motion.div className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div ref={scroller} data-scroller="" className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none">
          <div className="relative mx-auto w-[calc(100*var(--p))] pt-[calc(9*var(--p))] pb-[calc(72px+env(safe-area-inset-bottom))]">
            <section className="relative h-[calc(196*var(--p))]">
              <Piece x={35} y={15} w={58} rotate={-3} z={3} entrance="drop" delay={0.1}>
                <div className="px-[calc(4*var(--p))] py-[calc(3*var(--p))]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk, boxShadow: "0 calc(.8*var(--p)) calc(1.6*var(--p)) rgba(40,20,5,.28)" }}>
                  <p className="text-[calc(6.4*var(--p))] leading-none" style={{ fontFamily: SCRIPT_FONT }}>
                    {s.dearest}
                  </p>
                  <p className="mt-[calc(1*var(--p))] truncate text-[calc(10*var(--p))] leading-[1.05] italic" style={{ fontFamily: POSTER_FONT }}>
                    {data.recipientName}
                  </p>
                </div>
              </Piece>
              <Piece x={83} y={28} w={38} rotate={9} z={5} drift={4} sway entrance="right" delay={0.5}>
                <Scrap id="dried-flowers" eager />
              </Piece>

              <Piece x={47} y={84} w={76} rotate={-2} z={4} entrance="drop" delay={0.3}>
                <DeckleFrame photo={hero} seed={seed + 1} look={look} number={`${s.no} 01`} onOpen={openPhoto && hero ? () => openPhoto(hero) : undefined} still={still} />
              </Piece>
              <Piece x={7} y={141} w={40} rotate={-24} z={6} drift={6} entrance="left" delay={0.7}>
                <Scrap id="leaf-skeleton" eager />
              </Piece>
              <Piece x={93} y={98} w={20} rotate={14} z={6} entrance="stamp" delay={1}>
                <Scrap id="kiss-4" eager />
              </Piece>

              <Piece x={68} y={146} w={54} rotate={6} z={7} entrance="right" delay={0.25}>
                <Ticket line={fields.ticket?.trim() || s.ticket} number={ticketNumber(seed)} paper={look.ticket} ink="#3A1F22" font={POSTER_FONT} />
              </Piece>
              <Piece x={33} y={172} w={62} rotate={-4} z={6} entrance="left" delay={0.35}>
                <TornWord word={fields.word?.trim() || s.word} seed={seed + 2} look={look} />
              </Piece>
              <Piece x={86} y={178} w={28} rotate={16} z={7} drift={3} entrance="bloom" delay={0.5}>
                <Scrap id="columbine" />
              </Piece>
            </section>

            <div className="relative z-[9] flex justify-center py-[calc(4*var(--p))]">
              <ScrollHint label={s.scroll} color={look.ink} hidden={moved || preview} />
            </div>

            {/* the locket */}
            <section className="relative h-[calc(132*var(--p))]">
              <Piece x={14} y={20} w={40} rotate={-12} z={2} drift={4} entrance="left">
                <Scrap id="roses-kraft" />
              </Piece>
              <Piece x={88} y={104} w={36} rotate={10} z={2} drift={3} entrance="right">
                <Scrap id="peony-kraft" />
              </Piece>
              <motion.div className="absolute inset-x-0 top-[calc(34*var(--p))] z-[5]" initial={still ? false : { opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ type: "spring", stiffness: 90, damping: 14 }}>
                <Locket photo={second ?? hero} initials={engraved} engraving={fields.engraving?.trim() || engraved} open={locketOpen} reduce={reduce} label={locketOpen ? s.closeLocket : s.openLocket} onToggle={toggleLocket} />
              </motion.div>
              <motion.p aria-hidden="true" className="absolute inset-x-0 top-[calc(100*var(--p))] z-[5] text-center text-[calc(5.4*var(--p))] leading-none" style={{ fontFamily: SCRIPT_FONT, color: look.ink }} animate={{ opacity: locketOpen ? 0 : 0.8 }}>
                {s.tapLocket}
              </motion.p>
              <motion.p className="absolute inset-x-[10%] top-[calc(98*var(--p))] z-[5] truncate text-center text-[calc(4.4*var(--p))]" style={{ fontFamily: "var(--gift-font-hand)", color: look.ink }} animate={{ opacity: locketOpen ? 0.9 : 0 }} transition={{ delay: locketOpen ? 0.7 : 0 }}>
                {(second ?? hero)?.caption}
              </motion.p>
            </section>

            {/* the rest, pressed in like pages */}
            {rest.length ? (
              <section className="relative" style={{ height: `calc(${pressedHeight(rest.length)} * var(--p))` }}>
                {rest.map((photo, i) => {
                  const spot = spots[i];
                  return (
                    <div key={photo.id}>
                      <Piece x={spot.x} y={spot.y} w={spot.w} rotate={spot.rotate} z={4} entrance={spot.side}>
                        <DeckleFrame photo={photo} seed={seed + 10 + i} look={look} number={`${s.no} ${String(i + 3).padStart(2, "0")}`} onOpen={openPhoto ? () => openPhoto(photo) : undefined} still={still} />
                      </Piece>
                      <Piece {...spot.companion} z={3} drift={4} entrance={spot.side === "left" ? "right" : "left"} delay={0.15}>
                        <Scrap id={spot.companion.scrap} />
                      </Piece>
                    </div>
                  );
                })}
                <Piece x={50} y={4} w={20} rotate={-14} z={6} entrance="bloom">
                  <Scrap id="bow-red" />
                </Piece>
              </section>
            ) : null}

            {/* the letter: typed, sealed at the foot */}
            <section className="relative mt-[calc(10*var(--p))] px-[calc(5*var(--p))]">
              <Piece x={20} y={0} w={46} rotate={-8} z={4} entrance="left">
                <Scrap id="locket" />
              </Piece>
              <Piece x={88} y={6} w={28} rotate={16} z={4} drift={3} entrance="right" delay={0.15}>
                <Scrap id="dried-flowers" />
              </Piece>
              <TornPaper seed={seed + 30} sides={{ top: true, bottom: true }} depth={1.3} color={look.paper} rim="#FFFFFF" grain={PAPER_GRAIN} className="z-[2]">
                <article className="px-[calc(6*var(--p))] pt-[calc(16*var(--p))] pb-[calc(16*var(--p))]" style={{ color: look.paperInk }}>
                  <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="type" accent={data.accentColor} />
                </article>
              </TornPaper>
              <div className="absolute inset-x-0 bottom-0 h-0">
                <Piece x={82} y={-4} w={26} rotate={-10} z={4} entrance="stamp" delay={0.3}>
                  <Scrap id="wax-seal" />
                </Piece>
              </div>
            </section>

            <div className="relative z-[2] mt-[calc(9*var(--p))] flex flex-col gap-[calc(7*var(--p))] px-[calc(6*var(--p))]">
              {data.countdown ? (
                <div className="p-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.5)]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk }}>
                  <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
                </div>
              ) : null}
              {data.surprise ? (
                <div className="relative mt-[calc(36*var(--p))] px-[calc(5*var(--p))] pt-[calc(30*var(--p))] pb-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.5)]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk }}>
                  <Piece x={44} y={-6} w={50} rotate={-5} z={3} entrance="drop">
                    <Scrap id="envelope-ps" />
                  </Piece>
                  <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
                </div>
              ) : null}
              <div ref={endRef} className="px-[calc(3*var(--p))] py-[calc(6*var(--p))]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk, boxShadow: "0 14px 26px -18px rgba(0,0,0,.5)" }}>
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
