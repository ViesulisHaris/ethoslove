import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The colour", options: { blush: "Blush", lilac: "Lilac", peach: "Peach" } },
    title: { label: "The torn note", help: "In the middle of the page. Defaults to “favorite person”." },
    signoff: { label: "Under the flowers", help: "Written at the foot of the bouquet. Defaults to “love you”." },
  },
  es: {
    look: { label: "El color", options: { blush: "Rosa", lilac: "Lila", peach: "Melocotón" } },
    title: { label: "La nota rasgada", help: "En medio de la página. Por defecto: «mi persona favorita»." },
    signoff: { label: "Bajo las flores", help: "Escrito al pie del ramo. Por defecto: «te quiero»." },
  },
};
