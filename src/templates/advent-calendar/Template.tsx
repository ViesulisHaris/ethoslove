"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import type { GiftContribution } from "@/lib/gift/schema";
import { isolated } from "@/lib/group/bidi";
import type { OpeningProps, TemplateProps } from "../types";
import { useContainerSize } from "../_shared/hooks/use-container-size";
import { useGiftAudio } from "../_shared/hooks/use-gift-audio";
import { mulberry32 } from "../_shared/random";
import { SoundToggle } from "../_shared/SoundToggle";
import { COVER_VARS } from "../_shared/cover-kit";
import { buzz, prime } from "../_shared/synth";
import { playChime, playEnvelope, playHatch, playSparkle, playTing } from "../_shared/night/sfx";
import { HATCH, MUSIC_CEILING } from "../_shared/night/sound-math";
import { TILE_VARS } from "../_shared/night/tile";
import { useTimers } from "../_shared/night/use-timers";
import { HolidayPage, type BlockKind, type HolidayTheme, type PhotoSlot, type SheetArt } from "../_shared/holiday/page";
import { down, WIDE_PLATE } from "../_shared/holiday/stage";
import { ANCHORS, ART_BASE, DOORS, LEAVES, NICHE, SHEETS, SPRITES } from "./art-map";
import { DOOR_COUNT, doorsFor, previewDoors, progressOf, seedOf, type Door, type Sweet } from "./doors";
import { INK, LOOKS, type LookId } from "./looks";
import { fieldsSchema, type AdventCalendarFields } from "./schema";

const S = {
  en: {
    title: "Merry Christmas, {name}",
    forFrom: "for {to} · from {from}",
    forFromMore: "for {to} · from {from} and {n} more",
    hint: "tap a door to open it",
    found: "{found} of {total} notes found",
    foundOne: "{found} of 1 note found",
    left: "{n} doors left",
    leftOne: "1 door left",
    read: "{read} of {total} notes read",
    readOne: "{read} of 1 note read",
    envelopeHint: "tap an envelope to read it",
    allFound: "every note read · the star is lit",
    allOpen: "every door is open · the star is lit",
    openDoor: "Open door {n}",
    readNote: "Read the note behind door {n}",
    readAgain: "{name}, door {n}",
    sweetAt: "Door {n}: {sweet}",
    noteAt: "Door {n}: a note",
    sweets: { gingerbread: "a gingerbread man", starcookie: "a star cookie", cane: "a candy cane", bauble: "a glass bauble", bell: "a sleigh bell", orange: "a slice of dried orange" } as Record<Sweet, string>,
    star: "Open {from}’s letter",
    door: "door {n}",
    putBack: "Put the note back",
    cardHint: "tap to put it back",
    letterFrom: "a letter from {name}",
    backToDoors: "Back to the doors",
    gallery: "with the letter",
    photo: "photo",
    house: "An advent house of twenty-four numbered doors",
  },
  es: {
    title: "Feliz Navidad, {name}",
    forFrom: "para {to} · de {from}",
    forFromMore: "para {to} · de {from} y {n} más",
    hint: "toca una puerta para abrirla",
    found: "{found} de {total} notas encontradas",
    foundOne: "{found} de 1 nota encontrada",
    left: "quedan {n} puertas",
    leftOne: "queda 1 puerta",
    read: "{read} de {total} notas leídas",
    readOne: "{read} de 1 nota leída",
    envelopeHint: "toca un sobre para leerlo",
    allFound: "todas las notas leídas · la estrella está encendida",
    allOpen: "todas las puertas abiertas · la estrella está encendida",
    openDoor: "Abrir la puerta {n}",
    readNote: "Leer la nota de la puerta {n}",
    readAgain: "{name}, puerta {n}",
    sweetAt: "Puerta {n}: {sweet}",
    noteAt: "Puerta {n}: una nota",
    sweets: { gingerbread: "un hombrecito de jengibre", starcookie: "una galleta de estrella", cane: "un bastón de caramelo", bauble: "una bola de Navidad", bell: "un cascabel", orange: "una rodaja de naranja seca" } as Record<Sweet, string>,
    star: "Abrir la carta de {from}",
    door: "puerta {n}",
    putBack: "Volver a guardar la nota",
    cardHint: "toca para guardarla",
    letterFrom: "una carta de {name}",
    backToDoors: "Volver a las puertas",
    gallery: "con la carta",
    photo: "foto",
    house: "Una casita de Adviento con veinticuatro puertas numeradas",
  },
};
type Copy = (typeof S)["en"];
/** The template's own lines, for whoever draws one of its pieces by itself (the unit tests do). */
export const COPY = S;

const fill = (line: string, vars: Record<string, string | number>) => line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

const readFields = (fields: unknown) => {
  const parsed = fieldsSchema.safeParse(fields);
  const raw = (parsed.success ? parsed.data : fields ?? {}) as Partial<Record<keyof AdventCalendarFields, unknown>>;
  const look = typeof raw.look === "string" && raw.look in LOOKS ? (raw.look as LookId) : "evergreen";
  return { look };
};
export const readLook = (fields: unknown): LookId => readFields(fields).look;

/** A screen wider than a phone held upright shows more of the room than the phone's picture holds. */
const WIDE_MEDIA = "(min-width: 700px), (orientation: landscape)";

/** Every picture a gift in this look opens on, so they can be fetched before it does. The sender's letter's paper comes with the letter. */
export function artFor(lookId: LookId): string[] {
  const wide = typeof window !== "undefined" && window.matchMedia(WIDE_MEDIA).matches;
  const size = wide ? "wide" : "phone";
  const names = [`plate-${lookId}-closed-${size}`, `plate-${lookId}-open-${size}`, "envelope", "tag", "gingerbread", "starcookie", "cane", "bauble", "bell", "orange", "sheet-card-top", "sheet-card-mid", "sheet-card-bottom", "print"];
  return names.map((n) => `${ART_BASE}${n}.webp`);
}

/* ------------------------------------------------------------------------------------------------
 * Where things are in the picture, in stage units (100 across, 170 down), from the scene's own lens.
 * ---------------------------------------------------------------------------------------------- */

type Rect = { x: number; y: number; w: number; h: number };
type Pt = { x: number; y: number };

const A = ANCHORS as unknown as Record<string, Pt>;
const SPRITE = SPRITES as unknown as Record<string, Rect>;
const PLACE = DOORS as unknown as Record<string, { col: number; row: number }>;

/** The whole picture: 360 units by 240, the stage in its middle. */
const PICTURE: Rect = { x: -(WIDE_PLATE - 100) / 2, y: -35, w: WIDE_PLATE, h: 240 };
/** How far the lens is from the house's front, in stage units: what the swing of a door is foreshortened by. */
const LENS = 350;
/** A hair of the open picture taken past an opening's edge, so the edge itself is the open picture's. */
const EDGE = 0.35;
/** A thing standing in the middle of a niche is a little further from the lens than the niche's opening, and so a little smaller. */
const DEPTH = 0.985;

const pct = (share: number) => `${(share * 100).toFixed(3)}%`;
const laid = (r: Rect): CSSProperties => ({ position: "absolute", left: `${r.x}%`, top: down(r.y), width: `${r.w}%`, height: down(r.h) });
/** A rectangle of the stage, as the style of something inside another rectangle of it. */
const within = (box: Rect, r: Rect): CSSProperties => ({ position: "absolute", left: pct((r.x - box.x) / box.w), top: pct((r.y - box.y) / box.h), width: pct(r.w / box.w), height: pct(r.h / box.h) });

type Geometry = {
  /** The opening itself. */
  open: Rect;
  /** The opening and half the frame round it: where a finger opens this door. */
  cell: Rect;
  /** What of the open picture shows the moment the door starts to move: the niche, behind the leaf. */
  inside: Rect;
  /** The open leaf in the picture: its box, and its outline as a clip of that box. */
  leaf: Rect;
  leafClip: string;
  /** The middle of the niche's floor, and how much bigger the niche is drawn than its sprites were. */
  floor: Pt;
  scale: number;
  /** How much of the opening's left its own open leaf stands in front of. */
  covered: number;
};

const GEOMETRY: Record<number, Geometry> = Object.fromEntries(
  Array.from({ length: DOOR_COUNT }, (_, i) => {
    const n = i + 1;
    const tl = A[`d${n}TL`];
    const br = A[`d${n}BR`];
    const open = { x: tl.x, y: tl.y, w: br.x - tl.x, h: br.y - tl.y };
    const frame = (NICHE.frame / NICHE.w) * open.w;
    const cell = { x: open.x - frame / 2, y: open.y - frame / 2, w: open.w + frame, h: open.h + frame };
    // Not past its left edge, where the leaf hangs: that sliver would show the open leaf before the door has moved.
    const inside = { x: open.x, y: open.y - EDGE, w: open.w + EDGE, h: open.h + 2 * EDGE };
    const outline = LEAVES[String(n)] ?? [];
    const cx = outline.reduce((sum, p) => sum + p[0], 0) / Math.max(1, outline.length);
    const cy = outline.reduce((sum, p) => sum + p[1], 0) / Math.max(1, outline.length);
    // a third of a unit wider all round, so the leaf's own soft edge is inside the clip
    const grown = outline.map(([x, y]) => {
      const d = Math.hypot(x - cx, y - cy) || 1;
      return [x + ((x - cx) / d) * EDGE, y + ((y - cy) / d) * EDGE] as const;
    });
    const xs = grown.map((p) => p[0]);
    const ys = grown.map((p) => p[1]);
    const leaf = grown.length ? { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) } : open;
    const leafClip = grown.length ? `polygon(${grown.map(([x, y]) => `${pct((x - leaf.x) / leaf.w)} ${pct((y - leaf.y) / leaf.h)}`).join(", ")})` : "none";
    const covered = Math.max(0, Math.min(open.w * 0.4, Math.max(...outline.map((p) => p[0]), open.x) - open.x));
    return [n, { open, cell, inside, leaf, leafClip, floor: A[`d${n}C`], scale: (open.w / (A.nicheBR.x - A.nicheTL.x)) * DEPTH, covered }];
  }),
);

/** The doors from the top row down, left to right: the order the eye and the Tab key go in. */
const READING_ORDER = Array.from({ length: DOOR_COUNT }, (_, i) => i + 1).sort((a, b) => PLACE[String(b)].row - PLACE[String(a)].row || PLACE[String(a)].col - PLACE[String(b)].col);

/** The gable's round window: its middle and how far out its wreath reaches. */
const STAR = { x: A.starC.x, y: A.starC.y, r: A.starR.x - A.starC.x };
/** Where a finger opens it: the wreath and a little of the gable round it, which on a phone on its side is what makes it 44 px. */
const STAR_REACH = 1.1;
const STAR_BUTTON: Rect = { x: STAR.x - STAR.r * STAR_REACH, y: STAR.y - STAR.r * STAR_REACH, w: STAR.r * 2 * STAR_REACH, h: STAR.r * 2 * STAR_REACH };
/** What of the other picture the lit window is: the glass and its wreath, and nothing of the doors under it. */
const STAR_LIT: Rect = { x: STAR.x - STAR.r * 1.22, y: STAR.y - STAR.r * 1.22, w: STAR.r * 2.44, h: STAR.r * 2.44 };
const STAR_HALO: Rect = { x: STAR.x - STAR.r * 2.6, y: STAR.y - STAR.r * 2.6, w: STAR.r * 5.2, h: STAR.r * 5.2 };

/**
 * How far right of the niche's middle a thing stands: towards the middle of what the open leaf leaves in
 * sight, and never so far that its own picture would run past the niche's right side.
 */
function aside(g: Geometry, name: string): number {
  const room = (g.inside.w - SPRITE[name].w * g.scale) / 2 - 0.15;
  return Math.max(0, Math.min(g.covered / 2, room));
}
/** A sprite stood on a niche's floor, as a style inside that niche's `inside` box. */
function stood(g: Geometry, name: string): CSSProperties {
  const sp = SPRITE[name];
  return { ...within(g.inside, { x: g.floor.x + aside(g, name) + (sp.x - A.nicheFloor.x) * g.scale, y: g.floor.y + (sp.y - A.nicheFloor.y) * g.scale, w: sp.w * g.scale, h: sp.h * g.scale }), maxWidth: "none" };
}
/** Where a name is written on the tag, the same way: as much of the tag's face as the open leaf leaves in sight. */
function tagFace(g: Geometry): Rect {
  const x = g.floor.x + aside(g, "tag") + (A.tagTL.x - A.nicheFloor.x) * g.scale;
  const right = x + (A.tagBR.x - A.tagTL.x) * g.scale;
  const left = Math.max(x, g.open.x + g.covered + 0.4);
  return { x: left, y: g.floor.y + (A.tagTL.y - A.nicheFloor.y) * g.scale, w: right - left, h: (A.tagBR.y - A.tagTL.y) * g.scale };
}

/**
 * The line at the foot. The picture ends at the mantel's front edge (171 units down); under it the room is dark.
 * On most phones that edge is at the foot of the screen and the line is written on the wood. A screen tall enough
 * to show a band of that dark under the mantel has the line there, a third of the way down what is spare.
 */
const MANTEL_EDGE = 171;
const FOOT_LINES = 8;
/** How many units tall, for a hundred across, a screen is before the band holds two lines with room round them. */
const TALL = 2 * (MANTEL_EDGE - 85) + FOOT_LINES + 16;
const FOOT_ON_WOOD = down(156.6);
const FOOT_IN_BAND = `calc(${MANTEL_EDGE} * var(--k) + (50cqh - ${MANTEL_EDGE - 85 + FOOT_LINES} * var(--k)) * .35)`;

const SWING_S = HATCH.swing;
const KEYFRAMES = `
.ac-leaf{transform-origin:0% 50%;animation:ac-swing ${SWING_S}s cubic-bezier(.42,.08,.3,1) both}
@keyframes ac-swing{0%{transform:rotateY(0deg);opacity:1}72%{opacity:1}100%{transform:rotateY(-80deg);opacity:0}}
.ac-settle{animation:ac-settle ${SWING_S}s linear both}
@keyframes ac-settle{0%,70%{opacity:0}100%{opacity:1}}
.ac-pop{animation:ac-pop .4s cubic-bezier(.2,1.5,.4,1) .12s both}
@keyframes ac-pop{from{transform:translateY(7%) scale(.86);opacity:0}to{transform:none;opacity:1}}
.ac-ring{animation:ac-ring 3.2s ease-in-out infinite}
@keyframes ac-ring{0%,100%{opacity:.55;transform:scale(.94)}50%{opacity:1;transform:scale(1.04)}}
.ac-nudge{animation:ac-nudge .5s ease-out}
@keyframes ac-nudge{0%{transform:scale(1)}40%{transform:scale(1.06)}100%{transform:scale(1)}}
.ac-root{overflow:hidden;overflow:clip}
.ac-door{-webkit-tap-highlight-color:transparent}
.ac-door[data-sweet]{cursor:default}
@media (hover:hover){.ac-door[data-shut]:hover{background:rgba(255,240,205,.14)}.ac-door[data-note]:hover{background:radial-gradient(ellipse closest-side, rgba(255,238,196,.3) 0%, rgba(255,238,196,.12) 62%, rgba(255,238,196,0) 100%)}.ac-star:hover{background:radial-gradient(circle closest-side, rgba(255,226,160,.3) 0%, rgba(255,226,160,0) 100%)}}
.ac-door[data-shut]:active{background:rgba(255,240,205,.24)}
.ac-door[data-note]:active{background:radial-gradient(ellipse closest-side, rgba(255,238,196,.46) 0%, rgba(255,238,196,.2) 62%, rgba(255,238,196,0) 100%)}
.ac-star:active{background:radial-gradient(circle closest-side, rgba(255,226,160,.45) 0%, rgba(255,226,160,0) 100%)}
.ac-foot{top:${FOOT_ON_WOOD}}
@container (max-aspect-ratio: 100 / ${TALL}){.ac-foot{top:${FOOT_IN_BAND}}}
@media (prefers-reduced-motion: reduce){.ac-leaf,.ac-settle,.ac-pop,.ac-ring,.ac-nudge{animation:none}.ac-leaf{opacity:0}}
`;

/** The scene's own unit. A phone held upright fits the house to its width; a low wide screen fits it to its height and moves the words beside it. */
const UNIT = { "--k": "min(1cqw, calc(100cqh / 162))" } as CSSProperties;
/**
 * A phone on its side: the house from the snow on its ridge (31 units down) to the mantel under it (150), and
 * no more wall or wood than frames it, so that a door is as big as six rows under a gable can be on that screen.
 */
const LOW_UNITS = 128;
const UNIT_LOW = { "--k": `calc(100cqh / ${LOW_UNITS})` } as CSSProperties;
/** On a low screen the stage is moved up so that the house, not the wall over it, is in the middle. */
const LOW_SHIFT = -8.5;

export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<AdventCalendarFields>) {
  const reduce = !!useReducedMotion();
  const s = S[data.locale] ?? S.en;
  const preview = mode === "preview";
  const audio = useGiftAudio(data.music, !preview, MUSIC_CEILING);
  const f = useMemo(() => readFields(data.fields), [data.fields]);
  const seed = seedOf(data.recipientName, data.senderName);
  // One door a person: a card can never be sent with more notes than doors, and one that somehow holds more shows the first twenty-four.
  const notes = useMemo(() => (data.contributions ?? []).slice(0, DOOR_COUNT), [data.contributions]);
  const doors = useMemo(() => doorsFor(seed, notes.length), [seed, notes.length]);
  const still = useMemo(() => previewDoors(doors), [doors]);

  const root = useRef<HTMLDivElement>(null);
  const size = useContainerSize(root);
  const low = size.ready && size.height < 500 && size.width > size.height * 1.15;

  const [opened, setOpened] = useState<number[]>([]);
  /** The keys of the notes that have been read: a key stays its note's own as the list changes round it. */
  const [readKeys, setReadKeys] = useState<string[]>([]);
  const [swinging, setSwinging] = useState<number[]>([]);
  /** The note in hand: its door, and where on the screen it was lifted from. */
  const [reading, setReading] = useState<{ door: number; from: Pt } | null>(null);
  const [letter, setLetter] = useState(false);
  const [nudge, setNudge] = useState(0);
  /** The door opened last: what was behind it is said once, for whoever cannot see it. */
  const [lastOpened, setLastOpened] = useState(0);
  const [run, setRun] = useState(0);
  const { after, clear } = useTimers();

  const begun = useRef(false);
  const mutedRef = useRef(false);
  const eventRef = useRef(onEvent);
  const sweetsFound = useRef(0);
  const starLit = useRef(false);
  useEffect(() => {
    eventRef.current = onEvent;
    mutedRef.current = audio.muted;
  });

  const begin = () => {
    if (begun.current) return;
    begun.current = true;
    prime();
    void audio.start();
    eventRef.current?.({ type: "started" });
  };

  const noteAt = (number: number): GiftContribution | undefined => {
    const door = doors[number - 1];
    return door?.kind === "note" ? notes[door.index] : undefined;
  };
  const readCount = notes.filter((n) => readKeys.includes(n.key)).length;
  const lit = notes.length ? readCount === notes.length : opened.length === DOOR_COUNT;

  const report = (openedCount: number, read: number) => eventRef.current?.({ type: "progress", pct: progressOf(openedCount, read, notes.length) });

  const openDoor = (number: number) => {
    if (opened.includes(number)) return;
    begin();
    const next = [...opened, number];
    setOpened(next);
    setLastOpened(number);
    if (!reduce) setSwinging((list) => [...list, number]);
    playHatch(mutedRef.current, 0.33);
    buzz(8);
    const door = doors[number - 1];
    if (door.kind === "sweet") {
      const step = sweetsFound.current++;
      // as the leaf comes to rest and the sweet is seen
      after(reduce ? 60 : SWING_S * 1000 - 140, () => playTing(mutedRef.current, step, 0.3));
    } else {
      // the photo in the note behind it, fetched now that its envelope is in sight
      const url = notes[door.index]?.photo?.url;
      if (url) new Image().src = url;
    }
    report(next.length, readCount);
    if (!notes.length && next.length === DOOR_COUNT) lightStar();
  };

  const lightStar = () => {
    if (starLit.current) return;
    starLit.current = true;
    after(reduce ? 80 : 700, () => playSparkle(mutedRef.current, { delay: 0.05, ms: 1100 }));
  };

  const readNote = (number: number, from: Pt) => {
    const note = noteAt(number);
    if (!note) return;
    begin();
    setReading({ door: number, from });
    playEnvelope(mutedRef.current, 0.35);
    buzz(6);
  };

  const putBack = () => {
    if (!reading) return;
    const note = noteAt(reading.door);
    setReading(null);
    if (!note || readKeys.includes(note.key)) return;
    const next = [...readKeys, note.key];
    setReadKeys(next);
    const read = notes.filter((n) => next.includes(n.key)).length;
    report(opened.length, read);
    if (read === notes.length) lightStar();
  };

  const openLetter = () => {
    begin();
    setLetter(true);
    buzz(18);
    playChime(mutedRef.current, 2);
    eventRef.current?.({ type: "progress", pct: 92 });
  };

  /** A tap that lands on no door: the foot's line answers, and nothing opens. */
  const stray = () => {
    begin();
    setNudge((n) => n + 1);
  };

  const replay = () => {
    clear();
    begun.current = false;
    sweetsFound.current = 0;
    starLit.current = false;
    setOpened([]);
    setReadKeys([]);
    setSwinging([]);
    setReading(null);
    setLetter(false);
    setLastOpened(0);
    setRun((r) => r + 1);
  };

  const look = LOOKS[f.look];
  const title = data.title?.trim() || fill(s.title, { name: data.recipientName });
  const inHand = reading ? noteAt(reading.door) : undefined;
  const busy = !!inHand || letter;

  return (
    <div
      ref={root}
      data-advent-root=""
      className="ac-root absolute inset-0 overflow-hidden select-none"
      style={{ ...COVER_VARS, background: look.floor, color: INK.ink, fontFamily: "var(--gift-font-body)" } as CSSProperties}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        // a photo of the letter's, open over it, is what Escape closes first: the letter stays where it was being read
        const photo = root.current?.querySelector<HTMLElement>("[data-lightbox] button");
        if (photo) photo.click();
        else if (inHand) putBack();
        else if (letter) setLetter(false);
      }}
    >
      <Scene
        key={`scene-${run}`}
        lookId={f.look}
        s={s}
        title={title}
        from={data.senderName}
        to={data.recipientName}
        notes={notes}
        doors={doors}
        opened={preview ? still.open : opened}
        readDoors={preview ? still.read : doors.filter((d) => d.kind === "note" && readKeys.includes(notes[d.index]?.key ?? "")).map((d) => d.number)}
        inHand={inHand ? reading?.door : undefined}
        swinging={swinging}
        lit={!preview && lit}
        nudge={nudge}
        lastOpened={preview ? 0 : lastOpened}
        reduce={reduce}
        low={low}
        wide={size}
        inert={preview}
        away={busy}
        onDoor={openDoor}
        onNote={readNote}
        onStar={openLetter}
        onStray={stray}
        onSwung={(n) => setSwinging((list) => list.filter((d) => d !== n))}
      />
      <AnimatePresence>
        {inHand && reading ? (
          <NoteCard key={`note-${reading.door}`} lookId={f.look} s={s} note={inHand} door={reading.door} from={reading.from} seed={seed} read={readCount + (readKeys.includes(inHand.key) ? 0 : 1)} total={notes.length} reduce={reduce} low={low} onClose={putBack} />
        ) : null}
      </AnimatePresence>
      {letter && !preview ? (
        <Letter key={`letter-${run}`} lookId={f.look} s={s} data={data} seed={seed} mode={mode} still={reduce} onBack={() => setLetter(false)} onEvent={onEvent} onReact={onReact} onMakeOne={onMakeOne} onReplay={replay} />
      ) : null}
      {audio.hasMusic && !preview ? <SoundToggle audio={audio} locale={data.locale} /> : null}
    </div>
  );
}

/** The cover picker's Classic tile: the house with every door shut. */
export function Opening({ fields, recipientName, senderName, locale }: OpeningProps) {
  const f = readFields(fields);
  const look = LOOKS[f.look];
  const s = S[locale] ?? S.en;
  const doors = useMemo(() => doorsFor(seedOf(recipientName, senderName), 0), [recipientName, senderName]);
  return (
    <div data-advent-tile="" className="ac-root absolute inset-0 overflow-hidden select-none" style={{ ...TILE_VARS, background: look.floor, color: INK.ink } as CSSProperties}>
      <Scene lookId={f.look} s={s} title={fill(s.title, { name: recipientName })} from={senderName} to={recipientName} notes={[]} doors={doors} opened={[]} readDoors={[]} swinging={[]} lit={false} nudge={0} lastOpened={0} reduce low={false} inert tile away={false} onDoor={() => {}} onNote={() => {}} onStar={() => {}} onStray={() => {}} onSwung={() => {}} />
    </div>
  );
}

/** A window in the stage through which one of the two pictures of the room shows: the same picture, in the same place, as the one behind it. */
function Picture({ lookId, open, box, mirrored }: { lookId: LookId; open: boolean; box: Rect; mirrored?: -1 | 1 }) {
  const name = `${ART_BASE}plate-${lookId}-${open ? "open" : "closed"}`;
  const place = mirrored ? { ...PICTURE, x: mirrored < 0 ? PICTURE.x - PICTURE.w : PICTURE.x + PICTURE.w } : PICTURE;
  const style: CSSProperties = { ...within(box, place), maxWidth: "none", objectFit: "contain", transform: mirrored ? "scaleX(-1)" : undefined };
  if (mirrored) return <img src={`${name}-wide.webp`} alt="" draggable={false} style={style} />;
  return (
    <picture>
      <source media={WIDE_MEDIA} srcSet={`${name}-wide.webp`} />
      <img src={`${name}-phone.webp`} alt="" draggable={false} style={style} />
    </picture>
  );
}

const STAGE_BOX: Rect = { x: 0, y: 0, w: 100, h: 170 };

type SceneProps = {
  lookId: LookId;
  s: Copy;
  title: string;
  from: string;
  to: string;
  notes: readonly GiftContribution[];
  doors: readonly Door[];
  opened: readonly number[];
  readDoors: readonly number[];
  /** The door whose note is out of its niche, being read. */
  inHand?: number;
  swinging: readonly number[];
  lit: boolean;
  nudge: number;
  /** The door opened last, 0 for none: what it held is said once in the foot's line, out of sight. */
  lastOpened: number;
  reduce: boolean;
  low: boolean;
  wide?: { width: number; height: number; ready: boolean };
  /** Nothing to press: the editor's still frame and the cover picker's tile. */
  inert?: boolean;
  /**
   * The cover picker's tile, a thumb wide: the house and the title, and none of the small lines. Their type has a
   * smallest size, which on a tile was a third of its width: the byline was cut to "FOR THEIR…" and "tap a door to
   * open it" ran off the tile's foot.
   */
  tile?: boolean;
  /** A note or the letter is being read in front of it: still there, dimmed, out of reach of finger and keyboard. */
  away: boolean;
  onDoor: (number: number) => void;
  onNote: (number: number, from: Pt) => void;
  onStar: () => void;
  onStray: () => void;
  onSwung: (number: number) => void;
};

function Scene({ lookId, s, title, from, to, notes, doors, opened, readDoors, inHand, swinging, lit, nudge, lastOpened, reduce, low, wide, inert = false, tile = false, away, onDoor, onNote, onStar, onStray, onSwung }: SceneProps) {
  const look = LOOKS[lookId];
  const buttons = useRef(new Map<number, HTMLButtonElement>());
  const starButton = useRef<HTMLButtonElement>(null);
  const wasAway = useRef<{ door?: number; star: boolean } | null>(null);
  // When a note is put back, or the letter left, the keyboard is back on what opened it.
  useEffect(() => {
    if (away) {
      if (!wasAway.current) wasAway.current = { door: inHand, star: inHand === undefined };
      return;
    }
    const last = wasAway.current;
    wasAway.current = null;
    if (!last) return;
    const target = last.star ? starButton.current : last.door !== undefined ? buttons.current.get(last.door) : null;
    target?.focus({ preventScroll: true });
  }, [away, inHand]);

  // past the picture's own edges, on a screen wider than it, the room goes on as its own reflection
  const k = wide?.ready ? (low ? wide.height / LOW_UNITS : Math.min(wide.width / 100, wide.height / 162)) : 0;
  const beyond = !!wide?.ready && wide.width > PICTURE.w * k + 2;

  // found: its door is open and its envelope in sight. Read is another thing, and what lights the star.
  const found = opened.filter((n) => doors[n - 1]?.kind === "note").length;
  const left = DOOR_COUNT - opened.length;
  const others = notes.length;
  const byline = others > 0 ? fill(s.forFromMore, { to: isolated(to), from: isolated(from), n: others }) : fill(s.forFrom, { to: isolated(to), from: isolated(from) });
  const read = readDoors.length;
  // Until every door is open the line counts what has been found; after that, what has been read: "8 of 8 notes found" read as done, with eight envelopes unopened.
  const count = !others ? null : left ? fill(others === 1 ? s.foundOne : s.found, { found, total: others }) : fill(others === 1 ? s.readOne : s.read, { read, total: others });
  const line = !opened.length
    ? s.hint
    : lit
      ? others
        ? s.allFound
        : s.allOpen
      : [count, left ? fill(left === 1 ? s.leftOne : s.left, { n: left }) : null].filter(Boolean).join(" · ");
  // An envelope is in sight and none has been opened yet: nothing else on the screen says it can be.
  const next = !lit && found > 0 && read === 0 ? s.envelopeHint : null;
  const last = lastOpened ? doors[lastOpened - 1] : undefined;
  const said = !last ? "" : last.kind === "sweet" ? fill(s.sweetAt, { n: last.number, sweet: s.sweets[last.sweet] }) : fill(s.noteAt, { n: last.number });
  const shadow = "0 0 calc(2.4*var(--k)) rgba(4,8,6,.95), 0 0 calc(.8*var(--k)) rgba(4,8,6,.8)";
  // while a note or the letter is in front, the words over the wall step back: blurred, they were smudges behind its own words
  const back: CSSProperties = { opacity: away ? 0 : 1, transition: reduce ? undefined : "opacity .3s ease" };

  const words = (
    <>
      {tile ? null : (
        <p dir="auto" className="max-w-full truncate uppercase" style={{ color: look.labelSoft, fontSize: "max(8.5px, calc(2.2*var(--k)))", letterSpacing: low ? "0.16em" : "0.3em" }}>
          {byline}
        </p>
      )}
      <h1 dir="auto" className="mt-[calc(1.4*var(--k))] line-clamp-2 max-w-full leading-[1.06] text-balance [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-display)", fontWeight: 500, fontSize: title.length > 40 ? "calc(4.6*var(--k))" : title.length > 22 ? "calc(5.8*var(--k))" : "calc(7.6*var(--k))" }}>
        {title}
      </h1>
    </>
  );
  const foot = (
    <div role="status" data-foot="" style={{ fontFamily: "var(--gift-font-display)", fontStyle: "italic", lineHeight: 1.2, color: look.labelSoft }}>
      {said ? <span className="sr-only">{said}. </span> : null}
      <div key={nudge} className={nudge && !reduce ? "ac-nudge" : undefined}>
        <p data-foot-count="" style={{ fontSize: "max(12px, calc(3.5*var(--k)))" }}>
          {line}
        </p>
        {next ? (
          <p data-foot-hint="" style={{ fontSize: "max(11px, calc(3*var(--k)))", marginTop: "calc(.5*var(--k))", color: look.label }}>
            {next}
          </p>
        ) : null}
      </div>
    </div>
  );

  return (
    // while a note or the letter is read the room stays where it is, behind it, out of reach of finger and keyboard
    <div
      className="absolute inset-0"
      style={low ? UNIT_LOW : UNIT}
      inert={away}
      aria-hidden={away || undefined}
      onClick={(e: ReactMouseEvent) => {
        if (!inert && !(e.target as HTMLElement).closest("button")) onStray();
      }}
    >
      <style>{KEYFRAMES}</style>
      <div
        role={inert ? "img" : "group"}
        aria-label={s.house}
        style={{ position: "absolute", top: "50%", left: "50%", width: "calc(100 * var(--k))", height: "calc(170 * var(--k))", transform: low ? `translate(-50%, calc(-50% + ${LOW_SHIFT} * var(--k)))` : "translate(-50%, -50%)" }}
      >
        {/* the room, every door shut */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {beyond ? [-1, 1].map((side) => <Picture key={side} lookId={lookId} open={false} box={STAGE_BOX} mirrored={side as -1 | 1} />) : null}
          <Picture lookId={lookId} open={false} box={STAGE_BOX} />
        </div>

        {/* the star window, lit: the same window out of the other picture, its glow fading into the gable */}
        <div aria-hidden="true" className="pointer-events-none overflow-hidden rounded-full" style={{ ...laid(STAR_LIT), opacity: lit ? 1 : 0, transition: reduce ? undefined : "opacity 1.6s ease", maskImage: "radial-gradient(circle closest-side, #000 56%, transparent 99%)", WebkitMaskImage: "radial-gradient(circle closest-side, #000 56%, transparent 99%)" }}>
          <Picture lookId={lookId} open box={STAR_LIT} />
        </div>
        <div aria-hidden="true" data-star-lit={lit ? "" : undefined} className="pointer-events-none" style={{ ...laid(STAR_HALO), opacity: lit ? 1 : 0, transition: reduce ? undefined : "opacity 1.6s ease" }}>
          <span className={lit && !reduce && !away ? "ac-ring absolute inset-0 rounded-full" : "absolute inset-0 rounded-full"} style={{ background: "radial-gradient(circle closest-side, rgba(255,206,120,.34) 0%, rgba(255,190,96,.16) 38%, rgba(255,180,80,0) 100%)", mixBlendMode: "screen" }} />
        </div>

        {/* what is behind each open door: its lit niche out of the other picture, and whatever stands in it */}
        {opened.map((n) => {
          const g = GEOMETRY[n];
          const door = doors[n - 1];
          if (!g || !door) return null;
          const note = door.kind === "note" ? notes[door.index] : undefined;
          const read = readDoors.includes(n);
          const fresh = !inert && !reduce && swinging.includes(n);
          return (
            <div key={n} aria-hidden="true" className="pointer-events-none overflow-hidden" style={laid(g.inside)} data-niche={n} data-holds={door.kind === "sweet" ? door.sweet : read ? "tag" : "envelope"}>
              <Picture lookId={lookId} open box={g.inside} />
              {door.kind === "sweet" ? (
                <img src={`${ART_BASE}${door.sweet}.webp`} alt="" draggable={false} className={fresh ? "ac-pop" : undefined} style={{ ...stood(g, door.sweet), transformOrigin: "50% 100%" }} />
              ) : inHand === n ? null : read && note ? (
                <>
                  <img src={`${ART_BASE}tag.webp`} alt="" draggable={false} style={stood(g, "tag")} />
                  <TagName g={g} name={note.name} />
                </>
              ) : (
                <img src={`${ART_BASE}envelope.webp`} alt="" draggable={false} style={stood(g, "envelope")} />
              )}
            </div>
          );
        })}

        {/* each open door's leaf, standing out of the picture towards the lens: over its neighbours, as it is in the room */}
        {opened.map((n) => {
          const g = GEOMETRY[n];
          if (!g) return null;
          return (
            <div key={n} aria-hidden="true" className={`pointer-events-none overflow-hidden${!inert && !reduce && swinging.includes(n) ? " ac-settle" : ""}`} style={{ ...laid(g.leaf), clipPath: g.leafClip, WebkitClipPath: g.leafClip }}>
              <Picture lookId={lookId} open box={g.leaf} />
            </div>
          );
        })}

        {/* a door on its way open: the shut picture's own door, turned on its left edge as the lens would see it turn, gone as the open leaf comes in under it */}
        {swinging.length && !inert ? (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ perspective: `calc(${LENS} * var(--k))`, perspectiveOrigin: "50% 50%" }}>
            {swinging.map((n) => {
              const g = GEOMETRY[n];
              return g ? (
                <div key={n} className="ac-leaf overflow-hidden" style={laid(g.open)} onAnimationEnd={() => onSwung(n)}>
                  <Picture lookId={lookId} open={false} box={g.open} />
                </div>
              ) : null;
            })}
          </div>
        ) : null}

        {/* the words over the wall, on a phone: between the string of lights and the roof, growing upward if the title needs two lines. A low wide screen has them beside the house, on the bare wall this side of the tall candle. */}
        {low ? null : (
          <>
            <div className="pointer-events-none absolute inset-x-[5%] flex flex-col items-center text-center" style={{ ...back, bottom: down(170 - 30.6), color: look.label, textShadow: shadow }}>
              {words}
            </div>
            {tile ? null : (
              <div className="ac-foot pointer-events-none absolute inset-x-[4%] text-center" style={{ ...back, textShadow: shadow }}>
                {foot}
              </div>
            )}
          </>
        )}

        {inert ? null : (
          <>
            {/* the star window is the sender's own letter, and can be opened whenever they like */}
            <button ref={starButton} type="button" data-star="" aria-label={fill(s.star, { from: isolated(from) })} onClick={onStar} className="ac-door ac-star z-[6] cursor-pointer rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-white" style={laid(STAR_BUTTON)} />
            {READING_ORDER.map((n) => {
              const g = GEOMETRY[n];
              const door = doors[n - 1];
              if (!g || !door) return null;
              const isOpen = opened.includes(n);
              const note = door.kind === "note" ? notes[door.index] : undefined;
              // An open door with a sweet behind it is something to look at, not to press. It stays a button all the same, switched off and
              // named for what it holds: taken away, it took the keyboard's focus with it, and a screen reader's place in the house.
              const sweet = isOpen && !note;
              const label = !isOpen ? fill(s.openDoor, { n }) : sweet ? fill(s.sweetAt, { n, sweet: door.kind === "sweet" ? s.sweets[door.sweet] : "" }) : readDoors.includes(n) && note ? fill(s.readAgain, { name: isolated(note.name), n }) : fill(s.readNote, { n });
              return (
                <button
                  key={n}
                  ref={(el) => {
                    if (el) buttons.current.set(n, el);
                    else buttons.current.delete(n);
                  }}
                  type="button"
                  data-door={n}
                  data-shut={isOpen ? undefined : ""}
                  data-note={isOpen && !sweet ? "" : undefined}
                  data-sweet={sweet ? "" : undefined}
                  aria-disabled={sweet || undefined}
                  aria-label={label}
                  onClick={(e) => {
                    if (!isOpen) return onDoor(n);
                    // nothing more to open here: the foot's line answers, as it does a tap on the wall
                    if (sweet) return onStray();
                    const host = e.currentTarget.closest("[data-advent-root]")?.getBoundingClientRect();
                    const box = e.currentTarget.getBoundingClientRect();
                    onNote(n, host ? { x: box.left + box.width / 2 - (host.left + host.width / 2), y: box.top + box.height / 2 - (host.top + host.height / 2) } : { x: 0, y: 0 });
                  }}
                  className="ac-door z-[6] cursor-pointer rounded-[calc(.5*var(--k))] outline-none focus-visible:ring-[3px] focus-visible:ring-white focus-visible:ring-inset"
                  style={laid(g.cell)}
                />
              );
            })}
          </>
        )}
      </div>

      {low ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex flex-col items-center justify-center gap-[calc(5*var(--k))] pr-[calc(2*var(--k))] pl-[calc(5*var(--k))] text-center" style={{ ...back, width: "calc(50% - 69 * var(--k))", color: look.label, textShadow: shadow }}>
          <div className="flex max-w-full flex-col items-center">{words}</div>
          {foot}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The smallest a name is written on a tag, in stage units: 10 px on a phone 390 wide. Smaller, it was there and could
 * not be read. Where the whole house is drawn small (a phone on its side) it is never under 8.5 px, which two lines of
 * still fit the tag's face.
 */
export const TAG_SMALLEST = 2.6;
const TAG_FLOOR_PX = 8.5;
/** The sizes a name is tried at, largest first, in stage units; how its lines are set; the room kept either side of it, in ems. */
const TAG_SIZES = [3.9, 3.5, 3.1, 2.8, TAG_SMALLEST] as const;
const TAG_LEADING = 0.98;
const TAG_MARGIN = 0.16;
/** A last try at the smallest size before a word is broken: the letters a hair closer, the margins a hair less. */
const TAG_TIGHT = { track: -0.04, margin: 0.1 };

export type TagFit = {
  /** The size it is written at, in stage units. */
  size: number;
  /** Letters drawn closer together, in ems. */
  track: number;
  /** The whole name is on the tag, no word broken: nothing needs cutting. */
  whole: boolean;
};

/**
 * How a name is written on a tag: the largest size at which every word stays whole and the name takes no more
 * lines than the tag's face has room for (one line of a large hand, two of a small one). `words` and `space` are
 * widths in ems, as the handwriting face draws them; `letters` is how many each word has; `face` is the tag's face
 * in stage units. `floor` is the smallest any writing is drawn on this screen, in the same units (8.5 px, which on a
 * phone on its side is more than the smallest size): a size under it is drawn at it, and takes that much room.
 * A name that fits at no size is written at the smallest, where it will be broken and cut.
 */
export function fitTag(words: readonly number[], letters: readonly number[], space: number, face: { w: number; h: number }, floor = 0): TagFit {
  const lines = (nominal: number, track: number, margin: number) => {
    const size = Math.max(nominal, floor);
    const room = face.w - 2 * margin * size;
    let count = 1;
    let used = 0;
    for (const [i, em] of words.entries()) {
      const width = (em + track * letters[i]) * size;
      if (width > room) return Infinity;
      if (used && used + space * size + width > room) {
        count++;
        used = width;
      } else used += (used ? space * size : 0) + width;
    }
    return count;
  };
  for (const size of TAG_SIZES) if (lines(size, 0, TAG_MARGIN) <= tagHolds(face, size)) return { size, track: 0, whole: true };
  if (lines(TAG_SMALLEST, TAG_TIGHT.track, TAG_TIGHT.margin) <= tagHolds(face, TAG_SMALLEST)) return { size: TAG_SMALLEST, track: TAG_TIGHT.track, whole: true };
  return TAG_BROKEN;
}

/** How many lines of a size the tag's face has the height for: one of a large hand, two of a small one, never more. */
const tagHolds = (face: { h: number }, size: number) => Math.min(2, Math.max(1, Math.floor(face.h / (size * TAG_LEADING))));
/** A name no size holds: the smallest size, broken where it must be and cut past two lines. */
const TAG_BROKEN: TagFit = { size: TAG_SMALLEST, track: 0, whole: false };

const tagStyle = (fit: TagFit): CSSProperties => ({
  fontFamily: "var(--gift-font-hand)",
  fontSize: `max(${TAG_FLOOR_PX}px, calc(${fit.size}*var(--k)))`,
  lineHeight: TAG_LEADING,
  letterSpacing: fit.track ? `${fit.track}em` : undefined,
  paddingInline: `${fit.whole ? (fit.track ? TAG_TIGHT.margin : TAG_MARGIN) : 0.22}em`,
  color: "#4a2418",
});

/**
 * The arithmetic checked against the browser's own lines: the name set once more beside itself, out of sight, the way
 * the fit says, and looked at. Widths measured a word at a time are not always what is drawn (letters of a joined script,
 * Arabic among them, are not moved closer by letter-spacing), and a name said to be whole is then shown uncut.
 */
function drawnWhole(el: HTMLElement, fit: TagFit, most: number): boolean {
  const host = el.parentElement;
  if (!host) return false;
  const probe = document.createElement("span");
  probe.textContent = el.textContent;
  probe.dir = "auto";
  probe.className = "max-w-full py-[0.06em] text-center";
  Object.assign(probe.style, tagStyle(fit), { position: "absolute", visibility: "hidden", pointerEvents: "none" });
  host.appendChild(probe);
  const range = document.createRange();
  range.selectNodeContents(probe);
  let lines = 0;
  let foot = -Infinity;
  for (const rect of [...range.getClientRects()].sort((a, b) => a.top - b.top)) {
    if (rect.top >= foot - rect.height / 2) lines++;
    foot = Math.max(foot, rect.bottom);
  }
  const fits = probe.scrollWidth <= probe.clientWidth + 1 && lines <= most;
  probe.remove();
  return fits;
}

/** Before a name has been measured (the server's HTML, the first frame): by its length, and cut if that was too hopeful. */
const guessTag = (name: string): TagFit => {
  const length = [...name].length;
  return { size: length <= 4 ? 3.9 : length <= 6 ? 3.1 : TAG_SMALLEST, track: 0, whole: false };
};

let ruler: CanvasRenderingContext2D | null | undefined;

/**
 * The name on the tag a read note leaves in its niche. Someone else's word: plain text, in its own direction, never past the tag.
 * It is measured in the handwriting face and written as large as leaves every word whole (fitTag): a short name on one
 * line of a large hand, a longer one on two lines of the smallest that reads. Only a name no size can hold is broken,
 * and ends in an ellipsis past two lines: the whole name is on the card, and in the name of the door's button.
 */
function TagName({ g, name }: { g: Geometry; name: string }) {
  const face = tagFace(g);
  const text = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState<TagFit>(() => guessTag(name));
  useLayoutEffect(() => {
    let alive = true;
    const measure = () => {
      const el = text.current;
      if (!alive || !el) return;
      if (ruler === undefined) ruler = document.createElement("canvas").getContext("2d");
      if (!ruler) return;
      ruler.font = `100px ${getComputedStyle(el).fontFamily}`;
      const em = (part: string) => ruler!.measureText(part).width / 100;
      const words = name.trim().split(/\s+/).filter(Boolean);
      // how many pixels a stage unit is here: the face's box is the face's width in them
      const k = (el.parentElement?.getBoundingClientRect().width ?? 0) / face.w;
      const reckoned = fitTag(words.map(em), words.map((word) => [...word].length), em(" "), face, k > 0 ? TAG_FLOOR_PX / k : 0);
      const next = reckoned.whole && !drawnWhole(el, reckoned, tagHolds(face, reckoned.size)) ? TAG_BROKEN : reckoned;
      setFit((was) => (was.size === next.size && was.track === next.track && was.whole === next.whole ? was : next));
    };
    measure();
    // the handwriting face may arrive after the tag does: measured in a stand-in face, a name would be sized for the wrong letters
    void document.fonts?.ready.then(measure);
    // and the house is another size when the phone is turned
    const turned = typeof ResizeObserver === "function" && text.current?.parentElement ? new ResizeObserver(measure) : null;
    if (turned && text.current?.parentElement) turned.observe(text.current.parentElement);
    return () => {
      alive = false;
      turned?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the face is the same rectangle for as long as the door is
  }, [name, face.w, face.h]);
  return (
    <span className="flex items-center justify-center" style={within(g.inside, face)}>
      {/* Whole, it is not cut at all: a handwriting face's last stroke runs past its letter's width, and may. Broken, it is cut to two lines, with room either side for that stroke. */}
      <span
        ref={text}
        dir="auto"
        data-tag-name
        data-whole={fit.whole ? "" : undefined}
        className={`${fit.whole ? "" : "line-clamp-2 [overflow-wrap:anywhere] "}max-w-full py-[0.06em] text-center`}
        style={tagStyle(fit)}
      >
        {name}
      </span>
    </span>
  );
}

/*
 * The paper a photo is printed on, rendered once as a plain white square and laid whole under a photo of any
 * shape: it has nothing on it to pull out of shape. (Cut in nine as a border, its pieces showed their joins.)
 */
const PRINT: CSSProperties = { backgroundImage: `url(${ART_BASE}print.webp)`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" };
/** The shapes a note's photo is printed in, as width over height: past these it is cropped to the nearest. */
const PHOTO_TALLEST = 9 / 16;
const PHOTO_WIDEST = 2;

/**
 * A sheet of the gift's card stock, as long as what is written on it: its top, as many lengths of its middle as
 * it needs one under another, and its bottom faded in over the last of them. The shared PaperSheet repeats the
 * middle as a background, which a browser draws a fraction of a pixel wider than the picture above it: nothing
 * on plain paper, a step in a rule of gold. Here every piece is a picture of the same width.
 */
function Sheet({ art, lengths, margin, head, tail, children, style }: { art: SheetArt; lengths: number; margin: number; head: number; tail: number; children: ReactNode; style?: CSSProperties }) {
  const piece = (name: string) => `${ART_BASE}sheet-${art.name}-${name}.webp`;
  return (
    <div className="relative grid" style={style}>
      <div aria-hidden="true" className="pointer-events-none absolute" style={{ left: pct(art.inset.left + 0.01), right: pct(art.inset.right + 0.01), top: "1.2%", bottom: "1.2%", boxShadow: "0 calc(1.6*var(--u)) calc(4*var(--u)) rgba(0,0,0,.42)" }} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 select-none">
        <img src={piece("top")} alt="" draggable={false} className="absolute top-0 left-0 block w-full max-w-none" />
        {/* a length ends on the row it began with, so each lies a pixel over the one above and no join can open between them */}
        <div className="absolute inset-0 overflow-hidden" style={{ marginTop: `calc(${pct(art.top)} - 1px)`, marginBottom: pct(art.bottom - art.fade) }}>
          {Array.from({ length: lengths }, (_, i) => (
            <img key={i} src={piece("mid")} alt="" draggable={false} loading={i > 1 ? "lazy" : undefined} className="block w-full max-w-none" style={{ aspectRatio: `1 / ${art.mid}`, marginTop: i ? -1 : undefined }} />
          ))}
        </div>
        <img src={piece("bottom")} alt="" draggable={false} className="absolute bottom-0 left-0 block w-full max-w-none" />
      </div>
      <div aria-hidden="true" className="col-start-1 row-start-1" style={{ paddingTop: pct(art.top + art.bottom - art.fade) }} />
      <div className="relative col-start-1 row-start-1 min-w-0" style={{ paddingLeft: pct(art.inset.left + margin), paddingRight: pct(art.inset.right + margin), paddingTop: pct(art.inset.top + head), paddingBottom: pct(art.inset.bottom + tail) }}>
        {children}
      </div>
    </div>
  );
}

/**
 * One person's note, lifted out of its niche: a card of cream stock with a line of gold round it,
 * their photo if they added one, their words and their name. The house stays behind it, dimmed.
 * Every word on it is someone else's: plain text, its own direction, wrapped anywhere, never a link.
 */
export function NoteCard({ lookId, s, note, door, from, seed, read, total, reduce, low, onClose }: { lookId: LookId; s: Copy; note: GiftContribution; door: number; from: Pt; seed: number; /** How many notes have been read, this one among them. */ read: number; total: number; reduce: boolean; low: boolean; onClose: () => void }) {
  const look = LOOKS[lookId];
  const close = useRef<HTMLButtonElement>(null);
  // on its way back into its niche it is no longer in the way of a finger: a tap on the next door lands on the door
  const here = useIsPresent();
  useEffect(() => {
    close.current?.focus({ preventScroll: true });
  }, []);
  const tilt = useMemo(() => (mulberry32(seed + door * 31)() - 0.5) * 3.2, [seed, door]);
  // The print is the photo's own shape, from a phone held upright (9 by 16) to a wide one (2 by 1), so the whole photo is on it.
  // What bounds it is its height: a tall photo is a narrower print, never a cropped one.
  const shape = note.photo ? Math.min(PHOTO_WIDEST, Math.max(PHOTO_TALLEST, note.photo.width / note.photo.height)) : 1;
  const long = [...note.note].length > 80;
  const signed = [...note.name].length;
  const id = `ac-note-${door}`;
  const beside = low && !!note.photo;
  // The card's own unit, a hundredth of its width (of its words' column, on a low screen where the photo is beside them):
  // everything on it is sized by the card, so it is the same card on a small phone, a phone on its side and a laptop.
  const width = beside ? "min(78cqw, 138cqh, 640px)" : low ? "min(70cqw, 100cqh, 420px)" : "min(84cqw, 400px)";
  const unit = { "--n": `calc(${width} / ${beside ? 170 : 100})` } as CSSProperties;
  return (
    <motion.div role="dialog" aria-modal="true" aria-labelledby={`${id}-name`} aria-describedby={`${id}-words`} className="absolute inset-0 z-[20] flex flex-col" style={{ pointerEvents: here ? undefined : "none" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0.15 : 0.3 }}>
      <button ref={close} type="button" aria-label={s.putBack} onClick={onClose} className="absolute inset-0 cursor-pointer outline-none" style={{ background: look.veil, backdropFilter: "blur(2.5px)", WebkitBackdropFilter: "blur(2.5px)" }} />
      <div className="pointer-events-none relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto scrollbar-none">
        <div className="grid min-h-full place-items-center px-[4cqw]" style={{ paddingBlock: low ? "10px 4px" : "calc(9*var(--u)) calc(2*var(--u))" }}>
          <motion.div
            data-note-card
            className={here ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}
            style={{ ...unit, width }}
            initial={reduce ? false : { x: from.x, y: from.y, scale: 0.12, rotate: 0 }}
            animate={{ x: 0, y: 0, scale: 1, rotate: tilt }}
            exit={reduce ? undefined : { x: from.x, y: from.y, scale: 0.12, rotate: 0, transition: { duration: 0.28, ease: "easeIn" } }}
            transition={{ type: "spring", stiffness: 190, damping: 22 }}
            onClick={onClose}
          >
            <Sheet art={SHEETS.card} lengths={3} margin={beside ? 0.06 : 0.085} head={beside ? 0.07 : 0.095} tail={beside ? 0.065 : 0.085}>
              <div className={beside ? "flex items-center gap-[5%]" : "flex flex-col items-center"} style={{ color: INK.ink }}>
                {note.photo ? (
                  <div className="relative shrink-0" style={{ ...PRINT, width: `min(${beside ? "42%" : "86%"}, calc(${beside ? "62cqh" : "32cqh"} * ${shape.toFixed(4)} + 3.8*var(--n)))`, padding: "calc(1.9*var(--n))", marginBottom: beside ? 0 : "calc(5.4*var(--n))", rotate: `${(-tilt * 0.6).toFixed(2)}deg`, boxShadow: "0 calc(.5*var(--n)) calc(1.1*var(--n)) rgba(60,34,14,.28), 0 calc(1.4*var(--n)) calc(3.6*var(--n)) rgba(60,34,14,.2)" }}>
                    {/* the box is the photo's own shape before the photo has come, so nothing on the card moves when it does */}
                    <img src={note.photo.url} alt="" width={note.photo.width} height={note.photo.height} loading="lazy" decoding="async" draggable={false} className="block h-auto w-full object-cover" style={{ aspectRatio: String(shape), background: "#e9e1d0" }} />
                  </div>
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col items-center">
                  <p className="font-semibold tracking-[0.3em] uppercase" style={{ color: INK.soft, fontSize: "max(8.5px, calc(2.75*var(--n)))" }}>
                    {fill(s.door, { n: door })}
                  </p>
                  <blockquote id={`${id}-words`} dir="auto" className="m-0 w-full text-center leading-[1.36] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-display)", marginTop: "calc(4*var(--n))", fontSize: long ? "calc(5.25*var(--n))" : "calc(5.95*var(--n))" }}>
                    {note.note}
                  </blockquote>
                  <p id={`${id}-name`} dir="auto" className="w-full text-center leading-[1.02] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", marginTop: "calc(4.3*var(--n))", fontSize: signed > 14 ? "calc(6.9*var(--n))" : "calc(9.8*var(--n))", color: look.accent, rotate: "-3deg" }}>
                    {note.name}
                  </p>
                </div>
              </div>
            </Sheet>
          </motion.div>
        </div>
      </div>
      <p aria-hidden="true" className="pointer-events-none relative shrink-0 px-4 text-center" style={{ paddingBlock: low ? "4px 8px" : "calc(2.4*var(--u)) calc(4.6*var(--u) + env(safe-area-inset-bottom))", fontFamily: "var(--gift-font-display)", fontStyle: "italic", fontSize: "max(12px, calc(3.6*var(--u)))", color: look.labelSoft, textShadow: "0 1px calc(2*var(--u)) rgba(0,0,0,.7)" }}>
        {total > 0 ? `${fill(total === 1 ? s.readOne : s.read, { read, total })} · ${s.cardHint}` : s.cardHint}
      </p>
    </motion.div>
  );
}

/** A photo that came with the sender's letter, as a print: the rendered paper round it, the caption in handwriting in its foot. */
function LetterPrint({ slot, rot, label }: { slot: PhotoSlot; rot: number; /** What the print is called when it has no words of its own. */ label: string }) {
  const { photo, open } = slot;
  return (
    <figure className="relative m-0" style={{ rotate: `${rot.toFixed(1)}deg` }}>
      <button type="button" onClick={open} aria-label={photo.alt || photo.caption || label} className="relative block w-full cursor-pointer text-left outline-none focus-visible:ring-4 focus-visible:ring-white/60" style={{ ...PRINT, padding: "calc(1.8*var(--u)) calc(1.8*var(--u)) 0", boxShadow: "0 calc(.5*var(--u)) calc(.8*var(--u)) rgba(0,0,0,.3), calc(1.2*var(--u)) calc(3*var(--u)) calc(6*var(--u)) rgba(0,0,0,.42)" }}>
        <img src={photo.url} alt="" loading="lazy" decoding="async" draggable={false} className="block aspect-square w-full object-cover" style={{ background: "#e9e1d0" }} />
        <span className="flex h-[calc(11*var(--u))] items-center justify-center px-[4%]">
          {photo.caption ? (
            <span className="line-clamp-2 text-center leading-[1.08] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "calc(3.5*var(--u))", color: INK.ink }}>
              {photo.caption}
            </span>
          ) : null}
        </span>
      </button>
    </figure>
  );
}

/**
 * The sender's own letter, from behind the star window: a wide sheet of the cards' stock with two
 * rules of gold and a foil star at its head, long enough for whatever was written, then the photos
 * as prints, the countdown, the surprise and the end. Scrolled, in front of the same room.
 */
function Letter({ lookId, s, data, seed, mode, still, onBack, onEvent, onReact, onMakeOne, onReplay }: { lookId: LookId; s: Copy; data: TemplateProps<AdventCalendarFields>["data"]; seed: number; mode: TemplateProps["mode"]; still: boolean; onBack: () => void; onEvent?: TemplateProps["onEvent"]; onReact?: () => void; onMakeOne?: () => void; onReplay?: () => void }) {
  const look = LOOKS[lookId];
  const theme: HolidayTheme = { ink: INK.ink, soft: INK.soft, accent: look.accent, rule: "rgba(148,112,60,.3)", label: "#fff6ea", face: "serif" };
  const back = useRef<HTMLButtonElement>(null);
  /** Once the page has been scrolled the way back fades to a ghost, as the mute button does: it floats over the words. */
  const [reading, setReading] = useState(false);
  useEffect(() => {
    back.current?.focus({ preventScroll: true });
  }, []);
  const tilts = useMemo(() => {
    const rnd = mulberry32(seed + 17);
    return data.photos.map((_, i) => (i % 2 ? 1 : -1) * (1.2 + rnd() * 2.4));
  }, [data.photos, seed]);
  // Every block of the page on the letter's stock: room inside its two rules, and under the star at its head.
  const block = (kind: BlockKind, children: ReactNode) => (
    <Sheet art={SHEETS.letter} lengths={kind === "letter" ? 18 : 3} margin={kind === "end" ? 0.1 : 0.125} head={kind === "letter" ? 0.135 : 0.125} tail={kind === "end" ? 0.09 : 0.11}>
      {children}
    </Sheet>
  );
  return (
    <motion.div
      className="absolute inset-0 z-[20] overflow-hidden"
      initial={still ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      onScrollCapture={(e) => {
        const far = (e.target as HTMLElement).scrollTop > 40;
        if (far !== reading) setReading(far);
      }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: look.veil, backdropFilter: "blur(2.5px)", WebkitBackdropFilter: "blur(2.5px)" }} />
      <motion.div className="absolute inset-0" initial={still ? false : { y: "8%" }} animate={{ y: 0 }} transition={{ duration: 0.7, ease: [0.2, 0.8, 0.25, 1] }}>
        <HolidayPage
          data={data}
          mode={mode}
          still={still}
          base={ART_BASE}
          look={lookId}
          floor={look.floor}
          shade={look.veil}
          sheet={SHEETS.letter}
          frame={0.05}
          theme={theme}
          backdrop={<span />}
          block={block}
          eyebrow={fill(s.letterFrom, { name: isolated(data.senderName) })}
          gallery={s.gallery}
          photo={(slot) => <LetterPrint slot={slot} rot={tilts[slot.index] ?? 0} label={s.photo} />}
          onEvent={onEvent}
          onReact={onReact}
          onMakeOne={onMakeOne}
          onReplay={onReplay}
        />
      </motion.div>
      <button ref={back} type="button" aria-label={s.backToDoors} onClick={onBack} className={`absolute top-[max(0.75rem,var(--gift-safe-top,env(safe-area-inset-top)))] left-3 z-40 grid size-11 place-items-center rounded-full bg-black/35 text-[1.5rem] leading-none text-white/90 backdrop-blur-md transition-[opacity,background-color] duration-500 outline-none hover:bg-black/50 hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white active:bg-black/60 ${reading ? "opacity-30" : ""}`}>
        <span aria-hidden="true" className="-mt-0.5">
          ‹
        </span>
      </button>
    </motion.div>
  );
}
