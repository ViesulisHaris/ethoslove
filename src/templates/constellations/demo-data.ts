import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { ConstellationFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "constellations",
  recipientName: "Sofía",
  senderName: "Lucas",
  messageStyle: "typewriter" as const,
  accentColor: "#F2C879",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: true,
  music: { source: "library" as const, url: "/audio/library/quiet-hours.mp3", trackId: "quiet-hours", title: "Quiet Hours", startAt: 0 },
  video: undefined,
  countdown: {
    targetAt: "2026-12-20T18:30:00+02:00",
    timezone: "Europe/Riga",
  },
};

export const demoData: Record<"en" | "es", GiftData<ConstellationFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "For Sofía",
    message:
      "You are 9,412 kilometres away and somehow still the first thing in every room I walk into.\n\nI made you a sky. It's not the real one, but it's the one where all our nights happened at once. *Find the stars.* They're in order, if you want them to be, and they're not, if you don't.\n\n**Fourteen days.** Then no more screens between us.",
    photos: demoPhotos(["p5", "p6", "p2", "p7", "p1", "p4"]),
    countdown: { ...shared.countdown, label: "Until I land" },
    surprise: {
      text: "The flight is booked for the 20th, not the 27th. Surprise. Don't make plans.",
      reveal: "shake",
    },
    fields: { sky: "midnight", shape: "heart", finalLine: "Every star, a night with you. Together, they make us." },
  },
  es: {
    ...shared,
    locale: "es",
    title: "Para Sofía",
    message:
      "Estás a 9.412 kilómetros y aun así sigues siendo lo primero que hay en cada habitación en la que entro.\n\nTe hice un cielo. No es el de verdad, pero es el cielo en el que todas nuestras noches pasan a la vez. *Busca las estrellas.* Están en orden, si quieres que lo estén, y no lo están, si no quieres.\n\n**Catorce días.** Y ya no habrá pantallas entre nosotros.",
    photos: demoPhotos(["p5", "p6", "p2", "p7", "p1", "p4"], {
      p5: "Sin cobertura. Sin planes. Solo estrellas.",
      p6: "El de las 23:40 hacia ti",
      p2: "Lisboa, la noche que nos perdimos a propósito",
      p7: "Julio, y todo iba despacio",
      p1: "Nuestro primer café. Me robaste el azúcar.",
      p4: "El día que Nube nos eligió",
    }),
    countdown: { ...shared.countdown, label: "Hasta que aterrice" },
    surprise: {
      text: "El vuelo es el día 20, no el 27. Sorpresa. No hagas planes.",
      reveal: "shake",
    },
    fields: { sky: "midnight", shape: "heart", finalLine: "Cada estrella, una noche contigo. Juntas, somos nosotros." },
  },
};
