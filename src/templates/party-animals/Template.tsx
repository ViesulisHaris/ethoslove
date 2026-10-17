"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { AnimatePresence, motion, useAnimate, useReducedMotion } from "motion/react";
import { Mic } from "lucide-react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { parseRichText } from "@/lib/gift/rich-text";
import { appleMusicTrackUrl, backgroundMusic, isCatalogPreview } from "@/lib/gift/music";
import { cn } from "@/lib/utils";
import type { TemplateProps } from "../types";
import { useGiftStrings } from "../_shared/i18n";
import { useGiftAudio, type GiftAudio } from "../_shared/hooks/use-gift-audio";
import { useContainerSize } from "../_shared/hooks/use-container-size";
import { useBlowDetector } from "../_shared/hooks/use-blow-detector";
import { hashString } from "../_shared/random";
import { MessageBody } from "../_shared/MessageBody";
import { Countdown } from "../_shared/Countdown";
import { SurpriseReveal } from "../_shared/SurpriseReveal";
import { EndScreen } from "../_shared/EndScreen";
import { SoundToggle } from "../_shared/SoundToggle";
import { Ambience } from "../_shared/Ambience";
import { Confetti } from "../_shared/Confetti";
import { PAPER_GRAIN, POSTER_FONT, SCRIPT_FONT } from "../_shared/cover-kit";
import { Caption, COLLAGE_KEYFRAMES, CollageContext, Lightbox, Piece, Polaroid, Scrap, ScrollHint, Shot, Tape, TornPaper, useReadProgress } from "../_shared/collage/kit";
import { CARD_KEYFRAMES, MusicCard, PreviewMusicCard, Ticket } from "../_shared/collage/cards";
import { ticketNumber } from "../_shared/collage/paper";
import { RansomRows } from "../_shared/collage/ransom";
import { playChime, playPaper } from "../_shared/collage/sounds";
import { MEMES } from "../_shared/memes/catalogue";
import { Bubble } from "../_shared/memes/Bubble";
import { MemeSticker } from "../_shared/memes/MemeSticker";
import { buzz, playBoing, playHonk, playSqueak, playTada } from "../_shared/memes/sounds";
import { Arrow, Balloon, Bunting, Cake, CAKE_BOX, Flecks, FoilNumber, Invitation, Layer, PaperFan, PARTY_KEYFRAMES, PartyHat, Present, RubberStamp, Spark, Sparkle, Streamer, Swash, Tick } from "./art";
import { LOOKS, type Look, type LookId } from "./looks";
import { addPop, ageDigits, arrangePhotos, bannerRows, candlePlan, GUESTS, letterSize, listHeight, MAX_PHOTOS, nameSize, photosHeight, planGuests, popAt, scatter, shoutFor, STRIP_TOP, stripCellY, stripHeight, wordFace, type GuestSpot, type Pop, type Voice } from "./scene";
import { playBlow, playPopper, playPuff } from "./sounds";
import { fieldsSchema, type PartyAnimalsFields } from "./schema";

type Copy = {
  open: string;
  invited: string;
  to: string;
  card: string;
  hintGuests: string;
  hintTap: string;
  scroll: string;
  greetOne: string;
  banner: string;
  word: string;
  ticket: string;
  booth: string;
  pause: string;
  play: string;
  list: string;
  listCount: string;
  everyone: string;
  names: string[];
  wish: string;
  wished: string;
  blowTap: string;
  blowLabel: string;
  micAsk: string;
  micOn: string;
  house: string[];
  ageLine: string;
  cheers: string[];
};

const S: Record<"en" | "es", Copy> = {
  en: {
    open: "tap to open",
    invited: "you're invited",
    to: "to",
    card: "the party of the year",
    hintGuests: "tap a guest to say hi",
    hintTap: "tap anywhere for confetti",
    scroll: "scroll",
    greetOne: "Say hi to {name}",
    banner: "happy birthday",
    word: "happiness.",
    ticket: "party animals only",
    booth: "party booth",
    pause: "Pause the song",
    play: "Play the song",
    list: "guest list",
    listCount: "{n} of {total} said hi",
    everyone: "everyone's here",
    names: ["the loud cat", "tiny kitten, green hat", "puppies ×2", "hamster (brought cake)", "sad hamster (happy inside)", "cat with a balloon", "hamster (ate the cake)", "kitten with flowers", "ferrets (not invited)", "puppy, blue hat"],
    wish: "make a wish",
    wished: "wish made. no take-backs",
    blowTap: "tap the cake to blow out the candles",
    blowLabel: "Blow out the candles",
    micAsk: "or blow into your phone",
    micOn: "blow into your phone",
    house: ["HAPPY BIRTHDAY!!", "i was told there'd be cake", "ur my favourite human", "who invited the ferrets", "make a wish. make it snacks", "party party party", "we love u (the cat made me say it)", "is it cake time yet", "ur glowing. is that the candles", "best day of the year tbh", "i wore the hat for u"],
    ageLine: "{age}?? in THIS economy",
    cheers: ["HAPPY BIRTHDAY!!", "SPEECH! SPEECH!", "cake cake cake"],
  },
  es: {
    open: "toca para abrir",
    invited: "tu invitación",
    to: "para",
    card: "la fiesta del año",
    hintGuests: "toca a un invitado para saludar",
    hintTap: "toca donde quieras: confeti",
    scroll: "desliza",
    greetOne: "Saluda a {name}",
    banner: "feliz cumple",
    word: "felicidad.",
    ticket: "solo animales de fiesta",
    booth: "fotomatón",
    pause: "Pausar la canción",
    play: "Reproducir la canción",
    list: "lista de invitados",
    listCount: "{n} de {total} han saludado",
    everyone: "ya están todos",
    names: ["el gato gritón", "gatito, gorro verde", "cachorros ×2", "hámster (trajo tarta)", "hámster triste (feliz por dentro)", "gato con globo", "hámster (se comió la tarta)", "gatita con flores", "hurones (sin invitación)", "cachorro, gorro azul"],
    wish: "pide un deseo",
    wished: "deseo pedido. sin devoluciones",
    blowTap: "toca la tarta para soplar las velas",
    blowLabel: "Soplar las velas",
    micAsk: "o sopla al móvil",
    micOn: "sopla al móvil",
    house: ["¡¡FELIZ CUMPLE!!", "me dijeron que había tarta", "eres mi persona favorita", "quién invitó a los hurones", "pide un deseo. que sean snacks", "fiesta fiesta fiesta", "te queremos (me obligó el gato)", "¿ya toca la tarta?", "estás brillando. ¿son las velas?", "el mejor día del año, la verdad", "me puse el gorro por ti"],
    ageLine: "¿¿{age}?? con esta economía",
    cheers: ["¡¡FELIZ CUMPLE!!", "¡QUE HABLE! ¡QUE HABLE!", "tarta tarta tarta"],
  },
};

type Stage = "sealed" | "opening" | "open";
type Data = TemplateProps<PartyAnimalsFields>["data"];
type Fields = PartyAnimalsFields;
/** Where the shared confetti cannon fires from, in fractions of the gift. */
type Burst = { n: number; x: number; y: number };

/** The headline's height with two rows of letters; one row less or more moves everything under it. */
const HERO_H = 174;
const ROW_H = 11;
const CAKE_H = 158;

const speak = (voice: Voice, muted: boolean, pitch: number) => {
  if (voice === "honk") playHonk(muted);
  else if (voice === "boing") playBoing(muted);
  else playSqueak(muted, voice === "squeak" ? 0.55 + pitch * 0.45 : pitch * 0.5);
};

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<PartyAnimalsFields>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const size = useContainerSize(rootRef);
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const audio = useGiftAudio(data.music, !preview);
  // A draft saved before a field changed shape still opens: bad fields fall back to the defaults.
  const fields = useMemo(() => {
    const parsed = fieldsSchema.safeParse(data.fields);
    return parsed.success ? parsed.data : fieldsSchema.parse({});
  }, [data.fields]);
  const lookId: LookId = fields.look in LOOKS ? fields.look : "linen";
  const look = LOOKS[lookId];
  // A gift that arrives through one of the decorated covers has been opened once already, so it
  // goes straight to the party instead of asking for a second envelope to be torn open.
  const covered = !!data.cover && data.cover !== "classic";

  const [stage, setStage] = useState<Stage>(preview || covered ? "open" : "sealed");
  const [burst, setBurst] = useState<Burst>({ n: 0, x: 0.5, y: 0.45 });
  const [run, setRun] = useState(0);
  const started = useRef(false);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  // Every tap may be the first: it starts the music (a browser only lets a tap do that) and says so once.
  const begin = () => {
    void audio.start();
    if (started.current) return;
    started.current = true;
    eventRef.current?.({ type: "started" });
  };

  const fire = (x: number, y: number) => {
    if (!reduce) setBurst((b) => ({ n: b.n + 1, x, y }));
  };

  const open = () => {
    if (stage !== "sealed") return;
    begin();
    playPopper(audio.muted);
    buzz(14);
    setStage("opening");
    window.setTimeout(() => playPaper(audio.muted), reduce ? 0 : 320);
    window.setTimeout(
      () => {
        fire(0.5, 0.42);
        playChime(audio.muted);
        setStage("open");
        eventRef.current?.({ type: "progress", pct: 30 });
      },
      reduce ? 250 : 1250,
    );
  };

  const replay = () => {
    setStage(covered ? "open" : "sealed");
    setRun((r) => r + 1);
  };

  const vars = { "--k": "min(var(--u), 0.5cqh)", "--p": "min(1cqw, 5.4px)", "--o": "min(1cqw, 5.4px, 0.6cqh)" } as CSSProperties;
  const unit = size.ready ? Math.min(size.width / 100, 5.4) : 3.9;
  const openerUnit = size.ready ? Math.min(size.width / 100, 5.4, size.height * 0.006) : 3.9;

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden select-none" style={{ backgroundColor: look.wall, color: look.ink, fontFamily: "var(--gift-font-body)", ...vars }}>
      <style>{COLLAGE_KEYFRAMES + CARD_KEYFRAMES + PARTY_KEYFRAMES}</style>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: look.pattern, backgroundSize: look.patternSize }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 mix-blend-multiply" style={{ backgroundImage: PAPER_GRAIN, opacity: look.dark ? 0.3 : 0.55 }} />
      <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden="true">
        <Ambience layers={look.ambience} opacity={look.dark ? 0.6 : 0.45} />
      </div>

      <AnimatePresence mode="wait">
        {stage !== "open" ? (
          <Sealed key={`sealed-${run}`} look={look} s={s} data={data} opening={stage === "opening"} reduce={reduce} span={{ w: size.ready ? size.width / openerUnit : 100, h: size.ready ? size.height / openerUnit : 206 }} seed={hashString(`${data.recipientName}|party-animals|invite`)} onOpen={open} />
        ) : (
          <Page key={`page-${run}`} look={look} s={s} data={data} fields={fields} mode={mode} still={preview || reduce} reduce={reduce} unit={unit} audio={audio} onBegin={begin} onFire={fire} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={preview ? undefined : replay} />
        )}
      </AnimatePresence>

      <Confetti burst={burst.n} colors={[data.accentColor, ...look.confetti]} count={150} origin={{ x: burst.x, y: burst.y }} className="pointer-events-none absolute inset-0 z-[36]" />
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/**
 * The first screen: an invitation sealed with a hamster in a party hat, "you're invited" over it,
 * streamers across the top and balloons in the corners. The decorations are drawn in `--o` across
 * the whole screen (`span`), so a laptop gets streamers wall to wall and a phone isn't crowded.
 */
function Sealed({ look, s, data, opening, reduce, span, seed, onOpen }: { look: Look; s: Copy; data: Data; opening: boolean; reduce: boolean; span: { w: number; h: number }; seed: number; onOpen: () => void }) {
  const w = Math.max(100, span.w);
  const h = Math.max(120, span.h);
  const flecks = useMemo(() => scatter(seed, Math.round((w * h) / 520), h, 3).map((f) => ({ ...f, x: (f.x / 100) * w })), [seed, w, h]);
  return (
    <motion.div className="absolute inset-0 z-10" exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.35 } }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
        <Flecks flecks={flecks} colors={look.confetti} />
      </svg>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" style={{ filter: "drop-shadow(0 calc(.5*var(--o)) calc(.7*var(--o)) rgba(40,15,25,.22))" }}>
        <Streamer from={[-4, 2]} to={[w + 4, 6]} sag={9} width={5} twists={Math.round(w / 11)} color={look.streamers[0]} seed={seed + 1} />
        <Streamer from={[-4, 9]} to={[w + 4, 1]} sag={7} width={4.6} twists={Math.round(w / 12)} color={look.streamers[1]} seed={seed + 2} />
      </svg>
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute" style={{ left: "calc(-3*var(--o))", top: "calc(19*var(--o))", width: "calc(17*var(--o))" }}>
          <div className={reduce ? undefined : "pa-float"} style={{ "--pace": "6.5s" } as CSSProperties}>
            <Balloon tone={look.balloons[0]} seed={seed + 3} className="w-full" />
          </div>
        </div>
        <div className="absolute" style={{ right: "calc(-2*var(--o))", top: "calc(26*var(--o))", width: "calc(15*var(--o))" }}>
          <div className={reduce ? undefined : "pa-float"} style={{ "--pace": "5.6s", animationDelay: "-2s" } as CSSProperties}>
            <Balloon tone={look.balloons[1]} seed={seed + 4} className="w-full" />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 grid place-items-center pb-[calc(8*var(--o))]">
        <motion.div className="w-[calc(82*var(--o))]" initial={reduce ? false : { opacity: 0, y: 30, rotate: -7 }} animate={{ opacity: 1, y: 0, rotate: -3 }} transition={{ type: "spring", stiffness: 80, damping: 14 }}>
          <p className="mb-[calc(5*var(--o))] max-w-[68%] truncate pl-[calc(3*var(--o))] text-left leading-[1.35]" style={{ fontFamily: SCRIPT_FONT, color: "var(--gift-accent)", fontSize: `calc(${Math.min(6.6, 50 / (s.invited.length * 0.6))} * var(--o))` }}>
            {s.invited}
          </p>
          <div className="relative">
            {/* two guests who couldn't wait, peering over the top of it */}
            <motion.div className="absolute -top-[34%] right-[3%] w-[31%]" initial={reduce ? false : { y: "40%", opacity: 0 }} animate={opening ? { y: "30%", opacity: 0 } : { y: 0, opacity: 1 }} transition={opening ? { duration: 0.25 } : { delay: 0.7, type: "spring", stiffness: 200, damping: 16 }}>
              <MemeSticker id="puppies" width="100%" style={{ rotate: "8deg" }} />
            </motion.div>
            <div className="relative">
              <Invitation look={look} name={data.recipientName} to={s.to} card={s.card} opening={opening} reduce={reduce} />
            </div>
          </div>
        </motion.div>
      </div>

      <button type="button" onClick={onOpen} aria-label={s.open} className="absolute inset-0 z-[5] outline-none focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-inset" />
      <motion.p aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-[max(9cqh,64px)] z-[4] mx-auto w-max rounded-full px-[calc(4.5*var(--k))] py-[calc(1.7*var(--k))] text-[calc(3.1*var(--k))] font-semibold tracking-[0.22em] uppercase backdrop-blur-sm" style={{ background: look.dark ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.86)", color: look.dark ? "#FFF5F0" : "var(--gift-accent-deep)", boxShadow: "0 calc(.6*var(--k)) calc(2.4*var(--k)) rgba(60,10,20,.18)" }} initial={{ opacity: 0 }} animate={opening ? { opacity: 0 } : { opacity: 1, scale: reduce ? 1 : [1, 1.05, 1] }} transition={opening ? { duration: 0.2 } : { opacity: { delay: 0.9, duration: 0.5 }, scale: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } }}>
        {s.open}
      </motion.p>
    </motion.div>
  );
}

type Said = { i: number; text: string; key: number };

function Page({ look, s, data, fields, mode, still, reduce, unit, audio, onBegin, onFire, onEvent, onReact, onMakeOne, onReplay }: { look: Look; s: Copy; data: Data; fields: Fields; mode: TemplateProps["mode"]; still: boolean; reduce: boolean; unit: number; audio: GiftAudio; onBegin: () => void; onFire: (x: number, y: number) => void; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const t = useGiftStrings(data.locale);
  const scroller = useRef<HTMLDivElement>(null);
  const column = useRef<HTMLDivElement>(null);
  const cakeRef = useRef<HTMLButtonElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [moved, setMoved] = useState(false);
  const [active, setActive] = useState<GiftPhoto | null>(null);
  const [pops, setPops] = useState<Pop[]>([]);
  const [greeted, setGreeted] = useState<boolean[]>(() => GUESTS.map(() => false));
  const [said, setSaid] = useState<Said[]>([]);
  const [out, setOut] = useState(false);
  const [cheer, setCheer] = useState(0);
  const popCount = useRef(0);
  const saidCount = useRef(0);
  const hush = useRef<number | undefined>(undefined);
  useReadProgress(scroller, endRef, mode, onEvent, () => setMoved(true));
  useEffect(() => () => window.clearTimeout(hush.current), []);

  const preview = mode === "preview";
  const seed = hashString(`${data.recipientName}|${data.senderName}|party-animals`);
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const photos = useMemo(() => data.photos.slice(0, MAX_PHOTOS), [data.photos]);
  const plan = arrangePhotos(photos.length);
  // Music that plays under the gift gets the player card. A real song from Apple gets the same card,
  // heard only on a tap (PreviewMusicCard), and the end screen then leaves its own out.
  const song = backgroundMusic(data.music);
  const catalog = isCatalogPreview(data.music) && appleMusicTrackUrl(data.music, data.locale) ? data.music : undefined;
  const hasSong = Boolean(song?.title) || Boolean(catalog);
  const guests = useMemo(() => planGuests(photos.length, hasSong, seed), [photos.length, hasSong, seed]);
  const rows = useMemo(() => bannerRows(fields.banner?.trim() || s.banner), [fields.banner, s.banner]);
  const digits = ageDigits(fields.age);
  const candles = candlePlan(fields.age);
  const context = useMemo(() => ({ container: scroller, still, unit }), [still, unit]);
  const openPhoto = preview ? undefined : setActive;
  const done = greeted.filter(Boolean).length;
  const everyone = done === GUESTS.length;

  const say = (lines: Said[], hold = 2400) => {
    setSaid(lines);
    window.clearTimeout(hush.current);
    hush.current = window.setTimeout(() => setSaid([]), hold);
  };

  const greet = (i: number) => {
    if (preview) return;
    onBegin();
    const spot = guests[i];
    speak(spot.voice, audio.muted, i / (guests.length - 1));
    buzz(10);
    saidCount.current += 1;
    say([{ i, text: shoutFor(i, fields.shouts, s.house, fields.age, s.ageLine), key: saidCount.current }]);
    if (greeted[i]) return;
    const next = greeted.slice();
    next[i] = true;
    setGreeted(next);
    if (next.every(Boolean)) {
      window.setTimeout(() => playTada(audio.muted), 160);
      onFire(0.5, 0.32);
    }
  };

  // A tap on the page, anywhere that isn't a photo, a guest or a button, throws a handful of confetti there.
  const pop = (e: MouseEvent<HTMLDivElement>) => {
    if (preview || !column.current) return;
    if ((e.target as HTMLElement).closest("button, a, input, textarea, [role=button]")) return;
    onBegin();
    const box = column.current.getBoundingClientRect();
    popCount.current += 1;
    playPuff(audio.muted);
    buzz(6);
    setPops((list) => addPop(list, popAt(popCount.current, (e.clientX - box.left) / unit, (e.clientY - box.top) / unit, seed)));
  };

  const blow = () => {
    if (preview || out) return;
    onBegin();
    playBlow(audio.muted);
    buzz(24);
    setOut(true);
    const cake = cakeRef.current?.getBoundingClientRect();
    const frame = scroller.current?.getBoundingClientRect();
    window.setTimeout(
      () => {
        if (cake && frame) onFire((cake.left + cake.width / 2 - frame.left) / frame.width, Math.max(0.1, (cake.top + cake.height * 0.3 - frame.top) / frame.height));
        playTada(audio.muted);
        setCheer((c) => c + 1);
        // Everyone round the cake cheers at once.
        const near = [...guests.filter((g) => g.section === "cake").reverse(), ...guests.filter((g) => g.section === "list")];
        saidCount.current += 1;
        say(
          near.map((g, k) => ({ i: g.index, text: s.cheers[k % s.cheers.length], key: saidCount.current * 10 + k })),
          2800,
        );
      },
      reduce ? 0 : 560,
    );
  };

  const guestsIn = (section: GuestSpot["section"], dy = 0) =>
    guests
      .filter((g) => g.section === section)
      .map((g) => (
        <GuestPiece
          key={g.id}
          spot={g}
          dy={dy}
          label={s.greetOne.replace("{name}", MEMES[g.id].name[data.locale] ?? MEMES[g.id].name.en)}
          greeted={greeted[g.index] ?? false}
          saying={said.find((x) => x.i === g.index) ?? null}
          spark={look.tiles[g.index % look.tiles.length] === "#FFFDF8" ? look.tiles[0] : look.tiles[g.index % look.tiles.length]}
          still={still}
          reduce={reduce}
          disabled={preview}
          cheer={g.section === "cake" || g.section === "list" ? cheer : 0}
          onGreet={() => greet(g.index)}
        />
      ));

  // The headline makes room for a third row of letters, or gives back the room of one it doesn't need.
  const shift = (Math.max(1, rows.length) - 2) * ROW_H;
  const heroH = HERO_H + shift;
  const photosH = photosHeight(plan);
  const listH = listHeight(guests);
  const size = letterSize(rows);
  const name = data.recipientName.trim();
  const hero = plan.hero !== undefined ? photos[plan.hero] : undefined;
  const second = plan.word !== undefined ? photos[plan.word] : undefined;
  const strip = plan.strip.map((i) => photos[i]).filter(Boolean);
  const loose = plan.loose.map((i) => photos[i]).filter(Boolean);
  const confetti = [data.accentColor, ...look.confetti];
  const onWall = look.ink;
  const wordText = fields.word?.trim() || s.word;
  const word = wordFace(wordText);

  return (
    <CollageContext.Provider value={context}>
      <motion.div className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div ref={scroller} data-scroller="" className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain scrollbar-none" onClick={pop}>
          <div ref={column} className="relative mx-auto w-[calc(100*var(--p))] pt-[calc(4*var(--p))] pb-[calc(72px+env(safe-area-inset-bottom))]">
            {/* 1. happy birthday, their name, their age, and the first photo */}
            <section className="relative" style={{ height: `calc(${heroH} * var(--p))` }}>
              <Layer height={heroH}>
                <Flecks flecks={scatter(seed + 11, 34, heroH).filter((f) => f.y < 137 + shift || f.y > 168 + shift)} colors={confetti} />
              </Layer>
              <Layer height={heroH} shadow className="z-[1]">
                <Streamer from={[-4, 1]} to={[104, 5]} sag={7} width={4.8} twists={10} color={look.streamers[0]} seed={seed + 21} />
                <Streamer from={[-4, 7]} to={[104, 0]} sag={5} width={4.2} twists={11} color={look.streamers[1]} seed={seed + 22} />
              </Layer>

              <Piece x={79} y={59 + shift} w={50} z={2} entrance="bloom" delay={0.05}>
                <PaperFan fan={look.fan} />
              </Piece>
              <Piece x={27} y={125 + shift} w={25} z={2} entrance="bloom" delay={0.15}>
                <PaperFan fan={look.fan2} pleats={22} />
              </Piece>

              <div className="absolute top-[calc(7*var(--p))] left-[calc(5*var(--p))] z-[6]">
                <RansomRows rows={rows} size={size} tiles={look.tiles} seed={seed % 83} className="!items-start">
                  {(letter, i) => (
                    <motion.span className="block" initial={still ? false : { y: "-160%", opacity: 0, rotate: -24 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ delay: 0.1 + i * 0.045, type: "spring", stiffness: 260, damping: 15 }}>
                      {letter}
                    </motion.span>
                  )}
                </RansomRows>
              </div>

              {digits.length ? (
                <Piece x={ageAt(digits.length).x} y={19} w={ageAt(digits.length).w} rotate={-5} z={5} entrance="drop" delay={0.45}>
                  <div className={still ? undefined : "pa-float"} style={{ "--pace": "5.6s" } as CSSProperties}>
                    <FoilNumber value={digits.join("")} foil={look.foil} className="w-full" />
                  </div>
                </Piece>
              ) : (
                <Piece x={84} y={18} w={19} rotate={12} z={5} entrance="bloom" delay={0.45}>
                  <Scrap id="star-felt" eager />
                </Piece>
              )}

              <div className="absolute z-[7]" style={{ left: "calc(7*var(--p))", top: `calc(${30.5 + shift} * var(--p))`, maxWidth: "calc(64*var(--p))" }}>
                <motion.p className="truncate pr-[calc(2*var(--p))] leading-[1.34]" style={{ fontFamily: SCRIPT_FONT, fontSize: `calc(${nameSize(name)} * var(--p))`, color: onWall }} initial={still ? false : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55, duration: 0.6 }}>
                  {name}
                </motion.p>
                <Swash color="var(--gift-accent)" still={still} className="-mt-[calc(4*var(--p))] ml-[calc(1*var(--p))] h-[calc(5*var(--p))] w-[calc(30*var(--p))]" />
              </div>

              <Piece x={48} y={91 + shift} w={62} rotate={-3} z={4} entrance="drop" delay={0.25}>
                <Tape color={look.tape} width={18} className="-top-[calc(2*var(--p))] left-[36%] z-[1] -rotate-3" />
                <Polaroid photo={hero} lip={12} paper={look.paper} onOpen={openPhoto && hero ? () => openPhoto(hero) : undefined} still={still}>
                  <span className="flex w-full items-center gap-[calc(2*var(--p))]">
                    <span className="min-w-0 flex-1 text-left">
                      <Caption size={3.7} color={look.paperInk}>
                        {hero?.caption}
                      </Caption>
                    </span>
                    <Sparkle color="var(--gift-accent)" className="h-[calc(4.6*var(--p))] w-[calc(4.6*var(--p))] shrink-0 opacity-90" />
                  </span>
                </Polaroid>
              </Piece>
              <Piece x={77} y={55 + shift} w={12} rotate={24} z={6} entrance="stamp" delay={0.95}>
                <PartyHat hat={look.hats[0]} />
              </Piece>

              {guestsIn("hero", shift)}

              <div className="absolute inset-x-0 z-[8] flex flex-col items-center gap-[calc(.4*var(--p))] text-center" style={{ top: `calc(${140 + shift} * var(--p))` }}>
                <p className="text-[calc(4.4*var(--p))] leading-none" style={{ fontFamily: "var(--gift-font-hand)", color: onWall }}>
                  {s.hintGuests}
                </p>
                <p className="text-[calc(4.2*var(--p))] leading-[1.5]" style={{ fontFamily: SCRIPT_FONT, color: "var(--gift-accent)" }}>
                  {s.hintTap}
                </p>
                <ScrollHint label={s.scroll} color={onWall} hidden={moved || preview} />
              </div>
            </section>

            {/* 2. the rest of the photos: the one with the word, the booth strip, one more */}
            {second ? (
              <section className="relative" style={{ height: `calc(${photosH} * var(--p))` }}>
                <Layer height={photosH}>
                  <Flecks flecks={scatter(seed + 12, Math.round(photosH / 6), photosH)} colors={confetti} />
                </Layer>
                <Layer height={photosH} shadow className="z-[1]">
                  <Streamer from={[99, -8]} to={[95, Math.min(photosH - 30, 150)]} sag={0} bend={-2.5} width={4.4} twists={9} color={look.streamers[2]} seed={seed + 23} />
                </Layer>
                <Piece x={62} y={44} w={57} rotate={4} z={4} entrance="right">
                  <Tape color={look.streamers[2]} width={16} className="-top-[calc(2*var(--p))] left-[40%] z-[1] rotate-3" />
                  <Polaroid photo={second} aspect={1} lip={16} paper={look.paper} onOpen={openPhoto ? () => openPhoto(second) : undefined} still={still}>
                    <span className="block max-w-full truncate px-[calc(1*var(--p))] leading-[1.35]" style={{ fontFamily: word.script ? SCRIPT_FONT : "var(--gift-font-hand)", fontSize: `calc(${word.size} * var(--p))`, color: look.paperInk }}>
                      {wordText}
                    </span>
                  </Polaroid>
                </Piece>
                <Piece x={19} y={58} w={32} rotate={-10} z={5} entrance="stick" delay={0.2}>
                  <Ticket line={s.ticket} number={ticketNumber(seed)} paper={look.paper} ink={look.paperInk} font={POSTER_FONT} />
                </Piece>
                <Piece x={6} y={50} w={9} rotate={-32} z={6} entrance="stamp" delay={0.45}>
                  <PartyHat hat={look.hats[1]} />
                </Piece>

                {strip.length ? (
                  <>
                    <Piece x={27} y={STRIP_TOP + stripHeight(strip.length) / 2} w={30} rotate={-2.5} z={4} entrance="left">
                      <BoothStrip photos={strip} paper={look.paper} label={s.booth} onOpen={openPhoto} still={still} />
                    </Piece>
                    {strip.map((photo, i) =>
                      photo.caption ? (
                        <div key={photo.id} className="absolute z-[5] flex items-center gap-[calc(1.2*var(--p))]" style={{ left: "calc(45*var(--p))", right: "calc(12*var(--p))", top: `calc(${stripCellY(i)} * var(--p))`, translate: "0 -50%", rotate: `${i % 2 ? 1.5 : -1.5}deg` }}>
                          <Arrow color={onWall} className="h-[calc(3.4*var(--p))] w-[calc(7*var(--p))] shrink-0 opacity-70" style={{ scale: "-1 1" }} />
                          <span className="line-clamp-2 text-[calc(3.9*var(--p))] leading-[1.08]" style={{ fontFamily: "var(--gift-font-hand)", color: onWall }}>
                            {photo.caption}
                          </span>
                        </div>
                      ) : null,
                    )}
                  </>
                ) : null}

                {loose.map((photo) => (
                  <Piece key={photo.id} x={strip.length ? 68 : 36} y={strip.length ? STRIP_TOP + stripHeight(strip.length) + 20 : 120} w={strip.length ? 44 : 48} rotate={strip.length ? 4 : -4} z={5} entrance="stick" delay={0.1}>
                    <Polaroid photo={photo} lip={9} paper={look.paper} onOpen={openPhoto ? () => openPhoto(photo) : undefined} still={still}>
                      <Caption color={look.paperInk}>{photo.caption}</Caption>
                    </Polaroid>
                  </Piece>
                ))}

                {guestsIn("photos")}
              </section>
            ) : null}

            {/* 3. the song */}
            {hasSong ? (
              <section className="relative" style={{ height: `calc(${catalog ? 60 : 54}*var(--p))` }}>
                <Piece x={57} y={catalog ? 30 : 27} w={70} rotate={-2} z={5} entrance="right">
                  {catalog ? (
                    <PreviewMusicCard music={catalog} locale={data.locale} cover={hero} live={mode !== "preview"} colors={{ ...look.card, bar: "var(--gift-accent)" }} />
                  ) : song ? (
                    <MusicCard music={song} audio={audio} cover={hero} live={mode !== "preview"} labels={{ pause: s.pause, play: s.play }} colors={{ ...look.card, bar: "var(--gift-accent)" }} />
                  ) : null}
                </Piece>
                <Piece x={89} y={10} w={10} rotate={18} z={6} entrance="stamp" delay={0.3}>
                  <PartyHat hat={look.hats[2]} />
                </Piece>
                <Piece x={31} y={49} w={5} rotate={0} z={4} entrance="bloom" delay={0.4}>
                  <Sparkle color={look.confetti[1]} className="w-full" />
                </Piece>
                {guestsIn("song")}
              </section>
            ) : null}

            {/* 4. the guest list */}
            <section className="relative" style={{ height: `calc(${listH} * var(--p))` }}>
              <Layer height={listH}>
                <Flecks flecks={scatter(seed + 14, Math.round(listH / 7), listH)} colors={confetti} />
              </Layer>
              <Piece x={38} y={46} w={60} rotate={-2.5} z={5} entrance="stick">
                <div data-guestlist="">
                  <GuestList look={look} s={s} greeted={greeted} still={still} seed={seed} stamp={everyone} />
                </div>
              </Piece>
              {[0, 1, 2].map((k) => (
                <Piece key={k} x={[80, 91, 86][k]} y={[14, 22, 31][k]} w={[14, 13, 12][k]} rotate={[-8, 9, 2][k]} z={3 + k} entrance="bloom" delay={0.1 + k * 0.1}>
                  <div className={still ? undefined : "pa-float"} style={{ "--pace": `${5 + k}s`, animationDelay: `${-k * 1.7}s` } as CSSProperties}>
                    <Balloon tone={look.balloons[(k + 1) % look.balloons.length]} seed={seed + 40 + k} className="w-full" />
                  </div>
                </Piece>
              ))}
              {guestsIn("list")}
            </section>

            {/* 5. the cake */}
            <section className="relative" style={{ height: `calc(${CAKE_H} * var(--p))` }}>
              <Layer height={CAKE_H}>
                <Flecks flecks={scatter(seed + 15, 24, CAKE_H).filter((f) => f.y < 120 || f.y > 148)} colors={confetti} />
              </Layer>
              <div className="absolute inset-x-0 top-[calc(2*var(--p))] z-[6] text-center">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p key={out ? "wished" : "wish"} className="text-[calc(6*var(--p))] leading-[1.45]" style={{ fontFamily: SCRIPT_FONT, color: "var(--gift-accent)" }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.3 }}>
                    {out ? s.wished : s.wish}
                  </motion.p>
                </AnimatePresence>
              </div>
              <Piece x={13} y={36} w={13} rotate={-14} z={4} entrance="bloom" delay={0.2}>
                <Present box={look.gift.box} ribbon={look.gift.ribbon} />
              </Piece>
              <Piece x={90} y={32} w={11} rotate={10} z={4} entrance="bloom" delay={0.3}>
                <div className={still ? undefined : "pa-float"} style={{ "--pace": "5.8s" } as CSSProperties}>
                  <Balloon tone={look.balloons[0]} seed={seed + 50} className="w-full" />
                </div>
              </Piece>
              <div className="absolute z-[5]" style={{ left: "calc(52*var(--p))", top: "calc(66*var(--p))", width: "calc(74*var(--p))", translate: "-50% -50%" }}>
                <motion.div initial={still ? false : { opacity: 0, y: "12%", scale: 0.92 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.3 }} transition={{ type: "spring", stiffness: 110, damping: 15 }}>
                  <button ref={cakeRef} type="button" data-cake="" data-out={out ? "" : undefined} onClick={blow} disabled={preview || out} aria-label={s.blowLabel} className="relative block w-full rounded-[calc(4*var(--p))] outline-none focus-visible:ring-4 focus-visible:ring-[var(--gift-accent)]/60 disabled:cursor-default" style={{ aspectRatio: `${CAKE_BOX.w} / ${CAKE_BOX.h}` }}>
                    <Cake look={look} plan={candles} out={out} still={still} seed={seed} confetti={look.confetti} />
                  </button>
                </motion.div>
              </div>
              {guestsIn("cake")}
              <div className="absolute inset-x-0 z-[7] flex flex-col items-center gap-[calc(2*var(--p))] px-[calc(6*var(--p))] text-center" style={{ top: "calc(124*var(--p))" }}>
                <AnimatePresence>
                  {!out && !preview ? (
                    <motion.div key="blow" className="flex flex-col items-center gap-[calc(2*var(--p))]" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                      <p aria-hidden="true" className="max-w-full rounded-[calc(4*var(--p))] px-[calc(4*var(--p))] py-[calc(1.8*var(--p))] text-[calc(2.9*var(--p))] leading-[1.3] font-semibold tracking-[0.16em] text-balance uppercase shadow-[0_6px_18px_-8px_rgba(0,0,0,.35)]" style={{ background: look.dark ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.88)", color: look.dark ? "#FFF5F0" : "var(--gift-accent-deep)" }}>
                        {s.blowTap}
                      </p>
                      <MicBlow enabled={!out} label={s.micAsk} listening={s.micOn} dark={look.dark} onBlow={blow} />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </section>

            {/* 6. the letter, and what comes after it */}
            <section className="relative mt-[calc(6*var(--p))] px-[calc(5*var(--p))]">
              <div data-letter="" className="relative z-[2] px-[calc(6*var(--p))] pt-[calc(16*var(--p))] pb-[calc(12*var(--p))]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk, boxShadow: "0 calc(1.6*var(--p)) calc(4*var(--p)) rgba(30,10,20,.28)" }}>
                <div className="pointer-events-none absolute inset-x-[calc(-2*var(--p))] top-[calc(1.5*var(--p))]">
                  <Bunting colors={look.tiles} seed={seed} className="w-full" />
                </div>
                <span aria-hidden="true" className="pointer-events-none absolute inset-[calc(2.4*var(--p))] top-[calc(11*var(--p))] rounded-[calc(1*var(--p))] border-dashed" style={{ borderColor: "var(--gift-accent)", borderWidth: "calc(.45*var(--p))", opacity: 0.45 }} />
                <article className="relative">
                  <MessageBody data={data} blocks={blocks} mode={mode} tone="light" face="hand" accent={data.accentColor} />
                </article>
              </div>
              {guestsIn("letter")}
              <div className="absolute inset-x-0 bottom-0 h-0">
                <Piece x={9} y={-4} w={12} rotate={-20} z={4} entrance="stamp" delay={0.2}>
                  <PartyHat hat={look.hats[1]} />
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
                <div className="relative rounded-[calc(2*var(--p))] px-[calc(5*var(--p))] pt-[calc(6*var(--p))] pb-[calc(5*var(--p))] shadow-[0_14px_26px_-18px_rgba(0,0,0,.5)]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk }}>
                  <p className="mb-[calc(3*var(--p))] text-center text-[calc(2.6*var(--p))] tracking-[0.24em] uppercase opacity-70">{t("ps")}</p>
                  <SurpriseReveal surprise={data.surprise} locale={data.locale} tone="light" onReveal={() => onEvent?.({ type: "surprise" })} />
                  <div className="pointer-events-none absolute -top-[calc(5*var(--p))] -right-[calc(2*var(--p))] w-[calc(15*var(--p))] rotate-[14deg]" aria-hidden="true">
                    <Present box={look.gift.box} ribbon={look.gift.ribbon} className="w-full" />
                  </div>
                </div>
              ) : null}
              <div ref={endRef} className="rounded-[calc(2*var(--p))] px-[calc(3*var(--p))] py-[calc(6*var(--p))]" style={{ backgroundColor: look.paper, backgroundImage: PAPER_GRAIN, color: look.paperInk, boxShadow: "0 14px 26px -18px rgba(0,0,0,.5)" }}>
                <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} onReplay={onReplay} songShown={Boolean(catalog)} />
              </div>
            </div>

            {/* the confetti they have thrown, where they threw it */}
            {pops.map((p) => (
              <Handful key={p.id} pop={p} colors={confetti} still={still} />
            ))}
          </div>
        </div>
        <AnimatePresence>{active ? <Lightbox key="box" photo={active} onClose={() => setActive(null)} closeLabel={t("close")} /> : null}</AnimatePresence>
      </motion.div>
    </CollageContext.Provider>
  );
}

/** Where the foil balloons hang across the top right, and how wide: one big digit, two, or three smaller. */
function ageAt(count: number): { x: number; w: number } {
  if (count >= 3) return { x: 82, w: 33 };
  if (count === 2) return { x: 84, w: 27 };
  return { x: 85, w: 16 };
}

/** A photo-booth strip: two to four frames and the booth's name printed at the foot. */
function BoothStrip({ photos, paper, label, onOpen, still }: { photos: GiftPhoto[]; paper: string; label: string; onOpen?: (photo: GiftPhoto) => void; still: boolean }) {
  return (
    <div className="relative flex w-full flex-col" style={{ padding: "calc(2.2*var(--p)) calc(2.2*var(--p)) 0", gap: "calc(1.6*var(--p))", backgroundColor: paper, backgroundImage: PAPER_GRAIN, boxShadow: "0 calc(1.3*var(--p)) calc(2.8*var(--p)) rgba(40,18,22,.32), 0 0 0 1px rgba(60,40,30,.05)" }}>
      {photos.map((photo) => (
        <Shot key={photo.id} photo={photo} aspect={25.6 / 20} onOpen={onOpen ? () => onOpen(photo) : undefined} still={still} />
      ))}
      <p className="grid h-[calc(8*var(--p))] place-items-center text-[calc(2.2*var(--p))] tracking-[0.2em] whitespace-nowrap text-[#3A2E2A] uppercase opacity-70" style={{ fontFamily: "'Courier New', ui-monospace, monospace" }}>
        {label}
      </p>
    </div>
  );
}

/** The guest list, on a torn page of a notebook: a tick by everyone who has said hi. */
function GuestList({ look, s, greeted, still, seed, stamp }: { look: Look; s: Copy; greeted: boolean[]; still: boolean; seed: number; stamp: boolean }) {
  const done = greeted.filter(Boolean).length;
  const lines = "repeating-linear-gradient(180deg, transparent 0 calc(5.2*var(--p) - 1px), rgba(90,130,200,.28) calc(5.2*var(--p) - 1px) calc(5.2*var(--p)))";
  return (
    <TornPaper seed={seed + 31} sides={{ top: true, bottom: true }} depth={2.2} color={look.paper} grain={PAPER_GRAIN}>
      <div className="relative px-[calc(4.4*var(--p))] pt-[calc(4*var(--p))] pb-[calc(5*var(--p))]" style={{ color: look.paperInk }}>
        <span aria-hidden="true" className="absolute inset-y-0 left-[calc(3*var(--p))] w-px" style={{ background: "rgba(220,90,110,.45)" }} />
        <p className="text-[calc(5.2*var(--p))] leading-[1.5]" style={{ fontFamily: SCRIPT_FONT, color: "var(--gift-accent)" }}>
          {s.list}
        </p>
        <ul className="mt-[calc(1*var(--p))]" style={{ backgroundImage: lines, backgroundPosition: "0 calc(-.6*var(--p))" }}>
          {s.names.map((n, i) => (
            <li key={i} className="flex h-[calc(5.2*var(--p))] items-center gap-[calc(1.8*var(--p))]" data-listed={greeted[i] ? "" : undefined}>
              <span className="h-[calc(3.4*var(--p))] w-[calc(3.4*var(--p))] shrink-0">
                <Tick on={!!greeted[i]} color="var(--gift-accent)" still={still} />
              </span>
              <span className="truncate text-[calc(3.7*var(--p))] leading-none" style={{ fontFamily: "var(--gift-font-hand)", opacity: greeted[i] ? 1 : 0.78 }}>
                {n}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-[calc(1.6*var(--p))] text-right text-[calc(3.4*var(--p))] leading-none opacity-70" style={{ fontFamily: "var(--gift-font-hand)" }}>
          {s.listCount.replace("{n}", String(done)).replace("{total}", String(greeted.length))}
        </p>
        <AnimatePresence>
          {stamp ? (
            <motion.div key="stamp" className="pointer-events-none absolute top-[46%] left-[55%] w-max" style={{ x: "-50%", y: "-50%", rotate: -13 }} initial={still ? false : { scale: 2.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 22, delay: 0.3 }}>
              <RubberStamp color="var(--gift-accent-deep)">{s.everyone}</RubberStamp>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </TornPaper>
  );
}

const MOVES = {
  jump: { y: ["0%", "-34%", "0%", "-12%", "0%"], scaleY: [1, 1.08, 0.9, 1.03, 1] },
  spin: { rotate: [0, 380, 360], scale: [1, 1.2, 1] },
  zoom: { scale: [1, 1.75, 0.92, 1.06, 1], rotate: [0, -8, 6, 0, 0] },
  wiggle: { rotate: [0, -18, 16, -12, 8, 0], scale: [1, 1.12, 1.12, 1.06, 1.02, 1] },
} as const;

/**
 * One guest: a sticker that bobs about until it's tapped, then jumps, squeaks and yells its line
 * in a bubble. It springs onto the page as it scrolls into view. `cheer` going up makes it jump
 * without being tapped: the candles have gone out.
 */
function GuestPiece({ spot, dy = 0, label, greeted, saying, spark, still, reduce, disabled, cheer, onGreet }: { spot: GuestSpot; dy?: number; label: string; greeted: boolean; saying: Said | null; spark: string; still: boolean; reduce: boolean; disabled: boolean; cheer: number; onGreet: () => void }) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const cheered = useRef(cheer);

  const hop = (move: keyof typeof MOVES) => {
    if (reduce || !scope.current) return;
    void animate(scope.current, MOVES[move], { duration: move === "spin" ? 0.75 : 0.62, ease: "easeOut" }).then(() => {
      if (scope.current) scope.current.style.transform = "";
    });
  };

  useEffect(() => {
    if (cheer === cheered.current) return;
    cheered.current = cheer;
    if (reduce || !scope.current) return;
    void animate(scope.current, MOVES.jump, { duration: 0.62, ease: "easeOut", delay: (spot.index % 3) * 0.08 }).then(() => {
      if (scope.current) scope.current.style.transform = "";
    });
  }, [cheer, reduce, animate, scope, spot.index]);

  const react = () => {
    onGreet();
    hop(spot.move);
  };

  return (
    <div className="absolute" style={{ left: `calc(${spot.x} * var(--p))`, top: `calc(${spot.y + dy} * var(--p))`, width: `calc(${spot.w} * var(--p))`, translate: "-50% -50%", zIndex: saying ? 40 : spot.z }}>
      <motion.div style={{ rotate: spot.rotate }} initial={still ? false : { scale: 0, rotate: spot.rotate - 30 }} whileInView={{ scale: 1, rotate: spot.rotate }} viewport={{ once: true, amount: 0.3 }} transition={{ delay: spot.section === "hero" ? 0.9 + spot.index * 0.14 : 0.15, type: "spring", stiffness: 320, damping: 13 }}>
        <div className={cn(!still && `pa-idle-${spot.idle}`)} style={{ "--pace": `${spot.pace}s`, animationDelay: `${spot.phase}s` } as CSSProperties}>
          <span ref={scope} className="block will-change-transform">
            <MemeSticker id={spot.id} width="100%" />
          </span>
        </div>
        <button type="button" data-guest={spot.index} data-greeted={greeted ? "" : undefined} aria-label={label} disabled={disabled} onClick={react} className="absolute inset-[6%] rounded-[30%] outline-none focus-visible:ring-4 focus-visible:ring-white/80 disabled:cursor-default" />
        <AnimatePresence>
          {greeted ? (
            <motion.span key="spark" aria-hidden="true" className="pointer-events-none absolute -top-[6%] -right-[4%] h-[calc(5*var(--p))] w-[calc(5*var(--p))]" initial={reduce ? false : { scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 12 }}>
              <Spark color={spark} />
            </motion.span>
          ) : null}
          {saying ? (
            <motion.span key={saying.key} role="status" className="pointer-events-none absolute z-[2]" style={{ ...(spot.below ? { top: "92%" } : { bottom: "94%" }), ...(spot.side === "left" ? { left: 0 } : spot.side === "right" ? { right: 0 } : { left: "50%", translate: "-50% 0" }), rotate: `${-spot.rotate}deg` }} initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.3, y: spot.below ? -10 : 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.16 } }} transition={{ type: "spring", stiffness: 420, damping: 16 }}>
              <Bubble side={spot.side} below={spot.below}>
                {saying.text}
              </Bubble>
            </motion.span>
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/** A handful of confetti: it bursts from where they tapped and the bits come to rest round it. */
function Handful({ pop, colors, still }: { pop: Pop; colors: string[]; still: boolean }) {
  return (
    <div data-pop="" aria-hidden="true" className="pointer-events-none absolute z-[30] h-0 w-0" style={{ left: `calc(${pop.x} * var(--p))`, top: `calc(${pop.y} * var(--p))` }}>
      {still ? null : <motion.span className="absolute block rounded-full border-[calc(.5*var(--p))]" style={{ left: "calc(-5*var(--p))", top: "calc(-5*var(--p))", width: "calc(10*var(--p))", height: "calc(10*var(--p))", borderColor: colors[pop.id % colors.length] }} initial={{ scale: 0.2, opacity: 0.9 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 0.45, ease: "easeOut" }} />}
      {pop.bits.map((b, i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{ left: `calc(${-b.w / 2} * var(--p))`, top: `calc(${-b.h / 2} * var(--p))`, width: `calc(${b.w} * var(--p))`, height: `calc(${b.round ? b.w : b.h} * var(--p))`, borderRadius: b.round ? "999px" : "calc(.15*var(--p))", background: colors[b.color % colors.length], boxShadow: "0 0 0 calc(.12*var(--p)) rgba(255,255,255,.35)" }}
          initial={still ? { x: `calc(${b.dx} * var(--p))`, y: `calc(${b.dy} * var(--p))`, rotate: b.rotate, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={still ? { opacity: 1 } : { x: ["0px", `calc(${b.dx * 0.6} * var(--p))`, `calc(${b.dx} * var(--p))`], y: ["0px", `calc(${-b.peak} * var(--p))`, `calc(${b.dy} * var(--p))`], rotate: [0, b.rotate * 0.6, b.rotate], opacity: 1 }}
          transition={still ? { duration: 0.2 } : { duration: 0.75, times: [0, 0.4, 1], ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/**
 * The microphone, offered and never assumed: a small button asks for it, and while it listens a
 * ring swells with their breath. Denied or missing, it quietly goes and the tap still works. Its
 * own component so a replay mounts a fresh detector, which can't be restarted once stopped.
 */
function MicBlow({ enabled, label, listening, dark, onBlow }: { enabled: boolean; label: string; listening: string; dark: boolean; onBlow: () => void }) {
  const blow = useBlowDetector({ enabled, onBlow });
  if (blow.state === "unsupported" || blow.state === "denied") return null;
  const tone = dark ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.7)";
  if (blow.state === "listening")
    return (
      <p role="status" className="flex items-center gap-[calc(2*var(--p))] text-[calc(3.4*var(--p))]" style={{ fontFamily: "var(--gift-font-hand)" }}>
        <span className="relative grid h-[calc(8*var(--p))] w-[calc(8*var(--p))] place-items-center rounded-full" style={{ background: tone }}>
          <Mic className="h-[calc(3.6*var(--p))] w-[calc(3.6*var(--p))]" />
          <span className="absolute inset-0 rounded-full border" style={{ borderColor: "var(--gift-accent)", transform: `scale(${1 + blow.level * 0.9})`, opacity: 0.3 + blow.level * 0.6 }} />
        </span>
        {listening}
      </p>
    );
  return (
    <button type="button" onClick={() => void blow.start()} className="flex min-h-11 items-center gap-[calc(1.6*var(--p))] rounded-full px-[calc(3.6*var(--p))] text-[calc(3.6*var(--p))] outline-none focus-visible:ring-4 focus-visible:ring-[var(--gift-accent)]/50" style={{ fontFamily: "var(--gift-font-hand)", background: tone }}>
      <Mic className="h-[calc(3.6*var(--p))] w-[calc(3.6*var(--p))]" />
      {label}
    </button>
  );
}

