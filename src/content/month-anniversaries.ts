import type { GiftLocale } from "@/lib/gift/schema";
import type { DateKind } from "@/lib/dates/date-kinds";
import { DEMO_PHOTOS, type DemoPhotoId } from "@/templates/_shared/demo-photos";
import type { GiftGuideIdea } from "./gift-guides";

/**
 * The anniversary gifts by month: /gifts/1-month-anniversary to /gifts/24-month-anniversary, one
 * page a month, drawn by the same route as the gift pages by kind (app/…/gifts/[slug]/page.tsx).
 * They answer "3 month anniversary gift", "regalo de 3 meses de novios" and the rest of the series.
 * The page is the gift; the two posts about months (monthiversary-ideas, 6-month-anniversary-ideas)
 * and the first-anniversary post are the day, and each side links to the other: one search, one
 * page (docs/blog/TOPIC-GROUPS.md, rule 5).
 *
 * Every entry is written for its month, none is a sentence with the number swapped: what a couple
 * has usually done by then, what is too much and too little at that point, and which gifts fit.
 * tests/unit/month-anniversaries.test.ts fails two months that open the same way. Each claim about
 * a gift was checked against its schema.ts and Template.tsx (and the checked fact sheet,
 * docs/marketing/growth-build/reports/guides-claims.md) on 24 Nov 2026; every line to borrow is
 * held to its field's limit by lib/gift/field-limit.ts. "Free" is said only of The Letter's short
 * note (lib/gift/free-tier.ts). No price is written here: the page reads it from PRODUCTS.
 */

export type MonthGuide = {
  /** The search result's headline, before " · Ethos". */
  title: string;
  description: string;
  /** The h1: the search phrase. English "<n> month anniversary gifts"; Spanish "Regalos para <n> meses de novios" ("1 mes"). */
  h1: string;
  /** What a link to this month says: "3 months" / "3 meses". */
  label: string;
  /** The two honest sentences beside the phone: one italic line (at most 16 words), one sentence (at most 30). */
  hero: { line: string; sentence: string };
  /** The heading over the cards, at most nine words. */
  ideasTitle: string;
  /** Five or six. The first is the gift in the hero's phone. Same shape as a page by kind's idea. */
  ideas: GiftGuideIdea[];
  /** One date idea for the day, and the kind page of the Dates room it leads to. */
  date: { kind: DateKind; title: string; line: string };
  /** Kept closed under the questions: what a couple has usually done by now, then what is too much and too little. */
  stage: [string, string];
  faq: { q: string; a: string }[];
};

type Month = Record<GiftLocale, MonthGuide>;

// ---------------------------------------------------------------------------------------------
// Month 1
// ---------------------------------------------------------------------------------------------

const month1: Month = {
  en: {
    title: "1 Month Anniversary Gifts That Don’t Say Too Much",
    description: "Gifts for a 1 month anniversary that stay small: a note, a joke or a plan for Friday, made on your phone tonight. One of the six is free.",
    h1: "1 month anniversary gifts",
    label: "1 month",
    hero: {
      line: "Four weeks is early. The gift should know that.",
      sentence: "Each of these is small on purpose: a note, a joke or a plan for Friday, made on your phone and sent as a link.",
    },
    ideasTitle: "Six that stay the right size",
    ideas: [
      {
        template: "text-thread",
        heading: "Your first month, as a chat of two",
        body: "Open with the joke only the two of you get, and the rest follows. Text Thread plays your messages back one bubble at a time, typing dots between them, from two bubbles up to forty. Let the last bubble say the plain thing a text never quite does.",
        line: { field: "lines", where: "The first bubble", text: "ok so it has been a month and I have notes" },
      },
      {
        template: "fortune-cookie",
        heading: "Three fortunes, all about week one",
        body: "A month gives you about four photos, and Fortune Cookie needs none, only three fortunes. A tap opens each cookie, and a slip slides out with your words and a row of lucky numbers. Write the fortunes about things that already happened: the first joke, the wrong turn, the second date.",
        line: { field: "fortunes", where: "One of the fortunes", text: "A month from now you will be glad you said yes to the second date." },
      },
      {
        template: "the-letter",
        heading: "A note under a wax seal",
        body: "The free version of The Letter is a short note: two names and 500 characters at most. A tap breaks the wax and the note writes itself out by hand, over a song if you choose one. One month is about that long: one thing you noticed, one thing you want to do again.",
        line: { field: "freeNote", where: "The whole note", text: "One month. I wasn’t counting, and then I was. I liked the walk home from the ramen place more than the ramen, and I think you know that. No speech and no plans for next year. I’m glad it was you at that table. Same place Thursday?" },
      },
      {
        template: "sticker-bomb",
        heading: "Six labels for the names you already use",
        body: "A month in, you have a couple of nicknames and one running joke. Sticker Bomb gives them an empty page and a pack of stickers to slap down, and under every other sticker comes a strip from a label maker: six strips of 28 characters, in the order you wrote them. Those names fill the strips without trying.",
        line: { field: "labels", where: "One label-maker strip", text: "One month, zero regrets" },
      },
      {
        template: "bouquet",
        heading: "Flowers, with a card that admits it",
        body: "A bouquet says more than a month has earned, unless the card is honest about it. You pick the stems, up to 24, and the note tucked in them holds 30 characters. They see it gather flower by flower. Keep it to five stems and one line, and it turns into a joke with flowers in it.",
        line: { field: "cardNote", where: "On the card in the bouquet", text: "One month in. More, please." },
      },
      {
        template: "scratch-card",
        heading: "A plan for Friday, under foil",
        brief: "A photo under foil, and a headline on the last card for the plan.",
        body: "Scratch Card hides a photo under foil that comes off under a finger, and the last card carries a headline. One photo is enough to make it. Put the plan there, with a day and an hour: at four weeks the best gift is the next date, already decided.",
        line: { field: "finalTitle", where: "The headline on the last card", text: "Friday, 8pm. I’m cooking. Bring nothing." },
      },
    ],
    date: { kind: "fun", title: "The date you talked about and never did", line: "Pick the one thing you both said you should do sometime." },
    stage: [
      "By four weeks there have been a handful of dates, a few photos and one or two jokes nobody else would get. Some people are counting the month and some have not noticed it pass, and both are normal. It is worth finding out which one you are with before the day, because a gift for a month only one of you counted makes for an awkward evening.",
      "Engraving, a year’s worth of photos, the big sentence neither of you has said yet: all of that can wait for a later month. What cannot wait is the day itself, if they have been counting, since letting it pass in silence stings more than a small gift ever could. A note, a joke or a plan is the size of four weeks. Ten minutes plainly spent on them is enough.",
    ],
    faq: [
      { q: "Is one month too soon for an anniversary gift?", a: "Not if it is small. A month is worth marking when both of you are counting it, and a short note or a plan for the next date marks it without making it heavy. Leave the keepsakes for six months." },
      { q: "What do you write after one month together?", a: "One thing you noticed about them and one thing you want to do again. Two or three sentences are plenty. Leave the future out of it unless they brought it up first." },
      { q: "Which of these is free?", a: "The Letter, as a short note of up to 500 characters with a song. Each of the others is a one-time payment for that template, and you can build any of them in the editor before you decide." },
    ],
  },
  es: {
    title: "Regalos para 1 mes de novios sin pasarse",
    description: "Para 1 mes de novios, regalos pequeños: una nota, una broma o el plan del viernes, hechos esta noche desde el móvil. Uno de los seis es gratis.",
    h1: "Regalos para 1 mes de novios",
    label: "1 mes",
    hero: {
      line: "Cuatro semanas es pronto. El regalo tiene que saberlo.",
      sentence: "Todos son pequeños a propósito: una nota, una broma o un plan para el viernes, hechos desde el móvil y enviados en un enlace.",
    },
    ideasTitle: "Seis que no se pasan",
    ideas: [
      {
        template: "text-thread",
        heading: "Vuestro primer mes, como un chat de dos",
        body: "Empieza con la broma que solo entendéis los dos, y lo demás sale solo. Hilo de mensajes reproduce tus mensajes burbuja a burbuja, con los puntitos de «escribiendo» entre una y otra, de dos burbujas a cuarenta. Deja para la última eso tan sencillo que por mensaje nunca acaba de decirse.",
        line: { field: "lines", where: "La primera burbuja", text: "vale, llevamos un mes y tengo apuntes" },
      },
      {
        template: "fortune-cookie",
        heading: "Tres fortunas sobre la primera semana",
        body: "Un primer mes da para pocas fotos, y Galleta de la fortuna no pide ninguna, solo tres fortunas. Un toque abre cada galleta y sale una tira con tus palabras y una fila de números de la suerte. Escribe fortunas sobre lo que ya ha pasado: la primera broma, la calle equivocada, la segunda cita.",
        line: { field: "fortunes", where: "Una de las fortunas", text: "Dentro de un mes seguirás alegrándote de haber dicho que sí a la segunda cita." },
      },
      {
        template: "the-letter",
        heading: "Una nota bajo un sello de lacre",
        body: "La versión gratis de La carta es una nota corta: dos nombres y 500 caracteres como mucho. Un toque rompe el lacre y la nota se escribe sola, a mano, sobre una canción si eliges una. Un mes da para eso: una cosa en la que te has fijado y otra que quieres repetir.",
        line: { field: "freeNote", where: "La nota entera", text: "Un mes. No llevaba la cuenta, y de pronto sí. Me gustó más la vuelta a casa desde el ramen que el propio ramen, y creo que lo sabes. Sin discursos ni planes para el año que viene. Me alegro de que fueras tú en esa mesa. ¿El jueves en el mismo sitio?" },
      },
      {
        template: "sticker-bomb",
        heading: "Seis etiquetas con los motes que ya usáis",
        body: "Al mes ya tenéis un par de motes y una broma que se repite. Bomba de Stickers le da una página vacía y un montón de stickers para pegar, y debajo de uno de cada dos sale una tira de rotuladora: seis tiras de 28 caracteres, en el orden en que las escribiste. Con esos motes se llenan solas.",
        line: { field: "labels", where: "Una tira de rotuladora", text: "Un mes y cero dudas" },
      },
      {
        template: "bouquet",
        heading: "Flores, con una tarjeta que no exagera",
        body: "Un ramo dice más de lo que un mes se ha ganado, salvo que la tarjeta lo reconozca. Eliges los tallos, hasta 24, y la nota que va entre ellos admite 30 caracteres. En su pantalla se va formando flor a flor. Con cinco tallos y una sola frase se lee como una broma con flores dentro.",
        line: { field: "cardNote", where: "En la tarjeta del ramo", text: "Un mes. Quiero muchos más." },
      },
      {
        template: "scratch-card",
        heading: "El plan del viernes, para rascar",
        brief: "Una foto bajo la capa de rascar, y un titular en la última tarjeta para el plan.",
        body: "Rasca y gana esconde una foto bajo una capa que se quita con el dedo, y la última tarjeta lleva un titular. Con una foto basta para hacerlo. Pon ahí el plan, con día y hora: a las cuatro semanas el mejor regalo es la próxima cita, ya decidida.",
        line: { field: "finalTitle", where: "El titular de la última tarjeta", text: "Viernes, 21:00. Cocino yo. No traigas nada." },
      },
    ],
    date: { kind: "fun", title: "La cita que dijisteis y nunca hicisteis", line: "Elegid eso que los dos dijisteis que habría que hacer algún día." },
    stage: [
      "A las cuatro semanas suele haber un puñado de citas, unas cuantas fotos y una o dos bromas que nadie más pillaría. Hay quien cuenta el mes y quien ni se ha dado cuenta de que ha pasado, y las dos cosas son normales. Conviene saber de qué lado está la otra persona antes del día: un regalo por un mes que solo cuenta quien lo hace cae raro.",
      "Lo grabado, un año de fotos y la frase grande que todavía no ha dicho nadie pueden esperar a otro mes. Lo que no puede esperar es el día, si tu pareja lleva la cuenta: dejarlo pasar en silencio duele más que cualquier detalle pequeño. Una nota, una broma o un plan son la talla de cuatro semanas. Si te ha llevado diez minutos y se nota a quién va dirigido, basta.",
    ],
    faq: [
      { q: "¿Un mes es demasiado pronto para un regalo de aniversario?", a: "No, si es pequeño. El primer mesario, como lo llaman en muchos sitios, merece marcarse cuando los dos lo contáis, y una nota corta o el plan de la próxima cita lo marcan sin ponerse serios. Los recuerdos para guardar, a los seis meses." },
      { q: "¿Qué se escribe al cumplir un mes?", a: "Una cosa en la que te has fijado y otra que quieres repetir. Con dos o tres frases sobra. Deja el futuro fuera, salvo que haya salido antes de su boca." },
      { q: "¿Cuál de estos es gratis?", a: "La carta, como nota corta de hasta 500 caracteres con una canción. Cada uno de los demás es un solo pago por esa plantilla, y puedes montar cualquiera en el editor antes de decidirte." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 6
// ---------------------------------------------------------------------------------------------

const month6: Month = {
  en: {
    title: "6 Month Anniversary Gifts for the First Half-Year",
    description: "A 6 month anniversary is the first many people celebrate out loud. Six gifts for the half-year, from six reasons in a jar to a dated road.",
    h1: "6 month anniversary gifts",
    label: "6 months",
    hero: {
      line: "Half a year is the first one most couples mark out loud.",
      sentence: "Six months gives you enough to look back on and not so much that a gift has to sum it all up: pick one thing and do it well.",
    },
    ideasTitle: "Six for the half-year mark",
    ideas: [
      {
        template: "jar-of-reasons",
        heading: "Six reasons, one for every month so far",
        body: "One reason for each month you have had: six folded notes in a glass jar. They shake the phone, or tap the jar, and a note tumbles out and opens. A note can carry a photo, so give each one the picture from its month. Six is the honest number here; the jar holds a hundred, and a hundred at half a year is padding.",
        line: { field: "reasons", where: "One note in the jar", text: "You learned which side of the bed is mine in week two and never asked again." },
      },
      {
        template: "scrapbook",
        heading: "Cut-out letters for six months of pages",
        brief: "Cut-out letters, polaroids that develop, a torn note and up to twelve photos.",
        body: "Scrapbook opens like the real thing: cut-out letters for the title, your photos landing as polaroids that develop, a torn note in handwriting and a typed letter from you. Up to twelve photos fit, two a month. The one you would save from a fire goes on the first page.",
        line: { field: "headline", where: "The cut-out title", text: "half a year of us" },
      },
      {
        template: "vinyl",
        heading: "A record with your half-year on its label",
        brief: "A turntable with your song on it, and a side label that calls this side A.",
        body: "Vinyl puts a turntable on their screen: they drop the needle, the record turns with your song, and the photos wait in a crate as album covers. The side label takes twelve characters. Call the first six months side A. It says what a half-year is without a word about forever.",
        line: { field: "side", where: "The side label", text: "Months 1–6" },
      },
      {
        template: "our-timeline",
        heading: "Six dated stops on one road",
        brief: "A road down the page, one dated photo at each bend, one for each month.",
        body: "Give it one stop for each month: the first date, the first trip, the evening you stopped pretending it was casual. Our Timeline draws a road down the page as they scroll, and pins a photo with its date at every bend. It needs two photos at least and holds twenty.",
        line: { field: "dates", where: "The date on a stop", text: "March 4, the night it rained" },
      },
      {
        template: "midnight-countdown",
        heading: "Count down to the hour you met",
        brief: "A clock under a darkening sky, set to the hour of your first date.",
        body: "Set the zero to the hour of your first date, six months on, rather than to midnight. Midnight Countdown runs a clock down under a darkening sky and, at zero, sets off fireworks and opens your photos and your words. The line that appears with the fireworks is sixty characters: say what the hour was.",
        line: { field: "zeroLine", where: "The line at zero", text: "Six months ago, right about now." },
      },
      {
        template: "the-letter",
        heading: "A long letter, signed the way you sign texts",
        body: "Six months is the first point where a long letter does not feel like too much. The Letter breaks a wax seal and writes your words out in handwriting; the sign-off sits just above your name. Write what changed between month one and month six, then sign it the way you sign your texts to them.",
        line: { field: "signOff", where: "The sign-off", text: "Yours, six months and counting" },
      },
    ],
    date: { kind: "romantic", title: "Dinner, then walk home the long way", line: "Book the table you have been saving for an occasion." },
    stage: [
      "By six months many couples have met each other’s friends and often the parents, have a first trip or a long weekend behind them, and have had the first real disagreement and come through it. Half a year is also when most people start counting out loud, which is why this is the first anniversary that is usually marked.",
      "Jewelry with a date engraved, a vacation booked for next summer, anything that looks like a proposal: those belong further on. A text that could have gone to anyone does not count either. Put the half-year inside the gift, six reasons or six dated photos, and add a plan for the evening.",
    ],
    faq: [
      { q: "Should you celebrate a six-month anniversary?", a: "If both of you are counting, yes, and most people are by now. Keep it to a gift you made and an evening out; the bigger gestures belong to the year." },
      { q: "How many photos do I need for a six-month gift?", a: "Six is enough for the road or the jar, one for each month. The Scrapbook takes up to twelve, and Midnight Countdown needs only one." },
      { q: "What do you write in a six-month anniversary letter?", a: "What you know now that you did not know in month one: how they take their coffee, what they do at the end of a long day, the joke that keeps coming back. Leave promises about next year out of it." },
    ],
  },
  es: {
    title: "Regalos para 6 meses de novios: el primer medio año",
    description: "El medio año es la primera fecha que mucha gente celebra en voz alta. Seis regalos para los 6 meses de novios, de un frasco de razones a un camino.",
    h1: "Regalos para 6 meses de novios",
    label: "6 meses",
    hero: {
      line: "Medio año es el primero que casi todo el mundo celebra en voz alta.",
      sentence: "A los seis meses hay bastante que recordar y no tanto como para que un regalo tenga que resumirlo todo: elige una cosa y hazla bien.",
    },
    ideasTitle: "Seis para el medio año",
    ideas: [
      {
        template: "jar-of-reasons",
        heading: "Seis razones, una por cada mes",
        body: "Una razón por cada mes que lleváis: seis notas dobladas dentro de un frasco de cristal. Se agita el móvil, o se toca el frasco, y una nota cae y se despliega. Cada nota puede llevar una foto, así que ponle la de su mes. Seis es el número sincero; caben cien, pero cien a los seis meses es relleno.",
        line: { field: "reasons", where: "Una nota del frasco", text: "En la segunda semana aprendiste qué lado de la cama es el mío y no volviste a preguntar." },
      },
      {
        template: "scrapbook",
        heading: "Letras recortadas para seis meses de páginas",
        brief: "Letras recortadas, polaroids que se revelan, una nota rasgada y hasta doce fotos.",
        body: "Álbum de recortes se abre como uno de verdad: letras recortadas para el título, tus fotos cayendo como polaroids que se revelan, una nota rasgada escrita a mano y una carta tuya a máquina. Caben hasta doce fotos, dos por mes. La que salvarías de un incendio va en la primera página.",
        line: { field: "headline", where: "El título recortado", text: "nuestro medio año" },
      },
      {
        template: "vinyl",
        heading: "Un disco con vuestro medio año en la etiqueta",
        brief: "Un tocadiscos con vuestra canción y una etiqueta que llama a esto la cara A.",
        body: "Vinilo pone un tocadiscos en su pantalla: se baja la aguja, el disco gira con vuestra canción y las fotos esperan en una caja como portadas. La etiqueta de la cara tiene sitio para doce caracteres. Llama cara A a los seis primeros meses. Dice lo que es medio año sin una sola palabra sobre el para siempre.",
        line: { field: "side", where: "La etiqueta de la cara", text: "Meses 1 a 6" },
      },
      {
        template: "our-timeline",
        heading: "Seis paradas con fecha en un camino",
        brief: "Un camino por la pantalla, una foto con fecha en cada curva, una por mes.",
        body: "Una parada por mes: la primera cita, la primera escapada, la noche en que dejasteis de disimular las ganas. Nuestra línea del tiempo dibuja un camino mientras se desliza la pantalla y clava una foto con su fecha en cada curva. Pide dos fotos como mínimo y admite veinte.",
        line: { field: "dates", where: "La fecha de una parada", text: "4 de marzo, la noche que llovió" },
      },
      {
        template: "midnight-countdown",
        heading: "Cuenta atrás hasta la hora en que os conocisteis",
        brief: "Un reloj bajo un cielo que oscurece, puesto a la hora de vuestra primera cita.",
        body: "Pon el cero a la hora de vuestra primera cita, seis meses después, en lugar de a medianoche. Cuenta atrás de medianoche baja un reloj bajo un cielo que se oscurece y, al llegar a cero, lanza fuegos artificiales y abre tus fotos y tus palabras. La frase que sale con los fuegos da para sesenta caracteres: di qué hora era.",
        line: { field: "zeroLine", where: "La frase del cero", text: "Hace seis meses, más o menos a esta hora." },
      },
      {
        template: "the-letter",
        heading: "Una carta larga, firmada como firmas tus mensajes",
        body: "Medio año es el primer punto en que una carta larga ya no parece demasiado. La carta rompe un sello de lacre y escribe tus palabras a mano; la despedida va justo encima de tu nombre. Escribe lo que ha cambiado entre el primer mes y el sexto, y firma como firmas tus mensajes de siempre.",
        line: { field: "signOff", where: "La despedida", text: "Seis meses después, igual que el primer día" },
      },
    ],
    date: { kind: "romantic", title: "Cena y vuelta a casa dando un rodeo", line: "Reservad la mesa que guardabais para una ocasión." },
    stage: [
      "A los seis meses muchas parejas ya conocen a los amigos de la otra persona y a menudo a la familia, tienen una primera escapada a la espalda y han pasado por el primer desacuerdo de verdad. Medio año es también cuando casi todo el mundo empieza a contar en voz alta, por eso es el primer aniversario que se suele celebrar.",
      "Una joya con la fecha grabada, unas vacaciones reservadas para el verano que viene, cualquier cosa que parezca una pedida: eso queda más adelante. Un mensaje que podría haber ido a cualquiera tampoco cuenta. Mete el medio año dentro del regalo, seis razones o seis fotos con fecha, y añade un plan para la noche.",
    ],
    faq: [
      { q: "¿Se celebran los seis meses de novios?", a: "Si los dos lleváis la cuenta, sí, y a estas alturas casi todo el mundo la lleva. Quédate en un regalo hecho por ti y una noche fuera; los gestos grandes son para el año." },
      { q: "¿Cuántas fotos necesito para un regalo de seis meses?", a: "Seis bastan para el camino o el frasco, una por mes. El Álbum de recortes admite hasta doce, y a Cuenta atrás de medianoche le basta con una." },
      { q: "¿Qué se escribe en una carta de seis meses?", a: "Lo que sabes ahora y no sabías el primer mes: cómo toma el café, qué hace al final de un día largo, la broma que siempre vuelve. Deja fuera las promesas para el año que viene." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 12
// ---------------------------------------------------------------------------------------------

const month12: Month = {
  en: {
    title: "12 Month Anniversary Gifts: Paper, on a Phone",
    description: "A 12 month anniversary is paper by tradition. Six gifts keep the rule on a phone, from a sealed letter to a paper crane, each with a line to borrow.",
    h1: "12 month anniversary gifts",
    label: "12 months",
    hero: {
      line: "One year is the paper anniversary. A phone can still keep the rule.",
      sentence: "A year of photos is finally enough to fill a road, a museum or a front page, and paper is the tradition each of them borrows from.",
    },
    ideasTitle: "A year, on paper and on screen",
    ideas: [
      {
        template: "unwrapped",
        heading: "The year as a row of presents",
        brief: "Presents torn open one by one, each with a number from your year inside.",
        body: "Count small, true things: the coffees, the train times, the blanket. Unwrapped turns your year into numbers, up to eight, all written by you: a row of wrapped presents, each torn open with a tap or a swipe to a figure that counts up, and a gold one at the end that prints the whole year as a receipt.",
        line: { field: "stats", where: "One of the numbers", text: "52 Sundays, 49 of them pancakes" },
      },
      {
        template: "museum",
        heading: "An exhibition called year one",
        brief: "Your year hung in a quiet gallery, a plaque under every photo.",
        body: "A year fits whole: pick twelve photos, one for each month, and title each like a painting. Museum hangs them in a quiet gallery, framed, each over a plaque with the caption you gave it and the dates you set for the whole show, and they swipe from room to room. It takes two to twenty photos. Your message is the wall text the visit ends on.",
        line: { field: "exhibition", where: "The exhibition’s name", text: "Year One: Selected Works" },
      },
      {
        template: "paper-crane",
        heading: "Six folds of paper, a line in each",
        body: "Paper Crane is the paper anniversary taken at its word. A sheet lies on a table; they press and hold each crease and it folds while they hold, and every fold that lands shows one line from you. Six folds, so two months a line. Once it is a crane it flies off and leaves your letter where it stood.",
        line: { field: "lines", where: "The line on one fold", text: "January and February: you learned my bad jokes, I learned your silences." },
      },
      {
        template: "our-timeline",
        heading: "Twelve months of road, then one closing line",
        brief: "A year of photos on a road that draws itself as they scroll.",
        body: "This is the month the road was built for: a year of photos, one at each bend, each with its date. They scroll and the road draws itself under their thumb, past the first date and the first fight to today. The line where it stops takes 80 characters. A clip can go in too, if you have one worth watching twice.",
        line: { field: "ending", where: "The line where the road stops", text: "Year one: done. I would take the same road again, potholes included." },
      },
      {
        template: "the-letter",
        heading: "A letter on paper, which is the point",
        brief: "Paper, a wax seal they break with a tap, and your words appearing by hand.",
        body: "If paper is the rule, The Letter keeps it most literally: paper, a wax seal they break with a tap, and your words appearing by hand as if someone were writing them. Begin with the person they were to you a year ago, close to a stranger, and let the letter walk to now. The first line takes sixty characters.",
        line: { field: "greeting", where: "The first line", text: "To the person who has put up with me for a year:" },
      },
      {
        template: "front-page",
        heading: "A front page with one year of news",
        brief: "Their name on the masthead and your year in the columns, as news.",
        body: "Front Page puts their name on the masthead of a newspaper and your year in its columns: a headline, a lead photo with its caption, your message set as the story, a weather box and classified ads you write. Newsprint counts as paper. Report the year the way a local paper would, straight-faced, down to the small print.",
        line: { field: "headline", where: "The headline", text: "LOCAL COUPLE REACHES ONE YEAR, STILL ARGUES ABOUT THE THERMOSTAT" },
      },
    ],
    date: { kind: "romantic", title: "A boat on the water, one year on", line: "Row out to the middle and tell the year out loud." },
    stage: [
      "A year in, you have been through the four seasons once, met most of the family, and spent at least one vacation together. You know which photos are the good ones and there are enough of them now to tell the year in order. The first anniversary is paper by tradition, the start of a list that runs to gold.",
      "On a phone, paper means a gift made of it: a letter that writes itself out under a seal, a crane that folds and flies, a front page. Leave out the ring that is not a proposal and the list of promises: they claim more than one year can carry. Repeating what you gave at month eleven undersells it. For the day itself, read the anniversary ideas.",
    ],
    faq: [
      { q: "What is the traditional gift for one year together?", a: "Paper. It starts the list of anniversary materials that runs to gold at fifty. On a phone, keep it literal with a letter, a paper crane or a newspaper front page made about the two of you." },
      { q: "Is 12 months the same as the first anniversary?", a: "Yes. Twelve months is the first anniversary, and the one most couples treat as the big one. This page is for the gift; the anniversary pages cover the day and what to do with it." },
      { q: "How many photos do I need for a one-year gift?", a: "A dozen tells the year well, one for each month. Our Timeline and Museum each take up to twenty, and Unwrapped and Paper Crane need none at all." },
    ],
  },
  es: {
    title: "Regalos para 12 meses de novios: el de papel",
    description: "Los 12 meses de novios son las bodas de papel. Seis regalos que cumplen la regla en un móvil, de una carta lacrada a una grulla, con frases listas.",
    h1: "Regalos para 12 meses de novios",
    label: "12 meses",
    hero: {
      line: "Un año son las bodas de papel. Un móvil también puede cumplir la regla.",
      sentence: "Un año de fotos por fin da para llenar un camino, un museo o una portada, y el papel es la tradición de la que tira cada uno.",
    },
    ideasTitle: "Un año, en papel y en pantalla",
    ideas: [
      {
        template: "unwrapped",
        heading: "El año en una fila de regalos",
        brief: "Regalos que se abren uno a uno, con un número de vuestro año dentro.",
        body: "Cuenta cosas pequeñas y ciertas: los cafés, los trenes, la manta. Nuestro año, desenvuelto convierte el año en números, hasta ocho, todos escritos por ti: una fila de regalos envueltos que se abren con un toque o deslizando, cada uno con una cifra que va subiendo, y uno dorado al final que imprime el año entero como un tique.",
        line: { field: "stats", where: "Uno de los números", text: "52 domingos, 49 con tortitas" },
      },
      {
        template: "museum",
        heading: "Una exposición llamada primer año",
        brief: "Vuestro año colgado en una galería tranquila, con una placa bajo cada foto.",
        body: "El año entra entero: elige doce fotos, una por mes, y titula cada una como un cuadro. Museo las cuelga en una galería tranquila, enmarcadas, cada una sobre una placa con el pie que le pusiste y las fechas que elijas para toda la exposición, y se pasa de sala en sala deslizando. Admite de dos a veinte fotos. Tu mensaje es el texto de sala con el que acaba la visita.",
        line: { field: "exhibition", where: "El nombre de la exposición", text: "Primer año: obra escogida" },
      },
      {
        template: "paper-crane",
        heading: "Seis pliegues de papel, una frase en cada uno",
        body: "Grulla de papel es el aniversario de papel tomado al pie de la letra. Una hoja espera sobre la mesa; cada pliegue se dobla mientras se mantiene pulsado, y cada pliegue que sale bien muestra una frase tuya. Son seis pliegues, así que dos meses por frase. Cuando ya es una grulla, echa a volar y deja tu carta donde estaba.",
        line: { field: "lines", where: "La frase de un pliegue", text: "Enero y febrero: aprendiste mis chistes malos y yo tus silencios." },
      },
      {
        template: "our-timeline",
        heading: "Doce meses de camino y una frase para cerrar",
        brief: "Un año de fotos en un camino que se va dibujando al deslizar.",
        body: "Este es el mes para el que se hizo el camino: un año de fotos, una en cada curva, cada una con su fecha. Al deslizar, el camino se dibuja bajo su dedo, desde la primera cita y la primera bronca hasta hoy. La frase donde termina llega a 80 caracteres. Si tienes un vídeo que merezca verse dos veces, también cabe.",
        line: { field: "ending", where: "La frase donde acaba el camino", text: "Primer año: hecho. Volvería a coger el mismo camino, baches incluidos." },
      },
      {
        template: "the-letter",
        heading: "Una carta en papel, que de eso va",
        brief: "Papel, un sello de lacre que se rompe con un toque y tus palabras apareciendo a mano.",
        body: "Si la regla es el papel, La carta la cumple sin rodeos: papel, un sello de lacre que se rompe con un toque y tus palabras apareciendo a mano, como si alguien las escribiera. Empieza por lo que era para ti hace un año, casi alguien desconocido, y deja que la carta camine hasta hoy. La primera línea admite sesenta caracteres.",
        line: { field: "greeting", where: "La primera línea", text: "A quien lleva un año entero aguantándome:" },
      },
      {
        template: "front-page",
        heading: "Una portada con un año de noticias",
        brief: "Su nombre en la cabecera y vuestro año en las columnas, como noticia.",
        body: "Portada pone su nombre en la cabecera de un periódico y vuestro año en las columnas: un titular, una foto principal con su pie, tu mensaje como la noticia, el recuadro del tiempo y los anuncios por palabras que escribas. El papel de periódico también es papel. Cuenta el año como lo contaría un diario local, muy en serio, hasta la letra pequeña.",
        line: { field: "headline", where: "El titular", text: "UNA PAREJA DEL BARRIO CUMPLE UN AÑO Y SIGUE DISCUTIENDO POR LA CALEFACCIÓN" },
      },
    ],
    date: { kind: "romantic", title: "Una barca en el agua, un año después", line: "Remad hasta el centro y contad el año en voz alta." },
    stage: [
      "Al año ya habéis pasado por las cuatro estaciones, conocéis a casi toda la familia y habéis compartido al menos unas vacaciones. Sabes qué fotos son las buenas y por fin hay suficientes para contar el año en orden. El primer aniversario es de papel por tradición, el comienzo de una lista que llega hasta el oro.",
      "En un móvil, el papel es un regalo hecho de papel: una carta que se escribe sola bajo un sello, una grulla que se dobla y echa a volar, una portada. Fuera el anillo que no es una pedida y la lista de promesas: dicen más de lo que aguanta un año. Y repetir lo que regalaste en el mes once se queda corto. Para el día en sí, mira las ideas de aniversario.",
    ],
    faq: [
      { q: "¿Qué se regala por tradición al cumplir un año?", a: "Papel. Es el primero de la lista de materiales de aniversario, que llega al oro a los cincuenta. En un móvil, cúmplelo con una carta, una grulla de papel o la portada de un periódico sobre los dos." },
      { q: "¿Doce meses es lo mismo que el primer aniversario?", a: "Sí. Doce meses son el primer aniversario, y el que casi todas las parejas tratan como el importante. Esta página es para el regalo; las de aniversario cuentan el día y qué hacer con él." },
      { q: "¿Cuántas fotos necesito para el regalo de un año?", a: "Con una docena el año queda bien contado, una por mes. Nuestra línea del tiempo y Museo admiten hasta veinte, y Nuestro año, desenvuelto y Grulla de papel no necesitan ninguna." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 24
// ---------------------------------------------------------------------------------------------

const month24: Month = {
  en: {
    title: "24 Month Anniversary Gifts: Two Years, and Cotton",
    description: "Two years is cotton by tradition, and a phone is not. Six gifts for a 24 month anniversary and what to pair each with, from a toast to a picnic.",
    h1: "24 month anniversary gifts",
    label: "24 months",
    hero: {
      line: "Two years is cotton by tradition. No phone is cotton, so pair it.",
      sentence: "Each gift here does its part on the screen and leaves the cotton to something they can hold: a shirt, a blanket, a tote for the market.",
    },
    ideasTitle: "Six for year two, each with something to hold",
    ideas: [
      {
        template: "the-toast",
        heading: "Raise a glass to two years",
        body: "The Toast lays two glasses and a menu card on linen. The phone is the bottle: tipping it fills both glasses, a single knock touches them together, and then your speech starts. The opening line takes seventy characters: both your names and the thing you still do after two years. Put the cotton present beside the phone when they open it.",
        line: { field: "opening", where: "How the toast opens", text: "To Ana and Marco, two years in and still ordering the same dessert" },
      },
      {
        template: "picnic",
        heading: "A basket of things that are yours now",
        body: "Your words hide in a basket on a gingham blanket in Picnic. One tap opens the lid, and every tap after it lifts out one thing wearing a tag you wrote, three tags at least and eight at most. Two years in, tag what you own together: the mug with the chip, the spare key. Gingham is cotton, which is a start.",
        line: { field: "labels", where: "A tag on one thing", text: "the blanket we never agree on" },
      },
      {
        template: "our-timeline",
        heading: "A road from the first date to your door",
        brief: "Up to twenty dated photos on a road they scroll, two years in order.",
        body: "Two years of photos make a long road, and Our Timeline takes up to twenty of them, each pinned at a bend with its date. They scroll, the road draws, and the years pass in order. By now the end of the road is often an address you share: put it there, or the plan for the next one.",
        line: { field: "ending", where: "The line at the road’s end", text: "Two years, one address, and the long way home every time." },
      },
      {
        template: "music-box",
        heading: "Wind the key on two years",
        body: "Their name goes on the gold plate of Music Box, which sits on a lace-covered vanity. They wind the key three turns, the lid opens, a ballerina or two swans turn to the tune, and your photos come up one at a time in the oval mirror. Pick Brahms’ Lullaby for a calm two years or Swan Lake for a dramatic one. Your letter lifts out as the tune slows.",
        line: { field: "message", where: "The letter in the box", text: "Two years ago you were a name in my phone. Now you are the first one in it." },
      },
      {
        template: "museum",
        heading: "Twenty rooms for two years",
        brief: "A quiet gallery of your two years, a plaque under every framed photo.",
        body: "Museum makes a gallery of your photos, one framed photo to a room, up to twenty rooms. Every plaque prints the caption you wrote for that photo and the span you set for the show. Hang them in order, year one first, and put the month in each caption so the plaques show what changed. They walk it by swiping.",
        line: { field: "exhibition", where: "The name over the door", text: "Twenty-four Months, Mostly Happy" },
      },
      {
        template: "the-letter",
        heading: "Begin the letter where year one ended",
        body: "A wax seal breaks first in The Letter, and then its words write themselves out by hand. Two years is long enough for a letter with chapters: what you knew at one year, what you have learned since. The first line takes sixty characters, and the whole thing goes well beside something cotton, folded, on their pillow.",
        line: { field: "greeting", where: "The first line", text: "To my favorite person, two years running:" },
      },
    ],
    date: { kind: "romantic", title: "A beach, a cotton blanket and the sunset", line: "Take the blanket you gave them and stay until dark." },
    stage: [
      "By two years there is often a shared home or talk of one, a shared calendar and a few friends in common, and each family has been met more than once. The novelty has worn off and something steadier has taken its place, which is the thing worth marking. The jokes have histories now.",
      "The second anniversary is cotton by tradition, and a phone cannot be cotton. So send the gift on the screen and give the cotton by hand: a shirt they will wear, a good blanket, a dish towel from the place you met. Skip the speech about forever, and skip anything that could have gone out at month two.",
    ],
    faq: [
      { q: "What is the traditional gift for a second anniversary?", a: "Cotton. Paper comes first at one year, then cotton at two, for the way it gets softer with use. A digital gift cannot be cotton, so pair it with something that is." },
      { q: "What do you write for a two-year anniversary?", a: "What the second year added that the first did not have: a routine, a fight you settled, a place that is now yours. Then one specific thing you would choose again." },
      { q: "Are two years and 24 months the same anniversary?", a: "Yes. Twenty-four months is the second anniversary, and most couples who were still counting in months stop here. After this the gifts go by the year, on the anniversary page." },
    ],
  },
  es: {
    title: "Regalos para 24 meses de novios: algodón y pantalla",
    description: "Los 24 meses de novios son las bodas de algodón, y un móvil no es de algodón. Seis regalos para ese día y con qué acompañarlos, de un brindis a un pícnic.",
    h1: "Regalos para 24 meses de novios",
    label: "24 meses",
    hero: {
      line: "Dos años son las bodas de algodón. Ningún móvil es de algodón, así que acompáñalo.",
      sentence: "Cada regalo hace su parte en la pantalla y deja el algodón para algo que se pueda tocar: una camiseta, una manta, una bolsa para el mercado.",
    },
    ideasTitle: "Seis para dos años, con algo que tocar",
    ideas: [
      {
        template: "the-toast",
        heading: "Levanta la copa por dos años",
        body: "El brindis coloca dos copas y una carta de menú sobre lino. El móvil hace de botella: al inclinarlo se llenan las copas, un golpe suave las hace chocar y entonces empieza tu discurso. La primera frase tiene sitio para setenta caracteres: vuestros dos nombres y eso que seguís haciendo después de dos años. Deja el regalo de algodón junto al móvil cuando lo abra.",
        line: { field: "opening", where: "Cómo empieza el brindis", text: "Por Ana y Marco, dos años y seguimos pidiendo el mismo postre" },
      },
      {
        template: "picnic",
        heading: "Una cesta con lo que ya es vuestro",
        body: "Tus palabras van en una cesta sobre una manta de cuadros, en Pícnic. Un toque abre la tapa, y cada toque siguiente saca algo con una etiqueta escrita por ti, tres como mínimo y ocho como mucho. A los dos años, etiqueta lo que tenéis en común: la taza desportillada, la llave de repuesto. La manta es de cuadros vichy, que es algodón, que ya es algo.",
        line: { field: "labels", where: "La etiqueta de una cosa", text: "la manta en la que nunca estamos de acuerdo" },
      },
      {
        template: "our-timeline",
        heading: "Un camino desde la primera cita hasta vuestra puerta",
        brief: "Hasta veinte fotos con fecha en un camino que se recorre deslizando: dos años en orden.",
        body: "Dos años de fotos dan para un camino largo, y Nuestra línea del tiempo admite hasta veinte, cada una clavada en una curva con su fecha. Al deslizar, el camino se dibuja y los años pasan en orden. Para entonces el final del camino suele ser una dirección compartida: ponla ahí, o el plan para la siguiente.",
        line: { field: "ending", where: "La frase al final del camino", text: "Dos años, una dirección y seguimos dando un rodeo para volver." },
      },
      {
        template: "music-box",
        heading: "Da cuerda a dos años",
        body: "Su nombre va en la placa dorada de Caja de música, que espera en un tocador con encaje. Con tres vueltas a la llave se abre la tapa, una bailarina o dos cisnes giran con la melodía y tus fotos aparecen una a una en el espejo ovalado. Elige la Canción de cuna de Brahms para dos años tranquilos, o El lago de los cisnes para unos con drama. Tu carta sale cuando la música se apaga.",
        line: { field: "message", where: "La carta de la caja", text: "Hace dos años eras un nombre en mi móvil. Ahora tu nombre es el primero." },
      },
      {
        template: "museum",
        heading: "Veinte salas para dos años",
        brief: "Una galería tranquila con vuestros dos años, una placa bajo cada foto.",
        body: "Museo hace una galería con tus fotos, una foto enmarcada por sala, hasta veinte salas. Cada placa imprime el pie que escribiste para esa foto y las fechas que pongas para toda la exposición. Cuélgalas en orden, primero el primer año, y pon el mes en cada pie para que las placas cuenten qué cambió. Se recorre deslizando.",
        line: { field: "exhibition", where: "El nombre sobre la puerta", text: "Veinticuatro meses, casi todos felices" },
      },
      {
        template: "the-letter",
        heading: "Empieza la carta donde acabó el primer año",
        body: "Se rompe el lacre de La carta y sus palabras se escriben solas, a mano. Dos años dan para una carta con capítulos: lo que sabías al año y lo que has aprendido desde entonces. La primera línea da para sesenta caracteres, y queda bien junto a algo de algodón, doblado sobre su almohada.",
        line: { field: "greeting", where: "La primera línea", text: "A mi persona favorita, dos años seguidos:" },
      },
    ],
    date: { kind: "romantic", title: "Una playa, una manta de algodón y el atardecer", line: "Llevad la manta que le regalaste y quedaos hasta que oscurezca." },
    stage: [
      "A los dos años es habitual compartir casa o estar hablándolo, tener un calendario común y algunos amigos, y conocer a la familia de la otra persona desde hace tiempo. La novedad ya ha pasado y en su lugar hay algo más firme, que es justo lo que merece celebrarse. Las bromas ya tienen historia.",
      "El segundo aniversario es de algodón por tradición, y un móvil no puede ser de algodón. Así que manda el regalo en la pantalla y da el algodón en mano: una camiseta que se vaya a poner, una buena manta, un paño de cocina del sitio donde os conocisteis. Ni un discurso sobre el para siempre ni nada que hubiera valido para el segundo mes.",
    ],
    faq: [
      { q: "¿Qué se regala por tradición en el segundo aniversario?", a: "Algodón. Al año toca papel y a los dos años algodón, por lo que se suaviza con el uso. Un regalo digital no puede ser de algodón, así que acompáñalo de algo que sí lo sea." },
      { q: "¿Qué se escribe al cumplir dos años?", a: "Lo que el segundo año ha añadido al primero: una rutina, una discusión que resolvisteis, un sitio que ahora es vuestro. Y después, una cosa concreta que volverías a elegir." },
      { q: "¿Veinticuatro meses y dos años son el mismo aniversario?", a: "Sí. Veinticuatro meses son el segundo aniversario, y aquí lo dejan casi todas las parejas que aún contaban en meses. A partir de ahora, los regalos van por años, en la página de aniversario." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 2
// ---------------------------------------------------------------------------------------------

const month2: Month = {
  en: {
    title: "2 Month Anniversary Gifts for the In-Joke Stage",
    description: "A 2 month anniversary runs on in-jokes, first photos and one shared song. Five gifts built from those, with nothing heavy in them yet.",
    h1: "2 month anniversary gifts",
    label: "2 months",
    hero: {
      line: "Eight weeks in, you have jokes nobody else gets. Build on those.",
      sentence: "Two months is too early for an album and too late for nothing, so these gifts run on the in-jokes, songs and first photos you already have.",
    },
    ideasTitle: "Five built on what you already share",
    ideas: [
      {
        template: "fortune-cookie",
        heading: "Lucky numbers that are really your dates",
        body: "Every slip in Fortune Cookie ends on a row of lucky numbers, and you choose them. At two months, make them the dates that count: the day you met, the first date, the night it became a thing. Three fortunes are the minimum, so write three small predictions and let the numbers do the remembering.",
        line: { field: "luckyNumbers", where: "The lucky numbers", text: "4, 19, 27, and tonight" },
      },
      {
        template: "picnic",
        heading: "Tags for the snacks you argue about",
        body: "Two months is when you learn someone’s order, and Picnic is where to show it. It is a small gift with a lot of tapping in it: the lid creaks up, and out come strawberries, lemonade and tulips, each with a tag in your words. Tag the food things: the fries they steal, the coffee they ruin with syrup.",
        line: { field: "labels", where: "A tag on the blanket", text: "the fries you said you didn’t want" },
      },
      {
        template: "on-repeat",
        heading: "A playlist named after the song you overplayed",
        brief: "A music player with your photos as tracks and your captions as song titles.",
        body: "On Repeat is a music player under a pink sunset, your photo as the cover and their name as the artist. Each photo becomes a track on the playlist, your caption its title. Two months of songs sent back and forth is exactly what it is for: name the playlist after the one you both played to death.",
        line: { field: "playlist", where: "The playlist’s name", text: "songs you sent at 1am" },
      },
      {
        template: "photo-booth",
        heading: "The first four photos, in a booth strip",
        brief: "Four photos in a booth strip, and your line in pen on the wall beside it.",
        body: "You will have a handful of photos by now, and four is the right number. Photo Booth flashes four times and prints the strip, in color, black and white or sepia, beside a wall of handwritten notes. Your line is written in pen on that wall: one thing you would never say out loud yet.",
        line: { field: "line", where: "The words on the wall", text: "the second date, on repeat in my head" },
      },
      {
        template: "the-letter",
        heading: "Two months, in a letter that starts lightly",
        brief: "A wax seal, then your words appearing stroke by stroke, with a playful greeting.",
        body: "Reading becomes a small ceremony: they tap through a wax seal and The Letter brings your words out stroke by stroke. Keep it short for eight weeks and keep the greeting playful, so the letter comes across as a wink rather than a vow. The greeting holds sixty characters and sets the tone for the rest.",
        line: { field: "greeting", where: "The greeting", text: "To my favorite plus-one of the last two months:" },
      },
    ],
    date: { kind: "cheap", title: "An ice cream walk with no plan", line: "Walk until one of you admits you are lost." },
    stage: [
      "Two months in, the in-jokes have started and so have the photos, though most of them are still of food or of one of you squinting into the sun. You have probably met a friend or two, and you have a song that belongs to the two of you, even if nobody said so.",
      "If they mentioned the date last week, forgetting it is the one real mistake on offer. The rest is a question of scale: an album, a framed print or anything that assumes the next year asks more than eight weeks can carry. Prove you were paying attention instead, with a dated fortune or a tag about their order, and keep the big words for later.",
    ],
    faq: [
      { q: "Do people celebrate two months of dating?", a: "Some do and some laugh at it, and the laughing ones often still like a small gift. Match what they did at one month: if they marked it, mark this one too." },
      { q: "What is a cute gift for two months together?", a: "Something built on a joke you already share: their coffee order on a tag, a song you both overplayed, your dates as lucky numbers. At eight weeks the shared joke is the most valuable thing you own together, so spend it." },
      { q: "How long should a two-month message be?", a: "A few lines. The greeting, two or three sentences about something that happened and a sign-off are plenty for eight weeks, and shorter sounds more sure of itself." },
    ],
  },
  es: {
    title: "Regalos para 2 meses de novios, entre bromas",
    description: "Los 2 meses de novios van de bromas propias, primeras fotos y alguna canción. Cinco regalos hechos con eso, sin nada pesado todavía.",
    h1: "Regalos para 2 meses de novios",
    label: "2 meses",
    hero: {
      line: "Ocho semanas y ya tenéis bromas que nadie más entiende. Tira de ellas.",
      sentence: "Dos meses es pronto para un álbum y tarde para no hacer nada, así que estos regalos tiran de las bromas, las canciones y las primeras fotos.",
    },
    ideasTitle: "Cinco hechos con lo que ya compartís",
    ideas: [
      {
        template: "fortune-cookie",
        heading: "Números de la suerte que son vuestras fechas",
        brief: "Los números de la suerte de cada tira los eliges tú: que sean vuestras fechas.",
        body: "Cada tira de Galleta de la fortuna acaba en una fila de números de la suerte, y los eliges tú. A los dos meses, que sean las fechas que cuentan: el día que os conocisteis, la primera cita, la noche en que la cosa fue en serio. Pide tres fortunas como mínimo, así que escribe tres predicciones pequeñas y deja que los números se acuerden por ti.",
        line: { field: "luckyNumbers", where: "Los números de la suerte", text: "4, 19, 27 y esta noche" },
      },
      {
        template: "picnic",
        heading: "Etiquetas para lo que os discutís al comer",
        body: "Ya te sabes lo que pide en un bar, y Pícnic sirve para demostrarlo. Es un regalo pequeño con mucho toque dentro: la tapa cruje y van saliendo fresas, limonada y tulipanes, cada cosa con una etiqueta escrita por ti. Etiqueta la comida: las patatas que te roba, el café que arruina con sirope.",
        line: { field: "labels", where: "Una etiqueta de la manta", text: "las patatas que dijiste que no querías" },
      },
      {
        template: "on-repeat",
        heading: "Una playlist con el nombre de vuestra canción",
        brief: "Un reproductor con tus fotos como pistas y tus pies de foto como títulos.",
        body: "En bucle es un reproductor bajo un atardecer rosa, con tu foto de portada y su nombre como artista. Cada foto se vuelve una pista de la playlist y tu pie de foto, su título. Dos meses de canciones enviadas de un lado a otro es justo para lo que sirve: ponle a la playlist el nombre de la que habéis gastado de tanto ponerla.",
        line: { field: "playlist", where: "El nombre de la playlist", text: "canciones de madrugada" },
      },
      {
        template: "photo-booth",
        heading: "Las primeras cuatro fotos, en una tira de fotomatón",
        brief: "Cuatro fotos en una tira de fotomatón y tu frase a boli en el muro de al lado.",
        body: "Llegados aquí tendréis un puñado de fotos, y cuatro es la cifra justa. Fotomatón dispara cuatro veces e imprime la tira, en color, en blanco y negro o en sepia, junto a un muro de notas escritas a mano. Tu frase va escrita a boli en ese muro: algo que todavía no dirías en voz alta.",
        line: { field: "line", where: "Las palabras del muro", text: "sigo pensando en la segunda cita" },
      },
      {
        template: "the-letter",
        heading: "Dos meses, en una carta que empieza ligera",
        brief: "Un sello de lacre y tus palabras saliendo trazo a trazo, con un saludo con gracia.",
        body: "Leer se convierte en una pequeña ceremonia: se rompe un sello de lacre y La carta va sacando tus palabras trazo a trazo. Con ocho semanas, que sea corta y que el saludo tenga gracia, para que se lea como un guiño y no como un juramento. El saludo llega a sesenta caracteres y marca el tono de lo demás.",
        line: { field: "greeting", where: "El saludo", text: "Para quien me acompaña desde hace dos meses:" },
      },
    ],
    date: { kind: "cheap", title: "Un paseo con helado y sin plan", line: "Caminad hasta que alguien admita que os habéis perdido." },
    stage: [
      "A los dos meses ya han empezado las bromas propias y las fotos, aunque casi todas son de comida o de alguna cara entornando los ojos al sol. Seguramente ya conoces a alguien de su grupo de amigos, y tenéis una canción que es vuestra, aunque nadie lo haya dicho.",
      "Si lo mencionó la semana pasada, olvidarlo es el único fallo grave que cabe. Lo demás es cuestión de escala: un álbum, una lámina enmarcada o cualquier cosa que dé por hecho el año que viene pide más de lo que aguantan ocho semanas. Mejor demuestra que prestabas atención, con una fortuna con fecha o una etiqueta con lo que pide siempre, y guarda las palabras grandes para más adelante.",
    ],
    faq: [
      { q: "¿Se celebran los dos meses de novios?", a: "Hay quien sí y quien se ríe de ello, y a menudo a quien se ríe también le gusta un detalle pequeño. Haz lo mismo que al mes: si lo celebró, celebra este también." },
      { q: "¿Qué regalo bonito se hace a los dos meses?", a: "Uno hecho con una broma que ya compartís: su café en una etiqueta, una canción que habéis gastado, vuestras fechas como números de la suerte. Con ocho semanas, la broma compartida es lo más valioso que tenéis: gástala." },
      { q: "¿Cómo de largo es un mensaje de dos meses?", a: "Unas líneas. El saludo, dos o tres frases sobre algo que pasó y una despedida bastan para ocho semanas, y lo corto se lee con más seguridad." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 3
// ---------------------------------------------------------------------------------------------

const month3: Month = {
  en: {
    title: "3 Month Anniversary Gifts for When It Became “We”",
    description: "A 3 month anniversary is often when “me” turns into “we”. Five gifts for the dozen photos you now have, each with a line to borrow.",
    h1: "3 month anniversary gifts",
    label: "3 months",
    hero: {
      line: "A season together. Somewhere in it, “I” quietly turned into “we”.",
      sentence: "By now there are a dozen photos worth keeping and friends who know your name, which is enough to make a gift with real pictures in it.",
    },
    ideasTitle: "Five for the first season together",
    ideas: [
      {
        template: "scratch-card",
        heading: "Three photos under foil, one per month",
        brief: "Three photos under foil, one from each month, then a last card with your headline.",
        body: "Scratch Card covers each photo in foil that a fingertip rubs away, and the same few words are printed on the foil of every card. Three photos make four cards: one picture from each month, in order, then a last card with your headline. Keep the foil words to something true of all four, thirty characters at most.",
        line: { field: "foilText", where: "The words on the foil", text: "one season of us, under here" },
      },
      {
        template: "sticker-bomb",
        heading: "One line before the first sticker",
        brief: "A single line on an empty page, then stickers wherever they tap.",
        body: "Before anything happens, Sticker Bomb shows them a single line on an empty page, and then the stickers start landing wherever they tap. That opening line is yours, forty characters at most. Three months in, make it a promise you can keep, then let up to six of your photos drop in as polaroids.",
        line: { field: "prompt", where: "The line on the empty page", text: "I promise: the window seat is yours." },
      },
      {
        template: "vinyl",
        heading: "An album with a title only you two get",
        brief: "An album title only you two would get, and your photos as covers in a crate.",
        body: "Vinyl’s sleeve carries an album title of up to forty characters, and your photos sit in a crate as the covers they flip through. At three months, title the album after the thing you say that nobody else understands. Put your own name where the artist would go. The song turns on the deck as they read.",
        line: { field: "album", where: "The album’s title", text: "Greatest Hits of the Kitchen Floor" },
      },
      {
        template: "digicam",
        heading: "A pocket camera with this season’s roll",
        body: "This season’s roll belongs on a little camera from 2006. They press power, the lens whirs out, and the photos sit on Digicam’s roll with an orange date in the corner. Up to twelve fit, which is four a month for three months. The cut-out title above the camera takes twenty-four characters. Untick “It’s their birthday” first, or the camera wishes them one.",
        line: { field: "headline", where: "The cut-out title", text: "our first season" },
      },
      {
        template: "bouquet",
        heading: "A bouquet in their colors, not red",
        brief: "Their colors instead of red roses, up to 24 stems, and a card of thirty characters.",
        body: "Skip the red roses, since by now you know their color, and build Bouquet from what they would choose: up to 24 stems, arranged and rearranged until it looks right, then gathered on their screen flower by flower. The little card takes thirty characters. Use them for the word you two now use.",
        line: { field: "cardNote", where: "On the card", text: "From us. Weird to write that." },
      },
    ],
    date: { kind: "romantic", title: "Up before the city, with breakfast", line: "Watch the sun come up from somewhere you can both see it." },
    stage: [
      "Three months is a season, and it is often the point where a couple starts saying “we” without noticing. Friends have been met, plans are made in the plural, and somewhere there are a dozen photos that are good enough to keep. The early nerves are mostly gone, and the real habits are starting to show.",
      "A key, a trip that needs vacation days, or meeting the family staged as a present: each asks for more than one season has built. Recycling the message from month one pretends the season never happened. What fits is the photos you now have, a dozen at most, and one sentence that says “we” on purpose.",
    ],
    faq: [
      { q: "Is three months a big deal in a relationship?", a: "It is often the first real checkpoint: the point where it stops being new and starts being yours. It is usually marked quietly, with a small gift and a dinner." },
      { q: "What should I get for three months of dating?", a: "Something with the photos you have taken together, since there are enough of them now: under foil, on a camera roll or as album covers. Keep the cost in time, not money." },
      { q: "How many photos does a three-month gift need?", a: "Three to twelve. Scratch Card needs one at least and works best with one per month; Digicam and Vinyl each take up to twelve; Bouquet and Sticker Bomb need none." },
    ],
  },
  es: {
    title: "Regalos para 3 meses de novios: ya sois «nosotros»",
    description: "Con 3 meses de novios, el «yo» suele volverse «nosotros». Cinco regalos para la docena de fotos que ya tenéis, cada uno con una frase lista.",
    h1: "Regalos para 3 meses de novios",
    label: "3 meses",
    hero: {
      line: "Una estación entera. En algún momento, el «yo» se volvió «nosotros» sin avisar.",
      sentence: "A estas alturas hay una docena de fotos que merecen guardarse y amigos que ya saben tu nombre: basta para un regalo con fotos de verdad.",
    },
    ideasTitle: "Cinco para vuestra primera estación",
    ideas: [
      {
        template: "scratch-card",
        heading: "Tres fotos para rascar, una por mes",
        brief: "Tres fotos bajo la capa de rascar, una de cada mes, y una última tarjeta con tu titular.",
        body: "Rasca y gana tapa cada foto con una capa que se quita con la yema del dedo, y en la capa de todas las tarjetas van impresas las mismas palabras. Tres fotos dan cuatro tarjetas: una foto de cada mes, en orden, y al final una con tu titular. Que las palabras de la capa valgan para las cuatro, treinta caracteres como mucho.",
        line: { field: "foilText", where: "Las palabras de la capa", text: "aquí debajo, una estación" },
      },
      {
        template: "sticker-bomb",
        heading: "Una frase antes del primer sticker",
        brief: "Una sola frase en una página vacía y luego stickers donde toquen.",
        body: "Antes de nada, Bomba de Stickers le enseña una sola frase en una página vacía, y luego los stickers caen donde toque. Esa primera frase es tuya, de cuarenta caracteres como mucho. A los tres meses, que sea una promesa que puedas cumplir, y deja que hasta seis fotos tuyas caigan como polaroids.",
        line: { field: "prompt", where: "La frase de la página vacía", text: "Prometido: la ventanilla es tuya." },
      },
      {
        template: "vinyl",
        heading: "Un álbum con un título solo vuestro",
        brief: "Un título de álbum que solo entendéis los dos y tus fotos como portadas en una caja.",
        body: "La funda de Vinilo lleva un título de álbum de hasta cuarenta caracteres, y tus fotos esperan en una caja como las portadas que van pasando. Titula el álbum con eso que decís y nadie más entiende. Pon tu nombre donde iría el artista. La canción suena en el plato mientras se lee.",
        line: { field: "album", where: "El título del álbum", text: "Grandes éxitos del suelo de la cocina" },
      },
      {
        template: "digicam",
        heading: "Una camarita con el carrete de esta estación",
        body: "El carrete de esta estación cabe en una camarita de 2006. Se pulsa el botón, el objetivo sale zumbando y las fotos aparecen en el carrete de Digicam con una fecha naranja en la esquina. Caben hasta doce, que son cuatro por mes en tres meses. El título recortado de encima admite veinticuatro caracteres. Desmarca antes «Es su cumpleaños», o la cámara felicitará un cumpleaños que no toca.",
        line: { field: "headline", where: "El título recortado", text: "nuestra primera estación" },
      },
      {
        template: "bouquet",
        heading: "Un ramo en sus colores, sin rosas rojas",
        brief: "Sus colores en vez de rosas rojas, hasta 24 tallos y una tarjeta de treinta caracteres.",
        body: "Olvida las rosas rojas: ya sabes qué color le gusta, así que monta Ramo con lo que elegiría: hasta 24 tallos, colocados y recolocados hasta que quede bien, que luego se juntan en su pantalla flor a flor. La tarjetita tiene sitio para treinta caracteres. Úsalos para la palabra que ahora usáis.",
        line: { field: "cardNote", where: "En la tarjeta", text: "De los dos. Qué raro suena" },
      },
    ],
    date: { kind: "romantic", title: "Despertar antes que la ciudad, con desayuno", line: "Ved salir el sol desde algún sitio donde lo veáis los dos." },
    stage: [
      "Tres meses son una estación, y a menudo es cuando una pareja empieza a decir «nosotros» sin darse cuenta. Ya conocéis a los amigos, los planes se hacen en plural y en algún sitio hay una docena de fotos lo bastante buenas para guardarlas. Los nervios del principio casi se han ido y empiezan a verse las costumbres de verdad.",
      "Una llave, un viaje que pida días de vacaciones o presentar a la familia como si fuera un regalo: todo eso pide más de lo que ha construido una estación. Reciclar el mensaje del primer mes es hacer como si la estación no hubiera pasado. Lo que encaja son las fotos que ya tenéis, una docena como mucho, y una frase que diga «nosotros» a propósito.",
    ],
    faq: [
      { q: "¿Los tres meses son importantes en una relación?", a: "Suelen ser el primer punto de control de verdad: cuando deja de ser nuevo y empieza a ser vuestro. Lo normal es celebrarlo sin ruido, con un regalo pequeño y una cena." },
      { q: "¿Qué regalo hago por tres meses de novios?", a: "Algo con las fotos que tenéis de los dos, que ya hay suficientes: bajo una capa para rascar, en el carrete de una cámara o como portadas de discos. Que cueste tiempo, no dinero." },
      { q: "¿Cuántas fotos necesita un regalo de tres meses?", a: "De tres a doce. Rasca y gana pide una como mínimo y queda mejor con una por mes; Digicam y Vinilo admiten hasta doce; Ramo y Bomba de Stickers no necesitan ninguna." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 4
// ---------------------------------------------------------------------------------------------

const month4: Month = {
  en: {
    title: "4 Month Anniversary Gifts Made From the First Trip",
    description: "A 4 month anniversary often follows the first weekend away. Five gifts that turn its photos, its songs and its fights over the map into the present.",
    h1: "4 month anniversary gifts",
    label: "4 months",
    hero: {
      line: "If there was a first weekend away, its photos are the gift.",
      sentence: "Around four months the first short trip often happens, and a camera roll from somewhere else says more than anything you could buy for it.",
    },
    ideasTitle: "Five that start with the weekend away",
    ideas: [
      {
        template: "sticker-bomb",
        heading: "Label strips for what the trip taught you",
        brief: "Six label-maker strips under the stickers, each one a thing the trip taught you.",
        body: "Who wakes first, who cannot read a map, who hogs the window seat: the weekend taught you things, and each can go on a label-maker strip. Sticker Bomb puts one under every other sticker they drop, up to six, in the order you wrote. Pick the Cats with opinions pack, if the strips are blunt.",
        line: { field: "labels", where: "One label-maker strip", text: "certified map reader (not)" },
      },
      {
        template: "the-council",
        heading: "A hearing about who packed the bag",
        body: "The Council is a bench of cats who hold a hearing about the person you send it to. You write the charge, up to sixty characters, and the findings the cats read aloud, and you pick the stamp that ends it. Four months in, the first trip gives you the evidence: the map, the snacks, the alarm.",
        line: { field: "charge", where: "The charge", text: "packing four sweaters for a two-night trip" },
      },
      {
        template: "on-repeat",
        heading: "A handwritten note under the trip’s soundtrack",
        brief: "A collage around your song, every photo a track, and a handwritten note under the player.",
        body: "On Repeat turns into a sticker collage once they press play, with your song on the big player and every photo a track. Under the player sits a note in handwriting, sixty characters long. Put the trip there: the song from the car, and one line about the moment it stopped feeling like a first.",
        line: { field: "note", where: "The handwritten note", text: "This one was on when we missed the exit. Twice." },
      },
      {
        template: "digicam",
        heading: "The weekend away, on a 2006 camera roll",
        brief: "The weekend’s photos on a little camera, date-stamped with the day you left.",
        body: "Load Digicam’s roll in the order the weekend happened, up to twelve photos, and set the orange date stamp to the day you left: one date, on every print. Untick “It’s their birthday” so the camera just says hello. They flick through it like you did on the train home, then the roll prints as a strip, and your letter follows.",
        line: { field: "headline", where: "The cut-out title", text: "48 hours somewhere else" },
      },
      {
        template: "bouquet",
        heading: "Flowers that sum up the trip in a line",
        brief: "Build the bouquet around a flower from the trip, and name the place on the card.",
        body: "If the trip had a flower in it, a field you stopped at or a stand at a farmers market, put that one in the Bouquet you build. You arrange up to 24 stems and they watch it fill in one at a time. The card holds thirty characters, which is room for the place and a date.",
        line: { field: "cardNote", where: "The bouquet’s card", text: "From the market in the rain" },
      },
    ],
    date: { kind: "cheap", title: "A garden afternoon, back from the trip", line: "Look for the flower from the trip, if it grows here." },
    stage: [
      "Around four months a first weekend away is common: a cheap room, a long drive, a city neither of you knew. It is the first time you see how the other one travels, early or late, planned or not, and you come back with photos that are about the two of you rather than the food.",
      "Ignoring the trip, if there was one, wastes the best material you have. Next year’s vacation, booked and wrapped as the present, is a leap four months cannot carry. With no trip yet, use the one you would like to take, as a plan with a date. Either way the gift is the weekend, told back to them.",
    ],
    faq: [
      { q: "What do you do for a four-month anniversary?", a: "Something small that looks back at what you have done together so far, often the first trip, and a plan for an evening. Four months rarely needs more than that." },
      { q: "Is a weekend away too much at four months?", a: "As a plan, no; booking a week abroad as a surprise often is. A short trip you both talked about, with a date on it, sits well at this stage." },
      { q: "What if we have not traveled together yet?", a: "Make the gift about the trip you will take: the camera roll from your best day at home, and the destination on a card or in the charge the cats read out." },
    ],
  },
  es: {
    title: "Regalos para 4 meses de novios: la primera escapada",
    description: "A los 4 meses de novios suele llegar la primera escapada. Cinco regalos hechos con sus fotos, su música y las discusiones con el mapa.",
    h1: "Regalos para 4 meses de novios",
    label: "4 meses",
    hero: {
      line: "Si hubo una primera escapada, sus fotos son el regalo.",
      sentence: "Hacia los cuatro meses suele llegar el primer viaje corto, y un carrete de otro sitio dice más que cualquier cosa que puedas comprar.",
    },
    ideasTitle: "Cinco que empiezan por la escapada",
    ideas: [
      {
        template: "sticker-bomb",
        heading: "Tiras de rotuladora con lo que enseñó el viaje",
        brief: "Seis tiras de rotuladora bajo los stickers, cada una algo que os enseñó el viaje.",
        body: "Quién se despierta antes, quién no sabe leer un mapa, quién se queda la ventanilla: el fin de semana os enseñó cosas, y cada una cabe en una tira de rotuladora. Bomba de Stickers pone una bajo uno de cada dos stickers, hasta seis, en el orden en que las escribiste. Elige el pack Gatos con opiniones si las tiras son directas.",
        line: { field: "labels", where: "Una tira de rotuladora", text: "lee mapas (no es verdad)" },
      },
      {
        template: "the-council",
        heading: "Un juicio sobre quién hizo la maleta",
        body: "El Consejo es un tribunal de gatos que juzga a la persona a quien se lo envías. Tú escribes la acusación, de hasta sesenta caracteres, y las conclusiones que leen los gatos, y eliges el sello que lo cierra. A los cuatro meses, el primer viaje pone las pruebas: el mapa, los snacks, el despertador.",
        line: { field: "charge", where: "El cargo", text: "llevar cuatro jerséis para dos noches fuera" },
      },
      {
        template: "on-repeat",
        heading: "Una nota a mano bajo la música del viaje",
        brief: "Un collage alrededor de vuestra canción, cada foto una pista y una nota a mano bajo el reproductor.",
        body: "En bucle se convierte en un collage de stickers cuando se le da al play, con vuestra canción en el reproductor grande y cada foto como una pista. Bajo el reproductor va una nota escrita a mano, de sesenta caracteres. Pon ahí el viaje: la canción del coche y una frase sobre el momento en que dejó de parecer la primera vez.",
        line: { field: "note", where: "La nota a mano", text: "Sonaba esta cuando nos pasamos la salida. Dos veces." },
      },
      {
        template: "digicam",
        heading: "La escapada, en una camarita de 2006",
        brief: "Las fotos del fin de semana en una camarita, con la fecha del día en que salisteis.",
        body: "Carga el carrete de Digicam en el orden en que pasó el fin de semana, hasta doce fotos, y pon en la fecha naranja el día en que salisteis: una sola fecha, en todas las copias. Desmarca «Es su cumpleaños» para que la cámara solo salude. Se pasan las fotos como en el tren de vuelta, el carrete se imprime en tira y después llega tu carta.",
        line: { field: "headline", where: "El título recortado", text: "48 horas en otro sitio" },
      },
      {
        template: "bouquet",
        heading: "Flores que resumen el viaje en una frase",
        brief: "Monta el ramo alrededor de una flor del viaje y pon el sitio en la tarjeta.",
        body: "Si el viaje tuvo una flor, un campo donde parasteis o un puesto del mercado, pon esa en el Ramo que montes. Colocas hasta 24 tallos y en su pantalla se va llenando de uno en uno. La tarjeta da para treinta caracteres, sitio de sobra para el lugar y una fecha.",
        line: { field: "cardNote", where: "La tarjeta del ramo", text: "Del mercado, bajo la lluvia" },
      },
    ],
    date: { kind: "cheap", title: "Una tarde en un jardín, ya de vuelta", line: "Buscad la flor del viaje, si crece por aquí." },
    stage: [
      "Hacia los cuatro meses es habitual la primera escapada de fin de semana: una habitación barata, un viaje largo en coche, una ciudad nueva para los dos. Es la primera vez que ves cómo viaja la otra persona, pronto o tarde, con plan o sin él, y volvéis con fotos que van de vosotros y no de la comida.",
      "Hacer como si el viaje no hubiera pasado, si lo hubo, es desperdiciar el mejor material que tienes. Regalar ya reservadas las vacaciones del año que viene es un salto que cuatro meses no sostienen. Si todavía no habéis viajado, usa el viaje que os gustaría hacer, como un plan con fecha. En los dos casos, el regalo es el fin de semana contado de vuelta.",
    ],
    faq: [
      { q: "¿Qué se hace por los cuatro meses de novios?", a: "Algo pequeño que mire atrás a lo que habéis hecho los dos, a menudo el primer viaje, y un plan para una noche. A los cuatro meses rara vez hace falta más." },
      { q: "¿Una escapada es demasiado a los cuatro meses?", a: "Como plan, no; reservar una semana fuera por sorpresa a menudo sí. Un viaje corto del que ya habéis hablado, con fecha, encaja bien en esta etapa." },
      { q: "¿Y si todavía no hemos hecho ningún viaje?", a: "Haz el regalo sobre el viaje que haréis: el carrete de vuestro mejor día en casa, y el destino en una tarjeta o en la acusación que leen los gatos." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 5
// ---------------------------------------------------------------------------------------------

const month5: Month = {
  en: {
    title: "5 Month Anniversary Gifts for the Quiet Month",
    description: "A 5 month anniversary is the quiet one before the half-year. Five small digital gifts that mark it lightly and leave the big idea for month six.",
    h1: "5 month anniversary gifts",
    label: "5 months",
    hero: {
      line: "The month before the half-year. Mark it lightly and save the big idea.",
      sentence: "Five months rarely gets a party, which is exactly why a small, warm gift gets noticed, as long as it does not use up what you planned for six.",
    },
    ideasTitle: "Five small ones, nothing borrowed from six",
    ideas: [
      {
        template: "photo-booth",
        heading: "A lit sign over the booth",
        brief: "A lit sign over a photo booth, and four everyday photos printed as a strip.",
        body: "Five months is a fine excuse for a sign that says nothing grand. Photo Booth lights one over the booth, twenty-four characters on two lines if you use the dot, and below it four flashes print a strip. The photos can come from any unremarkable day, which is the point of this month.",
        line: { field: "sign", where: "The sign on top", text: "FIVE MONTHS · NO NOTES" },
      },
      {
        template: "favorite-person",
        heading: "A torn note that names them, plainly",
        brief: "Polaroids under gingham tape, and a torn note naming who they are to you.",
        body: "Favorite Person is a page of polaroids held with gingham tape, flowers at the foot, and a torn note in the middle that says who they are to you. The note holds twenty-two characters, so choose the word carefully. Start with the oldest photo you have and let the letter at the bottom thank them for one day.",
        line: { field: "title", where: "The torn note", text: "my favorite habit" },
      },
      {
        template: "paper-crane",
        heading: "Five folds, one for each month so far",
        brief: "Each crease is held until it folds, and every fold that holds shows one line.",
        body: "Paper Crane asks for patience: they hold each crease until it folds, and if they let go too soon the paper springs back. Every fold that holds shows one of your lines, up to six. Write five, one per month, short enough to read at a glance. The finished crane flies off and your letter stays.",
        line: { field: "lines", where: "The line on one fold", text: "Month five: you still laugh at the joke from month one." },
      },
      {
        template: "kawaii",
        heading: "A plushie who says it for you",
        brief: "A bunny, a bear or a kitten says your line, and photos stick on like stickers.",
        body: "In a quiet month, cute is allowed to do the talking. Kawaii puts a bunny, a bear or a kitten on the screen to say your line, up to sixty characters, while a ribbon banner holds twenty-four more. Photos go up like stickers, eight at most. Let the plushie say the soft thing you would mumble.",
        line: { field: "greeting", where: "What the plushie says", text: "Five months and you steal the blanket every single night." },
      },
      {
        template: "text-thread",
        heading: "A chat that plays back a Tuesday evening",
        brief: "Your messages played back bubble by bubble, rebuilt from a plain weeknight.",
        body: "For month five, rebuild a plain weeknight exchange: what to eat, who is closer, the photo of the dog. Text Thread replays it bubble by bubble, with the dots that mean someone is typing, from two bubbles up to forty. The last bubble is the one you would never type on a Tuesday.",
        line: { field: "lines", where: "The last bubble", text: "anyway. five months. I like the Tuesdays most." },
      },
    ],
    date: { kind: "rainy-day", title: "A film and a late dessert in the rain", line: "Pick the film by coin toss and the dessert by vote." },
    stage: [
      "Five months is the quiet stretch before the half-year. Routines have formed, some evenings are ordinary on purpose, and you have both stopped performing for each other a little. It is a good sign and an easy month to let pass, which is why a small gift comes across as attention rather than as an event.",
      "Spending the idea you saved for six is the risk this month, along with any gift that asks for a big answer. Skipping the day entirely is the opposite risk, if you marked one and two. Keep it light and specific, a plushie with a line or a replayed chat, and hold the jar, the road and the album for next month.",
    ],
    faq: [
      { q: "Should I get something for five months?", a: "If you have marked the months so far, a small gift keeps the habit going. If you have not, a sweet message is enough and saves the effort for the half-year." },
      { q: "What is a good five-month message?", a: "Something about the weekdays, since that is what this month is made of: the Tuesday dinners, the shared playlist, the walk home. Keep it to a few lines." },
      { q: "Should I save the bigger gift for six months?", a: "Yes. Six months is the one most people mark, so keep the jar of reasons, the dated road or the scrapbook for then, and keep this month small and funny." },
    ],
  },
  es: {
    title: "Regalos para 5 meses de novios, el mes tranquilo",
    description: "Los 5 meses de novios son el mes tranquilo antes del medio año. Cinco regalos digitales pequeños que lo marcan sin gastar la gran idea del sexto.",
    h1: "Regalos para 5 meses de novios",
    label: "5 meses",
    hero: {
      line: "El mes antes del medio año. Márcalo sin ruido y guarda la gran idea.",
      sentence: "Los cinco meses casi nunca tienen fiesta, y por eso un regalo pequeño y cálido llega bien, siempre que no gaste lo que tenías pensado para los seis.",
    },
    ideasTitle: "Cinco pequeños, sin quitarle nada al sexto",
    ideas: [
      {
        template: "photo-booth",
        heading: "Un letrero encendido sobre el fotomatón",
        brief: "Un letrero encendido sobre un fotomatón y cuatro fotos normales impresas en tira.",
        body: "Cinco meses son buena excusa para un letrero que no dice nada solemne. Fotomatón enciende uno sobre la cabina, veinticuatro caracteres en dos líneas si usas el punto, y debajo cuatro flashes imprimen una tira. Las fotos pueden ser de cualquier día normal, que es de lo que va este mes.",
        line: { field: "sign", where: "El letrero", text: "CINCO MESES · SIN MÁS" },
      },
      {
        template: "favorite-person",
        heading: "Una nota rasgada que dice quién es",
        brief: "Polaroids con cinta de cuadros y una nota rasgada que dice quién es para ti.",
        body: "Mi persona favorita es una página de polaroids sujetas con cinta de cuadros, flores al pie y una nota rasgada en el centro que dice quién es para ti. La nota llega a veintidós caracteres, así que elige bien la palabra. Empieza por la foto más antigua que tengas y deja que la carta de abajo le dé las gracias por un día.",
        line: { field: "title", where: "La nota rasgada", text: "mi costumbre favorita" },
      },
      {
        template: "paper-crane",
        heading: "Cinco pliegues, uno por cada mes",
        brief: "Cada pliegue se mantiene pulsado hasta que se dobla, y cada uno muestra una frase.",
        body: "Grulla de papel pide paciencia: hay que mantener pulsado cada pliegue hasta que se dobla, y si se suelta antes de tiempo el papel se abre. Cada pliegue que sale muestra una de tus frases, hasta seis. Escribe cinco, una por mes, cortas para leerlas de un vistazo. La grulla terminada sale volando y tu carta se queda.",
        line: { field: "lines", where: "La frase de un pliegue", text: "Mes cinco: sigues riéndote del chiste del primer mes." },
      },
      {
        template: "kawaii",
        heading: "Un peluche que lo dice por ti",
        brief: "Un conejito, un oso o un gatito dice tu frase y las fotos se pegan como stickers.",
        body: "En un mes tranquilo, lo mono puede hablar por ti. Kawaii pone en pantalla un conejito, un oso o un gatito que dice tu frase, de hasta sesenta caracteres, mientras una cinta lleva veinticuatro más. Las fotos se pegan como stickers, ocho como mucho. Deja que el peluche diga eso tierno que tú dirías en voz baja.",
        line: { field: "greeting", where: "Lo que dice el peluche", text: "Cinco meses y me sigues robando la manta." },
      },
      {
        template: "text-thread",
        heading: "Un chat que repite una noche cualquiera",
        brief: "Vuestros mensajes, burbuja a burbuja, sacados de una noche normal entre semana.",
        body: "Para el quinto mes, reconstruye un intercambio normal de entre semana: qué cenamos, quién está más cerca, la foto del perro. Hilo de mensajes lo repite burbuja a burbuja, con los puntos de quien está escribiendo, de dos burbujas a cuarenta. La última burbuja es la que nunca escribirías un martes.",
        line: { field: "lines", where: "La última burbuja", text: "en fin. cinco meses. los martes son lo que más me gusta." },
      },
    ],
    date: { kind: "rainy-day", title: "Una peli y un postre tardío, con lluvia", line: "Elegid la peli a cara o cruz y el postre a votación." },
    stage: [
      "Cinco meses es el tramo tranquilo antes del medio año. Ya hay rutinas, algunas noches son normales a propósito y ya no hay tanta actuación delante de la otra persona. Es buena señal y un mes fácil de dejar pasar, por eso un detalle pequeño parece atención y no acontecimiento.",
      "Gastar ahora la idea que guardabas para los seis es el riesgo de este mes, igual que un regalo que pida una respuesta grande. El riesgo contrario es no hacer nada, si celebraste el primero y el segundo. Que sea ligero y concreto, un peluche con una frase o un chat repetido, y guarda el frasco, el camino o el álbum para el mes que viene.",
    ],
    faq: [
      { q: "¿Hay que regalar algo por los cinco meses?", a: "Si habéis celebrado los meses hasta ahora, un detalle pequeño mantiene la costumbre. Si no, basta con un mensaje bonito, y el esfuerzo se guarda para el medio año." },
      { q: "¿Qué mensaje se escribe a los cinco meses?", a: "Algo sobre los días normales, que es de lo que está hecho este mes: las cenas de los martes, la playlist compartida, la vuelta a casa. Que sean unas pocas líneas." },
      { q: "¿Guardo el regalo grande para los seis meses?", a: "Sí. Los seis meses son los que casi todo el mundo celebra, así que guarda para entonces el frasco de razones, el camino con fechas o el álbum, y que este mes sea pequeño y divertido." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 7
// ---------------------------------------------------------------------------------------------

const month7: Month = {
  en: {
    title: "7 Month Anniversary Gifts for a Month Nobody Expects",
    description: "Nobody plans anything for a 7 month anniversary, which makes it the best month for a surprise. Five digital gifts that arrive out of nowhere.",
    h1: "7 month anniversary gifts",
    label: "7 months",
    hero: {
      line: "Nobody expects anything at seven months. That is your advantage.",
      sentence: "Seven has no tradition and no pressure attached, so a gift that turns up on a random weekday comes across as pure attention, not as duty.",
    },
    ideasTitle: "Five that arrive out of nowhere",
    ideas: [
      {
        template: "bouquet",
        heading: "Flowers on a Wednesday, for no stated reason",
        body: "Seven months is the moment for flowers nobody asked for. Bouquet lets you pick each stem, up to 24, shuffle the arrangement and write a card of thirty characters; on their screen the flowers arrive one at a time. Send it midweek, mid-afternoon, with the card pretending it is nothing.",
        line: { field: "cardNote", where: "The card in the flowers", text: "No reason. Fine, seven months." },
      },
      {
        template: "coquette",
        heading: "A postcard tucked under the first photo",
        brief: "Polaroids down a long page, a handwritten postcard under the first, your letter at the bottom.",
        body: "Coquette is a long page of polaroids, up to ten, with a handwritten postcard under the first one and your letter waiting at the very bottom on torn paper. The postcard takes ninety characters. Use it for one small thing you still do because of them, seven months on.",
        line: { field: "note", where: "The postcard", text: "I still take the long way past the bakery, because you said it smelled like Sundays." },
      },
      {
        template: "text-thread",
        heading: "A message thread that arrives unannounced",
        body: "Text Thread works best when nothing announced it. Your chat replays itself on their screen, dots and all, two to forty bubbles long, with photos dropping in like attachments. At seven months, open with something mundane, a grocery question, and let it turn halfway down into the thing you meant to say.",
        line: { field: "lines", where: "The opening bubble", text: "do we need eggs. also unrelated, seven months today" },
      },
      {
        template: "scratch-card",
        heading: "A surprise plan under the last card",
        brief: "Photos under foil, card after card, and the news in a headline on the last one.",
        body: "This is the gift for news: photos under foil, one card after another, and a headline that waits on the last. Seven months is a good month to put a small surprise there, a booked table or a Saturday you have cleared. Give it a day and a time so the plan sounds settled.",
        line: { field: "finalTitle", where: "The last card’s headline", text: "Saturday is cleared. Wear shoes you can walk in." },
      },
      {
        template: "on-repeat",
        heading: "A song for an ordinary month",
        body: "Press play on On Repeat and the screen fills into a collage: your song on the big player, your photos as the tracks, a bow, a heart paperclip on a handwritten note. That note holds sixty characters. Seven months in, write what this song is to you now that it is no longer new.",
        line: { field: "note", where: "The note under the player", text: "Our song, and we skip the intro every time." },
      },
    ],
    date: { kind: "cheap", title: "A golden-hour picnic with nothing to celebrate", line: "Bring two things to eat and one thing to say." },
    stage: [
      "At seven months the relationship is past the early checkpoints and not yet near the year. The calendar has nothing on it, nobody is counting out loud, and the days have settled into a rhythm that is comfortable, maybe a little too comfortable. That is the reason to mark it: quietly, without warning.",
      "Watch for two traps. One is a gift so large it starts a habit of monthly presents you cannot keep; the other is a gift that admits it was a reminder on your phone. The right one turns up midweek, says plainly that it is seven months, and asks for nothing back.",
    ],
    faq: [
      { q: "Do you celebrate seven months?", a: "Few couples do, which is what makes a small gift at seven months feel like a surprise rather than an obligation. A message and one plan are enough." },
      { q: "What is a good surprise for seven months together?", a: "Something that arrives without an occasion: flowers on a weekday, a chat that begins with groceries, or a cleared Saturday revealed under foil. The surprise is the timing." },
      { q: "Is it weird to mark every month?", a: "Only if it starts to feel like homework. Some couples stop counting each month after six, so mark seven only if you both still enjoy it." },
    ],
  },
  es: {
    title: "Regalos para 7 meses de novios que nadie espera",
    description: "Nadie prepara nada para los 7 meses de novios, y por eso es el mejor mes para una sorpresa. Cinco regalos digitales que llegan sin avisar.",
    h1: "Regalos para 7 meses de novios",
    label: "7 meses",
    hero: {
      line: "Nadie espera nada a los siete meses. Esa es tu ventaja.",
      sentence: "El siete no tiene tradición ni presión, así que un regalo que aparece un día cualquiera entre semana es pura atención, sin obligación.",
    },
    ideasTitle: "Cinco que llegan sin avisar",
    ideas: [
      {
        template: "bouquet",
        heading: "Flores un miércoles, sin motivo declarado",
        body: "Los siete meses son el momento de unas flores que nadie ha pedido. Ramo te deja elegir cada tallo, hasta 24, mezclar la composición y escribir una tarjeta de treinta caracteres; en su pantalla las flores llegan de una en una. Mándalo entre semana, a media tarde, con una tarjeta que finja que no es nada.",
        line: { field: "cardNote", where: "La tarjeta de las flores", text: "Sin motivo. Vale, siete meses" },
      },
      {
        template: "coquette",
        heading: "Una postal bajo la primera foto",
        brief: "Polaroids por una página larga, una postal a mano bajo la primera y tu carta al final.",
        body: "Coquette es una página larga de polaroids, hasta diez, con una postal escrita a mano bajo la primera y tu carta esperando abajo del todo en papel rasgado. La postal admite noventa caracteres. Úsala para algo pequeño que sigues haciendo porque te lo pegó, siete meses después.",
        line: { field: "note", where: "La postal", text: "Sigo pasando por la panadería porque dijiste que olía a domingo." },
      },
      {
        template: "text-thread",
        heading: "Un hilo de mensajes que llega sin avisar",
        body: "Hilo de mensajes funciona mejor cuando nada lo anuncia. Vuestro chat se repite en su pantalla, con sus puntitos, de dos a cuarenta burbujas, y las fotos caen como adjuntos. A los siete meses, empieza por algo trivial, una pregunta de la compra, y deja que a mitad de camino se convierta en lo que querías decir.",
        line: { field: "lines", where: "La primera burbuja", text: "¿hace falta comprar huevos? por cierto, hoy son siete meses" },
      },
      {
        template: "scratch-card",
        heading: "Un plan sorpresa bajo la última tarjeta",
        brief: "Fotos bajo la capa, tarjeta tras tarjeta, y la noticia en el titular de la última.",
        body: "Este es el regalo de las noticias: fotos bajo la capa, una tarjeta tras otra y un titular esperando en la última. Siete meses es buen mes para poner ahí una sorpresa pequeña, una mesa reservada o un sábado que has dejado libre. Ponle día y hora para que se lea como algo decidido.",
        line: { field: "finalTitle", where: "El titular de la última tarjeta", text: "El sábado está libre. Ponte calzado cómodo." },
      },
      {
        template: "on-repeat",
        heading: "Una canción para un mes normal",
        body: "Al darle al play en En bucle, la pantalla se llena de collage: vuestra canción en el reproductor grande, tus fotos como pistas, un lazo y un sujetapapeles de corazón sobre una nota a mano. Esa nota tiene sitio para sesenta caracteres. Siete meses después, escribe qué es para ti esa canción ahora que ya no es nueva.",
        line: { field: "note", where: "La nota bajo el reproductor", text: "Sigue siendo la nuestra. Y seguimos saltando la intro." },
      },
    ],
    date: { kind: "cheap", title: "Un pícnic al atardecer sin nada que celebrar", line: "Llevad dos cosas para comer y una cosa que decir." },
    stage: [
      "A los siete meses la relación ha pasado los primeros controles y todavía no se acerca al año. El calendario no marca nada, nadie cuenta en voz alta y los días han cogido un ritmo cómodo, quizá demasiado. Por eso merece la pena marcarlo: sin ruido y sin avisar.",
      "Hay dos trampas. Una, un regalo tan grande que empiece una costumbre de regalos mensuales que no podrás mantener; otra, un regalo que confiesa que era un aviso del móvil. El bueno aparece entre semana, dice claramente que son siete meses y no pide nada a cambio.",
    ],
    faq: [
      { q: "¿Se celebran los siete meses?", a: "Pocas parejas lo hacen, y por eso un detalle a los siete meses se siente como sorpresa y no como obligación. Bastan un mensaje y un plan." },
      { q: "¿Qué sorpresa se puede dar a los siete meses?", a: "Algo que llegue sin ocasión: flores un día laborable, un chat que empieza por la compra o un sábado libre que aparece al rascar. La sorpresa está en el momento." },
      { q: "¿Es raro celebrar todos los meses?", a: "Solo si empieza a parecer deberes. Hay parejas que dejan de contar cada mes después del sexto, así que celebra el séptimo solo si a los dos os sigue gustando." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 8
// ---------------------------------------------------------------------------------------------

const month8: Month = {
  en: {
    title: "8 Month Anniversary Gifts That Know Their Taste",
    description: "By an 8 month anniversary you know their music and their order by heart. Five gifts that put that knowledge to work, each with a line you can borrow.",
    h1: "8 month anniversary gifts",
    label: "8 months",
    hero: {
      line: "You know their order and their playlist by now. Use both.",
      sentence: "At eight months a gift can be specific without guessing: the exact song, the exact snack, the word they overuse, all things you have learned by watching.",
    },
    ideasTitle: "Five made from what you have learned",
    ideas: [
      {
        template: "on-repeat",
        heading: "A playlist of the songs they actually play",
        brief: "Photos as tracks, captions as titles, named after the songs they really play.",
        body: "You know what they put on when they cook and what they skip, so On Repeat can be precise. Each photo becomes a track with your caption as its title, and their name sits where the artist goes. Name the playlist, in twenty-four characters, after the habit: the shower songs, the Sunday ones.",
        line: { field: "playlist", where: "The playlist’s name", text: "songs you cook to" },
      },
      {
        template: "fortune-cookie",
        heading: "Fortunes that predict their usual order",
        brief: "Cookies crack open to fortunes that predict, with total confidence, what they always order.",
        body: "Eight months of watching them order makes this one easy. Each cookie cracks open on a tap and a slip slides out, three fortunes at least and twenty at most, with a photo on some. Predict, with total confidence, the thing they always choose. The last cookie carries your message, which can be less of a joke.",
        line: { field: "fortunes", where: "One of the fortunes", text: "You will order the same pasta and say you meant to try something new." },
      },
      {
        template: "keepsake",
        heading: "One word, torn out of a book they love",
        brief: "A sealed parcel of kept things, among them one word torn out of a book.",
        body: "Keepsake arrives as a parcel under a wax seal, and inside are kept things: your first photo under dried flowers, a ticket with a number, a gold locket, and one word torn from a book. By eight months you know which book. The word slot takes fourteen characters, so pick the one they would underline.",
        line: { field: "word", where: "The torn-out word", text: "stay" },
      },
      {
        template: "digicam",
        heading: "Eight months of dinners on one camera",
        brief: "Your shared meals on a little camera roll, each photo captioned with the dish.",
        body: "Fill Digicam with the meals you have shared, up to twelve photos, and write the dish in each caption in the screen’s pixel type. Untick “It’s their birthday”, or the camera greets them with one. They flick through it with arrows or a swipe. Over the camera, the magazine cut-out title takes twenty-four characters: the name of your usual place.",
        line: { field: "headline", where: "The cut-out title", text: "Tuesdays at Rosa’s" },
      },
      {
        template: "picnic",
        heading: "A picnic of their actual favorites",
        brief: "A gingham basket unpacked item by item, each with a tag about a favorite.",
        body: "Be exact here: the cheese they buy for themselves, the drink they order twice. Picnic lets you unpack a gingham basket item by item with a tag on each, three to eight tags, and your letter is the folded note underneath. Write the tags as if you were handing each one over.",
        line: { field: "labels", where: "A tag on one thing", text: "the cheese you hide from guests" },
      },
    ],
    date: { kind: "rainy-day", title: "A bookstore, then coffee, and a book each", line: "Choose a book for each other and swap them over coffee." },
    stage: [
      "By eight months you have watched them order, cook, shop and choose music enough times to know the patterns. By now there is probably a usual place, a drawer or a toothbrush at one another’s home, and a few routines that started as accidents. The guessing stage is over, and gifts can show it.",
      "A generic gift that would suit anyone their age is the miss here, and so is something expensive from a list they never wrote. The right one is narrow on purpose, the exact song or snack or word, so that it could only ever have been for them.",
    ],
    faq: [
      { q: "What do you get someone for eight months together?", a: "Something that shows what you have learned about them: their real playlist, the dish they always order, a word from a book they love. Each took months of watching to learn, which is what makes it worth giving." },
      { q: "Is eight months an anniversary people mark?", a: "Not usually with anything big. It is a good month for a small, precise gift, since you know their taste by now and the year is still a while away." },
      { q: "How do I make a gift feel personal at eight months?", a: "Use details only you would know: the order, the song in the shower, the cheese they hide. Name the cheese, not the fact that they like cheese." },
    ],
  },
  es: {
    title: "Regalos para 8 meses de novios que aciertan",
    description: "A los 8 meses de novios te sabes su música y lo que pide de memoria. Cinco regalos que usan lo que has aprendido, cada uno con una frase lista.",
    h1: "Regalos para 8 meses de novios",
    label: "8 meses",
    hero: {
      line: "Ya te sabes lo que pide y lo que escucha. Usa las dos cosas.",
      sentence: "A los ocho meses un regalo puede ser concreto sin adivinar: la canción exacta, el picoteo exacto, la palabra que repite, todo aprendido a base de mirar.",
    },
    ideasTitle: "Cinco hechos con lo que has aprendido",
    ideas: [
      {
        template: "on-repeat",
        heading: "Una playlist con lo que de verdad escucha",
        brief: "Fotos como pistas, pies de foto como títulos, con el nombre de lo que de verdad escucha.",
        body: "Sabes qué pone cuando cocina y qué se salta, así que En bucle puede ser exacto. Cada foto se vuelve una pista con tu pie de foto como título, y su nombre va donde iría el artista. Ponle a la playlist, en veinticuatro caracteres, el nombre de la costumbre: las canciones de la ducha, las del domingo.",
        line: { field: "playlist", where: "El nombre de la playlist", text: "para cocinar contigo" },
      },
      {
        template: "fortune-cookie",
        heading: "Fortunas que adivinan lo que siempre pide",
        brief: "Galletas que se abren con fortunas que predicen, muy seguras, lo que siempre pide.",
        body: "Ocho meses mirando lo que pide lo ponen fácil. Cada galleta se abre con un toque y sale una tira, tres fortunas como mínimo y veinte como mucho, algunas con foto. Predice, con total seguridad, lo que elige siempre. La última galleta lleva tu mensaje, y ese puede ir menos en broma.",
        line: { field: "fortunes", where: "Una de las fortunas", text: "Pedirás la misma pasta y dirás que querías probar algo nuevo." },
      },
      {
        template: "keepsake",
        heading: "Una palabra arrancada de un libro que le encanta",
        brief: "Un paquete sellado de cosas guardadas, entre ellas una palabra arrancada de un libro.",
        body: "Recuerdo llega como un paquete con sello de lacre, y dentro hay cosas guardadas: tu primera foto bajo flores secas, un billete con un número, un relicario de oro y una palabra arrancada de un libro. A los ocho meses ya sabes de qué libro. El hueco da para catorce caracteres, así que elige la que subrayaría.",
        line: { field: "word", where: "La palabra arrancada", text: "quédate" },
      },
      {
        template: "digicam",
        heading: "Ocho meses de cenas en una cámara",
        brief: "Vuestras comidas en el carrete de una camarita, cada foto con el plato al pie.",
        body: "Llena Digicam con las comidas que habéis compartido, hasta doce fotos, y escribe el plato en cada pie con la letra pixelada de la pantalla. Desmarca «Es su cumpleaños», o la cámara se encenderá con una felicitación de cumpleaños. Se pasan con las flechas o deslizando. Encima de la cámara, el título recortado de revista llega a veinticuatro caracteres: el nombre de vuestro sitio de siempre.",
        line: { field: "headline", where: "El título recortado", text: "Los martes, en Casa Rosa" },
      },
      {
        template: "picnic",
        heading: "Un pícnic con sus favoritos de verdad",
        brief: "Una cesta de cuadros que se vacía cosa a cosa, cada una con una etiqueta sobre un favorito.",
        body: "Aquí toca afinar: el queso que se compra para sí, la bebida que pide dos veces. Pícnic te deja vaciar una cesta de cuadros cosa a cosa, con una etiqueta en cada una, de tres a ocho, y tu carta es la nota doblada de debajo. Escribe las etiquetas como si se las fueras dando en mano.",
        line: { field: "labels", where: "La etiqueta de una cosa", text: "el queso que escondes de las visitas" },
      },
    ],
    date: { kind: "rainy-day", title: "Una librería, luego café y un libro cada uno", line: "Escoged un libro para regalaros y haced el cambio con el café." },
    stage: [
      "A los ocho meses ya has visto suficientes veces lo que pide, cómo cocina, qué compra y qué música elige como para conocer sus patrones. Lo normal es tener ya un sitio de siempre, un cajón o un cepillo de dientes en la otra casa y unas rutinas que empezaron por casualidad. Se acabó adivinar, y los regalos pueden notarlo.",
      "Un regalo genérico que valdría para cualquiera de su edad falla aquí, igual que algo caro sacado de una lista que nunca escribió. El bueno apunta a lo concreto a propósito, la canción, el picoteo o la palabra exactos, para que el regalo solo pueda ser para quien lo recibe.",
    ],
    faq: [
      { q: "¿Qué se regala por ocho meses de relación?", a: "Algo que demuestre lo que has aprendido: su playlist de verdad, el plato que siempre pide, una palabra de un libro que le encanta. Todo eso cuesta meses de fijarse, y por eso vale la pena regalarlo." },
      { q: "¿Los ocho meses son un aniversario que se celebre?", a: "Normalmente no con nada grande. Es buen mes para un regalo pequeño y preciso, porque ya conoces sus gustos y el año todavía queda lejos." },
      { q: "¿Cómo hago que un regalo sea personal a los ocho meses?", a: "Usa detalles que solo sepas tú: lo que pide, la canción de la ducha, el queso que esconde. Nombra el queso, no el hecho de que le guste el queso." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 9
// ---------------------------------------------------------------------------------------------

const month9: Month = {
  en: {
    title: "9 Month Anniversary Gifts for Three Quarters of a Year",
    description: "Three quarters of a year: for a 9 month anniversary, nine photos, one a month, go into a constellation, a locket or a music box. Five gifts that start there.",
    h1: "9 month anniversary gifts",
    label: "9 months",
    hero: {
      line: "Three quarters of a year. Nine photos, one for every month.",
      sentence: "Nine months is long enough to have a photo from each and short enough that each still has its story, so these gifts are built around nine pictures.",
    },
    ideasTitle: "Five that hold nine months",
    ideas: [
      {
        template: "constellations",
        heading: "Nine stars, one for each month",
        brief: "Each photo becomes a star, nine for nine months, joined into one shape.",
        body: "Nine months gives nine stars, and the shape fills out well. Constellations turns each photo into a star, three at least and twelve at most, and joins them into one shape: a heart, an infinity sign or a star. When it is complete, your last line appears over it, up to 120 characters.",
        line: { field: "finalLine", where: "The line when it completes", text: "Nine months, and I would pick the same sky again." },
      },
      {
        template: "keepsake",
        heading: "A locket with three quarters engraved",
        brief: "A gold locket that opens on a tap, with eighteen characters engraved on it.",
        body: "Keep the engraving small: your initials and a date, or a word you both use. The gold locket in Keepsake opens on a tap to a photo inside, and its engraving takes eighteen characters, about the right size for nine months. The rest of the box holds a ticket, a torn word and your typed letter.",
        line: { field: "engraving", where: "The engraving", text: "A + J, since March" },
      },
      {
        template: "music-box",
        heading: "A slow tune for a slower month",
        body: "A slow letter suits nine months, and this one waits for the tune to end. Three turns of Music Box’s key lift the lid; a figurine turns on velvet and the tune plays note by note while your photos rise in the mirror, one each turn, eight at most. As the spring runs down, a folded letter lifts out.",
        line: { field: "message", where: "The letter in the box", text: "Nine months ago I did not know the song you hum when you cook. Now I hum it too." },
      },
      {
        template: "paper-crane",
        heading: "The line left when the crane flies",
        brief: "Six folds, a line on each, and one closing line left when the crane flies.",
        body: "Spend the folds on the months and keep the closing line for the plan for the year. Paper Crane shows a line on each fold, up to six; when the last fold is made, the paper is a crane and it lifts off the table, leaving behind one closing line of up to ninety characters.",
        line: { field: "closing", where: "The line left behind", text: "Three months to go until a year. I have already started planning it." },
      },
      {
        template: "photo-booth",
        heading: "Four poses from the double date",
        brief: "Four flashes and one strip, with your line written in pen on a wall of love notes.",
        body: "If there is a photo of you with the friends who were there at the start, Photo Booth is where it goes: four flashes, one strip, in color or sepia. Beside it, on a wall of love notes, your line is written in pen, forty characters long. A gift that admits other people noticed too.",
        line: { field: "line", where: "The words on the wall", text: "our friends called it first" },
      },
    ],
    date: { kind: "double-date", title: "Bowling with the friends who saw it start", line: "Invite the couple who introduced you, and let them keep score." },
    stage: [
      "Nine months is three quarters of a year. By now you have probably met most of each other’s friends, spent a vacation or a family occasion together, and settled who stays where on weekends. There is a photo from almost every month, which is the material this month’s gifts are built from.",
      "The year is three months off, and it is tempting to hold the anniversary early: the big dinner, the serious present. Save those. Nine months asks for something smaller and harder to fake, nine photos in order, one per month, and a last line that looks ahead to twelve without spending it. Skipping the month stings more than usual if you have marked every one so far.",
    ],
    faq: [
      { q: "What is a good gift for nine months together?", a: "One built from nine photos, one for each month: stars in a constellation, a locket and a box of kept things, or a tune with photos in its mirror. Keep the big gesture for the year." },
      { q: "Can a nine-month gift include something engraved?", a: "Something small, yes. Initials and a date in a locket feel right at nine months; a full sentence about forever is better saved for later." },
      { q: "How do I make nine months feel different from six?", a: "Look forward. At six months the gift looks back over half a year; at nine, let the last line point to the year ahead and a plan to mark it." },
    ],
  },
  es: {
    title: "Regalos para 9 meses de novios: tres cuartos de año",
    description: "Tres cuartos de año: para los 9 meses de novios, nueve fotos, una por mes, en una constelación, un relicario o una caja de música. Cinco regalos con ellas.",
    h1: "Regalos para 9 meses de novios",
    label: "9 meses",
    hero: {
      line: "Tres cuartos de año. Nueve fotos, una por cada mes.",
      sentence: "Nueve meses dan para tener una foto de cada uno y pocos como para que cada una conserve su historia, así que estos regalos giran en torno a nueve fotos.",
    },
    ideasTitle: "Cinco que caben en nueve meses",
    ideas: [
      {
        template: "constellations",
        heading: "Nueve estrellas, una por cada mes",
        brief: "Cada foto se vuelve una estrella, nueve por nueve meses, unidas en una sola figura.",
        body: "Nueve meses dan nueve estrellas, y la figura queda bien llena. Constelaciones convierte cada foto en una estrella, tres como mínimo y doce como mucho, y las une en una sola figura: un corazón, un infinito o una estrella. Cuando se completa, aparece encima tu última frase, de hasta 120 caracteres.",
        line: { field: "finalLine", where: "La frase al completarse", text: "Nueve meses, y volvería a elegir el mismo cielo." },
      },
      {
        template: "keepsake",
        heading: "Un relicario con tres cuartos grabados",
        brief: "Un relicario de oro que se abre con un toque, con dieciocho caracteres grabados.",
        body: "Mejor que el grabado sea pequeño: vuestras iniciales y una fecha, o una palabra que usáis los dos. El relicario de oro de Recuerdo se abre con un toque y deja ver una foto, y su grabado admite dieciocho caracteres, más o menos lo que piden nueve meses. El resto de la caja guarda un billete, una palabra arrancada y tu carta a máquina.",
        line: { field: "engraving", where: "El grabado", text: "A + J, desde marzo" },
      },
      {
        template: "music-box",
        heading: "Una melodía lenta para un mes más lento",
        body: "Una carta lenta le va bien a nueve meses, y esta espera a que acabe la melodía. Tres vueltas a la llave de Caja de música levantan la tapa; una figura gira sobre el terciopelo y la melodía suena nota a nota mientras tus fotos suben al espejo, una por vuelta, ocho como mucho. Cuando se acaba la cuerda, sale una carta doblada.",
        line: { field: "message", where: "La carta de la caja", text: "Hace nueve meses no sabía qué canción tarareas al cocinar. Ahora la tarareo yo." },
      },
      {
        template: "paper-crane",
        heading: "La frase que queda cuando la grulla vuela",
        brief: "Seis pliegues con una frase cada uno y una frase final que se queda al volar.",
        body: "Gasta los pliegues en los meses y guarda la frase final para el plan del año. Grulla de papel muestra una frase en cada pliegue, hasta seis; con el último, el papel ya es una grulla y se levanta de la mesa, dejando atrás una frase final de hasta noventa caracteres.",
        line: { field: "closing", where: "La frase que se queda", text: "Quedan tres meses para el año. Ya he empezado a planearlo." },
      },
      {
        template: "photo-booth",
        heading: "Cuatro poses de la cita con amigos",
        brief: "Cuatro flashes y una tira, con tu frase a boli en un muro de notas de amor.",
        body: "Si tienes una foto con los amigos que estaban al principio, su sitio es Fotomatón: cuatro flashes, una tira, en color o en sepia. Al lado, en un muro de notas de amor, tu frase va escrita a boli, de cuarenta caracteres. Un regalo que reconoce que los demás también se dieron cuenta.",
        line: { field: "line", where: "Las palabras del muro", text: "nuestros amigos lo vieron antes" },
      },
    ],
    date: { kind: "double-date", title: "Bolos con los amigos que lo vieron empezar", line: "Invitad a la pareja que os presentó y que lleven ellos la cuenta." },
    stage: [
      "Nueve meses son tres cuartos de año. Para entonces ya conocéis a casi todas las amistades de cada lado, habéis compartido unas vacaciones o una fecha familiar y tenéis decidido quién duerme dónde los fines de semana. Hay una foto de casi cada mes, y de eso están hechos los regalos de este mes.",
      "Quedan tres meses para el año, y apetece adelantarlo: la gran cena, el regalo serio. Guárdalos. Nueve meses piden algo más pequeño y más difícil de fingir: nueve fotos en orden, una por mes, y una última frase que mire a los doce sin gastarlos. Saltarse el mes duele más de lo normal si los has celebrado todos hasta ahora.",
    ],
    faq: [
      { q: "¿Qué regalo se hace a los nueve meses de relación?", a: "Uno hecho con nueve fotos, una por mes: estrellas en una constelación, un relicario en una caja de recuerdos o una melodía con fotos en su espejo. El gran gesto, para el año." },
      { q: "¿Un regalo de nueve meses puede llevar algo grabado?", a: "Algo pequeño, sí. Unas iniciales y una fecha en un relicario encajan a los nueve meses; una frase entera sobre el para siempre mejor guardarla para más adelante." },
      { q: "¿Cómo hago que los nueve meses se noten distintos de los seis?", a: "Mira hacia delante. A los seis meses el regalo mira atrás a medio año; a los nueve, deja que la última frase apunte al año que viene y a un plan para celebrarlo." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 10
// ---------------------------------------------------------------------------------------------

const month10: Month = {
  en: {
    title: "10 Month Anniversary Gifts in Double Digits",
    description: "Ten reasons in a jar, ten photos, ten months of evidence read out by cats: a 10 month anniversary is the first count in double digits.",
    h1: "10 month anniversary gifts",
    label: "10 months",
    hero: {
      line: "Double digits. The month count finally needs a second one.",
      sentence: "Ten is a satisfying number to make a gift around: ten photos, ten findings, ten reasons, each one a month you can point to.",
    },
    ideasTitle: "Five that count to ten",
    ideas: [
      {
        template: "scrapbook",
        heading: "Ten photos and a torn note in your hand",
        body: "One photo for each month makes ten, a round fill for a Scrapbook that takes twelve. They drop in as polaroids that develop between washi tape and flowers. The torn note in handwriting holds ninety characters: write it as the caption to all ten months together, the line you would scribble in the margin.",
        line: { field: "quote", where: "The torn note", text: "Ten months of you leaving the cabinet doors open. I counted. I don’t mind." },
      },
      {
        template: "xoxo",
        heading: "What you call them, in newspaper letters",
        brief: "Their nickname cut from newspaper letters over polaroids on lace, and a typed letter below.",
        body: "Ten months in, the nickname has probably changed twice, so use the current one. XOXO cuts it out of a newspaper, letter by letter, sixteen characters at most, above polaroids on a lace doily. Your letter is typed at the bottom and signed with a kiss.",
        line: { field: "headline", where: "What you call them", text: "my menace" },
      },
      {
        template: "the-council",
        heading: "Ten months of evidence, read out by cats",
        brief: "Cats read out your findings, six at most, before the gavel and the stamp.",
        body: "Ten months is a good docket: pick the six strongest pieces of evidence that they are, in fact, wonderful. The cats of The Council read out your findings, up to six of ninety characters each, before the gavel falls and the stamp comes down. Choose “approved” for the ruling.",
        line: { field: "findings", where: "One of the findings", text: "Exhibit C: remembered my sister’s birthday before I did." },
      },
      {
        template: "jar-of-reasons",
        heading: "A labeled jar of ten reasons",
        body: "Ten reasons, one for each month, is a jar that feels full without being padded. Jar of Reasons drops one folded note out each time they shake the phone or tap the glass. The label on the jar holds forty characters: write the count on it, so they know when the last one is coming.",
        line: { field: "label", where: "The jar’s label", text: "10 reasons, one per month" },
      },
      {
        template: "vinyl",
        heading: "A record with your names as the artist",
        brief: "Your names credited as the artist, on a record that spins with your song.",
        body: "Ten months is enough history to credit the two of you as a band. In Vinyl the artist’s name is yours to write, forty characters, under the album title on a sleeve that sits on the deck. The record spins with your song, and the crate beside it holds up to twelve photos as covers.",
        line: { field: "artist", where: "The artist’s name", text: "The Two of Us (Live, Month Ten)" },
      },
    ],
    date: { kind: "fun", title: "Mini golf, ten holes, loser buys dessert", line: "Keep the scorecard and put it in the next gift." },
    stage: [
      "Ten months is the first count with two digits, and a lot of couples feel it: the relationship has outlasted a season or three, the friends have stopped asking how it is going, and the shared calendar has entries months ahead. There is enough of everything now to count it in tens.",
      "Two months short of the year, the safe move is a game with the number: ten photos, ten reasons, ten pieces of evidence. Anything that tries to stand in for the anniversary takes something from it, and the solemn things belong to twelve. Skipping ten altogether is the other mistake, with the year this close and every month before it marked.",
    ],
    faq: [
      { q: "What do you do for ten months together?", a: "Play with the number: a jar of ten reasons, ten photos in a scrapbook, ten months of evidence at a hearing. Pair it with a fun date and keep it light." },
      { q: "Is ten months too close to the anniversary to celebrate?", a: "Not if it is small. Two months out from the year, a playful gift marks ten without stealing anything from the anniversary itself." },
      { q: "What should I write for ten months?", a: "Something countable. Ten small true things, one per month, are easier to write than one big paragraph and more convincing to read." },
    ],
  },
  es: {
    title: "Regalos para 10 meses de novios, ya con dos cifras",
    description: "Diez razones en un frasco, diez fotos, diez meses de pruebas leídas por gatos: los 10 meses de novios son la primera cuenta con dos cifras.",
    h1: "Regalos para 10 meses de novios",
    label: "10 meses",
    hero: {
      line: "Dos cifras. La cuenta por fin necesita dos dígitos.",
      sentence: "El diez es un número agradecido para montar un regalo: diez fotos, diez pruebas, diez razones, cada una un mes que puedes señalar.",
    },
    ideasTitle: "Cinco que cuentan hasta diez",
    ideas: [
      {
        template: "scrapbook",
        heading: "Diez fotos y una nota rasgada a mano",
        body: "Una foto por mes son diez, y llenan bien un Álbum de recortes que admite doce. Caen como polaroids que se revelan entre cinta washi y flores. La nota rasgada escrita a mano tiene sitio para noventa caracteres: escríbela como el pie de foto de los diez meses enteros, la frase que garabatearías en el margen.",
        line: { field: "quote", where: "La nota rasgada", text: "Diez meses dejándote las puertas del armario abiertas. Las he contado. Me da igual." },
      },
      {
        template: "xoxo",
        heading: "Cómo le llamas, en letras de periódico",
        brief: "Su mote recortado en letras de periódico sobre polaroids con encaje, y una carta a máquina.",
        body: "En diez meses el mote seguramente ha cambiado dos veces, así que usa el de ahora. XOXO lo recorta de un periódico, letra a letra, dieciséis caracteres como mucho, sobre polaroids en un tapete de encaje. Tu carta va a máquina abajo, firmada con un beso.",
        line: { field: "headline", where: "Cómo le llamas", text: "mi amenaza" },
      },
      {
        template: "the-council",
        heading: "Diez meses de pruebas, leídas por gatos",
        brief: "Los gatos leen tus conclusiones, seis como mucho, antes del mazo y el sello.",
        body: "Diez meses dan para un buen sumario: elige las seis pruebas más sólidas de que es, de hecho, una maravilla. Los gatos de El Consejo leen tus conclusiones, hasta seis de noventa caracteres, antes de que caiga el mazo y llegue el sello. Para el veredicto, «Visto bueno».",
        line: { field: "findings", where: "Una de las conclusiones", text: "Prueba C: se acordó del cumpleaños de mi hermana antes que yo." },
      },
      {
        template: "jar-of-reasons",
        heading: "Un frasco etiquetado con diez razones",
        body: "Diez razones, una por mes, es un frasco que parece lleno sin relleno. Frasco de razones suelta una nota doblada cada vez que se agita el móvil o se toca el cristal. La etiqueta del frasco da para cuarenta caracteres: escribe la cuenta en ella, para que se sepa cuándo llega la última.",
        line: { field: "label", where: "La etiqueta del frasco", text: "10 razones, una por mes" },
      },
      {
        template: "vinyl",
        heading: "Un disco con vuestros nombres como artista",
        brief: "Vuestros nombres como artista en un disco que gira con vuestra canción.",
        body: "Diez meses de historia bastan para firmar como grupo. En Vinilo el nombre del artista lo escribes tú, cuarenta caracteres, bajo el título del álbum en una funda que está junto al plato. El disco gira con vuestra canción, y la caja de al lado guarda hasta doce fotos como portadas.",
        line: { field: "artist", where: "El nombre del artista", text: "Los Dos (en directo, mes diez)" },
      },
    ],
    date: { kind: "fun", title: "Minigolf a diez hoyos, quien pierda paga el postre", line: "Guardad la tarjeta de puntos y metedla en el próximo regalo." },
    stage: [
      "Diez meses es la primera cuenta con dos cifras, y se nota: la relación ha durado más de una estación o tres, los amigos ya no preguntan qué tal va y el calendario compartido tiene planes a meses vista. Ya hay bastante de todo como para contarlo de diez en diez.",
      "A dos meses del año, lo que funciona es jugar con el número: diez fotos, diez razones, diez pruebas. Cualquier cosa que quiera ocupar el sitio del aniversario le quita algo, y lo solemne es cosa de los doce. También falla saltarse el diez, con el año tan cerca y todos los meses anteriores celebrados.",
    ],
    faq: [
      { q: "¿Qué se hace cuando se cumplen diez meses?", a: "Jugar con el número: un frasco de diez razones, diez fotos en un álbum, diez meses de pruebas en un juicio. Acompáñalo de una cita divertida y que sea ligero." },
      { q: "¿Diez meses está demasiado cerca del aniversario para celebrarlo?", a: "No, si es algo pequeño. A dos meses del año, un regalo con gracia marca los diez sin quitarle nada al aniversario." },
      { q: "¿Qué escribo a los diez meses?", a: "Algo que se pueda contar. Diez cosas pequeñas y ciertas, una por mes, son más fáciles de escribir que un párrafo grande y más convincentes de leer." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 11
// ---------------------------------------------------------------------------------------------

const month11: Month = {
  en: {
    title: "11 Month Anniversary Gifts That Count Down to the Year",
    description: "An 11 month anniversary is the month before the year. Gifts that count down to it without spending it: a clock, practice flowers, a chat ending on the plan.",
    h1: "11 month anniversary gifts",
    label: "11 months",
    hero: {
      line: "One month to the year. Count down to it, do not spend it.",
      sentence: "The best gift at eleven months points at the anniversary: a clock running to the day, a plan in writing, and nothing that belongs to the year itself.",
    },
    ideasTitle: "Five that point at the year",
    ideas: [
      {
        template: "midnight-countdown",
        heading: "A clock running down to your first anniversary",
        brief: "A live clock under a darkening sky, set to the start of your anniversary.",
        body: "Set the clock to the start of your anniversary day, a month from now. Midnight Countdown runs it live on their screen under a sky that darkens as zero gets closer, and at zero the fireworks go off and the photos open. Above the clock, sixty characters say what it is counting to.",
        line: { field: "headline", where: "Headline above the timer", text: "Until one whole year of us" },
      },
      {
        template: "favorite-person",
        heading: "A sign-off under the flowers, in your words",
        brief: "Polaroids under gingham tape, and your own sign-off written under the flowers.",
        body: "At the foot of Favorite Person’s bouquet sits a sign-off of eighteen characters, under a page of polaroids held with gingham tape and a torn note naming who they are. Eleven months in, the sign-off can be the one you actually use at the end of every call.",
        line: { field: "signoff", where: "Under the flowers", text: "ok bye love you" },
      },
      {
        template: "sticker-bomb",
        heading: "Eleven months of nicknames, on label strips",
        brief: "Six label-maker strips under the stickers, your nicknames for them in order, oldest first.",
        body: "The label-maker strips in Sticker Bomb come out in the order you typed them, six at most, each twenty-eight characters, tucked under every other sticker they slap down. Eleven months gives you a history of nicknames: put them in order, oldest first, so the last strip is what you call them now.",
        line: { field: "labels", where: "One label-maker strip", text: "formerly: the tall one" },
      },
      {
        template: "bouquet",
        heading: "Flowers that promise the next ones",
        brief: "Up to 24 stems you choose, and a card that promises next month’s flowers.",
        body: "These are practice flowers, and the card can say so. Bouquet holds up to 24 stems of your choosing, arranged until it looks right, then opened on their screen one flower at a time. The card has thirty characters: use them to promise the real anniversary flowers, a month from now.",
        line: { field: "cardNote", where: "The card in the bouquet", text: "Practice run. Next month: real" },
      },
      {
        template: "text-thread",
        heading: "A chat that ends on the plan",
        brief: "Your messages replayed with typing dots, ending on the plan for the anniversary.",
        body: "Rebuild in Text Thread the chat where you first talked about the anniversary, or invent the one you will have: up to forty bubbles, typing dots between them, photos dropping in as attachments. Let it end on the plan. Sent eleven months in, it reads like a teaser for the year.",
        line: { field: "lines", where: "The last bubble", text: "so. one month from today. keep the evening free" },
      },
    ],
    date: { kind: "cheap", title: "Stars and planets, and a year to plan", line: "Lie on a blanket and plan the anniversary out loud." },
    stage: [
      "Eleven months is the month before the year, and the anniversary is close enough to feel: there may already be a restaurant in mind, a trip half planned, a question about how to mark it. The relationship has a full set of seasons almost behind it, and most of its stories have now been told twice.",
      "If the anniversary present is already bought, it is hard not to hand it over now. Hold on to it. Eleven months wants a gift that points at the day: a countdown, a plan in writing, flowers that promise better ones. Letting the month pass in silence and then arriving with a big gesture four weeks later feels lopsided. And something made now can be sent now and wait to open on the day itself.",
    ],
    faq: [
      { q: "What do you give at eleven months?", a: "Something that looks forward to the year rather than replacing it: a countdown to the date, a chat that ends on the plan, a practice bouquet. Keep the real anniversary gift for next month." },
      { q: "Can I send a gift now and have it open on our anniversary?", a: "Yes. Scheduling comes with a paid template: open Extras in the editor, turn on “Schedule the reveal” and enter the anniversary date, the hour you want and their time zone. Send the link today; until that hour it shows a countdown, then opens on its own." },
      { q: "How do I plan the first anniversary at eleven months?", a: "Start now: pick the evening, book the table or the trip, and put it in writing. A countdown sent at eleven months makes the plan official without giving it away." },
    ],
  },
  es: {
    title: "Regalos para 11 meses de novios con cuenta atrás",
    description: "Los 11 meses de novios son el mes antes del año. Regalos que cuentan hacia él sin gastarlo: un reloj, flores de ensayo, un chat que acaba en el plan.",
    h1: "Regalos para 11 meses de novios",
    label: "11 meses",
    hero: {
      line: "Un mes para el año. Cuenta los días, no los gastes.",
      sentence: "El mejor regalo a los once meses apunta al aniversario: un reloj que corre hacia el día, un plan por escrito y nada que sea del año en sí.",
    },
    ideasTitle: "Cinco que apuntan al año",
    ideas: [
      {
        template: "midnight-countdown",
        heading: "Un reloj hacia vuestro primer aniversario",
        brief: "Un reloj en marcha bajo un cielo que oscurece, puesto al inicio del aniversario.",
        body: "Pon el reloj al comienzo del día del aniversario, dentro de un mes. Cuenta atrás de medianoche lo deja en marcha en su pantalla bajo un cielo que se oscurece a medida que se acerca el cero, y en el cero estallan los fuegos y se abren las fotos. Encima, en sesenta caracteres, una frase dice hacia qué cuenta.",
        line: { field: "headline", where: "Titular sobre el reloj", text: "Hasta nuestro primer año entero" },
      },
      {
        template: "favorite-person",
        heading: "Una despedida bajo las flores, a tu manera",
        brief: "Polaroids con cinta de cuadros y tu despedida de siempre escrita bajo las flores.",
        body: "Al pie del ramo de Mi persona favorita va una despedida de dieciocho caracteres, bajo una página de polaroids sujetas con cinta de cuadros y una nota rasgada que dice quién es para ti. A los once meses, la despedida puede ser la que de verdad usas al acabar cada llamada.",
        line: { field: "signoff", where: "Bajo las flores", text: "venga, te quiero" },
      },
      {
        template: "sticker-bomb",
        heading: "Once meses de motes, en tiras de rotuladora",
        brief: "Seis tiras de rotuladora bajo los stickers, con sus motes en orden, del más antiguo al último.",
        body: "Las tiras de rotuladora de Bomba de Stickers salen en el orden en que las escribiste, seis como mucho, de veintiocho caracteres, metidas bajo uno de cada dos stickers que se van pegando. Once meses dan para una historia de motes: ponlos en orden, del más antiguo al más nuevo, para que la última tira sea como le llamas ahora.",
        line: { field: "labels", where: "Una tira de rotuladora", text: "alias número tres" },
      },
      {
        template: "bouquet",
        heading: "Flores que prometen las siguientes",
        brief: "Hasta 24 tallos elegidos por ti y una tarjeta que promete las flores del mes que viene.",
        body: "Son flores de ensayo, y la tarjeta puede decirlo. Ramo admite hasta 24 tallos elegidos por ti, colocados hasta que queden bien, que luego se abren en su pantalla flor a flor. La tarjeta tiene treinta caracteres: úsalos para prometer las flores del aniversario de verdad, dentro de un mes.",
        line: { field: "cardNote", where: "La tarjeta del ramo", text: "Ensayo. El mes que viene, más" },
      },
      {
        template: "text-thread",
        heading: "Un chat que acaba en el plan del día",
        brief: "Vuestros mensajes repetidos con sus puntitos, que acaban en el plan del aniversario.",
        body: "Reconstruye en Hilo de mensajes el chat en que hablasteis por primera vez del aniversario, o inventa el que tendréis: hasta cuarenta burbujas, puntitos entre ellas y fotos que caen como adjuntos. Que acabe en el plan. Enviado ahora, se lee como un adelanto del año.",
        line: { field: "lines", where: "La última burbuja", text: "entonces. dentro de un mes. no hagas planes esa noche" },
      },
    ],
    date: { kind: "cheap", title: "Estrellas, planetas y un año por planear", line: "Tumbaos en una manta y planead el aniversario en voz alta." },
    stage: [
      "Once meses es el mes antes del año, y el aniversario ya se nota cerca: quizá ya hay un restaurante en mente, un viaje a medio planear, una duda sobre cómo celebrarlo. La relación tiene casi detrás todas las estaciones, y la mayoría de sus historias ya se han contado dos veces.",
      "Si el regalo del aniversario ya está comprado, cuesta no darlo ahora. Aguanta. Once meses piden algo que apunte al día: una cuenta atrás, un plan por escrito, flores que prometen otras mejores. Dejar pasar el mes en silencio y aparecer cuatro semanas después con un gran gesto queda cojo. Además, lo que hagas ahora puede enviarse ya y esperar cerrado hasta ese mismo día.",
    ],
    faq: [
      { q: "¿Qué se regala a los once meses?", a: "Algo que mire hacia el año en vez de sustituirlo: una cuenta atrás hasta la fecha, un chat que acaba en el plan, un ramo de ensayo. El regalo del aniversario de verdad, para el mes que viene." },
      { q: "¿Puedo enviar un regalo ahora y que se abra en nuestro aniversario?", a: "Sí. La programación viene con las plantillas de pago: abre Extras en el editor, activa «Programar la apertura» y pon la fecha del aniversario, la hora que quieras y su zona horaria. Envía hoy el enlace; hasta esa hora muestra una cuenta atrás y después se abre solo." },
      { q: "¿Cómo planeo el primer aniversario a los once meses?", a: "Empieza ya: elige la noche, reserva la mesa o el viaje y ponlo por escrito. Una cuenta atrás enviada a los once meses hace oficial el plan sin desvelarlo." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 13
// ---------------------------------------------------------------------------------------------

const month13: Month = {
  en: {
    title: "13 Month Anniversary Gifts to Open Year Two",
    description: "A 13 month anniversary is the first month of year two, and almost nobody marks it. Funny gifts for anyone still counting, each with one sincere line.",
    h1: "13 month anniversary gifts",
    label: "13 months",
    hero: {
      line: "Year two, month one. Nobody counts this one, so make it funny.",
      sentence: "After the anniversary the solemn things are used up for a while, and a gift with a joke in it reads as relief, not as a lesser present.",
    },
    ideasTitle: "Five that let the year off duty",
    ideas: [
      {
        template: "the-council",
        heading: "A hearing on the charge of still being here",
        body: "After a year, The Council can try them on a charge the evidence fully supports. You set it in sixty characters, write findings for the cats to read out, and choose the stamp: pardoned, if the joke is on you. Photos go in as exhibits, six at most, and your letter is the ruling in full.",
        line: { field: "charge", where: "The charge", text: "surviving a full year of my playlists" },
      },
      {
        template: "picnic",
        heading: "Tags for the things year one left behind",
        brief: "A basket unpacked tap by tap, each thing tagged with what year one left behind.",
        body: "Thirteen months leaves leftovers: a sock in the wrong drawer, a mug that migrated, the umbrella neither of you owns. Picnic’s basket comes out one tap at a time, every item tagged by you, between three and eight tags. Tag the leftovers with the dignity of evidence, and keep the last tag kind.",
        line: { field: "labels", where: "A tag on one thing", text: "your sock, my drawer, since March" },
      },
      {
        template: "on-repeat",
        heading: "Year two’s first song, with a note",
        body: "Start On Repeat’s playlist again from the top: the photos since the anniversary as tracks, captions as titles, under a pink, lilac or night sky. The note in handwriting below the player takes sixty characters. Thirteen months is the right moment to admit which song you secretly cannot stand.",
        line: { field: "note", where: "The note under the player", text: "Year two. I will finally admit I hate track four." },
      },
      {
        template: "scratch-card",
        heading: "Foil that warns them it is a joke",
        brief: "A few words printed on the foil, then the month’s photos underneath, card by card.",
        body: "Scratch Card prints a few words on the foil itself before anything is revealed, thirty characters, and that is where the joke can start. Underneath go your photos from the first month of year two, one per card, and the last card’s headline can be as silly as the month deserves.",
        line: { field: "foilText", where: "The words on the foil", text: "do not scratch. ok, scratch" },
      },
      {
        template: "fortune-cookie",
        heading: "Fortunes for the year ahead, silly first",
        brief: "Fortunes for year two, opened one cookie at a time, silly first and true last.",
        body: "Fortune Cookie holds as many as twenty fortunes and as few as three, each up to 140 characters, opened one cookie at a time. Year two is the time for predictions: write the silly ones first and the true one last, where the final cookie carries your message instead.",
        line: { field: "fortunes", where: "One of the fortunes", text: "In year two you will finally learn which drawer the scissors live in." },
      },
    ],
    date: { kind: "fun", title: "Karaoke, one duet, no backing out", line: "Pick the song you sang badly in year one and do it again." },
    stage: [
      "Thirteen months is the first month after the anniversary, and almost nobody counts it. The big gesture has just happened, the photos from the day are still on everyone’s phones, and life has gone back to normal with a small sense of relief. Plenty of people stop counting months here, which is fine.",
      "If you have marked every month so far, they will notice when this one goes by in silence. A second anniversary present four weeks after the first, though, is more than the month can hold. What fits is a joke with one true line hidden in it, costing little and showing you paid attention: proof that you are still counting.",
    ],
    faq: [
      { q: "Do couples celebrate 13 months?", a: "Most stop counting after the first year, so thirteen months is optional. If you have marked every month so far, a small funny gift keeps the habit going without competing with the anniversary." },
      { q: "What is a funny gift for 13 months together?", a: "A mock hearing about surviving a year of you, fortunes for year two, or tags for the things that ended up in the wrong drawer. Keep one line in it sincere." },
      { q: "Should we keep counting months after a year?", a: "Only if you both enjoy it. Plenty of couples switch to years after twelve months, and the occasional month gift then comes as a surprise." },
    ],
  },
  es: {
    title: "Regalos para 13 meses de novios: año dos",
    description: "Los 13 meses de novios son el primer mes del segundo año, y casi nadie los celebra. Regalos con gracia para quien sigue contando, con una frase en serio dentro.",
    h1: "Regalos para 13 meses de novios",
    label: "13 meses",
    hero: {
      line: "Segundo año, primer mes. Nadie cuenta este, así que hazlo con gracia.",
      sentence: "Después del aniversario lo solemne se ha gastado por un tiempo, y un regalo con una broma dentro se recibe como un alivio, no como un regalo menor.",
    },
    ideasTitle: "Cinco que dejan descansar al año",
    ideas: [
      {
        template: "the-council",
        heading: "Un juicio por el cargo de seguir aquí",
        brief: "Un juicio de gatos por un cargo que las pruebas sostienen de sobra.",
        body: "Después de un año, El Consejo puede sentar en el banquillo a quien lo reciba por un cargo que las pruebas sostienen de sobra. Lo escribes en sesenta caracteres, redactas lo que leerá cada gato y eliges el sello: «Indulto», si la broma va contra ti. Las fotos entran como pruebas, seis como mucho, y tu carta es la sentencia completa.",
        line: { field: "charge", where: "El cargo", text: "sobrevivir un año entero a mis playlists" },
      },
      {
        template: "picnic",
        heading: "Etiquetas para lo que dejó el primer año",
        brief: "Una cesta que se vacía toque a toque, cada cosa con lo que dejó el primer año.",
        body: "Trece meses dejan restos: un calcetín en el cajón equivocado, una taza que cambió de casa, el paraguas que no es de nadie. La cesta de Pícnic se vacía toque a toque, cada cosa con su etiqueta, entre tres y ocho. Etiqueta los restos con la seriedad de una prueba y deja amable la última.",
        line: { field: "labels", where: "La etiqueta de una cosa", text: "tu calcetín, mi cajón, desde marzo" },
      },
      {
        template: "on-repeat",
        heading: "La primera canción del segundo año, con nota",
        body: "Empieza de nuevo la playlist de En bucle: las fotos desde el aniversario como pistas, los pies como títulos, bajo un cielo de atardecer, lila o de noche. La nota a mano bajo el reproductor llega a sesenta caracteres. Trece meses es buen momento para confesar qué canción no soportas en secreto.",
        line: { field: "note", where: "La nota bajo el reproductor", text: "Segundo año. Confieso que odio la canción cuatro." },
      },
      {
        template: "scratch-card",
        heading: "Una capa que avisa de que es broma",
        brief: "Unas palabras impresas en la capa y debajo las fotos del mes, tarjeta a tarjeta.",
        body: "Rasca y gana imprime unas palabras en la propia capa antes de que se vea nada, treinta caracteres, y ahí puede empezar la broma. Debajo van tus fotos del primer mes del segundo año, una por tarjeta, y el titular de la última puede ser tan tonto como el mes merece.",
        line: { field: "foilText", where: "Las palabras de la capa", text: "no rasques. bueno, rasca" },
      },
      {
        template: "fortune-cookie",
        heading: "Fortunas para el año que viene, primero las tontas",
        brief: "Fortunas para el segundo año, de galleta en galleta, las tontas primero y la cierta al final.",
        body: "Galleta de la fortuna admite hasta veinte fortunas y como mínimo tres, de hasta 140 caracteres, que se abren galleta a galleta. El segundo año pide predicciones: escribe primero las tontas y al final la verdadera, donde la última galleta lleva tu mensaje.",
        line: { field: "fortunes", where: "Una de las fortunas", text: "En el segundo año por fin sabrás en qué cajón viven las tijeras." },
      },
    ],
    date: { kind: "fun", title: "Karaoke, un dueto y sin echarse atrás", line: "Elegid la canción que cantasteis fatal el primer año y repetidla." },
    stage: [
      "Trece meses es el primer mes después del aniversario, y casi nadie lo cuenta. El gran gesto acaba de pasar, las fotos del día siguen en todos los móviles y la vida ha vuelto a lo normal con cierto alivio. Hay quien deja de contar meses aquí, y no pasa nada.",
      "Si habéis celebrado todos los meses, que este pase en blanco se va a notar. Pero un segundo regalo de aniversario cuatro semanas después del primero es más de lo que el mes aguanta. Lo que encaja es una broma con una frase cierta escondida, que cueste poco y demuestre atención: la prueba de que sigues contando.",
    ],
    faq: [
      { q: "¿Se celebran los 13 meses de novios?", a: "Casi todo el mundo deja de contar después del primer año, así que los trece meses son opcionales. Si habéis celebrado todos los meses, un detalle con gracia mantiene la costumbre sin competir con el aniversario." },
      { q: "¿Qué regalo divertido se hace a los 13 meses?", a: "Un juicio en broma por sobrevivir un año contigo, fortunas para el segundo año o etiquetas para lo que acabó en el cajón equivocado. Deja una frase en serio dentro." },
      { q: "¿Hay que seguir contando meses después del año?", a: "Solo si a los dos os gusta. Hay parejas que pasan a contar años después de los doce meses, y un regalo de mes suelto llega entonces como sorpresa." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 14
// ---------------------------------------------------------------------------------------------

const month14: Month = {
  en: {
    title: "14 Month Anniversary Gifts for Life That Has Merged",
    description: "By a 14 month anniversary, drawers, keys and habits have started to mix. Gifts about the everyday things that are now “ours”: a tag, a ticket, a recipe.",
    h1: "14 month anniversary gifts",
    label: "14 months",
    hero: {
      line: "A drawer at their place, a key on your ring. The everyday is shared now.",
      sentence: "Fourteen months is when ordinary life merges, and the best gift names the small shared things before they stop feeling new.",
    },
    ideasTitle: "Five about the things that are ours",
    ideas: [
      {
        template: "picnic",
        heading: "Tag everything that lives at both places",
        brief: "Each item from the basket tagged with something that now lives at both places.",
        body: "Tag the things that now live at both addresses: the charger, the toothbrush, the good pan. Every item that comes out of Picnic’s basket wears a tag, three to eight of them, forty-eight characters each, and the photos come out in gingham frames. Choose a lilac or blue blanket for a change.",
        line: { field: "labels", where: "A tag on one thing", text: "the charger that is technically mine" },
      },
      {
        template: "keepsake",
        heading: "A ticket stub with a number only you know",
        brief: "A ticket in a box of kept things, printed with a number only you two know.",
        body: "Pick a number only the two of you would recognize: the door code, the bus line, the apartment number of the first place you both slept over. Keepsake prints it on a ticket, twenty-six characters, and keeps it among its kept things beside the dried flowers, the locket and the torn word.",
        line: { field: "ticket", where: "The ticket", text: "BUS 38 · ROW 2 · YOURS" },
      },
      {
        template: "fireside",
        heading: "A candle tag with the date it became home",
        brief: "A window, a warm mug, photos on pegs, and a candle with a dated tag.",
        body: "Fourteen months is the time to put a date on the candle’s tag, which holds twenty-four characters. The candle sits in Fireside’s window, with snow or leaves outside, a mug of cocoa, tea or coffee, and photos on a string of wooden pegs. Once the candle is lit, your letter unfolds from the blanket.",
        line: { field: "tag", where: "The candle’s tag", text: "home since 3/14" },
      },
      {
        template: "recipe-box",
        heading: "A recipe card for the dinner you now share",
        body: "Recipe Box is a recipe card: a name of forty-eight characters, up to six ingredients, and a small line under the name that begins “Makes one…”. Turn it over and it becomes your letter, with photos clipped to it. Name the recipe after the meal that turned into your weeknight default at some point this year.",
        line: { field: "recipeName", where: "The recipe’s name", text: "The Tuesday Pasta, as Argued Over" },
      },
      {
        template: "coquette",
        heading: "Torn-out words beside the photo strip",
        brief: "A few torn-out words beside the photos, saying plainly where you both live now.",
        body: "Next to Coquette’s photo strip sit a few words torn out and stuck down, twenty-eight characters at most, and below them up to ten polaroids lead to your letter on torn paper. Fourteen months is a good time to make those words a plain statement of fact about where you both live now.",
        line: { field: "label", where: "The torn-out words", text: "two keys, one couch" },
      },
    ],
    date: { kind: "rainy-day", title: "A wet afternoon at a climbing wall", line: "Book the beginners’ session and cheer each other up the wall." },
    stage: [
      "Around fourteen months the two lives have started to merge: a drawer at one place, a key on the other’s ring, a weekly grocery run that now goes off one list. Friends invite you as a pair. Moving in together may be under discussion, or already done, and the everyday has become the interesting part.",
      "Name the shared things before they turn invisible: a key, a pan, a date on a candle tag. That is the whole job this month. A sofa or a set of shelves as a present decides the next step for them, which is not a gift’s place, and letting the month pass as if nothing had changed misses what did.",
    ],
    faq: [
      { q: "What do you get for fourteen months together?", a: "Something about the life you now share: a recipe card for your weeknight dinner, a ticket with your door code, tags for the things that live at both places." },
      { q: "Is fourteen months a milestone?", a: "Not a traditional one. It is often the stretch where two routines become one, which is worth noticing even if nobody else counts the month." },
      { q: "How do I write about everyday things without it sounding dull?", a: "Be exact. The toothbrush, the pan and the bus line are more moving than general words about home, because they could only be yours." },
    ],
  },
  es: {
    title: "Regalos para 14 meses de novios: ya es «lo nuestro»",
    description: "A los 14 meses de novios, cajones, llaves y costumbres ya se mezclan. Regalos sobre lo cotidiano que ahora es «nuestro»: una etiqueta, un billete, una receta.",
    h1: "Regalos para 14 meses de novios",
    label: "14 meses",
    hero: {
      line: "Un cajón en su casa, una llave en tu llavero. Lo cotidiano ya se comparte.",
      sentence: "Con catorce meses la vida de cada día se mezcla, y el mejor regalo nombra las pequeñas cosas compartidas antes de que dejen de parecer nuevas.",
    },
    ideasTitle: "Cinco sobre lo que es nuestro",
    ideas: [
      {
        template: "picnic",
        heading: "Etiqueta todo lo que vive en las dos casas",
        brief: "Cada cosa de la cesta con una etiqueta sobre algo que ya vive en las dos casas.",
        body: "Etiqueta lo que ya vive en las dos casas: el cargador, el cepillo de dientes, la sartén buena. Cada cosa que sale de la cesta de Pícnic lleva una etiqueta, de tres a ocho, de cuarenta y ocho caracteres, y las fotos salen en marcos de cuadros. Elige una manta lila o azul, para variar.",
        line: { field: "labels", where: "La etiqueta de una cosa", text: "el cargador que técnicamente es mío" },
      },
      {
        template: "keepsake",
        heading: "Un billete con un número solo vuestro",
        brief: "Un billete en una caja de cosas guardadas, con un número que solo conocéis los dos.",
        body: "Elige un número que solo reconoceríais los dos: el código del portal, la línea del autobús, el piso de la primera casa donde os quedasteis a dormir. Recuerdo lo imprime en un billete, veintiséis caracteres, y lo guarda entre sus cosas, junto a las flores secas, el relicario y la palabra arrancada.",
        line: { field: "ticket", where: "El billete", text: "BUS 38 · FILA 2 · TUYO" },
      },
      {
        template: "fireside",
        heading: "La vela con la fecha en que fue casa",
        brief: "Una ventana, una taza caliente, fotos con pinzas y una vela con su etiqueta fechada.",
        body: "Catorce meses es el momento de poner fecha en la etiqueta de la vela, que admite veinticuatro caracteres. La vela está en la ventana de Junto al fuego, con nieve u hojas fuera, una taza de chocolate, té o café y fotos colgadas con pinzas de madera. Cuando se enciende, tu carta se despliega de la manta.",
        line: { field: "tag", where: "La etiqueta de la vela", text: "casa desde el 14/3" },
      },
      {
        template: "recipe-box",
        heading: "Una receta para la cena que ya compartís",
        brief: "Una tarjeta de receta con vuestra cena de diario, que se da la vuelta y es tu carta.",
        body: "Caja de recetas es una tarjeta de receta: un nombre de cuarenta y ocho caracteres, hasta seis ingredientes y una frase pequeña bajo el nombre que empieza por «Sale una…». Al darle la vuelta es tu carta, con fotos sujetas. Ponle a la receta el nombre de la cena que este año se convirtió en la de todos los martes.",
        line: { field: "recipeName", where: "El nombre de la receta", text: "La pasta de los martes, tras mucho debate" },
      },
      {
        template: "coquette",
        heading: "Palabras recortadas junto a la tira de fotos",
        brief: "Unas palabras recortadas junto a las fotos que dicen claramente dónde vivís ahora.",
        body: "Junto a la tira de fotos de Coquette van unas palabras recortadas y pegadas, veintiocho caracteres como mucho, y debajo hasta diez polaroids llevan a tu carta en papel rasgado. Catorce meses es buen momento para que esas palabras digan, sin adornos, dónde vivís ahora.",
        line: { field: "label", where: "Las palabras recortadas", text: "dos llaves, un sofá" },
      },
    ],
    date: { kind: "rainy-day", title: "Tarde de lluvia en un rocódromo", line: "Reservad la sesión de iniciación y animaos mutuamente pared arriba." },
    stage: [
      "Hacia los catorce meses las dos vidas empiezan a mezclarse: un cajón en una casa, una llave de más en el llavero, una compra semanal que ya es una sola lista. Los amigos os invitan en pareja. Quizá habláis de compartir piso, o ya lo compartís, y lo cotidiano se ha vuelto lo interesante.",
      "Nombra lo compartido antes de que se vuelva invisible: una llave, una sartén, una fecha en la etiqueta de una vela. Ese es todo el trabajo de este mes. Un sofá o una estantería como regalo deciden el siguiente paso por tu pareja, y eso no le toca a un regalo; dejar pasar el mes como si nada hubiera cambiado tampoco ve lo que sí cambió.",
    ],
    faq: [
      { q: "¿Qué se regala al cumplir catorce meses?", a: "Algo sobre la vida que ya compartís: una receta de vuestra cena de diario, un billete con el código del portal, etiquetas para lo que vive en las dos casas." },
      { q: "¿Los catorce meses son un hito?", a: "No uno tradicional. Suele ser el tramo en que dos rutinas se vuelven una, y eso merece notarse aunque nadie más cuente el mes." },
      { q: "¿Cómo escribo sobre cosas cotidianas sin que suene aburrido?", a: "Ve al detalle. El cepillo, la sartén y la línea del autobús emocionan más que las palabras generales sobre el hogar, porque solo pueden ser vuestros." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 15
// ---------------------------------------------------------------------------------------------

const month15: Month = {
  en: {
    title: "15 Month Anniversary Gifts for a Year and a Quarter",
    description: "Fifteen months in, there is a soundtrack, so these 15 month anniversary gifts are built on your songs: a record, a booth strip, a camera roll.",
    h1: "15 month anniversary gifts",
    label: "15 months",
    hero: {
      line: "A year and a quarter. By now the relationship has a soundtrack.",
      sentence: "Fifteen months of songs sent, played in the car and argued over is enough for an album, and these gifts start from that music.",
    },
    ideasTitle: "Five that start from your songs",
    ideas: [
      {
        template: "vinyl",
        heading: "The album of your first fifteen months",
        body: "Fifteen months of songs is a real tracklist, so give it a sleeve. Vinyl lets you title the album in forty characters and credit yourselves as the artist; the record turns with the song you choose, and up to twelve photos wait in the crate as other covers. Your message is printed on the liner notes.",
        line: { field: "album", where: "The album’s title", text: "Fifteen Months, Remastered" },
      },
      {
        template: "photo-booth",
        heading: "Four flashes, black and white this time",
        body: "For a year and a quarter, set Photo Booth’s strip to black and white: four photos, printed as if from an old booth on a pier. The line in pen on the wall beside it holds forty characters. Write the lyric you both get wrong, wrong on purpose.",
        line: { field: "line", where: "The words on the wall", text: "hold me closer, Tony Danza" },
      },
      {
        template: "fortune-cookie",
        heading: "Lucky numbers from your favorite songs",
        brief: "Lucky numbers set from your music: the track number, the year, the minute of the bridge.",
        body: "The lucky numbers under each fortune in Fortune Cookie are yours to set, forty characters of them. At fifteen months, take them from the music: the track number of your song, the year it came out, the minute of the bridge. Keep the fortunes themselves about the quarter ahead.",
        line: { field: "luckyNumbers", where: "The lucky numbers", text: "track 7, 1998, 2:41" },
      },
      {
        template: "xoxo",
        heading: "One word in script on the second photo",
        brief: "One word in script on the second photo, on a page of lace and newspaper letters.",
        body: "XOXO sets one word in script on its second polaroid, ten characters at most, on a page of lace and newspaper letters. Fifteen months is long enough to have a word that means more than it says: the name of your song, or what you call Sunday mornings. Put that word there.",
        line: { field: "word", where: "The word on the second photo", text: "encore" },
      },
      {
        template: "digicam",
        heading: "Every photo dated the day you met",
        brief: "Twelve photos with an orange date stamp, set to the day you met.",
        body: "Set the date stamp to the day you met, and every picture on Digicam’s roll looks like it was taken then: up to twelve photos, each with the orange date in the corner. Fifteen months later, that is a nice lie. The magazine cut-out title above it gets twenty-four characters; untick “It’s their birthday” so it keeps yours.",
        line: { field: "headline", where: "The cut-out title", text: "est. fifteen months ago" },
      },
    ],
    date: { kind: "double-date", title: "An escape room with friends, then the debrief", line: "Play as two couples and argue over dinner about who solved it." },
    stage: [
      "Fifteen months is a year and a quarter, a count only some couples keep. By now there is a soundtrack: songs from the car, the one from the first trip, the one one of you hates and the other plays anyway. Most of the firsts are done, and the repeats have started to matter more.",
      "A playlist link with nothing written beside it falls short. The opposite fails too: a present built to top the anniversary three months after it. Your music already exists, so the gift is the wrapping, something to open, a record, a booth strip, a camera roll, with one line that only the two of you would get.",
    ],
    faq: [
      { q: "Is 15 months worth celebrating?", a: "If you like marking quarters, yes, and a year and a quarter is a neat one. A small gift built on your songs fits it without making it heavy." },
      { q: "What do you give for a year and a quarter together?", a: "Something made from your music: an album titled after the fifteen months, lucky numbers from your song, a word from it under a photo." },
      { q: "How do I use our song in a gift?", a: "Pick it as the gift’s music in the editor, then name things after it: the album, the playlist, a word under a photo. The song does the rest." },
    ],
  },
  es: {
    title: "Regalos para 15 meses de novios: año y cuarto",
    description: "Al año y cuarto ya hay banda sonora. Regalos para los 15 meses de novios hechos con vuestras canciones: un disco, una tira de fotomatón, un carrete.",
    h1: "Regalos para 15 meses de novios",
    label: "15 meses",
    hero: {
      line: "Un año y cuarto. Llegados aquí la relación ya tiene banda sonora.",
      sentence: "Quince meses de canciones enviadas, puestas en el coche y discutidas dan para un álbum, y estos regalos empiezan por esa música.",
    },
    ideasTitle: "Cinco que empiezan por vuestras canciones",
    ideas: [
      {
        template: "vinyl",
        heading: "El álbum de vuestros primeros quince meses",
        body: "Quince meses de canciones son una lista de verdad, así que dales una funda. Vinilo te deja titular el álbum en cuarenta caracteres y firmar como artistas; el disco gira con la canción que elijas y hasta doce fotos esperan en la caja como otras portadas. Tu mensaje va impreso en el libreto.",
        line: { field: "album", where: "El título del álbum", text: "Quince meses, remasterizado" },
      },
      {
        template: "photo-booth",
        heading: "Cuatro flashes, esta vez en blanco y negro",
        body: "Para un año y cuarto, pon la tira de Fotomatón en blanco y negro: cuatro fotos impresas como en una cabina antigua de paseo marítimo. La frase a boli en el muro de al lado tiene sitio para cuarenta caracteres. Escribe la letra que los dos cantáis mal, mal a propósito.",
        line: { field: "line", where: "Las palabras del muro", text: "hold me closer, Tony Danza" },
      },
      {
        template: "fortune-cookie",
        heading: "Números de la suerte sacados de vuestras canciones",
        brief: "Números de la suerte sacados de la música: la pista, el año, el minuto del estribillo.",
        body: "Los números de la suerte de cada fortuna de Galleta de la fortuna los pones tú, cuarenta caracteres. A los quince meses, sácalos de la música: el número de pista de vuestra canción, el año en que salió, el minuto del estribillo. Que las fortunas hablen del trimestre que viene.",
        line: { field: "luckyNumbers", where: "Los números de la suerte", text: "pista 7, 1998, 2:41" },
      },
      {
        template: "xoxo",
        heading: "Una palabra en cursiva en la segunda foto",
        brief: "Una palabra en cursiva en la segunda foto, en una página de encaje y letras de periódico.",
        body: "XOXO pone una palabra en cursiva sobre su segunda polaroid, diez caracteres como mucho, en una página de encaje y letras de periódico. Quince meses dan para tener una palabra que significa más de lo que dice: el nombre de vuestra canción o cómo llamáis a los domingos por la mañana. Pon esa.",
        line: { field: "word", where: "La palabra de la segunda foto", text: "otra vez" },
      },
      {
        template: "digicam",
        heading: "Todas las fotos con la fecha del primer día",
        brief: "Doce fotos con la fecha naranja, puesta en el día en que os conocisteis.",
        body: "Pon en la fecha el día en que os conocisteis y todas las fotos del carrete de Digicam parecerán hechas entonces: hasta doce, con la fecha naranja en la esquina. Quince meses después, es una mentira bonita. El título recortado de revista de encima da para veinticuatro caracteres; desmarca «Es su cumpleaños» para que no felicite a nadie.",
        line: { field: "headline", where: "El título recortado", text: "desde hace quince meses" },
      },
    ],
    date: { kind: "double-date", title: "Un escape room con amigos, y luego el repaso", line: "Jugad por parejas y discutid en la cena quién lo resolvió." },
    stage: [
      "Quince meses son un año y cuarto, una cuenta que solo algunas parejas llevan. A estas alturas hay banda sonora: canciones del coche, la del primer viaje, la que odia una mitad de la pareja y la otra mitad pone igual. Casi todas las primeras veces han pasado, y las repeticiones empiezan a importar más.",
      "Un enlace a una playlist sin una palabra al lado se queda corto. Lo contrario también falla: un regalo pensado para superar al aniversario tres meses después. Vuestra música ya está hecha; el regalo es el envoltorio, algo que abrir, un disco, una tira de fotomatón, un carrete, con una frase que solo pilláis los dos.",
    ],
    faq: [
      { q: "¿Merece la pena celebrar los 15 meses?", a: "Si os gusta marcar los trimestres, sí, y año y cuarto es uno redondo. Un detalle hecho con vuestras canciones encaja sin ponerse serio." },
      { q: "¿Qué se regala cuando se cumple un año y cuarto?", a: "Algo hecho con vuestra música: un álbum titulado con los quince meses, números de la suerte sacados de vuestra canción, una palabra suya bajo una foto." },
      { q: "¿Cómo uso nuestra canción en un regalo?", a: "Elígela como música del regalo en el editor y luego ponle su nombre a las cosas: el álbum, la playlist, una palabra bajo una foto. La canción hace el resto." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 16
// ---------------------------------------------------------------------------------------------

const month16: Month = {
  en: {
    title: "16 Month Anniversary Gifts That Reveal the Next Trip",
    description: "A 16 month anniversary gift can be the next trip. Five digital gifts that reveal where you are going, clue by clue, down to the minute you leave.",
    h1: "16 month anniversary gifts",
    label: "16 months",
    hero: {
      line: "Trips are ordinary by now. Make the next one the reveal.",
      sentence: "At sixteen months you have traveled together enough to plan with confidence, so the gift is a destination, given away one clue at a time.",
    },
    ideasTitle: "Five that give away the destination",
    ideas: [
      {
        template: "pack-your-bags",
        heading: "Five luggage tags, one clue each",
        brief: "Up to five clues on luggage tags, then a departures board gives the place away.",
        body: "Pack Your Bags hands them luggage tags, one clue on each, up to five, before a departures board gives the destination away. Start vague and narrow it down. Choose plane, train or road trip, put the date on the ticket, and when they tear off the stub your letter is underneath.",
        line: { field: "clues", where: "One luggage tag", text: "Bring the shoes you never wear" },
      },
      {
        template: "passport",
        heading: "The route, with every stopover stamped",
        brief: "A passport with one stamped photo per page and a route of up to six stopovers.",
        body: "Show the trips you have already taken and end on the one that is booked. The route can have six stopovers, each a real town or city of up to forty characters that the passport finds on its map. Passport issues them a passport for the two of you and stamps one photo per page, up to ten.",
        line: { field: "stops", where: "One stopover", text: "Lyon" },
      },
      {
        template: "digicam",
        heading: "The last trip’s roll, before the next one",
        brief: "The last trip on a little camera roll, ending on a hint at the next one.",
        body: "Put the last trip on Digicam, up to twelve photos, flicked through with arrows or a swipe, and let the final photo hint at where you go next. After the roll prints as a strip, the letter can say it outright. Untick “It’s their birthday” first, and the title cut from magazines above the camera has room for twenty-four characters.",
        line: { field: "headline", where: "The cut-out title", text: "next stop: guess" },
      },
      {
        template: "scrapbook",
        heading: "A pinned note that says where it started",
        brief: "Polaroids and torn notes, with a pinned note naming where your travels began.",
        body: "Write where the traveling started on the pinned note, in forty characters: the first station, the first bad motel. Scrapbook keeps that note among its polaroids, stamps and torn notes; pick the Seaside pages if the next trip has a coast. The rest of the pages fill with photos.",
        line: { field: "tag", where: "The pinned note", text: "Track 4, the first one" },
      },
      {
        template: "midnight-countdown",
        heading: "A countdown to departure, not to midnight",
        body: "Midnight Countdown does not care what it counts to. Set it to the minute you leave, and the sky over the skyline darkens until then; at zero, fireworks, and the photos open. The line above the clock takes sixty characters. Name the trip there, or name nothing and let the clock tease.",
        line: { field: "headline", where: "Headline above the timer", text: "Until we leave. Pack light." },
      },
    ],
    date: { kind: "rainy-day", title: "A gallery hop to pick the next city", line: "Choose the trip from whichever painting you both stop at." },
    stage: [
      "Sixteen months in, there are usually a few trips behind you and a way of traveling together: who books, who packs, who finds the good bakery. The novelty of going away together has turned into a habit, which means the next trip can be planned well and given as a surprise.",
      "Check their calendar before anything else. A long vacation they never asked for, on dates they cannot get off work, turns a present into a problem, and a forwarded booking confirmation gives the surprise away in one line. The gift is the reveal itself: clues, a route, a countdown to the minute you leave, and the plan in a letter.",
    ],
    faq: [
      { q: "What is a good gift at sixteen months?", a: "Often the next trip, revealed properly: clues on luggage tags, a passport with the route, a countdown to the minute you leave. Check dates with their calendar first." },
      { q: "Can the gift open on the day we leave?", a: "It can. Pick a paid template and, before sending, go to Extras in the editor and switch on “Schedule the reveal”. Give it the morning you leave: date, hour and their time zone. If they open the link early, all they get is a countdown." },
      { q: "How do I hide a trip until the reveal?", a: "Keep the clues vague and in order, from the weather to the food to the place. On Pack Your Bags the board names the destination only at the end." },
    ],
  },
  es: {
    title: "Regalos para 16 meses de novios: el próximo viaje",
    description: "Para los 16 meses de novios, el regalo puede ser el próximo viaje: pistas en etiquetas de maleta, una ruta sellada y una cuenta atrás hasta la salida.",
    h1: "Regalos para 16 meses de novios",
    label: "16 meses",
    hero: {
      line: "Viajar ya es normal. Que el próximo viaje sea la sorpresa.",
      sentence: "A los dieciséis meses habéis viajado en pareja lo bastante para planear con seguridad, así que el regalo es un destino, desvelado pista a pista.",
    },
    ideasTitle: "Cinco que desvelan el destino",
    ideas: [
      {
        template: "pack-your-bags",
        heading: "Cinco etiquetas de maleta, una pista en cada una",
        brief: "Hasta cinco pistas en etiquetas de maleta, y un panel de salidas desvela el sitio.",
        body: "Haz la maleta le da etiquetas de equipaje, una pista en cada una, hasta cinco, antes de que un panel de salidas desvele el destino. Empieza por lo vago y ve cerrando. Elige avión, tren o coche, pon la fecha en el billete y, cuando arranque el resguardo, debajo estará tu carta.",
        line: { field: "clues", where: "Una etiqueta de maleta", text: "Trae los zapatos que nunca te pones" },
      },
      {
        template: "passport",
        heading: "La ruta, con cada escala sellada",
        brief: "Un pasaporte con una foto sellada por página y una ruta de hasta seis escalas.",
        body: "Enseña los viajes que ya habéis hecho y acaba en el que está reservado. La ruta admite seis escalas, cada una un pueblo o una ciudad de verdad de hasta cuarenta caracteres que el pasaporte encuentra en su mapa. Pasaporte le expide un pasaporte para los dos y sella una foto por página, hasta diez.",
        line: { field: "stops", where: "Una escala", text: "Lyon" },
      },
      {
        template: "digicam",
        heading: "El carrete del último viaje, antes del siguiente",
        brief: "El último viaje en el carrete de una camarita, que acaba con una pista del próximo.",
        body: "Pon el último viaje en Digicam, hasta doce fotos que se pasan con flechas o deslizando, y deja que la última foto insinúe adónde vais después. Cuando el carrete se imprime en tira, la carta puede decirlo claro. Desmarca antes «Es su cumpleaños»; el título recortado de revistas sobre la cámara llega a veinticuatro caracteres.",
        line: { field: "headline", where: "El título recortado", text: "próxima parada: adivina" },
      },
      {
        template: "scrapbook",
        heading: "Una nota clavada que dice dónde empezó",
        brief: "Polaroids y notas rasgadas, con una nota clavada que dice dónde empezaron los viajes.",
        body: "Escribe en la nota clavada dónde empezaron los viajes, en cuarenta caracteres: la primera estación, el primer hostal malo. Álbum de recortes la guarda entre sus polaroids, sellos y notas rasgadas; elige las páginas Playa si el próximo viaje tiene costa. El resto de páginas se llenan de fotos.",
        line: { field: "tag", where: "La nota clavada", text: "Andén 4, el primero" },
      },
      {
        template: "midnight-countdown",
        heading: "Una cuenta atrás hasta la salida, no hasta medianoche",
        body: "A Cuenta atrás de medianoche le da igual hacia qué cuenta. Ponla al minuto en que salís, y el cielo sobre la ciudad se oscurece hasta entonces; en el cero, fuegos, y se abren las fotos. La frase sobre el reloj admite sesenta caracteres. Nombra ahí el viaje, o no nombres nada y deja que el reloj provoque.",
        line: { field: "headline", where: "Titular sobre el reloj", text: "Hasta que salgamos. Maleta pequeña." },
      },
    ],
    date: { kind: "rainy-day", title: "Ruta de galerías para elegir la próxima ciudad", line: "Elegid el viaje por el cuadro ante el que os paréis los dos." },
    stage: [
      "A los dieciséis meses suele haber unos cuantos viajes a la espalda y una manera de viajar en pareja: quién reserva, quién hace la maleta, quién encuentra la buena panadería. La novedad de hacer las maletas para dos se ha vuelto costumbre, y por eso el próximo viaje puede planearse bien y darse como sorpresa.",
      "Antes que nada, mira su calendario. Unas vacaciones largas que no ha pedido, en fechas que no puede librar, convierten el regalo en un problema, y reenviar la confirmación de la reserva destripa la sorpresa en una línea. El regalo es el momento de contarlo: pistas, una ruta, una cuenta atrás hasta el minuto en que salís y el plan en una carta.",
    ],
    faq: [
      { q: "¿Qué es un buen regalo a los dieciséis meses?", a: "A menudo el próximo viaje, bien desvelado: pistas en etiquetas de maleta, un pasaporte con la ruta, una cuenta atrás hasta el minuto de salir. Mira antes su calendario." },
      { q: "¿Puede abrirse el regalo el día que nos vamos?", a: "Puede. Elige una plantilla de pago y, antes de enviarla, entra en Extras dentro del editor y enciende «Programar la apertura». Dale la mañana de la salida: fecha, hora y su zona horaria. Si abre el enlace antes, solo verá una cuenta atrás." },
      { q: "¿Cómo escondo un viaje hasta desvelarlo?", a: "Que las pistas sean vagas y vayan en orden, del tiempo a la comida y al sitio. En Haz la maleta el panel solo dice el destino al final." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 17
// ---------------------------------------------------------------------------------------------

const month17: Month = {
  en: {
    title: "17 Month Anniversary Gifts That Say the Plain Thing",
    description: "A 17 month anniversary has no tradition, which leaves room to say the plain thing. Five digital gifts built for one simple sentence, and a date to go back to.",
    h1: "17 month anniversary gifts",
    label: "17 months",
    hero: {
      line: "No round number, no occasion. Just the plain thing, said.",
      sentence: "Seventeen months carries no tradition at all, which makes it a good month to say something simple and true without dressing it up.",
    },
    ideasTitle: "Five plain ones, said well",
    ideas: [
      {
        template: "favorite-person",
        heading: "Who they are to you, in twenty-two characters",
        brief: "A torn note in the middle of the page, with the plain thing written on it.",
        body: "One torn note sits in the middle of the Favorite Person page, twenty-two characters long. Seventeen months in, skip the clever version and write the plain one. Around it go up to ten polaroids under gingham tape, in blush, lilac or peach, and your letter waits at the bottom.",
        line: { field: "title", where: "The torn note", text: "still my person" },
      },
      {
        template: "sticker-bomb",
        heading: "A promise on the empty page",
        body: "Sticker Bomb opens on an empty page with one line on it, forty characters, before the first sticker. Make that line the plain promise, and let the stickers be the joke around it, from the pack called “The soft ones” if you want it gentle. Up to six of your photos turn up among them as polaroids.",
        line: { field: "prompt", where: "The line on the empty page", text: "I would pick you again, every time." },
      },
      {
        template: "bouquet",
        heading: "One stem for every month, and a card",
        brief: "Seventeen stems, one a month, and a card that opens into your letter.",
        body: "Seventeen stems fit in Bouquet, which allows up to 24; pick the flowers and colors yourself, and they see the bunch gather on their screen. The card holds thirty characters and the full letter opens from it. At seventeen months, the card can carry the plain sentence and the letter the details.",
        line: { field: "cardNote", where: "On the card", text: "17 months, and glad of each" },
      },
      {
        template: "garden",
        heading: "A gate sign with the count burnt in",
        brief: "A gate with your count burnt into its sign, and a garden of photos behind it.",
        body: "Seventeen is a number worth burning into wood. A gate leads into The Garden, and its wooden sign takes twenty-four characters; behind it grow roses, peonies, wildflowers or sunflowers. Up to twelve photos hang on the trellis, a clip can go in too, and your letter waits on the potting table in the greenhouse.",
        line: { field: "sign", where: "The sign on the gate", text: "planted 17 months ago" },
      },
      {
        template: "paper-crane",
        heading: "A closing line that stays when it flies",
        brief: "Small things on the folds and the plain sentence on the line that stays behind.",
        body: "The closing line of Paper Crane is the one that stays on the table after the crane flies off, ninety characters at most. Give the folds the small things, up to six, and keep the plain sentence for the closing line, where it has the whole table to itself.",
        line: { field: "closing", where: "The line left behind", text: "I don’t need an occasion to tell you I like this. I just wanted it on paper." },
      },
    ],
    date: { kind: "first-date", title: "Back to where the first date was", line: "Order what you ordered then, and compare notes." },
    stage: [
      "Seventeen months has no tradition, no number to hang anything on, and that is its use. By now there is usually a shared shorthand and fewer things to prove. The plain sentences, I like this, I would do it again, are easier to say on a day that is not supposed to mean anything.",
      "Nobody expects month seventeen to have a reason, so a gift that dresses the day up as a milestone misses. The opposite mistake is quieter: assuming the plain thing goes without saying. Say it in one sentence, put it somewhere they will read it twice, and go back to where the first date was.",
    ],
    faq: [
      { q: "Should I mark seventeen months?", a: "Only if you like an excuse. Seventeen is no milestone, which makes a small gift feel like affection rather than duty, and a return to the first-date place makes it a day." },
      { q: "What do you write when there is no occasion?", a: "The plain thing: that you are glad, that you would choose this again. Short and direct reads better than clever when nothing is being celebrated." },
      { q: "What is a good date for seventeen months?", a: "Go back to where the first date was and order the same things. It costs little and gives you a whole evening of comparing what you each remember." },
    ],
  },
  es: {
    title: "Regalos para 17 meses de novios que lo dicen claro",
    description: "Los 17 meses de novios no tienen tradición, y eso deja sitio para decir lo sencillo. Cinco regalos digitales para una frase clara, y una cita a la que volver.",
    h1: "Regalos para 17 meses de novios",
    label: "17 meses",
    hero: {
      line: "Sin número redondo, sin ocasión. Solo lo sencillo, dicho.",
      sentence: "Los diecisiete meses no tienen ninguna tradición, y por eso son buen mes para decir algo simple y cierto sin adornarlo.",
    },
    ideasTitle: "Cinco sencillos, bien dichos",
    ideas: [
      {
        template: "favorite-person",
        heading: "Quién es para ti, en veintidós caracteres",
        brief: "Una nota rasgada en el centro de la página, con lo sencillo escrito en ella.",
        body: "En el centro de la página de Mi persona favorita va una nota rasgada de veintidós caracteres. Con diecisiete meses, sáltate la versión ingeniosa y escribe la sencilla. Alrededor van hasta diez polaroids con cinta de cuadros, en rosa, lila o melocotón, y tu carta espera al final.",
        line: { field: "title", where: "La nota rasgada", text: "sigues siendo tú" },
      },
      {
        template: "sticker-bomb",
        heading: "Una promesa en la página vacía",
        brief: "Una sola frase en una página vacía antes del primer sticker: la promesa sencilla.",
        body: "Bomba de Stickers se abre en una página vacía con una sola frase, de cuarenta caracteres, antes del primer sticker. Que esa frase sea la promesa sencilla, y que los stickers sean la broma de alrededor: el pack Los tiernos, si lo quieres suave. Hasta seis fotos tuyas caen entre ellos como polaroids.",
        line: { field: "prompt", where: "La frase de la página vacía", text: "Te volvería a elegir, cada vez." },
      },
      {
        template: "bouquet",
        heading: "Un tallo por cada mes, y una tarjeta",
        brief: "Diecisiete tallos, uno por mes, y una tarjeta que se abre en tu carta.",
        body: "En Ramo caben diecisiete tallos, porque admite hasta 24; elige tú las flores y los colores, y el ramo se va juntando en su pantalla. La tarjeta tiene sitio para treinta caracteres y la carta entera se abre desde ella. A los diecisiete meses, la tarjeta puede llevar la frase sencilla y la carta los detalles.",
        line: { field: "cardNote", where: "En la tarjeta", text: "Diecisiete. Y sigo feliz." },
      },
      {
        template: "garden",
        heading: "Un cartel en la verja con la cuenta grabada",
        brief: "Una verja con vuestra cuenta grabada en el cartel y un jardín de fotos detrás.",
        body: "Diecisiete es un número que merece ir grabado a fuego. La entrada de El jardín es una verja con un cartel de madera de veinticuatro caracteres; detrás crecen rosas, peonías, flores silvestres o girasoles. Hasta doce fotos cuelgan del enrejado, también cabe un vídeo, y tu carta espera en la mesa del invernadero.",
        line: { field: "sign", where: "El cartel de la verja", text: "plantado hace 17 meses" },
      },
      {
        template: "paper-crane",
        heading: "Una frase final que se queda al volar",
        brief: "Las cosas pequeñas en los pliegues y la frase sencilla en la que se queda atrás.",
        body: "La frase final de Grulla de papel es la que se queda en la mesa cuando la grulla sale volando, de noventa caracteres como mucho. Dale a los pliegues las cosas pequeñas, hasta seis, y guarda la frase sencilla para el final, donde tiene la mesa entera para ella sola.",
        line: { field: "closing", where: "La frase que se queda", text: "No necesito una ocasión para decirte que esto me gusta. Solo quería ponerlo por escrito." },
      },
    ],
    date: { kind: "first-date", title: "Volver a donde fue la primera cita", line: "Pedid lo mismo que entonces y comparad lo que recordáis." },
    stage: [
      "Los diecisiete meses no tienen tradición ni un número del que colgar nada, y para eso sirven. Para entonces suele haber abreviaturas propias y menos cosas que demostrar. Las frases sencillas, me gusta esto, lo volvería a hacer, se dicen mejor en un día que no tiene por qué significar nada.",
      "Nadie espera que el mes diecisiete tenga motivo, así que un regalo que lo disfraza de hito no acierta. El error contrario hace menos ruido: dar por hecho que lo sencillo no hace falta decirlo. Dilo en una frase, ponlo donde se lea dos veces y volved al sitio de la primera cita.",
    ],
    faq: [
      { q: "¿Celebro los diecisiete meses?", a: "Solo si te gusta tener excusa. El diecisiete no es un hito, así que nadie espera nada y un detalle pequeño es solo cariño; volver al sitio de la primera cita lo convierte en un día." },
      { q: "¿Qué se escribe cuando no hay ocasión?", a: "Lo sencillo: que te alegras, que volverías a elegir esto. Cuando no se celebra nada, lo corto y directo se lee mejor que lo ingenioso." },
      { q: "¿Qué cita encaja a los diecisiete meses?", a: "Volver a donde fue la primera y pedir lo mismo. Cuesta poco y da para una noche entera comparando recuerdos." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 18
// ---------------------------------------------------------------------------------------------

const month18: Month = {
  en: {
    title: "18 Month Anniversary Gifts for a Year and a Half",
    description: "A year and a half in, the talk often turns to a shared lease. Six 18 month anniversary gifts that look back over it, from a museum of you to a front page.",
    h1: "18 month anniversary gifts",
    label: "18 months",
    hero: {
      line: "A year and a half. Often, the month the lease comes up.",
      sentence: "Eighteen months is the second half-year anyone marks, long enough for a gallery of photos and often the point where two addresses start talking about becoming one.",
    },
    ideasTitle: "Six for a year and a half",
    ideas: [
      {
        template: "museum",
        heading: "Plaques that say months, not years",
        brief: "Each photo framed over a plaque, its month in the caption, in a gallery they swipe through.",
        body: "Every photo in Museum hangs over a plaque with its caption and one dating of up to twenty characters, the same on every plaque, the kind a gallery would print. Make that dating the whole stretch, then put each picture’s month in its caption and title them as a curator would. They swipe from room to room, two to twenty photos in all.",
        line: { field: "years", where: "The dating on every plaque", text: "Months 1–18" },
      },
      {
        template: "bloom",
        heading: "A first plant for a shared windowsill",
        brief: "One flower on a windowsill that opens only while they hold the screen.",
        body: "If the talk is about one address, start with what goes on its windowsill. Bloom grows a single peony, tulip or daisy from a pot on a sill, and it opens petal by petal only while their finger stays down. Once it is open, up to eight photos drift up around it, and then your message opens on a card. Pick the flower you would really buy for the new place.",
        line: { field: "message", where: "The message inside", text: "Eighteen months in, and this is the first thing I want on our windowsill." },
      },
      {
        template: "recipe-box",
        heading: "A recipe that makes one shared kitchen",
        brief: "A recipe card whose small line finishes “Makes one…” with the home you are planning.",
        body: "Under the recipe’s name in Recipe Box sits a small line that finishes “Makes one…”, ninety characters, above up to six ingredients. At a year and a half, finish it with the home you are talking about. Turn the card over and your letter is on the back with photos clipped on.",
        line: { field: "makes", where: "After “Makes one…”", text: "kitchen with two of everything and one good knife between us" },
      },
      {
        template: "jar-of-reasons",
        heading: "Eighteen reasons, folded into a jar",
        brief: "Eighteen folded notes, one a month, shaken out of a jar one at a time.",
        body: "Every time they shake the phone, one folded note tumbles out of Jar of Reasons, which takes three notes at least and a hundred at most, each up to 160 characters. Eighteen is a good count for a year and a half. Write one about each month, in order, and pin a photo to the ones that have one.",
        line: { field: "reasons", where: "One note in the jar", text: "Month 14: you learned the bus schedule so I would not have to." },
      },
      {
        template: "our-timeline",
        heading: "A road with eighteen dated stops",
        brief: "Eighteen dated photos pinned along a road that draws itself as they scroll.",
        body: "Up to twenty photos fit on Our Timeline, each pinned to the road with a date of up to forty characters, and the road draws itself as they scroll. Eighteen stops, one a month, is a long walk through the relationship. Date the stops the way you would say them out loud, not as numbers.",
        line: { field: "dates", where: "The date on a stop", text: "the week of the leaky ceiling" },
      },
      {
        template: "front-page",
        heading: "The lease, reported as breaking news",
        brief: "A newspaper with their name on the masthead and the move-in date in the sub-headline.",
        body: "Front Page sets your story under a masthead with their name on it, a headline above and a sub-headline of up to 140 characters beneath. If the talk at eighteen months is about moving in, the sub-headline is where the date and the address go, in sober newspaper prose.",
        line: { field: "subhead", where: "The sub-headline", text: "Sources confirm a shared address from the first of next month. Neighbors have been warned." },
      },
    ],
    date: { kind: "romantic", title: "Dress up for the theater, for once", line: "Book two seats and let the evening run late." },
    stage: [
      "A year and a half is the second half-year that people tend to notice. Living together has usually come up by now, and some have signed a first shared lease or are about to. The friends are shared, the families have met more than once, and the future gets mentioned without anyone flinching.",
      "If moving in is on both your minds, a card that ignores it falls flat, and a gift that decides it for them oversteps. What sits between the two is a look back over eighteen months, a plaque or a note for each, with room for the next address if you both want it there.",
    ],
    faq: [
      { q: "Is eighteen months a big anniversary?", a: "It is the second half-year, and it often gets marked more than the months around it. A gift with eighteen photos or reasons, one a month, fits well." },
      { q: "What do you get for a year and a half together?", a: "A gift that looks over the whole stretch: a museum of eighteen photos, a road of dated stops, a jar of eighteen reasons. If moving in is on the table, a front page can announce it." },
      { q: "Should I bring up moving in with a gift?", a: "Only if you have already talked about it. A gift can celebrate a decision you made together; it is a poor place to propose one." },
    ],
  },
  es: {
    title: "Regalos para 18 meses de novios: año y medio",
    description: "Año y medio, y a menudo se habla del primer piso compartido. Seis regalos para los 18 meses de novios que repasan el tramo, de un museo a una portada.",
    h1: "Regalos para 18 meses de novios",
    label: "18 meses",
    hero: {
      line: "Año y medio. A menudo, el mes en que sale lo del piso.",
      sentence: "Los dieciocho meses son el segundo medio año que se celebra, dan para una galería de fotos y a menudo son cuando dos direcciones empiezan a hablar de ser una.",
    },
    ideasTitle: "Seis para año y medio",
    ideas: [
      {
        template: "museum",
        heading: "Placas que dicen meses, no años",
        brief: "Cada foto enmarcada sobre una placa, con su mes en el pie, en una galería para deslizar.",
        body: "Cada foto de Museo cuelga sobre una placa con su pie y una datación de hasta veinte caracteres, la misma en todas las placas, como las que imprimiría una galería. Que la datación sea el tramo entero; pon el mes de cada imagen en su pie y titúlalas como lo haría un comisario. Se pasa de sala en sala deslizando, de dos a veinte fotos en total.",
        line: { field: "years", where: "La datación de todas las placas", text: "Meses 1 a 18" },
      },
      {
        template: "bloom",
        heading: "Una primera planta para la ventana compartida",
        brief: "Una flor en el alféizar que solo se abre mientras se mantiene el dedo en la pantalla.",
        body: "Si se habla de una sola dirección, empieza por lo que irá en su ventana. Flor hace crecer una peonía, un tulipán o una margarita en una maceta sobre el alféizar, y se abre pétalo a pétalo solo mientras el dedo sigue en la pantalla. Cuando está abierta, suben hasta ocho fotos a su alrededor y después tu mensaje se abre en una tarjeta. Elige la flor que de verdad compraríais para la casa nueva.",
        line: { field: "message", where: "El mensaje de dentro", text: "Dieciocho meses, y lo primero que quiero en nuestra ventana es esto." },
      },
      {
        template: "recipe-box",
        heading: "Una receta que da para una cocina compartida",
        brief: "Una tarjeta de receta cuya frase pequeña completa «Sale una…» con la casa que planeáis.",
        body: "Bajo el nombre de la receta, Caja de recetas pone una frase pequeña que completa «Sale una…», noventa caracteres, encima de hasta seis ingredientes. A año y medio, termínala con la casa de la que habláis. Dale la vuelta a la tarjeta y tu carta está detrás, con fotos sujetas.",
        line: { field: "makes", where: "Después de «Sale una…»", text: "cocina con dos de todo y un solo cuchillo bueno" },
      },
      {
        template: "jar-of-reasons",
        heading: "Dieciocho razones dobladas en un frasco",
        brief: "Dieciocho notas dobladas, una por mes, que salen del frasco de una en una.",
        body: "Cada vez que se agita el móvil, cae una nota doblada de Frasco de razones, que admite tres como mínimo y cien como mucho, de hasta 160 caracteres. Dieciocho es buena cuenta para año y medio. Escribe una sobre cada mes, en orden, y pon foto a las que la tengan.",
        line: { field: "reasons", where: "Una nota del frasco", text: "Mes 14: te aprendiste los horarios del bus para que yo no tuviera que hacerlo." },
      },
      {
        template: "our-timeline",
        heading: "Un camino con dieciocho paradas con fecha",
        brief: "Dieciocho fotos con fecha clavadas en un camino que se dibuja al deslizar.",
        body: "Hasta veinte fotos caben en Nuestra línea del tiempo, cada una clavada en el camino con una fecha de hasta cuarenta caracteres, y el camino se dibuja a medida que se desliza. Dieciocho paradas, una por mes, son un buen paseo por la relación. Pon las fechas como las diríais en voz alta, no como números.",
        line: { field: "dates", where: "La fecha de una parada", text: "la semana de la gotera" },
      },
      {
        template: "front-page",
        heading: "El piso, contado como noticia de última hora",
        brief: "Un periódico con su nombre en la cabecera y la fecha de la mudanza en el subtítulo.",
        body: "Portada pone vuestra historia bajo una cabecera con su nombre, con un titular encima y un subtítulo de hasta 140 caracteres debajo. Si a los dieciocho meses se habla de compartir casa, el subtítulo es donde van la fecha y la dirección, en prosa seria de periódico.",
        line: { field: "subhead", where: "El subtítulo", text: "Fuentes confirman una dirección compartida a partir del día uno del mes que viene. Los vecinos están avisados." },
      },
    ],
    date: { kind: "romantic", title: "Vestíos para el teatro, por una vez", line: "Comprad dos butacas y dejad que la noche se alargue." },
    stage: [
      "Año y medio es el segundo medio año que casi todo el mundo nota. Llegados aquí lo de compartir casa ya ha salido, y hay quien ha firmado su primer contrato de alquiler o está a punto. Los amigos son comunes, las familias se han visto más de una vez y el futuro sale en la conversación sin que nadie se ponga tenso.",
      "Si la mudanza os ronda a los dos, una tarjeta que hace como si nada se queda corta, y un regalo que la decide sin preguntar se pasa. En medio cabe un repaso de los dieciocho meses, una placa o una nota por cada uno, con sitio para la próxima dirección si los dos la queréis ahí.",
    ],
    faq: [
      { q: "¿Los dieciocho meses son un aniversario importante?", a: "Son el segundo medio año, y suelen celebrarse más que los meses de alrededor. Encaja un regalo con dieciocho fotos o razones, una por mes." },
      { q: "¿Qué se regala por año y medio de relación?", a: "Un regalo que repase todo el tramo: un museo de dieciocho fotos, un camino de paradas con fecha, un frasco con dieciocho razones. Si vais a compartir casa, una portada puede anunciarlo." },
      { q: "¿Saco el tema de compartir casa con un regalo?", a: "Solo si ya lo habéis hablado. Un regalo puede celebrar una decisión que ya tomasteis los dos; es mal sitio para proponerla." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 19
// ---------------------------------------------------------------------------------------------

const month19: Month = {
  en: {
    title: "19 Month Anniversary Gifts, Small and Sure",
    description: "A 19 month anniversary comes with no custom at all, so the gift can be small and sure of itself. Five for an odd month, each with a line to borrow.",
    h1: "19 month anniversary gifts",
    label: "19 months",
    hero: {
      line: "An odd month with no custom. Small, and sure of itself.",
      sentence: "Nineteen months asks nothing of you, so a gift now is pure choice, and it can be modest without anyone wondering whether it is enough.",
    },
    ideasTitle: "Five modest ones that know what they mean",
    ideas: [
      {
        template: "xoxo",
        heading: "The lines you would underline, underlined",
        brief: "A few sentences of yours, some underlined and circled, under a nickname cut from newspaper.",
        body: "XOXO takes a few sentences of yours, up to 220 characters, and underlines, circles and highlights some of them for you, under a nickname cut from newspaper. Nineteen months is a good time for the sentence you would say if you were braver. Up to nine polaroids sit on a lace doily above.",
        line: { field: "lines", where: "The lines you’d underline", text: "Nineteen months and I still check my phone hoping it is you. It usually is. I have stopped pretending that is a coincidence." },
      },
      {
        template: "on-repeat",
        heading: "A playlist for a month with no name",
        brief: "A playlist of the photos taken when nothing was happening, captions as song titles.",
        body: "Name the playlist in On Repeat for this odd month, twenty-four characters, and fill it with the photos you took when nothing was happening: the bus, the laundry, the checkout line. Each becomes a track with your caption as the song title. Small months make good albums.",
        line: { field: "playlist", where: "The playlist’s name", text: "nothing happened, deluxe" },
      },
      {
        template: "paper-crane",
        heading: "Six small folds for an odd month",
        body: "The crane folds only while they hold it, crease by crease, and lets go if they hurry. Each finished fold in Paper Crane shows a line of up to seventy-two characters. For nineteen months, write six small, sure lines, nothing grand, and keep the paper ivory or sage so the words carry it.",
        line: { field: "lines", where: "The line on one fold", text: "You always leave the last cookie. I noticed." },
      },
      {
        template: "coquette",
        heading: "A ticket that admits one to a Thursday evening",
        brief: "A ticket that admits them to something small and real, beside photos and a postcard.",
        body: "Coquette’s ticket says what it admits them to, twenty-six characters, beside a strip of photos, torn-out words and a handwritten postcard. Make it something small and real, the dinner you will cook on Thursday. The letter at the bottom of the page, on torn paper, can explain the rest.",
        line: { field: "ticket", where: "The ticket", text: "admit one: Thursday pasta" },
      },
      {
        template: "the-council",
        heading: "A charge, dismissed, for a minor offense",
        brief: "Cats hear a tiny charge, read out your findings and stamp it pardoned.",
        body: "In The Council the cats call the hearing to order, read out findings you wrote, and bring down a stamp: guilty, approved, certified or pardoned. The charge takes sixty characters. For an odd month, charge them with something tiny and choose pardoned, which is what you have been doing for nineteen months anyway.",
        line: { field: "charge", where: "The charge", text: "leaving one sip in every glass, for nineteen months" },
      },
    ],
    date: { kind: "fun", title: "Skating badly, then hot chocolate", line: "Hold hands and the rail, in that order." },
    stage: [
      "Nineteen months is an odd month with no custom attached, between the year and a half and the two years. Few couples are still counting by now, which is exactly why a gift gets noticed. Life is busy with rent and laundry and other people’s birthdays, and the relationship is part of the furniture in the best sense.",
      "Would it need explaining? If so, the gesture is too big for nineteen months. Skipping the month only misses if you have kept the habit of marking each one. A playlist of nothing in particular or a pardoned charge is about the size, with one sentence in it that does not hedge.",
    ],
    faq: [
      { q: "Do people celebrate 19 months?", a: "Rarely, which makes it a good month for a small gift that needs no reason. If you have stopped counting months, a nineteen-month gift is a pleasant surprise." },
      { q: "What is a small gift for nineteen months?", a: "A playlist of days when nothing happened, a ticket to a Thursday dinner, a charge they are pardoned for. Any of them can be made on a lunch break, and none needs a reason." },
      { q: "How do I write something sincere without making it heavy?", a: "Pair it with a joke. One line that is true, inside a gift that is light, gets read twice and never feels like a speech." },
    ],
  },
  es: {
    title: "Regalos para 19 meses de novios, pequeños y seguros",
    description: "Sin costumbre para los 19 meses de novios, el regalo puede ser pequeño y seguro de sí. Cinco para un mes impar, cada uno con una frase lista.",
    h1: "Regalos para 19 meses de novios",
    label: "19 meses",
    hero: {
      line: "Un mes impar sin costumbre. Pequeño, y seguro de sí mismo.",
      sentence: "Los diecinueve meses no te piden nada, así que un regalo ahora es pura elección, y puede ser modesto sin que nadie se pregunte si basta.",
    },
    ideasTitle: "Cinco modestos que saben lo que dicen",
    ideas: [
      {
        template: "xoxo",
        heading: "Las frases que subrayarías, ya subrayadas",
        brief: "Unas frases tuyas, algunas subrayadas y rodeadas, bajo un mote recortado de periódico.",
        body: "XOXO toma unas frases tuyas, hasta 220 caracteres, y subraya, rodea y resalta algunas por ti, bajo un mote recortado de periódico. Diecinueve meses son buen momento para la frase que dirías si te atrevieras. Hasta nueve polaroids van encima, sobre un tapete de encaje.",
        line: { field: "lines", where: "Las frases que subrayarías", text: "Diecinueve meses y sigo mirando el móvil esperando que seas tú. Casi siempre lo eres. He dejado de fingir que es casualidad." },
      },
      {
        template: "on-repeat",
        heading: "Una playlist para un mes sin nombre",
        brief: "Una playlist con las fotos de cuando no pasaba nada, los pies como títulos.",
        body: "Ponle nombre a la playlist de En bucle para este mes impar, veinticuatro caracteres, y llénala con las fotos de cuando no pasaba nada: el autobús, la colada, la cola. Cada foto pasa a ser una canción cuyo título es tu pie de foto. Los meses pequeños hacen buenos discos.",
        line: { field: "playlist", where: "El nombre de la playlist", text: "no pasó nada (deluxe)" },
      },
      {
        template: "paper-crane",
        heading: "Seis pliegues pequeños para un mes impar",
        body: "La grulla solo se dobla mientras se mantiene pulsado cada pliegue, y se abre si hay prisa. Cada pliegue terminado de Grulla de papel muestra una frase de hasta setenta y dos caracteres. Para los diecinueve meses, escribe seis frases pequeñas y seguras, nada grandioso, y deja el papel marfil o salvia para que las palabras lo llenen.",
        line: { field: "lines", where: "La frase de un pliegue", text: "Siempre me dejas la última galleta. Me he dado cuenta." },
      },
      {
        template: "coquette",
        heading: "Una entrada para la noche del jueves",
        brief: "Un billete que da entrada a algo pequeño y real, junto a fotos y una postal.",
        body: "El billete de Coquette dice a qué da entrada, veintiséis caracteres, junto a una tira de fotos, unas palabras recortadas y una postal escrita a mano. Que sea algo pequeño y real, la cena que vas a cocinar el jueves. La carta del final de la página, en papel rasgado, puede explicar lo demás.",
        line: { field: "ticket", where: "El billete", text: "entrada: pasta del jueves" },
      },
      {
        template: "the-council",
        heading: "Una acusación, indultada, por una falta leve",
        brief: "Los gatos oyen un cargo diminuto, leen tus conclusiones y lo sellan con indulto.",
        body: "En El Consejo los gatos abren la sesión, leen las conclusiones que escribiste y bajan un sello: «Culpable», «Visto bueno», «Icono certificado» o «Indulto». La acusación da para sesenta caracteres. Para un mes impar, que la acusación sea por algo diminuto y el sello, «Indulto», que es lo que llevas diecinueve meses haciendo de todos modos.",
        line: { field: "charge", where: "El cargo", text: "dejar un sorbo en cada vaso, diecinueve meses" },
      },
    ],
    date: { kind: "fun", title: "Patinar mal y luego chocolate caliente", line: "Cogeos de la mano y de la barandilla, por ese orden." },
    stage: [
      "Diecinueve meses es un mes impar sin costumbre, entre el año y medio y los dos años. Ya son pocas las parejas que siguen contando, y justo por eso un regalo se nota. La vida está llena de alquiler, coladas y cumpleaños de los demás, y la relación ya es parte de la casa en el mejor sentido.",
      "¿Habría que explicarlo? Si es así, el gesto se le queda grande a los diecinueve meses. Saltarse el mes solo falla si mantenéis la costumbre de celebrar cada uno. Una playlist de nada en concreto o una acusación indultada tienen la talla, con una frase dentro que no se ande con rodeos.",
    ],
    faq: [
      { q: "¿Se celebran los 19 meses?", a: "Rara vez, y por eso es buen mes para un detalle pequeño que no necesita motivo. Si habéis dejado de contar meses, un regalo a los diecinueve es una sorpresa agradable." },
      { q: "¿Qué detalle pequeño se hace a los diecinueve meses?", a: "Una playlist de días en los que no pasó nada, una entrada para la cena del jueves, una acusación con indulto. Cualquiera se hace en una pausa para comer, y ninguno necesita motivo." },
      { q: "¿Cómo escribo algo sincero sin que pese?", a: "Acompáñalo de una broma. Una frase verdadera dentro de un regalo ligero se lee dos veces y nunca suena a discurso." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 20
// ---------------------------------------------------------------------------------------------

const month20: Month = {
  en: {
    title: "20 Month Anniversary Gifts Worth Keeping",
    description: "A 20 month anniversary deserves something kept rather than used up. Five gifts built like boxes of keepsakes, from a sealed parcel to a record on side B.",
    h1: "20 month anniversary gifts",
    label: "20 months",
    hero: {
      line: "Twenty months. Something to keep, not something to use up.",
      sentence: "At twenty months there are enough kept things, tickets, notes, a pressed flower, to fill a box, and these gifts are built like boxes of keepsakes.",
    },
    ideasTitle: "Five to keep, not to use up",
    ideas: [
      {
        template: "keepsake",
        heading: "A parcel of kept things, with one word",
        brief: "A sealed parcel of kept things: a first photo, a ticket, a locket and one torn word.",
        body: "Keepsake is built for this month: a parcel tied with twine under a wax seal, holding the things worth keeping, a locket, a ticket, pressed flowers over the first photo, and one word cut from a page, fourteen characters at most. Twenty months is long enough to know which word they would keep. Your letter is typed on aged paper.",
        line: { field: "word", where: "The torn-out word", text: "always" },
      },
      {
        template: "scrapbook",
        heading: "A scrapbook title cut from magazines",
        brief: "Magazine letters for the title and twelve photos developing as polaroids below.",
        body: "The cut-out title of Scrapbook is twenty-eight characters of magazine letters across the top, and below it your photos develop as polaroids among tape, stamps and a roll of film. Twenty months of photos is too many: choose twelve, the ones you would rescue first, and let the title count the months.",
        line: { field: "headline", where: "The cut-out title", text: "twenty months, kept" },
      },
      {
        template: "the-council",
        heading: "Findings read into the record, to keep",
        brief: "Six findings read out by cats, for the record, before a stamp marks it certified.",
        body: "A finding in The Council is a line of up to ninety characters that one of the cats reads out, six findings at most, before the stamp comes down. Twenty months gives you a record to read into: the moments you would want on file. Choose certified for the stamp, so it sounds official.",
        line: { field: "findings", where: "One of the findings", text: "On file: the night you drove two hours with soup because I had a cold." },
      },
      {
        template: "garden",
        heading: "A bouquet tag as the last thing they read",
        brief: "A walk through a garden of photos that ends on a tag, the last thing they read.",
        body: "The Garden ends on a bouquet with a tag, sixty characters, and the editor calls it the last thing they read. Before that they walk past roses, peonies, wildflowers or sunflowers, a trellis with up to twelve photos, and your letter on the potting table. At twenty months, put on the tag what you are keeping.",
        line: { field: "tag", where: "The tag on the bouquet", text: "For you, from twenty months of me paying attention" },
      },
      {
        template: "vinyl",
        heading: "Side B, starting now",
        brief: "A record turning with your song, and a side label that calls this side B.",
        body: "The side label in Vinyl holds twelve characters, a sticker in the middle of the record that turns as the song plays. Twenty months is an excuse to flip the record: call this side B. The photos in the crate beside the deck, up to twelve, can be the first year, and the liner notes the second.",
        line: { field: "side", where: "The side label", text: "Side B" },
      },
    ],
    date: { kind: "fun", title: "Arcade night, and keep the tickets", line: "Trade the tickets for the silliest prize and keep it." },
    stage: [
      "Twenty months is long enough to have a drawer of kept things: tickets, a receipt from somewhere, a note left on a pillow, a dried flower from a wedding you went to together. Counting stopped a while ago, plenty of couples share a home, and the history is starting to need somewhere to go.",
      "A message in the chat scrolls out of sight by Friday, and a gift that tries to be the second anniversary early takes the shine off the real one. Twenty months suits something kept: a parcel, a scrapbook, a record, a box with the months inside, built so they can open it again in a year.",
    ],
    faq: [
      { q: "What is a good gift for twenty months together?", a: "Something built to be kept: a parcel of kept things with a locket, a scrapbook of twelve chosen photos, a record with this side marked B." },
      { q: "Is it worth marking twenty months?", a: "If you like round numbers, yes. It is four months before two years, so keep it small and kept, and save the speech for the anniversary." },
      { q: "Can they open a gift again later?", a: "Yes. Links are meant to be permanent, so a gift made at twenty months still opens at two years, and on the next anniversary after that." },
    ],
  },
  es: {
    title: "Regalos para 20 meses de novios para guardar",
    description: "Los 20 meses de novios merecen algo que se guarde, no algo que se gaste. Cinco regalos hechos como cajas de recuerdos, de un paquete sellado a una cara B.",
    h1: "Regalos para 20 meses de novios",
    label: "20 meses",
    hero: {
      line: "Veinte meses. Algo para guardar, no para gastar.",
      sentence: "A los veinte meses hay suficientes cosas guardadas, entradas, notas, una flor prensada, para llenar una caja, y estos regalos están hechos como cajas de recuerdos.",
    },
    ideasTitle: "Cinco para guardar, no para gastar",
    ideas: [
      {
        template: "keepsake",
        heading: "Un paquete de cosas guardadas, con una palabra",
        brief: "Un paquete sellado de cosas guardadas: una primera foto, un billete, un relicario y una palabra.",
        body: "Recuerdo está hecho para este mes: un paquete atado con cordel bajo un sello de lacre que guarda lo que merece guardarse, un relicario, un billete, flores prensadas sobre la primera foto y una palabra recortada de una página, de catorce caracteres como mucho. Veinte meses dan para saber qué palabra elegiría si solo pudiera guardar una. Tu carta va a máquina en papel envejecido.",
        line: { field: "word", where: "La palabra arrancada", text: "siempre" },
      },
      {
        template: "scrapbook",
        heading: "Un título de álbum recortado de revistas",
        brief: "Letras de revista para el título y doce fotos revelándose como polaroids debajo.",
        body: "El título recortado de Álbum de recortes son veintiocho caracteres de letras de revista arriba del todo, y debajo tus fotos se revelan como polaroids entre cinta, sellos y un carrete. Veinte meses de fotos son demasiadas: elige doce, las que salvarías primero, y deja que el título cuente los meses.",
        line: { field: "headline", where: "El título recortado", text: "veinte meses, guardados" },
      },
      {
        template: "the-council",
        heading: "Conclusiones que constan en acta, para guardar",
        brief: "Seis conclusiones leídas por gatos, para que consten, antes de un sello certificado.",
        body: "Una conclusión de El Consejo es una frase de hasta noventa caracteres que lee uno de los gatos, seis como mucho, antes de que caiga el sello. Veinte meses dan para un acta: los momentos que querrías archivados. Elige «Icono certificado» para el sello, para que suene oficial.",
        line: { field: "findings", where: "Una de las conclusiones", text: "Consta: la noche que condujiste dos horas con sopa porque me había resfriado." },
      },
      {
        template: "garden",
        heading: "Una etiqueta de ramo, lo último que se lee",
        brief: "Un paseo por un jardín de fotos que acaba en una etiqueta, lo último que se lee.",
        body: "El jardín termina en un ramo con una etiqueta de sesenta caracteres, y el editor dice que es lo último que se lee. Antes se pasa por rosas, peonías, flores silvestres o girasoles, un enrejado con hasta doce fotos y tu carta en la mesa del invernadero. A los veinte meses, pon en la etiqueta lo que guardas.",
        line: { field: "tag", where: "La etiqueta del ramo", text: "Para ti, tras veinte meses fijándome en ti" },
      },
      {
        template: "vinyl",
        heading: "La cara B, empezando ahora",
        brief: "Un disco girando con vuestra canción y una etiqueta que llama a esto la cara B.",
        body: "La etiqueta de la cara en Vinilo llega a doce caracteres, una pegatina en el centro del disco que gira mientras suena la canción. Veinte meses son excusa para dar la vuelta al disco: llama a esto cara B. Las fotos de la caja junto al plato, hasta doce, pueden ser el primer año, y el libreto, el segundo.",
        line: { field: "side", where: "La etiqueta de la cara", text: "Cara B" },
      },
    ],
    date: { kind: "fun", title: "Noche de recreativos, y guardad los tickets", line: "Cambiad los tickets por el premio más tonto y guardadlo." },
    stage: [
      "Veinte meses dan para tener un cajón de cosas guardadas: entradas, un tique de algún sitio, una nota dejada en la almohada, una flor seca de una boda a la que fuisteis los dos. Hace tiempo que nadie cuenta, a menudo ya se comparte casa, y la historia empieza a necesitar un sitio donde estar.",
      "Un mensaje en el chat desaparece de la vista antes del viernes, y un regalo que quiere ser el segundo aniversario antes de tiempo le quita brillo al de verdad. A los veinte meses les va algo que se guarde: un paquete, un álbum, un disco, una caja con los meses dentro, hecha para volver a abrirla dentro de un año.",
    ],
    faq: [
      { q: "¿Qué es un buen regalo por veinte meses de relación?", a: "Algo hecho para guardarse: un paquete de recuerdos con un relicario, un álbum de doce fotos elegidas, un disco con esta cara marcada como B." },
      { q: "¿Merece la pena celebrar los veinte meses?", a: "Si te gustan los números redondos, sí. Faltan cuatro meses para los dos años, así que mejor algo pequeño y para guardar, y el discurso para el aniversario." },
      { q: "¿Se puede volver a abrir un regalo más adelante?", a: "Sí. Los enlaces están pensados para durar, así que un regalo hecho a los veinte meses se sigue abriendo a los dos años, y en el aniversario siguiente." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 21
// ---------------------------------------------------------------------------------------------

const month21: Month = {
  en: {
    title: "21 Month Anniversary Gifts About What Has Grown",
    description: "Habits, a plant on the sill, a shared calendar: by a 21 month anniversary, things have grown. Five gifts about growing things.",
    h1: "21 month anniversary gifts",
    label: "21 months",
    hero: {
      line: "Twenty-one months. Look at what has grown, plants included.",
      sentence: "By now something in your life is literally growing, a plant you keep alive between you, and the gifts this month borrow that idea for everything else.",
    },
    ideasTitle: "Five about growing things",
    ideas: [
      {
        template: "garden",
        heading: "Walk them through a garden you planted",
        brief: "Pick what grows and who comes along, then hang the photos on the trellis.",
        body: "You choose what grows in The Garden, roses, peonies, wildflowers or sunflowers, and who comes along: a butterfly, a bee or a cat. Twenty-one months is a garden that has been tended: put the photos on the trellis, up to twelve, and burn something into the wooden gate, twenty-four characters.",
        line: { field: "sign", where: "The sign on the gate", text: "tended since year one" },
      },
      {
        template: "bloom",
        heading: "One flower that opens while they hold it",
        brief: "A single flower that opens only while they hold the screen, your message inside.",
        body: "Bloom gives them one flower, a peony, a tulip or a daisy, and it unfolds only as long as their finger stays on the screen, with your message waiting inside. Up to eight photos float up around it once it is open. At twenty-one months, keep the message short enough to read while holding.",
        line: { field: "message", where: "The message inside", text: "Twenty-one months, one plant alive between us, and a lot more than that growing." },
      },
      {
        template: "fortune-cookie",
        heading: "Fortunes about what is still to grow",
        brief: "Fortunes about what is still growing between you, cracked open one at a time.",
        body: "Write Fortune Cookie’s fortunes about growth: the plant that will finally flower, the habit you are both still learning, the shelf that will be built one day. It takes three to twenty, each up to 140 characters, cracked open one at a time. The last cookie carries your message, so end on the plain one.",
        line: { field: "fortunes", where: "One of the fortunes", text: "The fern will survive another winter, because you remember to water it." },
      },
      {
        template: "photo-booth",
        heading: "A lit sign that keeps the count",
        brief: "A lit sign with the count, over a strip of four photos, oldest first.",
        body: "Over Photo Booth a sign lights up in twenty-four characters, with a dot to break it onto two lines, and below it the strip prints in color, black and white or sepia. For twenty-one months, light up the count and put the four photos in order, oldest first, so the strip shows the growing.",
        line: { field: "sign", where: "The sign on top", text: "21 MONTHS · AND COUNTING" },
      },
      {
        template: "evergreen",
        heading: "A green collage for the things that last",
        brief: "A green collage of polaroids with the seasons you have had written across the top.",
        body: "Evergreen is a collage in sage, olive or mint, with up to ten photos on white polaroids and a few words across the top, twenty-two characters, written over an old record and a newspaper. Name the seasons you have had. Your letter closes the collage, and three lines are plenty.",
        line: { field: "title", where: "The words across the top", text: "seven seasons of us" },
      },
    ],
    date: { kind: "rainy-day", title: "A museum, then a glass of something", line: "Find one thing older than both of you and stand in front of it." },
    stage: [
      "Around twenty-one months much of life is shared: a calendar, a houseplant or two, a set of habits that started as one person’s and are now both. A shared address is common by now, or close. The changes are slow and easy to miss, which is why a month like this is good for noticing them.",
      "One season from now comes the second anniversary, so leave the big gesture to it. Letting a month pass that you once always marked would be the opposite mistake. This one is for noticing growth: what you have kept alive, what you now do together without thinking, and how many seasons you have counted so far.",
    ],
    faq: [
      { q: "What do you give at twenty-one months?", a: "Something about what has grown between you: a garden you walk them through, a flower that opens in their hand, fortunes about the habits you are still learning." },
      { q: "Is twenty-one months an anniversary?", a: "Not a traditional one, but it is a good point to notice what has changed. Keep the gift small and the date simple." },
      { q: "How do I make a gift about growing without it being cheesy?", a: "Make it literal. Name the actual plant, the actual habit, the actual season. Twenty-one months is seven seasons, and each of them can have a name of its own." },
    ],
  },
  es: {
    title: "Regalos para 21 meses de novios: lo que ha crecido",
    description: "Costumbres, una planta en la ventana, un calendario común: a los 21 meses de novios hay cosas que han crecido. Cinco regalos sobre crecer.",
    h1: "Regalos para 21 meses de novios",
    label: "21 meses",
    hero: {
      line: "Veintiún meses. Mira lo que ha crecido, plantas incluidas.",
      sentence: "A estas alturas algo en vuestra vida crece de verdad, una planta que mantenéis viva entre los dos, y este mes los regalos usan esa idea para todo.",
    },
    ideasTitle: "Cinco sobre cosas que crecen",
    ideas: [
      {
        template: "garden",
        heading: "Un paseo por un jardín plantado por ti",
        brief: "Elige qué crece y quién acompaña, y cuelga las fotos en el enrejado.",
        body: "Tú eliges qué crece en El jardín, rosas, peonías, flores silvestres o girasoles, y quién acompaña, una mariposa, una abeja o un gato. Veintiún meses son un jardín cuidado: pon las fotos en el enrejado, hasta doce, y graba algo en la verja de madera, veinticuatro caracteres.",
        line: { field: "sign", where: "El cartel de la verja", text: "regado desde el año uno" },
      },
      {
        template: "bloom",
        heading: "Una flor que se abre bajo su dedo",
        brief: "Una sola flor que se abre solo mientras mantiene el dedo en la pantalla, con tu mensaje dentro.",
        body: "Flor es una sola flor, una peonía, un tulipán o una margarita, que se abre solo mientras mantiene el dedo en la pantalla, y tu mensaje espera dentro. Hasta ocho fotos suben flotando a su alrededor cuando ya está abierta. A los veintiún meses, que el mensaje sea lo bastante corto para leerlo sujetándola.",
        line: { field: "message", where: "El mensaje de dentro", text: "Veintiún meses, una planta todavía viva entre los dos, y mucho más que eso creciendo." },
      },
      {
        template: "fortune-cookie",
        heading: "Fortunas sobre lo que aún tiene que crecer",
        brief: "Fortunas sobre lo que todavía crece entre los dos, abiertas de una en una.",
        body: "Escribe las fortunas de Galleta de la fortuna sobre crecer: la planta que por fin florecerá, la costumbre que todavía estáis aprendiendo, la estantería que algún día se montará. Admite de tres a veinte, de hasta 140 caracteres, que se abren de una en una. La última galleta lleva tu mensaje, así que acaba con la sencilla.",
        line: { field: "fortunes", where: "Una de las fortunas", text: "El helecho sobrevivirá otro invierno, porque te acuerdas de regarlo." },
      },
      {
        template: "photo-booth",
        heading: "Un letrero encendido que lleva la cuenta",
        brief: "Un letrero encendido con la cuenta, sobre cuatro fotos de la más antigua a la última.",
        body: "Sobre Fotomatón se enciende un letrero de veinticuatro caracteres, con un punto para partirlo en dos líneas, y debajo la tira se imprime en color, en blanco y negro o en sepia. Para los veintiún meses, enciende la cuenta y pon las cuatro fotos en orden, de la más antigua a la última, para que la tira enseñe cómo ha crecido.",
        line: { field: "sign", where: "El letrero", text: "21 MESES · AQUÍ SEGUIMOS" },
      },
      {
        template: "evergreen",
        heading: "Un collage verde para lo que dura",
        brief: "Un collage verde de polaroids con las estaciones que lleváis escritas arriba.",
        body: "Siempreverde es un collage en salvia, oliva o menta, con hasta diez fotos en polaroids blancas y unas palabras arriba, veintidós caracteres, escritas sobre un disco viejo y un periódico. Nombra las estaciones que lleváis. Tu carta cierra el collage, y tres líneas bastan.",
        line: { field: "title", where: "Las palabras de arriba", text: "siete estaciones" },
      },
    ],
    date: { kind: "rainy-day", title: "Un museo y luego una copa", line: "Buscad algo más antiguo que los dos y quedaos delante." },
    stage: [
      "Hacia los veintiún meses casi todo se comparte: un calendario, una planta o dos, unas costumbres que empezaron siendo de una sola persona y ahora son de los dos. Para entonces es habitual compartir casa, o estar cerca. Los cambios son lentos y fáciles de pasar por alto, y por eso un mes así sirve para notarlos.",
      "Dentro de una estación llega el segundo aniversario, así que el gran gesto es suyo. El error contrario sería dejar pasar un mes que antes siempre celebrabas. Este sirve para fijarse en lo que crece: lo que habéis mantenido vivo, lo que ya hacéis los dos sin pensar y cuántas estaciones lleváis contadas.",
    ],
    faq: [
      { q: "¿Qué se regala a los veintiún meses?", a: "Algo sobre lo que ha crecido entre los dos: un jardín por el que pasear, una flor que se abre en su mano, fortunas sobre las costumbres que aún estáis aprendiendo." },
      { q: "¿Los veintiún meses son un aniversario?", a: "No uno tradicional, pero son buen momento para notar lo que ha cambiado. Que el regalo sea pequeño y la cita sencilla." },
      { q: "¿Cómo hago un regalo sobre crecer sin que sea cursi?", a: "Hazlo literal. Nombra la planta de verdad, la costumbre de verdad, la estación de verdad. Veintiún meses son siete estaciones, y cada una puede tener su propio nombre." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 22
// ---------------------------------------------------------------------------------------------

const month22: Month = {
  en: {
    title: "22 Month Anniversary Gifts, Two Months From Two Years",
    description: "The small one before two years: five 22 month anniversary gifts that stay modest on purpose and leave room for the big day.",
    h1: "22 month anniversary gifts",
    label: "22 months",
    hero: {
      line: "Two months from two years. Keep this one small on purpose.",
      sentence: "The second anniversary is close enough to plan, so at twenty-two months a short, warm gift does the job and leaves the big day its room.",
    },
    ideasTitle: "Five that leave room for the big one",
    ideas: [
      {
        template: "coquette",
        heading: "A postcard about something you still do",
        brief: "A handwritten postcard under the first photo, about a small habit that has lasted.",
        body: "Under the first photo on the Coquette page sits a postcard in your handwriting, ninety characters, and the rest of the page runs down through polaroids to your letter. Give the postcard a small habit that has lasted twenty-two months: the umbrella tilted to one side, the text the moment a plane touches down.",
        line: { field: "note", where: "The postcard", text: "Twenty-two months of you tilting the umbrella my way and getting wet." },
      },
      {
        template: "vinyl",
        heading: "An album title for the almost-two years",
        brief: "A sleeve titled like the album before the big one, a record turning with your song.",
        body: "Vinyl gives the album a title of forty characters, printed on the sleeve that rests by the turntable, and the record spins in time with your song. At twenty-two months, title the album as if it were the one before the big record: an EP, a warm-up, a single.",
        line: { field: "album", where: "The album’s title", text: "The EP Before Two Years" },
      },
      {
        template: "scratch-card",
        heading: "The plan for two years, under foil",
        brief: "Photos scratched clear card by card, and the two-year plan on the last one.",
        body: "News can wait on the last card of Scratch Card, a headline of sixty characters under foil, after your photos are scratched clear one card at a time. Twenty-two months is when the two-year plan can be revealed: the weekend, the city, the table. Reveal it now and let them look forward.",
        line: { field: "finalTitle", where: "The last card’s headline", text: "Two years: the coast, the 14th, the room with the balcony." },
      },
      {
        template: "favorite-person",
        heading: "The torn note, two words long",
        brief: "A torn note of two words in the middle, polaroids from oldest to newest around it.",
        body: "In Favorite Person the torn note in the middle of the page holds twenty-two characters, and the polaroids around it, up to ten, are held on with gingham tape. After twenty-two months, two words are enough. Pick the oldest photo for the top and the newest for the bottom, beside your letter.",
        line: { field: "title", where: "The torn note", text: "my home" },
      },
      {
        template: "picnic",
        heading: "Small tags for an almost-anniversary",
        brief: "Tags that count down to the second anniversary, one for each thing you plan.",
        body: "Picnic’s tags are forty-eight characters each, and three to eight things come out of the basket wearing them, with photos in gingham frames among them. Use them to count down: one tag for each thing you plan to do on the second anniversary, and the last one your letter, folded underneath.",
        line: { field: "labels", where: "A tag on one thing", text: "breakfast in bed, which I will burn" },
      },
    ],
    date: { kind: "double-date", title: "Dinner for four, a toast to two years", line: "Tell your friends the plan and ask them to keep it quiet." },
    stage: [
      "Twenty-two months is two months before the second anniversary, close enough that a plan is probably forming. By now life has usually settled, a shared home or a clear idea of one, and the months mostly pass without anyone counting them. This one is worth a small nod, not a big one.",
      "Picture the second anniversary arriving after a gift so big it has nowhere left to go. Then picture this month slipping by when every month so far got something. The answer is somewhere short and warm, and if you want the gift to do a job, let it reveal the plan for two years.",
    ],
    faq: [
      { q: "Should I celebrate twenty-two months?", a: "Lightly. Two months before the second anniversary, a small gift keeps the habit without competing with what you are planning for the day itself." },
      { q: "What is a good small gift before a two-year anniversary?", a: "A postcard about a habit that lasted, an album titled like the warm-up record, or the anniversary plan revealed under foil so they can look forward to it." },
      { q: "When should I start planning the two-year anniversary?", a: "Around now. Two months is enough time to book a weekend away, ask for days off and keep it quiet without rushing." },
    ],
  },
  es: {
    title: "Regalos para 22 meses de novios: casi dos años",
    description: "El aniversario pequeño antes de los dos años: cinco regalos para los 22 meses de novios, modestos a propósito, que dejan sitio para el gran día.",
    h1: "Regalos para 22 meses de novios",
    label: "22 meses",
    hero: {
      line: "A dos meses de los dos años. Que este sea pequeño a propósito.",
      sentence: "El segundo aniversario está lo bastante cerca como para planearlo, así que a los veintidós meses basta un regalo corto y cálido que le deje sitio al gran día.",
    },
    ideasTitle: "Cinco que dejan sitio al grande",
    ideas: [
      {
        template: "coquette",
        heading: "Una postal sobre algo que sigues haciendo",
        brief: "Una postal a mano bajo la primera foto, sobre una costumbre pequeña que ha durado.",
        body: "La postal de Coquette va bajo la primera foto, con tu letra, noventa caracteres, y el resto de la página baja por polaroids hasta tu carta. Dale a la postal una costumbre pequeña que dure ya veintidós meses: el paraguas siempre hacia un lado, el mensaje nada más aterrizar.",
        line: { field: "note", where: "La postal", text: "Veintidós meses inclinando el paraguas hacia mi lado y mojándote tú." },
      },
      {
        template: "vinyl",
        heading: "Un título de álbum para casi dos años",
        brief: "Una funda titulada como el disco de antes del grande, girando con vuestra canción.",
        body: "Vinilo le da al álbum un título de cuarenta caracteres, impreso en la funda que descansa junto al tocadiscos, y el disco gira al ritmo de vuestra canción. A los veintidós meses, titula el álbum como si fuera el de antes del gran disco: un EP, un calentamiento, un sencillo.",
        line: { field: "album", where: "El título del álbum", text: "El EP de antes de los dos años" },
      },
      {
        template: "scratch-card",
        heading: "El plan de los dos años, para rascar",
        brief: "Fotos que se rascan tarjeta a tarjeta y el plan de los dos años en la última.",
        body: "Una noticia puede esperar en la última tarjeta de Rasca y gana, un titular de sesenta caracteres bajo la capa, después de rascar tus fotos una a una. Veintidós meses es cuando se puede desvelar el plan de los dos años: el fin de semana, la ciudad, la mesa. Desvélalo ya y deja que lo espere con ganas.",
        line: { field: "finalTitle", where: "El titular de la última tarjeta", text: "Dos años: la costa, el día 14, la habitación con balcón." },
      },
      {
        template: "favorite-person",
        heading: "La nota rasgada, de dos palabras",
        brief: "Una nota rasgada de dos palabras en el centro y polaroids de la más antigua a la nueva.",
        body: "En Mi persona favorita la nota rasgada del centro de la página admite veintidós caracteres, y las polaroids de alrededor, hasta diez, van sujetas con cinta de cuadros. Con veintidós meses, dos palabras bastan. Pon la foto más antigua arriba y la más nueva abajo, junto a tu carta.",
        line: { field: "title", where: "La nota rasgada", text: "mi casa" },
      },
      {
        template: "picnic",
        heading: "Etiquetas pequeñas para casi un aniversario",
        brief: "Etiquetas que cuentan hacia el segundo aniversario, una por cada cosa que planeas.",
        body: "Las etiquetas de Pícnic tienen cuarenta y ocho caracteres, y de la cesta salen de tres a ocho cosas que las llevan, con fotos en marcos de cuadros entre ellas. Úsalas para contar hacia el día: una etiqueta por cada cosa que piensas hacer en el segundo aniversario, y la última, tu carta doblada debajo.",
        line: { field: "labels", where: "La etiqueta de una cosa", text: "desayuno en la cama, que quemaré" },
      },
    ],
    date: { kind: "double-date", title: "Cena para cuatro, un brindis por los dos años", line: "Contad el plan a vuestros amigos y pedidles que no digan nada." },
    stage: [
      "Veintidós meses son dos meses antes del segundo aniversario, lo bastante cerca como para que un plan se esté formando. Llegados aquí la vida suele estar asentada, una casa compartida o una idea clara de ella, y los meses pasan casi sin que nadie los cuente. Este merece un gesto pequeño, no uno grande.",
      "Imagina el segundo aniversario llegando después de un regalo tan grande que lo deja sin sitio. Ahora imagina este mes pasando sin nada cuando todos los anteriores tuvieron algo. La respuesta está en algo corto y cálido, y si quieres que el regalo haga algo, que desvele el plan de los dos años.",
    ],
    faq: [
      { q: "¿Celebro los veintidós meses?", a: "Con poco. A dos meses del segundo aniversario, un detalle pequeño mantiene la costumbre sin competir con lo que preparas para el día en sí." },
      { q: "¿Qué detalle pequeño se hace antes de los dos años?", a: "Una postal sobre una costumbre que ha durado, un álbum titulado como el disco de calentamiento o el plan del aniversario bajo una capa para rascar, para que lo espere con ganas." },
      { q: "¿Cuándo empiezo a planear los dos años?", a: "Más o menos ahora. Dos meses dan tiempo para reservar una escapada, pedir días libres y guardar el secreto sin prisas." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 23
// ---------------------------------------------------------------------------------------------

const month23: Month = {
  en: {
    title: "23 Month Anniversary Gifts on the Way to Two Years",
    description: "One month short of two years, look back at where you have been and count down to the day. Five 23 month anniversary gifts, each with a line to borrow.",
    h1: "23 month anniversary gifts",
    label: "23 months",
    hero: {
      line: "One month to two years. Look back at the map, then count down.",
      sentence: "At twenty-three months the gift can sum up the places you have been together and set a clock running to the second anniversary.",
    },
    ideasTitle: "Five for the month before two years",
    ideas: [
      {
        template: "passport",
        heading: "A passport of your own country of two",
        brief: "A passport with a stamp per photo and a nationality that is just the two of you.",
        body: "Passport issues them a little passport for the places you have been together, with one stamp per photo, up to ten, and a nationality line of forty characters. Twenty-three months is long enough to have a country of your own: name it there. The visa page, at the end, reveals your message.",
        line: { field: "nationality", where: "The nationality", text: "Citizen of our kitchen table" },
      },
      {
        template: "constellations",
        heading: "Stars for the places you have been",
        brief: "Each photo a star for a place you have been, joined into one shape.",
        body: "Each photo in Constellations becomes a star, between three and twelve, and the stars join into a heart, an infinity sign or a star. For twenty-three months, give every star a place: the city, the beach, the track where you missed the train. The last line appears when the shape is whole.",
        line: { field: "finalLine", where: "The line when it completes", text: "Twelve places, one sky, and two years in a month." },
      },
      {
        template: "text-thread",
        heading: "A chat that counts down in bubbles",
        brief: "A scripted chat with typing dots, one bubble for each day left until two years.",
        body: "In Text Thread you script a conversation of two to forty bubbles that plays out with typing dots, and photos arrive in it as attachments. At twenty-three months, write it as a countdown: thirty bubbles, one for each day left, each a small thing you remember from the last two years.",
        line: { field: "lines", where: "One of the bubbles", text: "29 days to go. remember the parking ticket we framed" },
      },
      {
        template: "midnight-countdown",
        heading: "Fireworks at the start of your second anniversary",
        body: "Set Midnight Countdown to the first minute of your second anniversary. Until then the sky over the city darkens on schedule; at zero the fireworks start, up to twenty photos open, and the line you wrote appears with them, sixty characters. Send it a month early and let it wait.",
        line: { field: "zeroLine", where: "The line at zero", text: "Two years. Happy anniversary, from the first minute." },
      },
      {
        template: "keepsake",
        heading: "Two years, engraved in a locket, early",
        brief: "A locket engraved with your second anniversary’s date, a month early.",
        body: "In Keepsake, one tap opens the gold locket onto a photo; the engraving on its lid holds eighteen characters. Engrave the date of your second anniversary a month before it comes, as a promise. Around it in the parcel: a ticket, a torn word, dried flowers and your letter on aged paper.",
        line: { field: "engraving", where: "The engraving", text: "two years, 6/14" },
      },
    ],
    date: { kind: "cheap", title: "Your first walk’s route, on purpose this time", line: "Walk it in the same order and stop where you stopped." },
    stage: [
      "Twenty-three months is the last month before the second anniversary. By now there is a map of places, cities visited, a shared address, the station where one of you missed a train, and how to mark two years is on both your minds. It is a natural month to look back at where you have been.",
      "About thirty days are left, and they are worth using. Hand over the second-anniversary gift now and the day itself arrives empty; let the run-up pass unnoticed and you waste it. This month looks back at the map and counts down, and the gift can go out now, set to open on the anniversary.",
    ],
    faq: [
      { q: "What do you give a month before two years?", a: "Something that points at the anniversary: a passport of the places you have been, a countdown chat, a locket engraved with the date. Keep the main gift for the day." },
      { q: "Can I send it now and have it open on the anniversary?", a: "You can, if it is a paid template: the timed opening comes with it. Open Extras in the editor, turn on “Schedule the reveal”, then set the day and the hour as they fall in their time zone. Before that moment the link shows a countdown; afterwards it opens by itself." },
      { q: "How do I make a countdown gift for our second anniversary?", a: "Set Midnight Countdown to the first minute of the day and write the line that appears at zero. Send the link a month early; it waits and opens with fireworks." },
    ],
  },
  es: {
    title: "Regalos para 23 meses de novios, camino de dos años",
    description: "A un mes de los dos años, mira dónde habéis estado y cuenta los días que faltan. Cinco regalos para los 23 meses de novios, cada uno con una frase lista.",
    h1: "Regalos para 23 meses de novios",
    label: "23 meses",
    hero: {
      line: "Un mes para los dos años. Mira el mapa y luego cuenta hacia atrás.",
      sentence: "A los veintitrés meses el regalo puede resumir los sitios donde habéis estado los dos y poner en marcha un reloj hasta el segundo aniversario.",
    },
    ideasTitle: "Cinco para el mes antes de los dos años",
    ideas: [
      {
        template: "passport",
        heading: "Un pasaporte de vuestro país de dos",
        brief: "Un pasaporte con un sello por foto y una nacionalidad que solo tenéis los dos.",
        body: "Pasaporte le expide un pequeño pasaporte por los sitios donde habéis estado, con un sello por foto, hasta diez, y una línea de nacionalidad de cuarenta caracteres. Veintitrés meses dan para tener un país propio: ponle nombre ahí. La página del visado, al final, desvela tu mensaje.",
        line: { field: "nationality", where: "La nacionalidad", text: "Ciudadanía: nuestra mesa de la cocina" },
      },
      {
        template: "constellations",
        heading: "Estrellas por los sitios donde habéis estado",
        brief: "Cada foto una estrella por un sitio donde habéis estado, unidas en una figura.",
        body: "Cada foto de Constelaciones se vuelve una estrella, entre tres y doce, y las estrellas se unen en un corazón, un infinito o una estrella. Para los veintitrés meses, dale un sitio a cada estrella: la ciudad, la playa, el andén donde perdisteis el tren. La última frase aparece cuando la figura está completa.",
        line: { field: "finalLine", where: "La frase al completarse", text: "Doce sitios, un cielo y dos años dentro de un mes." },
      },
      {
        template: "text-thread",
        heading: "Un chat que cuenta hacia atrás en burbujas",
        brief: "Un chat escrito por ti con sus puntitos, una burbuja por cada día que falta.",
        body: "En Hilo de mensajes escribes una conversación de dos a cuarenta burbujas que se reproduce con sus puntitos, y las fotos llegan como adjuntos. A los veintitrés meses, escríbela como una cuenta atrás: treinta burbujas, una por cada día que falta, cada una un detalle que recuerdas de estos dos años.",
        line: { field: "lines", where: "Una de las burbujas", text: "faltan 29 días. acuérdate de la multa que enmarcamos" },
      },
      {
        template: "midnight-countdown",
        heading: "Fuegos al empezar vuestro segundo aniversario",
        body: "Pon Cuenta atrás de medianoche en el primer minuto de vuestro segundo aniversario. Hasta entonces el cielo sobre la ciudad se oscurece a su ritmo; en el cero empiezan los fuegos, se abren hasta veinte fotos y aparece con ellas la frase que escribiste, de sesenta caracteres. Envíalo un mes antes y deja que espere.",
        line: { field: "zeroLine", where: "La frase del cero", text: "Dos años. Feliz aniversario desde el primer minuto." },
      },
      {
        template: "keepsake",
        heading: "Dos años, grabados en un relicario, antes de tiempo",
        brief: "Un relicario grabado con la fecha de vuestro segundo aniversario, un mes antes.",
        body: "En Recuerdo, un toque abre el relicario dorado y aparece la foto de dentro; el grabado de la tapa tiene sitio para dieciocho caracteres. Graba la fecha de vuestro segundo aniversario un mes antes de que llegue, como promesa. Alrededor, en el paquete: un billete, una palabra arrancada, flores secas y tu carta en papel envejecido.",
        line: { field: "engraving", where: "El grabado", text: "dos años, 14/6" },
      },
    ],
    date: { kind: "cheap", title: "La ruta del primer paseo, esta vez a propósito", line: "Recorredla en el mismo orden y parad donde parasteis." },
    stage: [
      "Veintitrés meses son el último mes antes del segundo aniversario. A estas alturas ya hay un mapa de sitios, ciudades visitadas, una dirección compartida, el andén donde se os escapó un tren, y cómo celebrar los dos años ronda por la cabeza. Es un mes natural para mirar atrás a dónde habéis estado.",
      "Quedan unos treinta días, y merece la pena aprovecharlos. Si entregas ya el regalo del segundo aniversario, el día llega vacío; si dejas pasar la cuenta atrás sin notarla, la desperdicias. Este mes mira el mapa y lleva la cuenta atrás hasta el día, y el regalo puede salir ya, programado para abrirse en el aniversario.",
    ],
    faq: [
      { q: "¿Qué se regala un mes antes de los dos años?", a: "Algo que apunte al aniversario: un pasaporte de los sitios donde habéis estado, un chat con cuenta atrás, un relicario grabado con la fecha. El regalo principal, para el día." },
      { q: "¿Puedo enviarlo ahora y que se abra en el aniversario?", a: "Puedes, si es una plantilla de pago: la apertura programada viene con ella. Abre Extras en el editor, activa «Programar la apertura» y pon el día y la hora tal como caen en su zona horaria. Antes de ese momento el enlace muestra una cuenta atrás; después se abre por sí solo." },
      { q: "¿Cómo hago un regalo con cuenta atrás para el segundo aniversario?", a: "Pon Cuenta atrás de medianoche en el primer minuto del día y escribe la frase que sale en el cero. Envía el enlace un mes antes; espera y se abre con fuegos." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// The series
// ---------------------------------------------------------------------------------------------

export const MONTH_GUIDES: Record<number, Month> = {
  1: month1,
  2: month2,
  3: month3,
  4: month4,
  5: month5,
  6: month6,
  7: month7,
  8: month8,
  9: month9,
  10: month10,
  11: month11,
  12: month12,
  13: month13,
  14: month14,
  15: month15,
  16: month16,
  17: month17,
  18: month18,
  19: month19,
  20: month20,
  21: month21,
  22: month22,
  23: month23,
  24: month24,
};

/** Months 1 to 24, in order: the keys of MONTH_GUIDES. */
export const MONTHS: readonly number[] = Object.keys(MONTH_GUIDES)
  .map(Number)
  .sort((a, b) => a - b);

export const monthSlug = (n: number) => `${n}-month-anniversary`;

/** The month an address is for, or null: "1-month-anniversary" to "24-month-anniversary", only months that are written. */
export function monthFromSlug(slug: string): number | null {
  const match = /^([1-9]|1\d|2[0-4])-month-anniversary$/.exec(slug);
  if (!match) return null;
  const n = Number(match[1]);
  return Object.hasOwn(MONTH_GUIDES, n) ? n : null;
}

/** The ref a month's "Make this gift" carries (lib/attribution/ref.ts). */
export const monthRef = (n: number) => `gifts-month-${n}`;

/** The sample photo beside the band's phone: p1…p8 in turn, so two neighbouring months never share one. */
export function monthBandPhoto(n: number): { src: string; width: number; height: number } {
  const photo = DEMO_PHOTOS[`p${((n - 1) % 8) + 1}` as DemoPhotoId];
  return { src: photo.url, width: photo.width, height: photo.height };
}

/** The months a page's last section shows as posters: the one before, the one after, then the nearest of 6, 12, 18, 24 not already there. At most four, never the month itself. */
export function monthNeighbours(n: number): number[] {
  const out: number[] = [];
  const add = (m: number) => {
    if (m !== n && MONTHS.includes(m) && !out.includes(m) && out.length < 4) out.push(m);
  };
  const before = [...MONTHS].reverse().find((m) => m < n);
  const after = MONTHS.find((m) => m > n);
  if (before !== undefined) add(before);
  if (after !== undefined) add(after);
  for (const m of [6, 12, 18, 24].sort((a, b) => Math.abs(a - n) - Math.abs(b - n) || a - b)) add(m);
  return out;
}

/** The post that is about this month's day: the gift is on the month's page, the day in the post. */
export function monthPost(n: number): string {
  if (n === 6) return "6-month-anniversary-ideas";
  if (n === 12) return "first-anniversary-ideas-for-boyfriend";
  return "monthiversary-ideas";
}
