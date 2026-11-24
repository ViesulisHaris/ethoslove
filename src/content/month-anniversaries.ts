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
    description: "One month in, a gift should be small and specific. Six digital gifts you can make tonight, each with a line to borrow, and one that is free.",
    h1: "1 month anniversary gifts",
    label: "1 month",
    hero: {
      line: "Four weeks is early. The gift should know that.",
      sentence: "Each of these is small on purpose: a note, a joke or a plan for Friday, made on your phone and sent as a link.",
    },
    ideasTitle: "Six that stay the right size",
    ideas: [
      {
        template: "the-letter",
        heading: "A note under a wax seal",
        body: "The free version of The Letter is a short note: two names and 500 characters at most. A tap breaks the wax and the note writes itself out by hand, over a song if you choose one. One month is about that long: one thing you noticed, one thing you want to do again.",
        line: { field: "freeNote", where: "The whole note", text: "One month. I wasn’t counting, and then I was. I liked the walk home from the ramen place more than the ramen, and I think you know that. No speech and no plans for next year. I’m glad it was you at that table. Same place Thursday?" },
      },
      {
        template: "fortune-cookie",
        heading: "Three fortunes, all about week one",
        body: "Fortune Cookie needs three fortunes and no photos, which suits a month with four pictures in it. They tap each cookie open and a slip slides out with your words and a row of lucky numbers. Write the fortunes about things that already happened: the first joke, the wrong turn, the second date.",
        line: { field: "fortunes", where: "One of the fortunes", text: "A month from now you will still be glad you said yes to the second date." },
      },
      {
        template: "text-thread",
        heading: "Your first month, as a chat of two",
        body: "Text Thread plays your messages back one bubble at a time, with the typing dots between them. Two bubbles are the least it takes and forty the most. Open with the joke only the two of you get, and let the last bubble say the plain thing a text never quite does.",
        line: { field: "lines", where: "The first bubble", text: "ok so it has been a month and I have notes" },
      },
      {
        template: "sticker-bomb",
        heading: "Six labels for the names you already use",
        body: "Sticker Bomb gives them an empty page and a pack of stickers to slap down. Under every other sticker comes a strip from a label maker, six strips of 28 characters, in the order you wrote them. A month in, you have a couple of nicknames and one running joke, and the strips need nothing more.",
        line: { field: "labels", where: "One label-maker strip", text: "One month, zero regrets" },
      },
      {
        template: "bouquet",
        heading: "Flowers, with a card that admits it",
        body: "A bouquet says more than a month has earned, unless the card is honest about it. You pick the stems, up to 24, and the note tucked in them holds 30 characters. They see it gather flower by flower. Keep it to five stems and one line, and it reads as a joke with flowers in it.",
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
      "By four weeks most couples have had a handful of dates, a few photos and one or two jokes nobody else would get. Some are counting the month and some have not noticed it pass, and both are normal. It is worth finding out which one you are with before the day, because a gift for a month only one of you counted lands oddly.",
      "Too much at one month: anything engraved, anything that needs a year of photos, and the big sentence if neither of you has said it yet. Too little: nothing at all, when they have been counting. The right size is a note, a joke or a plan. If it took ten minutes and it is plainly about them, it is enough.",
    ],
    faq: [
      { q: "Is one month too soon for an anniversary gift?", a: "Not if it is small. A month is worth marking when both of you are counting it, and a short note or a plan for the next date marks it without making it heavy. Leave the keepsakes for six months." },
      { q: "What do you write after one month together?", a: "One thing you noticed about them and one thing you want to do again. Two or three sentences are plenty. Leave the future out of it unless they brought it up first." },
      { q: "Which of these is free?", a: "The Letter, as a short note of up to 500 characters with a song. The other gifts on this page are a one-time payment each, and you can build any of them in the editor before you decide." },
    ],
  },
  es: {
    title: "Regalos para 1 mes de novios sin pasarse",
    description: "Con un mes, el regalo tiene que ser pequeño y concreto. Seis regalos digitales para hacer esta noche, cada uno con una frase lista, y uno es gratis.",
    h1: "Regalos para 1 mes de novios",
    label: "1 mes",
    hero: {
      line: "Cuatro semanas es pronto. El regalo tiene que saberlo.",
      sentence: "Todos son pequeños a propósito: una nota, una broma o un plan para el viernes, hechos desde el móvil y enviados en un enlace.",
    },
    ideasTitle: "Seis que no se pasan",
    ideas: [
      {
        template: "the-letter",
        heading: "Una nota bajo un sello de lacre",
        body: "La versión gratis de La carta es una nota corta: dos nombres y 500 caracteres como mucho. Un toque rompe el lacre y la nota se escribe sola, a mano, sobre una canción si eliges una. Un mes da para eso: una cosa en la que te has fijado y otra que quieres repetir.",
        line: { field: "freeNote", where: "La nota entera", text: "Un mes. No llevaba la cuenta, y de pronto sí. Me gustó más la vuelta a casa desde el ramen que el propio ramen, y creo que lo sabes. Sin discursos ni planes para el año que viene. Me alegro de que fueras tú en esa mesa. ¿El jueves en el mismo sitio?" },
      },
      {
        template: "fortune-cookie",
        heading: "Tres fortunas sobre la primera semana",
        body: "Galleta de la fortuna pide tres fortunas y ninguna foto, justo lo que tiene un primer mes. Cada galleta se abre con un toque y sale una tira con tus palabras y una fila de números de la suerte. Escribe fortunas sobre lo que ya ha pasado: la primera broma, la calle equivocada, la segunda cita.",
        line: { field: "fortunes", where: "Una de las fortunas", text: "Dentro de un mes seguirás alegrándote de haber dicho que sí a la segunda cita." },
      },
      {
        template: "text-thread",
        heading: "Vuestro primer mes, como un chat de dos",
        body: "Hilo de mensajes reproduce tus mensajes burbuja a burbuja, con los puntitos de «escribiendo» entre una y otra. Hacen falta dos burbujas como mínimo y caben cuarenta. Empieza con la broma que solo entendéis vosotros y deja para la última burbuja eso tan sencillo que por mensaje nunca acaba de decirse.",
        line: { field: "lines", where: "La primera burbuja", text: "vale, llevamos un mes y tengo apuntes" },
      },
      {
        template: "sticker-bomb",
        heading: "Seis etiquetas con los motes que ya usáis",
        body: "Bomba de Stickers le da una página vacía y un montón de stickers para pegar. Debajo de uno de cada dos sale una tira de rotuladora: seis tiras de 28 caracteres, en el orden en que las escribiste. Al mes ya tenéis un par de motes y una broma que se repite, y no hace falta más para llenarlas.",
        line: { field: "labels", where: "Una tira de rotuladora", text: "Un mes y cero dudas" },
      },
      {
        template: "bouquet",
        heading: "Flores, con una tarjeta que no exagera",
        body: "Un ramo dice más de lo que un mes se ha ganado, salvo que la tarjeta lo reconozca. Eliges los tallos, hasta 24, y la nota que va entre ellos admite 30 caracteres. Lo ven formarse flor a flor. Con cinco tallos y una sola frase se lee como una broma con flores dentro.",
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
      "A las cuatro semanas, casi todas las parejas llevan un puñado de citas, unas cuantas fotos y una o dos bromas que nadie más pillaría. Hay quien cuenta el mes y quien ni se ha dado cuenta de que ha pasado, y las dos cosas son normales. Conviene saber de qué lado está la otra persona antes del día: un regalo por un mes que solo cuenta uno cae raro.",
      "Demasiado para un mes: cualquier cosa grabada, lo que necesite un año de fotos y la frase grande si ninguno de los dos la ha dicho todavía. Demasiado poco: nada, si esa persona sí llevaba la cuenta. La medida justa es una nota, una broma o un plan. Si te ha llevado diez minutos y se nota que va de esa persona, basta.",
    ],
    faq: [
      { q: "¿Un mes es demasiado pronto para un regalo de aniversario?", a: "No, si es pequeño. Un mes merece marcarse cuando los dos lo contáis, y una nota corta o el plan de la próxima cita lo marcan sin ponerse serios. Los recuerdos para guardar, a los seis meses." },
      { q: "¿Qué se escribe al cumplir un mes?", a: "Una cosa en la que te has fijado y otra que quieres repetir. Con dos o tres frases sobra. Deja el futuro fuera, salvo que lo haya sacado esa persona primero." },
      { q: "¿Cuál de estos es gratis?", a: "La carta, como nota corta de hasta 500 caracteres con una canción. Los demás regalos de esta página son un solo pago cada uno, y puedes montar cualquiera en el editor antes de decidirte." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 6
// ---------------------------------------------------------------------------------------------

const month6: Month = {
  en: {
    title: "6 Month Anniversary Gifts for the First Half-Year",
    description: "Half a year is the first date most couples mark. Six digital gifts for it, each with a line to borrow, from six reasons in a jar to a dated road.",
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
        line: { field: "reasons", where: "One note in the jar", text: "You learned how I take my coffee in week two and never asked again." },
      },
      {
        template: "our-timeline",
        heading: "Six dated stops on one road",
        brief: "A road down the page, one dated photo at each bend, one for each month.",
        body: "Our Timeline draws a road down the page as they scroll, and pins a photo with its date at every bend. It needs two photos at least and holds twenty. At six months, give it one stop for each: the first date, the first trip, the evening you stopped pretending you were not keen.",
        line: { field: "dates", where: "The date on a stop", text: "March 4, the night it rained" },
      },
      {
        template: "vinyl",
        heading: "A record with your half-year on its label",
        brief: "A turntable with your song on it, and a side label that calls this side A.",
        body: "Vinyl puts a turntable on their screen: they drop the needle, the record turns with your song, and the photos wait in a crate as album covers. The side label takes twelve characters. Call the first six months side A. It says what a half-year is without a word about forever.",
        line: { field: "side", where: "The side label", text: "Months 1–6" },
      },
      {
        template: "scrapbook",
        heading: "Cut-out letters for six months of pages",
        brief: "Cut-out letters, polaroids that develop, a torn note and up to twelve photos.",
        body: "Scrapbook opens like the real thing: cut-out letters for the title, your photos landing as polaroids that develop, a torn note in handwriting and a typed letter from you. Up to twelve photos fit, two a month. The one you would save from a fire goes on the first page.",
        line: { field: "headline", where: "The cut-out title", text: "half a year of us" },
      },
      {
        template: "midnight-countdown",
        heading: "Count down to the hour you met",
        brief: "A clock under a darkening sky, set to the hour of your first date.",
        body: "Midnight Countdown runs a clock down under a darkening sky and, at zero, sets off fireworks and opens your photos and your words. Set the zero to the hour of your first date, six months on, rather than to midnight. The line that appears with the fireworks is sixty characters: say what the hour was.",
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
      "Too much at six months: jewelry with a date engraved, a holiday booked for next summer, anything that reads as a proposal. Too little: a text that could have gone to anyone. The right size is something with the half-year inside it, six reasons or six dated photos, and a plan for the evening.",
    ],
    faq: [
      { q: "Should you celebrate a six-month anniversary?", a: "If both of you are counting, yes, and most people are by now. Keep it to a gift you made and an evening out; the bigger gestures belong to the year." },
      { q: "How many photos do I need for a six-month gift?", a: "Six is enough for the road or the jar, one for each month. The Scrapbook takes up to twelve, and Midnight Countdown needs only one." },
      { q: "What do you write in a six-month anniversary letter?", a: "What you know now that you did not know in month one: how they take their coffee, what they do at the end of a long day, the joke that keeps coming back. Leave promises about next year out of it." },
    ],
  },
  es: {
    title: "Regalos para 6 meses de novios: el primer medio año",
    description: "Medio año es la primera fecha que casi todas las parejas celebran. Seis regalos digitales para ese día, cada uno con una frase lista, de un frasco a un camino.",
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
        body: "Una razón por cada mes que lleváis: seis notas dobladas dentro de un frasco de cristal. Agitan el móvil, o tocan el frasco, y una nota cae y se despliega. Cada nota puede llevar una foto, así que ponle la de su mes. Seis es el número sincero; caben cien, pero cien a los seis meses es relleno.",
        line: { field: "reasons", where: "Una nota del frasco", text: "En la segunda semana aprendiste cómo tomo el café y no volviste a preguntar." },
      },
      {
        template: "our-timeline",
        heading: "Seis paradas con fecha en un camino",
        brief: "Un camino por la pantalla, una foto con fecha en cada curva, una por mes.",
        body: "Nuestra línea del tiempo dibuja un camino mientras deslizan y clava una foto con su fecha en cada curva. Pide dos fotos como mínimo y admite veinte. A los seis meses, una parada por mes: la primera cita, la primera escapada, la noche en que dejasteis de disimular las ganas.",
        line: { field: "dates", where: "La fecha de una parada", text: "4 de marzo, la noche que llovió" },
      },
      {
        template: "vinyl",
        heading: "Un disco con vuestro medio año en la etiqueta",
        brief: "Un tocadiscos con vuestra canción y una etiqueta que llama a esto la cara A.",
        body: "Vinilo pone un tocadiscos en su pantalla: bajan la aguja, el disco gira con vuestra canción y las fotos esperan en una caja como portadas. La etiqueta de la cara admite doce caracteres. Llama cara A a los seis primeros meses. Dice lo que es medio año sin una sola palabra sobre el para siempre.",
        line: { field: "side", where: "La etiqueta de la cara", text: "Meses 1 a 6" },
      },
      {
        template: "scrapbook",
        heading: "Letras recortadas para seis meses de páginas",
        brief: "Letras recortadas, polaroids que se revelan, una nota rasgada y hasta doce fotos.",
        body: "Álbum de recortes se abre como uno de verdad: letras recortadas para el título, tus fotos cayendo como polaroids que se revelan, una nota rasgada escrita a mano y una carta tuya a máquina. Caben hasta doce fotos, dos por mes. La que salvarías de un incendio va en la primera página.",
        line: { field: "headline", where: "El título recortado", text: "medio año de nosotros" },
      },
      {
        template: "midnight-countdown",
        heading: "Cuenta atrás hasta la hora en que os conocisteis",
        brief: "Un reloj bajo un cielo que oscurece, puesto a la hora de vuestra primera cita.",
        body: "Cuenta atrás de medianoche baja un reloj bajo un cielo que se oscurece y, al llegar a cero, lanza fuegos artificiales y abre tus fotos y tus palabras. Pon el cero a la hora de vuestra primera cita, seis meses después, en lugar de a medianoche. La frase que sale con los fuegos admite sesenta caracteres: di qué hora era.",
        line: { field: "zeroLine", where: "La frase del cero", text: "Hace seis meses, más o menos a esta hora." },
      },
      {
        template: "the-letter",
        heading: "Una carta larga, firmada como firmas tus mensajes",
        body: "A los seis meses una carta larga ya no parece demasiado. La carta rompe un sello de lacre y escribe tus palabras a mano; la despedida va justo encima de tu nombre. Escribe lo que ha cambiado entre el primer mes y el sexto, y firma como firmas tus mensajes a esa persona.",
        line: { field: "signOff", where: "La despedida", text: "Seis meses después, igual que el primer día" },
      },
    ],
    date: { kind: "romantic", title: "Cena y vuelta a casa por el camino largo", line: "Reservad la mesa que guardabais para una ocasión." },
    stage: [
      "A los seis meses muchas parejas ya conocen a los amigos de la otra persona y a menudo a la familia, tienen una primera escapada a la espalda y han pasado por el primer desacuerdo de verdad. Medio año es también cuando casi todo el mundo empieza a contar en voz alta, por eso es el primer aniversario que se suele celebrar.",
      "Demasiado a los seis meses: una joya con la fecha grabada, unas vacaciones reservadas para el verano que viene, cualquier cosa que parezca una pedida. Demasiado poco: un mensaje que podría haber ido a cualquiera. La medida justa es algo con el medio año dentro, seis razones o seis fotos con fecha, y un plan para la noche.",
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
    description: "A year is paper by tradition. Six digital gifts that keep to it on a phone, from a letter that writes itself out to a paper crane, each with a line to borrow.",
    h1: "12 month anniversary gifts",
    label: "12 months",
    hero: {
      line: "One year is the paper anniversary. A phone can still keep the rule.",
      sentence: "A year of photos is finally enough to fill a road, a museum or a front page, and paper is the tradition each of them borrows from.",
    },
    ideasTitle: "A year, on paper and on screen",
    ideas: [
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
        template: "paper-crane",
        heading: "Six folds of paper, a line in each",
        body: "Paper Crane is the paper anniversary taken at its word. A sheet lies on a table; they press and hold each crease and it folds while they hold, and every fold that lands shows one line from you. Six folds, so two months a line. Once it is a crane it flies off and leaves your letter where it stood.",
        line: { field: "lines", where: "The line on one fold", text: "January and February: you learned my coffee, I learned your silences." },
      },
      {
        template: "unwrapped",
        heading: "The year as a row of presents",
        brief: "Presents torn open one by one, each with a number from your year inside.",
        body: "Unwrapped turns your year into numbers: a row of wrapped presents, each torn open with a tap or a swipe to a figure that counts up, and a gold one at the end that prints the whole year as a receipt. Up to eight numbers, all written by you. Count small, true things: the coffees, the train times, the blanket.",
        line: { field: "stats", where: "One of the numbers", text: "52 Sundays, 49 of them pancakes" },
      },
      {
        template: "front-page",
        heading: "A front page with one year of news",
        brief: "Their name on the masthead and your year in the columns, as news.",
        body: "Front Page puts their name on the masthead of a newspaper and your year in its columns: a headline, a lead photo with its caption, your message set as the story, a weather box and classified ads you write. Newsprint counts as paper. Report the year the way a local paper would, straight-faced, down to the small print.",
        line: { field: "headline", where: "The headline", text: "LOCAL COUPLE REACHES ONE YEAR, STILL ARGUES ABOUT THE THERMOSTAT" },
      },
      {
        template: "museum",
        heading: "An exhibition called year one",
        brief: "Your year hung in a quiet gallery, a plaque under every photo.",
        body: "Museum hangs your photos in a quiet gallery, framed, each over a plaque with its title, year and a line. They swipe from room to room. It takes two to twenty photos, so a year fits whole: pick twelve, one for each month, and title each like a painting. Your message is the wall text the visit ends on.",
        line: { field: "exhibition", where: "The exhibition’s name", text: "Year One: Selected Works" },
      },
    ],
    date: { kind: "romantic", title: "A picnic at golden hour, one year on", line: "Pack what you ate on the first date, if it travels." },
    stage: [
      "A year in, many couples have been through the four seasons once, met most of the family, and spent at least one holiday together. You know which photos are the good ones and there are enough of them now to tell the year in order. The first anniversary is paper by tradition, the start of a list that runs to gold.",
      "On a phone, paper means a gift made of it: a letter that writes itself out under a seal, a crane that folds and flies, a front page. Too much at one year: a ring that is not a proposal, or a list of promises. Too little: the same gift as month eleven. For the day itself, read the anniversary ideas.",
    ],
    faq: [
      { q: "What is the traditional gift for one year together?", a: "Paper. It starts the list of anniversary materials that runs to gold at fifty. On a phone, keep it literal with a letter, a paper crane or a newspaper front page made about the two of you." },
      { q: "Is 12 months the same as the first anniversary?", a: "Yes. Twelve months is the first anniversary, and the one most couples treat as the big one. This page is for the gift; the anniversary pages cover the day and what to do with it." },
      { q: "How many photos do I need for a one-year gift?", a: "A dozen tells the year well, one for each month. Our Timeline and Museum each take up to twenty, and Unwrapped and Paper Crane need none at all." },
    ],
  },
  es: {
    title: "Regalos para 12 meses de novios: el de papel",
    description: "Un año es papel, por tradición. Seis regalos digitales que lo respetan en un móvil, de una carta que se escribe sola a una grulla de papel, con frases listas.",
    h1: "Regalos para 12 meses de novios",
    label: "12 meses",
    hero: {
      line: "Un año son las bodas de papel. Un móvil también puede cumplir la regla.",
      sentence: "Un año de fotos por fin da para llenar un camino, un museo o una portada, y el papel es la tradición de la que tira cada uno.",
    },
    ideasTitle: "Un año, en papel y en pantalla",
    ideas: [
      {
        template: "our-timeline",
        heading: "Doce meses de camino y una frase para cerrar",
        brief: "Un año de fotos en un camino que se dibuja mientras deslizan.",
        body: "Este es el mes para el que se hizo el camino: un año de fotos, una en cada curva, cada una con su fecha. Deslizan y el camino se dibuja bajo su dedo, desde la primera cita y la primera bronca hasta hoy. La frase donde termina admite 80 caracteres. Si tienes un vídeo que merezca verse dos veces, también cabe.",
        line: { field: "ending", where: "La frase donde acaba el camino", text: "Primer año: hecho. Volvería a coger el mismo camino, baches incluidos." },
      },
      {
        template: "the-letter",
        heading: "Una carta en papel, que de eso va",
        brief: "Papel, un sello de lacre que se rompe con un toque y tus palabras apareciendo a mano.",
        body: "Si la regla es el papel, La carta la cumple sin rodeos: papel, un sello de lacre que se rompe con un toque y tus palabras apareciendo a mano, como si alguien las escribiera. Empieza por quien era esa persona para ti hace un año, casi alguien desconocido, y deja que la carta camine hasta hoy. La primera línea admite sesenta caracteres.",
        line: { field: "greeting", where: "La primera línea", text: "A quien lleva un año entero aguantándome:" },
      },
      {
        template: "paper-crane",
        heading: "Seis pliegues de papel, una frase en cada uno",
        body: "Grulla de papel es el aniversario de papel tomado al pie de la letra. Una hoja espera sobre la mesa; mantienen pulsado cada pliegue y se dobla mientras no sueltan, y cada pliegue que sale bien muestra una frase tuya. Son seis pliegues, así que dos meses por frase. Cuando ya es una grulla, echa a volar y deja tu carta donde estaba.",
        line: { field: "lines", where: "La frase de un pliegue", text: "Enero y febrero: aprendiste mi café y yo tus silencios." },
      },
      {
        template: "unwrapped",
        heading: "El año en una fila de regalos",
        brief: "Regalos que se abren uno a uno, con un número de vuestro año dentro.",
        body: "Nuestro año, desenvuelto convierte el año en números: una fila de regalos envueltos que se abren con un toque o deslizando, cada uno con una cifra que va subiendo, y uno dorado al final que imprime el año entero como un tique. Hasta ocho números, todos escritos por ti. Cuenta cosas pequeñas y ciertas: los cafés, los trenes, la manta.",
        line: { field: "stats", where: "Uno de los números", text: "52 domingos, 49 con tortitas" },
      },
      {
        template: "front-page",
        heading: "Una portada con un año de noticias",
        brief: "Su nombre en la cabecera y vuestro año en las columnas, como noticia.",
        body: "Portada pone su nombre en la cabecera de un periódico y vuestro año en las columnas: un titular, una foto principal con su pie, tu mensaje como la noticia, el recuadro del tiempo y los anuncios por palabras que escribas. El papel de periódico también es papel. Cuenta el año como lo contaría un diario local, muy en serio, hasta la letra pequeña.",
        line: { field: "headline", where: "El titular", text: "UNA PAREJA DEL BARRIO CUMPLE UN AÑO Y SIGUE DISCUTIENDO POR LA CALEFACCIÓN" },
      },
      {
        template: "museum",
        heading: "Una exposición llamada primer año",
        brief: "Vuestro año colgado en una galería tranquila, con una placa bajo cada foto.",
        body: "Museo cuelga tus fotos en una galería tranquila, enmarcadas, cada una sobre una placa con su título, su año y una frase. Pasan de sala en sala deslizando. Admite de dos a veinte fotos, así que el año entra entero: elige doce, una por mes, y titula cada una como un cuadro. Tu mensaje es el texto de pared con el que acaba la visita.",
        line: { field: "exhibition", where: "El nombre de la exposición", text: "Primer año: obra escogida" },
      },
    ],
    date: { kind: "romantic", title: "Un pícnic a la hora dorada, un año después", line: "Llevad lo que comisteis en la primera cita, si aguanta el viaje." },
    stage: [
      "Al año, muchas parejas han pasado juntas por las cuatro estaciones, conocen a casi toda la familia y han compartido al menos unas vacaciones. Sabes qué fotos son las buenas y por fin hay suficientes para contar el año en orden. El primer aniversario es de papel por tradición, el comienzo de una lista que llega hasta el oro.",
      "En un móvil, el papel es un regalo hecho de papel: una carta que se escribe sola bajo un sello, una grulla que se dobla y echa a volar, una portada. Demasiado al año: un anillo que no es una pedida, o una lista de promesas. Demasiado poco: lo mismo que en el mes once. Para el día en sí, mira las ideas de aniversario.",
    ],
    faq: [
      { q: "¿Qué se regala por tradición al cumplir un año?", a: "Papel. Es el primero de la lista de materiales de aniversario, que llega al oro a los cincuenta. En un móvil, cúmplelo con una carta, una grulla de papel o la portada de un periódico sobre vosotros." },
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
    description: "Two years is cotton by tradition, and a phone is not. Six digital gifts for the day and what to pair each with, from a toast to a picnic, with lines to borrow.",
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
        body: "Picnic hides your words in a basket on a gingham blanket. One tap opens the lid, and every tap after it lifts out one thing wearing a tag you wrote, three tags at least and eight at most. Two years in, tag what you own together: the mug with the chip, the spare key. Gingham is cotton, which is a start.",
        line: { field: "labels", where: "A tag on one thing", text: "the blanket we never agree on" },
      },
      {
        template: "our-timeline",
        heading: "A road from the first date to your door",
        brief: "Up to twenty dated photos on a road they scroll, two years in order.",
        body: "Two years of photos make a long road, and Our Timeline takes up to twenty of them, each pinned at a bend with its date. They scroll, the road draws, and the years pass in order. By now the end of the road is often an address you share: put it there, or the plan for the next one.",
        line: { field: "ending", where: "The line at the road’s end", text: "Two years, one address, and still the long way home." },
      },
      {
        template: "music-box",
        heading: "Wind the key on two years",
        body: "Music Box sits on a lace-covered vanity with their name on its gold plate. They wind the key three turns, the lid opens, a ballerina or two swans turn to the tune, and your photos come up one at a time in the oval mirror. Pick Brahms’ Lullaby for a calm two years or Swan Lake for a dramatic one. Your letter lifts out as the tune slows.",
        line: { field: "message", where: "The letter in the box", text: "Two years ago you were a name in my phone. Now you are the first one in it." },
      },
      {
        template: "museum",
        heading: "Two walls, one for each year",
        brief: "A quiet gallery of your two years, a plaque under every framed photo.",
        body: "Museum makes a gallery of your photos, two to twenty of them, each framed over a plaque that holds a title, a year and a line. Split them by year: the first twelve months on one wall, the next on another, and let the plaques say what changed. They walk it by swiping.",
        line: { field: "exhibition", where: "The name over the door", text: "Twenty-four Months, Mostly Happy" },
      },
      {
        template: "the-letter",
        heading: "Begin the letter where year one ended",
        body: "The Letter opens under a wax seal, and its words write themselves out by hand. Two years is long enough for a letter with chapters: what you knew at one year, what you have learned since. The first line takes sixty characters, and the whole thing goes well beside something cotton, folded, on their pillow.",
        line: { field: "greeting", where: "The first line", text: "To my favorite person, two years running:" },
      },
    ],
    date: { kind: "romantic", title: "A beach, a cotton blanket and the sunset", line: "Take the blanket you gave them and stay until dark." },
    stage: [
      "By two years many couples live together or are talking about it, have a shared calendar and a few friends in common, and have met each other’s families more than once. The novelty has worn off and something steadier has taken its place, which is the thing worth marking. The jokes have histories now.",
      "The second anniversary is cotton by tradition, and a phone cannot be cotton. So send the gift on the screen and give the cotton by hand: a shirt they will wear, a good blanket, a tea towel from the place you met. Too much: a speech about forever. Too little: a gift that could have gone at month two.",
    ],
    faq: [
      { q: "What is the traditional gift for a second anniversary?", a: "Cotton. Paper comes first at one year, then cotton at two, for the way it gets softer with use. A digital gift cannot be cotton, so pair it with something that is." },
      { q: "What do you write for a two-year anniversary?", a: "What the second year added that the first did not have: a routine, a fight you settled, a place that is now yours. Then one specific thing you would choose again." },
      { q: "Are two years and 24 months the same anniversary?", a: "Yes. Twenty-four months is the second anniversary, and most people stop counting in months around here. After this the gifts go by the year, on the anniversary page." },
    ],
  },
  es: {
    title: "Regalos para 24 meses de novios: algodón y pantalla",
    description: "Dos años son de algodón por tradición, y un móvil no lo es. Seis regalos digitales para ese día y con qué acompañarlos, de un brindis a un pícnic, con frases.",
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
        body: "El brindis coloca dos copas y una carta de menú sobre lino. El móvil hace de botella: al inclinarlo se llenan las copas, un golpe suave las hace chocar y entonces empieza tu discurso. La primera frase admite setenta caracteres: vuestros dos nombres y eso que seguís haciendo después de dos años. Deja el regalo de algodón junto al móvil cuando lo abra.",
        line: { field: "opening", where: "Cómo empieza el brindis", text: "Por Ana y Marco, dos años y seguimos pidiendo el mismo postre" },
      },
      {
        template: "picnic",
        heading: "Una cesta con lo que ya es vuestro",
        body: "Pícnic guarda tus palabras en una cesta sobre una manta de cuadros. Un toque abre la tapa, y cada toque siguiente saca algo con una etiqueta escrita por ti, tres como mínimo y ocho como mucho. A los dos años, etiqueta lo que tenéis en común: la taza desportillada, la llave de repuesto. La manta es de cuadros vichy, que es algodón, que ya es algo.",
        line: { field: "labels", where: "La etiqueta de una cosa", text: "la manta en la que nunca estamos de acuerdo" },
      },
      {
        template: "our-timeline",
        heading: "Un camino desde la primera cita hasta vuestra puerta",
        brief: "Hasta veinte fotos con fecha en un camino que deslizan: dos años en orden.",
        body: "Dos años de fotos dan para un camino largo, y Nuestra línea del tiempo admite hasta veinte, cada una clavada en una curva con su fecha. Deslizan, el camino se dibuja y los años pasan en orden. A estas alturas el final del camino suele ser una dirección compartida: ponla ahí, o el plan para la siguiente.",
        line: { field: "ending", where: "La frase al final del camino", text: "Dos años, una dirección y seguimos volviendo por el camino largo." },
      },
      {
        template: "music-box",
        heading: "Da cuerda a dos años",
        body: "Caja de música espera en un tocador con encaje y su nombre en la placa dorada. Dan tres vueltas a la llave, se abre la tapa, una bailarina o dos cisnes giran con la melodía y tus fotos aparecen una a una en el espejo ovalado. Elige la Canción de cuna de Brahms para dos años tranquilos, o El lago de los cisnes para unos con drama. Tu carta sale cuando la música se apaga.",
        line: { field: "message", where: "La carta de la caja", text: "Hace dos años eras un nombre en mi móvil. Ahora eres el primero." },
      },
      {
        template: "museum",
        heading: "Dos paredes, una por cada año",
        brief: "Una galería tranquila con vuestros dos años, una placa bajo cada foto.",
        body: "Museo hace una galería con tus fotos, de dos a veinte, cada una enmarcada sobre una placa con un título, un año y una frase. Sepáralas por años: los doce primeros meses en una pared, los siguientes en otra, y que las placas digan qué cambió. La recorren deslizando.",
        line: { field: "exhibition", where: "El nombre sobre la puerta", text: "Veinticuatro meses, casi todos felices" },
      },
      {
        template: "the-letter",
        heading: "Empieza la carta donde acabó el primer año",
        body: "La carta se abre bajo un sello de lacre y sus palabras se escriben solas, a mano. Dos años dan para una carta con capítulos: lo que sabías al año y lo que has aprendido desde entonces. La primera línea admite sesenta caracteres, y queda bien junto a algo de algodón, doblado sobre su almohada.",
        line: { field: "greeting", where: "La primera línea", text: "A mi persona favorita, dos años seguidos:" },
      },
    ],
    date: { kind: "romantic", title: "Una playa, una manta de algodón y el atardecer", line: "Llevad la manta que le regalaste y quedaos hasta que oscurezca." },
    stage: [
      "A los dos años muchas parejas viven juntas o lo están hablando, comparten calendario y algunos amigos, y conocen a la familia de la otra persona desde hace tiempo. La novedad ya ha pasado y en su lugar hay algo más firme, que es justo lo que merece celebrarse. Las bromas ya tienen historia.",
      "El segundo aniversario es de algodón por tradición, y un móvil no puede ser de algodón. Así que manda el regalo en la pantalla y da el algodón en mano: una camiseta que se vaya a poner, una buena manta, un paño de cocina del sitio donde os conocisteis. Demasiado: un discurso sobre el para siempre. Demasiado poco: algo que valdría para el segundo mes.",
    ],
    faq: [
      { q: "¿Qué se regala por tradición en el segundo aniversario?", a: "Algodón. Al año toca papel y a los dos años algodón, por lo que se suaviza con el uso. Un regalo digital no puede ser de algodón, así que acompáñalo de algo que sí lo sea." },
      { q: "¿Qué se escribe al cumplir dos años?", a: "Lo que el segundo año ha añadido al primero: una rutina, una discusión que resolvisteis, un sitio que ahora es vuestro. Y después, una cosa concreta que volverías a elegir." },
      { q: "¿Veinticuatro meses y dos años son el mismo aniversario?", a: "Sí. Veinticuatro meses son el segundo aniversario, y por aquí casi todo el mundo deja de contar en meses. A partir de ahora, los regalos van por años, en la página de aniversario." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// The series
// ---------------------------------------------------------------------------------------------

export const MONTH_GUIDES: Record<number, Month> = {
  1: month1,
  6: month6,
  12: month12,
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
