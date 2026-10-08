import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "favorite-person",
  name: { en: "Favorite Person", es: "Mi persona favorita" },
  tagline: { en: "Lift the tissue paper. A watercolour scrapbook of your photos, pearls and pressed flowers.", es: "Levanta el papel de seda. Un álbum en acuarela con vuestras fotos, perlas y flores prensadas." },
  description: {
    en: "A sheet of tissue paper with their name written on it lies over a scrapbook page. They lift it, and underneath: your photos on polaroids held with gingham tape and a gold clip, soft watercolour, baby's breath, cherry blossom, pearls, a satin bow, a torn note that says favorite person, your song on a little player and a bouquet with love you written under it, down to your letter. Every tap on the page doodles a heart. Blush, lilac or peach.",
    es: "Una hoja de papel de seda con su nombre escrito cubre una página de álbum. La levanta y debajo están tus fotos en polaroids sujetas con cinta de cuadros y una pinza dorada, acuarela suave, paniculata, flor de cerezo, perlas, un lazo de raso, una nota rasgada que dice mi persona favorita, vuestra canción en un pequeño reproductor y un ramo con te quiero escrito debajo, hasta tu carta. Cada toque en la página dibuja un corazón. Rosa, lila o melocotón.",
  },
  occasions: ["just-because", "anniversary", "valentines"],
  styles: ["romantic", "playful"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 10 } },
  thumbnail: { poster: "/templates/favorite-person/poster.jpg", webm: "/templates/favorite-person/preview.webm" },
  defaultAccent: "#E07A98",
  heavy: false,
  sortOrder: 44,
};
