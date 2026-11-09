import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "nice-list",
  name: { en: "The Nice List", es: "La lista de Papá Noel" },
  tagline: {
    en: "Pull down the scroll. Every good deed and every crime gets a tick, then the verdict is stamped.",
    es: "Desenrolla el pergamino. Cada buena obra y cada fechoría llevan su marca, y luego cae el sello.",
  },
  description: {
    en: "A scroll from the North Pole, tied with a ribbon and tagged with their name. They untie it and pull it down, and as the paper unrolls each line gets ticked in pen: the good deeds in the nice column, the crimes in the naughty one, up to four of each, all written by you. At the bottom a rubber stamp comes down with the verdict: nice, naughty, or naughty and nice. Then your letter, your photos filed as evidence, and your song. Candy red, sugar pink, frost blue or pine green.",
    es: "Un pergamino del Polo Norte, atado con un lazo y con su nombre en la etiqueta. Lo desata, tira hacia abajo y, mientras se desenrolla, cada línea se marca a boli: las buenas obras en una columna y las fechorías en la otra, hasta cuatro de cada, todas escritas por ti. Al final baja un sello con el veredicto: sin carbón, carbón o carbón dulce. Después, tu carta, tus fotos archivadas como pruebas y vuestra canción. Rojo caramelo, rosa azúcar, azul escarcha o verde pino.",
  },
  occasions: ["christmas"],
  styles: ["playful"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 } },
  thumbnail: { poster: "/templates/nice-list/poster.jpg", webm: "/templates/nice-list/preview.webm" },
  defaultAccent: "#D8342C",
  heavy: false,
  sortOrder: 9,
};
