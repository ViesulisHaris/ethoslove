import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    age: { label: "Their age", help: "Written on the big polaroid, and one of the guests will comment on it. Leave it empty to keep it a secret." },
    look: { label: "The page", options: { linen: "Linen", bubblegum: "Bubblegum", lime: "Lime", midnight: "Midnight" } },
    banner: { label: "The cut-out letters", help: "Across the top, ransom-note style. Defaults to “happy birthday”." },
    word: { label: "The word on the wide photo", help: "In handwriting under your second photo. Defaults to “happiness.”" },
    shouts: { label: "What the animals yell", help: "One line per animal, shouted when they tap it. Inside jokes work best. Leave it empty for ours.", addLabel: "Add a line", placeholder: "u still owe me £4" },
  },
  es: {
    age: { label: "Su edad", help: "Escrita en la polaroid grande, y uno de los invitados la comentará. Déjalo vacío para guardar el secreto." },
    look: { label: "La página", options: { linen: "Lino", bubblegum: "Chicle", lime: "Lima", midnight: "Medianoche" } },
    banner: { label: "Las letras recortadas", help: "Arriba, como una nota de rescate. Por defecto: «feliz cumple»." },
    word: { label: "La palabra de la foto ancha", help: "A mano bajo tu segunda foto. Por defecto: «felicidad.»" },
    shouts: { label: "Lo que gritan los animales", help: "Una frase por animal, que grita cuando lo tocan. Las bromas internas funcionan mejor. Déjalo vacío para usar las nuestras.", addLabel: "Añadir una frase", placeholder: "me debes 4 €" },
  },
};
