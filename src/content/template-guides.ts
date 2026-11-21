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
 * sixteen on what to do, and one line to borrow, which the page draws the way the template shows
 * it (content/template-guide-looks.ts) under the name of the field it goes in.
 * tests/unit/text-budget.test.ts holds the lengths; tests/unit/template-guides.test.ts reads each
 * field's limit from the template's own schema, so a line that would not fit where the card says
 * to put it fails the build.
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
            heading: "A proposal they scratch to",
            how: "Photos of the two of you in order, the question on the last card.",
            borrow: { field: "fields.finalTitle", line: "Will you marry me?" },
          },
          {
            heading: "A pregnancy announcement",
            how: "Two pairs of shoes, then three, then the scan. One link for everyone.",
            borrow: { field: "fields.finalTitle", line: "See you in June, Grandma." },
          },
          {
            heading: "Asking your bridesmaids",
            how: "One card for each friend, with your photos from school to now.",
            borrow: { field: "fields.finalTitle", line: "Will you be my bridesmaid?" },
          },
          {
            heading: "A trip, one clue per card",
            how: "A passport, a beach towel, a croissant. The last card names the place.",
            borrow: { field: "fields.finalTitle", line: "Lisbon. Friday. Pack tonight." },
          },
          {
            heading: "The real present comes last",
            how: "Caption the year’s photos like lottery prizes, then put the real one last.",
            borrow: { field: "fields.finalTitle", line: "Two tickets, row F, the 14th." },
          },
          {
            heading: "News bigger than a text",
            how: "Show the before on the first cards and the after on the last.",
            borrow: { field: "fields.finalTitle", line: "We got the keys." },
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
            heading: "Una pedida que se rasca",
            how: "Fotos vuestras en orden y la pregunta en la última tarjeta.",
            borrow: { field: "fields.finalTitle", line: "¿Te casas conmigo?" },
          },
          {
            heading: "Un anuncio de embarazo",
            how: "Dos pares de zapatos, luego tres, luego la ecografía. Un enlace para todos.",
            borrow: { field: "fields.finalTitle", line: "Nos vemos en junio, abuela" },
          },
          {
            heading: "Pedírselo a tus damas de honor",
            how: "Una tarjeta para cada amiga, con vuestras fotos desde el colegio.",
            borrow: { field: "fields.finalTitle", line: "¿Quieres ser mi dama de honor?" },
          },
          {
            heading: "Un viaje, pista a pista",
            how: "Un pasaporte, una toalla, un cruasán. La última tarjeta dice el destino.",
            borrow: { field: "fields.finalTitle", line: "Lisboa. Viernes. Haz la maleta esta noche" },
          },
          {
            heading: "El regalo de verdad, al final",
            how: "Pies de premio de lotería en las fotos del año; el de verdad, al final.",
            borrow: { field: "fields.finalTitle", line: "Dos entradas, fila F, el día 14" },
          },
          {
            heading: "Una noticia que merece más",
            how: "El antes en las primeras tarjetas y el después en la última.",
            borrow: { field: "fields.finalTitle", line: "Ya tenemos las llaves." },
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
            heading: "Their flower, not the default",
            how: "Start with the one they’d pick: ranunculus, poppies, lavender, sunflowers. There are 14.",
            borrow: { field: "fields.cardNote", line: "Your favourites. I asked." },
          },
          {
            heading: "Your wedding bouquet, again",
            how: "The same flowers, ribbon and paper, rebuilt from the photos.",
            borrow: { field: "fields.cardNote", line: "Same flowers. Same answer." },
          },
          {
            heading: "Sunflowers for a bad week",
            how: "Sunflowers in kraft paper, for a friend who’s had an awful week.",
            borrow: { field: "fields.cardNote", line: "Look at these, not the news." },
          },
          {
            heading: "Flowers across a border",
            how: "It arrives the second you send it and looks the same next spring.",
            borrow: { field: "fields.cardNote", line: "No customs form needed." },
          },
          {
            heading: "An apology that doesn’t shout",
            how: "Whites and blush, no red. The real apology goes in the letter.",
            borrow: { field: "fields.cardNote", line: "I was wrong. Sorry." },
          },
          {
            heading: "For your mother, in her colours",
            how: "Peonies or lilies in the colour she always wears, scheduled for that morning.",
            borrow: { field: "fields.cardNote", line: "Still calling you first." },
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
            heading: "Su flor, no la de siempre",
            how: "Empieza por la que elegiría: ranúnculos, amapolas, lavanda, girasoles. Hay 14.",
            borrow: { field: "fields.cardNote", line: "Tus favoritas. Pregunté." },
          },
          {
            heading: "Vuestro ramo de boda, otra vez",
            how: "Las mismas flores, el mismo lazo y el mismo papel, a partir de las fotos.",
            borrow: { field: "fields.cardNote", line: "Mismas flores, mismo sí." },
          },
          {
            heading: "Girasoles para una semana mala",
            how: "Girasoles en papel kraft para quien ha tenido una semana horrible.",
            borrow: { field: "fields.cardNote", line: "Mira esto, no las noticias" },
          },
          {
            heading: "Flores que cruzan una frontera",
            how: "Llega en el segundo en que lo envías y sigue igual la próxima primavera.",
            borrow: { field: "fields.cardNote", line: "Estas no pasan por aduana." },
          },
          {
            heading: "Una disculpa sin gritos",
            how: "Blancos y rosa palo, nada de rojo. La disculpa de verdad va en la carta.",
            borrow: { field: "fields.cardNote", line: "Me equivoqué. Perdón." },
          },
          {
            heading: "Para tu madre, en sus colores",
            how: "Peonías o lirios del color que siempre lleva, programado para esa mañana.",
            borrow: { field: "fields.cardNote", line: "Siempre te llamo primero" },
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
            heading: "Fortunes that are really in-jokes",
            how: "Write them like a fortune-teller who has met them. Keep the punchline short.",
            borrow: { field: "fields.fortunes", line: "You will lose your keys again on Thursday." },
          },
          {
            heading: "Lucky numbers that are dates",
            how: "The day you met, their age, the table from your first date.",
            borrow: { field: "fields.luckyNumbers", line: "14 · 06 · 21 · 7 · 42" },
          },
          {
            heading: "Silly first, sweet last",
            how: "Slips come out in your order. Make the last one the first that isn’t a joke.",
            borrow: { field: "fields.fortunes", line: "You will be loved for a very long time. This one is not a joke." },
          },
          {
            heading: "Photos on the first slips",
            how: "Up to ten photos, one per slip. Pair the worst with the most solemn fortune.",
            borrow: { field: "fields.fortunes", line: "Great fortune awaits the person in this hat." },
          },
          {
            heading: "A fortune for every year",
            how: "For a birthday, one for each year they’ve been in your life, up to twenty.",
            borrow: { field: "fields.fortunes", line: "Year three: you will learn to love my cooking. You did not." },
          },
          {
            heading: "Fortunes about what’s next",
            how: "For a graduation or a new job. Say how proud you are in the letter.",
            borrow: { field: "fields.fortunes", line: "You will finally be paid for being bossy." },
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
            heading: "Fortunas que son bromas vuestras",
            how: "Escríbelas como una adivina que os conoce de toda la vida, y remata corto.",
            borrow: { field: "fields.fortunes", line: "El jueves volverás a perder las llaves" },
          },
          {
            heading: "Números que son vuestras fechas",
            how: "El día que os conocisteis, su edad, la mesa de la primera cita.",
            borrow: { field: "fields.luckyNumbers", line: "14 · 06 · 21 · 7 · 42" },
          },
          {
            heading: "Lo gracioso primero",
            how: "Salen en tu orden. Que la última fortuna sea la primera que no es broma.",
            borrow: { field: "fields.fortunes", line: "Te van a querer muchísimo tiempo. Esta no es broma." },
          },
          {
            heading: "Fotos en los primeros papelitos",
            how: "Hasta diez fotos, una por papelito. Junta la peor con la fortuna más solemne.",
            borrow: { field: "fields.fortunes", line: "Una gran fortuna espera a quien lleva este gorro" },
          },
          {
            heading: "Una fortuna por cada año",
            how: "Para un cumpleaños, una por cada año que lleva en tu vida, hasta veinte.",
            borrow: { field: "fields.fortunes", line: "Año tres: aprenderás a querer mi cocina. No lo hiciste" },
          },
          {
            heading: "Fortunas sobre lo que viene",
            how: "Para una graduación o un trabajo nuevo. El orgullo, en la carta.",
            borrow: { field: "fields.fortunes", line: "Por fin te pagarán por mandar" },
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
            how: "Begin where the two of you began, then a year to a paragraph.",
            borrow: { field: "fields.greeting", line: "To the stranger who took my umbrella," },
          },
          {
            heading: "An apology they’ll believe",
            how: "Five sentences: what you did, what it cost them, what changes on Monday.",
            borrow: { field: "note", line: "I was late, I joked about it, and you spent your birthday dinner watching the door." },
          },
          {
            heading: "A long-distance letter",
            how: "Set the countdown to the minute you land, and write its label yourself.",
            borrow: { field: "countdown.label", line: "Until I’m the one ringing your doorbell" },
          },
          {
            heading: "Ten years, pressed in wax",
            how: "The seal takes two characters. For a round anniversary, make it the number.",
            borrow: { field: "fields.sealInitial", line: "10" },
          },
          {
            heading: "For the morning of an interview",
            how: "The title is the line on the cover, so make it an instruction.",
            borrow: { field: "title", line: "Open before you walk in" },
          },
          {
            heading: "A letter from the dog",
            how: "For the first week someone is away, signed by whoever misses them loudest.",
            borrow: { field: "fields.signOff", line: "Yours, mostly at dinner time," },
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
            how: "Empieza por donde empezó lo vuestro, y después un párrafo por año.",
            borrow: { field: "fields.greeting", line: "A quien se llevó mi paraguas sin pedirlo:" },
          },
          {
            heading: "Una disculpa que se crea",
            how: "Cinco frases: qué hiciste, qué le costó, qué cambia el lunes.",
            borrow: { field: "note", line: "Llegué tarde, encima hice una broma y te pasaste tu cena de cumpleaños mirando la puerta." },
          },
          {
            heading: "Una carta a distancia",
            how: "Pon la cuenta atrás en el minuto en que aterrizas y escríbele tú el rótulo.",
            borrow: { field: "countdown.label", line: "Hasta que sea yo quien llame a tu timbre" },
          },
          {
            heading: "Diez años, en el lacre",
            how: "El sello admite dos caracteres. En un aniversario redondo, estampa el número.",
            borrow: { field: "fields.sealInitial", line: "10" },
          },
          {
            heading: "Para la mañana de una entrevista",
            how: "El título es la frase de la portada: conviértelo en una instrucción.",
            borrow: { field: "title", line: "Ábrela antes de entrar" },
          },
          {
            heading: "Una carta de parte del perro",
            how: "Para la primera semana que alguien pasa fuera, firmada por quien más le echa de menos.",
            borrow: { field: "fields.signOff", line: "Tuyo, sobre todo a la hora de cenar," },
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
            heading: "A premiere for a big birthday",
            how: "The sign over the curtain holds 40 characters of your own.",
            borrow: { field: "fields.marquee", line: "30 years in the making: Ana" },
          },
          {
            heading: "One card from the group chat",
            how: "Ask each friend for one photo and four words; the strip holds 20.",
            borrow: { field: "caption", line: "Leo: owes you a dance" },
          },
          {
            heading: "A seventh birthday, seven candles",
            how: "Up to twelve, the cake carries one candle for every year.",
            borrow: { field: "fields.marquee", line: "Now showing: Leo is SEVEN" },
          },
          {
            heading: "Midnight, to the minute",
            how: "Schedule it for 00:00 and send the link the evening before.",
            borrow: { field: "surprise.text", line: "Look under your pillow. No, the other pillow." },
          },
          {
            heading: "A birthday you’re missing",
            how: "They blow at the phone and the candles go out a few at a time.",
            borrow: { field: "countdown.label", line: "Until I bring the real cake" },
          },
          {
            heading: "The roast",
            how: "Title it like a film, caption the frames by year, write the letter as a review.",
            borrow: { field: "title", line: "A life in six questionable haircuts" },
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
            heading: "Un cumpleaños redondo, de estreno",
            how: "La marquesina, el cartel sobre el telón, admite 40 caracteres tuyos.",
            borrow: { field: "fields.marquee", line: "30 años de rodaje: Ana" },
          },
          {
            heading: "Una tarjeta de todo el grupo",
            how: "Pedid a cada amigo una foto y cuatro palabras; la tira admite 20.",
            borrow: { field: "caption", line: "Leo: te debe un baile" },
          },
          {
            heading: "Siete años, siete velas",
            how: "Hasta los doce, la tarta lleva una vela por año.",
            borrow: { field: "fields.marquee", line: "Hoy: Leo cumple SIETE" },
          },
          {
            heading: "A medianoche, en punto",
            how: "Prográmala para las 00:00 y manda el enlace la noche anterior.",
            borrow: { field: "surprise.text", line: "Mira debajo de la almohada. No, de la otra." },
          },
          {
            heading: "Un cumpleaños al que no llegas",
            how: "Sopla al móvil y las velas se apagan unas pocas cada vez.",
            borrow: { field: "countdown.label", line: "Hasta que lleve la tarta de verdad" },
          },
          {
            heading: "El homenaje con guasa",
            how: "Título de película, el año en cada pie y la carta escrita como una crítica.",
            borrow: { field: "title", line: "Una vida en seis cortes de pelo dudosos" },
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
            heading: "One star for every city",
            how: "Each place you’ve been together, captioned with the place and the hour.",
            borrow: { field: "fields.finalLine", line: "Six cities so far. You pick the seventh." },
          },
          {
            heading: "A question in the last line",
            how: "The final line appears once every star is found. Be in the room.",
            borrow: { field: "fields.finalLine", line: "Will you marry me? Look up from the phone." },
          },
          {
            heading: "A birthday sky for your dad",
            how: "One star for each thing he taught you, with a photo of you doing it.",
            borrow: { field: "caption", line: "You let go of the saddle and didn’t tell me." },
          },
          {
            heading: "An anniversary sky",
            how: "Any star can open first, so give every caption its own time.",
            borrow: { field: "caption", line: "Day one. This is where it started." },
          },
          {
            heading: "The same sky, two time zones",
            how: "Pick the dawn sky if they’ll wake up to it, and count down under your letter.",
            borrow: { field: "countdown.label", line: "Until we’re under the same one" },
          },
          {
            heading: "Three stars: then, now, next",
            how: "An old photo, one from this month, and something that hasn’t happened yet.",
            borrow: { field: "caption", line: "This one is in March. Pack a coat." },
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
            heading: "Una estrella por cada ciudad",
            how: "Cada sitio en el que habéis estado, con el lugar y la hora en el pie.",
            borrow: { field: "fields.finalLine", line: "Seis ciudades por ahora. La séptima la eliges tú." },
          },
          {
            heading: "Una pregunta en la última frase",
            how: "La frase final aparece al encontrar todas las estrellas. Procura estar delante.",
            borrow: { field: "fields.finalLine", line: "¿Te casas conmigo? Levanta la vista del móvil." },
          },
          {
            heading: "Un cielo para tu padre",
            how: "Una estrella por cada cosa que te enseñó, con una foto tuya haciéndola.",
            borrow: { field: "caption", line: "Soltaste el sillín y no me avisaste." },
          },
          {
            heading: "Un cielo de aniversario",
            how: "Se puede abrir primero cualquier estrella: pon en cada pie su momento.",
            borrow: { field: "caption", line: "El primer día. Aquí empezó todo." },
          },
          {
            heading: "El mismo cielo, dos husos horarios",
            how: "Elige el cielo de amanecer si lo va a abrir al despertarse.",
            borrow: { field: "countdown.label", line: "Hasta que estemos bajo el mismo" },
          },
          {
            heading: "Tres estrellas: antes, ahora, después",
            how: "Una foto antigua, una de este mes y algo que aún no ha pasado.",
            borrow: { field: "caption", line: "Esta es en marzo. Llévate abrigo." },
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
        title: "What to write on an XOXO love card",
        items: [
          {
            heading: "The name only you call them",
            how: "Newspaper cut-out letters, one word to a row. Three words at most.",
            borrow: { field: "fields.headline", line: "my plus one" },
          },
          {
            heading: "Lines written like your song",
            how: "The card under the first photo is a lyric card. Write the missing verse.",
            borrow: { field: "fields.lines", line: "you put your cold feet on me in January and I have never once moved away." },
          },
          {
            heading: "One word for a first anniversary",
            how: "The second polaroid carries a single word in script, up to 10 characters.",
            borrow: { field: "fields.word", line: "Year one" },
          },
          {
            heading: "A Valentine they send back",
            how: "Every tap leaves a lipstick print. Ask for twelve and a screenshot.",
            borrow: { field: "message", line: "Kiss this page twelve times, screenshot it and send it to me." },
          },
          {
            heading: "For the group chat",
            how: "Ten pages to choose from, lilac and noir among them, and nine photos.",
            borrow: { field: "fields.headline", line: "my girls" },
          },
          {
            heading: "The first kiss, with the time",
            how: "The first caption is handwritten on the big polaroid. Use it for place and hour.",
            borrow: { field: "caption", line: "outside the kebab shop, 1:40 a.m." },
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
        title: "Qué escribir en una tarjeta de amor XOXO",
        items: [
          {
            heading: "El nombre que solo usas tú",
            how: "Letras recortadas de periódico, una palabra por fila. Tres palabras como mucho.",
            borrow: { field: "fields.headline", line: "mi peor idea" },
          },
          {
            heading: "Unas frases como vuestra canción",
            how: "Va montada como la letra de una canción. Escribe la estrofa que le falta.",
            borrow: { field: "fields.lines", line: "me pones los pies helados encima en enero y no me he apartado ni una sola vez." },
          },
          {
            heading: "Una palabra para el primer aniversario",
            how: "La segunda polaroid lleva una sola palabra en cursiva, de hasta 10 caracteres.",
            borrow: { field: "fields.word", line: "Año uno" },
          },
          {
            heading: "Un San Valentín con respuesta",
            how: "Cada toque deja una marca de pintalabios. Pide doce y una captura.",
            borrow: { field: "message", line: "Besa esta página doce veces, haz una captura y mándamela." },
          },
          {
            heading: "Para tu grupo, no tu pareja",
            how: "Diez páginas para elegir, entre ellas lila y noir, y nueve fotos.",
            borrow: { field: "fields.headline", line: "mi gente" },
          },
          {
            heading: "El primer beso, con la hora",
            how: "El primer pie va escrito a mano en la polaroid: pon sitio y hora.",
            borrow: { field: "caption", line: "en la puerta del kebab, 1:40 de la madrugada" },
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
        title: "Cases to bring before the council of cats",
        items: [
          {
            heading: "An anniversary charge, counted",
            how: "Write it as a crime and put a number in it. Three years, to the night.",
            borrow: { field: "fields.charge", line: "stealing the duvet on 1,095 consecutive nights" },
          },
          {
            heading: "A birthday that gets Approved",
            how: "Turn the findings into a performance review for a friend’s thirtieth.",
            borrow: { field: "fields.findings", line: "has remembered every birthday except their own" },
          },
          {
            heading: "A case against the cat",
            how: "Put the cat on trial and send it to whoever feeds him.",
            borrow: { field: "fields.charge", line: "knocking a full glass off the table, on purpose" },
          },
          {
            heading: "Photos, entered as evidence",
            how: "Up to six photos, tagged Exhibit A to F. Caption them like evidence bags.",
            borrow: { field: "caption", line: "the hoodie in question, on the accused" },
          },
          {
            heading: "Five jokes, then the true one",
            how: "The cats read six findings in order. Make the sixth a real thank-you.",
            borrow: { field: "fields.findings", line: "drove four hours when I called and never brought it up again" },
          },
          {
            heading: "A ruling that drops the act",
            how: "Your letter is typed like a court document. Leave the voice in the last line.",
            borrow: { field: "message", line: "Off the record: this household has never liked anyone more." },
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
        title: "Qué cargos presentar ante el consejo de gatos",
        items: [
          {
            heading: "Un cargo de aniversario, con cifra",
            how: "Escríbelo como un delito y ponle número. Tres años, noche a noche.",
            borrow: { field: "fields.charge", line: "robar el edredón 1.095 noches seguidas" },
          },
          {
            heading: "Un cumpleaños con el visto bueno",
            how: "Convierte las conclusiones en una evaluación de desempeño para los treinta de alguien.",
            borrow: { field: "fields.findings", line: "se acuerda de todos los cumpleaños menos del suyo" },
          },
          {
            heading: "Un juicio contra el gato",
            how: "Sienta al gato en el banquillo y mándaselo a quien le da de comer.",
            borrow: { field: "fields.charge", line: "tirar un vaso lleno de la mesa, a propósito" },
          },
          {
            heading: "Fotos presentadas como pruebas",
            how: "Hasta seis fotos, de Prueba A a Prueba F, con pies de bolsa de pruebas.",
            borrow: { field: "caption", line: "la sudadera en cuestión, puesta en quien la robó" },
          },
          {
            heading: "Cinco bromas y la de verdad",
            how: "Los gatos leen seis conclusiones en orden. Que la sexta sea un gracias de verdad.",
            borrow: { field: "fields.findings", line: "condujo cuatro horas cuando llamé y nunca lo ha vuelto a mencionar" },
          },
          {
            heading: "Una sentencia que se sincera",
            how: "Tu carta va a máquina, como un documento judicial. Suelta el tono en la última línea.",
            borrow: { field: "message", line: "Fuera de acta: en esta casa nunca hemos querido tanto a nadie." },
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
            heading: "Mother’s Day, named on the pot",
            how: "The tag reads “for” and the name you give: type what you call her.",
            borrow: { field: "title", line: "For the woman who waters everyone else’s" },
          },
          {
            heading: "An apology with nothing around it",
            how: "Stickers and pot off, a white daisy. It opens only while they hold the screen.",
            borrow: { field: "message", line: "I’m sorry. I was wrong about Saturday, and unkind about it." },
          },
          {
            heading: "A Valentine from the next room",
            how: "Send it from the kitchen. The last card tells them where to go.",
            borrow: { field: "surprise.text", line: "Dinner’s on the table. Bring the phone, I want to see your face." },
          },
          {
            heading: "Flowers for a hospital ward",
            how: "Some wards don’t allow fresh flowers. Up to eight photos float up around this one.",
            borrow: { field: "caption", line: "Pepper, waiting by your chair" },
          },
          {
            heading: "A peony in November",
            how: "Real peonies flower for a few weeks in spring. This one ignores the calendar.",
            borrow: { field: "title", line: "The only peony open in November" },
          },
          {
            heading: "A colour that means something",
            how: "Match the petals to a thing you both know: the first flat’s front door.",
            borrow: { field: "title", line: "The yellow of the kitchen on Albert Road" },
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
            heading: "Para mamá, con su nombre",
            how: "La etiqueta pone «para» y el nombre que escribas: pon cómo la llamas tú.",
            borrow: { field: "title", line: "Para quien riega las plantas de todo el mundo" },
          },
          {
            heading: "Una disculpa sin nada alrededor",
            how: "Sin pegatinas ni maceta, una margarita blanca. Solo se abre mientras mantienen pulsada la pantalla.",
            borrow: { field: "message", line: "Perdóname. Me equivoqué con lo del sábado y encima lo dije de malas maneras." },
          },
          {
            heading: "San Valentín desde la cocina",
            how: "Mándalo desde la habitación de al lado. La última tarjeta dice adónde ir.",
            borrow: { field: "surprise.text", line: "La cena está en la mesa. Tráete el móvil, que quiero verte la cara." },
          },
          {
            heading: "Flores para una planta de hospital",
            how: "En algunas no dejan entrar flores naturales. Hasta ocho fotos suben alrededor de esta.",
            borrow: { field: "caption", line: "Canela, esperando junto a tu sillón" },
          },
          {
            heading: "Una peonía en noviembre",
            how: "Las de verdad florecen unas semanas en primavera. Esta no mira el calendario.",
            borrow: { field: "title", line: "La única peonía abierta en noviembre" },
          },
          {
            heading: "Un color que signifique algo",
            how: "Copia en los pétalos algo que conozcáis los dos: la puerta del primer piso.",
            borrow: { field: "title", line: "El amarillo de la cocina de la calle Olmo" },
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
        title: "What to send across the miles between you",
        items: [
          {
            heading: "The places you’ve met halfway",
            how: "Add up to four stops. The bubble appears as the plane passes the middle.",
            borrow: { field: "fields.halfwayNote", line: "Lyon. You missed the train and we got an extra day." },
          },
          {
            heading: "Your own number",
            how: "Type in the distance the way you count it: 412 km, door to door.",
            borrow: { field: "fields.halfwayNote", line: "This is where I pull over for the bad coffee." },
          },
          {
            heading: "The last postcard",
            how: "For the week the distance ends. The title opens the back of the postcard.",
            borrow: { field: "title", line: "Last postcard from this address," },
          },
          {
            heading: "A parent to a student",
            how: "Home on one island, the university town on the other, a balloon for the plane.",
            borrow: { field: "fields.halfwayNote", line: "Halfway. Dad says check your tyre pressure." },
          },
          {
            heading: "The countdown to arrivals",
            how: "Set it to the minute you land and give it a label of your own.",
            borrow: { field: "countdown.label", line: "Until I’m at arrivals, holding the stupid sign" },
          },
          {
            heading: "Ask for one back",
            how: "The end offers “Send one back”, and the first reply is free.",
            borrow: { field: "message", line: "Your turn. Fly one back before Sunday." },
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
        title: "Qué enviar cuando hay kilómetros de por medio",
        items: [
          {
            heading: "Los sitios a medio camino",
            how: "Añade hasta cuatro paradas. El bocadillo aparece cuando el avión pasa por el medio.",
            borrow: { field: "fields.halfwayNote", line: "Bogotá. Perdiste el vuelo y ganamos un día." },
          },
          {
            heading: "Tu propio número",
            how: "Escribe la distancia como la cuentas tú: 412 km, de puerta a puerta.",
            borrow: { field: "fields.halfwayNote", line: "Esta es el área de servicio del café malo." },
          },
          {
            heading: "La última postal",
            how: "Para la semana en que se acaba la distancia. El título abre el reverso.",
            borrow: { field: "title", line: "Última postal desde esta dirección:" },
          },
          {
            heading: "Para quien estudia fuera",
            how: "La casa en una isla, la universidad en la otra, y un globo por avión.",
            borrow: { field: "fields.halfwayNote", line: "Mitad de camino. Dice tu padre que mires las ruedas." },
          },
          {
            heading: "La cuenta atrás hasta llegadas",
            how: "Ponla en el minuto en que aterrizas y rotúlala tú.",
            borrow: { field: "countdown.label", line: "Hasta que esté en llegadas con el cartel ridículo" },
          },
          {
            heading: "Pide una de vuelta",
            how: "Al final aparece «Hazle uno a» con tu nombre, y la primera respuesta es gratis.",
            borrow: { field: "message", line: "Te toca. Mándame uno de vuelta antes del domingo." },
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
        title: "What to write on the snowman’s sign",
        items: [
          {
            heading: "First Christmas at a new address",
            how: "The snowman’s blackboard takes 36 characters. Say where you are this year.",
            borrow: { field: "fields.sign", line: "first christmas at number 12" },
          },
          {
            heading: "A snowman who says you’re outside",
            how: "Send it from their doorstep. They wipe the frost and the board comes clear.",
            borrow: { field: "fields.sign", line: "open the front door. it’s cold." },
          },
          {
            heading: "Two stockings, two cities",
            how: "Your names hang on two stockings. Count down to the day you share a fireplace.",
            borrow: { field: "countdown.label", line: "Until both stockings hang in one room" },
          },
          {
            heading: "A private joke in the frost",
            how: "The title is drawn in the frost. The snowman gets the rest of the insult.",
            borrow: { field: "title", line: "made you look" },
          },
          {
            heading: "The present too big to wrap",
            how: "Let the sign promise it and the hidden card at the end deliver it.",
            borrow: { field: "surprise.text", line: "Two seats, the 28th, row C. Wear the green coat." },
          },
          {
            heading: "The year in eight prints",
            how: "For grandparents on Christmas morning: eight photos, in the order the year happened.",
            borrow: { field: "caption", line: "March. The flat with the mustard carpet." },
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
        title: "Qué escribir en el cartel del muñeco de nieve",
        items: [
          {
            heading: "La primera Navidad en casa nueva",
            how: "La pizarra del muñeco admite 36 caracteres. Este año, di dónde estáis.",
            borrow: { field: "fields.sign", line: "primera navidad en el número 12" },
          },
          {
            heading: "Un muñeco que avisa: estás fuera",
            how: "Mándalo desde su portal. Limpia la escarcha y la pizarra queda a la vista.",
            borrow: { field: "fields.sign", line: "abre la puerta, que hace frío" },
          },
          {
            heading: "Dos calcetines, dos ciudades",
            how: "Vuestros nombres cuelgan en dos calcetines. Cuenta atrás hasta el día en que compartáis chimenea.",
            borrow: { field: "countdown.label", line: "Hasta que los dos cuelguen en la misma casa" },
          },
          {
            heading: "Una broma privada en la escarcha",
            how: "El título va dibujado en la escarcha. El muñeco remata la faena.",
            borrow: { field: "title", line: "has picado" },
          },
          {
            heading: "El regalo que no cabe",
            how: "Que el cartel lo prometa y la tarjeta escondida del final lo entregue.",
            borrow: { field: "surprise.text", line: "Dos butacas, el día 28, fila C. Ponte el abrigo verde." },
          },
          {
            heading: "El año en ocho copias",
            how: "Para los abuelos, la mañana de Navidad: ocho fotos en el orden del año.",
            borrow: { field: "caption", line: "Marzo. El piso de las cortinas mostaza." },
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
        title: "Five things to be thankful for, and how to write them",
        items: [
          {
            heading: "Five lines that grow",
            how: "Start with the smallest daily thing and make the fifth the whole of it.",
            borrow: { field: "fields.thanks", line: "the heating you turn on before I’m up" },
          },
          {
            heading: "For whoever is cooking",
            how: "Send it at seven, while the turkey is still a problem.",
            borrow: { field: "fields.thanks", line: "the gravy only you get right" },
          },
          {
            heading: "Friendsgiving, one candle each",
            how: "Five candles, five friends. Put a name at the front of every line.",
            borrow: { field: "fields.thanks", line: "Dani: for the sofa, all of March" },
          },
          {
            heading: "The first Thanksgiving away",
            how: "List what you’ll miss at that table, bad parts included.",
            borrow: { field: "fields.thanks", line: "the argument about the stuffing" },
          },
          {
            heading: "After a hard year",
            how: "Thankful doesn’t have to mean cheerful. Name the days someone carried you.",
            borrow: { field: "title", line: "It was a hard year. Thank you for being in it." },
          },
          {
            heading: "The toast you’d never give",
            how: "Your letter is read a few sentences at a time. Write it in beats.",
            borrow: { field: "message", line: "To Mum. Now sit down, all of you, it’s going cold." },
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
        title: "Cinco cosas por las que dar las gracias, y cómo escribirlas",
        items: [
          {
            heading: "Cinco frases que van a más",
            how: "Empieza por lo más pequeño de cada día y que la quinta lo diga todo.",
            borrow: { field: "fields.thanks", line: "la calefacción que pones antes de que me levante" },
          },
          {
            heading: "Para quien cocina",
            how: "Mándaselo a las siete, cuando el pavo todavía es un problema.",
            borrow: { field: "fields.thanks", line: "la salsa que solo te sale a ti" },
          },
          {
            heading: "Una vela por cada amigo",
            how: "Cinco velas, cinco amigos. Pon un nombre al principio de cada frase.",
            borrow: { field: "fields.thanks", line: "Dani: por el sofá, todo marzo" },
          },
          {
            heading: "El primer año lejos de casa",
            how: "Lo que vas a echar de menos de esa mesa, lo malo incluido.",
            borrow: { field: "fields.thanks", line: "la discusión por el relleno" },
          },
          {
            heading: "Después de un año difícil",
            how: "Dar las gracias no obliga a estar alegre. Nombra los días en que cargaron contigo.",
            borrow: { field: "title", line: "Ha sido un año difícil. Gracias por estar en él." },
          },
          {
            heading: "El brindis que nunca darías",
            how: "Tu carta se lee unas pocas frases cada vez. Escríbela con pausas.",
            borrow: { field: "message", line: "Por mamá. Y ahora sentaos todos, que se enfría." },
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
        title: "What to spell out in lights",
        items: [
          {
            heading: "Twelve letters or fewer",
            how: "The board spells 28 characters in bulbs; twelve or fewer are drawn largest.",
            borrow: { field: "fields.sign", line: "HOME, MIA" },
          },
          {
            heading: "A question that waits",
            how: "The words stay dark until every bulb is hung and the switch is thrown.",
            borrow: { field: "fields.sign", line: "MOVE IN WITH ME?" },
          },
          {
            heading: "For whoever does the lights",
            how: "Give them a roof they can string with one finger.",
            borrow: { field: "title", line: "Your turn to stand in the garden and point" },
          },
          {
            heading: "December, one card at a time",
            how: "Eight photos, a card apiece, with the caption handwritten underneath.",
            borrow: { field: "caption", line: "The 1st: the tree that didn’t fit in the car." },
          },
          {
            heading: "One house to the whole street",
            how: "Send a single link to the neighbours’ group, signed from your door.",
            borrow: { field: "fields.sign", line: "FROM NUMBER 14, WITH LOVE" },
          },
          {
            heading: "Timed for the dark",
            how: "Schedule it for five on Christmas Eve; until then the link shows a countdown.",
            borrow: { field: "title", line: "It’s dark out. Fix that." },
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
        title: "Qué escribir con luces",
        items: [
          {
            heading: "Doce letras o menos",
            how: "El cartel admite 28 caracteres en bombillas; con doce o menos salen más grandes.",
            borrow: { field: "fields.sign", line: "EN CASA, MIA" },
          },
          {
            heading: "Una pregunta que espera",
            how: "Las palabras siguen apagadas hasta colgar la última bombilla y dar al interruptor.",
            borrow: { field: "fields.sign", line: "¿TE VIENES A VIVIR CONMIGO?" },
          },
          {
            heading: "Para quien siempre pone las luces",
            how: "Regálale un tejado que se decora con un dedo.",
            borrow: { field: "title", line: "Este año opinas tú desde el jardín" },
          },
          {
            heading: "Diciembre, tarjeta a tarjeta",
            how: "Ocho fotos, una por tarjeta, con el pie escrito a mano debajo.",
            borrow: { field: "caption", line: "Día 1: el árbol que no cabía en el coche." },
          },
          {
            heading: "Para toda la calle",
            how: "Manda un solo enlace al grupo de vecinos, firmado desde tu puerta.",
            borrow: { field: "fields.sign", line: "DESDE EL 14, CON CARIÑO" },
          },
          {
            heading: "A la hora en que oscurece",
            how: "Prográmalo para las cinco del 24; hasta entonces el enlace enseña una cuenta atrás.",
            borrow: { field: "title", line: "Está oscuro. Arréglalo." },
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
            heading: "A house for a small decorator",
            how: "Seven kinds of sweet, a tube of icing, and nobody saying that’s enough.",
            borrow: { field: "message", line: "Once there was a house with no sweets on it. Somebody had to fix that." },
          },
          {
            heading: "The tradition, at a distance",
            how: "No two houses come out the same. Decorate one each and trade screenshots.",
            borrow: { field: "message", line: "Send me a photo of yours first. Worst roof does the washing-up in January." },
          },
          {
            heading: "First Christmas in a new home",
            how: "The title is piped in icing on the book inside. Give the address its own.",
            borrow: { field: "title", line: "Number 9, finally" },
          },
          {
            heading: "Your grandmother’s recipe",
            how: "The letter opens as a small book. Put her recipe in it, step by step.",
            borrow: { field: "message", line: "Melt the butter with the syrup. Do not walk away from it." },
          },
          {
            heading: "One house for the whole class",
            how: "Every child sticks on one sweet. The door can open after the sixth.",
            borrow: { field: "title", line: "Class 3B’s house" },
          },
          {
            heading: "Christmas Eve, children asleep",
            how: "One parent to the other, at midnight, from the far end of the sofa.",
            borrow: { field: "title", line: "We survived the 24th" },
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
        title: "Qué esconder dentro de una casita de jengibre virtual",
        items: [
          {
            heading: "Para alguien de seis años",
            how: "Siete tipos de dulces, un tubo de glaseado y nadie diciendo que ya vale.",
            borrow: { field: "message", line: "Había una vez una casita sin un solo dulce. Alguien tenía que arreglarlo." },
          },
          {
            heading: "La tradición, a distancia",
            how: "No hay dos casitas iguales. Decorad una cada uno e intercambiad capturas.",
            borrow: { field: "message", line: "Mándame antes una foto de la tuya. El peor tejado friega en enero." },
          },
          {
            heading: "La primera Navidad en casa nueva",
            how: "El título va trazado con glaseado en el librito de dentro. Ponle el suyo.",
            borrow: { field: "title", line: "El número 9, por fin" },
          },
          {
            heading: "La receta de tu abuela",
            how: "La carta se abre como un librito. Mete su receta, paso a paso.",
            borrow: { field: "message", line: "Derrite la mantequilla con la miel. Y no te vayas de ahí." },
          },
          {
            heading: "Una casita para toda la clase",
            how: "Cada niño pega un dulce. La puerta se puede abrir a partir del sexto.",
            borrow: { field: "title", line: "La casita de 3.º B" },
          },
          {
            heading: "Nochebuena, con los niños dormidos",
            how: "De una mitad de la pareja a la otra, a medianoche, desde el sofá.",
            borrow: { field: "title", line: "Hemos sobrevivido al 24" },
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
            heading: "Two homes for a December apart",
            how: "Choose “Your two homes” and the globe holds two houses with their lights on.",
            borrow: { field: "fields.plaque", line: "two addresses, one december" },
          },
          {
            heading: "One memory in every flurry",
            how: "Each time the snow settles, a line or a photo has appeared in it.",
            borrow: { field: "fields.lines", line: "The year the tree fell on the cat, and the cat won." },
          },
          {
            heading: "A first Christmas, engraved",
            how: "For a baby’s first December: the tree and presents, and a plaque with a date.",
            borrow: { field: "fields.plaque", line: "Noa’s first snow · December 2026" },
          },
          {
            heading: "The cabin, not Christmas",
            how: "For the anniversary of a trip, with a P.S. that opens on a shake.",
            borrow: { field: "surprise.text", line: "I booked it again. Same cabin, the 14th of February." },
          },
          {
            heading: "For a friend who moved away",
            how: "The little village, lamplit, and two lines about home that only work in order.",
            borrow: { field: "fields.lines", line: "Your chair at the pub is still yours." },
          },
          {
            heading: "For a grandparent’s tablet",
            how: "Nobody has to shake anything: two buttons under the globe do all of it.",
            borrow: { field: "fields.plaque", line: "from all four of us, with snow" },
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
            heading: "Dos casas, un diciembre a distancia",
            how: "Elige «Vuestras dos casas» y la bola guarda dos casitas con la luz encendida.",
            borrow: { field: "fields.plaque", line: "dos direcciones, un solo diciembre" },
          },
          {
            heading: "Un recuerdo en cada nevada",
            how: "Cada vez que la nieve se posa ha aparecido una frase o una foto.",
            borrow: { field: "fields.lines", line: "El año que el árbol se le cayó encima al gato, y ganó el gato." },
          },
          {
            heading: "Una primera Navidad, grabada",
            how: "Para el primer diciembre de un bebé: el árbol con regalos y una placa con fecha.",
            borrow: { field: "fields.plaque", line: "La primera nieve de Noa · 2026" },
          },
          {
            heading: "La cabaña, no la Navidad",
            how: "Para el aniversario de aquel viaje, con una posdata que se abre agitando.",
            borrow: { field: "surprise.text", line: "La he vuelto a reservar. La misma cabaña, el 14 de febrero." },
          },
          {
            heading: "Para alguien que se fue lejos",
            how: "El pueblecito, a la luz de la lámpara, y dos frases que solo funcionan en orden.",
            borrow: { field: "fields.lines", line: "Tu silla del bar sigue siendo tuya." },
          },
          {
            heading: "Para la tableta de los abuelos",
            how: "Nadie tiene que agitar nada: dos botones bajo la bola lo hacen todo.",
            borrow: { field: "fields.plaque", line: "de los cuatro, con nieve" },
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
        title: "What to put on a naughty or nice list",
        items: [
          {
            heading: "Crimes with numbers in them",
            how: "A crime reads better counted. Pair each one with a good deed.",
            borrow: { field: "fields.naughty", line: "left one sip of milk in the carton. nine times." },
          },
          {
            heading: "A list for a child",
            how: "It is signed “head elf”, so give yourself an elf’s name. Keep the crime small.",
            borrow: { field: "fields.naughty", line: "hid the peas under the mash. twice." },
          },
          {
            heading: "All crimes, for a sibling",
            how: "Leave the good deeds empty and stamp it naughty. The presents are still approved.",
            borrow: { field: "fields.naughty", line: "borrowed my charger in 2023. still has it." },
          },
          {
            heading: "From the grandchildren",
            how: "Turn it round: the children review the grandparent.",
            borrow: { field: "fields.nice", line: "lets us win at cards (we noticed)" },
          },
          {
            heading: "Photographic evidence",
            how: "Up to eight photos, filed as “the evidence” and held with paper clips.",
            borrow: { field: "caption", line: "seen here: the last roast potato, leaving" },
          },
          {
            heading: "Christmas Eve, or late",
            how: "Through January the list still reads the year just gone. Own up in the title.",
            borrow: { field: "title", line: "the results are late. so was the sleigh." },
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
        title: "Qué poner en una lista de Papá Noel",
        items: [
          {
            heading: "Fechorías con cifras",
            how: "Una fechoría gana con un número. Emparéjala con una buena obra.",
            borrow: { field: "fields.naughty", line: "deja un sorbo de leche en el brik. nueve veces." },
          },
          {
            heading: "Una lista para un niño",
            how: "Va firmada «de parte de los elfos»: ponte nombre de elfo. Que la fechoría sea pequeña.",
            borrow: { field: "fields.naughty", line: "esconde los guisantes bajo el puré. dos veces." },
          },
          {
            heading: "Solo fechorías, entre hermanos",
            how: "Deja vacías las buenas obras y séllala con «Carbón». Los regalos se aprueban igual.",
            borrow: { field: "fields.naughty", line: "me cogió el cargador en 2023. sigue en su poder." },
          },
          {
            heading: "De parte de los nietos",
            how: "Dale la vuelta: los niños evalúan a la abuela o al abuelo.",
            borrow: { field: "fields.nice", line: "nos deja ganar a las cartas (lo sabemos)" },
          },
          {
            heading: "Pruebas fotográficas",
            how: "Hasta ocho fotos, archivadas como «las pruebas» y sujetas con clips.",
            borrow: { field: "caption", line: "aquí, la última patata asada, dándose a la fuga" },
          },
          {
            heading: "En Nochebuena, o para Reyes",
            how: "En enero la lista sigue marcando el año que acaba de terminar. Avísalo en el título.",
            borrow: { field: "title", line: "ya hay veredicto, y sus majestades lo saben" },
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
            heading: "A number that means something",
            how: "30 for a thirtieth birthday, 52 for a first anniversary, 100 for the classic.",
            borrow: { field: "fields.label", line: "52 reasons, one for every week of us" },
          },
          {
            heading: "Evidence, not adjectives",
            how: "Begin each note with a verb. Short ones look best on the slip.",
            borrow: { field: "fields.reasons", line: "You warm the car up before I’ve found my shoes." },
          },
          {
            heading: "A jar for your dad",
            how: "The label is yours to change. Write what he thought nobody saw.",
            borrow: { field: "fields.reasons", line: "You waited up, then pretended you’d fallen asleep." },
          },
          {
            heading: "Photos on the first notes",
            how: "Your first photo rides on your first reason. Captions don’t show, so say it there.",
            borrow: { field: "fields.reasons", line: "This face. This exact face. Lisbon, 2023." },
          },
          {
            heading: "One note from everyone",
            how: "Collect one reason from each person and put their name inside the note.",
            borrow: { field: "fields.reasons", line: "Because you taught me to shuffle cards. (Leo)" },
          },
          {
            heading: "The note that isn’t a reason",
            how: "Hide one piece of news among the reasons. The jar decides when it comes out.",
            borrow: { field: "fields.reasons", line: "Not a reason. I bought the tickets. We leave on the 9th." },
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
            heading: "Un número que signifique algo",
            how: "30 para quien cumple treinta, 52 para un primer aniversario, 100 para el clásico.",
            borrow: { field: "fields.label", line: "52 razones, una por cada semana contigo" },
          },
          {
            heading: "Pruebas, no adjetivos",
            how: "Empieza cada nota por un verbo. Las cortas son las que mejor quedan.",
            borrow: { field: "fields.reasons", line: "Calientas el coche antes de que yo haya encontrado los zapatos." },
          },
          {
            heading: "Un frasco para tu padre",
            how: "La etiqueta se puede cambiar. Escribe lo que hizo creyendo que nadie miraba.",
            borrow: { field: "fields.reasons", line: "Hiciste como que los ruedines seguían puestos." },
          },
          {
            heading: "Fotos en las primeras notas",
            how: "Tu primera foto va con tu primera razón. Los pies no salen: dilo en la nota.",
            borrow: { field: "fields.reasons", line: "Esta cara. Esta cara exacta. Lisboa, 2023." },
          },
          {
            heading: "Una nota de cada persona",
            how: "Pide una razón a cada persona y pon su nombre dentro de la nota.",
            borrow: { field: "fields.reasons", line: "Porque me enseñaste a barajar. (Leo)" },
          },
          {
            heading: "La nota que no es razón",
            how: "Esconde una noticia entre las razones. El frasco decide cuándo sale.",
            borrow: { field: "fields.reasons", line: "Esto no es una razón. He comprado los billetes. Salimos el día 9." },
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
            heading: "A first year, month by month",
            how: "Twelve photos, twelve labels, a screen each. The label can simply be the month.",
            borrow: { field: "caption", line: "Month three: you met my mother and survived." },
          },
          {
            heading: "The morning of the wedding",
            how: "From your first photo to last night’s rehearsal, counting down to the ceremony.",
            borrow: { field: "fields.ending", line: "…and at four o’clock, the next part." },
          },
          {
            heading: "Labels that aren’t dates",
            how: "The label is free text, so name the eras the way the two of you do.",
            borrow: { field: "fields.dates", line: "The flat with no oven" },
          },
          {
            heading: "From first uniform to the gown",
            how: "A graduation timeline from a parent, captioned with what you never said.",
            borrow: { field: "caption", line: "You were terrified. You went in anyway." },
          },
          {
            heading: "Every visit, airports included",
            how: "For long distance, make each milestone a visit, labelled like a boarding card.",
            borrow: { field: "fields.dates", line: "LIS → BOS, visit four" },
          },
          {
            heading: "News at the road’s end",
            how: "The last milestone stays hidden until they scroll to it.",
            borrow: { field: "fields.ending", line: "…and then there were three." },
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
            heading: "El primer año, mes a mes",
            how: "Doce fotos, doce rótulos, una pantalla cada una. El rótulo puede ser solo el mes.",
            borrow: { field: "caption", line: "Mes tres: conociste a mi madre y sobreviviste." },
          },
          {
            heading: "La mañana de la boda",
            how: "De vuestra primera foto a la del ensayo de anoche, con cuenta atrás hasta la ceremonia.",
            borrow: { field: "fields.ending", line: "…y a las cuatro, la parte que sigue." },
          },
          {
            heading: "Rótulos que no son fechas",
            how: "El rótulo es texto libre: nombra las épocas como las nombráis vosotros.",
            borrow: { field: "fields.dates", line: "El piso sin horno" },
          },
          {
            heading: "Del primer uniforme a la toga",
            how: "Una línea del tiempo de graduación, con lo que no dijisteis entonces en los pies.",
            borrow: { field: "caption", line: "Te morías de miedo. Entraste igual." },
          },
          {
            heading: "Cada visita, con sus aeropuertos",
            how: "A distancia, haz de cada hito una visita y rotúlalo como una tarjeta de embarque.",
            borrow: { field: "fields.dates", line: "LIS → BOG, cuarta visita" },
          },
          {
            heading: "Una noticia al final del camino",
            how: "El último hito no se ve hasta que bajan hasta él.",
            borrow: { field: "fields.ending", line: "…y entonces fuimos tres." },
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
        title: "What to stick in a digital scrapbook",
        items: [
          {
            heading: "A year of you two",
            how: "The title is spelled in letters cut from magazines, 28 characters at most.",
            borrow: { field: "fields.headline", line: "one year of us" },
          },
          {
            heading: "A real photo-booth strip",
            how: "Photos two, three and four print as one strip. Use three from the same minute.",
            borrow: { field: "fields.tag", line: "the fair · four tries · worth it" },
          },
          {
            heading: "A holiday with a friend",
            how: "On the Seaside pages, the fifth photo is cut into a postage stamp.",
            borrow: { field: "fields.headline", line: "greece, badly planned" },
          },
          {
            heading: "Long distance: what you kept",
            how: "The torn note holds one handwritten line. Use it for the thing you kept.",
            borrow: { field: "fields.quote", line: "I still have the boarding pass from the first time. It’s my bookmark." },
          },
          {
            heading: "A page in your mother’s words",
            how: "Give the pinned note her three most repeated lines. A middle dot starts a new line.",
            borrow: { field: "fields.tag", line: "take a jacket · eat something · ring me" },
          },
          {
            heading: "The year, January to December",
            how: "On New Year’s Eve, twelve photos, one from each month, on the black film pages.",
            borrow: { field: "message", line: "Same again next year, minus the food poisoning." },
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
        title: "Qué pegar en un álbum de recortes digital",
        items: [
          {
            heading: "Un año de vosotros dos",
            how: "El título va en letras recortadas de revistas y admite 28 caracteres.",
            borrow: { field: "fields.headline", line: "nuestro primer año" },
          },
          {
            heading: "Una tira de fotomatón de verdad",
            how: "Las fotos dos, tres y cuatro salen como una tira. Usa tres del mismo minuto.",
            borrow: { field: "fields.tag", line: "la cabina de la feria · 4 € · lo valió" },
          },
          {
            heading: "Unas vacaciones entre amigos",
            how: "En las páginas de Playa, la quinta foto se recorta como un sello de correos.",
            borrow: { field: "fields.headline", line: "grecia, mal planeado" },
          },
          {
            heading: "A distancia: lo que guardaste",
            how: "La nota rasgada lleva una frase a mano. Úsala para ese objeto que guardaste.",
            borrow: { field: "fields.quote", line: "Aún tengo la tarjeta de embarque de la primera vez. La uso de marcapáginas." },
          },
          {
            heading: "Las frases de tu madre",
            how: "Dale la nota con chincheta a sus tres frases. Un punto medio abre línea nueva.",
            borrow: { field: "fields.tag", line: "llévate chaqueta · come algo · llámame" },
          },
          {
            heading: "El año, de enero a diciembre",
            how: "En Nochevieja, doce fotos, una de cada mes, en las páginas de película en negro.",
            borrow: { field: "message", line: "El año que viene, lo mismo, pero sin la intoxicación." },
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
