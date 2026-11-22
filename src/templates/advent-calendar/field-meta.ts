import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The house", options: { evergreen: "Evergreen and red", nordic: "White and sage", midnight: "Midnight blue" } },
  },
  es: {
    look: { label: "La casita", options: { evergreen: "Verde y rojo", nordic: "Blanco y salvia", midnight: "Azul medianoche" } },
  },
};
