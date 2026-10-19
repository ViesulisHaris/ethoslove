import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "seance",
  name: { en: "The Séance", es: "La sesión espiritista" },
  tagline: {
    en: "Touch the planchette. A spirit spells out your message, one letter at a time.",
    es: "Toca la plancheta. Un espíritu deletrea tu mensaje, letra a letra.",
  },
  description: {
    en: "A candlelit table at midnight, a spirit board and a candle burning either side of it. They touch the planchette and it moves by itself: it glides from letter to letter, each one glowing as it passes, and spells the words you chose. Then it says goodbye and the candles go out. In the dark your letter is written on old paper, your photos develop out of the mist as spirit photographs, and your song plays. Candle, moonlight, blood moon or graveyard green.",
    es: "Una mesa a la luz de las velas a medianoche, un tablero espiritista y una vela ardiendo a cada lado. Tocan la plancheta y se mueve sola: se desliza de letra en letra, cada una brilla al pasar, y deletrea las palabras que elegiste. Luego se despide y las velas se apagan. En la oscuridad tu carta aparece escrita en papel viejo, tus fotos se revelan entre la niebla como fotografías de espíritus y suena vuestra canción. Vela, luz de luna, luna de sangre o verde cementerio.",
  },
  occasions: ["halloween", "just-because"],
  styles: ["cinematic", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 8 } },
  thumbnail: { poster: "/templates/seance/poster.jpg", webm: "/templates/seance/preview.webm" },
  defaultAccent: "#FFAE3D",
  heavy: false,
  sortOrder: 9,
};
