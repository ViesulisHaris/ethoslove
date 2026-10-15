import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The flowers", options: { blush: "Blush lilies", cherry: "Cherry", lilac: "Lilac", blue: "Something blue", butter: "Butter yellow", sage: "Sage and white", rouge: "Burgundy roses", pressed: "Pressed flowers", bow: "Black bow" } },
    note: { label: "The postcard", help: "A line or two in your handwriting, under the first photo. The long letter goes at the end." },
    label: { label: "The torn-out words", help: "Stuck next to the photo strip. Defaults to “my favourite person”." },
    ticket: { label: "The ticket", help: "What it admits them to. Defaults to “ticket to happiness”." },
  },
  es: {
    look: { label: "Las flores", options: { blush: "Lirios rosas", cherry: "Cereza", lilac: "Lila", blue: "Algo azul", butter: "Amarillo mantequilla", sage: "Salvia y blanco", rouge: "Rosas burdeos", pressed: "Flores prensadas", bow: "Lazo negro" } },
    note: { label: "La postal", help: "Una o dos líneas con tu letra, bajo la primera foto. La carta larga va al final." },
    label: { label: "Las palabras recortadas", help: "Pegadas junto a la tira de fotos. Por defecto: «mi persona favorita»." },
    ticket: { label: "El billete", help: "A qué da entrada. Por defecto: «billete a la felicidad»." },
  },
};
