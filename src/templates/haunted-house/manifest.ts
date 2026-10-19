import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "haunted-house",
  name: { en: "Haunted House", es: "La casa encantada" },
  tagline: {
    en: "Open the gate in the storm. Every lit window holds a photo, and the door holds your letter.",
    es: "Abre la verja en plena tormenta. Cada ventana encendida guarda una foto, y la puerta, tu carta.",
  },
  description: {
    en: "A mansion on a hill in a thunderstorm: rain, a wind-bent tree, bats, and lightning that lights the whole house for a heartbeat. They tap the gate and it swings open; the camera walks up the path as the windows light one by one, each with a little silhouette inside. Tap a window and the silhouette steps aside to show one of your photos in a gilt frame. Then they knock on the door, and it swings open on a warm glow and your letter, with your song. Storm blue, blood moon, swamp green or midnight violet.",
    es: "Una mansión en lo alto de una colina en plena tormenta: lluvia, un árbol doblado por el viento, murciélagos y relámpagos que iluminan toda la casa por un instante. Tocan la verja y se abre de par en par; la cámara sube por el camino mientras las ventanas se encienden una a una, cada una con una silueta dentro. Tocan una ventana y la silueta se aparta para mostrar una de tus fotos en un marco dorado. Después llaman a la puerta, y se abre con una luz cálida y tu carta, con vuestra canción. Azul tormenta, luna roja, verde pantano o violeta medianoche.",
  },
  occasions: ["halloween"],
  styles: ["cinematic", "playful"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 6 } },
  thumbnail: { poster: "/templates/haunted-house/poster.jpg", webm: "/templates/haunted-house/preview.webm" },
  defaultAccent: "#FFA83A",
  heavy: false,
  sortOrder: 56,
};
