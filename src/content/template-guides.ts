import { keepShare } from "@/lib/editor/keep-split";
import { noteForEveryone } from "@/lib/gift/free-tier";
import type { GiftLocale } from "@/lib/gift/schema";

/**
 * More for the template pages that searches have started to find (Search Console, 9 Nov 2026): the
 * "digital scratch card" searches came to about 150 impressions in four weeks at positions 20 to
 * 65, "digital bouquet" 40 at about 11, "digital fortune cookie" 30 at about 7. Their titles
 * already say the phrase; what the pages lacked was what people make with the template, and
 * answers to the questions people typed ("share scratch card whatsapp", "digital bouquet with
 * letter"). Every limit and behaviour is the template's own: its schema.ts, field-meta.ts and
 * Template.tsx.
 *
 * - `ideas`: a row of cards under the page's three steps.
 * - `faq`: added to the page's questions, and to its FAQPage markup.
 *
 * Since 20 Nov 2026 the best sellers, the Christmas gifts and the ones Valentine's will need have
 * a guide too.
 *
 * Since 21 Nov 2026 an idea is a card, not a paragraph (the owner, on the first screenshots: "it's
 * SOOO MUCH TEXT… no one's reading all that"): a title of at most six words, one line of at most
 * sixteen on what to do, and one line to borrow, which the page draws in its handwriting face
 * under the name the editor gives the field it goes in (components/templates/page/sections.tsx).
 * tests/unit/text-budget.test.ts holds the lengths; tests/unit/template-guides.test.ts reads each
 * field's limit from the template's own schema, so a line that would not fit where the card says
 * to put it fails the build.
 *
 * Since the second review of 21 Nov 2026 no instruction is on two gifts: a card about the P.S.
 * says what to keep for it in that moment (every gift's surprise is the same hidden line, on a
 * card headed P.S., revealed by a tap, a press or a shake as the sender chooses), a card about a
 * limit says what to write there before it gives the number, and a choice is named as the editor
 * names it. docs/marketing/growth-build/reports/guides-claims.md lists, for every card, the lines
 * of the template that make it true (tests/unit/guides-claims.test.ts checks them on every run and writes the file when asked).
 *
 * Since the owner read The Letter's page (21 Nov 2026: "change the ways when to send the gifts, as
 * its kinda weird for letter, they should be good for each gift") every gift has six cards, and a
 * card is a moment someone would really send this gift for, in plain words, the commonest first:
 * a birthday, an anniversary, a week apart. One may be playful. None is a riddle ("Ten years,
 * pressed in wax" was one). A gift whose page searches have not asked questions of has `faq: []`
 * and shows the questions every gift's page has.
 */

/**
 * Where a borrowed line goes: a field every gift has, or one of the template's own ("fields.sign").
 * "note" is the free Letter's whole text, which the free version keeps short (lib/gift/free-tier.ts).
 */
export type BorrowField = "title" | "message" | "note" | "caption" | "countdown.label" | "surprise.text" | "recipientName" | "senderName" | `fields.${string}`;

export type TemplateGuideIdea = {
  /** The card's title: at most six words. */
  heading: string;
  /** What to do, in one line of at most sixteen words. */
  how: string;
  /** The line the card lends, and the field it would be typed into. */
  borrow: { field: BorrowField; line: string };
};

export type TemplateGuideFaq = {
  q: string;
  a: string;
  /** True only while the free version is the short note: asked and answered while it is, left out when it isn't. */
  whileFreeNote?: true;
  /**
   * For an answer that names “a note with photos”, which is sold under a switch of its own
   * (lib/editor/keep-split.ts). `true`: the answer while every visitor is offered it. `false`: the
   * answer to the same question while some or none are. The page shows the one that is true.
   */
  notePhotos?: boolean;
};

export type TemplateGuideContent = {
  ideas: { title: string; items: TemplateGuideIdea[] };
  faq: TemplateGuideFaq[];
};

export const TEMPLATE_GUIDES: Record<string, Record<GiftLocale, TemplateGuideContent>> = {
  "scratch-card": {
    en: {
      ideas: {
        title: "What to hide in a digital scratch card",
        items: [
          {
            heading: "A proposal",
            how: "Photos of the two of you in order, the question on the last card.",
            borrow: { field: "fields.finalTitle", line: "Will you marry me?" },
          },
          {
            heading: "A pregnancy announcement",
            how: "One link for everyone. The last card says it.",
            borrow: { field: "fields.finalTitle", line: "See you in June, Grandma." },
          },
          {
            heading: "Asking your bridesmaids",
            how: "One card for each friend, with your photos.",
            borrow: { field: "fields.finalTitle", line: "Will you be my bridesmaid?" },
          },
          {
            heading: "A surprise trip",
            how: "One clue per card. The last one names the place.",
            borrow: { field: "fields.finalTitle", line: "Lisbon. Friday. Pack tonight." },
          },
          {
            heading: "A birthday present",
            how: "Put the real present on the last card.",
            borrow: { field: "fields.finalTitle", line: "Two tickets, row F, the 14th." },
          },
          {
            heading: "Good news",
            how: "Tell them where to start on the foil itself, in 30 characters.",
            borrow: { field: "fields.foilText", line: "scratch me first" },
          },
        ],
      },
      faq: [
        {
          q: "Can I send a digital scratch card on WhatsApp?",
          a: "Yes. It’s a link, so it goes anywhere a link does: WhatsApp, iMessage, Instagram, email. They tap it and scratch in their phone’s browser, with nothing to install. You can also print its QR code and tuck it into a real card.",
        },
        {
          q: "How many cards can a digital scratch card have?",
          a: "Up to twelve photo cards, each with a caption under the photo, then the last card with your big line and your message. Three to five is plenty for a reveal; past eight, the build-up starts to feel like homework.",
        },
        {
          q: "Will the cover give the surprise away?",
          a: "No. The cover shows their name on a ticket and says the big one is on the last card. Your last line only appears once they’ve scratched their way to it.",
        },
        {
          q: "Can they scratch it on a laptop?",
          a: "Yes, by clicking and dragging over the foil. A card clears once most of the foil is off, with a burst of confetti. It’s best on a phone, with a finger.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué esconder en un rasca y gana digital",
        items: [
          {
            heading: "Una pedida",
            how: "Fotos vuestras en orden y la pregunta en la última tarjeta.",
            borrow: { field: "fields.finalTitle", line: "¿Te casas conmigo?" },
          },
          {
            heading: "Un anuncio de embarazo",
            how: "Un enlace para todo el mundo. La última tarjeta lo dice.",
            borrow: { field: "fields.finalTitle", line: "Nos vemos en junio, abuela" },
          },
          {
            heading: "Para tus damas de honor",
            how: "Una tarjeta para cada amiga, con vuestras fotos.",
            borrow: { field: "fields.finalTitle", line: "¿Quieres ser mi dama de honor?" },
          },
          {
            heading: "Un viaje sorpresa",
            how: "Una pista por tarjeta. La última dice el destino.",
            borrow: { field: "fields.finalTitle", line: "Lisboa. Viernes. Haz la maleta" },
          },
          {
            heading: "Un regalo de cumpleaños",
            how: "Pon el regalo de verdad en la última tarjeta.",
            borrow: { field: "fields.finalTitle", line: "Dos entradas, fila F, el día 14" },
          },
          {
            heading: "Una buena noticia",
            how: "Diles por dónde empezar en el propio metalizado, en 30 caracteres.",
            borrow: { field: "fields.foilText", line: "ráscame primero" },
          },
        ],
      },
      faq: [
        {
          q: "¿Se puede enviar un rasca y gana digital por WhatsApp?",
          a: "Sí. Es un enlace, así que va por donde vaya un enlace: WhatsApp, iMessage, Instagram, email. Se abre y se rasca en el navegador del móvil, sin instalar nada. También puedes imprimir su código QR y meterlo en una tarjeta de papel.",
        },
        {
          q: "¿Cuántas tarjetas puede tener un rasca y gana digital?",
          a: "Hasta doce tarjetas con foto, cada una con su pie, y después la última con tu frase grande y tu mensaje. Con tres a cinco basta para una sorpresa; a partir de ocho, la espera empieza a parecer deberes.",
        },
        {
          q: "¿La portada desvela la sorpresa?",
          a: "No. La portada enseña su nombre en un boleto y dice que lo más grande está en la última. Tu última frase solo aparece cuando ha rascado hasta llegar a ella.",
        },
        {
          q: "¿Se puede rascar en el ordenador?",
          a: "Sí, haciendo clic y arrastrando sobre el metalizado. Cada tarjeta se destapa sola cuando queda poco metalizado, con un estallido de confeti. Donde mejor queda es en el móvil, con el dedo.",
        },
      ],
    },
  },

  bouquet: {
    en: {
      ideas: {
        title: "What to put in a digital bouquet",
        items: [
          {
            heading: "Mother’s Day",
            how: "Her flowers in her colours. The little card holds 30 characters.",
            borrow: { field: "fields.cardNote", line: "Still calling you first." },
          },
          {
            heading: "Valentine’s Day",
            how: "Skip the red roses if they’d pick something else.",
            borrow: { field: "fields.cardNote", line: "Your favourites. I asked." },
          },
          {
            heading: "A birthday",
            how: "Up to 24 stems. Your full letter opens from the card.",
            borrow: { field: "fields.cardNote", line: "Happy birthday, from all of us" },
          },
          {
            heading: "An anniversary",
            how: "Rebuild the bouquet from your wedding photos.",
            borrow: { field: "fields.cardNote", line: "Same flowers. Same answer." },
          },
          {
            heading: "Saying sorry",
            how: "Whites and blush, no red. The apology itself goes in the letter.",
            borrow: { field: "fields.cardNote", line: "I was wrong. Sorry." },
          },
          {
            heading: "Get well soon",
            how: "Sunflowers in kraft paper, for a friend having a bad week.",
            borrow: { field: "fields.cardNote", line: "Look at these, not the news." },
          },
        ],
      },
      faq: [
        {
          q: "Can I add a letter to a digital bouquet?",
          a: "Yes. The little card tucked into the bouquet holds 30 characters, and your full letter opens from it, followed by any photos you add, up to six.",
        },
        {
          q: "How many flowers can a digital bouquet have?",
          a: "Up to 24 stems, from 14 kinds of flower, each in its own colours. Pick the paper, the ribbon and the background, then shuffle the arrangement until it looks right.",
        },
        {
          q: "Do virtual flowers wilt?",
          a: "No, and nobody has to find a vase. It looks the same next spring, and they can open it as often as they like.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué poner en un ramo de flores virtual",
        items: [
          {
            heading: "El Día de la Madre",
            how: "Sus flores, en sus colores. La tarjeta admite 30 caracteres.",
            borrow: { field: "fields.cardNote", line: "Siempre te llamo primero" },
          },
          {
            heading: "San Valentín",
            how: "Deja las rosas rojas si elegiría otra flor.",
            borrow: { field: "fields.cardNote", line: "Tus favoritas. Pregunté." },
          },
          {
            heading: "Un cumpleaños",
            how: "Hasta 24 flores. Tu carta entera se abre desde la tarjeta.",
            borrow: { field: "fields.cardNote", line: "Feliz cumpleaños de todos" },
          },
          {
            heading: "Un aniversario",
            how: "Rehaz el ramo a partir de las fotos de vuestra boda.",
            borrow: { field: "fields.cardNote", line: "Mismas flores, mismo sí." },
          },
          {
            heading: "Para pedir perdón",
            how: "Blancos y rosa palo, nada de rojo. La disculpa va en la carta.",
            borrow: { field: "fields.cardNote", line: "Me equivoqué. Perdón." },
          },
          {
            heading: "Para una mala semana",
            how: "Girasoles en papel kraft para quien pasa una mala semana.",
            borrow: { field: "fields.cardNote", line: "Mira esto, no las noticias" },
          },
        ],
      },
      faq: [
        {
          q: "¿Se puede añadir una carta a un ramo virtual?",
          a: "Sí. La tarjetita del ramo admite 30 caracteres y tu carta entera se abre desde ella, seguida de las fotos que añadas, hasta seis.",
        },
        {
          q: "¿Cuántas flores puede tener un ramo virtual?",
          a: "Hasta 24 tallos, de 14 tipos de flor, cada uno en sus colores. Eliges el papel, el lazo y el fondo, y barajas el ramo hasta que quede bien.",
        },
        {
          q: "¿Las flores virtuales se marchitan?",
          a: "No, y nadie tiene que buscar un jarrón. El ramo luce igual la próxima primavera y se puede abrir tantas veces como se quiera.",
        },
      ],
    },
  },

  "fortune-cookie": {
    en: {
      ideas: {
        title: "What to write in a digital fortune cookie",
        items: [
          {
            heading: "Their birthday",
            how: "One fortune per cookie, up to twenty. Make them oddly specific.",
            borrow: { field: "fields.fortunes", line: "You will be sung to, badly, by people who love you." },
          },
          {
            heading: "Before an exam or interview",
            how: "Write the outcomes you’re sure of. The last cookie holds your message.",
            borrow: { field: "fields.fortunes", line: "You already know more than you think." },
          },
          {
            heading: "An anniversary",
            how: "Make the lucky numbers your dates.",
            borrow: { field: "fields.luckyNumbers", line: "14 · 06 · 21" },
          },
          {
            heading: "A graduation",
            how: "Fortunes about what comes next, silly first and true last.",
            borrow: { field: "fields.fortunes", line: "A desk with your name on it is close." },
          },
          {
            heading: "Good news to share",
            how: "Hide the news in the last fortune they open.",
            borrow: { field: "fields.fortunes", line: "A very small person will arrive in June." },
          },
          {
            heading: "Just because",
            how: "In-jokes work best. Some slips can carry a photo.",
            borrow: { field: "fields.fortunes", line: "You will be tackled by a small dog before noon." },
          },
        ],
      },
      faq: [
        {
          q: "How many fortunes can I write?",
          a: "Between 3 and 20, up to 140 characters each. They come out one cookie at a time, in your order, and the last cookie opens into your message.",
        },
        {
          q: "Can I put photos in a digital fortune cookie?",
          a: "Yes, up to ten, one per slip from the first, in order. A photo needs a fortune to sit on, so write at least as many fortunes as photos.",
        },
        {
          q: "What should I write in a fortune cookie for my partner?",
          a: "Something only they’d get, phrased like a fortune: “You will text me ‘on my way’ from the shower again.” Mix a few funny ones with one that isn’t a joke, and save the real thing for the letter.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué escribir en una galleta de la fortuna digital",
        items: [
          {
            heading: "Su cumpleaños",
            how: "Una fortuna por galleta, hasta veinte. Que sean muy concretas.",
            borrow: { field: "fields.fortunes", line: "Te cantarán, y mal, personas que te quieren." },
          },
          {
            heading: "Antes de un examen",
            how: "Escribe lo que das por hecho. La última galleta guarda tu mensaje.",
            borrow: { field: "fields.fortunes", line: "Ya sabes más de lo que crees." },
          },
          {
            heading: "Un aniversario",
            how: "Que los números de la suerte sean vuestras fechas.",
            borrow: { field: "fields.luckyNumbers", line: "14 · 06 · 21" },
          },
          {
            heading: "Una graduación",
            how: "Fortunas sobre lo que viene: primero las tontas, al final la de verdad.",
            borrow: { field: "fields.fortunes", line: "Hay una mesa con tu nombre, y está cerca." },
          },
          {
            heading: "Una buena noticia",
            how: "Esconde la noticia en la última fortuna que abran.",
            borrow: { field: "fields.fortunes", line: "Alguien muy pequeño llegará en junio." },
          },
          {
            heading: "Porque sí",
            how: "Las bromas vuestras son lo mejor. Algunas tiras pueden llevar foto.",
            borrow: { field: "fields.fortunes", line: "Un perro pequeño te placará antes de mediodía." },
          },
        ],
      },
      faq: [
        {
          q: "¿Cuántas fortunas puedo escribir?",
          a: "Entre 3 y 20, de hasta 140 caracteres cada una. Salen de galleta en galleta, en tu orden, y la última galleta se abre con tu mensaje.",
        },
        {
          q: "¿Se pueden poner fotos en una galleta de la fortuna digital?",
          a: "Sí, hasta diez, una por papelito desde el primero y en orden. Cada foto necesita una fortuna donde ir, así que escribe al menos tantas fortunas como fotos.",
        },
        {
          q: "¿Qué escribo en una galleta de la fortuna para mi pareja?",
          a: "Algo que solo entienda esa persona, dicho como una fortuna: «Volverás a escribirme ‘de camino’ desde la ducha». Mezcla unas cuantas graciosas con una que no sea broma, y deja lo de verdad para la carta.",
        },
      ],
    },
  },

  "the-letter": {
    en: {
      ideas: {
        title: "What to write in a digital love letter",
        items: [
          {
            heading: "An anniversary letter",
            how: "Begin where the two of you began. One memory, then what it meant.",
            borrow: { field: "fields.greeting", line: "To the stranger who took my umbrella," },
          },
          {
            heading: "A birthday letter",
            how: "The title is the line on the cover, before the seal breaks.",
            borrow: { field: "title", line: "Open this before the cake" },
          },
          {
            heading: "A long-distance letter",
            how: "Set the countdown to the minute you land and write its label.",
            borrow: { field: "countdown.label", line: "Until I’m the one ringing your doorbell" },
          },
          {
            heading: "A letter to say sorry",
            how: "Five sentences: what you did, what it cost them, what changes.",
            borrow: { field: "note", line: "I was late, I joked about it, and you spent your birthday dinner watching the door." },
          },
          {
            heading: "A thank-you letter",
            how: "Name the one thing they did. The sign-off sits above your name.",
            borrow: { field: "fields.signOff", line: "Still grateful, every day," },
          },
          {
            heading: "A letter for no reason",
            how: "The P.S. arrives as a postcard with a present to tap. One line is enough.",
            borrow: { field: "surprise.text", line: "P.S. Your favourite is in the fridge." },
          },
        ],
      },
      faq: [
        {
          q: "Can I add photos to a free love letter?",
          a: "Not to the free note itself, which is your words, a song, a countdown and a hidden P.S. “A note with your photos” adds up to five photos to it and keeps it a note. “Make it special” lifts both limits, to 20 photos and a letter of 4,000 characters, and adds a video and a voice message.",
          whileFreeNote: true,
          notePhotos: true,
        },
        {
          q: "Can I add photos to a free love letter?",
          a: "Not to the free note itself, which is your words, a song, a countdown and a hidden P.S. Photos come with “Make it special”: up to 20 of them, a letter of 4,000 characters, a video and a voice message.",
          whileFreeNote: true,
          notePhotos: false,
        },
        {
          q: "How long is 500 characters?",
          a: "About 85 words, or five or six sentences: enough for one memory and what it meant. Spaces count, and the editor keeps count as you type. The greeting and the sign-off have fields of their own and don’t use any of it up.",
          whileFreeNote: true,
        },
        {
          q: "What date does the letter show?",
          a: "The day they open it. The date at the top is written when the seal breaks, so a letter sent on Friday and read on Sunday is dated Sunday. Write “this morning” only if you mean theirs.",
        },
        {
          q: "Does a digital love letter need their sound on?",
          a: "No. A song from the library plays under the letter from the moment the seal breaks, with a mute button in the corner, and the letter reads the same in silence. A real song waits at the end as a 30-second preview they tap to hear.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué escribir en una carta de amor digital",
        items: [
          {
            heading: "Una carta de aniversario",
            how: "Empieza por donde empezó lo vuestro. Un recuerdo y lo que significó.",
            borrow: { field: "fields.greeting", line: "A quien se llevó mi paraguas sin pedirlo:" },
          },
          {
            heading: "Una carta de cumpleaños",
            how: "El título es la frase de la portada, antes de romper el sello.",
            borrow: { field: "title", line: "Ábrela antes de la tarta" },
          },
          {
            heading: "Una carta a distancia",
            how: "Pon la cuenta atrás en el minuto en que aterrizas y escríbele el rótulo.",
            borrow: { field: "countdown.label", line: "Hasta que sea yo quien llame a tu timbre" },
          },
          {
            heading: "Una carta para pedir perdón",
            how: "Cinco frases: qué hiciste, qué le costó, qué cambia.",
            borrow: { field: "note", line: "Llegué tarde, encima hice una broma y te pasaste tu cena de cumpleaños mirando la puerta." },
          },
          {
            heading: "Una carta de agradecimiento",
            how: "Di eso concreto que hizo. La despedida va sobre tu nombre.",
            borrow: { field: "fields.signOff", line: "Con las gracias de cada día," },
          },
          {
            heading: "Una carta porque sí",
            how: "La posdata llega en una postal con un regalo que se toca. Basta una línea.",
            borrow: { field: "surprise.text", line: "P. D.: Tu favorito está en la nevera." },
          },
        ],
      },
      faq: [
        {
          q: "¿Se pueden añadir fotos a una carta de amor gratis?",
          a: "A la nota gratis, no: esa lleva tus palabras, una canción, una cuenta atrás y una posdata escondida. «Una nota con tus fotos» le añade hasta cinco fotos y sigue siendo una nota. «Hazlo especial» levanta los dos límites, hasta 20 fotos y una carta de 4.000 caracteres, y suma un vídeo y un mensaje de voz.",
          whileFreeNote: true,
          notePhotos: true,
        },
        {
          q: "¿Se pueden añadir fotos a una carta de amor gratis?",
          a: "A la nota gratis, no: esa lleva tus palabras, una canción, una cuenta atrás y una posdata escondida. Las fotos vienen con «Hazlo especial»: hasta 20, una carta de 4.000 caracteres, un vídeo y un mensaje de voz.",
          whileFreeNote: true,
          notePhotos: false,
        },
        {
          q: "¿Cuánto son 500 caracteres?",
          a: "Unas 85 palabras, o cinco o seis frases: lo justo para un recuerdo y lo que significó. Los espacios cuentan y el editor lleva la cuenta mientras escribes. El saludo y la despedida tienen sus propios campos y no gastan ninguno.",
          whileFreeNote: true,
        },
        {
          q: "¿Qué fecha aparece en la carta?",
          a: "La del día en que la abren. La fecha de arriba se escribe cuando se rompe el sello, así que una carta enviada el viernes y leída el domingo lleva fecha de domingo. Escribe «esta mañana» solo si te refieres a la suya.",
        },
        {
          q: "¿Hace falta tener el sonido activado para una carta de amor digital?",
          a: "No. Una canción de la biblioteca suena bajo la carta desde que se rompe el sello, con un botón para silenciarla en la esquina, y la carta se lee igual en silencio. Una canción de verdad espera al final como un avance de 30 segundos que se escucha con un toque.",
        },
      ],
    },
  },

  "birthday-cinema": {
    en: {
      ideas: {
        title: "What to put in a virtual birthday card",
        items: [
          {
            heading: "A big birthday",
            how: "The marquee takes 40 characters. Bill it like a premiere.",
            borrow: { field: "fields.marquee", line: "NOW SHOWING: ANA TURNS 30" },
          },
          {
            heading: "A child’s birthday",
            how: "Set their age and the cake gets that many candles, up to twelve.",
            borrow: { field: "fields.marquee", line: "SEVEN CANDLES, ONE BIG WISH" },
          },
          {
            heading: "From the whole group",
            how: "Ask everyone for one photo. The film strip takes twenty.",
            borrow: { field: "caption", line: "Marta, 2019, the karaoke" },
          },
          {
            heading: "A birthday you’ll miss",
            how: "Set the countdown to the evening you arrive with a cake.",
            borrow: { field: "countdown.label", line: "Until I can sing it in person" },
          },
          {
            heading: "With a present to find",
            how: "The P.S. shows once your message has played. Send them to the hiding place.",
            borrow: { field: "surprise.text", line: "Check your coat pocket. Two tickets." },
          },
          {
            heading: "For your mum or dad",
            how: "Your message follows the film strip. Start with a memory of theirs.",
            borrow: { field: "message", line: "You taught me to blow them all out at once." },
          },
        ],
      },
      faq: [
        {
          q: "How do they blow out the candles?",
          a: "By blowing at the phone after tapping “Use microphone”, or by swiping up on the screen. A breath or a swipe takes a few candles at a time. If you’d rather they weren’t asked for the microphone at all, set the candles to swipe only.",
        },
        {
          q: "How many candles are on the cake?",
          a: "One for each year up to twelve. From thirteen on, the age stands on top as a cake topper, with six candles on the tier below. Leave the age empty and the cake gets five.",
        },
        {
          q: "What happens if they open it before their birthday?",
          a: "Without a schedule it opens whenever the link is tapped. With one, the link shows your name, the day and hour it opens and a countdown until then, so it is safe to send the night before.",
        },
        {
          q: "Can a virtual birthday card include a video?",
          a: "Yes, one clip. It plays above the film strip, before your letter, and the strip itself takes up to 20 photos.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué poner en una tarjeta de cumpleaños virtual",
        items: [
          {
            heading: "Un cumpleaños redondo",
            how: "La marquesina admite 40 caracteres. Anúncialo como un estreno.",
            borrow: { field: "fields.marquee", line: "HOY SE ESTRENA: ANA CUMPLE 30" },
          },
          {
            heading: "El cumple de un peque",
            how: "Pon su edad y la tarta lleva esas velas, hasta doce.",
            borrow: { field: "fields.marquee", line: "SIETE VELAS Y UN GRAN DESEO" },
          },
          {
            heading: "De parte de todo el grupo",
            how: "Pide una foto a cada persona. El carrete admite veinte.",
            borrow: { field: "caption", line: "Marta, 2019, el karaoke" },
          },
          {
            heading: "Un cumple que te pierdes",
            how: "Pon la cuenta atrás en la tarde en que llegas con una tarta.",
            borrow: { field: "countdown.label", line: "Hasta cantártelo en persona" },
          },
          {
            heading: "Con un regalo escondido",
            how: "La posdata sale cuando tu mensaje ha terminado. Mándale al escondite.",
            borrow: { field: "surprise.text", line: "Mira en el bolsillo del abrigo. Dos entradas." },
          },
          {
            heading: "Para tu madre o tu padre",
            how: "Tu mensaje llega tras el carrete. Empieza por un recuerdo suyo.",
            borrow: { field: "message", line: "Tú me enseñaste a apagarlas de una vez." },
          },
        ],
      },
      faq: [
        {
          q: "¿Cómo se soplan las velas?",
          a: "Soplando al móvil después de tocar «Usar el micrófono», o deslizando el dedo hacia arriba. Cada soplido o cada gesto apaga unas cuantas velas. Si prefieres que no se pida el micrófono, pon las velas en «solo deslizar».",
        },
        {
          q: "¿Cuántas velas lleva la tarta?",
          a: "Una por año hasta los doce. A partir de trece, la edad va arriba en un adorno y en el piso de abajo quedan seis velas. Si no indicas la edad, la tarta lleva cinco.",
        },
        {
          q: "¿Qué pasa si abren la tarjeta antes del cumpleaños?",
          a: "Sin programar, se abre en cuanto tocan el enlace. Programada, el enlace enseña tu nombre, el día y la hora de apertura y una cuenta atrás, así que puedes mandarlo la noche antes sin miedo.",
        },
        {
          q: "¿Se puede poner un vídeo en una tarjeta de cumpleaños virtual?",
          a: "Sí, uno. Se ve encima de la tira de película, antes de tu carta, y la tira admite hasta 20 fotos.",
        },
      ],
    },
  },

  constellations: {
    en: {
      ideas: {
        title: "What to put in a night sky gift",
        items: [
          {
            heading: "An anniversary",
            how: "Three to twelve photos, one star each. Caption the nights that mattered.",
            borrow: { field: "caption", line: "The night you missed the last train" },
          },
          {
            heading: "Long distance",
            how: "Count down to your landing, set in their time zone.",
            borrow: { field: "countdown.label", line: "Until we share a sky again" },
          },
          {
            heading: "Valentine’s Day",
            how: "The line appears when the constellation completes.",
            borrow: { field: "fields.finalLine", line: "Every star, a night with you." },
          },
          {
            heading: "A birthday",
            how: "One star for each year you’ve known them.",
            borrow: { field: "caption", line: "2019, the tent that leaked" },
          },
          {
            heading: "A question to ask",
            how: "Put the question in the line they see last.",
            borrow: { field: "fields.finalLine", line: "Will you move in with me?" },
          },
          {
            heading: "For a parent",
            how: "Heart, infinity or star: pick the shape, then the photos of home.",
            borrow: { field: "caption", line: "The porch light you left on" },
          },
        ],
      },
      faq: [
        {
          q: "Is there a free version of Constellations?",
          a: "No. A sky is made of at least three photos, and photos are part of “Make it special”, paid once. You can still build the whole sky and play it to the end before paying anything.",
          whileFreeNote: true,
        },
        {
          q: "How many photos does a night sky gift need?",
          a: "Between 3 and 12. Each photo becomes one star. The order you put them in only decides which stars the lines join: each to the one before it and the one after, with the last joined back to the first. They can be opened in any order.",
        },
        {
          q: "Do they have to find the stars in order?",
          a: "No. Any star can be tapped at any time, and a row of dots shows how many are left. The shape draws itself only when the last one has been found.",
        },
        {
          q: "Does it work without tilting the phone?",
          a: "Yes. Tilting only makes the sky drift behind the stars; an iPhone asks first with an “Enable motion” button, and everything opens without it. On a laptop they click the stars.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué poner en un cielo estrellado de regalo",
        items: [
          {
            heading: "Un aniversario",
            how: "De tres a doce fotos, una estrella cada una. Pon pie a las noches importantes.",
            borrow: { field: "caption", line: "La noche que perdiste el último tren" },
          },
          {
            heading: "A distancia",
            how: "Cuenta atrás hasta tu aterrizaje, en su zona horaria.",
            borrow: { field: "countdown.label", line: "Hasta volver a compartir cielo" },
          },
          {
            heading: "San Valentín",
            how: "La frase aparece al completarse la constelación.",
            borrow: { field: "fields.finalLine", line: "Cada estrella, una noche contigo." },
          },
          {
            heading: "Un cumpleaños",
            how: "Una estrella por cada año desde que os conocéis.",
            borrow: { field: "caption", line: "2019, la tienda con goteras" },
          },
          {
            heading: "Una pregunta importante",
            how: "Pon la pregunta en la frase que ven al final.",
            borrow: { field: "fields.finalLine", line: "¿Te vienes a vivir conmigo?" },
          },
          {
            heading: "Para tu madre o tu padre",
            how: "Corazón, infinito o estrella: elige la forma y las fotos de casa.",
            borrow: { field: "caption", line: "La luz del porche, siempre encendida" },
          },
        ],
      },
      faq: [
        {
          q: "¿Hay una versión gratis de Constelaciones?",
          a: "No. Un cielo se hace con tres fotos como mínimo, y las fotos forman parte de «Hazlo especial», que se paga una sola vez. Aun así puedes montar el cielo entero y recorrerlo hasta el final antes de pagar nada.",
          whileFreeNote: true,
        },
        {
          q: "¿Cuántas fotos necesita un cielo estrellado de regalo?",
          a: "Entre 3 y 12. Cada foto se convierte en una estrella. El orden en que las pones solo decide qué estrellas unen las líneas: cada una con la anterior y con la siguiente, y la última con la primera. Se pueden abrir en cualquier orden.",
        },
        {
          q: "¿Hay que encontrar las estrellas en orden?",
          a: "No. Se puede tocar cualquier estrella en cualquier momento, y una fila de puntos indica cuántas faltan. La figura solo se dibuja cuando se ha encontrado la última.",
        },
        {
          q: "¿Funciona sin inclinar el móvil?",
          a: "Sí. Inclinarlo solo hace que el cielo se mueva por detrás de las estrellas; un iPhone pide permiso antes con el botón «Activar movimiento» y todo se abre igual sin él. En un ordenador, las estrellas se pulsan con el ratón.",
        },
      ],
    },
  },

  xoxo: {
    en: {
      ideas: {
        title: "What to put in an XOXO love card",
        items: [
          {
            heading: "Valentine’s Day",
            how: "The newspaper letters spell what you call them, up to 16 characters.",
            borrow: { field: "fields.headline", line: "my person" },
          },
          {
            heading: "An anniversary",
            how: "Write the count under the second photo. It takes 10 characters.",
            borrow: { field: "fields.word", line: "one year" },
          },
          {
            heading: "Just because",
            how: "The lines you’d underline come already underlined.",
            borrow: { field: "fields.lines", line: "You hum when you cook. Don’t stop." },
          },
          {
            heading: "A date night",
            how: "The P.S. keeps the plan until they tap. Give the day and the place.",
            borrow: { field: "surprise.text", line: "Saturday. The table by the window." },
          },
          {
            heading: "Long distance",
            how: "Up to nine photos as polaroids on a lace doily.",
            borrow: { field: "caption", line: "The airport, both crying" },
          },
          {
            heading: "For the group chat",
            how: "Your letter is typed at the bottom, with a kiss by your name.",
            borrow: { field: "message", line: "Love you all. Mostly." },
          },
        ],
      },
      faq: [
        {
          q: "How many photos fit on an XOXO card?",
          a: "One to nine. The first is the big polaroid on the lace doily, the second carries your one word in place of its caption, the third sits in a black frame, and the rest scatter down the page with their captions.",
        },
        {
          q: "Do I choose which words get underlined?",
          a: "No. The card underlines, circles and highlights parts of your lines by itself, a little differently for each pair of names. Several short clauses mark up better than one long sentence.",
        },
        {
          q: "What happens to the kisses they leave?",
          a: "Each tap adds a lipstick print, with a small kiss sound if their sound is on, and the page holds the last sixteen. They are gone when the page is closed, so a screenshot is how to keep them.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué poner en una tarjeta XOXO",
        items: [
          {
            heading: "San Valentín",
            how: "Las letras de periódico escriben cómo le llamas, hasta 16 caracteres.",
            borrow: { field: "fields.headline", line: "mi persona" },
          },
          {
            heading: "Un aniversario",
            how: "Escribe la cuenta bajo la segunda foto. Admite 10 caracteres.",
            borrow: { field: "fields.word", line: "un año" },
          },
          {
            heading: "Porque sí",
            how: "Las frases que subrayarías llegan ya subrayadas.",
            borrow: { field: "fields.lines", line: "Tarareas al cocinar. No pares." },
          },
          {
            heading: "Una noche de cita",
            how: "La posdata guarda el plan hasta que toquen. Di el día y el sitio.",
            borrow: { field: "surprise.text", line: "Sábado. La mesa junto a la ventana." },
          },
          {
            heading: "A distancia",
            how: "Hasta nueve fotos en polaroids sobre una blonda.",
            borrow: { field: "caption", line: "El aeropuerto, llorando los dos" },
          },
          {
            heading: "Para el grupo",
            how: "Tu carta va a máquina al final, con un beso junto a tu nombre.",
            borrow: { field: "message", line: "Os quiero. Casi siempre." },
          },
        ],
      },
      faq: [
        {
          q: "¿Cuántas fotos caben en una tarjeta XOXO?",
          a: "De una a nueve. La primera es la polaroid grande sobre la blonda de encaje, la segunda lleva tu palabra en lugar de su pie, la tercera va en un marco negro y las demás se reparten página abajo con sus pies.",
        },
        {
          q: "¿Elijo yo qué palabras se subrayan?",
          a: "No. La tarjeta subraya, rodea y resalta partes de tus frases ella sola, de forma un poco distinta para cada pareja de nombres. Varias frases cortas quedan mejor marcadas que una larga.",
        },
        {
          q: "¿Qué pasa con los besos que dejan?",
          a: "Cada toque añade una marca de pintalabios, con un pequeño sonido de beso si tienen el sonido activado, y la página conserva las dieciséis últimas. Desaparecen al cerrar la página, así que la forma de guardarlas es una captura de pantalla.",
        },
      ],
    },
  },

  "the-council": {
    en: {
      ideas: {
        title: "What to charge them with before the council of cats",
        items: [
          {
            heading: "Just because",
            how: "Charge them with the thing they do every day, in 60 characters.",
            borrow: { field: "fields.charge", line: "stealing every hoodie I own" },
          },
          {
            heading: "Their birthday",
            how: "Up to six findings. Stamp it “approved”.",
            borrow: { field: "fields.findings", line: "has got better every year, annoyingly" },
          },
          {
            heading: "An anniversary",
            how: "Count the years in the charge.",
            borrow: { field: "fields.charge", line: "three years of taking my side of the bed" },
          },
          {
            heading: "For a flatmate",
            how: "One finding for each cat.",
            borrow: { field: "fields.findings", line: "left one sock in the hall since March" },
          },
          {
            heading: "With evidence",
            how: "Up to six photos go in as exhibits.",
            borrow: { field: "caption", line: "Exhibit B: the empty biscuit tin" },
          },
          {
            heading: "Saying sorry",
            how: "Put yourself on trial and choose “pardoned”.",
            borrow: { field: "message", line: "The court finds I owe you dinner." },
          },
        ],
      },
      faq: [
        {
          q: "How many findings can the cats read out?",
          a: "Up to six, 90 characters each, one for every tap. There are five cats, so with six findings the chair speaks twice. Leave the list empty and the council reads five of its own.",
        },
        {
          q: "Which verdicts can the council stamp?",
          a: "Guilty, Approved, Certified icon or Pardoned. Each stamp comes with its own closing line: Guilty sentences them to one hug, to be served immediately, and Pardoned forgives all crimes.",
        },
        {
          q: "Does The Council need photos?",
          a: "No, it works with none. Add up to six and they are entered as Exhibit A to F above your letter, each with its caption.",
        },
      ],
    },
    es: {
      ideas: {
        title: "De qué acusar ante el consejo de gatos",
        items: [
          {
            heading: "Porque sí",
            how: "Acúsale de eso que hace a diario, en 60 caracteres.",
            borrow: { field: "fields.charge", line: "robarme todas las sudaderas" },
          },
          {
            heading: "Su cumpleaños",
            how: "Hasta seis conclusiones. Séllalo con «Visto bueno».",
            borrow: { field: "fields.findings", line: "mejora cada año, y da rabia" },
          },
          {
            heading: "Un aniversario",
            how: "Cuenta los años en el cargo.",
            borrow: { field: "fields.charge", line: "tres años ocupando mi lado de la cama" },
          },
          {
            heading: "Para quien vive contigo",
            how: "Una conclusión por cada gato.",
            borrow: { field: "fields.findings", line: "un calcetín en el pasillo desde marzo" },
          },
          {
            heading: "Con pruebas",
            how: "Hasta seis fotos entran como pruebas.",
            borrow: { field: "caption", line: "Prueba B: la lata de galletas vacía" },
          },
          {
            heading: "Para pedir perdón",
            how: "Ponte a juicio y elige «indulto».",
            borrow: { field: "message", line: "El tribunal dice que te debo una cena." },
          },
        ],
      },
      faq: [
        {
          q: "¿Cuántas conclusiones pueden leer los gatos?",
          a: "Hasta seis, de 90 caracteres cada una, una por toque. Hay cinco gatos, así que con seis la presidencia habla dos veces. Si dejas la lista vacía, el consejo lee cinco suyas.",
        },
        {
          q: "¿Qué veredictos puede sellar el consejo?",
          a: "«Culpable», «Visto bueno», «Icono certificado» o «Indulto». Cada sello trae su frase final: «Culpable» condena a un abrazo, de cumplimiento inmediato, y el «Indulto» perdona todos los delitos.",
        },
        {
          q: "¿El Consejo necesita fotos?",
          a: "No, funciona sin ninguna. Si añades hasta seis, se presentan como Prueba A a Prueba F encima de tu carta, cada una con su pie.",
        },
      ],
    },
  },

  bloom: {
    en: {
      ideas: {
        title: "What to send with a digital flower",
        items: [
          {
            heading: "Mother’s Day",
            how: "A peony, tulip or daisy in her colour. The message waits inside.",
            borrow: { field: "message", line: "You kept every plant alive, and me." },
          },
          {
            heading: "Saying sorry",
            how: "One flower and a short message. Nothing else on the page.",
            borrow: { field: "message", line: "I was wrong. I’d like to fix it." },
          },
          {
            heading: "Valentine’s Day",
            how: "Once your message has typed out, a P.S. holds the evening’s plan.",
            borrow: { field: "surprise.text", line: "Dinner is at 8. I’m cooking." },
          },
          {
            heading: "An anniversary",
            how: "Up to eight photos float up round the open flower.",
            borrow: { field: "caption", line: "The balcony, year one" },
          },
          {
            heading: "Get well soon",
            how: "It opens only while they hold the screen, so keep the message short.",
            borrow: { field: "message", line: "One flower. No vase needed." },
          },
          {
            heading: "Just because",
            how: "Pick the colour they wear most.",
            borrow: { field: "message", line: "This one doesn’t wilt." },
          },
        ],
      },
      faq: [
        {
          q: "How long do they have to hold the screen?",
          a: "About three seconds in all. The flower opens only while a finger is down; if they let go it waits where it is and carries on when they press again.",
        },
        {
          q: "Which flowers and colours can I choose?",
          a: "A peony, a tulip or a daisy, with petals in any colour. The light is dawn, dusk or paper white, and the pot, the stickers and the drifting pollen can each be switched off.",
        },
        {
          q: "Does a digital flower need photos?",
          a: "No. With none, the flower and your note are the whole gift. Add up to eight and they float up around the open flower, each showing its caption when tapped.",
        },
        {
          q: "Will it open on an old phone?",
          a: "The flower is drawn in 3D, which nearly every phone and laptop in use can do. On a browser that can’t, the flower isn’t drawn; the photos and your note still open.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué enviar con una flor digital",
        items: [
          {
            heading: "El Día de la Madre",
            how: "Una peonía, un tulipán o una margarita de su color. El mensaje espera dentro.",
            borrow: { field: "message", line: "Mantuviste vivas todas las plantas, y a mí." },
          },
          {
            heading: "Para pedir perdón",
            how: "Una flor y un mensaje corto. Nada más en la página.",
            borrow: { field: "message", line: "Me equivoqué. Quiero arreglarlo." },
          },
          {
            heading: "San Valentín",
            how: "Cuando tu mensaje termina de escribirse, una posdata guarda el plan de la noche.",
            borrow: { field: "surprise.text", line: "La cena es a las 20:00. Cocino yo." },
          },
          {
            heading: "Un aniversario",
            how: "Hasta ocho fotos suben alrededor de la flor abierta.",
            borrow: { field: "caption", line: "El balcón, primer año" },
          },
          {
            heading: "Para desear una pronta mejoría",
            how: "Solo se abre mientras mantienen el dedo: que el mensaje sea corto.",
            borrow: { field: "message", line: "Una flor. Sin jarrón." },
          },
          {
            heading: "Porque sí",
            how: "Elige el color que más se pone.",
            borrow: { field: "message", line: "Esta no se marchita." },
          },
        ],
      },
      faq: [
        {
          q: "¿Cuánto tiempo hay que mantener pulsada la pantalla?",
          a: "Unos tres segundos en total. La flor solo se abre mientras hay un dedo encima; si lo levantan, espera donde estaba y sigue cuando vuelven a pulsar.",
        },
        {
          q: "¿Qué flores y colores se pueden elegir?",
          a: "Una peonía, un tulipán o una margarita, con pétalos de cualquier color. La luz puede ser de amanecer, de atardecer o blanco papel, y la maceta, las pegatinas y el polen flotando se pueden quitar por separado.",
        },
        {
          q: "¿Una flor digital necesita fotos?",
          a: "No. Sin ninguna, la flor y tu nota son todo el regalo. Si añades hasta ocho, suben alrededor de la flor abierta y cada una enseña su pie al tocarla.",
        },
        {
          q: "¿Se abre en un móvil antiguo?",
          a: "La flor está dibujada en 3D, algo que hace casi cualquier móvil u ordenador en uso. En un navegador que no pueda, la flor no se dibuja; las fotos y tu nota se abren igualmente.",
        },
      ],
    },
  },

  halfway: {
    en: {
      ideas: {
        title: "What to write on a halfway postcard",
        items: [
          {
            heading: "Before the next visit",
            how: "The timer runs to the second you arrive. Label it with the day.",
            borrow: { field: "countdown.label", line: "Until Friday at arrivals" },
          },
          {
            heading: "An anniversary apart",
            how: "Add the places you’ve met in the middle, up to four.",
            borrow: { field: "fields.halfwayNote", line: "Reykjavík. Neither of us flew further." },
          },
          {
            heading: "Their birthday",
            how: "The postcard flips over to your letter.",
            borrow: { field: "message", line: "I’d blow this plane all the way myself." },
          },
          {
            heading: "A parent to a student",
            how: "The real distance shows in big numbers. Write what’s halfway.",
            borrow: { field: "fields.halfwayNote", line: "The motorway café where we swap bags." },
          },
          {
            heading: "For a friend who moved",
            how: "Up to eight photos are taped under your letter.",
            borrow: { field: "caption", line: "Your old street, last week" },
          },
          {
            heading: "The last time apart",
            how: "Keep the news for the P.S. Nothing before it should give it away.",
            borrow: { field: "surprise.text", line: "Check the date. I’m not flying back." },
          },
        ],
      },
      faq: [
        {
          q: "What if they can’t blow into the phone?",
          a: "A tap on the plane flies it the rest of the way by itself. Blowing needs the microphone, which the phone asks for first; in a quiet office, or with that permission refused, the tap does everything.",
        },
        {
          q: "Does this long-distance relationship gift show the real distance?",
          a: "Yes. Pick both towns from the list and the kilometres are measured between them as the crow flies, through any stops you add. You can type your own number over it, such as the length of the drive.",
        },
        {
          q: "What happens if they stop blowing halfway?",
          a: "The plane coasts for a moment, then drifts slowly back the way it came, and the kilometres climb again. Only landing makes it stay.",
        },
        {
          q: "How many photos go on the postcard?",
          a: "One to eight. They are taped in two columns under your letter, each with its caption in handwriting.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué escribir en una postal a medio camino",
        items: [
          {
            heading: "Antes de la próxima visita",
            how: "El reloj cuenta hasta el segundo en que llegas. Ponle el día.",
            borrow: { field: "countdown.label", line: "Hasta el viernes en llegadas" },
          },
          {
            heading: "Un aniversario a distancia",
            how: "Añade los sitios donde os habéis visto a medio camino, hasta cuatro.",
            borrow: { field: "fields.halfwayNote", line: "Reikiavik. Nadie voló más que nadie." },
          },
          {
            heading: "Su cumpleaños",
            how: "La postal se da la vuelta y aparece tu carta.",
            borrow: { field: "message", line: "Soplaría este avión hasta allí." },
          },
          {
            heading: "De casa a quien estudia fuera",
            how: "La distancia real sale en números grandes. Escribe qué hay a medio camino.",
            borrow: { field: "fields.halfwayNote", line: "El bar de la autovía donde nos vemos." },
          },
          {
            heading: "Para quien se mudó lejos",
            how: "Hasta ocho fotos van pegadas bajo tu carta.",
            borrow: { field: "caption", line: "Tu antigua calle, la semana pasada" },
          },
          {
            heading: "La última vez a distancia",
            how: "Guarda la noticia para la posdata. Que nada antes la delate.",
            borrow: { field: "surprise.text", line: "Mira la fecha. Ya no hay vuelo de vuelta." },
          },
        ],
      },
      faq: [
        {
          q: "¿Y si no pueden soplar al móvil?",
          a: "Un toque en el avión lo lleva solo el resto del camino. Soplar necesita el micrófono, y el móvil pide permiso antes; en una oficina en silencio, o si no dan ese permiso, el toque lo hace todo.",
        },
        {
          q: "¿Los kilómetros de este regalo a distancia son reales?",
          a: "Sí. Elige las dos ciudades de la lista y los kilómetros se miden entre ellas en línea recta, pasando por las paradas que añadas. Puedes escribir tu propio número encima, como los kilómetros en coche.",
        },
        {
          q: "¿Qué pasa si dejan de soplar a medio camino?",
          a: "El avión planea un momento y luego retrocede despacio por donde vino, y los kilómetros vuelven a subir. Solo se queda cuando aterriza.",
        },
        {
          q: "¿Cuántas fotos lleva la postal?",
          a: "De una a ocho. Van pegadas en dos columnas debajo de tu carta, cada una con su pie escrito a mano.",
        },
      ],
    },
  },

  "frosted-window": {
    en: {
      ideas: {
        title: "What to write on a frosted window card",
        items: [
          {
            heading: "Christmas Eve",
            how: "Chalk their name on the snowman’s board. It holds 36 characters.",
            borrow: { field: "fields.sign", line: "merry christmas, Ava" },
          },
          {
            heading: "First Christmas together",
            how: "Two stockings carry your names. Put the year on the sign.",
            borrow: { field: "fields.sign", line: "our first one, 2026" },
          },
          {
            heading: "Christmas apart",
            how: "Count down to the train home. It ticks in days, hours, minutes and seconds.",
            borrow: { field: "countdown.label", line: "Until I knock on your window" },
          },
          {
            heading: "With a present to find",
            how: "The P.S. comes after the photos, behind a present they tap.",
            borrow: { field: "surprise.text", line: "Two tickets to the ice rink on the 27th." },
          },
          {
            heading: "For the family",
            how: "Cream cottage, log cabin or midnight blue. Sign it from all of you.",
            borrow: { field: "fields.sign", line: "love from all four of us" },
          },
          {
            heading: "The year in photos",
            how: "Go month by month: up to eight photos come after your letter.",
            borrow: { field: "caption", line: "March, the day we moved in" },
          },
        ],
      },
      faq: [
        {
          q: "How long can the snowman’s sign be?",
          a: "36 characters, chalked on his blackboard. Left empty it reads “merry christmas” and their name. Whatever it says also heads your letter.",
        },
        {
          q: "How does this interactive Christmas card open?",
          a: "With a finger on the frost. Nothing clears by itself: only what they wipe goes clear, and “read the letter” appears once most of the blackboard is showing. On a laptop they drag with the mouse, and from a keyboard Enter clears the pane.",
        },
        {
          q: "Whose names are on the stockings?",
          a: "Yours on the left and theirs on the right, written on the cuffs. A name longer than ten letters is cut short there.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué escribir en una ventana helada",
        items: [
          {
            heading: "Nochebuena",
            how: "Escribe su nombre con tiza en la pizarra del muñeco. Caben 36 caracteres.",
            borrow: { field: "fields.sign", line: "feliz navidad, Ava" },
          },
          {
            heading: "La primera Navidad en pareja",
            how: "Los dos calcetines llevan vuestros nombres. Pon el año en el cartel.",
            borrow: { field: "fields.sign", line: "la primera, 2026" },
          },
          {
            heading: "Navidad a distancia",
            how: "Cuenta atrás hasta el tren de vuelta, en días, horas, minutos y segundos.",
            borrow: { field: "countdown.label", line: "Hasta llamar a tu ventana" },
          },
          {
            heading: "Con un regalo escondido",
            how: "La posdata llega tras las fotos, detrás de un regalo que se toca.",
            borrow: { field: "surprise.text", line: "Dos entradas para la pista de hielo el 27." },
          },
          {
            heading: "Para la familia",
            how: "Casita crema, cabaña de troncos o azul medianoche. Firmad entre todos.",
            borrow: { field: "fields.sign", line: "con cariño, los cuatro" },
          },
          {
            heading: "El año en fotos",
            how: "Ve mes a mes: hasta ocho fotos llegan tras tu carta.",
            borrow: { field: "caption", line: "Marzo, el día de la mudanza" },
          },
        ],
      },
      faq: [
        {
          q: "¿Cuánto puede ocupar el cartel del muñeco de nieve?",
          a: "36 caracteres, escritos con tiza en su pizarra. Si lo dejas vacío pone «feliz navidad» y su nombre. Lo que diga encabeza también tu carta.",
        },
        {
          q: "¿Cómo se abre esta tarjeta de Navidad interactiva?",
          a: "Con el dedo sobre la escarcha. Nada se quita solo: se limpia lo que frota el dedo, y «lee la carta» aparece cuando ya se ve casi toda la pizarra. En un ordenador se arrastra con el ratón y, desde el teclado, Intro limpia el cristal entero.",
        },
        {
          q: "¿De quién son los nombres de los calcetines?",
          a: "El tuyo a la izquierda y el suyo a la derecha, escritos en el puño. Un nombre de más de diez letras sale cortado.",
        },
      ],
    },
  },

  "light-the-candles": {
    en: {
      ideas: {
        title: "What to be thankful for in a candlelit card",
        items: [
          {
            heading: "Thanksgiving together",
            how: "Five candles, five lines of up to 60 characters.",
            borrow: { field: "fields.thanks", line: "the coffee you bring me before I ask" },
          },
          {
            heading: "Thanksgiving apart",
            how: "Thank them for things from this year.",
            borrow: { field: "fields.thanks", line: "every call that ran past midnight" },
          },
          {
            heading: "For whoever is cooking",
            how: "Five things about the table they set every year.",
            borrow: { field: "fields.thanks", line: "the extra chair you always find" },
          },
          {
            heading: "Friendsgiving",
            how: "One candle for each friend at the table.",
            borrow: { field: "fields.thanks", line: "Sam, for driving every time" },
          },
          {
            heading: "After a hard year",
            how: "The title is written in light. Keep it plain.",
            borrow: { field: "title", line: "we made it to the table" },
          },
          {
            heading: "For your parents",
            how: "Your letter follows once all five are lit.",
            borrow: { field: "message", line: "Thank you for the house that was always warm." },
          },
        ],
      },
      faq: [
        {
          q: "Does a Thanksgiving message have to fill all five lines?",
          a: "No, but each of the five candles shows the next line as it lights, so with fewer than five the last candles catch without words. Every line takes up to 60 characters.",
        },
        {
          q: "How do they light the candles?",
          a: "They touch the table to strike a match, then drag the flame to each wick, or tap the candles one at a time. From a keyboard, Enter lights the next one.",
        },
        {
          q: "Is it only for Thanksgiving?",
          a: "The table is an autumn one, with pumpkins and a sunset in the window, but none of the words on it are fixed. With your own title and five lines it suits a harvest dinner, a November birthday or a plain thank-you.",
        },
        {
          q: "How do they read the letter?",
          a: "A few sentences at a time over the lit candles, with an arrow to move on. After the words, each photo appears by itself with its caption, then the countdown and the hidden surprise.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Por qué dar las gracias con cinco velas",
        items: [
          {
            heading: "Acción de Gracias en pareja",
            how: "Cinco velas, cinco frases de hasta 60 caracteres.",
            borrow: { field: "fields.thanks", line: "el café que me traes sin pedirlo" },
          },
          {
            heading: "Acción de Gracias a distancia",
            how: "Da las gracias por cosas de este año.",
            borrow: { field: "fields.thanks", line: "cada llamada pasada la medianoche" },
          },
          {
            heading: "Para quien cocina",
            how: "Cinco cosas de la mesa que pone cada año.",
            borrow: { field: "fields.thanks", line: "la silla de más que siempre encuentras" },
          },
          {
            heading: "Con amigas y amigos",
            how: "Una vela por cada persona de la mesa.",
            borrow: { field: "fields.thanks", line: "Sam, por conducir siempre" },
          },
          {
            heading: "Tras un año difícil",
            how: "El título se escribe con luz. Que sea sencillo.",
            borrow: { field: "title", line: "hemos llegado a la mesa" },
          },
          {
            heading: "Para tu madre y tu padre",
            how: "Tu carta llega cuando las cinco están encendidas.",
            borrow: { field: "message", line: "Gracias por una casa siempre caliente." },
          },
        ],
      },
      faq: [
        {
          q: "¿Un mensaje de Acción de Gracias necesita las cinco frases?",
          a: "No, pero cada una de las cinco velas enseña la siguiente frase al encenderse, así que con menos de cinco las últimas prenden sin palabras. Cada frase admite hasta 60 caracteres.",
        },
        {
          q: "¿Cómo se encienden las velas?",
          a: "Tocan la mesa para encender una cerilla y arrastran la llama hasta cada mecha, o tocan las velas una a una. Desde el teclado, Intro enciende la siguiente.",
        },
        {
          q: "¿Solo sirve para Acción de Gracias?",
          a: "La mesa es de otoño, con calabazas y un atardecer en la ventana, pero ninguna de sus palabras viene fijada. Con tu título y tus cinco frases vale para una cena de otoño, un cumpleaños de noviembre o un gracias sin más.",
        },
        {
          q: "¿Cómo se lee la carta?",
          a: "Unas pocas frases cada vez, sobre las velas encendidas, con una flecha para seguir. Después de las palabras, cada foto aparece sola con su pie y, al final, la cuenta atrás y la sorpresa escondida.",
        },
      ],
    },
  },

  "string-the-lights": {
    en: {
      ideas: {
        title: "What to write in a Christmas lights card",
        items: [
          {
            heading: "Christmas Eve",
            how: "Your words come on in bulbs, up to 28 characters.",
            borrow: { field: "fields.sign", line: "MERRY CHRISTMAS MIA" },
          },
          {
            heading: "A question to ask",
            how: "Put the question on the board in the garden.",
            borrow: { field: "fields.sign", line: "MOVE IN WITH ME?" },
          },
          {
            heading: "Christmas apart",
            how: "Set the countdown to the hour you pull into the drive.",
            borrow: { field: "countdown.label", line: "Until I’m home" },
          },
          {
            heading: "For the family",
            how: "Barn red, navy blue or sage green for the house.",
            borrow: { field: "fields.sign", line: "HOME BY THE 23RD" },
          },
          {
            heading: "The year in photos",
            how: "Up to eight photos follow your letter. Start with the house unlit.",
            borrow: { field: "caption", line: "The roof, before the lights" },
          },
          {
            heading: "With a present to find",
            how: "Hint at the present in the P.S. and keep the box for the day.",
            borrow: { field: "surprise.text", line: "The big star you circled in the catalogue." },
          },
        ],
      },
      faq: [
        {
          q: "How long can the words in lights be?",
          a: "28 characters, shown in capitals on the board in the garden. Twelve or fewer are drawn largest. Left empty, the board reads MERRY CHRISTMAS and their name.",
        },
        {
          q: "Do they have to hang every light?",
          a: "Yes. The switch appears only when the last bulb is up, and a counter shows how many are left. A finger run along the roof and the porch hangs them quickly; from a keyboard, Enter hangs eight at a time.",
        },
        {
          q: "How do they read the letter in this digital Christmas card?",
          a: "As a stack of cards they turn by tapping: your words over a few cards, then one card for each photo with its caption, then the countdown and the hidden surprise. A bulb lights on the string for every card.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué escribir en una tarjeta de Navidad con luces",
        items: [
          {
            heading: "Nochebuena",
            how: "Tus palabras se encienden en bombillas, hasta 28 caracteres.",
            borrow: { field: "fields.sign", line: "FELIZ NAVIDAD MIA" },
          },
          {
            heading: "Una pregunta importante",
            how: "Pon la pregunta en el cartel del jardín.",
            borrow: { field: "fields.sign", line: "¿VIVIMOS EN LA MISMA?" },
          },
          {
            heading: "Navidad a distancia",
            how: "Pon la cuenta atrás en la hora en que aparcas en la puerta.",
            borrow: { field: "countdown.label", line: "Hasta que vuelva a casa" },
          },
          {
            heading: "Para la familia",
            how: "Rojo granero, azul marino o verde salvia para la casa.",
            borrow: { field: "fields.sign", line: "LLEGO EL DÍA 23" },
          },
          {
            heading: "El año en fotos",
            how: "Hasta ocho fotos siguen a tu carta. Empieza por la casa a oscuras.",
            borrow: { field: "caption", line: "El tejado, antes de las luces" },
          },
          {
            heading: "Con un regalo escondido",
            how: "Da una pista del regalo en la posdata y guarda la caja para el día.",
            borrow: { field: "surprise.text", line: "La estrella grande que marcaste en el catálogo." },
          },
        ],
      },
      faq: [
        {
          q: "¿Cuánto pueden ocupar las palabras de luces?",
          a: "28 caracteres, en mayúsculas, en el cartel del jardín. Con doce o menos salen más grandes. Si lo dejas vacío, el cartel pone FELIZ NAVIDAD y su nombre.",
        },
        {
          q: "¿Hay que colgar todas las luces?",
          a: "Sí. El interruptor solo aparece cuando está puesta la última bombilla, y un contador indica cuántas faltan. Pasando el dedo por el tejado y el porche se cuelgan rápido; desde el teclado, Intro cuelga ocho de golpe.",
        },
        {
          q: "¿Cómo se lee la carta de esta tarjeta de Navidad digital?",
          a: "En un montón de tarjetas que se pasan con un toque: tus palabras en unas cuantas, luego una tarjeta por foto con su pie y, al final, la cuenta atrás y la sorpresa escondida. Por cada tarjeta se enciende una bombilla en la tira.",
        },
      ],
    },
  },

  "gingerbread-house": {
    en: {
      ideas: {
        title: "What to hide inside a virtual gingerbread house",
        items: [
          {
            heading: "For a child",
            how: "They stick on the sweets themselves. Keep the letter to a few lines.",
            borrow: { field: "message", line: "You decorate. I’ll bring the icing." },
          },
          {
            heading: "Christmas apart",
            how: "The letter is inside, behind the little door.",
            borrow: { field: "message", line: "Same tradition, two kitchens this year." },
          },
          {
            heading: "First Christmas in a new home",
            how: "The title sits over the house.",
            borrow: { field: "title", line: "home sweet home" },
          },
          {
            heading: "For the grandparents",
            how: "Up to eight photos wait inside with your letter.",
            borrow: { field: "caption", line: "The tree, before the cat found it" },
          },
          {
            heading: "With a present to find",
            how: "Set the P.S. to shake, so they rattle the phone like a wrapped box.",
            borrow: { field: "surprise.text", line: "A real kit, the big one, and Saturday free." },
          },
          {
            heading: "For a whole class",
            how: "One link works for everyone. Each house comes out different.",
            borrow: { field: "message", line: "Show me yours on Monday." },
          },
        ],
      },
      faq: [
        {
          q: "What can they decorate a virtual gingerbread house with?",
          a: "Seven sweets (red and green gumdrops, peppermints, chocolate buttons, sugar stars, sugar hearts and candy canes) and white icing, piped by dragging a finger. There is an undo button, and they can add as much or as little as they like.",
        },
        {
          q: "When does the little door open?",
          a: "Once six sweets or lines of icing are on the house, an “open the door” button appears. They can keep decorating for as long as they like before pressing it.",
        },
        {
          q: "Can I write anything on the house itself?",
          a: "Only the title, which sits over the kitchen and is piped in icing on the cover of the book inside. Under about 22 characters it is drawn at full size; longer ones are set smaller, on two lines at most.",
        },
        {
          q: "How do they read the letter?",
          a: "As a small book that opens by itself: your words across numbered pages, then a page for each photo, taped in with its caption, then the countdown and the hidden surprise. A tap on the right of a page turns it.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué esconder en una casita de jengibre virtual",
        items: [
          {
            heading: "Para un peque",
            how: "Pegan los dulces por su cuenta. Deja la carta en pocas líneas.",
            borrow: { field: "message", line: "Tú decoras. Yo llevo el glaseado." },
          },
          {
            heading: "Navidad a distancia",
            how: "La carta está dentro, tras la puertecita.",
            borrow: { field: "message", line: "La misma tradición, este año en dos cocinas." },
          },
          {
            heading: "La primera Navidad en casa nueva",
            how: "El título va sobre la casita.",
            borrow: { field: "title", line: "hogar, dulce hogar" },
          },
          {
            heading: "Para los abuelos",
            how: "Hasta ocho fotos esperan dentro con tu carta.",
            borrow: { field: "caption", line: "El árbol, antes de que lo viera el gato" },
          },
          {
            heading: "Con un regalo escondido",
            how: "Pon la posdata en agitar: sacuden el móvil como una caja envuelta.",
            borrow: { field: "surprise.text", line: "Un kit de verdad, el grande, y el sábado libre." },
          },
          {
            heading: "Para toda una clase",
            how: "Un enlace vale para todo el mundo. Cada casita sale distinta.",
            borrow: { field: "message", line: "El lunes me enseñáis la vuestra." },
          },
        ],
      },
      faq: [
        {
          q: "¿Con qué se decora una casita de jengibre virtual?",
          a: "Con siete dulces (gominolas rojas y verdes, caramelos de menta, botones de chocolate, estrellas y corazones de azúcar y bastones de caramelo) y con glaseado blanco, que se traza arrastrando el dedo. Hay un botón de deshacer y se puede poner tanto o tan poco como apetezca.",
        },
        {
          q: "¿Cuándo se abre la puertecita?",
          a: "Cuando la casita lleva seis dulces o líneas de glaseado aparece el botón «abre la puerta». Se puede seguir decorando todo lo que se quiera antes de pulsarlo.",
        },
        {
          q: "¿Se puede escribir algo en la propia casita?",
          a: "Solo el título, que va sobre la cocina y trazado con glaseado en la tapa del librito de dentro. Con menos de unos 22 caracteres sale a tamaño completo; los más largos van más pequeños y en dos líneas como mucho.",
        },
        {
          q: "¿Cómo se lee la carta?",
          a: "En un librito que se abre solo: tus palabras en páginas numeradas, luego una página por foto, pegada con su pie, y al final la cuenta atrás y la sorpresa escondida. Un toque en la parte derecha de la página la pasa.",
        },
      ],
    },
  },

  "snow-globe": {
    en: {
      ideas: {
        title: "What to put inside a digital snow globe",
        items: [
          {
            heading: "Christmas",
            how: "Name the winter on the brass plaque, in 44 characters.",
            borrow: { field: "fields.plaque", line: "the winter we stopped counting trains" },
          },
          {
            heading: "Christmas apart",
            how: "Pick the two homes. A line appears each time the snow settles.",
            borrow: { field: "fields.lines", line: "You hang the same crooked star every year." },
          },
          {
            heading: "First Christmas together",
            how: "Engrave the year on the plaque.",
            borrow: { field: "fields.plaque", line: "our first winter, 2026" },
          },
          {
            heading: "An anniversary in winter",
            how: "Up to four lines, one for each shake.",
            borrow: { field: "fields.lines", line: "The heating broke and we didn’t mind." },
          },
          {
            heading: "Before you arrive",
            how: "Time the countdown to your train, not to Christmas Day.",
            borrow: { field: "countdown.label", line: "Until I’m at your door" },
          },
          {
            heading: "For a grandparent",
            how: "A photo hangs in the snow between your lines; the rest wait by the letter.",
            borrow: { field: "caption", line: "The sledge, last January" },
          },
        ],
      },
      faq: [
        {
          q: "What appears in the snow?",
          a: "One thing each time it settles, taking turns: a line of yours, a photo hanging like an ornament, a line, a photo. With at least two of each to draw on, four shakes show two lines and two photos, three show two lines and one photo, and two show one of each.",
        },
        {
          q: "Do they have to shake the phone?",
          a: "No. The buttons under the globe do everything, on a laptop too, and a tap on the glass counts as a shake. On an iPhone, shaking works once they tap “let it feel the shake”.",
        },
        {
          q: "How many photos does a snow globe hold?",
          a: "One to eight. Up to four hang in the snow as it is shaken; all of them are framed under your letter with their captions.",
        },
        {
          q: "What is engraved on the plaque?",
          a: "Up to 44 characters of your own, cut into the brass after the last shake. Leave it empty and the plaque carries the title of your gift.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué meter en una bola de nieve digital",
        items: [
          {
            heading: "Navidad",
            how: "Ponle nombre a este invierno en la placa de latón, en 44 caracteres.",
            borrow: { field: "fields.plaque", line: "el invierno de los trenes sin contar" },
          },
          {
            heading: "Navidad a distancia",
            how: "Elige las dos casas. Sale una frase cada vez que la nieve se posa.",
            borrow: { field: "fields.lines", line: "Cuelgas la misma estrella torcida cada año." },
          },
          {
            heading: "La primera Navidad en pareja",
            how: "Graba el año en la placa.",
            borrow: { field: "fields.plaque", line: "nuestro primer invierno, 2026" },
          },
          {
            heading: "Un aniversario en invierno",
            how: "Hasta cuatro frases, una por sacudida.",
            borrow: { field: "fields.lines", line: "Se rompió la calefacción y nos dio igual." },
          },
          {
            heading: "Antes de llegar",
            how: "Pon la cuenta atrás en tu tren, no en el día de Navidad.",
            borrow: { field: "countdown.label", line: "Hasta llamar a tu puerta" },
          },
          {
            heading: "Para tu abuela o tu abuelo",
            how: "Una foto cuelga en la nieve entre tus frases; las demás esperan junto a la carta.",
            borrow: { field: "caption", line: "El trineo, el enero pasado" },
          },
        ],
      },
      faq: [
        {
          q: "¿Qué aparece en la nieve?",
          a: "Una cosa cada vez que se posa, por turnos: una frase tuya, una foto colgada como un adorno, otra frase, otra foto. Si hay al menos dos de cada, cuatro sacudidas enseñan dos frases y dos fotos, tres enseñan dos frases y una foto, y dos enseñan una de cada.",
        },
        {
          q: "¿Hay que agitar el móvil?",
          a: "No. Los botones de debajo de la bola lo hacen todo, también en un ordenador, y un toque en el cristal cuenta como sacudida. En un iPhone, agitar funciona después de tocar «que note el movimiento».",
        },
        {
          q: "¿Cuántas fotos caben en una bola de nieve?",
          a: "De una a ocho. Hasta cuatro cuelgan en la nieve según se agita; todas quedan enmarcadas debajo de tu carta con sus pies.",
        },
        {
          q: "¿Qué se graba en la placa?",
          a: "Hasta 44 caracteres tuyos, grabados en el latón después de la última sacudida. Si la dejas vacía, la placa lleva el título de tu regalo.",
        },
      ],
    },
  },

  "nice-list": {
    en: {
      ideas: {
        title: "What to write on a naughty or nice list",
        items: [
          {
            heading: "For your partner",
            how: "Up to four crimes, 50 characters each. Count them.",
            borrow: { field: "fields.naughty", line: "stole the blanket, 41 nights of 41" },
          },
          {
            heading: "For a child",
            how: "Keep the crimes small and the good deeds real.",
            borrow: { field: "fields.nice", line: "shared the last biscuit, once" },
          },
          {
            heading: "For a brother or sister",
            how: "All crimes, then stamp it “naughty and nice”.",
            borrow: { field: "fields.naughty", line: "ate my leftovers and denied it" },
          },
          {
            heading: "From the grandchildren",
            how: "One good deed from each of them.",
            borrow: { field: "fields.nice", line: "always has sweets in the car" },
          },
          {
            heading: "With evidence",
            how: "Up to eight photos are filed as evidence.",
            borrow: { field: "caption", line: "Exhibit A: the empty tin" },
          },
          {
            heading: "With a present to find",
            how: "The P.S. gets a sheet of its own. Name the thing they hinted at.",
            borrow: { field: "surprise.text", line: "The thing you hinted at since October." },
          },
        ],
      },
      faq: [
        {
          q: "How long can a naughty or nice list be?",
          a: "Up to four good deeds and four crimes, 50 characters each. They are read in turn, a good deed and then a crime, and each is ticked in pen in its own column.",
        },
        {
          q: "What can the stamp say?",
          a: "NICE, NAUGHTY, or both, pressed one after the other. Whichever you pick, the line under it approves the presents.",
        },
        {
          q: "What year does the list show?",
          a: "The current one, filled in by itself. Through January and February it still shows the year just ended, so a list sent late is dated right.",
        },
        {
          q: "What if I don’t write any lines?",
          a: "The scroll is never blank: with nothing written it shows one good deed and one crime of its own. It reads far better with yours.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué escribir en una lista de Papá Noel",
        items: [
          {
            heading: "Para tu pareja",
            how: "Hasta cuatro fechorías, de 50 caracteres. Ponles número.",
            borrow: { field: "fields.naughty", line: "me quitó la manta las 41 noches" },
          },
          {
            heading: "Para un peque",
            how: "Fechorías pequeñas y buenas obras de verdad.",
            borrow: { field: "fields.nice", line: "compartió la última galleta, una vez" },
          },
          {
            heading: "Para tu hermana o tu hermano",
            how: "Todo fechorías, y el sello de «Carbón dulce».",
            borrow: { field: "fields.naughty", line: "se comió mis sobras y lo negó" },
          },
          {
            heading: "De parte de los nietos",
            how: "Una buena obra de parte de cada uno.",
            borrow: { field: "fields.nice", line: "siempre lleva caramelos en el coche" },
          },
          {
            heading: "Con pruebas",
            how: "Hasta ocho fotos se archivan como pruebas.",
            borrow: { field: "caption", line: "Prueba A: la lata vacía" },
          },
          {
            heading: "Con un regalo escondido",
            how: "La posdata tiene su propia hoja. Di eso que lleva meses insinuando.",
            borrow: { field: "surprise.text", line: "Lo que llevas insinuando desde octubre." },
          },
        ],
      },
      faq: [
        {
          q: "¿Cuántas líneas caben en una lista de Papá Noel?",
          a: "Hasta cuatro buenas obras y cuatro fechorías, de 50 caracteres cada una. Se leen por turnos, una buena obra y luego una fechoría, y cada una lleva su marca a boli en su columna.",
        },
        {
          q: "¿Qué puede poner el sello?",
          a: "SIN CARBÓN, CARBÓN o CARBÓN DULCE, que son dos sellos, uno detrás de otro. Elijas el que elijas, la frase de debajo aprueba los regalos.",
        },
        {
          q: "¿Qué año aparece en la lista?",
          a: "El actual, que se pone solo. En enero y febrero sigue saliendo el año recién terminado, así que una lista enviada tarde lleva la fecha correcta.",
        },
        {
          q: "¿Y si no escribo ninguna línea?",
          a: "El pergamino nunca sale en blanco: sin nada escrito enseña una buena obra y una fechoría de las suyas. Con las tuyas queda mucho mejor.",
        },
      ],
    },
  },

  "jar-of-reasons": {
    en: {
      ideas: {
        title: "What to write in a reasons why I love you jar",
        items: [
          {
            heading: "An anniversary",
            how: "One reason for each month. Put the number on the jar’s label.",
            borrow: { field: "fields.label", line: "12 reasons, one per month" },
          },
          {
            heading: "Valentine’s Day",
            how: "Small true things beat big words. Each note takes 160 characters.",
            borrow: { field: "fields.reasons", line: "You steal my sugar and deny it every time." },
          },
          {
            heading: "Mother’s Day",
            how: "Write what she did, not what she is.",
            borrow: { field: "fields.reasons", line: "You waited up, every single time." },
          },
          {
            heading: "Father’s Day",
            how: "One note for each thing he taught you.",
            borrow: { field: "fields.reasons", line: "You taught me to check the oil." },
          },
          {
            heading: "From the whole family",
            how: "Ask everyone for one note. Some notes can carry a photo.",
            borrow: { field: "fields.reasons", line: "From Leo: you make the best pancakes." },
          },
          {
            heading: "A hard week",
            how: "Reasons they’re doing better than they think.",
            borrow: { field: "fields.reasons", line: "You got up today. That counts." },
          },
        ],
      },
      faq: [
        {
          q: "How many reasons fit in a reasons why I love you jar?",
          a: "From 3 to 100, up to 160 characters each. The label counts them for you (“100 reasons I love you”) unless you write your own.",
        },
        {
          q: "Do the notes come out in the order I wrote them?",
          a: "No. The jar shuffles them, and numbers each one as it comes out. Write every note so it stands alone, and keep anything that needs an order for the letter underneath.",
        },
        {
          q: "Which notes get a photo?",
          a: "The first ones you wrote: photo one goes with reason one, photo two with reason two, up to 20 photos. The photo shows on its note without its caption.",
        },
        {
          q: "Do they have to shake the phone?",
          a: "No, a tap on the jar does the same. Shaking works on phones that allow it; an iPhone asks first with an “Enable motion” button.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué escribir en un frasco de razones",
        items: [
          {
            heading: "Un aniversario",
            how: "Una razón por cada mes. Pon el número en la etiqueta.",
            borrow: { field: "fields.label", line: "12 razones, una por mes" },
          },
          {
            heading: "San Valentín",
            how: "Las cosas pequeñas y ciertas ganan. Cada nota admite 160 caracteres.",
            borrow: { field: "fields.reasons", line: "Me robas el azúcar y siempre lo niegas." },
          },
          {
            heading: "El Día de la Madre",
            how: "Escribe lo que hizo, no cómo es.",
            borrow: { field: "fields.reasons", line: "Me esperaste despierta todas las veces." },
          },
          {
            heading: "El Día del Padre",
            how: "Una nota por cada cosa que te enseñó.",
            borrow: { field: "fields.reasons", line: "Me enseñaste a mirar el aceite." },
          },
          {
            heading: "De toda la familia",
            how: "Pide una nota a cada persona. Algunas pueden llevar foto.",
            borrow: { field: "fields.reasons", line: "De Leo: haces las mejores tortitas." },
          },
          {
            heading: "Una semana difícil",
            how: "Razones por las que va mejor de lo que cree.",
            borrow: { field: "fields.reasons", line: "Hoy te has levantado. Eso cuenta." },
          },
        ],
      },
      faq: [
        {
          q: "¿Caben 100 razones por las que te amo en el frasco?",
          a: "Sí: caben de 3 a 100, de hasta 160 caracteres cada una. La etiqueta las cuenta por ti («100 razones por las que te quiero»), salvo que escribas la tuya.",
        },
        {
          q: "¿Las notas salen en el orden en que las escribí?",
          a: "No. El frasco las baraja y numera cada una según va saliendo. Escribe cada nota para que se entienda sola y deja para la carta de debajo lo que necesite un orden.",
        },
        {
          q: "¿Qué notas llevan foto?",
          a: "Las primeras que escribiste: la foto uno va con la razón uno, la dos con la dos, hasta 20 fotos. La foto sale en su nota sin su pie.",
        },
        {
          q: "¿Hay que agitar el móvil?",
          a: "No, un toque en el frasco hace lo mismo. Agitar funciona en los móviles que lo permiten; un iPhone pide permiso antes con el botón «Activar movimiento».",
        },
      ],
    },
  },

  "our-timeline": {
    en: {
      ideas: {
        title: "What to put on a relationship timeline",
        items: [
          {
            heading: "An anniversary",
            how: "Two to twenty photos, each with its date.",
            borrow: { field: "fields.dates", line: "June 2024" },
          },
          {
            heading: "A wedding",
            how: "Close the road on today, in a line of 80 characters.",
            borrow: { field: "fields.ending", line: "…and today we add the next one." },
          },
          {
            heading: "A graduation",
            how: "Start at the first uniform and end at the gown.",
            borrow: { field: "caption", line: "First day, 2009" },
          },
          {
            heading: "Long distance",
            how: "One stop for every visit. Airports count.",
            borrow: { field: "fields.dates", line: "Gate 14, March" },
          },
          {
            heading: "Before a big day",
            how: "It ends on a countdown to what comes next.",
            borrow: { field: "countdown.label", line: "Until we’re a family of four" },
          },
          {
            heading: "A baby’s first year",
            how: "Month by month, then a line at the road’s end.",
            borrow: { field: "fields.ending", line: "…and you’ve only just started." },
          },
        ],
      },
      faq: [
        {
          q: "How many moments can a relationship timeline have?",
          a: "Between 2 and 20, one photo each. Every photo gets a screen of its own, with its label, its caption and the road drawn up to it.",
        },
        {
          q: "Do I need to remember the exact dates?",
          a: "No. Each label is free text up to 40 characters, so “Summer 2022” or “The first flat” both work, and an empty one reads “Chapter 3”. If your labels contain years, the cover shows the span, such as 2022 → 2026.",
        },
        {
          q: "Can I change the last line?",
          a: "Yes. It ends on “…and it’s only the beginning.” unless you write your own, up to 80 characters. A video, a countdown and your letter follow it.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué poner en una línea del tiempo de pareja",
        items: [
          {
            heading: "Un aniversario",
            how: "De dos a veinte fotos, cada una con su fecha.",
            borrow: { field: "fields.dates", line: "Junio de 2024" },
          },
          {
            heading: "Una boda",
            how: "Cierra el camino con el día de hoy, en una frase de 80 caracteres.",
            borrow: { field: "fields.ending", line: "…y hoy añadimos la siguiente." },
          },
          {
            heading: "Una graduación",
            how: "Empieza por el primer uniforme y acaba en la toga.",
            borrow: { field: "caption", line: "Primer día, 2009" },
          },
          {
            heading: "A distancia",
            how: "Una parada por cada visita. Los aeropuertos cuentan.",
            borrow: { field: "fields.dates", line: "Puerta 14, marzo" },
          },
          {
            heading: "Antes de un gran día",
            how: "Acaba en una cuenta atrás hacia lo que viene.",
            borrow: { field: "countdown.label", line: "Hasta que seamos cuatro" },
          },
          {
            heading: "El primer año de un bebé",
            how: "Mes a mes, y una frase al final del camino.",
            borrow: { field: "fields.ending", line: "…y esto solo acaba de empezar." },
          },
        ],
      },
      faq: [
        {
          q: "¿Cuántos momentos caben en una línea del tiempo de pareja?",
          a: "Entre 2 y 20, uno por foto. Cada foto tiene una pantalla para ella sola, con su rótulo, su pie y el camino dibujado hasta ahí.",
        },
        {
          q: "¿Hace falta recordar las fechas exactas?",
          a: "No. Cada rótulo es texto libre de hasta 40 caracteres, así que valen «Verano de 2022» o «El primer piso», y uno vacío pone «Capítulo 3». Si tus rótulos llevan años, la portada enseña los años que abarca, por ejemplo 2022 → 2026.",
        },
        {
          q: "¿Se puede cambiar la última frase?",
          a: "Sí. Termina en «…y esto solo es el principio.» salvo que escribas la tuya, de hasta 80 caracteres. Detrás van un vídeo, una cuenta atrás y tu carta.",
        },
      ],
    },
  },

  scrapbook: {
    en: {
      ideas: {
        title: "What to put in a digital scrapbook",
        items: [
          {
            heading: "An anniversary",
            how: "Say how long it’s been in the cut-out title, in 28 characters.",
            borrow: { field: "fields.headline", line: "a year of you two" },
          },
          {
            heading: "Their birthday",
            how: "The torn note is in handwriting, up to 90 characters.",
            borrow: { field: "fields.quote", line: "Twenty-six looks good on you." },
          },
          {
            heading: "A holiday",
            how: "Choose the Seaside pages for this one.",
            borrow: { field: "fields.headline", line: "that week by the sea" },
          },
          {
            heading: "Long distance",
            how: "Write what you kept from the last visit.",
            borrow: { field: "fields.quote", line: "I kept the train ticket. Obviously." },
          },
          {
            heading: "For a best friend",
            how: "Type where it started on the pinned note. It takes 40 characters.",
            borrow: { field: "fields.tag", line: "since the back row of maths" },
          },
          {
            heading: "Just because",
            how: "A typewritten letter from you comes near the end.",
            borrow: { field: "message", line: "No occasion. I just had the photos." },
          },
        ],
      },
      faq: [
        {
          q: "How many photos does a digital scrapbook hold?",
          a: "Up to twelve, and it opens with none. The first is the big polaroid, the next three make a photo-booth strip, the fifth is cut into a postage stamp and the rest run along a roll of film.",
        },
        {
          q: "Which photos show their captions?",
          a: "The first, handwritten under the polaroid, and those on the roll of film, in one line of small capitals. The booth strip and the stamp show the pictures alone.",
        },
        {
          q: "What are the five sets of pages?",
          a: "Blossom, Favorite person (in leopard print), Seaside, Sunshine and Memories (in black film). Each sets the paper, the cut-out letters and the flowers, and comes with a title and a torn note that you can replace with your own.",
        },
        {
          q: "How do I start a new line on the pinned note?",
          a: "Type a middle dot (·) where you want the break: “salt · sun · us” pins as three short lines. The note takes 40 characters in all.",
        },
      ],
    },
    es: {
      ideas: {
        title: "Qué poner en un álbum de recortes digital",
        items: [
          {
            heading: "Un aniversario",
            how: "Di cuánto lleváis en el título recortado, en 28 caracteres.",
            borrow: { field: "fields.headline", line: "un año de vosotros" },
          },
          {
            heading: "Su cumpleaños",
            how: "La nota rasgada va a mano, hasta 90 caracteres.",
            borrow: { field: "fields.quote", line: "Los veintiséis te quedan bien." },
          },
          {
            heading: "Unas vacaciones",
            how: "Elige las páginas de Playa.",
            borrow: { field: "fields.headline", line: "aquella semana de mar" },
          },
          {
            heading: "A distancia",
            how: "Escribe qué guardaste de la última visita.",
            borrow: { field: "fields.quote", line: "Guardé el billete de tren. Claro." },
          },
          {
            heading: "Para quien te conoce de siempre",
            how: "Escribe dónde empezó todo en la nota con chincheta. Admite 40 caracteres.",
            borrow: { field: "fields.tag", line: "desde la última fila de mates" },
          },
          {
            heading: "Porque sí",
            how: "Hacia el final llega tu carta, a máquina.",
            borrow: { field: "message", line: "Sin ocasión. Tenía las fotos y ya." },
          },
        ],
      },
      faq: [
        {
          q: "¿Cuántas fotos caben en un álbum de recortes digital?",
          a: "Hasta doce, y se abre también sin ninguna. La primera es la polaroid grande, las tres siguientes forman una tira de fotomatón, la quinta se recorta como un sello de correos y el resto va en un carrete.",
        },
        {
          q: "¿Qué fotos enseñan su pie?",
          a: "La primera, escrito a mano bajo la polaroid, y las del carrete, en una línea de mayúsculas pequeñas. La tira de fotomatón y el sello enseñan solo las imágenes.",
        },
        {
          q: "¿Cuáles son los cinco juegos de páginas?",
          a: "Flores, Persona favorita (con estampado de leopardo), Playa, Sol y Recuerdos (de película en negro). Cada uno pone el papel, las letras recortadas y las flores, y trae un título y una nota rasgada que puedes cambiar por los tuyos.",
        },
        {
          q: "¿Cómo se cambia de línea en la nota con chincheta?",
          a: "Escribe un punto medio (·) donde quieras el salto: «sal · sol · nosotros» sale en tres líneas cortas. La nota admite 40 caracteres en total.",
        },
      ],
    },
  },

  arcade: {
    en: {
      ideas: {
        title: "What to hide in a personalized arcade game",
        items: [
          {
            heading: "Their birthday",
            how: "Name the game after them and their age; each level clears a photo.",
            borrow: { field: "fields.title", line: "ANA TURNS 30" },
          },
          {
            heading: "Valentine’s Day",
            how: "Set hearts to fall and keep your message for the last level.",
            borrow: { field: "fields.title", line: "PLAYER TWO, FOR GOOD" },
          },
          {
            heading: "An anniversary",
            how: "One photo for each year, in order, each with its caption.",
            borrow: { field: "caption", line: "Level 3: the flat with no heating" },
          },
          {
            heading: "Before the real present",
            how: "The P.S. unlocks after the last level and your message. Hide the present first.",
            borrow: { field: "surprise.text", line: "Cheat code: look under the bed." },
          },
          {
            heading: "For someone who games",
            how: "The message appears after the last level, so make them earn it.",
            borrow: { field: "message", line: "You always let me win. I noticed." },
          },
          {
            heading: "Counting down to a trip",
            how: "Count down to take-off and label it like the next level.",
            borrow: { field: "countdown.label", line: "Next level: the airport" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué esconder en un videojuego personalizado",
        items: [
          {
            heading: "Su cumpleaños",
            how: "Ponle su nombre y su edad al juego; cada nivel descubre una foto.",
            borrow: { field: "fields.title", line: "ANA: NIVEL 30" },
          },
          {
            heading: "San Valentín",
            how: "Que caigan corazones y guarda tu mensaje para el último nivel.",
            borrow: { field: "fields.title", line: "MODO DOS, PARA SIEMPRE" },
          },
          {
            heading: "Un aniversario",
            how: "Una foto por cada año, en orden, cada una con su pie.",
            borrow: { field: "caption", line: "Nivel 3: el piso sin calefacción" },
          },
          {
            heading: "Antes del regalo de verdad",
            how: "La posdata se abre tras el último nivel y tu mensaje. Antes, esconde el regalo.",
            borrow: { field: "surprise.text", line: "Truco: mira debajo de la cama." },
          },
          {
            heading: "Para alguien que juega",
            how: "El mensaje sale tras el último nivel: que haya que ganárselo.",
            borrow: { field: "message", line: "Siempre me dejas ganar. Me he dado cuenta." },
          },
          {
            heading: "Cuenta atrás para un viaje",
            how: "Cuenta atrás hasta el despegue y titúlala como el siguiente nivel.",
            borrow: { field: "countdown.label", line: "Siguiente nivel: el aeropuerto" },
          },
        ],
      },
      faq: [],
    },
  },

  "autumn-reel": {
    en: {
      ideas: {
        title: "What to put on an autumn reel",
        items: [
          {
            heading: "An autumn anniversary",
            how: "Put the date you met on the ticket for two.",
            borrow: { field: "fields.ticket", line: "Admit two · 12 October" },
          },
          {
            heading: "The first cold week",
            how: "The cut-out words are one line. Make it an invitation.",
            borrow: { field: "fields.wish", line: "come home, I made soup" },
          },
          {
            heading: "A year in photos",
            how: "Up to ten photos, each on a frame of film with its caption.",
            borrow: { field: "caption", line: "The lake, before it rained" },
          },
          {
            heading: "A quiet Halloween",
            how: "Rust, espresso or olive: pick the one that looks like your October.",
            borrow: { field: "fields.wish", line: "you, me and one pumpkin" },
          },
          {
            heading: "Asking them out",
            how: "Ask in the letter. The P.S. holds the day, the film and the row.",
            borrow: { field: "surprise.text", line: "Sunday, the matinee, back row." },
          },
          {
            heading: "Just because it’s autumn",
            how: "The collage ends on your letter. Say what autumn does to you.",
            borrow: { field: "message", line: "I like you most in a big coat." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en un carrete de otoño",
        items: [
          {
            heading: "Un aniversario en otoño",
            how: "Pon en la entrada para dos la fecha en que os conocisteis.",
            borrow: { field: "fields.ticket", line: "Vale por dos · 12 octubre" },
          },
          {
            heading: "La primera semana de frío",
            how: "Las palabras recortadas son una línea. Que sea una invitación.",
            borrow: { field: "fields.wish", line: "ven a casa, he hecho sopa" },
          },
          {
            heading: "Un año en fotos",
            how: "Hasta diez fotos, cada una en un fotograma con su pie.",
            borrow: { field: "caption", line: "El lago, antes de la lluvia" },
          },
          {
            heading: "Un Halloween tranquilo",
            how: "Óxido, espresso u oliva: elige el que se parezca a vuestro octubre.",
            borrow: { field: "fields.wish", line: "tú, yo y una calabaza" },
          },
          {
            heading: "Para proponer un plan",
            how: "Pregunta en la carta. La posdata guarda el día, la peli y la fila.",
            borrow: { field: "surprise.text", line: "Domingo, sesión de tarde, última fila." },
          },
          {
            heading: "Porque es otoño",
            how: "El collage acaba en tu carta. Di qué te hace el otoño.",
            borrow: { field: "message", line: "Con abrigo me gustas todavía más." },
          },
        ],
      },
      faq: [],
    },
  },

  balloons: {
    en: {
      ideas: {
        title: "What to hide in virtual balloons",
        items: [
          {
            heading: "A big birthday",
            how: "Add their age and it floats in as gold foil numbers.",
            borrow: { field: "fields.banner", line: "THIRTY LOOKS GOOD ON YOU" },
          },
          {
            heading: "A child’s birthday",
            how: "Up to eight balloons, one photo in each. Pick Jewel tones.",
            borrow: { field: "fields.wall", line: "Seven today, taller tomorrow" },
          },
          {
            heading: "A parent’s birthday",
            how: "One photo per decade, with the year in the caption.",
            borrow: { field: "caption", line: "1994, the yellow kitchen" },
          },
          {
            heading: "A surprise party",
            how: "The last thing they read can be where to be, and when.",
            borrow: { field: "surprise.text", line: "The lemon tree place, Thursday, eight sharp." },
          },
          {
            heading: "A birthday you’ll miss",
            how: "The biggest balloon holds your letter. Say when you’ll make it up.",
            borrow: { field: "message", line: "I owe you a cake. In person." },
          },
          {
            heading: "Good news, any day",
            how: "The bunting spells whatever you write, up to 24 characters.",
            borrow: { field: "fields.banner", line: "YOU GOT THE JOB" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué esconder en unos globos virtuales",
        items: [
          {
            heading: "Un cumpleaños redondo",
            how: "Pon su edad y aparece en números dorados.",
            borrow: { field: "fields.banner", line: "LOS TREINTA TE SIENTAN" },
          },
          {
            heading: "El cumple de un peque",
            how: "Hasta ocho globos, una foto en cada uno. Elige Tonos joya.",
            borrow: { field: "fields.wall", line: "Hoy siete, mañana más alto" },
          },
          {
            heading: "El cumple de mamá o papá",
            how: "Una foto por década, con el año en el pie.",
            borrow: { field: "caption", line: "1994, la cocina amarilla" },
          },
          {
            heading: "Una fiesta sorpresa",
            how: "Lo último que leen puede ser dónde y a qué hora.",
            borrow: { field: "surprise.text", line: "Donde el limonero, el jueves a las ocho en punto." },
          },
          {
            heading: "Un cumple que te pierdes",
            how: "El globo más grande guarda tu carta. Di cuándo lo compensarás.",
            borrow: { field: "message", line: "Te debo una tarta. En persona." },
          },
          {
            heading: "Una buena noticia",
            how: "La guirnalda escribe lo que pongas, hasta 24 caracteres.",
            borrow: { field: "fields.banner", line: "EL PUESTO ES TUYO" },
          },
        ],
      },
      faq: [],
    },
  },

  "bat-swarm": {
    en: {
      ideas: {
        title: "What to spell in a bat swarm",
        items: [
          {
            heading: "Halloween night",
            how: "The bats spell their name, then your line of up to 14 characters.",
            borrow: { field: "fields.line", line: "be my boo" },
          },
          {
            heading: "Asking them to a party",
            how: "Put the question in the line and the details in the letter.",
            borrow: { field: "fields.line", line: "come with me?" },
          },
          {
            heading: "A Halloween date",
            how: "The where and when go in the P.S. Add what to bring.",
            borrow: { field: "surprise.text", line: "The roof at dusk on the 31st. Bring a blanket." },
          },
          {
            heading: "Long distance in October",
            how: "Your letter sits on dark glass under the moon. Say what you miss.",
            borrow: { field: "message", line: "Same moon. I checked." },
          },
          {
            heading: "Your Halloweens so far",
            how: "Up to eight photos hang in the moonlight, one per year.",
            borrow: { field: "caption", line: "2022, the bad vampire teeth" },
          },
          {
            heading: "For a friend who loves bats",
            how: "Choose the frost sky and keep the line to two words.",
            borrow: { field: "fields.line", line: "night owl" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué escribir con una bandada de murciélagos",
        items: [
          {
            heading: "La noche de Halloween",
            how: "Los murciélagos escriben su nombre y luego tu frase, de hasta 14 caracteres.",
            borrow: { field: "fields.line", line: "¿truco o beso?" },
          },
          {
            heading: "Para invitar a una fiesta",
            how: "Pon la pregunta en la frase y los detalles en la carta.",
            borrow: { field: "fields.line", line: "¿vienes?" },
          },
          {
            heading: "Una cita de Halloween",
            how: "El dónde y el cuándo van en la posdata. Añade qué llevar.",
            borrow: { field: "surprise.text", line: "En la azotea el 31, al anochecer. Trae manta." },
          },
          {
            heading: "A distancia en octubre",
            how: "Tu carta va sobre cristal oscuro, bajo la luna. Di qué echas de menos.",
            borrow: { field: "message", line: "La misma luna. Lo he comprobado." },
          },
          {
            heading: "Vuestros Halloween",
            how: "Hasta ocho fotos cuelgan a la luz de la luna, una por año.",
            borrow: { field: "caption", line: "2022, los colmillos de plástico" },
          },
          {
            heading: "Para quien adora los murciélagos",
            how: "Elige el cielo de escarcha y deja la frase en dos palabras.",
            borrow: { field: "fields.line", line: "ave nocturna" },
          },
        ],
      },
      faq: [],
    },
  },

  "be-my-boo": {
    en: {
      ideas: {
        title: "What to put in a be my boo card",
        items: [
          {
            heading: "Asking them to be yours",
            how: "The ghost holds up their name. Your words appear under it, heading the collage.",
            borrow: { field: "fields.sign", line: "will you be my boo?" },
          },
          {
            heading: "A first Halloween together",
            how: "The note is in handwriting. One line about this year.",
            borrow: { field: "fields.note", line: "First October with you. I like it here." },
          },
          {
            heading: "A pumpkin-carving date",
            how: "Give the hour in the P.S. and say who brings the pumpkins.",
            borrow: { field: "surprise.text", line: "Friday at 7: pumpkins, then a scary film." },
          },
          {
            heading: "Costumes through the years",
            how: "One polaroid per costume, with the year in the caption.",
            borrow: { field: "caption", line: "2023, two bad ghosts" },
          },
          {
            heading: "Long distance at Halloween",
            how: "Your letter waits at the end of the page.",
            borrow: { field: "message", line: "Save me a sweet. I’m coming." },
          },
          {
            heading: "For a best friend",
            how: "Pink, pumpkin or midnight. The words under their name take 24 characters.",
            borrow: { field: "fields.sign", line: "partner in crime" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en una tarjeta be my boo",
        items: [
          {
            heading: "Para pedirle salir",
            how: "El fantasma enseña su nombre. Tus palabras salen debajo, encabezando el collage.",
            borrow: { field: "fields.sign", line: "¿quieres ser mi boo?" },
          },
          {
            heading: "El primer Halloween en pareja",
            how: "La nota va escrita a mano. Una línea sobre este año.",
            borrow: { field: "fields.note", line: "Primer octubre contigo. Aquí se está bien." },
          },
          {
            heading: "Un plan de calabazas",
            how: "Pon la hora en la posdata y di quién lleva las calabazas.",
            borrow: { field: "surprise.text", line: "Viernes a las 19:00: calabazas y peli de miedo." },
          },
          {
            heading: "Los disfraces de cada año",
            how: "Una polaroid por disfraz, con el año en el pie.",
            borrow: { field: "caption", line: "2023, dos fantasmas malos" },
          },
          {
            heading: "Halloween a distancia",
            how: "Tu carta espera al final de la página.",
            borrow: { field: "message", line: "Guárdame un caramelo. Ya voy." },
          },
          {
            heading: "Para quien te conoce de siempre",
            how: "Rosa, calabaza o medianoche. Las palabras bajo su nombre admiten 24 caracteres.",
            borrow: { field: "fields.sign", line: "mi cómplice" },
          },
        ],
      },
      faq: [],
    },
  },

  "cap-toss": {
    en: {
      ideas: {
        title: "What to write in a digital graduation card",
        items: [
          {
            heading: "A university graduation",
            how: "The diploma says what it is awarded for, in your words.",
            borrow: { field: "fields.awardedFor", line: "four years of going back, and one very good dissertation" },
          },
          {
            heading: "Finishing school",
            how: "Year, school, and a line about what it took.",
            borrow: { field: "fields.awardedFor", line: "every early bus, and never once missing it" },
          },
          {
            heading: "From a proud parent",
            how: "Up to ten photos, taped on like a yearbook. Start with day one.",
            borrow: { field: "caption", line: "First day, the bag bigger than you" },
          },
          {
            heading: "A course or a certificate",
            how: "The school line takes 60 characters: the course fits.",
            borrow: { field: "fields.school", line: "Evening classes, Level 3 Accounting" },
          },
          {
            heading: "Before a first job",
            how: "Count down to nine o’clock on their first Monday.",
            borrow: { field: "countdown.label", line: "Until your first day" },
          },
          {
            heading: "With a present to find",
            how: "The P.S. says where the present is. Make them press and hold for it.",
            borrow: { field: "surprise.text", line: "Look in the boot of the car." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué escribir en una tarjeta de graduación digital",
        items: [
          {
            heading: "Una graduación universitaria",
            how: "El diploma dice por qué se concede, con tus palabras.",
            borrow: { field: "fields.awardedFor", line: "cuatro años de volver, y un trabajo final muy bueno" },
          },
          {
            heading: "El final del instituto",
            how: "Año, centro y una frase sobre lo que costó.",
            borrow: { field: "fields.awardedFor", line: "cada autobús de madrugada, sin perder ninguno" },
          },
          {
            heading: "De una madre o un padre",
            how: "Hasta diez fotos, pegadas como en un anuario. Empieza por el primer día.",
            borrow: { field: "caption", line: "Primer día, la mochila más grande que tú" },
          },
          {
            heading: "Un curso o un título",
            how: "La línea del centro admite 60 caracteres: cabe el curso.",
            borrow: { field: "fields.school", line: "Clases nocturnas, Contabilidad nivel 3" },
          },
          {
            heading: "Antes del primer trabajo",
            how: "Cuenta atrás hasta las nueve de su primer lunes.",
            borrow: { field: "countdown.label", line: "Hasta tu primer día" },
          },
          {
            heading: "Con un regalo escondido",
            how: "La posdata dice dónde está el regalo. Que tengan que mantener pulsado.",
            borrow: { field: "surprise.text", line: "Mira en el maletero del coche." },
          },
        ],
      },
      faq: [],
    },
  },

  cauldron: {
    en: {
      ideas: {
        title: "What to brew in a Halloween love potion",
        items: [
          {
            heading: "Halloween night",
            how: "Three jars, each labelled in your words: three things you love.",
            borrow: { field: "fields.ingredients", line: "a pinch of your laugh" },
          },
          {
            heading: "An October anniversary",
            how: "Put the number of years in the name on the bottle.",
            borrow: { field: "fields.potion", line: "Love Potion No. 3" },
          },
          {
            heading: "A Halloween date",
            how: "The potion is the invitation. The P.S. says whose kitchen, and when.",
            borrow: { field: "surprise.text", line: "My kitchen, Halloween night. Bring a spoon." },
          },
          {
            heading: "For a friend",
            how: "Make the ingredients in-jokes. Each one takes 34 characters.",
            borrow: { field: "fields.ingredients", line: "every 3am “you awake?”" },
          },
          {
            heading: "Long distance",
            how: "Your letter unrolls from the bottle once the cork pops.",
            borrow: { field: "message", line: "I’d drink this to be there tonight." },
          },
          {
            heading: "Halloweens so far",
            how: "Up to eight photos, kept in glass jars.",
            borrow: { field: "caption", line: "2021, the witch hat you lost" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué echar en una poción de amor de Halloween",
        items: [
          {
            heading: "La noche de Halloween",
            how: "Tres tarros, cada uno con tus palabras: tres cosas que te gustan.",
            borrow: { field: "fields.ingredients", line: "una pizca de tu risa" },
          },
          {
            heading: "Un aniversario en octubre",
            how: "Pon los años que lleváis en el nombre de la botella.",
            borrow: { field: "fields.potion", line: "Poción de amor n.º 3" },
          },
          {
            heading: "Una cita de Halloween",
            how: "La poción es la invitación. La posdata dice en qué cocina y cuándo.",
            borrow: { field: "surprise.text", line: "En mi cocina, la noche de Halloween. Trae cuchara." },
          },
          {
            heading: "Entre amigas y amigos",
            how: "Que los ingredientes sean bromas vuestras. Cada uno admite 34 caracteres.",
            borrow: { field: "fields.ingredients", line: "cada «¿sigues ahí?» a las 3" },
          },
          {
            heading: "A distancia",
            how: "Tu carta sale de la botella al saltar el corcho.",
            borrow: { field: "message", line: "Me la bebería por estar ahí esta noche." },
          },
          {
            heading: "Vuestros Halloween",
            how: "Hasta ocho fotos, guardadas en tarros de cristal.",
            borrow: { field: "caption", line: "2021, el sombrero que perdiste" },
          },
        ],
      },
      faq: [],
    },
  },

  coquette: {
    en: {
      ideas: {
        title: "What to put in a coquette gift",
        items: [
          {
            heading: "An anniversary",
            how: "The postcard under the first photo is handwritten. Say one thing you still do.",
            borrow: { field: "fields.note", line: "Two years and I still save you the window seat." },
          },
          {
            heading: "Valentine’s Day",
            how: "The ticket takes a date or a place.",
            borrow: { field: "fields.ticket", line: "Admit one · 14 February" },
          },
          {
            heading: "Her birthday",
            how: "The torn-out words sit by the photos. Three or four are enough.",
            borrow: { field: "fields.label", line: "birthday girl, all day" },
          },
          {
            heading: "Asking them out",
            how: "End on the P.S.: the day, the hour and what to wear.",
            borrow: { field: "surprise.text", line: "Friday, 7pm. Wear the pink dress." },
          },
          {
            heading: "For a best friend",
            how: "Up to ten polaroids, all the way down the page.",
            borrow: { field: "caption", line: "Us, before we could do eyeliner" },
          },
          {
            heading: "Just because",
            how: "Your letter waits at the bottom, on a sheet of torn paper.",
            borrow: { field: "message", line: "No reason. I just like you a lot." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en un regalo coquette",
        items: [
          {
            heading: "Un aniversario",
            how: "La postal bajo la primera foto va a mano. Di algo que sigues haciendo.",
            borrow: { field: "fields.note", line: "Dos años y te sigo guardando la ventanilla." },
          },
          {
            heading: "San Valentín",
            how: "El billete admite una fecha o un lugar.",
            borrow: { field: "fields.ticket", line: "Vale por uno · 14 febrero" },
          },
          {
            heading: "Su cumpleaños",
            how: "Las palabras recortadas van junto a las fotos. Con tres o cuatro basta.",
            borrow: { field: "fields.label", line: "hoy mandas tú, todo el día" },
          },
          {
            heading: "Para proponer un plan",
            how: "Acaba en la posdata: el día, la hora y qué ponerse.",
            borrow: { field: "surprise.text", line: "Viernes a las 19:00. Ponte algo rosa." },
          },
          {
            heading: "Para quien te conoce de siempre",
            how: "Hasta diez polaroids, a lo largo de toda la página.",
            borrow: { field: "caption", line: "Cuando aún no sabíamos maquillarnos" },
          },
          {
            heading: "Porque sí",
            how: "Tu carta espera al final, en una hoja de papel rasgado.",
            borrow: { field: "message", line: "Sin motivo. Me gustas mucho y ya." },
          },
        ],
      },
      faq: [],
    },
  },

  "dark-romance": {
    en: {
      ideas: {
        title: "What to put in a dark romance collage",
        items: [
          {
            heading: "An anniversary",
            how: "The cut-out letters take 18 characters: what you call them.",
            borrow: { field: "fields.headline", line: "my worst habit" },
          },
          {
            heading: "Valentine’s Day",
            how: "Your second photo is printed on a tarot card. Name the card.",
            borrow: { field: "fields.card", line: "The Lovers" },
          },
          {
            heading: "Halloween",
            how: "The torn-out words are the bet you’d make on the two of you.",
            borrow: { field: "fields.bet", line: "all in, every time" },
          },
          {
            heading: "A date night",
            how: "The P.S. is for the hour and the wine. Keep the place a secret.",
            borrow: { field: "surprise.text", line: "Nine sharp. The red wine is on me." },
          },
          {
            heading: "Long distance",
            how: "Your letter is at the bottom, under a wax seal.",
            borrow: { field: "message", line: "I’d cross worse than this for you." },
          },
          {
            heading: "For someone who hates pink",
            how: "Bordeaux, noir or parchment. Up to ten photos.",
            borrow: { field: "caption", line: "The night of the storm" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en un collage dark romance",
        items: [
          {
            heading: "Un aniversario",
            how: "Las letras recortadas admiten 18 caracteres: cómo le llamas.",
            borrow: { field: "fields.headline", line: "mi peor costumbre" },
          },
          {
            heading: "San Valentín",
            how: "Tu segunda foto sale en una carta del tarot. Ponle nombre.",
            borrow: { field: "fields.card", line: "Los Enamorados" },
          },
          {
            heading: "Halloween",
            how: "Las palabras recortadas son la apuesta que harías por vosotros.",
            borrow: { field: "fields.bet", line: "voy con todo, siempre" },
          },
          {
            heading: "Una noche de cita",
            how: "La posdata es para la hora y el vino. El sitio, ni mencionarlo.",
            borrow: { field: "surprise.text", line: "A las nueve en punto. El vino tinto lo llevo yo." },
          },
          {
            heading: "A distancia",
            how: "Tu carta está al final, bajo un sello de lacre.",
            borrow: { field: "message", line: "Por ti cruzaría cosas peores." },
          },
          {
            heading: "Para quien odia el rosa",
            how: "Burdeos, noir o pergamino. Hasta diez fotos.",
            borrow: { field: "caption", line: "La noche de la tormenta" },
          },
        ],
      },
      faq: [],
    },
  },

  digicam: {
    en: {
      ideas: {
        title: "What to put on a digicam gift",
        items: [
          {
            heading: "Their birthday",
            how: "Leave “It’s their birthday” on: the camera wishes them one when it turns on.",
            borrow: { field: "fields.headline", line: "birthday behaviour only" },
          },
          {
            heading: "A year of you two",
            how: "Up to twelve photos, each with the orange date in the corner.",
            borrow: { field: "caption", line: "we said one drink" },
          },
          {
            heading: "A night out to remember",
            how: "Load the camera roll in the order the night went.",
            borrow: { field: "caption", line: "02:14, still dancing" },
          },
          {
            heading: "A day out to plan",
            how: "The P.S. carries the meeting time. Tell them to charge the camera.",
            borrow: { field: "surprise.text", line: "Charge the camera. I’m outside at eleven." },
          },
          {
            heading: "For a best friend",
            how: "After the last photo the roll prints as a strip, then your letter.",
            borrow: { field: "message", line: "Never delete the blurry ones." },
          },
          {
            heading: "A holiday",
            how: "Set the date on the photos to the week you were away.",
            borrow: { field: "caption", line: "day 3, lost again" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en un regalo digicam",
        items: [
          {
            heading: "Su cumpleaños",
            how: "Deja marcado «Es su cumpleaños»: la cámara le felicita al encenderse.",
            borrow: { field: "fields.headline", line: "hoy se permite todo" },
          },
          {
            heading: "Un año de vosotros",
            how: "Hasta doce fotos, cada una con la fecha naranja en la esquina.",
            borrow: { field: "caption", line: "dijimos una caña" },
          },
          {
            heading: "Una noche para recordar",
            how: "Carga el carrete en el orden en que pasó la noche.",
            borrow: { field: "caption", line: "02:14, seguíamos bailando" },
          },
          {
            heading: "Para planear un día",
            how: "La posdata lleva la hora de quedar. Dile que cargue la cámara.",
            borrow: { field: "surprise.text", line: "Carga la cámara. A las once estoy abajo." },
          },
          {
            heading: "Para quien te conoce de siempre",
            how: "Tras la última foto el carrete se imprime en tira, y luego tu carta.",
            borrow: { field: "message", line: "No borres nunca las movidas." },
          },
          {
            heading: "Unas vacaciones",
            how: "Pon en las fotos la fecha de la semana que estuvisteis fuera.",
            borrow: { field: "caption", line: "día 3, otra vez sin rumbo" },
          },
        ],
      },
      faq: [],
    },
  },

  evergreen: {
    en: {
      ideas: {
        title: "What to put in a vintage collage gift",
        items: [
          {
            heading: "An anniversary",
            how: "Count the seasons across the top, in 22 characters.",
            borrow: { field: "fields.title", line: "four springs in" },
          },
          {
            heading: "Just because",
            how: "Your letter closes the collage. Three lines are plenty here.",
            borrow: { field: "message", line: "Thinking of you, for no reason." },
          },
          {
            heading: "For a parent",
            how: "Up to ten photos on white polaroids. Caption the garden ones.",
            borrow: { field: "caption", line: "Your roses, the good year" },
          },
          {
            heading: "A day out",
            how: "Two stops are enough for the P.S.: where first, and where after.",
            borrow: { field: "surprise.text", line: "Sunday: the botanical garden, then a picnic." },
          },
          {
            heading: "A thank-you",
            how: "Sage, olive or mint. Keep the title to two or three words.",
            borrow: { field: "fields.title", line: "thank you, truly" },
          },
          {
            heading: "Long distance",
            how: "Send the places you’ll show them when they visit.",
            borrow: { field: "caption", line: "The bench I told you about" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en un collage vintage de regalo",
        items: [
          {
            heading: "Un aniversario",
            how: "Cuenta las estaciones en las palabras de arriba, en 22 caracteres.",
            borrow: { field: "fields.title", line: "cuatro primaveras" },
          },
          {
            heading: "Porque sí",
            how: "Tu carta cierra el collage. Con tres líneas basta.",
            borrow: { field: "message", line: "Me acordé de ti, sin motivo." },
          },
          {
            heading: "Para tu madre o tu padre",
            how: "Hasta diez fotos en polaroids blancas. Pon pie a las del jardín.",
            borrow: { field: "caption", line: "Tus rosales, el año bueno" },
          },
          {
            heading: "Para planear un día",
            how: "Con dos paradas basta para la posdata: adónde primero y adónde después.",
            borrow: { field: "surprise.text", line: "Domingo: el jardín botánico y luego pícnic." },
          },
          {
            heading: "Para dar las gracias",
            how: "Salvia, oliva o menta. Deja el título en dos o tres palabras.",
            borrow: { field: "fields.title", line: "gracias, de verdad" },
          },
          {
            heading: "A distancia",
            how: "Envía los sitios que le enseñarás cuando venga.",
            borrow: { field: "caption", line: "El banco del que te hablé" },
          },
        ],
      },
      faq: [],
    },
  },

  "fall-for-you": {
    en: {
      ideas: {
        title: "What to put in a fall for you collage",
        items: [
          {
            heading: "An autumn anniversary",
            how: "The letter blocks spell up to 12 characters: a name or a date.",
            borrow: { field: "fields.blocks", line: "OCT 12" },
          },
          {
            heading: "A cosy night in",
            how: "The recipe card is for the two of you. Write the evening on it.",
            borrow: { field: "fields.note", line: "Soup, one blanket, the long film." },
          },
          {
            heading: "An autumn day out",
            how: "Name the place in the P.S., and the drink that comes after.",
            borrow: { field: "surprise.text", line: "First the orchard. Then cider, on me." },
          },
          {
            heading: "Halloween",
            how: "Choose cranberry or gingham. The tag takes 24 characters.",
            borrow: { field: "fields.tag", line: "my favourite pumpkin" },
          },
          {
            heading: "Long distance",
            how: "Describe your street in the letter, at the end of the collage.",
            borrow: { field: "message", line: "Leaves are falling here. Come see." },
          },
          {
            heading: "Just because",
            how: "Up to ten photos on polaroids.",
            borrow: { field: "caption", line: "The walk where we got lost" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en un collage de otoño contigo",
        items: [
          {
            heading: "Un aniversario en otoño",
            how: "Los bloques de letras escriben hasta 12 caracteres: un nombre o una fecha.",
            borrow: { field: "fields.blocks", line: "12 OCT" },
          },
          {
            heading: "Una noche en casa",
            how: "La ficha de receta es para vosotros. Escribe en ella la velada.",
            borrow: { field: "fields.note", line: "Sopa, una manta y la peli larga." },
          },
          {
            heading: "Un plan de otoño",
            how: "Di el sitio en la posdata, y lo que se bebe después.",
            borrow: { field: "surprise.text", line: "Primero el huerto. Luego sidra, invito yo." },
          },
          {
            heading: "Halloween",
            how: "Elige arándano o vichy. La etiqueta admite 24 caracteres.",
            borrow: { field: "fields.tag", line: "mi calabaza favorita" },
          },
          {
            heading: "A distancia",
            how: "Describe tu calle en la carta, al final del collage.",
            borrow: { field: "message", line: "Aquí ya caen las hojas. Ven a verlo." },
          },
          {
            heading: "Porque sí",
            how: "Hasta diez fotos en polaroids.",
            borrow: { field: "caption", line: "El paseo en que nos perdimos" },
          },
        ],
      },
      faq: [],
    },
  },

  "favorite-person": {
    en: {
      ideas: {
        title: "What to put in a gift for your favorite person",
        items: [
          {
            heading: "Just because",
            how: "The torn note takes 22 characters. Say who they are to you.",
            borrow: { field: "fields.title", line: "favorite person" },
          },
          {
            heading: "An anniversary",
            how: "Sign off under the flowers the way you end your texts, in 18 characters.",
            borrow: { field: "fields.signoff", line: "love you, still" },
          },
          {
            heading: "Valentine’s Day",
            how: "The P.S. is the plan: the morning first, lunch second.",
            borrow: { field: "surprise.text", line: "The flower market in the morning. Lunch after, my treat." },
          },
          {
            heading: "For a best friend",
            how: "Up to ten polaroids, held with gingham tape.",
            borrow: { field: "caption", line: "The haircut we don’t mention" },
          },
          {
            heading: "A thank-you",
            how: "Your letter is at the bottom of the page. Thank them for one day.",
            borrow: { field: "message", line: "You showed up. I won’t forget it." },
          },
          {
            heading: "For your mum",
            how: "Blush, lilac or peach. Start with the oldest photo you have.",
            borrow: { field: "caption", line: "You, at my age" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en un regalo para tu persona favorita",
        items: [
          {
            heading: "Porque sí",
            how: "La nota rasgada admite 22 caracteres. Di quién es para ti.",
            borrow: { field: "fields.title", line: "mi persona favorita" },
          },
          {
            heading: "Un aniversario",
            how: "Despídete bajo las flores como en tus mensajes, en 18 caracteres.",
            borrow: { field: "fields.signoff", line: "te quiero, aún" },
          },
          {
            heading: "San Valentín",
            how: "La posdata es el plan: primero la mañana, luego la comida.",
            borrow: { field: "surprise.text", line: "Por la mañana, el mercado de flores. Después invito a comer." },
          },
          {
            heading: "Para quien te conoce de siempre",
            how: "Hasta diez polaroids, sujetas con cinta de cuadros.",
            borrow: { field: "caption", line: "El corte de pelo innombrable" },
          },
          {
            heading: "Para dar las gracias",
            how: "Tu carta está al final de la página. Da las gracias por un día concreto.",
            borrow: { field: "message", line: "Estuviste ahí. No se me olvida." },
          },
          {
            heading: "Para tu madre",
            how: "Rosa, lila o melocotón. Empieza por la foto más antigua.",
            borrow: { field: "caption", line: "Tú, con mi edad" },
          },
        ],
      },
      faq: [],
    },
  },

  fireside: {
    en: {
      ideas: {
        title: "What to write in a letter by the fire",
        items: [
          {
            heading: "Christmas",
            how: "Choose snow outside the window. Your letter unfolds from the blanket.",
            borrow: { field: "message", line: "This year, I’m bringing the tree to you." },
          },
          {
            heading: "An anniversary",
            how: "The candle’s tag takes 24 characters: the date fits.",
            borrow: { field: "fields.tag", line: "since 14 November" },
          },
          {
            heading: "A weekend away",
            how: "The booking goes in the P.S. Say which day to pack for.",
            borrow: { field: "surprise.text", line: "Friday. The cabin with the wood burner." },
          },
          {
            heading: "Long distance",
            how: "Leaves or snow outside; cocoa, tea or coffee in the mug.",
            borrow: { field: "message", line: "I made two cups out of habit." },
          },
          {
            heading: "A thank-you",
            how: "Up to eight photos hang from a string on wooden pegs.",
            borrow: { field: "caption", line: "The week you looked after me" },
          },
          {
            heading: "Just because",
            how: "Amber, maple or moss, once the candle is lit.",
            borrow: { field: "fields.tag", line: "more evenings like this" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué escribir en una carta junto al fuego",
        items: [
          {
            heading: "Navidad",
            how: "Elige nieve tras la ventana. Tu carta sale de la manta.",
            borrow: { field: "message", line: "Este año te llevo yo el árbol." },
          },
          {
            heading: "Un aniversario",
            how: "La etiqueta de la vela admite 24 caracteres: cabe la fecha.",
            borrow: { field: "fields.tag", line: "desde el 14 de noviembre" },
          },
          {
            heading: "Una escapada",
            how: "La reserva va en la posdata. Di para qué día hay que hacer la maleta.",
            borrow: { field: "surprise.text", line: "Viernes. La cabaña con estufa de leña." },
          },
          {
            heading: "A distancia",
            how: "Hojas o nieve fuera; cacao, té o café en la taza.",
            borrow: { field: "message", line: "He hecho dos tazas por costumbre." },
          },
          {
            heading: "Para dar las gracias",
            how: "Hasta ocho fotos cuelgan de una cuerda con pinzas.",
            borrow: { field: "caption", line: "La semana que me cuidaste" },
          },
          {
            heading: "Porque sí",
            how: "Ámbar, arce o musgo, cuando la vela se enciende.",
            borrow: { field: "fields.tag", line: "más tardes así" },
          },
        ],
      },
      faq: [],
    },
  },

  "front-page": {
    en: {
      ideas: {
        title: "What to print on a personalized front page",
        items: [
          {
            heading: "A big birthday",
            how: "The headline takes 80 characters. Report it as news.",
            borrow: { field: "fields.headline", line: "LOCAL WOMAN TURNS 30, NATION REACTS" },
          },
          {
            heading: "A graduation",
            how: "Name the paper after them and put the degree in the headline.",
            borrow: { field: "fields.headline", line: "SHE DID IT: FOUR YEARS, ONE DEGREE" },
          },
          {
            heading: "Father’s Day",
            how: "Forecast his Sunday in the weather box, in 80 characters.",
            borrow: { field: "fields.weather", line: "Clear skies, with a 100% chance of a nap." },
          },
          {
            heading: "A wedding",
            how: "Put the date and place in the sub-headline.",
            borrow: { field: "fields.subhead", line: "Witnesses report dancing until the lights came on" },
          },
          {
            heading: "A retirement",
            how: "Write the classified ads: up to eight, 120 characters each.",
            borrow: { field: "fields.ads", line: "FOR SALE: one alarm clock, no longer needed." },
          },
          {
            heading: "Good news to share",
            how: "The horoscope can carry the news.",
            borrow: { field: "fields.horoscope", line: "A new address is in your stars. Keys on Friday." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué publicar en una portada personalizada",
        items: [
          {
            heading: "Un cumpleaños redondo",
            how: "El titular admite 80 caracteres. Cuéntalo como noticia.",
            borrow: { field: "fields.headline", line: "CUMPLE 30 Y EL BARRIO REACCIONA" },
          },
          {
            heading: "Una graduación",
            how: "Ponle su nombre al periódico y la carrera en el titular.",
            borrow: { field: "fields.headline", line: "LO HA HECHO: CUATRO AÑOS, UN TÍTULO" },
          },
          {
            heading: "El Día del Padre",
            how: "Pronostica su domingo en el recuadro del tiempo, en 80 caracteres.",
            borrow: { field: "fields.weather", line: "Cielo despejado y siesta asegurada." },
          },
          {
            heading: "Una boda",
            how: "Pon la fecha y el lugar en el subtítulo.",
            borrow: { field: "fields.subhead", line: "Testigos hablan de baile hasta que encendieron las luces" },
          },
          {
            heading: "Una jubilación",
            how: "Escribe los anuncios clasificados: hasta ocho, de 120 caracteres.",
            borrow: { field: "fields.ads", line: "SE VENDE: despertador, ya no hace falta." },
          },
          {
            heading: "Una buena noticia",
            how: "El horóscopo puede dar la noticia.",
            borrow: { field: "fields.horoscope", line: "Los astros anuncian casa nueva. Llaves el viernes." },
          },
        ],
      },
      faq: [],
    },
  },

  garden: {
    en: {
      ideas: {
        title: "What to plant in a digital garden gift",
        items: [
          {
            heading: "Mother’s Day",
            how: "The bouquet at the end is tagged for her, in up to 60 characters.",
            borrow: { field: "fields.tag", line: "For Mum, who grew all of us" },
          },
          {
            heading: "An anniversary",
            how: "Burn your count of summers into the gate’s sign: 24 characters.",
            borrow: { field: "fields.sign", line: "five summers of us" },
          },
          {
            heading: "Valentine’s Day",
            how: "Roses, peonies, wildflowers or sunflowers: pick what’s growing.",
            borrow: { field: "fields.tag", line: "Everything I planted is for you" },
          },
          {
            heading: "A thank-you",
            how: "Up to twelve photos are pinned to the trellis.",
            borrow: { field: "caption", line: "The summer you taught me to swim" },
          },
          {
            heading: "Just because",
            how: "Your letter waits on the potting table in the greenhouse.",
            borrow: { field: "message", line: "I saw tulips and thought of you." },
          },
          {
            heading: "For a new home",
            how: "A butterfly, a bee or a cat can come along.",
            borrow: { field: "fields.sign", line: "welcome home" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué plantar en un jardín digital de regalo",
        items: [
          {
            heading: "El Día de la Madre",
            how: "El ramo del final lleva su etiqueta, de hasta 60 caracteres.",
            borrow: { field: "fields.tag", line: "Para mamá, que nos hizo crecer" },
          },
          {
            heading: "Un aniversario",
            how: "Graba vuestros veranos en el cartel de la verja: 24 caracteres.",
            borrow: { field: "fields.sign", line: "cinco veranos de dos" },
          },
          {
            heading: "San Valentín",
            how: "Rosas, peonías, flores silvestres o girasoles: elige qué crece.",
            borrow: { field: "fields.tag", line: "Todo lo que planté es para ti" },
          },
          {
            heading: "Para dar las gracias",
            how: "Hasta doce fotos van colgadas en la celosía.",
            borrow: { field: "caption", line: "El verano en que me enseñaste a nadar" },
          },
          {
            heading: "Porque sí",
            how: "Tu carta espera en la mesa del invernadero.",
            borrow: { field: "message", line: "Vi tulipanes y me acordé de ti." },
          },
          {
            heading: "Para una casa nueva",
            how: "Puede acompañarles una mariposa, una abeja o un gato.",
            borrow: { field: "fields.sign", line: "ya estás en casa" },
          },
        ],
      },
      faq: [],
    },
  },

  "haunted-house": {
    en: {
      ideas: {
        title: "What to hide in a haunted house gift",
        items: [
          {
            heading: "A Halloween party invite",
            how: "The title shows over the house. Put the details in the letter.",
            borrow: { field: "title", line: "you’re invited" },
          },
          {
            heading: "Halloween night",
            how: "Dare them on the gate’s tag. It holds 18 characters.",
            borrow: { field: "fields.tag", line: "enter if you dare" },
          },
          {
            heading: "Halloweens so far",
            how: "Up to six photos, one behind each lit window.",
            borrow: { field: "caption", line: "2022, the cardboard coffin" },
          },
          {
            heading: "A scary film night",
            how: "The P.S. says whose sofa and what time. Don’t name the film.",
            borrow: { field: "surprise.text", line: "My sofa, tonight at ten. The film is chosen." },
          },
          {
            heading: "Long distance",
            how: "They knock, the door opens and your letter is there.",
            borrow: { field: "message", line: "Wish you were here to hide behind." },
          },
          {
            heading: "For a friend who loves horror",
            how: "Storm blue, blood moon, swamp green or midnight violet.",
            borrow: { field: "fields.tag", line: "final girl" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué esconder en una casa encantada",
        items: [
          {
            heading: "Una invitación de Halloween",
            how: "El título sale sobre la casa. Pon los detalles en la carta.",
            borrow: { field: "title", line: "tienes invitación" },
          },
          {
            heading: "La noche de Halloween",
            how: "Rétale desde la etiqueta de la verja. Caben 18 caracteres.",
            borrow: { field: "fields.tag", line: "pasa si te atreves" },
          },
          {
            heading: "Vuestros Halloween",
            how: "Hasta seis fotos, una tras cada ventana encendida.",
            borrow: { field: "caption", line: "2022, el ataúd de cartón" },
          },
          {
            heading: "Una noche de pelis de miedo",
            how: "La posdata dice en qué sofá y a qué hora. La peli no se dice.",
            borrow: { field: "surprise.text", line: "En mi sofá, esta noche a las diez. La peli ya está elegida." },
          },
          {
            heading: "A distancia",
            how: "Llaman, la puerta se abre y ahí está tu carta.",
            borrow: { field: "message", line: "Ojalá estuvieras aquí para esconderme." },
          },
          {
            heading: "Para quien adora el terror",
            how: "Azul tormenta, luna roja, verde pantano o violeta medianoche.",
            borrow: { field: "fields.tag", line: "siempre sobrevive" },
          },
        ],
      },
      faq: [],
    },
  },

  "jack-o-lantern": {
    en: {
      ideas: {
        title: "What to carve on a pumpkin with their name",
        items: [
          {
            heading: "Halloween night",
            how: "Their name is carved across it, or 12 characters of your own.",
            borrow: { field: "fields.carving", line: "MAYA" },
          },
          {
            heading: "Asking them out",
            how: "Carve the question. The details go in the letter.",
            borrow: { field: "fields.carving", line: "BE MINE?" },
          },
          {
            heading: "A first Halloween together",
            how: "The title sits above the pumpkin.",
            borrow: { field: "title", line: "carved just for you" },
          },
          {
            heading: "A pumpkin patch date",
            how: "The P.S. gives the hour. Say what happens after the patch.",
            borrow: { field: "surprise.text", line: "The patch at four. Carving at mine after." },
          },
          {
            heading: "For the kids",
            how: "Pick the cat face. Up to eight photos glow as candlelit polaroids.",
            borrow: { field: "caption", line: "The year you were a dinosaur" },
          },
          {
            heading: "Long distance",
            how: "Your letter opens once the candle is lit, on cream paper.",
            borrow: { field: "message", line: "I lit one for you here too." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué tallar en una calabaza con su nombre",
        items: [
          {
            heading: "La noche de Halloween",
            how: "Lleva tallado su nombre, o 12 caracteres que elijas.",
            borrow: { field: "fields.carving", line: "MAYA" },
          },
          {
            heading: "Para pedirle salir",
            how: "Talla la pregunta. Los detalles van en la carta.",
            borrow: { field: "fields.carving", line: "¿SALIMOS?" },
          },
          {
            heading: "El primer Halloween en pareja",
            how: "El título va sobre la calabaza.",
            borrow: { field: "title", line: "tallada solo para ti" },
          },
          {
            heading: "Un plan de calabazas",
            how: "La posdata da la hora. Cuenta qué viene después del huerto.",
            borrow: { field: "surprise.text", line: "A las cuatro en el huerto. Después, a tallar en mi casa." },
          },
          {
            heading: "Para los peques",
            how: "Elige la cara de gato. Hasta ocho fotos salen a la luz de la vela.",
            borrow: { field: "caption", line: "El año que fuiste dinosaurio" },
          },
          {
            heading: "A distancia",
            how: "Tu carta se abre al encenderse la vela, en papel crema.",
            borrow: { field: "message", line: "Aquí también he encendido una por ti." },
          },
        ],
      },
      faq: [],
    },
  },

  kawaii: {
    en: {
      ideas: {
        title: "What to put in a cute kawaii card",
        items: [
          {
            heading: "Their birthday",
            how: "The plushie says your line, up to 60 characters.",
            borrow: { field: "fields.greeting", line: "I have something for you" },
          },
          {
            heading: "Valentine’s Day",
            how: "Ask on the ribbon banner, in 24 characters or fewer.",
            borrow: { field: "fields.banner", line: "be mine, please" },
          },
          {
            heading: "Just because",
            how: "Your message is a handwritten note, taped at one corner.",
            borrow: { field: "message", line: "You looked sad, so here is a bunny." },
          },
          {
            heading: "For a best friend",
            how: "Up to eight photos, taped in like stickers.",
            borrow: { field: "caption", line: "Us, matching by accident" },
          },
          {
            heading: "Good luck",
            how: "A bunny, a bear or a kitten can say it.",
            borrow: { field: "fields.greeting", line: "you’ve got this" },
          },
          {
            heading: "With a plan",
            how: "Tell them when you’re picking them up in the P.S.",
            borrow: { field: "surprise.text", line: "I’m picking you up at six on Sunday." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en una tarjeta kawaii",
        items: [
          {
            heading: "Su cumpleaños",
            how: "El peluche dice tu frase, de hasta 60 caracteres.",
            borrow: { field: "fields.greeting", line: "tengo algo para ti" },
          },
          {
            heading: "San Valentín",
            how: "Pídeselo en la cinta, en 24 caracteres como mucho.",
            borrow: { field: "fields.banner", line: "¿te quedas conmigo?" },
          },
          {
            heading: "Porque sí",
            how: "Tu mensaje es una nota a mano, sujeta con cinta.",
            borrow: { field: "message", line: "Te vi triste, así que toma un conejito." },
          },
          {
            heading: "Para quien te conoce de siempre",
            how: "Hasta ocho fotos, pegadas como pegatinas.",
            borrow: { field: "caption", line: "Íbamos igual, sin querer" },
          },
          {
            heading: "Para desear suerte",
            how: "Puede decirlo un conejito, un osito o un gatito.",
            borrow: { field: "fields.greeting", line: "tú puedes con esto" },
          },
          {
            heading: "Con un plan",
            how: "Di en la posdata a qué hora pasas a recogerle.",
            borrow: { field: "surprise.text", line: "Paso a recogerte el domingo a las seis." },
          },
        ],
      },
      faq: [],
    },
  },

  keepsake: {
    en: {
      ideas: {
        title: "What to keep in a digital keepsake",
        items: [
          {
            heading: "An anniversary",
            how: "The locket opens on a tap. The engraving takes 18 characters.",
            borrow: { field: "fields.engraving", line: "since 2021" },
          },
          {
            heading: "Long distance",
            how: "Put a number on the ticket that only you two would know.",
            borrow: { field: "fields.ticket", line: "Platform 9 · 23:40" },
          },
          {
            heading: "Mother’s Day",
            how: "Up to nine photos. The first sits under dried flowers.",
            borrow: { field: "caption", line: "Your hands, my first steps" },
          },
          {
            heading: "Just because",
            how: "One word, torn out of a book.",
            borrow: { field: "fields.word", line: "finally" },
          },
          {
            heading: "A wedding day",
            how: "The P.S. comes in its own envelope.",
            borrow: { field: "surprise.text", line: "There’s a real one of these in the drawer." },
          },
          {
            heading: "For a grandparent",
            how: "Your letter is typed on aged paper, with the seal at the bottom.",
            borrow: { field: "message", line: "I kept the recipe card. All of them." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué guardar en un recuerdo digital",
        items: [
          {
            heading: "Un aniversario",
            how: "El relicario se abre con un toque. El grabado admite 18 caracteres.",
            borrow: { field: "fields.engraving", line: "desde 2021" },
          },
          {
            heading: "A distancia",
            how: "Pon en el billete un número que solo vosotros entendáis.",
            borrow: { field: "fields.ticket", line: "Andén 9 · 23:40" },
          },
          {
            heading: "El Día de la Madre",
            how: "Hasta nueve fotos. La primera va bajo flores secas.",
            borrow: { field: "caption", line: "Tus manos, mis primeros pasos" },
          },
          {
            heading: "Porque sí",
            how: "Una palabra, arrancada de un libro.",
            borrow: { field: "fields.word", line: "por fin" },
          },
          {
            heading: "El día de la boda",
            how: "La posdata llega en su propio sobre.",
            borrow: { field: "surprise.text", line: "Hay uno de verdad en el cajón." },
          },
          {
            heading: "Para tu abuela o tu abuelo",
            how: "Tu carta va a máquina en papel envejecido, con el sello al final.",
            borrow: { field: "message", line: "Guardé la receta. Todas." },
          },
        ],
      },
      faq: [],
    },
  },

  "midnight-countdown": {
    en: {
      ideas: {
        title: "What to put in a midnight countdown",
        items: [
          {
            heading: "Midnight on their birthday",
            how: "Write what the timer is counting to, above it, in 60 characters.",
            borrow: { field: "fields.headline", line: "Until you’re 30" },
          },
          {
            heading: "An anniversary",
            how: "The line at zero shows as the fireworks start.",
            borrow: { field: "fields.zeroLine", line: "Three years, as of right now." },
          },
          {
            heading: "Until you’re together again",
            how: "Count down to the minute you land.",
            borrow: { field: "fields.headline", line: "Until I land" },
          },
          {
            heading: "New Year’s Eve",
            how: "Set it to midnight. City, sea or mountains on the horizon.",
            borrow: { field: "fields.zeroLine", line: "Happy new year, Ana." },
          },
          {
            heading: "News on a set day",
            how: "Nothing unlocks before zero, so the news keeps.",
            borrow: { field: "fields.headline", line: "Until we can tell everyone" },
          },
          {
            heading: "A surprise trip",
            how: "Up to twenty photos unlock at zero.",
            borrow: { field: "caption", line: "Where we’re going, day one" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en una cuenta atrás de medianoche",
        items: [
          {
            heading: "Su cumpleaños a medianoche",
            how: "Escribe sobre el reloj hacia qué cuenta, en 60 caracteres.",
            borrow: { field: "fields.headline", line: "Hasta que cumplas 30" },
          },
          {
            heading: "Un aniversario",
            how: "La frase a cero aparece con los fuegos.",
            borrow: { field: "fields.zeroLine", line: "Tres años, desde ahora mismo." },
          },
          {
            heading: "Hasta volver a veros",
            how: "Cuenta atrás hasta el minuto en que aterrizas.",
            borrow: { field: "fields.headline", line: "Hasta que aterrice" },
          },
          {
            heading: "Nochevieja",
            how: "Ponla a medianoche. Ciudad, mar o montañas en el horizonte.",
            borrow: { field: "fields.zeroLine", line: "Feliz año nuevo, Ana." },
          },
          {
            heading: "Una noticia con fecha",
            how: "Nada se abre antes de cero: la noticia aguanta.",
            borrow: { field: "fields.headline", line: "Hasta poder contarlo" },
          },
          {
            heading: "Un viaje sorpresa",
            how: "Hasta veinte fotos se abren al llegar a cero.",
            borrow: { field: "caption", line: "Adonde vamos, primer día" },
          },
        ],
      },
      faq: [],
    },
  },

  museum: {
    en: {
      ideas: {
        title: "What to hang in a museum of us",
        items: [
          {
            heading: "An anniversary",
            how: "Name the exhibition. It takes 60 characters.",
            borrow: { field: "fields.exhibition", line: "Five Years: A Retrospective" },
          },
          {
            heading: "Mother’s Day",
            how: "Put her years on the plaques.",
            borrow: { field: "fields.years", line: "1996 to 2026" },
          },
          {
            heading: "Father’s Day",
            how: "Each caption is a plaque. Title his works.",
            borrow: { field: "caption", line: "Shed, mixed media, unfinished" },
          },
          {
            heading: "A wedding",
            how: "Two to twenty photos, room by room.",
            borrow: { field: "fields.exhibition", line: "The Early Works of Ana and Marco" },
          },
          {
            heading: "A retirement",
            how: "The last room is a wall text with your message.",
            borrow: { field: "message", line: "Forty years. The collection is complete." },
          },
          {
            heading: "A birthday",
            how: "One frame per year, with a line under each.",
            borrow: { field: "caption", line: "Age 7, front teeth missing" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué colgar en un museo de nosotros",
        items: [
          {
            heading: "Un aniversario",
            how: "Ponle nombre a la exposición. Admite 60 caracteres.",
            borrow: { field: "fields.exhibition", line: "Cinco años: una retrospectiva" },
          },
          {
            heading: "El Día de la Madre",
            how: "Pon sus años en las placas.",
            borrow: { field: "fields.years", line: "1996 a 2026" },
          },
          {
            heading: "El Día del Padre",
            how: "Cada pie es una placa. Ponles título a sus obras.",
            borrow: { field: "caption", line: "Cobertizo, técnica mixta, sin acabar" },
          },
          {
            heading: "Una boda",
            how: "De dos a veinte fotos, sala a sala.",
            borrow: { field: "fields.exhibition", line: "Primeras obras de Ana y Marco" },
          },
          {
            heading: "Una jubilación",
            how: "La última sala es un texto de pared con tu mensaje.",
            borrow: { field: "message", line: "Cuarenta años. La colección está completa." },
          },
          {
            heading: "Un cumpleaños",
            how: "Un marco por año, con una línea debajo.",
            borrow: { field: "caption", line: "A los 7, sin paletas" },
          },
        ],
      },
      faq: [],
    },
  },

  "music-box": {
    en: {
      ideas: {
        title: "What to put in a virtual music box",
        items: [
          {
            heading: "An anniversary",
            how: "Choose the two swans. Your letter lifts out as the tune slows.",
            borrow: { field: "message", line: "Five years, and I’d wind it again." },
          },
          {
            heading: "Mother’s Day",
            how: "Up to eight photos come up in the mirror, one per turn.",
            borrow: { field: "caption", line: "You, teaching me to dance" },
          },
          {
            heading: "Valentine’s Day",
            how: "Swan Lake, Brahms’ Lullaby or Für Elise.",
            borrow: { field: "message", line: "I’d dance badly with you anywhere." },
          },
          {
            heading: "A wedding",
            how: "Start with the oldest photo and end on the day itself.",
            borrow: { field: "caption", line: "The first dance, take two" },
          },
          {
            heading: "For a daughter",
            how: "Pick the ballerina and the lullaby.",
            borrow: { field: "message", line: "This played while you slept." },
          },
          {
            heading: "A night out",
            how: "The P.S. names the night. Say you’ve booked, and where to meet.",
            borrow: { field: "surprise.text", line: "Booked for Thursday. Meet me under the clock." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en una caja de música virtual",
        items: [
          {
            heading: "Un aniversario",
            how: "Elige los dos cisnes. Tu carta sale al apagarse la melodía.",
            borrow: { field: "message", line: "Cinco años, y le daría cuerda otra vez." },
          },
          {
            heading: "El Día de la Madre",
            how: "Hasta ocho fotos en el espejo, una por vuelta.",
            borrow: { field: "caption", line: "Tú, enseñándome a bailar" },
          },
          {
            heading: "San Valentín",
            how: "El lago de los cisnes, Canción de cuna de Brahms o Para Elisa.",
            borrow: { field: "message", line: "Bailaría mal contigo donde fuera." },
          },
          {
            heading: "Una boda",
            how: "De la primera foto al día mismo.",
            borrow: { field: "caption", line: "El primer baile, segundo intento" },
          },
          {
            heading: "Para una hija",
            how: "Elige la bailarina y la nana.",
            borrow: { field: "message", line: "Esto sonaba mientras dormías." },
          },
          {
            heading: "Una noche fuera",
            how: "La posdata dice qué noche y dónde quedáis.",
            borrow: { field: "surprise.text", line: "Reservado para el jueves. Nos vemos bajo el reloj." },
          },
        ],
      },
      faq: [],
    },
  },

  "on-repeat": {
    en: {
      ideas: {
        title: "What to put in a playlist gift",
        items: [
          {
            heading: "An anniversary",
            how: "Name the playlist after the year. It takes 24 characters.",
            borrow: { field: "fields.playlist", line: "songs from year one" },
          },
          {
            heading: "Just because",
            how: "Your captions become the song titles.",
            borrow: { field: "caption", line: "The one from the car" },
          },
          {
            heading: "Their birthday",
            how: "The note under the player is in handwriting.",
            borrow: { field: "fields.note", line: "Play this loud. It’s your day." },
          },
          {
            heading: "Concert tickets",
            how: "The tickets go in the P.S. Don’t name the band before it.",
            borrow: { field: "surprise.text", line: "Friday night. I got us tickets." },
          },
          {
            heading: "Long distance",
            how: "Up to ten photos on the playlist, one per song.",
            borrow: { field: "fields.playlist", line: "for the train to you" },
          },
          {
            heading: "For a friend",
            how: "Sunset, lilac or night for the sky.",
            borrow: { field: "fields.note", line: "You’d hate track 4. It stays." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en un regalo de playlist",
        items: [
          {
            heading: "Un aniversario",
            how: "Ponle a la playlist el nombre del año. Admite 24 caracteres.",
            borrow: { field: "fields.playlist", line: "canciones del primer año" },
          },
          {
            heading: "Porque sí",
            how: "Tus pies de foto son los títulos de las canciones.",
            borrow: { field: "caption", line: "La que sonaba en el coche" },
          },
          {
            heading: "Su cumpleaños",
            how: "La nota bajo el reproductor va escrita a mano.",
            borrow: { field: "fields.note", line: "Ponla alta. Hoy es tu día." },
          },
          {
            heading: "Entradas para un concierto",
            how: "Las entradas van en la posdata. No digas el grupo antes.",
            borrow: { field: "surprise.text", line: "Viernes noche. Tengo entradas." },
          },
          {
            heading: "A distancia",
            how: "Hasta diez fotos en la playlist, una por canción.",
            borrow: { field: "fields.playlist", line: "para el tren hacia ti" },
          },
          {
            heading: "Entre amigas y amigos",
            how: "Atardecer, lila o noche para el cielo.",
            borrow: { field: "fields.note", line: "La 4 no te va a gustar. Se queda." },
          },
        ],
      },
      faq: [],
    },
  },

  "pack-your-bags": {
    en: {
      ideas: {
        title: "What to pack in a surprise trip reveal",
        items: [
          {
            heading: "An anniversary trip",
            how: "Up to five clues, one luggage tag each.",
            borrow: { field: "fields.clues", line: "the white linen shirt" },
          },
          {
            heading: "A birthday trip",
            how: "Start vague. The board gives it away at the end.",
            borrow: { field: "fields.clues", line: "something warm for the evenings" },
          },
          {
            heading: "A weekend away",
            how: "Plane, train or road trip. The date goes on the ticket.",
            borrow: { field: "fields.when", line: "Fri 16 Oct" },
          },
          {
            heading: "A honeymoon",
            how: "Count down to take-off. Left empty, the ticket’s date comes from it.",
            borrow: { field: "countdown.label", line: "Until we fly" },
          },
          {
            heading: "Coming to visit",
            how: "Make your own city the destination.",
            borrow: { field: "fields.clues", line: "nothing: I’m bringing it all" },
          },
          {
            heading: "A family holiday",
            how: "When they tear off the stub, your letter is underneath.",
            borrow: { field: "message", line: "Passports are in the drawer. All four." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué meter en la maleta de un viaje sorpresa",
        items: [
          {
            heading: "Un viaje de aniversario",
            how: "Hasta cinco pistas, una etiqueta de maleta cada una.",
            borrow: { field: "fields.clues", line: "la camisa blanca de lino" },
          },
          {
            heading: "Un viaje de cumpleaños",
            how: "Empieza sin concretar. El panel lo desvela al final.",
            borrow: { field: "fields.clues", line: "algo de abrigo para la noche" },
          },
          {
            heading: "Una escapada",
            how: "Avión, tren o en coche. La fecha va en el billete.",
            borrow: { field: "fields.when", line: "Vie 16 oct" },
          },
          {
            heading: "Una luna de miel",
            how: "Cuenta atrás hasta el despegue. Si no pones fecha, el billete usa esa.",
            borrow: { field: "countdown.label", line: "Hasta que volemos" },
          },
          {
            heading: "Una visita",
            how: "Que el destino seas tú.",
            borrow: { field: "fields.clues", line: "nada: lo llevo todo yo" },
          },
          {
            heading: "Unas vacaciones en familia",
            how: "Al arrancar el resguardo, tu carta está debajo.",
            borrow: { field: "message", line: "Los pasaportes están en el cajón. Los cuatro." },
          },
        ],
      },
      faq: [],
    },
  },

  "paper-crane": {
    en: {
      ideas: {
        title: "What to say in a paper crane message",
        items: [
          {
            heading: "Saying sorry",
            how: "Up to six folds, one line each. Say what you did first.",
            borrow: { field: "fields.lines", line: "I was wrong about Thursday, and I knew it." },
          },
          {
            heading: "Giving them time",
            how: "The line left behind stays after the crane flies off.",
            borrow: { field: "fields.closing", line: "Whenever you’re ready. Not a day before." },
          },
          {
            heading: "Long distance",
            how: "One fold for each thing you miss.",
            borrow: { field: "fields.lines", line: "I miss the noise you make cooking." },
          },
          {
            heading: "Something hard to say",
            how: "It takes patience to fold, so each line gets read.",
            borrow: { field: "fields.lines", line: "I should have told you in March." },
          },
          {
            heading: "Get well soon",
            how: "Short lines. They can tap to fold if holding is too much.",
            borrow: { field: "fields.lines", line: "One fold a day. That’s all." },
          },
          {
            heading: "Just because",
            how: "Ivory, blush, sage or slate paper.",
            borrow: { field: "fields.closing", line: "I folded this thinking of you." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué decir con una grulla de papel",
        items: [
          {
            heading: "Para pedir perdón",
            how: "Hasta seis pliegues, una frase cada uno. Di primero qué hiciste.",
            borrow: { field: "fields.lines", line: "Me equivoqué el jueves, y lo sabía." },
          },
          {
            heading: "Para dar tiempo",
            how: "La frase que se queda sigue ahí cuando la grulla se va.",
            borrow: { field: "fields.closing", line: "Cuando quieras. Ni un día antes." },
          },
          {
            heading: "A distancia",
            how: "Un pliegue por cada cosa que echas de menos.",
            borrow: { field: "fields.lines", line: "Echo de menos tu ruido al cocinar." },
          },
          {
            heading: "Algo difícil de decir",
            how: "Doblarla pide paciencia: cada frase se lee.",
            borrow: { field: "fields.lines", line: "Tenía que habértelo dicho en marzo." },
          },
          {
            heading: "Para una pronta mejoría",
            how: "Frases cortas. Pueden tocar para doblar si sujetar cuesta.",
            borrow: { field: "fields.lines", line: "Un pliegue al día. Nada más." },
          },
          {
            heading: "Porque sí",
            how: "Papel marfil, rosa palo, salvia o pizarra.",
            borrow: { field: "fields.closing", line: "La doblé pensando en ti." },
          },
        ],
      },
      faq: [],
    },
  },

  "party-animals": {
    en: {
      ideas: {
        title: "What to put in a funny birthday card",
        items: [
          {
            heading: "A best friend’s birthday",
            how: "Give the animals your in-jokes to yell: ten shouts, 40 characters each.",
            borrow: { field: "fields.shouts", line: "i was told there’d be cake" },
          },
          {
            heading: "A big birthday",
            how: "Their age shows in foil balloons and in candles on the cake.",
            borrow: { field: "fields.banner", line: "ANA IS 30" },
          },
          {
            heading: "From the whole office",
            how: "Give each animal a colleague’s line.",
            borrow: { field: "fields.shouts", line: "who ate my yoghurt, ana" },
          },
          {
            heading: "A sibling’s birthday",
            how: "Use the things you’d never say nicely.",
            borrow: { field: "fields.shouts", line: "older than the wifi" },
          },
          {
            heading: "A birthday you’ll miss",
            how: "Write what you’d say in person under the second photo, up to 18 characters.",
            borrow: { field: "fields.word", line: "wish I was there" },
          },
          {
            heading: "With a present to find",
            how: "Hide the present first, then give directions in the P.S.",
            borrow: { field: "surprise.text", line: "Look under your pillow. The other one." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en una tarjeta de cumpleaños divertida",
        items: [
          {
            heading: "Un cumple entre amigas y amigos",
            how: "Dales a los animales vuestras bromas: diez gritos, de 40 caracteres.",
            borrow: { field: "fields.shouts", line: "me dijeron que habría tarta" },
          },
          {
            heading: "Un cumpleaños redondo",
            how: "Su edad sale en globos y en las velas de la tarta.",
            borrow: { field: "fields.banner", line: "ANA CUMPLE 30" },
          },
          {
            heading: "De toda la oficina",
            how: "Dale a cada animal la frase de alguien del equipo.",
            borrow: { field: "fields.shouts", line: "quién se comió mi yogur, ana" },
          },
          {
            heading: "Un cumple entre hermanos",
            how: "Usa lo que jamás dirías con cariño.",
            borrow: { field: "fields.shouts", line: "más mayor que el wifi" },
          },
          {
            heading: "Un cumple que te pierdes",
            how: "Escribe bajo la segunda foto lo que dirías en persona, hasta 18 caracteres.",
            borrow: { field: "fields.word", line: "ojalá estar ahí" },
          },
          {
            heading: "Con un regalo escondido",
            how: "Primero esconde el regalo; después da las señas en la posdata.",
            borrow: { field: "surprise.text", line: "Mira bajo tu almohada. La otra." },
          },
        ],
      },
      faq: [],
    },
  },

  passport: {
    en: {
      ideas: {
        title: "What to stamp in a long-distance passport",
        items: [
          {
            heading: "Long distance",
            how: "Give them a nationality that is about the two of you, in 40 characters.",
            borrow: { field: "fields.nationality", line: "Citizen of wherever you are" },
          },
          {
            heading: "Before a visit",
            how: "Set the countdown to touchdown, in the time zone you land in.",
            borrow: { field: "countdown.label", line: "Until wheels down" },
          },
          {
            heading: "An anniversary",
            how: "One stamp for each photo, up to ten.",
            borrow: { field: "caption", line: "Lisbon, the wrong tram" },
          },
          {
            heading: "Places you’ve met halfway",
            how: "Add up to six stopovers on the route.",
            borrow: { field: "fields.stops", line: "Lisbon" },
          },
          {
            heading: "Moving to be together",
            how: "Save the one-way ticket for the P.S., after your message.",
            borrow: { field: "surprise.text", line: "It’s a one-way ticket this time." },
          },
          {
            heading: "For a friend abroad",
            how: "The visa page reveals your message.",
            borrow: { field: "message", line: "Valid for visits, any time, no notice." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué sellar en un pasaporte a distancia",
        items: [
          {
            heading: "A distancia",
            how: "Dale una nacionalidad que hable de vosotros, en 40 caracteres.",
            borrow: { field: "fields.nationality", line: "Ciudadanía: donde estés tú" },
          },
          {
            heading: "Antes de una visita",
            how: "Pon la cuenta atrás en el aterrizaje, en la zona horaria de llegada.",
            borrow: { field: "countdown.label", line: "Hasta tocar pista" },
          },
          {
            heading: "Un aniversario",
            how: "Un sello por cada foto, hasta diez.",
            borrow: { field: "caption", line: "Lisboa, el tranvía equivocado" },
          },
          {
            heading: "Donde os habéis encontrado",
            how: "Añade hasta seis escalas en la ruta.",
            borrow: { field: "fields.stops", line: "Lisboa" },
          },
          {
            heading: "Mudarse para estar cerca",
            how: "Guarda el billete de ida para la posdata, tras tu mensaje.",
            borrow: { field: "surprise.text", line: "Esta vez el billete es solo de ida." },
          },
          {
            heading: "Para quien vive lejos",
            how: "La página del visado muestra tu mensaje.",
            borrow: { field: "message", line: "Válido para visitas, sin avisar." },
          },
        ],
      },
      faq: [],
    },
  },

  "photo-booth": {
    en: {
      ideas: {
        title: "What to put in a photo booth strip",
        items: [
          {
            heading: "Valentine’s Day",
            how: "Your line is written in pen on the wall of love letters.",
            borrow: { field: "fields.line", line: "my favourite blur" },
          },
          {
            heading: "An anniversary",
            how: "Light up your years on the sign over the booth, in 24 characters.",
            borrow: { field: "fields.sign", line: "4 YEARS · 4 POSES" },
          },
          {
            heading: "Just because",
            how: "Colour, black and white, or sepia for the strip.",
            borrow: { field: "caption", line: "The face you make at 2am" },
          },
          {
            heading: "A night out",
            how: "The P.S. takes the plan. Promise a real booth at the end of it.",
            borrow: { field: "surprise.text", line: "Drinks at eight, then a real photo booth." },
          },
          {
            heading: "For a best friend",
            how: "Each flash freezes one photo in the booth’s mirror.",
            borrow: { field: "fields.line", line: "worst photos, best night" },
          },
          {
            heading: "Long distance",
            how: "Your letter is on lined paper, in handwriting.",
            borrow: { field: "message", line: "Next strip, we’re both in it." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en una tira de fotomatón",
        items: [
          {
            heading: "San Valentín",
            how: "Tu frase va a boli en el muro de cartas de amor.",
            borrow: { field: "fields.line", line: "mi foto movida favorita" },
          },
          {
            heading: "Un aniversario",
            how: "Enciende vuestros años en el letrero del fotomatón, en 24 caracteres.",
            borrow: { field: "fields.sign", line: "4 AÑOS · 4 POSES" },
          },
          {
            heading: "Porque sí",
            how: "Color, blanco y negro o sepia para la tira.",
            borrow: { field: "caption", line: "La cara que pones a las 2" },
          },
          {
            heading: "Una noche fuera",
            how: "La posdata lleva el plan. Promete un fotomatón de verdad al final.",
            borrow: { field: "surprise.text", line: "A las ocho, algo de beber. Luego, un fotomatón de verdad." },
          },
          {
            heading: "Para quien te conoce de siempre",
            how: "Cada flash congela una foto en el espejo.",
            borrow: { field: "fields.line", line: "peores fotos, mejor noche" },
          },
          {
            heading: "A distancia",
            how: "Tu carta va en papel rayado, escrita a mano.",
            borrow: { field: "message", line: "En la próxima tira salimos los dos." },
          },
        ],
      },
      faq: [],
    },
  },

  picnic: {
    en: {
      ideas: {
        title: "What to pack in a picnic of love notes",
        items: [
          {
            heading: "Just because",
            how: "Tag the small things they do. Eight tags, 48 characters each.",
            borrow: { field: "fields.labels", line: "the way you eat the strawberries first" },
          },
          {
            heading: "An anniversary",
            how: "One tag for each year.",
            borrow: { field: "fields.labels", line: "year two: you learned to cook" },
          },
          {
            heading: "Their birthday",
            how: "Tag the things they love.",
            borrow: { field: "fields.labels", line: "the playlist only you defend" },
          },
          {
            heading: "Asking them on a date",
            how: "The last thing out is a folded note with your letter.",
            borrow: { field: "message", line: "Saturday. I’m bringing the blanket." },
          },
          {
            heading: "The first warm day",
            how: "Up to six photos come out in gingham frames.",
            borrow: { field: "caption", line: "Last summer, the same hill" },
          },
          {
            heading: "For your mum",
            how: "Pink, blue, red or lilac for the blanket.",
            borrow: { field: "fields.labels", line: "you always packed too much" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué meter en un pícnic de notas de amor",
        items: [
          {
            heading: "Porque sí",
            how: "Etiqueta sus pequeñas manías. Ocho etiquetas, de 48 caracteres.",
            borrow: { field: "fields.labels", line: "cómo te comes las fresas primero" },
          },
          {
            heading: "Un aniversario",
            how: "Una etiqueta por cada año.",
            borrow: { field: "fields.labels", line: "año dos: aprendiste a cocinar" },
          },
          {
            heading: "Su cumpleaños",
            how: "Etiqueta lo que le gusta.",
            borrow: { field: "fields.labels", line: "la playlist que solo tú defiendes" },
          },
          {
            heading: "Para proponer una cita",
            how: "Lo último que sale es una nota doblada con tu carta.",
            borrow: { field: "message", line: "Sábado. La manta la llevo yo." },
          },
          {
            heading: "El primer día de calor",
            how: "Hasta seis fotos salen en marcos de cuadros.",
            borrow: { field: "caption", line: "El verano pasado, la misma colina" },
          },
          {
            heading: "Para tu madre",
            how: "Rosa, azul, roja o lila para la manta.",
            borrow: { field: "fields.labels", line: "siempre llevabas de más" },
          },
        ],
      },
      faq: [],
    },
  },

  "popup-card": {
    en: {
      ideas: {
        title: "What to write in a digital pop-up card",
        items: [
          {
            heading: "Their birthday",
            how: "Their age goes on the cake’s topper. The pennants take 20 characters.",
            borrow: { field: "fields.banner", line: "HAPPY 30TH ANA" },
          },
          {
            heading: "Mother’s Day",
            how: "Your letter is inside the lid, in handwriting.",
            borrow: { field: "message", line: "You never once forgot the candles." },
          },
          {
            heading: "A child’s birthday",
            how: "They light the candles with a tap and blow them out.",
            borrow: { field: "fields.banner", line: "SIX TODAY" },
          },
          {
            heading: "From the whole family",
            how: "Up to eight photos hang on pegs behind the letter.",
            borrow: { field: "caption", line: "Dad, holding the cake badly" },
          },
          {
            heading: "With a present to find",
            how: "The P.S. sends them to the hiding place. Keep the walk short.",
            borrow: { field: "surprise.text", line: "Look under the plant pot by the door." },
          },
          {
            heading: "A belated birthday",
            how: "Vanilla, midnight, kraft or cherry paper.",
            borrow: { field: "message", line: "Late, but I lit every candle." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué escribir en una tarjeta pop-up digital",
        items: [
          {
            heading: "Su cumpleaños",
            how: "Su edad va en lo alto de la tarta. Los banderines admiten 20 caracteres.",
            borrow: { field: "fields.banner", line: "FELICES 30, ANA" },
          },
          {
            heading: "El Día de la Madre",
            how: "Tu carta va dentro de la tapa, escrita a mano.",
            borrow: { field: "message", line: "Nunca te olvidaste de las velas." },
          },
          {
            heading: "El cumple de un peque",
            how: "Encienden las velas con un toque y las apagan soplando.",
            borrow: { field: "fields.banner", line: "HOY SEIS" },
          },
          {
            heading: "De toda la familia",
            how: "Hasta ocho fotos cuelgan con pinzas tras la carta.",
            borrow: { field: "caption", line: "Papá, sujetando mal la tarta" },
          },
          {
            heading: "Con un regalo escondido",
            how: "La posdata le manda al escondite. Que el paseo sea corto.",
            borrow: { field: "surprise.text", line: "Mira bajo la maceta de la puerta." },
          },
          {
            heading: "Un cumpleaños con retraso",
            how: "Papel vainilla, medianoche, kraft o cereza.",
            borrow: { field: "message", line: "Tarde, pero encendí todas las velas." },
          },
        ],
      },
      faq: [],
    },
  },

  "recipe-box": {
    en: {
      ideas: {
        title: "What to write in a family recipe box",
        items: [
          {
            heading: "Mother’s Day",
            how: "Measure her out: up to six ingredients, 64 characters each.",
            borrow: { field: "fields.ingredients", line: "two cups of patience" },
          },
          {
            heading: "Her birthday",
            how: "Name the recipe after her.",
            borrow: { field: "fields.recipeName", line: "Mum, from scratch" },
          },
          {
            heading: "For a grandmother",
            how: "Finish “Makes one…” with her house, in 90 characters.",
            borrow: { field: "fields.makes", line: "Makes one house that always smelled of something." },
          },
          {
            heading: "For your dad",
            how: "Write his kitchen, not hers.",
            borrow: { field: "fields.ingredients", line: "one burnt pan, every Sunday" },
          },
          {
            heading: "Sunday lunch",
            how: "The P.S. is the invitation: the day, the hour and who cooks.",
            borrow: { field: "surprise.text", line: "Sunday, one o’clock. I’m cooking." },
          },
          {
            heading: "A thank-you",
            how: "The card turns over into your letter, photos clipped to it.",
            borrow: { field: "caption", line: "The kitchen table, 1998" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué escribir en una caja de recetas familiar",
        items: [
          {
            heading: "El Día de la Madre",
            how: "Mídela en tazas y pizcas: hasta seis ingredientes, de 64 caracteres.",
            borrow: { field: "fields.ingredients", line: "dos tazas de paciencia" },
          },
          {
            heading: "Su cumpleaños",
            how: "Ponle su nombre a la receta.",
            borrow: { field: "fields.recipeName", line: "Mamá, desde cero" },
          },
          {
            heading: "Para tu abuela",
            how: "Termina «Sale una…» con su casa, en 90 caracteres.",
            borrow: { field: "fields.makes", line: "Sale una casa que siempre olía a algo rico." },
          },
          {
            heading: "Para tu padre",
            how: "Escribe su cocina, no la de otra persona.",
            borrow: { field: "fields.ingredients", line: "una sartén quemada cada domingo" },
          },
          {
            heading: "La comida del domingo",
            how: "La posdata es la invitación: el día, la hora y quién cocina.",
            borrow: { field: "surprise.text", line: "Domingo a la una. Cocino yo." },
          },
          {
            heading: "Para dar las gracias",
            how: "La ficha se da la vuelta y sale tu carta, con las fotos prendidas.",
            borrow: { field: "caption", line: "La mesa de la cocina, 1998" },
          },
        ],
      },
      faq: [],
    },
  },

  seance: {
    en: {
      ideas: {
        title: "What to spell out in a séance",
        items: [
          {
            heading: "Halloween night",
            how: "The spirit spells up to 22 characters, letter by letter.",
            borrow: { field: "fields.spell", line: "stay with me" },
          },
          {
            heading: "Asking them out",
            how: "Let the board ask for you.",
            borrow: { field: "fields.spell", line: "be my date" },
          },
          {
            heading: "A Halloween party invite",
            how: "The title shows before they touch the planchette.",
            borrow: { field: "title", line: "someone is trying to reach you" },
          },
          {
            heading: "A night in",
            how: "The board asks. The P.S. answers with the hour and the address.",
            borrow: { field: "surprise.text", line: "Midnight, 14 Elm Street. Knock twice." },
          },
          {
            heading: "Long distance",
            how: "Candle, moonlight, blood moon or graveyard green.",
            borrow: { field: "fields.spell", line: "i miss you" },
          },
          {
            heading: "For a friend who loves ghosts",
            how: "Up to eight photos develop out of the mist.",
            borrow: { field: "caption", line: "Proof we were there" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué deletrear en una sesión espiritista",
        items: [
          {
            heading: "La noche de Halloween",
            how: "El espíritu deletrea hasta 22 caracteres, letra a letra.",
            borrow: { field: "fields.spell", line: "quédate conmigo" },
          },
          {
            heading: "Para pedirle salir",
            how: "Que lo pregunte el tablero.",
            borrow: { field: "fields.spell", line: "sal conmigo" },
          },
          {
            heading: "Una invitación de Halloween",
            how: "El título sale antes de tocar la plancheta.",
            borrow: { field: "title", line: "alguien intenta contactar contigo" },
          },
          {
            heading: "Una noche en casa",
            how: "El tablero pregunta. La posdata responde con la hora y la dirección.",
            borrow: { field: "surprise.text", line: "A medianoche, calle del Olmo, 14. Llama dos veces." },
          },
          {
            heading: "A distancia",
            how: "Vela, luz de luna, luna de sangre o verde cementerio.",
            borrow: { field: "fields.spell", line: "te echo de menos" },
          },
          {
            heading: "Para quien adora los fantasmas",
            how: "Hasta ocho fotos se revelan entre la niebla.",
            borrow: { field: "caption", line: "Prueba de que estuvimos" },
          },
        ],
      },
      faq: [],
    },
  },

  sketchbook: {
    en: {
      ideas: {
        title: "What to draw in a sketchbook gift",
        items: [
          {
            heading: "Their birthday",
            how: "The line over the cake takes 24 characters. Their age gets circled twice.",
            borrow: { field: "fields.title", line: "happy birthday, Ana" },
          },
          {
            heading: "A year of you two",
            how: "Up to twelve photos, taped in between the doodles.",
            borrow: { field: "caption", line: "The day we bought the plant" },
          },
          {
            heading: "For someone who draws",
            how: "White paper, kraft, or black paper and a white pen.",
            borrow: { field: "message", line: "I can’t draw. So I got help." },
          },
          {
            heading: "A child’s birthday",
            how: "A cake, a party hat and presents draw themselves.",
            borrow: { field: "fields.title", line: "seven today" },
          },
          {
            heading: "With a present to find",
            how: "The P.S. sits in its own box under the letter. Say where to look.",
            borrow: { field: "surprise.text", line: "Last page of the notebook on your desk." },
          },
          {
            heading: "An anniversary",
            how: "The last page is your letter.",
            borrow: { field: "message", line: "Page one was the day I met you." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué dibujar en un cuaderno de regalo",
        items: [
          {
            heading: "Su cumpleaños",
            how: "La línea sobre la tarta admite 24 caracteres. Su edad sale rodeada dos veces.",
            borrow: { field: "fields.title", line: "feliz cumple, Ana" },
          },
          {
            heading: "Un año de vosotros",
            how: "Hasta doce fotos, pegadas entre los garabatos.",
            borrow: { field: "caption", line: "El día que compramos la planta" },
          },
          {
            heading: "Para alguien que dibuja",
            how: "Papel blanco, kraft o papel negro con boli blanco.",
            borrow: { field: "message", line: "No sé dibujar. Así que pedí ayuda." },
          },
          {
            heading: "El cumple de un peque",
            how: "Se dibujan una tarta, un gorrito y regalos.",
            borrow: { field: "fields.title", line: "hoy siete" },
          },
          {
            heading: "Con un regalo escondido",
            how: "La posdata va en su propio recuadro, bajo la carta. Di dónde mirar.",
            borrow: { field: "surprise.text", line: "Última página del cuaderno de tu mesa." },
          },
          {
            heading: "Un aniversario",
            how: "La última página es tu carta.",
            borrow: { field: "message", line: "La primera página fue el día que te conocí." },
          },
        ],
      },
      faq: [],
    },
  },

  "spooky-season": {
    en: {
      ideas: {
        title: "What to put in a spooky season collage",
        items: [
          {
            heading: "A Halloween date",
            how: "Print the place and the hour on the ticket for two: 26 characters.",
            borrow: { field: "fields.ticket", line: "Haunted house · Fri 8pm" },
          },
          {
            heading: "A first October together",
            how: "The postcard is in handwriting.",
            borrow: { field: "fields.note", line: "First pumpkin with you. Many more." },
          },
          {
            heading: "For a friend who loves autumn",
            how: "Say what October is to you in the torn-out words, 28 characters at most.",
            borrow: { field: "fields.label", line: "it’s finally our season" },
          },
          {
            heading: "Costumes through the years",
            how: "Up to ten photos, down the page as polaroids.",
            borrow: { field: "caption", line: "2021, the cheap wigs" },
          },
          {
            heading: "A film night",
            how: "The P.S. takes the hour. Let them argue about which film.",
            borrow: { field: "surprise.text", line: "Eight o’clock. Come ready to argue for your film." },
          },
          {
            heading: "Long distance",
            how: "Your letter ends the page. Ask for a photo of their pumpkin.",
            borrow: { field: "message", line: "Carve one for me. I’ll judge by photo." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en un collage spooky season",
        items: [
          {
            heading: "Una cita de Halloween",
            how: "Imprime el sitio y la hora en la entrada para dos: 26 caracteres.",
            borrow: { field: "fields.ticket", line: "Casa del terror · vie 20 h" },
          },
          {
            heading: "El primer octubre en pareja",
            how: "La postal va escrita a mano.",
            borrow: { field: "fields.note", line: "Primera calabaza contigo. Vendrán más." },
          },
          {
            heading: "Para quien adora el otoño",
            how: "Di qué es octubre para vosotros en las palabras recortadas, 28 caracteres como mucho.",
            borrow: { field: "fields.label", line: "por fin es nuestra época" },
          },
          {
            heading: "Los disfraces de cada año",
            how: "Hasta diez fotos, página abajo, en polaroids.",
            borrow: { field: "caption", line: "2021, las pelucas baratas" },
          },
          {
            heading: "Una noche de pelis",
            how: "La posdata lleva la hora. La peli, que la discutan.",
            borrow: { field: "surprise.text", line: "A las ocho. Ven con argumentos para tu peli." },
          },
          {
            heading: "A distancia",
            how: "Tu carta cierra la página. Pídele una foto de su calabaza.",
            borrow: { field: "message", line: "Talla una por mí. Juzgaré por foto." },
          },
        ],
      },
      faq: [],
    },
  },

  "sticker-bomb": {
    en: {
      ideas: {
        title: "What to put in a sticker bomb card",
        items: [
          {
            heading: "Just because",
            how: "Print what you call them on the label-maker strips: six, 28 characters each.",
            borrow: { field: "fields.labels", line: "certified menace" },
          },
          {
            heading: "Their birthday",
            how: "Pick the party animals pack.",
            borrow: { field: "fields.labels", line: "older, not wiser" },
          },
          {
            heading: "Saying sorry",
            how: "Pick the pack called The soft ones.",
            borrow: { field: "fields.labels", line: "was wrong (this once)" },
          },
          {
            heading: "Cheering someone up",
            how: "They read one line before the first tap. Make it a promise, in 40 characters.",
            borrow: { field: "fields.prompt", line: "tap anywhere. it gets better." },
          },
          {
            heading: "For the group chat",
            how: "Up to six of your photos land as polaroids.",
            borrow: { field: "caption", line: "This photo, again" },
          },
          {
            heading: "With a small present",
            how: "A small present needs one line of directions. Put it in the P.S.",
            borrow: { field: "surprise.text", line: "Check your bag. Inside pocket." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué poner en una tarjeta de stickers",
        items: [
          {
            heading: "Porque sí",
            how: "Imprime cómo le llamas en las tiras de rotuladora: seis, de 28 caracteres.",
            borrow: { field: "fields.labels", line: "peligro certificado" },
          },
          {
            heading: "Su cumpleaños",
            how: "Elige el paquete de animales de fiesta.",
            borrow: { field: "fields.labels", line: "más años, mismo juicio" },
          },
          {
            heading: "Para pedir perdón",
            how: "Elige el paquete de Los tiernos.",
            borrow: { field: "fields.labels", line: "me equivoqué (esta vez)" },
          },
          {
            heading: "Para animar a alguien",
            how: "Leen una frase antes del primer toque. Que sea una promesa, en 40 caracteres.",
            borrow: { field: "fields.prompt", line: "toca donde sea. mejora." },
          },
          {
            heading: "Para el grupo",
            how: "Hasta seis fotos tuyas caen como polaroids.",
            borrow: { field: "caption", line: "Otra vez esta foto" },
          },
          {
            heading: "Con un detalle escondido",
            how: "Un detalle pide una sola línea de señas. Va en la posdata.",
            borrow: { field: "surprise.text", line: "Mira en tu bolso. Bolsillo interior." },
          },
        ],
      },
      faq: [],
    },
  },

  "text-thread": {
    en: {
      ideas: {
        title: "What to write in a text message gift",
        items: [
          {
            heading: "Long distance",
            how: "Up to forty messages. Write it like the chat you really have.",
            borrow: { field: "fields.lines", line: "I’m on the 23:40 again. the rain one" },
          },
          {
            heading: "Saying sorry",
            how: "End on the message you’d never send by text.",
            borrow: { field: "fields.lines", line: "I was wrong and I knew it by the lift." },
          },
          {
            heading: "Their birthday",
            how: "Start at midnight and let the bubbles pile up.",
            borrow: { field: "fields.lines", line: "it’s 00:00. you’re officially older" },
          },
          {
            heading: "Just because",
            how: "Photos drop in as attachments.",
            borrow: { field: "fields.lines", line: "saw this and thought of you" },
          },
          {
            heading: "Before they land",
            how: "Count down to their landing and label it the way you’d text it.",
            borrow: { field: "countdown.label", line: "until you land. text me at the gate" },
          },
          {
            heading: "From an old friend",
            how: "Sign the chat header as who you are to them, in 40 characters.",
            borrow: { field: "fields.contactName", line: "The one who still has your hoodie" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué escribir en un regalo en mensajes de chat",
        items: [
          {
            heading: "A distancia",
            how: "Hasta cuarenta mensajes. Escríbelo como vuestro chat de verdad.",
            borrow: { field: "fields.lines", line: "otra vez en el de las 23:40. el de la lluvia" },
          },
          {
            heading: "Para pedir perdón",
            how: "Acaba con el mensaje que nunca mandarías por chat.",
            borrow: { field: "fields.lines", line: "Me equivoqué y lo supe en el ascensor." },
          },
          {
            heading: "Su cumpleaños",
            how: "Empieza a medianoche y deja que se acumulen las burbujas.",
            borrow: { field: "fields.lines", line: "son las 00:00. ya tienes un año más" },
          },
          {
            heading: "Porque sí",
            how: "Las fotos entran como adjuntos.",
            borrow: { field: "fields.lines", line: "vi esto y me acordé de ti" },
          },
          {
            heading: "Antes de aterrizar",
            how: "Cuenta atrás hasta su aterrizaje y titúlala como se lo escribirías.",
            borrow: { field: "countdown.label", line: "hasta que aterrices. escríbeme al salir" },
          },
          {
            heading: "De alguien de toda la vida",
            how: "Firma la cabecera del chat con lo que eres para esa persona, en 40 caracteres.",
            borrow: { field: "fields.contactName", line: "Quien aún tiene tu sudadera" },
          },
        ],
      },
      faq: [],
    },
  },

  "the-toast": {
    en: {
      ideas: {
        title: "What to say in a digital toast",
        items: [
          {
            heading: "A wedding",
            how: "Open with both their names. The first line takes 70 characters.",
            borrow: { field: "fields.opening", line: "To Ana and Marco" },
          },
          {
            heading: "An anniversary",
            how: "Put the day you married on the menu card.",
            borrow: { field: "fields.dateLine", line: "14 June 2026" },
          },
          {
            heading: "A toast from far away",
            how: "The menu card opens into your speech.",
            borrow: { field: "message", line: "I’d have cried by line two anyway." },
          },
          {
            heading: "An engagement",
            how: "Champagne, red, white or alcohol-free in the glasses.",
            borrow: { field: "fields.opening", line: "To the two of you, at last" },
          },
          {
            heading: "Valentine’s Day",
            how: "Print your own kitchen as the venue on the menu card. It takes 60 characters.",
            borrow: { field: "fields.venue", line: "Our kitchen, the good glasses" },
          },
          {
            heading: "A retirement",
            how: "Up to eight photos rise past the glasses in the bubbles.",
            borrow: { field: "caption", line: "Day one, 1989" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué decir en un brindis digital",
        items: [
          {
            heading: "Una boda",
            how: "Empieza por sus dos nombres. La primera frase admite 70 caracteres.",
            borrow: { field: "fields.opening", line: "Por Ana y Marco" },
          },
          {
            heading: "Un aniversario",
            how: "Pon en la carta del menú el día de vuestra boda.",
            borrow: { field: "fields.dateLine", line: "14 de junio de 2026" },
          },
          {
            heading: "Un brindis a distancia",
            how: "La carta del menú se abre y sale tu discurso.",
            borrow: { field: "message", line: "Habría llorado en la segunda línea." },
          },
          {
            heading: "Un compromiso",
            how: "Champán, tinto, blanco o sin alcohol en las copas.",
            borrow: { field: "fields.opening", line: "Por vosotros dos, por fin" },
          },
          {
            heading: "San Valentín",
            how: "Imprime tu cocina como lugar en la carta del menú. Admite 60 caracteres.",
            borrow: { field: "fields.venue", line: "Nuestra cocina, las copas buenas" },
          },
          {
            heading: "Una jubilación",
            how: "Hasta ocho fotos suben entre las burbujas.",
            borrow: { field: "caption", line: "El primer día, 1989" },
          },
        ],
      },
      faq: [],
    },
  },

  "trick-or-treat": {
    en: {
      ideas: {
        title: "What to hand over in a trick-or-treat gift",
        items: [
          {
            heading: "Halloween night",
            how: "The title shows on the porch.",
            borrow: { field: "title", line: "you’re the treat" },
          },
          {
            heading: "For the kids",
            how: "A ghost, a cat or a pumpkin answers and says your line.",
            borrow: { field: "fields.doorLine", line: "one each, no pushing" },
          },
          {
            heading: "Asking them to a party",
            how: "Put the party’s hour on the door’s sign, in 24 characters.",
            borrow: { field: "fields.sign", line: "party inside, 8pm" },
          },
          {
            heading: "Matching costumes",
            how: "The P.S. is on parchment. Say what you bought for the two of you.",
            borrow: { field: "surprise.text", line: "I bought two sets of fangs. Yours glow." },
          },
          {
            heading: "Long distance",
            how: "Your words come on a scroll.",
            borrow: { field: "message", line: "I’d share my sweets with you. Some." },
          },
          {
            heading: "Halloweens so far",
            how: "Up to eight photos in haunted frames.",
            borrow: { field: "caption", line: "2020, costumes on the sofa" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué entregar en un truco o trato",
        items: [
          {
            heading: "La noche de Halloween",
            how: "El título sale en el porche.",
            borrow: { field: "title", line: "tú eres el trato" },
          },
          {
            heading: "Para los peques",
            how: "Abre un fantasma, un gato o una calabaza y dice tu frase.",
            borrow: { field: "fields.doorLine", line: "uno por cabeza, sin empujar" },
          },
          {
            heading: "Para invitar a una fiesta",
            how: "Pon la hora de la fiesta en el cartel de la puerta, en 24 caracteres.",
            borrow: { field: "fields.sign", line: "fiesta dentro, 20:00" },
          },
          {
            heading: "Disfraces a juego",
            how: "La posdata va en pergamino. Di qué has comprado para ti y para mí.",
            borrow: { field: "surprise.text", line: "He comprado dos pares de colmillos. Los tuyos brillan." },
          },
          {
            heading: "A distancia",
            how: "Tus palabras llegan en un pergamino.",
            borrow: { field: "message", line: "Compartiría mis caramelos contigo. Algunos." },
          },
          {
            heading: "Vuestros Halloween",
            how: "Hasta ocho fotos en marcos encantados.",
            borrow: { field: "caption", line: "2020, disfraces en el sofá" },
          },
        ],
      },
      faq: [],
    },
  },

  unwrapped: {
    en: {
      ideas: {
        title: "What to count in a year in review gift",
        items: [
          {
            heading: "Christmas",
            how: "Up to eight numbers, written by you. Each one counts up.",
            borrow: { field: "fields.stats", line: "1,284 voice notes" },
          },
          {
            heading: "An anniversary",
            how: "Count the year since the last one.",
            borrow: { field: "fields.stats", line: "41 nights you stole the blanket" },
          },
          {
            heading: "New Year’s Eve",
            how: "The gold present prints the year as a receipt.",
            borrow: { field: "fields.stats", line: "3 cities we got lost in" },
          },
          {
            heading: "A first year together",
            how: "Start with the day count.",
            borrow: { field: "fields.stats", line: "365 days, give or take a row" },
          },
          {
            heading: "Long distance",
            how: "Count the flights, the calls and the hours.",
            borrow: { field: "fields.stats", line: "17 flights, 0 regrets" },
          },
          {
            heading: "With one more present",
            how: "Keep one number back for the P.S. and make it the present.",
            borrow: { field: "surprise.text", line: "One more number: 2 tickets." },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué contar en un resumen del año en pareja",
        items: [
          {
            heading: "Navidad",
            how: "Hasta ocho números, escritos por ti. Cada uno va subiendo.",
            borrow: { field: "fields.stats", line: "1.284 notas de voz" },
          },
          {
            heading: "Un aniversario",
            how: "Cuenta el año desde el anterior.",
            borrow: { field: "fields.stats", line: "41 noches quitándome la manta" },
          },
          {
            heading: "Nochevieja",
            how: "El regalo dorado imprime el año como un tique.",
            borrow: { field: "fields.stats", line: "3 ciudades en las que nos perdimos" },
          },
          {
            heading: "El primer año en pareja",
            how: "Empieza por el número de días.",
            borrow: { field: "fields.stats", line: "365 días, con sus más y sus menos" },
          },
          {
            heading: "A distancia",
            how: "Cuenta los vuelos, las llamadas y las horas.",
            borrow: { field: "fields.stats", line: "17 vuelos, 0 arrepentimientos" },
          },
          {
            heading: "Con un regalo más",
            how: "Guarda un número para la posdata y que sea el regalo.",
            borrow: { field: "surprise.text", line: "Un número más: 2 entradas." },
          },
        ],
      },
      faq: [],
    },
  },

  vinyl: {
    en: {
      ideas: {
        title: "What to press on a vinyl record for them",
        items: [
          {
            heading: "An anniversary",
            how: "Title the album after something only you two know, in 40 characters.",
            borrow: { field: "fields.album", line: "Songs for the 23:40" },
          },
          {
            heading: "Valentine’s Day",
            how: "Put your name where the artist goes.",
            borrow: { field: "fields.artist", line: "Lucas, badly, in the shower" },
          },
          {
            heading: "Long distance",
            how: "Up to twelve photos sit in a crate as album covers.",
            borrow: { field: "caption", line: "Track 3: the night bus" },
          },
          {
            heading: "Just because",
            how: "Your message is printed on the liner notes.",
            borrow: { field: "message", line: "This came on and I thought of you." },
          },
          {
            heading: "A wedding song",
            how: "Print what the song is for on the side label, in 12 characters.",
            borrow: { field: "fields.side", line: "First dance" },
          },
          {
            heading: "For your dad",
            how: "Name it after the songs he played in the car.",
            borrow: { field: "fields.album", line: "Dad’s Driving Tape" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué grabar en un vinilo para dedicar",
        items: [
          {
            heading: "Un aniversario",
            how: "Titula el disco con algo que solo entendéis vosotros, en 40 caracteres.",
            borrow: { field: "fields.album", line: "Canciones para el de las 23:40" },
          },
          {
            heading: "San Valentín",
            how: "Pon tu nombre donde va el artista.",
            borrow: { field: "fields.artist", line: "Lucas, mal, en la ducha" },
          },
          {
            heading: "A distancia",
            how: "Hasta doce fotos van en una caja, como portadas.",
            borrow: { field: "caption", line: "Pista 3: el bus nocturno" },
          },
          {
            heading: "Porque sí",
            how: "Tu mensaje va impreso en el libreto.",
            borrow: { field: "message", line: "Sonó esta y me acordé de ti." },
          },
          {
            heading: "La canción de la boda",
            how: "Imprime en la etiqueta de la cara para qué es la canción, en 12 caracteres.",
            borrow: { field: "fields.side", line: "Primer baile" },
          },
          {
            heading: "Para tu padre",
            how: "Ponle el nombre de las canciones que ponía en el coche.",
            borrow: { field: "fields.album", line: "La cinta del coche de papá" },
          },
        ],
      },
      faq: [],
    },
  },

  wishbone: {
    en: {
      ideas: {
        title: "What to wish for with a wishbone gift",
        items: [
          {
            heading: "Thanksgiving together",
            how: "Your wish takes 120 characters and comes out on a card.",
            borrow: { field: "fields.wish", line: "another year at the same table" },
          },
          {
            heading: "Thanksgiving apart",
            how: "You decide who gets the big half. Give it to them.",
            borrow: { field: "fields.wish", line: "next year, one table, one time zone" },
          },
          {
            heading: "A first Thanksgiving together",
            how: "The title sits above the plate.",
            borrow: { field: "title", line: "make a wish" },
          },
          {
            heading: "A dinner to book",
            how: "The P.S. is where the booking goes: table, day and hour.",
            borrow: { field: "surprise.text", line: "A table for two, the Friday after, at 7." },
          },
          {
            heading: "For your family",
            how: "Red gingham, harvest orange, sage linen or candlelit.",
            borrow: { field: "fields.wish", line: "that we keep fighting over the crispy bits" },
          },
          {
            heading: "The year in photos",
            how: "Eight photos at most, after the letter. Begin with last year’s table.",
            borrow: { field: "caption", line: "Last year, the burnt pie" },
          },
        ],
      },
      faq: [],
    },
    es: {
      ideas: {
        title: "Qué desear con una espoleta",
        items: [
          {
            heading: "Acción de Gracias en pareja",
            how: "Tu deseo admite 120 caracteres y sale en una tarjeta.",
            borrow: { field: "fields.wish", line: "otro año en la misma mesa" },
          },
          {
            heading: "Acción de Gracias a distancia",
            how: "Decides quién se lleva la mitad grande. Dásela.",
            borrow: { field: "fields.wish", line: "el año que viene, una mesa y una hora" },
          },
          {
            heading: "El primer Acción de Gracias",
            how: "El título va sobre el plato.",
            borrow: { field: "title", line: "pide un deseo" },
          },
          {
            heading: "Una cena reservada",
            how: "En la posdata va la reserva: mesa, día y hora.",
            borrow: { field: "surprise.text", line: "Mesa para dos, el viernes siguiente, a las 19:00." },
          },
          {
            heading: "Para tu familia",
            how: "Cuadros rojos, naranja otoño, lino salvia o a la luz de las velas.",
            borrow: { field: "fields.wish", line: "seguir peleando por lo crujiente" },
          },
          {
            heading: "El año en fotos",
            how: "Ocho fotos como mucho, tras la carta. Empieza por la mesa del año pasado.",
            borrow: { field: "caption", line: "El año pasado, la tarta quemada" },
          },
        ],
      },
      faq: [],
    },
  },
};

/** A template's extra guide in a locale, if it has one. */
export function templateGuide(slug: string, locale: GiftLocale): TemplateGuideContent | null {
  // Own keys only: "constructor" is in every object, and it is not a template.
  return Object.hasOwn(TEMPLATE_GUIDES, slug) ? TEMPLATE_GUIDES[slug][locale] ?? null : null;
}

/**
 * The questions a template's guide adds to its page, as the page shows them. One about the free
 * note is asked only while the note is the free version (lib/gift/free-tier.ts), so the answer
 * never stands beside the page's own "Is it free?" saying something else. An answer that names “a
 * note with photos” is given only while every visitor is offered it (lib/editor/keep-split.ts): a
 * page is one text for everyone, so with the share under 1 it would promise some readers a thing
 * their send screen never shows, and the answer without it is given in its place.
 */
export function templateGuideFaq(slug: string, locale: GiftLocale, freeNote: boolean = noteForEveryone(), notePhotos: boolean = keepShare() >= 1): { q: string; a: string }[] {
  return (templateGuide(slug, locale)?.faq ?? [])
    .filter((f) => (!f.whileFreeNote || freeNote) && (f.notePhotos === undefined || f.notePhotos === notePhotos))
    .map(({ q, a }) => ({ q, a }));
}
