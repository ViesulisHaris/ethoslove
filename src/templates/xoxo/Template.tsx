"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
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
import { PAPER_GRAIN, SCRIPT_FONT } from "../_shared/cover-kit";
import { Caption, COLLAGE_KEYFRAMES, CollageContext, Lightbox, Piece, Polaroid, Scrap, ScrollHint, useReadProgress } from "../_shared/collage/kit";
import { Snippet } from "../_shared/collage/cards";
import { scatterHeight, scatterSpots } from "../_shared/collage/layout";
import { RansomRows } from "../_shared/collage/ransom";
import { playChime, playPaper, playSmooch } from "../_shared/collage/sounds";
import { buzz } from "../_shared/memes/sounds";
import { Envelope, HeartScribble, LinesCard, MarkedLines } from "./art";
import { addKiss, highlightPlan, kissAt, LOOKS, type Kiss, type Look, type LookId } from "./looks";
import { fieldsSchema, type XoxoFields } from "./schema";

type Copy = { open: string; to: string; sealed: string; scroll: string; tap: string; headline: string; lines: string; word: string; yours: string; cardTitle: string };

const S: Record<"en" | "es", Copy> = {
  en: { open: "open it", to: "to", sealed: "sealed with a kiss", scroll: "scroll", tap: "tap anywhere to leave a kiss", headline: "my person", lines: "you walked in like it was nothing and now every song is about you. i'd choose you in every room, every lifetime, every single time.", word: "Love", yours: "all yours", cardTitle: "the lines i'd underline" },
  es: { open: "ábrelo", to: "para", sealed: "sellado con un beso", scroll: "desliza", tap: "toca donde quieras para dejar un beso", headline: "mi persona", lines: "entraste como si nada y ahora todas las canciones hablan de ti. te elegiría en cada habitación, en cada vida, todas las veces.", word: "Amor", yours: "todo tuyo", cardTitle: "las frases que subrayaría" },
};

type Stage = "sealed" | "opening" | "open";
type Data = TemplateProps<XoxoFields>["data"];

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<XoxoFields>) {
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
  const lookId: LookId = fields.look in LOOKS ? fields.look : "cream";
  const look = LOOKS[lookId];

  const [stage, setStage] = useState<Stage>(preview ? "open" : "sealed");
  const [burst, setBurst] = useState(0);
  const [run, setRun] = useState(0);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  const open = () => {
    if (stage !== "sealed") return;
    void audio.start();
    playSmooch(audio.muted);
    buzz(14);
    eventRef.current?.({ type: "started" });
    setStage("opening");
    window.setTimeout(() => playPaper(audio.muted), reduce ? 0 : 320);
    window.setTimeout(
      () => {
        setBurst((b) => b + 1);
        playChime(audio.muted);
        setStage("open");
        eventRef.current?.({ type: "progress", pct: 30 });
      },
      reduce ? 250 : 1300,
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
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: look.dark ? 0.3 : 0.6 }} />
      <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true">
        <Ambience layers={[{ kind: "hearts", colors: [look.red, "#FFFFFF"], count: 9 }]} opacity={look.dark ? 0.55 : 0.4} />
      </div>

      <AnimatePresence mode="wait">
        {stage !== "open" ? (
          <motion.div key={`sealed-${run}`} className="absolute inset-0 z-10 grid place-items-center" exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.35 } }}>
            <motion.div className="w-[calc(84*var(--p))]" initial={reduce ? false : { opacity: 0, y: 30, rotate: -7 }} animate={{ opacity: 1, y: 0, rotate: -3 }} transition={{ type: "spring", stiffness: 80, damping: 14 }}>
              <p className="mb-[calc(7*var(--p))] text-center text-[calc(6.4*var(--p))] leading-none" style={{ fontFamily: SCRIPT_FONT, color: look.red }}>
                {s.sealed}
              </p>
              <Envelope look={look} name={data.recipientName} to={s.to} opening={stage === "opening"} reduce={reduce} />
            </motion.div>
            <button type="button" onClick={open} aria-label={s.open} className="absolute inset-0 z-[5] outline-none focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-inset" />
            <motion.p aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[max(9cqh,64px)] z-[4] mx-auto w-max rounded-full px-[calc(4.5*var(--k))] py-[calc(1.7*var(--k))] text-[calc(3.1*var(--k))] font-semibold tracking-[0.22em] uppercase backdrop-blur-sm" style={{ background: look.dark ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.85)", color: look.dark ? "#FFF5F0" : look.red, boxShadow: "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(60,10,20,.2)" }} initial={{ opacity: 0 }} animate={stage === "opening" ? { opacity: 0 } : { opacity: 1, scale: reduce ? 1 : [1, 1.05, 1] }} transition={stage === "opening" ? { duration: 0.2 } : { opacity: { delay: 0.9, duration: 0.5 }, scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}>
              {s.open}
            </motion.p>
          </motion.div>
        ) : (
          <Page key={`page-${run}`} look={look} s={s} data={data} fields={fields} mode={mode} still={preview || reduce} unit={unit} muted={audio.muted} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
        )}
      </AnimatePresence>

      <Confetti burst={burst} colors={look.confetti} count={130} origin={{ x: 0.5, y: 0.45 }} className="pointer-events-none absolute inset-0 z-[36]" />
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

function Page({ look, s, data, fields, mode, still, unit, muted, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: Data; fields: XoxoFields; mode: TemplateProps["mode"]; still: boolean; unit: number; muted: boolean; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const scroller = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState(false);
  const [active, setActive] = useState<GiftPhoto | null>(null);
  const [kisses, setKisses] = useState<Kiss[]>([]);
  const count = useRef(0);
  useReadProgress(scroller, endRef, mode, onEvent, () => setMoved(true));

  const seed = hashString(`${data.recipientName}|${data.senderName}|xoxo`);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const lines = fields.lines?.trim() || s.lines;
  const plan = useMemo(() => highlightPlan(lines.split(/\s+/).filter(Boolean).length, seed), [lines, seed]);
  const rows = useMemo(() => (fields.headline?.trim() || s.headline).split(/\s+/).filter(Boolean).slice(0, 3), [fields.headline, s.headline]);
  const letter = Math.min(10.5, 56 / Math.max(1, ...rows.map((r) => r.length)) - 1);
  const [hero, second, third] = data.photos;
  const rest = data.photos.slice(3, 9);
  const spots = scatterSpots(rest.length);
  const pairH = third ? 182 : second ? 104 : 0;
  const preview = mode === "preview";
  const openPhoto = preview ? undefined : setActive;
  const context = useMemo(() => ({ container: scroller, still, unit }), [still, unit]);

  // A tap on the page, anywhere that isn't a photo or a button, leaves a kiss there.
  const kiss = (e: MouseEvent<HTMLDivElement>) => {
    if (preview || !column.current) return;
    if ((e.target as HTMLElement).closest("button, a, input, textarea, [role=button]")) return;
    const box = column.current.getBoundingClientRect();
    count.current += 1;
    playSmooch(muted);
    buzz(8);
    setKisses((list) => addKiss(list, kissAt(count.current, (e.clientX - box.left) / unit, (e.clientY - box.top) / unit, seed)));
  };

  return (
    <CollageContext.Provider value={context}>
      <motion.div className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div ref={scroller} data-scroller="" className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" onClick={kiss}>
          <div ref={column} className="relative mx-auto w-[calc(100*var(--p))] pt-[calc(9*var(--p))] pb-[calc(72px+env(safe-area-inset-bottom))]">
            <section className="relative h-[calc(196*var(--p))]">
              <Piece x={80} y={20} w={72} rotate={180} z={1} drift={4} entrance="none">
                <Scrap id="lace-red" shadow={false} eager style={{ opacity: look.dark ? 0.9 : 0.8 }} />
              </Piece>
              <div className="absolute top-[calc(1*var(--p))] left-[calc(5*var(--p))] z-[5]">
                <RansomRows rows={rows} size={letter} tiles={look.tiles} seed={seed % 83} className="!items-start" />
              </div>

              <Piece x={45} y={76} w={88} rotate={-8} z={2} drift={3} entrance="bloom" delay={0.1}>
                <Scrap id="doily-red" shadow={false} eager />
              </Piece>
              <Piece x={45} y={75} w={66} rotate={-5} z={4} entrance="drop" delay={0.3}>
                <Polaroid photo={hero} lip={14} paper={look.paper} onOpen={openPhoto && hero ? () => openPhoto(hero) : undefined} still={still}>
                  <span className="flex w-full items-center gap-[calc(2*var(--p))]">
                    <span className="min-w-0 flex-1 text-left">
                      <Caption size={3.7} color={look.paperInk}>
                        {hero?.caption}
                      </Caption>
                    </span>
                    <HeartScribble color={look.red} still={still} className="h-[calc(8*var(--p))] w-[calc(19*var(--p))] shrink-0" />
                  </span>
                </Polaroid>
              </Piece>
              <Piece x={77} y={38} w={23} rotate={16} z={7} entrance="bloom" delay={0.75}>
                <Scrap id="bow-red" eager />
              </Piece>
              <Piece x={86} y={58} w={34} rotate={18} z={6} entrance="stamp" delay={0.95}>
                <Scrap id="kiss-red" eager />
              </Piece>
              <Piece x={8} y={121} w={26} rotate={-24} z={6} entrance="stamp" delay={1.15}>
                <Scrap id="kiss-1" eager />
              </Piece>
              <Piece x={83} y={119} w={28} rotate={10} z={3} entrance="stamp" delay={1.3}>
                <Scrap id="kiss-dark" eager />
              </Piece>

              <Piece x={57} y={158} w={78} rotate={2} z={8} entrance="right" delay={0.2}>
                <LinesCard look={look} music={data.music?.title ? data.music : undefined} cover={hero} fallbackTitle={s.cardTitle} fallbackArtist={data.senderName}>
                  <MarkedLines text={lines} plan={plan} red={look.red} />
                </LinesCard>
              </Piece>
              <Piece x={12} y={146} w={25} rotate={-14} z={9} entrance="stamp" delay={0.5}>
                <Scrap id="heart-print" />
              </Piece>
            </section>

            <div className="relative z-[9] flex flex-col items-center gap-[calc(3*var(--p))] py-[calc(5*var(--p))]">
              <p className="text-center text-[calc(4.6*var(--p))] leading-none" style={{ fontFamily: SCRIPT_FONT, color: look.red }}>
                {s.tap}
              </p>
              <ScrollHint label={s.scroll} color={look.ink} hidden={moved || preview} />
            </div>

            {/* the second and third photos, and the two of them as cats */}
            {second ? (
              <section className="relative" style={{ height: `calc(${pairH} * var(--p))` }}>
                <Piece x={15} y={26} w={30} rotate={-10} z={5} drift={4} entrance="left">
                  <Scrap id="heart-anatomical" />
                </Piece>
                <Piece x={17} y={50} w={26} rotate={-6} z={6} entrance="stick" delay={0.2}>
                  <Snippet paper={look.paper} ink={look.paperInk} font="'Courier New', ui-monospace, monospace" size={3} className="w-full tracking-[0.12em] uppercase">
                    {s.yours}
                  </Snippet>
                </Piece>
                <Piece x={62} y={50} w={64} rotate={5} z={4} entrance="right">
                  <Polaroid photo={second} lip={17} paper={look.paper} onOpen={openPhoto ? () => openPhoto(second) : undefined} still={still}>
                    <span className="block max-w-full truncate text-[calc(11*var(--p))] leading-[1.05]" style={{ fontFamily: SCRIPT_FONT, color: look.paperInk }}>
                      {fields.word?.trim() || s.word}
                    </span>
                  </Polaroid>
                </Piece>
                <Piece x={92} y={92} w={26} rotate={-16} z={6} entrance="stamp" delay={0.3}>
                  <Scrap id="kiss-2" />
                </Piece>
                {third ? (
                  <>
                    <Piece x={25} y={100} w={23} rotate={22} z={3} entrance="stamp" delay={0.1}>
                      <Scrap id="kiss-3" />
                    </Piece>
                    <Piece x={37} y={140} w={60} rotate={-6} z={4} entrance="left">
                      <Polaroid photo={third} lip={9} paper="#131011" onOpen={openPhoto ? () => openPhoto(third) : undefined} still={still}>
                        <Caption color="#F7EDE6">{third.caption}</Caption>
                      </Polaroid>
                    </Piece>
                    <Piece x={64} y={106} w={21} rotate={-18} z={7} entrance="bloom" delay={0.25}>
                      <Scrap id="bow-red" />
                    </Piece>
                    <Piece x={84} y={138} w={32} rotate={5} z={5} entrance="stick" delay={0.2}>
                      <Scrap id="cats-kiss" />
                    </Piece>
                    <Piece x={84} y={170} w={19} rotate={12} z={5} entrance="bloom" delay={0.3}>
                      <Scrap id="heart-damask" shadow={false} />
                    </Piece>
                  </>
                ) : null}
              </section>
            ) : null}

            {rest.length ? (
              <section className="relative" style={{ height: `calc(${scatterHeight(rest.length)} * var(--p))` }}>
                <Piece x={22} y={62} w={70} rotate={24} z={1} drift={4} entrance="none">
                  <Scrap id="lace-red" shadow={false} style={{ opacity: look.dark ? 0.85 : 0.7 }} />
                </Piece>
                {rest.map((photo, i) => (
                  <Piece key={photo.id} {...spots[i]} z={4 + (i % 2)} entrance={i % 2 ? "right" : "left"} delay={(i % 2) * 0.12}>
                    <Polaroid photo={photo} lip={8} paper={i % 3 === 2 ? "#131011" : look.paper} onOpen={openPhoto ? () => openPhoto(photo) : undefined} still={still}>
                      <Caption color={i % 3 === 2 ? "#F7EDE6" : look.paperInk}>{photo.caption}</Caption>
                    </Polaroid>
                  </Piece>
                ))}
                <Piece x={50} y={10} w={24} rotate={-12} z={7} entrance="stamp">
                  <Scrap id="kiss-4" />
                </Piece>
                <Piece x={50} y={70} w={20} rotate={14} z={7} entrance="stamp" delay={0.2}>
                  <Scrap id="heart-print-pink" />
                </Piece>
                {rest.length > 2 ? (
                  <Piece x={92} y={100} w={22} rotate={20} z={7} entrance="stamp" delay={0.1}>
                    <Scrap id="kiss-dark" />
                  </Piece>
                ) : null}
              </section>
            ) : null}

            {/* the letter, typed, with a plaster over the corner and a kiss by the name */}
            <section className="relative mt-[calc(8*var(--p))] px-[calc(5*var(--p))]">
              <Piece x={16} y={1} w={36} rotate={-14} z={4} entrance="stick">
                <Scrap id="plaster-heart" />
              </Piece>
              <div className="relative z-[2] px-[calc(6*var(--p))] pt-[calc(12*var(--p))] pb-[calc(12*var(--p))]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk, boxShadow: "0 calc(1.6*var(--p)) calc(4*var(--p)) rgba(30,5,10,.3)" }}>
                <span aria-hidden="true" className="pointer-events-none absolute inset-[calc(2*var(--p))] border-double" style={{ borderColor: look.red, borderWidth: "calc(.9*var(--p))", opacity: 0.8 }} />
                <article className="relative">
                  <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="type" accent={look.red} />
                </article>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-0">
                <Piece x={80} y={-3} w={30} rotate={-12} z={4} entrance="stamp" delay={0.3}>
                  <Scrap id="kiss-red" />
                </Piece>
              </div>
            </section>

            <div className="relative z-[2] mt-[calc(9*var(--p))] flex flex-col gap-[calc(7*var(--p))] px-[calc(6*var(--p))]">
              {data.countdown ? (
                <div className="rounded-[calc(2*var(--p))] p-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.5)]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk }}>
                  <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
                </div>
              ) : null}
              {data.surprise ? (
                <div className="rounded-[calc(2*var(--p))] px-[calc(5*var(--p))] pt-[calc(6*var(--p))] pb-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.5)]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk }}>
                  <p className="mb-[calc(3*var(--p))] text-center text-[calc(2.6*var(--p))] tracking-[0.24em] uppercase opacity-70">{t("ps")}</p>
                  <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
                </div>
              ) : null}
              <div ref={endRef} className="rounded-[calc(2*var(--p))] px-[calc(3*var(--p))] py-[calc(6*var(--p))]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk, boxShadow: "0 14px 26px -18px rgba(0,0,0,.5)" }}>
                <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} />
              </div>
            </div>

            {/* the kisses they have left, where they left them */}
            {kisses.map((k) => (
              <motion.div key={k.id} data-kiss="" aria-hidden="true" className="pointer-events-none absolute z-[20]" style={{ left: `calc(${k.x} * var(--p))`, top: `calc(${k.y} * var(--p))`, width: `calc(${k.w} * var(--p))`, x: "-50%", y: "-50%" }} initial={still ? false : { scale: 2.2, opacity: 0, rotate: k.rotate + 18 }} animate={{ scale: 1, opacity: 0.95, rotate: k.rotate }} transition={{ type: "spring", stiffness: 520, damping: 24, mass: 0.7 }}>
                <Scrap id={k.scrap} eager shadow={false} />
              </motion.div>
            ))}
          </div>
        </div>
        <AnimatePresence>{active ? <Lightbox key="box" photo={active} onClose={() => setActive(null)} closeLabel={t("close")} /> : null}</AnimatePresence>
      </motion.div>
    </CollageContext.Provider>
  );
}
