import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "garden",
  name: { en: "The Garden", es: "El jardín" },
  tagline: { en: "A garden that blooms as they scroll.", es: "Un jardín que florece mientras bajan." },
  description:
    {
      en: "They push open a gate with their name on it and walk down a page that grows as they go: a row of seedlings drawn in ink, a meadow that opens flower by flower, your photos pinned to a trellis under climbing vines, a greenhouse where your letter is waiting on the potting table, and a bouquet of everything they just walked past, tied and tagged for them.",
      es: "Abren una verja con su nombre y bajan por una página que crece a su paso: una fila de brotes dibujados a tinta, un prado que se abre flor a flor, tus fotos sujetas a una celosía entre enredaderas, un invernadero donde tu carta espera sobre la mesa, y un ramo con todo lo que acaban de ver, atado y con su etiqueta.",
    },
  occasions: ["anniversary", "valentines", "just-because", "mothers-day"],
  styles: ["romantic", "cinematic"],
  tier: "premium",
  features: { music: true, video: true, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 12 } },
  thumbnail: { poster: "/templates/garden/poster.jpg", webm: "/templates/garden/preview.webm" },
  defaultAccent: "#C8475A",
  heavy: false,
  sortOrder: 14,
};
