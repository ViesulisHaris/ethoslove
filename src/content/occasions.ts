import type { Occasion } from "@/config/occasions";
import type { GiftLocale } from "@/lib/gift/schema";

/**
 * What each occasion page says below its templates: how to make the gift for that day, and the
 * questions people bring to it. Written for the person making one, not for a search engine — but
 * this is also what made the pages thin against the guides that get recommended instead. Every
 * fact here (photo counts, what is free, links not expiring, edits going live) matches the pricing
 * page's FAQ; change one and change both.
 */
export type OccasionGuide = {
  title: string;
  lead: string;
  /**
   * A numbered list of gifts for the day, under the templates: the occasion's own and others that
   * fit it, each said the way that day needs it. Every one is a template, so it can be made.
   */
  ideas?: { title: string; items: { template: string; heading: string; body: string }[] };
  sections: { heading: string; body: string }[];
  faq: { q: string; a: string }[];
};

const phoneEn = {
  q: "Can I make it on my phone?",
  a: "Yes. The editor works on a phone, the preview updates as you type, and photos come straight from your camera roll. Ten minutes is a fair estimate, longer if you keep rewriting the message.",
};
const phoneEs = {
  q: "¿Puedo hacerlo desde el móvil?",
  a: "Sí. El editor funciona en el móvil, la vista previa cambia mientras escribes y las fotos salen directamente del carrete. Diez minutos es un cálculo justo, más si te da por reescribir el mensaje.",
};
const costEn = {
  q: "Does it cost anything?",
  a: "Two templates are free, with up to ten photos, our music library and a real song they tap to hear, and they publish with a small “Made with Ethos” footer. Premium templates are a one-time payment for that template, forever — no subscription — and add video, voice messages, twenty photos, scheduling and a password.",
};
const costEs = {
  q: "¿Cuesta algo?",
  a: "Dos plantillas son gratis, con hasta diez fotos, nuestra biblioteca de música y una canción de verdad que se escucha con un toque, y se publican con un pequeño pie que dice “Hecho con Ethos”. Las premium son un solo pago por esa plantilla, para siempre, sin suscripción, y añaden vídeo, mensajes de voz, veinte fotos, programación y contraseña.",
};
const keepEn = {
  q: "Will it still be there next year?",
  a: "Yes. Links are meant to be permanent, so it can be opened again on the next one and the one after. If you spot a typo after sending, edit it and the change goes live at the same link.",
};
const keepEs = {
  q: "¿Seguirá ahí el año que viene?",
  a: "Sí. Los enlaces están pensados para durar, así que se puede volver a abrir el año siguiente y el otro. Si ves una errata después de enviarlo, edítalo y el cambio sale en el mismo enlace.",
};

export const OCCASION_GUIDES: Record<Occasion, Record<GiftLocale, OccasionGuide>> = {
  birthday: {
    en: {
      title: "A birthday gift they'll open twice",
      lead: "Most birthday messages are a line in a group chat, read once and buried by lunch. This is the other kind: a page with their name on it, the photos you have of them, the song they can't help singing, and the thing you actually mean — opened on their phone, whenever they like.",
      ideas: {
        title: "12 digital birthday gift ideas",
        items: [
          {
            template: "midnight-countdown",
            heading: "A countdown that ends at midnight, their time",
            body: "The first message of a birthday is the one they remember, so send the link in the evening and let the gift open at 00:00 by itself; until then it shows the clock. The headline sits over the timer, “Until you're 30”, and the line with the fireworks is yours: “30. You look exactly the same. I checked.” If they're eight hours ahead, set their time zone and it opens on their midnight, in your afternoon.",
          },
          {
            template: "the-council",
            heading: "Five cats review their year",
            body: "A hearing about them in front of a bench of cats. Charge them with something specific (“turning 30 without telling the group chat”), give each cat one finding, “still has the receipt for every present since 2015”, “sings in the car, only the wrong words”, and let the stamp come down on certified icon. The full ruling is your letter.",
          },
          {
            template: "party-animals",
            heading: "A party crashed by hamsters who heckle",
            body: "Their age in foil balloons, their name in cut-out letters and ten animals in party hats, each of which yells a line you wrote when tapped. Use all ten: “THIRTY?”, “who invited the ferrets”, “you said no fuss, we heard fuss”, “make a wish, we'll wait”. At the bottom they blow out the candles into the phone.",
          },
          {
            template: "front-page",
            heading: "A tabloid that adores them",
            body: "A newspaper with their name on the masthead, written like a tabloid that's obsessed with them. Headline: “40 YEARS ON, SOURCES CONFIRM: STILL GORGEOUS”. Weather: “Overcast, with a chance of being sung at”. Then spend the eight classified ads on in-jokes: “WANTED: anyone who can explain their spice rack. Reward: cake.”",
          },
          {
            template: "fortune-cookie",
            heading: "Fortune cookies with your dates as the lucky numbers",
            body: "A plate of cookies, each cracking open on a fortune you wrote, with their lucky numbers underneath. Make the numbers yours: the day you met, their age, the number on the door of your first place, the table you had on the first date. And write the fortunes like a fortune-teller who knows them: “You will be sung to in a restaurant today. Do not resist.”",
          },
          {
            template: "pack-your-bags",
            heading: "The weekend away, on a departures board",
            body: "Hide the destination behind five clues they pack one at a time: “swimsuit”, “the good sunglasses”, “nothing for work”, “a book you haven't started”, “your passport, yes really”. The board clatters to the city, the boarding pass shows the date and the nights, and your letter is under the stub.",
          },
          {
            template: "text-thread",
            heading: "A conversation that starts at 00:00",
            body: "Write the chat the way you two actually text, typos and in-jokes included, and it arrives bubble by bubble with the typing dots: “ok it's officially your birthday”, “I've been sitting on this since 11:40”, a photo, then the paragraph you'd never send by text. Type [photo] on a line of its own wherever the next photo should drop in.",
          },
          {
            template: "jar-of-reasons",
            heading: "One reason for every year",
            body: "One folded note in the jar for every year they're turning, up to a hundred, shaken out one at a time. If you've only known them for a few of those years, the rest can come from the stories you've heard: the school play, the first car, the haircut nobody mentions. The rule: each note is something they did, not something they are.",
          },
          {
            template: "birthday-cinema",
            heading: "Their name in lights, and a wish they make by blowing",
            body: "Red curtains part on a marquee with their name, or your own words: “SAM TURNS 30. CRITICS ARE DIVIDED.” Then a cake with flickering candles that they blow out into the microphone (or swipe), confetti, and a film strip of your photos. It takes a short video too, from the people who couldn't be there.",
          },
          {
            template: "sticker-bomb",
            heading: "Twelve taps of chaos, labelled by you",
            body: "Every tap slaps a sticker where their finger lands, and some sit on label-maker strips you wrote, up to six of 28 characters: “officially vintage”, “30 and still can't whistle”, “best in show”. Twelve stickers in, the page is a mess and your card opens. For the friend who'd never forgive you a mushy one.",
          },
          {
            template: "balloons",
            heading: "A ceiling of balloons that drop your photos",
            body: "Their age floats in as gold foil numbers and the bunting spells a line of up to 24 characters: “SAM IS 30, ACT NORMAL”. Every balloon with a photo drops it when popped, up to eight, and two or three hold only confetti. Hide a baby photo among them, the one they'll shriek at. The biggest balloon, popped last, holds your letter.",
          },
          {
            template: "constellations",
            heading: "Twelve stars for the twelve months since their last birthday",
            body: "Free, and made for this: each photo is a star in a night sky, up to twelve of them, so use one from each month since their last birthday. They tap their way across the sky, and when the last star is found the lines join into a heart, an infinity sign or a star, with your words under it.",
          },
        ],
      },
      sections: [
        {
          heading: "What to write",
          body: "Skip “happy birthday, have a great day”. Write one specific thing: the night they drove two hours to bring you soup, the joke only the two of you get, what you'd tell a stranger about them. Three or four sentences are plenty. If the words won't come, start with “The thing I never say is…” and keep going.",
        },
        {
          heading: "What to add",
          body: "Pick photos with a story, not the best-lit ones: the terrible haircut year, the trip where it rained. Add a song from the library to play as it opens, or the real one they always put on: thirty seconds of it wait at the end, a tap away, on any template. A premium template adds a short video or a voice message, which is the closest thing to being in the room. Birthday Cinema has them blow out the candles; Balloons and Party Animals are for the ones who'd rather laugh.",
        },
        {
          heading: "When to send it",
          body: "On a premium template, schedule it to unlock at midnight in their time zone, so it's the first thing they see; otherwise send the link at the moment you'd normally text. If you'll see them in person, print the QR card and put it in the real card, inside the book, on the cake box. It opens with the phone camera; there is nothing to install.",
        },
      ],
      faq: [
        phoneEn,
        {
          q: "What if their birthday is today?",
          a: "It arrives the moment you press send. Publish it, copy the link and put it in WhatsApp, iMessage, anywhere a link goes. There is nothing to ship and no cut-off.",
        },
        costEn,
      ],
    },
    es: {
      title: "Un regalo de cumpleaños que abrirá dos veces",
      lead: "Casi todas las felicitaciones son una línea en un grupo, leída una vez y enterrada antes de comer. Esto es lo otro: una página con su nombre, las fotos que tienes de esa persona, la canción que no puede evitar cantar y lo que de verdad quieres decirle, abierto en su móvil cuando quiera.",
      ideas: {
        title: "12 ideas de regalos digitales de cumpleaños",
        items: [
          {
            template: "midnight-countdown",
            heading: "Una cuenta atrás que acaba a las doce, en su zona horaria",
            body: "El primer mensaje de un cumpleaños es el que se recuerda, así que manda el enlace por la tarde y deja que el regalo se abra solo a las 00:00; hasta entonces verá el reloj. El titular va sobre el contador, “Hasta tus 30”, y la frase de los fuegos artificiales es tuya: “30. Estás igual. Lo he comprobado.” Si vive ocho horas por delante, pon su zona horaria y se abrirá en su medianoche, en tu tarde.",
          },
          {
            template: "the-council",
            heading: "Cinco gatos revisan su año",
            body: "Una vista sobre esa persona ante un tribunal de gatos. Acúsale de algo concreto (“cumplir 30 sin avisar al grupo”), dale a cada gato una conclusión, “guarda el tique de cada regalo desde 2015”, “canta en el coche, solo las letras que se inventa”, y que el sello caiga en icono certificado. El fallo completo es tu carta.",
          },
          {
            template: "party-animals",
            heading: "Una fiesta colada por hámsteres con opiniones",
            body: "Su edad en globos metalizados, su nombre en letras recortadas y diez animales con gorro de fiesta que gritan una frase tuya al tocarlos. Usa las diez: “¿¡TREINTA!?”, “¿quién ha invitado a los hurones?”, “dijiste sin lío y oímos lío”, “pide un deseo, esperamos”. Abajo, las velas se apagan soplando al móvil.",
          },
          {
            template: "front-page",
            heading: "Una portada que le adora",
            body: "Un periódico con su nombre en la cabecera, escrito como una revista del corazón obsesionada con esa persona. Titular: “40 AÑOS Y NI UNA CANA, SEGÚN SU PELUQUERÍA”. El tiempo: “Nublado, con probabilidad de que le canten”. Y los ocho anuncios por palabras, para las bromas vuestras: “SE BUSCA: quien sepa explicar su especiero. Recompensa: tarta.”",
          },
          {
            template: "fortune-cookie",
            heading: "Galletas de la fortuna con vuestras fechas como números de la suerte",
            body: "Un plato de galletas que se abren en una fortuna escrita por ti, con sus números de la suerte debajo. Haz que los números sean vuestros: el día que os conocisteis, su edad, el número del portal de vuestra primera casa, la mesa de la primera cita. Y escribe las fortunas como una adivina que le conoce: “Hoy te cantarán en un restaurante. No te resistas.”",
          },
          {
            template: "pack-your-bags",
            heading: "El fin de semana fuera, en un panel de salidas",
            body: "Esconde el destino tras cinco pistas que va metiendo en la maleta: “bañador”, “las gafas de sol buenas”, “nada del trabajo”, “un libro sin empezar”, “tu pasaporte, sí”. El panel gira hasta la ciudad, la tarjeta de embarque muestra la fecha y las noches, y tu carta está debajo del resguardo.",
          },
          {
            template: "text-thread",
            heading: "Una conversación que empieza a las 00:00",
            body: "Escribe el chat como os escribís de verdad, con erratas y bromas incluidas, y llega burbuja a burbuja con los puntitos de escribiendo: “vale, ya es oficialmente tu cumple”, “llevo desde las 23:40 aguantándome”, una foto, y luego el párrafo que nunca mandarías por mensaje. Escribe [photo] en una línea propia donde quieras que caiga la siguiente foto.",
          },
          {
            template: "jar-of-reasons",
            heading: "Una razón por cada año",
            body: "Una nota doblada en el frasco por cada año que cumple, hasta cien, y salen de una en una. Si solo conoces unos pocos de esos años, el resto puede salir de las historias que te han contado: la función del colegio, el primer coche, el corte de pelo del que nadie habla. La regla: cada nota es algo que hizo, no algo que es.",
          },
          {
            template: "birthday-cinema",
            heading: "Su nombre en luces y un deseo que se pide soplando",
            body: "Se abre el telón rojo sobre una marquesina con su nombre, o con tus propias palabras: “SAM CUMPLE 30. LA CRÍTICA, DIVIDIDA.” Luego, una tarta con velas que parpadean y se apagan soplando al micrófono (o deslizando el dedo), confeti y una tira de película con tus fotos. Admite también un vídeo corto de quienes no pudieron venir.",
          },
          {
            template: "sticker-bomb",
            heading: "Doce toques de caos, con etiquetas tuyas",
            body: "Cada toque pega una pegatina donde cae el dedo, y algunas llevan debajo una tira de etiquetadora que escribes tú, hasta seis de 28 caracteres: “oficialmente vintage”, “30 y aún no sabe silbar”, “primer premio”. Con doce pegatinas la página es un caos y se abre tu tarjeta. Para quien nunca te perdonaría una cursilada.",
          },
          {
            template: "balloons",
            heading: "Un techo de globos que sueltan tus fotos",
            body: "Su edad entra flotando en números dorados y la guirnalda dice una frase tuya de hasta 24 caracteres: “SAM TIENE 30, DISIMULAD”. Cada globo con foto la suelta al explotar, hasta ocho, y dos o tres solo llevan confeti. Esconde entre las fotos una de cuando era bebé, la que le hará gritar. El globo más grande, el último, guarda tu carta.",
          },
          {
            template: "constellations",
            heading: "Doce estrellas por los doce meses desde su último cumpleaños",
            body: "Gratis y hecha para esto: cada foto es una estrella en un cielo nocturno, hasta doce, así que usa una de cada mes desde su último cumpleaños. Va tocando de estrella en estrella y, al encontrar la última, las líneas forman un corazón, un infinito o una estrella, con tus palabras debajo.",
          },
        ],
      },
      sections: [
        {
          heading: "Qué escribir",
          body: "Olvida el “feliz cumple, que pases un gran día”. Escribe una cosa concreta: la noche que condujo dos horas para traerte sopa, el chiste que solo entendéis vosotros, lo que le contarías de esa persona a un desconocido. Con tres o cuatro frases basta. Si no salen, empieza por “Lo que nunca te digo es…” y sigue.",
        },
        {
          heading: "Qué añadir",
          body: "Elige fotos con historia, no las mejor iluminadas: el año del corte de pelo terrible, el viaje en el que llovió. Pon una canción de la biblioteca para que suene al abrirlo, o la de verdad que siempre elige: treinta segundos esperan al final, a un toque, en cualquier plantilla. Una premium añade un vídeo corto o un mensaje de voz, lo más parecido a estar allí. En Birthday Cinema sopla las velas; Balloons y Party Animals son para quien prefiere reírse.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "En una plantilla premium, prográmalo para que se abra a medianoche en su zona horaria y sea lo primero que vea; si no, manda el enlace a la hora a la que le escribirías. Si vais a veros, imprime la tarjeta QR y métela en la tarjeta de verdad, dentro del libro, en la caja de la tarta. Se abre con la cámara del móvil; no hay nada que instalar.",
        },
      ],
      faq: [
        phoneEs,
        {
          q: "¿Y si su cumpleaños es hoy?",
          a: "Llega en el momento en que pulsas enviar. Publícalo, copia el enlace y pégalo en WhatsApp, iMessage o donde quieras. No hay nada que mandar por correo ni hora límite.",
        },
        costEs,
      ],
    },
  },

  anniversary: {
    en: {
      title: "An anniversary gift made of your own story",
      lead: "An anniversary is the one day a year the two of you are the subject. Cards borrow other people's words for it. This uses yours: the photos only you have, the song that's yours, and a note about what these years have actually been like, opened on their phone and kept.",
      ideas: {
        title: "12 digital anniversary gift ideas",
        items: [
          {
            template: "the-letter",
            heading: "Paper, the traditional first-anniversary gift",
            body: "Paper is the gift for a first anniversary, on lists going back to Emily Post's Etiquette in 1922, and The Letter is the free template. Choose kraft paper, press your initial into the wax, and open with the first message you ever sent them, word for word if you can find it. Then write what you'd send now.",
          },
          {
            template: "text-thread",
            heading: "Your first conversation, replayed",
            body: "Scroll back to your first messages (it's worth the scrolling) and rebuild them as a thread that arrives bubble by bubble with the typing dots, awkward bits included. Then keep going past where it really ended: the last few bubbles are what you'd say to that person now, a year or ten later. It holds up to 40 bubbles.",
          },
          {
            template: "our-timeline",
            heading: "Every year as a stop on a road",
            body: "Photos pinned to a road that draws itself as they scroll, each with a label of up to 40 characters. Label what happened, not just when: “2021: the first place, the noisy one”, “2023: the dog”, “2024: the year we nearly moved abroad”. It ends on a countdown, so aim it at your next plan.",
          },
          {
            template: "museum",
            heading: "A retrospective, framed and titled",
            body: "A quiet gallery where each photo hangs framed over a plaque with your caption, your years and the room number. Name the exhibition, “The Sam and Alex Years: A Retrospective”, set the years (“2019–2026”), and caption each photo like a curator who is far too close to the subject: “Untitled (Burnt Toast)”, “Study in Blanket Theft”.",
          },
          {
            template: "halfway",
            heading: "The distance you've already covered",
            body: "For a long-distance anniversary: a postcard map with your homes on two islands and the distance between them, which they close by blowing into the phone. Halfway along, a line of yours pops up: “Halfway. This is where we ate the worst sandwich of 2022.” Add up to four places you've met in the middle; they're stamped on the postcard and counted, so the total is how far you've travelled to be together.",
          },
          {
            template: "keepsake",
            heading: "A locket with your date engraved inside",
            body: "A parcel under a wax seal, with a box of kept things inside: a ticket, pressed flowers, a word torn out of a book and a gold locket that opens on a tap. Engrave your date in the locket, up to 18 characters (“12·06·2021”), make the ticket admit them to the night you met, and choose the one word you'd tear out for them.",
          },
          {
            template: "jar-of-reasons",
            heading: "One reason for every month",
            body: "Twelve notes for a first anniversary, twenty-four for a second, and so on up to a hundred. Give each month its own note, so every shake lands somewhere different in your time together. The rule for each: something they did, not something they are: “March: you learned to make my grandmother's soup.”",
          },
          {
            template: "the-toast",
            heading: "Your wedding toast, given again",
            body: "Two glasses on a table, filled by tilting the phone and clinked by knocking it, then the menu card opens into your speech. Print the card like the original: the venue, and the date as free text, so “the hottest day of 2019” works. Then give the toast you'd give now, years in.",
          },
          {
            template: "the-council",
            heading: "Five cats review year one",
            body: "A bench of cats holds a hearing on your relationship. The charge: “stealing the covers for twelve months”. The findings, one per cat: “took four days to answer the first message”, “now answers in four seconds”. The verdict: approved, with a stamp. The full ruling is your letter.",
          },
          {
            template: "pack-your-bags",
            heading: "Back to where it started",
            body: "Take them back to the city where you met, or the town of your first trip, and let the packing list do the talking: five clues like “the jacket you wore that night” or “comfortable shoes, there's a hill”. The departures board clatters to the place, and the boarding pass has both your names and the date.",
          },
          {
            template: "picnic",
            heading: "A picnic basket packed as an inventory of you two",
            body: "Every tap takes something out of the basket, strawberries, lemonade, tulips, a ticket, your photos, and each comes with a tag you wrote, up to 48 characters. Write them like an inventory of your relationship: “strawberries, because you always steal mine”, “the lemonade from our first date”. One for a summer anniversary.",
          },
          {
            template: "constellations",
            heading: "A sky with a star for every year",
            body: "The other free template. One photo per year together, up to twelve, each a star in a night sky; when they've found them all the stars connect, in the shape you chose: a heart, a star, or an infinity sign if you're feeling confident. Your line appears beneath.",
          },
        ],
      },
      sections: [
        {
          heading: "What to write",
          body: "Don't summarise the relationship. Pick three moments and put them in order: the first one, a hard one you got through, and something from last month. Say what each one taught you about them. That is an anniversary letter, and it beats anything on a shelf. The Letter is free; Our Timeline draws the years as a road.",
        },
        {
          heading: "What to add",
          body: "Photos from across the years, in order, so the story reads as a story — up to ten on a free template, twenty on premium. The song from your wedding, your first road trip, or the one you argue about: any template can end on thirty seconds of the real recording, a tap away, and a premium one carries a video clip and a voice message too. Museum hangs the photos in rooms; Vinyl builds the whole gift around a record.",
        },
        {
          heading: "When to send it",
          body: "On a premium template, schedule it for the morning of the anniversary so it's waiting when they wake up, in their time zone if you're apart; or send it at the table and watch them open it. Their reaction — an emoji, a note, a recorded message — comes back to you in your dashboard.",
        },
      ],
      faq: [
        {
          q: "Can we both make one?",
          a: "Yes. At the end of every gift there is a reply, and “send one back” starts a new gift with the names already swapped, on the same template.",
        },
        {
          q: "How many photos can I add?",
          a: "Up to ten on a free template and twenty on a premium one. Put them in the order you want the story told; the template arranges them.",
        },
        keepEn,
      ],
    },
    es: {
      title: "Un regalo de aniversario hecho con vuestra historia",
      lead: "El aniversario es el único día del año en que el tema sois vosotros dos. Las tarjetas lo cuentan con palabras de otros. Esto usa las tuyas: las fotos que solo tienes tú, la canción que es vuestra y una nota sobre cómo han sido estos años de verdad, abierta en su móvil y guardada.",
      ideas: {
        title: "12 ideas de regalos digitales de aniversario",
        items: [
          {
            template: "the-letter",
            heading: "Bodas de papel: una carta",
            body: "Al primer aniversario se le llama bodas de papel, y La carta es la plantilla gratuita. Elige papel kraft, imprime tu inicial en el lacre y empieza con el primer mensaje que le mandaste, palabra por palabra si lo encuentras. Luego escribe lo que le mandarías hoy.",
          },
          {
            template: "text-thread",
            heading: "Vuestra primera conversación, otra vez",
            body: "Sube hasta vuestros primeros mensajes (merece la pena) y reconstrúyelos como un hilo que llega burbuja a burbuja con los puntitos de escribiendo, momentos incómodos incluidos. Luego sigue más allá de donde terminó de verdad: las últimas burbujas son lo que le dirías hoy, uno o diez años después. Caben hasta 40 burbujas.",
          },
          {
            template: "our-timeline",
            heading: "Cada año como una parada del camino",
            body: "Fotos clavadas en un camino que se dibuja al bajar, cada una con una etiqueta de hasta 40 caracteres. Pon qué pasó, no solo cuándo: “2021: el primer piso, el del ruido”, “2023: el perro”, “2024: el año que casi nos vamos fuera”. Termina en una cuenta atrás, así que apúntala a vuestro próximo plan.",
          },
          {
            template: "museum",
            heading: "Una retrospectiva, enmarcada y con título",
            body: "Una galería tranquila donde cada foto cuelga enmarcada sobre una cartela con tu texto, vuestros años y el número de sala. Ponle nombre a la exposición, “Sam y Alex: una retrospectiva”, pon los años (“2019–2026”) y titula cada foto como un comisario demasiado implicado: “Sin título (tostada quemada)”, “Estudio sobre el robo de manta”.",
          },
          {
            template: "halfway",
            heading: "La distancia que ya habéis recorrido",
            body: "Para un aniversario a distancia: un mapa en forma de postal con vuestras casas en dos islas y la distancia que las separa, que se acorta soplando al móvil. A mitad de camino aparece una frase tuya: “A medio camino. Aquí nos comimos el peor bocadillo de 2022.” Añade hasta cuatro sitios donde os habéis visto como paradas: quedan sellados y cuentan en el total, que pasa a ser lo que habéis viajado para veros.",
          },
          {
            template: "keepsake",
            heading: "Un guardapelo con vuestra fecha grabada",
            body: "Un paquete con sello de lacre y, dentro, una caja de cosas guardadas: una entrada, flores prensadas, una palabra arrancada de un libro y un guardapelo de oro que se abre con un toque. Graba vuestra fecha, hasta 18 caracteres (“12·06·2021”), haz que la entrada sea para la noche en que os conocisteis y elige la palabra que arrancarías para esa persona.",
          },
          {
            template: "jar-of-reasons",
            heading: "Una razón por cada mes",
            body: "Doce notas para el primer aniversario, veinticuatro para el segundo, y así hasta cien. Dale a cada mes su nota, para que cada sacudida caiga en un momento distinto de vuestra historia. La regla de cada una: algo que hizo, no algo que es: “Marzo: aprendiste a hacer la sopa de mi abuela.”",
          },
          {
            template: "the-toast",
            heading: "El brindis de vuestra boda, otra vez",
            body: "Dos copas en una mesa que se llenan inclinando el móvil y chocan con un golpecito; luego la carta del menú se abre con tu discurso. Imprime la carta como la original: el lugar, y la fecha en texto libre, así que “el día más caluroso de 2019” vale. Y da el brindis que darías ahora, años después.",
          },
          {
            template: "the-council",
            heading: "Cinco gatos revisan el primer año",
            body: "Un tribunal de gatos celebra una vista sobre vuestra relación. El cargo: “robar la manta doce meses seguidos”. Las conclusiones, una por gato: “tardó cuatro días en contestar el primer mensaje”, “ahora contesta en cuatro segundos”. El veredicto: visto bueno, con sello. El fallo completo es tu carta.",
          },
          {
            template: "pack-your-bags",
            heading: "Volver a donde empezó todo",
            body: "Llévale a la ciudad donde os conocisteis, o al pueblo del primer viaje, y deja que la lista de equipaje hable: cinco pistas como “la chaqueta que llevabas esa noche” o “zapatos cómodos, hay cuesta”. El panel gira hasta el sitio y la tarjeta de embarque lleva vuestros nombres y la fecha.",
          },
          {
            template: "picnic",
            heading: "Una cesta de pícnic hecha como inventario vuestro",
            body: "Cada toque saca algo de la cesta, fresas, limonada, tulipanes, una entrada, tus fotos, y cada cosa trae una etiqueta escrita por ti, de hasta 48 caracteres. Escríbelas como un inventario de vuestra relación: “fresas, porque siempre me robas las mías”, “la limonada de nuestra primera cita”. Para un aniversario de verano.",
          },
          {
            template: "constellations",
            heading: "Un cielo con una estrella por cada año",
            body: "La otra plantilla gratuita. Una foto por cada año de relación, hasta doce, cada una una estrella en un cielo nocturno; cuando las encuentra todas, se unen en la forma que elijas: un corazón, una estrella o un infinito, si lo tienes claro. Tu frase aparece debajo.",
          },
        ],
      },
      sections: [
        {
          heading: "Qué escribir",
          body: "No resumas la relación. Elige tres momentos y ponlos en orden: el primero, uno difícil que superasteis y algo del mes pasado. Di qué te enseñó cada uno sobre esa persona. Eso es una carta de aniversario, y gana a cualquiera de una estantería. The Letter es gratis; Our Timeline dibuja los años como un camino.",
        },
        {
          heading: "Qué añadir",
          body: "Fotos de todos esos años, en orden, para que la historia se lea como una historia: hasta diez en una plantilla gratis, veinte en una premium. La canción de la boda, del primer viaje o la que siempre discutís: cualquier plantilla puede terminar con treinta segundos de la grabación real, a un toque, y una premium lleva además un vídeo y un mensaje de voz. Museum cuelga las fotos en salas; Vinyl construye todo el regalo alrededor de un disco.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "En una plantilla premium, prográmalo para la mañana del aniversario, para que esté esperando cuando se despierte, en su zona horaria si estáis lejos; o mándalo en la mesa y mira cómo lo abre. Su reacción, un emoji, una nota o un mensaje grabado, te llega a tu panel.",
        },
      ],
      faq: [
        {
          q: "¿Podemos hacer uno cada uno?",
          a: "Sí. Al final de cada regalo hay una respuesta, y “devolver uno” abre un regalo nuevo con los nombres ya cambiados, en la misma plantilla.",
        },
        {
          q: "¿Cuántas fotos puedo poner?",
          a: "Hasta diez en una plantilla gratis y veinte en una premium. Ponlas en el orden en que quieras contar la historia; la plantilla las coloca.",
        },
        keepEs,
      ],
    },
  },

  valentines: {
    en: {
      title: "A Valentine's gift that lasts past the evening",
      lead: "Flowers wilt, chocolates are gone by ten, and the card ends up in a drawer. A gift they open on their phone — a letter under a wax seal, a bouquet you picked stem by stem, a sky where every star is a photo of the two of you — is still there next February, and the one after.",
      ideas: {
        title: "12 digital Valentine's Day gift ideas",
        items: [
          {
            template: "the-letter",
            heading: "A letter, which is how valentines started",
            body: "The oldest valentine in English is usually said to be a letter: in February 1477 Margery Brews wrote to John Paston as “my right well-beloved Valentine”, while their families haggled over her dowry. The Letter is free and its greeting is yours to change, so you can open the way she did, then write the thing you noticed about them this year that nobody else did.",
          },
          {
            template: "photo-booth",
            heading: "A photo-booth strip of every year so far",
            body: "The booth flashes four times and prints a strip, so give it four photos in order: year one, year two, year three, now. Or four from the same good night. Print it in black and white and rewrite the sign on top, which says “PHOTOS · 4 POSES” until you do: the dot starts a second line, so “STILL YOURS · SINCE 2019” fits its 24 characters. The handwritten line beside it: “the one where you're not looking”.",
          },
          {
            template: "xoxo",
            heading: "The name only you call them, in cut-out letters",
            body: "XOXO spells out what you call them in ransom-note letters, “my person” unless you change it, and you should: use the nickname nobody else is allowed to, up to 16 characters. Under the first photo goes a card with the lines you'd underline in a book about them, already underlined. Wherever they tap, a kiss lands.",
          },
          {
            template: "jar-of-reasons",
            heading: "Fourteen reasons for the fourteenth",
            body: "A jar of folded notes they shake out one by one. Fourteen is enough to say something real and few enough to write in an evening. Make each one a moment, not a quality: not “you're kind” but “you learned my mother's recipe from her over the phone, without telling me”. Read them aloud before you send it, and cut any that could be about anyone.",
          },
          {
            template: "bouquet",
            heading: "Their flowers, not a dozen red roses",
            body: "Built stem by stem, so it can be what they actually like: peonies if that's their flower, sunflowers if roses make them sigh, in the colours of the scarf they never take off. It doesn't wilt by the weekend or cost more on the fourteenth. The card inside takes 30 characters: “Peonies. You said peonies.”",
          },
          {
            template: "dark-romance",
            heading: "For the couple who can't stand pink",
            body: "A black leather diary, a tarot card, dark roses and a crow: Valentine's for people who'd rather get a crow than a cupid. Three things are yours to rename: the cut-out headline (“you again”), the words torn out beside the playing cards (“all in, again”) and the name on the tarot card, which should mean something only you two get: “the night bus”, “the one who stayed”.",
          },
          {
            template: "the-council",
            heading: "Five cats approve the relationship",
            body: "For the ones who don't do mushy. The cats hold a hearing, each one reads out a finding you wrote, and the stamp comes down: guilty, approved, certified icon or pardoned. Charge them with “taking my side of the bed, nightly”, add findings like “claims to hate romcoms, cried at the airport scene”, and go with approved.",
          },
          {
            template: "scratch-card",
            heading: "The plan, under the foil",
            body: "Valentine's plans are better found out than announced. Put the clues on the cards in order: a photo of the restaurant's door with “Friday, 8 pm”, a photo of a train ticket, and on the last card, the one they'll scratch hardest, the big line: “Pack a bag. We're not back until Sunday.”",
          },
          {
            template: "coquette",
            heading: "A ticket that gets them into an actual date",
            body: "A pink gingham collage that unrolls when they untie the bow, with a ticket in the middle that reads “ticket to happiness” until you change it. Change it to the plan, in 26 characters: “admit two. Bring a coat.” The postcard in your handwriting has room for a line and where to meet.",
          },
          {
            template: "vinyl",
            heading: "An album of the two of you",
            body: "A turntable that plays their song as the record spins. Name the album, the artist and the side: album “Songs I play when you're out”, artist “the one who can't sing”, side “Side Us”. Your photos sit in a crate as album covers, and your message is printed on the liner notes.",
          },
          {
            template: "arcade",
            heading: "A game for the one who'd rather play",
            body: "A tiny retro game: they drag a basket to catch falling hearts, each level clears one of your photos, and the last reveals your message. You set how many catches a level takes, from 3 to 20: eight is a nice game, twenty is a dare. And put something on the title screen: “LEVEL 14: PLAYER 2 JOINS”.",
          },
          {
            template: "constellations",
            heading: "If you're apart on the fourteenth",
            body: "The other free template: a night sky where every photo is a star. They fly from star to star, and once they've found them all the stars join into a heart and your line appears beneath it. Use a photo from each place you've met, and end on the date you'll next see each other.",
          },
        ],
      },
      sections: [
        {
          heading: "What to write",
          body: "Not “I love you” on its own; they know. Write what you noticed this year: the way they make the coffee, the thing they did when your week fell apart, what you're looking forward to. Keep it to a few lines that only fit them. The Letter is free and opens with a seal; XOXO and Coquette are for the flirt.",
        },
        {
          heading: "What to add",
          body: "Two or three photos are enough here — the first one you took together and the most recent. Bouquet lets you choose the flowers yourself and never wilts; Bloom opens a single flower while they hold the screen. Add a song from the library, or thirty seconds of yours, the real recording, waiting at the end for a tap. A voice message at the end, a paid extra, lands harder than any line of text.",
        },
        {
          heading: "When to send it",
          body: "On a premium template, schedule it to open at midnight on the fourteenth, or first thing in the morning, before the day gets loud. If you're doing dinner, print the QR card and slip it under their plate; it opens with the phone camera. If you're apart, it arrives the second you send it, and their reaction comes straight back.",
        },
      ],
      faq: [
        {
          q: "Is it too much for someone I've only just started seeing?",
          a: "Pick a light template — Kawaii, Arcade, XOXO — write two honest lines, and it reads as a gesture, not a declaration. What you write sets the weight, not the format.",
        },
        phoneEn,
        costEn,
      ],
    },
    es: {
      title: "Un regalo de San Valentín que dura más que la noche",
      lead: "Las flores se marchitan, los bombones no llegan a las diez y la tarjeta acaba en un cajón. Un regalo que abre en su móvil, una carta con sello de lacre, un ramo que has elegido tallo a tallo, un cielo en el que cada estrella es una foto vuestra, sigue ahí el febrero que viene, y el otro.",
      ideas: {
        title: "12 ideas de regalos digitales para San Valentín",
        items: [
          {
            template: "the-letter",
            heading: "Una carta, que es como empezó San Valentín",
            body: "Se suele decir que la felicitación de San Valentín más antigua en inglés es una carta: en febrero de 1477, Margery Brews escribió a John Paston llamándole “mi muy amado Valentín”, mientras sus familias regateaban la dote. La carta es la plantilla gratuita y su saludo se puede cambiar, así que empieza como ella y luego escribe lo que solo tú has notado este año.",
          },
          {
            template: "photo-booth",
            heading: "Una tira de fotomatón con cada año hasta hoy",
            body: "El fotomatón dispara cuatro veces e imprime una tira, así que dale cuatro fotos en orden: el primer año, el segundo, el tercero, ahora. O cuatro de una sola noche que salió bien. Imprímela en blanco y negro y cambia el letrero de arriba por algo vuestro: el punto empieza una segunda línea, así que “TÚ Y YO · DESDE 2019” cabe en sus 24 caracteres. Y la frase a mano de al lado: “la foto en la que no miras”.",
          },
          {
            template: "xoxo",
            heading: "El mote que solo usas tú, en letras recortadas",
            body: "XOXO escribe cómo le llamas con letras recortadas de periódico, como una nota de rescate. Pon el mote que nadie más puede usar, hasta 16 caracteres. Bajo la primera foto va una tarjeta con las frases que subrayarías en un libro sobre esa persona, ya subrayadas. Donde toque, cae un beso.",
          },
          {
            template: "jar-of-reasons",
            heading: "Catorce razones para el catorce",
            body: "Un frasco de notas dobladas que salen de una en una. Catorce bastan para decir algo de verdad y se escriben en una tarde. Que cada una sea un momento y no una cualidad: no “eres buena persona”, sino “aprendiste la receta de mi madre por teléfono, sin decírmelo”. Léelas en voz alta antes de enviarlo y quita las que podrían ser de cualquiera.",
          },
          {
            template: "bouquet",
            heading: "Sus flores, no una docena de rosas rojas",
            body: "Se monta tallo a tallo, así que puede ser lo que le gusta de verdad: peonías si son lo suyo, girasoles si las rosas le aburren, en los colores de esa bufanda que no se quita nunca. No se marchita el fin de semana ni cuesta más el catorce. La tarjeta admite 30 caracteres: “Peonías. Dijiste peonías.” En Cataluña sirve también para Sant Jordi, el 23 de abril, con un libro al lado.",
          },
          {
            template: "dark-romance",
            heading: "Para la pareja que no soporta el rosa",
            body: "Un diario de cuero negro, una carta del tarot, rosas oscuras y un cuervo: San Valentín para quien prefiere un cuervo a un cupido. Puedes cambiar tres cosas: el titular recortado (“otra vez tú”), las palabras recortadas junto a los naipes (“todo, otra vez”) y el nombre de la carta del tarot, que debería significar algo que solo entendáis: “el último metro”, “quien se quedó”.",
          },
          {
            template: "the-council",
            heading: "Cinco gatos dan el visto bueno a la relación",
            body: "Para quien no soporta lo cursi. Los gatos celebran una vista, cada uno lee una conclusión que has escrito y cae el sello: culpable, visto bueno, icono certificado o indulto. Acúsale de “quedarse con mi lado de la cama, cada noche”, añade conclusiones como “dice que odia las comedias románticas y lloró en la del aeropuerto” y elige visto bueno.",
          },
          {
            template: "scratch-card",
            heading: "El plan, para rascar",
            body: "Los planes de San Valentín se disfrutan más si se descubren. Pon las pistas en orden: una foto de la puerta del restaurante con “viernes, 21:00”, una foto de un billete de tren y, en la última tarjeta, la que rascará con más ganas, la frase grande: “Haz la maleta. Volvemos el domingo.”",
          },
          {
            template: "coquette",
            heading: "Una entrada que vale para una cita de verdad",
            body: "Un collage de cuadros rosas que se despliega al deshacer el lazo, con una entrada en el centro. Cambia lo que dice por el plan real, en 26 caracteres: “para dos. Trae abrigo.” En la postal escrita a mano cabe una frase y el lugar donde quedar.",
          },
          {
            template: "vinyl",
            heading: "Un disco de los dos",
            body: "Un tocadiscos que pone su canción mientras gira el vinilo. Ponle nombre al álbum, al artista y a la etiqueta de la cara: álbum “Lo que pongo cuando no estás”, artista “quien no sabe cantar”, cara “Cara Tú y Yo”. Tus fotos están en una caja como portadas, y tu mensaje va impreso en las notas del disco.",
          },
          {
            template: "arcade",
            heading: "Un juego para quien prefiere jugar",
            body: "Un pequeño juego retro: arrastra una cesta para atrapar corazones, cada nivel descubre una de tus fotos y el último muestra tu mensaje. Tú decides cuántos hay que atrapar por nivel, de 3 a 20: ocho es una partida bonita; veinte, un reto. Y en la pantalla de título: “NIVEL 14: ENTRA EL J2”.",
          },
          {
            template: "constellations",
            heading: "Si el catorce estáis lejos",
            body: "La otra plantilla gratuita: un cielo nocturno donde cada foto es una estrella. Va de estrella en estrella y, cuando las encuentra todas, se unen en un corazón y aparece tu frase debajo. Usa una foto de cada sitio donde os habéis visto y termina con la fecha en que os volvéis a ver.",
          },
        ],
      },
      sections: [
        {
          heading: "Qué escribir",
          body: "No un “te quiero” a secas; ya lo sabe. Escribe lo que has notado este año: cómo hace el café, lo que hizo la semana que se te vino abajo, lo que te apetece que venga. Unas pocas líneas que solo le vayan a esa persona. The Letter es gratis y se abre con un sello; XOXO y Coquette son para tontear.",
        },
        {
          heading: "Qué añadir",
          body: "Con dos o tres fotos basta: la primera que os hicisteis y la más reciente. En Bouquet eliges tú las flores y nunca se marchitan; en Bloom se abre una sola flor mientras mantiene pulsada la pantalla. Añade una canción de la biblioteca, o treinta segundos de la vuestra, la grabación real, esperando al final a un toque. Un mensaje de voz al final, un extra de pago, llega más hondo que cualquier línea escrita.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "En una plantilla premium, prográmalo para que se abra a medianoche del catorce, o a primera hora, antes de que el día se llene de ruido. Si hay cena, imprime la tarjeta QR y déjala bajo su plato; se abre con la cámara del móvil. Si estáis lejos, llega en el segundo en que lo envías, y su reacción vuelve directa.",
        },
      ],
      faq: [
        {
          q: "¿Es demasiado para alguien con quien acabo de empezar?",
          a: "Elige una plantilla ligera, Kawaii, Arcade, XOXO, escribe dos líneas sinceras y se lee como un gesto, no como una declaración. El peso lo pone lo que escribes, no el formato.",
        },
        phoneEs,
        costEs,
      ],
    },
  },

  wedding: {
    en: {
      title: "A wedding gift with the words in it",
      lead: "For the couple, or for the person you're marrying. A wedding day goes past in a blur; the morning after is when they read things. Gather the photos, the wishes and a song into something they can open then — and every year that follows.",
      sections: [
        {
          heading: "What to write",
          body: "If it's for the couple: one memory of each of them, and one line about the two of them together that you'd never say in a speech. If it's for your partner, written the night before: what you're thinking about, and what you promise. The Toast raises a glass; Front Page prints them on the cover of their own paper.",
        },
        {
          heading: "What to add",
          body: "Photos from before they met and from the years since — Our Timeline sets them along a road, Museum hangs them in rooms. The song from the first dance if you know it: thirty seconds of the real recording wait at the end, a tap away. For a gift to your partner, a voice message is the thing they'll keep coming back to.",
        },
        {
          heading: "When to send it",
          body: "Print the QR card and tuck it inside the real card, so it's opened with the rest. Or schedule it for the morning after, when the phones come out and the day is being relived. A gift to your partner can be timed for the hour before the ceremony, when they're alone with their phone.",
        },
      ],
      faq: [
        {
          q: "Can guests contribute?",
          a: "One person makes each gift. If several of you want in, make one each — the couple gets a set — or gather the lines by message first and put them in one gift together.",
        },
        {
          q: "Does the QR card work without an app?",
          a: "Yes. The phone camera reads it and opens the gift in the browser. It works on iPhone and Android, and the link on the card stays live.",
        },
        keepEn,
      ],
    },
    es: {
      title: "Un regalo de boda con las palabras dentro",
      lead: "Para la pareja, o para la persona con la que te casas. El día pasa volando; la mañana siguiente es cuando se leen las cosas. Junta las fotos, los deseos y una canción en algo que puedan abrir entonces, y cada año que venga después.",
      sections: [
        {
          heading: "Qué escribir",
          body: "Si es para la pareja: un recuerdo de cada uno y una frase sobre los dos juntos que nunca dirías en un discurso. Si es para tu pareja, escrito la noche antes: en qué piensas y qué prometes. The Toast levanta la copa; Front Page los pone en la portada de su propio periódico.",
        },
        {
          heading: "Qué añadir",
          body: "Fotos de antes de conocerse y de los años desde entonces: Our Timeline las coloca a lo largo de un camino, Museum las cuelga en salas. La canción del primer baile si la sabes: treinta segundos de la grabación real esperan al final, a un toque. En un regalo para tu pareja, un mensaje de voz es a lo que volverá una y otra vez.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Imprime la tarjeta QR y métela en la tarjeta de verdad, para que se abra con las demás. O prográmalo para la mañana siguiente, cuando salen los móviles y se revive el día. Un regalo a tu pareja puede abrirse la hora antes de la ceremonia, cuando está a solas con su móvil.",
        },
      ],
      faq: [
        {
          q: "¿Pueden participar los invitados?",
          a: "Cada regalo lo hace una persona. Si sois varios, haced uno cada uno, la pareja recibe un conjunto, o recoged antes las frases por mensaje y ponedlas juntas en un solo regalo.",
        },
        {
          q: "¿La tarjeta QR funciona sin app?",
          a: "Sí. La cámara del móvil la lee y abre el regalo en el navegador. Funciona en iPhone y Android, y el enlace de la tarjeta sigue vivo.",
        },
        keepEs,
      ],
    },
  },

  graduation: {
    en: {
      title: "A graduation gift from the first day to the last",
      lead: "Money is what everyone gives, and it's spent by August. This is the other thing: the photos from year one to the cap and gown, what you were proud of when nobody was looking, and a song for the day — timed to open the moment they finish.",
      sections: [
        {
          heading: "What to write",
          body: "Not “congratulations” — they'll get fifty of those. Write one thing you saw them do that they don't know you noticed: the semester they nearly quit, the night before the exam, the phone call where they sounded different. Then one line about what comes next. Front Page puts them on the cover; Fortune Cookie hides the line inside for them to crack.",
        },
        {
          heading: "What to add",
          body: "The first-day photo, the awkward middle years, and this month — Our Timeline lays them along the road that got them there. Add the song they studied to, or the one from the car on the way to school: the real one waits at the end, thirty seconds of it a tap away. Cap Toss is the one for the day itself: they cheer into the phone and the cap goes up.",
        },
        {
          heading: "When to send it",
          body: "Schedule it for the morning of the ceremony, or for the minute it ends if you know the time. If you're in the audience, print the QR card and hand it over with the flowers. If you can't be there, it arrives wherever they are, and their reaction comes back to you.",
        },
      ],
      faq: [
        {
          q: "Can it come from the whole family?",
          a: "Sign it from all of you and put everyone's line in the message. If each of you wants to say your own piece, make one gift each; they're quick.",
        },
        phoneEn,
        costEn,
      ],
    },
    es: {
      title: "Un regalo de graduación del primer día al último",
      lead: "Dinero le da todo el mundo, y en agosto ya no queda. Esto es lo otro: las fotos desde el primer curso hasta el birrete, de qué estabas orgulloso cuando nadie miraba y una canción para el día, programado para abrirse en el momento en que termina.",
      sections: [
        {
          heading: "Qué escribir",
          body: "No “enhorabuena”; recibirá cincuenta. Escribe una cosa que le viste hacer y que no sabe que notaste: el cuatrimestre en que casi lo deja, la noche antes del examen, la llamada en la que sonaba distinto. Luego una línea sobre lo que viene. Front Page le pone en la portada; Fortune Cookie esconde la frase dentro para que la rompa.",
        },
        {
          heading: "Qué añadir",
          body: "La foto del primer día, los años torpes del medio y este mes: Our Timeline las coloca a lo largo del camino que le trajo hasta aquí. Añade la canción con la que estudiaba, o la del coche de camino al colegio: la de verdad espera al final, con treinta segundos a un toque. Cap Toss es la del día en sí: anima al móvil a gritos y el birrete sale volando.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Prográmalo para la mañana de la ceremonia, o para el minuto en que acaba si sabes la hora. Si estás entre el público, imprime la tarjeta QR y dásela con las flores. Si no puedes estar, llega esté donde esté, y su reacción te vuelve a ti.",
        },
      ],
      faq: [
        {
          q: "¿Puede ser de toda la familia?",
          a: "Fírmalo de parte de todos y pon la frase de cada uno en el mensaje. Si cada cual quiere decir lo suyo, haced un regalo por persona; se hacen rápido.",
        },
        phoneEs,
        costEs,
      ],
    },
  },

  christmas: {
    en: {
      title: "A Christmas gift that can't get lost in the post",
      lead: "For the people you won't see this year and the ones you will. Nothing to ship, no deadline to miss: it opens on Christmas morning wherever they are, with your photos, a song for the day and the message you'd say if you were in the room.",
      ideas: {
        title: "12 digital Christmas gift ideas",
        items: [
          {
            template: "snow-globe",
            heading: "A snow globe that tells the year in four shakes",
            body: "Set it to four shakes and the snow settles four times: a line, a photo, a line, a photo. That's a short story of the year: “January: we said this would be the year”, the photo from the spring, “It was, mostly”, then this month's. The brass plaque at the end takes 44 characters: “Next Christmas: Lisbon, the two of us”.",
          },
          {
            template: "fireside",
            heading: "A letter by candlelight, with their drink on the sill",
            body: "Set the window to snow and put their real drink on the sill by the candle: cocoa, tea or coffee. The tag tied to the candle says “for Sam” unless you change it, and it takes 24 characters, enough for something only they'd get: “for after the dishes”. Then write what you'd say to them once everyone else has gone to bed.",
          },
          {
            template: "the-letter",
            heading: "A Christmas letter that isn't a family newsletter",
            body: "The free one, and the opposite of the round-up letter some families send: no promotions, no exam results, just them. Change the greeting from “Dear Sam,” to what you actually call them, press your initial into the wax, and leave the year's highlights to the group chat. Write about one evening from this year, start to finish, and why it's the one you'd keep.",
          },
          {
            template: "front-page",
            heading: "The year's front page, with them as the story",
            body: "A newspaper with their name on the masthead and room for a headline, a weather box, a horoscope and up to eight classified ads. It works best when it's petty: “LOCAL LEGEND STILL HASN'T PUT UP THE SHELF”, weather “Mild, with a chance of leftovers”, and in the classifieds, “FOUND: the end of the tape. Owner may collect.” A good one for a parent.",
          },
          {
            template: "recipe-box",
            heading: "The recipe for whoever cooks Christmas dinner",
            body: "A recipe card about them, poured in one ingredient at a time as they tilt the phone. Write every ingredient yourself, because the ones it starts with are written for a mother, and write them the way this person cooks: “one kitchen, taken over from 7 a.m.”, “a timer nobody else may touch”, “gravy, made twice, the first one doesn't count”. Then replace “Makes one of her” under the title with “Makes one whole family, every year.”",
          },
          {
            template: "pack-your-bags",
            heading: "The trip, unwrapped on a departures board",
            body: "If the present is a trip, don't just tell them. The suitcase takes five clues, one luggage tag at a time, so tease: “thermal socks”, “your passport”, “the big coat, not the nice one”. Then the board clatters through the letters to the city, and the ticket shows the date and the number of nights. It can be a train or a road trip too.",
          },
          {
            template: "scratch-card",
            heading: "News under the foil",
            body: "For the Christmas you have something to announce. Every card hides a photo and a line, so build up to it: a photo of the old kitchen, “last Christmas here”, a photo of a set of keys, and on the final card, in big letters, “We got the house”. It works for a baby, a puppy or a yes. Be in the room when they scratch.",
          },
          {
            template: "midnight-countdown",
            heading: "A countdown that goes off at midnight",
            body: "Point it at midnight on Christmas Eve, or at the stroke of New Year. Send the link whenever you like: until then it shows the clock running down, and at zero the fireworks go off and the gift opens. The headline sits over the timer (“Until it's officially Christmas”), and the line with the fireworks is yours: “It's Christmas. Go back to sleep. I love you.” Set the time zone to theirs.",
          },
          {
            template: "halfway",
            heading: "If you're apart this Christmas",
            body: "A postcard map with your homes on two islands and the real distance between them in big numbers, which they close by blowing into the phone. Halfway along, a line of yours pops up: “Halfway there. Leave the porch light on.” Add the places you've met in between as stops: they're stamped on the postcard and counted in the total.",
          },
          {
            template: "jar-of-reasons",
            heading: "Twelve reasons for the twelve days of Christmas",
            body: "Twelve folded notes in a jar, and one rule: they shake out one a day, from Christmas Day to the fifth of January, no shaking ahead. Make each note a moment rather than a compliment: “The way you said ‘oh no’ when the tree fell over, then laughed for ten minutes.”",
          },
          {
            template: "our-timeline",
            heading: "The year as a road, month by month",
            body: "Every photo gets a label of up to 40 characters, and a month with a note says more than a date: “March: no heating, all month”, “July: the wedding we nearly missed”. The road draws itself as they scroll and ends on a countdown, so point it at the next thing you've planned together.",
          },
          {
            template: "evergreen",
            heading: "A parcel for the one who's there every Christmas",
            body: "An evergreen stays green all winter, which suits the person who turns up every year. It comes wrapped in old newspaper and twine with their name on the tag, and it really unwraps: the paper falls open and butterflies fly out over your photos. The words across the record and the newsprint are yours, 22 characters: swap “my evergreen” for “year after year”, or for the name only you call them.",
          },
        ],
      },
      sections: [
        {
          heading: "What to write",
          body: "The year in three lines: what you'll remember about it, what they did for you in it, and what you want for them in the next one. Say the thing you'd say after dinner, once the table has gone quiet. Fireside unfolds your letter by candlelight; Snow Globe shakes your photos into the snow.",
        },
        {
          heading: "What to add",
          body: "The photos from this year, and one old Christmas photo for the ones who'll recognise it — twenty fit, but eight good ones beat twenty. End on the real song, thirty seconds of it a tap away, and if you're apart, add a voice message: the closest you'll get to being there.",
        },
        {
          heading: "When to send it",
          body: "Schedule it for Christmas morning in their time zone — it unlocks by itself. If you'll be together, print the QR card and hang it on the tree or leave it in the stocking; it opens with the phone camera. For a whole family, make one gift and send the same link to everyone.",
        },
      ],
      faq: [
        {
          q: "Can one gift go to several people?",
          a: "Yes. A gift is a link, and the link can be opened by anyone you send it to. For a family, address it to all of them and send it once.",
        },
        {
          q: "Will it open on an older phone?",
          a: "It runs in the phone's browser, with nothing to install, on any iPhone or Android from the last several years. On a slow connection it takes a moment longer to load.",
        },
        {
          q: "Can it open by itself on Christmas morning?",
          a: "On a premium template, yes: schedule it and it unlocks by itself at the time you pick, in their time zone. On a free template, send the link at the moment you want them to open it, or tell them to wait for the morning.",
        },
        {
          q: "Is it too late if it's already Christmas Eve?",
          a: "No. It arrives the moment you press send: publish it, copy the link and put it in WhatsApp, iMessage, an email or a card. There is nothing to ship and no last posting date to miss.",
        },
        {
          q: "What can I give a long-distance partner for Christmas?",
          a: "Something that closes the distance for a minute. Halfway shows the real distance between you and lets them fly a paper plane home, Passport draws the route from your city to theirs, and on any premium template a voice message is the nearest thing to being in the room.",
        },
        costEn,
        keepEn,
      ],
    },
    es: {
      title: "Un regalo de Navidad que no se pierde en el correo",
      lead: "Para los que no verás este año y para los que sí. Nada que enviar por correo, ninguna fecha límite: se abre la mañana de Navidad estén donde estén, con tus fotos, una canción para el día y el mensaje que dirías si estuvieras allí.",
      ideas: {
        title: "12 ideas de regalos digitales de Navidad",
        items: [
          {
            template: "snow-globe",
            heading: "Una bola de nieve que cuenta el año en cuatro sacudidas",
            body: "Pon cuatro sacudidas y la nieve se posa cuatro veces: una frase, una foto, una frase, una foto. Cabe una historia corta del año: “Enero: dijimos que este sería el año”, la foto de la primavera, “Y lo fue, casi”, y la de este mes. La placa de latón del final admite 44 caracteres: “La próxima Navidad, en Lisboa”.",
          },
          {
            template: "fireside",
            heading: "Una carta a la luz de una vela, con su bebida en el alféizar",
            body: "Pon nieve en la ventana y su bebida de verdad en el alféizar, junto a la vela: chocolate, té o café. La etiqueta atada a la vela admite 24 caracteres, suficientes para algo que solo entienda esa persona: “para después de fregar”. Luego escribe lo que le dirías cuando el resto ya se ha ido a dormir.",
          },
          {
            template: "the-letter",
            heading: "Una carta, no un christmas",
            body: "La gratuita. Un christmas se firma y acaba en una estantería; una carta se guarda. Cambia el saludo por cómo le llamas de verdad, imprime tu inicial en el lacre y deja los resúmenes del año para el grupo de la familia: escribe sobre una sola tarde de este año, de principio a fin, y por qué es la que te quedarías.",
          },
          {
            template: "front-page",
            heading: "La portada del año, con esa persona de protagonista",
            body: "Un periódico con su nombre en la cabecera y sitio para un titular, el tiempo, el horóscopo y hasta ocho anuncios por palabras. Cuanto más pequeña la queja, mejor: “LEYENDA LOCAL SIGUE SIN PONER LA BALDA”, el tiempo, “Templado, con probabilidad de sobras”, y en los anuncios, “SE BUSCA: el principio del celo. Se gratificará.” Ideal para un padre o una madre.",
          },
          {
            template: "recipe-box",
            heading: "La receta de quien hace la cena de Nochebuena",
            body: "Una ficha de receta sobre esa persona, con ingredientes que caen uno a uno al inclinar el móvil. Escríbelos todos tú, porque los que trae están pensados para una madre, y escríbelos tal como cocina esa persona: “una cocina, ocupada desde las siete”, “un temporizador que nadie más puede tocar”, “el caldo, hecho dos veces; el primero no cuenta”. Luego cambia “Sale una como ella”, debajo del título, por “Da para toda la familia, cada año.”",
          },
          {
            template: "pack-your-bags",
            heading: "El viaje, desvelado en un panel de salidas",
            body: "Si el regalo es un viaje, no lo digas sin más. La maleta admite cinco pistas, una etiqueta cada vez, así que juega: “calcetines térmicos”, “tu pasaporte”, “el abrigo gordo, no el bonito”. Luego el panel gira letra a letra hasta la ciudad y el billete muestra la fecha y las noches. También vale un tren o un viaje en coche.",
          },
          {
            template: "scratch-card",
            heading: "Una noticia para rascar",
            body: "Para la Navidad en la que hay algo que anunciar. Cada tarjeta esconde una foto y una frase, así que ve preparando el terreno: una foto de la cocina vieja, “la última Navidad aquí”, una foto de unas llaves y, en la última, en grande, “Tenemos casa”. Vale para un bebé, un perro o un sí. Tú, delante cuando rasque.",
          },
          {
            template: "midnight-countdown",
            heading: "Una cuenta atrás hasta las doce",
            body: "Ponla para la medianoche de Nochebuena o para las campanadas de Nochevieja. Manda el enlace cuando quieras: hasta entonces verá el reloj bajar, y a cero saltan los fuegos artificiales y se abre el regalo. El titular va encima del contador (“Hasta que sea Navidad de verdad”) y la frase de los fuegos es tuya: “Feliz Navidad. Vuelve a dormirte. Te quiero.” Pon su zona horaria.",
          },
          {
            template: "halfway",
            heading: "Si este año pasáis la Navidad lejos",
            body: "Un mapa en forma de postal con vuestras casas en dos islas y la distancia real en números grandes, que se acorta soplando al móvil. A mitad de camino aparece una frase tuya: “A medio camino. Deja la luz del portal encendida.” Añade como paradas los sitios donde os habéis visto: quedan sellados en la postal y cuentan en el total.",
          },
          {
            template: "jar-of-reasons",
            heading: "Una razón al día, de Navidad a Reyes",
            body: "Trece notas dobladas en un frasco y una regla: sale una al día, del 25 de diciembre al 6 de enero, sin agitar antes de tiempo. Que cada nota sea un momento y no un cumplido: “Tu ‘ay, no’ cuando se cayó el árbol, y luego diez minutos de risa.”",
          },
          {
            template: "our-timeline",
            heading: "El año como un camino, mes a mes",
            body: "Cada foto lleva una etiqueta de hasta 40 caracteres, y un mes con nota dice más que una fecha: “Marzo: un mes sin calefacción”, “Julio: la boda a la que casi no llegamos”. El camino se dibuja al bajar por la página y termina en una cuenta atrás, así que apúntala a lo próximo que tengáis planeado.",
          },
          {
            template: "evergreen",
            heading: "Un paquete para quien está cada Navidad",
            body: "Un árbol de hoja perenne sigue verde todo el invierno, como quien aparece cada año. Va envuelto en papel de periódico y cordel, con su nombre en la etiqueta, y se desenvuelve de verdad: el papel se abre y salen mariposas sobre tus fotos. Las palabras del disco y del periódico las eliges tú, 22 caracteres: “año tras año”, o el nombre que solo usas tú.",
          },
        ],
      },
      sections: [
        {
          heading: "Qué escribir",
          body: "El año en tres líneas: lo que recordarás de él, lo que esa persona hizo por ti y lo que le deseas para el siguiente. Di lo que dirías después de la cena, cuando la mesa se queda en silencio. Fireside despliega tu carta a la luz de una vela; Snow Globe agita tus fotos en la nieve.",
        },
        {
          heading: "Qué añadir",
          body: "Las fotos de este año y una Navidad antigua para quien vaya a reconocerla: caben veinte, pero ocho buenas ganan a veinte. Termina con la canción de verdad, treinta segundos a un toque, y, si estáis lejos, añade un mensaje de voz: lo más cerca que vas a estar.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Prográmalo para la mañana de Navidad en su zona horaria; se desbloquea solo. Si vais a estar juntos, imprime la tarjeta QR y cuélgala del árbol o déjala en el calcetín; se abre con la cámara del móvil. Para toda una familia, haz un regalo y manda el mismo enlace a todos.",
        },
      ],
      faq: [
        {
          q: "¿Un regalo puede ir a varias personas?",
          a: "Sí. Un regalo es un enlace, y el enlace lo abre cualquiera a quien se lo mandes. Para una familia, dirígelo a todos y envíalo una vez.",
        },
        {
          q: "¿Se abre en un móvil viejo?",
          a: "Funciona en el navegador del móvil, sin instalar nada, en cualquier iPhone o Android de los últimos años. Con mala conexión tarda un poco más en cargar.",
        },
        {
          q: "¿Puede abrirse sola la mañana de Navidad?",
          a: "En una plantilla premium, sí: prográmala y se desbloquea sola a la hora que elijas, en su zona horaria. En una gratuita, manda el enlace en el momento en que quieras que se abra, o pide que espere a la mañana.",
        },
        {
          q: "¿Llego tarde si ya es Nochebuena?",
          a: "No. Llega en el momento en que pulsas enviar: publícalo, copia el enlace y pégalo en WhatsApp, iMessage, un correo o una tarjeta. No hay nada que mandar por correo ni último día de envío que se te pase.",
        },
        {
          q: "¿Qué le regalo en Navidad a mi pareja a distancia?",
          a: "Algo que acorte la distancia un momento. A medio camino muestra la distancia real que os separa y deja volar un avión de papel hasta casa, Pasaporte dibuja la ruta de tu ciudad a la suya y, en cualquier plantilla premium, un mensaje de voz es lo más parecido a estar allí.",
        },
        costEs,
        keepEs,
      ],
    },
  },

  halloween: {
    en: {
      title: "A Halloween gift they open with a tap",
      lead: "Better than a bag of sweets, and it doesn't need a costume. Ring the doorbell, light the pumpkin, and let a small ghost hand over your photos, your message and a song in the dark — for the friend who loves this night, or the one who needs cheering up on it.",
      sections: [
        {
          heading: "What to write",
          body: "Keep it light and keep it short. An inside joke, the story of the costume that went wrong, a dare for the evening. Trick or Treat delivers it after the bell: treat lights the pumpkin and rains sweets, trick earns a boo first, then the treat anyway.",
        },
        {
          heading: "What to add",
          body: "Photos from past Halloweens, the worse the costume the better. A song for the dark, from the library, or the real one you're both thinking of, waiting at the end for a tap. A short video is worth it here: a jump scare works better moving. The template is premium, so the video comes with it.",
        },
        {
          heading: "When to send it",
          body: "Send it as the doorbell rounds start, or schedule it for the moment it gets dark where they are. If there's a party, print the QR card and hide it somewhere they'll find it late. It opens with the phone camera, with nothing to install, so it works on a borrowed phone at the party too.",
        },
      ],
      faq: [
        {
          q: "Is it scary?",
          a: "Only as scary as you make it. The template is a doorbell, a pumpkin and a small ghost; what you write and which song you pick decide the mood. For someone easily spooked, choose a gentle song and it's a friendly ghost at the door.",
        },
        phoneEn,
        costEn,
      ],
    },
    es: {
      title: "Un regalo de Halloween que se abre con un toque",
      lead: "Mejor que una bolsa de chuches, y no hace falta disfraz. Llama al timbre, enciende la calabaza y deja que un fantasmita entregue tus fotos, tu mensaje y una canción en la oscuridad, para quien adora esta noche o para quien necesita que se la alegren.",
      sections: [
        {
          heading: "Qué escribir",
          body: "Ligero y corto: con tres o cuatro frases basta. Un chiste privado, la historia del disfraz que salió mal, un reto para la noche. Trick or Treat lo entrega después del timbre: “treat” enciende la calabaza y llueven chuches; “trick” se gana primero un buu, y luego las chuches igualmente.",
        },
        {
          heading: "Qué añadir",
          body: "Fotos de Halloweens pasados, cuanto peor el disfraz, mejor. Una canción para la oscuridad, de la biblioteca, o la de verdad que tenéis en la cabeza, esperando al final a un toque. Un vídeo corto aquí compensa: un susto funciona mejor en movimiento. La plantilla es premium, así que el vídeo va incluido.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Mándalo cuando empiecen las rondas del timbre, o prográmalo para el momento en que anochece donde está. Si hay fiesta, imprime la tarjeta QR y escóndela donde la encuentre tarde. Se abre con la cámara del móvil, sin instalar nada, así que funciona también en un móvil prestado en plena fiesta.",
        },
      ],
      faq: [
        {
          q: "¿Da miedo?",
          a: "Solo el que tú le pongas. La plantilla es un timbre, una calabaza y un fantasmita; el tono lo deciden lo que escribes y la canción que eliges. Para alguien asustadizo, elige una canción suave y es un fantasma simpático en la puerta.",
        },
        phoneEs,
        costEs,
      ],
    },
  },

  "mothers-day": {
    en: {
      title: "A Mother's Day gift in your own words",
      lead: "She has a drawer of cards. What she doesn't have is the thing you'd say if you weren't embarrassed: the old photos, the song she always sings along to, and a letter that names what she did for you. Sent as a link she can open on the bus, at work, and again that night.",
      sections: [
        {
          heading: "What to write",
          body: "Start with a specific memory — the packed lunches, the lift at 2 a.m., the thing she said that you still repeat. Then say what you understand about it now that you didn't then. Two paragraphs. Jar of Reasons lets you give her a jar of short ones to shake out one at a time, which is easier than one long letter.",
        },
        {
          heading: "What to add",
          body: "Find the photos she's in, not the ones she took — there are always fewer of those. Add her song: something from the library, or the real one, thirty seconds of it waiting at the end for a tap. Bouquet never wilts and you pick every stem; Recipe Box writes the recipe for her, one ingredient at a time.",
        },
        {
          heading: "When to send it",
          body: "On a premium template, schedule it for first thing in the morning, so it's there before the phone calls. If you're bringing her lunch, print the QR card and put it under her plate. If you're far away, it arrives the second you send it, and her reaction — an emoji, a note, or a recorded one — comes back to your dashboard.",
        },
      ],
      faq: [
        {
          q: "Can my brothers and sisters add their lines?",
          a: "One person makes the gift; collect the others' lines by message and put them in, each under a name. Or make one each — she gets a set to open one after another.",
        },
        phoneEn,
        costEn,
      ],
    },
    es: {
      title: "Un regalo del Día de la Madre con tus palabras",
      lead: "Tiene un cajón de tarjetas. Lo que no tiene es lo que le dirías si no te diera vergüenza: las fotos antiguas, la canción que siempre canta y una carta que nombre lo que hizo por ti. Enviado como un enlace que abre en el autobús, en el trabajo y otra vez esa noche.",
      sections: [
        {
          heading: "Qué escribir",
          body: "Empieza por un recuerdo concreto: las meriendas, el coche a las dos de la madrugada, la frase que dijo y que sigues repitiendo. Luego di qué entiendes ahora que entonces no. Dos párrafos. Jar of Reasons te deja darle un tarro de razones cortas para sacar de una en una, que es más fácil que una carta larga.",
        },
        {
          heading: "Qué añadir",
          body: "Busca las fotos en las que sale ella, no las que hizo ella; siempre hay menos. Añade su canción: algo de la biblioteca, o la de verdad, con treinta segundos esperando al final a un toque. Bouquet nunca se marchita y eliges cada tallo; Recipe Box escribe la receta de ella, ingrediente a ingrediente.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "En una plantilla premium, prográmalo para primera hora de la mañana, para que esté antes que las llamadas. Si vas a llevarle la comida, imprime la tarjeta QR y déjala bajo su plato. Si estás lejos, llega en cuanto lo envías, y su reacción, un emoji, una nota o una grabada, te llega a tu panel.",
        },
      ],
      faq: [
        {
          q: "¿Pueden añadir algo mis hermanos?",
          a: "El regalo lo hace una persona; recoge las frases de los demás por mensaje y ponlas dentro, cada una con su nombre. O haced uno cada uno: le llega un conjunto para abrir uno detrás de otro.",
        },
        phoneEs,
        costEs,
      ],
    },
  },

  "fathers-day": {
    en: {
      title: "A Father's Day gift he'll actually keep",
      lead: "Not another tie, not a mug. The road trips, the lessons, the terrible jokes, in a gift that opens on his phone — with a note that says the thing sons and daughters mostly don't say to their dads, and the song from the car.",
      sections: [
        {
          heading: "What to write",
          body: "Dads get the shortest messages of anyone. Give him a real one: the time he showed up, the thing he taught you that you use every week, the joke you've stolen. Then one line you've never said out loud. Front Page makes him the headline; Museum gives the two of you a building.",
        },
        {
          heading: "What to add",
          body: "The photo where he's carrying you, the one where you're the same height, and one from this year. The song from the car, or the one he plays too loud in the kitchen: the real one waits at the end, thirty seconds of it a tap away. A short video of the grandchildren, if there are any.",
        },
        {
          heading: "When to send it",
          body: "Send it in the morning, before the barbecue, or schedule it so it's the first thing on his phone. If you're together, print the QR card and put it with the present; it opens with the camera. Jar of Reasons gives him a jar of short ones to shake out over the week.",
        },
      ],
      faq: [
        {
          q: "He isn't good with phones. Will he manage?",
          a: "It's one tap on a link, or pointing the camera at the card. There's nothing to install and no account to make. If he can open a photo someone sends him, he can open this.",
        },
        phoneEn,
        costEn,
      ],
    },
    es: {
      title: "Un regalo del Día del Padre que guardará de verdad",
      lead: "Ni otra corbata ni otra taza. Los viajes en coche, las lecciones y los chistes malos, en un regalo que se abre en su móvil, con una nota que dice lo que hijos e hijas casi nunca dicen a sus padres, y la canción del coche.",
      sections: [
        {
          heading: "Qué escribir",
          body: "A los padres les llegan los mensajes más cortos de todos. Dale uno de verdad: la vez que apareció, lo que te enseñó y usas cada semana, el chiste que le has robado. Luego una línea que nunca has dicho en voz alta. Front Page le hace titular; Museum os da un edificio a los dos.",
        },
        {
          heading: "Qué añadir",
          body: "La foto en la que te lleva en brazos, la de cuando ya medís lo mismo y una de este año. La canción del coche, o la que pone demasiado alta en la cocina: la de verdad espera al final, con treinta segundos a un toque. Un vídeo corto de los nietos, si los hay.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Mándalo por la mañana, antes de la comida, o prográmalo para que sea lo primero que vea en el móvil. Si estáis juntos, imprime la tarjeta QR y ponla con el regalo; se abre con la cámara. Jar of Reasons le da un tarro de razones cortas para ir sacando durante la semana.",
        },
      ],
      faq: [
        {
          q: "No se maneja con el móvil. ¿Sabrá abrirlo?",
          a: "Es un toque en un enlace, o apuntar la cámara a la tarjeta. No hay nada que instalar ni cuenta que crear. Si sabe abrir una foto que le mandan, sabe abrir esto.",
        },
        phoneEs,
        costEs,
      ],
    },
  },

  apology: {
    en: {
      title: "How to say sorry when a text isn't enough",
      lead: "A text apology is read in four seconds and answered in ten. This takes longer to make, and that is the point: they can see you sat down, chose the words, found the photo, and sent something they can open when they're ready — not something they have to answer now.",
      sections: [
        {
          heading: "What to write",
          body: "Say what you did, in plain words, without “if” and without “but”. Say what you understand it cost them. Say what you'll do differently, and only if it's true. Don't ask for anything back. The Letter is free and gives the words room; Text Thread says it one bubble at a time, the way you'd have said it if you'd had the nerve.",
        },
        {
          heading: "What to add",
          body: "One photo, maybe two, from a good day — not as a bargaining chip, as a reminder of what you're apologising for the sake of. No song is fine here, or something quiet from the library. Paper Crane has them fold the page crease by crease, one line per fold, which takes patience; Bloom opens slowly, which suits the tone.",
        },
        {
          heading: "When to send it",
          body: "Not at midnight, not at work. Send it when they'll have a quiet moment, and don't follow it with a text asking if they've seen it. Your dashboard shows you when it's been opened and carries their reaction back if they choose to send one. Then leave it with them.",
        },
      ],
      faq: [
        {
          q: "Is a digital gift too little for a serious apology?",
          a: "It's the words that do the work; the gift is the envelope. Write the honest version, don't decorate it, and it will read as what it is: time taken.",
        },
        {
          q: "Can I make it without them knowing until it's sent?",
          a: "Yes. Nobody sees it until you publish, and nobody is told about it until you send the link yourself. The Letter is free, so there's no charge to explain either.",
        },
        keepEn,
      ],
    },
    es: {
      title: "Cómo pedir perdón cuando un mensaje no basta",
      lead: "Una disculpa por WhatsApp se lee en cuatro segundos y se contesta en diez. Esto tarda más en hacerse, y esa es la gracia: se nota que te sentaste, elegiste las palabras, buscaste la foto y mandaste algo que puede abrir cuando esté preparado, no algo que tenga que contestar ahora.",
      sections: [
        {
          heading: "Qué escribir",
          body: "Di lo que hiciste, con palabras claras, sin “si” y sin “pero”. Di qué entiendes que le costó. Di qué harás distinto, y solo si es verdad. No pidas nada a cambio. The Letter es gratis y le da espacio a las palabras; Text Thread lo dice burbuja a burbuja, como lo habrías dicho si te hubieras atrevido.",
        },
        {
          heading: "Qué añadir",
          body: "Una foto, dos como mucho, de un buen día: no como moneda de cambio, sino para recordar por qué pides perdón. Aquí puede ir sin canción, o algo tranquilo de la biblioteca. Paper Crane le hace doblar la hoja pliegue a pliegue, una línea por doblez, y eso pide paciencia; Bloom se abre despacio, que va con el tono.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Ni a medianoche ni en el trabajo. Mándalo cuando tenga un rato tranquilo, y no lo sigas con un mensaje preguntando si lo ha visto. Tu panel te dice cuándo se ha abierto y te trae su reacción si decide mandarla. Y luego déjalo en sus manos.",
        },
      ],
      faq: [
        {
          q: "¿Un regalo digital se queda corto para una disculpa seria?",
          a: "El trabajo lo hacen las palabras; el regalo es el sobre. Escribe la versión sincera, no la adornes, y se leerá como lo que es: tiempo dedicado.",
        },
        {
          q: "¿Puedo hacerlo sin que se entere hasta que lo envíe?",
          a: "Sí. Nadie lo ve hasta que lo publicas, y nadie se entera hasta que tú mismo mandas el enlace. The Letter es gratis, así que tampoco hay un cargo que explicar.",
        },
        keepEs,
      ],
    },
  },

  "long-distance": {
    en: {
      title: "A gift that arrives the moment you send it",
      lead: "Miles apart, the post takes a week and the parcel goes to the wrong office. This arrives the second it's ready, in their time zone, on their phone: a passport that flies from your city to theirs, the places that belong to you both, a countdown to the next visit, and your voice.",
      sections: [
        {
          heading: "What to write",
          body: "Write about a normal day, not a grand feeling: what you ate, what you'd have shown them on the walk, the thing you nearly texted at 3 a.m. and didn't. Distance makes the small things the point. Halfway flies a paper plane from your door to theirs; Passport draws the route from your city to theirs and stamps a page for every photo.",
        },
        {
          heading: "What to add",
          body: "The last photo you took together and the first one from this stretch apart. The song you send each other: the real one waits at the end, thirty seconds of it a tap away. Record a voice message — hearing you is what they're short of — and set a countdown to the day you land.",
        },
        {
          heading: "When to send it",
          body: "Schedule it for the morning where they are, so it's waiting when they wake up; the time zone is a setting. Or send it at the end of your day, so they have it at the start of theirs. Their reaction comes back to your dashboard, and “send one back” gives them a way to answer with one of their own.",
        },
      ],
      faq: [
        {
          q: "Does the schedule use my time or theirs?",
          a: "You choose the time zone when you schedule it. Pick theirs and it unlocks at that hour where they are, whatever the clock says where you are.",
        },
        {
          q: "Can they reply with one?",
          a: "Yes. At the end of every gift there is “send one back”, which starts a new gift with the names already swapped. Halfway even flips the two places.",
        },
        costEn,
      ],
    },
    es: {
      title: "Un regalo que llega en el momento en que lo envías",
      lead: "A kilómetros, el correo tarda una semana y el paquete acaba en la oficina equivocada. Esto llega en el segundo en que está listo, en su zona horaria, en su móvil: un pasaporte que vuela de tu ciudad a la suya, los sitios que son de los dos, una cuenta atrás hasta la próxima visita y tu voz.",
      sections: [
        {
          heading: "Qué escribir",
          body: "Escribe sobre un día normal, no sobre un gran sentimiento: qué comiste, qué le habrías enseñado en el paseo, lo que casi le escribes a las tres de la mañana y no. La distancia convierte lo pequeño en lo importante. Halfway lanza un avión de papel de tu puerta a la suya; Passport dibuja la ruta de tu ciudad a la suya y sella una página por cada foto.",
        },
        {
          heading: "Qué añadir",
          body: "La última foto que os hicisteis juntos y la primera de esta temporada separados. La canción que os mandáis: la de verdad espera al final, con treinta segundos a un toque. Graba un mensaje de voz, oírte es lo que le falta, y pon una cuenta atrás hasta el día en que aterrizas.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Prográmalo para la mañana donde está, para que le espere al despertar; la zona horaria se elige. O mándalo al final de tu día, para que lo tenga al principio del suyo. Su reacción te llega a tu panel, y “devolver uno” le da una forma de contestar con uno suyo.",
        },
      ],
      faq: [
        {
          q: "¿La programación usa mi hora o la suya?",
          a: "Eliges la zona horaria al programarlo. Pon la suya y se desbloquea a esa hora donde está, diga lo que diga el reloj donde estás tú.",
        },
        {
          q: "¿Puede responder con uno?",
          a: "Sí. Al final de cada regalo hay un “devolver uno” que abre un regalo nuevo con los nombres ya cambiados. Halfway incluso intercambia los dos sitios.",
        },
        costEs,
      ],
    },
  },

  "just-because": {
    en: {
      title: "A gift for no reason, which is the best reason",
      lead: "Birthdays are expected. A Tuesday isn't. A small gift on an ordinary day — three photos, a song, a few honest lines — says you were thinking of them when nothing required it, which is the thing people actually want to hear.",
      sections: [
        {
          heading: "What to write",
          body: "One line about why today: something reminded you of them, they've had a rough week, you just wanted to. Then one thing you like about them that you've never said. That's it; keep it under a hundred words. Fortune Cookie hides it inside; Sticker Bomb and The Council are for making them laugh at their desk.",
        },
        {
          heading: "What to add",
          body: "A photo from your camera roll they haven't seen, and one they'd forgotten. A song from the library, or the real one that's playing right now, waiting at the end for a tap. Nothing else needed. The Letter is free if you want it plain; Kawaii and Balloons if you want it light.",
        },
        {
          heading: "When to send it",
          body: "Now. That's the point of this one. Copy the link into the chat you're already in. If you want it to land at a particular moment — the start of their commute, the end of a hard day — a premium template lets you schedule it to the minute.",
        },
      ],
      faq: [
        {
          q: "Isn't it a bit much for no occasion?",
          a: "Not if it's short. Pick a light template, write three lines, and it's the size of a nice text with a bit more care in it. The weight comes from what you write, not from the format.",
        },
        phoneEn,
        costEn,
      ],
    },
    es: {
      title: "Un regalo sin motivo, que es el mejor motivo",
      lead: "Los cumpleaños se esperan. Un martes no. Un regalo pequeño en un día cualquiera, tres fotos, una canción, unas líneas sinceras, dice que pensabas en esa persona cuando nada lo exigía, que es justo lo que la gente quiere oír.",
      sections: [
        {
          heading: "Qué escribir",
          body: "Una línea sobre por qué hoy: algo te ha recordado a esa persona, ha tenido una semana dura, te apetecía. Luego una cosa que te gusta de ella y que nunca has dicho. Nada más; que no pase de cien palabras. Fortune Cookie lo esconde dentro; Sticker Bomb y The Council son para hacerle reír en su mesa de trabajo.",
        },
        {
          heading: "Qué añadir",
          body: "Una foto del carrete que no ha visto y otra que había olvidado. Una canción de la biblioteca, o la de verdad que suena ahora mismo, esperando al final a un toque. No hace falta más. The Letter es gratis si lo quieres sencillo; Kawaii y Balloons si lo quieres ligero.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Ahora. De eso va este. Copia el enlace en el chat en el que ya estás y mándalo sin avisar. Si quieres que llegue en un momento concreto, al empezar su trayecto al trabajo, al final de un día difícil, una plantilla premium te deja programarlo al minuto, en su zona horaria.",
        },
      ],
      faq: [
        {
          q: "¿No es demasiado sin una ocasión?",
          a: "No si es corto. Elige una plantilla ligera, escribe tres líneas, y tiene el tamaño de un buen mensaje con algo más de cuidado. El peso lo pone lo que escribes, no el formato.",
        },
        phoneEs,
        costEs,
      ],
    },
  },
};
