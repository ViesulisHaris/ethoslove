import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    ingredients: { label: "The ingredients", help: "Up to six, 48 characters each. One comes out with every slice, written onto the recipe card.", placeholder: "a pinch of you stealing the blanket" },
    look: { label: "The table", options: { linen: "Cream linen", farmhouse: "Farmhouse wood", check: "Green check", candlelit: "Candlelit" } },
  },
  es: {
    ingredients: { label: "Los ingredientes", help: "Hasta seis, de 48 caracteres. Sale uno con cada trozo, escrito en la ficha de la receta.", placeholder: "una pizca de ti robándome la manta" },
    look: { label: "La mesa", options: { linen: "Lino crema", farmhouse: "Madera de granja", check: "Cuadros verdes", candlelit: "A la luz de las velas" } },
  },
};
