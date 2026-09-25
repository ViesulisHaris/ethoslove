/**
 * The three pieces the box can play, pinned the way a music box's cylinder is: every note is a pin
 * with a place in the score (in beats), a pitch and how hard it plucks. All three are long in the
 * public domain; the notes are the composers', the arrangement for a small comb is ours.
 *
 * - Swan Lake: Tchaikovsky's oboe theme from the Act II scene (Op. 20, No. 10), stated twice.
 * - Brahms' Lullaby: the Wiegenlied, Op. 49 No. 4, the whole verse, over a rocking accompaniment.
 * - Für Elise: Beethoven's opening section with both endings, left hand and all.
 *
 * Time is kept in beats so the spring can run down: `secondsAt` bends the score into seconds, full
 * speed until `slowFrom`, then slower and slower to the last note, the way a wound-down box sounds.
 * Everything else that keeps time (the figurine, the photos) reads the same map.
 */
export type TuneId = "swan-lake" | "lullaby" | "fur-elise";
export const TUNE_IDS: TuneId[] = ["swan-lake", "lullaby", "fur-elise"];

/** One pin: when it plucks, in beats from the first; the MIDI note; how hard, 0 to 1. */
export type Pin = { at: number; midi: number; vel: number };

export type Tune = {
  id: TuneId;
  /** Seconds per beat with the spring fully wound. */
  beat: number;
  /** The whole piece, in beats: from the first pin to the end of the last bar. */
  length: number;
  /** Beats per turn of the figurine, roughly: the total is rounded so she ends facing you. */
  turn: number;
  /** Where the spring starts to give out. */
  slowFrom: number;
  /** How slow it is by the last beat, as a share of full speed. */
  slowTo: number;
  /** The three notes the comb sounds as each turn of the key catches: the tune's own chord. */
  chord: [number, number, number];
  pins: Pin[];
};

const LETTER: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "F#5" → 78. Middle C is C4 = 60. */
export function midiOf(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`not a note: ${name}`);
  const shift = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + LETTER[m[1]] + shift;
}

/**
 * A line of music: "F#5:2 B4:.5 r:1" is F sharp for two beats, B for half a beat, a beat's rest.
 * Returns its pins from `start`, shifted by `transpose` semitones.
 */
export function line(start: number, notes: string, vel: number, transpose = 0): Pin[] {
  const pins: Pin[] = [];
  let at = start;
  for (const token of notes.trim().split(/\s+/)) {
    const [name, len] = token.split(":");
    if (name !== "r") pins.push({ at, midi: midiOf(name) + transpose, vel });
    at += Number(len);
  }
  return pins;
}

/** Pins at given offsets, for broken chords: `at` is where the group starts. */
const hits = (at: number, notes: [number, string][], vel: number, transpose: number): Pin[] => notes.map(([dt, n]) => ({ at: at + dt, midi: midiOf(n) + transpose, vel }));

const sortPins = (pins: Pin[]): Pin[] => [...pins].sort((a, b) => a.at - b.at || a.midi - b.midi);

/* ------------------------------------------------------------------ Swan Lake */

/** B minor, 4/4, a beat to the crotchet. The four-bar theme, then again, closing on the tonic. */
function swanLake(): Tune {
  const up = 12;
  const phrase = (start: number, last: string) =>
    line(start, `F#5:2 B4:.5 C#5:.5 D5:.5 E5:.5 F#5:1.5 D5:.5 F#5:1.5 D5:.5 F#5:1.5 B4:.5 D5:.5 B4:.5 G4:.5 D5:.5 ${last}`, 0.9, up);
  const melody = [...phrase(0, "B4:2.5 E5:.5 D5:.5 C#5:.5"), ...phrase(16, "B4:4")];
  // The harp under it: a broken chord to each half bar, soft.
  const CHORDS: Record<string, [string, string, string]> = { Bm: ["B2", "F#3", "D4"], G: ["G2", "D3", "B3"], F7: ["F#2", "C#3", "E4"] };
  const halves = ["Bm", "Bm", "Bm", "Bm", "Bm", "G", "Bm", "F7", "Bm", "Bm", "Bm", "Bm", "Bm", "G", "Bm", "Bm"];
  const harp = halves.flatMap((name, i) => {
    const [root, fifth, third] = CHORDS[name];
    return hits(i * 2, [[0, root], [0.5, fifth], [1, third], [1.5, fifth]], 0.34, up);
  });
  return { id: "swan-lake", beat: 60 / 74, length: 32, turn: 4, slowFrom: 26, slowTo: 0.5, chord: [midiOf("B4") + up, midiOf("D5") + up, midiOf("F#5") + up], pins: sortPins([...melody, ...harp]) };
}

/* ----------------------------------------------------------- Brahms' Lullaby */

/**
 * F major here (Brahms wrote it in E flat), 3/4, a beat to the crotchet, with the two-quaver
 * upbeat. The melody is the Wiegenlied's as published, note for note.
 */
function lullaby(): Tune {
  const up = 17; // written in C below, sounding in F an octave up: where a comb sings
  const melody = line(
    0,
    [
      "E4:.5 E4:.5", // Gu-ten
      "G4:1.5 E4:.5 E4:1", // A-bend, gut'
      "G4:1 r:1 E4:.5 G4:.5", // Nacht, mit
      "C5:1 B4:1.5 A4:.5", // Ro-sen be-
      "A4:1 G4:1 D4:.5 E4:.5", // dacht, mit
      "F4:1 D4:1 D4:.5 E4:.5", // Näg-lein be-
      "F4:1 r:1 D4:.5 F4:.5", // steckt, schlupf
      "B4:.5 A4:.5 G4:1 B4:1", // un-ter die
      "C5:1 r:1 C4:.5 C4:.5", // Deck', Mor-gen
      "C5:2 A4:.5 F4:.5", // früh, wenn Gott
      "G4:2 E4:.5 C4:.5", // will, wirst du
      "F4:1 G4:1 A4:1", // wie-der ge-
      "G4:2 C4:.5 C4:.5", // weckt, mor-gen
      "C5:2 A4:.5 F4:.5", // früh, wenn Gott
      "G4:2 E4:.5 C4:.5", // will, wirst du
      "F4:1 E4:1 D4:1", // wie-der ge-
      "C4:3", // weckt.
    ].join(" "),
    0.9,
    up,
  );
  // A rocking accompaniment: the root on the downbeat, the chord rising under the tune.
  const CHORDS: Record<string, [string, string, string]> = { C: ["C3", "G3", "E4"], G7: ["G2", "F3", "B3"], F: ["F2", "C3", "A3"] };
  const bars = ["C", "C", "G7", "G7", "G7", "G7", "G7", "C", "F", "C", "G7", "C", "F", "C", "G7", "C"];
  const rock = bars.flatMap((name, i) => {
    const [root, fifth, third] = CHORDS[name];
    return hits(1 + i * 3, [[0, root], [1, fifth], [2, third]], 0.32, up);
  });
  return { id: "lullaby", beat: 60 / 100, length: 49, turn: 6, slowFrom: 40, slowTo: 0.5, chord: [midiOf("C4") + up, midiOf("E4") + up, midiOf("G4") + up], pins: sortPins([...hits(0, [[0, "C3"]], 0.3, up), ...melody, ...rock]) };
}

/* ----------------------------------------------------------------- Für Elise */

/**
 * A minor, 3/8, a beat to the quaver, so a semiquaver is half a beat. The opening eight bars twice:
 * the first time ending on the upbeat back to the start, the second time on A.
 */
function furElise(): Tune {
  const up = 12;
  const pins: Pin[] = [];
  const add = (p: Pin[]) => pins.push(...p);
  const mel = 0.88;
  const lh = 0.42;
  const s = 0.5; // a semiquaver
  add(line(0, "E5:.5 D#5:.5", mel, up));
  // The bars as they run, from the downbeat after the upbeat.
  const turnFigure = (at: number) => add(line(at, "E5:.5 D#5:.5 E5:.5 B4:.5 D5:.5 C5:.5", mel, up));
  const arpeggio = (at: number, top: string, bass: [string, string, string], after: [string, string, string]) => {
    add(hits(at, [[0, top]], mel, up));
    add(hits(at, [[0, bass[0]], [s, bass[1]], [2 * s, bass[2]]], lh, up));
    add(hits(at, [[3 * s, after[0]], [4 * s, after[1]], [5 * s, after[2]]], mel * 0.82, up));
  };
  const A: [string, string, string] = ["A2", "E3", "A3"];
  const E: [string, string, string] = ["E2", "E3", "G#3"];
  const phrase = (bar: number, ending: "first" | "second") => {
    const at = (n: number) => 1 + (bar + n) * 3;
    turnFigure(at(0));
    arpeggio(at(1), "A4", A, ["C4", "E4", "A4"]);
    arpeggio(at(2), "B4", E, ["E4", "G#4", "B4"]);
    arpeggio(at(3), "C5", A, ["E4", "E5", "D#5"]);
    turnFigure(at(4));
    arpeggio(at(5), "A4", A, ["C4", "E4", "A4"]);
    arpeggio(at(6), "B4", E, ["E4", "C5", "B4"]);
    add(hits(at(7), [[0, "A4"]], mel, up));
    add(hits(at(7), [[0, A[0]], [s, A[1]], [2 * s, A[2]]], lh, up));
    if (ending === "first") add(line(at(7) + 4 * s, "E5:.5 D#5:.5", mel, up));
  };
  phrase(0, "first");
  phrase(8, "second");
  return { id: "fur-elise", beat: 60 / 132, length: 49, turn: 6, slowFrom: 40, slowTo: 0.45, chord: [midiOf("A4") + up, midiOf("C5") + up, midiOf("E5") + up], pins: sortPins(pins) };
}

export const TUNES: Record<TuneId, Tune> = { "swan-lake": swanLake(), lullaby: lullaby(), "fur-elise": furElise() };

/* ---------------------------------------------------------------- the spring */

/** The tempo, as a share of full speed, at a place in the score: 1 until the spring tires, then falling to `slowTo`. */
export function speedAt(tune: Tune, beat: number): number {
  if (beat <= tune.slowFrom) return 1;
  const span = tune.length - tune.slowFrom;
  const k = Math.min(1, (beat - tune.slowFrom) / span);
  return 1 - (1 - tune.slowTo) * k;
}

/** Seconds from the first pin to a place in the score, with the ritardando folded in. */
export function secondsAt(tune: Tune, beat: number): number {
  if (beat <= tune.slowFrom) return beat * tune.beat;
  const span = tune.length - tune.slowFrom;
  const drop = 1 - tune.slowTo;
  const before = tune.slowFrom * tune.beat;
  const b = Math.min(beat, tune.length);
  // ∫ ds / (1 - drop·(s - from)/span), in closed form; past the end it holds the last speed.
  const inside = (tune.beat * span * Math.log(1 / speedAt(tune, b))) / drop;
  return before + inside + Math.max(0, beat - tune.length) * (tune.beat / tune.slowTo);
}

/** The place in the score a number of seconds in: the inverse of `secondsAt`. */
export function beatAt(tune: Tune, seconds: number): number {
  if (seconds <= 0) return seconds / tune.beat;
  const before = tune.slowFrom * tune.beat;
  if (seconds <= before) return seconds / tune.beat;
  const span = tune.length - tune.slowFrom;
  const drop = 1 - tune.slowTo;
  const end = secondsAt(tune, tune.length);
  if (seconds >= end) return tune.length + (seconds - end) / (tune.beat / tune.slowTo);
  const speed = Math.exp((-(seconds - before) * drop) / (tune.beat * span));
  return tune.slowFrom + (span * (1 - speed)) / drop;
}

/** How long the whole piece plays, spring and all. */
export const tuneSeconds = (tune: Tune): number => secondsAt(tune, tune.length);

/** Whole turns the figurine makes over the piece: she always ends where she began, facing you. */
export const turnsIn = (tune: Tune): number => Math.max(1, Math.round(tune.length / tune.turn));

/** How far round the figurine is at a place in the score, in turns (1 = a full turn). */
export function turnAt(tune: Tune, beat: number): number {
  const b = Math.min(Math.max(0, beat), tune.length);
  return (turnsIn(tune) * b) / tune.length;
}

/**
 * Which photo the mirror shows at a place in the score. It only ever changes as a turn completes,
 * so a new face arrives each time the figurine comes round to face you again, and every photo gets
 * its share of the turns.
 */
export function photoAt(tune: Tune, beat: number, count: number): number {
  if (count <= 1) return 0;
  const turns = turnsIn(tune);
  const done = Math.min(turns - 1, Math.floor(turnAt(tune, beat)));
  return Math.min(count - 1, Math.floor((done * count) / turns));
}
