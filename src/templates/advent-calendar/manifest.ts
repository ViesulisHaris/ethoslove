import type { TemplateManifest } from "../types";

/**
 * The first group card (docs/GROUP.md): the people the sender invites each write a note, and each
 * note waits behind one of the house's doors. It needs at least three, so it is sold only as the
 * group product, and it is held out of the gallery's lists until group cards are switched on
 * (ADVENT_CALENDAR_LIVE in ../held).
 */
export const manifest: TemplateManifest = {
  slug: "advent-calendar",
  name: { en: "Advent Calendar", es: "Calendario de Adviento" },
  tagline: {
    en: "An advent house of twenty-four doors on the mantelpiece. Behind each one is a note from someone you invited, or a sweet.",
    es: "Una casita de Adviento con veinticuatro puertas sobre la repisa. Detrás de cada una hay una nota de alguien a quien invitaste, o un dulce.",
  },
  description: {
    en: "A painted wooden house stands on the mantelpiece at night, fir and small lights either side. They tap a door and it swings open. Behind it is a small sealed envelope with one person’s note, their photo if they added one and their name in handwriting, or a sweet where nobody wrote: a gingerbread man, a candy cane, a bell. Up to twenty-four people sign it through one link, and you choose which notes go in. The star window in the gable is yours: your letter and your photos. Your song starts at the first tap. Evergreen and red, white and sage, or midnight blue.",
    es: "Una casita de madera pintada sobre la repisa, de noche, con ramas de abeto y lucecitas a los lados. Tocan una puerta y se abre. Detrás hay un sobre pequeño con la nota de una persona, su foto si la añadió y su nombre escrito a mano, o un dulce donde nadie escribió: un hombrecito de jengibre, un bastón de caramelo, un cascabel. Hasta veinticuatro personas firman la tarjeta desde un mismo enlace, y tú decides qué notas entran. La ventana de la estrella es la tuya: tu carta y tus fotos. Tu canción empieza con el primer toque. Verde y rojo, blanco y salvia o azul medianoche.",
  },
  occasions: ["christmas"],
  styles: ["cinematic", "playful"],
  tier: "premium",
  features: {
    music: true,
    video: false,
    countdown: true,
    surprise: true,
    captions: true,
    photos: { min: 0, max: 6 },
    // One door a person. The twenty-fifth thing, the star window, is the sender's own letter.
    group: { min: 3, max: 24, noteMax: 140, photos: true },
  },
  thumbnail: { poster: "/templates/advent-calendar/poster.jpg", webm: "/templates/advent-calendar/preview.webm" },
  defaultAccent: "#A8281F",
  heavy: false,
  // with the newest gifts, not ahead of them: whether a card that needs three other people leads a list is the owner's call (NEW_SLUGS in config/featured.ts)
  sortOrder: 9,
};
