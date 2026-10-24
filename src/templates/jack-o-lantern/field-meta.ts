import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The pumpkin", options: { orange: "Orange", white: "Ghost white", purple: "Witch purple", pink: "Blush pink" } },
    face: { label: "The face", options: { classic: "Classic grin", sweet: "Heart eyes", cat: "Cat" } },
    carving: { label: "What is carved on it", help: "Up to 12 characters, across the belly. Defaults to their name." },
  },
  es: {
    look: { label: "La calabaza", options: { orange: "Naranja", white: "Blanco fantasma", purple: "Morado bruja", pink: "Rosa suave" } },
    face: { label: "La cara", options: { classic: "Sonrisa clásica", sweet: "Ojos de corazón", cat: "Gato" } },
    carving: { label: "Lo que lleva tallado", help: "Hasta 12 caracteres, en la barriga. Por defecto, su nombre." },
  },
};
