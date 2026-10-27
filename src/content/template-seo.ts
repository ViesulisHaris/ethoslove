import type { GiftLocale } from "@/lib/gift/schema";

/**
 * What each template page is found by: the words people type for the thing the template is, in
 * each language. A template's name ("Bouquet", "The Council") is ours; nobody searches for it. They
 * search "digital bouquet maker", "carta de amor digital gratis", "virtual birthday card", and the
 * pages that win those searches (24 Oct 2026) are small one-page sites whose title says exactly
 * that. So each template page leads with the phrase, from Google's own suggestions for it.
 *
 * - `keyword`: the phrase, shown above the template's name in the page's h1.
 * - `title`: the search result's headline, under 60 characters before " · Ethos".
 * - `description`: the snippet under it, under 160 characters, and true of the template: its
 *   photo counts, music and the rest come from its manifest.
 * - `howTo`: the heading over the page's three steps.
 *
 * A template without an entry falls back to "{name}: digital gift template", as before.
 */
export type TemplateSeo = { keyword: string; title: string; description: string; howTo: string };

export const TEMPLATE_SEO: Record<string, Record<GiftLocale, TemplateSeo>> = {
  "the-letter": {
    en: {
      keyword: "Digital love letter",
      title: "Digital Love Letter, Free with Photos and Music",
      description: "Write a digital love letter they open like a real one: a wax seal, your words, your photos and your song, sent as a link. Free, with nothing to install.",
      howTo: "How to send a digital love letter",
    },
    es: {
      keyword: "Carta de amor digital",
      title: "Carta de amor digital gratis, con fotos y música",
      description: "Escribe una carta de amor digital que se abre como una de verdad: sello de lacre, tus palabras, vuestras fotos y vuestra canción, en un enlace. Gratis.",
      howTo: "Cómo enviar una carta de amor digital",
    },
  },
  constellations: {
    en: {
      keyword: "Night sky gift",
      title: "Night Sky Gift: Your Photos as Stars, Free",
      description: "A star map of the two of you: every photo is a star they find by moving the phone, then your song and a message. Free, for anniversaries and long distance.",
      howTo: "How to make a night sky gift",
    },
    es: {
      keyword: "Regalo de cielo estrellado",
      title: "Cielo estrellado de regalo con vuestras fotos, gratis",
      description: "Un mapa de estrellas de los dos: cada foto es una estrella que encuentran moviendo el móvil, y al final vuestra canción y un mensaje. Gratis.",
      howTo: "Cómo hacer un cielo estrellado de regalo",
    },
  },
  "birthday-cinema": {
    en: {
      keyword: "Virtual birthday card",
      title: "Virtual Birthday Card with Candles to Blow Out",
      description: "A birthday card that plays like a film: curtains, their photos and a video, then a cake whose candles they blow out into the phone. Set it to open at midnight.",
      howTo: "How to make a virtual birthday card",
    },
    es: {
      keyword: "Tarjeta de cumpleaños virtual",
      title: "Tarjeta de cumpleaños virtual con velas que se soplan",
      description: "Una tarjeta de cumpleaños como una película: telón, sus fotos y un vídeo, y una tarta cuyas velas se soplan al móvil. Programada para medianoche.",
      howTo: "Cómo hacer una tarjeta de cumpleaños virtual",
    },
  },
  "jar-of-reasons": {
    en: {
      keyword: "Reasons why I love you jar",
      title: "100 Reasons Why I Love You, in a Digital Jar",
      description: "Fill a jar with up to 100 reasons you love them, folded notes they shake out one at a time, with your photos and your song. Made online in minutes.",
      howTo: "How to make a reasons why I love you jar",
    },
    es: {
      keyword: "100 razones por las que te amo",
      title: "100 razones por las que te amo, en un frasco digital",
      description: "Llena un frasco con hasta 100 razones por las que le quieres, notas dobladas que salen al agitar el móvil, con vuestras fotos y vuestra canción.",
      howTo: "Cómo hacer un frasco de razones por las que te amo",
    },
  },
  "scratch-card": {
    en: {
      keyword: "Digital scratch card maker",
      title: "Digital Scratch Card Maker: Scratch to Reveal",
      description: "Make a digital scratch card: they scratch with a finger to reveal your photos and messages, and the last card hides the big one. For proposals, birthdays and news.",
      howTo: "How to make a digital scratch card",
    },
    es: {
      keyword: "Rasca y gana personalizado",
      title: "Rasca y gana digital personalizado, con tus fotos",
      description: "Crea un rasca y gana digital: rascan con el dedo para descubrir tus fotos y mensajes, y la última tarjeta guarda lo más grande. Para pedidas y anuncios.",
      howTo: "Cómo hacer un rasca y gana digital",
    },
  },
  "midnight-countdown": {
    en: {
      keyword: "Midnight countdown gift",
      title: "Midnight Countdown Gift: Fireworks on Their Time",
      description: "A countdown from dusk to fireworks that lands at midnight in their time zone, then shows your photos, your song and your message. For birthdays and long distance.",
      howTo: "How to make a midnight countdown",
    },
    es: {
      keyword: "Cuenta atrás de medianoche",
      title: "Cuenta atrás hasta medianoche, con fuegos artificiales",
      description: "Una cuenta atrás del atardecer a los fuegos artificiales que llega a medianoche en su zona horaria, y después vuestras fotos, la canción y tu mensaje.",
      howTo: "Cómo hacer una cuenta atrás de medianoche",
    },
  },
  "our-timeline": {
    en: {
      keyword: "Relationship timeline",
      title: "Our Story Timeline: A Relationship Timeline Gift",
      description: "Your relationship as a road that draws itself as they scroll: dates, places, up to 20 photos and a video, from the day you met to now. An anniversary gift online.",
      howTo: "How to make a relationship timeline",
    },
    es: {
      keyword: "Línea del tiempo de pareja",
      title: "Nuestra historia: línea del tiempo de pareja online",
      description: "Vuestra relación como un camino que se dibuja al bajar: fechas, lugares, hasta 20 fotos y un vídeo, del día en que os conocisteis a hoy.",
      howTo: "Cómo hacer una línea del tiempo de pareja",
    },
  },
  vinyl: {
    en: {
      keyword: "Song dedication gift",
      title: "Vinyl Record Gift: Dedicate a Song with Photos",
      description: "A vinyl record that spins their song: they drop the needle and your photos and message play along. A song dedication for anniversaries, Valentine's and long distance.",
      howTo: "How to dedicate a song on a vinyl record",
    },
    es: {
      keyword: "Dedicar una canción",
      title: "Regalo de vinilo: dedica una canción con fotos",
      description: "Un vinilo que gira con su canción: bajan la aguja y aparecen tus fotos y tu mensaje. Para dedicar una canción en un aniversario, San Valentín o a distancia.",
      howTo: "Cómo dedicar una canción en un vinilo",
    },
  },
  museum: {
    en: {
      keyword: "Museum of us",
      title: "Museum of Us: A Digital Gallery of Your Photos",
      description: "Hang your photos in a quiet gallery with labels on the wall, a video and your song: the museum of the two of you, made online for an anniversary or a wedding.",
      howTo: "How to make a museum of us",
    },
    es: {
      keyword: "Museo de nosotros",
      title: "Museo de nosotros: galería digital de vuestras fotos",
      description: "Cuelga vuestras fotos en una galería con cartelas, un vídeo y vuestra canción: el museo de los dos, hecho online para un aniversario o una boda.",
      howTo: "Cómo hacer un museo de nosotros",
    },
  },
  "front-page": {
    en: {
      keyword: "Personalized newspaper front page",
      title: "Personalized Newspaper Front Page About Them",
      description: "Put them on the front page: your headline, their photos and the stories only you know, as a newspaper made online. For a birthday, a graduation or Father's Day.",
      howTo: "How to make a personalized front page",
    },
    es: {
      keyword: "Portada de periódico personalizada",
      title: "Portada de periódico personalizada sobre esa persona",
      description: "Ponle en portada: tu titular, sus fotos y las historias que solo tú sabes, en un periódico hecho online. Para un cumpleaños, una graduación o el Día del Padre.",
      howTo: "Cómo hacer una portada de periódico personalizada",
    },
  },
  "fortune-cookie": {
    en: {
      keyword: "Digital fortune cookie",
      title: "Digital Fortune Cookie Maker: Write Their Fortune",
      description: "Make a digital fortune cookie: they tap to crack it open and find the fortunes you wrote, up to 20, with your photos and a song. A small, funny gift for any day.",
      howTo: "How to make a digital fortune cookie",
    },
    es: {
      keyword: "Galleta de la fortuna digital",
      title: "Galleta de la fortuna digital con tus mensajes",
      description: "Crea una galleta de la fortuna digital: la abren con un toque y encuentran las fortunas que escribiste, hasta 20, con tus fotos y una canción.",
      howTo: "Cómo hacer una galleta de la fortuna digital",
    },
  },
  "text-thread": {
    en: {
      keyword: "Love story in text messages",
      title: "Text Message Gift: Your Story in Chat Bubbles",
      description: "Tell it as a text thread that arrives one bubble at a time, with photos and your song. A digital gift for saying sorry, a birthday or a long-distance night.",
      howTo: "How to make a text message gift",
    },
    es: {
      keyword: "Vuestra historia en mensajes",
      title: "Regalo en mensajes de chat, burbuja a burbuja",
      description: "Cuéntalo como una conversación que llega burbuja a burbuja, con fotos y vuestra canción. Un regalo digital para pedir perdón, un cumpleaños o la distancia.",
      howTo: "Cómo hacer un regalo en mensajes de chat",
    },
  },
  arcade: {
    en: {
      keyword: "Personalized arcade game",
      title: "Arcade Game Gift: Catch Hearts, Unlock Photos",
      description: "A little arcade game made for them: catch the hearts to unlock your photos one by one, then read your message. A playful digital gift for a birthday or Valentine's.",
      howTo: "How to make a personalized arcade game",
    },
    es: {
      keyword: "Videojuego personalizado",
      title: "Videojuego personalizado: atrapa corazones y fotos",
      description: "Un pequeño juego arcade hecho para esa persona: atrapa los corazones para desbloquear vuestras fotos una a una y leer tu mensaje.",
      howTo: "Cómo hacer un videojuego personalizado",
    },
  },
  passport: {
    en: {
      keyword: "Long-distance passport gift",
      title: "Long-Distance Gift: A Passport From You to Them",
      description: "A passport that flies from your city to theirs, stamped with your photos and places, and lands on your message. A digital gift for a long-distance relationship.",
      howTo: "How to make a long-distance passport",
    },
    es: {
      keyword: "Regalo para relación a distancia",
      title: "Pasaporte de regalo para una relación a distancia",
      description: "Un pasaporte que vuela de tu ciudad a la suya, sellado con vuestras fotos y lugares, hasta llegar a tu mensaje. Un regalo digital para una relación a distancia.",
      howTo: "Cómo hacer un pasaporte de regalo a distancia",
    },
  },
  bloom: {
    en: {
      keyword: "Digital flower",
      title: "Digital Flower That Blooms with Your Message",
      description: "They hold the screen and a flower opens petal by petal to show your photos and message. A digital flower for Valentine's, Mother's Day or an apology.",
      howTo: "How to send a digital flower",
    },
    es: {
      keyword: "Flor digital",
      title: "Flor digital que se abre con tu mensaje",
      description: "Mantienen pulsada la pantalla y una flor se abre pétalo a pétalo para mostrar tus fotos y tu mensaje. Para San Valentín, el Día de la Madre o pedir perdón.",
      howTo: "Cómo enviar una flor digital",
    },
  },
  bouquet: {
    en: {
      keyword: "Digital bouquet maker",
      title: "Digital Bouquet Maker: Virtual Flowers with a Note",
      description: "Build a digital bouquet stem by stem: roses, peonies, tulips or sunflowers in your colours, wrapped, with a card inside for your message. Flowers that never wilt.",
      howTo: "How to make a digital bouquet",
    },
    es: {
      keyword: "Ramo de flores virtual",
      title: "Ramo de flores virtual con tarjeta: créalo y envíalo",
      description: "Crea un ramo de flores virtual tallo a tallo: rosas, peonías, tulipanes o girasoles, también flores amarillas, con una tarjeta dentro para tu mensaje.",
      howTo: "Cómo hacer un ramo de flores virtual",
    },
  },
  kawaii: {
    en: {
      keyword: "Cute digital card",
      title: "Kawaii Gift: A Cute Digital Card with a Plushie",
      description: "Bows, blush and a plushie who's happy to see them, holding your photos, your message and a song. A cute digital card for a birthday, Valentine's or just because.",
      howTo: "How to make a cute kawaii card",
    },
    es: {
      keyword: "Tarjeta kawaii",
      title: "Tarjeta kawaii digital con un peluche y tus fotos",
      description: "Lazos, rubor y un peluche que se alegra de verle, con tus fotos, tu mensaje y una canción. Una tarjeta digital tierna para un cumpleaños o San Valentín.",
      howTo: "Cómo hacer una tarjeta kawaii",
    },
  },
  fireside: {
    en: {
      keyword: "Digital Christmas letter",
      title: "Fireside: A Cosy Digital Christmas Letter",
      description: "A candle, a blanket and a letter by the window, with your photos and a song: a warm digital Christmas gift for someone you won't see this year.",
      howTo: "How to send a Christmas letter by the fire",
    },
    es: {
      keyword: "Carta de Navidad digital",
      title: "Carta de Navidad digital junto al fuego",
      description: "Una vela, una manta y una carta junto a la ventana, con tus fotos y una canción: un regalo de Navidad digital para quien no verás estas fiestas.",
      howTo: "Cómo enviar una carta de Navidad junto al fuego",
    },
  },
  "trick-or-treat": {
    en: {
      keyword: "Digital Halloween gift",
      title: "Trick or Treat: A Halloween Gift They Open Online",
      description: "They ring the doorbell and a small ghost answers with your photos, your message and a song. A digital Halloween gift you can send tonight.",
      howTo: "How to send a trick-or-treat gift",
    },
    es: {
      keyword: "Regalo de Halloween digital",
      title: "Truco o trato: un regalo de Halloween online",
      description: "Llaman al timbre y un pequeño fantasma abre con vuestras fotos, tu mensaje y una canción. Un regalo de Halloween digital que puedes enviar esta noche.",
      howTo: "Cómo enviar un truco o trato",
    },
  },
  scrapbook: {
    en: {
      keyword: "Digital scrapbook",
      title: "Digital Scrapbook for Couples, Made Online",
      description: "Polaroids, washi tape and a torn note, with your photos and your song: a digital scrapbook for your boyfriend, girlfriend or best friend, sent as a link.",
      howTo: "How to make a digital scrapbook",
    },
    es: {
      keyword: "Álbum de recortes digital",
      title: "Álbum de recortes digital para parejas, online",
      description: "Polaroids, cinta washi y una nota rasgada, con vuestras fotos y vuestra canción: un scrapbook digital para tu pareja o tu mejor amiga, en un enlace.",
      howTo: "Cómo hacer un álbum de recortes digital",
    },
  },
  halfway: {
    en: {
      keyword: "Long-distance relationship gift",
      title: "Halfway: A Long-Distance Gift That Flies to Them",
      description: "Blow a paper plane from your door to theirs across the map, and it lands on your photos and message. A digital gift for the miles between you.",
      howTo: "How to send a paper plane halfway",
    },
    es: {
      keyword: "Regalo a distancia",
      title: "A medio camino: un regalo a distancia que vuela",
      description: "Sopla un avión de papel de tu puerta a la suya sobre el mapa, y aterriza en vuestras fotos y tu mensaje. Un regalo digital para los kilómetros que os separan.",
      howTo: "Cómo enviar un avión de papel a medio camino",
    },
  },
  garden: {
    en: {
      keyword: "Digital garden gift",
      title: "Digital Garden Gift: Flowers That Bloom on Scroll",
      description: "A garden that blooms as they scroll, with your photos, a video and your words between the flowers. A digital gift for an anniversary, Valentine's or Mother's Day.",
      howTo: "How to grow a digital garden gift",
    },
    es: {
      keyword: "Jardín digital de regalo",
      title: "Jardín digital de regalo: florece al bajar",
      description: "Un jardín que florece al bajar, con tus fotos, un vídeo y tus palabras entre las flores. Un regalo digital para un aniversario o el Día de la Madre.",
      howTo: "Cómo hacer un jardín digital de regalo",
    },
  },
  "snow-globe": {
    en: {
      keyword: "Digital snow globe",
      title: "Digital Snow Globe with Your Photos Inside",
      description: "They shake it and it snows on the two of you: your photos inside a snow globe, with your message and a song. A digital Christmas gift that never melts.",
      howTo: "How to make a digital snow globe",
    },
    es: {
      keyword: "Bola de nieve digital",
      title: "Bola de nieve digital con vuestras fotos dentro",
      description: "La agitan y nieva sobre los dos: vuestras fotos dentro de una bola de nieve, con tu mensaje y una canción. Un regalo de Navidad digital que no se derrite.",
      howTo: "Cómo hacer una bola de nieve digital",
    },
  },
  "recipe-box": {
    en: {
      keyword: "Family recipe gift",
      title: "Recipe Box: Her Recipes as a Digital Gift",
      description: "Her recipes, card by card, in a recipe box with your photos and a note: a digital keepsake for Mother's Day, her birthday or a family cookbook.",
      howTo: "How to make a family recipe box",
    },
    es: {
      keyword: "Recetario familiar de regalo",
      title: "Caja de recetas: su recetario como regalo digital",
      description: "Sus recetas, ficha a ficha, en una caja de recetas con vuestras fotos y una nota: un recuerdo digital para el Día de la Madre o su cumpleaños.",
      howTo: "Cómo hacer una caja de recetas familiar",
    },
  },
  "cap-toss": {
    en: {
      keyword: "Digital graduation card",
      title: "Digital Graduation Card: Cheer to Toss the Cap",
      description: "They cheer into the phone and the cap flies up, then their photos and your message. A digital graduation card to send on the big day.",
      howTo: "How to make a digital graduation card",
    },
    es: {
      keyword: "Tarjeta de graduación digital",
      title: "Tarjeta de graduación digital: grita y vuela el birrete",
      description: "Gritan al móvil y el birrete sale volando, y luego sus fotos y tu mensaje. Una tarjeta de graduación digital para enviar el gran día.",
      howTo: "Cómo hacer una tarjeta de graduación digital",
    },
  },
  "paper-crane": {
    en: {
      keyword: "Paper crane message",
      title: "Paper Crane: A Folded Note to Say Sorry",
      description: "Fold a paper crane together, one crease at a time, and the last fold opens on your message and photos. A gentle digital gift for an apology or a hard week.",
      howTo: "How to fold a paper crane message",
    },
    es: {
      keyword: "Grulla de papel con mensaje",
      title: "Grulla de papel: una nota doblada para pedir perdón",
      description: "Doblad juntos una grulla de papel, pliegue a pliegue, y el último pliegue abre tu mensaje y tus fotos. Un regalo digital para pedir perdón.",
      howTo: "Cómo doblar una grulla de papel con mensaje",
    },
  },
  "the-toast": {
    en: {
      keyword: "Wedding toast gift",
      title: "The Toast: A Digital Wedding Toast to Clink",
      description: "Tilt to pour, knock to clink, and your speech begins with your photos and a song: a digital toast for a wedding, an anniversary or Valentine's.",
      howTo: "How to make a digital toast",
    },
    es: {
      keyword: "Brindis de boda digital",
      title: "El brindis: un brindis de boda digital",
      description: "Inclina para servir, golpea para brindar y empieza tu discurso con vuestras fotos y una canción: un brindis digital para una boda o un aniversario.",
      howTo: "Cómo hacer un brindis digital",
    },
  },
  balloons: {
    en: {
      keyword: "Virtual birthday balloons",
      title: "Virtual Birthday Balloons: Pop One, See a Photo",
      description: "A room full of balloons to pop, each one hiding a photo, and your message at the end. Virtual birthday balloons you send as a link.",
      howTo: "How to send virtual balloons",
    },
    es: {
      keyword: "Globos virtuales de cumpleaños",
      title: "Globos virtuales de cumpleaños: explota y mira",
      description: "Una habitación llena de globos que explotar, cada uno con una foto, y tu mensaje al final. Globos virtuales de cumpleaños que se envían en un enlace.",
      howTo: "Cómo enviar globos virtuales",
    },
  },
  "popup-card": {
    en: {
      keyword: "Digital pop-up card",
      title: "Digital Pop-Up Card: A Cake Stands Up as It Opens",
      description: "A paper card that opens and a cake stands up out of the fold, with your photos and message inside. A digital pop-up birthday card, made online.",
      howTo: "How to make a digital pop-up card",
    },
    es: {
      keyword: "Tarjeta pop-up digital",
      title: "Tarjeta pop-up digital: la tarta sale al abrirla",
      description: "Una tarjeta de papel que se abre y una tarta que se levanta del pliegue, con tus fotos y tu mensaje dentro. Una tarjeta pop-up de cumpleaños online.",
      howTo: "Cómo hacer una tarjeta pop-up digital",
    },
  },
  sketchbook: {
    en: {
      keyword: "Doodle sketchbook gift",
      title: "Sketchbook Gift: Doodles That Draw Themselves",
      description: "A notebook whose doodles draw themselves page by page around your photos and words. A hand-drawn digital gift for a birthday or just because.",
      howTo: "How to make a sketchbook gift",
    },
    es: {
      keyword: "Cuaderno de dibujos de regalo",
      title: "Cuaderno de regalo: dibujos que se dibujan solos",
      description: "Un cuaderno cuyos dibujos se trazan solos página a página alrededor de tus fotos y tus palabras. Un regalo digital dibujado a mano.",
      howTo: "Cómo hacer un cuaderno de dibujos de regalo",
    },
  },
  "party-animals": {
    en: {
      keyword: "Funny birthday card",
      title: "Funny Birthday Card: Hamsters in Party Hats",
      description: "A birthday collage crashed by hamsters in party hats: tap one and it yells your line. A funny digital birthday card with up to 7 photos.",
      howTo: "How to make a funny birthday card",
    },
    es: {
      keyword: "Tarjeta de cumpleaños divertida",
      title: "Tarjeta de cumpleaños divertida con hámsteres",
      description: "Un collage de cumpleaños invadido por hámsteres con gorro de fiesta: tocas uno y grita tu frase. Una tarjeta de cumpleaños divertida, con hasta 7 fotos.",
      howTo: "Cómo hacer una tarjeta de cumpleaños divertida",
    },
  },
  "the-council": {
    en: {
      keyword: "Funny cat gift",
      title: "The Council: Five Cats Judge Your Case",
      description: "Five cats review the evidence, read out your case and stamp a verdict. A funny digital gift for an anniversary, a birthday or a cat person.",
      howTo: "How to put your case to the council of cats",
    },
    es: {
      keyword: "Regalo divertido de gatos",
      title: "El Consejo: cinco gatos juzgan tu caso",
      description: "Cinco gatos revisan las pruebas, leen tu caso y sellan un veredicto. Un regalo digital divertido para un aniversario, un cumpleaños o alguien muy gatuno.",
      howTo: "Cómo presentar tu caso al consejo de gatos",
    },
  },
  "sticker-bomb": {
    en: {
      keyword: "Meme card",
      title: "Sticker Bomb: A Meme Card They Tap to Uncover",
      description: "Every tap slaps a meme sticker on the page, and twelve taps uncover your card. A funny digital card for a birthday, a sorry or no reason.",
      howTo: "How to make a sticker bomb card",
    },
    es: {
      keyword: "Tarjeta de memes",
      title: "Bomba de stickers: una tarjeta de memes",
      description: "Cada toque pega un sticker de meme en la página, y doce toques descubren tu tarjeta. Una tarjeta digital divertida para un cumpleaños o pedir perdón.",
      howTo: "Cómo hacer una tarjeta de stickers",
    },
  },
  coquette: {
    en: {
      keyword: "Coquette aesthetic gift",
      title: "Coquette Gift: Pink Bow and Polaroid Collage",
      description: "Untie the bow: a pink gingham collage of real lilies, polaroids of you two and your song. A coquette aesthetic digital gift for her.",
      howTo: "How to make a coquette gift",
    },
    es: {
      keyword: "Regalo estética coquette",
      title: "Regalo coquette: lazo rosa y collage de polaroids",
      description: "Desata el lazo: un collage de vichy rosa con lirios de verdad, polaroids de los dos y vuestra canción. Un regalo digital de estética coquette.",
      howTo: "Cómo hacer un regalo coquette",
    },
  },
  xoxo: {
    en: {
      keyword: "XOXO love card",
      title: "XOXO: A Love Card Sealed with Lipstick Kisses",
      description: "Lipstick prints, polaroids of the two of you and your song, and every tap leaves another kiss. A digital love card sealed with a kiss.",
      howTo: "How to make an XOXO love card",
    },
    es: {
      keyword: "Tarjeta de amor XOXO",
      title: "XOXO: una tarjeta de amor sellada con besos",
      description: "Marcas de pintalabios, polaroids de los dos y vuestra canción, y cada toque deja otro beso. Una tarjeta de amor digital sellada con un beso.",
      howTo: "Cómo hacer una tarjeta XOXO",
    },
  },
  keepsake: {
    en: {
      keyword: "Digital keepsake",
      title: "Digital Keepsake: Wax Seal, Locket and Letter",
      description: "Break the wax seal: pressed flowers, a gold locket that opens, your photos and a typed letter. A digital keepsake for an anniversary or someone far away.",
      howTo: "How to make a digital keepsake",
    },
    es: {
      keyword: "Recuerdo digital",
      title: "Recuerdo digital: lacre, medallón y una carta",
      description: "Rompe el lacre: flores prensadas, un medallón de oro que se abre, vuestras fotos y una carta mecanografiada. Un recuerdo digital para un aniversario.",
      howTo: "Cómo hacer un recuerdo digital",
    },
  },
  "pack-your-bags": {
    en: {
      keyword: "Surprise trip reveal",
      title: "Surprise Trip Reveal on a Departures Board",
      description: "Tell them where you're going on an airport departures board that flips to your destination, with your photos and a song. A surprise trip reveal they'll replay.",
      howTo: "How to reveal a surprise trip",
    },
    es: {
      keyword: "Revelar un viaje sorpresa",
      title: "Revela un viaje sorpresa en un panel de salidas",
      description: "Cuéntale adónde vais en un panel de salidas de aeropuerto que gira hasta tu destino, con vuestras fotos y una canción. Una sorpresa que querrá repetir.",
      howTo: "Cómo revelar un viaje sorpresa",
    },
  },
  digicam: {
    en: {
      keyword: "Digicam photo gift",
      title: "Digicam Gift: Your Photos on a 2006 Camera",
      description: "Press power: your photos on a little 2006 digital camera, date-stamped and ready to print, with your message and a song. A nostalgic digital gift.",
      howTo: "How to make a digicam gift",
    },
    es: {
      keyword: "Regalo de cámara digital retro",
      title: "Digicam: vuestras fotos en una cámara de 2006",
      description: "Pulsa encender: vuestras fotos en una pequeña cámara digital de 2006, con fecha y listas para imprimir, con tu mensaje y una canción.",
      howTo: "Cómo hacer un regalo digicam",
    },
  },
  "photo-booth": {
    en: {
      keyword: "Photo booth strip gift",
      title: "Photo Booth Strip of the Two of You, Online",
      description: "Pull the curtain, press the button: four flashes, and a photo booth strip of the two of you prints, with your message and a song.",
      howTo: "How to make a photo booth strip",
    },
    es: {
      keyword: "Tira de fotomatón",
      title: "Tira de fotomatón de los dos, online",
      description: "Corre la cortina, pulsa el botón: cuatro flashes y sale una tira de fotomatón de los dos, con tu mensaje y una canción.",
      howTo: "Cómo hacer una tira de fotomatón",
    },
  },
  picnic: {
    en: {
      keyword: "Picnic love notes",
      title: "Picnic Gift: A Basket Full of Love Notes",
      description: "A basket on a gingham blanket: every thing they take out carries a line from you, with your photos and a song. A sweet digital date gift.",
      howTo: "How to pack a picnic of love notes",
    },
    es: {
      keyword: "Pícnic con notas de amor",
      title: "Pícnic de regalo: una cesta de notas de amor",
      description: "Una cesta sobre un mantel de cuadros: cada cosa que sacan lleva una frase tuya, con vuestras fotos y una canción. Un regalo digital muy dulce.",
      howTo: "Cómo preparar un pícnic de notas de amor",
    },
  },
  "music-box": {
    en: {
      keyword: "Virtual music box",
      title: "Virtual Music Box with Your Song and Photos",
      description: "Wind the key: the lid opens, a ballerina turns to the tune and your photos appear in the mirror. A virtual music box for an anniversary or Mother's Day.",
      howTo: "How to make a virtual music box",
    },
    es: {
      keyword: "Caja de música virtual",
      title: "Caja de música virtual con vuestra canción",
      description: "Da cuerda: se abre la tapa, una bailarina gira con la melodía y vuestras fotos aparecen en el espejo. Una caja de música virtual de regalo.",
      howTo: "Cómo hacer una caja de música virtual",
    },
  },
  "spooky-season": {
    en: {
      keyword: "Spooky season gift",
      title: "Spooky Season Gift: A Cosy Halloween Collage",
      description: "Blow the leaves away: a cosy Halloween collage of black cats, pumpkins, film and your photos, with your song. A spooky season gift for your person.",
      howTo: "How to make a spooky season collage",
    },
    es: {
      keyword: "Regalo spooky season",
      title: "Regalo spooky season: collage de Halloween",
      description: "Sopla las hojas: un collage de Halloween con gatos negros, calabazas, carrete y vuestras fotos, con vuestra canción. Un regalo spooky season.",
      howTo: "Cómo hacer un collage spooky season",
    },
  },
  "dark-romance": {
    en: {
      keyword: "Dark romance gift",
      title: "Dark Romance Gift: A Gothic Love Collage",
      description: "Turn the key: a gothic love collage of black roses, red velvet and your photos, with your song. A dark romance digital gift for Halloween or an anniversary.",
      howTo: "How to make a dark romance collage",
    },
    es: {
      keyword: "Regalo dark romance",
      title: "Regalo dark romance: un collage de amor gótico",
      description: "Gira la llave: un collage de amor gótico con rosas negras, terciopelo rojo y vuestras fotos, con vuestra canción. Para Halloween o un aniversario.",
      howTo: "Cómo hacer un collage dark romance",
    },
  },
  "favorite-person": {
    en: {
      keyword: "Favorite person gift",
      title: "Favorite Person Gift: A Watercolour Scrapbook",
      description: "Lift the tissue paper: a watercolour scrapbook of your photos, pearls and pressed flowers, for your favorite person. A digital gift for no reason at all.",
      howTo: "How to make a gift for your favorite person",
    },
    es: {
      keyword: "Regalo para mi persona favorita",
      title: "Para mi persona favorita: un álbum en acuarela",
      description: "Levanta el papel de seda: un álbum en acuarela con vuestras fotos, perlas y flores prensadas, para tu persona favorita. Un regalo sin motivo.",
      howTo: "Cómo hacer un regalo para tu persona favorita",
    },
  },
  "on-repeat": {
    en: {
      keyword: "Playlist gift",
      title: "Playlist Gift: Your Photo as the Album Cover",
      description: "Press play: your photo as the album cover, a pink sunset and a playlist of the two of you. A playlist gift for your boyfriend or girlfriend.",
      howTo: "How to make a playlist gift",
    },
    es: {
      keyword: "Regalo de playlist",
      title: "Regalo de playlist: vuestra foto como portada",
      description: "Dale al play: vuestra foto como portada del disco, un atardecer rosa y una playlist de los dos. Un regalo de playlist para tu pareja.",
      howTo: "Cómo hacer un regalo de playlist",
    },
  },
  evergreen: {
    en: {
      keyword: "Vintage collage gift",
      title: "Evergreen: A Vintage Collage Gift with Your Photos",
      description: "Unwrap the newspaper and butterflies fly out of a sage collage of old print, a record and your photos. A vintage digital gift for an anniversary.",
      howTo: "How to make a vintage collage gift",
    },
    es: {
      keyword: "Collage vintage de regalo",
      title: "Siempreverde: un collage vintage con tus fotos",
      description: "Desenvuelve el periódico y salen mariposas de un collage salvia de papel antiguo, un disco y vuestras fotos. Un regalo digital vintage.",
      howTo: "Cómo hacer un collage vintage de regalo",
    },
  },
  "be-my-boo": {
    en: {
      keyword: "Be my boo card",
      title: "Be My Boo: A Cute Halloween Card with Photos",
      description: "Tap the ghost: a cute Halloween collage of your photos, pumpkins, bats and a black cat, with your message. Ask them to be your boo.",
      howTo: "How to make a be my boo card",
    },
    es: {
      keyword: "Tarjeta be my boo",
      title: "Be My Boo: tarjeta de Halloween con tus fotos",
      description: "Toca el fantasma: un collage de Halloween con vuestras fotos, calabazas, murciélagos y un gato negro, con tu mensaje. Pídele que sea tu boo.",
      howTo: "Cómo hacer una tarjeta be my boo",
    },
  },
  "fall-for-you": {
    en: {
      keyword: "Autumn love gift",
      title: "Fall for You: A Cosy Autumn Love Collage",
      description: "Light the candle: a gingham collage of your photos, real leaves and their name in letter blocks, with your song. An autumn gift for the one you fell for.",
      howTo: "How to make a fall for you collage",
    },
    es: {
      keyword: "Regalo de amor de otoño",
      title: "Otoño contigo: un collage de amor de otoño",
      description: "Enciende la vela: un collage de vichy con vuestras fotos, hojas de verdad y su nombre en bloques de letras, con vuestra canción.",
      howTo: "Cómo hacer un collage de otoño contigo",
    },
  },
  "autumn-reel": {
    en: {
      keyword: "Vintage film photo gift",
      title: "Autumn Reel: Your Photos on Vintage Film",
      description: "Develop the film: your photos on a vintage reel, an old book page with your names and pressed leaves, with your song. An autumn digital gift.",
      howTo: "How to develop an autumn reel",
    },
    es: {
      keyword: "Fotos en carrete vintage",
      title: "Carrete de otoño: vuestras fotos en película",
      description: "Revela el carrete: vuestras fotos en película antigua, una página de libro con vuestros nombres y hojas prensadas, con vuestra canción.",
      howTo: "Cómo revelar un carrete de otoño",
    },
  },
  seance: {
    en: {
      keyword: "Ouija message",
      title: "The Séance: A Spirit Spells Out Your Message",
      description: "Touch the planchette and a spirit spells out your message on the board, one letter at a time. A spooky Halloween gift with your photos.",
      howTo: "How to hold a séance for them",
    },
    es: {
      keyword: "Mensaje de ouija",
      title: "La sesión espiritista: un espíritu deletrea tu mensaje",
      description: "Toca la plancheta y un espíritu deletrea tu mensaje en el tablero, letra a letra. Un regalo de Halloween con vuestras fotos.",
      howTo: "Cómo hacer una sesión espiritista de regalo",
    },
  },
  "bat-swarm": {
    en: {
      keyword: "Halloween name reveal",
      title: "Bat Swarm: Bats Spell Their Name on the Moon",
      description: "Tap the moon and a swarm of bats spells out their name across it, then your photos and message. A Halloween gift that flies in.",
      howTo: "How to send a bat swarm",
    },
    es: {
      keyword: "Su nombre en Halloween",
      title: "Bandada de murciélagos: su nombre en la luna",
      description: "Toca la luna y una bandada de murciélagos escribe su nombre en ella, y luego tus fotos y tu mensaje. Un regalo de Halloween que llega volando.",
      howTo: "Cómo enviar una bandada de murciélagos",
    },
  },
  cauldron: {
    en: {
      keyword: "Halloween love potion",
      title: "Witch's Brew: A Halloween Love Potion Gift",
      description: "Drop three things you love into the cauldron and the potion does the rest, with your photos and message. A playful Halloween gift for two.",
      howTo: "How to brew a Halloween love potion",
    },
    es: {
      keyword: "Poción de amor de Halloween",
      title: "La poción de la bruja: un filtro de amor de Halloween",
      description: "Echa tres cosas que te encantan al caldero y la poción hace el resto, con tus fotos y tu mensaje. Un regalo de Halloween divertido para dos.",
      howTo: "Cómo preparar una poción de amor de Halloween",
    },
  },
  "jack-o-lantern": {
    en: {
      keyword: "Pumpkin with their name",
      title: "Jack-o'-Lantern Carved with Their Name",
      description: "Watch a pumpkin get carved with their name, then light the candle to see your photos and message. A digital jack-o'-lantern for Halloween.",
      howTo: "How to carve their name in a pumpkin",
    },
    es: {
      keyword: "Calabaza con su nombre",
      title: "Calabaza de Halloween tallada con su nombre",
      description: "Mira cómo se talla una calabaza con su nombre y enciende la vela para ver tus fotos y tu mensaje. Una calabaza de Halloween digital.",
      howTo: "Cómo tallar su nombre en una calabaza",
    },
  },
  "haunted-house": {
    en: {
      keyword: "Haunted house gift",
      title: "Haunted House: A Spooky Gift with Your Photos",
      description: "Open the gate in the storm: every lit window holds a photo, and the door holds your letter. A haunted house Halloween gift they explore.",
      howTo: "How to build a haunted house gift",
    },
    es: {
      keyword: "Casa encantada de regalo",
      title: "La casa encantada: un regalo de Halloween con fotos",
      description: "Abre la verja en plena tormenta: cada ventana encendida guarda una foto y la puerta guarda tu carta. Una casa encantada para Halloween.",
      howTo: "Cómo hacer una casa encantada de regalo",
    },
  },
};

export function templateSeo(slug: string, locale: GiftLocale): TemplateSeo | null {
  return TEMPLATE_SEO[slug]?.[locale] ?? null;
}
