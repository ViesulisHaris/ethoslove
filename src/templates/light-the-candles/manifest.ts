import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "light-the-candles",
  name: { en: "Light the Candles", es: "Enciende las velas" },
  tagline: {
    en: "A Thanksgiving table at dusk, five candles unlit. They light each one with a match, and each lights up something you are thankful for.",
    es: "Una mesa de Acción de Gracias al anochecer, con cinco velas apagadas. Las encienden una a una con una cerilla, y cada una ilumina algo por lo que das las gracias.",
  },
  description: {
    en: "The table is set and the room is nearly dark: the last of the sunset in the window, five candles waiting. They strike a match and carry the flame from wick to wick with a finger. Every candle that catches warms the room a little more and writes one thing you are thankful for in light above the table. When all five burn, the whole table glows, and your letter, your photos and your song follow. Harvest rust, cream linen or plum check.",
    es: "La mesa está puesta y la habitación casi a oscuras: lo último del atardecer en la ventana y cinco velas esperando. Encienden una cerilla y llevan la llama de mecha en mecha con el dedo. Cada vela que prende calienta un poco más la habitación y escribe con luz, sobre la mesa, algo por lo que das las gracias. Cuando arden las cinco, toda la mesa brilla, y después llegan tu carta, tus fotos y vuestra canción. Teja de otoño, lino crema o cuadros ciruela.",
  },
  occasions: ["thanksgiving"],
  styles: ["romantic", "cinematic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 } },
  thumbnail: { poster: "/templates/light-the-candles/poster.jpg", webm: "/templates/light-the-candles/preview.webm" },
  defaultAccent: "#C8692A",
  heavy: false,
  sortOrder: 9,
};
