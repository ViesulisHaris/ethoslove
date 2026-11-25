import { ideaById, canBeFree } from "@/lib/dates/ideas";
import { KIND_IDEAS, type DateKind } from "@/lib/dates/date-kinds";
import { DATE_KIND_COPY } from "@/content/date-kinds";

/**
 * The date letter's year (lib/lifecycle/date-letter.ts): one entry a week, 52 of them, played round
 * and round from week 1 (the week of Monday 4 January 2027). Each entry is one of the site's own
 * date ideas (lib/dates/ideas.ts), alone or seen from one of the kinds of date (lib/dates/date-kinds.ts,
 * whose page already says why it fits: content/date-kinds.ts `fits`), and one line to say to the
 * other person.
 *
 * A letter prints, in this order: the opening (the idea's blurb, or with an angle the kind page's line
 * for it, which already describes the idea from that side), about how long and what it costs, the
 * twist (left out where the opening already carries it: `twist: false`), and the line to say. The
 * site's own words are used where they read right in a letter; where they don't (a British word, a
 * Spanish line that genders the partner, a line that only makes sense on its page), the letter has its
 * own (LETTER_IDEA_WORDS, an entry's `open`). The site's pages are not changed by this.
 *
 * The season fits the northern half: the ideas that need a dry day sit in weeks 16 to 40 (late April
 * to early October), the beach in 23 to 35, the ice rink in the cold weeks. An idea never comes back
 * within twelve weeks, and the quiet gift line under the button (`gift`) comes at most once in two
 * weeks. No two parts of one letter share a run of four words. tests/unit/date-letter-content.test.ts
 * holds all of it.
 *
 * Lines are American English; the Spanish never genders the partner; numbers are words. Nothing here
 * names a place, a price or a person. The lines name Friday, Saturday or Sunday: a letter goes on
 * Thursday, or on Friday when it waits a day, never later (lib/lifecycle/date-letter.ts isSendDay).
 */

type L = { en: string; es: string };
export type LetterAngle = Extract<DateKind, "fun" | "cheap" | "romantic" | "double-date" | "rainy-day" | "night" | "unique">;
export type LetterEntry = {
  week: number;
  idea: string;
  angle?: LetterAngle;
  gift?: true;
  say: L;
  /** The letter's own opening, in place of the kind page's line (or the blurb), per language. */
  open?: Partial<L>;
  /** false: the opening already says the twist, so it is not printed again. */
  twist?: false;
  /** The cost line as "It can cost nothing", where the opening says how. */
  free?: true;
};
type Opts = Pick<LetterEntry, "open" | "twist" | "free">;

const e = (week: number, idea: string, angle: LetterAngle | null, gift: boolean, en: string, es: string, o: Opts = {}): LetterEntry => ({
  week,
  idea,
  ...(angle ? { angle } : {}),
  ...(gift ? { gift: true as const } : {}),
  say: { en, es },
  ...o,
});

/**
 * The letter's own words for an idea, where the site's don't read right in a letter: American words
 * for "bookshop", "chips" and "interval", and Spanish that never genders the partner ("el otro",
 * "ninguno", "cada uno"). Per language; the other language keeps the site's words.
 */
export const LETTER_IDEA_WORDS: Readonly<Record<string, { title?: Partial<L>; blurb?: Partial<L>; twist?: Partial<L> }>> = {
  "bookshop-and-coffee": {
    title: { es: "Un libro elegido por tu pareja" },
    blurb: { en: "Twenty minutes apart in a bookstore, then coffee while you explain yourselves." },
  },
  "cinema-and-late-dessert": { twist: { es: "Quien elige la película no elige los asientos ni lo de picar." } },
  "stars-and-planets": { twist: { es: "Bautizad una estrella: cada cual le pone el nombre de su pareja. Hacedlo oficial en una servilleta." } },
  "bowling-night": {
    blurb: { en: "Bad shoes, worse technique, a basket of fries in the middle." },
    twist: { es: "Cada bola al canal, una verdad. Cada pleno, un reto." },
  },
  "pasta-and-a-slow-walk": { twist: { es: "Que cada cual pida por su pareja. Sin vetos." } },
  "karaoke-duet": { twist: { es: "Cada cual elige el solo de su pareja." } },
  "climbing-first-timers": {
    blurb: { es: "Una pared para principiantes, manos con magnesio y la cuerda en manos de tu pareja." },
    twist: { en: "Dinner’s on whoever says “I can’t” first." },
  },
  "theatre-night": {
    blurb: { en: "A reason to wear the good outfit, and a drink before the curtain.", es: "Una excusa para ponerse lo bueno y una copa antes de que se abra el telón." },
    twist: { en: "Guess the ending at intermission. Write it down. Loser buys the nightcap." },
  },
  "garden-afternoon": { twist: { es: "Encontrad la planta que más se parezca a cada cual." } },
  "ice-cream-walk": {
    blurb: { es: "Dos bolas por cabeza y un parque en el que perderse." },
    twist: { es: "Que cada cual pida el sabor que cree que elegirá su pareja. Si falla, se cambia." },
  },
  "golden-hour-picnic": { twist: { es: "Cada cual lleva algo que su pareja no ha probado nunca." } },
  "sunrise-and-breakfast": { blurb: { es: "Una alarma que nadie quería, una vista vacía y el primer café del día." } },
};

/** The 52, in week order (PLAN-letter.md Appendix A, rewritten in the build and the fix so no letter says one thing twice). New ideas replace a return, one row at a time. */
export const LETTER_ENTRIES: readonly LetterEntry[] = [
  e(1, "bookshop-and-coffee", null, false, "Meet me in a bookstore on Saturday. I already have a book in mind for you.", "Nos vemos el sábado en una librería. Ya tengo pensado un libro para ti."),
  e(2, "cinema-and-late-dessert", null, false, "Friday night out. I’ll save you the aisle seat and the last bite.", "El viernes salimos. Te guardo el asiento del pasillo y el último bocado."),
  e(3, "spa-evening", null, true, "I’ve booked Saturday evening. All you have to bring is yourself.", "He reservado el sábado por la tarde. Solo hace falta que vengas tú."),
  e(4, "stars-and-planets", "cheap", false, "Dress warm on Saturday night. I know a spot.", "Abrígate el sábado por la noche: conozco un sitio.", { free: true }),
  e(5, "bowling-night", null, false, "Bowling on Saturday. Fair warning: I’ve been practicing my gutter balls.", "Bolos el sábado. Te aviso: llevo días practicando cómo tirarla al canal."),
  e(6, "pasta-and-a-slow-walk", "night", true, "I’ve booked us a table for Saturday night.", "Tengo mesa reservada para el sábado por la noche.", {
    twist: false,
    open: {
      en: "You order for each other, so the menu is the first game.",
      es: "Cada cual pide por su pareja: la carta ya es un juego.",
    },
  }),
  e(7, "escape-room-debrief", null, false, "One locked room, one clock, you and me. Saturday we find out who gets us out.", "Una sala cerrada, un reloj, tú y yo. El sábado vemos quién nos saca de ahí."),
  e(8, "karaoke-duet", null, false, "Start warming up your voice. Saturday is karaoke, and I mean it.", "Ve calentando la voz: el sábado hay karaoke, y lo digo en serio."),
  e(9, "skating-and-hot-chocolate", "fun", false, "Ice rink on Saturday. I’m bad at this, which is half the fun.", "Pista de hielo el sábado. Se me da fatal, y esa es la mitad de la gracia."),
  e(10, "arcade-night", null, false, "Keep Friday night free. We’re going to the arcade, and I’m not letting you win.", "Resérvate el viernes por la noche. Nos vamos a los recreativos, y no pienso dejarte ganar."),
  e(11, "climbing-first-timers", null, false, "Climbing on Saturday. Neither of us knows what we’re doing, which is the point.", "Escalada el sábado. No tenemos ni idea, y de eso se trata."),
  e(12, "theatre-night", "night", true, "Wear the thing you never get to wear. We’re going to the theater on Saturday.", "Ponte eso que nunca tienes ocasión de ponerte: el sábado vamos al teatro.", {
    twist: false,
    open: {
      en: "Write your guess at the ending down at intermission; the loser buys the nightcap.",
      es: "Apuntad en el descanso cómo creéis que acaba; quien falle paga la última copa.",
    },
  }),
  e(13, "bookshop-and-coffee", "cheap", false, "How well do you think I know your taste? We find out on Saturday.", "¿Cuánto crees que conozco tus gustos? El sábado lo vemos."),
  e(14, "cinema-and-late-dessert", "rainy-day", false, "If Saturday rains, I’m not canceling. I’m just moving us indoors.", "Si el sábado llueve, no anulo nada: nos vamos a cubierto."),
  e(15, "spa-evening", "unique", false, "Keep Saturday evening free, and leave your watch at home.", "Guárdame la tarde del sábado, y deja el reloj en casa.", { twist: false }),
  e(16, "garden-afternoon", null, false, "I already know which plant you are. Garden on Sunday?", "Ya sé qué planta eres tú. ¿Jardín el domingo?"),
  e(17, "museum-then-wine", null, false, "Saturday, a museum, and you’re not allowed to read every label.", "El sábado, museo, y prohibido leer todas las cartelas."),
  e(18, "ice-cream-walk", null, false, "Sunday, ice cream and a walk. Your order says a lot about you.", "El domingo, helado y paseo. Lo que pides dice mucho de ti."),
  e(19, "mini-golf-and-milkshakes", null, false, "Mini golf on Saturday. I’ve been practicing in the hallway.", "Minigolf el sábado. Llevo días practicando en el pasillo."),
  e(20, "bowling-night", "double-date", false, "Let’s ask another couple to go bowling on Friday. Losing pair buys the fries.", "¿Invitamos a otra pareja a los bolos el viernes? La pareja que pierda paga las patatas.", {
    open: { es: "Pareja contra pareja, o mezclad los equipos una partida y a ver quién se enfurruña." },
  }),
  e(21, "golden-hour-picnic", null, true, "You choose the spot, I’ll choose the music. Saturday evening, outside.", "Tú eliges el sitio y yo la música. El sábado por la tarde, al aire libre."),
  e(22, "boats-on-the-water", null, false, "Saturday, a rowboat. I’ll row first, you can laugh.", "El sábado, barca de remos. Remo yo primero; tú puedes reírte."),
  e(23, "beach-until-sunset", null, true, "Saturday at the beach. Don’t make plans for the evening.", "El sábado, playa. No hagas planes para la noche."),
  e(24, "stars-and-planets", null, false, "I’ve picked out a star for you. Come and see it Saturday night.", "Te he elegido una estrella. Ven a verla el sábado por la noche."),
  e(25, "gallery-hop", null, false, "Bring your worst opinions on Saturday. We’re doing a few small galleries.", "El sábado trae tus peores opiniones: vamos a unas cuantas galerías pequeñas."),
  e(26, "sunrise-and-breakfast", null, true, "Sunday, very early. I know. Breakfast is on me.", "El domingo, muy temprano. Ya lo sé. Yo invito al desayuno."),
  e(27, "pasta-and-a-slow-walk", null, false, "Dinner on Friday. Bring comfortable shoes; the evening doesn’t end at the table.", "Cena el viernes. Trae zapatos cómodos: la noche no acaba en la mesa."),
  e(28, "escape-room-debrief", "fun", false, "Saturday we get locked in a room on purpose. It’ll be fun, I promise.", "El sábado nos dejamos encerrar en una sala a propósito. Será divertido, te lo prometo."),
  e(29, "garden-afternoon", "romantic", true, "A garden on Sunday, and nowhere we have to be after. Just you.", "El domingo, un jardín y ningún sitio al que ir después. Solo tú.", {
    open: { en: "Slow paths, a bench for two and tea to finish. Nothing about it can be hurried." },
  }),
  e(30, "karaoke-duet", "double-date", false, "Karaoke with another couple on Saturday. I’ve already picked our duet.", "Karaoke con otra pareja el sábado. Ya he elegido nuestro dueto."),
  e(31, "ice-cream-walk", "cheap", false, "Sunday afternoon is free, and so am I. Ice cream?", "El domingo por la tarde estoy libre. ¿Helado?", {
    open: {
      en: "Two cones and a park: about the cheapest date there is that still feels like an occasion.",
      es: "Dos helados y un parque: casi la cita más barata que hay, y aún parece una ocasión.",
    },
  }),
  e(32, "arcade-night", "fun", false, "Air hockey on Friday. I intend to hold a grudge.", "Air hockey el viernes. Pienso guardarte rencor."),
  e(33, "mini-golf-and-milkshakes", "double-date", false, "Mini golf with another couple on Saturday? Couple against couple.", "¿Minigolf con otra pareja el sábado? Pareja contra pareja.", { twist: false }),
  e(34, "golden-hour-picnic", "cheap", false, "I’ll pack the basket, you find the view. Saturday at sunset.", "Yo preparo la cesta; tú, la vista. El sábado al atardecer."),
  e(35, "beach-until-sunset", "romantic", true, "Pack a towel for two. Saturday is a beach day.", "Trae una toalla para dos: el sábado es día de playa.", { twist: false }),
  e(36, "boats-on-the-water", "fun", false, "Rowboat on Saturday. You row first; I’ll do the voice-over.", "Barca de remos el sábado. Remas tú primero; yo pongo la voz.", {
    twist: false,
    open: { es: "Una hora dando vueltas, y quien no rema lo narra como un documental de naturaleza." },
  }),
  e(37, "climbing-first-timers", "unique", false, "New thing for Saturday: a climbing wall. I’ve never done it either.", "Novedad para el sábado: un rocódromo. Yo tampoco lo he probado nunca.", {
    twist: false,
    open: { es: "Una pared para principiantes y la cuerda en manos de tu pareja. Paga la cena quien diga primero «no puedo»." },
  }),
  e(38, "theatre-night", "rainy-day", false, "If Saturday is wet, I’m taking you somewhere the rain can’t follow. The theater.", "Si el sábado llueve, te llevo adonde la lluvia no llega: al teatro.", {
    open: {
      en: "Coats at the coat check, and the weather is somebody else’s problem until the curtain comes down.",
      es: "Los abrigos en el guardarropa, y el tiempo es problema de otro hasta que baja el telón.",
    },
  }),
  e(39, "sunrise-and-breakfast", "cheap", false, "Sunday, early. Coffee tastes better after a sunrise.", "El domingo, temprano. El café sabe mejor después de un amanecer.", {
    open: { en: "The sunrise is free and so is the empty city. Bring a flask and skip the coffee shop at the end." },
  }),
  e(40, "gallery-hop", "cheap", false, "Your job on Saturday: pick the one piece in the galleries we’d hang at home.", "Tu trabajo el sábado: elegir la obra que colgaríamos en casa."),
  e(41, "bookshop-and-coffee", "rainy-day", false, "Let it rain on Saturday. I know which shelf I’m taking you to.", "Que llueva el sábado. Ya sé a qué estantería te llevo.", {
    open: { en: "Rain on the window is what a bookstore is for. Twenty minutes apart, then coffee." },
  }),
  e(42, "cinema-and-late-dessert", "night", false, "Late film on Saturday. You get the armrest, I get the popcorn.", "Sesión de noche el sábado. Tú te quedas el reposabrazos; yo, las palomitas.", {
    twist: false,
    open: { es: "Quien elige la peli no elige los asientos, y la charla se guarda para el postre." },
  }),
  e(43, "spa-evening", "rainy-day", true, "I’ve told everyone we’re unreachable on Saturday evening.", "Ya he avisado de que el sábado por la tarde estaremos ilocalizables."),
  e(44, "stars-and-planets", "night", false, "Saturday, late. Bring the big coat; I’ll bring something warm to drink.", "El sábado, tarde. Trae el abrigo gordo; yo llevo algo caliente para beber."),
  e(45, "bowling-night", "fun", false, "Rematch at the bowling alley on Friday. Loser picks the next date.", "Revancha en la bolera el viernes. Quien pierda elige la próxima cita.", { twist: false }),
  e(46, "pasta-and-a-slow-walk", "double-date", false, "Dinner with another couple on Saturday. I’m already planning what we’ll order them.", "Cena con otra pareja el sábado. Ya estoy pensando qué les vamos a pedir.", { twist: false }),
  e(47, "escape-room-debrief", "night", false, "Saturday night, an escape room. I’m in charge of the clues, you’re in charge of panic.", "El sábado por la noche, sala de escape. Yo me encargo de las pistas; tú, del pánico.", {
    twist: false,
    open: { es: "Bajo llave en el mismo bando y luego una copa. Nadie reparte culpas antes de que llegue." },
  }),
  e(48, "karaoke-duet", "unique", false, "One thing we don’t do enough: sing badly. Saturday, we fix that.", "Algo que hacemos poco: cantar mal. El sábado lo arreglamos.", {
    twist: false,
    open: { es: "Una sala privada, un dueto y un solo para cada cual, elegido por su pareja." },
  }),
  e(49, "skating-and-hot-chocolate", null, false, "Skating on Saturday. Wear gloves, you’ll be holding on to me.", "Patinaje el sábado. Ponte guantes, que vas a ir agarrándote a mí."),
  e(50, "arcade-night", "night", false, "Friday night at the arcade. I’m spending every ticket on you.", "Viernes por la noche en los recreativos. Todos mis tickets, para ti.", { twist: false }),
  e(51, "climbing-first-timers", "fun", false, "Chalky hands on Saturday. I promise not to laugh much.", "Manos con magnesio el sábado. Prometo no reírme mucho.", {
    open: { es: "Mientras una persona sube, la otra sujeta la cuerda: la confianza llega antes de lo normal." },
  }),
  e(52, "theatre-night", null, true, "Two seats on Saturday, and dinner after is my treat.", "Dos butacas el sábado, y la cena de después corre de mi cuenta."),
];

/** The subject's first words when an entry is seen from a kind of date. */
export const LETTER_ANGLES: Record<LetterAngle, L> = {
  fun: { en: "For a laugh", es: "Para reírse" },
  cheap: { en: "For next to nothing", es: "Por casi nada" },
  romantic: { en: "The romantic one", es: "La romántica" },
  "double-date": { en: "With another couple", es: "Con otra pareja" },
  "rainy-day": { en: "If it rains", es: "Si llueve" },
  night: { en: "After dark", es: "De noche" },
  unique: { en: "Something different", es: "Algo distinto" },
};

/** About how long, by the idea's `minutes`. */
export const LETTER_ABOUT: Record<number, L> = {
  90: { en: "About an hour and a half.", es: "Alrededor de hora y media." },
  120: { en: "About two hours.", es: "Unas dos horas." },
  150: { en: "About two and a half hours.", es: "Unas dos horas y media." },
  180: { en: "About three hours.", es: "Unas tres horas." },
  210: { en: "About three and a half hours.", es: "Unas tres horas y media." },
  240: { en: "About four hours.", es: "Unas cuatro horas." },
};

/** About what it costs, in words, by the idea's `budget` (never a price of ours). */
export const LETTER_COST: Record<0 | 1 | 2 | 3, L> = {
  0: { en: "It can cost nothing.", es: "Puede salir gratis." },
  1: { en: "Costs about a coffee each.", es: "Cuesta más o menos un café por cabeza." },
  2: { en: "Costs about a dinner out.", es: "Cuesta más o menos lo que una cena fuera." },
  3: { en: "It’s a treat: check the price before you book.", es: "Es un capricho: mirad el precio antes de reservar." },
};

/** The entry of a place in the year (1 to 52). */
export const letterEntry = (slot: number): LetterEntry => LETTER_ENTRIES[slot - 1];

export type LetterWords = { id: string; subject: string; title: string; open: string; about: string; cost: string; twist?: string; say: string; gift: boolean };

/** Straight apostrophes and quotes from the site's words, set as the letter's own lines are. */
const curl = (s: string): string => s.replace(/(\p{L})'(\p{L})/gu, "$1’$2").replace(/'([^']+)'/g, "“$1”");

/** An entry as the e-mail prints it, in one language. Throws when its idea, its angle's line or its length is missing: the tests hold all 52. */
export function letterWords(entry: LetterEntry, locale: "en" | "es"): LetterWords {
  const idea = ideaById(entry.idea);
  if (!idea) throw new Error(`date letter: week ${entry.week} names no idea (${entry.idea})`);
  const own = LETTER_IDEA_WORDS[entry.idea] ?? {};
  let open = entry.open?.[locale];
  if (entry.angle) {
    if (!KIND_IDEAS[entry.angle].includes(entry.idea)) throw new Error(`date letter: week ${entry.week}: ${entry.idea} is not a ${entry.angle} idea`);
    const fit = DATE_KIND_COPY[entry.angle]?.fits[entry.idea]?.[locale];
    if (!fit) throw new Error(`date letter: week ${entry.week} has no ${entry.angle} line for ${entry.idea}`);
    open ??= fit;
  }
  open ??= own.blurb?.[locale] ?? idea.blurb[locale];
  const about = LETTER_ABOUT[idea.minutes]?.[locale];
  if (!about) throw new Error(`date letter: no words for ${idea.minutes} minutes`);
  const cost = LETTER_COST[entry.free || (entry.angle === "cheap" && canBeFree(idea)) ? 0 : idea.budget][locale];
  const title = curl(own.title?.[locale] ?? idea.title[locale]);
  // A plain week's subject is the idea's own title; an angled one leads with the angle. Spanish sets no
  // capital after a colon, and a title with a colon of its own ("Minigolf: quien pierda…") follows a full stop.
  let subject = title;
  if (entry.angle) {
    const colon = title.includes(":");
    const rest = locale === "es" && !colon ? title.charAt(0).toLocaleLowerCase("es") + title.slice(1) : title;
    subject = `${LETTER_ANGLES[entry.angle][locale]}${colon ? "." : ":"} ${rest}`;
  }
  const twist = entry.twist === false ? undefined : curl(own.twist?.[locale] ?? idea.twist[locale]);
  return { id: idea.id, subject, title, open: curl(open), about, cost, ...(twist ? { twist } : {}), say: entry.say[locale], gift: Boolean(entry.gift) };
}
