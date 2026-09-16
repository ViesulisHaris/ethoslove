import type { FieldMeta } from "../types";

// Labels and help for this template's fields, in both languages.
export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    opening: {
      label: "How the toast opens",
      help: "The first line, the one everyone goes quiet for. Leave it empty and we'll write it from their name.",
      placeholder: "To Ana and Marco",
    },
    venue: { label: "Where", help: "Printed on the menu card between the glasses.", placeholder: "Quinta da Boa Vista" },
    dateLine: { label: "When", help: "A date, or a season — whatever you'd have printed.", placeholder: "14 June 2025" },
    pour: {
      label: "In the glasses",
      options: { champagne: "Champagne", red: "Red", white: "White", sparkling: "No alcohol" },
    },
    glasses: { label: "The glasses", options: { flute: "Flutes", coupe: "Coupes", wine: "Wine glasses" } },
    light: { label: "The evening", options: { candlelit: "Candlelit", golden: "Golden hour", midnight: "Midnight" } },
  },
  es: {
    opening: {
      label: "Cómo empieza el brindis",
      help: "La primera frase, la que hace callar a todos. Déjala vacía y la escribimos con su nombre.",
      placeholder: "Por Ana y Marco",
    },
    venue: { label: "Dónde", help: "Va impreso en el menú que hay entre las copas.", placeholder: "Quinta da Boa Vista" },
    dateLine: { label: "Cuándo", help: "Una fecha, o una estación: lo que pondrías en el menú.", placeholder: "14 de junio de 2025" },
    pour: {
      label: "En las copas",
      options: { champagne: "Champán", red: "Tinto", white: "Blanco", sparkling: "Sin alcohol" },
    },
    glasses: { label: "Las copas", options: { flute: "Flautas", coupe: "Copas anchas", wine: "Copas de vino" } },
    light: { label: "La noche", options: { candlelit: "A la luz de las velas", golden: "Atardecer", midnight: "Medianoche" } },
  },
};
