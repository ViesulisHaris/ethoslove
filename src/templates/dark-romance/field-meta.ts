import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The mood", options: { bordeaux: "Bordeaux", noir: "Noir", parchment: "Parchment" } },
    headline: { label: "The cut-out letters", help: "A word or three, at the top of the page. Defaults to “only you”." },
    card: { label: "The tarot card", help: "Your second photo is printed on a tarot card with this name. Defaults to “The Lovers”." },
    bet: { label: "The torn-out words", help: "Next to the playing cards. Defaults to “i'd bet on us”." },
  },
  es: {
    look: { label: "El ambiente", options: { bordeaux: "Burdeos", noir: "Noir", parchment: "Pergamino" } },
    headline: { label: "Las letras recortadas", help: "Una palabra o tres, arriba de la página. Por defecto: «solo tú»." },
    card: { label: "La carta del tarot", help: "Tu segunda foto va impresa en una carta del tarot con este nombre. Por defecto: «Los Enamorados»." },
    bet: { label: "Las palabras recortadas", help: "Junto a las cartas. Por defecto: «apostaría por nosotros»." },
  },
};
