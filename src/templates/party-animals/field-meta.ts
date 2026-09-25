import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    age: { label: "Their age", help: "In foil balloons at the top and in candles on the cake, and one of the guests has an opinion about it. Leave it empty to keep it a secret." },
    look: { label: "The page", options: { linen: "Linen", bubblegum: "Bubblegum", lime: "Lime", midnight: "Midnight" } },
    banner: { label: "The cut-out letters", help: "Across the top, ransom-note style, over their name. Defaults to “happy birthday”." },
    word: { label: "The word on the second photo", help: "In handwriting under your second photo. Defaults to “happiness.”" },
    shouts: { label: "What the animals yell", help: "One line per animal, in order down the page: the first goes to the cat at the top. They yell it when tapped. Inside jokes work best. Leave it empty for ours.", addLabel: "Add a line", placeholder: "u still owe me £4" },
  },
  es: {
    age: { label: "Su edad", help: "En globos metalizados arriba y en velas sobre la tarta, y uno de los invitados tiene algo que decir al respecto. Déjalo vacío para guardar el secreto." },
    look: { label: "La página", options: { linen: "Lino", bubblegum: "Chicle", lime: "Lima", midnight: "Medianoche" } },
    banner: { label: "Las letras recortadas", help: "Arriba, como una nota de rescate, sobre su nombre. Por defecto: «feliz cumple»." },
    word: { label: "La palabra de la segunda foto", help: "A mano bajo tu segunda foto. Por defecto: «felicidad.»" },
    shouts: { label: "Lo que gritan los animales", help: "Una frase por animal, en orden de arriba abajo: la primera es para el gato de arriba. La gritan cuando los tocan. Las bromas internas funcionan mejor. Déjalo vacío para usar las nuestras.", addLabel: "Añadir una frase", placeholder: "me debes 4 €" },
  },
};
