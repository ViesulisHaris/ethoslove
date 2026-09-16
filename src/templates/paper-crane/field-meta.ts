import type { FieldMeta } from "../types";

// Labels and help for this template's fields, in both languages.
export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    lines: {
      label: "What each fold says",
      help: "Three to six short lines. One appears every time a crease is folded, in this order.",
      addLabel: "Add a line",
      placeholder: "You were right, and I knew it in the car.",
    },
    closing: {
      label: "The line left behind",
      help: "Said once the crane has flown off, before the letter. Keep it to one breath.",
    },
    paper: {
      label: "The paper",
      options: { ivory: "Ivory", blush: "Blush", sage: "Sage", slate: "Slate" },
    },
  },
  es: {
    lines: {
      label: "Lo que dice cada pliegue",
      help: "De tres a seis frases cortas. Aparece una cada vez que se dobla un pliegue, en este orden.",
      addLabel: "Añadir una frase",
      placeholder: "Tenías razón, y lo supe ya en el coche.",
    },
    closing: {
      label: "La frase que se queda",
      help: "Se lee cuando la grulla ya se ha ido, antes de la carta. Que quepa en un suspiro.",
    },
    paper: {
      label: "El papel",
      options: { ivory: "Marfil", blush: "Rosa palo", sage: "Salvia", slate: "Pizarra" },
    },
  },
};
