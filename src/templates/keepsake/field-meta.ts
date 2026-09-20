import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The paper", options: { kraft: "Kraft", ivory: "Ivory", rose: "Dusty rose" } },
    word: { label: "The torn-out word", help: "One word, as if torn out of a book. Defaults to “Happiness”." },
    ticket: { label: "The ticket", help: "What it admits them to. Defaults to “ticket to happiness”." },
    engraving: { label: "Inside the locket", help: "Engraved opposite the photo: a date, a place, “always”. Defaults to your two initials. The photo in the locket is your second one." },
  },
  es: {
    look: { label: "El papel", options: { kraft: "Kraft", ivory: "Marfil", rose: "Rosa empolvado" } },
    word: { label: "La palabra arrancada", help: "Una palabra, como arrancada de un libro. Por defecto: «Felicidad»." },
    ticket: { label: "El billete", help: "A qué da entrada. Por defecto: «billete a la felicidad»." },
    engraving: { label: "Dentro del relicario", help: "Grabado frente a la foto: una fecha, un lugar, «siempre». Por defecto, vuestras dos iniciales. La foto del relicario es la segunda." },
  },
};
