import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "on-repeat",
  name: { en: "On Repeat", es: "En bucle" },
  tagline: { en: "Press play. Your photo as the album cover, a pink sunset and a playlist of you two.", es: "Dale play. Tu foto como portada, un atardecer rosa y una playlist de vosotros dos." },
  description: {
    en: "A music player under a pink sunset with your photo as the album cover and their name as the artist. They press play and it becomes a sticker collage: a gingham bow, a flower sticker, a bouquet, a smiley, a heart paperclip on a note in your handwriting, your song on the big player, and every photo you add on a playlist, with your captions as the song titles, down to your letter. Every tap adds a sticker. Sunset, lilac or night.",
    es: "Un reproductor de música bajo un atardecer rosa, con tu foto como portada y su nombre como artista. Le da al play y se convierte en un collage de stickers: un lazo de cuadros, una flor, un ramo, una carita sonriente, un clip de corazón sobre una nota con tu letra, vuestra canción en el reproductor y cada foto que añadas en una playlist, con tus pies de foto como títulos de las canciones, hasta tu carta. Cada toque añade un sticker. Atardecer, lila o noche.",
  },
  occasions: ["just-because", "anniversary", "birthday"],
  styles: ["playful", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 10 } },
  thumbnail: { poster: "/templates/on-repeat/poster.jpg", webm: "/templates/on-repeat/preview.webm" },
  defaultAccent: "#E2557F",
  heavy: false,
  sortOrder: 45,
};
