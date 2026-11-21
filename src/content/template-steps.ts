import type { GiftLocale } from "@/lib/gift/schema";

/**
 * How each gift is made, in three steps that are that gift's own (the owner, 21 Nov 2026: "change
 * the ways when to send the gifts, as its kinda weird for letter, they should be good for each
 * gift"). "Add your photos, write what you mean, send the link" was every page's and was wrong for
 * The Letter, whose free version has no photos. So each row says what the sender of that gift
 * really does first and second, taken from the template's own fields (its schema.ts and
 * field-meta.ts), and the last step is always sending it.
 *
 * - `line`: what the recipient does, in one line of at most 12 words.
 * - `steps`: three titles of two to four words (five in Spanish, which needs its articles), and
 *   the picture each one shows: a polaroid of the gift's sample photo for a step about photos, a
 *   note with a line in handwriting for a step about words or choices, and for the last a small
 *   phone with the gift's own cover in its screen.
 * - `quote`, on a note step: the field the step is about, so its card shows a real value of that
 *   field and not just any line of the gift (components/templates/page/quote.ts).
 * - `sample`, on a note step, in the language that needs it: a short line for that field, written
 *   for the card, where neither the gift's lines to borrow nor its demo have one of thirty
 *   characters or fewer there. Without it the card borrowed a line from another field: "Write the
 *   fortunes" showed the lucky numbers, and the Spanish "List the good deeds" a photo's caption
 *   about a crime (the deep test of 21 Nov 2026). Each is cut from that gift's own longer line for
 *   the field, and only where one is needed: tests/unit/template-page-sections.test.ts fails a
 *   sample the field no longer needs.
 *
 * A row's `line` says what the person who gets the gift does. It was the line under "How to send"
 * and opened "Three steps." on all 61 pages (the review of 21 Nov 2026); the numbered cards say
 * that, so it is now the first of the three checks of "The experience", beside the gift's picture.
 *
 * tests/unit/template-steps.test.ts holds every registered template to a row and every title to
 * its length.
 */
export type StepPictureKind = "photo" | "note" | "phone";

export type TemplateStep = { picture: StepPictureKind; quote?: string | readonly string[]; sample?: Partial<Record<GiftLocale, string>> } & Record<GiftLocale, string>;

export type TemplateSteps = { line: Record<GiftLocale, string>; steps: readonly [TemplateStep, TemplateStep, TemplateStep] };

export const TEMPLATE_STEPS: Record<string, TemplateSteps> = {
  arcade: {
    line: { en: "They play, and your photos and message are the prizes.", es: "Juegan, y tus fotos y tu mensaje son el premio." },
    steps: [
      { picture: "photo", en: "Pick the photos", es: "Elige las fotos" },
      { picture: "note", quote: "fields.title", en: "Name the game", es: "Ponle nombre al juego" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "autumn-reel": {
    line: { en: "They switch on the light and your photos develop.", es: "Encienden la luz y tus fotos se revelan." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", quote: "fields.ticket", en: "Write the ticket", es: "Escribe la entrada" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  balloons: {
    line: { en: "Every balloon they pop drops one of your photos.", es: "Cada globo que explotan suelta una de tus fotos." },
    steps: [
      { picture: "photo", en: "Pick the photos", es: "Elige las fotos" },
      { picture: "note", quote: "fields.banner", en: "Write the bunting", es: "Escribe la guirnalda" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "bat-swarm": {
    line: { en: "They tap the moon and the bats spell their name.", es: "Tocan la luna y los murciélagos escriben su nombre." },
    steps: [
      { picture: "note", quote: "recipientName", en: "Write their name", es: "Escribe su nombre" },
      { picture: "note", quote: "fields.line", en: "Add a short line", es: "Añade una frase corta" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "be-my-boo": {
    line: { en: "A little ghost says boo, then shows your collage.", es: "Un fantasmita dice bu y enseña tu collage." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", quote: ["fields.note","fields.sign"], en: "Write the note", es: "Escribe la nota" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "birthday-cinema": {
    line: { en: "The curtains part on their name in lights.", es: "El telón se abre con su nombre en luces." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", quote: "fields.marquee", en: "Write the marquee", es: "Escribe la marquesina" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  bloom: {
    line: { en: "They hold the screen and the flower opens.", es: "Mantienen el dedo y la flor se abre." },
    steps: [
      { picture: "note", quote: "fields.flower", en: "Choose the flower", es: "Elige la flor" },
      { picture: "note", quote: "message", en: "Write the message", es: "Escribe el mensaje" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  bouquet: {
    line: { en: "They watch it come together, one flower at a time.", es: "Lo ven formarse, flor a flor." },
    steps: [
      { picture: "note", quote: "fields.stems", sample: { en: "Peonies, roses, eucalyptus", es: "Peonías, rosas, eucalipto" }, en: "Pick the flowers", es: "Elige las flores" },
      { picture: "note", quote: "fields.cardNote", en: "Write the card", es: "Escribe la tarjeta" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "cap-toss": {
    line: { en: "They cheer into the phone and the cap goes up.", es: "Gritan al móvil y el birrete sale volando." },
    steps: [
      { picture: "note", quote: ["fields.awardedFor","fields.school"], sample: { es: "Biología Marina · 2027" }, en: "Write the diploma", es: "Escribe el diploma" },
      { picture: "photo", en: "Add their photos", es: "Añade sus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  cauldron: {
    line: { en: "They drop in your three ingredients and it boils over.", es: "Echan tus tres ingredientes y la poción rebosa." },
    steps: [
      { picture: "note", quote: "fields.ingredients", en: "Name three ingredients", es: "Escribe tres ingredientes" },
      { picture: "note", quote: "fields.potion", en: "Label the bottle", es: "Rotula la botella" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  constellations: {
    line: { en: "Every photo is a star they fly to.", es: "Cada foto es una estrella a la que vuelan." },
    steps: [
      { picture: "photo", en: "Pick the photos", es: "Elige las fotos" },
      { picture: "note", quote: "fields.finalLine", en: "Write the last line", es: "Escribe la frase final" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  coquette: {
    line: { en: "They untie the bow and your collage unrolls.", es: "Desatan el lazo y tu collage se despliega." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", quote: ["fields.note","fields.label"], en: "Write the postcard", es: "Escribe la postal" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "dark-romance": {
    line: { en: "They turn the key and the diary opens.", es: "Giran la llave y el diario se abre." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", quote: "fields.headline", en: "Cut out the letters", es: "Recorta las letras" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  digicam: {
    line: { en: "They press power and flick through your photos.", es: "Pulsan el botón y pasan tus fotos." },
    steps: [
      { picture: "photo", en: "Load the photos", es: "Carga las fotos" },
      { picture: "note", quote: "caption", en: "Caption each one", es: "Ponles pie" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  evergreen: {
    line: { en: "They unwrap the newspaper and butterflies fly out.", es: "Desenvuelven el periódico y salen mariposas." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", quote: "fields.title", en: "Write the title", es: "Escribe el título" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "fall-for-you": {
    line: { en: "They light the candle and the room warms up.", es: "Encienden la vela y la habitación se templa." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", quote: ["fields.blocks","recipientName"], en: "Spell their name", es: "Deletrea su nombre" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "favorite-person": {
    line: { en: "They lift the tissue paper and find your scrapbook.", es: "Levantan el papel de seda y encuentran tu álbum." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", quote: "fields.title", en: "Write the torn note", es: "Escribe la nota" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  fireside: {
    line: { en: "They light the candle and your letter unfolds.", es: "Encienden la vela y tu carta se despliega." },
    steps: [
      { picture: "note", quote: "message", en: "Write the letter", es: "Escribe la carta" },
      { picture: "photo", en: "Hang your photos", es: "Cuelga tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "fortune-cookie": {
    line: { en: "They crack a cookie and read what you wrote.", es: "Abren una galleta y leen lo que escribiste." },
    steps: [
      { picture: "note", quote: "fields.fortunes", sample: { en: "You know more than you think." }, en: "Write the fortunes", es: "Escribe las fortunas" },
      { picture: "photo", en: "Slip in photos", es: "Mete alguna foto" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "front-page": {
    line: { en: "A newspaper about them lands on the doormat.", es: "Un periódico sobre esa persona cae en el felpudo." },
    steps: [
      { picture: "note", quote: "fields.headline", sample: { en: "LOCAL WOMAN TURNS 30", es: "CUMPLE 30: EL BARRIO REACCIONA" }, en: "Write the headline", es: "Escribe el titular" },
      { picture: "photo", en: "Add the lead photo", es: "Añade la foto principal" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "frosted-window": {
    line: { en: "They wipe the frost away and see your words outside.", es: "Limpian la escarcha y ven tus palabras fuera." },
    steps: [
      { picture: "note", quote: "fields.sign", en: "Write the snowman’s sign", es: "Escribe el cartel" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  garden: {
    line: { en: "They push the gate and the garden grows as they scroll.", es: "Empujan la verja y el jardín crece mientras bajan." },
    steps: [
      { picture: "photo", en: "Pin your photos", es: "Cuelga tus fotos" },
      { picture: "note", quote: "fields.sign", en: "Write the gate sign", es: "Escribe el cartel" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "gingerbread-house": {
    line: { en: "They decorate the house and the little door opens.", es: "Decoran la casita y se abre la puertecita." },
    steps: [
      { picture: "note", quote: "message", sample: { es: "Tú decoras. Yo llevo glaseado." }, en: "Write the letter", es: "Escribe la carta" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  halfway: {
    line: { en: "They blow a paper plane from your town to theirs.", es: "Soplan un avión de papel de tu ciudad a la suya." },
    steps: [
      { picture: "note", quote: "fields.from+fields.to", en: "Set both towns", es: "Pon las dos ciudades" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "haunted-house": {
    line: { en: "Your photos wait behind lit windows, and your letter behind the door.", es: "Tus fotos esperan tras ventanas encendidas, y tu carta tras la puerta." },
    steps: [
      { picture: "photo", en: "Put photos in windows", es: "Pon fotos en las ventanas" },
      { picture: "note", quote: "fields.tag", en: "Write the gate tag", es: "Escribe la etiqueta" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "jack-o-lantern": {
    line: { en: "The pumpkin carves itself, then they light the candle.", es: "La calabaza se talla sola y luego encienden la vela." },
    steps: [
      { picture: "note", quote: "fields.carving", en: "Choose what’s carved", es: "Elige qué se talla" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "jar-of-reasons": {
    line: { en: "They shake the phone and a note tumbles out.", es: "Agitan el móvil y cae una nota." },
    steps: [
      { picture: "note", quote: ["fields.reasons","fields.label"], en: "Write the reasons", es: "Escribe las razones" },
      { picture: "photo", en: "Add a few photos", es: "Añade algunas fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  kawaii: {
    line: { en: "A plushie waves hello and the gift box pops open.", es: "Un peluche saluda y la caja de regalo se abre." },
    steps: [
      { picture: "note", quote: "fields.greeting", en: "Write its greeting", es: "Escribe su saludo" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  keepsake: {
    line: { en: "They break the seal and go through a box of kept things.", es: "Rompen el sello y abren una caja de cosas guardadas." },
    steps: [
      { picture: "photo", en: "Choose the photos", es: "Elige las fotos" },
      { picture: "note", quote: "fields.engraving", en: "Engrave the locket", es: "Graba el relicario" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "light-the-candles": {
    line: { en: "They light five candles; each shows one thing you’re thankful for.", es: "Encienden cinco velas y cada una muestra un motivo." },
    steps: [
      { picture: "note", quote: "fields.thanks", en: "Write five thanks", es: "Escribe cinco gracias" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "midnight-countdown": {
    line: { en: "It counts down to your moment, then fireworks.", es: "Cuenta hasta tu momento y luego, fuegos artificiales." },
    steps: [
      { picture: "note", quote: ["fields.headline","fields.zeroLine"], en: "Set the moment", es: "Fija el momento" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  museum: {
    line: { en: "Each photo hangs framed, with a plaque you write.", es: "Cada foto cuelga enmarcada, con la placa que escribes." },
    steps: [
      { picture: "photo", en: "Hang the photos", es: "Cuelga las fotos" },
      { picture: "note", quote: "caption", en: "Write the plaques", es: "Escribe las placas" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "music-box": {
    line: { en: "They wind the key and your photos appear in the mirror.", es: "Dan cuerda a la llave y tus fotos salen en el espejo." },
    steps: [
      { picture: "photo", en: "Choose the photos", es: "Elige las fotos" },
      { picture: "note", quote: "message", en: "Write the letter", es: "Escribe la carta" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "nice-list": {
    line: { en: "They unroll the scroll and the verdict is stamped.", es: "Desenrollan el pergamino y cae el veredicto." },
    steps: [
      { picture: "note", quote: "fields.nice", sample: { es: "compartió la última galleta" }, en: "List the good deeds", es: "Apunta las buenas obras" },
      { picture: "note", quote: "fields.naughty", en: "List the crimes", es: "Apunta las fechorías" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "on-repeat": {
    line: { en: "Your photo is the album cover; they press play.", es: "Tu foto es la portada, y le dan al play." },
    steps: [
      { picture: "photo", en: "Pick the cover photo", es: "Elige la foto de portada" },
      { picture: "note", quote: "fields.playlist", en: "Name the playlist", es: "Ponle nombre a la playlist" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "our-timeline": {
    line: { en: "A road draws itself; every stop is a photo and a date.", es: "Un camino se dibuja solo y cada parada es una foto." },
    steps: [
      { picture: "photo", en: "Add the photos", es: "Añade las fotos" },
      { picture: "note", quote: "fields.dates", en: "Date each milestone", es: "Fecha cada hito" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "pack-your-bags": {
    line: { en: "They pack your clues, then the board spells where you’re going.", es: "Meten tus pistas y el panel dice adónde vais." },
    steps: [
      { picture: "note", quote: "fields.toCity", en: "Set the destination", es: "Pon el destino" },
      { picture: "note", quote: "fields.clues", en: "Write the clues", es: "Escribe las pistas" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "paper-crane": {
    line: { en: "Each fold they hold says one more line of yours.", es: "Cada pliegue que sujetan dice una frase tuya." },
    steps: [
      { picture: "note", quote: "fields.lines", en: "Write the folds", es: "Escribe los pliegues" },
      { picture: "note", quote: "fields.closing", en: "Write the last line", es: "Escribe la frase final" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "party-animals": {
    line: { en: "Ten animals in party hats yell the lines you wrote.", es: "Diez animales con gorrito gritan tus frases." },
    steps: [
      { picture: "note", quote: "fields.shouts", en: "Write the shouts", es: "Escribe los gritos" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  passport: {
    line: { en: "A route draws from your city to theirs, a stamp per photo.", es: "Una ruta de tu ciudad a la suya, un sello por foto." },
    steps: [
      { picture: "note", quote: "fields.fromCity+fields.toCity", en: "Set both cities", es: "Pon las dos ciudades" },
      { picture: "photo", en: "Add the photos", es: "Añade las fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "photo-booth": {
    line: { en: "Four flashes, and a strip of your photos prints.", es: "Cuatro flashes y sale una tira con tus fotos." },
    steps: [
      { picture: "photo", en: "Pick your photos", es: "Elige tus fotos" },
      { picture: "note", quote: "fields.line", en: "Write on the wall", es: "Escribe en el muro" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  picnic: {
    line: { en: "Each thing they take out of the basket carries your line.", es: "Cada cosa que sacan de la cesta lleva tu frase." },
    steps: [
      { picture: "note", quote: "fields.labels", en: "Write the tags", es: "Escribe las etiquetas" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "popup-card": {
    line: { en: "The card opens and a paper cake stands up.", es: "La tarjeta se abre y se levanta una tarta de papel." },
    steps: [
      { picture: "note", quote: "message", sample: { es: "Tarde, pero con velas." }, en: "Write the letter", es: "Escribe la carta" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "recipe-box": {
    line: { en: "She tilts the phone and pours in what you wrote.", es: "Inclina el móvil y echa lo que escribiste." },
    steps: [
      { picture: "note", quote: "fields.recipeName", en: "Name the recipe", es: "Ponle nombre a la receta" },
      { picture: "note", quote: "fields.ingredients", en: "Write the ingredients", es: "Escribe los ingredientes" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  scrapbook: {
    line: { en: "They open it like a real one and your polaroids develop.", es: "Lo abren como uno de verdad y tus polaroids se revelan." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", quote: "fields.quote", en: "Write the torn note", es: "Escribe la nota rasgada" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "scratch-card": {
    line: { en: "They scratch each card; the last one holds the news.", es: "Rascan cada tarjeta y la última guarda la noticia." },
    steps: [
      { picture: "photo", en: "Choose the photos", es: "Elige las fotos" },
      { picture: "note", quote: "fields.finalTitle", en: "Write the last card", es: "Escribe la última tarjeta" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  seance: {
    line: { en: "The planchette moves by itself and spells your words.", es: "La plancheta se mueve sola y deletrea tus palabras." },
    steps: [
      { picture: "note", quote: "fields.spell", en: "Choose the words", es: "Elige las palabras" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  sketchbook: {
    line: { en: "Every page draws itself in ink as they turn it.", es: "Cada página se dibuja sola al pasarla." },
    steps: [
      { picture: "photo", en: "Tape in photos", es: "Pega las fotos" },
      { picture: "note", quote: "message", sample: { es: "No sé dibujar. Pedí ayuda." }, en: "Write the letter", es: "Escribe la carta" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "snow-globe": {
    line: { en: "They shake the phone and it snows inside the globe.", es: "Agitan el móvil y nieva dentro de la bola." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", quote: "fields.plaque", en: "Engrave the plaque", es: "Graba la placa" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "spooky-season": {
    line: { en: "A gust blows the leaves away and your scrapbook is underneath.", es: "Una ráfaga se lleva las hojas y aparece tu álbum." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", quote: ["fields.note","fields.label"], en: "Write the postcard", es: "Escribe la postal" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "sticker-bomb": {
    line: { en: "Twelve taps, twelve stickers, and your card opens.", es: "Doce toques, doce stickers, y tu tarjeta se abre." },
    steps: [
      { picture: "note", quote: "fields.labels", en: "Write the labels", es: "Escribe las tiras" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "string-the-lights": {
    line: { en: "They hang the lights, throw the switch, and your words come on.", es: "Cuelgan las luces, dan al interruptor y tus palabras se encienden." },
    steps: [
      { picture: "note", quote: "fields.sign", en: "Write the lights", es: "Escribe las luces" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "text-thread": {
    line: { en: "Your messages arrive one bubble at a time.", es: "Tus mensajes llegan burbuja a burbuja." },
    steps: [
      { picture: "note", quote: "fields.lines", en: "Write the messages", es: "Escribe los mensajes" },
      { picture: "photo", en: "Attach your photos", es: "Adjunta tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "the-council": {
    line: { en: "Five cats read your findings and stamp a verdict.", es: "Cinco gatos leen tus conclusiones y sellan un veredicto." },
    steps: [
      { picture: "note", quote: "fields.charge", en: "Write the charge", es: "Escribe el cargo" },
      { picture: "note", quote: "fields.findings", sample: { en: "a hall sock, since March" }, en: "List the findings", es: "Apunta las conclusiones" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "the-letter": {
    line: { en: "They break the seal and your words write themselves by hand.", es: "Rompen el sello y tus palabras se escriben a mano." },
    steps: [
      { picture: "note", quote: "fields.greeting", sample: { en: "To my umbrella thief,", es: "A quien se llevó mi paraguas:" }, en: "Write the letter", es: "Escribe la carta" },
      { picture: "note", quote: "fields.signOff", en: "Seal and sign it", es: "Séllala y fírmala" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "the-toast": {
    line: { en: "They tilt to pour, knock to clink, and your speech opens.", es: "Inclinan para servir, golpean para brindar y se abre tu discurso." },
    steps: [
      { picture: "note", quote: "fields.opening", en: "Write the speech", es: "Escribe el discurso" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "trick-or-treat": {
    line: { en: "They ring the bell and a small ghost hands it over.", es: "Llaman al timbre y un fantasmita lo entrega." },
    steps: [
      { picture: "note", quote: "fields.doorLine", en: "Write the door line", es: "Escribe qué dice al abrir" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  unwrapped: {
    line: { en: "Each present they tear open holds a number from your year.", es: "Cada regalo que abren guarda un número de vuestro año." },
    steps: [
      { picture: "note", quote: "fields.stats", en: "Write your numbers", es: "Escribe vuestros números" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  vinyl: {
    line: { en: "They drop the needle and the record plays their song.", es: "Ponen la aguja y el disco toca su canción." },
    steps: [
      { picture: "note", quote: "fields.album", en: "Title the album", es: "Titula el disco" },
      { picture: "photo", en: "Add the covers", es: "Añade las portadas" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  wishbone: {
    line: { en: "They pull their side, it snaps, and your wish comes out.", es: "Tiran de su lado, se parte y sale tu deseo." },
    steps: [
      { picture: "note", quote: "fields.wish", en: "Write your wish", es: "Escribe tu deseo" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  xoxo: {
    line: { en: "They open the envelope and every tap leaves a kiss.", es: "Abren el sobre y cada toque deja un beso." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", quote: "fields.headline", en: "Write their nickname", es: "Escribe cómo le llamas" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
};

/** A template's three steps, or null for one added before its row was written (the page then falls back to the shared three). */
export function templateSteps(slug: string): TemplateSteps | null {
  return Object.hasOwn(TEMPLATE_STEPS, slug) ? TEMPLATE_STEPS[slug] : null;
}
