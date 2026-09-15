import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "scrapbook",
  name: { en: "Scrapbook", es: "Álbum de recortes" },
  tagline: { en: "Polaroids, washi tape and a torn note that says it all.", es: "Polaroids, cinta washi y una nota rasgada que lo dice todo." },
  description: {
    en: "A scrapbook they open like a real one. Cut-out letters spell the title, and your photos land on the page as polaroids that develop, a photo-booth strip, a stamp and a roll of film, taped and pinned between flowers. A torn note in handwriting, a typewritten letter from you, their song playing, and a bouquet at the end. Blossom, Favorite person, Seaside, Sunshine or Memories.",
    es: "Un álbum que se abre como uno de verdad. Letras recortadas forman el título y tus fotos caen en la página como polaroids que se revelan, una tira de fotomatón, un sello y un carrete, pegadas con cinta y chinchetas entre flores. Una nota rasgada escrita a mano, una carta tuya a máquina, su canción sonando y un ramo al final. Flores, Persona favorita, Playa, Sol o Recuerdos.",
  },
  occasions: ["anniversary", "birthday", "valentines", "just-because", "long-distance", "graduation"],
  styles: ["romantic", "playful"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 12 } },
  thumbnail: { poster: "/templates/scrapbook/poster.jpg", webm: "/templates/scrapbook/preview.webm" },
  defaultAccent: "#E07A8C",
  heavy: false,
  sortOrder: 12,
};
