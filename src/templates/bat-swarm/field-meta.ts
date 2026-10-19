import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The sky", options: { midnight: "Midnight", harvest: "Harvest moon", blood: "Blood moon", frost: "Frost" } },
    line: { label: "A line after their name", help: "The bats spell it after the name and before the heart, up to 14 characters, like “be mine”. Leave it empty to skip it." },
  },
  es: {
    look: { label: "El cielo", options: { midnight: "Medianoche", harvest: "Luna de cosecha", blood: "Luna de sangre", frost: "Escarcha" } },
    line: { label: "Una frase tras su nombre", help: "Los murciélagos la forman después del nombre y antes del corazón, hasta 14 caracteres, como «sé mía». Déjala vacía para saltarla." },
  },
};
