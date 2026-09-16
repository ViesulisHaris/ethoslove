import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "arcade",
  name: { en: "Arcade", es: "Arcade" },
  tagline: { en: "Catch the hearts. Unlock the photos.", es: "Atrapa los corazones. Desbloquea las fotos." },
  description: {
    en: "A tiny retro game. Drag the basket to catch falling hearts; every level clears a photo, the last one reveals your message. Bleeps, pixel text, a CRT scanline switch, and a leaderboard of one.",
    es: "Un mini juego retro. Arrastra la cesta para atrapar corazones que caen; cada nivel desbloquea una foto y el último revela tu mensaje. Pitidos, letras de píxel, un interruptor de líneas CRT y un ranking de una sola persona.",
  },
  occasions: ["birthday", "valentines", "just-because"],
  styles: ["retro", "playful"],
  tier: "premium",
  features: { music: false, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 8 } },
  thumbnail: { poster: "/templates/arcade/poster.jpg", webm: "/templates/arcade/preview.webm" },
  defaultAccent: "#E8604C",
  heavy: false,
  sortOrder: 130,
};
