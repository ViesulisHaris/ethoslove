import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "autumn-reel",
  name: { en: "Autumn Reel", es: "Carrete de otoño" },
  tagline: { en: "Develop the film. A vintage autumn collage of your photos on film, an old book page with your names and pressed leaves.", es: "Revela el carrete. Un collage de otoño vintage con vuestras fotos en película, una página de un libro antiguo con vuestros nombres y hojas prensadas." },
  description: {
    en: "A darkroom under a red light, your photos hanging on the line as negatives. One tap and the light comes on, the prints develop into your photos, and a vintage autumn collage is underneath: your photos on frames of film, a page from an old novel with the two of you as its running head, pressed maple leaves, an apple with I LOVE YOU on its skin and a ladybug on it, a heart-shaped photo, two cats cuddling, a line cut word by word from a book, a ticket for two, your song on a little player and your letter at the end. Every tap on the page presses another leaf onto it. Rust, espresso or olive.",
    es: "Un cuarto oscuro bajo una luz roja, con vuestras fotos colgadas como negativos. Un toque y se enciende la luz, las copias se revelan en vuestras fotos y debajo hay un collage de otoño vintage: tus fotos en fotogramas de película, una página de una novela antigua con vosotros dos en la cabecera, hojas de arce prensadas, una manzana con I LOVE YOU en la piel y una mariquita encima, una foto en forma de corazón, dos gatos acurrucados, una frase recortada palabra a palabra de un libro, una entrada para dos, vuestra canción en un pequeño reproductor y tu carta al final. Cada toque en la página prensa otra hoja sobre ella. Óxido, espresso u oliva.",
  },
  occasions: ["halloween", "anniversary", "just-because"],
  styles: ["retro", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 10 } },
  thumbnail: { poster: "/templates/autumn-reel/poster.jpg", webm: "/templates/autumn-reel/preview.webm" },
  defaultAccent: "#B5481C",
  heavy: false,
  sortOrder: 49,
};
