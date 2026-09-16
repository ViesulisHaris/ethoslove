"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { parseRichText } from "@/lib/gift/rich-text";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { hashString, mulberry32 } from "../_shared/random";
import { RichMessage } from "../_shared/RichMessage";
import { Typewriter } from "../_shared/Typewriter";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience, type AmbienceKind } from "../_shared/Ambience";
import { COVER_VARS, CoverPage, Float, POSTER_FONT, StickerScatter, TapPill, type CoverTone, type StickerPlacement } from "../_shared/cover-kit";
import { BoardingPass, DESK_KEYFRAMES, LuggageTag, PaperPlane, Passport, Stamp, cityCode } from "./art";
import { resolvePlace, haversineKm } from "../_shared/places";
import { Globe, type FlightState, type Place, type GlobePalette } from "./Globe";
import type { PassportFields } from "./schema";

const COVER: Record<PassportFields["cover"], string> = {
  navy: "#1f2a4a",
  burgundy: "#5a1f2a",
  forest: "#1f3d2e",
  black: "#15130f",
};

/** The desk the booklet lies on: a printed sky, with the sun coming in from one corner. */
const SKY_TONE: CoverTone = {
  page: "#CFE2F2",
  glow: ["rgba(255,252,236,.9)", "rgba(142,190,230,.55)"],
  accent: "#2C5578",
};

const CLOUDS =
  "radial-gradient(40% 24% at 15% 13%, rgba(255,255,255,.92), transparent 70%), radial-gradient(28% 16% at 29% 18%, rgba(255,255,255,.8), transparent 72%), radial-gradient(36% 20% at 87% 25%, rgba(255,255,255,.85), transparent 70%), radial-gradient(44% 22% at 74% 90%, rgba(255,255,255,.7), transparent 72%), radial-gradient(32% 18% at 7% 64%, rgba(255,255,255,.6), transparent 74%)";

const STICKERS: StickerPlacement[] = [
  { id: "star", x: 9, y: 29, size: 9, rotate: -14 },
  { id: "sparkle", x: 89, y: 9, size: 7.5 },
  { id: "cloud", x: 12, y: 68, size: 17, rotate: -6 },
  { id: "heart", x: 91, y: 82, size: 11, rotate: 12 },
  { id: "butterfly", x: 13, y: 88, size: 13, rotate: 8 },
];

const AMBIENCE: { kind: AmbienceKind; colors: string[]; count?: number }[] = [
  { kind: "bokeh", colors: ["#FFFFFF", "#E8F3FF"], count: 8 },
  { kind: "dust", colors: ["#FFFFFF", "#FFF3D6"], count: 12 },
];

const S = {
  en: {
    passport: "PASSPORT",
    open: "open",
    coverLine: "somewhere, together",
    to: "to",
    boardingPass: "boarding pass",
    entry: "entry",
    flying: "Now boarding",
    km: "{n} km",
    hours: "About {n} hours by plane. Or one tap.",
    arrived: "Arrived",
    entries: "Entries",
    visa: "Visa",
    stampsHint: "Every stamp is a place we were. Tap one.",
    type: "Type",
    typeValue: "P · Person",
    holder: "Holder",
    nationality: "Nationality",
    issued: "Issued",
    expires: "Expires",
    never: "Never",
    via: "via",
    notFound: "City not found — try a bigger one nearby, or paste coordinates.",
    skip: "Skip the flight",
  },
  es: {
    passport: "PASAPORTE",
    open: "abrir",
    coverLine: "a algún sitio, juntos",
    to: "a",
    boardingPass: "embarque",
    entry: "entrada",
    flying: "Embarcando",
    km: "{n} km",
    hours: "Unas {n} horas en avión. O un toque.",
    arrived: "Llegada",
    entries: "Entradas",
    visa: "Visado",
    stampsHint: "Cada sello es un sitio donde estuvimos. Toca uno.",
    type: "Tipo",
    typeValue: "P · Persona",
    holder: "Titular",
    nationality: "Nacionalidad",
    issued: "Expedido",
    expires: "Caduca",
    never: "Nunca",
    via: "vía",
    notFound: "Ciudad no encontrada: prueba una más grande cerca o pega coordenadas.",
    skip: "Saltar el vuelo",
  },
};

type Stage = "cover" | "flight" | "pages";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function Template({
  data,
  mode,
  onEvent,
  onReact,
  onMakeOne,
}: TemplateProps<PassportFields>) {
  const reduce = useReducedMotion();
  const t = useGiftStrings(data.locale);
  const s = S[data.locale] ?? S.en;
  const audio = useGiftAudio(data.music, mode !== "preview");
  const [stage, setStage] = useState<Stage>(mode === "preview" ? "pages" : "cover");
  const [arrived, setArrived] = useState(false);
  const [webgl] = useState(() => (typeof window === "undefined" ? true : hasWebGL()));
  const flight = useRef<FlightState>({ progress: 0, arrived: false, started: false });
  const cover = COVER[data.fields.cover] ?? COVER.navy;
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);

  const route = useMemo(() => {
    const from = resolvePlace(data.fields.fromCity, data.fields.fromCoords);
    const to = resolvePlace(data.fields.toCity, data.fields.toCoords);
    const stops = data.fields.stops
      .map((c) => resolvePlace(c))
      .filter((p): p is Place => Boolean(p));
    const places: Place[] = [
      from ?? { name: data.fields.fromCity, lat: 40.4168, lng: -3.7038 },
      ...stops,
      to ?? { name: data.fields.toCity, lat: 38.7223, lng: -9.1393 },
    ];
    let km = 0;
    for (let i = 0; i < places.length - 1; i++) km += haversineKm(places[i], places[i + 1]);
    return { places, km: Math.round(km), missing: !from || !to };
  }, [data.fields]);

  const palette = useMemo<GlobePalette>(
    () => ({
      globe: "#1b2236",
      lines: "#4a5878",
      equator: "#6b7da3",
      accent: data.accentColor,
      stars: true,
    }),
    [data.accentColor],
  );

  const open = () => {
    void audio.start();
    onEvent?.({ type: "started" });
    if (!webgl) {
      setStage("pages");
      return;
    }
    setStage("flight");
    flight.current.started = true;
  };

  const land = () => {
    setArrived(true);
    onEvent?.({ type: "progress", pct: 40 });
  };

  useEffect(() => {
    if (!arrived) return;
    const id = setTimeout(() => setStage("pages"), reduce ? 300 : 1800);
    return () => clearTimeout(id);
  }, [arrived, reduce]);

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#0b0d16] text-[#f3eee4] select-none"
      style={{ ...COVER_VARS, fontFamily: "var(--gift-font-body)" } as CSSProperties}
    >
      <style>{DESK_KEYFRAMES}</style>
      <AnimatePresence>
        {stage === "cover" ? (
          <motion.div
            key="cover"
            className="absolute inset-0 z-30 overflow-hidden"
            exit={{ opacity: 0, scale: 1.03, transition: { duration: 0.45 } }}
          >
            <CoverPage tone={SKY_TONE} pattern={CLOUDS} />
            <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
              <Ambience layers={AMBIENCE} opacity={0.8} />
            </div>
            <StickerScatter items={STICKERS} reduce={!!reduce} className="z-[3]" />
            <PaperPlane className="top-[13%] right-[8%] z-[3] w-[calc(16*var(--k))]" />
            {/* the desk's own stamps: where this route starts and where it lands */}
            <Stamp
              ink="#B23A2E"
              title={route.places[0].name}
              sub={s.entry}
              round
              className="top-[15%] left-[11%] z-[3] size-[calc(18*var(--k))] -rotate-[13deg]"
            />
            <Stamp
              ink="#1F3D8A"
              title={route.places[route.places.length - 1].name}
              sub={s.arrived}
              className="right-[9%] bottom-[11%] z-[3] h-[calc(12*var(--k))] w-[calc(22*var(--k))] rotate-[9deg]"
            />

            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center px-[calc(8*var(--k))] text-center"
              style={{ color: "#20344B" }}
            >
              <motion.p
                className="text-[calc(2.5*var(--k))] tracking-[0.34em] uppercase opacity-55"
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 0.55, y: 0 }}
                transition={{ delay: 0.1, duration: 0.7 }}
              >
                {data.senderName} → {data.recipientName}
              </motion.p>
              <motion.h1
                className="mt-[calc(1.6*var(--k))] max-w-[calc(70*var(--k))] text-[calc(7.4*var(--k))] leading-[1.06] text-balance italic [overflow-wrap:anywhere]"
                style={{ fontFamily: POSTER_FONT }}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.8 }}
              >
                {data.title?.trim() || s.coverLine}
              </motion.h1>

              <motion.div
                className="relative mt-[calc(4.4*var(--k))] w-[calc(52*var(--k))]"
                initial={reduce ? false : { opacity: 0, y: 34, rotate: -4 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.2 }}
              >
                <Float reduce={!!reduce}>
                  <button
                    type="button"
                    onClick={open}
                    aria-label={s.open}
                    className="relative block w-full rounded-[calc(2.4*var(--k))] outline-none focus-visible:ring-4 focus-visible:ring-white/70"
                  >
                    <BoardingPass
                      from={cityCode(route.places[0].name)}
                      to={cityCode(route.places[route.places.length - 1].name)}
                      label={s.boardingPass}
                      passenger={data.recipientName}
                      className="absolute top-[25%] right-[-43%] z-0 w-[68%] rotate-[7deg]"
                    />
                    <div className="relative z-[1] -rotate-[1.5deg]">
                      <Passport
                        leather={cover}
                        nationality={data.fields.nationality || s.holder}
                        passportLabel={s.passport}
                        name={data.recipientName}
                      />
                    </div>
                    <LuggageTag
                      name={route.places[route.places.length - 1].name}
                      eyebrow={s.to}
                      className="absolute top-[56%] left-[-29%] z-[2] w-[40%]"
                    />
                  </button>
                </Float>
                <span
                  aria-hidden="true"
                  className="absolute -bottom-[calc(2*var(--k))] left-1/2 h-[calc(4.5*var(--k))] w-[78%] -translate-x-1/2 rounded-[50%] bg-[#2C5578]/25 blur-[calc(2.4*var(--k))]"
                />
              </motion.div>

              <TapPill tone={SKY_TONE} reduce={!!reduce} className="mt-[calc(5.5*var(--k))]">
                {s.open}
              </TapPill>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {stage === "flight" ? (
        <div className="absolute inset-0 z-20">
          <Globe
            places={route.places}
            stateRef={flight}
            palette={palette}
            reduce={!!reduce}
            onArrive={land}
            className="!absolute inset-0"
          />
          <div className="pointer-events-none absolute inset-x-0 top-[max(1.5rem,calc(env(safe-area-inset-top)+1rem))] px-6 text-center">
            <p className="text-[11px] tracking-[0.3em] uppercase opacity-60">
              {arrived ? s.arrived : s.flying}
            </p>
            <p
              className="mt-2 text-[clamp(1.3rem,6cqw,1.8rem)]"
              style={{ fontFamily: "var(--gift-font-display)" }}
            >
              {route.places[0].name} <span style={{ color: "var(--gift-accent)" }}>→</span>{" "}
              {route.places[route.places.length - 1].name}
            </p>
            {route.places.length > 2 ? (
              <p className="mt-1 text-xs opacity-60">
                {s.via}{" "}
                {route.places
                  .slice(1, -1)
                  .map((p) => p.name)
                  .join(" · ")}
              </p>
            ) : null}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-[max(2.5rem,calc(env(safe-area-inset-bottom)+2rem))] px-8 text-center">
            <p
              className="text-[clamp(1.6rem,8cqw,2.4rem)] tabular-nums"
              style={{ fontFamily: "var(--gift-font-display)" }}
            >
              {s.km.replace("{n}", route.km.toLocaleString(data.locale))}
            </p>
            <p className="mt-1 text-xs opacity-60">
              {s.hours.replace("{n}", String(Math.max(1, Math.round(route.km / 800))))}
            </p>
            {route.missing ? <p className="mt-2 text-[11px] text-[#f2a7a0]">{s.notFound}</p> : null}
            {!arrived ? (
              <button
                type="button"
                onClick={() => {
                  flight.current.progress = 1;
                }}
                className="pointer-events-auto mt-4 text-[11px] tracking-[0.2em] uppercase underline underline-offset-4 opacity-60"
              >
                {s.skip}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {stage === "pages" ? (
          <motion.div
            key="pages"
            initial={mode === "preview" ? false : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-20 scrollbar-none overflow-y-auto overscroll-contain"
          >
            <Pages
              data={data}
              mode={mode}
              blocks={blocks}
              reduce={!!reduce}
              s={s}
              route={route}
              onEvent={onEvent}
              onReact={onReact}
              onMakeOne={onMakeOne}
              onReplay={
                mode === "preview"
                  ? undefined
                  : () => {
                      flight.current = { progress: 0, arrived: false, started: false };
                      setArrived(false);
                      setStage("cover");
                    }
              }
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SoundToggle audio={audio} locale={data.locale} />
      <span className="hidden">{t("theEnd")}</span>
    </div>
  );
}

function Pages({
  data,
  mode,
  blocks,
  reduce,
  s,
  route,
  onEvent,
  onReact,
  onMakeOne,
  onReplay,
}: {
  data: TemplateProps<PassportFields>["data"];
  mode: TemplateProps["mode"];
  blocks: ReturnType<typeof parseRichText>;
  reduce: boolean;
  s: (typeof S)["en"];
  route: { places: Place[]; km: number };
  onEvent?: TemplateProps["onEvent"];
  onReact?: () => void;
  onMakeOne?: () => void;
  onReplay?: () => void;
}) {
  const t = useGiftStrings(data.locale);
  const instant = mode === "preview" || reduce || data.messageStyle === "fade";
  const [done, setDone] = useState(instant);
  const [active, setActive] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const endedRef = useRef(false);
  const seed = hashString(data.recipientName + data.photos.length);
  const stamps = useMemo(() => {
    const rng = mulberry32(seed);
    const inks = ["#b23a2e", "#1f3d8a", "#2f6b4f", "#5a1f2a", "#7a4f9a"];
    return data.photos.map((p, i) => ({
      photo: p,
      rot: (rng() - 0.5) * 22,
      ink: inks[i % inks.length],
      place: route.places[Math.min(i, route.places.length - 1)]?.name ?? "",
    }));
  }, [data.photos, seed, route.places]);
  const issued = useMemo(
    () =>
      new Intl.DateTimeFormat(data.locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date()),
    [data.locale],
  );

  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !endedRef.current) {
          endedRef.current = true;
          onEvent?.({ type: "ended" });
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onEvent]);

  const pageStyle = {
    background: "#f3eee0",
    backgroundImage:
      "radial-gradient(circle at 20% 10%, rgba(var(--gift-accent-rgb),0.16), transparent 45%), repeating-linear-gradient(45deg, rgba(0,0,0,0.025) 0 2px, transparent 2px 9px)",
  };

  return (
    <div className="mx-auto flex w-[min(92cqw,560px)] flex-col gap-5 pt-[max(6cqh,40px)] pb-[max(2rem,env(safe-area-inset-bottom))] text-[#1e1a16]">
      <section
        className="rounded-md p-5 shadow-[0_30px_50px_-25px_rgba(0,0,0,0.8)]"
        style={pageStyle}
      >
        <p className="text-[9px] tracking-[0.35em] uppercase opacity-60">
          {s.passport} · {data.senderName}
        </p>
        <div className="mt-3 grid grid-cols-[auto_1fr] gap-4">
          {data.photos[0] ? (
            <img
              src={data.photos[0].url}
              alt={data.photos[0].alt ?? ""}
              className="h-24 w-20 rounded-sm object-cover grayscale-[0.25] sepia-[0.15]"
            />
          ) : null}
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
            <Field k={s.type} v={s.typeValue} />
            <Field k={s.holder} v={data.recipientName} strong />
            <Field k={s.nationality} v={data.fields.nationality || "—"} />
            <Field k={s.issued} v={issued} />
            <Field k={s.expires} v={s.never} strong />
            <Field k="km" v={route.km.toLocaleString(data.locale)} />
          </dl>
        </div>
        <p className="mt-4 truncate font-mono text-[10px] tracking-[0.2em] opacity-50">{`P<${data.recipientName.toUpperCase().replace(/\s+/g, "<")}<<${data.senderName.toUpperCase().replace(/\s+/g, "<")}<<<<<<<<<<<<<<<<<<<<<<<<<<`}</p>
      </section>

      <section
        className="rounded-md p-5 shadow-[0_30px_50px_-25px_rgba(0,0,0,0.8)]"
        style={pageStyle}
      >
        <p className="text-[9px] tracking-[0.35em] uppercase opacity-60">{s.entries}</p>
        <p className="mt-1 text-xs opacity-60">{s.stampsHint}</p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          {stamps.map((st, i) => (
            <motion.button
              key={st.photo.id}
              type="button"
              onClick={() => setActive(i)}
              initial={
                mode === "preview" || reduce
                  ? false
                  : { scale: 1.8, opacity: 0, rotate: st.rot - 10 }
              }
              whileInView={{ scale: 1, opacity: 1, rotate: st.rot }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.1 }}
              className="relative aspect-square rounded-[14px] border-[3px] border-double p-2 text-left"
              style={{ borderColor: st.ink, color: st.ink, mixBlendMode: "multiply" }}
              data-stamp={i}
            >
              <span
                className="absolute inset-1 rounded-[10px] border border-dashed opacity-60"
                style={{ borderColor: st.ink }}
              />
              <img
                src={st.photo.url}
                alt={st.photo.alt ?? ""}
                className="h-[62%] w-full rounded-sm object-cover opacity-90 contrast-[1.05] grayscale-[0.5] sepia-[0.35]"
              />
              <span className="mt-1.5 block truncate text-[9px] font-bold tracking-[0.18em] uppercase">
                {st.place || s.entries}
              </span>
              <span className="block truncate text-[9px] opacity-70">
                {st.photo.caption || issued}
              </span>
            </motion.button>
          ))}
        </div>
      </section>

      <section
        className="rounded-md p-6 shadow-[0_30px_50px_-25px_rgba(0,0,0,0.8)]"
        style={pageStyle}
      >
        <p className="text-[9px] tracking-[0.35em] uppercase opacity-60">{s.visa}</p>
        <h2
          className="mt-3 text-[clamp(1.5rem,6.5cqw,1.9rem)] italic"
          style={{ fontFamily: "var(--gift-font-display)" }}
        >
          {data.title || t("dear", { name: data.recipientName })}
        </h2>
        <div className="mt-4 text-[clamp(1rem,4.4cqw,1.1rem)] leading-relaxed [&_em]:text-[var(--gift-accent-deep)] [&_p+p]:mt-4 [&_strong]:font-semibold">
          {instant ? (
            <RichMessage
              blocks={blocks}
              stagger={mode === "preview" ? 0 : 0.5}
              onDone={() => setDone(true)}
            />
          ) : (
            <Typewriter blocks={blocks} active speed={38} onDone={() => setDone(true)} />
          )}
        </div>
        {done ? (
          <motion.p
            initial={reduce ? false : { scale: 1.6, opacity: 0, rotate: -12 }}
            animate={{ scale: 1, opacity: 1, rotate: -8 }}
            transition={{ type: "spring", stiffness: 240, damping: 14 }}
            className="mt-6 inline-block rounded-md border-[3px] border-double px-3 py-1 text-[11px] font-bold tracking-[0.3em] uppercase"
            style={{ borderColor: "var(--gift-accent-deep)", color: "var(--gift-accent-deep)" }}
          >
            {s.arrived} · {data.senderName}
          </motion.p>
        ) : null}
      </section>

      {done && data.countdown ? (
        <section className="rounded-md p-5" style={pageStyle}>
          <Countdown countdown={data.countdown} locale={data.locale} tone="light" />
        </section>
      ) : null}
      {done && data.surprise ? (
        <section className="rounded-md p-5" style={pageStyle}>
          <p className="mb-3 text-center text-[11px] tracking-[0.25em] uppercase opacity-50">
            {t("ps")}
          </p>
          <SurpriseReveal
            surprise={data.surprise}
            locale={data.locale}
            tone="light"
            onReveal={() => onEvent?.({ type: "surprise" })}
          />
        </section>
      ) : null}
      {done ? (
        <div ref={endRef} className="pt-2 text-[#f3eee4]">
          <EndScreen
            data={data}
            tone="dark"
            onReact={onReact}
            onMakeOne={onMakeOne}
            onReplay={onReplay}
          />
        </div>
      ) : null}

      <AnimatePresence>
        {active !== null && data.photos[active] ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-5"
            onClick={() => setActive(null)}
          >
            <motion.figure initial={{ scale: 0.85 }} animate={{ scale: 1 }} className="max-w-full">
              <img
                src={data.photos[active].url}
                alt={data.photos[active].alt ?? ""}
                className="max-h-[70cqh] rounded-md object-contain"
              />
              {data.photos[active].caption ? (
                <figcaption className="mt-3 text-center text-sm text-[#f3eee4]">
                  {data.photos[active].caption}
                </figcaption>
              ) : null}
            </motion.figure>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Field({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[8px] tracking-[0.25em] uppercase opacity-50">{k}</dt>
      <dd className={cn("truncate", strong && "font-semibold")}>{v}</dd>
    </div>
  );
}
