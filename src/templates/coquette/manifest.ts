import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "coquette",
  name: { en: "Coquette", es: "Coquette" },
  tagline: { en: "Untie the bow. A pink gingham collage of real lilies, polaroids and your song.", es: "Desata el lazo. Un collage de vichy rosa con lirios de verdad, polaroids y vuestra canción." },
  description: {
    en: "They untie a satin bow and a collage unrolls under their thumb: a polaroid of the two of you between real lilies and blossom, a ticket to happiness, your song on a little player that really pauses, a postcard in your handwriting, a gingham photo strip, and more polaroids all the way down. The torn pink paper behind it all is faintly covered in the words of your own letter, which is waiting at the bottom. Blush, or something blue.",
    es: "Desatan un lazo de raso y un collage se despliega bajo su pulgar: una polaroid vuestra entre lirios y flores de verdad, un billete a la felicidad, vuestra canción en un pequeño reproductor que se pausa de verdad, una postal con tu letra, una tira de fotos de vichy y más polaroids hasta abajo. El papel rosa rasgado del fondo está cubierto, muy tenue, con las palabras de tu propia carta, que espera al final. Rosa, o algo azul.",
  },
  occasions: ["anniversary", "valentines", "birthday", "just-because"],
  styles: ["romantic", "playful"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 10 } },
  thumbnail: { poster: "/templates/coquette/poster.jpg", webm: "/templates/coquette/preview.webm" },
  defaultAccent: "#E0668C",
  heavy: false,
  sortOrder: 9,
};
