import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    from: { label: "Your town or city", help: "Start typing and pick it from the list: anywhere in the world." },
    to: { label: "Their town or city" },
    stops: {
      label: "Where you've met in the middle",
      help: "Optional, in order. They add to the distance and go on the postcard.",
      addLabel: "Add a place",
    },
    distanceKm: {
      label: "Distance",
      help: "Worked out from the places. Type your own number if you count it differently, like the drive.",
    },
    vehicle: {
      label: "What flies",
      options: { plane: "Paper plane", balloon: "Balloon", bird: "Little bird" },
    },
    yourIsland: { label: "Your island", options: { pink: "Pink", peach: "Peach", mint: "Mint", lilac: "Lilac" } },
    theirIsland: { label: "Their island", options: { pink: "Pink", peach: "Peach", mint: "Mint", lilac: "Lilac" } },
    palette: {
      label: "Background",
      options: { blush: "Blush", sea: "Sea glass", butter: "Butter", dusk: "Night flight" },
    },
    halfwayNote: {
      label: "A line for halfway",
      help: "Pops up when it passes the middle.",
    },
  },
  es: {
    from: { label: "Tu pueblo o ciudad", help: "Empieza a escribir y elígelo de la lista: cualquier sitio del mundo." },
    to: { label: "Su pueblo o ciudad" },
    stops: {
      label: "Dónde os habéis visto a medio camino",
      help: "Opcional, en orden. Suman a la distancia y van en la postal.",
      addLabel: "Añadir un sitio",
    },
    distanceKm: {
      label: "Distancia",
      help: "Se calcula con los sitios. Escribe tu propio número si la cuentas de otra forma, como en coche.",
    },
    vehicle: {
      label: "Qué vuela",
      options: { plane: "Avión de papel", balloon: "Globo", bird: "Pajarito" },
    },
    yourIsland: { label: "Tu isla", options: { pink: "Rosa", peach: "Melocotón", mint: "Menta", lilac: "Lila" } },
    theirIsland: { label: "Su isla", options: { pink: "Rosa", peach: "Melocotón", mint: "Menta", lilac: "Lila" } },
    palette: {
      label: "Fondo",
      options: { blush: "Rosa", sea: "Verde agua", butter: "Mantequilla", dusk: "Vuelo nocturno" },
    },
    halfwayNote: {
      label: "Una frase para la mitad",
      help: "Aparece cuando pasa por el medio.",
    },
  },
};
