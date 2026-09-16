import type { FieldMeta } from "../types";

// Labels and help for this template's fields, in both languages.
export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    year: { label: "The year", help: "Goes on the banner and on the diploma." },
    school: {
      label: "School or course",
      help: "The line under the year. Leave it empty and the banner just says the year.",
    },
    awardedFor: {
      label: "Awarded for",
      help: "The line on the diploma. Not the official wording — what they actually did.",
    },
    tassel: { label: "Tassel", options: { gold: "Gold", crimson: "Crimson", sky: "Sky", white: "White" } },
    gown: { label: "Gown", help: "And the evening behind it.", options: { navy: "Navy", black: "Black" } },
  },
  es: {
    year: { label: "El año", help: "Va en la pancarta y en el diploma." },
    school: {
      label: "Centro o carrera",
      help: "La línea de debajo del año. Si la dejas vacía, la pancarta solo pone el año.",
    },
    awardedFor: {
      label: "Se le concede por",
      help: "La línea del diploma. No lo oficial: lo que de verdad ha hecho.",
    },
    tassel: { label: "Borla", options: { gold: "Dorada", crimson: "Granate", sky: "Azul", white: "Blanca" } },
    gown: { label: "Toga", help: "Y la noche de detrás.", options: { navy: "Azul marino", black: "Negra" } },
  },
};
