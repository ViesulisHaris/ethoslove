import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The look", options: { pumpkin: "Pumpkin", pink: "Pink", midnight: "Midnight" } },
    sign: { label: "The words under the name", help: "At the top of the collage, under their name. Defaults to “be my boo?”." },
    note: { label: "The note", help: "A line or two in your handwriting on the page. The long letter goes at the end." },
  },
  es: {
    look: { label: "El estilo", options: { pumpkin: "Calabaza", pink: "Rosa", midnight: "Medianoche" } },
    sign: { label: "Las palabras bajo el nombre", help: "Arriba del collage, bajo su nombre. Por defecto: «¿serás mi boo?»." },
    note: { label: "La nota", help: "Una o dos líneas con tu letra en la página. La carta larga va al final." },
  },
};
