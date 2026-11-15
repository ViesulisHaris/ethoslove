import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    thanks: { label: "What you are thankful for", help: "Up to five, 60 characters each. One appears in light with every candle they light.", placeholder: "the coffee you bring me before I ask" },
    look: { label: "The table", options: { harvest: "Harvest rust", linen: "Cream linen", plum: "Plum check" } },
  },
  es: {
    thanks: { label: "Por qué das las gracias", help: "Hasta cinco, de 60 caracteres. Aparece una, hecha de luz, con cada vela que encienden.", placeholder: "el café que me traes antes de pedírtelo" },
    look: { label: "La mesa", options: { harvest: "Teja de otoño", linen: "Lino crema", plum: "Cuadros ciruela" } },
  },
};
