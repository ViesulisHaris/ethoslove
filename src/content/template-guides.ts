import { noteForEveryone } from "@/lib/gift/free-tier";
import type { GiftLocale } from "@/lib/gift/schema";

/**
 * More for the template pages that searches have started to find (Search Console, 9 Nov 2026): the
 * "digital scratch card" searches came to about 150 impressions in four weeks at positions 20 to
 * 65, "digital bouquet" 40 at about 11, "digital fortune cookie" 30 at about 7. Their titles
 * already say the phrase; what the pages lacked was depth. So each gets what people make with it,
 * with lines to borrow, and answers to the questions people typed ("share scratch card whatsapp",
 * "digital bouquet with letter"). Every limit and behaviour is the template's own: its schema.ts,
 * field-meta.ts and Template.tsx.
 *
 * - `ideas`: a numbered list under the page's three steps.
 * - `faq`: added to the page's questions, and to its FAQPage markup.
 *
 * Since 20 Nov 2026 the best sellers, the Christmas gifts and the ones Valentine's will need have
 * a guide too. From then on every line a guide lends says which field it is for (`borrow`), and
 * tests/unit/template-guides.test.ts reads that field's limit from the template's own schema: a
 * line that would not fit where the page says to put it fails the build.
 */

/**
 * Where a borrowed line goes: a field every gift has, or one of the template's own ("fields.sign").
 * "note" is the free Letter's whole text, which the free version keeps short (lib/gift/free-tier.ts).
 */
export type BorrowField = "title" | "message" | "note" | "caption" | "countdown.label" | "surprise.text" | "recipientName" | "senderName" | `fields.${string}`;

export type TemplateGuideIdea = {
  heading: string;
  body: string;
  /** The lines the body lends, exactly as it quotes them, each with the field it would be typed into. */
  borrow?: { field: BorrowField; line: string }[];
};

export type TemplateGuideFaq = {
  q: string;
  a: string;
  /** True only while the free version is the short note: asked and answered while it is, left out when it isn't. */
  whileFreeNote?: true;
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
            heading: "A proposal they scratch their way to",
            body: "Three or four cards of the two of you, in order: the first photo you took together, the trip, last week. Caption each with a line of the story (captions run to 140 characters) and put the question on the last card: “Will you marry me?” The cover only says the big one is on the last card, so nothing gives it away. Be in the room for that one.",
            borrow: [{ field: "fields.finalTitle", line: "Will you marry me?" }],
          },
          {
            heading: "A pregnancy announcement for family far away",
            body: "A photo of your shoes by the front door, then the same shoes with a tiny third pair, then the scan. The last card: “See you in June, Grandma.” Send the same link to everyone at once, so nobody hears it second-hand on the phone.",
            borrow: [{ field: "fields.finalTitle", line: "See you in June, Grandma." }],
          },
          {
            heading: "Asking your bridesmaids, one card each",
            body: "Make one for each friend: your photos together from school to now, a caption per card with the memory behind it, and the last card asks “Will you be my bridesmaid?” The foil on every card carries 30 characters of your own, like “for Mia’s eyes only”.",
            borrow: [{ field: "fields.finalTitle", line: "Will you be my bridesmaid?" }, { field: "fields.foilText", line: "for Mia’s eyes only" }],
          },
          {
            heading: "A trip, one clue per card",
            body: "Clues they can almost guess: a passport, a beach towel, a croissant, each captioned like a packing note (“bring the good sunglasses”). The last card names it: “Lisbon. Friday. Pack tonight.” For a departures board and a boarding pass, Pack Your Bags tells the whole trip; this is the quicker reveal.",
            borrow: [{ field: "caption", line: "bring the good sunglasses" }, { field: "fields.finalTitle", line: "Lisbon. Friday. Pack tonight." }],
          },
          {
            heading: "A birthday with the real present at the end",
            body: "Fill the cards with the year’s photos and caption them like lottery prizes: “Prize: one more year of my cooking.” The last card is the actual present: “Two tickets, row F, the 14th.” It works because they expect one more joke and get the real thing.",
            borrow: [{ field: "caption", line: "Prize: one more year of my cooking." }, { field: "fields.finalTitle", line: "Two tickets, row F, the 14th." }],
          },
          {
            heading: "News that deserves more than a text",
            body: "A new job, the keys to a new place, a dog: show the before on the first cards (the old desk, the old view, the empty dog bed) and put the after on the last one. The foil is your call: gold to look like a lottery ticket, holographic to look like good news, rose gold for something soft.",
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
            heading: "Una pedida que se descubre rascando",
            body: "Tres o cuatro tarjetas con fotos vuestras en orden: la primera que os hicisteis, el viaje, la semana pasada. Ponle a cada una una línea de la historia (el pie admite 140 caracteres) y deja la pregunta para la última: «¿Te casas conmigo?». La portada solo dice que lo más grande está en la última, así que nada lo desvela. Esa, mejor en persona.",
            borrow: [{ field: "fields.finalTitle", line: "¿Te casas conmigo?" }],
          },
          {
            heading: "Un anuncio de embarazo para la familia que vive lejos",
            body: "Una foto de vuestros zapatos en la entrada, luego los mismos con un tercer par diminuto, luego la ecografía. Última tarjeta: «Nos vemos en junio, abuela». Manda el mismo enlace a todos a la vez, para que nadie se entere de rebote por teléfono.",
            borrow: [{ field: "fields.finalTitle", line: "Nos vemos en junio, abuela" }],
          },
          {
            heading: "Pedírselo a tus damas de honor, una tarjeta para cada una",
            body: "Haz una para cada amiga: vuestras fotos desde el colegio hasta hoy, un pie con el recuerdo de cada una y, en la última, «¿Quieres ser mi dama de honor?». El metalizado de cada tarjeta admite 30 caracteres tuyos, como «solo para los ojos de Mía».",
            borrow: [{ field: "fields.finalTitle", line: "¿Quieres ser mi dama de honor?" }, { field: "fields.foilText", line: "solo para los ojos de Mía" }],
          },
          {
            heading: "Un viaje, una pista por tarjeta",
            body: "Pistas que casi se adivinan: un pasaporte, una toalla de playa, un cruasán, cada una con un pie de lista de equipaje («trae las gafas de sol buenas»). La última lo dice: «Lisboa. Viernes. Haz la maleta esta noche». Para un panel de salidas y una tarjeta de embarque, Haz la maleta cuenta el viaje entero; esto es la versión rápida.",
            borrow: [{ field: "caption", line: "trae las gafas de sol buenas" }, { field: "fields.finalTitle", line: "Lisboa. Viernes. Haz la maleta esta noche" }],
          },
          {
            heading: "Un cumpleaños con el regalo de verdad al final",
            body: "Llena las tarjetas con las fotos del año y ponles pies de premio de lotería: «Premio: un año más de mi cocina». La última es el regalo de verdad: «Dos entradas, fila F, el día 14». Funciona porque espera un chiste más y le llega lo real.",
            borrow: [{ field: "caption", line: "Premio: un año más de mi cocina" }, { field: "fields.finalTitle", line: "Dos entradas, fila F, el día 14" }],
          },
          {
            heading: "Una noticia que merece más que un mensaje",
            body: "Un trabajo nuevo, las llaves de una casa, un perro: enseña el antes en las primeras tarjetas (la mesa vieja, la vista de siempre, la cama del perro vacía) y deja el después para la última. El metalizado lo eliges tú: oro para que parezca un boleto de lotería, holográfico para que parezca una buena noticia, oro rosa para algo suave.",
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
            body: "There are 14 flowers and room for 24 stems, so start with the one they’d pick themselves: ranunculus, poppies, lavender, sunflowers. Then build around it the way a florist does: one flower in the middle, a filler like baby’s breath, and some green behind, eucalyptus or fern.",
          },
          {
            heading: "Your wedding bouquet, again",
            body: "Rebuild it from the photos: the same flowers, the same ribbon (cream satin, red, sage, black or pink) and the same paper. On an anniversary it says more than a new arrangement would.",
          },
          {
            heading: "Sunflowers for a bad week",
            body: "Not every bouquet is romance. Sunflowers in kraft paper for a friend who’s had an awful week, with a card that reads “Look at these, not the news.” The card holds 30 characters; the letter inside holds the rest.",
            borrow: [{ field: "fields.cardNote", line: "Look at these, not the news." }],
          },
          {
            heading: "Flowers across a border",
            body: "Sending real flowers abroad is a bet on a courier. This arrives the second you send it and looks the same next spring. Add up to six photos of the two of you; they drop in as polaroids once they’ve read your letter.",
          },
          {
            heading: "An apology that doesn’t shout",
            body: "Whites and blush, no red, kraft paper. Keep the card short (“I was wrong. Sorry.”) and put the real apology in the letter: what you did, and what you’ll do differently.",
            borrow: [{ field: "fields.cardNote", line: "I was wrong. Sorry." }],
          },
          {
            heading: "For your mother, in her colours",
            body: "Peonies or lilies in the colour she always wears, the night background if she likes a little drama, and a card in your words: “Still calling you first.” Mother’s Day is in March or April in the UK and in May in the US; you can schedule it to open that morning.",
            borrow: [{ field: "fields.cardNote", line: "Still calling you first." }],
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
            body: "Hay 14 flores y sitio para 24 tallos, así que empieza por la que elegiría esa persona: ranúnculos, amapolas, lavanda, girasoles. Luego construye alrededor como en una floristería: una flor en el centro, un relleno como la paniculata y algo de verde detrás, eucalipto o helecho.",
          },
          {
            heading: "Vuestro ramo de boda, otra vez",
            body: "Rehazlo a partir de las fotos: las mismas flores, el mismo lazo (raso crema, rojo, salvia, negro o rosa) y el mismo papel. En un aniversario dice más que un ramo nuevo.",
          },
          {
            heading: "Girasoles para una semana mala",
            body: "No todo ramo es romántico. Girasoles en papel kraft para quien ha tenido una semana horrible, con una tarjeta que diga «Mira esto, no las noticias». La tarjeta admite 30 caracteres; la carta de dentro, todo lo demás.",
            borrow: [{ field: "fields.cardNote", line: "Mira esto, no las noticias" }],
          },
          {
            heading: "Flores que cruzan una frontera",
            body: "Mandar flores de verdad al extranjero es fiarse de un mensajero. Esto llega en el segundo en que lo envías y sigue igual la próxima primavera. Añade hasta seis fotos vuestras: caen como polaroids cuando ya han leído tu carta.",
          },
          {
            heading: "Una disculpa sin gritos",
            body: "Blancos y rosa palo, nada de rojo, papel kraft. La tarjeta, corta («Me equivoqué. Perdón.»), y la disculpa de verdad en la carta: qué hiciste y qué vas a hacer distinto.",
            borrow: [{ field: "fields.cardNote", line: "Me equivoqué. Perdón." }],
          },
          {
            heading: "Para tu madre, en sus colores",
            body: "Peonías o lirios del color que siempre lleva, el fondo de noche si le gusta un poco de drama y una tarjeta con tus palabras: «Siempre te llamo primero». En la mayoría de los países de habla hispana el Día de la Madre cae en mayo, cada uno en su fecha; puedes programarlo para que se abra esa mañana.",
            borrow: [{ field: "fields.cardNote", line: "Siempre te llamo primero" }],
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
            body: "The funniest fortunes are oddly specific: “You will lose your keys again on Thursday.” “A stranger will praise your singing. Do not believe them.” Write them like a fortune-teller who has met them; each slip takes 140 characters, so keep the punchline short.",
            borrow: [{ field: "fields.fortunes", line: "You will lose your keys again on Thursday." }, { field: "fields.fortunes", line: "A stranger will praise your singing. Do not believe them." }],
          },
          {
            heading: "Lucky numbers that are your dates",
            body: "One line of lucky numbers prints on every slip. Make them yours: the day you met, their age, the number on the door of your first place, the table from your first date, set out the way a real fortune does it: “14 · 06 · 21 · 7 · 42”.",
            borrow: [{ field: "fields.luckyNumbers", line: "14 · 06 · 21 · 7 · 42" }],
          },
          {
            heading: "Silly first, sweet last",
            body: "The slips come out in the order you write them, and the last cookie opens into your letter. Put the jokes first and make the last fortune the first one that isn’t a joke, so by the time the letter opens they’ve stopped laughing and started listening.",
          },
          {
            heading: "Photos on the first slips",
            body: "Add photos and the first slips carry one each, in order: up to ten, one per fortune, so write at least as many fortunes as photos. Pair the worst photo with the most solemn fortune: “Great fortune awaits the person in this hat.”",
            borrow: [{ field: "fields.fortunes", line: "Great fortune awaits the person in this hat." }],
          },
          {
            heading: "A fortune for every year",
            body: "For a birthday, one fortune for each year they’ve been in your life, up to twenty: “Year three: you will learn to love my cooking. You did not.” Past twenty years, keep the ones with a story.",
            borrow: [{ field: "fields.fortunes", line: "Year three: you will learn to love my cooking. You did not." }],
          },
          {
            heading: "Fortunes about what’s next",
            body: "For a graduation or a new job: “You will finally be paid for being bossy.” “Your calendar will show a free Friday. Do not trust it.” Then one line that isn’t a joke, about how proud you are, in the letter.",
            borrow: [{ field: "fields.fortunes", line: "You will finally be paid for being bossy." }, { field: "fields.fortunes", line: "Your calendar will show a free Friday. Do not trust it." }],
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
            heading: "Fortunas que en realidad son bromas vuestras",
            body: "Las fortunas más graciosas son absurdamente concretas: «El jueves volverás a perder las llaves». «Un desconocido alabará tu forma de cantar. No le creas». Escríbelas como una adivina que os conoce de toda la vida; cada papelito admite 140 caracteres, así que remata corto.",
            borrow: [{ field: "fields.fortunes", line: "El jueves volverás a perder las llaves" }, { field: "fields.fortunes", line: "Un desconocido alabará tu forma de cantar. No le creas" }],
          },
          {
            heading: "Números de la suerte que son vuestras fechas",
            body: "En cada papelito sale una línea de números de la suerte. Haz que sean vuestros: el día que os conocisteis, su edad, el número del portal de vuestra primera casa, la mesa de la primera cita, puestos como en una fortuna de verdad: «14 · 06 · 21 · 7 · 42».",
            borrow: [{ field: "fields.luckyNumbers", line: "14 · 06 · 21 · 7 · 42" }],
          },
          {
            heading: "Lo gracioso primero, lo bonito al final",
            body: "Los papelitos salen en el orden en que los escribes, y la última galleta se abre con tu carta. Pon los chistes primero y que la última fortuna sea la primera que no lo es: así, cuando se abra la carta, ya han dejado de reírse y han empezado a escuchar.",
          },
          {
            heading: "Fotos en los primeros papelitos",
            body: "Si añades fotos, los primeros papelitos llevan una cada uno, en orden: hasta diez, una por fortuna, así que escribe al menos tantas fortunas como fotos. Junta la peor foto con la fortuna más solemne: «Una gran fortuna espera a quien lleva este gorro».",
            borrow: [{ field: "fields.fortunes", line: "Una gran fortuna espera a quien lleva este gorro" }],
          },
          {
            heading: "Una fortuna por cada año",
            body: "Para un cumpleaños, una por cada año que lleva en tu vida, hasta veinte: «Año tres: aprenderás a querer mi cocina. No lo hiciste». Si son más de veinte años, quédate con los que tienen historia.",
            borrow: [{ field: "fields.fortunes", line: "Año tres: aprenderás a querer mi cocina. No lo hiciste" }],
          },
          {
            heading: "Fortunas sobre lo que viene",
            body: "Para una graduación o un trabajo nuevo: «Por fin te pagarán por mandar». «Tu agenda tendrá un viernes libre. No te fíes». Y luego, en la carta, una frase que no sea broma sobre el orgullo que sientes.",
            borrow: [{ field: "fields.fortunes", line: "Por fin te pagarán por mandar" }, { field: "fields.fortunes", line: "Tu agenda tendrá un viernes libre. No te fíes" }],
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
            heading: "An anniversary letter that starts where you started",
            body: "Skip “Dear Ana,”. The greeting takes 60 characters, so start where the two of you started: “To the stranger who took my umbrella,”. Let the letter tell what happened next, a year to a paragraph, and close the loop in the sign-off, which sits right above your name: “Still sharing it,”. On the cover, make the title the date you met.",
            borrow: [{ field: "fields.greeting", line: "To the stranger who took my umbrella," }, { field: "fields.signOff", line: "Still sharing it," }],
          },
          {
            heading: "An apology short enough to be believed",
            body: "Hold it to 500 characters, about five sentences, and it will be read the way you meant it. What you did, with no “but” after it; what it cost them; what changes on Monday. “I was late, I joked about it, and you spent your birthday dinner watching the door.” Choose the linen desk, the lightest of the three: an apology shouldn’t arrive dressed as a date.",
            borrow: [{ field: "note", line: "I was late, I joked about it, and you spent your birthday dinner watching the door." }],
          },
          {
            heading: "A long-distance letter that says when",
            body: "Set the countdown to the minute you land and write its label yourself; it takes 80 characters: “Until I’m the one ringing your doorbell”. The date at the top of the page is the day they open it, so write “by the time you read this”, never “today”. Hide the real news in the P.S., which can be set to open under a held finger: “I moved the flight. I land Thursday, not Saturday.”",
            borrow: [{ field: "countdown.label", line: "Until I’m the one ringing your doorbell" }, { field: "surprise.text", line: "I moved the flight. I land Thursday, not Saturday." }],
          },
          {
            heading: "Ten years, with the number in the wax",
            body: "The seal takes two characters. It carries your initial unless you say otherwise; for a round anniversary, press the number into it: “10”. Title the envelope “Ten years, and I’d still write to you”, choose kraft paper, and give each year one sentence, in order. Sign off above your name with “Same again, please,”.",
            borrow: [{ field: "fields.sealInitial", line: "10" }, { field: "title", line: "Ten years, and I’d still write to you" }, { field: "fields.signOff", line: "Same again, please," }],
          },
          {
            heading: "A letter to open in the car park",
            body: "For the morning of an interview, an exam or a first day. The title is the line on the cover, so make it an instruction: “Open before you walk in”. Write only what they already know and forget when nervous, in short sentences, because the words write themselves out as they read. Sign off with where you’ll be: “Outside at five, with chips,”.",
            borrow: [{ field: "title", line: "Open before you walk in" }, { field: "fields.signOff", line: "Outside at five, with chips," }],
          },
          {
            heading: "A letter from the dog",
            body: "The name under the letter doesn’t have to be yours. For Mother’s Day, Father’s Day or the first week someone is away, sign it as the one who misses them loudest. Greeting: “To the one with the treats,”. Sign-off: “Yours, mostly at dinner time,”. Press a B for Biscuit into the wax and write it the way the dog would: no paragraphs, a lot about the postman.",
            borrow: [{ field: "fields.greeting", line: "To the one with the treats," }, { field: "fields.signOff", line: "Yours, mostly at dinner time," }],
          },
        ],
      },
      faq: [
        {
          q: "Can I add photos to a free love letter?",
          a: "Not to the free note itself, which is your words, a song, a countdown and a hidden P.S. “A note with your photos” adds up to five photos to it and keeps it a note. “Make it special” lifts both limits, to 20 photos and a letter of 4,000 characters, and adds a video and a voice message.",
          whileFreeNote: true,
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
            heading: "Una carta de aniversario que empieza donde empezasteis",
            body: "Olvídate de «Hola, Ana:». El saludo admite 60 caracteres, así que empieza por donde empezó lo vuestro: «A quien se llevó mi paraguas sin pedirlo:». Deja que la carta cuente lo que vino después, un párrafo por año, y cierra el círculo en la despedida, que va justo encima de tu firma: «Seguimos compartiéndolo,». En la portada, que el título sea la fecha en que os conocisteis.",
            borrow: [{ field: "fields.greeting", line: "A quien se llevó mi paraguas sin pedirlo:" }, { field: "fields.signOff", line: "Seguimos compartiéndolo," }],
          },
          {
            heading: "Una disculpa lo bastante corta para que se crea",
            body: "No pases de 500 caracteres, unas cinco frases, y se leerá como la escribiste. Qué hiciste, sin ningún «pero» detrás; qué le costó a la otra persona; qué cambia el lunes. «Llegué tarde, encima hice una broma y te pasaste tu cena de cumpleaños mirando la puerta.» Elige el escritorio de lino, el más claro de los tres: una disculpa no debería llegar vestida de cita.",
            borrow: [{ field: "note", line: "Llegué tarde, encima hice una broma y te pasaste tu cena de cumpleaños mirando la puerta." }],
          },
          {
            heading: "Una carta a distancia que dice cuándo",
            body: "Pon la cuenta atrás en el minuto en que aterrizas y escríbele tú el rótulo, que admite 80 caracteres: «Hasta que sea yo quien llame a tu timbre». La fecha que encabeza la carta es la del día en que la abren, así que escribe «cuando leas esto», nunca «hoy». Y esconde la noticia de verdad en la posdata, que se puede poner para que se destape manteniendo el dedo: «He cambiado el vuelo. Llego el jueves, no el sábado.»",
            borrow: [{ field: "countdown.label", line: "Hasta que sea yo quien llame a tu timbre" }, { field: "surprise.text", line: "He cambiado el vuelo. Llego el jueves, no el sábado." }],
          },
          {
            heading: "Diez años, con el número en el lacre",
            body: "El sello admite dos caracteres. Lleva tu inicial si no dices otra cosa; para un aniversario redondo, estampa el número: «10». Titula el sobre «Diez años y te seguiría escribiendo», elige el papel kraft y dale a cada año una frase, en orden. Despídete, justo encima de tu nombre, con «Otros diez, por favor,».",
            borrow: [{ field: "fields.sealInitial", line: "10" }, { field: "title", line: "Diez años y te seguiría escribiendo" }, { field: "fields.signOff", line: "Otros diez, por favor," }],
          },
          {
            heading: "Una carta para abrir en el aparcamiento",
            body: "Para la mañana de una entrevista, un examen o un primer día. El título es la frase de la portada, así que conviértelo en una instrucción: «Ábrela antes de entrar». Escribe solo lo que esa persona ya sabe y con los nervios se le olvida, en frases cortas, porque las palabras se van escribiendo solas mientras lee. Y despídete diciendo dónde vas a estar: «Fuera a las cinco, con patatas,».",
            borrow: [{ field: "title", line: "Ábrela antes de entrar" }, { field: "fields.signOff", line: "Fuera a las cinco, con patatas," }],
          },
          {
            heading: "Una carta de parte del perro",
            body: "La firma no tiene por qué ser la tuya. Para el Día de la Madre, el Día del Padre o la primera semana que alguien pasa fuera, firma como quien más ruido hace echándole de menos. Saludo: «A quien guarda las chuches:». Despedida: «Tuyo, sobre todo a la hora de cenar,». Estampa una B de Bizcocho en el lacre y escribe como escribiría el perro: sin párrafos y con mucho cartero.",
            borrow: [{ field: "fields.greeting", line: "A quien guarda las chuches:" }, { field: "fields.signOff", line: "Tuyo, sobre todo a la hora de cenar," }],
          },
        ],
      },
      faq: [
        {
          q: "¿Se pueden añadir fotos a una carta de amor gratis?",
          a: "A la nota gratis, no: esa son tus palabras, una canción, una cuenta atrás y una posdata escondida. «Una nota con tus fotos» le añade hasta cinco fotos y sigue siendo una nota. «Hazlo especial» levanta los dos límites, hasta 20 fotos y una carta de 4.000 caracteres, y suma un vídeo y un mensaje de voz.",
          whileFreeNote: true,
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
            heading: "A big birthday, billed like a premiere",
            body: "The sign over the curtain takes 40 characters of your own. Leave it and it reads “Now showing: Ana turns 30”; write it and it can read “30 years in the making: Ana”. Enter the age too: past twelve, the number stands on the cake as candles of its own, and it is printed on the stub of their ticket.",
            borrow: [{ field: "fields.marquee", line: "30 years in the making: Ana" }],
          },
          {
            heading: "One card from the whole group chat",
            body: "Sign it as all of you (the name takes 40 characters: “Everyone at the Friday table”) and ask each friend for one photo and four words. The film strip holds 20 photos, and each caption sits on one line of capitals under its frame, so keep them near 20 characters: “Leo: owes you a dance”. A video can play above the strip: all of you singing, badly.",
            borrow: [{ field: "senderName", line: "Everyone at the Friday table" }, { field: "caption", line: "Leo: owes you a dance" }],
          },
          {
            heading: "A seventh birthday, with seven candles",
            body: "Up to twelve, the cake carries one candle for every year, so a seven-year-old counts seven and blows out seven. Set the candles to swipe only and nobody has to explain a microphone permission to a child; a swipe up is the blow. For grandparents sending from far away, let the sign do the shouting: “Now showing: Leo is SEVEN”.",
            borrow: [{ field: "fields.marquee", line: "Now showing: Leo is SEVEN" }],
          },
          {
            heading: "Midnight, to the minute",
            body: "Schedule it for 00:00 on the day and send the link the evening before. Until then it shows your name, the hour it opens and a countdown, and at midnight it turns into the curtain. Put the present in the P.S., the hidden card at the very end: “Look under your pillow. No, the other pillow.”",
            borrow: [{ field: "surprise.text", line: "Look under your pillow. No, the other pillow." }],
          },
          {
            heading: "A birthday you’re missing",
            body: "If you’re in another city, let them blow the candles out for real: they tap “Use microphone”, blow at the phone, and the flames go out a few at a time, the way they do on a cake. Under your letter, set the countdown to your next visit and label it “Until I bring the real cake”.",
            borrow: [{ field: "countdown.label", line: "Until I bring the real cake" }],
          },
          {
            heading: "The roast",
            body: "Your letter is printed like the programme handed out at a premiere, under a line of your own. Make that line the title of the film: “A life in six questionable haircuts”. Caption the frames by year (“2009: the fringe”), write the letter as a review, and put two asterisks either side of the pull quote to print it bold: “Four stars. Would attend again.”",
            borrow: [{ field: "title", line: "A life in six questionable haircuts" }, { field: "caption", line: "2009: the fringe" }, { field: "message", line: "Four stars. Would attend again." }],
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
          a: "One for each year up to twelve. From thirteen on, the age stands on top as number candles, with six small ones on the tier below. Leave the age empty and the cake gets five.",
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
            heading: "Un cumpleaños redondo, anunciado como un estreno",
            body: "El cartel luminoso sobre el telón admite 40 caracteres tuyos. Si lo dejas vacío pone «Hoy: Ana cumple 30»; si lo escribes puede poner «30 años de rodaje: Ana». Indica también la edad: a partir de trece, el número se planta sobre la tarta con velas propias y sale impreso en el resguardo de su entrada.",
            borrow: [{ field: "fields.marquee", line: "30 años de rodaje: Ana" }],
          },
          {
            heading: "Una tarjeta de todo el grupo",
            body: "Firmadla entre todos (el nombre admite 40 caracteres: «Los de la mesa de los viernes») y pedid a cada amigo una foto y cuatro palabras. La tira de película admite 20 fotos y cada pie va en una sola línea de mayúsculas bajo su fotograma, así que no paséis de unos 20 caracteres: «Leo: te debe un baile». Encima de la tira cabe un vídeo: todos cantando, mal.",
            borrow: [{ field: "senderName", line: "Los de la mesa de los viernes" }, { field: "caption", line: "Leo: te debe un baile" }],
          },
          {
            heading: "Un séptimo cumpleaños, con sus siete velas",
            body: "Hasta los doce, la tarta lleva una vela por año, así que quien cumple siete cuenta siete y sopla siete. Pon las velas en «solo deslizar» y nadie tendrá que explicarle a un niño qué es un permiso de micrófono: deslizar hacia arriba es soplar. Si la mandan los abuelos desde lejos, que grite el cartel: «Hoy: Leo cumple SIETE».",
            borrow: [{ field: "fields.marquee", line: "Hoy: Leo cumple SIETE" }],
          },
          {
            heading: "A medianoche, en punto",
            body: "Prográmala para las 00:00 del día y manda el enlace la noche anterior. Hasta entonces enseña tu nombre, la hora a la que se abre y una cuenta atrás, y a medianoche se convierte en el telón. Deja el regalo para la posdata, la tarjeta escondida del final: «Mira debajo de la almohada. No, de la otra.»",
            borrow: [{ field: "surprise.text", line: "Mira debajo de la almohada. No, de la otra." }],
          },
          {
            heading: "Un cumpleaños al que no llegas",
            body: "Si estás en otra ciudad, que apague las velas de verdad: toca «Usar el micrófono», sopla al móvil y las llamas se van apagando de pocas en pocas, como en una tarta. Debajo de tu carta, pon la cuenta atrás hasta tu próxima visita y rotúlala «Hasta que lleve la tarta de verdad».",
            borrow: [{ field: "countdown.label", line: "Hasta que lleve la tarta de verdad" }],
          },
          {
            heading: "El homenaje con guasa",
            body: "Tu carta sale impresa como el programa de mano de un estreno, bajo una línea tuya. Haz que esa línea sea el título de la película: «Una vida en seis cortes de pelo dudosos». Pon el año en el pie de cada fotograma («2009: el flequillo»), escribe la carta como una crítica y deja en negrita la frase de cartel, con dos asteriscos a cada lado: «Cuatro estrellas. Repetiría.»",
            borrow: [{ field: "title", line: "Una vida en seis cortes de pelo dudosos" }, { field: "caption", line: "2009: el flequillo" }, { field: "message", line: "Cuatro estrellas. Repetiría." }],
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
          a: "Una por año hasta los doce. A partir de trece, la edad va arriba en velas con forma de número y en el piso de abajo quedan seis pequeñas. Si no indicas la edad, la tarta lleva cinco.",
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
            body: "Give each place you’ve been together a star, in the order you went, and caption the photo with the place and the hour: “Porto, the bridge at 2 a.m.” The line that appears when the last star is found takes 120 characters, so let it count them: “Six cities so far. You pick the seventh.”",
            borrow: [{ field: "caption", line: "Porto, the bridge at 2 a.m." }, { field: "fields.finalLine", line: "Six cities so far. You pick the seventh." }],
          },
          {
            heading: "A question in the last line",
            body: "Nothing on the cover gives the ending away: it shows a star chart with their name and nothing else. The final line appears once every star has been found and the shape has drawn itself, with a Continue button under it. Put the question there, and be in the room: “Will you marry me? Look up from the phone.”",
            borrow: [{ field: "fields.finalLine", line: "Will you marry me? Look up from the phone." }],
          },
          {
            heading: "A birthday sky for your dad",
            body: "One star for each thing he taught you, with a photo of you doing it: the bike, the first car, the first shelf that stayed up. Captions carry 140 characters, room enough for the truth: “You let go of the saddle and didn’t tell me.” Choose the star shape and the dawn sky, and sign the letter with the name he still calls you.",
            borrow: [{ field: "caption", line: "You let go of the saddle and didn’t tell me." }],
          },
          {
            heading: "The story told backwards",
            body: "The constellation is drawn through the stars in the order of your photos, each one joined to the next as it is found. So put last week first and the day you met last, and let the captions count down. The final star is the oldest photo you have of the two of you: “And this is where it started.”",
            borrow: [{ field: "caption", line: "And this is where it started." }],
          },
          {
            heading: "The same sky, two time zones",
            body: "For long distance, pick the dawn sky if they’ll wake up to it. Label the countdown under your letter “Until we’re under the same one”, and set the P.S. to open with a shake, so they have to rattle the phone to read it: “Go to your window at ten tonight. I’ll be at mine.”",
            borrow: [{ field: "countdown.label", line: "Until we’re under the same one" }, { field: "surprise.text", line: "Go to your window at ten tonight. I’ll be at mine." }],
          },
          {
            heading: "Three stars: then, now, next",
            body: "A sky needs only three photos. Make the first an old one, the second from this month, and the third something that hasn’t happened yet: the keys, the boarding passes, the scan. They won’t know it’s news until the caption says so: “This one is in March. Pack a coat.”",
            borrow: [{ field: "caption", line: "This one is in March. Pack a coat." }],
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
          a: "Between 3 and 12. Each photo becomes one star, and the constellation is drawn through them in the order you put them, so arrange them like a story.",
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
            body: "Dale una estrella a cada sitio en el que habéis estado, en el orden en que fuisteis, y pon en el pie el lugar y la hora: «Oporto, el puente a las 2 de la mañana». La frase que aparece cuando se encuentra la última estrella admite 120 caracteres, así que deja que las cuente: «Seis ciudades por ahora. La séptima la eliges tú.»",
            borrow: [{ field: "caption", line: "Oporto, el puente a las 2 de la mañana" }, { field: "fields.finalLine", line: "Seis ciudades por ahora. La séptima la eliges tú." }],
          },
          {
            heading: "Una pregunta en la última frase",
            body: "Nada en la portada adelanta el final: enseña una carta celeste con su nombre y nada más. La frase final aparece cuando se han encontrado todas las estrellas y la figura se ha dibujado sola, con un botón de «Continuar» debajo. Pon ahí la pregunta y procura estar delante: «¿Te casas conmigo? Levanta la vista del móvil.»",
            borrow: [{ field: "fields.finalLine", line: "¿Te casas conmigo? Levanta la vista del móvil." }],
          },
          {
            heading: "Un cielo de cumpleaños para tu padre",
            body: "Una estrella por cada cosa que te enseñó, con una foto tuya haciéndola: la bici, el primer coche, la primera balda que no se cayó. Los pies admiten 140 caracteres, sitio de sobra para la verdad: «Soltaste el sillín y no me avisaste.» Elige la forma de estrella y el cielo de amanecer, y firma la carta con el nombre por el que aún te llama.",
            borrow: [{ field: "caption", line: "Soltaste el sillín y no me avisaste." }],
          },
          {
            heading: "La historia contada al revés",
            body: "La constelación se traza de estrella en estrella en el orden de tus fotos, y cada una se une a la siguiente según las van encontrando. Así que pon primero la semana pasada y al final el día en que os conocisteis, y que los pies vayan hacia atrás. La última estrella es la foto más antigua que tengáis de los dos: «Y aquí empezó todo.»",
            borrow: [{ field: "caption", line: "Y aquí empezó todo." }],
          },
          {
            heading: "El mismo cielo, dos husos horarios",
            body: "A distancia, elige el cielo de amanecer si lo va a abrir al despertarse. Rotula la cuenta atrás de debajo de tu carta «Hasta que estemos bajo el mismo» y pon la posdata para que se abra agitando el móvil, así tendrá que sacudirlo para leerla: «Asómate a la ventana esta noche a las diez. Yo estaré en la mía.»",
            borrow: [{ field: "countdown.label", line: "Hasta que estemos bajo el mismo" }, { field: "surprise.text", line: "Asómate a la ventana esta noche a las diez. Yo estaré en la mía." }],
          },
          {
            heading: "Tres estrellas: antes, ahora, después",
            body: "Un cielo solo necesita tres fotos. Que la primera sea antigua, la segunda de este mes y la tercera algo que aún no ha pasado: las llaves, las tarjetas de embarque, la ecografía. No sabrá que es una noticia hasta que lo diga el pie: «Esta es en marzo. Llévate abrigo.»",
            borrow: [{ field: "caption", line: "Esta es en marzo. Llévate abrigo." }],
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
          a: "Entre 3 y 12. Cada foto se convierte en una estrella y la constelación se traza por ellas en el orden en que las pones, así que ordénalas como una historia.",
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
            body: "The headline is cut out of newspaper letters, one word to a row, and takes 16 characters. It says “my person” if you leave it; “my plus one” is better, and the nickname nobody else is allowed to use is better still. Three words at most, because each gets a row of its own.",
            borrow: [{ field: "fields.headline", line: "my plus one" }],
          },
          {
            heading: "Lines written like your song",
            body: "The card under the first photo is laid out like a lyric card: your song’s title on top, your first photo as its cover, then up to 220 characters of your own. Write the verse that song is missing: “you put your cold feet on me in January and I have never once moved away.” Pen marks land on parts of it by themselves, so short clauses work best.",
            borrow: [{ field: "fields.lines", line: "you put your cold feet on me in January and I have never once moved away." }],
          },
          {
            heading: "One word for a first anniversary",
            body: "The second polaroid carries a single word in script where its caption would be, up to 10 characters, “Love” unless you change it. For a first anniversary, try “Year one”; for moving in together, “Home”. That photo’s own caption won’t show, so put the photos whose captions matter first and third.",
            borrow: [{ field: "fields.word", line: "Year one" }, { field: "fields.word", line: "Home" }],
          },
          {
            heading: "A Valentine they send back",
            body: "Every tap on the page leaves a lipstick print where the finger landed. Across a distance, turn that into a reply: end your letter with “Kiss this page twelve times, screenshot it and send it to me.” The page keeps the last sixteen prints, so all twelve will be in the picture.",
            borrow: [{ field: "message", line: "Kiss this page twelve times, screenshot it and send it to me." }],
          },
          {
            heading: "A card for the group chat, not a partner",
            body: "It doesn’t have to be red, or romantic. There are ten pages to choose from, lilac, sage, baby blue and noir among them. Send one to your friends on 13 February with “my girls” in the cut-out letters, “Always” on the second photo, and nine photos, the most the page takes.",
            borrow: [{ field: "fields.headline", line: "my girls" }, { field: "fields.word", line: "Always" }],
          },
          {
            heading: "The first kiss, with the time on it",
            body: "The first photo’s caption is handwritten along the bottom of the big polaroid, next to a scribbled heart. Use it for the place and the hour instead of a feeling: “outside the kebab shop, 1:40 a.m.” The third photo sits in a black frame further down; make it the newest one you have.",
            borrow: [{ field: "caption", line: "outside the kebab shop, 1:40 a.m." }],
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
            body: "El titular va en letras recortadas de periódico, una palabra por fila, y admite 16 caracteres. Si lo dejas vacío pone «mi persona»; «mi peor idea» es mejor, y el mote que nadie más puede usar, mejor todavía. Tres palabras como mucho, porque cada una ocupa su fila.",
            borrow: [{ field: "fields.headline", line: "mi peor idea" }],
          },
          {
            heading: "Unas frases escritas como vuestra canción",
            body: "La tarjeta de debajo de la primera foto está montada como una tarjeta de letra de canción: arriba el título de la vuestra, tu primera foto como portada y después hasta 220 caracteres tuyos. Escribe la estrofa que le falta: «me pones los pies helados encima en enero y no me he apartado ni una sola vez.» Los trazos de boli caen solos sobre algunas partes, así que funcionan mejor las frases cortas.",
            borrow: [{ field: "fields.lines", line: "me pones los pies helados encima en enero y no me he apartado ni una sola vez." }],
          },
          {
            heading: "Una palabra para el primer aniversario",
            body: "La segunda polaroid lleva una sola palabra en cursiva donde iría su pie, de hasta 10 caracteres: «Amor», si no la cambias. Para un primer aniversario, prueba «Año uno»; para estrenar casa juntos, «Hogar». El pie de esa foto no se ve, así que pon en primer y tercer lugar las fotos cuyos pies importan.",
            borrow: [{ field: "fields.word", line: "Año uno" }, { field: "fields.word", line: "Hogar" }],
          },
          {
            heading: "Un San Valentín con respuesta",
            body: "Cada toque en la página deja una marca de pintalabios donde cayó el dedo. A distancia, conviértelo en una respuesta: termina tu carta con «Besa esta página doce veces, haz una captura y mándamela.» La página conserva las dieciséis últimas marcas, así que las doce saldrán en la foto.",
            borrow: [{ field: "message", line: "Besa esta página doce veces, haz una captura y mándamela." }],
          },
          {
            heading: "Una tarjeta para tu grupo, no para tu pareja",
            body: "No tiene por qué ser roja ni romántica. Hay diez páginas para elegir, entre ellas lila, salvia, azul bebé y noir. Mándasela a tu gente el 14 de febrero con «mi gente» en las letras recortadas, «Siempre» en la segunda foto y nueve fotos, el máximo que admite la página.",
            borrow: [{ field: "fields.headline", line: "mi gente" }, { field: "fields.word", line: "Siempre" }],
          },
          {
            heading: "El primer beso, con la hora puesta",
            body: "El pie de la primera foto va escrito a mano en la parte baja de la polaroid grande, junto a un corazón garabateado. Úsalo para el sitio y la hora, no para un sentimiento: «en la puerta del kebab, 1:40 de la madrugada». La tercera foto va más abajo, en un marco negro; que sea la más reciente que tengáis.",
            borrow: [{ field: "caption", line: "en la puerta del kebab, 1:40 de la madrugada" }],
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
            heading: "An anniversary charge with a number in it",
            body: "The charge follows the words “charged with” on the courtroom wall and takes 60 characters, so write it as a crime and count it: “stealing the duvet on 1,095 consecutive nights”. Three years, to the night. Choose Guilty and the sentence is already written: one hug, to be served immediately.",
            borrow: [{ field: "fields.charge", line: "stealing the duvet on 1,095 consecutive nights" }],
          },
          {
            heading: "A birthday that gets Approved",
            body: "There are four stamps, and Approved comes with a line of its own: this human may proceed to be celebrated. For a friend’s thirtieth, turn the findings into a performance review, 90 characters each: “has remembered every birthday except their own”. Certified icon suits a graduation or a new job, signed off by four cats and one shark.",
            borrow: [{ field: "fields.findings", line: "has remembered every birthday except their own" }],
          },
          {
            heading: "A case against the cat",
            body: "The name on the wall doesn’t have to be a person’s. Put the cat on trial and send it to whoever feeds him. Name: Mochi. Charge: “knocking a full glass off the table, on purpose”. Enter the photographs as exhibits and let him be Pardoned; that ruling forgives all crimes, even the chips.",
            borrow: [{ field: "recipientName", line: "Mochi" }, { field: "fields.charge", line: "knocking a full glass off the table, on purpose" }],
          },
          {
            heading: "Photos, entered as evidence",
            body: "Up to six photos go in above your letter, tagged Exhibit A to F. Each shows one line of its caption on the card and the whole of it when tapped, so write them like labels on an evidence bag: “the hoodie in question, on the accused”. The worse the photo, the stronger the case.",
            borrow: [{ field: "caption", line: "the hoodie in question, on the accused" }],
          },
          {
            heading: "Five jokes, then the true one",
            body: "The cats read your findings one tap at a time, in the order you wrote them, and there is room for six. Make the first five petty. Make the sixth the thing you never thanked them for: “drove four hours when I called and never brought it up again”. Then the gavel comes down three times.",
            borrow: [{ field: "fields.findings", line: "drove four hours when I called and never brought it up again" }],
          },
          {
            heading: "A ruling that drops the act",
            body: "“Read the full ruling” opens your letter, typed like a court document. Keep the voice for two paragraphs (the council sat, the evidence was heard), then leave it in the last line: “Off the record: this household has never liked anyone more.” Add a P.S. and it waits under the ruling for a tap.",
            borrow: [{ field: "message", line: "Off the record: this household has never liked anyone more." }],
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
            body: "El cargo va detrás de «se le acusa de» en la pared de la sala y admite 60 caracteres, así que escríbelo como un delito y ponle número: «robar el edredón 1.095 noches seguidas». Tres años, noche a noche. Elige «Culpable» y la condena ya viene escrita: un abrazo, de cumplimiento inmediato.",
            borrow: [{ field: "fields.charge", line: "robar el edredón 1.095 noches seguidas" }],
          },
          {
            heading: "Un cumpleaños con el visto bueno",
            body: "Hay cuatro sellos, y «Visto bueno» trae su propia frase: esta persona puede proceder a ser celebrada. Para los treinta de alguien, convierte las conclusiones en una evaluación de desempeño, de 90 caracteres cada una: «se acuerda de todos los cumpleaños menos del suyo». «Icono certificado» le va bien a una graduación o a un trabajo nuevo, con la firma de cuatro gatos y un tiburón.",
            borrow: [{ field: "fields.findings", line: "se acuerda de todos los cumpleaños menos del suyo" }],
          },
          {
            heading: "Un juicio contra el gato",
            body: "El nombre de la pared no tiene por qué ser el de una persona. Sienta al gato en el banquillo y mándaselo a quien le da de comer. Nombre: Mochi. Cargo: «tirar un vaso lleno de la mesa, a propósito». Presenta las fotos como pruebas y concédele el «Indulto», que perdona todos los delitos, hasta lo de las patatas.",
            borrow: [{ field: "recipientName", line: "Mochi" }, { field: "fields.charge", line: "tirar un vaso lleno de la mesa, a propósito" }],
          },
          {
            heading: "Fotos presentadas como pruebas",
            body: "Hasta seis fotos van encima de tu carta, etiquetadas de Prueba A a Prueba F. Cada una enseña una línea de su pie en la tarjeta y el pie entero al tocarla, así que escríbelos como la etiqueta de una bolsa de pruebas: «la sudadera en cuestión, puesta en quien la robó». Cuanto peor la foto, más sólido el caso.",
            borrow: [{ field: "caption", line: "la sudadera en cuestión, puesta en quien la robó" }],
          },
          {
            heading: "Cinco bromas y, después, la de verdad",
            body: "Los gatos leen tus conclusiones de toque en toque, en el orden en que las escribiste, y caben seis. Que las cinco primeras sean mezquinas. Que la sexta sea eso por lo que nunca diste las gracias: «condujo cuatro horas cuando llamé y nunca lo ha vuelto a mencionar». Después, el mazo cae tres veces.",
            borrow: [{ field: "fields.findings", line: "condujo cuatro horas cuando llamé y nunca lo ha vuelto a mencionar" }],
          },
          {
            heading: "Una sentencia que al final se quita la toga",
            body: "«Leer la sentencia completa» abre tu carta, escrita a máquina como un documento judicial. Mantén el tono dos párrafos (el consejo deliberó, se oyeron las pruebas) y suéltalo en la última línea: «Fuera de acta: en esta casa nunca hemos querido tanto a nadie.» Si añades una posdata, espera debajo de la sentencia a que la toquen.",
            borrow: [{ field: "message", line: "Fuera de acta: en esta casa nunca hemos querido tanto a nadie." }],
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
            heading: "Mother’s Day, with her name on the pot",
            body: "The tag tied to the pot reads “for” and the name you give, so type what you call her, not her first name: Mum, Mamá, Nana. Pick the peony and set the petals to the colour she wears to weddings. The title sits across the top of the screen: “For the woman who waters everyone else’s”.",
            borrow: [{ field: "title", line: "For the woman who waters everyone else’s" }],
          },
          {
            heading: "An apology with nothing around it",
            body: "Switch off the stickers and the pot, choose the daisy in white on paper white, and the flower stands alone in the light. It opens only while they hold the screen, about three seconds in all, which is as long as a real apology takes to say. Keep the note as plain: “I’m sorry. I was wrong about Saturday, and unkind about it.”",
            borrow: [{ field: "message", line: "I’m sorry. I was wrong about Saturday, and unkind about it." }],
          },
          {
            heading: "A Valentine from the next room",
            body: "Dusk light, a tulip in dark red, and the P.S. set to open under a held finger. Send it from the kitchen while they’re on the sofa. They hold the screen, the flower opens, they read the note, and the last card tells them where to go: “Dinner’s on the table. Bring the phone, I want to see your face.”",
            borrow: [{ field: "surprise.text", line: "Dinner’s on the table. Bring the phone, I want to see your face." }],
          },
          {
            heading: "Flowers for a hospital ward",
            body: "Some wards don’t allow fresh flowers. This one gets past the desk. Choose the daisy at dawn and add the photos they miss most; up to eight float up around the open flower, and each shows its caption when tapped: “Pepper, waiting by your chair”. It will look the same on the day they come home.",
            borrow: [{ field: "caption", line: "Pepper, waiting by your chair" }],
          },
          {
            heading: "The only peony open in November",
            body: "Real peonies flower for a few weeks in late spring. For a winter birthday, send the one that ignores the calendar and say so in the title, which takes 80 characters: “The only peony open in November”. Set the countdown under the note to the week the real ones are due.",
            borrow: [{ field: "title", line: "The only peony open in November" }],
          },
          {
            heading: "A colour that means something",
            body: "The petals take any colour, so skip pink and match a thing the two of you know: the front door of the first flat, the car that never started, the bridesmaids’ dresses. Then name it in the title, for an anniversary: “The yellow of the kitchen on Albert Road”.",
            borrow: [{ field: "title", line: "The yellow of the kitchen on Albert Road" }],
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
            heading: "El Día de la Madre, con su nombre en la maceta",
            body: "La etiqueta atada a la maceta pone «para» y el nombre que escribas, así que pon cómo la llamas tú, no su nombre de pila: Mamá, Mami, Abu. Elige la peonía y dale a los pétalos el color que se pone para las bodas. El título cruza la parte alta de la pantalla: «Para quien riega las plantas de todo el mundo».",
            borrow: [{ field: "title", line: "Para quien riega las plantas de todo el mundo" }],
          },
          {
            heading: "Una disculpa sin nada alrededor",
            body: "Quita las pegatinas y la maceta, elige la margarita en blanco sobre blanco papel, y la flor se queda sola en la luz. Solo se abre mientras mantienen pulsada la pantalla, unos tres segundos en total, que es lo que se tarda en decir una disculpa de verdad. Que la nota sea igual de sencilla: «Perdóname. Me equivoqué con lo del sábado y encima lo dije de malas maneras.»",
            borrow: [{ field: "message", line: "Perdóname. Me equivoqué con lo del sábado y encima lo dije de malas maneras." }],
          },
          {
            heading: "Un San Valentín desde la habitación de al lado",
            body: "Luz de atardecer, un tulipán rojo oscuro y la posdata puesta para abrirse manteniendo el dedo. Mándalo desde la cocina mientras la otra persona está en el sofá. Mantiene pulsada la pantalla, la flor se abre, lee la nota y la última tarjeta le dice adónde ir: «La cena está en la mesa. Tráete el móvil, que quiero verte la cara.»",
            borrow: [{ field: "surprise.text", line: "La cena está en la mesa. Tráete el móvil, que quiero verte la cara." }],
          },
          {
            heading: "Flores para una planta de hospital",
            body: "En algunas plantas de hospital no dejan entrar flores naturales. Esta pasa el control. Elige la margarita al amanecer y añade las fotos que más echa de menos; hasta ocho suben alrededor de la flor abierta y cada una enseña su pie al tocarla: «Canela, esperando junto a tu sillón». El día que vuelva a casa seguirá igual.",
            borrow: [{ field: "caption", line: "Canela, esperando junto a tu sillón" }],
          },
          {
            heading: "La única peonía abierta en noviembre",
            body: "Las peonías de verdad florecen unas pocas semanas a finales de primavera. Para un cumpleaños de invierno, manda la que no mira el calendario y dilo en el título, que admite 80 caracteres: «La única peonía abierta en noviembre». Pon la cuenta atrás de debajo de la nota en la semana en que tocan las de verdad.",
            borrow: [{ field: "title", line: "La única peonía abierta en noviembre" }],
          },
          {
            heading: "Un color que signifique algo",
            body: "Los pétalos admiten cualquier color, así que sáltate el rosa y copia algo que conozcáis los dos: la puerta del primer piso, el coche que nunca arrancaba, los vestidos de las damas de honor. Y nómbralo en el título, para un aniversario: «El amarillo de la cocina de la calle Olmo».",
            borrow: [{ field: "title", line: "El amarillo de la cocina de la calle Olmo" }],
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
            heading: "The places you’ve met in the middle",
            body: "Add up to four stops, in order: the cities where each of you has travelled part of the way. They are counted into the kilometres and written on the back of the postcard as “via Lyon, Milan”. Give the halfway bubble, which appears as the plane passes the middle, to the best of them: “Lyon. You missed the train and we got an extra day.”",
            borrow: [{ field: "fields.halfwayNote", line: "Lyon. You missed the train and we got an extra day." }],
          },
          {
            heading: "Your own number",
            body: "The distance is worked out from the two towns, as the crow flies. If you count it another way, type it in: the 412 km of motorway you drive every other Friday, door to door. Swap the plane for the little bird, and use the halfway line for the place you always stop: “This is the services where I buy the bad coffee.”",
            borrow: [{ field: "fields.halfwayNote", line: "This is the services where I buy the bad coffee." }],
          },
          {
            heading: "The last postcard",
            body: "For the week the distance ends. The title is how the back of the postcard opens, in place of “Dear Clara,”, so make it say which postcard this is: “Last postcard from this address,”. Under the letter, hide the proof in the P.S.: “The lease is signed. Keys on the 1st. Start packing.”",
            borrow: [{ field: "title", line: "Last postcard from this address," }, { field: "surprise.text", line: "The lease is signed. Keys on the 1st. Start packing." }],
          },
          {
            heading: "A parent to a student",
            body: "It isn’t only for couples. Home on one island, the university town on the other, a balloon in place of the plane, and the halfway bubble doing what parents do: “Halfway. Dad says check your tyre pressure.” Tape eight photos beside the letter, the dog first.",
            borrow: [{ field: "fields.halfwayNote", line: "Halfway. Dad says check your tyre pressure." }],
          },
          {
            heading: "The countdown to arrivals",
            body: "Set the countdown under the letter to the minute you land and give it a label of your own, up to 80 characters: “Until I’m at arrivals, holding the stupid sign”. In the letter, say what happens in the first hour. They have just flown the kilometres down to zero; tell them when it happens for real.",
            borrow: [{ field: "countdown.label", line: "Until I’m at arrivals, holding the stupid sign" }],
          },
          {
            heading: "Ask for one back",
            body: "The end of the gift offers “Send one back”, and the first reply is free. It opens with the map already turned round: their town first, yours second, each island still in its owner’s colour. Ask for it in your last line: “Your turn. Fly one back before Sunday.”",
            borrow: [{ field: "message", line: "Your turn. Fly one back before Sunday." }],
          },
        ],
      },
      faq: [
        {
          q: "What if they can’t blow into the phone?",
          a: "A tap on the plane flies it the rest of the way by itself. Blowing needs the microphone, which the phone asks for first; in a quiet office, or with that permission refused, the tap does everything.",
        },
        {
          q: "Is the distance on the map real?",
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
            heading: "Los sitios donde os habéis visto a medio camino",
            body: "Añade hasta cuatro paradas, en orden: las ciudades a las que cada uno ha viajado su parte. Suman kilómetros y quedan escritas en el reverso de la postal como «vía Bogotá, Quito». Dale el bocadillo de la mitad, el que aparece cuando el avión pasa por el medio, a la mejor de todas: «Bogotá. Perdiste el vuelo y ganamos un día.»",
            borrow: [{ field: "fields.halfwayNote", line: "Bogotá. Perdiste el vuelo y ganamos un día." }],
          },
          {
            heading: "Tu propio número",
            body: "La distancia se calcula entre las dos ciudades, en línea recta. Si tú la cuentas de otra manera, escríbela: los 412 km de autovía que haces un viernes sí y otro no, de puerta a puerta. Cambia el avión por el pajarito y usa la frase de la mitad para el sitio donde siempre paras: «Esta es el área de servicio del café malo.»",
            borrow: [{ field: "fields.halfwayNote", line: "Esta es el área de servicio del café malo." }],
          },
          {
            heading: "La última postal",
            body: "Para la semana en que se acaba la distancia. El título es como empieza el reverso de la postal, en lugar de «Hola, Clara:», así que haz que diga qué postal es: «Última postal desde esta dirección:». Debajo de la carta, esconde la prueba en la posdata: «Contrato firmado. Las llaves, el día 1. Ve haciendo cajas.»",
            borrow: [{ field: "title", line: "Última postal desde esta dirección:" }, { field: "surprise.text", line: "Contrato firmado. Las llaves, el día 1. Ve haciendo cajas." }],
          },
          {
            heading: "De una madre o un padre a quien estudia fuera",
            body: "No es solo para parejas. La casa en una isla, la ciudad de la universidad en la otra, un globo en lugar del avión y el bocadillo de la mitad haciendo lo que hacen los padres: «Mitad de camino. Dice tu padre que mires las ruedas.» Pega ocho fotos junto a la carta, la del perro la primera.",
            borrow: [{ field: "fields.halfwayNote", line: "Mitad de camino. Dice tu padre que mires las ruedas." }],
          },
          {
            heading: "La cuenta atrás hasta llegadas",
            body: "Pon la cuenta atrás de debajo de la carta en el minuto en que aterrizas y rotúlala tú, con hasta 80 caracteres: «Hasta que esté en llegadas con el cartel ridículo». En la carta, cuenta qué pasa en la primera hora. Acaba de llevar los kilómetros a cero volando; dile cuándo pasa de verdad.",
            borrow: [{ field: "countdown.label", line: "Hasta que esté en llegadas con el cartel ridículo" }],
          },
          {
            heading: "Pide una de vuelta",
            body: "Al final del regalo aparece «Hazle uno a» con tu nombre, y la primera respuesta es gratis. Se abre con el mapa ya girado: su ciudad primero, la tuya después, y cada isla con el color de su dueño. Pídelo en tu última línea: «Te toca. Mándame uno de vuelta antes del domingo.»",
            borrow: [{ field: "message", line: "Te toca. Mándame uno de vuelta antes del domingo." }],
          },
        ],
      },
      faq: [
        {
          q: "¿Y si no pueden soplar al móvil?",
          a: "Un toque en el avión lo lleva solo el resto del camino. Soplar necesita el micrófono, y el móvil pide permiso antes; en una oficina en silencio, o si no dan ese permiso, el toque lo hace todo.",
        },
        {
          q: "¿La distancia del mapa es real?",
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
            heading: "The first Christmas at a new address",
            body: "The snowman’s blackboard takes 36 characters. Left empty it says “merry christmas” and their name; this year it can say where you are: “first christmas at number 12”. The same words head your letter afterwards, in handwriting, next to a postmark with your name in it.",
            borrow: [{ field: "fields.sign", line: "first christmas at number 12" }],
          },
          {
            heading: "A snowman who says you’re outside",
            body: "Send it from their doorstep. They wipe the frost with a finger, the board comes clear, and it reads “open the front door. it’s cold.” Nothing melts by itself, so the timing is theirs; you only have to stand there. For a flight home nobody was told about, this is the doorbell.",
            borrow: [{ field: "fields.sign", line: "open the front door. it’s cold." }],
          },
          {
            heading: "Two stockings, two cities",
            body: "Under the window hang two stockings with your names on the cuffs: yours on the left, theirs on the right. Names past ten letters are cut short there, so use the short one. For a December apart, set the countdown under your letter to the day you share a fireplace and label it “Until both stockings hang in one room”.",
            borrow: [{ field: "countdown.label", line: "Until both stockings hang in one room" }],
          },
          {
            heading: "A private joke in the frost",
            body: "The title is the first thing they see, drawn in the frost as if by a fingertip. “look outside” is what it says unless you change it; for a brother, a sister or a flatmate, make it “made you look” and let the snowman finish the insult: “merry christmas, you nosy thing”. Choose the log cabin.",
            borrow: [{ field: "title", line: "made you look" }, { field: "fields.sign", line: "merry christmas, you nosy thing" }],
          },
          {
            heading: "The present that won’t fit under a tree",
            body: "Let the sign promise it (“your real present is inside”) and the P.S. deliver it. The hidden card sits at the very end, under the letter and the photos, and opens with a tap: “Two seats, the 28th, row C. Wear the green coat.” Tickets, a trip or a puppy all wrap better this way than in paper.",
            borrow: [{ field: "fields.sign", line: "your real present is inside" }, { field: "surprise.text", line: "Two seats, the 28th, row C. Wear the green coat." }],
          },
          {
            heading: "The year in eight prints",
            body: "Photos arrive as a small stack, like prints out of an envelope: they tap the top one and it goes to the back. Eight fit. Put them in the order the year happened and give each a caption of two short lines at most: “March. The flat with the mustard carpet.” The last print is the one from this week.",
            borrow: [{ field: "caption", line: "March. The flat with the mustard carpet." }],
          },
        ],
      },
      faq: [
        {
          q: "How long can the snowman’s sign be?",
          a: "36 characters, chalked on his blackboard. Left empty it reads “merry christmas” and their name. Whatever it says also heads your letter.",
        },
        {
          q: "Does the frost clear by itself?",
          a: "No. Only what their finger wipes goes clear, and “read the letter” appears once most of the blackboard is showing. On a laptop they drag with the mouse, and from a keyboard Enter clears the pane.",
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
            heading: "La primera Navidad en la casa nueva",
            body: "La pizarra del muñeco admite 36 caracteres. Si la dejas vacía pone «feliz navidad» y su nombre; este año puede decir dónde estáis: «primera navidad en el número 12». Las mismas palabras encabezan después tu carta, escritas a mano, junto a un matasellos con tu nombre.",
            borrow: [{ field: "fields.sign", line: "primera navidad en el número 12" }],
          },
          {
            heading: "Un muñeco que avisa de que estás fuera",
            body: "Mándalo desde su portal. Limpia la escarcha con el dedo, la pizarra queda a la vista y pone «abre la puerta, que hace frío». Nada se derrite solo, así que el momento lo marca quien lo abre; tú solo tienes que estar ahí. Para una vuelta a casa por Navidad de la que nadie sabía nada, este es el timbre.",
            borrow: [{ field: "fields.sign", line: "abre la puerta, que hace frío" }],
          },
          {
            heading: "Dos calcetines, dos ciudades",
            body: "Debajo de la ventana cuelgan dos calcetines con vuestros nombres en el puño: el tuyo a la izquierda y el suyo a la derecha. Los nombres de más de diez letras salen cortados, así que usa el corto. Para un diciembre separados, pon la cuenta atrás de debajo de la carta en el día en que compartáis chimenea y rotúlala «Hasta que los dos cuelguen en la misma casa».",
            borrow: [{ field: "countdown.label", line: "Hasta que los dos cuelguen en la misma casa" }],
          },
          {
            heading: "Una broma privada en la escarcha",
            body: "El título es lo primero que se ve, dibujado en la escarcha como con la yema de un dedo. Pone «mira fuera» si no lo cambias; para un hermano, una hermana o quien comparte piso contigo, pon «has picado» y que el muñeco remate la faena: «feliz navidad, cotilla». Elige la cabaña de troncos.",
            borrow: [{ field: "title", line: "has picado" }, { field: "fields.sign", line: "feliz navidad, cotilla" }],
          },
          {
            heading: "El regalo que no cabe debajo del árbol",
            body: "Que el cartel lo prometa («tu regalo de verdad está dentro») y la posdata lo entregue. La tarjeta escondida va al final del todo, debajo de la carta y las fotos, y se abre con un toque: «Dos butacas, el día 28, fila C. Ponte el abrigo verde.» Unas entradas, un viaje o un cachorro se envuelven mejor así que con papel.",
            borrow: [{ field: "fields.sign", line: "tu regalo de verdad está dentro" }, { field: "surprise.text", line: "Dos butacas, el día 28, fila C. Ponte el abrigo verde." }],
          },
          {
            heading: "El año en ocho copias",
            body: "Las fotos llegan en un montoncito, como copias recién sacadas de un sobre: se toca la de arriba y pasa al fondo. Caben ocho. Ponlas en el orden en que pasó el año y dale a cada una un pie de dos líneas cortas como mucho: «Marzo. El piso de la moqueta mostaza.» La última copia, la de esta semana.",
            borrow: [{ field: "caption", line: "Marzo. El piso de la moqueta mostaza." }],
          },
        ],
      },
      faq: [
        {
          q: "¿Cuánto puede ocupar el cartel del muñeco de nieve?",
          a: "36 caracteres, escritos con tiza en su pizarra. Si lo dejas vacío pone «feliz navidad» y su nombre. Lo que diga encabeza también tu carta.",
        },
        {
          q: "¿La escarcha se quita sola?",
          a: "No. Solo se limpia lo que frota el dedo, y «lee la carta» aparece cuando ya se ve casi toda la pizarra. En un ordenador se arrastra con el ratón y, desde el teclado, Intro limpia el cristal entero.",
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
            body: "Each candle writes one line in light above the table, 60 characters at most, in the order you wrote them, whichever wick they reach first. So build it: start with the smallest daily thing, “the heating you turn on before I’m up”, and let the fifth be the whole of it: “the life you made room in for me”.",
            borrow: [{ field: "fields.thanks", line: "the heating you turn on before I’m up" }, { field: "fields.thanks", line: "the life you made room in for me" }],
          },
          {
            heading: "For whoever is cooking",
            body: "Send it to your mother at seven in the morning, while the turkey is still a problem. Five lines about her table and nobody else’s: “the gravy only you get right”. The title appears in light when the fifth candle catches, and takes 80 characters: “Before the house fills up, thank you”.",
            borrow: [{ field: "fields.thanks", line: "the gravy only you get right" }, { field: "title", line: "Before the house fills up, thank you" }],
          },
          {
            heading: "Friendsgiving, one candle each",
            body: "Five candles, five friends. Put a name at the front of every line and send the one link to the group: “Dani: for the sofa, all of March”. Each of them will light the table waiting for their own name. Six friends means two of them share a candle, which they will bring up for years.",
            borrow: [{ field: "fields.thanks", line: "Dani: for the sofa, all of March" }],
          },
          {
            heading: "The first Thanksgiving away",
            body: "If you can’t get home, list what you’ll miss at that table, bad parts included: “the argument about the stuffing”. Add last year’s photos; after the letter, each appears by itself over the lit candles, with its caption. Put a countdown at the end, labelled “Until I’m back at that table”.",
            borrow: [{ field: "fields.thanks", line: "the argument about the stuffing" }, { field: "countdown.label", line: "Until I’m back at that table" }],
          },
          {
            heading: "After a hard year",
            body: "Thankful doesn’t have to mean cheerful. Name the days someone carried you: “the Tuesday you drove me to the clinic”. Then let the title, which arrives when all five are lit, say the rest: “It was a hard year. Thank you for being in it.”",
            borrow: [{ field: "fields.thanks", line: "the Tuesday you drove me to the clinic" }, { field: "title", line: "It was a hard year. Thank you for being in it." }],
          },
          {
            heading: "The toast you’d never stand up and give",
            body: "Your letter is read a few sentences at a time over the lit candles, with an arrow to move on, so write it in beats, the way a toast is spoken. One memory to a paragraph. End on the line you would raise a glass to: “To Mum. Now sit down, all of you, it’s going cold.”",
            borrow: [{ field: "message", line: "To Mum. Now sit down, all of you, it’s going cold." }],
          },
        ],
      },
      faq: [
        {
          q: "Do I have to write all five lines?",
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
            body: "Cada vela escribe una frase con luz sobre la mesa, de 60 caracteres como mucho, en el orden en que las escribiste, da igual a qué mecha lleguen primero. Así que constrúyelo: empieza por lo más pequeño de cada día, «la calefacción que pones antes de que me levante», y que la quinta lo diga todo: «la vida en la que me hiciste sitio».",
            borrow: [{ field: "fields.thanks", line: "la calefacción que pones antes de que me levante" }, { field: "fields.thanks", line: "la vida en la que me hiciste sitio" }],
          },
          {
            heading: "Para quien cocina",
            body: "Mándaselo a tu madre a las siete de la mañana, cuando el pavo todavía es un problema. Cinco frases sobre su mesa y la de nadie más: «la salsa que solo te sale a ti». El título aparece hecho de luz cuando prende la quinta vela y admite 80 caracteres: «Antes de que se llene la casa, gracias».",
            borrow: [{ field: "fields.thanks", line: "la salsa que solo te sale a ti" }, { field: "title", line: "Antes de que se llene la casa, gracias" }],
          },
          {
            heading: "Una cena de amigos, una vela por cabeza",
            body: "Cinco velas, cinco amigos. Pon un nombre al principio de cada frase y manda el mismo enlace al grupo: «Dani: por el sofá, todo marzo». Cada uno encenderá la mesa esperando su nombre. Si sois seis, dos comparten vela, y os lo recordarán durante años.",
            borrow: [{ field: "fields.thanks", line: "Dani: por el sofá, todo marzo" }],
          },
          {
            heading: "El primer Acción de Gracias lejos de casa",
            body: "Si no puedes volver, haz la lista de lo que vas a echar de menos de esa mesa, lo malo incluido: «la discusión por el relleno». Añade las fotos del año pasado; después de la carta, cada una aparece sola sobre las velas encendidas, con su pie. Y pon al final una cuenta atrás rotulada «Hasta que vuelva a esa mesa».",
            borrow: [{ field: "fields.thanks", line: "la discusión por el relleno" }, { field: "countdown.label", line: "Hasta que vuelva a esa mesa" }],
          },
          {
            heading: "Después de un año difícil",
            body: "Dar las gracias no obliga a estar alegre. Nombra los días en que alguien cargó contigo: «el martes que me llevaste a la clínica». Y que el título, que llega cuando arden las cinco, diga lo demás: «Ha sido un año difícil. Gracias por estar en él.»",
            borrow: [{ field: "fields.thanks", line: "el martes que me llevaste a la clínica" }, { field: "title", line: "Ha sido un año difícil. Gracias por estar en él." }],
          },
          {
            heading: "El brindis que nunca te levantarías a dar",
            body: "Tu carta se lee de pocas frases en pocas frases sobre las velas encendidas, con una flecha para seguir, así que escríbela a golpes, como se dice un brindis. Un recuerdo por párrafo. Y termina con la frase por la que levantarías la copa: «Por mamá. Y ahora sentaos todos, que se enfría.»",
            borrow: [{ field: "message", line: "Por mamá. Y ahora sentaos todos, que se enfría." }],
          },
        ],
      },
      faq: [
        {
          q: "¿Hay que escribir las cinco frases?",
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
          a: "De pocas frases en pocas frases sobre las velas encendidas, con una flecha para seguir. Después de las palabras, cada foto aparece sola con su pie y, al final, la cuenta atrás y la sorpresa escondida.",
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
            body: "The board in the garden takes 28 characters and shows them in capitals, made of bulbs. Twelve or fewer are drawn at the largest size, so the best signs are short: “HOME, MIA” beats a sentence. Left empty, it reads MERRY CHRISTMAS and their name.",
            borrow: [{ field: "fields.sign", line: "HOME, MIA" }],
          },
          {
            heading: "A question that waits for the switch",
            body: "The words stay dark until every bulb is hung and the switch is thrown, and a counter tells them how many are left. That makes the board a good place for a question: “MOVE IN WITH ME?” They will have strung the whole roof before they find out what the house is for.",
            borrow: [{ field: "fields.sign", line: "MOVE IN WITH ME?" }],
          },
          {
            heading: "For the one who always does the lights",
            body: "Some people are on the ladder every December while the rest of the family points. Give them a roof they can string with one finger, and a title over the house, up to 80 characters: “Your turn to stand in the garden and point”. In the letter, admit they were right about the crooked ones.",
            borrow: [{ field: "title", line: "Your turn to stand in the garden and point" }],
          },
          {
            heading: "December, one card at a time",
            body: "Your letter and photos arrive as a small stack of cards, turned with a tap, and a bulb on the string above lights for each one. Eight photos fit, a card apiece, with the caption handwritten underneath. Order them like the month: “The 1st: the tree that didn’t fit in the car.”",
            borrow: [{ field: "caption", line: "The 1st: the tree that didn’t fit in the car." }],
          },
          {
            heading: "From one house to the whole street",
            body: "Send a single link to the neighbours’ group, signed from your door: “FROM NUMBER 14, WITH LOVE”. Pick the house that looks most like yours, barn red, navy blue or sage green. Everyone on the street hangs the same lights on the same roof, and nobody has to hold a ladder.",
            borrow: [{ field: "fields.sign", line: "FROM NUMBER 14, WITH LOVE" }],
          },
          {
            heading: "Timed for the dark",
            body: "The house starts unlit under the stars, so it lands best once it’s dark where they are. Schedule it for five in the afternoon on Christmas Eve; until then the link shows a countdown. Title it “It’s dark out. Fix that.” and let them.",
            borrow: [{ field: "title", line: "It’s dark out. Fix that." }],
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
          q: "How do they read the letter?",
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
            body: "El cartel del jardín admite 28 caracteres y los enseña en mayúsculas, hechos de bombillas. Con doce o menos salen en el tamaño más grande, así que los mejores carteles son cortos: «EN CASA, MIA» gana a cualquier frase. Si lo dejas vacío pone FELIZ NAVIDAD y su nombre.",
            borrow: [{ field: "fields.sign", line: "EN CASA, MIA" }],
          },
          {
            heading: "Una pregunta que espera al interruptor",
            body: "Las palabras siguen apagadas hasta que está colgada la última bombilla y se da al interruptor, y un contador va diciendo cuántas faltan. Eso convierte el cartel en un buen sitio para una pregunta: «¿NOS VAMOS A VIVIR JUNTOS?» Habrá puesto luces en todo el tejado antes de saber para qué era la casa.",
            borrow: [{ field: "fields.sign", line: "¿NOS VAMOS A VIVIR JUNTOS?" }],
          },
          {
            heading: "Para quien siempre pone las luces",
            body: "Hay quien pasa cada diciembre subido a la escalera mientras el resto de la familia opina desde abajo. Regálale un tejado que se decora con un dedo y un título sobre la casa, de hasta 80 caracteres: «Este año opinas tú desde el jardín». En la carta, reconoce que tenía razón con las que estaban torcidas.",
            borrow: [{ field: "title", line: "Este año opinas tú desde el jardín" }],
          },
          {
            heading: "Diciembre, tarjeta a tarjeta",
            body: "Tu carta y tus fotos llegan como un montoncito de tarjetas que se pasan con un toque, y por cada una se enciende una bombilla en la tira de arriba. Caben ocho fotos, una por tarjeta, con el pie escrito a mano debajo. Ordénalas como el mes: «Día 1: el árbol que no cabía en el coche.»",
            borrow: [{ field: "caption", line: "Día 1: el árbol que no cabía en el coche." }],
          },
          {
            heading: "De una casa a toda la calle",
            body: "Manda un solo enlace al grupo de vecinos, firmado desde tu puerta: «DESDE EL 14, CON CARIÑO». Elige la casa que más se parezca a la tuya, rojo granero, azul marino o verde salvia. Toda la calle cuelga las mismas luces en el mismo tejado y nadie tiene que sujetar la escalera.",
            borrow: [{ field: "fields.sign", line: "DESDE EL 14, CON CARIÑO" }],
          },
          {
            heading: "A la hora en que oscurece",
            body: "La casa empieza a oscuras bajo las estrellas, así que luce más cuando ya es de noche donde lo abren. Prográmalo para las cinco de la tarde del 24; hasta entonces el enlace enseña una cuenta atrás. Titúlalo «Está oscuro. Arréglalo.» y deja que lo arregle.",
            borrow: [{ field: "title", line: "Está oscuro. Arréglalo." }],
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
          q: "¿Cómo se lee la carta?",
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
            body: "For a niece, a nephew or a godchild, the decorating is the present: seven kinds of sweet, a tube of icing, an undo button and nobody saying that’s enough. Inside, your letter turns like the pages of a small book, about 200 characters to a page, so write it as a story: “Once there was a house with no sweets on it. Somebody had to fix that.”",
            borrow: [{ field: "message", line: "Once there was a house with no sweets on it. Somebody had to fix that." }],
          },
          {
            heading: "The tradition, played at a distance",
            body: "If you build one together every December and this year you can’t, make it a contest. No two houses come out the same, so ask for proof before they open the door: “Send me a photo of yours first. Worst roof does the washing-up in January.” Open your own link, decorate yours, and trade screenshots.",
            borrow: [{ field: "message", line: "Send me a photo of yours first. Worst roof does the washing-up in January." }],
          },
          {
            heading: "The first Christmas in a new home",
            body: "The title is written over the kitchen and piped in icing on the cover of the book inside. “home sweet home” is what you get if you leave it; a new address deserves its own, and under about 22 characters it is drawn at full size: “Number 9, finally”. Put the before-and-after photos on the pages, each taped in with a caption: “The kitchen, before the wall came down”.",
            borrow: [{ field: "title", line: "Number 9, finally" }, { field: "caption", line: "The kitchen, before the wall came down" }],
          },
          {
            heading: "Your grandmother’s recipe",
            body: "The letter opens as a book with numbered pages and a gingham spine, close to a recipe book already. So put the recipe in it, a step to a paragraph, in her words: “Melt the butter with the syrup. Do not walk away from it.” Add the photo of the card in her handwriting; photos get pages of their own.",
            borrow: [{ field: "message", line: "Melt the butter with the syrup. Do not walk away from it." }],
          },
          {
            heading: "One house for the whole class",
            body: "On a classroom screen or a family tablet, a gingerbread house is a group project. Every child comes up and sticks on one sweet, the door can be opened after the sixth, and the letter inside is from the teacher. Title it for all of them: “Class 3B’s house”.",
            borrow: [{ field: "title", line: "Class 3B’s house" }],
          },
          {
            heading: "Christmas Eve, after the children are asleep",
            body: "One parent to the other, at midnight, from the far end of the sofa. Choose the midnight blue kitchen, call it “We survived the 24th”, and keep the letter to what only the two of you saw: “The bike is built. Nobody cried, including me.” The P.S. says who gets up first.",
            borrow: [{ field: "title", line: "We survived the 24th" }, { field: "message", line: "The bike is built. Nobody cried, including me." }],
          },
        ],
      },
      faq: [
        {
          q: "What can they decorate the house with?",
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
            heading: "Una casita para alguien de seis años",
            body: "Para una sobrina, un sobrino o un ahijado, decorar es el regalo: siete tipos de dulces, un tubo de glaseado, un botón de deshacer y nadie diciendo que ya vale. Dentro, tu carta se pasa como las páginas de un librito, unos 200 caracteres por página, así que escríbela como un cuento: «Había una vez una casita sin un solo dulce. Alguien tenía que arreglarlo.»",
            borrow: [{ field: "message", line: "Había una vez una casita sin un solo dulce. Alguien tenía que arreglarlo." }],
          },
          {
            heading: "La tradición, jugada a distancia",
            body: "Si cada diciembre montáis una juntos y este año no se puede, convertidlo en un concurso. No hay dos casitas iguales, así que pide pruebas antes de que abra la puerta: «Mándame antes una foto de la tuya. El peor tejado friega en enero.» Abre tú también tu enlace, decora la tuya e intercambiad capturas.",
            borrow: [{ field: "message", line: "Mándame antes una foto de la tuya. El peor tejado friega en enero." }],
          },
          {
            heading: "La primera Navidad en casa nueva",
            body: "El título va escrito sobre la cocina y trazado con glaseado en la tapa del librito de dentro. Si lo dejas, pone «hogar, dulce hogar»; una dirección nueva merece el suyo, y con menos de unos 22 caracteres sale a tamaño completo: «El número 9, por fin». Pon en las páginas las fotos del antes y el después, cada una pegada con su pie: «La cocina, antes de tirar el tabique».",
            borrow: [{ field: "title", line: "El número 9, por fin" }, { field: "caption", line: "La cocina, antes de tirar el tabique" }],
          },
          {
            heading: "La receta de tu abuela",
            body: "La carta se abre como un libro con las páginas numeradas y el lomo de cuadros, a un paso de ser un recetario. Así que mete la receta, un paso por párrafo, con sus palabras: «Derrite la mantequilla con la miel. Y no te vayas de ahí.» Añade la foto de la tarjeta con su letra: las fotos tienen página propia.",
            borrow: [{ field: "message", line: "Derrite la mantequilla con la miel. Y no te vayas de ahí." }],
          },
          {
            heading: "Una casita para toda la clase",
            body: "En la pantalla del aula o en la tableta de la familia, una casita de jengibre es un trabajo en grupo. Cada niño sale y pega un dulce, la puerta se puede abrir a partir del sexto y la carta de dentro es de quien da la clase. Titúlala para todos: «La casita de 3.º B».",
            borrow: [{ field: "title", line: "La casita de 3.º B" }],
          },
          {
            heading: "Nochebuena, con los niños ya dormidos",
            body: "De una mitad de la pareja a la otra, a medianoche, desde la otra punta del sofá. Elige la cocina azul medianoche, titúlalo «Hemos sobrevivido al 24» y deja en la carta lo que solo visteis vosotros: «La bici está montada. No ha llorado nadie, yo tampoco.» En la posdata, quién madruga mañana.",
            borrow: [{ field: "title", line: "Hemos sobrevivido al 24" }, { field: "message", line: "La bici está montada. No ha llorado nadie, yo tampoco." }],
          },
        ],
      },
      faq: [
        {
          q: "¿Con qué se puede decorar la casita?",
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
            body: "Choose “Your two homes” and the globe holds two small houses with their lights on, which is what long distance looks like in winter. The brass plaque is engraved after the last shake and takes 44 characters: “two addresses, one december”. Under your letter, count down to the door you’ll knock on.",
            borrow: [{ field: "fields.plaque", line: "two addresses, one december" }],
          },
          {
            heading: "One memory in every flurry",
            body: "Each time the snow settles, one thing has appeared in it: a line of yours, then a photo hanging like an ornament, then a line. Lines take 90 characters, enough for a whole memory: “The year the tree fell on the cat, and the cat won.” Pick three shakes and that is two lines with a photo between them.",
            borrow: [{ field: "fields.lines", line: "The year the tree fell on the cat, and the cat won." }],
          },
          {
            heading: "A first Christmas, engraved",
            body: "For a baby’s first December, or yours as a married couple, choose the tree and presents and let the plaque do what plaques do: “Noa’s first snow · December 2026”. Send it to the grandparents with two shakes, a line and one photo, so the engraving comes quickly.",
            borrow: [{ field: "fields.plaque", line: "Noa’s first snow · December 2026" }],
          },
          {
            heading: "The cabin, not Christmas",
            body: "A snow globe needn’t be about the 25th. Take the cabin in the woods on a frosted morning for the anniversary of the trip, and set the P.S. to open with a shake, since their hand is already moving: “I booked it again. Same cabin, the 14th of February.”",
            borrow: [{ field: "surprise.text", line: "I booked it again. Same cabin, the 14th of February." }],
          },
          {
            heading: "For a friend who moved away",
            body: "The little village, lamplit, and two lines about home that only work in order: “You’d hate how early it gets dark here now.” and then “Your chair at the pub is still yours.” Lines and photos take turns starting with a line, and with two photos or more only your first two lines get a turn. Put those two first.",
            borrow: [{ field: "fields.lines", line: "You’d hate how early it gets dark here now." }, { field: "fields.lines", line: "Your chair at the pub is still yours." }],
          },
          {
            heading: "A globe for a grandparent’s tablet",
            body: "Nobody has to shake anything. Under the globe are two buttons, “shake it” and “turn it over”, and they do all of it on a tablet or a laptop. Choose two shakes so the plaque comes soon, and engrave it with who it’s from: “from all four of us, with snow”.",
            borrow: [{ field: "fields.plaque", line: "from all four of us, with snow" }],
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
            heading: "Dos casas para un diciembre separados",
            body: "Elige «Vuestras dos casas» y la bola guarda dos casitas con la luz encendida, que es la pinta que tiene la distancia en invierno. La placa de latón se graba después de la última sacudida y admite 44 caracteres: «dos direcciones, un solo diciembre». Debajo de tu carta, pon la cuenta atrás hasta la puerta a la que vas a llamar.",
            borrow: [{ field: "fields.plaque", line: "dos direcciones, un solo diciembre" }],
          },
          {
            heading: "Un recuerdo en cada nevada",
            body: "Cada vez que la nieve se posa ha aparecido algo dentro: una frase tuya, luego una foto colgada como un adorno, luego otra frase. Las frases admiten 90 caracteres, lo que ocupa un recuerdo entero: «El año que el árbol se le cayó encima al gato, y ganó el gato.» Con tres sacudidas son dos frases con una foto en medio.",
            borrow: [{ field: "fields.lines", line: "El año que el árbol se le cayó encima al gato, y ganó el gato." }],
          },
          {
            heading: "Una primera Navidad, grabada",
            body: "Para el primer diciembre de un bebé, o el vuestro como matrimonio, elige el árbol con regalos y deja que la placa haga de placa: «La primera nieve de Noa · 2026». Mándasela a los abuelos con dos sacudidas, una frase y una foto, para que el grabado llegue pronto.",
            borrow: [{ field: "fields.plaque", line: "La primera nieve de Noa · 2026" }],
          },
          {
            heading: "La cabaña, no la Navidad",
            body: "Una bola de nieve no tiene por qué hablar del 25. Quédate con la cabaña en el bosque en una mañana de escarcha para el aniversario de aquel viaje y pon la posdata para que se abra agitando, que la mano ya la tiene en marcha: «La he vuelto a reservar. La misma cabaña, el 14 de febrero.»",
            borrow: [{ field: "surprise.text", line: "La he vuelto a reservar. La misma cabaña, el 14 de febrero." }],
          },
          {
            heading: "Para alguien que se fue a vivir lejos",
            body: "El pueblecito, a la luz de la lámpara, y dos frases sobre casa que solo funcionan en orden: «No te gustaría lo pronto que anochece aquí ahora.» y después «Tu silla del bar sigue siendo tuya.» Frases y fotos se turnan empezando por una frase, y con dos fotos o más solo salen tus dos primeras frases. Pon esas dos delante.",
            borrow: [{ field: "fields.lines", line: "No te gustaría lo pronto que anochece aquí ahora." }, { field: "fields.lines", line: "Tu silla del bar sigue siendo tuya." }],
          },
          {
            heading: "Una bola para la tableta de los abuelos",
            body: "Nadie tiene que agitar nada. Debajo de la bola hay dos botones, «agítala» y «dale la vuelta», que lo hacen todo en una tableta o un ordenador. Elige dos sacudidas para que la placa llegue pronto y graba en ella de parte de quién es: «de los cuatro, con nieve».",
            borrow: [{ field: "fields.plaque", line: "de los cuatro, con nieve" }],
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
            body: "A crime reads better counted. Each line takes 50 characters: “left one sip of milk in the carton. nine times.” The list reads a good deed, then a crime, in turn, so write them as pairs and let each good deed nearly cancel the crime after it: “defrosts my windscreen before work, unasked”. Stamp it naughty and nice.",
            borrow: [{ field: "fields.naughty", line: "left one sip of milk in the carton. nine times." }, { field: "fields.nice", line: "defrosts my windscreen before work, unasked" }],
          },
          {
            heading: "A list from the North Pole, for a child",
            body: "The list is signed with your name and the words “head elf”, so give yourself an elf’s name for this one. “Pip” will do. Keep the good deeds true and specific: “fed the cat every morning without being told”. Keep the one crime small: “hid the peas under the mash. twice.” Stamp it nice.",
            borrow: [{ field: "senderName", line: "Pip" }, { field: "fields.nice", line: "fed the cat every morning without being told" }, { field: "fields.naughty", line: "hid the peas under the mash. twice." }],
          },
          {
            heading: "All crimes, for a brother or sister",
            body: "Leave the good deeds empty, fill all four crimes and stamp it naughty. The line under the stamp still approves the presents, so nobody gets hurt: “borrowed my charger in 2023. still has it.” It ends well enough to send to the family group.",
            borrow: [{ field: "fields.naughty", line: "borrowed my charger in 2023. still has it." }],
          },
          {
            heading: "From the grandchildren",
            body: "Turn it round: the children review the grandparent. Good deeds first: “lets us win at cards (we noticed)”. Then the crimes that are the reason they love going there: “chocolate before dinner. every single time.” Sign it from all of them and choose the pine green room.",
            borrow: [{ field: "fields.nice", line: "lets us win at cards (we noticed)" }, { field: "fields.naughty", line: "chocolate before dinner. every single time." }],
          },
          {
            heading: "Photographic evidence",
            body: "After the list comes your letter, and under it up to eight photos, filed as “the evidence” and held with paper clips. Each has two lines of handwriting for a caption, so write them like notes in a case file: “seen here: the last roast potato, leaving”.",
            borrow: [{ field: "caption", line: "seen here: the last roast potato, leaving" }],
          },
          {
            heading: "Christmas Eve, or late",
            body: "The year at the top of the list fills itself in, and through January and February it still reads the year just gone. So it works on the night of the 24th, after they’ve gone to bed, and it works as a late one in the first week of January. Give it a title that owns up to the timing: “the results are late. so was the sleigh.”",
            borrow: [{ field: "title", line: "the results are late. so was the sleigh." }],
          },
        ],
      },
      faq: [
        {
          q: "How many lines fit on the list?",
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
            body: "Una fechoría se lee mejor contada. Cada línea admite 50 caracteres: «deja un sorbo de leche en el brik. nueve veces.» La lista lee una buena obra y después una fechoría, por turnos, así que escríbelas por parejas y que cada buena obra casi compense la fechoría que viene detrás: «me quita el hielo del parabrisas sin pedírselo». Séllala con «Carbón dulce».",
            borrow: [{ field: "fields.naughty", line: "deja un sorbo de leche en el brik. nueve veces." }, { field: "fields.nice", line: "me quita el hielo del parabrisas sin pedírselo" }],
          },
          {
            heading: "Una lista del Polo Norte, para un niño",
            body: "La lista va firmada con tu nombre y «de parte de los elfos», así que para esta ponte nombre de elfo. «Pip» sirve. Que las buenas obras sean ciertas y concretas: «da de comer al gato cada mañana por su cuenta». Que la única fechoría sea pequeña: «esconde los guisantes bajo el puré. dos veces.» Séllala con «Sin carbón».",
            borrow: [{ field: "senderName", line: "Pip" }, { field: "fields.nice", line: "da de comer al gato cada mañana por su cuenta" }, { field: "fields.naughty", line: "esconde los guisantes bajo el puré. dos veces." }],
          },
          {
            heading: "Solo fechorías, para un hermano o una hermana",
            body: "Deja vacías las buenas obras, rellena las cuatro fechorías y séllala con «Carbón». La frase de debajo del sello aprueba los regalos igualmente, así que nadie sale herido: «me cogió el cargador en 2023. sigue en su poder.» Acaba lo bastante bien como para mandarla al grupo de la familia.",
            borrow: [{ field: "fields.naughty", line: "me cogió el cargador en 2023. sigue en su poder." }],
          },
          {
            heading: "De parte de los nietos",
            body: "Dale la vuelta: los niños evalúan a la abuela o al abuelo. Primero las buenas obras: «nos deja ganar a las cartas (lo sabemos)». Después, las fechorías por las que les encanta ir a su casa: «chocolate antes de cenar. todas las veces.» Firmadla entre todos y elegid la habitación verde pino.",
            borrow: [{ field: "fields.nice", line: "nos deja ganar a las cartas (lo sabemos)" }, { field: "fields.naughty", line: "chocolate antes de cenar. todas las veces." }],
          },
          {
            heading: "Pruebas fotográficas",
            body: "Después de la lista va tu carta y, debajo, hasta ocho fotos archivadas como «las pruebas» y sujetas con clips. Cada una lleva dos líneas escritas a mano como pie, así que escríbelos como notas de un expediente: «aquí, la última patata asada, dándose a la fuga».",
            borrow: [{ field: "caption", line: "aquí, la última patata asada, dándose a la fuga" }],
          },
          {
            heading: "En Nochebuena, o para Reyes",
            body: "El año de la cabecera de la lista se pone solo, y durante enero y febrero sigue marcando el año que acaba de terminar. Así que sirve la noche del 24, cuando ya se han acostado, y sirve la noche del 5 de enero, que para eso el sello habla de carbón. Ponle un título que avise: «ya hay veredicto, y sus majestades lo saben».",
            borrow: [{ field: "title", line: "ya hay veredicto, y sus majestades lo saben" }],
          },
        ],
      },
      faq: [
        {
          q: "¿Cuántas líneas caben en la lista?",
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
            body: "The label on the jar counts the notes for you, so pick the count on purpose: 30 for a thirtieth birthday, 52 for a year of weeks, 100 for the classic. A hundred takes a while to empty, since every note is a shake or a tap; thirty reads in one sitting. Or write the label yourself, in 40 characters: “52 reasons, one for every week of us”.",
            borrow: [{ field: "fields.label", line: "52 reasons, one for every week of us" }],
          },
          {
            heading: "Evidence, not adjectives",
            body: "“You’re kind” slides past. A note lands when it catches them doing something, so begin each one with a verb: “You warm the car up before I’ve found my shoes.” Notes take 160 characters and are written out by hand on the screen, one to a slip. Short ones look best.",
            borrow: [{ field: "fields.reasons", line: "You warm the car up before I’ve found my shoes." }],
          },
          {
            heading: "A jar for your dad",
            body: "The label is yours to change, so it needn’t be about romance. For Father’s Day: “40 reasons you’re a good dad”. For a daughter leaving for university: “18 reasons you’ll be fine”. Write what he did and thought nobody saw: “You pretended the stabilisers were still on.”",
            borrow: [{ field: "fields.label", line: "40 reasons you’re a good dad" }, { field: "fields.label", line: "18 reasons you’ll be fine" }, { field: "fields.reasons", line: "You pretended the stabilisers were still on." }],
          },
          {
            heading: "Photos on the first notes",
            body: "Your first photo rides on your first reason, your second on the second, and so on, so write the reasons that have a photo first. The jar shuffles everything before it is opened, which scatters those photos through it. Captions don’t show on a note, so say it in the reason: “This face. This exact face. Lisbon, 2023.”",
            borrow: [{ field: "fields.reasons", line: "This face. This exact face. Lisbon, 2023." }],
          },
          {
            heading: "One note from everyone",
            body: "For a grandmother’s eightieth, a teacher’s last day or a bride’s hen weekend, collect one reason from each person and put their name inside the note: “Because you taught me to shuffle cards. (Leo)”. Label the jar with the head count: “23 reasons, one from each of us”.",
            borrow: [{ field: "fields.reasons", line: "Because you taught me to shuffle cards. (Leo)" }, { field: "fields.label", line: "23 reasons, one from each of us" }],
          },
          {
            heading: "The note that isn’t a reason",
            body: "Because the order is shuffled, they never know what the next pull will be. Hide one piece of news among the reasons and let them find it somewhere in the middle: “Not a reason. I bought the tickets. We leave on the 9th.” When the jar is empty, your letter is waiting under it.",
            borrow: [{ field: "fields.reasons", line: "Not a reason. I bought the tickets. We leave on the 9th." }],
          },
        ],
      },
      faq: [
        {
          q: "How many reasons fit in the jar?",
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
            body: "La etiqueta del frasco cuenta las notas por ti, así que elige el número a propósito: 30 para unos treinta años, 52 para un año de semanas, 100 para el clásico. Cien tardan en vaciarse, porque cada nota es una sacudida o un toque; treinta se leen de una sentada. O escribe tú la etiqueta, en 40 caracteres: «52 razones, una por cada semana juntos».",
            borrow: [{ field: "fields.label", line: "52 razones, una por cada semana juntos" }],
          },
          {
            heading: "Pruebas, no adjetivos",
            body: "«Eres muy buena persona» resbala. Una nota llega cuando pilla a alguien haciendo algo, así que empieza cada una por un verbo: «Calientas el coche antes de que yo haya encontrado los zapatos.» Las notas admiten 160 caracteres y salen escritas a mano en la pantalla, una por papelito. Las cortas son las que mejor quedan.",
            borrow: [{ field: "fields.reasons", line: "Calientas el coche antes de que yo haya encontrado los zapatos." }],
          },
          {
            heading: "Un frasco para tu padre",
            body: "La etiqueta se puede cambiar, así que no tiene por qué ir de amor romántico. Para el Día del Padre: «40 razones por las que eres buen padre». Para alguien que se va a estudiar fuera: «18 razones por las que te irá bien». Escribe lo que hizo creyendo que nadie miraba: «Hiciste como que los ruedines seguían puestos.»",
            borrow: [{ field: "fields.label", line: "40 razones por las que eres buen padre" }, { field: "fields.label", line: "18 razones por las que te irá bien" }, { field: "fields.reasons", line: "Hiciste como que los ruedines seguían puestos." }],
          },
          {
            heading: "Fotos en las primeras notas",
            body: "Tu primera foto va con tu primera razón, la segunda con la segunda, y así, de modo que escribe primero las razones que tienen foto. El frasco lo baraja todo antes de abrirse, y eso reparte las fotos por el frasco. Los pies no salen en las notas, así que dilo en la propia razón: «Esta cara. Esta cara exacta. Lisboa, 2023.»",
            borrow: [{ field: "fields.reasons", line: "Esta cara. Esta cara exacta. Lisboa, 2023." }],
          },
          {
            heading: "Una nota de cada persona",
            body: "Para los ochenta de una abuela, el último día de una profesora o la despedida de una novia, pide una razón a cada persona y pon su nombre dentro de la nota: «Porque me enseñaste a barajar. (Leo)». Y rotula el frasco con el recuento: «23 razones, una de cada uno».",
            borrow: [{ field: "fields.reasons", line: "Porque me enseñaste a barajar. (Leo)" }, { field: "fields.label", line: "23 razones, una de cada uno" }],
          },
          {
            heading: "La nota que no es una razón",
            body: "Como el orden va barajado, nunca se sabe qué saldrá en la siguiente. Esconde una noticia entre las razones y deja que aparezca por la mitad: «Esto no es una razón. He comprado los billetes. Salimos el día 9.» Cuando el frasco se vacía, tu carta espera debajo.",
            borrow: [{ field: "fields.reasons", line: "Esto no es una razón. He comprado los billetes. Salimos el día 9." }],
          },
        ],
      },
      faq: [
        {
          q: "¿Cuántas razones caben en el frasco?",
          a: "De 3 a 100, de hasta 160 caracteres cada una. La etiqueta las cuenta por ti («100 razones por las que te quiero»), salvo que escribas la tuya.",
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
            heading: "A first year, one photo a month",
            body: "Twelve photos, twelve labels, a screen each. The label above every caption takes 40 characters and can simply be the month: “March 2026”. Put a year in at least the first and the last of them and the cover works out the span by itself, printing 2025 → 2026 under your title. Captions are for what the month was like: “Month three: you met my mother and survived.”",
            borrow: [{ field: "fields.dates", line: "March 2026" }, { field: "caption", line: "Month three: you met my mother and survived." }],
          },
          {
            heading: "The morning of the wedding",
            body: "From the first photo of the two of you to the one from the rehearsal last night. Change the closing line, which takes 80 characters, to “…and at four o’clock, the next part.” and set the countdown under it to the ceremony, labelled “Until I see you at the end of the aisle”. Send it when you wake up.",
            borrow: [{ field: "fields.ending", line: "…and at four o’clock, the next part." }, { field: "countdown.label", line: "Until I see you at the end of the aisle" }],
          },
          {
            heading: "Labels that aren’t dates",
            body: "After twenty years nobody remembers the months. The label is free text, so name the eras the way the two of you do: “The flat with no oven”, “Before the dog”, “The winter the boiler died”. A label left empty reads “Chapter 4”, which is honest too.",
            borrow: [{ field: "fields.dates", line: "The flat with no oven" }, { field: "fields.dates", line: "Before the dog" }, { field: "fields.dates", line: "The winter the boiler died" }],
          },
          {
            heading: "From the first day of school to the gown",
            body: "A graduation timeline from a parent: the uniform that was too big, the science fair, the driving test, today. Sign it from both of you and rewrite the ending for someone leaving: “…and now the part we don’t get to plan.” The letter comes after it, and that is where the advice goes.",
            borrow: [{ field: "fields.ending", line: "…and now the part we don’t get to plan." }],
          },
          {
            heading: "Every visit, with the airports on it",
            body: "For long distance, make each milestone a visit and label it like a boarding card: “LIS → BOS, visit four”. Caption who cried at arrivals. A video sits after the closing line, before your letter, so finish on the clip of the last airport hug, and let the countdown say how long until the next.",
            borrow: [{ field: "fields.dates", line: "LIS → BOS, visit four" }],
          },
          {
            heading: "News at the end of the road",
            body: "The road draws itself only as far as they have scrolled, so the last milestone stays hidden until they reach it. Make it the scan, the ring or the keys, label it “Due in May”, and change the closing line to finish the sentence: “…and then there were three.” Choose the chalk road if you want it in white on dark.",
            borrow: [{ field: "fields.dates", line: "Due in May" }, { field: "fields.ending", line: "…and then there were three." }],
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
            heading: "El primer año, una foto por mes",
            body: "Doce fotos, doce rótulos, una pantalla para cada una. El rótulo que va encima de cada pie admite 40 caracteres y puede ser solo el mes: «Marzo de 2026». Pon el año al menos en el primero y en el último y la portada calcula sola el tramo y escribe 2025 → 2026 bajo tu título. Los pies son para contar cómo fue el mes: «Mes tres: conociste a mi madre y sobreviviste.»",
            borrow: [{ field: "fields.dates", line: "Marzo de 2026" }, { field: "caption", line: "Mes tres: conociste a mi madre y sobreviviste." }],
          },
          {
            heading: "La mañana de la boda",
            body: "Desde la primera foto de los dos hasta la del ensayo de anoche. Cambia la frase final, que admite 80 caracteres, por «…y a las cuatro, la parte que sigue.» y pon debajo la cuenta atrás hasta la ceremonia, rotulada «Hasta que te vea al final del pasillo». Mándala al despertarte.",
            borrow: [{ field: "fields.ending", line: "…y a las cuatro, la parte que sigue." }, { field: "countdown.label", line: "Hasta que te vea al final del pasillo" }],
          },
          {
            heading: "Rótulos que no son fechas",
            body: "A los veinte años ya nadie se acuerda de los meses. El rótulo es texto libre, así que nombra las épocas como las nombráis vosotros: «El piso sin horno», «Antes del perro», «El invierno sin caldera». Un rótulo vacío pone «Capítulo 4», que también es verdad.",
            borrow: [{ field: "fields.dates", line: "El piso sin horno" }, { field: "fields.dates", line: "Antes del perro" }, { field: "fields.dates", line: "El invierno sin caldera" }],
          },
          {
            heading: "Del primer día de colegio a la toga",
            body: "Una línea del tiempo de graduación hecha por una madre o un padre: el uniforme que le quedaba grande, la feria de ciencias, el carné de conducir, hoy. Firmadla los dos y reescribid el final para alguien que se va: «…y ahora viene la parte que no nos toca planear.» La carta va después, y ahí es donde caben los consejos.",
            borrow: [{ field: "fields.ending", line: "…y ahora viene la parte que no nos toca planear." }],
          },
          {
            heading: "Cada visita, con sus aeropuertos",
            body: "A distancia, haz de cada hito una visita y rotúlalo como una tarjeta de embarque: «LIS → BOG, cuarta visita». En el pie, quién lloró en llegadas. Después de la frase final y antes de tu carta cabe un vídeo, así que termina con el del último abrazo en el aeropuerto y deja que la cuenta atrás diga cuánto falta para el siguiente.",
            borrow: [{ field: "fields.dates", line: "LIS → BOG, cuarta visita" }],
          },
          {
            heading: "Una noticia al final del camino",
            body: "El camino solo se dibuja hasta donde han bajado, así que el último hito no se ve hasta que llegan a él. Que sea la ecografía, el anillo o las llaves, rotúlalo «Para mayo» y cambia la frase final para que termine la tuya: «…y entonces fuimos tres.» Elige el camino de tiza si lo quieres en blanco sobre oscuro.",
            borrow: [{ field: "fields.dates", line: "Para mayo" }, { field: "fields.ending", line: "…y entonces fuimos tres." }],
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
          a: "No. Cada rótulo es texto libre de hasta 40 caracteres, así que valen «Verano de 2022» o «El primer piso», y uno vacío pone «Capítulo 3». Si tus rótulos llevan años, la portada enseña el tramo, por ejemplo 2022 → 2026.",
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
            heading: "A year of the two of you",
            body: "The title is spelled in letters cut from magazines, and takes 28 characters. Each set of pages brings one of its own (Blossom’s is “little things”); for an anniversary, write yours: “one year of us”. The first photo is the big polaroid under it, and a sliver of it shows above the cover before the book is opened.",
            borrow: [{ field: "fields.headline", line: "one year of us" }],
          },
          {
            heading: "A real photo-booth strip",
            body: "Photos two, three and four are printed as one strip, top to bottom, labelled “photo booth”. Use three frames from the same minute: an actual booth strip cut apart, or three selfies in a row where somebody blinks. The strip shows no captions, so let the pinned note say where it was: “the booth at the fair · £4 · worth it”. Each dot starts a new line.",
            borrow: [{ field: "fields.tag", line: "the booth at the fair · £4 · worth it" }],
          },
          {
            heading: "A holiday with a friend, on the Seaside pages",
            body: "Name it the way you’d name the album: “greece, badly planned”. The fifth photo is cut into a postage stamp, so make it the postcard view. From the sixth on, photos run along a roll of film with one line of small capitals under each frame; keep those captions to about 20 characters: “the ferry we missed”.",
            borrow: [{ field: "fields.headline", line: "greece, badly planned" }, { field: "caption", line: "the ferry we missed" }],
          },
          {
            heading: "Long distance: the things you kept",
            body: "The torn note holds one line in handwriting, up to 90 characters. Don’t spend it on a quotation from somebody else. Use it for the object you kept and they don’t know about: “I still have the boarding pass from the first time. It’s my bookmark.”",
            borrow: [{ field: "fields.quote", line: "I still have the boarding pass from the first time. It’s my bookmark." }],
          },
          {
            heading: "A birthday page in your mother’s own words",
            body: "On the Sunshine pages, make the title “mum says” and give the pinned note to her three most repeated lines. It takes 40 typewritten characters, and a middle dot starts a new line: “take a jacket · eat something · ring me”. She’ll read it in her own voice.",
            borrow: [{ field: "fields.headline", line: "mum says" }, { field: "fields.tag", line: "take a jacket · eat something · ring me" }],
          },
          {
            heading: "The year, January to December",
            body: "The Memories pages are black film, and their pinned note, left as it is, prints the current year above “recap” and “us”. Send it on New Year’s Eve with twelve photos, one from each month, in order. The letter is typed, headed From and For, and sealed with your initial in wax; end it looking forward: “Same again next year, minus the food poisoning.”",
            borrow: [{ field: "message", line: "Same again next year, minus the food poisoning." }],
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
            body: "El título va en letras recortadas de revistas y admite 28 caracteres. Cada juego de páginas trae el suyo (el de Flores es «pequeñas cosas»); para un aniversario, escribe el tuyo: «un año de nosotros». La primera foto es la polaroid grande de debajo, y un trocito asoma por encima de la tapa antes de abrir el álbum.",
            borrow: [{ field: "fields.headline", line: "un año de nosotros" }],
          },
          {
            heading: "Una tira de fotomatón de verdad",
            body: "Las fotos dos, tres y cuatro salen como una sola tira, de arriba abajo, con el rótulo «fotomatón». Usa tres tomas del mismo minuto: una tira de cabina de verdad recortada, o tres selfis seguidos en los que alguien parpadea. La tira no lleva pies, así que deja que la nota de la chincheta diga dónde fue: «la cabina de la feria · 4 € · lo valió». Cada punto abre una línea nueva.",
            borrow: [{ field: "fields.tag", line: "la cabina de la feria · 4 € · lo valió" }],
          },
          {
            heading: "Unas vacaciones entre amigos, en las páginas de Playa",
            body: "Titúlalo como titularías el álbum: «grecia, mal planeado». La quinta foto se recorta como un sello de correos, así que pon ahí la vista de postal. A partir de la sexta, las fotos van en un carrete con una línea de mayúsculas pequeñas bajo cada fotograma; que esos pies no pasen de unos 20 caracteres: «el ferri perdido».",
            borrow: [{ field: "fields.headline", line: "grecia, mal planeado" }, { field: "caption", line: "el ferri perdido" }],
          },
          {
            heading: "A distancia: las cosas que guardaste",
            body: "La nota rasgada lleva una sola frase escrita a mano, de hasta 90 caracteres. No la gastes en una cita de otra persona. Úsala para ese objeto que guardaste sin que lo sepa: «Aún tengo la tarjeta de embarque de la primera vez. La uso de marcapáginas.»",
            borrow: [{ field: "fields.quote", line: "Aún tengo la tarjeta de embarque de la primera vez. La uso de marcapáginas." }],
          },
          {
            heading: "Una página de cumpleaños con las frases de tu madre",
            body: "En las páginas de Sol, pon de título «dice mamá» y dale la nota de la chincheta a sus tres frases más repetidas. Admite 40 caracteres a máquina y un punto medio abre línea nueva: «llévate chaqueta · come algo · llámame». La va a leer con su propia voz.",
            borrow: [{ field: "fields.headline", line: "dice mamá" }, { field: "fields.tag", line: "llévate chaqueta · come algo · llámame" }],
          },
          {
            heading: "El año, de enero a diciembre",
            body: "Las páginas de Recuerdos son de película en negro, y su nota de la chincheta, si no la tocas, pone el año en curso encima de «resumen» y «nosotros». Mándalo en Nochevieja con doce fotos, una de cada mes, en orden. La carta va a máquina, encabezada con «De» y «Para» y sellada con tu inicial en lacre; termínala mirando hacia delante: «El año que viene, lo mismo, pero sin la intoxicación.»",
            borrow: [{ field: "message", line: "El año que viene, lo mismo, pero sin la intoxicación." }],
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
          q: "¿Cómo se cambia de línea en la nota de la chincheta?",
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
 * never stands beside the page's own "Is it free?" saying something else.
 */
export function templateGuideFaq(slug: string, locale: GiftLocale, freeNote: boolean = noteForEveryone()): { q: string; a: string }[] {
  return (templateGuide(slug, locale)?.faq ?? []).filter((f) => !f.whileFreeNote || freeNote).map(({ q, a }) => ({ q, a }));
}
