import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    sign: { label: "The words in lights", help: "Up to 28 characters. They come on in bulbs on the board in the garden when the switch is thrown. Left empty, it says merry christmas and their name.", placeholder: "MERRY CHRISTMAS MIA" },
    look: { label: "The house", options: { red: "Barn red", navy: "Navy blue", sage: "Sage green" } },
  },
  es: {
    sign: { label: "Las palabras de luces", help: "Hasta 28 caracteres. Se encienden con bombillas en el cartel del jardín al dar al interruptor. Si lo dejas vacío, pone feliz navidad y su nombre.", placeholder: "FELIZ NAVIDAD MIA" },
    look: { label: "La casa", options: { red: "Rojo granero", navy: "Azul marino", sage: "Verde salvia" } },
  },
};
