import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    line: { label: "Under the leaves", help: "Up to 120 characters, written on the card under the title. It shows once the leaves are brushed off.", placeholder: "for every cold hand in my pocket and every pile you jumped in" },
    look: { label: "Where it was left", options: { deck: "Garden deck", porch: "White porch", stone: "Stone path", evening: "Evening lights" } },
  },
  es: {
    line: { label: "Bajo las hojas", help: "Hasta 120 caracteres, escritos en la tarjeta bajo el título. Se lee cuando apartan las hojas.", placeholder: "por cada mano fría en mi bolsillo y cada montón en el que saltaste" },
    look: { label: "Dónde la dejaste", options: { deck: "Tarima del jardín", porch: "Porche blanco", stone: "Camino de piedra", evening: "Luces de tarde" } },
  },
};
