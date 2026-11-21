import type { Occasion } from "@/config/occasions";
import type { GiftLocale } from "@/lib/gift/schema";
import { FINDER_PARTNERS, FINDER_RECIPIENTS, type FinderFeel, type FinderGift, type FinderReasons, type FinderRecipient, type FinderStep } from "@/lib/gift/finder";
import { sendsFree } from "@/lib/gift/free-tier";
import { TEMPLATE_MANIFESTS } from "@/templates/manifests";
import { RECIPIENTS, RECIPIENT_GUIDES, type Recipient } from "./recipients";

/**
 * What the gift finder (/gifts/finder) knows about every template that a manifest cannot say: who
 * it suits, what it feels like, when it is in season, and one sentence on why it fits a given
 * answer. Written by hand from each template's Template.tsx and schema.ts: the limits quoted here
 * (characters, photos, how many lines) are the schema's, and the things said to happen are what
 * the template draws. Change a schema and change its sentence.
 *
 * A template that is drawn for a couple (lipstick kisses, two figures holding hands, "recipe for
 * us") is listed for partners only, so a mother is never offered it. A seasonal one, or one drawn
 * around a single day, names the only occasions it is offered for. tests/unit/gift-finder.test.ts
 * holds the table to all of this, and to having every template in it.
 *
 * Who reads which sentence (pickReason, lib/gift/finder.ts): a person's own when the template has
 * one; "romantic" only a partner, so it may say "the two of you"; "base" and the other feelings
 * anyone the template is offered to, a mother and a father included, so they never assume a couple.
 * A free template's sentences promise only what its free version sends: a free Letter is 500
 * characters and a song, and photos are paid (lib/gift/free-tier.ts).
 *
 * The scoring is src/lib/gift/finder.ts. The template pages read `suitedRecipients` for their
 * "Who it suits" row.
 */
type Words = Record<GiftLocale, string>;

export type FinderFit = Pick<FinderGift, "for" | "feels" | "only" | "conditional"> & { why: FinderReasons<Words> };

const PARTNER = FINDER_PARTNERS;
/**
 * A satin bow on pink gingham, a pastel plush bunny: the two templates drawn for a girlfriend or a
 * wife. Nothing else here is kept from anyone for being a man or a woman: flowers, a music box, a
 * locket and a recipe card are offered for a husband and a father as they are for a wife and a mother.
 */
const HER = ["girlfriend", "wife"] as const satisfies readonly FinderRecipient[];
const EVERYONE = FINDER_RECIPIENTS;

const BIRTHDAY: readonly Occasion[] = ["birthday"];
const HALLOWEEN: readonly Occasion[] = ["halloween"];
/** Autumn leaves and pumpkins without a ghost in sight: the two autumn days. */
const AUTUMN: readonly Occasion[] = ["halloween", "thanksgiving"];
const THANKSGIVING: readonly Occasion[] = ["thanksgiving"];
const CHRISTMAS: readonly Occasion[] = ["christmas"];
/** Drawn around two towns and the distance between them. */
const APART: readonly Occasion[] = ["long-distance"];

export const FINDER_FITS: Record<string, FinderFit> = {
  "the-letter": {
    for: EVERYONE,
    feels: ["sentimental", "romantic"],
    why: {
      base: {
        en: "It opens on a wax seal they break with a tap, then your words write themselves out by hand on a candle-lit desk. It is the plainest gift here, so the words carry all of it.",
        es: "Rompe un sello de lacre con un toque y tus palabras se escriben a mano sobre un escritorio a la luz de una vela. Es el regalo más sencillo de todos: el peso lo llevan las palabras.",
      },
      romantic: {
        en: "Write the paragraph you would never say across a table. It arrives under a wax seal and unfolds in handwriting while your song plays.",
        es: "Escribe el párrafo que nunca dirías en voz alta. Llega bajo un sello de lacre y se despliega escrito a mano mientras suena vuestra canción.",
      },
      sentimental: {
        en: "Name one thing they did that you never thanked them for. Sealed in wax and written out by hand, it reads like a letter someone kept in a drawer.",
        es: "Nombra una cosa que hizo por ti y que nunca le agradeciste. Con su sello de lacre y escrita a mano, se lee como una carta guardada en un cajón.",
      },
      mom: {
        en: "Thank her for one thing in particular, the lift at 2am or the note in the lunchbox. She breaks the seal and reads it in handwriting, as many times as she likes.",
        es: "Dale las gracias por una cosa concreta: ir a buscarte a las dos de la madrugada, la nota en la fiambrera. Rompe el sello y la lee escrita a mano, las veces que quiera.",
      },
      dad: {
        en: "Say the one thing you would want him to know, plainly. It arrives sealed, he opens it with a tap, and the link stays in his messages for the next time.",
        es: "Dile sin rodeos lo que querrías que supiera. Llega sellada, la abre con un toque y el enlace se queda en sus mensajes para la próxima vez.",
      },
    },
  },
  constellations: {
    for: EVERYONE,
    feels: ["romantic", "sentimental", "unusual"],
    why: {
      base: {
        en: "Each photo is a star they fly to, three to twelve of them. When the last one is found the stars join into a shape and your message appears under them.",
        es: "Cada foto es una estrella a la que vuela, de tres a doce. Al encontrar la última, las estrellas se unen en una figura y tu mensaje aparece debajo.",
      },
      romantic: {
        en: "Your photos become a night sky. They tap from star to star, and the last one draws a heart across all of them, with a closing line you write.",
        es: "Un cielo nocturno hecho con vuestras fotos. Va de estrella en estrella y la última dibuja un corazón entre todas, con una frase final escrita por ti.",
      },
      sentimental: {
        en: "Choose the photos that mark the years, twelve at most. They are found one star at a time, and the line you write, up to 120 characters, closes the shape.",
        es: "Elige las fotos que marcan los años, doce como mucho. Se descubren estrella a estrella, y tu frase, de hasta 120 caracteres, cierra la figura.",
      },
      unusual: {
        en: "They explore a night sky by tapping stars, each one a photo of yours, until the stars connect into a heart, an infinity sign or a star.",
        es: "Explora un cielo nocturno tocando estrellas, cada una con una foto tuya, hasta que se conectan en un corazón, un infinito o una estrella.",
      },
      mom: {
        en: "Change the shape from a heart to a star and fill the sky with family photos. She finds them one star at a time, up to twelve.",
        es: "Cambia la figura de corazón a estrella y llena el cielo de fotos de familia. Las va encontrando estrella a estrella, hasta doce.",
      },
      dad: {
        en: "Change the shape from a heart to a star and fill the sky with family photos. He finds them one star at a time, up to twelve.",
        es: "Cambia la figura de corazón a estrella y llena el cielo de fotos de familia. Las va encontrando estrella a estrella, hasta doce.",
      },
      "best-friend": {
        en: "Set the shape to a star, not a heart, and give them twelve photos of the two of you to find across a night sky.",
        es: "Pon la figura en estrella, no en corazón, y dale doce fotos vuestras que encontrar por un cielo nocturno.",
      },
    },
  },
  "birthday-cinema": {
    for: EVERYONE,
    feels: ["unusual", "sentimental"],
    only: BIRTHDAY,
    why: {
      base: {
        en: "They blow into the phone to put out the candles on their cake, confetti fires, and a film strip of your photos rolls, up to twenty.",
        es: "Sopla al móvil para apagar las velas de su tarta, salta el confeti y pasa una tira de película con tus fotos, hasta veinte.",
      },
      sentimental: {
        en: "Red curtains part on their name in lights. Put the photos in order, oldest first, and the film strip after the candles plays like their years so far.",
        es: "El telón rojo se abre sobre su nombre en luces. Ordena las fotos de la más antigua a la más reciente y la película tras las velas repasa sus años.",
      },
    },
  },
  "jar-of-reasons": {
    for: EVERYONE,
    feels: ["sentimental", "romantic", "funny"],
    why: {
      base: {
        en: "One folded note falls out each time they shake the phone. Write from three reasons to a hundred, 160 characters each, with your letter under the last.",
        es: "Agita el móvil y cae una nota doblada cada vez. Escribe de tres a cien motivos, de 160 caracteres cada uno, con tu carta debajo del último.",
      },
      romantic: {
        en: "A hundred reasons is the classic, one per folded note. The ones that land name a moment, like the night they drove four hours, and not a quality.",
        es: "Cien motivos es el clásico, uno por nota doblada. Los que llegan nombran un momento, como la noche que condujo cuatro horas, y no una cualidad.",
      },
      funny: {
        en: "Mix the notes: three sweet reasons, then one rude enough to get a laugh. They shake them out one at a time and never know which is next.",
        es: "Mezcla las notas: tres motivos tiernos y luego uno lo bastante descarado para arrancar una risa. Salen al agitar el móvil y nunca se sabe cuál viene.",
      },
      mom: {
        en: "Ask your brothers and sisters for their reasons too, and rename the jar on its label, 40 characters. She shakes them out one note at a time.",
        es: "Pide también sus motivos a tus hermanos y cambia la etiqueta del tarro, de 40 caracteres. Ella las va sacando nota a nota.",
      },
      dad: {
        en: "Get everyone in the family to write a note, and change the label from the one it comes with. He shakes the jar and they fall out one at a time.",
        es: "Que cada uno de la familia escriba una nota, y cambia la etiqueta que trae el tarro. Lo agita y van cayendo de una en una.",
      },
    },
  },
  "scratch-card": {
    for: EVERYONE,
    feels: ["unusual", "romantic"],
    why: {
      base: {
        en: "Each card hides a photo and a line under foil they rub off with a finger. Keep the news for the last card: its headline takes 60 characters.",
        es: "Rasca la lámina de cada tarjeta con el dedo y aparece una foto con una frase. Guarda la noticia para la última: su titular admite 60 caracteres.",
      },
      romantic: {
        en: "Small things on the first cards and the question on the last. The final headline is yours to write, and \"Will you marry me?\" fits with room to spare.",
        es: "Cosas pequeñas en las primeras tarjetas y la pregunta en la última. El titular final lo escribes tú, y «¿Te casas conmigo?» cabe de sobra.",
      },
    },
  },
  "midnight-countdown": {
    for: EVERYONE,
    feels: ["unusual", "sentimental"],
    why: {
      base: {
        en: "Send it early and it counts down while the sky goes from dusk to night. At zero, fireworks fill the screen and your photos and words unlock.",
        es: "Envíalo antes y hace la cuenta atrás mientras el cielo pasa del atardecer a la noche. Al llegar a cero estallan los fuegos artificiales y se abren tus fotos y tus palabras.",
      },
      sentimental: {
        en: "Set it for midnight on the day itself. They watch the sky darken, and the line you wrote for zero, up to 60 characters, comes up with the fireworks.",
        es: "Prográmalo para la medianoche del día. Ve oscurecerse el cielo, y la frase que escribiste para el cero, de hasta 60 caracteres, sale con los fuegos.",
      },
    },
  },
  "our-timeline": {
    for: EVERYONE,
    feels: ["sentimental", "romantic"],
    why: {
      base: {
        en: "A road draws itself as they scroll and pins a photo at every milestone, up to twenty, each with the date you give it.",
        es: "Un camino se dibuja mientras baja por la página y clava una foto en cada momento importante, hasta veinte, cada una con la fecha que le pongas.",
      },
      romantic: {
        en: "Start at the day you met and stop at today. The road draws itself between your photos, and the closing line is yours to rewrite in 80 characters.",
        es: "Empieza el día que os conocisteis y termina en hoy. El camino se dibuja entre vuestras fotos, y la frase final la reescribes tú en 80 caracteres.",
      },
      mom: {
        en: "Her story as a road that draws itself while she scrolls. Scan the old prints, give each its date, and write the closing line yourself.",
        es: "Su historia como un camino que se dibuja mientras baja. Escanea las fotos antiguas, ponle a cada una su fecha y escribe tú la frase final.",
      },
      dad: {
        en: "His life as a road that draws itself: where he grew up, the first car, the day you were born, each photo pinned with its date.",
        es: "Su vida como un camino que se dibuja solo: dónde creció, el primer coche, el día que naciste, cada foto clavada con su fecha.",
      },
    },
  },
  vinyl: {
    for: EVERYONE,
    feels: ["romantic", "sentimental"],
    why: {
      base: {
        en: "The record spins and the song starts when they drop the needle. Your photos are album covers to flip through, and your message is the liner notes.",
        es: "Baja la aguja y el disco gira mientras suena la canción. Tus fotos son portadas de álbum que va pasando, y tu mensaje son las notas del disco.",
      },
      romantic: {
        en: "Put your song on a record they start by dropping the needle. Name the album after the two of you; the title takes 40 characters.",
        es: "Pon vuestra canción en un disco que arranca al bajar la aguja. Titula el álbum con algo vuestro: el título admite 40 caracteres.",
      },
      sentimental: {
        en: "Use the side label, 12 characters, for the year, and the album title for the place. They flip through your photos as covers while it plays.",
        es: "Usa la etiqueta de la cara, de 12 caracteres, para el año, y el título del álbum para el lugar. Va pasando tus fotos como portadas mientras suena.",
      },
      dad: {
        en: "Put on the song from the car journeys. He drops the needle, the record spins, and your photos wait in the crate as album covers.",
        es: "Pon la canción de los viajes en coche. Baja la aguja, el disco gira y tus fotos esperan en la caja como portadas de álbum.",
      },
    },
  },
  museum: {
    for: EVERYONE,
    feels: ["sentimental", "unusual"],
    why: {
      base: {
        en: "Your photos hang framed in a quiet gallery, each with a plaque. They swipe from room to room, and the last room is a wall text with your message.",
        es: "Tus fotos cuelgan enmarcadas en una galería tranquila, cada una con su cartela. Pasa de sala en sala, y la última es un texto de pared con tu mensaje.",
      },
      unusual: {
        en: "An exhibition about them, with an entrance placard you title in 60 characters, frames in oak, black or gilt, and the years on the plaques.",
        es: "Una exposición con su vida, con un cartel de entrada que titulas tú en 60 caracteres, marcos de roble, negros o dorados, y los años en las cartelas.",
      },
      mom: {
        en: "Scan the prints from the shoebox. Each one hangs in a frame with a plaque under it, and the last room says what you wanted to tell her.",
        es: "Escanea las fotos de la caja de zapatos. Cada una cuelga enmarcada con su cartela debajo, y la última sala dice lo que querías decirle.",
      },
      dad: {
        en: "The old prints from the loft, hung in a quiet gallery with the years on the plaques. The last wall carries your message to him.",
        es: "Las fotos antiguas del altillo, colgadas en una galería tranquila con los años en las cartelas. La última pared lleva tu mensaje para él.",
      },
    },
  },
  "front-page": {
    for: EVERYONE,
    feels: ["funny", "unusual"],
    why: {
      base: {
        en: "A newspaper front page with their name on the masthead: your headline in 80 characters, a weather box, a horoscope, and up to eight classified ads for the in-jokes.",
        es: "Una portada de periódico con su nombre en la cabecera: tu titular en 80 caracteres, el tiempo, un horóscopo y hasta ocho anuncios clasificados para vuestras bromas.",
      },
      unusual: {
        en: "Their name goes on the masthead, the lead photo gets a caption, and your message is set in columns. The price on the masthead is yours too: \"Priceless\" fits.",
        es: "Su nombre va en la cabecera, la foto principal lleva pie y tu mensaje sale en columnas. El precio de la cabecera también lo pones tú: «No tiene precio» cabe.",
      },
      dad: {
        en: "A front page with his name on the masthead and your headline about him. The classified ads, up to eight, are for the things he says every week.",
        es: "Una portada con su nombre en la cabecera y tu titular sobre él. Los anuncios clasificados, hasta ocho, son para las frases que repite cada semana.",
      },
    },
  },
  "fortune-cookie": {
    for: EVERYONE,
    feels: ["funny", "unusual"],
    why: {
      base: {
        en: "Fortunes you wrote, three to twenty of them, one inside each cookie they crack. Specific beats wise: \"you will be asked to pick the film, and refuse\".",
        es: "Abre las galletas una a una y salen las fortunas que escribiste, de tres a veinte. Mejor concretas que sabias: «te pedirán que elijas la peli y te negarás».",
      },
      unusual: {
        en: "A plate of cookies that crack in two on a tap. Each slip carries a fortune of yours and their lucky numbers, so use a date only they would recognise.",
        es: "Un plato de galletas que se parten en dos con un toque. Cada papelito lleva una fortuna tuya y sus números de la suerte: pon una fecha que solo reconozca quien lo abre.",
      },
      dad: {
        en: "Put his own jokes back in as fortunes, up to twenty of them. He cracks the cookies one at a time, and the last one holds your message.",
        es: "Devuélvele sus propios chistes en forma de fortunas, hasta veinte. Abre las galletas una a una, y la última guarda tu mensaje.",
      },
    },
  },
  "text-thread": {
    for: EVERYONE,
    feels: ["funny", "sentimental"],
    why: {
      base: {
        en: "Up to forty messages arrive one bubble at a time, typing dots included. Write it like your real chat and drop a photo in where you would send one.",
        es: "Hasta cuarenta mensajes llegan burbuja a burbuja, con los puntitos de «escribiendo». Escríbelo como vuestro chat de verdad y mete una foto donde la mandarías.",
      },
      sentimental: {
        en: "Keep the first messages short and ordinary, the way your chat is. The last bubble is for the one thing you would never send by text.",
        es: "Deja los primeros mensajes cortos y corrientes, como es vuestro chat. La última burbuja es para eso que nunca mandarías por mensaje.",
      },
    },
  },
  arcade: {
    for: EVERYONE,
    feels: ["funny", "unusual"],
    why: {
      base: {
        en: "They drag a basket to catch falling hearts, stars or cakes in a small retro game. Each level clears one of your photos, and the last shows your message.",
        es: "Un juego retro pequeñito: arrastra una cesta para atrapar corazones, estrellas o tartas que caen. Cada nivel destapa una foto tuya, y el último, tu mensaje.",
      },
      funny: {
        en: "Name the game after them and raise the catches per level for someone competitive; it goes up to 20. Every level they clear uncovers another photo.",
        es: "Ponle su nombre al juego y sube las capturas por nivel si le gusta competir; llega hasta 20. Cada nivel superado destapa otra foto.",
      },
    },
  },
  passport: {
    for: EVERYONE,
    feels: ["unusual", "romantic"],
    only: APART,
    why: {
      base: {
        en: "A passport with their name on the cover. A globe turns, the route draws itself from your city to theirs, and each photo becomes a stamp before your message.",
        es: "Un pasaporte con su nombre en la tapa. Gira un globo, la ruta se dibuja de tu ciudad a la suya y cada foto se convierte en un sello antes de tu mensaje.",
      },
      romantic: {
        en: "Add the cities you have met in as stopovers, up to six, and use the nationality line for something like \"Citizen of wherever you are\".",
        es: "Añade como escalas las ciudades donde os habéis visto, hasta seis, y usa la línea de nacionalidad para algo como «De donde estés tú».",
      },
    },
  },
  bloom: {
    for: EVERYONE,
    feels: ["romantic", "unusual"],
    why: {
      base: {
        en: "Petal by petal, a single flower in 3D opens only while they keep a finger on the screen. Your photos float up once it is fully open.",
        es: "Una sola flor en 3D que se abre únicamente mientras mantiene el dedo en la pantalla, pétalo a pétalo. Tus fotos suben flotando cuando está abierta del todo.",
      },
      romantic: {
        en: "One peony, tulip or daisy in the colour you choose. It opens for as long as they hold the screen, and your message waits inside it.",
        es: "Una peonía, un tulipán o una margarita del color que elijas. Se abre mientras mantiene el dedo en la pantalla, y tu mensaje espera dentro.",
      },
      mom: {
        en: "Her favourite of three flowers, in her colour. It opens while she holds the screen, and the photos you chose float up around it.",
        es: "Su flor preferida entre tres, en su color. Se abre mientras ella mantiene el dedo en la pantalla, y las fotos que elegiste suben a su alrededor.",
      },
    },
  },
  bouquet: {
    for: EVERYONE,
    feels: ["romantic", "sentimental"],
    why: {
      base: {
        en: "You pick every stem, up to 24, plus the paper and the ribbon. They watch it come together one flower at a time, then open the card tucked inside.",
        es: "Eliges cada flor, hasta 24, además del papel y el lazo. Lo ve formarse flor a flor y después abre la tarjeta escondida dentro.",
      },
      sentimental: {
        en: "Build it from flowers that mean something: the ones that grew by the front door, or the ones they buy for themselves. The card inside takes 30 characters and opens to your message.",
        es: "Hazlo con flores que signifiquen algo: las que crecían junto a la puerta de casa, o las que se compra siempre. La tarjeta de dentro admite 30 caracteres y se abre a tu mensaje.",
      },
      mom: {
        en: "Her favourite flowers, stem by stem, in her colours, for the day you cannot bring real ones. The card inside opens to your message.",
        es: "Sus flores preferidas, una a una, en sus colores, para el día que no puedes llevarle unas de verdad. La tarjeta de dentro se abre a tu mensaje.",
      },
    },
  },
  kawaii: {
    for: [...HER, "best-friend", "someone"],
    feels: ["funny", "romantic"],
    why: {
      base: {
        en: "A plush bunny, bear or kitten waves hello and says a line you write, up to 60 characters. Then a gift box pops open on your photos and message.",
        es: "Un peluche (conejito, osito o gatito) saluda y dice una frase escrita por ti, de hasta 60 caracteres. Después se abre una caja de regalo con tus fotos y tu mensaje.",
      },
      romantic: {
        en: "Pastel from start to finish. The plushie greets them in your words, the box bursts open in confetti, and your message sits in a speech bubble.",
        es: "Tonos pastel de principio a fin. El peluche saluda con tus palabras, la caja se abre entre confeti y tu mensaje aparece en un bocadillo.",
      },
    },
  },
  fireside: {
    for: EVERYONE,
    feels: ["sentimental", "romantic"],
    why: {
      base: {
        en: "Lighting the candle turns a cabin gold, then your letter unfolds from the blanket. Choose snow outside the window in winter, falling leaves the rest of the year.",
        es: "Enciende una vela y una cabaña se vuelve dorada; después tu carta se despliega desde la manta. Elige nieve tras la ventana en invierno y hojas el resto del año.",
      },
      romantic: {
        en: "A candle, a mug of cocoa, tea or coffee, and your letter by the window. Your photos hang from a string on wooden pegs while the song plays low.",
        es: "Una vela, una taza de cacao, té o café y tu carta junto a la ventana. Tus fotos cuelgan de una cuerda con pinzas de madera mientras la canción suena bajito.",
      },
    },
  },
  "trick-or-treat": {
    for: EVERYONE,
    feels: ["funny", "unusual"],
    only: HALLOWEEN,
    why: {
      base: {
        en: "They ring the bell and choose. Treat rains sweets; trick earns a boo first and the treat anyway. Then a little ghost, cat or pumpkin hands over your photos.",
        es: "Llama al timbre y elige. Con «trato» llueven dulces; con «truco» hay primero un susto y el trato igualmente. Luego un fantasmita, un gato o una calabaza entrega tus fotos.",
      },
      unusual: {
        en: "A moonlit porch with a bell to ring. Whichever they pick, the door opens on your photos in haunted frames and your words on a scroll.",
        es: "Un porche a la luz de la luna con un timbre que tocar. Elija lo que elija, la puerta se abre a tus fotos en marcos encantados y tus palabras en un pergamino.",
      },
    },
  },
  scrapbook: {
    for: [...PARTNER, "mom", "best-friend", "someone"],
    feels: ["sentimental", "romantic"],
    why: {
      base: {
        en: "Up to twelve photos land as polaroids that develop on the page, between a torn note in your handwriting, 90 characters, and a typewritten letter.",
        es: "Hasta doce fotos caen en la página como polaroids que se revelan, entre una nota rasgada con tu letra, de 90 caracteres, y una carta a máquina.",
      },
      romantic: {
        en: "They open it like a real scrapbook: cut-out letters for the title, your photos taped between flowers, their song playing, and a bouquet on the last page.",
        es: "Se abre como un álbum de recortes de verdad: letras recortadas en el título, vuestras fotos pegadas entre flores, su canción sonando y un ramo en la última página.",
      },
      "best-friend": {
        en: "The photos nobody else gets to see develop as polaroids on the page, and the torn note takes one line of in-joke, 90 characters.",
        es: "Las fotos que nadie más puede ver se revelan como polaroids en la página, y la nota rasgada admite una línea de broma privada, 90 caracteres.",
      },
    },
  },
  halfway: {
    for: EVERYONE,
    feels: ["unusual", "romantic"],
    only: APART,
    why: {
      base: {
        en: "Your town on one island, theirs on the other, and the real distance in big numbers. They blow into the phone and a paper plane flies all the way to your letter.",
        es: "Tu ciudad en una isla, la suya en la otra y la distancia real en números grandes. Sopla al móvil y un avión de papel vuela todo el trayecto hasta tu carta.",
      },
      romantic: {
        en: "They blow a paper plane, a balloon or a small bird from your door to theirs while the kilometres count down. The path turns into a heart when it lands.",
        es: "Sopla y un avión de papel, un globo o un pajarito va de tu puerta a la suya mientras bajan los kilómetros. Al llegar, el camino se convierte en un corazón.",
      },
    },
  },
  garden: {
    for: EVERYONE,
    feels: ["romantic", "sentimental"],
    why: {
      base: {
        en: "Past a gate with their name on it, the page grows as they scroll, down to a greenhouse where your letter waits on the potting table.",
        es: "Empuja una verja con su nombre y la página va creciendo al bajar, hasta un invernadero donde tu carta espera en la mesa de las macetas.",
      },
      sentimental: {
        en: "Your photos hang on a trellis under climbing vines. At the end, everything they walked past is tied into a bouquet with a tag you write, 60 characters.",
        es: "Tus fotos cuelgan de una celosía bajo las enredaderas. Al final, todo lo que ha ido viendo se reúne en un ramo con una etiqueta que escribes tú, de 60 caracteres.",
      },
      mom: {
        en: "Wildflowers, roses, peonies or sunflowers open between photos of her as she scrolls. The tag on the last bouquet is the final thing she reads.",
        es: "Flores silvestres, rosas, peonías o girasoles se abren entre fotos suyas mientras baja. La etiqueta del último ramo es lo último que lee.",
      },
    },
  },
  "snow-globe": {
    for: PARTNER,
    feels: ["unusual", "romantic"],
    why: {
      base: {
        en: "They shake the phone and it snows inside the globe. Each time the snow settles, one of your lines or photos has appeared in there.",
        es: "Agita el móvil y nieva dentro de la bola. Cada vez que la nieve se posa, ha aparecido dentro una de tus frases o una de tus fotos.",
      },
      romantic: {
        en: "Two small figures hold hands inside the globe. Write up to four lines for the snow to uncover, and 44 characters for the brass plaque.",
        es: "Dos figuritas se dan la mano dentro de la bola. Escribe hasta cuatro frases para que la nieve las descubra, y 44 caracteres para la placa de latón.",
      },
    },
  },
  "recipe-box": {
    for: EVERYONE,
    feels: ["sentimental", "funny", "unusual"],
    why: {
      base: {
        en: "A recipe for a person: they tilt the phone to pour in each ingredient you wrote, up to six, shake it to stir, and the card turns over into your letter.",
        es: "La receta de una persona: inclina el móvil para echar cada ingrediente que escribiste, hasta seis, lo agita para remover y la ficha se da la vuelta y es tu carta.",
      },
      funny: {
        en: "The ingredients are the joke: \"one tablespoon of being right\", \"a pinch of road rage\". They pour each one in by tilting the phone.",
        es: "La gracia está en los ingredientes: «una cucharada de tener siempre razón», «una pizca de mal despertar». Los va echando al inclinar el móvil.",
      },
      mom: {
        en: "Write her as a recipe: two cups of patience, a whole Sunday of her time. She tilts the phone to pour each one in, then shakes it to stir.",
        es: "Escríbela a ella como una receta: dos tazas de paciencia, un domingo entero de su tiempo. Inclina el móvil para echar cada cosa y lo agita para remover.",
      },
    },
  },
  "cap-toss": {
    for: EVERYONE,
    feels: ["funny", "unusual", "sentimental"],
    only: ["graduation"],
    why: {
      base: {
        en: "They cheer into the phone and the cap launches, higher the louder they shout. Then a diploma drops in and unrolls into your letter.",
        es: "Grita al móvil y el birrete sale volando, más alto cuanto más fuerte grite. Después cae un diploma que se desenrolla y es tu carta.",
      },
      sentimental: {
        en: "Write the diploma's line: what it is really awarded for, in 90 characters, not the official wording. Their photos are taped to it like a yearbook.",
        es: "Escribe la línea del diploma: por qué se concede de verdad, en 90 caracteres, y no la fórmula oficial. Sus fotos van pegadas como en un anuario.",
      },
    },
  },
  "paper-crane": {
    for: EVERYONE,
    feels: ["sentimental", "unusual"],
    why: {
      base: {
        en: "Every fold says one more line, and it folds only while they hold the crease: three to six lines, 72 characters each. It takes patience, so nothing gets skimmed.",
        es: "Mantiene pulsado cada pliegue, y cada doblez dice una línea más: de tres a seis, de 72 caracteres cada una. Pide paciencia, así que nada se lee por encima.",
      },
      unusual: {
        en: "A sheet of paper that folds only while they hold each crease. After the last fold it is a crane; they blow on the phone and it flies off, leaving your letter.",
        es: "Una hoja de papel que solo se dobla mientras mantiene pulsado cada pliegue. Tras el último es una grulla; sopla al móvil y echa a volar, dejando tu carta.",
      },
    },
  },
  "the-toast": {
    for: EVERYONE,
    feels: ["unusual", "sentimental", "romantic"],
    why: {
      base: {
        en: "Tilting the phone pours both glasses, and one knock clinks them. The menu card standing between the glasses opens into your speech.",
        es: "Inclina el móvil para llenar las dos copas y le da un golpecito para brindar. La carta del menú que hay entre las copas se abre y es tu discurso.",
      },
      sentimental: {
        en: "Print the place and the date on the menu card, then write the speech you would give standing up. Your photos rise through the bubbles after the clink.",
        es: "Pon el lugar y la fecha en la carta del menú y escribe el discurso que darías de pie. Tus fotos suben entre las burbujas después del brindis.",
      },
      romantic: {
        en: "Champagne, red, white or sparkling, poured by tilting the phone. The first line of the toast is yours, 70 characters, the one everyone goes quiet for.",
        es: "Champán, tinto, blanco o espumoso, servido al inclinar el móvil. La primera frase del brindis es tuya, de 70 caracteres: esa por la que todo el mundo calla.",
      },
    },
  },
  balloons: {
    for: EVERYONE,
    feels: ["funny", "sentimental"],
    only: BIRTHDAY,
    why: {
      base: {
        en: "Balloons cover the ceiling, and each one they pop drops a polaroid of yours onto the floor. The last and biggest balloon is holding your letter.",
        es: "Explota un techo lleno de globos, uno a uno, y cada globo deja caer al suelo una polaroid tuya. El último, el más grande, guarda tu carta.",
      },
      sentimental: {
        en: "Their age floats over the room in gold foil numbers. With up to eight photos, one per balloon, choose one from each stretch of their life.",
        es: "Su edad flota por la habitación en números dorados. Con ocho fotos como mucho, una por globo, elige una de cada etapa de su vida.",
      },
    },
  },
  "popup-card": {
    for: EVERYONE,
    feels: ["sentimental", "unusual"],
    only: ["birthday", "mothers-day"],
    why: {
      base: {
        en: "A paper card that opens like a real one. A three-tier cake stands up out of the fold; they light the candles with a tap and blow on the phone to put them out.",
        es: "Una tarjeta de papel que se abre como una de verdad. Una tarta de tres pisos se levanta del pliegue; enciende las velas con un toque y sopla al móvil para apagarlas.",
      },
      sentimental: {
        en: "Your letter is inside the lid in handwriting, with your photos on pegs behind it. Give their age and it goes on the cake's topper.",
        es: "Tu carta está dentro de la tapa, escrita a mano, con tus fotos sujetas con pinzas detrás. Si pones su edad, aparece en el adorno de la tarta.",
      },
      mom: {
        en: "The nearest thing to the card you would have posted. It opens, a paper cake stands up out of the fold, and your letter is inside in handwriting.",
        es: "Lo más parecido a la tarjeta que le habrías mandado por correo. Se abre, una tarta de papel se levanta del pliegue y tu carta está dentro, escrita a mano.",
      },
    },
  },
  sketchbook: {
    for: EVERYONE,
    feels: ["sentimental", "funny"],
    only: BIRTHDAY,
    why: {
      base: {
        en: "Every page draws itself in ink as they turn to it: a cake, their age circled twice, a party hat. Your photos are taped in between with notes in handwriting.",
        es: "Cada página se dibuja sola a tinta al pasarla: una tarta, su edad rodeada dos veces, un gorro de fiesta. Tus fotos van pegadas entre los dibujos, con notas a mano.",
      },
      sentimental: {
        en: "It looks drawn for them by hand. Doodles ink themselves in around up to twelve taped-in photos, and the last page is your letter.",
        es: "Parece dibujado a mano para quien lo recibe. Los garabatos se van trazando alrededor de hasta doce fotos pegadas, y la última página es tu carta.",
      },
    },
  },
  "party-animals": {
    for: EVERYONE,
    feels: ["funny"],
    only: BIRTHDAY,
    why: {
      base: {
        en: "Ten animals in party hats crash their birthday collage, and each yells a line you wrote when tapped. Forty characters apiece, so in-jokes only.",
        es: "Diez animales con gorro de fiesta se cuelan en su collage de cumpleaños, y cada uno grita al tocarlo una frase tuya. Cuarenta caracteres por frase: solo bromas privadas.",
      },
      "best-friend": {
        en: "Write the ten things only the two of you say. Each of the ten animals in party hats yells one when tapped, between up to seven of your photos.",
        es: "Escribe las diez cosas que solo decís vosotros. Cada uno de los diez animales con gorro de fiesta grita una al tocarlo, entre siete fotos vuestras como mucho.",
      },
    },
  },
  "the-council": {
    for: EVERYONE,
    feels: ["funny"],
    why: {
      base: {
        en: "A council of cats hears the case against them. You write the charge and up to six findings, such as \"said five minutes away, from bed\", and choose the verdict.",
        es: "Un consejo de gatos juzga su caso. Tú escribes la acusación y hasta seis conclusiones, como «dijo que estaba a cinco minutos, desde la cama», y eliges el veredicto.",
      },
      "best-friend": {
        en: "Charge them with something true and let the cats read out your evidence, one finding each. The stamp at the end is your call: guilty, approved, certified or pardoned.",
        es: "Elige una acusación que sea verdad y deja que los gatos lean tus pruebas, una conclusión cada uno. El sello final lo decides tú entre cuatro veredictos.",
      },
    },
  },
  "sticker-bomb": {
    for: [...PARTNER, "best-friend", "someone"],
    feels: ["funny"],
    why: {
      base: {
        en: "Every tap slaps a meme sticker down where their finger lands, your photos among them as polaroids. Twelve taps in, the page is a mess and your card opens.",
        es: "Cada toque planta un sticker de meme donde cae el dedo, con tus fotos entre ellos como polaroids. A los doce toques la página es un caos y se abre tu tarjeta.",
      },
      "best-friend": {
        en: "Write the label-maker strips, six of them at 28 characters, with the things you call each other. Twelve taps of stickers later, your card opens.",
        es: "Escribe las tiras de la rotuladora, seis de 28 caracteres, con lo que os llamáis entre vosotros. Doce toques de stickers después, se abre tu tarjeta.",
      },
    },
  },
  coquette: {
    for: HER,
    feels: ["romantic"],
    why: {
      base: {
        en: "They untie a satin bow and a pink gingham collage unrolls: your photos as polaroids between lilies, your song on a little player, a postcard in your handwriting.",
        es: "Desata un lazo de raso y se desenrolla un collage de vichy rosa: vuestras fotos en polaroids entre lirios, vuestra canción en un pequeño reproductor y una postal con tu letra.",
      },
    },
  },
  xoxo: {
    for: PARTNER,
    feels: ["romantic"],
    why: {
      base: {
        en: "An envelope sealed with a lipstick kiss opens on a collage in red, and wherever they tap, another kiss lands. Write what you call them in 16 characters.",
        es: "Un sobre sellado con un beso de pintalabios se abre a un collage en rojo, y allí donde toca cae otro beso. Escribe tu forma de llamarle en 16 caracteres.",
      },
    },
  },
  keepsake: {
    for: [...PARTNER, "mom", "dad", "someone"],
    feels: ["sentimental", "romantic"],
    why: {
      base: {
        en: "Inside a wax-sealed parcel of kept things: your first photo under dried flowers, and a gold locket that opens on a tap to your second.",
        es: "Rompe el sello de lacre de un paquete de cosas guardadas: tu primera foto bajo flores secas y un relicario dorado que se abre con un toque a la segunda.",
      },
      romantic: {
        en: "Engrave the inside of the locket in 18 characters, a date, a place or \"always\", and rewrite the ticket, 26 characters, for somewhere only the two of you have been.",
        es: "Graba el interior del relicario en 18 caracteres, una fecha, un lugar o «siempre», y reescribe el billete, de 26 caracteres, con un sitio donde solo habéis estado vosotros.",
      },
      mom: {
        en: "A box of kept things for the person who keeps everything: pressed flowers, a typed letter, and a locket that opens to the photo you put second.",
        es: "Una caja de cosas guardadas para quien lo guarda todo: flores prensadas, una carta a máquina y un relicario que se abre a la foto que pongas en segundo lugar.",
      },
    },
  },
  "pack-your-bags": {
    for: EVERYONE,
    feels: ["unusual", "romantic"],
    only: ["anniversary", "birthday", "valentines", "christmas", "long-distance"],
    // Nobody is asked whether the present is a trip: never the first pick, and every sentence opens with that.
    conditional: true,
    why: {
      base: {
        en: "For when the gift is a trip. They pack a suitcase with your clues, up to five, then a departures board clatters out where you are going.",
        es: "Para cuando el regalo es un viaje. Hace la maleta con tus pistas, hasta cinco, y después un panel de salidas va cantando letra a letra el destino.",
      },
      romantic: {
        en: "For when the gift is a trip for the two of you. A departures board spells the city, then a boarding pass or train ticket slides up with both your names on it.",
        es: "Para cuando el regalo es un viaje para los dos. Un panel de salidas deletrea la ciudad y sube una tarjeta de embarque o un billete de tren con vuestros dos nombres.",
      },
    },
  },
  digicam: {
    for: [...PARTNER, "best-friend"],
    feels: ["funny", "sentimental", "unusual"],
    why: {
      base: {
        en: "A pocket camera from 2006. They press power, flick through up to twelve photos with the orange date stamp in the corner, and the shutter prints the roll as a strip.",
        es: "Una cámara de bolsillo de 2006. La enciende, pasa hasta doce fotos con la fecha naranja en la esquina, y el disparador imprime el carrete entero en una tira.",
      },
      sentimental: {
        en: "Set the date stamp to the day it happened and caption each shot; captions show in the screen's pixel type. Your letter prints out after the strip.",
        es: "Pon en la fecha de las fotos el día en que pasó y escribe un pie para cada una; salen con la letra pixelada de la pantalla. Tu carta se imprime después de la tira.",
      },
      "best-friend": {
        en: "Your worst photos on a 2006 camera roll, date-stamped, with captions in pixel type: for the friend who was there in the flip-phone years.",
        es: "Vuestras peores fotos en el carrete de una cámara de 2006, con fecha y pies de foto pixelados: para quien ya estaba ahí en los años del móvil con tapa.",
      },
    },
  },
  "photo-booth": {
    for: [...PARTNER, "best-friend"],
    feels: ["romantic", "funny", "unusual"],
    why: {
      base: {
        en: "Behind the curtain is a red button. Four flashes after they press it, a strip of your photos slides out grey and comes up in colour as they watch.",
        es: "Aparta la cortina y pulsa el botón rojo. Cuatro flashes después sale una tira con vuestras fotos, primero gris, que va cogiendo color mientras la mira.",
      },
      romantic: {
        en: "The strip lands on a wall of love letters, with a line of yours in pen beside it, 40 characters, and your letter in handwriting on lined paper.",
        es: "La tira acaba en una pared de cartas de amor, con una frase tuya a boli al lado, de 40 caracteres, y tu carta escrita a mano en papel rayado.",
      },
      funny: {
        en: "Give it your four worst faces. The booth counts down, flashes four times and prints them as a strip in colour, black and white or sepia.",
        es: "Dale vuestras cuatro peores caras. El fotomatón cuenta atrás, dispara cuatro flashes y las imprime en una tira en color, blanco y negro o sepia.",
      },
      "best-friend": {
        en: "Four flashes and a strip of your best worst faces prints in colour, black and white or sepia. The sign lit up over the booth takes 24 characters of yours.",
        es: "Cuatro flashes y sale impresa una tira con vuestras mejores peores caras, en color, blanco y negro o sepia. El letrero luminoso del fotomatón admite 24 caracteres tuyos.",
      },
    },
  },
  picnic: {
    for: [...PARTNER, "mom", "best-friend", "someone"],
    feels: ["romantic", "sentimental"],
    why: {
      base: {
        en: "Every tap takes one thing out of the basket (strawberries, cherries, pink lemonade, tulips), and each carries a tag with a line you wrote, three to eight in all.",
        es: "Cada toque saca una cosa de la cesta (fresas, cerezas, limonada rosa, tulipanes), y cada una lleva una etiqueta con una frase tuya, de tres a ocho en total.",
      },
      sentimental: {
        en: "Write one reason per tag, 48 characters each. The strawberries carry the first, and the last thing out of the basket is a folded note with your letter.",
        es: "Escribe un motivo por etiqueta, de 48 caracteres cada uno. Las fresas llevan el primero, y lo último que sale de la cesta es una nota doblada con tu carta.",
      },
    },
  },
  "music-box": {
    for: EVERYONE,
    feels: ["sentimental", "romantic", "unusual"],
    why: {
      base: {
        en: "Three turns of the key and the lid opens on a ballerina turning to the tune. Your photos come up one at a time in the mirror inside the lid.",
        es: "Da tres vueltas a la llave y la tapa se abre con una bailarina que gira al compás. Tus fotos van apareciendo una a una en el espejo de la tapa.",
      },
      romantic: {
        en: "Choose the two swans who meet as a heart, and Swan Lake, Brahms' Lullaby or Für Elise. As the spring runs down, a folded letter lifts out of the velvet.",
        es: "Elige los dos cisnes que al juntarse forman un corazón, y El lago de los cisnes, la Canción de cuna de Brahms o Para Elisa. Cuando se acaba la cuerda, una carta doblada sale del terciopelo.",
      },
      unusual: {
        en: "It plays note by note and slows as the spring runs down, the way a real one does. Each turn brings another of your photos into the mirror, up to eight.",
        es: "Suena nota a nota y se va frenando al acabarse la cuerda, como una de verdad. Cada vuelta trae otra de tus fotos al espejo, hasta ocho.",
      },
      mom: {
        en: "Choose Brahms' Lullaby from the three tunes. She winds the key, a ballerina turns, and your photos appear in the mirror before your letter lifts out of the velvet.",
        es: "Elige la Canción de cuna de Brahms entre las tres melodías. Ella da cuerda, una bailarina gira y tus fotos aparecen en el espejo antes de que tu carta salga del terciopelo.",
      },
    },
  },
  "spooky-season": {
    for: [...PARTNER, "best-friend"],
    feels: ["romantic", "funny"],
    only: HALLOWEEN,
    why: {
      base: {
        en: "One tap blows a heap of autumn leaves off the screen. Underneath is a Halloween scrapbook: a black cat on a pumpkin, a ticket for two, your photos on film.",
        es: "Un toque y una ráfaga se lleva un montón de hojas de otoño. Debajo hay un álbum de Halloween: un gato negro sobre una calabaza, una entrada para dos y vuestras fotos en película.",
      },
      funny: {
        en: "Rewrite the ticket, 26 characters, for wherever you two are really going on the 31st. Left alone, it admits two to the haunted house.",
        es: "Reescribe la entrada, de 26 caracteres, con el plan que tengáis de verdad para el día 31. Si no la tocas, es un pase a la casa del terror.",
      },
    },
  },
  "dark-romance": {
    for: PARTNER,
    // Gothic first: what sets it apart from the other love collages is the mood, not the romance.
    feels: ["unusual", "romantic"],
    why: {
      base: {
        en: "They turn the key on a black leather diary with their name in gold. Inside: dark roses, your song, and polaroids down to your letter under a wax seal.",
        es: "Gira la llave de un diario de cuero negro con su nombre en dorado. Dentro: rosas oscuras, vuestra canción y polaroids hasta llegar a tu carta bajo un sello de lacre.",
      },
      unusual: {
        en: "Your second photo is printed on a tarot card, The Lovers unless you rename it in 18 characters, beside playing cards and the bet you would make on the two of you.",
        es: "Tu segunda foto sale impresa en una carta del tarot, Los Enamorados si no le cambias el nombre (18 caracteres), junto a unos naipes y la apuesta que harías por vosotros.",
      },
    },
  },
  "favorite-person": {
    for: EVERYONE,
    feels: ["sentimental", "romantic"],
    why: {
      base: {
        en: "Under a sheet of tissue paper with their name on it: your photos on polaroids in soft watercolour, pearls and pressed flowers, down to your letter.",
        es: "Levanta un papel de seda con su nombre escrito. Debajo: tus fotos en polaroids sobre acuarela suave, perlas y flores prensadas, hasta llegar a tu carta.",
      },
      romantic: {
        en: "The torn note in the middle says \"favorite person\" unless you change it, 22 characters. Every tap on the page doodles a heart.",
        es: "La nota rasgada del centro dice «mi persona favorita» si no la cambias, 22 caracteres. Cada toque en la página dibuja un corazón.",
      },
      "best-friend": {
        en: "For saying the soft thing for once. Rewrite the torn note, 22 characters, to what you really call them, and sign off under the bouquet.",
        es: "Para decir lo tierno por una vez. Reescribe la nota rasgada, de 22 caracteres, con tu forma real de llamarle, y firma debajo del ramo.",
      },
    },
  },
  "on-repeat": {
    for: [...PARTNER, "best-friend"],
    feels: ["romantic", "sentimental"],
    why: {
      base: {
        en: "Your photo is the album cover and their name is the artist. They press play, and every photo you add becomes a song on the playlist.",
        es: "Tu foto es la portada del álbum y su nombre, el artista. Le da al play, y cada foto que añades se convierte en una canción de la playlist.",
      },
      sentimental: {
        en: "Your captions are the song titles, so caption each photo with where it was or what was playing. The playlist's own name takes 24 characters.",
        es: "Los pies de foto son los títulos de las canciones: pon en cada uno dónde fue o qué sonaba. El nombre de la playlist admite 24 caracteres.",
      },
    },
  },
  evergreen: {
    for: PARTNER,
    feels: ["romantic", "sentimental"],
    why: {
      base: {
        en: "They unwrap a parcel in old newspaper and cream butterflies fly out over a sage green collage: your photos on white polaroids, a record, torn newsprint.",
        es: "Desenvuelve un paquete de papel de periódico y salen volando mariposas color crema sobre un collage verde salvia: vuestras fotos en polaroids blancas, un disco y recortes de prensa.",
      },
      sentimental: {
        en: "The words across the top read \"my evergreen\" unless you write your own in 22 characters. Every tap lets another butterfly go, down to your letter.",
        es: "Las palabras de arriba dicen «siempre tú» si no escribes las tuyas en 22 caracteres. Cada toque suelta otra mariposa, hasta llegar a tu carta.",
      },
    },
  },
  "be-my-boo": {
    for: PARTNER,
    feels: ["funny", "romantic"],
    only: HALLOWEEN,
    why: {
      base: {
        en: "A little ghost holds a sign with their name. One tap and it says boo and flies off; underneath, a black cat lies across your photos, swishing its tail.",
        es: "Un fantasmita sostiene un cartel con su nombre. Un toque, dice «bu» y sale volando; debajo, un gato negro tumbado sobre vuestras fotos mueve la cola.",
      },
      romantic: {
        en: "The line under their name asks \"be my boo?\" unless you write your own in 24 characters. Every tap on the page sends up a tiny ghost.",
        es: "La frase bajo su nombre pregunta «¿serás mi boo?» si no escribes la tuya en 24 caracteres. Cada toque en la página hace subir un fantasmita.",
      },
    },
  },
  "fall-for-you": {
    for: PARTNER,
    feels: ["romantic", "sentimental"],
    only: AUTUMN,
    why: {
      base: {
        en: "One tap lights a jar candle with their name on the label, and the room warms up over a gingham collage: your photos, maple leaves, their name in wooden letter blocks.",
        es: "Con un toque se enciende una vela en tarro con su nombre en la etiqueta, y la habitación se templa sobre un collage de vichy: vuestras fotos, hojas de arce y su nombre en cubos de madera.",
      },
      sentimental: {
        en: "Fill in the recipe card, 90 characters under \"recipe for us\", with what your autumns are made of. Each tap on the page lets a leaf fall.",
        es: "Rellena la ficha de receta, 90 caracteres bajo «receta para nosotros», con lo que llevan vuestros otoños. Cada toque en la página deja caer una hoja.",
      },
    },
  },
  "autumn-reel": {
    for: PARTNER,
    feels: ["romantic", "sentimental", "unusual"],
    only: AUTUMN,
    why: {
      base: {
        en: "A darkroom under a red light, your photos hanging on the line as negatives. One tap, the light comes on, and the prints develop into your photos.",
        es: "Un cuarto oscuro con luz roja y vuestras fotos colgadas en negativo. Un toque, se enciende la luz y las copias se revelan hasta ser vuestras fotos.",
      },
      romantic: {
        en: "Under the prints is a collage on old film, with a page from a novel that carries your two names as its running head. The line cut out of a book is yours, 60 characters.",
        es: "Bajo las copias hay un collage sobre película antigua, con una página de novela que lleva vuestros dos nombres en la cabecera. La frase recortada de un libro la escribes tú, 60 caracteres.",
      },
    },
  },
  seance: {
    for: [...PARTNER, "best-friend", "someone"],
    feels: ["unusual", "romantic"],
    only: HALLOWEEN,
    why: {
      base: {
        en: "They touch the planchette and it moves by itself, spelling your words one glowing letter at a time. You get 22 letters, enough for a nickname or \"I love you\".",
        es: "Toca la plancheta y se mueve sola, deletreando tus palabras letra a letra, cada una encendida. Tienes 22 letras: caben un apodo o «te quiero».",
      },
      romantic: {
        en: "The board spells what you chose, says goodbye, and the candles go out. In the dark your letter appears on old paper, and your photos develop out of the mist.",
        es: "El tablero deletrea lo que elegiste, se despide y las velas se apagan. A oscuras aparece tu carta sobre papel viejo, y tus fotos se revelan entre la niebla.",
      },
    },
  },
  "bat-swarm": {
    for: [...PARTNER, "best-friend", "someone"],
    feels: ["unusual", "romantic"],
    only: HALLOWEEN,
    why: {
      base: {
        en: "They tap the moon and hundreds of bats pour out, then fly in to spell their name, a line of yours up to 14 characters, and a heart.",
        es: "Toca la luna y salen cientos de murciélagos que luego vuelan hasta escribir su nombre, una frase tuya de hasta 14 caracteres y un corazón.",
      },
      romantic: {
        en: "Use the 14 characters after their name for something like \"be mine\". When the bats burst away, your letter and photos are waiting in the moonlight.",
        es: "Usa los 14 caracteres que van tras su nombre para algo como «quédate». Cuando los murciélagos se dispersan, tu carta y tus fotos esperan a la luz de la luna.",
      },
    },
  },
  cauldron: {
    for: [...PARTNER, "best-friend", "someone"],
    feels: ["funny", "unusual"],
    only: HALLOWEEN,
    why: {
      base: {
        en: "Label three jars with things you love about them, 34 characters each. They tap each into the cauldron, it boils over, and a bottle with their name floats up.",
        es: "Etiqueta tres tarros con cosas suyas que te encantan, de 34 caracteres cada una. Los echa al caldero uno a uno, rebosa y sube flotando un frasco con su nombre.",
      },
      unusual: {
        en: "The potion changes colour with every jar they tap in. After the third, the steam coils into a heart, the cork pops and your letter unrolls.",
        es: "La poción cambia de color con cada tarro que echa. Tras el tercero, el vapor se enrosca en un corazón, salta el corcho y tu carta se desenrolla.",
      },
    },
  },
  "jack-o-lantern": {
    for: EVERYONE,
    feels: ["unusual", "funny"],
    only: HALLOWEEN,
    why: {
      base: {
        en: "One tap and a pumpkin carves itself: eyes, nose, grin, then their name across the belly in up to 12 characters. They light the candle and it glows through the cuts.",
        es: "Un toque y una calabaza se talla sola: ojos, nariz, sonrisa y después su nombre en la panza, hasta 12 caracteres. Enciende la vela y la cara brilla por los cortes.",
      },
      funny: {
        en: "Choose a classic grin, heart eyes or a cat face, and carve a nickname where their name would go. Your letter and photos are under the pumpkin.",
        es: "Elige una sonrisa clásica, ojos de corazón o cara de gato, y talla un apodo donde iría su nombre. Tu carta y tus fotos están debajo de la calabaza.",
      },
    },
  },
  "haunted-house": {
    for: EVERYONE,
    feels: ["unusual", "sentimental"],
    only: HALLOWEEN,
    why: {
      base: {
        en: "They open the gate in a thunderstorm and the windows light one by one. Tap a window and a silhouette steps aside to show one of your photos.",
        es: "Abre la verja en plena tormenta y las ventanas se encienden una a una. Toca una ventana y una silueta se aparta para enseñar una de tus fotos.",
      },
      sentimental: {
        en: "Up to six photos, one behind each lit window in a gilt frame. Then they knock on the door, and it opens on a warm glow and your letter.",
        es: "Hasta seis fotos, una tras cada ventana encendida, en marco dorado. Después llama a la puerta, que se abre a una luz cálida y a tu carta.",
      },
    },
  },
  "nice-list": {
    for: EVERYONE,
    feels: ["funny"],
    only: CHRISTMAS,
    why: {
      base: {
        en: "A scroll from the North Pole with up to four good deeds and four crimes, all written by you. Each gets ticked in pen before the verdict is stamped.",
        es: "Un pergamino del Polo Norte con hasta cuatro buenas obras y cuatro fechorías, todas escritas por ti. Cada una recibe su marca a boli antes de que caiga el sello con el veredicto.",
      },
    },
  },
  unwrapped: {
    for: EVERYONE,
    feels: ["funny", "sentimental"],
    only: ["christmas", "anniversary"],
    why: {
      base: {
        en: "The year in numbers, up to eight, each inside a present they tear open: \"212 photos of the dog\" counts up from zero.",
        es: "El año en cifras, hasta ocho, cada una dentro de un regalo que desenvuelve: «212 fotos del perro» va subiendo desde cero.",
      },
      sentimental: {
        en: "Count the year: the voice notes, the flights, the Sunday calls. Each number is a present to unwrap, and the gold one prints them all as a receipt.",
        es: "Haz las cuentas del año: los audios, los vuelos, las llamadas de los domingos. Cada cifra es un regalo que abrir, y el dorado las imprime todas en un tique.",
      },
    },
  },
  wishbone: {
    for: EVERYONE,
    feels: ["funny", "unusual"],
    only: THANKSGIVING,
    why: {
      base: {
        en: "They pull their side of the wishbone with a finger until it snaps. You decide beforehand who gets the big half, and your wish comes out with it.",
        es: "Tira de su lado de la espoleta con el dedo hasta que se parte. Tú decides antes quién se queda la mitad grande, y con ella sale tu deseo.",
      },
      funny: {
        en: "Rig it. Give yourself the big half and write a wish at their expense in 120 characters, or let them win one that is good news for you both.",
        es: "Amáñalo. Quédate tú la mitad grande y escribe un deseo a su costa en 120 caracteres, o deja que gane uno que os venga bien a los dos.",
      },
    },
  },
  "frosted-window": {
    for: EVERYONE,
    feels: ["romantic", "sentimental"],
    only: CHRISTMAS,
    why: {
      base: {
        en: "They wipe the frost off a window with a finger. Outside in the snow, a snowman is holding a blackboard with your words on it, up to 36 characters.",
        es: "Limpia con el dedo la escarcha de una ventana. Fuera, en la nieve, un muñeco de nieve sostiene una pizarra con tus palabras, hasta 36 caracteres.",
      },
      sentimental: {
        en: "A window on Christmas Eve, with two stockings that carry your names. Once the frost is wiped away, your letter, your photos and your song follow.",
        es: "Una ventana en Nochebuena, con dos calcetines que llevan vuestros nombres. Cuando se retira la escarcha, llegan tu carta, tus fotos y tu canción.",
      },
    },
  },
  "light-the-candles": {
    for: EVERYONE,
    feels: ["sentimental", "romantic"],
    only: THANKSGIVING,
    why: {
      base: {
        en: "Each candle that catches writes one thing you are thankful for in light, as they carry a match from wick to wick. Five of them, 60 characters each.",
        es: "Lleva una cerilla de mecha en mecha, y cada vela que prende escribe con luz una cosa por la que das las gracias. Son cinco, de 60 caracteres cada una.",
      },
      romantic: {
        en: "Make the five small and exact, like \"the coffee you bring me before I ask\". The room warms with every candle, and your letter follows the last.",
        es: "Que las cinco sean pequeñas y exactas, como «el café que me traes antes de que lo pida». La sala se templa con cada vela, y tu carta llega tras la última.",
      },
    },
  },
  "string-the-lights": {
    for: EVERYONE,
    feels: ["unusual", "sentimental"],
    only: CHRISTMAS,
    why: {
      base: {
        en: "They run a finger along the roof to hang the bulbs, then throw the switch. Your words come on in lights in the garden, up to 28 characters.",
        es: "Pasa el dedo por el tejado para colgar las bombillas y luego le da al interruptor. Tus palabras se encienden en luces en el jardín, hasta 28 caracteres.",
      },
      sentimental: {
        en: "A dark house in the snow until they light it. Once every window is warm, your letter, your photos and your song follow.",
        es: "Una casa a oscuras en la nieve hasta que la ilumina. Cuando todas las ventanas dan luz cálida, llegan tu carta, tus fotos y tu canción.",
      },
    },
  },
  "gingerbread-house": {
    for: EVERYONE,
    feels: ["funny", "unusual"],
    only: CHRISTMAS,
    why: {
      base: {
        en: "They decorate it themselves: gumdrops, peppermints and stars pressed on wherever they like, icing piped with a finger. Then the little door opens on your letter.",
        es: "La decora a su gusto: gominolas, caramelos de menta y estrellas pegadas donde quiera, y glaseado dibujado con el dedo. Después la puertecita se abre a tu carta.",
      },
      unusual: {
        en: "No two come out the same, because they place every sweet. When it is dressed, the door opens on a warm light with your photos and song inside.",
        es: "No hay dos iguales, porque coloca cada dulce. Cuando está decorada, la puerta se abre a una luz cálida con tus fotos y tu canción dentro.",
      },
    },
  },
};

/** The gift-ideas pages a template belongs on, in the order the site lists people: its "Who it suits" row. */
export function suitedRecipients(slug: string): Recipient[] {
  const fit = FINDER_FITS[slug];
  return fit ? RECIPIENTS.filter((r) => fit.for.includes(r)) : [];
}

/** The people whose gift-ideas page already recommends a template: it ranks a little higher for them. */
function listedFor(slug: string): Recipient[] {
  return RECIPIENTS.filter((r) => RECIPIENT_GUIDES[r].en.ideas.some((idea) => idea.template === slug));
}

/** Every template the finder can offer, as the scoring reads it. A template with no entry in the table is left out. */
export function finderGifts(): (FinderGift & { why: FinderReasons<Words> })[] {
  return TEMPLATE_MANIFESTS.flatMap((m) => {
    const fit = FINDER_FITS[m.slug];
    if (!fit) return [];
    return [{ slug: m.slug, occasions: m.occasions, sortOrder: m.sortOrder, for: fit.for, feels: fit.feels, only: fit.only, conditional: fit.conditional, listedFor: listedFor(m.slug), why: fit.why }];
  });
}

/** One template as the finder's page shows it, in one language: what the browser is sent. */
export type FinderPick = FinderGift & { name: string; poster: string; free: boolean; why: FinderReasons<string> };

export function finderPicks(locale: GiftLocale): FinderPick[] {
  const manifests = new Map(TEMPLATE_MANIFESTS.map((m) => [m.slug, m]));
  return finderGifts().map(({ why, ...gift }) => {
    const m = manifests.get(gift.slug)!;
    const words = Object.fromEntries(Object.entries(why).map(([key, value]) => [key, value[locale]])) as FinderReasons<string>;
    return { ...gift, name: m.name[locale], poster: m.thumbnail.poster, free: sendsFree(m), why: words };
  });
}

/** The page's own words, and the tool's. */
export type FinderCopy = {
  /** The search result's headline, before " · Ethos", and its description. */
  title: string;
  description: string;
  eyebrow: string;
  h1: string;
  intro: string;
  ui: FinderUi;
  /** The two rows of links under the tool: a small label over each, and no sentence. */
  byWho: string;
  byDay: { title: string; all: string };
};

export type FinderUi = {
  steps: Record<FinderStep, { label: string; question: string }>;
  /** "Question {n} of 3". */
  stepOf: string;
  people: Record<FinderRecipient, string>;
  occasions: Record<Occasion, string>;
  feels: Record<FinderFeel, { label: string; hint: string }>;
  notSure: string;
  moreOccasions: string;
  /** The row of answers, named for a screen reader. */
  answers: string;
  /** A chosen answer's button, for a screen reader: "Change: {question}". */
  change: string;
  resultTitle: string;
  resultLead: string;
  /** "Pick {n}". */
  pick: string;
  watch: string;
  make: string;
  more: string;
  restart: string;
  end: string;
  copyLink: string;
  copied: string;
  /** The demo's window: "{name}: live demo". */
  demoTitle: string;
  demoHint: string;
  close: string;
};

export const FINDER_PATH = "/gifts/finder";

export const FINDER_COPY: Record<GiftLocale, FinderCopy> = {
  en: {
    title: "Digital Gift Finder: What Should You Send?",
    description: "Not sure which digital gift to send? Answer three questions about who it's for, the occasion and the feeling, and get three gifts to watch and make.",
    eyebrow: "Gift finder",
    h1: "Which digital gift should you send?",
    intro: "Answer three questions and get three gifts you can watch open and start making. No account, no email.",
    ui: {
      steps: {
        for: { label: "Who", question: "Who is it for?" },
        occasion: { label: "Occasion", question: "What's the occasion?" },
        feel: { label: "Feeling", question: "What should it feel like?" },
      },
      stepOf: "Question {n} of 3",
      people: {
        girlfriend: "My girlfriend",
        boyfriend: "My boyfriend",
        wife: "My wife",
        husband: "My husband",
        mom: "My mom",
        dad: "My dad",
        "best-friend": "My best friend",
        someone: "Someone else",
      },
      occasions: {
        birthday: "Birthday",
        anniversary: "Anniversary",
        valentines: "Valentine's Day",
        christmas: "Christmas",
        "long-distance": "Long distance",
        apology: "Saying sorry",
        "just-because": "No occasion",
        wedding: "Wedding",
        graduation: "Graduation",
        halloween: "Halloween",
        thanksgiving: "Thanksgiving",
        "mothers-day": "Mother's Day",
        "fathers-day": "Father's Day",
      },
      feels: {
        romantic: { label: "Romantic", hint: "Close, and a little old-fashioned" },
        funny: { label: "Funny", hint: "In-jokes first, feelings second" },
        sentimental: { label: "Sentimental", hint: "Photos, years, the things you kept" },
        unusual: { label: "Unusual", hint: "Something to blow on, tilt or shake" },
      },
      notSure: "Not sure",
      moreOccasions: "Something else",
      answers: "Your answers",
      change: "Change: {question}",
      resultTitle: "Three gifts that fit",
      resultLead: "Ranked for your answers. Watch each one open before you choose.",
      pick: "Pick {n}",
      watch: "Watch it",
      make: "Make this gift",
      more: "Show three more",
      restart: "Start again",
      end: "Those are all the gifts that fit these answers.",
      copyLink: "Copy the link to these picks",
      copied: "Link copied",
      demoTitle: "{name}: live demo",
      demoHint: "This is the template with sample words and photos. Yours go in when you make it.",
      close: "Close",
    },
    byWho: "By person",
    byDay: { title: "By occasion", all: "All {count} templates" },
  },
  es: {
    title: "Buscador de regalos digitales: ¿cuál enviar?",
    description: "¿No sabes qué regalo digital enviar? Responde tres preguntas (para quién es, la ocasión y el tono) y verás tres regalos que puedes probar y crear.",
    eyebrow: "Buscador de regalos",
    h1: "¿Qué regalo digital deberías enviar?",
    intro: "Responde tres preguntas y te proponemos tres regalos: mira cómo se abren y empieza el tuyo. Sin cuenta ni correo.",
    ui: {
      steps: {
        for: { label: "Para quién", question: "¿Para quién es?" },
        occasion: { label: "Ocasión", question: "¿Cuál es la ocasión?" },
        feel: { label: "Tono", question: "¿Qué tono debería tener?" },
      },
      stepOf: "Pregunta {n} de 3",
      people: {
        girlfriend: "Mi novia",
        boyfriend: "Mi novio",
        wife: "Mi esposa",
        husband: "Mi marido",
        mom: "Mi madre",
        dad: "Mi padre",
        "best-friend": "Mi mejor amiga o amigo",
        someone: "Otra persona",
      },
      occasions: {
        birthday: "Cumpleaños",
        anniversary: "Aniversario",
        valentines: "San Valentín",
        christmas: "Navidad",
        "long-distance": "A distancia",
        apology: "Pedir perdón",
        "just-because": "Sin ocasión",
        wedding: "Boda",
        graduation: "Graduación",
        halloween: "Halloween",
        thanksgiving: "Acción de Gracias",
        "mothers-day": "Día de la Madre",
        "fathers-day": "Día del Padre",
      },
      feels: {
        romantic: { label: "Romántico", hint: "Cercano y un poco a la antigua" },
        funny: { label: "Divertido", hint: "Primero las bromas, después lo tierno" },
        sentimental: { label: "Sentimental", hint: "Fotos, años, lo que se guarda" },
        unusual: { label: "Original", hint: "Algo que se sopla, se inclina o se agita" },
      },
      notSure: "No lo sé",
      moreOccasions: "Otra ocasión",
      answers: "Tus respuestas",
      change: "Cambiar: {question}",
      resultTitle: "Tres regalos que encajan",
      resultLead: "Ordenados según tus respuestas. Mira cómo se abre cada uno antes de elegir.",
      pick: "Opción {n}",
      watch: "Verlo",
      make: "Crear este regalo",
      more: "Ver tres más",
      restart: "Empezar de nuevo",
      end: "Estos son todos los regalos que encajan con tus respuestas.",
      copyLink: "Copiar el enlace a esta selección",
      copied: "Enlace copiado",
      demoTitle: "{name}: demo en vivo",
      demoHint: "Es la plantilla con palabras y fotos de ejemplo. Las tuyas entran cuando lo creas.",
      close: "Cerrar",
    },
    byWho: "Por persona",
    byDay: { title: "Por ocasión", all: "Las {count} plantillas" },
  },
};
