import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    pack: { label: "The stickers", options: { chaos: "All of them", cats: "Cats with opinions", party: "Party animals", soft: "The soft ones" } },
    surface: { label: "The page", options: { mat: "Cutting mat", paper: "Dot paper", holo: "Holographic", night: "Laptop lid" } },
    labels: { label: "The label-maker strips", help: "Stuck under every other sticker, in order. Things you call them, things they say. Leave it empty for ours.", addLabel: "Add a label", placeholder: "certified menace" },
    prompt: { label: "The line on the empty page", help: "What they read before the first tap. Defaults to “{their name}, slap some stickers”." },
  },
  es: {
    pack: { label: "Los stickers", options: { chaos: "Todos", cats: "Gatos con opiniones", party: "Animales de fiesta", soft: "Los tiernos" } },
    surface: { label: "La página", options: { mat: "Base de corte", paper: "Papel punteado", holo: "Holográfica", night: "Tapa de portátil" } },
    labels: { label: "Las tiras de rotuladora", help: "Pegadas bajo uno de cada dos stickers, en orden. Cómo le llamas, lo que dice. Déjalo vacío para usar las nuestras.", addLabel: "Añadir una etiqueta", placeholder: "amenaza certificada" },
    prompt: { label: "La frase de la página vacía", help: "Lo que lee antes del primer toque. Por defecto: «{su nombre}, pega unos stickers»." },
  },
};
