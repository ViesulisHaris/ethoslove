import { ideaById, canBeFree } from "@/lib/dates/ideas";
import { KIND_IDEAS, type DateKind } from "@/lib/dates/date-kinds";
import { DATE_KIND_COPY } from "@/content/date-kinds";

/**
 * The date letter's year (lib/lifecycle/date-letter.ts): one entry a week, 52 of them, played round
 * and round from week 1 (the week of Monday 4 January 2027). Each entry is one of the site's own
 * date ideas (lib/dates/ideas.ts), alone or seen from one of the kinds of date (lib/dates/date-kinds.ts,
 * whose page already says why it fits: content/date-kinds.ts `fits`), and one line to say to the
 * other person. The idea's own title, blurb and twist are used as they stand; only the line to say
 * is written here.
 *
 * The season fits the northern half: the ideas that need a dry day sit in weeks 16 to 40 (late April
 * to early October), the beach in 23 to 35, the ice rink in the cold weeks. An idea never comes back
 * within twelve weeks, and the quiet gift line under the button (`gift`) comes at most once in two
 * weeks. tests/unit/date-letter-content.test.ts holds all of it.
 *
 * Lines are American English; numbers are words. Nothing here names a place, a price or a person.
 */

type L = { en: string; es: string };
export type LetterAngle = Extract<DateKind, "fun" | "cheap" | "romantic" | "double-date" | "rainy-day" | "night" | "unique">;
export type LetterEntry = { week: number; idea: string; angle?: LetterAngle; gift?: true; say: L };

const e = (week: number, idea: string, angle: LetterAngle | null, gift: boolean, en: string, es: string): LetterEntry => ({
  week,
  idea,
  ...(angle ? { angle } : {}),
  ...(gift ? { gift: true as const } : {}),
  say: { en, es },
});

/** The 52, in week order (PLAN-letter.md Appendix A). New ideas replace a return, one row at a time. */
export const LETTER_ENTRIES: readonly LetterEntry[] = [
  e(1, "bookshop-and-coffee", null, false, "Saturday: twenty minutes apart in a bookshop, then coffee. I’m choosing your book.", "El sábado: veinte minutos cada uno por su lado en una librería y luego café. Tu libro lo elijo yo."),
  e(2, "cinema-and-late-dessert", null, false, "Back row on Friday. You choose the film, I’ll handle seats and snacks.", "El viernes, última fila. Tú eliges la peli; yo, los asientos y lo de picar."),
  e(3, "spa-evening", null, true, "Two hours of warm water this weekend, and not one word about work.", "Este fin de semana, dos horas de agua caliente y ni una palabra de trabajo."),
  e(4, "stars-and-planets", "unique", false, "Saturday night we’re looking up. Dress warm, or we go to the planetarium.", "El sábado por la noche miramos al cielo. Abrígate, o nos vamos al planetario."),
  e(5, "bowling-night", null, false, "Bowling on Saturday. Every gutter ball is a truth, every strike is a dare.", "Bolos el sábado. Cada bola fuera, una verdad; cada pleno, un reto."),
  e(6, "pasta-and-a-slow-walk", "romantic", true, "Dinner on Saturday. I’m ordering for you, you’re ordering for me. No vetoes.", "Cena el sábado. Yo pido por ti y tú por mí. Sin vetos."),
  e(7, "escape-room-debrief", null, false, "Sixty minutes locked in a room with me on Saturday. Drinks after, to recover.", "El sábado, sesenta minutos en una sala de escape conmigo. Luego, algo de beber para recuperarnos."),
  e(8, "karaoke-duet", null, false, "One duet this weekend, private booth. I’m choosing your solo.", "Un dueto este fin de semana, en sala privada. Tu solo lo elijo yo."),
  e(9, "skating-and-hot-chocolate", "fun", false, "Ice rink on Saturday. Whoever falls first buys the hot chocolate.", "Pista de hielo el sábado. Quien se caiga primero paga el chocolate."),
  e(10, "arcade-night", null, false, "Bring coins on Friday. We’re pooling the tickets for one terrible prize.", "El viernes trae monedas. Juntamos los tickets para un premio horrible."),
  e(11, "climbing-first-timers", null, false, "Beginner’s wall on Saturday. I’ll hold your rope if you hold mine.", "Rocódromo para principiantes el sábado. Yo sujeto tu cuerda si tú sujetas la mía."),
  e(12, "theatre-night", "night", true, "Wear the good outfit on Saturday. We guess the ending at intermission.", "El sábado ponte lo bueno. En el descanso apostamos el final."),
  e(13, "bookshop-and-coffee", "cheap", false, "Costs us two coffees: we browse a bookshop first, then sit down with them.", "Nos cuesta dos cafés: primero curioseamos en una librería y luego nos sentamos con ellos."),
  e(14, "cinema-and-late-dessert", "rainy-day", false, "If it rains on Saturday, it’s the back row and a late dessert.", "Si llueve el sábado, toca última fila y postre tardío."),
  e(15, "spa-evening", "unique", false, "Keep Saturday evening free. Warm water, no phones, nothing to do.", "Guárdame la tarde del sábado. Agua caliente, sin móviles y nada que hacer."),
  e(16, "garden-afternoon", null, false, "A garden on Sunday afternoon, tea after. Find the plant that looks like me.", "El domingo, tarde en un jardín y té después. Busca la planta que más se me parezca."),
  e(17, "museum-then-wine", null, false, "One hour in a museum on Saturday, then a drink. Choose the piece you’d steal.", "El sábado, una hora de museo y luego una copa. Elige la obra que robarías."),
  e(18, "ice-cream-walk", null, false, "Ice cream and a walk on Sunday. I’m guessing your flavor.", "Helado y paseo el domingo. Voy a adivinar tu sabor."),
  e(19, "mini-golf-and-milkshakes", null, false, "Mini golf on Saturday. Loser buys dessert and takes the photo.", "Minigolf el sábado. Quien pierda paga el postre y hace la foto."),
  e(20, "bowling-night", "double-date", false, "Let’s ask another couple to go bowling on Friday. Losing pair buys the fries.", "¿Invitamos a otra pareja a los bolos el viernes? La pareja que pierda paga las patatas."),
  e(21, "golden-hour-picnic", null, true, "Blanket, something sweet, the best view in town at sunset. Bring one thing I’ve never tried.", "Manta, algo dulce y la mejor vista de la ciudad al atardecer. Trae algo que yo no haya probado."),
  e(22, "boats-on-the-water", null, false, "An hour in a rowing boat on Saturday. We take turns, and I narrate.", "Una hora en barca de remos el sábado. Remamos por turnos y yo narro."),
  e(23, "beach-until-sunset", null, true, "Beach on Saturday until the sun’s gone, then dinner with sand on our feet.", "Playa el sábado hasta que se vaya el sol, y cena con arena en los pies."),
  e(24, "stars-and-planets", null, false, "The darkest viewpoint in town, Saturday night. I’m naming a star after you.", "El mirador más oscuro de la ciudad, el sábado por la noche. Le pongo tu nombre a una estrella."),
  e(25, "gallery-hop", null, false, "Small galleries on Saturday, free to walk into. We title everything before reading the label.", "Galerías pequeñas el sábado, de entrada libre. Le ponemos título a todo antes de leer la cartela."),
  e(26, "sunrise-and-breakfast", null, true, "Set an alarm for Sunday. A view with nobody in it, then the first coffee.", "Pon la alarma para el domingo. Una vista sin nadie y luego el primer café."),
  e(27, "pasta-and-a-slow-walk", null, false, "A table for two on Friday, then we walk home the long way.", "Mesa para dos el viernes y luego volvemos a casa por el camino largo."),
  e(28, "escape-room-debrief", "unique", false, "Something different: an escape room on Saturday. No blaming until the first drink.", "Algo distinto: un escape room el sábado. Nada de culpas hasta la primera copa."),
  e(29, "garden-afternoon", "romantic", true, "Sunday, a garden, a bench with a view of nothing much, and you.", "El domingo: un jardín, un banco con vistas a nada en concreto, y tú."),
  e(30, "karaoke-duet", "double-date", false, "Karaoke with another couple on Saturday. Each pair picks the other’s song.", "Karaoke con otra pareja el sábado. Cada pareja elige la canción de la otra."),
  e(31, "ice-cream-walk", "cheap", false, "Two scoops each and a park on Sunday. That’s the whole budget.", "Dos bolas por cabeza y un parque el domingo. Ese es todo el presupuesto."),
  e(32, "arcade-night", "fun", false, "Air hockey on Friday. I intend to hold a grudge.", "Air hockey el viernes. Pienso guardarte rencor."),
  e(33, "mini-golf-and-milkshakes", "double-date", false, "Mini golf, two couples, one very serious scorecard. Saturday?", "Minigolf, dos parejas y una tarjeta de puntos muy seria. ¿El sábado?"),
  e(34, "golden-hour-picnic", "cheap", false, "A picnic from home on Saturday at sunset. It costs us a blanket.", "Pícnic hecho en casa el sábado al atardecer. Nos cuesta una manta."),
  e(35, "beach-until-sunset", "romantic", true, "Come write something in the sand with me on Saturday, and let the tide take it.", "Ven el sábado a escribir algo en la arena conmigo, y que se lo lleve la marea."),
  e(36, "boats-on-the-water", "fun", false, "Rowing boat, Saturday. We will go in circles and I will blame you.", "Barca de remos, el sábado. Daremos vueltas y te echaré la culpa."),
  e(37, "climbing-first-timers", "unique", false, "New thing for Saturday: a climbing wall. Dinner’s on whoever says “I can’t” first.", "Novedad para el sábado: un rocódromo. Paga la cena quien diga primero «no puedo»."),
  e(38, "museum-then-wine", "rainy-day", false, "If Saturday is wet: an hour in a museum, then we argue over a drink.", "Si el sábado llueve: una hora de museo y luego lo discutimos con una copa."),
  e(39, "sunrise-and-breakfast", "unique", false, "Sunday, before the city wakes. Phones stay in pockets until the sun is up.", "El domingo, antes de que despierte la ciudad. Los móviles, en el bolsillo hasta que salga el sol."),
  e(40, "gallery-hop", "cheap", false, "Galleries on Saturday cost nothing to walk into. We whisper, then maybe a coffee.", "Entrar a las galerías el sábado no cuesta nada. Susurramos, y luego quizá un café."),
  e(41, "bookshop-and-coffee", "rainy-day", false, "Rain plan for Saturday: a bookshop, then coffee. Write me a note on the first page.", "Plan de lluvia para el sábado: librería y café. Escríbeme una nota en la primera página."),
  e(42, "cinema-and-late-dessert", "night", false, "Late film on Saturday, then somewhere still open for dessert.", "Peli tarde el sábado y luego algún sitio que siga abierto para el postre."),
  e(43, "spa-evening", "romantic", true, "The slowest two hours of the month, Saturday evening. Just us and warm water.", "Las dos horas más lentas del mes, el sábado por la tarde. Tú, yo y agua caliente."),
  e(44, "stars-and-planets", "night", false, "After dark on Saturday we look up, then something warm to drink.", "El sábado, cuando oscurezca, miramos al cielo y luego tomamos algo caliente."),
  e(45, "bowling-night", "fun", false, "Bowling on Friday, bumpers allowed. I’m keeping a very serious score.", "Bolos el viernes, con barreras si hace falta. Pienso llevar la cuenta muy en serio."),
  e(46, "pasta-and-a-slow-walk", "double-date", false, "Dinner for four on Saturday. Everyone orders for the person on their left.", "Cena para cuatro el sábado. Cada cual pide por quien tenga a su izquierda."),
  e(47, "escape-room-debrief", "night", false, "Saturday night, sixty minutes to get out of a room. Then a drink to debrief.", "El sábado por la noche, sesenta minutos para salir de una sala. Luego, una copa para comentarlo."),
  e(48, "karaoke-duet", "unique", false, "One thing we don’t do enough: sing badly. Saturday, private booth.", "Algo que hacemos poco: cantar mal. El sábado, en sala privada."),
  e(49, "skating-and-hot-chocolate", null, false, "Skating on Saturday. Holding hands isn’t optional, it’s structural.", "Patinaje el sábado. Ir de la mano no es opcional, es estructural."),
  e(50, "arcade-night", "night", false, "Friday night at the arcade. Whatever the tickets buy lives on our shelf forever.", "Viernes por la noche en los recreativos. Lo que den los tickets se queda en la estantería para siempre."),
  e(51, "climbing-first-timers", "fun", false, "Climbing on Saturday. Chalky hands, and I promise not to laugh much.", "Escalada el sábado. Manos con magnesio, y prometo no reírme mucho."),
  e(52, "theatre-night", null, true, "Dress up with me on Saturday. Theater, and a drink at intermission.", "Arréglate conmigo el sábado. Teatro y una copa en el descanso."),
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

export type LetterWords = { id: string; subject: string; title: string; blurb: string; fit?: string; about: string; cost: string; twist: string; say: string; gift: boolean };

/** An entry as the e-mail prints it, in one language. Throws when its idea, its angle's line or its length is missing: the tests hold all 52. */
export function letterWords(entry: LetterEntry, locale: "en" | "es"): LetterWords {
  const idea = ideaById(entry.idea);
  if (!idea) throw new Error(`date letter: week ${entry.week} names no idea (${entry.idea})`);
  let fit: string | undefined;
  if (entry.angle) {
    if (!KIND_IDEAS[entry.angle].includes(entry.idea)) throw new Error(`date letter: week ${entry.week}: ${entry.idea} is not a ${entry.angle} idea`);
    fit = DATE_KIND_COPY[entry.angle]?.fits[entry.idea]?.[locale];
    if (!fit) throw new Error(`date letter: week ${entry.week} has no ${entry.angle} line for ${entry.idea}`);
  }
  const about = LETTER_ABOUT[idea.minutes]?.[locale];
  if (!about) throw new Error(`date letter: no words for ${idea.minutes} minutes`);
  const cost = LETTER_COST[entry.angle === "cheap" && canBeFree(idea) ? 0 : idea.budget][locale];
  const title = idea.title[locale];
  const subject = entry.angle ? `${LETTER_ANGLES[entry.angle][locale]}: ${title}` : locale === "es" ? `Este fin de semana: ${title}` : `This weekend: ${title}`;
  return { id: idea.id, subject, title, blurb: idea.blurb[locale], ...(fit ? { fit } : {}), about, cost, twist: idea.twist[locale], say: entry.say[locale], gift: Boolean(entry.gift) };
}
