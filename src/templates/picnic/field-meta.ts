import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    labels: {
      label: "The little tags",
      help: "Three to eight short lines, things you love about them or reasons. Each one is tied to something in the basket, in the order they come out: the strawberries carry the first.",
      addLabel: "Add a line",
      placeholder: "the way you eat the strawberries first",
    },
    blanket: { label: "The blanket", options: { pink: "Pink", blue: "Blue", red: "Red", lilac: "Lilac" } },
  },
  es: {
    labels: {
      label: "Las etiquetas",
      help: "De tres a ocho frases cortas: cosas que te encantan de esa persona, o razones. Cada una va atada a algo de la cesta, en el orden en que salen: las fresas llevan la primera.",
      addLabel: "Añadir una frase",
      placeholder: "cómo te comes las fresas antes que nada",
    },
    blanket: { label: "La manta", options: { pink: "Rosa", blue: "Azul", red: "Roja", lilac: "Lila" } },
  },
};
