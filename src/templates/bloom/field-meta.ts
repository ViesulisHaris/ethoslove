import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    flower: { label: "Flower", options: { peony: "Peony", tulip: "Tulip", daisy: "Daisy" } },
    petalColor: { label: "Petal colour", help: "Leave empty to use the accent colour." },
    sky: { label: "Light", options: { dawn: "Dawn", dusk: "Dusk", paper: "Paper white" } },
    pollen: { label: "Pollen drifting in the light" },
    stickers: { label: "Stickers", help: "The sparkles, butterfly, daisy, heart and bow around the flower." },
    pot: { label: "Pot and windowsill", help: "Turn off to leave the flower on its own in the light." },
  },
  es: {
    flower: { label: "Flor", options: { peony: "Peonía", tulip: "Tulipán", daisy: "Margarita" } },
    petalColor: {
      label: "Color de los pétalos",
      help: "Déjalo vacío para usar el color de acento.",
    },
    sky: { label: "Luz", options: { dawn: "Amanecer", dusk: "Atardecer", paper: "Blanco papel" } },
    pollen: { label: "Polen flotando en la luz" },
    stickers: { label: "Pegatinas", help: "Los brillos, la mariposa, la margarita, el corazón y el lazo alrededor de la flor." },
    pot: { label: "Maceta y alféizar", help: "Desactívalo para dejar la flor sola en la luz." },
  },
};
