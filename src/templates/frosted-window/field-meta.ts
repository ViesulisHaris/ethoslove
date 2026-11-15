import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    sign: { label: "The snowman's sign", help: "Up to 36 characters, chalked on the little board the snowman holds up outside. Left empty, it says merry christmas and their name.", placeholder: "merry christmas, Ava" },
    look: { label: "The room", options: { cottage: "Cream cottage", cabin: "Log cabin", midnight: "Midnight blue" } },
  },
  es: {
    sign: { label: "El cartel del muñeco", help: "Hasta 36 caracteres, escritos con tiza en la pizarrita que sujeta el muñeco de nieve. Si lo dejas vacío, pone feliz navidad y su nombre.", placeholder: "feliz navidad, Ava" },
    look: { label: "La habitación", options: { cottage: "Casita crema", cabin: "Cabaña de troncos", midnight: "Azul medianoche" } },
  },
};
