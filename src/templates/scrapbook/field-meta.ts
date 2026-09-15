import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    theme: { label: "The pages", options: { blossom: "Blossom", leopard: "Favorite person", seaside: "Seaside", sunshine: "Sunshine", film: "Memories" } },
    headline: { label: "The cut-out title", help: "Letters cut from magazines. Leave empty for the theme's title." },
    quote: { label: "The torn note", help: "One line in handwriting." },
    tag: { label: "The pinned note", help: "A few typewritten words. Use · for a new line." },
  },
  es: {
    theme: { label: "Las páginas", options: { blossom: "Flores", leopard: "Persona favorita", seaside: "Playa", sunshine: "Sol", film: "Recuerdos" } },
    headline: { label: "El título recortado", help: "Letras recortadas de revistas. Déjalo vacío para el título del tema." },
    quote: { label: "La nota rasgada", help: "Una frase escrita a mano." },
    tag: { label: "La nota con chincheta", help: "Unas palabras a máquina. Usa · para cambiar de línea." },
  },
};
