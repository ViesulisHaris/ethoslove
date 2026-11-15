import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The kitchen", options: { cosy: "Cream tiles", midnight: "Midnight blue", berry: "Red gingham" } },
  },
  es: {
    look: { label: "La cocina", options: { cosy: "Azulejos crema", midnight: "Azul medianoche", berry: "Cuadros rojos" } },
  },
};
