import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "balloons",
  name: { en: "Balloons", es: "Globos" },
  tagline: { en: "A room full of balloons. Pop them; every one hides a photo.", es: "Una habitación llena de globos. Explótalos; cada uno esconde una foto." },
  description: {
    en: "A ceiling of hand-painted balloons floats in, with their age in gold foil numbers and a bunting line spelling out the day. They pop the balloons one by one, and each one drops a polaroid of yours onto the floor. The last balloon, the biggest, is holding your letter. Pastel, sunset, jewel or cream and gold.",
    es: "Un techo de globos pintados a mano entra flotando, con su edad en números de foil dorado y una guirnalda de banderines que deletrea el día. Explotan los globos uno a uno, y cada uno deja caer una polaroid tuya al suelo. El último globo, el más grande, sostiene tu carta. Pastel, atardecer, joya o crema y oro.",
  },
  occasions: ["birthday", "just-because"],
  styles: ["playful", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 8 } },
  thumbnail: { poster: "/templates/balloons/poster.jpg", webm: "/templates/balloons/preview.webm" },
  defaultAccent: "#D9667C",
  heavy: false,
  sortOrder: 9,
};
