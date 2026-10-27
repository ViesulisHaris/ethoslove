import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The storm", options: { storm: "Storm blue", blood: "Blood moon", swamp: "Swamp green", violet: "Midnight violet" } },
    tag: { label: "The tag on the gate", help: "Up to 18 characters. Defaults to “for {name}”." },
  },
  es: {
    look: { label: "La tormenta", options: { storm: "Azul tormenta", blood: "Luna roja", swamp: "Verde pantano", violet: "Violeta medianoche" } },
    tag: { label: "La etiqueta de la verja", help: "Hasta 18 caracteres. Por defecto: «para {nombre}»." },
  },
};
