import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The page", options: { cream: "Cream and red", noir: "Noir", blush: "Blush" } },
    headline: { label: "What you call them", help: "Cut out of a newspaper, a letter at a time. “my boy”, “my girl”, a nickname. Defaults to “my person”." },
    lines: { label: "The lines you'd underline", help: "A few sentences in your own words: the thing you'd say if you were braver. Some of it gets underlined, circled and highlighted for you." },
    word: { label: "The word on the second photo", help: "In script, under the picture. Defaults to “Love”." },
  },
  es: {
    look: { label: "La página", options: { cream: "Crema y rojo", noir: "Noir", blush: "Rosa" } },
    headline: { label: "Cómo le llamas", help: "Recortado de un periódico, letra a letra. «mi chico», «mi niña», un mote. Por defecto: «mi persona»." },
    lines: { label: "Las frases que subrayarías", help: "Unas frases con tus propias palabras: lo que dirías si te atrevieras. Parte se subraya, se rodea y se resalta sola." },
    word: { label: "La palabra de la segunda foto", help: "En cursiva, bajo la imagen. Por defecto: «Amor»." },
  },
};
