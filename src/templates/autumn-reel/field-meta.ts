import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The look", options: { rust: "Rust", espresso: "Espresso", olive: "Olive" } },
    wish: { label: "The cut-out words", help: "A line cut word by word out of a book. Defaults to “and if my wishes came true, it would've been you”." },
    ticket: { label: "The ticket", help: "What it admits you both to. Defaults to “admit two: autumn matinee”." },
  },
  es: {
    look: { label: "El estilo", options: { rust: "Óxido", espresso: "Espresso", olive: "Oliva" } },
    wish: { label: "Las palabras recortadas", help: "Una frase recortada palabra a palabra de un libro. Por defecto: «y si mis deseos se cumplieran, habrías sido tú»." },
    ticket: { label: "La entrada", help: "A qué os da entrada a los dos. Por defecto: «pase doble: sesión de otoño»." },
  },
};
