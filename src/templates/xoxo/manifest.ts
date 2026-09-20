import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "xoxo",
  name: { en: "XOXO", es: "XOXO" },
  tagline: { en: "Sealed with a kiss. Lipstick prints, polaroids, and every tap leaves another kiss.", es: "Sellado con un beso. Marcas de pintalabios, polaroids, y cada toque deja otro beso." },
  description: {
    en: "An envelope sealed with a real lipstick kiss. They open it and scroll down a collage in red: your photos as polaroids on a lace doily, cut-out newspaper letters spelling what you call them, red ribbon bows, fingerprint hearts, two cats who are clearly the two of you, and a card with the lines you'd underline, already underlined. Wherever they tap, a kiss lands. Your letter is at the bottom, typed, with one last kiss by your name. Cream, noir or blush.",
    es: "Un sobre sellado con un beso de pintalabios de verdad. Lo abren y bajan por un collage en rojo: tus fotos como polaroids sobre una blonda de encaje, letras recortadas de periódico que deletrean cómo le llamas, lazos rojos, corazones de huellas, dos gatos que claramente sois vosotros, y una tarjeta con las frases que subrayarías, ya subrayadas. Donde toquen, cae un beso. Tu carta está al final, a máquina, con un último beso junto a tu nombre. Crema, noir o rosa.",
  },
  occasions: ["valentines", "anniversary", "just-because"],
  styles: ["romantic", "playful"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 9 } },
  thumbnail: { poster: "/templates/xoxo/poster.jpg", webm: "/templates/xoxo/preview.webm" },
  defaultAccent: "#B3122A",
  heavy: false,
  sortOrder: 9,
};
