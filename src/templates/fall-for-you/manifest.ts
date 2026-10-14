import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "fall-for-you",
  name: { en: "Fall for You", es: "Otoño contigo" },
  tagline: { en: "Light the candle. A cosy gingham collage of your photos, real leaves and their name in letter blocks.", es: "Enciende la vela. Un collage de cuadros vichy acogedor con vuestras fotos, hojas de verdad y su nombre en bloques de letras." },
  description: {
    en: "A dark room and a jar candle with their name on the label. One tap lights it, the room warms up, and an autumn collage is underneath on brown gingham: your photos on polaroids, their name spelled out in wooden letter blocks, real maple leaves, an acorn, a wooden heart, a patchwork pumpkin, a candle still burning, a coffee steaming and a teddy, then your song on a little player, a recipe card for the two of you and your letter at the end. Every tap on the page lets a leaf fall. Gingham, sage or cranberry.",
    es: "Una habitación a oscuras y una vela en un tarro con su nombre en la etiqueta. Un toque la enciende, la habitación se calienta y debajo hay un collage de otoño sobre cuadros vichy marrones: tus fotos en polaroids, su nombre en bloques de letras de madera, hojas de arce de verdad, una bellota, un corazón de madera, una calabaza de patchwork, una vela que sigue ardiendo, un café humeante y un osito, y después vuestra canción en un pequeño reproductor, una ficha de receta para los dos y tu carta al final. Cada toque en la página hace caer una hoja. Vichy, salvia o arándano.",
  },
  occasions: ["halloween", "just-because", "anniversary"],
  styles: ["romantic", "playful"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 10 } },
  thumbnail: { poster: "/templates/fall-for-you/poster.jpg", webm: "/templates/fall-for-you/preview.webm" },
  defaultAccent: "#C8602A",
  heavy: false,
  sortOrder: 48,
};
