import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "spooky-season",
  name: { en: "Spooky Season", es: "Spooky Season" },
  tagline: { en: "Blow the leaves away. A cosy Halloween collage of black cats, pumpkins, film and your song.", es: "Sopla las hojas. Un collage de Halloween acogedor con gatos negros, calabazas, película y vuestra canción." },
  description: {
    en: "A heap of real autumn leaves with their name on a kraft tag. One tap and a gust blows the leaves off the screen, and a Halloween scrapbook is underneath: your photo on a frame of film under the moon, a black cat on a pumpkin, a ticket for two to the haunted house, your song on a little player, a postcard in your handwriting, a film strip of three more photos and polaroids all the way down to your letter. Pumpkin patch, midnight or cozy kraft.",
    es: "Un montón de hojas de otoño de verdad con su nombre en una etiqueta de papel kraft. Un toque y una ráfaga se lleva las hojas de la pantalla, y debajo hay un álbum de Halloween: tu foto en un fotograma de película bajo la luna, un gato negro sobre una calabaza, una entrada para dos a la casa del terror, vuestra canción en un pequeño reproductor, una postal con tu letra, una tira de película con tres fotos más y polaroids hasta tu carta. Huerto de calabazas, medianoche o kraft acogedor.",
  },
  occasions: ["halloween", "just-because"],
  styles: ["playful", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 10 } },
  thumbnail: { poster: "/templates/spooky-season/poster.jpg", webm: "/templates/spooky-season/preview.webm" },
  defaultAccent: "#E8742A",
  heavy: false,
  sortOrder: 42,
};
