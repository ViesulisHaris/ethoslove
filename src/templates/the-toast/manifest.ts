import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "the-toast",
  name: { en: "The Toast", es: "El brindis" },
  tagline: {
    en: "Tilt to pour, knock to clink, and the speech begins.",
    es: "Inclina para servir, golpea para brindar y empieza el discurso.",
  },
  description: {
    en: "Two glasses on cream linen, a candle, and a menu card standing between them. They tilt their phone and the bottle tips with it, filling both glasses — level it off when they're full, or overfill it and watch it go over the side, which is funnier. Then they knock the phone once, the way you touch two glasses together: the glasses clink, gold rings ring out across the screen, and your photos rise past them in the bubbles. The menu card opens into your speech. No tilt sensor, or a laptop? A pour button and a clink button do the same thing.",
    es: "Dos copas sobre lino color crema, una vela y un menú de pie entre las dos. Al inclinar el teléfono la botella se inclina con él y llena las dos copas: enderézalo cuando estén llenas o pásate y se saldrá, que tiene más gracia. Después se golpea el teléfono una vez, como cuando se chocan dos copas: las copas brindan, unos anillos dorados recorren la pantalla y tus fotos suben entre las burbujas. El menú se abre y aparece el discurso. ¿Sin sensor, o desde un portátil? Un botón para servir y otro para brindar hacen lo mismo.",
  },
  // Built for a wedding; an anniversary is the same table a year on, and a candlelit table for
  // two is a Valentine's night. A toast with no occasion behind it isn't one, so nothing wider.
  occasions: ["wedding", "anniversary", "valentines"],
  styles: ["cinematic", "romantic"],
  tier: "premium",
  features: {
    music: true,
    video: false,
    countdown: true,
    surprise: true,
    captions: true,
    photos: { min: 1, max: 8 },
    needs: ["gyroscope", "deviceMotion"],
  },
  thumbnail: { poster: "/templates/the-toast/poster.jpg", webm: "/templates/the-toast/preview.webm" },
  defaultAccent: "#D4A853",
  heavy: false,
  sortOrder: 42,
};
