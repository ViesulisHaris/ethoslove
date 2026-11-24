import type { GiftLocale } from "@/lib/gift/schema";

/**
 * The one line under a gift's name on its card in the gallery (components/templates/gallery-card.tsx).
 *
 * A gift's tagline (its manifest) was written for two lines on the older, wider card and for the
 * gift's own page. On the gallery's card there is room for about forty characters beside the arrow,
 * and the tagline was cut off with an ellipsis on 59 of 61 cards (the review of 22 Nov 2026). These
 * are the taglines cut to what fits, never a new claim: every line says something its tagline says,
 * so a line is true for as long as the tagline is. Where a tagline already fits, it is the line.
 *
 * Nothing here states a choice the sender makes as what the gift always does: Music Box's figurine
 * and tune are choices (its key and its lid are not), Halfway flies a plane, a balloon or a bird,
 * and Trick or Treat's host is a ghost, a cat or a pumpkin, so those lines name none of them.
 *
 * tests/unit/gallery-lines.test.ts holds the table to the catalogue (a line for every gift, none
 * for a gift that is gone) and to the length; tests/e2e/gallery.spec.ts checks on the page that no
 * card cuts its line at a phone's, a laptop's and a desk's width.
 */
export const GALLERY_LINE_MAX = 42;

export const GALLERY_LINES: Record<string, Record<GiftLocale, string>> = {
  balloons: { en: "Pop a balloon, find a photo.", es: "Explota un globo y sale una foto." },
  "popup-card": { en: "A paper card with a cake in its fold.", es: "Una tarjeta con una tarta en el pliegue." },
  sketchbook: { en: "Doodles that draw themselves.", es: "Garabatos que se dibujan solos." },
  "party-animals": { en: "Hamsters in party hats yell your line.", es: "Hámsters con gorrito gritan tu frase." },
  "the-council": { en: "Five cats stamp a verdict.", es: "Cinco gatos sellan un veredicto." },
  "sticker-bomb": { en: "Twelve taps uncover the card.", es: "Doce toques destapan la tarjeta." },
  coquette: { en: "Pink gingham, real lilies, your song.", es: "Vichy rosa, lirios y vuestra canción." },
  xoxo: { en: "Every tap leaves another kiss.", es: "Cada toque deja otro beso." },
  keepsake: { en: "A wax seal, a locket, a typed letter.", es: "Un lacre, un relicario y una carta." },
  "pack-your-bags": { en: "A surprise trip on a departures board.", es: "Un viaje sorpresa en un panel de salidas." },
  digicam: { en: "Your photos on a little 2006 camera.", es: "Vuestras fotos en una camarita de 2006." },
  "photo-booth": { en: "Four flashes, one strip of you two.", es: "Cuatro flashes y una tira de los dos." },
  picnic: { en: "A basket of lines from you.", es: "Una cesta llena de frases tuyas." },
  "music-box": { en: "Wind the key and the lid opens.", es: "Dale cuerda y la tapa se abre." },
  seance: { en: "A spirit spells out your message.", es: "Un espíritu deletrea tu mensaje." },
  "bat-swarm": { en: "Bats spell their name on the moon.", es: "Murciélagos escriben su nombre en la luna." },
  cauldron: { en: "Three things you love, one potion.", es: "Tres cosas que te encantan, una poción." },
  "jack-o-lantern": { en: "A pumpkin carved with their name.", es: "Una calabaza tallada con su nombre." },
  "haunted-house": { en: "Your photos in the lit windows.", es: "Tus fotos en las ventanas encendidas." },
  "nice-list": { en: "Good deeds, crimes, then a verdict.", es: "Buenas obras, fechorías y cae el sello." },
  unwrapped: { en: "Your year, one present at a time.", es: "Vuestro año, regalo a regalo." },
  wishbone: { en: "The big half gets the wish.", es: "La mitad grande se lleva el deseo." },
  "frosted-window": { en: "Wipe the frost off with a finger.", es: "Limpia la escarcha con el dedo." },
  "light-the-candles": { en: "Five candles, five thank-yous.", es: "Cinco velas, cinco gracias." },
  "string-the-lights": { en: "Hang the lights, throw the switch.", es: "Cuelga las luces y dale al interruptor." },
  "gingerbread-house": { en: "Stick on the sweets, pipe the icing.", es: "Pega los dulces y pon el glaseado." },
  "the-letter": { en: "A wax-sealed envelope, opened by hand.", es: "Un sobre lacrado que se abre a mano." },
  "birthday-cinema": { en: "Curtains, candles, confetti.", es: "Telón, velas, confeti." },
  scrapbook: { en: "Polaroids, washi tape, a torn note.", es: "Polaroids, cinta washi, una nota rasgada." },
  garden: { en: "A garden that blooms as they scroll.", es: "Un jardín que florece mientras bajan." },
  bouquet: { en: "Every stem picked by you.", es: "Cada flor elegida por ti." },
  kawaii: { en: "Bows, blush and a happy plushie.", es: "Lazos, rubor y un peluche contento." },
  fireside: { en: "A candle, a blanket and a letter.", es: "Una vela, una manta y una carta." },
  "trick-or-treat": { en: "Ring the bell. Trick or treat?", es: "Llama al timbre. ¿Truco o trato?" },
  constellations: { en: "Every photo is a star.", es: "Cada foto es una estrella." },
  halfway: { en: "The real distance, crossed on a breath.", es: "La distancia real, cruzada de un soplo." },
  "snow-globe": { en: "Shake it and it snows on you two.", es: "Agítala y nieva sobre vosotros dos." },
  "recipe-box": { en: "Her recipe, card by card.", es: "Su receta, ficha a ficha." },
  "cap-toss": { en: "Cheer, and the cap goes up.", es: "Grita y el birrete sale volando." },
  "paper-crane": { en: "Fold it with me, crease by crease.", es: "Dóblala conmigo, pliegue a pliegue." },
  "jar-of-reasons": { en: "A jar of folded notes.", es: "Un frasco de notas dobladas." },
  "the-toast": { en: "Tilt to pour, knock to clink.", es: "Inclina para servir, golpea para brindar." },
  "spooky-season": { en: "Black cats, pumpkins and your song.", es: "Gatos negros, calabazas y vuestra canción." },
  "dark-romance": { en: "Black roses, red velvet, your song.", es: "Rosas negras y terciopelo rojo." },
  "favorite-person": { en: "Photos, pearls and pressed flowers.", es: "Fotos, perlas y flores prensadas." },
  bloom: { en: "Hold the screen. Watch it open.", es: "Mantén pulsado. Mírala abrirse." },
  "on-repeat": { en: "Your photo as the album cover.", es: "Tu foto como portada del disco." },
  evergreen: { en: "Butterflies out of old newspaper.", es: "Mariposas que salen de un periódico." },
  "be-my-boo": { en: "Pumpkins, bats and a black cat.", es: "Calabazas, murciélagos y un gato negro." },
  "fall-for-you": { en: "Real leaves and their name in blocks.", es: "Hojas de verdad y su nombre en bloques." },
  "autumn-reel": { en: "Your photos on film, pressed leaves.", es: "Fotos en película y hojas prensadas." },
  "scratch-card": { en: "The last card is the big one.", es: "La última tarjeta es la importante." },
  passport: { en: "From your city to theirs, in one flight.", es: "De tu ciudad a la suya, en un solo vuelo." },
  "midnight-countdown": { en: "Dusk to fireworks, timed to the second.", es: "Del atardecer a los fuegos, al segundo." },
  "our-timeline": { en: "A road that draws itself.", es: "Un camino que se dibuja solo." },
  vinyl: { en: "Drop the needle on their song.", es: "Pon la aguja en su canción." },
  museum: { en: "A quiet gallery of the two of you.", es: "Una galería silenciosa de vosotros dos." },
  "front-page": { en: "Breaking news: it’s about them.", es: "Última hora: va sobre ellos." },
  "fortune-cookie": { en: "Crack one open. Suspiciously accurate.", es: "Ábrela. Sospechosamente acertada." },
  "text-thread": { en: "A chat that arrives bubble by bubble.", es: "Una conversación, burbuja a burbuja." },
  arcade: { en: "Catch the hearts, unlock the photos.", es: "Atrapa corazones, desbloquea las fotos." },
};

/** A gift's line for its card; a gift added without one falls back to its tagline (and the unit test fails). */
export function galleryLine(slug: string, tagline: Record<GiftLocale, string>, locale: GiftLocale): string {
  return GALLERY_LINES[slug]?.[locale] ?? tagline[locale];
}
