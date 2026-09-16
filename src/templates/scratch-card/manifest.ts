import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "scratch-card",
  name: { en: "Scratch Card", es: "Rasca y gana" },
  tagline: { en: "Scratch to reveal. The last card is the big one.", es: "Rasca para descubrir. La última tarjeta es la importante." },
  description: {
    en: "A stack of scratch cards. Each one hides a photo and a line; they rub the foil away with a finger and it clears with a little burst. The final card holds your message, or the news. Built for proposals, announcements and “will you?”s.",
    es: "Una baraja de tarjetas de rascar. Cada una esconde una foto y una frase; frotan el metalizado con el dedo y se despeja con una pequeña explosión. La última guarda tu mensaje, o la noticia. Hecha para pedidas, anuncios y «¿quieres?».",
  },
  occasions: ["wedding", "valentines", "birthday"],
  styles: ["playful", "minimal"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 12 } },
  thumbnail: { poster: "/templates/scratch-card/poster.jpg", webm: "/templates/scratch-card/preview.webm" },
  defaultAccent: "#D4A853",
  heavy: false,
  sortOrder: 50,
};
