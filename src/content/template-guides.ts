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
 */
export type TemplateGuideContent = {
  ideas: { title: string; items: { heading: string; body: string }[] };
  faq: { q: string; a: string }[];
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
          },
          {
            heading: "A pregnancy announcement for family far away",
            body: "A photo of your shoes by the front door, then the same shoes with a tiny third pair, then the scan. The last card: “See you in June, Grandma.” Send the same link to everyone at once, so nobody hears it second-hand on the phone.",
          },
          {
            heading: "Asking your bridesmaids, one card each",
            body: "Make one for each friend: your photos together from school to now, a caption per card with the memory behind it, and the last card asks “Will you be my bridesmaid?” The foil on every card carries 30 characters of your own, like “for Mia’s eyes only”.",
          },
          {
            heading: "A trip, one clue per card",
            body: "Clues they can almost guess: a passport, a beach towel, a croissant, each captioned like a packing note (“bring the good sunglasses”). The last card names it: “Lisbon. Friday. Pack tonight.” For a departures board and a boarding pass, Pack Your Bags tells the whole trip; this is the quicker reveal.",
          },
          {
            heading: "A birthday with the real present at the end",
            body: "Fill the cards with the year’s photos and caption them like lottery prizes: “Prize: one more year of my cooking.” The last card is the actual present: “Two tickets, row F, the 14th.” It works because they expect one more joke and get the real thing.",
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
          },
          {
            heading: "Un anuncio de embarazo para la familia que vive lejos",
            body: "Una foto de vuestros zapatos en la entrada, luego los mismos con un tercer par diminuto, luego la ecografía. Última tarjeta: «Nos vemos en junio, abuela». Manda el mismo enlace a todos a la vez, para que nadie se entere de rebote por teléfono.",
          },
          {
            heading: "Pedírselo a tus damas de honor, una tarjeta para cada una",
            body: "Haz una para cada amiga: vuestras fotos desde el colegio hasta hoy, un pie con el recuerdo de cada una y, en la última, «¿Quieres ser mi dama de honor?». El metalizado de cada tarjeta admite 30 caracteres tuyos, como «solo para los ojos de Mía».",
          },
          {
            heading: "Un viaje, una pista por tarjeta",
            body: "Pistas que casi se adivinan: un pasaporte, una toalla de playa, un cruasán, cada una con un pie de lista de equipaje («trae las gafas de sol buenas»). La última lo dice: «Lisboa. Viernes. Haz la maleta esta noche». Para un panel de salidas y una tarjeta de embarque, Haz la maleta cuenta el viaje entero; esto es la versión rápida.",
          },
          {
            heading: "Un cumpleaños con el regalo de verdad al final",
            body: "Llena las tarjetas con las fotos del año y ponles pies de premio de lotería: «Premio: un año más de mi cocina». La última es el regalo de verdad: «Dos entradas, fila F, el día 14». Funciona porque espera un chiste más y le llega lo real.",
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
          },
          {
            heading: "Flowers across a border",
            body: "Sending real flowers abroad is a bet on a courier. This arrives the second you send it and looks the same next spring. Add up to six photos of the two of you; they drop in as polaroids once they’ve read your letter.",
          },
          {
            heading: "An apology that doesn’t shout",
            body: "Whites and blush, no red, kraft paper. Keep the card short (“I was wrong. Sorry.”) and put the real apology in the letter: what you did, and what you’ll do differently.",
          },
          {
            heading: "For your mother, in her colours",
            body: "Peonies or lilies in the colour she always wears, the night background if she likes a little drama, and a card in your words: “Still calling you first.” Mother’s Day is in March or April in the UK and in May in the US; you can schedule it to open that morning.",
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
          },
          {
            heading: "Flores que cruzan una frontera",
            body: "Mandar flores de verdad al extranjero es fiarse de un mensajero. Esto llega en el segundo en que lo envías y sigue igual la próxima primavera. Añade hasta seis fotos vuestras: caen como polaroids cuando ya han leído tu carta.",
          },
          {
            heading: "Una disculpa sin gritos",
            body: "Blancos y rosa palo, nada de rojo, papel kraft. La tarjeta, corta («Me equivoqué. Perdón.»), y la disculpa de verdad en la carta: qué hiciste y qué vas a hacer distinto.",
          },
          {
            heading: "Para tu madre, en sus colores",
            body: "Peonías o lirios del color que siempre lleva, el fondo de noche si le gusta un poco de drama y una tarjeta con tus palabras: «Siempre te llamo primero». En España el Día de la Madre es el primer domingo de mayo; puedes programarlo para que se abra esa mañana.",
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
          },
          {
            heading: "Lucky numbers that are your dates",
            body: "One line of lucky numbers prints on every slip. Make them yours: the day you met, their age, the number on the door of your first place, the table from your first date, set out the way a real fortune does it: “14 · 06 · 21 · 7 · 42”.",
          },
          {
            heading: "Silly first, sweet last",
            body: "The slips come out in the order you write them, and the last cookie opens into your letter. Put the jokes first and make the last fortune the first one that isn’t a joke, so by the time the letter opens they’ve stopped laughing and started listening.",
          },
          {
            heading: "Photos on the first slips",
            body: "Add photos and the first slips carry one each, in order: up to ten, one per fortune, so write at least as many fortunes as photos. Pair the worst photo with the most solemn fortune: “Great fortune awaits the person in this hat.”",
          },
          {
            heading: "A fortune for every year",
            body: "For a birthday, one fortune for each year they’ve been in your life, up to twenty: “Year three: you will learn to love my cooking. You did not.” Past twenty years, keep the ones with a story.",
          },
          {
            heading: "Fortunes about what’s next",
            body: "For a graduation or a new job: “You will finally be paid for being bossy.” “Your calendar will show a free Friday. Do not trust it.” Then one line that isn’t a joke, about how proud you are, in the letter.",
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
          },
          {
            heading: "Números de la suerte que son vuestras fechas",
            body: "En cada papelito sale una línea de números de la suerte. Haz que sean vuestros: el día que os conocisteis, su edad, el número del portal de vuestra primera casa, la mesa de la primera cita, puestos como en una fortuna de verdad: «14 · 06 · 21 · 7 · 42».",
          },
          {
            heading: "Lo gracioso primero, lo bonito al final",
            body: "Los papelitos salen en el orden en que los escribes, y la última galleta se abre con tu carta. Pon los chistes primero y que la última fortuna sea la primera que no lo es: así, cuando se abra la carta, ya han dejado de reírse y han empezado a escuchar.",
          },
          {
            heading: "Fotos en los primeros papelitos",
            body: "Si añades fotos, los primeros papelitos llevan una cada uno, en orden: hasta diez, una por fortuna, así que escribe al menos tantas fortunas como fotos. Junta la peor foto con la fortuna más solemne: «Una gran fortuna espera a quien lleva este gorro».",
          },
          {
            heading: "Una fortuna por cada año",
            body: "Para un cumpleaños, una por cada año que lleva en tu vida, hasta veinte: «Año tres: aprenderás a querer mi cocina. No lo hiciste». Si son más de veinte años, quédate con los que tienen historia.",
          },
          {
            heading: "Fortunas sobre lo que viene",
            body: "Para una graduación o un trabajo nuevo: «Por fin te pagarán por mandar». «Tu agenda tendrá un viernes libre. No te fíes». Y luego, en la carta, una frase que no sea broma sobre el orgullo que sientes.",
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
};

/** A template's extra guide in a locale, if it has one. */
export function templateGuide(slug: string, locale: GiftLocale): TemplateGuideContent | null {
  return TEMPLATE_GUIDES[slug]?.[locale] ?? null;
}
