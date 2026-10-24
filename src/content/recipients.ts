import type { GiftLocale } from "@/lib/gift/schema";

/**
 * The gift-idea pages by who it's for: /gifts/for-boyfriend and the rest. People search the person
 * before the thing ("digital gift for girlfriend", "regalo digital para mi novio"), and the pages
 * that answer are lists of ideas. These are lists too, but every idea is a template with a live
 * demo one tap away, so the page answers the question and the answer can be made in ten minutes.
 *
 * Every fact here (what is free, photo counts, scheduling being a premium feature, links not
 * expiring) matches the pricing page's FAQ and the templates' manifests; change one and change both.
 */
export const RECIPIENTS = ["boyfriend", "girlfriend", "husband", "wife", "best-friend", "mom", "dad"] as const;
export type Recipient = (typeof RECIPIENTS)[number];

/** The path segment: /gifts/for-boyfriend. */
export const recipientSlug = (r: Recipient) => `for-${r}`;
export function recipientFromSlug(slug: string): Recipient | null {
  const r = slug.startsWith("for-") ? slug.slice(4) : "";
  return (RECIPIENTS as readonly string[]).includes(r) ? (r as Recipient) : null;
}

export type RecipientGuide = {
  /** The search result's headline, before " · Ethos". */
  title: string;
  description: string;
  /** The page's h1; short, and the words people type. */
  h1: string;
  /** What the link to this page says elsewhere on the site. */
  label: string;
  lead: string;
  ideas: { template: string; heading: string; body: string }[];
  sections: { heading: string; body: string }[];
  faq: { q: string; a: string }[];
};

const freeEn = {
  q: "Is it free?",
  a: "The Letter and Constellations are free, with up to ten photos, music, a countdown and a hidden surprise. Every other template is a one-time payment for that template, with no subscription, and you can try each one in full before you pay.",
};
const freeEs = {
  q: "¿Es gratis?",
  a: "La carta y Constelaciones son gratis, con hasta diez fotos, música, una cuenta atrás y una sorpresa final. Las demás plantillas son un solo pago por esa plantilla, sin suscripción, y puedes probar cada una entera antes de pagar.",
};

export const RECIPIENT_GUIDES: Record<Recipient, Record<GiftLocale, RecipientGuide>> = {
  boyfriend: {
    en: {
      title: "Digital Gifts for Your Boyfriend: 10 Ideas He'll Keep",
      description: "Digital gift ideas for your boyfriend: a love letter, a playlist of you two, a jar of 100 reasons, a little game. Made in ten minutes, sent as a link.",
      h1: "Digital gifts for your boyfriend",
      label: "For your boyfriend",
      lead: "He'll forget most things that come in a box. He won't forget opening a letter that says exactly what you think of him, with the photos only you have and the song you two wore out. These are the digital gifts that work for a boyfriend, near or far, each made in about ten minutes and sent as a link.",
      ideas: [
        { template: "the-letter", heading: "A love letter he opens like a real one", body: "He breaks a wax seal with a tap, then reads your words between your photos while your song plays. It's free, and it's where most people start. Write the thing you'd never say out loud; he'll read it more than once." },
        { template: "on-repeat", heading: "A playlist of the two of you", body: "Your photo as the album cover, a pink sunset and a playlist of the songs that are yours. For the boyfriend with opinions about music." },
        { template: "jar-of-reasons", heading: "100 reasons you love him, in a jar", body: "Folded notes he shakes out one at a time, up to a hundred. Make some sweet, some only he'd get, and a couple that are just rude enough." },
        { template: "arcade", heading: "A little arcade game made for him", body: "He catches the hearts to unlock your photos one by one, then reads your message. For a gamer, or anyone who can't leave a high score alone." },
        { template: "the-council", heading: "Five cats judge his case", body: "The Council reads out the evidence of why he's yours and stamps a verdict. Funny first, and soft at the end." },
        { template: "scratch-card", heading: "A scratch card with news on the last one", body: "Small things on the first cards and the big one at the end: a trip, a question, \"I'm moving to your city\"." },
        { template: "passport", heading: "A passport, if he's far away", body: "It flies from your city to his, stamped with the places and photos you share. Made for a long-distance boyfriend." },
        { template: "pack-your-bags", heading: "A surprise trip, revealed", body: "An airport departures board that flips to where you're taking him. Save it for a birthday or an anniversary." },
        { template: "front-page", heading: "His own front page", body: "A newspaper with your headline about him and the stories only you know. Good for a birthday, better for a promotion." },
        { template: "constellations", heading: "A sky made of your photos", body: "Every photo is a star he finds by moving his phone, and your song plays when he's found them all. Free, and quietly romantic." },
      ],
      sections: [
        { heading: "What to write to him", body: "Specific beats sweet. Not \"you're the best boyfriend\", but the time he drove back for your charger, the voice he does for the cat, the moment you knew. Three or four sentences are plenty. If you're stuck, start with \"I don't say this enough, but…\" and keep going." },
        { heading: "When to send it", body: "At midnight on his birthday, the morning of your anniversary, or on a random Tuesday, which is when it lands hardest. On a premium template you can schedule it to open at a set time in his time zone; otherwise send the link the moment you'd normally text him." },
      ],
      faq: [
        { q: "What's a good digital gift for a boyfriend?", a: "One only you could make: your photos, your words and the song that's yours. A love letter is the classic and it's free; a playlist, a reasons jar or a little game suits a boyfriend who'd squirm at anything too soppy." },
        { q: "Can I send it if we're long distance?", a: "Yes, it was made for that. He opens the link on his phone wherever he is, and a premium template can be scheduled to open at midnight in his time zone." },
        freeEn,
      ],
    },
    es: {
      title: "Regalos digitales para tu novio: 10 ideas que guardará",
      description: "Ideas de regalos digitales para tu novio: una carta de amor, una playlist de los dos, un frasco de 100 razones, un juego. Hechos en diez minutos, en un enlace.",
      h1: "Regalos digitales para tu novio",
      label: "Para tu novio",
      lead: "Casi todo lo que viene en una caja se olvida. Lo que no se olvida es abrir una carta que dice exactamente lo que piensas de él, con las fotos que solo tú tienes y la canción que habéis gastado de tanto ponerla. Estos son los regalos digitales que funcionan con un novio, cerca o lejos: cada uno se hace en unos diez minutos y se envía en un enlace.",
      ideas: [
        { template: "the-letter", heading: "Una carta de amor que abre como una de verdad", body: "Rompe un sello de lacre con un toque y lee tus palabras entre vuestras fotos mientras suena vuestra canción. Es gratis y es por donde empieza casi todo el mundo. Escribe lo que nunca dirías en voz alta: la leerá más de una vez." },
        { template: "on-repeat", heading: "Una playlist de los dos", body: "Vuestra foto como portada del disco, un atardecer rosa y una lista con las canciones que son vuestras. Para el novio que tiene opiniones sobre música." },
        { template: "jar-of-reasons", heading: "100 razones por las que le quieres, en un frasco", body: "Notas dobladas que salen una a una al agitar el móvil, hasta cien. Unas tiernas, otras que solo entiende él y un par un poco atrevidas." },
        { template: "arcade", heading: "Un pequeño videojuego hecho para él", body: "Atrapa corazones para desbloquear vuestras fotos una a una y luego lee tu mensaje. Para un gamer, o para quien no soporta perder un récord." },
        { template: "the-council", heading: "Cinco gatos juzgan su caso", body: "El Consejo lee las pruebas de por qué es tuyo y sella un veredicto. Primero hace reír y al final se pone tierno." },
        { template: "scratch-card", heading: "Un rasca y gana con noticia en la última", body: "Cosas pequeñas en las primeras tarjetas y lo gordo al final: un viaje, una pregunta, \"me mudo a tu ciudad\"." },
        { template: "passport", heading: "Un pasaporte, si está lejos", body: "Vuela de tu ciudad a la suya, sellado con los lugares y las fotos que compartís. Hecho para un novio a distancia." },
        { template: "pack-your-bags", heading: "Un viaje sorpresa, revelado", body: "Un panel de salidas de aeropuerto que gira hasta el sitio al que le llevas. Guárdalo para un cumpleaños o un aniversario." },
        { template: "front-page", heading: "Su propia portada", body: "Un periódico con tu titular sobre él y las historias que solo tú sabes. Bien para un cumpleaños, mejor para un ascenso." },
        { template: "constellations", heading: "Un cielo hecho de vuestras fotos", body: "Cada foto es una estrella que encuentra moviendo el móvil, y vuestra canción suena cuando las encuentra todas. Gratis, y romántico sin hacer ruido." },
      ],
      sections: [
        { heading: "Qué escribirle", body: "Lo concreto gana a lo cursi. No \"eres el mejor novio\", sino la vez que volvió a por tu cargador, la voz que pone para hablarle al gato, el momento en que lo supiste. Tres o cuatro frases bastan. Si te atascas, empieza con \"No te lo digo lo suficiente, pero…\" y sigue." },
        { heading: "Cuándo enviarlo", body: "A medianoche en su cumpleaños, la mañana de vuestro aniversario o un martes cualquiera, que es cuando más impacta. Con una plantilla premium puedes programarlo para que se abra a una hora en su zona horaria; si no, envía el enlace cuando normalmente le escribirías." },
      ],
      faq: [
        { q: "¿Qué regalo digital le hago a mi novio?", a: "Uno que solo tú podrías hacer: vuestras fotos, tus palabras y vuestra canción. La carta de amor es el clásico y es gratis; una playlist, un frasco de razones o un pequeño juego van mejor con un novio al que lo muy cursi le da vergüenza." },
        { q: "¿Sirve si tenemos una relación a distancia?", a: "Sí, está hecho para eso. Abre el enlace en su móvil esté donde esté, y una plantilla premium se puede programar para medianoche en su zona horaria." },
        freeEs,
      ],
    },
  },
  girlfriend: {
    en: {
      title: "Digital Gifts for Your Girlfriend: 10 Ideas She'll Keep",
      description: "Digital gift ideas for your girlfriend: a love letter with your song, a bouquet that never wilts, a scrapbook of you two. Made in ten minutes, sent as a link.",
      h1: "Digital gifts for your girlfriend",
      label: "For your girlfriend",
      lead: "Flowers wilt by Thursday. A letter that says what you actually think of her, with the photos from your camera roll and the song that's yours, is still there next year, and she will open it again. These are the digital gifts that work for a girlfriend, each made in about ten minutes and sent as a link.",
      ideas: [
        { template: "the-letter", heading: "A love letter, sealed in wax", body: "She breaks the seal with a tap and reads your words between your photos while your song plays. Free, and the one to start with if you've never written her a letter." },
        { template: "bouquet", heading: "A bouquet that never wilts", body: "Pick every stem yourself, roses, peonies, tulips or sunflowers in the colours she likes, with a card inside for your note." },
        { template: "jar-of-reasons", heading: "100 reasons you love her", body: "A jar of folded notes she shakes out one at a time, up to a hundred. Make some of them about tiny things; those are the ones that land." },
        { template: "coquette", heading: "A pink bow and polaroids", body: "She unties the bow and finds a gingham collage of real lilies, your photos and your song. For a girlfriend with a coquette Pinterest board." },
        { template: "scrapbook", heading: "A scrapbook of the two of you", body: "Polaroids, washi tape and a torn note in the corner. The trips, the bad haircuts, the night you met." },
        { template: "music-box", heading: "A music box with your song", body: "She winds the key, the lid opens, a ballerina turns to the tune and your photos appear in the mirror." },
        { template: "favorite-person", heading: "For your favorite person", body: "A watercolour scrapbook under tissue paper, with pearls, pressed flowers and your photos. For no reason, which is the best reason." },
        { template: "xoxo", heading: "A card sealed with a kiss", body: "Lipstick prints, polaroids and your song, and every tap leaves another kiss. For Valentine's, or a Wednesday." },
        { template: "photo-booth", heading: "A photo booth strip of you two", body: "She pulls the curtain and four flashes later a strip of the two of you prints, with your message on the back." },
        { template: "constellations", heading: "A sky made of your photos", body: "Every photo is a star she finds by moving her phone, and your song plays when she's found them all. Free." },
      ],
      sections: [
        { heading: "What to write to her", body: "Say what you notice. Not \"you're beautiful\" but the way she reads the end of a book first, the face she makes at bad parking, the second you knew. Three or four honest sentences beat a page of quotes. If you're stuck, start with \"The thing I never tell you is…\"." },
        { heading: "When to send it", body: "First thing on her birthday, the morning of your anniversary, or a day with no occasion at all, which is when it means the most. A premium template can be scheduled to open at a set time in her time zone; otherwise send the link when you'd normally text her good morning." },
      ],
      faq: [
        { q: "What's a good digital gift for a girlfriend?", a: "Something made from the two of you: your photos, your words and your song. A love letter or a reasons jar says the most; a bouquet or a music box is the one to send when you want it to look as good as it reads." },
        { q: "Can she keep it?", a: "Yes. The link doesn't expire, so she can open it again next year, and if she wants to she can send one back in the same template for free." },
        freeEn,
      ],
    },
    es: {
      title: "Regalos digitales para tu novia: 10 ideas que guardará",
      description: "Ideas de regalos digitales para tu novia: una carta de amor con vuestra canción, un ramo que no se marchita, un álbum de los dos. En diez minutos, en un enlace.",
      h1: "Regalos digitales para tu novia",
      label: "Para tu novia",
      lead: "Las flores se marchitan antes del jueves. Una carta que dice lo que de verdad piensas de ella, con las fotos de tu carrete y vuestra canción, sigue ahí el año que viene, y la volverá a abrir. Estos son los regalos digitales que funcionan con una novia: cada uno se hace en unos diez minutos y se envía en un enlace.",
      ideas: [
        { template: "the-letter", heading: "Una carta de amor con sello de lacre", body: "Rompe el sello con un toque y lee tus palabras entre vuestras fotos mientras suena vuestra canción. Gratis, y la mejor forma de empezar si nunca le has escrito una carta." },
        { template: "bouquet", heading: "Un ramo que nunca se marchita", body: "Elige cada flor, rosas, peonías, tulipanes o girasoles en los colores que le gustan, también flores amarillas, con una tarjeta dentro para tu nota." },
        { template: "jar-of-reasons", heading: "100 razones por las que la quieres", body: "Un frasco de notas dobladas que salen una a una al agitar el móvil, hasta cien. Escribe algunas sobre cosas pequeñas: son las que más llegan." },
        { template: "coquette", heading: "Un lazo rosa y polaroids", body: "Desata el lazo y aparece un collage de vichy con lirios de verdad, vuestras fotos y vuestra canción. Para una novia con un tablero coquette en Pinterest." },
        { template: "scrapbook", heading: "Un álbum de recortes de los dos", body: "Polaroids, cinta washi y una nota rasgada en la esquina. Los viajes, los cortes de pelo horribles, la noche en que os conocisteis." },
        { template: "music-box", heading: "Una caja de música con vuestra canción", body: "Da cuerda a la llave, se abre la tapa, una bailarina gira con la melodía y vuestras fotos aparecen en el espejo." },
        { template: "favorite-person", heading: "Para tu persona favorita", body: "Un álbum en acuarela bajo papel de seda, con perlas, flores prensadas y vuestras fotos. Sin motivo, que es el mejor motivo." },
        { template: "xoxo", heading: "Una tarjeta sellada con un beso", body: "Marcas de pintalabios, polaroids y vuestra canción, y cada toque deja otro beso. Para San Valentín o para un miércoles." },
        { template: "photo-booth", heading: "Una tira de fotomatón de los dos", body: "Corre la cortina y, cuatro flashes después, sale una tira de los dos con tu mensaje detrás." },
        { template: "constellations", heading: "Un cielo hecho de vuestras fotos", body: "Cada foto es una estrella que encuentra moviendo el móvil, y vuestra canción suena cuando las encuentra todas. Gratis." },
      ],
      sections: [
        { heading: "Qué escribirle", body: "Di lo que ves. No \"eres preciosa\", sino que lee el final de los libros primero, la cara que pone cuando alguien aparca fatal, el segundo en que lo supiste. Tres o cuatro frases sinceras valen más que una página de citas. Si te atascas, empieza con \"Lo que nunca te digo es…\"." },
        { heading: "Cuándo enviarlo", body: "A primera hora en su cumpleaños, la mañana de vuestro aniversario o un día sin ocasión ninguna, que es cuando más significa. Una plantilla premium se puede programar para que se abra a una hora en su zona horaria; si no, envía el enlace cuando le darías los buenos días." },
      ],
      faq: [
        { q: "¿Qué regalo digital le hago a mi novia?", a: "Algo hecho con lo vuestro: vuestras fotos, tus palabras y vuestra canción. Una carta de amor o un frasco de razones es lo que más dice; un ramo o una caja de música, lo que mandas cuando quieres que se vea tan bonito como se lee." },
        { q: "¿Lo puede guardar?", a: "Sí. El enlace no caduca, así que puede volver a abrirlo el año que viene, y si quiere puede devolverte uno en la misma plantilla gratis." },
        freeEs,
      ],
    },
  },
  husband: {
    en: {
      title: "Digital Gifts for Your Husband: Ideas for Any Day",
      description: "Digital gift ideas for your husband: your years together as a timeline, a letter, his song on vinyl, his own front page. Made in ten minutes, sent as a link.",
      h1: "Digital gifts for your husband",
      label: "For your husband",
      lead: "After a few years together the hard part isn't money, it's finding something he doesn't already have. He doesn't have this: the story of the two of you, told with your photos and your words, waiting on his phone. These are the digital gifts that work for a husband, each made in about ten minutes.",
      ideas: [
        { template: "our-timeline", heading: "Your years together, as a timeline", body: "A road that draws itself as he scrolls: the day you met, the first flat, the wedding, the kids or the dog, with up to 20 photos and a video." },
        { template: "the-letter", heading: "A letter he opens like a real one", body: "A wax seal, your words and your photos, with your song playing. Free, and the gift most husbands never get: a letter." },
        { template: "vinyl", heading: "His song, on vinyl", body: "He drops the needle on the song from your wedding, or the one from the car, and your photos and message play along." },
        { template: "front-page", heading: "He makes the front page", body: "A newspaper with your headline about him and the stories you'd tell at his retirement party. For his birthday or Father's Day." },
        { template: "museum", heading: "A museum of the two of you", body: "Your photos hung in a quiet gallery with labels on the wall and a video room. The anniversary gift for someone who has everything." },
        { template: "the-toast", heading: "A toast, from you", body: "He tilts to pour, knocks to clink and your speech begins. For an anniversary dinner you can't make, or one you can." },
        { template: "fortune-cookie", heading: "A fortune cookie with his future in it", body: "He cracks it open to find the fortunes you wrote, up to twenty. Promises, jokes and one about the dishwasher." },
        { template: "pack-your-bags", heading: "A trip, revealed", body: "A departures board that flips to the weekend you've booked. The best way to tell him." },
      ],
      sections: [
        { heading: "What to write to him", body: "Tell him what you'd tell a friend about him. The thing he did last month that nobody saw, what he's like with your mum, why you'd marry him again. Leave out the card clichés; he's read them." },
        { heading: "When to send it", body: "On your anniversary, his birthday, Father's Day, or the night before something hard for him. A premium template can be scheduled to open at a set time; otherwise send the link from the next room and watch." },
      ],
      faq: [
        { q: "What's a good digital gift for a husband?", a: "Your story, told back to him: a timeline of your years together, a museum of your photos, or a letter in your words. They take ten minutes to make and say more than another gadget." },
        { q: "Is it a good anniversary gift?", a: "It's one of the best ones, because it's made of your own years. Our Timeline and Museum are built for anniversaries, and The Letter is free." },
        freeEn,
      ],
    },
    es: {
      title: "Regalos digitales para tu marido: ideas para cualquier día",
      description: "Ideas de regalos digitales para tu marido: vuestros años juntos en una línea del tiempo, una carta, su canción en vinilo, su portada. En diez minutos, en un enlace.",
      h1: "Regalos digitales para tu marido",
      label: "Para tu marido",
      lead: "Después de unos años juntos lo difícil no es el dinero, sino encontrar algo que no tenga ya. Esto no lo tiene: la historia de los dos, contada con vuestras fotos y tus palabras, esperando en su móvil. Estos son los regalos digitales que funcionan con un marido, y cada uno se hace en unos diez minutos.",
      ideas: [
        { template: "our-timeline", heading: "Vuestros años juntos, en una línea del tiempo", body: "Un camino que se dibuja mientras baja: el día que os conocisteis, el primer piso, la boda, los niños o el perro, con hasta 20 fotos y un vídeo." },
        { template: "the-letter", heading: "Una carta que abre como una de verdad", body: "Un sello de lacre, tus palabras y vuestras fotos, con vuestra canción sonando. Gratis, y el regalo que casi ningún marido recibe: una carta." },
        { template: "vinyl", heading: "Su canción, en vinilo", body: "Baja la aguja sobre la canción de vuestra boda, o la del coche, y aparecen tus fotos y tu mensaje." },
        { template: "front-page", heading: "Sale en portada", body: "Un periódico con tu titular sobre él y las historias que contarías en su fiesta de jubilación. Para su cumpleaños o el Día del Padre." },
        { template: "museum", heading: "Un museo de los dos", body: "Vuestras fotos colgadas en una galería tranquila, con cartelas en la pared y una sala de vídeo. El regalo de aniversario para quien lo tiene todo." },
        { template: "the-toast", heading: "Un brindis, de tu parte", body: "Inclina para servir, golpea para brindar y empieza tu discurso. Para una cena de aniversario a la que no llegas, o a la que sí." },
        { template: "fortune-cookie", heading: "Una galleta de la fortuna con su futuro", body: "La abre y encuentra las fortunas que escribiste, hasta veinte. Promesas, bromas y una sobre el lavavajillas." },
        { template: "pack-your-bags", heading: "Un viaje, revelado", body: "Un panel de salidas que gira hasta el fin de semana que has reservado. La mejor forma de decírselo." },
      ],
      sections: [
        { heading: "Qué escribirle", body: "Cuéntale lo que le contarías de él a una amiga. Lo que hizo el mes pasado y nadie vio, cómo es con tu madre, por qué te volverías a casar con él. Deja fuera los tópicos de tarjeta: ya se los sabe." },
        { heading: "Cuándo enviarlo", body: "En vuestro aniversario, su cumpleaños, el Día del Padre o la noche antes de algo difícil para él. Una plantilla premium se puede programar para que se abra a una hora; si no, envía el enlace desde la habitación de al lado y mira su cara." },
      ],
      faq: [
        { q: "¿Qué regalo digital le hago a mi marido?", a: "Vuestra historia, contada de vuelta: una línea del tiempo de vuestros años juntos, un museo de vuestras fotos o una carta con tus palabras. Se hacen en diez minutos y dicen más que otro aparato." },
        { q: "¿Es un buen regalo de aniversario?", a: "De los mejores, porque está hecho de vuestros propios años. Nuestra línea del tiempo y Museo están pensadas para aniversarios, y La carta es gratis." },
        freeEs,
      ],
    },
  },
  wife: {
    en: {
      title: "Digital Gifts for Your Wife: Ideas She'll Open Again",
      description: "Digital gift ideas for your wife: your story as a timeline, a museum of your photos, a bouquet that never wilts, a letter. Made in ten minutes, sent as a link.",
      h1: "Digital gifts for your wife",
      label: "For your wife",
      lead: "She knows you love her. What she rarely gets is to hear why, in your words, with the photos of the life you've built. These are the digital gifts that work for a wife, made in about ten minutes, sent as a link and still there on your next anniversary.",
      ideas: [
        { template: "our-timeline", heading: "The story of you two, as a timeline", body: "A road that draws itself as she scrolls, from the first date to now, with up to 20 photos and a video." },
        { template: "museum", heading: "A museum of your life together", body: "Your photos in a quiet gallery, each with its own label on the wall. The wedding, the move, the small Sundays." },
        { template: "bouquet", heading: "Her flowers, picked stem by stem", body: "Roses, peonies, tulips or sunflowers in her colours, wrapped, with a card inside. They never wilt." },
        { template: "the-letter", heading: "The letter you've never written her", body: "A wax seal, your words and your photos, with your song. Free. Write what you'd say in the speech you didn't give." },
        { template: "music-box", heading: "A music box with your song", body: "She winds the key and a ballerina turns to your song while your photos appear in the mirror." },
        { template: "keepsake", heading: "A keepsake, sealed in wax", body: "Pressed flowers, a gold locket that opens and a typed letter. For an anniversary, or for when you're away." },
        { template: "garden", heading: "A garden that blooms as she scrolls", body: "Flowers open between your photos, a video and your words. For Mother's Day or your anniversary." },
        { template: "jar-of-reasons", heading: "A jar of reasons", body: "Up to a hundred folded notes on why you'd choose her again, shaken out one at a time." },
      ],
      sections: [
        { heading: "What to write to her", body: "Be specific about the life you share: the way she handled the worst week of last year, what she's like at 7am with the kids, the moment at the wedding nobody else saw. That is the part she'll reread." },
        { heading: "When to send it", body: "On your anniversary, her birthday or Mother's Day, or after a long week for no reason. A premium template can be scheduled to open at a set time, so it can be waiting when she wakes up." },
      ],
      faq: [
        { q: "What's a good digital gift for a wife?", a: "One that tells your story back to her: a timeline, a museum of your photos or a letter in your words. A bouquet or a music box is the one to send when you want it to look as good as it reads." },
        { q: "Can I print something too?", a: "Every gift has a QR code you can print and put in a real card, so she opens it with her phone camera at dinner." },
        freeEn,
      ],
    },
    es: {
      title: "Regalos digitales para tu esposa: ideas que volverá a abrir",
      description: "Ideas de regalos digitales para tu esposa: vuestra historia en una línea del tiempo, un museo de fotos, un ramo que no se marchita, una carta. En un enlace.",
      h1: "Regalos digitales para tu esposa",
      label: "Para tu esposa",
      lead: "Sabe que la quieres. Lo que casi nunca oye es por qué, con tus palabras y con las fotos de la vida que habéis construido. Estos son los regalos digitales que funcionan con una esposa: se hacen en unos diez minutos, se envían en un enlace y siguen ahí en vuestro próximo aniversario.",
      ideas: [
        { template: "our-timeline", heading: "Vuestra historia, en una línea del tiempo", body: "Un camino que se dibuja mientras baja, de la primera cita a hoy, con hasta 20 fotos y un vídeo." },
        { template: "museum", heading: "Un museo de vuestra vida juntos", body: "Vuestras fotos en una galería tranquila, cada una con su cartela en la pared. La boda, la mudanza, los domingos pequeños." },
        { template: "bouquet", heading: "Sus flores, elegidas tallo a tallo", body: "Rosas, peonías, tulipanes o girasoles en sus colores, envueltos, con una tarjeta dentro. Nunca se marchitan." },
        { template: "the-letter", heading: "La carta que nunca le has escrito", body: "Un sello de lacre, tus palabras y vuestras fotos, con vuestra canción. Gratis. Escribe lo que dirías en el discurso que no diste." },
        { template: "music-box", heading: "Una caja de música con vuestra canción", body: "Da cuerda a la llave y una bailarina gira con vuestra canción mientras vuestras fotos aparecen en el espejo." },
        { template: "keepsake", heading: "Un recuerdo sellado con lacre", body: "Flores prensadas, un medallón de oro que se abre y una carta mecanografiada. Para un aniversario, o para cuando estás lejos." },
        { template: "garden", heading: "Un jardín que florece al bajar", body: "Se abren flores entre vuestras fotos, un vídeo y tus palabras. Para el Día de la Madre o vuestro aniversario." },
        { template: "jar-of-reasons", heading: "Un frasco de razones", body: "Hasta cien notas dobladas sobre por qué la volverías a elegir, que salen una a una." },
      ],
      sections: [
        { heading: "Qué escribirle", body: "Sé concreto con la vida que compartís: cómo llevó la peor semana del año pasado, cómo es a las siete de la mañana con los niños, el momento de la boda que nadie más vio. Eso es lo que releerá." },
        { heading: "Cuándo enviarlo", body: "En vuestro aniversario, su cumpleaños o el Día de la Madre, o tras una semana larga sin más motivo. Una plantilla premium se puede programar para que se abra a una hora, así que puede estar esperándola al despertar." },
      ],
      faq: [
        { q: "¿Qué regalo digital le hago a mi esposa?", a: "Uno que le cuente vuestra historia: una línea del tiempo, un museo de vuestras fotos o una carta con tus palabras. Un ramo o una caja de música es lo que mandas cuando quieres que se vea tan bonito como se lee." },
        { q: "¿Puedo imprimir algo también?", a: "Cada regalo tiene un código QR que puedes imprimir y meter en una tarjeta de papel, para que lo abra con la cámara del móvil en la cena." },
        freeEs,
      ],
    },
  },
  "best-friend": {
    en: {
      title: "Digital Gifts for Your Best Friend: Funny & Sweet",
      description: "Digital gift ideas for your best friend: a birthday card crashed by hamsters, a meme card, a scrapbook of your worst photos. Made in ten minutes, sent as a link.",
      h1: "Digital gifts for your best friend",
      label: "For your best friend",
      lead: "Your best friend doesn't need another candle. They need proof you remember the 3am kebab, the holiday that went wrong and every photo they told you to delete. These are the digital gifts that work for a best friend, funny or soft, each made in about ten minutes.",
      ideas: [
        { template: "party-animals", heading: "A birthday card crashed by hamsters", body: "Hamsters in party hats take over a collage of up to 7 photos, and each one yells a line you wrote when tapped." },
        { template: "sticker-bomb", heading: "A meme card they tap to uncover", body: "Every tap slaps a meme sticker on the page; twelve taps uncover what you actually wanted to say." },
        { template: "the-council", heading: "Five cats deliver a verdict", body: "The Council reviews the evidence of your friendship and rules on it. The ruling is final." },
        { template: "digicam", heading: "Your photos on a 2006 digicam", body: "Date-stamped, slightly overexposed and ready to print. For the friend who's been there since the flip-phone years." },
        { template: "photo-booth", heading: "A photo booth strip of you two", body: "Four flashes and a strip of your best worst faces prints, with a message on the back." },
        { template: "scrapbook", heading: "A scrapbook of your friendship", body: "Polaroids, washi tape and a torn note, full of the photos nobody else gets to see." },
        { template: "fortune-cookie", heading: "A fortune cookie with their future", body: "They crack it open to find the fortunes you wrote for them, up to twenty, all suspiciously accurate." },
        { template: "favorite-person", heading: "For your favorite person", body: "A watercolour scrapbook of your photos with pearls and pressed flowers, when you want to say the soft thing for once." },
      ],
      sections: [
        { heading: "What to write to them", body: "The in-jokes, obviously, but also one sentence you've never said: why they're the one you call. Funny on the way in, honest at the end, is the order that works." },
        { heading: "When to send it", body: "On their birthday, on a friendship anniversary, after a breakup, or when they've just got the job. It arrives the second you send it, so it works on the day you remember too." },
      ],
      faq: [
        { q: "What's a good digital gift for a best friend?", a: "Something only you could make: your photos, your in-jokes and a line you mean. Party Animals and Sticker Bomb are for laughing; Favorite Person is for the soft version." },
        { q: "Is it only for couples?", a: "No. Every template works for a friend, a sister or your mum: the words and photos are yours, and nothing in it says it's romantic unless you write it." },
        freeEn,
      ],
    },
    es: {
      title: "Regalos digitales para tu mejor amiga (o amigo)",
      description: "Ideas de regalos digitales para tu mejor amiga: una tarjeta invadida por hámsteres, una de memes, un álbum de vuestras peores fotos. En un enlace.",
      h1: "Regalos digitales para tu mejor amiga",
      label: "Para tu mejor amiga",
      lead: "Tu mejor amiga, o tu mejor amigo, no necesita otra vela. Necesita la prueba de que te acuerdas del kebab de las tres de la mañana, del viaje que salió fatal y de cada foto que te pidió que borraras. Estos son los regalos digitales que funcionan con una amistad, divertidos o tiernos, y cada uno se hace en unos diez minutos.",
      ideas: [
        { template: "party-animals", heading: "Una tarjeta invadida por hámsteres", body: "Hámsteres con gorro de fiesta toman un collage de hasta 7 fotos, y cada uno grita una frase tuya al tocarlo." },
        { template: "sticker-bomb", heading: "Una tarjeta de memes que se destapa", body: "Cada toque pega un sticker de meme en la página; doce toques descubren lo que de verdad querías decir." },
        { template: "the-council", heading: "Cinco gatos dictan sentencia", body: "El Consejo revisa las pruebas de vuestra amistad y se pronuncia. La sentencia es firme." },
        { template: "digicam", heading: "Vuestras fotos en una digicam de 2006", body: "Con fecha, algo quemadas y listas para imprimir. Para la amiga que está ahí desde los móviles con tapa." },
        { template: "photo-booth", heading: "Una tira de fotomatón de las dos", body: "Cuatro flashes y sale una tira con vuestras mejores peores caras, con un mensaje detrás." },
        { template: "scrapbook", heading: "Un álbum de vuestra amistad", body: "Polaroids, cinta washi y una nota rasgada, llena de las fotos que nadie más puede ver." },
        { template: "fortune-cookie", heading: "Una galleta de la fortuna con su futuro", body: "La abre y encuentra las fortunas que escribiste para ella, hasta veinte, todas sospechosamente acertadas." },
        { template: "favorite-person", heading: "Para tu persona favorita", body: "Un álbum en acuarela con vuestras fotos, perlas y flores prensadas, para cuando por una vez quieres decir lo tierno." },
      ],
      sections: [
        { heading: "Qué escribirle", body: "Las bromas internas, claro, pero también una frase que nunca le has dicho: por qué es a quien llamas. Divertido al principio y sincero al final es el orden que funciona." },
        { heading: "Cuándo enviarlo", body: "En su cumpleaños, en el aniversario de vuestra amistad, después de una ruptura o cuando consigue el trabajo. Llega en el segundo en que lo envías, así que sirve también el día en que te acuerdas." },
      ],
      faq: [
        { q: "¿Qué regalo digital le hago a mi mejor amiga?", a: "Algo que solo tú podrías hacer: vuestras fotos, vuestras bromas y una frase que sientas. Fiesta Animal y Bomba de Stickers son para reír; Mi persona favorita, para la versión tierna." },
        { q: "¿Es solo para parejas?", a: "No. Todas las plantillas sirven para una amiga, una hermana o tu madre: las palabras y las fotos son tuyas, y nada dice que sea romántico salvo que lo escribas." },
        freeEs,
      ],
    },
  },
  mom: {
    en: {
      title: "Digital Gifts for Mom: Ideas for Her Birthday",
      description: "Digital gift ideas for your mom: her recipes in a recipe box, a bouquet that never wilts, a jar of reasons, a museum of old photos. Sent as a link she keeps.",
      h1: "Digital gifts for Mom",
      label: "For your mom",
      lead: "Mums keep everything: the drawings, the cards, the bad school photos. Give her one more thing to keep, made from the photos she's in and the words you don't say often enough. These are the digital gifts that work for a mum, each made in about ten minutes and sent as a link she can open again.",
      ideas: [
        { template: "recipe-box", heading: "Her recipes, in a recipe box", body: "The dishes she taught you, card by card, with photos of her kitchen and a note from you. A family keepsake that can't get lost." },
        { template: "bouquet", heading: "A bouquet that never wilts", body: "Her favourite flowers, stem by stem, with a card inside. Send it from anywhere, on the day." },
        { template: "jar-of-reasons", heading: "A jar of reasons she's the best", body: "Folded notes she shakes out one at a time, up to a hundred. Ask your siblings for theirs." },
        { template: "museum", heading: "A museum of old family photos", body: "The scanned prints from the shoebox hung in a quiet gallery, each with a label in your words." },
        { template: "music-box", heading: "A music box with her song", body: "She winds the key and a ballerina turns to the song she always sings along to, with your photos in the mirror." },
        { template: "garden", heading: "A garden that blooms as she scrolls", body: "Flowers open between photos of her, a video and your words. Made for Mother's Day." },
        { template: "popup-card", heading: "A pop-up birthday card", body: "A paper card that opens and a cake stands up out of the fold, with your message and photos inside." },
        { template: "the-letter", heading: "A letter, like the ones she wrote you", body: "A wax seal, your words and your photos, with a song. Free. Thank her for one thing in particular." },
      ],
      sections: [
        { heading: "What to write to her", body: "Thank her for one specific thing: the lift at 2am, the packed lunch with a note, what she said before your exam. Mums keep the specific ones. Add a photo she's never seen, or one she hates; she'll love it anyway." },
        { heading: "When to send it", body: "On her birthday, on Mother's Day, or on the anniversary of something she got you through. A premium template can be scheduled to open in the morning, so it's there with her coffee." },
      ],
      faq: [
        { q: "What's a good digital gift for a mom?", a: "Something that holds the family's own things: her recipes in Recipe Box, old photos in Museum, or a jar of reasons from all of you. A bouquet is the one to send when you can't be there with real flowers." },
        { q: "Will she be able to open it?", a: "Yes. She taps the link in WhatsApp or her email and it opens in her phone's browser, with nothing to install and no account. You can also print the QR code and put it in a card." },
        freeEn,
      ],
    },
    es: {
      title: "Regalos digitales para mamá: ideas para su cumpleaños",
      description: "Ideas de regalos digitales para tu madre: sus recetas en una caja de recetas, un ramo que no se marchita, un frasco de razones, un museo de fotos antiguas.",
      h1: "Regalos digitales para mamá",
      label: "Para tu madre",
      lead: "Las madres lo guardan todo: los dibujos, las tarjetas, las fotos horribles del colegio. Dale una cosa más que guardar, hecha con las fotos en las que sale y las palabras que no le dices lo suficiente. Estos son los regalos digitales que funcionan con una madre: cada uno se hace en unos diez minutos y se envía en un enlace que puede volver a abrir.",
      ideas: [
        { template: "recipe-box", heading: "Sus recetas, en una caja de recetas", body: "Los platos que te enseñó, ficha a ficha, con fotos de su cocina y una nota tuya. Un recuerdo de familia que no se puede perder." },
        { template: "bouquet", heading: "Un ramo que nunca se marchita", body: "Sus flores favoritas, tallo a tallo, con una tarjeta dentro. Envíalo desde donde estés, el mismo día." },
        { template: "jar-of-reasons", heading: "Un frasco de razones por las que es la mejor", body: "Notas dobladas que salen una a una, hasta cien. Pide las suyas a tus hermanos." },
        { template: "museum", heading: "Un museo de fotos de familia", body: "Las fotos escaneadas de la caja de zapatos, colgadas en una galería tranquila, cada una con una cartela con tus palabras." },
        { template: "music-box", heading: "Una caja de música con su canción", body: "Da cuerda a la llave y una bailarina gira con la canción que siempre canta, con vuestras fotos en el espejo." },
        { template: "garden", heading: "Un jardín que florece al bajar", body: "Se abren flores entre fotos suyas, un vídeo y tus palabras. Hecho para el Día de la Madre." },
        { template: "popup-card", heading: "Una tarjeta de cumpleaños pop-up", body: "Una tarjeta de papel que se abre y una tarta que se levanta del pliegue, con tu mensaje y tus fotos dentro." },
        { template: "the-letter", heading: "Una carta, como las que ella te escribía", body: "Un sello de lacre, tus palabras y vuestras fotos, con una canción. Gratis. Dale las gracias por una cosa en concreto." },
      ],
      sections: [
        { heading: "Qué escribirle", body: "Dale las gracias por algo concreto: cuando te fue a buscar a las dos de la mañana, el táper con una nota, lo que te dijo antes de aquel examen. Las madres guardan lo concreto. Añade una foto que no haya visto, o una que odie: le encantará igual." },
        { heading: "Cuándo enviarlo", body: "En su cumpleaños, el Día de la Madre o el aniversario de algo que te ayudó a superar. Una plantilla premium se puede programar para que se abra por la mañana, con su café." },
      ],
      faq: [
        { q: "¿Qué regalo digital le hago a mi madre?", a: "Algo que guarde lo de la familia: sus recetas en Caja de recetas, fotos antiguas en Museo o un frasco de razones de todos. Un ramo es lo que mandas cuando no puedes estar con flores de verdad." },
        { q: "¿Sabrá abrirlo?", a: "Sí. Toca el enlace en WhatsApp o en su correo y se abre en el navegador del móvil, sin instalar nada ni crear una cuenta. También puedes imprimir el código QR y meterlo en una tarjeta." },
        freeEs,
      ],
    },
  },
  dad: {
    en: {
      title: "Digital Gifts for Dad: Ideas for His Birthday",
      description: "Digital gift ideas for your dad: his own newspaper front page, a museum of family photos, his song on vinyl, a timeline of his life. Sent as a link.",
      h1: "Digital gifts for Dad",
      label: "For your dad",
      lead: "Dads say they don't want anything, and then keep the card you made at seven in the glovebox for thirty years. Make him the grown-up version: his story, his photos and the words you don't usually say out loud. These are the digital gifts that work for a dad, each made in about ten minutes.",
      ideas: [
        { template: "front-page", heading: "His own front page", body: "A newspaper with your headline about him, his photos and the stories the family tells. For his birthday or Father's Day." },
        { template: "museum", heading: "A museum of the family", body: "The old prints from the loft hung in a quiet gallery, each with a label in your words, and a video room." },
        { template: "our-timeline", heading: "His life, as a timeline", body: "A road that draws itself as he scrolls: where he grew up, the first car, the day you were born, up to 20 photos and a video." },
        { template: "vinyl", heading: "His song, on vinyl", body: "He drops the needle on the song from the car journeys, and your photos and message play along." },
        { template: "fortune-cookie", heading: "A fortune cookie of dad jokes", body: "He cracks it open to find the fortunes you wrote, up to twenty. Put his own jokes back in there." },
        { template: "jar-of-reasons", heading: "A jar of reasons he's a good dad", body: "Folded notes he shakes out one at a time. Get the whole family to write some." },
        { template: "the-letter", heading: "The letter he'll keep", body: "A wax seal, your words and your photos, with a song. Free. Say the one thing you'd want him to know." },
      ],
      sections: [
        { heading: "What to write to him", body: "Dads remember being thanked for specific things: teaching you to drive, the match he never missed, what he said when it all went wrong. One of those, said plainly, is worth more than a page." },
        { heading: "When to send it", body: "On his birthday, Father's Day, or the day he retires. A premium template can be scheduled to open at a set time; or print the QR code and hide it in his real card." },
      ],
      faq: [
        { q: "What's a good digital gift for a dad?", a: "His own story: a front page about him, a museum of family photos or a timeline of his life. They're made from things only the family has, which is the point." },
        { q: "Will he be able to open it?", a: "Yes. He taps the link in a message or an email and it opens in his browser, with nothing to install and no account. Or print the QR code: his phone camera opens it." },
        freeEn,
      ],
    },
    es: {
      title: "Regalos digitales para papá: ideas para su cumpleaños",
      description: "Ideas de regalos digitales para tu padre: su propia portada de periódico, un museo de fotos de familia, su canción en vinilo, su vida en una línea del tiempo.",
      h1: "Regalos digitales para papá",
      label: "Para tu padre",
      lead: "Los padres dicen que no quieren nada y luego guardan treinta años en la guantera la tarjeta que les hiciste a los siete. Hazle la versión adulta: su historia, sus fotos y las palabras que no sueles decir en voz alta. Estos son los regalos digitales que funcionan con un padre, y cada uno se hace en unos diez minutos.",
      ideas: [
        { template: "front-page", heading: "Su propia portada", body: "Un periódico con tu titular sobre él, sus fotos y las historias que cuenta la familia. Para su cumpleaños o el Día del Padre." },
        { template: "museum", heading: "Un museo de la familia", body: "Las fotos antiguas del trastero colgadas en una galería tranquila, cada una con una cartela con tus palabras, y una sala de vídeo." },
        { template: "our-timeline", heading: "Su vida, en una línea del tiempo", body: "Un camino que se dibuja al bajar: dónde creció, el primer coche, el día que naciste, hasta 20 fotos y un vídeo." },
        { template: "vinyl", heading: "Su canción, en vinilo", body: "Baja la aguja sobre la canción de los viajes en coche, y aparecen tus fotos y tu mensaje." },
        { template: "fortune-cookie", heading: "Una galleta de la fortuna con chistes de padre", body: "La abre y encuentra las fortunas que escribiste, hasta veinte. Devuélvele sus propios chistes." },
        { template: "jar-of-reasons", heading: "Un frasco de razones por las que es buen padre", body: "Notas dobladas que salen una a una. Que escriba algunas toda la familia." },
        { template: "the-letter", heading: "La carta que guardará", body: "Un sello de lacre, tus palabras y vuestras fotos, con una canción. Gratis. Dile lo único que querrías que supiera." },
      ],
      sections: [
        { heading: "Qué escribirle", body: "Los padres recuerdan que les den las gracias por cosas concretas: enseñarte a conducir, el partido al que nunca faltó, lo que dijo cuando todo salió mal. Una de esas, dicha sin adornos, vale más que una página." },
        { heading: "Cuándo enviarlo", body: "En su cumpleaños, el Día del Padre o el día que se jubila. Una plantilla premium se puede programar para que se abra a una hora; o imprime el QR y escóndelo en su tarjeta de papel." },
      ],
      faq: [
        { q: "¿Qué regalo digital le hago a mi padre?", a: "Su propia historia: una portada sobre él, un museo de fotos de familia o una línea del tiempo de su vida. Están hechos de cosas que solo tiene la familia, y esa es la gracia." },
        { q: "¿Sabrá abrirlo?", a: "Sí. Toca el enlace en un mensaje o en un correo y se abre en el navegador, sin instalar nada ni crear una cuenta. O imprime el código QR: lo abre con la cámara del móvil." },
        freeEs,
      ],
    },
  },
};
