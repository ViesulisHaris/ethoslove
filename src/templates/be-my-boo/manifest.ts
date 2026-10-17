import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "be-my-boo",
  name: { en: "Be My Boo", es: "Be My Boo" },
  tagline: { en: "Tap the ghost. A cute Halloween collage of your photos, pumpkins, bats and a black cat.", es: "Toca el fantasma. Un collage de Halloween adorable con vuestras fotos, calabazas, murciélagos y un gato negro." },
  description: {
    en: "A little ghost holds a sign with their name on it. One tap and it says boo, flies off in a flurry of bats, and their Halloween collage is underneath: your photos on polaroids down a page printed with watercolour pumpkins and ghosts, a black cat lying across a photo and swishing its tail, your song on a little player, a note in your handwriting and your letter at the end. Every tap on the page sends up a tiny ghost. Pumpkin, pink or midnight.",
    es: "Un fantasmita sujeta un cartel con su nombre. Un toque y dice bu, sale volando con una nube de murciélagos, y debajo está su collage de Halloween: tus fotos en polaroids por una página estampada con calabazas y fantasmas de acuarela, un gato negro tumbado sobre una foto moviendo la cola, vuestra canción en un pequeño reproductor, una nota con tu letra y tu carta al final. Cada toque en la página hace salir un fantasmita. Calabaza, rosa o medianoche.",
  },
  occasions: ["halloween", "just-because"],
  styles: ["playful", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 10 } },
  thumbnail: { poster: "/templates/be-my-boo/poster.jpg", webm: "/templates/be-my-boo/preview.webm" },
  defaultAccent: "#E8742A",
  heavy: false,
  sortOrder: 47,
};
