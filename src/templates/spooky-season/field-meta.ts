import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The season", options: { pumpkin: "Pumpkin patch", midnight: "Midnight", cozy: "Cozy kraft" } },
    note: { label: "The postcard", help: "A line or two in your handwriting, under the first photo. The long letter goes at the end." },
    label: { label: "The torn-out words", help: "Stuck next to the film strip. Defaults to “be my boo”." },
    ticket: { label: "The ticket", help: "What it admits you both to. Defaults to “admit two: haunted house”." },
  },
  es: {
    look: { label: "La estación", options: { pumpkin: "Huerto de calabazas", midnight: "Medianoche", cozy: "Kraft acogedor" } },
    note: { label: "La postal", help: "Una o dos líneas con tu letra, bajo la primera foto. La carta larga va al final." },
    label: { label: "Las palabras recortadas", help: "Pegadas junto a la tira de película. Por defecto: «mi calabacita»." },
    ticket: { label: "La entrada", help: "A qué os da entrada a los dos. Por defecto: «pase: casa del terror»." },
  },
};
