import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "birthday-cinema",
  name: { en: "Birthday Cinema", es: "Cine de cumpleaños" },
  tagline: { en: "Curtains, candles, confetti. Blow to make a wish.", es: "Telón, velas, confeti. Sopla y pide un deseo." },
  description: {
    en: "Red curtains part on a marquee with their name in lights. A cake with real flickering candles waits, they blow into the phone (or swipe) to put them out, confetti fires, and a film strip of your photos rolls.",
    es: "Un telón rojo se abre sobre una marquesina con su nombre en luces. Espera una tarta con velas de llama real: soplan al teléfono (o deslizan) para apagarlas, salta el confeti y rueda una tira de película con tus fotos.",
  },
  occasions: ["birthday", "graduation", "just-because"],
  styles: ["cinematic", "playful"],
  tier: "premium",
  features: { music: true, video: true, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 20 }, needs: ["microphone"] },
  thumbnail: { poster: "/templates/birthday-cinema/poster.jpg", webm: "/templates/birthday-cinema/preview.webm" },
  defaultAccent: "#E8604C",
  heavy: false,
  sortOrder: 11,
};
