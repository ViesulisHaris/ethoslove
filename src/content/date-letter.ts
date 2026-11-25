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

/** The 52, in week order (PLAN-letter.md Appendix A; lines that repeated the idea’s own words were rewritten in the build). New ideas replace a return, one row at a time. */
export const LETTER_ENTRIES: readonly LetterEntry[] = [
  e(1, "bookshop-and-coffee", null, false, "Saturday: meet me in the bookshop. I already have a book in mind for you.", "El sábado, en la librería. Ya tengo pensado un libro para ti."),
  e(2, "cinema-and-late-dessert", null, false, "Friday, back row. I’ll save you the aisle seat and the last bite of dessert.", "El viernes, última fila. Te guardo el pasillo y el último bocado del postre."),
  e(3, "spa-evening", null, true, "Saturday evening, warm water and nowhere to be. Phones stay in the locker.", "El sábado por la tarde, agua caliente y nada más que hacer. Los móviles, en la taquilla."),
  e(4, "stars-and-planets", "cheap", false, "Saturday night we’re looking up. Dress warm, or we go to the planetarium.", "El sábado por la noche miramos al cielo. Abrígate, o nos vamos al planetario."),
  e(5, "bowling-night", null, false, "Bowling on Saturday. Fair warning: I’ve been practicing my gutter balls.", "Bolos el sábado. Te aviso: llevo días practicando las bolas fuera."),
  e(6, "pasta-and-a-slow-walk", "night", true, "Saturday night is ours. Dinner first, and then I’m in no hurry to get home.", "El sábado por la noche es nuestro. Primero cena, y luego no tengo prisa por volver a casa."),
  e(7, "escape-room-debrief", null, false, "Saturday: one locked room, one clock, you and me. Let’s see who finds the way out.", "El sábado: una sala cerrada, un reloj, tú y yo. A ver quién encuentra la salida."),
  e(8, "karaoke-duet", null, false, "Saturday, private booth. Start warming up your voice, I mean it.", "El sábado, sala privada. Ve calentando la voz, lo digo en serio."),
  e(9, "skating-and-hot-chocolate", "fun", false, "Ice rink on Saturday. I’m bad at this, which is half the fun.", "Pista de hielo el sábado. Se me da fatal, y esa es la mitad de la gracia."),
  e(10, "arcade-night", null, false, "Bring every coin you own on Friday. We’re going to the arcade.", "El viernes trae todas las monedas que tengas. Nos vamos a los recreativos."),
  e(11, "climbing-first-timers", null, false, "Beginner’s wall on Saturday. Neither of us knows what we’re doing, which is the point.", "Rocódromo para principiantes el sábado. No tenemos ni idea, y de eso se trata."),
  e(12, "theatre-night", "night", true, "Saturday night, the theater. Then a late drink to argue about the ending.", "El sábado por la noche, teatro. Luego una copa tarde para discutir el final."),
  e(13, "bookshop-and-coffee", "cheap", false, "A cheap one on Saturday: we browse, we don’t buy, and the coffee’s on me.", "Una barata el sábado: miramos, no compramos, y el café corre de mi cuenta."),
  e(14, "cinema-and-late-dessert", "rainy-day", false, "If Saturday rains, I’m not canceling. I’m just moving us indoors.", "Si el sábado llueve, no anulo nada: solo nos mudamos bajo techo."),
  e(15, "spa-evening", "unique", false, "Keep Saturday evening free. I’m planning nothing, on purpose.", "Guárdame la tarde del sábado. No he planeado nada, a propósito."),
  e(16, "garden-afternoon", null, false, "A garden on Sunday afternoon, tea after. I already know which plant you are.", "El domingo, tarde en un jardín y té después. Ya sé qué planta eres tú."),
  e(17, "museum-then-wine", null, false, "One hour in a museum on Saturday, then a drink. I already know what I’d steal.", "El sábado, una hora de museo y luego una copa. Ya sé qué me llevaría."),
  e(18, "ice-cream-walk", null, false, "Ice cream and a walk on Sunday. I’m guessing your flavor.", "Helado y paseo el domingo. Voy a adivinar tu sabor."),
  e(19, "mini-golf-and-milkshakes", null, false, "Mini golf on Saturday. I’m choosing dessert, so get used to losing.", "Minigolf el sábado. El postre lo elijo yo, así que ve haciéndote a perder."),
  e(20, "bowling-night", "double-date", false, "Let’s ask another couple to go bowling on Friday. Losing pair buys the fries.", "¿Invitamos a otra pareja a los bolos el viernes? La pareja que pierda paga las patatas."),
  e(21, "golden-hour-picnic", null, true, "Saturday, as the light goes. I’ll bring the blanket, you bring the surprise.", "El sábado, cuando caiga la luz. Yo llevo la manta; tú, la sorpresa."),
  e(22, "boats-on-the-water", null, false, "An hour in a rowing boat on Saturday. I’ll row first, you can laugh.", "Una hora en barca de remos el sábado. Remo yo primero; tú puedes reírte."),
  e(23, "beach-until-sunset", null, true, "Saturday at the beach, and we don’t leave until the sun does.", "El sábado a la playa, y no nos vamos hasta que se vaya el sol."),
  e(24, "stars-and-planets", null, false, "Saturday night, the darkest spot we can find. I’ve picked out a star for you.", "El sábado por la noche, el sitio más oscuro que encontremos. Te he elegido una estrella."),
  e(25, "gallery-hop", null, false, "Saturday, a few small galleries. Wear comfortable shoes and bring your worst opinions.", "El sábado, unas cuantas galerías pequeñas. Zapatos cómodos y tus peores opiniones."),
  e(26, "sunrise-and-breakfast", null, true, "Set an alarm for Sunday. Early, I know. Breakfast is on me.", "Pon la alarma para el domingo. Temprano, ya lo sé. Yo invito al desayuno."),
  e(27, "pasta-and-a-slow-walk", null, false, "Dinner on Friday. Bring comfortable shoes: we’re not taking the short way back.", "Cena el viernes. Trae zapatos cómodos: no volvemos por el camino corto."),
  e(28, "escape-room-debrief", "fun", false, "Saturday we get locked in a room on purpose. It’ll be fun, I promise.", "El sábado nos dejamos encerrar en una sala a propósito. Será divertido, te lo prometo."),
  e(29, "garden-afternoon", "romantic", true, "Sunday, a garden, and nowhere we have to be after. Just you.", "El domingo, un jardín y ningún sitio al que ir después. Solo tú."),
  e(30, "karaoke-duet", "double-date", false, "Karaoke with another couple on Saturday. Each pair picks the other’s song.", "Karaoke con otra pareja el sábado. Cada pareja elige la canción de la otra."),
  e(31, "ice-cream-walk", "cheap", false, "Sunday: ice cream, a park, and absolutely nothing else on the list.", "El domingo: helado, un parque y nada más en la lista."),
  e(32, "arcade-night", "fun", false, "Air hockey on Friday. I intend to hold a grudge.", "Air hockey el viernes. Pienso guardarte rencor."),
  e(33, "mini-golf-and-milkshakes", "double-date", false, "Mini golf with another couple on Saturday? Couple against couple.", "¿Minigolf con otra pareja el sábado? Pareja contra pareja."),
  e(34, "golden-hour-picnic", "cheap", false, "Saturday at sunset. I’ll pack the basket, you find the view.", "El sábado al atardecer. Yo preparo la cesta; tú, la vista."),
  e(35, "beach-until-sunset", "romantic", true, "Saturday, the beach. I’ll write you something only the tide gets to read.", "El sábado, la playa. Te escribiré algo que solo leerá la marea."),
  e(36, "boats-on-the-water", "fun", false, "Rowing boat on Saturday. If we end up back where we started, that counts.", "Barca de remos el sábado. Si acabamos donde empezamos, también cuenta."),
  e(37, "climbing-first-timers", "unique", false, "New thing for Saturday: a climbing wall. I’ve never done it either.", "Novedad para el sábado: un rocódromo. Yo tampoco lo he probado nunca."),
  e(38, "theatre-night", "rainy-day", false, "If Saturday is wet, I’m taking you somewhere the rain can’t follow. The theater.", "Si el sábado llueve, te llevo adonde la lluvia no llega: al teatro."),
  e(39, "sunrise-and-breakfast", "cheap", false, "Sunday, before the city wakes. Coffee tastes better after a sunrise.", "El domingo, antes de que despierte la ciudad. El café sabe mejor después de un amanecer."),
  e(40, "gallery-hop", "cheap", false, "Saturday, galleries. Your job is to pick the one piece we’d hang at home.", "El sábado, galerías. Tu trabajo: elegir la obra que colgaríamos en casa."),
  e(41, "bookshop-and-coffee", "rainy-day", false, "Rain plan for Saturday: a bookshop, then coffee. I’ll pick yours, you pick mine.", "Plan de lluvia para el sábado: librería y café. Yo elijo el tuyo; tú, el mío."),
  e(42, "cinema-and-late-dessert", "night", false, "Late film on Saturday. You get the armrest, I get the popcorn.", "Peli tarde el sábado. Tú te quedas el reposabrazos; yo, las palomitas."),
  e(43, "spa-evening", "rainy-day", true, "Saturday evening, just us. I’ve already told everyone we’re unreachable.", "El sábado por la tarde, solo tú y yo. Ya he avisado de que estaremos ilocalizables."),
  e(44, "stars-and-planets", "night", false, "After dark on Saturday we look up, then something warm to drink.", "El sábado, cuando oscurezca, miramos al cielo y luego tomamos algo caliente."),
  e(45, "bowling-night", "fun", false, "Bowling on Friday. I want a rematch, and this time I’m keeping score.", "Bolos el viernes. Quiero la revancha, y esta vez apunto yo."),
  e(46, "pasta-and-a-slow-walk", "double-date", false, "Dinner for four on Saturday. Everyone orders for the person on their left.", "Cena para cuatro el sábado. Cada cual pide por quien tenga a su izquierda."),
  e(47, "escape-room-debrief", "night", false, "Saturday night, an escape room. I’m in charge of the clues, you’re in charge of panic.", "El sábado por la noche, sala de escape. Yo me encargo de las pistas; tú, del pánico."),
  e(48, "karaoke-duet", "unique", false, "One thing we don’t do enough: sing badly. Saturday, private booth.", "Algo que hacemos poco: cantar mal. El sábado, en sala privada."),
  e(49, "skating-and-hot-chocolate", null, false, "Skating on Saturday, then hot chocolate. Wear gloves, you’ll be holding on to me.", "Patinaje el sábado y luego chocolate. Ponte guantes, que vas a ir agarrándote a mí."),
  e(50, "arcade-night", "night", false, "Friday night at the arcade, then food nearby. I’m spending every ticket on you.", "Viernes por la noche en los recreativos y luego algo de cenar cerca. Todos mis tickets, para ti."),
  e(51, "climbing-first-timers", "fun", false, "Climbing on Saturday. Chalky hands, and I promise not to laugh much.", "Escalada el sábado. Manos con magnesio, y prometo no reírme mucho."),
  e(52, "theatre-night", null, true, "Dress up with me on Saturday. Dinner after is my treat.", "Arréglate conmigo el sábado. La cena de después corre de mi cuenta."),
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
  // A title with a colon of its own ("Minigolf: quien pierda…") is set after a full stop, not a second colon.
  const lead = entry.angle ? LETTER_ANGLES[entry.angle][locale] : locale === "es" ? "Este fin de semana" : "This weekend";
  const subject = `${lead}${title.includes(":") ? "." : ":"} ${title}`;
  return { id: idea.id, subject, title, blurb: idea.blurb[locale], ...(fit ? { fit } : {}), about, cost, twist: idea.twist[locale], say: entry.say[locale], gift: Boolean(entry.gift) };
}
