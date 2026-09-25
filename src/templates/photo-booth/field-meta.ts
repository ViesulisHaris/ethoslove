import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    booth: { label: "The booth", options: { cherry: "Cherry red", blush: "Blush pink", noir: "Black", mint: "Mint" } },
    filter: { label: "The strip", help: "How the four photos print.", options: { color: "Colour", bw: "Black & white", sepia: "Sepia" } },
    line: { label: "The words on the wall", help: "In handwriting, next to the strip. Defaults to “my favourite person”." },
    sign: { label: "The sign on top", help: "Lit up over the booth. Use · for a second line. Defaults to “PHOTOS · 4 POSES”." },
  },
  es: {
    booth: { label: "El fotomatón", options: { cherry: "Rojo cereza", blush: "Rosa", noir: "Negro", mint: "Menta" } },
    filter: { label: "La tira", help: "Cómo se imprimen las cuatro fotos.", options: { color: "Color", bw: "Blanco y negro", sepia: "Sepia" } },
    line: { label: "Las palabras del muro", help: "Escritas a mano, junto a la tira. Por defecto: «mi persona favorita»." },
    sign: { label: "El letrero", help: "Encendido sobre la cabina. Usa · para una segunda línea. Por defecto: «FOTOS · 4 POSES»." },
  },
};
