import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    theme: { label: "Colour world", options: { pink: "Pink", lavender: "Lavender", mint: "Mint", cherry: "Cherry" } },
    character: { label: "Plushie", options: { bunny: "Bunny", bear: "Bear", kitten: "Kitten" } },
    banner: { label: "Ribbon banner", help: "Defaults to “for {name}”. Keep it short." },
    greeting: { label: "What the plushie says", help: "Before the box opens. Defaults to “i have something for you”." },
  },
  es: {
    theme: { label: "Mundo de color", options: { pink: "Rosa", lavender: "Lavanda", mint: "Menta", cherry: "Cereza" } },
    character: { label: "Peluche", options: { bunny: "Conejito", bear: "Osito", kitten: "Gatito" } },
    banner: { label: "Cinta", help: "Por defecto: «para {nombre}». Que sea corto." },
    greeting: { label: "Lo que dice el peluche", help: "Antes de que se abra la caja. Por defecto: «tengo algo para ti»." },
  },
};
