import type { GiftLocale } from "@/lib/gift/schema";

/**
 * How each gift is made, in three steps that are that gift's own (the owner, 21 Nov 2026: "change
 * the ways when to send the gifts, as its kinda weird for letter, they should be good for each
 * gift"). "Add your photos, write what you mean, send the link" was every page's and was wrong for
 * The Letter, whose free version has no photos. So each row says what the sender of that gift
 * really does first and second, taken from the template's own fields (its schema.ts and
 * field-meta.ts), and the last step is always sending it.
 *
 * - `line`: the one line under the section's heading (at most 14 words).
 * - `steps`: three titles of two to four words (five in Spanish, which needs its articles), and
 *   the picture each one shows: a polaroid of the gift's sample photo for a step about photos, a
 *   note with a line in handwriting for a step about words or choices, and for the last a small
 *   phone with the gift's own cover in its screen.
 *
 * tests/unit/template-steps.test.ts holds every registered template to a row and every title to
 * its length.
 */
export type StepPictureKind = "photo" | "note" | "phone";

export type TemplateStep = { picture: StepPictureKind } & Record<GiftLocale, string>;

export type TemplateSteps = { line: Record<GiftLocale, string>; steps: readonly [TemplateStep, TemplateStep, TemplateStep] };

export const TEMPLATE_STEPS: Record<string, TemplateSteps> = {
  arcade: {
    line: { en: "Three steps. They play, and your photos and message are the prizes.", es: "Tres pasos. Juegan, y tus fotos y tu mensaje son el premio." },
    steps: [
      { picture: "photo", en: "Pick the photos", es: "Elige las fotos" },
      { picture: "note", en: "Name the game", es: "Ponle nombre al juego" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "autumn-reel": {
    line: { en: "Three steps. They switch on the light and your photos develop.", es: "Tres pasos. Encienden la luz y tus fotos se revelan." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", en: "Write the ticket", es: "Escribe la entrada" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  balloons: {
    line: { en: "Three steps. Every balloon they pop drops one of your photos.", es: "Tres pasos. Cada globo que explotan suelta una de tus fotos." },
    steps: [
      { picture: "photo", en: "Pick the photos", es: "Elige las fotos" },
      { picture: "note", en: "Write the bunting", es: "Escribe la guirnalda" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "bat-swarm": {
    line: { en: "Three steps. They tap the moon and the bats spell their name.", es: "Tres pasos. Tocan la luna y los murciélagos escriben su nombre." },
    steps: [
      { picture: "note", en: "Write their name", es: "Escribe su nombre" },
      { picture: "note", en: "Add a short line", es: "Añade una frase corta" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "be-my-boo": {
    line: { en: "Three steps. A little ghost says boo, then shows your collage.", es: "Tres pasos. Un fantasmita dice bu y enseña tu collage." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", en: "Write the note", es: "Escribe la nota" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "birthday-cinema": {
    line: { en: "Three steps. The curtains part on their name in lights.", es: "Tres pasos. El telón se abre con su nombre en luces." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", en: "Write the marquee", es: "Escribe la marquesina" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  bloom: {
    line: { en: "Three steps. They hold the screen and the flower opens.", es: "Tres pasos. Mantienen el dedo y la flor se abre." },
    steps: [
      { picture: "note", en: "Choose the flower", es: "Elige la flor" },
      { picture: "note", en: "Write the message", es: "Escribe el mensaje" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  bouquet: {
    line: { en: "Three steps. They watch it come together, one flower at a time.", es: "Tres pasos. Lo ven formarse, flor a flor." },
    steps: [
      { picture: "note", en: "Pick the flowers", es: "Elige las flores" },
      { picture: "note", en: "Write the card", es: "Escribe la tarjeta" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "cap-toss": {
    line: { en: "Three steps. They cheer into the phone and the cap goes up.", es: "Tres pasos. Gritan al móvil y el birrete sale volando." },
    steps: [
      { picture: "note", en: "Write the diploma", es: "Escribe el diploma" },
      { picture: "photo", en: "Add their photos", es: "Añade sus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  cauldron: {
    line: { en: "Three steps. They drop in your three ingredients and it boils over.", es: "Tres pasos. Echan tus tres ingredientes y la poción rebosa." },
    steps: [
      { picture: "note", en: "Name three ingredients", es: "Escribe tres ingredientes" },
      { picture: "note", en: "Label the bottle", es: "Rotula la botella" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  constellations: {
    line: { en: "Three steps. Every photo is a star they fly to.", es: "Tres pasos. Cada foto es una estrella a la que vuelan." },
    steps: [
      { picture: "photo", en: "Pick the photos", es: "Elige las fotos" },
      { picture: "note", en: "Write the last line", es: "Escribe la frase final" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  coquette: {
    line: { en: "Three steps. They untie the bow and your collage unrolls.", es: "Tres pasos. Desatan el lazo y tu collage se despliega." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", en: "Write the postcard", es: "Escribe la postal" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "dark-romance": {
    line: { en: "Three steps. They turn the key and the diary opens.", es: "Tres pasos. Giran la llave y el diario se abre." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", en: "Cut out the letters", es: "Recorta las letras" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  digicam: {
    line: { en: "Three steps. They press power and flick through your photos.", es: "Tres pasos. Pulsan el botón y pasan tus fotos." },
    steps: [
      { picture: "photo", en: "Load the photos", es: "Carga las fotos" },
      { picture: "note", en: "Caption each one", es: "Ponles pie" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  evergreen: {
    line: { en: "Three steps. They unwrap the newspaper and butterflies fly out.", es: "Tres pasos. Desenvuelven el periódico y salen mariposas." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", en: "Write the title", es: "Escribe el título" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "fall-for-you": {
    line: { en: "Three steps. They light the candle and the room warms up.", es: "Tres pasos. Encienden la vela y la habitación se templa." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", en: "Spell their name", es: "Deletrea su nombre" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "favorite-person": {
    line: { en: "Three steps. They lift the tissue paper and find your scrapbook.", es: "Tres pasos. Levantan el papel de seda y encuentran tu álbum." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", en: "Write the torn note", es: "Escribe la nota" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  fireside: {
    line: { en: "Three steps. They light the candle and your letter unfolds.", es: "Tres pasos. Encienden la vela y tu carta se despliega." },
    steps: [
      { picture: "note", en: "Write the letter", es: "Escribe la carta" },
      { picture: "photo", en: "Hang your photos", es: "Cuelga tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "fortune-cookie": {
    line: { en: "Three steps. They crack a cookie and read what you wrote.", es: "Tres pasos. Abren una galleta y leen lo que escribiste." },
    steps: [
      { picture: "note", en: "Write the fortunes", es: "Escribe las fortunas" },
      { picture: "photo", en: "Slip in photos", es: "Mete alguna foto" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "front-page": {
    line: { en: "Three steps. A newspaper about them lands on the doormat.", es: "Tres pasos. Un periódico sobre esa persona cae en el felpudo." },
    steps: [
      { picture: "note", en: "Write the headline", es: "Escribe el titular" },
      { picture: "photo", en: "Add the lead photo", es: "Añade la foto principal" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "frosted-window": {
    line: { en: "Three steps. They wipe the frost away and see your words outside.", es: "Tres pasos. Limpian la escarcha y ven tus palabras fuera." },
    steps: [
      { picture: "note", en: "Write the snowman’s sign", es: "Escribe el cartel" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  garden: {
    line: { en: "Three steps. They push the gate and the garden grows as they scroll.", es: "Tres pasos. Empujan la verja y el jardín crece mientras bajan." },
    steps: [
      { picture: "photo", en: "Pin your photos", es: "Cuelga tus fotos" },
      { picture: "note", en: "Write the gate sign", es: "Escribe el cartel" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "gingerbread-house": {
    line: { en: "Three steps. They decorate the house and the little door opens.", es: "Tres pasos. Decoran la casita y se abre la puertecita." },
    steps: [
      { picture: "note", en: "Write the letter", es: "Escribe la carta" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  halfway: {
    line: { en: "Three steps. They blow a paper plane from your town to theirs.", es: "Tres pasos. Soplan un avión de papel de tu ciudad a la suya." },
    steps: [
      { picture: "note", en: "Set both towns", es: "Pon las dos ciudades" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "haunted-house": {
    line: { en: "Three steps. Every lit window holds a photo, and the door your letter.", es: "Tres pasos. Cada ventana guarda una foto, y la puerta, tu carta." },
    steps: [
      { picture: "photo", en: "Put photos in windows", es: "Pon fotos en las ventanas" },
      { picture: "note", en: "Write the gate tag", es: "Escribe la etiqueta" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "jack-o-lantern": {
    line: { en: "Three steps. The pumpkin carves itself, then they light the candle.", es: "Tres pasos. La calabaza se talla sola y luego encienden la vela." },
    steps: [
      { picture: "note", en: "Choose what’s carved", es: "Elige qué se talla" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "jar-of-reasons": {
    line: { en: "Three steps. They shake the phone and a note tumbles out.", es: "Tres pasos. Agitan el móvil y cae una nota." },
    steps: [
      { picture: "note", en: "Write the reasons", es: "Escribe las razones" },
      { picture: "photo", en: "Add a few photos", es: "Añade algunas fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  kawaii: {
    line: { en: "Three steps. A plushie waves hello and the gift box pops open.", es: "Tres pasos. Un peluche saluda y la caja de regalo se abre." },
    steps: [
      { picture: "note", en: "Write its greeting", es: "Escribe su saludo" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  keepsake: {
    line: { en: "Three steps. They break the seal and go through a box of kept things.", es: "Tres pasos. Rompen el sello y abren una caja de cosas guardadas." },
    steps: [
      { picture: "photo", en: "Choose the photos", es: "Elige las fotos" },
      { picture: "note", en: "Engrave the locket", es: "Graba el relicario" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "light-the-candles": {
    line: { en: "Three steps. They light five candles; each shows one thing you’re thankful for.", es: "Tres pasos. Encienden cinco velas y cada una muestra un motivo." },
    steps: [
      { picture: "note", en: "Write five thanks", es: "Escribe cinco gracias" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "midnight-countdown": {
    line: { en: "Three steps. It counts down to your moment, then fireworks.", es: "Tres pasos. Cuenta hasta tu momento y luego, fuegos artificiales." },
    steps: [
      { picture: "note", en: "Set the moment", es: "Fija el momento" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  museum: {
    line: { en: "Three steps. Each photo hangs framed, with a plaque you write.", es: "Tres pasos. Cada foto cuelga enmarcada, con la placa que escribes." },
    steps: [
      { picture: "photo", en: "Hang the photos", es: "Cuelga las fotos" },
      { picture: "note", en: "Write the plaques", es: "Escribe las placas" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "music-box": {
    line: { en: "Three steps. They wind the key and your photos appear in the mirror.", es: "Tres pasos. Dan cuerda a la llave y tus fotos salen en el espejo." },
    steps: [
      { picture: "photo", en: "Choose the photos", es: "Elige las fotos" },
      { picture: "note", en: "Write the letter", es: "Escribe la carta" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "nice-list": {
    line: { en: "Three steps. They unroll the scroll and the verdict is stamped.", es: "Tres pasos. Desenrollan el pergamino y cae el veredicto." },
    steps: [
      { picture: "note", en: "List the good deeds", es: "Apunta las buenas obras" },
      { picture: "note", en: "List the crimes", es: "Apunta las fechorías" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "on-repeat": {
    line: { en: "Three steps. Your photo is the album cover; they press play.", es: "Tres pasos. Tu foto es la portada, y le dan al play." },
    steps: [
      { picture: "photo", en: "Pick the cover photo", es: "Elige la foto de portada" },
      { picture: "note", en: "Name the playlist", es: "Ponle nombre a la playlist" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "our-timeline": {
    line: { en: "Three steps. A road draws itself; every stop is a photo and a date.", es: "Tres pasos. Un camino se dibuja solo y cada parada es una foto." },
    steps: [
      { picture: "photo", en: "Add the photos", es: "Añade las fotos" },
      { picture: "note", en: "Date each milestone", es: "Fecha cada hito" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "pack-your-bags": {
    line: { en: "Three steps. They pack your clues, then the board spells where you’re going.", es: "Tres pasos. Meten tus pistas y el panel dice adónde vais." },
    steps: [
      { picture: "note", en: "Set the destination", es: "Pon el destino" },
      { picture: "note", en: "Write the clues", es: "Escribe las pistas" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "paper-crane": {
    line: { en: "Three steps. Each fold they hold says one more line of yours.", es: "Tres pasos. Cada pliegue que sujetan dice una frase tuya." },
    steps: [
      { picture: "note", en: "Write the folds", es: "Escribe los pliegues" },
      { picture: "note", en: "Write the last line", es: "Escribe la frase final" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "party-animals": {
    line: { en: "Three steps. Ten animals in party hats yell the lines you wrote.", es: "Tres pasos. Diez animales con gorrito gritan tus frases." },
    steps: [
      { picture: "note", en: "Write the shouts", es: "Escribe los gritos" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  passport: {
    line: { en: "Three steps. A route draws from your city to theirs, a stamp per photo.", es: "Tres pasos. Una ruta de tu ciudad a la suya, un sello por foto." },
    steps: [
      { picture: "note", en: "Set both cities", es: "Pon las dos ciudades" },
      { picture: "photo", en: "Add the photos", es: "Añade las fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "photo-booth": {
    line: { en: "Three steps. Four flashes, and a strip of your photos prints.", es: "Tres pasos. Cuatro flashes y sale una tira con tus fotos." },
    steps: [
      { picture: "photo", en: "Pick your photos", es: "Elige tus fotos" },
      { picture: "note", en: "Write on the wall", es: "Escribe en el muro" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  picnic: {
    line: { en: "Three steps. Each thing they take out of the basket carries your line.", es: "Tres pasos. Cada cosa que sacan de la cesta lleva tu frase." },
    steps: [
      { picture: "note", en: "Write the tags", es: "Escribe las etiquetas" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "popup-card": {
    line: { en: "Three steps. The card opens and a paper cake stands up.", es: "Tres pasos. La tarjeta se abre y se levanta una tarta de papel." },
    steps: [
      { picture: "note", en: "Write the letter", es: "Escribe la carta" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "recipe-box": {
    line: { en: "Three steps. She tilts the phone and pours in what you wrote.", es: "Tres pasos. Inclina el móvil y echa lo que escribiste." },
    steps: [
      { picture: "note", en: "Name the recipe", es: "Ponle nombre a la receta" },
      { picture: "note", en: "Write the ingredients", es: "Escribe los ingredientes" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  scrapbook: {
    line: { en: "Three steps. They open it like a real one and your polaroids develop.", es: "Tres pasos. Lo abren como uno de verdad y tus polaroids se revelan." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", en: "Write the torn note", es: "Escribe la nota rasgada" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "scratch-card": {
    line: { en: "Three steps. They scratch each card; the last one holds the news.", es: "Tres pasos. Rascan cada tarjeta y la última guarda la noticia." },
    steps: [
      { picture: "photo", en: "Choose the photos", es: "Elige las fotos" },
      { picture: "note", en: "Write the last card", es: "Escribe la última tarjeta" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  seance: {
    line: { en: "Three steps. The planchette moves by itself and spells your words.", es: "Tres pasos. La plancheta se mueve sola y deletrea tus palabras." },
    steps: [
      { picture: "note", en: "Choose the words", es: "Elige las palabras" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  sketchbook: {
    line: { en: "Three steps. Every page draws itself in ink as they turn it.", es: "Tres pasos. Cada página se dibuja sola al pasarla." },
    steps: [
      { picture: "photo", en: "Tape in photos", es: "Pega las fotos" },
      { picture: "note", en: "Write the letter", es: "Escribe la carta" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "snow-globe": {
    line: { en: "Three steps. They shake the phone and it snows inside the globe.", es: "Tres pasos. Agitan el móvil y nieva dentro de la bola." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", en: "Engrave the plaque", es: "Graba la placa" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "spooky-season": {
    line: { en: "Three steps. A gust blows the leaves away and your scrapbook is underneath.", es: "Tres pasos. Una ráfaga se lleva las hojas y aparece tu álbum." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", en: "Write the postcard", es: "Escribe la postal" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "sticker-bomb": {
    line: { en: "Three steps. Twelve taps, twelve stickers, and your card opens.", es: "Tres pasos. Doce toques, doce stickers, y tu tarjeta se abre." },
    steps: [
      { picture: "note", en: "Write the labels", es: "Escribe las tiras" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "string-the-lights": {
    line: { en: "Three steps. They hang the lights, throw the switch, and your words come on.", es: "Tres pasos. Cuelgan las luces, dan al interruptor y tus palabras se encienden." },
    steps: [
      { picture: "note", en: "Write the lights", es: "Escribe las luces" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "text-thread": {
    line: { en: "Three steps. Your messages arrive one bubble at a time.", es: "Tres pasos. Tus mensajes llegan burbuja a burbuja." },
    steps: [
      { picture: "note", en: "Write the messages", es: "Escribe los mensajes" },
      { picture: "photo", en: "Attach your photos", es: "Adjunta tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "the-council": {
    line: { en: "Three steps. Five cats read your findings and stamp a verdict.", es: "Tres pasos. Cinco gatos leen tus conclusiones y sellan un veredicto." },
    steps: [
      { picture: "note", en: "Write the charge", es: "Escribe el cargo" },
      { picture: "note", en: "List the findings", es: "Apunta las conclusiones" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "the-letter": {
    line: { en: "Three steps. They break the seal and read it in your handwriting.", es: "Tres pasos. Rompen el sello y la leen con tu letra." },
    steps: [
      { picture: "note", en: "Write the letter", es: "Escribe la carta" },
      { picture: "note", en: "Seal and sign it", es: "Séllala y fírmala" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "the-toast": {
    line: { en: "Three steps. They tilt to pour, knock to clink, and your speech opens.", es: "Tres pasos. Inclinan para servir, golpean para brindar y se abre tu discurso." },
    steps: [
      { picture: "note", en: "Write the speech", es: "Escribe el discurso" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  "trick-or-treat": {
    line: { en: "Three steps. They ring the bell and a small ghost hands it over.", es: "Tres pasos. Llaman al timbre y un fantasmita lo entrega." },
    steps: [
      { picture: "note", en: "Write the door line", es: "Escribe qué dice al abrir" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  unwrapped: {
    line: { en: "Three steps. Each present they tear open holds a number from your year.", es: "Tres pasos. Cada regalo que abren guarda un número de vuestro año." },
    steps: [
      { picture: "note", en: "Write your numbers", es: "Escribe vuestros números" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  vinyl: {
    line: { en: "Three steps. They drop the needle and the record plays their song.", es: "Tres pasos. Ponen la aguja y el disco toca su canción." },
    steps: [
      { picture: "note", en: "Title the album", es: "Titula el disco" },
      { picture: "photo", en: "Add the covers", es: "Añade las portadas" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  wishbone: {
    line: { en: "Three steps. They pull their side, it snaps, and your wish comes out.", es: "Tres pasos. Tiran de su lado, se parte y sale tu deseo." },
    steps: [
      { picture: "note", en: "Write your wish", es: "Escribe tu deseo" },
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
  xoxo: {
    line: { en: "Three steps. They open the envelope and every tap leaves a kiss.", es: "Tres pasos. Abren el sobre y cada toque deja un beso." },
    steps: [
      { picture: "photo", en: "Add your photos", es: "Añade tus fotos" },
      { picture: "note", en: "Write their nickname", es: "Escribe cómo le llamas" },
      { picture: "phone", en: "Send the link", es: "Envía el enlace" },
    ],
  },
};

/** A template's three steps, or null for one added before its row was written (the page then falls back to the shared three). */
export function templateSteps(slug: string): TemplateSteps | null {
  return Object.hasOwn(TEMPLATE_STEPS, slug) ? TEMPLATE_STEPS[slug] : null;
}
