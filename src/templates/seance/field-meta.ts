import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The light", options: { candle: "Candle", moon: "Moonlight", blood: "Blood moon", toxic: "Graveyard green" } },
    spell: { label: "What the spirit spells", help: "Up to 22 letters or numbers, spelled one at a time. Defaults to “I love you”." },
  },
  es: {
    look: { label: "La luz", options: { candle: "Vela", moon: "Luz de luna", blood: "Luna de sangre", toxic: "Verde cementerio" } },
    spell: { label: "Lo que deletrea el espíritu", help: "Hasta 22 letras o números, una a una. Por defecto: «te quiero»." },
  },
};
