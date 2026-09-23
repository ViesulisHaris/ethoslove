import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    fromCity: {
      label: "Your city",
      help: "Any major city works: Riga, Berlin, New York, Tokyo…",
    },
    toCity: { label: "Their city" },
    fromCoords: {
      label: "Your coordinates (optional)",
      help: "Only for small towns: paste “lat, lng” from Google Maps, e.g. “41.38, 2.17”.",
    },
    toCoords: {
      label: "Their coordinates (optional)",
      help: "Same, only if the town isn't found.",
    },
    stops: {
      label: "Stopovers",
      help: "Optional. In order, every place you've met halfway.",
      addLabel: "Add a stop",
      placeholder: "Lisbon",
    },
    nationality: { label: "Nationality line", help: "e.g. “Citizen of wherever you are”" },
    cover: {
      label: "Passport colour",
      options: { navy: "Navy", burgundy: "Burgundy", forest: "Forest green", black: "Black" },
    },
  },
  es: {
    fromCity: {
      label: "Tu ciudad",
      help: "Vale cualquier ciudad grande: Riga, Berlín, Nueva York, Tokio…",
    },
    toCity: { label: "Su ciudad" },
    fromCoords: {
      label: "Tus coordenadas (opcional)",
      help: "Solo para pueblos: pega «lat, lng» de Google Maps, p. ej. «41.38, 2.17».",
    },
    toCoords: {
      label: "Sus coordenadas (opcional)",
      help: "Igual, solo si no encuentra el pueblo.",
    },
    stops: {
      label: "Escalas",
      help: "Opcional. En orden: cada sitio donde os visteis a medio camino.",
      addLabel: "Añadir una parada",
      placeholder: "Lisboa",
    },
    nationality: { label: "Línea de nacionalidad", help: "p. ej. «Ciudadana de donde estés tú»" },
    cover: {
      label: "Color del pasaporte",
      options: { navy: "Azul marino", burgundy: "Burdeos", forest: "Verde bosque", black: "Negro" },
    },
  },
};
