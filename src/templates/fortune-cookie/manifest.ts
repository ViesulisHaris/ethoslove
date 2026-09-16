import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "fortune-cookie",
  name: { en: "Fortune Cookie", es: "Galleta de la fortuna" },
  tagline: { en: "Crack one open. Suspiciously accurate.", es: "Ábrela. Sospechosamente acertada." },
  description: {
    en: "A plate of fortune cookies. Tap one and it cracks in two; a paper slip slides out with a fortune you wrote, silly, sweet, or oddly specific, and their lucky numbers. Some slips carry a photo. The last cookie holds your message.",
    es: "Un plato de galletas de la fortuna. Toca una y se parte en dos; sale una tira de papel con una fortuna escrita por ti (tonta, tierna o extrañamente concreta) y sus números de la suerte. Algunas llevan foto. La última galleta guarda tu mensaje.",
  },
  occasions: ["just-because", "birthday", "graduation"],
  styles: ["playful"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 10 } },
  thumbnail: { poster: "/templates/fortune-cookie/poster.jpg", webm: "/templates/fortune-cookie/preview.webm" },
  defaultAccent: "#C8743A",
  heavy: false,
  sortOrder: 110,
};
