import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "midnight-countdown",
  name: { en: "Midnight Countdown", es: "Cuenta atrás de medianoche" },
  tagline: { en: "Dusk to fireworks, timed to the second.", es: "Del atardecer a los fuegos, al segundo." },
  description: {
    en: "A live countdown to the moment you choose. The sky darkens from dusk to night as it gets close; at zero, fireworks fill the screen and the gift unlocks, your photos, your words. Made for the stroke of midnight on their birthday.",
    es: "Una cuenta atrás en vivo hasta el momento que elijas. El cielo pasa del atardecer a la noche mientras se acerca; a cero, los fuegos artificiales llenan la pantalla y el regalo se abre: tus fotos, tus palabras. Hecha para las doce en punto de su cumpleaños.",
  },
  occasions: ["birthday", "anniversary", "long-distance"],
  styles: ["cinematic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 20 } },
  thumbnail: { poster: "/templates/midnight-countdown/poster.jpg", webm: "/templates/midnight-countdown/preview.webm" },
  defaultAccent: "#F2C879",
  heavy: false,
  sortOrder: 60,
};
