import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "bloom",
  name: { en: "Bloom", es: "Flor" },
  tagline: { en: "Hold the screen. Watch it open.", es: "Mantén pulsado. Mírala abrirse." },
  description: {
    en: "A single flower, grown in 3D, that opens only while they hold the screen, petal by petal, with pollen drifting in the light. When it's fully open your photos float up around it, and the message waits inside. Peony, tulip or daisy; any colour you like.",
    es: "Una sola flor, en 3D, que solo se abre mientras mantienen pulsada la pantalla: pétalo a pétalo, con polen flotando en la luz. Cuando está del todo abierta, tus fotos suben a su alrededor y el mensaje espera dentro. Peonía, tulipán o margarita; del color que quieras.",
  },
  occasions: ["valentines", "mothers-day", "apology", "anniversary"],
  styles: ["3d", "romantic"],
  tier: "premium",
  features: {
    music: true,
    video: false,
    countdown: true,
    surprise: true,
    captions: true,
    photos: { min: 0, max: 8 },
    needs: ["webgl"],
  },
  thumbnail: { poster: "/templates/bloom/poster.jpg", webm: "/templates/bloom/preview.webm" },
  defaultAccent: "#E07A8C",
  heavy: true,
  sortOrder: 45,
};
