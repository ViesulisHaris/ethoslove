import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "digicam",
  name: { en: "Digicam", es: "Digicam" },
  tagline: { en: "Press power. Your photos on a little 2006 camera, date-stamped and ready to print.", es: "Pulsa el botón. Vuestras fotos en una camarita de 2006, con su fecha y listas para imprimir." },
  description: {
    en: "A pocket camera from 2006 lies on a collage of tulips, stars and a disco ball, with happy birthday (or their name) cut out of magazines above it. They press power, the lens whirs out and the screen says hello. Your photos are on the camera roll, each with the orange date in the corner and your caption in the screen's pixel type. They flick through with the arrows or a swipe, and every press of the shutter takes the next one with a flash. After the last photo the shutter prints the whole roll as a strip, and your letter comes out after it on a printed card. Baby pink, silver, lilac or black.",
    es: "Una cámara de bolsillo de 2006 sobre un collage de tulipanes, estrellas y una bola de discoteca, con feliz cumple (o su nombre) recortado de revistas encima. Pulsan el botón, el objetivo sale zumbando y la pantalla le saluda. Tus fotos están en el carrete, cada una con la fecha naranja en la esquina y tu pie de foto en la letra de píxeles de la pantalla. Las pasan con las flechas o deslizando, y cada disparo hace la siguiente con flash. Tras la última, el disparador imprime todo el carrete en una tira, y tu carta sale detrás en una tarjeta impresa. Rosa bebé, plata, lila o negra.",
  },
  occasions: ["birthday", "just-because", "anniversary"],
  styles: ["retro", "playful"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 1, max: 12 } },
  thumbnail: { poster: "/templates/digicam/poster.jpg", webm: "/templates/digicam/preview.webm" },
  defaultAccent: "#E0558A",
  heavy: false,
  sortOrder: 9,
};
