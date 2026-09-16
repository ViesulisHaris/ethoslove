import type { FieldMeta } from "../types";

// Labels and help for this template's fields, in both languages.
export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    scene: {
      label: "Inside the globe",
      help: "The little world the snow falls on.",
      options: { homes: "Your two homes", tree: "A tree and presents", cabin: "A cabin in the woods", village: "A little village" },
    },
    mood: {
      label: "The room",
      help: "Where the globe is standing when they pick it up.",
      options: { lamplit: "Lamplit", midnight: "Midnight", frosted: "Frosted morning" },
    },
    shakes: {
      label: "How many shakes",
      help: "One thing appears in the snow each time it settles. Then the plaque is engraved.",
      options: { two: "Two", three: "Three", four: "Four" },
    },
    plaque: {
      label: "On the brass plaque",
      help: "Engraved at the end. Left empty, it reads the title of your gift.",
    },
    lines: {
      label: "Lines in the snow",
      help: "Short ones. They take turns with your photos, one per shake.",
      addLabel: "Add a line",
      placeholder: "You hang the same crooked star every year.",
    },
  },
  es: {
    scene: {
      label: "Dentro de la bola",
      help: "El mundo pequeñito sobre el que cae la nieve.",
      options: { homes: "Vuestras dos casas", tree: "Un árbol y regalos", cabin: "Una cabaña en el bosque", village: "Un pueblecito" },
    },
    mood: {
      label: "La habitación",
      help: "Dónde está la bola cuando la cogen.",
      options: { lamplit: "A la luz de la lámpara", midnight: "Medianoche", frosted: "Mañana de escarcha" },
    },
    shakes: {
      label: "Cuántas sacudidas",
      help: "Cada vez que la nieve se posa aparece algo dentro. Después se graba la placa.",
      options: { two: "Dos", three: "Tres", four: "Cuatro" },
    },
    plaque: {
      label: "En la placa de latón",
      help: "Se graba al final. Si la dejas vacía, pone el título de tu regalo.",
    },
    lines: {
      label: "Frases en la nieve",
      help: "Cortitas. Se alternan con tus fotos, una por sacudida.",
      addLabel: "Añadir una frase",
      placeholder: "Cada año cuelgas la misma estrella torcida.",
    },
  },
};
