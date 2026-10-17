import { shuffle, type Player } from "./play";

/**
 * "Draw it, guess it": one draws with a finger, the other guesses. Words are things two people
 * can draw badly and still recognise, and every word is accepted in both languages, so one phone
 * in Spanish and one in English can play the same round.
 */
type L = { en: string; es: string };
export type DrawWord = { id: string; word: L; /** Other spellings that count, per language. */ also?: string[] };

export const DRAW_WORDS: DrawWord[] = [
  { id: "heart", word: { en: "Heart", es: "Corazón" } },
  { id: "pizza", word: { en: "Pizza", es: "Pizza" } },
  { id: "cat", word: { en: "Cat", es: "Gato" }, also: ["gata"] },
  { id: "dog", word: { en: "Dog", es: "Perro" }, also: ["perra"] },
  { id: "coffee", word: { en: "Coffee", es: "Café" } },
  { id: "beach", word: { en: "Beach", es: "Playa" } },
  { id: "suitcase", word: { en: "Suitcase", es: "Maleta" } },
  { id: "umbrella", word: { en: "Umbrella", es: "Paraguas" } },
  { id: "ring", word: { en: "Ring", es: "Anillo" } },
  { id: "cake", word: { en: "Cake", es: "Tarta" }, also: ["pastel"] },
  { id: "bike", word: { en: "Bicycle", es: "Bicicleta" }, also: ["bike", "bici"] },
  { id: "rain", word: { en: "Rain", es: "Lluvia" } },
  { id: "moon", word: { en: "Moon", es: "Luna" } },
  { id: "popcorn", word: { en: "Popcorn", es: "Palomitas" } },
  { id: "key", word: { en: "Key", es: "Llave" }, also: ["llaves"] },
  { id: "phone", word: { en: "Phone", es: "Móvil" }, also: ["telefono", "celular", "mobile"] },
  { id: "sofa", word: { en: "Sofa", es: "Sofá" }, also: ["couch"] },
  { id: "plane", word: { en: "Plane", es: "Avión" }, also: ["aeroplane", "airplane"] },
  { id: "guitar", word: { en: "Guitar", es: "Guitarra" } },
  { id: "icecream", word: { en: "Ice cream", es: "Helado" }, also: ["icecream"] },
  { id: "campfire", word: { en: "Campfire", es: "Hoguera" }, also: ["fire", "fuego", "fogata"] },
  { id: "boat", word: { en: "Boat", es: "Barco" }, also: ["barca"] },
  { id: "flower", word: { en: "Flower", es: "Flor" } },
  { id: "book", word: { en: "Book", es: "Libro" } },
  { id: "clock", word: { en: "Clock", es: "Reloj" }, also: ["watch"] },
  { id: "shoes", word: { en: "Shoes", es: "Zapatos" }, also: ["shoe", "zapato"] },
  { id: "train", word: { en: "Train", es: "Tren" } },
  { id: "snow", word: { en: "Snow", es: "Nieve" }, also: ["snowman", "muñeco de nieve"] },
  { id: "sun", word: { en: "Sun", es: "Sol" } },
  { id: "bed", word: { en: "Bed", es: "Cama" } },
  { id: "glasses", word: { en: "Glasses", es: "Gafas" }, also: ["sunglasses", "lentes"] },
  { id: "candle", word: { en: "Candle", es: "Vela" } },
  { id: "camera", word: { en: "Camera", es: "Cámara" } },
  { id: "balloon", word: { en: "Balloon", es: "Globo" }, also: ["balloons", "globos"] },
  { id: "bridge", word: { en: "Bridge", es: "Puente" } },
  { id: "castle", word: { en: "Castle", es: "Castillo" } },
  { id: "star", word: { en: "Star", es: "Estrella" } },
  { id: "tent", word: { en: "Tent", es: "Tienda de campaña" }, also: ["tienda", "camping"] },
  { id: "letter", word: { en: "Letter", es: "Carta" } },
  { id: "kiss", word: { en: "Kiss", es: "Beso" } },
];

export const DRAW_ROUNDS = 6;

/** How a round ended: the guesser got it, or the pair gave up on it. */
export type DrawResult = "got" | "passed";
export type DrawGuess = { player: Player; text: string; right: boolean };
export type DrawState = {
  game: "draw";
  gen: number;
  round: number;
  order: string[];
  results: (DrawResult | null)[];
  /** This round's guesses only; a new round starts with an empty list. */
  guesses: DrawGuess[];
};

export type DrawMove = { type: "guess"; player: Player; text: string } | { type: "got" } | { type: "pass" } | { type: "next" };

export function newDraw(seed: number, gen = 0): DrawState {
  const order = shuffle(DRAW_WORDS, seed + gen * 7919)
    .slice(0, DRAW_ROUNDS)
    .map((w) => w.id);
  return { game: "draw", gen, round: 0, order, results: order.map(() => null), guesses: [] };
}

/** Whoever draws this round; they take it in turns, so nobody only ever guesses. */
export const drawArtist = (state: DrawState): Player => ((state.round % 2) as Player);
export const drawWord = (state: DrawState): DrawWord | null => DRAW_WORDS.find((w) => w.id === state.order[state.round]) ?? null;
export const drawRoundDone = (state: DrawState): boolean => state.results[state.round] != null;
export const drawFinished = (state: DrawState): boolean => state.round >= state.order.length;
export const drawScore = (state: DrawState): number => state.results.filter((r) => r === "got").length;

/** Loose enough that spelling, accents and a stray "a" don't cost anybody the point. */
const plain = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, " ")
    .replace(/\b(a|an|the|el|la|los|las|un|una|de)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** A guess counts in either language, so the two phones need not be set to the same one. */
export function drawMatches(word: DrawWord, guess: string): boolean {
  const said = plain(guess);
  if (!said) return false;
  return [word.word.en, word.word.es, ...(word.also ?? [])].some((accepted) => plain(accepted) === said);
}

export function drawReduce(state: DrawState, move: DrawMove): DrawState {
  if (drawFinished(state)) return state;
  const word = drawWord(state);
  const done = drawRoundDone(state);
  switch (move.type) {
    case "guess": {
      // Only the one who isn't drawing guesses, and only while the round is still open.
      if (done || !word || move.player === drawArtist(state)) return state;
      const text = move.text.trim().slice(0, 40);
      if (!text) return state;
      const right = drawMatches(word, text);
      const guesses = [...state.guesses, { player: move.player, text, right }].slice(-12);
      if (!right) return { ...state, guesses };
      const results = state.results.slice();
      results[state.round] = "got";
      return { ...state, guesses, results };
    }
    // On one phone nobody types: the two of them say it out loud and whoever is drawing says so.
    case "got":
    case "pass": {
      if (done) return state;
      const results = state.results.slice();
      results[state.round] = move.type === "got" ? "got" : "passed";
      return { ...state, results };
    }
    case "next":
      return done ? { ...state, round: state.round + 1, guesses: [] } : state;
    default:
      return state;
  }
}
