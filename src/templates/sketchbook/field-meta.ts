import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    theme: { label: "Paper", options: { white: "White paper", kraft: "Kraft", night: "Black paper, white pen" } },
    age: { label: "Their age", help: "Circled on the first page, and the number of candles, up to eight. Leave it empty for five candles and no number." },
    title: { label: "The line over the cake", help: "Hand-lettered on the first page. Defaults to “happy birthday”." },
  },
  es: {
    theme: { label: "Papel", options: { white: "Papel blanco", kraft: "Kraft", night: "Papel negro, boli blanco" } },
    age: { label: "Su edad", help: "Rodeada en la primera página, y el número de velas, hasta ocho. Déjalo vacío para cinco velas y sin número." },
    title: { label: "La línea sobre la tarta", help: "Escrita a mano en la primera página. Por defecto: «feliz cumple»." },
  },
};
