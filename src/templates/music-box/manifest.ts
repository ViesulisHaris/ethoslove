import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "music-box",
  name: { en: "Music Box", es: "Caja de música" },
  tagline: {
    en: "Wind the key. The lid opens, a ballerina turns to the tune and your photos appear in its mirror.",
    es: "Dale cuerda a la llave. La tapa se abre, una bailarina gira con la melodía y vuestras fotos aparecen en su espejo.",
  },
  description: {
    en: "A lacquered music box on a lace-covered vanity, with their name on the gold plate. They wind the key three turns, the ratchet clicking under their thumb, and the lid opens: a porcelain ballerina, or two swans who meet as a heart, turns on the velvet while the box plays Swan Lake, Brahms' Lullaby or Für Elise, note by note. Your photos come up one at a time in the oval mirror inside the lid, a new one with every turn, and a tap on the mirror shows it close. As the spring runs down the tune slows, and a folded letter lifts out of the velvet: your words under a wax seal, then all the photos. Blush, ivory, lilac or sage.",
    es: "Una caja de música lacada sobre un tocador con tapete de encaje, con su nombre en la placa dorada. Le da tres vueltas a la llave, con el trinquete sonando bajo el dedo, y la tapa se abre: una bailarina de porcelana, o dos cisnes que se encuentran formando un corazón, gira sobre el terciopelo mientras la caja toca El lago de los cisnes, la Canción de cuna de Brahms o Para Elisa, nota a nota. Vuestras fotos aparecen una a una en el espejo ovalado de la tapa, una nueva con cada vuelta, y con un toque en el espejo la ve de cerca. Cuando se acaba la cuerda la melodía va más despacio y del terciopelo sale una carta doblada: tus palabras bajo un sello de lacre y, después, todas las fotos. Rosa, marfil, lila o salvia.",
  },
  occasions: ["anniversary", "mothers-day", "valentines", "wedding"],
  styles: ["romantic", "retro"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 8 } },
  thumbnail: { poster: "/templates/music-box/poster.jpg", webm: "/templates/music-box/preview.webm" },
  defaultAccent: "#C0506E",
  heavy: false,
  sortOrder: 9,
};
