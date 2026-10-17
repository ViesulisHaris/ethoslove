import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    figurine: { label: "Inside the box", help: "Who turns on the velvet while it plays.", options: { ballerina: "A ballerina", swans: "Two swans" } },
    tune: { label: "The tune", help: "Played note by note on the box's comb, slowing as the spring runs down.", options: { "swan-lake": "Swan Lake", lullaby: "Brahms' Lullaby", "fur-elise": "Für Elise" } },
    box: { label: "The lacquer", help: "The box, its velvet and the wallpaper behind it.", options: { blush: "Blush", ivory: "Ivory", lilac: "Lilac", sage: "Sage" } },
  },
  es: {
    figurine: { label: "Dentro de la caja", help: "Quién gira sobre el terciopelo mientras suena.", options: { ballerina: "Una bailarina", swans: "Dos cisnes" } },
    tune: { label: "La melodía", help: "Suena nota a nota en el peine de la caja, cada vez más despacio cuando se acaba la cuerda.", options: { "swan-lake": "El lago de los cisnes", lullaby: "Canción de cuna de Brahms", "fur-elise": "Para Elisa" } },
    box: { label: "La laca", help: "La caja, su terciopelo y el papel pintado de detrás.", options: { blush: "Rosa", ivory: "Marfil", lilac: "Lila", sage: "Salvia" } },
  },
};
