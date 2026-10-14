import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The look", options: { gingham: "Gingham", sage: "Sage", cranberry: "Cranberry" } },
    blocks: { label: "The letter blocks", help: "Spells their name unless you write something else. Up to 12 letters." },
    tag: { label: "The tag", help: "The kraft tag by the first photos. Defaults to “fall for you”." },
    note: { label: "The recipe card", help: "A line or two in your handwriting under “recipe for us”. The long letter goes at the end." },
  },
  es: {
    look: { label: "El estilo", options: { gingham: "Vichy", sage: "Salvia", cranberry: "Arándano" } },
    blocks: { label: "Los bloques de letras", help: "Forman su nombre si no escribes otra cosa. Hasta 12 letras." },
    tag: { label: "La etiqueta", help: "La etiqueta de papel kraft junto a las primeras fotos. Por defecto: «otoño contigo»." },
    note: { label: "La ficha de receta", help: "Una o dos líneas con tu letra bajo «receta para nosotros». La carta larga va al final." },
  },
};
