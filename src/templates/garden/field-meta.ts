import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    garden: {
      label: "The garden",
      help: "The light they walk in, from the gate to the greenhouse.",
      options: { blush: "Blush, at midday", wild: "Wild meadow", dusk: "Golden hour", moonlit: "Moonlit" },
    },
    blooms: {
      label: "What's growing",
      help: "Fills every bed they pass, and the bouquet at the end.",
      options: { wildflowers: "Wildflowers", roses: "Roses", peonies: "Peonies", sunflowers: "Sunflowers" },
    },
    companion: {
      label: "Who comes along",
      help: "Follows them down the whole page.",
      options: { butterfly: "A butterfly", bee: "A bee", cat: "A cat", none: "Nobody" },
    },
    sign: { label: "The sign on the gate", help: "Burnt into the wood. Leave it empty for their name." },
    tag: { label: "The tag on the bouquet", help: "The last thing they read. Leave it empty for “For” and their name." },
  },
  es: {
    garden: {
      label: "El jardín",
      help: "La luz en la que caminan, desde la verja hasta el invernadero.",
      options: { blush: "Rosado, a mediodía", wild: "Prado silvestre", dusk: "Hora dorada", moonlit: "A la luz de la luna" },
    },
    blooms: {
      label: "Lo que crece",
      help: "Llena cada cantero que pasan, y el ramo del final.",
      options: { wildflowers: "Flores silvestres", roses: "Rosas", peonies: "Peonías", sunflowers: "Girasoles" },
    },
    companion: {
      label: "Quién les acompaña",
      help: "Les sigue por toda la página.",
      options: { butterfly: "Una mariposa", bee: "Una abeja", cat: "Un gato", none: "Nadie" },
    },
    sign: { label: "El cartel de la verja", help: "Grabado en la madera. Déjalo vacío para su nombre." },
    tag: { label: "La etiqueta del ramo", help: "Lo último que leen. Déjalo vacío para «Para» y su nombre." },
  },
};
