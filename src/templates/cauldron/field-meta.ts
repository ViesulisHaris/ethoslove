import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The potion", options: { witch: "Witch green", love: "Love pink", midnight: "Midnight blue", gold: "Pumpkin gold" } },
    ingredients: { label: "What goes in", help: "Up to three, each one a jar on the shelf. They tap them in one at a time, so each is a line they read. Leave it empty for three sweet ones.", addLabel: "Add an ingredient", placeholder: "a pinch of your laugh" },
    potion: { label: "The name on the bottle", help: "Defaults to “Love Potion No. 9”." },
  },
  es: {
    look: { label: "La poción", options: { witch: "Verde bruja", love: "Rosa amor", midnight: "Azul medianoche", gold: "Oro calabaza" } },
    ingredients: { label: "Lo que se echa", help: "Hasta tres, cada uno un tarro en la estantería. Los echan uno a uno, así que cada uno es una línea que leen. Déjalo vacío para tres dulces.", addLabel: "Añadir un ingrediente", placeholder: "una pizca de tu risa" },
    potion: { label: "El nombre de la botella", help: "Por defecto: «Poción de amor nº 9»." },
  },
};
