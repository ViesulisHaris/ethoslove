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
// Month 2
// ---------------------------------------------------------------------------------------------

const month2: Month = {
  en: {
    title: "2 Month Anniversary Gifts for the In-Joke Stage",
    description: "Two months is the in-joke stage: a few photos, a few songs, nothing heavy yet. Five digital gifts that fit it, each with a line you can borrow as it is.",
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
        body: "Picnic is a small gift with a lot of tapping in it: the lid creaks up, and out come strawberries, lemonade and tulips, each with a tag in your words. Two months is when you learn someone’s order. Tag the food things: the fries they steal, the coffee they ruin with syrup.",
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
        body: "Photo Booth flashes four times and prints the strip, in color, black and white or sepia, beside a wall of handwritten notes. You will have a handful of photos by now, and four is the right number. Your line is written in pen on that wall: one thing you would never say out loud yet.",
        line: { field: "line", where: "The words on the wall", text: "still thinking about the second date" },
      },
      {
        template: "the-letter",
        heading: "Two months, in a letter that starts lightly",
        brief: "A wax seal, then your words appearing stroke by stroke, with a playful greeting.",
        body: "The Letter makes a small ceremony of reading: they tap through a wax seal and your words come out stroke by stroke. Keep it short at two months and keep the greeting playful, so the letter reads as a wink rather than a vow. The greeting holds sixty characters and sets the tone for the rest.",
        line: { field: "greeting", where: "The greeting", text: "To my favorite plus-one of the last two months:" },
      },
    ],
    date: { kind: "cheap", title: "An ice cream walk with no plan", line: "Walk until one of you admits you are lost." },
    stage: [
      "Two months in, the in-jokes have started and so have the photos, though most of them are still of food or of one of you squinting into the sun. You have probably met a friend or two, and you have a song that belongs to the two of you, even if nobody said so.",
      "Too much at two months: an album, a framed print, or anything that assumes the next year. Too little: forgetting, if they mentioned it last week. Aim for something that proves you were paying attention, like a dated fortune or a tag about their order, and keep the big words for later.",
    ],
    faq: [
      { q: "Do people celebrate two months of dating?", a: "Some do and some laugh at it, and the laughing ones often still like a small gift. Match what they did at one month: if they marked it, mark this one too." },
      { q: "What is a cute gift for two months together?", a: "Something built on a joke you already share: their coffee order on a tag, a song you both overplayed, your dates as lucky numbers. Cute at this stage means specific, not expensive." },
      { q: "How long should a two-month message be?", a: "A few lines. The greeting, two or three sentences about something that happened and a sign-off are plenty for eight weeks, and shorter reads as more confident." },
    ],
  },
  es: {
    title: "Regalos para 2 meses de novios, entre bromas",
    description: "A los dos meses ya hay bromas propias, unas fotos y alguna canción, y nada pesado todavía. Cinco regalos digitales para eso, cada uno con una frase lista.",
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
        body: "Pícnic es un regalo pequeño con mucho toque dentro: la tapa cruje y van saliendo fresas, limonada y tulipanes, cada cosa con una etiqueta escrita por ti. A los dos meses ya te sabes lo que pide en un bar. Etiqueta la comida: las patatas que te roba, el café que arruina con sirope.",
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
        body: "Fotomatón dispara cuatro veces e imprime la tira, en color, en blanco y negro o en sepia, junto a un muro de notas escritas a mano. A estas alturas tendréis un puñado de fotos, y cuatro es la cifra justa. Tu frase va escrita a boli en ese muro: algo que todavía no dirías en voz alta.",
        line: { field: "line", where: "Las palabras del muro", text: "sigo pensando en la segunda cita" },
      },
      {
        template: "the-letter",
        heading: "Dos meses, en una carta que empieza ligera",
        brief: "Un sello de lacre y tus palabras saliendo trazo a trazo, con un saludo con gracia.",
        body: "La carta convierte leer en una pequeña ceremonia: rompen un sello de lacre y tus palabras van saliendo trazo a trazo. A los dos meses, que sea corta y que el saludo tenga gracia, para que la carta se lea como un guiño y no como un juramento. El saludo admite sesenta caracteres y marca el tono de lo demás.",
        line: { field: "greeting", where: "El saludo", text: "Para quien me acompaña desde hace dos meses:" },
      },
    ],
    date: { kind: "cheap", title: "Un paseo con helado y sin plan", line: "Caminad hasta que uno de los dos admita que os habéis perdido." },
    stage: [
      "A los dos meses ya han empezado las bromas propias y las fotos, aunque casi todas son de comida o de uno de los dos guiñando los ojos al sol. Seguramente conocéis ya a algún amigo del otro, y tenéis una canción que es vuestra, aunque nadie lo haya dicho.",
      "Demasiado a los dos meses: un álbum, una lámina enmarcada o cualquier cosa que dé por hecho el año que viene. Demasiado poco: olvidarlo, si lo mencionó la semana pasada. Busca algo que demuestre que prestabas atención, como una fortuna con fecha o una etiqueta con lo que pide siempre, y guarda las palabras grandes para más adelante.",
    ],
    faq: [
      { q: "¿Se celebran los dos meses de novios?", a: "Hay quien sí y quien se ríe de ello, y a menudo a quien se ríe también le gusta un detalle pequeño. Haz lo mismo que al mes: si esa persona lo celebró, celebra este." },
      { q: "¿Qué regalo bonito se hace a los dos meses?", a: "Uno hecho con una broma que ya compartís: su café en una etiqueta, una canción que habéis gastado, vuestras fechas como números de la suerte. Bonito, a estas alturas, es concreto, no caro." },
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
    description: "Three months is often when “me” turns into “we”. Five digital gifts with a dozen photos in mind, each with a line to borrow, from a scratch card to a record.",
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
        brief: "Photos under foil, one from each month, with a few words on the foil itself.",
        body: "Scratch Card covers each photo in foil that a fingertip rubs away, and the foil itself can carry a few words. Three cards suit three months: one picture from each, in order, with the latest last. Write on the foil what to expect underneath, in thirty characters, so the scratching has a reason.",
        line: { field: "foilText", where: "The words on the foil", text: "month three is under here" },
      },
      {
        template: "sticker-bomb",
        heading: "One line before the first sticker",
        brief: "A single line on an empty page, then stickers wherever they tap.",
        body: "Before anything happens, Sticker Bomb shows them a single line on an empty page, and then the stickers start landing wherever they tap. That opening line is yours, forty characters at most. Three months in, make it a promise you can keep, then let up to six of your photos land as polaroids.",
        line: { field: "prompt", where: "The line on the empty page", text: "Three months. Go on, decorate us." },
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
        body: "Digicam is a little 2006 camera: they press power, the lens whirs out, and the photos are on its roll with an orange date in the corner. Up to twelve fit, which is four a month for three months. The cut-out title above the camera takes twenty-four characters; when it is not a birthday, it can say anything.",
        line: { field: "headline", where: "The cut-out title", text: "our first season" },
      },
      {
        template: "bouquet",
        heading: "A bouquet in their colors, not red",
        brief: "Their colors instead of red roses, up to 24 stems, and a card of thirty characters.",
        body: "At three months you know their color, so skip the red roses and build Bouquet from what they would choose: up to 24 stems, arranged and rearranged until it looks right, then gathered on their screen flower by flower. The little card takes thirty characters. Use them for the word you two now use.",
        line: { field: "cardNote", where: "On the card", text: "From us. Weird to write that." },
      },
    ],
    date: { kind: "romantic", title: "Up before the city, with breakfast", line: "Watch the sun come up from somewhere you can both see it." },
    stage: [
      "Three months is a season, and it is often the point where a couple starts saying “we” without noticing. Friends have been met, plans are made in the plural, and somewhere there are a dozen photos that are good enough to keep. The early nerves are mostly gone, and the real habits are starting to show.",
      "Too much at three months: meeting the family as a gift, a key, a trip that needs vacation days. Too little: a reused message from month one. The right size uses the photos you now have, a dozen of them at most, and one sentence that says “we” on purpose.",
    ],
    faq: [
      { q: "Is three months a big deal in a relationship?", a: "It is often the first real checkpoint: the point where it stops being new and starts being yours. Many couples mark it quietly, with a small gift and a dinner." },
      { q: "What should I get for three months of dating?", a: "Something with the photos you have taken together, since there are enough of them now: under foil, on a camera roll or as album covers. Keep the cost in time, not money." },
      { q: "How many photos does a three-month gift need?", a: "Three to twelve. Scratch Card needs one at least and works best with one per month; Digicam and Vinyl each take up to twelve; Bouquet and Sticker Bomb need none." },
    ],
  },
  es: {
    title: "Regalos para 3 meses de novios: ya sois «nosotros»",
    description: "A los tres meses el «yo» suele volverse «nosotros». Cinco regalos digitales pensados para una docena de fotos, con frases listas, de un rasca y gana a un disco.",
    h1: "Regalos para 3 meses de novios",
    label: "3 meses",
    hero: {
      line: "Una estación juntos. En algún momento, el «yo» se volvió «nosotros» sin avisar.",
      sentence: "A estas alturas hay una docena de fotos que merecen guardarse y amigos que ya saben tu nombre: basta para un regalo con fotos de verdad.",
    },
    ideasTitle: "Cinco para la primera estación juntos",
    ideas: [
      {
        template: "scratch-card",
        heading: "Tres fotos para rascar, una por mes",
        brief: "Fotos bajo la capa de rascar, una de cada mes, con unas palabras en la propia capa.",
        body: "Rasca y gana tapa cada foto con una capa que se quita con la yema del dedo, y la propia capa puede llevar unas palabras. Tres tarjetas encajan con tres meses: una foto de cada uno, en orden, con la más reciente al final. Escribe en la capa lo que hay debajo, en treinta caracteres, para que rascar tenga motivo.",
        line: { field: "foilText", where: "Las palabras de la capa", text: "aquí debajo, el tercer mes" },
      },
      {
        template: "sticker-bomb",
        heading: "Una frase antes del primer sticker",
        brief: "Una sola frase en una página vacía y luego stickers donde toquen.",
        body: "Antes de nada, Bomba de Stickers le enseña una sola frase en una página vacía, y luego los stickers caen donde toque. Esa primera frase es tuya, de cuarenta caracteres como mucho. A los tres meses, que sea una promesa que puedas cumplir, y deja que hasta seis fotos tuyas caigan como polaroids.",
        line: { field: "prompt", where: "La frase de la página vacía", text: "Tres meses. Venga, decóranos." },
      },
      {
        template: "vinyl",
        heading: "Un álbum con un título que solo pilláis vosotros",
        brief: "Un título de álbum que solo entendéis vosotros y tus fotos como portadas en una caja.",
        body: "La funda de Vinilo lleva un título de álbum de hasta cuarenta caracteres, y tus fotos esperan en una caja como las portadas que van pasando. A los tres meses, titula el álbum con eso que decís y nadie más entiende. Pon tu nombre donde iría el artista. La canción suena en el plato mientras lo leen.",
        line: { field: "album", where: "El título del álbum", text: "Grandes éxitos del suelo de la cocina" },
      },
      {
        template: "digicam",
        heading: "Una camarita con el carrete de esta estación",
        body: "Digicam es una camarita de 2006: pulsan el botón, el objetivo sale zumbando y las fotos están en su carrete con una fecha naranja en la esquina. Caben hasta doce, que son cuatro por mes en tres meses. El título recortado de encima admite veinticuatro caracteres; si no es un cumpleaños, puede decir lo que quieras.",
        line: { field: "headline", where: "El título recortado", text: "nuestra primera estación" },
      },
      {
        template: "bouquet",
        heading: "Un ramo en sus colores, sin rosas rojas",
        brief: "Sus colores en vez de rosas rojas, hasta 24 tallos y una tarjeta de treinta caracteres.",
        body: "A los tres meses ya sabes qué color le gusta, así que olvida las rosas rojas y monta Ramo con lo que esa persona elegiría: hasta 24 tallos, colocados y recolocados hasta que quede bien, que luego se juntan en su pantalla flor a flor. La tarjetita admite treinta caracteres. Úsalos para la palabra que ahora usáis.",
        line: { field: "cardNote", where: "En la tarjeta", text: "De los dos. Qué raro suena" },
      },
    ],
    date: { kind: "romantic", title: "Despertar antes que la ciudad, con desayuno", line: "Ved salir el sol desde algún sitio donde lo veáis los dos." },
    stage: [
      "Tres meses son una estación, y a menudo es cuando una pareja empieza a decir «nosotros» sin darse cuenta. Ya conocéis a los amigos, los planes se hacen en plural y en algún sitio hay una docena de fotos lo bastante buenas para guardarlas. Los nervios del principio casi se han ido y empiezan a verse las costumbres de verdad.",
      "Demasiado a los tres meses: presentar a la familia como regalo, una llave, un viaje que pida días de vacaciones. Demasiado poco: reciclar el mensaje del primer mes. La medida justa usa las fotos que ya tenéis, una docena como mucho, y una frase que diga «nosotros» a propósito.",
    ],
    faq: [
      { q: "¿Los tres meses son importantes en una relación?", a: "Suelen ser el primer punto de control de verdad: cuando deja de ser nuevo y empieza a ser vuestro. Muchas parejas lo celebran sin ruido, con un regalo pequeño y una cena." },
      { q: "¿Qué regalo hago por tres meses de novios?", a: "Algo con las fotos que os habéis hecho juntos, que ya hay suficientes: bajo una capa para rascar, en el carrete de una cámara o como portadas de discos. Que cueste tiempo, no dinero." },
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
    description: "Four months is often when the first weekend away happens. Five digital gifts that turn its photos into the present, each with a line to borrow.",
    h1: "4 month anniversary gifts",
    label: "4 months",
    hero: {
      line: "If there was a first weekend away, its photos are the gift.",
      sentence: "Around four months many couples take their first short trip, and a camera roll from somewhere else says more than anything you could buy for it.",
    },
    ideasTitle: "Five that start with the weekend away",
    ideas: [
      {
        template: "digicam",
        heading: "The weekend away, on a 2006 camera roll",
        brief: "The weekend’s photos on a little camera, date-stamped with the days you were away.",
        body: "Load Digicam’s roll in the order the weekend happened, up to twelve photos, and set the orange date stamp to the days you were away. They press power, the lens whirs, and they flick through it like you did on the train home. Afterwards the roll prints as a strip, and then comes your letter.",
        line: { field: "headline", where: "The cut-out title", text: "48 hours somewhere else" },
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
        template: "sticker-bomb",
        heading: "Label strips for what the trip taught you",
        brief: "Six label-maker strips under the stickers, each one a thing the trip taught you.",
        body: "Sticker Bomb puts a label-maker strip under every other sticker that lands, up to six of them, in the order you wrote. Make each one a thing you learned on the weekend: who wakes first, who cannot read a map, who hogs the window seat. Pick the Cats with opinions pack, if the strips are blunt.",
        line: { field: "labels", where: "One label-maker strip", text: "certified map reader (not)" },
      },
      {
        template: "bouquet",
        heading: "Flowers that sum up the trip in a line",
        brief: "Build the bouquet around a flower from the trip, and name the place on the card.",
        body: "If the trip had a flower in it, a field you stopped at or a stall at the market, put that one in the Bouquet you build. You arrange up to 24 stems and they watch it fill in one at a time. The card holds thirty characters, which is room for the place and a date.",
        line: { field: "cardNote", where: "The bouquet’s card", text: "From the market in the rain" },
      },
    ],
    date: { kind: "cheap", title: "Breakfast at sunrise, back home", line: "Get up early once more, now that you are back." },
    stage: [
      "Around four months a first weekend away is common: a cheap room, a long drive, a city neither of you knew. It is the first time you see how the other one travels, early or late, planned or not, and you come back with photos that are about the two of you rather than the food.",
      "Too much at four months: next year’s holiday, booked as a present. Too little: a gift that ignores the trip if there was one. If there was no trip, use the trip you would like to take, as a plan with a date. Either way the gift is the weekend, told back to them.",
    ],
    faq: [
      { q: "What do you do for a four-month anniversary?", a: "Something small that looks back at what you have done together so far, often the first trip, and a plan for an evening. Four months rarely needs more than that." },
      { q: "Is a weekend away too much at four months?", a: "As a plan, no; booking a week abroad as a surprise often is. A short trip you both talked about, with a date on it, sits well at this stage." },
      { q: "What if we have not traveled together yet?", a: "Make the gift about the trip you will take: the camera roll from your best day at home, and the destination on a card or in the charge the cats read out." },
    ],
  },
  es: {
    title: "Regalos de 4 meses de novios: la primera escapada",
    description: "A los cuatro meses suele llegar la primera escapada de fin de semana. Cinco regalos digitales que convierten sus fotos en el regalo, con frases listas.",
    h1: "Regalos para 4 meses de novios",
    label: "4 meses",
    hero: {
      line: "Si hubo una primera escapada, sus fotos son el regalo.",
      sentence: "Hacia los cuatro meses muchas parejas hacen su primer viaje corto, y un carrete de otro sitio dice más que cualquier cosa que puedas comprar.",
    },
    ideasTitle: "Cinco que empiezan por la escapada",
    ideas: [
      {
        template: "digicam",
        heading: "La escapada, en una camarita de 2006",
        brief: "Las fotos del fin de semana en una camarita, con la fecha de los días fuera.",
        body: "Carga el carrete de Digicam en el orden en que pasó el fin de semana, hasta doce fotos, y pon en la fecha naranja los días que estuvisteis fuera. Pulsan el botón, el objetivo zumba y lo pasan como lo pasasteis en el tren de vuelta. Al final el carrete se imprime en tira y después llega tu carta.",
        line: { field: "headline", where: "El título recortado", text: "48 horas en otro sitio" },
      },
      {
        template: "the-council",
        heading: "Un juicio sobre quién hizo la maleta",
        body: "El Consejo es un tribunal de gatos que juzga a la persona a quien se lo envías. Tú escribes la acusación, de hasta sesenta caracteres, y las conclusiones que leen los gatos, y eliges el sello que lo cierra. A los cuatro meses, el primer viaje pone las pruebas: el mapa, los snacks, el despertador.",
        line: { field: "charge", where: "La acusación", text: "llevar cuatro jerséis para dos noches fuera" },
      },
      {
        template: "on-repeat",
        heading: "Una nota a mano bajo la música del viaje",
        brief: "Un collage alrededor de vuestra canción, cada foto una pista y una nota a mano bajo el reproductor.",
        body: "En bucle se convierte en un collage de stickers cuando le dan al play, con vuestra canción en el reproductor grande y cada foto como una pista. Bajo el reproductor va una nota escrita a mano, de sesenta caracteres. Pon ahí el viaje: la canción del coche y una frase sobre el momento en que dejó de parecer la primera vez.",
        line: { field: "note", where: "La nota a mano", text: "Sonaba esta cuando nos pasamos la salida. Dos veces." },
      },
      {
        template: "sticker-bomb",
        heading: "Tiras de rotuladora con lo que enseñó el viaje",
        brief: "Seis tiras de rotuladora bajo los stickers, cada una algo que os enseñó el viaje.",
        body: "Bomba de Stickers pone una tira de rotuladora bajo uno de cada dos stickers que caen, hasta seis, en el orden en que las escribiste. Que cada una sea algo que aprendiste ese fin de semana: quién se despierta antes, quién no sabe leer un mapa, quién se queda la ventanilla. Elige el pack Gatos con opiniones si las tiras son directas.",
        line: { field: "labels", where: "Una tira de rotuladora", text: "lee mapas (no es verdad)" },
      },
      {
        template: "bouquet",
        heading: "Flores que resumen el viaje en una frase",
        brief: "Monta el ramo alrededor de una flor del viaje y pon el sitio en la tarjeta.",
        body: "Si el viaje tuvo una flor, un campo donde parasteis o un puesto del mercado, pon esa en el Ramo que montes. Colocas hasta 24 tallos y lo ven llenarse de uno en uno. La tarjeta admite treinta caracteres, sitio de sobra para el lugar y una fecha.",
        line: { field: "cardNote", where: "La tarjeta del ramo", text: "Del mercado, bajo la lluvia" },
      },
    ],
    date: { kind: "cheap", title: "Desayuno al amanecer, ya en casa", line: "Madrugad una vez más, ahora que habéis vuelto." },
    stage: [
      "Hacia los cuatro meses es habitual la primera escapada de fin de semana: una habitación barata, un viaje largo en coche, una ciudad que ninguno conocía. Es la primera vez que ves cómo viaja la otra persona, pronto o tarde, con plan o sin él, y volvéis con fotos que van de vosotros y no de la comida.",
      "Demasiado a los cuatro meses: las vacaciones del año que viene, reservadas como regalo. Demasiado poco: un regalo que hace como si el viaje no hubiera pasado. Si no hubo viaje, usa el que os gustaría hacer, como un plan con fecha. En los dos casos, el regalo es el fin de semana contado de vuelta.",
    ],
    faq: [
      { q: "¿Qué se hace por los cuatro meses de novios?", a: "Algo pequeño que mire atrás a lo que habéis hecho juntos, a menudo el primer viaje, y un plan para una noche. A los cuatro meses rara vez hace falta más." },
      { q: "¿Una escapada es demasiado a los cuatro meses?", a: "Como plan, no; reservar una semana fuera por sorpresa a menudo sí. Un viaje corto del que ya habéis hablado, con fecha, encaja bien en esta etapa." },
      { q: "¿Y si todavía no hemos viajado juntos?", a: "Haz el regalo sobre el viaje que haréis: el carrete de vuestro mejor día en casa, y el destino en una tarjeta o en la acusación que leen los gatos." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 5
// ---------------------------------------------------------------------------------------------

const month5: Month = {
  en: {
    title: "5 Month Anniversary Gifts for the Quiet Month",
    description: "Five months is the quiet one before the half-year. Five small digital gifts that mark it lightly and leave the big idea for month six, with lines to borrow.",
    h1: "5 month anniversary gifts",
    label: "5 months",
    hero: {
      line: "The month before the half-year. Mark it lightly and save the big idea.",
      sentence: "Five months rarely gets a party, which is exactly why a small, warm gift lands well, as long as it does not use up what you planned for six.",
    },
    ideasTitle: "Five small ones, nothing borrowed from six",
    ideas: [
      {
        template: "photo-booth",
        heading: "A lit sign over the booth",
        brief: "A lit sign over a photo booth, and four ordinary photos printed as a strip.",
        body: "Photo Booth lights a sign over the booth, twenty-four characters on two lines if you use the dot, and below it four flashes print a strip. Five months is a fine excuse for a sign that says nothing grand. The four photos can be from any ordinary day, which is the point of this month.",
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
        brief: "Each crease is held until it folds, and every fold that lands shows one line.",
        body: "Paper Crane asks for patience: they hold each crease until it folds, and if they let go too soon the paper springs back. Every fold that lands shows one of your lines, up to six. Write five, one per month, short enough to read at a glance. The finished crane flies off and your letter stays.",
        line: { field: "lines", where: "The line on one fold", text: "Month five: you still laugh at the joke from month one." },
      },
      {
        template: "kawaii",
        heading: "A plushie who says it for you",
        brief: "A bunny, a bear or a kitten says your line, and photos stick on like stickers.",
        body: "Kawaii puts a bunny, a bear or a kitten on the screen to say your line, up to sixty characters, while a ribbon banner holds twenty-four more. Photos go up like stickers, eight at most. In a quiet month, cute is allowed to do the talking: let the plushie say the soft thing you would mumble.",
        line: { field: "greeting", where: "What the plushie says", text: "Five months and you still steal the blanket." },
      },
      {
        template: "text-thread",
        heading: "A chat that plays back an ordinary evening",
        brief: "Your messages played back bubble by bubble, rebuilt from an ordinary weeknight.",
        body: "Text Thread replays a conversation bubble by bubble, with the dots that mean someone is typing, from two bubbles up to forty. For month five, rebuild an ordinary weeknight exchange: what to eat, who is closer, the photo of the dog. The last bubble is the one you would never type on a Tuesday.",
        line: { field: "lines", where: "The last bubble", text: "anyway. five months. I like the Tuesdays most." },
      },
    ],
    date: { kind: "rainy-day", title: "A film and a late dessert in the rain", line: "Pick the film by coin toss and the dessert by vote." },
    stage: [
      "Five months is the quiet stretch before the half-year. Routines have formed, some evenings are ordinary on purpose, and many couples have stopped performing for each other a little. It is a good sign and an easy month to let pass, which is why a small gift reads as attention rather than as an event.",
      "Too much at five months: spending the idea you have saved for six, or a gift that asks for a big answer. Too little: nothing, if you marked one and two. Keep it light and specific, a plushie with a line or a replayed chat, and keep the jar, the road or the album for next month.",
    ],
    faq: [
      { q: "Should I get something for five months?", a: "If you have marked the months so far, a small gift keeps the habit going. If you have not, a sweet message is enough and saves the effort for the half-year." },
      { q: "What is a good five-month message?", a: "Something about the ordinary days, since that is what this month is made of: the Tuesday dinners, the shared playlist, the walk home. Keep it to a few lines." },
      { q: "Should I save the bigger gift for six months?", a: "Yes. Six months is the one most people mark, so keep the jar of reasons, the dated road or the scrapbook for then, and keep this month small and funny." },
    ],
  },
  es: {
    title: "Regalos para 5 meses de novios, el mes tranquilo",
    description: "Cinco meses es el mes tranquilo antes del medio año. Cinco regalos digitales pequeños que lo marcan sin gastar la gran idea del sexto, con frases listas.",
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
        body: "Fotomatón enciende un letrero sobre la cabina, veinticuatro caracteres en dos líneas si usas el punto, y debajo cuatro flashes imprimen una tira. Cinco meses son buena excusa para un letrero que no dice nada solemne. Las cuatro fotos pueden ser de cualquier día normal, que es de lo que va este mes.",
        line: { field: "sign", where: "El letrero", text: "CINCO MESES · SIN MÁS" },
      },
      {
        template: "favorite-person",
        heading: "Una nota rasgada que dice quién es",
        brief: "Polaroids con cinta de cuadros y una nota rasgada que dice quién es para ti.",
        body: "Mi persona favorita es una página de polaroids sujetas con cinta de cuadros, flores al pie y una nota rasgada en el centro que dice quién es esa persona para ti. La nota admite veintidós caracteres, así que elige bien la palabra. Empieza por la foto más antigua que tengas y deja que la carta de abajo le dé las gracias por un día.",
        line: { field: "title", where: "La nota rasgada", text: "mi costumbre favorita" },
      },
      {
        template: "paper-crane",
        heading: "Cinco pliegues, uno por cada mes",
        brief: "Cada pliegue se mantiene pulsado hasta que se dobla, y cada uno muestra una frase.",
        body: "Grulla de papel pide paciencia: mantienen pulsado cada pliegue hasta que se dobla, y si sueltan antes de tiempo el papel se abre. Cada pliegue que sale muestra una de tus frases, hasta seis. Escribe cinco, una por mes, cortas para leerlas de un vistazo. La grulla terminada sale volando y tu carta se queda.",
        line: { field: "lines", where: "La frase de un pliegue", text: "Mes cinco: sigues riéndote del chiste del primer mes." },
      },
      {
        template: "kawaii",
        heading: "Un peluche que lo dice por ti",
        brief: "Un conejito, un oso o un gatito dice tu frase y las fotos se pegan como stickers.",
        body: "Kawaii pone en pantalla un conejito, un oso o un gatito que dice tu frase, de hasta sesenta caracteres, mientras una cinta lleva veinticuatro más. Las fotos se pegan como stickers, ocho como mucho. En un mes tranquilo, lo mono puede hablar por ti: deja que el peluche diga eso tierno que tú dirías en voz baja.",
        line: { field: "greeting", where: "Lo que dice el peluche", text: "Cinco meses y me sigues robando la manta." },
      },
      {
        template: "text-thread",
        heading: "Un chat que repite una noche cualquiera",
        brief: "Vuestros mensajes, burbuja a burbuja, sacados de una noche normal entre semana.",
        body: "Hilo de mensajes repite una conversación burbuja a burbuja, con los puntos de quien está escribiendo, de dos burbujas a cuarenta. Para el quinto mes, reconstruye un intercambio normal de entre semana: qué cenamos, quién está más cerca, la foto del perro. La última burbuja es la que nunca escribirías un martes.",
        line: { field: "lines", where: "La última burbuja", text: "en fin. cinco meses. los martes son lo que más me gusta." },
      },
    ],
    date: { kind: "rainy-day", title: "Una peli y un postre tardío, con lluvia", line: "Elegid la peli a cara o cruz y el postre a votación." },
    stage: [
      "Cinco meses es el tramo tranquilo antes del medio año. Ya hay rutinas, algunas noches son normales a propósito y muchas parejas han dejado un poco de actuar para la otra persona. Es buena señal y un mes fácil de dejar pasar, por eso un detalle pequeño se lee como atención y no como acontecimiento.",
      "Demasiado a los cinco meses: gastar la idea que guardabas para los seis, o un regalo que pida una respuesta grande. Demasiado poco: nada, si celebraste el primero y el segundo. Que sea ligero y concreto, un peluche con una frase o un chat repetido, y guarda el frasco, el camino o el álbum para el mes que viene.",
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
    description: "Nobody plans anything for seven months, which makes it the best month for a surprise. Five digital gifts that arrive out of nowhere, with lines to borrow.",
    h1: "7 month anniversary gifts",
    label: "7 months",
    hero: {
      line: "Nobody expects anything at seven months. That is your advantage.",
      sentence: "Seven has no tradition and no pressure attached, so a gift that turns up on an ordinary weekday reads as pure attention, not as duty.",
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
        body: "Scratch Card is built for news: photos under foil, one card after another, and a headline that waits on the last. Seven months is a good month to put a small surprise there, a booked table or a Saturday you have cleared. Give it a day and a time so it reads as settled.",
        line: { field: "finalTitle", where: "The last card’s headline", text: "Saturday is cleared. Wear shoes you can walk in." },
      },
      {
        template: "on-repeat",
        heading: "A song for an ordinary month",
        body: "Press play on On Repeat and the screen fills into a collage: your song on the big player, your photos as the tracks, a bow, a heart paperclip on a handwritten note. That note holds sixty characters. Seven months in, write what this song is to you now that it is no longer new.",
        line: { field: "note", where: "The note under the player", text: "Still our song. Still skipping the intro." },
      },
    ],
    date: { kind: "cheap", title: "A golden-hour picnic with nothing to celebrate", line: "Bring two things to eat and one thing to say." },
    stage: [
      "At seven months the relationship is past the early checkpoints and not yet near the year. The calendar has nothing on it, nobody is counting out loud, and the days have settled into a rhythm that is comfortable, maybe a little too comfortable. That is the reason to mark it: quietly, without warning.",
      "Too much at seven months: a gift so large it starts a habit of monthly presents you cannot keep. Too little: a gift that admits it was a reminder on your phone. The right one turns up midweek, says plainly that it is seven months, and asks for nothing back.",
    ],
    faq: [
      { q: "Do you celebrate seven months?", a: "Few couples do, which is what makes a small gift at seven months feel like a surprise rather than an obligation. A message and one plan are enough." },
      { q: "What is a good surprise for seven months together?", a: "Something that arrives without an occasion: flowers on a weekday, a chat that begins with groceries, or a cleared Saturday revealed under foil. The surprise is the timing." },
      { q: "Is it weird to mark every month?", a: "Only if it starts to feel like homework. After six months many couples stop counting each one, so mark seven only if you both still enjoy it." },
    ],
  },
  es: {
    title: "Regalos para 7 meses de novios que nadie espera",
    description: "Nadie prepara nada para los siete meses, y por eso es el mejor mes para una sorpresa. Cinco regalos digitales que llegan sin avisar, con frases listas.",
    h1: "Regalos para 7 meses de novios",
    label: "7 meses",
    hero: {
      line: "Nadie espera nada a los siete meses. Esa es tu ventaja.",
      sentence: "El siete no tiene tradición ni presión, así que un regalo que aparece un día cualquiera entre semana se lee como pura atención, no como obligación.",
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
        body: "Coquette es una página larga de polaroids, hasta diez, con una postal escrita a mano bajo la primera y tu carta esperando abajo del todo en papel rasgado. La postal admite noventa caracteres. Úsala para algo pequeño que sigues haciendo por esa persona, siete meses después.",
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
        body: "Rasca y gana está hecho para dar noticias: fotos bajo la capa, una tarjeta tras otra y un titular esperando en la última. Siete meses es buen mes para poner ahí una sorpresa pequeña, una mesa reservada o un sábado que has dejado libre. Ponle día y hora para que se lea como algo decidido.",
        line: { field: "finalTitle", where: "El titular de la última tarjeta", text: "El sábado está libre. Ponte calzado cómodo." },
      },
      {
        template: "on-repeat",
        heading: "Una canción para un mes normal",
        body: "Le dan al play en En bucle y la pantalla se llena de collage: vuestra canción en el reproductor grande, tus fotos como pistas, un lazo y un sujetapapeles de corazón sobre una nota a mano. Esa nota admite sesenta caracteres. A los siete meses, escribe qué es para ti esa canción ahora que ya no es nueva.",
        line: { field: "note", where: "La nota bajo el reproductor", text: "Sigue siendo la nuestra. Y seguimos saltando la intro." },
      },
    ],
    date: { kind: "cheap", title: "Un pícnic al atardecer sin nada que celebrar", line: "Llevad dos cosas para comer y una cosa que decir." },
    stage: [
      "A los siete meses la relación ha pasado los primeros controles y todavía no se acerca al año. El calendario no marca nada, nadie cuenta en voz alta y los días han cogido un ritmo cómodo, quizá demasiado. Por eso merece la pena marcarlo: sin ruido y sin avisar.",
      "Demasiado a los siete meses: un regalo tan grande que empiece una costumbre de regalos mensuales que no podrás mantener. Demasiado poco: un regalo que confiesa que era un aviso del móvil. El bueno aparece entre semana, dice claramente que son siete meses y no pide nada a cambio.",
    ],
    faq: [
      { q: "¿Se celebran los siete meses?", a: "Pocas parejas lo hacen, y por eso un detalle a los siete meses se siente como sorpresa y no como obligación. Bastan un mensaje y un plan." },
      { q: "¿Qué sorpresa se puede dar a los siete meses?", a: "Algo que llegue sin ocasión: flores un día laborable, un chat que empieza por la compra o un sábado libre que aparece al rascar. La sorpresa está en el momento." },
      { q: "¿Es raro celebrar todos los meses?", a: "Solo si empieza a parecer deberes. Después de los seis meses muchas parejas dejan de contar cada uno, así que celebra el séptimo solo si a los dos os sigue gustando." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 8
// ---------------------------------------------------------------------------------------------

const month8: Month = {
  en: {
    title: "8 Month Anniversary Gifts That Know Their Taste",
    description: "By eight months you know their music and their order by heart. Five digital gifts that put that knowledge to work, each with a line you can borrow.",
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
        template: "digicam",
        heading: "Eight months of dinners on one camera",
        brief: "Your shared meals on a little camera roll, each photo date-stamped and captioned with the dish.",
        body: "Fill Digicam with the meals you have shared, up to twelve photos, each with its orange date stamp, and write the dish in the caption in the screen’s pixel type. They flick through it with arrows or a swipe. Over the camera, the magazine cut-out title takes twenty-four characters: the name of your usual place.",
        line: { field: "headline", where: "The cut-out title", text: "table for two, again" },
      },
      {
        template: "keepsake",
        heading: "One word, torn out of a book they love",
        brief: "A sealed parcel of kept things, among them one word torn out of a book.",
        body: "Keepsake arrives as a parcel under a wax seal, and inside are kept things: your first photo under dried flowers, a ticket with a number, a gold locket, and one word torn from a book. By eight months you know which book. The word slot takes fourteen characters, so pick the one they would underline.",
        line: { field: "word", where: "The torn-out word", text: "stay" },
      },
      {
        template: "picnic",
        heading: "A picnic of their actual favorites",
        brief: "A gingham basket unpacked item by item, each with a tag about a favorite.",
        body: "Picnic lets you unpack a gingham basket item by item with a tag on each, three to eight tags, and your letter is the folded note underneath. At eight months you can be exact: the cheese they buy for themselves, the drink they order twice. Write the tags as if you were handing each one over.",
        line: { field: "labels", where: "A tag on one thing", text: "the cheese you hide from guests" },
      },
      {
        template: "fortune-cookie",
        heading: "Fortunes that predict their usual order",
        brief: "Cookies crack open to fortunes that predict, with total confidence, what they always order.",
        body: "Fortune Cookie cracks open on a tap and a slip slides out, three fortunes at least and twenty at most, with a photo on some. Eight months of watching them order makes this easy: predict, with total confidence, the thing they always choose. The last cookie carries your message, which can be less of a joke.",
        line: { field: "fortunes", where: "One of the fortunes", text: "You will order the same pasta and say you meant to try something new." },
      },
    ],
    date: { kind: "rainy-day", title: "A bookshop, then coffee, and a book each", line: "Choose a book for each other and swap them over coffee." },
    stage: [
      "By eight months you have watched them order, cook, shop and choose music enough times to know the patterns. Many couples have a usual place by now, a drawer or a toothbrush at the other’s home, and a few routines that started as accidents. The guessing stage is over, and gifts can show it.",
      "Too much at eight months: something expensive from a list they never wrote. Too little: a generic gift that could be for anyone their age. The right one is narrow on purpose, the exact song or snack or word, so that the gift could only ever have been for them.",
    ],
    faq: [
      { q: "What do you get someone for eight months together?", a: "Something that shows what you have learned about them: their real playlist, the dish they always order, a word from a book they love. Specific beats expensive at eight months." },
      { q: "Is eight months an anniversary people mark?", a: "Not usually with anything big. It is a good month for a small, precise gift, since you know their taste by now and the year is still a while away." },
      { q: "How do I make a gift feel personal at eight months?", a: "Use details only you would know: the order, the song in the shower, the cheese they hide. One exact detail is worth more than a paragraph of general praise." },
    ],
  },
  es: {
    title: "Regalos para 8 meses de novios que aciertan",
    description: "A los ocho meses te sabes su música y lo que pide de memoria. Cinco regalos digitales que usan lo que has aprendido, cada uno con una frase lista.",
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
        template: "digicam",
        heading: "Ocho meses de cenas en una cámara",
        brief: "Vuestras comidas en el carrete de una camarita, cada foto con su fecha y el plato al pie.",
        body: "Llena Digicam con las comidas que habéis compartido, hasta doce fotos, cada una con su fecha naranja, y escribe el plato en el pie con la letra pixelada de la pantalla. Las pasan con las flechas o deslizando. Encima de la cámara, el título recortado de revista admite veinticuatro caracteres: el nombre de vuestro sitio de siempre.",
        line: { field: "headline", where: "El título recortado", text: "mesa para dos, otra vez" },
      },
      {
        template: "keepsake",
        heading: "Una palabra arrancada de un libro que le encanta",
        brief: "Un paquete sellado de cosas guardadas, entre ellas una palabra arrancada de un libro.",
        body: "Recuerdo llega como un paquete con sello de lacre, y dentro hay cosas guardadas: tu primera foto bajo flores secas, un billete con un número, un relicario de oro y una palabra arrancada de un libro. A los ocho meses ya sabes de qué libro. El hueco admite catorce caracteres, así que elige la que esa persona subrayaría.",
        line: { field: "word", where: "La palabra arrancada", text: "quédate" },
      },
      {
        template: "picnic",
        heading: "Un pícnic con sus favoritos de verdad",
        brief: "Una cesta de cuadros que se vacía cosa a cosa, cada una con una etiqueta sobre un favorito.",
        body: "Pícnic te deja vaciar una cesta de cuadros cosa a cosa, con una etiqueta en cada una, de tres a ocho, y tu carta es la nota doblada de debajo. A los ocho meses puedes ser exacto: el queso que se compra para sí, la bebida que pide dos veces. Escribe las etiquetas como si se las fueras dando en mano.",
        line: { field: "labels", where: "La etiqueta de una cosa", text: "el queso que escondes de las visitas" },
      },
      {
        template: "fortune-cookie",
        heading: "Fortunas que adivinan lo que siempre pide",
        brief: "Galletas que se abren con fortunas que predicen, muy seguras, lo que siempre pide.",
        body: "Galleta de la fortuna se abre con un toque y sale una tira, tres fortunas como mínimo y veinte como mucho, algunas con foto. Ocho meses viéndole pedir lo ponen fácil: predice, con total seguridad, lo que elige siempre. La última galleta lleva tu mensaje, y ese puede ir menos en broma.",
        line: { field: "fortunes", where: "Una de las fortunas", text: "Pedirás la misma pasta y dirás que querías probar algo nuevo." },
      },
    ],
    date: { kind: "rainy-day", title: "Una librería, luego café y un libro cada uno", line: "Elegid un libro el uno para el otro y cambiadlos con el café." },
    stage: [
      "A los ocho meses ya has visto a esa persona pedir, cocinar, comprar y elegir música suficientes veces como para conocer sus patrones. Muchas parejas tienen ya su sitio de siempre, un cajón o un cepillo de dientes en casa del otro y unas rutinas que empezaron por casualidad. Se acabó adivinar, y los regalos pueden notarlo.",
      "Demasiado a los ocho meses: algo caro de una lista que nunca escribió. Demasiado poco: un regalo genérico que valdría para cualquiera de su edad. El bueno es estrecho a propósito, la canción, el picoteo o la palabra exactos, para que el regalo solo pudiera ser para esa persona.",
    ],
    faq: [
      { q: "¿Qué se regala por ocho meses juntos?", a: "Algo que demuestre lo que has aprendido: su playlist de verdad, el plato que siempre pide, una palabra de un libro que le encanta. A los ocho meses, lo concreto gana a lo caro." },
      { q: "¿Los ocho meses son un aniversario que se celebre?", a: "Normalmente no con nada grande. Es buen mes para un regalo pequeño y preciso, porque ya conoces sus gustos y el año todavía queda lejos." },
      { q: "¿Cómo hago que un regalo sea personal a los ocho meses?", a: "Usa detalles que solo sepas tú: lo que pide, la canción de la ducha, el queso que esconde. Un detalle exacto vale más que un párrafo de elogios generales." },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Month 9
// ---------------------------------------------------------------------------------------------

const month9: Month = {
  en: {
    title: "9 Month Anniversary Gifts for Three Quarters of a Year",
    description: "Nine months is three quarters of a year, and nine photos, one a month, fill a constellation. Five digital gifts for it, each with a line to borrow.",
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
        body: "Constellations turns each photo into a star, three at least and twelve at most, and joins them into one shape: a heart, an infinity sign or a star. Nine months gives nine stars, and the shape fills out well. When it is complete, your last line appears over it, up to 120 characters.",
        line: { field: "finalLine", where: "The line when it completes", text: "Nine months, and I would still pick the same sky." },
      },
      {
        template: "keepsake",
        heading: "A locket with three quarters engraved",
        brief: "A gold locket that opens on a tap, with eighteen characters engraved on it.",
        body: "The gold locket in Keepsake opens on a tap to a photo inside, and its engraving takes eighteen characters. Nine months is a fair time to engrave something, as long as it is small: your initials and a date, or a word you both use. The rest of the box holds a ticket, a torn word and your typed letter.",
        line: { field: "engraving", where: "The engraving", text: "A + J, since March" },
      },
      {
        template: "music-box",
        heading: "A slow tune for a slower month",
        body: "Music Box takes three turns of a key; then the lid lifts, a figurine turns on velvet and the tune plays note by note while your photos rise in the mirror, one each turn, eight at most. As the spring runs down, a folded letter lifts out. Nine months deserves a letter that takes its time.",
        line: { field: "message", where: "The letter in the box", text: "Nine months ago I did not know how you take your tea. Now I make it without asking." },
      },
      {
        template: "paper-crane",
        heading: "The line left when the crane flies",
        brief: "Six folds, a line on each, and one closing line left when the crane flies.",
        body: "When the last fold of Paper Crane lands, the paper is a crane and it lifts off the table, leaving behind one closing line of up to ninety characters. Before that, up to six folds each show a line. Spend the folds on the months and keep the closing line for the plan for the year.",
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
      "Nine months is three quarters of a year. By now many couples have met most of each other’s friends, spent a holiday or a family occasion together, and settled who stays where on weekends. There is a photo from almost every month, which is the material this month’s gifts are built from.",
      "Too much at nine months: a gift that tries to be the anniversary three months early. Too little: forgetting a month you have marked every time so far. The right size is one photo for each month, in order, and a closing line that looks ahead to the year without spending it.",
    ],
    faq: [
      { q: "What is a good gift for nine months together?", a: "One built from nine photos, one for each month: stars in a constellation, a locket and a box of kept things, or a tune with photos in its mirror. Keep the big gesture for the year." },
      { q: "Can a nine-month gift include something engraved?", a: "Something small, yes. Initials and a date in a locket feel right at nine months; a full sentence about forever is better saved for later." },
      { q: "How do I make nine months feel different from six?", a: "Look forward. At six months the gift looks back over half a year; at nine, let the last line point to the year ahead and a plan to mark it." },
    ],
  },
  es: {
    title: "Regalos para 9 meses de novios: tres cuartos de año",
    description: "Nueve meses son tres cuartos de año, y nueve fotos, una por mes, llenan una constelación. Cinco regalos digitales para ese día, cada uno con una frase lista.",
    h1: "Regalos para 9 meses de novios",
    label: "9 meses",
    hero: {
      line: "Tres cuartos de año. Nueve fotos, una por cada mes.",
      sentence: "Nueve meses dan para tener una foto de cada uno y son pocos para que cada una conserve su historia, así que estos regalos giran en torno a nueve fotos.",
    },
    ideasTitle: "Cinco que caben en nueve meses",
    ideas: [
      {
        template: "constellations",
        heading: "Nueve estrellas, una por cada mes",
        brief: "Cada foto se vuelve una estrella, nueve por nueve meses, unidas en una sola figura.",
        body: "Constelaciones convierte cada foto en una estrella, tres como mínimo y doce como mucho, y las une en una sola figura: un corazón, un infinito o una estrella. Nueve meses dan nueve estrellas, y la figura queda bien llena. Cuando se completa, aparece encima tu última frase, de hasta 120 caracteres.",
        line: { field: "finalLine", where: "La frase al completarse", text: "Nueve meses, y volvería a elegir el mismo cielo." },
      },
      {
        template: "keepsake",
        heading: "Un relicario con tres cuartos grabados",
        brief: "Un relicario de oro que se abre con un toque, con dieciocho caracteres grabados.",
        body: "El relicario de oro de Recuerdo se abre con un toque y deja ver una foto, y su grabado admite dieciocho caracteres. Nueve meses son buen momento para grabar algo, siempre que sea pequeño: vuestras iniciales y una fecha, o una palabra que usáis los dos. El resto de la caja guarda un billete, una palabra arrancada y tu carta a máquina.",
        line: { field: "engraving", where: "El grabado", text: "A + J, desde marzo" },
      },
      {
        template: "music-box",
        heading: "Una melodía lenta para un mes más lento",
        body: "Caja de música pide tres vueltas de llave; luego se levanta la tapa, una figura gira sobre el terciopelo y la melodía suena nota a nota mientras tus fotos suben al espejo, una por vuelta, ocho como mucho. Cuando se acaba la cuerda, sale una carta doblada. Nueve meses merecen una carta que se tome su tiempo.",
        line: { field: "message", where: "La carta de la caja", text: "Hace nueve meses no sabía cómo tomas el té. Ahora te lo hago sin preguntar." },
      },
      {
        template: "paper-crane",
        heading: "La frase que queda cuando la grulla vuela",
        brief: "Seis pliegues con una frase cada uno y una frase final que se queda al volar.",
        body: "Cuando cae el último pliegue de Grulla de papel, el papel ya es una grulla y se levanta de la mesa, dejando atrás una frase final de hasta noventa caracteres. Antes, hasta seis pliegues muestran una frase cada uno. Gasta los pliegues en los meses y guarda la frase final para el plan del año.",
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
      "Nueve meses son tres cuartos de año. A estas alturas muchas parejas conocen a casi todos los amigos de la otra persona, han pasado unas vacaciones o una fecha familiar juntos y han decidido quién duerme dónde los fines de semana. Hay una foto de casi cada mes, y de eso están hechos los regalos de este mes.",
      "Demasiado a los nueve meses: un regalo que intenta ser el aniversario con tres meses de adelanto. Demasiado poco: olvidar un mes que has celebrado todas las veces. La medida justa es una foto por mes, en orden, y una frase final que mire al año sin gastarlo.",
    ],
    faq: [
      { q: "¿Qué regalo se hace por nueve meses juntos?", a: "Uno hecho con nueve fotos, una por mes: estrellas en una constelación, un relicario en una caja de recuerdos o una melodía con fotos en su espejo. El gran gesto, para el año." },
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
    title: "10 Month Anniversary Gifts in Double Figures",
    description: "Ten months is the first count in double figures. Five digital gifts built on tens, ten reasons, ten findings, ten photos, each with a line to borrow.",
    h1: "10 month anniversary gifts",
    label: "10 months",
    hero: {
      line: "Double figures. The count finally needs two digits.",
      sentence: "Ten is a satisfying number to make a gift around: ten photos, ten findings, ten reasons, each one a month you can point to.",
    },
    ideasTitle: "Five that count to ten",
    ideas: [
      {
        template: "scrapbook",
        heading: "Ten photos and a torn note in your hand",
        body: "Scrapbook can take twelve photos, and ten is a round fill: one for each month, landing as polaroids that develop between washi tape and flowers. The torn note in handwriting holds ninety characters. Write it as the caption to all ten months together, the line you would scribble in the margin.",
        line: { field: "quote", where: "The torn note", text: "Ten months of you leaving the cupboard doors open. I counted. I don’t mind." },
      },
      {
        template: "xoxo",
        heading: "What you call them, in newspaper letters",
        brief: "Their nickname cut from newspaper letters over polaroids on lace, and a typed letter below.",
        body: "XOXO cuts what you call them out of a newspaper, letter by letter, sixteen characters at most, above polaroids on a lace doily. Ten months in, the nickname has probably changed twice: use the current one. Your letter is typed at the bottom, signed with a kiss, and some of its lines come underlined.",
        line: { field: "headline", where: "What you call them", text: "my menace" },
      },
      {
        template: "the-council",
        heading: "Ten months of evidence, read out by cats",
        brief: "Cats read out your findings, six at most, before the gavel and the stamp.",
        body: "The cats of The Council read out the findings you wrote, up to six of ninety characters each, before the gavel falls and a stamp lands. Ten months is a good docket: pick the six strongest pieces of evidence that they are, in fact, wonderful, and choose “approved” for the ruling.",
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
        body: "In Vinyl the artist’s name is yours to write, forty characters, under the album title on a sleeve that sits on the deck. Ten months is when you can credit the two of you as a band. The record spins with your song, and the crate beside it holds up to twelve photos as covers.",
        line: { field: "artist", where: "The artist’s name", text: "The Two of Us (Live, Month Ten)" },
      },
    ],
    date: { kind: "fun", title: "Mini golf, ten holes, loser buys dessert", line: "Keep the scorecard and put it in the next gift." },
    stage: [
      "Ten months is the first count with two digits, and a lot of couples feel it: the relationship has outlasted a season or three, the friends have stopped asking how it is going, and the shared calendar has entries months ahead. There is enough of everything now to count it in tens.",
      "Too much at ten months: anything that tries to replace the anniversary. Too little: skipping it when the year is only two months off and you have marked the rest. Play with the number instead, ten photos, ten reasons, ten pieces of evidence, and keep the solemn things for twelve.",
    ],
    faq: [
      { q: "What do you do for ten months together?", a: "Play with the number: a jar of ten reasons, ten photos in a scrapbook, ten months of evidence at a hearing. Pair it with a fun date and keep it light." },
      { q: "Is ten months too close to the anniversary to celebrate?", a: "Not if it is small. Two months out from the year, a playful gift marks ten without stealing anything from the anniversary itself." },
      { q: "What should I write for ten months?", a: "Something countable. Ten small true things, one per month, are easier to write than one big paragraph and more convincing to read." },
    ],
  },
  es: {
    title: "Regalos para 10 meses de novios, ya con dos cifras",
    description: "Diez meses es la primera cuenta con dos cifras. Cinco regalos digitales hechos de dieces, diez razones, diez fotos, diez pruebas, con frases listas.",
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
        body: "Álbum de recortes admite doce fotos, y diez lo llenan bien: una por mes, cayendo como polaroids que se revelan entre cinta washi y flores. La nota rasgada escrita a mano admite noventa caracteres. Escríbela como el pie de foto de los diez meses juntos, la frase que garabatearías en el margen.",
        line: { field: "quote", where: "La nota rasgada", text: "Diez meses dejándote las puertas del armario abiertas. Las he contado. Me da igual." },
      },
      {
        template: "xoxo",
        heading: "Cómo le llamas, en letras de periódico",
        brief: "Su mote recortado en letras de periódico sobre polaroids con encaje, y una carta a máquina.",
        body: "XOXO recorta cómo le llamas de un periódico, letra a letra, dieciséis caracteres como mucho, sobre polaroids en un tapete de encaje. A los diez meses el mote seguramente ha cambiado dos veces: usa el de ahora. Tu carta va a máquina abajo, firmada con un beso, y algunas frases salen subrayadas.",
        line: { field: "headline", where: "Cómo le llamas", text: "mi amenaza" },
      },
      {
        template: "the-council",
        heading: "Diez meses de pruebas, leídas por gatos",
        brief: "Los gatos leen tus conclusiones, seis como mucho, antes del mazo y el sello.",
        body: "Los gatos de El Consejo leen las conclusiones que escribiste, hasta seis de noventa caracteres, antes de que caiga el mazo y llegue el sello. Diez meses dan para un buen sumario: elige las seis pruebas más sólidas de que esa persona es, de hecho, maravillosa, y elige «Visto bueno» para el veredicto.",
        line: { field: "findings", where: "Una de las conclusiones", text: "Prueba C: se acordó del cumpleaños de mi hermana antes que yo." },
      },
      {
        template: "jar-of-reasons",
        heading: "Un frasco etiquetado con diez razones",
        body: "Diez razones, una por mes, es un frasco que parece lleno sin relleno. Frasco de razones suelta una nota doblada cada vez que agitan el móvil o tocan el cristal. La etiqueta del frasco admite cuarenta caracteres: escribe la cuenta en ella, para que sepan cuándo llega la última.",
        line: { field: "label", where: "La etiqueta del frasco", text: "10 razones, una por mes" },
      },
      {
        template: "vinyl",
        heading: "Un disco con vuestros nombres como artista",
        brief: "Vuestros nombres como artista en un disco que gira con vuestra canción.",
        body: "En Vinilo el nombre del artista lo escribes tú, cuarenta caracteres, bajo el título del álbum en una funda que está junto al plato. A los diez meses ya podéis firmar como grupo. El disco gira con vuestra canción, y la caja de al lado guarda hasta doce fotos como portadas.",
        line: { field: "artist", where: "El nombre del artista", text: "Los Dos (en directo, mes diez)" },
      },
    ],
    date: { kind: "fun", title: "Minigolf a diez hoyos, quien pierda paga el postre", line: "Guardad la tarjeta de puntos y metedla en el próximo regalo." },
    stage: [
      "Diez meses es la primera cuenta con dos cifras, y muchas parejas lo notan: la relación ha durado más de una estación o tres, los amigos ya no preguntan qué tal va y el calendario compartido tiene planes a meses vista. Ya hay bastante de todo como para contarlo de diez en diez.",
      "Demasiado a los diez meses: cualquier cosa que intente sustituir al aniversario. Demasiado poco: saltárselo cuando faltan dos meses para el año y has celebrado los demás. Juega con el número, diez fotos, diez razones, diez pruebas, y guarda lo solemne para los doce.",
    ],
    faq: [
      { q: "¿Qué se hace por diez meses juntos?", a: "Jugar con el número: un frasco de diez razones, diez fotos en un álbum, diez meses de pruebas en un juicio. Acompáñalo de una cita divertida y que sea ligero." },
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
    description: "Eleven months is the month before the year. Five digital gifts that count down to it without spending it, each with a line to borrow.",
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
        body: "Midnight Countdown puts a live clock on their screen under a sky that darkens as zero gets closer, and at zero the fireworks go off and the photos open. Set it to the start of your anniversary day, a month from now. The line above the clock says what it is counting to, in sixty characters.",
        line: { field: "headline", where: "Above the timer", text: "Until one whole year of us" },
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
        body: "Bouquet holds up to 24 stems of your choosing, arranged until it looks right, then opened on their screen one flower at a time. The card has thirty characters. At eleven months, use it as a promise for a month from now: these are the flowers before the real anniversary ones.",
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
      "Eleven months is the month before the year, and many couples feel the anniversary coming: there may already be a restaurant in mind, a trip half planned, a question about how to mark it. The relationship has a full set of seasons almost behind it, and most of its stories have now been told twice.",
      "Too much at eleven months: giving the anniversary gift early because you could not wait. Too little: nothing, then a big gesture a month later. The right gift points forward, a countdown to the day or a plan in writing, and a gift made now can be sent now and open on the day itself.",
    ],
    faq: [
      { q: "What do you give at eleven months?", a: "Something that looks forward to the year rather than replacing it: a countdown to the date, a chat that ends on the plan, a practice bouquet. Keep the real anniversary gift for next month." },
      { q: "Can I send a gift now and have it open on our anniversary?", a: "Yes, on a paid gift. In the editor, under Extras, switch on “Schedule the reveal” and choose the date, the hour and their time zone. Until then the link shows a countdown and then opens by itself." },
      { q: "How do I plan the first anniversary at eleven months?", a: "Start now: pick the evening, book the table or the trip, and put it in writing. A countdown sent at eleven months makes the plan official without giving it away." },
    ],
  },
  es: {
    title: "Regalos para 11 meses de novios con cuenta atrás",
    description: "Once meses es el mes antes del año. Cinco regalos digitales que cuentan hacia él sin gastarlo, cada uno con una frase lista para usar.",
    h1: "Regalos para 11 meses de novios",
    label: "11 meses",
    hero: {
      line: "Un mes para el año. Cuenta hacia él, no lo gastes.",
      sentence: "El mejor regalo a los once meses apunta al aniversario: un reloj que corre hacia el día, un plan por escrito y nada que sea del año en sí.",
    },
    ideasTitle: "Cinco que apuntan al año",
    ideas: [
      {
        template: "midnight-countdown",
        heading: "Un reloj hacia vuestro primer aniversario",
        brief: "Un reloj en marcha bajo un cielo que oscurece, puesto al inicio del aniversario.",
        body: "Cuenta atrás de medianoche pone un reloj en marcha en su pantalla bajo un cielo que se oscurece a medida que se acerca el cero, y en el cero estallan los fuegos y se abren las fotos. Ponlo al comienzo del día del aniversario, dentro de un mes. La frase sobre el reloj dice hacia qué cuenta, en sesenta caracteres.",
        line: { field: "headline", where: "Sobre el reloj", text: "Hasta un año entero de nosotros" },
      },
      {
        template: "favorite-person",
        heading: "Una despedida bajo las flores, a tu manera",
        brief: "Polaroids con cinta de cuadros y tu despedida de siempre escrita bajo las flores.",
        body: "Al pie del ramo de Mi persona favorita va una despedida de dieciocho caracteres, bajo una página de polaroids sujetas con cinta de cuadros y una nota rasgada que dice quién es esa persona. A los once meses, la despedida puede ser la que de verdad usas al acabar cada llamada.",
        line: { field: "signoff", where: "Bajo las flores", text: "venga, te quiero" },
      },
      {
        template: "sticker-bomb",
        heading: "Once meses de motes, en tiras de rotuladora",
        brief: "Seis tiras de rotuladora bajo los stickers, con sus motes en orden, del más antiguo al último.",
        body: "Las tiras de rotuladora de Bomba de Stickers salen en el orden en que las escribiste, seis como mucho, de veintiocho caracteres, metidas bajo uno de cada dos stickers que pegan. Once meses dan para una historia de motes: ponlos en orden, del más antiguo al más nuevo, para que la última tira sea como le llamas ahora.",
        line: { field: "labels", where: "Una tira de rotuladora", text: "alias número tres" },
      },
      {
        template: "bouquet",
        heading: "Flores que prometen las siguientes",
        brief: "Hasta 24 tallos elegidos por ti y una tarjeta que promete las flores del mes que viene.",
        body: "Ramo admite hasta 24 tallos elegidos por ti, colocados hasta que queden bien, que luego se abren en su pantalla flor a flor. La tarjeta tiene treinta caracteres. A los once meses, úsala como promesa para dentro de un mes: estas son las flores de antes de las del aniversario de verdad.",
        line: { field: "cardNote", where: "La tarjeta del ramo", text: "Ensayo. El mes que viene, más" },
      },
      {
        template: "text-thread",
        heading: "Un chat que acaba en el plan del día",
        brief: "Vuestros mensajes repetidos con sus puntitos, que acaban en el plan del aniversario.",
        body: "Reconstruye en Hilo de mensajes el chat en que hablasteis por primera vez del aniversario, o inventa el que tendréis: hasta cuarenta burbujas, puntitos entre ellas y fotos que caen como adjuntos. Que acabe en el plan. Enviado a los once meses, se lee como un adelanto del año.",
        line: { field: "lines", where: "La última burbuja", text: "entonces. dentro de un mes. no hagas planes esa noche" },
      },
    ],
    date: { kind: "cheap", title: "Estrellas, planetas y un año por planear", line: "Tumbaos en una manta y planead el aniversario en voz alta." },
    stage: [
      "Once meses es el mes antes del año, y muchas parejas notan que llega el aniversario: quizá ya hay un restaurante en mente, un viaje a medio planear, una duda sobre cómo celebrarlo. La relación tiene casi detrás todas las estaciones, y la mayoría de sus historias ya se han contado dos veces.",
      "Demasiado a los once meses: dar el regalo del aniversario antes de tiempo porque no podías esperar. Demasiado poco: nada, y luego un gran gesto un mes después. El regalo bueno mira hacia delante, una cuenta atrás hasta el día o un plan por escrito, y lo que hagas ahora puede enviarse ya y abrirse ese mismo día.",
    ],
    faq: [
      { q: "¿Qué se regala a los once meses?", a: "Algo que mire hacia el año en vez de sustituirlo: una cuenta atrás hasta la fecha, un chat que acaba en el plan, un ramo de ensayo. El regalo del aniversario de verdad, para el mes que viene." },
      { q: "¿Puedo enviar un regalo ahora y que se abra en nuestro aniversario?", a: "Sí, en un regalo de pago. En el editor, en Extras, activa «Programar la apertura» y elige la fecha, la hora y su zona horaria. Hasta entonces el enlace muestra una cuenta atrás y luego se abre solo." },
      { q: "¿Cómo planeo el primer aniversario a los once meses?", a: "Empieza ya: elige la noche, reserva la mesa o el viaje y ponlo por escrito. Una cuenta atrás enviada a los once meses hace oficial el plan sin desvelarlo." },
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
