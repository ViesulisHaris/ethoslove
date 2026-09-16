import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    recipeName: {
      label: "What the recipe is called",
      help: "Goes on the card, in her kitchen's handwriting. Leave it empty and it takes her name.",
    },
    ingredients: {
      label: "Ingredients",
      help: "Her, measured out. One short line each, up to six — they pour in one at a time.",
      addLabel: "Add an ingredient",
      placeholder: "Two cups of patience",
    },
    makes: {
      label: "Makes one…",
      help: "The little line under the title. Leave it empty for ours.",
    },
    counter: {
      label: "Counter",
      options: { oak: "Oak", walnut: "Walnut", marble: "Marble", sage: "Painted sage" },
    },
    cloth: {
      label: "Gingham",
      options: { tomato: "Tomato", butter: "Butter", rosemary: "Rosemary" },
    },
  },
  es: {
    recipeName: {
      label: "Cómo se llama la receta",
      help: "Va en la ficha, con la letra de su cocina. Si lo dejas vacío, lleva su nombre.",
    },
    ingredients: {
      label: "Ingredientes",
      help: "Ella, en medidas. Una línea corta cada uno, hasta seis: caen de uno en uno.",
      addLabel: "Añadir un ingrediente",
      placeholder: "Dos tazas de paciencia",
    },
    makes: {
      label: "Sale una…",
      help: "La frase pequeña bajo el título. Si la dejas vacía, ponemos la nuestra.",
    },
    counter: {
      label: "Encimera",
      options: { oak: "Roble", walnut: "Nogal", marble: "Mármol", sage: "Verde salvia" },
    },
    cloth: {
      label: "Cuadros vichy",
      options: { tomato: "Tomate", butter: "Mantequilla", rosemary: "Romero" },
    },
  },
};
